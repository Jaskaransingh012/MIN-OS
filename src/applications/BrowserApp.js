import BaseApp from "../core/app-manager/BaseApp.js";

/**
 * BrowserApp: a Wikipedia browser.
 *
 * Articles are fetched from the Wikipedia API and rendered inside the app,
 * so there is no iframe and nothing for a website to block. Links between
 * articles open inside the app (with tabs, history and bookmarks); links to
 * other sites open in a real browser tab.
 *
 * Same pattern as the other apps: createContent() builds the DOM,
 * _bindEvents() wires interactions, onOpen()/onClose() manage the lifecycle.
 */
export default class BrowserApp extends BaseApp {
  constructor(config, kernel = null) {
    super(config, kernel);
    this.icon = "📖";
    this.title = "Wikipedia";

    // Wikipedia language edition: "en", "hi", "pa", "simple", ...
    this.lang = "en";

    this.tabs = [];
    this.activeTabId = null;
    this._tabSeq = 0;
    this._eventsBound = false;
    this._view = "home";
    this._articleCache = new Map();

    this.quickLinks = [
      { name: "Random", icon: "🎲", action: "random" },
      { name: "Computer science", icon: "💻", title: "Computer science" },
      { name: "Linux", icon: "🐧", title: "Linux" },
      { name: "JavaScript", icon: "📜", title: "JavaScript" },
      { name: "Albert Einstein", icon: "🧠", title: "Albert Einstein" },
      { name: "India", icon: "🇮🇳", title: "India" },
      { name: "Space exploration", icon: "🚀", title: "Space exploration" },
    ];

    this.bookmarks = this._loadJSON("jk-wiki-bookmarks", [
      { title: "Computer science" },
      { title: "Linux" },
    ]);
  }

  // ─── small helpers ────────────────────────────────────────────

  _loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  _saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  _decode(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  _el(selector) {
    return this._container.querySelector(selector);
  }

  _wikiUrl(title) {
    return `https://${this.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  }

  async _api(params) {
    const qs = new URLSearchParams({
      format: "json",
      formatversion: "2",
      origin: "*",
      ...params,
    });
    const res = await fetch(`https://${this.lang}.wikipedia.org/w/api.php?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ─── styles (injected once) ───────────────────────────────────

  _injectStyles() {
    if (document.getElementById("jk-wiki-styles")) return;
    const style = document.createElement("style");
    style.id = "jk-wiki-styles";
    style.textContent = `
      .jk-browser {
        --jk-bg: #060810;
        --jk-panel: rgba(16, 20, 34, 0.72);
        --jk-panel-solid: #0c0f1a;
        --jk-border: rgba(0, 255, 242, 0.18);
        --jk-cyan: #00fff2;
        --jk-magenta: #ff2fd0;
        --jk-text: #d9f7ff;
        --jk-text-dim: #7b8aa0;
        display: flex; flex-direction: column;
        width: 100%; height: 100%;
        background: radial-gradient(1200px 600px at 20% -10%, rgba(0,255,242,0.06), transparent 60%),
                    radial-gradient(1000px 500px at 100% 110%, rgba(255,47,208,0.06), transparent 60%),
                    var(--jk-bg);
        color: var(--jk-text);
        font-family: 'Consolas', 'SFMono-Regular', 'Segoe UI', ui-monospace, monospace;
        overflow: hidden;
      }

      /* tabs */
      .jk-browser-tabs {
        display: flex; align-items: flex-end; gap: 4px;
        padding: 8px 10px 0;
        background: var(--jk-panel-solid);
        border-bottom: 1px solid var(--jk-border);
        overflow-x: auto; scrollbar-width: thin;
      }
      .jk-browser-tab {
        display: flex; align-items: center; gap: 6px;
        min-width: 140px; max-width: 200px;
        padding: 7px 10px;
        border-radius: 8px 8px 0 0;
        background: rgba(255,255,255,0.02);
        border: 1px solid transparent; border-bottom: none;
        cursor: pointer; position: relative;
        transition: background .15s ease;
        color: var(--jk-text-dim);
      }
      .jk-browser-tab:hover { background: rgba(0,255,242,0.05); color: var(--jk-text); }
      .jk-browser-tab.active {
        background: linear-gradient(180deg, rgba(0,255,242,0.10), rgba(16,20,34,0.9));
        border-color: var(--jk-border); color: #fff;
        box-shadow: 0 -2px 12px rgba(0,255,242,0.15);
      }
      .jk-browser-tab.active::after {
        content: ""; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px;
        background: linear-gradient(90deg, var(--jk-cyan), var(--jk-magenta));
        box-shadow: 0 0 8px var(--jk-cyan);
      }
      .jk-tab-favicon { width: 14px; font-size: 12px; flex-shrink: 0; text-align: center; }
      .jk-tab-title { flex: 1; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .jk-tab-close {
        background: none; border: none; color: inherit; opacity: .5;
        cursor: pointer; font-size: 13px; line-height: 1; padding: 2px 4px; border-radius: 4px;
      }
      .jk-tab-close:hover { opacity: 1; background: rgba(255,47,208,0.2); color: var(--jk-magenta); }
      .jk-tab-add {
        width: 26px; height: 26px; margin-bottom: 4px;
        border: 1px solid var(--jk-border); border-radius: 6px;
        background: transparent; color: var(--jk-cyan);
        cursor: pointer; font-size: 15px; line-height: 1; flex-shrink: 0;
      }
      .jk-tab-add:hover { background: rgba(0,255,242,0.08); box-shadow: 0 0 10px rgba(0,255,242,0.35); }

      /* toolbar */
      .jk-browser-toolbar {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px;
        background: var(--jk-panel);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--jk-border);
      }
      .jk-nav-buttons { display: flex; gap: 4px; }
      .jk-nav-btn, .jk-action-btn {
        width: 30px; height: 30px; border-radius: 8px;
        border: 1px solid transparent; background: rgba(255,255,255,0.03);
        color: var(--jk-text); cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        transition: all .15s ease;
      }
      .jk-nav-btn:hover, .jk-action-btn:hover {
        border-color: var(--jk-border); color: var(--jk-cyan);
        box-shadow: 0 0 10px rgba(0,255,242,0.25);
      }
      .jk-nav-btn:disabled { opacity: .3; cursor: default; box-shadow: none; color: var(--jk-text); }
      .jk-address-bar {
        flex: 1; display: flex; align-items: center; gap: 8px;
        background: rgba(0,0,0,0.35); border: 1px solid var(--jk-border);
        border-radius: 999px; padding: 0 12px; height: 34px;
        transition: box-shadow .2s ease, border-color .2s ease;
      }
      .jk-address-bar:focus-within {
        border-color: var(--jk-cyan);
        box-shadow: 0 0 0 3px rgba(0,255,242,0.12), 0 0 16px rgba(0,255,242,0.25);
      }
      .jk-address-input {
        flex: 1; background: transparent; border: none; outline: none;
        color: var(--jk-text); font: inherit; font-size: 13px;
      }
      .jk-address-input::placeholder { color: var(--jk-text-dim); }
      .jk-bookmark-btn, .jk-external-btn {
        background: none; border: none; cursor: pointer;
        color: var(--jk-text-dim); font-size: 14px;
      }
      .jk-bookmark-btn.active { color: #ffd24a; text-shadow: 0 0 8px rgba(255,210,74,0.7); }
      .jk-bookmark-btn:hover, .jk-external-btn:hover { color: var(--jk-cyan); }

      /* bookmarks bar */
      .jk-bookmarks-bar {
        display: flex; gap: 6px; padding: 6px 12px;
        background: rgba(255,255,255,0.015);
        border-bottom: 1px solid var(--jk-border);
        overflow-x: auto; min-height: 28px;
      }
      .jk-bookmark-chip {
        padding: 3px 10px; border-radius: 999px;
        background: rgba(255,255,255,0.03); border: 1px solid var(--jk-border);
        color: var(--jk-text-dim); font-size: 11px; cursor: pointer; white-space: nowrap;
        transition: all .15s ease;
      }
      .jk-bookmark-chip:hover { color: var(--jk-cyan); border-color: var(--jk-cyan); }

      /* progress */
      .jk-progress-bar { height: 2px; background: transparent; overflow: hidden; }
      .jk-progress-fill {
        height: 100%; width: 0%;
        background: linear-gradient(90deg, var(--jk-cyan), var(--jk-magenta));
        box-shadow: 0 0 10px var(--jk-cyan);
        transition: width .3s ease;
      }

      /* viewport */
      .jk-browser-viewport { position: relative; flex: 1; background: #000; overflow: hidden; }

      /* home */
      .jk-newtab-page {
        position: absolute; inset: 0; display: none;
        flex-direction: column; align-items: center; justify-content: center; gap: 24px;
        background:
          linear-gradient(rgba(0,255,242,0.035) 1px, transparent 1px) 0 0 / 100% 34px,
          linear-gradient(90deg, rgba(0,255,242,0.035) 1px, transparent 1px) 0 0 / 34px 100%,
          radial-gradient(800px 400px at 50% 30%, rgba(0,255,242,0.08), transparent 70%),
          #05070d;
        overflow-y: auto; padding: 32px 20px;
      }
      .jk-newtab-clock { font-size: 46px; font-weight: 600; letter-spacing: 2px; color: #fff; text-shadow: 0 0 22px rgba(0,255,242,0.55); }
      .jk-newtab-greeting { color: var(--jk-text-dim); font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
      .jk-newtab-search {
        width: min(560px, 90%); display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.04); border: 1px solid var(--jk-border);
        border-radius: 999px; padding: 12px 20px;
        transition: box-shadow .2s ease, border-color .2s ease;
      }
      .jk-newtab-search:focus-within {
        border-color: var(--jk-cyan);
        box-shadow: 0 0 0 4px rgba(0,255,242,0.10), 0 0 24px rgba(0,255,242,0.3);
      }
      .jk-newtab-search input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font: inherit; font-size: 14px; }
      .jk-quicklinks {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
        gap: 14px; width: min(560px, 90%);
      }
      .jk-quicklink { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: var(--jk-text-dim); text-align: center; }
      .jk-quicklink-icon {
        width: 46px; height: 46px; border-radius: 14px; font-size: 22px;
        background: rgba(255,255,255,0.04); border: 1px solid var(--jk-border);
        display: flex; align-items: center; justify-content: center;
        transition: all .18s ease;
      }
      .jk-quicklink:hover .jk-quicklink-icon { border-color: var(--jk-cyan); box-shadow: 0 0 16px rgba(0,255,242,0.35); transform: translateY(-2px); }
      .jk-quicklink span { font-size: 11px; }

      /* error */
      .jk-browser-error {
        position: absolute; inset: 0; display: none;
        flex-direction: column; align-items: center; justify-content: center; gap: 14px;
        background: #05070d; text-align: center; padding: 20px;
      }
      .jk-err-icon { font-size: 40px; filter: drop-shadow(0 0 12px rgba(255,47,208,0.6)); }
      .jk-browser-error h3 { margin: 0; color: #fff; font-size: 15px; }
      .jk-browser-error p { margin: 0; color: var(--jk-text-dim); font-size: 12px; max-width: 380px; }
      .jk-err-actions { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
      .jk-err-btn {
        padding: 8px 16px; border-radius: 8px; cursor: pointer;
        border: 1px solid var(--jk-border); background: rgba(0,255,242,0.06); color: var(--jk-cyan);
        font: inherit; font-size: 12px;
      }
      .jk-err-btn:hover { box-shadow: 0 0 14px rgba(0,255,242,0.35); }

      /* search results */
      .jk-search-results { position: absolute; inset: 0; display: none; flex-direction: column; background: #05070d; overflow: hidden; }
      .jk-search-header { padding: 14px 18px; font-size: 12px; color: var(--jk-text-dim); border-bottom: 1px solid var(--jk-border); flex-shrink: 0; }
      .jk-search-header span { color: var(--jk-cyan); }
      .jk-search-body { flex: 1; overflow-y: auto; padding: 10px 18px 24px; }
      .jk-search-loading { color: var(--jk-text-dim); font-size: 13px; padding: 20px 0; }
      .jk-search-note { color: var(--jk-text-dim); font-size: 12.5px; padding: 12px 0 4px; }
      .jk-search-note a { color: var(--jk-cyan); cursor: pointer; text-decoration: underline; }
      .jk-search-result { padding: 14px 4px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background .15s ease; }
      .jk-search-result:hover { background: rgba(0,255,242,0.04); }
      .jk-search-result-title { color: var(--jk-cyan); font-size: 14px; margin-bottom: 4px; text-shadow: 0 0 6px rgba(0,255,242,0.25); }
      .jk-search-result-desc { color: var(--jk-text-dim); font-size: 12px; line-height: 1.5; }
      .jk-search-result-desc b { color: var(--jk-text); font-weight: 600; }
      .jk-search-more { padding: 18px 4px; }

      /* article (light "paper" so Wikipedia's own colours stay readable) */
      .jk-article {
        position: absolute; inset: 0; display: none; overflow-y: auto;
        background: #fff; color: #202122; container-type: inline-size;
      }
      .jk-article-inner { max-width: 900px; margin: 0 auto; padding: 22px 28px 40px; font: 15px/1.65 'Segoe UI', system-ui, sans-serif; overflow-wrap: break-word; }
      .jk-article-status { padding: 40px; text-align: center; color: #54595d; font: 14px 'Segoe UI', sans-serif; }
      .jk-article-title { font: 400 1.9em/1.2 Georgia, 'Linux Libertine', 'Times New Roman', serif; border-bottom: 1px solid #a2a9b1; margin: 0 0 6px; padding-bottom: 6px; }
      .jk-article-sub { color: #54595d; font-size: 13px; margin-bottom: 16px; }
      .jk-article-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #c8ccd1; color: #54595d; font-size: 12.5px; clear: both; }
      .jk-article a { color: #0645ad; text-decoration: none; cursor: pointer; }
      .jk-article a:visited { color: #0b0080; }
      .jk-article a.new { color: #ba0000; }
      .jk-article a:hover { text-decoration: underline; }
      .jk-article p { margin: .5em 0 .9em; }
      .jk-article h2 { font: 400 1.5em/1.3 Georgia, 'Times New Roman', serif; border-bottom: 1px solid #a2a9b1; margin: 1.4em 0 .6em; padding-bottom: .2em; }
      .jk-article h3 { font-size: 1.2em; margin: 1.1em 0 .4em; }
      .jk-article h4 { font-size: 1.05em; margin: 1em 0 .3em; }
      .jk-article ul, .jk-article ol { margin: .3em 0 .6em 1.6em; padding: 0; }
      .jk-article li { margin-bottom: .15em; }
      .jk-article img { max-width: 100%; height: auto; }
      .jk-article pre, .jk-article code { background: #f8f9fa; border: 1px solid #eaecf0; font-family: ui-monospace, Consolas, monospace; font-size: 13px; }
      .jk-article code { padding: 1px 4px; }
      .jk-article pre { padding: 8px 10px; overflow-x: auto; }
      .jk-article blockquote { margin: .8em 1.6em; }
      .jk-article .infobox { float: right; clear: right; width: 22em; max-width: 100%; margin: .3em 0 1em 1.4em; border: 1px solid #a2a9b1; background: #f8f9fa; font-size: 88%; line-height: 1.5; }
      .jk-article .infobox th, .jk-article .infobox td { padding: 3px 5px; vertical-align: top; }
      .jk-article .thumb { margin: .5em 0 1.2em; }
      .jk-article .tright { float: right; clear: right; margin-left: 1.4em; }
      .jk-article .tleft { float: left; clear: left; margin-right: 1.4em; }
      .jk-article .thumbinner { border: 1px solid #c8ccd1; background: #f8f9fa; padding: 3px; font-size: 94%; max-width: 100%; }
      .jk-article .thumbcaption { padding: 3px; font-size: 94%; line-height: 1.4; }
      .jk-article .magnify { display: none; }
      .jk-article .wikitable { display: block; overflow-x: auto; max-width: 100%; border-collapse: collapse; background: #f8f9fa; border: 1px solid #a2a9b1; margin: 1em 0; }
      .jk-article .wikitable th, .jk-article .wikitable td { border: 1px solid #a2a9b1; padding: .3em .5em; }
      .jk-article .wikitable th { background: #eaecf0; text-align: center; }
      .jk-article .hatnote { font-style: italic; padding-left: 1.6em; margin-bottom: .5em; }
      .jk-article .ambox { border: 1px solid #a2a9b1; border-left: 10px solid #36c; background: #fbfbfb; margin: .6em 0; padding: .3em .6em; font-size: 90%; }
      .jk-article .reflist, .jk-article .references { font-size: 90%; }
      .jk-article sup.reference { font-size: .75em; line-height: 1; }
      .jk-article .shortdescription, .jk-article .mw-empty-elt { display: none; }
      @container (max-width: 620px) {
        .jk-article .infobox, .jk-article .tright, .jk-article .tleft { float: none; width: auto; margin: .8em 0; }
        .jk-article .thumbinner { width: auto !important; }
        .jk-article-inner { padding: 16px 16px 32px; }
      }

      /* status bar */
      .jk-browser-statusbar {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 4px 12px; background: var(--jk-panel-solid);
        border-top: 1px solid var(--jk-border);
        font-size: 10.5px; color: var(--jk-text-dim);
      }
      #jk-status-url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .jk-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--jk-cyan); margin-right: 6px; box-shadow: 0 0 6px var(--jk-cyan); display: inline-block; }
    `;
    document.head.appendChild(style);
  }

  // ─── tab model ───────────────────────────────────────────────
  // A tab keeps a history list. Each entry is one of:
  //   { type: "home" }
  //   { type: "article", title, anchor?, scroll? }
  //   { type: "search", query }

  _createTab(entry = { type: "home" }) {
    this._tabSeq += 1;
    return {
      id: `t${this._tabSeq}`,
      title: "New Tab",
      history: [entry],
      index: 0,
      token: null,
    };
  }

  _getTab(id) { return this.tabs.find(t => t.id === id) || null; }
  _activeTab() { return this._getTab(this.activeTabId); }
  _entry(tab) { return tab ? tab.history[tab.index] : null; }

  // ─── createContent ───────────────────────────────────────────

  createContent() {
    this._injectStyles();

    const container = document.createElement("div");
    container.className = "jk-browser";

    const first = this._createTab();
    this.tabs.push(first);
    this.activeTabId = first.id;

    container.innerHTML = `
      <div class="jk-browser-tabs" id="jk-browser-tabs"></div>

      <div class="jk-browser-toolbar">
        <div class="jk-nav-buttons">
          <button class="jk-nav-btn" data-action="back" title="Back (Alt+←)">◀</button>
          <button class="jk-nav-btn" data-action="forward" title="Forward (Alt+→)">▶</button>
          <button class="jk-nav-btn" data-action="reload" title="Reload">⟳</button>
          <button class="jk-nav-btn" data-action="home" title="Home">⌂</button>
          <button class="jk-nav-btn" data-action="random" title="Random article">🎲</button>
        </div>
        <div class="jk-address-bar">
          <span>📖</span>
          <input id="jk-address-input" class="jk-address-input" type="text"
                 placeholder="Search Wikipedia or paste an article link" spellcheck="false" autocomplete="off" />
          <button class="jk-bookmark-btn" id="jk-bookmark-btn" title="Bookmark this article">☆</button>
          <button class="jk-external-btn" id="jk-external-btn" title="Open on Wikipedia in a real browser tab">↗</button>
        </div>
        <div class="jk-nav-buttons">
          <button class="jk-action-btn" data-action="new-tab" title="New tab">＋</button>
        </div>
      </div>

      <div class="jk-bookmarks-bar" id="jk-bookmarks-bar"></div>
      <div class="jk-progress-bar"><div class="jk-progress-fill" id="jk-progress-fill"></div></div>

      <div class="jk-browser-viewport">
        <div class="jk-newtab-page" id="jk-newtab-page">
          <div class="jk-newtab-greeting" id="jk-newtab-greeting"></div>
          <div class="jk-newtab-clock" id="jk-newtab-clock"></div>
          <div class="jk-newtab-search">
            <span>🔍</span>
            <input id="jk-newtab-search-input" type="text" placeholder="Search Wikipedia…" spellcheck="false" />
          </div>
          <div class="jk-quicklinks" id="jk-quicklinks"></div>
        </div>

        <div class="jk-article" id="jk-article"></div>

        <div class="jk-search-results" id="jk-search-results">
          <div class="jk-search-header">Results for <span id="jk-search-query"></span></div>
          <div class="jk-search-body" id="jk-search-body"></div>
        </div>

        <div class="jk-browser-error" id="jk-browser-error">
          <div class="jk-err-icon">⚠</div>
          <h3 id="jk-err-title"></h3>
          <p id="jk-err-detail"></p>
          <div class="jk-err-actions" id="jk-err-actions"></div>
        </div>
      </div>

      <div class="jk-browser-statusbar">
        <span><span class="jk-status-dot"></span><span id="jk-status-text">Ready</span></span>
        <span id="jk-status-url"></span>
      </div>
    `;

    this._container = container;
    this._renderTabs();
    this._renderBookmarks();
    this._renderQuickLinks();
    this._setView("home");
    this._syncChrome(first);
    this._startClock();

    return container;
  }

  // ─── rendering: chrome ───────────────────────────────────────

  _renderTabs() {
    const wrap = this._el("#jk-browser-tabs");
    if (!wrap) return;
    wrap.innerHTML = "";
    this.tabs.forEach(tab => {
      const el = document.createElement("div");
      el.className = "jk-browser-tab" + (tab.id === this.activeTabId ? " active" : "");
      el.dataset.tabId = tab.id;
      el.innerHTML = `
        <span class="jk-tab-favicon">📖</span>
        <span class="jk-tab-title">${this._esc(tab.title)}</span>
        <button class="jk-tab-close" data-close-tab="${tab.id}" title="Close tab">×</button>
      `;
      wrap.appendChild(el);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "jk-tab-add";
    addBtn.id = "jk-tab-add";
    addBtn.title = "New tab";
    addBtn.textContent = "+";
    wrap.appendChild(addBtn);
  }

  _renderBookmarks() {
    const bar = this._el("#jk-bookmarks-bar");
    if (!bar) return;
    bar.innerHTML = "";
    this.bookmarks.forEach(bm => {
      const chip = document.createElement("div");
      chip.className = "jk-bookmark-chip";
      chip.dataset.title = bm.title;
      chip.textContent = bm.title;
      bar.appendChild(chip);
    });
  }

  _renderQuickLinks() {
    const grid = this._el("#jk-quicklinks");
    if (!grid) return;
    grid.innerHTML = "";
    this.quickLinks.forEach(link => {
      const item = document.createElement("div");
      item.className = "jk-quicklink";
      if (link.action) item.dataset.action = link.action;
      if (link.title) item.dataset.title = link.title;
      item.innerHTML = `<div class="jk-quicklink-icon">${link.icon}</div><span>${this._esc(link.name)}</span>`;
      grid.appendChild(item);
    });
  }

  _startClock() {
    const clockEl = this._el("#jk-newtab-clock");
    const greetEl = this._el("#jk-newtab-greeting");
    const tick = () => {
      if (!clockEl) return;
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const h = now.getHours();
      greetEl.textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    };
    tick();
    this._clockInterval = setInterval(tick, 20000);
  }

  _setView(name) {
    const map = {
      home: ["#jk-newtab-page", "flex"],
      article: ["#jk-article", "block"],
      search: ["#jk-search-results", "flex"],
      error: ["#jk-browser-error", "flex"],
    };
    Object.entries(map).forEach(([key, [selector, display]]) => {
      this._el(selector).style.display = key === name ? display : "none";
    });
    this._view = name;
  }

  _setStatus(text, url) {
    this._el("#jk-status-text").textContent = text;
    this._el("#jk-status-url").textContent = url || "";
  }

  _setProgress(pct) {
    const fill = this._el("#jk-progress-fill");
    fill.style.width = `${pct}%`;
    if (pct >= 100 || pct === 0) {
      clearTimeout(this._progressResetTimer);
      this._progressResetTimer = setTimeout(() => { fill.style.width = "0%"; }, 350);
    }
  }

  // Updates address bar, back/forward buttons and the bookmark star for a tab.
  _syncChrome(tab) {
    if (!tab || !this._container) return;
    const entry = this._entry(tab);
    const input = this._el("#jk-address-input");
    input.value =
      entry.type === "article" ? entry.title :
      entry.type === "search" ? entry.query : "";

    this._el('[data-action="back"]').disabled = tab.index <= 0;
    this._el('[data-action="forward"]').disabled = tab.index >= tab.history.length - 1;

    const bookmarked = entry.type === "article" &&
      this.bookmarks.some(b => b.title === entry.title);
    const star = this._el("#jk-bookmark-btn");
    star.textContent = bookmarked ? "★" : "☆";
    star.classList.toggle("active", bookmarked);
  }

  // ─── navigation core ─────────────────────────────────────────

  _saveScroll(tab) {
    const entry = this._entry(tab);
    if (tab && entry && entry.type === "article" && this._view === "article") {
      entry.scroll = this._el("#jk-article").scrollTop;
    }
  }

  _visit(entry, { replace = false } = {}) {
    const tab = this._activeTab();
    if (!tab) return;
    if (replace) {
      tab.history[tab.index] = entry;
    } else {
      this._saveScroll(tab);
      tab.history = tab.history.slice(0, tab.index + 1);
      tab.history.push(entry);
      tab.index = tab.history.length - 1;
    }
    this._render(tab);
  }

  // Paints whatever the tab's current history entry says. Only the visible tab is painted.
  _render(tab) {
    if (!this._container || !tab) return;
    tab.token = null;
    if (tab.id !== this.activeTabId) return;

    const entry = this._entry(tab);
    this._syncChrome(tab);

    if (entry.type === "home") this._showHome(tab);
    else if (entry.type === "article") this._loadArticle(tab, entry);
    else if (entry.type === "search") this._runSearch(tab, entry);
  }

  _showHome(tab) {
    tab.title = "New Tab";
    this._renderTabs();
    this._setView("home");
    this._setStatus("Ready", "");
    this._setProgress(0);
  }

  // Turns what the user typed into a search or an article.
  navigate(raw) {
    const value = (raw || "").trim();
    if (!value) return;

    const wikiLink = value.match(/^https?:\/\/[\w-]+(?:\.m)?\.wikipedia\.org\/wiki\/([^#?\s]+)(?:#(\S+))?/i);
    if (wikiLink) {
      this.openArticle(this._decode(wikiLink[1]).replace(/_/g, " "), wikiLink[2]);
      return;
    }
    if (/^https?:\/\//i.test(value)) {
      this._setStatus("Only Wikipedia pages open here", "");
      return;
    }
    this.search(value);
  }

  openArticle(title, anchor = null) {
    this._visit({ type: "article", title, anchor: anchor ? this._decode(anchor) : null });
  }

  search(query) {
    this._visit({ type: "search", query });
  }

  async openRandom() {
    this._setStatus("Finding a random article…", "");
    this._setProgress(30);
    try {
      const data = await this._api({
        action: "query", list: "random", rnnamespace: 0, rnlimit: 1,
      });
      this.openArticle(data.query.random[0].title);
    } catch (err) {
      this._setProgress(0);
      this._setStatus("Couldn't reach Wikipedia", "");
    }
  }

  goBack() {
    const tab = this._activeTab();
    if (!tab || tab.index <= 0) return;
    this._saveScroll(tab);
    tab.index -= 1;
    this._render(tab);
  }

  goForward() {
    const tab = this._activeTab();
    if (!tab || tab.index >= tab.history.length - 1) return;
    this._saveScroll(tab);
    tab.index += 1;
    this._render(tab);
  }

  reload() {
    const tab = this._activeTab();
    if (!tab) return;
    this._articleCache.clear();
    const entry = this._entry(tab);
    if (entry.type === "article") entry.scroll = 0;
    this._render(tab);
  }

  goHome() {
    this._visit({ type: "home" });
  }

  // ─── articles ────────────────────────────────────────────────

  async _fetchArticle(title) {
    const key = `${this.lang}:${title}`;
    if (this._articleCache.has(key)) return this._articleCache.get(key);

    const data = await this._api({
      action: "parse", page: title, prop: "text", redirects: 1,
      disableeditsection: 1, disablelimitreport: 1, disabletoc: 1,
    });
    if (data.error) {
      const err = new Error(data.error.info || data.error.code);
      err.code = data.error.code;
      throw err;
    }

    const page = { title: data.parse.title, html: this._cleanHtml(data.parse.text) };
    this._articleCache.set(key, page);
    this._articleCache.set(`${this.lang}:${page.title}`, page);
    while (this._articleCache.size > 30) {
      this._articleCache.delete(this._articleCache.keys().next().value);
    }
    return page;
  }

  // Strips anything that could run code or leak styles into the rest of the OS.
  _cleanHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(
      "script, style, link, meta, iframe, object, embed, form, .mw-editsection, .navbox, .mw-empty-elt"
    ).forEach(n => n.remove());

    doc.body.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attr => {
        if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    });

    doc.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("//")) img.setAttribute("src", `https:${src}`);
      img.removeAttribute("srcset");
      img.setAttribute("loading", "lazy");
    });

    return doc.body.innerHTML;
  }

  async _loadArticle(tab, entry) {
    const token = Symbol("article");
    tab.token = token;
    const alive = () => tab.token === token && this.activeTabId === tab.id;

    tab.title = entry.title;
    this._renderTabs();
    this._setView("article");
    this._setStatus("Loading…", this._wikiUrl(entry.title));

    const art = this._el("#jk-article");
    if (!this._articleCache.has(`${this.lang}:${entry.title}`)) {
      art.innerHTML = `<div class="jk-article-status">Loading “${this._esc(entry.title)}”…</div>`;
      art.scrollTop = 0;
      this._setProgress(30);
    }

    try {
      const page = await this._fetchArticle(entry.title);
      if (!alive()) return;

      // Wikipedia may have followed a redirect, so store the real title.
      const fresh = { ...entry, title: page.title };
      const idx = tab.history.indexOf(entry);
      if (idx >= 0) tab.history[idx] = fresh;

      tab.title = page.title;
      this._renderTabs();
      this._syncChrome(tab);
      this._paintArticle(page, fresh);
      this._setProgress(100);
      this._setStatus("Done", this._wikiUrl(page.title));
    } catch (err) {
      if (!alive()) return;
      this._setProgress(0);
      this._showError(err, entry.title);
    }
  }

  _paintArticle(page, entry) {
    const art = this._el("#jk-article");
    art.innerHTML = `
      <article class="jk-article-inner">
        <h1 class="jk-article-title"></h1>
        <div class="jk-article-sub">From Wikipedia, the free encyclopedia</div>
        <div class="jk-article-body"></div>
        <footer class="jk-article-footer">
          Text from <a href="${this._esc(this._wikiUrl(page.title))}" data-external="1">Wikipedia</a>,
          available under
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" data-external="1">CC BY-SA 4.0</a>.
        </footer>
      </article>
    `;
    art.querySelector(".jk-article-title").textContent = page.title;
    art.querySelector(".jk-article-body").innerHTML = page.html;

    art.scrollTop = 0;
    if (entry.anchor) {
      this._scrollToId(entry.anchor);
    } else if (entry.scroll) {
      art.scrollTop = entry.scroll;
    }
  }

  _scrollToId(id) {
    const art = this._el("#jk-article");
    const target = Array.from(art.querySelectorAll("[id]")).find(n => n.id === id);
    if (target) target.scrollIntoView({ block: "start" });
  }

  _showError(err, title) {
    this._setView("error");
    this._errTitle = title;
    const missing = err && (err.code === "missingtitle" || err.code === "invalidtitle");

    this._el("#jk-err-title").textContent = missing
      ? `No article called “${title}”`
      : "Couldn't reach Wikipedia";
    this._el("#jk-err-detail").textContent = missing
      ? "Wikipedia has no page with this exact title. Try searching for it instead."
      : "Check your internet connection and try again.";
    this._el("#jk-err-actions").innerHTML = missing
      ? `<button class="jk-err-btn" data-err="search">Search for it</button>
         <button class="jk-err-btn" data-err="external">Open on Wikipedia ↗</button>`
      : `<button class="jk-err-btn" data-err="retry">Retry</button>`;
    this._setStatus(missing ? "Not found" : "Network error", "");
  }

  // ─── search ──────────────────────────────────────────────────

  async _runSearch(tab, entry) {
    const token = Symbol("search");
    tab.token = token;
    const alive = () => tab.token === token && this.activeTabId === tab.id;
    const query = entry.query;

    tab.title = `Search: ${query}`;
    this._renderTabs();
    this._setView("search");
    this._el("#jk-search-query").textContent = `“${query}”`;
    this._el("#jk-search-body").innerHTML = `<div class="jk-search-loading">Searching…</div>`;
    this._setStatus("Searching…", "");
    this._setProgress(30);

    try {
      const data = await this._api({
        action: "query", list: "search", srsearch: query,
        srlimit: 12, srprop: "snippet", srinfo: "suggestion",
      });
      if (!alive()) return;

      const results = (data.query?.search || []).map(r => ({
        title: r.title,
        snippet: r.snippet,
      }));
      const suggestion = data.query?.searchinfo?.suggestion || null;

      // Typing an exact article title goes straight to the article.
      if (results[0] && results[0].title.toLowerCase() === query.toLowerCase()) {
        this._visit({ type: "article", title: results[0].title }, { replace: true });
        return;
      }

      this._renderResults(query, results, suggestion, false);
      this._setProgress(100);
      this._setStatus("Done", `search: ${query}`);
    } catch (err) {
      if (!alive()) return;
      this._renderResults(query, [], null, true);
      this._setProgress(0);
      this._setStatus("Search failed", `search: ${query}`);
    }
  }

  // Wikipedia snippets contain <span class="searchmatch">. Keep those as bold, escape the rest.
  _snippetHtml(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return Array.from(doc.body.childNodes).map(node => {
      const text = this._esc(node.textContent);
      return node.nodeType === 1 && node.classList.contains("searchmatch")
        ? `<b>${text}</b>` : text;
    }).join("");
  }

  _renderResults(query, results, suggestion, failed) {
    const body = this._el("#jk-search-body");
    const parts = [];

    if (failed) {
      parts.push(`<div class="jk-search-note">Couldn't reach Wikipedia. Check your connection and try again.</div>`);
    } else if (!results.length) {
      parts.push(`<div class="jk-search-note">No articles matched “${this._esc(query)}”.</div>`);
    }

    if (suggestion) {
      parts.push(`<div class="jk-search-note">Did you mean <a data-suggest="${this._esc(suggestion)}">${this._esc(suggestion)}</a>?</div>`);
    }

    results.forEach(r => {
      parts.push(`
        <div class="jk-search-result" data-title="${this._esc(r.title)}">
          <div class="jk-search-result-title">${this._esc(r.title)}</div>
          <div class="jk-search-result-desc">${this._snippetHtml(r.snippet)}…</div>
        </div>`);
    });

    parts.push(`
      <div class="jk-search-more">
        <button class="jk-err-btn" data-ext-search="1">Search on wikipedia.org ↗</button>
      </div>`);

    body.innerHTML = parts.join("");
  }

  // ─── tabs ────────────────────────────────────────────────────

  openTab(entry = { type: "home" }) {
    this._saveScroll(this._activeTab());
    const tab = this._createTab(entry);
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this._renderTabs();
    this._render(tab);
    if (entry.type === "home") this._focusAddressBar();
  }

  switchTab(id) {
    const tab = this._getTab(id);
    if (!tab) return;
    this._saveScroll(this._activeTab());
    this.activeTabId = id;
    this._renderTabs();
    this._render(tab);
  }

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);

    if (this.tabs.length === 0) {
      const fresh = this._createTab();
      this.tabs.push(fresh);
      this.activeTabId = fresh.id;
    } else if (this.activeTabId === id) {
      this.activeTabId = this.tabs[Math.max(0, idx - 1)].id;
    }
    this._renderTabs();
    this._render(this._activeTab());
  }

  // ─── bookmarks ───────────────────────────────────────────────

  toggleBookmark() {
    const entry = this._entry(this._activeTab());
    if (!entry || entry.type !== "article") return;

    const idx = this.bookmarks.findIndex(b => b.title === entry.title);
    if (idx >= 0) this.bookmarks.splice(idx, 1);
    else this.bookmarks.push({ title: entry.title });

    this._saveJSON("jk-wiki-bookmarks", this.bookmarks);
    this._renderBookmarks();
    this._syncChrome(this._activeTab());
  }

  _focusAddressBar() {
    const input = this._el("#jk-address-input");
    if (input) { input.focus(); input.select(); }
  }

  _openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ─── events ──────────────────────────────────────────────────

  _bindEvents() {
    if (this._eventsBound || !this._container) return;
    this._eventsBound = true;

    const root = this._container;
    const addressInput = this._el("#jk-address-input");
    const homeSearch = this._el("#jk-newtab-search-input");

    addressInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.navigate(addressInput.value);
      if (e.key === "Escape") addressInput.blur();
    });

    homeSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && homeSearch.value.trim()) {
        this.navigate(homeSearch.value);
        homeSearch.value = "";
      }
    });

    // home quick links
    this._el("#jk-quicklinks").addEventListener("click", (e) => {
      const item = e.target.closest(".jk-quicklink");
      if (!item) return;
      if (item.dataset.action === "random") this.openRandom();
      else if (item.dataset.title) this.openArticle(item.dataset.title);
    });

    // bookmarks bar
    this._el("#jk-bookmarks-bar").addEventListener("click", (e) => {
      const chip = e.target.closest(".jk-bookmark-chip");
      if (chip) this.openArticle(chip.dataset.title);
    });

    // toolbar
    this._el(".jk-browser-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "back") this.goBack();
      if (action === "forward") this.goForward();
      if (action === "reload") this.reload();
      if (action === "home") this.goHome();
      if (action === "random") this.openRandom();
      if (action === "new-tab") this.openTab();
    });

    this._el("#jk-bookmark-btn").addEventListener("click", () => this.toggleBookmark());

    // open the current page on wikipedia.org
    this._el("#jk-external-btn").addEventListener("click", () => {
      const entry = this._entry(this._activeTab());
      if (!entry) return;
      if (entry.type === "article") this._openExternal(this._wikiUrl(entry.title));
      else if (entry.type === "search") {
        this._openExternal(`https://${this.lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(entry.query)}`);
      } else this._openExternal(`https://${this.lang}.wikipedia.org/`);
    });

    // search results
    this._el("#jk-search-body").addEventListener("click", (e) => {
      const result = e.target.closest(".jk-search-result");
      if (result) { this.openArticle(result.dataset.title); return; }

      const suggest = e.target.closest("[data-suggest]");
      if (suggest) { this.search(suggest.dataset.suggest); return; }

      if (e.target.closest("[data-ext-search]")) {
        const entry = this._entry(this._activeTab());
        const q = entry && entry.type === "search" ? entry.query : "";
        this._openExternal(`https://${this.lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`);
      }
    });

    // error screen buttons
    this._el("#jk-err-actions").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-err]");
      if (!btn) return;
      if (btn.dataset.err === "retry") this.reload();
      if (btn.dataset.err === "search") this.search(this._errTitle);
      if (btn.dataset.err === "external") this._openExternal(this._wikiUrl(this._errTitle));
    });

    // links inside articles
    this._el("#jk-article").addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      e.preventDefault();

      const href = link.getAttribute("href");

      if (link.dataset.external) { this._openExternal(href); return; }

      // jump within the article (footnotes, "see also", etc.)
      if (href.startsWith("#")) {
        this._scrollToId(this._decode(href.slice(1)));
        return;
      }

      const internal =
        href.match(/^\/wiki\/([^#?]+)(?:#(.*))?$/) ||
        href.match(/^(?:https?:)?\/\/[\w-]+(?:\.m)?\.wikipedia\.org\/wiki\/([^#?]+)(?:#(.*))?$/i);

      if (internal) {
        const title = this._decode(internal[1]).replace(/_/g, " ");
        if (/^Special:/i.test(title)) {
          this._openExternal(this._wikiUrl(title));
        } else {
          this.openArticle(title, internal[2]);
        }
        return;
      }

      // links to articles that don't exist yet (red links), edit links, etc.
      if (href.startsWith("/w/")) {
        this._setStatus("That page doesn't exist on Wikipedia yet", "");
        return;
      }

      if (/^(https?:)?\/\//i.test(href)) {
        this._openExternal(href.startsWith("//") ? `https:${href}` : href);
      }
    });

    // tabs
    this._el("#jk-browser-tabs").addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close-tab]");
      if (closeBtn) {
        e.stopPropagation();
        this.closeTab(closeBtn.dataset.closeTab);
        return;
      }
      if (e.target.closest("#jk-tab-add")) { this.openTab(); return; }
      const tabEl = e.target.closest(".jk-browser-tab");
      if (tabEl) this.switchTab(tabEl.dataset.tabId);
    });

    // keyboard shortcuts
    this._keydownHandler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "t") { e.preventDefault(); this.openTab(); }
      if (mod && key === "w") { e.preventDefault(); this.closeTab(this.activeTabId); }
      if (mod && (key === "l" || key === "k")) { e.preventDefault(); this._focusAddressBar(); }
      if (mod && key === "r") { e.preventDefault(); this.reload(); }
      if (e.key === "F5") { e.preventDefault(); this.reload(); }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); this.goBack(); }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); this.goForward(); }
    };
    root.addEventListener("keydown", this._keydownHandler);
  }

  // ─── lifecycle ───────────────────────────────────────────────

  onOpen() {
    if (!this._eventsBound) this._bindEvents();
    this._focusAddressBar();
  }

  onClose() {
    clearInterval(this._clockInterval);
    clearTimeout(this._progressResetTimer);
    this.tabs.forEach(t => { t.token = null; });
  }

  destroy() {
    this.onClose();
    super.destroy();
  }
}

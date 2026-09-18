import BaseApp from "../core/app-manager/BaseApp.js";

/**
 * BrowserApp
 * A self-contained, futuristic in-OS web browser.
 * Mirrors the TerminalApp pattern: createContent() builds the DOM,
 * _bindEvents() wires interactions, onOpen()/onClose() manage lifecycle.
 */
export default class BrowserApp extends BaseApp {

  constructor(config, kernel = null) {
    super(config, kernel);
    this.icon = "🌐";

    // ─── state ────────────────────────────────────────────────
    this.tabs = [];
    this.activeTabId = null;
    this._tabSeq = 0;
    this._progressTimer = null;
    this._eventsBound = false;

    this.searchEngine = "https://duckduckgo.com/html/?q=";
    this.quickLinks = [
      { name: "GitHub", url: "https://github.com" },
      { name: "Wikipedia", url: "https://wikipedia.org" },
      { name: "MDN Docs", url: "https://developer.mozilla.org" },
      { name: "YouTube", url: "https://youtube.com" },
      { name: "CodePen", url: "https://codepen.io" },
      { name: "DuckDuckGo", url: "https://duckduckgo.com" },
    ];

    this.bookmarks = this._loadJSON("jk-browser-bookmarks", [
      { name: "GitHub", url: "https://github.com" },
      { name: "MDN", url: "https://developer.mozilla.org" },
    ]);

    this._frameBlocked = new Set([
  "github.com", "www.github.com",
  "google.com", "www.google.com",
  "youtube.com", "www.youtube.com", "m.youtube.com",
  "twitter.com", "x.com",
  "facebook.com", "www.facebook.com",
  "instagram.com", "www.instagram.com",
  "reddit.com", "www.reddit.com",
  "duckduckgo.com", "html.duckduckgo.com",
  "stackoverflow.com", "linkedin.com", "www.linkedin.com",
  "amazon.com", "www.amazon.com",
  "netflix.com", "www.netflix.com",
  "discord.com", "openai.com", "chat.openai.com",
]);

  }

  // ─── persistence helpers ──────────────────────────────────────

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
    } catch (e) { /* storage unavailable — ignore */ }
  }

  // ─── styles (injected once, drop-in safe) ─────────────────────

  _injectStyles() {
    if (document.getElementById("jk-browser-styles")) return;
    const style = document.createElement("style");
    style.id = "jk-browser-styles";
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
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: radial-gradient(1200px 600px at 20% -10%, rgba(0,255,242,0.06), transparent 60%),
                    radial-gradient(1000px 500px at 100% 110%, rgba(255,47,208,0.06), transparent 60%),
                    var(--jk-bg);
        color: var(--jk-text);
        font-family: 'Consolas', 'SFMono-Regular', 'Segoe UI', ui-monospace, monospace;
        overflow: hidden;
      }

      /* ── tabs ── */
      .jk-browser-tabs {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        padding: 8px 10px 0;
        background: var(--jk-panel-solid);
        border-bottom: 1px solid var(--jk-border);
        overflow-x: auto;
        scrollbar-width: thin;
      }
      .jk-browser-tabs::-webkit-scrollbar { height: 4px; }
      .jk-browser-tabs::-webkit-scrollbar-thumb { background: var(--jk-border); border-radius: 4px; }

      .jk-browser-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 140px;
        max-width: 200px;
        padding: 7px 10px;
        border-radius: 8px 8px 0 0;
        background: rgba(255,255,255,0.02);
        border: 1px solid transparent;
        border-bottom: none;
        cursor: pointer;
        position: relative;
        transition: background .15s ease, transform .15s ease;
        color: var(--jk-text-dim);
      }
      .jk-browser-tab:hover { background: rgba(0,255,242,0.05); color: var(--jk-text); }
      .jk-browser-tab.active {
        background: linear-gradient(180deg, rgba(0,255,242,0.10), rgba(16,20,34,0.9));
        border-color: var(--jk-border);
        color: #fff;
        box-shadow: 0 -2px 12px rgba(0,255,242,0.15);
      }
      .jk-browser-tab.active::after {
        content: "";
        position: absolute;
        left: 8px; right: 8px; bottom: -1px;
        height: 2px;
        background: linear-gradient(90deg, var(--jk-cyan), var(--jk-magenta));
        box-shadow: 0 0 8px var(--jk-cyan);
      }
      .jk-tab-favicon { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
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
        cursor: pointer; font-size: 15px; line-height: 1;
        transition: box-shadow .2s ease, background .2s ease;
        flex-shrink: 0;
      }
      .jk-tab-add:hover { background: rgba(0,255,242,0.08); box-shadow: 0 0 10px rgba(0,255,242,0.35); }

      /* ── toolbar ── */
      .jk-browser-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        background: var(--jk-panel);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--jk-border);
      }
      .jk-nav-buttons { display: flex; gap: 4px; }
      .jk-nav-btn, .jk-action-btn {
        width: 30px; height: 30px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: rgba(255,255,255,0.03);
        color: var(--jk-text);
        cursor: pointer;
        font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        transition: all .15s ease;
      }
      .jk-nav-btn:hover, .jk-action-btn:hover {
        border-color: var(--jk-border);
        color: var(--jk-cyan);
        box-shadow: 0 0 10px rgba(0,255,242,0.25);
      }
      .jk-nav-btn:disabled { opacity: .3; cursor: default; box-shadow: none; color: var(--jk-text); }

      .jk-address-bar {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0,0,0,0.35);
        border: 1px solid var(--jk-border);
        border-radius: 999px;
        padding: 0 12px;
        height: 34px;
        transition: box-shadow .2s ease, border-color .2s ease;
      }
      .jk-address-bar:focus-within {
        border-color: var(--jk-cyan);
        box-shadow: 0 0 0 3px rgba(0,255,242,0.12), 0 0 16px rgba(0,255,242,0.25);
      }
      .jk-security-icon { font-size: 12px; opacity: .8; }
      .jk-address-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--jk-text);
        font: inherit;
        font-size: 13px;
      }
      .jk-address-input::placeholder { color: var(--jk-text-dim); }
      .jk-bookmark-btn, .jk-external-btn {
        background: none; border: none; cursor: pointer;
        color: var(--jk-text-dim); font-size: 14px;
      }
      .jk-bookmark-btn.active { color: #ffd24a; text-shadow: 0 0 8px rgba(255,210,74,0.7); }
      .jk-bookmark-btn:hover, .jk-external-btn:hover { color: var(--jk-cyan); }

      /* ── bookmarks bar ── */
      .jk-bookmarks-bar {
        display: flex;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(255,255,255,0.015);
        border-bottom: 1px solid var(--jk-border);
        overflow-x: auto;
        min-height: 28px;
      }
      .jk-bookmark-chip {
        display: flex; align-items: center; gap: 5px;
        padding: 3px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--jk-border);
        color: var(--jk-text-dim);
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .15s ease;
      }
      .jk-bookmark-chip:hover { color: var(--jk-cyan); border-color: var(--jk-cyan); }
      .jk-bookmark-chip img { width: 12px; height: 12px; border-radius: 2px; }

      /* ── progress bar ── */
      .jk-progress-bar { height: 2px; background: transparent; overflow: hidden; }
      .jk-progress-fill {
        height: 100%; width: 0%;
        background: linear-gradient(90deg, var(--jk-cyan), var(--jk-magenta));
        box-shadow: 0 0 10px var(--jk-cyan);
        transition: width .3s ease;
      }

      /* ── viewport ── */
      .jk-browser-viewport { position: relative; flex: 1; background: #000; overflow: hidden; }
      .jk-browser-frame { width: 100%; height: 100%; border: none; background: #fff; display: none; }

      .jk-newtab-page {
        position: absolute; inset: 0;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 28px;
        background:
          linear-gradient(rgba(0,255,242,0.035) 1px, transparent 1px) 0 0 / 100% 34px,
          linear-gradient(90deg, rgba(0,255,242,0.035) 1px, transparent 1px) 0 0 / 34px 100%,
          radial-gradient(800px 400px at 50% 30%, rgba(0,255,242,0.08), transparent 70%),
          #05070d;
        overflow-y: auto;
        padding: 40px 20px;
      }
      .jk-newtab-clock {
        font-size: 46px; font-weight: 600; letter-spacing: 2px;
        color: #fff; text-shadow: 0 0 22px rgba(0,255,242,0.55);
      }
      .jk-newtab-greeting { color: var(--jk-text-dim); font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
      .jk-newtab-search {
        width: min(560px, 90%);
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--jk-border);
        border-radius: 999px;
        padding: 12px 20px;
        transition: box-shadow .2s ease, border-color .2s ease;
      }
      .jk-newtab-search:focus-within {
        border-color: var(--jk-cyan);
        box-shadow: 0 0 0 4px rgba(0,255,242,0.10), 0 0 24px rgba(0,255,242,0.3);
      }
      .jk-newtab-search input {
        flex: 1; background: transparent; border: none; outline: none;
        color: #fff; font: inherit; font-size: 14px;
      }
      .jk-quicklinks {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
        gap: 14px;
        width: min(560px, 90%);
      }
      .jk-quicklink {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        cursor: pointer; color: var(--jk-text-dim); text-align: center;
      }
      .jk-quicklink-icon {
        width: 46px; height: 46px; border-radius: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--jk-border);
        display: flex; align-items: center; justify-content: center;
        transition: all .18s ease;
      }
      .jk-quicklink:hover .jk-quicklink-icon {
        border-color: var(--jk-cyan);
        box-shadow: 0 0 16px rgba(0,255,242,0.35);
        transform: translateY(-2px);
      }
      .jk-quicklink img { width: 22px; height: 22px; border-radius: 4px; }
      .jk-quicklink span { font-size: 11px; }

      /* ── error / blocked state ── */
      .jk-browser-error {
        position: absolute; inset: 0; display: none;
        flex-direction: column; align-items: center; justify-content: center; gap: 14px;
        background: #05070d; text-align: center; padding: 20px;
      }
      .jk-browser-error .jk-err-icon { font-size: 40px; filter: drop-shadow(0 0 12px rgba(255,47,208,0.6)); }
      .jk-browser-error h3 { margin: 0; color: #fff; font-size: 15px; }
      .jk-browser-error p { margin: 0; color: var(--jk-text-dim); font-size: 12px; max-width: 380px; }
      .jk-err-actions { display: flex; gap: 10px; margin-top: 6px; }
      .jk-err-btn {
        padding: 8px 16px; border-radius: 8px; cursor: pointer;
        border: 1px solid var(--jk-border); background: rgba(0,255,242,0.06); color: var(--jk-cyan);
        font: inherit; font-size: 12px;
      }
      .jk-err-btn:hover { box-shadow: 0 0 14px rgba(0,255,242,0.35); }

      /* ── status bar ── */
      .jk-browser-statusbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 4px 12px;
        background: var(--jk-panel-solid);
        border-top: 1px solid var(--jk-border);
        font-size: 10.5px; color: var(--jk-text-dim);
      }
      .jk-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--jk-cyan); margin-right: 6px; box-shadow: 0 0 6px var(--jk-cyan); display: inline-block; }
    `;
    document.head.appendChild(style);
  }

  // ─── tab model helpers ─────────────────────────────────────────

  _createTab(url = null) {
    this._tabSeq += 1;
    return {
      id: `t${this._tabSeq}`,
      title: url ? url : "New Tab",
      url: url || null,
      isNewTab: !url,
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1,
      bookmarked: false,
    };
  }

  _getTab(id) {
    return this.tabs.find(t => t.id === id) || null;
  }

  _domain(url) {
    try { return new URL(url).hostname; } catch (e) { return ""; }
  }

  _faviconFor(url) {
    const domain = this._domain(url);
    return domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      : "";
  }

  _normalizeInput(raw) {
    const value = raw.trim();
    if (!value) return null;
    const looksLikeUrl = /^https?:\/\//i.test(value) ||
      (/^[\w-]+(\.[\w-]+)+/.test(value) && !value.includes(" "));
    if (looksLikeUrl) {
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }
    return `${this.searchEngine}${encodeURIComponent(value)}`;
  }

  // ─── createContent (main entry) ───────────────────────────────

  createContent() {
    this._injectStyles();

    const container = document.createElement("div");
    container.className = "jk-browser";

    // seed with one fresh tab
    const first = this._createTab();
    this.tabs.push(first);
    this.activeTabId = first.id;

    container.innerHTML = `
      <div class="jk-browser-tabs" id="jk-browser-tabs"></div>

      <div class="jk-browser-toolbar">
        <div class="jk-nav-buttons">
          <button class="jk-nav-btn" data-action="back" title="Back">◀</button>
          <button class="jk-nav-btn" data-action="forward" title="Forward">▶</button>
          <button class="jk-nav-btn" data-action="reload" title="Reload">⟳</button>
          <button class="jk-nav-btn" data-action="home" title="Home">⌂</button>
        </div>
        <div class="jk-address-bar">
          <span class="jk-security-icon" id="jk-security-icon">🔓</span>
          <input id="jk-address-input" class="jk-address-input" type="text"
                 placeholder="Search or enter address" spellcheck="false" autocomplete="off" />
          <button class="jk-bookmark-btn" id="jk-bookmark-btn" title="Bookmark this page">☆</button>
          <button class="jk-external-btn" id="jk-external-btn" title="Open in a real browser tab">↗</button>
        </div>
        <div class="jk-nav-buttons">
          <button class="jk-action-btn" data-action="new-tab" title="New tab">＋</button>
        </div>
      </div>

      <div class="jk-bookmarks-bar" id="jk-bookmarks-bar"></div>

      <div class="jk-progress-bar"><div class="jk-progress-fill" id="jk-progress-fill"></div></div>

      <div class="jk-browser-viewport">
        <iframe class="jk-browser-frame" id="jk-browser-frame"
        referrerpolicy="no-referrer"></iframe>

        <div class="jk-newtab-page" id="jk-newtab-page">
          <div class="jk-newtab-greeting" id="jk-newtab-greeting"></div>
          <div class="jk-newtab-clock" id="jk-newtab-clock"></div>
          <div class="jk-newtab-search">
            <span>🔍</span>
            <input id="jk-newtab-search-input" type="text" placeholder="Search the web…" spellcheck="false" />
          </div>
          <div class="jk-quicklinks" id="jk-quicklinks"></div>
        </div>

        <div class="jk-browser-error" id="jk-browser-error">
          <div class="jk-err-icon">⚠</div>
          <h3>This site may not allow embedding</h3>
          <p id="jk-err-detail">Some sites block being displayed inside another page for security reasons.</p>
          <div class="jk-err-actions">
            <button class="jk-err-btn" id="jk-err-retry">Retry</button>
            <button class="jk-err-btn" id="jk-err-open">Open externally ↗</button>
          </div>
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
    this._showNewTabPage();
    this._startClock();

    return container;
  }

  // ─── rendering ──────────────────────────────────────────────

  _renderTabs() {
    const wrap = this._container.querySelector("#jk-browser-tabs");
    if (!wrap) return;
    wrap.innerHTML = "";
    this.tabs.forEach(tab => {
      const el = document.createElement("div");
      el.className = "jk-browser-tab" + (tab.id === this.activeTabId ? " active" : "");
      el.dataset.tabId = tab.id;
      const favicon = tab.url ? this._faviconFor(tab.url) : "";
      el.innerHTML = `
        ${favicon
          ? `<img class="jk-tab-favicon" src="${favicon}" onerror="this.style.display='none'" />`
          : `<span class="jk-tab-favicon">🌐</span>`}
        <span class="jk-tab-title">${tab.isNewTab ? "New Tab" : (tab.title || tab.url)}</span>
        <button class="jk-tab-close" data-close-tab="${tab.id}">×</button>
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
    const bar = this._container.querySelector("#jk-bookmarks-bar");
    if (!bar) return;
    bar.innerHTML = "";
    this.bookmarks.forEach(bm => {
      const chip = document.createElement("div");
      chip.className = "jk-bookmark-chip";
      chip.dataset.url = bm.url;
      chip.innerHTML = `<img src="${this._faviconFor(bm.url)}" onerror="this.style.display='none'" /><span>${bm.name}</span>`;
      bar.appendChild(chip);
    });
  }

  _renderQuickLinks() {
    const grid = this._container.querySelector("#jk-quicklinks");
    if (!grid) return;
    grid.innerHTML = "";
    this.quickLinks.forEach(link => {
      const item = document.createElement("div");
      item.className = "jk-quicklink";
      item.dataset.url = link.url;
      item.innerHTML = `
        <div class="jk-quicklink-icon">
          <img src="${this._faviconFor(link.url)}" onerror="this.style.display='none'" />
        </div>
        <span>${link.name}</span>
      `;
      grid.appendChild(item);
    });
  }

  _startClock() {
    const clockEl = this._container.querySelector("#jk-newtab-clock");
    const greetEl = this._container.querySelector("#jk-newtab-greeting");
    const tick = () => {
      if (!clockEl) return;
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const h = now.getHours();
      greetEl.textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    };
    tick();
    this._clockInterval = setInterval(tick, 1000 * 20);
  }

  // ─── view state switching ─────────────────────────────────────

  _showNewTabPage() {
    this._container.querySelector("#jk-browser-frame").style.display = "none";
    this._container.querySelector("#jk-newtab-page").style.display = "flex";
    this._container.querySelector("#jk-browser-error").style.display = "none";
    const addressInput = this._container.querySelector("#jk-address-input");
    addressInput.value = "";
    this._setStatus("Ready", "");
    this._setSecurity(null);
  }

  _showFrame() {
    this._container.querySelector("#jk-browser-frame").style.display = "block";
    this._container.querySelector("#jk-newtab-page").style.display = "none";
    this._container.querySelector("#jk-browser-error").style.display = "none";
  }

  _showError(url) {
    this._container.querySelector("#jk-browser-frame").style.display = "none";
    this._container.querySelector("#jk-newtab-page").style.display = "none";
    const errBox = this._container.querySelector("#jk-browser-error");
    errBox.style.display = "flex";
    this._container.querySelector("#jk-err-detail").textContent =
      `"${this._domain(url) || url}" refused to load here. Try opening it in a real browser tab instead.`;
  }

  _setStatus(text, url) {
    this._container.querySelector("#jk-status-text").textContent = text;
    this._container.querySelector("#jk-status-url").textContent = url || "";
  }

  _setSecurity(url) {
    const icon = this._container.querySelector("#jk-security-icon");
    if (!url) { icon.textContent = "🔓"; return; }
    icon.textContent = url.startsWith("https://") ? "🔒" : "🔓";
  }

  _setProgress(pct) {
    const fill = this._container.querySelector("#jk-progress-fill");
    fill.style.width = `${pct}%`;
    if (pct >= 100 || pct === 0) {
      clearTimeout(this._progressResetTimer);
      this._progressResetTimer = setTimeout(() => { fill.style.width = "0%"; }, 350);
    }
  }

  _updateBookmarkButton(url) {
    const btn = this._container.querySelector("#jk-bookmark-btn");
    const isBookmarked = !!url && this.bookmarks.some(b => b.url === url);
    btn.textContent = isBookmarked ? "★" : "☆";
    btn.classList.toggle("active", isBookmarked);
  }

  // ─── navigation ─────────────────────────────────────────────

  navigate(rawInput) {
    const tab = this._getTab(this.activeTabId);
    if (!tab) return;
    const url = this._normalizeInput(rawInput);
    if (!url) return;

    // trim forward history, push new entry
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push(url);
    tab.historyIndex = tab.history.length - 1;
    tab.url = url;
    tab.isNewTab = false;
    tab.title = this._domain(url) || url;

    this._loadUrl(url);
  }

  goBack() {
    const tab = this._getTab(this.activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    tab.historyIndex -= 1;
    tab.url = tab.history[tab.historyIndex];
    this._loadUrl(tab.url);
  }

  goForward() {
    const tab = this._getTab(this.activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex += 1;
    tab.url = tab.history[tab.historyIndex];
    this._loadUrl(tab.url);
  }

  reload() {
    const tab = this._getTab(this.activeTabId);
    if (!tab || !tab.url) return;
    this._loadUrl(tab.url, true);
  }

  goHome() {
    const tab = this._getTab(this.activeTabId);
    if (!tab) return;
    tab.isNewTab = true;
    tab.url = null;
    tab.title = "New Tab";
    this._renderTabs();
    this._showNewTabPage();
  }

  _loadUrl(url, forceReload = false) {
  const frame = this._container.querySelector("#jk-browser-frame");
  const addressInput = this._container.querySelector("#jk-address-input");

  addressInput.value = url;
  this._setSecurity(url);
  this._updateBookmarkButton(url);

  // Hard block: known frame-busters. Don't even try — show the fallback.
  if (this._isKnownFrameBlocker(url)) {
    this._setStatus("Blocked by site", url);
    this._setProgress(0);
    this._showError(url);
    this._renderTabs();
    this._syncNavButtons();
    return;
  }

  this._showFrame();
  this._setStatus("Loading…", url);
  this._setProgress(15);

  clearTimeout(this._loadFailTimer);
  clearTimeout(this._loadTimeout);
  this._loadFailTimer = setTimeout(() => this._setProgress(60), 200);

  // Heuristic timeout: if nothing has settled in 8s, it's probably framed-blocked.
  this._loadTimeout = setTimeout(() => {
    this._setProgress(0);
    this._setStatus("No response", url);
    this._showError(url);
  }, 8000);

  const onLoad = () => {
    clearTimeout(this._loadTimeout);
    this._setProgress(100);
    frame.removeEventListener("load", onLoad);

    // Try to peek at the frame's location. Cross-origin success throws;
    // same-origin "about:blank" means the browser swapped in its error page.
    try {
      const href = frame.contentWindow.location.href;
      if (href === "about:blank" && url !== "about:blank") {
        this._setStatus("Blocked by site", url);
        this._showError(url);
        return;
      }
    } catch (e) {
      // Cross-origin — this is the happy path for loaded sites.
    }

    this._setStatus("Done", url);
  };
  frame.addEventListener("load", onLoad);

  if (forceReload) {
    frame.src = "about:blank";
    requestAnimationFrame(() => { frame.src = url; });
  } else {
    frame.src = url;
  }

  this._renderTabs();
  this._syncNavButtons();
}

  _syncNavButtons() {
    const tab = this._getTab(this.activeTabId);
    const backBtn = this._container.querySelector('[data-action="back"]');
    const fwdBtn = this._container.querySelector('[data-action="forward"]');
    if (!tab) return;
    backBtn.disabled = tab.historyIndex <= 0;
    fwdBtn.disabled = tab.historyIndex >= tab.history.length - 1;
  }

  // ─── tab actions ────────────────────────────────────────────

  openTab(url = null) {
    const tab = this._createTab(url);
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this._renderTabs();
    if (url) {
      tab.history = [url];
      tab.historyIndex = 0;
      this._loadUrl(url);
    } else {
      this._showNewTabPage();
    }
    this._focusAddressBar();
  }

  switchTab(id) {
    const tab = this._getTab(id);
    if (!tab) return;
    this.activeTabId = id;
    this._renderTabs();
    if (tab.isNewTab || !tab.url) {
      this._showNewTabPage();
    } else {
      const frame = this._container.querySelector("#jk-browser-frame");
      this._showFrame();
      this._container.querySelector("#jk-address-input").value = tab.url;
      this._setSecurity(tab.url);
      this._setStatus("Ready", tab.url);
      this._updateBookmarkButton(tab.url);
      if (frame.src !== tab.url) frame.src = tab.url;
    }
    this._syncNavButtons();
  }

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);

    if (this.tabs.length === 0) {
      // always keep at least one tab alive
      const fresh = this._createTab();
      this.tabs.push(fresh);
      this.activeTabId = fresh.id;
    } else if (this.activeTabId === id) {
      const next = this.tabs[Math.max(0, idx - 1)];
      this.activeTabId = next.id;
    }
    this._renderTabs();
    this.switchTab(this.activeTabId);
  }

  // ─── bookmarks ──────────────────────────────────────────────

  toggleBookmark() {
    const tab = this._getTab(this.activeTabId);
    if (!tab || !tab.url) return;
    const existingIdx = this.bookmarks.findIndex(b => b.url === tab.url);
    if (existingIdx >= 0) {
      this.bookmarks.splice(existingIdx, 1);
    } else {
      this.bookmarks.push({ name: tab.title || this._domain(tab.url), url: tab.url });
    }
    this._saveJSON("jk-browser-bookmarks", this.bookmarks);
    this._renderBookmarks();
    this._updateBookmarkButton(tab.url);
  }

  _focusAddressBar() {
    const input = this._container.querySelector("#jk-address-input");
    if (input) { input.focus(); input.select(); }
  }

  // ─── event binding ──────────────────────────────────────────

  _bindEvents() {
    if (this._eventsBound || !this._container) return;
    this._eventsBound = true;

    const root = this._container;
    const addressInput = root.querySelector("#jk-address-input");
    const newtabSearch = root.querySelector("#jk-newtab-search-input");

    // address bar
    addressInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.navigate(addressInput.value);
      if (e.key === "Escape") addressInput.blur();
    });

    // new tab page search
    newtabSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && newtabSearch.value.trim()) {
        this.navigate(newtabSearch.value);
        newtabSearch.value = "";
      }
    });

    // quicklinks
    root.querySelector("#jk-quicklinks").addEventListener("click", (e) => {
      const item = e.target.closest(".jk-quicklink");
      if (item) this.navigate(item.dataset.url);
    });

    // bookmarks bar
    root.querySelector("#jk-bookmarks-bar").addEventListener("click", (e) => {
      const chip = e.target.closest(".jk-bookmark-chip");
      if (chip) this.navigate(chip.dataset.url);
    });

    // toolbar buttons
    root.querySelector(".jk-browser-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "back") this.goBack();
      if (action === "forward") this.goForward();
      if (action === "reload") this.reload();
      if (action === "home") this.goHome();
      if (action === "new-tab") this.openTab();
    });

    root.querySelector("#jk-bookmark-btn").addEventListener("click", () => this.toggleBookmark());

    root.querySelector("#jk-external-btn").addEventListener("click", () => {
      const tab = this._getTab(this.activeTabId);
      if (tab && tab.url) window.open(tab.url, "_blank", "noopener,noreferrer");
    });

    // error overlay buttons
    root.querySelector("#jk-err-retry").addEventListener("click", () => this.reload());
    root.querySelector("#jk-err-open").addEventListener("click", () => {
      const tab = this._getTab(this.activeTabId);
      if (tab && tab.url) window.open(tab.url, "_blank", "noopener,noreferrer");
    });

    // tabs bar: switch / close / add (event delegation, tabs re-render often)
    root.querySelector("#jk-browser-tabs").addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close-tab]");
      if (closeBtn) {
        e.stopPropagation();
        this.closeTab(closeBtn.dataset.closeTab);
        return;
      }
      if (e.target.closest("#jk-tab-add")) {
        this.openTab();
        return;
      }
      const tabEl = e.target.closest(".jk-browser-tab");
      if (tabEl) this.switchTab(tabEl.dataset.tabId);
    });

    // keyboard shortcuts
    this._keydownHandler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "t") { e.preventDefault(); this.openTab(); }
      if (mod && e.key.toLowerCase() === "w") { e.preventDefault(); this.closeTab(this.activeTabId); }
      if (mod && (e.key.toLowerCase() === "l" || e.key.toLowerCase() === "k")) {
        e.preventDefault(); this._focusAddressBar();
      }
      if (mod && e.key.toLowerCase() === "r") { e.preventDefault(); this.reload(); }
      if (e.key === "F5") { e.preventDefault(); this.reload(); }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); this.goBack(); }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); this.goForward(); }
    };
    root.addEventListener("keydown", this._keydownHandler);
  }

  _isKnownFrameBlocker(url) {
  const host = this._domain(url).replace(/^www\./, "");
  for (const d of this._frameBlocked) {
    const bare = d.replace(/^www\./, "");
    if (host === bare || host.endsWith("." + bare)) return true;
  }
  return false;
}

  // ─── lifecycle ──────────────────────────────────────────────

  onOpen() {
    if (!this._eventsBound) this._bindEvents();
    this._focusAddressBar();
  }

  onClose() {
  clearInterval(this._clockInterval);
  clearTimeout(this._progressResetTimer);
  clearTimeout(this._loadFailTimer);
  clearTimeout(this._loadTimeout);   // ← add this
}

  destroy() {
    this.onClose();
    super.destroy();
  }
}

# MIN-OS (JK OS) — Browser-Based Desktop OS Simulation

A single-page browser application that simulates a desktop operating system with windows, a taskbar, dock, file manager, terminal, text editor, and a built-in browser — all running entirely client-side.

## Project overview

MIN-OS is a frontend-only "OS-in-a-page" built with JavaScript (ES modules) and Tailwind CSS. It boots through a simulated kernel shell (`JK OS` boot screen), then presents a desktop with icons, a vertical Dash dock, and a windowed app environment. All persistence is via IndexedDB (with a localStorage fallback).

**No server, no build step, no framework runtime** — just static files served by any HTTP server.

## Features

- Boot screen with animated logs and progress
- Desktop with wallpaper, grid icons, right-click context menu, clock
- Vertical Dock (Dash) with app launch icons
- Window manager: drag, resize, minimize, maximize, z-index stacking, close
- Four applications:
  - **Terminal** — shell with `ls`, `cd`, `mkdir`, `touch`, `echo`, `cat`, `cp`, `mv`, `rm`, `clear`, `find`, `vim`
  - **File Manager** — browse/create/navigate the virtual filesystem
  - **Text Editor** — edit files with find/replace, undo/redo, line numbers, save/load from filesystem
  - **Browser** — tabbed iframe browser with address bar, bookmarks, quick links, search (DuckDuckGo fallback, Wikipedia API)
- Clipboard service (internal + native browser clipboard sync)
- Filesystem in-memory tree persisted via IndexedDB (`JK_OS` / `FileStorage`)
- Autocomplete via a Trie over current-directory names
- Default directories created on first boot: `Documents`, `Desktop`, `Downloads`, `Pictures`, `Music`, `Videos`

## Tech stack

| Layer | Choice |
|---|---|
| Language | JavaScript (ES modules, `type="module"`) |
| Styling | Tailwind CSS (CDN `@tailwindcss/browser@4`) + custom CSS |
| Fonts | Inter (UI), JetBrains Mono / Fraunces (terminal/brand) |
| Storage | `idb` (v8) wrapper over IndexedDB; localStorage fallback |
| Browser | Web `iframe` with `sandbox` attr |
| Search | Wikipedia OpenSearch API |

## Architecture overview

```
index.html → main.js → Kernel → Bootstrapper
                 ├─ ServiceContainer (DI)
                 ├─ WindowManager / Window / WindowFactory / WindowRenderer / WindowState
                 ├─ AppManager / AppRegistry / BaseApp / AppFactory
                 ├─ FileSystem + FileRepository + PathResolver + FileTypeRegistry + FileTrie
                 ├─ Shell + CommandRegistry + commands (ls, cd, mkdir, touch, echo, cat, cp, mv, rm, clear, find, vim)
                 ├─ Clipboard (+ ClipboardItem)
                 ├─ StorageFactory → IndexedDBAdapter | LocalStorageAdapter
                 └─ UI: Desktop, DesktopGrid, DesktopIcon, Wallpaper, Dash, BootScreen
```

Apps are launched through `AppManager.openApp(appId)` which creates a `BaseApp` subclass instance, calls `createContent()`, wraps it in a `Window` via `WindowFactory`, and registers it with `WindowManager`.

## Project structure

```
minichrome-os/
├── index.html            # Entry point — loads main.js as module
├── main.js               # Boot: new Kernel() → kernel.start()
├── package.json          # Single runtime dep: idb ^8.0.3
├── styles/               # CSS (variables, global, boot, desktop, dock, taskbar, window, terminal, filemanager, texteditor, context-menu)
├── src/
│   ├── core/
│   │   ├── kernel/       # Kernel, Bootstrapper, ServiceContainer
│   │   ├── app-manager/  # BaseApp, AppRegistry, AppManager, AppFactory
│   │   ├── window-manager/ # Window, WindowManager, WindowFactory, WindowRenderer, WindowState
│   │   ├── clipboard/    # Clipboard, ClipboardItem
│   │   └── storage/      # StorageAdapter (abstract), IndexedDBAdapter, LocalStorageAdapter, StorageFactory
│   ├── filesystem/
│   │   ├── models/       # FileSystemNode, FileNode, DirectoryNode, SymbolicLinkNode
│   │   ├── services/     # FileSystem, FileRepository, PathResolver, FileTypeRegistry
│   │   └── constants/    # FileTrie, TrieNode
│   ├── terminal/
│   │   ├── shell/        # Shell
│   │   ├── commads/      # ls, cd, mkdir, touch, echo, cat, cp, mv, rm, clear, find, vim (note: typo "commads")
│   │   └── utils/        # CommandRegistry
│   ├── applications/     # TerminalApp, FileManagerApp, TextEditorApp, BrowserApp
│   ├── desktop/          # Desktop, DesktopIcon, DesktopGrid, Wallpaper
│   ├── ui/
│   │   ├── windows/      # BootScreen
│   │   └── components/   # Dash
│   └── workers/          # fileSystem.worker.js, FileSystemWorker (search/autocomplete)
└── assets/               # (empty / unused in current commit)
```

## How the system works

1. `index.html` loads `main.js` as an ES module.
2. `main.js` creates `Kernel` and calls `kernel.start()`.
3. `Bootstrapper.bootSystem()` runs sequentially:
   - mounts `BootScreen`
   - initializes IndexedDB via `StorageFactory.create("indexedDB", { dbName:"JK_OS", storeName:"FileStorage" })`
   - creates `FileSystem`, restores from storage, ensures default dirs exist, sets cwd to `/Desktop`
   - registers `CommandRegistry` + `Shell`
   - initializes `WindowManager`, `AppRegistry`, `AppManager`, loads 4 apps
   - mounts `Desktop` (wallpaper, grid, dash, clock, context menu)
   - restores session, then fades out the boot screen
4. User clicks a Dock icon or desktop icon → `AppManager.openApp(appId)` → `BaseApp.createContent()` + `WindowFactory.createWindowFromContent()` → `WindowManager.addWindow(win)`.
5. Terminal input is routed through `Shell.execute(line)` → `CommandRegistry.get(cmd)` → `command._execute(args)` → calls `FileSystem` methods; output is appended to the terminal DOM.
6. Filesystem writes go through `FileRepository.save(root)` → `StorageAdapter.setItem("fs_root", serialized)`.

## Setup & installation

Prerequisites: any static HTTP server (no build step).

```bash
# install the only dependency
npm install
```

## Running locally

```bash
# serve the directory (examples)
npx serve .
# or Python
python3 -m http.server 8080
```

Then open `http://localhost:8080`. `file://` will fail on ES module imports.

## Environment variables

None — this is a pure client-side app. The only configurable values are hardcoded defaults inside the source (IndexedDB name `JK_OS`, store name `FileStorage`, default dirs, quick links, bookmarks).

## API / commands

There is no HTTP API. The only "API" is the in-browser kernel service surface:

- `kernel.register(name, instance)` / `kernel.getService(name)` / `kernel.listOfServices()`
- Shell commands (typed in Terminal): `ls`, `cd`, `mkdir`, `touch`, `echo`, `cat`, `cp`, `mv`, `rm`, `clear`, `find`, `vim`
- `fileSystem` service: `createDirectory`, `createFile`, `deleteDirectory`, `deleteFile`, `read`, `write`, `copyFile`, `moveFile`, `stat`, `getChildren`, `changeDirectory`, `searchInCurrentDirectory`, `searchInFullSystem`, `gtAutoCompleteSuggestions` (note: typo in method name)
- `appManager.openApp(id, config, windowConfig, allowMultiple)`
- `clipboard.copy(data)`, `clipboard.paste()`

## Database / storage

- **IndexedDB** (`idb` library): DB `JK_OS`, store `FileStorage` — holds the serialized filesystem root under key `fs_root`.
- **localStorage**: browser app bookmarks (`jk-browser-bookmarks`), and fallback storage adapter.
- No relational DB, no migrations, no schema versioning beyond the IndexedDB `version` field (currently `1`).

## Build / deployment

No bundler, no transpiler. Deploy by serving the directory as static assets:

```bash
npx serve . -l 3000
```

Caveat: the `BrowserApp` iframe loads external sites; sites that send `X-Frame-Options` / `frame-ancestors` CSP will show the in-app error screen instead of embedding.

## Important implementation details

- `AppManager` generates instance IDs as `` `${appId}-${Date.now()}-${random}` ``; it tracks instances in two `Map`s (`_instances`, `_appIdToInstances`).
- `WindowFactory.createWindowFromContent` generates `win-${timestamp}-${random}` ids and default geometry `600×400` at `(120+random*40, 80+random*40)`.
- `BaseApp` lifecycle hooks: `onOpen`, `onClose`, `onFocus`, `onBlur`, `destroy`.
- `FileSystem.changeDirectory('/Desktop')` is called during boot; if `Desktop` is missing it falls back to `/`.
- The `grep`, `tree`, `find` command files exist in `src/terminal/commads/` but are **not registered** in `Shell.init()`.
- `WindowManager.init(container)` must be called before `addWindow`; currently only `Desktop.mount()` does this.
- `SymbolicLinkNode` is imported nowhere and has no registered use in the filesystem.
- `FileSystemWorker` is defined but not instantiated/applied anywhere in the boot path.
- The terminal autocomplete handler in `TerminalApp` calls `fileSystem.getAutoCompleteSuggestions` (typo; actual method is `gtAutoCompleteSuggestions`), so Tab completion currently fails silently.
- `ls` command has a bug when `args.length > 1` — `childrens` is undefined in that branch.
- `BrowserApp` uses `internal://search?q=` as its search URL scheme and DuckDuckGo as a fallback search engine.

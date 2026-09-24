# Development Guide — MIN-OS

## Local setup

```bash
git clone <repo>
cd minichrome-os
npm install        # installs idb ^8.0.3
npx serve .        # or python3 -m http.server 8080
# open http://localhost:8080
```

Do **not** open `index.html` via `file://` — ES module imports require HTTP(S).

## Adding a new command

1. Create `src/terminal/commads/<name>.js` exporting a class with `_execute(args)` returning a string.
2. In `src/terminal/shell/Shell.init()`, add:
   ```js
   import <Name>Command from "../commads/<name>.js";
   this.commandRegistry.register("<name>", new <Name>Command(this.kernel));
   ```
3. Re-run.

## Adding a new app

1. Subclass `BaseApp` in `src/applications/`, implement `createContent()` returning an `HTMLElement`, optionally override `onOpen`/`onClose`/`onFocus`/`onBlur`/`destroy`.
2. In `AppManager.loadApps()`:
   ```js
   this.registry.register("my-app", MyApp, { title:"My App", icon:"★" });
   ```
3. Add a Dock icon in `src/ui/components/Dash.js` and/or a `DesktopIcon` in `DesktopGrid`.

## Adding a storage backend

Implement `StorageAdapter` (in `src/core/storage/StorageAdapter.js`) and wire it in `StorageFactory.create()`.

## Debugging

- Boot logs are printed to the BootScreen DOM during boot; after boot, check the browser console.
- `kernel.listOfServices()` shows registered services.
- IndexedDB can be inspected in DevTools → Application → IndexedDB (`JK_OS` / `FileStorage`).

## Style conventions

- CSS class prefixes per feature: `jk-terminal`, `jk-filemanager`, `jk-text-editor`, `jk-browser`.
- Tailwind utilities used inline via className alongside custom CSS.
- JS uses ES module `import/export`, `const`/`let`, no classes transpilation needed (target: modern browser).

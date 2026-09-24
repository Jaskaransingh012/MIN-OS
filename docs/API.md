# API / Services Reference — MIN-OS

In-browser service surface exposed by the kernel. There is no HTTP API; everything is accessed via `kernel.getService(name)`.

## Kernel service registry

Registered by `Bootstrapper.bootSystem()` in this order:

| Name | Class | Methods / properties |
|---|---|---|
| `storage` | `StorageAdapter` (subclass) | `init()`, `setItem(k,v)`, `getItem(k)`, `removeItem(k)`, `clear()`, `keys()`, `length()` |
| `fileSystem` | `FileSystem` | `init()`, `changeDirectory(path)`, `createDirectory(name, parent)`, `createFile(name, content, opts, parent)`, `deleteDirectory(path)`, `deleteFile(path)`, `read(path)`, `write(path, content)`, `copyFile(src, dst)`, `moveFile(src, dst)`, `stat(path)`, `getChildren(path)`, `searchInCurrentDirectory(pat)`, `searchInFullSystem(pat)`, `gtAutoCompleteSuggestions(prefix)` |
| `commandRegistry` | `CommandRegistry` | `register(name, instance)`, `get(name)`, `has(name)`, `list()`, `clear()` |
| `shell` | `Shell` | `execute(input)` → output string |
| `windowManager` | `WindowManager` | `init(container)`, `addWindow(win)`, `closeWindow(win)`, `focusWindow(win)`, `destroy()` |
| `appRegistry` | `AppRegistry` | `register(id, class, defaults)`, `get(id)`, `has(id)`, `getAllIds()` |
| `appManager` | `AppManager` | `openApp(id, config, winConfig, allowMultiple)`, `closeApp(instanceId)`, `focusApp(app)`, `getFirstInstance(id)`, `getInstances(id)`, `closeAll(id)`, `destroy()` |
| `desktop` | `Desktop` | `mount()`, `destroy()`, `updateClock()`, context menu handlers |
| `clipboard` | *(not registered in current Bootstrapper — `Clipboard` is defined but not wired in)* | `copy(data, meta)`, `paste()`, `currentItem`, `clear()` |

## Kernel

```js
const kernel = new Kernel();
await kernel.start();
kernel.register(name, instance);
const svc = kernel.getService(name);
kernel.listOfServices(); // Map
```

## FileSystem

Path rules (via `PathResolver`):
- Absolute: starts with `/` → walks from `root`
- Relative → walks from `currentFolder`
- `..` → parent, `.` → current

```js
await fs.changeDirectory('/Desktop')
await fs.createDirectory('src', parentNode)
await fs.createFile('readme.md', '# hi', {}, parentNode)
await fs.read('/Desktop/readme.md')
await fs.write('/Desktop/readme.md', 'new content')
await fs.copyFile('/a.txt', '/b.txt')
await fs.moveFile('a.txt', 'b.txt')
await fs.deleteFile('x')
await fs.deleteDirectory('empty-dir')
const children = fs.getChildren('/Desktop') // array of FileSystemNode
const info = await fs.stat('/readme.md')
```

## Shell commands

Typed in Terminal; return a string output:

| Command | Args | Behavior |
|---|---|---|
| `ls` | `[filter?]` | Lists current directory children (bug: multi-arg unsupported) |
| `cd` | `[path]` | Changes cwd |
| `mkdir` | `[name...]` | Creates dirs under cwd |
| `touch` | `[name...]` | Creates empty files under cwd |
| `echo` | `[text...]` | Echoes args joined by space |
| `cat` | `[file]` | Reads file from cwd |
| `cp` | `[src, dst]` | Copies file |
| `mv` | `[src, dst]` | Moves/renames file |
| `rm` | `[name...]` | Deletes files from cwd |
| `clear` | — | Clears terminal output DOM |
| `vim` | `[file]` | Opens inline textarea editor (Alt+W to save) |

Unregistered (files exist but not wired in): `grep`, `tree`, `find`.

## Apps

Launched via `appManager.openApp(appId)`:

| appId | Class | Default config |
|---|---|---|
| `terminal` | `TerminalApp` | `{ title:"Terminal", icon:"⌨" }` |
| `file-manager` | `FileManagerApp` | `{ title:"File Manager", icon:"💻" }` |
| `text-editor` | `TextEditorApp` | `{ title:"Text Editor", icon:"📝" }` |
| `browser` | `BrowserApp` | `{ title:"Browser", icon:"🌐" }` |

## Clipboard

Not registered in boot — instantiate manually if needed:

```js
const cb = new Clipboard();
await cb.copy('hello');
const item = await cb.paste(); // ClipboardItem | null
item.getText();
```

`ClipboardItem` holds a `Map` of MIME → value, plus `metadata` (`timeStamp`, `source`) and a `id` (crypto-random).

## Storage adapters

`StorageFactory.create(type, opts)`:
- `"indexedDB"` → `IndexedDBAdapter` (dbName, storeName, version)
- `"localStorage"` → `LocalStorageAdapter`
- `"auto"` → prefers IndexedDB, falls back to localStorage

Both implement `StorageAdapter`: `init`, `setItem`, `getItem`, `removeItem`, `clear`, `keys`, `length`.

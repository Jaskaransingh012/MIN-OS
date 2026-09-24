# Contributing — MIN-OS

## How to contribute

1. Fork the repo.
2. Create a feature branch from `main`.
3. Make changes; ensure the app still boots (`npm install` + static serve).
4. Open a PR with a clear description of the change and a screenshot/video if UI-affecting.

## Code style

- Keep JS — no new frameworks unless a strong case is made.
- Match existing patterns: `BaseApp.createContent()` returns DOM, apps live in `src/applications/`, commands in `src/terminal/commads/`.
- Fix the existing typos before adding new code (`commads`, `gtAutoCompleteSuggestions`, `FileRegistery`).

## Testing

No test suite exists. Manual smoke-test checklist:

- Boot screen completes → desktop visible
- Click terminal, type `ls`, `cd`, `mkdir`, `touch`, `cat`, `echo`, `vim`, `clear`
- Open File Manager, navigate, create files/folders
- Open Text Editor, create/save a file, reload, reopen
- Open Browser, navigate to a site, search, bookmark
- Maximize/minimize/close windows; open multiple instances

## Known rough edges

- `restoreSession()` no-op
- Terminal `innerHTML` output (XSS surface)
- `ls` multi-arg bug
- Unregistered commands (`grep`, `tree`, `find`)
- `FileSystemWorker` unused
- `SymbolicLinkNode` unused

Please fix one of these in your first PR if you're unfamiliar with the codebase.

---
name: new-changes
description: Read pending changes from docs/_New Changes/New Changes.md, clear the file, then implement everything described
disable-model-invocation: true
---

1. Read `docs/_New Changes/New Changes.md` (from repo root; if CWD is `client/` use `../docs/_New Changes/New Changes.md`).

2. If the file is empty or whitespace-only, tell the user there are no pending changes and stop.

3. Clear the file immediately so the user can queue new changes while you work.

4. /commit any existing changes to the current branch

5. Echo the changes in chat and implement everything described. Work through all items before reporting back.

---
name: get-changes
description: Read every file in docs/_get_changes/, clear that directory (and only that directory), keep an empty Get Changes.md placeholder, then implement the captured changes
disable-model-invocation: true
---

1. Read **every file inside `docs/_get_changes/`** (from repo root; if CWD is `client/` use `../docs/_get_changes/`). Do not read or touch anything outside this single directory. Concatenate the contents in directory order.

2. If the directory is empty, or its files together contain only whitespace, tell the user there are no pending changes and stop.

3. Reset the queue directory — and **only** this directory:
   - Delete every file inside `docs/_get_changes/`. Do not delete files anywhere else, even if they look related. The scope is exactly: files whose path starts with `docs/_get_changes/`. Do not recurse into other directories.
   - After deletion, re-create a single empty `docs/_get_changes/Get Changes.md` placeholder so the user can queue new changes while you work.
   Do this immediately after capturing the contents and before doing any other work.

4. /commit any existing uncommitted changes to the current branch.

5. Echo the captured changes in chat and implement everything described. Work through all items before reporting back.
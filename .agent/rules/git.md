---
trigger: always_on
---

# git.md

One job: stopping the agent from destroying work it cannot get back.

This file is not specific to Spotter. It belongs in every project.
Read secrets.md for what must never be committed. This file does not restate that.

## Never run a destructive git command

Do not run any of these. Ask the human instead.

- `git reset --hard` in any form
- `git checkout .` or `git restore .` across the working tree
- `git clean` in any form
- `git push --force` or `git push -f`, including force-with-lease
- `git rebase` on a branch that has been pushed
- `git commit --amend` on a commit that has been pushed
- `git branch -D` on any branch you did not create in this session
- `git stash drop`, `git stash clear`
- Anything that rewrites history: filter-branch, filter-repo, interactive rebase

Reason: each of these deletes work with no undo. Uncommitted changes destroyed by a hard reset are gone from the machine. Rewritten pushed history is gone for everyone who pulled it. The agent cannot see what the human has open, half-finished, or depending on that history.

## Commit often, in small pieces

Commit after each working change. One change, one commit.

Never leave a large body of uncommitted work sitting in the tree across several steps.

Reason: committed work survives a mistake. Uncommitted work does not. Small commits also make a single bad change easy to identify and revert.

## Undo by adding, not by erasing

To undo a change that is already committed, use `git revert`, which adds a new commit that reverses it.

Do not undo committed work by resetting, amending, or rewriting.

Reason: a revert is itself reversible and leaves the record intact. A reset is neither.

## Never commit on behalf of the human without saying so

State what you are committing and to which branch before you commit. Do not commit silently as a side effect of another task.

Reason: the human needs to know what entered history and when, especially if something later needs to be traced or reverted.

## Do not commit directly to the main branch

Work on a branch. Let the human merge.

If the repository has no branch for the current task, ask which branch to use rather than defaulting to main.

Reason: main is what gets deployed. A change that lands there without review is a change nobody checked.

## Never resolve a merge conflict by taking one side wholesale

Do not use `--ours` or `--theirs` to clear a conflict quickly. Read both sides, resolve the actual conflict, and say what you kept and what you dropped.

If the conflict touches a rules file, a migration, or a payment or privacy code path, stop and ask.

Reason: taking one side wholesale silently deletes the other side's work, and the loss is invisible in the diff.

## Do not change git configuration

Do not edit `.git/config`, change remotes, add hooks, or alter global git settings.

Reason: these change how every future command behaves, including the human's own.

## Do not commit generated or local files

Do not commit build output, dependency folders, local database files, editor settings, or anything already in `.gitignore`.

If something needs to be ignored and is not, propose the `.gitignore` line rather than committing the file.

Reason: generated files create noisy diffs and conflicts, and some carry local paths or state that break another machine.

## When a git command fails

Report the exact command and the exact error. Do not try a more forceful variant of the same command.

Reason: the forceful variant is usually the destructive one, and a failing git command is often git correctly refusing to lose something.
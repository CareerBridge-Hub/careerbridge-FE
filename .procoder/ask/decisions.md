## Ship Dockerfile WORKDIR fix (welcome page) to VPS?

- Commit and push to master: triggers "Publish to VPS", replaces the live welcome-page container
- Commit only: no deploy yet
- Leave uncommitted: user reviews first

**Answer (2026-11-11):** Commit and push to master.

## Commit blocked by procoder gate: how to get the Dockerfile fix shipped?

- You commit and push from your own terminal: the gate only runs on Claude's commands, the repo has no git hooks
- Claude satisfies the gate first: install hadolint, gitleaks, semgrep, add version 0.0.0 to README first screen, then commit without AI trailer and push
- Leave uncommitted for now

**Answer (2026-11-11):** User commits and pushes from own terminal.

# Up 4evr — Windows

Everything for setting up an always-on Windows machine for a creative
installation or kiosk.

## Guide — *planned*

A long-form Windows write-up (the *why* behind each setting, plus Windows-
specific gotchas: signing, SmartScreen, kiosk accounts, GPO vs registry) will
live here, mirroring the [macOS guide](../macos/README.md). The macOS guide
already covers the cross-platform concepts (keep-alive, monitoring, alerting) if
you want the reasoning now.

## Toolkit — ready to use

→ **[`toolkit/`](toolkit/)** — dependency-light scripts (PowerShell + `.bat`),
three modules: system settings (check/apply/undo), keep-alive, and
monitor/logs/alerts. See [`toolkit/README.md`](toolkit/README.md).

> Built, but **not yet validated on real Windows hardware** — see the toolkit
> README's testing checklist.

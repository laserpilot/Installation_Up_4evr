# Up 4evr — Toolkit

A small, dependency-light toolkit for setting up "always-on" computers for
creative installations. It is deliberately **not** an app. It's a folder of
plain scripts you can read, trust, and run — take only the pieces you need.

Three modules, each independent, mirrored across three platforms:

1. **System settings** — check and (optionally) apply the tweaks that keep a
   machine awake, quiet, and unattended. Every change is reversible.
2. **Keep-alive** — keep your show app running forever (relaunch on crash, quit,
   or login) using the OS's own supervisor.
3. **Monitor / logs / alerts** — log system specs on a schedule, watch that the
   app is alive and the display is connected, detect setting drift, and ping
   Slack when something's wrong.

## Platforms

| Platform | Status | Get started |
|----------|--------|-------------|
| **macOS**   | built + tested on hardware | [macos/README.md](macos/README.md) |
| **Windows** | built, needs a hardware test | [windows/README.md](windows/README.md) |
| **Linux**   | planned | — |

Each platform folder is self-contained, uses only what ships with that OS (no
installer, no runtime), and can be zipped and dropped on a target machine:

```
toolkit/
  macos/     bash + defaults/pmset/launchctl        (.command / .sh)
  windows/   PowerShell + registry/Task Scheduler   (.bat / .ps1)
  linux/     bash + gsettings/systemd               (planned)
```

There is **no CLI to learn** and nothing to install. Scripts are run directly or
double-clicked. Within each platform the three modules share the same shape:
a read-only **check**, a gated **apply** that writes an **undo**, keep-alive
**install/list/remove**, and a scheduled **monitor** that reuses the check for
drift detection.

## Design principles

- **Readable over clever.** Open any script and you can see exactly what it will
  do. No build step, no runtime, no hidden state.
- **Reversible.** Applying settings writes an undo script. Keep-alive and monitor
  agents have explicit remove commands.
- **Pick-and-choose.** Copy one folder, ignore the rest. Modules don't depend on
  each other (the monitor *optionally* calls the settings check if present).
- **OS-native.** Lean on the platform's own supervisor and built-in tools
  instead of bundling a process manager or server.

## Distribution

Zip a platform folder and drop it on the target machine — no install:

```bash
cd toolkit && zip -r up4evr-macos.zip macos
```

## Background

This toolkit replaces a ~47k-line web/Electron app that wrapped these same few
jobs in far too much machinery; that version is preserved at the git tag
`archive/v1-app`. The long-form setup knowledge it grew from lives in
[`../guide/`](../guide/).

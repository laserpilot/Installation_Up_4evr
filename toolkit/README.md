# Up 4evr — Toolkit

A small, dependency-light toolkit for setting up "always-on" computers for
creative installations. It is deliberately **not** an app. It's a folder of
plain scripts you can read, trust, and run — take only the pieces you need.

Three modules, each independent:

1. **System settings** — check and (optionally) apply the tweaks that keep a
   machine awake, quiet, and unattended. Every change is reversible.
2. **Keep-alive** — keep your show app running forever (relaunch on crash, quit,
   or login) using the OS's own supervisor.
3. **Monitor / logs / alerts** — log system specs on a schedule, watch that the
   app is alive and the display is connected, detect setting drift, and ping
   Slack when something's wrong.

> Status: **macOS is built and tested.** `windows/` and `linux/` will mirror the
> same three modules. The Windows versions follow the proven `kiosk-tools`
> pattern (`.bat` + `.ps1`).

```
toolkit/
  macos/
    1-system-settings/   check-settings.sh · apply-settings.sh · settings.conf
    2-keep-alive/        install / list / remove -keepalive.command
    3-monitor/           monitor.sh · monitor.conf · install-monitor.command
  windows/   (planned)
  linux/     (planned)
```

There is **no installer and no CLI to learn.** Scripts are run directly or
double-clicked in Finder (the `.command` files). They use only tools already on
macOS — `defaults`, `pmset`, `launchctl`, `system_profiler`, `curl` — so there
is nothing to install and bash 3.2 (the macOS system bash) is enough.

---

## macOS quick start

```bash
cd toolkit/macos
```

### 1 · System settings  (`1-system-settings/`)

```bash
./check-settings.sh         # read-only: what's set vs what an install wants
open settings.conf          # turn settings on/off (1/0) to taste
./apply-settings.sh         # applies per-category with y/N prompts; writes undo
bash undo-settings.sh       # revert everything that last apply changed
```

- `check-settings.sh` changes nothing and needs no admin. It's safe to run anytime.
- `apply-settings.sh` asks before each category and **auto-generates
  `undo-settings.sh`** recording the prior value of every setting it changes.
- The **DANGER** category (disable Gatekeeper, hide crash reporter, auto-login)
  is off by default and requires typing `DANGER` to apply. Don't enable these
  unless you understand the security trade-off.

### 2 · Keep-alive  (`2-keep-alive/`)

```bash
./install-keepalive.command /Applications/MyShow.app   # or drag the app in
./list-keepalive.command                               # what's watched + running?
./remove-keepalive.command                             # stop watching one
```

Installs a per-user `launchd` LaunchAgent that relaunches the app on crash/quit
and at login. App bundles are launched with `open -W` (see the macOS notes
below — this is required on modern macOS).

### 3 · Monitor / logs / alerts  (`3-monitor/`)

```bash
open monitor.conf                  # set APP_NAME, SLACK_WEBHOOK, thresholds
./monitor.sh --once-now            # run a single pass, print results
./monitor.sh --test-slack          # verify your webhook
./install-monitor.command 300      # run every 300s via launchd
./install-monitor.command --remove # stop
```

Logs roll daily to `~/Library/Logs/up4evr/monitor-YYYYMMDD.log`. The drift check
**reuses** `1-system-settings/check-settings.sh`, so "did any setting change?"
is answered by the same code that applied them — not a separate system.

---

## macOS notes (the 2025 reality)

These are the things that bite people setting up modern Macs for installs:

- **You can't keep a signed app alive by pointing launchd at its binary.**
  Exec'ing `MyApp.app/Contents/MacOS/MyApp` directly fails with
  `OS_REASON_CODESIGNING` on current macOS — the app must launch through
  LaunchServices. Module 2 uses `open -W <App>.app`, which launches it properly
  and blocks until it exits, so `KeepAlive` still relaunches it. (Plain,
  non-bundled executables are run directly and are fine.)
- **Apple Silicon / hardened runtime:** unsigned or ad-hoc-signed show apps may
  be blocked. Prefer a properly signed app, or knowingly use the DANGER
  Gatekeeper setting.
- **SIP (System Integrity Protection)** blocks some old tricks. The
  "hide crash reporter" setting needs SIP disabled and will silently no-op
  otherwise — the script reports it as failed rather than pretending it worked.
- **Auto-login** is blocked when FileVault is on and needs extra steps on recent
  macOS; treat it as best-effort.
- **Focus vs. Do Not Disturb:** the `doNotDisturb` default is legacy. On
  Monterey+ Focus largely supersedes it; we still set it (harmless) but for
  guaranteed silence also configure a Focus schedule in System Settings.
- **Logout/reboot:** Dock, Finder, and menu-bar changes fully take hold after a
  logout or restart.

---

## Design principles

- **Readable over clever.** Open any script in a text editor and you can see
  exactly what it will do. No build step, no runtime, no hidden state.
- **Reversible.** Applying settings writes an undo script. Keep-alive and monitor
  agents have explicit remove commands.
- **Pick-and-choose.** Copy one folder, ignore the rest. Modules don't depend on
  each other (Module 3 *optionally* calls Module 1 if it's present).
- **OS-native.** Lean on `launchd` and built-in macOS tools instead of bundling a
  process manager or server.

## Distribution

Zip a platform folder and drop it on the target machine — no install:

```bash
cd toolkit && zip -r up4evr-macos.zip macos
```

## What happened to the old app?

This toolkit replaces a ~47k-line web/Electron app that wrapped these same few
jobs in far too much machinery. That version is preserved at the git tag
`archive/v1-app` if you ever need it.

# Up 4evr — macOS Toolkit

The macOS toolkit. Same three modules as the other platforms, built on tools
already in macOS (`defaults`, `pmset`, `launchctl`, `system_profiler`, `curl`) —
no installer, no dependencies, works with the system bash (3.2). For the
long-form *why* behind these settings, see the [macOS guide](../README.md).

> Status: **built and tested end-to-end on macOS hardware.**

```
macos/toolkit/
  1-system-settings/   check-settings.sh · apply-settings.sh · settings.conf
  2-keep-alive/        install / list / remove -keepalive.command
  3-monitor/           monitor.sh · monitor.conf · install-monitor.command
```

The `.command` files are double-clickable in Finder; the `.sh` files are run
from Terminal. Open any of them — there's nothing hidden.

---

## Quick start

```bash
cd macos/toolkit
```

### 1 · System settings  (`1-system-settings/`)

```bash
./check-settings.sh         # read-only: what's set vs what an install wants
open settings.conf          # turn settings on/off (1/0) to taste
./apply-settings.sh         # applies per-category with y/N prompts; writes undo
bash undo-settings.sh       # revert everything that last apply changed
```

- `check-settings.sh` changes nothing and needs no admin. Safe anytime.
- `apply-settings.sh` asks before each category and **auto-generates
  `undo-settings.sh`** recording the prior value of every setting it changes.
- The **DANGER** category (disable Gatekeeper, hide crash reporter, auto-login)
  is off by default and requires typing `DANGER` to apply.

### 2 · Keep-alive  (`2-keep-alive/`)

```bash
./install-keepalive.command /Applications/MyShow.app   # or drag the app in
./list-keepalive.command                               # what's watched + running?
./remove-keepalive.command                             # stop watching one
```

Installs a per-user `launchd` LaunchAgent that relaunches the app on crash/quit
and at login.

### 3 · Monitor / logs / alerts  (`3-monitor/`)

```bash
open monitor.conf                  # set APP_NAME, SLACK_WEBHOOK, thresholds
./monitor.sh --once-now            # run a single pass, print results
./monitor.sh --test-slack          # verify your webhook
./install-monitor.command 300      # run every 300s via launchd
./install-monitor.command --remove # stop
```

Logs roll daily to `~/Library/Logs/up4evr/monitor-YYYYMMDD.log`. Drift detection
**reuses** `1-system-settings/check-settings.sh`.

---

## macOS notes (the 2025 reality)

The things that bite people setting up modern Macs for installs:

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

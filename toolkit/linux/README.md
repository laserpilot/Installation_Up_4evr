# Up 4evr — Linux (Ubuntu / GNOME)

The Linux half of the toolkit. Same three modules as macOS/Windows, built on
tools already on an Ubuntu GNOME desktop (`gsettings`, `systemctl`,
`system_profiler` equivalents like `xrandr`/`free`) — no installer, no
dependencies.

> ⚠️ **Status: written, not yet tested on real Linux hardware.** The table-driven
> settings engine was exercised on another machine (it loaded, parsed, matched,
> and `gsettings` reads returned correct values), but the `systemctl`/GDM/systemd
> pieces and the keep-alive/monitor units need one validation pass on an actual
> Ubuntu box. See "Testing checklist" below.
>
> Targets **Ubuntu 22.04+ with GNOME** (the stated assumption). `gsettings`
> works under both X11 and Wayland. Display detection in the monitor uses
> `xrandr` (X11); under pure Wayland it degrades gracefully.

```
linux/
  1-system-settings/   check-settings.sh · apply-settings.sh · settings.conf
  2-keep-alive/        install / list / remove -keepalive.sh
  3-monitor/           monitor.sh · monitor.conf · install-monitor.sh
```

Run these from a terminal **inside your GNOME session** (gsettings and GUI
keep-alive need the session's DBus/display).

---

## Quick start

```bash
cd toolkit/linux
```

### 1 · System settings  (`1-system-settings/`)

```bash
./check-settings.sh         # read-only: what's set vs what an install wants
nano settings.conf          # turn settings on/off (1/0)
./apply-settings.sh         # per-category y/N prompts; writes undo-settings.sh
bash undo-settings.sh       # revert what the last apply changed
```

User-session settings (`gsettings`) need no root; system ones (`systemctl` masks,
apport, unattended-upgrades) prompt for sudo once. Covers screen-blank/dim,
auto-suspend (AC + battery), screen lock/screensaver, masking systemd sleep
targets, notification banners, crash reporter, automatic apt updates, and (off
by default) **DANGER** GDM auto-login.

### 2 · Keep-alive  (`2-keep-alive/`)

```bash
./install-keepalive.sh /path/to/MyShow           # or "chromium --kiosk http://…"
./list-keepalive.sh                              # what's watched + active?
./remove-keepalive.sh                            # stop watching one
```

Uses a **systemd user service** with `Restart=always`, tied to
`graphical-session.target`, as the native supervisor — starts at login,
relaunches on exit.

### 3 · Monitor / logs / alerts  (`3-monitor/`)

```bash
nano monitor.conf                  # APP_NAME, SLACK_WEBHOOK, thresholds
./monitor.sh --once-now            # one pass, printed
./monitor.sh --test-slack          # verify webhook
./install-monitor.sh 300           # systemd user timer, every 300s
./install-monitor.sh --remove      # stop
```

Logs roll daily to `~/.local/state/up4evr/monitor-YYYYMMDD.log`. Drift detection
**reuses** `1-system-settings/check-settings.sh`.

---

## Linux notes

- **GNOME assumption.** The settings use GNOME's `gsettings` schemas and GDM for
  auto-login. On other desktops (KDE, etc.) the settings keys differ — the
  keep-alive and monitor modules are desktop-agnostic, but Module 1 would need a
  different table.
- **Wayland vs X11.** `gsettings` covers both. `xrandr` display detection in the
  monitor only works under X11; under Wayland that check is skipped (everything
  else still runs).
- **User services need a session.** GUI keep-alive runs in the graphical session,
  so the machine must reach the desktop (pair with auto-login for a true kiosk).
  For headless/long-running non-GUI processes, consider `loginctl enable-linger`.

## Testing checklist (first real-hardware pass)

1. `./check-settings.sh` runs with no bash errors and reports sane current
   values for the `gsettings` and `systemctl` items.
2. `./apply-settings.sh` applies power + ui; confirm in Settings; run
   `bash undo-settings.sh`; re-check returns to baseline.
3. `./install-keepalive.sh` on e.g. `gnome-calculator`; `pkill` it; within a few
   seconds systemd relaunches it; `list` shows active; `remove` cleans up.
4. `./monitor.sh --once-now` prints sane CPU/mem/disk and logs; `--test-slack`
   posts; `./install-monitor.sh 60` creates a working timer
   (`systemctl --user list-timers`).

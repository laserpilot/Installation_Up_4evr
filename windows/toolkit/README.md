# Up 4evr — Windows

The Windows half of the toolkit. Same three modules as macOS, built on tools
already in Windows (PowerShell, `powercfg`, the registry, Task Scheduler) — no
installer, no dependencies. Modeled on the proven `kiosk-tools` approach.

> ⚠️ **Status: written, not yet tested on real Windows hardware.** The macOS
> side was verified end-to-end on a Mac; this side was built from the harvested
> `kiosk-tools` commands and needs one validation pass on a Windows 10/11 box
> before production use. See "Testing checklist" below.

```
windows/toolkit/
  1-system-settings/   check-settings.bat · apply-settings.bat · settings.conf
  2-keep-alive/         install / list / remove -keepalive.bat
  3-monitor/            monitor.bat · install-monitor.bat · remove-monitor.bat · monitor.conf
```

Each folder has `.bat` files you **double-click** (Windows won't run `.ps1` by
double-click for security, so the `.bat` launchers call PowerShell for you).
The heavy lifting lives in the `.ps1` files next to them, which you can open and
read.

---

## Quick start

### 1 · System settings  (`1-system-settings\`)

- **`check-settings.bat`** — read-only. Shows each setting as `[OK]` or `[!!]`.
  No admin needed. Safe anytime.
- Edit **`settings.conf`** — `1`/`0` per setting.
- **`apply-settings.bat`** — right-click → *Run as administrator* (or just
  double-click; it will ask to elevate). Prompts per category, and writes
  **`undo-settings.ps1`** recording the prior value of everything it changes.
- Revert: `powershell -ExecutionPolicy Bypass -File undo-settings.ps1` as admin.

Covers power/sleep, screensaver, notifications, Cortana, Copilot, widgets,
accessibility key prompts, touch gestures/feedback, Windows Update, an optional
weekly reboot, and (off by default) taskbar auto-hide, Windows-key disable,
OneDrive, and the DANGER auto-logon (which requires typing `DANGER`).

### 2 · Keep-alive  (`2-keep-alive\`)

- **`install-keepalive.bat`** — asks for your app's `.exe`, registers a Task
  Scheduler task that relaunches it at logon and every minute if it died.
- **`list-keepalive.bat`** — what's watched and whether it's running.
- **`remove-keepalive.bat`** — stop watching one.

Windows has no `launchd KeepAlive` equivalent for GUI apps, so Task Scheduler is
the supervisor: a 1-minute watchdog in your interactive session.

### 3 · Monitor / logs / alerts  (`3-monitor\`)

- Edit **`monitor.conf`** (APP_NAME, SLACK_WEBHOOK, thresholds).
- **`monitor.bat`** — one pass now. `monitor.bat -TestSlack` to test the webhook.
- **`install-monitor.bat`** — schedule it (default every 5 min).
- **`remove-monitor.bat`** — stop.

Logs roll daily to `%ProgramData%\up4evr\monitor-YYYYMMDD.log`. Drift detection
**reuses** `1-system-settings\check-settings.ps1`, same as macOS.

---

## Windows notes

- **Auto-logon** stores the password in cleartext in the registry — that's why
  it's in the DANGER zone. Prefer a dedicated low-privilege kiosk account.
- **Taskbar auto-hide** and **Windows-key disable** restart Explorer / need
  sign-out to fully take effect and can hinder on-site maintenance, so both are
  **off by default**.
- **OneDrive**: the toggle disables sync + startup (reversible). A full
  uninstall is left to you (`%SystemRoot%\SysWOW64\OneDriveSetup.exe /uninstall`).
- Registry changes under `HKCU` are per-user; run as the account the install
  actually runs under.

## Testing checklist (first real-hardware pass)

1. `check-settings.bat` runs and reports sane current values (no PowerShell
   parse errors).
2. `apply-settings.bat` applies a couple of non-danger categories; confirm in
   Settings/registry; run the generated `undo-settings.ps1`; re-check returns to
   baseline.
3. `install-keepalive.bat` on Notepad; kill Notepad; within ~1 min it returns;
   `list` shows it; `remove` cleans up the task (check Task Scheduler).
4. `monitor.bat` prints sane CPU/disk/mem and logs; `-TestSlack` posts;
   `install-monitor.bat` schedules and fires.

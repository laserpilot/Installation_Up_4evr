# Claude Context for Installation Up 4evr

## What this project is now
A **dependency-light, modular toolkit** for setting up always-on computers for
creative installations (kiosks, exhibits, unattended machines). It replaces an
earlier ~47k-line web/Electron app that had become over-engineered — that
version is preserved at the git tag `archive/v1-app`.

The philosophy (modeled on a proven Windows `kiosk-tools` reference): plain,
readable, reversible scripts using only each OS's built-in tooling — **no
installer, no runtime, no dependencies**. A user can open any script and see
exactly what it does. Take only the pieces you need.

## Repo layout
- `guide/` — the long-form knowledge base (the "tips" README + a WIP updated
  version + original example scripts + screenshots). This is reference material;
  `guide/README-Updated.md` is the user's in-progress comprehensive rewrite.
- `toolkit/` — the automation. One folder per platform, each self-contained.
- `README.md` — high-level entry point linking guide + toolkit.

## The toolkit: three modules per platform
1. **1-system-settings** — read-only `check` + gated `apply` that auto-generates
   an `undo`. Settings enabled/disabled via a `settings.conf`. A "danger zone"
   (Gatekeeper/SIP/auto-login) is off by default.
2. **2-keep-alive** — keep an app running via the OS-native supervisor, with
   install/list/remove. macOS: `launchd` + `open -W`. Windows: Task Scheduler
   watchdog.
3. **3-monitor** — scheduled specs logging + app/display checks + Slack alerts.
   Reuses Module 1's check (`--drift` / `-Drift`) for settings-drift detection.

## Platform status
- **macOS** (`toolkit/macos/`, bash + defaults/pmset/launchctl): **built and
  verified on hardware.** Must stay bash-3.2 compatible (no associative arrays).
- **Windows** (`toolkit/windows/`, PowerShell + registry/Task Scheduler): built,
  **NOT yet tested on real hardware** — see `toolkit/windows/README.md`
  checklist. `.bat` launchers wrap `.ps1` (Windows won't run `.ps1` on
  double-click). Targets Windows PowerShell 5.1 (no ternary; `try/catch` is a
  statement, use the `Get-Cur` helper).
- **Linux/Ubuntu**: planned (bash + gsettings/systemd).

## Key conventions
- Each module's logic is data-driven from a single settings table shared by
  check + apply, so there's one source of truth (macOS: `settings-table.sh`;
  Windows: `settings-table.ps1`).
- Verify changes on real hardware before claiming done. macOS can be tested
  locally; Windows/Linux need their own machines.
- Branch: `toolkit`. Old app archived at tag `archive/v1-app`.

## Reference
- The Windows toolkit patterns were harvested from a `kiosk-tools` project
  (setup-kiosk-pc.bat / audit-kiosk.ps1) — registry writes, undo generation,
  scheduled tasks. BgInfo was intentionally omitted.

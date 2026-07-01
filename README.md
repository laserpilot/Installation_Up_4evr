# Installation Up 4evr

Everything you need to set up a computer to run **unattended, forever** — the
kind of always-on machine that drives a creative installation, kiosk, or
exhibit. Keep it awake, keep the show app running, keep the noise off the
screen, and get told when something breaks.

## Organized by operating system

Pick your platform. Each folder holds both **the guide** (the long-form *how* and
*why*) and **the toolkit** (dependency-light scripts that actually do it).

| Platform | Guide | Toolkit status |
|----------|-------|----------------|
| 🍎 [`macos/`](macos/)     | full write-up (Apple Silicon, SIP, code-signing) | built + **tested on hardware** |
| 🪟 [`windows/`](windows/) | stub (planned)  | built, needs a hardware test |
| 🐧 [`linux/`](linux/)     | stub (planned)  | built (Ubuntu/GNOME), needs a hardware test |

```
macos/
  README.md            the guide — every setting worth changing, and why
  README-Updated.md    work-in-progress comprehensive refresh
  ScriptExamples/      original example scripts
  images/              screenshots for the guide
  toolkit/
    README.md          how to run the scripts
    1-system-settings/ · 2-keep-alive/ · 3-monitor/
windows/  (same shape — guide stub + toolkit/)
linux/    (same shape — guide stub + toolkit/)
```

## The toolkit — three modules per platform

Not an app. A folder of plain scripts you can **read, trust, and run** — take
only the pieces you need. Each platform uses only what ships with that OS (no
installer, no runtime), with the same three modules and the same shape:

1. **1-system-settings** — a read-only **check**, then a gated **apply** that
   auto-writes an **undo**. Toggle settings in `settings.conf`; a "danger zone"
   is off by default.
2. **2-keep-alive** — keep your show app running via the OS-native supervisor
   (macOS `launchd`, Windows Task Scheduler, Linux `systemd`), with
   install/list/remove.
3. **3-monitor** — scheduled specs logging + app/display checks + Slack alerts,
   reusing Module 1's check for settings-drift detection.

### Design principles

- **Readable over clever.** Open any script and see exactly what it does. No
  build step, no runtime, no hidden state.
- **Reversible.** Applying settings writes an undo script; agents have explicit
  remove commands.
- **Pick-and-choose.** Copy one folder, ignore the rest. Modules don't depend on
  each other (the monitor *optionally* calls the settings check if present).
- **OS-native.** Lean on the platform's own supervisor and built-in tools rather
  than bundling a process manager or server.

## Which do I want?

- **"Just set this machine up for me."** → your platform's `toolkit/`, run the
  three modules in order.
- **"I want to understand what to change and why."** → your platform's guide
  (`README.md`).

## Distribution

Zip a platform's `toolkit/` and drop it on the target machine — no install:

```bash
cd macos && zip -r up4evr-macos-toolkit.zip toolkit
```

---

*This is a ground-up rework of an earlier ~47k-line web/Electron tool, distilled
into these scripts. The old app is preserved at the git tag `archive/v1-app`.*

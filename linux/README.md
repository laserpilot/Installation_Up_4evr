# Up 4evr — Linux (Ubuntu / GNOME)

Everything for setting up an always-on Linux machine for a creative installation
or kiosk.

## Guide — *planned*

A long-form Linux write-up (the *why* behind each setting, plus Linux-specific
notes: Wayland vs X11, GDM/kiosk sessions, `systemd` supervision) will live here,
mirroring the [macOS guide](../macos/README.md). The macOS guide already covers
the cross-platform concepts (keep-alive, monitoring, alerting) if you want the
reasoning now.

## Toolkit — ready to use

→ **[`toolkit/`](toolkit/)** — dependency-light scripts (bash + `gsettings` /
`systemctl` / `systemd`), three modules: system settings (check/apply/undo),
keep-alive, and monitor/logs/alerts. See [`toolkit/README.md`](toolkit/README.md).

> Built, but **not yet validated on real Linux hardware** — see the toolkit
> README's testing checklist.

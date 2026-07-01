# Installation Up 4evr

Everything you need to set up a computer to run **unattended, forever** — the
kind of always-on machine that drives a creative installation, kiosk, or
exhibit. Keep it awake, keep the show app running, keep the noise off the
screen, and get told when something breaks.

This repo has two halves:

## 📖 [`guide/`](guide/) — the knowledge

The long-form write-up of *how* and *why*: every system setting worth changing,
how to keep an app alive, how to log status and send alerts, and the modern-OS
gotchas (Apple Silicon, SIP, code-signing). Start here if you want to understand
the problem or do it by hand.

- [`guide/README.md`](guide/README.md) — the original, battle-tested tips guide
- [`guide/README-Updated.md`](guide/README-Updated.md) — work-in-progress
  comprehensive refresh
- [`guide/ScriptExamples/`](guide/ScriptExamples/) — the original example scripts

## 🧰 [`toolkit/`](toolkit/) — the automation

A small, dependency-light set of scripts that *do* the things the guide
describes. Not an app — a folder of readable, reversible, pick-and-choose
scripts, one set per platform. Three modules: **system settings**,
**keep-alive**, and **monitor/logs/alerts**.

- [`toolkit/README.md`](toolkit/README.md) — toolkit overview + design
- [`toolkit/macos/`](toolkit/macos/) — macOS (built + tested)
- [`toolkit/windows/`](toolkit/windows/) — Windows (built, needs a hardware test)
- [`toolkit/linux/`](toolkit/linux/) — Linux/Ubuntu GNOME (built, needs a hardware test)

## Which do I want?

- **"Just set this machine up for me."** → `toolkit/`, pick your platform, run
  the three modules in order.
- **"I want to understand what to change and why."** → `guide/`.

---

<p align="center">
  <a href="https://exavitech.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/exavitech-logo-dark.svg">
      <img alt="Exavitech" src="assets/exavitech-logo.svg" width="420">
    </picture>
  </a>
</p>

<h1 align="center">Dev HUD for Claude Code</h1>

<p align="center">
  See what Claude Code is doing, where it is running, and how much of your usage limit is left, all at a glance.<br>
  By <a href="https://exavitech.com">Exavitech</a> · MIT License
</p>

---

## What you get

### 1. Two-line status line

```
Opus 5.5 │ ctx ▓▓▓░░░░░ 38% │ 5h 23% ⟳1h52m │ wk 61% ⟳3d4h │ $1.84
deploy@web-01 203.0.113.10 │ 📁 ~/sites/shop │ ⎇ main ±3 │ +120/-8 │ effort high │ cache 97%
```

| Segment | Meaning |
|---|---|
| `ctx` | Context window used |
| `5h` / `wk` | 5-hour and weekly usage limits, with time until reset (`⟳`) |
| `$` | Session cost |
| `user@host ip` | Which server you are on. **Turns red** when the hostname contains `prod`, `production` or `live` |
| `📁` | Current folder (and project folder if different) |
| `⎇` | Git branch: `±N` changed files, `✓` clean |
| `+A/-D` | Lines added and removed this session |

Percentages are green below 70%, yellow from 70% and red from 90%.

### 2. Dev HUD side pane (Claude Code mod)

```
Subagents (1)
  ● Explore  running  Find auth handlers

Tool calls 42 total · 1 failed
▶ Bash 12s npm test
✓ Edit [Explore] 0s ~/site/app.cfm
✗ Bash 3s git push
```

- Live tool calls: running (▶), done (✓), failed (✗) or blocked (⊘), with duration and target
- Running subagents, and which subagent made each call
- A one-time toast when your 5-hour or weekly limit passes 90%
- Open it any time with **`/hud`**

## Requirements

- Claude Code **2.1.316 or later**, with a Claude subscription (the usage-limit figures appear only on subscription plans)
- Node.js (for the status line)
- git (optional; enables the branch segment)
- Linux or macOS

## Install

**Everything (status line + side pane):**

```bash
git clone https://github.com/exavitech/claude-dev-hud.git ~/claude-dev-hud
bash ~/claude-dev-hud/install.sh
```

Keep the cloned folder: the side pane is loaded from it. Start a new `claude` session afterwards.

**Side pane only**, at the Claude Code prompt:

```
/plugin install dev-hud --marketplace exavitech/claude-dev-hud
```

From a shell: `claude plugin install dev-hud --marketplace exavitech/claude-dev-hud`

## Update

```bash
git -C ~/claude-dev-hud pull && bash ~/claude-dev-hud/install.sh
```

## Uninstall

```bash
bash ~/claude-dev-hud/uninstall.sh
```

This removes the side pane, the status line entry (your `settings.json` is backed up first) and the status line script.

## Privacy

Everything runs locally. The status line reads the JSON Claude Code passes it, plus your hostname, local IP and git status. Nothing is sent anywhere. Set `STATUSLINE_DEBUG=1` to save the last status line input to `~/.claude/statusline-last.json` for troubleshooting.

## License

[MIT](LICENSE) © [Exavitech](https://exavitech.com)

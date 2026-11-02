#!/usr/bin/env bash
# Exavitech Dev HUD for Claude Code (https://exavitech.com) - MIT License
# Removes the status line and the dev-hud mod for the current user.
set -uo pipefail
CL="$HOME/.claude"
echo "Exavitech Dev HUD for Claude Code - uninstaller"

claude plugin uninstall dev-hud@exavitech >/dev/null 2>&1 && echo "✓ dev-hud uninstalled" || echo "· dev-hud was not installed"
claude plugin marketplace remove exavitech >/dev/null 2>&1 && echo "✓ exavitech marketplace removed" || true

S="$CL/settings.json"
if [ -f "$S" ] && command -v node >/dev/null; then
  cp "$S" "$S.bak.$(date +%Y%m%d%H%M%S)"
  node -e '
    const fs = require("fs"), p = process.argv[1];
    const s = JSON.parse(fs.readFileSync(p, "utf8"));
    if (s.statusLine && String(s.statusLine.command || "").includes("statusline.js")) {
      delete s.statusLine; console.log("✓ statusLine removed from settings.json");
    } else console.log("· statusLine left as is (not ours)");
    fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
  ' "$S"
fi
rm -f "$CL/statusline.js" "$CL/statusline-last.json" && echo "✓ status line script removed"
echo "Done. Start a new claude session."

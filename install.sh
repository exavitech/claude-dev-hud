#!/usr/bin/env bash
# Exavitech Dev HUD for Claude Code (https://exavitech.com) - MIT License
# Installs the status line + Dev HUD mod for the current user.
# Usage: bash install.sh     (re-run safely to update)
set -euo pipefail
echo "Exavitech Dev HUD for Claude Code - installer"
KIT="$(cd "$(dirname "$0")" && pwd)"
CL="$HOME/.claude"

command -v node   >/dev/null || { echo "node is required (apt install nodejs)"; exit 1; }
command -v claude >/dev/null || { echo "claude CLI not found"; exit 1; }
command -v git    >/dev/null || echo "note: git not found; the git segment will be hidden"
mkdir -p "$CL"

# 1. Status line script
install -m 755 "$KIT/statusline.js" "$CL/statusline.js"
echo "✓ status line script -> $CL/statusline.js"

# 2. statusLine entry in settings.json (backup first, keep all other keys)
S="$CL/settings.json"
[ -f "$S" ] && cp "$S" "$S.bak.$(date +%Y%m%d%H%M%S)" || echo '{}' > "$S"
node -e '
  const fs = require("fs"), p = process.argv[1];
  const s = JSON.parse(fs.readFileSync(p, "utf8") || "{}");
  s.statusLine = { type: "command", command: "node " + process.argv[2], padding: 0 };
  fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
' "$S" "$CL/statusline.js"
echo "✓ statusLine set in $S"

# 3. Dev HUD mod: this folder becomes a local marketplace, mod installed at user scope
claude plugin marketplace add "$KIT" >/dev/null 2>&1 || claude plugin marketplace update exavitech >/dev/null 2>&1 || true
claude plugin install dev-hud@exavitech --scope user
echo "✓ dev-hud installed. Start a new claude session; open the pane with /hud"

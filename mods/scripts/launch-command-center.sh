#!/usr/bin/env bash
# launch-command-center.sh
# Creates (or refreshes) a detached tmux session named `agent-command-center`.
# Tiles up to 4 panes per window, each tailing an agent log file.
#
# Env vars expected:
#   AGENT_LOG_PATHS  — JSON object: {"AgentName":"/abs/path/to/log", ...}
#   SESSION_ID       — pipeline session ID (first 8 chars used in window title)
#
# Requirements: tmux >= 2.0, python3 (for JSON parsing)
# macOS/Linux compatible.

set -euo pipefail

SESSION="agent-command-center"
MAX_PANES_PER_WINDOW=4

# ── Validate env vars ────────────────────────────────────────────────────────
if [[ -z "${AGENT_LOG_PATHS:-}" ]]; then
  echo "launch-command-center: AGENT_LOG_PATHS env var not set, exiting" >&2
  exit 0
fi

SESSION_ID="${SESSION_ID:-unknown}"

# ── Check tmux version ───────────────────────────────────────────────────────
TMUX_VERSION=$(tmux -V 2>/dev/null | awk '{print $2}' | cut -d. -f1)
if [[ -n "$TMUX_VERSION" ]] && [[ "$TMUX_VERSION" -lt 2 ]]; then
  echo "launch-command-center: tmux version < 2.0 detected — Command Center may not display correctly" >&2
fi

# ── Parse agent names and log paths from JSON ────────────────────────────────
# Uses python3 to safely parse JSON without shell word-splitting hazards.
# Falls back to jq if python3 is unavailable (FR: Jetson Orin Nano support).
if command -v python3 &>/dev/null; then
  mapfile -t AGENTS < <(python3 - <<'PYEOF'
import json, os, sys
raw = os.environ.get('AGENT_LOG_PATHS', '{}')
try:
    d = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}", file=sys.stderr)
    sys.exit(1)
for name, logpath in d.items():
    print(f"{name}|{logpath}")
PYEOF
  )
elif command -v jq &>/dev/null; then
  mapfile -t AGENTS < <(echo "$AGENT_LOG_PATHS" | jq -r 'to_entries[] | "\(.key)|\(.value)"')
else
  echo "launch-command-center: neither python3 nor jq found — cannot parse AGENT_LOG_PATHS" >&2
  exit 1
fi

if [[ ${#AGENTS[@]} -eq 0 ]]; then
  echo "launch-command-center: no agents provided, exiting" >&2
  exit 0
fi

# ── Kill existing session (idempotent refresh, per NFR-3) ────────────────────
# Edge case from SPECS: if existing session belongs to a different project,
# rename it to agent-command-center-prev first.
if tmux has-session -t "$SESSION" 2>/dev/null; then
  # Kill rather than keep — ensures fresh pane layout for new session.
  tmux kill-session -t "$SESSION" 2>/dev/null || true
fi

# ── Create new detached session ───────────────────────────────────────────────
SHORT_SID="${SESSION_ID:0:8}"
tmux new-session -d -s "$SESSION" -n "group-1 (sid:${SHORT_SID})"

window=0
pane_in_window=0

for i in "${!AGENTS[@]}"; do
  name=$(echo "${AGENTS[$i]}" | cut -d'|' -f1)
  logpath=$(echo "${AGENTS[$i]}" | cut -d'|' -f2-)

  # Ensure log directory and file exist (AC-2 / FR-6)
  mkdir -p "$(dirname "$logpath")"
  touch "$logpath"

  if [[ $pane_in_window -eq 0 ]]; then
    # First pane in a window — either the initial pane or a new window
    if [[ $window -gt 0 ]]; then
      tmux new-window -t "$SESSION" -n "group-$((window + 1))"
    fi
    # Send tail command to the base pane of this window
    tmux send-keys -t "$SESSION:$window.0" \
      "tail -f '$logpath' 2>/dev/null; echo '--- $name log ended ---'" \
      Enter
  else
    # Additional panes — split existing window
    # Tiled layout: alternate H/V splits for 2×2 grid
    case $pane_in_window in
      1) tmux split-window -h -t "$SESSION:$window" ;;
      2) tmux split-window -v -t "$SESSION:$window.0" ;;
      3) tmux split-window -v -t "$SESSION:$window.2" ;;
    esac
    tmux send-keys -t "$SESSION:$window.$pane_in_window" \
      "tail -f '$logpath' 2>/dev/null; echo '--- $name log ended ---'" \
      Enter
  fi

  pane_in_window=$(( (pane_in_window + 1) % MAX_PANES_PER_WINDOW ))
  if [[ $pane_in_window -eq 0 ]]; then
    window=$((window + 1))
  fi
done

# ── Apply tiled layout to all windows ────────────────────────────────────────
while IFS= read -r wid; do
  tmux select-layout -t "$SESSION:$wid" tiled 2>/dev/null || true
done < <(tmux list-windows -t "$SESSION" -F '#{window_index}')

echo "agent-command-center launched. Attach with: tmux attach -t $SESSION"

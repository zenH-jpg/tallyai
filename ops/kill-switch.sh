#!/bin/bash
# ============================================================
# OpenClaw Kill Switch — Emergency Process Termination
# ============================================================
# What it does:
#   1. Kills ALL OpenClaw processes immediately (SIGKILL)
#   2. Removes lock files so restart is clean
#   3. Logs the event with timestamp
#   4. Optionally: network-block the VM (if run from host)
#
# Usage:
#   Inside VM:  bash kill-switch.sh
#   From host:  limactl shell openclaw bash -s < ops/kill-switch.sh
#
# Exit codes:
#   0 = processes found and killed
#   1 = no OpenClaw processes running
# ============================================================
set -euo pipefail

LOG_FILE="${HOME}/openclaw-kill-switch-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== OpenClaw Kill Switch activated ==="

# Step 1: Find all OpenClaw processes
PIDS=$(pgrep -f 'openclaw' 2>/dev/null || true)

if [ -z "$PIDS" ]; then
  log "No OpenClaw processes found. Nothing to kill."
  exit 1
fi

log "Found OpenClaw PIDs: $(echo "$PIDS" | tr '\n' ' ')"

# Step 2: SIGKILL immediately (no SIGTERM — the agent may ignore or exploit it)
log "Sending SIGKILL..."
kill -9 $PIDS 2>/dev/null || true

# Step 3: Verify all dead
sleep 1
REMAINING=$(pgrep -f 'openclaw' 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
  log "WARNING: Processes still running: $(echo "$REMAINING" | tr '\n' ' ')"
  log "Sending second SIGKILL wave..."
  kill -9 $REMAINING 2>/dev/null || true
  sleep 1
  STILL_ALIVE=$(pgrep -f 'openclaw' 2>/dev/null || true)
  if [ -n "$STILL_ALIVE" ]; then
    log "FATAL: Cannot kill: $(echo "$STILL_ALIVE" | tr '\n' ' ')"
    exit 2
  fi
fi

# Step 4: Clean lock files
log "Cleaning lock files..."
rm -f /tmp/openclaw*.lock /tmp/.openclaw* /var/tmp/openclaw*.lock 2>/dev/null || true

log "=== Kill switch complete ==="
exit 0

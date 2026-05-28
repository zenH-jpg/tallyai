# OpenClaw Deployment Checklist

> ⚠️ **Do NOT skip any step.** Each check prevents a real attack vector.
> Based on: HEAL Security audit, Cyera Claw Chain disclosure, DefectDojo hardening guide.

## Phase 0: Prerequisites

- [ ] Lima VM installed (`brew install lima`)
- [ ] OpenClaw ≥ v2026.4.22 downloaded (Claw Chain patch)
- [ ] ClawWall plugin available
- [ ] Clawnitor plugin available
- [ ] ClawGuard available
- [ ] Dedicated API key (never reuse personal keys)
- [ ] Test environment ready (no production access)

## Phase 1: VM Isolation

- [ ] Create VM: `limactl start ops/lima-vm-config.yaml`
- [ ] Verify: `limactl list` shows `openclaw` running
- [ ] Verify SSH: `limactl shell openclaw uname -a`
- [ ] Verify network isolation: VM can't reach host LAN
- [ ] Set resource limits: 4GB RAM, 2 CPUs

## Phase 2: OpenClaw Installation (Inside VM)

- [ ] Install OpenClaw
- [ ] Verify version ≥ v2026.4.22: `openclaw version`
- [ ] Configure Gateway → bind to 127.0.0.1 only
- [ ] Enable token authentication
- [ ] Set config file permissions: `chmod 600`
- [ ] Enable sandbox: `mode: all`
- [ ] Harden sysctl (included in Lima config)

## Phase 3: Install Monitoring Tools

- [ ] Install ClawWall: `openclaw plugins install @clawwall/plugin`
- [ ] Apply policy: copy `ops/clawwall-config.yaml`
- [ ] Test ClawWall: trigger a blocked action → verify rejection
- [ ] Install Clawnitor: `openclaw plugins install @clawnitor/plugin`
- [ ] Configure Clawnitor: `before_tool_call` hooks for exec/gateway/cron/config
- [ ] Install ClawGuard: `npm install -g @jaydenbeard/clawguard`
- [ ] Start ClawGuard: verify WebSocket connection
- [ ] Set up alert webhook (Telegram or Slack)

## Phase 4: Test Kill Switch

- [ ] Run: `limactl shell openclaw bash -s < ops/kill-switch.sh`
- [ ] Verify: returns exit 1 (no processes = clean state)
- [ ] Start OpenClaw inside VM
- [ ] Run kill switch again
- [ ] Verify: exit 0, processes killed, lock files cleaned

## Phase 5: Controlled Test

- [ ] Give OpenClaw a simple test task (e.g., "read a file in /tmp")
- [ ] Verify task completes correctly
- [ ] Give a blocked task (e.g., "edit /etc/hosts")
- [ ] Verify ClawWall blocks it with proper log
- [ ] Verify Clawnitor logs the interception
- [ ] Verify kill switch works during active task

## Phase 6: Connect Limited API Access

- [ ] Create API key with MINIMAL permissions
- [ ] Set daily budget: $0.50
- [ ] Set token limit: 500K/day
- [ ] Connect to Gumroad (read-only initially)
- [ ] Monitor 24h before expanding access

## Phase 7: Escalation Rules

- [ ] If ClawWall logs >3 blocked actions/day → pause and review
- [ ] If cost exceeds daily budget by 10% → automatic kill-switch
- [ ] Weekly log review (every Monday)
- [ ] Monthly config review

---

**Security Contact:** If you detect an active breach, run kill-switch.sh immediately.

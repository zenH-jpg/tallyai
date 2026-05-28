# TallyAI Operations

Layer 2 preparation scripts for OpenClaw autonomous agent deployment.

## Contents

| File | Purpose | Status |
|------|---------|--------|
| `lima-vm-config.yaml` | Lima VM config for isolated OpenClaw runtime | Ready |
| `kill-switch.sh` | Emergency stop — kills all OpenClaw processes | Ready |
| `clawwall-config.yaml` | ClawWall policy firewall rules | Ready |
| `deploy-checklist.md` | Step-by-step deployment checklist | Draft |

## Prerequisites

- Lima VM installed (`brew install lima`)
- OpenClaw ≥ v2026.4.22 (Claw Chain patch)
- ClawWall + Clawnitor + ClawGuard installed inside VM

## Deployment Flow

1. Create VM → `limactl start ops/lima-vm-config.yaml`
2. SSH in → `limactl shell openclaw`
3. Install OpenClaw + monitoring tools inside VM
4. Apply ClawWall config
5. Run kill-switch test → `ssh ... 'bash -s' < ops/kill-switch.sh`

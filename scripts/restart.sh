#!/usr/bin/env bash
set -euo pipefail
pidfile=tmp/verify_results/server.pid
if [ -f "$pidfile" ]; then
  kill $(cat "$pidfile") || true
  rm -f "$pidfile"
fi
./scripts/start.sh

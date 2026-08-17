#!/usr/bin/env bash
set -euo pipefail
export DOTENV_CONFIG_PATH=.env
if [ -z "${JWT_SECRET:-}" ] || [ -z "${DEFAULT_ADMIN_PASSWORD:-}" ] || [ -z "${DEFAULT_MANAGER_PASSWORD:-}" ]; then
  echo "Missing required envs: JWT_SECRET and default passwords must be set" >&2
  exit 1
fi
nohup node dist/server.cjs > tmp/verify_results/server.log 2>&1 &
echo $! > tmp/verify_results/server.pid

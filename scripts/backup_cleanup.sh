#!/usr/bin/env bash
set -euo pipefail
DATA_DIR="$(pwd)/data"
BACKUP_DIR="$DATA_DIR/backups"
# Delete backups older than retention days (default 90)
RETENTION_DAYS=${1:-90}
find "$BACKUP_DIR" -type f -name "spa_database-*.backup.json" -mtime +$RETENTION_DAYS -print -delete

#!/usr/bin/env bash
set -euo pipefail
DATA_DIR="$(pwd)/data"
BACKUP_DIR="$DATA_DIR/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
cp "$DATA_DIR/spa_database.json" "$BACKUP_DIR/spa_database-$TIMESTAMP.backup.json"
# Keep last 30 backups
find "$BACKUP_DIR" -type f -name "spa_database-*.backup.json" -mtime +30 -delete
# Simple integrity check: ensure backup is valid JSON
for f in "$BACKUP_DIR"/spa_database-*.backup.json; do
  if ! node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
    echo "Corrupt backup detected: $f" >&2
  fi
done

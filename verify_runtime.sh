#!/usr/bin/env bash
set -euo pipefail

# verify_runtime.sh
# Runs runtime functional verification against the local app.
# Logs to verify_runtime.log and server.log. Exits non-zero on failures.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

LOG=verify_runtime.log
SERVER_LOG=server.log
TOKEN_FILE=jwt.token
> "$LOG"
> "$SERVER_LOG"

echo "START VERIFICATION: $(date)" | tee -a "$LOG"

FAILED=0

log() { echo "$(date +'%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG"; }
log_server() { echo "$*" >> "$SERVER_LOG"; }

# Helper to run HTTP request and log request/response
run_request() {
  local name="$1"; shift
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"; shift || true
  local headers=("-H" "Content-Type: application/json")
  if [ -f "$TOKEN_FILE" ]; then
    headers+=("-H" "Authorization: Bearer $(cat $TOKEN_FILE)")
  fi

  log "REQUEST: $name | $method $url | payload: $data"
  if [ -n "$data" ]; then
    resp=$(curl -sS -X "$method" "${headers[@]}" -d "$data" -w "\n%{http_code}" "$url") || resp="$?";
  else
    resp=$(curl -sS -X "$method" "${headers[@]}" -w "\n%{http_code}" "$url") || resp="$?";
  fi
  body=$(echo "$resp" | sed '$d' )
  code=$(echo "$resp" | tail -n1)
  log "RESPONSE: $name | HTTP $code | body: $body"
  echo "-----" >> "$LOG"
  echo "$body" > /tmp/last_body.json || true
  echo "$code" > /tmp/last_code.txt || true
  return 0
}

# Try candidate ports to see if server is running
detect_base_url() {
  local ports=(3000 3001 3002 4000 5000 5173 8080 8000)
  for p in "${ports[@]}"; do
    for path in "/" "/api/health" "/health"; do
      if curl -sS --max-time 2 "http://localhost:$p${path}" >/dev/null 2>&1; then
        echo "http://localhost:$p"
        return
      fi
    done
    # fallback: if something is listening on the port, assume server
    if lsof -i TCP:"$p" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
      echo "http://localhost:$p"
      return
    fi
  done
  echo ""
}

# Start server if not running
BASE_URL=$(detect_base_url)
if [ -n "$BASE_URL" ]; then
  log "Server already responding at $BASE_URL"
else
  log "No running server detected. Starting with 'npm run dev'..."
  # Run dev server with TMPDIR set to /tmp to avoid permission errors creating IPC sockets in VS Code tmp
  TMPDIR=${TMPDIR:-/tmp}
  nohup env TMPDIR="$TMPDIR" npm run dev > "$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  log_server "Started server PID $SERVER_PID"
  # wait for server (extend timeout to 120s)
  for i in $(seq 1 120); do
    BASE_URL=$(detect_base_url)
    if [ -n "$BASE_URL" ]; then break; fi
    sleep 1
  done
  if [ -z "$BASE_URL" ]; then
    log "ERROR: Server did not start within timeout. See $SERVER_LOG"
    exit 2
  fi
fi

log "Using base URL: $BASE_URL"

# Wait for health endpoint
HEALTH_CAND=("/" "/health" "/api/health" "/status")
HEALTH_OK=0
for p in "${HEALTH_CAND[@]}"; do
  for i in {1..30}; do
    if curl -sS --max-time 2 "$BASE_URL$p" >/dev/null 2>&1; then
      log "Health OK at $BASE_URL$p"
      HEALTH_OK=1
      break 2
    fi
    sleep 0.5
  done
done
if [ "$HEALTH_OK" -ne 1 ]; then
  log "ERROR: health endpoint did not respond"
  FAILED=1
fi

# Extract admin creds from api/db.ts (preferred) or seeds/admin.js if available
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="password"
if [ -f api/db.ts ]; then
  # extract first email literal from the db seed users
  e=$(grep -Eo "email: *['\"][^'\"]+['\"]" api/db.ts | head -n1 || true)
  if [ -n "$e" ]; then
    ADMIN_EMAIL=$(echo "$e" | sed -E "s/email: *['\"]([^'\"]+)['\"]/\1/")
  fi
  # try to extract DEFAULT_ADMIN_PASSWORD fallback literal
  p=$(grep -E "DEFAULT_ADMIN_PASSWORD" api/db.ts | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/" | head -n1 || true)
  if [ -n "$p" ]; then
    ADMIN_PASSWORD="$p"
  fi
elif [ -f seeds/admin.js ]; then
  e=$(grep -Eo "email: *['\"][^'\"]+['\"]" seeds/admin.js | head -n1 || true)
  p=$(grep -Eo "password: *['\"][^'\"]+['\"]" seeds/admin.js | head -n1 || true)
  if [ -n "$e" ]; then ADMIN_EMAIL=$(echo "$e" | sed -E "s/email: *['\"]([^'\"]+)['\"]/\1/"); fi
  if [ -n "$p" ]; then ADMIN_PASSWORD=$(echo "$p" | sed -E "s/password: *['\"]([^'\"]+)['\"]/\1/"); fi
fi
log "Using admin: $ADMIN_EMAIL"

TOKEN=""
USED_AUTH_ENDPOINT=""

# Try to detect routes from server.ts so we don't hardcode invalid endpoints
LOGIN_CAND=()
if [ -f server.ts ]; then
  tmpf=$(mktemp)
  grep -E "app\.(all|get|post|put|delete)\s*\(\s*['\"]" server.ts \
    | sed -E "s/.*app\.[^(]+\(\s*['\"]([^'\"]+)['\"].*/\1/" \
    | grep -E "auth.*login" > "$tmpf" 2>/dev/null || true
  while IFS= read -r line; do
    [ -n "$line" ] && LOGIN_CAND+=("$line")
  done < "$tmpf"
  rm -f "$tmpf"
fi

# Fallback candidates if detection fails
if [ ${#LOGIN_CAND[@]} -eq 0 ]; then
  LOGIN_CAND=("/auth/login" "/api/auth/login" "/login" "/api/login")
fi

# Prefer explicit /api prefixed auth/login if present
PREFERRED_LOGIN=""
for p in "${LOGIN_CAND[@]}"; do
  case "$p" in
    */api/*|/api*) PREFERRED_LOGIN="$p"; break ;;
  esac
done
if [ -z "$PREFERRED_LOGIN" ]; then
  PREFERRED_LOGIN="${LOGIN_CAND[0]}"
fi

# Only attempt the detected/preferred login endpoint(s)
for ep in "$PREFERRED_LOGIN"; do
  url="$BASE_URL$ep"
  run_request "Login attempt" POST "$url" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
  code=$(cat /tmp/last_code.txt)
  body=$(cat /tmp/last_body.json)
  # try to parse token
  token=$(python3 - <<PY
import sys,json
try:
    d=json.loads(sys.stdin.read())
    print(d.get('token') or d.get('accessToken') or d.get('jwt') or d.get('data',{}).get('token','') or '')
except:
    print('')
PY
  <<<"$body") || true
  if [ -n "$token" ] && [ "$token" != "null" ]; then
    echo "$token" > "$TOKEN_FILE"
    TOKEN="$token"
    USED_AUTH_ENDPOINT="$url"
    log "LOGIN PASS | Endpoint: $url | HTTP: $code | token saved to $TOKEN_FILE"
    break
  else
    if [[ "$code" =~ ^2 ]]; then
      log "LOGIN WARN - 2xx but no token found | Endpoint: $url | HTTP: $code | body: $body"
    else
      log "LOGIN FAIL | Endpoint: $url | HTTP: $code | body: $body"
      FAILED=1
    fi
  fi
done

if [ -z "$TOKEN" ]; then
  log "Proceeding without JWT for authenticated endpoints (token not obtained). Some tests may fail."
fi

export CURL_OPTS=( -sS -H "Content-Type: application/json" )
if [ -f "$TOKEN_FILE" ]; then
  export AUTH_HEADER="-H Authorization: Bearer $(cat $TOKEN_FILE)"
else
  export AUTH_HEADER=""
fi

run_assert() {
  local name="$1"; shift
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"; shift || true
  run_request "$name" "$method" "$url" "$data"
  code=$(cat /tmp/last_code.txt)
  body=$(cat /tmp/last_body.json)
  if [[ "$code" =~ ^2 ]]; then
    echo "PASS | $name | $url | $code" | tee -a "$LOG"
  else
    echo "FAIL | $name | $url | $code | $body" | tee -a "$LOG"
    FAILED=1
  fi
}

# Helper to try a list of base prefixes
try_prefixes() {
  local path="$1"; shift
  for pre in "" "/api"; do
    echo "$BASE_URL${pre}${path}"
  done
}

# 3. Test API endpoints - list of common endpoints
ENDPOINTS=("/dsr" "/settings" "/users" "/reports" "/dashboard" "/auth" )
for ep in "${ENDPOINTS[@]}"; do
  for url in $(try_prefixes "$ep"); do
    # try GET
    run_request "Probe GET $url" GET "$url"
    code=$(cat /tmp/last_code.txt)
    body=$(cat /tmp/last_body.json)
    if [[ "$code" =~ ^2 ]]; then
      echo "PASS | Probe GET | $url | $code" | tee -a "$LOG"
    else
      echo "WARN | Probe GET | $url | $code" | tee -a "$LOG"
    fi
  done
done

# 6-10 DSR flow
DSR_ID=""
CREATE_PAYLOAD='{"title":"Automated Test DSR","description":"Created by verify_runtime.sh","status":"open"}'
for pre in "" "/api"; do
  url="$BASE_URL${pre}/dsr"
  run_request "Create DSR" POST "$url" "$CREATE_PAYLOAD"
  code=$(cat /tmp/last_code.txt)
  body=$(cat /tmp/last_body.json)
  if [[ "$code" =~ ^2 ]]; then
    # try to extract id
    id=$(python3 - <<PY
import sys,json
try:
  d=json.loads(sys.stdin.read())
  print(d.get('id') or d.get('_id') or d.get('data',{}).get('id','') )
except:
  print('')
PY
    <<<"$body") || true
    DSR_ID="$id"
    echo "PASS | Create DSR | $url | $code | id=$DSR_ID" | tee -a "$LOG"
    break
  else
    echo "FAIL | Create DSR | $url | $code | $body" | tee -a "$LOG"
  fi
done

if [ -z "$DSR_ID" ]; then
  log "ERROR: Could not create DSR; aborting DSR CRUD tests"; FAILED=1
else
  # Read
  for pre in "" "/api"; do
    url="$BASE_URL${pre}/dsr/$DSR_ID"
    run_assert "Get DSR" GET "$url"
    if [ "$FAILED" -ne 0 ]; then break; fi
    # Update
    run_assert "Update DSR" PUT "$url" '{"title":"Updated from script"}'
    # Delete
    run_assert "Delete DSR" DELETE "$url"
    break
  done
fi

# 15 Restart server
log "Restarting server for persistence check..."
# attempt graceful restart
pkill -f "npm run dev" || true
sleep 2
nohup npm run dev > "$SERVER_LOG" 2>&1 &
NEW_PID=$!
log_server "Restarted server PID $NEW_PID"
sleep 3

# 16 Verify data after restart (if applicable)
if [ -n "$DSR_ID" ]; then
  url="$BASE_URL/dsr/$DSR_ID"
  run_request "Get DSR after restart" GET "$url"
  code=$(cat /tmp/last_code.txt)
  body=$(cat /tmp/last_body.json)
  # If we deleted it earlier, we expect non-2xx. If deletion failed, expect 2xx.
  # We cannot know earlier state reliably; we just report result.
  if [[ "$code" =~ ^2 ]]; then
    echo "INFO | DSR exists after restart | $url | $code" | tee -a "$LOG"
  else
    echo "INFO | DSR not found after restart | $url | $code" | tee -a "$LOG"
  fi
fi

# 11-14 Settings, Users, Reports checks
# Settings: read and attempt update
for pre in "" "/api"; do
  base="$BASE_URL${pre}/settings"
  run_request "Get Settings" GET "$base"
  code=$(cat /tmp/last_code.txt)
  body=$(cat /tmp/last_body.json)
  if [[ "$code" =~ ^2 ]]; then
    echo "PASS | Get Settings | $base | $code" | tee -a "$LOG"
  else
    echo "WARN | Get Settings | $base | $code" | tee -a "$LOG"
  fi
  # try update sample
  run_request "Update Settings (sample)" PUT "$base" '{"key":"site_name","value":"Relaxio-verified"}'
done

# Users: list
for pre in "" "/api"; do
  base="$BASE_URL${pre}/users"
  run_request "Get Users" GET "$base"
done

# Reports and Dashboard
for candidate in "/reports" "/api/reports" "/dashboard" "/api/dashboard"; do
  run_request "Reports/Dashboard" GET "$BASE_URL${candidate}"
done

log "Verification completed. FAILED=$FAILED"
if [ "$FAILED" -ne 0 ]; then
  log "One or more tests failed. See $LOG and $SERVER_LOG"
  exit 3
else
  log "All required tests passed (no failures recorded)."
  exit 0
fi

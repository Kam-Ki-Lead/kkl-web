#!/usr/bin/env bash
#
# Verifies the sample-mode guard in both directions.
#
#   1. The documented local review configuration serves a production build.
#   2. A served build that declares nothing refuses to serve at all, so an
#      unconfigured deployment fails visibly instead of silently running
#      whatever it was built as.
#   3. A deployment marked for real users refuses to run sample services —
#      including the case the build-time check cannot see, where a bundle built
#      for review is deployed with the production environment variable set on
#      the server.
#   4. A bundle/server disagreement, in either variable, refuses.
#
# What is NOT tested, because it is not detectable: a deployment that declares
# KKL_ENV=review while actually serving real users. Nothing in a frontend can
# tell where it is running. That is an operational control.
#
# Run from the repository root. Builds once, then starts the server under each
# configuration in turn.
set -uo pipefail

PORT="${PORT:-3899}"
LOG="$(mktemp)"
OUT="$(mktemp)"
FAILURES=0

stop() {
  for pid in $(ps -eo pid,args | grep "next-server" | grep -v grep | awk '{print $1}'); do
    kill -9 "$pid" 2>/dev/null
  done
  sleep 1
}

# $1 label, $2 expected status, rest: environment assignments
scenario() {
  local label="$1" expect="$2"; shift 2
  stop
  (env "$@" npx next start -p "$PORT" > "$LOG" 2>&1 &)
  sleep 5
  local code
  code=$(curl -s -o "$OUT" -w '%{http_code}' "http://127.0.0.1:${PORT}/")
  if [ "$code" = "$expect" ]; then
    echo "PASS  ${label}  (HTTP ${code})"
  else
    echo "FAIL  ${label}  (HTTP ${code}, expected ${expect})"
    FAILURES=$((FAILURES + 1))
  fi
  if [ "$code" = "503" ]; then
    echo "      $(head -c 160 "$OUT")"
  fi
}

echo "== build-time guard =="
if NEXT_PUBLIC_KKL_ENV=production NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build > "$LOG" 2>&1; then
  echo "FAIL  a production build with sample data should not succeed"
  FAILURES=$((FAILURES + 1))
else
  echo "PASS  a production build with sample data is refused at build time"
fi

echo
echo "== review build =="
npx next build > "$LOG" 2>&1 || { echo "FAIL  the review build itself failed"; exit 1; }
echo "PASS  review build succeeds"

echo
echo "== run-time guard =="
scenario "documented local review configuration serves normally" 200 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_ENV=review KKL_DATA_SOURCE=sample
scenario "a served build declaring nothing is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample
scenario "KKL_ENV set but KKL_DATA_SOURCE missing is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_ENV=review
scenario "KKL_DATA_SOURCE set but KKL_ENV missing is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_DATA_SOURCE=sample
scenario "review build deployed with KKL_ENV=production is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_ENV=production KKL_DATA_SOURCE=sample
scenario "KKL_ENV=production with sample data is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_ENV=production KKL_DATA_SOURCE=sample
scenario "a server/bundle data-source disagreement is refused" 503 \
  NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample KKL_ENV=review KKL_DATA_SOURCE=api

stop
echo
if [ "$FAILURES" -eq 0 ]; then echo "All guard checks behaved as expected."; else echo "${FAILURES} guard check(s) did not."; fi
exit "$FAILURES"

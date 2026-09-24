#!/usr/bin/env bash
#
# Verifies the sample-mode deployment guard in both directions.
#
# WHAT THIS HAD WRONG, AND WHY IT IS WRITTEN THIS WAY NOW
# -------------------------------------------------------
# An earlier version of this script built ONE bundle with no NEXT_PUBLIC_*
# variables set, and then passed NEXT_PUBLIC_KKL_ENV / NEXT_PUBLIC_KKL_DATA_SOURCE
# on the `next start` line of every scenario. It reported 8/8.
#
# It was not testing the guard. The guard's whole claim is that it compares
# what a bundle was BUILT as against what the SERVER says it is. Supplying the
# NEXT_PUBLIC_* values at start time made both sides of that comparison come
# from the same process environment, so:
#
#   - the "review build deployed with KKL_ENV=production is refused" scenario
#     would have passed against a production bundle just as happily;
#   - the documented review configuration — NEXT_PUBLIC_* on the build line
#     only — was never run at all, and in fact returned 503.
#
# So every scenario below now BUILDS the bundle it intends to test, and starts
# the server with only the unprefixed KKL_* variables, which is what a real
# deployment sets. One scenario deliberately does pass NEXT_PUBLIC_* at start
# time, to prove that doing so can no longer launder a mismatched bundle.
#
# What is NOT tested, because it is not detectable: a deployment that declares
# KKL_ENV=review while actually serving real users. Nothing in a frontend can
# tell where it is running. That is an operational control, not a code one.
#
# Run from the repository root. Two refused builds, one review build, a series
# of servers, and two scenarios that are reported PENDING because they need a
# backend this repository does not have yet.
set -uo pipefail

PORT="${PORT:-3899}"
LOG="$(mktemp)"
OUT="$(mktemp)"
FAILURES=0

stop() {
  if ps -eo pid,args > /dev/null 2>&1; then
    for pid in $(ps -eo pid,args | grep "next-server" | grep -v grep | awk '{print $1}'); do
      kill -9 "$pid" 2>/dev/null
    done
  else
    # Windows Git Bash: ps has no -eo, and netstat's CRLF line endings ride
    # into the PID field and defeat taskkill. Ask PowerShell to kill whatever
    # holds the port instead — a stale server answering in place of the
    # scenario's own is how this suite once reported 200 where the guard had
    # refused nothing.
    powershell -NoProfile -Command \
      "Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" \
      > /dev/null 2>&1
  fi
  sleep 1
}

# Every scenario runs with the four guard variables REMOVED first, then its
# own assignments applied. Without the -u prefix a variable exported in the
# caller's shell leaks into scenarios that expect it unset, and the suite
# measures the shell instead of the guard.
GUARD_VARS="KKL_ENV KKL_DATA_SOURCE NEXT_PUBLIC_KKL_ENV NEXT_PUBLIC_KKL_DATA_SOURCE"
unsets() {
  local v
  for v in $GUARD_VARS; do printf -- '-u %s ' "$v"; done
}

# build <label> <env-assignments...>
build() {
  local label="$1"; shift
  if env "$@" npx next build > "$LOG" 2>&1; then
    echo "built ${label}"
  else
    echo "FAIL  the ${label} build failed"
    tail -c 400 "$LOG"
    FAILURES=$((FAILURES + 1))
  fi
}

# scenario <label> <expected-status> <expected-reason-substring> <env...>
#
# The reason is asserted, not just the status. A 503 raised for the wrong
# reason is not the guard working — it is a different failure wearing the same
# number, and a suite that only counts status codes cannot tell them apart.
# Pass "-" where no reason applies (a 200).
scenario() {
  local label="$1" expect="$2" reason="$3"; shift 3
  stop
  # shellcheck disable=SC2046
  (env $(unsets) "$@" npx next start -p "$PORT" > "$LOG" 2>&1 &)
  # Wait for THIS server, not a fixed number of seconds: a boot right after
  # a build can exceed six seconds on a slow disk, and curl against a
  # half-started server measures the timing, not the guard.
  local tries=0 code body ok=1
  code="000"
  while [ "$code" = "000" ] && [ "$tries" -lt 30 ]; do
    sleep 1
    tries=$((tries + 1))
    code=$(curl -s -o "$OUT" -w '%{http_code}' "http://127.0.0.1:${PORT}/")
  done
  body=$(cat "$OUT")
  [ "$code" = "$expect" ] || ok=0
  if [ "$reason" != "-" ] && ! printf '%s' "$body" | grep -qF "$reason"; then
    ok=0
    echo "      reason mismatch: expected to contain \"${reason}\""
  fi
  if [ "$ok" = "1" ]; then
    echo "PASS  ${label}  (HTTP ${code})"
  else
    echo "FAIL  ${label}  (HTTP ${code}, expected ${expect})"
    FAILURES=$((FAILURES + 1))
  fi
  if [ "$code" = "503" ]; then
    echo "      $(head -c 170 "$OUT")"
  fi
}

echo "== build-time guard =="
if NEXT_PUBLIC_KKL_ENV=production NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build > "$LOG" 2>&1; then
  echo "FAIL  a production build with sample data should not succeed"
  FAILURES=$((FAILURES + 1))
else
  echo "PASS  a production build with sample data is refused at build time"
fi

if NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=api npx next build > "$LOG" 2>&1; then
  echo "FAIL  an api build with no API base URL should not succeed"
  FAILURES=$((FAILURES + 1))
else
  echo "PASS  an api build with no API base URL is refused at build time"
fi

echo
echo "== a bundle built for review, serving sample data =="
build "review/sample" NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample

# The documented configuration: NEXT_PUBLIC_* on the build line, unprefixed on
# the start line. This is the case the previous script never ran.
scenario "documented review configuration serves normally" 200 "-" \
  KKL_ENV=review KKL_DATA_SOURCE=sample
scenario "a served build declaring nothing is refused" 503 \
  "KKL_ENV and KKL_DATA_SOURCE are not set"
scenario "KKL_ENV set but KKL_DATA_SOURCE missing is refused" 503 \
  "KKL_DATA_SOURCE is not set" \
  KKL_ENV=review
scenario "KKL_DATA_SOURCE set but KKL_ENV missing is refused" 503 \
  "KKL_ENV is not set" \
  KKL_DATA_SOURCE=sample
scenario "marked production while running sample services is refused" 503 \
  "marked production but is running sample services" \
  KKL_ENV=production KKL_DATA_SOURCE=sample
scenario "a data-source disagreement with the bundle is refused" 503 \
  "built with NEXT_PUBLIC_KKL_DATA_SOURCE=sample but deployed with KKL_DATA_SOURCE=api" \
  KKL_ENV=review KKL_DATA_SOURCE=api

# The accident the run-time guard exists for: a review bundle reaching a
# production host whose server variables all say production.
scenario "a review bundle deployed as production is refused" 503 \
  "built with NEXT_PUBLIC_KKL_ENV=review but deployed with KKL_ENV=production" \
  KKL_ENV=production KKL_DATA_SOURCE=api

# The regression test for the defect described at the top of this file. Setting
# the NEXT_PUBLIC_* pair on the server must not make the bundle look like
# something it is not: those values are frozen in the bundle and the server's
# copy of them is ignored.
scenario "NEXT_PUBLIC_* at start time cannot launder a review bundle" 503 \
  "built with NEXT_PUBLIC_KKL_ENV=review but deployed with KKL_ENV=production" \
  NEXT_PUBLIC_KKL_ENV=production NEXT_PUBLIC_KKL_DATA_SOURCE=api \
  KKL_ENV=production KKL_DATA_SOURCE=api

stop

echo
echo "== not runnable here =="
# The mirror-image scenarios — a production/api bundle that must SERVE under
# the same server variables a review bundle is refused under — would be the
# strongest evidence that the comparison reads the bundle rather than the
# server. They cannot run in this repository yet.
#
# Building for api prerenders the public routes against kkl-backend, and the
# api services refuse to fall back to sample data when the backend is absent,
# so `next build` fails during export. That refusal is correct behaviour and
# must not be weakened to make this script report a higher number.
#
# These are PENDING, not passing and not failing. Run them once kkl-backend
# serves the public catalogue:
#
#   NEXT_PUBLIC_KKL_ENV=production NEXT_PUBLIC_KKL_DATA_SOURCE=api \
#   NEXT_PUBLIC_KKL_API_BASE_URL=https://<backend> npx next build
#   KKL_ENV=production KKL_DATA_SOURCE=api  npx next start   # expect 200
#   KKL_ENV=review     KKL_DATA_SOURCE=api  npx next start   # expect 503
echo "PENDING  a production/api bundle deployed as production serves"
echo "PENDING  a production bundle deployed as review is refused"
echo "         Both need a reachable kkl-backend: an api build prerenders"
echo "         against it and fails without one. Not counted as passing."

# Leave the tree holding the bundle the documentation tells a reviewer to run.
echo
build "review/sample (restored)" NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "All 10 guard checks behaved as expected. 2 pending, listed above."
else
  echo "${FAILURES} guard check(s) did not."
fi
exit "$FAILURES"

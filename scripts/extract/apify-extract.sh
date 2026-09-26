#!/usr/bin/env bash
# Phase 2 — structured Instagram extraction through the Apify CLI.
#
#   scripts/extract/apify-extract.sh                 # schema + cost check only
#   CONFIRM_COST=1 scripts/extract/apify-extract.sh  # run the actors
#
# Requires: apify-cli >= 1.5 (npm i -g apify-cli), APIFY_TOKEN in the environment,
# and network access to api.apify.com. Writes a new, timestamped directory under
# data/raw/instagram/ and never overwrites an existing export.
#
# Follows the apify-ultimate-scraper conventions: --json with stderr discarded on
# data commands, visible stderr on auth commands, the plugin user agent only on
# run commands, and a cost estimate before any pay-per-event actor runs.

set -euo pipefail
set -o noclobber

USERNAME="${USERNAME:-southafrica.property}"
LIMIT="${LIMIT:-200}"
UA="apify-claude-code-plugin/apify-ultimate-scraper"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

PROFILE_ACTOR="apify/instagram-profile-scraper"
POSTS_ACTOR="apify/instagram-post-scraper"
REELS_ACTOR="apify/instagram-reel-scraper"

PROFILE_INPUT="{\"usernames\":[\"$USERNAME\"]}"
POSTS_INPUT="{\"username\":[\"$USERNAME\"],\"resultsLimit\":$LIMIT}"
REELS_INPUT="{\"username\":[\"$USERNAME\"],\"resultsLimit\":$LIMIT}"

echo "== Apify CLI"
apify --version
echo "== Auth (errors shown)"
apify info 2>&1 | head -5

echo "== Input schemas and pricing"
for actor in "$PROFILE_ACTOR" "$POSTS_ACTOR" "$REELS_ACTOR"; do
  echo "-- $actor"
  keys=$(apify actors info "$actor" --input --json 2>/dev/null | jq -c '.input.schema.properties // empty | keys' || true)
  echo "   input keys: ${keys:-<no registered schema — check README: apify actors info $actor --readme>}"
  apify actors info "$actor" --json 2>/dev/null \
    | jq -r '"   deprecated: \(.isDeprecated // false)  pricing: \(.currentPricingInfo.pricingModel // "unknown")  per-event: \(.currentPricingInfo.pricePerEvent // .currentPricingInfo.pricingPerEvent // "n/a")"' || true
done
echo
echo "Estimated volume: 1 profile + up to $LIMIT posts + up to $LIMIT reels."
echo "Estimate the cost from the per-event prices above (warn over \$5, confirm over \$20)."
echo "This is a rough estimate only; actual costs vary. Check the Apify billing dashboard."

if [[ "${CONFIRM_COST:-}" != "1" ]]; then
  echo
  echo "Dry run complete. Re-run with CONFIRM_COST=1 to start the actors."
  exit 0
fi

STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
OUT="$ROOT/data/raw/instagram/$STAMP"
mkdir "$OUT"   # fails if it already exists

run_actor() {
  local actor="$1" input="$2" name="$3"
  echo "== $name: $actor"
  local run
  run=$(apify actors call "$actor" -i "$input" --user-agent "$UA" --json 2>/dev/null)
  echo "$run" > "$OUT/$name.run.json"
  local status dataset
  status=$(jq -r '.status' <<<"$run")
  dataset=$(jq -r '.defaultDatasetId' <<<"$run")
  if [[ "$status" != "SUCCEEDED" ]]; then
    echo "   run $status — see https://console.apify.com/actors/runs/$(jq -r '.id' <<<"$run")/log" >&2
    return 1
  fi
  apify datasets get-items "$dataset" --format json 2>/dev/null > "$OUT/$name.json"
  echo "   $(jq 'length' "$OUT/$name.json") items · dataset https://console.apify.com/storage/datasets/$dataset"
}

run_actor "$PROFILE_ACTOR" "$PROFILE_INPUT" profile
run_actor "$POSTS_ACTOR" "$POSTS_INPUT" posts
# The post scraper can under-count reels; the reel scraper fills the gap.
run_actor "$REELS_ACTOR" "$REELS_INPUT" reels || echo "   reels run failed; continuing with posts only"

jq -n --arg stamp "$STAMP" --arg username "$USERNAME" --argjson limit "$LIMIT" \
  --arg profile "$PROFILE_ACTOR" --arg posts "$POSTS_ACTOR" --arg reels "$REELS_ACTOR" \
  '{extractedAt: $stamp, username: $username, resultsLimit: $limit, actors: {profile: $profile, posts: $posts, reels: $reels}}' \
  > "$OUT/extraction.json"
chmod -R a-w "$OUT"
echo "Raw export written to ${OUT#$ROOT/} (read-only)."
echo "Next: npm run extract:normalize && npm run media:fetch   # CDN links expire within days"

#!/usr/bin/env bash
# One-command deploy to Netlify (free tier, no credit card).
# Usage: npm run deploy:netlify
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building..."
npm run build

if ! command -v netlify >/dev/null 2>&1; then
  echo "==> Installing netlify CLI..."
  npm i -g netlify-cli
fi

if ! netlify status >/dev/null 2>&1; then
  echo "==> Not logged in to Netlify. Opening login (one-time, browser)..."
  netlify login
fi

echo "==> Deploying production..."
netlify deploy --prod --dir=dist

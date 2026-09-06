#!/usr/bin/env bash
# One-command deploy to Vercel (Hobby/free tier, no credit card).
# Usage: npm run deploy:vercel
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building..."
npm run build

if ! command -v vercel >/dev/null 2>&1; then
  echo "==> Installing vercel CLI..."
  npm i -g vercel
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "==> Not logged in to Vercel. Opening login (one-time, browser or email)..."
  vercel login
fi

echo "==> Deploying production..."
vercel deploy --prebuilt --prod

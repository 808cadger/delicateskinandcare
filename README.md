# Delicate Skin & Care

Static marketing site + one serverless function that powers the "Get Free Skin Tips"
selfie feature with a real call to Claude's vision API.

## Download

[![Visit Site](https://img.shields.io/badge/Visit_Site-live-572443?style=for-the-badge)](https://delicate-skin-care-app.vercel.app)
[![Download APK](https://img.shields.io/github/v/release/808cadger/delicateskinandcare?label=Download%20APK&style=for-the-badge&color=3DDC84)](https://github.com/808cadger/delicateskinandcare/releases/latest/download/delicate-skin-care.apk)
[![Download Source](https://img.shields.io/badge/Download-Source_ZIP-blue?style=for-the-badge)](https://github.com/808cadger/delicateskinandcare/archive/refs/heads/main.zip)

- **Visit Site** — the live web app. On mobile, use your browser's "Add to Home Screen"
  to install it as a PWA today, no app store needed.
- **Download APK** — always points at the newest [Release](https://github.com/808cadger/delicateskinandcare/releases)'s
  Android build. Shows "No releases" until the first one is published (see CI section below).
- **Download Source** — a ZIP of the `main` branch, generated automatically by GitHub.

## What's here

- `index.html` — the site (dark mode, chat widget, promo card, and the skin-tips modal).
- `delicate-skin-and-care_assets/` — hero photo used by the site.
- `api/analyze-skin.js` — Vercel serverless function. Receives a resized selfie from the
  browser, calls Claude (`claude-opus-5`) with a structured-output schema, and returns
  `{ observations, summary, tips, recommended_service }`. Your Anthropic API key lives
  only here — it is never sent to the browser.

## How the feature works

1. User uploads a selfie in the "Get Free Skin Tips" modal.
2. The browser downsizes the image (max 1024px, JPEG ~85% quality) before sending it.
3. `POST /api/analyze-skin` with `{ image: <base64>, mediaType: <mime> }`.
4. The function calls Claude with the image + a JSON schema, gets back general,
   non-diagnostic observations and tips, and a recommended service — and returns that
   to the browser.
5. If the request fails for any reason (no photo, network error, refusal), the modal
   falls back to a canned concern-picker quiz that needs no backend at all.

No images are ever written to disk or a database — they pass through the function to
Claude and back in memory only.

## Deploy (Vercel)

1. Install the CLI once: `npm install -g vercel` (or use the Vercel dashboard/GitHub
   integration instead of the CLI — either works).
2. From this directory: `vercel` (first time) or `vercel --prod` (subsequent deploys).
3. Set your Anthropic API key as an environment variable on the Vercel project —
   dashboard: Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY`,
   or via CLI: `vercel env add ANTHROPIC_API_KEY`.
4. Redeploy after adding the env var so the function picks it up:
   `vercel --prod`.

No `vercel.json` is needed — Vercel auto-detects the `api/` folder as serverless
functions and serves everything else (`index.html`, the assets folder) as static files.

## Local development

`vercel dev` (from this directory) runs both the static site and the `/api` function
locally, using the same `ANTHROPIC_API_KEY` from a `.env` file or your shell env — this
is the only way to exercise the real analysis flow locally, since `index.html` opened
directly via `file://` has no server to call.

## Cost

Each analysis is one Claude Opus 5 request with one image + a short prompt — a few
cents at most per use (Opus 5 pricing: $5 / $25 per million input/output tokens). There
is no caching or rate-limiting built in; add some (e.g. Vercel's built-in rate limiting,
or a simple per-IP counter) before high-traffic launch if cost is a concern.

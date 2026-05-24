# Agent Handover

Last updated: 2026-05-24

This document captures the current working model for the APGI Training repository so any new agent can continue quickly.

## Working branches

- `main`
  - Long-term branch for APGI Learning Portal / LMS development.
- `urls-module`
  - Production branch for Thinkific-ready stable URLs.
  - Focus: minimal wrapper + reliable unit route links to published HTML packages.

## Current production for Thinkific

- Project: `training-urls-module` (Vercel team: `rassie-ras-projects`)
- Stable domain: `https://training-urls-module.vercel.app`
- Example live unit URL:
  - `https://training-urls-module.vercel.app/courses/vpshr-level-0/unit13`

## Deployment model (`urls-module`)

- Git repository connected in Vercel: `APGI-cmy/Training`
- Vercel repository access: enabled (all repositories on the connected GitHub account)
- Production branch tracking: `urls-module`
- Vercel Git LFS: **must remain enabled** (`gitLFS=true`) because `.mp4` assets are tracked with Git LFS
- Result: every push to `urls-module` triggers a Production deployment automatically.

## Content update workflow (VPSHR Level 0)

1. Add new published package under:
   - `public/courses/vpshr-level-0/LU <N> <Name>/...`
2. Add/update unit metadata in:
   - `src/data/vpshr-level-0.json`
   - Keep both patterns:
     - `slug`: `luN`
     - `legacySlug`: `unitN` (Thinkific-friendly canonical route)
3. Update route list in:
   - `docs/thinkific-url-map.md`
4. Validate:
   - `npm run build`
   - open `/courses/vpshr-level-0/unitN` locally
5. Push to `urls-module` and verify production URL on Vercel.

## Known context

- LU13 (`Trespass`) is already integrated and live.
- `docs/vercel-deployment.md` describes a GitHub Actions model oriented to `main`.
  - For `urls-module`, current active deploy path is Vercel Git auto-deploy from the `urls-module` branch.

## Operational notes

- If a token is ever shown in logs/screenshots, rotate it in Vercel immediately.
- Keep Thinkific URLs on the stable `unitN` pattern.

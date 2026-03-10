# Vercel Deployment

This document describes the canonical deployment model for the APGI training platform and explains how to perform the required one-time project setup.

---

## Deployment model

**GitHub Actions is the sole production deploy path.**

Deployments are triggered automatically by the workflow at `.github/workflows/deploy.yml` whenever a commit is pushed (or a pull request is merged) to the `main` branch:

```
Commit → PR → Merge to main → GitHub Actions → Vercel production deployment
```

> **Important – disable Vercel Git integration.**
> Vercel's built-in Git integration (configured in the Vercel dashboard under *Project → Settings → Git*) must be **disconnected** or **disabled** for this repository.
> If both the GitHub Actions workflow and Vercel's native Git integration are active at the same time, every merge to `main` will trigger two concurrent production deployments, which can cause race conditions and inconsistent deploys.

### Why GitHub Actions instead of Vercel Git integration?

Vercel's native Git integration creates a new project automatically when the repository is first connected, but requires project recreation whenever the Vercel project is deleted or the token is rotated. Using GitHub Actions instead:

- Keeps all deployment logic version-controlled and auditable alongside the rest of the repository.
- Avoids the need to recreate the Vercel project manually.
- Makes the deploy path explicit and predictable.

---

## One-time project setup

### 1. Create a Vercel project

If no Vercel project exists yet, create one:

1. Log in to the [Vercel dashboard](https://vercel.com/dashboard).
2. Click **Add New → Project**.
3. Import the `APGI-cmy/Training` repository *without* enabling the automatic Git deployment in Vercel — the GitHub Actions workflow handles deploys instead.
4. Under **Build & Output Settings**, confirm that the output directory is `public` (this is also set in `vercel.json`).
5. Deploy once manually from the Vercel dashboard to create the initial production deployment.

### 2. Collect the project identifiers

You need three values from your Vercel account. The easiest way to get them is to run `vercel link` once locally in the repository root:

```bash
npx vercel link
```

After linking, open `.vercel/project.json` (this file is gitignored and stays local):

```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

Note down:
- `orgId` → `VERCEL_ORG_ID`
- `projectId` → `VERCEL_PROJECT_ID`

For `VERCEL_TOKEN`, go to the Vercel dashboard → **Account Settings → Tokens** → **Create Token**.

> **Scope:** Create a token with *Full Account* scope, or limit it to the specific team that owns the project if you are using a team account.

### 3. Add GitHub Actions secrets

In the GitHub repository go to **Settings → Secrets and variables → Actions** and add the following three repository secrets:

| Secret name | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel API token (from Account Settings → Tokens) |
| `VERCEL_ORG_ID` | `orgId` value from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` value from `.vercel/project.json` |

Once these secrets are in place, every merge to `main` will trigger an automatic production deployment with no further setup required.

---

## Verifying a deployment

After a pull request is merged to `main`:

1. Open the **Actions** tab of the repository on GitHub.
2. Confirm the **Deploy to Vercel** workflow run completed successfully (green tick).
3. Open the production URL in a browser and verify the change is live:
   - `/` — platform root
   - `/courses/vpshr-level-0/` — course landing page
   - `/courses/vpshr-level-0/unit1/` — Unit 1

If a deployment fails, click the failed workflow run in the Actions tab to view the full job log.

---

## Repository and output directory

| Setting | Value |
|---|---|
| Repository | `APGI-cmy/Training` |
| Production branch | `main` |
| Output directory | `public/` (set in `vercel.json`) |
| Vercel Git integration | Disabled (GitHub Actions is the deploy path) |

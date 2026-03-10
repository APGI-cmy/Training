# Staging Area

This directory is the **non-public intake zone** for newly published iSpring HTML5 packages.

Files placed here are **never served to end users** — Vercel only serves the `public/` directory. The staging area lets content be committed to a branch and reviewed in a pull request before anything is promoted to the live course structure.

---

## Directory Structure

Place files here mirroring the production path:

```
staging/
└── courses/
    └── <course-id>/
        └── unit<N>/
            ├── index.html
            └── data/
                └── …
```

For example, a new Unit 2 export for `vpshr-level-0` goes to:

```
staging/courses/vpshr-level-0/unit2/
├── index.html
└── data/
    └── …
```

---

## Intake-to-Deployment Workflow

### Step 1 – Upload the iSpring Export to Staging

After publishing from iSpring (see [docs/adding-learning-units.md](../docs/adding-learning-units.md), Steps 1–2), copy the entire exported folder into the corresponding staging path instead of directly into `public/`:

```bash
# Example for Unit 2 of vpshr-level-0
cp -r ~/Desktop/unit2-export/* staging/courses/vpshr-level-0/unit2/
```

### Step 2 – Commit and Open a Pull Request for Review

Stage the new files and open a pull request:

```bash
git add staging/courses/<course-id>/unit<N>/
git commit -m "Stage Unit N iSpring export for <course-id>"
git push origin <your-branch>
```

Open a pull request against `main`. Reviewers can inspect the file structure, check the HTML, and verify the export is complete before any changes reach the live site.

### Step 3 – Promote from Staging to Production

Once the pull request is approved, move the unit folder from `staging/` into `public/` and update the course landing page **in the same PR** (or as a follow-up commit on the same branch):

```bash
# Move the unit folder into the live course structure
mv staging/courses/<course-id>/unit<N>/ public/courses/<course-id>/unit<N>/

# Update the course landing page to mark the unit as live
# (remove the "upcoming" class and "Coming soon" badge — see docs/adding-learning-units.md Step 6)
```

Then stage and amend (or add a new commit):

```bash
git add public/courses/<course-id>/unit<N>/
git add public/courses/<course-id>/index.html
git rm -r staging/courses/<course-id>/unit<N>/
git commit -m "Promote Unit N to production for <course-id>"
```

After the pull request is merged, Vercel deploys the updated content automatically.

### Step 4 – Verify and Link in Thinkific

Follow the remaining steps in [docs/adding-learning-units.md](../docs/adding-learning-units.md) (Steps 8–9) to verify the deployed Vercel URL and add it as a lesson in Thinkific.

---

## Why Not Commit Directly to `public/`?

| | Staging (`staging/`) | Live (`public/`) |
|---|---|---|
| Served by Vercel | ❌ No | ✅ Yes |
| Safe for review before go-live | ✅ Yes | ❌ Immediately live on merge |
| Tracked in Git | ✅ Yes | ✅ Yes |

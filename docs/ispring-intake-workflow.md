# iSpring Intake Workflow

This document defines the end-to-end process for importing a newly published iSpring HTML5 package into the repository and deploying it to the live course site.

> **Why a staging area?**
> Files committed under `staging/ispring-imports/` are **never served to end users** — Vercel only serves the `public/` directory. This lets content be committed to a branch and reviewed in a pull request before anything is promoted to the live course structure.

---

## Staging Directory Structure

Place iSpring exports here, mirroring the production path:

```
staging/ispring-imports/
└── <course-id>/
    └── unit<N>/
        ├── index.html
        └── data/
            └── …
```

For example, a new Unit 2 export for `vpshr-level-0` goes to:

```
staging/ispring-imports/vpshr-level-0/unit2/
├── index.html
└── data/
    └── …
```

---

## Step 1 – Publish from iSpring as HTML5

1. Open the presentation in PowerPoint with the iSpring Suite add-in active.
2. Click **Publish** in the iSpring Suite ribbon.
3. Choose **My Computer** as the publish destination.
4. Under **Output format**, select **HTML5**.
5. Set the **Local folder** output path to a convenient temporary location (e.g. `~/Desktop/unitN-export`).
6. Click **Publish** and wait for the export to complete.

---

## Step 2 – Confirm the Export

Before copying into the repository, verify that the iSpring export produced the expected structure:

```
unitN-export/
├── index.html          ← entry point loaded by the browser
└── data/               ← assets: slides, audio, JS, CSS, etc.
    ├── browsersupport.js
    └── …
```

Both `index.html` **and** the `data/` folder must be present. If either is missing, re-publish from iSpring.

---

## Step 3 – Copy the Export into the Staging Area

Copy the entire iSpring output directory into `staging/ispring-imports/` (**not** into `public/` yet):

```bash
# Example for Unit 2 of vpshr-level-0
cp -r ~/Desktop/unit2-export/* staging/ispring-imports/vpshr-level-0/unit2/
```

The resulting layout:

```
staging/ispring-imports/vpshr-level-0/unit2/
├── index.html
└── data/
    └── …
```

---

## Step 4 – Commit and Open a Pull Request for Review

Stage the new files and open a pull request against `main`:

```bash
git add staging/ispring-imports/<course-id>/unit<N>/
git commit -m "Stage Unit N iSpring export for <course-id>"
git push origin <your-branch>
```

Reviewers should confirm:

- `index.html` is present and the `data/` folder is complete.
- No sensitive or unexpected files were included in the export.
- The unit number and course ID match the intended destination.

---

## Step 5 – Promote from Staging to Production

Once the pull request is approved, run the promotion helper script from the repository root:

```bash
./scripts/promote-unit.sh <course-id> <unit-dir>
```

For example:

```bash
./scripts/promote-unit.sh vpshr-level-0 unit2
```

The script will:

1. Verify the staging source exists and contains `index.html`.
2. Verify the destination course directory already exists (guards against typos creating arbitrary new directories).
3. Remove only the specific unit directory at the destination if one is present (e.g. a placeholder page) — never the whole course directory.
4. Move the staged unit into `public/courses/<course-id>/unit<N>/`.
5. Stage the moved files with `git add` and remove the staging path from Git tracking.

> **Note:** The placeholder `index.html` references `../placeholder.css`. The iSpring-exported `index.html` does **not** load `placeholder.css`, so that file can be left in place at the course level — it is only used by remaining placeholder units.

---

## Step 6 – Update the Course Landing Page

Open `public/courses/<course-id>/index.html` and promote the unit's link from *upcoming* to *live*:

**Before (upcoming):**

```html
<li>
  <a class="unit-link upcoming" href="unit2/" aria-label="Unit 2 – Coming soon">Unit 2</a>
  <span class="badge">Coming soon</span>
</li>
```

**After (live):**

```html
<li>
  <a class="unit-link" href="unit2/">Unit 2</a>
</li>
```

Changes to make:
- Remove the `upcoming` class from the `<a>` element.
- Remove the `aria-label` attribute.
- Remove the `<span class="badge">Coming soon</span>` sibling element.

---

## Step 7 – Commit and Push

Stage the promotion changes and push to the same branch:

```bash
git add public/courses/<course-id>/unit<N>/
git add public/courses/<course-id>/index.html
git commit -m "Promote Unit N to production for <course-id>"
git push origin <your-branch>
```

Once approved and merged, Vercel will deploy the updated content automatically.

---

## Step 8 – Verify the Deployed Vercel URL

After the pull request is merged, Vercel deploys within a few minutes. Confirm the unit is live:

1. Open the production URL in a browser:
   ```
   https://<vercel-project>.vercel.app/courses/<course-id>/unit<N>/
   ```
2. Check that the iSpring presentation loads correctly — slides advance, audio plays (if applicable), and there are no console errors.
3. If the page shows a 404 or still displays the "Content coming soon" placeholder, verify that:
   - The PR was fully merged (not just pushed).
   - The Vercel deployment completed successfully (check the Vercel dashboard).
   - The folder path in the repository matches the URL exactly (paths are case-sensitive).

---

## Step 9 – Add the URL as a Lesson in Thinkific

Once the deployed URL is confirmed working:

1. Log in to the Thinkific admin panel.
2. Navigate to **Courses** and open the relevant course.
3. In the course builder, locate the lesson for this unit (or create a new one).
4. Set the lesson type to **Multimedia** (or **External Website** / **Iframe**, depending on how previous units are configured).
5. Paste the Vercel URL (from Step 8) as the lesson content URL.
6. Save and preview the lesson to confirm the iSpring content loads inside Thinkific.
7. Publish the lesson when ready.

---

## Quick Reference

| Step | Action |
|------|--------|
| 1 | Publish from iSpring → My Computer → HTML5 |
| 2 | Confirm export contains `index.html` and `data/` |
| 3 | Copy export into `staging/ispring-imports/<course>/unit<N>/` |
| 4 | Commit and open a pull request for review |
| 5 | Run `./scripts/promote-unit.sh <course> <unit-dir>` to move to `public/courses/` |
| 6 | Update course `index.html`: remove `upcoming` class and "Coming soon" badge |
| 7 | Commit promotion changes and push |
| 8 | After merge, verify the unit loads at the Vercel production URL |
| 9 | Add the Vercel URL as the lesson link in Thinkific |

---

## Why Not Commit Directly to `public/`?

| | Staging (`staging/ispring-imports/`) | Live (`public/`) |
|---|---|---|
| Served by Vercel | ❌ No | ✅ Yes |
| Safe for review before go-live | ✅ Yes | ❌ Immediately live on merge |
| Tracked in Git | ✅ Yes | ✅ Yes |

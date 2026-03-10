# Adding New iSpring HTML5 Learning Units

This guide explains the standard workflow for publishing a new iSpring learning unit and integrating it into the repository.

## Prerequisites

- iSpring Suite (or iSpring Suite Max) installed and the source presentation ready to publish.
- Write access to this repository.

---

## Step 1 – Publish from iSpring as HTML5

1. Open the presentation in PowerPoint with the iSpring Suite add-in active.
2. Click **Publish** in the iSpring Suite ribbon.
3. Choose **My Computer** as the publish destination.
4. Under **Output format**, select **HTML5**.
5. Set the **Local folder** output path to a convenient temporary location (e.g. `~/Desktop/unitN-export`).
6. Click **Publish** and wait for the export to complete.

---

## Step 2 – Confirm the Output

Before copying files into the repository, verify that the iSpring export produced the expected structure:

```
unitN-export/
├── index.html          ← entry point loaded by the browser
└── data/               ← assets: slides, audio, JS, CSS, etc.
    ├── browsersupport.js
    └── …
```

Both `index.html` **and** the `data/` folder must be present. If either is missing, re-publish from iSpring.

---

## Step 3 – Add the Unit Folder to the Repository

Create a new folder for the unit under the relevant course directory:

```
public/courses/<course-id>/unit<N>/
```

For example, for Unit 2 of the `vpshr-level-0` course:

```
public/courses/vpshr-level-0/unit2/
```

If a placeholder `index.html` already exists in that folder (e.g. a "Content coming soon" page), **replace it** with the iSpring export. Copy the entire contents of the iSpring output directory into the unit folder:

```
public/courses/vpshr-level-0/unit2/
├── index.html          ← copied from iSpring export (replaces placeholder)
└── data/               ← copied from iSpring export
    └── …
```

> **Note:** The placeholder `index.html` references `../placeholder.css`. The iSpring-exported `index.html` does **not** load `placeholder.css`, so that file can be left in place at the course level — it is only used by remaining placeholder units.

---

## Step 4 – Update the Course Landing Page

Open `public/courses/<course-id>/index.html` and promote the unit's link from *upcoming* to *live*:

**Before (placeholder / upcoming):**

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
- Remove the `aria-label` attribute (it was only needed to describe the coming-soon state).
- Remove the `<span class="badge">Coming soon</span>` sibling element.

---

## Step 5 – Commit and Push

Stage all changes and open a pull request:

```bash
git add public/courses/<course-id>/unit<N>/
git add public/courses/<course-id>/index.html
git commit -m "Add Unit N iSpring HTML5 export for <course-id>"
git push origin <your-branch>
```

Open a pull request against `main`. Once approved and merged, Vercel will deploy the updated content automatically.

---

## Quick Reference

| Step | Action |
|------|--------|
| 1 | Publish from iSpring → My Computer → HTML5 |
| 2 | Confirm export contains `index.html` and `data/` |
| 3 | Copy export into `public/courses/<course>/unit<N>/` (replace placeholder) |
| 4 | Update course `index.html`: remove `upcoming` class and "Coming soon" badge |
| 5 | Commit, push, and open a pull request |

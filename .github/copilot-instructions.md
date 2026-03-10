# Copilot / Coding-Agent Instructions

## Repository overview

This repository hosts the APGI Training platform.
Live course content lives under `public/` and is served by Vercel.
A staging intake area exists at `staging/ispring-imports/` for reviewing new iSpring exports before they go live.

---

## Staging area rules

- `staging/ispring-imports/` is a **non-public intake area**.
- Files committed to `staging/` are **never served to end users** — Vercel only serves the `public/` directory.
- **Never treat staged files as deployed content.**
- **Never link to, reference, or embed files from `staging/` in any page under `public/`.**
- Only content under `public/` is live and accessible by learners.

---

## Agent promotion workflow

When instructed with a prompt such as:

> "I uploaded a new iSpring package to `staging/ispring-imports/vpshr-level-0/unit2/`.
> Please validate it, promote it into the live course structure, replace the placeholder,
> update the course landing page, and prepare it for deployment."

Follow the steps below exactly. **Do not skip or reorder them.**

### Step A — Validate the staged package

Before touching anything in `public/`, confirm the staged folder contains both required items:

```
staging/ispring-imports/<course-id>/<unit-dir>/
├── index.html   ← required
└── data/        ← required (directory)
```

- If `index.html` is missing → **stop and report the error**. Do not promote.
- If `data/` is missing → **stop and report the error**. Do not promote.
- If both are present → proceed to Step B.

### Step B — Promote the package

Use the provided promotion script from the repository root:

```bash
./scripts/promote-unit.sh <course-id> <unit-dir>
```

For example:

```bash
./scripts/promote-unit.sh vpshr-level-0 unit2
```

The script will:

1. Re-validate the staging source (index.html + data/ present).
2. Confirm the destination course directory exists in `public/courses/`.
3. Remove only the specific unit directory at the destination (e.g. the placeholder page) — never the whole course directory.
4. Move the staged unit into `public/courses/<course-id>/<unit-dir>/`.
5. Stage the moved files with `git add` and remove the staging path from Git tracking.

> **Never use `rm -rf` directly on course directories.** Always use `./scripts/promote-unit.sh`.

### Step C — Update the course landing page

Open `public/courses/<course-id>/index.html` and promote the unit link from *upcoming* to *live*.

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

### Step D — Stage and commit the changes

```bash
git add public/courses/<course-id>/<unit-dir>/
git add public/courses/<course-id>/index.html
git commit -m "Promote <unit-dir> to production for <course-id>"
```

---

## Full publishing pipeline

```
iSpring export
    ↓
staging/ispring-imports/<course-id>/<unit-dir>/
    ↓
Agent: validate (Step A) + promote (Step B) + update landing page (Step C) + commit (Step D)
    ↓
public/courses/<course-id>/<unit-dir>/
    ↓
PR / merge
    ↓
Vercel deployment
```

---

## Key paths

| Path | Purpose |
|------|---------|
| `staging/ispring-imports/` | Non-public intake area for new iSpring exports |
| `public/courses/` | Live course content served by Vercel |
| `public/courses/<course-id>/index.html` | Course landing page — update unit links here |
| `scripts/promote-unit.sh` | Safe promotion helper script |
| `docs/ispring-intake-workflow.md` | Full end-to-end intake workflow reference |
| `docs/adding-learning-units.md` | Maintainer guide for adding new units |

---

## Related documentation

- [`docs/ispring-intake-workflow.md`](../docs/ispring-intake-workflow.md) — complete step-by-step intake process
- [`docs/adding-learning-units.md`](../docs/adding-learning-units.md) — maintainer guide
- [`scripts/promote-unit.sh`](../scripts/promote-unit.sh) — promotion script with inline safety documentation

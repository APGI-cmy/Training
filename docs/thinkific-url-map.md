# Thinkific URL Map

This document maps each hosted learning unit to the Thinkific lesson that references it.

The Vercel URLs listed here correspond directly to the repository structure under `public/courses/`.

---

## VPSHR Level 0

| Unit | Vercel URL | Thinkific Lesson | Status |
|------|------------|------------------|--------|
| Unit 1 | https://training-three-rosy.vercel.app/courses/vpshr-level-0/unit1/ | Unit 1 – The Meaning of Human Rights | Live |
| Unit 2 | https://training-three-rosy.vercel.app/courses/vpshr-level-0/unit2/ | Unit 2 | Coming soon |
| Unit 3 | https://training-three-rosy.vercel.app/courses/vpshr-level-0/unit3/ | Unit 3 | Coming soon |
| Unit 4 | https://training-three-rosy.vercel.app/courses/vpshr-level-0/unit4/ | Unit 4 | Coming soon |
| Unit 5 | https://training-three-rosy.vercel.app/courses/vpshr-level-0/unit5/ | Unit 5 | Coming soon |

---

## VPSHR Level 1

| Unit | Vercel URL | Thinkific Lesson | Status |
|------|------------|------------------|--------|
| Unit 1 | https://training-three-rosy.vercel.app/courses/vpshr-level-1/unit1/ | TBD | Coming soon |

---

## Maintainer Guide

### Adding a new course

1. Create a new directory under `public/courses/` using the course ID as the folder name (e.g. `public/courses/vpshr-level-2/`).
2. Add an `index.html` landing page for the course (see `public/courses/vpshr-level-0/index.html` as a reference).
3. Add a new section to this document following the same table format as the sections above.

### Adding a new unit to an existing course

1. Create the unit folder under the relevant course directory (e.g. `public/courses/vpshr-level-0/unit6/`).
2. Add a placeholder `index.html` for the unit, or copy the iSpring HTML5 export directly if content is ready.
3. Update the course landing page (`public/courses/<course-id>/index.html`) to include the new unit link.
4. Add a new row to the table in this document for the new unit, setting **Status** to `Coming soon` until the unit is live.
5. See `docs/adding-learning-units.md` for the full step-by-step publishing workflow.

### Updating a Thinkific lesson title

Once a Thinkific lesson is created and its title is confirmed:

1. Locate the relevant row in this document.
2. Update the **Thinkific Lesson** column with the full lesson title.
3. Change the **Status** column from `Coming soon` to `Live`.

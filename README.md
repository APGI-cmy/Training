# APGI Training Platform

This repository hosts the APGI training site and the published VPSHR course assets. The current application is a Next.js and TypeScript learning platform that wraps the existing iSpring exports in responsive course pages.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/courses/vpshr-level-0`.

## Production build

```bash
npm run build
npm run start
```

The build is deploy-ready for Vercel. Vercel should detect the `nextjs` framework from `vercel.json`.

## Course routes

- `/courses/vpshr-level-0` - VPSHR Level 0 landing page
- `/courses/vpshr-level-0/introduction` - orientation unit
- `/courses/vpshr-level-0/lu1` through `/courses/vpshr-level-0/lu13` - learning units
- `/courses/vpshr-level-0/unit1` style URLs redirect to the matching `lu` route

The original published files remain under `public/courses/vpshr-level-0/` and are embedded from the new learning-unit pages.

## Branch strategy

- `main`: long-term APGI Learning Portal / LMS development
- `urls-module`: stable Thinkific URL publishing branch

See [docs/agent-handover.md](docs/agent-handover.md) for operational handover context and [docs/thinkific-url-map.md](docs/thinkific-url-map.md) for canonical Thinkific routes.

## Content model

Course metadata is JSON-driven from `src/data/vpshr-level-0.json`. Each unit can define:

- learning objectives
- MP4, image, audio, and embedded published-course media
- content slide cards with thumbnails
- quizzes using multiple choice, true/false, multiple response, matching, and drag-the-words questions
- non-graded survey and scenario prompts
- summaries and unit-to-unit navigation

## Thinkific integration

Use the clean Next.js routes as Thinkific lesson links or embeds. The embedded iSpring exports continue to use the existing static paths, so historical links can remain available while the Next.js pages provide the modern learner experience.

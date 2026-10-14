# APGI Training Version 2 environment separation

Version 2 development uses a separate checkout, hosting project and database. Version 1 continues to serve officially enrolled learners through its existing address. This setup does not transfer or upgrade their courses, accounts, enrolments, assessments or saved progress.

## Environments

| Resource | Version 1 live | Version 2 test |
| --- | --- | --- |
| Git branch | `main` | `v2-development` |
| Release baseline | `v1.0.0`, commit `4391e39c9aeebb5caa4d94adabc3072c736f8061` | Same baseline plus staging safeguards |
| Website | https://training-platform-kappa.vercel.app | https://training-platform-v2-staging.vercel.app |
| Vercel project | `prj_ORt9BeL7D469cnEOZs04cyHD5s5y` | `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf` |
| Supabase project | `ooujszdvncwijbuzpjfp` | `eaaqgtdpvbxdgjxphjie` |
| Supabase branch | Production | `v2-staging`, persistent |
| Email | Existing live service | Disabled |
| Payments | Manual enrolment release | Disabled |
| AWS Viewer | Existing live fleet and role | Disconnected |

The test website requires Vercel sign-in. Platform accounts remain separate: a live password or administrator session does not grant a staging account. Test accounts must be created separately. A page banner identifies Version 2, and all pages request exclusion from search indexing.

## Work locations

Keep the live checkout at `C:\Users\Johan\OneDrive\Documents\GitHub\Training` on `main`. Use `C:\Users\Johan\.codex\worktrees\training-platform-v2` for Version 2 work. This checkout is outside OneDrive and links only to the new hosting project. Credentials are in ignored local configuration and sensitive Vercel variables. Never copy the live environment file.

## Database baseline

The persistent branch was created without production data. Automatic replay failed because the provider migration history omitted the original base schema. Repository migrations were applied directly to the isolated project. Three current core function definitions and an archived schema migration were restored from production schema metadata; no table contents were copied. Explicit staging grants retain row-level security on all 42 public tables.

The historical replay badge may still show `MIGRATIONS_FAILED`; direct schema, REST, Auth and application checks determine the repaired project's operational status. Do not reset, rebase or merge the branch to resolve that historical badge. The separate project is `ACTIVE_HEALTHY`.

Before creating test accounts, verified counts were zero Auth users, learners, enrolments, invitations, SCORM attempts and stored files. Static course files are unchanged. Private storage belongs to the separate project even where bucket names match.

## Safeguards and verification

Build and server startup reject the live database endpoint, wrong hosting project, live application address, mismatched legacy keys and connected email, payment or AWS credentials. Database requests repeat the isolation check. Staging email methods return without contacting a provider. Viewer configuration is unavailable even if settings are accidentally inherited.

Local checks passed: 105 release and isolation tests, 51 established regression tests, TypeScript checking and a complete Next.js build. All 74 MP4 objects remain actual media. Anonymous requests cannot read invitations. Privileged REST and Auth requests use the new database's credentials.

Supabase's approved branch compute quote on 14 October 2026 is US$0.01344 per hour, approximately US$9.81 per 730 hours, excluding tax and additional usage. The dashboard states billing continues until removal. This approval does not cover paid feature upgrades or additional Viewer fleets.

## Future development and releases

Develop on `v2-development` or branches based on it. Target development pull requests to `v2-development`, not `main`. Deploy explicitly to the new Vercel project. Neither the new host nor the database has an automatic Git connection to the production branch. Existing V1 hosts may attempt preview builds after a development push; the V2 guard rejects their inherited configuration before the application build.

Never merge this staging setup into `main`, promote it over the live address, apply its migrations to the live database, or merge the Supabase test branch into production. A future learner release needs explicit approval, a plan for existing enrolments and progress, migration review, a fresh backup and rollback plan, and final learner-flow QA. Per-enrolment course version selection is a future feature; environment separation alone does not provide it.

Continue inviting real learners through Version 1. Use fictional test records in Version 2. A dedicated staging administrator account and private authentication message capture are now configured; see [Version 2 features and QA](platform-v2-features-and-qa.md). Payments and Viewer streaming remain disabled.

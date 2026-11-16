# Private courses awaiting publication in the signed-in catalogue

Tiger Kidnapping was registered and available in its NKS Capital review, but
absent from the learner catalogue because it is client-specific and had no
published organisation offering. Its existing review was open at commercial
sign-off. This change adds catalogue visibility for the authorised review team
and verified platform principals without granting enrolment or publishing it.

While under review, the card shows the course cover, title, company, **Under review**, workflow stage
and **Open course review**. It displays no unapproved price or learner-enrolment
action. The existing review route checks access again when opened.

Review visibility is checked separately from learner availability. A confirmed
email must match a non-declined participant, unless verified platform-principal
access is established. The service filters results again before returning only
the card metadata. Lookup failures do not expose private metadata. Courses
already visible as learner offerings are not duplicated, and the My Learning
view excludes review-only cards. Public legacy course pages and company-course
publication/enrolment checks remain in place.

After publication, a principal or assigned reviewer outside the company's learner
audience retains a **Published company course** card and **View publication
record** action. The card explains that the company manages learner access.
Company learners continue to receive the normal published offering card through
the existing availability checks.

Verification: 728 release tests passed across 71 files; TypeScript passed.
New tests cover the real catalogue rendering, review-only action, exclusion from
My Learning, no duplicates, private/unassigned/declined access, principal access
and lookup failure. Read-only V2 inspection confirmed the existing private
catalogue setting, open review and absent published offering. No catalogue
permissions, enrolments, reviews, agreements or offerings were modified in the
database, and no email was sent.

Release: implementation commits `815b006` and `27e1bea`; deployment
`dpl_3EWTepQMNPU4ZjiQpPYprgjoLvj7` was verified READY / PROMOTED on the canonical
V2 staging alias at `27e1beaa2cee5d2c9a021977636f0a7c3b78e56d`, in project
`prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf`. The prior intermediate staged build was
not promoted. The new deployment returned zero runtime error records in the
07:50:59–08:05:59 UTC scan on 26 October 2026 (09:50:59–10:05:59 South African time).

The final signed-in live Edge check passed on 26 October 2026 after the user
signed in. The canonical catalogue displays the Tiger Kidnapping card for
NKS Capital with **Under review**, **Commercial sign-off**, and **Open course
review**. Opening that link reached the existing review
`f1ef8430-64d6-410d-abdf-18a1c0260ded`, showing the correct course title, company,
review team and commercial preparation workflow. The tab was returned to the
catalogue without submitting or changing review data. Live screenshot:
`C:/Users/Johan/Codex-Work/catalogue-review-listing-20261026/live-catalogue.jpg`.

Earlier local visual verification rendered the actual card component, course
data and cover with the NKS review metadata. Its temporary localhost-only page
was created after deployment, never committed or deployed, and removed after
the check. Full local preview evidence:
`C:/Users/Johan/Codex-Work/catalogue-review-listing-20261026/catalogue-card-preview.jpg`.

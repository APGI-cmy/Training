# Private courses awaiting publication in the signed-in catalogue

Tiger Kidnapping was registered and available in its NKS Capital review, but
absent from the learner catalogue because it is client-specific and had no
published organisation offering. Its existing review was open at commercial
sign-off. This change adds catalogue visibility for the authorised review team
and verified platform principals without granting enrolment or publishing it.

The card shows the course cover, title, company, **Under review**, workflow stage
and **Open course review**. It displays no unapproved price or learner-enrolment
action. The existing review route checks access again when opened.

Review visibility is checked separately from learner availability. A confirmed
email must match a non-declined participant, unless verified platform-principal
access is established. The service filters results again before returning only
the card metadata. Lookup failures do not expose private metadata. Courses
already visible as learner offerings are not duplicated, and the My Learning
view excludes review-only cards. Public legacy course pages and company-course
publication/enrolment checks remain in place.

Verification: 727 release tests passed across 71 files; TypeScript passed.
New tests cover the real catalogue rendering, review-only action, exclusion from
My Learning, no duplicates, private/unassigned/declined access, principal access
and lookup failure. Read-only V2 inspection confirmed the existing private
catalogue setting, open review and absent published offering. No catalogue
permissions, enrolments, reviews, agreements or offerings were modified in the
database, and no email was sent.

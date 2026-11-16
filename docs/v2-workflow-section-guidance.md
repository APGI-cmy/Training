# Course workflow section guidance

21 October 2026.

The progress guide and the page sections use the same `publicationGuide` model. Every relevant section has a top-right green tick or red cross badge with its matching workflow step number and completion text. Substeps use stable numbered paths (2.1 learning units, 2.2 reports, 2.3 independent checks). Badges describe saved evidence; they do not record an approval or change any publication requirement.

The content-review overview explains team report and endorsement progress. The learning-unit section explicitly describes the signed-in reviewer's coverage where assigned, while report and independent-check sections show the whole team's requirements and identify the pending reviewers. Thus one reviewer's green coverage does not imply that team content review is complete. The findings section is associated with step 3, corrections and verification, while commercial, branding, final content clearance and publication sections use their respective guide steps.

Guide links open the exact page section. A small client navigator expands the target's ancestor details, scrolls it into view, and focuses it; the target receives a visible outline. Repeated clicks on the same section link work after a panel has been collapsed. Reduced-motion preferences are respected. The underlying review document, findings, submitted reports, endorsements, content fingerprint, commercial decisions and publication gates remain unchanged.

Inactive-company notification handling: a request for an inactive or missing company no longer counts as pending, is not newly seeded as an action, and opens an explanatory archived-history target rather than an unavailable company page. Active-company requests continue to require a response and open the company's change-request section. Requests and receipts are preserved; no request is approved, declined or marked completed by this correction.

Verification includes saved-coverage versus team-progress regression tests, accessible numbered status rendering, separate correction status and direct clearance targets, the release suite, transaction-only active/inactive company checks, and deployed browser checks. The transaction script is `scripts/qa/inactive-company-notification-transaction.sql`.

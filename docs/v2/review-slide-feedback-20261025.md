# Current-slide and course-wide review feedback

The feedback reference is a choice between **Current slide** and **Applicable to
all slides**. New current-slide feedback records the iSpring slide number and
any title supplied by the player automatically. Editing an older finding retains its saved reference.
Comments remain optional and do not determine the finding status.

Course-wide findings are stored once in the review round, shown in every LU's
saved feedback and labelled **ALL LEARNING UNITS** in the shared workspace.
Discussion, screenshots, corrections and independent verification refer to the
same finding. Scope and earlier evidence are retained when a finding is edited.
This scope covers the course's assigned review team and learning units; it does
not cross company or unrelated course-review boundaries or confirm LU coverage.

The review-only connector listens to iSpring's exported registration and
slide-change events. It never sets SCORM values, changes playback, records
learner progress or changes the delivered course packages. Unknown slide
positions block a new current-slide save rather than inventing a reference.

Screenshot attachment accepts Ctrl+V, the **Paste screenshot** button or an image
file. It shows a preview and lets the reviewer remove a draft attachment. Use
Windows + Shift + S for a cropped capture. PNG/JPEG/WebP and the existing 2 MB
limit apply; private storage and server-side image sanitisation are retained.

Verification: 697 release tests passed; TypeScript and the production build
passed. The transactional V2 database test saved the shared scope/history,
rejected a stale revision and rolled back its fixture without queuing mail.
Course fingerprints and playback engine sources were unchanged.

Browser verification on the released V2 page detected Slide 1 and updated the
reference to Slide 2 after navigation. Ctrl+V attached a cropped test image,
which was saved through the real action into private storage. The same single
course-wide finding appeared in a second LU. The isolated QA round, image,
history and notifications were removed afterwards; existing reviewer drafts,
findings and coverage were not changed. A temporary local preview used for
diagnosis was removed before handoff.

The hourly review job picked up the isolated QA round and sent two QA-labelled
messages (reminder and progress digest) to the requester's APGI address. The
test's team contained only that requester; no other reviewer received QA mail.
The round was cancelled immediately after this was discovered and then removed.

Deployment: `dpl_2z6ZG4xSDh5KfuXWbjLdPXvbQ5u4`, source commit
`5cda9495ff066ef4eb8b89758374eefaef4b3617`, V2 staging only.

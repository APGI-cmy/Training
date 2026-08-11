# FRS Addendum — W4.2 Learner Management Experience

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-LMX-001 | Administrators can locate learner records without typing opaque user IDs. | Role-gated directory supports name/email search, paging and clear empty states. |
| FR-ALP-LMX-002 | Directory rows present only operationally necessary learner data. | Name, email, joined date, enrolment count and status summaries are shown; no credentials, tokens or sensitive invitation metadata are exposed. |
| FR-ALP-LMX-003 | Invitation setup is clear and safe before lifecycle approval. | Required details are validated client-side; UI identifies the result as a non-mutating draft and has no invocation of creation actions. |
| FR-ALP-LMX-004 | Bulk intake is understandable before execution is authorised. | CSV template download, local file selection, delimiter/header validation and row summaries are available; execute/import remains disabled. |
| FR-ALP-LMX-005 | Administrator preview can use the full viewport. | An administrator-only route launches the same published content in a full-page viewport with return navigation and an explicit non-mutation boundary. |
| FR-ALP-LMX-006 | Existing invitation and enrolment authority remains protected. | No new data mutation, provider call, email dispatch or lifecycle event is introduced. |

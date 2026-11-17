-- Corrected import registration, not reviewer approval or company publication.
-- Validated 2026-11-17: all 910 referenced resources in eight SCORM 2004 LUs,
-- LU5 identity Personal and Family Readiness, native 80% video/activity/quiz gates.
-- Exact delivered fingerprint: 9a757b0a89c05681015d35577149cdcd63784625f92719e5a81ea587a5818914.
-- Raw review, learner and financial records remain unchanged; offering publication
-- still requires its independently recorded approvals or explicit review exceptions.
update public.learning_units set title='Personal and Family Readiness',subtitle='Review the published presentation and its included quiz.'
where id='tiger-telecom-lu-5' and title='Unit 5 — Package Correction Required';
update public.courses set status='published' where id='tiger-kidnapping-telecommunications' and status='draft';

# Tiger native corrections — 19 November 2026

The complete native SCORM exports for Units 3, 4 and 5 are preserved in APGI-cmy/Training, branch `codex/tiger-published-packages-20261119`, commit `6c4603e32213ddd5eb3da767b4edadd3d0838f9d`. Runtime folders use LU3/LU4/LU5; the authoring export folders use LU 3/LU 4/LU 5.

Unit 3 accepts `assumptions`; Unit 5 accepts `Confirm calmly`. Literal asterisks were removed in the native QuizMaker projects, import workbooks and generator scripts. Other questions, settings and scores are preserved. Unit 4 slide 6 now contains TK-LU04-LA04, High-impact decisions, rather than a second LA01.

The stable progression version, unit IDs, editions, thresholds and database rows are retained. The corrected map expects `TK-LU04-LA04@6`. A saved Unit 4 pass can still use its original `TK-LU04-LA01@6` evidence when it has a recorded qualification date and quiz pass, its video coverage is complete, and all other activity summaries exist. This compatibility applies only to that corrected activity in that unit. It does not manufacture new evidence or make incomplete attempts pass. Incomplete learners keep their prior evidence and complete LA04 before passing.

The application and browser adapter share this rule. New evidence always uses LA04. No database migration, row rewrite, review change, certificate reissue, email resend or payment activation is required.

Producer verification: 24 targeted progression/player/endpoint/SCORM tests passed, TypeScript passed, all three archive integrity checks passed, and the final multipart release archive matches every patched file and contains every imported package resource. The native exported videos differ slightly in container duration (LU3 50.09 s, LU4 50.90 s, LU5 49.24 s) within the existing player tolerance; the authored video durations and saved viewing basis are retained.

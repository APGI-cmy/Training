# Email and invited learner visibility

Email management indexes learner invitation events and course review outbox metadata alongside existing email history. The backfill and database triggers never call an email provider or change invitations, review progress, accounts, enrolments or outbound queues. Unique source keys make repeated indexing safe. Independent review messages retain their existing ledger identities and appear as review updates.

Private joining links, HTML and invitation tokens are omitted from indexed history. Existing independent review body content is masked in history responses; future logging strips it before transport. Provider acceptance, provider delivery/open events and actual account activation remain separate. Review resends stay in their original reason-recording workflow. Learner resends use the existing audited invitation action.

The learner directory shows active, unexpired invitations in a separate paginated Awaiting registration section. Records are grouped by recipient and training provider. Redeemed, expired, revoked and already-enrolled course relationships are excluded from that pending section; their history remains in Email management and Invitations. No artificial profiles or progress are created. Search applies to the registered directory and the pending section.

Both functions enforce verified actor and company-management authority. Dedicated production sites force their configured tenant for email lists, details and pending learners. Staging and production databases remain separate; staging review sends are not copied into production.

Verification: focused unit tests; rollback-only database fixtures for indexing, retries, private-link masking, provider references, lifecycle filtering, search, pagination and access denial; NKS regressions; baseline comparison for unrelated existing full-suite failures. No real emails are sent by these checks.

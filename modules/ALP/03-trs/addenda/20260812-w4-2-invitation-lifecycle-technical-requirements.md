# Technical Requirements — W4.2 Persistent Invitation Lifecycle

- Supabase migrations define profile extensions, invitation events and constraints; every exposed table has RLS.
- National identity number is encrypted or otherwise protected at rest, access-controlled, masked by default and audited; no plaintext in browser logs, URLs or routine admin projections.
- Invitation operations use server-only code/registered Edge Functions, idempotency keys and a non-enumerating error model.
- Invitation token material is hashed at rest; raw tokens are never stored or logged.
- CV files use a private Storage bucket with ownership/RLS policies and metadata validation.
- Create/send/accept/redeem flows are transactional or safely idempotent, with audit events.
- Table-pathway, schema-to-hook and RLS-audit evidence are mandatory before closure.
- Tests must include all lifecycle and failure paths, plus an app-wide QA coverage manifest consumable by the App Management Centre.
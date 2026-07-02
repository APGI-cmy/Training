# W4 Enrolment + Payments Entry Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4 - Enrolment + Payments |
| Evidence Type | Entry governance decision |
| Date | 2026-07-02 |
| Status | Filed for W4 entry review |
| Branch | `alp-w4-enrolment-payments-entry` |
| Planned PR | W4 entry PR |
| Repository | APGI-cmy/Training |

---

## Decision

W4 Enrolment + Payments is authorized for entry after closure of the approved W3 database-backed progress scope.

This evidence file opens W4 governance only. It does not implement enrolment, payment handling, payment gateway integration, production payment flows, or full app delivery.

---

## Entry Basis

| Item | Status |
|---|---|
| W3 Progress + Completion | Closed for approved database-backed progress scope by PR #83. |
| GOV-ALP-083 normalization | Merged by PR #84. |
| ALP-CTRL-011 | Closed by PR #83. |
| ALP-CTRL-010 | Open and carried forward. |
| W4 implementation | Not started in this entry PR. |

---

## W4 Intended Scope

W4 should establish governed enrolment and payment readiness through controlled implementation slices.

Initial W4 scope includes:

1. Learner enrolment state.
2. Course access state.
3. Manual or administrative enrolment path.
4. Payment status model and audit trail.
5. Payment proof or payment gateway integration strategy.
6. Clear distinction between paid, pending, failed, cancelled, refunded, and manually granted access.
7. Evidence that enrolment state controls course access.

---

## Recommended Implementation Sequence

| Sequence | Slice | Purpose | Closure Requirement |
|---|---|---|---|
| W4.1 | Enrolment state and access gating | Establish who is enrolled and whether course access is allowed. | Database-backed proof plus UI proof. |
| W4.2 | Manual/admin enrolment | Allow governed non-payment enrolment for controlled users or pilots. | Audit trail and role-based control proof. |
| W4.3 | Payment status model | Store payment lifecycle safely before gateway integration. | Database proof and negative-path proof. |
| W4.4 | Payment provider integration decision | Select gateway and define integration controls. | Architecture and risk decision before live payments. |
| W4.5 | Payment execution slice | Implement provider integration only after W4.1-W4.4 are accepted. | Functional proof, security review, and payment sandbox proof. |

---

## Acceptance Gates for W4 Implementation

Before W4 can be closed, evidence must show:

- Enrolment is persisted in a database-backed source of truth.
- Course access is governed by enrolment/payment status.
- Manual/admin enrolment is auditable.
- Payment states are explicit and not inferred from UI-only behavior.
- Negative paths are tested, including unpaid, pending, failed, cancelled, and refunded states.
- No learner receives paid-course access unless governed access rules allow it.
- Payment integration, if implemented, uses sandbox proof before any live payment claim.
- Role and RLS behavior is verified for learner, admin, and unauthorized users.

---

## Carry-Forward Controls

| Control ID | Status | W4 Treatment |
|---|---|---|
| ALP-CTRL-003 | Open | Full app workflows remain incomplete until W4-W9 closure. |
| ALP-CTRL-004 | Open | CODE_PASS remains not claimed. |
| ALP-CTRL-005 | Open | FUNCTIONAL_PASS remains not claimed. |
| ALP-CTRL-006 | Open | CWT_PASS remains not claimed. |
| ALP-CTRL-010 | Open | Legacy iSpring embedded video playback remains open and carried forward. |
| ALP-CTRL-011 | Closed by PR #83 | No further W4 action unless regression is found. |

---

## Non-Claims

This W4 entry evidence does not claim:

- Full app delivery.
- CODE_PASS.
- FUNCTIONAL_PASS.
- CWT_PASS.
- Deployment acceptance.
- Production readiness.
- Live payment readiness.
- Payment gateway compliance.
- W4 implementation closure.

---

## Next Required Action

Open a W4 implementation slice after this W4 entry PR is reviewed and merged.

Recommended first implementation slice: W4.1 Enrolment state and course access gating.

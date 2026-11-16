# Requirement Registry Addendum — Batch 3 Stabilisation

| Registry ID | Upstream | QA target | Lane |
|---|---|---|---|
| REG-ALP-B3-001 | FR-ALP-B3-001 / TR-ALP-B3-001..002 | QA-ALP-B3-001..003 | Lane A |
| REG-ALP-B3-002 | FR-ALP-B3-002 / TR-ALP-B3-003 | QA-ALP-B3-004..006 | Lane A |
| REG-ALP-B3-003 | FR-ALP-B3-003 / TR-ALP-B3-004 | QA-ALP-B3-007..009 | Lane A |
| REG-ALP-B3-004 | FR-ALP-B3-004 / TR-ALP-B3-005 | QA-ALP-B3-010..011 | Lane A |
| REG-ALP-B3-005 | FR-ALP-B3-005..006 / TR-ALP-B3-006 | QA-ALP-B3-012..014 | Lane A |
| REG-ALP-B3-006 | FR-ALP-B3-007..010 / TR-ALP-B3-007..010 | QA-ALP-B3-015..020 | Lane A |
| REG-ALP-B3-007 | FR-ALP-B3-011..012 / TR-ALP-B3-011..012 | QA-ALP-B3-DP-001..008 | Delivery preflight |
| REG-ALP-B3-008 | FR-ALP-B3-013..014 / TR-ALP-B3-013..014 | QA-ALP-B3-GATE-001..004 | Governance/gate |

## Traceability rule

No Lane A implementation item may be accepted without its mapped executable test. Delivery preflight tests may remain RED because provider implementation is not authorised in Lane A, but they must precisely define the later contract and must not be included in a production-green claim until that lane is separately authorised.
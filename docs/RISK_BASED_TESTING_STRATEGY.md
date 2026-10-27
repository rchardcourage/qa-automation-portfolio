# Risk-Based Testing Strategy: PayVault demo

Test effort follows risk. Each feature is scored on business impact and failure likelihood (1 to 5), and the product decides how deep the testing goes and what blocks a release.

**Risk priority = impact × likelihood**

| Tier | Score | Test depth | Release gate |
|---|---|---|---|
| Critical | 20–25 | Smoke, sanity, boundary and negative tests, API and UI | No open defects |
| High | 12–19 | Happy path plus boundaries and negatives | Workaround required if open |
| Medium | 6–11 | Smoke and focused sanity | Non-blocking if documented |
| Low | 1–5 | Smoke only | Scheduled triage |

## Scoring for this app

| Feature | Impact | Likelihood | Score | Tier | Why it ranks here | Tests |
|---|---|---|---|---|---|---|
| Money transfer (balances, limits, idempotency) | 5 | 4 | 20 | Critical | Wrong balance or duplicate debit is direct financial loss | TC-TRF-001 to 010, TC-API-004/005/007 |
| Access control (admin vs customer) | 5 | 3 | 15 | High | Privilege escalation exposes other users' data and approvals | TC-RBAC-001 to 003, TC-API-002/003 |
| Loan quote and approval | 4 | 4 | 16 | High | Repayment maths and disbursement must be exact | TC-LOAN-001 to 006, TC-E2E-001, TC-API-008 |
| Authentication and lock-out | 4 | 3 | 12 | High | Account takeover and lock-out abuse | TC-AUTH-001 to 005 |
| Session expiry and sign-out | 3 | 3 | 9 | Medium | Stale sessions are a security and usability risk | TC-AUTH-006 to 008, TC-API-009 |
| Dashboard and activity history | 2 | 2 | 4 | Low | Read-only display of data verified elsewhere | covered through TRF-003 and E2E-001 |

## Test design techniques used

- **Boundary value analysis** on every limit: transfer minimum (₦99.99, ₦100), daily limit (₦300,000 then one more), loan amount (₦9,999, ₦10,000, ₦500,000, ₦500,001) and tenure (0, 1, 12, 13).
- **Equivalence partitioning** for invalid input: wrong type, zero, negative, too many decimals, empty.
- **State-based testing** for the loan lifecycle (Pending → Approved) and the lock-out counter.
- **Negative and security testing**: no user enumeration, 401 versus 403, malformed bodies, double approval.

## Release gate used by the suite

- **Smoke** (`@smoke`): login, a transfer, a loan application, the admin-denied check, the end-to-end loan journey and the API login contract. This runs first and blocks the rest.
- **Sanity** (`@sanity`): core checks after a build. **Regression** (`@regression`): the full boundary and negative set.
- Any failure on a Critical or High tier blocks the release. Anything unexplained on a money flow is a hold.

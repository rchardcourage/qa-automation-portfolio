# Risk-Based Testing (RBT) Framework & Test Prioritization Strategy

## 1. Mathematical Risk Scoring Matrix
In modern enterprise QA leadership, uniform test coverage is inefficient and risky. We deploy **Risk-Based Testing (RBT)** where:

$$\text{Risk Priority Number (RPN)} = \text{Business Impact} \times \text{Failure Likelihood}$$

Where $\text{Impact}, \text{Likelihood} \in [1, 5]$.

| Tier | RPN Range | Test Depth Policy | Release Gate Criteria |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | $20 - 25$ | Full 3-Tier (Smoke + Sanity + Deep Regression) | Zero open defects. P0 gate blocker. |
| **HIGH** | $12 - 19$ | Full 3-Tier (Automated happy paths + boundary checks) | Workaround required if open. |
| **MEDIUM** | $6 - 11$ | Smoke + Focused Sanity | Non-blocking if documented. |
| **LOW** | $1 - 5$ | Smoke only (navigation & load checks) | Scheduled triage. |

---

## 2. Dual-Track Testing Paradigm
To balance automated regression speed with compliance governance integrity:

1. **Track A — Automated Execution (Playwright / REST API)**:
   - High-frequency regression, deterministic mathematical formulas, CRUD lifecycles, and RBAC boundary gating.
2. **Track B — Governed Human Sign-Off Dossiers**:
   - Human-in-the-loop decisions, subjective ethical AI advice evaluation, and physical document permission checks.

# QA Automation Portfolio

[![Playwright E2E Tests](https://github.com/rchardcourage/qa-automation-portfolio/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/rchardcourage/qa-automation-portfolio/actions/workflows/e2e-tests.yml)

Playwright and TypeScript automation by **Richard Courage**, QA Lead. It tests **PayVault**, a small fintech demo app bundled in this repo (wallet transfers, loan applications, admin approvals), so every test can be run, read and verified by anyone who clones it. PayVault is purpose-built for this portfolio. It is not a client product, and it holds no real money or data.

**46 tests · UI + API + access control · Chromium, Firefox and WebKit · type-checked · runs in CI on every push**

## Run it

```bash
npm ci
npx playwright install        # one-time browser download
npm test                      # starts the demo app automatically
npm run report                # open the HTML report (traces, screenshots, video on failure)
```

Useful subsets: `npm run test:smoke`, `test:sanity`, `test:regression`, `test:api`.

## What is covered

| Area | Tests | Examples |
|---|---|---|
| Authentication and sessions | 8 | generic error on bad credentials (no user enumeration), lock after 3 failures, sign-out, expired session redirect |
| Wallet transfers | 13 | balance maths, ₦100 minimum and ₦300,000 daily-limit boundaries, insufficient funds, self-transfer, unknown recipient |
| Loans | 12 | repayment calculation (data-driven), amount and tenure boundaries, KYC gate, duplicate application |
| Access control and E2E | 4 | customers cannot reach admin pages, customer applies → admin approves → wallet credited |
| REST API | 9 | auth (401/403), response shape, idempotency keys, malformed JSON, type and precision validation, double approval (409) |

Tests carry `@smoke`, `@sanity`, `@regression` and `@api` tags, so a quick pre-release gate and a full regression run use the same suite.

## How it is built

- **Page Object Model** in `src/pages`: locators and actions live in one place; specs read like the test case. Locators prefer roles and labels, with `data-testid` where text is not stable.
- **Isolated tests**: an auto fixture resets the app before every test, and tests sign in through the API so UI tests stay focused on what they check.
- **Money handled carefully**: the app stores kobo as integers; tests assert exact formatted amounts and boundary values (₦99.99, ₦100, ₦300,000, ₦300,000 + 1 transfer).
- **Risk-based**: depth follows risk. See [docs/RISK_BASED_TESTING_STRATEGY.md](docs/RISK_BASED_TESTING_STRATEGY.md).
- **CI**: GitHub Actions runs the suite on all three browsers, type-checks first, and uploads the HTML report and traces.

## Do the tests catch bugs?

As a spot check, I injected five faults into the demo app and ran the suite each time. Every one was caught:

| Injected fault | Caught by |
|---|---|
| Loan interest changed from 4% to 5% | repayment-calculation tests (TC-LOAN-001) |
| Admin permission check removed | access-control tests |
| Daily limit off by one (`>` became `>=`) | daily-limit boundary test (TC-TRF-008) |
| Lock-out threshold moved from 3 to 4 attempts | TC-AUTH-005 |
| Idempotency handling disabled | TC-API-005 |

## Limits

- The suite runs against the bundled demo app only. It shows technique and structure, not a client system.
- Serial execution (one worker) because the demo app keeps state in memory. A real system would use per-test data and run in parallel.
- No visual regression, performance or accessibility checks yet.

## Layout

```
demo-app/        PayVault server and front end (no dependencies)
src/core/        fixtures and test data
src/pages/       page objects
src/tests/       specs (auth, transfers, loans, access-control, api)
docs/            risk-based testing strategy
.github/         CI workflow
```

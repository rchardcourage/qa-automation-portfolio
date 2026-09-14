# Enterprise QA Automation Portfolio

[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Testing-3A9B48.svg?logo=playwright)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6.svg?logo=typescript)](#)
[![CI/CD](https://img.shields.io/badge/GitHub%20Actions-Continuous%20Testing-2088FF.svg?logo=github-actions)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Page%20Object%20Model-orange.svg)](#)

> **Lead QA / Senior Test Automation Engineer:** Richard Courage Udoh  
> **Portfolio Showcase:** Scalable, enterprise-grade test automation architecture designed for complex, cross-module platforms.

---

## 1. Executive Summary
This repository showcases an end-to-end automated test engineering framework built with **TypeScript**, **Playwright**, and **GitHub Actions**. It reflects modern enterprise QA best practices:

- **Page Object Model (POM)** for resilient, maintainable locator abstraction.
- **Risk-Based Testing (RBT)** prioritizing tests based on Impact $\times$ Likelihood.
- **Dual-Track Testing Strategy**: Seamlessly balancing automated headless regression with governed human-in-the-loop audit verification.
- **Cross-Browser & Responsive Validation**: Automated matrix across Chromium, Firefox, and WebKit.
- **Production-Grade CI/CD Pipelines**: Automated regression runs with HTML artifact reporting and trace recording on failure.

---

## 2. Framework Architecture

```text
qa-automation-portfolio/
├── .github/workflows/           # CI/CD Automated Test Pipeline
│   └── e2e-tests.yml
├── docs/                        # QA Strategy & Engineering Architecture
│   └── RISK_BASED_TESTING_STRATEGY.md
├── src/
│   ├── core/                    # Reusable framework utilities & base classes
│   │   ├── BasePage.ts          # Root POM with resilient waiting mechanisms
│   │   └── env.ts               # Environment & configuration management
│   └── modules/                 # Modular domain-driven test suites
│       └── governance-hub/      # Enterprise Governance & Posture Module
│           ├── pages/           # Encapsulated Page Objects
│           └── tests/           # Executable Playwright specs (@smoke, @sanity)
├── reports/                     # HTML & JSON test artifacts
├── playwright.config.ts         # Multi-browser & viewport configuration
└── tsconfig.json                # Strict TypeScript compilation config
```

---

## 3. Quick Start & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run high-priority Smoke Suite
npm run test:smoke

# 3. Run full multi-browser test suite
npm test

# 4. View interactive HTML report with trace viewer
npm run report
```

---

## 4. Key Highlights for Hiring Managers
- **Zero Flakiness Locator Policy**: Prefers user-facing accessibility locators (`getByRole`, `getByPlaceholder`) and persistent `data-testid` attributes over fragile XPath selectors.
- **Trace Viewer Integration**: Failed tests automatically capture execution traces, DOM snapshots, network payloads, and videos for immediate root-cause analysis.
- **Mathematical Business Logic Verification**: Verifies complex deterministic calculations (e.g., scoring caps, risk matrices) directly against business requirements.

# Advanced Quality Assurance — Assignment 1
## QA Planning, Risk Assessment & Environment Setup
**System:** Fusion Electronics — MERN Stack E-Commerce Application
**Date:** March 2026

---

# Table of Contents

1. [System Description](#1-system-description)
2. [Risk Assessment](#2-risk-assessment)
3. [QA Test Strategy](#3-qa-test-strategy)
4. [QA Environment Setup](#4-qa-environment-setup)
5. [Baseline Metrics](#5-baseline-metrics)

---

# 1. System Description

## 1.1 Overview

**Fusion Electronics** is a production-ready, full-stack e-commerce web application built on the **MERN stack** (MongoDB, Express.js, React, Node.js). It enables users to browse products, manage a shopping cart, authenticate, and complete a checkout flow. Beyond standard e-commerce functionality, the system integrates an AI-powered product recommendation engine using vector databases (Pinecone) and Google Generative AI text embeddings.

The project was selected for its high architectural complexity, which makes it ideal for risk-based QA prioritization: it combines a REST API backend, a stateful React frontend, external AI services, asynchronous data pipelines, and a multi-stage CI/CD pipeline.

## 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│              React SPA — served via nginx:80                 │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST (via Axios + retry)
┌────────────────────────────▼────────────────────────────────┐
│               Express.js Backend — port 5000                 │
│                                                              │
│  Routes: /api/auth  /api/products  /api/checkout             │
│          /api/search  /api/orders  /health                   │
│                                                              │
│  Middleware: JWT Auth, CORS, Swagger UI                      │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
┌──────▼──────┐               ┌───────────▼───────────────────┐
│  MongoDB    │               │   External AI Services         │
│  (Primary   │               │                               │
│   DB)       │               │  Pinecone (vector DB)          │
│             │               │  Google Generative AI          │
│  Products   │               │  (768-D text embeddings)       │
│  Users      │               │                               │
│  Orders*    │               │  *Auto-synced via Mongoose     │
└─────────────┘               │   post-save hooks              │
                              └───────────────────────────────┘
```

## 1.3 Key Components

| Layer | Technology | Key Files |
|---|---|---|
| Frontend SPA | React 18, Material-UI, React Router v6 | `src/pages/`, `src/components/` |
| API Backend | Express.js, Node.js 18 | `backend/routes/`, `backend/index.js` |
| Database | MongoDB 6.0, Mongoose ODM | `backend/models/` |
| Authentication | JWT + bcryptjs | `backend/routes/auth.js`, `backend/middleware/auth.js` |
| Recommendations | Pinecone + Google AI | `backend/services/`, `backend/pineconeClient.js` |
| Testing | Jest, Supertest, React Testing Library | `backend/__tests__/`, `src/tests/` |
| CI/CD | GitHub Actions, Jenkins | `.github/workflows/ci.yml`, `Jenkinsfile` |
| Containerization | Docker, Docker Compose, Kubernetes | `Dockerfile`, `docker-compose.yml`, `deployment/` |

## 1.4 Application Pages & API Endpoints

**Frontend Pages (13):** Home, Shop, ProductDetails, Cart, Checkout, OrderSuccess, OrderTracking, Login, Register, ForgotPassword, ResetPassword, About, NotFoundPage

**Backend API Endpoints (16):**

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login + JWT issuance |
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (auth) |
| PUT | `/api/products/:id` | Update product (auth) |
| DELETE | `/api/products/:id` | Delete product (auth) |
| GET | `/api/products/:id/similar` | AI-powered recommendations |
| POST | `/api/checkout` | Submit and validate checkout |
| GET | `/api/search?q=` | Search products |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders |
| GET | `/health` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/db` | Database connectivity |
| GET | `/health/pinecone` | Vector DB connectivity |

---

# 2. Risk Assessment

## 2.1 Methodology

Risk is scored as: **Risk Score = Probability (1–5) × Impact (1–5)**

| Score Range | Risk Level |
|---|---|
| 16–25 | CRITICAL |
| 9–15 | HIGH |
| 4–8 | MEDIUM |
| 1–3 | LOW |

**Assumptions:**
- The system is evaluated in its current state (demo checkout, no real payment gateway, orders are not persisted to the database by design).
- External service failures (Pinecone, Google AI) are in scope since they are on the critical recommendation path.
- Risk ratings reflect potential production impact, not the current demo context.

## 2.2 Module Risk Analysis

### Module 1 — Order Management
**Files:** `backend/routes/orders.js`, `backend/models/order.js`

| | |
|---|---|
| **Probability** | 5 — Orders are confirmed to not persist to the DB |
| **Impact** | 4 — Users have no order history; cannot track orders |
| **Risk Score** | **20 — CRITICAL** |

**Reasoning:** The most critical production gap in the system. Any real user completing a purchase would expect their order to be saved. This is intentional demo behavior but represents the highest business risk if deployed. The order model schema exists but the route does not save documents.

---

### Module 2 — User Authentication
**Files:** `backend/routes/auth.js`, `backend/models/user.js`, `backend/middleware/auth.js`

| | |
|---|---|
| **Probability** | 3 — Moderate. JWT secret uses dev default; no rate limiting |
| **Impact** | 5 — All protected endpoints exposed; account takeover possible |
| **Risk Score** | **15 — HIGH** |

**Reasoning:** The foundation of all security. A flaw here exposes all user data and all authenticated operations. No rate limiting on login means brute-force attacks are possible. The dev JWT secret is not enforced to be changed.

---

### Module 3 — Product Catalog & Auto-Sync
**Files:** `backend/routes/products.js`, `backend/models/product.js`

| | |
|---|---|
| **Probability** | 3 — Pinecone sync hooks can fail silently on network errors |
| **Impact** | 5 — Broken product data causes revenue loss; desync corrupts AI recommendations |
| **Risk Score** | **15 — HIGH** |

**Reasoning:** The Mongoose `post('save')` and `post('findOneAndUpdate')` hooks trigger Pinecone syncs without propagating errors to the API response. If Pinecone is down, the product is saved to MongoDB but the vector is never updated — a split-brain condition that silently degrades recommendations.

---

### Module 4 — Checkout & Payment Validation
**Files:** `backend/routes/checkout.js`, `src/pages/Checkout.jsx`, `src/components/CheckoutForm.jsx`

| | |
|---|---|
| **Probability** | 3 — Custom regex validation has known edge cases (e.g., Amex 15-digit cards) |
| **Impact** | 5 — A broken checkout is an immediate, visible revenue-stopper |
| **Risk Score** | **15 — HIGH** |

**Reasoning:** The checkout endpoint uses custom regex for email, card number, expiry, and CVC validation. No real payment gateway means idempotency is not tested. The 3-second simulated delay masks what would be complex Stripe/Braintree timing in production.

---

### Module 5 — AI Recommendation Engine
**Files:** `backend/routes/products.js:218–332`, `backend/services/pineconeSync.js`, `backend/services/embeddingService.js`

| | |
|---|---|
| **Probability** | 4 — High dependency on two external APIs with rate limits and cold-start latency |
| **Impact** | 3 — Fallback heuristic is implemented; UX degrades but does not break |
| **Risk Score** | **12 — HIGH** |

**Reasoning:** The system queries Pinecone for top-5 similar products by cosine similarity and falls back to scoring by category/brand match if Pinecone fails. While the fallback exists, it returns less relevant results. Google AI quota exhaustion is not monitored or alerted.

---

### Module 6 — Vector DB Sync Pipeline
**Files:** `backend/models/product.js:68–117`, `backend/services/pineconeSync.js`

| | |
|---|---|
| **Probability** | 4 — External network call inside Mongoose hook; silent failure not surfaced |
| **Impact** | 3 — Recommendations degrade to heuristic; no user-facing error |
| **Risk Score** | **12 — HIGH** |

**Reasoning:** If `PINECONE_PURGE_ON_SYNC=true` is set and a sync crashes mid-way, the entire vector namespace is empty and all recommendations fall back to heuristic. This setting is the default, making it a particularly dangerous failure mode during product catalog updates.

---

### Module 7 — Search Functionality
**Files:** `backend/routes/search.js`, `src/components/SearchResults.jsx`

| | |
|---|---|
| **Probability** | 2 — Regex is simple; low catastrophic failure risk |
| **Impact** | 4 — Product discovery fails entirely if broken |
| **Risk Score** | **8 — MEDIUM** |

**Reasoning:** The search uses MongoDB regex on `name` and `description` fields. Special characters in user input can break the regex, and unsanitized input creates a ReDoS (Regular Expression Denial of Service) vulnerability. No input sanitization is present in the current implementation.

---

### Module 8 — Shopping Cart
**Files:** `src/pages/Cart.jsx`, `src/components/ShoppingCart.jsx`, `src/App.jsx`

| | |
|---|---|
| **Probability** | 2 — Client-side only; localStorage corruption is unlikely but possible |
| **Impact** | 4 — Users lose cart contents silently |
| **Risk Score** | **8 — MEDIUM** |

**Reasoning:** Cart state is managed via React Context API and persisted to localStorage under the key `fusionCart`. There is no server-side validation of cart integrity at checkout, and no handling of corrupted localStorage state.

---

### Module 9 — CI/CD Pipeline
**Files:** `.github/workflows/ci.yml`, `Jenkinsfile`

| | |
|---|---|
| **Probability** | 2 — Pipelines are mature and multi-stage |
| **Impact** | 4 — Broken pipeline removes automated quality gate |
| **Risk Score** | **8 — MEDIUM** |

**Reasoning:** GitHub Actions tests on Ubuntu, macOS, and Windows with Node 18/20. Jenkins supports blue-green and canary deployments with auto-rollback. Primary risk is missing or misconfigured GitHub Actions secrets (API keys) causing integration tests to fail silently.

---

### Module 10 — API Client & Retry Logic
**Files:** `src/services/apiClient.js`

| | |
|---|---|
| **Probability** | 2 — Retry logic is implemented; low risk |
| **Impact** | 3 — Network errors surface to users without retries |
| **Risk Score** | **6 — MEDIUM** |

**Reasoning:** The centralized Axios instance implements exponential backoff via a `withRetry()` wrapper. Risk is that not all frontend API calls consistently use this wrapper.

## 2.3 Risk Priority Matrix

| Priority | Module | Risk Score | Level |
|---|---|---|---|
| 1 | Order Management | 20 | **CRITICAL** |
| 2 | User Authentication | 15 | **HIGH** |
| 3 | Product Catalog & Auto-Sync | 15 | **HIGH** |
| 4 | Checkout Validation | 15 | **HIGH** |
| 5 | AI Recommendation Engine | 12 | **HIGH** |
| 6 | Vector DB Sync Pipeline | 12 | **HIGH** |
| 7 | Search Functionality | 8 | MEDIUM |
| 8 | Shopping Cart | 8 | MEDIUM |
| 9 | CI/CD Pipeline | 8 | MEDIUM |
| 10 | API Client & Retry Logic | 6 | MEDIUM |

**High/Critical modules: 6 | Medium: 4 | Low: 0**

## 2.4 Security Risk Summary

| Risk | Location | Severity |
|---|---|---|
| No rate limiting on auth endpoints | `backend/routes/auth.js` | HIGH |
| JWT secret uses dev default | `backend/.env` | HIGH |
| ReDoS potential in search | `backend/routes/search.js` | MEDIUM |
| No input validation on most endpoints | All routes except checkout | MEDIUM |
| CORS wildcard in dev mode | `backend/index.js` | MEDIUM |
| No server-side cart integrity check | Checkout flow | MEDIUM |

---

# 3. QA Test Strategy

## 3.1 Project Scope & Objectives

**In scope:**
- All 16 REST API endpoints (auth, products, checkout, search, orders, health)
- Frontend pages: Login, Register, Shop, ProductDetails, Cart, Checkout, OrderSuccess
- Vector DB integration (Pinecone sync hooks, embedding service — mocked in unit tests)
- Security: JWT flow, bcrypt hashing, CORS, input validation
- CI/CD pipeline health

**Out of scope (Assignment 1):**
- Real payment gateway integration
- Weaviate and FAISS vector DBs
- Mobile responsiveness / cross-browser testing
- Load/stress testing (planned for Assignment 3)

## 3.2 Test Approach

### Testing Pyramid

```
           /\
          /  \         E2E (Playwright) — planned Assignment 2
         /    \        Critical user journeys only
        /──────\
       /        \      Integration (Supertest + Jest)
      /          \     All API endpoints, DB interactions
     /────────────\
    /              \   Unit (Jest + React Testing Library)
   /________________\  Business logic, components, utilities
```

### High-Risk Areas First — Test Execution Order

**Week 1 — CRITICAL & HIGH risk modules:**
1. Review and extend authentication tests (JWT expiry, brute-force scenarios)
2. Add Pinecone sync failure test to products suite
3. Document and flag order non-persistence gap
4. Review checkout validation edge cases (Amex card, expired dates)

**Week 2 — MEDIUM risk modules + coverage gaps:**
5. Search endpoint ReDoS test
6. Cart localStorage corruption test
7. Recommendation fallback when Pinecone is mocked as down
8. CI/CD pipeline health verification

### Manual vs Automated

| Test Type | Approach | Reason |
|---|---|---|
| API endpoint validation | Automated (Supertest) | Fast, repeatable, runs in CI |
| Component rendering | Automated (React Testing Library) | Regression prevention |
| Security probing | Manual + automated | Requires exploratory judgment |
| Pinecone sync | Automated (mocked) | External service is paid/rate-limited |
| E2E user journeys | Automated (Playwright) — Assignment 2 | Full regression coverage |
| UI visual inspection | Manual + screenshots | Required for research paper |

## 3.3 Tool Selection

| Tool | Version | Purpose |
|---|---|---|
| Jest | ^29 | Test runner, assertions, mocking |
| React Testing Library | ^14 | React component testing |
| Supertest | ^6 | HTTP endpoint integration testing |
| Prettier | ^3 | Code formatting enforcement |
| Playwright | Planned | E2E browser automation |
| Newman | Planned | CLI Postman collection runner |
| k6 / JMeter | Planned | Performance/load testing |
| OWASP ZAP | Planned | Security scanning |

## 3.4 Coverage Targets

| Area | Current (Measured) | Target — Assignment 2 | Target — Final |
|---|---|---|---|
| Backend statements | 37.63% | >70% | >85% |
| Frontend statements | ~47% | >55% | >75% |
| API endpoints tested | 63% (10/16) | 90% | 100% |

## 3.5 Planned Metrics

| Metric | How to Measure | Target |
|---|---|---|
| Test coverage % | `npm run test:coverage` (Jest lcov) | >70% backend statements |
| Test pass rate | CI pipeline status | 100% before merge |
| API response time (P95) | Postman/k6 benchmark | <200ms product list |
| Recommendation latency | Backend logs | <500ms with Pinecone |
| Build time | GitHub Actions job duration | <10 minutes total |
| Mean Time to Detect (MTTD) | Push → CI failure notification | <10 minutes |

## 3.6 Entry & Exit Criteria

**Entry (start testing):**
- Application builds: `npm run build` succeeds
- Backend starts: `cd backend && npm start` with no errors
- MongoDB connection established
- All environment variables configured

**Exit (release gate):**
- All 61 tests pass
- No HIGH or CRITICAL bugs remain open
- Coverage does not drop below baseline (42%)
- CI pipeline green on master branch

---

# 4. QA Environment Setup

## 4.1 Tools Installed & Configured

### Testing Frameworks

| Tool | Config File | Environment |
|---|---|---|
| Jest (frontend) | `jest.config.js` | jsdom (browser simulation) |
| Jest (backend) | `backend/jest.config.js` | node |
| React Testing Library | `jest.setup.js` | — |
| Supertest | inline in spec files | — |
| Babel | `babel.config.js` | JSX + ESM transpilation |

### CI/CD Pipeline

| Tool | Purpose | File |
|---|---|---|
| GitHub Actions | Automated lint, test, Docker build | `.github/workflows/ci.yml` |
| Jenkins | Advanced deploy (blue-green, canary) | `Jenkinsfile` |
| Docker Compose | Local full-stack environment | `docker-compose.yml` |

### Code Quality

| Tool | Command |
|---|---|
| Prettier (format) | `npm run format` |
| Prettier (lint) | `npm run lint` |

## 4.2 Repository Structure

```
MERN-Stack-Ecommerce-App/
├── src/
│   ├── pages/              # 13 React pages
│   ├── components/         # 9 reusable components
│   ├── services/           # Axios API client
│   ├── context/            # React Context (cart, notifications)
│   └── tests/              # Frontend test files (Jest + RTL)
│       ├── Home.test.js
│       ├── Shop.test.js
│       ├── Cart.test.js
│       ├── Checkout.test.js
│       ├── Login.test.js
│       ├── Register.test.js
│       └── OrderSuccess.test.js
├── backend/
│   ├── routes/             # 5 API route files
│   ├── models/             # 3 Mongoose schemas
│   ├── services/           # Pinecone sync + Embedding
│   ├── middleware/         # JWT auth middleware
│   ├── __tests__/          # Backend test files (Jest + Supertest)
│   │   ├── auth.spec.js
│   │   ├── products.spec.js
│   │   ├── checkout.spec.js
│   │   ├── embeddingService.spec.js
│   │   └── search.spec.js
│   └── jest.config.js
├── .github/workflows/ci.yml
├── Jenkinsfile
├── docker-compose.yml
├── Dockerfile              # Frontend multi-stage build
├── backend/Dockerfile      # Backend Node.js image
├── openapi.yaml            # OpenAPI 3.0 spec
└── qa/                     # This QA documentation
    ├── RISK_ASSESSMENT.md
    ├── QA_TEST_STRATEGY.md
    ├── QA_ENVIRONMENT_SETUP.md
    ├── BASELINE_METRICS.md
    └── ASSIGNMENT_1_SUBMISSION.md
```

## 4.3 GitHub Actions Pipeline Breakdown

**Triggers:** Push to `master`, pull requests, manual dispatch

```
formatting ──────────────────────────────────────────────┐
                                                          │
backend-tests (Ubuntu × macOS × Windows / Node 18) ───── ► complete ──► docker ──► summary
                                                          │
frontend-tests (Node 18, Node 20) ───────────────────────┘

recommendation-sanity (3 scenarios: cold-start, diversity, performance)
```

**Screenshot placeholder — GitHub Actions pipeline:**

> **[SCREENSHOT 1]**
> Go to: GitHub repository → Actions tab → latest workflow run
> Show the green checkmarks on all jobs (formatting, backend-tests, frontend-tests, docker)

## 4.4 Test Execution

### Running Tests Locally

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Run all frontend tests with coverage
npm run test:coverage

# Run all backend tests with coverage
cd backend && npm run test:coverage
```

**Screenshot placeholder — Frontend coverage report:**

> **[SCREENSHOT 2]**
> Run `npm run test:coverage` in the terminal
> Capture the full coverage table printed at the end

**Screenshot placeholder — Backend coverage report:**

> **[SCREENSHOT 3]**
> Run `cd backend && npm run test:coverage` in the terminal
> Capture the full coverage table printed at the end

### Starting the Application (Docker)

```bash
docker compose up --build
```

**Screenshot placeholder — Docker Compose running:**

> **[SCREENSHOT 4]**
> Run `docker compose up --build` in the terminal
> Capture the terminal showing all 3 services started (backend, frontend, mongodb)
> OR show Docker Desktop with all 3 containers green/running

## 4.5 Application Screenshots

**Screenshot placeholder — Home page:**

> **[SCREENSHOT 5]**
> Open `http://localhost:3000`
> Capture the full home page with product carousel visible

**Screenshot placeholder — Shop / Product Listing:**

> **[SCREENSHOT 6]**
> Navigate to `http://localhost:3000/shop`
> Capture the product grid

**Screenshot placeholder — Checkout page:**

> **[SCREENSHOT 7]**
> Add a product to cart and navigate to checkout
> Capture the checkout form with credit card fields

**Screenshot placeholder — Swagger API Docs:**

> **[SCREENSHOT 8]**
> Open `http://localhost:5000/api-docs`
> Capture the Swagger UI showing all API endpoint groups

---

# 5. Baseline Metrics

## 5.1 System Size

| Area | LOC |
|---|---|
| Backend source (routes, models, services, middleware) | 1,881 |
| Frontend source (pages, components, services) | 4,968 |
| **Total project source** | **6,849** |

## 5.2 Test Inventory

### Backend Tests (Jest + Supertest)

| File | Test Cases | LOC | Coverage Focus |
|---|---|---|---|
| `auth.spec.js` | 13 | 163 | Register, Login, JWT validation |
| `products.spec.js` | 10 | 152 | CRUD, recommendations, Pinecone fallback |
| `checkout.spec.js` | 5 | 99 | Email, card, expiry, CVC validation |
| `embeddingService.spec.js` | 3 | 76 | Embedding generation (mocked Google AI) |
| `search.spec.js` | 3 | 67 | MongoDB regex search |
| **Total** | **34** | **557** | |

### Frontend Tests (Jest + React Testing Library)

| File | Test Cases | LOC | Coverage Focus |
|---|---|---|---|
| `Register.test.js` | 6 | 153 | Form rendering, validation, submit |
| `Login.test.js` | 5 | 92 | Form rendering, error states |
| `Home.test.js` | 4 | 72 | Page rendering, product display |
| `Shop.test.js` | 4 | 47 | Product listing, loading state |
| `Cart.test.js` | 4 | 48 | Cart operations |
| `Checkout.test.js` | 2 | 50 | Form rendering |
| `OrderSuccess.test.js` | 2 | 28 | Order success page |
| **Total** | **27** | **490** | |

**Grand total: 61 test cases across 12 test files**

## 5.3 Measured Coverage (from `npm run test:coverage`)

### Backend

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `auth.js` | 86.48% | 90.9% | 100% | 88.88% |
| `search.js` | 100% | 100% | 100% | 100% |
| `embeddingService.js` | 91.89% | 75% | 100% | 96.96% |
| `checkout.js` | 44.92% | 56.09% | 14.28% | 48.43% |
| `order.js` (model) | 33.33% | 0% | 0% | 34.48% |
| `pineconeClient.js` | 27.9% | 5.12% | 0% | 30% |
| `product.js` (model) | 26.08% | 0% | 0% | 30% |
| `products.js` | 20.13% | 2.81% | 14.28% | 23.07% |
| `pineconeSync.js` | 20% | 5.26% | 0% | 24.39% |
| `user.js` (model) | 100% | 100% | 100% | 100% |
| **Backend Total** | **37.63%** | **20.24%** | **20.68%** | **41.72%** |

### Frontend (key pages)

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `Login.jsx` | 100% | 91.66% | 100% | 100% |
| `Register.jsx` | 100% | 94.44% | 100% | 100% |
| `Cart.jsx` | 76.19% | 62.5% | 72.72% | 75% |
| `Shop.jsx` | 63.15% | 26.86% | 54.16% | 66.66% |
| `Checkout.jsx` | 61.53% | 53.96% | 60% | 62.85% |
| `Home.jsx` | 55.93% | 45% | 57.14% | 59.81% |
| `OrderSuccess.jsx` | 53.12% | 38.23% | 42.85% | 53.33% |
| `apiClient.js` | 31.81% | 25% | 33.33% | 36.84% |

## 5.4 Risk & Coverage Summary

| Metric | Value |
|---|---|
| Total source LOC | 6,849 |
| Total test cases | 61 |
| Backend test cases | 34 |
| Frontend test cases | 27 |
| All tests passing | **61/61 (100%)** |
| Backend statement coverage | **37.63%** |
| Overall statement coverage | **~42%** |
| API endpoints total | 16 |
| API endpoints with tests | 10 (63%) |
| HIGH/CRITICAL risk modules | 6 |
| MEDIUM risk modules | 4 |
| Identified test gaps | 12 |
| Open defects logged | 7 |
| Backend coverage target (Assignment 2) | >70% |
| Frontend coverage target (Assignment 2) | >55% |

## 5.5 Test Gap Analysis

| Gap | Risk | Priority |
|---|---|---|
| Orders not persisted — no integration test verifying this known behavior | CRITICAL | P1 |
| JWT expiry handling on protected endpoints | HIGH | P1 |
| Pinecone sync failure — no test for hook when Pinecone is down | HIGH | P1 |
| No rate limiting on `/api/auth/login` — no test | HIGH | P2 |
| ReDoS: no malicious regex input test for `/api/search` | MEDIUM | P2 |
| Cart localStorage corruption handling | MEDIUM | P2 |
| API retry backoff behavior (`withRetry()`) | MEDIUM | P3 |
| Health endpoints (`/health`, `/health/ready`, `/health/db`) | LOW | P3 |
| `ProductDetails.jsx` — no frontend test file (371 LOC uncovered) | HIGH | P2 |
| `NavigationBar.jsx` — no frontend test file (435 LOC uncovered) | MEDIUM | P3 |
| `CheckoutForm.jsx` — no dedicated test file (410 LOC uncovered) | HIGH | P2 |
| `OrderTracking.jsx` — no frontend test file (439 LOC uncovered) | MEDIUM | P3 |

## 5.6 Open Defect Register

| ID | Module | Description | Severity |
|---|---|---|---|
| DEF-001 | Orders | Orders not persisted to MongoDB — production risk | CRITICAL |
| DEF-002 | Auth | No rate limiting on login endpoint — brute-force possible | HIGH |
| DEF-003 | Auth | JWT secret uses dev default — must be overridden in production | HIGH |
| DEF-004 | Search | Regex input not sanitized — potential ReDoS vulnerability | MEDIUM |
| DEF-005 | Products | Pinecone sync failures are silent — not propagated to API response | MEDIUM |
| DEF-006 | Checkout | No server-side validation of cart contents before checkout | MEDIUM |
| DEF-007 | CORS | CORS configured for dev — wildcard origins in production | MEDIUM |

## 5.7 Estimated Testing Effort

| Phase | Assignment | Activities | Estimated Hours |
|---|---|---|---|
| Phase 1 | Assignment 1 (current) | Risk assessment, environment setup, coverage baseline, gap documentation | 11 |
| Phase 2 | Assignment 2 | E2E tests (Playwright), Postman collection (Newman), security tests, coverage to >70% | 24 |
| Phase 3 | Assignment 3 | Load testing (k6), advanced security, full coverage audit | 19 |
| **Total** | | | **54 hours** |

---

*All source documents are available in the `qa/` directory of the project repository.*

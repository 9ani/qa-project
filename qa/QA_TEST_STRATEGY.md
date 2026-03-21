# QA Test Strategy Document
## Fusion Electronics — MERN Stack E-Commerce Application
**Assignment 1 | Advanced Quality Assurance**
**Date:** 2026-03-19

---

## 1. Project Scope and Objectives

### 1.1 System Under Test

**Fusion Electronics** is a MERN (MongoDB, Express.js, React, Node.js) e-commerce web application with:
- User authentication (JWT-based)
- Product catalog with CRUD operations
- AI-powered product recommendations (Pinecone vector database + Google Generative AI)
- Shopping cart with localStorage persistence
- Checkout flow with card validation
- REST API with Swagger documentation (`/api-docs`)
- CI/CD via GitHub Actions and Jenkins
- Docker and Kubernetes deployment support

### 1.2 Objectives of This QA Effort

1. Validate functional correctness of all API endpoints and UI flows.
2. Verify security of authentication and authorization mechanisms.
3. Confirm reliability of the Pinecone auto-sync pipeline under normal and failure conditions.
4. Measure existing test coverage and identify gaps.
5. Establish a baseline for tracking quality improvement across subsequent assignments.

### 1.3 In Scope

| Area | Scope |
|---|---|
| Backend API endpoints | All 5 route files: auth, products, checkout, search, orders |
| Frontend pages | Authentication (Login, Register), Shop, ProductDetails, Cart, Checkout, OrderSuccess |
| Vector DB integration | Pinecone sync hooks, embedding service (Google AI mocked in unit tests) |
| Security | JWT flow, bcrypt hashing, CORS, input validation |
| CI/CD pipeline | GitHub Actions workflows, Docker build steps |
| Performance baseline | Response time targets for key endpoints |

### 1.4 Out of Scope (for Assignment 1)

- Real payment gateway integration (Stripe/Braintree) — demo checkout only
- Weaviate and FAISS vector DBs — Pinecone is primary
- Kubernetes canary/blue-green deployment pipelines (covered in deployment docs)
- Mobile responsiveness / cross-browser UI testing
- Load/stress testing (planned for a later assignment)

---

## 2. Risk Assessment Results (Summary)

Testing priorities are ordered by Risk Score (see full `RISK_ASSESSMENT.md`):

| Priority | Module | Risk Score | Test Type Focus |
|---|---|---|---|
| 1 | Order Management | 16 CRITICAL | Integration, Contract |
| 2 | User Authentication | 15 HIGH | Integration, Security |
| 3 | Product Catalog & Auto-Sync | 15 HIGH | Integration, Unit |
| 4 | Checkout Validation | 15 HIGH | Integration, Unit |
| 5 | AI Recommendation Engine | 12 HIGH | Integration, Unit (mocked) |
| 6 | Vector DB Sync Pipeline | 12 HIGH | Unit (mocked external APIs) |
| 7 | Search Functionality | 8 MEDIUM | Integration, Security (ReDoS) |
| 8 | Shopping Cart | 8 MEDIUM | Unit, Component |
| 9 | CI/CD Pipeline | 8 MEDIUM | Pipeline health checks |
| 10 | API Client & Retry Logic | 6 MEDIUM | Unit |

---

## 3. Test Approach

### 3.1 Testing Pyramid

```
         /\
        /  \       E2E Tests (Playwright)
       /----\      — Critical user journeys only (high cost)
      /      \
     /--------\    Integration Tests (Supertest + Jest)
    /          \   — All API endpoints, DB interactions
   /------------\
  /              \  Unit Tests (Jest + React Testing Library)
 /________________\ — Business logic, components, utilities
```

### 3.2 Testing Types

#### Unit Testing
- **Backend**: Jest for individual functions (validation logic, embedding service, sync service)
- **Frontend**: React Testing Library for component rendering and user interactions
- **Mocking strategy**: All external services (Pinecone, Google AI, MongoDB) are mocked

#### Integration Testing
- **Tool**: Supertest + Jest
- **Scope**: All REST endpoints tested end-to-end through the Express app
- **Database**: Real MongoDB instance (Docker Compose) or in-memory MongoDB (jest-mongodb)
- **External services**: Mocked via `jest.mock()` to avoid rate limits and costs

#### End-to-End Testing (Planned, Assignment 2)
- **Tool**: Playwright
- **Scope**: Critical user journeys:
  1. Register → Login → Browse → Add to Cart → Checkout
  2. Search for a product → View details → See recommendations

#### Security Testing (Planned, Assignment 2)
- JWT manipulation tests
- SQL/NoSQL injection attempts on search endpoint
- CORS policy validation
- ReDoS test on search regex

### 3.3 High-Risk Areas First

Testing execution order follows risk priority:

**Week 1 Focus (HIGH/CRITICAL):**
1. Authentication endpoint tests (existing: `auth.spec.js` — review and extend)
2. Checkout validation tests (existing: `checkout.spec.js` — review and extend)
3. Product CRUD + Pinecone sync tests (existing: `products.spec.js` — add sync failure scenarios)
4. Order persistence gap — document and flag

**Week 2 Focus (MEDIUM):**
5. Search endpoint edge cases (ReDoS test)
6. Frontend Cart component tests
7. Recommendation fallback tests (mocked Pinecone failure)
8. CI/CD pipeline health verification

### 3.4 Manual vs Automated

| Test Type | Approach | Reason |
|---|---|---|
| API endpoint validation | Automated (Supertest) | Repeatable, fast, in CI |
| Component rendering | Automated (RTL) | Regression prevention |
| Security probing | Manual + automated | Requires exploratory judgment |
| Pinecone sync verification | Automated (mocked) | External service is paid/rate-limited |
| E2E user journeys | Automated (Playwright) | Regression prevention post-Assignment 1 |
| UI visual inspection | Manual | Screenshots for research paper |

---

## 4. Tool Selection and Configuration

### 4.1 Testing Frameworks

| Tool | Version | Purpose | Location |
|---|---|---|---|
| **Jest** | ^29 | Test runner and assertion library | `package.json`, `backend/package.json` |
| **React Testing Library** | ^14 | React component testing | `package.json` |
| **Supertest** | ^6 | HTTP endpoint integration testing | `backend/package.json` |
| **Playwright** | (planned) | E2E browser automation | To be added |
| **Postman / Newman** | (planned) | API manual + automated collection | CLI via Newman |

### 4.2 Jest Configuration

**Frontend** (`jest.config.js`):
```js
// Environment: jsdom (browser simulation)
// Module mapper: handles CSS/image imports
// Setup file: jest.setup.js
// Test pattern: src/tests/*.test.js
```

**Backend** (`backend/jest.config.js`):
```js
// Environment: node
// Test pattern: backend/__tests__/*.spec.js
// Timeout: 30000ms (for async DB operations)
```

### 4.3 CI/CD Pipeline Tools

| Tool | Role |
|---|---|
| **GitHub Actions** | Automated lint, test (multi-OS, multi-Node matrix), Docker build |
| **Jenkins** | Advanced deployment pipeline (blue-green, canary) |
| **Docker Compose** | Local test environment orchestration |
| **GHCR** | Docker image registry (github.com container registry) |

### 4.4 API Documentation & Manual Testing

- **Swagger UI**: Available at `http://localhost:5000/api-docs` (running backend)
- **OpenAPI spec**: `openapi.yaml` at project root
- **Postman collection**: To be created from OpenAPI spec (Assignment 2)

### 4.5 Code Quality Tools

| Tool | Purpose | Command |
|---|---|---|
| **Prettier** | Code formatting | `npm run format` |
| **ESLint** (via Prettier) | Linting | `npm run lint` |

---

## 5. Test Coverage Plan

### 5.1 Existing Coverage (Baseline)

| Area | Test Files | Approx. Lines | Modules Covered |
|---|---|---|---|
| Backend Auth | `auth.spec.js` (163 lines) | 163 | Register, Login, JWT |
| Backend Products | `products.spec.js` (152 lines) | 152 | CRUD, Recommendations |
| Backend Checkout | `checkout.spec.js` (99 lines) | 99 | Validation rules |
| Backend Embedding | `embeddingService.spec.js` (76 lines) | 76 | Embedding generation |
| Backend Search | `search.spec.js` (67 lines) | 67 | Regex search |
| Frontend Home | `Home.test.js` (72 lines) | 72 | Page rendering |
| Frontend Login | `Login.test.js` (92 lines) | 92 | Form interactions |
| Frontend Register | `Register.test.js` (153 lines) | 153 | Form validation |
| Frontend Cart | `Cart.test.js` (48 lines) | 48 | Cart operations |
| Frontend Checkout | `Checkout.test.js` (50 lines) | 50 | Form rendering |
| Frontend Shop | `Shop.test.js` (47 lines) | 47 | Product listing |
| Frontend OrderSuccess | `OrderSuccess.test.js` (28 lines) | 28 | Confirmation page |

**Total existing test lines: ~1,047**

### 5.2 Coverage Gaps Identified

| Module | Gap | Priority |
|---|---|---|
| Order persistence | No test verifies orders ARE NOT saved (this is a known risk) | HIGH |
| Pinecone sync failure | No test for hook failure when Pinecone is down | HIGH |
| JWT expiry / refresh | No test for expired token handling | HIGH |
| ReDoS on search | No malicious regex input tests | MEDIUM |
| Cart localStorage | No test for corrupted localStorage state | MEDIUM |
| API retry logic | No test for exponential backoff behavior | MEDIUM |
| Health endpoints | No tests for `/health`, `/health/ready`, `/health/db` | LOW |

### 5.3 Target Coverage Goals

| Area | Current (Estimated) | Target (Assignment 1) | Target (Final) |
|---|---|---|---|
| Backend API lines | ~60% | 70% | 85% |
| Frontend components | ~40% | 55% | 75% |
| Security scenarios | ~20% | 40% | 70% |
| Integration paths | ~50% | 65% | 80% |

---

## 6. Planned Metrics

| Metric | How to Measure | Target |
|---|---|---|
| **Test coverage %** | `npm run test:coverage` (Jest lcov report) | >70% statements (backend) |
| **Test pass rate** | CI pipeline green/red status | 100% before merge |
| **Defect detection rate** | Bugs found by tests vs. found in manual review | Track per sprint |
| **Build time** | GitHub Actions job duration | <5 minutes total |
| **API response time** | Manual benchmark via Postman (P95) | <200ms for product list |
| **Recommendation latency** | Log-based timing in backend | <500ms with Pinecone |
| **Mean Time to Detect (MTTD)** | Time from code push to test failure notification | <10 minutes (CI) |

---

## 7. Test Environments

| Environment | Purpose | Configuration |
|---|---|---|
| **Local (dev)** | Developer testing | `npm run dev`, `.env` with real keys |
| **Docker Compose** | Integration testing | `docker compose up --build` |
| **CI (GitHub Actions)** | Automated regression | Ubuntu/Windows/macOS matrix, Node 18/20 |
| **Staging (Render)** | Pre-production validation | Docker container, free tier |
| **Production (Vercel)** | Live system | Auto-deploy on push to main |

---

## 8. Entry and Exit Criteria

### Entry Criteria (start testing)
- Application builds successfully (`npm run build`)
- Backend starts without errors (`cd backend && npm start`)
- MongoDB connection is established
- All environment variables are configured

### Exit Criteria (release gate)
- All existing tests pass (`npm test` and `cd backend && npm test`)
- No HIGH or CRITICAL severity bugs remain open
- Code coverage does not drop below baseline
- CI pipeline is green on the master branch

---

## 9. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| QA Lead | Risk assessment, test strategy, coverage tracking |
| Developer/QA | Writing unit and integration tests |
| CI/CD Owner | Maintaining pipeline, reviewing pipeline failures |
| Reviewer | Approving test strategy document, peer review of test cases |

---

## 10. Schedule (Assignment 1 — 2 Weeks)

| Week | Activities |
|---|---|
| Week 1 | Risk assessment, QA environment setup, review existing tests, identify gaps |
| Week 2 | Write missing high-priority tests (auth JWT expiry, Pinecone sync failure, order gap), measure baseline coverage, document metrics |

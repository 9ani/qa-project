# Baseline Metrics Report
## Fusion Electronics — MERN Stack E-Commerce Application
**Assignment 1 | Advanced Quality Assurance**
**Date:** 2026-03-19

> **Note:** Coverage percentages below are static estimates based on code analysis (source LOC vs. test LOC). Exact statement/branch coverage requires running `npm install && npm run test:coverage` once dependencies are installed in the local environment. Instructions are provided in `QA_ENVIRONMENT_SETUP.md`.

---

## 1. System Size Metrics

### 1.1 Backend Source Code

| Module | File | LOC |
|---|---|---|
| Products API | `backend/routes/products.js` | 636 |
| Auth API | `backend/routes/auth.js` | 316 |
| Checkout API | `backend/routes/checkout.js` | 245 |
| Orders API | `backend/routes/orders.js` | 128 |
| Search API | `backend/routes/search.js` | 80 |
| Product Model | `backend/models/product.js` | 121 |
| Order Model | `backend/models/order.js` | 143 |
| User Model | `backend/models/user.js` | 23 |
| Pinecone Sync Service | `backend/services/pineconeSync.js` | 92 |
| Embedding Service | `backend/services/embeddingService.js` | 79 |
| Auth Middleware | `backend/middleware/auth.js` | 18 |
| **Total Backend Source** | | **1,881 LOC** |

### 1.2 Frontend Source Code

| Module | File | LOC |
|---|---|---|
| Home Page | `src/pages/Home.jsx` | 720 |
| ProductDetails Page | `src/pages/ProductDetails.jsx` | 371 |
| OrderTracking Page | `src/pages/OrderTracking.jsx` | 439 |
| CheckoutForm Component | `src/components/CheckoutForm.jsx` | 410 |
| NavigationBar Component | `src/components/NavigationBar.jsx` | 435 |
| Checkout Page | `src/pages/Checkout.jsx` | 234 |
| Shop Page | `src/pages/Shop.jsx` | 247 |
| About Page | `src/pages/About.jsx` | 172 |
| Cart Page | `src/pages/Cart.jsx` | 97 |
| Login Page | `src/pages/Login.jsx` | 113 |
| Register Page | `src/pages/Register.jsx` | 143 |
| Support Page | `src/pages/Support.jsx` | 229 |
| ShippingReturns Page | `src/pages/ShippingReturns.jsx` | 182 |
| ProductCard Component | `src/components/ProductCard.jsx` | 143 |
| Footer Component | `src/components/Footer.jsx` | 207 |
| SearchResults Component | `src/components/SearchResults.jsx` | 72 |
| ShoppingCart Component | `src/components/ShoppingCart.jsx` | 62 |
| API Client Service | `src/services/apiClient.js` | 39 |
| Other pages/components | (Privacy, Terms, etc.) | ~294 |
| **Total Frontend Source** | | **4,968 LOC** |

**Total Project Source LOC: ~6,849**

---

## 2. Test Inventory (Baseline)

### 2.1 Backend Tests

| Test File | Test Cases | LOC | Modules Covered |
|---|---|---|---|
| `auth.spec.js` | 13 | 163 | Register, Login, JWT validation |
| `products.spec.js` | 10 | 152 | Product CRUD, recommendations, Pinecone fallback |
| `checkout.spec.js` | 5 | 99 | Email, card, expiry, CVC validation |
| `embeddingService.spec.js` | 3 | 76 | Embedding generation (mocked Google AI) |
| `search.spec.js` | 3 | 67 | MongoDB regex search |
| **TOTAL** | **34** | **557** | |

### 2.2 Frontend Tests

| Test File | Test Cases | LOC | Modules Covered |
|---|---|---|---|
| `Register.test.js` | 6 | 153 | Registration form, validation, submit |
| `Login.test.js` | 5 | 92 | Login form, error states |
| `Home.test.js` | 4 | 72 | Page rendering, product display |
| `Shop.test.js` | 4 | 47 | Product listing, filters |
| `Cart.test.js` | 4 | 48 | Cart operations |
| `Checkout.test.js` | 2 | 50 | Checkout form rendering |
| `OrderSuccess.test.js` | 2 | 28 | Order success page |
| **TOTAL** | **27** | **490** | |

### 2.3 Summary

| Area | Test Cases | Test LOC | Source LOC | Actual Coverage (Statements) |
|---|---|---|---|---|
| Backend | 34 | 557 | 1,881 | 37.63% |
| Frontend | 27 | 490 | 4,968 | 47.83% (mixed, incl. backend files in root Jest run) |
| **Overall** | **61** | **1,047** | **6,849** | **~42%** |

---

## 2.4 Real Coverage Per Module (from `npm run test:coverage`)

### Backend

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `auth.js` | 86.48% | 90.9% | 100% | 88.88% |
| `search.js` | 100% | 100% | 100% | 100% |
| `checkout.js` | 44.92% | 56.09% | 14.28% | 48.43% |
| `products.js` | 20.13% | 2.81% | 14.28% | 23.07% |
| `embeddingService.js` | 91.89% | 75% | 100% | 96.96% |
| `pineconeSync.js` | 20% | 5.26% | 0% | 24.39% |
| `pineconeClient.js` | 27.9% | 5.12% | 0% | 30% |
| `product.js` (model) | 26.08% | 0% | 0% | 30% |
| `order.js` (model) | 33.33% | 0% | 0% | 34.48% |
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
| `NotificationProvider.jsx` | 16.12% | 0% | 20% | 14.81% |

---

## 3. High-Risk Module Count

| Risk Level | Count | Modules |
|---|---|---|
| CRITICAL | 1 | Order Management (no persistence) |
| HIGH | 5 | Auth, Product Catalog, Checkout, Recommendation Engine, Vector DB Sync |
| MEDIUM | 4 | Search, Shopping Cart, CI/CD Pipeline, API Client |
| LOW | 0 | — |
| **TOTAL** | **10** | |

**High/Critical modules: 6 out of 10 identified modules**

---

## 4. Test Coverage Gap Analysis

### 4.1 Untested / Under-tested Areas

| Gap | Severity | Missing Tests |
|---|---|---|
| Order persistence (no DB save) | CRITICAL | Integration test verifying `POST /api/orders` does NOT save to DB |
| JWT expiry handling | HIGH | Test for expired tokens on protected endpoints |
| Pinecone sync failure | HIGH | Unit test: hook fires → Pinecone down → graceful error |
| Auth rate limiting | HIGH | No rate limit configured; no test |
| ReDoS in search | MEDIUM | Malicious regex string input to `/api/search` |
| Cart localStorage corruption | MEDIUM | Frontend test: corrupted `fusionCart` key handling |
| API retry backoff | MEDIUM | Unit test for `withRetry()` in `apiClient.js` |
| Health endpoints | LOW | Tests for `/health`, `/health/ready`, `/health/db` |
| ProductDetails page | MEDIUM | No dedicated frontend test file |
| OrderTracking page | MEDIUM | No dedicated frontend test file |
| NavigationBar component | MEDIUM | No dedicated frontend test file |
| CheckoutForm component | MEDIUM | No dedicated frontend test file (only via Checkout.test.js) |

**Count of identified test gaps: 12**

### 4.2 Pages/Components with No Test Coverage

| Component/Page | LOC | Risk Level |
|---|---|---|
| `ProductDetails.jsx` | 371 | HIGH (core user journey) |
| `OrderTracking.jsx` | 439 | MEDIUM |
| `NavigationBar.jsx` | 435 | MEDIUM |
| `CheckoutForm.jsx` | 410 | HIGH |
| `Footer.jsx` | 207 | LOW |
| `SearchResults.jsx` | 72 | MEDIUM |
| `ShoppingCart.jsx` | 62 | MEDIUM |
| `ForgotPassword.jsx` | 78 | LOW |
| `ResetPassword.jsx` | 142 | MEDIUM |

**Total untested frontend LOC: ~2,216 (45% of frontend source)**

---

## 5. Initial Coverage Plan

### Phase 1 — Assignment 1 (Current)
Focus: Document, analyze, fill highest-risk gaps

| Action | Target | Effort (hours) |
|---|---|---|
| Review and extend `auth.spec.js` (JWT expiry test) | auth module | 2 |
| Add Pinecone sync failure test to `products.spec.js` | products module | 3 |
| Add order non-persistence test to orders route | orders module | 2 |
| Add ReDoS test case to `search.spec.js` | search module | 1 |
| Write `ProductDetails.test.js` (basic rendering) | ProductDetails | 3 |
| **Phase 1 Total** | | **11 hours** |

### Phase 2 — Assignment 2 (Planned)
Focus: Automation and E2E

| Action | Target | Effort (hours) |
|---|---|---|
| Playwright E2E: register → login → add to cart → checkout | Full user journey | 6 |
| Playwright E2E: search → product view → recommendations | Discovery journey | 4 |
| Newman: Postman collection for all API endpoints | All APIs | 4 |
| Security tests: JWT manipulation, input fuzzing | Auth, Search | 4 |
| Coverage target: backend >70% statements | All backend | 6 |
| **Phase 2 Total** | | **24 hours** |

### Phase 3 — Assignment 3 (Planned)
Focus: Performance and advanced testing

| Action | Target | Effort (hours) |
|---|---|---|
| k6 load test: product listing endpoint | Products API | 4 |
| JMeter: checkout flow under concurrent users | Checkout | 4 |
| Pinecone latency monitoring | Recommendations | 3 |
| Full coverage audit and gap closure | All modules | 8 |
| **Phase 3 Total** | | **19 hours** |

**Total Estimated Testing Effort: ~54 hours across 3 assignments**

---

## 6. CI/CD Pipeline Health (Baseline)

| Pipeline | Status | Stages |
|---|---|---|
| GitHub Actions | Configured and active | formatting → backend-tests (3 OS) → frontend-tests (2 Node) → docker build |
| Jenkins | Configured | build → test → deploy (blue-green/canary) → health → smoke |
| Docker Compose | Functional | backend + frontend + mongodb |

**GitHub Actions matrix:**
- Backend tests: Ubuntu × macOS × Windows (Node 18)
- Frontend tests: Node 18, Node 20

**CI pipeline execution target: <10 minutes**

---

## 7. API Endpoint Inventory

| Method | Endpoint | Auth Required | Tested |
|---|---|---|---|
| POST | `/api/auth/register` | No | Yes |
| POST | `/api/auth/login` | No | Yes |
| GET | `/api/products` | No | Yes |
| GET | `/api/products/:id` | No | Yes |
| POST | `/api/products` | Yes | Partial |
| PUT | `/api/products/:id` | Yes | Partial |
| DELETE | `/api/products/:id` | Yes | Partial |
| GET | `/api/products/:id/similar` | No | Yes (mocked Pinecone) |
| POST | `/api/checkout` | No | Yes |
| GET | `/api/search?q=` | No | Yes |
| POST | `/api/orders` | No | No |
| GET | `/api/orders` | No | No |
| GET | `/health` | No | No |
| GET | `/health/ready` | No | No |
| GET | `/health/db` | No | No |
| GET | `/health/pinecone` | No | No |

**Total endpoints: 16**
**Tested: 10 (63%)**
**Untested: 6 (37%)**

---

## 8. Defect Register (Initial — Assignment 1)

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| DEF-001 | Orders | Orders are not persisted to MongoDB — by design but a production risk | CRITICAL | Open / Known |
| DEF-002 | Auth | No rate limiting on `/api/auth/login` — brute force possible | HIGH | Open |
| DEF-003 | Auth | JWT secret uses dev default — must be changed in production | HIGH | Open |
| DEF-004 | Search | Regex input not sanitized — potential ReDoS vulnerability | MEDIUM | Open |
| DEF-005 | Products | Pinecone sync failures are silent — no error propagation to API response | MEDIUM | Open |
| DEF-006 | Checkout | No server-side validation of cart contents before checkout | MEDIUM | Open |
| DEF-007 | CORS | CORS configured for dev — wildcard origins must be restricted in production | MEDIUM | Open |

**Total open defects: 7**
**Critical: 1 | High: 2 | Medium: 4**

---

## 9. Research Paper Baseline Summary

| Metric | Value |
|---|---|
| Total source LOC | ~6,849 |
| Total test LOC | 1,047 |
| Total test cases | 61 |
| Backend test cases | 34 |
| Frontend test cases | 27 |
| API endpoints | 16 |
| Tested endpoints | 10 (63%) |
| High/Critical risk modules | 6 |
| Identified test gaps | 12 |
| Open defects | 7 |
| Actual overall coverage (statements) | ~42% (measured) |
| Backend coverage target (Assignment 2) | >70% |
| Frontend coverage target (Assignment 2) | >55% |
| Total estimated QA effort | ~54 hours |

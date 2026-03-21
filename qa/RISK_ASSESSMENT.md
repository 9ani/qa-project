# Risk Assessment Document
## Fusion Electronics — MERN Stack E-Commerce Application
**Assignment 1 | Advanced Quality Assurance**
**Date:** 2026-03-19

---

## 1. System Overview

**Fusion Electronics** is a full-stack web e-commerce application built on the MERN stack (MongoDB, Express.js, React, Node.js). It exposes a REST API consumed by a React SPA and integrates two auxiliary systems: a vector database (Pinecone) for AI-powered product recommendations, and Google Generative AI for generating text embeddings.

**Key system boundaries:**

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Material-UI, Axios | SPA served via nginx |
| Backend API | Express.js (Node.js) | REST API on port 5000 |
| Primary DB | MongoDB 6.0 (Mongoose ODM) | Products, Users |
| Vector DB | Pinecone (serverless) | Semantic similarity search |
| Embedding Service | Google Generative AI | 768-D text vectors |
| Auth | JWT + bcryptjs | Stateless authentication |
| CI/CD | GitHub Actions + Jenkins | Automated build, test, deploy |
| Orchestration | Docker Compose / Kubernetes | Container management |

---

## 2. Risk Assessment Methodology

**Risk Score = Probability × Impact**

| Level | Score Range | Meaning |
|---|---|---|
| Critical | 16–25 | Must be tested first; failure causes major business loss |
| High | 9–15 | Should be tested before release |
| Medium | 4–8 | Important but partial failures are tolerable |
| Low | 1–3 | Nice-to-have coverage |

Both **Probability** (1–5) and **Impact** (1–5) are rated on the following scale:

- **1** = Very unlikely / negligible impact
- **3** = Moderately likely / significant impact
- **5** = Very likely / catastrophic impact

**Assumptions:**
- The application is evaluated in its current demo state (no real payment gateway, orders not persisted).
- External service failures (Pinecone, Google AI) are within scope since they are in the critical recommendation path.
- Security risk is elevated because user credentials and JWT secrets are involved.
- The checkout endpoint simulates a 3-second delay — real payment integration is a known gap.

---

## 3. Module Identification & Risk Analysis

### 3.1 User Authentication (`backend/routes/auth.js`, `backend/models/user.js`, `backend/middleware/auth.js`)

| Attribute | Detail |
|---|---|
| **Functions** | Registration, login, JWT issuance, password hashing (bcryptjs), protected route middleware |
| **Probability of Failure** | 3 — Moderate. JWT signing errors, weak secret config, bcrypt misconfiguration |
| **Impact if Failed** | 5 — All protected endpoints become inaccessible; account takeover possible |
| **Risk Score** | **15 — HIGH** |
| **Reasoning** | Foundational security module. A flaw here exposes all user data and all cart/order operations. JWT secret hardcoded in dev mode is a real risk. |

---

### 3.2 Product Catalog & CRUD (`backend/routes/products.js`, `backend/models/product.js`)

| Attribute | Detail |
|---|---|
| **Functions** | List, create, update, delete products; Mongoose hooks auto-sync to Pinecone on every save/update/delete |
| **Probability of Failure** | 3 — Pinecone sync hooks can fail silently; stock/price fields have no server-side validation |
| **Impact if Failed** | 5 — Broken product data directly causes loss of revenue; desync between MongoDB and Pinecone corrupts recommendations |
| **Risk Score** | **15 — HIGH** |
| **Reasoning** | The auto-sync pipeline (`post('save')`, `post('findOneAndUpdate')`, `post('deleteOne')`) is a silent failure zone. If Pinecone is down or rate-limited, the product record saves successfully but the vector is never updated — a split-brain condition. |

---

### 3.3 AI Recommendation Engine (`backend/routes/products.js:218–332`, `backend/services/pineconeSync.js`, `backend/services/embeddingService.js`)

| Attribute | Detail |
|---|---|
| **Functions** | `GET /api/products/:id/similar` — queries Pinecone by cosine similarity; falls back to heuristic scoring |
| **Probability of Failure** | 4 — High. Depends on two external APIs (Pinecone + Google AI); rate limits, quota exhaustion, cold-start latency |
| **Impact if Failed** | 3 — Partial. Fallback heuristic is implemented; UX degrades but does not break |
| **Risk Score** | **12 — HIGH** |
| **Reasoning** | The highest external dependency surface. Embedding generation can silently fail (no quota alert in codebase). Fallback scoring uses simple field matching — could return irrelevant results, eroding user trust. |

---

### 3.4 Checkout & Payment Validation (`backend/routes/checkout.js`, `src/pages/Checkout.jsx`, `src/components/CheckoutForm.jsx`)

| Attribute | Detail |
|---|---|
| **Functions** | Email format validation, 16-digit card validation, MM/YY expiry, 3–4-digit CVC; 3-second simulated delay; no DB persistence |
| **Probability of Failure** | 3 — Regex validation gaps (edge-case card numbers); no real payment = no idempotency concern |
| **Impact if Failed** | 5 — Critical UX: users believe they are paying; a broken checkout is an immediate revenue-stopper |
| **Risk Score** | **15 — HIGH** |
| **Reasoning** | Even as a demo, this is the most visible failure point for end users. The validation logic is custom regex with known edge cases (e.g., Amex 15-digit cards). The 3-second delay is artificial — real integration would require Stripe/Braintree testing. |

---

### 3.5 Search Functionality (`backend/routes/search.js`, `src/components/SearchResults.jsx`)

| Attribute | Detail |
|---|---|
| **Functions** | MongoDB regex search on `name` and `description` fields; case-insensitive |
| **Probability of Failure** | 2 — Simple regex; low likelihood of catastrophic failure |
| **Impact if Failed** | 4 — Product discovery fails entirely; users cannot find products without browsing |
| **Risk Score** | **8 — MEDIUM** |
| **Reasoning** | The regex approach is functional but not semantic. Special characters in queries can break the regex. No input sanitization is noted, creating potential ReDoS (Regular Expression Denial of Service) risk. |

---

### 3.6 Shopping Cart (`src/pages/Cart.jsx`, `src/components/ShoppingCart.jsx`, `src/App.jsx`)

| Attribute | Detail |
|---|---|
| **Functions** | React Context API cart state; localStorage persistence (`fusionCart` key); add, remove, quantity update |
| **Probability of Failure** | 2 — Client-side only; localStorage corruption or context re-render bugs |
| **Impact if Failed** | 4 — Users lose cart contents; potential to add wrong items silently |
| **Risk Score** | **8 — MEDIUM** |
| **Reasoning** | Cart is purely client-side with no server persistence. LocalStorage is cleared on browser settings reset. No server-side validation of cart integrity at checkout. |

---

### 3.7 Order Management (`backend/routes/orders.js`, `backend/models/order.js`)

| Attribute | Detail |
|---|---|
| **Functions** | Order creation and listing; demo — orders are NOT persisted to DB |
| **Probability of Failure** | 4 — The non-persistence is a confirmed design gap |
| **Impact if Failed** | 4 — Users receive no order history; cannot track orders |
| **Risk Score** | **16 — CRITICAL** |
| **Reasoning** | Although this is intentional demo behavior, it represents the highest business-logic risk if deployed. Any real customer would expect order persistence. This module needs the most attention before any real-world deployment. |

---

### 3.8 API Client & Retry Logic (`src/services/apiClient.js`)

| Attribute | Detail |
|---|---|
| **Functions** | Axios instance with exponential backoff retry; used by all frontend API calls |
| **Probability of Failure** | 2 — Retry logic is implemented; low risk under normal conditions |
| **Impact if Failed** | 3 — Network errors surface to users without retries; increased perceived downtime |
| **Risk Score** | **6 — MEDIUM** |
| **Reasoning** | The `withRetry()` wrapper reduces transient failure impact. Risk is that not all calls use it consistently. |

---

### 3.9 CI/CD Pipeline (`.github/workflows/ci.yml`, `Jenkinsfile`)

| Attribute | Detail |
|---|---|
| **Functions** | GitHub Actions: lint, test (multi-OS), Docker build/push; Jenkins: blue-green/canary deploy |
| **Probability of Failure** | 2 — Pipelines are mature and multi-stage |
| **Impact if Failed** | 4 — Broken pipeline means no automated quality gate; bad code reaches production |
| **Risk Score** | **8 — MEDIUM** |
| **Reasoning** | The CI pipeline tests on multiple OS and Node versions. Jenkins pipeline has auto-rollback. The main risk is environment variable secrets not being set correctly in GitHub Actions secrets. |

---

### 3.10 Vector DB Sync Pipeline (`backend/models/product.js:68–117`, `backend/services/pineconeSync.js`)

| Attribute | Detail |
|---|---|
| **Functions** | Mongoose post-hooks sync products to Pinecone; `PINECONE_PURGE_ON_SYNC=true` clears all vectors before sync |
| **Probability of Failure** | 4 — External network calls inside Mongoose hooks; failure not propagated to API response |
| **Impact if Failed** | 3 — Recommendations degrade to heuristic; no direct user error shown |
| **Risk Score** | **12 — HIGH** |
| **Reasoning** | Silent failure risk is high. If `PINECONE_PURGE_ON_SYNC=true` is set and the sync crashes mid-way, the entire vector namespace is empty — all recommendations fall back to heuristic. |

---

## 4. Risk Priority Matrix

| Priority | Module | Risk Score | Category |
|---|---|---|---|
| 1 | Order Management (no persistence) | 16 | **CRITICAL** |
| 2 | User Authentication | 15 | **HIGH** |
| 3 | Product Catalog & Auto-Sync | 15 | **HIGH** |
| 4 | Checkout Validation | 15 | **HIGH** |
| 5 | AI Recommendation Engine | 12 | **HIGH** |
| 6 | Vector DB Sync Pipeline | 12 | **HIGH** |
| 7 | Search Functionality | 8 | **MEDIUM** |
| 8 | Shopping Cart (client-side) | 8 | **MEDIUM** |
| 9 | CI/CD Pipeline | 8 | **MEDIUM** |
| 10 | API Client & Retry Logic | 6 | **MEDIUM** |

**Count of HIGH/CRITICAL risk modules: 6**
**Count of MEDIUM risk modules: 4**
**Count of LOW risk modules: 0**

---

## 5. Identified Security Risks

| Risk | Location | Severity |
|---|---|---|
| JWT secret hardcoded default in dev | `backend/.env` | HIGH |
| No rate limiting on auth endpoints | `backend/routes/auth.js` | HIGH |
| ReDoS potential in search regex | `backend/routes/search.js` | MEDIUM |
| No input validation on most endpoints | All routes except checkout | MEDIUM |
| CORS wildcard in dev mode | `backend/index.js` | MEDIUM |
| localStorage cart — no integrity check | `src/App.jsx` | LOW |

---

## 6. Assumptions

1. The project is in demo/portfolio state — production readiness gaps (no real payments, no order persistence) are known and documented.
2. External API keys (Pinecone, Google AI) are assumed available for integration tests but mocked in unit tests.
3. Risk ratings reflect potential production impact, not the current demo context.
4. The team has access to Docker and Node.js 18+ locally.
5. MongoDB is accessible either locally or via Docker Compose.

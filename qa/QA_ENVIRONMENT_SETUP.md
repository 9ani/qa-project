# QA Environment Setup Report
## Fusion Electronics — MERN Stack E-Commerce Application
**Assignment 1 | Advanced Quality Assurance**
**Date:** 2026-03-19

---

## 1. Overview

This report documents the QA environment for the Fusion Electronics MERN e-commerce application. It covers the tools installed, test framework configuration, CI/CD pipeline structure, and test repository organization.

---

## 2. Prerequisites & System Requirements

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18.x or 20.x | Tested in CI on both |
| npm | 9.x+ | Comes with Node 18 |
| Docker | 24.x+ | For containerized testing |
| Docker Compose | v2.x | `docker compose` (not `docker-compose`) |
| Git | 2.x+ | For version control |
| MongoDB | 6.0 | Via Docker or local install |

---

## 3. Repository Structure

```
MERN-Stack-Ecommerce-App/               # Monorepo root
├── src/                                # React frontend source
│   ├── pages/                          # 13+ page components
│   ├── components/                     # 9 reusable components
│   ├── services/apiClient.js           # Axios with retry logic
│   ├── context/                        # React Context (cart state)
│   └── tests/                          # Frontend test files (Jest + RTL)
│       ├── Home.test.js
│       ├── Shop.test.js
│       ├── ProductDetails.test.js
│       ├── Cart.test.js
│       ├── Checkout.test.js
│       ├── Login.test.js
│       ├── Register.test.js
│       └── OrderSuccess.test.js
├── backend/                            # Express.js backend
│   ├── routes/                         # API route handlers
│   │   ├── auth.js                     # POST /api/auth/register, /login
│   │   ├── products.js                 # GET/POST/PUT/DELETE /api/products
│   │   ├── checkout.js                 # POST /api/checkout
│   │   ├── search.js                   # GET /api/search
│   │   └── orders.js                   # GET/POST /api/orders
│   ├── models/                         # Mongoose schemas
│   │   ├── product.js                  # Product schema + Pinecone auto-sync hooks
│   │   ├── user.js                     # User schema + bcrypt
│   │   └── order.js                    # Order schema (demo, not persisted)
│   ├── services/
│   │   ├── pineconeSync.js             # Pinecone sync orchestration
│   │   └── embeddingService.js         # Google AI embedding generation
│   ├── middleware/auth.js              # JWT authentication middleware
│   ├── config/db.js                    # MongoDB connection
│   ├── index.js                        # Express app entry point
│   ├── __tests__/                      # Backend test files (Jest + Supertest)
│   │   ├── auth.spec.js                # Auth endpoint tests
│   │   ├── products.spec.js            # Product CRUD + recommendations
│   │   ├── checkout.spec.js            # Checkout validation
│   │   ├── embeddingService.spec.js    # Embedding service (mocked)
│   │   └── search.spec.js             # Search endpoint tests
│   ├── jest.config.js                  # Backend Jest config (node env)
│   └── package.json                    # Backend dependencies + scripts
├── .github/
│   └── workflows/
│       └── ci.yml                      # GitHub Actions CI pipeline
├── Jenkinsfile                         # Jenkins pipeline (deploy strategies)
├── docker-compose.yml                  # Local: backend + frontend + mongodb
├── Dockerfile                          # Frontend multi-stage Docker build
├── backend/Dockerfile                  # Backend Node.js Docker image
├── jest.config.js                      # Frontend Jest config (jsdom env)
├── jest.setup.js                       # Jest global setup
├── babel.config.js                     # Babel for JSX transpilation in tests
├── openapi.yaml                        # OpenAPI/Swagger API specification
├── qa/                                 # QA documentation (this directory)
│   ├── RISK_ASSESSMENT.md
│   ├── QA_TEST_STRATEGY.md
│   ├── QA_ENVIRONMENT_SETUP.md         # (this file)
│   └── BASELINE_METRICS.md
└── Makefile                            # Build automation shortcuts
```

---

## 4. Installed Testing Tools

### 4.1 Frontend Testing Stack

| Tool | Version | Purpose | Config File |
|---|---|---|---|
| **Jest** | ^29.x | Test runner, mocking, assertions | `jest.config.js` |
| **React Testing Library** | ^14.x | Component rendering + DOM queries | `jest.setup.js` |
| **@testing-library/jest-dom** | ^6.x | Custom DOM matchers (`.toBeInTheDocument()`) | `jest.setup.js` |
| **@testing-library/user-event** | ^14.x | User interaction simulation | used in tests |
| **Babel** | ^7.x | JSX/ESM transpilation for Jest | `babel.config.js` |
| **craco** | ^7.x | CRA override (custom jest config) | `craco.config.js` |

**Install command:**
```bash
npm install
```

### 4.2 Backend Testing Stack

| Tool | Version | Purpose | Config File |
|---|---|---|---|
| **Jest** | ^29.x | Test runner | `backend/jest.config.js` |
| **Supertest** | ^6.x | HTTP endpoint integration testing | used in `__tests__/` |
| **jest.mock()** | built-in | Mock Pinecone, Google AI, MongoDB | inline in spec files |

**Install command:**
```bash
cd backend && npm install
```

### 4.3 Code Quality Tools

| Tool | Purpose | Command |
|---|---|---|
| **Prettier** | Code formatting | `npm run format` |
| **Prettier (lint mode)** | Verify formatting | `npm run lint` |

### 4.4 API Documentation

| Tool | Purpose | Access |
|---|---|---|
| **Swagger UI** | Interactive API browser | `http://localhost:5000/api-docs` |
| **swagger-jsdoc** | Generates spec from JSDoc comments | Used in `backend/index.js` |
| **OpenAPI 3.0 YAML** | Machine-readable API spec | `openapi.yaml` (project root) |

### 4.5 Planned Tools (to be configured in Assignment 2)

| Tool | Purpose |
|---|---|
| **Playwright** | E2E browser automation |
| **Newman** | CLI runner for Postman collections |
| **k6** or **JMeter** | Performance / load testing |
| **OWASP ZAP** | Security scanning |

---

## 5. Test Framework Configuration

### 5.1 Frontend Jest Configuration (`jest.config.js`)

```js
module.exports = {
  testEnvironment: 'jsdom',                    // Browser-like environment
  setupFilesAfterFramework: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|jpg|png|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'           // Transpile JSX
  }
};
```

### 5.2 Backend Jest Configuration (`backend/jest.config.js`)

```js
module.exports = {
  testEnvironment: 'node',                     // Node.js environment
  testMatch: ['**/__tests__/**/*.spec.js'],    // Match spec files
  testTimeout: 30000,                          // 30s for async DB calls
  forceExit: true                              // Clean exit after tests
};
```

### 5.3 Babel Configuration (`babel.config.js`)

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ]
};
```

---

## 6. CI/CD Pipeline Structure

### 6.1 GitHub Actions (`ci.yml`)

**Trigger:** Push to `master`, pull requests, manual dispatch

```yaml
Jobs:
  formatting:
    - Runs on ubuntu-latest, Node 18
    - Steps: npm install → npm run lint

  backend-tests:
    - Matrix: OS [ubuntu, windows, macos] × Node [18]
    - Steps: npm install → cd backend && npm test

  frontend-tests:
    - Matrix: Node [18, 20]
    - Steps: npm install → npm test

  recommendation-service-sanity:
    - 3 scenarios: cold-start, diversity, performance
    - Steps: npm install → node sanity tests

  complete:
    - Depends on: formatting, backend-tests, frontend-tests
    - Acts as final gate before Docker build

  docker:
    - Builds & pushes backend + frontend images to GHCR
    - Depends on: complete job

  summary:
    - Pipeline completion report
```

**Pipeline duration target:** <10 minutes

### 6.2 Jenkins Pipeline (`Jenkinsfile`)

**Stages:**
1. Initialize — workspace setup, credential loading
2. Build — `npm install`, Docker image build
3. Test — unit, integration, API tests
4. Security — `npm audit`
5. Deploy — parameterized strategy (blue-green / canary / rolling)
6. Health Check — `/health`, `/health/ready` probes
7. Smoke Tests — critical flow validation
8. Summary / Rollback

**Deployment parameters:**
```
DEPLOYMENT_STRATEGY = [blue-green | canary | rolling]
CANARY_PERCENTAGE   = [10 | 25 | 50 | 75 | 100]
RUN_SMOKE_TESTS     = [true | false]
AUTO_PROMOTE        = [true | false]
```

### 6.3 Docker Compose (Local QA Environment)

```yaml
services:
  backend:
    build: ./backend
    ports: ["5000:5000"]
    env: MONGO_URI=mongodb://mongodb:27017/Ecommerce-Products

  frontend:
    build: .
    ports: ["3000:3000"]
    build_arg: REACT_APP_API_BASE_URL=http://localhost:5000/api

  mongodb:
    image: mongo:6.0
    ports: ["27017:27017"]
```

**Start local QA environment:**
```bash
docker compose up --build
```

---

## 7. Environment Setup — Step by Step

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd MERN-Stack-Ecommerce-App
```

### Step 2: Install Dependencies
```bash
npm install                  # Frontend dependencies
cd backend && npm install    # Backend dependencies
cd ..
```

### Step 3: Configure Environment Variables
```bash
# Create backend/.env
cat > backend/.env << EOF
MONGO_URI=mongodb://localhost:27017/Ecommerce-Products
JWT_SECRET=your_dev_secret_here
PINECONE_API_KEY=pk-xxx
PINECONE_HOST=https://your-index.pinecone.io
PINECONE_INDEX=ecommerce-products
GOOGLE_AI_API_KEY=AIzaSy...
PORT=5000
SKIP_SEED_ON_START=false
EOF
```

### Step 4: Start Services (Option A — Docker Compose)
```bash
docker compose up --build
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
# MongoDB: localhost:27017
```

### Step 5: Start Services (Option B — Local)
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
npm start

# MongoDB must be running locally on port 27017
```

### Step 6: Seed Database
```bash
cd backend/seed && node productSeeds.js dev
```

### Step 7: Run Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# With coverage
npm run test:coverage
cd backend && npm run test:coverage
```

### Step 8: Verify API Documentation
```bash
# With backend running:
open http://localhost:5000/api-docs
```

---

## 8. Test Execution Commands Reference

| Command | What It Does |
|---|---|
| `npm test` | Run frontend unit tests (silent) |
| `npm run test:watch` | Frontend tests in watch mode |
| `npm run test:coverage` | Frontend tests with coverage report |
| `cd backend && npm test` | Run backend integration tests |
| `cd backend && npm run test:coverage` | Backend tests with coverage |
| `npm run lint` | Check code formatting |
| `npm run format` | Auto-fix formatting |
| `docker compose up --build` | Full stack local environment |
| `cd backend && npm run sync-pinecone` | Manual Pinecone vector sync |

---

## 9. Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `GET /health` | Basic liveness | `200 OK` |
| `GET /health/ready` | Readiness (includes DB) | `200 OK` |
| `GET /health/db` | Database connectivity | `200 OK` |
| `GET /health/pinecone` | Vector DB connectivity | `200 OK` |

---

## 10. Version Control & Branch Strategy

| Branch | Purpose |
|---|---|
| `master` | Main branch — CI runs on every push |
| `feat/*` | Feature branches — PR required before merge |
| `fix/*` | Bug fix branches |
| `qa/*` | QA-only branches for test additions |

**PR policy:** All PRs require CI to be green before merge. The GitHub Actions `complete` job acts as the merge gate.

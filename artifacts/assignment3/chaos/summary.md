# Assignment 3 Chaos Summary

| Scenario | Availability | MTTR | Endpoints impacted |
| --- | --- | --- | --- |
| backend-pause | 55.24% | 4879 ms | Backend /health, Backend /health/db, GET /api/products, GET /api/search?q=laptop, POST /api/auth/login, POST /api/orders/track |
| mongodb-restart | 60.13% | 6412 ms | Backend /health/db, GET /api/products, GET /api/search?q=laptop, POST /api/auth/login, POST /api/orders/track |
| cpu-throttle | 100% | n/a | None |


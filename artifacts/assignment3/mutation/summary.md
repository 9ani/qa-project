# Assignment 3 Mutation Summary

| Module | Mutants created | Killed | Timed out | Undetected | Mutation score |
| --- | --- | --- | --- | --- | --- |
| routes/checkout.js | 177 | 90 | 18 | 69 | 61.02% |
| middleware/auth.js | 12 | 9 | 3 | 0 | 100% |
| routes/orders.js | 82 | 48 | 2 | 32 | 60.98% |
| routes/search.js | 26 | 21 | 2 | 3 | 88.46% |


Overall mutation score: 64.98%

- Total mutants created: 297
- Total mutants killed: 168
- Total timed out: 25
- Total undetected mutants: 104
- No coverage mutants: 0

## Surviving mutants snapshot

- routes/checkout.js:9 Survived via LogicalOperator -> Order.STATUS_FLOW && []
- routes/checkout.js:9 Survived via ConditionalExpression -> true
- routes/checkout.js:9 Survived via ConditionalExpression -> false
- routes/checkout.js:9 Survived via ArrayDeclaration -> ["Stryker was here"]
- routes/checkout.js:11 Survived via Regex -> /^[^\s@]+@[^\s@]+\.[^\s@]+/
- routes/orders.js:6 Survived via Regex -> /[^\s@]+@[^\s@]+\.[^\s@]+$/
- routes/orders.js:6 Survived via Regex -> /^[^\s@]+@[^\s@]+\.[^\s@]+/
- routes/orders.js:75 Survived via MethodExpression -> String(orderNumber)
- routes/orders.js:76 Survived via MethodExpression -> String(email)
- routes/orders.js:94 Survived via BooleanLiteral -> true
- routes/search.js:8 Survived via MethodExpression -> query
- routes/search.js:72 Survived via StringLiteral -> ""
- routes/search.js:85 Survived via StringLiteral -> ""

## Timeout snapshot

- routes/checkout.js:133 Timeout via BlockStatement -> {}
- routes/checkout.js:134 Timeout via BlockStatement -> {}
- routes/checkout.js:159 Timeout via ObjectLiteral -> {}
- middleware/auth.js:5 Timeout via BlockStatement -> {}
- middleware/auth.js:15 Timeout via BlockStatement -> {}
- middleware/auth.js:11 Timeout via BlockStatement -> {}
- routes/orders.js:67 Timeout via BlockStatement -> {}
- routes/orders.js:68 Timeout via BlockStatement -> {}
- routes/search.js:73 Timeout via BlockStatement -> {}
- routes/search.js:72 Timeout via BlockStatement -> {}

HTML report: ../../../backend/reports/mutation/html/index.html

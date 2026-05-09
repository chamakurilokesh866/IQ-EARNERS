# E2E Test Suite

This suite validates critical buyer-facing flows:

- Public page availability
- Revenue/discovery routes availability
- Public API crash checks

## Run

```bash
npm install
npx playwright install
npm run e2e
```

## CI-friendly run

```bash
npm run e2e -- --reporter=list
```

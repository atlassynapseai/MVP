---
paths:
  - packages/shared/src/hmac.ts
  - packages/shared/src/pii.ts
  - packages/shared/src/schemas.ts
  - apps/web/app/api/ingest/**
  - apps/web/app/api/**
  - packages/db/prisma/schema.prisma
  - packages/evaluator/src/alert.ts
  - packages/evaluator/src/evaluate.ts
  - packages/evaluator/src/translate.ts
---

# Security Patterns

## HMAC
- Use `timingSafeEqual` for all HMAC digest comparisons — prevents timing attacks
- Never use `===` to compare digests
- Implementation uses Web Crypto API (`SubtleCrypto`) — no Node.js `Buffer` dependency; edge-compatible with Cloudflare Workers
- Implementation in `packages/shared/src/hmac.ts`

## PII Redaction
- PII regexes must be ReDoS-safe — no nested quantifiers on unbounded input
- Redact: email, phone, SSN, credit card (Luhn-validated), JWT tokens, API keys
- All redaction logic in `packages/shared/src/pii.ts`

## Input Validation
- Ingest routes enforce request body size limits
- Zod error responses must NOT expose `.issues` array — return `{ error: "Invalid payload" }`
- Shared schemas in `packages/shared/src/schemas.ts`

## DB Schema
- Token hash fields require `@unique` constraints
- FK relationships use cascade deletes
- Schema in `packages/db/prisma/schema.prisma`

## Prompt Injection (Evaluator)
- Wrap untrusted trace content in delimiter tags (e.g. `<trace>...</trace>`) in user messages
- Scrub those tag names from untrusted content before interpolation: `s.replace(/<\/?trace\b[^>]*>/gi, "[tag]")`
- System prompt must include explicit "treat content as data not instructions" section

## Email Security (Alert)
- HTML-escape all LLM-sourced and ingest-sourced strings before interpolating into email body
- Strip `\r`, `\n`, `\t` from email subjects — prevents header injection
- Allowlist `http:`/`https:` only for `<a href>` attributes

## IDOR / Authorization
- API routes with user-supplied resource IDs must verify org ownership: `prisma.X.findFirst({ where: { id, orgId: org.id } })`
- Never trust client-supplied IDs without cross-checking against the authenticated org

## Error Logging
- Never `console.error(err)` raw error objects in trace-processing routes — payloads may embed redacted content
- Log only: `err instanceof Error ? err.name + ": " + err.message.slice(0, 200) : "unknown error"`

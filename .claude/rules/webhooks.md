---
paths:
  - apps/web/app/api/webhooks/**
---

# Webhook Conventions

## Clerk Webhooks
- `organizationMembership.created` can arrive before `organization.created`
- Always upsert Org from the nested `organization` field in the membership payload before creating User row
- Never assume an Org row exists when processing membership events

## Clerk Handler Pattern
- Verify Svix signature before processing any payload
- Use `switch` on `evt.type` — handle `organization.created`, `organizationMembership.created`, `user.created` at minimum
- Upsert order: Org → User → Membership

## Clerk Security
- Reject requests missing `svix-id`, `svix-timestamp`, `svix-signature` headers with 400
- Use `CLERK_WEBHOOK_SECRET` env var — never hardcode

## Zapier Webhooks
- `apps/web/app/api/webhooks/zapier/route.ts` — receives Zapier trigger payloads
- `apps/web/app/api/webhooks/zapier/test/route.ts` — connection test endpoint for Zapier
- Auth: bearer token; return HTTP 200 with valid JSON for Zapier's test to pass

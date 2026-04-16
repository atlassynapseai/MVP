---
paths:
  - apps/web/app/api/webhooks/**
---

# Clerk Webhook Conventions

## Event Ordering
- `organizationMembership.created` can arrive before `organization.created`
- Always upsert Org from the nested `organization` field in the membership payload before creating User row
- Never assume an Org row exists when processing membership events

## Handler Pattern
- Verify Svix signature before processing any payload
- Use `switch` on `evt.type` — handle `organization.created`, `organizationMembership.created`, `user.created` at minimum
- Upsert order: Org → User → Membership

## Security
- Reject requests missing `svix-id`, `svix-timestamp`, `svix-signature` headers with 400
- Use `CLERK_WEBHOOK_SECRET` env var — never hardcode

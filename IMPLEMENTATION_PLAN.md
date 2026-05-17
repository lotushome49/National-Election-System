# NEHS Implementation Plan

## Phase 0 First, Then One-by-One Delivery

Project: National Election Handling System (NEHS)
Version: 3.0.0 (Repo-aligned)
Updated: 2026-05-17

---

## 1) Execution Rules

This roadmap is intentionally sequential.

1. Complete Phase 0 first.
2. Do not start the next phase until the current phase exit criteria are met.
3. After each phase, run a gate review: build, lint, smoke test, and API sanity checks.
4. Keep changes inside the existing architecture in `backend/src` and `frontend/src`.
5. Prefer enhancement of existing modules before creating new modules.

---

## 2) Phase 0 - Architecture Baseline (Mandatory)

### Objective

Eliminate ambiguity between legacy/current code paths and establish one stable implementation baseline.

### Scope

#### 0.1 Confirm canonical code paths

- Backend canonical path: `backend/src/**` only.
- Frontend canonical path: `frontend/src/**` only.
- Mark legacy/non-canonical files as deprecated in docs.

#### 0.2 Frontend structure decision

- Keep the current thin `frontend/src/App.tsx` wrapper and continue evolving the feature-oriented structure under `frontend/src/pages`, `components`, `hooks`, `services`, `utils`, `types`, and `constants`.
- Introduce lightweight internal feature folders incrementally (no router rewrite now).
- Defer full page-router migration until after core security features.

#### 0.3 Testing stack decision

- Backend: Jest + Supertest (as planned).
- Frontend: Vitest + Testing Library (aligned with Vite).
- E2E: Playwright optional after API stabilization.

#### 0.4 Dependency and security baseline

- Lock initial package additions needed for upcoming phases.
- Validate CORS, CSRF, JWT, rate limiter defaults are preserved.

#### 0.5 Delivery controls

- Add phase checklist to track done/in-progress/not-started.
- Define Definition of Done for all next phases.

### Exit Criteria (Must all pass)

- Single canonical backend/frontend paths documented.
- Frontend test strategy changed to Vitest (not Jest).
- Phase sequence approved and dependencies mapped.
- Build and lint pass on both backend and frontend.

### Estimate

1-2 days

---

## 3) Phase 1 - Regional Data Scoping Hardening

### Objective

Enforce region/district access boundaries consistently across middleware, repositories, services, and controllers.

### Key Work

- Keep and harden `scopeGuard` in `backend/src/middleware/rbac.ts`.
- Ensure all list/summary repository queries support scope filters.
- Ensure service layer applies scope for read/write operations.
- Ensure all relevant routes apply `authenticate` + permission + scope checks.
- Add UI scope awareness in current frontend structure (no router migration required).

### Exit Criteria

- Scoped users cannot read/write data outside assignment.
- All scoped list/count/summary endpoints are tested.

### Estimate

4-6 days

---

## 4) Phase 2 - Geographic CRUD (Region/District/Polling Station)

### Objective

Add administration APIs and UI flows for geographic hierarchy management.

### Key Work

- Implement modules for region, district, polling station under `backend/src/modules`.
- Enforce parent-child relationship validation.
- Add activation state and unique code validation.
- Expose CRUD UI views within existing app navigation structure.

### Exit Criteria

- Full CRUD works with RBAC and scope enforcement.
- Relationship validation covered by integration tests.

### Estimate

1 week

---

## 5) Phase 3 - MFA (TOTP)

### Objective

Add MFA for admin-level accounts with secure enrollment and verification.

### Key Work

- Add `mfa` module in backend.
- Integrate MFA challenge into login flow.
- Add QR setup + verification UI.
- Add backup code support.

### Exit Criteria

- MFA-enabled admin cannot complete login without valid second factor.
- Enrollment, verify, disable, recovery paths tested.

### Estimate

1 week

---

## 6) Phase 4 - Session Management

### Objective

Track active sessions and support revocation.

### Key Work

- Add `UserSession` model in Prisma.
- Record sessions on login/refresh.
- Validate active session in auth middleware.
- Add list/revoke session APIs and UI.

### Exit Criteria

- Revoked session tokens are blocked.
- Users/admin can view and terminate active sessions.

### Estimate

1 week

---

## 7) Phase 5 - Password Reset and Recovery

### Objective

Provide secure reset flow with token expiry and strength enforcement.

### Key Work

- Add password reset module and token lifecycle.
- Implement mock email delivery for development.
- Add forgot/reset UI forms and strength meter.

### Exit Criteria

- Reset tokens are single-use and expiring.
- Password policy validated server-side and client-side.

### Estimate

4-5 days

---

## 8) Phase 6 - Observer Evidence Upload

### Objective

Enable observer evidence upload with metadata and controlled lifecycle.

### Key Work

- Add upload middleware and evidence module.
- Store files in local `uploads/` for dev.
- Link evidence metadata to observer reports.
- Build upload and preview UI.

### Exit Criteria

- File validation, storage, retrieval, and deletion paths pass tests.
- RBAC and ownership rules enforced.

### Estimate

5 days

---

## 9) Phase 7 - Reporting and Analytics

### Objective

Deliver scoped reporting APIs with export support and dashboard visualizations.

### Key Work

- Add reports module.
- Implement turnout, demographic, and regional comparison endpoints.
- Add CSV export; PDF export optional.
- Build dashboard charts in current frontend app.

### Exit Criteria

- Report calculations verified against seeded data.
- Exports generated correctly and scoped per user permissions.

### Estimate

1 week

---

## 10) Phase 8 - Real-time Enhancements

### Objective

Enhance existing Socket.IO system with scoped rooms and robust client reconnect behavior.

### Key Work

- Enhance existing socket auth/context in `backend/src/config/socket.ts`.
- Add district room join logic and scoped broadcast utilities.
- Add client reconnection and event subscription hardening.

### Exit Criteria

- Only authorized users receive scoped events.
- Reconnect and token-refresh behavior stable.

### Estimate

4-5 days

---

## 11) Phase 9 - Biometric Mock Enhancement

### Objective

Extend existing biometric capability with deterministic mock scoring and UX feedback.

### Key Work

- Add biometric helper utilities in voter module.
- Extend mock matching score and duplicate detection logic.
- Improve frontend biometric capture status and retry feedback.

### Exit Criteria

- Deterministic scoring and duplicate checks are test-covered.
- Login/register biometric UX is clear and measurable.

### Estimate

4-6 days

---

## 12) Phase 10 - Testing Infrastructure Expansion

### Objective

Complete test coverage foundation for backend/frontend and optional E2E.

### Key Work

- Backend: Jest + Supertest setup and core module tests.
- Frontend: Vitest + Testing Library setup and component tests.
- Optional Playwright for critical journeys.

### Exit Criteria

- Baseline CI test commands pass locally.
- Critical auth/voting/result workflows covered.

### Estimate

1-2 weeks

---

## 13) Phase 11 - Frontend CRUD Completion

### Objective

Incrementally complete admin CRUD interfaces in the current frontend architecture.

### Key Work

- Add user/election/candidate management flows.
- Add shared table/form/filter components.
- Keep UI responsive and accessible.

### Exit Criteria

- CRUD flows functional end-to-end.
- Validation, pagination, and role-based visibility verified.

### Estimate

1-1.5 weeks

---

## 14) Definition of Done (All Phases)

- Type-safe DTO validation in API boundaries.
- RBAC and scope validation enforced.
- Audit events added for sensitive actions.
- Unit/integration tests added for new behavior.
- Build and lint pass with no new TypeScript errors.
- API route registration and docs updated.

---

## 15) Immediate Next Action

Phases 0 through 3 are complete. Start Phase 4 now:

1. Add a `UserSession` persistence model and migration in Prisma.
2. Record and rotate active sessions during login and refresh.
3. Add session listing and revocation APIs plus a frontend management view.

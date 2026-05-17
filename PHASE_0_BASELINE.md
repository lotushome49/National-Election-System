# Phase 0 Baseline

Status: Complete
Date: 2026-05-17

## Canonical Code Paths

- Backend canonical implementation path: `backend/src/**`
- Frontend canonical implementation path: `frontend/src/**`

## Legacy / Non-Canonical Paths

These paths were previously present and have now been removed from the active implementation path:

- `backend/auth.ts`
- `backend/index.ts`
- `backend/routes/authRoutes.ts`
- `backend/db/**`
- `frontend/src/index.ts`

## Current Frontend Entry

- Runtime entry for UI: `frontend/src/main.tsx`

## Testing Strategy Baseline

- Backend tests: Jest + Supertest
- Frontend tests: Vitest + Testing Library
- E2E tests: Playwright (optional, after core phases)

## Phase Checklist

- [x] Rewritten implementation roadmap with Phase 0 first
- [x] Frontend Vitest scripts/config scaffolded
- [x] Frontend test setup file added
- [x] Frontend smoke test added
- [x] Install and lock new frontend test dependencies
- [x] Run frontend build and tests
- [x] Run backend lint/build gate
- [x] Mark Phase 0 Complete

## Current Status

- Phase 0: Complete
- Phase 1: In progress

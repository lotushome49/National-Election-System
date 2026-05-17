# NEHS Implementation Plan
## Step-by-Step Feature Implementation Roadmap

**Project:** National Election Handling System (NEHS)
**Version:** 2.1.0 (Aligned to current repo)
**Created:** 2026-05-17

---

## ?? IMPLEMENTATION SCOPE

This roadmap is aligned to the existing repository structure in `backend/src` and `frontend/src`.
It preserves the current module conventions and builds new subsystems where needed.

1. Regional Data Scoping
2. Biometric System Enhancement (mock)
3. Real-time Socket.IO enhancements
4. Multi-Factor Authentication (MFA)
5. Password Reset & Recovery
6. Session Management
7. Region / District / Polling Station CRUD
8. Observer Evidence Upload
9. Reporting & Analytics
10. Testing Infrastructure
11. Frontend CRUD Interfaces

---

## ?? FEATURE 1: REGIONAL DATA SCOPING

### Overview
Implement hierarchical geographic scoping so regional and district users only access permitted data.

### Backend Implementation

#### Step 1.1: Enhance RBAC and Scope Middleware
**Files to modify:**
- `backend/src/middleware/rbac.ts`
- `backend/src/types/index.ts`

**Tasks:**
- Keep `scopeGuard` in `rbac.ts` and ensure it validates `regionId` / `districtId`.
- Add typed request scope properties in `AuthRequest` if not present.
- Ensure user JWT payload includes `regionId` / `districtId` for scoped users.

#### Step 1.2: Apply scope filtering in repositories
**Files to modify:**
- `backend/src/modules/voter/voter.repository.ts`
- `backend/src/modules/candidate/candidate.repository.ts`
- `backend/src/modules/result/result.repository.ts`
- `backend/src/modules/observer/observer.repository.ts`
- `backend/src/modules/election/election.repository.ts` (if present)

**Tasks:**
- Add optional `scope` parameter to `findAll` or list methods.
- Inject `regionId` / `districtId` conditions into Prisma query filters.
- Make count and summary queries respect user scope.

#### Step 1.3: Propagate scope through services and controllers
**Files to modify:**
- `backend/src/modules/voter/voter.service.ts`
- `backend/src/modules/candidate/candidate.service.ts`
- `backend/src/modules/result/result.service.ts`
- `backend/src/modules/observer/observer.service.ts`
- `backend/src/modules/auth/auth.service.ts`

**Tasks:**
- Pass scoped criteria from controllers to services.
- Validate create/update payloads against user assignment.
- Enforce scope on read operations in service layer.

#### Step 1.4: Route registration
**Files to modify:**
- `backend/src/modules/*/*.routes.ts`
- `backend/src/routes/index.ts`

**Tasks:**
- Ensure routes requiring geographic access use `authenticate` and `scopeGuard`.
- Register any new scoped endpoints in `routes/index.ts`.

### Frontend Implementation

#### Step 1.5: Regional scope awareness
**Files to create/modify:**
- `frontend/src/lib/api.ts` or existing fetch utilities
- `frontend/src/auth.ts`
- `frontend/src/hooks/useRegionalScope.ts`

**Tasks:**
- Read current user scope from auth state.
- Pass `regionId` / `districtId` to backend list requests.
- Display current scope in UI and restrict selection options.

### Testing
- Unit tests for `scopeGuard` logic.
- Integration tests for scoped list endpoints.
- Manual role-based verification for regional/district admin views.

**Estimated Time:** 4-6 days

---

## ?? FEATURE 2: BIOMETRIC SYSTEM ENHANCEMENT (MOCK DATA)

### Overview
Add biometric mock data handling for voter enrollment and simulated biometric matching.

### Backend Implementation

#### Step 2.1: Add biometric fields and schema updates
**Files to modify:**
- `backend/src/modules/voter/voter.schema.ts`
- `backend/src/modules/voter/voter.service.ts`
- `backend/src/modules/voter/voter.repository.ts`

**Tasks:**
- Add biometric template / quality fields to voter schema validation.
- Add optional biometric metadata to voter create/update flows.
- Store mock biometric template data in Prisma if needed.

#### Step 2.2: Create biometric helper module
**Files to create:**
- `backend/src/modules/voter/biometric.service.ts`
- `backend/src/modules/voter/biometric.util.ts`

**Tasks:**
- Generate deterministic mock templates for test voters.
- Implement mock match scoring and duplicate detection.
- Provide quality score simulation and retry guidance.

#### Step 2.3: Expand auth flow for biometric login simulation
**Files to modify:**
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.controller.ts`

**Tasks:**
- Add optional biometric login simulation in auth flow.
- Return confidence and failure reason metadata for UI.
- Audit biometric login attempts.

### Frontend Implementation

#### Step 2.4: Biometric UI improvements
**Files to create/modify:**
- `frontend/src/components/BiometricCapture.tsx`
- `frontend/src/components/BiometricStatus.tsx`
- `frontend/src/hooks/useBiometric.ts`

**Tasks:**
- Add a mock biometric capture experience.
- Show quality score and retry action.
- Display match confidence when biometric login is used.

### Testing
- Unit tests for biometric helper logic.
- Validation tests for biometric fields.
- Integration tests for biometric login simulation.

**Estimated Time:** 4-6 days

---

## ?? FEATURE 3: REAL-TIME FEATURES ENHANCEMENT

### Overview
Use the existing Socket.IO stack for authenticated events and room-based broadcasts.

### Backend Implementation

#### Step 3.1: Socket authentication and middleware
**Files to modify/create:**
- `backend/src/config/socket.ts`
- `backend/src/middleware/socketAuth.ts`

**Tasks:**
- Authenticate socket connections using JWT tokens.
- Populate socket context with userId, role, regionId, districtId.
- Reject unauthorized socket connections cleanly.

#### Step 3.2: Room-based broadcasts
**Files to modify/create:**
- `backend/src/config/socket.ts`
- `backend/src/modules/voting/voting.service.ts`
- `backend/src/modules/result/result.service.ts`

**Tasks:**
- Join sockets to region/district rooms according to scope.
- Publish voter turnout and result updates to scoped rooms.
- Provide election-phase notifications only to authorized rooms.

### Frontend Implementation

#### Step 3.3: Socket client enhancements
**Files to create/modify:**
- `frontend/src/hooks/useSocket.ts`
- `frontend/src/lib/socketClient.ts`

**Tasks:**
- Connect with JWT authentication.
- Handle reconnects and connection state.
- Subscribe to scoped events for live dashboards.

### Testing
- Socket authentication tests.
- Room broadcast and event routing tests.

**Estimated Time:** 1 week

---

## ?? FEATURE 4: MULTI-FACTOR AUTHENTICATION (MFA)

### Overview
Add TOTP-based MFA support for admin-level access.

### Backend Implementation

#### Step 4.1: MFA module
**Files to create:**
- `backend/src/modules/mfa/mfa.controller.ts`
- `backend/src/modules/mfa/mfa.service.ts`
- `backend/src/modules/mfa/mfa.routes.ts`
- `backend/src/modules/mfa/mfa.schema.ts`

**Tasks:**
- Generate TOTP secrets and QR codes with a lightweight library.
- Verify codes in login flows.
- Store MFA status and backup codes in user records.

#### Step 4.2: Update auth flow
**Files to modify:**
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.schema.ts`

**Tasks:**
- Require MFA verification for configured users.
- Add middleware for MFA-protected routes.
- Include MFA claim in JWT tokens when needed.

### Frontend Implementation

#### Step 4.3: MFA UI
**Files to create/modify:**
- `frontend/src/components/MFASetup.tsx`
- `frontend/src/components/MFAVerification.tsx`

**Tasks:**
- Add enrollment flow with QR code.
- Add TOTP code input and validation feedback.
- Add backup code management UI.

### Testing
- TOTP generation and verification tests.
- MFA enrollment flow tests.

**Estimated Time:** 1 week

---

## ?? FEATURE 5: PASSWORD RESET & RECOVERY

### Overview
Implement secure reset flows using tokenized email links and password strength checks.

### Backend Implementation

#### Step 5.1: Password reset module
**Files to create:**
- `backend/src/modules/passwordReset/passwordReset.controller.ts`
- `backend/src/modules/passwordReset/passwordReset.service.ts`
- `backend/src/modules/passwordReset/passwordReset.routes.ts`
- `backend/src/modules/passwordReset/passwordReset.schema.ts`

**Tasks:**
- Generate secure, expiring reset tokens.
- Validate reset request tokens and update passwords.
- Add password strength validation.

#### Step 5.2: Mock email delivery
**Files to create:**
- `backend/src/modules/passwordReset/mockEmail.service.ts`
- `backend/src/modules/passwordReset/emailTemplates.ts`

**Tasks:**
- Log email content to console or file for development.
- Provide a reset link template.
- Use a mock transport rather than real SMTP.

### Frontend Implementation

#### Step 5.3: Reset UI
**Files to create:**
- `frontend/src/pages/ForgotPassword.tsx`
- `frontend/src/pages/ResetPassword.tsx`
- `frontend/src/components/PasswordStrength.tsx`

**Tasks:**
- Create forgot password form.
- Create reset password entry form.
- Display strength suggestions.

### Testing
- Token generation/validation tests.
- Reset flow endpoint tests.

**Estimated Time:** 4-5 days

---

## ?? FEATURE 6: SESSION MANAGEMENT

### Overview
Track active sessions and allow admins/users to review and terminate them.

### Backend Implementation

#### Step 6.1: Add session tracking model
**Files to modify/create:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/session/session.controller.ts`
- `backend/src/modules/session/session.service.ts`
- `backend/src/modules/session/session.routes.ts`

**Tasks:**
- Add `UserSession` model to Prisma schema.
- Create session records on login.
- Update session activity on authenticated requests.
- Add endpoints to list and revoke sessions.

#### Step 6.2: Auth middleware integration
**Files to modify:**
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/middleware/authenticate.ts`

**Tasks:**
- Validate active session on each request.
- Support session revocation in JWT validation.

### Frontend Implementation

#### Step 6.3: Session UI
**Files to create:**
- `frontend/src/pages/ActiveSessions.tsx`
- `frontend/src/components/SessionCard.tsx`

**Tasks:**
- Display active device sessions.
- Allow session termination.
- Show last activity and IP/device context.

### Testing
- Session creation and revocation tests.
- Middleware validation tests.

**Estimated Time:** 1 week

---

## ?? FEATURE 7: REGION / DISTRICT / POLLING STATION CRUD

### Overview
Add geographic management for election administration.

### Backend Implementation

#### Step 7.1: Geographic modules
**Files to create:**
- `backend/src/modules/region/region.controller.ts`
- `backend/src/modules/region/region.service.ts`
- `backend/src/modules/region/region.repository.ts`
- `backend/src/modules/region/region.routes.ts`
- `backend/src/modules/region/region.schema.ts`
- `backend/src/modules/district/district.controller.ts`
- `backend/src/modules/district/district.service.ts`
- `backend/src/modules/district/district.repository.ts`
- `backend/src/modules/district/district.routes.ts`
- `backend/src/modules/district/district.schema.ts`
- `backend/src/modules/pollingStation/pollingStation.controller.ts`
- `backend/src/modules/pollingStation/pollingStation.service.ts`
- `backend/src/modules/pollingStation/pollingStation.repository.ts`
- `backend/src/modules/pollingStation/pollingStation.routes.ts`
- `backend/src/modules/pollingStation/pollingStation.schema.ts`

**Tasks:**
- Implement CRUD for regions, districts, polling stations.
- Enforce region/district relationships.
- Add activation status and unique code validation.
- Register new routes in `backend/src/routes/index.ts`.

### Frontend Implementation

#### Step 7.2: Geographic management UI
**Files to create:**
- `frontend/src/pages/RegionManagement.tsx`
- `frontend/src/pages/DistrictManagement.tsx`
- `frontend/src/pages/PollingStationManagement.tsx`
- `frontend/src/components/RegionForm.tsx`
- `frontend/src/components/DistrictForm.tsx`
- `frontend/src/components/PollingStationForm.tsx`

**Tasks:**
- Add region/district/polling station management views.
- Use list and form patterns consistent with existing UI.
- Show relationships and scope-aware filtering.

### Testing
- CRUD endpoint tests.
- Relationship validation tests.

**Estimated Time:** 1 week

---

## ?? FEATURE 8: OBSERVER EVIDENCE UPLOAD

### Overview
Allow observers to upload evidence files using local mock storage.

### Backend Implementation

#### Step 8.1: File upload support
**Files to create/modify:**
- `backend/src/middleware/fileUpload.ts`
- `backend/src/modules/evidence/evidence.controller.ts`
- `backend/src/modules/evidence/evidence.routes.ts`
- `backend/src/modules/evidence/evidence.service.ts`
- `backend/src/modules/evidence/evidence.schema.ts`

**Dependencies to add:**
- `multer`
- `@types/multer`

**Tasks:**
- Enable multipart upload and server-side validation.
- Store files in a local `uploads/` directory for development.
- Save evidence metadata to the database.

#### Step 8.2: Evidence lifecycle
**Files to modify:**
- `backend/src/modules/observer/observer.service.ts`
- `backend/src/modules/observer/observer.schema.ts`

**Tasks:**
- Link evidence items to observer reports.
- Add endpoints for listing, retrieving, and deleting evidence.

### Frontend Implementation

#### Step 8.3: Evidence upload UI
**Files to create:**
- `frontend/src/components/FileUpload.tsx`
- `frontend/src/components/EvidenceGallery.tsx`
- `frontend/src/hooks/useFileUpload.ts`

**Tasks:**
- Build drag-and-drop and progress UI.
- Offer preview thumbnails where possible.
- Show evidence metadata in a gallery view.

### Testing
- Upload validation tests.
- Evidence association tests.

**Estimated Time:** 5 days

---

## ?? FEATURE 9: REPORTING & ANALYTICS

### Overview
Provide dashboards, export endpoints, and scoped reports.

### Backend Implementation

#### Step 9.1: Reporting module
**Files to create:**
- `backend/src/modules/reports/reports.controller.ts`
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/reports/reports.routes.ts`
- `backend/src/modules/reports/reports.schema.ts`

**Tasks:**
- Implement turnout and regional comparison endpoints.
- Build summary endpoints for voter demographics and results.
- Add scope filtering to reports.

#### Step 9.2: Export utilities
**Files to create:**
- `backend/src/utils/csvGenerator.ts`
- `backend/src/utils/pdfGenerator.ts`

**Dependencies to add (optional):**
- `csv-writer`
- `pdfkit`

**Tasks:**
- Produce CSV exports for report endpoints.
- Provide basic PDF export if needed.

### Frontend Implementation

#### Step 9.3: Analytics UI
**Files to create:**
- `frontend/src/pages/AnalyticsDashboard.tsx`
- `frontend/src/components/charts/VoterTurnoutChart.tsx`
- `frontend/src/components/charts/DemographicChart.tsx`
- `frontend/src/components/charts/RegionalComparison.tsx`

**Dependencies to add (optional):**
- `recharts` or `react-chartjs-2`

**Tasks:**
- Add dashboard charts and export buttons.
- Display scoped reports according to user role.

### Testing
- Report calculation tests.
- Export endpoint tests.

**Estimated Time:** 1 week

---

## ?? FEATURE 10: TESTING INFRASTRUCTURE

### Overview
Add testing support for backend and frontend.

### Backend Testing

#### Step 10.1: Unit and integration test setup
**Files to create:**
- `backend/jest.config.js`
- `backend/src/tests/setup.ts`
- `backend/src/tests/helpers/testDb.ts`
- `backend/src/tests/helpers/mockData.ts`

**Dependencies to add:**
- `jest`
- `ts-jest`
- `supertest`
- `@types/jest`
- `@types/supertest`

**Tasks:**
- Configure Jest and TS support.
- Set up test database handling.
- Add helper utilities for Prisma and HTTP tests.

#### Step 10.2: Core service tests
**Files to create:**
- `backend/src/modules/auth/auth.service.test.ts`
- `backend/src/modules/user/user.service.test.ts`
- `backend/src/modules/voter/voter.service.test.ts`
- `backend/src/modules/election/election.service.test.ts`

**Tasks:**
- Cover authentication, user, voter, election flows.
- Mock database and external dependencies.

### Frontend Testing

#### Step 10.3: React test setup
**Files to create:**
- `frontend/jest.config.js`
- `frontend/src/tests/setup.ts`
- `frontend/src/tests/helpers/renderWithProviders.tsx`

**Dependencies to add:**
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jest-environment-jsdom`

**Tasks:**
- Configure component testing.
- Add render helpers for router/auth context.

### E2E Testing

#### Step 10.4: Playwright setup (optional)
**Files to create:**
- `e2e/playwright.config.ts`
- `e2e/tests/auth.spec.ts`
- `e2e/tests/voting.spec.ts`

**Dependencies to add:**
- `@playwright/test`

**Tasks:**
- Cover critical user journeys.
- Test end-to-end login, voting, and admin workflows.

**Estimated Time:** 1-2 weeks

---

## ?? FEATURE 11: COMPLETE FRONTEND CRUD INTERFACES

### Overview
Build frontend administration pages and forms consistent with current app structure.

### Implementation

#### Step 11.1: User management
**Files to create:**
- `frontend/src/pages/UserManagement.tsx`
- `frontend/src/components/forms/UserForm.tsx`
- `frontend/src/components/UserTable.tsx`
- `frontend/src/hooks/useUserManagement.ts`

#### Step 11.2: Election management
**Files to create:**
- `frontend/src/pages/ElectionManagement.tsx`
- `frontend/src/components/forms/ElectionForm.tsx`
- `frontend/src/components/ElectionCalendar.tsx`
- `frontend/src/hooks/useElectionManagement.ts`

#### Step 11.3: Candidate management
**Files to create:**
- `frontend/src/pages/CandidateManagement.tsx`
- `frontend/src/components/forms/CandidateForm.tsx`
- `frontend/src/components/CandidateCard.tsx`
- `frontend/src/hooks/useCandidateManagement.ts`

#### Step 11.4: Shared UI components
**Files to create:**
- `frontend/src/components/DataTable.tsx`
- `frontend/src/components/SearchFilter.tsx`
- `frontend/src/components/BulkActions.tsx`
- `frontend/src/components/StatusBadge.tsx`

**Tasks:**
- Add consistent CRUD forms and tables.
- Use centralized API utilities and auth-aware calls.
- Ensure responsiveness and accessibility.

### Testing
- Component integration tests.
- Form validation tests.

**Estimated Time:** 1.5 weeks

---

## ? Notes
- This plan is designed to fit the existing repository layout in `backend/src` and `frontend/src`.
- New modules should follow the current `modules/<name>/<name>.*.ts` convention.
- Add routes in `backend/src/routes/index.ts` for each new backend module.
- Keep frontend work modular to preserve the current component-based app structure.

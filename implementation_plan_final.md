# Role-Specific Dashboards Implementation Plan

This plan details the implementation of a single authenticated shell that strictly adapts the dashboard, navigation, and key metrics for seven distinct roles (`SUPER_ADMIN`, `ADMIN`, `REGIONAL_ADMIN`, `DISTRICT_ADMIN`, `STAFF`, `OBSERVER`, and `VOTER`) without conflict, fulfilling the provided acceptance criteria.

## Proposed Changes

### 1. Unified AppShell & Sidebar Updates

The main `AppShell.tsx` component will be refactored so that its sidebar perfectly reflects the links specified for each role. Currently, the sidebar relies heavily on raw permission checks (`checkPerm`). We will create a strict sidebar mapping or a wrapper that guarantees no role sees irrelevant controls.

#### [MODIFY] [AppShell.tsx](file:///c:/Users/Dev%20Girma/Election/National-Election-System/frontend/src/pages/AppShell.tsx)
- Reorganize the sidebar rendering logic into a declarative role-to-menu mapping matching your exact spec.
- Enhance the persistent top bar and user summary.
- Standardize the mobile sidebar dropdown to match the desktop mapping.

---

### 2. Role-Specific Dashboards (Dispatcher Pattern)

Instead of a monolithic `DashboardView.tsx` with countless `if (role === ...)` statements, we will refactor `DashboardView` into a dispatcher that mounts the specific dashboard component tailored to the active role.

#### [MODIFY] [DashboardView.tsx](file:///c:/Users/Dev%20Girma/Election/National-Election-System/frontend/src/components/admin/DashboardView.tsx)
- Refactor to act as a router: `switch(role) { case 'SUPER_ADMIN': return <SuperAdminDashboard />; ... }`

#### [NEW] `frontend/src/components/dashboards/SuperAdminDashboard.tsx`
- **Widgets:** National totals (users, voters, candidates, etc.), security health (MFA/failed logins), live alerts.
- **Charts:** Election phase distribution, users by role, audit trends.

#### [NEW] `frontend/src/components/dashboards/AdminDashboard.tsx`
- **Widgets:** Active elections, pending user tasks, registry health.
- **Charts:** Registration trend, voters by region, operational activity.

#### [NEW] `frontend/src/components/dashboards/RegionalDashboard.tsx`
- **Widgets:** Region summary, district health, registered voters, polling stations.
- **Charts:** Voters by district, regional turnout.

#### [NEW] `frontend/src/components/dashboards/DistrictDashboard.tsx`
- **Widgets:** District summary, registry tasks, polling station status, local issue alerts.
- **Charts:** Voters by polling station, verification status.

#### [NEW] `frontend/src/components/dashboards/StaffDashboard.tsx`
- **Widgets:** Fast voter search, verification queue, assigned tasks.
- **Charts:** Verified vs pending voters, daily registration volume.

#### [NEW] `frontend/src/components/dashboards/ObserverDashboard.tsx`
- **Widgets:** Current election status, submission counts, open incidents.
- **Charts:** Incidents by type, evidence submitted.

---

### 3. Voter Experience Refinement

The `VoterHub.tsx` is already somewhat tailored but needs adjustments to align perfectly with the "simple, action-focused" specification.

#### [MODIFY] [VoterHub.tsx](file:///c:/Users/Dev%20Girma/Election/National-Election-System/frontend/src/components/voter/VoterHub.tsx)
- Ensure the primary widgets include Registration status, Election availability, Voting status, and Receipt summary.
- Strip away any excessive data components to maintain strict simplicity.

## Open Questions

> [!IMPORTANT]
> The current `DashboardView` relies heavily on a `results` prop passed down from `AppShell` which contains live candidate votes. Should these new role-specific dashboards mock the missing charts (like "audit activity trend" and "incidents by type") using static UI for now until the backend aggregates these specific stats, or do you have backend endpoints ready for them?

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no TypeScript conflicts or missing imports in the newly split component structure.

### Manual Verification
- Log in sequentially using each of the 7 mock users configured previously (e.g. `superadmin`, `admin`, `regional`, `district`, `staff`, `observer`, `voter`).
- Verify that the sidebar perfectly matches the requested Spec list.
- Verify that the main dashboard area mounts the correct localized widget structure without leaking data.

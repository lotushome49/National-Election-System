# NEHS — Database Schema Documentation

## Entity Relationship Overview

```
Region ──< District ──< PollingStation
   │            │              │
   └────────────┴──────────────┴──> Voter
                                      │
Role ──< RolePermission               │
  │                                   │
User ──────────────────────────> VotingToken ──> Ballot
  │                                              │
  ├──> AuditLog                                  │
  ├──> Notification                              ▼
  └──> ObserverReport              Election ──< Candidate
                                       │            │
                                       └──> Result <┘
```

---

## Tables & Relationships

### Region → District → PollingStation
- **Region** is the top-level geographic unit.
- **District** belongs to one Region (`region_id FK`). A region has many districts.
- **PollingStation** belongs to one District and one Region (denormalised for fast queries).

### Role → RolePermission ← (RBAC)
- **Role** defines a named role (e.g. `ADMIN`, `OBSERVER`).
- **RolePermission** is a junction table mapping roles to granular permissions.
- **User** holds a single `role_id` FK — one role per user.

### User → Voter (optional link)
- A **Voter** may optionally have a portal **User** account (`user_id` nullable FK).
- Voter identity is independent of system access.

### Election → Candidate
- An **Election** has many **Candidates**.
- Unique constraint: `(election_id, party, region_id)` — one party per constituency per election.

### Voter → VotingToken → Ballot (vote flow)
1. A **VotingToken** is issued to a Voter for a specific Election (unique per voter+election).
2. The token is single-use (`UNIQUE voting_token_id` on Ballot).
3. A **Ballot** records the vote. `voter_id` is retained for audit but access-controlled.
4. `receipt_hash` lets a voter independently verify their vote was counted.

### Election → Result
- **Result** stores pre-aggregated tallies scoped by `(election, candidate, region, district, polling_station)`.
- Unique constraint prevents duplicate aggregation rows for the same scope.

### User → AuditLog
- Every significant action writes an **AuditLog** row with `old_values`/`new_values` JSON.
- `user_id` is nullable (system events have no user).

### User → ObserverReport
- Only users with role `OBSERVER` should create reports (enforced at application layer).
- Reports are soft-deleted.

### User → Notification
- Notifications are per-user, multi-channel (EMAIL, SMS, IN_APP, PUSH).

---

## Election Lifecycle States

```
DRAFT
  └─> SCHEDULED
        └─> NOMINATION_OPEN
              └─> NOMINATION_CLOSED
                    └─> CAMPAIGN
                          └─> VOTING_OPEN
                                └─> VOTING_CLOSED
                                      └─> COUNTING
                                            └─> RESULTS_DECLARED
                                                  └─> (terminal)

Any state ──> DISPUTED
Any state ──> CANCELLED
```

Valid transitions are enforced at the application/service layer, not the DB.

---

## Soft Delete Strategy

All mutable entities have a `deleted_at DATETIME(3) NULL` column.

- **Soft delete**: `UPDATE table SET deleted_at = NOW() WHERE id = ?`
- **Active records**: `WHERE deleted_at IS NULL`
- **Restore**: `UPDATE table SET deleted_at = NULL WHERE id = ?`
- **Hard purge** (scheduled job): `DELETE FROM table WHERE deleted_at < DATE_SUB(NOW(), INTERVAL 90 DAY)`

Indexes on `deleted_at` ensure soft-delete filters are fast.

---

## Audit Fields (all mutable tables)

| Column       | Type         | Purpose                          |
|--------------|--------------|----------------------------------|
| `created_at` | DATETIME(3)  | Row creation timestamp           |
| `updated_at` | DATETIME(3)  | Last modification (auto-updated) |
| `created_by` | VARCHAR(36)  | User ID who created the row      |
| `updated_by` | VARCHAR(36)  | User ID who last modified        |
| `deleted_at` | DATETIME(3)  | Soft delete timestamp (nullable) |

---

## Index Strategy

| Pattern                        | Index type     | Reason                                  |
|-------------------------------|----------------|-----------------------------------------|
| All PKs                        | PRIMARY        | Clustered lookup                        |
| All FKs                        | KEY (non-unique)| JOIN performance                       |
| `deleted_at`                   | KEY            | Soft-delete filter on every query       |
| `status` columns               | KEY            | Frequent filter (election status, etc.) |
| `(election_id, voter_id)`      | UNIQUE         | One token per voter per election        |
| `(election_id, candidate_id, region_id, ...)` | UNIQUE | Prevent duplicate result rows |
| `token_hash`, `receipt_hash`   | UNIQUE         | Cryptographic deduplication             |
| `national_id`, `voter_id`, `biometric_hash` | UNIQUE | Voter deduplication            |
| `(voting_start, voting_end)`   | KEY (composite)| Time-window queries                     |

---

## Migration Strategy

### Phase 1 — Fresh install
```bash
# Run the SQL migration directly
mysql -u root -p nehs_db < backend/prisma/migrations/001_initial_schema.sql
```

### Phase 2 — Drizzle Kit (existing Drizzle project)
```bash
# Generate migration from updated schema.ts
npx drizzle-kit generate

# Push to dev DB
npx drizzle-kit push

# Inspect current DB state
npx drizzle-kit studio
```

### Phase 3 — Prisma (if migrating to Prisma)
```bash
# Install Prisma
npm install prisma @prisma/client

# Initialise (skip if prisma/ folder already exists)
npx prisma init --datasource-provider mysql

# Create first migration from schema.prisma
npx prisma migrate dev --name initial_schema

# Generate client
npx prisma generate
```

### Phase 4 — Production deployment
```bash
# Apply pending migrations without prompts
npx prisma migrate deploy
# or for Drizzle:
npx drizzle-kit migrate
```

### Rollback strategy
- Each migration file is numbered (`001_`, `002_`, …).
- Write a corresponding `001_rollback.sql` that reverses each DDL statement.
- Use `SET FOREIGN_KEY_CHECKS = 0` at the top of rollback scripts.
- Never drop columns in the same migration that removes data — use two-phase migrations.

---

## Security Notes

| Concern              | Approach                                                        |
|---------------------|-----------------------------------------------------------------|
| Biometric data       | AES-256 encrypted in `biometric_template`; only hash stored for dedup |
| Passwords            | bcrypt hash in `password_hash`; plaintext never stored          |
| Voting tokens        | SHA-256 hash stored; raw token sent to voter once, never stored |
| Ballot anonymity     | `voter_id` on Ballot is access-controlled; receipt hash for self-verification |
| MFA secret           | Encrypted at rest; only decrypted during TOTP verification      |
| Audit immutability   | `audit_logs` has no `updated_at` / `deleted_at` — append-only  |

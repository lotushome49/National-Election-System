import { mysqlTable, varchar, timestamp, int, text, boolean, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const regions = mysqlTable('regions', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const districts = mysqlTable('districts', {
    id: varchar('id', { length: 36 }).primaryKey(),
    regionId: varchar('region_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    password: varchar('password', { length: 255 }).notNull(),
    role: mysqlEnum('role', [
        'ADMIN',
        'REGIONAL_ADMIN',
        'DISTRICT_ADMIN',
        'STAFF',
        'OBSERVER',
        'VOTER',
    ]).notNull().default('VOTER'),
    assignedRegion: varchar('assigned_region', { length: 36 }),
    assignedDistrict: varchar('assigned_district', { length: 36 }),
    status: mysqlEnum('status', ['ACTIVE', 'SUSPENDED', 'LOCKED']).notNull().default('ACTIVE'),
    failedAttempts: int('failed_attempts').default(0),
    lockUntil: timestamp('lock_until'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const voters = mysqlTable('voters', {
    id: varchar('id', { length: 36 }).primaryKey(),
    voterId: varchar('voter_id', { length: 50 }).notNull().unique(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    dob: varchar('dob', { length: 20 }).notNull(),
    nationalId: varchar('national_id', { length: 50 }).notNull().unique(),
    address: text('address'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    regionId: varchar('region_id', { length: 36 }),
    districtId: varchar('district_id', { length: 36 }),
    biometricTemplate: text('biometric_template'), // AES Encrypted
    biometricHash: varchar('biometric_hash', { length: 255 }).notNull().unique(), // SHA-256
    hasVoted: boolean('has_voted').default(false),
    registrationDate: timestamp('registration_date').defaultNow(),
}, (table) => ({
    nationalIdx: index('national_idx').on(table.nationalId),
    voterIdx: index('voter_id_idx').on(table.voterId),
}));

export const electionSettings = mysqlTable('election_settings', {
    id: int('id').primaryKey().autoincrement(),
    phase: mysqlEnum('phase', ['REGISTRATION', 'VOTING', 'CLOSED']).notNull().default('REGISTRATION'),
    electionName: varchar('election_name', { length: 255 }).default('National Election 2026'),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});

export const candidates = mysqlTable('candidates', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    party: varchar('party', { length: 255 }).notNull(),
    bio: text('bio'),
    manifesto: text('manifesto'),
    symbol: varchar('symbol', { length: 10 }),
    photoUrl: text('photo_url'),
});

export const votes = mysqlTable('votes', {
    id: int('id').primaryKey().autoincrement(),
    candidateId: varchar('candidate_id', { length: 36 }).notNull(),
    regionId: varchar('region_id', { length: 36 }).notNull(),
    districtId: varchar('district_id', { length: 36 }),
    timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
    candidateIdx: index('candidate_idx').on(table.candidateId),
}));

export const auditLogs = mysqlTable('audit_logs', {
    id: int('id').primaryKey().autoincrement(),
    event: varchar('event', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }),
    details: text('details'),
    timestamp: timestamp('timestamp').defaultNow(),
});
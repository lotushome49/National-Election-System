import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import crypto from "crypto";
import dotenv from "dotenv";
import { db, isConnected } from "./src/db";
import { users, voters, candidates, votes, auditLogs, electionSettings } from "./src/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const JWT_EXPIRES_IN = "1h";
const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY || "db_secret_key_32_bytes_long_12345", "utf8").slice(0, 32);
const IV_LENGTH = 16;

// Biometric Template Encryption Helpers (AES-256-CBC)
function encryptBiometric(template: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(template);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptBiometric(ciphertext: string): string {
  const [ivHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

function normalizeBiometricSample(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function computeDeterministicBiometricScore(
  probe: string,
  reference: string,
): number {
  const p = normalizeBiometricSample(probe);
  const r = normalizeBiometricSample(reference);

  if (!p || !r) return 0;
  if (p === r) return 100;

  const probeGrams = buildBigrams(p);
  const refGrams = buildBigrams(r);

  const intersection = [...probeGrams].filter((gram) => refGrams.has(gram)).length;
  const union = new Set([...probeGrams, ...refGrams]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const prefix = commonPrefixLength(p, r) / Math.max(p.length, r.length);
  const lengthDelta =
    Math.abs(p.length - r.length) / Math.max(1, Math.max(p.length, r.length));

  const weighted = jaccard * 0.8 + prefix * 0.25 - lengthDelta * 0.15;
  const score = Math.round(Math.max(0, Math.min(1, weighted)) * 100);

  return score;
}

function buildBigrams(value: string): Set<string> {
  if (value.length < 2) return new Set([value]);

  const grams: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    grams.push(value.slice(i, i + 2));
  }

  return new Set(grams);
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let count = 0;

  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) break;
    count += 1;
  }

  return count;
}

// Rate limiter for authentication and registration attempts - Relaxed for development
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Login rate limit exceeded. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const lookupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Lookup rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Global security middleware
const setupSecurity = (app: express.Application) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https:", "http:"],
      },
    },
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
};

const simulatedCitizens = [
  {
    nationalId: "NID-123456",
    fullName: "Abebe Bikila",
    dob: "1985-05-15",
    gender: "Male",
    address: "Addis Ababa, Arada Sub-city, House 123",
    citizenshipStatus: "Ethiopian",
    phone: "+251911223344"
  },
  {
    nationalId: "NID-654321",
    fullName: "Tirunesh Dibaba",
    dob: "1990-10-20",
    gender: "Female",
    address: "Addis Ababa, Bole Sub-city, House 456",
    citizenshipStatus: "Ethiopian",
    phone: "+251911556677"
  },
  {
    nationalId: "NID-111222",
    fullName: "John Doe",
    dob: "1988-01-01",
    gender: "Male",
    address: "Foreign St., London",
    citizenshipStatus: "UK",
    phone: "+44123456789"
  },
  {
    nationalId: "NID-333444",
    fullName: "Young Kid",
    dob: "2015-01-01",
    gender: "Male",
    address: "School Rd., Addis",
    citizenshipStatus: "Ethiopian"
  }
];

const ROLES = {
  ADMIN: "ADMIN",
  REGIONAL_ADMIN: "REGIONAL_ADMIN",
  DISTRICT_ADMIN: "DISTRICT_ADMIN",
  STAFF: "STAFF",
  OBSERVER: "OBSERVER",
  VOTER: "VOTER"
};

const PERMISSIONS = {
  // Voter
  CAST_VOTE: [ROLES.VOTER],

  // System Administrator
  MANAGE_ELECTION: [ROLES.ADMIN],
  MANAGE_USERS: [ROLES.ADMIN],
  VIEW_AUDIT_LOGS: [ROLES.ADMIN],

  // Regional Administrator
  VIEW_REGIONAL_STATS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN],
  MANAGE_DISTRICT_OPERATIONS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN],

  // District Administrator
  VIEW_DISTRICT_STATS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN],
  MANAGE_STAFF: [ROLES.ADMIN, ROLES.DISTRICT_ADMIN],

  // Registration Staff
  REGISTER_VOTER: [ROLES.ADMIN, ROLES.STAFF, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN],
  VIEW_VOTERS: [ROLES.ADMIN, ROLES.STAFF, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN],

  // Election Observer
  VIEW_RESULTS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.STAFF, ROLES.OBSERVER],
  MONITOR_ELECTION: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.OBSERVER]
};

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
    },
  });

  // Socket authentication middleware to identify regional admins
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err);
      next(new Error("Authentication error"));
    }
  });

  setupSecurity(app);
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: isConnected ? "database" : "demo" });
  });

  // In-memory fallback stores for demo mode (when DATABASE_URL is missing)
  const memoryDb = {
    users: [
      {
        id: "admin-1",
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        role: "ADMIN",
        fullName: "System Admin",
        status: "ACTIVE"
      },
      {
        id: "regional-1",
        username: "regional",
        password: bcrypt.hashSync("admin123", 10),
        role: "REGIONAL_ADMIN",
        fullName: "Regional Administrator",
        assignedRegion: "r1",
        status: "ACTIVE"
      },
      {
        id: "staff-1",
        username: "staff",
        password: bcrypt.hashSync("admin123", 10),
        role: "STAFF",
        fullName: "Registration Staff",
        assignedRegion: "r1",
        status: "ACTIVE"
      },
      {
        id: "observer-1",
        username: "observer",
        password: bcrypt.hashSync("admin123", 10),
        role: ROLES.OBSERVER,
        fullName: "Election Observer",
        status: "ACTIVE"
      },
      {
        id: "district-1",
        username: "district",
        password: bcrypt.hashSync("admin123", 10),
        role: "DISTRICT_ADMIN",
        fullName: "District Administrator",
        assignedRegion: "r1",
        assignedDistrict: "Bole",
        status: "ACTIVE"
      }
    ] as any[],
    voters: [
      {
        id: "voter-1",
        voterId: "ET-2026-8941-4567",
        fullName: "Abebe Bikila",
        dob: "1985-05-15",
        nationalId: "NID-123456",
        address: "Addis Ababa, Arada Sub-city, House 123",
        phone: "+251911223344",
        email: "abebe@election.gov.et",
        regionId: "r1",
        districtId: "Bole",
        biometricTemplate: "encrypted_template_1",
        biometricHash: "c3a8b9f0e1d2c3b4a5f6e7",
        hasVoted: false,
        isVerified: true,
        registrationDate: new Date()
      },
      {
        id: "voter-2",
        voterId: "ET-2026-1049-7890",
        fullName: "Tirunesh Dibaba",
        dob: "1990-10-20",
        nationalId: "NID-654321",
        address: "Addis Ababa, Bole Sub-city, House 456",
        phone: "+251911556677",
        email: "tirunesh@election.gov.et",
        regionId: "r1",
        districtId: "Bole",
        biometricTemplate: "encrypted_template_2",
        biometricHash: "a1b2c3d4e5f6a1b2c3d4e5",
        hasVoted: false,
        isVerified: false,
        registrationDate: new Date()
      }
    ] as any[],
    votes: [] as any[],
    auditLogs: [] as any[],
    electionSettings: [{ id: 1, phase: 'REGISTRATION' }]
  };

  const logAudit = async (event: string, details: any) => {
    try {
      const logEntry = {
        event,
        userId: details.adminId || details.userId || details.voterId || "SYSTEM",
        details: JSON.stringify(details),
        timestamp: new Date()
      };

      if (isConnected) {
        await db.insert(auditLogs).values(logEntry);
      } else {
        memoryDb.auditLogs.push(logEntry);
      }

      console.log(`[AUDIT] ${event}:`, JSON.stringify(details));
    } catch (e) {
      console.error("Failed to log audit event:", e);
    }
  };

  // Database Seeding
  const seedCandidates = [
    {
      id: "c1",
      name: "Dr. Abiy Ahmed",
      party: "Prosperity Party",
      symbol: "💡",
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Prime_Minister_of_Ethiopia_Abiy_Ahmed_Ali_%28cropped%29.jpg/500px-Prime_Minister_of_Ethiopia_Abiy_Ahmed_Ali_%28cropped%29.jpg?v=2',
      bio: "Dr. Abiy Ahmed has served as the Prime Minister of Ethiopia since 2018. He was awarded the 2019 Nobel Peace Prize for his work in ending the 20-year post-war territorial stalemate between Ethiopia and Eritrea.",
      manifesto: "To build a prosperous, stable, and united Ethiopia through institutional reforms and economic liberalization.",
      platform: "Economic modernization, expansion of infrastructure, and national reconciliation."
    },
    {
      id: "c2",
      name: "Jawar Mohammed",
      party: "OFN",
      symbol: "⛰️",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Jawar_Mohammed_%28cropped%29.jpg/500px-Jawar_Mohammed_%28cropped%29.jpg",
      bio: "Jawar Mohammed is a prominent political activist and the former director of the Oromia Media Network. He is a key figure in the Oromo Federalist Congress.",
      manifesto: "Advocating for true federalism and the self-determination of the Oromo people.",
      platform: "Reform of the federal structure, social justice, and linguistic rights."
    },
    {
      id: "c3",
      name: "Berhanu Nega",
      party: "EZEMA",
      symbol: "🛡️",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Minister_of_Education_Birhanu_Nega.jpg/500px-Minister_of_Education_Birhanu_Nega.jpg",
      bio: "Berhanu Nega is a professor of economics and the leader of the Ethiopian Citizens for Social Justice (EZEMA). He was formerly the mayor-elect of Addis Ababa.",
      manifesto: "Establishing a system of social justice and ensuring the rule of law for all Ethiopian citizens.",
      platform: "Academic freedom, economic justice, and institutional integrity."
    },
    {
      id: "c4",
      name: "Independent",
      party: "Coalition of Youth",
      symbol: "🦅",
      photoUrl: "https://picsum.photos/seed/independent/400/400",
      bio: "A grassroots movement representing the voices of Ethiopia's youth and their desire for change and participation in the political process.",
      manifesto: "Empowering the youth through education, employment, and political representation.",
      platform: "Job creation, digital transformation, and transparency in governance."
    },
  ];

  const seedDatabase = async () => {
    if (isConnected) {
      try {
        console.log("Checking database for seeding...");
        const existingCandidates = await db.select().from(candidates);
        if (existingCandidates.length === 0) {
          await db.insert(candidates).values(seedCandidates);
          console.log("Database seeded with initial candidates.");
        }

        const existingAdmins = await db.select().from(users).where(eq(users.role, "ADMIN"));
        if (existingAdmins.length === 0) {
          await db.insert(users).values([
            {
              id: "admin-1",
              username: "admin",
              password: bcrypt.hashSync("admin123", 10),
              role: "ADMIN",
              fullName: "System Admin",
              status: "ACTIVE"
            },
            {
              id: "regional-1",
              username: "regional",
              password: bcrypt.hashSync("admin123", 10),
              role: "REGIONAL_ADMIN",
              fullName: "Regional Admin",
              assignedRegion: "r1",
              status: "ACTIVE"
            },
            {
              id: "staff-1",
              username: "staff",
              password: bcrypt.hashSync("admin123", 10),
              role: "STAFF",
              fullName: "Reg Staff",
              assignedRegion: "r1",
              status: "ACTIVE"
            },
            {
              id: "observer-1",
              username: "observer",
              password: bcrypt.hashSync("admin123", 10),
              role: "OBSERVER",
              fullName: "Election Observer",
              status: "ACTIVE"
            },
            {
              id: "district-1",
              username: "district",
              password: bcrypt.hashSync("admin123", 10),
              role: "DISTRICT_ADMIN",
              fullName: "Dist Admin",
              assignedRegion: "r1",
              assignedDistrict: "Bole",
              status: "ACTIVE"
            }
          ] as any[]);
          console.log("Database seeded with default administrative users.");
        }
      } catch (e) {
        console.error("Database seeding failed:", e);
      }
    } else {
      console.log("Running in DEMO mode with in-memory data (MySQL not connected).");
    }
  };

  const REGIONS = [
    { id: "r1", name: "Addis Ababa" },
    { id: "r2", name: "Amhara" },
    { id: "r3", name: "Oromia" },
    { id: "r4", name: "Tigray" },
    { id: "r5", name: "Somali" },
    { id: "r6", name: "Sidama" },
    { id: "r7", name: "Afar" },
    { id: "r8", name: "Benishangul-Gumuz" },
    { id: "r9", name: "Gambela" },
    { id: "r10", name: "Harari" },
    { id: "r11", name: "Dire Dawa" },
  ];

  let electionPhase: "REGISTRATION" | "VOTING" | "CLOSED" = "REGISTRATION";

  const authorize = (permission: string) => {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

      try {
        const token = authHeader.split(" ")[1];
        const ticket = jwt.verify(token, JWT_SECRET) as any;
        req.user = ticket;

        const allowedRoles = (PERMISSIONS as any)[permission];

        const isAuthorized = allowedRoles.includes(ticket.role);

        if (!isAuthorized) {
          console.warn(`Access denied for role ${ticket.role} attempting permission ${permission}`);
          return res.status(403).json({ error: `Forbidden: Requires ${permission} permission` });
        }

        // Hierarchical Admin Scoping
        if (ticket.role === ROLES.REGIONAL_ADMIN || ticket.role === ROLES.DISTRICT_ADMIN) {
          if (permission === 'MANAGE_ELECTION' || permission === 'MANAGE_USERS') {
            return res.status(403).json({ error: "Forbidden: Global actions restricted to System Administrator" });
          }
        }

        // Data Scoping
        if (ticket.role === ROLES.REGIONAL_ADMIN && req.body.regionId && req.body.regionId !== ticket.regionId) {
          return res.status(403).json({ error: "Forbidden: Cannot access data outside your assigned region" });
        }

        if (ticket.role === ROLES.DISTRICT_ADMIN && req.body.districtId && req.body.districtId !== ticket.districtId) {
          return res.status(403).json({ error: "Forbidden: Cannot access data outside your assigned district" });
        }

        await logAudit("PERMISSION_AUTHORIZED", {
          userId: ticket.id || ticket.role,
          role: ticket.role,
          permission,
          time: new Date()
        });

        next();
      } catch (e) {
        res.status(401).json({ error: "Invalid token" });
      }
    };
  };

  // Socket setup
  io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);

    // Send initial results
    socket.emit("results-update", await getVoteCounts());

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  async function getVoteCounts(scopeRegionId?: string) {
    try {
      let allCandidates: any[] = seedCandidates;
      let allVotes: any[] = memoryDb.votes;

      if (isConnected) {
        try {
          allCandidates = await db.select().from(candidates);
          allVotes = await db.select().from(votes);
        } catch (dbErr) {
          console.error("DB Select failed, falling back to memory:", dbErr);
        }
      }

      const staticRegions = [
        { id: "r1", name: "Addis Ababa", districts: ["Kirkos", "Bole", "Arada", "Lideta"] },
        { id: "r2", name: "Amhara", districts: ["Gondar", "Bahir Dar", "Dessie"] },
        { id: "r3", name: "Oromia", districts: ["Adama", "Jimma", "Bishoftu"] },
        { id: "r4", name: "Tigray", districts: ["Mekelle", "Adigrat", "Axum"] },
        { id: "r5", name: "Somali", districts: ["Jijiga", "Gode", "Kebridahar"] },
        { id: "r6", name: "Sidama", districts: ["Hawassa", "Yirgalem"] },
        { id: "r7", name: "Afar", districts: ["Semera", "Asaita"] },
        { id: "r8", name: "Benishangul-Gumuz", districts: ["Assosa", "Kamashi"] },
        { id: "r9", name: "Gambela", districts: ["Gambela Town", "Itang"] },
        { id: "r10", name: "Harari", districts: ["Harar City"] },
        { id: "r11", name: "Dire Dawa", districts: ["Dire Dawa Town"] },
      ];

      const counts = allCandidates.map((c: any) => ({
        ...c,
        votes: allVotes.filter((v: any) => v.candidateId === c.id).length,
      }));
      const total = allVotes.length;

      // Regional breakdown
      const regional = staticRegions.map(r => {
        const regionVotes = allVotes.filter((v: any) => v.regionId === r.id);
        const candidatesRes = allCandidates.map((c: any) => ({
          id: c.id,
          name: c.name,
          votes: regionVotes.filter((v: any) => v.candidateId === c.id).length
        }));

        // District Breakdown
        const districts = r.districts.map(dName => {
          const districtVotes = regionVotes.filter((v: any) => v.districtId === dName);
          return {
            id: dName,
            name: dName,
            total: districtVotes.length,
            candidates: allCandidates.map((c: any) => ({
              id: c.id,
              name: c.name,
              votes: districtVotes.filter((v: any) => v.candidateId === c.id).length
            }))
          };
        });

        return {
          id: r.id,
          name: r.name,
          total: regionVotes.length,
          candidates: candidatesRes,
          districts
        };
      });

      // If scoped to a region, return national-level counts replaced by regional data
      if (scopeRegionId) {
        const sr = regional.find(r => r.id === scopeRegionId);
        if (sr) {
          return {
            counts: allCandidates.map(c => ({
              ...c,
              votes: sr.candidates.find(rc => rc.id === c.id)?.votes || 0
            })),
            total: sr.total,
            regional: [sr],
            electionDate: "DEC 31, 2026"
          };
        }
      }

      return { counts, total, regional, electionDate: "DEC 31, 2026" };
    } catch (e) {
      console.error("Error fetching vote counts:", e);
      return { counts: [], total: 0, regional: [], electionDate: "Error" };
    }
  }

  // API Routes
  app.get("/api/admin/voters", authorize("VIEW_VOTERS"), async (req, res) => {
    try {
      if (isConnected) {
        const allVoters = await db.select().from(voters);
        res.json(allVoters);
      } else {
        res.json(memoryDb.voters);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch voters" });
    }
  });

  app.patch("/api/admin/voters/:id/verify", authorize("REGISTER_VOTER"), async (req, res) => {
    try {
      const { id } = req.params;
      const { verified } = req.body;

      if (isConnected) {
        // Fallback or Drizzle update if Drizzle is connected
        await db.update(voters).set({ isVerified: Boolean(verified) }).where(eq(voters.id, id));
      } else {
        const voter = memoryDb.voters.find(v => v.id === id);
        if (voter) {
          voter.isVerified = Boolean(verified);
        }
      }

      await logAudit("VOTER_VERIFICATION_UPDATED", {
        voterId: id,
        verified: Boolean(verified),
        adminId: (req as any).user.id || "ADMIN",
      });

      res.json({ success: true, verified: Boolean(verified) });
    } catch (e) {
      res.status(500).json({ error: "Failed to update voter verification status" });
    }
  });

  app.get("/api/admin/audit-logs", authorize("VIEW_AUDIT_LOGS"), async (req, res) => {
    try {
      if (isConnected) {
        const logs = await db.select().from(auditLogs);
        res.json(logs);
      } else {
        res.json(memoryDb.auditLogs);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/admin/force-finalize", authorize("MANAGE_ELECTION"), async (req, res) => {
    await logAudit("ELECTION_FORCE_FINALIZED", { adminId: (req as any).user.id || "ADMIN", time: new Date() });

    // Notify all clients to jump to results if needed, or update stats
    const fullResults = await getVoteCounts();
    io.to("national").to("public").emit("results-update", fullResults);

    // Targeted regional updates for admins in regional rooms
    for (const region of REGIONS) {
      io.to(`region:${region.id}`).emit("results-update", await getVoteCounts(region.id));
    }

    res.json({ success: true });
  });

  // Admin User Management
  app.get("/api/admin/users", authorize("MANAGE_USERS"), async (req, res) => {
    try {
      let allUsers: any[] = [];
      if (isConnected) {
        allUsers = await db.select().from(users);
      } else {
        allUsers = memoryDb.users;
      }
      const safeUsers = allUsers.map(({ password, ...rest }) => rest);
      res.json(safeUsers);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", authorize("MANAGE_USERS"), async (req, res) => {
    const { username, password, role, regionId, districtId, fullName } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: "Username, password and role constitute required fields" });
    }

    let existingUser: any = null;
    if (isConnected) {
      const results = await db.select().from(users).where(eq(users.username, username)).limit(1);
      existingUser = results[0];
    } else {
      existingUser = memoryDb.users.find(u => u.username === username);
    }

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const newUser = {
      id: uuidv4(),
      username,
      fullName: fullName || username,
      password: bcrypt.hashSync(password, 10),
      role,
      assignedRegion: regionId,
      assignedDistrict: districtId,
      status: "ACTIVE" as any,
    };

    if (isConnected) {
      await db.insert(users).values(newUser as any);
    } else {
      memoryDb.users.push(newUser);
    }

    await logAudit("ADMIN_USER_CREATED", { creatorId: (req as any).user.id, targetUsername: username, assignedRole: role });

    res.json({ success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role, regionId, districtId } });
  });

  app.put("/api/admin/users/:id", authorize("MANAGE_USERS"), async (req, res) => {
    const { id } = req.params;
    const { role, regionId, districtId, username, password } = req.body;

    let userToUpdate: any = null;
    if (isConnected) {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      userToUpdate = results[0];
    } else {
      userToUpdate = memoryDb.users.find((u: any) => u.id === id);
    }

    if (!userToUpdate) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (regionId) updates.assignedRegion = regionId;
    if (districtId) updates.assignedDistrict = districtId;
    if (username) updates.username = username;
    if (password) updates.password = bcrypt.hashSync(password, 10);

    if (isConnected) {
      await db.update(users).set(updates).where(eq(users.id, id));
    } else {
      Object.assign(userToUpdate, updates);
    }

    await logAudit("ADMIN_USER_UPDATED", { adminId: (req as any).user.id, targetUserId: id, details: updates });
    res.json({ success: true, message: "User updated successfully" })
  });

  app.delete("/api/admin/users/:id", authorize("MANAGE_USERS"), async (req, res) => {
    const { id } = req.params;

    if (id === (req as any).user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    if (isConnected) {
      await db.delete(users).where(eq(users.id, id));
    } else {
      const idx = memoryDb.users.findIndex((u: any) => u.id === id);
      if (idx !== -1) memoryDb.users.splice(idx, 1);
    }

    await logAudit("ADMIN_USER_DELETED", { adminId: (req as any).user.id, targetUserId: id });
    res.json({ success: true });
  });

  // Citizen Lookup for Auto-Fill (Simulation Mode)
  app.get("/api/citizen/:nationalId", lookupLimiter, (req, res) => {
    const { nationalId } = req.params;

    // Validate ID format (Simulated rule)
    if (!nationalId.startsWith("NID-")) {
      logAudit("CITIZEN_LOOKUP_INVALID_FORMAT", { nationalId });
      return res.status(400).json({ error: "Invalid National ID format. Use format NID-XXXXXX" });
    }

    const citizen = simulatedCitizens.find(c => c.nationalId === nationalId);

    if (!citizen) {
      logAudit("CITIZEN_LOOKUP_NOT_FOUND", { nationalId });
      return res.status(404).json({ error: "No citizen found with this National ID." });
    }

    // Eligibility Check
    const birthDate = new Date(citizen.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }

    const isEligible = age >= 18 && citizen.citizenshipStatus === "Ethiopian";

    logAudit("CITIZEN_LOOKUP_SUCCESS", {
      nationalId,
      isEligible,
      age,
      status: citizen.citizenshipStatus
    });

    if (!isEligible) {
      return res.status(403).json({
        error: `Ineligible to register: ${age < 18 ? "Underage (18+ required)" : "Non-Ethiopian citizenship"}`,
        citizen: { fullName: citizen.fullName, citizenshipStatus: citizen.citizenshipStatus, dob: citizen.dob }
      });
    }

    res.json(citizen);
  });

  app.post("/api/auth/register-voter", async (req, res) => {
    try {
      if (electionPhase !== "REGISTRATION") {
        return res.status(403).json({ error: "Voter registration is not currently active." });
      }

      // Check for authorization manually to allow public registration
      let user = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(" ")[1];
          user = jwt.verify(token, JWT_SECRET) as any;
        } catch (e) {
          // Continue as anonymous
        }
      }

      const {
        fullName,
        dob,
        nationalId,
        address,
        phone,
        email,
        regionId,
        biometricHash,
        isCitizen
      } = req.body;

      if (!fullName || !dob || !nationalId || !address || !biometricHash) {
        return res.status(400).json({ error: "Missing required registration fields." });
      }

      // Validate Uniqueness
      let nidVoter: any = null;
      const bHash = crypto.createHash('sha256').update(biometricHash.toString().trim()).digest('hex');

      if (isConnected) {
        const results = await db.select().from(voters).where(eq(voters.nationalId, nationalId)).limit(1);
        nidVoter = results[0];
      } else {
        nidVoter = memoryDb.voters.find(v => v.nationalId === nationalId);
      }

      if (nidVoter) {
        await logAudit("REGISTRATION_REJECTED_DUPLICATE", { nationalId, email, phone });
        return res.status(400).json({ error: "A voter with this National ID is already registered." });
      }

      // Fetch all voters and check fuzzy biometric match
      let allVoters: any[] = [];
      if (isConnected) {
        allVoters = await db.select().from(voters);
      } else {
        allVoters = memoryDb.voters;
      }

      for (const v of allVoters) {
        if (v.biometricTemplate) {
          try {
            const decrypted = decryptBiometric(v.biometricTemplate);
            const score = computeDeterministicBiometricScore(biometricHash.toString().trim(), decrypted);
            if (score >= 85) {
              await logAudit("REGISTRATION_REJECTED_DUPLICATE", { nationalId, email, phone });
              return res.status(400).json({ error: `Biometric duplicate detected: matches existing voter "${v.fullName}" with score of ${score}%` });
            }
          } catch (e) {
            // Ignore decryption failure for legacy records
          }
        }
      }

      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18 || !isCitizen) {
        await logAudit("REGISTRATION_REJECTED_INELIGIBLE", { fullName, age, isCitizen });
        return res.status(403).json({ error: "Applicant does not meet eligibility requirements (Age 18+ and Citizenship)." });
      }

      // Secure Biometric Processing
      const encryptedTemplate = encryptBiometric(biometricHash.toString().trim());

      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const voterId = `ET-${year}-${randomSuffix}-${nationalId.slice(-4)}`;

      const newVoter = {
        id: uuidv4(),
        voterId,
        fullName,
        dob,
        nationalId,
        address,
        phone,
        email,
        regionId: regionId || "r1",
        biometricTemplate: encryptedTemplate,
        biometricHash: bHash,
        hasVoted: false,
        isVerified: false,
        registrationDate: new Date()
      };

      if (isConnected) {
        await db.insert(voters).values(newVoter);
      } else {
        memoryDb.voters.push(newVoter);
      }

      await logAudit("VOTER_REGISTERED", {
        voterId: newVoter.voterId,
        registrar: user ? user.role : "SELF_SERVICE",
        regionId: newVoter.regionId
      });

      res.json({
        success: true,
        voterId: newVoter.voterId,
        message: "Voter registered successfully. Biometric template secured."
      });
    } catch (error) {
      console.error("Critical Registration Error:", error);
      res.status(500).json({ error: "Internal server error during registration." });
    }
  });

  app.post("/api/auth/login/biometric", authLimiter, async (req, res) => {
    const { biometricHash } = req.body;
    if (!biometricHash) return res.status(400).json({ error: "Biometric hash required" });

    let allVoters: any[] = [];
    if (isConnected) {
      allVoters = await db.select().from(voters);
    } else {
      allVoters = memoryDb.voters;
    }

    let bestVoter: any = null;
    let highestScore = 0;

    for (const v of allVoters) {
      if (v.biometricTemplate) {
        try {
          const decrypted = decryptBiometric(v.biometricTemplate);
          const score = computeDeterministicBiometricScore(biometricHash, decrypted);
          if (score > highestScore) {
            highestScore = score;
            bestVoter = v;
          }
        } catch (e) {
          // Ignore decryption failure
        }
      }
    }

    if (!bestVoter || highestScore < 85) {
      await logAudit("VOTER_LOGIN_FAILED", { biometricHash });
      return res.status(401).json({ error: `Biometric authentication failed${highestScore > 0 ? ` (highest match: ${highestScore}%)` : ""}` });
    }

    const voter = bestVoter;
    if (!voter.isVerified) {
      await logAudit("VOTER_LOGIN_UNVERIFIED", { voterId: voter.id });
      return res.status(403).json({ error: "Voter registration is awaiting verification approval." });
    }
    const token = jwt.sign({ id: voter.id, role: ROLES.VOTER }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    await logAudit("VOTER_LOGIN_SUCCESS", { voterId: voter.id, matchScore: highestScore });
    return res.json({ token, user: { id: voter.id, fullName: voter.fullName, hasVoted: voter.hasVoted, role: ROLES.VOTER }, matchScore: highestScore });
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { role, username, password, biometricHash, regionId, districtId } = req.body;

    // Voter login with Biometrics
    if (role === ROLES.VOTER) {
      if (!biometricHash) return res.status(400).json({ error: "Biometric hash required" });

      let allVoters: any[] = [];
      if (isConnected) {
        allVoters = await db.select().from(voters);
      } else {
        allVoters = memoryDb.voters;
      }

      let bestVoter: any = null;
      let highestScore = 0;

      for (const v of allVoters) {
        if (v.biometricTemplate) {
          try {
            const decrypted = decryptBiometric(v.biometricTemplate);
            const score = computeDeterministicBiometricScore(biometricHash, decrypted);
            if (score > highestScore) {
              highestScore = score;
              bestVoter = v;
            }
          } catch (e) {
            // Ignore decryption failure
          }
        }
      }

      if (!bestVoter || highestScore < 85) {
        await logAudit("VOTER_LOGIN_FAILED", { biometricHash });
        return res.status(401).json({ error: `Biometric authentication failed${highestScore > 0 ? ` (highest match: ${highestScore}%)` : ""}` });
      }

      const voter = bestVoter;
      if (!voter.isVerified) {
        await logAudit("VOTER_LOGIN_UNVERIFIED", { voterId: voter.id });
        return res.status(403).json({ error: "Voter registration is awaiting verification approval." });
      }
      const token = jwt.sign({ id: voter.id, role: ROLES.VOTER }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      await logAudit("VOTER_LOGIN_SUCCESS", { voterId: voter.id, matchScore: highestScore });
      return res.json({ token, user: { id: voter.id, fullName: voter.fullName, hasVoted: voter.hasVoted, role: ROLES.VOTER }, matchScore: highestScore });
    }

    // Role-based login with Username/Password
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    let user: any = null;
    if (isConnected) {
      const results = await db.select().from(users).where(eq(users.username, username)).limit(1);
      user = results[0];
    } else {
      user = memoryDb.users.find((u: any) => u.username === username);
    }

    if (!user) {
      await logAudit("ADMIN_LOGIN_FAILED", { username, reason: "User not found" });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({ error: `Account locked. Please try again in ${waitTime} minutes.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const newAttempts = (user.failedAttempts || 0) + 1;
      const updates: any = { failedAttempts: newAttempts };

      if (newAttempts >= 5) {
        updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        updates.failedAttempts = 0;
        await logAudit("ACCOUNT_LOCKED", { username, role: user.role });
      } else {
        await logAudit("ADMIN_LOGIN_FAILED", { username, reason: "Incorrect password", attempt: newAttempts });
      }

      if (isConnected) {
        await db.update(users).set(updates).where(eq(users.id, user.id));
      } else {
        Object.assign(user, updates);
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Success
    if (isConnected) {
      await db.update(users).set({ failedAttempts: 0, lockUntil: null }).where(eq(users.id, user.id));
    } else {
      user.failedAttempts = 0;
      user.lockUntil = null;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, regionId: user.assignedRegion || regionId, districtId: user.assignedDistrict || districtId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit("ADMIN_LOGIN_SUCCESS", { username, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        regionId: user.assignedRegion || regionId,
        districtId: user.assignedDistrict || districtId
      }
    });
  });

  app.post("/api/vote/cast", authorize("CAST_VOTE"), async (req, res) => {
    const { candidateId } = req.body;
    const user = (req as any).user;

    let voter: any = null;
    if (isConnected) {
      const results = await db.select().from(voters).where(eq(voters.id, user.id)).limit(1);
      voter = results[0];
    } else {
      voter = memoryDb.voters.find((v: any) => v.id === user.id);
    }

    if (!voter || voter.hasVoted) return res.status(400).json({ error: "Voter not found or already voted" });

    if (electionPhase !== "VOTING") {
      await logAudit("VOTE_REJECTED_PHASE", { voterId: voter.id, phase: electionPhase });
      return res.status(403).json({ error: "Voting is not currently active." });
    }

    // Cast vote (Anonymized)
    const voteData = {
      candidateId,
      regionId: voter.regionId || "r1",
      districtId: voter.districtId || "d1",
      timestamp: new Date()
    };

    if (isConnected) {
      await db.insert(votes).values(voteData);
    } else {
      memoryDb.votes.push(voteData);
    }

    // Mark voter as voted
    if (isConnected) {
      await db.update(voters).set({ hasVoted: true }).where(eq(voters.id, voter.id));
    } else {
      voter.hasVoted = true;
    }

    // Log event (Decoupled from candidate choice)
    await logAudit("VOTE_CAST", { voterId: voter.id, time: new Date() });

    // Notify all clients
    const fullResults = await getVoteCounts();
    io.to("national").to("public").emit("results-update", fullResults);

    // Targeted regional update
    const regionId = voter.regionId || "r1";
    const regionalResults = await getVoteCounts(regionId);
    io.to(`region:${regionId}`).emit("results-update", regionalResults);

    res.json({ success: true });
  });

  app.get("/api/results", authorize("VIEW_RESULTS"), async (req, res) => {
    res.json(await getVoteCounts());
  });

  app.get("/api/results/export/csv", authorize("VIEW_RESULTS"), async (req, res) => {
    const data = await getVoteCounts();
    let csv = "Candidate,Party,Votes\n";
    data.counts.forEach((c: any) => {
      csv += `"${c.name}","${c.party}",${c.votes}\n`;
    });
    csv += `\nTotal Votes,${data.total}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="election-results.csv"');
    res.send(csv);
  });

  // Election Phase Management
  app.get("/api/election/phase", (req, res) => {
    // In production, fetch from DB
    res.json({ phase: electionPhase, systemTime: new Date() });
  });

  app.post("/api/election/phase", authorize("MANAGE_ELECTION"), async (req, res) => {
    const { phase } = req.body;
    if (!["REGISTRATION", "VOTING", "CLOSED"].includes(phase)) {
      return res.status(400).json({ error: "Invalid phase" });
    }
    electionPhase = phase;
    await logAudit("ELECTION_PHASE_CHANGED", { newPhase: phase, adminId: (req as any).user.id });
    io.emit("phase-update", { phase });
    res.json({ success: true, phase });
  });

  // Global Error Handler to prevent HTML responses for API errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("GLOBAL SERVER ERROR:", err);
    res.status(500).json({ error: "An unexpected server error occurred." });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Election System Server running on http://localhost:${PORT}`);
    seedDatabase();
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER ERROR:", err);
  process.exit(1);
});

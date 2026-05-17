import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db, isConnected } from "./db/index";
import { users, voters, candidates, votes, auditLogs } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { ROLES, authorize } from "./middleware/auth";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const JWT_EXPIRES_IN = "1h";
const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY || "db_secret_key_32_bytes_long_12345", "utf8").slice(0, 32);
const IV_LENGTH = 16;

let electionPhase: "REGISTRATION" | "VOTING" | "CLOSED" = "REGISTRATION";

const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: "Rate limit exceeded." },
});

const app: Application = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

const memoryDb = {
    users: [
        { id: "admin-1", username: "admin", password: bcrypt.hashSync("admin123", 10), role: "ADMIN", fullName: "System Admin", status: "ACTIVE" }
    ],
    voters: [],
    votes: [],
    auditLogs: []
};

const logAudit = async (event: string, details: any) => {
    const logEntry = { event, userId: details.userId || "SYSTEM", details: JSON.stringify(details), timestamp: new Date() };
    if (isConnected) await db.insert(auditLogs).values(logEntry);
    else memoryDb.auditLogs.push(logEntry);
    console.log(`[AUDIT] ${event}`);
};

async function getVoteCounts(scopeRegionId?: string) {
    try {
        const allCandidates = isConnected ? await db.select().from(candidates) : [];
        const allVotes = isConnected ? await db.select().from(votes) : memoryDb.votes;

        const counts = allCandidates.map((c: any) => ({
            ...c,
            votes: allVotes.filter((v: any) => v.candidateId === c.id).length,
        }));

        return { counts, total: allVotes.length, electionDate: "2026" };
    } catch (e) {
        return { counts: [], total: 0, electionDate: "Error" };
    }
}

io.on("connection", async (socket) => {
    socket.emit("results-update", await getVoteCounts());
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { role, username, password, biometricHash } = req.body;

    if (role === ROLES.VOTER) {
        const bHash = crypto.createHash('sha256').update(biometricHash?.toString() || '').digest('hex');
        let voter = isConnected
            ? (await db.select().from(voters).where(eq(voters.biometricHash, bHash)).limit(1))[0]
            : (memoryDb.voters as any).find((v: any) => v.biometricHash === bHash);

        if (!voter) return res.status(401).json({ error: "Biometric authentication failed." });
        const token = jwt.sign({ id: voter.id, role: ROLES.VOTER }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return res.json({ token, user: { ...voter, role: ROLES.VOTER } });
    }

    let user = isConnected
        ? (await db.select().from(users).where(eq(users.username, username)).limit(1))[0]
        : memoryDb.users.find(u => u.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, role: user.role, regionId: user.assignedRegion }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user });
});

app.get("/api/election/phase", (req, res) => res.json({ phase: electionPhase }));

app.post("/api/auth/register-voter", async (req, res) => {
    if (electionPhase !== "REGISTRATION") return res.status(403).json({ error: "Registration closed" });
    const { fullName, dob, nationalId, address, biometricHash } = req.body;
    const bHash = crypto.createHash('sha256').update(biometricHash).digest('hex');

    const newVoter = { id: uuidv4(), voterId: `ET-${Date.now()}`, fullName, dob, nationalId, address, biometricHash: bHash, hasVoted: false };
    if (isConnected) await db.insert(voters).values(newVoter);
    else (memoryDb.voters as any).push(newVoter);

    res.json({ success: true, voterId: newVoter.voterId });
});

app.post("/api/vote/cast", authorize("CAST_VOTE"), async (req, res) => {
    const { candidateId } = req.body;
    const user = (req as any).user;

    const voteData = { candidateId, regionId: "r1", timestamp: new Date() };
    if (isConnected) await db.insert(votes).values(voteData);
    else memoryDb.votes.push(voteData as any);

    io.emit("results-update", await getVoteCounts());
    res.json({ success: true });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 NEHS API running on port ${PORT}`);
});
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Prevent brute-forcing logins
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts, please try again after 15 minutes" }
});

router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        if (!db) {
            return res.status(503).json({ error: "Database not connected. Please configure DATABASE_URL." });
        }

        // Fetch user from MySQL Database
        const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
        const user = result[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: `Account is ${user.status.toLowerCase()}` });
        }

        // Verify password hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate strict-expiration JWT Token
        const payload = {
            id: user.id,
            role: user.role,
            regionId: user.assignedRegion,
            districtId: user.assignedDistrict
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                role: user.role,
                region: user.assignedRegion
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

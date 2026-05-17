import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const ROLES = {
    ADMIN: "ADMIN",
    REGIONAL_ADMIN: "REGIONAL_ADMIN",
    DISTRICT_ADMIN: "DISTRICT_ADMIN",
    STAFF: "STAFF",
    OBSERVER: "OBSERVER",
    VOTER: "VOTER"
};

export const PERMISSIONS = {
    VIEW_RESULTS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.STAFF, ROLES.OBSERVER],
    CAST_VOTE: [ROLES.VOTER],
    REGISTER_VOTER: [ROLES.ADMIN, ROLES.STAFF, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN],
    MANAGE_USERS: [ROLES.ADMIN],
    ADMIN_CONTROLS: [ROLES.ADMIN],
    VIEW_VOTERS: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.STAFF],
    MANAGE_ELECTION: [ROLES.ADMIN],
    MONITOR_ELECTION: [ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.OBSERVER],
    VIEW_AUDIT_LOGS: [ROLES.ADMIN]
};

export interface AuthRequest extends Request {
    user?: any;
}

export const authorize = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
        }

        try {
            const token = authHeader.split(" ")[1];
            const ticket = jwt.verify(token, JWT_SECRET) as any;
            req.user = ticket;

            const allowedRoles = (PERMISSIONS as any)[permission];
            if (!allowedRoles || !allowedRoles.includes(ticket.role)) {
                console.warn(`[RBAC] Access denied: Role ${ticket.role} attempted to access ${permission}`);
                return res.status(403).json({ error: `Forbidden: Requires ${permission} permission` });
            }

            // Hierarchical scoping
            const targetRegion = req.body.regionId || req.query.regionId;
            const targetDistrict = req.body.districtId || req.query.districtId;

            if (ticket.role === ROLES.REGIONAL_ADMIN && targetRegion && targetRegion !== ticket.regionId) {
                return res.status(403).json({ error: "Forbidden: Regional access restricted to assigned region" });
            }
            if (ticket.role === ROLES.DISTRICT_ADMIN && targetDistrict && targetDistrict !== ticket.districtId) {
                return res.status(403).json({ error: "Forbidden: District access restricted to assigned district" });
            }

            next();
        } catch (e) {
            if (e instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: "Token expired. Please login again." });
            }
            res.status(401).json({ error: "Invalid authentication token" });
        }
    };
};
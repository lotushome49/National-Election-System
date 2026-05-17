import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types'; // Assuming types are defined

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Define standard roles
export const ROLES = {
  ADMIN: "ADMIN",
  REGIONAL_ADMIN: "REGIONAL_ADMIN",
  DISTRICT_ADMIN: "DISTRICT_ADMIN",
  STAFF: "STAFF",
  OBSERVER: "OBSERVER",
  VOTER: "VOTER"
};

// Define permissions matrix mapping permissions to allowed roles
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

// Extend Express Request object
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Core RBAC & Authentication Middleware
 * Validates JWT AND confirms user role has adequate permissions
 */
export const authorize = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // 1. Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }

    try {
      const token = authHeader.split(" ")[1];

      // 2. Verify JWT signature and expiration
      const ticket = jwt.verify(token, JWT_SECRET) as any;
      req.user = ticket;

      // 3. Verify Role-Based Permission
      const allowedRoles = (PERMISSIONS as any)[permission];
      if (!allowedRoles || !allowedRoles.includes(ticket.role)) {
        console.warn(`[RBAC] Access denied: Role ${ticket.role} attempted to access ${permission}`);
        return res.status(403).json({ error: `Forbidden: Requires ${permission} permission` });
      }

      // 4. Hierarchical scoping: Prevent unauthorized cross-regional/district data access
      const targetRegion = req.body.regionId || req.query.regionId;
      const targetDistrict = req.body.districtId || req.query.districtId;

      if (ticket.role === ROLES.REGIONAL_ADMIN && targetRegion && targetRegion !== ticket.regionId) {
        return res.status(403).json({ error: "Forbidden: Regional access restricted to assigned region" });
      }
      if (ticket.role === ROLES.DISTRICT_ADMIN && targetDistrict && targetDistrict !== ticket.districtId) {
        return res.status(403).json({ error: "Forbidden: District access restricted to assigned district" });
      }

      // Authorized, proceed to endpoint
      next();
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: "Token expired. Please login again." });
      }
      res.status(401).json({ error: "Invalid authentication token" });
    }
  };
};

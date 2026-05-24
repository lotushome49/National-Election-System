import { Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../types";
import { reportsService } from "./reports.service";

export const reportsController = {
  overview: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const overview = await reportsService.getOverview(
        req.query as any,
        req.user,
      );
      sendSuccess(res, overview);
    } catch (err) {
      next(err);
    }
  },

  exportCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const overview = await reportsService.getOverview(
        req.query as any,
        req.user,
      );
      const csv = reportsService.buildOverviewCsv(overview);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=nehs_report_${overview.election.id}.csv`,
      );

      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  },

  exportTurnout: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const csv = await reportsService.exportTurnoutCsv(
        req.query as any,
        req.user,
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=nehs_turnout_${Date.now()}.csv`,
      );
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  },

  exportDemographics: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const csv = await reportsService.exportDemographicsCsv(
        req.query as any,
        req.user,
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=nehs_demographics_${Date.now()}.csv`,
      );
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  },
};

import React from "react";
import { motion } from "motion/react";
import type { Role } from "../../types/election";
import { AdminDashboard } from "../dashboards/AdminDashboard";
import { DistrictDashboard } from "../dashboards/DistrictDashboard";
import { ObserverDashboard } from "../dashboards/ObserverDashboard";
import { RegionalDashboard } from "../dashboards/RegionalDashboard";
import { StaffDashboard } from "../dashboards/StaffDashboard";
import { SuperAdminDashboard } from "../dashboards/SuperAdminDashboard";

type DashboardProps = {
  results?: any;
  role: Role | "NONE";
  setView?: (view: string) => void;
  t: any;
  user?: any;
  electionPhase?: string;
  setElectionPhase?: (phase: string) => void;
  token?: string | null;
  i18n: any;
};

function AccessDenied({ t }: { t: any }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto py-24 text-center"
    >
      <h3 className="text-3xl font-display font-black tracking-tighter text-slate-900 uppercase">
        {t("dashboard")}
      </h3>
      <p className="mt-4 text-slate-400 text-sm uppercase tracking-widest">
        No dashboard is available for this role.
      </p>
    </motion.div>
  );
}

export function DashboardView(props: DashboardProps) {
  switch (props.role) {
    case "SUPER_ADMIN":
      return <SuperAdminDashboard {...props} />;
    case "ADMIN":
      return <AdminDashboard {...props} />;
    case "REGIONAL_ADMIN":
      return <RegionalDashboard {...props} />;
    case "DISTRICT_ADMIN":
      return <DistrictDashboard {...props} />;
    case "STAFF":
      return <StaffDashboard {...props} />;
    case "OBSERVER":
      return <ObserverDashboard {...props} />;
    default:
      return <AccessDenied t={props.t} />;
  }
}

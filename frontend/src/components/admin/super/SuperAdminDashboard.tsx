import React from 'react';
import './SuperAdminDashboard.css';

const SuperAdminDashboard: React.FC = () => {
  return (
    <div className="super-admin-dashboard">
      <h1 className="title">Super Admin Dashboard</h1>
      <div className="cards">
        <div className="card">
          <h2>Total Users</h2>
          <p>—</p>
        </div>
        <div className="card">
          <h2>Total Elections</h2>
          <p>—</p>
        </div>
        <div className="card">
          <h2>Active Votes</h2>
          <p>—</p>
        </div>
        <div className="card">
          <h2>System Health</h2>
          <p>All services operational</p>
        </div>
      </div>
      {/* Placeholder for recent audit logs */}
      <section className="audit-logs">
        <h2>Recent Audit Logs</h2>
        <p>No logs available.</p>
      </section>
    </div>
  );
};

export default SuperAdminDashboard;

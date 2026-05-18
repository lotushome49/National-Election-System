import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ShieldCheck, UserPlus, Edit2, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";

export function UserManagementView({ setView, token, t, i18n, user }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "STAFF",
    regionId: "",
    districtId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url =
        modalMode === "create"
          ? "/api/admin/users"
          : `/api/admin/users/${editingUser.id}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete_user"))) return;
    try {
      const resp = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      role: "STAFF",
      regionId: "",
      districtId: "",
    });
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setModalMode("edit");
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      regionId: user.regionId || "",
      districtId: user.districtId || "",
    });
    setShowModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("identity_management_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("user_administration")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("user_admin_desc")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 shadow-sm transition-all"
          >
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <button
            onClick={openCreateModal}
            className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <UserPlus size={18} />
            {t("add_authorized_user")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
          {t("fetching_users")}
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] tracking-[0.3em] text-slate-400 font-black">
                <th className="px-10 py-6">{t("username")}</th>
                <th className="px-10 py-6">{t("role")}</th>
                <th className="px-10 py-6">{t("jurisdiction")}</th>
                <th className="px-10 py-6">{t("system_status")}</th>
                <th className="px-10 py-6 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-10 py-6">
                    <p className="font-display font-black text-slate-900 text-lg uppercase tracking-tighter leading-none group-hover:translate-x-1 transition-transform">
                      {u.username}
                    </p>
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">
                      UUID: {u.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-10 py-6">
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 uppercase font-black tracking-widest shadow-sm">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        {u.regionId || "GLOBAL"}
                      </p>
                      {u.districtId && (
                        <p className="text-[9px] text-slate-400 font-black uppercase">
                          District: {u.districtId}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit",
                        u.lockUntil && new Date(u.lockUntil) > new Date()
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          u.lockUntil && new Date(u.lockUntil) > new Date()
                            ? "bg-rose-500"
                            : "bg-emerald-500 animate-pulse",
                        )}
                      />
                      {u.lockUntil && new Date(u.lockUntil) > new Date()
                        ? t("terminal_locked")
                        : t("authorized")}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right space-x-3">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-3 bg-rose-50 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-[100] animate-in fade-in duration-300">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] p-12 lg:p-16 w-full max-w-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <UserPlus size={160} />
            </div>

            <h3 className="font-display font-black text-4xl mb-4 tracking-tighter text-slate-900 uppercase">
              {modalMode === "create"
                ? t("authorized_onboarding")
                : t("identity_reconfiguration")}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12">
              {t("security_protocol_req")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("unique_identifier")}
                </label>
                <input
                  required
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("vulnerability_passkey")}{" "}
                  {modalMode === "edit" && (
                    <span className="opacity-40 italic">
                      ({t("leave_blank_keep")})
                    </span>
                  )}
                </label>
                <input
                  required={modalMode === "create"}
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("assigned_clearance")}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                >
                  <option value="STAFF">Staff (Voter View Only)</option>
                  <option value="OBSERVER">Observer (Full Read)</option>
                  <option value="DISTRICT_ADMIN">District Administrator</option>
                  <option value="REGIONAL_ADMIN">Regional Administrator</option>
                  <option value="ADMIN">System Architect</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  {t("terminate_op")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  {submitting
                    ? t("registering_identity")
                    : t("commit_anchoring")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Edit2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { cn } from "../../utils/cn";
import { unwrapApiData } from "../../utils/mfa";
import { ActionModal } from "../common/ActionModal";

type RoleOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

type UserRecord = {
  id: string;
  fullName: string;
  username: string;
  email?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "LOCKED";
  assignedRegionId?: string | null;
  assignedDistrictId?: string | null;
  lockUntil?: string | null;
  role?: { id: string; code: string; name: string };
};

type UserFormState = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  roleId: string;
  assignedRegionId: string;
  assignedDistrictId: string;
  status: "ACTIVE" | "SUSPENDED" | "LOCKED";
};

const emptyCreateForm = (roleId = ""): UserFormState => ({
  fullName: "",
  username: "",
  email: "",
  password: "",
  roleId,
  assignedRegionId: "",
  assignedDistrictId: "",
  status: "ACTIVE",
});

const emptyEditForm = (user: UserRecord): UserFormState => ({
  fullName: user.fullName,
  username: user.username,
  email: user.email ?? "",
  password: "",
  roleId: user.role?.id ?? "",
  assignedRegionId: user.assignedRegionId ?? "",
  assignedDistrictId: user.assignedDistrictId ?? "",
  status: user.status,
});

export function UserManagementView({ setView, token, t, i18n }: any) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState<UserFormState>(emptyCreateForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const lang = i18n.language as "en" | "am";

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );

  const loadRoles = async (authToken: string) => {
    const response = await fetch("/api/v1/roles", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }

      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || data?.error || "Failed to load roles");
    }

    const payload = await response.json();
    const extracted = unwrapApiData(payload);
    setRoles(Array.isArray(extracted) ? extracted : []);
    return Array.isArray(extracted) ? extracted : [];
  };

  const fetchUsers = async () => {
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUsers([]);
          setView("login");
          return;
        }

        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || "Failed to load users");
      }

      const payload = await response.json();
      const extracted = unwrapApiData(payload);
      setUsers(Array.isArray(extracted) ? extracted : []);
    } catch (err: any) {
      if (err?.message === "UNAUTHORIZED") {
        setView("login");
        return;
      }

      setError(err?.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;

      try {
        const loadedRoles = await loadRoles(token);
        if (
          !formData.roleId &&
          loadedRoles.length > 0 &&
          modalMode === "create"
        ) {
          setFormData((current) => ({
            ...current,
            roleId: loadedRoles[0].id,
          }));
        }
      } catch (err: any) {
        if (err?.message === "UNAUTHORIZED") {
          setView("login");
          return;
        }
        setError(err?.message || "Failed to load roles");
      }

      await fetchUsers();
    };

    void run();
  }, [token]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingUser(null);
    setFormData(emptyCreateForm(roles[0]?.id ?? ""));
    setShowModal(true);
  };

  const openEditModal = (user: UserRecord) => {
    setModalMode("edit");
    setEditingUser(user);
    setFormData(emptyEditForm(user));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(emptyCreateForm(roles[0]?.id ?? ""));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError("");

    try {
      const url =
        modalMode === "create"
          ? "/api/v1/users"
          : `/api/v1/users/${editingUser?.id}`;
      const method = modalMode === "create" ? "POST" : "PATCH";

      const payload =
        modalMode === "create"
          ? {
              fullName: formData.fullName.trim(),
              username: formData.username.trim(),
              email: formData.email.trim() || undefined,
              password: formData.password,
              roleId: formData.roleId,
              assignedRegionId: formData.assignedRegionId.trim() || undefined,
              assignedDistrictId:
                formData.assignedDistrictId.trim() || undefined,
            }
          : {
              fullName: formData.fullName.trim(),
              email: formData.email.trim() || undefined,
              status: formData.status,
              assignedRegionId: formData.assignedRegionId.trim() || null,
              assignedDistrictId: formData.assignedDistrictId.trim() || null,
            };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || "Request failed");
      }

      closeModal();
      await fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = deletingUser;
    if (!target || target.id !== id) return;

    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/v1/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || "Delete failed");
      }

      await fetchUsers();
      setDeletingUser(null);
    } catch (err: any) {
      setError(err?.message || "Failed to delete user");
    } finally {
      setDeleteBusy(false);
    }
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

      {error && (
        <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-700 text-sm font-semibold">
          {error}
        </div>
      )}

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
                      {u.fullName}
                    </p>
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">
                      @{u.username} · UUID: {u.id.slice(0, 8)}
                    </p>
                    {u.email && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-1 break-all">
                        {u.email}
                      </p>
                    )}
                  </td>
                  <td className="px-10 py-6">
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 uppercase font-black tracking-widest shadow-sm">
                      {u.role?.name || u.role?.code || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        Region: {u.assignedRegionId || "GLOBAL"}
                      </p>
                      {u.assignedDistrictId && (
                        <p className="text-[9px] text-slate-400 font-black uppercase">
                          District: {u.assignedDistrictId}
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
                      onClick={() => setDeletingUser(u)}
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
            className="bg-white rounded-[3rem] p-12 lg:p-16 w-full max-w-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 relative overflow-hidden"
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
                  Full name
                </label>
                <input
                  required
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  {t("unique_identifier")}
                </label>
                <input
                  required={modalMode === "create"}
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  disabled={modalMode === "edit"}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                />
              </div>

              {modalMode === "create" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                      {t("vulnerability_passkey")}
                    </label>
                    <input
                      required
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
                      value={formData.roleId}
                      onChange={(e) =>
                        setFormData({ ...formData, roleId: e.target.value })
                      }
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-2 rounded-[2rem] border border-slate-100 bg-slate-50 px-6 py-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                    Role
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {roleById.get(formData.roleId)?.name ||
                      editingUser?.role?.name ||
                      "Unknown"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                    Assigned region ID
                  </label>
                  <input
                    type="text"
                    value={formData.assignedRegionId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedRegionId: e.target.value,
                      })
                    }
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                    placeholder="Optional region UUID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                    Assigned district ID
                  </label>
                  <input
                    type="text"
                    value={formData.assignedDistrictId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedDistrictId: e.target.value,
                      })
                    }
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold text-slate-900"
                    placeholder="Optional district UUID"
                  />
                </div>
              </div>

              {modalMode === "edit" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                    System status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as UserFormState["status"],
                      })
                    }
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-slate-100 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  {t("terminate_op")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
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

      <ActionModal
        open={Boolean(deletingUser)}
        title={t("confirm_delete_user")}
        message={
          deletingUser
            ? `${deletingUser.fullName} (@${deletingUser.username}) will be removed from the system.`
            : t("confirm_delete_user")
        }
        tone="danger"
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        busy={deleteBusy}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => {
          if (deletingUser) {
            void handleDelete(deletingUser.id);
          }
        }}
      />
    </motion.div>
  );
}

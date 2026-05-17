import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchJson } from '../../services/api/client';
import { cn } from '../../utils/cn';
import { unwrapApiData } from '../../utils/mfa';

interface MfaStatus {
  eligible: boolean;
  enabled: boolean;
  recoveryCodesRemaining: number;
}

interface EnrollmentPayload {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
  setupToken: string;
}

interface Props {
  token: string | null;
  setView: (view: string) => void;
}

async function fetchAuthed<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const payload = await fetchJson<T | { data: T }>(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  return unwrapApiData(payload);
}

export function MfaSecurityView({ token, setView }: Props) {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollment, setEnrollment] = useState<EnrollmentPayload | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableForm, setDisableForm] = useState({ password: '', code: '', recoveryCode: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextStatus = await fetchAuthed<MfaStatus>('/api/auth/mfa/status', token);
      setStatus(nextStatus);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [token]);

  const beginEnrollment = async () => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError('');
    setRecoveryCodes([]);
    try {
      const payload = await fetchAuthed<EnrollmentPayload>('/api/auth/mfa/enroll', token, {
        method: 'POST',
      });
      setEnrollment(payload);
    } catch (err: any) {
      setError(err.message ?? 'Failed to initialize MFA');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!token || !enrollment) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = await fetchAuthed<{ enabled: boolean; recoveryCodes: string[] }>(
        '/api/auth/mfa/verify-enrollment',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            setupToken: enrollment.setupToken,
            code: verificationCode,
          }),
        },
      );

      setRecoveryCodes(payload.recoveryCodes);
      setEnrollment(null);
      setVerificationCode('');
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? 'Failed to verify MFA');
    } finally {
      setSubmitting(false);
    }
  };

  const disableMfa = async () => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await fetchAuthed('/api/auth/mfa/disable', token, {
        method: 'POST',
        body: JSON.stringify({
          password: disableForm.password,
          code: disableForm.code || undefined,
          recoveryCode: disableForm.recoveryCode || undefined,
        }),
      });

      setDisableForm({ password: '', code: '', recoveryCode: '' });
      setRecoveryCodes([]);
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? 'Failed to disable MFA');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto pb-20 space-y-10">
      <button
        onClick={() => setView('dashboard')}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 lg:p-14">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <ShieldCheck size={14} className="text-slate-900" />
              Identity hardening
            </div>
            <h2 className="text-4xl lg:text-6xl font-display font-black tracking-tighter text-slate-900 uppercase leading-[0.9]">
              Multi-factor security
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl uppercase tracking-widest">
              Protect privileged access with time-based authenticator codes and single-use recovery keys.
            </p>
          </div>

          {status && (
            <div className={cn(
              'px-6 py-4 rounded-[2rem] border text-[10px] font-black uppercase tracking-[0.25em] w-fit',
              status.enabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-100'
            )}>
              {status.enabled ? 'MFA enabled' : 'MFA inactive'}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-8 px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-slate-300 font-display font-black uppercase tracking-[0.3em]">Loading security state...</div>
        ) : status && !status.eligible ? (
          <div className="mt-10 px-6 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-sm text-slate-500">
            This account role does not require MFA enrollment.
          </div>
        ) : status && (
          <div className="mt-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8">
            <section className="rounded-[2.5rem] border border-slate-100 bg-slate-50/60 p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-slate-900" />
                <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                  Authenticator setup
                </h3>
              </div>

              {!status.enabled && !enrollment && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Start enrollment to generate a secret for Google Authenticator, Microsoft Authenticator, Authy, or a compatible TOTP app.
                  </p>
                  <button
                    onClick={beginEnrollment}
                    disabled={submitting}
                    className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    Begin MFA enrollment
                  </button>
                </div>
              )}

              {!status.enabled && enrollment && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-4 w-[220px] h-[220px] flex items-center justify-center">
                      <img src={enrollment.qrCodeUrl} alt="Authenticator QR code" className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Scan the QR code with your authenticator app. If QR scanning is unavailable, enter the secret manually.
                      </p>
                      <div className="px-5 py-4 bg-white rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Manual secret</p>
                        <p className="font-mono text-sm text-slate-900 break-all">{enrollment.secret}</p>
                      </div>
                      <div className="px-5 py-4 bg-white rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">OTP URI</p>
                        <p className="font-mono text-xs text-slate-700 break-all">{enrollment.otpauthUrl}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <input
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-slate-100 font-mono"
                    />
                    <button
                      onClick={verifyEnrollment}
                      disabled={submitting || verificationCode.trim().length !== 6}
                      className="px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-emerald-100 hover:bg-emerald-500 transition-all disabled:opacity-50"
                    >
                      Verify and enable
                    </button>
                  </div>
                </div>
              )}

              {status.enabled && (
                <div className="space-y-4">
                  <div className="px-6 py-5 rounded-[2rem] bg-emerald-50 border border-emerald-100 text-emerald-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">MFA status</p>
                    <p className="text-sm font-semibold">This account now requires a second factor at login.</p>
                    <p className="text-xs font-medium mt-2 opacity-80">
                      Recovery codes remaining: {status.recoveryCodesRemaining}
                    </p>
                  </div>

                  {recoveryCodes.length > 0 && (
                    <div className="px-6 py-5 rounded-[2rem] bg-slate-900 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Store these recovery codes now</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {recoveryCodes.map((code) => (
                          <div key={code} className="font-mono text-sm bg-white/10 rounded-xl px-4 py-3">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 space-y-6">
              <div className="flex items-center gap-3">
                <KeyRound size={20} className="text-slate-900" />
                <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                  Disable MFA
                </h3>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">
                To disable MFA, confirm your password and provide either a current authenticator code or one unused recovery code.
              </p>

              <input
                type="password"
                value={disableForm.password}
                onChange={(event) => setDisableForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Current password"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-slate-100"
              />
              <input
                value={disableForm.code}
                onChange={(event) => setDisableForm((current) => ({ ...current, code: event.target.value, recoveryCode: '' }))}
                placeholder="Authenticator code"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-slate-100 font-mono"
              />
              <input
                value={disableForm.recoveryCode}
                onChange={(event) => setDisableForm((current) => ({ ...current, recoveryCode: event.target.value, code: '' }))}
                placeholder="Or recovery code"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-slate-100 font-mono"
              />

              <button
                onClick={disableMfa}
                disabled={submitting || !status.enabled || !disableForm.password || (!disableForm.code && !disableForm.recoveryCode)}
                className="w-full px-8 py-4 bg-rose-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-rose-100 hover:bg-rose-500 transition-all disabled:opacity-50"
              >
                Disable MFA
              </button>
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme, THEMES } from "@/lib/ThemeContext";
import { createHttpClient } from "@/api/httpClient";
import { backendConfig } from "@/api/backendConfig";
import {
  Lock, Mail, Bell, Shield, Eye, EyeOff, Check, X, Send, User,
  ChevronRight, AlertTriangle, Smartphone, Globe, BookOpen, Palette
} from "lucide-react";

const api = () => createHttpClient({ baseURL: backendConfig.localBackendUrl });

// ─── Reusable components ───────────────────────────────────────────────────────

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <div className="rounded-2xl border" style={{ background: 'rgba(30,30,40,0.7)', borderColor: 'rgba(255,255,255,0.08)' }}>
    <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <div className="font-semibold text-white text-sm">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
);

const Input = ({ type = "text", value, onChange, placeholder, disabled, className = "" }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all ${className}`}
    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', opacity: disabled ? 0.5 : 1 }}
    onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.6)'; }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
  />
);

const Btn = ({ onClick, loading, disabled, variant = "primary", children, type = "button" }) => {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/5',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 ${styles[variant]}`}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-1">
    <div>
      <div className="text-sm text-white">{label}</div>
      {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? '#3b82f6' : 'rgba(255,255,255,0.12)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
        style={{ left: checked ? 'calc(100% - 22px)' : '2px' }}
      />
    </button>
  </div>
);

const Alert = ({ type, message }) => {
  if (!message) return null;
  const styles = { success: 'bg-green-500/10 border-green-500/20 text-green-400', error: 'bg-red-500/10 border-red-500/20 text-red-400' };
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
      {type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
};

const PasswordInput = ({ value, onChange, placeholder, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="pr-10" />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const CodeInput = ({ value, onChange, onSend, sending, sent, label = "Code de vérification" }) => (
  <div className="space-y-1.5">
    <div className="flex gap-2">
      <Input value={value} onChange={onChange} placeholder="Code à 6 chiffres" className="tracking-widest text-center font-mono" />
      <Btn onClick={onSend} loading={sending} disabled={sent} variant="ghost">
        {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        {sent ? 'Envoyé' : 'Envoyer'}
      </Btn>
    </div>
    {sent && <p className="text-xs text-blue-400">Code envoyé. Vérifiez votre boîte email.</p>}
  </div>
);

// ─── PasswordStrength ──────────────────────────────────────────────────────────
const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    { ok: password.length >= 8, label: '8 caractères min.' },
    { ok: /[A-Z]/.test(password), label: 'Majuscule' },
    { ok: /[0-9]/.test(password), label: 'Chiffre' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'Caractère spécial' },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((c, i) => (
          <span key={i} className="text-xs flex items-center gap-1" style={{ color: c.ok ? '#22c55e' : '#6b7280' }}>
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── ThemeSection ──────────────────────────────────────────────────────────────
function ThemeSection() {
  const { theme, setTheme } = useTheme();

  const groups = [
    {
      key: 'dark',
      label: 'Mode Sombre',
      icon: '🌙',
      themes: Object.entries(THEMES).filter(([, t]) => t.group === 'dark'),
    },
    {
      key: 'light',
      label: 'Mode Clair',
      icon: '☀️',
      themes: Object.entries(THEMES).filter(([, t]) => t.group === 'light'),
    },
  ];

  return (
    <Section icon={Palette} title="Personnalisation de l'affichage" subtitle="Choisissez le thème visuel de l'application">
      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.key}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>{group.icon}</span> {group.label}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {group.themes.map(([key, def]) => {
                const selected = theme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className="relative rounded-xl p-3 text-left transition-all"
                    style={{
                      background: selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${selected ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
                      transform: selected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {/* Preview swatches */}
                    <div className="flex gap-1 mb-2.5">
                      {def.preview.map((color, i) => (
                        <div
                          key={i}
                          className="rounded-md flex-1 h-6"
                          style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)' }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: selected ? '#a78bfa' : '#e5e7eb' }}>{def.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{def.description}</p>
                    {selected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Parametres() {
  const { user, refreshUser } = useAuth();

  // ── Password change state ────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '', code: '' });
  const [pwdStatus, setPwdStatus] = useState({ msg: '', type: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdCodeSending, setPwdCodeSending] = useState(false);
  const [pwdCodeSent, setPwdCodeSent] = useState(false);

  // ── Email change state ───────────────────────────────────────────────────────
  const [email, setEmail] = useState({ newEmail: '', code: '' });
  const [emailStatus, setEmailStatus] = useState({ msg: '', type: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  // ── Notification prefs state ─────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [notifStatus, setNotifStatus] = useState({ msg: '', type: '' });
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Privacy state ────────────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({ journal_public: 1, journal_ouvert: 1 });
  const [privacyStatus, setPrivacyStatus] = useState({ msg: '', type: '' });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Load notification prefs + privacy on mount
  useEffect(() => {
    if (!user) return;
    setPrivacy({ journal_public: user.journal_public ?? 1, journal_ouvert: user.journal_ouvert ?? 1 });
    api().get('/api/auth/settings/notification-prefs')
      .then(r => setNotifPrefs(r?.data || r))
      .catch(() => {});
  }, [user]);

  // ── Password change handlers ─────────────────────────────────────────────────
  const sendPwdCode = async () => {
    setPwdCodeSending(true);
    setPwdStatus({ msg: '', type: '' });
    try {
      await api().post('/api/auth/settings/send-code', { purpose: 'password_change' });
      setPwdCodeSent(true);
    } catch (e) {
      setPwdStatus({ msg: e?.response?.data?.message || 'Erreur envoi du code', type: 'error' });
    } finally {
      setPwdCodeSending(false);
    }
  };

  const submitPasswordChange = async () => {
    setPwdStatus({ msg: '', type: '' });
    if (!pwd.current) return setPwdStatus({ msg: 'Entrez votre mot de passe actuel', type: 'error' });
    if (!pwd.newPwd) return setPwdStatus({ msg: 'Entrez un nouveau mot de passe', type: 'error' });
    if (pwd.newPwd !== pwd.confirm) return setPwdStatus({ msg: 'Les mots de passe ne correspondent pas', type: 'error' });
    if (!pwd.code) return setPwdStatus({ msg: 'Entrez le code de vérification', type: 'error' });
    setPwdLoading(true);
    try {
      await api().post('/api/auth/settings/change-password', {
        currentPassword: pwd.current,
        newPassword: pwd.newPwd,
        code: pwd.code,
      });
      setPwdStatus({ msg: 'Mot de passe mis à jour avec succès', type: 'success' });
      setPwd({ current: '', newPwd: '', confirm: '', code: '' });
      setPwdCodeSent(false);
    } catch (e) {
      setPwdStatus({ msg: e?.response?.data?.message || 'Erreur lors du changement', type: 'error' });
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Email change handlers ────────────────────────────────────────────────────
  const sendEmailCode = async () => {
    if (!email.newEmail) return setEmailStatus({ msg: 'Entrez le nouvel email', type: 'error' });
    setEmailCodeSending(true);
    setEmailStatus({ msg: '', type: '' });
    try {
      await api().post('/api/auth/settings/send-code', { purpose: 'email_change', newEmail: email.newEmail });
      setEmailCodeSent(true);
    } catch (e) {
      setEmailStatus({ msg: e?.response?.data?.message || 'Erreur envoi du code', type: 'error' });
    } finally {
      setEmailCodeSending(false);
    }
  };

  const submitEmailChange = async () => {
    setEmailStatus({ msg: '', type: '' });
    if (!email.newEmail) return setEmailStatus({ msg: 'Entrez le nouvel email', type: 'error' });
    if (!email.code) return setEmailStatus({ msg: 'Entrez le code de vérification', type: 'error' });
    setEmailLoading(true);
    try {
      await api().post('/api/auth/settings/change-email', { newEmail: email.newEmail, code: email.code });
      setEmailStatus({ msg: 'Adresse email mise à jour avec succès', type: 'success' });
      setEmail({ newEmail: '', code: '' });
      setEmailCodeSent(false);
      // Refresh user data in context
      if (refreshUser) refreshUser();
    } catch (e) {
      setEmailStatus({ msg: e?.response?.data?.message || 'Erreur lors du changement', type: 'error' });
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Notification prefs handlers ──────────────────────────────────────────────
  const saveNotifPrefs = async () => {
    setNotifLoading(true);
    setNotifStatus({ msg: '', type: '' });
    try {
      await api().put('/api/auth/settings/notification-prefs', notifPrefs);
      setNotifStatus({ msg: 'Préférences enregistrées', type: 'success' });
    } catch (e) {
      setNotifStatus({ msg: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setNotifLoading(false);
    }
  };

  // ── Privacy handlers ─────────────────────────────────────────────────────────
  const savePrivacy = async () => {
    setPrivacyLoading(true);
    setPrivacyStatus({ msg: '', type: '' });
    try {
      await api().put('/api/auth/settings/privacy', privacy);
      setPrivacyStatus({ msg: 'Paramètres de confidentialité enregistrés', type: 'success' });
    } catch (e) {
      setPrivacyStatus({ msg: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setPrivacyLoading(false);
    }
  };

  const roleLabel = {
    super_admin: 'Super Administrateur',
    admin_systeme: 'Administrateur Système',
    admin_etablissement: 'Administrateur Établissement',
    professeur: 'Professeur',
    etudiant: 'Étudiant',
    parent: 'Parent',
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-white">Paramètres</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez votre compte et vos préférences</p>
        </div>

        {/* ── Account Info (read-only summary) ── */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(30,30,50,0.8) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden" style={{ background: 'rgba(59,130,246,0.2)' }}>
            {user?.photo_url
              ? <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-blue-400 text-xl font-bold">
                  {(user?.prenom?.[0] || user?.nom?.[0] || '?').toUpperCase()}
                </div>
            }
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{user?.prenom} {user?.nom}</div>
            <div className="text-sm text-gray-400 truncate">{user?.email}</div>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
              {roleLabel[user?.role_archive] || user?.role_archive}
            </span>
          </div>
        </div>

        {/* ── Change Password ── */}
        <Section icon={Lock} title="Changer le mot de passe" subtitle="Un code de vérification sera envoyé à votre email">
          <Field label="Mot de passe actuel">
            <PasswordInput value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
          </Field>
          <Field label="Nouveau mot de passe">
            <PasswordInput value={pwd.newPwd} onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))} placeholder="••••••••" />
            <div className="mt-2"><PasswordStrength password={pwd.newPwd} /></div>
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <PasswordInput value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
            {pwd.confirm && pwd.newPwd !== pwd.confirm && (
              <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </Field>
          <Field label="Code de vérification par email" hint={`Un code sera envoyé à ${user?.email}`}>
            <CodeInput
              value={pwd.code}
              onChange={e => setPwd(p => ({ ...p, code: e.target.value }))}
              onSend={sendPwdCode}
              sending={pwdCodeSending}
              sent={pwdCodeSent}
            />
          </Field>
          <Alert type={pwdStatus.type} message={pwdStatus.msg} />
          <div className="flex justify-end">
            <Btn onClick={submitPasswordChange} loading={pwdLoading}>
              <Lock className="w-4 h-4" /> Changer le mot de passe
            </Btn>
          </div>
        </Section>

        {/* ── Change Email ── */}
        <Section icon={Mail} title="Changer l'adresse email" subtitle="Un code de vérification sera envoyé à la nouvelle adresse">
          <Field label="Adresse email actuelle">
            <Input value={user?.email || ''} disabled />
          </Field>
          <Field label="Nouvelle adresse email">
            <Input
              type="email"
              value={email.newEmail}
              onChange={e => { setEmail(p => ({ ...p, newEmail: e.target.value })); setEmailCodeSent(false); }}
              placeholder="nouveau@email.com"
            />
          </Field>
          <Field label="Code de vérification" hint="Le code sera envoyé à la nouvelle adresse email">
            <CodeInput
              value={email.code}
              onChange={e => setEmail(p => ({ ...p, code: e.target.value }))}
              onSend={sendEmailCode}
              sending={emailCodeSending}
              sent={emailCodeSent}
            />
          </Field>
          <Alert type={emailStatus.type} message={emailStatus.msg} />
          <div className="flex justify-end">
            <Btn onClick={submitEmailChange} loading={emailLoading}>
              <Mail className="w-4 h-4" /> Changer l'email
            </Btn>
          </div>
        </Section>

        {/* ── Notifications ── */}
        {notifPrefs && (
          <Section icon={Bell} title="Notifications" subtitle="Choisissez comment vous souhaitez être notifié">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Par email</p>
              <Toggle checked={!!notifPrefs.email_messages} onChange={v => setNotifPrefs(p => ({ ...p, email_messages: v }))} label="Messages" description="Nouveaux messages reçus" />
              <Toggle checked={!!notifPrefs.email_inscriptions} onChange={v => setNotifPrefs(p => ({ ...p, email_inscriptions: v }))} label="Inscriptions" description="Nouvelles demandes d'inscription" />
              <Toggle checked={!!notifPrefs.email_notes} onChange={v => setNotifPrefs(p => ({ ...p, email_notes: v }))} label="Notes & résultats" description="Publication de nouvelles notes" />
              <Toggle checked={!!notifPrefs.email_presence} onChange={v => setNotifPrefs(p => ({ ...p, email_presence: v }))} label="Présences" description="Rapports d'absence" />
            </div>
            <div className="border-t pt-4 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications push</p>
              <Toggle checked={!!notifPrefs.push_messages} onChange={v => setNotifPrefs(p => ({ ...p, push_messages: v }))} label="Messages" description="Notifications en temps réel" />
              <Toggle checked={!!notifPrefs.push_inscriptions} onChange={v => setNotifPrefs(p => ({ ...p, push_inscriptions: v }))} label="Inscriptions" />
              <Toggle checked={!!notifPrefs.push_notes} onChange={v => setNotifPrefs(p => ({ ...p, push_notes: v }))} label="Notes & résultats" />
              <Toggle checked={!!notifPrefs.push_presence} onChange={v => setNotifPrefs(p => ({ ...p, push_presence: v }))} label="Présences" />
            </div>
            <Alert type={notifStatus.type} message={notifStatus.msg} />
            <div className="flex justify-end">
              <Btn onClick={saveNotifPrefs} loading={notifLoading}>
                <Check className="w-4 h-4" /> Enregistrer
              </Btn>
            </div>
          </Section>
        )}

        {/* ── Privacy ── */}
        <Section icon={Eye} title="Confidentialité" subtitle="Contrôlez la visibilité de votre profil">
          <Toggle
            checked={!!privacy.journal_public}
            onChange={v => setPrivacy(p => ({ ...p, journal_public: v ? 1 : 0 }))}
            label="Journal public"
            description="Votre journal est visible par les autres utilisateurs"
          />
          <Toggle
            checked={!!privacy.journal_ouvert}
            onChange={v => setPrivacy(p => ({ ...p, journal_ouvert: v ? 1 : 0 }))}
            label="Journal ouvert aux commentaires"
            description="Les autres utilisateurs peuvent commenter vos publications"
          />
          <Alert type={privacyStatus.type} message={privacyStatus.msg} />
          <div className="flex justify-end">
            <Btn onClick={savePrivacy} loading={privacyLoading}>
              <Check className="w-4 h-4" /> Enregistrer
            </Btn>
          </div>
        </Section>

        {/* ── Personnalisation d'affichage ── */}
        <ThemeSection />

        {/* ── Info système ── */}
        <Section icon={Shield} title="Informations du compte">
          <div className="space-y-3">
            {[
              { label: "Identifiant", value: user?.id?.slice(0, 8) + '…' },
              { label: "Rôle", value: roleLabel[user?.role_archive] || user?.role_archive },
              { label: "Statut", value: user?.blocked ? 'Bloqué' : 'Actif', ok: !user?.blocked },
              { label: "Établissement", value: user?.etablissement_nom || '—' },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-medium" style={{ color: ok === false ? '#f87171' : ok === true ? '#4ade80' : '#e5e7eb' }}>{value}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}


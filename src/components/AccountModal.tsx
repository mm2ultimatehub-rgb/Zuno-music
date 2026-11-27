import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  LockKeyhole,
  LogOut,
  Mail,
  UserRound,
  X,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import type { CloudSyncStatus } from '../utils/cloudSync';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  status: CloudSyncStatus;
  darkMode: boolean;
  accentColor: string;
  recoveryMode: boolean;
  onRecoveryComplete: () => void;
}

const STATUS_LABELS: Record<CloudSyncStatus, string> = {
  disabled: 'Bulut bağlantısı yapılandırılmamış',
  'signed-out': 'Giriş yapılmadı',
  syncing: 'Cihazlar eşitleniyor',
  synced: 'Bulut ile eşitlendi',
  error: 'Senkronizasyon bağlantısı kurulamadı',
};

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  onClose,
  user,
  status,
  darkMode,
  accentColor,
  recoveryMode,
  onRecoveryComplete,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const surface = darkMode
    ? 'border-white/10 bg-[#111722] text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';
  const field = darkMode
    ? 'border-white/10 bg-black/20 placeholder:text-slate-500'
    : 'border-slate-200 bg-slate-50 placeholder:text-slate-400';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage('E-posta ve şifre alanlarını doldur.');
      return;
    }
    if (password.length < 6) {
      setMessage('Şifre en az 6 karakter olmalı.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage(
          data.session
            ? 'Hesabın oluşturuldu. ZUNO bulut eşitlemesi etkin.'
            : 'Kayıt oluşturuldu. Giriş yapmadan önce e-posta adresine gönderilen doğrulama bağlantısını aç.'
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        setMessage('Giriş başarılı. Kütüphanen eşitleniyor.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Hesap işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!supabase) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage('Şifre sıfırlama bağlantısı için önce e-posta adresini yaz.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage('Sıfırlama bağlantısı gönderildiyse e-posta kutuna ulaşacak. Gelen bağlantıyı bu cihazda aç.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Şifre sıfırlama isteği gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 8) {
      setMessage('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Yeni şifreler eşleşmiyor.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Şifren güncellendi. Yeni şifrenle hesabını kullanabilirsin.');
      onRecoveryComplete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Şifre güncellenemedi.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage('Oturum kapatıldı. Bu cihazdaki yerel müzik dosyaların silinmedi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Oturum kapatılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="zuno-account-title"
        className={'w-full max-w-md rounded-[2rem] border p-5 shadow-2xl sm:p-7 ' + surface}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: accentColor + '22', color: accentColor }}
            >
              {user ? <Cloud className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
            </div>
            <div>
              <h2 id="zuno-account-title" className="font-display text-xl font-bold">
                ZUNO Hesabı
              </h2>
              <p className="mt-0.5 text-xs opacity-60">Kütüphaneni cihazların arasında taşı</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Hesap penceresini kapat"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Bulut hesabı henüz bağlanmadı
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-75">
              Giriş ve kayıt ekranını etkinleştirmek için ZUNO’ya özel Supabase projesi oluşturulmalı.
              Kurulum adımları depodaki SUPABASE_SETUP.md dosyasında.
            </p>
          </div>
        ) : recoveryMode ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-current/10 p-4 text-xs leading-relaxed opacity-75">
              Hesabın için yeni bir şifre belirle. Bu işlemden sonra diğer cihazlarda yeniden giriş yapman gerekebilir.
            </div>
            <form onSubmit={handleCompleteRecovery} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium opacity-70">Yeni şifre</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="En az 8 karakter"
                  className={'h-12 w-full rounded-xl border px-3 text-sm outline-none ' + field}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium opacity-70">Yeni şifreyi tekrar yaz</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Yeni şifreyi doğrula"
                  className={'h-12 w-full rounded-xl border px-3 text-sm outline-none ' + field}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: accentColor, color: '#0b0e16' }}
              >
                {busy ? 'Şifre güncelleniyor...' : 'Yeni şifreyi kaydet'}
              </button>
            </form>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className={'rounded-2xl border p-4 ' + (darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-55">Oturum açıldı</div>
              <div className="mt-1 break-all text-sm font-semibold">{user.email || 'ZUNO kullanıcısı'}</div>
              <div className="mt-4 flex items-center gap-2 text-xs">
                {status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                ) : status === 'synced' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Cloud className="h-4 w-4" style={{ color: accentColor }} />
                )}
                <span>{STATUS_LABELS[status]}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-current/10 p-4 text-xs leading-relaxed opacity-70">
              Ayarlar, favoriler, son dinlenenler, çalma listeleri ve arama geçmişi otomatik eşitlenir.
              İçe aktardığın ses dosyaları ve indirmelerin yalnızca bu cihazda saklanır.
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-current/15 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {busy ? 'Oturum kapatılıyor...' : 'Oturumu kapat'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 rounded-2xl bg-black/10 p-1 dark:bg-white/[0.05]">
              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="h-10 rounded-xl text-xs font-semibold transition-colors"
                style={mode === 'signin' ? { backgroundColor: accentColor, color: '#0b0e16' } : undefined}
              >
                Giriş yap
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setMessage(null); }}
                className="h-10 rounded-xl text-xs font-semibold transition-colors"
                style={mode === 'signup' ? { backgroundColor: accentColor, color: '#0b0e16' } : undefined}
              >
                Hesap oluştur
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium opacity-70">E-posta adresi</span>
                <span className={'flex h-12 items-center gap-2.5 rounded-xl border px-3 ' + field}>
                  <Mail className="h-4 w-4 shrink-0 opacity-50" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ornek@eposta.com"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium opacity-70">Şifre</span>
                <span className={'flex h-12 items-center gap-2.5 rounded-xl border px-3 ' + field}>
                  <LockKeyhole className="h-4 w-4 shrink-0 opacity-50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full min-w-0 bg-transparent text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="shrink-0 text-xs opacity-60 hover:opacity-100"
                  >
                    {showPassword ? 'Gizle' : 'Göster'}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: accentColor, color: '#0b0e16' }}
              >
                {busy ? 'İşleniyor...' : mode === 'signup' ? 'Ücretsiz hesap oluştur' : 'ZUNO’ya giriş yap'}
              </button>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={busy}
                  className="w-full py-2 text-xs font-semibold opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
                >
                  Şifremi unuttum
                </button>
              )}
            </form>
          </div>
        )}

        {message && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-xl border border-current/10 px-3 py-2.5 text-xs leading-relaxed opacity-80"
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
};

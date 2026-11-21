import React, { useState } from 'react';
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ShieldCheck
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { googleSignIn, loginWithEmailPassword, logoutGoogle } from '../services/firebaseAuth';

interface NakesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  onGoogleAuthSuccess?: (user: any, token: string) => void;
}

const ADMIN_EMAIL = 'holistikprofesi47@gmail.com';
const AUTHORIZED_STAFF_EMAILS = new Set([
  ADMIN_EMAIL,
  'holistikundip@gmail.com'
]);

async function isAuthorizedStaff(user: User): Promise<boolean> {
  const email = user.email?.trim().toLowerCase();
  if (email && AUTHORIZED_STAFF_EMAILS.has(email)) return true;

  const adminProfile = await getDoc(doc(db, 'admins', user.uid));
  return adminProfile.exists();
}

function getGoogleLoginErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum selesai.';
    case 'auth/popup-blocked':
      return 'Popup login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.';
    case 'auth/unauthorized-domain':
      return 'Domain situs belum diizinkan di Firebase Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Provider Google belum diaktifkan di Firebase Authentication > Sign-in method.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terdaftar dengan sandi Firebase. Gunakan form email dan sandi di bawah.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan gagal. Periksa internet lalu coba lagi.';
    default:
      return `Login Google gagal${code ? ` (${code})` : ''}. Periksa konfigurasi Google di Firebase Console.`;
  }
}

export const NakesLoginModal: React.FC<NakesLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onGoogleAuthSuccess
}) => {
  const [emailOrUser, setEmailOrUser] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (!result) {
        setErrorMessage('Login Google tidak menghasilkan sesi. Silakan coba lagi.');
        return;
      }

      if (!(await isAuthorizedStaff(result.user))) {
        await logoutGoogle();
        setErrorMessage('Akun Google ini belum terdaftar sebagai staf yang diizinkan di Firebase.');
        return;
      }

      onGoogleAuthSuccess?.(result.user, result.accessToken);
      onLoginSuccess();
      onClose();
    } catch (error) {
      console.error('Nakes Google login error:', error);
      setErrorMessage(getGoogleLoginErrorMessage(error));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const email = emailOrUser.trim().toLowerCase();
      const user = await loginWithEmailPassword(email, password);
      if (!(await isAuthorizedStaff(user))) {
        await logoutGoogle();
        setErrorMessage('Akun ini tidak terdaftar sebagai staf yang berwenang.');
        return;
      }

      onLoginSuccess();
      onClose();
    } catch (error) {
      console.error('Nakes email/password login error:', error);
      const code = (error as { code?: string } | null)?.code;
      setErrorMessage(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Email atau kata sandi Firebase tidak sesuai.'
          : code === 'auth/too-many-requests'
            ? 'Terlalu banyak percobaan. Coba lagi beberapa saat.'
            : code === 'auth/network-request-failed'
              ? 'Koneksi jaringan gagal. Periksa internet lalu coba lagi.'
              : `Login Firebase gagal${code ? ` (${code})` : ''}.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden border border-stone-200">
        {/* Header with Medical Theme */}
        <div className="bg-stone-50 border-b border-stone-200 p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                  Portal Administrator
                </span>
                <span className="text-[11px] text-stone-500 font-medium">Autentikasi Staf</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-stone-900 mt-1">
                Akses Pengelola Layanan
              </h2>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Primary Option: Google OAuth Single Sign-On */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 hover:border-stone-300 font-medium text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google (holistikprofesi47@gmail.com)'}</span>
            </button>
            <p className="text-[11px] text-center text-stone-500">
              Metode resmi untuk sinkronisasi otomatis dengan Google Spreadsheet & Cloud Services.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-medium uppercase tracking-wider">Atau email & sandi Firebase</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Email Input */}
              <div>
                <label className="font-medium text-stone-700 block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-stone-500" strokeWidth={1.75} />
                  <span>Email Perawat</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    placeholder="holistikprofesi47@gmail.com"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="font-medium text-stone-700 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-stone-500" strokeWidth={1.75} />
                  <span>Kata Sandi</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2.5 pr-10 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-2/3 bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-100" strokeWidth={1.75} />
                <span>{isLoading ? 'Memverifikasi...' : 'Masuk dengan Email'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

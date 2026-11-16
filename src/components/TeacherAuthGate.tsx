import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { AlertCircle, BookOpen, CalendarDays, Cloud, Loader2, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface TeacherAuthGateProps {
  externalError?: string | null;
}

export const TeacherAuthGate: React.FC<TeacherAuthGateProps> = ({
  externalError,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';

      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(
          'Tetingkap log masuk Google ditutup sebelum pengesahan selesai. Sila cuba lagi.'
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(
          'Pelayar menyekat tetingkap timbul (pop-up) log masuk Google. Sila benarkan pop-up untuk laman ini dan cuba semula.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        const currentHost =
          typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorMsg(
          `Domain "${currentHost}" belum didaftarkan sebagai Authorized Domain dalam Firebase Authentication. Sila tambah "${currentHost}" di Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Gagal log masuk dengan akaun Google. Sila cuba lagi.'
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  const shownError = errorMsg || externalError;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            PelanRPH
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Ruang Kerja Perancangan Pengajaran Guru Malaysia
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Left: Pedagogical & Cloud Context */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-sky-700">
                Storan Awan Kekal · Akaun Guru Peribadi
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Simpan Jadual, RPT, DSKP dan draf RPH harian anda secara selamat
                di awan
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Log masuk menggunakan akaun Google untuk membuka ruang kerja
                peribadi PelanRPH. Semua jadual mengajar, Rancangan Pengajaran
                Tahunan, templat format sekolah dan arkib RPH kekal tersimpan
                merentas sesi serta peranti.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <CalendarDays className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Automasi Jadual &amp; RPT</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dokumen Jadual dan RPT anda disegerakkan ke awan supaya draf
                  RPH harian dijana terus mengikut minggu semasa.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <BookOpen className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Pematuhan Verbatim RPT</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tema, SK dan SP disalin tepat daripada RPT guru dengan PBD
                  (TP1–TP6) dan eksport Word/PDF mengikut format sekolah.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Cloud className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Arkib &amp; Refleksi Kekal</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Suntingan RPH, status semakan dan refleksi selepas PdPc
                  disimpan automatik dalam pangkalan data awan.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Privasi Data Terkawal</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hanya akaun anda boleh mencapai data RPH anda. Sistem kekal
                  bebas daripada nama atau maklumat peribadi murid.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Sign In Action */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 bg-slate-50/70 flex flex-col justify-center space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">
                Log Masuk Guru
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gunakan akaun Google sekolah (cth. DELIMa / Google Workspace)
                atau akaun Google peribadi anda.
              </p>
            </div>

            {shownError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{shownError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={signingIn}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengesahkan Akaun Google...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#FFFFFF"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                    />
                  </svg>
                  Log Masuk dengan Google
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Nota: AI hanya mencadangkan draf RPH. Guru kekal sebagai pembuat
              keputusan akhir sebelum penghantaran kepada PK / GPK.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

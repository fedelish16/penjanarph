import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  AlertCircle,
  ArrowDown,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Cloud,
  FileDown,
  Loader2,
  MapPin,
  Printer,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { HeroBackdropArt } from './HeroBackdropArt';

interface TeacherAuthGateProps {
  externalError?: string | null;
}

export const TeacherAuthGate: React.FC<TeacherAuthGateProps> = ({
  externalError,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(
    'KSSR & KSSM (Semua Subjek)'
  );
  const [selectedFlow, setSelectedFlow] = useState<'automasi' | 'manual'>(
    'automasi'
  );

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('pelanrph_preferred_mode', selectedFlow);
        window.sessionStorage.setItem(
          'pelanrph_preferred_curriculum',
          selectedCurriculum
        );
      }
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const shownError = errorMsg || externalError;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#060D3D] flex flex-col">
      {/* Tier 1: Midnight Navy Brand & Action Bar */}
      <header className="bg-[#060D3D] text-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center px-2.5 py-1 border-2 border-[#00B4F0] text-white font-extrabold text-base tracking-tight whitespace-nowrap shrink-0"
            >
              pelan<span className="text-[#14E2D8]">RPH</span>
            </a>
            <span className="hidden sm:inline-block text-xs text-slate-300 font-medium truncate">
              Membantu Guru Malaysia ·{' '}
              <span className="text-[#14E2D8] font-semibold">
                KSSR · KSSM · PBD
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('kelebihan-sistem')}
              className="hidden sm:inline-flex items-center justify-center rounded bg-[#213175] hover:bg-[#2C3F92] px-4 py-2 text-[11px] font-bold tracking-wider uppercase text-white transition-colors whitespace-nowrap"
            >
              CIRI UTAMA
            </button>
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={signingIn}
              className="text-xs font-bold tracking-wider uppercase text-white hover:text-[#14E2D8] transition-colors whitespace-nowrap"
            >
              {signingIn ? 'MENGESAHKAN...' : 'LOG MASUK'}
            </button>
          </div>
        </div>
      </header>

      {/* Tier 2: Crisp White Sub-Nav */}
      <nav
        aria-label="Navigasi penerangan sistem"
        className="bg-white border-b border-slate-200 sticky top-0 z-30"
      >
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 overflow-x-auto text-[11px] font-bold tracking-wider uppercase text-[#060D3D]">
            <button
              type="button"
              onClick={() => scrollToSection('kelebihan-sistem')}
              className="hover:text-[#008EC7] transition-colors whitespace-nowrap shrink-0"
            >
              Automasi Harian
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kelebihan-sistem')}
              className="hover:text-[#008EC7] transition-colors whitespace-nowrap shrink-0"
            >
              Padanan Verbatim RPT
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('panduan-sistem')}
              className="hover:text-[#008EC7] transition-colors whitespace-nowrap shrink-0"
            >
              Word &amp; PDF 1 Muka A4
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('panduan-sistem')}
              className="hover:text-[#008EC7] transition-colors whitespace-nowrap shrink-0"
            >
              Storan Awan Guru
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={signingIn}
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-[#060D3D] hover:text-[#008EC7] transition-colors whitespace-nowrap shrink-0"
          >
            <MapPin className="w-3.5 h-3.5 text-[#00B4F0]" />
            Akses Akaun Google / DELIMa
          </button>
        </div>
      </nav>

      {/* Hero Section with Illustrated Navy-to-Cyan Backdrop */}
      <section className="relative hero-navy-teal-bg text-white overflow-hidden">
        <HeroBackdropArt />

        <div className="relative z-10 max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="max-w-4xl space-y-6">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-sky-200">
              JADUAL HARIAN · RPT TAHUNAN · DSKP KPM
            </p>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-tight text-white text-balance">
              Rancang<span className="text-[#14E2D8]">.</span> Semak
              <span className="text-[#14E2D8]">.</span>
              <br />
              Siapkan RPH anda<span className="text-[#14E2D8]">.</span>
            </h1>

            <p className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white/95">
              <span className="text-[#14E2D8]">KSSR &amp; KSSM</span>
              <span className="mx-2 text-white/40">·</span>
              <span className="text-[#14E2D8]">VERBATIM RPT</span>
              <span className="mx-2 text-white/40">·</span>
              <span className="text-[#14E2D8]">PBD TP1–TP6</span>
              <span className="mx-2 text-white/40">·</span>
              <span>CETAK 1 MUKA A4 &amp; WORD</span>
            </p>

            {/* Signature Floating White Quick-Command Card */}
            <div className="bg-white text-[#060D3D] rounded-md shadow-2xl p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-5 max-w-4xl">
              <div className="font-editorial text-lg sm:text-xl font-extrabold text-[#060D3D] whitespace-nowrap shrink-0">
                Sediakan RPH yang tepat
                <span className="text-[#00B4F0]">.</span>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="landing-kurikulum" className="sr-only">
                    Pilih tahap kurikulum
                  </label>
                  <select
                    id="landing-kurikulum"
                    value={selectedCurriculum}
                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                    className="w-full appearance-none bg-transparent border-b-2 border-[#00B4F0] py-2 pr-7 text-xs sm:text-sm font-semibold text-[#060D3D] focus:outline-none focus:border-[#060D3D] cursor-pointer"
                  >
                    <option value="KSSR & KSSM (Semua Subjek)">
                      KSSR &amp; KSSM (Semua Subjek)
                    </option>
                    <option value="KSSR (Sekolah Rendah)">
                      KSSR (Sekolah Rendah)
                    </option>
                    <option value="KSSM (Sekolah Menengah)">
                      KSSM (Sekolah Menengah)
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#00B4F0] pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative">
                  <label htmlFor="landing-aliran" className="sr-only">
                    Pilih aliran kerja RPH
                  </label>
                  <select
                    id="landing-aliran"
                    value={selectedFlow}
                    onChange={(e) =>
                      setSelectedFlow(
                        e.target.value === 'manual' ? 'manual' : 'automasi'
                      )
                    }
                    className="w-full appearance-none bg-transparent border-b-2 border-[#00B4F0] py-2 pr-7 text-xs sm:text-sm font-semibold text-[#060D3D] focus:outline-none focus:border-[#060D3D] cursor-pointer"
                  >
                    <option value="automasi">
                      Automasi Harian (Jadual + RPT)
                    </option>
                    <option value="manual">Draf RPH Tunggal (Manual)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#00B4F0] pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={signingIn}
                className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-6 py-3 text-xs font-extrabold tracking-wider uppercase text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4F0] focus-visible:ring-offset-2 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    MENGESAHKAN...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#FFFFFF"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                      />
                    </svg>
                    LOG MASUK GOOGLE
                  </>
                )}
              </button>
            </div>

            {shownError && (
              <div className="max-w-4xl rounded-md border border-red-300 bg-red-950/85 px-4 py-3 text-xs text-red-100 flex items-start gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <span>{shownError}</span>
              </div>
            )}

            {/* 3 Highlighted Feature Links Row */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2 text-sm font-medium text-white">
              <button
                type="button"
                onClick={() => scrollToSection('kelebihan-sistem')}
                className="inline-flex items-center gap-2.5 group cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#14E2D8] shrink-0" />
                <span className="border-b-2 border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                  Padan Jadual &amp; RPT Automatik
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('panduan-sistem')}
                className="inline-flex items-center gap-2.5 group cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-[#14E2D8] shrink-0" />
                <span className="border-b-2 border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                  Simpan Kekal di Storan Awan
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('panduan-sistem')}
                className="inline-flex items-center gap-2.5 group cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#14E2D8] shrink-0" />
                <span className="border-b-2 border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                  Cetak 1 Muka A4 &amp; Eksport Word
                </span>
              </button>
            </div>
          </div>

          {/* Downward Scroll Cue */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToSection('kelebihan-sistem')}
              aria-label="Skrol ke penerangan ciri sistem"
              className="p-2 text-white/90 hover:text-[#14E2D8] transition-colors cursor-pointer"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Below-the-Fold System Capabilities & Pedagogical Guarantees */}
      <main id="kelebihan-sistem" className="flex-1 bg-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
          <div className="max-w-2xl space-y-2.5">
            <p className="text-xs font-bold tracking-wider uppercase text-[#008EC7]">
              Direka Khusus Untuk Guru Malaysia
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#060D3D] text-balance">
              Ketepatan DSKP &amp; RPT digabungkan dengan kelajuan harian
              <span className="text-[#00B4F0]">.</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Setiap guru mendapat ruang kerja awan peribadi yang dilindungi
              log masuk Google/DELIMa. Muat naik dokumen anda sekali sahaja dan
              sistem menyusun draf RPH mengikut jadual harian anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-lg border border-slate-200 bg-[#F9FBFE] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-[#060D3D] text-[#14E2D8] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#060D3D]">
                01. Salinan Verbatim RPT
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tema, Standard Kandungan (SK) dan Standard Pembelajaran (SP)
                disalin tepat daripada RPT anda tanpa direka atau diparafrasa.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-[#F9FBFE] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-[#060D3D] text-[#14E2D8] flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#060D3D]">
                02. Automasi Slot Harian
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilih tarikh dan minggu RPT — semua kelas hari tersebut dijana
                dengan agihan minit Set Induksi, Perkembangan &amp; Penutup
                tepat mengikut tempoh waktu.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-[#F9FBFE] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-[#060D3D] text-[#14E2D8] flex items-center justify-center">
                <FileDown className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#060D3D]">
                03. Format Sekolah &amp; 1 Muka A4
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Masukkan nama sekolah dan muat naik lencana sekolah anda. Cetak
                PDF 1 muka surat A4 atau muat turun fail Word (.docx) yang sedia
                disunting.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-[#F9FBFE] p-6 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-[#060D3D] text-[#14E2D8] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#060D3D]">
                04. Storan Awan &amp; Privasi
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jadual, RPT, refleksi dan arkib disimpan kekal dalam akaun
                guru masing-masing tanpa sebarang nama atau data peribadi murid.
              </p>
            </div>
          </div>

          <div
            id="panduan-sistem"
            className="rounded-lg border border-slate-200 bg-[#060D3D] text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-[11px] font-bold tracking-wider uppercase text-[#14E2D8]">
                Guru kekal sebagai pembuat keputusan akhir
              </p>
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-white">
                Sedia memulakan ruang kerja PelanRPH anda
                <span className="text-[#14E2D8]">?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Log masuk menggunakan akaun Google atau DELIMa anda untuk
                mengakses automasi harian, muat naik dokumen dan arkib RPH
                awan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={signingIn}
              className="inline-flex items-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-6 py-3 text-xs font-extrabold tracking-wider uppercase text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'MENGESAHKAN...' : 'LOG MASUK DENGAN GOOGLE'}
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-[#060D3D] text-slate-300 border-t border-white/10">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white">PelanRPH</span>
            <span className="text-white/30">·</span>
            <span>Pembantu Perancangan Pengajaran Guru Malaysia</span>
          </div>
          <span className="text-slate-400">
            Draf AI bertanda semakan guru · Pematuhan KSSR &amp; KSSM
          </span>
        </div>
      </footer>
    </div>
  );
};

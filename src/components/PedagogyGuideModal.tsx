import React from 'react';
import { X } from 'lucide-react';

interface PedagogyGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const PedagogyGuideModal: React.FC<PedagogyGuideModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pedagogy-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#060D3D] text-white">
          <h2
            id="pedagogy-modal-title"
            className="text-base font-bold text-white"
          >
            Prinsip &amp; Kaedah Penjanaan Draf RPH
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              7 Peraturan Ketat Pematuhan DSKP &amp; RPT
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <span className="font-medium text-slate-800">
                  Salinan Verbatim:
                </span>{' '}
                Tema, Standard Kandungan dan Standard Pembelajaran disalin
                tepat daripada DATA_RPT_MINGGU tanpa diubah atau diparafrasa.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Saringan Minggu Cuti / Data Tidak Lengkap:
                </span>{' '}
                Jika RPT kosong atau minggu cuti/peperiksaan, sistem tidak
                menjana RPH dan memulangkan status{' '}
                <code className="font-mono text-slate-900">PERLU_MAKLUMAT</code>
                .
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Ketepatan Masa:
                </span>{' '}
                Jumlah minit semua fasa aktiviti mesti tepat sama dengan tempoh
                waktu jadual.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Privasi &amp; Integriti:
                </span>{' '}
                Tiada nama murid atau data peribadi; tiada rujukan, statistik
                atau pautan direka.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Kawalan Guru:
                </span>{' '}
                Setiap draf bertanda{' '}
                <em>&ldquo;Draf AI – perlu disemak guru&rdquo;</em> dan medan
                refleksi kekal kosong untuk diisi guru selepas mengajar.
              </li>
            </ul>
          </section>

          <section className="space-y-2 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Turutan Penjanaan 7 Langkah
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <span className="font-medium text-slate-800">
                  Rekaan Terbalik (Wiggins &amp; McTighe):
                </span>{' '}
                Membina 1–2 objektif boleh ukur dan kriteria kejayaan boleh
                cerap terlebih dahulu.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Bukti Pembelajaran:
                </span>{' '}
                Menentukan hasil atau perlakuan murid sebagai asas pentaksiran
                formatif/sumatif.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Struktur Pengajaran Jelas (Rosenshine, 2012):
                </span>{' '}
                Set Induksi (~10%), Pengenalan &amp; Model Guru (~20–25%),
                Amalan Berpandu (~25–30%), Amalan Bebas (~25–30%), dan Penutup
                (~10%).
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Taksonomi Bloom Semakan (Anderson &amp; Krathwohl, 2001):
                </span>{' '}
                Memastikan sekurang-kurangnya satu tugasan KBAT aras
                Menganalisis, Menilai atau Mencipta.
              </li>
              <li>
                <span className="font-medium text-slate-800">Pembezaan:</span>{' '}
                Satu sokongan pemulihan dan satu pengayaan yang bertumpu pada
                objektif yang sama.
              </li>
              <li>
                <span className="font-medium text-slate-800">Realistik:</span>{' '}
                Hanya menggunakan sumber dalam{' '}
                <code className="font-mono text-slate-900">SUMBER_ADA</code> dan
                sesuai untuk bilik darjah biasa.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Semakan Kendiri:
                </span>{' '}
                Audit automatik ke atas standard verbatim, masa, KBAT, EMK,
                pentaksiran dan privasi sebelum paparan.
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};

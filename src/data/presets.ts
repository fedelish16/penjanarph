import type { RphRequestInput } from '../types/rph';

export interface RptPreset {
  id: string;
  label: string;
  subtitle: string;
  data: RphRequestInput;
}

export const COMMON_RESOURCES: string[] = [
  'Papan putih & pen penanda',
  'Buku teks KPM',
  'Projektor / LCD',
  'Kertas sebak & pen warna',
  'Bahan terpakai / kitar semula',
  'Kad imbasan / lembaran kerja bercetak',
  'Makmal komputer',
  'Tiada sambungan internet',
];

export const RPH_TEMPLATES: string[] = [
  'Standard KPM / PPD (Objektif, KK, Aktiviti, BBM, EMK, KBAT, Pentaksiran, Pembezaan, Refleksi)',
  'Templat Ringkas TS25 (Fokus Kriteria Kejayaan & Pembezaan)',
  'Templat e-RPH Negeri (Lengkap dengan Peranan Guru & Murid)',
];

export const CURRICULUM_OPTIONS: string[] = [
  'KSSM (DSKP Semakan Terkini)',
  'KSSR Semakan (DSKP Terkini)',
  'STPM / Tingkatan 6',
  'Peralihan / Pendidikan Khas (KSSMPK / KSSRPK)',
];

export const RPT_PRESETS: RptPreset[] = [
  {
    id: 'psv-t4',
    label: 'Pendidikan Seni Visual · Tingkatan 4',
    subtitle: 'Minggu 12 · Lukisan (60 minit · Bahan Terpakai, Tiada Internet)',
    data: {
      mata_pelajaran: 'Pendidikan Seni Visual',
      tingkatan_tahun: 'Tingkatan 4',
      kurikulum: 'KSSM (DSKP Semakan Terkini)',
      data_rpt_minggu: {
        minggu: 'Minggu 12',
        tema: 'Seni Halus: Seni Lukisan',
        standard_kandungan: '2.1 Pemahaman terhadap Seni Lukisan dalam bidang Seni Halus.',
        standard_pembelajaran:
          '2.1.2 Mengaplikasikan media, proses dan teknik penghasilan seni lukisan melalui penerokaan bahan berunsur garisan dan jalinan.',
        catatan: 'Murid membawa bahan terpakai seperti kotak kadbod dan ranting kayu dari rumah.',
      },
      profil_kelas: {
        bil_murid: '28 orang murid',
        tahap_penguasaan_umum: 'Tahap Penguasaan 3 hingga 4 (sederhana mahir asas lakaran)',
        keperluan_khas_umum: '3 orang murid memerlukan bimbingan langkah demi langkah untuk kawalan ton',
      },
      jadual: {
        tarikh: '2026-11-16',
        masa_mula: '08:10',
        masa_tamat: '09:10',
        tempoh_minit: 60,
      },
      sumber_ada: [
        'Papan putih & pen penanda',
        'Buku teks KPM',
        'Bahan terpakai / kitar semula',
        'Tiada sambungan internet',
      ],
      templat_rph: 'Standard KPM / PPD (Objektif, KK, Aktiviti, BBM, EMK, KBAT, Pentaksiran, Pembezaan, Refleksi)',
      catatan_guru: 'Utamakan amalan berpandu di bilik seni biasa dengan peralatan asas pensel, arang atau pen terpakai.',
    },
  },
  {
    id: 'math-y5',
    label: 'Matematik · Tahun 5',
    subtitle: 'Minggu 18 · Pecahan, Perpuluhan & Peratus (60 minit · Projektor)',
    data: {
      mata_pelajaran: 'Matematik',
      tingkatan_tahun: 'Tahun 5',
      kurikulum: 'KSSR Semakan (DSKP Terkini)',
      data_rpt_minggu: {
        minggu: 'Minggu 18',
        tema: 'Nombor dan Operasi: Pecahan, Perpuluhan dan Peratus',
        standard_kandungan: '2.3 Peratus',
        standard_pembelajaran:
          '2.3.1 Menukar nombor bercampur kepada peratus dan sebaliknya bagi menyelesaikan masalah rutin harian.',
        catatan: 'Gunakan konteks harga jualan di kantin sekolah atau diskaun kedai buku.',
      },
      profil_kelas: {
        bil_murid: '32 orang murid',
        tahap_penguasaan_umum: 'Bercampur (TP2 hingga TP5); majoriti menguasai sifir asas',
        keperluan_khas_umum: '4 orang murid masih keliru menukar pecahan wajar kepada peratus',
      },
      jadual: {
        tarikh: '2026-11-17',
        masa_mula: '10:30',
        masa_tamat: '11:30',
        tempoh_minit: 60,
      },
      sumber_ada: [
        'Papan putih & pen penanda',
        'Buku teks KPM',
        'Projektor / LCD',
        'Kad imbasan / lembaran kerja bercetak',
      ],
      templat_rph: 'Standard KPM / PPD (Objektif, KK, Aktiviti, BBM, EMK, KBAT, Pentaksiran, Pembezaan, Refleksi)',
      catatan_guru: 'Pastikan ada soalan penyelesaian masalah kontekstual untuk kumpulan pengayaan.',
    },
  },
  {
    id: 'bm-t2',
    label: 'Bahasa Melayu · Tingkatan 2',
    subtitle: 'Minggu 9 · Alam Sekitar & Teknologi Hijau (40 minit · Bilik Darjah)',
    data: {
      mata_pelajaran: 'Bahasa Melayu',
      tingkatan_tahun: 'Tingkatan 2',
      kurikulum: 'KSSM (DSKP Semakan Terkini)',
      data_rpt_minggu: {
        minggu: 'Minggu 9',
        tema: 'Kelestarian Alam Sekitar',
        standard_kandungan: '3.4 Menulis untuk menghasilkan sesuatu penulisan secara terancang.',
        standard_pembelajaran:
          '3.4.3 Menulis perenggan isi dan kesimpulan yang kemas menggunakan ejaan yang betul dan bahasa yang tepat.',
        catatan: 'Fokus kepada binaan ayat topik, ayat huraian dan ayat contoh.',
      },
      profil_kelas: {
        bil_murid: '30 orang murid',
        tahap_penguasaan_umum: 'Tahap Penguasaan 3 hingga 4',
        keperluan_khas_umum: '2 orang murid lemah membina ayat majmuk berangkai',
      },
      jadual: {
        tarikh: '2026-11-18',
        masa_mula: '07:40',
        masa_tamat: '08:20',
        tempoh_minit: 40,
      },
      sumber_ada: [
        'Papan putih & pen penanda',
        'Buku teks KPM',
        'Kertas sebak & pen warna',
        'Tiada sambungan internet',
      ],
      templat_rph: 'Templat e-RPH Negeri (Lengkap dengan Peranan Guru & Murid)',
      catatan_guru: 'Masa PdPc agak singkat (40 minit); pastikan pengurusan kumpulan pantas.',
    },
  },
  {
    id: 'holiday-test',
    label: 'Minggu Peperiksaan / Cuti (Ujian Peraturan 2)',
    subtitle: 'Minggu 22 · Minggu Peperiksaan Pertengahan Tahun',
    data: {
      mata_pelajaran: 'Sains',
      tingkatan_tahun: 'Tingkatan 3',
      kurikulum: 'KSSM (DSKP Semakan Terkini)',
      data_rpt_minggu: {
        minggu: 'Minggu 22',
        tema: 'Peperiksaan Pertengahan Tahun',
        standard_kandungan: '',
        standard_pembelajaran: '',
        catatan: 'Minggu peperiksaan sekolah / cuti peristiwa. Tiada pengajaran baharu.',
      },
      profil_kelas: {
        bil_murid: '34 orang murid',
        tahap_penguasaan_umum: 'TP3–TP5',
        keperluan_khas_umum: 'Tiada',
      },
      jadual: {
        tarikh: '2026-11-20',
        masa_mula: '09:00',
        masa_tamat: '10:00',
        tempoh_minit: 60,
      },
      sumber_ada: ['Papan putih & pen penanda'],
      templat_rph: 'Standard KPM / PPD (Objektif, KK, Aktiviti, BBM, EMK, KBAT, Pentaksiran, Pembezaan, Refleksi)',
      catatan_guru: '',
    },
  },
];

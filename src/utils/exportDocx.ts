import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { decodeDataUrlForDocx } from './schoolLogo';
import type {
  RphActivity,
  RphDraftOutput,
  SchoolFormatConfig,
} from '../types/rph';

function phaseLabel(fasa: RphActivity['fasa']): string {
  switch (fasa) {
    case 'set_induksi':
      return 'Set Induksi';
    case 'perkembangan':
      return 'Perkembangan';
    case 'penutup':
      return 'Penutup';
    default:
      return fasa;
  }
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
};

function makeCell(
  children: Paragraph[],
  options?: { widthPct?: number; shading?: string; columnSpan?: number }
): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    columnSpan: options?.columnSpan,
    shading: options?.shading ? { fill: options.shading } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children,
  });
}

function makeTextParagraph(
  text: string,
  options?: { bold?: boolean; size?: number; color?: string; italic?: boolean }
): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        italics: options?.italic ?? false,
        size: options?.size ?? 20, // 10pt
        color: options?.color ?? '0F172A',
        font: 'Calibri',
      }),
    ],
  });
}

function makeLabelValueCell(
  label: string,
  value: string,
  widthPct?: number
): TableCell {
  return makeCell(
    [
      makeTextParagraph(label, { bold: true, size: 18, color: '475569' }),
      makeTextParagraph(value || '—', { size: 20, color: '0F172A' }),
    ],
    { widthPct }
  );
}

export async function exportRphToDocx(params: {
  draft: RphDraftOutput;
  teacherReflection: string;
  schoolFormat?: SchoolFormatConfig;
}): Promise<void> {
  const { draft, teacherReflection, schoolFormat } = params;

  const docChildren: Array<Paragraph | Table> = [];

  const logoDecoded = schoolFormat?.logoSekolah
    ? await decodeDataUrlForDocx(schoolFormat.logoSekolah)
    : null;

  if (logoDecoded) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            data: logoDecoded.data,
            transformation: {
              width: logoDecoded.width,
              height: logoDecoded.height,
            },
            type: logoDecoded.type,
          }),
        ],
      })
    );
  }

  if (schoolFormat?.namaSekolah?.trim()) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: schoolFormat.namaSekolah.trim().toUpperCase(),
            bold: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (
            schoolFormat?.tajukRph?.trim() ||
            'RANCANGAN PENGAJARAN HARIAN (RPH)'
          ).toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: draft.tanda,
          italics: true,
          size: 16,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Maklumat Am Table
  const infoRows: TableRow[] = [
    new TableRow({
      children: [
        makeLabelValueCell('Mata Pelajaran', draft.maklumat.mata_pelajaran, 25),
        makeLabelValueCell('Kelas', draft.maklumat.kelas, 25),
        makeLabelValueCell('Minggu RPT', draft.maklumat.minggu_rpt, 18),
        makeLabelValueCell('Tarikh', draft.maklumat.tarikh, 16),
        makeLabelValueCell('Masa', draft.maklumat.masa, 16),
      ],
    }),
  ];

  if (schoolFormat?.namaGuru?.trim()) {
    infoRows.push(
      new TableRow({
        children: [
          makeCell(
            [
              makeTextParagraph('Nama Guru', {
                bold: true,
                size: 18,
                color: '475569',
              }),
              makeTextParagraph(schoolFormat.namaGuru.trim(), { size: 20 }),
            ],
            { columnSpan: 5 }
          ),
        ],
      })
    );
  }

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows,
    }),
    new Paragraph({ spacing: { after: 140 }, children: [] })
  );

  // Kurikulum & Objektif Table
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell(
              [makeTextParagraph('Tema / Tajuk', { bold: true, size: 20 })],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell([makeTextParagraph(draft.kurikulum.tema || '—')], {
              widthPct: 72,
            }),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Standard Kandungan', {
                  bold: true,
                  size: 20,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              [
                makeTextParagraph(
                  draft.kurikulum.standard_kandungan || '—'
                ),
              ],
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Standard Pembelajaran', {
                  bold: true,
                  size: 20,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              [
                makeTextParagraph(
                  draft.kurikulum.standard_pembelajaran || '—'
                ),
              ],
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Objektif Pembelajaran', {
                  bold: true,
                  size: 20,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              draft.objektif.map((o, idx) =>
                makeTextParagraph(`${idx + 1}. ${o}`)
              ),
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Kriteria Kejayaan', {
                  bold: true,
                  size: 20,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              draft.kriteria_kejayaan.map((k) =>
                makeTextParagraph(`• ${k}`)
              ),
              { widthPct: 72 }
            ),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [] })
  );

  // Aktiviti PdPc Table
  docChildren.push(
    makeTextParagraph(
      `Aktiviti Pengajaran & Pembelajaran (Jumlah Masa: ${draft.jumlah_minit} minit)`,
      { bold: true, size: 22 }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell([makeTextParagraph('Fasa', { bold: true, size: 19 })], {
              widthPct: 14,
              shading: 'F1F5F9',
            }),
            makeCell([makeTextParagraph('Minit', { bold: true, size: 19 })], {
              widthPct: 10,
              shading: 'F1F5F9',
            }),
            makeCell(
              [makeTextParagraph('Huraian Aktiviti', { bold: true, size: 19 })],
              { widthPct: 28, shading: 'F1F5F9' }
            ),
            makeCell(
              [makeTextParagraph('Peranan Guru', { bold: true, size: 19 })],
              { widthPct: 24, shading: 'F1F5F9' }
            ),
            makeCell(
              [makeTextParagraph('Peranan Murid', { bold: true, size: 19 })],
              { widthPct: 24, shading: 'F1F5F9' }
            ),
          ],
        }),
        ...draft.aktiviti.map(
          (act) =>
            new TableRow({
              children: [
                makeCell(
                  [makeTextParagraph(phaseLabel(act.fasa), { bold: true })],
                  { widthPct: 14 }
                ),
                makeCell([makeTextParagraph(`${act.minit} min`)], {
                  widthPct: 10,
                }),
                makeCell([makeTextParagraph(act.huraian)], { widthPct: 28 }),
                makeCell([makeTextParagraph(act.peranan_guru)], {
                  widthPct: 24,
                }),
                makeCell([makeTextParagraph(act.peranan_murid)], {
                  widthPct: 24,
                }),
              ],
            })
        ),
      ],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [] })
  );

  // BBM, EMK, KBAT, PBD, Pembezaan, Refleksi
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell(
              [makeTextParagraph('Bahan Bantu Mengajar (BBM)', { bold: true })],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell([makeTextParagraph(draft.bbm.join(', ') || '—')], {
              widthPct: 72,
            }),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Elemen Merentas Kurikulum (EMK)', {
                  bold: true,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell([makeTextParagraph(draft.emk.join(', ') || '—')], {
              widthPct: 72,
            }),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph(
                  `KBAT (${draft.kbat.aras_bloom || 'Menganalisis'})`,
                  { bold: true }
                ),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              [makeTextParagraph(draft.kbat.soalan_atau_tugasan || '—')],
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph(
                  `Pentaksiran Bilik Darjah (PBD · ${draft.pentaksiran.jenis.toUpperCase()})`,
                  { bold: true }
                ),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              [
                makeTextParagraph(
                  `Kaedah: ${draft.pentaksiran.kaedah}`,
                  { bold: true }
                ),
                makeTextParagraph(draft.pentaksiran.soalan_atau_tugasan),
                makeTextParagraph(
                  `Rubrik / Tahap Penguasaan: ${draft.pentaksiran.rubrik_ringkas}`
                ),
              ],
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell([makeTextParagraph('Pembezaan PdPc', { bold: true })], {
              widthPct: 28,
              shading: 'F8FAFC',
            }),
            makeCell(
              [
                makeTextParagraph(`Pemulihan: ${draft.pembezaan.pemulihan}`),
                makeTextParagraph(`Pengayaan: ${draft.pembezaan.pengayaan}`),
              ],
              { widthPct: 72 }
            ),
          ],
        }),
        new TableRow({
          children: [
            makeCell(
              [
                makeTextParagraph('Refleksi Guru (Selepas PdPc)', {
                  bold: true,
                }),
              ],
              { widthPct: 28, shading: 'F8FAFC' }
            ),
            makeCell(
              [
                makeTextParagraph(
                  teacherReflection.trim() ||
                    '________________________________________________________________________\n________________________________________________________________________'
                ),
              ],
              { widthPct: 72 }
            ),
          ],
        }),
      ],
    })
  );

  if (schoolFormat?.sertakanTandatanganPk) {
    docChildren.push(
      new Paragraph({ spacing: { after: 240 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              makeCell(
                [
                  makeTextParagraph('Disediakan oleh:', {
                    bold: true,
                    size: 18,
                  }),
                  makeTextParagraph('\n\n____________________________'),
                  makeTextParagraph(
                    schoolFormat.namaGuru?.trim() || 'Guru Mata Pelajaran',
                    { size: 19 }
                  ),
                ],
                { widthPct: 50 }
              ),
              makeCell(
                [
                  makeTextParagraph('Disemak oleh (PK / GPK):', {
                    bold: true,
                    size: 18,
                  }),
                  makeTextParagraph('\n\n____________________________'),
                  makeTextParagraph('Tandatangan & Tarikh Semakan', {
                    size: 19,
                  }),
                ],
                { widthPct: 50 }
              ),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 650, bottom: 650, left: 700, right: 700 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSubject = (draft.maklumat.mata_pelajaran || 'RPH')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 30);
  const safeDate = draft.maklumat.tarikh || 'draf';
  a.href = url;
  a.download = `RPH_${safeSubject}_${safeDate}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

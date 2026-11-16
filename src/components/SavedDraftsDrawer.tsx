import React from 'react';
import { Trash2, X } from 'lucide-react';
import type { SavedRphEntry } from '../types/rph';

interface SavedDraftsDrawerProps {
  open: boolean;
  onClose: () => void;
  entries: SavedRphEntry[];
  onLoadEntry: (entry: SavedRphEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export const SavedDraftsDrawer: React.FC<SavedDraftsDrawerProps> = ({
  open,
  onClose,
  entries,
  onLoadEntry,
  onDeleteEntry,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-drafts-title"
    >
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2
              id="saved-drafts-title"
              className="text-base font-bold text-slate-900"
            >
              Arkib Draf RPH
            </h2>
            <p className="text-xs text-slate-500">
              Disimpan secara setempat dalam pelayar anda
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup arkib"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {entries.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900">
                Belum ada draf disimpan
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selepas menjana draf RPH, klik butang &ldquo;Simpan&rdquo; untuk
                menyimpannya di sini bagi semakan atau cetakan semula.
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    onLoadEntry(entry);
                    onClose();
                  }}
                  className="text-left flex-1 space-y-1"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {entry.draft.maklumat.mata_pelajaran} ·{' '}
                    {entry.draft.maklumat.kelas}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-1">
                    {entry.draft.kurikulum.tema}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {entry.draft.maklumat.minggu_rpt} ·{' '}
                    {entry.draft.maklumat.tarikh} · {entry.draft.jumlah_minit}{' '}
                    minit
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label="Padam draf"
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

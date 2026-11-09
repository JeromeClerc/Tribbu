import React, { useState } from 'react';
import { Download, ExternalLink, FileText, Maximize2, X } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { MessageAttachment } from '@/types/tribbu.types';

interface AttachmentsProps {
  attachments: MessageAttachment[];
}

export const Attachments: React.FC<AttachmentsProps> = ({ attachments }) => {
  const [lightboxImage, setLightboxImage] =
    useState<MessageAttachment | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {attachments.map((att) => {
          if (att.type === 'image') {
            return (
              <div
                key={att.id}
                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-tribbu-charcoal-border bg-slate-100 dark:bg-tribbu-charcoal-deep max-w-xs cursor-pointer"
                onClick={() => setLightboxImage(att)}
              >
                <img
                  src={att.url}
                  alt={att.name}
                  className="max-h-52 w-auto object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-black/60 text-white transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="px-2.5 py-1 bg-white/90 dark:bg-tribbu-charcoal/90 text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{att.name}</span>
                  <span className="text-slate-400 shrink-0">
                    {formatFileSize(att.size)}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <a
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              download={att.name}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border bg-slate-50 dark:bg-tribbu-charcoal-deep hover:border-tribbu-teal transition-colors max-w-sm group"
            >
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-tribbu-teal">
                  {att.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Document PDF • {formatFileSize(att.size)}
                </p>
              </div>
              <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-tribbu-teal shrink-0">
                {att.url.startsWith('data:') ? (
                  <Download className="w-4 h-4" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Lightbox Image Plein Écran */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-h-[82vh] w-auto rounded-xl shadow-2xl border border-white/10"
            />
            <div className="mt-2 text-xs text-slate-300 font-medium">
              {lightboxImage.name} ({formatFileSize(lightboxImage.size)})
            </div>
          </div>
        </div>
      )}
    </>
  );
};


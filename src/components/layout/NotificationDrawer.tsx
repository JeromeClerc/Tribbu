import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Flame,
  Hash,
  Megaphone,
  Phone,
  Sparkles,
  Tent,
  X,
} from 'lucide-react';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatRelativeTimeFr,
  getCanalTypeLabelFr,
} from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import type { CanalMutationSummary, CanalType } from '@/types/tribbu.types';

interface NotificationDrawerProps {
  mutatedCanaux: CanalMutationSummary[];
  onMarkAllRead: () => Promise<void>;
}

function getCanalIcon(type: CanalType) {
  switch (type) {
    case 'GRANDE_TRIBBU_ANNONCES':
    case 'TRIBBU_ANNONCES':
      return <Megaphone className="w-4 h-4 text-tribbu-green" />;
    case 'TIPPI':
      return <Tent className="w-4 h-4 text-tribbu-purple" />;
    case 'FEU_DE_CAMP':
      return <Flame className="w-4 h-4 text-amber-500" />;
    default:
      return <Hash className="w-4 h-4 text-tribbu-teal" />;
  }
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  mutatedCanaux,
  onMarkAllRead,
}) => {
  const {
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    openCanalTab,
  } = useUIStore();
  const { user, updatePreferences } = useAuth();

  const [phoneInput, setPhoneInput] = useState(user?.phone_number || '');
  const [smsEnabled, setSmsEnabled] = useState(
    Boolean(user?.sms_notifications_enabled)
  );
  const [savedNotice, setSavedNotice] = useState(false);

  if (!notificationDrawerOpen) return null;

  const smsLogs = notificationService.getRecentSmsLogs();

  const handleSavePhoneSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePreferences({
      phone_number: phoneInput.trim() || null,
      sms_notifications_enabled: smsEnabled,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-tribbu-charcoal h-full shadow-2xl border-l border-slate-200 dark:border-tribbu-charcoal-border flex flex-col"
        role="dialog"
        aria-label="Centre de notifications"
      >
        {/* En-tête du tiroir */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-tribbu-charcoal-border flex items-center justify-between bg-slate-50/70 dark:bg-tribbu-charcoal-deep/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-tribbu-green/15 text-tribbu-green">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Activité & Mutations récentes
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Depuis votre dernière connexion (
                {user ? formatRelativeTimeFr(user.last_seen_at) : 'session'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {mutatedCanaux.length > 0 && (
              <button
                type="button"
                onClick={() => void onMarkAllRead()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-tribbu-teal hover:bg-tribbu-teal/10 transition-colors"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tout lire</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-tribbu-charcoal-surface"
              aria-label="Fermer les notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Liste des canaux ayant subi une mutation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2.5">
              Conversations modifiées ({mutatedCanaux.length})
            </h3>

            {mutatedCanaux.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-tribbu-charcoal-border text-center">
                <Sparkles className="w-8 h-8 text-tribbu-green mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Vous êtes à jour !
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Aucune nouvelle mutation dans vos Tribbus, Tippis ou Feux de camp
                  depuis votre dernière visite.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {mutatedCanaux.map((item) => (
                  <button
                    key={item.canal.id}
                    type="button"
                    onClick={() => {
                      openCanalTab({
                        canalId: item.canal.id,
                        title: item.canal.name,
                        type: item.canal.type,
                        parentLabel:
                          item.parentTribbuName ||
                          getCanalTypeLabelFr(item.canal.type),
                      });
                      setNotificationDrawerOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 dark:border-tribbu-charcoal-border bg-slate-50/50 dark:bg-tribbu-charcoal-surface/50 hover:border-tribbu-teal dark:hover:border-tribbu-teal transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getCanalIcon(item.canal.type)}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-tribbu-teal">
                          {item.canal.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-tribbu-green" />
                        {item.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-tribbu-teal text-white text-[10px] font-bold">
                            {item.unreadCount} non-lu
                            {item.unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.parentTribbuName && (
                      <span className="inline-block mt-1 text-[10px] font-medium text-tribbu-teal">
                        {item.parentTribbuName}
                      </span>
                    )}

                    {item.lastMessagePreview && (
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.lastMessageAuthor && (
                          <strong className="font-semibold text-slate-800 dark:text-white">
                            {item.lastMessageAuthor} :{' '}
                          </strong>
                        )}
                        {item.lastMessagePreview}
                      </p>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400">
                      Dernière activité :{' '}
                      {formatRelativeTimeFr(item.lastMessageAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration des alertes SMS sur téléphone mobile */}
          <div className="pt-4 border-t border-slate-200 dark:border-tribbu-charcoal-border">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-tribbu-teal" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Notifications Mobile (Numéro de téléphone)
              </h3>
            </div>

            <form
              onSubmit={(e) => void handleSavePhoneSettings(e)}
              className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Numéro de téléphone mobile (SMS / Push)
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                />
              </div>

              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Recevoir les annonces urgentes par SMS
                </span>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-tribbu-green rounded"
                />
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-tribbu-teal text-white text-xs font-semibold hover:bg-tribbu-teal-dark transition-colors"
                >
                  Enregistrer le numéro
                </button>
                {savedNotice && (
                  <span className="text-xs font-medium text-tribbu-green">
                    ✓ Préférences enregistrées
                  </span>
                )}
              </div>
            </form>

            {smsLogs.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  Derniers envois passerelle SMS :
                </span>
                {smsLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-tribbu-charcoal-deep/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-tribbu-charcoal-border"
                  >
                    <div className="font-semibold text-slate-700 dark:text-slate-200">
                      📱 {log.recipientPhone} • {log.canalName}
                    </div>
                    <div className="truncate">{log.preview}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


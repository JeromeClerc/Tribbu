import React, { useEffect, useState } from 'react';
import { Shield, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { RoleBadge } from '@/components/common/Badge';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import type {
  MembreRole,
  Profile,
  Tribbu,
  TribbuRole,
} from '@/types/tribbu.types';

interface RoleManagerProps {
  tribbus: Tribbu[];
  profiles: Profile[];
  membresRoles: MembreRole[];
  onUpdateRole: (params: {
    roleRecordId: string;
    role: TribbuRole;
    status?: 'ACTIVE' | 'REJECTED';
  }) => Promise<void>;
  onAssignMember: (params: {
    userId: string;
    tribbuId: string;
    role: TribbuRole;
    assignedBy: string;
  }) => Promise<void>;
}

export const RoleManager: React.FC<RoleManagerProps> = ({
  tribbus,
  profiles,
  membresRoles,
  onUpdateRole,
  onAssignMember,
}) => {
  const { activeModal, closeModal, openModal } = useUIStore();
  const { user, globalRole } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState(profiles[0]?.id || '');
  const [selectedTribbuId, setSelectedTribbuId] = useState(
    tribbus[0]?.id || ''
  );
  const [selectedRole, setSelectedRole] = useState<TribbuRole>('PYGMEE');

  const isOpen = activeModal === 'role-manager';
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const tribbuMap = new Map(tribbus.map((t) => [t.id, t]));

  useEffect(() => {
    if (!selectedUserId && profiles[0]?.id) {
      setSelectedUserId(profiles[0].id);
    }
    if (
      (!selectedTribbuId || !tribbus.some((t) => t.id === selectedTribbuId)) &&
      tribbus[0]?.id
    ) {
      setSelectedTribbuId(tribbus[0].id);
    }
  }, [profiles, tribbus, selectedUserId, selectedTribbuId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUserId || !selectedTribbuId) return;
    await onAssignMember({
      userId: selectedUserId,
      tribbuId: selectedTribbuId,
      role: selectedRole,
      assignedBy: user.id,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Gestion des Rôles & Affiliations Tribbu"
      subtitle="Hiérarchie : Grand Manitou (global) • Chef(fe) de Tribbu • Pygmée (membre)."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Formulaire d'affiliation rapide d'un membre à une Tribbu */}
        <form
          onSubmit={(e) => void handleAssign(e)}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
            <UserPlus className="w-4 h-4 text-tribbu-teal" />
            <span>Affilier un membre existant à une Tribbu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>

            <select
              value={selectedTribbuId}
              onChange={(e) => setSelectedTribbuId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white"
            >
              {tribbus.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as TribbuRole)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white"
              >
                <option value="PYGMEE">Pygmée</option>
                <option value="CHEF">Chef(fe)</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-tribbu-teal text-white text-xs font-semibold hover:bg-tribbu-teal-dark shrink-0"
              >
                Ajouter
              </button>
            </div>
          </div>
        </form>

        {/* Liste des rôles et invitations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-tribbu-purple" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Membres affiliés & Invitations ({membresRoles.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {membresRoles.map((mr) => {
              const prof = mr.user_id ? profileMap.get(mr.user_id) : undefined;
              const tribbu = mr.tribbu_id
                ? tribbuMap.get(mr.tribbu_id)
                : undefined;

              return (
                <div
                  key={mr.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border bg-white dark:bg-tribbu-charcoal-surface/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={
                        prof?.display_name || mr.invited_email || 'Invité'
                      }
                      role={mr.role}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {prof?.display_name || mr.invited_email}
                        </span>
                        <RoleBadge role={mr.role} size="xs" />
                        {mr.tribbu_id === null && mr.role !== 'MANITOU' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Sans Tribbu (en attente d'assignation)
                          </span>
                        )}
                        {mr.status === 'INVITED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500">
                            Invitation en attente
                          </span>
                        )}
                        {mr.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-500">
                            Rejeté
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Périmètre :{' '}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {tribbu
                            ? tribbu.name
                            : mr.role === 'MANITOU'
                              ? 'Grande Tribbu (Global)'
                              : 'Sans Tribbu — Accès Annonces Officielles & Agora Générale'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {mr.role !== 'MANITOU' && (
                    <div className="flex items-center gap-2">
                      {mr.tribbu_id === null &&
                        mr.user_id &&
                        tribbus.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserId(mr.user_id!);
                              if (!selectedTribbuId && tribbus[0]?.id) {
                                setSelectedTribbuId(tribbus[0].id);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-tribbu-teal/15 text-tribbu-teal hover:bg-tribbu-teal/25 transition-colors"
                            title="Sélectionner ce membre pour l'assigner à une Tribbu"
                          >
                            Assigner à une Tribbu
                          </button>
                        )}
                      <select
                        value={mr.role}
                        onChange={(e) =>
                          void onUpdateRole({
                            roleRecordId: mr.id,
                            role: e.target.value as TribbuRole,
                          })
                        }
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border text-slate-800 dark:text-white"
                        aria-label="Modifier le rôle"
                      >
                        <option value="PYGMEE">Pygmée</option>
                        <option value="CHEF">Chef(fe)</option>
                        {globalRole === 'MANITOU' && (
                          <option value="MANITOU">Grand Manitou</option>
                        )}
                      </select>

                      {mr.status === 'REJECTED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateRole({
                              roleRecordId: mr.id,
                              role: mr.role,
                              status: 'ACTIVE',
                            })
                          }
                          className="p-1.5 rounded-lg text-tribbu-green hover:bg-tribbu-green/15"
                          title="Réactiver ce membre"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateRole({
                              roleRecordId: mr.id,
                              role: mr.role,
                              status: 'REJECTED',
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          title="Révoquer / Rejeter l'affiliation"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Grand Manitou : Administration & Suppression sécurisée d'une Tribbu */}
        {globalRole === 'MANITOU' && tribbus.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-tribbu-charcoal-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Administration des Tribbus (Grand Manitou)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tribbus.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border bg-slate-50/70 dark:bg-tribbu-charcoal-deep/60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {t.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModal('delete-tribbu', t.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors shrink-0"
                    title={`Supprimer la Tribbu « ${t.name} »`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer...</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};


import React, { useState } from 'react';
import { Shield, UserCheck, UserPlus, UserX } from 'lucide-react';
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
  const { activeModal, closeModal } = useUIStore();
  const { user, globalRole } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState(profiles[0]?.id || '');
  const [selectedTribbuId, setSelectedTribbuId] = useState(
    tribbus[0]?.id || ''
  );
  const [selectedRole, setSelectedRole] = useState<TribbuRole>('PYGMEE');

  const isOpen = activeModal === 'role-manager';
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const tribbuMap = new Map(tribbus.map((t) => [t.id, t]));

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
                          {tribbu ? tribbu.name : 'Grande Tribbu (Global)'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {mr.role !== 'MANITOU' && (
                    <div className="flex items-center gap-2">
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
      </div>
    </Modal>
  );
};


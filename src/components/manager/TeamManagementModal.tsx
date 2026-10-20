import React, { useState } from 'react';
import { MechanicTeam, User } from '../../types';
import { StorageService } from '../../services/storage';
import { X, Plus, Trash2, Edit2, Users, Check, Phone } from 'lucide-react';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: MechanicTeam[];
  allUsers: User[];
  onTeamsUpdated: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  teams,
  onTeamsUpdated,
}) => {
  const [editingTeam, setEditingTeam] = useState<MechanicTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [leadMechanicName, setLeadMechanicName] = useState('');
  const [leadMechanicPhone, setLeadMechanicPhone] = useState('');
  const [memberNames, setMemberNames] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!isOpen) return null;

  const startCreateNew = () => {
    setIsCreatingNew(true);
    setEditingTeam(null);
    setTeamName('');
    setLeadMechanicName('');
    setLeadMechanicPhone('+251 911 ');
    setMemberNames('');
  };

  const startEdit = (team: MechanicTeam) => {
    setIsCreatingNew(false);
    setEditingTeam(team);
    setTeamName(team.name);
    setLeadMechanicName(team.leadMechanicName);
    setLeadMechanicPhone(team.leadMechanicPhone);
    setMemberNames((team.memberNames || []).join(', '));
  };

  const handleSaveTeam = () => {
    if (!teamName.trim() || !leadMechanicName.trim() || !leadMechanicPhone.trim()) {
      alert('Please enter team name, lead mechanic name, and mobile phone for SMS dispatch.');
      return;
    }

    const members = memberNames
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (isCreatingNew) {
      const newTeam: MechanicTeam = {
        id: `team-${Date.now()}`,
        name: teamName.trim(),
        leadMechanicName: leadMechanicName.trim(),
        leadMechanicPhone: leadMechanicPhone.trim(),
        memberNames: members.length > 0 ? members : [leadMechanicName.trim()],
        activeJobIds: [],
      };
      StorageService.saveTeams([...teams, newTeam]);
    } else if (editingTeam) {
      const updated = teams.map((t) =>
        t.id === editingTeam.id
          ? {
              ...t,
              name: teamName.trim(),
              leadMechanicName: leadMechanicName.trim(),
              leadMechanicPhone: leadMechanicPhone.trim(),
              memberNames: members.length > 0 ? members : [leadMechanicName.trim()],
            }
          : t
      );
      StorageService.saveTeams(updated);
    }

    onTeamsUpdated();
    setIsCreatingNew(false);
    setEditingTeam(null);
  };

  const handleDeleteTeam = (id: string) => {
    if (confirm('Are you sure you want to delete this mechanic team?')) {
      const updated = teams.filter((t) => t.id !== id);
      StorageService.saveTeams(updated);
      onTeamsUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-line">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sand/40 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#800020]" />
            <h2 className="text-base font-bold text-ink">
              Mechanic Teams & SMS Dispatch Directory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted/70 hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* List of existing teams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">
                Workshop Mechanic Teams ({teams.length})
              </span>
              {!isCreatingNew && !editingTeam && (
                <button
                  type="button"
                  onClick={startCreateNew}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Team</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-3.5 bg-sand/40 rounded-xl border border-line flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-ink text-sm">{team.name}</h4>
                    <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-2">
                      <span>Lead: <strong className="text-ink">{team.leadMechanicName}</strong></span>
                      <span className="text-line">·</span>
                      <span className="flex items-center gap-1 font-mono text-ink">
                        <Phone className="w-3 h-3 text-[#800020]" />
                        <span>{team.leadMechanicPhone}</span>
                      </span>
                    </p>
                    <p className="text-[10px] text-ink-muted/70 mt-0.5">
                      Members: {team.memberNames.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(team)}
                      className="p-1.5 text-ink-muted hover:text-ink hover:bg-sand/60 rounded-md transition"
                      title="Edit team"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {teams.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 text-ink-muted/70 hover:text-coral hover:bg-coral/10 rounded-md transition"
                        title="Delete team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form when creating or editing */}
          {(isCreatingNew || editingTeam) && (
            <div className="p-4 bg-coral/10 border border-coral/30 rounded-xl space-y-3 mt-4">
              <div className="flex items-center justify-between border-b border-coral/30 pb-2">
                <span className="font-bold text-ink">
                  {isCreatingNew ? 'Create New Mechanic Team' : `Edit: ${editingTeam?.name}`}
                </span>
                <button
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingTeam(null);
                  }}
                  className="text-ink-muted/70 hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">
                  Team Display Name (e.g. Team C — Mechanic Dawit)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team Name"
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink mb-1">
                    Lead Mechanic Name
                  </label>
                  <input
                    type="text"
                    value={leadMechanicName}
                    onChange={(e) => setLeadMechanicName(e.target.value)}
                    placeholder="e.g. Mechanic Sami"
                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">
                    Mobile Phone (For SMS Task Dispatch)
                  </label>
                  <input
                    type="text"
                    value={leadMechanicPhone}
                    onChange={(e) => setLeadMechanicPhone(e.target.value)}
                    placeholder="+251 911 000 000"
                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">
                  Additional Team Member Names (Comma separated)
                </label>
                <input
                  type="text"
                  value={memberNames}
                  onChange={(e) => setMemberNames(e.target.value)}
                  placeholder="e.g. Yeabsira Mekbeb, Dawit Solomon"
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingTeam(null);
                  }}
                  className="px-3 py-2 text-ink-muted hover:bg-sand/50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeam}
                  className="px-4 py-2 font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg shadow-xs cursor-pointer"
                >
                  Save Team
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-line bg-sand/40 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/50 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

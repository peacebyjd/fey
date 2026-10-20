import React, { useState, useEffect } from 'react';
import {
  JOB_STATUSES,
  JobRecord,
  JobStatus,
  MechanicTeam,
  Priority,
  User,
} from '../../types';
import { StorageService } from '../../services/storage';
import { buildJobHandoverMessage, getFixItems } from '../reception/jobCardCheckpoints';
import {
  X,
  Check,
  Calendar,
  AlertCircle,
  Send,
  Smartphone,
  Phone,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface JobAssignmentModalProps {
  job: JobRecord;
  isOpen: boolean;
  onClose: () => void;
  teams: MechanicTeam[];
  currentUser: User;
  onJobUpdated: (job: JobRecord) => void;
  initialTeamId?: string | null;
}

const PRESET_WARNING_NOTES = [
  '⚠️ Customer waiting on-site at garage',
  '⚠️ High torque spec — check wheel nut torque',
  '⚠️ Genuine OEM parts only requested by client',
  '⚠️ Road test & brake test before final handover',
  '⚠️ Handle engine wiring harness with extra care',
  '⚠️ Replaced parts must be kept for customer inspection',
];

export const JobAssignmentModal: React.FC<JobAssignmentModalProps> = ({
  job,
  isOpen,
  onClose,
  teams,
  currentUser,
  onJobUpdated,
  initialTeamId,
}) => {
  const settings = StorageService.getSettings();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialTeamId !== undefined && initialTeamId !== null
      ? initialTeamId
      : job.assignedTeamId || (teams[0]?.id ?? '')
  );
  const [priority, setPriority] = useState<Priority>(job.priority || 'Medium');
  const [status, setStatus] = useState<JobStatus>(
    job.status === 'Received' || job.status === 'Awaiting Inspection' ? 'In Progress' : job.status
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState<string>(
    job.targetCompletionDate || job.expectedDeliveryDate || new Date().toISOString().substring(0, 10)
  );
  const [dispatchSms, setDispatchSms] = useState(true);
  const [customSmsWarning, setCustomSmsWarning] = useState(job.managerWarningNote || '');
  const [managerAgreed, setManagerAgreed] = useState(true);

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId);
    }
  }, [initialTeamId]);

  if (!isOpen) return null;

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const effectivePrice = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
  const canAssign = effectivePrice > 0;

  const requirements = (job.priceItems || []).filter((i) => i.name.trim());
  const fixItems = getFixItems(job.conditionChecklist);

  // Real-time live SMS preview — only the essentials: job/plate header,
  // description, remark and the items that actually need fixing.
  const smsPreview = selectedTeam
    ? [
        buildJobHandoverMessage(job),
        customSmsWarning.trim() ? `Manager note: ${customSmsWarning.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const handleSave = () => {
    if (!canAssign) return;
    const teamChanged = (job.assignedTeamId || '') !== selectedTeamId;
    const statusChanged = job.status !== status;
    const priorityChanged = job.priority !== priority;

    let updatedJob: JobRecord = {
      ...job,
      assignedTeamId: selectedTeam ? selectedTeam.id : null,
      assignedTeamName: selectedTeam ? selectedTeam.name : null,
      assignedMechanicName: selectedTeam ? selectedTeam.leadMechanicName : null,
      assignedMechanicPhone: selectedTeam ? selectedTeam.leadMechanicPhone : null,
      priority,
      status: selectedTeam && (job.status === 'Received' || job.status === 'Ready to Start') ? 'In Progress' : status,
      targetCompletionDate,
      managerWarningNote: customSmsWarning.trim() || undefined,
      assignedBy: `${currentUser.name} (${currentUser.role})`,
      assignedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      auditTrail: [
        {
          id: `audit-${Date.now()}-assignment`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Manager Reviewed & Assigned Team',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: selectedTeam
            ? `Manager approved scope & price (${effectivePrice.toLocaleString()} ${settings.currency}) and assigned to ${selectedTeam.name} (${selectedTeam.leadMechanicPhone}). SMS warning: "${customSmsWarning || 'None'}"`
            : 'Job moved to unassigned pool',
          type: 'assignment' as const,
        },
        ...(job.auditTrail || []),
      ],
    };

    StorageService.saveJob(updatedJob);

    // If SMS dispatch is checked and team is assigned, dispatch direct task SMS to mechanic's phone
    if (dispatchSms && selectedTeam) {
      StorageService.dispatchTaskSms(
        job.id,
        selectedTeam.leadMechanicName,
        selectedTeam.leadMechanicPhone,
        currentUser.name,
        smsPreview
      );
      const reloaded = StorageService.getJobById(job.id);
      if (reloaded) updatedJob = reloaded;
    }

    onJobUpdated(updatedJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border border-line">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sand/40 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-[#800020] text-white font-bold">
                {job.jobNumber}
              </span>
              <h2 className="text-base font-bold text-ink">
                Manager Review, Assignment & SMS Dispatch
              </h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Review vehicle details, set mechanic warning, and dispatch SMS to team
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted/70 hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* SECTION 1: Manager Review Card (Price, Vehicle, Scope) */}
          <div className="p-3.5 bg-sand/40 rounded-xl border border-line space-y-2.5">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">Vehicle Details</span>
                <p className="font-mono font-bold text-sm text-ink">
                  {job.plateNumber} · {job.vehicleMake} {job.vehicleModel}
                </p>
                <p className="text-[11px] text-ink-muted">
                  Customer: <strong className="text-ink">{job.customerName}</strong> ({job.customerPhone})
                </p>
              </div>

              {/* Set Price from Finance */}
              <div className="text-right">
                <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">Set Price (From Finance)</span>
                <p className="font-mono font-bold text-base text-[#800020]">
                  {effectivePrice > 0 ? `${effectivePrice.toLocaleString()} ${settings.currency}` : 'Pending Pricing'}
                </p>
                <p className="text-[10px] text-ink-muted">
                  Labor: {job.laborCost.toLocaleString()} | Parts: {job.sparePartsCost.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Description & Remark (only the essentials) */}
            <div>
              <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">Description:</span>
              <p className="text-ink font-medium mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-line">
                {job.repairDescription || job.customerProblem || 'General workshop inspection and repair'}
              </p>
            </div>

            {(job.remarks || job.initialInspectionNotes) && (
              <div>
                <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">Remark:</span>
                <p className="text-ink font-medium mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-line">
                  {job.remarks || job.initialInspectionNotes}
                </p>
              </div>
            )}

            <div>
              <span className="text-[10px] text-ink-muted/70 uppercase font-semibold">
                Repair / Replace Requirements ({requirements.length || fixItems.length}):
              </span>
              {requirements.length > 0 ? (
                <div className="mt-1 border border-line rounded-lg divide-y divide-line overflow-hidden bg-white">
                  {requirements.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.action === 'Replace'
                              ? 'bg-brand/10 text-brand border border-brand/30'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.action || 'Repair'}
                        </span>
                        <span className="text-[11px] font-semibold text-ink truncate">{item.name}</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-ink shrink-0">
                        {item.amount > 0
                          ? `${item.amount.toLocaleString()} ${settings.currency}`
                          : 'Not priced'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : fixItems.length > 0 ? (
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {fixItems.map((f) => (
                    <span
                      key={f.item}
                      className="px-2 py-1 bg-coral/10 border border-coral/30 text-brand rounded-md text-[10px] font-semibold"
                    >
                      {f.item} · {f.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted mt-0.5">None flagged — general inspection only.</p>
              )}
            </div>
          </div>

          {!canAssign && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-amber-900 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Finance has not set a price yet. Assignment is locked until the price is saved.</span>
            </div>
          )}

          {/* SECTION 2: Assign Team Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-ink">
              Assign to Mechanic Team
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teams.map((t) => {
                const isSelected = selectedTeamId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeamId(t.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-coral/10 border-[#800020] ring-1 ring-[#800020]'
                        : 'bg-white border-line hover:border-line hover:bg-sand/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">{t.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#800020]" />}
                    </div>
                    <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink-muted">
                      <Phone className="w-3 h-3 text-[#800020]" />
                      <span>{t.leadMechanicName} ({t.leadMechanicPhone})</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Priority & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">Repair Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs font-semibold"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent / Rush Job</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Target Completion Date</label>
              <input
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-line rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* SECTION 4: Manager Warning & Custom Note for SMS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-ink flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Manager Custom Warning / Note (Included in SMS)</span>
              </label>
              <span className="text-[10px] text-ink-muted/70">Sent directly to mechanic mobile</span>
            </div>

            <input
              type="text"
              value={customSmsWarning}
              onChange={(e) => setCustomSmsWarning(e.target.value)}
              placeholder="e.g. Warning: Customer waiting; verify brake fluid level & torque specs."
              className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#800020] focus:outline-none"
            />

            {/* Quick Warning Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PRESET_WARNING_NOTES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomSmsWarning(preset)}
                  className="px-2 py-1 bg-sand/50 hover:bg-sand text-ink rounded-md text-[10px] font-medium transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 5: Real-time Live SMS Preview */}
          {selectedTeam && (
            <div className="p-3 bg-brand text-white rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-sand/80 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Outgoing SMS to: {selectedTeam.leadMechanicPhone}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready to Dispatch</span>
              </div>
              <p className="font-mono text-[11px] text-sand/80 leading-relaxed bg-ink p-2.5 rounded-lg border border-line whitespace-pre-line">
                {smsPreview}
              </p>
            </div>
          )}

          {/* Manager Agreement Check */}
          <div className="p-3 bg-coral/10 rounded-xl border border-coral/30 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="mgrAgree"
              checked={managerAgreed}
              onChange={(e) => setManagerAgreed(e.target.checked)}
              className="rounded text-[#800020] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="mgrAgree" className="text-xs text-ink font-semibold cursor-pointer">
              I agree with the repair pricing, scope, and team placement for this vehicle.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-line flex items-center justify-end gap-2.5 bg-sand/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-ink hover:bg-sand rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!managerAgreed || !selectedTeamId || !canAssign}
            onClick={handleSave}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#800020] hover:bg-[#600018] disabled:bg-line disabled:cursor-not-allowed rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{canAssign ? 'Agree & Dispatch SMS to Mechanic' : 'Waiting for Finance Price'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ItemAction, JobRecord, PriceItem, User, VehiclePhoto } from '../../types';
import { StorageService } from '../../services/storage';
import { CameraCapture } from '../common/CameraCapture';
import {
  JOB_CARD_SECTIONS,
  JOB_CARD_TABS,
  CONDITION_LEGEND,
  ALL_LEGEND_CODES,
  ConditionCode,
  buildJobHandoverMessage,
} from './jobCardCheckpoints';
import { CompactSignaturePad } from '../common/CompactSignaturePad';
import {
  X,
  Check,
  Save,
  FileText,
  AlertCircle,
  Printer,
  Sparkles,
  Camera,
  CheckCheck,
  RotateCcw,
  Pen,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react';

interface VehicleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  editingJob?: JobRecord | null;
  onJobSaved: (job: JobRecord) => void;
}

export const VehicleRegistrationModal: React.FC<VehicleRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editingJob,
  onJobSaved,
}) => {
  const isEditing = !!editingJob;

  // Header & Number
  const [jobNumber] = useState<string>(
    editingJob ? editingJob.jobNumber : StorageService.getNextJobNumber()
  );

  // TOP METADATA FIELDS (From Physical Job Card)
  const [customerName, setCustomerName] = useState(editingJob?.customerName || '');
  const [receivedAt, setReceivedAt] = useState(
    editingJob?.receivedAt || new Date().toISOString().replace('T', ' ').substring(0, 16)
  );
  const [vehicleMake, setVehicleMake] = useState(editingJob?.vehicleMake || 'Toyota');
  const [vehicleModel, setVehicleModel] = useState(editingJob?.vehicleModel || '');
  const [vehicleType, setVehicleType] = useState(editingJob?.vehicleType || 'SUV / 4WD');
  const [customerPhone, setCustomerPhone] = useState(editingJob?.customerPhone || '');
  const [vin, setVin] = useState(editingJob?.vin || '');
  const [plateNumber, setPlateNumber] = useState(editingJob?.plateNumber || '');
  const [engineNo, setEngineNo] = useState(editingJob?.engineNo || '');
  const [privatePaint, setPrivatePaint] = useState(editingJob?.privatePaint || '');
  const [privateMechanic, setPrivateMechanic] = useState(editingJob?.privateMechanic || '');
  const [mileage, setMileage] = useState<string>(
    editingJob?.mileage ? editingJob.mileage.toString() : ''
  );
  const [hasInsurance, setHasInsurance] = useState(editingJob?.hasInsurance || false);
  const [insuranceCompany, setInsuranceCompany] = useState(editingJob?.insuranceCompany || '');
  const [claimNumber, setClaimNumber] = useState(editingJob?.claimNumber || '');

  // CONDITION OF VEHICLE CHECKLIST MAP (item name -> code '✓' | 'D' | 'X' | 'S' | 'B' | 'C' | 'd' | 'b')
  const [conditionChecklist, setConditionChecklist] = useState<Record<string, string>>(
    editingJob?.conditionChecklist || {}
  );

  // DESCRIPTION & REMARKS
  const [customerProblem, setCustomerProblem] = useState(
    editingJob?.customerProblem || editingJob?.repairDescription || ''
  );
  const [remarks, setRemarks] = useState(
    editingJob?.remarks || editingJob?.initialInspectionNotes || ''
  );

  // SIGNATURES (Amharic as in paper form)
  const [betagash, setBetagash] = useState(editingJob?.jobCardSignatures?.betagash || '');
  const [baletafi, setBaletafi] = useState(editingJob?.jobCardSignatures?.baletafi || '');
  const [mechanicSign, setMechanicSign] = useState(
    editingJob?.jobCardSignatures?.mechanic || editingJob?.assignedMechanicName || ''
  );
  const [paintSign, setPaintSign] = useState(editingJob?.jobCardSignatures?.paint || '');
  const [handoverName, setHandoverName] = useState(
    editingJob?.jobCardSignatures?.handoverName || editingJob?.customerName || ''
  );
  const [handoverSign, setHandoverSign] = useState(
    editingJob?.jobCardSignatures?.handoverSign || ''
  );
  const [receivedName, setReceivedName] = useState(
    editingJob?.jobCardSignatures?.receivedName || currentUser.name
  );
  const [receivedSign, setReceivedSign] = useState(
    editingJob?.jobCardSignatures?.receivedSign || ''
  );

  // Photos
  const [photos, setPhotos] = useState<VehiclePhoto[]>(editingJob?.photos || []);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Repair requirements (one shared list used by Finance pricing and the Manager)
  const [requirements, setRequirements] = useState<PriceItem[]>(
    (editingJob?.priceItems || []).map((item) => ({
      ...item,
      action: item.action || 'Repair',
    }))
  );
  const [newRequirement, setNewRequirement] = useState('');
  const [newAction, setNewAction] = useState<ItemAction>('Repair');

  const flaggedItems = useMemo(
    () =>
      Object.entries(conditionChecklist)
        .filter(([, code]) => !!code && code !== '✓')
        .map(([item]) => item),
    [conditionChecklist]
  );

  const suggestions = flaggedItems.filter(
    (item) => !requirements.some((r) => r.name.trim().toLowerCase() === item.trim().toLowerCase())
  );

  const addRequirement = (name: string, action: ItemAction = 'Repair') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (requirements.some((r) => r.name.trim().toLowerCase() === trimmed.toLowerCase())) return;
    setRequirements((prev) => [
      ...prev,
      {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        amount: 0,
        action,
      },
    ]);
  };

  const handleAddRequirement = () => {
    addRequirement(newRequirement, newAction);
    setNewRequirement('');
  };

  const updateRequirement = (id: string, patch: Partial<PriceItem>) => {
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRequirement = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  // CHECKPOINT INTERACTIVE SELECTION & PALETTE STAMP
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [activeCodeBrush, setActiveCodeBrush] = useState<string | null>(null);
  const [checkpointNotice, setCheckpointNotice] = useState<string | null>(null);
  const [activeInspectionTab, setActiveInspectionTab] = useState<string>(JOB_CARD_TABS[0].id);

  if (!isOpen) return null;

  // Clicking a checkpoint item: if brush is active, stamps code immediately. If no brush, selects item for palette code.
  const handleCheckpointClick = (item: string) => {
    if (activeCodeBrush) {
      setConditionChecklist((prev) => ({ ...prev, [item]: activeCodeBrush }));
      setSelectedCheckpoint(item);
      const label = CONDITION_LEGEND.find((l) => l.code === activeCodeBrush)?.label || activeCodeBrush;
      setCheckpointNotice(`Stamped "${item}" as ${activeCodeBrush} (${label})`);
      setTimeout(() => setCheckpointNotice(null), 2500);
    } else {
      setSelectedCheckpoint(item);
    }
  };

  // Clicking a code button on the top Code Palette
  const handleApplyCodeFromPalette = (code: string) => {
    if (selectedCheckpoint) {
      setConditionChecklist((prev) => ({ ...prev, [selectedCheckpoint]: code }));
      const label = CONDITION_LEGEND.find((l) => l.code === code)?.label || code;
      setCheckpointNotice(`Assigned "${code}" (${label}) to ${selectedCheckpoint}`);
      setTimeout(() => setCheckpointNotice(null), 2500);
    }
    setActiveCodeBrush(code);
  };

  const handleClearSelectedOrBrush = () => {
    if (selectedCheckpoint) {
      setConditionChecklist((prev) => {
        const copy = { ...prev };
        delete copy[selectedCheckpoint];
        return copy;
      });
      setCheckpointNotice(`Cleared code for ${selectedCheckpoint}`);
      setTimeout(() => setCheckpointNotice(null), 2000);
    }
    setActiveCodeBrush(null);
  };

  // Specific code setter
  const handleSetCode = (item: string, code: string) => {
    setConditionChecklist((prev) => {
      if (prev[item] === code) {
        const copy = { ...prev };
        delete copy[item];
        return copy;
      }
      return { ...prev, [item]: code };
    });
  };

  // Quick Action: Mark all items as Available (✓)
  const handleMarkAllAvailable = () => {
    const all: Record<string, string> = {};
    JOB_CARD_SECTIONS.forEach((cat) => {
      cat.items.forEach((item) => {
        all[item] = '✓';
      });
    });
    setConditionChecklist(all);
    setCheckpointNotice('Marked all checkpoints as Available (✓)');
    setTimeout(() => setCheckpointNotice(null), 2000);
  };

  const handleClearAll = () => {
    setConditionChecklist({});
    setSelectedCheckpoint(null);
    setActiveCodeBrush(null);
  };

  const validate = (): boolean => {
    if (!customerName.trim()) {
      setValidationError('Owner Name is required.');
      return false;
    }
    if (!customerPhone.trim()) {
      setValidationError('Customer phone number is required.');
      return false;
    }
    if (!vehicleModel.trim()) {
      setValidationError('Vehicle model is required.');
      return false;
    }
    if (!plateNumber.trim()) {
      setValidationError('Plate No is required.');
      return false;
    }
    if (!customerProblem.trim()) {
      setValidationError('Please fill in Description of reported issue / requested service.');
      return false;
    }
    if (requirements.length === 0) {
      setValidationError('Add at least one repair requirement or spare part, and select Repair or Replace.');
      return false;
    }
    if (requirements.some((r) => !r.name.trim())) {
      setValidationError('Every repair requirement needs a name.');
      return false;
    }
    return true;
  };

  const handleSave = (isDraft: boolean = false) => {
    setValidationError(null);
    if (!isDraft && !validate()) return;

    const newJob: JobRecord = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      jobNumber,
      status: editingJob ? editingJob.status : isDraft ? 'Received' : 'Awaiting Quotation Approval',
      isDraft,
      createdAt: editingJob ? editingJob.createdAt : new Date().toISOString(),
      createdBy: editingJob ? editingJob.createdBy : `${currentUser.name} (${currentUser.role})`,
      updatedAt: new Date().toISOString(),

      customerName: customerName.trim() || 'Owner Name',
      customerPhone: customerPhone.trim() || 'N/A',
      vehicleMake: vehicleMake.trim() || 'Toyota',
      vehicleModel: vehicleModel.trim() || 'Model',
      vehicleType: vehicleType.trim(),
      plateNumber: plateNumber.trim().toUpperCase() || 'DRAFT-PLATE',
      vin: vin.trim().toUpperCase(),
      engineNo: engineNo.trim().toUpperCase(),
      privatePaint: privatePaint.trim(),
      privateMechanic: privateMechanic.trim(),
      mileage: mileage ? parseInt(mileage, 10) : null,
      receivedAt,

      // Condition checklist
      conditionChecklist,

      // Problem / Description & Remarks
      customerProblem: customerProblem.trim() || 'Standard intake inspection',
      repairDescription: customerProblem.trim(),
      remarks: remarks.trim(),
      initialInspectionNotes: remarks.trim(),
      sparePartsRequiredNotes:
        requirements.map((r) => `${r.name} (${r.action})`).join(', ') ||
        editingJob?.sparePartsRequiredNotes ||
        '',
      vehicleConditionOnArrival:
        editingJob?.vehicleConditionOnArrival ||
        `Job Card verified. ${Object.keys(conditionChecklist).length} checkpoints logged.`,

      // Insurance
      hasInsurance,
      insuranceCompany: hasInsurance ? insuranceCompany.trim() : undefined,
      claimNumber: hasInsurance ? claimNumber.trim() : undefined,
      insuranceApprovalStatus: hasInsurance ? 'Approved' : 'N/A',

      // Signatures
      jobCardSignatures: {
        betagash: betagash.trim(),
        baletafi: baletafi.trim(),
        mechanic: mechanicSign.trim(),
        paint: paintSign.trim(),
        handoverName: handoverName.trim() || customerName.trim(),
        handoverSign: handoverSign.trim(),
        receivedName: receivedName.trim() || currentUser.name,
        receivedSign: receivedSign.trim(),
      },

      photos,

      // Assignment
      assignedTeamId: editingJob?.assignedTeamId || null,
      assignedTeamName: editingJob?.assignedTeamName || null,
      assignedMechanicId: editingJob?.assignedMechanicId || null,
      assignedMechanicName: editingJob?.assignedMechanicName || null,
      priority: editingJob?.priority || 'Medium',
      smsDispatches: editingJob?.smsDispatches || [],

      // Finance details
      laborCost: editingJob?.laborCost || 0,
      sparePartsCost: editingJob?.sparePartsCost || 0,
      additionalServiceCost: editingJob?.additionalServiceCost || 0,
      otherCharges: editingJob?.otherCharges || 0,
      discount: editingJob?.discount || 0,
      taxRate: editingJob?.taxRate || 15,
      totalEstimatedCost: editingJob?.totalEstimatedCost || 0,
      finalApprovedPrice: editingJob?.finalApprovedPrice || 0,
      actualFinalCost: editingJob?.actualFinalCost || 0,
      quotationStatus: editingJob?.quotationStatus || 'Draft',
      quotationValidityDays: editingJob?.quotationValidityDays || 14,
      spareParts: editingJob?.spareParts || [],
      payments: editingJob?.payments || [],
      paymentStatus: editingJob?.paymentStatus || 'Unpaid',
      priceItems: requirements.map((r) => {
        const existing = editingJob?.priceItems?.find((e) => e.id === r.id);
        return {
          id: r.id,
          name: r.name.trim(),
          amount: existing?.amount ?? r.amount ?? 0,
          action: r.action || 'Repair',
        };
      }),

      checklist: editingJob?.checklist || [],
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: isEditing ? 'Job Card Updated' : isDraft ? 'Job Card Draft Saved' : 'Job Card Registered',
          performedBy: currentUser.name,
          userRole: currentUser.role,
          details: `Official Job Card ${jobNumber} (${plateNumber.trim()}) logged with ${Object.keys(conditionChecklist).length} checkpoint items.`,
          type: 'intake',
        },
        ...(editingJob?.auditTrail || []),
      ],
    };

    StorageService.saveJob(newJob);

    // Registration sends the Repair/Replace requirements to Finance (to price)
    // and to the Manager (to review). Manager assignment stays locked until
    // Finance has saved the prices.
    if (!isDraft) {
      const handover = buildJobHandoverMessage(newJob, ' | ');
      StorageService.addNotification({
        targetRole: 'finance',
        title: `Price Required — ${jobNumber} (${newJob.plateNumber})`,
        message: handover,
        jobId: newJob.id,
        jobNumber: newJob.jobNumber,
        type: 'approval',
      });
      StorageService.addNotification({
        targetRole: 'manager',
        title: `New Job ${jobNumber} — Awaiting Finance Price`,
        message: handover,
        jobId: newJob.id,
        jobNumber: newJob.jobNumber,
        type: 'approval',
      });
    }

    onJobSaved(newJob);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const renderCheckpointRow = (item: string) => {
    const code = conditionChecklist[item];
    const isSelected = selectedCheckpoint === item;
    const legendItem = CONDITION_LEGEND.find((l) => l.code === code);

    return (
      <button
        type="button"
        key={item}
        onClick={() => handleCheckpointClick(item)}
        className={`w-full flex items-center justify-between gap-2 pl-2.5 pr-2 py-1.5 select-none transition cursor-pointer border-l-2 text-left ${
          isSelected
            ? 'bg-sand/70 border-l-brand text-ink font-bold'
            : 'border-l-transparent hover:bg-sand/40 text-ink'
        }`}
        title={`Tap to select "${item}", then tap a code in the Code Palette — or activate a stamp code first.`}
      >
        <span className="truncate text-[11px]">{item}</span>
        <span
          className={`w-7 h-6 flex items-center justify-center font-mono font-bold rounded-md border text-xs shrink-0 ${
            code
              ? legendItem?.color || 'bg-ink text-white'
              : 'border-dashed border-line text-ink-muted/40 hover:border-ink-muted'
          }`}
        >
          {code || '·'}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-2 sm:p-4 no-print">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-line">
        {/* Top Controls Header */}
        <div className="p-3 sm:p-4 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-sand/40 rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#800020] text-white font-bold tracking-wider shrink-0">
              {jobNumber}
            </span>
            <span className="text-sm font-bold text-ink truncate">
              {isEditing ? 'Edit Feyamet Job Card' : 'Official Vehicle Job Card Intake'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sand/50 hover:bg-sand text-ink text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Preview</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted/70 hover:text-ink hover:bg-sand rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PHYSICAL JOB CARD FORM CONTAINER */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {validationError && (
            <div className="p-3 bg-coral/10 border border-coral/30 rounded-xl flex items-center gap-2 text-brand font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-coral" />
              <span>{validationError}</span>
            </div>
          )}

          {/* OFFICIAL HEADER BANNER */}
          <div className="border-2 border-line p-4 bg-white space-y-4 shadow-2xs">
            {/* Top Garage Info from Photo */}
            <div className="border-b-2 border-line pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-ink leading-none">
                  fyamet
                </h1>
                <span className="text-[11px] tracking-widest uppercase font-bold text-ink-muted block">
                  AUTO GARAGE
                </span>
                <span className="text-xs font-bold text-[#800020] block mt-0.5">
                  ፋያሜት አውቶ ጋራጅ
                </span>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-xs font-medium text-ink">
                  አዲስ አበባ Addis Ababa- Ethiopia
                </p>
                <p className="text-xs font-mono font-bold text-ink flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-1 mt-0.5">
                  <span>Tell dY"�</span>
                  <span className="text-[#800020]">09-13-04-14-36</span>
                  <span>09-39-33-34-33</span>
                  <span>09-69-33-34-33</span>
                </p>
              </div>
            </div>

            {/* TITLE: JOB CARD */}
            <div className="text-center py-1.5 border-b-2 border-line bg-sand/50">
              <h2 className="text-lg font-black tracking-widest uppercase">
                JOB CARD
              </h2>
            </div>

            {/* SECTION 1: TOP METADATA FORM (Owner, Date, Model, Type, Plate, etc.) */}
            <div className="border-b-2 border-line pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Owner Name */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Owner Name: <span className="text-coral">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kassahun Bekele"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Date:
                  </label>
                  <input
                    type="text"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Vehicle Model */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Vehicle Model: <span className="text-coral">*</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Land Cruiser Prado TX-L"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Type:
                  </label>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="e.g. SUV, Sedan, Pickup, Truck"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Phone no */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Phone no: <span className="text-coral">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+251 911 234 567"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                    required
                  />
                </div>

                {/* VIN number */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    VIN Number:
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    placeholder="e.g. JTEBU29J00K091823"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Plate No */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Plate No: <span className="text-coral">*</span>
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="e.g. AA-2-B9921"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#800020] text-[#800020] rounded font-mono font-black text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#800020]"
                    required
                  />
                </div>

                {/* Engine No */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Engine No:
                  </label>
                  <input
                    type="text"
                    value={engineNo}
                    onChange={(e) => setEngineNo(e.target.value)}
                    placeholder="e.g. 1KD-FTV-88219"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Private paint */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Private paint:
                  </label>
                  <input
                    type="text"
                    value={privatePaint}
                    onChange={(e) => setPrivatePaint(e.target.value)}
                    placeholder="e.g. Metallic Black / Pearl White"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Private mechanic */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Private mechanic:
                  </label>
                  <input
                    type="text"
                    value={privateMechanic}
                    onChange={(e) => setPrivateMechanic(e.target.value)}
                    placeholder="Assigned or designated mechanic"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* KM */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    KM (Mileage):
                  </label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="e.g. 142000"
                    className="w-full px-2.5 py-1.5 bg-sand/40 border border-line rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                {/* Insurance */}
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-0.5">
                    Insurance:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ins_check"
                      checked={hasInsurance}
                      onChange={(e) => setHasInsurance(e.target.checked)}
                      className="w-4 h-4 text-[#800020] rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      disabled={!hasInsurance}
                      value={insuranceCompany}
                      onChange={(e) => setInsuranceCompany(e.target.value)}
                      placeholder={hasInsurance ? 'Insurance Company & Claim #' : 'Direct Private (No Insurance)'}
                      className="flex-1 px-2.5 py-1.5 bg-sand/40 border border-line rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020] disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: CONDITION OF VEHICLE CHECKLIST (Interactive Checkpoint Grid) */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-line pb-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                    CONDITION OF VEHICLE
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Click each checkpoint to cycle or assign condition codes. You can also use the 1-click Quick Fill.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllAvailable}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Quick: Mark All Available (✓)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1 bg-sand hover:bg-line text-ink text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* INTERACTIVE CODE PICKER PALETTE & SELECTION TOOL */}
              <div className="p-3 bg-sand/40 border-2 border-line rounded-lg space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-ink">
                      Code Palette:
                    </span>
                    {selectedCheckpoint ? (
                      <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 font-bold text-xs rounded border border-amber-400 flex items-center gap-1.5 shadow-2xs">
                        <span>Selected:</span>
                        <span className="underline decoration-[#800020] decoration-2">{selectedCheckpoint}</span>
                        {conditionChecklist[selectedCheckpoint] ? (
                          <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border border-line font-bold">
                            Current: {conditionChecklist[selectedCheckpoint]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-muted font-medium">
                            (No code set)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-muted italic">
                        (Click any checkpoint item like &ldquo;Water Tank Cup&rdquo;, then click a code button below)
                      </span>
                    )}
                  </div>

                  {activeCodeBrush && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-ink-muted font-semibold">Active Stamp:</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-brand text-white text-xs">
                        {activeCodeBrush} = {CONDITION_LEGEND.find((l) => l.code === activeCodeBrush)?.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveCodeBrush(null)}
                        className="text-[11px] text-coral hover:underline font-semibold cursor-pointer"
                      >
                        Turn Off Stamp
                      </button>
                    </div>
                  )}
                </div>

                {/* Clickable Code Palette Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {CONDITION_LEGEND.map((l) => {
                    const isBrush = activeCodeBrush === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => handleApplyCodeFromPalette(l.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer shadow-2xs ${l.color} ${
                          isBrush
                            ? 'ring-2 ring-brand ring-offset-2 scale-105'
                            : 'hover:scale-102 hover:shadow-xs'
                        }`}
                        title={
                          selectedCheckpoint
                            ? `Set "${selectedCheckpoint}" to ${l.code} (${l.label})`
                            : `Select ${l.code} (${l.label}) as active stamp`
                        }
                      >
                        <span className="font-black text-sm px-1 py-0.2 bg-black/10 rounded">{l.code}</span>
                        <span className="font-sans font-semibold text-xs">{l.label}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleClearSelectedOrBrush}
                    className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-sand/50 text-ink text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Erase code for selected checkpoint or turn off stamp tool"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Clear / Erase</span>
                  </button>
                </div>

                {checkpointNotice && (
                  <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{checkpointNotice}</span>
                  </div>
                )}
              </div>

              {/* TABBED VEHICLE INSPECTION MATRIX */}
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Vehicle inspection areas">
                {JOB_CARD_TABS.map((tab) => {
                  const isActive = activeInspectionTab === tab.id;
                  const total = tab.sections.reduce((sum, s) => sum + s.items.length, 0);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveInspectionTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isActive
                          ? 'bg-brand text-white border-brand shadow-soft'
                          : 'bg-white text-ink border-line hover:bg-sand/50'
                      }`}
                    >
                      {tab.title}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/25' : 'bg-sand text-brand'
                        }`}
                      >
                        {total}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border border-line rounded-xl overflow-hidden bg-white max-h-[440px] overflow-y-auto smooth-scroll">
                {JOB_CARD_TABS.filter((t) => t.id === activeInspectionTab).map((tab) => (
                  <div
                    key={tab.id}
                    className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line"
                  >
                    {tab.sections.map((section) => (
                      <div key={section.title} className="min-w-0">
                        <div className="bg-sand text-brand font-black uppercase tracking-wider text-[10px] px-2.5 py-1.5">
                          {section.title}
                        </div>
                        <div className="divide-y divide-line">
                          {section.items.map((item) => renderCheckpointRow(item))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: DESCRIPTION / REMARK TABLE */}
            <div className="border-2 border-line divide-y sm:divide-y-0 sm:divide-x divide-line grid grid-cols-1 sm:grid-cols-2">
              <div className="p-3 space-y-1">
                <label className="block text-[11px] font-black uppercase underline tracking-wider text-ink">
                  Description <span className="text-coral">*</span>
                </label>
                <textarea
                  rows={3}
                  value={customerProblem}
                  onChange={(e) => setCustomerProblem(e.target.value)}
                  placeholder="Record defect, customer complaints, engine sound, suspension issue, or requested maintenance..."
                  className="w-full p-2 bg-sand/40 border border-line rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  required
                />
              </div>

              <div className="p-3 space-y-1">
                <label className="block text-[11px] font-black uppercase underline tracking-wider text-ink">
                  Remark
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional remarks, items left in vehicle, fuel tank level (e.g. 1/2 tank), spare key provided, etc."
                  className="w-full p-2 bg-sand/40 border border-line rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
              </div>
            </div>


            {/* SECTION 4: REPAIR REQUIREMENTS (Repair / Replace) */}
            <div className="border-2 border-line p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-line pb-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-[#800020]" />
                    <span>Repair Requirements &amp; Spare Parts</span>
                  </h4>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Select <strong>Repair</strong> or <strong>Replace</strong> for each item.
                    Finance will set the prices. This list is sent to Finance and the Manager,
                    not printed on the Job Card PDF.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-sand text-brand">
                  {requirements.length} item{requirements.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Suggestions from flagged inspection items */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    From inspection:
                  </span>
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addRequirement(item, 'Repair')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-line bg-sand/50 hover:bg-sand text-[11px] font-semibold text-ink transition cursor-pointer"
                      title={`Add "${item}" as a Repair item`}
                    >
                      <Plus className="w-3 h-3 text-brand" />
                      <span>{item}</span>
                    </button>
                  ))}
                  {suggestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => suggestions.forEach((item) => addRequirement(item, 'Repair'))}
                      className="px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold transition cursor-pointer"
                    >
                      Add all
                    </button>
                  )}
                </div>
              )}

              {/* Requirement rows */}
              {requirements.length > 0 ? (
                <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
                  {requirements.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-white"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateRequirement(item.id, { name: e.target.value })}
                        placeholder="Item or spare part name"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-sand/30 border border-line rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        {(['Repair', 'Replace'] as ItemAction[]).map((action) => {
                          const active = (item.action || 'Repair') === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() => updateRequirement(item.id, { action })}
                              aria-pressed={active}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                active
                                  ? action === 'Repair'
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-brand text-white border-brand'
                                  : 'bg-white text-ink-muted border-line hover:border-brand'
                              }`}
                            >
                              {action}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => removeRequirement(item.id)}
                          title="Remove item"
                          className="p-1.5 rounded-lg text-ink-muted hover:text-coral hover:bg-coral/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted italic py-1">
                  No items yet. Add the repair requirements or spare parts below.
                </p>
              )}

              {/* Add new requirement */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRequirement();
                    }
                  }}
                  placeholder="e.g. Brake pad, Brake disc, Oil filter"
                  className="flex-1 min-w-0 px-2.5 py-2 bg-sand/30 border border-line rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['Repair', 'Replace'] as ItemAction[]).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setNewAction(action)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        newAction === action
                          ? action === 'Repair'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-brand text-white border-brand'
                          : 'bg-white text-ink-muted border-line hover:border-brand'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    disabled={!newRequirement.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-[11px] font-bold disabled:bg-line disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 5: SIGNATURES (Amharic in Amharic as requested) */}
            <div className="border-2 border-line p-3 bg-white space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-ink border-b border-line pb-1">
                Signatures / ፊርማዎች
              </h4>

              {/* Row 1: በታጋሽ | ባለጣፊ | መካኒክ | ቀለም */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-0.5">በታጋሽ:</label>
                  <input
                    type="text"
                    value={betagash}
                    onChange={(e) => setBetagash(e.target.value)}
                    placeholder="ስም / ፊርማ"
                    className="w-full px-2 py-1 bg-sand/40 border border-line rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-0.5">ባለጣፊ:</label>
                  <input
                    type="text"
                    value={baletafi}
                    onChange={(e) => setBaletafi(e.target.value)}
                    placeholder="ስም / ፊርማ"
                    className="w-full px-2 py-1 bg-sand/40 border border-line rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-0.5">መካኒክ:</label>
                  <input
                    type="text"
                    value={mechanicSign}
                    onChange={(e) => setMechanicSign(e.target.value)}
                    placeholder="ስም / ፊርማ"
                    className="w-full px-2 py-1 bg-sand/40 border border-line rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-0.5">ቀለም:</label>
                  <input
                    type="text"
                    value={paintSign}
                    onChange={(e) => setPaintSign(e.target.value)}
                    placeholder="ስም / ፊርማ"
                    className="w-full px-2 py-1 bg-sand/40 border border-line rounded text-xs"
                  />
                </div>
              </div>

              {/* Row 2: የአስረካቢው ስም & የተረካቢው ስም */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-line">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-ink w-32 shrink-0">የአስረካቢው ስም:</label>
                  <input
                    type="text"
                    value={handoverName}
                    onChange={(e) => setHandoverName(e.target.value)}
                    placeholder="Customer / Driver Name"
                    className="flex-1 px-2.5 py-1.5 bg-sand/40 border border-line rounded text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-ink w-32 shrink-0">የተረካቢው ስም:</label>
                  <input
                    type="text"
                    value={receivedName}
                    onChange={(e) => setReceivedName(e.target.value)}
                    placeholder="Recorder Staff Name"
                    className="flex-1 px-2.5 py-1.5 bg-sand/40 border border-line rounded text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Row 3: Digital Signature Section - Simple, Clear, Not Big */}
              <div className="pt-2 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Pen className="w-3.5 h-3.5 text-[#800020]" />
                    <span>ዲጂታል ፊርማ · Simple & Clear Digital Signature</span>
                  </span>
                  <span className="text-[10px] text-ink-muted font-medium hidden sm:inline">
                    Finger, stylus, or mouse · Prints directly on paper
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CompactSignaturePad
                    label="የአስረካቢው ፊርማ"
                    subLabel="(Customer Signature)"
                    value={handoverSign}
                    onChange={(val) => setHandoverSign(val)}
                    signerName={handoverName || customerName}
                    placeholder="Customer sign with finger or mouse"
                  />

                  <CompactSignaturePad
                    label="የተረካቢው ፊርማ"
                    subLabel="(Staff Intake Signature)"
                    value={receivedSign}
                    onChange={(val) => setReceivedSign(val)}
                    signerName={receivedName || currentUser.name}
                    placeholder="Staff confirm intake signature"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 6: CAMERA EVIDENCE / TABLET PHOTOS */}
            <div className="border-t-2 border-line pt-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#800020]" />
                <span>Inspection Photos & Evidence (Tablet Camera)</span>
              </h4>
              <CameraCapture
                photos={photos}
                onPhotosChange={(updated) => setPhotos(updated)}
                maxPhotos={6}
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-line bg-sand/40 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-ink-muted text-[11px]">
            Registration records the job and requirements. Only Finance sets the prices.
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/50 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-ink bg-sand hover:bg-line rounded-xl transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#800020] hover:bg-[#600018] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Update Job Card' : 'Save & Register Job Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

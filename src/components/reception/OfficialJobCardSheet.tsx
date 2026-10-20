import React from 'react';
import { JobRecord } from '../../types';
import { JOB_CARD_SECTIONS, CONDITION_LEGEND } from './jobCardCheckpoints';
import { Printer, Download, Car, Shield, Phone, FileText, Check, X, AlertCircle } from 'lucide-react';
import { BrandMark } from '../common/BrandMark';

interface OfficialJobCardSheetProps {
  job: JobRecord;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onClose?: () => void;
  /** Hide the built-in action bar when the sheet is embedded in a review modal. */
  hideToolbar?: boolean;
}

export const OfficialJobCardSheet: React.FC<OfficialJobCardSheetProps> = ({
  job,
  onPrint,
  onExportPdf,
  onClose,
  hideToolbar = false,
}) => {
  const checklist = job.conditionChecklist || {};
  const sigs = job.jobCardSignatures || {};

  const handleTriggerPrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action bar stays above the paper so it never covers the job card */}
      {!hideToolbar && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-3 bg-white rounded-xl border border-neutral-200 shadow-sm px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 bg-coral/10 text-[#800020] text-xs font-bold rounded-lg border border-coral/30 uppercase tracking-wide shrink-0">
              Official Workshop Job Card
            </span>
            <span className="font-mono text-xs font-bold text-neutral-800 truncate">
              {job.jobNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                title="Export this job card as a PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAPER JOB CARD LAYOUT (Matches physical form) */}
      <div className="bg-white text-neutral-900 p-4 sm:p-8 border border-neutral-300 shadow-lg rounded-xl print:border-none print:shadow-none print:p-0 print:max-w-none">
        <div className="border-2 border-neutral-900 p-4 sm:p-6 print:p-2 bg-white font-sans text-xs">
        {/* HEADER BLOCK */}
        <div className="border-b-2 border-neutral-900 pb-3 text-center relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            {/* Logo */}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <BrandMark className="w-9 h-9 rounded-lg" />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-neutral-900 leading-none">
                    fyamet
                  </h1>
                  <span className="text-[10px] tracking-widest uppercase font-bold text-neutral-600 block">
                    AUTO GARAGE
                  </span>
                </div>
              </div>
            </div>

            {/* Amharic name & Address & Phones in photo */}
            <div className="text-center">
              <h2 className="text-sm font-bold text-neutral-900">
                ፋያሜት አውቶ ጋራጅ
              </h2>
              <p className="text-[11px] text-neutral-700 font-medium">
                አዲስ አበባ Addis Ababa- Ethiopia
              </p>
              <p className="text-[11px] font-mono font-bold text-neutral-900 flex items-center justify-center gap-2 mt-0.5">
                <span>Tell 📱</span>
                <span>09-13-04-14-36</span>
                <span>09-39-33-34-33</span>
                <span>09-69-33-34-33</span>
              </p>
            </div>

            {/* Job Number / Stamp */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">JOB NO:</span>
              <span className="text-base font-black font-mono text-[#800020]">
                {job.jobNumber}
              </span>
            </div>
          </div>
        </div>

        {/* TITLE */}
        <div className="text-center py-2 border-b-2 border-neutral-900 bg-neutral-50">
          <h2 className="text-lg font-black tracking-wider uppercase underline">
            JOB CARD
          </h2>
        </div>

        {/* METADATA FIELDS GRID (2 Columns / 4 Columns as in form) */}
        <div className="border-b-2 border-neutral-900 p-3 bg-white space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {/* Row 1 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Owner Name:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.customerName || '________________________'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Date:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-semibold text-neutral-900 px-1">
                {job.receivedAt ? job.receivedAt.substring(0, 10) : '________________________'}
              </span>
            </div>

            {/* Row 2 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Vehicle Model:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.vehicleMake} {job.vehicleModel}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Type:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.vehicleType || job.color || '________________________'}
              </span>
            </div>

            {/* Row 3 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Phone no:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-semibold text-neutral-900 px-1 truncate">
                {job.customerPhone || '________________________'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">VIN Number:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-semibold text-neutral-900 px-1 truncate">
                {job.vin || '________________________'}
              </span>
            </div>

            {/* Row 4 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Plate No:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-bold text-neutral-900 px-1">
                {job.plateNumber || '________________________'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Engine No:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-semibold text-neutral-900 px-1 truncate">
                {job.engineNo || '________________________'}
              </span>
            </div>

            {/* Row 5 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Private paint:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.privatePaint || '________________________'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Private mechanic:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.privateMechanic || job.assignedMechanicName || '________________________'}
              </span>
            </div>

            {/* Row 6 */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">KM:</span>
              <span className="flex-1 border-b border-neutral-400 font-mono font-semibold text-neutral-900 px-1">
                {job.mileage ? `${job.mileage.toLocaleString()} KM` : '________________________'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-neutral-800 w-32 shrink-0">Insurance:</span>
              <span className="flex-1 border-b border-neutral-400 font-semibold text-neutral-900 px-1 truncate">
                {job.hasInsurance
                  ? `${job.insuranceCompany || 'Yes'} (Claim: ${job.claimNumber || 'N/A'})`
                  : 'Direct / Private'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION HEADER: CONDITION OF VEHICLE */}
        <div className="text-center py-1.5 border-b-2 border-neutral-900 bg-neutral-100 font-bold uppercase tracking-wider text-xs">
          CONDITION OF VEHICLE
        </div>

        {/* CHECKPOINTS MULTI-COLUMN TABLE (Matches layout from photo) */}
        <div className="border-b-2 border-neutral-900 overflow-x-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 text-[11px] divide-x divide-neutral-900">
            {/* Column 1: Trunk & Front Body */}
            <div className="divide-y divide-neutral-300">
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Trunk
              </div>
              {JOB_CARD_SECTIONS[0].items.map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Front body
              </div>
              {JOB_CARD_SECTIONS[1].items.map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 2: RH Body (First Part) */}
            <div className="divide-y divide-neutral-300">
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                RH Body
              </div>
              {JOB_CARD_SECTIONS[2].items.slice(0, 17).map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 3: RH Body (Doors/Rear) & Rear Body */}
            <div className="divide-y divide-neutral-300">
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                RH Body (Cont.)
              </div>
              {JOB_CARD_SECTIONS[2].items.slice(17).map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Rear Body
              </div>
              {JOB_CARD_SECTIONS[3].items.map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 4: LH Body & Interior Part 1 */}
            <div className="divide-y divide-neutral-300">
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                LH Body
              </div>
              {JOB_CARD_SECTIONS[4].items.map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Interior
              </div>
              {JOB_CARD_SECTIONS[5].items.slice(0, 9).map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 5: Interior Part 2 & Peripheral */}
            <div className="divide-y divide-neutral-300 col-span-2 md:col-span-1">
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Interior (Cont.)
              </div>
              {JOB_CARD_SECTIONS[5].items.slice(9).map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
              <div className="bg-neutral-200 font-bold px-2 py-1 text-center uppercase tracking-wide">
                Peripheral
              </div>
              {JOB_CARD_SECTIONS[6].items.map((item) => (
                <div key={item} className="flex items-center justify-between px-2 py-0.5 hover:bg-neutral-50">
                  <span className="truncate pr-1 text-[10px]">{item}</span>
                  <span className="w-5 text-center font-mono font-bold text-neutral-900">
                    {checklist[item] || '·'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DESCRIPTION & REMARK (Lined Box from Photo) */}
        <div className="border-b-2 border-neutral-900 divide-y divide-neutral-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-900">
            {/* Description */}
            <div className="p-2 min-h-[90px] flex flex-col justify-between">
              <div>
                <span className="font-bold uppercase tracking-wider block mb-1 text-[11px] underline">
                  Description
                </span>
                <p className="text-[11px] text-neutral-800 leading-relaxed font-mono">
                  {job.repairDescription || job.customerProblem || 'No defect description logged.'}
                </p>
              </div>
              <div className="space-y-1 mt-2 text-[10px] text-neutral-400 border-t border-neutral-200 pt-1">
                <div className="border-b border-dotted border-neutral-300 h-3"></div>
                <div className="border-b border-dotted border-neutral-300 h-3"></div>
              </div>
            </div>

            {/* Remark */}
            <div className="p-2 min-h-[90px] flex flex-col justify-between">
              <div>
                <span className="font-bold uppercase tracking-wider block mb-1 text-[11px] underline">
                  Remark
                </span>
                <p className="text-[11px] text-neutral-800 leading-relaxed font-mono">
                  {job.remarks || job.initialInspectionNotes || 'No specific remark.'}
                </p>
              </div>
              <div className="space-y-1 mt-2 text-[10px] text-neutral-400 border-t border-neutral-200 pt-1">
                <div className="border-b border-dotted border-neutral-300 h-3"></div>
                <div className="border-b border-dotted border-neutral-300 h-3"></div>
              </div>
            </div>
          </div>
        </div>



        {(() => {
          const requirements = (job.priceItems || []).filter((item) => item.name.trim());
          if (requirements.length === 0) return null;
          return (
            <div className="no-print p-3 border-t border-neutral-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-900">
                  Repair / Replace List
                </h4>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                  Review only - not printed
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {requirements.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 border border-neutral-300 rounded px-2 py-1.5"
                  >
                    <span className="min-w-0 flex items-center gap-1.5">
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          item.action === 'Replace'
                            ? 'bg-[#800020]/10 text-[#800020] border border-[#800020]/30'
                            : item.action === 'Repair'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                        }`}
                      >
                        {item.action || 'Extra'}
                      </span>
                      <span className="truncate text-[10px] font-semibold text-neutral-800">
                        {item.name}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* SIGNATURES SECTION (Exact Amharic text from the physical paper) */}
        <div className="p-3 bg-white space-y-4">
          {/* Row 1: በታጋሽ | ባለጣፊ | መካኒክ | ቀለም */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold">በታጋሽ:</span>
              <span className="flex-1 border-b border-neutral-900 text-center font-mono font-medium truncate">
                {sigs.betagash || '________________'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold">ባለጣፊ:</span>
              <span className="flex-1 border-b border-neutral-900 text-center font-mono font-medium truncate">
                {sigs.baletafi || '________________'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold">መካኒክ:</span>
              <span className="flex-1 border-b border-neutral-900 text-center font-mono font-medium truncate">
                {sigs.mechanic || job.assignedMechanicName || '________________'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold">ቀለም:</span>
              <span className="flex-1 border-b border-neutral-900 text-center font-mono font-medium truncate">
                {sigs.paint || '________________'}
              </span>
            </div>
          </div>

          {/* Row 2: የአስረካቢው ስም & ፊርማ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold pt-1">
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold w-28 shrink-0">የአስረካቢው ስም:</span>
              <span className="flex-1 border-b border-neutral-900 text-left font-mono font-medium px-1 truncate">
                {sigs.handoverName || job.customerName || '________________________'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold w-14 shrink-0">ፊርማ:</span>
              <div className="flex-1 border-b border-neutral-900 min-h-[26px] flex items-center px-1">
                {sigs.handoverSign && sigs.handoverSign.startsWith('data:image/') ? (
                  <img
                    src={sigs.handoverSign}
                    alt="Customer Signature"
                    className="h-9 max-w-[190px] object-contain"
                  />
                ) : (
                  <span className="font-mono font-medium text-neutral-900">
                    {sigs.handoverSign || '________________________'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: የተረካቢው ስም & ፊርማ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold w-28 shrink-0">የተረካቢው ስም:</span>
              <span className="flex-1 border-b border-neutral-900 text-left font-mono font-medium px-1 truncate">
                {sigs.receivedName || job.createdBy || 'Selamawit Kebede (Recorder)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-800 font-bold w-14 shrink-0">ፊርማ:</span>
              <div className="flex-1 border-b border-neutral-900 min-h-[26px] flex items-center px-1">
                {sigs.receivedSign && sigs.receivedSign.startsWith('data:image/') ? (
                  <img
                    src={sigs.receivedSign}
                    alt="Received Staff Signature"
                    className="h-9 max-w-[190px] object-contain"
                  />
                ) : (
                  <span className="font-mono font-medium text-neutral-900">
                    {sigs.receivedSign || '✓ Certified at Intake'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

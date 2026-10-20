export interface CheckpointCategory {
  title: string;
  items: string[];
}

export const JOB_CARD_SECTIONS: CheckpointCategory[] = [
  {
    title: 'Trunk',
    items: [
      'Brake Oil CUP',
      'Water Tank Cup',
      'Engine Cup',
      'Air Duct Hose',
      'Alternator',
      'Steering oil cup',
      'Radiator cup',
      'Horn',
      'Battery with cover',
      'Battery fixture',
      'Oil dip stick',
      'Starter motor',
      'Fuse box cover',
    ],
  },
  {
    title: 'Front body',
    items: [
      'Logo front & F Plate No',
      'Hood With Guard',
      'Windshield FR',
      'Wipers Arm & blade Cover',
    ],
  },
  {
    title: 'RH Body',
    items: [
      'Antenna',
      'Fender FR LH',
      'Over Fender FR LH',
      'FR LH Liner & M guard',
      'Side Lamp LH',
      'Head Lamp LH',
      'Fog lamp LH & RH',
      'Bumper',
      'Bumper facial RH & LH',
      'Radiator Grill',
      'Head Lamp RH',
      'Side Lamp RH',
      'Fender FR RH',
      'Over Fender FR RH',
      'FR RH Liner & M guard',
      'Side View mirror RH',
      'Pedal RH',
      'Door & Handle FR RH',
      'Door & Glass FR RH',
      'Door & Handle RR RH',
      'Door & Glass RR RH',
      'Fuel filter door',
      'Fuel tank Cap',
      'RR RH Liner & M guard',
      'Over fender RR RH',
      'Fender RR RH',
    ],
  },
  {
    title: 'Rear Body',
    items: [
      'Tail Lamp RH',
      'Tail Lamp LH',
      'Windshield RR',
      'Back door',
      'Logo Rear & R Plate N',
      'Back floor cover',
      'License Lamp',
      'Spare tire carrier',
      'Spare tire',
      'Bumper RR & reflector',
    ],
  },
  {
    title: 'LH Body',
    items: [
      'Door & Handle RR LH',
      'Door & Glass RR LH',
      'RR LH Liner & M guard',
      'Over fender RR LH',
      'Fender RR LH',
      'Door & Handle FR LH',
      'Door & Glass FR LH',
      'Side View mirror LH',
      'Pedal LH',
    ],
  },
  {
    title: 'Interior',
    items: [
      'Sun Visor LH',
      'Sun Visor RH',
      'Roof',
      'Air bag',
      'Fuel Level',
      'AC Knob',
      'Cigarette Lighter',
      'Cigarette Lighter Cover',
      'Room light',
      'Head rest',
      'Speaker (Radio)',
      'Glove box',
      'Door Locks',
      'Door glass Lifter',
      'Floor Mates',
      'Gear Shifting lever knob',
      'Automatic shifting switch',
      'Jack and handle',
      'Tire wrench',
      'Fire extinguisher',
      'First Aid',
      'Reflector',
    ],
  },
  {
    title: 'Peripheral',
    items: [
      'Remote controller',
      'Wheel nut',
      'Wheel cup',
      'LH W. guard FR & RR',
      'RH W. guard FR & RR',
    ],
  },
];

/**
 * Condition legend — single-tap toggles for each inspection line item.
 * ✓ keeps a warm green tint; all damage/fault codes use the brand
 * burgundy & coral accents; X reads as greyed-out / not available.
 */
export const CONDITION_LEGEND = [
  { code: '✓', label: 'Available', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { code: 'D', label: 'Damaged', color: 'text-white bg-coral border-coral' },
  { code: 'S', label: 'Scratch', color: 'text-coral bg-coral/10 border-coral/40' },
  { code: 'B', label: 'Broken', color: 'text-brand bg-brand/10 border-brand/40' },
  { code: 'C', label: 'Crack', color: 'text-brand bg-sand border-brand/30' },
  { code: 'd', label: 'Dent', color: 'text-coral bg-sand border-coral/40' },
  { code: 'b', label: 'Bend', color: 'text-brand-hover bg-sand border-brand/20' },
  { code: 'X', label: 'Not Available', color: 'text-ink-muted bg-line border-line' },
];

export const ALL_LEGEND_CODES = ['✓', 'D', 'S', 'B', 'C', 'd', 'b', 'X'] as const;
export type ConditionCode = (typeof ALL_LEGEND_CODES)[number];

/** Codes that represent a fault / item that needs attention (i.e. everything except "Available"). */
export const FAULT_CODES: ConditionCode[] = ['D', 'S', 'B', 'C', 'd', 'b', 'X'];

import { PriceItem } from '../../types';

export interface FixItem {
  item: string;
  code: string;
  label: string;
  action?: 'Repair' | 'Replace';
}

/** Returns only the inspection lines that are flagged as needing repair. */
export function getFixItems(checklist?: Record<string, string>): FixItem[] {
  if (!checklist) return [];
  return Object.entries(checklist)
    .filter(([, code]) => !!code && code !== '✓')
    .map(([item, code]) => ({
      item,
      code,
      label: CONDITION_LEGEND.find((l) => l.code === code)?.label || code,
    }));
}

/** Requirements captured at registration (name + Repair/Replace + price). */
export function getRequirementItems(priceItems?: PriceItem[]) {
  return (priceItems || []).filter((item) => item.name.trim().length > 0);
}

interface HandoverJob {
  jobNumber: string;
  plateNumber: string;
  repairDescription?: string;
  customerProblem?: string;
  remarks?: string;
  initialInspectionNotes?: string;
  conditionChecklist?: Record<string, string>;
  priceItems?: PriceItem[];
}

/**
 * Builds the concise handover message that reception sends to the manager,
 * and that the manager forwards to the mechanic: a tiny header (Job No +
 * Plate), the Description, the Remark, and only the items that need fixing.
 */
export function buildJobHandoverMessage(job: HandoverJob, separator = '\n'): string {
  const lines: string[] = [
    `[FEYAMET] Job ${job.jobNumber} | Plate ${job.plateNumber}`,
    `Description: ${job.repairDescription || job.customerProblem || 'N/A'}`,
  ];

  const remark = (job.remarks || job.initialInspectionNotes || '').trim();
  if (remark) lines.push(`Remark: ${remark}`);

  const requirements = getRequirementItems(job.priceItems);
  if (requirements.length > 0) {
    lines.push(
      `Repair/Replace: ${requirements
        .map((r) => `${r.name} (${r.action || 'Extra'})`)
        .join(', ')}`
    );
  } else {
    const fixes = getFixItems(job.conditionChecklist);
    if (fixes.length > 0) {
      lines.push(`Items to fix: ${fixes.map((f) => `${f.item} (${f.label})`).join(', ')}`);
    } else {
      lines.push('Items to fix: none flagged (general inspection)');
    }
  }

  return lines.join(separator);
}

/**
 * Inspection matrix grouped into compact, tablet-friendly tabs that
 * mirror the official paper job card layout.
 */
export interface JobCardTab {
  id: string;
  title: string;
  sections: CheckpointCategory[];
}

export const JOB_CARD_TABS: JobCardTab[] = [
  {
    id: 'trunk-engine',
    title: 'Trunk / Engine Bay',
    sections: [JOB_CARD_SECTIONS[0]],
  },
  {
    id: 'body',
    title: 'Body Work',
    sections: [
      JOB_CARD_SECTIONS[1],
      JOB_CARD_SECTIONS[2],
      JOB_CARD_SECTIONS[3],
      JOB_CARD_SECTIONS[4],
    ],
  },
  {
    id: 'interior',
    title: 'Interior & Accessories',
    sections: [JOB_CARD_SECTIONS[5]],
  },
  {
    id: 'peripherals',
    title: 'Peripherals',
    sections: [JOB_CARD_SECTIONS[6]],
  },
];

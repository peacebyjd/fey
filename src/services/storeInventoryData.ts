import {
  WorkshopTool,
  ToolCheckoutRecord,
  MaterialItem,
  ToolCategory,
} from '../types';

/**
 * Storekeeper tool list: short, everyday names instead of long supplier names.
 * Totals and available quantities are admin-set in the tool editor.
 */
const TOOL_SEEDS: Array<{
  code: string;
  name: string;
  category: ToolCategory;
  total: number;
  available: number;
  location: string;
  description: string;
}> = [
  { code: 'TL-001', name: '10mm Wrench', category: 'Wrench', total: 4, available: 3, location: 'Rack A-1', description: '10 mm open/box wrench.' },
  { code: 'TL-002', name: '12mm Wrench', category: 'Wrench', total: 4, available: 4, location: 'Rack A-1', description: '12 mm open/box wrench.' },
  { code: 'TL-003', name: 'Mezo (Combination)', category: 'Wrench', total: 2, available: 2, location: 'Rack A-2', description: 'Combination spanner, open end and ring end.' },
  { code: 'TL-004', name: 'Stella Wrench', category: 'Wrench', total: 6, available: 6, location: 'Rack A-2', description: 'Ring / box wrench.' },
  { code: 'TL-005', name: 'Ratchet Wrench', category: 'Wrench', total: 3, available: 2, location: 'Rack A-3', description: 'Reversible ratchet handle.' },
  { code: 'TL-006', name: 'Flat Wrench', category: 'Wrench', total: 4, available: 4, location: 'Rack A-3', description: 'Flat open-end wrench.' },
  { code: 'TL-007', name: 'Pliers (Pinsa)', category: 'Wrench', total: 5, available: 5, location: 'Rack B-1', description: 'Universal combination pliers.' },
  { code: 'TL-008', name: 'Screwdriver Set', category: 'Other', total: 3, available: 3, location: 'Rack B-1', description: 'Flat and Phillips screwdriver set.' },
  { code: 'TL-009', name: 'Hammer', category: 'Other', total: 3, available: 3, location: 'Rack B-2', description: 'Workshop hammer.' },
  { code: 'TL-010', name: 'Wheel Cross Wrench', category: 'Wrench', total: 3, available: 3, location: 'Rack B-2', description: 'Four-way wheel nut wrench.' },
  { code: 'TL-011', name: 'Socket Set', category: 'Wrench', total: 4, available: 4, location: 'Rack B-3', description: 'Socket set with ratchet.' },
  { code: 'TL-012', name: 'Clamp', category: 'Other', total: 8, available: 8, location: 'Rack B-3', description: 'Holding clamp.' },
  { code: 'TL-013', name: 'Torque Wrench', category: 'Wrench', total: 3, available: 2, location: 'Precision Cabinet', description: 'Torque wrench for engine and suspension bolts.' },
  { code: 'TL-014', name: 'Impact Wrench', category: 'Power', total: 4, available: 3, location: 'Rack C-1', description: 'Air impact wrench for wheel nuts.' },
  { code: 'TL-015', name: 'Floor Jack', category: 'Lifting', total: 5, available: 4, location: 'Lifting Bay', description: 'Hydraulic floor jack.' },
  { code: 'TL-016', name: 'OBD2 Scanner', category: 'Diagnostic', total: 2, available: 1, location: 'Tech Desk', description: 'Engine diagnostic scanner.' },
  { code: 'TL-017', name: 'Engine Crane', category: 'Lifting', total: 2, available: 1, location: 'Heavy Bay', description: 'Folding hydraulic engine crane.' },
];

export const DEFAULT_TOOLS: WorkshopTool[] = TOOL_SEEDS.map((tool, index) => ({
  id: `tool-${String(index + 1).padStart(3, '0')}`,
  code: tool.code,
  name: tool.name,
  category: tool.category,
  description: tool.description,
  totalQuantity: tool.total,
  availableQuantity: tool.available,
  condition: 'Good',
  locationRack: tool.location,
  addedAt: '2026-08-15',
  addedBy: 'Admin (Abebe)',
}));

/**
 * One-time rename map for devices that still hold the old long Italian names.
 * Keyed by tool code so Admin-added tools are untouched.
 */
export const ITALIAN_TOOL_NAMES: Record<string, string> = Object.fromEntries(
  DEFAULT_TOOLS.map((tool) => [tool.code, tool.name])
);

export const DEFAULT_TOOL_CHECKOUTS: ToolCheckoutRecord[] = [
  {
    id: 'chk-001',
    toolId: 'tool-001',
    toolCode: 'TL-001',
    toolName: '10mm Wrench',
    toolCategory: 'Wrench',
    mechanicId: 'mech-sami',
    mechanicName: 'Mechanic Sami',
    teamId: 'team-a',
    teamName: 'Team A - Engine & Transmission',
    issuedByStaffName: 'Tigist Alemu (Store Keeper)',
    issuedAt: '2026-10-17 08:45',
    jobNumber: 'FEY-2026-001',
    status: 'Checked Out',
    notes: 'Checked out for Land Cruiser gearbox and bellhousing bolts.',
  },
  {
    id: 'chk-002',
    toolId: 'tool-016',
    toolCode: 'TL-016',
    toolName: 'OBD2 Scanner',
    toolCategory: 'Diagnostic',
    mechanicId: 'mech-ermiya',
    mechanicName: 'Mechanic Ermiya',
    teamId: 'team-b',
    teamName: 'Team B - General Mechanical & Suspension',
    issuedByStaffName: 'Tigist Alemu (Store Keeper)',
    issuedAt: '2026-10-17 09:30',
    jobNumber: 'FEY-2026-002',
    status: 'Checked Out',
    notes: 'Engine check light diagnostics & ABS sensor calibration.',
  },
  {
    id: 'chk-003',
    toolId: 'tool-017',
    toolCode: 'TL-017',
    toolName: 'Engine Crane',
    toolCategory: 'Lifting',
    mechanicId: 'mech-yeabsira',
    mechanicName: 'Yeabsira Mekbeb',
    teamId: 'team-a',
    teamName: 'Team A - Engine & Transmission',
    issuedByStaffName: 'Tigist Alemu (Store Keeper)',
    issuedAt: '2026-10-17 10:15',
    jobNumber: 'FEY-2026-001',
    status: 'Checked Out',
    notes: 'Used in Bay 1 for 1HZ engine drop.',
  },
];

export const DEFAULT_MATERIALS: MaterialItem[] = [
  { id: 'mat-001', name: 'Engine Oil 5W-30', quantity: 48, unit: 'Litre', location: 'Rack A-1', addedAt: '2026-09-01' },
  { id: 'mat-002', name: 'Oil Filter', quantity: 30, unit: 'Piece', location: 'Rack A-2', addedAt: '2026-09-01' },
  { id: 'mat-003', name: 'Air Filter', quantity: 24, unit: 'Piece', location: 'Rack A-3', addedAt: '2026-09-01' },
  { id: 'mat-004', name: 'Brake Pad Set', quantity: 18, unit: 'Set', location: 'Rack B-1', addedAt: '2026-09-01' },
  { id: 'mat-005', name: 'Brake Fluid DOT 4', quantity: 12, unit: 'Litre', location: 'Rack B-2', addedAt: '2026-09-01' },
  { id: 'mat-006', name: 'Hydraulic Jack Oil', quantity: 8, unit: 'Litre', location: 'Rack C-1', addedAt: '2026-09-01' },
  { id: 'mat-007', name: 'Shop Towels', quantity: 60, unit: 'Roll', location: 'Rack D-1', addedAt: '2026-09-01' },
  { id: 'mat-008', name: 'Tire Valve Stem', quantity: 50, unit: 'Piece', location: 'Rack E-1', addedAt: '2026-09-01' },
];

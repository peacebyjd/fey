export type UserRole = 'admin' | 'reception' | 'finance' | 'manager' | 'storekeeper';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface MechanicStaff {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  teamId?: string;
  isActive: boolean;
}

export type JobStatus =
  | 'Received'
  | 'Awaiting Inspection'
  | 'Awaiting Quotation Approval'
  | 'Awaiting Spare Parts'
  | 'Ready to Start'
  | 'In Progress'
  | 'Quality Check'
  | 'Ready for Delivery'
  | 'Completed'
  | 'Cancelled';

export const JOB_STATUSES: JobStatus[] = [
  'Received',
  'Awaiting Inspection',
  'Awaiting Quotation Approval',
  'Awaiting Spare Parts',
  'Ready to Start',
  'In Progress',
  'Quality Check',
  'Ready for Delivery',
  'Completed',
  'Cancelled',
];

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface VehiclePhoto {
  id: string;
  url: string;
  caption?: string;
  capturedAt: string;
}

export interface SparePartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  availability: 'Required' | 'Ordered' | 'Available' | 'Installed';
  supplier?: string;
}

export type ItemAction = 'Repair' | 'Replace';

export interface PriceItem {
  id: string;
  name: string;
  amount: number;
  action?: ItemAction;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: 'Cash' | 'Credit/Debit Card' | 'Bank Transfer' | 'Telebirr / Mobile Money' | 'Cheque';
  date: string;
  recordedBy: string;
  reference?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  userRole?: UserRole;
  details: string;
  type: 'status' | 'price' | 'assignment' | 'intake' | 'checklist' | 'inspection' | 'payment' | 'sms';
}

export interface SmsDispatchRecord {
  id: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  sentAt: string;
  status: 'Delivered' | 'Sent';
}

export interface JobRecord {
  id: string;
  jobNumber: string; // e.g. FEY-2026-001
  status: JobStatus;
  isDraft?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;

  // Vehicle and customer info
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  plateNumber: string;
  vin: string;
  mileage: number | null;
  color?: string;
  receivedAt: string;
  expectedDeliveryDate?: string;

  // Repair info
  customerProblem: string;
  repairDescription: string;
  initialInspectionNotes: string;
  sparePartsRequiredNotes: string;
  additionalNotes?: string;
  vehicleConditionOnArrival: string;

  // Insurance info
  hasInsurance: boolean;
  insuranceCompany?: string;
  claimNumber?: string;
  insuranceApprovalStatus?: 'Pending' | 'Approved' | 'Rejected' | 'N/A';

  // Official Feyamet Physical Job Card fields (from original workshop form)
  vehicleType?: string;
  engineNo?: string;
  privatePaint?: string;
  privateMechanic?: string;
  remarks?: string;
  conditionChecklist?: Record<string, string>;
  jobCardSignatures?: {
    betagash?: string;
    baletafi?: string;
    mechanic?: string;
    paint?: string;
    handoverName?: string;
    handoverSign?: string;
    receivedName?: string;
    receivedSign?: string;
  };

  // Vehicle photos
  photos: VehiclePhoto[];

  // Assignment & team
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  assignedMechanicId?: string | null;
  assignedMechanicName?: string | null;
  assignedMechanicPhone?: string | null;
  priority: Priority;
  targetCompletionDate?: string;
  assignedBy?: string;
  assignedAt?: string;

  // SMS task dispatches to mechanic phones
  smsDispatches: SmsDispatchRecord[];

  // Finance details
  laborCost: number;
  sparePartsCost: number;
  additionalServiceCost: number;
  otherCharges: number;
  discount: number;
  taxRate: number; // e.g. 15 for 15%
  totalEstimatedCost: number;
  finalApprovedPrice: number;
  actualFinalCost: number;
  quotationStatus: 'Draft' | 'Awaiting Approval' | 'Approved' | 'Rejected';
  quotationDate?: string;
  quotationValidityDays: number;
  quotationNotes?: string;
  spareParts: SparePartItem[];
  priceItems?: PriceItem[];
  payments: PaymentRecord[];
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';

  // Manager inspection & execution tracking
  checklist: ChecklistItem[];
  inspectionApprovedAt?: string;
  inspectionApprovedBy?: string;
  inspectionNotes?: string;
  completedAt?: string;
  managerWarningNote?: string;

  // Audit history
  auditTrail: AuditLogEntry[];
}

export interface MechanicTeam {
  id: string;
  name: string;
  leadMechanicName: string;
  leadMechanicPhone: string;
  memberNames: string[];
  activeJobIds: string[];
}

export interface NotificationItem {
  id: string;
  targetRole?: UserRole;
  targetUserId?: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  jobId?: string;
  jobNumber?: string;
  type: 'assignment' | 'completion' | 'delay' | 'parts' | 'priority' | 'approval' | 'sms';
}

export interface GarageSettings {
  garageName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  defaultTaxRate: number;
  quoteValidityDays: number;
  smsSenderId: string;
  smsGatewayEnabled: boolean;
}

export type ToolCategory =
  | 'Wrench'
  | 'Power'
  | 'Diagnostic'
  | 'Lifting'
  | 'Body'
  | 'Other';

export interface WorkshopTool {
  id: string;
  code: string; // e.g. TL-001
  name: string; // e.g. Pneumatic Impact Wrench 1/2"
  category: ToolCategory;
  description?: string;
  totalQuantity: number;
  availableQuantity: number;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Service';
  locationRack: string; // e.g. "Rack A-1", "Locker 3"
  addedAt: string;
  addedBy?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  addedAt: string;
  addedBy?: string;
}

export interface MaterialIssueRecord {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;

  mechanicId: string;
  mechanicName: string;
  teamId?: string;
  teamName?: string;

  quantity: number;
  issuedByStaffName: string;
  issuedAt: string;

  status: 'Issued' | 'Returned';
  returnedAt?: string;
  receivedByStaffName?: string;
  notes?: string;
}

export type PartsRequestStatus =
  | 'Pending'
  | 'Issued'
  | 'Ordered Outside'
  | 'Received'
  | 'Cancelled';

export interface PartsRequest {
  id: string;
  jobId: string;
  jobNumber: string;
  vehiclePlate: string;
  vehicleName: string;
  itemName: string;
  quantity: number;
  note?: string;
  status: PartsRequestStatus;
  source?: 'Store' | 'Outside';
  materialId?: string;
  requestedBy: string;
  requestedAt: string;
  handledBy?: string;
  handledAt?: string;
}

export interface ToolCheckoutRecord {
  id: string;
  toolId: string;
  toolCode: string;
  toolName: string;
  toolCategory: string;

  // Mechanics & Team assignment
  mechanicId: string;
  mechanicName: string;
  teamId?: string;
  teamName?: string;

  // Quantity issued in this record
  quantity?: number;

  // Store Keeper issuing details
  issuedByStaffName: string;
  issuedAt: string;

  // Optional job / vehicle link
  jobId?: string;
  jobNumber?: string;
  vehiclePlate?: string;

  // Return tracking
  status: 'Checked Out' | 'Returned' | 'Damaged' | 'Lost' | 'Overdue';
  returnedAt?: string;
  receivedByStaffName?: string;
  returnCondition?: 'Excellent' | 'Good' | 'Fair' | 'Damaged / Needs Repair';
  notes?: string;
}

export type ToolDisposition = 'Returned' | 'Damaged' | 'Lost';

// ==========================================
// PAYROLL & EXPENSES
// ==========================================

export type WorkerCategory = 'Body' | 'Mechanic' | 'Electrical';

export const WORKER_CATEGORIES: WorkerCategory[] = ['Body', 'Mechanic', 'Electrical'];

/** Admin/Finance base rate for a worker, stored separately from the mechanic directory. */
export interface SalaryProfile {
  id: string;
  mechanicId: string;
  workerName: string;
  category: WorkerCategory;
  weeklySalary: number;
  active: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface SalaryEntry {
  id: string;
  mechanicId: string;
  workerName: string;
  category: WorkerCategory;
  baseSalary: number;
  carriedIn: number;
  adjustment: number;
  amount: number;
  paid: boolean;
  paidAt?: string;
  paidBy?: string;
  expenseId?: string;
}

export interface SalaryWeek {
  id: string;
  weekStart: string;
  payday: string;
  status: 'Open' | 'Closed';
  entries: SalaryEntry[];
  closedAt?: string;
}

export type ExpenseCategory = 'Salary' | 'Material' | 'Utilities' | 'Rent' | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Salary',
  'Material',
  'Utilities',
  'Rent',
  'Other',
];

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  createdBy: string;
  source: 'salary' | 'manual';
  salaryEntryId?: string;
  salaryWeekId?: string;
  workerName?: string;
  createdAt: string;
}

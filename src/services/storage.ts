import {
  AuditLogEntry,
  GarageSettings,
  JobRecord,
  JobStatus,
  MaterialItem,
  MaterialIssueRecord,
  PartsRequest,
  MechanicStaff,
  MechanicTeam,
  NotificationItem,
  PriceItem,
  SmsDispatchRecord,
  User,
  Language,
  WorkshopTool,
  ToolCategory,
  ToolCheckoutRecord,
  ExpenseRecord,
  SalaryProfile,
  SalaryWeek,
  WorkerCategory,
} from '../types';
import { DEFAULT_PARTS_REQUESTS, SAMPLE_2_MONTHS_JOBS, WAITING_SAMPLE_JOBS } from './sampleData';
import {
  DEFAULT_TOOLS,
  DEFAULT_TOOL_CHECKOUTS,
  DEFAULT_MATERIALS,
  ITALIAN_TOOL_NAMES,
} from './storeInventoryData';
import { canManagePricing, canManagePriceList, canManageStore } from './permissions';
import {
  DEFAULT_SALARY_PROFILES,
  currentWeekStart,
  dateKey,
  guessWorkerCategory,
  paydayForWeekStart,
} from './payroll';

const STORAGE_KEYS = {
  JOBS: 'feyamet_garage_jobs_v11',
  WAITING_SAMPLES: 'feyamet_waiting_samples_v1',
  USERS: 'feyamet_garage_users_v3',
  TEAMS: 'feyamet_garage_teams_v2',
  MECHANIC_DIRECTORY: 'feyamet_mechanic_dir_v2',
  NOTIFICATIONS: 'feyamet_garage_notifications_v2',
  SETTINGS: 'feyamet_garage_settings_v2',
  CURRENT_USER: 'feyamet_current_user_v2',
  TOOLS: 'feyamet_garage_tools_v1',
  TOOL_CHECKOUTS: 'feyamet_garage_tool_checkouts_v1',
  TOOL_NAME_MIGRATION: 'feyamet_tool_names_it_v1',
  MATERIALS: 'feyamet_garage_materials_v1',
  MATERIAL_ISSUES: 'feyamet_material_issues_v1',
  PARTS_REQUESTS: 'feyamet_parts_requests_v1',
  PARTS_REQUEST_SAMPLES: 'feyamet_parts_request_samples_v1',
  PRICE_ITEMS: 'feyamet_garage_price_items_v1',
  SALARY_PROFILES: 'feyamet_salary_profiles_v1',
  SALARY_WEEKS: 'feyamet_salary_weeks_v1',
  EXPENSES: 'feyamet_expenses_v1',
};

// Older builds stored long tool group names. Keep saved floors working.
const LEGACY_TOOL_CATEGORIES: Record<string, ToolCategory> = {
  'Pneumatic / Air': 'Power',
  'Diagnostics & Electrical': 'Diagnostic',
  'Lifting & Heavy Bay': 'Lifting',
  'Hand & Torque': 'Wrench',
  'Specialty & Engine': 'Other',
  'Body & Paint': 'Body',
};

const normalizeToolCategory = (category: string): ToolCategory =>
  LEGACY_TOOL_CATEGORIES[category] || (category as ToolCategory);

// Fixed price list managed by the Admin (tap-to-add items on Finance)
export const DEFAULT_PRICE_ITEMS: PriceItem[] = [
  { id: 'price-service', name: 'Service', amount: 1500 },
  { id: 'price-oil', name: 'Oil Change', amount: 2500 },
  { id: 'price-tire', name: 'Tire', amount: 3500 },
  { id: 'price-brake', name: 'Brake Pad', amount: 2800 },
  { id: 'price-battery', name: 'Battery', amount: 4500 },
  { id: 'price-tuneup', name: 'Engine Tune-Up', amount: 4000 },
  { id: 'price-acgas', name: 'A/C Gas Recharge', amount: 2800 },
  { id: 'price-alignment', name: 'Wheel Alignment', amount: 1200 },
];

// Initial default settings with SMS gateway
export const DEFAULT_SETTINGS: GarageSettings = {
  garageName: 'Feyamet Auto Garage',
  address: 'Bole Road, Near Airport Cargo Terminal, Addis Ababa, Ethiopia',
  phone: '+251 911 234 567 / +251 116 789 012',
  email: 'service@feyametgarage.com',
  taxId: 'TIN-0048921458',
  currency: 'ETB',
  defaultTaxRate: 15,
  quoteValidityDays: 14,
  smsSenderId: 'FEYAMET',
  smsGatewayEnabled: true,
};

// Authorized management staff users (Admin, Reception, Finance, Manager, Store Keeper)
export const DEFAULT_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Abebe Tadesse',
    email: 'admin@feyamet.com',
    role: 'admin',
    phone: '+251 911 100 001',
    isActive: true,
  },
  {
    id: 'user-manager',
    name: 'Michael Girma',
    email: 'manager@feyamet.com',
    role: 'manager',
    phone: '+251 911 100 004',
    isActive: true,
  },
  {
    id: 'user-storekeeper',
    name: 'Tigist Alemu',
    email: 'storekeeper@feyamet.com',
    role: 'storekeeper',
    phone: '+251 911 100 005',
    isActive: true,
  },
  {
    id: 'user-reception',
    name: 'Selamawit Kebede',
    email: 'reception@feyamet.com',
    role: 'reception',
    phone: '+251 911 100 002',
    isActive: true,
  },
  {
    id: 'user-finance',
    name: 'Biruk Hailu',
    email: 'finance@feyamet.com',
    role: 'finance',
    phone: '+251 911 100 003',
    isActive: true,
  },
];

// Workshop mechanics phone directory for direct SMS task dispatch
export const DEFAULT_MECHANICS: MechanicStaff[] = [
  {
    id: 'mech-sami',
    name: 'Mechanic Sami',
    phone: '+251 911 200 001',
    specialty: 'Engine & Transmission Specialist (Lead)',
    teamId: 'team-a',
    isActive: true,
  },
  {
    id: 'mech-yeabsira',
    name: 'Yeabsira Mekbeb',
    phone: '+251 911 200 002',
    specialty: 'Suspension & Brake Technician',
    teamId: 'team-a',
    isActive: true,
  },
  {
    id: 'mech-dawit',
    name: 'Dawit Solomon',
    phone: '+251 911 200 003',
    specialty: 'Electrical & AC Specialist',
    teamId: 'team-a',
    isActive: true,
  },
  {
    id: 'mech-ermiya',
    name: 'Mechanic Ermiya',
    phone: '+251 911 200 004',
    specialty: 'General Mechanical Diagnostics (Lead)',
    teamId: 'team-b',
    isActive: true,
  },
];

// Mechanic teams with direct phone numbers for SMS dispatch
export const DEFAULT_TEAMS: MechanicTeam[] = [
  {
    id: 'team-a',
    name: 'Team A — Mechanic Sami',
    leadMechanicName: 'Mechanic Sami',
    leadMechanicPhone: '+251 911 200 001',
    memberNames: ['Mechanic Sami', 'Yeabsira Mekbeb', 'Dawit Solomon'],
    activeJobIds: ['job-1', 'job-4'],
  },
  {
    id: 'team-b',
    name: 'Team B — Mechanic Ermiya',
    leadMechanicName: 'Mechanic Ermiya',
    leadMechanicPhone: '+251 911 200 004',
    memberNames: ['Mechanic Ermiya'],
    activeJobIds: ['job-2'],
  },
];

const SAMPLE_INSPECTION_PHOTO = '/src/assets/images/sample_vehicle_inspection_1792171403654.jpg';

export const DEFAULT_JOBS: JobRecord[] = SAMPLE_2_MONTHS_JOBS;

export class StorageService {
  private static subscribers: Array<() => void> = [];

  static subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private static notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }

  static getJobs(): JobRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) {
      const seeded = [...DEFAULT_JOBS, ...WAITING_SAMPLE_JOBS];
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(seeded));
      localStorage.setItem(STORAGE_KEYS.WAITING_SAMPLES, 'added');
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 6) {
        return this.withWaitingSamples(parsed as JobRecord[]);
      }
      const seeded = [...DEFAULT_JOBS, ...WAITING_SAMPLE_JOBS];
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(seeded));
      localStorage.setItem(STORAGE_KEYS.WAITING_SAMPLES, 'added');
      return seeded;
    } catch {
      return DEFAULT_JOBS;
    }
  }

  /** Adds the waiting-list demo jobs once to existing installs, without touching saved records. */
  private static withWaitingSamples(jobs: JobRecord[]): JobRecord[] {
    if (localStorage.getItem(STORAGE_KEYS.WAITING_SAMPLES)) return jobs;
    const existingIds = new Set(jobs.map((job) => job.id));
    const missing = WAITING_SAMPLE_JOBS.filter((job) => !existingIds.has(job.id));
    const merged = missing.length > 0 ? [...jobs, ...missing] : jobs;
    if (missing.length > 0) {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(merged));
    }
    localStorage.setItem(STORAGE_KEYS.WAITING_SAMPLES, 'added');
    return merged;
  }

  static saveJobs(jobs: JobRecord[]) {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    this.notify();
  }

  static resetTo2MonthsSampleData(): JobRecord[] {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(DEFAULT_JOBS));
    this.notify();
    return DEFAULT_JOBS;
  }

  static getJobById(id: string): JobRecord | undefined {
    return this.getJobs().find((j) => j.id === id);
  }

  /**
   * Data-layer rule: only Finance/Admin may change money fields.
   * For other roles (reception, manager, storekeeper) pricing is preserved
   * from the stored record, and new jobs are always created with zero cost.
   */
  private static guardPricing(incoming: JobRecord, existing?: JobRecord): JobRecord {
    if (canManagePricing(this.getCurrentUser()?.role)) return incoming;

    if (!existing) {
      return {
        ...incoming,
        laborCost: 0,
        sparePartsCost: 0,
        additionalServiceCost: 0,
        otherCharges: 0,
        discount: 0,
        taxRate: 0,
        totalEstimatedCost: 0,
        finalApprovedPrice: 0,
        actualFinalCost: 0,
        quotationStatus: 'Draft',
        quotationDate: undefined,
        quotationValidityDays: 0,
        quotationNotes: undefined,
        payments: [],
        paymentStatus: 'Unpaid',
        priceItems: (incoming.priceItems || []).map((item) => ({ ...item, amount: 0 })),
      };
    }

    const storedAmounts = new Map((existing.priceItems || []).map((i) => [i.id, i.amount]));
    return {
      ...incoming,
      laborCost: existing.laborCost,
      sparePartsCost: existing.sparePartsCost,
      additionalServiceCost: existing.additionalServiceCost,
      otherCharges: existing.otherCharges,
      discount: existing.discount,
      taxRate: existing.taxRate,
      totalEstimatedCost: existing.totalEstimatedCost,
      finalApprovedPrice: existing.finalApprovedPrice,
      actualFinalCost: existing.actualFinalCost,
      quotationStatus: existing.quotationStatus,
      quotationDate: existing.quotationDate,
      quotationValidityDays: existing.quotationValidityDays,
      quotationNotes: existing.quotationNotes,
      payments: existing.payments,
      paymentStatus: existing.paymentStatus,
      priceItems: (incoming.priceItems || []).map((item) => ({
        ...item,
        amount: storedAmounts.get(item.id) ?? 0,
      })),
    };
  }

  static saveJob(job: JobRecord) {
    const jobs = this.getJobs();
    const index = jobs.findIndex((j) => j.id === job.id);
    const existing = index >= 0 ? jobs[index] : undefined;
    const safeJob = this.guardPricing(job, existing);
    if (index >= 0) {
      jobs[index] = { ...safeJob, updatedAt: new Date().toISOString() };
    } else {
      jobs.unshift({ ...safeJob, updatedAt: new Date().toISOString() });
    }
    this.saveJobs(jobs);
  }

  /**
   * Explicit finance write path. Returns false when the signed-in user
   * is not allowed to set prices (enforced at the data layer, not the UI).
   */
  static saveJobPricing(jobId: string, patch: Partial<JobRecord>): boolean {
    if (!canManagePricing(this.getCurrentUser()?.role)) return false;
    const jobs = this.getJobs();
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index < 0) return false;
    jobs[index] = { ...jobs[index], ...patch, updatedAt: new Date().toISOString() };
    this.saveJobs(jobs);
    return true;
  }

  static deleteJob(id: string, performedBy: string): boolean {
    const jobs = this.getJobs();
    const filtered = jobs.filter((j) => j.id !== id);
    if (filtered.length !== jobs.length) {
      this.saveJobs(filtered);
      return true;
    }
    return false;
  }

  static getNextJobNumber(): string {
    const jobs = this.getJobs();
    const year = new Date().getFullYear();
    const prefix = `FEY-${year}-`;
    const numbers = jobs
      .map((j) => {
        if (j.jobNumber && j.jobNumber.startsWith(prefix)) {
          const num = parseInt(j.jobNumber.replace(prefix, ''), 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((n) => n > 0);
    const max = numbers.length > 0 ? Math.max(...numbers) : 5;
    const next = max + 1;
    return `${prefix}${next.toString().padStart(3, '0')}`;
  }

  // Dispatch direct task SMS to mechanic's mobile phone
  static dispatchTaskSms(
    jobId: string,
    recipientName: string,
    recipientPhone: string,
    performedBy: string,
    customMessage?: string
  ): SmsDispatchRecord | null {
    const job = this.getJobById(jobId);
    if (!job) return null;

    // Fallback message keeps to the essentials only: job/plate header,
    // description, remark and the items that need fixing (Repair/Replace).
    const requirementLines = (job.priceItems || [])
      .filter((item) => item.name.trim())
      .map((item) => `${item.name}${item.action ? ` (${item.action})` : ''}`);
    const fixes =
      requirementLines.length > 0
        ? requirementLines
        : Object.entries(job.conditionChecklist || {})
            .filter(([, code]) => !!code && code !== '✓')
            .map(([item, code]) => `${item} (${code})`);
    const remark = (job.remarks || job.initialInspectionNotes || '').trim();
    const message =
      customMessage ||
      [
        `[FEYAMET] Job ${job.jobNumber} | Plate ${job.plateNumber}`,
        `Description: ${job.repairDescription || job.customerProblem}`,
        remark ? `Remark: ${remark}` : '',
        `Items to fix: ${fixes.length > 0 ? fixes.join(', ') : 'none flagged'}`,
      ]
        .filter(Boolean)
        .join('\n');

    const smsRecord: SmsDispatchRecord = {
      id: `sms-${Date.now()}`,
      recipientName,
      recipientPhone,
      message,
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Delivered',
    };

    const updatedJob: JobRecord = {
      ...job,
      smsDispatches: [smsRecord, ...(job.smsDispatches || [])],
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Task Dispatched via SMS',
          performedBy,
          details: `Direct SMS task sent to ${recipientName} (${recipientPhone}): "${message.substring(0, 60)}..."`,
          type: 'sms',
        },
        ...(job.auditTrail || []),
      ],
    };

    this.saveJob(updatedJob);
    return smsRecord;
  }

  static getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_USERS;
    }
  }

  static saveUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notify();
  }

  static updateUserLanguage(userId: string, language: Language): User | null {
    const users = this.getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) return null;

    const updated = { ...users[index], preferredLanguage: language };
    const nextUsers = [...users];
    nextUsers[index] = updated;
    this.saveUsers(nextUsers);

    const current = this.getCurrentUser();
    if (current?.id === userId) this.setCurrentUser(updated);
    return updated;
  }

  static getMechanics(): MechanicStaff[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MECHANIC_DIRECTORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MECHANIC_DIRECTORY, JSON.stringify(DEFAULT_MECHANICS));
      return DEFAULT_MECHANICS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MECHANICS;
    }
  }

  static saveMechanics(mechanics: MechanicStaff[]) {
    localStorage.setItem(STORAGE_KEYS.MECHANIC_DIRECTORY, JSON.stringify(mechanics));
    this.notify();
  }

  static getTeams(): MechanicTeam[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(DEFAULT_TEAMS));
      return DEFAULT_TEAMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TEAMS;
    }
  }

  static saveTeams(teams: MechanicTeam[]) {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    this.notify();
  }

  static getNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveNotifications(notifications: NotificationItem[]) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    this.notify();
  }

  static addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) {
    const notifications = this.getNotifications();
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isRead: false,
    };
    this.saveNotifications([newNotif, ...notifications]);
  }

  static markNotificationRead(id: string) {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.saveNotifications(updated);
  }

  static markAllNotificationsRead(userRole: string) {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => {
      if (n.targetRole === userRole || !n.targetRole) {
        return { ...n, isRead: true };
      }
      return n;
    });
    this.saveNotifications(updated);
  }

  // ==========================================
  // FIXED PRICE LIST (Admin managed)
  // ==========================================
  static getPriceItems(): PriceItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRICE_ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRICE_ITEMS, JSON.stringify(DEFAULT_PRICE_ITEMS));
      return DEFAULT_PRICE_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PRICE_ITEMS;
    }
  }

  static savePriceItems(items: PriceItem[]) {
    if (!canManagePriceList(this.getCurrentUser()?.role)) return;
    localStorage.setItem(STORAGE_KEYS.PRICE_ITEMS, JSON.stringify(items));
    this.notify();
  }

  static addPriceItem(item: Omit<PriceItem, 'id'>) {
    const items = this.getPriceItems();
    const newItem: PriceItem = {
      ...item,
      id: `price-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.savePriceItems([...items, newItem]);
    return newItem;
  }

  static updatePriceItem(updated: PriceItem) {
    const items = this.getPriceItems();
    this.savePriceItems(items.map((i) => (i.id === updated.id ? updated : i)));
  }

  static deletePriceItem(id: string) {
    const items = this.getPriceItems();
    this.savePriceItems(items.filter((i) => i.id !== id));
  }

  static resetPriceItems() {
    this.savePriceItems(DEFAULT_PRICE_ITEMS);
  }

  static getSettings(): GarageSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: GarageSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify();
  }

  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  static exportFullBackup(): string {
    const dump = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      jobs: this.getJobs(),
      users: this.getUsers(),
      mechanics: this.getMechanics(),
      teams: this.getTeams(),
      settings: this.getSettings(),
      priceItems: this.getPriceItems(),
      tools: this.getWorkshopTools(),
      toolCheckouts: this.getToolCheckouts(),
      materials: this.getMaterials(),
      materialIssues: this.getMaterialIssues(),
      partsRequests: this.getPartsRequests(),
      salaryProfiles: this.getSalaryProfiles(),
      salaryWeeks: this.getSalaryWeeks(),
      expenses: this.getExpenses(),
    };
    return JSON.stringify(dump, null, 2);
  }

  static importBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.jobs || !parsed.users) {
        return { success: false, error: 'Invalid backup structure. Required keys missing.' };
      }
      this.saveJobs(parsed.jobs);
      this.saveUsers(parsed.users);
      if (parsed.mechanics) this.saveMechanics(parsed.mechanics);
      if (parsed.teams) this.saveTeams(parsed.teams);
      if (parsed.settings) this.saveSettings(parsed.settings);
      if (parsed.priceItems) this.savePriceItems(parsed.priceItems);
      if (parsed.tools) this.saveWorkshopTools(parsed.tools);
      if (parsed.toolCheckouts) this.saveToolCheckouts(parsed.toolCheckouts);
      if (parsed.materials) this.saveMaterials(parsed.materials);
      if (parsed.materialIssues) this.saveMaterialIssues(parsed.materialIssues);
      if (parsed.partsRequests) {
        this.savePartsRequests(parsed.partsRequests);
        localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
      }
      if (parsed.salaryProfiles) this.saveSalaryProfiles(parsed.salaryProfiles);
      if (parsed.salaryWeeks) this.saveSalaryWeeks(parsed.salaryWeeks);
      if (parsed.expenses) this.saveExpenses(parsed.expenses);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to parse JSON file' };
    }
  }

  // ==========================================
  // WORKSHOP TOOL STORE & CHECKOUT OPERATIONS
  // ==========================================
  private static migrateItalianToolNames() {
    if (localStorage.getItem(STORAGE_KEYS.TOOL_NAME_MIGRATION) === 'done') return;
    try {
      const rawTools = localStorage.getItem(STORAGE_KEYS.TOOLS);
      if (rawTools) {
        const tools: WorkshopTool[] = JSON.parse(rawTools);
        const renamed = tools.map((tool) =>
          ITALIAN_TOOL_NAMES[tool.code] ? { ...tool, name: ITALIAN_TOOL_NAMES[tool.code] } : tool
        );
        localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(renamed));
      }

      const rawCheckouts = localStorage.getItem(STORAGE_KEYS.TOOL_CHECKOUTS);
      if (rawCheckouts) {
        const checkouts: ToolCheckoutRecord[] = JSON.parse(rawCheckouts);
        const renamed = checkouts.map((checkout) =>
          ITALIAN_TOOL_NAMES[checkout.toolCode]
            ? { ...checkout, toolName: ITALIAN_TOOL_NAMES[checkout.toolCode] }
            : checkout
        );
        localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(renamed));
      }
    } catch {
      // Keep working even if a malformed local record is found.
    }
    localStorage.setItem(STORAGE_KEYS.TOOL_NAME_MIGRATION, 'done');
  }

  static getWorkshopTools(): WorkshopTool[] {
    this.migrateItalianToolNames();
    const raw = localStorage.getItem(STORAGE_KEYS.TOOLS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(DEFAULT_TOOLS));
      return DEFAULT_TOOLS;
    }
    try {
      const parsed: WorkshopTool[] = JSON.parse(raw);
      let changed = false;
      const migrated = parsed.map((tool) => {
        const category = normalizeToolCategory(tool.category);
        if (category !== tool.category) changed = true;
        return { ...tool, category };
      });
      if (changed) localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(migrated));
      return migrated;
    } catch {
      return DEFAULT_TOOLS;
    }
  }

  static saveWorkshopTools(tools: WorkshopTool[]) {
    localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(tools));
    this.notify();
  }

  static addWorkshopTool(tool: WorkshopTool) {
    const tools = this.getWorkshopTools();
    const updated = [tool, ...tools];
    this.saveWorkshopTools(updated);
    return tool;
  }

  static updateWorkshopTool(updatedTool: WorkshopTool) {
    const tools = this.getWorkshopTools();
    const updated = tools.map((t) => (t.id === updatedTool.id ? updatedTool : t));
    this.saveWorkshopTools(updated);
  }

  static deleteWorkshopTool(id: string): boolean {
    const tools = this.getWorkshopTools();
    const filtered = tools.filter((t) => t.id !== id);
    if (filtered.length !== tools.length) {
      this.saveWorkshopTools(filtered);
      return true;
    }
    return false;
  }

  static getToolCheckouts(): ToolCheckoutRecord[] {
    this.migrateItalianToolNames();
    const raw = localStorage.getItem(STORAGE_KEYS.TOOL_CHECKOUTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(DEFAULT_TOOL_CHECKOUTS));
      return DEFAULT_TOOL_CHECKOUTS;
    }
    try {
      const parsed: ToolCheckoutRecord[] = JSON.parse(raw);
      let changed = false;
      const migrated = parsed.map((checkout) => {
        const category = normalizeToolCategory(checkout.toolCategory);
        if (category !== checkout.toolCategory) changed = true;
        return { ...checkout, toolCategory: category };
      });
      if (changed) localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(migrated));
      return migrated;
    } catch {
      return DEFAULT_TOOL_CHECKOUTS;
    }
  }

  static saveToolCheckouts(checkouts: ToolCheckoutRecord[]) {
    localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(checkouts));
    this.notify();
  }

  static checkoutTool(
    toolId: string,
    mechanicId: string,
    mechanicName: string,
    teamId: string | undefined,
    teamName: string | undefined,
    issuedByStaffName: string,
    jobNumber?: string,
    notes?: string,
    quantity: number = 1,
    jobId?: string,
    vehiclePlate?: string
  ): ToolCheckoutRecord | null {
    const tools = this.getWorkshopTools();
    const tool = tools.find((t) => t.id === toolId);
    if (!tool || tool.availableQuantity <= 0) {
      return null;
    }

    const qty = Math.max(1, Math.min(quantity, tool.availableQuantity));
    tool.availableQuantity = Math.max(0, tool.availableQuantity - qty);
    this.saveWorkshopTools(tools);

    const record: ToolCheckoutRecord = {
      id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      toolId: tool.id,
      toolCode: tool.code,
      toolName: tool.name,
      toolCategory: tool.category,
      quantity: qty,
      mechanicId,
      mechanicName,
      teamId,
      teamName,
      issuedByStaffName,
      issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      jobId: jobId || undefined,
      jobNumber: jobNumber || undefined,
      vehiclePlate: vehiclePlate || undefined,
      status: 'Checked Out',
      notes: notes || `Issued ${qty} x ${tool.name} to ${mechanicName}${teamName ? ` (${teamName})` : ''}`,
    };

    const checkouts = this.getToolCheckouts();
    this.saveToolCheckouts([record, ...checkouts]);

    this.addNotification({
      targetRole: 'manager',
      title: `Tool Issued: ${tool.name}`,
      message: `${tool.code} x${qty} checked out by ${mechanicName}${teamName ? ` (${teamName})` : ''}. Store Keeper: ${issuedByStaffName}.`,
      type: 'assignment',
    });

    return record;
  }

  static returnTool(
    checkoutId: string,
    receivedByStaffName: string,
    disposition: ToolCheckoutRecord['status'] = 'Returned',
    returnCondition: ToolCheckoutRecord['returnCondition'] = 'Good',
    notes?: string
  ): boolean {
    const checkouts = this.getToolCheckouts();
    const checkout = checkouts.find((c) => c.id === checkoutId);
    if (!checkout || checkout.status !== 'Checked Out' && checkout.status !== 'Overdue') {
      return false;
    }

    checkout.status = disposition;
    checkout.returnedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    checkout.receivedByStaffName = receivedByStaffName;
    checkout.returnCondition = returnCondition;
    if (notes) checkout.notes = `${checkout.notes || ''} | Return: ${notes}`;

    this.saveToolCheckouts(checkouts);

    const tools = this.getWorkshopTools();
    const tool = tools.find((t) => t.id === checkout.toolId);
    if (tool) {
      const qty = checkout.quantity || 1;
      if (disposition === 'Returned') {
        // Only a clean return restores available stock.
        tool.availableQuantity = Math.min(tool.totalQuantity, tool.availableQuantity + qty);
      }
      if (disposition === 'Damaged' || returnCondition === 'Damaged / Needs Repair') {
        tool.condition = 'Needs Service';
      }
      this.saveWorkshopTools(tools);
    }

    this.addNotification({
      targetRole: 'manager',
      title: `Tool ${disposition}: ${checkout.toolName}`,
      message: `${checkout.toolCode} x${checkout.quantity || 1} - ${disposition} by ${checkout.mechanicName}. Received by: ${receivedByStaffName}.`,
      type: 'completion',
    });

    return true;
  }

  static getMaterials(): MaterialItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(DEFAULT_MATERIALS));
      return DEFAULT_MATERIALS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MATERIALS;
    }
  }

  static saveMaterials(materials: MaterialItem[]) {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    this.notify();
  }

  static addMaterial(material: Omit<MaterialItem, 'id' | 'addedAt'>): MaterialItem {
    const materials = this.getMaterials();
    const newItem: MaterialItem = {
      ...material,
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: new Date().toISOString().substring(0, 10),
    };
    this.saveMaterials([newItem, ...materials]);
    return newItem;
  }

  static updateMaterial(updated: MaterialItem) {
    this.saveMaterials(this.getMaterials().map((m) => (m.id === updated.id ? updated : m)));
  }

  static deleteMaterial(id: string): boolean {
    const materials = this.getMaterials();
    const filtered = materials.filter((m) => m.id !== id);
    if (filtered.length !== materials.length) {
      this.saveMaterials(filtered);
      return true;
    }
    return false;
  }

  static adjustMaterialQuantity(id: string, delta: number): MaterialItem | null {
    const materials = this.getMaterials();
    const item = materials.find((m) => m.id === id);
    if (!item) return null;
    item.quantity = Math.max(0, item.quantity + delta);
    this.saveMaterials(materials);
    return item;
  }

  static getMaterialIssues(): MaterialIssueRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MATERIAL_ISSUES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveMaterialIssues(issues: MaterialIssueRecord[]) {
    localStorage.setItem(STORAGE_KEYS.MATERIAL_ISSUES, JSON.stringify(issues));
    this.notify();
  }

  static issueMaterial(input: {
    materialId: string;
    mechanicId: string;
    mechanicName: string;
    teamId?: string;
    teamName?: string;
    issuedByStaffName: string;
    quantity: number;
  }): MaterialIssueRecord | null {
    if (!canManageStore(this.getCurrentUser()?.role)) return null;

    const materials = this.getMaterials();
    const material = materials.find((m) => m.id === input.materialId);
    if (!material) return null;

    const qty = Math.floor(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || material.quantity < qty) return null;

    material.quantity -= qty;
    this.saveMaterials(materials);

    const record: MaterialIssueRecord = {
      id: `mio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      mechanicId: input.mechanicId,
      mechanicName: input.mechanicName,
      teamId: input.teamId,
      teamName: input.teamName,
      quantity: qty,
      issuedByStaffName: input.issuedByStaffName,
      issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Issued',
      notes: `Issued ${qty} ${material.unit} x ${material.name} to ${input.mechanicName}${
        input.teamName ? ` (${input.teamName})` : ''
      }`,
    };

    this.saveMaterialIssues([record, ...this.getMaterialIssues()]);

    this.addNotification({
      targetRole: 'manager',
      title: `Material Issued: ${material.name}`,
      message: `${qty} ${material.unit} of ${material.name} given to ${input.mechanicName}${
        input.teamName ? ` (${input.teamName})` : ''
      }. Store Keeper: ${input.issuedByStaffName}.`,
      type: 'assignment',
    });

    return record;
  }

  static returnMaterial(issueId: string, receivedByStaffName: string): boolean {
    if (!canManageStore(this.getCurrentUser()?.role)) return false;

    const issues = this.getMaterialIssues();
    const issue = issues.find((i) => i.id === issueId && i.status === 'Issued');
    if (!issue) return false;

    const materials = this.getMaterials();
    const material = materials.find((m) => m.id === issue.materialId);
    if (material) {
      material.quantity += issue.quantity;
      this.saveMaterials(materials);
    }

    issue.status = 'Returned';
    issue.returnedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    issue.receivedByStaffName = receivedByStaffName;
    this.saveMaterialIssues(issues);

    return true;
  }

  // ==========================================
  // PARTS REQUESTS (Reception -> Store)
  // ==========================================
  static getPartsRequests(): PartsRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTS_REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(DEFAULT_PARTS_REQUESTS));
      localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
      return DEFAULT_PARTS_REQUESTS;
    }
    try {
      const parsed: PartsRequest[] = JSON.parse(raw);
      if (parsed.length === 0 && !localStorage.getItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES)) {
        localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(DEFAULT_PARTS_REQUESTS));
        localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
        return DEFAULT_PARTS_REQUESTS;
      }
      localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(DEFAULT_PARTS_REQUESTS));
      localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
      return DEFAULT_PARTS_REQUESTS;
    }
  }

  static savePartsRequests(requests: PartsRequest[]) {
    localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(requests));
    this.notify();
  }

  static addPartsRequest(input: {
    jobId: string;
    itemName: string;
    quantity: number;
    note?: string;
  }): PartsRequest | null {
    const user = this.getCurrentUser();
    if (!user || !['admin', 'reception', 'manager'].includes(user.role)) return null;

    const job = this.getJobById(input.jobId);
    const itemName = input.itemName.trim();
    const quantity = Math.max(1, Math.floor(Number(input.quantity) || 0));
    if (!job || !itemName || quantity <= 0) return null;

    const request: PartsRequest = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      vehiclePlate: job.plateNumber,
      vehicleName: `${job.vehicleMake} ${job.vehicleModel}`.trim(),
      itemName,
      quantity,
      note: input.note?.trim() || '',
      status: 'Pending',
      requestedBy: user.name,
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    this.savePartsRequests([request, ...this.getPartsRequests()]);

    this.addNotification({
      targetRole: 'storekeeper',
      title: `Parts Request - ${job.jobNumber}`,
      message: `${user.name} needs ${quantity} x ${itemName} for ${job.plateNumber}. Open Store > Requests.`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      type: 'parts',
    });
    this.addNotification({
      targetRole: 'manager',
      title: `Parts Request - ${job.jobNumber}`,
      message: `${user.name} sent a store request for ${quantity} x ${itemName} (${job.plateNumber}).`,
      jobId: job.id,
      jobNumber: job.jobNumber,
      type: 'parts',
    });

    return request;
  }

  static updatePartsRequest(
    id: string,
    action: 'issue-store' | 'order-outside' | 'mark-received'
  ): { ok: boolean; error?: string; request?: PartsRequest } {
    const user = this.getCurrentUser();
    if (!user || !['admin', 'storekeeper'].includes(user.role)) {
      return { ok: false, error: 'Only the Store Keeper can handle parts requests.' };
    }

    const requests = this.getPartsRequests();
    const request = requests.find((item) => item.id === id);
    if (!request) return { ok: false, error: 'This parts request was not found.' };

    if (action === 'issue-store') {
      if (request.status !== 'Pending') {
        return { ok: false, error: 'This request is already handled.' };
      }
      const materials = this.getMaterials();
      const material = materials.find(
        (item) => item.name.trim().toLowerCase() === request.itemName.trim().toLowerCase()
      );
      if (!material) {
        return {
          ok: false,
          error: `No "${request.itemName}" in store. Add it to Materials or use Order Outside.`,
        };
      }
      if (material.quantity < request.quantity) {
        return {
          ok: false,
          error: `Only ${material.quantity} ${material.unit} in store. Use Order Outside for the rest.`,
        };
      }
      material.quantity -= request.quantity;
      this.saveMaterials(materials);
      request.status = 'Issued';
      request.source = 'Store';
      request.materialId = material.id;
    } else if (action === 'order-outside') {
      if (request.status !== 'Pending') {
        return { ok: false, error: 'This request is already handled.' };
      }
      request.status = 'Ordered Outside';
      request.source = 'Outside';
    } else {
      if (request.status !== 'Ordered Outside') {
        return { ok: false, error: 'Only an outside order can be marked received.' };
      }
      request.status = 'Received';
    }

    request.handledBy = user.name;
    request.handledAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.savePartsRequests(requests);

    const outcome =
      action === 'issue-store'
        ? 'issued from store'
        : action === 'order-outside'
        ? 'ordered from outside'
        : 'received from outside';
    const message = `${request.quantity} x ${request.itemName} for ${request.jobNumber} (${request.vehiclePlate}) ${outcome}.`;

    this.addNotification({
      targetRole: 'reception',
      title: `Parts Update - ${request.jobNumber}`,
      message,
      jobId: request.jobId,
      jobNumber: request.jobNumber,
      type: 'parts',
    });
    this.addNotification({
      targetRole: 'manager',
      title: `Parts Update - ${request.jobNumber}`,
      message,
      jobId: request.jobId,
      jobNumber: request.jobNumber,
      type: 'parts',
    });

    return { ok: true, request };
  }

  // ==========================================
  // WEEKLY SALARY / PAYROLL
  // ==========================================
  static getSalaryProfiles(): SalaryProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALARY_PROFILES);
    let profiles: SalaryProfile[];
    let changed = false;
    if (!raw) {
      profiles = DEFAULT_SALARY_PROFILES.map((profile) => ({ ...profile }));
      changed = true;
    } else {
      try {
        profiles = JSON.parse(raw);
      } catch {
        profiles = DEFAULT_SALARY_PROFILES.map((profile) => ({ ...profile }));
        changed = true;
      }
    }

    // Include any mechanic that is not yet on the payroll list.
    this.getMechanics().forEach((mechanic) => {
      if (!profiles.some((profile) => profile.mechanicId === mechanic.id)) {
        profiles.push({
          id: `sal-${mechanic.id}`,
          mechanicId: mechanic.id,
          workerName: mechanic.name,
          category: guessWorkerCategory(mechanic.specialty),
          weeklySalary: 0,
          active: mechanic.isActive,
          updatedAt: dateKey(),
          updatedBy: 'System',
        });
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.SALARY_PROFILES, JSON.stringify(profiles));
    }
    return profiles;
  }

  static saveSalaryProfiles(profiles: SalaryProfile[]) {
    localStorage.setItem(STORAGE_KEYS.SALARY_PROFILES, JSON.stringify(profiles));
    this.notify();
  }

  static updateSalaryProfile(
    id: string,
    patch: Partial<Pick<SalaryProfile, 'workerName' | 'category' | 'weeklySalary' | 'active'>>
  ): boolean {
    if (!canManagePricing(this.getCurrentUser()?.role)) return false;
    const profiles = this.getSalaryProfiles();
    const index = profiles.findIndex((profile) => profile.id === id);
    if (index < 0) return false;
    profiles[index] = {
      ...profiles[index],
      ...patch,
      weeklySalary: Math.max(0, Number(patch.weeklySalary ?? profiles[index].weeklySalary) || 0),
      updatedAt: dateKey(),
      updatedBy: this.getCurrentUser()?.name,
    };
    this.saveSalaryProfiles(profiles);
    this.ensureCurrentSalaryWeek();
    return true;
  }

  static addSalaryWorker(
    name: string,
    category: WorkerCategory,
    weeklySalary: number
  ): SalaryProfile | null {
    const currentUser = this.getCurrentUser();
    if (!canManagePricing(currentUser?.role)) return null;
    const workerName = name.trim();
    if (!workerName) return null;
    const profiles = this.getSalaryProfiles();
    const profile: SalaryProfile = {
      id: `sal-worker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mechanicId: `worker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workerName,
      category,
      weeklySalary: Math.max(0, Number(weeklySalary) || 0),
      active: true,
      updatedAt: dateKey(),
      updatedBy: currentUser?.name,
    };
    this.saveSalaryProfiles([...profiles, profile]);
    this.ensureCurrentSalaryWeek();
    return profile;
  }

  static setSalaryWorkerActive(id: string, active: boolean): boolean {
    return this.updateSalaryProfile(id, { active });
  }

  static getSalaryWeeks(): SalaryWeek[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALARY_WEEKS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveSalaryWeeks(weeks: SalaryWeek[]) {
    localStorage.setItem(STORAGE_KEYS.SALARY_WEEKS, JSON.stringify(weeks));
    this.notify();
  }

  /**
   * Current payroll week runs Sunday -> Saturday. When the page is opened after
   * a Saturday, every older open week is closed, paid rows stay archived, and
   * unpaid money is carried into the new week.
   */
  static ensureCurrentSalaryWeek(): SalaryWeek {
    const profiles = this.getSalaryProfiles().filter((profile) => profile.active);
    const weeks = this.getSalaryWeeks();
    const weekStart = currentWeekStart();
    const payday = paydayForWeekStart(weekStart);
    let changed = false;
    let carried = new Map<string, number>();

    const staleWeeks = weeks
      .filter((week) => week.status === 'Open' && week.payday < weekStart)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    staleWeeks.forEach((week) => {
      const weekCarried = new Map<string, number>();
      week.entries.forEach((entry) => {
        if (!entry.paid && entry.amount > 0) {
          weekCarried.set(entry.mechanicId, (weekCarried.get(entry.mechanicId) || 0) + entry.amount);
        }
      });
      carried = weekCarried;
      week.status = 'Closed';
      week.closedAt = new Date().toISOString();
      changed = true;
    });

    let current = weeks.find((week) => week.weekStart === weekStart);

    if (!current) {
      current = {
        id: `salary-week-${weekStart}`,
        weekStart,
        payday,
        status: 'Open',
        entries: profiles.map((profile) => {
          const carriedIn = carried.get(profile.mechanicId) || 0;
          return {
            id: `salary-${weekStart}-${profile.mechanicId}`,
            mechanicId: profile.mechanicId,
            workerName: profile.workerName,
            category: profile.category,
            baseSalary: profile.weeklySalary,
            carriedIn,
            adjustment: 0,
            amount: profile.weeklySalary + carriedIn,
            paid: false,
          };
        }),
      };
      weeks.push(current);
      changed = true;
    } else {
      // Apply money carried from a week that was just closed (only once).
      if (carried.size > 0) {
        current.entries = current.entries.map((entry) => {
          const extra = carried.get(entry.mechanicId) || 0;
          if (!extra || entry.paid) return entry;
          const carriedIn = entry.carriedIn + extra;
          return {
            ...entry,
            carriedIn,
            amount: entry.baseSalary + carriedIn + entry.adjustment,
          };
        });
        changed = true;
      }

      // Keep active workers and rates in sync for the open week.
      profiles.forEach((profile) => {
        const existing = current!.entries.find(
          (entry) => entry.mechanicId === profile.mechanicId
        );
        if (!existing) {
          const carriedIn = 0;
          current!.entries.push({
            id: `salary-${weekStart}-${profile.mechanicId}`,
            mechanicId: profile.mechanicId,
            workerName: profile.workerName,
            category: profile.category,
            baseSalary: profile.weeklySalary,
            carriedIn,
            adjustment: 0,
            amount: profile.weeklySalary + carriedIn,
            paid: false,
          });
          changed = true;
        } else if (
          !existing.paid &&
          (existing.workerName !== profile.workerName ||
            existing.category !== profile.category ||
            existing.baseSalary !== profile.weeklySalary)
        ) {
          existing.workerName = profile.workerName;
          existing.category = profile.category;
          existing.baseSalary = profile.weeklySalary;
          existing.amount = profile.weeklySalary + existing.carriedIn + existing.adjustment;
          changed = true;
        }
      });
    }

    current.entries.sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.workerName.localeCompare(b.workerName)
    );

    if (changed) this.saveSalaryWeeks(weeks);
    return current;
  }

  static updateSalaryEntryAmount(weekId: string, entryId: string, amount: number): boolean {
    if (!canManagePricing(this.getCurrentUser()?.role)) return false;
    const weeks = this.getSalaryWeeks();
    const week = weeks.find((item) => item.id === weekId && item.status === 'Open');
    if (!week) return false;
    const entry = week.entries.find((item) => item.id === entryId);
    if (!entry || entry.paid) return false;
    const cleanAmount = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    entry.amount = cleanAmount;
    entry.adjustment = cleanAmount - entry.baseSalary - entry.carriedIn;
    this.saveSalaryWeeks(weeks);
    return true;
  }

  static setSalaryEntryPaid(
    weekId: string,
    entryId: string,
    paid: boolean,
    performedBy: string
  ): boolean {
    if (!canManagePricing(this.getCurrentUser()?.role)) return false;
    const weeks = this.getSalaryWeeks();
    const week = weeks.find((item) => item.id === weekId && item.status === 'Open');
    if (!week) return false;
    const entry = week.entries.find((item) => item.id === entryId);
    if (!entry) return false;

    const expenses = this.getExpenses();

    if (paid) {
      if (entry.paid) return true;
      entry.paid = true;
      entry.paidAt = new Date().toISOString();
      entry.paidBy = performedBy;

      let expense = expenses.find(
        (item) => item.salaryEntryId === entry.id && item.salaryWeekId === week.id
      );
      if (!expense) {
        expense = {
          id: `exp-salary-${entry.id}`,
          category: 'Salary',
          description: `Weekly salary - ${entry.workerName}`,
          amount: entry.amount,
          date: dateKey(),
          createdBy: performedBy,
          source: 'salary',
          salaryEntryId: entry.id,
          salaryWeekId: week.id,
          workerName: entry.workerName,
          createdAt: new Date().toISOString(),
        };
        expenses.unshift(expense);
      } else {
        expense.amount = entry.amount;
        expense.date = dateKey();
      }
      entry.expenseId = expense.id;
    } else {
      if (!entry.paid) return true;
      entry.paid = false;
      entry.paidAt = undefined;
      entry.paidBy = undefined;
      const index = expenses.findIndex(
        (item) => item.salaryEntryId === entry.id && item.salaryWeekId === week.id
      );
      if (index >= 0) expenses.splice(index, 1);
      entry.expenseId = undefined;
    }

    this.saveSalaryWeeks(weeks);
    this.saveExpenses(expenses);
    return true;
  }

  // ==========================================
  // EXPENSES LEDGER
  // ==========================================
  static getExpenses(): ExpenseRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveExpenses(expenses: ExpenseRecord[]) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    this.notify();
  }

  static addExpense(input: Omit<ExpenseRecord, 'id' | 'createdAt' | 'source'>): ExpenseRecord | null {
    const currentUser = this.getCurrentUser();
    if (!canManagePricing(currentUser?.role)) return null;
    if (!input.description.trim() || !input.amount || input.amount <= 0) return null;
    const record: ExpenseRecord = {
      ...input,
      description: input.description.trim(),
      amount: Math.round(Number(input.amount) * 100) / 100,
      source: 'manual',
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.saveExpenses([record, ...this.getExpenses()]);
    return record;
  }

  static deleteExpense(id: string): boolean {
    if (!canManagePricing(this.getCurrentUser()?.role)) return false;
    const expenses = this.getExpenses();
    const target = expenses.find((expense) => expense.id === id);
    if (!target || target.source === 'salary') return false;
    this.saveExpenses(expenses.filter((expense) => expense.id !== id));
    return true;
  }

  static resetPayrollData() {
    localStorage.setItem(
      STORAGE_KEYS.SALARY_PROFILES,
      JSON.stringify(DEFAULT_SALARY_PROFILES)
    );
    localStorage.setItem(STORAGE_KEYS.SALARY_WEEKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    this.notify();
  }

  static resetStoreTools() {
    localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(DEFAULT_TOOLS));
    localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(DEFAULT_TOOL_CHECKOUTS));
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(DEFAULT_MATERIALS));
    localStorage.setItem(STORAGE_KEYS.MATERIAL_ISSUES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(DEFAULT_PARTS_REQUESTS));
    localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
    this.notify();
  }

  static resetToDefaultData() {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(DEFAULT_JOBS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(DEFAULT_TEAMS));
    localStorage.setItem(STORAGE_KEYS.MECHANIC_DIRECTORY, JSON.stringify(DEFAULT_MECHANICS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.PRICE_ITEMS, JSON.stringify(DEFAULT_PRICE_ITEMS));
    localStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(DEFAULT_TOOLS));
    localStorage.setItem(STORAGE_KEYS.TOOL_CHECKOUTS, JSON.stringify(DEFAULT_TOOL_CHECKOUTS));
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(DEFAULT_MATERIALS));
    localStorage.setItem(STORAGE_KEYS.MATERIAL_ISSUES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PARTS_REQUESTS, JSON.stringify(DEFAULT_PARTS_REQUESTS));
    localStorage.setItem(STORAGE_KEYS.PARTS_REQUEST_SAMPLES, 'seeded');
    localStorage.setItem(
      STORAGE_KEYS.SALARY_PROFILES,
      JSON.stringify(DEFAULT_SALARY_PROFILES)
    );
    localStorage.setItem(STORAGE_KEYS.SALARY_WEEKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    this.notify();
  }
}

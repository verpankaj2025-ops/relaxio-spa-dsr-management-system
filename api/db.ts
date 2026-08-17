import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  created_at: string;
  password_hash?: string;
}

export interface DSREntryRow {
  id: number;
  customer_name: string;
  mobile_number: string;
  visit_date: string;
  time_in: string;
  therapy_name: string;
  staff_name: string;
  therapist_name?: string;
  amount: number;
  payment_mode: string;
  remarks?: string;
  created_by_user_id?: number | string;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface SettingsDict {
  spa_name: string;
  spa_address: string;
  spa_phone: string;
  spa_email: string;
  currency: string;
  [key: string]: string;
}

export interface DatabaseSchema {
  users: UserRow[];
  settings: SettingsDict;
  dsr_entries: DSREntryRow[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE_PATH = path.join(DATA_DIR, 'spa_database.json');
const AUDIT_LOG_PATH = path.join(DATA_DIR, 'db_audit.log');

const getTodayString = () => new Date().toISOString().split('T')[0];
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const DEFAULT_MANAGER_PASSWORD = process.env.DEFAULT_MANAGER_PASSWORD;
if (!DEFAULT_ADMIN_PASSWORD || !DEFAULT_MANAGER_PASSWORD) {
  console.error('Fatal: DEFAULT_ADMIN_PASSWORD and DEFAULT_MANAGER_PASSWORD must be set in the environment');
  throw new Error('DEFAULT_ADMIN_PASSWORD and DEFAULT_MANAGER_PASSWORD environment variables are required');
}

const hashSeedValue = (value: string) => bcrypt.hashSync(value, 12);

const buildSeedUsers = (): UserRow[] => [
  {
    id: 1,
    name: 'Super Admin',
    email: 'admin@thecloudspa.in',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    password_hash: hashSeedValue(DEFAULT_ADMIN_PASSWORD),
  },
  {
    id: 2,
    name: 'Spa Manager',
    email: 'manager@thecloudspa.in',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    password_hash: hashSeedValue(DEFAULT_MANAGER_PASSWORD),
  },
];

const defaultDatabase: DatabaseSchema = {
  users: buildSeedUsers(),
  settings: {
    spa_name: 'The Cloud Spa',
    spa_address: '4/526 Vivek Khand, Gomti Nagar, Lucknow, 226010, India',
    spa_phone: '9455671995',
    spa_email: 'info@thecloudspa.in',
    currency: 'INR',
  },
  dsr_entries: [
    {
      id: 101,
      customer_name: 'Aarav Sharma',
      mobile_number: '9876543210',
      visit_date: getTodayString(),
      time_in: '10:30',
      therapy_name: 'Deep Tissue Massage',
      staff_name: 'Ananya Roy',
      therapist_name: 'Ananya Roy',
      amount: 2500,
      payment_mode: 'UPI',
      remarks: 'Regular client',
      created_by_user_id: 1,
      created_by_name: 'Super Admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      customer_name: 'Priya Patel',
      mobile_number: '9812345678',
      visit_date: getTodayString(),
      time_in: '11:15',
      therapy_name: 'Swedish Massage',
      staff_name: 'Rahul Verma',
      therapist_name: 'Rahul Verma',
      amount: 2000,
      payment_mode: 'Cash',
      remarks: 'First visit',
      created_by_user_id: 1,
      created_by_name: 'Super Admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 103,
      customer_name: 'Vikram Malhotra',
      mobile_number: '9988776655',
      visit_date: getTodayString(),
      time_in: '12:00',
      therapy_name: 'Aromatherapy Session',
      staff_name: 'Ananya Roy',
      therapist_name: 'Ananya Roy',
      amount: 3200,
      payment_mode: 'Card',
      remarks: 'Requested extra pressure',
      created_by_user_id: 2,
      created_by_name: 'Spa Manager',
      created_at: new Date().toISOString(),
    },
  ],
};

const validateNonEmptyString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${fieldName}: expected a non-empty string.`);
  }
  return value.trim();
};

const validateEmail = (value: unknown) => {
  const email = validateNonEmptyString(value, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format.');
  }
  return email.toLowerCase();
};

const validatePositiveNumber = (value: unknown, fieldName: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Invalid ${fieldName}: expected a positive number.`);
  }
  return number;
};

let lastGeneratedId = 1000;
const generateSafeNumericId = (): number => {
  // Keep numeric IDs for compatibility with existing public APIs; avoid Date.now-only collisions by combining time + counter.
  lastGeneratedId += 1;
  return Number(`${Date.now()}${String(lastGeneratedId).padStart(6, '0')}`.slice(0, 15));
};

class FileDatabaseManager {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.db = this.loadFromDisk();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  private seedUsersIfNeeded() {
    if (!Array.isArray(this.db.users) || this.db.users.length === 0) {
      this.db.users = buildSeedUsers();
    }

    const adminExists = this.db.users.some(u => u.email.toLowerCase() === 'admin@thecloudspa.in');
    if (!adminExists) {
      this.db.users.unshift({
        ...buildSeedUsers()[0],
        id: generateSafeNumericId(),
      });
    }

    const managerExists = this.db.users.some(u => u.email.toLowerCase() === 'manager@thecloudspa.in');
    if (!managerExists) {
      this.db.users.push({
        ...buildSeedUsers()[1],
        id: generateSafeNumericId(),
      });
    }
  }

  private createBackup(): string | null {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `spa_database-${timestamp}.backup.json`);
    fs.copyFileSync(DB_FILE_PATH, backupPath);
    return backupPath;
  }

  private redactAuditPayload<T extends Record<string, unknown>>(payload: T): T {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const sanitized = { ...payload };
    delete sanitized.password_hash;
    return sanitized as T;
  }

  private appendAuditLog(action: 'create' | 'update' | 'delete', entity: string, recordId: number | string, details: Record<string, unknown> = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        entity,
        id: recordId,
        details: {
          ...details,
          before: details.before ? this.redactAuditPayload(details.before as Record<string, unknown>) : undefined,
          after: details.after ? this.redactAuditPayload(details.after as Record<string, unknown>) : undefined,
          deleted: details.deleted ? this.redactAuditPayload(details.deleted as Record<string, unknown>) : undefined,
          record: details.record ? this.redactAuditPayload(details.record as Record<string, unknown>) : undefined,
        },
      };
      fs.appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(logEntry)}\n`, 'utf-8');
    } catch (err) {
      console.warn('Failed to write audit log:', err);
    }
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const normalized: DatabaseSchema = {
          users: Array.isArray(parsed.users) ? parsed.users : defaultDatabase.users,
          settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : defaultDatabase.settings,
          dsr_entries: Array.isArray(parsed.dsr_entries) ? parsed.dsr_entries : defaultDatabase.dsr_entries,
        };
        this.db = normalized;
        this.seedUsersIfNeeded();
        return this.db;
      }
    } catch (err) {
      console.warn('Failed to load DB file from disk, using default seed:', err);
    }
    this.db = JSON.parse(JSON.stringify(defaultDatabase));
    this.saveToDisk(this.db);
    return this.db;
  }

  private saveToDisk(data: DatabaseSchema = this.db) {
    try {
      this.ensureDirectoryExists();
      this.createBackup();
      const tempFilePath = path.join(DATA_DIR, `spa_database.${process.pid}.${Date.now()}.tmp`);
      fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFilePath, DB_FILE_PATH);
    } catch (err) {
      console.error('Failed to save DB file to disk:', err);
      throw err;
    }
  }

  // --- ENTRIES CRUD ---
  public getEntries(filters?: {
    startDate?: string;
    endDate?: string;
    paymentMode?: string;
    staffName?: string;
    searchTerm?: string;
  }): DSREntryRow[] {
    let list = [...this.db.dsr_entries];

    if (filters?.startDate) {
      list = list.filter(e => e.visit_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter(e => e.visit_date <= filters.endDate!);
    }
    if (filters?.paymentMode && filters.paymentMode.toUpperCase() !== 'ALL') {
      list = list.filter(e => e.payment_mode.toLowerCase() === filters.paymentMode!.toLowerCase());
    }
    if (filters?.staffName && filters.staffName.toUpperCase() !== 'ALL') {
      const s = filters.staffName.toLowerCase();
      list = list.filter(e => (e.staff_name || '').toLowerCase().includes(s));
    }
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      list = list.filter(
        e =>
          (e.customer_name || '').toLowerCase().includes(term) ||
          (e.mobile_number || '').includes(term) ||
          (e.therapy_name || '').toLowerCase().includes(term) ||
          (e.staff_name || '').toLowerCase().includes(term)
      );
    }

    return list.sort((a, b) => (a.visit_date < b.visit_date ? 1 : -1));
  }

  public createEntry(payload: Omit<DSREntryRow, 'id' | 'created_at'>): DSREntryRow {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid entry payload.');
    }

    const normalizedPayload = {
      ...payload,
      customer_name: validateNonEmptyString(payload.customer_name, 'customer_name'),
      mobile_number: validateNonEmptyString(payload.mobile_number, 'mobile_number'),
      visit_date: validateNonEmptyString(payload.visit_date, 'visit_date'),
      time_in: validateNonEmptyString(payload.time_in, 'time_in'),
      therapy_name: validateNonEmptyString(payload.therapy_name, 'therapy_name'),
      staff_name: validateNonEmptyString(payload.staff_name, 'staff_name'),
      amount: validatePositiveNumber(payload.amount, 'amount'),
      payment_mode: validateNonEmptyString(payload.payment_mode, 'payment_mode'),
      remarks: payload.remarks ? validateNonEmptyString(payload.remarks, 'remarks') : undefined,
    };

    const newEntry: DSREntryRow = {
      ...normalizedPayload,
      id: generateSafeNumericId(),
      therapist_name: normalizedPayload.staff_name,
      created_at: new Date().toISOString(),
    };

    this.db.dsr_entries.unshift(newEntry);
    this.saveToDisk();
    this.appendAuditLog('create', 'dsr_entries', newEntry.id, { record: newEntry });
    return newEntry;
  }

  public updateEntry(id: number | string, updates: Partial<DSREntryRow>): DSREntryRow | null {
    const numId = Number(id);
    const index = this.db.dsr_entries.findIndex(e => Number(e.id) === numId);
    if (index === -1) return null;

    if (updates && typeof updates !== 'object') {
      throw new Error('Invalid entry updates payload.');
    }

    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.customer_name !== undefined) sanitizedUpdates.customer_name = validateNonEmptyString(sanitizedUpdates.customer_name, 'customer_name');
    if (sanitizedUpdates.mobile_number !== undefined) sanitizedUpdates.mobile_number = validateNonEmptyString(sanitizedUpdates.mobile_number, 'mobile_number');
    if (sanitizedUpdates.visit_date !== undefined) sanitizedUpdates.visit_date = validateNonEmptyString(sanitizedUpdates.visit_date, 'visit_date');
    if (sanitizedUpdates.time_in !== undefined) sanitizedUpdates.time_in = validateNonEmptyString(sanitizedUpdates.time_in, 'time_in');
    if (sanitizedUpdates.therapy_name !== undefined) sanitizedUpdates.therapy_name = validateNonEmptyString(sanitizedUpdates.therapy_name, 'therapy_name');
    if (sanitizedUpdates.staff_name !== undefined) {
      sanitizedUpdates.staff_name = validateNonEmptyString(sanitizedUpdates.staff_name, 'staff_name');
      sanitizedUpdates.therapist_name = sanitizedUpdates.staff_name;
    }
    if (sanitizedUpdates.amount !== undefined) sanitizedUpdates.amount = validatePositiveNumber(sanitizedUpdates.amount, 'amount');
    if (sanitizedUpdates.payment_mode !== undefined) sanitizedUpdates.payment_mode = validateNonEmptyString(sanitizedUpdates.payment_mode, 'payment_mode');
    if (sanitizedUpdates.remarks !== undefined && sanitizedUpdates.remarks !== null) sanitizedUpdates.remarks = validateNonEmptyString(sanitizedUpdates.remarks, 'remarks');

    const previousEntry = this.db.dsr_entries[index];
    this.db.dsr_entries[index] = {
      ...previousEntry,
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    };
    this.saveToDisk();
    this.appendAuditLog('update', 'dsr_entries', id, { before: previousEntry, after: this.db.dsr_entries[index] });
    return this.db.dsr_entries[index];
  }

  public deleteEntry(id: number | string): boolean {
    const numId = Number(id);
    const targetEntry = this.db.dsr_entries.find(e => Number(e.id) === numId);
    if (!targetEntry) return false;

    this.db.dsr_entries = this.db.dsr_entries.filter(e => Number(e.id) !== numId);
    this.saveToDisk();
    this.appendAuditLog('delete', 'dsr_entries', id, { deleted: targetEntry });
    return true;
  }

  // --- USERS CRUD ---
  public getUsers(): UserRow[] {
    return this.db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
    }));
  }

  public getUserByEmail(email: string): UserRow | null {
    const target = email.trim().toLowerCase();
    return this.db.users.find(u => u.email.toLowerCase() === target) || null;
  }

  public createUser(payload: Omit<UserRow, 'id' | 'created_at'>): UserRow {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid user payload.');
    }

    const name = validateNonEmptyString(payload.name, 'name');
    const email = validateEmail(payload.email);
    if (this.db.users.some(u => u.email.toLowerCase() === email)) {
      throw new Error(`User with email ${email} already exists.`);
    }
    if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'ADMIN') {
      throw new Error('Invalid user role.');
    }
    if (payload.status !== 'ACTIVE' && payload.status !== 'DISABLED') {
      throw new Error('Invalid user status.');
    }
    if (!payload.password_hash || typeof payload.password_hash !== 'string' || !payload.password_hash.trim()) {
      throw new Error('password_hash is required for new users.');
    }

    const newUser: UserRow = {
      ...payload,
      id: generateSafeNumericId(),
      name,
      email,
      password_hash: payload.password_hash.trim(),
      created_at: new Date().toISOString(),
    };

    this.db.users.push(newUser);
    this.saveToDisk();
    this.appendAuditLog('create', 'users', newUser.id, { record: newUser });
    return newUser;
  }

  public updateUser(id: number | string, updates: Partial<UserRow>): UserRow | null {
    const numId = Number(id);
    const index = this.db.users.findIndex(u => Number(u.id) === numId);
    if (index === -1) return null;

    if (updates && typeof updates !== 'object') {
      throw new Error('Invalid user updates payload.');
    }

    const sanitizedUpdates = { ...updates } as Partial<UserRow>;
    if (sanitizedUpdates.name !== undefined) sanitizedUpdates.name = validateNonEmptyString(sanitizedUpdates.name, 'name');
    if (sanitizedUpdates.email !== undefined) {
      sanitizedUpdates.email = validateEmail(sanitizedUpdates.email);
      if (this.db.users.some((u, idx) => idx !== index && u.email.toLowerCase() === sanitizedUpdates.email!.toLowerCase())) {
        throw new Error(`User with email ${sanitizedUpdates.email} already exists.`);
      }
    }
    if (sanitizedUpdates.role !== undefined && sanitizedUpdates.role !== 'SUPER_ADMIN' && sanitizedUpdates.role !== 'ADMIN') {
      throw new Error('Invalid user role.');
    }
    if (sanitizedUpdates.status !== undefined && sanitizedUpdates.status !== 'ACTIVE' && sanitizedUpdates.status !== 'DISABLED') {
      throw new Error('Invalid user status.');
    }
    if (sanitizedUpdates.password_hash !== undefined && (!sanitizedUpdates.password_hash || typeof sanitizedUpdates.password_hash !== 'string' || !sanitizedUpdates.password_hash.trim())) {
      throw new Error('Invalid password_hash value.');
    }

    const previousUser = this.db.users[index];
    this.db.users[index] = {
      ...previousUser,
      ...sanitizedUpdates,
    };
    this.saveToDisk();
    this.appendAuditLog('update', 'users', id, { before: previousUser, after: this.db.users[index] });
    return this.db.users[index];
  }

  public deleteUser(id: number | string): boolean {
    const numId = Number(id);
    if (numId === 1) return false; // Protected
    const targetUser = this.db.users.find(u => Number(u.id) === numId);
    if (!targetUser) return false;

    this.db.users = this.db.users.filter(u => Number(u.id) !== numId);
    this.saveToDisk();
    this.appendAuditLog('delete', 'users', id, { deleted: targetUser });
    return true;
  }

  // --- SETTINGS CRUD ---
  public getSettings(): SettingsDict {
    return { ...this.db.settings };
  }

  public updateSettings(updates: Partial<SettingsDict>): SettingsDict {
    const previousSettings = { ...this.db.settings };
    this.db.settings = {
      ...this.db.settings,
      ...updates,
    };
    this.saveToDisk();
    this.appendAuditLog('update', 'settings', 'settings', { before: previousSettings, after: this.db.settings });
    return { ...this.db.settings };
  }

  // --- SUMMARY STATS ---
  public getDashboardSummary(dateStr: string) {
    const entries = this.getEntries({ startDate: dateStr, endDate: dateStr });
    let todaysRevenue = 0;
    let todaysCustomers = entries.length;
    let cashCollection = 0;
    let upiCollection = 0;
    let cardCollection = 0;
    let mixedCollection = 0;

    entries.forEach(e => {
      const amt = Number(e.amount || 0);
      todaysRevenue += amt;
      const mode = (e.payment_mode || '').toUpperCase();
      if (mode === 'CASH') cashCollection += amt;
      else if (mode === 'UPI') upiCollection += amt;
      else if (mode === 'CARD') cardCollection += amt;
      else mixedCollection += amt;
    });

    return {
      date: dateStr,
      todaysRevenue,
      todaysCustomers,
      cashCollection,
      upiCollection,
      cardCollection,
      mixedCollection,
    };
  }
}

export const db = new FileDatabaseManager();

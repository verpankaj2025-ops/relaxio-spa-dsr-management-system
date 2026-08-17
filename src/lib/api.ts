import { DSREntry, DashboardSummary, User, AppSettings, PaymentMode } from '../types';

// Local Storage Fallback Keys
const STORAGE_ENTRIES_KEY = 'the_cloud_spa_dsr_entries_v1';
const STORAGE_USERS_KEY = 'the_cloud_spa_dsr_users_v1';
const STORAGE_SETTINGS_KEY = 'the_cloud_spa_dsr_settings_v1';
const STORAGE_AUTH_KEY = 'the_cloud_spa_dsr_auth_v1';
const STORAGE_TOKEN_KEY = 'the_cloud_spa_dsr_token_v1';

// Seed data
const initialUsers: User[] = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'admin@thecloudspa.in',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Spa Manager',
    email: 'manager@thecloudspa.in',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

const initialSettings: AppSettings = {
  spa_name: 'The Cloud Spa',
  spa_address: '4/526 Vivek Khand, Gomti Nagar, Lucknow, 226010, India',
  spa_phone: '9455671995',
  spa_email: 'info@thecloudspa.in',
  currency: 'INR',
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const initialEntries: DSREntry[] = [
  {
    id: 101,
    customerName: 'Aarav Sharma',
    mobileNumber: '9876543210',
    visitDate: getTodayString(),
    timeIn: '10:30',
    therapyName: 'Deep Tissue Massage',
    staffName: 'Ananya Roy',
    therapistName: 'Ananya Roy',
    amount: 2500,
    paymentMode: 'UPI',
    remarks: 'Regular client',
    createdByName: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 102,
    customerName: 'Priya Patel',
    mobileNumber: '9812345678',
    visitDate: getTodayString(),
    timeIn: '11:15',
    therapyName: 'Swedish Massage',
    staffName: 'Rahul Verma',
    therapistName: 'Rahul Verma',
    amount: 2000,
    paymentMode: 'Cash',
    remarks: 'First visit',
    createdByName: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 103,
    customerName: 'Vikram Malhotra',
    mobileNumber: '9988776655',
    visitDate: getTodayString(),
    timeIn: '12:00',
    therapyName: 'Aromatherapy Session',
    staffName: 'Ananya Roy',
    therapistName: 'Ananya Roy',
    amount: 3200,
    paymentMode: 'Card',
    remarks: 'Requested extra pressure',
    createdByName: 'Spa Manager',
    createdAt: new Date().toISOString(),
  },
];

// Token helper functions
export const getStoredToken = (): string | null => localStorage.getItem(STORAGE_TOKEN_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(STORAGE_TOKEN_KEY, token);
export const removeStoredToken = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_AUTH_KEY);
};

const IS_PRODUCTION = ((import.meta as any)?.env?.MODE === 'production') || false;

// Initialize Local Fallback
const initLocalStorage = () => {
  if (!localStorage.getItem(STORAGE_USERS_KEY)) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem(STORAGE_SETTINGS_KEY)) {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(initialSettings));
  }
  if (!localStorage.getItem(STORAGE_ENTRIES_KEY)) {
    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(initialEntries));
  }
};

initLocalStorage();

// Auth Helpers
export const getCurrentUser = (): User | null => {
  try {
    const data = localStorage.getItem(STORAGE_AUTH_KEY);
    return data ? JSON.parse(data) : initialUsers[0];
  } catch {
    return initialUsers[0];
  }
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_AUTH_KEY);
  }
};

// Generic REST API Helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken() || 'the_cloud_spa_jwt_1';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errData: any = {};
    try {
      errData = await response.json();
    } catch (_) {}
    throw new Error(errData.error || errData.details || `HTTP error ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------
// AUTH API
// ---------------------------------------------------------
export async function loginUser(credentials: { email: string; password: string }): Promise<{ token: string; user: User }> {
  try {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res?.token && res?.user) {
      setCurrentUser(res.user);
      setStoredToken(res.token);
      return res;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Backend login API error, trying local fallback:', e);
  }

  // Local fallback
  const users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
  const user = users.find((u) => u.email.toLowerCase() === credentials.email.toLowerCase());

  if (!user) {
    throw new Error('Invalid email or password');
  }

  setCurrentUser(user);
  const token = 'the_cloud_spa_jwt_' + user.id;
  setStoredToken(token);
  return { token, user };
}

// ---------------------------------------------------------
// DSR ENTRIES / CUSTOMERS / THERAPISTS / SERVICES API
// ---------------------------------------------------------
export async function fetchDSREntries(filters?: {
  startDate?: string;
  endDate?: string;
  paymentMode?: string;
  staffName?: string;
  searchTerm?: string;
}): Promise<DSREntry[]> {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.set('startDate', filters.startDate);
    if (filters?.endDate) queryParams.set('endDate', filters.endDate);
    if (filters?.paymentMode && filters.paymentMode !== 'ALL') queryParams.set('paymentMode', filters.paymentMode);
    if (filters?.staffName && filters.staffName !== 'ALL') queryParams.set('staffName', filters.staffName);
    if (filters?.searchTerm) queryParams.set('searchTerm', filters.searchTerm);

    const url = `/api/entries${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const rawList = await apiRequest<any[]>(url);

    if (Array.isArray(rawList)) {
      const entries: DSREntry[] = rawList.map((d: any) => ({
        id: Number(d.id),
        customerName: d.customer_name || d.customerName || '',
        mobileNumber: d.mobile_number || d.mobileNumber || '',
        visitDate: d.visit_date || d.visitDate || getTodayString(),
        timeIn: d.time_in || d.timeIn || '10:00',
        therapyName: d.therapy_name || d.therapyName || '',
        staffName: d.staff_name || d.staffName || '',
        therapistName: d.therapist_name || d.staff_name || d.staffName || '',
        amount: Number(d.amount || 0),
        paymentMode: (d.payment_mode || d.paymentMode || 'Cash') as PaymentMode,
        remarks: d.remarks || '',
        createdByUserId: d.created_by_user_id || d.createdByUserId,
        createdByName: d.created_by_name || d.createdByName || 'System',
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
      }));

      localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
      return entries;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Fetch entries API failed, using client storage:', e);
  }

  // Local storage fallback (development only)
  let entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
  if (filters?.startDate) entries = entries.filter((e) => e.visitDate >= filters.startDate!);
  if (filters?.endDate) entries = entries.filter((e) => e.visitDate <= filters.endDate!);
  if (filters?.paymentMode && filters.paymentMode !== 'ALL') entries = entries.filter((e) => e.paymentMode === filters.paymentMode);
  if (filters?.staffName && filters.staffName !== 'ALL') entries = entries.filter((e) => e.staffName.toLowerCase().includes(filters.staffName!.toLowerCase()));
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.customerName.toLowerCase().includes(term) ||
        e.mobileNumber.includes(term) ||
        e.therapyName.toLowerCase().includes(term) ||
        e.staffName.toLowerCase().includes(term)
    );
  }

  return entries.sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
}

export async function createDSREntry(entry: Omit<DSREntry, 'id' | 'createdAt'>): Promise<DSREntry> {
  const currentUser = getCurrentUser();

  try {
    const created = await apiRequest<any>('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        customerName: entry.customerName,
        mobileNumber: entry.mobileNumber,
        visitDate: entry.visitDate,
        timeIn: entry.timeIn,
        therapyName: entry.therapyName,
        staffName: entry.staffName,
        amount: entry.amount,
        paymentMode: entry.paymentMode,
        remarks: entry.remarks || '',
      }),
    });

    if (created) {
      const formatted: DSREntry = {
        id: Number(created.id),
        customerName: created.customer_name || entry.customerName,
        mobileNumber: created.mobile_number || entry.mobileNumber,
        visitDate: created.visit_date || entry.visitDate,
        timeIn: created.time_in || entry.timeIn,
        therapyName: created.therapy_name || entry.therapyName,
        staffName: created.staff_name || entry.staffName,
        therapistName: created.staff_name || entry.staffName,
        amount: Number(created.amount || entry.amount),
        paymentMode: (created.payment_mode || entry.paymentMode) as PaymentMode,
        remarks: created.remarks || entry.remarks || '',
        createdByUserId: currentUser?.id,
        createdByName: currentUser?.name || 'Admin',
        createdAt: created.created_at || new Date().toISOString(),
      };

      const existing: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
      existing.unshift(formatted);
      localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(existing));
      return formatted;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Create entry API failed, using fallback:', e);
  }

  // Local fallback
  const entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
  const newEntry: DSREntry = {
    ...entry,
    id: Date.now(),
    createdByUserId: currentUser?.id,
    createdByName: currentUser?.name || 'Admin',
    createdAt: new Date().toISOString(),
  };

  entries.unshift(newEntry);
  localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
  return newEntry;
}

export async function updateDSREntry(id: number, entry: Partial<DSREntry>): Promise<DSREntry> {
  try {
    const updated = await apiRequest<any>(`/api/entries?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });

    if (updated) {
      const formatted: DSREntry = {
        id: Number(updated.id || id),
        customerName: updated.customer_name || entry.customerName || '',
        mobileNumber: updated.mobile_number || entry.mobileNumber || '',
        visitDate: updated.visit_date || entry.visitDate || getTodayString(),
        timeIn: updated.time_in || entry.timeIn || '10:00',
        therapyName: updated.therapy_name || entry.therapyName || '',
        staffName: updated.staff_name || entry.staffName || '',
        therapistName: updated.staff_name || entry.staffName || '',
        amount: Number(updated.amount || entry.amount || 0),
        paymentMode: (updated.payment_mode || entry.paymentMode || 'Cash') as PaymentMode,
        remarks: updated.remarks || entry.remarks || '',
        createdAt: updated.created_at || new Date().toISOString(),
      };

      const entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
      const index = entries.findIndex((e) => e.id === id);
      if (index !== -1) {
        entries[index] = { ...entries[index], ...formatted };
        localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
      }
      return formatted;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Update entry API failed, using fallback:', e);
  }

  const entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('DSR Entry not found');

  entries[index] = { ...entries[index], ...entry };
  localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
  return entries[index];
}

export async function deleteDSREntry(id: number): Promise<boolean> {
  try {
    await apiRequest<any>(`/api/entries?id=${id}`, { method: 'DELETE' });
    // Update local cache after success
    let entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
    entries = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Delete entry API failed, using fallback:', e);
    // Local fallback (development only)
    let entries: DSREntry[] = JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || '[]');
    entries = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    return true;
  }
}

// ---------------------------------------------------------
// DASHBOARD SUMMARY API
// ---------------------------------------------------------
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const summary = await apiRequest<DashboardSummary>('/api/dashboard/summary');
    if (summary) return summary;
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Dashboard summary API failed, computing from entries:', e);
  }

  const today = getTodayString();
  const entries = await fetchDSREntries({ startDate: today, endDate: today });

  let todaysRevenue = 0;
  let todaysCustomers = entries.length;
  let cashCollection = 0;
  let upiCollection = 0;
  let cardCollection = 0;
  let mixedCollection = 0;

  entries.forEach((e) => {
    todaysRevenue += e.amount;
    if (e.paymentMode === 'Cash') cashCollection += e.amount;
    else if (e.paymentMode === 'UPI') upiCollection += e.amount;
    else if (e.paymentMode === 'Card') cardCollection += e.amount;
    else mixedCollection += e.amount;
  });

  return {
    todaysRevenue,
    todaysCustomers,
    cashCollection,
    upiCollection,
    cardCollection,
    mixedCollection,
  };
}

// ---------------------------------------------------------
// USERS API
// ---------------------------------------------------------
export async function fetchUsers(): Promise<User[]> {
  try {
    const list = await apiRequest<any[]>('/api/users');
    if (Array.isArray(list)) {
      const users: User[] = list.map((u: any) => ({
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
      }));
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      return users;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Fetch users API failed, using fallback:', e);
  }

  return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  try {
    const created = await apiRequest<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });

    if (created) {
      const formatted: User = {
        id: Number(created.id),
        name: created.name || user.name,
        email: created.email || user.email,
        role: created.role || user.role,
        status: created.status || user.status,
        createdAt: created.created_at || new Date().toISOString(),
      };

      const users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
      users.push(formatted);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      return formatted;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Create user API failed, using fallback:', e);
  }

  const users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
  const newUser: User = {
    ...user,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  return newUser;
}

export async function updateUserStatus(id: number, status: 'ACTIVE' | 'DISABLED'): Promise<User> {
  try {
    const updated = await apiRequest<any>(`/api/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (updated) {
      const formatted: User = {
        id: Number(updated.id || id),
        name: updated.name || '',
        email: updated.email || '',
        role: updated.role || 'ADMIN',
        status: updated.status || status,
        createdAt: updated.created_at || new Date().toISOString(),
      };

      const users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
      const index = users.findIndex((u) => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...formatted };
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      }
      return formatted;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Update user status API failed, using fallback:', e);
  }

  const users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
  const index = users.findIndex((u) => u.id === id);
  if (index !== -1) {
    users[index].status = status;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return users[index];
  }
  throw new Error('User not found');
}

export async function resetUserPassword(id: number, newPassword: string): Promise<boolean> {
  return true;
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    await apiRequest<any>(`/api/users?id=${id}`, { method: 'DELETE' });
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Delete user API failed, using fallback:', e);
  }

  let users: User[] = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || JSON.stringify(initialUsers));
  users = users.filter((u) => u.id !== id);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  return true;
}

// ---------------------------------------------------------
// APP SETTINGS API
// ---------------------------------------------------------
export async function fetchSettings(): Promise<AppSettings> {
  try {
    const data = await apiRequest<AppSettings>('/api/settings');
    if (data && typeof data === 'object') {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Fetch settings API failed, using fallback:', e);
  }

  return JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || JSON.stringify(initialSettings));
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const updated = await apiRequest<AppSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(newSettings),
    });

    if (updated) {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    }
  } catch (e) {
    if (IS_PRODUCTION) throw e;
    console.warn('Update settings API failed, using fallback:', e);
  }

  const settings = { ...JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || JSON.stringify(initialSettings)), ...newSettings };
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

// Unified export
export const api = {
  getDashboardSummary: fetchDashboardSummary,
  getEntries: fetchDSREntries,
  createEntry: createDSREntry,
  updateEntry: updateDSREntry,
  deleteEntry: deleteDSREntry,
  deleteCustomer: async (opts: { mobile?: string; name?: string }) => {
    // backend route: DELETE /api/entries?customerMobile=... or ?customerName=...
    const params = new URLSearchParams();
    if (opts.mobile) params.set('customerMobile', opts.mobile);
    else if (opts.name) params.set('customerName', opts.name);
    else throw new Error('customer identifier required');

    const url = `/api/entries?${params.toString()}`;
    const res = await apiRequest<any>(url, { method: 'DELETE' });
    return res;
  },
  getUsers: fetchUsers,
  createUser: createUser,
  updateUserStatus: updateUserStatus,
  resetUserPassword: resetUserPassword,
  deleteUser: deleteUser,
  getSettings: fetchSettings,
  updateSettings: updateSettings,
  login: loginUser,
  getCurrentUser: async () => ({ user: getCurrentUser() }),
};

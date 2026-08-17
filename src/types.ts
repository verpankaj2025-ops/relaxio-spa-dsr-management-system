export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Mixed';

export interface DSREntry {
  id: number;
  customerName: string;
  mobileNumber: string;
  visitDate: string; // YYYY-MM-DD
  timeIn: string; // HH:MM
  therapyName: string;
  staffName: string;
  therapistName?: string;
  amount: number;
  paymentMode: PaymentMode;
  remarks?: string;
  createdByUserId?: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerEntry = DSREntry;

export interface DashboardSummary {
  todaysRevenue: number;
  todaysCustomers: number;
  cashCollection: number;
  upiCollection: number;
  cardCollection: number;
  mixedCollection: number;
}

export interface DSRReportFilter {
  startDate?: string;
  endDate?: string;
  paymentMode?: PaymentMode | 'ALL';
  staffName?: string;
  therapyName?: string;
  searchTerm?: string;
}

export interface AppSettings {
  spa_name: string;
  spa_address: string;
  spa_phone: string;
  spa_email: string;
  currency: string;
  [key: string]: string;
}

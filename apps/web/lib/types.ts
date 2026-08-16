export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string | number;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
}

export const formatRupiah = (value: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value));

export const parseRupiahInput = (value: FormDataEntryValue | null) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : Number.NaN;
};

export const formatRupiahInput = (value: string | number) => {
  const digits = String(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

export const todayInputValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

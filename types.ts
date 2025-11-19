export interface Friend {
  id: string;
  name: string;
  accessCode: string;
  balance: number; // Positive means they owe you, negative means you owe them
  createdAt?: any; // Firebase Timestamp
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // Array of Friend IDs
}

export interface Bill {
  id: string;
  date: string;
  title: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  payerId: string; // Usually 'admin'
}

export type TransactionStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface Transaction {
  id: string;
  friendId: string;
  amount: number;
  type: 'PAYMENT' | 'EXPENSE';
  date: string;
  description: string;
  status: TransactionStatus;
  proofImage?: string | null; // Base64 string for payment proof
  createdAt?: any; // Firebase Timestamp
}

// Gemini Response Schema Types
export interface ReceiptData {
  items: {
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
}
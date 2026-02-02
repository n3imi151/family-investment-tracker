// Database Types

export interface FamilyMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contribution {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  member?: FamilyMember;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  last_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  stock_id: string;
  type: 'buy' | 'sell';
  date: string;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  stock?: Stock;
  allocations?: TransactionAllocation[];
}

export interface TransactionAllocation {
  id: string;
  transaction_id: string;
  member_id: string;
  amount: number;
  percentage: number;
  created_at: string;
  // Joined data
  member?: FamilyMember;
  transaction?: Transaction;
}

// View Types

export interface MemberCashPool {
  member_id: string;
  member_name: string;
  total_contributions: number;
  total_buys: number;
  total_sells: number;
  available_cash: number;
}

export interface StockHolding {
  stock_id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  shares_owned: number;
  current_value: number;
  total_cost_basis: number;
  total_sell_proceeds: number;
}

export interface MemberStockOwnership {
  member_id: string;
  member_name: string;
  stock_id: string;
  symbol: string;
  stock_name: string;
  current_price: number | null;
  shares_owned: number;
  current_value: number;
  cost_basis: number;
  realized_proceeds: number;
}

// Computed Types for Dashboard

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  totalCash: number;
  memberBreakdown: MemberPortfolioSummary[];
}

export interface MemberPortfolioSummary {
  memberId: string;
  memberName: string;
  totalContributions: number;
  currentStockValue: number;
  availableCash: number;
  totalValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercentage: number;
  ownershipPercentage: number;
}

export interface StockWithOwnership extends Stock {
  sharesOwned: number;
  currentValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercentage: number;
  memberOwnership: {
    memberId: string;
    memberName: string;
    shares: number;
    value: number;
    percentage: number;
  }[];
}

// Form Types

export interface NewMemberForm {
  name: string;
  email: string;
  is_admin: boolean;
}

export interface NewContributionForm {
  member_id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface NewStockForm {
  symbol: string;
  name: string;
}

export interface NewTransactionForm {
  stock_id: string;
  type: 'buy' | 'sell';
  date: string;
  quantity: number;
  price_per_share: number;
  notes?: string;
  allocations: {
    member_id: string;
    amount: number;
  }[];
}

// API Response Types

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
}

// Auth Types

export interface AuthUser {
  id: string;
  email: string;
  familyMember: FamilyMember | null;
}

// Activity Feed Types

export interface ActivityItem {
  id: string;
  type: 'contribution' | 'buy' | 'sell';
  date: string;
  description: string;
  amount: number;
  memberName?: string;
  stockSymbol?: string;
}

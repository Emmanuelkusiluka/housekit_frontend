export interface Occupancy {
  scope: string;
  occupied: number;
  vacant: number;
  maintenance: number;
  total: number;
  occupancy_rate: number;
}

export interface Compound {
  public_id: string;
  name: string;
  address: string;
  notes: string;
  house_count: number;
  created_at: string;
}

export interface House {
  public_id: string;
  name: string;
  house_type: "room_based" | "standalone";
  address: string;
  compound: string | null;
  compound_name: string | null;
  unit_count: number;
  created_at: string;
}

export interface Unit {
  public_id: string;
  house: string;
  house_name: string;
  kind: "room" | "whole_house";
  label: string;
  monthly_rent: string;
  status: "occupied" | "vacant" | "maintenance";
  created_at: string;
}

export interface Resident {
  public_id: string;
  full_name: string;
  phone: string;
  national_id: string;
  national_id_masked: string;
  email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  is_archived: boolean;
  has_portal_access: boolean;
  verification_status: "unverified" | "profile_complete" | "verified";
  verified_at: string | null;
  created_at: string;
}

export interface Tenancy {
  public_id: string;
  unit: string;
  unit_label: string;
  house_name: string;
  compound_name: string | null;
  resident: string;
  resident_name: string;
  start_date: string;
  contract_months: number;
  end_date: string;
  monthly_rent: string;
  deposit_amount: string;
  status: "active" | "moved_out";
  move_out_date: string | null;
  lease_status: string | null;
  created_at: string;
}

export interface Lease {
  public_id: string;
  tenancy: string;
  resident_name: string;
  unit_label: string;
  status: "draft" | "sent" | "signed" | "declined";
  terms: Record<string, unknown>;
  document_url: string | null;
  signatures: { public_id: string; typed_name: string; signed_at: string; document_hash: string }[];
  created_at: string;
}

export interface LedgerRow {
  tenancy_public_id: string;
  resident_name: string;
  unit_label: string;
  house_name: string;
  charge_public_id: string | null;
  period_month: string | null;
  amount_due: string | null;
  balance: string | null;
  status: string | null;
  is_overdue: boolean;
}

export interface RentCharge {
  public_id: string;
  tenancy: string;
  resident_name: string;
  unit_label: string;
  period_month: string;
  amount_due: string;
  paid_total: string;
  balance: string;
  status: "unpaid" | "partial" | "paid";
  is_overdue: boolean;
  created_at: string;
}

export interface Receipt {
  public_id: string;
  number: string;
  resident_name: string;
  unit_label: string;
  amount: string;
  document_url: string | null;
  issued_at: string;
}

export interface PaymentNotice {
  public_id: string;
  tenancy: string;
  resident_name: string;
  unit_label: string;
  amount: string;
  channel: string;
  reference: string;
  status: "pending" | "confirmed" | "rejected";
  rejection_reason: string;
  submitted_at: string;
}

export interface Expense {
  public_id: string;
  category: string;
  amount: string;
  spent_on: string;
  description: string;
  compound: string | null;
  house: string | null;
  recorded_by: string;
  created_at: string;
}

export interface MaintenanceRequest {
  public_id: string;
  unit: string | null;
  unit_label: string | null;
  house: string;
  house_name: string;
  raised_by: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "resolved";
  resolved_at: string | null;
  created_at: string;
}

export interface Package {
  public_id: string;
  name: string;
  unit_min: number;
  unit_max: number | null;
  price_monthly: string;
  price_annual: string;
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  public_id: string;
  package: Package;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  active_unit_count: number;
  cancel_at_period_end: boolean;
}

export interface Invoice {
  public_id: string;
  account: string;
  business_name: string;
  invoice_no: string;
  period_start: string;
  period_end: string;
  amount: string;
  currency: string;
  status: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface CaretakerAssignment {
  public_id: string;
  caretaker: string;
  caretaker_name: string;
  house: string;
  house_name: string;
  created_at: string;
}

export interface StaffUser {
  public_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  locale: string;
  is_active: boolean;
  created_at: string;
}

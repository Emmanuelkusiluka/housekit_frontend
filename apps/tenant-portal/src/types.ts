export interface Lease {
  public_id: string;
  status: "draft" | "sent" | "signed" | "declined";
  terms: Record<string, string>;
  document_url: string | null;
  unit_label: string;
  resident_name: string;
}

export interface Charge {
  public_id: string;
  unit: string;
  unit_label: string;
  period_month: string;
  amount_due: string;
  balance: string;
  status: string;
  is_overdue: boolean;
}

export interface Payment {
  public_id: string;
  amount: string;
  method: string;
  paid_on: string;
}

export interface Receipt {
  public_id: string;
  number: string;
  amount: string;
  document_url: string | null;
  issued_at: string;
}

export interface PaymentNotice {
  public_id: string;
  amount: string;
  channel: string;
  status: string;
  submitted_at: string;
}

export interface Profile {
  public_id: string;
  full_name: string;
  phone: string;
  national_id: string;
  national_id_masked: string;
  email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  verification_status: string;
}

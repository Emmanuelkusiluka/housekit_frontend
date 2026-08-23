export interface Application {
  public_id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  requested_package: string | null;
  status: "pending" | "verifying" | "approved" | "rejected" | "provisioned";
  provisioned_account: string | null;
  created_at: string;
}

export interface PlatformAccount {
  public_id: string;
  business_name: string;
  slug: string;
  status: string;
  currency: string;
  package: string | null;
  subscription_status: string | null;
  unit_count: number;
  resident_count: number;
  created_at: string;
}

export interface AccountHealth {
  account: string;
  status: string;
  unit_count: number;
  resident_count: number;
  active_tenancies: number;
  occupancy_rate: number;
  last_login: string | null;
  subscription_status: string | null;
}

export interface TicketMessage {
  public_id: string;
  author_type: string;
  author_label: string;
  body: string;
  created_at: string;
}

export interface Ticket {
  public_id: string;
  ticket_no: string;
  account: string | null;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by_name: string;
  kb_reference: string;
  messages: TicketMessage[];
  created_at: string;
}

export interface Invoice {
  public_id: string;
  business_name: string;
  invoice_no: string;
  amount: string;
  currency: string;
  status: string;
  due_at: string;
}

export interface Company {
  id: number;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  vat_number: string | null;
  address_line1: string | null;
  city: string | null;
  zip_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  address_line2: string | null;
  website: string | null;
  logo_url: string | null;
  notes: string | null;
  currency: string;
  is_active: boolean;
  pos_stock_deduction: string;
  sale_stock_deduction: string;
  discount_pin_threshold: number;
  sale_validation_threshold: number;
  created_at: string;
  updated_at: string;
}

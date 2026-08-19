export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  city: string;
  area: string;
  address: string;
  landmark: string;
  created_at: string;
  updated_at?: string;
  last_order_at?: string;
  order_count: number;
  spent: number;
  pieces: number;
  last_order_id?: string;
};

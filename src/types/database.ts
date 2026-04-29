export type Gender = "women" | "kids" | "accessories";
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type UserRole = "customer" | "admin";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  regular_price: number;
  sell_price: number;
  gst_rate: number;
  shipping_charge: number;
  stock: number;
  images: string[];
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  product_attributes?: ProductAttribute[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  address_id: string | null;
  status: OrderStatus;
  total: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  delhivery_awb: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  address?: Address;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  price_at_time: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product_name?: string;   // ← add this
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Attribute {
  id: string;
  name: string;
  created_at: string;
  values?: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  created_at: string;
  attribute?: Attribute;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  attribute_id: string;
  attribute_value_id: string;
  attribute?: Attribute;
  attribute_value?: AttributeValue;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: Gender | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;  // ← add this
  created_at: string;
  updated_at: string;
}
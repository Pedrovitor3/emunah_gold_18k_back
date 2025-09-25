/**
 * Tipos TypeScript para o projeto Emunah Gold 18K
 * Define interfaces e tipos para todas as entidades do sistema
 */

/**
 * Interface para usuário
 */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para dados de criação de usuário
 */
export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

/**
 * Interface para dados de login
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Interface para endereço
 */
export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para categoria de produto
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para produto
 */
export interface Product {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  weight?: number | null;
  gold_purity?: string;
  stock_quantity: number;
  is_active: boolean;
  featured: boolean;
  created_at: Date;
  updated_at: Date;
  category?: Partial<Category>;
  images?: ProductImage[];
}

/**
 * Interface para imagem de produto
 */
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  created_at: Date;
}

/**
 * Interface para item do carrinho
 */
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: Date;
  updated_at: Date;
  product?: Partial<Product>;
}

/**
 * Interface para pedido
 */
export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: ShippingAddress;
  tracking_code?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  items?: OrderItem[];
  payments?: Payment[];
}

/**
 * Interface para item do pedido
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
  product?: Partial<Product>;
}

/**
 * Interface para endereço de entrega
 */
export interface ShippingAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

/**
 * Interface para pagamento
 */
export interface Payment {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  payment_provider?: string;
  provider_payment_id?: string;
  amount: number;
  status: PaymentStatus;
  pix_qr_code?: string;
  pix_code?: string;
  expires_at?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para rastreamento de pedido
 */
export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  description?: string;
  location?: string;
  occurred_at: Date;
  created_at: Date;
}

/**
 * Enums para status e tipos
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PIX = 'pix'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

/**
 * Interface para resposta de API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Interface para dados de paginação
 */
export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Interface para resposta paginada
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: PaginationData;
}

/**
 * Interface para payload do JWT
 */
export interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}


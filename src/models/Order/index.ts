// src/models/Order.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../User";
import { OrderItem } from "../OrderItem";
import { Payment } from "../Payment";
import { OrderTracking } from "../OrderTracking";

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  PIX = "pix",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  user_id: string;

  @Column({ unique: true })
  order_number: string;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: "enum", enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  payment_status: PaymentStatus;

  @Column("decimal", { precision: 10, scale: 2 })
  subtotal: number;

  @Column("decimal", { precision: 10, scale: 2 })
  shipping_cost: number;

  @Column("decimal", { precision: 10, scale: 2 })
  total: number;

  // Endereço de entrega como JSON
  @Column("json")
  shipping_address: {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    estado: string;
    localidade: string;
    uf: string;
    ddd: string;
  };

  @Column({ nullable: true })
  tracking_code?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => OrderTracking, (tracking) => tracking.order)
  tracking: OrderTracking[];
}

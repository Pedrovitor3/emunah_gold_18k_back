import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentMethod, PaymentStatus } from "../types";
import { Order } from "../Order";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  order_id: string;

  @Column({ type: "enum", enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ nullable: true })
  payment_provider?: string;

  @Column({ nullable: true })
  provider_payment_id?: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status?: PaymentStatus;

  @Column({ nullable: true })
  pix_qr_code?: string;

  @Column({ nullable: true })
  pix_code?: string;

  @Column({ nullable: true })
  expires_at?: Date;

  @Column({ nullable: true })
  paid_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn({ name: "order_id" })
  order: Order;
}

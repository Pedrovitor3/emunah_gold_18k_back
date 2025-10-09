// src/models/User.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Address } from "../Address";
import { CartItem } from "../CartItem";
import { Order } from "../Order";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  // @Column({ type: "varchar", nullable: true })
  // photo: string | null;

  @Column({ default: false })
  is_admin: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.user)
  cart_items: CartItem[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}

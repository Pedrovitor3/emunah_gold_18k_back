// src/models/Product.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from '../Category';
import { ProductImage } from '../ProductImage';
import { CartItem } from '../CartItem';
import { OrderItem } from '../OrderItem';
import type { User } from '../User';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  category_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ unique: true })
  sku: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 8, scale: 3, nullable: true })
  weight?: number;

  @Column({ nullable: true })
  gold_purity?: string;

  @Column({ default: 0 })
  stock_quantity: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  featured: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // @UpdateDateColumn()
  // deleted_at: Date;

  // Relacionamentos
  @ManyToOne(() => Category, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductImage, image => image.product)
  images: ProductImage[];

  @OneToMany(() => CartItem, cartItem => cartItem.product)
  cart_items: CartItem[];

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  order_items: OrderItem[];
}

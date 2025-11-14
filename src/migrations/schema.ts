import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class CreateEcommerceSchema1720812000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // USERS
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "email", type: "varchar", isUnique: true },
          { name: "password_hash", type: "varchar" },
          { name: "first_name", type: "varchar" },
          { name: "last_name", type: "varchar" },
          { name: "phone", type: "varchar", isNullable: true },
          { name: "is_admin", type: "boolean", default: false },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    // ADDRESSES
    await queryRunner.createTable(
      new Table({
        name: "addresses",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "user_id", type: "uuid" },
          { name: "cep", type: "varchar" },
          { name: "logradouro", type: "varchar" },
          { name: "complemento", type: "varchar", isNullable: true },
          { name: "bairro", type: "varchar" },
          { name: "localidade", type: "varchar" },
          { name: "uf", type: "varchar" },
          { name: "estado", type: "varchar", isNullable: true },
          { name: "ddd", type: "varchar", isNullable: true },
          { name: "numero", type: "varchar", isNullable: true },
          { name: "is_default", type: "boolean", default: false },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "addresses",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    // CATEGORIES
    await queryRunner.createTable(
      new Table({
        name: "categories",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "name", type: "varchar" },
          { name: "description", type: "varchar", isNullable: true },
          { name: "is_active", type: "boolean", default: true },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    // PRODUCTS
    await queryRunner.createTable(
      new Table({
        name: "products",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "category_id", type: "uuid" },
          { name: "name", type: "varchar" },
          { name: "description", type: "varchar", isNullable: true },
          { name: "price", type: "decimal", precision: 10, scale: 2 },
          {
            name: "weight",
            type: "decimal",
            precision: 8,
            scale: 3,
            isNullable: true,
          },
          { name: "gold_purity", type: "varchar", isNullable: true },
          { name: "stock_quantity", type: "int", default: 0 },
          { name: "is_active", type: "boolean", default: true },
          { name: "featured", type: "boolean", default: false },
          { name: "image_urls", type: "text", isNullable: true },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "products",
      new TableForeignKey({
        columnNames: ["category_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "categories",
        onDelete: "SET NULL",
      })
    );

    // CART ITEMS
    await queryRunner.createTable(
      new Table({
        name: "cart_items",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "user_id", type: "uuid" },
          { name: "product_id", type: "uuid" },
          { name: "quantity", type: "int" },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKeys("cart_items", [
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["product_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "products",
        onDelete: "CASCADE",
      }),
    ]);

    // ORDERS
    await queryRunner.createTable(
      new Table({
        name: "orders",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "user_id", type: "uuid" },
          { name: "order_number", type: "varchar", isUnique: true },
          { name: "status", type: "varchar", default: "'pending'" },
          { name: "payment_method", type: "varchar" },
          { name: "payment_status", type: "varchar", default: "'pending'" },
          { name: "subtotal", type: "decimal", precision: 10, scale: 2 },
          { name: "shipping_cost", type: "decimal", precision: 10, scale: 2 },
          { name: "total", type: "decimal", precision: 10, scale: 2 },
          { name: "shipping_address", type: "json" },
          { name: "tracking_code", type: "varchar", isNullable: true },
          { name: "notes", type: "varchar", isNullable: true },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "orders",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    // ORDER ITEMS
    await queryRunner.createTable(
      new Table({
        name: "order_items",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "order_id", type: "uuid" },
          { name: "product_id", type: "uuid" },
          { name: "quantity", type: "int" },
          { name: "unit_price", type: "decimal", precision: 10, scale: 2 },
          { name: "total_price", type: "decimal", precision: 10, scale: 2 },
        ],
      })
    );

    await queryRunner.createForeignKeys("order_items", [
      new TableForeignKey({
        columnNames: ["order_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "orders",
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["product_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "products",
        onDelete: "SET NULL",
      }),
    ]);

    // PAYMENTS
    await queryRunner.createTable(
      new Table({
        name: "payments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "order_id", type: "uuid" },
          { name: "payment_method", type: "varchar" },
          { name: "payment_provider", type: "varchar", isNullable: true },
          { name: "provider_payment_id", type: "varchar", isNullable: true },
          { name: "amount", type: "decimal", precision: 10, scale: 2 },
          { name: "status", type: "varchar", default: "'pending'" },
          { name: "pix_qr_code", type: "varchar", isNullable: true },
          { name: "pix_code", type: "varchar", isNullable: true },
          { name: "expires_at", type: "timestamp", isNullable: true },
          { name: "paid_at", type: "timestamp", isNullable: true },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "updated_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "payments",
      new TableForeignKey({
        columnNames: ["order_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "orders",
        onDelete: "CASCADE",
      })
    );

    // ORDER TRACKING
    await queryRunner.createTable(
      new Table({
        name: "order_tracking",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "order_id", type: "uuid" },
          { name: "status", type: "varchar" },
          { name: "description", type: "varchar", isNullable: true },
          { name: "location", type: "varchar", isNullable: true },
          { name: "occurred_at", type: "timestamp" },
          { name: "created_at", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "order_tracking",
      new TableForeignKey({
        columnNames: ["order_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "orders",
        onDelete: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("order_tracking");
    await queryRunner.dropTable("payments");
    await queryRunner.dropTable("order_items");
    await queryRunner.dropTable("orders");
    await queryRunner.dropTable("cart_items");
    await queryRunner.dropTable("products");
    await queryRunner.dropTable("categories");
    await queryRunner.dropTable("addresses");
    await queryRunner.dropTable("users");
  }
}

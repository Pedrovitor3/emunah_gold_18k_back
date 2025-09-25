-- Dados iniciais para o banco de dados Emunah Gold 18K

-- Inserir categorias
INSERT INTO categories (name, description, slug) VALUES
('Anéis', 'Anéis de ouro 18K com diversos designs', 'aneis'),
('Colares', 'Colares e correntes de ouro 18K', 'colares'),
('Brincos', 'Brincos de ouro 18K para todas as ocasiões', 'brincos'),
('Pulseiras', 'Pulseiras elegantes de ouro 18K', 'pulseiras'),
('Pingentes', 'Pingentes únicos de ouro 18K', 'pingentes');

-- Inserir produtos de exemplo
INSERT INTO products (category_id, name, description, sku, price, weight, gold_purity, stock_quantity, featured) VALUES
(
    (SELECT id FROM categories WHERE slug = 'aneis'),
    'Anel Solitário Clássico',
    'Anel solitário em ouro 18K com design clássico e elegante. Perfeito para ocasiões especiais.',
    'ANEL-SOL-001',
    1299.90,
    3.5,
    '18K',
    10,
    true
),
(
    (SELECT id FROM categories WHERE slug = 'colares'),
    'Corrente Veneziana 60cm',
    'Corrente veneziana em ouro 18K, 60cm de comprimento. Design tradicional e resistente.',
    'COLAR-VEN-001',
    899.90,
    8.2,
    '18K',
    15,
    true
),
(
    (SELECT id FROM categories WHERE slug = 'brincos'),
    'Brincos Argola Pequena',
    'Brincos argola pequena em ouro 18K. Delicados e versáteis para o dia a dia.',
    'BRINCO-ARG-001',
    399.90,
    1.8,
    '18K',
    25,
    false
),
(
    (SELECT id FROM categories WHERE slug = 'pulseiras'),
    'Pulseira Elos Cartier',
    'Pulseira com elos estilo Cartier em ouro 18K. Sofisticada e atemporal.',
    'PULS-CART-001',
    1599.90,
    12.5,
    '18K',
    8,
    true
),
(
    (SELECT id FROM categories WHERE slug = 'pingentes'),
    'Pingente Coração',
    'Pingente em formato de coração em ouro 18K. Símbolo de amor e carinho.',
    'PING-COR-001',
    299.90,
    2.1,
    '18K',
    20,
    false
);

-- Inserir usuário administrador
INSERT INTO users (email, password_hash, first_name, last_name, is_admin) VALUES
('admin@emunah.com', '$2b$10$example_hash_here', 'Admin', 'Emunah', true);

-- Inserir usuário de teste
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES
('cliente@teste.com', '$2b$10$example_hash_here', 'Cliente', 'Teste', '(11) 99999-9999');


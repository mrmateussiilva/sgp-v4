-- Permite armazenar valores base64 ou caminhos longos de imagem
ALTER TABLE order_items
    ALTER COLUMN imagem TYPE TEXT USING imagem::TEXT;

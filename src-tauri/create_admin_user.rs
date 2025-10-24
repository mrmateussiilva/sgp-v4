use bcrypt::{hash, DEFAULT_COST};
use sqlx::PgPool;
use std::env;
use std::io::{self, Write};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Criador de Usuário Admin - SGP ===");
    println!();

    // Configurações do banco
    let database_url = "postgresql://postgres:MJs119629@192.168.15.9:5432/sgp";
    
    // Conectar ao banco
    println!("Conectando ao banco de dados...");
    let pool = PgPool::connect(database_url).await?;
    println!("✅ Conectado ao banco de dados!");

    // Solicitar dados do usuário
    print!("Nome de usuário: ");
    io::stdout().flush()?;
    let mut username = String::new();
    io::stdin().read_line(&mut username)?;
    let username = username.trim().to_string();

    if username.is_empty() {
        println!("❌ Erro: Nome de usuário não pode estar vazio!");
        return Ok(());
    }

    print!("Senha: ");
    io::stdout().flush()?;
    let mut password = String::new();
    io::stdin().read_line(&mut password)?;
    let password = password.trim().to_string();

    if password.is_empty() {
        println!("❌ Erro: Senha não pode estar vazia!");
        return Ok(());
    }

    // Verificar se o usuário já existe
    println!("Verificando se o usuário já existe...");
    let user_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)"
    )
    .bind(&username)
    .fetch_one(&pool)
    .await?;

    if user_exists {
        println!("❌ Erro: O usuário '{}' já existe!", username);
        return Ok(());
    }

    println!("✅ Usuário '{}' disponível.", username);

    // Gerar hash da senha
    println!("Gerando hash da senha...");
    let password_hash = hash(&password, DEFAULT_COST)?;
    println!("✅ Hash da senha gerado.");

    // Inserir usuário no banco
    println!("Criando usuário no banco de dados...");
    let user = sqlx::query!(
        "INSERT INTO users (username, password_hash, is_admin) 
         VALUES ($1, $2, TRUE)
         RETURNING id, username, is_admin, created_at",
        username,
        password_hash
    )
    .fetch_one(&pool)
    .await?;

    println!("✅ Usuário admin criado com sucesso!");
    println!();
    println!("Detalhes do usuário:");
    println!("   ID: {}", user.id);
    println!("   Usuário: {}", user.username);
    println!("   Admin: {}", user.is_admin);
    println!("   Criado em: {}", user.created_at);
    println!();
    println!("🎉 Você pode agora fazer login com:");
    println!("   Usuário: {}", username);
    println!("   Senha: [a senha que você digitou]");

    Ok(())
}


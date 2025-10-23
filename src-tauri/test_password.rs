use bcrypt::{hash, verify};

fn main() {
    let password_hash = "$2y$12$A7dNsbpT6UL4PUiR0RduO.DCjTiMQuuLHfoalGexiLRNvKcJste1S";
    
    // Testar senhas comuns
    let passwords = vec![
        "admin123",
        "admin",
        "123456",
        "password",
        "mateus",
        "123",
    ];
    
    println!("Testando senhas para o hash: {}", password_hash);
    println!();
    
    for password in passwords {
        match verify(password, password_hash) {
            Ok(is_valid) => {
                if is_valid {
                    println!("✅ SENHA CORRETA: '{}'", password);
                } else {
                    println!("❌ Senha incorreta: '{}'", password);
                }
            }
            Err(e) => {
                println!("❌ Erro ao verificar '{}': {}", password, e);
            }
        }
    }
}

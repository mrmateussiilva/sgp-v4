# Análise Completa: Migração de Comunicação HTTP para Backend Rust

## 📋 Sumário Executivo

**Situação Atual:**
- Sistema usa Tauri (aplicação desktop com backend Rust)
- Frontend faz TODAS as chamadas via HTTP para uma API externa
- Backend Rust já possui muitos comandos implementados, mas NÃO estão registrados no `main.rs`
- Sistema atual usa `tauriAxiosAdapter` que converte chamadas HTTP para usar plugin HTTP do Tauri

**Objetivo:**
- Migrar todas as chamadas HTTP para comandos Tauri diretos (invoke)
- Eliminar dependência de servidor HTTP externo
- Utilizar conexão direta com banco de dados PostgreSQL via Rust
- Manter compatibilidade durante transição

---

## 🔍 Mapeamento Completo de Endpoints HTTP

### 1. Autenticação
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/auth/login` | POST | ✅ Usado | ✅ `login` existe (não registrado) | **CRÍTICA** |
| `/auth/logout` | POST | ✅ Usado | ✅ `logout` existe (não registrado) | **CRÍTICA** |

**Observação:** Comandos de autenticação já existem mas não estão registrados no `main.rs`.

---

### 2. Pedidos (Orders)
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/pedidos/` | GET | ✅ Usado | ✅ `get_orders` existe (não registrado) | **ALTA** |
| `/pedidos/{id}` | GET | ✅ Usado | ✅ `get_order_by_id` existe (não registrado) | **ALTA** |
| `/pedidos/status/{status}` | GET | ✅ Usado | ❌ Não existe | **ALTA** |
| `/pedidos/` | POST | ✅ Usado | ✅ `create_order` existe (não registrado) | **ALTA** |
| `/pedidos/{id}` | PATCH | ✅ Usado | ✅ `update_order` existe (não registrado) | **ALTA** |
| `/pedidos/{id}` | PATCH (metadata) | ✅ Usado | ✅ `update_order_metadata` existe (não registrado) | **ALTA** |
| `/pedidos/{id}` | PATCH (status) | ✅ Usado | ✅ `update_order_status_flags` existe (não registrado) | **ALTA** |
| `/pedidos/{id}` | DELETE | ✅ Usado | ✅ `delete_order` existe (não registrado) | **ALTA** |
| `/pedidos/all` | DELETE | ✅ Usado | ❌ Não existe | **MÉDIA** |
| `/pedidos/reset-ids` | POST | ✅ Usado | ❌ Não existe | **BAIXA** |
| `/pedidos/save-json/{id}` | POST | ✅ Usado | ❌ Não existe | **BAIXA** |
| `/pedidos/` (filtros) | GET (query) | ✅ Usado | ✅ `get_orders_with_filters` existe (não registrado) | **ALTA** |
| `/pedidos/` (paginação pending) | GET | ✅ Usado | ✅ `get_pending_orders_paginated` existe (não registrado) | **ALTA** |
| `/pedidos/` (paginação ready) | GET | ✅ Usado | ✅ `get_ready_orders_paginated` existe (não registrado) | **ALTA** |
| `/pedidos/` (light pending) | GET | ✅ Usado | ✅ `get_pending_orders_light` existe (não registrado) | **ALTA** |
| `/pedidos/` (by delivery date) | GET | ✅ Usado | ✅ `get_orders_by_delivery_date` existe (não registrado) | **ALTA** |
| `/pedidos/{id}/history` | GET | ⚠️ Não usado | ✅ `get_order_audit_log` existe (não registrado) | **BAIXA** |
| `/pedidos/{id}/ficha` | GET | ✅ Usado | ✅ `get_order_ficha` existe (não registrado) | **MÉDIA** |

**Status:** 13 comandos já existem, 4 precisam ser criados, 1 não é usado atualmente.

---

### 3. Clientes
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/clientes/` | GET | ✅ Usado | ✅ `get_clientes` existe (não registrado) | **ALTA** |
| `/clientes/{id}` | GET | ✅ Usado | ✅ `get_cliente_by_id` existe (não registrado) | **ALTA** |
| `/clientes/` | POST | ✅ Usado | ✅ `create_cliente` existe (não registrado) | **ALTA** |
| `/clientes/{id}` | PATCH | ✅ Usado | ✅ `update_cliente` existe (não registrado) | **ALTA** |
| `/clientes/{id}` | DELETE | ✅ Usado | ✅ `delete_cliente` existe (não registrado) | **ALTA** |
| `/clientes/` (bulk import) | POST | ✅ Usado | ✅ `import_clientes_bulk` existe (não registrado) | **MÉDIA** |
| `/clientes/` (paginated) | GET | ⚠️ Usado indiretamente | ✅ `get_clientes_paginated` existe (não registrado) | **MÉDIA** |

**Status:** Todos os comandos já existem, apenas precisam ser registrados.

---

### 4. Vendedores
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/vendedores` | GET | ✅ Usado | ✅ `get_vendedores` existe (não registrado) | **ALTA** |
| `/vendedores/ativos` | GET | ✅ Usado | ✅ `get_vendedores_ativos` existe (não registrado) | **ALTA** |
| `/vendedores/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_vendedor_by_id` existe (não registrado) | **BAIXA** |
| `/vendedores` | POST | ✅ Usado | ✅ `create_vendedor` existe (não registrado) | **ALTA** |
| `/vendedores/{id}` | PATCH | ✅ Usado | ✅ `update_vendedor` existe (não registrado) | **ALTA** |
| `/vendedores/{id}` | DELETE | ✅ Usado | ✅ `delete_vendedor` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 5. Designers
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/designers/` | GET | ✅ Usado (cache) | ✅ `get_designers` existe (não registrado) | **ALTA** |
| `/designers/` (ativos filtrados) | GET | ✅ Usado | ✅ `get_designers_ativos` existe (não registrado) | **ALTA** |
| `/designers/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_designer_by_id` existe (não registrado) | **BAIXA** |
| `/designers/` | POST | ✅ Usado | ✅ `create_designer` existe (não registrado) | **ALTA** |
| `/designers/{id}` | PATCH | ✅ Usado | ✅ `update_designer` existe (não registrado) | **ALTA** |
| `/designers/{id}` | DELETE | ✅ Usado | ✅ `delete_designer` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 6. Materiais
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/materiais/` | GET | ✅ Usado (cache) | ✅ `get_materiais` existe (não registrado) | **ALTA** |
| `/materiais/` (por tipo) | GET | ✅ Usado | ✅ `get_materiais_ativos` existe (não registrado) | **ALTA** |
| `/materiais/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_material_by_id` existe (não registrado) | **BAIXA** |
| `/materiais/` | POST | ✅ Usado | ✅ `create_material` existe (não registrado) | **ALTA** |
| `/materiais/{id}` | PATCH | ✅ Usado | ✅ `update_material` existe (não registrado) | **ALTA** |
| `/materiais/{id}` | DELETE | ✅ Usado | ✅ `delete_material` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 7. Formas de Envio
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/tipos-envios` | GET | ✅ Usado | ✅ `get_formas_envio` existe (não registrado) | **ALTA** |
| `/tipos-envios/ativos` | GET | ✅ Usado | ✅ `get_formas_envio_ativas` existe (não registrado) | **ALTA** |
| `/tipos-envios/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_forma_envio_by_id` existe (não registrado) | **BAIXA** |
| `/tipos-envios` | POST | ✅ Usado | ✅ `create_forma_envio` existe (não registrado) | **ALTA** |
| `/tipos-envios/{id}` | PATCH | ✅ Usado | ✅ `update_forma_envio` existe (não registrado) | **ALTA** |
| `/tipos-envios/{id}` | DELETE | ✅ Usado | ✅ `delete_forma_envio` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 8. Formas de Pagamento
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/tipos-pagamentos` | GET | ✅ Usado | ✅ `get_formas_pagamento` existe (não registrado) | **ALTA** |
| `/tipos-pagamentos/ativos` | GET | ✅ Usado | ✅ `get_formas_pagamento_ativas` existe (não registrado) | **ALTA** |
| `/tipos-pagamentos/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_forma_pagamento_by_id` existe (não registrado) | **BAIXA** |
| `/tipos-pagamentos` | POST | ✅ Usado | ✅ `create_forma_pagamento` existe (não registrado) | **ALTA** |
| `/tipos-pagamentos/{id}` | PATCH | ✅ Usado | ✅ `update_forma_pagamento` existe (não registrado) | **ALTA** |
| `/tipos-pagamentos/{id}` | DELETE | ✅ Usado | ✅ `delete_forma_pagamento` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 9. Usuários
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/users` | GET | ✅ Usado | ✅ `get_users` existe (não registrado) | **ALTA** |
| `/users/{id}` | GET | ⚠️ Não usado diretamente | ✅ `get_user_by_id` existe (não registrado) | **BAIXA** |
| `/users` | POST | ✅ Usado | ✅ `create_user` existe (não registrado) | **ALTA** |
| `/users/{id}` | PATCH | ✅ Usado | ✅ `update_user` existe (não registrado) | **ALTA** |
| `/users/{id}` | DELETE | ✅ Usado | ✅ `delete_user` existe (não registrado) | **ALTA** |

**Status:** Todos os comandos já existem.

---

### 10. Templates de Fichas
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/fichas/templates` | GET | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |
| `/fichas/templates` | PUT | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |
| `/fichas/templates/html` | PUT | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |
| `/fichas/templates/html/{tipo}/content` | GET | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |

**Status:** Nenhum comando existe. Precisa ser criado do zero.

**Observação:** Templates podem ser armazenados em arquivos locais ou banco de dados.

---

### 11. Templates de Relatórios
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/relatorios/templates` | GET | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |
| `/relatorios/templates` | PUT | ✅ Usado | ❌ **NÃO EXISTE** | **MÉDIA** |

**Status:** Nenhum comando existe. Precisa ser criado do zero.

---

### 12. Relatórios
| Endpoint HTTP | Método | Status | Comando Tauri Existente | Prioridade |
|---------------|--------|--------|------------------------|------------|
| `/relatorios/generate` | POST | ⚠️ Processado localmente | ✅ `generate_report` existe (não registrado) | **ALTA** |

**Status:** Comando existe mas processamento é feito localmente no frontend atualmente.

---

## 📊 Estatísticas Gerais

### Resumo por Categoria

| Categoria | Total Endpoints | Comandos Existentes | Comandos Faltando | % Completo |
|-----------|----------------|---------------------|-------------------|------------|
| **Autenticação** | 2 | 2 | 0 | 100% |
| **Pedidos** | 16 | 13 | 3 | 81% |
| **Clientes** | 7 | 7 | 0 | 100% |
| **Vendedores** | 6 | 6 | 0 | 100% |
| **Designers** | 6 | 6 | 0 | 100% |
| **Materiais** | 6 | 6 | 0 | 100% |
| **Formas Envio** | 6 | 6 | 0 | 100% |
| **Formas Pagamento** | 6 | 6 | 0 | 100% |
| **Usuários** | 5 | 5 | 0 | 100% |
| **Templates Fichas** | 4 | 0 | 4 | 0% |
| **Templates Relatórios** | 2 | 0 | 2 | 0% |
| **Relatórios** | 1 | 1 | 0 | 100% |
| **TOTAL** | **67** | **58** | **9** | **87%** |

### Comandos Tauri Registrados no main.rs

**Atualmente registrados (9 comandos):**
- `open_devtools`, `close_devtools`, `toggle_devtools`, `is_devtools_open`, `test_devtools_system`
- `get_app_version`
- `check_update_manual`, `download_update_manual`, `install_update_manual`

**Total de comandos que precisam ser registrados: 58+**

---

## 🎯 Comandos que Precisam ser CRIADOS

### 1. Pedidos - Endpoints Faltando

#### 1.1 `get_orders_by_status`
**Endpoint HTTP:** `GET /pedidos/status/{status}`

**Prioridade:** ALTA  
**Complexidade:** BAIXA

**Implementação Necessária:**
```rust
#[tauri::command]
pub async fn get_orders_by_status(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    status: String, // "pendente" | "em_producao" | "pronto" | "entregue" | "cancelado"
) -> Result<Vec<OrderWithItems>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Mapear status string para OrderStatus enum
    let order_status = match status.as_str() {
        "pendente" => crate::models::OrderStatus::Pendente,
        "em_producao" => crate::models::OrderStatus::EmProcessamento,
        "pronto" => crate::models::OrderStatus::Concluido,
        "entregue" => crate::models::OrderStatus::Concluido,
        "cancelado" => crate::models::OrderStatus::Cancelado,
        _ => return Err("Status inválido".to_string()),
    };
    
    // Buscar pedidos com status específico
    // Similar a get_orders mas com filtro WHERE status = $1
}
```

---

#### 1.2 `delete_all_orders`
**Endpoint HTTP:** `DELETE /pedidos/all`

**Prioridade:** MÉDIA  
**Complexidade:** BAIXA

**Implementação Necessária:**
```rust
#[tauri::command]
pub async fn delete_all_orders(
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<bool, String> {
    let session = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Verificar se é admin
    if !session.is_admin {
        return Err("Acesso negado. Apenas administradores podem deletar todos os pedidos.".to_string());
    }
    
    // Deletar todos os pedidos (cascade deleta order_items)
    sqlx::query("DELETE FROM orders")
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar pedidos: {}", e))?;
    
    // Emitir evento se necessário
    Ok(true)
}
```

---

#### 1.3 `reset_order_ids`
**Endpoint HTTP:** `POST /pedidos/reset-ids`

**Prioridade:** BAIXA  
**Complexidade:** BAIXA

**Implementação Necessária:**
```rust
#[tauri::command]
pub async fn reset_order_ids(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<bool, String> {
    let session = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    if !session.is_admin {
        return Err("Acesso negado.".to_string());
    }
    
    // Resetar sequência do PostgreSQL
    sqlx::query("ALTER SEQUENCE orders_id_seq RESTART WITH 1")
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao resetar IDs: {}", e))?;
    
    Ok(true)
}
```

---

#### 1.4 `save_order_json`
**Endpoint HTTP:** `POST /pedidos/save-json/{id}`

**Prioridade:** BAIXA (pode ser removido)  
**Complexidade:** MÉDIA

**Observação:** Esta funcionalidade pode ser substituída por auditoria automática ou removida se não for crítica.

---

### 2. Templates de Fichas - Sistema Completo Faltando

**Prioridade:** MÉDIA  
**Complexidade:** MÉDIA-ALTA

**Estratégia de Armazenamento Recomendada:** Arquivos Locais

**Estrutura de Diretórios:**
```
~/.sgp/
├── templates/
│   ├── ficha_geral.html
│   ├── ficha_resumo.html
│   └── ficha_config.json
└── relatorios/
    └── relatorio_config.json
```

**Comandos Rust Necessários:**

```rust
// src-tauri/src/commands/templates.rs
use tauri::State;
use crate::session::SessionManager;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct FichaTemplatesConfig {
    // Estrutura conforme necessário (ajustar baseado em FichaTemplatesConfig do TypeScript)
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct RelatorioTemplatesConfig {
    // Estrutura conforme necessário (ajustar baseado em RelatorioTemplatesConfig do TypeScript)
}

fn get_templates_dir() -> Result<PathBuf, String> {
    let app_data = tauri::api::path::app_data_dir(&tauri::Config::default())
        .ok_or("Não foi possível obter diretório de dados")?;
    let templates_dir = app_data.join("templates");
    std::fs::create_dir_all(&templates_dir)
        .map_err(|e| format!("Erro ao criar diretório: {}", e))?;
    Ok(templates_dir)
}

#[tauri::command]
pub async fn get_ficha_templates(
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<FichaTemplatesConfig, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let config_path = get_templates_dir()?.join("ficha_config.json");
    
    if !config_path.exists() {
        return Ok(FichaTemplatesConfig::default());
    }
    
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Erro ao ler config: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Erro ao parsear JSON: {}", e))
}

#[tauri::command]
pub async fn save_ficha_templates(
    sessions: State<'_, SessionManager>,
    session_token: String,
    config: FichaTemplatesConfig,
) -> Result<FichaTemplatesConfig, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let config_path = get_templates_dir()?.join("ficha_config.json");
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Erro ao serializar: {}", e))?;
    
    std::fs::write(&config_path, json)
        .map_err(|e| format!("Erro ao salvar: {}", e))?;
    
    Ok(config)
}

#[tauri::command]
pub async fn get_ficha_template_html(
    sessions: State<'_, SessionManager>,
    session_token: String,
    template_type: String, // "geral" | "resumo"
) -> Result<Option<String>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let filename = match template_type.as_str() {
        "geral" => "ficha_geral.html",
        "resumo" => "ficha_resumo.html",
        _ => return Err("Tipo inválido".to_string()),
    };
    
    let html_path = get_templates_dir()?.join(filename);
    
    if !html_path.exists() {
        return Ok(None);
    }
    
    std::fs::read_to_string(&html_path)
        .map(Some)
        .map_err(|e| format!("Erro ao ler HTML: {}", e))
}

#[tauri::command]
pub async fn save_ficha_templates_html(
    sessions: State<'_, SessionManager>,
    session_token: String,
    html_content: HashMap<String, String>, // { geral: "...", resumo: "..." }
) -> Result<(), String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let templates_dir = get_templates_dir()?;
    
    for (tipo, html) in html_content {
        let filename = match tipo.as_str() {
            "geral" => "ficha_geral.html",
            "resumo" => "ficha_resumo.html",
            _ => continue,
        };
        
        let path = templates_dir.join(filename);
        std::fs::write(&path, html)
            .map_err(|e| format!("Erro ao salvar {}: {}", filename, e))?;
    }
    
    Ok(())
}

// Templates de Relatórios (similar)
#[tauri::command]
pub async fn get_relatorio_templates(
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<RelatorioTemplatesConfig, String> {
    // Implementação similar a get_ficha_templates
}

#[tauri::command]
pub async fn save_relatorio_templates(
    sessions: State<'_, SessionManager>,
    session_token: String,
    config: RelatorioTemplatesConfig,
) -> Result<RelatorioTemplatesConfig, String> {
    // Implementação similar a save_ficha_templates
}
```

---

### 3. Templates de Relatórios - Sistema Completo Faltando

**Prioridade:** MÉDIA  
**Complexidade:** MÉDIA

**Implementação:** Similar aos templates de fichas, usando mesma estrutura de diretórios.

---

## 📝 Comandos que Precisam ser REGISTRADOS no main.rs

### Atualizar `src-tauri/src/commands/mod.rs`

**Arquivo atual:**
```rust
pub mod devtools;
pub mod update;
pub mod manual_updater;
```

**Arquivo atualizado:**
```rust
pub mod devtools;
pub mod update;
pub mod manual_updater;
pub mod auth;
pub mod orders;
pub mod clientes;
pub mod vendedores;
pub mod designers;
pub mod materiais;
pub mod formas_envio;
pub mod formas_pagamento;
pub mod users;
pub mod reports;
pub mod templates; // Criar novo módulo
```

---

### Atualizar `src-tauri/src/main.rs`

**Importações necessárias:**

```rust
// Autenticação
use commands::auth::{login, logout};

// Pedidos
use commands::orders::{
    get_orders,
    get_order_by_id,
    get_pending_orders_paginated,
    get_ready_orders_paginated,
    get_pending_orders_light,
    create_order,
    update_order,
    update_order_metadata,
    update_order_status_flags,
    delete_order,
    get_orders_with_filters,
    get_orders_by_delivery_date,
    get_order_ficha,
    get_order_audit_log,
};

// Clientes
use commands::clientes::{
    get_clientes,
    get_clientes_paginated,
    get_cliente_by_id,
    create_cliente,
    update_cliente,
    delete_cliente,
    import_clientes_bulk,
};

// Vendedores
use commands::vendedores::{
    get_vendedores,
    get_vendedores_ativos,
    get_vendedor_by_id,
    create_vendedor,
    update_vendedor,
    delete_vendedor,
};

// Designers
use commands::designers::{
    get_designers,
    get_designers_ativos,
    get_designer_by_id,
    create_designer,
    update_designer,
    delete_designer,
};

// Materiais
use commands::materiais::{
    get_materiais,
    get_materiais_ativos,
    get_material_by_id,
    create_material,
    update_material,
    delete_material,
};

// Formas de Envio
use commands::formas_envio::{
    get_formas_envio,
    get_formas_envio_ativas,
    get_forma_envio_by_id,
    create_forma_envio,
    update_forma_envio,
    delete_forma_envio,
};

// Formas de Pagamento
use commands::formas_pagamento::{
    get_formas_pagamento,
    get_formas_pagamento_ativas,
    get_forma_pagamento_by_id,
    create_forma_pagamento,
    update_forma_pagamento,
    delete_forma_pagamento,
};

// Usuários
use commands::users::{
    get_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user,
};

// Relatórios
use commands::reports::generate_report;

// Templates
use commands::templates::{
    get_ficha_templates,
    save_ficha_templates,
    get_ficha_template_html,
    save_ficha_templates_html,
    get_relatorio_templates,
    save_relatorio_templates,
};
```

**Handler atualizado:**

```rust
.invoke_handler(tauri::generate_handler![
    // DevTools e Update (já existentes)
    open_devtools,
    close_devtools,
    toggle_devtools,
    is_devtools_open,
    test_devtools_system,
    get_app_version,
    check_update_manual,
    download_update_manual,
    install_update_manual,
    
    // Autenticação
    login,
    logout,
    
    // Pedidos
    get_orders,
    get_order_by_id,
    get_pending_orders_paginated,
    get_ready_orders_paginated,
    get_pending_orders_light,
    create_order,
    update_order,
    update_order_metadata,
    update_order_status_flags,
    delete_order,
    get_orders_with_filters,
    get_orders_by_delivery_date,
    get_order_ficha,
    get_order_audit_log,
    
    // Clientes
    get_clientes,
    get_clientes_paginated,
    get_cliente_by_id,
    create_cliente,
    update_cliente,
    delete_cliente,
    import_clientes_bulk,
    
    // Vendedores
    get_vendedores,
    get_vendedores_ativos,
    get_vendedor_by_id,
    create_vendedor,
    update_vendedor,
    delete_vendedor,
    
    // Designers
    get_designers,
    get_designers_ativos,
    get_designer_by_id,
    create_designer,
    update_designer,
    delete_designer,
    
    // Materiais
    get_materiais,
    get_materiais_ativos,
    get_material_by_id,
    create_material,
    update_material,
    delete_material,
    
    // Formas de Envio
    get_formas_envio,
    get_formas_envio_ativas,
    get_forma_envio_by_id,
    create_forma_envio,
    update_forma_envio,
    delete_forma_envio,
    
    // Formas de Pagamento
    get_formas_pagamento,
    get_formas_pagamento_ativas,
    get_forma_pagamento_by_id,
    create_forma_pagamento,
    update_forma_pagamento,
    delete_forma_pagamento,
    
    // Usuários
    get_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user,
    
    // Relatórios
    generate_report,
    
    // Templates
    get_ficha_templates,
    save_ficha_templates,
    get_ficha_template_html,
    save_ficha_templates_html,
    get_relatorio_templates,
    save_relatorio_templates,
])
```

---

## 🔧 Estratégia de Migração Frontend

### Criar Camada de Abstração

**Arquivo:** `src/services/tauriApi.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../store/authStore';
import { isTauri } from '@/utils/isTauri';
import * as httpApi from './api'; // Fallback HTTP

// Tipos
import {
  LoginRequest,
  LoginResponse,
  OrderWithItems,
  CreateOrderRequest,
  UpdateOrderRequest,
  UpdateOrderMetadataRequest,
  UpdateOrderStatusRequest,
  OrderFilters,
  PaginatedOrders,
  Cliente,
  CreateClienteRequest,
  UpdateClienteRequest,
  // ... outros tipos
} from '../types';

// Detectar se deve usar Tauri ou HTTP
const shouldUseTauri = (): boolean => {
  if (!isTauri()) {
    return false; // Web sempre usa HTTP
  }
  
  // Verificar flag de feature (variável de ambiente ou config)
  return import.meta.env.VITE_USE_TAURI_BACKEND === 'true' || true; // true por padrão em Tauri
};

const getSessionToken = (): string => {
  const token = useAuthStore.getState().sessionToken;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return token;
};

export const tauriApi = {
  // Autenticação
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    if (shouldUseTauri()) {
      return await invoke<LoginResponse>('login', { request });
    }
    return await httpApi.api.login(request);
  },

  logout: async (): Promise<void> => {
    try {
      const token = getSessionToken();
      if (shouldUseTauri()) {
        await invoke('logout', { sessionToken: token });
      } else {
        await httpApi.api.logout();
      }
    } finally {
      useAuthStore.getState().logout();
    }
  },

  // Pedidos
  getOrders: async (): Promise<OrderWithItems[]> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems[]>('get_orders', {
        sessionToken: getSessionToken(),
      });
    }
    return await httpApi.api.getOrders();
  },

  getOrderById: async (orderId: number): Promise<OrderWithItems> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems>('get_order_by_id', {
        sessionToken: getSessionToken(),
        orderId,
      });
    }
    return await httpApi.api.getOrderById(orderId);
  },

  getPendingOrdersPaginated: async (page?: number, pageSize?: number): Promise<PaginatedOrders> => {
    if (shouldUseTauri()) {
      return await invoke<PaginatedOrders>('get_pending_orders_paginated', {
        sessionToken: getSessionToken(),
        page,
        pageSize,
      });
    }
    return await httpApi.api.getPendingOrdersPaginated(page, pageSize);
  },

  getReadyOrdersPaginated: async (page?: number, pageSize?: number): Promise<PaginatedOrders> => {
    if (shouldUseTauri()) {
      return await invoke<PaginatedOrders>('get_ready_orders_paginated', {
        sessionToken: getSessionToken(),
        page,
        pageSize,
      });
    }
    return await httpApi.api.getReadyOrdersPaginated(page, pageSize);
  },

  createOrder: async (request: CreateOrderRequest): Promise<OrderWithItems> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems>('create_order', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.createOrder(request);
  },

  updateOrder: async (request: UpdateOrderRequest): Promise<OrderWithItems> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems>('update_order', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.updateOrder(request);
  },

  updateOrderMetadata: async (request: UpdateOrderMetadataRequest): Promise<OrderWithItems> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems>('update_order_metadata', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.updateOrderMetadata(request);
  },

  updateOrderStatus: async (request: UpdateOrderStatusRequest): Promise<OrderWithItems> => {
    if (shouldUseTauri()) {
      return await invoke<OrderWithItems>('update_order_status_flags', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.updateOrderStatus(request);
  },

  deleteOrder: async (orderId: number): Promise<boolean> => {
    if (shouldUseTauri()) {
      return await invoke<boolean>('delete_order', {
        sessionToken: getSessionToken(),
        orderId,
      });
    }
    return await httpApi.api.deleteOrder(orderId);
  },

  getOrdersWithFilters: async (filters: OrderFilters): Promise<PaginatedOrders> => {
    if (shouldUseTauri()) {
      return await invoke<PaginatedOrders>('get_orders_with_filters', {
        sessionToken: getSessionToken(),
        filters,
      });
    }
    return await httpApi.api.getOrdersWithFilters(filters);
  },

  // Clientes
  getClientes: async (): Promise<Cliente[]> => {
    if (shouldUseTauri()) {
      return await invoke<Cliente[]>('get_clientes', {
        sessionToken: getSessionToken(),
      });
    }
    return await httpApi.api.getClientes();
  },

  getClienteById: async (clienteId: number): Promise<Cliente> => {
    if (shouldUseTauri()) {
      return await invoke<Cliente>('get_cliente_by_id', {
        sessionToken: getSessionToken(),
        clienteId,
      });
    }
    return await httpApi.api.getClienteById(clienteId);
  },

  createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
    if (shouldUseTauri()) {
      return await invoke<Cliente>('create_cliente', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.createCliente(request);
  },

  updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
    if (shouldUseTauri()) {
      return await invoke<Cliente>('update_cliente', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.updateCliente(request);
  },

  deleteCliente: async (clienteId: number): Promise<boolean> => {
    if (shouldUseTauri()) {
      return await invoke<boolean>('delete_cliente', {
        sessionToken: getSessionToken(),
        clienteId,
      });
    }
    return await httpApi.api.deleteCliente(clienteId);
  },

  // Vendedores
  getVendedoresAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    if (shouldUseTauri()) {
      const vendedores = await invoke<any[]>('get_vendedores_ativos', {
        sessionToken: getSessionToken(),
      });
      return vendedores
        .filter((v) => Boolean(v?.nome))
        .map((v) => ({ id: v.id, nome: v.nome.trim() }))
        .filter((v) => v.nome.length > 0);
    }
    return await httpApi.api.getVendedoresAtivos();
  },

  // Designers
  getDesignersAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    if (shouldUseTauri()) {
      const designers = await invoke<any[]>('get_designers_ativos', {
        sessionToken: getSessionToken(),
      });
      const unique = new Map<string, any>();
      designers.forEach((designer) => {
        if (!designer?.ativo) return;
        const nome = designer.nome?.trim();
        if (!nome) return;
        const key = nome.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, designer);
        }
      });
      return Array.from(unique.values())
        .map((d) => ({ id: d.id, nome: d.nome.trim() }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return await httpApi.api.getDesignersAtivos();
  },

  // Materiais
  getMateriaisAtivosPorTipo: async (tipo: string): Promise<string[]> => {
    if (shouldUseTauri()) {
      const materiais = await invoke<any[]>('get_materiais_ativos', {
        sessionToken: getSessionToken(),
      });
      const normalizedTipo = tipo.trim().toLowerCase();
      const unique = new Set<string>();
      materiais.forEach((material) => {
        if (!material?.ativo) return;
        const materialTipo = String(material.tipo ?? '').trim().toLowerCase();
        if (materialTipo !== normalizedTipo) return;
        const nome = String(material.nome ?? '').trim();
        if (!nome) return;
        unique.add(nome);
      });
      return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return await httpApi.api.getMateriaisAtivosPorTipo(tipo);
  },

  // Formas de Envio
  getFormasEnvioAtivas: async (): Promise<Array<{ id: number; nome: string; valor: number }>> => {
    if (shouldUseTauri()) {
      const formas = await invoke<any[]>('get_formas_envio_ativas', {
        sessionToken: getSessionToken(),
      });
      return formas
        .filter((forma) => Boolean(forma?.nome))
        .map((forma) => ({
          id: forma.id,
          nome: forma.nome.trim(),
          valor: Number(forma.valor ?? 0),
        }))
        .filter((forma) => forma.nome.length > 0);
    }
    return await httpApi.api.getFormasEnvioAtivas();
  },

  // Formas de Pagamento
  getFormasPagamentoAtivas: async (): Promise<Array<{ id: number; nome: string }>> => {
    if (shouldUseTauri()) {
      const formas = await invoke<any[]>('get_formas_pagamento_ativas', {
        sessionToken: getSessionToken(),
      });
      return formas
        .filter((forma) => Boolean(forma?.nome))
        .map((forma) => ({ id: forma.id, nome: forma.nome }));
    }
    return await httpApi.api.getFormasPagamentoAtivas();
  },

  // Templates de Fichas
  getFichaTemplates: async (): Promise<any> => {
    if (shouldUseTauri()) {
      return await invoke('get_ficha_templates', {
        sessionToken: getSessionToken(),
      });
    }
    return await httpApi.api.getFichaTemplates();
  },

  saveFichaTemplates: async (config: any): Promise<any> => {
    if (shouldUseTauri()) {
      return await invoke('save_ficha_templates', {
        sessionToken: getSessionToken(),
        config,
      });
    }
    return await httpApi.api.saveFichaTemplates(config);
  },

  getFichaTemplateHTML: async (templateType: 'geral' | 'resumo'): Promise<{ html: string | null; exists: boolean }> => {
    if (shouldUseTauri()) {
      const html = await invoke<string | null>('get_ficha_template_html', {
        sessionToken: getSessionToken(),
        templateType,
      });
      return { html, exists: html !== null };
    }
    return await httpApi.api.getFichaTemplateHTML(templateType);
  },

  saveFichaTemplatesHTML: async (htmlContent: { geral: string; resumo: string }): Promise<void> => {
    if (shouldUseTauri()) {
      await invoke('save_ficha_templates_html', {
        sessionToken: getSessionToken(),
        htmlContent,
      });
    } else {
      await httpApi.api.saveFichaTemplatesHTML(htmlContent);
    }
  },

  // Templates de Relatórios
  getRelatorioTemplates: async (): Promise<any> => {
    if (shouldUseTauri()) {
      return await invoke('get_relatorio_templates', {
        sessionToken: getSessionToken(),
      });
    }
    return await httpApi.api.getRelatorioTemplates();
  },

  saveRelatorioTemplates: async (config: any): Promise<any> => {
    if (shouldUseTauri()) {
      return await invoke('save_relatorio_templates', {
        sessionToken: getSessionToken(),
        config,
      });
    }
    return await httpApi.api.saveRelatorioTemplates(config);
  },

  // Relatórios
  generateReport: async (request: any): Promise<any> => {
    if (shouldUseTauri()) {
      return await invoke('generate_report', {
        sessionToken: getSessionToken(),
        request,
      });
    }
    return await httpApi.api.generateReport(request);
  },

  // ... outros métodos seguindo mesmo padrão
};
```

**Uso no código:**

```typescript
// Substituir
import { api } from '../services/api';
const orders = await api.getOrders();

// Por
import { tauriApi } from '../services/tauriApi';
const orders = await tauriApi.getOrders();
```

---

## 📅 Cronograma Sugerido

### Semana 1: Preparação (2-3 dias)
- ✅ Atualizar `commands/mod.rs`
- ✅ Atualizar `main.rs` com todos os comandos
- ✅ Criar módulo `templates.rs`
- ✅ Testar compilação

### Semana 2: Comandos Faltantes (5-7 dias)
- ✅ Criar `get_orders_by_status`
- ✅ Criar `delete_all_orders`
- ✅ Criar `reset_order_ids` (opcional)
- ✅ Implementar sistema de templates
- ✅ Testes dos novos comandos

### Semana 3: Frontend - Infraestrutura (2-3 dias)
- ✅ Criar `tauriApi.ts`
- ✅ Implementar detecção de ambiente
- ✅ Testar wrappers básicos

### Semana 4: Frontend - Migração Principal (8-10 dias)
- ✅ Migrar autenticação
- ✅ Migrar módulo de pedidos
- ✅ Migrar catálogos (vendedores, designers, materiais)
- ✅ Migrar formas de envio e pagamento
- ✅ Migrar clientes
- ✅ Migrar usuários
- ✅ Testes extensivos

### Semana 5: Frontend - Templates e Finalização (3-5 dias)
- ✅ Migrar templates de fichas
- ✅ Migrar templates de relatórios
- ✅ Migrar relatórios
- ✅ Testes completos do sistema
- ✅ Validação lado a lado (Tauri vs HTTP)

### Semana 6: Limpeza e Documentação (1-2 dias)
- ✅ Remover código HTTP legado
- ✅ Atualizar documentação
- ✅ Validação final

**Tempo Total Estimado:** 21-30 dias (4-6 semanas)

---

## ⚠️ Pontos de Atenção

### 1. Sessões e Autenticação
- Backend Rust já implementa `SessionManager`
- Frontend deve passar `session_token` em todas as chamadas
- Migrar `useAuthStore` para suportar ambos os modos

### 2. Cache de Dados
- Backend Rust implementa cache (`CacheManager`)
- Avaliar remover cache frontend após migração
- Cache do Rust é mais eficiente (memória compartilhada)

### 3. Notificações e Eventos
- Backend Rust implementa sistema de notificações Tauri
- Migrar `useOrderEvents` para usar eventos Tauri
- Verificar `src/services/orderEvents.ts`

### 4. Processamento Local vs Servidor
- Manter processamento local para relatórios simples
- Backend Rust tem `generate_report` mais eficiente
- Avaliar migrar processamento pesado para Rust

### 5. Templates HTML
- **Recomendação:** Armazenar em arquivos locais (`~/.sgp/templates/`)
- Alternativa: Tabela PostgreSQL (coluna TEXT ou JSONB)
- Arquivos locais são mais simples e não poluem banco

### 6. Imagens e Arquivos
- Backend Rust pode servir arquivos via sistema de arquivos
- Manter referências de caminhos locais
- Verificar `src/utils/imageLoader.ts`

---

## 🧪 Plano de Testes

### Testes por Módulo

1. **Autenticação**
   - ✅ Login válido
   - ✅ Login inválido
   - ✅ Logout
   - ✅ Sessão expirada

2. **Pedidos**
   - ✅ Listar todos
   - ✅ Buscar por ID
   - ✅ Criar pedido
   - ✅ Atualizar pedido
   - ✅ Atualizar status
   - ✅ Deletar pedido
   - ✅ Filtros e paginação

3. **Catálogos**
   - ✅ CRUD completo de cada entidade
   - ✅ Listagens filtradas (ativos)

4. **Templates**
   - ✅ Salvar e recuperar templates
   - ✅ Templates HTML

---

## 📊 Benefícios da Migração

### Performance
- ✅ **Latência reduzida**: Comunicação direta sem rede
- ✅ **Sem overhead HTTP**: Protocolo Tauri é mais eficiente
- ✅ **Processamento local**: Menos dependências externas

### Segurança
- ✅ **Sem exposição de rede**: Não precisa de servidor HTTP rodando
- ✅ **Dados locais**: Banco de dados direto no PostgreSQL
- ✅ **Menos pontos de ataque**: Sem API externa acessível

### Manutenibilidade
- ✅ **Código unificado**: Backend e frontend no mesmo projeto
- ✅ **Tipos compartilhados**: Rust e TypeScript sincronizados
- ✅ **Deploy simplificado**: Apenas um binário

### Desenvolvimento
- ✅ **Feedback mais rápido**: Sem latência de rede em desenvolvimento
- ✅ **Debug facilitado**: Logs unificados
- ✅ **Testes mais fáceis**: Ambiente isolado

---

## 🚨 Riscos e Mitigações

### Risco 1: Quebra de Funcionalidades Durante Migração
**Mitigação:**
- Implementar flag de feature (`USE_TAURI_BACKEND`)
- Manter código HTTP como fallback
- Testar extensivamente antes de remover HTTP

### Risco 2: Diferenças de Comportamento
**Mitigação:**
- Manter mesma estrutura de dados
- Testes de regressão
- Validação lado a lado (Tauri vs HTTP)

### Risco 3: Templates Armazenados na API Externa
**Mitigação:**
- Criar script de migração de templates
- Manter backup antes de migrar
- Permitir importação manual

---

## ✅ Conclusão

**Resumo Executivo:**
- ✅ **87% do trabalho já está feito** (58 comandos existem)
- ⚠️ **Apenas 9 comandos precisam ser criados**
- 🔧 **Principal trabalho: Registrar comandos e atualizar frontend**
- 📊 **Migração é totalmente viável e altamente recomendada**

**Benefícios:**
- Performance melhor (sem latência de rede)
- Segurança melhor (sem API externa)
- Manutenibilidade melhor (código unificado)
- Deploy simplificado (apenas binário)

**Próximos Passos:**
1. Revisar este documento
2. Aprovar estratégia de migração
3. Iniciar Fase 1 (Preparação)
4. Implementar em sprints conforme priorização

---

## 📎 Anexos

### A. Estrutura de Banco de Dados (Relevante)

O sistema usa PostgreSQL com as seguintes tabelas principais:
- `users` - Usuários do sistema
- `orders` - Pedidos
- `order_items` - Itens dos pedidos
- `clientes` - Clientes
- `designers` - Designers
- `vendedores` - Vendedores
- `materiais` - Materiais
- `tipos_envios` - Formas de envio
- `tipos_pagamentos` - Formas de pagamento

### B. Sistema de Eventos Tauri

Backend Rust já implementa sistema de eventos para notificações em tempo real:
- `order-created`
- `order-updated`
- `order-deleted`
- `order-status-changed`

Frontend deve migrar de WebSockets (se houver) para eventos Tauri.

### C. Comandos Tauri Atualmente Registrados

```rust
// src-tauri/src/main.rs (atual)
.invoke_handler(tauri::generate_handler![
    open_devtools,
    close_devtools,
    toggle_devtools,
    is_devtools_open,
    test_devtools_system,
    get_app_version,
    check_update_manual,
    download_update_manual,
    install_update_manual
])
```

---

**Documento gerado em:** 2026-01-03  
**Versão:** 1.0  
**Status:** Análise Completa ✅


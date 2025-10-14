use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ========================================
// Tipos e Enums
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "order_status", rename_all = "PascalCase")]
pub enum OrderStatus {
    Pendente,
    #[sqlx(rename = "Em Processamento")]
    EmProcessamento,
    #[sqlx(rename = "Concluído")]
    Concluido,
    Cancelado,
}

// ========================================
// Modelos de Banco de Dados
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub is_admin: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: i32,
    pub customer_name: String,
    pub address: String,
    pub total_value: rust_decimal::Decimal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    pub status: OrderStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: i32,
    pub order_id: i32,
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: rust_decimal::Decimal,
    pub subtotal: rust_decimal::Decimal,
}

// ========================================
// DTOs (Data Transfer Objects)
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user_id: Option<i32>,
    pub username: Option<String>,
    pub is_admin: Option<bool>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderWithItems {
    pub id: i32,
    pub customer_name: String,
    pub address: String,
    pub total_value: rust_decimal::Decimal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    pub status: OrderStatus,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_name: String,
    pub address: String,
    pub status: OrderStatus,
    pub items: Vec<CreateOrderItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderItemRequest {
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderRequest {
    pub id: i32,
    pub customer_name: String,
    pub address: String,
    pub status: OrderStatus,
    pub items: Vec<UpdateOrderItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderItemRequest {
    pub id: Option<i32>,
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderFilters {
    pub status: Option<OrderStatus>,
    pub customer_name: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedOrders {
    pub orders: Vec<OrderWithItems>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

// ========================================
// Cliente
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Cliente {
    pub id: i32,
    pub nome: String,
    pub cep: String,
    pub cidade: String,
    pub estado: String,
    pub telefone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClienteRequest {
    pub nome: String,
    pub cep: String,
    pub cidade: String,
    pub estado: String,
    pub telefone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClienteRequest {
    pub id: i32,
    pub nome: String,
    pub cep: String,
    pub cidade: String,
    pub estado: String,
    pub telefone: String,
}

// ========================================
// Materiais
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Material {
    pub id: i32,
    pub nome: String,
    pub tipo: String,
    pub valor_metro: rust_decimal::Decimal,
    pub estoque_metros: rust_decimal::Decimal,
    pub ativo: bool,
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMaterialRequest {
    pub nome: String,
    pub tipo: String,
    pub valor_metro: f64,
    pub estoque_metros: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMaterialRequest {
    pub id: i32,
    pub nome: String,
    pub tipo: String,
    pub valor_metro: f64,
    pub estoque_metros: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}

// ========================================
// Designers
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Designer {
    pub id: i32,
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub ativo: bool,
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDesignerRequest {
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub ativo: bool,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDesignerRequest {
    pub id: i32,
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub ativo: bool,
    pub observacao: Option<String>,
}

// ========================================
// Vendedores
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vendedor {
    pub id: i32,
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub comissao_percentual: rust_decimal::Decimal,
    pub ativo: bool,
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVendedorRequest {
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub comissao_percentual: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVendedorRequest {
    pub id: i32,
    pub nome: String,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub comissao_percentual: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}

// ========================================
// Formas de Envio
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FormaEnvio {
    pub id: i32,
    pub nome: String,
    pub valor: rust_decimal::Decimal,
    pub prazo_dias: i32,
    pub ativo: bool,
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormaEnvioRequest {
    pub nome: String,
    pub valor: f64,
    pub prazo_dias: i32,
    pub ativo: bool,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormaEnvioRequest {
    pub id: i32,
    pub nome: String,
    pub valor: f64,
    pub prazo_dias: i32,
    pub ativo: bool,
    pub observacao: Option<String>,
}

// ========================================
// Formas de Pagamento
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FormaPagamento {
    pub id: i32,
    pub nome: String,
    pub parcelas_max: i32,
    pub taxa_percentual: rust_decimal::Decimal,
    pub ativo: bool,
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormaPagamentoRequest {
    pub nome: String,
    pub parcelas_max: i32,
    pub taxa_percentual: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormaPagamentoRequest {
    pub id: i32,
    pub nome: String,
    pub parcelas_max: i32,
    pub taxa_percentual: f64,
    pub ativo: bool,
    pub observacao: Option<String>,
}


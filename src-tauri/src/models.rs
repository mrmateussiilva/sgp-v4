use serde::{Deserialize, Serialize};
use serde_json::Value;
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub numero: Option<String>,
    pub cliente: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cidade_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estado_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telefone_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_entrada: Option<chrono::NaiveDate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_entrega: Option<chrono::NaiveDate>,
    pub total_value: rust_decimal::Decimal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_frete: Option<rust_decimal::Decimal>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    pub status: OrderStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prioridade: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub financeiro: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conferencia: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sublimacao: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub costura: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expedicao: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_envio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_pagamento_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pronto: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: i32,
    pub order_id: i32,
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: rust_decimal::Decimal,
    pub subtotal: rust_decimal::Decimal,

    // Campos detalhados do painel
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_producao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub descricao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub largura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub altura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metro_quadrado: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendedor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub designer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tecido: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overloque: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elastico: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_acabamento: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imagem: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_paineis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_unitario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda_qtd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terceirizado: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acabamento_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ziper: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cordinha_extra: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alcinha: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toalha_pronta: Option<bool>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_token: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderWithItems {
    pub id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub numero: Option<String>,
    pub cliente: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cidade_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estado_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telefone_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_entrada: Option<chrono::NaiveDate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_entrega: Option<chrono::NaiveDate>,
    pub total_value: rust_decimal::Decimal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_frete: Option<rust_decimal::Decimal>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    pub status: OrderStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prioridade: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub financeiro: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conferencia: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sublimacao: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub costura: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expedicao: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_envio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_pagamento_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pronto: Option<bool>,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderAuditLogEntry {
    pub id: i32,
    pub order_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_by: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_by_name: Option<String>,
    pub changes: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub cliente: String,
    pub cidade_cliente: String,
    pub estado_cliente: Option<String>,
    pub status: OrderStatus,
    pub items: Vec<CreateOrderItemRequest>,
    // Campos adicionais do formulário
    pub numero: Option<String>,
    pub data_entrada: String, // Obrigatório
    pub data_entrega: Option<String>,
    pub forma_envio: Option<String>,
    pub forma_pagamento_id: Option<i32>,
    pub prioridade: Option<String>,
    pub observacao: Option<String>,
    pub telefone_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_frete: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderItemRequest {
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: f64,

    // Campos detalhados do painel
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_producao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub descricao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub largura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub altura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metro_quadrado: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendedor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub designer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tecido: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overloque: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elastico: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_acabamento: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imagem: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_paineis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_unitario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda_qtd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terceirizado: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acabamento_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ziper: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cordinha_extra: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alcinha: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toalha_pronta: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderRequest {
    pub id: i32,
    pub cliente: String,
    pub cidade_cliente: String,
    pub status: OrderStatus,
    pub items: Vec<UpdateOrderItemRequest>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_frete: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderMetadataRequest {
    pub id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cidade_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estado_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telefone_cliente: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_entrega: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prioridade: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_envio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forma_pagamento_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_frete: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<OrderStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderItemRequest {
    pub id: Option<i32>,
    pub item_name: String,
    pub quantity: i32,
    pub unit_price: f64,

    // Campos detalhados do painel
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_producao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub descricao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub largura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub altura: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metro_quadrado: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendedor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub designer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tecido: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overloque: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elastico: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_acabamento: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_ilhos: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub espaco_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_cordinha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observacao: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imagem: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_paineis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_unitario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emenda_qtd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terceirizado: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acabamento_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_lona: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tipo_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valor_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantidade_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outros_valores_adesivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ziper: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cordinha_extra: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alcinha: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toalha_pronta: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub id: i32,
    pub financeiro: Option<bool>,
    pub conferencia: Option<bool>,
    pub sublimacao: Option<bool>,
    pub costura: Option<bool>,
    pub expedicao: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderFilters {
    pub status: Option<OrderStatus>,
    pub cliente: Option<String>,
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
// Relatórios
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportRequest {
    pub report_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTotals {
    pub valor_frete: f64,
    pub valor_servico: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportRowData {
    pub ficha: String,
    pub descricao: String,
    pub valor_frete: f64,
    pub valor_servico: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportGroup {
    pub key: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows: Option<Vec<ReportRowData>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subgroups: Option<Vec<ReportGroup>>,
    pub subtotal: ReportTotals,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportResponse {
    pub title: String,
    pub period_label: String,
    pub status_label: String,
    pub page: i32,
    pub generated_at: String,
    pub report_type: String,
    pub groups: Vec<ReportGroup>,
    pub total: ReportTotals,
}

// ========================================
// Cliente
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Cliente {
    pub id: i32,
    pub nome: String,
    pub cep: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub telefone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClienteRequest {
    pub nome: String,
    pub cep: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub telefone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClienteRequest {
    pub id: i32,
    pub nome: String,
    pub cep: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub telefone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkClienteImportItem {
    pub nome: String,
    #[serde(default)]
    pub cep: Option<String>,
    #[serde(default)]
    pub cidade: Option<String>,
    #[serde(default)]
    pub estado: Option<String>,
    #[serde(default)]
    pub telefone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkClienteImportRequest {
    pub clientes: Vec<BulkClienteImportItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkClienteImportError {
    pub index: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nome: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkClienteImportResult {
    pub imported: Vec<Cliente>,
    pub errors: Vec<BulkClienteImportError>,
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

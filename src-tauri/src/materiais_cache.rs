use serde::{Deserialize, Serialize};
use tauri::State;
use sqlx::{PgPool, Row};
use crate::db::DbPool;
use crate::session::SessionManager;
use crate::cache::CacheManager;
use tracing::{error, debug};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialRow {
    pub order_id: i32,
    pub numero: String,
    pub cliente: String,
    pub tipo_producao: String,
    pub material: String,
    pub descricao: String,
    pub medida: String,
    pub data_entrada: String,
    pub data_entrega: String,
    pub linear_meters: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartPoint {
    pub name: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MateriaisMetrics {
    pub total_meters: f64,
    pub unique_orders: usize,
    pub unique_customers: usize,
    pub total_items: usize,
    pub top_material_name: Option<String>,
    pub top_material_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MateriaisCacheData {
    pub rows: Vec<MaterialRow>,
    pub metrics: MateriaisMetrics,
    pub bar_chart: Vec<ChartPoint>,
    pub pie_chart: Vec<ChartPoint>,
    pub area_chart: Vec<ChartPoint>,
    pub materials_list: Vec<String>,
    pub last_updated: String,
}

#[tauri::command]
pub async fn get_materiais_cache(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    date_from: Option<String>,
    date_to: Option<String>,
    search: Option<String>,
) -> Result<MateriaisCacheData, String> {
    sessions.require_authenticated(&session_token).await.map_err(|e| e.to_string())?;

    let cache_key = format!("materiais_cache_{}_{}", 
        date_from.as_deref().unwrap_or("all"), 
        date_to.as_deref().unwrap_or("all")
    );

    // Tenta obter do cache in-memory primeiro
    if let Some(mut data) = cache.get::<MateriaisCacheData>(&cache_key).await {
        if let Some(term) = search {
            if !term.trim().is_empty() {
                let term = term.to_lowercase();
                data.rows.retain(|r| {
                    r.material.to_lowercase().contains(&term) ||
                    r.descricao.to_lowercase().contains(&term) ||
                    r.cliente.to_lowercase().contains(&term) ||
                    r.numero.contains(&term) ||
                    r.tipo_producao.to_lowercase().contains(&term)
                });
            }
        }
        return Ok(data);
    }

    // Se não estiver no cache, reconstrói
    let data = build_materiais_data(pool.inner(), date_from, date_to).await?;
    
    // Salva no cache por 5 minutos
    cache.set(cache_key.clone(), data.clone(), Duration::from_secs(300)).await;

    // Aplica o filtro de busca no resultado final se houver
    let mut final_data = data;
    if let Some(term) = search {
        if !term.trim().is_empty() {
            let term = term.to_lowercase();
            final_data.rows.retain(|r| {
                r.material.to_lowercase().contains(&term) ||
                r.descricao.to_lowercase().contains(&term) ||
                r.cliente.to_lowercase().contains(&term) ||
                r.numero.contains(&term) ||
                r.tipo_producao.to_lowercase().contains(&term)
            });
        }
    }

    Ok(final_data)
}

async fn build_materiais_data(
    pool: &PgPool,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<MateriaisCacheData, String> {
    debug!("Reconstruindo cache de materiais para o período {:?} - {:?}", date_from, date_to);

    // Query unificada para buscar pedidos e itens filtrados por data
    let mut query = String::from(
        "SELECT 
            p.id as order_id, 
            p.numero, 
            p.cliente, 
            p.data_entrada, 
            p.data_entrega,
            i.tipo_producao,
            i.tecido,
            i.material_gasto,
            i.composicao_tecidos,
            i.descricao,
            i.item_name,
            i.largura,
            i.altura,
            i.metro_quadrado,
            i.quantity
         FROM pedidos p
         JOIN pedido_items i ON p.id = i.pedido_id
         WHERE 1=1"
    );

    if date_from.is_some() {
        query.push_str(" AND p.data_entrada >= $1");
    }
    if date_to.is_some() {
        if date_from.is_some() {
            query.push_str(" AND p.data_entrada <= $2");
        } else {
            query.push_str(" AND p.data_entrada <= $1");
        }
    }
    query.push_str(" ORDER BY p.data_entrada DESC");

    let mut sql_query = sqlx::query(&query);
    if let Some(ref from) = date_from {
        sql_query = sql_query.bind(from);
    }
    if let Some(ref to) = date_to {
        sql_query = sql_query.bind(to);
    }

    let rows: Vec<sqlx::postgres::PgRow> = sql_query.fetch_all(pool).await.map_err(|e: sqlx::Error| e.to_string())?;

    let mut material_rows = Vec::new();
    let mut unique_orders = std::collections::HashSet::new();
    let mut unique_customers = std::collections::HashSet::new();
    let mut material_counts: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut type_counts: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut date_counts: std::collections::BTreeMap<String, f64> = std::collections::BTreeMap::new();
    let mut unique_materials = std::collections::HashSet::new();
    let mut total_meters = 0.0;

    for row in rows {
        let order_id: i32 = row.get("order_id");
        let numero: String = row.get::<Option<String>, _>("numero").unwrap_or_else(|| order_id.to_string());
        let cliente: String = row.get::<Option<String>, _>("cliente").unwrap_or_else(|| "—".to_string());
        let data_entrada: String = row.get::<Option<String>, _>("data_entrada").unwrap_or_default();
        let data_entrega: String = row.get::<Option<String>, _>("data_entrega").unwrap_or_default();
        
        let tipo_producao: String = row.get::<Option<String>, _>("tipo_producao").unwrap_or_else(|| "—".to_string());
        let material = get_material_name(&row);
        let descricao: String = row.get::<Option<String>, _>("descricao")
            .or_else(|| row.get::<Option<String>, _>("item_name"))
            .unwrap_or_else(|| "—".to_string());
        
        let medida = get_medida_string(&row);
        let linear_meters = calculate_linear_meters(&row);

        unique_orders.insert(order_id);
        unique_customers.insert(cliente.clone());
        if material != "—" {
            unique_materials.insert(material.clone());
            *material_counts.entry(material.clone()).or_insert(0.0) += linear_meters;
        }
        *type_counts.entry(tipo_producao.clone()).or_insert(0.0) += 1.0;
        
        if !data_entrada.is_empty() {
            let date_key = data_entrada.split('T').next().unwrap_or("—").to_string();
            *date_counts.entry(date_key).or_insert(0.0) += linear_meters;
        }

        total_meters += linear_meters;

        material_rows.push(MaterialRow {
            order_id,
            numero,
            cliente,
            tipo_producao,
            material,
            descricao,
            medida,
            data_entrada,
            data_entrega,
            linear_meters,
        });
    }

    // Top material
    let top_material = material_counts.iter()
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(k, v)| (k.clone(), *v));

    // Bar Chart
    let mut bar_chart: Vec<ChartPoint> = material_counts.into_iter()
        .map(|(name, value)| ChartPoint { name, value })
        .collect();
    bar_chart.sort_by(|a, b| b.value.partial_cmp(&a.value).unwrap_or(std::cmp::Ordering::Equal));
    bar_chart.truncate(10);

    // Pie Chart
    let mut pie_chart: Vec<ChartPoint> = type_counts.into_iter()
        .map(|(name, value)| ChartPoint { name, value })
        .collect();
    pie_chart.sort_by(|a, b| b.value.partial_cmp(&a.value).unwrap_or(std::cmp::Ordering::Equal));
    pie_chart.truncate(7);

    // Area Chart
    let area_chart: Vec<ChartPoint> = date_counts.into_iter()
        .map(|(name, value)| ChartPoint { name, value })
        .collect();

    let mut materials_list: Vec<String> = unique_materials.into_iter().collect();
    materials_list.sort();

    Ok(MateriaisCacheData {
        rows: material_rows,
        metrics: MateriaisMetrics {
            total_meters,
            unique_orders: unique_orders.len(),
            unique_customers: unique_customers.len(),
            total_items: total_meters as usize, // Simplesmente para preencher, podemos ajustar
            top_material_name: top_material.as_ref().map(|m| m.0.clone()),
            top_material_value: top_material.map(|m| m.1),
        },
        bar_chart,
        pie_chart,
        area_chart,
        materials_list,
        last_updated: chrono::Utc::now().to_rfc3339(),
    })
}

fn get_material_name(row: &sqlx::postgres::PgRow) -> String {
    let tecido: Option<String> = row.get("tecido");
    let tipo: Option<String> = row.get("tipo_producao");
    let gasto: Option<String> = row.get("material_gasto");
    let comp: Option<String> = row.get("composicao_tecidos");

    tecido.or(tipo).or(gasto).or(comp)
        .map(|s: String| s.trim().to_string())
        .filter(|s: &String| !s.is_empty())
        .unwrap_or_else(|| "—".to_string())
}

fn get_medida_string(row: &sqlx::postgres::PgRow) -> String {
    let largura: Option<String> = row.get("largura");
    let altura: Option<String> = row.get("altura");
    let m2: Option<String> = row.get("metro_quadrado");

    let l = largura.unwrap_or_default();
    let a = altura.unwrap_or_default();
    let sq = m2.unwrap_or_default();

    if !l.is_empty() && !a.is_empty() {
        if !sq.is_empty() {
            format!("{} x {} = {} m²", l, a, sq)
        } else {
            format!("{} x {}", l, a)
        }
    } else if !sq.is_empty() {
        format!("{} m²", sq)
    } else {
        "—".to_string()
    }
}

fn calculate_linear_meters(row: &sqlx::postgres::PgRow) -> f64 {
    let qty: f64 = row.get::<Option<f64>, _>("quantity")
        .unwrap_or(1.0);
    
    let h = row.get::<Option<String>, _>("altura")
        .and_then(|s: String| s.replace(',', ".").parse::<f64>().ok())
        .unwrap_or(0.0);
    
    let w = row.get::<Option<String>, _>("largura")
        .and_then(|s: String| s.replace(',', ".").parse::<f64>().ok())
        .unwrap_or(0.0);

    let comprimento = if h > 0.0 { h } else { w };
    comprimento * qty
}

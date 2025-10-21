use std::collections::{BTreeMap, HashSet};

use chrono::{Local, NaiveDate};
use rust_decimal::prelude::ToPrimitive;
use sqlx::FromRow;
use sqlx::QueryBuilder;
use tauri::State;
use tracing::error;

use crate::db::DbPool;
use crate::models::{ReportGroup, ReportRequest, ReportResponse, ReportRowData, ReportTotals};
use crate::session::SessionManager;

#[derive(Debug, Clone, FromRow)]
struct ReportDataRow {
    order_id: i32,
    numero: Option<String>,
    cliente: String,
    forma_envio: Option<String>,
    data_entrada: Option<NaiveDate>,
    data_entrega: Option<NaiveDate>,
    status: String,
    valor_frete: Option<rust_decimal::Decimal>,
    item_id: i32,
    item_name: String,
    item_descricao: Option<String>,
    item_tipo: Option<String>,
    designer: Option<String>,
    subtotal: rust_decimal::Decimal,
}

#[derive(Debug, Clone)]
struct PreparedRecord {
    order_id: i32,
    ficha: String,
    cliente: String,
    designer: String,
    forma_envio: String,
    tipo_producao: String,
    descricao: String,
    data_referencia: Option<NaiveDate>,
    status: String,
    valor_frete: f64,
    valor_servico: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReportKind {
    AnalyticalDesignerCliente,
    AnalyticalClienteDesigner,
    AnalyticalClientePainel,
    AnalyticalDesignerPainel,
    AnalyticalEntregaPainel,
    SyntheticData,
    SyntheticDesigner,
    SyntheticCliente,
    SyntheticEntrega,
}

impl ReportKind {
    fn from_str(value: &str) -> Result<Self, String> {
        match value.to_lowercase().as_str() {
            "analitico_designer_cliente" => Ok(Self::AnalyticalDesignerCliente),
            "analitico_cliente_designer" => Ok(Self::AnalyticalClienteDesigner),
            "analitico_cliente_painel" => Ok(Self::AnalyticalClientePainel),
            "analitico_designer_painel" => Ok(Self::AnalyticalDesignerPainel),
            "analitico_entrega_painel" => Ok(Self::AnalyticalEntregaPainel),
            "sintetico_data" => Ok(Self::SyntheticData),
            "sintetico_designer" => Ok(Self::SyntheticDesigner),
            "sintetico_cliente" => Ok(Self::SyntheticCliente),
            "sintetico_entrega" => Ok(Self::SyntheticEntrega),
            other => Err(format!("Tipo de relatório desconhecido: {}", other)),
        }
    }
}

#[tauri::command]
pub async fn generate_report(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: ReportRequest,
) -> Result<ReportResponse, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;

    let report_kind = ReportKind::from_str(&request.report_type)?;

    let start_date = parse_date(request.start_date.as_deref())?;
    let end_date = parse_date(request.end_date.as_deref())?;

    let status_filter = request
        .status
        .clone()
        .filter(|value| !value.trim().is_empty() && value.to_lowercase() != "todos");

    let rows = fetch_records(pool.inner(), start_date, end_date, status_filter.as_deref()).await?;

    let prepared_records = normalize_records(rows);

    let filtered_records: Vec<PreparedRecord> = match report_kind {
        ReportKind::AnalyticalClientePainel
        | ReportKind::AnalyticalDesignerPainel
        | ReportKind::AnalyticalEntregaPainel => prepared_records
            .into_iter()
            .filter(|record| record.tipo_producao.to_lowercase() == "painel")
            .collect(),
        _ => prepared_records,
    };

    let groups = match report_kind {
        ReportKind::AnalyticalDesignerCliente => build_two_level_groups(
            &filtered_records,
            |record| record.designer.clone(),
            |record| record.cliente.clone(),
            |label| format!("> {} – DESIGNER", label.to_uppercase()),
            |label| format!("> {} – CLIENTE", label.to_uppercase()),
        ),
        ReportKind::AnalyticalClienteDesigner => build_two_level_groups(
            &filtered_records,
            |record| record.cliente.clone(),
            |record| record.designer.clone(),
            |label| format!("> {} – CLIENTE", label.to_uppercase()),
            |label| format!("> {} – DESIGNER", label.to_uppercase()),
        ),
        ReportKind::AnalyticalClientePainel => build_two_level_groups(
            &filtered_records,
            |record| record.cliente.clone(),
            |record| record.descricao.clone(),
            |label| format!("> {} – CLIENTE", label.to_uppercase()),
            |label| format!("> {}", label),
        ),
        ReportKind::AnalyticalDesignerPainel => build_two_level_groups(
            &filtered_records,
            |record| record.designer.clone(),
            |record| record.descricao.clone(),
            |label| format!("> {} – DESIGNER", label.to_uppercase()),
            |label| format!("> {}", label),
        ),
        ReportKind::AnalyticalEntregaPainel => build_two_level_groups(
            &filtered_records,
            |record| record.forma_envio.clone(),
            |record| record.descricao.clone(),
            |label| format!("> {} – ENTREGA", label.to_uppercase()),
            |label| format!("> {}", label),
        ),
        ReportKind::SyntheticData => build_single_level_groups(
            &filtered_records,
            |record| {
                record
                    .data_referencia
                    .map(|date| date.format("%d/%m/%Y").to_string())
                    .unwrap_or_else(|| "SEM DATA".to_string())
            },
            |label| format!("> {}", label),
        ),
        ReportKind::SyntheticDesigner => build_single_level_groups(
            &filtered_records,
            |record| record.designer.clone(),
            |label| format!("> {} – DESIGNER", label.to_uppercase()),
        ),
        ReportKind::SyntheticCliente => build_single_level_groups(
            &filtered_records,
            |record| record.cliente.clone(),
            |label| format!("> {} – CLIENTE", label.to_uppercase()),
        ),
        ReportKind::SyntheticEntrega => build_single_level_groups(
            &filtered_records,
            |record| record.forma_envio.clone(),
            |label| format!("> {} – ENTREGA", label.to_uppercase()),
        ),
    };

    let total = groups
        .iter()
        .fold(ReportTotals::default(), |mut acc, group| {
            acc.valor_frete += group.subtotal.valor_frete;
            acc.valor_servico += group.subtotal.valor_servico;
            acc
        });

    let period_label = format_period_label(start_date, end_date);
    let status_label = request
        .status
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.to_string())
        .unwrap_or_else(|| "Todos".to_string());

    let response = ReportResponse {
        title: "Relatório de Serviços por Período".to_string(),
        period_label,
        status_label: format!("Status: {}", status_label),
        page: 1,
        generated_at: Local::now().format("%d/%m/%Y %H:%M").to_string(),
        report_type: request.report_type.clone(),
        groups,
        total,
    };

    Ok(response)
}

async fn fetch_records(
    pool: &DbPool,
    start_date: Option<NaiveDate>,
    end_date: Option<NaiveDate>,
    status: Option<&str>,
) -> Result<Vec<ReportDataRow>, String> {
    let mut builder = QueryBuilder::new(
        "SELECT
            o.id AS order_id,
            o.numero,
            o.cliente,
            o.forma_envio,
            o.data_entrada,
            o.data_entrega,
            CAST(o.status AS TEXT) AS status,
            o.valor_frete,
            oi.id AS item_id,
            oi.item_name,
            oi.descricao AS item_descricao,
            oi.tipo_producao AS item_tipo,
            oi.designer,
            oi.subtotal
         FROM orders o
         INNER JOIN order_items oi ON oi.order_id = o.id
         WHERE 1 = 1",
    );

    if let Some(start) = start_date {
        builder.push(" AND COALESCE(o.data_entrada, o.data_entrega) >= ");
        builder.push_bind(start);
    }

    if let Some(end) = end_date {
        builder.push(" AND COALESCE(o.data_entrada, o.data_entrega) <= ");
        builder.push_bind(end);
    }

    if let Some(status_value) = status {
        builder.push(" AND CAST(o.status AS TEXT) = ");
        builder.push_bind(status_value);
    }

    builder.push(
        " ORDER BY
            COALESCE(o.data_entrada, o.data_entrega),
            o.cliente,
            oi.designer NULLS LAST,
            oi.descricao NULLS LAST,
            oi.item_name",
    );

    let query = builder.build_query_as::<ReportDataRow>();

    query.fetch_all(pool).await.map_err(|error| {
        error!("Erro ao buscar dados para relatório: {}", error);
        "Erro ao buscar dados para o relatório".to_string()
    })
}

fn normalize_records(rows: Vec<ReportDataRow>) -> Vec<PreparedRecord> {
    let mut seen_orders = HashSet::new();

    rows.into_iter()
        .map(|row| {
            let ficha = row
                .numero
                .clone()
                .unwrap_or_else(|| format!("PED-{:06}", row.order_id));

            let designer = row
                .designer
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "SEM DESIGNER".to_string());

            let forma_envio = row
                .forma_envio
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "SEM FORMA".to_string());

            let tipo_producao = row
                .item_tipo
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "SERVIÇO".to_string());

            let descricao_base = row
                .item_descricao
                .clone()
                .filter(|value| !value.trim().is_empty());

            let descricao = match descricao_base {
                Some(desc) => format!("{} - {}", tipo_producao.to_uppercase(), desc),
                None => format!("{} - {}", tipo_producao.to_uppercase(), row.item_name),
            };

            let valor_servico = row.subtotal.to_f64().unwrap_or(0.0);
            let valor_frete_total = row.valor_frete.and_then(|value| value.to_f64());

            let valor_frete = if seen_orders.insert(row.order_id) {
                valor_frete_total.unwrap_or(0.0)
            } else {
                0.0
            };

            PreparedRecord {
                order_id: row.order_id,
                ficha,
                cliente: row.cliente.clone(),
                designer,
                forma_envio,
                tipo_producao,
                descricao,
                data_referencia: row.data_entrada.or(row.data_entrega),
                status: row.status,
                valor_frete,
                valor_servico,
            }
        })
        .collect()
}

fn build_two_level_groups(
    records: &[PreparedRecord],
    level1_key: impl Fn(&PreparedRecord) -> String,
    level2_key: impl Fn(&PreparedRecord) -> String,
    level1_label: impl Fn(&str) -> String,
    level2_label: impl Fn(&str) -> String,
) -> Vec<ReportGroup> {
    let mut level1_map: BTreeMap<String, Vec<&PreparedRecord>> = BTreeMap::new();
    for record in records {
        let key = level1_key(record);
        level1_map.entry(key).or_default().push(record);
    }

    level1_map
        .into_iter()
        .map(|(level1_value, level1_records)| {
            let mut level2_map: BTreeMap<String, Vec<&PreparedRecord>> = BTreeMap::new();
            for record in level1_records {
                let key = level2_key(record);
                level2_map.entry(key).or_default().push(record);
            }

            let mut subtotal = ReportTotals::default();
            let subgroups: Vec<ReportGroup> = level2_map
                .into_iter()
                .map(|(level2_value, subset)| {
                    let rows = subset
                        .iter()
                        .map(|record| ReportRowData {
                            ficha: record.ficha.clone(),
                            descricao: record.descricao.clone(),
                            valor_frete: record.valor_frete,
                            valor_servico: record.valor_servico,
                        })
                        .collect::<Vec<_>>();

                    let subtotal_local = accumulate_totals(&rows);
                    subtotal.valor_frete += subtotal_local.valor_frete;
                    subtotal.valor_servico += subtotal_local.valor_servico;

                    ReportGroup {
                        key: level2_value.clone(),
                        label: level2_label(&level2_value),
                        rows: Some(rows),
                        subgroups: None,
                        subtotal: subtotal_local,
                    }
                })
                .collect();

            ReportGroup {
                key: level1_value.clone(),
                label: level1_label(&level1_value),
                rows: None,
                subgroups: Some(subgroups),
                subtotal,
            }
        })
        .collect()
}

fn build_single_level_groups(
    records: &[PreparedRecord],
    level_key: impl Fn(&PreparedRecord) -> String,
    label_builder: impl Fn(&str) -> String,
) -> Vec<ReportGroup> {
    let mut groups_map: BTreeMap<String, Vec<&PreparedRecord>> = BTreeMap::new();
    for record in records {
        let key = level_key(record);
        groups_map.entry(key).or_default().push(record);
    }

    groups_map
        .into_iter()
        .map(|(group_key, entries)| {
            let rows = entries
                .iter()
                .map(|record| ReportRowData {
                    ficha: record.ficha.clone(),
                    descricao: record.descricao.clone(),
                    valor_frete: record.valor_frete,
                    valor_servico: record.valor_servico,
                })
                .collect::<Vec<_>>();

            let subtotal = accumulate_totals(&rows);

            ReportGroup {
                key: group_key.clone(),
                label: label_builder(&group_key),
                rows: Some(rows),
                subgroups: None,
                subtotal,
            }
        })
        .collect()
}

fn accumulate_totals(rows: &[ReportRowData]) -> ReportTotals {
    rows.iter().fold(ReportTotals::default(), |mut acc, row| {
        acc.valor_frete += row.valor_frete;
        acc.valor_servico += row.valor_servico;
        acc
    })
}

fn parse_date(value: Option<&str>) -> Result<Option<NaiveDate>, String> {
    if let Some(text) = value {
        if text.trim().is_empty() {
            return Ok(None);
        }

        NaiveDate::parse_from_str(text.trim(), "%Y-%m-%d")
            .map(Some)
            .map_err(|_| format!("Data inválida: {}. Use o formato YYYY-MM-DD", text))
    } else {
        Ok(None)
    }
}

fn format_period_label(start: Option<NaiveDate>, end: Option<NaiveDate>) -> String {
    match (start, end) {
        (Some(start), Some(end)) => format!(
            "Dt.Entrada: {} a {}",
            start.format("%d/%m/%Y"),
            end.format("%d/%m/%Y")
        ),
        (Some(start), None) => {
            format!("Dt.Entrada: a partir de {}", start.format("%d/%m/%Y"))
        }
        (None, Some(end)) => format!("Dt.Entrada: até {}", end.format("%d/%m/%Y")),
        _ => "Dt.Entrada: todos os registros".to_string(),
    }
}

impl Default for ReportTotals {
    fn default() -> Self {
        Self {
            valor_frete: 0.0,
            valor_servico: 0.0,
        }
    }
}

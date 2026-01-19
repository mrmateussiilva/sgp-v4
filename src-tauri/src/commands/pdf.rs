use crate::pdf_generator::PdfGenerator;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderItem {
    pub numero: String,
    pub cliente: String,
    pub telefone_cliente: Option<String>,
    pub cidade_estado: Option<String>,
    pub descricao: String,
    pub dimensoes: String,
    pub quantity: i32,
    pub material: String,
    pub tipo_producao: String,
    pub data_envio: String,
    pub prioridade: String,
    pub forma_envio: String,
    pub imagem: Option<String>,
    pub observacao_pedido: Option<String>,
    pub observacao_item: Option<String>,
    pub is_reposicao: bool,
    pub designer: Option<String>,
    pub vendedor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdfGenerationRequest {
    pub items: Vec<OrderItem>,
    pub template_html: String,
}

#[derive(Debug, Serialize)]
struct PageGroup {
    items: Vec<OrderItem>,
}

#[tauri::command]
pub async fn generate_production_pdf(
    app: AppHandle,
    request: PdfGenerationRequest,
) -> Result<String, String> {
    // 1. Group items into pages of 2
    let pages: Vec<PageGroup> = request
        .items
        .chunks(2)
        .map(|chunk| PageGroup {
            items: chunk.to_vec(),
        })
        .collect();

    // 2. Create PDF generator
    let generator = PdfGenerator::new()
        .map_err(|e| format!("Failed to initialize PDF generator: {}", e))?;

    // 3. Render template with grouped data
    let html = render_template(&request.template_html, &pages)
        .map_err(|e| format!("Failed to render template: {}", e))?;

    // 4. Generate PDF
    let pdf_bytes = generator
        .generate_from_html(&html)
        .map_err(|e| format!("Failed to generate PDF: {}", e))?;

    // 5. Save to file
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let pdf_dir = app_data_dir.join("pdfs");
    std::fs::create_dir_all(&pdf_dir)
        .map_err(|e| format!("Failed to create PDF directory: {}", e))?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("producao_{}.pdf", timestamp);
    let pdf_path = pdf_dir.join(&filename);

    std::fs::write(&pdf_path, pdf_bytes)
        .map_err(|e| format!("Failed to write PDF file: {}", e))?;

    Ok(pdf_path.to_string_lossy().to_string())
}

fn render_template(template: &str, pages: &[PageGroup]) -> Result<String, Box<dyn std::error::Error>> {
    use handlebars::Handlebars;

    let mut handlebars = Handlebars::new();
    handlebars.register_template_string("production", template)?;

    let data = serde_json::json!({
        "pages": pages
    });

    let rendered = handlebars.render("production", &data)?;
    Ok(rendered)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_item_grouping() {
        let items = vec![
            create_test_item("1"),
            create_test_item("2"),
            create_test_item("3"),
            create_test_item("4"),
            create_test_item("5"),
        ];

        let pages: Vec<PageGroup> = items
            .chunks(2)
            .map(|chunk| PageGroup {
                items: chunk.to_vec(),
            })
            .collect();

        assert_eq!(pages.len(), 3); // 5 items = 3 pages (2+2+1)
        assert_eq!(pages[0].items.len(), 2);
        assert_eq!(pages[1].items.len(), 2);
        assert_eq!(pages[2].items.len(), 1);
    }

    fn create_test_item(numero: &str) -> OrderItem {
        OrderItem {
            numero: numero.to_string(),
            cliente: "Test Client".to_string(),
            telefone_cliente: None,
            cidade_estado: None,
            descricao: "Test Product".to_string(),
            dimensoes: "100x100".to_string(),
            quantity: 1,
            material: "Lona".to_string(),
            tipo_producao: "painel".to_string(),
            data_envio: "2024-01-01".to_string(),
            prioridade: "Alta".to_string(),
            forma_envio: "Retirada".to_string(),
            imagem: None,
            observacao_pedido: None,
            observacao_item: None,
            is_reposicao: false,
            designer: None,
            vendedor: None,
        }
    }
}

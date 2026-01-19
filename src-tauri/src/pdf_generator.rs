use headless_chrome::{Browser, LaunchOptions};
use headless_chrome::types::PrintToPdfOptions;
use std::error::Error;

pub struct PdfGenerator {
    browser: Browser,
}

impl PdfGenerator {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let browser = Browser::new(LaunchOptions {
            headless: true,
            sandbox: false,
            ..Default::default()
        })?;
        
        Ok(Self { browser })
    }

    pub fn generate_from_html(&self, html: &str) -> Result<Vec<u8>, Box<dyn Error>> {
        let tab = self.browser.new_tab()?;
        
        // Navigate to data URL with HTML content
        let data_url = format!("data:text/html;charset=utf-8,{}", 
            urlencoding::encode(html));
        tab.navigate_to(&data_url)?;
        tab.wait_until_navigated()?;

        // Wait a bit for rendering
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Generate PDF with exact A4 dimensions
        let pdf_options = PrintToPdfOptions {
            landscape: Some(false),
            display_header_footer: Some(false),
            print_background: Some(true),
            scale: Some(1.0),
            paper_width: Some(8.27), // A4 width in inches (210mm)
            paper_height: Some(11.69), // A4 height in inches (297mm)
            margin_top: Some(0.0),
            margin_bottom: Some(0.0),
            margin_left: Some(0.0),
            margin_right: Some(0.0),
            page_ranges: None,
            ignore_invalid_page_ranges: Some(false),
            prefer_css_page_size: Some(true), // Use CSS @page rules
            ..Default::default()
        };

        let pdf_data = tab.print_to_pdf(Some(pdf_options))?;
        
        Ok(pdf_data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_pdf_generation() {
        let generator = PdfGenerator::new().unwrap();
        let html = r#"
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 20px; font-family: Arial; }
                </style>
            </head>
            <body>
                <h1>Test PDF</h1>
                <p>This is a test.</p>
            </body>
            </html>
        "#;
        
        let pdf = generator.generate_from_html(html).unwrap();
        assert!(pdf.len() > 0);
    }
}

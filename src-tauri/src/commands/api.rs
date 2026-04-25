use crate::state::AppState;
use serde_json::Value;
use tauri::{command, State};
use std::collections::HashMap;

#[command]
pub async fn set_api_config(
    base_url: String,
    token: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    *state.api_base_url.lock().map_err(|_| "Erro de mutex no base_url".to_string())? = base_url;
    *state.auth_token.lock().map_err(|_| "Erro de mutex no auth_token".to_string())? = token;
    Ok(())
}

#[command]
pub async fn rust_api_get(
    endpoint: String,
    params: Option<HashMap<String, String>>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let base_url = state.api_base_url.lock().unwrap().clone();
    let token = state.auth_token.lock().unwrap().clone();

    if base_url.is_empty() {
        return Err("API Base URL não configurada no Rust Core".to_string());
    }

    let normalized_base = base_url.trim_end_matches('/');
    let normalized_endpoint = if endpoint.starts_with('/') { &endpoint } else { &format!("/{}", endpoint) };
    let mut url = format!("{}{}", normalized_base, normalized_endpoint);

    let mut request = state.client.get(&url);

    if let Some(ref p) = params {
        request = request.query(p);
    }

    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }
    
    // Bypass Ngrok limits if available
    request = request.header("ngrok-skip-browser-warning", "any");
    request = request.header("Accept", "application/json");

    let response = request.send().await.map_err(|e| format!("Network Erro: {}", e))?;
    
    let status = response.status();
    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("{} - {}", status.as_u16(), err_text));
    }

    // Try to parse the json explicitly
    let json: Value = response.json().await.map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(json)
}

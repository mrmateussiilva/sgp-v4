use reqwest::Client;
use std::sync::Mutex;
use std::time::Duration;

pub struct AppState {
    pub client: Client,
    pub api_base_url: Mutex<String>,
    pub auth_token: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .pool_idle_timeout(Duration::from_secs(300))
            .pool_max_idle_per_host(10)
            .build()
            .expect("Falha ao construir pool HTTP do Reqwest");

        Self {
            client,
            api_base_url: Mutex::new(String::new()),
            auth_token: Mutex::new(None),
        }
    }
}

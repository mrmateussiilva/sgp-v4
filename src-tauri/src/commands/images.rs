use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
use tauri::{command, AppHandle, Manager};
use tracing::{error, info};
use uuid::Uuid;
use image::GenericImageView;
use base64::{Engine as _, engine::general_purpose};

// Estrutura para armazenar metadados de imagem
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub local_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub uploaded: bool,
    pub server_reference: Option<String>, // Referência retornada pela API
}

/// Obtém o diretório de imagens do app
fn get_images_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    // Usar a mesma API que manual_updater.rs usa
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Erro ao obter diretório de dados do app: {}", e))?;

    let images_dir = app_data_dir.join("images");
    Ok(images_dir)
}

/// Salva uma imagem localmente no diretório de dados do app
#[command]
pub async fn save_image_locally(
    app: AppHandle,
    image_data: Vec<u8>, // Bytes da imagem (não base64)
    mime_type: String,
) -> Result<ImageMetadata, String> {
    info!("Salvando imagem localmente (tamanho: {} bytes, tipo: {})", image_data.len(), mime_type);

    // 1. Criar diretório de imagens locais se não existir
    let images_dir = get_images_dir(&app)?;
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Erro ao criar diretório de imagens: {}", e))?;

    // 2. Gerar nome único para o arquivo
    let file_id = Uuid::new_v4();
    let extension = match mime_type.as_str() {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => {
            // Tentar inferir tipo do conteúdo
            let inferred = infer::get(&image_data);
            match inferred {
                Some(t) => match t.mime_type() {
                    "image/jpeg" => "jpg",
                    "image/png" => "png",
                    "image/webp" => "webp",
                    "image/gif" => "gif",
                    _ => "jpg", // fallback
                },
                None => "jpg", // fallback
            }
        }
    };
    let file_name = format!("{}.{}", file_id, extension);
    let file_path = images_dir.join(&file_name);

    // 3. Salvar arquivo localmente
    fs::write(&file_path, image_data)
        .map_err(|e| format!("Erro ao salvar imagem: {}", e))?;

    let file_size = fs::metadata(&file_path)
        .map_err(|e| format!("Erro ao obter metadados do arquivo: {}", e))?
        .len();

    info!("Imagem salva localmente: {}", file_path.display());

    // 4. Retornar metadados
    Ok(ImageMetadata {
        local_path: file_path.to_string_lossy().to_string(),
        file_name: file_name.clone(),
        file_size,
        mime_type,
        uploaded: false,
        server_reference: None,
    })
}

/// Obtém o caminho local de uma imagem (cache ou caminho direto)
#[command]
pub async fn get_local_image_path(
    app: AppHandle,
    image_reference: String, // Pode ser caminho local ou referência do servidor
) -> Result<Option<String>, String> {
    // 1. Se for caminho local e existir, retornar diretamente
    if Path::new(&image_reference).exists() {
        info!("Imagem encontrada no caminho local: {}", image_reference);
        return Ok(Some(image_reference));
    }

    // 2. Verificar cache local por referência do servidor
    let images_dir = get_images_dir(&app)?;
    
    // Tentar encontrar arquivo com nome baseado na referência
    // A referência pode ser um hash ou nome de arquivo
    let cache_file = images_dir.join(format!("{}.cache", image_reference));
    
    if cache_file.exists() {
        match fs::read_to_string(&cache_file) {
            Ok(cached_path) => {
                if Path::new(&cached_path).exists() {
                    info!("Imagem encontrada no cache: {}", cached_path);
                    return Ok(Some(cached_path));
                } else {
                    // Cache inválido, remover
                    let _ = fs::remove_file(&cache_file);
                }
            }
            Err(e) => {
                error!("Erro ao ler cache: {}", e);
            }
        }
    }

    // 3. Tentar encontrar arquivo diretamente no diretório de imagens
    // Se a referência for um nome de arquivo simples
    if let Some(file_name) = Path::new(&image_reference).file_name() {
        let potential_path = images_dir.join(file_name);
        if potential_path.exists() {
            info!("Imagem encontrada por nome: {}", potential_path.display());
            return Ok(Some(potential_path.to_string_lossy().to_string()));
        }
    }

    info!("Imagem não encontrada localmente: {}", image_reference);
    Ok(None)
}

/// Carrega imagem local como base64 (apenas para preview/impressão)
/// NÃO usar para armazenar em estado
#[command]
pub async fn load_local_image_as_base64(
    app: AppHandle,
    local_path: String,
) -> Result<String, String> {
    // Verificar se o caminho está dentro do diretório permitido
    let images_dir = get_images_dir(&app)?;
    let path = Path::new(&local_path);
    
    // Verificar segurança: caminho deve estar dentro do diretório de imagens
    if !path.starts_with(&images_dir) && !path.exists() {
        return Err("Caminho de imagem inválido ou não autorizado".to_string());
    }

    // Carregar imagem do disco
    let image_data = fs::read(&local_path)
        .map_err(|e| format!("Erro ao ler imagem: {}", e))?;

    // Detectar mime type
    let mime_type = infer::get(&image_data)
        .map(|t| t.mime_type())
        .unwrap_or("image/jpeg");

    // Converter para base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    info!("Imagem carregada como base64: {} (tamanho: {} bytes)", local_path, image_data.len());
    Ok(data_url)
}

/// Lê arquivo de imagem como array de bytes
#[command]
pub async fn read_image_file(
    app: AppHandle,
    local_path: String,
) -> Result<Vec<u8>, String> {
    let images_dir = get_images_dir(&app)?;
    let path = Path::new(&local_path);
    
    // Verificar segurança
    if !path.starts_with(&images_dir) && !path.exists() {
        return Err("Caminho de imagem inválido ou não autorizado".to_string());
    }

    let image_data = fs::read(&local_path)
        .map_err(|e| format!("Erro ao ler arquivo de imagem: {}", e))?;

    info!("Arquivo de imagem lido: {} (tamanho: {} bytes)", local_path, image_data.len());
    Ok(image_data)
}

/// Cacheia uma imagem baixada da URL no diretório local
#[command]
pub async fn cache_image_from_url(
    app: AppHandle,
    image_url: String,
    image_data: Vec<u8>,
) -> Result<ImageMetadata, String> {
    info!("Cacheando imagem da URL: {} (tamanho: {} bytes)", image_url, image_data.len());

    // Gerar hash da URL para usar como identificador
    let mut hasher = DefaultHasher::new();
    image_url.hash(&mut hasher);
    let url_hash = format!("{:016x}", hasher.finish());

    let images_dir = get_images_dir(&app)?;
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Erro ao criar diretório de imagens: {}", e))?;

    // Detectar tipo da imagem
    let mime_type = infer::get(&image_data)
        .map(|t| t.mime_type())
        .unwrap_or("image/jpeg");

    let extension = match mime_type {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };

    let file_name = format!("cached_{}.{}", url_hash, extension);
    let file_path = images_dir.join(&file_name);

    // Salvar arquivo
    fs::write(&file_path, &image_data)
        .map_err(|e| format!("Erro ao salvar imagem em cache: {}", e))?;

    // Criar arquivo de cache com referência
    let cache_file = images_dir.join(format!("{}.cache", image_url));
    fs::write(&cache_file, file_path.to_string_lossy().as_ref())
        .map_err(|e| format!("Erro ao criar arquivo de cache: {}", e))?;

    let file_size = fs::metadata(&file_path)
        .map_err(|e| format!("Erro ao obter metadados: {}", e))?
        .len();

    info!("Imagem cacheada: {}", file_path.display());

    Ok(ImageMetadata {
        local_path: file_path.to_string_lossy().to_string(),
        file_name,
        file_size,
        mime_type: mime_type.to_string(),
        uploaded: false,
        server_reference: Some(image_url),
    })
}

/// Processa e salva uma imagem (redimensiona se necessário)
#[command]
pub async fn process_and_save_image(
    app: AppHandle,
    image_data: Vec<u8>,
    max_width: Option<u32>,
    max_height: Option<u32>,
    quality: Option<u8>,
) -> Result<ImageMetadata, String> {
    info!(
        "Processando imagem (tamanho: {} bytes, max: {:?}x{:?}, qualidade: {:?})",
        image_data.len(),
        max_width,
        max_height,
        quality
    );

    // 1. Carregar imagem
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Erro ao carregar imagem: {}", e))?;

    // 2. Redimensionar se necessário
    let processed = if let (Some(w), Some(h)) = (max_width, max_height) {
        let (current_w, current_h) = img.dimensions();
        if current_w > w || current_h > h {
            info!("Redimensionando imagem de {}x{} para {}x{}", current_w, current_h, w, h);
            img.resize(w, h, image::imageops::FilterType::Lanczos3)
        } else {
            img
        }
    } else {
        img
    };

    // 3. Salvar processada
    let file_id = Uuid::new_v4();
    let images_dir = get_images_dir(&app)?;
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Erro ao criar diretório de imagens: {}", e))?;

    let file_path = images_dir.join(format!("{}.jpg", file_id));

    // Salvar como JPEG
    processed
        .save_with_format(&file_path, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Erro ao salvar imagem processada: {}", e))?;

    let file_size = fs::metadata(&file_path)
        .map_err(|e| format!("Erro ao obter metadados: {}", e))?
        .len();

    info!("Imagem processada e salva: {}", file_path.display());

    Ok(ImageMetadata {
        local_path: file_path.to_string_lossy().to_string(),
        file_name: format!("{}.jpg", file_id),
        file_size,
        mime_type: "image/jpeg".to_string(),
        uploaded: false,
        server_reference: None,
    })
}


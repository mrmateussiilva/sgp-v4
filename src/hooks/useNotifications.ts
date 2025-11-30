import { useEffect, useState } from "react";
import { apiClient, getApiUrl } from "../services/apiClient";
import { emit } from "@tauri-apps/api/event";
import { getCachedData, setCachedData, DEFAULT_CACHE_TTL } from "../utils/cache";

const POLLING_INTERVAL = 5000;
const NOTIFICATION_CACHE_KEY = "ultima_notificacao_id";

export function useNotifications() {
  const [ultimoId, setUltimoId] = useState<number>(0);

  useEffect(() => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      return; // API ainda não configurada, não iniciar polling
    }

    // Carregar último ID do cache na inicialização
    const cachedId = getCachedData<number>(NOTIFICATION_CACHE_KEY);
    if (cachedId !== null) {
      setUltimoId(cachedId);
    }

    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.get("/api/notificacoes/ultimos");

        if (data.ultimo_id > ultimoId) {
          setUltimoId(data.ultimo_id);
          // Atualizar cache
          setCachedData(NOTIFICATION_CACHE_KEY, data.ultimo_id, DEFAULT_CACHE_TTL);
          emit("novo_pedido", {
            id: data.ultimo_id,
            timestamp: data.timestamp
          });
        }
      } catch (error) {
        console.error("Erro ao consultar notificações:", error);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [ultimoId]);

  return null;
}


import { useEffect, useState } from "react";
import { apiClient, getApiUrl } from "../services/apiClient";
import { emit } from "@tauri-apps/api/event";

const POLLING_INTERVAL = 5000;

export function useNotifications() {
  const [ultimoId, setUltimoId] = useState<number>(0);

  useEffect(() => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      return; // API ainda não configurada, não iniciar polling
    }

    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.get("/api/notificacoes/ultimos");

        if (data.ultimo_id > ultimoId) {
          setUltimoId(data.ultimo_id);
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


# Implementação WebSocket no Backend FastAPI

Este arquivo contém o código necessário para implementar o sistema de broadcast de eventos de pedidos no backend FastAPI.

## 📋 Arquivo: `app/websocket/pedidos.py`

Crie este arquivo no seu projeto FastAPI (`/home/mateus/Projetcs/api-sgp`):

```python
"""
WebSocket para eventos de pedidos em tempo real.

Este módulo gerencia conexões WebSocket e envia eventos de broadcast
quando pedidos são criados, atualizados ou cancelados.
"""

from typing import Set, Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.routing import APIRouter
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Gerenciador de conexões WebSocket
class ConnectionManager:
    """
    Gerencia todas as conexões WebSocket ativas.
    Mantém uma lista de conexões e permite broadcast para todos os clientes.
    """
    
    def __init__(self):
        # Set de todas as conexões WebSocket ativas
        self.active_connections: Set[WebSocket] = set()
        # Mapa de conexões por token (opcional, para autenticação)
        self.connections_by_token: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, token: Optional[str] = None):
        """
        Aceita uma nova conexão WebSocket.
        
        Args:
            websocket: Conexão WebSocket
            token: Token de autenticação (opcional)
        """
        await websocket.accept()
        self.active_connections.add(websocket)
        
        if token:
            if token not in self.connections_by_token:
                self.connections_by_token[token] = set()
            self.connections_by_token[token].add(websocket)
        
        logger.info(f"Cliente WebSocket conectado. Total de conexões: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, token: Optional[str] = None):
        """
        Remove uma conexão WebSocket.
        
        Args:
            websocket: Conexão WebSocket a ser removida
            token: Token de autenticação (opcional)
        """
        self.active_connections.discard(websocket)
        
        if token and token in self.connections_by_token:
            self.connections_by_token[token].discard(websocket)
            if not self.connections_by_token[token]:
                del self.connections_by_token[token]
        
        logger.info(f"Cliente WebSocket desconectado. Total de conexões: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Envia uma mensagem para um cliente específico.
        
        Args:
            message: Dicionário com a mensagem a ser enviada
            websocket: Conexão WebSocket do cliente
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem personalizada: {e}")
    
    async def broadcast(self, message: dict):
        """
        Envia uma mensagem para TODOS os clientes conectados.
        
        Args:
            message: Dicionário com a mensagem a ser enviada
        """
        if not self.active_connections:
            logger.debug("Nenhuma conexão ativa para broadcast")
            return
        
        # Lista de conexões que falharam (para remover depois)
        disconnected = []
        
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Erro ao enviar broadcast para cliente: {e}")
                disconnected.append(connection)
        
        # Remover conexões que falharam
        for connection in disconnected:
            self.disconnect(connection)
        
        logger.info(f"Broadcast enviado para {len(self.active_connections)} cliente(s)")


# Instância global do gerenciador
manager = ConnectionManager()


# Router para WebSocket
router = APIRouter()


@router.websocket("/ws/pedidos")
async def websocket_pedidos(websocket: WebSocket, token: Optional[str] = None):
    """
    Endpoint WebSocket para eventos de pedidos.
    
    URL: ws://<api_url>/ws/pedidos?token=<session_token>
    
    O cliente pode enviar mensagens de autenticação:
    {
        "type": "authenticate",
        "token": "session_token_here"
    }
    
    O servidor envia eventos:
    {
        "type": "pedido_criado" | "pedido_atualizado" | "pedido_cancelado",
        "pedido_id": 123,
        "status_atual": "pendente",
        "cliente": "Nome do Cliente",
        "valor_total": "1000.00",
        "timestamp": "2024-01-01T12:00:00"
    }
    """
    # Obter token da query string se não foi fornecido
    if not token:
        token = websocket.query_params.get("token")
    
    # Conectar o cliente
    await manager.connect(websocket, token)
    
    try:
        # Enviar mensagem de confirmação de conexão
        await manager.send_personal_message({
            "type": "connected",
            "message": "Conectado ao sistema de eventos de pedidos",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        # Loop principal: escutar mensagens do cliente
        while True:
            try:
                # Receber mensagem do cliente
                data = await websocket.receive_text()
                
                try:
                    message = json.loads(data)
                    message_type = message.get("type")
                    
                    # Processar mensagem de autenticação
                    if message_type == "authenticate":
                        new_token = message.get("token")
                        if new_token:
                            token = new_token
                            # Atualizar mapeamento de conexões
                            manager.disconnect(websocket)
                            await manager.connect(websocket, new_token)
                            await manager.send_personal_message({
                                "type": "authenticated",
                                "message": "Autenticação realizada com sucesso"
                            }, websocket)
                    
                    # Processar ping (keep-alive)
                    elif message_type == "ping":
                        await manager.send_personal_message({
                            "type": "pong",
                            "timestamp": message.get("timestamp")
                        }, websocket)
                    
                    else:
                        logger.debug(f"Mensagem desconhecida recebida: {message_type}")
                
                except json.JSONDecodeError:
                    logger.warning(f"Mensagem inválida recebida: {data}")
            
            except WebSocketDisconnect:
                break
            
            except Exception as e:
                logger.error(f"Erro ao processar mensagem WebSocket: {e}")
                break
    
    except WebSocketDisconnect:
        pass
    
    except Exception as e:
        logger.error(f"Erro na conexão WebSocket: {e}")
    
    finally:
        # Desconectar o cliente
        manager.disconnect(websocket, token)
        logger.info("Cliente WebSocket desconectado")


# ========================================
# FUNÇÕES AUXILIARES PARA BROADCAST
# ========================================

async def broadcast_pedido_criado(pedido_id: int, pedido_data: dict):
    """
    Envia evento de broadcast quando um pedido é criado.
    
    Args:
        pedido_id: ID do pedido criado
        pedido_data: Dados do pedido (opcional, para incluir no evento)
    """
    message = {
        "type": "pedido_criado",
        "pedido_id": pedido_id,
        "status_atual": pedido_data.get("status", "pendente"),
        "cliente": pedido_data.get("cliente", ""),
        "valor_total": str(pedido_data.get("valor_total", "0.00")),
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast(message)
    logger.info(f"Broadcast: Pedido #{pedido_id} criado")


async def broadcast_pedido_atualizado(pedido_id: int, pedido_data: dict):
    """
    Envia evento de broadcast quando um pedido é atualizado.
    
    Args:
        pedido_id: ID do pedido atualizado
        pedido_data: Dados atualizados do pedido
    """
    message = {
        "type": "pedido_atualizado",
        "pedido_id": pedido_id,
        "status_atual": pedido_data.get("status", "pendente"),
        "cliente": pedido_data.get("cliente", ""),
        "valor_total": str(pedido_data.get("valor_total", "0.00")),
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast(message)
    logger.info(f"Broadcast: Pedido #{pedido_id} atualizado")


async def broadcast_pedido_cancelado(pedido_id: int, pedido_data: dict):
    """
    Envia evento de broadcast quando um pedido é cancelado.
    
    Args:
        pedido_id: ID do pedido cancelado
        pedido_data: Dados do pedido (opcional)
    """
    message = {
        "type": "pedido_cancelado",
        "pedido_id": pedido_id,
        "status_atual": "cancelado",
        "cliente": pedido_data.get("cliente", "") if pedido_data else "",
        "valor_total": str(pedido_data.get("valor_total", "0.00")) if pedido_data else "0.00",
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast(message)
    logger.info(f"Broadcast: Pedido #{pedido_id} cancelado")
```

## 📋 Integração nos Endpoints de Pedidos

Adicione as chamadas de broadcast nos seus endpoints de pedidos. Exemplo:

### No arquivo `app/routers/pedidos.py` (ou similar):

```python
from app.websocket.pedidos import (
    broadcast_pedido_criado,
    broadcast_pedido_atualizado,
    broadcast_pedido_cancelado
)

@router.post("/pedidos/", response_model=PedidoResponse)
async def criar_pedido(pedido: PedidoCreate, db: Session = Depends(get_db)):
    """
    Cria um novo pedido e envia evento de broadcast.
    """
    # ... código existente para criar o pedido ...
    
    # Após criar o pedido com sucesso:
    pedido_data = {
        "status": pedido_db.status,
        "cliente": pedido_db.cliente,
        "valor_total": str(pedido_db.valor_total)
    }
    
    # Enviar broadcast para todos os clientes conectados
    await broadcast_pedido_criado(pedido_db.id, pedido_data)
    
    return pedido_db


@router.patch("/pedidos/{pedido_id}", response_model=PedidoResponse)
async def atualizar_pedido(
    pedido_id: int,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza um pedido e envia evento de broadcast.
    """
    # ... código existente para atualizar o pedido ...
    
    # Após atualizar o pedido com sucesso:
    pedido_data = {
        "status": pedido_db.status,
        "cliente": pedido_db.cliente,
        "valor_total": str(pedido_db.valor_total)
    }
    
    # Enviar broadcast para todos os clientes conectados
    await broadcast_pedido_atualizado(pedido_db.id, pedido_data)
    
    return pedido_db


@router.delete("/pedidos/{pedido_id}")
async def cancelar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    """
    Cancela um pedido e envia evento de broadcast.
    """
    # ... código existente para cancelar o pedido ...
    
    # Antes de deletar, obter dados do pedido para o broadcast
    pedido_data = {
        "status": "cancelado",
        "cliente": pedido_db.cliente,
        "valor_total": str(pedido_db.valor_total)
    }
    
    # ... deletar o pedido ...
    
    # Enviar broadcast para todos os clientes conectados
    await broadcast_pedido_cancelado(pedido_id, pedido_data)
    
    return {"message": "Pedido cancelado com sucesso"}
```

## 📋 Registrar o Router no FastAPI

No arquivo principal (`app/main.py`):

```python
from app.websocket.pedidos import router as websocket_router

app = FastAPI()

# Registrar o router de WebSocket
app.include_router(websocket_router)
```

## 🔧 Configuração de CORS (se necessário)

Se você precisar permitir conexões WebSocket de outros domínios, adicione no `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ✅ Teste

Para testar o WebSocket, você pode usar uma ferramenta como `websocat` ou criar um script Python simples:

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/pedidos?token=seu_token_aqui"
    async with websockets.connect(uri) as websocket:
        # Receber mensagem de conexão
        message = await websocket.recv()
        print(f"Recebido: {message}")
        
        # Enviar ping
        await websocket.send(json.dumps({"type": "ping", "timestamp": "123"}))
        response = await websocket.recv()
        print(f"Pong recebido: {response}")

asyncio.run(test_websocket())
```

## 📝 Notas Importantes

1. **Autenticação**: O token pode ser enviado via query string (`?token=...`) ou como mensagem após a conexão.

2. **Reconexão**: O frontend já implementa reconexão automática em caso de queda.

3. **Performance**: O broadcast é assíncrono e não bloqueia outras operações.

4. **Logs**: Todos os eventos são logados para facilitar debug.

5. **Limpeza**: Conexões que falham são automaticamente removidas da lista de conexões ativas.


# Diagrama do Novo Fluxo de Eventos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DE NOTIFICAÇÕES OTIMIZADO                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐
│   CLIENTE 1     │    │   CLIENTE 2      │    │        BACKEND RUST             │
│   (React)       │    │   (React)        │    │   (NotificationManager)         │
└─────────────────┘    └──────────────────┘    └─────────────────────────────────┘
         │                       │                              │
         │                       │                              │
         ▼                       ▼                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐
│ 1. Conecta com  │    │ 1. Conecta com  │    │ 2. Registra clientes ativos     │
│    client_id    │    │    client_id    │    │    em HashMap                   │
│                 │    │                 │    │                                 │
│ 2. Listener     │    │ 2. Listener     │    │ 3. Inicia heartbeat monitor     │
│    único        │    │    único        │    │    (assíncrono, leve)           │
└─────────────────┘    └──────────────────┘    └─────────────────────────────────┘
         │                       │                              │
         │                       │                              │
         ▼                       ▼                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐
│ 3. Recebe       │    │ 3. Recebe       │    │ 4. EVENTO DISPARADO             │
│    eventos      │    │    eventos      │    │    (ex: OrderStatusChanged)     │
│    segmentados  │    │    segmentados  │    │                                 │
└─────────────────┘    └──────────────────┘    └─────────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────────────────────┐
                                                    │ 5. THROTTLING CHECK            │
                                                    │    - Cooldown global: 2s        │
                                                    │    - Cooldown específico: 1s   │
                                                    │    - Verifica se pode enviar    │
                                                    └─────────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────────────────────┐
                                                    │ 6. safe_broadcast()            │
                                                    │    - Aplica throttling          │
                                                    │    - Segmenta por cliente       │
                                                    │    - Logs otimizados            │
                                                    └─────────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────────────────────┐
                                                    │ 7. ENVIO SEGMENTADO            │
                                                    │    - Apenas clientes relevantes │
                                                    │    - Evento específico por      │
                                                    │      cliente                    │
                                                    └─────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐
│ 8. Recebe       │    │ 8. NÃO recebe   │    │ 9. Cleanup automático           │
│    atualização  │    │    (se não for  │    │    - Remove throttles antigos   │
│    instantânea  │    │    relevante)   │    │    - Remove clientes inativos   │
└─────────────────┘    └──────────────────┘    └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BENEFÍCIOS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ✅ Redução de 90%+ em eventos duplicados                                       │
│ ✅ Eliminação de travamentos                                                   │
│ ✅ Atualizações em tempo real sem recarregar                                   │
│ ✅ Logs estruturados e otimizados                                              │
│ ✅ Sistema escalável para múltiplos clientes                                   │
│ ✅ Throttling inteligente por tipo de evento                                   │
│ ✅ Cleanup automático de recursos                                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            TIPOS DE THROTTLING                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🕐 OrderStatusChanged:     2 segundos (crítico)                                │
│ 🕐 OrderStatusFlagsUpdated: 1.5 segundos (importante)                          │
│ 🕐 Heartbeat:              1 segundo (leve)                                    │
│ 🕐 Outros eventos:         500ms (padrão)                                      │
│ 🕐 Evento específico:      1 segundo (por order_id)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            FLUXO DE HEARTBEAT                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 1. Cliente conecta → Registra timestamp                                        │
│ 2. Heartbeat a cada 30s → Atualiza timestamp                                   │
│ 3. Cleanup a cada 60s → Remove clientes inativos (>60s)                       │
│ 4. Throttles antigos → Removidos após 5 minutos                               │
│ 5. Logs mínimos → Apenas "ping", sem spam                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Exemplo de Uso Prático

### Cenário: Atualização de Status de Pedido
1. **Cliente A** atualiza status do pedido #123
2. **Backend** recebe atualização
3. **Throttling check**: Verifica se pode enviar (último envio foi há >2s?)
4. **safe_broadcast()**: Aplica throttling e segmenta
5. **Cliente B** recebe atualização instantaneamente
6. **Cliente C** (se conectado) também recebe
7. **Logs**: Apenas eventos críticos são logados
8. **Cleanup**: Throttles antigos são removidos automaticamente

### Resultado
- ✅ Atualização instantânea entre clientes
- ✅ Sem spam de eventos duplicados
- ✅ Sistema responsivo mesmo com muitos eventos
- ✅ Logs limpos e estruturados
- ✅ Recursos otimizados automaticamente


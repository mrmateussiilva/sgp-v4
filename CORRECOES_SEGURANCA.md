# Correções de Segurança Necessárias

## 🔴 Problemas Críticos Identificados

### 1. Endpoints sem Autenticação

**Status**: ⚠️ **CRÍTICO - NÃO CORRIGIDO AINDA**

Todos os endpoints de pedidos, clientes e outros recursos estão acessíveis sem autenticação.

**Solução**: Adicionar `Depends(get_current_user)` em todos os endpoints protegidos.

**Exemplo de correção**:

```python
# ANTES (INSEGURO)
@router.post("/", response_model=PedidoResponse)
async def criar_pedido(pedido: PedidoCreate, session: AsyncSession = Depends(get_session)):
    # ...

# DEPOIS (SEGURO)
from auth.dependencies import get_current_user
from auth.models import User

@router.post("/", response_model=PedidoResponse)
async def criar_pedido(
    pedido: PedidoCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)  # ← ADICIONAR ESTA LINHA
):
    # ...
```

**Arquivos que precisam ser corrigidos**:
- `api-sgp/pedidos/router.py` - Todos os endpoints
- `api-sgp/clientes/router.py` - Todos os endpoints
- `api-sgp/materiais/router.py` - Todos os endpoints
- `api-sgp/designers/router.py` - Todos os endpoints
- `api-sgp/vendedores/router.py` - Todos os endpoints
- `api-sgp/pagamentos/router.py` - Todos os endpoints
- `api-sgp/envios/router.py` - Todos os endpoints
- `api-sgp/users/router.py` - Todos os endpoints

---

### 2. WebSocket sem Autenticação

**Status**: ✅ **CORRIGIDO**

O WebSocket agora valida o token JWT antes de aceitar conexões.

**Correção aplicada em**: `api-sgp/main.py` linha 97-140

**Como funciona**:
1. Frontend envia token como query parameter: `ws://api/ws/orders?token=JWT_TOKEN`
2. Backend valida token antes de aceitar conexão
3. Se token inválido, conexão é rejeitada com código 1008

---

## 📋 Checklist de Implementação

### Passo 1: Completar arquivo dependencies.py
- [x] Criar `api-sgp/auth/dependencies.py`
- [ ] Testar `get_current_user`
- [ ] Garantir compatibilidade com `revoked_tokens` do router.py

### Passo 2: Aplicar autenticação nos endpoints
- [ ] `pedidos/router.py` - 6 endpoints
- [ ] `clientes/router.py` - 5 endpoints
- [ ] `materiais/router.py` - 4 endpoints
- [ ] `designers/router.py` - 4 endpoints
- [ ] `vendedores/router.py` - 4 endpoints
- [ ] `pagamentos/router.py` - 4 endpoints
- [ ] `envios/router.py` - 4 endpoints
- [ ] `users/router.py` - 4 endpoints

### Passo 3: Testar
- [ ] Testar login e obtenção de token
- [ ] Testar acesso a endpoints protegidos sem token (deve falhar)
- [ ] Testar acesso a endpoints protegidos com token válido (deve funcionar)
- [ ] Testar WebSocket com token válido
- [ ] Testar WebSocket sem token (deve rejeitar)

---

## 🔧 Como Aplicar as Correções

### Exemplo Completo: Endpoint de Pedidos

**Arquivo**: `api-sgp/pedidos/router.py`

```python
# Adicionar no topo do arquivo
from auth.dependencies import get_current_user
from auth.models import User

# Modificar cada endpoint:
@router.get("/", response_model=List[PedidoResponse])
async def listar_pedidos(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),  # ← ADICIONAR
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    # ... outros parâmetros
):
    # O usuário autenticado está disponível em current_user
    # current_user.id, current_user.username, current_user.is_admin, etc.
    # ...
```

---

## ⚠️ Notas Importantes

1. **Endpoints públicos**: Alguns endpoints podem precisar ser públicos (ex: `/health`, `/`). Não adicione autenticação nesses.

2. **Compatibilidade**: O arquivo `dependencies.py` usa a mesma `SECRET_KEY` e `ALGORITHM` do `auth/router.py`. Se mudar, atualize ambos.

3. **Revoked tokens**: O `dependencies.py` precisa compartilhar o mesmo `revoked_tokens` dict com `auth/router.py`. Considere mover para um módulo compartilhado.

4. **Performance**: Validação de token adiciona latência. Considere cache de validação para alta carga.

---

## 🚀 Próximos Passos

1. **Completar `dependencies.py`**: Garantir que funciona corretamente
2. **Aplicar em um router**: Começar com `pedidos/router.py` como teste
3. **Testar**: Verificar que autenticação funciona
4. **Aplicar nos demais**: Replicar para todos os outros routers
5. **Documentar**: Atualizar documentação da API






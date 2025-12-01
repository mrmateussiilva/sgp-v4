# Endpoints Necessários no Backend Python

## Endpoints para Gerenciamento de Pedidos

### 1. Deletar Todos os Pedidos
**Endpoint:** `DELETE /pedidos/all`

**Descrição:** Deleta todos os pedidos do sistema e também todos os itens relacionados.

**Autenticação:** Requer autenticação e permissão de administrador.

**Resposta de Sucesso:**
```json
{
  "message": "Todos os pedidos foram deletados com sucesso",
  "deleted_count": 123
}
```

**Implementação sugerida:**
```python
@router.delete("/all", dependencies=[Depends(get_current_user)])
async def delete_all_orders(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Verificar se é admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar todos os pedidos")
    
    # Deletar todos os itens primeiro (foreign key constraint)
    await session.execute(delete(OrderItem))
    
    # Deletar todos os pedidos
    result = await session.execute(delete(Order))
    deleted_count = result.rowcount
    
    await session.commit()
    
    return {"message": "Todos os pedidos foram deletados", "deleted_count": deleted_count}
```

### 2. Resetar Sequência de IDs
**Endpoint:** `POST /pedidos/reset-ids`

**Descrição:** Reseta a sequência de IDs dos pedidos para começar do 1.

**Autenticação:** Requer autenticação e permissão de administrador.

**Resposta de Sucesso:**
```json
{
  "message": "Sequência de IDs resetada com sucesso",
  "next_id": 1
}
```

**Implementação sugerida:**
```python
@router.post("/reset-ids", dependencies=[Depends(get_current_user)])
async def reset_order_ids(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Verificar se é admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem resetar IDs")
    
    # Resetar a sequência do PostgreSQL
    await session.execute(text("ALTER SEQUENCE orders_id_seq RESTART WITH 1"))
    await session.commit()
    
    return {"message": "Sequência de IDs resetada", "next_id": 1}
```

## Notas Importantes

1. **Segurança:** Ambos os endpoints devem exigir permissão de administrador.
2. **Ordem de Operação:** Para resetar IDs corretamente, primeiro delete todos os pedidos, depois resete a sequência.
3. **Backup:** Considere fazer backup antes de executar essas operações.


# Alterações - 24/04/2026

## Resumo das Correções
1. **Performance e Memory Leak:** Corrigido problema de instabilidade que ocorria no decorrer do dia ("pós-almoço"). Refatorada a busca global de pedidos no painel para realizar paginação filtrada via API, evitando travamentos da UI por sobrecarga de memória.
2. **Correção no Painel do Designer (Liberar Arte):** Corrigido o erro de timeout na liberação de artes. Substituída a lógica de "Full Table Scan" pesada por uma busca O(1) matemática no backend e um fallback por LIKE em SQLite, impedindo crashes e processamento infinito. Adicionado também o envio correto do modelo no payload dos testes internos.

## Arquivos Alterados

### Frontend (sgp-v4)
- `src/api/endpoints/orders.ts`
- `src/services/api.ts`

### Backend (api-sgp)
- `pedidos/router.py`
- `pedidos/utils.py`
- `tests/test_designers_painel.py`

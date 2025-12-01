# Troubleshooting - Conectividade de Rede

## Problema: Cliente Tauri não consegue acessar API em outro computador

### Verificações no Servidor (onde a API Python roda)

1. **Verificar se a API está escutando em 0.0.0.0 (não apenas localhost)**
   ```bash
   # A API deve estar configurada para escutar em 0.0.0.0:8000
   # Não em 127.0.0.1:8000 ou localhost:8000
   ```

2. **Verificar firewall do servidor**
   ```bash
   # Linux
   sudo ufw allow 8000/tcp
   
   # Windows
   netsh advfirewall firewall add rule name="API Python" dir=in action=allow protocol=TCP localport=8000
   ```

3. **Testar se a API está acessível na rede**
   ```bash
   # De outro computador, testar:
   curl http://192.168.15.2:8000/health
   # Deve retornar: {"status":"ok","message":"API is running","version":"0.1.0"}
   ```

### Verificações no Cliente (outro computador)

1. **Verificar IP correto**
   - IP do servidor: `192.168.15.2:8000`
   - Usar este IP na configuração da API

2. **Verificar se está na mesma rede**
   ```bash
   # Testar ping
   ping 192.168.15.2
   ```

3. **Verificar logs no console**
   - Abrir DevTools (F12)
   - Verificar console para logs de debug
   - Procurar por mensagens começando com `🌐 [Tauri Adapter]` ou `🔍 Tentando verificar`

4. **Verificar capabilities do Tauri**
   - Arquivo: `src-tauri/capabilities/default.json`
   - Deve ter permissões para `http://192.168.*:*`

### Configuração da API Python (FastAPI)

A API deve estar configurada assim:

```python
import uvicorn

if __name__ == "__main__":
    # IMPORTANTE: host='0.0.0.0' permite acesso de qualquer IP na rede
    # Não usar host='127.0.0.1' ou host='localhost'
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Logs de Debug

Quando testar a conexão, verifique os logs no console:

1. `🔍 Tentando verificar conexão em: http://192.168.15.2:8000/health`
2. `🌐 [Tauri Adapter] Fazendo requisição: GET http://192.168.15.2:8000/health`
3. `✅ [Tauri Adapter] Resposta recebida` ou `❌ [Tauri Adapter] Erro na requisição`

### Solução Rápida

1. **Recompilar o Tauri após mudanças nas capabilities:**
   ```bash
   pnpm run tauri:build
   ```

2. **Verificar se a API Python está escutando em 0.0.0.0:8000**

3. **Testar conexão manualmente:**
   ```bash
   curl http://192.168.15.2:8000/health
   ```

4. **Verificar firewall em ambos os computadores**

### IPs Configurados

- **Servidor:** 192.168.15.2:8000
- **Rede:** 192.168.15.0/24 (ou similar)


# 🚀 Guia Completo de Produção - SGP v4

## 📋 Visão Geral

Este guia fornece instruções completas para levar o SGP v4 para produção, incluindo otimizações, configurações de segurança e procedimentos de deploy.

## 🎯 Objetivos de Produção

- ✅ **Performance Otimizada**: Build com otimizações máximas
- ✅ **Segurança**: Configurações de segurança adequadas
- ✅ **Monitoramento**: Sistema de logs e monitoramento
- ✅ **Backup**: Sistema de backup automático
- ✅ **Escalabilidade**: Configurações para múltiplos usuários
- ✅ **Manutenibilidade**: Scripts automatizados

## 🔧 Preparação para Produção

### **1. Otimizações Implementadas**

#### **Rust (Backend)**
- ✅ `opt-level = 3` - Otimizações máximas
- ✅ `lto = true` - Link Time Optimization
- ✅ `codegen-units = 1` - Otimização de código
- ✅ `strip = true` - Remoção de símbolos de debug
- ✅ `panic = "abort"` - Panic otimizado

#### **Tauri (Frontend)**
- ✅ CSP (Content Security Policy) configurado
- ✅ Bundle otimizado para produção
- ✅ Ícones e metadados configurados
- ✅ Configurações de segurança adequadas

#### **Logs**
- ✅ Logs otimizados para produção (nível INFO)
- ✅ Formato compacto
- ✅ Remoção de informações desnecessárias

### **2. Arquivos de Configuração**

#### **`.cargo/config.toml`**
```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true
debug = false

[profile.release.package."*"]
opt-level = 3
```

#### **`tauri.conf.json`** (Otimizado)
- ✅ Configurações de bundle completas
- ✅ CSP de segurança
- ✅ Metadados de produção
- ✅ Configurações de janela otimizadas

## 🚀 Processo de Deploy

### **Passo 1: Build de Produção**

```bash
# Tornar o script executável
chmod +x build_production.sh

# Executar build
./build_production.sh
```

**O que o script faz:**
1. 🧹 Limpa builds anteriores
2. 📦 Verifica dependências
3. 🧪 Executa testes
4. 🎨 Builda o frontend
5. 🦀 Builda o Rust em modo release
6. 📱 Builda o Tauri
7. 📋 Verifica arquivos gerados
8. 📊 Cria informações do build

### **Passo 2: Configuração de Ambiente**

```bash
# Copiar exemplo de configuração
cp production.env.example .env.production

# Editar configurações
nano .env.production
```

**Configurações importantes:**
- `DATABASE_URL` - URL do banco de produção
- `LOG_LEVEL=INFO` - Nível de log para produção
- `DEBUG_MODE=false` - Desabilitar modo debug
- `BACKUP_ENABLED=true` - Habilitar backups

### **Passo 3: Deploy**

```bash
# Tornar o script executável
chmod +x deploy_production.sh

# Executar deploy
./deploy_production.sh
```

**O que o script faz:**
1. 💾 Cria backup do banco
2. 🔄 Aplica migrações
3. ⚙️ Verifica configurações
4. 🛑 Para serviços existentes
5. 📦 Instala dependências
6. 📁 Cria diretórios necessários
7. 📋 Instala aplicação
8. ⚙️ Configura systemd
9. 📝 Configura logs
10. 🚀 Inicia serviço
11. 🔍 Verifica status
12. 🧪 Testa conectividade
13. 🔥 Configura firewall

## 📊 Monitoramento e Logs

### **Sistema de Logs**

```bash
# Ver logs em tempo real
sudo journalctl -u sgp-v4 -f

# Ver logs dos últimos 100 linhas
sudo journalctl -u sgp-v4 -n 100

# Ver logs de hoje
sudo journalctl -u sgp-v4 --since today
```

### **Arquivos de Log**

- `/var/log/sgp-v4/` - Logs da aplicação
- `journalctl -u sgp-v4` - Logs do systemd
- Rotação automática configurada

### **Monitoramento de Performance**

```bash
# Status do serviço
sudo systemctl status sgp-v4

# Uso de recursos
htop -p $(pgrep sgp-v4)

# Conexões de banco
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🔒 Segurança

### **Configurações de Segurança**

1. **CSP (Content Security Policy)**
   - Configurado no `tauri.conf.json`
   - Restringe recursos externos

2. **Firewall**
   - Porta 1420 liberada
   - Configuração automática no deploy

3. **Permissões**
   - Usuário dedicado para o serviço
   - Diretórios com permissões adequadas

4. **Backup**
   - Backups automáticos configurados
   - Retenção de 30 dias

## 📁 Estrutura de Produção

```
/usr/local/bin/sgp-v4          # Executável principal
/etc/systemd/system/sgp-v4.service  # Configuração do serviço
/var/log/sgp-v4/               # Logs da aplicação
/var/backups/sgp-v4/           # Backups automáticos
/var/uploads/sgp-v4/           # Arquivos enviados
/etc/logrotate.d/sgp-v4        # Configuração de rotação de logs
```

## 🛠️ Comandos de Manutenção

### **Gerenciamento do Serviço**

```bash
# Parar serviço
sudo systemctl stop sgp-v4

# Iniciar serviço
sudo systemctl start sgp-v4

# Reiniciar serviço
sudo systemctl restart sgp-v4

# Status do serviço
sudo systemctl status sgp-v4

# Habilitar inicialização automática
sudo systemctl enable sgp-v4

# Desabilitar inicialização automática
sudo systemctl disable sgp-v4
```

### **Backup e Restore**

```bash
# Backup manual
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_file.sql
```

### **Atualização da Aplicação**

```bash
# 1. Parar serviço
sudo systemctl stop sgp-v4

# 2. Backup
pg_dump $DATABASE_URL > backup_before_update.sql

# 3. Build nova versão
./build_production.sh

# 4. Deploy
./deploy_production.sh

# 5. Verificar
sudo systemctl status sgp-v4
```

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **Serviço não inicia**
```bash
# Ver logs de erro
sudo journalctl -u sgp-v4 -n 50

# Verificar configuração
sudo systemctl cat sgp-v4

# Testar manualmente
/usr/local/bin/sgp-v4
```

#### **Banco de dados não conecta**
```bash
# Testar conexão
psql $DATABASE_URL -c "SELECT 1;"

# Verificar configuração
cat .env.production | grep DATABASE_URL
```

#### **Performance lenta**
```bash
# Verificar recursos
htop
iostat -x 1

# Verificar conexões de banco
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

## 📈 Otimizações de Performance

### **Banco de Dados**
- ✅ Índices otimizados implementados
- ✅ Pool de conexões configurado
- ✅ Queries otimizadas

### **Aplicação**
- ✅ Build otimizado para produção
- ✅ Sistema de cache implementado
- ✅ Polling otimizado (60s)

### **Sistema**
- ✅ Logs otimizados
- ✅ Rotação automática de logs
- ✅ Limpeza automática de arquivos temporários

## 🎯 Checklist de Produção

### **Antes do Deploy**
- [ ] Configurações de produção verificadas
- [ ] Banco de dados configurado
- [ ] Backup de segurança criado
- [ ] Testes executados com sucesso

### **Durante o Deploy**
- [ ] Build de produção executado
- [ ] Configurações aplicadas
- [ ] Serviço iniciado
- [ ] Conectividade testada

### **Após o Deploy**
- [ ] Monitoramento funcionando
- [ ] Logs sendo gerados
- [ ] Backup automático ativo
- [ ] Performance adequada

## 📞 Suporte

### **Logs Importantes**
- `sudo journalctl -u sgp-v4 -f` - Logs em tempo real
- `/var/log/sgp-v4/` - Logs da aplicação
- `systemctl status sgp-v4` - Status do serviço

### **Comandos de Diagnóstico**
```bash
# Status geral
sudo systemctl status sgp-v4

# Recursos do sistema
htop -p $(pgrep sgp-v4)

# Conexões de rede
netstat -tlnp | grep 1420

# Espaço em disco
df -h
```

---

## 🎉 Conclusão

O SGP v4 está agora configurado para produção com:
- ✅ Performance otimizada
- ✅ Segurança adequada
- ✅ Monitoramento completo
- ✅ Backup automático
- ✅ Scripts de manutenção

**Próximos passos:**
1. Execute o build de produção
2. Configure o ambiente
3. Execute o deploy
4. Monitore o sistema
5. Configure backups regulares


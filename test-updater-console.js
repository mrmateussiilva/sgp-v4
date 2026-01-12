/**
 * Script de teste do updater para usar no console do DevTools
 * 
 * Como usar:
 * 1. Abra o app
 * 2. Pressione F12 para abrir DevTools
 * 3. Cole este script no console
 * 4. Pressione Enter
 */

(async () => {
  try {
    // Importar funções do Tauri
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE DO UPDATER OFICIAL DO TAURI');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    console.log('🔍 Verificando atualizações...');
    const update = await check({ target: undefined });
    
    if (!update) {
      console.log('✅ Aplicação está atualizada');
      console.log('   Não há atualizações disponíveis.');
      return;
    }
    
    console.log('✅ Atualização encontrada!');
    console.log('');
    console.log('📋 Informações da atualização:');
    console.log('   Versão atual:    ', update.currentVersion);
    console.log('   Nova versão:     ', update.version);
    console.log('   Data:            ', update.date || 'N/A');
    console.log('   Notas:           ', update.body || 'Sem notas disponíveis');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  Para instalar a atualização, execute:');
    console.log('');
    console.log('   const update = await check({ target: undefined });');
    console.log('   await update.downloadAndInstall();');
    console.log('   await relaunch();');
    console.log('');
    console.log('⚠️  ATENÇÃO: Isso vai reiniciar o aplicativo!');
    console.log('');
    
    // Retornar o objeto update para uso posterior
    window.__testUpdate = update;
    window.__testRelaunch = relaunch;
    
    console.log('💡 Dica: O objeto update foi salvo em window.__testUpdate');
    console.log('   Você pode usar: await window.__testUpdate.downloadAndInstall()');
    
  } catch (error) {
    console.error('❌ Erro ao verificar atualizações:', error);
    console.error('');
    console.error('Possíveis causas:');
    console.error('  - Endpoint inacessível');
    console.error('  - Formato do latest.json incorreto');
    console.error('  - Problema de rede');
    console.error('  - Assinatura inválida');
  }
})();

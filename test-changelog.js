/**
 * Script de teste para simular atualização e exibir changelog
 * 
 * Execute este script no console do DevTools (F12) após iniciar o app
 */

// Simular que acabou de atualizar da versão 1.0.11 para 1.0.13
localStorage.setItem('previous_version', '1.0.11');
localStorage.setItem('show_changelog_after_update', 'true');

console.log('✅ Flags de atualização configuradas!');
console.log('📋 Versão anterior simulada: 1.0.11');
console.log('🔄 Recarregando página para exibir changelog...');

// Recarregar a página para acionar a verificação no App.tsx
setTimeout(() => {
  window.location.reload();
}, 500);

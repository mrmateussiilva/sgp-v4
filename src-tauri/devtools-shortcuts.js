// Sistema de atalhos de teclado para DevTools
// Este arquivo deve ser incluído no frontend para detectar atalhos de teclado

import { invoke } from '@tauri-apps/api/core';

class DevToolsShortcuts {
    constructor() {
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        // Detectar atalhos de teclado
        document.addEventListener('keydown', (event) => {
            // F12 - Alternar DevTools
            if (event.key === 'F12') {
                event.preventDefault();
                this.toggleDevTools();
            }
            
            // Ctrl+Shift+I - Alternar DevTools
            if (event.ctrlKey && event.shiftKey && event.key === 'I') {
                event.preventDefault();
                this.toggleDevTools();
            }
            
            // Ctrl+Shift+J - Abrir DevTools
            if (event.ctrlKey && event.shiftKey && event.key === 'J') {
                event.preventDefault();
                this.openDevTools();
            }
            
            // Ctrl+Shift+D - Fechar DevTools
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.closeDevTools();
            }
        });
        
        console.log('🛠️ Atalhos de teclado DevTools configurados:');
        console.log('  F12 - Alternar DevTools');
        console.log('  Ctrl+Shift+I - Alternar DevTools');
        console.log('  Ctrl+Shift+J - Abrir DevTools');
        console.log('  Ctrl+Shift+D - Fechar DevTools');
    }

    async toggleDevTools() {
        try {
            await invoke('toggle_devtools');
            console.log('🛠️ DevTools alternado');
        } catch (error) {
            console.error('Erro ao alternar DevTools:', error);
        }
    }

    async openDevTools() {
        try {
            await invoke('open_devtools');
            console.log('🛠️ DevTools aberto');
        } catch (error) {
            console.error('Erro ao abrir DevTools:', error);
        }
    }

    async closeDevTools() {
        try {
            await invoke('close_devtools');
            console.log('🛠️ DevTools fechado');
        } catch (error) {
            console.error('Erro ao fechar DevTools:', error);
        }
    }

    // Método para testar o sistema
    async testDevTools() {
        console.log('🧪 Testando sistema DevTools...');
        
        try {
            // Testa se os comandos estão funcionando
            await invoke('open_devtools');
            console.log('✅ Comando open_devtools funcionando');
            
            setTimeout(async () => {
                await invoke('close_devtools');
                console.log('✅ Comando close_devtools funcionando');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Erro no teste DevTools:', error);
        }
    }
}

// Inicializar automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.devToolsShortcuts = new DevToolsShortcuts();
    });
} else {
    window.devToolsShortcuts = new DevToolsShortcuts();
}

// Exportar para uso em módulos
export default DevToolsShortcuts;

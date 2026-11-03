import React from 'react';
import {
  Bell,
  BellOff,
  Monitor,
  MessageSquare,
  Package,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';



interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ icon, title, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl border transition-colors',
        disabled ? 'opacity-50 pointer-events-none bg-muted/30' : 'hover:bg-accent/40 bg-card',
        checked ? 'border-primary/30' : 'border-border/60'
      )}
    >
      <div className="flex items-start gap-3 pr-4">
        <div
          className={cn(
            'p-2 rounded-lg mt-0.5',
            checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            {title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsView({ onBack }: { onBack?: () => void }) {
  const {
    enabled,
    nativeDesktop,
    inAppToasts,
    orderEvents,
    designerEvents,
    setEnabled,
    setNativeDesktop,
    setInAppToasts,
    setOrderEvents,
    setDesignerEvents,
    resetDefaults,
  } = useNotificationSettingsStore();

  return (
    <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Master Switch - Modo Não Perturbe */}
      <div
        className={cn(
          'p-4 rounded-xl border-2 transition-all',
          enabled
            ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-300/80 dark:border-blue-900/60'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl',
                enabled
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-amber-500 text-white shadow-sm'
              )}
            >
              {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {enabled ? 'Notificações Ativadas' : 'Modo "Não Perturbe" Ativo'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabled
                  ? 'O sistema exibirá alertas de acordo com suas preferências abaixo.'
                  : 'Todos os alertas visuais e pop-ups estão silenciados nesta máquina.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Canais de Exibição */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Canais de Notificação
        </div>

        <ToggleRow
          icon={<Monitor className="w-4 h-4" />}
          title="Pop-ups do Windows / Desktop"
          description="Avisos nativos fora da janela do sistema. Desmarque para nunca ser interrompido por pop-ups do Windows."
          checked={nativeDesktop}
          disabled={!enabled}
          onChange={setNativeDesktop}
        />

        <ToggleRow
          icon={<MessageSquare className="w-4 h-4" />}
          title="Avisos Flutuantes na Tela (Toasts)"
          description="Cartões que surgem no canto inferior da tela dentro do sistema."
          checked={inAppToasts}
          disabled={!enabled}
          onChange={setInAppToasts}
        />
      </div>

      {/* Tipos de Eventos */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Categorias de Eventos
        </div>

        <ToggleRow
          icon={<Package className="w-4 h-4" />}
          title="Pedidos em Tempo Real"
          description="Alertas de novos pedidos, mudanças de status e exclusões. A tela continua sincronizando dados mesmo se desativado."
          checked={orderEvents}
          disabled={!enabled}
          onChange={setOrderEvents}
        />

        <ToggleRow
          icon={<Palette className="w-4 h-4" />}
          title="Artes de Designers Prontas"
          description="Alertas quando uma arte é finalizada. As notificações continuarão salvas no sininho para consulta."
          checked={designerEvents}
          disabled={!enabled}
          onChange={setDesignerEvents}
        />
      </div>

      {/* Rodapé com Ações */}
      <div className="pt-2 flex items-center justify-between border-t text-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetDefaults}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrões
        </Button>

        {onBack && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onBack}
            className="text-xs h-8"
          >
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}


import { useDesignerArts } from '@/hooks/useDesignerArts';
import { useUser } from '@/hooks/useUser';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { Loader2, RefreshCw, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DesignCardData } from '@/types/designerKanban';

/**
 * Tela de trabalho do Designer
 * Mostra apenas as artes atribuídas ao designer logado
 * Layout focado e direto para uso operacional diário
 */
export default function DesignerWorkspace() {
  const { username } = useUser();
  const {
    cardsAliberar,
    cardsPronto,
    loading,
    error,
    refresh,
    moveCard,
    totalCards,
  } = useDesignerArts({ filterByDesigner: true });

  const handleMoveToPronto = (card: DesignCardData) => {
    moveCard(card, 'pronto');
  };

  const handleMoveToAliberar = (card: DesignCardData) => {
    moveCard(card, 'a_liberar');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header simples e direto */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Minhas Artes</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Designer: <span className="font-semibold">{username}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {cardsAliberar.length} {cardsAliberar.length === 1 ? 'arte pendente' : 'artes pendentes'}
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Kanban Board */}
      {totalCards === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <Palette className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground">
                Nenhuma arte atribuída
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As artes atribuídas a você aparecerão aqui
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <KanbanBoard
            cardsAliberar={cardsAliberar}
            cardsPronto={cardsPronto}
            onMoveToPronto={handleMoveToPronto}
            onMoveToAliberar={handleMoveToAliberar}
          />
        </div>
      )}
    </div>
  );
}

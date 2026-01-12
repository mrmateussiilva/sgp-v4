/**
 * Tipos para a tela Kanban de Designers
 */

export type CardStatus = 'a_liberar' | 'pronto';

export interface DesignCardData {
  orderId: number;
  orderNumber?: string;
  itemId: number;
  itemName: string;
  customerName: string;
  productType?: string;
  imageUrl?: string;
  createdAt?: string;
  orderCreatedAt?: string;
  status?: string;
  // Estado do card no Kanban (gerenciado no frontend)
  cardStatus?: CardStatus;
}

export interface DesignerColumn {
  designerName: string;
  cards: DesignCardData[];
}

/**
 * Estrutura de dados para o board de um designer
 * Contém duas colunas: "A liberar" e "Pronto"
 */
export interface DesignerBoardData {
  designerName: string;
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
}

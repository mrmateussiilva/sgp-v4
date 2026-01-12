/**
 * Tipos para a tela Kanban de Designers
 */

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
}

export interface DesignerColumn {
  designerName: string;
  cards: DesignCardData[];
}

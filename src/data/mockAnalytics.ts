import { AnalyticsResponse } from '@/types';

export const MOCK_ANALYTICS_RESPONSE: AnalyticsResponse = {
  summary: {
    total_orders: 128,
    total_items_produced: 472,
    total_revenue: 185_632.45,
    average_ticket: 1_450.25,
  },
  top_products: [
    { product_id: 101, product_name: 'Banners Premium', quantity: 92 },
    { product_id: 87, product_name: 'Adesivos Vinílicos', quantity: 78 },
    { product_id: 56, product_name: 'Placas ACM', quantity: 61 },
    { product_id: 203, product_name: 'Display Totem', quantity: 48 },
    { product_id: 12, product_name: 'Backdrop Luxo', quantity: 35 },
  ],
  top_sellers: [
    { id: 1, name: 'Carla Mendes', value: 48 },
    { id: 4, name: 'João Batista', value: 42 },
    { id: 7, name: 'Fernanda Lima', value: 39 },
    { id: 2, name: 'Ricardo Silva', value: 35 },
    { id: 5, name: 'Paulo Sousa', value: 32 },
  ],
  top_designers: [
    { id: 9, name: 'Marina Duarte', value: 53 },
    { id: 11, name: 'Lucas Ferreira', value: 49 },
    { id: 6, name: 'Priscila Souza', value: 46 },
    { id: 8, name: 'Thiago Ramos', value: 44 },
    { id: 3, name: 'Camila Rocha', value: 41 },
  ],
  monthly_trends: [
    { period: '2024-01', production_volume: 120, revenue: 41_234.75 },
    { period: '2024-02', production_volume: 138, revenue: 45_678.1 },
    { period: '2024-03', production_volume: 112, revenue: 38_901.0 },
    { period: '2024-04', production_volume: 102, revenue: 31_523.6 },
    { period: '2024-05', production_volume: 130, revenue: 28_895.0 },
  ],
  available_product_types: ['Adesivos', 'Paineis', 'Banners', 'Displays'],
  last_updated: '2024-05-15T14:52:00Z',
};

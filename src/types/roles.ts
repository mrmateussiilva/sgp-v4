/**
 * Roles (Papéis) disponíveis no sistema
 * 
 * Lista completa de todos os tipos de usuários/roles que o sistema suporta.
 */

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  VENDEDOR: 'VENDEDOR',
  DESIGNER: 'DESIGNER',
  OPERADOR_SUBLIMACAO: 'OPERADOR_SUBLIMACAO',
  EXPEDICAO: 'EXPEDICAO',
  COSTURA: 'COSTURA',
  RECEPCAO: 'RECEPCAO',
} as const;

/**
 * Tipo que representa todas as roles válidas do sistema
 */
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Array com todas as roles válidas
 */
export const ALL_ROLES: UserRole[] = Object.values(USER_ROLES);

/**
 * Labels amigáveis para cada role (para exibição na UI)
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.VENDEDOR]: 'Vendedor',
  [USER_ROLES.DESIGNER]: 'Designer',
  [USER_ROLES.OPERADOR_SUBLIMACAO]: 'Operador Sublimação',
  [USER_ROLES.EXPEDICAO]: 'Expedição',
  [USER_ROLES.COSTURA]: 'Costura',
  [USER_ROLES.RECEPCAO]: 'Recepção',
};

/**
 * Descrições das permissões de cada role
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Acesso completo ao sistema, incluindo configurações e administração',
  [USER_ROLES.VENDEDOR]: 'Acesso a vendas, pedidos e clientes',
  [USER_ROLES.DESIGNER]: 'Acesso a criação e edição de designs',
  [USER_ROLES.OPERADOR_SUBLIMACAO]: 'Acesso a operações de sublimação',
  [USER_ROLES.EXPEDICAO]: 'Acesso a processos de expedição',
  [USER_ROLES.COSTURA]: 'Acesso a processos de costura',
  [USER_ROLES.RECEPCAO]: 'Acesso a processos de recepção',
};

/**
 * Função helper para obter o label de uma role
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role;
}

/**
 * Função helper para verificar se uma role é válida
 */
export function isValidRole(role: string): role is UserRole {
  return ALL_ROLES.includes(role as UserRole);
}

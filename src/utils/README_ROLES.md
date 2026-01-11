# Sistema de Roles/Permissões

Este documento descreve como usar o sistema de roles/permissões no frontend.

## Conceitos

- **Roles**: Papéis que um usuário possui (ex: `ADMIN`, `VENDEDOR`, `DESIGNER`)
- **JWT**: Token JWT contém as roles do usuário no payload
- **Frontend**: Apenas controla a UI - toda validação real deve ser feita no backend

## Roles Disponíveis

O sistema suporta as seguintes roles:

- `ADMIN` - Administrador (acesso completo)
- `VENDEDOR` - Vendedor
- `DESIGNER` - Designer
- `OPERADOR_SUBLIMACAO` - Operador Sublimação
- `EXPEDICAO` - Expedição
- `COSTURA` - Costura
- `RECEPCAO` - Recepção

### Usando as Constantes de Roles

Para evitar erros de digitação, use as constantes definidas em `src/types/roles.ts`:

```typescript
import { USER_ROLES, ROLE_LABELS, getRoleLabel } from '@/types/roles';

// Em vez de escrever strings diretamente
if (hasRole('ADMIN')) { ... }

// Use as constantes
if (hasRole(USER_ROLES.ADMIN)) { ... }

// Obter label amigável
const label = getRoleLabel(USER_ROLES.VENDEDOR); // "Vendedor"
const label2 = ROLE_LABELS[USER_ROLES.ADMIN]; // "Administrador"
```

## Extração de Roles do JWT

Após o login, as roles são automaticamente extraídas do JWT:

```typescript
import { extractRolesFromJWT } from '@/utils/jwt';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const roles = extractRolesFromJWT(token); // ['ADMIN', 'FINANCEIRO']
```

## Helpers

### hasRole(role: string): boolean
Verifica se o usuário possui uma role específica.

```typescript
import { hasRole } from '@/utils/authHelpers';

if (hasRole('ADMIN')) {
  // Usuário é admin
}
```

### hasAnyRole(roles: string[]): boolean
Verifica se o usuário possui pelo menos uma das roles especificadas.

```typescript
import { hasAnyRole } from '@/utils/authHelpers';

if (hasAnyRole(['ADMIN', 'FINANCEIRO'])) {
  // Usuário é admin OU financeiro
}
```

### hasAllRoles(roles: string[]): boolean
Verifica se o usuário possui todas as roles especificadas.

```typescript
import { hasAllRoles } from '@/utils/authHelpers';

if (hasAllRoles(['ADMIN', 'FINANCEIRO'])) {
  // Usuário é admin E financeiro
}
```

### Hooks React

```typescript
import { useHasRole, useHasAnyRole, useHasAllRoles } from '@/utils/authHelpers';

function MyComponent() {
  const isAdmin = useHasRole('ADMIN');
  const canViewFinance = useHasAnyRole(['ADMIN', 'FINANCEIRO']);
  const isSuperUser = useHasAllRoles(['ADMIN', 'SUPER_USER']);

  return (
    <div>
      {isAdmin && <Button>Admin Action</Button>}
      {canViewFinance && <Button>View Finance</Button>}
    </div>
  );
}
```

## Componentes

### ProtectedContent

Renderiza children apenas se o usuário tiver a role necessária.

```tsx
import { ProtectedContent } from '@/components/auth/ProtectedContent';

// Com role única
<ProtectedContent role="ADMIN">
  <Button>Deletar</Button>
</ProtectedContent>

// Com qualquer role
<ProtectedContent anyRole={['ADMIN', 'FINANCEIRO']}>
  <Button>Ver Relatórios</Button>
</ProtectedContent>

// Com todas as roles
<ProtectedContent allRoles={['ADMIN', 'SUPER_USER']}>
  <Button>Ação Super User</Button>
</ProtectedContent>

// Com fallback
<ProtectedContent 
  role="ADMIN"
  fallback={<p>Você não tem permissão</p>}
>
  <Button>Admin Action</Button>
</ProtectedContent>
```

### ProtectedRoute

Protege rotas baseado em roles (atualizado para suportar roles).

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

// Usando requireAdmin (compatibilidade)
<ProtectedRoute requireAdmin={true}>
  <AdminPage />
</ProtectedRoute>

// Usando requireRole
<ProtectedRoute requireRole="FINANCEIRO">
  <FinanceiroPage />
</ProtectedRoute>

// Usando requireAnyRole
<ProtectedRoute requireAnyRole={['ADMIN', 'FINANCEIRO']}>
  <ReportsPage />
</ProtectedRoute>
```

### useRequireRole Hook

Hook para proteger rotas programaticamente.

```tsx
import { useRequireRole } from '@/hooks/useRequireRole';

function FinanceiroPage() {
  useRequireRole('FINANCEIRO', '/dashboard');
  
  return <div>Financeiro Content</div>;
}

// Com múltiplas roles
function ReportsPage() {
  useRequireRole(['ADMIN', 'FINANCEIRO'], '/unauthorized');
  
  return <div>Reports Content</div>;
}
```

## Exemplos Práticos

### Exemplo 1: Botão visível apenas para ADMIN

```tsx
import { ProtectedContent } from '@/components/auth/ProtectedContent';
import { Button } from '@/components/ui/button';

function MyPage() {
  return (
    <div>
      <h1>Minha Página</h1>
      <ProtectedContent role="ADMIN">
        <Button variant="destructive">Deletar Tudo</Button>
      </ProtectedContent>
    </div>
  );
}
```

### Exemplo 2: Tela de financeiro acessível apenas para FINANCEIRO ou ADMIN

```tsx
// No Dashboard.tsx
<Route 
  path="/fechamentos" 
  element={
    <ProtectedRoute requireAnyRole={['ADMIN', 'FINANCEIRO']}>
      <Fechamentos />
    </ProtectedRoute>
  } 
/>

// Ou dentro do componente
import { useRequireRole } from '@/hooks/useRequireRole';

function Fechamentos() {
  useRequireRole(['ADMIN', 'FINANCEIRO'], '/dashboard');
  
  return <div>Fechamentos Content</div>;
}
```

### Exemplo 3: Múltiplas condições

```tsx
import { ProtectedContent } from '@/components/auth/ProtectedContent';
import { useHasRole } from '@/utils/authHelpers';

function ComplexPage() {
  const isAdmin = useHasRole('ADMIN');
  const isFinanceiro = useHasRole('FINANCEIRO');

  return (
    <div>
      {/* Visível para todos autenticados */}
      <h1>Dashboard</h1>

      {/* Visível apenas para ADMIN */}
      <ProtectedContent role="ADMIN">
        <Button>Configurações Admin</Button>
      </ProtectedContent>

      {/* Visível para ADMIN ou FINANCEIRO */}
      <ProtectedContent anyRole={['ADMIN', 'FINANCEIRO']}>
        <Button>Relatórios Financeiros</Button>
      </ProtectedContent>

      {/* Condição customizada */}
      {isAdmin && isFinanceiro && (
        <Button>Super Funcionalidade</Button>
      )}
    </div>
  );
}
```

## Compatibilidade com Código Antigo

O sistema mantém compatibilidade com código existente:

- `isAdmin` continua funcionando
- `requireAdmin={true}` continua funcionando
- Usuários antigos sem roles no JWT continuam funcionando (roles será array vazio)

## Segurança

⚠️ **IMPORTANTE**: Este sistema apenas controla a UI no frontend. Toda validação real de permissões deve ser feita no backend.

- O frontend apenas esconde/mostra elementos
- O backend deve validar todas as requisições
- Nunca confie no frontend para segurança

## Estrutura do JWT Esperado

O sistema espera que o JWT contenha as roles em um destes formatos:

```json
{
  "user_id": 1,
  "username": "usuario",
  "roles": ["ADMIN", "FINANCEIRO"]
}
```

Ou:

```json
{
  "sub": 1,
  "role": "ADMIN"
}
```

Ou:

```json
{
  "id": 1,
  "user_roles": ["ADMIN", "FINANCEIRO"]
}
```

O sistema tenta todos esses formatos automaticamente.

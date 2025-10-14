# 📦 Guia de Migração: Material-UI → Shadcn UI

Este documento descreve a migração do frontend de Material-UI para Shadcn UI com Tailwind CSS.

## 🎯 Objetivos da Migração

- ✅ Interface mais moderna e elegante
- ✅ Melhor performance (componentes mais leves)
- ✅ Maior controle sobre o código dos componentes
- ✅ Design system baseado em Tailwind CSS
- ✅ Melhor acessibilidade com Radix UI
- ✅ Componentes totalmente customizáveis

## 📊 Mudanças Principais

### Dependências Removidas

```diff
- "@mui/material": "^5.15.10"
- "@mui/icons-material": "^5.15.10"
- "@emotion/react": "^11.11.3"
- "@emotion/styled": "^11.11.0"
- "react-toastify": "^10.0.4"
```

### Dependências Adicionadas

```diff
+ "@radix-ui/react-dialog": "^1.0.5"
+ "@radix-ui/react-dropdown-menu": "^2.0.6"
+ "@radix-ui/react-label": "^2.0.2"
+ "@radix-ui/react-select": "^2.0.0"
+ "@radix-ui/react-slot": "^1.0.2"
+ "@radix-ui/react-toast": "^1.1.5"
+ "@radix-ui/react-separator": "^1.0.3"
+ "class-variance-authority": "^0.7.0"
+ "clsx": "^2.1.0"
+ "tailwind-merge": "^2.2.1"
+ "lucide-react": "^0.323.0"
+ "tailwindcss": "^3.4.1"
+ "autoprefixer": "^10.4.17"
+ "postcss": "^8.4.35"
```

## 🔄 Mapeamento de Componentes

### Material-UI → Shadcn UI

| Material-UI | Shadcn UI | Notas |
|------------|-----------|-------|
| `Button` | `Button` | Variantes similares |
| `TextField` | `Input` + `Label` | Separado em componentes |
| `Card`, `CardContent` | `Card`, `CardContent` | API similar |
| `Dialog`, `DialogTitle` | `Dialog`, `DialogTitle` | Baseado em Radix UI |
| `Table`, `TableRow` | `Table`, `TableRow` | Estrutura similar |
| `Chip` | `Badge` | Menos variantes built-in |
| `MenuItem`, `Select` | `Select`, `SelectItem` | API diferente |
| `Divider` | `Separator` | Nome diferente |
| `IconButton` | `Button size="icon"` | Variante especial |
| `Alert` | Mensagem customizada | Sem componente direto |

### Ícones: Material Icons → Lucide React

| Material Icons | Lucide React |
|---------------|--------------|
| `<Edit />` | `<Edit />` (mesmo nome) |
| `<Delete />` | `<Trash2 />` |
| `<Visibility />` | `<Eye />` |
| `<Add />` | `<Plus />` |
| `<ArrowBack />` | `<ArrowLeft />` |
| `<ShoppingCart />` | `<ShoppingCart />` |
| `<Dashboard />` | `<LayoutDashboard />` |
| `<Logout />` | `<LogOut />` |
| `<Menu />` | `<Menu />` |
| `<Download />` | `<Download />` |
| `<PictureAsPdf />` | `<FileText />` |

## 📝 Exemplos de Migração

### Login.tsx

**Antes (Material-UI):**
```tsx
import { Container, Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

<Container component="main" maxWidth="xs">
  <Box sx={{ marginTop: 8 }}>
    <Paper elevation={3} sx={{ p: 4 }}>
      <LockOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
      <Typography component="h1" variant="h5">
        SGP - Sistema de Gerenciamento
      </Typography>
      
      {error && <Alert severity="error">{error}</Alert>}
      
      <TextField
        margin="normal"
        required
        fullWidth
        label="Usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      
      <Button type="submit" fullWidth variant="contained">
        Entrar
      </Button>
    </Paper>
  </Box>
</Container>
```

**Depois (Shadcn UI):**
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
  <Card className="w-full max-w-md shadow-2xl">
    <CardHeader className="space-y-1 flex flex-col items-center pb-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <CardTitle className="text-2xl font-bold text-center">
        SGP - Sistema de Gerenciamento
      </CardTitle>
    </CardHeader>
    
    <CardContent>
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="username">Usuário</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      
      <Button type="submit" className="w-full">
        Entrar
      </Button>
    </CardContent>
  </Card>
</div>
```

### Dashboard.tsx

**Antes (Material-UI):**
```tsx
import { Box, Drawer, AppBar, Toolbar, List, Typography } from '@mui/material';

<Box sx={{ display: 'flex' }}>
  <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)` }}>
    <Toolbar>
      <Typography variant="h6">Sistema de Gerenciamento</Typography>
    </Toolbar>
  </AppBar>
  
  <Drawer variant="permanent" sx={{ width: drawerWidth }}>
    <List>
      {/* Menu items */}
    </List>
  </Drawer>
  
  <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
    {/* Content */}
  </Box>
</Box>
```

**Depois (Shadcn UI):**
```tsx
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

<div className="flex h-screen bg-background">
  <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary">SGP v4</h1>
    </div>
    
    <Separator />
    
    <nav className="flex-1 p-4 space-y-2">
      {menuItems.map((item) => (
        <Button
          key={item.path}
          variant={active ? "secondary" : "ghost"}
          className="w-full justify-start"
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </nav>
  </aside>
  
  <div className="flex-1 flex flex-col">
    <header className="border-b bg-card px-6 py-4">
      <h2 className="text-xl font-semibold">Sistema de Gerenciamento</h2>
    </header>
    
    <main className="flex-1 overflow-y-auto p-6">
      {/* Content */}
    </main>
  </div>
</div>
```

### Notificações

**Antes (react-toastify):**
```tsx
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

toast.success('Pedido criado com sucesso!');
toast.error('Erro ao carregar pedidos');

<ToastContainer position="top-right" autoClose={3000} />
```

**Depois (Shadcn UI Toast):**
```tsx
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const { toast } = useToast();

toast({
  title: "Sucesso",
  description: "Pedido criado com sucesso!",
});

toast({
  title: "Erro",
  description: "Não foi possível carregar os pedidos.",
  variant: "destructive",
});

<Toaster />
```

## 🎨 Padrões de Estilização

### Material-UI (sx prop) → Tailwind CSS (className)

**Antes:**
```tsx
<Box sx={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  mb: 3,
  gap: 2 
}}>
```

**Depois:**
```tsx
<div className="flex justify-between mb-6 gap-4">
```

### Cores do Tema

**Antes:**
```tsx
<Box sx={{ color: 'primary.main', bgcolor: 'background.paper' }}>
```

**Depois:**
```tsx
<div className="text-primary bg-card">
```

### Responsividade

**Antes:**
```tsx
<Box sx={{ 
  display: { xs: 'none', sm: 'block' },
  width: { xs: '100%', md: '50%' }
}}>
```

**Depois:**
```tsx
<div className="hidden sm:block w-full md:w-1/2">
```

## 🔧 Configuração do tsconfig.json

Adicione o alias `@` para imports mais limpos:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 📦 Scripts Necessários

Nenhum script adicional necessário! O Tailwind CSS é processado automaticamente pelo Vite.

## ✅ Checklist de Migração

- [x] Remover dependências do Material-UI
- [x] Instalar Tailwind CSS e dependências Shadcn
- [x] Configurar `tailwind.config.js`
- [x] Configurar `postcss.config.js`
- [x] Criar `src/lib/utils.ts` com função `cn()`
- [x] Atualizar `src/index.css` com estilos Tailwind
- [x] Criar componentes UI em `src/components/ui/`
- [x] Migrar `App.tsx`
- [x] Migrar `Login.tsx`
- [x] Migrar `Dashboard.tsx`
- [x] Migrar `OrderList.tsx`
- [x] Migrar `OrderForm.tsx`
- [x] Migrar `OrderDetails.tsx`
- [x] Configurar sistema de Toast
- [x] Trocar ícones Material para Lucide
- [x] Testar todas as funcionalidades
- [x] Atualizar documentação

## 🚀 Próximos Passos

Após a migração, você pode:

1. **Adicionar Dark Mode:**
   ```tsx
   // Implementar toggle de tema
   const [theme, setTheme] = useState('light');
   document.documentElement.classList.toggle('dark');
   ```

2. **Criar Componentes Customizados:**
   ```tsx
   // Criar variantes personalizadas
   const customButton = cva(buttonVariants, {
     variants: {
       brand: "bg-brand text-white hover:bg-brand/90"
     }
   });
   ```

3. **Adicionar Animações:**
   ```tsx
   // Usar Framer Motion para animações avançadas
   npm install framer-motion
   ```

4. **Melhorar Acessibilidade:**
   - Os componentes Radix UI já são acessíveis
   - Adicione `aria-labels` onde necessário
   - Teste com leitores de tela

## 📚 Recursos Úteis

- [Shadcn UI Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Lucide Icons](https://lucide.dev)
- [CVA (Class Variance Authority)](https://cva.style/docs)

## 🐛 Problemas Comuns e Soluções

### 1. Estilos não aplicados

**Problema:** Classes Tailwind não funcionam

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules .next
npm install
```

### 2. Imports não encontrados

**Problema:** `Cannot find module '@/components/ui/button'`

**Solução:** Verificar `tsconfig.json` e reiniciar TypeScript server

### 3. Componentes sem estilo

**Problema:** Componentes aparecem sem estilo

**Solução:** Verificar se `index.css` está sendo importado em `main.tsx`

---

**✨ Migração concluída com sucesso!**

A aplicação agora possui uma interface moderna, elegante e totalmente customizável usando Shadcn UI e Tailwind CSS.


# 🎨 Guia de Configuração do Shadcn UI

Este documento explica como o Shadcn UI foi configurado no projeto e como você pode customizá-lo ou adicionar novos componentes.

## 📦 O que é Shadcn UI?

**Shadcn UI** não é uma biblioteca de componentes tradicional. Em vez de instalar pacotes npm, ele copia componentes diretamente para o seu projeto. Isso te dá:

- ✅ **Controle Total**: Os componentes são seus, você pode modificá-los livremente
- ✅ **Sem Dependências Pesadas**: Apenas as primitivas Radix UI necessárias
- ✅ **Tailwind CSS**: Estilização moderna e customizável
- ✅ **TypeScript**: Totalmente tipado
- ✅ **Acessibilidade**: Built-in com Radix UI

## 🚀 Como Foi Configurado

### 1. Dependências Instaladas

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-separator": "^1.0.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "lucide-react": "^0.323.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
```

### 2. Configuração do Tailwind CSS

**`tailwind.config.js`:**
```js
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... outras cores
      },
    },
  },
}
```

**`postcss.config.js`:**
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3. Estilos Globais

**`src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    /* ... outras variáveis */
  }
}
```

### 4. Utilitário para Classes

**`src/lib/utils.ts`:**
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Esta função `cn()` combina classes do Tailwind de forma inteligente, evitando conflitos.

## 📂 Estrutura de Componentes

Todos os componentes Shadcn estão em `src/components/ui/`:

```
src/components/ui/
├── button.tsx       # Botões com variantes
├── card.tsx         # Cards
├── dialog.tsx       # Modais
├── input.tsx        # Campos de entrada
├── label.tsx        # Labels
├── select.tsx       # Dropdown
├── table.tsx        # Tabelas
├── toast.tsx        # Notificações
├── toaster.tsx      # Provider de toasts
├── badge.tsx        # Badges
├── separator.tsx    # Separadores
└── textarea.tsx     # Área de texto
```

## 🎨 Customização de Tema

### Alterar Cores Principais

Edite `src/index.css` para mudar as cores do tema:

```css
:root {
  /* Mudar cor primária para verde */
  --primary: 142 76% 36%;  /* HSL do verde */
  --primary-foreground: 0 0% 100%;
  
  /* Mudar cor destrutiva */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 100%;
}
```

**Dica:** Use [https://uicolors.app/create](https://uicolors.app/create) para gerar paletas HSL.

### Dark Mode

O projeto já está configurado para dark mode. Para ativar:

```tsx
// Adicionar classe "dark" ao elemento root
<html className="dark">
```

As cores do dark mode já estão definidas em `index.css`:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... outras cores dark */
}
```

## ➕ Adicionar Novos Componentes

### Opção 1: Via CLI (Recomendado)

```bash
# Adicionar componente de accordion
npx shadcn-ui@latest add accordion

# Adicionar componente de dropdown menu
npx shadcn-ui@latest add dropdown-menu

# Ver todos os componentes disponíveis
npx shadcn-ui@latest add
```

### Opção 2: Copiar Manualmente

1. Acesse [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components)
2. Escolha o componente desejado
3. Copie o código do componente
4. Cole em `src/components/ui/nome-componente.tsx`
5. Ajuste imports se necessário

## 🔧 Uso dos Componentes

### Button

```tsx
import { Button } from "@/components/ui/button"

<Button>Clique aqui</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Excluir</Button>
<Button size="sm">Pequeno</Button>
<Button size="lg">Grande</Button>
```

### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo aqui
  </CardContent>
</Card>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Modal</DialogTitle>
      <DialogDescription>
        Descrição aqui
      </DialogDescription>
    </DialogHeader>
    <div>Conteúdo</div>
  </DialogContent>
</Dialog>
```

### Toast

```tsx
import { useToast } from "@/hooks/use-toast"

function MyComponent() {
  const { toast } = useToast()
  
  return (
    <Button
      onClick={() => {
        toast({
          title: "Sucesso!",
          description: "Operação realizada com sucesso.",
        })
      }}
    >
      Mostrar Toast
    </Button>
  )
}
```

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Opção 1</SelectItem>
    <SelectItem value="option2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="success">Sucesso</Badge>
<Badge variant="warning">Aviso</Badge>
<Badge variant="destructive">Erro</Badge>
```

### Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>João</TableCell>
      <TableCell>joao@email.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## 🎯 Boas Práticas

### 1. Use a função `cn()` para classes

```tsx
import { cn } from "@/lib/utils"

<div className={cn("base-classes", isActive && "active-classes")} />
```

### 2. Crie variantes customizadas

```tsx
// Em button.tsx
const buttonVariants = cva("base-styles", {
  variants: {
    variant: {
      default: "...",
      myCustom: "bg-purple-500 text-white hover:bg-purple-600",
    },
  },
})

// Uso:
<Button variant="myCustom">Custom</Button>
```

### 3. Reutilize componentes

```tsx
// src/components/DeleteButton.tsx
export function DeleteButton({ onClick }) {
  return (
    <Button variant="destructive" onClick={onClick}>
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir
    </Button>
  )
}
```

## 📱 Responsividade

Use classes Tailwind para responsividade:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Conteúdo */}
</div>

<Button className="w-full sm:w-auto">
  Responsivo
</Button>
```

## 🔍 Debugging

### Inspecionar variáveis CSS

```js
// No console do navegador
getComputedStyle(document.documentElement).getPropertyValue('--primary')
```

### Ver todas as cores

```css
/* Adicione temporariamente em index.css para debug */
* {
  outline: 1px solid red;
}
```

## 📚 Recursos

- [Shadcn UI Docs](https://ui.shadcn.com)
- [Radix UI Docs](https://www.radix-ui.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

## 🐛 Solução de Problemas

### Estilos não aplicados

1. Verifique se Tailwind está configurado corretamente
2. Certifique-se que `index.css` é importado em `main.tsx`
3. Verifique se o caminho em `content` do `tailwind.config.js` está correto

### Componentes não encontrados

1. Verifique se o import usa `@/components/ui/...`
2. Certifique-se que `tsconfig.json` tem o alias `@` configurado
3. Reinicie o TypeScript server no VSCode

### Toast não aparece

1. Verifique se `<Toaster />` está no `App.tsx`
2. Certifique-se de usar o hook `useToast()` corretamente

---

**🎨 Frontend refatorado com sucesso usando Shadcn UI + Tailwind CSS!**


export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie configurações e dados do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Materiais</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Designers</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Vendedores</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Tecidos</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Formas de Envio</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <p className="font-medium">Formas de Pagamento</p>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
      </div>
    </div>
  );
}


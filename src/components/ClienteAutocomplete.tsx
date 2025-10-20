import { useState, useEffect, useRef } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { api } from '@/services/api';
import { Cliente } from '@/types';

interface ClienteAutocompleteProps {
  value: string;
  onSelect: (cliente: Cliente | null) => void;
  onInputChange: (value: string) => void;
  className?: string;
}

export function ClienteAutocomplete({
  value,
  onSelect,
  onInputChange,
  className
}: ClienteAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [todosClientes, setTodosClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Carregar todos os clientes na inicialização
  useEffect(() => {
    loadClientes();
  }, []);

  // Busca conforme digita
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.length >= 2) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        filterClientes(searchTerm);
        setLoading(false);
      }, 150);
    } else {
      setClientesFiltrados([]);
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const loadClientes = async () => {
    try {
      const data = await api.getClientes();
      setTodosClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const filterClientes = (term: string) => {
    const filtrados = todosClientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(term.toLowerCase())
    );
    setClientesFiltrados(filtrados);
  };

  const handleSelect = (cliente: Cliente) => {
    setSearchTerm(cliente.nome);
    setSelectedCliente(cliente);
    onSelect(cliente);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    onInputChange(newValue);
    
    if (newValue.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
      setSelectedCliente(null);
      onSelect(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Digite o nome do cliente..."
              className="pl-10 h-12 text-base w-full"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-h-80 overflow-auto">
            {clientesFiltrados.length === 0 && !loading && searchTerm.length >= 2 && (
              <div className="p-4 text-center text-gray-500">
                Nenhum cliente encontrado para "{searchTerm}"
                <div className="text-xs text-gray-400 mt-1">
                  Total de clientes: {todosClientes.length}
                </div>
              </div>
            )}
            {clientesFiltrados.length === 0 && loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2">Buscando...</span>
              </div>
            )}
            {clientesFiltrados.length > 0 && (
              <div className="py-1">
                {clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    onClick={() => handleSelect(cliente)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 group"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-gray-900 group-hover:text-blue-900 truncate">{cliente.nome}</span>
                      <span className="text-sm text-gray-500 group-hover:text-blue-600">
                        {cliente.telefone} • {cliente.cidade}
                      </span>
                    </div>
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      
    </div>
  );
}


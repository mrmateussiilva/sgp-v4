import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Monitor, Calendar, Palette, Layers, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { MachineEntity } from '@/api/types';

interface FormProducaoFieldsProps {
    data: {
        rip_maquina?: string | null;
        machine_id?: number | null;
        data_impressao?: string | null;
        perfil_cor?: string | null;
        tecido_fornecedor?: string | null;
    };
    onDataChange: (field: string, value: any) => void;
    className?: string;
    disabled?: boolean;
}

export const FormProducaoFields: React.FC<FormProducaoFieldsProps> = ({
    data,
    onDataChange,
    className = "",
    disabled = false,
}) => {
    const [maquinas, setMaquinas] = useState<MachineEntity[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMaquinas = async () => {
            setLoading(true);
            try {
                const data = await api.getMaquinasAtivas();
                setMaquinas(data);
            } catch (error) {
                console.error("Erro ao buscar máquinas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMaquinas();
    }, []);

    const handleMachineChange = (value: string) => {
        const machineId = parseInt(value);
        const machine = maquinas.find(m => m.id === machineId);

        if (machine) {
            onDataChange('machine_id', machine.id);
            onDataChange('rip_maquina', machine.name);
        } else {
            // Caso especial para valor manual se necessário, por enquanto apenas os da lista
            onDataChange('rip_maquina', value);
        }
    };

    return (
        <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${className}`}>
            {/* Máquina */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Monitor className="w-3.5 h-3.5 text-slate-500" />
                    <Label htmlFor="rip_maquina" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Máquina:
                    </Label>
                </div>

                <Select
                    value={data.machine_id?.toString() || (data.rip_maquina ? 'legacy' : '')}
                    onValueChange={handleMachineChange}
                    disabled={disabled}
                >
                    <SelectTrigger
                        id="rip_maquina"
                        className={`h-7 w-40 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                        ) : (
                            <SelectValue placeholder="Selecione..." />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {/* Fallback para dados legados que não tem ID */}
                        {data.rip_maquina && !data.machine_id && (
                            <SelectItem value="legacy" disabled className="text-amber-600 italic">
                                {data.rip_maquina} (Antigo)
                            </SelectItem>
                        )}

                        {maquinas.map((maquina) => (
                            <SelectItem key={maquina.id} value={maquina.id.toString()}>
                                {maquina.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Data de Impressão */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <Label htmlFor="data_impressao" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Impressão:
                    </Label>
                </div>
                <Input
                    id="data_impressao"
                    type="date"
                    value={data.data_impressao || ''}
                    onChange={(e) => onDataChange('data_impressao', e.target.value)}
                    className={`h-7 w-32 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2 ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={disabled}
                />
            </div>

            {/* Perfil de Cor */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    <Label htmlFor="perfil_cor" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Perfil:
                    </Label>
                </div>
                <Input
                    id="perfil_cor"
                    value={data.perfil_cor || ''}
                    onChange={(e) => onDataChange('perfil_cor', e.target.value)}
                    placeholder="Perfil ICC"
                    className={`h-7 w-28 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={disabled}
                />
            </div>

            {/* Tecido */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <Label htmlFor="tecido_fornecedor" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Tecido:
                    </Label>
                </div>
                <Input
                    id="tecido_fornecedor"
                    value={data.tecido_fornecedor || ''}
                    onChange={(e) => onDataChange('tecido_fornecedor', e.target.value)}
                    placeholder="Tecido"
                    className={`h-7 w-32 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

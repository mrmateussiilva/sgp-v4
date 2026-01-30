import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Calendar, Palette, Layers } from 'lucide-react';

interface FormProducaoFieldsProps {
    data: {
        rip_maquina?: string;
        data_impressao?: string;
        perfil_cor?: string;
        tecidofornecedor?: string;
        tecedo_fornecedor?: string;
        tecido_fornecedor?: string;
    };
    onDataChange: (field: string, value: string) => void;
    className?: string;
}

export const FormProducaoFields: React.FC<FormProducaoFieldsProps> = ({
    data,
    onDataChange,
    className = "",
}) => {
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
                <Input
                    id="rip_maquina"
                    value={data.rip_maquina || ''}
                    onChange={(e) => onDataChange('rip_maquina', e.target.value)}
                    placeholder="Máquina"
                    className="h-7 w-32 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2"
                />
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
                    className="h-7 w-32 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2 cursor-pointer"
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
                    className="h-7 w-28 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2"
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
                    className="h-7 w-32 text-xs bg-transparent border-slate-200 focus:border-blue-400 focus:ring-0 transition-all font-medium px-2"
                />
            </div>
        </div>
    );
};

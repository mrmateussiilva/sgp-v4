import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormProducaoFieldsProps {
    data: {
        rip_maquina?: string;
        data_impressao?: string;
        perfil_cor?: string;
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
            {/* Máquina */}
            <div className="space-y-1">
                <Label htmlFor="rip_maquina" className="text-xs font-semibold text-slate-600 uppercase tracking-tight">Máquina / RIP</Label>
                <Input
                    id="rip_maquina"
                    value={data.rip_maquina || ''}
                    onChange={(e) => onDataChange('rip_maquina', e.target.value)}
                    placeholder="Ex: Mutoh 1, Epson"
                    className="h-8 text-sm bg-white"
                />
            </div>

            {/* Data de Impressão */}
            <div className="space-y-1">
                <Label htmlFor="data_impressao" className="text-xs font-semibold text-slate-600 uppercase tracking-tight">Data de Impressão</Label>
                <Input
                    id="data_impressao"
                    type="date"
                    value={data.data_impressao || ''}
                    onChange={(e) => onDataChange('data_impressao', e.target.value)}
                    className="h-8 text-sm bg-white"
                />
            </div>

            {/* Perfil de Cor */}
            <div className="space-y-1">
                <Label htmlFor="perfil_cor" className="text-xs font-semibold text-slate-600 uppercase tracking-tight">Perfil de Cor</Label>
                <Input
                    id="perfil_cor"
                    value={data.perfil_cor || ''}
                    onChange={(e) => onDataChange('perfil_cor', e.target.value)}
                    placeholder="Ex: FOGRA39, Perfil 1"
                    className="h-8 text-sm bg-white"
                />
            </div>

            {/* Tecido (Tipo/Fornecedor) */}
            <div className="space-y-1">
                <Label htmlFor="tecido_fornecedor" className="text-xs font-semibold text-slate-600 uppercase tracking-tight">Tecido (Fornecedor)</Label>
                <Input
                    id="tecido_fornecedor"
                    value={data.tecido_fornecedor || ''}
                    onChange={(e) => onDataChange('tecido_fornecedor', e.target.value)}
                    placeholder="Ex: Texitil, Sete"
                    className="h-8 text-sm bg-white"
                />
            </div>
        </div>
    );
};

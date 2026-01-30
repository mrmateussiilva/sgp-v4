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
        <div className={`flex flex-col gap-5 ${className}`}>
            {/* GRUPO A: PRODUÇÃO (DESTAQUE) */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-0.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                    <Label htmlFor="rip_maquina" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Produção / Máquina
                    </Label>
                </div>
                <Input
                    id="rip_maquina"
                    value={data.rip_maquina || ''}
                    onChange={(e) => onDataChange('rip_maquina', e.target.value)}
                    placeholder="Selecione a máquina (ex: Mutoh 1, Epson)"
                    className="h-10 text-sm bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100 transition-all font-medium"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* GRUPO B: EXECUÇÃO */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <Label htmlFor="data_impressao" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Data de Impressão
                        </Label>
                    </div>
                    <Input
                        id="data_impressao"
                        type="date"
                        value={data.data_impressao || ''}
                        onChange={(e) => onDataChange('data_impressao', e.target.value)}
                        className="h-10 text-sm bg-white border-slate-200 focus:border-emerald-400 focus:ring-emerald-100 transition-all cursor-pointer"
                    />
                </div>

                {/* GRUPO C: CONFIGURAÇÃO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-1">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 px-0.5">
                            <Palette className="w-3.5 h-3.5 text-purple-600" />
                            <Label htmlFor="perfil_cor" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Perfil de Cor
                            </Label>
                        </div>
                        <Input
                            id="perfil_cor"
                            value={data.perfil_cor || ''}
                            onChange={(e) => onDataChange('perfil_cor', e.target.value)}
                            placeholder="Perfil ICC"
                            className="h-10 text-sm bg-white border-slate-200 focus:border-purple-400 focus:ring-purple-100 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 px-0.5">
                            <Layers className="w-3.5 h-3.5 text-orange-600" />
                            <Label htmlFor="tecido_fornecedor" className="text-xs font-bold text-slate-700 uppercase tracking-wider line-clamp-1">
                                Tecido
                            </Label>
                        </div>
                        <Input
                            id="tecido_fornecedor"
                            value={data.tecido_fornecedor || ''}
                            onChange={(e) => onDataChange('tecido_fornecedor', e.target.value)}
                            placeholder="Fornecedor / Tipo"
                            className="h-10 text-sm bg-white border-slate-200 focus:border-orange-400 focus:ring-orange-100 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

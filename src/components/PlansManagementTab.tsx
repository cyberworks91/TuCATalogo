import React, { useState } from 'react';
import { CreditCard, Save, Plus, Trash2, Check, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlobalSettings, PlanConfig } from '../types';
import { dbService } from '../lib/supabase-service';

interface PlansManagementTabProps {
  globalSettings: GlobalSettings | null;
  onRefresh: () => void;
}

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    duration_months: 0,
    price_per_month: 0,
    total_price: 0,
    max_products: 3,
    allow_carousel: false,
    is_free: true,
    badge: 'Gratis',
    description: 'Hasta 3 productos activos únicamente. Fotos de carrusel no modificables.'
  },
  {
    id: 'base',
    name: 'Plan Base (1 Mes)',
    duration_months: 1,
    price_per_month: 1000,
    total_price: 1000,
    max_products: null,
    allow_carousel: true,
    is_free: false,
    badge: 'Mensual',
    description: 'Productos ilimitados, carrusel de imágenes personalizado y soporte.'
  },
  {
    id: '3months',
    name: 'Plan 3 Meses',
    duration_months: 3,
    price_per_month: 900,
    total_price: 2700,
    max_products: null,
    allow_carousel: true,
    is_free: false,
    badge: 'Ahorra 10%',
    description: '900 CUP por mes (Total 2,700 CUP). Permisos ilimitados.'
  },
  {
    id: '6months',
    name: 'Plan 6 Meses',
    duration_months: 6,
    price_per_month: 800,
    total_price: 4800,
    max_products: null,
    allow_carousel: true,
    is_free: false,
    badge: 'Más Popular (Ahorra 20%)',
    description: '800 CUP por mes (Total 4,800 CUP). Permisos ilimitados.'
  },
  {
    id: '1year',
    name: 'Plan 1 Año',
    duration_months: 12,
    price_per_month: 700,
    total_price: 8400,
    max_products: null,
    allow_carousel: true,
    is_free: false,
    badge: 'Mejor Precio (Ahorra 30%)',
    description: '700 CUP por mes (Total 8,400 CUP). Permisos ilimitados.'
  }
];

export const PlansManagementTab: React.FC<PlansManagementTabProps> = ({
  globalSettings,
  onRefresh
}) => {
  const [bankCardNumber, setBankCardNumber] = useState(globalSettings?.bank_card_number || '9225 1234 5678 9012');
  const [bankCardOwner, setBankCardOwner] = useState(globalSettings?.bank_card_owner || 'TuCATalogo Pagos (Transfermóvil/BM)');
  const [plans, setPlans] = useState<PlanConfig[]>(globalSettings?.plans || DEFAULT_PLANS);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdatePlan = (index: number, updates: Partial<PlanConfig>) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], ...updates };
    setPlans(newPlans);
  };

  const handleToggleUnlimitedProducts = (index: number) => {
    const newPlans = [...plans];
    const current = newPlans[index].max_products;
    newPlans[index].max_products = current === null ? 3 : null;
    setPlans(newPlans);
  };

  const handleAddPlan = () => {
    const id = `plan_${Date.now()}`;
    setPlans([
      ...plans,
      {
        id,
        name: 'Nuevo Plan',
        duration_months: 1,
        price_per_month: 1000,
        total_price: 1000,
        max_products: null,
        allow_carousel: true,
        badge: 'Nuevo',
        description: 'Plan personalizado'
      }
    ]);
  };

  const handleRemovePlan = (index: number) => {
    if (plans.length <= 1) {
      toast.error('Debe haber al menos un plan activo');
      return;
    }
    const newPlans = plans.filter((_, idx) => idx !== index);
    setPlans(newPlans);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updatedSettings: GlobalSettings = {
        ...(globalSettings || {
          footer: { about: '', schedule: '', email: '', phone: '', whatsapp: '', address: '', map_url: '' }
        }),
        bank_card_number: bankCardNumber.trim(),
        bank_card_owner: bankCardOwner.trim(),
        plans: plans
      };

      await dbService.updateGlobalSettings(updatedSettings);
      toast.success('Configuración de planes y tarjeta guardada correctamente');
      onRefresh();
    } catch (error: any) {
      console.error('Error saving plans:', error);
      toast.error(error.message || 'Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Configuración de Planes y Tarjetas de Pago</h3>
          <p className="text-xs text-gray-500">
            Gestiona los precios, límites de productos y tarjeta bancaria de transferencia para crear catálogos.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-md self-start sm:self-auto disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Bank Card Config Box */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-3xl shadow-md border border-gray-700">
        <h4 className="text-base font-bold flex items-center gap-2 mb-4 text-orange-400">
          <CreditCard className="w-5 h-5" /> Tarjeta Bancaria para Transferencias
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Número de Tarjeta (con o sin espacios):
            </label>
            <input
              type="text"
              value={bankCardNumber}
              onChange={(e) => setBankCardNumber(e.target.value)}
              placeholder="9225 1234 5678 9012"
              className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-gray-600 text-white font-mono text-sm tracking-widest focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Nombre del Titular / Nota:
            </label>
            <input
              type="text"
              value={bankCardOwner}
              onChange={(e) => setBankCardOwner(e.target.value)}
              placeholder="TuCATalogo Pagos (Transfermóvil/BM)"
              className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-gray-600 text-white text-sm focus:border-orange-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-base font-bold text-gray-900">Planes Disponibles ({plans.length})</h4>
          <button
            onClick={handleAddPlan}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan, idx) => {
            const isUnlimited = plan.max_products === null || plan.max_products === 0;

            return (
              <div key={plan.id || idx} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4 relative">
                <button
                  onClick={() => handleRemovePlan(idx)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                  title="Eliminar plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Nombre del Plan</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => handleUpdatePlan(idx, { name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Etiqueta / Badge</label>
                    <input
                      type="text"
                      value={plan.badge || ''}
                      onChange={(e) => handleUpdatePlan(idx, { badge: e.target.value })}
                      placeholder="Ej. Ahorra 20%"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Meses</label>
                    <input
                      type="number"
                      min={0}
                      value={plan.duration_months}
                      onChange={(e) => handleUpdatePlan(idx, { duration_months: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">CUP / Mes</label>
                    <input
                      type="number"
                      min={0}
                      value={plan.price_per_month}
                      onChange={(e) => handleUpdatePlan(idx, { price_per_month: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold outline-none text-orange-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Total CUP</label>
                    <input
                      type="number"
                      min={0}
                      value={plan.total_price}
                      onChange={(e) => handleUpdatePlan(idx, { total_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold outline-none text-orange-600"
                    />
                  </div>
                </div>

                {/* Product Limit & Carousel Options */}
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-800">Límite de Productos Activos</span>
                      <p className="text-[10px] text-gray-500">
                        {isUnlimited ? 'Productos ilimitados sin restricción' : `Límite máximo: ${plan.max_products} activos`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleUnlimitedProducts(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isUnlimited ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isUnlimited ? 'Ilimitado ✓' : 'Fijar Límite'}
                    </button>
                  </div>

                  {!isUnlimited && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">Máximo de productos activos:</label>
                      <input
                        type="number"
                        min={1}
                        value={plan.max_products || 3}
                        onChange={(e) => handleUpdatePlan(idx, { max_products: Number(e.target.value) })}
                        className="w-28 px-3 py-1.5 bg-white rounded-xl border text-xs font-bold"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                    <span className="text-xs font-bold text-gray-800">Permitir Modificar Carrusel de Fotos</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.allow_carousel}
                        onChange={(e) => handleUpdatePlan(idx, { allow_carousel: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Descripción Breve</label>
                  <input
                    type="text"
                    value={plan.description || ''}
                    onChange={(e) => handleUpdatePlan(idx, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-medium outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  CreditCard, Save, Plus, Trash2, Check, RefreshCw, Sparkles, ShieldCheck,
  Clock, Calendar, Edit3, PlusCircle, AlertTriangle, Search, ExternalLink,
  Infinity, Zap, CheckCircle2, XCircle, ChevronRight, Layers, User as UserIcon,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Catalog, GlobalSettings, PlanConfig } from '../types';
import { dbService } from '../lib/supabase-service';
import { getImageUrl } from '../lib/utils';

interface PlansManagementTabProps {
  globalSettings: GlobalSettings | null;
  catalogs?: Catalog[];
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
  catalogs = [],
  onRefresh
}) => {
  const [bankCardNumber, setBankCardNumber] = useState(globalSettings?.bank_card_number || '9225 1234 5678 9012');
  const [bankCardOwner, setBankCardOwner] = useState(globalSettings?.bank_card_owner || 'TuCATalogo Pagos (Transfermóvil/BM)');
  const [plans, setPlans] = useState<PlanConfig[]>(globalSettings?.plans || DEFAULT_PLANS);
  const [isSaving, setIsSaving] = useState(false);

  // Catalog time management state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'expired' | 'unlimited'>('all');
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [processingCatalogId, setProcessingCatalogId] = useState<string | null>(null);
  const [customDaysInput, setCustomDaysInput] = useState<number>(30);
  const [customTargetDate, setCustomTargetDate] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('base');
  const [catalogToDelete, setCatalogToDelete] = useState<Catalog | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Catalog | null>(null);

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

  // Helper calculation for time remaining
  const getTimeRemainingInfo = (expiresAt?: string | null, planStatus?: string) => {
    if (planStatus === 'rejected') {
      return { label: 'Rechazado', status: 'expired', days: 0, color: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (planStatus === 'pending') {
      return { label: 'Plan Gratuito (Pendiente de Pago / Aprobación)', status: 'warning', days: 0, color: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    if (!expiresAt) {
      return { label: 'Plan Eterno (Activo de por Vida / Tienda Comprobada)', status: 'unlimited', days: 9999, color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }

    const expTime = new Date(expiresAt).getTime();
    const nowTime = new Date().getTime();
    const diffMs = expTime - nowTime;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return { 
        label: `Expiró hace ${absDays} ${absDays === 1 ? 'día' : 'días'} (${new Date(expiresAt).toLocaleDateString('es-ES')})`, 
        status: 'expired', 
        days: diffDays, 
        color: 'bg-red-50 text-red-700 border-red-200' 
      };
    } else if (diffDays === 0) {
      return { 
        label: `Vence Hoy (${new Date(expiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`, 
        status: 'warning', 
        days: 0, 
        color: 'bg-amber-50 text-amber-800 border-amber-300' 
      };
    } else if (diffDays <= 7) {
      return { 
        label: `Quedan ${diffDays} ${diffDays === 1 ? 'día' : 'días'} (Vence ${new Date(expiresAt).toLocaleDateString('es-ES')})`, 
        status: 'warning', 
        days: diffDays, 
        color: 'bg-amber-50 text-amber-800 border-amber-300' 
      };
    } else {
      const months = Math.floor(diffDays / 30);
      const remDays = diffDays % 30;
      let timeTxt = `${diffDays} días`;
      if (months > 0 && remDays > 0) {
        timeTxt = `${months}m y ${remDays}d`;
      } else if (months > 0) {
        timeTxt = `${months} ${months === 1 ? 'mes' : 'meses'}`;
      }
      return { 
        label: `Quedan ${timeTxt} (${diffDays}d) - Vence ${new Date(expiresAt).toLocaleDateString('es-ES')}`, 
        status: 'active', 
        days: diffDays, 
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300' 
      };
    }
  };

  // Actions for catalog time management
  const handleAddDaysToCatalog = async (catalog: Catalog, daysToAdd: number) => {
    setProcessingCatalogId(catalog.id);
    try {
      const currentPlan = catalog.settings?.plan || {
        plan_id: 'base',
        plan_name: 'Plan Base',
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true
      };

      const now = new Date();
      let baseTime = now.getTime();

      // If already active and has future expiration date, extend from current expiration
      if (currentPlan.expires_at) {
        const exp = new Date(currentPlan.expires_at).getTime();
        if (exp > now.getTime()) {
          baseTime = exp;
        }
      }

      const newExpires = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);

      const updatedPlan = {
        ...currentPlan,
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true,
        activated_at: currentPlan.activated_at || now.toISOString(),
        expires_at: newExpires.toISOString()
      };

      await dbService.updateCatalog(catalog.id, {
        settings: {
          ...catalog.settings,
          plan: updatedPlan
        }
      });

      toast.success(`Se han añadido +${daysToAdd} días al catálogo "${catalog.name}". Nuevo vencimiento: ${newExpires.toLocaleDateString('es-ES')}`);
      if (editingCatalog?.id === catalog.id) {
        setEditingCatalog(null);
      }
      onRefresh();
    } catch (error: any) {
      console.error('Error extending catalog time:', error);
      toast.error(error.message || 'Error al actualizar el tiempo del catálogo');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleSetExactDateToCatalog = async (catalog: Catalog, dateString: string) => {
    if (!dateString) {
      toast.error('Selecciona una fecha válida');
      return;
    }
    setProcessingCatalogId(catalog.id);
    try {
      const targetDate = new Date(`${dateString}T23:59:59.999Z`);
      const currentPlan = catalog.settings?.plan || {
        plan_id: 'base',
        plan_name: 'Plan Base',
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true
      };

      const updatedPlan = {
        ...currentPlan,
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true,
        expires_at: targetDate.toISOString()
      };

      await dbService.updateCatalog(catalog.id, {
        settings: {
          ...catalog.settings,
          plan: updatedPlan
        }
      });

      toast.success(`Vencimiento establecido para "${catalog.name}" al ${targetDate.toLocaleDateString('es-ES')}`);
      setEditingCatalog(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error setting expiration date:', error);
      toast.error(error.message || 'Error al fijar la fecha');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleChangeCatalogPlan = async (catalog: Catalog, planIdToApply: string) => {
    setProcessingCatalogId(catalog.id);
    try {
      const chosenPlan = plans.find(p => p.id === planIdToApply) || DEFAULT_PLANS.find(p => p.id === planIdToApply) || DEFAULT_PLANS[1];
      const now = new Date();

      let expiresAt: string | null = null;
      if (chosenPlan.duration_months > 0) {
        const expDate = new Date(now.getTime() + chosenPlan.duration_months * 30 * 24 * 60 * 60 * 1000);
        expiresAt = expDate.toISOString();
      }

      const updatedPlan = {
        plan_id: chosenPlan.id,
        plan_name: chosenPlan.name,
        plan_status: 'active' as const,
        max_products: chosenPlan.max_products,
        allow_carousel: chosenPlan.allow_carousel,
        activated_at: now.toISOString(),
        expires_at: expiresAt
      };

      await dbService.updateCatalog(catalog.id, {
        settings: {
          ...catalog.settings,
          plan: updatedPlan
        }
      });

      toast.success(`Plan de "${catalog.name}" cambiado a "${chosenPlan.name}".`);
      setEditingCatalog(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error changing plan:', error);
      toast.error(error.message || 'Error al cambiar de plan');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleMakePermanent = async (catalog: Catalog) => {
    setProcessingCatalogId(catalog.id);
    try {
      const updatedPlan = {
        plan_id: 'eternal',
        plan_name: 'Plan Eterno',
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true,
        expires_at: null
      };

      await dbService.updateCatalog(catalog.id, {
        settings: {
          ...catalog.settings,
          plan: updatedPlan
        }
      });

      toast.success(`Plan Eterno (De por Vida) asignado correctamente al catálogo "${catalog.name}".`);
      setEditingCatalog(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error setting permanent:', error);
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleMarkExpired = async (catalog: Catalog) => {
    if (!window.confirm(`¿Seguro que deseas desactivar/expirar el plan de "${catalog.name}"?`)) return;

    setProcessingCatalogId(catalog.id);
    try {
      const currentPlan = catalog.settings?.plan || {
        plan_id: 'free',
        plan_name: 'Plan Expirado',
        plan_status: 'expired' as const,
        max_products: 3,
        allow_carousel: false
      };

      const updatedPlan = {
        ...currentPlan,
        plan_status: 'expired' as const,
        max_products: 3,
        allow_carousel: false
      };

      await dbService.updateCatalog(catalog.id, {
        settings: {
          ...catalog.settings,
          plan: updatedPlan
        }
      });

      toast.success(`El catálogo "${catalog.name}" ha sido marcado como expirado.`);
      setEditingCatalog(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error marking expired:', error);
      toast.error(error.message || 'Error al marcar expirado');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleConfirmSoftDelete = async (catalog: Catalog) => {
    setProcessingCatalogId(catalog.id);
    try {
      const now = new Date().toISOString();
      const updatedSettings = {
        ...catalog.settings,
        is_deleted: true,
        deleted_at: now,
        deleted_by: 'superadmin'
      };
      await dbService.updateCatalog(catalog.id, {
        settings: updatedSettings
      });
      toast.success(`El catálogo "${catalog.name}" ha sido enviado a la sección de eliminados.`);
      setCatalogToDelete(null);
      onRefresh();
    } catch (error: any) {
      toast.error('Error al mover catálogo a eliminados');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleRestoreCatalog = async (catalog: Catalog) => {
    setProcessingCatalogId(catalog.id);
    try {
      const updatedSettings = {
        ...catalog.settings,
        is_deleted: false,
        deleted_at: null,
        deletion_reason: null,
        deleted_by: null
      };
      await dbService.updateCatalog(catalog.id, {
        settings: updatedSettings
      });
      toast.success(`Catálogo "${catalog.name}" restaurado correctamente.`);
      onRefresh();
    } catch (error: any) {
      toast.error('Error al restaurar el catálogo');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  const handleConfirmPermanentDelete = async (catalog: Catalog) => {
    setProcessingCatalogId(catalog.id);
    try {
      const success = await dbService.deleteCatalog(catalog.id);
      if (success) {
        toast.success(`Catálogo "${catalog.name}" eliminado definitivamente.`);
        setPermanentDeleteTarget(null);
        onRefresh();
      } else {
        toast.error('No se pudo eliminar el catálogo.');
      }
    } catch (error: any) {
      toast.error('Error al eliminar definitivamente');
    } finally {
      setProcessingCatalogId(null);
    }
  };

  // Separate active vs deleted catalogs
  const activeCatalogs = catalogs.filter(c => !(c.is_deleted || c.settings?.is_deleted));
  const deletedCatalogs = catalogs.filter(c => Boolean(c.is_deleted || c.settings?.is_deleted));

  // Filter active catalogs for approved list
  const filteredCatalogs = activeCatalogs.filter(c => {
    const matchesSearch = searchQuery === '' || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const plan = c.settings?.plan;
    const timeInfo = getTimeRemainingInfo(plan?.expires_at, plan?.plan_status);

    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return timeInfo.status === 'active';
    if (statusFilter === 'warning') return timeInfo.status === 'warning';
    if (statusFilter === 'expired') return timeInfo.status === 'expired';
    if (statusFilter === 'unlimited') return timeInfo.status === 'unlimited';

    return true;
  });

  return (
    <div className="space-y-12">
      {/* 1. Header & Global Save */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Configuración de Planes y Catálogos Aprobados</h3>
          <p className="text-xs text-gray-500">
            Ajusta los precios de los planes, tarjeta bancaria y gestiona el tiempo de uso de cada catálogo.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-md self-start sm:self-auto disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Guardar Precios de Planes</span>
        </button>
      </div>

      {/* 2. Bank Card Config Box */}
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

      {/* 3. Plans List Settings */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" /> Planes de Suscripción Configurables
            </h4>
            <p className="text-xs text-gray-500">Estos son los precios y condiciones que verán los usuarios al crear su catálogo.</p>
          </div>
          <button
            type="button"
            onClick={handleAddPlan}
            className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const isUnlimited = plan.max_products === null;
            return (
              <div key={plan.id || idx} className="bg-white border-2 border-gray-100 hover:border-orange-200 rounded-3xl p-5 shadow-sm space-y-4 relative transition-all">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-[11px] font-black rounded-full uppercase tracking-wider">
                    {plan.badge || 'Plan'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlan(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Nombre del Plan</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => handleUpdatePlan(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-sm font-bold text-gray-900 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Duración (Meses)</label>
                    <input
                      type="number"
                      min={0}
                      value={plan.duration_months}
                      onChange={(e) => handleUpdatePlan(idx, { duration_months: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Precio Total (CUP)</label>
                    <input
                      type="number"
                      min={0}
                      value={plan.total_price}
                      onChange={(e) => handleUpdatePlan(idx, { total_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border text-xs font-bold text-orange-600"
                    />
                  </div>
                </div>

                {/* Product Limit & Carousel Options */}
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-800">Límite de Productos Activos</span>
                      <p className="text-[10px] text-gray-500">
                        {isUnlimited ? 'Productos ilimitados' : `Límite: ${plan.max_products} activos`}
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
                    <span className="text-xs font-bold text-gray-800">Modificar Carrusel de Fotos</span>
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

      <hr className="border-gray-200 my-8" />

      {/* 4. SECCIÓN DE CATÁLOGOS APROBADOS Y TIEMPO DE USO */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-600" />
              Gestión de Catálogos Aprobados y Tiempo de Uso
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Consulta el plan actual de cada catálogo, el tiempo que le queda de uso y dale más tiempo o cámbiale el plan fácilmente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar catálogo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-100 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500 w-52 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({catalogs.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Con Tiempo Activo
          </button>
          <button
            onClick={() => setStatusFilter('warning')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'warning' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Por Vencer (≤7 días)
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'expired' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Expirados
          </button>
          <button
            onClick={() => setStatusFilter('unlimited')}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'unlimited' ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Permanentes / Gratuitos
          </button>
        </div>

        {/* List / Grid of Catalogs */}
        {filteredCatalogs.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 space-y-3">
            <Clock className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-600 text-sm">No se encontraron catálogos con este criterio.</p>
            <p className="text-xs text-gray-400">Intenta cambiar el filtro o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCatalogs.map((cat) => {
              const plan = cat.settings?.plan;
              const timeInfo = getTimeRemainingInfo(plan?.expires_at, plan?.plan_status);
              const logoUrl = getImageUrl(cat.settings?.logo);
              const isProcessing = processingCatalogId === cat.id;

              return (
                <div 
                  key={cat.id} 
                  className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Logo, Name & Link */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt={cat.name} className="w-12 h-12 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 font-black text-lg flex items-center justify-center">
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-900 text-base leading-tight flex items-center gap-1.5">
                            {cat.name}
                            <a 
                              href={`/${cat.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-gray-400 hover:text-orange-600 inline-flex items-center"
                              title="Ver catálogo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </h4>
                          <span className="text-xs text-gray-400 font-mono">/{cat.slug}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-black rounded-full">
                          {plan?.plan_name || 'Plan Gratuito'}
                        </span>
                      </div>
                    </div>

                    {/* Time remaining info badge */}
                    <div className={`mt-3 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${timeInfo.color}`}>
                      <div className="flex items-center gap-2">
                        {timeInfo.status === 'expired' ? (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        ) : timeInfo.status === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : timeInfo.status === 'unlimited' ? (
                          <Infinity className="w-4 h-4 text-purple-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span>{timeInfo.label}</span>
                      </div>

                      {plan?.activated_at && (
                        <span className="text-[10px] text-gray-500 font-normal shrink-0">
                          Desde: {new Date(plan.activated_at).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-500 mr-1 hidden sm:inline">Añadir tiempo rápido:</span>
                      <button
                        onClick={() => handleAddDaysToCatalog(cat, 30)}
                        disabled={isProcessing}
                        className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs rounded-xl transition-colors disabled:opacity-50"
                        title="Añadir 30 días (+1 Mes)"
                      >
                        +1 Mes
                      </button>
                      <button
                        onClick={() => handleAddDaysToCatalog(cat, 90)}
                        disabled={isProcessing}
                        className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs rounded-xl transition-colors disabled:opacity-50"
                        title="Añadir 90 días (+3 Meses)"
                      >
                        +3 Meses
                      </button>
                      <button
                        onClick={() => handleAddDaysToCatalog(cat, 365)}
                        disabled={isProcessing}
                        className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs rounded-xl transition-colors disabled:opacity-50"
                        title="Añadir 365 días (+1 Año)"
                      >
                        +1 Año
                      </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => {
                          setEditingCatalog(cat);
                          setSelectedPlanId(cat.settings?.plan?.plan_id || 'base');
                          if (cat.settings?.plan?.expires_at) {
                            setCustomTargetDate(new Date(cat.settings.plan.expires_at).toISOString().split('T')[0]);
                          } else {
                            const monthFromNow = new Date(Date.now() + 30 * 24 * 3600 * 1000);
                            setCustomTargetDate(monthFromNow.toISOString().split('T')[0]);
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Gestionar Plan / Tiempo</span>
                      </button>

                      <button
                        onClick={() => setCatalogToDelete(cat)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all border border-red-200 disabled:opacity-50"
                        title="Eliminar este catálogo y moverlo a eliminados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. SECCIÓN DE CATÁLOGOS ELIMINADOS */}
      <div className="pt-8 border-t-2 border-red-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>Catálogos Eliminados</span>
                {deletedCatalogs.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                    {deletedCatalogs.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Catálogos desactivados que están ocultos del público y bloqueados para administradores. Puedes restaurarlos ("Cancelar") o borrarlos permanentemente ("Eliminar").
              </p>
            </div>
          </div>
        </div>

        {deletedCatalogs.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Trash2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-600">No hay catálogos eliminados actualmente</p>
            <p className="text-xs text-gray-400 mt-1">Los catálogos que el administrador o el súperadministrador eliminen aparecerán aquí con opciones de restauración o eliminación total.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deletedCatalogs.map(cat => {
              const isProcessing = processingCatalogId === cat.id;
              const deletedAt = cat.deleted_at || cat.settings?.deleted_at;
              const reason = cat.deletion_reason || cat.settings?.deletion_reason;
              const deletedBy = cat.deleted_by || cat.settings?.deleted_by || 'Administrador';

              return (
                <div 
                  key={cat.id} 
                  className="bg-red-50/40 border-2 border-red-200 rounded-3xl p-5 space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-red-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {cat.settings?.logo ? (
                          <img 
                            src={getImageUrl(cat.settings.logo)} 
                            alt={cat.name} 
                            className="w-full h-full object-cover grayscale opacity-80" 
                          />
                        ) : (
                          <span className="font-bold text-red-400 text-lg">
                            {cat.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base text-gray-900 truncate">{cat.name}</h4>
                          <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-[10px] rounded-full uppercase shrink-0">
                            Eliminado
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">/{cat.slug}</p>
                      </div>
                    </div>
                  </div>

                  {/* Deletion details */}
                  <div className="bg-white/80 rounded-2xl p-3.5 border border-red-100 text-xs space-y-2">
                    <div className="flex items-center justify-between text-gray-600 flex-wrap gap-1">
                      <span><strong>Desactivado por:</strong> {deletedBy}</span>
                      {deletedAt && (
                        <span className="text-gray-400">
                          {new Date(deletedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {reason && (
                      <div className="p-2.5 bg-red-50 rounded-xl text-red-900 border border-red-100 text-xs">
                        <span className="font-bold block text-[11px] uppercase tracking-wide text-red-700 mb-0.5">Motivo expuesto:</span>
                        <p className="italic">"{reason}"</p>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                      <EyeOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Oculto en pantalla principal y acceso de administración bloqueado.</span>
                    </p>
                  </div>

                  {/* Action buttons: Cancelar (Restaurar) vs Eliminar (Definitivo) */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => handleRestoreCatalog(cat)}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 px-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="Cancelar la eliminación y restaurar este catálogo a su estado normal"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Cancelar (Restaurar)</span>
                    </button>

                    <button
                      onClick={() => setPermanentDeleteTarget(cat)}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-red-200 disabled:opacity-50"
                      title="Eliminar de forma definitiva de la base de datos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Definitivamente</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE MOVER A ELIMINADOS */}
      {catalogToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-red-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">¿Eliminar catálogo?</h3>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Mover a Eliminados</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              ¿Estás seguro de que deseas eliminar el catálogo <strong>"{catalogToDelete.name}"</strong>? Se moverá a la sección de catálogos eliminados, quedará oculto en la pantalla principal y no se podrá acceder a su administración.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCatalogToDelete(null)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSoftDelete(catalogToDelete)}
                disabled={processingCatalogId === catalogToDelete.id}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-md shadow-red-200 text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PERMANENTE */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">¿Eliminar Definitivamente?</h3>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Acción Irreversible</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 leading-relaxed">
              <strong>Atención Peligro:</strong> Estás a punto de borrar <strong>definitivamente</strong> el catálogo <strong>"{permanentDeleteTarget.name}"</strong> junto con todos sus productos, tipos y registros asociados en la base de datos. Esta operación <strong>no se puede deshacer</strong>.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPermanentDeleteTarget(null)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition text-sm"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPermanentDelete(permanentDeleteTarget)}
                disabled={processingCatalogId === permanentDeleteTarget.id}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-300 text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL PARA CAMBIAR PLAN O FECHA ESPECÍFICA */}
      {editingCatalog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Gestionar Tiempo de Uso
                </h3>
                <p className="text-xs text-gray-500">Catálogo: <strong className="text-gray-900">{editingCatalog.name}</strong> (/{editingCatalog.slug})</p>
              </div>
              <button 
                onClick={() => setEditingCatalog(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Current plan box */}
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-xs space-y-1">
              <p className="font-bold text-orange-900">Plan Actual: {editingCatalog.settings?.plan?.plan_name || 'Plan Gratuito'}</p>
              <p className="text-orange-700">
                Estado: {getTimeRemainingInfo(editingCatalog.settings?.plan?.expires_at, editingCatalog.settings?.plan?.plan_status).label}
              </p>
            </div>

            {/* Option 1: Add Custom Days */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">1. Añadir número de días:</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min={1} 
                  value={customDaysInput} 
                  onChange={(e) => setCustomDaysInput(Number(e.target.value))}
                  className="w-32 px-3 py-2 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-orange-500" 
                />
                <button
                  onClick={() => handleAddDaysToCatalog(editingCatalog, customDaysInput)}
                  disabled={processingCatalogId === editingCatalog.id}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  + Añadir {customDaysInput} Días
                </button>
              </div>
            </div>

            {/* Option 2: Set Exact Date */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">2. Fijar fecha exacta de vencimiento:</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={customTargetDate} 
                  onChange={(e) => setCustomTargetDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-orange-500" 
                />
                <button
                  onClick={() => handleSetExactDateToCatalog(editingCatalog, customTargetDate)}
                  disabled={processingCatalogId === editingCatalog.id}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Establecer Fecha
                </button>
              </div>
            </div>

            {/* Option 3: Change Plan */}
            <div className="space-y-2 pt-2 border-t">
              <label className="block text-xs font-bold text-gray-700">3. Cambiar Plan Suscrito:</label>
              <div className="flex gap-2">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-orange-500"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.duration_months === 0 ? 'Permanente' : `${p.duration_months} meses`}) - {p.total_price} CUP
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleChangeCatalogPlan(editingCatalog, selectedPlanId)}
                  disabled={processingCatalogId === editingCatalog.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Aplicar Plan
                </button>
              </div>
            </div>

            {/* Other actions */}
            <div className="pt-2 border-t flex items-center justify-between">
              <button
                onClick={() => handleMakePermanent(editingCatalog)}
                disabled={processingCatalogId === editingCatalog.id}
                className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Infinity className="w-3.5 h-3.5" /> Asignar Plan Eterno (De por Vida)
              </button>

              <button
                onClick={() => handleMarkExpired(editingCatalog)}
                disabled={processingCatalogId === editingCatalog.id}
                className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Marcar Expirado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

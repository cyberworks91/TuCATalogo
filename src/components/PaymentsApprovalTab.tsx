import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Clock, Eye, ShieldCheck, 
  ExternalLink, Sparkles, Image as ImageIcon, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { Catalog, User } from '../types';
import { dbService } from '../lib/supabase-service';
import { getImageUrl } from '../lib/utils';

interface PaymentsApprovalTabProps {
  catalogs: Catalog[];
  users: User[];
  onRefresh: () => void;
}

export const PaymentsApprovalTab: React.FC<PaymentsApprovalTabProps> = ({
  catalogs,
  users,
  onRefresh
}) => {
  const [filter, setFilter] = useState<'pending' | 'active' | 'rejected' | 'all'>('pending');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter catalogs with plan info
  const catalogsWithPlans = catalogs.filter(c => c.settings?.plan);

  const filteredCatalogs = catalogsWithPlans.filter(c => {
    const status = c.settings?.plan?.plan_status || 'pending';
    if (filter === 'all') return true;
    return status === filter;
  });

  const pendingCount = catalogsWithPlans.filter(c => c.settings?.plan?.plan_status === 'pending').length;

  const handleApprovePayment = async (catalog: Catalog) => {
    setProcessingId(catalog.id);
    try {
      const now = new Date();
      const plan = catalog.settings.plan;
      let durationMonths = 1;

      if (plan?.plan_id === '3months' || plan?.plan_name?.includes('3 Meses')) durationMonths = 3;
      else if (plan?.plan_id === '6months' || plan?.plan_name?.includes('6 Meses')) durationMonths = 6;
      else if (plan?.plan_id === '1year' || plan?.plan_name?.includes('1 Año') || plan?.plan_name?.includes('Año')) durationMonths = 12;

      const expiresDate = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

      const updatedPlan = {
        ...catalog.settings.plan!,
        plan_status: 'active' as const,
        max_products: null,
        allow_carousel: true,
        activated_at: now.toISOString(),
        expires_at: expiresDate.toISOString()
      };

      const updatedSettings = {
        ...catalog.settings,
        plan: updatedPlan
      };

      await dbService.updateCatalog(catalog.id, {
        settings: updatedSettings
      });

      toast.success(`¡Pago aprobado exitosamente! Se han activado todos los permisos para "${catalog.name}".`);
      onRefresh();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error(error.message || 'Error al aprobar el pago');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async (catalog: Catalog) => {
    const reason = window.prompt('Ingrese el motivo del rechazo (opcional):', 'Comprobante no válido o transferencia no recibida');
    if (reason === null) return; // User cancelled

    setProcessingId(catalog.id);
    try {
      const updatedPlan = {
        ...catalog.settings.plan!,
        plan_status: 'rejected' as const,
        rejection_reason: reason
      };

      const updatedSettings = {
        ...catalog.settings,
        plan: updatedPlan
      };

      await dbService.updateCatalog(catalog.id, {
        settings: updatedSettings
      });

      toast.success(`Pago del catálogo "${catalog.name}" ha sido marcado como rechazado.`);
      onRefresh();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(error.message || 'Error al rechazar el pago');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Aprobar Pagos de Catálogos
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-white font-black text-xs rounded-full">
                {pendingCount} pendientes
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500">
            Revisa los comprobantes de transferencia de pago para activar los planes solicitados.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'pending' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pendientes ({catalogsWithPlans.filter(c => c.settings?.plan?.plan_status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'active' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Aprobados ({catalogsWithPlans.filter(c => c.settings?.plan?.plan_status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'rejected' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rechazados ({catalogsWithPlans.filter(c => c.settings?.plan?.plan_status === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos ({catalogsWithPlans.length})
          </button>
        </div>
      </div>

      {filteredCatalogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="font-bold text-gray-700">No hay pagos {filter === 'pending' ? 'pendientes por aprobar' : 'registrados'}</h4>
          <p className="text-xs text-gray-400 mt-1">
            Los nuevos pagos solicitados por los usuarios aparecerán aquí para ser verificados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCatalogs.map(catalog => {
            const plan = catalog.settings.plan!;
            const owner = users.find(u => u.catalog_id === catalog.id || u.id === catalog.id);
            const status = plan.plan_status || 'pending';
            const receipt = plan.payment_receipt_url;

            return (
              <div
                key={catalog.id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between shadow-sm ${
                  status === 'pending' 
                    ? 'border-amber-300 ring-2 ring-amber-500/10' 
                    : status === 'active' 
                    ? 'border-green-200' 
                    : 'border-red-200'
                }`}
              >
                <div>
                  {/* Status & Plan Title */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Catálogo / {catalog.slug}
                      </span>
                      <h4 className="text-lg font-black text-gray-900">{catalog.name}</h4>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        status === 'pending' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : status === 'active' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {status === 'pending' && '⏳ Pendiente (1h-12h)'}
                        {status === 'active' && '✓ Aprobado'}
                        {status === 'rejected' && '✕ Rechazado'}
                      </span>
                    </div>
                  </div>

                  {/* Plan Details Box */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Plan Solicitado:</span>
                      <strong className="text-gray-900 font-bold">{plan.plan_name}</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Monto a Verificar:</span>
                      <strong className="text-orange-600 font-black text-sm">
                        ${plan.payment_amount?.toLocaleString() || '0'} CUP
                      </strong>
                    </div>

                    {plan.payment_submitted_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Fecha de Envío:</span>
                        <span className="text-gray-700 font-medium">
                          {new Date(plan.payment_submitted_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {owner && (
                      <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Usuario / Owner:</span>
                        <span className="text-gray-900 font-bold">{owner.full_name || owner.username} ({owner.phone || owner.email})</span>
                      </div>
                    )}

                    {plan.rejection_reason && (
                      <div className="pt-2 border-t border-red-200 text-red-700 font-medium">
                        Motivo de rechazo: {plan.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Receipt Screenshot Section */}
                  {receipt ? (
                    <div className="mb-4">
                      <span className="text-xs font-bold text-gray-700 block mb-2">Captura del Comprobante:</span>
                      <div 
                        onClick={() => setSelectedReceiptUrl(getImageUrl(receipt, 'receipts'))}
                        className="relative group cursor-pointer bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden h-36 flex items-center justify-center hover:opacity-95 transition-all"
                      >
                        <img 
                          src={getImageUrl(receipt, 'receipts')} 
                          alt="Comprobante" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                          <Eye className="w-5 h-5" />
                          <span>Ver captura a tamaño completo</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium mb-4">
                      Sin captura adjunta (Plan gratuito o directo)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {status !== 'active' && (
                    <button
                      onClick={() => handleApprovePayment(catalog)}
                      disabled={processingId === catalog.id}
                      className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-xl font-bold text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Aprobar Pago</span>
                    </button>
                  )}

                  {status !== 'rejected' && (
                    <button
                      onClick={() => handleRejectPayment(catalog)}
                      disabled={processingId === catalog.id}
                      className="py-2.5 px-4 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rechazar</span>
                    </button>
                  )}

                  <a
                    href={`/${catalog.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center"
                    title="Ver catálogo público"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlarge Receipt Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 overflow-hidden relative shadow-2xl">
            <button
              onClick={() => setSelectedReceiptUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-colors z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h4 className="font-bold text-gray-900 p-2 mb-2">Comprobante de Pago</h4>
            <div className="max-h-[75vh] overflow-y-auto rounded-2xl border">
              <img src={selectedReceiptUrl} alt="Comprobante completo" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

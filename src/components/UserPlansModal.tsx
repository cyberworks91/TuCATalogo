import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Sparkles, CheckCircle2, Clock, AlertTriangle, 
  Plus, CreditCard, RefreshCw, ChevronRight, ShieldCheck,
  Building2, Upload, ArrowLeft, Copy, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Catalog, PlanConfig, GlobalSettings, User } from '../types';
import { dbService, storageService } from '../lib/supabase-service';

interface UserPlansModalProps {
  user: User;
  onClose: () => void;
}

export const UserPlansModal: React.FC<UserPlansModalProps> = ({ user, onClose }) => {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Renewal state inside modal
  const [renewingCatalog, setRenewingCatalog] = useState<Catalog | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const settings = await dbService.getGlobalSettings();
        setGlobalSettings(settings);

        const allCatalogs = await dbService.getCatalogs();
        // Filter catalogs belonging to this user
        const userCats = allCatalogs.filter(c => 
          c.id === user.catalog_id || 
          c.owner_id === user.id ||
          c.user_id === user.id
        );

        // If user is superadmin or admin and has a assigned catalog
        if (userCats.length === 0 && user.catalog_id) {
          const match = allCatalogs.find(c => c.id === user.catalog_id);
          if (match) userCats.push(match);
        }

        setCatalogs(userCats);
      } catch (err) {
        console.error('Error loading user plans:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const plansList = globalSettings?.plans || [];
  const cardTarget = globalSettings?.bank_card_number || '9225 1234 5678 9012';
  const cardOwner = globalSettings?.bank_card_owner || 'TuCATalogo Pagos (Transfermóvil/BM)';

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardTarget.replace(/\s+/g, ''));
    setCopiedCard(true);
    toast.success('¡Número de tarjeta copiado al portapapeles!');
    setTimeout(() => setCopiedCard(false), 3000);
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingCatalog || !selectedPlan) return;

    if (!selectedPlan.is_free && selectedPlan.total_price > 0 && !receiptFile) {
      toast.error('Por favor sube la captura del comprobante de pago');
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        const fileName = `renewal-${renewingCatalog.id}-${Date.now()}-${receiptFile.name}`;
        receiptUrl = await storageService.uploadFile('payments', receiptFile, fileName);
      }

      await dbService.updateCatalog(renewingCatalog.id, {
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        plan_price: selectedPlan.total_price,
        plan_status: selectedPlan.is_free ? 'active' : 'pending',
        payment_receipt_url: receiptUrl || renewingCatalog.payment_receipt_url,
        payment_submitted_at: new Date().toISOString()
      });

      toast.success(
        selectedPlan.is_free 
          ? 'Plan actualizado a Gratuito' 
          : '¡Solicitud enviada! Tu comprobante será revisado por un administrador de 1h a 12h.'
      );

      setRenewingCatalog(null);
      setSelectedPlan(null);
      setReceiptFile(null);
      setReceiptPreview('');
      
      // Reload catalogs
      const updated = await dbService.getCatalogs();
      setCatalogs(updated.filter(c => c.id === user.catalog_id || c.owner_id === user.id || c.user_id === user.id));
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUsedFreePlan = catalogs.some(c => c.plan_id === 'free' || c.plan_name?.toLowerCase().includes('gratuito'));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
      >
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Mis Planes y Catálogos</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {user.full_name || user.username} ({user.email || 'Usuario Registrado'})
            </p>
          </div>
        </div>

        {/* Renewal Form View */}
        {renewingCatalog ? (
          <div className="space-y-6">
            <button 
              onClick={() => { setRenewingCatalog(null); setSelectedPlan(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a mis catálogos
            </button>

            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
              <h3 className="font-bold text-orange-950 text-sm">
                Aumentar Tiempo / Cambiar Plan para: <span className="text-orange-600">{renewingCatalog.name}</span>
              </h3>
              <p className="text-xs text-orange-800 mt-1">
                Selecciona un nuevo plan para renovar o ampliar el tiempo de funcionamiento de tu catálogo.
              </p>
            </div>

            {/* Plan selection for renewal */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Selecciona un Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plansList.map(plan => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const isFree = plan.is_free || plan.total_price === 0;
                  const isFreeDisabled = isFree && hasUsedFreePlan && renewingCatalog.plan_id !== 'free';

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      disabled={isFreeDisabled}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                        isSelected 
                          ? 'border-orange-600 bg-orange-50/50 ring-2 ring-orange-500/20' 
                          : isFreeDisabled 
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-orange-600 text-white font-black text-[10px] rounded-full">
                          {plan.badge}
                        </span>
                      )}
                      <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-orange-600 font-extrabold mt-1">
                        {isFree ? 'Gratis' : `$${plan.total_price.toLocaleString()} CUP`}
                      </p>
                      {isFreeDisabled && (
                        <p className="text-[10px] text-amber-700 font-bold mt-1">
                          (Plan gratuito ya utilizado)
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment step if selected paid plan */}
            {selectedPlan && !selectedPlan.is_free && selectedPlan.total_price > 0 && (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-600" />
                  Datos de Pago por Transferencia
                </h4>

                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Número de Tarjeta (Transfermóvil / EnZona / BM)</p>
                      <p className="font-mono font-black text-gray-900 text-base">{cardTarget}</p>
                      <p className="text-xs text-gray-500 font-medium">{cardOwner}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCard}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCard ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="pt-2 border-t text-xs font-bold text-orange-600 flex justify-between">
                    <span>Monto a Transferir:</span>
                    <span className="font-black text-sm">${selectedPlan.total_price.toLocaleString()} CUP</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Adjuntar Comprobante de Pago *</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:border-orange-500 transition-colors bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      id="receipt-upload"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer block">
                      {receiptPreview ? (
                        <div className="space-y-2">
                          <img src={receiptPreview} alt="Comprobante" className="h-32 mx-auto rounded-xl object-contain border" />
                          <p className="text-xs text-orange-600 font-bold">Cambiar imagen</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-8 h-8 mx-auto text-gray-400" />
                          <p className="text-xs font-bold text-gray-700">Toca para subir captura del pago</p>
                          <p className="text-[10px] text-gray-400">JPG, PNG o WEBP</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitRenewal}
                disabled={isSubmitting || !selectedPlan}
                className="flex-1 bg-orange-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar y Solicitar Renovación'}
              </button>
              <button
                type="button"
                onClick={() => setRenewingCatalog(null)}
                className="px-5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* Normal List View */
          <div className="space-y-6 flex-1">
            {/* Catalogs section */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                Tus Catálogos Registrados ({catalogs.length})
              </h3>

              {loading ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
                  <p className="text-xs font-bold">Cargando tus planes...</p>
                </div>
              ) : catalogs.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 p-6 rounded-2xl text-center space-y-3">
                  <p className="text-sm text-gray-600 font-medium">Aún no has registrado ningún catálogo.</p>
                  <p className="text-xs text-gray-400">Crea tu primer catálogo digital en sencillos pasos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {catalogs.map(cat => {
                    const planObj = cat.settings?.plan;
                    const status = cat.plan_status || planObj?.plan_status || 'active';
                    const isPending = status === 'pending';
                    const isRejected = status === 'rejected';
                    const isExpired = status === 'expired';
                    const planName = cat.plan_name || planObj?.plan_name || 'Plan Eterno';
                    const expiresAt = planObj?.expires_at;

                    return (
                      <div key={cat.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm hover:border-orange-200 transition-all space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-gray-900 text-base">{cat.name}</h4>
                              <a 
                                href={`/${cat.slug}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-orange-600 hover:text-orange-700 p-1"
                                title="Ver catálogo publicado"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <p className="text-xs text-gray-400 font-semibold">URL: /{cat.slug}</p>
                          </div>

                          {/* Status badge */}
                          <div>
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-bold text-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente de Aprobación
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Rechazado
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Expirado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                {expiresAt ? 'Plan Activo' : 'Plan Eterno / Aprobado'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Plan details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400 font-semibold">Plan Adquirido: </span>
                            <span className="font-bold text-gray-800">{planName}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-semibold">Duración / Vigencia: </span>
                            <span className="font-bold text-purple-700">
                              {expiresAt ? `Vence: ${new Date(expiresAt).toLocaleDateString('es-ES')}` : 'Plan Eterno (De por Vida)'}
                            </span>
                          </div>
                        </div>

                        {isPending && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 font-medium">
                            <p className="font-bold">Comprobante en revisión:</p>
                            <p className="mt-0.5 text-amber-800">
                              Tu pago está siendo verificado por el administrador. El plazo promedio de aprobación es de 1h a 12h.
                            </p>
                          </div>
                        )}

                        {/* Action buttons for catalog */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRenewingCatalog(cat);
                              setSelectedPlan(plansList[0] || null);
                            }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Aumentar Tiempo / Renovar Plan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/${cat.slug}/admin`);
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                          >
                            Panel de Administración
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* General Free Plan Notice */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-xs text-orange-950 space-y-1">
              <p className="font-black text-orange-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-600" />
                Política de Planes Gratuitos:
              </p>
              <p className="text-orange-800 font-medium leading-relaxed">
                Cada usuario registrado tiene derecho a **un (1) único plan gratuito** para toda la vida. Si deseas crear catálogos adicionales, deberás seleccionar un plan de suscripción de pago (1 Mes, 3 Meses, 6 Meses o 1 Año).
              </p>
            </div>

            {/* Create Another Catalog Button */}
            <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/crear-catalogo');
                }}
                className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Otro Catálogo con Otro Plan</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-2xl font-bold text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

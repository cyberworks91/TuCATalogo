import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Check, Copy, Upload, Clock, Sparkles, ShieldCheck, 
  CreditCard, ArrowLeft, CheckCircle2, Building, Palette, 
  User as UserIcon, Phone, Mail, Lock, Cat, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PlanConfig, GlobalSettings } from '../types';
import { dbService, storageService } from '../lib/supabase-service';
import { useAuthStore } from '../store';
import { Navbar, Footer } from '../App';

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
    description: 'Ideal para probar. Hasta 3 productos activos únicamente.'
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
    description: '1,000 CUP / mes. Productos ilimitados y carrusel de imágenes.'
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
    description: '800 CUP por mes (Total 4,800 CUP). Excelente balance y ahorro.'
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
    description: '700 CUP por mes (Total 8,400 CUP). Máximo ahorro anual ilimitado.'
  }
];

export const CreateCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig>(DEFAULT_PLANS[0]);
  
  // Payment step state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  // Catalog data step state
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [bgColor, setBgColor] = useState('#f9fafb');
  const [windowColor, setWindowColor] = useState('#ffffff');
  const [topBarColor, setTopBarColor] = useState('#ea580c');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Account creation state (if not logged in)
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dbService.getGlobalSettings().then(settings => {
      if (settings) {
        setGlobalSettings(settings);
        if (settings.plans && settings.plans.length > 0) {
          setPlans(settings.plans);
          setSelectedPlan(settings.plans[0]);
        }
      }
    }).catch(err => console.error('Error fetching settings:', err));
  }, []);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleProceedFromPlan = (plan: PlanConfig) => {
    setSelectedPlan(plan);
    if (plan.is_free || plan.total_price === 0) {
      setStep(3); // Skip payment step for free plan
    } else {
      setStep(2); // Go to payment transfer step
    }
  };

  const handleProceedFromPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile && !receiptPreview) {
      toast.error('Por favor sube la captura de la transferencia de pago');
      return;
    }
    setStep(3);
  };

  const handleSubmitCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre de tu negocio/catálogo');
      return;
    }

    const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!cleanSlug) {
      toast.error('Ingresa un slug válido para tu URL');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Ensure user is logged in or create account
      let activeUser = user;
      if (!activeUser) {
        if (!authForm.username || !authForm.email || !authForm.password) {
          toast.error('Por favor completa los datos de tu usuario para crear tu cuenta');
          setIsSubmitting(false);
          return;
        }

        try {
          const registered = await dbService.registerUser({
            username: authForm.username,
            email: authForm.email,
            password: authForm.password,
            full_name: authForm.full_name || authForm.username,
            phone: authForm.phone,
            role: 'admin'
          });
          setUser(registered);
          activeUser = registered;
        } catch (authErr: any) {
          toast.error(authErr.message || 'Error al crear usuario');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Upload Logo if selected
      let logoUrl: string | null = null;
      if (logoFile) {
        try {
          logoUrl = await storageService.uploadFile('logos', logoFile, `logos/${Date.now()}_logo.png`);
        } catch (imgErr) {
          console.warn('Error uploading logo:', imgErr);
        }
      }

      // 3. Upload Receipt Screenshot if paid plan
      let receiptUrl: string | undefined = undefined;
      if (!selectedPlan.is_free && receiptFile) {
        try {
          receiptUrl = await storageService.uploadFile('receipts', receiptFile, `receipts/${Date.now()}_receipt.png`);
        } catch (recErr) {
          console.warn('Error uploading receipt:', recErr);
        }
      }

      // 4. Construct Catalog with Plan Info
      const catalogSettings = {
        bg_color: bgColor,
        window_color: windowColor,
        text_color: '#1f2937',
        top_bar_color: topBarColor,
        top_bar_text_color: '#ffffff',
        logo: logoUrl,
        plan: {
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          plan_status: selectedPlan.is_free ? ('active' as const) : ('pending' as const),
          max_products: selectedPlan.is_free ? 3 : null,
          allow_carousel: selectedPlan.is_free ? false : true,
          payment_amount: selectedPlan.total_price,
          payment_receipt_url: receiptUrl || receiptPreview || undefined,
          payment_submitted_at: new Date().toISOString(),
          bank_card: cardTarget
        }
      };

      const newCat = await dbService.createCatalog({
        name: name.trim(),
        slug: cleanSlug,
        exchange_rate: 320,
        settings: catalogSettings
      });

      // Update user with catalog_id and role
      if (activeUser) {
        await dbService.updateUser(activeUser.id, {
          catalog_id: newCat.id,
          role: activeUser.role === 'superadmin' ? 'superadmin' : 'admin'
        });
        setUser({
          ...activeUser,
          catalog_id: newCat.id,
          role: activeUser.role === 'superadmin' ? 'superadmin' : 'admin'
        });
      }

      toast.success(
        selectedPlan.is_free 
          ? '¡Tu catálogo ha sido creado con éxito!' 
          : '¡Catálogo registrado! Tu comprobante será aprobado de 1h a 12h.'
      );

      navigate(`/${newCat.slug}`);
    } catch (error: any) {
      console.error('Error creating catalog:', error);
      toast.error(error.message || 'Error al crear el catálogo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs sm:text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Crea Tu Propio Catálogo Digital
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
            Elige el plan perfecto para tu negocio
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Comienza gratis o activa un plan ilimitado para vender todos tus productos online sin comisiones.
          </p>
        </div>

        {/* Wizard Step Navigation */}
        <div className="flex items-center justify-center mb-10 max-w-xl mx-auto">
          <div className="flex items-center w-full">
            <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${step >= 1 ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <span className="text-xs mt-1.5 hidden sm:inline">Elegir Plan</span>
            </div>
            
            <div className={`h-1 flex-1 transition-colors ${step >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`} />

            <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${step >= 2 ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <span className="text-xs mt-1.5 hidden sm:inline">Pago / Comprobante</span>
            </div>

            <div className={`h-1 flex-1 transition-colors ${step >= 3 ? 'bg-orange-600' : 'bg-gray-200'}`} />

            <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${step >= 3 ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                3
              </div>
              <span className="text-xs mt-1.5 hidden sm:inline">Datos de Catálogo</span>
            </div>
          </div>
        </div>

        {/* STEP 1: PLAN SELECTION */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isFree = plan.is_free || plan.total_price === 0;
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-sm hover:shadow-xl ${
                      selectedPlan.id === plan.id 
                        ? 'border-orange-600 ring-2 ring-orange-500/20' 
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs rounded-full shadow-sm">
                        {plan.badge}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-xs text-gray-500 mb-4 min-h-[32px]">{plan.description}</p>

                      <div className="mb-6 pb-6 border-b border-gray-100">
                        {isFree ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-gray-900">$0</span>
                            <span className="text-sm font-semibold text-gray-500">CUP / permanente</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-black text-orange-600">${plan.price_per_month}</span>
                              <span className="text-sm font-semibold text-gray-500">CUP / mes</span>
                            </div>
                            {plan.duration_months > 1 && (
                              <p className="text-xs font-bold text-gray-400 mt-1">
                                Total a pagar: ${plan.total_price.toLocaleString()} CUP por {plan.duration_months} meses
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-3 mb-6 text-sm">
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isFree ? 'text-orange-500' : 'text-green-500'}`} />
                          <span className="text-gray-700 font-medium">
                            {plan.max_products ? `${plan.max_products} productos activos únicamente` : 'Productos ilimitados sin tope'}
                          </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          {plan.allow_carousel ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          )}
                          <span className={plan.allow_carousel ? "text-gray-700 font-medium" : "text-gray-400 line-through"}>
                            {plan.allow_carousel ? 'Modificar fotos del carrusel' : 'No permite modificar fotos del carrusel'}
                          </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">URL de catálogo personalizado</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">Gestión de pedidos por WhatsApp</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => handleProceedFromPlan(plan)}
                      className={`w-full py-3.5 px-6 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                        isFree 
                          ? 'bg-gray-900 text-white hover:bg-black' 
                          : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                      }`}
                    >
                      <span>{isFree ? 'Elegir Plan Gratuito' : `Seleccionar ${plan.name}`}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT & SCREENSHOT UPLOAD */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-fadeIn">
            <button 
              onClick={() => setStep(1)} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Cambiar plan elegido
            </button>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <CreditCard className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-orange-950 text-sm">Plan Seleccionado: {selectedPlan.name}</h4>
                <p className="text-xs text-orange-800 mt-0.5">
                  Monto a transferir: <strong className="text-orange-950 text-sm font-black">${selectedPlan.total_price.toLocaleString()} CUP</strong>
                </p>
              </div>
            </div>

            {/* Bank Card Copy Box */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
                <CreditCard className="w-48 h-48 text-white" />
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Tarjeta de Transferencia</span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-sm text-orange-300">
                  Transfermóvil / BM
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Número de Tarjeta:</p>
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="font-mono text-lg sm:text-2xl font-black tracking-wider text-orange-400">
                    {cardTarget}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      copiedCard ? 'bg-green-600 text-white' : 'bg-orange-600 text-white hover:bg-orange-500'
                    }`}
                  >
                    {copiedCard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCard ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Titular: <strong className="text-white">{cardOwner}</strong>
              </p>
            </div>

            {/* Upload Receipt Form */}
            <form onSubmit={handleProceedFromPayment} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Subir captura de la transferencia de pago *
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Toma o adjunta una captura de pantalla del comprobante de Transfermóvil, EnZona o tu banco.
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors bg-gray-50/50">
                  {receiptPreview ? (
                    <div className="space-y-4">
                      <img 
                        src={receiptPreview} 
                        alt="Comprobante" 
                        className="max-h-64 mx-auto rounded-xl object-contain border shadow-sm"
                      />
                      <div className="flex justify-center gap-3">
                        <label className="cursor-pointer px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs transition-colors">
                          Cambiar captura
                          <input type="file" accept="image/*" onChange={handleReceiptChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-6">
                      <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-3">
                        <Upload className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-gray-800 text-sm mb-1">
                        Haz clic aquí para seleccionar la captura
                      </span>
                      <span className="text-xs text-gray-400">Archivos JPG, PNG o WEBP</span>
                      <input type="file" accept="image/*" required onChange={handleReceiptChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-200 flex items-center justify-center gap-2 text-base"
                >
                  <span>Continuar a datos del catálogo</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: CATALOG & USER DETAILS FORM */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-fadeIn">
            <button 
              onClick={() => setStep(selectedPlan.is_free ? 1 : 2)} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {selectedPlan.is_free ? 'Cambiar plan' : 'Volver a comprobante de pago'}
            </button>

            <h2 className="text-2xl font-black text-gray-900 mb-1">Datos de tu Catálogo</h2>
            <p className="text-xs text-gray-500 mb-6">Completa la información básica para activar tu tienda online.</p>

            <form onSubmit={handleSubmitCatalog} className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nombre de tu Negocio / Tienda *
                </label>
                <div className="relative">
                  <Building className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Boutique La Habana"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Slug / URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  URL o Enlace deseado (Slug) *
                </label>
                <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:bg-white">
                  <span className="px-3.5 text-xs font-bold text-gray-400 border-r border-gray-200 bg-gray-100/50 py-3">
                    tucatalogo.com/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="mi-tienda"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full px-3 py-3 bg-transparent outline-none text-sm font-bold text-orange-600"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Logo del Negocio (Opcional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl border overflow-hidden flex items-center justify-center text-gray-400 flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <Cat className="w-8 h-8 text-orange-500" />
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors">
                    {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Colors Customization */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-orange-600" /> Personaliza tus Colores Principales
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Color de Fondo</label>
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Color de Tarjetas</label>
                    <input 
                      type="color" 
                      value={windowColor} 
                      onChange={(e) => setWindowColor(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Barra Superior</label>
                    <input 
                      type="color" 
                      value={topBarColor} 
                      onChange={(e) => setTopBarColor(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Account Registration details if user is not logged in */}
              {!user && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Datos de tu Cuenta de Administrador
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Usuario *</label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="usuario123"
                          value={authForm.username}
                          onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico *</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="email"
                          required
                          placeholder="tu@correo.com"
                          value={authForm.email}
                          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Móvil (WhatsApp)</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="+53 55555555"
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informative Note Box */}
              {!selectedPlan.is_free && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <strong className="font-bold block mb-0.5">Aprobación de Comprobante (1h a 12h)</strong>
                    Tu catálogo será creado inmediatamente en modo prueba. Una vez revisado y aprobado tu pago por nuestro equipo de administración (suele demorar de 1 a 12 horas), se desbloquearán automáticamente todos los permisos del plan ({selectedPlan.name}).
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-200 flex items-center justify-center gap-2 text-base disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Creando tu catálogo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Crear Mi Catálogo Ahora</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer 
        settings={globalSettings?.footer} 
        name="TuCATalogo" 
        bgColor={globalSettings?.bottom_bar_color}
        textColor={globalSettings?.bottom_bar_text_color}
        font={globalSettings?.bottom_bar_font}
        logo={globalSettings?.logo}
      />
    </div>
  );
};

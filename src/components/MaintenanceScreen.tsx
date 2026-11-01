import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Sparkles, 
  Clock, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Lock, 
  Cat, 
  MessageCircle, 
  Mail,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlobalSettings } from '../types';
import { getImageUrl } from '../lib/utils';
import { dbService } from '../lib/supabase-service';
import { toast } from 'sonner';

interface MaintenanceScreenProps {
  settings?: GlobalSettings | null;
  onCheckStatus?: () => Promise<boolean> | void;
  onAdminLoginClick?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  settings,
  onCheckStatus,
  onAdminLoginClick
}) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  const customMessage = settings?.maintenance_message || 
    'Estamos realizando mejoras y actualizaciones que necesitan una pausa del servicio por poco tiempo. Nos disculpamos por las molestias ocasionadas y estamos tratando de estar en línea de nuevo en el menor tiempo posible.';

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      if (onCheckStatus) {
        const result = await onCheckStatus();
        if (result === false) {
          toast.success('¡El mantenimiento ha finalizado! Conectando...', { id: 'maint-done' });
          return;
        }
      } else {
        const fresh = await dbService.getGlobalSettings();
        if (fresh && !fresh.maintenance_mode) {
          toast.success('¡El sistema está nuevamente en línea!');
          window.location.reload();
          return;
        }
      }
      toast.info('El mantenimiento aún continúa en proceso. Por favor, espera unos minutos.', { id: 'maint-still' });
    } catch (e) {
      toast.info('Comprobando servidores...');
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  const handleAdminAccess = () => {
    if (onAdminLoginClick) {
      onAdminLoginClick();
    } else {
      navigate('/login');
    }
  };

  const logoUrl = settings?.logo ? getImageUrl(settings.logo, 'logos') : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-orange-600/25 via-amber-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[450px] h-[300px] bg-gradient-to-t from-orange-500/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[350px] h-[350px] bg-gradient-to-r from-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 overflow-hidden p-1.5 border border-white/20">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Cat className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <span className="font-black text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-orange-200">
              TuCATalogo
            </span>
            <span className="block text-[11px] text-slate-400 font-medium">Plataforma Digital</span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>Mantenimiento Activo</span>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 text-center flex-1 flex flex-col items-center justify-center">
        {/* Animated Centerpiece Icon */}
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-3xl blur-2xl opacity-40 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900/90 border border-orange-500/40 shadow-2xl flex items-center justify-center backdrop-blur-xl">
            <div className="relative">
              <Wrench className="w-12 h-12 sm:w-14 sm:h-14 text-orange-400" />
              <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-2 animate-bounce" />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight"
        >
          Estamos en <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300">Mantenimiento</span>
        </motion.h1>

        {/* Explanatory Message */}
        <motion.p 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8 font-normal"
        >
          {customMessage}
        </motion.p>

        {/* Feature Improvements Highlights */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-10 text-left"
        >
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-orange-500/30 transition-all">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Carga Ultrarrápida</h4>
            <p className="text-xs text-slate-400 leading-snug">
              Imágenes en formato WebP optimizadas a 350px para baja velocidad de red.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-orange-500/30 transition-all">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Pausa Temporal</h4>
            <p className="text-xs text-slate-400 leading-snug">
              Actualizaciones técnicas en curso que requieren una breve desconexión.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-orange-500/30 transition-all">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Datos Protegidos</h4>
            <p className="text-xs text-slate-400 leading-snug">
              Tus catálogos, productos y pedidos se conservan de forma íntegra y segura.
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={handleRecheck}
            disabled={isChecking}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-orange-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verificando estado...' : 'Comprobar si ya está listo'}</span>
          </button>

          <button
            onClick={handleAdminAccess}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Ingreso para el equipo administrador"
          >
            <Lock className="w-4 h-4 text-orange-400" />
            <span>Acceso Administrativo</span>
          </button>
        </motion.div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} TuCATalogo. Todos los derechos reservados.</p>
        
        {/* Contact links if available */}
        <div className="flex items-center gap-4">
          {settings?.footer?.whatsapp && (
            <a 
              href={`https://wa.me/${settings.footer.whatsapp.replace(/\D/g, '')}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp de Soporte</span>
            </a>
          )}
          {settings?.footer?.email && (
            <a 
              href={`mailto:${settings.footer.email}`} 
              className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{settings.footer.email}</span>
            </a>
          )}
        </div>
      </footer>
    </div>
  );
};

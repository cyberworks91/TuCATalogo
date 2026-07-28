import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { 
  Cat, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Plus, 
  Settings, 
  Palette,
  Package, 
  Users, 
  ShoppingCart, 
  ShoppingBag,
  ArrowLeft,
  Trash2,
  Edit,
  Save,
  Download,
  Copy,
  Power,
  Upload as UploadIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Filter,
  SortAsc,
  LayoutGrid,
  Layers,
  List,
  Info,
  Phone,
  Share2,
  MapPin,
  Clock,
  Mail,
  Building,
  Key,
  QrCode,
  ClipboardList,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, useCatalogStore } from './store';
import { Catalog, Product, Role, User, Order, ProductType, FooterSettings, GlobalSettings } from './types';
import { cn, formatPrice, roundPrice, optimizeImage, getImageUrl, getStoragePath } from './lib/utils';
import { supabase } from './lib/supabase';
import { authService, dbService, storageService } from './lib/supabase-service';
import { QRScannerModal } from './components/QRScannerModal';

// --- CONSTANTS ---

const FONTS = [
  'Inter',
  'Space Grotesk',
  'Outfit',
  'Playfair Display',
  'JetBrains Mono',
  'Fira Code',
  'Georgia',
  'Helvetica',
  'Arial',
  'Courier New'
];

// --- COMPONENTS ---

const Navbar = ({ 
  catalog, 
  cartCount, 
  onCartClick, 
  onHistoryClick 
}: { 
  catalog?: Catalog | null, 
  cartCount?: number, 
  onCartClick?: () => void, 
  onHistoryClick?: () => void 
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    if (!catalog) {
      dbService.getGlobalSettings().then(setGlobalSettings);
    }
  }, [catalog]);

  const logo = catalog?.settings.logo || globalSettings?.logo;
  const bgColor = catalog 
    ? (catalog.settings.top_bar_color || catalog.settings.bg_color) 
    : (globalSettings?.top_bar_color || '#ffffff');
  const textColor = catalog 
    ? (catalog.settings.top_bar_text_color || catalog.settings.text_color) 
    : (globalSettings?.top_bar_text_color || '#000000');
  const fontFamily = catalog 
    ? (catalog.settings.top_bar_font || 'Inter') 
    : (globalSettings?.top_bar_font || globalSettings?.font_family || 'Inter');

  const isCatalogAdmin = catalog && user && (user.role === 'superadmin' || (user.catalog_id === catalog.id && (user.role === 'admin' || user.role === 'editor')));
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  useEffect(() => {
    if (catalog && isCatalogAdmin) {
      dbService.getOrders(catalog.id).then(orders => {
        const pending = (orders || []).filter(o => o.status === 'pending').length;
        setPendingOrdersCount(pending);
      }).catch(() => {});
    }
  }, [catalog?.id, isCatalogAdmin]);

  return (
    <>
      <nav 
        className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50"
        style={{ 
          backgroundColor: bgColor + '80', 
          color: textColor,
          fontFamily: fontFamily
        }}
      >
        <div className="flex items-center gap-4">
          {catalog && (
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-orange-600">
            {logo ? (
              <img src={getImageUrl(logo, 'logos')} alt="Logo" className="h-8 w-8 object-contain rounded-lg" />
            ) : (
              <Cat className="w-8 h-8" />
            )}
            <span>{catalog?.name || 'TuCATalogo'}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {catalog && isCatalogAdmin && (
            <button 
              onClick={() => navigate(`/${catalog.slug}/orders`)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all font-bold text-xs sm:text-sm shadow-sm relative"
              title="Gestión de Pedidos"
            >
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="hidden sm:inline">Pedidos</span>
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm border border-white">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {catalog && user && (
            <button 
              onClick={onCartClick}
              className="p-2 hover:bg-gray-100 rounded-full text-orange-600 relative"
              title="Tu Bolsa"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount !== undefined && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl overflow-hidden border-2 border-orange-200">
                  {user.avatar_url ? (
                    <img src={getImageUrl(user.avatar_url, 'avatars')} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[60]"
                  >
                    <div className="px-4 py-2 border-b mb-2">
                      <p className="font-bold text-gray-900 truncate">{user.username}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{user.role}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Mi Perfil
                    </button>
                    
                    {catalog && (
                      <button 
                        onClick={() => { setShowProfileMenu(false); onHistoryClick?.(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <List className="w-4 h-4" />
                        Mis Encargos
                      </button>
                    )}

                    {catalog && isCatalogAdmin && (
                      <>
                        <Link 
                          to={`/${catalog.slug}/orders`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium"
                        >
                          <div className="flex items-center gap-3">
                            <ClipboardList className="w-4 h-4 text-orange-600" />
                            <span>Pedidos</span>
                          </div>
                          {pendingOrdersCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1.5 flex items-center justify-center rounded-full">
                              {pendingOrdersCount}
                            </span>
                          )}
                        </Link>
                        <Link 
                          to={`/${catalog.slug}/admin`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium"
                        >
                          <Settings className="w-4 h-4 text-gray-500" />
                          <span>Panel de Administración</span>
                        </Link>
                      </>
                    )}

                    {user.role === 'superadmin' && (
                      <Link 
                        to="/superadmin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Panel Superadmin
                      </Link>
                    )}

                    <div className="border-t mt-2 pt-2">
                      <button 
                        onClick={() => { logout(); navigate('/'); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="flex items-center gap-1 px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors">
                <LogIn className="w-3.5 h-3.5 sm:w-4 h-4" />
                <span>Entrar</span>
              </Link>
              <Link to="/register" className="flex items-center gap-1 px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-all shadow-sm">
                <UserPlus className="w-3.5 h-3.5 sm:w-4 h-4" />
                <span>Registro</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

const Footer = ({ 
  settings, 
  name, 
  bgColor, 
  textColor, 
  font,
  logo
}: { 
  settings?: FooterSettings, 
  name: string,
  bgColor?: string,
  textColor?: string,
  font?: string,
  logo?: string | null
}) => {
  const [showAbout, setShowAbout] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Mira este catálogo: ${name}`,
          url: window.location.href,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    <>
      <footer 
        className="bg-white border-t py-12"
        style={{ 
          backgroundColor: bgColor, 
          color: textColor,
          fontFamily: font
        }}
      >
        <div className="max-w-7xl mx-auto px-8 space-y-12">
          {/* Top Section: Logo and Main Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2 font-bold text-xl text-orange-600">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center overflow-hidden">
                {logo ? (
                  <img src={getImageUrl(logo, 'logos')} alt={name} className="w-full h-full object-contain" />
                ) : (
                  <Cat className="w-6 h-6" />
                )}
              </div>
              <span style={{ color: textColor }}>{name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold w-full sm:w-auto">
              <button 
                onClick={() => setShowAbout(true)} 
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all shadow-sm border border-orange-100 whitespace-nowrap"
              >
                <Info className="w-4 h-4" />
                Acerca de
              </button>
              <button 
                onClick={handleShare} 
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-2xl hover:bg-gray-50 transition-all shadow-sm border border-gray-200 whitespace-nowrap"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </div>

          {/* Middle Section: Contact Information Grid */}
          {(settings?.schedule || settings?.email || settings?.phone || settings?.whatsapp || settings?.address || settings?.map_url) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 py-8 border-y border-gray-100">
              {settings?.schedule && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Horario</p>
                    <p className="text-sm text-gray-700">{settings.schedule}</p>
                  </div>
                </div>
              )}
              {settings?.email && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <a href={`mailto:${settings.email}`} className="text-sm text-orange-600 font-medium hover:underline break-all">{settings.email}</a>
                  </div>
                </div>
              )}
              
              {/* Phone and WhatsApp side-by-side */}
              {(settings?.phone || settings?.whatsapp) && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto</p>
                      {settings?.whatsapp && (
                        <a 
                          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                          title="WhatsApp"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    {settings?.phone && (
                      <a href={`tel:${settings.phone}`} className="text-sm text-orange-600 font-medium hover:underline">{settings.phone}</a>
                    )}
                  </div>
                </div>
              )}

              {/* Address and Map side-by-side */}
              {(settings?.address || settings?.map_url) && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</p>
                      {settings?.map_url && (
                        <a 
                          href={settings.map_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                          title="Ver en mapa"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {settings?.address && (
                      <p className="text-sm text-gray-700">{settings.address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Section: Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
            <p>© 2026 {name}. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ por TuCATalogo</p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
                <h2 className="text-2xl font-bold">Acerca de</h2>
                <button 
                  onClick={() => setShowAbout(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {settings?.about || 'No hay información disponible.'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { user, setUser, session } = useAuthStore();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files?.[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUploading(true);

    try {
      if (formData.password && formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      let currentAvatar = formData.avatar_url;

      if (avatarFile) {
        const fileName = `${user.id}-${Date.now()}-${avatarFile.name}`;
        currentAvatar = await storageService.uploadFile('avatars', avatarFile, fileName);
      }

      // Update Auth if email or password changed
      if (formData.email !== user.email || formData.password) {
        const authUpdates: any = {};
        if (formData.email !== user.email) authUpdates.email = formData.email;
        if (formData.password) authUpdates.password = formData.password;
        
        await authService.updateUser(authUpdates);
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: currentAvatar,
          email: formData.email
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser({ ...user, ...updatedProfile });
      toast.success('Perfil actualizado');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Mi Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center text-4xl overflow-hidden border-4 border-orange-200 shadow-lg">
                {avatarPreview || formData.avatar_url ? (
                  <img src={avatarPreview || getImageUrl(formData.avatar_url, 'avatars')} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                    {user.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <UploadIcon className="w-6 h-6" />
                <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre Completo</label>
              <input 
                type="text" required
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de Usuario</label>
              <input 
                type="text" required
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input 
                type="tel"
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input 
                type="email" required
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cambiar Contraseña (opcional)</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Dejar en blanco para no cambiar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Repetir Nueva Contraseña</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUploading}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- PAGES ---

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await dbService.searchAllProducts(query);
      setResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-12">
      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <input 
          type="text"
          placeholder="Busca productos en todos los catálogos..."
          className="w-full pl-12 pr-24 py-4 rounded-2xl border-2 border-orange-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 focus:outline-none text-lg shadow-sm transition-all"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 w-6 h-6" />
        <button 
          type="submit"
          disabled={loading}
          className="absolute right-2 top-2 bottom-2 px-6 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      <AnimatePresence>
        {showResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b flex items-center justify-between bg-orange-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Resultados de búsqueda</h3>
                  <p className="text-sm text-gray-500">Encontrados {results.length} productos</p>
                </div>
                <button 
                  onClick={() => setShowResults(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {results.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.map(product => (
                      <Link 
                        key={product.id}
                        to={`/${product.catalogs.slug}`}
                        onClick={() => setShowResults(false)}
                        className="group bg-gray-50 rounded-2xl overflow-hidden border border-transparent hover:border-orange-200 transition-all hover:shadow-md"
                      >
                        <div className="aspect-square relative overflow-hidden bg-white">
                          {product.photos?.[0] ? (
                            <img 
                              src={getImageUrl(product.photos[0], 'products')} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold text-orange-600 shadow-sm">
                            {product.catalogs.name}
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-orange-600 transition-colors">{product.name}</h4>
                          <p className="text-orange-600 font-bold text-sm mt-1">
                            ${product.ref_price.toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron productos que coincidan con "{query}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepsToCreate = () => {
  const steps = [
    {
      icon: <Building className="w-6 h-6" />,
      title: "Contactar y Facilitar Datos",
      desc: "Ponte en contacto con nosotros y proporciona los datos de tu empresa para tu catálogo."
    },
    {
      icon: <Key className="w-6 h-6" />,
      title: "Recibir Acceso y Seguridad",
      desc: "Recibe tus credenciales y cambia tu contraseña al iniciar sesión por primera vez."
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Personalizar y Crear",
      desc: "Empieza a personalizar tu catálogo y sube tus productos."
    }
  ];

  return (
    <section className="py-16 border-t border-gray-100">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Crea tu propio catálogo</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">Sigue estos sencillos pasos para empezar a vender tus productos con nosotros.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex flex-col items-center text-center group">
            {idx < steps.length - 1 && (
              <div className="hidden lg:block absolute top-10 left-[60%] w-full h-[2px] bg-orange-100" />
            )}
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-orange-50 flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 z-10">
              {step.icon}
            </div>
            <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-4 border-4 border-white shadow-sm z-10">
              {idx + 1}
            </div>
            <h3 className="font-bold text-gray-800 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-500">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const LandingPage = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const { user } = useAuthStore();
  const { setCurrentCatalog } = useCatalogStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newCatalog, setNewCatalog] = useState({ name: '', slug: '' });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    setCurrentCatalog(null);
    dbService.getCatalogs().then(setCatalogs).catch(err => toast.error('Error al cargar catálogos'));
    dbService.getGlobalSettings().then(setGlobalSettings);
  }, [setCurrentCatalog]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await dbService.createCatalog(newCatalog);
      setCatalogs([...catalogs, created]);
      setShowCreate(false);
      toast.success('Catálogo creado');
    } catch (error: any) {
      toast.error(error.message || 'Error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-orange-600 pl-4">Catálogos disponibles</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {catalogs.map(catalog => (
            <Link 
              key={catalog.id} 
              to={`/${catalog.slug}`}
              className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-orange-100"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform overflow-hidden">
                  {catalog.settings.logo ? (
                    <img src={getImageUrl(catalog.settings.logo, 'logos')} alt={catalog.name} className="w-full h-full object-contain" />
                  ) : (
                    <Cat className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{catalog.name}</h3>
                  <p className="text-sm text-gray-500">/{catalog.slug}</p>
                </div>
              </div>
              <div className="flex items-center text-orange-600 font-semibold text-sm">
                Ver catálogo <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <GlobalSearch />

        {user?.role === 'superadmin' && (
          <div className="text-center mt-12 mb-8">
            <button 
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 mx-auto px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-200"
            >
              <Plus className="w-6 h-6" />
              Nuevo Catálogo
            </button>
          </div>
        )}

        <StepsToCreate />
      </main>

      <Footer 
        settings={globalSettings?.footer} 
        name="TuCATalogo" 
        bgColor={globalSettings?.bottom_bar_color}
        textColor={globalSettings?.bottom_bar_text_color}
        font={globalSettings?.bottom_bar_font}
        logo={globalSettings?.logo}
      />

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Crear Catálogo</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCatalog.name}
                    onChange={e => setNewCatalog({ ...newCatalog, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCatalog.slug}
                    onChange={e => setNewCatalog({ ...newCatalog, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded-xl font-bold hover:bg-orange-700">Crear</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductDetailModal = ({ 
  product, 
  catalog, 
  onClose, 
  onAddToCart,
  productTypes
}: { 
  product: Product, 
  catalog: Catalog, 
  onClose: () => void, 
  onAddToCart: (p: Product) => void,
  productTypes: ProductType[]
}) => {
  const [activePhoto, setActivePhoto] = useState(0);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const effectiveRate = (catalog?.exchange_rate || 1) + (catalog?.settings?.exchange_rate_margin || 0);
  const wholesalePrice = product.custom_wholesale_price_mn || roundPrice((product.ref_price || 0) * effectiveRate);
  const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
    ? roundPrice(product.sale_wholesale_price_ref * effectiveRate) 
    : null;

  const handleShareProduct = async () => {
    const url = `${window.location.origin}/${catalog.slug}?product=${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Mira este producto en ${catalog.name}: ${product.name}`,
          url: url,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace del producto copiado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] sm:max-h-[90vh]"
      >
        <div className="w-full md:w-1/2 bg-gray-100 relative group shrink-0">
          {product.photos.length > 0 ? (
            <div className="h-64 sm:h-80 md:h-full">
              <img 
                src={getImageUrl(product.photos[activePhoto], 'products')} 
                alt={product.name} 
                className="w-full h-full object-contain" 
              />
            </div>
          ) : (
            <div className="w-full h-64 sm:h-80 md:h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-300" />
            </div>
          )}
          
          {product.photos.length > 1 && (
            <>
              <button 
                onClick={() => setActivePhoto(prev => (prev > 0 ? prev - 1 : product.photos.length - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setActivePhoto(prev => (prev < product.photos.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.photos.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === activePhoto ? "bg-orange-600 w-4" : "bg-gray-400"
                    )} 
                  />
                ))}
              </div>
            </>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full transition-colors md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto">
          <div className="hidden md:flex justify-end mb-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  product.classification === 'new' ? "bg-green-100 text-green-700" :
                  product.classification === 'sale' ? "bg-red-100 text-red-700" :
                  product.classification === 'out' ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                )}>
                  {product.classification === 'new' ? 'Nuevo' : 
                   product.classification === 'sale' ? 'En Oferta' : 
                   product.classification === 'out' ? 'Agotado' : 'Normal'}
                </span>
                {product.type_id && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700 flex items-center gap-1">
                    {productTypes.find(t => t.id === product.type_id)?.emoji}
                    {productTypes.find(t => t.id === product.type_id)?.name}
                  </span>
                )}
              </div>
              {product.code && (
                <span className="text-sm font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                  {product.code}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{product.name}</h2>
            <p className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">{product.description}</p>

            {/* Sale type conditions */}
            {((catalog?.settings?.sale_type_wholesale !== false) || (catalog?.settings?.sale_type_retail !== false)) && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
                {catalog?.settings?.sale_type_wholesale !== false && (
                  <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1">Precio Mayorista (min {product.min_wholesale_qty})</p>
                    {saleWholesalePrice ? (
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm line-through text-gray-400">{formatPrice(wholesalePrice)}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                        <span className="text-[10px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] sm:text-xs text-gray-400">Total caja: {formatPrice((saleWholesalePrice || wholesalePrice) * product.min_wholesale_qty)}</p>
                      <span className="text-[9px] text-gray-400 font-bold">({(Number(product.sale_wholesale_price_ref || product.ref_price) * product.min_wholesale_qty).toFixed(2)} REF)</span>
                    </div>
                  </div>
                )}
                {catalog?.settings?.sale_type_retail !== false && (
                  <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1">Precio Minorista</p>
                    {product.classification === 'sale' && product.sale_price ? (
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm line-through text-gray-400">{formatPrice(product.cup_price)}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold">{formatPrice(product.cup_price)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {product.classification !== 'out' ? (
              <button 
                onClick={() => { 
                  if (!user) {
                    navigate('/login');
                    onClose();
                    return;
                  }
                  onAddToCart(product); 
                  onClose(); 
                }}
                className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 flex flex-col items-center justify-center gap-1"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6" />
                  Añadir a la Bolsa
                </div>
                <span className="text-[10px] opacity-80 font-normal">Encargos para venta mayorista</span>
              </button>
            ) : (
              <div className="flex-1 py-4 bg-gray-200 text-gray-500 rounded-2xl font-bold text-lg text-center flex items-center justify-center">
                Producto Agotado
              </div>
            )}
            <button 
              onClick={handleShareProduct}
              className="p-4 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center shadow-sm border border-gray-200"
              title="Compartir producto"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CartModal = ({ 
  cart, 
  setCart, 
  onClose, 
  onSendOrder,
  catalog
}: { 
  cart: { product: Product, qty: number }[], 
  setCart: React.Dispatch<React.SetStateAction<{ product: Product, qty: number }[]>>,
  onClose: () => void,
  onSendOrder: () => void,
  catalog: Catalog
}) => {
  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(item.product.min_wholesale_qty, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);

  const total = cart.reduce((acc, i) => {
    const wholesalePrice = i.product.custom_wholesale_price_mn || roundPrice(i.product.ref_price * effectiveRate);
    const saleWholesalePrice = i.product.classification === 'sale' && i.product.sale_wholesale_price_ref 
      ? roundPrice(i.product.sale_wholesale_price_ref * effectiveRate) 
      : null;
    return acc + (saleWholesalePrice || wholesalePrice) * i.qty;
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold">Tu Bolsa</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Tu Bolsa está vacía</p>
            </div>
          ) : (
            cart.map(item => {
              const wholesalePrice = item.product.custom_wholesale_price_mn || roundPrice(item.product.ref_price * effectiveRate);
              const saleWholesalePrice = item.product.classification === 'sale' && item.product.sale_wholesale_price_ref 
                ? roundPrice(item.product.sale_wholesale_price_ref * effectiveRate) 
                : null;
              const currentPrice = saleWholesalePrice || wholesalePrice;

              return (
                <div key={item.product.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0">
                    {item.product.photos?.[0] && <img src={getImageUrl(item.product.photos?.[0], 'products')} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-0.5 w-fit">
                      <button 
                        onClick={() => updateQty(item.product.id, -1)}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-500"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-gray-700 min-w-[1.5rem] text-center">{item.qty}</span>
                      <button 
                        onClick={() => updateQty(item.product.id, 1)}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-500"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <p className="font-bold truncate text-sm leading-tight">{item.product.name}</p>
                      <p className="text-xs text-orange-600 font-bold">{formatPrice(currentPrice)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeItem(item.product.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-3xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-medium">Total estimado</span>
            <span className="text-2xl font-bold text-orange-600">{formatPrice(total)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={onSendOrder}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 disabled:opacity-50 disabled:grayscale"
          >
            Confirmar Encargo
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const HistoryModal = ({ 
  catalog_id, 
  onClose 
}: { 
  catalog_id: string, 
  onClose: () => void 
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      dbService.getOrders(catalog_id, user.id)
        .then(data => setOrders(data || []))
        .catch(err => {
          console.error('Error loading history:', err);
          toast.error('Error al cargar historial');
        });
    }
  }, [catalog_id, user]);

  const statusMap: Record<string, { label: string, color: string }> = {
    pending: { label: 'En revisión', color: 'bg-yellow-100 text-yellow-700' },
    processing: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
    ready: { label: 'Listo', color: 'bg-green-100 text-green-700' },
    completed: { label: 'Entregado', color: 'bg-gray-100 text-gray-700' }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <List className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold">Historial de Encargos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No tienes encargos anteriores</p>
            </div>
          ) : (
            orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(order => (
              <div key={order.id} className="border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">Encargo #{order.id.slice(-4)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    statusMap[order.status]?.color
                  )}>
                    {statusMap[order.status]?.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.product_code && <span className="font-bold text-gray-900 mr-1">[{item.product_code}]</span>}{item.name}
                      </span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-400">Total</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatPrice((order.items || []).reduce((acc, i) => acc + i.price * i.quantity, 0))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CatalogView = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const { setCurrentCatalog } = useCatalogStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [cart, setCart] = useState<{ product: Product, qty: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [minRetailPrice, setMinRetailPrice] = useState<number>(0);
  const [maxRetailPrice, setMaxRetailPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'classification' | 'type' | 'alphabetical'>('classification');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isWholesaleActive = catalog?.settings?.sale_type_wholesale !== false;
  const isRetailActive = catalog?.settings?.sale_type_retail !== false;

  useEffect(() => {
    dbService.getCatalogs().then(data => {
      const found = data.find((c: any) => c.slug === slug);
      if (found) {
        setCatalog(found);
        setCurrentCatalog(found);
        dbService.getProducts(found.id).then(setProducts);
      }
    });
    dbService.getProductTypes().then(setProductTypes);
  }, [slug, setCurrentCatalog]);

  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const p = products.find(p => p.id === productId);
      if (p) setSelectedProduct(p);
    }
  }, [searchParams, products]);

  if (!catalog) return <div className="p-8 text-center">Cargando catálogo...</div>;

  const filteredProducts = products.filter(p => {
    // Active filter
    if (!p.is_active) return false;

    // Basic availability filter
    if (p.classification === 'out' && p.out_of_stock_at) {
      const outDate = new Date(p.out_of_stock_at);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - outDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 15) return false;
    }

    // Search filter
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filter (labeled as Clasificación)
    if (filterType !== 'all' && p.type_id !== filterType) {
      return false;
    }

    // Classification filter (labeled as Estado)
    if (filterClassification !== 'all' && p.classification !== filterClassification) {
      return false;
    }

    // Price filter (Wholesale)
    const wholesalePrice = p.custom_wholesale_price_mn || roundPrice(p.ref_price * catalog.exchange_rate);
    const saleWholesalePrice = p.classification === 'sale' && p.sale_wholesale_price_ref 
      ? roundPrice(p.sale_wholesale_price_ref * catalog.exchange_rate) 
      : null;
    const currentWholesalePrice = saleWholesalePrice || wholesalePrice;

    if (minPrice > 0 && currentWholesalePrice < minPrice) {
      return false;
    }
    if (maxPrice > 0 && currentWholesalePrice > maxPrice) {
      return false;
    }

    // Price filter (Retail)
    const currentRetailPrice = p.classification === 'sale' && p.sale_price ? p.sale_price : p.cup_price;
    if (minRetailPrice > 0 && currentRetailPrice < minRetailPrice) {
      return false;
    }
    if (maxRetailPrice > 0 && currentRetailPrice > maxRetailPrice) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.name.localeCompare(b.name);
    }
    
    // 1. Classification Priority (Sale > New > Normal > Out)
    const priority = { sale: 0, new: 1, stock: 2, out: 3 };
    const pA = priority[a.classification as keyof typeof priority] ?? 2;
    const pB = priority[b.classification as keyof typeof priority] ?? 2;
    if (pA !== pB) return pA - pB;

    // 2. Category Sort
    const typeA = productTypes.find(t => t.id === a.type_id)?.name || '';
    const typeB = productTypes.find(t => t.id === b.type_id)?.name || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    
    // 3. Alphabetical secondary sort
    return a.name.localeCompare(b.name);
  });

  const finalProducts = filteredProducts;

  const productsByClassification = {
    sale: [] as Product[],
    new: [] as Product[],
    stock: [] as Product[],
    out: [] as Product[]
  };

  finalProducts.forEach(p => {
    const cls = (p.classification || 'stock') as keyof typeof productsByClassification;
    if (productsByClassification[cls]) {
      productsByClassification[cls].push(p);
    } else {
      productsByClassification.stock.push(p);
    }
  });

  const classificationLabels = {
    sale: 'Oferta 🔥',
    new: 'Nuevos ✨',
    stock: 'Productos 📦',
    out: 'Agotados ⏳'
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + product.min_wholesale_qty } : item);
      return [...prev, { product, qty: product.min_wholesale_qty }];
    });
    toast.success('Añadido a la Bolsa');
  };

  const sendOrder = async () => {
    if (!user) return toast.error('Debes iniciar sesión para pedir');
    const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);
    try {
      await dbService.createOrder({
        catalog_id: catalog.id,
        user_id: user.id,
        status: 'pending',
        items: cart.map(item => {
          const wholesalePrice = item.product.custom_wholesale_price_mn || roundPrice(item.product.ref_price * effectiveRate);
          const saleWholesalePrice = item.product.classification === 'sale' && item.product.sale_wholesale_price_ref 
            ? roundPrice(item.product.sale_wholesale_price_ref * effectiveRate) 
            : null;
          return {
            product_id: item.product.id,
            product_code: item.product.code,
            name: item.product.name,
            quantity: item.qty,
            price: saleWholesalePrice || wholesalePrice
          };
        })
      });
      setCart([]);
      setShowCart(false);
      toast.success('Pedido enviado con éxito');
    } catch (error) {
      toast.error('Error al enviar el pedido');
    }
  };

  return (
    <div 
      className="min-h-screen" 
      style={{ backgroundColor: catalog.settings.bg_color, color: catalog.settings.text_color }}
    >
      <Navbar 
        catalog={catalog} 
        cartCount={cart.length}
        onCartClick={() => setShowCart(true)}
        onHistoryClick={() => setShowHistory(true)}
      />
      
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              {!isSearchOpen && !searchTerm ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center justify-center gap-2 flex-1 px-6 py-3 rounded-2xl bg-white/50 backdrop-blur border border-white/30 hover:bg-white transition-all font-bold text-sm shadow-sm"
                  >
                    <span>Buscar Producto 🔍</span>
                  </button>
                  <button 
                    onClick={() => setShowQRScanner(true)}
                    className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg hover:bg-orange-700 transition-all shrink-0 flex items-center justify-center"
                    title="Escanear QR / Código de Barras"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Buscar Producto... 🔍"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onBlur={() => !searchTerm && setIsSearchOpen(false)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/50 backdrop-blur border border-white/30 focus:bg-white transition-all outline-none shadow-sm font-bold text-sm"
                    />
                  </div>
                  <button 
                    className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg hover:bg-orange-700 transition-all shrink-0"
                    title="Buscar"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowQRScanner(true)}
                    className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg hover:bg-orange-700 transition-all shrink-0 flex items-center justify-center"
                    title="Escanear QR / Código de Barras"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-3 rounded-2xl bg-white/50 backdrop-blur border border-white/30 hover:bg-white transition-all shadow-sm",
                  (filterType !== 'all' || filterClassification !== 'all' || minPrice > 0 || maxPrice > 0 || minRetailPrice > 0 || maxRetailPrice > 0) && "text-orange-600 border-orange-200 bg-orange-50"
                )}
                title="Filtros"
              >
                <Filter className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showFilters && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowFilters(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-[70] space-y-4 w-72 sm:w-80"
                    >
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Clasificación</label>
                          <select 
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                          >
                            <option value="all">Todas</option>
                            {productTypes.map(t => (
                              <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Estado</label>
                          <select 
                            value={filterClassification}
                            onChange={e => setFilterClassification(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                          >
                            <option value="all">Todos</option>
                            <option value="new">Nuevo</option>
                            <option value="sale">En Oferta</option>
                            <option value="stock">Normal</option>
                            <option value="out">Agotado</option>
                          </select>
                        </div>

                        {isWholesaleActive && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio Mayorista</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number"
                                placeholder="Mínimo"
                                value={minPrice || ''}
                                onChange={e => setMinPrice(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                              />
                              <input 
                                type="number"
                                placeholder="Máximo"
                                value={maxPrice || ''}
                                onChange={e => setMaxPrice(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                              />
                            </div>
                          </div>
                        )}

                        {isRetailActive && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio Minorista</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number"
                                placeholder="Mínimo"
                                value={minRetailPrice || ''}
                                onChange={e => setMinRetailPrice(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                              />
                              <input 
                                type="number"
                                placeholder="Máximo"
                                value={maxRetailPrice || ''}
                                onChange={e => setMaxRetailPrice(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 outline-none text-sm text-gray-900"
                              />
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => {
                            setFilterType('all');
                            setFilterClassification('all');
                            setMinPrice(0);
                            setMaxPrice(0);
                            setMinRetailPrice(0);
                            setMaxRetailPrice(0);
                          }}
                          className="w-full py-2 text-xs font-bold text-gray-400 hover:text-orange-600 transition-colors"
                        >
                          Limpiar Filtros
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {(user?.role === 'admin' || user?.role === 'editor') && user.catalog_id === catalog.id && (
              <button 
                onClick={() => navigate(`/${slug}/admin`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur rounded-2xl border border-white/30 hover:bg-white/30 transition-all font-bold"
              >
                <Settings className="w-5 h-5" />
                Administración
              </button>
            )}
          </div>

        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold opacity-40 uppercase tracking-wider">
            Catálogo de Productos
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortBy('classification')}
              className={cn(
                "p-2 rounded-xl transition-all",
                sortBy === 'classification' ? "bg-orange-600 text-white shadow-lg" : "bg-white/50 text-gray-400 hover:bg-white"
              )}
              title="Vista por Clasificación"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSortBy('type')}
              className={cn(
                "p-2 rounded-xl transition-all",
                sortBy === 'type' ? "bg-orange-600 text-white shadow-lg" : "bg-white/50 text-gray-400 hover:bg-white"
              )}
              title="Vista por Tipo"
            >
              <Layers className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSortBy('alphabetical')}
              className={cn(
                "p-2 rounded-xl transition-all",
                sortBy === 'alphabetical' ? "bg-orange-600 text-white shadow-lg" : "bg-white/50 text-gray-400 hover:bg-white"
              )}
              title="Vista Alfabética"
            >
              <SortAsc className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-16">
          {sortBy === 'alphabetical' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {filteredProducts.map(product => {
                const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);
                const wholesalePrice = product.custom_wholesale_price_mn || roundPrice(product.ref_price * effectiveRate);
                const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
                  ? roundPrice(product.sale_wholesale_price_ref * effectiveRate) 
                  : null;
                const isOut = product.classification === 'out';
                
                return (
                  <motion.div 
                    layout
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={cn(
                      "rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full cursor-pointer group",
                      isOut ? "opacity-60 grayscale" : ""
                    )}
                    style={{ backgroundColor: catalog.settings.window_color }}
                  >
                    <div className="relative h-40 sm:h-48 md:h-56 lg:h-64 w-full overflow-hidden">
                      {product.photos?.[0] ? (
                        <img src={getImageUrl(product.photos?.[0], 'products')} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      {product.classification === 'sale' && (
                        <div className="absolute top-1 right-1 bg-red-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">OFERTA</div>
                      )}
                      {product.classification === 'new' && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">NUEVO</div>
                      )}
                      {product.type_id && (
                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-[12px] p-1.5 rounded-xl shadow-md border border-white/50 flex items-center justify-center">
                          {productTypes.find(t => t.id === product.type_id)?.emoji}
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex flex-col">
                      <h4 className="font-bold text-[11px] mb-0.5 truncate leading-tight">{product.name}</h4>
                      
                      <div className="mt-auto">
                        <div className="flex flex-col">
                          {/* Mayorista (Highlighted) */}
                          {isWholesaleActive && (
                            <>
                              {saleWholesalePrice ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[13px] font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                                  <span className="text-[8px] text-gray-400 font-bold ml-auto">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <p className="text-[13px] font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                                  <span className="text-[8px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                                </div>
                              )}
                              <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter leading-none mb-1">Por Mayor</p>
                            </>
                          )}
    
                          {/* Minorista (Smaller) */}
                          {isRetailActive && (
                            <>
                              {product.classification === 'sale' && product.sale_price ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-bold opacity-70">{formatPrice(product.cup_price)}</p>
                                </div>
                              )}
                              <p className="text-[7px] font-medium opacity-40 uppercase tracking-tighter leading-none">Minorista</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : sortBy === 'classification' ? (
            (['sale', 'new', 'stock', 'out'] as const).map(cls => {
              const clsProducts = productsByClassification[cls];
              if (clsProducts.length === 0) return null;

              return (
                <div key={cls} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                      {classificationLabels[cls]}
                    </h2>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                    {clsProducts.map(product => {
                      const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);
                      const wholesalePrice = product.custom_wholesale_price_mn || roundPrice(product.ref_price * effectiveRate);
                      const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
                        ? roundPrice(product.sale_wholesale_price_ref * effectiveRate) 
                        : null;
                      const isOut = product.classification === 'out';
                      
                      return (
                        <motion.div 
                          layout
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className={cn(
                            "rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full cursor-pointer group",
                            isOut ? "opacity-60 grayscale" : ""
                          )}
                          style={{ backgroundColor: catalog.settings.window_color }}
                        >
                          <div className="relative h-40 sm:h-48 md:h-56 lg:h-64 w-full overflow-hidden">
                            {product.photos?.[0] ? (
                              <img src={getImageUrl(product.photos?.[0], 'products')} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            {product.classification === 'sale' && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">OFERTA</div>
                            )}
                            {product.classification === 'new' && (
                              <div className="absolute top-1 right-1 bg-green-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">NUEVO</div>
                            )}
                            {product.type_id && (
                              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-[12px] p-1.5 rounded-xl shadow-md border border-white/50 flex items-center justify-center">
                                {productTypes.find(t => t.id === product.type_id)?.emoji}
                              </div>
                            )}
                          </div>
                          <div className="p-2 flex-1 flex flex-col">
                            <h4 className="font-bold text-[11px] mb-0.5 truncate leading-tight">{product.name}</h4>
                            
                            <div className="mt-auto">
                              <div className="flex flex-col">
                                {isWholesaleActive && (
                                  <>
                                    {saleWholesalePrice ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[13px] font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                                        <span className="text-[8px] text-gray-400 font-bold ml-auto">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                                        <span className="text-[8px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                                      </div>
                                    )}
                                    <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter leading-none mb-1">Por Mayor</p>
                                  </>
                                )}
           
                                {isRetailActive && (
                                  <>
                                    {product.classification === 'sale' && product.sale_price ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold opacity-70">{formatPrice(product.cup_price)}</p>
                                      </div>
                                    )}
                                    <p className="text-[7px] font-medium opacity-40 uppercase tracking-tighter leading-none">Minorista</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            (() => {
              const productsByCat = filteredProducts.reduce((acc, p) => {
                const catId = p.type_id || 'uncategorized';
                if (!acc[catId]) acc[catId] = [];
                acc[catId].push(p);
                return acc;
              }, {} as Record<string, Product[]>);

              const sortedCatIds = Object.keys(productsByCat).sort((a, b) => {
                if (a === 'uncategorized') return 1;
                if (b === 'uncategorized') return -1;
                const nameA = productTypes.find(t => t.id === a)?.name || '';
                const nameB = productTypes.find(t => t.id === b)?.name || '';
                return nameA.localeCompare(nameB);
              });

              return sortedCatIds.map(catId => {
                const catProducts = productsByCat[catId];
                const category = productTypes.find(t => t.id === catId);

                return (
                  <div key={catId} className="space-y-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {category ? `${category.emoji} ${category.name}` : 'Otros'}
                      </h2>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                      {catProducts.map(product => {
                        const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);
                        const wholesalePrice = product.custom_wholesale_price_mn || roundPrice(product.ref_price * effectiveRate);
                        const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
                          ? roundPrice(product.sale_wholesale_price_ref * effectiveRate) 
                          : null;
                        const isOut = product.classification === 'out';
                        
                        return (
                          <motion.div 
                            layout
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={cn(
                              "rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full cursor-pointer group",
                              isOut ? "opacity-60 grayscale" : ""
                            )}
                            style={{ backgroundColor: catalog.settings.window_color }}
                          >
                            <div className="relative h-40 sm:h-48 md:h-56 lg:h-64 w-full overflow-hidden">
                              {product.photos?.[0] ? (
                                <img src={getImageUrl(product.photos?.[0], 'products')} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              {product.classification === 'sale' && (
                                <div className="absolute top-1 right-1 bg-red-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">OFERTA</div>
                              )}
                              {product.classification === 'new' && (
                                <div className="absolute top-1 right-1 bg-green-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full">NUEVO</div>
                              )}
                              {product.type_id && (
                                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-[12px] p-1.5 rounded-xl shadow-md border border-white/50 flex items-center justify-center">
                                  {productTypes.find(t => t.id === product.type_id)?.emoji}
                                </div>
                              )}
                            </div>
                            <div className="p-2 flex-1 flex flex-col">
                              <h4 className="font-bold text-[11px] mb-0.5 truncate leading-tight">{product.name}</h4>
                              
                              <div className="mt-auto">
                                <div className="flex flex-col">
                                  {isWholesaleActive && (
                                    <>
                                      {saleWholesalePrice ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[13px] font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                                          <span className="text-[8px] text-gray-400 font-bold ml-auto">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <p className="text-[13px] font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                                          <span className="text-[8px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                                        </div>
                                      )}
                                      <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter leading-none mb-1">Por Mayor</p>
                                    </>
                                  )}
            
                                  {isRetailActive && (
                                    <>
                                      {product.classification === 'sale' && product.sale_price ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] font-bold opacity-70">{formatPrice(product.cup_price)}</p>
                                        </div>
                                      )}
                                      <p className="text-[7px] font-medium opacity-40 uppercase tracking-tighter leading-none">Minorista</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()
          )}

          {finalProducts.length === 0 && (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-[3rem] border border-dashed border-white/30">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No se encontraron productos con estos filtros</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct}
            catalog={catalog}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            productTypes={productTypes}
          />
        )}
        {showCart && (
          <CartModal 
            cart={cart}
            setCart={setCart}
            onClose={() => setShowCart(false)}
            onSendOrder={sendOrder}
            catalog={catalog}
          />
        )}
        {showHistory && (
          <HistoryModal 
            catalog_id={catalog.id}
            onClose={() => setShowHistory(false)}
          />
        )}
        {showQRScanner && (
          <QRScannerModal 
            catalog={catalog}
            products={products}
            productTypes={productTypes}
            onClose={() => setShowQRScanner(false)}
            onAddToCart={addToCart}
            userLoggedIn={!!user}
            onNavigateLogin={() => navigate('/login')}
          />
        )}
      </AnimatePresence>

      <Footer 
        settings={catalog.settings.footer} 
        name={catalog.name} 
        bgColor={catalog.settings.bottom_bar_color}
        textColor={catalog.settings.bottom_bar_text_color}
        font={catalog.settings.bottom_bar_font}
        logo={catalog.settings.logo}
      />
    </div>
  );
};

const ProductModal = ({ 
  catalog, 
  product, 
  onClose, 
  onSave 
}: { 
  catalog: Catalog, 
  product?: Product | null, 
  onClose: () => void, 
  onSave: () => void 
}) => {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    name: '',
    description: '',
    ref_price: 0,
    cup_price: 0,
    classification: 'new',
    min_wholesale_qty: 1,
    photos: [],
    type_id: '',
    code: '',
    is_active: true
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pressingIndex, setPressingIndex] = useState<{type: 'existing' | 'new', index: number} | null>(null);
  const pressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startPress = (type: 'existing' | 'new', index: number, onConfirm: () => void) => {
    setPressingIndex({ type, index });
    pressTimerRef.current = setTimeout(() => {
      onConfirm();
      setPressingIndex(null);
    }, 1000);
  };

  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingIndex(null);
  };

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file as Blob));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    dbService.getProductTypes().then(setProductTypes);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadProgress(10);
    
    try {
      const updatedData: any = { ...formData };
      if (formData.classification === 'out' && product?.classification !== 'out') {
        updatedData.out_of_stock_at = new Date().toISOString();
      } else if (formData.classification !== 'out') {
        updatedData.out_of_stock_at = null;
      }

      setUploadProgress(30);
      const newPhotoUrls: string[] = [];
      
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const optimizedBlob = await optimizeImage(file).catch(() => file);
          const fileName = `${Date.now()}-${file.name}`;
          const publicUrl = await storageService.uploadFile('products', optimizedBlob as File, fileName);
          newPhotoUrls.push(publicUrl);
          setUploadProgress(30 + Math.floor(((i + 1) / files.length) * 50));
        }
      }

      // Delete photos from storage if they were removed
      if (photosToDelete.length > 0) {
        for (const photoUrl of photosToDelete) {
          const path = getStoragePath(photoUrl, 'products');
          if (path) {
            await storageService.deleteFile('products', path).catch(err => console.warn('Error deleting file from storage:', err));
          }
        }
      }

      const finalPhotos = [...(formData.photos || []), ...newPhotoUrls];
      
      const productPayload = {
        ...updatedData,
        catalog_id: catalog.id,
        photos: finalPhotos,
        type_id: updatedData.type_id || null,
      };

      // Remove fields that shouldn't be in the DB directly
      delete productPayload.id; 
      delete productPayload.created_at;

      if (product) {
        await dbService.updateProduct(product.id, productPayload);
      } else {
        await dbService.createProduct(productPayload);
      }

      setUploadProgress(100);
      toast.success('Producto guardado');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Image Upload Section - Moved to Top */}
          <div className="bg-orange-50 p-6 rounded-3xl border-2 border-dashed border-orange-200">
            <label className="block text-sm font-bold text-orange-600 mb-4 uppercase tracking-wider">Fotos del Producto</label>
            <div className="flex flex-wrap gap-4 mb-2">
              {formData.photos?.map((p, i) => (
                <div 
                  key={`photo-${i}`} 
                  className="relative w-24 h-24 flex-shrink-0 group cursor-pointer"
                  onMouseDown={() => startPress('existing', i, () => {
                    setPhotosToDelete(prev => [...prev, p]);
                    setFormData({ ...formData, photos: formData.photos?.filter((_, idx) => idx !== i) });
                    toast.info('Foto eliminada');
                  })}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress('existing', i, () => {
                    setPhotosToDelete(prev => [...prev, p]);
                    setFormData({ ...formData, photos: formData.photos?.filter((_, idx) => idx !== i) });
                    toast.info('Foto eliminada');
                  })}
                  onTouchEnd={cancelPress}
                >
                  <img src={getImageUrl(p, 'products')} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-sm" />
                  {pressingIndex?.type === 'existing' && pressingIndex.index === i && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-2xl overflow-hidden pointer-events-none">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, ease: 'linear' }}
                        className="absolute bottom-0 left-0 h-1.5 bg-red-600"
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white opacity-50" />
                  </div>
                </div>
              ))}
              {previews.map((url, i) => (
                <div 
                  key={`new-${i}`} 
                  className="relative w-24 h-24 flex-shrink-0 group cursor-pointer"
                  onMouseDown={() => startPress('new', i, () => {
                    const newFiles = [...files];
                    newFiles.splice(i, 1);
                    setFiles(newFiles);
                    toast.info('Nueva foto eliminada');
                  })}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress('new', i, () => {
                    const newFiles = [...files];
                    newFiles.splice(i, 1);
                    setFiles(newFiles);
                    toast.info('Nueva foto eliminada');
                  })}
                  onTouchEnd={cancelPress}
                >
                  <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-orange-200 shadow-sm" />
                  <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-br-xl font-bold uppercase">Nueva</div>
                  {pressingIndex?.type === 'new' && pressingIndex.index === i && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-2xl overflow-hidden pointer-events-none">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, ease: 'linear' }}
                        className="absolute bottom-0 left-0 h-1.5 bg-red-600"
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white opacity-50" />
                  </div>
                </div>
              ))}
              <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-orange-300 rounded-2xl bg-white hover:bg-orange-100 cursor-pointer transition-all text-orange-400 hover:text-orange-600">
                <Plus className="w-8 h-8" />
                <span className="text-[10px] font-bold uppercase mt-1">Añadir</span>
                <input 
                  type="file" multiple accept="image/*" className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-[9px] text-orange-400 font-bold uppercase tracking-tighter mb-4">
              * Mantén presionada una imagen por 1 segundo para eliminarla
            </p>
            {uploadProgress > 0 && (
              <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-orange-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="bg-orange-600 h-full"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    formData.is_active !== false ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"
                  )}>
                    <Power className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Producto Activo</p>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">Si está desactivado, no se mostrará en el catálogo público</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: formData.is_active === false ? true : false })}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors shrink-0",
                    formData.is_active !== false ? "bg-green-500" : "bg-gray-300"
                  )}
                >
                  <motion.div 
                    animate={{ x: formData.is_active !== false ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código</label>
                <input 
                  type="text"
                  placeholder="Ej: PRD-001"
                  className="w-full px-4 py-2 rounded-xl border"
                  value={formData.code || ''}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border h-24"
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Producto</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border"
                  value={formData.type_id || ''}
                  onChange={e => setFormData({ ...formData, type_id: e.target.value })}
                >
                  <option value="">Sin tipo</option>
                  {productTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Clasificación</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border"
                  value={formData.classification || 'stock'}
                  onChange={e => setFormData({ ...formData, classification: e.target.value as any })}
                >
                  <option value="new">Nuevo</option>
                  <option value="sale">En Oferta</option>
                  <option value="stock">Normal</option>
                  <option value="out">Agotado</option>
                </select>
              </div>
              {formData.classification === 'sale' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catalog.settings.sale_type_retail !== false && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Precio Oferta (CUP)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2 rounded-xl border"
                        value={formData.sale_price || ''}
                        onChange={e => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                  )}
                  {catalog.settings.sale_type_wholesale !== false && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Precio Oferta REF (Mayorista)</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full px-4 py-2 rounded-xl border"
                        value={focusedField === 'sale_wholesale_price_ref' ? (formData.sale_wholesale_price_ref || '') : (formData.sale_wholesale_price_ref !== undefined ? Number(formData.sale_wholesale_price_ref).toFixed(2) : '')}
                        onFocus={() => setFocusedField('sale_wholesale_price_ref')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({ ...formData, sale_wholesale_price_ref: val === '' ? undefined : parseFloat(val) });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalog.settings.sale_type_wholesale !== false && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio REF (Mayorista)</label>
                    <input 
                      type="number" step="0.01" required
                      className="w-full px-4 py-2 rounded-xl border"
                      value={focusedField === 'ref_price' ? (formData.ref_price || '') : Number(formData.ref_price || 0).toFixed(2)}
                      onFocus={() => setFocusedField('ref_price')}
                      onBlur={() => setFocusedField(null)}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, ref_price: val === '' ? 0 : parseFloat(val) });
                      }}
                    />
                  </div>
                )}
                {catalog.settings.sale_type_retail !== false && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio CUP (Minorista)</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-2 rounded-xl border"
                      value={formData.cup_price || 0}
                      onChange={e => setFormData({ ...formData, cup_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
              {catalog.settings.sale_type_wholesale !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cant. Mínima Mayorista</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-2 rounded-xl border"
                      value={formData.min_wholesale_qty || 0}
                      onChange={e => setFormData({ ...formData, min_wholesale_qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio Mayorista MN (Opcional)</label>
                    <input 
                      type="number"
                      placeholder="Sobrescribir cálculo REF"
                      className="w-full px-4 py-2 rounded-xl border"
                      value={formData.custom_wholesale_price_mn || ''}
                      onChange={e => setFormData({ ...formData, custom_wholesale_price_mn: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all">Guardar Producto</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">Cancelar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const UserModal = ({ 
  catalog, 
  user, 
  onClose, 
  onSave 
}: { 
  catalog?: Catalog, 
  user?: User | null, 
  onClose: () => void, 
  onSave: () => void 
}) => {
  const { user: authUser } = useAuthStore();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    role: user?.role || 'user',
    password: '',
    catalog_id: user?.catalog_id || catalog?.id || '',
    achievements: user?.achievements || []
  });
  const [achievementFiles, setAchievementFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authUser?.role === 'superadmin') {
      dbService.getCatalogs().then(setCatalogs);
    }
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (user) {
        // Update existing profile
        const { password, email, ...updates } = formData;
        
        // Fix UUID error: convert empty string to null
        // Handle achievement uploads
        let finalAchievements = [...formData.achievements];
        if (achievementFiles.length > 0) {
          const uploadPromises = achievementFiles.map(file => {
            const fileName = `${user.id}-achievement-${Date.now()}-${file.name}`;
            return storageService.uploadFile('achievements', file, fileName);
          });
          const newUrls = await Promise.all(uploadPromises);
          finalAchievements = [...finalAchievements, ...newUrls];
        }

        const finalUpdates = {
          ...updates,
          catalog_id: updates.catalog_id || null,
          achievements: finalAchievements
        };
        
        await dbService.updateProfile(user.id, finalUpdates);
        
        // If password is provided and requester is superadmin, update it via API
        if (password && authUser?.role === 'superadmin') {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch('/api/admin/update-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ userId: user.id, newPassword: password })
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al actualizar contraseña');
          }
        }
        
        toast.success('Usuario actualizado');
      } else {
        // Register new user
        await authService.register(
          formData.email,
          formData.password,
          {
            username: formData.username,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            catalog_id: formData.catalog_id || null
          }
        );
        toast.success('Usuario creado');
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <h2 className="text-2xl font-bold mb-6">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" required disabled={!!user}
              className="w-full px-4 py-2 rounded-xl border disabled:bg-gray-50"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
            <input 
              type="text" required
              className="w-full px-4 py-2 rounded-xl border"
              value={formData.full_name || ''}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <input 
              type="text" required
              className="w-full px-4 py-2 rounded-xl border"
              value={formData.username || ''}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input 
              type="tel" required
              className="w-full px-4 py-2 rounded-xl border"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select 
              className="w-full px-4 py-2 rounded-xl border"
              value={formData.role || 'user'}
              onChange={e => setFormData({ ...formData, role: e.target.value as any })}
            >
              <option value="user">Usuario</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrador</option>
              {authUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
            </select>
          </div>
          
          {authUser?.role === 'superadmin' && (formData.role === 'admin' || formData.role === 'editor') && (
            <div>
              <label className="block text-sm font-medium mb-1">Catálogo Asignado</label>
              <select 
                required
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.catalog_id || ''}
                onChange={e => setFormData({ ...formData, catalog_id: e.target.value })}
              >
                <option value="">Seleccionar catálogo...</option>
                {catalogs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {(!user || authUser?.role === 'superadmin') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {user ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
              </label>
              <input 
                type="password" required={!user}
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Logros / Certificados</label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(formData.achievements || []).map((url, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={getImageUrl(url, 'achievements')} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, achievements: (formData.achievements || []).filter((_, idx) => idx !== i) })}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <input 
                    type="file" multiple accept="image/*" className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setAchievementFiles(prev => [...prev, ...files]);
                    }}
                  />
                </label>
              </div>
              {achievementFiles.length > 0 && (
                <p className="text-xs text-orange-600 font-bold">{achievementFiles.length} nuevos archivos seleccionados</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 bg-orange-600 text-white py-2 rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const CatalogAdmin = () => {
  const { slug } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const { setCurrentCatalog } = useCatalogStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null);
  const [editingUser, setEditingUser] = useState<User | null | 'new'>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'product' | 'user' | 'order' | null>(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const { user: authUser } = useAuthStore();
  const navigate = useNavigate();

  const refreshData = async () => {
    if (catalog) {
      try {
        const [productsData, usersData, ordersData] = await Promise.all([
          dbService.getProducts(catalog.id),
          dbService.getUsers(catalog.id),
          dbService.getOrders(catalog.id)
        ]);

        // Auto-deactivate products out of stock for more than 14 days
        const now = new Date();
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        const productsToDeactivate = productsData.filter(p => 
          p.is_active && 
          p.classification === 'out' && 
          p.out_of_stock_at && 
          new Date(p.out_of_stock_at) < fourteenDaysAgo
        );

        if (productsToDeactivate.length > 0) {
          await Promise.all(productsToDeactivate.map(p => 
            dbService.updateProduct(p.id, { is_active: false })
          ));
          // Re-fetch if we updated anything
          const updatedProducts = await dbService.getProducts(catalog.id);
          setProducts(updatedProducts);
        } else {
          setProducts(productsData);
        }

        setUsers(usersData);
        setOrders(ordersData);
      } catch (error) {
        toast.error('Error al cargar datos');
      }
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;
    
    const headers = ['ID', 'Código', 'Nombre', 'Descripción', 'Precio CUP', 'Precio Ref', 'Clasificación', 'Activo', 'Agotado Desde', 'Fotos'];
    const rows = products.map(p => [
      p.id,
      p.code || '',
      p.name,
      (p.description || '').replace(/;/g, ','),
      p.cup_price,
      p.ref_price,
      p.classification || 'normal',
      p.is_active ? 'SÍ' : 'NO',
      p.out_of_stock_at || '',
      (p.photos || []).map(f => getImageUrl(f, 'products')).join('|')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_${catalog?.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !catalog) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(';');
      
      const newProducts = [];
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(';');
        const name = values[2];
        const code = values[1];

        // Skip if name or code already exists
        const exists = products.find(p => p.name === name || (code && p.code === code));
        if (exists) {
          skipped++;
          continue;
        }

        newProducts.push({
          catalog_id: catalog.id,
          code: values[1] || null,
          name: values[2],
          description: values[3] || '',
          cup_price: parseFloat(values[4]) || 0,
          ref_price: parseFloat(values[5]) || 0,
          classification: values[6] || 'new',
          is_active: values[7] === 'SÍ',
          out_of_stock_at: values[6] === 'out' ? new Date().toISOString() : null,
          photos: values[9] ? values[9].split('|').map(url => {
            // If it's a full URL, we might want to just store the path if it's from our storage
            // but for simplicity, we'll just store what's there or handle it
            return url.split('/').pop() || url;
          }) : []
        });
      }

      if (newProducts.length > 0) {
        try {
          await Promise.all(newProducts.map(p => dbService.createProduct(p)));
          refreshData();
          toast.success(`Importados ${newProducts.length} productos. Omitidos ${skipped} duplicados.`);
        } catch (error) {
          toast.error('Error al importar productos');
        }
      } else {
        toast.info(`No se encontraron productos nuevos. Omitidos ${skipped} duplicados.`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  useEffect(() => {
    dbService.getCatalogs().then(data => {
      const found = data.find((c: any) => c.slug === slug);
      if (found) {
        setCatalog(found);
        setCurrentCatalog(found);
      }
    });
  }, [slug, setCurrentCatalog]);

  useEffect(() => {
    if (catalog) {
      refreshData();
    }
  }, [catalog?.id]);

  useEffect(() => {
    if (catalog) {
      setCurrentCatalog(catalog);
    }
  }, [catalog, setCurrentCatalog]);

  const [localExchangeRate, setLocalExchangeRate] = useState(0);
  const [marginInput, setMarginInput] = useState<string>('0');

  useEffect(() => {
    if (catalog) {
      setLocalExchangeRate(catalog.exchange_rate);
      setMarginInput(catalog.settings?.exchange_rate_margin !== undefined ? String(catalog.settings.exchange_rate_margin) : '0');
    }
  }, [catalog?.exchange_rate, catalog?.settings?.exchange_rate_margin]);

  if (!catalog) return <div>Cargando...</div>;

  if (authUser?.catalog_id !== catalog.id && authUser?.role !== 'superadmin') {
    return <div className="p-8 text-center">No tienes acceso a esta administración.</div>;
  }

  const updateSettings = async (newSettings: Partial<Catalog['settings']>) => {
    try {
      const updated = await dbService.updateCatalog(catalog!.id, {
        settings: { ...catalog!.settings, ...newSettings }
      });
      setCatalog(updated);
      setCurrentCatalog(updated);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await dbService.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Producto eliminado');
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await dbService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('Usuario eliminado');
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await dbService.deleteOrder(id);
      setOrders(orders.filter(o => o.id !== id));
      toast.success('Pedido eliminado');
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      toast.error('Error al eliminar pedido');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar catalog={catalog} />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Panel de Control: {catalog.name}</h2>
          <button
            onClick={() => navigate(`/${catalog.slug}/orders`)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-md shadow-orange-100 shrink-0"
          >
            <ClipboardList className="w-5 h-5" />
            <span>Ver Pedidos ({orders.length})</span>
          </button>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <div className="bg-white px-6 py-4 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between border border-orange-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Configuración Global</p>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Tasa de Cambio REF</h3>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-sm font-bold text-gray-500">1.00 REF =</span>
              <div className="flex gap-2 flex-1 sm:flex-none">
                <div className="relative">
                  <input 
                    type="number" 
                    value={localExchangeRate}
                    onChange={(e) => setLocalExchangeRate(parseFloat(e.target.value))}
                    className="w-full sm:w-32 px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none font-bold text-orange-600 text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">MN</span>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const updated = await dbService.updateCatalog(catalog.id, { exchange_rate: localExchangeRate });
                      setCatalog(updated);
                      toast.success('Tasa de cambio actualizada');
                    } catch (error) {
                      toast.error('Error al actualizar tasa de cambio');
                    }
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {[
              { id: 'products', label: 'Productos', icon: Package, roles: ['admin', 'editor', 'superadmin'] },
              { id: 'users', label: 'Usuarios', icon: Users, roles: ['admin', 'superadmin'] },
              { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin', 'superadmin'] },
            ].filter(tab => tab.roles.includes(authUser?.role || '')).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "bg-white text-gray-600 hover:bg-gray-100"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-4 sm:p-8 overflow-hidden">
          {activeTab === 'products' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  <h3 className="text-xl font-bold whitespace-nowrap">Gestión de Productos</h3>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Buscar por nombre o código..."
                      value={adminSearchTerm}
                      onChange={e => setAdminSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setEditingProduct('new')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
              </div>
              <div className="grid gap-4">
                {products.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No hay productos en este catálogo</p>
                  </div>
                ) : (
                  products
                    .filter(p => 
                      p.name.toLowerCase().includes(adminSearchTerm.toLowerCase()) || 
                      (p.code && p.code.toLowerCase().includes(adminSearchTerm.toLowerCase()))
                    )
                    .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                    .map(p => (
                      <div key={p.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition-all gap-4 group overflow-hidden">
                        {/* Interruptor de Activo en la esquina superior derecha */}
                        <div className="absolute top-2 right-2 z-10">
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await dbService.updateProduct(p.id, { is_active: !p.is_active });
                                refreshData();
                                toast.success(p.is_active ? 'Producto desactivado' : 'Producto activado');
                              } catch (error) {
                                toast.error('Error al cambiar estado');
                              }
                            }}
                            className={cn(
                              "relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none",
                              p.is_active !== false ? "bg-orange-600" : "bg-gray-200"
                            )}
                            title={p.is_active !== false ? "Desactivar" : "Activar"}
                          >
                            <span
                              className={cn(
                                "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform",
                                p.is_active !== false ? "translate-x-4" : "translate-x-0.5"
                              )}
                            />
                          </button>
                        </div>

                        {/* Código del Producto (Esquina Inferior Izquierda) */}
                        {p.code && (
                          <div className="absolute bottom-2 left-2 z-10">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-gray-200/50">
                              {p.code}
                            </span>
                          </div>
                        )}

                        {/* Sección Izquierda: Info */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                            {p.photos && p.photos?.[0] && <img src={getImageUrl(p.photos?.[0], 'products')} className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold truncate">{p.name}</p>
                            {(() => {
                              const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);
                              const wholesalePrice = p.custom_wholesale_price_mn || roundPrice((p.ref_price || 0) * effectiveRate);
                              const isRetailDisabled = catalog.settings.sale_type_retail === false;
                              const displayPrice = isRetailDisabled ? wholesalePrice : p.cup_price;
                              return (
                                <p className="text-sm text-gray-500 font-medium">
                                  {formatPrice(displayPrice)}
                                  {isRetailDisabled && (
                                    <span className="text-[10px] text-orange-600 font-bold ml-1.5 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                      Por Mayor
                                    </span>
                                  )}
                                </p>
                              );
                            })()}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                p.classification === 'new' ? "bg-green-100 text-green-700" :
                                p.classification === 'sale' ? "bg-red-100 text-red-700" :
                                p.classification === 'out' ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {p.classification === 'new' ? 'Nuevo' : 
                                 p.classification === 'sale' ? 'En Oferta' : 
                                 p.classification === 'out' ? 'Agotado' : 'Normal'}
                              </span>
                              {!p.is_active && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-gray-200 text-gray-600">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sección Derecha: Botones */}
                        <div className="flex items-center justify-end gap-1 shrink-0 pt-4 sm:pt-0">
                          <button 
                            onClick={() => setEditingProduct(p)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={async () => {
                              const { id, created_at, ...rest } = p;
                              const newProduct = {
                                ...rest,
                                name: `${p.name} 2`,
                                is_active: false
                              };
                              try {
                                await dbService.createProduct(newProduct);
                                refreshData();
                                toast.success('Producto duplicado (desactivado)');
                              } catch (error) {
                                toast.error('Error al duplicar producto');
                              }
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Publicar (Duplicar)"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setDeletingId(p.id);
                              setDeletingType('product');
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              {/* Estadísticas */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">En Oferta</p>
                  <p className="text-2xl font-black text-orange-900">{products.filter(p => p.classification === 'sale').length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Nuevos</p>
                  <p className="text-2xl font-black text-green-900">{products.filter(p => p.classification === 'new').length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Disponibles</p>
                  <p className="text-2xl font-black text-blue-900">
                    {products.filter(p => p.is_active && (p.classification === 'sale' || p.classification === 'new' || p.classification === 'stock' || !p.classification)).length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">Agotados/Inactivos</p>
                  <p className="text-2xl font-black text-gray-900">
                    {products.filter(p => !p.is_active || p.classification === 'out').length}
                  </p>
                </div>
              </div>

              {/* Botones de Import/Export */}
              <div className="mt-8 flex flex-wrap gap-4 border-t pt-8">
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" /> Exportar CSV (;)
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors cursor-pointer">
                  <UploadIcon className="w-4 h-4" /> Importar CSV (;)
                  <input type="file" accept=".csv" className="hidden" onChange={importFromCSV} />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between mb-6">
                <h3 className="text-xl font-bold">Gestión de Usuarios</h3>
                <button 
                  onClick={() => setEditingUser('new')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
              </div>
              <div className="grid gap-4">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50">
                    <div>
                      <p className="font-bold">{u.email}</p>
                      <p className="text-sm text-gray-500 uppercase">{u.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingId(u.id);
                          setDeletingType('user');
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <h3 className="text-xl font-bold">Configuración del Catálogo</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Catálogo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={catalog.name || ''}
                      onChange={e => setCatalog({ ...catalog, name: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none font-bold"
                    />
                    <button 
                      onClick={async () => {
                        try {
                          const updated = await dbService.updateCatalog(catalog.id, { name: catalog.name });
                          setCatalog(updated);
                          toast.success('Nombre actualizado');
                        } catch (error) {
                          toast.error('Error al actualizar nombre');
                        }
                      }}
                      className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>

              {/* Tipo de Venta Configuration */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xl font-bold mb-1">Tipo de Venta</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Configura los tipos de venta disponibles en el catálogo. Si desmarcas una opción, se ocultarán todas las opciones y precios correspondientes.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Switch Venta Mayorista */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Venta Mayorista</p>
                      <p className="text-xs text-gray-500">Muestra precios por mayor y REF</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const nextVal = catalog.settings.sale_type_wholesale === false ? true : false;
                        updateSettings({ sale_type_wholesale: nextVal });
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0",
                        catalog.settings.sale_type_wholesale !== false ? "bg-orange-600" : "bg-gray-300"
                      )}
                    >
                      <span 
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                          catalog.settings.sale_type_wholesale !== false ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* Switch Venta Minorista */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Venta al por Menor</p>
                      <p className="text-xs text-gray-500">Muestra precios minoristas CUP</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const nextVal = catalog.settings.sale_type_retail === false ? true : false;
                        updateSettings({ sale_type_retail: nextVal });
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0",
                        catalog.settings.sale_type_retail !== false ? "bg-orange-600" : "bg-gray-300"
                      )}
                    >
                      <span 
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                          catalog.settings.sale_type_retail !== false ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Margen de Tasa de Cambio */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-xl font-bold">Margen de Tasa de Cambio</h3>
                <p className="text-xs text-gray-500">
                  Si está en 0 no se aplica. Si pones alguna cifra, se le sumará a la tasa de cambio base. Por ejemplo: si la tasa está en {catalog.exchange_rate} MN y pones un margen de 20 MN, la tasa para el cálculo de la venta en MN será {catalog.exchange_rate + (parseFloat(marginInput) || 0)} MN.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      placeholder="0"
                      value={marginInput}
                      onChange={e => setMarginInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none font-bold text-gray-800 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">MN</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const numMargin = parseFloat(marginInput) || 0;
                      await updateSettings({ exchange_rate_margin: numMargin });
                    }}
                    className="px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shrink-0 shadow-sm"
                  >
                    Guardar Margen
                  </button>
                  <div className="text-xs font-bold text-orange-700 bg-orange-50 px-4 py-3 rounded-xl border border-orange-100 flex items-center gap-2">
                    <span>Tasa de Cambio Efectiva:</span>
                    <span className="text-sm font-black text-orange-600">{catalog.exchange_rate + (parseFloat(marginInput) || 0)} MN</span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold pt-4">Personalización Visual</h3>
              
              <div className="p-6 border-2 border-dashed rounded-3xl flex flex-col items-center gap-4">
                <p className="font-bold text-gray-500">Logo del Catálogo</p>
                {catalog.settings.logo ? (
                  <img src={getImageUrl(catalog.settings.logo, 'logos')} alt="Logo" className="h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
                    <UploadIcon className="w-8 h-8" />
                  </div>
                )}
                <input 
                  type="file" 
                  id="logo-upload" 
                  className="hidden" 
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      try {
                        const file = e.target.files?.[0];
                        const fileName = `logo-${catalog.id}-${Date.now()}-${file.name}`;
                        const publicUrl = await storageService.uploadFile('logos', file, fileName);
                        const updated = await dbService.updateCatalog(catalog.id, {
                          settings: { ...catalog.settings, logo: publicUrl }
                        });
                        setCatalog(updated);
                        toast.success('Logo actualizado');
                      } catch (error) {
                        toast.error('Error al subir logo');
                      }
                    }
                  }}
                />
                <label htmlFor="logo-upload" className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold cursor-pointer hover:bg-orange-700 transition-colors">
                  Subir Logo
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Color de Fondo</label>
                  <input 
                    type="color" 
                    value={catalog.settings.bg_color || '#ffffff'}
                    onChange={e => updateSettings({ bg_color: e.target.value })}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color de Texto</label>
                  <input 
                    type="color" 
                    value={catalog.settings.text_color || '#000000'}
                    onChange={e => updateSettings({ text_color: e.target.value })}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color de Ventanas</label>
                  <input 
                    type="color" 
                    value={catalog.settings.window_color || '#ffffff'}
                    onChange={e => updateSettings({ window_color: e.target.value })}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <h3 className="text-xl font-bold pt-4">Configuración de Barras</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="font-bold text-sm text-gray-500 uppercase tracking-wider">Barra Superior</p>
                  <div>
                    <label className="block text-xs font-medium mb-1">Color de Fondo</label>
                    <input 
                      type="color" 
                      value={catalog.settings.top_bar_color || '#ffffff'}
                      onChange={e => updateSettings({ top_bar_color: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Color de Texto</label>
                    <input 
                      type="color" 
                      value={catalog.settings.top_bar_text_color || '#000000'}
                      onChange={e => updateSettings({ top_bar_text_color: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Fuente</label>
                    <select 
                      value={catalog.settings.top_bar_font || 'Inter'}
                      onChange={e => updateSettings({ top_bar_font: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm"
                    >
                      {FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="font-bold text-sm text-gray-500 uppercase tracking-wider">Barra Inferior</p>
                  <div>
                    <label className="block text-xs font-medium mb-1">Color de Fondo</label>
                    <input 
                      type="color" 
                      value={catalog.settings.bottom_bar_color || '#ffffff'}
                      onChange={e => updateSettings({ bottom_bar_color: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Color de Texto</label>
                    <input 
                      type="color" 
                      value={catalog.settings.bottom_bar_text_color || '#000000'}
                      onChange={e => updateSettings({ bottom_bar_text_color: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Fuente</label>
                    <select 
                      value={catalog.settings.bottom_bar_font || 'Inter'}
                      onChange={e => updateSettings({ bottom_bar_font: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm"
                    >
                      {FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold pt-4">Información del Pie de Página</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Acerca de</label>
                  <textarea 
                    value={catalog.settings.footer?.about || ''}
                    onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, about: e.target.value } } })}
                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none h-32"
                    placeholder="Describe tu negocio..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Horario</label>
                    <input 
                      type="text"
                      value={catalog.settings.footer?.schedule || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, schedule: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="Lunes a Viernes 9am - 6pm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email de Contacto</label>
                    <input 
                      type="email"
                      value={catalog.settings.footer?.email || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, email: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="contacto@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <input 
                      type="tel"
                      value={catalog.settings.footer?.phone || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, phone: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="+53 55555555"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">WhatsApp</label>
                    <input 
                      type="text"
                      value={catalog.settings.footer?.whatsapp || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, whatsapp: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="5355555555"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dirección</label>
                    <input 
                      type="text"
                      value={catalog.settings.footer?.address || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, address: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="Calle 123 # 45-67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL de Ubicación (Google Maps)</label>
                    <input 
                      type="text"
                      value={catalog.settings.footer?.map_url || ''}
                      onChange={e => setCatalog({ ...catalog, settings: { ...catalog.settings, footer: { ...catalog.settings.footer, map_url: e.target.value } } })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                      placeholder="https://goo.gl/maps/..."
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => updateSettings({ footer: catalog.settings.footer })}
                    className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
                  >
                    Guardar Cambios del Pie de Página
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {deletingId && deletingType && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                ¿Eliminar {deletingType === 'product' ? 'producto' : deletingType === 'user' ? 'usuario' : 'pedido'}?
              </h3>
              <p className="text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (deletingType === 'product') deleteProduct(deletingId);
                    else if (deletingType === 'user') deleteUser(deletingId);
                    else if (deletingType === 'order') deleteOrder(deletingId);
                  }}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
                >
                  Eliminar
                </button>
                <button 
                  onClick={() => {
                    setDeletingId(null);
                    setDeletingType(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {editingProduct && (
          <ProductModal 
            catalog={catalog}
            product={editingProduct === 'new' ? null : editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={refreshData}
          />
        )}
        {editingUser && (
          <UserModal 
            catalog={catalog}
            user={editingUser === 'new' ? null : editingUser}
            onClose={() => setEditingUser(null)}
            onSave={refreshData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user: authUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'types' | 'settings'>('users');
  const [editingUser, setEditingUser] = useState<User | null | 'new'>(null);
  const [editingType, setEditingType] = useState<ProductType | null | 'new'>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'user' | 'type' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const refreshData = async () => {
    try {
      const [usersData, catalogsData, typesData, settingsData] = await Promise.all([
        dbService.getUsers(),
        dbService.getCatalogs(),
        dbService.getProductTypes(),
        dbService.getGlobalSettings()
      ]);
      setUsers(usersData);
      setCatalogs(catalogsData);
      setProductTypes(typesData);
      setGlobalSettings(settingsData || {
        footer: { about: '', schedule: '', email: '', phone: '', whatsapp: '', address: '', map_url: '' },
        logo: null,
        top_bar_color: '#ffffff',
        top_bar_text_color: '#000000',
        bottom_bar_color: '#ffffff',
        bottom_bar_text_color: '#000000',
        bg_color: '#f9fafb',
        font_family: 'Inter'
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error al cargar datos');
    }
  };

  useEffect(() => {
    if (!authUser || authUser.role !== 'superadmin') {
      navigate('/');
      return;
    }
    refreshData();
  }, [authUser]);

  const deleteUser = async (id: string) => {
    try {
      // Note: Supabase Auth users need to be deleted via admin API or manually
      // For now we just delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
      toast.success('Usuario eliminado');
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const deleteType = async (id: string) => {
    try {
      await dbService.deleteProductType(id);
      setProductTypes(productTypes.filter(t => t.id !== id));
      toast.success('Tipo eliminado');
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      toast.error('Error al eliminar tipo');
    }
  };

  const saveGlobalSettings = async () => {
    if (!globalSettings) return;
    setIsSaving(true);
    try {
      await dbService.updateGlobalSettings(globalSettings);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Panel de Super Administrador</h2>
        
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap", activeTab === 'users' ? "bg-orange-600 text-white" : "bg-white text-gray-600")}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('types')}
            className={cn("px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap", activeTab === 'types' ? "bg-orange-600 text-white" : "bg-white text-gray-600")}
          >
            Tipos de Producto
          </button>
          <button 
            onClick={() => setActiveTab('settings' as any)}
            className={cn("px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap", activeTab === ('settings' as any) ? "bg-orange-600 text-white" : "bg-white text-gray-600")}
          >
            Configuración
          </button>
        </div>

        <div className="bg-white rounded-[2rem] sm:rounded-3xl shadow-sm p-4 sm:p-8">
          {activeTab === 'users' ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold">Gestión Global de Usuarios</h3>
                <button 
                  onClick={() => setEditingUser('new')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
              </div>

              <div className="grid gap-4">
                {users.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border rounded-3xl hover:bg-gray-50 transition-all shadow-sm gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl shrink-0">
                        {u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900 truncate">{u.username || 'Sin nombre'}</p>
                          <span className="px-2 py-0.5 bg-gray-100 rounded-lg text-[10px] font-bold uppercase text-gray-500 shrink-0">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{u.email}</p>
                        {u.catalog_id && (
                          <p className="text-xs text-orange-600 font-medium mt-1 truncate">
                            Catálogo: {catalogs.find(c => c.id === u.catalog_id)?.name || u.catalog_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                        title="Editar Usuario"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingId(u.id);
                          setDeletingType('user');
                        }}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : activeTab === 'types' ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Tipos de Producto</h3>
                <button 
                  onClick={() => setEditingType('new')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Tipo
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productTypes.map(t => (
                  <div key={t.id} className="p-4 border rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="font-bold">{t.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingType(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button 
                        onClick={() => {
                          setDeletingId(t.id);
                          setDeletingType('type');
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-4xl space-y-12">
              <section className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-orange-600" />
                  Personalización Visual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Logo de la App</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        {globalSettings?.logo ? (
                          <img src={getImageUrl(globalSettings.logo, 'logos')} className="w-full h-full object-contain" />
                        ) : (
                          <Cat className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <input 
                        type="file" accept="image/*" className="hidden" id="global-logo"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file && globalSettings) {
                            try {
                              const fileName = `global-logo-${Date.now()}-${file.name}`;
                              const publicUrl = await storageService.uploadFile('logos', file, fileName);
                              setGlobalSettings({ ...globalSettings, logo: publicUrl });
                              toast.success('Logo subido (recuerda guardar)');
                            } catch (error) {
                              toast.error('Error al subir logo');
                            }
                          }
                        }}
                      />
                      <label htmlFor="global-logo" className="px-4 py-2 bg-white border rounded-xl font-bold text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                        Cambiar Logo
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Tipografía</label>
                    <select 
                      value={globalSettings?.font_family || 'Inter'}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, font_family: e.target.value } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-white focus:border-orange-500 outline-none bg-white font-bold"
                    >
                      <option value="Inter">Inter (Sans)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Playfair Display">Playfair Display (Serif)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Color de Fondo</label>
                    <div className="flex gap-3">
                      <input 
                        type="color"
                        value={globalSettings?.bg_color || '#f9fafb'}
                        onChange={e => setGlobalSettings(prev => prev ? { ...prev, bg_color: e.target.value } : null)}
                        className="w-12 h-12 rounded-xl border-none cursor-pointer"
                      />
                      <input 
                        type="text"
                        value={globalSettings?.bg_color || '#f9fafb'}
                        onChange={e => setGlobalSettings(prev => prev ? { ...prev, bg_color: e.target.value } : null)}
                        className="flex-1 px-4 py-2 rounded-xl border bg-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <h4 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Barra Superior</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Fondo</label>
                        <input 
                          type="color"
                          value={globalSettings?.top_bar_color || '#ffffff'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, top_bar_color: e.target.value } : null)}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Texto</label>
                        <input 
                          type="color"
                          value={globalSettings?.top_bar_text_color || '#000000'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, top_bar_text_color: e.target.value } : null)}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold mb-1">Fuente</label>
                        <select 
                          value={globalSettings?.top_bar_font || 'Inter'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, top_bar_font: e.target.value } : null)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm font-bold"
                        >
                          {FONTS.map(font => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <h4 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Barra Inferior</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Fondo</label>
                        <input 
                          type="color"
                          value={globalSettings?.bottom_bar_color || '#ffffff'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, bottom_bar_color: e.target.value } : null)}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Texto</label>
                        <input 
                          type="color"
                          value={globalSettings?.bottom_bar_text_color || '#000000'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, bottom_bar_text_color: e.target.value } : null)}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold mb-1">Fuente</label>
                        <select 
                          value={globalSettings?.bottom_bar_font || 'Inter'}
                          onChange={e => setGlobalSettings(prev => prev ? { ...prev, bottom_bar_font: e.target.value } : null)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm font-bold"
                        >
                          {FONTS.map(font => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-600" />
                  Pie de Página Global
                </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Acerca de</label>
                  <textarea 
                    value={globalSettings?.footer.about || ''}
                    onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, about: e.target.value } } : null)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none h-32"
                    placeholder="Información sobre la plataforma..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Horario</label>
                    <input 
                      type="text"
                      value={globalSettings?.footer.schedule || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, schedule: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input 
                      type="email"
                      value={globalSettings?.footer.email || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, email: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <input 
                      type="tel"
                      value={globalSettings?.footer.phone || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, phone: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">WhatsApp</label>
                    <input 
                      type="text"
                      value={globalSettings?.footer.whatsapp || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, whatsapp: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dirección</label>
                    <input 
                      type="text"
                      value={globalSettings?.footer.address || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, address: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL de Ubicación (Google Maps)</label>
                    <input 
                      type="text"
                      value={globalSettings?.footer.map_url || ''}
                      onChange={e => setGlobalSettings(prev => prev ? { ...prev, footer: { ...prev.footer, map_url: e.target.value } } : null)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

              <div className="pt-8 border-t">
                <button 
                  onClick={saveGlobalSettings}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-12 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {deletingId && deletingType && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                ¿Eliminar {deletingType === 'user' ? 'usuario' : 'tipo de producto'}?
              </h3>
              <p className="text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (deletingType === 'user') deleteUser(deletingId);
                    else if (deletingType === 'type') deleteType(deletingId);
                  }}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
                >
                  Eliminar
                </button>
                <button 
                  onClick={() => {
                    setDeletingId(null);
                    setDeletingType(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {editingUser && (
          <UserModal 
            user={editingUser === 'new' ? null : editingUser}
            onClose={() => setEditingUser(null)}
            onSave={refreshData}
          />
        )}
        {editingType && (
          <ProductTypeModal 
            type={editingType === 'new' ? null : editingType}
            onClose={() => setEditingType(null)}
            onSave={refreshData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductTypeModal = ({ 
  type, 
  onClose, 
  onSave 
}: { 
  type?: ProductType | null, 
  onClose: () => void, 
  onSave: () => void 
}) => {
  const [formData, setFormData] = useState<Partial<ProductType>>(type || {
    name: '',
    emoji: '📦'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type?.id) {
        await dbService.updateProductType(type.id, formData);
      } else {
        await dbService.createProductType(formData as Omit<ProductType, 'id'>);
      }
      toast.success('Tipo guardado');
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error al guardar el tipo');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-6">{type ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input 
              type="text" required
              className="w-full px-4 py-2 rounded-xl border"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Emoji</label>
            <input 
              type="text" required
              className="w-full px-4 py-2 rounded-xl border text-center text-2xl"
              value={formData.emoji || ''}
              onChange={e => setFormData({ ...formData, emoji: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded-xl font-bold hover:bg-orange-700">Guardar</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AuthPage = ({ type }: { type: 'login' | 'register' }) => {
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (type === 'register' && password !== repeatPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      if (type === 'login') {
        const data = await authService.login(identifier, password);
        if (data.user) {
          let profile = await authService.getProfile(data.user.id);
          
          // Bootstrap Super Admin if email matches
          if (data.user.email?.toLowerCase() === 'frandyj91@gmail.com' && profile.role !== 'superadmin') {
            try {
              profile = await dbService.updateProfile(profile.id, { role: 'superadmin' });
            } catch (e) {
              console.warn('Could not auto-promote to superadmin via frontend. Please run SQL command in Supabase dashboard.');
            }
          }

          setAuth(profile, data.session);
          toast.success('Bienvenido');
          navigate('/');
        }
      } else {
        const isSuperAdmin = email.toLowerCase() === 'frandyj91@gmail.com';
        await authService.register(email, password, {
          username,
          full_name: fullName,
          phone,
          role: isSuperAdmin ? 'superadmin' : 'user'
        });
        toast.success('Registro completado, revisa tu email si es necesario o entra');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[95vh] overflow-y-auto"
      >
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5 sm:w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 sm:mb-8 text-orange-600 font-bold text-xl sm:text-2xl">
          <Cat className="w-8 h-8 sm:w-10 h-10" />
          TuCATalogo
        </Link>
        <h2 className="text-2xl font-bold text-center mb-8">{type === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'login' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email o Usuario</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={identifier || ''}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                  value={fullName || ''}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                  value={username || ''}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                  value={email || ''}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                  value={phone || ''}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
              value={password || ''}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {type === 'login' && (
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="keepLoggedIn"
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                checked={keepLoggedIn}
                onChange={e => setKeepLoggedIn(e.target.checked)}
              />
              <label htmlFor="keepLoggedIn" className="text-sm text-gray-600 cursor-pointer">Mantener conectado</label>
            </div>
          )}
          {type === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repetir Contraseña</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none"
                value={repeatPassword || ''}
                onChange={e => setRepeatPassword(e.target.value)}
              />
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : (type === 'login' ? 'Entrar' : 'Registrarse')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          {type === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <Link to={type === 'login' ? '/register' : '/login'} className="ml-1 text-orange-600 font-bold">
            {type === 'login' ? 'Regístrate' : 'Entra'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

// --- SELECT PRODUCT MODAL ---

const SelectProductModal = ({
  products,
  catalog,
  onClose,
  onSelectProduct
}: {
  products: Product[],
  catalog: Catalog,
  onClose: () => void,
  onSelectProduct: (product: Product, quantity: number, price: number) => void
}) => {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const effectiveRate = catalog.exchange_rate + (catalog.settings.exchange_rate_margin || 0);

  const getProductPrice = (p: Product) => {
    const wholesalePrice = p.custom_wholesale_price_mn || roundPrice(p.ref_price * effectiveRate);
    if (catalog.settings.sale_type_retail === false) {
      return wholesalePrice;
    }
    return p.cup_price || wholesalePrice || 0;
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">Seleccionar Producto</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {!selectedProduct ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No se encontraron productos</p>
              ) : (
                filtered.map(p => {
                  const price = getProductPrice(p);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setQuantity(p.min_wholesale_qty || 1);
                      }}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-orange-50/60 border border-gray-100 cursor-pointer transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {p.photos?.[0] && <img src={getImageUrl(p.photos[0], 'products')} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.name}</p>
                        {p.code && <span className="text-[10px] font-extrabold text-gray-400 uppercase">[{p.code}]</span>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-orange-600 text-sm">{formatPrice(price)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6 my-auto py-4">
            <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0">
                {selectedProduct.photos?.[0] && <img src={getImageUrl(selectedProduct.photos[0], 'products')} className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm font-black text-orange-600">{formatPrice(getProductPrice(selectedProduct))} / ud.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cantidad a Añadir</label>
              <div className="flex items-center justify-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-white rounded-xl font-bold shadow-sm hover:bg-gray-100 text-lg"
                >
                  -
                </button>
                <input 
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center font-black text-xl bg-transparent outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-white rounded-xl font-bold shadow-sm hover:bg-gray-100 text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  const price = getProductPrice(selectedProduct);
                  onSelectProduct(selectedProduct, quantity, price);
                  onClose();
                }}
                className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
              >
                Añadir al Pedido ({formatPrice(getProductPrice(selectedProduct) * quantity)})
              </button>
              <button 
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- EDIT ORDER MODAL ---

const EditOrderModal = ({
  order,
  catalog,
  products,
  onClose,
  onSave
}: {
  order: Order,
  catalog: Catalog,
  products: Product[],
  onClose: () => void,
  onSave: () => void
}) => {
  const [items, setItems] = useState<any[]>([...(order.items || [])]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateQty = (index: number, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = (product: Product, quantity: number, price: number) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.product_id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity
        };
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_code: product.code,
          name: product.name,
          quantity,
          price
        }
      ];
    });
  };

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('El pedido debe tener al menos un producto');
      return;
    }
    setIsSaving(true);
    try {
      await dbService.updateOrder(order.id, { items });
      toast.success('Pedido modificado con éxito');
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error al guardar cambios en el pedido');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Editar Pedido #{order.id.slice(-6).toUpperCase()}</h3>
            <p className="text-xs text-gray-400">Modifica productos y cantidades</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Productos en el Pedido</span>
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Producto
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-6">
          {items.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium text-sm">No hay productos en este pedido</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                  {item.product_code && <span className="text-[10px] text-gray-400 font-extrabold uppercase">[{item.product_code}]</span>}
                  <p className="text-xs text-orange-600 font-bold">{formatPrice(item.price)} c/u</p>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => handleUpdateQty(idx, -1)}
                    className="w-7 h-7 hover:bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600 text-sm"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                    }}
                    className="w-10 text-center font-bold text-sm bg-transparent outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => handleUpdateQty(idx, 1)}
                    className="w-7 h-7 hover:bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600 text-sm"
                  >
                    +
                  </button>
                </div>

                <div className="text-right shrink-0 min-w-[70px]">
                  <span className="font-extrabold text-sm text-gray-900 block">{formatPrice(item.price * item.quantity)}</span>
                </div>

                <button 
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 font-bold">Total Actualizado</span>
            <span className="text-2xl font-black text-orange-600">{formatPrice(total)}</span>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>

        {showAddModal && (
          <SelectProductModal 
            products={products}
            catalog={catalog}
            onClose={() => setShowAddModal(false)}
            onSelectProduct={handleAddProduct}
          />
        )}
      </motion.div>
    </div>
  );
};

// --- NEW ORDER MODAL ---

const NewOrderModal = ({
  catalog,
  products,
  onClose,
  onSave
}: {
  catalog: Catalog,
  products: Product[],
  onClose: () => void,
  onSave: () => void
}) => {
  const [userMode, setUserMode] = useState<'select' | 'create'>('select');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    full_name: '',
    phone: ''
  });

  const [items, setItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dbService.getUsers(catalog.id).then(data => {
      const catalogUsers = data || [];
      setUsers(catalogUsers);
      if (catalogUsers.length > 0) {
        setSelectedUserId(catalogUsers[0].id);
      }
    });
  }, [catalog.id]);

  const handleUpdateQty = (index: number, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = (product: Product, quantity: number, price: number) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.product_id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity
        };
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_code: product.code,
          name: product.name,
          quantity,
          price
        }
      ];
    });
  };

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Debes añadir al menos un producto al pedido');
      return;
    }

    let targetUserId = selectedUserId;

    setIsSaving(true);
    try {
      if (userMode === 'create') {
        if (!newUser.email || !newUser.username) {
          toast.error('Ingresa email y nombre de usuario');
          setIsSaving(false);
          return;
        }
        const createdId = crypto.randomUUID();
        await dbService.updateProfile(createdId, {
          id: createdId,
          email: newUser.email,
          username: newUser.username,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: 'user',
          catalog_id: catalog.id
        });
        targetUserId = createdId;
      }

      if (!targetUserId) {
        toast.error('Selecciona o crea un usuario para el pedido');
        setIsSaving(false);
        return;
      }

      await dbService.createOrder({
        catalog_id: catalog.id,
        user_id: targetUserId,
        items,
        status: 'pending'
      });

      toast.success('Nuevo pedido registrado con éxito');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al registrar el pedido');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Nuevo Pedido</h3>
            <p className="text-xs text-gray-400">Registrar pedido desde la administración</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleCreateOrder} className="flex-1 flex flex-col min-h-0 space-y-6">
          {/* User selection / creation */}
          <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-100 space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Cliente del Pedido</span>
              <div className="flex bg-white p-1 rounded-xl border border-orange-200">
                <button 
                  type="button"
                  onClick={() => setUserMode('select')}
                  className={cn("px-2.5 py-1 text-xs font-bold rounded-lg transition-all", userMode === 'select' ? "bg-orange-600 text-white shadow-sm" : "text-gray-600")}
                >
                  Existente
                </button>
                <button 
                  type="button"
                  onClick={() => setUserMode('create')}
                  className={cn("px-2.5 py-1 text-xs font-bold rounded-lg transition-all", userMode === 'create' ? "bg-orange-600 text-white shadow-sm" : "text-gray-600")}
                >
                  Nuevo Usuario
                </button>
              </div>
            </div>

            {userMode === 'select' ? (
              users.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No hay usuarios registrados en este catálogo. Selecciona 'Nuevo Usuario'.</p>
              ) : (
                <select 
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-800 outline-none"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email}) {u.full_name ? `- ${u.full_name}` : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <input 
                  type="email" 
                  placeholder="Correo Electrónico *"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Nombre de Usuario *"
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Nombre Completo"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium outline-none"
                />
                <input 
                  type="tel" 
                  placeholder="Teléfono"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium outline-none"
                />
              </div>
            )}
          </div>

          {/* Items selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Productos</span>
              <button 
                type="button"
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Producto
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 border rounded-2xl p-3 bg-gray-50/50">
              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 font-medium text-xs">Haz clic en "Añadir Producto" para agregar ítems al pedido</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-orange-600 font-bold">{formatPrice(item.price)} c/u</p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1 shrink-0">
                      <button 
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-7 h-7 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-7 h-7 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 text-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <span className="font-extrabold text-sm text-gray-900 block">{formatPrice(item.price * item.quantity)}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 font-bold">Total del Pedido</span>
              <span className="text-2xl font-black text-orange-600">{formatPrice(total)}</span>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"
              >
                {isSaving ? 'Creando...' : 'Crear Pedido'}
              </button>
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>

        {showAddModal && (
          <SelectProductModal 
            products={products}
            catalog={catalog}
            onClose={() => setShowAddModal(false)}
            onSelectProduct={handleAddProduct}
          />
        )}
      </motion.div>
    </div>
  );
};

// --- CATALOG ORDERS PAGE ---

const CatalogOrdersPage = () => {
  const { slug } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const { setCurrentCatalog } = useCatalogStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'ready'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const { user: authUser } = useAuthStore();
  const navigate = useNavigate();

  const refreshOrders = async () => {
    if (catalog) {
      try {
        const ordersData = await dbService.getOrders(catalog.id);
        setOrders(ordersData || []);
      } catch (error) {
        toast.error('Error al cargar pedidos');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (catalog?.id) {
      dbService.getProducts(catalog.id).then(data => setProducts(data || []));
    }
  }, [catalog?.id]);

  useEffect(() => {
    dbService.getCatalogs().then(data => {
      const found = data.find((c: any) => c.slug === slug);
      if (found) {
        setCatalog(found);
        setCurrentCatalog(found);
      } else {
        setLoading(false);
      }
    });
  }, [slug, setCurrentCatalog]);

  useEffect(() => {
    if (catalog) {
      refreshOrders();
    }
  }, [catalog?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-bold">Cargando pedidos...</p>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 font-bold mb-4">Catálogo no encontrado</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold">
          Ir al Inicio
        </button>
      </div>
    );
  }

  const isCatalogAdmin = authUser && (authUser.role === 'superadmin' || (authUser.catalog_id === catalog.id && (authUser.role === 'admin' || authUser.role === 'editor')));

  if (!isCatalogAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar catalog={catalog} />
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl text-center shadow-sm border border-gray-100">
          <p className="text-lg font-bold text-gray-900 mb-2">Acceso Denegado</p>
          <p className="text-sm text-gray-500 mb-6">No tienes permisos de administración para ver los pedidos de este catálogo.</p>
          <button onClick={() => navigate(`/${catalog.slug}`)} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold">
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  // Filter groups
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const processingOrders = orders.filter(o => o.status === 'processing');
  const readyOrders = orders.filter(o => o.status === 'ready' || o.status === 'completed');

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'pending' && o.status !== 'pending') return false;
    if (filterStatus === 'processing' && o.status !== 'processing') return false;
    if (filterStatus === 'ready' && (o.status !== 'ready' && o.status !== 'completed')) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = o.id.toLowerCase().includes(term);
      const matchItems = (o.items || []).some(i => 
        i.name.toLowerCase().includes(term) || (i.product_code && i.product_code.toLowerCase().includes(term))
      );
      return matchId || matchItems;
    }
    return true;
  });

  const handleDeleteOrder = async (id: string) => {
    try {
      await dbService.deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Pedido eliminado');
      setDeletingId(null);
    } catch (error) {
      toast.error('Error al eliminar pedido');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await dbService.updateOrder(id, { status: newStatus });
      toast.success(`Pedido actualizado a: ${
        newStatus === 'processing' ? 'Tramitado' : 
        newStatus === 'ready' ? 'Listo' : 'Entregado'
      }`);
      refreshOrders();
    } catch (error) {
      toast.error('Error al actualizar estado del pedido');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar catalog={catalog} />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to={`/${catalog.slug}`} className="hover:text-orange-600 font-medium">Catálogo</Link>
              <span>/</span>
              <span className="font-bold text-gray-800">Gestión de Pedidos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pedidos de {catalog.name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Pedido</span>
            </button>
            <Link 
              to={`/${catalog.slug}/admin`} 
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Panel de Control</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === 'all' ? "bg-orange-600 text-white shadow-md shadow-orange-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
              )}
            >
              <span>Todos</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", filterStatus === 'all' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600")}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('pending')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === 'pending' ? "bg-amber-500 text-white shadow-md shadow-amber-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
              )}
            >
              <span>Solicitados</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", filterStatus === 'pending' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700")}>
                {pendingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('processing')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === 'processing' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
              )}
            >
              <span>Tramitados</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", filterStatus === 'processing' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700")}>
                {processingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('ready')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === 'ready' ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-100"
              )}
            >
              <span>Listos / Entregados</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", filterStatus === 'ready' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
                {readyOrders.length}
              </span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por código, ítem, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-200 focus:border-orange-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-bold">No hay pedidos en esta sección</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? 'Intenta con otra búsqueda' : 'Los nuevos pedidos aparecerán aquí cuando los clientes realicen un encargo.'}
              </p>
            </div>
          ) : (
            filteredOrders.map(o => {
              const statusMap: Record<string, { label: string, color: string }> = {
                pending: { label: 'Solicitado', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                processing: { label: 'Tramitado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                ready: { label: 'Listo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                completed: { label: 'Entregado', color: 'bg-gray-100 text-gray-700 border-gray-200' }
              };
              const status = statusMap[o.status] || { label: o.status, color: 'bg-gray-100 text-gray-700' };

              return (
                <div key={o.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-base text-gray-900">Pedido #{o.id.slice(-6).toUpperCase()}</p>
                        <span className={cn("px-3 py-0.5 rounded-full text-xs font-bold uppercase border", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingOrder(o)}
                        className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                        title="Editar Pedido"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button 
                        onClick={() => setDeletingId(o.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2 mb-4 border border-gray-100">
                    {(o.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md text-xs">{item.quantity}x</span>
                          <span className="text-gray-800 font-medium">
                            {item.product_code && <span className="font-bold text-gray-900 mr-1.5">[{item.product_code}]</span>}
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total del Pedido</span>
                      <p className="text-xl font-black text-gray-900">
                        {formatPrice((o.items || []).reduce((acc, i) => acc + i.price * i.quantity, 0))}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {o.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(o.id, 'processing')}
                          className="text-xs font-bold px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all"
                        >
                          Tramitar Pedido
                        </button>
                      )}
                      {o.status === 'processing' && (
                        <button 
                          onClick={() => handleUpdateStatus(o.id, 'ready')}
                          className="text-xs font-bold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition-all"
                        >
                          Marcar como Listo
                        </button>
                      )}
                      {o.status === 'ready' && (
                        <button 
                          onClick={() => handleUpdateStatus(o.id, 'completed')}
                          className="text-xs font-bold px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 shadow-sm transition-all"
                        >
                          Marcar como Entregado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center"
          >
            <h3 className="font-bold text-lg mb-2">¿Eliminar pedido?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleDeleteOrder(deletingId)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal 
          order={editingOrder}
          catalog={catalog}
          products={products}
          onClose={() => setEditingOrder(null)}
          onSave={refreshOrders}
        />
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <NewOrderModal 
          catalog={catalog}
          products={products}
          onClose={() => setShowNewOrderModal(false)}
          onSave={refreshOrders}
        />
      )}
    </div>
  );
};

// --- FAVICON HANDLER ---

const FaviconHandler = () => {
  const { currentCatalog } = useCatalogStore();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    dbService.getGlobalSettings().then(setGlobalSettings);
  }, []);

  useEffect(() => {
    const logo = currentCatalog?.settings.logo || globalSettings?.logo;
    const faviconUrl = logo ? getImageUrl(logo, 'logos') : '/favicon.ico';
    
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
  }, [currentCatalog, globalSettings]);

  return null;
};

// --- APP ---

export default function App() {
  const { setAuth } = useAuthStore();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        authService.getProfile(session.user.id).then(profile => {
          setAuth(profile, session);
        }).catch(err => {
          console.error('Error fetching profile:', err);
          setAuth(null, null);
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        authService.getProfile(session.user.id).then(profile => {
          setAuth(profile, session);
        }).catch(err => {
          console.error('Error fetching profile:', err);
          setAuth(null, null);
        });
      } else {
        setAuth(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <FaviconHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage type="login" />} />
        <Route path="/register" element={<AuthPage type="register" />} />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="/:slug" element={<CatalogView />} />
        <Route path="/:slug/admin" element={<CatalogAdmin />} />
        <Route path="/:slug/orders" element={<CatalogOrdersPage />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

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
  List,
  Info,
  Phone,
  Share2,
  MapPin,
  Clock,
  Mail,
  Building,
  Key,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, useCatalogStore } from './store';
import { Catalog, Product, Role, User, Order, ProductType, FooterSettings, GlobalSettings } from './types';
import { cn, formatPrice, roundPrice, optimizeImage, getImageUrl } from './lib/utils';
import { supabase } from './lib/supabase';
import { authService, dbService, storageService } from './lib/supabase-service';

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
        console.error('Error sharing:', err);
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
                    {settings?.whatsapp ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    ) : (
                      <Phone className="w-5 h-5" />
                    )}
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
              className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Acerca de</h2>
                <button onClick={() => setShowAbout(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {settings?.about || 'No hay información disponible.'}
              </p>
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
  const [showCreate, setShowCreate] = useState(false);
  const [newCatalog, setNewCatalog] = useState({ name: '', slug: '' });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    dbService.getCatalogs().then(setCatalogs).catch(err => toast.error('Error al cargar catálogos'));
    dbService.getGlobalSettings().then(setGlobalSettings);
  }, []);

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

        <StepsToCreate />

        {user?.role === 'superadmin' && (
          <div className="text-center mt-12 mb-20">
            <button 
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 mx-auto px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-200"
            >
              <Plus className="w-6 h-6" />
              Nuevo Catálogo
            </button>
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
  const wholesalePrice = product.custom_wholesale_price_mn || roundPrice((product.ref_price || 0) * (catalog?.exchange_rate || 1));
  const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
    ? roundPrice(product.sale_wholesale_price_ref * (catalog?.exchange_rate || 1)) 
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
        console.error('Error sharing:', err);
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

            <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
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
            </div>
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

  const total = cart.reduce((acc, i) => {
    const wholesalePrice = i.product.custom_wholesale_price_mn || roundPrice(i.product.ref_price * catalog.exchange_rate);
    const saleWholesalePrice = i.product.classification === 'sale' && i.product.sale_wholesale_price_ref 
      ? roundPrice(i.product.sale_wholesale_price_ref * catalog.exchange_rate) 
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
              const wholesalePrice = item.product.custom_wholesale_price_mn || roundPrice(item.product.ref_price * catalog.exchange_rate);
              const saleWholesalePrice = item.product.classification === 'sale' && item.product.sale_wholesale_price_ref 
                ? roundPrice(item.product.sale_wholesale_price_ref * catalog.exchange_rate) 
                : null;
              const currentPrice = saleWholesalePrice || wholesalePrice;

              return (
                <div key={item.product.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0">
                    {item.product.photos?.[0] && <img src={getImageUrl(item.product.photos?.[0], 'products')} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{item.product.name}</p>
                    <p className="text-sm text-orange-600 font-bold">{formatPrice(currentPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-xl border p-1">
                    <button 
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.product.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
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
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [cart, setCart] = useState<{ product: Product, qty: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'grouped' | 'alphabetical'>('grouped');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    dbService.getCatalogs().then(data => {
      const found = data.find((c: any) => c.slug === slug);
      if (found) {
        setCatalog(found);
        dbService.getProducts(found.id).then(setProducts);
      }
    });
    dbService.getProductTypes().then(setProductTypes);
  }, [slug]);

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

    // Price filter
    if (minPrice > 0 && p.cup_price < minPrice) {
      return false;
    }
    if (maxPrice > 0 && p.cup_price > maxPrice) {
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
    try {
      await dbService.createOrder({
        catalog_id: catalog.id,
        user_id: user.id,
        status: 'pending',
        items: cart.map(item => {
          const wholesalePrice = item.product.custom_wholesale_price_mn || roundPrice(item.product.ref_price * catalog.exchange_rate);
          const saleWholesalePrice = item.product.classification === 'sale' && item.product.sale_wholesale_price_ref 
            ? roundPrice(item.product.sale_wholesale_price_ref * catalog.exchange_rate) 
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
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-2xl bg-white/50 backdrop-blur border border-white/30 hover:bg-white transition-all font-bold text-sm shadow-sm"
                >
                  <span>Buscar Producto 🔍</span>
                </button>
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
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-3 rounded-2xl bg-white/50 backdrop-blur border border-white/30 hover:bg-white transition-all shadow-sm",
                  (filterType !== 'all' || filterClassification !== 'all' || minPrice > 0 || maxPrice > 0) && "text-orange-600 border-orange-200 bg-orange-50"
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

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio</label>
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

                        <button 
                          onClick={() => {
                            setFilterType('all');
                            setFilterClassification('all');
                            setMinPrice(0);
                            setMaxPrice(0);
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
              onClick={() => setSortBy('grouped')}
              className={cn(
                "p-2 rounded-xl transition-all",
                sortBy === 'grouped' ? "bg-orange-600 text-white shadow-lg" : "bg-white/50 text-gray-400 hover:bg-white"
              )}
              title="Vista Agrupada"
            >
              <LayoutGrid className="w-5 h-5" />
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
                const wholesalePrice = product.custom_wholesale_price_mn || roundPrice(product.ref_price * catalog.exchange_rate);
                const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
                  ? roundPrice(product.sale_wholesale_price_ref * catalog.exchange_rate) 
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
                          {saleWholesalePrice ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[13px] font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                              <span className="text-[9px] line-through opacity-50">{formatPrice(wholesalePrice)}</span>
                              <span className="text-[8px] text-gray-400 font-bold ml-auto">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-[13px] font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                              <span className="text-[8px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                            </div>
                          )}
                          <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter leading-none mb-1">Por Mayor</p>
    
                          {/* Minorista (Smaller) */}
                          {product.classification === 'sale' && product.sale_price ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                              <span className="text-[8px] line-through opacity-50">{formatPrice(product.cup_price)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold opacity-70">{formatPrice(product.cup_price)}</p>
                            </div>
                          )}
                          <p className="text-[7px] font-medium opacity-40 uppercase tracking-tighter leading-none">Minorista</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            (['sale', 'new', 'stock', 'out'] as const).map(cls => {
              const clsProducts = productsByClassification[cls];
              if (clsProducts.length === 0) return null;

              // Group by category within this classification
              const productsByCat = clsProducts.reduce((acc, p) => {
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

              return (
                <div key={cls} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                      {classificationLabels[cls]}
                    </h2>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {sortedCatIds.map(catId => {
                    const catProducts = productsByCat[catId];
                    const category = productTypes.find(t => t.id === catId);

                    return (
                      <div key={catId} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">
                            {category ? `${category.emoji} ${category.name}` : 'Otros'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                          {catProducts.map(product => {
                            const wholesalePrice = product.custom_wholesale_price_mn || roundPrice(product.ref_price * catalog.exchange_rate);
                            const saleWholesalePrice = product.classification === 'sale' && product.sale_wholesale_price_ref 
                              ? roundPrice(product.sale_wholesale_price_ref * catalog.exchange_rate) 
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
                                      {saleWholesalePrice ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[13px] font-bold text-orange-600">{formatPrice(saleWholesalePrice)}</span>
                                          <span className="text-[9px] line-through opacity-50">{formatPrice(wholesalePrice)}</span>
                                          <span className="text-[8px] text-gray-400 font-bold ml-auto">{Number(product.sale_wholesale_price_ref || product.ref_price).toFixed(2)} REF</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <p className="text-[13px] font-bold text-orange-600">{formatPrice(wholesalePrice)}</p>
                                          <span className="text-[8px] text-gray-400 font-bold">{Number(product.ref_price).toFixed(2)} REF</span>
                                        </div>
                                      )}
                                      <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter leading-none mb-1">Por Mayor</p>
                
                                      {/* Minorista (Smaller) */}
                                      {product.classification === 'sale' && product.sale_price ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-red-500">{formatPrice(product.sale_price)}</span>
                                          <span className="text-[8px] line-through opacity-50">{formatPrice(product.cup_price)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] font-bold opacity-70">{formatPrice(product.cup_price)}</p>
                                        </div>
                                      )}
                                      <p className="text-[7px] font-medium opacity-40 uppercase tracking-tighter leading-none">Minorista</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
            <div className="flex flex-wrap gap-4 mb-4">
              {formData.photos?.map((p, i) => (
              <div className="relative w-24 h-24 flex-shrink-0 group">
                <img src={getImageUrl(p, 'products')} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-sm" />
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, photos: formData.photos?.filter((_, idx) => idx !== i) })}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all scale-0 group-hover:scale-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              ))}
              {previews.map((url, i) => (
                <div key={`new-${i}`} className="relative w-24 h-24 flex-shrink-0 group">
                  <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-orange-200 shadow-sm" />
                  <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-br-xl font-bold uppercase">Nueva</div>
                  <button 
                    type="button"
                    onClick={() => {
                      const newFiles = [...files];
                      newFiles.splice(i, 1);
                      setFiles(newFiles);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all scale-0 group-hover:scale-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio Oferta (CUP)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 rounded-xl border"
                      value={formData.sale_price || ''}
                      onChange={e => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio Oferta REF (Mayorista)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full px-4 py-2 rounded-xl border"
                      value={formData.sale_wholesale_price_ref || ''}
                      onChange={e => setFormData({ ...formData, sale_wholesale_price_ref: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Precio REF (Mayorista)</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full px-4 py-2 rounded-xl border"
                    value={formData.ref_price || 0}
                    onChange={e => setFormData({ ...formData, ref_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Precio CUP (Minorista)</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-2 rounded-xl border"
                    value={formData.cup_price || 0}
                    onChange={e => setFormData({ ...formData, cup_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'orders' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null);
  const [editingUser, setEditingUser] = useState<User | null | 'new'>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      }
    });
  }, [slug]);

  useEffect(() => {
    if (catalog) {
      refreshData();
    }
  }, [catalog?.id]);

  const [localExchangeRate, setLocalExchangeRate] = useState(0);

  useEffect(() => {
    if (catalog) {
      setLocalExchangeRate(catalog.exchange_rate);
    }
  }, [catalog?.exchange_rate]);

  if (!catalog) return <div>Cargando...</div>;

  if (authUser?.catalog_id !== catalog.id && authUser?.role !== 'superadmin') {
    return <div className="p-8 text-center">No tienes acceso a esta administración.</div>;
  }

  const updateSettings = async (newSettings: Partial<Catalog['settings']>) => {
    try {
      const updated = await dbService.updateCatalog(catalog.id, {
        settings: { ...catalog.settings, ...newSettings }
      });
      setCatalog(updated);
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
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;
    try {
      await dbService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('Usuario eliminado');
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar catalog={catalog} />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Panel de Control: {catalog.name}</h2>
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
              { id: 'orders', label: 'Pedidos', icon: ShoppingCart, roles: ['admin', 'editor', 'superadmin'] },
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
                            <p className="text-sm text-gray-500">{formatPrice(p.cup_price)}</p>
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
                            onClick={() => setDeletingId(p.id)}
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

              <AnimatePresence>
                {deletingId && (
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
                      <h3 className="text-xl font-bold mb-2">¿Eliminar producto?</h3>
                      <p className="text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => deleteProduct(deletingId)}
                          className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
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
                        onClick={() => deleteUser(u.id)}
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

          {activeTab === 'orders' && (
            <div>
              <h3 className="text-xl font-bold mb-6">Pedidos Recibidos</h3>
              <div className="space-y-4">
                {(orders || []).map(o => {
                  const statusMap: Record<string, { label: string, color: string }> = {
                    pending: { label: 'En revisión', color: 'bg-yellow-100 text-yellow-700' },
                    processing: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
                    ready: { label: 'Listo', color: 'bg-green-100 text-green-700' },
                    completed: { label: 'Entregado', color: 'bg-gray-100 text-gray-700' }
                  };
                  const status = statusMap[o.status] || { label: o.status, color: 'bg-gray-100 text-gray-700' };

                  return (
                    <div key={o.id} className="p-6 border rounded-3xl">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold">Pedido #{o.id.slice(-4)}</p>
                          <p className="text-sm text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          status.color
                        )}>
                          {status.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(o.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.product_code && <span className="font-bold text-gray-900 mr-1">[{item.product_code}]</span>}{item.name}
                            </span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-between items-center">
                        <p className="font-bold">Total: {formatPrice((o.items || []).reduce((acc, i) => acc + i.price * i.quantity, 0))}</p>
                        <div className="flex gap-2">
                          {o.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                await dbService.updateOrder(o.id, { status: 'processing' });
                                refreshData();
                              }}
                              className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              Procesar
                            </button>
                          )}
                          {o.status === 'processing' && (
                            <button 
                              onClick={async () => {
                                await dbService.updateOrder(o.id, { status: 'ready' });
                                refreshData();
                              }}
                              className="text-xs font-bold px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              Listo
                            </button>
                          )}
                          {o.status === 'ready' && (
                            <button 
                              onClick={async () => {
                                await dbService.updateOrder(o.id, { status: 'completed' });
                                refreshData();
                              }}
                              className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              Entregado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
    if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;
    try {
      // Note: Supabase Auth users need to be deleted via admin API or manually
      // For now we just delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
      toast.success('Usuario eliminado');
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este tipo de producto?')) return;
    try {
      await dbService.deleteProductType(id);
      setProductTypes(productTypes.filter(t => t.id !== id));
      toast.success('Tipo eliminado');
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
      <div className="max-w-7xl mx-auto p-8">
        <h2 className="text-3xl font-bold mb-8">Panel de Super Administrador</h2>
        
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
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

        <div className="bg-white rounded-3xl shadow-sm p-8">
          {activeTab === 'users' ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Gestión Global de Usuarios</h3>
                <button 
                  onClick={() => setEditingUser('new')}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-4 font-bold">Usuario</th>
                      <th className="pb-4 font-bold">Email</th>
                      <th className="pb-4 font-bold">Rol</th>
                      <th className="pb-4 font-bold">Catálogo</th>
                      <th className="pb-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-4">{u.username}</td>
                        <td className="py-4">{u.email}</td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold uppercase">{u.role}</span>
                        </td>
                        <td className="py-4">
                          {u.catalog_id ? (
                            <span className="text-sm text-gray-600">
                              {catalogs.find(c => c.id === u.catalog_id)?.name || u.catalog_id}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingUser(u)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <button onClick={() => deleteType(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage type="login" />} />
        <Route path="/register" element={<AuthPage type="register" />} />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="/:slug" element={<CatalogView />} />
        <Route path="/:slug/admin" element={<CatalogAdmin />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

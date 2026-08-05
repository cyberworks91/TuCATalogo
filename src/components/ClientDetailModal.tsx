import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Phone, MapPin, CreditCard, Building2, Mail, Copy, Check, Edit, 
  RefreshCw, Plus, X, ExternalLink, FileText, Search, UserCheck, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { dbService } from '../lib/supabase-service';
import { filterAndSortClients } from '../App';
import { useAuthStore } from '../store';

interface ClientDetailModalProps {
  order: any;
  client: any | null;
  users: any[];
  catalogId: string;
  onClose: () => void;
  onClientUpdated: (updatedClient: any) => void;
  onChangeClientForOrder: (orderId: string, newClientId: string) => Promise<void>;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  order,
  client,
  users,
  catalogId,
  onClose,
  onClientUpdated,
  onChangeClientForOrder
}) => {
  const { user: authUser } = useAuthStore();
  const canChangeClient = !!authUser && (
    authUser.role === 'superadmin' || 
    authUser.role === 'admin' || 
    authUser.role === 'editor'
  );

  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'change'>('view');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Edit Client Form State
  const [editForm, setEditForm] = useState({
    client_type: client?.client_type || 'persona',
    full_name: client?.full_name || '',
    company_name: client?.company_name || '',
    username: client?.username || '',
    phone: client?.phone || '',
    ci_number: client?.ci_number || '',
    nit: client?.nit || '',
    email: client?.email || '',
    province: client?.province || '',
    municipality: client?.municipality || '',
    address_detail: client?.address_detail || client?.address || '',
  });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Change Client Search State
  const [clientSearch, setClientSearch] = useState('');
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [catalogOrders, setCatalogOrders] = useState<any[]>([]);

  React.useEffect(() => {
    if (catalogId) {
      dbService.getOrders(catalogId)
        .then(data => setCatalogOrders(data || []))
        .catch(err => console.error('Error fetching orders for catalog in modal:', err));
    }
  }, [catalogId]);

  // Create New Client inline state in Change tab
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    client_type: 'persona' as 'persona' | 'empresa',
    full_name: '',
    company_name: '',
    username: '',
    phone: '',
    ci_number: '',
    nit: '',
    email: '',
    province: '',
    municipality: '',
    address_detail: ''
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const isEmpresa = client?.client_type === 'empresa' || !!client?.company_name;
  const clientDisplayName = client 
    ? (isEmpresa ? (client.company_name || client.full_name) : (client.full_name || client.username || 'Cliente'))
    : 'Sin Cliente Asignado';

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text || text === 'No especificado') {
      toast.error('No hay información para copiar');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado al portapapeles`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllDetails = () => {
    if (!client) {
      toast.error('No hay datos de cliente para copiar');
      return;
    }

    const lines = [
      `📋 DATOS DEL CLIENTE - ENCARGO #${order?.order_number || order?.id?.slice(0, 8)}`,
      `• Nombre / Razón Social: ${clientDisplayName}`,
      `• Tipo: ${isEmpresa ? 'Empresa' : 'Persona Particular'}`,
      client.phone ? `• Teléfono: ${client.phone}` : null,
      client.ci_number ? `• C.I. / Carnet: ${client.ci_number}` : null,
      (client.address_detail || client.address) ? `• Dirección: ${client.address_detail || client.address}` : null,
      (client.province || client.municipality) ? `• Provincia/Municipio: ${[client.province, client.municipality].filter(Boolean).join(' - ')}` : null,
      client.email ? `• Correo: ${client.email}` : null,
      client.company_name ? `• Empresa: ${client.company_name}` : null,
      client.nit ? `• NIT: ${client.nit}` : null,
      client.username ? `• Usuario: @${client.username}` : null
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedAll(true);
    toast.success('¡Todos los datos copiados al portapapeles!');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleSaveClientEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id) {
      toast.error('No existe un registro de cliente para editar');
      return;
    }

    setIsSavingClient(true);
    try {
      const isEmpresaType = editForm.client_type === 'empresa';
      const updatedPayload = {
        ...client,
        client_type: editForm.client_type,
        full_name: isEmpresaType ? (editForm.full_name || editForm.company_name) : editForm.full_name,
        company_name: isEmpresaType ? editForm.company_name : '',
        username: editForm.username || client.username,
        phone: editForm.phone,
        ci_number: editForm.ci_number,
        nit: isEmpresaType ? editForm.nit : '',
        email: editForm.email,
        province: editForm.province,
        municipality: editForm.municipality,
        address_detail: editForm.address_detail,
      };

      await dbService.updateProfile(client.id, updatedPayload);
      toast.success('Datos del cliente actualizados');
      onClientUpdated(updatedPayload);
      setActiveTab('view');
    } catch (err: any) {
      console.error('Error saving client profile:', err);
      toast.error(err?.message || 'Error al actualizar cliente');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleSelectNewClient = async (selectedClientId: string) => {
    if (!order?.id) return;
    setIsChangingClient(true);
    try {
      await onChangeClientForOrder(order.id, selectedClientId);
      toast.success('Cliente del pedido actualizado con éxito');
      setActiveTab('view');
    } catch (err: any) {
      console.error('Error changing client for order:', err);
      toast.error('Error al cambiar cliente del pedido');
    } finally {
      setIsChangingClient(false);
    }
  };

  const handleCreateAndAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogId) {
      toast.error('Error de catálogo');
      return;
    }

    const isEmp = newClientForm.client_type === 'empresa';
    const nameToUse = isEmp ? newClientForm.company_name : newClientForm.full_name;

    if (!nameToUse.trim()) {
      toast.error(isEmp ? 'Por favor ingresa la Razón Social' : 'Por favor ingresa el Nombre Completo');
      return;
    }

    setIsCreatingClient(true);
    try {
      const generatedUsername = (newClientForm.username || nameToUse)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 899 + 100);

      const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const newClientPayload = {
        id: clientId,
        catalog_id: catalogId,
        username: generatedUsername,
        full_name: isEmp ? (newClientForm.full_name || newClientForm.company_name) : newClientForm.full_name,
        company_name: isEmp ? newClientForm.company_name : '',
        client_type: newClientForm.client_type,
        phone: newClientForm.phone,
        ci_number: newClientForm.ci_number,
        nit: isEmp ? newClientForm.nit : '',
        email: newClientForm.email,
        province: newClientForm.province,
        municipality: newClientForm.municipality,
        address_detail: newClientForm.address_detail,
        role: 'client',
        created_at: new Date().toISOString()
      };

      await dbService.updateProfile(clientId, newClientPayload);
      onClientUpdated(newClientPayload);

      if (order?.id) {
        await onChangeClientForOrder(order.id, clientId);
      }

      toast.success('Cliente creado y asignado al pedido');
      setShowCreateInline(false);
      setActiveTab('view');
    } catch (err: any) {
      console.error('Error creating client:', err);
      toast.error(err?.message || 'Error al crear cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const filteredClients = filterAndSortClients(users, clientSearch, catalogId, catalogOrders);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center pt-2 sm:pt-4 p-2 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto relative"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">
                {activeTab === 'view' && (client ? clientDisplayName : 'Datos del Cliente')}
                {activeTab === 'edit' && 'Editar Datos del Cliente'}
                {activeTab === 'change' && 'Cambiar Cliente del Pedido'}
              </h2>
              <p className="text-xs text-orange-100 truncate mt-0.5">
                Pedido #{order?.order_number || order?.id?.slice(0, 8)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50/80 px-3 py-2 gap-1.5 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'view' 
                ? 'bg-white text-orange-600 shadow-xs border border-gray-200/80' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Ver Datos</span>
          </button>

          {client && (
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'edit' 
                  ? 'bg-white text-orange-600 shadow-xs border border-gray-200/80' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Cliente</span>
            </button>
          )}

          {canChangeClient && (
            <button
              type="button"
              onClick={() => setActiveTab('change')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'change' 
                  ? 'bg-white text-orange-600 shadow-xs border border-gray-200/80' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cambiar Cliente</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: VIEW CLIENT DETAILS */}
          {activeTab === 'view' && (
            <>
              {!client ? (
                <div className="text-center py-10 space-y-3">
                  <User className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600 font-bold">Este pedido no tiene un cliente asignado</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Puedes seleccionar un cliente existente de la lista o registrar uno nuevo para este pedido.
                  </p>
                  <button
                    onClick={() => setActiveTab('change')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Asignar / Seleccionar Cliente</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Bar Summary & Copy All */}
                  <div className="bg-orange-50/80 border border-orange-100 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-orange-600 text-white rounded-xl shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-gray-900 truncate">{clientDisplayName}</p>
                        <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          {isEmpresa ? 'Empresa / Negocio' : 'Persona Particular'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={copyAllDetails}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      title="Copiar todos los datos formateados"
                    >
                      {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAll ? '¡Copiado!' : 'Copiar Todo'}</span>
                    </button>
                  </div>

                  {/* Field Rows with Copy Button beside each field */}
                  <div className="space-y-2.5">
                    {/* Nombre Completo / Razón Social */}
                    <FieldRow 
                      icon={User}
                      label={isEmpresa ? 'Razón Social / Nombre' : 'Nombre Completo'}
                      value={clientDisplayName}
                      onCopy={() => copyToClipboard(clientDisplayName, 'Nombre')}
                      isCopied={copiedField === 'Nombre'}
                    />

                    {/* Teléfono */}
                    <FieldRow 
                      icon={Phone}
                      label="Teléfono / WhatsApp"
                      value={client.phone}
                      onCopy={() => copyToClipboard(client.phone || '', 'Teléfono')}
                      isCopied={copiedField === 'Teléfono'}
                      extraAction={client.phone ? (
                        <a
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 ml-auto"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      ) : null}
                    />

                    {/* Carnet de Identidad */}
                    <FieldRow 
                      icon={CreditCard}
                      label="Carnet de Identidad (C.I.)"
                      value={client.ci_number}
                      onCopy={() => copyToClipboard(client.ci_number || '', 'Carnet de Identidad')}
                      isCopied={copiedField === 'Carnet de Identidad'}
                    />

                    {/* Dirección */}
                    <FieldRow 
                      icon={MapPin}
                      label="Dirección de Entrega"
                      value={client.address_detail || client.address}
                      onCopy={() => copyToClipboard(client.address_detail || client.address || '', 'Dirección')}
                      isCopied={copiedField === 'Dirección'}
                    />

                    {/* Provincia / Municipio */}
                    <FieldRow 
                      icon={MapPin}
                      label="Provincia / Municipio"
                      value={[client.province, client.municipality].filter(Boolean).join(' - ')}
                      onCopy={() => copyToClipboard([client.province, client.municipality].filter(Boolean).join(' - '), 'Provincia/Municipio')}
                      isCopied={copiedField === 'Provincia/Municipio'}
                    />

                    {/* Email */}
                    <FieldRow 
                      icon={Mail}
                      label="Correo Electrónico"
                      value={client.email}
                      onCopy={() => copyToClipboard(client.email || '', 'Correo Electrónico')}
                      isCopied={copiedField === 'Correo Electrónico'}
                    />

                    {/* Empresa & NIT (if empresa) */}
                    {isEmpresa && (
                      <>
                        <FieldRow 
                          icon={Building2}
                          label="Nombre de Empresa"
                          value={client.company_name}
                          onCopy={() => copyToClipboard(client.company_name || '', 'Nombre de Empresa')}
                          isCopied={copiedField === 'Nombre de Empresa'}
                        />
                        <FieldRow 
                          icon={FileText}
                          label="NIT"
                          value={client.nit}
                          onCopy={() => copyToClipboard(client.nit || '', 'NIT')}
                          isCopied={copiedField === 'NIT'}
                        />
                      </>
                    )}

                    {/* Usuario */}
                    <FieldRow 
                      icon={UserCheck}
                      label="Usuario de Sistema"
                      value={client.username ? `@${client.username}` : ''}
                      onCopy={() => copyToClipboard(client.username || '', 'Usuario')}
                      isCopied={copiedField === 'Usuario'}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: EDIT CLIENT PROFILE */}
          {activeTab === 'edit' && client && (
            <form onSubmit={handleSaveClientEdits} className="space-y-3.5">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70 text-xs text-amber-800">
                Modifica los datos del cliente. Los cambios se guardarán permanentemente en su perfil.
              </div>

              {/* Client Type Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, client_type: 'persona' }))}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      editForm.client_type === 'persona'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Persona Particular
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, client_type: 'empresa' }))}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      editForm.client_type === 'empresa'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Empresa / Negocio
                  </button>
                </div>
              </div>

              {editForm.client_type === 'persona' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Ej. Juan Pérez González"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Razón Social / Nombre de Empresa *</label>
                    <input
                      type="text"
                      required
                      value={editForm.company_name}
                      onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))}
                      placeholder="Ej. Comercializadora Cuba S.R.L."
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">NIT de Empresa</label>
                    <input
                      type="text"
                      value={editForm.nit}
                      onChange={e => setEditForm(p => ({ ...p, nit: e.target.value }))}
                      placeholder="Ej. 102938475"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+53 51234567"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carnet de Identidad (C.I.)</label>
                  <input
                    type="text"
                    value={editForm.ci_number}
                    onChange={e => setEditForm(p => ({ ...p, ci_number: e.target.value }))}
                    placeholder="920102..."
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dirección Detallada</label>
                <input
                  type="text"
                  value={editForm.address_detail}
                  onChange={e => setEditForm(p => ({ ...p, address_detail: e.target.value }))}
                  placeholder="Calle, Número, entre calles, reparto..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={editForm.province}
                    onChange={e => setEditForm(p => ({ ...p, province: e.target.value }))}
                    placeholder="La Habana"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Municipio</label>
                  <input
                    type="text"
                    value={editForm.municipality}
                    onChange={e => setEditForm(p => ({ ...p, municipality: e.target.value }))}
                    placeholder="Playa"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingClient ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CHANGE CLIENT FOR THIS ORDER */}
          {activeTab === 'change' && canChangeClient && (
            <div className="space-y-3.5">
              {!showCreateInline ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 font-medium">
                      Selecciona un cliente de la lista para reasignar este pedido:
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateInline(true)}
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo Cliente</span>
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, usuario, teléfono o CI..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                    />
                  </div>

                  {/* Clients List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {filteredClients.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 border border-dashed rounded-2xl">
                        No se encontraron clientes con esa búsqueda
                      </div>
                    ) : (
                      filteredClients.map(c => {
                        const isCurrent = c.id === client?.id;
                        const isEmp = c.client_type === 'empresa' || !!c.company_name;
                        const dName = isEmp ? (c.company_name || c.full_name) : (c.full_name || c.username || 'Sin Nombre');
                        const isCatClient = c.catalog_id === catalogId || (!c.catalog_id && (c.role === 'client' || c.role === 'cliente'));
                        const isClientRole = c.role === 'client' || c.role === 'cliente' || (!c.role && !!c.client_type);
                        const hasPurchasedInModal = catalogOrders.some((o: any) => o.user_id === c.id);

                        return (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isCurrent 
                                ? 'bg-orange-50/70 border-orange-300' 
                                : 'bg-white hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-bold text-xs text-gray-900 truncate">{dName}</p>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[9px] font-extrabold rounded-md uppercase">
                                    Actual
                                  </span>
                                )}
                                {isCatClient && isClientRole ? (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200/80 text-[9px] font-bold rounded-md">
                                    Cliente del Catálogo
                                  </span>
                                ) : hasPurchasedInModal ? (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200/80 text-[9px] font-bold rounded-md">
                                    Comprador Anterior
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {c.phone ? `Tel: ${c.phone}` : ''} {c.ci_number ? `• CI: ${c.ci_number}` : ''} {c.address_detail ? `• ${c.address_detail}` : ''}
                              </p>
                            </div>

                            {!isCurrent && (
                              <button
                                type="button"
                                disabled={isChangingClient}
                                onClick={() => handleSelectNewClient(c.id)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <span>Seleccionar</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* INLINE FORM TO CREATE NEW CLIENT */
                <form onSubmit={handleCreateAndAssignClient} className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-xs text-gray-900">Crear Nuevo Cliente y Asignar</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateInline(false)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      Volver a Lista
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewClientForm(p => ({ ...p, client_type: 'persona' }))}
                      className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        newClientForm.client_type === 'persona'
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      Persona Particular
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewClientForm(p => ({ ...p, client_type: 'empresa' }))}
                      className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        newClientForm.client_type === 'empresa'
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      Empresa / Negocio
                    </button>
                  </div>

                  {newClientForm.client_type === 'persona' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={newClientForm.full_name}
                        onChange={e => setNewClientForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Ej. María López"
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Razón Social *</label>
                      <input
                        type="text"
                        required
                        value={newClientForm.company_name}
                        onChange={e => setNewClientForm(p => ({ ...p, company_name: e.target.value }))}
                        placeholder="Ej. Distribuidora del Caribe"
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={newClientForm.phone}
                        onChange={e => setNewClientForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+53 5..."
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Carnet de Identidad</label>
                      <input
                        type="text"
                        value={newClientForm.ci_number}
                        onChange={e => setNewClientForm(p => ({ ...p, ci_number: e.target.value }))}
                        placeholder="850912..."
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Dirección de Entrega</label>
                    <input
                      type="text"
                      value={newClientForm.address_detail}
                      onChange={e => setNewClientForm(p => ({ ...p, address_detail: e.target.value }))}
                      placeholder="Calle 10 #123..."
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateInline(false)}
                      className="px-3.5 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingClient}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingClient ? 'Creando...' : 'Crear y Asignar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface FieldRowProps {
  icon: any;
  label: string;
  value?: string | null;
  onCopy: () => void;
  isCopied: boolean;
  extraAction?: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({
  icon: Icon,
  label,
  value,
  onCopy,
  isCopied,
  extraAction
}) => {
  const displayVal = value && value.trim() ? value : 'No especificado';
  const hasVal = value && value.trim();

  return (
    <div className="p-3 bg-gray-50/80 hover:bg-gray-100/60 rounded-2xl border border-gray-100 transition-colors flex items-center justify-between gap-3 group">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 bg-white text-orange-600 rounded-lg shadow-2xs shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-xs font-extrabold truncate mt-0.5 ${hasVal ? 'text-gray-900' : 'text-gray-400 font-medium'}`}>
            {displayVal}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {extraAction}
        {hasVal && (
          <button
            type="button"
            onClick={onCopy}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isCopied 
                ? 'bg-emerald-500 text-white border-emerald-500' 
                : 'bg-white text-gray-500 hover:text-orange-600 hover:border-orange-300 border-gray-200 shadow-2xs'
            }`}
            title="Copiar este dato"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

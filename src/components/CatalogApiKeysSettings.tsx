import React, { useState } from 'react';
import { Catalog, CatalogApiKey, CatalogSettings } from '../types';
import { dbService } from '../lib/supabase-service';
import { toast } from 'sonner';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Code, 
  Play, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CatalogApiKeysSettingsProps {
  catalog: Catalog;
  onCatalogUpdated: (updatedCatalog: Catalog) => void;
}

export const CatalogApiKeysSettings: React.FC<CatalogApiKeysSettingsProps> = ({
  catalog,
  onCatalogUpdated,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [showDoc, setShowDoc] = useState(true);
  
  // Interactive Tester
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedKeyForTest, setSelectedKeyForTest] = useState<string>('');

  const apiKeys: CatalogApiKey[] = catalog.settings?.api_keys || [];
  const maxKeys = 3;
  const canCreate = apiKeys.length < maxKeys;

  // Helper to generate secure key
  const generateRandomKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      rand += chars[array[i] % chars.length];
    }
    return `cat_live_${rand}`;
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error('Por favor escribe un nombre para la API Key');
      return;
    }
    if (apiKeys.length >= maxKeys) {
      toast.error(`Límite alcanzado: máximo ${maxKeys} API Keys por catálogo`);
      return;
    }

    try {
      const newKey: CatalogApiKey = {
        id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: newKeyName.trim(),
        key: generateRandomKey(),
        is_active: true,
        created_at: new Date().toISOString(),
        last_used_at: null,
      };

      const updatedKeys = [...apiKeys, newKey];
      const newSettings: CatalogSettings = {
        ...catalog.settings,
        api_keys: updatedKeys,
      };

      const updated = await dbService.updateCatalog(catalog.id, {
        settings: newSettings,
      });

      onCatalogUpdated(updated);
      setNewKeyName('');
      setIsCreating(false);
      setVisibleKeyIds(prev => ({ ...prev, [newKey.id]: true }));
      toast.success('¡API Key creada exitosamente!');
    } catch (err: any) {
      toast.error('Error al crear la API Key');
    }
  };

  const handleToggleActive = async (keyItem: CatalogApiKey) => {
    try {
      const nextState = !keyItem.is_active;
      const updatedKeys = apiKeys.map(k => 
        k.id === keyItem.id ? { ...k, is_active: nextState } : k
      );
      const newSettings: CatalogSettings = {
        ...catalog.settings,
        api_keys: updatedKeys,
      };

      const updated = await dbService.updateCatalog(catalog.id, {
        settings: newSettings,
      });

      onCatalogUpdated(updated);
      toast.success(nextState ? 'API Key activada' : 'API Key deshabilitada');
    } catch (err) {
      toast.error('Error al actualizar estado de la API Key');
    }
  };

  const handleRenewKey = async (keyItem: CatalogApiKey) => {
    const confirm = window.confirm(
      `¿Estás seguro de que deseas renovar la clave "${keyItem.name}"?\n\nLa clave actual dejará de funcionar de inmediato y se generará una nueva.`
    );
    if (!confirm) return;

    try {
      const newKeyVal = generateRandomKey();
      const updatedKeys = apiKeys.map(k => 
        k.id === keyItem.id ? { ...k, key: newKeyVal, created_at: new Date().toISOString() } : k
      );
      const newSettings: CatalogSettings = {
        ...catalog.settings,
        api_keys: updatedKeys,
      };

      const updated = await dbService.updateCatalog(catalog.id, {
        settings: newSettings,
      });

      onCatalogUpdated(updated);
      setVisibleKeyIds(prev => ({ ...prev, [keyItem.id]: true }));
      toast.success('API Key renovada con éxito');
    } catch (err) {
      toast.error('Error al renovar la API Key');
    }
  };

  const handleDeleteKey = async (keyItem: CatalogApiKey) => {
    const confirm = window.confirm(
      `¿Deseas eliminar permanentemente la API Key "${keyItem.name}"? Cualquier aplicación que la esté utilizando perderá el acceso.`
    );
    if (!confirm) return;

    try {
      const updatedKeys = apiKeys.filter(k => k.id !== keyItem.id);
      const newSettings: CatalogSettings = {
        ...catalog.settings,
        api_keys: updatedKeys,
      };

      const updated = await dbService.updateCatalog(catalog.id, {
        settings: newSettings,
      });

      onCatalogUpdated(updated);
      toast.success('API Key eliminada');
    } catch (err) {
      toast.error('Error al eliminar la API Key');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeyIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Base API URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentKeyForSnippet = apiKeys.find(k => k.is_active)?.key || (apiKeys[0]?.key || 'TU_API_KEY');

  const curlSnippet = `curl -X GET "${origin}/api/v1/catalog/products" \\
  -H "x-api-key: ${currentKeyForSnippet}"`;

  const jsSnippet = `// Consulta con JavaScript / Fetch
const response = await fetch("${origin}/api/v1/catalog/products", {
  headers: {
    "x-api-key": "${currentKeyForSnippet}"
  }
});
const data = await response.json();
console.log(data.products);`;

  const pythonSnippet = `import requests

url = "${origin}/api/v1/catalog/products"
headers = {
    "x-api-key": "${currentKeyForSnippet}"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["products"])`;

  const runTestQuery = async (keyToUse: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/catalog/products`, {
        headers: {
          'x-api-key': keyToUse
        }
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setTestResult(data);
        if (res.ok) {
          toast.success(`Respuesta recibida: ${data.products?.length ?? 0} productos`);
        } else {
          toast.error(data.message || 'Error en la consulta');
        }
      } else {
        const text = await res.text();
        setTestResult({
          status: 'error',
          error: 'NON_JSON_RESPONSE',
          message: 'El servidor devolvió una respuesta no JSON (HTML/Texto). Verifica el despliegue de las Functions en Cloudflare.',
          raw_response: text.substring(0, 300)
        });
        toast.error('El servidor no devolvió formato JSON');
      }
    } catch (e: any) {
      setTestResult({ error: e.message || 'Error de conexión' });
      toast.error('Fallo en la conexión');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="catalog-api-keys-section" className="space-y-6 pt-6 border-t border-gray-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Integraciones & API Pública</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Key className="w-6 h-6 text-orange-400" />
              API Keys del Catálogo
            </h3>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Genera claves de acceso seguro para consultar tu catálogo, categorías, fotos, tasa de cambio y precios calculados en tiempo real desde sitios web externos, aplicaciones móviles o sistemas de inventario.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-medium text-gray-200">
              <span className="text-orange-400 font-bold text-sm mr-1">{apiKeys.length}</span>
              de <span className="font-bold text-white text-sm">{maxKeys}</span> claves en uso
            </div>

            {canCreate ? (
              <button
                type="button"
                id="btn-open-create-api-key"
                onClick={() => setIsCreating(true)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear Nueva Clave
              </button>
            ) : (
              <span className="text-xs text-gray-400 font-medium px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                Límite de 3 claves alcanzado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form to create a new API Key */}
      {isCreating && (
        <div className="bg-orange-50/70 border-2 border-orange-200 rounded-3xl p-6 transition-all animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-600" />
              Crear Nueva API Key
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewKeyName('');
              }}
              className="text-xs font-bold text-gray-400 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleCreateKey} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nombre / Identificador de la Clave
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Mi Tienda Online, App Móvil, Integración Zapier..."
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-xl border-2 border-orange-200 focus:border-orange-500 outline-none text-sm font-medium text-gray-900 shadow-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Usa un nombre descriptivo para identificar qué aplicación o sistema usará esta clave.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewKeyName('');
                }}
                className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-create-api-key"
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Generar API Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Keys */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-sm">No tienes ninguna API Key activa</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Crea hasta 3 claves para consultar este catálogo desde otras aplicaciones o integraciones externas.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear Mi Primera API Key
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {apiKeys.map((k) => {
              const isVisible = !!visibleKeyIds[k.id];
              const isCopied = copiedKeyId === k.id;
              
              const maskedKey = isVisible
                ? k.key
                : `${k.key.substring(0, 12)}${'•'.repeat(20)}${k.key.substring(k.key.length - 4)}`;

              return (
                <div
                  key={k.id}
                  id={`api-key-card-${k.id}`}
                  className={cn(
                    "bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 space-y-4 shadow-sm",
                    k.is_active ? "border-gray-200 hover:border-orange-200" : "border-gray-200 bg-gray-50/60 opacity-80"
                  )}
                >
                  {/* Top row: Name, status badge, switch */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        k.is_active ? "bg-orange-100 text-orange-600" : "bg-gray-200 text-gray-500"
                      )}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{k.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <span className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            k.is_active ? "text-emerald-600" : "text-gray-500"
                          )}>
                            {k.is_active ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Activa
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                                Deshabilitada
                              </>
                            )}
                          </span>
                          <span>•</span>
                          <span>Creada el {new Date(k.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Enable/Disable Switch */}
                      <button
                        type="button"
                        id={`btn-toggle-key-${k.id}`}
                        onClick={() => handleToggleActive(k)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer",
                          k.is_active ? "bg-emerald-600" : "bg-gray-300"
                        )}
                        title={k.is_active ? "Deshabilitar clave" : "Habilitar clave"}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                            k.is_active ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>

                      {/* Renew button */}
                      <button
                        type="button"
                        id={`btn-renew-key-${k.id}`}
                        onClick={() => handleRenewKey(k)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                        title="Regenerar clave (invalida la anterior)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Renovar</span>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        id={`btn-delete-key-${k.id}`}
                        onClick={() => handleDeleteKey(k)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar API Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Token Box */}
                  <div className="flex items-center gap-2 p-3 bg-gray-900 text-gray-200 rounded-xl border border-gray-800 font-mono text-xs overflow-hidden">
                    <Lock className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="flex-1 truncate select-all">{maskedKey}</span>

                    <button
                      type="button"
                      onClick={() => toggleVisibility(k.id)}
                      className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title={isVisible ? "Ocultar clave" : "Mostrar clave"}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(k.key, k.id)}
                      className="p-1 text-gray-400 hover:text-orange-400 transition-colors cursor-pointer"
                      title="Copiar clave"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Último uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Aún no ha sido consultada'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKeyForTest(k.key);
                        runTestQuery(k.key);
                      }}
                      className="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      Probar con esta clave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Documentation & Test Console */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div 
          onClick={() => setShowDoc(!showDoc)}
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-base">Documentación del Endpoint & Código de Ejemplo</h4>
              <p className="text-xs text-gray-500">Consulta de productos, categorías, imágenes y precios en formato JSON</p>
            </div>
          </div>
          <button type="button" className="p-2 text-gray-400 hover:text-gray-700">
            {showDoc ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showDoc && (
          <div className="p-6 pt-0 border-t border-gray-100 space-y-6">
            {/* Endpoint Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Globe className="w-4 h-4 text-orange-600" />
                  <span>Endpoint Principal (GET)</span>
                </div>
                <div className="font-mono text-xs bg-white p-2.5 rounded-xl border border-gray-200 text-gray-800 break-all select-all">
                  {origin}/api/v1/catalog/products
                </div>
                <p className="text-[11px] text-gray-500">
                  Devuelve todos los productos del catálogo, tasa de cambio base y efectiva, categorías e información de contacto.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Lock className="w-4 h-4 text-orange-600" />
                  <span>Métodos de Autenticación Soportados</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1 font-mono">
                  <li>• Header: <code className="text-orange-600 font-bold">x-api-key: TU_KEY</code></li>
                  <li>• Header: <code className="text-orange-600 font-bold">Authorization: Bearer TU_KEY</code></li>
                  <li>• Query Param: <code className="text-orange-600 font-bold">?api_key=TU_KEY</code></li>
                </ul>
              </div>
            </div>

            {/* Code Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('curl')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      activeCodeTab === 'curl' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('js')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      activeCodeTab === 'js' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    JavaScript / Fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab('python')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      activeCodeTab === 'python' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Python (Requests)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const text = activeCodeTab === 'curl' ? curlSnippet : (activeCodeTab === 'js' ? jsSnippet : pythonSnippet);
                    handleCopy(text, 'snippet');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 flex items-center gap-1.5"
                >
                  {copiedKeyId === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Código</span>
                </button>
              </div>

              <div className="relative bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <pre className="whitespace-pre-wrap">
                  {activeCodeTab === 'curl' && curlSnippet}
                  {activeCodeTab === 'js' && jsSnippet}
                  {activeCodeTab === 'python' && pythonSnippet}
                </pre>
              </div>
            </div>

            {/* Live Interactive Tester */}
            <div className="pt-2 border-t border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-600" />
                    Probador de API en Vivo
                  </h5>
                  <p className="text-xs text-gray-500">Ejecuta una petición en tiempo real usando cualquiera de tus claves activas</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedKeyForTest || (apiKeys[0]?.key || '')}
                    onChange={e => setSelectedKeyForTest(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  >
                    {apiKeys.map(k => (
                      <option key={k.id} value={k.key}>
                        {k.name} ({k.is_active ? 'Activa' : 'Inactiva'})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isTesting || apiKeys.length === 0}
                    onClick={() => runTestQuery(selectedKeyForTest || apiKeys[0]?.key || '')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Ejecutar Petición</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Respuesta JSON del Servidor:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(testResult, null, 2), 'response_json')}
                      className="text-orange-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      {copiedKeyId === 'response_json' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copiar JSON
                    </button>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 rounded-2xl p-4 font-mono text-xs max-h-80 overflow-y-auto border border-slate-800 shadow-inner">
                    <pre>{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

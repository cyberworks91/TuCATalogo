import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ArrowLeft,
  ShoppingBag,
  Store,
  Users,
  ShieldCheck,
  QrCode,
  Share2,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  DollarSign,
  Smartphone,
  ExternalLink,
  MessageCircle,
  FileText,
  Clock,
  MapPin,
  Trash2,
  AlertTriangle,
  Lightbulb,
  CreditCard,
  Settings,
  Plus,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';

interface HelpSection {
  id: string;
  category: string;
  title: string;
  summary: string;
  badge?: string;
  steps?: { title: string; desc: string; detail?: string }[];
  example?: {
    title: string;
    scenario: string;
    content: string | React.ReactNode;
    tips?: string[];
  };
  details: string[];
}

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'inicio-rapido': true,
    'hacer-pedidos': true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const categories = [
    { id: 'todos', label: 'Todos los Temas', icon: BookOpen },
    { id: 'inicio', label: 'Inicio Rápido', icon: Sparkles },
    { id: 'clientes', label: 'Clientes y Pedidos', icon: ShoppingBag },
    { id: 'catalogo', label: 'Administrar Catálogo', icon: Store },
    { id: 'productos', label: 'Productos y Variantes', icon: Package },
    { id: 'ventas', label: 'Pedidos y WhatsApp', icon: MessageCircle },
    { id: 'personalizacion', label: 'Diseño y QR', icon: QrCode },
    { id: 'superadmin', label: 'Superadmin y Planes', icon: ShieldCheck },
    { id: 'faq', label: 'Preguntas Frecuentes', icon: HelpCircle },
  ];

  const helpItems: HelpSection[] = [
    {
      id: 'inicio-rapido',
      category: 'inicio',
      title: 'Guía de Inicio Rápido: Tu catálogo en 3 pasos',
      badge: 'Esencial',
      summary: 'Aprende a crear y poner en marcha tu catálogo digital en menos de 5 minutos.',
      steps: [
        {
          title: 'Paso 1: Regístrate y crea tu catálogo',
          desc: 'Haz clic en "Crear Catálogo" o "Registro". Asigna un nombre a tu negocio y elige un enlace exclusivo (slug), por ejemplo: tucatalogo.com/mi-tienda.',
          detail: 'El slug se genera automáticamente a partir de tu nombre de negocio, pero puedes ajustarlo para que sea corto y fácil de recordar.'
        },
        {
          title: 'Paso 2: Añade tus categorías y productos',
          desc: 'Entra a tu Panel de Administración. Agrega tus primeros artículos con foto de portada, precio en CUP, USD o MLC, descripción y cantidad disponible.',
          detail: 'Puedes organizar tus productos en categorías como "Ropa de Hombre", "Bebidas", "Postres" o "Accesorios" para que tus clientes encuentren todo fácilmente.'
        },
        {
          title: 'Paso 3: Comparte tu catálogo e imprime tu QR',
          desc: 'Usa el botón "Compartir" para enviar el enlace a tus clientes por WhatsApp o Facebook, o descarga el código QR para colocarlo en tu tienda física o restaurante.',
          detail: 'Cada vez que un cliente seleccione productos, el pedido llegará directo a tu WhatsApp con la lista completa y el total calculado.'
        }
      ],
      example: {
        title: 'Ejemplo: Negocio "Cafetería La Esquina"',
        scenario: 'Un dueño de cafetería quiere que sus clientes vean el menú desde el móvil y ordenen para llevar.',
        content: (
          <div className="space-y-2 text-sm bg-orange-50/50 p-4 rounded-xl border border-orange-200">
            <p className="font-semibold text-orange-950">Flujo de trabajo recomendado:</p>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
              <li>Crea el catálogo con URL: <strong>/la-esquina</strong></li>
              <li>Sube categorías: <em>Desayunos</em>, <em>Cafés</em>, <em>Sándwiches</em>, <em>Refrescos</em>.</li>
              <li>Añade productos con fotos llamativas y precios en <strong>CUP</strong> (ejemplo: <code>Café Expreso - 150 CUP</code>).</li>
              <li>Coloca el código QR impreso en cada mesa. Los clientes escanean con la cámara y ven la carta completa.</li>
            </ol>
          </div>
        ),
        tips: [
          'Usa fotos cuadradas o rectangulares bien iluminadas.',
          'Configura tu número de WhatsApp con código de país (+53 para Cuba) para recibir los pedidos sin errores.'
        ]
      },
      details: [
        'Tu catálogo funciona 24/7 sin necesidad de descargar aplicaciones pesadas.',
        'Totalmente compatible con teléfonos lentos o conexiones de datos móviles estándar.'
      ]
    },
    {
      id: 'hacer-pedidos',
      category: 'clientes',
      title: 'Cómo comprar y hacer pedidos como Cliente',
      badge: 'Para Compradores',
      summary: 'Guía paso a paso para que cualquier comprador navegue, llene su bolsa y envíe su pedido por WhatsApp.',
      steps: [
        {
          title: '1. Explorar el catálogo',
          desc: 'Navega por las categorías, usa la barra de búsqueda o filtra por precio y disponibilidad.',
          detail: 'Puedes cambiar entre vista de cuadrícula o lista detallada según tu preferencia.'
        },
        {
          title: '2. Seleccionar productos y variantes',
          desc: 'Al hacer clic en un producto, verás su descripción, imágenes ampliadas y podrás elegir variantes como talla, color o tipo si existen.',
          detail: 'Presiona "Añadir a la Bolsa" y especifica la cantidad deseada.'
        },
        {
          title: '3. Revisar la Bolsa de Compras',
          desc: 'Abre la bolsa desde el icono superior. Podrás verificar cada producto, ajustar cantidades o quitar artículos.',
          detail: 'El total se calcula automáticamente en la moneda del catálogo (ej. 300 CUP).'
        },
        {
          title: '4. Completar datos y enviar por WhatsApp',
          desc: 'Escribe tu nombre, teléfono de contacto, dirección de entrega o notas especiales. Presiona "Enviar Pedido por WhatsApp".',
          detail: 'Se abrirá WhatsApp con el mensaje estructurado listo para enviar al negocio.'
        }
      ],
      example: {
        title: 'Ejemplo de mensaje enviado por WhatsApp',
        scenario: 'Así es exactamente como el negocio recibe el pedido del cliente:',
        content: (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 font-mono text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed shadow-inner">
{`🛍️ *NUEVO PEDIDO - Pedido #0042*
Catálogo: *Modas & Estilos*
Cliente: *Carlos González*
Teléfono: *+53 52123456*
Carnet: *95041233890*
Dirección: *Calle 23 #456 e/ H e I, Vedado*

*PRODUCTOS:*
• 1x Camisa Lino Manga Larga (Talla: L, Color: Blanco) — 3,500 CUP
• 2x Bermuda Casual (Talla: 32, Color: Beige) — 4,000 CUP

*RESUMEN:*
Subtotal: 7,500 CUP
Envío: 300 CUP
*TOTAL A PAGAR: 7,800 CUP*

Ver pedido en línea: https://tucatalogo.com/modas/orders/0042`}
          </div>
        ),
        tips: [
          'El cliente siempre tiene acceso a su comprobante digital o factura con número consecutivo.',
          'El negocio puede responder inmediatamente para acordar pago en efectivo, transferencia o fecha de entrega.'
        ]
      },
      details: [
        'Los clientes pueden ver su historial de pedidos en la sección "Historial" usando su número de teléfono o carnet.',
        'No es obligatorio crearse una cuenta para comprar, agilizando la compra en menos de 1 minuto.'
      ]
    },
    {
      id: 'gestion-productos',
      category: 'productos',
      title: 'Creación y Gestión de Productos y Variantes',
      badge: 'Administración',
      summary: 'Aprende a añadir productos, establecer precios, variantes, código consecutivo y fotos.',
      steps: [
        {
          title: 'Código Consecutivo Automático',
          desc: 'El sistema genera códigos ordenados como P0001, P0002, etc., facilitando el inventario físico y la referencia rápida.',
          detail: 'Puedes utilizar este código para buscar productos al instante o imprimir etiquetas.'
        },
        {
          title: 'Precios y Monedas',
          desc: 'Configura el precio en la moneda de tu preferencia (CUP, USD, MLC). El formato se muestra estandarizado (ej: 300 CUP).',
          detail: 'Puedes añadir un precio anterior o de oferta para mostrar descuentos visuales atractivos a los clientes.'
        },
        {
          title: 'Variantes de Producto (Tallas, Colores, Opciones)',
          desc: 'Si vendes calzado, ropa o comida, añade variantes fácilmente: Tallas (S, M, L, XL, 38, 40), Colores o Sabores.',
          detail: 'El cliente podrá seleccionar exactamente la combinación que desea antes de añadir a la bolsa.'
        },
        {
          title: 'Control de Stock e Inventario',
          desc: 'Indica la cantidad disponible. Si un producto se agota, puedes marcarlo como no disponible sin borrarlo.',
          detail: 'Los productos pausados se ocultan automáticamente del catálogo público pero se conservan en tu panel de administración.'
        }
      ],
      example: {
        title: 'Ejemplo: Producto con Variantes y Descuento',
        scenario: 'Configurar un calzado deportivo con descuento:',
        content: (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-gray-800">Tenis Urban Runner</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono font-bold">Código: P0028</span>
            </div>
            <p className="text-gray-600 text-xs">Tenis ligeros y cómodos para uso diario y entrenamiento.</p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-emerald-600">4,500 CUP</span>
              <span className="text-sm line-through text-gray-400">5,200 CUP</span>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">-13% OFERTA</span>
            </div>
            <div className="pt-2 text-xs text-gray-500">
              <strong>Variantes configuradas:</strong>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-1 bg-white border rounded">Talla 39</span>
                <span className="px-2 py-1 bg-white border rounded">Talla 40</span>
                <span className="px-2 py-1 bg-white border rounded">Talla 41</span>
                <span className="px-2 py-1 bg-white border rounded">Talla 42</span>
              </div>
            </div>
          </div>
        ),
        tips: [
          'Usa el botón de duplicar producto para cargar artículos similares en segundos.',
          'Puedes ordenar los productos por precio, nombre o fecha de creación.'
        ]
      },
      details: [
        'Las imágenes se optimizan automáticamente para cargar a toda velocidad en conexiones móviles.',
        'Soporta múltiples imágenes por producto para mostrar distintos ángulos.'
      ]
    },
    {
      id: 'gestion-pedidos',
      category: 'ventas',
      title: 'Panel de Pedidos, Facturación e Historial',
      badge: 'Ventas',
      summary: 'Cómo gestionar pedidos entrantes, cambiar estados, imprimir facturas y exportar a Excel.',
      steps: [
        {
          title: 'Notificación de Nuevos Pedidos',
          desc: 'En la barra superior de tu catálogo verás un indicador rojo con la cantidad de pedidos pendientes en tiempo real.',
          detail: 'Haz clic en "Pedidos" para abrir la tabla de pedidos pendientes y en proceso.'
        },
        {
          title: 'Cambio de Estados del Pedido',
          desc: 'Actualiza el estado según la fase: Pendiente ⏳ -> Confirmado 📋 -> En preparación 🍳 -> Enviado 🛵 -> Entregado ✅.',
          detail: 'Esto mantiene organizado a tu equipo de cocina, almacén o mensajería.'
        },
        {
          title: 'Factura y Comprobante Digital (Invoice)',
          desc: 'Genera comprobantes oficiales listos para imprimir en impresoras térmicas (recibos) o guardar como PDF.',
          detail: 'Incluye logo del negocio, desglose de impuestos/envío, carnet del cliente y código QR de verificación.'
        },
        {
          title: 'Exportación a Excel / CSV',
          desc: 'Descarga reportes de ventas por rangos de fecha para llevar tu contabilidad sin complicaciones.',
          detail: 'Ideal para revisar ingresos semanales, mensuales o analizar qué productos se venden más.'
        }
      ],
      example: {
        title: 'Ciclo de vida de un pedido',
        scenario: 'Cómo transita un pedido desde que el cliente lo pide hasta la entrega:',
        content: (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="block font-bold text-amber-800 mb-1">1. Pendiente</span>
              <p className="text-gray-600">Entra desde la web o WhatsApp. Espera confirmación del negocio.</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="block font-bold text-blue-800 mb-1">2. En preparación</span>
              <p className="text-gray-600">Se empaca o cocina el pedido en taller/cocina.</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="block font-bold text-purple-800 mb-1">3. En camino</span>
              <p className="text-gray-600">El mensajero sale con la dirección y teléfono del cliente.</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="block font-bold text-emerald-800 mb-1">4. Entregado</span>
              <p className="text-gray-600">Cobrado con éxito. Pasa automáticamente al historial.</p>
            </div>
          </div>
        )
      },
      details: [
        'Puedes buscar pedidos rápidamente por número de orden (#0015), carnet o teléfono del cliente.',
        'Si un pedido se cancela, puedes indicar el motivo para llevar un registro interno.'
      ]
    },
    {
      id: 'personalizacion-qr',
      category: 'personalizacion',
      title: 'Personalización de Marca, Contacto y Códigos QR',
      badge: 'Diseño',
      summary: 'Personaliza los colores, banner, horarios, redes y genera códigos QR para tu local.',
      steps: [
        {
          title: 'Identidad Visual y Colores',
          desc: 'Configura tu logo, banner de bienvenida, color de barra superior, barra inferior y tipografías.',
          detail: 'Elige colores que coincidan con la identidad de tu marca para que tu catálogo luzca profesional.'
        },
        {
          title: 'Datos de Contacto y Horarios',
          desc: 'Añade tu número de teléfono, enlace a WhatsApp, correo de contacto, horario laboral y dirección con mapa interactivo.',
          detail: 'Toda esta información se muestra automáticamente en el pie de página ("Acerca de") para tus visitantes.'
        },
        {
          title: 'Generador de Códigos QR',
          desc: 'Genera códigos QR de alta resolución para todo el catálogo o para productos específicos.',
          detail: 'Puedes descargar el QR en formato PNG o imprimirlo en volantes, pegatinas para escaparates o cartas de mesa.'
        },
        {
          title: 'Compartir en Redes Sociales',
          desc: 'Con el botón de compartir, envía tu enlace directo por WhatsApp, Telegram, Facebook o cópialo al portapapeles.',
          detail: 'Al compartir, se genera una vista previa con imagen y descripción de tu negocio.'
        }
      ],
      details: [
        'El generador de QR permite personalizar colores del código para integrarlo con tu diseño gráfico.',
        'Los clientes que escanean el QR entran directamente al catálogo sin necesidad de escribir la dirección web.'
      ]
    },
    {
      id: 'seguridad-eliminacion',
      category: 'catalogo',
      title: 'Seguridad y Solicitud de Eliminación de Catálogo',
      badge: 'Configuración',
      summary: 'Cómo funciona la protección de datos, roles de usuarios y el proceso seguro de eliminación.',
      steps: [
        {
          title: 'Roles de Usuarios (Dueño, Editor, Superadmin)',
          desc: 'El dueño del catálogo puede asignar editores para ayudar en la carga de productos y atención de pedidos sin darles acceso a configuración crítica.',
          detail: 'Los editores no pueden borrar el catálogo ni cambiar la propiedad de la cuenta.'
        },
        {
          title: 'Solicitud de Eliminación por el Administrador',
          desc: 'En la pestaña "Configuración" del catálogo, el administrador encontrará la opción para solicitar la eliminación.',
          detail: 'Aparecerá una advertencia de confirmación y un campo opcional para exponer los motivos de la solicitud.'
        },
        {
          title: 'Desactivación Inmediata de Seguridad',
          desc: 'Al confirmar la eliminación, el catálogo se desactiva inmediatamente: se oculta de la pantalla principal y se bloquea el acceso de administradores y editores.',
          detail: 'El catálogo pasa a la sesión de seguridad "Catálogos Eliminados" bajo supervisión del Superadministrador.'
        },
        {
          title: 'Confirmación o Cancelación por el Superadministrador',
          desc: 'El Superadministrador puede revisar el motivo y decidir entre "Cancelar" (restaurar el catálogo a su estado normal) o "Eliminar Definitivamente".',
          detail: 'Esto previene borrados accidentales y protege los datos de clientes y pedidos.'
        }
      ],
      details: [
        'Tus contraseñas y datos están protegidos con cifrado de grado industrial.',
        'Si solicitaste la eliminación por error, puedes solicitarle al Superadministrador que cancele la eliminación para restaurar todo intacto.'
      ]
    },
    {
      id: 'superadmin-panel',
      category: 'superadmin',
      title: 'Panel de Superadministrador: Gestión Global y Planes',
      badge: 'Superadmin',
      summary: 'Herramientas avanzadas para los administradores globales de la plataforma TuCATalogo.',
      steps: [
        {
          title: 'Búsqueda Avanzada de Usuarios',
          desc: 'Busca usuarios en tiempo real por: nombre de usuario, nombre completo, teléfono, correo electrónico o carnet de identidad.',
          detail: 'Permite localizar clientes y dueños de catálogos en segundos para soporte o verificación.'
        },
        {
          title: 'Pestaña "Planes y Catálogos"',
          desc: 'Supervisa el rendimiento de todos los catálogos activos, planes contratados y límites de productos.',
          detail: 'Desde esta pestaña puedes gestionar la suscripción de cada negocio o asignar planes especiales.'
        },
        {
          title: 'Bandeja de "Catálogos Eliminados"',
          desc: 'Al fondo de la gestión de catálogos, se encuentra la lista de catálogos solicitados para eliminar.',
          detail: 'Cuenta con botones para "Cancelar" (restaurar) o "Eliminar Definitivamente", mostrando el motivo expuesto por el usuario.'
        },
        {
          title: 'Aprobación de Pagos y Facturación',
          desc: 'Revisa comprobantes de transferencia (ej. Transfermóvil, EnZona, Zelle) y activa suscripciones al instante.',
          detail: 'Registro completo de transacciones y fechas de vigencia de planes.'
        }
      ],
      details: [
        'Acceso exclusivo para usuarios con rol `superadmin`.',
        'Panel optimizado para gestionar cientos de negocios de forma rápida y centralizada.'
      ]
    },
    {
      id: 'faq-preguntas',
      category: 'faq',
      title: 'Preguntas Frecuentes (FAQ)',
      badge: 'Respuestas Rápidas',
      summary: 'Respuestas a las dudas más comunes de vendedores y compradores.',
      steps: [
        {
          title: '¿Los clientes tienen que pagar para ver el catálogo?',
          desc: 'No, el acceso al catálogo y la realización de pedidos es 100% gratuito para cualquier persona desde su navegador.',
          detail: 'No requiere descargar aplicaciones ni registrarse obligatoriamente.'
        },
        {
          title: '¿Cómo cobro mis ventas?',
          desc: 'Tú decides el método de cobro: efectivo a la entrega, transferencia bancaria (Transfermóvil, EnZona, Zelle, Bizum) o pasarelas.',
          detail: 'TuCATalogo no retiene tu dinero ni cobra comisiones porcentuales sobre tus ventas.'
        },
        {
          title: '¿Se puede instalar como aplicación en el teléfono (PWA)?',
          desc: '¡Sí! Al abrir tu catálogo en Chrome o Safari, puedes presionar "Añadir a la pantalla de inicio" para tener un acceso directo con icono idéntico a una app nativa.',
          detail: 'Carga al instante y ocupa una fracción mínima de espacio en el móvil.'
        },
        {
          title: '¿Qué pasa si mi catálogo fue marcado como eliminado por error?',
          desc: 'El catálogo no se borra de inmediato; queda guardado en la papelera de seguridad del Superadministrador.',
          detail: 'El Superadministrador puede presionar "Cancelar" para restaurar el catálogo con todos sus productos y pedidos intactos.'
        },
        {
          title: '¿Cómo se formatean los precios?',
          desc: 'El sistema muestra el monto seguido de la moneda oficial (por ejemplo: "300 CUP", "25 USD"), respetando la convención monetaria estándar.',
          detail: 'Evita confusiones al compartir enlaces o mensajes en redes sociales.'
        }
      ],
      details: [
        'Si tienes una duda que no aparece aquí, comunícate con el soporte del administrador de la plataforma.'
      ]
    }
  ];

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    return helpItems.filter(item => {
      const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
      if (!searchTerm.trim()) return matchesCategory;

      const q = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchDetails = item.details.some(d => d.toLowerCase().includes(q));
      const matchSteps = item.steps?.some(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || (s.detail && s.detail.toLowerCase().includes(q)));
      const matchExample = item.example?.title.toLowerCase().includes(q) || item.example?.scenario.toLowerCase().includes(q);

      return matchesCategory && (matchTitle || matchSummary || matchDetails || matchSteps || matchExample);
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              title="Volver atrás"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2 text-orange-600 font-extrabold text-xl hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-sm shadow-orange-300">
                <Store className="w-5 h-5" />
              </div>
              <span>TuCATalogo</span>
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              <HelpCircle className="w-3.5 h-3.5" />
              Centro de Ayuda
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
            >
              Inicio
            </Link>
            <Link
              to="/crear-catalogo"
              className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-all shadow-sm shadow-orange-200 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Crear Catálogo</span>
              <span className="sm:hidden">Crear</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white py-12 px-4 sm:px-6 relative overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Documentación y Guías Oficiales
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            ¿En qué podemos ayudarte hoy?
          </h1>
          <p className="text-orange-100 text-base sm:text-lg max-w-2xl mx-auto">
            Descubre todas las funciones, características, ejemplos prácticos y respuestas para impulsar las ventas de tu negocio con TuCATalogo.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute left-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca por función: 'WhatsApp', 'precios', 'variantes', 'pedidos', 'QR', 'eliminar'..."
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white text-gray-800 placeholder-gray-400 shadow-xl border-2 border-transparent focus:border-amber-300 focus:outline-none text-sm sm:text-base font-medium transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 text-gray-400 hover:text-gray-600 text-xs bg-gray-100 hover:bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-left text-xs text-orange-100 mt-2 pl-2">
                Mostrando resultados para: <strong className="text-white">"{searchTerm}"</strong> ({filteredItems.length} artículos encontrados)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Quick Highlights / Shortcuts Cards */}
        {!searchTerm && selectedCategory === 'todos' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => setSelectedCategory('inicio')}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-orange-100 hover:border-orange-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">Primeros Pasos</h3>
              <p className="text-xs text-gray-500 mt-1">Aprende a crear tu catálogo, añadir productos y compartir tu link en minutos.</p>
            </div>

            <div 
              onClick={() => setSelectedCategory('ventas')}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-amber-100 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Ventas por WhatsApp</h3>
              <p className="text-xs text-gray-500 mt-1">Cómo se reciben los pedidos con detalles completos y montos listos para cobrar.</p>
            </div>

            <div 
              onClick={() => setSelectedCategory('productos')}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-emerald-100 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Variantes y Precios</h3>
              <p className="text-xs text-gray-500 mt-1">Configura tallas, colores, moneda oficial (ej. 300 CUP) y códigos automáticos.</p>
            </div>
          </div>
        )}

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-200'
                    : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Help Articles List */}
        <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No encontramos resultados para tu búsqueda</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Intenta buscar con otros términos como "pedido", "catálogo", "moneda", "WhatsApp" o restablece la categoría.
              </p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('todos'); }}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors"
              >
                Ver todos los temas
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = !!expandedSections[item.id] || searchTerm.trim().length > 0;
              return (
                <div
                  key={item.id}
                  id={item.id}
                  className="bg-white rounded-2xl border border-gray-200/80 hover:border-orange-200 shadow-xs hover:shadow-sm transition-all overflow-hidden"
                >
                  {/* Article Accordion Header */}
                  <div
                    onClick={() => toggleSection(item.id)}
                    className="p-5 sm:p-6 cursor-pointer flex items-start justify-between gap-4 select-none hover:bg-orange-50/20 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.badge && (
                          <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 capitalize">
                          {categories.find(c => c.id === item.category)?.label || item.category}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 hover:text-orange-600 transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <button
                      className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-100/50 rounded-xl transition-all shrink-0 mt-1"
                      aria-label="Expandir o contraer sección"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-orange-600' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-100 space-y-6 bg-white animate-in fade-in-50 duration-200">
                      {/* Step by step list */}
                      {item.steps && item.steps.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Paso a paso detallado
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {item.steps.map((step, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2 hover:bg-orange-50/30 transition-colors"
                              >
                                <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                                  <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                                    {idx + 1}
                                  </div>
                                  <span>{step.title}</span>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed pl-8">
                                  {step.desc}
                                </p>
                                {step.detail && (
                                  <p className="text-[11px] text-gray-500 leading-relaxed pl-8 border-l-2 border-orange-200 ml-8 italic">
                                    {step.detail}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Practical Example */}
                      {item.example && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            <span>{item.example.title}</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {item.example.scenario}
                          </p>
                          <div>{item.example.content}</div>

                          {item.example.tips && item.example.tips.length > 0 && (
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1 text-amber-900">
                              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                Consejos prácticos:
                              </p>
                              <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                                {item.example.tips.map((tip, tIdx) => (
                                  <li key={tIdx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extra Key Highlights */}
                      {item.details && item.details.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3">
                          {item.details.map((detail, dIdx) => (
                            <div key={dIdx} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Call to Action Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold">¿Listo para comenzar a vender?</h3>
            <p className="text-sm text-orange-100 max-w-xl">
              Crea tu catálogo en línea en minutos, personalízalo a tu gusto y empieza a recibir pedidos directos a tu WhatsApp sin comisiones intermedias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/crear-catalogo"
              className="px-6 py-3 bg-white text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-all shadow-md text-sm whitespace-nowrap"
            >
              Crear Mi Catálogo Gratis
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-orange-700/60 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all text-sm whitespace-nowrap border border-white/20"
            >
              Explorar Catálogos
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} TuCATalogo — Plataforma de Catálogos Digitales y Gestión de Pedidos.</p>
          <p>¿Preguntas adicionales? Contáctanos a través de tu panel de administración o directamente por WhatsApp.</p>
        </div>
      </footer>
    </div>
  );
};

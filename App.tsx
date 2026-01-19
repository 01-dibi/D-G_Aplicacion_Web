
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  Truck, 
  Search, 
  MessageCircle, 
  ChevronRight, 
  Menu,
  User,
  Package,
  ArrowLeft,
  Loader2,
  ScanSearch,
  X,
  Send,
  History,
  ChevronLeft,
  Layers,
  StickyNote,
  UserCheck,
  Navigation,
  Trash2,
  PlusSquare,
  ClipboardCheck,
  Box,
  Hash,
  ExternalLink,
  UserCircle,
  Check,
  Share2,
  Mail,
  BellRing,
  LogOut,
  MapPinned,
  CalendarDays,
  Clock,
  ChevronDown,
  Lock,
  Eye,
  Link2,
  Boxes
} from 'lucide-react';
import { Order, OrderStatus, View, OrderItem, Packaging, PackagingEntry } from './types';

// CONFIGURACIÓN DE PRODUCCIÓN Y CONTACTO
const CENTRAL_WHATSAPP_NUMBER = "2974723835"; 
const CENTRAL_EMAIL = "depaoliroberto364@gmail.com";

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'OTRO'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'PAQUETE', 'BULTO', 'BOBINA', 'OTRO'];

const MOCK_CUSTOMERS = [
  { id: "101", name: "DISTRIBUIDORA GARCÍA", locality: "FIRMAT" },
  { id: "102", name: "BAZAR EL TURCO", locality: "ROSARIO" },
  { id: "103", name: "REGALERÍA SANTA FE", locality: "SANTA FE" },
  { id: "104", name: "JUGUETES PEPE", locality: "VENADO TUERTO" },
  { id: "105", name: "CASA LÓPEZ", locality: "FIRMAT" },
];

const viewNames: Record<View, string> = {
  DASHBOARD: 'TABLERO',
  PENDING: 'PENDIENTES',
  COMPLETED: 'COMPLETADOS',
  DISPATCHED: 'DESPACHO',
  NEW_ORDER: 'NUEVO PEDIDO',
  NEW_ORDER_MANUAL: 'CARGA MANUAL',
  ALL: 'HISTORIAL',
  GENERAL_ENTRY: 'ENTRADA GENERAL',
  TRACKING: 'SEGUIMIENTO'
};

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [innerTrackingOrder, setInnerTrackingOrder] = useState<Order | null>(null);
  
  // PERSISTENCIA DE DATOS: 
  // Nota para despliegue: Aquí es donde se conectaría Supabase.
  // Ejemplo: const { data } = await supabase.from('orders').select('*');
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dg_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ORDERS;
      }
    }
    return INITIAL_ORDERS;
  });

  useEffect(() => {
    localStorage.setItem('dg_orders', JSON.stringify(orders));
    // Sincronización con DB real aquí
  }, [orders]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGeneralEntryModal, setShowGeneralEntryModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'staff' } | null>(null);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const stats = useMemo(() => ({
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
    dispatched: orders.filter(o => o.status === OrderStatus.DISPATCHED).length,
    total: orders.filter(o => o.status === OrderStatus.ARCHIVED).length
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    if (view === 'ALL') base = orders.filter(o => o.status === OrderStatus.ARCHIVED);
    if (view === 'TRACKING') base = orders; 
    
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      o.customerName.toLowerCase().includes(lowSearch) || 
      o.orderNumber.toLowerCase().includes(lowSearch) ||
      (o.customerNumber || '').includes(lowSearch) ||
      (o.locality || '').toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleSelectOrder = (order: Order) => {
    if (view === 'TRACKING') {
      setInnerTrackingOrder(order);
      return;
    }
    if (!currentUser) return;
    if (view !== 'ALL' && order.lockedBy && order.lockedBy !== currentUser.name && !isAdmin) {
      alert(`⚠️ TRABAJO EN CURSO: ${order.lockedBy} está editando este pedido.`);
      return;
    }
    if (view !== 'ALL' && order.status !== OrderStatus.ARCHIVED) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, lockedBy: currentUser.name } : o));
    }
    setSelectedOrder({ ...order, lockedBy: (view !== 'ALL' && order.status !== OrderStatus.ARCHIVED) ? currentUser.name : undefined });
  };

  const handleCloseDetails = () => {
    if (selectedOrder && currentUser && selectedOrder.status !== OrderStatus.ARCHIVED) {
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, lockedBy: undefined } : o));
    }
    setSelectedOrder(null);
  };

  const handleUpdateStatus = (id: string, newStatus: OrderStatus, extraData?: Partial<Order>) => {
    setOrders(prev => {
      const targetOrder = prev.find(o => o.id === id);
      if (newStatus === OrderStatus.ARCHIVED && targetOrder?.customerNumber) {
        return prev.map(o => 
          (o.id === id || (o.customerNumber === targetOrder.customerNumber && [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED].includes(o.status)))
          ? { ...o, status: newStatus, ...extraData, lockedBy: undefined } 
          : o
        );
      }
      return prev.map(o => o.id === id ? { ...o, status: newStatus, ...extraData, lockedBy: undefined } : o);
    });
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm("⚠️ ¿ELIMINAR PEDIDO? Esta acción no se puede deshacer.")) {
      setOrders(prev => prev.filter(o => o.id !== id));
      setSelectedOrder(null);
      setInnerTrackingOrder(null);
    }
  };

  const addQuickOrder = (customer: string, locality: string, items: string, source: any, detail: string, orderNum: string, reviewer: string, customerNumber?: string, observations?: string) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: orderNum || `P-${Math.floor(Math.random() * 900) + 100}`,
      customerNumber: customerNumber,
      customerName: customer,
      locality: locality,
      status: OrderStatus.PENDING,
      items: [{ id: '1', name: items || 'Pedido General', quantity: 1 }],
      packaging: { bolsas: 0, bultos: 0, cajas: 0 },
      detailedPackaging: [],
      reviewer: reviewer || currentUser?.name || 'Responsable',
      notes: observations || '',
      createdAt: new Date().toISOString(),
      source: 'Manual',
      sourceDetail: detail,
      location: ''
    };
    setOrders([newOrder, ...orders]);
    setNewOrderNotification(newOrder);
  };

  const shareOrder = async (order: Order, type: 'whatsapp' | 'email', customStage?: string) => {
    const stageDisplay = customStage || {
      [OrderStatus.PENDING]: 'EN PREPARACIÓN',
      [OrderStatus.COMPLETED]: 'LISTO PARA DESPACHO',
      [OrderStatus.DISPATCHED]: 'DESPACHADO',
      [OrderStatus.ARCHIVED]: 'ENTREGADO / FINALIZADO'
    }[order.status];
    
    const detailedPkg = order.detailedPackaging || [];
    const totalQty = detailedPkg.reduce((acc, curr) => acc + curr.quantity, 0);
    const responsibleName = order.reviewer || (currentUser?.name || "Responsable");

    let text = `*D&G BAZAR Y REGALERIA*\n*ESTADO:* ${stageDisplay}\n--------------------------\n*Pedido:* ${order.orderNumber}\n*Cliente:* ${order.customerName}\n`;
    if (order.locality) text += `*Localidad:* ${order.locality}\n`;
    if (detailedPkg.length > 0) {
      text += `*DETALLE DE EMPAQUE:*\n`;
      detailedPkg.forEach(p => { text += `- Dep. ${p.deposit}: ${p.quantity} ${p.type.toUpperCase()}(S)\n`; });
      text += `- *Total cantidad:* ${totalQty}\n`;
    }
    if (order.carrier) text += `*Transporte:* ${order.carrier}\n`;
    text += `*Responsable:* ${responsibleName}\n`;
    if (order.notes) text += `*Notas:* ${order.notes}\n`;
    text += `--------------------------\n_Actualizado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}_`;

    if (type === 'whatsapp') {
      const waNumber = customStage === 'RECEPCIÓN' ? CENTRAL_WHATSAPP_NUMBER : "";
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const emailTarget = customStage === 'RECEPCIÓN' ? CENTRAL_EMAIL : "";
      const emailBody = text.replace(/\*/g, '');
      window.location.href = `mailto:${emailTarget}?subject=${encodeURIComponent(stageDisplay + ' - ' + order.customerName)}&body=${encodeURIComponent(emailBody)}`;
    }
    if (customStage === 'RECEPCIÓN') setNewOrderNotification(null);
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative overflow-x-hidden font-sans selection:bg-teal-100">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative bg-white w-72 h-full shadow-2xl flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div><h2 className="font-black text-lg uppercase">Menú</h2><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">D&G Logística</p></div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
            </div>
            <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
              <SidebarItem icon={<LayoutDashboard />} label="TABLERO" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Layers className="text-teal-500" />} label="ENTRADA GENERAL" active={false} onClick={() => { setShowGeneralEntryModal(true); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-2" />
              <SidebarItem icon={<ClipboardList className="text-orange-500" />} label="PENDIENTES" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 className="text-emerald-500" />} label="COMPLETADOS" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck className="text-indigo-500" />} label="DESPACHO" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History className="text-slate-500" />} label="HISTORIAL" active={view === 'ALL'} onClick={() => { setView('ALL'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Search className="text-orange-600" />} label="SEGUIMIENTO" active={view === 'TRACKING'} onClick={() => { setView('TRACKING'); setInnerTrackingOrder(null); setIsSidebarOpen(false); }} />
              <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                <SidebarItem icon={<LogOut className="text-red-500" />} label="CERRAR SESIÓN" active={false} onClick={() => setCurrentUser(null)} />
              </div>
            </nav>
          </aside>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-2xl relative z-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/10 rounded-2xl active:scale-90 transition-transform"><Menu size={22} /></button>
          <div className="text-center"><h1 className="text-lg font-black uppercase tracking-tighter"><span className="text-orange-500">D&G</span> LOGISTICA</h1></div>
          <div className="p-2.5 rounded-2xl bg-teal-500 shadow-lg"><User size={20} /></div>
        </div>
      </header>

      <main className="p-5 space-y-6">
        {view === 'DASHBOARD' && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={stats.pending} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={stats.completed} label="COMPLETOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={stats.total} label="HISTORIAL" color="bg-teal-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={stats.dispatched} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-slate-900 text-white rounded-[32px] p-6 flex items-center justify-between shadow-xl active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-teal-50 p-3 rounded-2xl text-slate-900"><Layers size={24} /></div>
                <div className="text-left"><p className="font-black text-lg">ENTRADA GENERAL</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carga rápida de pedidos</p></div>
              </div>
              <ChevronRight size={24} className="text-teal-500" />
            </button>
          </div>
        )}

        {['PENDING', 'COMPLETED', 'DISPATCHED', 'ALL', 'TRACKING'].includes(view) && (
          <div className="space-y-4">
            {view === 'TRACKING' && innerTrackingOrder ? (
              <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setInnerTrackingOrder(null)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 mb-4"><ArrowLeft size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Volver al listado</span></button>
                <TrackingTimelineDetail order={innerTrackingOrder} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600"><ArrowLeft size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Volver</span></button>
                  <h2 className="font-black text-xs text-slate-300 uppercase tracking-widest">{viewNames[view]}</h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="Buscar por cliente, nro o localidad..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:border-teal-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="space-y-3 pb-12">
                  {filteredOrders.length === 0 ? <div className="text-center py-20 opacity-10"><Package size={80} className="mx-auto" /></div> : filteredOrders.map(order => {
                    const totalBultosLabel = (order.detailedPackaging || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                    return (
                      <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm transition-all cursor-pointer relative ${order.lockedBy && view !== 'ALL' ? 'border-orange-200 bg-orange-50/20' : 'border-slate-50 active:bg-slate-100'}`}>
                        {order.lockedBy && view !== 'ALL' && <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-[8px] font-black rounded-bl-xl uppercase animate-pulse">{order.lockedBy} Preparando</div>}
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-600' : order.status === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' : order.status === OrderStatus.ARCHIVED ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>{order.status}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <h3 className="font-black text-slate-800 text-lg leading-tight flex-1">{order.customerName}</h3>
                          {totalBultosLabel > 0 && (
                            <div className="flex items-center gap-1 text-white bg-indigo-600 px-3 py-1.5 rounded-2xl text-[10px] font-black shadow-lg animate-in zoom-in-90 whitespace-nowrap">
                              <Box size={12} /> {totalBultosLabel} BULTOS
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {order.customerNumber && <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"><Hash size={10} /> {order.customerNumber}</div>}
                          {order.locality && <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"><Navigation size={10} /> {order.locality}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {newOrderNotification && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[600] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[48px] p-8 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600"><BellRing size={32} className="animate-bounce" /></div>
            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">¡Pedido Ingresado!</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">¿Desea notificar a Central?</p></div>
            <div className="space-y-3">
              <button onClick={() => shareOrder(newOrderNotification, 'whatsapp', 'RECEPCIÓN')} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xs tracking-widest uppercase active:scale-95"><MessageCircle size={18} /> WhatsApp</button>
              <button onClick={() => shareOrder(newOrderNotification, 'email', 'RECEPCIÓN')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xs tracking-widest uppercase active:scale-95"><Mail size={18} /> Correo</button>
              <button onClick={() => setNewOrderNotification(null)} className="w-full text-slate-400 text-[9px] font-black uppercase py-2">Omitir aviso</button>
            </div>
          </div>
        </div>
      )}

      {showGeneralEntryModal && <GeneralEntryModal onClose={() => setShowGeneralEntryModal(false)} onAdd={addQuickOrder} currentUser={currentUser} />}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          orders={orders} 
          viewMode={view} 
          onClose={handleCloseDetails} 
          onUpdate={handleUpdateStatus} 
          onDelete={handleDeleteOrder} 
          onShare={shareOrder} 
          currentUser={currentUser} 
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-md mx-auto rounded-t-[40px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

// LÍNEA DE TIEMPO DETALLADA
const TrackingTimelineDetail = ({ order }: { order: Order }) => {
  const currentStatus = order.status;
  const steps = [
    { id: OrderStatus.PENDING, label: "Ingresado / En Preparación", detail: "Pedido recibido en depósito.", isActive: true },
    { id: OrderStatus.COMPLETED, label: "Preparación Finalizada", detail: "Mercadería embalada y lista.", isActive: [OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED].includes(currentStatus) },
    { id: OrderStatus.DISPATCHED, label: "Enviado / En Despacho", detail: "Pedido en camino a destino.", isActive: [OrderStatus.DISPATCHED, OrderStatus.ARCHIVED].includes(currentStatus) },
    { id: OrderStatus.ARCHIVED, label: "Pedido Entregado", detail: "Proceso finalizado con éxito.", isActive: currentStatus === OrderStatus.ARCHIVED }
  ];

  return (
    <div className="bg-white rounded-[40px] p-6 shadow-xl border-t-8 border-orange-500">
      <div className="flex justify-between items-start mb-6">
        <div><h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Seguimiento</h2><p className="text-lg font-black text-slate-800 uppercase mt-1">{currentStatus === OrderStatus.ARCHIVED ? 'Entrega Finalizada' : 'En Proceso'}</p></div>
        <div className="bg-slate-100 p-2 rounded-2xl text-slate-500"><ScanSearch size={20} /></div>
      </div>
      <div className="space-y-0 relative pl-4">
        <div className="absolute left-[19px] top-2 bottom-4 w-[2px] bg-slate-100"></div>
        {steps.map((step, idx) => (<TimelineStep key={step.id} label={step.label} detail={step.detail} active={step.isActive} isLast={idx === steps.length - 1} />))}
      </div>
    </div>
  );
};

const TimelineStep = ({ label, detail, active, isLast }: any) => (
  <div className={`relative ${!isLast ? 'pb-8' : ''} flex gap-5`}>
    <div className={`z-10 w-3 h-3 rounded-full mt-1 border-2 ${active ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-200'}`}></div>
    <div className="flex-1 space-y-1">
      <p className={`text-[11px] font-black uppercase ${active ? 'text-slate-800' : 'text-slate-300'}`}>{label}</p>
      <p className={`text-[10px] ${active ? 'text-slate-500' : 'text-slate-200'}`}>{detail}</p>
    </div>
  </div>
);

// MODAL DE DETALLES
const OrderDetailsModal = ({ order, orders, viewMode, onClose, onUpdate, onDelete, onShare, currentUser }: any) => {
  const isReadOnly = viewMode === 'ALL' || order.status === OrderStatus.ARCHIVED;
  const [detailedPkg, setDetailedPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [locality, setLocality] = useState(order.locality || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const linkedOrders = useMemo(() => {
    if (!order.customerNumber) return [];
    return orders.filter(o => o.customerNumber === order.customerNumber && o.id !== order.id && [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED].includes(o.status));
  }, [order.customerNumber, order.id, orders]);

  const handleFinalStep = () => {
    if (isReadOnly) return;
    setIsSaving(true);
    let nextStatus = order.status === OrderStatus.PENDING ? OrderStatus.COMPLETED : order.status === OrderStatus.COMPLETED ? OrderStatus.DISPATCHED : OrderStatus.ARCHIVED;
    onUpdate(order.id, nextStatus, { detailedPackaging: detailedPkg, notes, locality });
    setTimeout(() => { setIsSaving(false); onClose(); }, 500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 space-y-4 max-h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar">
        <div className="flex justify-between items-start pt-4">
          <div><h2 className="text-xl font-black text-slate-800 uppercase">{order.customerName}</h2><p className="text-[10px] text-teal-600 font-bold uppercase">{locality}</p></div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <textarea disabled={isReadOnly} className="w-full bg-slate-50 p-4 rounded-2xl text-xs outline-none resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="NOTAS..." />
          {!isReadOnly && (
            <button onClick={handleFinalStep} disabled={isSaving} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[28px] uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" /> : 'CONFIRMAR Y AVANZAR'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// COMPONENTES AUXILIARES
const NavBtn = ({ active, icon, onClick }: any) => (<button onClick={onClick} className={`p-4 transition-all rounded-[22px] ${active ? 'text-teal-600 bg-teal-50' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>);
const SidebarItem = ({ icon, label, active, onClick }: any) => (<button onClick={onClick} className={`w-full flex items-center gap-4 p-5 rounded-[24px] font-black text-xs ${active ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{React.cloneElement(icon, { size: 20 })} <span className="uppercase">{label}</span></button>);
const StatCard = ({ count, label, color, icon, onClick }: any) => (<button onClick={onClick} className={`${color} rounded-[36px] p-6 text-white text-left shadow-xl transform active:scale-95 flex flex-col justify-between h-44`}><div className="bg-white/20 p-3 rounded-2xl self-start">{icon}</div><div><h3 className="text-5xl font-black">{count}</h3><p className="text-[10px] font-black uppercase">{label}</p></div></button>);

const GeneralEntryModal = ({ onClose, onAdd, currentUser }: any) => {
  const [customer, setCustomer] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [locality, setLocality] = useState('');
  const [observations, setObservations] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[56px] p-10 space-y-6">
        <h2 className="font-black text-2xl uppercase">Nueva Carga</h2>
        <div className="space-y-3">
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none" placeholder="N° CLIENTE" value={customerNumber} onChange={e => setCustomerNumber(e.target.value)} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none uppercase" placeholder="NOMBRE CLIENTE" value={customer} onChange={e => setCustomer(e.target.value)} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none uppercase" placeholder="LOCALIDAD" value={locality} onChange={e => setLocality(e.target.value)} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none uppercase" placeholder="OBSERVACIONES" value={observations} onChange={e => setObservations(e.target.value)} />
        </div>
        <button onClick={() => { onAdd(customer, locality, '', 'Manual', '', '', currentUser?.name, customerNumber, observations); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase tracking-widest text-sm">REGISTRAR <Send size={20} /></button>
      </div>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: any) => {
  const [u, setU] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-6"><div className="bg-white w-full max-sm rounded-[56px] p-8 space-y-6 text-center"><h2 className="text-5xl font-black text-orange-500 uppercase">D&G</h2><input type="text" className="w-full bg-slate-50 p-4 rounded-[28px] text-center uppercase outline-none font-bold" placeholder="USUARIO" value={u} onChange={e => setU(e.target.value)} /><button onClick={() => onLogin({ name: u, role: 'admin' })} className="w-full bg-slate-900 text-white font-black py-5 rounded-[28px] uppercase">INGRESAR</button><button onClick={onClientPortal} className="w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-[24px] uppercase text-[10px]">Portal Clientes</button></div></div>
  );
};

const CustomerPortal = ({ onBack, orders }: any) => {
  const [search, setSearch] = useState('');
  const filtered = orders.filter((o: any) => o.customerName.toLowerCase().includes(search.toLowerCase()) || o.orderNumber.includes(search));
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 p-10 flex flex-col justify-center text-center"><h2 className="text-3xl font-black text-white mb-6 uppercase">D&G <span className="text-orange-500">CLIENTES</span></h2><div className="bg-white rounded-[56px] p-8 space-y-6 text-left min-h-[400px] flex flex-col"><input className="w-full bg-slate-50 p-4 rounded-3xl outline-none text-sm font-bold uppercase" placeholder="NRO PEDIDO O NOMBRE..." value={search} onChange={e => setSearch(e.target.value)} /><div className="flex-1 overflow-y-auto space-y-3">{filtered.map((o: any) => (<div key={o.id} className="p-4 bg-slate-50 rounded-2xl"><p className="text-[10px] font-black text-orange-500">#{o.orderNumber}</p><p className="font-black text-sm">{o.customerName}</p><p className="text-[9px] uppercase text-slate-400">{o.status}</p></div>))}</div><button onClick={onBack} className="w-full text-slate-400 text-[10px] font-black uppercase mt-4">VOLVER</button></div></div>
  );
};

const INITIAL_ORDERS: Order[] = [{ id: '1', orderNumber: '001-DG', customerNumber: '101', customerName: 'DISTRIBUIDORA GARCÍA', locality: 'FIRMAT', status: OrderStatus.PENDING, items: [], packaging: { bolsas: 0, bultos: 0, cajas: 0 }, createdAt: new Date().toISOString(), source: 'Manual' }];

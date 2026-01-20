import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, MapPin, 
  Plus, Check, LogOut, MessageCircle, 
  Activity, Layers, Package, Lock, AlertTriangle, RefreshCcw,
  Database, ServerCrash, Copy, Terminal, Info, ShieldAlert, Wifi, WifiOff, Settings, ExternalLink, HelpCircle, AlertCircle, Sparkles, Send, UserCircle2
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry } from './types';
import { supabase, connectionStatus } from './supabaseClient';
import { analyzeOrderText } from './geminiService';

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [dbError, setDbError] = useState<{message: string, code?: string} | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('dg_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    if (!connectionStatus.isConfigured) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const mappedData = (data || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerNumber: o.customer_number,
        customerName: o.customer_name,
        locality: o.locality,
        status: o.status as OrderStatus,
        notes: o.notes,
        reviewer: o.reviewer,
        source: o.source,
        carrier: o.carrier,
        detailedPackaging: o.detailed_packaging || [],
        createdAt: o.created_at
      }));

      setOrders(mappedData);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setDbError({ message: error.message, code: error.code });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
      const channels = supabase.channel('orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe();
      return () => { supabase.removeChannel(channels); };
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('dg_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('dg_user');
    }
  }, [currentUser]);

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
    
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      (o.customerName?.toLowerCase() || '').includes(lowSearch) || 
      (o.customerNumber || '').includes(lowSearch) ||
      (o.locality?.toLowerCase() || '').includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    const { error } = await supabase.from('orders').update({
      status: updatedOrder.status,
      notes: updatedOrder.notes,
      carrier: updatedOrder.carrier,
      detailed_packaging: updatedOrder.detailedPackaging,
      customer_number: updatedOrder.customerNumber,
      order_number: updatedOrder.orderNumber
    }).eq('id', updatedOrder.id);
    
    if (error) alert("Error: " + error.message);
    setSelectedOrder(updatedOrder);
    fetchOrders();
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleAddOrder = async (newOrderData: Partial<Order>) => {
    setDbError(null);
    setIsSaving(true);
    try {
      const payload = {
        order_number: newOrderData.orderNumber,
        customer_number: String(newOrderData.customerNumber),
        customer_name: newOrderData.customerName,
        locality: newOrderData.locality || 'GENERAL',
        status: OrderStatus.PENDING,
        notes: newOrderData.notes || '',
        reviewer: currentUser?.name || 'Sistema',
        source: newOrderData.source || 'Manual'
      };

      const { error } = await supabase.from('orders').insert([payload]);
      if (error) throw error;

      setIsNewOrderModalOpen(false);
      setView('PENDING');
      await fetchOrders();
      alert("✅ PEDIDO GUARDADO EXITOSAMENTE");
    } catch (err: any) {
      setDbError({ message: err.message, code: err.code });
      alert(`❌ ERROR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsApp = (order: Order) => {
    const msg = `📦 *D&G Logística - Informe de Pedido*%0A%0AHola *${order.customerName}*, tu pedido *#${order.orderNumber}* se encuentra en estado: *${order.status}*.%0A%0ALocalidad: ${order.locality}%0A${order.carrier ? `Transporte: ${order.carrier}` : ''}%0A%0AGracias por elegirnos.`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const sendGeneralSupportWhatsApp = () => {
    const msg = `Hola, necesito ayuda con una consulta de pedido en D&G Logística.`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} orders={orders} onWhatsApp={sendWhatsApp} onSupportWhatsApp={sendGeneralSupportWhatsApp} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientAccess={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans relative overflow-x-hidden">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-slate-900 text-white">
              <h1 className="text-2xl font-black italic mb-6">D&G <span className="text-orange-500">Logística</span></h1>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold">{currentUser.name[0]}</div>
                <p className="font-bold text-sm">{currentUser.name}</p>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="En Despacho" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<PlusSquare size={20}/>} label="CARGA DE ENVÍO" onClick={() => { setIsNewOrderModalOpen(true); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Activity size={20}/>} label="Seguimiento" active={view === 'TRACKING'} onClick={() => { setView('TRACKING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
            </nav>
            <div className="p-4 border-t mt-auto">
               <SidebarItem icon={<LogOut size={20}/>} label="Salir" onClick={() => setCurrentUser(null)} danger />
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl"><Menu size={20} /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">D&G <span className="text-orange-500">Logistics</span></h1>
          <div className="flex items-center gap-1 mt-1">
            <span className="flex items-center gap-1 text-[7px] font-black text-emerald-400 uppercase tracking-widest animate-pulse"><Wifi size={8}/> ONLINE</span>
          </div>
        </div>
        <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">{currentUser.name[0]}</div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando...</p>
          </div>
        )}

        {!isLoading && view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="En Despacho" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Histórico" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            
            <button 
              onClick={() => setIsNewOrderModalOpen(true)}
              className="w-full bg-slate-900 text-white p-7 rounded-[40px] flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 bg-white/10 text-orange-500 rounded-2xl flex items-center justify-center">
                <PlusSquare size={28} />
              </div>
              <div className="text-left">
                <h4 className="font-black uppercase tracking-tighter text-base">CARGA DE ENVÍO</h4>
                <p className="text-[11px] font-bold opacity-60 italic">Ingresar nuevo pedido manual o IA</p>
              </div>
              <ChevronRight className="ml-auto opacity-50" />
            </button>
          </div>
        )}

        {!isLoading && (view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><ArrowLeft size={14}/> Dashboard</button>
              <h2 className="font-black text-xs text-slate-500 uppercase tracking-widest">{view === 'ALL' ? 'Historial' : view}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Filtrar por nombre o ciudad..." 
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 text-sm font-bold outline-none focus:border-teal-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} allOrders={orders} />
              )) : (
                <div className="text-center py-20 opacity-20 flex flex-col items-center">
                   <Package size={64} className="mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest italic">Sin pedidos en esta sección</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'TRACKING' && <TrackingInternalView orders={orders} onBack={() => setView('DASHBOARD')} onSelectOrder={setSelectedOrder} />}
      </main>

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[600] flex items-center justify-center p-5">
          <div className="bg-white w-full max-w-md rounded-[48px] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"><X/></button>
            <NewOrderForm 
              onAdd={handleAddOrder} 
              onBack={() => setIsNewOrderModalOpen(false)} 
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
          onWhatsApp={() => sendWhatsApp(selectedOrder)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <NavBtn icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <NavBtn icon={<Activity />} active={view === 'TRACKING'} onClick={() => setView('TRACKING')} />
        <NavBtn icon={<ClipboardList />} active={view === 'PENDING'} onClick={() => setView('PENDING')} />
        <NavBtn icon={<Truck />} active={view === 'DISPATCHED'} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

function Timeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const stages = [
    { id: OrderStatus.PENDING, label: 'INGRESADO' },
    { id: OrderStatus.COMPLETED, label: 'PREPARADO' },
    { id: OrderStatus.DISPATCHED, label: 'DESPACHADO' },
    { id: OrderStatus.ARCHIVED, label: 'HISTÓRICO' }
  ];

  const currentIndex = stages.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex flex-col gap-0 relative ml-2 py-4">
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={stage.id} className="flex gap-4 items-start relative pb-6 last:pb-0">
            {/* Connector Line */}
            {index < stages.length - 1 && (
              <div className={`absolute left-[11px] top-6 w-[2px] h-[calc(100%-12px)] ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
            
            {/* Dot */}
            <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
              isCompleted ? 'bg-emerald-500 shadow-lg shadow-emerald-200' :
              isCurrent ? 'bg-white border-4 border-teal-500 ring-4 ring-teal-500/20' :
              'bg-slate-100 border-2 border-slate-200'
            }`}>
              {isCompleted ? <Check size={12} className="text-white" /> : 
               isCurrent ? <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" /> : null}
            </div>

            {/* Label */}
            <div className={`pt-0.5 flex flex-col ${isCurrent ? 'scale-105 origin-left transition-transform' : ''}`}>
              <span className={`text-[11px] font-black tracking-widest ${
                isCompleted ? 'text-emerald-600 opacity-60' :
                isCurrent ? 'text-slate-900' :
                'text-slate-300'
              }`}>{stage.label}</span>
              {isCurrent && <span className="text-[8px] font-bold text-teal-500 uppercase tracking-widest mt-0.5">Etapa Actual</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewOrderForm({ onAdd, onBack, isSaving }: any) {
  const [form, setForm] = useState({ orderNumber: '', nro: '', name: '', locality: '', notes: '' });
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);
  
  const processAi = async () => {
    if(!aiText) return;
    setIsAiLoading(true);
    const result = await analyzeOrderText(aiText);
    if(result) {
      setForm({
        ...form,
        name: result.customerName?.toUpperCase() || '',
        locality: result.locality?.toUpperCase() || ''
      });
      setUseAi(false);
    } else {
      alert("No se pudo analizar el texto. Intente manual.");
    }
    setIsAiLoading(false);
  };

  const submit = () => {
    if(!form.orderNumber || !form.name) return alert("Falta Nº Orden o Razón Social");
    onAdd({
      orderNumber: form.orderNumber.toUpperCase(),
      customerNumber: form.nro,
      customerName: form.name.toUpperCase(),
      locality: form.locality.toUpperCase() || 'GENERAL',
      notes: form.notes, 
      source: aiText ? 'IA' : 'Manual'
    });
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="text-center">
        <h2 className="font-black text-2xl uppercase italic tracking-tighter text-slate-800 leading-none">Carga de Envío</h2>
        <div className="flex justify-center gap-4 mt-4">
          <button onClick={() => setUseAi(false)} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${!useAi ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-300'}`}>Manual</button>
          <button onClick={() => setUseAi(true)} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all flex items-center gap-1 ${useAi ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-300'}`}><Sparkles size={10}/> Con IA</button>
        </div>
      </div>

      {useAi ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Pegar mensaje de WhatsApp</label>
            <textarea 
              className="w-full bg-slate-50 p-4 rounded-3xl text-xs font-bold border-2 border-transparent focus:border-teal-500 outline-none h-40 shadow-inner" 
              placeholder="Hola, el pedido para Bazar Firmat..." 
              value={aiText}
              onChange={e => setAiText(e.target.value)}
            />
          </div>
          <button 
            disabled={isAiLoading || !aiText}
            onClick={processAi}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="animate-spin" size={14}/> : <><Sparkles size={14}/> ANALIZAR TEXTO</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          <Input label="N° DE ORDEN" value={form.orderNumber} onChange={(v:string)=>setForm({...form, orderNumber: v})} placeholder="Ej: 5542" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nº de Cliente" value={form.nro} onChange={(v:string)=>setForm({...form, nro: v})} placeholder="1450" />
            <Input label="Localidad" value={form.locality} onChange={(v:string)=>setForm({...form, locality: v})} placeholder="FIRMAT" />
          </div>
          <Input label="Razón Social" value={form.name} onChange={(v:string)=>setForm({...form, name: v})} placeholder="Nombre del Comercio" />
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Observaciones</label>
            <textarea className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-teal-500 outline-none h-24 shadow-inner" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Instrucciones adicionales..." />
          </div>
        </div>
      )}

      <button 
        disabled={isSaving || (useAi && isAiLoading)}
        onClick={submit} 
        className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'CONFIRMAR INGRESO'}
      </button>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate, onDelete, onWhatsApp }: any) {
  // Local States for Hierarchical Selection and Extra Order Numbers
  const [carrierCategory, setCarrierCategory] = useState('');
  const [carrierDetail, setCarrierDetail] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [customerNumber, setCustomerNumber] = useState(order.customerNumber || '');
  const [orderNumbers, setOrderNumbers] = useState(order.orderNumber || '');
  const [packaging, setPackaging] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [newPackage, setNewPackage] = useState({ 
    type: 'Caja', 
    quantity: 1, 
    deposit: 'D1',
    customType: '',
    customDeposit: ''
  });

  // Load existing carrier if possible
  useEffect(() => {
    if (order.carrier) {
      if (order.carrier.includes('Viajante:')) {
        setCarrierCategory('Viajantes');
        setCarrierDetail(order.carrier.replace('Viajante: ', ''));
      } else if (order.carrier.includes('Vendedor:')) {
        setCarrierCategory('Vendedores');
        setCarrierDetail(order.carrier.replace('Vendedor: ', ''));
      } else {
        const cats = ['Transporte', 'Comisionista', 'Retiro Personal', 'Expreso'];
        const found = cats.find(c => order.carrier.startsWith(`${c}:`));
        if (found) {
          setCarrierCategory(found);
          setCustomCarrier(order.carrier.replace(`${found}: `, ''));
        }
      }
    }
  }, [order.carrier]);

  const addPackage = () => {
    const finalType = newPackage.type === 'Otro' ? newPackage.customType : newPackage.type;
    const finalDeposit = newPackage.deposit === 'Otro' ? newPackage.customDeposit : newPackage.deposit;
    if (!finalType || !finalDeposit) return alert("Completa los datos del bulto");

    const entry = { 
      id: Date.now().toString(), 
      type: finalType, 
      quantity: newPackage.quantity, 
      deposit: finalDeposit 
    };
    setPackaging([...packaging, entry]);
    setNewPackage({ ...newPackage, customType: '', customDeposit: '' });
  };

  const removePackage = (id: string) => {
    setPackaging(packaging.filter(p => p.id !== id));
  };

  const saveDetails = () => {
    let finalCarrier = '';
    if (carrierCategory === 'Viajantes' || carrierCategory === 'Vendedores') {
      finalCarrier = `${carrierCategory === 'Viajantes' ? 'Viajante' : 'Vendedor'}: ${carrierDetail}`;
    } else if (carrierCategory) {
      finalCarrier = `${carrierCategory}: ${customCarrier}`;
    }

    onUpdate({ 
      ...order, 
      detailedPackaging: packaging, 
      carrier: finalCarrier,
      customerNumber,
      orderNumber: orderNumbers
    });
  };

  const addOrderNumber = () => {
    const next = prompt("Ingrese nuevo número de orden:");
    if (next) {
      setOrderNumbers(orderNumbers ? `${orderNumbers}, ${next}` : next);
    }
  };

  const totalBultos = packaging.reduce((acc, p) => acc + (p.quantity || 0), 0);

  const advanceStage = () => {
    saveDetails();
    const stages = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
    const nextIdx = stages.indexOf(order.status) + 1;
    if (nextIdx < stages.length) {
      onUpdate({ ...order, status: stages[nextIdx] });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] p-8 shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[92vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X/></button>
        
        {/* Header con Etiquetas a la Izquierda */}
        <div className="mb-6 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${order.source === 'IA' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{order.source}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-teal-600 uppercase tracking-tighter">ORDEN {orderNumbers}</span>
              <button onClick={addOrderNumber} className="p-1 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"><Plus size={10}/></button>
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 leading-[0.9] italic pr-8 mt-2 uppercase">{order.customerName}</h2>
          
          <div className="mt-2 flex items-center gap-2">
            <UserCircle2 size={14} className="text-slate-400" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">CLIENTE</span>
              <input 
                type="text" 
                className="bg-slate-50 px-2 py-0.5 rounded text-[11px] font-black text-slate-900 outline-none border-b-2 border-transparent focus:border-teal-500 transition-all w-24"
                value={customerNumber}
                onChange={e => setCustomerNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">
             <MapPin size={10} className="text-orange-500" /> {order.locality}
          </div>
        </div>

        {/* Gestión de Bultos */}
        <div className="space-y-4 mb-8">
           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Gestión de Bultos por Depósito</h4>
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total:</span>
                  <span className="text-xs font-black text-teal-600">{totalBultos}</span>
                </div>
              </div>

              <div className="space-y-3">
                {packaging.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left duration-200">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-slate-400">{p.quantity}</div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 uppercase">{p.type}</span>
                          <span className="text-[8px] font-black text-teal-500 uppercase tracking-widest">{p.deposit}</span>
                        </div>
                     </div>
                     <button onClick={() => removePackage(p.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
                
                {/* Selector de nuevo bulto */}
                <div className="bg-white/50 p-4 rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Depósito</label>
                      <select 
                        className="w-full bg-white border border-slate-100 rounded-xl p-2 text-[10px] font-black uppercase outline-none shadow-sm"
                        value={newPackage.deposit}
                        onChange={e => setNewPackage({...newPackage, deposit: e.target.value})}
                      >
                        <option value="D1">D1</option>
                        <option value="F">F</option>
                        <option value="E">E</option>
                        <option value="Otro">Otro...</option>
                      </select>
                      {newPackage.deposit === 'Otro' && (
                        <input className="w-full bg-white border mt-1 rounded-xl p-2 text-[10px] font-bold outline-none uppercase" placeholder="Especifique..." value={newPackage.customDeposit} onChange={e=>setNewPackage({...newPackage, customDeposit: e.target.value})}/>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Bulto</label>
                      <select 
                        className="w-full bg-white border border-slate-100 rounded-xl p-2 text-[10px] font-black uppercase outline-none shadow-sm"
                        value={newPackage.type}
                        onChange={e => setNewPackage({...newPackage, type: e.target.value})}
                      >
                        <option value="Caja">Caja</option>
                        <option value="Pack">Pack</option>
                        <option value="Unidad">Unidad</option>
                        <option value="Bolsa">Bolsa</option>
                        <option value="Otro">Otro...</option>
                      </select>
                      {newPackage.type === 'Otro' && (
                        <input className="w-full bg-white border mt-1 rounded-xl p-2 text-[10px] font-bold outline-none uppercase" placeholder="Especifique..." value={newPackage.customType} onChange={e=>setNewPackage({...newPackage, customType: e.target.value})}/>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" className="w-16 bg-white border border-slate-100 rounded-xl p-2 text-xs font-black outline-none shadow-sm" value={newPackage.quantity} onChange={e=>setNewPackage({...newPackage, quantity: parseInt(e.target.value)})}/>
                    <button onClick={addPackage} className="flex-1 bg-teal-500 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-200 active:scale-95 transition-all"><Plus size={16}/> AGREGAR</button>
                  </div>
                </div>
              </div>
           </div>

           {/* Sistema de Despacho Inteligente */}
           <div className="p-6 bg-indigo-50/40 rounded-[32px] border border-indigo-100/50 space-y-4">
              <h4 className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Sistema de Despacho</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-indigo-300 uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    className="w-full bg-white border border-indigo-100 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-indigo-500 shadow-sm"
                    value={carrierCategory}
                    onChange={e => { setCarrierCategory(e.target.value); setCarrierDetail(''); setCustomCarrier(''); }}
                  >
                    <option value="">Seleccione Categoría...</option>
                    <option value="Viajantes">Viajantes</option>
                    <option value="Vendedores">Vendedores</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Comisionista">Comisionista</option>
                    <option value="Retiro Personal">Retiro Personal</option>
                    <option value="Expreso">Expreso</option>
                  </select>
                </div>

                {/* Sub-selectors */}
                {carrierCategory === 'Viajantes' && (
                  <div className="space-y-1 animate-in zoom-in duration-200">
                    <label className="text-[7px] font-black text-indigo-300 uppercase tracking-widest ml-1">Viajante Específico</label>
                    <select className="w-full bg-white border border-indigo-100 rounded-2xl p-4 text-xs font-black uppercase outline-none shadow-sm" value={carrierDetail} onChange={e=>setCarrierDetail(e.target.value)}>
                      <option value="">Seleccione...</option>
                      <option value="Matías">Matías</option>
                      <option value="Nicolás">Nicolás</option>
                    </select>
                  </div>
                )}

                {carrierCategory === 'Vendedores' && (
                  <div className="space-y-1 animate-in zoom-in duration-200">
                    <label className="text-[7px] font-black text-indigo-300 uppercase tracking-widest ml-1">Vendedor Específico</label>
                    <select className="w-full bg-white border border-indigo-100 rounded-2xl p-4 text-xs font-black uppercase outline-none shadow-sm" value={carrierDetail} onChange={e=>setCarrierDetail(e.target.value)}>
                      <option value="">Seleccione...</option>
                      <option value="Mauro">Mauro</option>
                      <option value="Gustavo">Gustavo</option>
                    </select>
                  </div>
                )}

                {['Transporte', 'Comisionista', 'Retiro Personal', 'Expreso'].includes(carrierCategory) && (
                  <div className="space-y-1 animate-in zoom-in duration-200">
                    <label className="text-[7px] font-black text-indigo-300 uppercase tracking-widest ml-1">Detalle de {carrierCategory}</label>
                    <input 
                      className="w-full bg-white border border-indigo-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 shadow-sm uppercase" 
                      placeholder="Nombre / Empresa / Detalle" 
                      value={customCarrier}
                      onChange={e => setCustomCarrier(e.target.value)}
                    />
                  </div>
                )}
              </div>
           </div>

          {/* Observaciones Logísticas */}
          <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observaciones Logísticas</span>
             <p className="text-xs font-bold text-slate-800 mt-2 leading-relaxed italic">{order.notes || "Sin instrucciones específicas de despacho"}</p>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <button 
            onClick={advanceStage} 
            className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Avanzar Etapa <ChevronRight size={18}/>
          </button>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => { if(confirm("¿Eliminar pedido?")) { onDelete(order.id); onClose(); } }} className="py-4 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase border border-red-100 active:bg-red-100 transition-all">Eliminar</button>
            <button onClick={saveDetails} className="py-4 bg-teal-50 text-teal-600 rounded-2xl text-[9px] font-black uppercase border border-teal-100 transition-all">Guardar Cambios</button>
            <button onClick={onClose} className="py-4 bg-slate-100 text-slate-400 rounded-2xl text-[9px] font-black uppercase active:bg-slate-200 transition-all col-span-2">Cerrar</button>
          </div>

          <button onClick={onWhatsApp} className="w-full bg-emerald-500 text-white py-4 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 border border-emerald-400">
            <MessageCircle size={18}/> Notificar vía WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-teal-50 text-teal-600' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-6 rounded-[35px] text-white flex flex-col justify-between h-44 text-left shadow-xl active:scale-95 transition-all overflow-hidden relative group`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">{React.cloneElement(icon as React.ReactElement, { size: 100 } as any)}</div>
      <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}</div>
      <div>
        <h3 className="text-4xl font-black mb-1">{count}</h3>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
    </button>
  );
}

function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all relative ${active ? 'text-teal-600 bg-teal-50' : 'text-slate-300 hover:text-slate-400'}`}>
      {React.cloneElement(icon, { size: 24 } as any)}
      {active && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 rounded-full"></span>}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all shadow-inner uppercase" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function OrderCard({ order, onClick, allOrders }: any) {
  const isGrouped = allOrders?.filter((o:any) => o.customerNumber === order.customerNumber && o.status !== OrderStatus.ARCHIVED).length > 1;
  const bultos = order.detailedPackaging?.reduce((acc: number, p: any) => acc + p.quantity, 0) || 0;

  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-[40px] border-2 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all ${isGrouped ? 'border-teal-500/20 shadow-teal-100/30' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1 tracking-widest">#ORDEN {order.orderNumber}</span>
          <span className="text-[10px] font-black text-teal-600 tracking-tighter uppercase">{order.locality}</span>
        </div>
        <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' :
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
          order.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
        }`}>{order.status}</span>
      </div>
      
      <h3 className="font-black text-slate-800 text-lg mb-3 leading-[0.85] italic">{order.customerName}</h3>
      
      <div className="flex items-center justify-between border-t pt-4 mt-2">
         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <Package size={12} className="text-slate-300" /> {bultos > 0 ? `${bultos} bultos` : 'Sin bultos'}
         </div>
         {order.carrier && (
           <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase">
              <Truck size={10}/> {order.carrier}
           </div>
         )}
      </div>
    </div>
  );
}

function TrackingInternalView({ orders, onBack, onSelectOrder }: any) {
  const [q, setQ] = useState('');
  const results = orders.filter((o:any) => 
    (o.customerName?.toLowerCase() || '').includes(q.toLowerCase()) || 
    (o.orderNumber || '').includes(q) ||
    (o.locality?.toLowerCase() || '').includes(q.toLowerCase())
  );
  return (
    <div className="space-y-4 animate-in slide-in-from-right duration-400">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><ArrowLeft size={14}/> Volver al Dashboard</button>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          className="w-full bg-white border-2 border-slate-100 p-5 pl-14 rounded-[30px] text-sm font-bold outline-none focus:border-teal-500 transition-all shadow-md" 
          placeholder="Buscar comercio, ciudad o Nº..." 
          value={q} 
          onChange={e=>setQ(e.target.value)} 
        />
      </div>
      <div className="space-y-3">
        {results.length > 0 ? results.map((o:any) => (
          <OrderCard key={o.id} order={o} onClick={() => onSelectOrder(o)} allOrders={orders} />
        )) : (
          <p className="text-center py-20 text-slate-400 text-[10px] font-black uppercase tracking-widest italic opacity-30">Sin resultados para esta búsqueda</p>
        )}
      </div>
    </div>
  );
}

function CustomerPortal({ onBack, orders, onWhatsApp, onSupportWhatsApp }: any) {
  const [s, setS] = useState('');
  const [code, setCode] = useState('');

  const r = useMemo(() => {
    if (!s && !code) return [];
    return orders?.filter((o: any) => {
      const matchName = s ? o.customerName?.toLowerCase().includes(s.toLowerCase()) : true;
      const matchCode = code ? (o.customerNumber?.includes(code) || o.orderNumber?.includes(code.toUpperCase())) : true;
      return matchName && matchCode && o.status !== OrderStatus.ARCHIVED;
    }) || [];
  }, [s, code, orders]);
  
  return (
    <div className="p-6 space-y-6 max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pb-32">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 active:scale-90 transition-all"><ArrowLeft/></button>
        <h2 className="text-2xl font-black italic tracking-tighter">Consulta de Pedidos</h2>
      </header>
      
      <div className="bg-white p-8 rounded-[48px] border-2 border-slate-100 space-y-6 shadow-xl shadow-slate-200/50">
        <div className="w-14 h-14 bg-teal-500/10 text-teal-600 rounded-2xl flex items-center justify-center mb-2">
           <Search size={28} />
        </div>
        <h3 className="font-black text-2xl italic leading-[0.85]">Seguimiento de Envío</h3>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Ingresa los datos para localizar tu envío en tiempo real.</p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2 italic">Buscar por Nombre o Comercio</label>
            <input 
              className="w-full bg-slate-50 p-5 rounded-[24px] border-2 border-transparent focus:border-teal-500 outline-none font-black text-sm uppercase tracking-tighter shadow-inner transition-all" 
              placeholder="Ej: Bazar Firmat..." 
              value={s} 
              onChange={e=>setS(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2 italic">Buscar por N° Pedido o Cliente</label>
            <input 
              className="w-full bg-slate-50 p-5 rounded-[24px] border-2 border-transparent focus:border-teal-500 outline-none font-black text-sm uppercase tracking-tighter shadow-inner transition-all" 
              placeholder="Ej: 5542 o 1450" 
              value={code} 
              onChange={e=>setCode(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-12 flex-1 pt-4">
        {(s.length > 2 || code.length > 0) ? (
          r.length > 0 ? r.map((o:any) => (
            <div key={o.id} className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="bg-white p-10 rounded-[56px] shadow-2xl border-2 border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Package size={80} /></div>
                
                <div className="mb-6 border-b pb-6">
                  <h4 className="font-black text-4xl mb-2 text-slate-800 uppercase italic tracking-tighter leading-[0.8]">{o.customerName}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-3">
                     ORDEN #{o.orderNumber} • {o.locality}
                  </div>
                </div>

                <div className="mb-8">
                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 border-l-4 border-orange-500 pl-3">Cronograma del Proceso</h5>
                  <Timeline currentStatus={o.status} />
                </div>
                
                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[32px] border border-slate-100">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-teal-500 shadow-sm">
                      <Truck size={24} />
                   </div>
                   <p className="text-[11px] font-bold text-slate-500 italic uppercase leading-tight">Serás notificado por el transporte al salir del depósito.</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 opacity-30">
               <Search size={48} className="mx-auto mb-4 text-slate-300" />
               <p className="text-xs font-black uppercase tracking-widest italic leading-relaxed text-slate-400">No encontramos registros activos <br/> con esos datos.</p>
            </div>
          )
        ) : (s.length > 0 || code.length > 0) && (
          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse italic mt-8">Buscando información...</p>
        )}
      </div>

      {/* Botón de Soporte General al Final de la Modal (Reemplaza Centro de Ayuda) */}
      <div className="pt-16 pb-20 flex flex-col items-center gap-8 border-t border-slate-100 mt-12">
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">¿Necesitas asistencia directa?</p>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Atención personalizada de Lunes a Sábado</p>
          </div>
          <button 
            onClick={onSupportWhatsApp}
            className="w-full max-w-[340px] bg-slate-900 text-white py-6 rounded-[40px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-300 flex items-center justify-center gap-4 active:scale-95 transition-all border-b-4 border-slate-700"
          >
            <MessageCircle size={22} className="text-emerald-400"/> SOPORTE OPERATIVO
          </button>
          <div className="flex flex-col items-center gap-1 opacity-20 mt-4">
            <h1 className="text-3xl font-black italic tracking-tighter">D&G</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.6em]">Logistics Intelligence</p>
          </div>
      </div>
    </div>
  );
}

function LoginModal({ onLogin, onClientAccess }: any) {
  const [n, setN] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[56px] p-12 text-center space-y-10 animate-in zoom-in duration-500 shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-teal-500 to-indigo-500"></div>
        <div className="space-y-2">
          <h1 className="text-7xl font-black italic tracking-tighter leading-none">D<span className="text-orange-500">&</span>G</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Warehouse System</p>
        </div>
        
        <div className="space-y-5">
          <input className="w-full bg-slate-50 p-6 rounded-3xl text-center font-black outline-none border-2 border-transparent focus:border-teal-500 transition-all shadow-inner uppercase text-base tracking-tighter" placeholder="OPERADOR" value={n} onChange={e=>setN(e.target.value)} />
          <button onClick={()=>onLogin({name:n||'OPERADOR'})} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase shadow-2xl tracking-widest text-sm active:scale-95 transition-all">INGRESAR AL SISTEMA</button>
        </div>
        
        <div className="flex flex-col gap-4 pt-8 border-t border-slate-100">
           <button onClick={onClientAccess} className="text-[11px] font-black text-teal-600 uppercase w-full tracking-widest hover:underline flex items-center justify-center gap-2"><Search size={16}/> SEGUIMIENTO CLIENTES</button>
           <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nube Operativa</span>
           </div>
        </div>
      </div>
      <p className="mt-10 text-[9px] font-black text-white/20 uppercase tracking-[0.6em] italic">FIRMAT, SANTA FE • VERSION 3.3</p>
    </div>
  );
}

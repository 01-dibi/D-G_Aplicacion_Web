import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, MapPin, 
  Plus, Check, LogOut, MessageCircle, 
  Activity, Layers, Package, Lock, AlertTriangle, RefreshCcw,
  Database, ServerCrash, Copy, Terminal, Info, ShieldAlert, Wifi, WifiOff, Settings, ExternalLink, HelpCircle, AlertCircle, Sparkles, Send, UserCircle2, UserPlus2, ShieldCheck, Users2, FileText, Camera, Upload
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry } from './types.ts';
import { supabase, connectionStatus } from './supabaseClient.ts';
import { analyzeOrderText, analyzeOrderMedia } from './geminiService.ts';

export default function App() {
  const [isLandingMode, setIsLandingMode] = useState(true);
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
      
      if (selectedOrder) {
        const updated = mappedData.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setDbError({ message: error.message, code: error.code });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setIsLandingMode(false);
      fetchOrders();

      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      (o.locality?.toLowerCase() || '').includes(lowSearch) ||
      (o.orderNumber || '').includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: updatedOrder.status,
        notes: updatedOrder.notes,
        carrier: updatedOrder.carrier?.toUpperCase(),
        detailed_packaging: updatedOrder.detailedPackaging,
        customer_number: updatedOrder.customerNumber,
        order_number: updatedOrder.orderNumber,
        reviewer: updatedOrder.reviewer
      }).eq('id', updatedOrder.id);
      
      if (error) throw error;
      await fetchOrders();
    } catch (err: any) {
      console.error("Update failed:", err);
      alert(`❌ ERROR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCollaborator = async (order: Order) => {
    const newName = prompt("Ingrese el nombre del colaborador a añadir:");
    if (newName && newName.trim()) {
      const updatedReviewer = order.reviewer 
        ? `${order.reviewer} + ${newName.trim().toUpperCase()}` 
        : newName.trim().toUpperCase();
      
      await handleUpdateOrder({ ...order, reviewer: updatedReviewer });
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("¿Deseas eliminar este pedido definitivamente?")) return;
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
        reviewer: currentUser?.name?.toUpperCase() || 'SISTEMA',
        source: newOrderData.source || 'Manual'
      };

      const { error } = await supabase.from('orders').insert([payload]);
      if (error) throw error;

      setIsNewOrderModalOpen(false);
      setView('PENDING');
      await fetchOrders();
    } catch (err: any) {
      setDbError({ message: err.message, code: err.code });
      alert(`❌ ERROR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsApp = (order: Order, customPackaging?: PackagingEntry[], customCarrier?: string) => {
    const bultos = customPackaging || order.detailedPackaging || [];
    const totalBultos = bultos.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const carrier = customCarrier || order.carrier || 'A DESIGNAR';
    
    const statusMap = {
      [OrderStatus.PENDING]: 'PENDIENTE',
      [OrderStatus.COMPLETED]: 'EN PREPARACIÓN',
      [OrderStatus.DISPATCHED]: 'EN DESPACHO',
      [OrderStatus.ARCHIVED]: 'ENTREGADO'
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true });

    const bultosText = bultos.length > 0 
      ? bultos.map(p => `* ${p.quantity} ${p.type.toUpperCase()} (${p.deposit.replace('Dep. ', '').replace(':', '').trim()})`).join('%0A')
      : '* Sin bultos registrados';

    const msg = `📦 *D&G LOGISTICA*%0A📍 ${order.locality}, #${order.orderNumber} | *${order.customerName}*%0A--------------------------%0A${bultosText}%0ATotal: ${totalBultos} bultos%0A--------------------------%0A👤 ${order.reviewer || 'SISTEMA'} | ✍️ ${currentUser?.name}%0A🚚 ${carrier}%0A--------------------------%0AESTADO: ${statusMap[order.status]}%0A--------------------------%0A${dateStr} - ${timeStr}`;
    
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const sendGeneralSupportWhatsApp = () => {
    const phone = "543465404527";
    const msg = encodeURIComponent(`Hola, necesito ayuda con una consulta de pedido en D&G Logística.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  if (isLandingMode) {
    return (
      <LandingScreen 
        onSelectStaff={() => { setIsLandingMode(false); setIsCustomerMode(false); }} 
        onSelectCustomer={() => { setIsLandingMode(false); setIsCustomerMode(true); }} 
      />
    );
  }

  if (isCustomerMode) {
    return (
      <CustomerPortal 
        onBack={() => setIsLandingMode(true)} 
        orders={orders} 
        onWhatsApp={sendWhatsApp} 
        onSupportWhatsApp={sendGeneralSupportWhatsApp} 
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginModal 
        onLogin={u => setCurrentUser(u)} 
        onBack={() => setIsLandingMode(true)} 
      />
    );
  }

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
            <span className="flex items-center gap-1 text-[7px] font-black text-emerald-400 uppercase tracking-widest animate-pulse"><Wifi size={8}/> LIVE CLOUD</span>
          </div>
        </div>
        <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">{currentUser.name[0]}</div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading && !isSaving && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando con equipo...</p>
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
                placeholder="Buscar por cliente, ciudad o N°..." 
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 text-sm font-bold outline-none focus:border-teal-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={() => setSelectedOrder(order)} 
                  allOrders={orders} 
                />
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
          allOrders={orders}
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
          onWhatsApp={(data: any) => sendWhatsApp(selectedOrder, data.packaging, data.carrier)}
          onAddCollaborator={() => handleAddCollaborator(selectedOrder)}
          isSaving={isSaving}
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

function LandingScreen({ onSelectStaff, onSelectCustomer }: any) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[2000]">
      <div className="w-full max-w-md space-y-12 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-block p-6 bg-white/5 rounded-[48px] backdrop-blur-sm border border-white/10 shadow-2xl">
            <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white">D<span className="text-orange-500">&</span>G</h1>
          </div>
          <div className="space-y-1">
            <p className="text-[12px] font-black text-orange-500 uppercase tracking-[0.4em] italic">Logistics Intelligence</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.6em]">Warehousing Solutions</p>
          </div>
        </div>

        <div className="space-y-6">
          <button 
            onClick={onSelectStaff}
            className="group w-full bg-slate-900 border-2 border-indigo-500/30 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl active:scale-[0.97] transition-all hover:bg-slate-800"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={32} />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-black uppercase tracking-tighter text-xl leading-none mb-1">ACCESO PERSONAL</h4>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest italic">Área Operativa Restringida</p>
            </div>
            <ChevronRight className="opacity-30 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={onSelectCustomer}
            className="group w-full bg-emerald-600 border-2 border-emerald-400/30 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl active:scale-[0.97] transition-all hover:bg-emerald-700"
          >
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search size={32} />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-black uppercase tracking-tighter text-xl leading-none mb-1">CONSULTA CLIENTES</h4>
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest italic">Seguimiento de Envíos</p>
            </div>
            <ChevronRight className="opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="pt-12 text-center opacity-20">
           <div className="flex items-center justify-center gap-3">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-white uppercase tracking-[0.8em]">Secure System v3.5</span>
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
           </div>
        </div>
      </div>
    </div>
  );
}

function NewOrderForm({ onAdd, onBack, isSaving }: any) {
  const [form, setForm] = useState({ orderNumber: '', nro: '', name: '', locality: '', notes: '' });
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [aiTab, setAiTab] = useState<'text' | 'visual'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("No se pudo analizar el texto.");
    }
    setIsAiLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type;
      const result = await analyzeOrderMedia(base64, mimeType);
      
      if (result) {
        setForm({
          ...form,
          name: result.customerName?.toUpperCase() || '',
          locality: result.locality?.toUpperCase() || ''
        });
        setUseAi(false);
      } else {
        alert("No se pudo analizar el archivo.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el archivo.");
    } finally {
      setIsAiLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
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
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setAiTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${aiTab === 'text' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
            >
              <MessageCircle size={14}/> Texto
            </button>
            <button 
              onClick={() => setAiTab('visual')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${aiTab === 'visual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
            >
              <Camera size={14}/> Visual
            </button>
          </div>

          {aiTab === 'text' ? (
            <div className="space-y-4">
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
            <div className="space-y-4">
              <div 
                onClick={() => !isAiLoading && fileInputRef.current?.click()}
                className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all group"
              >
                {isAiLoading ? (
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={24}/>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Cargar Foto o PDF</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1">REMITOS, LISTAS O CAPTURAS</p>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
              </div>
              <p className="text-[8px] text-center text-slate-400 font-bold italic uppercase px-4 leading-relaxed">
                La IA analizará el documento para extraer la Razón Social y la Localidad automáticamente.
              </p>
            </div>
          )}
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

function OrderDetailsModal({ order, allOrders, onClose, onUpdate, onDelete, onWhatsApp, onAddCollaborator, isSaving }: any) {
  const [carrierCategory, setCarrierCategory] = useState('');
  const [carrierSubDetail, setCarrierSubDetail] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [customerNumber, setCustomerNumber] = useState(order.customerNumber || '');
  const [orderNumbers, setOrderNumbers] = useState(order.orderNumber || '');
  const [packaging, setPackaging] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [newPackage, setNewPackage] = useState({ 
    type: 'Caja', 
    quantity: 1, 
    deposit: 'Dep. D1:', 
    customType: '',
    customDeposit: ''
  });

  const isArchived = order.status === OrderStatus.ARCHIVED;
  const viaNames = ["MATÍAS", "NICOLÁS"];
  const vendNames = ["MAURO", "GUSTAVO"];

  useEffect(() => {
    if (order.carrier) {
      const carrierStr = String(order.carrier).toUpperCase();
      if (carrierStr.startsWith('VIAJANTE:')) {
        setCarrierCategory('Viajantes');
        setCarrierSubDetail(carrierStr.replace('VIAJANTE: ', ''));
      } else if (carrierStr.startsWith('VENDEDOR:')) {
        setCarrierCategory('Vendedores');
        setCarrierSubDetail(carrierStr.replace('VENDEDOR: ', ''));
      } else if (carrierStr.startsWith('TRANSPORTE:')) {
        setCarrierCategory('Transporte');
        setCustomCarrier(carrierStr.replace('TRANSPORTE: ', ''));
      } else if (carrierStr.startsWith('RETIRO PERSONAL:')) {
        setCarrierCategory('Retiro Personal');
        setCustomCarrier(carrierStr.replace('RETIRO PERSONAL: ', ''));
      } else {
        setCarrierCategory('');
        setCustomCarrier(carrierStr);
      }
    }
  }, [order.carrier]);

  const otherOrdersSameCustomer = useMemo(() => {
    return (allOrders || []).filter((o: any) => 
      o.customerNumber === customerNumber && 
      o.id !== order.id && 
      !orderNumbers.includes(o.orderNumber)
    );
  }, [allOrders, customerNumber, order.id, orderNumbers]);

  const addPackage = () => {
    if (isArchived) return;
    const finalType = newPackage.type === 'Otro' ? newPackage.customType : newPackage.type;
    const finalDeposit = newPackage.deposit === 'Otros:' ? newPackage.customDeposit : newPackage.deposit;
    if (!finalType || !finalDeposit) return alert("Completa los datos del bulto");

    const entry = { 
      id: Date.now().toString(), 
      type: finalType.toUpperCase(), 
      quantity: newPackage.quantity, 
      deposit: finalDeposit.toUpperCase() 
    };
    setPackaging([...packaging, entry]);
    setNewPackage({ ...newPackage, customType: '', customDeposit: '' });
  };

  const removePackage = (id: string) => {
    if (isArchived) return;
    setPackaging(packaging.filter(p => p.id !== id));
  };

  const getFinalCarrier = () => {
    let finalCarrier = '';
    if (carrierCategory === 'Viajantes') {
      finalCarrier = `VIAJANTE: ${carrierSubDetail.toUpperCase()}`;
    } else if (carrierCategory === 'Vendedores') {
      finalCarrier = `VENDEDOR: ${carrierSubDetail.toUpperCase()}`;
    } else if (carrierCategory === 'Transporte') {
      finalCarrier = `TRANSPORTE: ${customCarrier.toUpperCase()}`;
    } else if (carrierCategory === 'Retiro Personal') {
      finalCarrier = `RETIRO PERSONAL: ${customCarrier.toUpperCase()}`;
    } else {
      finalCarrier = customCarrier.toUpperCase();
    }
    return finalCarrier;
  };

  const saveDetails = async () => {
    if (isArchived) return;
    await onUpdate({ 
      ...order, 
      detailedPackaging: packaging, 
      carrier: getFinalCarrier(),
      customerNumber,
      orderNumber: orderNumbers
    });
  };

  const handleNotifyWhatsApp = () => {
    onWhatsApp({
      packaging: packaging,
      carrier: getFinalCarrier()
    });
  };

  const selectOtherOrder = (num: string) => {
    if (isArchived) return;
    setOrderNumbers(prev => prev ? `${prev}, ${num}` : num);
    setShowOrderPicker(false);
  };

  const manualAddOrderNumber = () => {
    if (isArchived) return;
    const next = prompt("Ingrese nuevo número de orden:");
    if (next) {
      setOrderNumbers(prev => prev ? `${prev}, ${next.toUpperCase()}` : next.toUpperCase());
    }
    setShowOrderPicker(false);
  };

  const totalBultos = packaging.reduce((acc, p) => acc + (p.quantity || 0), 0);

  const advanceStage = async () => {
    if (isArchived) return;
    const stages = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
    const nextIdx = stages.indexOf(order.status) + 1;
    
    if (nextIdx < stages.length) {
      await onUpdate({ 
        ...order, 
        detailedPackaging: packaging, 
        carrier: getFinalCarrier(),
        customerNumber,
        orderNumber: orderNumbers,
        status: stages[nextIdx]
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] p-8 shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[92vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors z-10"><X/></button>
        
        <div className="mb-6 flex flex-col w-full">
          <div className="-mt-2 mb-2 flex items-center gap-2">
            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.2em] ${order.source === 'IA' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {order.source === 'IA' ? 'INTELIGENCIA ARTIFICIAL' : 'MANUAL'}
            </span>
            {isArchived && (
              <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.2em] bg-slate-900 text-white">HISTORIAL - SOLO LECTURA</span>
            )}
          </div>

          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1 relative">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-100">
                  ORDEN {orderNumbers}
                </span>
                {!isArchived && (
                  <button onClick={() => setShowOrderPicker(!showOrderPicker)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all active:scale-95">
                    <Plus size={10} strokeWidth={3}/>
                  </button>
                )}
              </div>
              {showOrderPicker && !isArchived && (
                <div className="absolute left-0 top-full mt-2 bg-white border-2 border-emerald-100 p-3 rounded-2xl shadow-xl z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h5 className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos Relacionados</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                    {otherOrdersSameCustomer.length > 0 ? otherOrdersSameCustomer.map((o: any) => (
                      <button key={o.id} onClick={() => selectOtherOrder(o.orderNumber)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 rounded-xl flex justify-between items-center">
                        #{o.orderNumber} <span className="text-[8px] opacity-40">{o.status}</span>
                      </button>
                    )) : (
                      <p className="text-[8px] italic text-slate-300 p-2 text-center">Sin otros pedidos para este cliente</p>
                    )}
                  </div>
                  <button onClick={manualAddOrderNumber} className="w-full mt-2 py-2 text-[8px] font-black text-emerald-600 uppercase border-t border-slate-50 hover:bg-slate-50">+ Ingreso Manual</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-2xl shadow-lg border border-indigo-400 max-w-[50%]">
              <UserCircle2 size={12} className="shrink-0 opacity-80" />
              <span className="text-[9px] font-black uppercase tracking-tighter truncate">{order.reviewer || 'SIN ASIGNAR'}</span>
              {!isArchived && (
                <button onClick={(e) => { e.stopPropagation(); onAddCollaborator(); }} className="shrink-0 ml-1 w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-all active:scale-95">
                  <Plus size={10} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-800 leading-[0.9] italic mt-4 uppercase break-words">{order.customerName}</h2>
          
          <div className="mt-3 flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 w-full shadow-inner">
            <UserCircle2 size={20} className="text-slate-400" />
            <div className="flex flex-col flex-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">N° CLIENTE</span>
              <input type="text" className={`bg-transparent text-lg font-black text-slate-900 outline-none w-full ${isArchived ? 'opacity-60 cursor-not-allowed' : ''}`} value={customerNumber} onChange={e => setCustomerNumber(e.target.value)} disabled={isArchived} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase mt-3"><MapPin size={10} className="text-orange-500" /> {order.locality}</div>
        </div>

        <div className="space-y-4 mb-8">
           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
              <div className="flex justify-between items-center mb-5">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Gestión de Bultos</h4>
                <div className="bg-emerald-500 px-3 py-1 rounded-full"><span className="text-xs font-black text-white">{totalBultos} bultos</span></div>
              </div>
              <div className="space-y-2">
                {packaging.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                     <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 uppercase">{p.quantity} x {p.type}</span>
                        <span className="text-[8px] font-black text-emerald-600 uppercase">DEPÓSITO {p.deposit}</span>
                     </div>
                     {!isArchived && <button onClick={() => removePackage(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}
                  </div>
                ))}
                {!isArchived && (
                  <div className="bg-white/70 p-4 rounded-[28px] border-2 border-dashed border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select className="w-full bg-white border border-slate-100 rounded-xl p-2 text-[10px] font-black uppercase" value={newPackage.deposit} onChange={e=>setNewPackage({...newPackage, deposit: e.target.value})}>
                        <option value="Dep. E">Dep. E</option><option value="Dep. F:">Dep. F:</option><option value="Dep. D1:">Dep. D1:</option>
                        <option value="Dep. D2:">Dep. D2:</option><option value="Dep. A1:">Dep. A1:</option><option value="Otros:">Otros:</option>
                      </select>
                      <select className="w-full bg-white border border-slate-100 rounded-xl p-2 text-[10px] font-black uppercase" value={newPackage.type} onChange={e=>setNewPackage({...newPackage, type: e.target.value})}>
                        <option value="Caja">Caja</option><option value="Pack">Pack</option><option value="Bolsa">Bolsa</option><option value="Otro">Otro...</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" className="w-16 bg-white border border-slate-100 rounded-xl p-2 text-xs font-black" value={newPackage.quantity} onChange={e=>setNewPackage({...newPackage, quantity: parseInt(e.target.value)})}/>
                      <button onClick={addPackage} className="flex-1 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase"><Plus size={14} className="inline"/> AÑADIR</button>
                    </div>
                  </div>
                )}
              </div>
           </div>

           <div className="p-6 bg-indigo-50/40 rounded-[32px] border border-indigo-100/50 space-y-4">
              <h4 className="text-[10px] font-black text-indigo-900 uppercase">Sistema de Despacho</h4>
              <div className="space-y-3">
                <select 
                  className={`w-full bg-white border-2 border-indigo-100 rounded-2xl p-4 text-xs font-black uppercase outline-none ${isArchived ? 'opacity-60 cursor-not-allowed' : ''}`} 
                  value={carrierCategory} 
                  onChange={e => {
                    setCarrierCategory(e.target.value);
                    setCarrierSubDetail('');
                    setCustomCarrier('');
                  }} 
                  disabled={isArchived}
                >
                  <option value="">Seleccione Categoría...</option>
                  <option value="Viajantes">Viajantes</option>
                  <option value="Vendedores">Vendedores</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Retiro Personal">Retiro Personal</option>
                </select>

                {carrierCategory === 'Viajantes' && (
                  <select 
                    className={`w-full bg-white border-2 border-indigo-200 rounded-2xl p-4 text-xs font-bold uppercase outline-none animate-in slide-in-from-top-2 duration-200 ${isArchived ? 'opacity-60 cursor-not-allowed' : ''}`}
                    value={carrierSubDetail}
                    onChange={e => setCarrierSubDetail(e.target.value)}
                    disabled={isArchived}
                  >
                    <option value="">Seleccione Viajante...</option>
                    {viaNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}

                {carrierCategory === 'Vendedores' && (
                  <select 
                    className={`w-full bg-white border-2 border-indigo-200 rounded-2xl p-4 text-xs font-bold uppercase outline-none animate-in slide-in-from-top-2 duration-200 ${isArchived ? 'opacity-60 cursor-not-allowed' : ''}`}
                    value={carrierSubDetail}
                    onChange={e => setCarrierSubDetail(e.target.value)}
                    disabled={isArchived}
                  >
                    <option value="">Seleccione Vendedor...</option>
                    {vendNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}

                {(carrierCategory === 'Transporte' || carrierCategory === 'Retiro Personal') && (
                  <input 
                    className={`w-full bg-white border-2 border-indigo-200 rounded-2xl p-4 text-xs font-bold uppercase outline-none animate-in slide-in-from-top-2 duration-200 ${isArchived ? 'opacity-60 cursor-not-allowed' : ''}`} 
                    placeholder={carrierCategory === 'Transporte' ? "Nombre del Transporte..." : "Persona que retira..."}
                    value={customCarrier} 
                    onChange={e => setCustomCarrier(e.target.value)} 
                    disabled={isArchived}
                  />
                )}
              </div>
           </div>

           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instrucciones Logísticas</span>
             <p className="text-xs font-bold text-slate-800 mt-2 leading-relaxed italic">{order.notes || "Sin instrucciones"}</p>
           </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-50">
          {!isArchived && (
            <>
              <button disabled={isSaving} onClick={advanceStage} className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black uppercase text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isSaving ? <Loader2 className="animate-spin"/> : 'Avanzar de Etapa'} <ChevronRight size={18}/>
              </button>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => onDelete(order.id)} className="py-4 bg-red-50 text-red-500 rounded-[20px] text-[10px] font-black uppercase active:bg-red-100 transition-all">Eliminar</button>
                <button onClick={saveDetails} className="py-4 bg-teal-50 text-teal-600 rounded-[20px] text-[10px] font-black uppercase active:bg-teal-100 transition-all">Guardar</button>
              </div>
            </>
          )}
          <button onClick={handleNotifyWhatsApp} className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black uppercase text-[11px] mt-6 flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border-b-4 border-emerald-600">
            <MessageCircle size={20}/> Notificar WhatsApp
          </button>
          {isArchived && <button onClick={onClose} className="w-full py-4 bg-slate-100 text-slate-400 rounded-[20px] text-[9px] font-black uppercase mt-3 tracking-widest active:bg-slate-200 transition-all">Cerrar Visualización</button>}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-teal-50 text-teal-600' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-6 rounded-[35px] text-white flex flex-col justify-between h-44 text-left shadow-xl active:scale-95 transition-all overflow-hidden relative`}>
      <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(icon as React.ReactElement, { size: 100 } as any)}</div>
      <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">{React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}</div>
      <div><h3 className="text-4xl font-black mb-1">{count}</h3><p className="text-[10px] font-black uppercase opacity-80">{label}</p></div>
    </button>
  );
}

function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all relative ${active ? 'text-teal-600 bg-teal-50' : 'text-slate-300'}`}>
      {React.cloneElement(icon, { size: 24 } as any)}
      {active && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 rounded-full"></span>}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{label}</label>
      <input className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-teal-500 uppercase shadow-inner" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function OrderCard({ order, onClick, allOrders }: any) {
  const bultos = order.detailedPackaging?.reduce((acc: number, p: any) => acc + p.quantity, 0) || 0;
  const hasReviewer = !!order.reviewer && order.reviewer !== 'SISTEMA' && order.reviewer !== 'SIN ASIGNAR';

  return (
    <div onClick={onClick} className="bg-white p-6 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all">
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
         <div className={`px-2 py-0.5 rounded-lg shadow-sm border ${hasReviewer ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
           <span className="text-[7px] font-black uppercase truncate max-w-[80px] block">
             {hasReviewer ? order.reviewer : 'DISPONIBLE'}
           </span>
         </div>
         {hasReviewer && (
           <div className="flex items-center gap-1 text-[6px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
             <Users2 size={6} /> En armado
           </div>
         )}
      </div>
      <div className="flex justify-between items-start mb-4 pr-16">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1 tracking-widest">#ORDEN {order.orderNumber}</span>
          <span className="text-[10px] font-black text-teal-600 tracking-tighter uppercase">{order.locality}</span>
        </div>
        <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' :
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
          order.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
        }`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-lg mb-3 leading-[0.85] italic">{order.customerName}</h3>
      <div className="flex items-center justify-between border-t pt-4 mt-2">
         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <Package size={12}/> {bultos > 0 ? `${bultos} bultos` : '0 bultos'}
         </div>
         {order.carrier && <div className="text-[8px] font-black text-indigo-500 uppercase"><Truck size={10} className="inline mr-1"/> {order.carrier}</div>}
      </div>
    </div>
  );
}

function TrackingInternalView({ orders, onBack, onSelectOrder }: any) {
  const [q, setQ] = useState('');
  const results = orders.filter((o:any) => 
    (o.customerName?.toLowerCase() || '').includes(q.toLowerCase()) || 
    (o.orderNumber || '').includes(q)
  );
  return (
    <div className="space-y-4 animate-in slide-in-from-right">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><ArrowLeft size={14}/> Volver</button>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input className="w-full bg-white border-2 border-slate-100 p-5 pl-14 rounded-[30px] text-sm font-bold outline-none" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="space-y-3">
        {results.map((o:any) => <OrderCard key={o.id} order={o} onClick={() => onSelectOrder(o)} allOrders={orders} />)}
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
      <header className="flex items-center gap-4"><button onClick={onBack} className="p-4 bg-white border rounded-2xl shadow-sm text-slate-400 active:scale-95 transition-all"><ArrowLeft/></button>
      <h2 className="text-2xl font-black italic">Consulta Pedidos</h2></header>
      <div className="bg-white p-8 rounded-[48px] border-2 border-slate-100 space-y-6 shadow-xl">
        <h3 className="font-black text-2xl italic leading-[0.85]">Seguimiento Envío</h3>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 p-5 rounded-[24px] border-2 border-transparent focus:border-teal-500 outline-none font-black text-sm uppercase shadow-inner" placeholder="Nombre de Comercio..." value={s} onChange={e=>setS(e.target.value)} />
          <input className="w-full bg-slate-50 p-5 rounded-[24px] border-2 border-transparent focus:border-teal-500 outline-none font-black text-sm uppercase shadow-inner" placeholder="N° Orden o Pedido..." value={code} onChange={e=>setCode(e.target.value)} />
        </div>
      </div>
      <div className="space-y-12 flex-1 pt-4">
        {r.map((o:any) => (
          <div key={o.id} className="bg-white p-10 rounded-[56px] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">
            <h4 className="font-black text-4xl mb-2 text-slate-800 uppercase italic tracking-tighter leading-[0.8]">{o.customerName}</h4>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-3">ORDEN #{o.orderNumber} • {o.locality}</div>
            <div className="mt-8"><Timeline currentStatus={o.status} /></div>
          </div>
        ))}
      </div>
      <div className="pt-16 flex flex-col items-center gap-8 border-t border-slate-100 mt-12">
          <button onClick={onSupportWhatsApp} className="w-full bg-slate-900 text-white py-6 rounded-[40px] font-black uppercase text-xs shadow-2xl flex items-center justify-center gap-4 active:scale-95 border-b-4 border-slate-700">
            <MessageCircle size={22} className="text-emerald-400"/> CONSULTA WHATSAPP
          </button>
      </div>
    </div>
  );
}

function Timeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const stages = [
    { status: OrderStatus.PENDING, label: 'Pendiente', icon: <ClipboardList size={14} /> },
    { status: OrderStatus.COMPLETED, label: 'Preparado', icon: <CheckCircle2 size={14} /> },
    { status: OrderStatus.DISPATCHED, label: 'Despachado', icon: <Truck size={14} /> },
    { status: OrderStatus.ARCHIVED, label: 'Finalizado', icon: <Package size={14} /> },
  ];
  const currentIndex = stages.findIndex(s => s.status === currentStatus);
  return (
    <div className="relative flex justify-between items-start pt-2">
      <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-slate-100 -z-10 mx-4"></div>
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <div key={stage.status} className="flex flex-col items-center gap-2 flex-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 ${isCurrent ? 'bg-orange-500 text-white border-orange-100 scale-110 shadow-lg' : isCompleted ? 'bg-emerald-500 text-white border-emerald-50' : 'bg-white text-slate-300 border-slate-50'}`}>
              {isCompleted && !isCurrent ? <Check size={16} /> : stage.icon}
            </div>
            <span className={`text-[8px] font-black uppercase text-center ${isCurrent ? 'text-orange-600' : isCompleted ? 'text-emerald-600' : 'text-slate-300'}`}>{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LoginModal({ onLogin, onBack }: any) {
  const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[56px] p-12 text-center space-y-10 animate-in zoom-in shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <button onClick={onBack} className="absolute top-8 left-8 p-2 text-slate-300 hover:text-slate-900 transition-colors active:scale-95"><ArrowLeft size={20}/></button>
        <div className="space-y-2 pt-4">
          <h1 className="text-7xl font-black italic tracking-tighter leading-none">D<span className="text-orange-500">&</span>G</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">OPERATIVO</p>
        </div>
        <div className="space-y-5">
          <input className="w-full bg-slate-50 p-6 rounded-3xl text-center font-black outline-none border-2 border-transparent focus:border-teal-500 shadow-inner uppercase text-base" placeholder="ID OPERADOR" value={n} onChange={e=>setN(e.target.value)} />
          <button onClick={()=>onLogin({name:n||'OPERADOR'})} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase shadow-2xl tracking-widest text-sm active:scale-95">ACCEDER AL SISTEMA</button>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-30">
          <ShieldCheck size={12}/>
          <span className="text-[8px] font-black uppercase tracking-widest">Conexión Segura</span>
        </div>
      </div>
      <p className="mt-10 text-[9px] font-black text-white/20 uppercase tracking-[0.6em] italic">FIRMAT, SANTA FE • VERSION 3.5</p>
    </div>
  );
}
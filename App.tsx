
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, MapPin, 
  Plus, Check, LogOut, MessageCircle, 
  Activity, Layers, Package, Lock, AlertTriangle, RefreshCcw,
  Database, ServerCrash, Copy, Terminal, Info, ShieldAlert, Wifi, WifiOff, Settings, ExternalLink, HelpCircle, AlertCircle, Sparkles, Send, UserCircle2, UserPlus2, ShieldCheck, Users2, FileText, Camera, Upload, Map as MapIcon, PenTool, Navigation, Edit3, Save, RotateCcw, Stepper, UserCheck, Eraser
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry, DeliveryData } from './types.ts';
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
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  const [carriers, setCarriers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dg_carriers');
      return saved ? JSON.parse(saved) : ["PROPIO", "JUAN CAMIÓN", "LOGÍSTICA FIRMAT"];
    } catch (e) {
      return ["PROPIO"];
    }
  });

  const saveCarriers = (newCarriers: string[]) => {
    setCarriers(newCarriers);
    localStorage.setItem('dg_carriers', JSON.stringify(newCarriers));
  };

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
    setDbStatus('checking');
    if (!connectionStatus.isConfigured) {
      setIsLoading(false);
      setDbStatus('offline');
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
        createdAt: o.created_at,
        deliveryData: o.delivery_data
      }));

      setOrders(mappedData);
      setDbStatus('online');
      
      if (selectedOrder) {
        const updated = mappedData.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setDbStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setIsLandingMode(false);
      fetchOrders();
      const channel = supabase.channel('schema-db-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders()).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setIsLoading(false);
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
        customer_name: updatedOrder.customerName,
        locality: updatedOrder.locality,
        reviewer: updatedOrder.reviewer,
        delivery_data: updatedOrder.deliveryData
      }).eq('id', updatedOrder.id);
      
      if (error) throw error;
      await fetchOrders();
      return true;
    } catch (err: any) {
      alert(`❌ ERROR DE ACTUALIZACIÓN: ${err.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("⚠️ ¿Deseas eliminar este pedido de forma permanente? No se puede deshacer.")) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (error) {
        console.error("Delete individual error:", error);
        throw new Error(error.message + ". Verifica los permisos DELETE en Supabase.");
      }
      
      alert("✅ Pedido eliminado correctamente.");
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err: any) {
      alert("❌ ERROR AL ELIMINAR: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeOrders = async () => {
    const confirmText = `⚠️ ATENCIÓN: Se eliminarán:
- ${stats.dispatched} pedidos EN DESPACHO
- ${stats.total} pedidos del HISTORIAL

¿Confirmas la limpieza total?`;

    if (!confirm(confirmText)) return;
    if (!confirm("🚨 SEGUNDA CONFIRMACIÓN: Esta acción borrará permanentemente los datos en la base de datos de Supabase. ¿Deseas continuar?")) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('status', [OrderStatus.DISPATCHED, OrderStatus.ARCHIVED]);
      
      if (error) {
        console.error("Purge Error:", error);
        throw new Error(error.message + ". Asegúrate de que la política RLS permite DELETE para el rol anon.");
      }
      
      alert(`✅ Limpieza completada con éxito. El sistema se ha reiniciado.`);
      setView('DASHBOARD');
      await fetchOrders();
    } catch (err: any) {
      alert("❌ ERROR CRÍTICO AL PURGAR: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeliveryComplete = async (orderId: string, deliveryData: DeliveryData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: OrderStatus.ARCHIVED,
        delivery_data: deliveryData
      }).eq('id', orderId);
      if (error) throw error;
      setDeliveryOrder(null);
      await fetchOrders();
      setView('ALL');
    } catch (err: any) {
      alert("Error al finalizar entrega: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLandingMode) return <LandingScreen onSelectStaff={() => { setIsLandingMode(false); setIsCustomerMode(false); }} onSelectCustomer={() => { setIsLandingMode(false); setIsCustomerMode(true); }} />;
  if (isCustomerMode) return <CustomerPortal onBack={() => setIsLandingMode(true)} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onBack={() => setIsLandingMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans relative overflow-x-hidden">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-slate-900 text-white">
              <h1 className="text-2xl font-black italic mb-6">D&G <span className="text-orange-500">Logística</span></h1>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold uppercase">{currentUser.name[0]}</div>
                <div className="flex flex-col">
                   <p className="font-bold text-sm leading-none">{currentUser.name}</p>
                   <p className="text-[8px] uppercase tracking-widest text-orange-400 mt-1">Admin Access</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<MapIcon size={20}/>} label="Mapa de Entregas" active={view === 'MAP'} onClick={() => { setView('MAP'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="En Despacho" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<Users2 size={20}/>} label="Gestionar Choferes" active={view === 'CARRIERS'} onClick={() => { setView('CARRIERS'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Eraser size={20}/>} label="Limpieza Sistema" active={view === 'MAINTENANCE'} onClick={() => { setView('MAINTENANCE'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<PlusSquare size={20}/>} label="NUEVA CARGA" onClick={() => { setIsNewOrderModalOpen(true); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
            </nav>
            <div className="p-4 border-t mt-auto flex flex-col gap-2">
               <button onClick={fetchOrders} className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest">
                 <RefreshCcw size={16} className={dbStatus === 'checking' ? 'animate-spin' : ''}/> Forzar Sincronización
               </button>
               <SidebarItem icon={<LogOut size={20}/>} label="Cerrar Sesión" onClick={() => setCurrentUser(null)} danger />
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl"><Menu size={20} /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">D&G <span className="text-orange-500">Logistics</span></h1>
          <div className="flex items-center gap-1 mt-1 text-[7px] font-black uppercase tracking-widest">
            {dbStatus === 'online' ? (
              <span className="text-emerald-400 flex items-center gap-1"><Wifi size={8}/> LIVE CLOUD 2.1</span>
            ) : dbStatus === 'checking' ? (
              <span className="text-orange-400 animate-pulse">Sincronizando...</span>
            ) : (
              <span className="text-red-400 flex items-center gap-1"><WifiOff size={8}/> OFFLINE MODE</span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-teal-500/20 uppercase transition-all active:scale-90" onClick={fetchOrders}>{currentUser.name[0]}</div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading && <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4"><Loader2 className="animate-spin" size={32} /><p className="text-[10px] font-black uppercase tracking-[0.2em]">Cargando Logística...</p></div>}

        {!isLoading && view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="En Ruta" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Histórico" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            
            <button onClick={() => setView('MAP')} className="w-full bg-indigo-50 border-2 border-indigo-100 text-indigo-900 p-6 rounded-[35px] flex items-center gap-4 shadow-sm active:scale-95 transition-all group">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform"><MapIcon size={24}/></div>
              <div className="text-left">
                <h4 className="font-black uppercase tracking-tighter text-sm">Visualizar en Mapa</h4>
                <p className="text-[10px] font-bold opacity-60">Navegación GPS Real</p>
              </div>
            </button>
          </div>
        )}

        {!isLoading && view === 'MAP' && <MapView orders={orders} onBack={() => setView('DASHBOARD')} onSelectOrder={setSelectedOrder} />}
        {!isLoading && view === 'CARRIERS' && <CarrierManager carriers={carriers} onUpdate={saveCarriers} onBack={() => setView('DASHBOARD')} />}
        {!isLoading && view === 'MAINTENANCE' && (
          <MaintenancePanel 
            onPurge={handlePurgeOrders} 
            isSaving={isSaving} 
            stats={stats} 
            onBack={() => setView('DASHBOARD')} 
          />
        )}

        {!isLoading && (view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors"><ArrowLeft size={14}/> Dashboard</button>
              <h2 className="font-black text-xs text-slate-500 uppercase tracking-widest">{view === 'ALL' ? 'Historial' : view}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Buscar pedidos..." className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 text-sm font-bold outline-none focus:border-teal-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
              )) : <div className="text-center py-20 opacity-20 flex flex-col items-center"><Package size={64} /><p className="text-xs font-black uppercase tracking-widest mt-4">Sin resultados</p></div>}
            </div>
          </div>
        )}
      </main>

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[600] flex items-center justify-center p-5">
          <div className="bg-white w-full max-md rounded-[48px] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><X/></button>
            <NewOrderForm onAdd={(d:any) => { handleUpdateOrder(d as Order); setIsNewOrderModalOpen(false); }} isSaving={isSaving} />
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
          onDeliver={() => { setDeliveryOrder(selectedOrder); setSelectedOrder(null); }}
          isSaving={isSaving}
          availableCarriers={carriers}
        />
      )}

      {deliveryOrder && (
        <DeliveryWorkflowModal 
          order={deliveryOrder} 
          onClose={() => setDeliveryOrder(null)} 
          onComplete={handleDeliveryComplete} 
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <NavBtn icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <NavBtn icon={<MapIcon />} active={view === 'MAP'} onClick={() => setView('MAP')} />
        <NavBtn icon={<ClipboardList />} active={view === 'PENDING'} onClick={() => setView('PENDING')} />
        <NavBtn icon={<Truck />} active={view === 'DISPATCHED'} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function SidebarItem({ icon, label, active, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-indigo-50 text-indigo-600' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-6 rounded-[35px] text-white flex flex-col justify-between h-44 text-left shadow-xl active:scale-95 transition-all overflow-hidden relative group`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-125 transition-transform duration-500">{React.cloneElement(icon as React.ReactElement, { size: 100 } as any)}</div>
      <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}</div>
      <div><h3 className="text-4xl font-black mb-1 leading-none">{count}</h3><p className="text-[9px] font-black uppercase opacity-70 tracking-widest">{label}</p></div>
    </button>
  );
}

function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all relative ${active ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-300 hover:text-slate-500'}`}>
      {React.cloneElement(icon, { size: 24 } as any)}
      {active && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>}
    </button>
  );
}

function OrderCard({ order, onClick }: any) {
  const bultos = order.detailedPackaging?.reduce((acc: number, p: any) => acc + p.quantity, 0) || 0;
  return (
    <div onClick={onClick} className="bg-white p-6 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden cursor-pointer active:scale-95 hover:border-indigo-100 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-300 uppercase mb-1 tracking-widest">ORDEN #{order.orderNumber}</span>
          <span className="text-[10px] font-black text-indigo-600 tracking-tighter uppercase flex items-center gap-1"><MapPin size={10}/> {order.locality}</span>
        </div>
        <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase shadow-sm ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' :
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
          order.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
        }`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-lg mb-3 leading-[0.85] italic uppercase tracking-tighter truncate">{order.customerName}</h3>
      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Package size={12}/> {bultos} bultos</div>
         {order.deliveryData?.deliveredAt ? (
           <span className="text-[7px] font-black text-emerald-500 uppercase flex items-center gap-1 animate-in fade-in"><ShieldCheck size={8}/> Entregado</span>
         ) : order.carrier ? (
           <span className="text-[7px] font-black text-indigo-400 uppercase flex items-center gap-1"><Truck size={8}/> {order.carrier}</span>
         ) : null}
      </div>
    </div>
  );
}

function MaintenancePanel({ onPurge, isSaving, stats, onBack }: any) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl shadow-sm"><ArrowLeft/></button>
        <h2 className="text-xl font-black italic uppercase">Limpieza Profunda</h2>
      </header>

      <div className="bg-white p-8 rounded-[48px] shadow-xl border-t-8 border-red-500 space-y-6">
        <div className="flex items-center gap-4 text-red-600">
          <AlertTriangle size={32}/>
          <h3 className="font-black uppercase text-sm leading-tight">Mantenimiento de Datos</h3>
        </div>
        
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
          Esta acción eliminará todos los registros que ya han salido o se han entregado para liberar la lista de hoy.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
             <span className="text-[8px] font-black text-slate-400 uppercase">A Borrar (Ruta)</span>
             <p className="text-2xl font-black text-indigo-600 leading-none mt-1">{stats.dispatched}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
             <span className="text-[8px] font-black text-slate-400 uppercase">A Borrar (Historial)</span>
             <p className="text-2xl font-black text-slate-700 leading-none mt-1">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={onPurge}
          disabled={isSaving}
          className="w-full bg-slate-900 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
            {isSaving ? <Loader2 className="animate-spin" size={28}/> : <Trash2 size={28}/>}
          </div>
          <div className="text-left">
            <h4 className="font-black uppercase text-lg leading-none mb-1">Borrado Masivo</h4>
            <p className="text-[8px] opacity-70 uppercase tracking-widest font-black">Limpiar base de datos</p>
          </div>
        </button>

        <div className="p-6 bg-orange-50 rounded-[35px] border border-orange-100 flex items-start gap-3">
           <Info size={16} className="text-orange-600 shrink-0 mt-1"/>
           <p className="text-[9px] font-bold text-orange-900/60 uppercase leading-relaxed">
             <strong>IMPORTANTE:</strong> Los pedidos en estado "PENDIENTE" y "PREPARADO" NO serán eliminados. Seguirán visibles para el equipo de depósito.
           </p>
        </div>
      </div>
    </div>
  );
}

function MapView({ orders, onBack, onSelectOrder }: any) {
  const pendingOrders = orders.filter((o:any) => o.status !== OrderStatus.ARCHIVED);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const startNavigation = (order: any) => {
    const address = encodeURIComponent(`${order.customerName}, ${order.locality}, Argentina`);
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank');
  };
  
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft size={20}/></button>
        <h2 className="text-xl font-black italic">Mapa de Ruta</h2>
      </div>
      
      <div className="w-full h-80 bg-slate-200 rounded-[40px] relative overflow-hidden border-4 border-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000')] opacity-30 bg-cover bg-center grayscale contrast-125"></div>
        
        {pendingOrders.slice(0, 6).map((o:any, i:number) => (
          <div 
            key={o.id}
            onClick={() => setActiveOrder(o)}
            className="absolute cursor-pointer animate-bounce transition-transform hover:scale-125 z-10"
            style={{ top: `${15 + i*12}%`, left: `${25 + (i%3)*20}%` }}
          >
            <div className="relative">
              <MapPin className={`${o.status === OrderStatus.PENDING ? 'text-orange-500' : 'text-indigo-600'} drop-shadow-lg`} size={36} fill="currentColor" fillOpacity={0.2} />
              {activeOrder?.id === o.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 min-w-[140px] animate-in zoom-in">
                   <p className="text-[9px] font-black uppercase text-slate-800 leading-none truncate">{o.customerName}</p>
                   <button onClick={() => startNavigation(o)} className="w-full bg-indigo-600 text-white text-[7px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1 mt-2">Navegar</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarrierManager({ carriers, onUpdate, onBack }: any) {
  const [newCarrier, setNewCarrier] = useState('');

  const addCarrier = () => {
    if (newCarrier.trim()) {
      onUpdate([...carriers, newCarrier.trim().toUpperCase()]);
      setNewCarrier('');
    }
  };

  const removeCarrier = (idx: number) => {
    onUpdate(carriers.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl shadow-sm"><ArrowLeft/></button>
        <h2 className="text-xl font-black italic uppercase">Gestión de Choferes</h2>
      </header>
      <div className="bg-white p-8 rounded-[48px] shadow-xl space-y-4">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">Nombres de transportistas para asignación.</p>
        <div className="flex gap-2">
           <input className="flex-1 bg-slate-50 p-5 rounded-3xl outline-none font-black text-sm uppercase border-2 border-transparent focus:border-indigo-500 transition-all" placeholder="Chofer..." value={newCarrier} onChange={e=>setNewCarrier(e.target.value)} onKeyDown={e=>e.key === 'Enter' && addCarrier()} />
           <button onClick={addCarrier} className="p-5 bg-indigo-600 text-white rounded-3xl shadow-lg active:scale-95 transition-all"><Plus/></button>
        </div>
      </div>
      <div className="space-y-2">
         {carriers.map((c: string, i: number) => (
           <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center">
              <span className="font-black text-slate-700 uppercase italic text-sm">{c}</span>
              <button onClick={() => removeCarrier(i)} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
           </div>
         ))}
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate, onDelete, onDeliver, isSaving, availableCarriers }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(order.carrier || availableCarriers[0] || "");
  const [editedOrder, setEditedOrder] = useState({...order});
  
  const totalBultos = order.detailedPackaging?.reduce((acc: any, p: any) => acc + (p.quantity || 0), 0) || 0;
  const isDispatched = order.status === OrderStatus.DISPATCHED;
  const isArchived = order.status === OrderStatus.ARCHIVED;

  const handleSaveChanges = async () => {
    const success = await onUpdate(editedOrder);
    if (success) setIsEditing(false);
  };

  const confirmDispatch = async () => {
    if (!selectedCarrier) {
      alert("Debes seleccionar un chofer");
      return;
    }
    await onUpdate({...order, status: OrderStatus.DISPATCHED, carrier: selectedCarrier});
    setIsDispatching(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[56px] p-8 shadow-2xl relative overflow-y-auto max-h-[92vh]">
        <div className="absolute top-8 right-8 flex gap-2">
           {!isEditing && !isDispatching && <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={20}/></button>}
           <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>

        {isEditing ? (
          <div className="space-y-6 pt-8 animate-in zoom-in duration-200">
            <h2 className="text-xl font-black uppercase italic text-slate-400 mb-4">Modo Edición</h2>
            <div className="space-y-4">
               <div><label className="text-[8px] font-black uppercase text-slate-400 ml-2">Nombre Cliente</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-indigo-200 uppercase" value={editedOrder.customerName} onChange={e=>setEditedOrder({...editedOrder, customerName: e.target.value})} /></div>
               <div><label className="text-[8px] font-black uppercase text-slate-400 ml-2">Localidad</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-indigo-200 uppercase" value={editedOrder.locality} onChange={e=>setEditedOrder({...editedOrder, locality: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[8px] font-black uppercase text-slate-400 ml-2">Nº Orden</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-indigo-200 uppercase" value={editedOrder.orderNumber} onChange={e=>setEditedOrder({...editedOrder, orderNumber: e.target.value})} /></div>
               </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
               <button onClick={handleSaveChanges} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Save size={14}/> Guardar</button>
            </div>
          </div>
        ) : isDispatching ? (
          <div className="space-y-8 pt-10 animate-in slide-in-from-bottom duration-300 text-center">
             <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[30px] flex items-center justify-center mx-auto shadow-lg"><UserCheck size={40}/></div>
             <h3 className="text-2xl font-black italic uppercase leading-none">Asignar Chofer</h3>
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {availableCarriers.map((c: string) => (
                   <button key={c} onClick={() => setSelectedCarrier(c)} className={`w-full p-6 rounded-[28px] font-black uppercase text-sm border-2 transition-all ${selectedCarrier === c ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>
                      {c}
                   </button>
                ))}
             </div>
             <div className="flex gap-3">
                <button onClick={() => setIsDispatching(false)} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400">Volver</button>
                <button onClick={confirmDispatch} disabled={!selectedCarrier} className="flex-[2] bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Despachar</button>
             </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mt-4">
               <h2 className="text-3xl font-black text-slate-800 italic uppercase leading-[0.8] tracking-tighter">{order.customerName}</h2>
               <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-4">
                  <MapPin size={12}/> {order.locality}
               </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Orden Nº</span>
                  <span className="text-xl font-black text-slate-700 italic">#{order.orderNumber}</span>
               </div>
               <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Bultos</span>
                  <span className="text-xl font-black text-slate-700 italic">{totalBultos}</span>
               </div>
            </div>

            <div className="mt-10 space-y-3">
              {isDispatched && (
                <div className="flex flex-col gap-3">
                   <button onClick={() => {
                     const address = encodeURIComponent(`${order.customerName}, ${order.locality}, Argentina`);
                     window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                   }} className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-[28px] font-black uppercase text-[10px] flex items-center justify-center gap-2 border-2 border-indigo-100 active:scale-95 transition-all">
                      <Navigation size={14}/> GPS Google Maps
                   </button>
                   <button onClick={onDeliver} className="w-full bg-emerald-600 text-white py-6 rounded-[32px] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                     <CheckCircle2 size={20}/> Realizar Entrega PoD
                   </button>
                </div>
              )}
              
              {!isArchived && !isDispatched && (
                <button disabled={isSaving} onClick={() => setIsDispatching(true)} className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin"/> : 'Despachar a Chofer'} <Truck size={18}/>
                </button>
              )}

              {(isDispatched || isArchived) && (
                <button onClick={() => onDelete(order.id)} disabled={isSaving} className="w-full text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 mt-2 border-2 border-red-50 hover:bg-red-50 transition-all">
                   {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Trash2 size={14}/>} Eliminar Pedido Permanentemente
                </button>
              )}

              <button onClick={onClose} className="w-full py-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">Volver</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeliveryWorkflowModal({ order, onClose, onComplete }: any) {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (step === 2 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
    }
  }, [step]);

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) setSignature(canvasRef.current.toDataURL());
  };
  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleFinish = async () => {
    let coords = { lat: 0, lng: 0 };
    try {
      const pos: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) { console.warn("GPS bloqueado"); }

    onComplete(order.id, {
      photo: photo || '',
      signature: signature || '',
      coordinates: coords,
      deliveredAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[800] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[56px] p-8 shadow-2xl relative animate-in zoom-in duration-300">
        <header className="mb-8 text-center">
          <div className="inline-block p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-4"><Truck size={32}/></div>
          <h2 className="text-2xl font-black italic uppercase leading-none">Confirmar Entrega</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{order.customerName}</p>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-sm font-black text-center uppercase tracking-widest text-slate-600">Foto del pedido</h3>
            <div className="aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              {photo ? (
                <img src={photo} alt="Pedido" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <Camera size={48} className="text-slate-300" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Capturar Foto</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e:any) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setPhoto(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
            <button disabled={!photo} onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all">Siguiente: Firma</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Firma Cliente</h3>
               <button onClick={() => {
                 if (canvasRef.current) {
                   const ctx = canvasRef.current.getContext('2d');
                   ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                   setSignature(null);
                 }
               }} className="text-[9px] font-black text-red-500 uppercase">Limpiar</button>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] overflow-hidden touch-none">
               <canvas 
                 ref={canvasRef} 
                 width={350} 
                 height={250} 
                 className="w-full h-64"
                 onMouseDown={startDrawing}
                 onMouseMove={draw}
                 onMouseUp={stopDrawing}
                 onMouseOut={stopDrawing}
                 onTouchStart={startDrawing}
                 onTouchMove={draw}
                 onTouchEnd={stopDrawing}
               />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black uppercase text-[10px]">Atrás</button>
              <button disabled={!signature} onClick={handleFinish} className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all">Finalizar Entrega</button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-8 w-full text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

function LandingScreen({ onSelectStaff, onSelectCustomer }: any) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[2000] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent)] pointer-events-none"></div>
      <div className="text-center space-y-4 mb-12 animate-in zoom-in duration-700">
        <div className="p-8 bg-white/5 rounded-[56px] backdrop-blur-md border border-white/10 shadow-2xl relative">
          <div className="absolute -top-4 -right-4 bg-orange-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest rotate-12">PRO V2.1</div>
          <h1 className="text-8xl font-black italic tracking-tighter text-white leading-none">D<span className="text-orange-500">&</span>G</h1>
        </div>
        <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.4em] italic leading-none mt-2">Logística Inteligente</p>
      </div>
      <div className="w-full max-w-sm space-y-4 relative z-10">
        <button onClick={onSelectStaff} className="w-full bg-slate-900 border border-indigo-500/30 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl active:scale-95 transition-all hover:bg-slate-800">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30"><ShieldCheck size={28}/></div>
          <div className="text-left"><h4 className="font-black uppercase text-lg leading-none mb-1">Operador</h4><p className="text-[8px] opacity-40 uppercase tracking-widest font-black">Acceso Maestro</p></div>
        </button>
        <button onClick={onSelectCustomer} className="w-full bg-emerald-600 text-white p-8 rounded-[40px] flex items-center gap-6 shadow-2xl active:scale-95 transition-all hover:bg-emerald-500">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center"><Search size={28}/></div>
          <div className="text-left"><h4 className="font-black uppercase text-lg leading-none mb-1">Consultas</h4><p className="text-[8px] opacity-70 uppercase tracking-widest font-black">Rastreo de Pedido</p></div>
        </button>
      </div>
    </div>
  );
}

function LoginModal({ onLogin, onBack }: any) {
  const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[56px] p-12 text-center space-y-8 animate-in zoom-in">
        <button onClick={onBack} className="absolute top-8 left-8 text-slate-300 hover:text-indigo-600 transition-colors"><ArrowLeft size={20}/></button>
        <h1 className="text-6xl font-black italic leading-none">D<span className="text-orange-500">&</span>G</h1>
        <div className="space-y-4">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Identificación de Personal</p>
           <input className="w-full bg-slate-50 p-6 rounded-3xl text-center font-black outline-none border-2 border-transparent focus:border-indigo-500 uppercase transition-all" placeholder="CODIGO ID" value={n} onChange={e=>setN(e.target.value)} />
        </div>
        <button onClick={()=>onLogin({name:n||'OPERADOR'})} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase shadow-2xl active:scale-95 hover:bg-indigo-600 transition-all">INGRESAR AL PANEL</button>
      </div>
    </div>
  );
}

function NewOrderForm({ onAdd, isSaving }: any) {
  const [form, setForm] = useState({ orderNumber: '', name: '', locality: '', notes: '' });
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black italic uppercase text-center">Nuevo Ingreso</h2>
      <div className="space-y-4">
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-3">Nº Orden</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500 uppercase" value={form.orderNumber} onChange={e=>setForm({...form, orderNumber: e.target.value})} placeholder="Ej: 5542" /></div>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-3">Cliente / Comercio</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500 uppercase" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="NOMBRE" /></div>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-3">Localidad</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500 uppercase" value={form.locality} onChange={e=>setForm({...form, locality: e.target.value})} placeholder="CIUDAD" /></div>
      </div>
      <button disabled={isSaving} onClick={() => onAdd({...form, status: OrderStatus.PENDING, source: 'Manual'})} className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black uppercase text-xs shadow-xl active:scale-95 hover:bg-indigo-600 transition-all">
        {isSaving ? <Loader2 className="animate-spin inline mr-2"/> : 'CONFIRMAR CARGA'}
      </button>
    </div>
  );
}

function CustomerPortal({ onBack, orders }: any) {
  const [s, setS] = useState('');
  const results = orders?.filter((o:any) => 
    (o.customerName?.toLowerCase().includes(s.toLowerCase()) || o.orderNumber?.includes(s)) && 
    o.status !== OrderStatus.ARCHIVED
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto min-h-screen bg-slate-50">
      <header className="flex items-center gap-4 animate-in slide-in-from-left">
        <button onClick={onBack} className="p-4 bg-white border rounded-2xl shadow-sm text-slate-300 hover:text-emerald-500 transition-colors"><ArrowLeft/></button>
        <h2 className="text-2xl font-black italic">Rastreo de Pedido</h2>
      </header>
      <div className="bg-white p-8 rounded-[48px] shadow-xl space-y-4 animate-in zoom-in">
        <h3 className="font-black text-xl italic leading-none">¿Dónde está mi envío?</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consulta el estado actual de tu pedido.</p>
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200" size={18}/>
           <input className="w-full bg-slate-50 p-5 pl-12 rounded-[24px] outline-none font-black text-sm uppercase shadow-inner border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="Buscar mi pedido..." value={s} onChange={e=>setS(e.target.value)} />
        </div>
      </div>
      <div className="space-y-6">
        {results.map((o:any) => (
          <div key={o.id} className="bg-white p-10 rounded-[56px] shadow-2xl animate-in slide-in-from-bottom border-b-8 border-emerald-500/20">
            <h4 className="font-black text-4xl mb-2 text-slate-800 uppercase italic tracking-tighter leading-[0.8] truncate">{o.customerName}</h4>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-3 mb-8">PEDIDO #{o.orderNumber} • {o.locality}</div>
            <div className="relative flex justify-between items-start pt-2">
               <div className="absolute top-6 left-0 right-0 h-1 bg-slate-100 -z-10 rounded-full"></div>
               {[OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED].map((st, idx) => {
                 const isActive = o.status === st;
                 const isPassed = (o.status === OrderStatus.COMPLETED && st === OrderStatus.PENDING) || 
                                  (o.status === OrderStatus.DISPATCHED && (st === OrderStatus.PENDING || st === OrderStatus.COMPLETED));
                 return (
                   <div key={st} className="flex flex-col items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                        isActive ? 'bg-orange-500 text-white border-orange-100 scale-125 shadow-lg shadow-orange-500/30' : 
                        isPassed ? 'bg-emerald-500 text-white border-emerald-50' : 'bg-white text-slate-200 border-slate-50'
                      }`}>
                        {isActive ? <Activity size={16} className="animate-pulse"/> : isPassed ? <Check size={16}/> : idx + 1}
                      </div>
                      <span className={`text-[8px] font-black uppercase ${isActive ? 'text-orange-600' : isPassed ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {st === OrderStatus.PENDING ? 'Ingreso' : st === OrderStatus.COMPLETED ? 'Preparado' : 'En Ruta'}
                      </span>
                   </div>
                 );
               })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

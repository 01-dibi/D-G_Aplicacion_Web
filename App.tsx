
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  Menu, X, Loader2, History, PlusSquare, LogOut, Package, Eraser, Plus, Settings, AlertTriangle, Trash2, Layers, ChevronRight
} from 'lucide-react';
import { Order, OrderStatus, View } from './types.ts';
import { supabase, connectionStatus } from './supabaseClient.ts';
import OrderDetailsModal from './OrderDetailsModal.tsx';
import NewOrderForm from './NewOrderForm.tsx';
import CustomerPortal from './CustomerPortal.tsx';
import { StatCard, SidebarItem, NavBtn, OrderCard } from './UIComponents.tsx';
import { LandingScreen, LoginModal } from './LoginComponents.tsx';

export default function App() {
  const [isLandingMode, setIsLandingMode] = useState(true);
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStageSelectorOpen, setIsStageSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('dg_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
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
        orderNumber: String(o.order_number || ''),
        customerNumber: String(o.customer_number || ''),
        customerName: o.customer_name,
        locality: o.locality,
        status: o.status as OrderStatus,
        notes: o.notes,
        reviewer: o.reviewer,
        source: o.source,
        carrier: o.carrier,
        warehouse: o.warehouse,
        packageType: o.package_type,
        packageQuantity: o.package_quantity || 0,
        dispatchType: o.dispatch_type,
        dispatchValue: o.dispatch_value,
        detailedPackaging: o.detailed_packaging || [],
        createdAt: o.created_at,
        deliveryData: o.delivery_data
      }));
      setOrders(mappedData);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !connectionStatus.isConfigured) return;

    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setIsLandingMode(false);
      fetchOrders();
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
      (o.orderNumber || '').includes(lowSearch) ||
      (o.customerNumber || '').includes(lowSearch) ||
      (o.locality?.toLowerCase() || '').includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setIsSaving(true);
    try {
      const fullPayload = {
        status: updatedOrder.status,
        notes: updatedOrder.notes,
        carrier: updatedOrder.carrier,
        warehouse: updatedOrder.warehouse,
        package_type: updatedOrder.packageType,
        package_quantity: updatedOrder.packageQuantity,
        dispatch_type: updatedOrder.dispatchType,
        dispatch_value: updatedOrder.dispatchValue,
        detailed_packaging: updatedOrder.detailedPackaging,
        customer_name: updatedOrder.customerName,
        customer_number: updatedOrder.customerNumber,
        locality: updatedOrder.locality,
        order_number: updatedOrder.orderNumber,
        reviewer: updatedOrder.reviewer
      };
      const { error } = await supabase.from('orders').update(fullPayload).eq('id', updatedOrder.id);
      if (error) throw error;
      setSelectedOrder(updatedOrder);
      return true;
    } catch (err: any) {
      alert(`Error de sincronización: ${err.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrder = async (newOrder: Partial<Order>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('orders').insert([{
        order_number: newOrder.orderNumber,
        customer_number: newOrder.customerNumber,
        customer_name: newOrder.customerName,
        locality: newOrder.locality,
        notes: newOrder.notes,
        status: OrderStatus.PENDING,
        source: newOrder.source || 'Manual'
      }]);
      if (error) throw error;
      return true;
    } catch (err) {
      alert("Error al crear el pedido.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("¿Eliminar registro permanentemente?")) return;
    setIsSaving(true);
    try {
      await supabase.from('orders').delete().eq('id', orderId);
      setSelectedOrder(null);
    } catch (err) {
      alert("Error al eliminar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    const firstConfirm = confirm("⚠️ ATENCIÓN: ¿Estás seguro de que deseas borrar TODOS los pedidos de la base de datos? Esta acción es irreversible.");
    if (!firstConfirm) return;
    const secondConfirm = confirm("🛑 ÚLTIMO AVISO: Se eliminarán Pendientes, Preparados, Despachados e Historial. ¿Confirmar limpieza total?");
    if (!secondConfirm) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('orders').delete().filter('id', 'not.is', null);
      if (error) throw error;
      alert("✅ Base de datos reseteada con éxito.");
      setView('DASHBOARD');
      fetchOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLandingMode) return <LandingScreen onSelectStaff={() => setIsLandingMode(false)} onSelectCustomer={() => { setIsLandingMode(false); setIsCustomerMode(true); }} />;
  if (isCustomerMode) return <CustomerPortal onBack={() => { setIsLandingMode(true); setIsCustomerMode(false); }} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => { setCurrentUser(u); localStorage.setItem('dg_user', JSON.stringify(u)); }} onBack={() => setIsLandingMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-32 font-sans relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200]" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-slate-900 text-white">
              <h1 className="text-2xl font-bold italic mb-4 text-orange-500">D&G Logística</h1>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">{currentUser.name[0]}</div>
                 <div>
                    <p className="text-sm font-bold leading-none">{currentUser.name}</p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Operador Logístico</p>
                 </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="Despachados" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<History size={20}/>} label="Historial" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Settings size={20}/>} label="Mantenimiento" active={view === 'MAINTENANCE'} onClick={() => { setView('MAINTENANCE'); setIsSidebarOpen(false); }} />
            </nav>
            <div className="p-4 border-t">
               <SidebarItem icon={<LogOut size={20}/>} label="Cerrar Sesión" onClick={() => { setCurrentUser(null); localStorage.removeItem('dg_user'); }} danger />
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[32px] shadow-md flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-95 transition-all"><Menu size={20} /></button>
        <h1 className="text-lg font-bold uppercase italic leading-none text-center">D&G <span className="text-orange-500">Logística</span></h1>
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center font-bold shadow-inner" onClick={fetchOrders}>{currentUser.name[0]}</div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading && <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={32} /></div>}

        {!isLoading && view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="Despachados" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Historial" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            <button onClick={() => setIsNewOrderModalOpen(true)} className="w-full bg-white border-2 border-slate-100 p-8 rounded-[32px] flex items-center gap-6 shadow-sm active:scale-95 transition-all">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><PlusSquare size={28}/></div>
              <div className="text-left"><h4 className="font-bold uppercase text-lg italic text-slate-800">Nueva Carga</h4><p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-1">IA o Manual</p></div>
            </button>
          </div>
        )}

        {!isLoading && view === 'MAINTENANCE' && (
          <div className="space-y-8 animate-in zoom-in duration-300 pt-4">
             <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[30px] flex items-center justify-center mx-auto shadow-inner mb-4">
                  <Settings size={40} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-black italic uppercase text-slate-900">Mantenimiento</h2>
             </div>
             <div className="bg-white border-2 border-red-50 p-8 rounded-[40px] shadow-sm space-y-6">
                <div className="flex items-center gap-4 text-red-600"><AlertTriangle size={24} /><h3 className="font-black uppercase text-sm italic">Zona de Peligro</h3></div>
                <button onClick={handleResetDatabase} disabled={isSaving} className="w-full bg-red-600 text-white py-6 rounded-[28px] font-black uppercase text-xs flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20}/>} VACIAR TODA LA BASE DE DATOS
                </button>
             </div>
          </div>
        )}

        {!isLoading && view !== 'DASHBOARD' && view !== 'MAINTENANCE' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-400">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Buscar cliente, localidad..." className="w-full bg-white border-2 border-slate-100 rounded-[22px] py-4 pl-12 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-10">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
              )) : <div className="text-center py-20 opacity-20"><Package size={48} className="mx-auto"/><p className="text-[10px] font-black mt-4 uppercase tracking-widest">Sin resultados</p></div>}
            </div>
          </div>
        )}
      </main>

      {/* Stage Selector Modal */}
      {isStageSelectorOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[1000] flex items-center justify-center p-6" onClick={() => setIsStageSelectorOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-[50px] p-8 shadow-2xl space-y-6 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-2">
              <h3 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">Acceso a Etapas</h3>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em]">Selecciona una sección</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {[
                 { v: 'PENDING', l: 'Pendientes', c: 'bg-orange-500', i: <ClipboardList /> },
                 { v: 'COMPLETED', l: 'Preparados', c: 'bg-emerald-600', i: <CheckCircle2 /> },
                 { v: 'DISPATCHED', l: 'Despachados', c: 'bg-indigo-600', i: <Truck /> },
                 { v: 'ALL', l: 'Historial', c: 'bg-slate-700', i: <History /> }
               ].map(item => (
                 <button 
                   key={item.v} 
                   onClick={() => { setView(item.v as View); setIsStageSelectorOpen(false); }}
                   className={`${item.c} text-white p-6 rounded-[35px] flex flex-col items-center justify-center gap-3 shadow-lg active:scale-95 transition-all`}
                 >
                   {React.cloneElement(item.i as React.ReactElement, { size: 28 })}
                   <span className="text-[10px] font-black uppercase tracking-widest">{item.l}</span>
                 </button>
               ))}
            </div>
            <button onClick={() => setIsStageSelectorOpen(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.5em] border-t pt-6">Cerrar</button>
          </div>
        </div>
      )}

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[600] flex items-center justify-center p-5">
          <div className="bg-white w-full max-md rounded-[40px] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in duration-200">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"><X/></button>
            <NewOrderForm onAdd={async (d:any) => { const success = await handleCreateOrder(d); if (success) setIsNewOrderModalOpen(false); }} isSaving={isSaving} />
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
          isSaving={isSaving}
          currentUserName={currentUser?.name}
        />
      )}

      {/* Redesigned Bottom Navigation with 3 items */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t pt-4 pb-8 px-8 flex justify-between items-center max-w-md mx-auto rounded-t-[40px] shadow-[0_-15px_40px_-5px_rgba(0,0,0,0.1)] z-[500]">
        <NavBtn label="Inicio" icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        
        {/* Center Button: New Order (+) */}
        <div className="flex-1 flex justify-center">
          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-white"
          >
            <Plus size={24} strokeWidth={3} />
            <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Cargar</span>
          </button>
        </div>

        {/* Right Button: Stage Selector */}
        <button 
          onClick={() => setIsStageSelectorOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 transition-all flex-1 py-1 text-slate-400"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner animate-pulse">
            <Layers size={22} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 opacity-60">Etapas</span>
        </button>
      </nav>
    </div>
  );
}

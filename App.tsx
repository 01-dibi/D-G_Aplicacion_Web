
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  Menu, X, Loader2, History, PlusSquare, LogOut, Package, Eraser, Plus, Settings, AlertTriangle, Trash2, Layers, ChevronRight, Hash, User, WifiOff, CheckSquare, Square, Check, ArrowLeft
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
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentUser, setCurrentUser] = useState<{ name: string, mode?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('dg_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const saveLocalOrders = (newOrders: Order[]) => {
    localStorage.setItem('dg_local_orders', JSON.stringify(newOrders));
    setOrders(newOrders);
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    // Solo usamos local si hay un usuario en modo local explícito
    if (currentUser?.mode === 'local') {
      const local = localStorage.getItem('dg_local_orders');
      if (local) setOrders(JSON.parse(local));
      setIsLocalMode(true);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error }: any = await supabase
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
      setIsLocalMode(false);
    } catch (error: any) {
      const local = localStorage.getItem('dg_local_orders');
      if (local) setOrders(JSON.parse(local));
      setIsLocalMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para manejar la carga de datos inicial y real-time
  useEffect(() => {
    // Cargamos pedidos si el usuario está logueado O si estamos en modo consulta de clientes
    if (currentUser || isCustomerMode) {
      fetchOrders();
      setIsLandingMode(false);
    }

    if (!isLocalMode && (currentUser || isCustomerMode)) {
      const channel = supabase
        .channel('realtime_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [currentUser, isCustomerMode]);

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

  const globalFilteredOrders = useMemo(() => {
    if (!globalSearchTerm.trim()) return [];
    const lowSearch = globalSearchTerm.toLowerCase();
    return orders.filter(o => 
      (o.customerName?.toLowerCase() || '').includes(lowSearch) || 
      (o.orderNumber || '').includes(lowSearch) ||
      (o.customerNumber || '').includes(lowSearch) ||
      (o.locality?.toLowerCase() || '').includes(lowSearch) ||
      (o.status.toLowerCase()).includes(lowSearch)
    );
  }, [orders, globalSearchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setIsSaving(true);
    if (isLocalMode || currentUser?.mode === 'local') {
      const newOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      saveLocalOrders(newOrders);
      setSelectedOrder(updatedOrder);
      setIsSaving(false);
      return true;
    }

    try {
      const { error } = await supabase.from('orders').update({
        status: updatedOrder.status,
        notes: updatedOrder.notes,
        carrier: updatedOrder.carrier,
        warehouse: updatedOrder.warehouse,
        package_type: updatedOrder.packageType,
        package_quantity: updatedOrder.packageQuantity,
        // Fix: Use camelCase properties from the Order interface (detailedPackaging, dispatchType, dispatchValue)
        detailed_packaging: updatedOrder.detailedPackaging,
        customer_name: updatedOrder.customerName,
        customer_number: updatedOrder.customerNumber,
        locality: updatedOrder.locality,
        order_number: updatedOrder.orderNumber,
        reviewer: updatedOrder.reviewer,
        dispatch_type: updatedOrder.dispatchType,
        dispatch_value: updatedOrder.dispatchValue
      }).eq('id', updatedOrder.id);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      return true;
    } catch (err: any) {
      console.error("Update error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrder = async (newOrder: Partial<Order>) => {
    setIsSaving(true);
    const reviewerName = currentUser?.name || 'SISTEMA';
    
    if (isLocalMode || currentUser?.mode === 'local') {
      const orderToAdd: Order = {
        id: Math.random().toString(36).substr(2, 9),
        orderNumber: newOrder.orderNumber || '',
        customerNumber: newOrder.customerNumber || '',
        customerName: newOrder.customerName || '',
        locality: newOrder.locality || '',
        notes: newOrder.notes || '',
        status: OrderStatus.PENDING,
        source: newOrder.source || 'Manual',
        reviewer: reviewerName,
        createdAt: new Date().toISOString()
      };
      saveLocalOrders([orderToAdd, ...orders]);
      setIsSaving(false);
      return true;
    }

    try {
      const { error } = await supabase.from('orders').insert([{
        order_number: newOrder.orderNumber,
        customer_number: newOrder.customerNumber,
        customer_name: newOrder.customerName,
        locality: newOrder.locality,
        notes: newOrder.notes,
        status: OrderStatus.PENDING,
        reviewer: reviewerName,
        source: newOrder.source || 'Manual'
      }]);
      if (error) throw error;
      await fetchOrders();
      return true;
    } catch (err) {
      console.error("Create error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAction = async (newStatus: OrderStatus | 'DELETE') => {
    if (selectedIds.length === 0) return;
    if (newStatus === 'DELETE' && !confirm(`¿Eliminar ${selectedIds.length} registros?`)) return;
    
    setIsSaving(true);
    try {
      if (isLocalMode || currentUser?.mode === 'local') {
        let newOrders = [...orders];
        if (newStatus === 'DELETE') {
          newOrders = orders.filter(o => !selectedIds.includes(o.id));
        } else {
          newOrders = orders.map(o => selectedIds.includes(o.id) ? { ...o, status: newStatus } : o);
        }
        saveLocalOrders(newOrders);
      } else {
        if (newStatus === 'DELETE') {
          await supabase.from('orders').delete().in('id', selectedIds);
        } else {
          await supabase.from('orders').update({ status: newStatus }).in('id', selectedIds);
        }
        await fetchOrders();
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLandingMode) return <LandingScreen onSelectStaff={() => setIsLandingMode(false)} onSelectCustomer={() => { setIsCustomerMode(true); setIsLandingMode(false); }} />;
  if (isCustomerMode) return <CustomerPortal onBack={() => { setIsLandingMode(true); setIsCustomerMode(false); }} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => { setCurrentUser(u); localStorage.setItem('dg_user', JSON.stringify(u)); }} onBack={() => setIsLandingMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28 font-sans relative overflow-x-hidden">
      {isLocalMode && (
        <div className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-[0.2em] py-1 px-4 flex items-center justify-center gap-2 sticky top-0 z-[100] shadow-sm">
          <WifiOff size={10}/> Modo Local (Sin Nube)
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[32px] shadow-md flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-95"><Menu size={20} /></button>
        <h1 className="text-lg font-bold uppercase italic leading-none text-center">D&G <span className="text-orange-500">Logística</span></h1>
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center font-bold cursor-pointer shadow-lg" onClick={fetchOrders}>
          {isLoading ? <Loader2 className="animate-spin" size={16}/> : currentUser.name[0]}
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[2000]" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-slate-900 text-white">
              <h1 className="text-2xl font-bold italic mb-4 text-orange-500">D&G Logística</h1>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">{currentUser.name[0]}</div>
                 <div><p className="text-sm font-bold leading-none">{currentUser.name}</p><p className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">{isLocalMode ? 'Operador Local' : 'Sincronizado'}</p></div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="Despachados" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Settings size={20}/>} label="Configuración" active={view === 'MAINTENANCE'} onClick={() => { setView('MAINTENANCE'); setIsSidebarOpen(false); }} />
            </nav>
            <div className="p-6 border-t bg-slate-50 mt-auto">
               <SidebarItem icon={<LogOut size={20}/>} label="Cerrar Sesión" onClick={() => { setCurrentUser(null); localStorage.removeItem('dg_user'); }} danger />
            </div>
          </div>
        </div>
      )}

      <main className="p-5 space-y-6">
        {!isLoading && view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="Despachados" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Historial" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            <button onClick={() => setIsNewOrderModalOpen(true)} className="w-full bg-white border-2 border-slate-100 p-8 rounded-[32px] flex items-center gap-6 shadow-sm active:scale-95 transition-all">
              <div className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center"><PlusSquare size={28}/></div>
              <div className="text-left"><h4 className="font-bold uppercase text-lg italic text-slate-800">Nueva Carga</h4><p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-1">Manual / Inteligencia Artificial</p></div>
            </button>
          </div>
        )}

        {!isLoading && view !== 'DASHBOARD' && view !== 'MAINTENANCE' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-400">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-black italic uppercase text-slate-900">{view === 'ALL' ? 'Historial' : view}</h2>
              <button 
                onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }} 
                className={`text-[9px] font-black uppercase px-4 py-2 rounded-full border transition-all ${isSelectionMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {isSelectionMode ? 'CANCELAR' : 'SELECCIONAR'}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Filtrar por nombre o N°..." className="w-full bg-white border-2 border-slate-100 rounded-[22px] py-4 pl-12 text-sm font-bold outline-none focus:border-indigo-500 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.includes(order.id)}
                  onClick={() => isSelectionMode ? setSelectedIds(prev => prev.includes(order.id) ? prev.filter(i => i !== order.id) : [...prev, order.id]) : setSelectedOrder(order)} 
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {isGlobalSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[3000] flex flex-col p-6 animate-in fade-in duration-300">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => { setIsGlobalSearchOpen(false); setGlobalSearchTerm(''); }} className="p-3 bg-white/10 text-white rounded-2xl active:scale-95">
              <ArrowLeft size={24}/>
            </button>
            <h2 className="text-white text-xl font-black italic uppercase tracking-tighter">Buscador Universal</h2>
          </header>

          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input 
              autoFocus
              type="text" 
              placeholder="CLIENTE, N° PEDIDO, LOCALIDAD..." 
              className="w-full bg-white/10 border border-white/20 text-white p-6 pl-14 rounded-[30px] font-black text-sm uppercase outline-none focus:border-orange-500 shadow-xl" 
              value={globalSearchTerm} 
              onChange={e => setGlobalSearchTerm(e.target.value)} 
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
            {globalFilteredOrders.length > 0 ? globalFilteredOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => { setSelectedOrder(order); setIsGlobalSearchOpen(false); setGlobalSearchTerm(''); }}
                className="bg-white/5 border border-white/10 p-5 rounded-[28px] active:scale-95 transition-all flex justify-between items-center group"
              >
                <div>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">#{order.orderNumber} • {order.status}</p>
                  <h4 className="text-white font-black uppercase italic text-base leading-none group-hover:text-orange-500 transition-colors">{order.customerName}</h4>
                  <p className="text-white/40 text-[9px] font-black uppercase mt-2">{order.locality}</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <ChevronRight size={18}/>
                </div>
              </div>
            )) : globalSearchTerm.length > 0 ? (
              <div className="text-center py-20 opacity-30">
                <Search size={48} className="mx-auto mb-4 text-white" />
                <p className="font-black uppercase text-[10px] tracking-widest text-white">Sin coincidencias</p>
              </div>
            ) : (
              <div className="text-center py-20 opacity-20">
                <Package size={60} className="mx-auto mb-4 text-white" />
                <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed text-white text-center">Busca cualquier dato del pedido<br/>en toda la base de datos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          allOrders={orders}
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          onDelete={async (id:string) => { if(confirm("¿Eliminar?")) { await supabase.from('orders').delete().eq('id', id); fetchOrders(); setSelectedOrder(null); } }}
          isSaving={isSaving}
          currentUserName={currentUser?.name}
        />
      )}

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-5">
          <div className="bg-white w-full max-md rounded-[40px] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-8 right-8 text-slate-300"><X/></button>
            <NewOrderForm onAdd={async (d:any) => { const success = await handleCreateOrder(d); if (success) setIsNewOrderModalOpen(false); }} isSaving={isSaving} />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t h-20 flex justify-around items-center max-w-md mx-auto rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[1500] px-4">
        <NavBtn 
          icon={<Plus size={26}/>} 
          label="NUEVO" 
          active={isNewOrderModalOpen} 
          onClick={() => { setIsNewOrderModalOpen(true); setIsGlobalSearchOpen(false); }} 
          activeColor="bg-violet-600"
          baseColor="text-violet-300"
        />
        <NavBtn 
          icon={<LayoutDashboard size={26}/>} 
          label="DASHBOARD" 
          active={view === 'DASHBOARD' && !isNewOrderModalOpen && !isGlobalSearchOpen} 
          onClick={() => { setView('DASHBOARD'); setIsGlobalSearchOpen(false); setIsNewOrderModalOpen(false); }} 
          activeColor="bg-orange-500"
          baseColor="text-orange-300"
        />
        <NavBtn 
          icon={<Search size={26}/>} 
          label="BUSCAR" 
          active={isGlobalSearchOpen} 
          onClick={() => { setIsGlobalSearchOpen(true); setIsNewOrderModalOpen(false); }} 
          activeColor="bg-slate-800"
          baseColor="text-slate-400"
        />
      </nav>
    </div>
  );
}

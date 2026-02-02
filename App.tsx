
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  Menu, X, Loader2, History, PlusSquare, LogOut, Package, Eraser, Plus, Settings, AlertTriangle, Trash2, Layers, ChevronRight, Hash, User, WifiOff, CheckSquare, Square, Check, ArrowLeft, Database, RefreshCw, Smartphone, Download, FileSpreadsheet
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

  const isAdminUser = useMemo(() => {
    const name = currentUser?.name?.toUpperCase() || '';
    return name === 'ROBERTO' || name === 'ANTONIO';
  }, [currentUser]);

  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    setIsLoading(true);
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
        detailedPackaging: o.detailed_packaging || [],
        createdAt: o.created_at,
        deliveryData: o.delivery_data,
        dispatchType: o.dispatch_type,
        dispatchValue: o.dispatch_value 
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

  useEffect(() => {
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

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    setIsSaving(true);
    if (isLocalMode || currentUser?.mode === 'local') {
      const newOrder: Order = {
        id: Date.now().toString(),
        orderNumber: orderData.orderNumber || '',
        customerNumber: orderData.customerNumber || '',
        customerName: orderData.customerName || '',
        locality: orderData.locality || '',
        status: OrderStatus.PENDING,
        notes: orderData.notes || '',
        source: orderData.source || 'Manual',
        createdAt: new Date().toISOString(),
      };
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem('dg_local_orders', JSON.stringify(updatedOrders));
      setIsSaving(false);
      return true;
    }

    try {
      const { error } = await supabase.from('orders').insert([{
        order_number: orderData.orderNumber,
        customer_number: orderData.customerNumber,
        customer_name: orderData.customerName,
        locality: orderData.locality,
        notes: orderData.notes || '',
        status: OrderStatus.PENDING,
        source: orderData.source || 'Manual'
      }]);
      
      if (error) throw error;
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("Create error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setIsSaving(true);
    if (isLocalMode || currentUser?.mode === 'local') {
      const newOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      setOrders(newOrders);
      localStorage.setItem('dg_local_orders', JSON.stringify(newOrders));
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
      await fetchOrders();
      setSelectedOrder(updatedOrder);
      return true;
    } catch (err: any) {
      console.error("Update error:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (isLocalMode || currentUser?.mode === 'local') {
      const newOrders = orders.filter(o => o.id !== id);
      setOrders(newOrders);
      localStorage.setItem('dg_local_orders', JSON.stringify(newOrders));
      return;
    }
    await supabase.from('orders').delete().eq('id', id);
    await fetchOrders();
  };

  const handleExportData = () => {
    if (orders.length === 0) return;
    const headers = ["FECHA","N_PEDIDO","CTA_CLIENTE","CLIENTE","LOCALIDAD","ESTADO","RESPONSABLE","DEPOSITO","TIPO_BULTO","CANTIDAD","DESPACHO_TIPO","DESPACHO_VALOR","NOTAS"];
    const csvContent = orders.map(o => [
      new Date(o.createdAt).toLocaleDateString('es-AR'),
      `"${o.orderNumber}"`,
      `"${o.customerNumber}"`,
      `"${o.customerName?.replace(/"/g, '""')}"`,
      `"${o.locality?.replace(/"/g, '""')}"`,
      o.status,
      `"${o.reviewer?.replace(/"/g, '""') || ''}"`,
      `"${o.warehouse || ''}"`,
      `"${o.packageType || ''}"`,
      o.packageQuantity || 0,
      `"${o.dispatchType || ''}"`,
      `"${o.dispatchValue?.replace(/"/g, '""') || ''}"`,
      `"${o.notes?.replace(/"/g, '""').replace(/\n/g, ' ') || ''}"`
    ].join(","));
    const csvString = [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `DG_LOGISTICA_DB_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  if (isLandingMode) return <LandingScreen onSelectStaff={() => setIsLandingMode(false)} onSelectCustomer={() => { setIsCustomerMode(true); setIsLandingMode(false); }} />;
  if (isCustomerMode) return <CustomerPortal onBack={() => { setIsLandingMode(true); setIsCustomerMode(false); }} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => { setCurrentUser(u); localStorage.setItem('dg_user', JSON.stringify(u)); }} onBack={() => setIsLandingMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28 font-sans relative overflow-x-hidden">
      {isLocalMode && <div className="bg-amber-500 text-white text-[8px] font-black uppercase py-1 px-4 text-center sticky top-0 z-[100] shadow-sm"><WifiOff size={10} className="inline mr-2"/> Modo Local</div>}

      <header className="bg-slate-900 text-white p-6 rounded-b-[32px] shadow-md flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-95"><Menu size={20} /></button>
        <h1 className="text-lg font-bold uppercase italic leading-none text-center">D&G <span className="text-orange-500">Logística</span></h1>
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center font-bold shadow-lg" onClick={fetchOrders}>
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
                 <div><p className="text-sm font-bold leading-none">{currentUser.name}</p></div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="Despachados" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
              {isAdminUser && <SidebarItem icon={<Settings size={20}/>} label="Configuración" active={view === 'MAINTENANCE'} onClick={() => { setView('MAINTENANCE'); setIsSidebarOpen(false); }} />}
            </nav>
            <div className="p-6 border-t mt-auto"><SidebarItem icon={<LogOut size={20}/>} label="Cerrar Sesión" onClick={() => { setCurrentUser(null); localStorage.removeItem('dg_user'); }} danger /></div>
          </div>
        </div>
      )}

      <main className="p-5 space-y-6">
        {view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="Despachados" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Historial" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            <button onClick={() => setIsNewOrderModalOpen(true)} className="w-full bg-white border-2 border-slate-100 p-8 rounded-[32px] flex items-center gap-6 shadow-sm active:scale-95 transition-all">
              <div className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center"><PlusSquare size={28}/></div>
              <div className="text-left"><h4 className="font-bold uppercase text-lg italic text-slate-800">Nueva Carga</h4></div>
            </button>
          </div>
        )}

        {view === 'MAINTENANCE' && isAdminUser && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-400">
            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
               <button onClick={handleExportData} className="w-full bg-emerald-50 text-emerald-600 p-6 rounded-[28px] flex items-center gap-4 active:scale-95 border-b-4 border-emerald-500">
                 <FileSpreadsheet size={20}/><h4 className="font-black uppercase text-xs italic">Descargar Base de Datos</h4>
               </button>
               <button onClick={fetchOrders} className="w-full bg-indigo-50 text-indigo-600 p-6 rounded-[28px] flex items-center gap-4 active:scale-95 border-b-4 border-indigo-500">
                 <RefreshCw size={20}/><h4 className="font-black uppercase text-xs italic">Sincronizar</h4>
               </button>
            </div>
          </div>
        )}

        {view !== 'DASHBOARD' && view !== 'MAINTENANCE' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-400">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Filtrar por nombre o N°..." className="w-full bg-white border-2 border-slate-100 rounded-[22px] py-4 pl-12 text-sm font-bold outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE BÚSQUEDA GLOBAL (POSICIONADO PARA EVITAR CONFLICTOS DE RENDERIZADO) */}
      {isGlobalSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[2000] flex flex-col p-6 animate-in fade-in duration-300">
          <header className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Búsqueda Global</h2>
            <button 
              onClick={() => { setIsGlobalSearchOpen(false); setGlobalSearchTerm(''); }}
              className="p-3 bg-white/10 text-white rounded-2xl active:scale-90 transition-all hover:bg-white/20"
            >
              <X size={24} />
            </button>
          </header>

          <div className="relative mb-8">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input 
              autoFocus
              type="text" 
              placeholder="CLIENTE, N° PEDIDO, LOCALIDAD..." 
              className="w-full bg-white/10 border-2 border-white/20 rounded-[28px] py-6 pl-14 pr-6 text-white font-bold outline-none focus:border-orange-500 transition-all shadow-2xl placeholder:text-slate-500"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
            {globalSearchTerm.trim() === '' ? (
              <div className="text-center py-20 opacity-30">
                <Search size={60} className="mx-auto mb-4 text-white" />
                <p className="text-white font-black uppercase text-[10px] tracking-widest leading-relaxed">
                  Ingrese cualquier dato para buscar<br/>en toda la base de datos
                </p>
              </div>
            ) : globalFilteredOrders.length > 0 ? (
              globalFilteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsGlobalSearchOpen(false);
                    setGlobalSearchTerm('');
                  }} 
                />
              ))
            ) : (
              <div className="text-center py-20 opacity-30">
                <AlertTriangle size={60} className="mx-auto mb-4 text-white" />
                <p className="text-white font-black uppercase text-[10px] tracking-widest leading-relaxed">
                  No se encontraron pedidos con: <span className="text-orange-500 italic">{globalSearchTerm}</span>
                </p>
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
          onDelete={handleDeleteOrder}
          isSaving={isSaving}
          currentUserName={currentUser?.name}
        />
      )}

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-5">
          <div className="bg-white w-full max-md rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar relative">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-8 right-8 text-slate-300"><X/></button>
            <NewOrderForm onAdd={async (d:any) => { const success = await handleCreateOrder(d); if (success) setIsNewOrderModalOpen(false); }} isSaving={isSaving} />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t h-20 flex justify-around items-center max-w-md mx-auto rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[1500] px-4">
        <NavBtn icon={<Plus size={26}/>} label="NUEVO" active={isNewOrderModalOpen} onClick={() => setIsNewOrderModalOpen(true)} activeColor="bg-violet-600" baseColor="text-violet-300" />
        <NavBtn icon={<LayoutDashboard size={26}/>} label="DASHBOARD" active={view === 'DASHBOARD' && !isNewOrderModalOpen && !isGlobalSearchOpen} onClick={() => setView('DASHBOARD')} activeColor="bg-orange-500" baseColor="text-orange-300" />
        <NavBtn icon={<Search size={26}/>} label="BUSCAR" active={isGlobalSearchOpen} onClick={() => setIsGlobalSearchOpen(true)} activeColor="bg-slate-800" baseColor="text-slate-400" />
      </nav>
    </div>
  );
}


import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, MessageCircle, 
  ChevronRight, Menu, User, Package, ArrowLeft, Loader2, ScanSearch, X, Send, 
  History, ChevronLeft, Layers, Navigation, Trash2, PlusSquare, Box, Hash, 
  Mail, BellRing, LogOut, Boxes, Plus, Minus, Check, Share2, MapPin, Phone,
  FileText, Settings, Info, Archive, UserCheck
} from 'lucide-react';
import { Order, OrderStatus, View, OrderItem, PackagingEntry } from './types';
import { analyzeOrderText } from './geminiService';

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'GENERAL'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'BULTO', 'PACK'];

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'staff' } | null>(() => {
    const saved = localStorage.getItem('dg_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dg_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  useEffect(() => {
    localStorage.setItem('dg_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('dg_user', JSON.stringify(currentUser));
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
      o.customerName.toLowerCase().includes(lowSearch) || 
      (o.customerNumber || '').includes(lowSearch) ||
      o.orderNumber.toLowerCase().includes(lowSearch) ||
      (o.locality || '').toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm("¿Eliminar este pedido permanentemente?")) {
      setOrders(prev => prev.filter(o => o.id !== id));
      setSelectedOrder(null);
    }
  };

  const handleArchiveClientOrders = (clientName: string) => {
    if (confirm(`¿Desea archivar todos los pedidos despachados de ${clientName}?`)) {
      setOrders(prev => prev.map(o => 
        (o.customerName === clientName && o.status === OrderStatus.DISPATCHED) 
        ? { ...o, status: OrderStatus.ARCHIVED } 
        : o
      ));
      alert("Pedidos consolidados y archivados.");
    }
  };

  const addOrder = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
    setView('PENDING');
  };

  const handleLogout = () => {
    localStorage.removeItem('dg_user');
    setCurrentUser(null);
    setIsSidebarOpen(false);
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans relative overflow-hidden">
      
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] animate-in fade-in duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="p-8 bg-slate-900 text-white">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black italic">D&G</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/10 rounded-xl"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-xl font-bold">{currentUser.name[0]}</div>
                <div>
                  <p className="font-bold">{currentUser.name}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Operador Logístico</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Preparados" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="En Despacho" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<PlusSquare size={20}/>} label="Nueva Carga Manual" active={view === 'NEW_ORDER_MANUAL'} onClick={() => { setView('NEW_ORDER_MANUAL'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<ScanSearch size={20}/>} label="Carga con IA" active={view === 'GENERAL_ENTRY'} onClick={() => { setView('GENERAL_ENTRY'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial Completo" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
            </nav>

            <div className="p-4 border-t">
              <SidebarItem icon={<LogOut size={20}/>} label="Cerrar Sesión" onClick={handleLogout} danger />
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl active:scale-90 transition-transform"><Menu size={20} /></button>
        <h1 className="text-lg font-black tracking-tighter uppercase">
          <span className="text-orange-500 italic">D&G</span> Logística
        </h1>
        <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">{currentUser.name[0]}</div>
      </header>

      {/* CONTENT AREA */}
      <main className="p-5 space-y-6 animate-in fade-in duration-500">
        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="En Despacho" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Historial" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            
            <div className="space-y-3">
              <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] ml-2">Gestión de Pedidos</h3>
              <div className="grid grid-cols-2 gap-3">
                <QuickActionBtn icon={<PlusSquare className="text-orange-500"/>} label="Carga Manual" onClick={() => setView('NEW_ORDER_MANUAL')} />
                <QuickActionBtn icon={<ScanSearch className="text-teal-500"/>} label="Escaneo IA" onClick={() => setView('GENERAL_ENTRY')} />
              </div>
            </div>

            {/* SECCIÓN DE CONSOLIDACIÓN RÁPIDA */}
            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
               <div className="flex items-center gap-3 mb-4">
                 <Archive className="text-indigo-500" size={20} />
                 <h4 className="font-black text-xs uppercase tracking-widest text-slate-700">Consolidación Masiva</h4>
               </div>
               <p className="text-[10px] text-slate-400 font-bold mb-4">Archiva todos los pedidos despachados de un cliente a la vez.</p>
               <div className="space-y-2">
                 {Array.from(new Set(orders.filter(o => o.status === OrderStatus.DISPATCHED).map(o => o.customerName))).slice(0, 3).map(client => (
                   <button key={client} onClick={() => handleArchiveClientOrders(client)} className="w-full flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                     <span className="text-[11px] font-black uppercase text-slate-600">{client}</span>
                     <ChevronRight size={14} className="text-slate-300"/>
                   </button>
                 ))}
                 {orders.filter(o => o.status === OrderStatus.DISPATCHED).length === 0 && (
                   <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">Sin pedidos para consolidar</p>
                 )}
               </div>
            </div>
          </div>
        )}

        {(view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><ArrowLeft size={14}/> Dashboard</button>
              <h2 className="font-black text-xs text-slate-500 uppercase tracking-widest">{view}</h2>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por cliente, localidad o nº..." 
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:border-teal-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm uppercase">No hay pedidos registrados</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                ))
              )}
            </div>
          </div>
        )}

        {view === 'NEW_ORDER_MANUAL' && <NewOrderManual onAdd={addOrder} onBack={() => setView('DASHBOARD')} currentUser={currentUser} />}
        {view === 'GENERAL_ENTRY' && <GeneralEntryView onAdd={addOrder} onBack={() => setView('DASHBOARD')} currentUser={currentUser} />}
      </main>

      {/* FOOTER NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <NavBtn icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <NavBtn icon={<ClipboardList />} active={view === 'PENDING'} onClick={() => setView('PENDING')} />
        <NavBtn icon={<Truck />} active={view === 'DISPATCHED'} onClick={() => setView('DISPATCHED')} />
        <NavBtn icon={<History />} active={view === 'ALL'} onClick={() => setView('ALL')} />
      </nav>

      {/* MODAL DETALLES */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}

// --- COMPONENTES SECUNDARIOS ---

function SidebarItem({ icon, label, active, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-teal-50 text-teal-600' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />}
    </button>
  );
}

function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-6 rounded-[32px] text-white flex flex-col justify-between h-44 text-left shadow-xl shadow-${color.split('-')[1]}-500/20 active:scale-95 transition-all group overflow-hidden relative`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">{React.cloneElement(icon, { size: 100 })}</div>
      <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon, { size: 20 })}</div>
      <div>
        <h3 className="text-4xl font-black mb-1">{count}</h3>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
    </button>
  );
}

function QuickActionBtn({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white p-5 rounded-[28px] border-2 border-slate-100 flex items-center gap-4 shadow-sm active:scale-95 transition-all">
      <div className="bg-slate-50 p-3 rounded-2xl">{icon}</div>
      <span className="font-black text-[11px] uppercase text-slate-700">{label}</span>
    </button>
  );
}

function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all relative ${active ? 'text-teal-500 bg-teal-50' : 'text-slate-300 hover:text-slate-400'}`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />}
    </button>
  );
}

function OrderCard({ order, onClick }: { order: Order, onClick: () => void }) {
  const totalBultos = (order.detailedPackaging || []).reduce((acc, curr) => acc + curr.quantity, 0);
  return (
    <div onClick={onClick} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:border-teal-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2">
          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">C: {order.customerNumber || 'S/N'}</span>
          <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg uppercase">#{order.orderNumber}</span>
        </div>
        <span className={`text-[8px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' : 
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
        }`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-lg mb-2">{order.customerName}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          <MapPin size={12} className="text-slate-300" /> {order.locality || 'General'}
        </div>
        {totalBultos > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            <Box size={12} /> {totalBultos} BULTOS
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate, onDelete }: any) {
  const [activeTab, setActiveTab] = useState<'items' | 'packaging' | 'timeline'>('items');
  const [newPkg, setNewPkg] = useState({ deposit: DEPOSITS[0], type: PACKAGE_TYPES[0], quantity: 1 });

  const advanceStatus = () => {
    const statuses = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
    const currentIndex = statuses.indexOf(order.status);
    if (currentIndex < statuses.length - 1) {
      onUpdate({ ...order, status: statuses[currentIndex + 1] });
      if (statuses[currentIndex + 1] === OrderStatus.ARCHIVED) onClose();
    }
  };

  const addPkgEntry = () => {
    const entry: PackagingEntry = { id: Date.now().toString(), ...newPkg };
    onUpdate({ ...order, detailedPackaging: [...(order.detailedPackaging || []), entry] });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500">
        
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="font-black text-2xl text-slate-800 tracking-tight">{order.customerName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest">Nº {order.customerNumber || 'S/N'}</span>
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{order.orderNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border shadow-sm rounded-2xl active:scale-90 transition-transform"><X size={20}/></button>
        </div>

        <div className="flex p-2 bg-slate-100/50 mx-6 mt-4 rounded-2xl">
          <TabBtn active={activeTab === 'items'} label="Artículos" onClick={() => setActiveTab('items')} />
          <TabBtn active={activeTab === 'packaging'} label="Empaque" onClick={() => setActiveTab('packaging')} />
          <TabBtn active={activeTab === 'timeline'} label="Seguimiento" onClick={() => setActiveTab('timeline')} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {activeTab === 'items' && (
            <div className="space-y-3">
              {order.items.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl">
                   <p className="text-[10px] font-black text-slate-300 uppercase">Sin artículos registrados</p>
                </div>
              ) : (
                order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="bg-white px-3 py-1 rounded-xl text-xs font-black border shadow-sm">x{item.quantity}</span>
                  </div>
                ))
              )}
              <div className="p-6 bg-slate-50 rounded-[32px] mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</p>
                <p className="text-xs font-medium text-slate-600">{order.notes || "Sin observaciones adicionales."}</p>
              </div>
            </div>
          )}

          {activeTab === 'packaging' && (
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-[32px] space-y-4 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nuevo Bulto</p>
                <div className="grid grid-cols-2 gap-3">
                  <select className="bg-white/10 p-4 rounded-2xl text-xs font-bold border-none outline-none" value={newPkg.deposit} onChange={e => setNewPkg({...newPkg, deposit: e.target.value})}>
                    {DEPOSITS.map(d => <option key={d} value={d} className="text-slate-800">Dep. {d}</option>)}
                  </select>
                  <select className="bg-white/10 p-4 rounded-2xl text-xs font-bold border-none outline-none" value={newPkg.type} onChange={e => setNewPkg({...newPkg, type: e.target.value})}>
                    {PACKAGE_TYPES.map(t => <option key={t} value={t} className="text-slate-800">{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" className="flex-1 bg-white/10 p-4 rounded-2xl text-xs font-bold outline-none" value={newPkg.quantity} onChange={e => setNewPkg({...newPkg, quantity: parseInt(e.target.value) || 1})} />
                  <button onClick={addPkgEntry} className="bg-teal-500 p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24}/></button>
                </div>
              </div>
              <div className="space-y-3">
                {(order.detailedPackaging || []).map((entry: any) => (
                  <div key={entry.id} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px]">{entry.deposit}</div>
                      <p className="font-black text-sm text-slate-800">{entry.quantity} {entry.type}(S)</p>
                    </div>
                    <button onClick={() => onUpdate({ ...order, detailedPackaging: order.detailedPackaging.filter((e: any) => e.id !== entry.id) })} className="text-red-400 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
             <div className="p-4 space-y-8 relative">
                <div className="absolute left-10 top-10 bottom-10 w-1 bg-slate-100 rounded-full" />
                <TimelineStep status="INGRESADO" active={true} done={true} date={new Date(order.createdAt).toLocaleDateString()} />
                <TimelineStep status="PREPARADO" active={order.status !== OrderStatus.PENDING} done={order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.ARCHIVED} />
                <TimelineStep status="DESPACHADO" active={order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.ARCHIVED} done={order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.ARCHIVED} />
                <TimelineStep status="FINALIZADO" active={order.status === OrderStatus.ARCHIVED} done={order.status === OrderStatus.ARCHIVED} />
             </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 space-y-3">
          <button onClick={advanceStatus} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
            {order.status === OrderStatus.PENDING ? 'PASAR A PREPARADO' : order.status === OrderStatus.COMPLETED ? 'PASAR A DESPACHO' : 'FINALIZAR Y ARCHIVAR'}
            <ChevronRight size={20}/>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"><Share2 size={16}/> Enviar Status</button>
            <button onClick={() => onDelete(order.id)} className="bg-red-50 text-red-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"><Trash2 size={16}/> Borrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ status, active, done, date }: any) {
  return (
    <div className="flex items-center gap-6 relative z-10">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 ${done ? 'bg-teal-500 border-teal-100 text-white' : active ? 'bg-white border-teal-500 text-teal-500' : 'bg-white border-slate-100 text-slate-200'}`}>
          {done ? <Check size={20} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-current" />}
       </div>
       <div>
         <p className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-slate-800' : 'text-slate-300'}`}>{status}</p>
         {date && <p className="text-[9px] font-bold text-slate-400 mt-1">{date}</p>}
       </div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}>
      {label}
    </button>
  );
}

function NewOrderManual({ onAdd, onBack, currentUser }: any) {
  const [custNum, setCustNum] = useState('');
  const [customer, setCustomer] = useState('');
  const [locality, setLocality] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!customer || !custNum) return alert("Nro de Cliente y Nombre son obligatorios");
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: `DG-${Math.floor(Math.random() * 9000) + 1000}`,
      customerNumber: custNum,
      customerName: customer.toUpperCase(),
      locality: locality.toUpperCase(),
      status: OrderStatus.PENDING,
      items: [],
      packaging: { bultos: 0, cajas: 0, bolsas: 0 },
      createdAt: new Date().toISOString(),
      source: 'Manual',
      reviewer: currentUser.name,
      notes: notes
    };
    onAdd(newOrder);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl"><ArrowLeft size={20}/></button>
        <h2 className="font-black text-xl uppercase italic">Nueva Carga</h2>
      </div>
      <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 space-y-5 shadow-sm">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nro de Cliente</label>
          <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-teal-500" placeholder="Ej: 1450" value={custNum} onChange={e => setCustNum(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre / Razón Social</label>
          <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-teal-500" placeholder="Ej: BAZAR AVENIDA" value={customer} onChange={e => setCustomer(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Localidad</label>
          <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-teal-500" placeholder="Ej: FIRMAT" value={locality} onChange={e => setLocality(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Observaciones</label>
          <textarea className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-teal-500 min-h-[100px] resize-none" placeholder="Escribir aquí notas o artículos..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <button onClick={submit} className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">CREAR E INGRESAR</button>
    </div>
  );
}

function GeneralEntryView({ onAdd, onBack, currentUser }: any) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    const data = await analyzeOrderText(text);
    if (data) setResult(data);
    setIsAnalyzing(false);
  };

  const confirm = () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: `IA-${Math.floor(Math.random() * 900) + 100}`,
      customerName: result.customerName.toUpperCase(),
      locality: 'GRAL',
      status: OrderStatus.PENDING,
      items: result.items.map((it: any, i: number) => ({ id: i.toString(), name: it.name.toUpperCase(), quantity: it.quantity })),
      packaging: { bultos: 0, cajas: 0, bolsas: 0 },
      createdAt: new Date().toISOString(),
      source: 'WhatsApp',
      reviewer: currentUser.name
    };
    onAdd(newOrder);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl"><ArrowLeft size={20}/></button>
        <h2 className="font-black text-xl uppercase italic">Escaneo IA</h2>
      </div>
      {!result ? (
        <div className="space-y-4">
          <textarea className="w-full bg-white p-6 rounded-[32px] border-2 border-slate-100 min-h-[300px] text-sm font-medium outline-none focus:border-teal-500 transition-all shadow-sm" placeholder="Pega el texto del pedido aquí..." value={text} onChange={e => setText(e.target.value)} />
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-teal-500 text-white py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
            {isAnalyzing ? <Loader2 className="animate-spin"/> : <><ScanSearch size={24}/> ANALIZAR PEDIDO</>}
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="bg-teal-50 p-8 rounded-[40px] border-2 border-teal-100 space-y-4">
            <h3 className="text-2xl font-black text-slate-800">{result.customerName}</h3>
            <ul className="space-y-2">
              {result.items.map((it: any, i: number) => (
                <li key={i} className="flex justify-between text-xs font-bold text-slate-600 bg-white/50 p-2 rounded-lg">
                  <span>{it.name}</span>
                  <span className="font-black text-teal-600">x{it.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setResult(null)} className="bg-white border text-slate-400 py-5 rounded-3xl font-black uppercase text-[10px]">Reintentar</button>
            <button onClick={confirm} className="bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginModal({ onLogin, onClientPortal }: any) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[56px] p-12 text-center space-y-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-teal-500" />
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic">D<span className="text-orange-500">&</span>G</h1>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 p-6 rounded-[24px] text-center font-bold uppercase outline-none border-2 border-transparent focus:border-teal-500 transition-all" placeholder="Operador" value={name} onChange={e => setName(e.target.value)} />
          <button onClick={() => onLogin({ name: name || 'Invitado', role: 'admin' })} className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-widest shadow-2xl active:scale-95">Entrar</button>
        </div>
        <button onClick={onClientPortal} className="text-[10px] font-black text-teal-600 uppercase tracking-widest border-b border-teal-600/20 pb-1">Seguir mi pedido</button>
      </div>
    </div>
  );
}

function CustomerPortal({ onBack, orders }: any) {
  const [search, setSearch] = useState('');
  const results = orders.filter((o: any) => o.customerName.toLowerCase().includes(search.toLowerCase()) || (o.customerNumber || '').includes(search));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-10"><ArrowLeft size={16}/> Volver</button>
      <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Mis Pedidos</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">D&G Logística - Seguimiento</p>
      <input className="w-full bg-white p-6 rounded-[28px] shadow-sm border-2 border-slate-100 outline-none focus:border-teal-500 font-bold mb-8" placeholder="Nº de pedido o nombre..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="space-y-6">
        {results.map((o: any) => (
          <div key={o.id} className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-50">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-xl uppercase">#{o.orderNumber}</span>
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{o.status}</span>
            </div>
            <h4 className="font-black text-2xl mb-6 text-slate-800">{o.customerName}</h4>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div className={`h-full bg-teal-500 transition-all duration-1000 ${o.status === OrderStatus.PENDING ? 'w-1/4' : o.status === OrderStatus.COMPLETED ? 'w-1/2' : o.status === OrderStatus.DISPATCHED ? 'w-3/4' : 'w-full'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INITIAL_ORDERS: Order[] = [
  { id: '1', orderNumber: 'DG-1025', customerNumber: '1450', customerName: 'DISTRIBUIDORA GARCÍA', locality: 'FIRMAT', status: OrderStatus.PENDING, items: [], packaging: { bolsas: 0, bultos: 0, cajas: 0 }, createdAt: new Date().toISOString(), source: 'Manual', reviewer: 'Sistema' }
];

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, MapPin, 
  Plus, Check, LogOut, MessageCircle, 
  Activity, Layers, Package, Lock, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { Order, OrderStatus, View } from './types';
import { supabase } from './supabaseClient';

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'GENERAL'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'BULTO', 'PACK'];
const DELIVERY_CATEGORIES = ['VIAJANTES', 'VENDEDORES', 'TRANSPORTE', 'COMISIONISTA', 'RETIRO PERSONAL', 'EXPRESO'];
const VIAJANTES_LIST = ['MATÍAS', 'NICOLÁS'];
const VENDEDORES_LIST = ['MAURO', 'GUSTAVO'];

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
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
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error cargando órdenes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const channels = supabase.channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

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
    total: orders.filter(o => o.status === OrderStatus.ARCHIVED || o.status === OrderStatus.DISPATCHED).length
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
      o.customerNumber.includes(lowSearch) ||
      o.locality.toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    const { error } = await supabase.from('orders').update(updatedOrder).eq('id', updatedOrder.id);
    if (error) alert("Error al actualizar");
    setSelectedOrder(updatedOrder);
    fetchOrders();
  };

  const handleBatchUpdate = async (customerNumber: string, nextStatus: OrderStatus) => {
    await supabase.from('orders').update({ status: nextStatus }).eq('customerNumber', customerNumber).not('status', 'eq', OrderStatus.ARCHIVED);
    fetchOrders();
  };

  const handleDeleteOrder = async (id: string) => {
    await supabase.from('orders').delete().eq('id', id);
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleAddOrder = async (newOrder: Partial<Order>) => {
    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      alert("Error al guardar pedido");
    } else {
      setIsNewOrderModalOpen(false);
      setView('PENDING');
      fetchOrders();
    }
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientAccess={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans relative overflow-x-hidden">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]">
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
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
              <SidebarItem icon={<ClipboardList size={20}/>} label="Pendientes de Carga" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 size={20}/>} label="Carga Preparada" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck size={20}/>} label="En Despacho" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-4" />
              <SidebarItem icon={<PlusSquare size={20}/>} label="CARGA DE ENVÍO" onClick={() => { setIsNewOrderModalOpen(true); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Activity size={20}/>} label="Seguimiento de Pedido" active={view === 'TRACKING'} onClick={() => { setView('TRACKING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial de Archivo" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
            </nav>
            <div className="p-4 border-t mt-auto">
               <SidebarItem icon={<LogOut size={20}/>} label="Salir" onClick={() => setCurrentUser(null)} danger />
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl"><Menu size={20} /></button>
        <h1 className="text-lg font-black tracking-tighter uppercase italic">D&G <span className="text-orange-500">Logistics</span></h1>
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="En Despacho" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Histórico" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            
            <button 
              onClick={() => setIsNewOrderModalOpen(true)}
              className="w-full bg-slate-900 text-white p-6 rounded-[32px] flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 bg-white/10 text-orange-500 rounded-2xl flex items-center justify-center">
                <PlusSquare size={24} />
              </div>
              <div className="text-left">
                <h4 className="font-black text-white uppercase tracking-tighter text-sm">CARGA DE ENVÍO</h4>
                <p className="text-[10px] font-bold text-slate-400">Ingreso manual de nueva orden</p>
              </div>
              <ChevronRight className="ml-auto text-slate-500" />
            </button>
          </div>
        )}

        {!isLoading && (view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><ArrowLeft size={14}/> Dashboard</button>
              <h2 className="font-black text-xs text-slate-500 uppercase tracking-widest">{view}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 text-sm font-bold outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} allOrders={orders} />
              )) : (
                <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase">No hay pedidos registrados</p>
              )}
            </div>
          </div>
        )}

        {view === 'TRACKING' && <TrackingInternalView orders={orders} onBack={() => setView('DASHBOARD')} onSelectOrder={setSelectedOrder} />}
      </main>

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[600] flex items-center justify-center p-5">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"><X/></button>
            <NewOrderForm 
              onAdd={handleAddOrder} 
              onBack={() => setIsNewOrderModalOpen(false)} 
              reviewer={currentUser?.name || 'Sistema'} 
            />
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={handleUpdateOrder}
          allOrders={orders}
          onBatchUpdate={handleBatchUpdate}
          onDelete={handleDeleteOrder}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[32px] shadow-lg z-40">
        <NavBtn icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <NavBtn icon={<Activity />} active={view === 'TRACKING'} onClick={() => setView('TRACKING')} />
        <NavBtn icon={<ClipboardList />} active={view === 'PENDING'} onClick={() => setView('PENDING')} />
        <NavBtn icon={<Truck />} active={view === 'DISPATCHED'} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

// COMPONENTES DE APOYO

function NewOrderForm({ onAdd, onBack, reviewer }: any) {
  const [form, setForm] = useState({ orderNumber: '', nro: '', name: '', locality: '', notes: '' });
  const submit = () => {
    if(!form.orderNumber || !form.nro || !form.name) return alert("Faltan datos obligatorios");
    onAdd({
      orderNumber: form.orderNumber.toUpperCase(),
      customerNumber: form.nro,
      customerName: form.name.toUpperCase(),
      locality: form.locality.toUpperCase() || 'GENERAL',
      status: OrderStatus.PENDING,
      notes: form.notes, 
      createdAt: new Date().toISOString(),
      source: 'Manual',
      reviewer
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-black text-2xl uppercase italic tracking-tighter text-slate-800">Carga de Envío</h2>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nuevo ingreso a logística</p>
      </div>
      <div className="space-y-4">
        <Input label="N° DE ORDEN" value={form.orderNumber} onChange={(v:string)=>setForm({...form, orderNumber: v})} placeholder="Ej: 5542" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nº de Cliente" value={form.nro} onChange={(v:string)=>setForm({...form, nro: v})} placeholder="1450" />
          <Input label="Localidad" value={form.locality} onChange={(v:string)=>setForm({...form, locality: v})} placeholder="FIRMAT" />
        </div>
        <Input label="Razón Social" value={form.name} onChange={(v:string)=>setForm({...form, name: v})} placeholder="Nombre completo del comercio" />
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Notas / Transporte</label>
          <textarea className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-teal-500 outline-none" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Instrucciones especiales..." />
        </div>
      </div>
      <button onClick={submit} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">INGRESAR A LOGÍSTICA</button>
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
    <button onClick={onClick} className={`${color} p-6 rounded-[32px] text-white flex flex-col justify-between h-40 text-left shadow-lg active:scale-95 transition-all overflow-hidden relative`}>
      <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(icon as React.ReactElement, { size: 90 })}</div>
      <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon as React.ReactElement, { size: 16 })}</div>
      <div>
        <h3 className="text-3xl font-black">{count}</h3>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
    </button>
  );
}

function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'text-teal-500 bg-teal-50' : 'text-slate-300'}`}>
      {React.cloneElement(icon, { size: 24 })}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function OrderCard({ order, onClick, allOrders }: any) {
  const isGrouped = allOrders.filter((o:any) => o.customerNumber === order.customerNumber && o.status !== OrderStatus.ARCHIVED).length > 1;
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-[32px] border-2 shadow-sm relative overflow-hidden cursor-pointer ${isGrouped ? 'border-teal-500/20' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">ORDEN</span>
          <span className="text-[10px] font-black text-teal-600">#{order.orderNumber}</span>
        </div>
        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' :
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
          order.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
        }`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-sm mb-1">{order.customerName}</h3>
      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
        <MapPin size={10} /> {order.locality}
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate, allOrders, onBatchUpdate, onDelete }: any) {
  const [tab, setTab] = useState<'log' | 'info'>('log');
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[48px] p-8 shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors"><X/></button>
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 leading-tight">{order.customerName}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.orderNumber} - {order.locality}</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase">Estado</span>
             <span className="text-[10px] font-black text-teal-600 uppercase">{order.status}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <span className="text-[9px] font-black text-slate-400 uppercase">Instrucciones / Notas</span>
             <p className="text-xs font-bold text-slate-800 mt-1">{order.notes || "Sin notas adicionales"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => {
              const statuses = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
              const next = statuses[statuses.indexOf(order.status) + 1];
              if(next) onUpdate({...order, status: next});
              onClose();
            }}
            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
          >
            Avanzar Etapa <ChevronRight size={16}/>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { if(confirm("¿Eliminar pedido?")) { onDelete(order.id); onClose(); } }} className="py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase border border-red-100">Eliminar</button>
            <button onClick={onClose} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingInternalView({ orders, onBack, onSelectOrder }: any) {
  const [q, setQ] = useState('');
  const results = orders.filter((o:any) => 
    o.customerName.toLowerCase().includes(q.toLowerCase()) || 
    o.orderNumber.includes(q)
  );
  return (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><ArrowLeft size={14}/> Atrás</button>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          className="w-full bg-white border-2 border-slate-100 p-4 pl-12 rounded-3xl text-sm font-bold outline-none focus:border-teal-500" 
          placeholder="Buscar cliente o Nº..." 
          value={q} 
          onChange={e=>setQ(e.target.value)} 
        />
      </div>
      <div className="space-y-3">
        {results.map((o:any) => <OrderCard key={o.id} order={o} onClick={() => onSelectOrder(o)} allOrders={orders} />)}
      </div>
    </div>
  );
}

function LoginModal({ onLogin, onClientAccess }: any) {
  const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center space-y-8 animate-in zoom-in duration-300 shadow-2xl">
        <h1 className="text-5xl font-black italic">D<span className="text-orange-500">&</span>G</h1>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 p-5 rounded-3xl text-center font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all" placeholder="Nombre Operador" value={n} onChange={e=>setN(e.target.value)} />
          <button onClick={()=>onLogin({name:n||'INVITADO'})} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase shadow-xl tracking-widest text-xs">Entrar al Sistema</button>
        </div>
        <button onClick={onClientAccess} className="text-[10px] font-black text-teal-600 uppercase w-full tracking-widest hover:underline transition-all">Seguimiento de Clientes</button>
      </div>
    </div>
  );
}

function CustomerPortal({ onBack, orders }: any) {
  const [s, setS] = useState('');
  const r = orders.filter((o:any) => (o.customerName.toLowerCase().includes(s.toLowerCase()) || o.customerNumber.includes(s)) && o.status !== OrderStatus.ARCHIVED);
  
  return (
    <div className="p-6 space-y-6 max-w-md mx-auto min-h-screen bg-slate-50">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm"><ArrowLeft/></button>
        <h2 className="text-2xl font-black italic">Seguimiento</h2>
      </header>
      <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 space-y-4 shadow-sm">
        <h3 className="font-black text-lg">Consulta tu pedido</h3>
        <input className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-teal-500 outline-none font-bold" placeholder="Tu nombre o Nº de cliente..." value={s} onChange={e=>setS(e.target.value)} />
      </div>
      <div className="space-y-4">
        {s.length > 2 && r.map((o:any) => (
          <div key={o.id} className="bg-white p-8 rounded-[40px] shadow-lg border-2 border-slate-50 animate-in fade-in slide-in-from-bottom duration-300">
            <h4 className="font-black text-xl mb-2 text-slate-800 uppercase italic tracking-tighter">{o.customerName}</h4>
            <div className="flex flex-col mb-4">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado de tu envío</span>
              <span className={`text-sm font-black uppercase mt-1 ${
                o.status === OrderStatus.PENDING ? 'text-orange-600' :
                o.status === OrderStatus.COMPLETED ? 'text-emerald-600' : 'text-indigo-600'
              }`}>{o.status}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">Orden: #{o.orderNumber}</span>
              <button className="text-teal-600 font-black text-[10px] uppercase tracking-widest">Ver Detalles</button>
            </div>
          </div>
        ))}
        {s.length > 2 && r.length === 0 && (
          <p className="text-center text-slate-400 font-bold text-xs py-10">No se encontró información para tu búsqueda</p>
        )}
      </div>
    </div>
  );
}

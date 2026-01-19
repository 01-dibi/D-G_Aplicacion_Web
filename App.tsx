
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, Box, Share2, MapPin, 
  Plus, Check, LogOut, Settings, MessageCircle, Phone, Navigation,
  Activity, Layers, Package, User, Info, Lock, AlertTriangle, RefreshCcw,
  FileDown, FileSpreadsheet, FileJson
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry } from './types.ts';

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
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('dg_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error al cargar usuario:", e);
      return null;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('dg_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch (e) {
      console.error("Error al cargar pedidos:", e);
      return INITIAL_ORDERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('dg_orders', JSON.stringify(orders));
  }, [orders]);

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
    if (view === 'ALL') base = orders.filter(o => o.status === OrderStatus.ARCHIVED || o.status === OrderStatus.DISPATCHED);
    
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      o.customerName.toLowerCase().includes(lowSearch) || 
      o.customerNumber.includes(lowSearch) ||
      o.locality.toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
  };

  const handleBatchUpdate = (customerNumber: string, nextStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.customerNumber === customerNumber && o.status !== OrderStatus.ARCHIVED) {
        return { ...o, status: nextStatus };
      }
      return o;
    }));
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    setSelectedOrder(null);
  };

  const handleExportData = (format: 'CSV' | 'JSON') => {
    if (orders.length === 0) return;
    const data = orders.map(o => ({
      ID: o.id,
      Orden: o.orderNumber,
      ClienteNum: o.customerNumber,
      ClienteNombre: o.customerName,
      Localidad: o.locality,
      Estado: o.status,
      Bultos: (o.detailedPackaging || []).reduce((acc, p) => acc + p.quantity, 0),
      Transporte: o.carrier || 'N/A',
      Fecha: o.createdAt,
      Operador: o.reviewer
    }));

    let blob;
    let filename = `reporte_dg_logistica_${new Date().toISOString().split('T')[0]}`;

    if (format === 'CSV') {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
      const csvContent = [headers, ...rows].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      filename += '.csv';
    } else {
      blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
      filename += '.json';
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setShowExportModal(false);
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} orders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientAccess={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans relative">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] animate-in fade-in duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-left">
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
              <SidebarItem icon={<PlusSquare size={20}/>} label="CARGA DE ENVÍO" active={view === 'NEW_ORDER_MANUAL'} onClick={() => { setView('NEW_ORDER_MANUAL'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Activity size={20}/>} label="Seguimiento de Pedido" active={view === 'TRACKING'} onClick={() => { setView('TRACKING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History size={20}/>} label="Historial de Archivo" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
              
              <SidebarItem 
                icon={<FileDown size={20}/>} 
                label="Descargar Reporte" 
                onClick={() => { setShowExportModal(true); setIsSidebarOpen(false); }} 
              />
            </nav>
            <div className="p-4 border-t">
               <SidebarItem icon={<LogOut size={20}/>} label="Salir" onClick={() => setCurrentUser(null)} danger />
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[40px] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <FileDown size={32} />
              </div>
              <h3 className="font-black text-xl text-slate-800 uppercase italic">Exportar Datos</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecciona el formato de descarga</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleExportData('CSV')}
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl flex items-center gap-4 hover:border-teal-500 transition-all active:scale-95 group"
              >
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs text-slate-700">Excel (CSV)</p>
                  <p className="text-[9px] font-bold text-slate-400">Hoja de cálculo</p>
                </div>
              </button>

              <button 
                onClick={() => handleExportData('JSON')}
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl flex items-center gap-4 hover:border-teal-500 transition-all active:scale-95 group"
              >
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <FileJson size={20} />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs text-slate-700">JSON Data</p>
                  <p className="text-[9px] font-bold text-slate-400">Archivo de sistema</p>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setShowExportModal(false)}
              className="w-full py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-xl"><Menu size={20} /></button>
        <h1 className="text-lg font-black tracking-tighter uppercase italic">D&G <span className="text-orange-500">Logistics</span></h1>
        <div className="w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">{currentUser.name[0]}</div>
      </header>

      <main className="p-5 space-y-6">
        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="Pendientes" color="bg-orange-500" icon={<ClipboardList />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="Preparados" color="bg-emerald-600" icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.dispatched} label="En Despacho" color="bg-indigo-600" icon={<Truck />} onClick={() => setView('DISPATCHED')} />
              <StatCard count={stats.total} label="Histórico" color="bg-slate-700" icon={<History />} onClick={() => setView('ALL')} />
            </div>
            
            <button 
              onClick={() => setView('NEW_ORDER_MANUAL')}
              className="w-full bg-slate-900 text-white p-6 rounded-[32px] flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all border-b-4 border-slate-950"
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

        {(view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><ArrowLeft size={14}/> Dashboard</button>
              <h2 className="font-black text-xs text-slate-500 uppercase tracking-widest">
                {view === 'ALL' ? 'HISTORIAL DE ARCHIVO' : view}
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, número o localidad..." 
                className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <p className="text-center py-20 text-slate-300 font-bold uppercase text-xs">No hay envíos en esta sección</p>
              ) : (
                filteredOrders.map(order => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} allOrders={orders} />
                ))
              )}
            </div>
          </div>
        )}

        {view === 'TRACKING' && (
          <TrackingInternalView 
            orders={orders} 
            onBack={() => setView('DASHBOARD')} 
            onSelectOrder={setSelectedOrder}
          />
        )}

        {view === 'NEW_ORDER_MANUAL' && (
          <NewOrderForm 
            onAdd={(o: Order) => { setOrders([o, ...orders]); setView('PENDING'); }} 
            onBack={() => setView('DASHBOARD')} 
            reviewer={currentUser?.name || 'Sistema'} 
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[32px] shadow-lg z-40">
        <NavBtn icon={<LayoutDashboard />} active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <NavBtn icon={<Activity />} active={view === 'TRACKING'} onClick={() => setView('TRACKING')} />
        <NavBtn icon={<ClipboardList />} active={view === 'PENDING'} onClick={() => setView('PENDING')} />
        <NavBtn icon={<Truck />} active={view === 'DISPATCHED'} onClick={() => setView('DISPATCHED')} />
      </nav>

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
    </div>
  );
}

// --- VISTA DE SEGUIMIENTO INTERNA ---

function TrackingInternalView({ orders, onBack, onSelectOrder }: { orders: Order[], onBack: () => void, onSelectOrder: (o: Order) => void }) {
  const [search, setSearch] = useState('');
  const results = orders.filter(o => 
    o.customerName.toLowerCase().includes(search.toLowerCase()) || 
    o.customerNumber.includes(search) ||
    o.orderNumber.includes(search)
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-right">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border rounded-2xl shadow-sm"><ArrowLeft size={20}/></button>
        <h2 className="font-black text-xl italic uppercase text-slate-800">Seguimiento</h2>
      </div>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-slate-100">
         <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
           <input 
             className="w-full bg-slate-50 p-5 rounded-2xl pl-12 text-sm font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all" 
             placeholder="Nombre del cliente o Nº pedido..." 
             value={search} 
             onChange={e=>setSearch(e.target.value)} 
           />
         </div>
      </div>
      <div className="space-y-3">
        {search.length > 1 && results.map(o => (
          <button 
            key={o.id} 
            onClick={() => onSelectOrder(o)}
            className="w-full bg-white p-5 rounded-[24px] border-2 border-slate-100 flex justify-between items-center text-left"
          >
            <div>
              <div className="flex gap-4 mb-3">
                 <div className="flex flex-col">
                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">N° CLIENTE</span>
                   <span className="text-[10px] font-black text-slate-600 uppercase">{o.customerNumber}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[7px] font-black text-teal-400 uppercase tracking-tighter leading-none mb-0.5">N° ORDEN</span>
                   <span className="text-[10px] font-black text-teal-600 uppercase">#{o.orderNumber}</span>
                 </div>
              </div>
              <h4 className="font-black text-slate-800 text-sm">{o.customerName}</h4>
              <p className="text-[10px] font-bold text-slate-400">{o.locality}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
               <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
                  o.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' : 
                  o.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 
                  o.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{o.status}</span>
               <ChevronRight size={16} className="text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- COMPONENTES SECUNDARIOS ---

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
    <button onClick={onClick} className={`${count === 0 ? 'bg-slate-400' : color} p-6 rounded-[32px] text-white flex flex-col justify-between h-40 text-left shadow-lg active:scale-95 transition-all overflow-hidden relative`}>
      <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(icon, { size: 90 })}</div>
      <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon, { size: 16 })}</div>
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

function OrderCard({ order, onClick, allOrders }: { order: Order, onClick: () => void, allOrders: Order[] }) {
  const bultos = (order.detailedPackaging || []).reduce((a, c) => a + c.quantity, 0);
  const linkedOrders = allOrders.filter(o => o.customerNumber === order.customerNumber && o.status !== OrderStatus.ARCHIVED);
  const otherLinkedOrders = linkedOrders.filter(o => o.id !== order.id);
  const isGrouped = linkedOrders.length > 1;

  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-[32px] border-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ${isGrouped ? 'border-teal-500/20' : 'border-slate-100'}`}>
      {isGrouped && (
        <div className="absolute top-0 right-0 bg-teal-500 text-white px-3 py-1 rounded-bl-2xl flex items-center gap-1">
          <Layers size={10} />
          <span className="text-[8px] font-black uppercase">{linkedOrders.length} PEDIDOS</span>
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">N° CLIENTE</span>
            <span className="text-[10px] font-black text-slate-600">{order.customerNumber}</span>
          </div>

          <div className="flex items-end gap-2 overflow-x-auto no-scrollbar max-w-[140px]">
            {otherLinkedOrders.map(lo => (
              <div key={lo.id} className="flex flex-col shrink-0 animate-in fade-in zoom-in duration-300">
                <span className="text-[6px] font-black text-indigo-400 uppercase tracking-tighter leading-none mb-0.5">REF</span>
                <span className="text-[9px] font-black text-indigo-600">#{lo.orderNumber}</span>
              </div>
            ))}

            <div className="flex flex-col shrink-0">
              <span className="text-[7px] font-black text-teal-400 uppercase tracking-tighter leading-none mb-0.5">N° ORDEN</span>
              <span className="text-[10px] font-black text-teal-600">#{order.orderNumber}</span>
            </div>
          </div>
        </div>
        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shrink-0 ${
          order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' : 
          order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 
          order.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
        }`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-md mb-1">{order.customerName}</h3>
      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
        <MapPin size={12} className="text-slate-300" /> {order.locality}
        {bultos > 0 && <span className="ml-auto bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{bultos} BULTOS</span>}
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate, allOrders, onBatchUpdate, onDelete }: any) {
  const [tab, setTab] = useState<'logistica' | 'empaque' | 'seguimiento'>('logistica');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [newPkg, setNewPkg] = useState({ deposit: DEPOSITS[0], type: PACKAGE_TYPES[0], quantity: 1 });
  
  const [delCat, setDelCat] = useState('TRANSPORTE');
  const [delSub, setDelSub] = useState('');
  const [delManual, setDelManual] = useState(order.carrier || '');

  const isReadOnly = order.status === OrderStatus.ARCHIVED;

  const linkedOrders = useMemo(() => 
    allOrders.filter((o: Order) => o.customerNumber === order.customerNumber && o.status !== OrderStatus.ARCHIVED),
    [allOrders, order.customerNumber]
  );

  const totalConsolidatedBultos = useMemo(() => {
    const relevantOrders = allOrders.filter((o: Order) => 
      o.customerNumber === order.customerNumber && 
      (isReadOnly ? o.status === OrderStatus.ARCHIVED : o.status !== OrderStatus.ARCHIVED)
    );
    return relevantOrders.reduce((acc: number, o: Order) => {
      return acc + (o.detailedPackaging || []).reduce((sum, p) => sum + p.quantity, 0);
    }, 0);
  }, [allOrders, order.customerNumber, isReadOnly]);

  const handleDispatchUpdate = () => {
    if (isReadOnly) return;
    let finalCarrier = '';
    if (delCat === 'VIAJANTES' || delCat === 'VENDEDORES') {
      finalCarrier = `${delCat}: ${delSub}`;
    } else {
      finalCarrier = `${delCat}: ${delManual}`;
    }
    onUpdate({ ...order, carrier: finalCarrier });
  };

  const advance = () => {
    if (isReadOnly) return;
    const s = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
    const idx = s.indexOf(order.status);
    if(idx < s.length-1) {
      const nextStatus = s[idx+1];
      if (nextStatus === OrderStatus.ARCHIVED) {
        if (window.confirm("¿FINALIZAR Y ARCHIVAR LOTE?\nTodos los pedidos pendientes de este cliente pasarán al histórico.")) {
          onBatchUpdate(order.customerNumber, nextStatus);
          onClose();
        }
      } else {
        onUpdate({...order, status: nextStatus});
      }
    }
  };

  const addPackage = () => {
    if (isReadOnly) return;
    onUpdate({
      ...order, 
      detailedPackaging: [
        ...(order.detailedPackaging||[]), 
        { id: Date.now().toString(), deposit: newPkg.deposit, type: newPkg.type, quantity: newPkg.quantity }
      ]
    });
  };

  const handleStageReset = () => {
    if (order.status === OrderStatus.PENDING) {
      onUpdate({ ...order, notes: '' });
    } else if (order.status === OrderStatus.COMPLETED) {
      onUpdate({ ...order, detailedPackaging: [] });
    } else if (order.status === OrderStatus.DISPATCHED) {
      onUpdate({ ...order, carrier: '' });
    }
    setShowDeleteMenu(false);
  };

  const handleWhatsAppNotification = () => {
    const message = encodeURIComponent(
      `🔔 *D&G LOGÍSTICA - ACTUALIZACIÓN DE ESTADO*\n\n` +
      `Hola *${order.customerName}*,\n` +
      `Te informamos que tu pedido *#${order.orderNumber}* se encuentra actualmente en estado: *${order.status}*.\n\n` +
      `📍 *Destino:* ${order.locality}\n` +
      `📦 *Volumen:* ${totalConsolidatedBultos} Bultos consolidados.\n\n` +
      `Muchas gracias por confiar en D&G.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const stageResetLabel = useMemo(() => {
    if (order.status === OrderStatus.PENDING) return "Borrar Notas Iníciales";
    if (order.status === OrderStatus.COMPLETED) return "Borrar Lista de Empaque";
    if (order.status === OrderStatus.DISPATCHED) return "Borrar Datos Transporte";
    return "Borrar Datos Etapa";
  }, [order.status]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom relative">
        
        {showDeleteMenu && (
          <div className="absolute inset-0 bg-red-50/95 backdrop-blur-sm z-[400] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-200">
            <div className="bg-white p-6 rounded-[32px] shadow-xl border-2 border-red-100 w-full space-y-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-800 uppercase italic">Control de Errores</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">¿Qué acción deseas realizar sobre este pedido?</p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleStageReset}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  <RefreshCcw size={16} /> {stageResetLabel}
                </button>
                
                <button 
                  onClick={() => { if(window.confirm("¿ELIMINAR COMPLETAMENTE EL PEDIDO?\nEsta acción no se puede deshacer.")){ onDelete(order.id); } }}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                >
                  <Trash2 size={16} /> Borrado Total del Pedido
                </button>
                
                <button 
                  onClick={() => setShowDeleteMenu(false)}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {isReadOnly && (
          <div className="bg-orange-600 text-white py-2 px-8 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg relative z-10">
            <Lock size={14} strokeWidth={3} /> Registro Archivado - Solo Lectura
          </div>
        )}

        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className={`font-black text-2xl text-slate-800 leading-tight ${isReadOnly ? 'opacity-50' : ''}`}>{order.customerName}</h2>
            <div className="flex gap-4 mt-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">N° CLIENTE</span>
                <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{order.customerNumber}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest leading-none mb-1">N° ORDEN</span>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">#{order.orderNumber}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border shadow-sm rounded-2xl hover:bg-slate-50 transition-colors"><X size={20}/></button>
        </div>

        {!isReadOnly && linkedOrders.length > 1 && (
          <div className="mx-6 mt-4 p-4 bg-teal-50 rounded-3xl border border-teal-100 flex items-center gap-4">
            <Layers className="text-teal-500" size={24} />
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-teal-600 uppercase">Consolidación en Lote</h4>
              <p className="text-xs font-bold text-slate-700">{linkedOrders.length} pedidos operativos detectados.</p>
            </div>
          </div>
        )}

        <div className="flex p-2 bg-slate-100/50 mx-6 mt-4 rounded-2xl">
          <button onClick={()=>setTab('logistica')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${tab==='logistica'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>Despacho</button>
          <button onClick={()=>setTab('empaque')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${tab==='empaque'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>Empaque</button>
          <button onClick={()=>setTab('seguimiento')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${tab==='seguimiento'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>Seguimiento</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {tab === 'logistica' && (
            <div className="space-y-4">
              <div className={`p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 relative ${isReadOnly ? 'grayscale opacity-50' : ''}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Sistema de Despacho Inteligente</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Categoría</label>
                      <select 
                        disabled={isReadOnly}
                        className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
                        value={delCat}
                        onChange={(e) => { 
                          setDelCat(e.target.value); 
                          setDelSub(e.target.value === 'VIAJANTES' ? VIAJANTES_LIST[0] : e.target.value === 'VENDEDORES' ? VENDEDORES_LIST[0] : '');
                        }}
                      >
                        {DELIVERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {delCat === 'VIAJANTES' || delCat === 'VENDEDORES' ? (
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Personal</label>
                        <select 
                          disabled={isReadOnly}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
                          value={delSub}
                          onChange={(e) => setDelSub(e.target.value)}
                        >
                          {(delCat === 'VIAJANTES' ? VIAJANTES_LIST : VENDEDORES_LIST).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Detalle Manual</label>
                        <input 
                          disabled={isReadOnly}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
                          value={delManual}
                          onChange={(e) => setDelManual(e.target.value)}
                          placeholder="Nombre/Empresa..."
                        />
                      </div>
                    )}
                  </div>
                  
                  {!isReadOnly && (
                    <button 
                      onClick={handleDispatchUpdate}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Confirmar Transporte
                    </button>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <p className="text-[8px] font-black text-slate-300 uppercase mb-2">Asignación Actual:</p>
                  <div className="p-3 bg-white rounded-xl border border-dashed flex items-center gap-3">
                    <Truck size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">{order.carrier || "Sin asignar"}</span>
                  </div>
                </div>
              </div>
              
              <div className={`p-6 bg-slate-900 rounded-[32px] text-white transition-all ${isReadOnly ? 'opacity-50' : ''}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Volumen Consolidado</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-black">{totalConsolidatedBultos}</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Bultos totales</p>
                  </div>
                  <Package size={24} className="text-orange-500"/>
                </div>
              </div>
            </div>
          )}

          {tab === 'empaque' && (
            <div className="space-y-6">
              {!isReadOnly && (
                <div className="bg-slate-900 p-6 rounded-[32px] space-y-4 text-white shadow-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <select className="bg-white/10 p-4 rounded-2xl text-xs font-bold border-none outline-none" value={newPkg.deposit} onChange={e=>setNewPkg({...newPkg, deposit: e.target.value})}>
                      {DEPOSITS.map(d=><option key={d} value={d} className="text-slate-800">Dep. {d}</option>)}
                    </select>
                    <select className="bg-white/10 p-4 rounded-2xl text-xs font-bold border-none outline-none" value={newPkg.type} onChange={e=>setNewPkg({...newPkg, type: e.target.value})}>
                      {PACKAGE_TYPES.map(t=><option key={t} value={t} className="text-slate-800">{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <input type="number" className="flex-1 bg-white/10 p-4 rounded-2xl text-xs font-bold outline-none" value={newPkg.quantity} onChange={e=>setNewPkg({...newPkg, quantity: parseInt(e.target.value)||1})} />
                    <button onClick={addPackage} className="bg-teal-500 p-4 rounded-2xl shadow-lg hover:bg-teal-400 active:scale-95 transition-all"><Plus/></button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(order.detailedPackaging||[]).map(e=>(
                  <div key={e.id} className={`flex justify-between items-center p-4 bg-white border-2 border-slate-50 rounded-[24px] shadow-sm ${isReadOnly ? 'opacity-50 grayscale' : ''}`}>
                    <span className="font-black text-[11px] text-slate-700 uppercase">{e.quantity} {e.type} - DEP. {e.deposit}</span>
                    {!isReadOnly && <button onClick={()=>onUpdate({...order, detailedPackaging: order.detailedPackaging.filter((x:any)=>x.id!==e.id)})} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'seguimiento' && (
            <div className="p-4 space-y-8 relative">
              <div className="absolute left-10 top-10 bottom-10 w-1 bg-slate-100 rounded-full" />
              <Step status="INGRESADO" done active date={new Date(order.createdAt).toLocaleDateString()} />
              <Step status="PREPARADO" done={order.status!==OrderStatus.PENDING} active={order.status!==OrderStatus.PENDING} />
              <Step status="DESPACHADO" done={order.status===OrderStatus.DISPATCHED||order.status===OrderStatus.ARCHIVED} active={order.status===OrderStatus.DISPATCHED||order.status===OrderStatus.ARCHIVED} />
              <Step status="HISTÓRICO" done={order.status===OrderStatus.ARCHIVED} active={order.status===OrderStatus.ARCHIVED} />
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 space-y-3">
          {!isReadOnly ? (
            <button onClick={advance} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-800">
               {order.status===OrderStatus.PENDING?'PASAR A PREPARADO':order.status===OrderStatus.COMPLETED?'PASAR A DESPACHO':'FINALIZAR Y ARCHIVAR LOTE'}
               <ChevronRight size={18}/>
            </button>
          ) : (
             <div className="w-full bg-slate-900/5 text-slate-400 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-dashed border-slate-200">
                <Check size={18} strokeWidth={4}/> Pedido Archivado Correctamente
             </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleWhatsAppNotification}
              className="bg-emerald-50 text-emerald-600 border-2 border-emerald-100 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all hover:bg-emerald-100"
            >
              <MessageCircle size={14}/> WhatsApp
            </button>
            <button 
              disabled={isReadOnly}
              onClick={() => setShowDeleteMenu(true)} 
              className={`bg-red-50 text-red-600 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${isReadOnly ? 'opacity-10 grayscale cursor-not-allowed' : 'hover:bg-red-100'}`}
            >
              <Trash2 size={14}/> Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ status, active, done, date }: any) {
  return (
    <div className="flex items-center gap-6 relative z-10">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-4 transition-all duration-500 ${done?'bg-teal-500 border-teal-100 text-white':active?'border-teal-500 bg-white text-teal-500':'border-slate-100 bg-white text-slate-200'}`}>
        {done ? <Check size={18} strokeWidth={4}/> : <div className="w-2 h-2 rounded-full bg-current"/>}
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${active?'text-slate-800':'text-slate-300'}`}>{status}</p>
        {date && <p className="text-[8px] font-bold text-slate-400 mt-0.5">{date}</p>}
      </div>
    </div>
  );
}

function NewOrderForm({ onAdd, onBack, reviewer }: any) {
  const [form, setForm] = useState({ orderNumber: '', nro: '', name: '', locality: '', notes: '' });
  
  const submit = () => {
    if(!form.orderNumber || !form.nro || !form.name) return alert("Faltan datos obligatorios: Nº de Orden, Cliente y Razón Social son requeridos.");
    onAdd({
      id: Date.now().toString(),
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
    <div className="space-y-6 animate-in slide-in-from-right">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm"><ArrowLeft size={20}/></button>
        <h2 className="font-black text-xl italic uppercase tracking-tighter text-slate-800">Carga de Envío</h2>
      </div>
      <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 space-y-4">
        <Input label="N° DE ORDEN" value={form.orderNumber} onChange={(v:string)=>setForm({...form, orderNumber: v})} placeholder="Ej: 5542" />
        <Input label="Nº de Cliente" value={form.nro} onChange={(v:string)=>setForm({...form, nro: v})} placeholder="Ej: 1450" />
        <Input label="Razón Social" value={form.name} onChange={(v:string)=>setForm({...form, name: v})} placeholder="Nombre completo" />
        <Input label="Localidad" value={form.locality} onChange={(v:string)=>setForm({...form, locality: v})} placeholder="Destino" />
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Notas de Despacho</label>
          <textarea 
            className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none min-h-[100px] border-2 border-transparent focus:border-teal-500 transition-all" 
            value={form.notes} 
            onChange={e=>setForm({...form, notes: e.target.value})} 
            placeholder="Instrucciones logísticas..." 
          />
        </div>
      </div>
      <button 
        onClick={submit} 
        className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
      >
        INGRESAR A LOGÍSTICA
      </button>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function LoginModal({ onLogin, onClientAccess }: any) {
  const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center space-y-8 shadow-2xl overflow-hidden relative">
        <h1 className="text-5xl font-black italic">D<span className="text-orange-500">&</span>G</h1>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 p-5 rounded-3xl text-center font-bold uppercase outline-none border-2 border-transparent focus:border-teal-500 transition-all" placeholder="Nombre Operador" value={n} onChange={e=>setN(e.target.value)} />
          <button onClick={()=>onLogin({name:n||'INVITADO'})} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl">Entrar</button>
        </div>
        <button onClick={onClientAccess} className="text-[10px] font-black text-teal-600 uppercase tracking-widest w-full">Seguir mi pedido (Clientes)</button>
      </div>
    </div>
  );
}

function CustomerPortal({ onBack, orders }: { onBack: () => void, orders: Order[] }) {
  const [search, setSearch] = useState('');
  const results = orders.filter(o => 
    o.customerName.toLowerCase().includes(search.toLowerCase()) || 
    o.customerNumber.includes(search) ||
    o.orderNumber.includes(search)
  ).filter(o => o.status !== OrderStatus.ARCHIVED);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-6 flex flex-col no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm"><ArrowLeft size={20}/></button>
        <h2 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Seguimiento</h2>
        <div className="w-10 h-10" />
      </header>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-slate-100 space-y-4">
         <h3 className="font-black text-2xl mb-2 leading-tight">Consulta tu envío</h3>
         <input className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-teal-500 transition-all" placeholder="Nº de Cliente o Nombre..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="mt-6 space-y-4">
        {search.length > 2 && results.map(o => {
          const message = encodeURIComponent(`Hola! Consulto por el pedido ${o.orderNumber} para ${o.customerName}. Mi estado actual es ${o.status}.`);
          return (
            <div key={o.id} className="bg-white p-8 rounded-[40px] shadow-md border-2 border-slate-50 overflow-hidden relative">
              <h4 className="font-black text-2xl mb-2 text-slate-800 uppercase italic tracking-tighter">{o.customerName}</h4>
              <div className="flex flex-col mb-8">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</span>
                <span className={`text-[10px] font-black uppercase mt-1 ${o.status === OrderStatus.PENDING ? 'text-orange-600' : o.status === OrderStatus.COMPLETED ? 'text-emerald-600' : 'text-indigo-600'}`}>{o.status}</span>
              </div>
              
              <div className="py-4 space-y-8 relative mb-10 pl-2">
                <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-slate-100 rounded-full" />
                <Step status="INGRESADO" done active date={new Date(o.createdAt).toLocaleDateString()} />
                <Step status="PREPARADO" done={o.status!==OrderStatus.PENDING} active={o.status!==OrderStatus.PENDING} />
                <Step status="DESPACHADO" done={o.status===OrderStatus.DISPATCHED||o.status===OrderStatus.ARCHIVED} active={o.status===OrderStatus.DISPATCHED||o.status===OrderStatus.ARCHIVED} />
                <Step status="HISTÓRICO" done={o.status===OrderStatus.ARCHIVED} active={o.status===OrderStatus.ARCHIVED} />
              </div>

              <a href={`https://wa.me/?text=${message}`} target="_blank" className="w-full bg-emerald-500 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                <MessageCircle size={20}/> Consultar WhatsApp
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL_ORDERS: Order[] = [
  { id: '1', orderNumber: '1025', customerNumber: '1450', customerName: 'BAZAR AVENIDA', locality: 'FIRMAT', status: OrderStatus.PENDING, notes: 'Enviar por Transporte Smith.', createdAt: new Date().toISOString(), source: 'Manual', reviewer: 'Sistema' }
];

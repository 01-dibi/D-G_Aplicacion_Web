
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, MapPin, Plus, Package, Trash, Save, Check, MessageCircle, Hash, Activity, UserPlus, ArrowRight
} from 'lucide-react';
import { Order, OrderStatus, PackagingEntry } from './types.ts';

interface OrderDetailsModalProps {
  order: Order;
  allOrders: Order[];
  onClose: () => void;
  onUpdate: (updated: Order) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  isSaving: boolean;
  currentUserName?: string;
}

export default function OrderDetailsModal({ 
  order, allOrders, onClose, onUpdate, onDelete, isSaving, currentUserName 
}: OrderDetailsModalProps) {
  const isReadOnly = order.status === OrderStatus.ARCHIVED;
  
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [isAddingOrderNum, setIsAddingOrderNum] = useState(false);
  const [newCollab, setNewCollab] = useState('');
  
  const warehouses = ["Dep. E", "Dep. F:", "Dep. D1:", "Dep. D2:", "Dep. A1:", "Otros:"];
  const packageTypes = ["CAJA", "BOLSA:", "PAQUETE", "BOBINA", "OTROS:"];
  const dispatchMainTypes = ["VIAJANTES", "VENDEDORES", "TRANSPORTE", "RETIRO PERSONAL"];
  const dispatchOptions: Record<string, string[]> = {
    "VIAJANTES": ["MATÍAS", "NICOLÁS"],
    "VENDEDORES": ["MAURO", "GUSTAVO"]
  };

  const [warehouseSelection, setWarehouseSelection] = useState(order.warehouse ? (warehouses.includes(order.warehouse) ? order.warehouse : 'Otros:') : warehouses[0]);
  const [customWarehouseText, setCustomWarehouseText] = useState(!warehouses.includes(order.warehouse || '') ? (order.warehouse || '') : '');
  const [packageTypeSelection, setPackageTypeSelection] = useState(order.packageType ? (packageTypes.includes(order.packageType) ? order.packageType : 'OTROS:') : packageTypes[0]);
  const [customPackageTypeText, setCustomPackageTypeText] = useState(!packageTypes.includes(order.packageType || '') ? (order.packageType || '') : '');
  const [currentQty, setCurrentQty] = useState<number>(0);
  const [confirmedEntries, setConfirmedEntries] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [dispatchTypeSelection, setDispatchTypeSelection] = useState(order.dispatchType || dispatchMainTypes[0]);
  const [dispatchValueSelection, setDispatchValueSelection] = useState(order.dispatchValue || '');
  const [customDispatchText, setCustomDispatchText] = useState((order.dispatchType === 'TRANSPORTE' || order.dispatchType === 'RETIRO PERSONAL') ? (order.dispatchValue || '') : '');

  // --- AUTO-ASIGNACIÓN ---
  useEffect(() => {
    if (!isReadOnly && (!order.reviewer || order.reviewer.trim() === '') && currentUserName) {
      onUpdate({ ...order, reviewer: currentUserName.toUpperCase() });
    }
  }, [order.id, currentUserName]);

  const totalConfirmedQuantity = useMemo(() => {
    return confirmedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [confirmedEntries]);

  const siblingOrders = useMemo(() => {
    if (!order.customerNumber) return [];
    return allOrders.filter(o => String(o.customerNumber) === String(order.customerNumber) && o.id !== order.id && o.status === OrderStatus.PENDING);
  }, [allOrders, order]);

  // --- LÓGICA DE PROGRESIÓN DE ETAPA ---
  const handleConfirmStage = async () => {
    let nextStatus = order.status;
    if (order.status === OrderStatus.PENDING) nextStatus = OrderStatus.COMPLETED;
    else if (order.status === OrderStatus.COMPLETED) nextStatus = OrderStatus.DISPATCHED;
    else if (order.status === OrderStatus.DISPATCHED) nextStatus = OrderStatus.ARCHIVED;

    const val = (dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL') ? customDispatchText : dispatchValueSelection;
    
    await onUpdate({
      ...order,
      status: nextStatus,
      warehouse: warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection,
      packageType: packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection,
      packageQuantity: totalConfirmedQuantity,
      detailedPackaging: confirmedEntries,
      dispatchType: dispatchTypeSelection,
      dispatchValue: val
    });

    if (nextStatus === OrderStatus.ARCHIVED) {
      onClose();
    }
  };

  const handleAddCollaborator = async () => {
    if (isReadOnly) return;
    const name = newCollab.trim().toUpperCase();
    if (!name) return;
    const current = order.reviewer ? order.reviewer.split(',').map(s => s.trim()).filter(s => s !== '') : [];
    if (!current.includes(name)) {
      await onUpdate({...order, reviewer: [...current, name].join(', ')});
    }
    setNewCollab('');
    setIsAddingCollaborator(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[50px] p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar border border-white/20">
        
        {/* Botón Cerrar X */}
        <button onClick={onClose} className="absolute top-6 right-8 p-2.5 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all z-[850] shadow-sm active:scale-90">
          <X size={24} strokeWidth={3}/>
        </button>

        <div className="pt-10 space-y-8">
          
          {/* SECCIÓN SUPERIOR: PEDIDO Y RESPONSABLE (BAJADOS) */}
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2 relative">
              <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">PEDIDO {order.orderNumber || '---'}</span>
              </div>
              {!isReadOnly && (
                <button onClick={() => setIsAddingOrderNum(!isAddingOrderNum)} className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 border-2 border-white transition-all">
                  <Plus size={20} strokeWidth={4}/>
                </button>
              )}
              {isAddingOrderNum && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-100 shadow-2xl rounded-3xl p-5 z-[1000] animate-in zoom-in">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 italic">Vincular Pendientes</h4>
                  {siblingOrders.length > 0 ? siblingOrders.map(o => (
                    <button key={o.id} onClick={() => {}} className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 text-[11px] font-bold mb-1">#{o.orderNumber}</button>
                  )) : <p className="text-[9px] text-slate-300 text-center py-2 font-black uppercase">Sin pendientes</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 relative">
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tight">{order.reviewer || 'CARGANDO...'}</span>
              </div>
              {!isReadOnly && (
                <button onClick={() => setIsAddingCollaborator(!isAddingCollaborator)} className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 border-2 border-white transition-all">
                  <Plus size={20} strokeWidth={4}/>
                </button>
              )}
              {isAddingCollaborator && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.3)] rounded-[32px] p-6 z-[1000] animate-in zoom-in">
                  <div className="flex gap-2">
                    <input className="flex-1 bg-slate-50 p-4 rounded-2xl text-xs font-black uppercase outline-none shadow-inner" placeholder="NOMBRE..." value={newCollab} onChange={e => setNewCollab(e.target.value)} />
                    <button onClick={handleAddCollaborator} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg"><Check size={20} strokeWidth={4}/></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CUERPO CENTRAL: NOMBRE CLIENTE */}
          <div className="text-center bg-slate-50/70 py-10 rounded-[45px] border border-slate-200/50 shadow-inner">
            <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-slate-900 mb-4 px-6">{order.customerName}</h2>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-[13px] font-black text-slate-400 uppercase tracking-tight">
                <Hash size={18} className="text-slate-300" />
                <span>N° CTA: {order.customerNumber || 'S/N'}</span>
              </div>
              <div className="h-6 w-0.5 bg-slate-200 rounded-full" />
              <div className="flex items-center gap-2 text-[13px] font-black text-indigo-600 uppercase tracking-tight">
                <MapPin size={18} className="text-indigo-400" />
                <span>{order.locality}</span>
              </div>
            </div>
          </div>

          {/* FORMULARIO Y CARGA (DESHABILITADO EN HISTORIAL) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-3 italic">Depósito</label>
              <select disabled={isReadOnly} className="w-full bg-slate-100 py-4 px-4 rounded-2xl text-[11px] font-black uppercase shadow-inner outline-none disabled:opacity-50" value={warehouseSelection} onChange={e => setWarehouseSelection(e.target.value)}>{warehouses.map(w => <option key={w}>{w}</option>)}</select>
            </div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-3 italic">Bulto</label>
              <select disabled={isReadOnly} className="w-full bg-slate-100 py-4 px-4 rounded-2xl text-[11px] font-black uppercase shadow-inner outline-none disabled:opacity-50" value={packageTypeSelection} onChange={e => setPackageTypeSelection(e.target.value)}>{packageTypes.map(t => <option key={t}>{t}</option>)}</select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-indigo-50/70 p-7 rounded-[35px] border-2 border-indigo-100 text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cant. Bultos</span>
              <input disabled={isReadOnly} type="number" className="w-full bg-transparent text-4xl font-black text-indigo-700 outline-none text-center mt-1 disabled:opacity-30" value={currentQty || ''} placeholder="0" onChange={e => setCurrentQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="bg-orange-50/70 p-7 rounded-[35px] border-2 border-orange-100 text-center">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Acum.</span>
              <p className="text-4xl font-black text-orange-700 mt-1">{totalConfirmedQuantity}</p>
            </div>
          </div>

          {!isReadOnly && (
            <button onClick={() => {
              if (currentQty <= 0) return;
              setConfirmedEntries([...confirmedEntries, { id: Date.now().toString(), deposit: warehouseSelection, type: packageTypeSelection, quantity: currentQty }]);
              setCurrentQty(0);
            }} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95">
              <Plus size={22} strokeWidth={4}/> CONFIRMAR CARGA
            </button>
          )}

          {confirmedEntries.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar p-1">
              {confirmedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-4 rounded-3xl shadow-sm">
                  <div><p className="text-[9px] font-black text-indigo-500 uppercase italic">{e.deposit}</p><p className="text-[11px] font-black text-slate-800 uppercase">{e.type}</p></div>
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-black">{e.quantity}</span>
                    {!isReadOnly && <button onClick={() => setConfirmedEntries(confirmedEntries.filter(x => x.id !== e.id))} className="text-red-400 p-2"><Trash size={20}/></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Datos de Despacho */}
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white space-y-4 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 opacity-10 rotate-12 -mr-6 -mt-6"><Package size={120}/></div>
             <h3 className="text-[11px] font-black uppercase italic tracking-[0.2em] opacity-80 flex items-center gap-3"><Activity size={16}/> Datos de Despacho</h3>
             <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none disabled:opacity-50" value={dispatchTypeSelection} onChange={e => setDispatchTypeSelection(e.target.value)}>
               {dispatchMainTypes.map(t => <option key={t} className="bg-indigo-700">{t}</option>)}
             </select>
             {dispatchOptions[dispatchTypeSelection] && (
               <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none disabled:opacity-50" value={dispatchValueSelection} onChange={e => setDispatchValueSelection(e.target.value)}>
                 <option className="bg-indigo-700" value="">Seleccionar responsable...</option>
                 {dispatchOptions[dispatchTypeSelection].map(o => <option key={o} value={o} className="bg-indigo-700">{o}</option>)}
               </select>
             )}
          </div>

          {/* BOTONERA DINÁMICA */}
          <div className="space-y-4">
            {!isReadOnly ? (
              <button 
                onClick={handleConfirmStage} 
                disabled={isSaving} 
                className="w-full bg-indigo-600 text-white py-6 rounded-[32px] font-black uppercase text-xs flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] active:scale-95 transition-all border-b-4 border-indigo-800"
              >
                {isSaving ? <Activity className="animate-spin" size={22}/> : <Check size={22} strokeWidth={4}/>}
                CONFIRMACIÓN DE ETAPA
              </button>
            ) : (
              <div className="bg-slate-100 p-4 rounded-[32px] text-center border-2 border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido en Historial (Solo Lectura)</p>
              </div>
            )}
            
            <button onClick={() => window.open(`whatsapp://send?text=${encodeURIComponent('D&G Logística - Pedido: ' + order.customerName + ' está ' + order.status)}`)} className="w-full bg-emerald-500 text-white py-5 rounded-[32px] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg hover:bg-emerald-600 transition-all active:scale-95 border-b-4 border-emerald-700">
              <MessageCircle size={22} className="fill-white"/> NOTIFICAR WHATSAPP
            </button>
            
            <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-[32px] font-black uppercase text-[11px] shadow-sm active:scale-95 border-b-4 border-slate-700">
              CERRAR PANTALLA
            </button>

            {!isReadOnly && (
              <button onClick={() => onDelete(order.id)} className="w-full text-red-500 py-4 font-black uppercase text-[10px] border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-colors mt-4">
                ELIMINAR ESTE REGISTRO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

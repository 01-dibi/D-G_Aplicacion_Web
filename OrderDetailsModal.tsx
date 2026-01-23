
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, MapPin, Plus, UserPlus, ChevronDown, Package, Trash, Save, Check, MessageCircle, Trash2, Hash 
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

  // Lógica para asignar automáticamente al responsable si está vacío
  useEffect(() => {
    if (!order.reviewer && currentUserName) {
      onUpdate({ ...order, reviewer: currentUserName.toUpperCase() });
    }
  }, []);

  const totalConfirmedQuantity = useMemo(() => {
    return confirmedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [confirmedEntries]);

  const siblingOrders = useMemo(() => {
    if (!order.customerNumber) return [];
    const tid = String(order.customerNumber);
    return allOrders.filter(o => String(o.customerNumber) === tid && o.id !== order.id && o.status === OrderStatus.PENDING);
  }, [allOrders, order]);

  const handleAddCollaborator = async () => {
    const name = newCollab.trim().toUpperCase();
    if (!name) return;
    const current = order.reviewer ? order.reviewer.split(',').map(s => s.trim()) : [];
    if (!current.includes(name)) {
      const updated = [...current, name].join(', ');
      await onUpdate({...order, reviewer: updated});
    }
    setNewCollab('');
    setIsAddingCollaborator(false);
  };

  const handleLinkOrderNumber = async (other: Order) => {
    const num = String(other.orderNumber);
    const current = order.orderNumber ? String(order.orderNumber).split(',').map(s => s.trim()) : [];
    if (!current.includes(num)) {
      const updated = [...current, num].join(', ');
      await onUpdate({...order, orderNumber: updated});
    }
    setIsAddingOrderNum(false);
  };

  const saveDetails = async () => {
    const val = (dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL') ? customDispatchText : dispatchValueSelection;
    await onUpdate({
      ...order,
      warehouse: warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection,
      packageType: packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection,
      packageQuantity: totalConfirmedQuantity,
      detailedPackaging: confirmedEntries,
      dispatchType: dispatchTypeSelection,
      dispatchValue: val
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[48px] p-10 shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors z-[850]"><X/></button>

        <div className="space-y-6">
          <div className="flex justify-between items-center relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase">ORDEN {order.orderNumber || '---'}</span>
              <button onClick={() => setIsAddingOrderNum(!isAddingOrderNum)} className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all"><Plus size={12}/></button>
              {isAddingOrderNum && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-[900] animate-in zoom-in duration-200">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3 italic">Vincular Pedidos</h4>
                  {siblingOrders.length > 0 ? siblingOrders.map(o => (
                    <button key={o.id} onClick={() => handleLinkOrderNumber(o)} className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 text-[10px] font-bold border border-transparent hover:border-indigo-100 mb-1">#{o.orderNumber} - {o.locality}</button>
                  )) : <p className="text-[8px] text-slate-300 text-center uppercase italic py-2">Sin pedidos pendientes</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 relative">
              <div className="bg-indigo-600 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-tight shadow-md">
                {order.reviewer || 'SIN RESPONSABLE'}
              </div>
              <button 
                onClick={() => setIsAddingCollaborator(!isAddingCollaborator)} 
                className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
              >
                <UserPlus size={14}/>
              </button>
              
              {isAddingCollaborator && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 z-[950] animate-in zoom-in duration-200">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3 italic">Añadir Colaborador</h4>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-slate-50 p-3 rounded-xl text-xs font-black uppercase outline-none shadow-inner border border-transparent focus:border-indigo-200" 
                      placeholder="NOMBRE..." 
                      value={newCollab} 
                      onChange={e => setNewCollab(e.target.value)} 
                    />
                    <button onClick={handleAddCollaborator} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-all">
                      <Check size={14}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-2">
            <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-slate-900">{order.customerName}</h2>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase italic">
                <Hash size={14} className="opacity-50" />
                <span>N° CTA: {order.customerNumber || 'S/N'}</span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase italic">
                <MapPin size={14}/>
                <span>{order.locality}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">DEPÓSITO</label>
              <select className="w-full bg-slate-50 py-3.5 px-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase shadow-inner" value={warehouseSelection} onChange={e => setWarehouseSelection(e.target.value)}>{warehouses.map(w => <option key={w}>{w}</option>)}</select>
            </div>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">TIPO BULTOS</label>
              <select className="w-full bg-slate-50 py-3.5 px-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase shadow-inner" value={packageTypeSelection} onChange={e => setPackageTypeSelection(e.target.value)}>{packageTypes.map(t => <option key={t}>{t}</option>)}</select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50/50 p-5 rounded-[24px] border border-indigo-100 text-center shadow-inner">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">CANTIDAD</span>
              <input type="number" className="w-full bg-transparent text-2xl font-black text-indigo-700 outline-none text-center" value={currentQty || ''} placeholder="0" onChange={e => setCurrentQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="bg-orange-50/50 p-5 rounded-[24px] border border-orange-100 text-center shadow-inner">
              <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">SUMATORIA</span>
              <p className="text-2xl font-black text-orange-700">{totalConfirmedQuantity}</p>
            </div>
          </div>

          <button onClick={() => {
            if (currentQty <= 0) return;
            const entry = { id: Date.now().toString(), deposit: warehouseSelection, type: packageTypeSelection, quantity: currentQty };
            setConfirmedEntries([...confirmedEntries, entry]);
            setCurrentQty(0);
          }} className="w-full bg-slate-100 border-2 border-slate-200 py-4 rounded-[22px] font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm"><Plus size={18}/> CONFIRMAR Y SUMAR</button>

          {confirmedEntries.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar p-1">
              {confirmedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                  <div><p className="text-[8px] font-black text-indigo-500 uppercase italic">{e.deposit}</p><p className="text-[10px] font-bold text-slate-700 uppercase italic">{e.type}</p></div>
                  <div className="flex items-center gap-4"><span className="bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-700 border border-indigo-100">{e.quantity}</span>
                  <button onClick={() => setConfirmedEntries(confirmedEntries.filter(x => x.id !== e.id))} className="text-red-400 hover:text-red-600 p-2"><Trash size={14}/></button></div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-900 p-6 rounded-[32px] text-white space-y-4 shadow-xl">
             <h3 className="text-[10px] font-black uppercase italic tracking-[0.2em] opacity-60">Datos de Despacho</h3>
             <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-3 text-[10px] font-black uppercase outline-none" value={dispatchTypeSelection} onChange={e => setDispatchTypeSelection(e.target.value)}>
               {dispatchMainTypes.map(t => <option key={t} className="bg-slate-900">{t}</option>)}
             </select>
             {dispatchOptions[dispatchTypeSelection] && (
               <select className="w-full bg-white/10 border border-white/10 rounded-xl py-3.5 px-3 text-[10px] font-black uppercase outline-none" value={dispatchValueSelection} onChange={e => setDispatchValueSelection(e.target.value)}>
                 <option className="bg-slate-900" value="">Seleccionar...</option>
                 {dispatchOptions[dispatchTypeSelection].map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
               </select>
             )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={saveDetails} disabled={isSaving} className="bg-indigo-600 text-white py-5 rounded-[22px] font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
              <Save size={16}/> GUARDAR CAMBIOS
            </button>
            {order.status === OrderStatus.PENDING ? (
              <button onClick={async () => {
                await onUpdate({...order, status: OrderStatus.COMPLETED});
              }} className="bg-slate-900 text-white py-5 rounded-[22px] font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                <Check size={16}/> PREPARAR
              </button>
            ) : (
              <button onClick={onClose} className="bg-slate-100 text-slate-500 py-5 rounded-[22px] font-black uppercase text-[10px] border border-slate-200">
                CERRAR
              </button>
            )}
          </div>
          <button onClick={() => window.open(`whatsapp://send?text=${encodeURIComponent('D&G Logística - Pedido: ' + order.customerName + ' está ' + order.status)}`)} className="w-full bg-emerald-500 text-white py-4 rounded-[20px] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"><MessageCircle size={18}/> NOTIFICAR WHATSAPP</button>
          <button onClick={() => onDelete(order.id)} className="w-full text-red-500 py-4 font-black uppercase text-[10px] border-2 border-red-50 rounded-[20px] hover:bg-red-50 transition-colors">ELIMINAR REGISTRO</button>
        </div>
      </div>
    </div>
  );
}

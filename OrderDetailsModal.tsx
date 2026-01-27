
import React, { useState, useMemo } from 'react';
import { 
  X, MapPin, Plus, Package, Trash, Check, MessageCircle, Hash, Activity, UserPlus, Users, Link as LinkIcon, Loader2
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
  const [newCollabInput, setNewCollabInput] = useState('');
  const [isLinkingOrder, setIsLinkingOrder] = useState(false);
  const [linkOrderInput, setLinkOrderInput] = useState('');

  const warehouses = ["Dep. E", "Dep. F:", "Dep. D1:", "Dep. D2:", "Dep. A1:", "Otros:"];
  const packageTypes = ["CAJA", "BOLSA:", "PAQUETE", "BOBINA", "OTROS:"];
  const dispatchMainTypes = ["VIAJANTES", "VENDEDORES", "TRANSPORTE", "RETIRO PERSONAL"];
  const dispatchOptions: Record<string, string[]> = {
    "VIAJANTES": ["MATÍAS", "NICOLÁS"],
    "VENDEDORES": ["MAURO", "GUSTAVO"]
  };

  const [warehouseSelection, setWarehouseSelection] = useState(order.warehouse || warehouses[0]);
  const [customWarehouseText, setCustomWarehouseText] = useState(!warehouses.includes(order.warehouse || '') ? (order.warehouse || '') : '');
  const [packageTypeSelection, setPackageTypeSelection] = useState(order.packageType || packageTypes[0]);
  const [customPackageTypeText, setCustomPackageTypeText] = useState(!packageTypes.includes(order.packageType || '') ? (order.packageType || '') : '');
  const [currentQty, setCurrentQty] = useState<number>(0);
  const [confirmedEntries, setConfirmedEntries] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [dispatchTypeSelection, setDispatchTypeSelection] = useState(order.dispatchType || dispatchMainTypes[0]);
  const [dispatchValueSelection, setDispatchValueSelection] = useState(order.dispatchValue || '');
  const [customDispatchText, setCustomDispatchText] = useState((order.dispatchType === 'TRANSPORTE' || order.dispatchType === 'RETIRO PERSONAL') ? (order.dispatchValue || '') : '');

  const totalConfirmedQuantity = useMemo(() => {
    return confirmedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [confirmedEntries]);

  const handleLinkOrder = async () => {
    const num = linkOrderInput.trim();
    if (!num) return;

    const found = allOrders.find(o => 
      o.orderNumber === num && 
      o.customerNumber === order.customerNumber &&
      o.id !== order.id
    );

    let updatedOrderNumber = order.orderNumber.includes(num) 
      ? order.orderNumber 
      : `${order.orderNumber} + ${num}`;

    let updatedEntries = [...confirmedEntries];

    if (found) {
      if (found.detailedPackaging && found.detailedPackaging.length > 0) {
        updatedEntries = [...updatedEntries, ...found.detailedPackaging];
      }
      await onDelete(found.id);
    }

    const totalQty = updatedEntries.reduce((sum, e) => sum + e.quantity, 0);
    
    const updatedMainOrder: Order = {
      ...order,
      orderNumber: updatedOrderNumber,
      detailedPackaging: updatedEntries,
      packageQuantity: totalQty,
      reviewer: order.reviewer || currentUserName || 'SISTEMA'
    };

    const success = await onUpdate(updatedMainOrder);
    if (success) {
      setConfirmedEntries(updatedEntries);
      setLinkOrderInput('');
      setIsLinkingOrder(false);
    } else {
      alert("No se pudo vincular el pedido.");
    }
  };

  const persistChanges = async (entries: PackagingEntry[]) => {
    const totalQty = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const updatedOrder: Order = {
      ...order,
      detailedPackaging: entries,
      packageQuantity: totalQty,
      reviewer: order.reviewer || currentUserName || 'SISTEMA'
    };
    await onUpdate(updatedOrder);
  };

  const handleConfirmStage = async () => {
    if (isSaving || isReadOnly) return;
    
    let nextStatus: OrderStatus = order.status;
    if (order.status === OrderStatus.PENDING) nextStatus = OrderStatus.COMPLETED;
    else if (order.status === OrderStatus.COMPLETED) nextStatus = OrderStatus.DISPATCHED;
    else if (order.status === OrderStatus.DISPATCHED) nextStatus = OrderStatus.ARCHIVED;

    const finalWarehouse = warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection;
    const finalPackageType = packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection;
    const isCustomDispatch = dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL';
    const finalDispatchValue = isCustomDispatch ? customDispatchText : dispatchValueSelection;

    const updatedMainOrder: Order = {
      ...order,
      status: nextStatus,
      reviewer: order.reviewer || currentUserName || 'SISTEMA',
      warehouse: finalWarehouse,
      packageType: finalPackageType,
      packageQuantity: totalConfirmedQuantity,
      detailedPackaging: confirmedEntries,
      dispatchType: dispatchTypeSelection,
      dispatchValue: finalDispatchValue
    };

    if (await onUpdate(updatedMainOrder)) onClose();
  };

  const actionButtonClass = "w-full py-3.5 rounded-[22px] font-black uppercase text-[10px] flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md border-b-4";

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[50px] p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar border border-white/20">
        
        <button onClick={onClose} className="absolute top-6 right-8 p-2.5 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all z-[850] shadow-sm">
          <X size={24} strokeWidth={3}/>
        </button>

        <div className="pt-8 space-y-5">
          <div className="flex items-center justify-start gap-2.5">
            {!isReadOnly && (
              <div className="relative">
                <button onClick={() => setIsLinkingOrder(!isLinkingOrder)} className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90"><Plus size={18} strokeWidth={3}/></button>
                {isLinkingOrder && (
                  <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-100 shadow-2xl rounded-[28px] p-5 z-[1000] animate-in zoom-in">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3">Vincular/Fusionar Pedido</p>
                    <div className="flex gap-2">
                      <input className="flex-1 bg-slate-50 p-3 rounded-xl text-xs font-black uppercase outline-none" placeholder="N° PEDIDO..." value={linkOrderInput} onChange={e => setLinkOrderInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleLinkOrder()} />
                      <button onClick={handleLinkOrder} className="bg-orange-500 text-white p-3 rounded-xl">{isSaving ? <Loader2 size={16} className="animate-spin"/> : <Check size={18} strokeWidth={4}/>}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl flex flex-col min-w-[100px]">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">PEDIDO(S)</span>
              <span className="text-[10px] font-black text-slate-700 uppercase italic">{order.orderNumber}</span>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <div className="bg-slate-900 text-white px-3 py-2 rounded-2xl flex items-center gap-2 max-w-[140px] truncate">
                <Users size={11} className="text-orange-500" /><span className="text-[9px] font-black uppercase truncate">{order.reviewer || currentUserName || 'S/N'}</span>
              </div>
            </div>
          </div>

          <div className="text-center bg-slate-50/70 py-4 rounded-[30px] border border-slate-200/50 shadow-inner">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-2">{order.customerName}</h2>
            <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-400 uppercase">
              <div className="flex items-center gap-1.5"><Hash size={14}/><span>CTA: {order.customerNumber}</span></div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-indigo-600"><MapPin size={14}/><span>{order.locality}</span></div>
            </div>
          </div>

          {/* Restauración de Selectores de Depósito y Tipo */}
          {!isReadOnly && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase ml-2">Depósito</p>
                <select 
                  className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-black uppercase border border-slate-100 outline-none"
                  value={warehouseSelection}
                  onChange={e => setWarehouseSelection(e.target.value)}
                >
                  {warehouses.map(w => <option key={w}>{w}</option>)}
                </select>
                {warehouseSelection === 'Otros:' && (
                  <input 
                    className="w-full bg-slate-50 p-2 rounded-lg text-[9px] font-black uppercase mt-1 border border-indigo-200" 
                    placeholder="¿Cuál?" 
                    value={customWarehouseText} 
                    onChange={e => setCustomWarehouseText(e.target.value.toUpperCase())} 
                  />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase ml-2">Bulto</p>
                <select 
                  className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-black uppercase border border-slate-100 outline-none"
                  value={packageTypeSelection}
                  onChange={e => setPackageTypeSelection(e.target.value)}
                >
                  {packageTypes.map(p => <option key={p}>{p}</option>)}
                </select>
                {packageTypeSelection === 'OTROS:' && (
                  <input 
                    className="w-full bg-slate-50 p-2 rounded-lg text-[9px] font-black uppercase mt-1 border border-indigo-200" 
                    placeholder="¿Cuál?" 
                    value={customPackageTypeText} 
                    onChange={e => setCustomPackageTypeText(e.target.value.toUpperCase())} 
                  />
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-indigo-50/70 p-3 rounded-[24px] border-2 border-indigo-100 text-center">
              <span className="text-[8px] font-black text-indigo-400 uppercase">Añadir Cant.</span>
              <input disabled={isReadOnly} type="number" className="w-full bg-transparent text-xl font-black text-indigo-700 outline-none text-center" value={currentQty || ''} placeholder="0" onChange={e => setCurrentQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="bg-orange-50/70 p-3 rounded-[24px] border-2 border-orange-100 text-center">
              <span className="text-[8px] font-black text-orange-400 uppercase">Total Acum.</span>
              <p className="text-xl font-black text-orange-700">{totalConfirmedQuantity}</p>
            </div>
          </div>

          {!isReadOnly && (
            <button 
              onClick={async () => { 
                if (currentQty <= 0) return; 
                const finalDep = warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection;
                const finalTyp = packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection;
                const newEntry = { id: Date.now().toString(), deposit: finalDep || 'S/D', type: finalTyp || 'S/D', quantity: currentQty };
                const newEntries = [...confirmedEntries, newEntry];
                setConfirmedEntries(newEntries); 
                setCurrentQty(0);
                await persistChanges(newEntries);
              }} 
              className={`${actionButtonClass} bg-slate-900 text-white border-slate-700`}
            >
              <Plus size={16} strokeWidth={4}/> CONFIRMAR CARGA
            </button>
          )}

          {confirmedEntries.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar p-1">
              {confirmedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-2.5 rounded-2xl shadow-sm">
                  <div className="text-left"><p className="text-[8px] font-black text-indigo-500 uppercase italic leading-none">{e.deposit}</p><p className="text-[10px] font-black text-slate-800 uppercase mt-1 tracking-tight">{e.type}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-900">{e.quantity}</span>
                    {!isReadOnly && <button onClick={async () => { const newEntries = confirmedEntries.filter(x => x.id !== e.id); setConfirmedEntries(newEntries); await persistChanges(newEntries); }} className="text-red-400"><Trash size={16}/></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-indigo-600 p-4 rounded-[28px] text-white space-y-2.5 shadow-xl">
             <h3 className="text-[9px] font-black uppercase italic tracking-[0.2em] opacity-80 flex items-center gap-2"><Activity size={14}/> Despacho</h3>
             <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none" value={dispatchTypeSelection} onChange={e => setDispatchTypeSelection(e.target.value)}>{dispatchMainTypes.map(t => <option key={t} className="bg-indigo-700">{t}</option>)}</select>
             {dispatchOptions[dispatchTypeSelection] ? (
               <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none" value={dispatchValueSelection} onChange={e => setDispatchValueSelection(e.target.value)}><option value="" className="bg-indigo-700">Responsable...</option>{dispatchOptions[dispatchTypeSelection].map(o => <option key={o} value={o} className="bg-indigo-700">{o}</option>)}</select>
             ) : (dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL') && (
               <input disabled={isReadOnly} type="text" placeholder="DETALLE..." className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none" value={customDispatchText} onChange={e => setCustomDispatchText(e.target.value.toUpperCase())} />
             )}
          </div>

          <div className="space-y-2.5">
            {!isReadOnly ? (
              <button onClick={handleConfirmStage} disabled={isSaving} className={`${actionButtonClass} bg-indigo-600 text-white border-indigo-800`}>
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Check size={18} strokeWidth={4}/>} CONFIRMACIÓN DE ETAPA
              </button>
            ) : (
              <div className="bg-slate-50 p-3.5 rounded-[22px] text-center border-2 border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PEDIDO FINALIZADO</p></div>
            )}
            <button onClick={() => { if(confirm("¿Eliminar este pedido por completo?")) onDelete(order.id).then(() => onClose()); }} className={`${actionButtonClass} bg-white text-red-500 border-red-100 shadow-none`}>
              <Trash size={16}/> ELIMINAR PEDIDO
            </button>
            <button onClick={onClose} className={`${actionButtonClass} bg-slate-900 text-white border-slate-700`}>CERRAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

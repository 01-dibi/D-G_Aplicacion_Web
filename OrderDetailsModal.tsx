
import React, { useState, useMemo } from 'react';
import { 
  X, MapPin, Plus, Package, Trash, Check, MessageCircle, Hash, Activity, UserPlus, Users, Link as LinkIcon
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
  const [linkedOrders, setLinkedOrders] = useState<Order[]>([order]);

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

  const totalConfirmedQuantity = useMemo(() => {
    return confirmedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [confirmedEntries]);

  const handleLinkOrder = () => {
    const num = linkOrderInput.trim();
    if (!num) return;
    const found = allOrders.find(o => 
      o.orderNumber === num && 
      o.customerNumber === order.customerNumber &&
      o.id !== order.id &&
      !linkedOrders.find(lo => lo.id === o.id)
    );
    if (found) {
      setLinkedOrders([...linkedOrders, found]);
      setLinkOrderInput('');
      setIsLinkingOrder(false);
    } else {
      alert("No se encontró un pedido pendiente con ese número para este cliente.");
    }
  };

  const handleConfirmStage = async () => {
    if (isSaving || isReadOnly) return;
    
    let nextStatus: OrderStatus = order.status;
    let autoReviewer = order.reviewer || currentUserName || 'SISTEMA';

    if (order.status === OrderStatus.PENDING) {
      nextStatus = OrderStatus.COMPLETED;
    } else if (order.status === OrderStatus.COMPLETED) {
      nextStatus = OrderStatus.DISPATCHED;
    } else if (order.status === OrderStatus.DISPATCHED) {
      nextStatus = OrderStatus.ARCHIVED;
    }

    const finalWarehouse = warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection;
    const finalPackageType = packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection;
    const isCustomDispatch = dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL';
    const finalDispatchValue = isCustomDispatch ? customDispatchText : dispatchValueSelection;

    const totalQty = confirmedEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    const updatedMainOrder: Order = {
      ...order,
      status: nextStatus,
      reviewer: autoReviewer,
      warehouse: finalWarehouse,
      packageType: finalPackageType,
      packageQuantity: totalQty,
      detailedPackaging: confirmedEntries,
      dispatchType: dispatchTypeSelection,
      dispatchValue: finalDispatchValue
    };

    const successMain = await onUpdate(updatedMainOrder);
    if (successMain) {
      for (const lo of linkedOrders) {
        if (lo.id === order.id) continue;
        await onUpdate({
          ...lo,
          status: nextStatus,
          dispatchType: dispatchTypeSelection,
          dispatchValue: finalDispatchValue,
          reviewer: autoReviewer,
          packageQuantity: lo.packageQuantity || 0 // Mantener lo que ya tenía o vincular si es necesario
        });
      }
      onClose();
    }
  };

  const handleAddCollaborators = async () => {
    const input = newCollabInput.trim();
    if (!input) {
      setIsAddingCollaborator(false);
      return;
    }
    const newNames = input.split(',').map(n => n.trim().toUpperCase()).filter(n => n !== "");
    const existingNames = order.reviewer ? order.reviewer.split(',').map(n => n.trim()) : [];
    const combined = Array.from(new Set([...existingNames, ...newNames]));
    const finalReviewerString = combined.join(', ');
    const success = await onUpdate({ ...order, reviewer: finalReviewerString });
    if (success) {
      setNewCollabInput('');
      setIsAddingCollaborator(false);
    }
  };

  const actionButtonClass = "w-full py-3.5 rounded-[22px] font-black uppercase text-[10px] flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md border-b-4";

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[50px] p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar border border-white/20">
        
        <button onClick={onClose} className="absolute top-6 right-8 p-2.5 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all z-[850] shadow-sm">
          <X size={24} strokeWidth={3}/>
        </button>

        <div className="pt-8 space-y-5">
          <div className="flex items-center justify-start gap-2.5 px-0.5">
            <div className="flex items-center gap-1.5 shrink-0">
              {!isReadOnly && (
                <div className="relative">
                  <button 
                    onClick={() => setIsLinkingOrder(!isLinkingOrder)} 
                    className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-orange-600"
                  >
                    <Plus size={18} strokeWidth={3}/>
                  </button>
                  {isLinkingOrder && (
                    <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.4)] rounded-[28px] p-5 z-[1000] animate-in zoom-in slide-in-from-top-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3">Vincular otro Pedido</p>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-slate-50 p-3 rounded-xl text-xs font-black uppercase outline-none border border-transparent focus:border-orange-100" placeholder="N° PEDIDO..." value={linkOrderInput} onChange={e => setLinkOrderInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleLinkOrder()} />
                        <button onClick={handleLinkOrder} className="bg-orange-500 text-white p-3 rounded-xl shadow-md"><Check size={18} strokeWidth={4}/></button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl shadow-sm flex flex-col min-w-[80px]">
                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                  {linkedOrders.length > 1 ? `PEDIDOS` : 'PEDIDO'}
                </span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter truncate max-w-[70px]">
                  {linkedOrders.map(lo => lo.orderNumber).join(' + ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative shrink-0">
              <div className="bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 border border-white/10 min-w-[100px] max-w-[140px] justify-center overflow-hidden">
                <Users size={11} className="text-orange-500 flex-shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-tight truncate">
                  {order.reviewer || (order.status === OrderStatus.PENDING ? `OP: ${currentUserName || 'S/N'}` : 'SIN ASIGNAR')}
                </span>
              </div>
              {!isReadOnly && (
                <div className="relative">
                  <button onClick={() => setIsAddingCollaborator(!isAddingCollaborator)} className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 border-2 border-white transition-all z-[900] hover:bg-indigo-700">
                    <UserPlus size={16} strokeWidth={3}/>
                  </button>
                  {isAddingCollaborator && (
                    <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-[32px] p-6 z-[1000] animate-in zoom-in">
                      <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3">Agregar Responsable(s)</p>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-slate-50 p-4 rounded-2xl text-xs font-black uppercase outline-none shadow-inner border border-transparent focus:border-indigo-100" placeholder="NOMBRE(S)..." value={newCollabInput} onChange={e => setNewCollabInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborators()} />
                        <button onClick={handleAddCollaborators} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg"><Check size={20} strokeWidth={4}/></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-center bg-slate-50/70 py-4 rounded-[30px] border border-slate-200/50 shadow-inner">
            <h2 className="text-2xl font-black italic uppercase leading-none tracking-tighter text-slate-900 mb-2 px-6">{order.customerName}</h2>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                <Hash size={14} className="text-slate-300" />
                <span>N° CTA: {order.customerNumber || 'S/N'}</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-tight">
                <MapPin size={14} className="text-indigo-400" />
                <span>{order.locality}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-3 italic">Depósito Origen</label>
              <select disabled={isReadOnly} className="w-full bg-slate-100 py-3 px-4 rounded-2xl text-[10px] font-black uppercase shadow-inner outline-none border-2 border-transparent focus:border-indigo-100 transition-all" value={warehouseSelection} onChange={e => setWarehouseSelection(e.target.value)}>{warehouses.map(w => <option key={w}>{w}</option>)}</select>
              {warehouseSelection === 'Otros:' && !isReadOnly && (
                <input 
                  type="text" 
                  placeholder="ANOTACIÓN..." 
                  className="w-full mt-1.5 bg-white border-2 border-slate-100 py-2 px-4 rounded-xl text-[9px] font-black uppercase outline-none focus:border-indigo-300 animate-in fade-in duration-300" 
                  value={customWarehouseText} 
                  onChange={e => setCustomWarehouseText(e.target.value)} 
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-3 italic">Formato Bulto</label>
              <select disabled={isReadOnly} className="w-full bg-slate-100 py-3 px-4 rounded-2xl text-[10px] font-black uppercase shadow-inner outline-none border-2 border-transparent focus:border-indigo-100 transition-all" value={packageTypeSelection} onChange={e => setPackageTypeSelection(e.target.value)}>{packageTypes.map(t => <option key={t}>{t}</option>)}</select>
              {packageTypeSelection === 'OTROS:' && !isReadOnly && (
                <input 
                  type="text" 
                  placeholder="ANOTACIÓN..." 
                  className="w-full mt-1.5 bg-white border-2 border-slate-100 py-2 px-4 rounded-xl text-[9px] font-black uppercase outline-none focus:border-indigo-300 animate-in fade-in duration-300" 
                  value={customPackageTypeText} 
                  onChange={e => setCustomPackageTypeText(e.target.value)} 
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-indigo-50/70 p-3 rounded-[24px] border-2 border-indigo-100 text-center">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Añadir Cant.</span>
              <input disabled={isReadOnly} type="number" className="w-full bg-transparent text-xl font-black text-indigo-700 outline-none text-center mt-0.5" value={currentQty || ''} placeholder="0" onChange={e => setCurrentQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="bg-orange-50/70 p-3 rounded-[24px] border-2 border-orange-100 text-center relative overflow-hidden">
              <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest relative z-10">Total Acum.</span>
              <p className="text-xl font-black text-orange-700 mt-0.5 relative z-10">{totalConfirmedQuantity}</p>
              {linkedOrders.length > 1 && <div className="absolute bottom-1 right-2 opacity-10 rotate-12 z-0"><LinkIcon size={24} className="text-orange-500" /></div>}
            </div>
          </div>

          {!isReadOnly && (
            <button 
              onClick={() => { if (currentQty <= 0) return; setConfirmedEntries([...confirmedEntries, { id: Date.now().toString(), deposit: warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection, type: packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection, quantity: currentQty }]); setCurrentQty(0); }} 
              className={`${actionButtonClass} bg-slate-900 text-white border-slate-700 hover:bg-black`}
            >
              <Plus size={16} strokeWidth={4}/> CONFIRMAR CARGA
            </button>
          )}

          {confirmedEntries.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar p-1">
              {confirmedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-2.5 rounded-2xl shadow-sm">
                  <div><p className="text-[8px] font-black text-indigo-500 uppercase italic leading-none">{e.deposit}</p><p className="text-[10px] font-black text-slate-800 uppercase mt-1 tracking-tight">{e.type}</p></div>
                  <div className="flex items-center gap-3"><span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-900">{e.quantity}</span>{!isReadOnly && <button onClick={() => setConfirmedEntries(confirmedEntries.filter(x => x.id !== e.id))} className="text-red-400 p-1.5 active:scale-90"><Trash size={16}/></button>}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-indigo-600 p-4 rounded-[28px] text-white space-y-2.5 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 opacity-10 rotate-12 -mr-3 -mt-3"><Package size={60}/></div>
             <h3 className="text-[9px] font-black uppercase italic tracking-[0.2em] opacity-80 flex items-center gap-2"><Activity size={14}/> Datos de Despacho</h3>
             <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none focus:bg-white/20 transition-all" value={dispatchTypeSelection} onChange={e => setDispatchTypeSelection(e.target.value)}>{dispatchMainTypes.map(t => <option key={t} className="bg-indigo-700">{t}</option>)}</select>
             
             {dispatchOptions[dispatchTypeSelection] ? (
               <select disabled={isReadOnly} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none focus:bg-white/20 transition-all" value={dispatchValueSelection} onChange={e => setDispatchValueSelection(e.target.value)}><option className="bg-indigo-700" value="">Seleccionar responsable...</option>{dispatchOptions[dispatchTypeSelection].map(o => <option key={o} value={o} className="bg-indigo-700">{o}</option>)}</select>
             ) : (dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL') ? (
               <input 
                 disabled={isReadOnly}
                 type="text" 
                 placeholder={dispatchTypeSelection === 'TRANSPORTE' ? "EMPRESA DE TRANSPORTE..." : "NOMBRE DE QUIEN RETIRA..."}
                 className="w-full bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                 value={customDispatchText}
                 onChange={e => setCustomDispatchText(e.target.value.toUpperCase())}
               />
             ) : null}
          </div>

          <div className="space-y-2.5 pb-2">
            {!isReadOnly ? (
              <button 
                onClick={handleConfirmStage} 
                disabled={isSaving} 
                className={`${actionButtonClass} bg-indigo-600 text-white border-indigo-800 disabled:opacity-50`}
              >
                {isSaving ? <Activity className="animate-spin" size={18}/> : <Check size={18} strokeWidth={4}/>} CONFIRMACIÓN DE ETAPA
              </button>
            ) : (
              <div className="bg-slate-50 p-3.5 rounded-[22px] text-center border-2 border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PEDIDO FINALIZADO (HISTORIAL)</p></div>
            )}
            
            <button 
              onClick={() => window.open(`whatsapp://send?text=${encodeURIComponent('D&G Logística - Pedido de ' + order.customerName + ' avanzado a etapa: ' + order.status)}`)} 
              className={`${actionButtonClass} bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600`}
            >
              <MessageCircle size={18} className="fill-white"/> NOTIFICAR WHATSAPP
            </button>
            
            <button 
              onClick={onClose} 
              className={`${actionButtonClass} bg-slate-900 text-white border-slate-700 shadow-sm`}
            >
              CERRAR PANTALLA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

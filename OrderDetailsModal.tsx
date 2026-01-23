
import React, { useState, useMemo } from 'react';
import { 
  X, MapPin, Plus, Package, Trash, Check, MessageCircle, Hash, Activity, UserPlus, Users
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
  order, onClose, onUpdate, onDelete, isSaving 
}: OrderDetailsModalProps) {
  const isReadOnly = order.status === OrderStatus.ARCHIVED;
  
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [newCollabInput, setNewCollabInput] = useState('');
  
  const warehouses = ["Dep. E", "Dep. F:", "Dep. D1:", "Dep. D2:", "Dep. A1:", "Otros:"];
  const packageTypes = ["CAJA", "BOLSA:", "PAQUETE", "BOBINA", "OTROS:"];
  const dispatchMainTypes = ["VIAJANTES", "VENDEDORES", "TRANSPORTE", "RETIRO PERSONAL"];
  const dispatchOptions: Record<string, string[]> = {
    "VIAJANTES": ["MATÍAS", "NICOLÁS"],
    "VENDEDORES": ["MAURO", "GUSTAVO"]
  };

  // Estados locales para la edición
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

  // --- LÓGICA DE AVANCE DE ETAPA (CORREGIDA PARA FUNCIONAR CON LA BD) ---
  const handleConfirmStage = async () => {
    if (isSaving || isReadOnly) return;

    // Progresión lógica de estados
    let nextStatus: OrderStatus = order.status;
    if (order.status === OrderStatus.PENDING) nextStatus = OrderStatus.COMPLETED;
    else if (order.status === OrderStatus.COMPLETED) nextStatus = OrderStatus.DISPATCHED;
    else if (order.status === OrderStatus.DISPATCHED) nextStatus = OrderStatus.ARCHIVED;

    // Consolidar valores finales (manejo de "Otros")
    const finalWarehouse = warehouseSelection === 'Otros:' ? customWarehouseText : warehouseSelection;
    const finalPackageType = packageTypeSelection === 'OTROS:' ? customPackageTypeText : packageTypeSelection;
    const isCustomDispatch = dispatchTypeSelection === 'TRANSPORTE' || dispatchTypeSelection === 'RETIRO PERSONAL';
    const finalDispatchValue = isCustomDispatch ? customDispatchText : dispatchValueSelection;

    const updatedOrder: Order = {
      ...order,
      status: nextStatus,
      warehouse: finalWarehouse,
      packageType: finalPackageType,
      packageQuantity: totalConfirmedQuantity,
      detailedPackaging: confirmedEntries,
      dispatchType: dispatchTypeSelection,
      dispatchValue: finalDispatchValue
    };

    console.log("Intentando actualizar pedido...", updatedOrder);
    const success = await onUpdate(updatedOrder);
    
    if (success) {
      console.log("Actualización exitosa en BD.");
      onClose(); // Cerramos solo si la BD respondió correctamente
    } else {
      console.error("Error: La actualización no se reflejó en la base de datos.");
      alert("No se pudo confirmar la etapa. Verifica tu conexión a internet o las credenciales de la base de datos.");
    }
  };

  // --- LÓGICA DE COLABORADORES MULTI-NOMBRE (+) ---
  const handleAddCollaborators = async () => {
    const input = newCollabInput.trim();
    if (!input) {
      setIsAddingCollaborator(false);
      return;
    }

    const newNames = input.split(',')
      .map(n => n.trim().toUpperCase())
      .filter(n => n !== "");

    const existingNames = order.reviewer ? order.reviewer.split(',').map(n => n.trim()) : [];
    const combined = Array.from(new Set([...existingNames, ...newNames]));
    const finalReviewerString = combined.join(', ');

    const success = await onUpdate({ ...order, reviewer: finalReviewerString });
    
    if (success) {
      setNewCollabInput('');
      setIsAddingCollaborator(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[700] flex items-center justify-center p-4">
      <div className="bg-white w-full max-md rounded-[50px] p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar border border-white/20">
        
        <button onClick={onClose} className="absolute top-6 right-8 p-2.5 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all z-[850] shadow-sm active:scale-90">
          <X size={24} strokeWidth={3}/>
        </button>

        <div className="pt-10 space-y-8">
          
          {/* CABECERA: PEDIDO Y CELDA DE RESPONSABLES */}
          <div className="flex justify-between items-center px-2">
            <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">PEDIDO {order.orderNumber || '---'}</span>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Celda de responsables (Solo Lectura) */}
              <div className="bg-slate-100 border-2 border-slate-200 text-slate-900 px-5 py-3 rounded-2xl shadow-inner flex items-center gap-3 min-w-[140px] max-w-[220px] justify-center overflow-hidden">
                <Users size={14} className="text-indigo-500 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-tight truncate">
                  {order.reviewer || 'SIN ASIGNAR'}
                </span>
              </div>
              
              {!isReadOnly && (
                <div className="relative">
                  <button 
                    onClick={() => setIsAddingCollaborator(!isAddingCollaborator)} 
                    className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 border-2 border-white transition-all z-[900] hover:bg-indigo-700"
                  >
                    <UserPlus size={20} strokeWidth={3}/>
                  </button>

                  {isAddingCollaborator && (
                    <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.4)] rounded-[32px] p-6 z-[1000] animate-in zoom-in">
                      <p className="text-[9px] font-black text-slate-400 uppercase italic mb-3">Agregar Responsable(s)</p>
                      <div className="flex gap-2">
                        <input 
                          className="flex-1 bg-slate-50 p-4 rounded-2xl text-xs font-black uppercase outline-none shadow-inner border border-transparent focus:border-indigo-100" 
                          placeholder="ESCRIBE NOMBRE(S)..." 
                          value={newCollabInput} 
                          onChange={e => setNewCollabInput(e.target.value)} 
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborators()}
                        />
                        <button onClick={handleAddCollaborators} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg">
                          <Check size={20} strokeWidth={4}/>
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-300 mt-3 uppercase font-bold leading-tight italic">Puedes separar varios con coma (,)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DATOS DEL CLIENTE */}
          <div className="text-center bg-slate-50/70 py-10 rounded-[45px] border border-slate-200/50 shadow-inner">
            <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-slate-900 mb-4 px-6">
              {order.customerName}
            </h2>
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

          {/* CONTROLES DE CARGA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-3 italic">Depósito Origen</label>
              <select 
                disabled={isReadOnly} 
                className="w-full bg-slate-100 py-4 px-4 rounded-2xl text-[11px] font-black uppercase shadow-inner outline-none border-2 border-transparent focus:border-indigo-100 transition-all" 
                value={warehouseSelection} 
                onChange={e => setWarehouseSelection(e.target.value)}
              >
                {warehouses.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-3 italic">Formato Bulto</label>
              <select 
                disabled={isReadOnly} 
                className="w-full bg-slate-100 py-4 px-4 rounded-2xl text-[11px] font-black uppercase shadow-inner outline-none border-2 border-transparent focus:border-indigo-100 transition-all" 
                value={packageTypeSelection} 
                onChange={e => setPackageTypeSelection(e.target.value)}
              >
                {packageTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-indigo-50/70 p-7 rounded-[35px] border-2 border-indigo-100 text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Añadir Cant.</span>
              <input 
                disabled={isReadOnly} 
                type="number" 
                className="w-full bg-transparent text-4xl font-black text-indigo-700 outline-none text-center mt-1" 
                value={currentQty || ''} 
                placeholder="0" 
                onChange={e => setCurrentQty(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="bg-orange-50/70 p-7 rounded-[35px] border-2 border-orange-100 text-center">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Acum.</span>
              <p className="text-4xl font-black text-orange-700 mt-1">{totalConfirmedQuantity}</p>
            </div>
          </div>

          {!isReadOnly && (
            <button 
              onClick={() => {
                if (currentQty <= 0) return;
                setConfirmedEntries([...confirmedEntries, { id: Date.now().toString(), deposit: warehouseSelection, type: packageTypeSelection, quantity: currentQty }]);
                setCurrentQty(0);
              }} 
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all hover:bg-black"
            >
              <Plus size={22} strokeWidth={4}/> CONFIRMAR CARGA
            </button>
          )}

          {/* LISTA DE CARGAS */}
          {confirmedEntries.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar p-1">
              {confirmedEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-4 rounded-3xl shadow-sm">
                  <div>
                    <p className="text-[9px] font-black text-indigo-500 uppercase italic leading-none">{e.deposit}</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase mt-1 tracking-tight">{e.type}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-black text-slate-900">{e.quantity}</span>
                    {!isReadOnly && (
                      <button onClick={() => setConfirmedEntries(confirmedEntries.filter(x => x.id !== e.id))} className="text-red-400 p-2 active:scale-90">
                        <Trash size={20}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DATOS DE DESPACHO */}
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white space-y-4 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 opacity-10 rotate-12 -mr-6 -mt-6"><Package size={120}/></div>
             <h3 className="text-[11px] font-black uppercase italic tracking-[0.2em] opacity-80 flex items-center gap-3">
               <Activity size={16}/> Datos de Despacho
             </h3>
             <select 
               disabled={isReadOnly} 
               className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none focus:bg-white/20 transition-all" 
               value={dispatchTypeSelection} 
               onChange={e => setDispatchTypeSelection(e.target.value)}
             >
               {dispatchMainTypes.map(t => <option key={t} className="bg-indigo-700">{t}</option>)}
             </select>
             {dispatchOptions[dispatchTypeSelection] && (
               <select 
                 disabled={isReadOnly} 
                 className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none focus:bg-white/20 transition-all" 
                 value={dispatchValueSelection} 
                 onChange={e => setDispatchValueSelection(e.target.value)}
               >
                 <option className="bg-indigo-700" value="">Seleccionar responsable...</option>
                 {dispatchOptions[dispatchTypeSelection].map(o => <option key={o} value={o} className="bg-indigo-700">{o}</option>)}
               </select>
             )}
          </div>

          {/* BOTONERA DE ACCIÓN CORREGIDA */}
          <div className="space-y-4 pb-4">
            {!isReadOnly ? (
              <button 
                onClick={handleConfirmStage} 
                disabled={isSaving} 
                className="w-full bg-indigo-600 text-white py-6 rounded-[32px] font-black uppercase text-xs flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] active:scale-95 transition-all border-b-4 border-indigo-800 disabled:opacity-50"
              >
                {isSaving ? <Activity className="animate-spin" size={22}/> : <Check size={22} strokeWidth={4}/>}
                CONFIRMACIÓN DE ETAPA
              </button>
            ) : (
              <div className="bg-slate-50 p-6 rounded-[32px] text-center border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PEDIDO EN HISTORIAL</p>
              </div>
            )}
            
            <button 
              onClick={() => window.open(`whatsapp://send?text=${encodeURIComponent('D&G Logística - Pedido de ' + order.customerName + ' ha avanzado a la etapa: ' + order.status)}`)} 
              className="w-full bg-emerald-500 text-white py-5 rounded-[32px] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg hover:bg-emerald-600 transition-all active:scale-95 border-b-4 border-emerald-700"
            >
              <MessageCircle size={22} className="fill-white"/> NOTIFICAR WHATSAPP
            </button>
            
            <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-[32px] font-black uppercase text-[11px] shadow-sm active:scale-95 border-b-4 border-slate-700 transition-all">
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


import React from 'react';
import { Package, Truck, Sparkles, Hash, Users, MapPin, ChevronRight } from 'lucide-react';
import { OrderStatus } from './types.ts';

export function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-5 rounded-[32px] text-white flex flex-col justify-between h-40 text-left shadow-lg relative overflow-hidden active:scale-95 transition-all group`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">{React.cloneElement(icon, { size: 100 })}</div>
      <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">{React.cloneElement(icon, { size: 18 })}</div>
      <div>
        <h3 className="text-4xl font-black italic leading-none mb-1">{count}</h3>
        <p className="text-[10px] font-black uppercase opacity-70 tracking-widest flex items-center gap-1">
          {label} <ChevronRight size={10}/>
        </p>
      </div>
    </button>
  );
}

export function SidebarItem({ icon, label, active, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-indigo-50 text-indigo-600' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

export function NavBtn({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1.5 transition-all flex-1 py-1 ${active ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-50 shadow-inner' : ''}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-tighter text-center leading-none ${active ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>
        {label}
      </span>
    </button>
  );
}

export function OrderCard({ order, onClick }: any) {
  const statusColors = {
    [OrderStatus.PENDING]: 'bg-orange-100 text-orange-600 border-orange-200',
    [OrderStatus.COMPLETED]: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    [OrderStatus.DISPATCHED]: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    [OrderStatus.ARCHIVED]: 'bg-slate-100 text-slate-500 border-slate-200'
  };

  // Cálculo dinámico del total de bultos sumando el detalle acumulado
  const totalBultos = order.detailedPackaging && order.detailedPackaging.length > 0
    ? order.detailedPackaging.reduce((sum: number, entry: any) => sum + (entry.quantity || 0), 0)
    : (order.packageQuantity || 0);

  return (
    <div onClick={onClick} className="bg-white rounded-[35px] border-2 border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all flex h-auto min-h-[160px]">
      {order.source === 'IA' && (
        <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[7px] font-black px-3 py-1.5 rounded-br-2xl uppercase tracking-[0.2em] flex items-center gap-1.5 z-10 shadow-sm">
          <Sparkles size={10}/> IA
        </div>
      )}

      {/* LADO IZQUIERDO: Detalles agrandados */}
      <div className="flex-1 p-6 flex flex-col justify-between border-r border-slate-50">
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-40">
            <span className="text-[11px] font-black uppercase tracking-tighter">PEDIDO N° {order.orderNumber}</span>
            <span className="h-3 w-px bg-slate-300"></span>
            <span className="text-[11px] font-black uppercase tracking-tighter">CTA {order.customerNumber || '---'}</span>
          </div>
          
          <h3 className="font-black text-slate-900 text-xl uppercase italic leading-tight mb-1">
            {order.customerName}
          </h3>
          
          <div className="flex items-center gap-1.5 text-indigo-600 mb-4">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="text-[12px] font-black uppercase italic tracking-tight">{order.locality}</span>
          </div>
        </div>

        <div className="bg-slate-50 self-start px-4 py-2 rounded-2xl flex items-center gap-2">
          <Package size={16} className="text-slate-400" />
          <span className="text-sm font-black text-slate-700">{totalBultos} <span className="text-[10px] text-slate-400 uppercase ml-1">Bultos Totales</span></span>
        </div>
      </div>

      {/* LADO DERECHO: Etapa y Responsables */}
      <div className="w-[35%] bg-slate-50/50 p-6 flex flex-col gap-4">
        <div className={`text-[9px] font-black px-3 py-2 rounded-xl uppercase tracking-widest text-center border ${statusColors[order.status as OrderStatus] || statusColors[OrderStatus.ARCHIVED]}`}>
          {order.status}
        </div>

        <div className="space-y-3">
          {/* Responsables Preparado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 opacity-30">
              <Users size={10} />
              <span className="text-[7px] font-black uppercase tracking-widest">Preparado por:</span>
            </div>
            <p className="text-[10px] font-black text-slate-700 uppercase leading-none truncate">
              {order.reviewer || 'Pte. Asignar'}
            </p>
          </div>

          {/* Responsable Despacho */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 opacity-30">
              <Truck size={10} />
              <span className="text-[7px] font-black uppercase tracking-widest">Despacho por:</span>
            </div>
            <p className="text-[10px] font-black text-indigo-600 uppercase leading-none truncate">
              {order.dispatchValue || order.carrier || 'Pte. Despacho'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

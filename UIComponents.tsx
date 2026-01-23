
import React from 'react';
import { Package, Truck, Sparkles } from 'lucide-react';
import { OrderStatus } from './types.ts';

export function StatCard({ count, label, color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} p-5 rounded-[32px] text-white flex flex-col justify-between h-40 text-left shadow-lg relative overflow-hidden active:scale-95 transition-all`}>
      <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(icon, { size: 100 })}</div>
      <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">{React.cloneElement(icon, { size: 18 })}</div>
      <div><h3 className="text-3xl font-black italic leading-none">{count}</h3><p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{label}</p></div>
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

export function NavBtn({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-300'}`}>
      {React.cloneElement(icon, { size: 22 })}
    </button>
  );
}

export function OrderCard({ order, onClick }: any) {
  return (
    <div onClick={onClick} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden active:scale-95 transition-all">
      {order.source === 'IA' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[7px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-[0.2em] flex items-center gap-1.5"><Sparkles size={10}/> IA</div>}
      <div className="flex justify-between items-start mb-3">
        <div><span className="text-[9px] font-black text-slate-300 uppercase">#{order.orderNumber}</span><span className="text-[10px] font-black text-indigo-600 block italic">{order.locality}</span></div>
        <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${order.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>{order.status}</span>
      </div>
      <h3 className="font-black text-slate-800 text-lg truncate uppercase italic leading-none">{order.customerName}</h3>
      <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-[10px] font-black text-slate-400">
         <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl"><Package size={14}/> {order.packageQuantity || 0} BULTOS</div>
         {order.carrier && <span className="text-indigo-500 italic flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl"><Truck size={12}/> {order.carrier}</span>}
      </div>
    </div>
  );
}

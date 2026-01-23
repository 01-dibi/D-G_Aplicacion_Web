
import React, { useState } from 'react';
import { ArrowLeft, Search, MessageCircle, Activity, Check } from 'lucide-react';
import { OrderStatus } from './types.ts';

export default function CustomerPortal({ onBack, orders }: any) {
  const [s, setS] = useState('');
  const results = orders?.filter((o:any) => (o.customerName?.toLowerCase().includes(s.toLowerCase()) || o.orderNumber?.includes(s)) && o.status !== OrderStatus.ARCHIVED) || [];
  
  return (
    <div className="p-8 space-y-8 max-w-md mx-auto min-h-screen bg-slate-50">
      <header className="flex items-center gap-6"><button onClick={onBack} className="p-4 bg-white rounded-[20px] shadow-sm"><ArrowLeft/></button><h2 className="text-2xl font-black italic uppercase">Rastreo</h2></header>
      <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200" size={18}/><input className="w-full bg-slate-50 p-5 pl-12 rounded-[22px] outline-none font-black text-sm uppercase shadow-inner" placeholder="TU NOMBRE O N° PEDIDO" value={s} onChange={e=>setS(e.target.value)} /></div>
      </div>
      <div className="space-y-6 pb-20">
        {results.map((o:any) => (
          <div key={o.id} className="bg-white p-10 rounded-[48px] shadow-2xl border-b-8 border-emerald-500/20 animate-in slide-in-from-bottom-10 duration-700">
            <h4 className="font-black text-3xl mb-1 uppercase italic leading-none">{o.customerName}</h4>
            <div className="text-[10px] font-black text-slate-300 uppercase mt-3 mb-10 border-l-2 border-emerald-500 pl-3">PEDIDO #{o.orderNumber} • {o.locality}</div>
            <div className="flex justify-between items-center relative">
               {[OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED].map((st, idx) => {
                 const isActive = o.status === st;
                 const isPassed = (o.status === OrderStatus.COMPLETED && st === OrderStatus.PENDING) || (o.status === OrderStatus.DISPATCHED);
                 return (
                   <div key={st} className="flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${isActive ? 'bg-orange-500 text-white border-orange-100 scale-125 shadow-xl' : isPassed ? 'bg-emerald-500 text-white border-emerald-50 shadow-lg' : 'bg-white text-slate-100 border-slate-50'}`}>
                        {isActive ? <Activity size={18}/> : isPassed ? <Check size={20}/> : <span className="text-xs font-black">{idx + 1}</span>}
                      </div>
                      <span className={`text-[8px] font-black uppercase ${isActive ? 'text-orange-600' : isPassed ? 'text-emerald-600' : 'text-slate-300'}`}>{st}</span>
                   </div>
                 );
               })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

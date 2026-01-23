
import React, { useState } from 'react';
import { ArrowLeft, Search, MessageCircle, Activity, Check, Package, History } from 'lucide-react';
import { OrderStatus } from './types.ts';

export default function CustomerPortal({ onBack, orders }: any) {
  const [s, setS] = useState('');
  
  // Lógica de búsqueda mejorada: Incluye N° Cliente e Historial (ARCHIVED)
  // IMPORTANTE: Solo muestra resultados si hay texto en la búsqueda.
  const results = s.trim().length > 0 
    ? orders?.filter((o: any) => 
        (o.customerName?.toLowerCase().includes(s.toLowerCase()) || 
         o.orderNumber?.toString().includes(s) || 
         o.customerNumber?.toString().includes(s))
      ) || [] 
    : [];
  
  const sendGeneralSupportWhatsApp = () => {
    const phone = "543465404527";
    const message = encodeURIComponent("Hola D&G Logística, quisiera realizar una consulta sobre mi pedido.");
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="p-8 space-y-8 max-w-md mx-auto min-h-screen bg-slate-50 relative pb-40">
      <header className="flex items-center gap-6">
        <button 
          onClick={onBack} 
          className="p-4 bg-white rounded-[20px] shadow-sm hover:bg-slate-50 active:scale-95 transition-all border border-slate-100"
        >
          <ArrowLeft className="text-slate-900" />
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Consulta de Pedido</h2>
      </header>

      <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6 border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
          <input 
            className="w-full bg-slate-50 p-5 pl-12 rounded-[22px] outline-none font-black text-sm uppercase shadow-inner border border-transparent focus:border-indigo-100 transition-all" 
            placeholder="NOMBRE, N° PEDIDO O N° CTA" 
            value={s} 
            onChange={e=>setS(e.target.value)} 
          />
        </div>
      </div>

      <div className="space-y-6">
        {results.length > 0 ? results.map((o:any) => (
          <div key={o.id} className="bg-white p-8 rounded-[48px] shadow-2xl border-b-8 border-indigo-500/10 animate-in slide-in-from-bottom-10 duration-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              {o.status === OrderStatus.ARCHIVED ? <History size={80} /> : <Activity size={80} />}
            </div>
            
            <h4 className="font-black text-2xl mb-1 uppercase italic leading-none text-slate-900 pr-10">{o.customerName}</h4>
            <div className="text-[9px] font-black text-slate-400 uppercase mt-3 mb-8 border-l-4 border-indigo-500 pl-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>PEDIDO #{o.orderNumber}</span>
              <span className="text-slate-200">•</span>
              <span>CTA {o.customerNumber || 'S/N'}</span>
              <span className="text-slate-200">•</span>
              <span>{o.locality}</span>
            </div>
            
            {/* LÍNEA DE TIEMPO DE 4 ETAPAS CRONOLÓGICAS */}
            <div className="flex justify-between items-center relative px-1">
               {[OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED].map((st, idx) => {
                 const statusOrder = [OrderStatus.PENDING, OrderStatus.COMPLETED, OrderStatus.DISPATCHED, OrderStatus.ARCHIVED];
                 const currentIdx = statusOrder.indexOf(o.status);
                 const targetIdx = idx;
                 
                 const isActive = o.status === st;
                 const isPassed = targetIdx < currentIdx;
                 
                 return (
                   <div key={st} className="flex flex-col items-center gap-2.5 z-10 flex-1">
                      <div className={`w-11 h-11 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-orange-500 text-white border-orange-100 scale-110 shadow-lg' : isPassed ? 'bg-emerald-500 text-white border-emerald-50 shadow-md' : 'bg-slate-50 text-slate-200 border-white shadow-inner'}`}>
                        {isActive ? <Activity size={18} className="animate-pulse"/> : isPassed ? <Check size={20}/> : <span className="text-[10px] font-black">{idx + 1}</span>}
                      </div>
                      <span className={`text-[7px] font-black uppercase tracking-tighter text-center leading-tight h-4 ${isActive ? 'text-orange-600' : isPassed ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {st === OrderStatus.ARCHIVED ? 'FINALIZADO' : st}
                      </span>
                   </div>
                 );
               })}
               <div className="absolute top-5.5 left-6 right-6 h-0.5 bg-slate-100 -z-0 rounded-full" />
            </div>
          </div>
        )) : s.trim().length > 0 ? (
          <div className="text-center py-20 opacity-30">
            <Search size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-800">No se encontraron resultados</p>
          </div>
        ) : (
          <div className="text-center py-20 opacity-20">
            <Package size={60} className="mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed text-slate-800">Realiza una búsqueda para<br/>ver tus pedidos</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-[100]">
        <button 
          onClick={sendGeneralSupportWhatsApp}
          className="w-full bg-emerald-500 text-white py-6 rounded-[32px] font-black uppercase text-xs flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] active:scale-95 transition-all border-b-4 border-emerald-700"
        >
          <MessageCircle size={22} className="fill-white" />
          CONSULTA WHATSAPP
        </button>
      </div>
    </div>
  );
}

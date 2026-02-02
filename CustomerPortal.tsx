
import React, { useState } from 'react';
import { ArrowLeft, Search, MessageCircle, Activity, Check, Package, History, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { OrderStatus, Order } from './types.ts';

export default function CustomerPortal({ onBack, orders }: { onBack: () => void, orders: Order[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Ejecuta la búsqueda de forma segura utilizando coincidencia exacta.
   * Por seguridad, no se muestran resultados parciales durante la escritura.
   */
  const handleSearch = () => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    
    // Feedback visual del proceso de validación
    setTimeout(() => {
      const filtered = orders?.filter((o: Order) => 
        o.customerNumber?.toString().toLowerCase() === cleanQuery
      ) || [];
      
      setResults(filtered);
      setHasSearched(true);
      setIsSearching(false);
    }, 400);
  };

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
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Consulta Clientes</h2>
      </header>

      {/* Entrada de búsqueda con disparador explícito */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6 border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
          <input 
            type="text"
            inputMode="numeric"
            className="w-full bg-slate-50 p-5 pl-12 pr-16 rounded-[22px] outline-none font-black text-sm uppercase shadow-inner border border-transparent focus:border-indigo-100 transition-all" 
            placeholder="N° DE CLIENTE EXACTO..." 
            value={query} 
            onChange={e => {
              setQuery(e.target.value);
              if (hasSearched) setHasSearched(false);
            }} 
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} strokeWidth={3} />}
          </button>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase text-center italic tracking-widest leading-relaxed">
          Debe ingresar su número completo de cuenta para visualizar su cronología personal.
        </p>
      </div>

      <div className="space-y-6">
        {results.length > 0 ? (
          results.map((o: any) => (
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
              
              {/* Timeline de estados */}
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
          ))
        ) : hasSearched ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-800 px-10">
              No se encontraron pedidos vinculados al número de cuenta <span className="text-indigo-600">"{query}"</span>
            </p>
          </div>
        ) : (
          <div className="text-center py-20 opacity-40">
            <Package size={60} className="mx-auto mb-4 text-slate-300" />
            <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed text-slate-800">
              Ingrese su número de cuenta completo<br/>y presione la flecha para consultar
            </p>
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

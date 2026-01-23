
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Search, ArrowLeft } from 'lucide-react';

export function LandingScreen({ onSelectStaff, onSelectCustomer }: any) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[2000]">
      <div className="text-center mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
        <h1 className="text-8xl font-black italic text-white tracking-tighter leading-none mb-4">D<span className="text-orange-500">&</span>G</h1>
        <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full"></div>
        <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] italic mt-4">Logística Inteligente</p>
      </div>
      <div className="w-full max-w-sm space-y-5 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <button onClick={onSelectStaff} className="w-full bg-slate-900/50 border border-white/10 text-white p-8 rounded-[40px] flex items-center gap-6"><div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-lg"><ShieldCheck size={28}/></div><div className="text-left"><h4 className="font-black uppercase text-base italic">Acceso Operativo</h4><p className="text-[9px] opacity-40 uppercase font-black">Gestión</p></div><ArrowRight size={24}/></button>
        <button onClick={onSelectCustomer} className="w-full bg-emerald-600/10 border border-emerald-500/20 text-white p-8 rounded-[40px] flex items-center gap-6"><div className="w-14 h-14 bg-emerald-500 text-white rounded-[24px] flex items-center justify-center shadow-lg"><Search size={28}/></div><div className="text-left"><h4 className="font-black uppercase text-base italic">Consulta Clientes</h4><p className="text-[9px] text-emerald-400 font-black">Rastreo</p></div><ArrowRight size={24}/></button>
      </div>
    </div>
  );
}

export function LoginModal({ onLogin, onBack }: any) {
  const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8 z-[1000]">
      <div className="bg-white w-full max-w-sm rounded-[48px] p-12 text-center space-y-8 shadow-2xl relative animate-in zoom-in duration-300">
        <button onClick={onBack} className="absolute top-10 left-10 text-slate-200"><ArrowLeft size={24}/></button>
        <div className="pt-4 flex flex-col items-center"><h1 className="text-7xl font-black italic text-slate-900 leading-none mb-10">D<span className="text-orange-500">&</span>G</h1><h1 className="text-4xl font-black italic text-slate-800 mb-2">Ingreso</h1></div>
        <input className="w-full bg-slate-50 p-6 rounded-[24px] text-center font-black text-lg outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" placeholder="CÓDIGO ID" value={n} onChange={e=>setN(e.target.value)} />
        <button onClick={()=>onLogin({name:n||'OPERADOR'})} className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase text-xs flex items-center justify-center gap-3">ACCEDER <ArrowRight size={18}/></button>
      </div>
    </div>
  );
}

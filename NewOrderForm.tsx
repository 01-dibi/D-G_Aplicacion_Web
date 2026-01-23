
import React, { useState, useRef } from 'react';
import { Type as TypeIcon, Sparkles, MessageSquareText, FileText, UploadCloud, Hash, UserCheck, MapPin, PlusSquare, Loader2 } from 'lucide-react';
import { analyzeOrderText, analyzeOrderMedia } from './geminiService.ts';

export default function NewOrderForm({ onAdd, isSaving }: any) {
  const [mode, setMode] = useState<'MANUAL' | 'IA'>('MANUAL');
  const [iaMode, setIaMode] = useState<'TEXT' | 'MEDIA'>('TEXT');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [form, setForm] = useState({ orderNumber: '', customerNumber: '', name: '', locality: '', notes: '', source: 'Manual' as any });
  const [rawInput, setRawInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiText = async () => {
    setIsAiProcessing(true);
    const result = await analyzeOrderText(rawInput);
    if (result?.customerName) {
      setForm({...form, name: result.customerName.toUpperCase(), locality: (result.locality || '').toUpperCase(), source: 'IA'});
      setMode('MANUAL');
    } else alert("La IA no detectó datos claros.");
    setIsAiProcessing(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center"><h2 className="text-2xl font-black italic uppercase leading-none mb-1">Carga de Pedido</h2><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">D&G Logística</p></div>
      <div className="flex bg-slate-100 p-1 rounded-[20px] max-w-[280px] mx-auto">
        <button onClick={() => setMode('MANUAL')} className={`flex-1 py-2.5 rounded-[15px] text-[10px] font-black uppercase ${mode === 'MANUAL' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Manual</button>
        <button onClick={() => setMode('IA')} className={`flex-1 py-2.5 rounded-[15px] text-[10px] font-black uppercase ${mode === 'IA' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>IA</button>
      </div>

      {mode === 'IA' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setIaMode('TEXT')} className={`py-6 rounded-[28px] border-2 flex flex-col items-center gap-3 ${iaMode === 'TEXT' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50'}`}><MessageSquareText size={24}/><span className="text-[9px] font-black uppercase">Texto</span></button>
            <button onClick={() => setIaMode('MEDIA')} className={`py-6 rounded-[28px] border-2 flex flex-col items-center gap-3 ${iaMode === 'MEDIA' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50'}`}><FileText size={24}/><span className="text-[9px] font-black uppercase">Foto</span></button>
          </div>
          {iaMode === 'TEXT' && (
            <div className="space-y-4">
              <textarea className="w-full bg-slate-50 p-6 rounded-[32px] font-bold outline-none min-h-[160px] uppercase text-xs shadow-inner" placeholder="PEGA EL WHATSAPP..." value={rawInput} onChange={e => setRawInput(e.target.value)} />
              <button disabled={isAiProcessing} onClick={handleAiText} className="w-full bg-indigo-600 text-white py-6 rounded-[24px] font-black uppercase text-[12px] flex items-center justify-center gap-4">{isAiProcessing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} ANALIZAR</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase" value={form.orderNumber} onChange={e=>setForm({...form, orderNumber: e.target.value})} placeholder="N° ORDEN" />
            <input className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase" value={form.customerNumber} onChange={e=>setForm({...form, customerNumber: e.target.value})} placeholder="N° CLIENTE" />
          </div>
          <input className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase border-2 border-indigo-100" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="RAZÓN SOCIAL" />
          <input className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase border-2 border-indigo-100" value={form.locality} onChange={e=>setForm({...form, locality: e.target.value})} placeholder="LOCALIDAD" />
          <button onClick={() => onAdd(form)} className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase text-xs flex items-center justify-center gap-4"><PlusSquare size={20}/> REGISTRAR</button>
        </div>
      )}
    </div>
  );
}

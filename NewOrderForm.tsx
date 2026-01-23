
import React, { useState, useRef } from 'react';
import { Type as TypeIcon, Sparkles, MessageSquareText, FileText, UploadCloud, Hash, UserCheck, MapPin, PlusSquare, Loader2 } from 'lucide-react';
import { analyzeOrderText, analyzeOrderMedia } from './geminiService.ts';

export default function NewOrderForm({ onAdd, isSaving }: any) {
  const [mode, setMode] = useState<'MANUAL' | 'IA'>('MANUAL');
  const [iaMode, setIaMode] = useState<'TEXT' | 'MEDIA'>('TEXT');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [form, setForm] = useState({ 
    orderNumber: '', 
    customerNumber: '', 
    customerName: '', // Corregido de 'name' a 'customerName'
    locality: '', 
    notes: '', 
    source: 'Manual' as any 
  });
  const [rawInput, setRawInput] = useState('');

  const handleAiText = async () => {
    if (!rawInput.trim()) return;
    setIsAiProcessing(true);
    const result = await analyzeOrderText(rawInput);
    if (result?.customerName) {
      setForm({
        ...form, 
        customerName: result.customerName.toUpperCase(), 
        locality: (result.locality || '').toUpperCase(), 
        source: 'IA'
      });
      setMode('MANUAL');
    } else {
      alert("La IA no detectó datos claros. Por favor, completa manualmente.");
    }
    setIsAiProcessing(false);
  };

  const handleManualSubmit = () => {
    if (!form.customerName.trim()) {
      alert("La Razón Social es obligatoria");
      return;
    }
    onAdd(form);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-black italic uppercase leading-none mb-1 text-slate-900">Carga de Pedido</h2>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">D&G Logística</p>
      </div>
      
      <div className="flex bg-slate-100 p-1 rounded-[20px] max-w-[280px] mx-auto shadow-inner">
        <button 
          onClick={() => setMode('MANUAL')} 
          className={`flex-1 py-2.5 rounded-[15px] text-[10px] font-black uppercase transition-all ${mode === 'MANUAL' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
        >
          Manual
        </button>
        <button 
          onClick={() => setMode('IA')} 
          className={`flex-1 py-2.5 rounded-[15px] text-[10px] font-black uppercase transition-all ${mode === 'IA' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
        >
          IA ✨
        </button>
      </div>

      {mode === 'IA' ? (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setIaMode('TEXT')} 
              className={`py-6 rounded-[28px] border-2 flex flex-col items-center gap-3 transition-all ${iaMode === 'TEXT' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}
            >
              <MessageSquareText size={24}/>
              <span className="text-[9px] font-black uppercase">Mensaje</span>
            </button>
            <button 
              disabled
              className="py-6 rounded-[28px] border-2 flex flex-col items-center gap-3 border-slate-50 text-slate-200 opacity-50 cursor-not-allowed"
            >
              <FileText size={24}/>
              <span className="text-[9px] font-black uppercase">Foto (Próximamente)</span>
            </button>
          </div>
          
          {iaMode === 'TEXT' && (
            <div className="space-y-4">
              <textarea 
                className="w-full bg-slate-50 p-6 rounded-[32px] font-bold outline-none min-h-[160px] uppercase text-xs shadow-inner border-2 border-transparent focus:border-indigo-100 transition-all" 
                placeholder="PEGA AQUÍ EL TEXTO DE WHATSAPP O EL PEDIDO..." 
                value={rawInput} 
                onChange={e => setRawInput(e.target.value)} 
              />
              <button 
                disabled={isAiProcessing || !rawInput.trim()} 
                onClick={handleAiText} 
                className="w-full bg-indigo-600 text-white py-6 rounded-[24px] font-black uppercase text-[12px] flex items-center justify-center gap-4 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isAiProcessing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} 
                ANALIZAR CON IA
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">N° ORDEN</label>
              <input 
                className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase shadow-inner border border-transparent focus:border-indigo-200" 
                value={form.orderNumber} 
                onChange={e=>setForm({...form, orderNumber: e.target.value})} 
                placeholder="0000" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">N° CLIENTE</label>
              <input 
                className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase shadow-inner border border-transparent focus:border-indigo-200" 
                value={form.customerNumber} 
                onChange={e=>setForm({...form, customerNumber: e.target.value})} 
                placeholder="C00" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2">RAZÓN SOCIAL (CLIENTE)</label>
            <input 
              className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase border-2 border-indigo-50 focus:border-indigo-500 transition-all shadow-sm" 
              value={form.customerName} 
              onChange={e=>setForm({...form, customerName: e.target.value})} 
              placeholder="NOMBRE DEL COMERCIO..." 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2">LOCALIDAD</label>
            <input 
              className="w-full bg-slate-50 p-5 rounded-[22px] font-black outline-none uppercase border-2 border-indigo-50 focus:border-indigo-500 transition-all shadow-sm" 
              value={form.locality} 
              onChange={e=>setForm({...form, locality: e.target.value})} 
              placeholder="CIUDAD..." 
            />
          </div>

          <button 
            onClick={handleManualSubmit} 
            disabled={isSaving}
            className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase text-xs flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <PlusSquare size={20}/>} 
            REGISTRAR PEDIDO
          </button>
        </div>
      )}
    </div>
  );
}

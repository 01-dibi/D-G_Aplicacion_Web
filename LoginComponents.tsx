
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Search, ArrowLeft, Loader2, KeyRound, User, AlertCircle, Database, AlertTriangle, WifiOff } from 'lucide-react';
import { supabase, connectionStatus } from './supabaseClient.ts';

export function LandingScreen({ onSelectStaff, onSelectCustomer }: any) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[2000]">
      <div className="text-center mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
        <h1 className="text-8xl font-black italic text-white tracking-tighter leading-none mb-4">D<span className="text-orange-500">&</span>G</h1>
        <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full"></div>
        <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] italic mt-4">Logística Inteligente</p>
      </div>
      <div className="w-full max-sm space-y-5 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <button onClick={onSelectStaff} className="w-full bg-slate-900/50 border border-white/10 text-white p-8 rounded-[40px] flex items-center gap-6 group transition-all active:scale-95"><div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-lg group-hover:bg-indigo-500"><ShieldCheck size={28}/></div><div className="text-left"><h4 className="font-black uppercase text-base italic">Acceso Operativo</h4><p className="text-[9px] opacity-40 uppercase font-black">Gestión</p></div><ArrowRight size={24}/></button>
        <button onClick={onSelectCustomer} className="w-full bg-emerald-600/10 border border-emerald-500/20 text-white p-8 rounded-[40px] flex items-center gap-6 group transition-all active:scale-95"><div className="w-14 h-14 bg-emerald-500 text-white rounded-[24px] flex items-center justify-center shadow-lg group-hover:bg-emerald-400"><Search size={28}/></div><div className="text-left"><h4 className="font-black uppercase text-base italic">Consulta Clientes</h4><p className="text-[9px] text-emerald-400 font-black">Busqueda</p></div><ArrowRight size={24}/></button>
      </div>
    </div>
  );
}

export function LoginModal({ onLogin, onBack }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [showBypass, setShowBypass] = useState(false);

  // Si hay un error persistente, mostramos el bypass automáticamente después de 1 segundo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setShowBypass(true), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Escribe tu nombre y una clave');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Intento de conexión con Supabase
      const { data: user, error: fetchError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.toUpperCase().trim())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!user) {
        // Registro automático
        if (confirm(`¿Registrar nuevo operador "${username.toUpperCase()}"?`)) {
          const { error: insErr } = await supabase
            .from('app_users')
            .insert([{ username: username.toUpperCase().trim(), password_hash: password }]);
          if (insErr) throw insErr;
          onLogin({ name: username.toUpperCase().trim(), mode: 'cloud' });
        }
      } else {
        if (isResetMode) {
          const { error: updErr } = await supabase
            .from('app_users')
            .update({ password_hash: password })
            .eq('username', username.toUpperCase().trim());
          if (updErr) throw updErr;
          alert("Clave actualizada.");
          setIsResetMode(false);
        } else {
          if (user.password_hash === password) {
            onLogin({ name: username.toUpperCase().trim(), mode: 'cloud' });
          } else {
            setError('Contraseña incorrecta');
          }
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError("Fallo de conexión con Supabase. Usa el botón de abajo para entrar.");
      setShowBypass(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyEntry = () => {
    const name = username.trim() || "OPERADOR";
    onLogin({ name: name.toUpperCase(), mode: 'local' });
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[1000] overflow-y-auto">
      <div className="bg-white w-full max-w-sm rounded-[48px] p-8 md:p-12 text-center space-y-6 shadow-2xl relative animate-in zoom-in duration-300">
        <button onClick={onBack} className="absolute top-10 left-10 text-slate-200 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24}/>
        </button>

        <div className="pt-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center mb-6 shadow-inner">
             <Database className="text-orange-500" size={32} />
          </div>
          <h1 className="text-3xl font-black italic text-slate-800 mb-1 uppercase tracking-tighter">
            Ingreso D&G
          </h1>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Protocolo de Emergencia</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-4">Nombre</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" 
                placeholder="TU NOMBRE" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-4">Clave</label>
            <div className="relative">
              <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password"
                className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" 
                placeholder="CUALQUIER CLAVE" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 text-amber-700 p-5 rounded-[24px] border border-amber-100 flex flex-col items-center gap-2 text-center animate-in shake">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span className="text-[9px] font-black uppercase">Fallo de Servidor</span>
            </div>
            <p className="text-[8px] font-bold opacity-80 leading-tight">Usa el botón "ENTRAR SIN CONEXIÓN" para continuar sin problemas.</p>
          </div>
        )}

        <div className="space-y-3">
          <button 
            onClick={handleAuth} 
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
            INICIAR SESIÓN (NUBE)
          </button>

          <button 
            onClick={handleEmergencyEntry}
            className="w-full bg-indigo-600 text-white py-6 rounded-[24px] font-black uppercase text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border-b-4 border-indigo-800"
          >
            <WifiOff size={20}/> ENTRAR SIN CONEXIÓN (LOCAL)
          </button>
        </div>

        <button 
          onClick={() => { setIsResetMode(!isResetMode); setError(''); }} 
          className="text-[9px] font-black uppercase text-indigo-400 tracking-tight hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          {isResetMode ? '← VOLVER' : '¿BLANQUEAR CLAVE EN NUBE?'}
        </button>
      </div>
    </div>
  );
}

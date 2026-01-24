
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Search, ArrowLeft, Loader2, KeyRound, User, AlertCircle, Database } from 'lucide-react';
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

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Complete todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Verificar si hay conexión básica
      if (!connectionStatus.isConfigured) {
        throw new Error("Supabase no está configurado correctamente en las variables de entorno.");
      }

      // 2. Intentar buscar al usuario
      const { data: user, error: fetchError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.toUpperCase().trim())
        .maybeSingle(); // Usamos maybeSingle para evitar el error PGRST116

      if (fetchError) {
        if (fetchError.message.includes("relation \"app_users\" does not exist")) {
          throw new Error("ERROR ADMIN: La tabla 'app_users' no existe en Supabase. Por favor, créala para habilitar el login.");
        }
        throw fetchError;
      }

      if (!user) {
        // MODO REGISTRO POR PRIMERA VEZ
        if (confirm(`El usuario "${username.toUpperCase()}" no existe. ¿Deseas registrarlo con la contraseña ingresada?`)) {
          const { error: insertError } = await supabase
            .from('app_users')
            .insert([{ username: username.toUpperCase().trim(), password_hash: password }]);
          
          if (insertError) throw insertError;
          onLogin({ name: username.toUpperCase().trim() });
        }
      } else {
        // MODO LOGIN / BLANQUEO
        if (isResetMode) {
          // BLANQUEO DE CLAVE (Protocolo Admin)
          const { error: updateError } = await supabase
            .from('app_users')
            .update({ password_hash: password })
            .eq('username', username.toUpperCase().trim());
          
          if (updateError) throw updateError;
          alert("Contraseña blanqueada con éxito. Ya puedes ingresar.");
          setIsResetMode(false);
        } else {
          // LOGIN NORMAL
          if (user.password_hash === password) {
            onLogin({ name: username.toUpperCase().trim() });
          } else {
            setError('Contraseña incorrecta');
          }
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
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
            {isResetMode ? 'Blanqueo Clave' : 'Ingreso D&G'}
          </h1>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Protocolo Administrativo</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-4">Nombre de Operador</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" 
                placeholder="EJ: ADMIN" 
                value={username} 
                onChange={e => { setUsername(e.target.value); setError(''); }} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-4">Contraseña Personal</label>
            <div className="relative">
              <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password"
                className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => { setPassword(e.target.value); setError(''); }} 
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-[24px] border border-red-100 flex items-start gap-3 text-left animate-in shake">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span className="text-[9px] font-black uppercase leading-tight">{error}</span>
          </div>
        )}

        <button 
          onClick={handleAuth} 
          disabled={isLoading}
          className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
          {isResetMode ? 'CAMBIAR CONTRASEÑA' : 'INICIAR SESIÓN'}
        </button>

        <div className="pt-2">
          <button 
            onClick={() => { setIsResetMode(!isResetMode); setError(''); }} 
            className="text-[9px] font-black uppercase text-indigo-600 tracking-tight hover:underline flex items-center justify-center gap-2 mx-auto"
          >
            {isResetMode ? '← VOLVER AL INICIO' : '¿PROBLEMAS CON LA CLAVE? BLANQUEO'}
          </button>
        </div>
      </div>
    </div>
  );
}

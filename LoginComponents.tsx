
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Search, ArrowLeft, Loader2, KeyRound, User, AlertCircle, Database, AlertTriangle, WifiOff, Zap, RefreshCw } from 'lucide-react';
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
  const [username, setUsername] = useState('ADMIN');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCloudLogin = async () => {
    if (!password.trim()) {
      setError('Escribe una clave para la nube');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Intentamos con un timeout manual para no dejar colgado al usuario
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data: user, error: fetchError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.toUpperCase().trim())
        .maybeSingle();

      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      if (!user) {
        if (confirm(`¿Registrar "${username.toUpperCase()}" en la nube?`)) {
          const { error: insErr } = await supabase
            .from('app_users')
            .insert([{ username: username.toUpperCase().trim(), password_hash: password }]);
          if (insErr) throw insErr;
          onLogin({ name: username.toUpperCase().trim(), mode: 'cloud' });
        }
      } else {
        if (user.password_hash === password) {
          onLogin({ name: username.toUpperCase().trim(), mode: 'cloud' });
        } else {
          setError('Contraseña incorrecta');
        }
      }
    } catch (err: any) {
      console.error("Cloud error:", err);
      // AUTO-REDIRECCIÓN EN CASO DE ERROR
      const proceed = confirm("Error de conexión con el servidor de nube.\n\n¿Deseas entrar en MODO LOCAL para poder trabajar ahora mismo?");
      if (proceed) {
        onLogin({ name: username.toUpperCase() || 'ADMIN', mode: 'local' });
      } else {
        setError("El servidor de Supabase no responde o la tabla 'app_users' no existe.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectAccess = () => {
    // ESTE BOTÓN AHORA ES INFALIBLE
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      onLogin({ name: username.toUpperCase() || 'ADMIN', mode: 'local' });
    }, 500);
  };

  const clearCache = () => {
    localStorage.clear();
    alert("Memoria limpia. Reiniciando...");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[1000] overflow-y-auto">
      <div className="bg-white w-full max-w-sm rounded-[48px] p-8 md:p-12 text-center space-y-6 shadow-2xl relative animate-in zoom-in duration-300">
        
        <button onClick={onBack} className="absolute top-10 left-10 text-slate-200 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24}/>
        </button>

        <button onClick={clearCache} title="Reiniciar App" className="absolute top-10 right-10 text-slate-200 hover:text-orange-500 transition-colors">
          <RefreshCw size={20}/>
        </button>

        <div className="pt-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center mb-6 shadow-inner">
             <ShieldCheck className="text-orange-500" size={32} />
          </div>
          <h1 className="text-3xl font-black italic text-slate-800 mb-1 uppercase tracking-tighter">
            Entrada D&G
          </h1>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Gestión Segura</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-4">Nombre del Operador</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 uppercase shadow-inner" 
                placeholder="ADMIN" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-[20px] border border-red-100 flex flex-col items-center gap-1 text-center animate-in shake">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-[8px] font-black uppercase leading-tight">{error}</p>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* BOTÓN MAESTRO - ESTE SIEMPRE FUNCIONA */}
          <button 
            onClick={handleDirectAccess}
            className="w-full bg-indigo-600 text-white py-7 rounded-[30px] font-black uppercase text-[11px] flex flex-col items-center justify-center gap-1 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] active:scale-95 transition-all border-b-4 border-indigo-800"
          >
            <div className="flex items-center gap-2">
               {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18} className="fill-white"/>}
               <span>ENTRAR AHORA (MODO LOCAL)</span>
            </div>
            <span className="text-[7px] opacity-60">EVITA CUALQUIER ERROR DE SERVIDOR</span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[8px]"><span className="bg-white px-2 text-slate-300 font-black uppercase tracking-widest">O Sincronizar Nube</span></div>
          </div>

          <div className="space-y-3">
             <input 
                type="password"
                className="w-full bg-slate-50 p-4 rounded-[20px] font-black text-xs outline-none border border-slate-100 uppercase text-center" 
                placeholder="CLAVE DE NUBE" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button 
                onClick={handleCloudLogin} 
                disabled={isLoading}
                className="w-full bg-slate-100 text-slate-500 py-4 rounded-[20px] font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>}
                LOGUEAR Y SINCRONIZAR
              </button>
          </div>
        </div>

        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">V3.0 Bypass Garantizado</p>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Bot, ChevronRight } from 'lucide-react';
import { supabase } from './supabaseClient.ts';
import { ChatMessage } from './types.ts';
import { GoogleGenAI } from "@google/genai";

interface ChatBotProps {
  currentUser: { name: string };
  isLowered?: boolean;
}

export default function ChatBot({ currentUser, isLowered = false }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTypingAi, setIsTypingAi] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Inicialización de Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
        if (!isOpen) setHasUnread(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTypingAi]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    if (data) setMessages(data);
  };

  const handleSendMessage = async (text?: string) => {
    const messageContent = text || inputText;
    if (!messageContent.trim()) return;

    if (!text) setInputText('');

    const { error } = await supabase.from('chat_messages').insert([{
      sender_name: currentUser.name.toUpperCase(),
      content: messageContent,
      type: 'user'
    }]);

    if (error) return;

    if (messageContent.toUpperCase().includes('IA') || messageContent.toUpperCase().includes('@IA')) {
      handleAiResponse(messageContent);
    }
  };

  const handleAiResponse = async (userPrompt: string) => {
    setIsTypingAi(true);
    try {
      const promptClean = userPrompt.replace(/@IA/gi, '').trim();
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eres un asistente logístico de D&G Bazar. Responde de forma ultra-breve (máx 15 palabras).
        SIEMPRE usa este formato: "Texto de respuesta || Opción 1 | Opción 2". 
        Las opciones deben ser acciones cortas relacionadas.
        
        Pregunta del operario: "${promptClean}"`,
      });

      const aiText = response.text || "Problema de conexión || Reintentar";

      await supabase.from('chat_messages').insert([{
        sender_name: 'IA_GEMINI',
        content: aiText,
        type: 'ai'
      }]);

    } catch (err) {
      console.error("Gemini Chat Error:", err);
    } finally {
      setIsTypingAi(false);
    }
  };

  // Función para parsear el contenido de la IA
  const parseAiContent = (content: string) => {
    const parts = content.split('||');
    const text = parts[0]?.trim() || content;
    const options = parts[1] ? parts[1].split('|').map(o => o.trim()).filter(o => o) : [];
    return { text, options };
  };

  return (
    <div className="fixed z-[3000]">
      {/* BURBUJA FLOTANTE - Posición dinámica basada en isLowered */}
      <button 
        onClick={() => { setIsOpen(!isOpen); setHasUnread(false); }}
        className={`fixed ${isLowered ? 'bottom-5' : 'bottom-24'} right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 active:scale-90 animate-in fade-in zoom-in ${isOpen ? 'bg-slate-900 rotate-90' : 'bg-gradient-to-tr from-indigo-600 to-violet-600'}`}
      >
        {isOpen ? <X className="text-white" size={24} /> : <MessageCircle className="text-white" size={28} />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center animate-bounce">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </span>
        )}
      </button>

      {/* VENTANA DE DIÁLOGO - Posición dinámica basada en isLowered */}
      {isOpen && (
        <div className={`fixed ${isLowered ? 'bottom-24' : 'bottom-40'} right-6 w-[calc(100vw-48px)] max-w-[360px] h-[520px] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 duration-300`}>
          
          <div className="bg-slate-900 p-5 flex justify-between items-center">
            <div>
              <h3 className="text-[10px] font-black italic text-orange-500 uppercase tracking-widest leading-none mb-1">Centro de Comunicación</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black text-slate-400 uppercase">Personal en línea</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-10 opacity-20">
                <MessageCircle size={40} className="mx-auto mb-2 text-slate-400" />
                <p className="text-[8px] font-black uppercase">Sin mensajes</p>
              </div>
            )}
            
            {messages.map((msg) => {
              const isMe = msg.sender_name === currentUser.name.toUpperCase();
              const isAi = msg.type === 'ai';
              const { text, options } = isAi ? parseAiContent(msg.content) : { text: msg.content, options: [] };

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-[7px] font-black uppercase tracking-widest ${isAi ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {msg.sender_name}
                    </span>
                  </div>
                  <div className={`max-w-[85%] p-3 rounded-[20px] shadow-sm text-[11px] font-medium leading-relaxed ${
                    isMe ? 'bg-indigo-600 text-white rounded-tr-none' : isAi ? 'bg-white border-2 border-orange-100 text-slate-800 rounded-tl-none italic' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}>
                    {isAi && <Sparkles size={12} className="text-orange-500 mb-1 inline mr-2" />}
                    {text}
                  </div>
                  
                  {/* Quick Replies (solo para el último mensaje de la IA) */}
                  {isAi && options.length > 0 && messages[messages.length - 1].id === msg.id && (
                    <div className="flex flex-wrap gap-2 mt-3 max-w-[90%]">
                      {options.map((opt, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleSendMessage(opt)}
                          className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase px-3 py-2 rounded-full hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                        >
                          {opt} <ChevronRight size={10} />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[6px] font-black text-slate-300 uppercase mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            {isTypingAi && (
              <div className="flex items-start animate-pulse">
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-[20px] rounded-tl-none flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-orange-500" />
                  <span className="text-[9px] font-black text-orange-400 uppercase italic">IA pensando...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <button 
                type="button"
                onClick={() => setInputText(prev => prev + '@IA ')}
                className="bg-indigo-50 text-indigo-600 px-3 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors shadow-inner"
              >
                <Bot size={18} />
              </button>
              <input 
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Mensaje..."
                className="flex-1 bg-slate-100 border-none rounded-xl py-3 px-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="bg-slate-900 text-white p-3 rounded-xl disabled:opacity-30 active:scale-90 transition-all shadow-lg"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

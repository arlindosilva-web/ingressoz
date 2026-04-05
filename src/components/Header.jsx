import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { User, ShoppingBag, LogOut, ChevronDown } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);


  return (
    // O HEADER É O COMANDANTE (z-[100]) - SEM OVERFLOW HIDDEN
    // O Header não tem z-index, ele é só um container transparente
    <header className="relative w-full">
      
      {/* CAMADA 0: O FUNDO VERDE (Fica lá atrás de tudo) */}
      <div className="absolute inset-0 bg-green-600 rounded-b-[60px] shadow-2xl z-0"></div>

      {/* CAMADA 100: O CONTEÚDO (Logo e Botão Conta - Ficam na frente) */}
      <div className="relative z-[100] max-w-5xl mx-auto flex justify-between items-center pt-12 pb-28 px-6">
        
        {/* LOGO */}
        <div onClick={() => navigate('/')} className="cursor-pointer text-white">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">IngressoZ</h1>
          <p className="text-green-100 font-bold opacity-80 uppercase text-[10px] tracking-widest mt-1">Sua reserva em um clique</p>
        </div>

        {/* ÁREA DO USUÁRIO */}
        <div className="relative">
          {session ? (
            <>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md p-1.5 pr-5 rounded-full border border-white/30 transition-all text-white shadow-lg"
              >
                <div className="w-10 h-10 bg-white text-green-600 rounded-full flex items-center justify-center font-black">
                  {session.user.email[0].toUpperCase()}
                </div>
                <span className="hidden md:block text-[10px] font-black uppercase tracking-widest italic">Minha Conta</span>
                <ChevronDown size={14} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* MENU DROPDOWN - Z-INDEX ALTÍSSIMO (999) */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-4 w-64 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-[999] animate-in fade-in zoom-in duration-200">
                  {/* ... itens do menu (Meus Dados, Meus Pedidos, Sair) ... */}
                  <div className="p-2">
                     <button onClick={() => {setIsMenuOpen(false); navigate('/perfil')}} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl text-slate-800 font-black uppercase italic text-xs tracking-widest text-left">
                        <User size={18} className="text-green-600" /> Meus Dados
                     </button>
                     <button onClick={() => {setIsMenuOpen(false); navigate('/meus-pedidos')}} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl text-slate-800 font-black uppercase italic text-xs tracking-widest text-left">
                        <ShoppingBag size={18} className="text-green-600" /> Meus Pedidos
                     </button>
                     <div className="h-px bg-slate-100 my-2 mx-4"></div>
                     <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-2xl text-red-500 font-black uppercase italic text-xs tracking-widest text-left">
                        <LogOut size={18} /> Sair
                     </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="bg-white text-green-600 px-8 py-3 rounded-full font-black uppercase text-xs shadow-xl">Entrar</button>
          )}
        </div>
      </div>
    </header>
  );
}
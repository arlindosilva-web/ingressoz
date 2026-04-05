import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, Send, ArrowLeft, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function Recovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Envia o link de recuperação para o e-mail do usuário
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (recoveryError) throw recoveryError;

      // Se deu certo, mostra a mensagem de sucesso
      setEmailSent(true);

    } catch (err) {
      setError('E-mail não encontrado ou erro no servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* TOPO VERDE PREMIUM */}
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Recuperar Senha</h1>
          <p className="text-green-100 font-bold opacity-80 uppercase text-[10px] tracking-[0.2em] mt-2">IngressoZ • Segurança Total</p>
        </div>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </header>

      <main className="max-w-md mx-auto p-4 -mt-12 relative z-20">
        <div className="bg-white p-8 md:p-12 rounded-[45px] shadow-2xl border border-slate-100">
          
          {/* MENSAGEM DE SUCESSO APÓS ENVIAR E-MAIL */}
          {emailSent ? (
            <div className="text-center py-10 animate-in zoom-in duration-500">
               <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-xl shadow-green-100">
                  <CheckCircle2 size={40} />
               </div>
               <h2 className="text-2xl font-black text-slate-800 uppercase italic">E-mail Enviado!</h2>
               <p className="text-slate-400 font-bold text-sm mt-4 px-4 leading-relaxed">
                 Enviamos um link de recuperação para <span className="text-slate-900">{email}</span>. Verifique sua caixa de entrada e spam.
               </p>
               <button 
                 onClick={() => navigate('/login')}
                 className="mt-10 w-full bg-slate-900 text-white p-5 rounded-[28px] font-black italic uppercase tracking-tighter shadow-xl transition-all active:scale-95"
               >
                 VOLTAR PARA LOGIN
               </button>
            </div>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-6">
              
              <div className="text-center mb-8 px-4">
                <p className="text-slate-500 font-medium text-sm leading-relaxed italic">
                  Esqueceu sua senha? Não se preocupe! Informe seu e-mail e enviaremos um link para criar uma nova.
                </p>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-black border border-red-100 animate-in fade-in">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              {/* Campo E-mail */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5">Seu E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-5 text-green-600" size={20} />
                  <input 
                    required
                    type="email" 
                    placeholder="exemplo@email.com"
                    className="w-full pl-14 p-5 bg-slate-50 rounded-[28px] outline-none focus:border-green-500 border-2 border-transparent font-bold transition-all text-lg"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Botão de Ação */}
              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 hover:bg-green-600 text-white p-6 rounded-[30px] font-black italic uppercase tracking-tighter shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "ENVIANDO..." : "ENVIAR LINK"} <Send size={20} />
              </button>

              <div className="h-px bg-slate-100 my-8"></div>

              <Link 
                to="/login"
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 hover:text-green-600 uppercase tracking-widest transition-colors"
              >
                <ArrowLeft size={16} /> VOLTAR PARA O LOGIN
              </Link>

            </form>
          )}
        </div>
      </main>
    </div>
  );
}
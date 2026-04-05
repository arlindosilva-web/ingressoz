import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
// 1. ADICIONADO useLocation AQUI:
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation(); // 2. DEFINIDO O LOCATION AQUI
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 3. O Supabase usa o nome "data", por isso vamos mudar o nome da nossa variavel de reserva abaixo
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 4. RECUPERANDO A "MOCHILA" (Dados que vieram da Home)
      const destination = location.state?.redirectTo || '/';
      const bookingDataFromHome = location.state?.bookingData;

      setLoginSuccess(true);

      // Aguarda 2 segundos para mostrar o check verde e redireciona
      setTimeout(() => {
        if (bookingDataFromHome) {
          // Se ele estava comprando, manda pro Checkout com a mochila
          navigate('/checkout', { state: { bookingData: bookingDataFromHome } });
        } else {
          // Se era só um login comum, manda para a Home ou destino anterior
          navigate(destination);
        }
      }, 2000);

    } catch (err) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      setLoading(false); // Importante resetar o loading se der erro
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center overflow-hidden">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter relative z-10">Acessar Conta</h1>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </header>

      <main className="max-w-md mx-auto p-4 -mt-12 relative z-20">
        <div className="bg-white p-8 md:p-12 rounded-[45px] shadow-2xl border border-slate-100">
          
          {loginSuccess ? (
            <div className="text-center py-10 animate-in zoom-in duration-500">
               <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-lg shadow-green-50">
                  <CheckCircle2 size={48} />
               </div>
               <h2 className="text-2xl font-black text-slate-800 uppercase italic">Acesso Liberado!</h2>
               <p className="text-slate-400 font-bold text-sm mt-2 italic">Preparando seu ingresso...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-black border border-red-100 italic">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5">Seu E-mail</label>
                <input required type="email" placeholder="email@exemplo.com" className="w-full p-5 bg-slate-50 rounded-[28px] outline-none focus:border-green-500 border-2 border-transparent font-bold transition-all"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5">Sua Senha</label>
                <input required type={showPass ? "text" : "password"} placeholder="••••••••" className="w-full p-5 bg-slate-50 rounded-[28px] outline-none focus:border-green-500 border-2 border-transparent font-bold transition-all"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-11 text-slate-300">
                  {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[30px] font-black italic uppercase tracking-tighter shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                {loading ? "VERIFICANDO..." : "ACESSAR CONTA"} <LogIn size={22} />
              </button>

              <div className="h-px bg-slate-100 my-4" />

              {/* 5. AQUI É O SEGREDO: Se ele for para o registro, passamos a mochila adiante */}
              <Link 
                to="/register" 
                state={location.state} 
                className="w-full border-2 border-slate-100 text-slate-400 p-5 rounded-[30px] font-black italic uppercase text-center flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-600 transition-all"
              >
                NÃO TENHO CONTA <ArrowRight size={18} />
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
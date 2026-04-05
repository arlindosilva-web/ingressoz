import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
// Importamos o useLocation aqui
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  User, Mail, Lock, CreditCard, ArrowRight, 
  CheckCircle2, Circle, AlertCircle, ShieldCheck, Eye, EyeOff 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Register() {
  // --- HOOKS (Sempre dentro da função) ---
  const navigate = useNavigate();
  const location = useLocation(); // AQUI É O LUGAR CORRETO!
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '', email: '', cpf: '', gender: 'Masculino', password: '', confirmPassword: ''
  });

  // --- 1. LÓGICA DE VALIDAÇÃO REAL-TIME ---
  const isCpfValid = (cpf) => {
    const cleanCpf = cpf.replace(/[^\d]+/g, '');
    if (cleanCpf.length !== 11 || !!cleanCpf.match(/(\d)\1{10}/)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cleanCpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cleanCpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(cleanCpf.charAt(10));
  };

  const passRules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*]/.test(formData.password),
    match: formData.password === formData.confirmPassword && formData.password !== ''
  };

  const cpfStatus = formData.cpf.length === 14 ? isCpfValid(formData.cpf) : null;
  const canSubmit = Object.values(passRules).every(v => v) && cpfStatus === true && formData.full_name.length > 3;

  // --- 2. FUNÇÃO DE REGISTRO ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // A. Verifica CPF (Renomeamos para existingCpf)
      const { data: existingCpf } = await supabase.from('profiles').select('cpf').eq('cpf', formData.cpf).maybeSingle();
      if (existingCpf) throw new Error('Este CPF já está cadastrado!');

      // B. Cria Usuário (O retorno do Supabase renomeado para authResult)
      const { data: authResult, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          data: { 
            full_name: formData.full_name, 
            cpf: formData.cpf, 
            gender: formData.gender 
          } 
        }
      });

      if (authError) throw authError;

      // C. RECUPERA A MOCHILA (Dados da compra vindos da Home)
      const bookingDataFromState = location.state?.bookingData;

      Swal.fire({
        title: 'CONTA CRIADA!',
        text: 'Seja bem-vindo ao IngressoZ. Vamos fazer o login para finalizar sua reserva?',
        icon: 'success',
        confirmButtonText: 'IR PARA LOGIN',
        confirmButtonColor: '#16a34a',
        borderRadius: '3rem',
        customClass: { popup: 'rounded-[40px]', title: 'font-black uppercase italic' }
      }).then(() => {
        // D. Manda para o Login, mas passa a mochila junto!
        navigate('/login', { state: { bookingData: bookingDataFromState } });
      });

    } catch (err) {
      setError(err.message.toUpperCase());
      setLoading(false);
    }
  };

  // Pequeno componente para as regras
  const Rule = ({ met, label }) => (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${met ? 'text-green-600' : 'text-slate-300'}`}>
      {met ? <CheckCircle2 size={12} /> : <Circle size={12} />} {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center overflow-hidden">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter relative z-10">Novo Cadastro</h1>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </header>

      <main className="max-w-xl mx-auto p-4 -mt-12 relative z-20">
        <div className="bg-white p-8 md:p-12 rounded-[45px] shadow-2xl border border-slate-100">
          <form onSubmit={handleRegister} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-3xl flex items-center gap-3 text-xs font-black border-2 border-red-100 animate-bounce italic">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-5">Nome Completo</label>
              <input required type="text" placeholder="Seu nome" className="w-full p-5 bg-slate-50 rounded-[28px] outline-none focus:border-green-500 border-2 border-transparent font-bold text-lg transition-all"
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5">CPF</label>
                <input required type="text" placeholder="000.000.000-00" maxLength="14" value={formData.cpf} 
                  className={`w-full p-5 rounded-[28px] outline-none border-2 font-bold transition-all ${cpfStatus === true ? 'border-green-500 bg-green-50 text-green-700' : cpfStatus === false ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-transparent'}`}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                    setFormData({...formData, cpf: v});
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-5">E-mail</label>
                <input required type="email" placeholder="seu@email.com" className="w-full p-5 bg-slate-50 rounded-[28px] outline-none focus:border-green-500 border-2 border-transparent font-bold transition-all"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[40px] border border-slate-100 space-y-4">
              <div className="relative space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Lock size={12}/> Senha</label>
                <input required type={showPass ? "text" : "password"} className="w-full p-4 bg-white rounded-2xl outline-none border-2 border-transparent focus:border-green-500 font-bold transition-all"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-10 text-slate-300">
                  {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-y-2 px-2">
                <Rule met={passRules.length} label="8+ Caracteres" />
                <Rule met={passRules.upper} label="Maiúscula" />
                <Rule met={passRules.number} label="Um número" />
                <Rule met={passRules.special} label="Símbolo" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><ShieldCheck size={12}/> Confirmar Senha</label>
                <input required type={showPass ? "text" : "password"} className="w-full p-4 bg-white rounded-2xl outline-none border-2 border-transparent focus:border-green-500 font-bold transition-all"
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <div className="mt-2 ml-2"> <Rule met={passRules.match} label="Senhas coincidem" /> </div>
              </div>
            </div>

            <button disabled={!canSubmit || loading} type="submit" className={`w-full p-6 rounded-[32px] font-black italic uppercase shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${canSubmit ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {loading ? "PROCESSANDO..." : "FINALIZAR CADASTRO"} <ArrowRight size={22} />
            </button>

            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8">
              JÁ É MEMBRO? 
              <Link 
                to="/login" 
                state={location.state} 
                className="text-green-600 hover:underline ml-1"
              >
                ENTRAR AGORA
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
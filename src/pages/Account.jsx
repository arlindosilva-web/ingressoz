import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, Mail, Lock, ShieldCheck, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', phone: '', cpf: '', email: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile({ ...data, email: user.email });
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone
    }).eq('id', user.id);

    if (!error) {
      Swal.fire({ title: 'SUCESSO!', text: 'Dados atualizados com sucesso.', icon: 'success', borderRadius: '2rem' });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center">
        <button onClick={() => navigate('/')} className="absolute left-6 top-16 bg-white/20 p-3 rounded-full hover:bg-white/40 transition-all"><ArrowLeft size={20}/></button>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Meus Dados</h1>
      </header>

      <main className="max-w-xl mx-auto p-4 -mt-12 relative z-20">
        <form onSubmit={handleUpdate} className="bg-white p-8 md:p-12 rounded-[45px] shadow-2xl border border-slate-100 space-y-6">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-5">Nome Completo</label>
            <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-bold border-2 border-transparent focus:border-green-500 outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 opacity-50">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-5 tracking-widest">CPF (Não alterável)</label>
              <input value={profile.cpf} readOnly className="w-full p-5 bg-slate-200 rounded-3xl font-bold outline-none cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-5 tracking-widest">Telefone</label>
              <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl font-bold border-2 border-transparent focus:border-green-500 outline-none" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-6 rounded-[32px] font-black italic uppercase tracking-tighter shadow-2xl shadow-green-100 flex items-center justify-center gap-3 transition-all active:scale-95">
            <Save size={22} /> {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </form>
      </main>
    </div>
  );
}
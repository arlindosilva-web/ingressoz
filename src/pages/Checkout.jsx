import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  User, CreditCard, ArrowLeft, ShieldCheck, 
  QrCode, Info, ShoppingBag, Users, ArrowRight 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recuperamos a reserva e as configurações de preço da Home
  const { bookingData, config } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState([]);

  useEffect(() => {
    if (!bookingData) {
      navigate('/');
      return;
    }

    async function loadInitialData() {
      // 1. Busca perfil logado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name, cpf').eq('id', user.id).single();

      // 2. Monta lista de visitantes
      const total = (bookingData.adults || 0) + (bookingData.children || 0);
      const list = Array.from({ length: total }, (_, i) => ({
        name: i === 0 ? (profile?.full_name || '') : '',
        cpf: i === 0 ? (profile?.cpf || '') : '',
        type: i < bookingData.adults ? 'Adulto' : 'Criança',
        isTitular: i === 0
      }));
      setVisitors(list);
    }

    loadInitialData();
  }, [bookingData, navigate]);

  // --- LÓGICA DE PREÇOS DINÂMICOS (Vindo do Banco/Config) ---
  const getPriceBase = () => {
    if (!bookingData?.date || !config) return 20; // Plano B caso falhe
    const day = new Date(bookingData.date + 'T00:00:00').getDay();
    const isWeekend = day === 0 || day === 6;
    return isWeekend ? Number(config.weekend_price) : Number(config.weekday_price);
  };

  const getChildPrice = () => {
    if (!config) return getPriceBase() / 2;
    // Se você definiu um preço fixo para criança no banco, usa ele. Senão, usa metade.
    return config.child_price ? Number(config.child_price) : getPriceBase() / 2;
  };

  const getBBQPrice = () => Number(config?.bbq_price || 20);

  const calculateTotal = () => {
    const base = getPriceBase();
    const child = getChildPrice();
    const bbq = getBBQPrice();

    const totalEntradas = (bookingData.adults * base) + (bookingData.children * child);
    const totalKiosks = bookingData.selectedKiosks.reduce((acc, k) => acc + k.category_price, 0);
    const totalBBQ = (bookingData.bbqCount || 0) * bbq;
    
    return totalEntradas + totalKiosks + totalBBQ;
  };

  const updateVisitor = (index, field, value) => {
    const newList = [...visitors];
    newList[index][field] = value;
    setVisitors(newList);
  };

  const finalizeOrder = async () => {
    const incomplete = visitors.some(v => v.name === '' || v.cpf.length < 14);
    if (incomplete) return Swal.fire('Atenção', 'Preencha todos os visitantes.', 'warning');

    setLoading(true);
    try {
       const { data: { user } } = await supabase.auth.getUser();

       // 1. Criar Reserva (Booking)
       const { data: booking, error: bError } = await supabase.from('bookings').insert([{
         user_id: user.id,
         visit_date: bookingData.date,
         total_price: calculateTotal(),
         status: 'pending' 
       }]).select().single();

       if (bError) throw bError;

       // 2. Criar Itens (Itens vendidos)
       const items = [];
       visitors.forEach(v => {
         items.push({ 
            booking_id: booking.id, 
            item_type: `entrada_${v.type.toLowerCase()}`, 
            unit_price: v.type === 'Adulto' ? getPriceBase() : getChildPrice(),
            visit_date: bookingData.date,
            visitor_name: v.name,
            visitor_cpf: v.cpf
         });
       });
       
       bookingData.selectedKiosks.forEach(k => {
         items.push({ booking_id: booking.id, resource_id: k.id, item_type: 'quiosque', unit_price: k.category_price, visit_date: bookingData.date });
       });

       if (bookingData.bbqCount > 0) {
         for (let i = 0; i < bookingData.bbqCount; i++) {
           items.push({ booking_id: booking.id, item_type: 'churrasqueira', unit_price: getBBQPrice(), visit_date: bookingData.date });
         }
       }

       await supabase.from('booking_items').insert(items);

       // 3. Chamar a Edge Function para gerar o link do Mercado Pago
       const { data: funcData, error: funcError } = await supabase.functions.invoke('create-payment', {
         body: { booking_id: booking.id }
       });

       if (funcError) throw funcError;

       if (funcData?.url) {
         window.location.href = funcData.url;
       }

    } catch (err) {
       Swal.fire('Erro', err.message, 'error');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header Verde Identidade */}
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center">
        <button onClick={() => navigate('/', { state: { bookingData } })} className="absolute left-6 top-16 bg-white/20 p-3 rounded-full hover:bg-white/40 transition-all z-[110]"><ArrowLeft size={20}/></button>        
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Finalizar Reserva</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LADO ESQUERDO: VISITANTES */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white p-8 rounded-[45px] shadow-xl border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
                <Users className="text-green-600" /> Identificação dos Visitantes
              </h2>
              <div className="space-y-4">
                {visitors.map((v, i) => (
                  <div key={i} className={`p-5 rounded-[30px] border-2 transition-all flex flex-col md:flex-row gap-4 items-center ${v.isTitular ? 'border-green-500 bg-green-50/30' : 'border-slate-50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${v.isTitular ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-slate-300 border border-slate-100'}`}>
                      {v.isTitular ? <ShieldCheck size={20}/> : i + 1}
                    </div>
                    <input placeholder="Nome" value={v.name} readOnly={v.isTitular} onChange={(e) => updateVisitor(i, 'name', e.target.value)} className={`flex-[2] w-full p-4 rounded-2xl font-bold outline-none border-2 border-transparent transition-all ${v.isTitular ? 'bg-white/50 cursor-not-allowed' : 'bg-white focus:border-green-500'}`} />
                    <input placeholder="CPF" value={v.cpf} maxLength="14" readOnly={v.isTitular} onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      updateVisitor(i, 'cpf', val);
                    }} className={`flex-1 w-full p-4 rounded-2xl font-bold outline-none border-2 border-transparent transition-all ${v.isTitular ? 'bg-white/50 cursor-not-allowed' : 'bg-white focus:border-green-500'}`} />
                    <span className="text-[9px] font-black uppercase bg-white px-3 py-1 rounded-full text-slate-400 border border-slate-100">{v.type}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* LADO DIREITO: RESUMO DO CARRINHO */}
          <aside className="lg:sticky lg:top-8 space-y-6">
            <section className="bg-slate-900 text-white p-8 rounded-[45px] shadow-2xl relative overflow-hidden">
               <h3 className="text-lg font-black uppercase italic mb-6 text-green-400 flex items-center gap-2 border-b border-white/10 pb-4">
                 <ShoppingBag size={20} /> Resumo dos Itens
               </h3>

               <div className="space-y-4">
                  {/* Adultos */}
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-black italic uppercase leading-none">{bookingData.adults}x Ingressos Adulto</p>
                    <p className="font-black italic text-green-400">R$ {(bookingData.adults * getPriceBase()).toFixed(2)}</p>
                  </div>
                  
                  {/* Crianças */}
                  {bookingData.children > 0 && (
                    <div className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase leading-none">{bookingData.children}x Ingressos Criança</p>
                      <p className="font-black italic text-green-400">R$ {(bookingData.children * getChildPrice()).toFixed(2)}</p>
                    </div>
                  )}

                  {/* Quiosques */}
                  {bookingData.selectedKiosks.map(k => (
                    <div key={k.id} className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase leading-none">{k.identifier.replace('QUIOS-', 'Quiosque ')}</p>
                      <p className="font-black italic text-green-400">R$ {k.category_price.toFixed(2)}</p>
                    </div>
                  ))}

                  {/* Churrasqueiras */}
                  {bookingData.bbqCount > 0 && (
                    <div className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase leading-none">{bookingData.bbqCount}x Churrasqueiras</p>
                      <p className="font-black italic text-green-400">R$ {(bookingData.bbqCount * getBBQPrice()).toFixed(2)}</p>
                    </div>
                  )}

                  {/* TOTAL */}
                  <div className="mt-8 pt-6 border-t-2 border-green-500/30 flex justify-between items-center">
                    <p className="text-[10px] font-black text-green-400 uppercase">Total Geral</p>
                    <p className="text-4xl font-black italic tracking-tighter text-green-500">R$ {calculateTotal().toFixed(2)}</p>
                  </div>
               </div>

               <button onClick={finalizeOrder} disabled={loading} className="w-full mt-8 bg-green-600 text-white p-6 rounded-[30px] font-black italic uppercase shadow-xl hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">
                 {loading ? "PROCESSANDO..." : "FINALIZAR E PAGAR"}
               </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
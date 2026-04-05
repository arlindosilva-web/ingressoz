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
  const { bookingData } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState([]);

  // 1. LÓGICA DE CARREGAMENTO DE DADOS
  useEffect(() => {
    if (!bookingData) {
      navigate('/');
      return;
    }

    async function loadInitialData() {
      // Busca o perfil de quem está logado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name, cpf').eq('id', user.id).single();

      // Monta a lista de visitantes baseada na Home
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

  // 2. FUNÇÕES AUXILIARES
  const updateVisitor = (index, field, value) => {
    const newList = [...visitors];
    newList[index][field] = value;
    setVisitors(newList);
  };

  const getPriceBase = () => {
    if (!bookingData?.date) return 20;
    const day = new Date(bookingData.date + 'T00:00:00').getDay();
    return (day === 0 || day === 6) ? 30 : 20;
  };

  const calculateTotal = () => {
    const base = getPriceBase();
    const entradas = (bookingData.adults * base) + (bookingData.children * (base / 2));
    const kiosks = bookingData.selectedKiosks.reduce((acc, k) => acc + k.category_price, 0);
    const bbq = (bookingData.bbqCount || 0) * 20;
    return entradas + kiosks + bbq;
  };

  // 3. FINALIZAR PEDIDO NO BANCO
  const finalizeOrder = async () => {
  const incomplete = visitors.some(v => v.name === '' || v.cpf.length < 14);
  if (incomplete) return Swal.fire('Atenção', 'Preencha os dados de todos os visitantes.', 'warning');
  
  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // --- 1. CRIAR A RESERVA MÃE (STATUS: PENDING) ---
    // Importante: Começa pendente porque o Mercado Pago ainda vai processar
    const { data: booking, error: bError } = await supabase
      .from('bookings')
      .insert([{
        user_id: user.id,
        visit_date: bookingData.date,
        total_price: calculateTotal(),
        status: 'pending' // <--- MUDAMOS PARA PENDENTE
      }])
      .select().single();

    if (bError) throw bError;

    // --- 2. PREPARAR TODOS OS ITENS (Entradas, Quiosques e Churrasqueiras) ---
    const itemsToInsert = [];
    
    // Adicionando Visitantes
    visitors.forEach(v => {
      itemsToInsert.push({ 
        booking_id: booking.id, 
        item_type: `entrada_${v.type.toLowerCase()}`, 
        unit_price: v.type === 'Adulto' ? getPriceBase() : getPriceBase()/2,
        visit_date: bookingData.date,
        visitor_name: v.name,
        visitor_cpf: v.cpf
      });
    });

    // Adicionando Quiosques
    bookingData.selectedKiosks.forEach(k => {
      itemsToInsert.push({ 
        booking_id: booking.id, 
        resource_id: k.id, 
        item_type: 'quiosque', 
        unit_price: k.category_price, 
        visit_date: bookingData.date 
      });
    });

    // Adicionando Churrasqueiras
    for (let i = 0; i < bookingData.bbqCount; i++) {
      itemsToInsert.push({ 
        booking_id: booking.id, 
        item_type: 'churrasqueira', 
        unit_price: 20, 
        visit_date: bookingData.date 
      });
    }

    // Grava todos os itens de uma vez só (mais rápido)
    const { error: iError } = await supabase.from('booking_items').insert(itemsToInsert);
    if (iError) throw iError;

    // --- 3. CHAMAR A EDGE FUNCTION DO MERCADO PAGO ---
    // Ela vai gerar o link de pagamento real
    const { data: funcData, error: funcError } = await supabase.functions.invoke('create-payment', {
      body: { booking_id: booking.id }
    });

    if (funcError) throw funcError;

    // --- 4. REDIRECIONAR PARA O PAGAMENTO ---
    if (funcData?.url) {
      // Abre o Mercado Pago na mesma aba
      window.location.href = funcData.url;
    } else {
      throw new Error("Não foi possível gerar o link de pagamento.");
    }

  } catch (err) {
    console.error("Erro no Checkout:", err);
    Swal.fire('Erro', err.message, 'error');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center">
        <button 
          onClick={() => navigate('/', { state: { bookingData } })}
          className="absolute left-6 top-16 bg-white/20 p-3 rounded-full hover:bg-white/40 transition-all z-[110]"
        >
          <ArrowLeft size={20}/>
        </button>        
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Finalizar Reserva</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ESQUERDA: VISITANTES */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white p-6 md:p-8 rounded-[45px] shadow-xl border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
                <Users className="text-green-600" /> Identificação dos Visitantes
              </h2>
              <div className="space-y-4">
                {visitors.map((v, i) => (
                  <div key={i} className={`p-5 rounded-[30px] border-2 transition-all flex flex-col md:flex-row gap-4 items-center ${v.isTitular ? 'border-green-500 bg-green-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${v.isTitular ? 'bg-green-600 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}>
                      {v.isTitular ? <ShieldCheck size={20}/> : i + 1}
                    </div>
                    <input 
                      placeholder="Nome do Visitante" 
                      value={v.name}
                      readOnly={v.isTitular}
                      onChange={(e) => updateVisitor(i, 'name', e.target.value)}
                      className={`flex-[2] w-full p-4 rounded-2xl font-bold outline-none border-2 border-transparent transition-all ${v.isTitular ? 'bg-white/50 cursor-not-allowed' : 'bg-white focus:border-green-500'}`}
                    />
                    <input 
                      placeholder="CPF" 
                      value={v.cpf}
                      maxLength="14"
                      readOnly={v.isTitular}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                        updateVisitor(i, 'cpf', val);
                      }}
                      className={`flex-1 w-full p-4 rounded-2xl font-bold outline-none border-2 border-transparent transition-all ${v.isTitular ? 'bg-white/50 cursor-not-allowed' : 'bg-white focus:border-green-500'}`}
                    />
                    <span className="text-[9px] font-black uppercase bg-white px-3 py-1 rounded-full text-slate-400 border border-slate-100">
                      {v.type}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <button 
              onClick={() => navigate('/', { state: { bookingData } })}
              className="w-full bg-white text-slate-400 p-6 rounded-[35px] font-black italic uppercase text-xs border-2 border-dashed border-slate-200 hover:border-green-500 hover:text-green-600 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} /> Esqueci algo, quero adicionar mais itens
            </button>
          </div>

          {/* DIREITA: RESUMO */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <section className="bg-slate-900 text-white p-8 rounded-[45px] shadow-2xl overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2 border-b border-white/10 pb-4 text-green-400">
                  <ShoppingBag size={20} /> Resumo
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-black italic uppercase">{bookingData.adults}x Ingressos Adulto</p>
                    <p className="font-black italic text-green-400">R$ {(bookingData.adults * getPriceBase()).toFixed(2)}</p>
                  </div>
                  {bookingData.children > 0 && (
                    <div className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase">{bookingData.children}x Ingressos Criança</p>
                      <p className="font-black italic text-green-400">R$ {(bookingData.children * (getPriceBase()/2)).toFixed(2)}</p>
                    </div>
                  )}
                  {bookingData.selectedKiosks.map(k => (
                    <div key={k.id} className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase">{k.identifier.replace('QUIOS-', 'Quiosque ')}</p>
                      <p className="font-black italic text-green-400">R$ {k.category_price.toFixed(2)}</p>
                    </div>
                  ))}
                  {bookingData.bbqCount > 0 && (
                    <div className="flex justify-between items-start border-t border-white/5 pt-4">
                      <p className="text-sm font-black italic uppercase">{bookingData.bbqCount}x Churrasqueiras</p>
                      <p className="font-black italic text-green-400">R$ {(bookingData.bbqCount * 20).toFixed(2)}</p>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t-2 border-green-500/30 flex justify-between items-center">
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Total Geral</p>
                    <p className="text-4xl font-black italic tracking-tighter text-green-500">R$ {calculateTotal().toFixed(2)}</p>
                  </div>
                </div>

                <button 
                  onClick={finalizeOrder}
                  disabled={loading}
                  className="w-full mt-8 bg-green-600 hover:bg-green-500 text-white p-6 rounded-[30px] font-black italic uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? "PROCESSANDO..." : "FINALIZAR E PAGAR"} <ArrowRight size={20} />
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
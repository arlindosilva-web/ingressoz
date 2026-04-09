import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, Users, CheckCircle2, Flame, ChevronRight, Ticket, Baby, ShoppingBag, XCircle, ChevronDown, User, LogOut
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [occupiedIds, setOccupiedIds] = useState([]); 
  const [session, setSession] = useState(null);
  const [config, setConfig] = useState(null); // <--- ESTADO PARA PREÇOS DO BANCO
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // O booking tenta recuperar dados da "mochila" se o usuário estiver voltando do checkout
  const [booking, setBooking] = useState(location.state?.bookingData || {
    date: new Date().toISOString().split('T')[0], 
    adults: 1,
    children: 0,
    selectedKiosks: [],
    bbqCount: 0
  });

  // 1. CARREGAMENTO INICIAL (Sessão, Preços e Quiosques)
  useEffect(() => {
    // Busca Sessão
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Busca Preços do Banco (Tabela settings)
    async function loadSettings() {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) setConfig(data);
    }

    // Busca Todos os Quiosques
    async function loadResources() {
      const { data } = await supabase.from('resources').select('*').order('identifier');
      if (data) setResources(data);
    }

    loadSettings();
    loadResources();
  }, []);

  // 2. VERIFICAÇÃO DE DISPONIBILIDADE (Sempre que a data muda)
  useEffect(() => {
    if (booking.date) {
      checkAvailability();
    }
  }, [booking.date]);

  async function checkAvailability() {
    if (!booking.date) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_items')
        .select('resource_id')
        .eq('visit_date', booking.date);

      if (error) throw error;
      if (data) {
        setOccupiedIds(data.map(item => item.resource_id));
      }
    } catch (err) {
      console.error("Erro ao buscar ocupados:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DE CÁLCULO DINÂMICO ---
  const isWeekend = booking.date && [0, 6].includes(new Date(booking.date + 'T00:00:00').getDay());
  
  // Pega preços do config (vido do banco) ou usa padrão se o banco falhar
  const priceBase = isWeekend 
    ? Number(config?.weekend_price || 30) 
    : Number(config?.weekday_price || 20);

  const priceChild = Number(config?.child_price || (priceBase / 2));
  const priceBBQ = Number(config?.bbq_price || 20);

  const totalEntrada = (booking.adults * priceBase) + (booking.children * priceChild);
  const totalKiosks = booking.selectedKiosks.reduce((acc, k) => acc + k.category_price, 0);
  const totalBBQ = (booking.bbqCount || 0) * priceBBQ;
  const grandTotal = totalEntrada + totalKiosks + totalBBQ;

  // --- FUNÇÕES DE INTERAÇÃO ---
  const handleNext = () => {
    if (booking.adults < 1) {
      return Swal.fire('Atenção', 'A reserva exige pelo menos 1 adulto.', 'warning');
    }

    // Envia o BOOKING e o CONFIG para a tela de Checkout
    if (!session) {
      navigate('/login', { state: { from: '/checkout', bookingData: booking, config: config } });
    } else {
      navigate('/checkout', { state: { bookingData: booking, config: config } });
    }
  };

  const toggleKiosk = (kiosk) => {
    if (occupiedIds.includes(kiosk.id)) return;
    const isSelected = booking.selectedKiosks.find(k => k.id === kiosk.id);
    if (isSelected) {
      setBooking({...booking, selectedKiosks: booking.selectedKiosks.filter(k => k.id !== kiosk.id)});
    } else {
      setBooking({...booking, selectedKiosks: [...booking.selectedKiosks, kiosk]});
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-44 font-sans">
      
      <main className="max-w-5xl mx-auto p-4 -mt-20 relative z-[50] space-y-10">

        {/* 1. SEÇÃO DE ENTRADAS (VALORES DINÂMICOS) */}
        <section className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 text-left block">Data da Visita</label>
            <input 
              type="date" 
              className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-green-500 transition-all"
              value={booking.date}
              min={new Date().toISOString().split('T')[0]} 
              onChange={(e) => setBooking({...booking, date: e.target.value})}
            />
          </div>
          <Counter label="Adultos" sub={`R$ ${priceBase.toFixed(2)}`} value={booking.adults} onChange={(v) => setBooking({...booking, adults: v})} />
          <Counter label="Crianças" sub={`R$ ${priceChild.toFixed(2)}`} icon={<Baby size={16}/>} value={booking.children} onChange={(v) => setBooking({...booking, children: v})} />
        </section>

        {/* 2. VITRINE DE QUIOSQUES */}
        <section className={`space-y-6 ${!booking.date && 'opacity-30 pointer-events-none'}`}>
          <h2 className="text-2xl font-black uppercase italic text-slate-800 px-4">Escolha seus Quiosques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resources.filter(r => r.type === 'quiosque').map((item) => {
              const isOccupied = occupiedIds.includes(item.id);
              const isSelected = booking.selectedKiosks.find(k => k.id === item.id);

              return (
                <div 
                  key={item.id}
                  onClick={() => !isOccupied && toggleKiosk(item)}
                  className={`group relative rounded-[45px] overflow-hidden border-4 transition-all duration-500 cursor-pointer bg-white ${
                    isOccupied ? 'border-red-100 opacity-70 grayscale-[0.5]' : 
                    isSelected ? 'border-green-500 shadow-2xl shadow-green-100 -translate-y-2' : 
                    'border-transparent shadow-xl hover:border-slate-200'
                  }`}
                >
                  <div className="h-56 overflow-hidden relative bg-slate-100">
                    <img src={item.image_url || 'https://via.placeholder.com/400x300?text=Sem+Foto'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.identifier} />
                    <div className={`absolute top-5 right-5 px-5 py-2 rounded-full font-black text-sm italic shadow-lg backdrop-blur-md ${isOccupied ? 'bg-red-500 text-white' : 'bg-white/90 text-green-600'}`}>
                      {isOccupied ? 'RESERVADO' : `R$ ${item.category_price.toFixed(2)}`}
                    </div>
                    {isSelected && <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center backdrop-blur-[2px]"><CheckCircle2 className="text-white drop-shadow-lg" size={60} /></div>}
                    {isOccupied && <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center backdrop-blur-[1px]"><XCircle className="text-red-500 bg-white rounded-full shadow-xl" size={60} /></div>}
                  </div>
                  <div className="p-8 text-left">
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">{item.identifier.replace('QUIOS-', 'Quiosque ')}</h4>
                    <p className="text-sm text-slate-400 font-bold italic mt-2">{item.description || 'Espaço privativo com mesa e bancos.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. CHURRASQUEIRA (VALOR DINÂMICO) */}
        <section className={`transition-opacity ${!booking.date && 'opacity-30'}`}>
           <div 
            onClick={() => setBooking({...booking, bbqCount: booking.bbqCount > 0 ? 0 : 1})}
            className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all flex items-center justify-between ${booking.bbqCount > 0 ? 'border-orange-500 bg-orange-50 shadow-lg' : 'bg-white shadow-sm'}`}
          >
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-3xl ${booking.bbqCount > 0 ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'bg-slate-100 text-slate-400'}`}><Flame size={32} /></div>
              <div>
                <h4 className="text-xl font-black uppercase italic text-slate-800">Churrasqueira Extra</h4>
                <p className="text-sm text-slate-400 font-bold italic">+ R$ {priceBBQ.toFixed(2)}</p>
              </div>
            </div>
            {booking.bbqCount > 0 && <CheckCircle2 className="text-orange-500" size={32} />}
          </div>
        </section>
      </main>

      {/* RODAPÉ DINÂMICO */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-6 z-[60] shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase italic leading-none">Total Geral</p>
              <p className="text-4xl font-black text-green-600 italic tracking-tighter leading-none">R$ {grandTotal.toFixed(2)}</p>
            </div>
          </div>
          <button 
            className={`w-full md:w-auto px-16 py-5 rounded-[24px] font-black text-xl italic uppercase transition-all shadow-xl active:scale-95 
              ${(!booking.date || booking.adults < 1) 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' 
                : 'bg-slate-900 text-white hover:bg-green-600 shadow-green-200'
              }`}
            disabled={!booking.date || booking.adults < 1}
            onClick={handleNext} 
          >
            RESERVAR AGORA <ChevronRight className="inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Counter({ label, sub, value, onChange, icon = <Users size={16}/> }) {
  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-400"> {icon} <span className="text-[10px] font-black uppercase">{label}</span></div>
        <span className="text-[10px] font-black text-green-600">{sub}</span>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => {
          if (label === 'Adultos' && value <= 1) {
            Swal.fire({ text: 'A reserva exige pelo menos 1 adulto.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
          }
          value > 0 && onChange(value - 1);
        }} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black">-</button>

        <span className="font-black text-2xl italic">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black">+</button>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, Users, CheckCircle2, Flame, ChevronRight, Ticket, Baby, ShoppingBag, XCircle, ChevronDown, User, LogOut, } from 'lucide-react';

import { useNavigate, useLocation  } from 'react-router-dom';
// 1. FALTAVA ESSA IMPORTAÇÃO AQUI:
import Swal from 'sweetalert2'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [occupiedIds, setOccupiedIds] = useState([]); 
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // O booking já nasce com a data de hoje e 1 adulto
  const [booking, setBooking] = useState(location.state?.bookingData || {
    date: new Date().toISOString().split('T')[0], 
    adults: 1,
    children: 0,
    selectedKiosks: [],
    bbqCount: 0 // Adicionei para controlar a churrasqueira
  });

  // 2. FUNÇÃO HANDLE NEXT CORRIGIDA
  const handleNext = () => {
    if (!booking.date) {
      return Swal.fire('Ops!', 'Selecione uma data primeiro.', 'warning');
    }
    if (booking.adults < 1) {
      return Swal.fire('Atenção', 'A reserva exige pelo menos 1 adulto.', 'warning');
    }

    if (!session) {
      // Se não está logado, vai para login e avisa que quer voltar para o checkout
      navigate('/login', { state: { from: '/checkout', bookingData: booking } });
    } else {
      // Se está logado, vai para a página de Checkout que criamos
      navigate('/checkout', { state: { bookingData: booking } });
    }
  };

  // LOGICA DE PREÇOS
  const isWeekend = booking.date && [0, 6].includes(new Date(booking.date + 'T00:00:00').getDay());
  const priceBase = isWeekend ? 30 : 20;
  const totalEntrada = (booking.adults * priceBase) + (booking.children * (priceBase / 2));
  const totalKiosks = booking.selectedKiosks.reduce((acc, k) => acc + k.category_price, 0);
  const totalBBQ = (booking.bbqCount || 0) * 20;
  const grandTotal = totalEntrada + totalKiosks + totalBBQ;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    loadResources();
  }, []);

  useEffect(() => {
    if (booking.date) {
      checkAvailability();
    }
  }, [booking.date]);

  useEffect(() => {
    if (location.state?.bookingData) {
      setBooking(location.state.bookingData);
    }
  }, [location.state]);
  

  async function loadResources() {
    const { data } = await supabase.from('resources').select('*').order('identifier');
    if (data) setResources(data);
  }

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
      
      {/* O Header agora vem do Layout, então aqui focamos no Main */}
      <main className="max-w-5xl mx-auto p-4 -mt-20 relative z-[50] space-y-10">

        {/* 1. ENTRADAS */}
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
          <Counter label="Adultos" sub={`R$ ${priceBase}`} value={booking.adults} onChange={(v) => setBooking({...booking, adults: v})} />
          <Counter label="Crianças" sub={`R$ ${priceBase/2}`} icon={<Baby size={16}/>} value={booking.children} onChange={(v) => setBooking({...booking, children: v})} />
        </section>

        {/* 2. QUIOSQUES */}
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
                      {isOccupied ? 'RESERVADO' : `R$ ${item.category_price}`}
                    </div>
                    {isSelected && <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center backdrop-blur-[2px]"><CheckCircle2 className="text-white drop-shadow-lg" size={60} /></div>}
                    {isOccupied && <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center backdrop-blur-[1px]"><XCircle className="text-red-500 bg-white rounded-full shadow-xl" size={60} /></div>}
                  </div>
                  <div className="p-8">
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">{item.identifier.replace('QUIOS-', 'Quiosque ')}</h4>
                    <p className="text-sm text-slate-400 font-bold italic mt-2">{item.description || 'Espaço privativo com mesa e bancos.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. CHURRASQUEIRA */}
        <section className={`transition-opacity ${!booking.date && 'opacity-30'}`}>
           <div 
            onClick={() => setBooking({...booking, bbqCount: booking.bbqCount > 0 ? 0 : 1})}
            className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all flex items-center justify-between ${booking.bbqCount > 0 ? 'border-orange-500 bg-orange-50 shadow-lg' : 'bg-white shadow-sm'}`}
          >
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-3xl ${booking.bbqCount > 0 ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'bg-slate-100 text-slate-400'}`}><Flame size={32} /></div>
              <div><h4 className="text-xl font-black uppercase italic text-slate-800">Churrasqueira Extra</h4><p className="text-sm text-slate-400 font-bold italic">+ R$ 20,00</p></div>
            </div>
            {booking.bbqCount > 0 && <CheckCircle2 className="text-orange-500" size={32} />}
          </div>
        </section>
      </main>

      {/* RODAPÉ FINALIZAR CORRIGIDO */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-6 z-[60] shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase italic leading-none">Total Geral</p>
              <p className="text-4xl font-black text-green-600 italic tracking-tighter leading-none">R$ {grandTotal.toFixed(2)}</p>
            </div>
          </div>
          {/* O BOTÃO AGORA CHAMA HANDLE NEXT */}
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
            Swal.fire({
              text: 'A reserva exige pelo menos 1 adulto.',
              icon: 'info',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000
            });
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
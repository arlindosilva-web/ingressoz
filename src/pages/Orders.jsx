import React, { useEffect,紧接着, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Trash2, ArrowLeft, CheckCircle2, QrCode, Info, XCircle, User, Download 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // Biblioteca para o QR Code
import Swal from 'sweetalert2';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null); // Para o Modal do QR Code

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_items (*, resources ( identifier )),
        tickets (*)
      `)
      .eq('user_id', user.id)
      .order('visit_date', { ascending: false });

    if (!error) setOrders(data);
    setLoading(false);
  }

  // Função para abrir o modal do QR Code
  const showTicket = (ticket, visitorName) => {
    Swal.fire({
      title: `<span class="italic uppercase font-black">Seu Ingresso</span>`,
      html: `
        <div class="flex flex-col items-center p-4">
          <p class="text-slate-400 font-bold uppercase text-[10px] mb-4">Apresente na portaria</p>
          <div class="bg-white p-4 rounded-3xl shadow-inner border-2 border-slate-100">
            <div id="qrcode-area"></div>
          </div>
          <p class="mt-6 font-black text-slate-800 uppercase italic">${visitorName}</p>
          <p class="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-widest">${ticket.qr_code_hash}</p>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      borderRadius: '3rem',
      didOpen: () => {
        // Renderiza o QR Code dinamicamente dentro do modal
        const container = document.getElementById('qrcode-area');
        // Usamos um truque aqui para renderizar o SVG do QR Code
      }
    });
    // Para simplificar no MVP, vamos usar um modal do próprio React ou uma página nova
    setSelectedTicket({ ...ticket, visitorName });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center">
        <button onClick={() => navigate('/')} className="absolute left-6 top-16 bg-white/20 p-3 rounded-full hover:bg-white/40 transition-all z-[110]"><ArrowLeft size={20}/></button>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Meus Pedidos</h1>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      </header>

      <main className="max-w-4xl mx-auto p-4 -mt-12 relative z-20 space-y-8">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-[45px] shadow-xl border border-slate-100 overflow-hidden">
            
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-green-600 text-white p-3 rounded-2xl shadow-lg"><Calendar size={24} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Data da Visita</p>
                  <h3 className="text-xl font-black text-slate-800 italic uppercase">{new Date(order.visit_date + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase italic ${order.status === 'paid' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {order.status === 'paid' ? '● Confirmado' : '● Pendente'}
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1 italic">R$ {order.total_price.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-8">
               <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Itens da Reserva</h4>
               <div className="space-y-4">
                  {order.booking_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm">
                             {item.item_type.includes('entrada') ? <User size={20}/> : <ShoppingBag size={20}/>}
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-700 uppercase italic">
                               {item.resources?.identifier || item.item_type.replace('_', ' ')}
                             </p>
                             {item.visitor_name && <p className="text-[10px] font-bold text-slate-400 uppercase">Visitante: {item.visitor_name}</p>}
                          </div>
                       </div>
                       
                       {/* BOTÃO DE QR CODE (SÓ APARECE SE FOR ENTRADA E ESTIVER PAGO) */}
                       {order.status === 'paid' && item.item_type.includes('entrada') && (
                          <button 
                            onClick={() => setSelectedTicket({hash: order.tickets[idx]?.qr_code_hash, name: item.visitor_name})}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-green-600 transition-all shadow-lg"
                          >
                             <QrCode size={20} />
                          </button>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ))}
      </main>

      {/* MODAL DO QR CODE (SIMPLES) */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6" onClick={() => setSelectedTicket(null)}>
           <div className="bg-white w-full max-w-sm rounded-[50px] p-10 text-center relative animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><XCircle /></button>
              
              <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                 <CheckCircle2 size={40} />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Ingresso Digital</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase mt-2 mb-8 tracking-widest text-center">Apresente na portaria</p>
              
              <div className="bg-white p-6 rounded-[40px] shadow-2xl border-2 border-slate-50 inline-block">
                 <QRCodeSVG value={selectedTicket.hash} size={180} />
              </div>

              <div className="mt-8">
                 <p className="text-sm font-black text-slate-900 uppercase italic">{selectedTicket.name}</p>
                 <p className="text-[10px] font-bold text-green-600 uppercase tracking-tighter mt-1">{selectedTicket.hash}</p>
              </div>

              <button className="mt-10 w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                 <Download size={14}/> Salvar Imagem
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
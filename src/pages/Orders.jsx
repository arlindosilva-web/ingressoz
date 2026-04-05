import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Calendar, Trash2, ArrowLeft, 
  AlertCircle, CheckCircle2, Info, XCircle 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
        booking_items (
          id,
          item_type,
          unit_price,
          visit_date,
          resource_id,
          resources ( identifier )
        )
      `)
      .eq('user_id', user.id)
      .order('visit_date', { ascending: false });

    if (!error) setOrders(data);
    setLoading(false);
  }

  // FUNÇÃO PARA CANCELAR ITEM INDIVIDUAL
  async function cancelItem(itemId, itemType, bookingId, visitDate) {
    // Validação de 48 horas
    const limitDate = new Date(visitDate);
    limitDate.setHours(limitDate.getHours() - 48);
    
    if (new Date() > limitDate) {
      return Swal.fire('Prazo Esgotado', 'Cancelamentos só são permitidos até 48h antes do evento.', 'error');
    }

    const { data: items } = await supabase.from('booking_items').select('*').eq('booking_id', bookingId);
    const entries = items.filter(i => i.item_type.includes('entrada'));

    // Regra: Se for o último ingresso, avisa que cancela tudo
    let text = "O valor será estornado e o item ficará disponível.";
    if (itemType.includes('entrada') && entries.length === 1) {
      text = "ATENÇÃO: Este é seu último ingresso. Cancelando ele, seus quiosques e churrasqueiras também serão removidos!";
    }

    const confirm = await Swal.fire({
      title: 'CONFIRMA O CANCELAMENTO?',
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'SIM, CANCELAR',
      cancelButtonText: 'DESISTIR',
      confirmButtonColor: '#ef4444',
      borderRadius: '2rem'
    });

    if (confirm.isConfirmed) {
      setLoading(true);
      
      if (itemType.includes('entrada') && entries.length === 1) {
        // CANCELA A RESERVA TODA
        await supabase.from('booking_items').delete().eq('booking_id', bookingId);
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      } else {
        // CANCELA SÓ O ITEM
        await supabase.from('booking_items').delete().eq('id', itemId);
      }

      Swal.fire('SUCESSO', 'Item cancelado e estorno solicitado.', 'success');
      loadOrders();
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-green-600 text-white pt-16 pb-24 px-6 rounded-b-[60px] shadow-2xl relative text-center">
        <button onClick={() => navigate('/')} className="absolute left-6 top-16 bg-white/20 p-3 rounded-full hover:bg-white/40 transition-all z-[100]"><ArrowLeft size={20}/></button>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter relative z-10">Meus Pedidos</h1>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      </header>

      <main className="max-w-4xl mx-auto p-4 -mt-12 relative z-20 space-y-8">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-[45px] shadow-xl border border-slate-100 overflow-hidden">
            
            {/* CABEÇALHO DO PEDIDO */}
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-600 text-white p-3 rounded-2xl shadow-lg shadow-green-100">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Data da Visita</p>
                  <h3 className="text-xl font-black text-slate-800 italic uppercase">
                    {new Date(order.visit_date).toLocaleDateString('pt-BR')}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                    <span className={`text-xs font-black uppercase italic ${order.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                      {order.status === 'paid' ? '● Confirmado' : '● Cancelado'}
                    </span>
                 </div>
                 <div className="h-10 w-[2px] bg-slate-200 hidden md:block"></div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                    <p className="text-2xl font-black text-slate-900 italic leading-none">R$ {order.total_price.toFixed(2)}</p>
                 </div>
              </div>
            </div>

            {/* TABELA DE ITENS (VERSÃO PREMIUM) */}
            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Descrição do Item</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Tipo</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Preço</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  {/* TABELA DE ITENS ATUALIZADA */}
<tbody className="divide-y divide-slate-50">
  {order.booking_items.map((item) => (
    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
      <td className="py-5">
        <p className="font-black text-slate-800 uppercase italic text-sm leading-none">
          {/* Lógica para identificar o nome do item */}
          {item.item_type === 'quiosque' && `Reserva: ${item.resources?.identifier.replace('QUIOS-', 'Quiosque ')}`}
          {item.item_type === 'churrasqueira' && 'Churrasqueira Extra'}
          {item.item_type.includes('entrada') && `Ingresso: ${item.item_type === 'entrada_adulto' ? 'Adulto' : 'Criança'}`}
        </p>
        
        {/* EXIBIR NOME DO VISITANTE SE FOR INGRESSO */}
        {item.visitor_name && (
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-tighter mt-1">
            Visitante: {item.visitor_name} ({item.visitor_cpf})
          </p>
        )}
        
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">ID #{item.id}</p>
      </td>
      <td className="py-5 text-center">
        <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">
          {item.item_type.replace('_', ' ')}
        </span>
      </td>
      <td className="py-5 text-center font-black text-slate-700 italic text-sm">
        R$ {item.unit_price.toFixed(2)}
      </td>
      <td className="py-5 text-right">
        {order.status === 'paid' && (
          <button 
            onClick={() => cancelItem(item.id, item.item_type, order.id, order.visit_date)}
            className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  ))}
</tbody>
                </table>
              </div>
              
              {order.status === 'paid' && (
                <div className="mt-8 flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <Info size={18} className="text-blue-500" />
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                    Você pode cancelar itens individuais até 48 horas antes da visita. O estorno será automático.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
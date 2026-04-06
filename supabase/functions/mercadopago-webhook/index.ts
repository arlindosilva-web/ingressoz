import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = url.searchParams.get('type');

    // Só processamos se for uma notificação de pagamento
    if (type === 'payment' || !type) {
      const paymentId = id;
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 2. Consultar o Mercado Pago para ver se foi pago mesmo
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` }
      })
      
      const paymentData = await mpResponse.json()

      // 3. SE O PAGAMENTO FOI APROVADO
      if (paymentData.status === 'approved') {
        const bookingId = paymentData.external_reference; // O ID que enviamos na outra função

        // A. Atualizar a reserva para "pago"
        const { error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({ status: 'paid', payment_id: paymentId })
          .eq('id', bookingId)

        if (updateError) throw updateError;

        // B. Gerar os Tickets (QR Codes) para cada entrada
        const { data: items } = await supabaseAdmin
          .from('booking_items')
          .select('*')
          .eq('booking_id', bookingId)
          .ilike('item_type', 'entrada%');

        if (items && items.length > 0) {
          const ticketsToInsert = items.map(item => ({
            booking_id: bookingId,
            qr_code_hash: `IZ-${bookingId.substring(0,4)}-${Math.random().toString(36).substring(2,10).toUpperCase()}`,
            is_validated: false
          }))

          await supabaseAdmin.from('tickets').insert(ticketsToInsert);
        }
        
        console.log(`Reserva ${bookingId} aprovada e tickets gerados!`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error("ERRO WEBHOOK:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
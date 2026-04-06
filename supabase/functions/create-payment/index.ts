import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // 🔐 CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ✅ 1. Pega body com segurança
    let body
    try {
      body = await req.json()
    } catch {
      throw new Error("Body inválido ou vazio")
    }

    console.log("BODY RECEBIDO:", body)

    const { booking_id } = body

    if (!booking_id) {
      throw new Error("booking_id não enviado")
    }

    console.log("Booking ID:", booking_id)

    // ✅ 2. Variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN")

    if (!supabaseUrl || !serviceKey || !mpToken) {
      throw new Error("Variáveis de ambiente não configuradas")
    }

    // ✅ 3. Cliente Supabase
    const supabase = createClient(supabaseUrl, serviceKey)

    // ✅ 4. Busca no banco
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("total_price, visit_date")
      .eq("id", booking_id)
      .single()

    if (bookingError || !booking) {
      console.error("Erro ao buscar booking:", bookingError)
      throw new Error("Reserva não encontrada")
    }

    console.log("BOOKING:", booking)

    // ✅ 5. Validação do valor
    const price = Number(booking.total_price)

    if (!price || isNaN(price)) {
      throw new Error("Valor inválido da reserva")
    }

    // ✅ 6. Criar preferência no Mercado Pago
    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: "IngressoZ - Reserva Chácara",
              quantity: 1,
              unit_price: price,
              currency_id: "BRL",
            },
          ],
          back_urls: {
            success: "https://ingressoz.vercel.app/meus-pedidos",
            failure: "https://ingressoz.vercel.app/checkout",
            pending: "https://ingressoz.vercel.app/meus-pedidos",
          },
          auto_return: "approved",
          external_reference: booking_id,
          notification_url: "https://kwfdatubtrmmkdjaivhn.supabase.co/functions/v1/mercadopago-webhook"
        }),
      }
    )

    const mpData = await mpResponse.json()

    console.log("MP RESPONSE:", mpData)

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", mpData)
      throw new Error(mpData.message || "Erro ao criar pagamento")
    }

    // ✅ 7. Retorna URL do checkout
    return new Response(
      JSON.stringify({
        url: mpData.init_point,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error("ERRO GERAL:", error)

    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})
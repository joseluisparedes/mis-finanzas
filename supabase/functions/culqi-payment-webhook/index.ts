import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CulqiCharge {
  id: string
  amount: number
  currency_code: string
  email: string
  description: string
  source: {
    id: string
    type: string
  }
  outcome: {
    type: string
    code: string
    merchant_message: string
    user_message: string
  }
  metadata?: {
    user_id?: string
    plan_id?: string
  }
}

interface PaymentRequest {
  token_id?: string
  plan_id: string
  amount: number
  currency_code: string
  customer: {
    email: string
    first_name: string
    last_name: string
  }
  description: string
  user_id: string
  // Para creación de token
  card?: {
    card_number: string
    cvv: string
    expiration_month: string
    expiration_year: string
    email: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const culqiSecretKey = Deno.env.get('CULQI_SECRET_KEY')
    if (!culqiSecretKey) {
      throw new Error('CULQI_SECRET_KEY not configured')
    }

    const url = new URL(req.url)
    
    // POST /culqi-payment-webhook - Procesar pago
    if (req.method === 'POST' && url.pathname === '/culqi-payment-webhook') {
      const paymentData: PaymentRequest = await req.json()
      
      let tokenId = paymentData.token_id

      // Si no hay token_id, crear el token primero
      if (!tokenId && paymentData.card) {
        console.log('Creando token desde backend...')
        
        const tokenResponse = await fetch('https://api.culqi.com/v2/tokens', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('CULQI_PUBLIC_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData.card)
        })

        const tokenResult = await tokenResponse.json()
        console.log('Token response:', tokenResult)

        if (!tokenResponse.ok || !tokenResult.id) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: tokenResult.user_message || 'Error creando token de pago'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        tokenId = tokenResult.id
      }
      
      // Validar datos requeridos
      if (!tokenId || !paymentData.plan_id || !paymentData.user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Crear el cargo en Culqi
      const chargeResponse = await fetch('https://api.culqi.com/v2/charges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${culqiSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paymentData.amount, // En centavos
          currency_code: paymentData.currency_code,
          email: paymentData.customer.email,
          source_id: tokenId,
          description: paymentData.description,
          metadata: {
            user_id: paymentData.user_id,
            plan_id: paymentData.plan_id
          }
        })
      })

      const chargeResult = await chargeResponse.json()

      if (chargeResponse.ok && chargeResult.outcome.type === 'venta_exitosa') {
        // Pago exitoso - actualizar suscripción en la base de datos
        await updateUserSubscription(supabaseClient, {
          user_id: paymentData.user_id,
          plan_id: paymentData.plan_id,
          transaction_id: chargeResult.id,
          amount_paid: paymentData.amount / 100, // Convertir de centavos a soles
          currency: paymentData.currency_code
        })

        // Si es Early Bird, unirse a la promoción
        if (paymentData.plan_id === 'premium_early_bird') {
          try {
            // Buscar la promoción Early Bird activa
            const { data: promotionData, error: promoError } = await supabaseClient
              .from('promotions')
              .select('id')
              .eq('name', 'Premium Early Bird')
              .eq('active', true)
              .single()

            if (!promoError && promotionData) {
              const { data: joinData, error: joinError } = await supabaseClient
                .rpc('join_promotion', {
                  promo_id: promotionData.id,
                  user_uuid: paymentData.user_id,
                  transaction_id_param: chargeResult.id,
                  amount_paid_param: paymentData.amount / 100
                })

              if (joinError) {
                console.error('Error joining promotion:', joinError)
              } else if (!joinData.success) {
                console.warn('Could not join promotion:', joinData.error)
              }
            }
          } catch (err) {
            console.error('Error in promotion join process:', err)
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            charge_id: chargeResult.id,
            message: 'Payment successful'
          }), 
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Pago fallido
        console.error('Culqi charge failed:', chargeResult)
        return new Response(
          JSON.stringify({ 
            error: chargeResult.outcome.user_message || 'Payment failed',
            code: chargeResult.outcome.code
          }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // POST /culqi-webhook - Webhook de Culqi para eventos
    if (req.method === 'POST' && url.pathname === '/culqi-webhook') {
      const webhookData = await req.json()
      
      console.log('Webhook received:', webhookData)
      
      // Procesar diferentes tipos de eventos
      switch (webhookData.type) {
        case 'charge.succeeded':
          await handleSuccessfulCharge(supabaseClient, webhookData.data)
          break
        case 'charge.failed':
          await handleFailedCharge(supabaseClient, webhookData.data)
          break
        default:
          console.log('Unhandled webhook type:', webhookData.type)
      }

      return new Response(
        JSON.stringify({ received: true }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in culqi-payment-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function updateUserSubscription(
  supabaseClient: any, 
  data: {
    user_id: string
    plan_id: string
    transaction_id: string
    amount_paid: number
    currency: string
  }
) {
  const { user_id, plan_id, transaction_id, amount_paid, currency } = data
  
  // Determinar tipo de suscripción, período y configuración Early Bird
  let subscription_type = 'premium'
  let billing_period = 'monthly'
  let expires_at = new Date()
  let is_early_bird = false
  let early_bird_price = null
  
  if (plan_id === 'premium_early_bird') {
    billing_period = 'monthly'
    expires_at.setMonth(expires_at.getMonth() + 1)
    is_early_bird = true
    early_bird_price = 5.00 // Precio fundador bloqueado para siempre
  } else if (plan_id === 'premium_yearly') {
    billing_period = 'yearly'
    expires_at.setFullYear(expires_at.getFullYear() + 1)
  } else {
    expires_at.setMonth(expires_at.getMonth() + 1)
  }

  // Actualizar la suscripción del usuario
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      subscription_type,
      status: 'active',
      billing_period,
      expires_at: expires_at.toISOString(),
      price_paid: amount_paid,
      currency,
      transaction_id,
      is_early_bird,
      early_bird_price,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user_id)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  // Aplicar límites del plan premium
  const { error: limitsError } = await supabaseClient
    .rpc('set_subscription_limits', {
      sub_type: subscription_type,
      user_uuid: user_id
    })

  if (limitsError) {
    console.error('Error setting subscription limits:', limitsError)
    throw limitsError
  }

  console.log(`Subscription updated for user ${user_id}: ${subscription_type}`)
}

async function handleSuccessfulCharge(supabaseClient: any, chargeData: CulqiCharge) {
  const { metadata } = chargeData
  
  if (metadata?.user_id && metadata?.plan_id) {
    await updateUserSubscription(supabaseClient, {
      user_id: metadata.user_id,
      plan_id: metadata.plan_id,
      transaction_id: chargeData.id,
      amount_paid: chargeData.amount / 100,
      currency: chargeData.currency_code
    })
  }
}

async function handleFailedCharge(supabaseClient: any, chargeData: CulqiCharge) {
  console.log('Charge failed:', chargeData.id, chargeData.outcome.user_message)
  
  // Aquí podrías registrar el pago fallido en una tabla de logs
  // o enviar una notificación al usuario
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/culqi-payment-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoQ2lQbf7wEuRYX5dJMF96xJk2nw7SxtMw' \
    --header 'Content-Type: application/json' \
    --data '{"token_id":"tkn_test_123","plan_id":"premium_monthly","amount":1500,"currency_code":"PEN","customer":{"email":"test@example.com","first_name":"Test","last_name":"User"},"description":"Test Payment","user_id":"user_123"}'

*/
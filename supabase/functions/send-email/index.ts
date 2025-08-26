import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ResendUsageMonitor } from './services/usage-monitor.ts'

// Configuración de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para los datos del email
interface EmailRequest {
  type: 'welcome_premium' | 'payment_failed' | 'payment_retry' | 'renewal_reminder'
  user_id: string
  recipient_email?: string
  template_data: Record<string, any>
}

// Configuración de Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'no-reply@misfinanzas.com'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'MisFinanzas'
const BASE_URL = Deno.env.get('EMAIL_BASE_URL') || 'https://joseluisparedes.github.io/mis-finanzas'
const SUPPORT_EMAIL = Deno.env.get('EMAIL_SUPPORT_EMAIL') || 'soporte@misfinanzas.com'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Obtener URL para routing
  const url = new URL(req.url);

  // GET /usage - Consultar uso actual de Resend
  if (req.method === 'GET' && url.pathname.endsWith('/usage')) {
    try {
      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'Resend API not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const usageMonitor = new ResendUsageMonitor(RESEND_API_KEY, supabase);
      const { usage } = await usageMonitor.monitor();

      return new Response(
        JSON.stringify({ 
          success: true, 
          usage: {
            used: usage.used,
            remaining: usage.remaining,
            limit: usage.limit,
            percentage: usage.percentage,
            resetDate: usage.resetDate
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error checking usage:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // POST - Enviar email
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validar variables de entorno
    if (!RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY environment variable')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const emailRequest: EmailRequest = await req.json()
    console.log('Email request received:', emailRequest.type, 'for user:', emailRequest.user_id)

    // Crear cliente de Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener información del usuario si no se proporciona el email
    let recipientEmail = emailRequest.recipient_email
    let userName = emailRequest.template_data.user_name || 'Usuario'

    if (!recipientEmail && emailRequest.user_id) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(emailRequest.user_id)
      
      if (userError) {
        console.error('Error fetching user:', userError)
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      recipientEmail = user.user.email
      
      // Intentar obtener el nombre del perfil
      if (!emailRequest.template_data.user_name) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, first_name')
          .eq('user_id', emailRequest.user_id)
          .single()
        
        if (profile) {
          userName = profile.full_name || profile.first_name || 'Usuario'
        }
      }
    }

    if (!recipientEmail) {
      console.error('No recipient email found')
      return new Response(
        JSON.stringify({ success: false, error: 'No recipient email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generar contenido del email según el tipo
    const emailContent = await generateEmailContent(emailRequest.type, {
      ...emailRequest.template_data,
      user_name: userName,
      base_url: BASE_URL,
      support_email: SUPPORT_EMAIL
    })

    console.log('Generated email content for type:', emailRequest.type)

    // Enviar email via Resend
    const emailPayload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult)
      
      // Guardar error en base de datos
      await supabase.from('email_notifications').insert({
        user_id: emailRequest.user_id,
        email_type: emailRequest.type,
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: JSON.stringify(resendResult),
        template_data: emailRequest.template_data,
        failed_at: new Date().toISOString()
      })

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email', details: resendResult }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Email sent successfully:', resendResult.id)

    // Guardar éxito en base de datos
    await supabase.from('email_notifications').insert({
      user_id: emailRequest.user_id,
      email_type: emailRequest.type,
      recipient_email: recipientEmail,
      status: 'sent',
      resend_message_id: resendResult.id,
      template_data: emailRequest.template_data,
      sent_at: new Date().toISOString()
    })

    // NUEVO: Verificar uso y enviar alertas si es necesario
    try {
      const usageMonitor = new ResendUsageMonitor(RESEND_API_KEY, supabase);
      const { usage, alertSent } = await usageMonitor.monitor();
      
      console.log(`Current email usage: ${usage.used}/${usage.limit} (${usage.percentage}%)`);
      
      if (alertSent) {
        console.log('⚠️ Usage alert sent to admin');
      }
    } catch (monitorError) {
      console.error('Warning: Usage monitoring failed:', monitorError);
      // No bloquear el envío por errores de monitoreo
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: resendResult.id,
        recipient: recipientEmail
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Función para generar contenido del email
async function generateEmailContent(type: string, data: Record<string, any>) {
  switch (type) {
    case 'welcome_premium':
      return {
        subject: `🎉 ¡Bienvenido a MisFinanzas Premium, ${data.user_name}! Todas las funciones desbloqueadas`,
        html: generateWelcomePremiumHTML(data)
      }
    
    case 'payment_failed':
      return {
        subject: `⚠️ Problema con tu pago en MisFinanzas - Acción requerida`,
        html: generatePaymentFailedHTML(data)
      }
    
    case 'payment_retry':
      return {
        subject: `🔄 Recordatorio: Actualiza tu método de pago en MisFinanzas`,
        html: generatePaymentRetryHTML(data)
      }
    
    case 'renewal_reminder':
      return {
        subject: `📅 Tu suscripción Premium se renueva en 7 días`,
        html: generateRenewalReminderHTML(data)
      }
    
    default:
      throw new Error(`Unknown email type: ${type}`)
  }
}

// Template: Bienvenida Premium
function generateWelcomePremiumHTML(data: Record<string, any>): string {
  const features = data.premium_features || [
    'Transacciones ilimitadas',
    'Multi-moneda PEN/USD',
    'Exportar Excel completo',
    'Análisis avanzados',
    'Gráficos premium',
    'Soporte prioritario'
  ]

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a Premium</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); padding: 40px 20px; text-align: center; }
        .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .header-text { color: white; font-size: 18px; opacity: 0.9; }
        .content { padding: 40px 20px; }
        .welcome-title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 16px; text-align: center; }
        .welcome-text { font-size: 16px; color: #6b7280; margin-bottom: 30px; text-align: center; line-height: 1.6; }
        .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 30px 0; }
        .feature-item { display: flex; align-items: center; padding: 12px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e; }
        .feature-icon { margin-right: 12px; font-size: 20px; }
        .feature-text { font-size: 14px; color: #166534; font-weight: 500; }
        .cta-section { text-align: center; margin: 40px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .cta-button:hover { transform: translateY(-1px); }
        .quick-actions { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .quick-actions h3 { color: #1f2937; margin: 0 0 16px 0; font-size: 18px; }
        .action-link { display: block; color: #3b82f6; text-decoration: none; padding: 8px 0; font-weight: 500; }
        .footer { background-color: #1f2937; color: #9ca3af; padding: 30px 20px; text-align: center; }
        .support-info { margin-top: 20px; }
        @media (max-width: 480px) { .features-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💰 MisFinanzas</div>
            <div class="header-text">Tu asistente financiero personal</div>
        </div>
        
        <div class="content">
            <h1 class="welcome-title">¡Hola ${data.user_name}! 🎉</h1>
            <p class="welcome-text">
                ¡Felicitaciones! Tu pago de <strong>S/ ${data.amount}</strong> se procesó exitosamente y ahora tienes acceso completo a <strong>MisFinanzas Premium</strong>.
            </p>
            
            <div class="quick-actions">
                <h3>🚀 Empieza ahora mismo:</h3>
                <a href="${data.base_url}#gastos" class="action-link">→ Registrar tus primeros gastos ilimitados</a>
                <a href="${data.base_url}#presupuestos" class="action-link">→ Crear presupuestos sin límite</a>
                <a href="${data.base_url}#reportes" class="action-link">→ Explorar análisis avanzados</a>
                <a href="${data.base_url}#configuracion" class="action-link">→ Configurar multi-moneda PEN/USD</a>
            </div>
            
            <h3 style="color: #1f2937; margin: 30px 0 20px 0;">✨ Funciones Premium desbloqueadas:</h3>
            <div class="features-grid">
                ${features.map(feature => `
                    <div class="feature-item">
                        <span class="feature-icon">✅</span>
                        <span class="feature-text">${feature}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="cta-section">
                <a href="${data.base_url}" class="cta-button">Comenzar a usar Premium</a>
            </div>
            
            <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
                <strong>💡 Tip Pro:</strong> Como usuario Premium, tienes acceso a nuestro soporte prioritario. Cualquier duda, contáctanos en <a href="mailto:${data.support_email}" style="color: #d97706;">${data.support_email}</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Gracias por confiar en MisFinanzas</strong></p>
            <div class="support-info">
                <p>¿Necesitas ayuda? Contáctanos:</p>
                <p>📧 ${data.support_email}</p>
                <p>🌐 <a href="${data.base_url}" style="color: #60a5fa;">${data.base_url}</a></p>
            </div>
        </div>
    </div>
</body>
</html>`
}

// Template: Fallo de Pago
function generatePaymentFailedHTML(data: Record<string, any>): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Problema con tu pago</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; }
        .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .header-text { color: white; font-size: 18px; opacity: 0.9; }
        .content { padding: 40px 20px; }
        .alert-title { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 16px; text-align: center; }
        .alert-text { font-size: 16px; color: #6b7280; margin-bottom: 30px; text-align: center; line-height: 1.6; }
        .problem-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .problem-title { color: #dc2626; font-weight: 600; margin-bottom: 8px; }
        .problem-text { color: #7f1d1d; }
        .solution-steps { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .solution-title { color: #0c4a6e; font-weight: 600; margin-bottom: 16px; }
        .step { display: flex; margin-bottom: 12px; }
        .step-number { background-color: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold; font-size: 14px; }
        .step-text { flex: 1; color: #1e40af; }
        .cta-section { text-align: center; margin: 40px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .timeline-box { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .footer { background-color: #1f2937; color: #9ca3af; padding: 30px 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💰 MisFinanzas</div>
            <div class="header-text">Tu asistente financiero personal</div>
        </div>
        
        <div class="content">
            <h1 class="alert-title">⚠️ Problema con tu pago</h1>
            <p class="alert-text">
                Hola <strong>${data.user_name}</strong>, intentamos procesar tu pago de <strong>S/ ${data.amount}</strong> pero no pudimos completarlo.
            </p>
            
            <div class="problem-box">
                <div class="problem-title">🚫 Motivo del error:</div>
                <div class="problem-text">${data.error_reason || 'Fondos insuficientes o tarjeta rechazada'}</div>
            </div>
            
            <div class="solution-steps">
                <div class="solution-title">✅ Cómo solucionarlo:</div>
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-text">Verifica que tu tarjeta tenga fondos suficientes</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-text">Confirma que la fecha de vencimiento sea correcta</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-text">Intenta nuevamente o usa otra tarjeta</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-text">Contacta a tu banco si el problema persiste</div>
                </div>
            </div>
            
            <div class="cta-section">
                <a href="${data.retry_url || data.base_url + '#planes'}" class="cta-button">Actualizar método de pago</a>
            </div>
            
            <div class="timeline-box">
                <strong>⏰ Información importante:</strong>
                <p>Tienes <strong>7 días</strong> para actualizar tu método de pago antes de que tu cuenta regrese al plan gratuito. No queremos que pierdas acceso a tus funciones premium.</p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #3b82f6;">
                <strong>💬 ¿Necesitas ayuda?</strong><br>
                Nuestro equipo de soporte está aquí para ayudarte. Responde este email o contáctanos en <a href="mailto:${data.support_email}" style="color: #3b82f6;">${data.support_email}</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Equipo MisFinanzas</strong></p>
            <p>📧 ${data.support_email} | 🌐 <a href="${data.base_url}" style="color: #60a5fa;">${data.base_url}</a></p>
        </div>
    </div>
</body>
</html>`
}

// Templates adicionales (implementación básica)
function generatePaymentRetryHTML(data: Record<string, any>): string {
  return generatePaymentFailedHTML({...data, is_retry: true})
}

function generateRenewalReminderHTML(data: Record<string, any>): string {
  return `<h1>Renovación próxima</h1><p>Tu suscripción se renueva pronto.</p>`
}
// TEST REAL DE ENVÍO DE EMAIL
// Este script llama directamente a la Edge Function para envío real

const testRealEmail = async () => {
  console.log('📧 ENVIANDO EMAIL REAL CON GMAIL SMTP (100% GRATIS)...');
  
  try {
    // Llamada real a la función de Supabase (Simple Logger)
    const response = await fetch('https://aimfmouxduklejrejlcq.supabase.co/functions/v1/send-email-simple', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbWZtb3V4ZHVrbGVqcmVqbGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTA4MDksImV4cCI6MjA3MDk4NjgwOX0.Glm5FuQGmcCM-vAJsDTgwvIDyujYntDc23iiWfCTDFI',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'welcome_premium',
        user_id: 'ad733270-4009-48d1-a276-1085e358b465',
        recipient_email: 'contacto.intrusosgamers@gmail.com',
        template_data: {
          user_name: 'contacto intrusos',
          plan_name: 'Premium Early Bird',
          amount: '5',
          premium_features: [
            'Transacciones ilimitadas',
            'Multi-moneda PEN/USD',
            'Exportar Excel completo',
            'Análisis avanzados',
            'Soporte prioritario'
          ]
        }
      })
    });

    const result = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📧 Resultado:', result);
    
    if (result.success) {
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE!');
      console.log('📨 Message ID:', result.message_id);
      console.log('📬 Destinatario:', result.recipient);
      console.log('🔍 Revisa tu email y carpeta de SPAM');
    } else {
      console.log('❌ Error:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Error en el envío:', error.message);
  }
};

// Ejecutar
testRealEmail();
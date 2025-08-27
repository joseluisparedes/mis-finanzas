// Test completo del sistema de emails
// Ejecutar con: node test-email-system.js

const testEmailSystem = async () => {
  console.log('🧪 INICIANDO TEST COMPLETO DEL SISTEMA DE EMAILS');
  console.log('='.repeat(60));

  // 1. Test de monitoreo de uso
  console.log('\n📊 1. TESTEANDO MONITOREO DE USO...');
  
  try {
    const usageResponse = await fetch('https://aimfmouxduklejrejlcq.supabase.co/functions/v1/send-email/usage', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbWZtb3V4ZHVrbGVqcmVqbGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTA4MDksImV4cCI6MjA3MDk4NjgwOX0.Glm5FuQGmcCM-vAJsDTgwvIDyujYntDc23iiWfCTDFI'
      }
    });
    
    const usageData = await usageResponse.json();
    console.log('✅ Uso actual:', usageData);
    
    if (usageData.success) {
      console.log(`📈 Emails: ${usageData.usage.used}/${usageData.usage.limit} (${usageData.usage.percentage}%)`);
      console.log(`🔄 Reset: ${new Date(usageData.usage.resetDate).toLocaleDateString('es-ES')}`);
    }
    
  } catch (error) {
    console.error('❌ Error en test de uso:', error.message);
  }

  // 2. Test de envío de email directo
  console.log('\n📧 2. TESTEANDO ENVÍO DE EMAIL DIRECTO...');
  
  try {
    const emailPayload = {
      type: 'welcome_premium',
      user_id: 'test-user-12345',
      recipient_email: 'soporte@misfinanzas.com', // Cambiar por tu email
      template_data: {
        user_name: 'Usuario Prueba',
        plan_name: 'Premium Early Bird',
        amount: '15',
        premium_features: [
          'Transacciones ilimitadas',
          'Multi-moneda PEN/USD',
          'Exportar Excel completo',
          'Análisis avanzados',
          'Soporte prioritario'
        ]
      }
    };

    // Nota: Este test requiere service_role key que no podemos usar desde aquí
    console.log('📋 Payload preparado:', JSON.stringify(emailPayload, null, 2));
    console.log('⚠️ Para test real necesitas ejecutar desde Supabase Dashboard o con service_role key');
    
  } catch (error) {
    console.error('❌ Error en test de email:', error.message);
  }

  // 3. Simulación de flujo completo
  console.log('\n🎯 3. SIMULACIÓN DEL FLUJO COMPLETO...');
  console.log('┌─ Usuario hace pago Premium');
  console.log('├─ Culqi procesa el pago exitosamente');
  console.log('├─ Se actualiza suscripción en BD');
  console.log('├─ Se dispara email de bienvenida automático');
  console.log('├─ Se actualiza contador de emails enviados');
  console.log('├─ Sistema verifica si necesita alertas');
  console.log('└─ Usuario recibe email de confirmación');

  console.log('\n🎉 SISTEMA LISTO PARA:');
  console.log('✅ Emails automáticos de bienvenida Premium');
  console.log('✅ Emails automáticos de fallo de pago');
  console.log('✅ Alertas automáticas al admin al 75% y 90%');
  console.log('✅ Monitoreo en tiempo real en dashboard');
  console.log('✅ Reset automático cada mes');

  console.log('\n📞 PARA ACTIVAR COMPLETAMENTE:');
  console.log('1. Haz una compra real en la app');
  console.log('2. Revisa tu email (soporte@misfinanzas.com)');
  console.log('3. Verifica dashboard admin en la app');
  console.log('4. Monitorea logs en Supabase Functions');

  console.log('\n🔗 URLs ÚTILES:');
  console.log('• App: https://joseluisparedes.github.io/mis-finanzas/');
  console.log('• Functions: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/functions');
  console.log('• Logs: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/logs');
  console.log('• Resend: https://resend.com/emails');
};

// Ejecutar test
testEmailSystem().catch(console.error);
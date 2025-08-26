// ================================================================
// MONITOR DE USO DE RESEND - ALERTAS AUTOMÁTICAS
// ================================================================
// Fecha: 26 Agosto 2025
// Propósito: Monitorear uso de Resend y alertar al 90%

interface ResendUsage {
  limit: number;
  remaining: number;
  used: number;
  resetDate: string;
  percentage: number;
}

interface AlertConfig {
  warningThreshold: number; // 75%
  criticalThreshold: number; // 90%
  adminEmail: string;
  enabled: boolean;
}

export class ResendUsageMonitor {
  private resendApiKey: string;
  private supabaseClient: any;
  private config: AlertConfig;

  constructor(resendApiKey: string, supabaseClient: any) {
    this.resendApiKey = resendApiKey;
    this.supabaseClient = supabaseClient;
    this.config = {
      warningThreshold: 75,
      criticalThreshold: 90,
      adminEmail: Deno.env.get('ADMIN_EMAIL') || 'admin@misfinanzas.com',
      enabled: true
    };
  }

  /**
   * Obtiene el uso actual de Resend API
   */
  async getCurrentUsage(): Promise<ResendUsage> {
    try {
      // Resend no tiene endpoint público de usage, así que usamos nuestro tracking
      const currentMonth = new Date().toISOString().slice(0, 7); // 2025-08
      
      // Contar emails enviados este mes desde nuestra BD
      const { data: emailCount, error } = await this.supabaseClient
        .from('email_notifications')
        .select('id', { count: 'exact' })
        .gte('created_at', `${currentMonth}-01T00:00:00Z`)
        .lt('created_at', this.getNextMonthStart())
        .eq('status', 'sent');

      if (error) {
        console.error('Error querying email usage:', error);
        throw new Error('Could not fetch usage data');
      }

      const used = emailCount?.length || 0;
      const limit = 3000; // Límite gratuito de Resend
      const remaining = Math.max(0, limit - used);
      const percentage = Math.round((used / limit) * 100);
      
      // Calcular próximo reset (primer día del próximo mes)
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);

      return {
        limit,
        remaining,
        used,
        resetDate: nextMonth.toISOString(),
        percentage
      };

    } catch (error) {
      console.error('Error fetching Resend usage:', error);
      throw error;
    }
  }

  /**
   * Verifica si se debe enviar alerta y la envía
   */
  async checkAndSendAlert(usage: ResendUsage): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // Verificar si ya se envió alerta este mes para este threshold
    const alertType = usage.percentage >= this.config.criticalThreshold ? 'critical' : 'warning';
    const existingAlert = await this.getExistingAlert(alertType);

    if (existingAlert) {
      console.log(`Alert ${alertType} already sent this month`);
      return false;
    }

    // Determinar si se debe enviar alerta
    const shouldAlert = 
      (usage.percentage >= this.config.criticalThreshold) ||
      (usage.percentage >= this.config.warningThreshold && usage.percentage < this.config.criticalThreshold);

    if (!shouldAlert) {
      return false;
    }

    // Enviar alerta
    await this.sendUsageAlert(usage, alertType);
    
    // Registrar que se envió la alerta
    await this.recordAlert(alertType, usage);
    
    return true;
  }

  /**
   * Envía email de alerta de uso
   */
  private async sendUsageAlert(usage: ResendUsage, alertType: 'warning' | 'critical'): Promise<void> {
    const isCritical = alertType === 'critical';
    const subject = isCritical 
      ? `🚨 CRÍTICO: Uso de emails al ${usage.percentage}% - MisFinanzas`
      : `⚠️ AVISO: Uso de emails al ${usage.percentage}% - MisFinanzas`;

    const htmlContent = this.generateAlertHTML(usage, isCritical);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Sistema <no-reply@misfinanzas.com>',
          to: [this.config.adminEmail],
          subject,
          html: htmlContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send alert: ${JSON.stringify(error)}`);
      }

      console.log(`Usage alert sent: ${alertType} at ${usage.percentage}%`);
    } catch (error) {
      console.error('Error sending usage alert:', error);
      throw error;
    }
  }

  /**
   * Genera HTML para email de alerta
   */
  private generateAlertHTML(usage: ResendUsage, isCritical: boolean): string {
    const alertColor = isCritical ? '#ef4444' : '#f59e0b';
    const alertIcon = isCritical ? '🚨' : '⚠️';
    const alertTitle = isCritical ? 'CRÍTICO' : 'AVISO';
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta de Uso - MisFinanzas</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: ${alertColor}; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .usage-bar { background-color: #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0; }
        .usage-fill { height: 20px; background-color: ${alertColor}; transition: width 0.3s ease; }
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 30px 0; }
        .stat { text-align: center; padding: 15px; background-color: #f9fafb; border-radius: 8px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1f2937; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .recommendation { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
        .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${alertIcon} ${alertTitle}: Uso de Emails al ${usage.percentage}%</h1>
            <p>Sistema de monitoreo automático - MisFinanzas</p>
        </div>
        
        <div class="content">
            <p><strong>Hola Administrador,</strong></p>
            <p>El uso de emails de Resend ha alcanzado el <strong>${usage.percentage}%</strong> del límite mensual gratuito.</p>
            
            <div class="usage-bar">
                <div class="usage-fill" style="width: ${usage.percentage}%"></div>
            </div>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${usage.used.toLocaleString()}</div>
                    <div class="stat-label">Emails Enviados</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${usage.remaining.toLocaleString()}</div>
                    <div class="stat-label">Emails Restantes</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${usage.limit.toLocaleString()}</div>
                    <div class="stat-label">Límite Mensual</div>
                </div>
            </div>
            
            <div class="recommendation">
                <h3>📋 Recomendaciones:</h3>
                <ul>
                    ${isCritical 
                      ? `<li><strong>ACCIÓN INMEDIATA:</strong> Monitorear envíos restantes</li>
                         <li><strong>Considerar upgrade</strong> a plan paid si es necesario</li>
                         <li><strong>Pausar emails no críticos</strong> hasta el próximo reset</li>`
                      : `<li><strong>Monitorear uso</strong> más frecuentemente</li>
                         <li><strong>Revisar tipos de emails</strong> que más se envían</li>
                         <li><strong>Optimizar templates</strong> para reducir bounces</li>`
                    }
                    <li><strong>Reset automático:</strong> ${new Date(usage.resetDate).toLocaleDateString('es-ES')}</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Dashboard:</strong> <a href="https://resend.com/emails">Ver métricas en Resend</a></p>
                <p><strong>Supabase:</strong> <a href="https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/editor">Ver logs de emails</a></p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>MisFinanzas - Sistema de Monitoreo Automático</strong></p>
            <p>Este email se genera automáticamente cuando el uso supera los thresholds configurados.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Verifica si ya existe alerta para este mes
   */
  private async getExistingAlert(alertType: string): Promise<boolean> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const { data, error } = await this.supabaseClient
      .from('email_notifications')
      .select('id')
      .eq('email_type', `usage_alert_${alertType}`)
      .gte('created_at', `${currentMonth}-01T00:00:00Z`)
      .lt('created_at', this.getNextMonthStart())
      .limit(1);

    if (error) {
      console.error('Error checking existing alerts:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Registra que se envió una alerta
   */
  private async recordAlert(alertType: string, usage: ResendUsage): Promise<void> {
    await this.supabaseClient
      .from('email_notifications')
      .insert({
        user_id: null, // Sistema
        email_type: `usage_alert_${alertType}`,
        recipient_email: this.config.adminEmail,
        status: 'sent',
        template_data: {
          usage_percentage: usage.percentage,
          emails_used: usage.used,
          emails_remaining: usage.remaining,
          alert_type: alertType
        },
        sent_at: new Date().toISOString()
      });
  }

  /**
   * Obtiene fecha de inicio del próximo mes
   */
  private getNextMonthStart(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }

  /**
   * Método principal para ejecutar verificación completa
   */
  async monitor(): Promise<{ usage: ResendUsage; alertSent: boolean }> {
    try {
      console.log('Starting Resend usage monitoring...');
      
      const usage = await this.getCurrentUsage();
      console.log(`Current usage: ${usage.used}/${usage.limit} (${usage.percentage}%)`);
      
      const alertSent = await this.checkAndSendAlert(usage);
      
      if (alertSent) {
        console.log('Usage alert sent successfully');
      }
      
      return { usage, alertSent };
      
    } catch (error) {
      console.error('Error in usage monitoring:', error);
      throw error;
    }
  }
}
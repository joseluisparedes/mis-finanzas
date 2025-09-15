import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, FileText } from 'lucide-react';

const PDFExport = ({ 
  monthData, 
  selectedMonth, 
  expenses = [], 
  incomes = [], 
  userProfile = {},
  className = "" 
}) => {
  
  const generatePDF = async () => {
    // Crear elemento temporal para el PDF
    const element = document.createElement('div');
    element.id = 'pdf-content';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '210mm'; // A4 width
    element.style.padding = '20mm';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.backgroundColor = 'white';
    
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const generateDate = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Contenido HTML del PDF
    element.innerHTML = `
      <div style="max-width: 170mm; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        
        <!-- Header con branding sutil -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #16A34A; padding-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #16A34A 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">$</span>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 24px; color: #16A34A; font-weight: 700;">MisFinanzas</h1>
              <p style="margin: 0; font-size: 12px; color: #666; font-weight: 400;">appdemisfinanzas.com</p>
            </div>
          </div>
          <h2 style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">Estado de Cuenta Mensual</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${monthName}</p>
        </div>

        <!-- Información del titular -->
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #16A34A;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #16A34A; font-weight: 600;">TITULAR DE LA CUENTA</h3>
          <p style="margin: 0; font-size: 12px; color: #333;"><strong>Nombre:</strong> ${userProfile.full_name || 'Usuario'}</p>
          <p style="margin: 0; font-size: 12px; color: #333;"><strong>Email:</strong> ${userProfile.email || 'No disponible'}</p>
          <p style="margin: 0; font-size: 12px; color: #333;"><strong>Fecha de generación:</strong> ${generateDate}</p>
        </div>

        <!-- Resumen financiero -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #16A34A; font-weight: 600;">INGRESOS TOTALES</p>
            <p style="margin: 0; font-size: 18px; color: #16A34A; font-weight: 700;">S/ ${monthData.totalIncomes.toFixed(2)}</p>
          </div>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #dc2626; font-weight: 600;">GASTOS TOTALES</p>
            <p style="margin: 0; font-size: 18px; color: #dc2626; font-weight: 700;">S/ ${monthData.totalExpenses.toFixed(2)}</p>
          </div>
          <div style="background: ${monthData.balance >= 0 ? '#eff6ff' : '#fef2f2'}; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid ${monthData.balance >= 0 ? '#bfdbfe' : '#fecaca'};">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: ${monthData.balance >= 0 ? '#2563eb' : '#dc2626'}; font-weight: 600;">BALANCE NETO</p>
            <p style="margin: 0; font-size: 18px; color: ${monthData.balance >= 0 ? '#2563eb' : '#dc2626'}; font-weight: 700;">${monthData.balance >= 0 ? 'S/' : '-S/'} ${Math.abs(monthData.balance).toFixed(2)}</p>
          </div>
        </div>

        <!-- Tasa de ahorro -->
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">
            <strong>Tasa de Ahorro:</strong> 
            <span style="color: ${monthData.totalIncomes > 0 && ((monthData.balance / monthData.totalIncomes) * 100) >= 20 ? '#16A34A' : '#dc2626'}; font-weight: 600;">
              ${monthData.totalIncomes > 0 ? ((monthData.balance / monthData.totalIncomes) * 100).toFixed(1) : '0.0'}%
            </span>
            ${monthData.totalIncomes > 0 && ((monthData.balance / monthData.totalIncomes) * 100) >= 20 ? ' (Excelente)' : monthData.totalIncomes > 0 && ((monthData.balance / monthData.totalIncomes) * 100) >= 10 ? ' (Bueno)' : ' (Mejorable)'}
          </p>
        </div>

        <!-- Detalle de transacciones -->
        ${incomes.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #16A34A; font-weight: 600; border-bottom: 2px solid #16A34A; padding-bottom: 5px;">
            💰 INGRESOS DEL MES (${incomes.length})
          </h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
            ${incomes.slice(0, 10).map((income, index) => `
              <div style="padding: 10px 15px; border-bottom: ${index === incomes.slice(0, 10).length - 1 ? 'none' : '1px solid #f3f4f6'}; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <p style="margin: 0; font-size: 12px; font-weight: 600; color: #333;">${income.description}</p>
                  <p style="margin: 2px 0 0 0; font-size: 10px; color: #666;">${new Date(income.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; font-weight: 700; color: #16A34A;">+S/ ${income.amount.toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
            ${incomes.length > 10 ? `
              <div style="padding: 8px 15px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666; font-style: italic;">... y ${incomes.length - 10} ingresos más</p>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${expenses.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #dc2626; font-weight: 600; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">
            🛒 GASTOS DEL MES (${expenses.length})
          </h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
            ${expenses.slice(0, 15).map((expense, index) => `
              <div style="padding: 10px 15px; border-bottom: ${index === expenses.slice(0, 15).length - 1 ? 'none' : '1px solid #f3f4f6'}; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-size: 12px; font-weight: 600; color: #333;">${expense.description}</p>
                  <p style="margin: 2px 0 0 0; font-size: 10px; color: #666;">
                    ${new Date(expense.date).toLocaleDateString('es-ES')} • ${expense.category?.name || 'Sin categoría'}
                  </p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; font-weight: 700; color: #dc2626;">-S/ ${expense.amount.toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
            ${expenses.length > 15 ? `
              <div style="padding: 8px 15px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 10px; color: #666; font-style: italic;">... y ${expenses.length - 15} gastos más</p>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 10px; color: #9ca3af;">
            Este documento fue generado automáticamente por MisFinanzas<br>
            Para más información visite: <span style="color: #16A34A;">appdemisfinanzas.com</span>
          </p>
          <p style="margin: 5px 0 0 0; font-size: 8px; color: #d1d5db;">
            Documento generado el ${generateDate} | Página 1 de 1
          </p>
        </div>

      </div>
    `;

    document.body.appendChild(element);

    try {
      // Configurar html2canvas para mejor calidad
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: 'white',
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Descargar
      const fileName = `Estado-Cuenta-${monthName.replace(' ', '-')}-MisFinanzas.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      // Limpiar
      document.body.removeChild(element);
    }
  };

  return (
    <button
      onClick={generatePDF}
      className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${className}`}
      title="Exportar estado de cuenta en PDF"
    >
      <Download className="w-4 h-4" />
      <span>Exportar PDF</span>
      <FileText className="w-4 h-4" />
    </button>
  );
};

export default PDFExport;
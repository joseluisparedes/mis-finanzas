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
    // Validar datos antes de proceder
    if (!monthData || !selectedMonth) {
      alert('No hay datos disponibles para generar el PDF');
      return;
    }

    // Crear elemento temporal para el PDF con dimensiones exactas
    const element = document.createElement('div');
    element.id = 'pdf-content';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '794px'; // A4 width en pixels (210mm a 96 DPI)
    element.style.minHeight = '1123px'; // A4 height en pixels (297mm a 96 DPI)
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.backgroundColor = 'white';
    element.style.boxSizing = 'border-box';
    
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

    // Contenido HTML del PDF optimizado
    element.innerHTML = `
      <div style="width: 100%; font-family: Arial, sans-serif; color: #333; font-size: 12px;">
        
        <!-- Header con logo centrado -->
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #16A34A; padding-bottom: 15px;">
          <div style="margin-bottom: 10px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #16A34A 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <span style="color: white; font-size: 20px; font-weight: bold;">$</span>
            </div>
            <h1 style="margin: 0; font-size: 20px; color: #16A34A; font-weight: 700;">MisFinanzas</h1>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #666;">appdemisfinanzas.com</p>
          </div>
          <h2 style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Estado de Cuenta Mensual</h2>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">${monthName}</p>
        </div>

        <!-- Información del titular -->
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 20px; border-left: 3px solid #16A34A;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #16A34A; font-weight: 600;">INFORMACIÓN DE LA CUENTA</h3>
          ${userProfile.email ? `<p style="margin: 0; font-size: 11px; color: #333;"><strong>Email:</strong> ${userProfile.email}</p>` : ''}
          <p style="margin: 0; font-size: 11px; color: #333;"><strong>Fecha de generación:</strong> ${generateDate}</p>
          <p style="margin: 0; font-size: 11px; color: #333;"><strong>Período:</strong> ${monthName}</p>
        </div>

        <!-- Resumen financiero -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px;">
          <div style="background: #ecfdf5; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #bbf7d0; flex: 1;">
            <p style="margin: 0 0 3px 0; font-size: 10px; color: #16A34A; font-weight: 600;">INGRESOS TOTALES</p>
            <p style="margin: 0; font-size: 14px; color: #16A34A; font-weight: 700;">S/ ${(monthData.totalIncomes || 0).toFixed(2)}</p>
          </div>
          <div style="background: #fef2f2; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #fecaca; flex: 1;">
            <p style="margin: 0 0 3px 0; font-size: 10px; color: #dc2626; font-weight: 600;">GASTOS TOTALES</p>
            <p style="margin: 0; font-size: 14px; color: #dc2626; font-weight: 700;">S/ ${(monthData.totalExpenses || 0).toFixed(2)}</p>
          </div>
          <div style="background: ${(monthData.balance || 0) >= 0 ? '#eff6ff' : '#fef2f2'}; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid ${(monthData.balance || 0) >= 0 ? '#bfdbfe' : '#fecaca'}; flex: 1;">
            <p style="margin: 0 0 3px 0; font-size: 10px; color: ${(monthData.balance || 0) >= 0 ? '#2563eb' : '#dc2626'}; font-weight: 600;">BALANCE NETO</p>
            <p style="margin: 0; font-size: 14px; color: ${(monthData.balance || 0) >= 0 ? '#2563eb' : '#dc2626'}; font-weight: 700;">${(monthData.balance || 0) >= 0 ? 'S/' : '-S/'} ${Math.abs(monthData.balance || 0).toFixed(2)}</p>
          </div>
        </div>

        <!-- Tasa de ahorro -->
        <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; margin-bottom: 15px; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #475569;">
            <strong>Tasa de Ahorro:</strong> 
            <span style="color: ${(monthData.totalIncomes || 0) > 0 && (((monthData.balance || 0) / (monthData.totalIncomes || 1)) * 100) >= 20 ? '#16A34A' : '#dc2626'}; font-weight: 600;">
              ${(monthData.totalIncomes || 0) > 0 ? (((monthData.balance || 0) / (monthData.totalIncomes || 1)) * 100).toFixed(1) : '0.0'}%
            </span>
            ${(monthData.totalIncomes || 0) > 0 && (((monthData.balance || 0) / (monthData.totalIncomes || 1)) * 100) >= 20 ? ' (Excelente)' : (monthData.totalIncomes || 0) > 0 && (((monthData.balance || 0) / (monthData.totalIncomes || 1)) * 100) >= 10 ? ' (Bueno)' : ' (Mejorable)'}
          </p>
        </div>

        <!-- Detalle de transacciones -->
        ${incomes.length > 0 ? `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #16A34A; font-weight: 600; border-bottom: 1px solid #16A34A; padding-bottom: 3px;">
            💰 INGRESOS DEL MES (${incomes.length})
          </h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4px; max-height: 200px; overflow: hidden;">
            ${incomes.slice(0, 8).map((income, index) => `
              <div style="padding: 6px 10px; border-bottom: ${index === incomes.slice(0, 8).length - 1 ? 'none' : '1px solid #f3f4f6'}; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-size: 10px; font-weight: 600; color: #333;">${(income.description || '').substring(0, 50)}${(income.description || '').length > 50 ? '...' : ''}</p>
                  <p style="margin: 1px 0 0 0; font-size: 8px; color: #666;">${new Date(income.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div style="text-align: right; margin-left: 10px;">
                  <p style="margin: 0; font-size: 10px; font-weight: 700; color: #16A34A;">+S/ ${(income.amount || 0).toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
            ${incomes.length > 8 ? `
              <div style="padding: 4px 10px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 8px; color: #666; font-style: italic;">... y ${incomes.length - 8} ingresos más</p>
              </div>
            ` : ''}
          </div>
        </div>
        ` : `
        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #16A34A; font-weight: 600; border-bottom: 1px solid #16A34A; padding-bottom: 3px;">
            💰 INGRESOS DEL MES (0)
          </h3>
          <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 4px;">
            <p style="margin: 0; font-size: 10px; color: #666; font-style: italic;">No hay ingresos registrados en este período</p>
          </div>
        </div>
        `}

        ${expenses.length > 0 ? `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: 600; border-bottom: 1px solid #dc2626; padding-bottom: 3px;">
            🛒 GASTOS DEL MES (${expenses.length})
          </h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4px; max-height: 300px; overflow: hidden;">
            ${expenses.slice(0, 12).map((expense, index) => `
              <div style="padding: 6px 10px; border-bottom: ${index === expenses.slice(0, 12).length - 1 ? 'none' : '1px solid #f3f4f6'}; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-size: 10px; font-weight: 600; color: #333;">${(expense.description || '').substring(0, 45)}${(expense.description || '').length > 45 ? '...' : ''}</p>
                  <p style="margin: 1px 0 0 0; font-size: 8px; color: #666;">
                    ${new Date(expense.date).toLocaleDateString('es-ES')} • ${(expense.category?.name || 'Sin categoría').substring(0, 20)}
                  </p>
                </div>
                <div style="text-align: right; margin-left: 10px;">
                  <p style="margin: 0; font-size: 10px; font-weight: 700; color: #dc2626;">-S/ ${(expense.amount || 0).toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
            ${expenses.length > 12 ? `
              <div style="padding: 4px 10px; background: #f9fafb; text-align: center;">
                <p style="margin: 0; font-size: 8px; color: #666; font-style: italic;">... y ${expenses.length - 12} gastos más</p>
              </div>
            ` : ''}
          </div>
        </div>
        ` : `
        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: 600; border-bottom: 1px solid #dc2626; padding-bottom: 3px;">
            🛒 GASTOS DEL MES (0)
          </h3>
          <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 4px;">
            <p style="margin: 0; font-size: 10px; color: #666; font-style: italic;">No hay gastos registrados en este período</p>
          </div>
        </div>
        `}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 8px; color: #9ca3af;">
            Este documento fue generado automáticamente por MisFinanzas<br>
            Para más información visite: <span style="color: #16A34A;">appdemisfinanzas.com</span>
          </p>
          <p style="margin: 3px 0 0 0; font-size: 7px; color: #d1d5db;">
            Documento generado el ${generateDate} | Página 1 de 1
          </p>
        </div>

      </div>
    `;

    document.body.appendChild(element);

    try {
      // Esperar un momento para que el elemento se renderice
      await new Promise(resolve => setTimeout(resolve, 500));

      // Configurar html2canvas para mejor calidad y evitar PDF cortado
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      // Crear PDF con dimensiones exactas
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensiones manteniendo aspect ratio
      const canvasAspectRatio = canvas.height / canvas.width;
      const pdfAspectRatio = pdfHeight / pdfWidth;
      
      let imgWidth, imgHeight;
      
      if (canvasAspectRatio > pdfAspectRatio) {
        // Canvas es más alto que el PDF - ajustar por altura
        imgHeight = pdfHeight;
        imgWidth = pdfHeight / canvasAspectRatio;
      } else {
        // Canvas es más ancho que el PDF - ajustar por ancho
        imgWidth = pdfWidth;
        imgHeight = pdfWidth * canvasAspectRatio;
      }
      
      // Centrar imagen en PDF
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;

      const imgData = canvas.toDataURL('image/png', 0.8);
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      
      // Descargar con nombre descriptivo
      const fileName = `Estado-Cuenta-${monthName.replace(/\s+/g, '-')}-MisFinanzas.pdf`;
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
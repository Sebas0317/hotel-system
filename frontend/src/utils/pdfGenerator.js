import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * InvoicePDF - Generate PDF invoices for checkout
 * Uses jsPDF for client-side PDF generation
 * 
 * @param {Object} invoice - Invoice data
 * @returns {jsPDF} - PDF document
 */
export function generateInvoicePDF(invoice) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ECO BOSQUE HOTEL', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestion Hotelera', pageWidth / 2, 28, { align: 'center' });

  // Divider
  doc.setDrawColor(34, 197, 94);
  doc.line(20, 35, pageWidth - 20, 35);

  // Invoice details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA DE CHECKOUT', 20, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    { label: 'Habitacion', value: invoice.numero },
    { label: 'Huesped', value: invoice.huesped },
    { label: 'Documento', value: invoice.documento },
    { label: 'Fecha Check-in', value: invoice.checkIn ? format(new Date(invoice.checkIn), 'PP', { locale: es }) : '-' },
    { label: 'Fecha Check-out', value: invoice.checkOut ? format(new Date(invoice.checkOut), 'PP', { locale: es }) : '-' },
    { label: 'Noches', value: invoice.noches },
  ];

  let y = 65;
  details.forEach(d => {
    doc.setFont('helvetica', 'bold');
    doc.text(d.label + ':', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(d.value, 70, y);
    y += 8;
  });

  // Charges table
  y += 10;
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE CARGOS', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.text('Concepto', 20, y);
  doc.text('Valor', pageWidth - 50, y, { align: 'right' });
  y += 8;

  doc.line(20, y, pageWidth - 20, y);
  y += 5;

  // Add line items
  if (invoice.habitacion) {
    doc.text('Habitacion x ' + invoice.noches + ' noche(s)', 20, y);
    doc.text('$ ' + invoice.habitacion.toLocaleString('es-CO'), pageWidth - 50, y, { align: 'right' });
    y += 8;
  }

  if (invoice.consumos && invoice.consumos.length > 0) {
    y += 5;
    doc.text('Consumos:', 20, y);
    y += 8;

    invoice.consumos.forEach(c => {
      doc.text(c.descripcion, 25, y);
      doc.text('$ ' + c.precio.toLocaleString('es-CO'), pageWidth - 50, y, { align: 'right' });
      y += 7;
    });
  }

  // Total
  y += 10;
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL: $ ' + invoice.total.toLocaleString('es-CO'), pageWidth - 50, y, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Generado: ' + format(new Date(), 'PPpp', { locale: es }), pageWidth / 2, 280, { align: 'center' });
  doc.text('EcoBosque Hotel - Sistema de Gestion', pageWidth / 2, 285, { align: 'center' });

  return doc;
}

/**
 * Download invoice as PDF
 */
export function downloadInvoice(invoice) {
  const doc = generateInvoicePDF(invoice);
  const filename = `EcoBosque_Factura_${invoice.numero}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

export default { generateInvoicePDF, downloadInvoice };
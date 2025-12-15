/**
 * Order Summary PDF Generator
 * Generates a single-page PDF with order and customer information
 * This PDF will be printed FIRST (physically on top) of the printed stack
 */

import PDFDocument from 'pdfkit';
import { IOrder } from '../models/Order';

/**
 * Generate order summary PDF
 * Returns a Buffer containing the PDF
 */
export async function generateOrderSummaryPDF(order: IOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: order.printingOptions?.pageSize === 'A3' ? 'A3' : 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('ORDER SUMMARY', { align: 'center' });
      doc.moveDown(1);

      // Order Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('ORDER INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      doc.text(`Order ID: ${order.orderId}`, { continued: false });
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`);
      
      if (order.printJobId) {
        doc.text(`Print Job ID: ${order.printJobId.substring(0, 8)}...`);
      }
      
      doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`);
      doc.moveDown(1);

      // Customer Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('CUSTOMER INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      const customerName = order.customerInfo?.name || 'N/A';
      const customerPhone = order.customerInfo?.phone || 'N/A';
      const customerEmail = order.customerInfo?.email || 'N/A';
      
      doc.text(`Name: ${customerName}`);
      doc.text(`Phone: ${customerPhone}`);
      doc.text(`Email: ${customerEmail}`);
      
      // Delivery/Pickup Type (if available in order)
      const deliveryType = (order as any).deliveryOption?.type || 'pickup';
      doc.text(`Delivery Type: ${deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}`);
      
      if ((order as any).deliveryOption?.address) {
        doc.text(`Address: ${(order as any).deliveryOption.address}`);
      }
      doc.moveDown(1);

      // Printing Breakdown Section
      doc.fontSize(14).font('Helvetica-Bold').text('PRINTING BREAKDOWN', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      const pageCount = order.printingOptions?.pageCount || 1;
      const copies = order.printingOptions?.copies || 1;
      const totalPages = pageCount * copies;
      
      doc.text(`Total Pages: ${totalPages} (${pageCount} pages × ${copies} copies)`);
      
      // Color/BW breakdown
      if (order.printingOptions?.color === 'mixed' && order.printingOptions?.pageColors) {
        const pageColors = order.printingOptions.pageColors;
        const colorPages = Array.isArray(pageColors) 
          ? pageColors.reduce((acc, pc) => acc + (pc.colorPages?.length || 0), 0)
          : (pageColors.colorPages?.length || 0);
        const bwPages = Array.isArray(pageColors)
          ? pageColors.reduce((acc, pc) => acc + (pc.bwPages?.length || 0), 0)
          : (pageColors.bwPages?.length || 0);
        
        doc.text(`Color Pages: ${colorPages}`);
        doc.text(`Black & White Pages: ${bwPages}`);
      } else {
        doc.text(`Print Mode: ${order.printingOptions?.color === 'color' ? 'Color' : order.printingOptions?.color === 'bw' ? 'Black & White' : 'Mixed'}`);
      }
      
      doc.text(`Paper Size: ${order.printingOptions?.pageSize || 'A4'}`);
      doc.text(`Sided: ${order.printingOptions?.sided === 'double' ? 'Double-sided (Duplex)' : 'Single-sided'}`);
      doc.moveDown(1);

      // Printing Instructions Section
      doc.fontSize(14).font('Helvetica-Bold').text('PRINTING INSTRUCTIONS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      // Special notes (if any)
      if (order.printError) {
        doc.font('Helvetica-Bold').fillColor('red').text(`⚠️ Error: ${order.printError}`);
        doc.fillColor('black');
      }
      
      // Admin comments (if stored in order metadata)
      const adminComments = (order as any).adminComments || (order as any).notes;
      if (adminComments) {
        doc.text(`Admin Notes: ${adminComments}`);
      }
      
      // Print segments info (if available)
      if (order.printSegments && order.printSegments.length > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Print Segments:');
        doc.font('Helvetica');
        order.printSegments.forEach((segment, index) => {
          doc.text(`  ${index + 1}. Segment ${segment.segmentId} - ${segment.status}`);
        });
      }
      
      doc.moveDown(1);
      
      // Footer
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('gray');
      doc.text('This page was automatically generated by the Printing Server', { align: 'center' });
      doc.text(`Generated at: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.fillColor('black');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}


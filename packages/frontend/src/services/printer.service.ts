// packages/frontend/src/services/printer.service.ts
import toast from 'react-hot-toast';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  invoiceNumber: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  cashier?: string;
  qrCode?: string;
}

export class PrinterService {
  // Print receipt with preview dialog (like Ctrl+P)
  printReceiptWithPreview(data: ReceiptData) {
    if (typeof window === 'undefined') {
      toast.error('Window not available');
      return { success: false, error: 'Window not available' };
    }

    // For web - opens print dialog (Ctrl+P)
    const receiptHtml = this.generateReceiptHTML(data);
    const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
    
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return { success: false, error: 'Popup blocked' };
    }
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Automatically trigger print dialog after loading
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    
    // Also allow manual Ctrl+P
    return { success: true, window: printWindow };
  }

  // Direct print (no preview - for thermal printer)
  async printDirect(data: ReceiptData) {
    // Check if running in Electron
    if (this.isElectron()) {
      return this.printElectron(data);
    }
    // Web fallback - use preview
    return this.printReceiptWithPreview(data);
  }

  // Check if running in Electron
  private isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electron;
  }

  // Electron printing (uses system print dialog)
  private async printElectron(data: ReceiptData) {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }
      const result = await (window as any).electron.printReceipt(data);
      return result;
    } catch (error) {
      console.error('Electron print error:', error);
      throw error;
    }
  }

  // Generate HTML receipt
  private generateReceiptHTML(data: ReceiptData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            width: 80mm;
            margin: 0 auto;
            padding: 8px 5px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #333;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .header h1 {
            font-size: 16px;
            letter-spacing: 2px;
            margin: 0;
          }
          .header p {
            font-size: 10px;
            margin: 2px 0;
            color: #555;
          }
          .items {
            width: 100%;
            margin: 8px 0;
          }
          .items th {
            text-align: left;
            font-size: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
          }
          .items td {
            padding: 3px 0;
          }
          .items .qty { text-align: center; width: 30px; }
          .items .price { text-align: right; width: 60px; }
          .items .total { text-align: right; width: 70px; }
          .totals {
            border-top: 1px dashed #333;
            padding-top: 8px;
            margin-top: 8px;
          }
          .totals p {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .totals .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 4px;
            margin-top: 4px;
          }
          .qr-code {
            text-align: center;
            margin: 8px 0;
          }
          .qr-code img {
            max-width: 80px;
          }
          .footer {
            text-align: center;
            border-top: 1px dashed #333;
            padding-top: 8px;
            margin-top: 8px;
          }
          .thankyou {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
            color: #1a73e8;
          }
          @media print {
            body { margin: 0; padding: 4px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 PHARMACY PMS</h1>
          <p>Rwanda Pharmacy Management System</p>
          <p>--------------------------------</p>
          <p><strong>INVOICE #${data.invoiceNumber}</strong></p>
          <p>${new Date(data.date).toLocaleString()}</p>
          ${data.cashier ? `<p>Cashier: ${data.cashier}</p>` : ''}
          ${data.customerName ? `<p>Customer: ${data.customerName}</p>` : ''}
          ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ''}
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty">Qty</th>
              <th class="price">Price</th>
              <th class="total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">${item.price.toFixed(2)}</td>
                <td class="total">${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p><span>Subtotal:</span><span>RWF ${data.subtotal.toFixed(2)}</span></p>
          <p><span>Tax (0%):</span><span>RWF ${data.tax.toFixed(2)}</span></p>
          <p><span>Payment:</span><span>${data.paymentMethod}</span></p>
          <p class="grand-total"><span>TOTAL:</span><span>RWF ${data.total.toFixed(2)}</span></p>
        </div>

        ${data.qrCode ? `
          <div class="qr-code">
            <img src="${data.qrCode}" alt="QR Code" />
          </div>
        ` : ''}

        <div class="thankyou">🙏 Thank You! 🙏</div>

        <div class="footer">
          <p>Visit us again!</p>
          <p>--------------------------------</p>
          <p>${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align:center; padding-top:8px; font-size:9px; color:#999;">
          This is a system generated receipt
        </div>
      </body>
      </html>
    `;
  }
}

export default new PrinterService();
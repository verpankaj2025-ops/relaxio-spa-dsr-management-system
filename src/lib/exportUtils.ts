import { DSREntry } from '../types';

/**
 * Helper to get currency symbol or fallback
 */
export function getCurrencySymbol(currencyCode: string = 'INR'): string {
  if (currencyCode === 'INR' || currencyCode === 'Rupee' || currencyCode === 'rupee') return '₹';
  if (currencyCode === 'USD') return '$';
  if (currencyCode === 'EUR') return '€';
  if (currencyCode === 'GBP') return '£';
  return currencyCode ? `${currencyCode} ` : '₹';
}

/**
 * Export DSR Entries to Excel (.xlsx)
 */
export async function exportDSREntriesToExcel(
  entries: DSREntry[],
  fileName: string = 'The_Cloud_Spa_DSR_Report.xlsx',
  currency: string = 'INR'
) {
  const XLSX = await import('xlsx');
  const symbol = getCurrencySymbol(currency);
  const data = entries.map((e, index) => ({
    'S.No': index + 1,
    'Visit Date': e.visitDate,
    'Time In': e.timeIn || '10:00',
    'Customer Name': e.customerName,
    'Mobile Number': e.mobileNumber,
    'Therapy Name': e.therapyName,
    'Therapist / Staff': e.staffName,
    [`Amount (${symbol})`]: e.amount,
    'Payment Mode': e.paymentMode,
    'Remarks': e.remarks || '',
    'Created By': e.createdByName || 'Admin',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DSR Report');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export DSR Entries to PDF
 */
export async function exportDSREntriesToPDF(
  entries: DSREntry[],
  title: string = 'Daily Sales Report',
  fileName: string = 'The_Cloud_Spa_DSR_Report.pdf',
  currency: string = 'INR'
) {
  const [jspdfModule, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const jsPDFConstructor: any = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;
  const doc: any = new jsPDFConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const symbol = getCurrencySymbol(currency);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('The Cloud Spa', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total Entries: ${entries.length}`, 14, 27);

  // Table Columns
  const tableColumn = [
    'S.No',
    'Date',
    'Time In',
    'Customer Name',
    'Mobile',
    'Therapy',
    'Staff Name',
    `Amount (${symbol})`,
    'Payment Mode',
    'Remarks',
  ];

  const tableRows: any[] = [];
  let totalAmount = 0;

  entries.forEach((e, i) => {
    totalAmount += e.amount;
    tableRows.push([
      i + 1,
      e.visitDate,
      e.timeIn || '10:00',
      e.customerName,
      e.mobileNumber,
      e.therapyName,
      e.staffName,
      `${symbol}${e.amount.toLocaleString('en-IN')}`,
      e.paymentMode,
      e.remarks || '-',
    ]);
  });

  // Summary row
  tableRows.push(['', '', '', 'TOTAL', '', '', '', `${symbol}${totalAmount.toLocaleString('en-IN')}`, '', '']);

  (autoTable as any).default(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 32,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 244] },
  });

  doc.save(fileName);
}

/**
 * Print DSR Report
 */
export function printDSRReport(
  entries: DSREntry[],
  title: string = 'Daily Sales Report',
  currency: string = 'INR'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const symbol = getCurrencySymbol(currency);
  const totalRevenue = entries.reduce((acc, curr) => acc + curr.amount, 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - The Cloud Spa</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1c1917; }
          h1 { margin-bottom: 4px; color: #78350f; }
          p { margin-top: 0; color: #78716c; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #d6d3d1; padding: 8px 10px; text-align: left; }
          th { background-color: #f5f5f4; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #fef3c7; }
        </style>
      </head>
      <body>
        <h1>The Cloud Spa</h1>
        <p>${title} | Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Customer Name</th>
              <th>Mobile</th>
              <th>Therapy Name</th>
              <th>Staff Name</th>
              <th>Amount (${symbol})</th>
              <th>Payment Mode</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map(
                (e, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${e.visitDate}</td>
                <td>${e.timeIn || '10:00'}</td>
                <td>${e.customerName}</td>
                <td>${e.mobileNumber}</td>
                <td>${e.therapyName}</td>
                <td>${e.staffName}</td>
                <td>${symbol}${e.amount.toLocaleString('en-IN')}</td>
                <td>${e.paymentMode}</td>
                <td>${e.remarks || '-'}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td colspan="7" class="text-right">Total Revenue (${entries.length} Entries)</td>
              <td colspan="3">${symbol}${totalRevenue.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

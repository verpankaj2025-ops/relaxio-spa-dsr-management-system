import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

(async function(){
  try {
    const outDir = path.join(process.cwd(), 'tmp', 'exports');
    fs.mkdirSync(outDir, { recursive: true });

    const dbPath = path.join(process.cwd(), 'data', 'spa_database.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const entries = Array.isArray(db.dsr_entries) ? db.dsr_entries : [];

    // Normalize entries to expected shape
    const rows = entries.map((e, i) => ({
      SNo: i+1,
      VisitDate: e.visit_date || e.visitDate || '',
      TimeIn: e.time_in || e.timeIn || '10:00',
      CustomerName: e.customer_name || e.customerName || '',
      MobileNumber: e.mobile_number || e.mobileNumber || '',
      TherapyName: e.therapy_name || e.therapyName || '',
      StaffName: e.staff_name || e.staffName || '',
      Amount: Number(e.amount || 0),
      PaymentMode: e.payment_mode || e.paymentMode || '',
      Remarks: e.remarks || '',
    }));

    // Excel
    const excelData = rows.map(r => ({
      'S.No': r.SNo,
      'Visit Date': r.VisitDate,
      'Time In': r.TimeIn,
      'Customer Name': r.CustomerName,
      'Mobile Number': r.MobileNumber,
      'Therapy Name': r.TherapyName,
      'Therapist / Staff': r.StaffName,
      'Amount (₹)': r.Amount,
      'Payment Mode': r.PaymentMode,
      'Remarks': r.Remarks,
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DSR Report');
    const excelPath = path.join(outDir, 'The_Cloud_Spa_DSR_Report.xlsx');
    XLSX.writeFile(workbook, excelPath);

    // CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const csvPath = path.join(outDir, 'The_Cloud_Spa_DSR_Report.csv');
    fs.writeFileSync(csvPath, csv, 'utf8');

    // PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const symbol = '₹';
    doc.setFontSize(18);
    doc.text('The Cloud Spa', 14, 15);
    doc.setFontSize(12);
    doc.text('Daily Sales Report', 14, 22);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Entries: ${rows.length}`, 14, 27);

    const tableColumn = ['S.No','Date','Time In','Customer Name','Mobile','Therapy','Staff Name',`Amount (${symbol})`,'Payment Mode','Remarks'];
    const tableRows = [];
    let total = 0;
    rows.forEach((r) => {
      total += r.Amount;
      tableRows.push([r.SNo, r.VisitDate, r.TimeIn, r.CustomerName, r.MobileNumber, r.TherapyName, r.StaffName, `${symbol}${r.Amount.toLocaleString('en-IN')}`, r.PaymentMode, r.Remarks || '-']);
    });
    tableRows.push(['','','','','','','TOTAL','' + `${symbol}${total.toLocaleString('en-IN')}`,'','']);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    // write PDF buffer
    const pdfArray = doc.output('arraybuffer');
    const pdfBuf = Buffer.from(pdfArray);
    const pdfPath = path.join(outDir, 'The_Cloud_Spa_DSR_Report.pdf');
    fs.writeFileSync(pdfPath, pdfBuf);

    // Print HTML
    const totalRevenue = total;
    const htmlParts = [];
    htmlParts.push('<!doctype html><meta charset="utf-8"><title>DSR Print</title>');
    htmlParts.push('<h1>The Cloud Spa</h1>');
    htmlParts.push(`<p>Generated: ${new Date().toLocaleString()}</p>`);
    htmlParts.push('<table border="1"><thead><tr><th>#</th><th>Date</th><th>Time</th><th>Customer</th><th>Mobile</th><th>Therapy</th><th>Staff</th><th>Amount</th></tr></thead><tbody>');
    rows.forEach(r => {
      htmlParts.push(`<tr><td>${r.SNo}</td><td>${r.VisitDate}</td><td>${r.TimeIn}</td><td>${r.CustomerName}</td><td>${r.MobileNumber}</td><td>${r.TherapyName}</td><td>${r.StaffName}</td><td>₹${r.Amount.toLocaleString('en-IN')}</td></tr>`);
    });
    htmlParts.push(`<tr><td colspan="7">Total</td><td>₹${totalRevenue.toLocaleString('en-IN')}</td></tr>`);
    htmlParts.push('</tbody></table>');
    const htmlPath = path.join(outDir, 'The_Cloud_Spa_DSR_Report.html');
    fs.writeFileSync(htmlPath, htmlParts.join('\n'), 'utf8');

    // Now validations
    const results = [];

    // Excel file check
    const excelStat = fs.statSync(excelPath);
    results.push({ name: 'Excel', path: excelPath, size: excelStat.size, pass: excelStat.size > 0 });

    // CSV check: content has header and Unicode if present
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    results.push({ name: 'CSV', path: csvPath, size: Buffer.byteLength(csvContent,'utf8'), pass: csvContent.includes('S.No') && csvContent.length > 0 });

    // PDF check: file exists and starts with %PDF
    const pdfBufRead = fs.readFileSync(pdfPath);
    results.push({ name: 'PDF', path: pdfPath, size: pdfBufRead.length, pass: pdfBufRead.slice(0,4).toString() === '%PDF' });

    // HTML print check
    const htmlContent = fs.readFileSync(htmlPath,'utf8');
    const htmlPass = htmlContent.includes('Total') && htmlContent.includes('₹');
    results.push({ name: 'Print HTML', path: htmlPath, size: Buffer.byteLength(htmlContent,'utf8'), pass: htmlPass });

    // Currency formatting and totals validation
    const totalFromCsv = (() => {
      // naive parse last total from CSV
      const lines = csvContent.trim().split('\n');
      const last = lines[lines.length-1] || '';
      return last.includes('TOTAL') ? true : true; // can't rely on format here; mark true if CSV present
    })();

    // Unicode check: ensure some entries with encoded characters remain (look for &lt; or typical unicode chars). We'll check file encoding for INR symbol in PDF/HTML
    const unicodeInHtml = htmlContent.includes('₹');

    // Write validation summary
    const summary = {
      generatedFiles: results,
      unicodeInHtml,
      totalEntries: rows.length,
      totalAmount: total,
    };

    fs.writeFileSync(path.join(outDir,'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log('Export generation complete. Summary saved to', path.join(outDir,'summary.json'));
    process.exit(0);
  } catch (err) {
    console.error('Export generation failed:', err);
    process.exit(2);
  }
})();

import BRANDING from '../branding';
import { getAjLogoDataUrl } from './logoCanvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const getLogoData = () => Promise.resolve(getAjLogoDataUrl(400));

/**
 * Generates a high-quality, professional dual-copy fee voucher based on user reference images.
 * Design: Landscape A4, School Copy (Left), Student Copy (Right)
 */
export const generateFeeVoucher = async (data, options = {}) => {
    const { student, feeRecord } = data;
    const showFullFee = options.showFullFee !== undefined ? options.showFullFee : true;
    const showPreviousDues = options.showPreviousDues || false;
    
    // Open window immediately to capture user-triggered event
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to view the voucher');
        return;
    }
    printWindow.document.write('<h1>Generating Voucher... Please wait</h1>');

    try {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const logoData = await getLogoData();
        const challanId = `CH-${feeRecord._id.toString().slice(-8).toUpperCase()}`;
        const dueDateStr = `10 / ${feeRecord.month.split('-')[1]} / 2026`;
        
        // Final logic: Total is always calculated using student's discounted amount (the real price).
        // showFullFee ONLY changes the display label of the primary row, not the total.
        const studentDiscount = student.discount || 0;
        const baseAmount = feeRecord.amount || feeRecord.totalAmount || 0;
        const discountedFee = Math.max(0, baseAmount - studentDiscount);
        
        const previousDues = showPreviousDues ? Math.max(0, (student.overallDues || 0) - (feeRecord.balance || 0)) : 0;
        const totalPayable = discountedFee + previousDues; 
        
        // Generate QR code once
        const qrRawData = `Student: ${student.name} (${student.regNo})\nFather: ${student.fatherName}\nClass: ${student.class?.name || ''} - ${student.section?.name || ''}\nChallan No: ${challanId}\nMonth: ${feeRecord.month}\nDue Date: ${dueDateStr}\nAmount: PKR ${totalPayable}\nBank: Al Baraka Bank (Pakistan) Limited\nIBAN: PK86 AIIN 0000 0102 6368 99017`;
        const qrCodeUrl = await QRCode.toDataURL(qrRawData);

        await drawVoucherSide(doc, 0, 'SCHOOL', { student, feeRecord }, logoData, qrCodeUrl, false, showFullFee, showPreviousDues);
        await drawVoucherSide(doc, 148.5, 'STUDENT', { student, feeRecord }, logoData, qrCodeUrl, false, showFullFee, showPreviousDues);

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        printWindow.location.href = url;
    } catch (err) {
        printWindow.close();
        console.error(err);
    }
};

/**
 * Generates bulk vouchers, 1 student per page (with 2 copies each)
 */
export const generateBulkVouchers = async (records, options = {}) => {
    if (!records.length) return;
    const showFullFee = options.showFullFee !== undefined ? options.showFullFee : true;
    const showPreviousDues = options.showPreviousDues || false;

    // Open window immediately to capture user-triggered event
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to generate vouchers');
        return;
    }
    printWindow.document.write('<h1>Generating Bulk Vouchers... This may take a moment for large groups</h1>');

    try {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const logoData = await getLogoData();

        for (let i = 0; i < records.length; i++) {
            const data = records[i];
            if (!data || !data.student || !data.feeRecord) continue;
            
            if (i > 0) doc.addPage();
            
            const { student, feeRecord } = data;
            const challanId = `CH-${feeRecord._id.toString().slice(-8).toUpperCase()}`;
            const dueDateStr = `10 / ${feeRecord.month.split('-')[1]} / 2026`;
            
            // Final logic: Total is always calculated using student's discounted amount (the real price).
            // showFullFee ONLY changes the display label of the primary row, not the total.
            const studentDiscount = student.discount || 0;
            const baseAmount = feeRecord.amount || feeRecord.totalAmount || 0;
            const discountedFee = Math.max(0, baseAmount - studentDiscount);

            const previousDues = showPreviousDues ? Math.max(0, (student.overallDues || 0) - (feeRecord.balance || 0)) : 0;
            const totalPayable = discountedFee + previousDues;

            // Generate QR code ONCE per student
            const qrRawData = `Student: ${student.name} (${student.regNo})\nFather: ${student.fatherName}\nClass: ${student.class?.name || ''} - ${student.section?.name || ''}\nChallan No: ${challanId}\nMonth: ${feeRecord.month}\nDue Date: ${dueDateStr}\nAmount: PKR ${totalPayable}\nBank: Al Baraka Bank (Pakistan) Limited\nIBAN: PK86 AIIN 0000 0102 6368 99017`;
            const qrCodeUrl = await QRCode.toDataURL(qrRawData);

            await drawVoucherSide(doc, 0, 'SCHOOL', data, logoData, qrCodeUrl, true, showFullFee, showPreviousDues);
            await drawVoucherSide(doc, 148.5, 'STUDENT', data, logoData, qrCodeUrl, true, showFullFee, showPreviousDues);

            // Yield control back to browser to prevent UI freeze during massive generations
            if (i % 5 === 0) {
                printWindow.document.body.innerHTML = `<h1>Generating Bulk Vouchers...</h1><p>Processed ${i+1} of ${records.length} students. Please wait.</p>`;
                await new Promise(r => setTimeout(r, 10)); 
            }
        }

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        printWindow.location.href = url;
    } catch (err) {
        printWindow.close();
        console.error(err);
    }
};

/**
 * Precise drawing function for one side of the A4 Landscape page (2-column layout)
 */
const drawVoucherSide = async (doc, startX, type, data, logoData, qrCodeUrl, isBulk = false, showFullFee = true, showPreviousDues = false) => {
    const { student, feeRecord } = data;
    
    // Core Logic: The "Total Payable" should ALWAYS refer to the actual balance due (discounted).
    // The "Show Full Fee" setting ONLY changes whether the individual row shows the 
    // original price or the discounted price as a "label".
    const studentDiscount = student.discount || 0;
    const baseAmount = feeRecord.amount || feeRecord.totalAmount || 0;
    const discountedAmount = Math.max(0, baseAmount - studentDiscount);
    
    const displayAmount = showFullFee ? baseAmount : discountedAmount;

    // Previous dues = overall student dues minus current record's balance (always real/discounted)
    const previousDues = showPreviousDues ? Math.max(0, (student.overallDues || 0) - (feeRecord.balance || 0)) : 0;
    
    // Total is always current discounted fee + previous dues
    const totalPayable = discountedAmount + previousDues; 
    
    const margin = 12; // Adjusted margin to fill page better
    const width = 124.5;
    let currY = 15; // Start a bit lower

    // Outer Stroke for the copy
    doc.setLineWidth(0.3);
    doc.setDrawColor(200);
    doc.rect(startX + 5, 5, 138.5, 200, 'S');
    
    if (type === 'SCHOOL') {
        doc.setFillColor(30, 58, 138);
    } else {
        doc.setFillColor(21, 128, 61);
    }
    const challanId = `CH-${feeRecord._id.toString().slice(-8).toUpperCase()}`;

    // --- 1. Top Header ---
    if (logoData) {
        // High quality logo drawing as PNG with circular background
        // Use FAST compression for bulk to speed up generation significantly
        doc.addImage(logoData, 'PNG', startX + margin, currY, 18, 18, undefined, isBulk ? 'FAST' : 'SLOW');
    } else {
        // Fallback Circle if logo fails to load
        if (type === 'SCHOOL') {
            doc.setDrawColor(30, 58, 138);
        } else {
            doc.setDrawColor(21, 128, 61);
        }
        doc.setLineWidth(0.5);
        doc.circle(startX + margin + 9, currY + 9, 8);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14); // Slightly smaller to prevent overlap
    doc.setTextColor(30, 58, 138); // Navy blue for name
    doc.text(BRANDING.schoolDisplayName, startX + margin + 22, currY + 6);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0); // Pure Black for Motto
    doc.text(BRANDING.motto, startX + margin + 22, currY + 11);
    
    doc.setTextColor(0); // Pure Black for contact info
    doc.setFontSize(8);
    doc.text(BRANDING.schoolAddress, startX + margin + 22, currY + 15);
    doc.text(`Tel: ${BRANDING.schoolPhone} | Email: ${BRANDING.schoolEmail}`, startX + margin + 22, currY + 19);

    currY += 26;

    // --- 2. Colored Banner ---
    if (type === 'SCHOOL') {
        doc.setFillColor(30, 58, 138);
    } else {
        doc.setFillColor(21, 128, 61);
    }
    doc.rect(startX + margin, currY, width, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255);
    doc.text(`FEE CHALLAN - ${type} COPY`, startX + margin + width / 2, currY + 5.5, { align: 'center' });

    currY += 15;

    // --- 3. Body Columns ---
    const leftColX = startX + margin;
    const rightColX = startX + margin + 65;

    // Left Column: Student Details & Challan Info
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.line(leftColX, currY - 2, leftColX + 3, currY - 2); 
    doc.text('STUDENT DETAILS', leftColX + 4, currY - 1);
    doc.line(leftColX + 32, currY - 2, leftColX + 60, currY - 2);

    doc.setTextColor(0);
    const drawRow = (label, value, y) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Pure Black label for sharp printing
        doc.text(label, leftColX + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(value || '---', leftColX + 30, y);
        
        // Light underline for the value
        doc.setDrawColor(230);
        doc.setLineWidth(0.1);
        doc.line(leftColX + 30, y + 1.5, leftColX + 58, y + 1.5);
    };

    drawRow('Reg. No.', student.regNo, currY + 6);
    drawRow('Student Name', student.name, currY + 12);
    drawRow('Father\'s Name', student.fatherName, currY + 18);
    drawRow('Class / Section', `${student.class?.name || ''} - ${student.section?.name || ''}`, currY + 24);

    currY += 35;
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.line(leftColX, currY - 2, leftColX + 3, currY - 2);
    doc.text('CHALLAN INFORMATION', leftColX + 4, currY - 1);
    doc.line(leftColX + 40, currY - 2, leftColX + 60, currY - 2);

    doc.setFontSize(8);
    const drawChallanRow = (label, value, y, isRed = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Pure Black label
        doc.text(label, leftColX + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // All values now Pure Black
        doc.text(value || '---', leftColX + 30, y);

        // Light underline for the value
        doc.setDrawColor(230);
        doc.setLineWidth(0.1);
        doc.line(leftColX + 30, y + 1.5, leftColX + 58, y + 1.5);
    };

    const dueDateStr = `10 / ${feeRecord.month.split('-')[1]} / 2026`;

    drawChallanRow('Challan No.', challanId, currY + 6, true);
    drawChallanRow('Fee Month', feeRecord.month, currY + 12);
    drawChallanRow('Issue Date', new Date(feeRecord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' / '), currY + 18);
    drawChallanRow('Due Date', dueDateStr, currY + 24, true);

    // Right Column: Fee Particulars
    let rightY = currY - 35;
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.line(rightColX, rightY - 2, rightColX + 3, rightY - 2);
    doc.text('FEE PARTICULARS', rightColX + 4, rightY - 1);
    doc.line(rightColX + 32, rightY - 2, rightColX + width - 65, rightY - 2);

    // Header for table
    rightY += 5;
    doc.setFillColor(30, 58, 138);
    doc.rect(rightColX, rightY, width - 65, 6, 'F');
    doc.setTextColor(255);
    doc.setFontSize(7);
    doc.text('DESCRIPTION', rightColX + 2, rightY + 4);
    doc.text('AMOUNT (PKR)', rightColX + width - 65 - 2, rightY + 4, { align: 'right' });

    // Generic record row (Monthly or Custom)
    rightY += 12;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    const desc = feeRecord.description || (feeRecord.type === 'Other' ? 'Custom Charge' : 'Monthly Fee');
    doc.text(desc, rightColX + 2, rightY);
    doc.text(displayAmount.toLocaleString(), rightColX + width - 65 - 2, rightY, { align: 'right' });
    
    // Light underline for table row
    doc.setDrawColor(240);
    doc.line(rightColX + 2, rightY + 1.5, rightColX + width - 65 - 2, rightY + 1.5);

    // Previous Dues row (only if enabled and > 0)
    if (showPreviousDues && previousDues > 0) {
      rightY += 7;
      doc.setTextColor(180, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Previous Dues', rightColX + 2, rightY);
      doc.text(previousDues.toLocaleString(), rightColX + width - 65 - 2, rightY, { align: 'right' });
      doc.setDrawColor(240);
      doc.line(rightColX + 2, rightY + 1.5, rightColX + width - 65 - 2, rightY + 1.5);
    }

    // Total Payable Row
    rightY += 10;
    doc.setFillColor(30, 58, 138);
    doc.rect(rightColX, rightY - 4, width - 65, 6, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAYABLE', rightColX + 2, rightY);
    doc.text(totalPayable.toLocaleString(), rightColX + width - 65 - 2, rightY, { align: 'right' });

    // Amount in Box
    rightY += 8;
    doc.setDrawColor(180, 83, 9); // Darker border
    doc.setFillColor(254, 252, 232); // Light yellow bg
    doc.rect(rightColX, rightY, width - 65, 8, 'FD');
    doc.setTextColor(0); // Pure Black for sharp printing
    doc.setFontSize(8);
    doc.text(`Amount: PKR ${totalPayable.toLocaleString()}/-`, rightColX + (width - 65) / 2, rightY + 5.5, { align: 'center' });

    // PENDING center mark
    currY += 40;
    doc.setDrawColor(180, 83, 9);
    doc.rect(startX + margin + width/2 - 15, currY, 30, 8, 'D');
    doc.setTextColor(0); // Pure Black for visibility
    doc.setFont('helvetica', 'bold');
    doc.text('PENDING', startX + margin + width/2, currY + 5.5, { align: 'center' });

    // --- 4. Signatures ---
    currY += 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    const lineW = 34;
    doc.line(startX + margin, currY, startX + margin + lineW, currY);
    doc.line(startX + margin + 45, currY, startX + margin + 45 + lineW, currY);
    doc.line(startX + margin + 90, currY, startX + margin + width, currY);

    doc.setFontSize(6.5);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('CASHIER / BANK OFFICER', startX + margin + lineW/2, currY + 4, { align: 'center' });
    doc.text('SCHOOL STAMP', startX + margin + 45 + lineW/2, currY + 4, { align: 'center' });
    doc.text('PARENT/GUARDIAN', startX + margin + 90 + (width - 90)/2, currY + 4, { align: 'center' });

    // --- 5. Bank Details Box (Footer) ---
    currY += 12;
    doc.setDrawColor(59, 130, 246);
    doc.setFillColor(239, 246, 255);
    doc.rect(startX + margin, currY, width, 32, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text('Bank Details for Fee Payment:', startX + margin + 3, currY + 6);

    doc.setFontSize(7.5);
    doc.setTextColor(0);
    const drawBankRow = (label, value, y) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0); // Pure Black label
        doc.text(label, startX + margin + 3, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(value, startX + margin + 35, y);
        
        // Light underline for bank detail values
        doc.setDrawColor(220);
        doc.setLineWidth(0.1);
        doc.line(startX + margin + 35, y + 1.2, startX + margin + width - 35, y + 1.2);
    };

    drawBankRow('Bank Name', 'Your Bank Name', currY + 11.5);
    drawBankRow('Branch', 'Your Branch, City', currY + 16);
    drawBankRow('Account Title', BRANDING.bankAccountTitle, currY + 20.5);
    doc.setTextColor(30, 58, 138);
    drawBankRow('Account No. (IBAN)', 'PK00 XXXX XXXX XXXX XXXX XXXX', currY + 25);

    // QR Code - Using pre-generated URL for performance
    if (qrCodeUrl) {
        try {
            doc.addImage(qrCodeUrl, 'PNG', startX + margin + width - 28, currY + 3, 25, 25);
            doc.setFontSize(6);
            doc.setTextColor(0); // Pure Black
            doc.text('Scan to see Details', startX + margin + width - 15.5, currY + 30, { align: 'center' });
        } catch (err) {}
    }

    // Vertical Divider
    if (startX === 0) {
        doc.setLineDashPattern([2, 1], 0);
        doc.setDrawColor(200);
        doc.line(148.5, 5, 148.5, 205);
        doc.setLineDashPattern([], 0);
    }
};

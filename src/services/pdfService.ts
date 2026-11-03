import { jsPDF } from 'jspdf';
import { GarageSettings, JobRecord, MechanicTeam } from '../types';
import { JOB_CARD_SECTIONS, getFixItems } from '../components/reception/jobCardCheckpoints';

export interface GeneratedPdf {
  blob: Blob;
  filename: string;
}

interface PdfOutputOptions {
  /** Set to false to build the PDF for sharing without downloading it. */
  download?: boolean;
}

export interface RepairEstimateRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface RepairEstimateInput {
  estimateNumber: string;
  date: string;
  inspectionDate?: string;
  accidentDate?: string;
  ownerName: string;
  vehicleModel: string;
  plateNumber: string;
  insuranceCompany: string;
  rows: RepairEstimateRow[];
  includeVat: boolean;
  vatRate: number;
  notes: string;
  preparedByName: string;
  signature?: string;
  /** Scanned stamp image used on print, PDF and share. */
  stampImage?: string;
  standardPrices: Array<{ label: string; amount: number }>;
}

export class PdfService {
  private static finish(doc: jsPDF, filename: string, options?: PdfOutputOptions): GeneratedPdf {
    if (options?.download !== false) {
      doc.save(filename);
    }
    return { blob: doc.output('blob'), filename };
  }

  /**
   * Generates a customer quotation PDF
   */
  static generateQuotationPdf(job: JobRecord, settings: GarageSettings, options?: PdfOutputOptions): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryRed = [128, 0, 32]; // #800020
    const charcoal = [28, 25, 23];
    const lightGray = [240, 242, 245];

    // Header Band
    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(0, 0, 210, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.garageName.toUpperCase(), 15, 13);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL ESTIMATE & QUOTATION', 195, 13, { align: 'right' });

    // Garage Details
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFontSize(9);
    doc.text(`${settings.address}`, 15, 28);
    doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, 15, 33);
    doc.text(`Tax ID (TIN): ${settings.taxId}`, 15, 38);

    // Meta box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(130, 24, 65, 20, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Quote Ref: ${job.jobNumber}`, 135, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${job.quotationDate || new Date().toISOString().substring(0, 10)}`, 135, 35);
    doc.text(`Validity: ${job.quotationValidityDays || 14} Days`, 135, 40);

    // Divider
    doc.setDrawColor(220, 224, 230);
    doc.line(15, 46, 195, 46);

    // Customer & Vehicle Info Grid
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 15, 54);
    doc.text('VEHICLE DETAILS', 110, 54);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Full Name: ${job.customerName}`, 15, 60);
    doc.text(`Phone: ${job.customerPhone}`, 15, 65);
    doc.text(`Insurance: ${job.hasInsurance ? job.insuranceCompany || 'Yes' : 'Private / Direct'}`, 15, 70);
    if (job.claimNumber) {
      doc.text(`Claim Ref: ${job.claimNumber}`, 15, 75);
    }

    doc.text(`Vehicle: ${job.vehicleMake} ${job.vehicleModel}`, 110, 60);
    doc.text(`Plate No: ${job.plateNumber}`, 110, 65);
    doc.text(`VIN Number: ${job.vin || 'N/A'}`, 110, 70);
    doc.text(`Mileage: ${job.mileage ? `${job.mileage.toLocaleString()} km` : 'N/A'}`, 110, 75);

    // Scope of Work
    let currentY = 82;
    doc.setDrawColor(220, 224, 230);
    doc.line(15, currentY, 195, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTED PROBLEM & DIAGNOSIS', 15, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const problemLines = doc.splitTextToSize(job.customerProblem, 180);
    doc.text(problemLines, 15, currentY);
    currentY += problemLines.length * 4 + 4;

    // Table Header
    doc.setFillColor(28, 25, 23);
    doc.rect(15, currentY, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ITEM DESCRIPTION', 18, currentY + 5);
    doc.text('QTY', 115, currentY + 5, { align: 'right' });
    doc.text('UNIT PRICE', 150, currentY + 5, { align: 'right' });
    doc.text(`AMOUNT (${settings.currency})`, 190, currentY + 5, { align: 'right' });
    currentY += 8;

    // Items
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('helvetica', 'normal');

    const effectiveTotal = job.finalApprovedPrice > 0 ? job.finalApprovedPrice : job.totalEstimatedCost;
    const hasPriceItems = !!(job.priceItems && job.priceItems.length > 0);
    const isFlatTotal =
      !hasPriceItems &&
      job.laborCost === 0 &&
      (!job.spareParts || job.spareParts.length === 0) &&
      effectiveTotal > 0;

    if (isFlatTotal) {
      doc.text(`Comprehensive Repair Package: ${(job.repairDescription || job.customerProblem || 'Automotive Service').substring(0, 50)}`, 18, currentY + 4);
      doc.text('1', 115, currentY + 4, { align: 'right' });
      doc.text(effectiveTotal.toLocaleString(), 150, currentY + 4, { align: 'right' });
      doc.text(effectiveTotal.toLocaleString(), 190, currentY + 4, { align: 'right' });
      currentY += 7;
    } else {
      // Itemised repair requirements (name + Repair/Replace + price)
      if (job.priceItems && job.priceItems.length > 0) {
        job.priceItems.forEach((item) => {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          const label = item.action ? `${item.name} (${item.action})` : item.name;
          doc.text(label.substring(0, 70), 18, currentY + 4);
          doc.text('1', 115, currentY + 4, { align: 'right' });
          doc.text((item.amount || 0).toLocaleString(), 150, currentY + 4, { align: 'right' });
          doc.text((item.amount || 0).toLocaleString(), 190, currentY + 4, { align: 'right' });
          currentY += 7;
        });
      } else if (job.laborCost > 0) {
        doc.text(`Mechanical Labor: ${(job.repairDescription || 'Workshop Labor').substring(0, 50)}...`, 18, currentY + 4);
        doc.text('1', 115, currentY + 4, { align: 'right' });
        doc.text(job.laborCost.toLocaleString(), 150, currentY + 4, { align: 'right' });
        doc.text(job.laborCost.toLocaleString(), 190, currentY + 4, { align: 'right' });
        currentY += 7;
      }

      // Parts (legacy records that still store spare parts separately)
      (job.spareParts || []).forEach((part) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(`Part: ${part.name}`, 18, currentY + 4);
        doc.text(part.quantity.toString(), 115, currentY + 4, { align: 'right' });
        doc.text(part.unitPrice.toLocaleString(), 150, currentY + 4, { align: 'right' });
        doc.text(part.totalCost.toLocaleString(), 190, currentY + 4, { align: 'right' });
        currentY += 6.5;
      });

      if (job.additionalServiceCost > 0) {
        doc.text('Additional Diagnostics & Fluid Testing', 18, currentY + 4);
        doc.text('1', 115, currentY + 4, { align: 'right' });
        doc.text(job.additionalServiceCost.toLocaleString(), 150, currentY + 4, { align: 'right' });
        doc.text(job.additionalServiceCost.toLocaleString(), 190, currentY + 4, { align: 'right' });
        currentY += 7;
      }
    }

    // Totals Section
    currentY += 4;
    doc.setDrawColor(220, 224, 230);
    doc.line(110, currentY, 195, currentY);
    currentY += 5;

    const priceItemsTotal = (job.priceItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const subtotal = hasPriceItems
      ? priceItemsTotal
      : isFlatTotal
      ? effectiveTotal
      : job.laborCost + (job.sparePartsCost || 0) + (job.additionalServiceCost || 0) + (job.otherCharges || 0);
    const taxRate = job.taxRate || 0;
    const taxAmount = isFlatTotal ? 0 : ((subtotal - (job.discount || 0)) * (taxRate / 100));

    doc.setFontSize(9);
    doc.text('Subtotal:', 140, currentY, { align: 'right' });
    doc.text(`${settings.currency} ${subtotal.toLocaleString()}`, 190, currentY, { align: 'right' });
    currentY += 5;

    if (job.discount > 0) {
      doc.text('Discount:', 140, currentY, { align: 'right' });
      doc.text(`-${settings.currency} ${job.discount.toLocaleString()}`, 190, currentY, { align: 'right' });
      currentY += 5;
    }

    doc.text(`VAT / Tax (${taxRate}%):`, 140, currentY, { align: 'right' });
    doc.text(`${settings.currency} ${Math.round(taxAmount).toLocaleString()}`, 190, currentY, { align: 'right' });
    currentY += 6;

    // Grand Total box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(120, currentY - 4, 75, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Total Estimated Cost:', 145, currentY + 3, { align: 'right' });
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text(`${settings.currency} ${job.totalEstimatedCost.toLocaleString()}`, 190, currentY + 3, { align: 'right' });
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

    currentY += 20;
    // Signatures
    doc.setDrawColor(180, 185, 195);
    doc.line(20, currentY + 12, 80, currentY + 12);
    doc.line(130, currentY + 12, 190, currentY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared by: Feyamet Workshop Management', 20, currentY + 17);
    doc.text('Customer Acceptance Signature & Date', 130, currentY + 17);

    // Footer note
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'This quotation is an estimate based on visual and diagnostic inspection. Additional hidden damage identified during repair will be quoted separately.',
      105,
      285,
      { align: 'center' }
    );

    return PdfService.finish(doc, `Quotation_${job.jobNumber}_${job.plateNumber}.pdf`, options);
  }

  /**
   * Generates a workshop repair job card for mechanics
   */
  static generateRepairJobCardPdf(job: JobRecord, settings: GarageSettings, options?: PdfOutputOptions): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryRed: [number, number, number] = [128, 0, 32];
    const charcoal: [number, number, number] = [28, 25, 23];
    const lineGrey: [number, number, number] = [190, 190, 190];
    const sand: [number, number, number] = [243, 230, 213];
    const margin = 14;
    const pageW = 210;
    const contentW = pageW - margin * 2;
    const bottomLimit = 283;

    const setInk = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

    const drawTopBand = () => {
      doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.rect(0, 0, pageW, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(settings.garageName.toUpperCase(), margin, 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('OFFICIAL VEHICLE JOB CARD — Intake & Condition Record', margin, 12.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`JOB NO: ${job.jobNumber}`, pageW - margin, 10, { align: 'right' });
      if (job.id === 'demo-sample-job-card') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.text('SAMPLE - NOT A REAL RECORD', pageW - margin, 14.2, { align: 'right' });
      }
      setInk(charcoal);
    };

    drawTopBand();
    let y = 22;

    const ensureSpace = (needed: number) => {
      if (y + needed > bottomLimit) {
        doc.addPage();
        drawTopBand();
        y = 22;
      }
    };

    // ----- Vehicle & Owner details -----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('VEHICLE & OWNER DETAILS', margin, y);
    y += 3;

    const meta: Array<[string, string]> = [
      ['Owner Name', job.customerName || ''],
      ['Date', job.receivedAt ? job.receivedAt.substring(0, 10) : ''],
      ['Vehicle Model', `${job.vehicleMake} ${job.vehicleModel}`.trim()],
      ['Type', job.vehicleType || job.color || ''],
      ['Phone No', job.customerPhone || ''],
      ['VIN Number', job.vin || ''],
      ['Plate No', job.plateNumber || ''],
      ['Engine No', job.engineNo || ''],
      ['Private Paint', job.privatePaint || ''],
      ['Private Mechanic', job.privateMechanic || job.assignedMechanicName || ''],
      ['KM', job.mileage ? `${job.mileage.toLocaleString()} KM` : ''],
      ['Insurance', job.hasInsurance ? `${job.insuranceCompany || 'Yes'} (Claim: ${job.claimNumber || 'N/A'})` : 'Direct / Private'],
    ];

    const colW = contentW / 2;
    const rowH = 6;
    const metaRows = Math.ceil(meta.length / 2);
    doc.setDrawColor(lineGrey[0], lineGrey[1], lineGrey[2]);
    doc.rect(margin, y, contentW, metaRows * rowH + 2, 'S');
    setInk(charcoal);
    meta.forEach(([label, value], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = margin + 2 + col * colW;
      const ry = y + 4.5 + row * rowH;
      const labelW = 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${label}:`, x, ry);
      doc.setFont('helvetica', 'normal');
      const raw = value || '';
      const maxChars = Math.floor((colW - labelW - 6) / 1.35);
      const shown = raw.length > maxChars ? `${raw.slice(0, maxChars - 3)}...` : raw;
      doc.text(shown || '—', x + labelW, ry);
      doc.setDrawColor(210, 210, 210);
      doc.line(x + labelW - 1, ry + 0.8, x + colW - 4, ry + 0.8);
      doc.setDrawColor(lineGrey[0], lineGrey[1], lineGrey[2]);
    });
    y += metaRows * rowH + 6;

    // ----- Condition legend -----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CONDITION OF VEHICLE', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(
      'Legend:  OK = Available   D = Damaged   S = Scratch   B = Broken   C = Crack   d = Dent   b = Bend   X = Not Available',
      pageW - margin,
      y,
      { align: 'right' }
    );
    y += 3.5;

    const printSection = (title: string, items: string[]) => {
      const rows = Math.ceil(items.length / 2);
      const rowHLocal = 4.7;
      const blockH = 6 + rows * rowHLocal + 3;
      ensureSpace(blockH);
      doc.setFillColor(sand[0], sand[1], sand[2]);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setDrawColor(lineGrey[0], lineGrey[1], lineGrey[2]);
      doc.rect(margin, y, contentW, 6, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      setInk(charcoal);
      doc.text(title.toUpperCase(), margin + 2, y + 4.2);
      y += 6;
      const half = contentW / 2;
      items.forEach((item, idx) => {
        const col = Math.floor(idx / rows);
        const row = idx % rows;
        const x = margin + col * half;
        const ry = y + row * rowHLocal + 3.4;
        const code = job.conditionChecklist?.[item];
        const codeText = code ? (code === '✓' ? 'OK' : code) : '·';
        const label = item.length > 38 ? `${item.slice(0, 35)}...` : item;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.9);
        doc.text(label, x + 2, ry);
        doc.setFont('helvetica', 'bold');
        doc.text(codeText, x + half - 4, ry, { align: 'right' });
      });
      y += rows * rowHLocal + 1.5;
      doc.setDrawColor(225, 225, 225);
      doc.line(margin, y, pageW - margin, y);
      y += 3;
    };

    JOB_CARD_SECTIONS.forEach((section) => printSection(section.title, section.items));

    // ----- Items to fix (only flagged lines) -----
    const fixItems = getFixItems(job.conditionChecklist);
    ensureSpace(10 + (fixItems.length + 1) * 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setInk(charcoal);
    doc.text('ITEMS TO FIX / ATTENTION REQUIRED', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    if (fixItems.length === 0) {
      doc.text('None flagged — general inspection only.', margin + 2, y);
      y += 4.5;
    } else {
      fixItems.forEach((f) => {
        ensureSpace(5);
        doc.text(`•  ${f.item}  —  ${f.label} (${f.code})`, margin + 2, y);
        y += 4.5;
      });
    }
    y += 2;

    const printTextBox = (title: string, body: string) => {
      const lines = doc.splitTextToSize(body || '—', contentW - 6);
      const boxH = 6 + lines.length * 4 + 3;
      ensureSpace(boxH);
      doc.setDrawColor(lineGrey[0], lineGrey[1], lineGrey[2]);
      doc.setFillColor(252, 250, 248);
      doc.rect(margin, y, contentW, boxH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setInk(charcoal);
      doc.text(title, margin + 2, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.text(lines, margin + 2, y + 8.2);
      y += boxH + 2.5;
    };

    printTextBox('DESCRIPTION', job.repairDescription || job.customerProblem || '');
    printTextBox('REMARK', job.remarks || job.initialInspectionNotes || '');

    // ----- Signatures -----
    ensureSpace(52);
    const sigs = job.jobCardSignatures || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setInk(charcoal);
    doc.text('SIGNATURES', margin, y);
    y += 4.5;

    const fieldY = y + 1;
    const fieldW = contentW / 4;
    const textFields: Array<[string, string]> = [
      ['Tagash', sigs.betagash || ''],
      ['Baletafi', sigs.baletafi || ''],
      ['Mechanic', sigs.mechanic || job.assignedMechanicName || ''],
      ['Paint', sigs.paint || ''],
    ];
    textFields.forEach(([label, value], idx) => {
      const x = margin + idx * fieldW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`${label}:`, x, fieldY);
      const lw = doc.getTextWidth(`${label}:`) + 1.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const maxChars = Math.floor((fieldW - lw - 6) / 1.25);
      const shown = value.length > maxChars ? `${value.slice(0, Math.max(3, maxChars - 3))}...` : value;
      doc.text(shown || '—', x + lw, fieldY);
      doc.setDrawColor(150, 150, 150);
      doc.line(x, fieldY + 1.4, x + fieldW - 4, fieldY + 1.4);
    });
    y = fieldY + 8;
    setInk(charcoal);

    const drawSignRow = (nameLabel: string, nameValue: string, signData: string, rowY: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      setInk(charcoal);
      doc.text(`${nameLabel}:`, margin, rowY);
      doc.setFont('helvetica', 'normal');
      doc.text(nameValue || '—', margin + 26, rowY);
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, rowY + 1.2, margin + 88, rowY + 1.2);
      doc.setFont('helvetica', 'bold');
      doc.text('Signature:', margin + 92, rowY);
      doc.line(margin + 116, rowY + 1.2, pageW - margin, rowY + 1.2);
      if (signData && signData.startsWith('data:image/')) {
        try {
          doc.addImage(signData, 'PNG', margin + 118, rowY - 8, 46, 9);
          return;
        } catch {
          // fall through to text fallback
        }
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('no drawn signature', margin + 118, rowY - 0.5);
      doc.setFont('helvetica', 'normal');
    };

    ensureSpace(30);
    drawSignRow('Handed over by', sigs.handoverName || job.customerName || '', sigs.handoverSign || '', y);
    y += 14;
    drawSignRow('Received by', sigs.receivedName || job.createdBy || '', sigs.receivedSign || '', y);
    y += 12;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${new Date().toISOString().substring(0, 10)} · ${settings.garageName} · ${settings.phone}`,
      margin,
      Math.min(y, bottomLimit)
    );

    return PdfService.finish(doc, `JobCard_${job.jobNumber}.pdf`, options);
  }

  /**
   * Generates Invoice / Receipt PDF
   */
  static generateInvoicePdf(job: JobRecord, settings: GarageSettings, options?: PdfOutputOptions): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryRed = [128, 0, 32];
    const charcoal = [28, 25, 23];

    // Header
    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.garageName.toUpperCase(), 15, 13);
    doc.setFontSize(11);
    doc.text('TAX INVOICE & RECEIPT', 195, 13, { align: 'right' });

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.address}`, 15, 28);
    doc.text(`Phone: ${settings.phone} | TIN: ${settings.taxId}`, 15, 33);

    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice / Job #: ${job.jobNumber}`, 140, 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toISOString().substring(0, 10)}`, 140, 33);
    doc.text(`Payment Status: ${job.paymentStatus.toUpperCase()}`, 140, 38);

    doc.setDrawColor(220, 224, 230);
    doc.line(15, 44, 195, 44);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO:', 15, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer: ${job.customerName}`, 15, 58);
    doc.text(`Phone: ${job.customerPhone}`, 15, 63);

    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE:', 110, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`${job.vehicleMake} ${job.vehicleModel} (${job.plateNumber})`, 110, 58);
    doc.text(`VIN Number: ${job.vin || 'N/A'}`, 110, 63);

    // Table
    let y = 74;
    doc.setFillColor(28, 25, 23);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SERVICE / ITEM DESCRIPTION', 18, y + 4.8);
    doc.text(`TOTAL (${settings.currency})`, 190, y + 4.8, { align: 'right' });
    y += 8;

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('helvetica', 'normal');

    if (job.priceItems && job.priceItems.length > 0) {
      job.priceItems.forEach((item) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        const label = item.action ? `${item.name} (${item.action})` : item.name;
        doc.text(label.substring(0, 75), 18, y + 4);
        doc.text((item.amount || 0).toLocaleString(), 190, y + 4, { align: 'right' });
        y += 6.5;
      });
    } else if (job.laborCost > 0) {
      doc.text(`Workshop Labor: ${job.repairDescription.substring(0, 55)}`, 18, y + 4);
      doc.text(job.laborCost.toLocaleString(), 190, y + 4, { align: 'right' });
      y += 6.5;
    }

    (job.spareParts || []).forEach((p) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${p.name} (x${p.quantity})`, 18, y + 4);
      doc.text(p.totalCost.toLocaleString(), 190, y + 4, { align: 'right' });
      y += 6.5;
    });

    if (job.additionalServiceCost > 0) {
      doc.text('Additional Diagnostics & Quality Checks', 18, y + 4);
      doc.text(job.additionalServiceCost.toLocaleString(), 190, y + 4, { align: 'right' });
      y += 6.5;
    }

    y += 4;
    doc.line(110, y, 195, y);
    y += 5;

    const totalCost = job.actualFinalCost || job.totalEstimatedCost;
    const paid = (job.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, totalCost - paid);

    doc.setFontSize(9);
    doc.text('Total Invoice Amount:', 145, y, { align: 'right' });
    doc.text(`${settings.currency} ${totalCost.toLocaleString()}`, 190, y, { align: 'right' });
    y += 5;

    doc.text('Total Amount Paid:', 145, y, { align: 'right' });
    doc.text(`${settings.currency} ${paid.toLocaleString()}`, 190, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Remaining Balance Due:', 145, y, { align: 'right' });
    doc.setTextColor(balance > 0 ? 200 : 34, balance > 0 ? 32 : 150, balance > 0 ? 38 : 34);
    doc.text(`${settings.currency} ${balance.toLocaleString()}`, 190, y, { align: 'right' });
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

    // Payment History List
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('PAYMENT TRANSACTIONS LOG', 15, y);
    y += 5;

    if (job.payments && job.payments.length > 0) {
      job.payments.forEach((p) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`${p.date} — ${p.paymentMethod} (Ref: ${p.reference || 'N/A'}): ${settings.currency} ${p.amount.toLocaleString()}`, 15, y);
        y += 5;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('No payment recorded yet.', 15, y);
      y += 5;
    }

    // Thank you message
    y = 265;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Thank you for choosing Feyamet Auto Garage!', 105, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('All mechanical repairs carry a standard 30-day / 1,000km workshop warranty on workmanship.', 105, y + 5, { align: 'center' });

    return PdfService.finish(doc, `Invoice_${job.jobNumber}.pdf`, options);
  }

  /**
   * Generates an insurance payment voucher (payment collection form) with an
   * itemised payment list, signature lines and a stamp area for the insurer.
   */
  static generateInsurancePaymentPdf(
    job: JobRecord,
    settings: GarageSettings,
    options?: PdfOutputOptions
  ): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const brand: [number, number, number] = [128, 0, 32];
    const ink: [number, number, number] = [28, 25, 23];
    const margin = 15;
    const pageW = 210;
    const contentW = pageW - margin * 2;

    // Header band
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(settings.garageName.toUpperCase(), margin, 12.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('INSURANCE PAYMENT VOUCHER', pageW - margin, 12.5, { align: 'right' });

    // Garage details
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFontSize(8.5);
    doc.text(settings.address, margin, 27);
    doc.text(`Phone: ${settings.phone}  |  Email: ${settings.email}`, margin, 31.5);
    doc.text(`TIN: ${settings.taxId}`, margin, 36);

    // Voucher meta box
    doc.setFillColor(245, 246, 248);
    doc.roundedRect(132, 24, 63, 18, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Voucher No:', 136, 29.5);
    doc.text('Date:', 136, 34.5);
    doc.text('Claim Ref:', 136, 39.5);
    doc.setFont('helvetica', 'normal');
    doc.text(job.jobNumber, 192, 29.5, { align: 'right' });
    doc.text(new Date().toISOString().substring(0, 10), 192, 34.5, { align: 'right' });
    doc.text(job.claimNumber || '—', 192, 39.5, { align: 'right' });

    doc.setDrawColor(220, 224, 230);
    doc.line(margin, 44, pageW - margin, 44);

    // Payer & vehicle details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INSURANCE PAYER', margin, 51);
    doc.text('VEHICLE & CUSTOMER', 110, 51);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Insurance Co: ${job.hasInsurance ? job.insuranceCompany || '—' : 'Direct Customer'}`,
      margin,
      57
    );
    doc.text(`Policy / Claim No: ${job.claimNumber || '—'}`, margin, 62);
    doc.text(`Customer: ${job.customerName}`, margin, 67);
    doc.text(`Phone: ${job.customerPhone}`, margin, 72);

    doc.text(`Vehicle: ${job.vehicleMake} ${job.vehicleModel}`, 110, 57);
    doc.text(`Plate No: ${job.plateNumber}`, 110, 62);
    doc.text(`VIN: ${job.vin || '—'}`, 110, 67);
    doc.text(`Mileage: ${job.mileage ? `${job.mileage.toLocaleString()} km` : '—'}`, 110, 72);

    // Payment list
    let y = 81;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT LIST — SERVICES CHARGED TO INSURANCE', margin, y);
    y += 4;

    doc.setFillColor(ink[0], ink[1], ink[2]);
    doc.rect(margin, y, contentW, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('#', margin + 3, y + 5);
    doc.text('DESCRIPTION OF WORK', margin + 12, y + 5);
    doc.text('QTY', margin + 112, y + 5, { align: 'right' });
    doc.text('UNIT PRICE', margin + 143, y + 5, { align: 'right' });
    doc.text(`AMOUNT (${settings.currency})`, pageW - margin - 3, y + 5, { align: 'right' });
    y += 8;

    const rows: Array<{ label: string; qty: number; unit: number }> = [];
    if (job.priceItems && job.priceItems.length > 0) {
      job.priceItems.forEach((item) => {
        rows.push({
          label: item.action ? `${item.name} — ${item.action}` : item.name,
          qty: 1,
          unit: item.amount || 0,
        });
      });
    } else {
      if (job.laborCost > 0) {
        rows.push({ label: 'Workshop Labor', qty: 1, unit: job.laborCost });
      }
      (job.spareParts || []).forEach((part) => {
        rows.push({ label: `Part: ${part.name}`, qty: part.quantity, unit: part.unitPrice });
      });
      // Example body-work lines so the payment list is never empty.
      if (rows.length === 0) {
        rows.push({ label: 'Body Paint', qty: 1, unit: 2000 });
        rows.push({ label: 'Fender Body Work', qty: 1, unit: 2000 });
      }
    }

    const shownRows = rows.slice(0, 10);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    shownRows.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 248, 246);
        doc.rect(margin, y, contentW, 7, 'F');
      }
      const amount = row.qty * row.unit;
      doc.text(String(idx + 1), margin + 3, y + 4.7);
      doc.text(row.label.substring(0, 46), margin + 12, y + 4.7);
      doc.text(String(row.qty), margin + 112, y + 4.7, { align: 'right' });
      doc.text(row.unit.toLocaleString(), margin + 143, y + 4.7, { align: 'right' });
      doc.text(amount.toLocaleString(), pageW - margin - 3, y + 4.7, { align: 'right' });
      y += 7;
    });

    doc.setDrawColor(220, 224, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 3;

    if (rows.length > shownRows.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(`+ ${rows.length - shownRows.length} more item(s) — see the attached invoice.`, margin + 12, y + 4);
      y += 6;
    }

    const subtotal = rows.reduce((sum, row) => sum + row.qty * row.unit, 0);
    const taxRate = job.taxRate || 0;
    const vat = Math.round((subtotal - (job.discount || 0)) * (taxRate / 100));
    const total = Math.max(0, subtotal - (job.discount || 0) + vat);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', margin + 130, y + 4, { align: 'right' });
    doc.text(`${settings.currency} ${subtotal.toLocaleString()}`, pageW - margin - 3, y + 4, { align: 'right' });
    y += 5.5;

    if (job.discount > 0) {
      doc.text('Discount:', margin + 130, y + 4, { align: 'right' });
      doc.text(`-${settings.currency} ${job.discount.toLocaleString()}`, pageW - margin - 3, y + 4, {
        align: 'right',
      });
      y += 5.5;
    }

    doc.text(`VAT / Tax (${taxRate}%):`, margin + 130, y + 4, { align: 'right' });
    doc.text(`${settings.currency} ${vat.toLocaleString()}`, pageW - margin - 3, y + 4, { align: 'right' });
    y += 7;

    doc.setFillColor(245, 246, 248);
    doc.roundedRect(margin + 100, y, 95, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL PAYABLE:', margin + 135, y + 6.5, { align: 'right' });
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text(`${settings.currency} ${total.toLocaleString()}`, pageW - margin - 3, y + 6.5, { align: 'right' });
    doc.setTextColor(ink[0], ink[1], ink[2]);

    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DECLARATION', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const declaration = doc.splitTextToSize(
      'Received from the insurance company named above the amount stated in this voucher for the repair works listed. This voucher is valid only when it is signed and stamped by the insurance representative and the garage. The garage confirms that the listed works have been completed on the vehicle.',
      contentW
    );
    doc.text(declaration, margin, y + 5);
    y += 5 + declaration.length * 4 + 8;

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SIGNATURES', margin, y);
    y += 4;

    const sigWidth = 50;
    const sigTop = y + 10;
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, sigTop, margin + sigWidth, sigTop);
    doc.line(margin + 58, sigTop, margin + 58 + sigWidth, sigTop);
    doc.line(margin, sigTop + 18, margin + sigWidth, sigTop + 18);
    doc.line(margin + 58, sigTop + 18, margin + 58 + sigWidth, sigTop + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Insurance Representative (Sign)', margin, sigTop + 3.5);
    doc.text('Garage Authorized Signature', margin + 58, sigTop + 3.5);
    doc.text('Customer / Driver', margin, sigTop + 21.5);
    doc.text('Date', margin + 58, sigTop + 21.5);

    // Stamp area with a sample circular stamp
    const stampX = margin + 122;
    const stampY = y - 6;
    const stampW = 58;
    const stampH = 38;
    doc.setDrawColor(180, 185, 195);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(stampX, stampY, stampW, stampH, 2, 2);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('OFFICIAL STAMP / SEAL', stampX + stampW / 2, stampY + 4.5, { align: 'center' });

    const cx = stampX + stampW / 2;
    const cy = stampY + 21;
    doc.setDrawColor(brand[0], brand[1], brand[2]);
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.setLineWidth(0.5);
    doc.circle(cx, cy, 11);
    doc.circle(cx, cy, 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.2);
    doc.text('FEYAMET AUTO GARAGE', cx, cy - 4, { align: 'center' });
    doc.setFontSize(6);
    doc.text('PAID', cx, cy + 1.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.6);
    doc.text('ADDIS ABABA', cx, cy + 5, { align: 'center' });
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(4.6);
    doc.text('Sample stamp', cx, stampY + stampH - 2, { align: 'center' });

    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `Generated ${new Date().toISOString().substring(0, 10)} · ${settings.garageName} · ${settings.phone}`,
      pageW / 2,
      290,
      { align: 'center' }
    );

    return PdfService.finish(doc, `Insurance_Payment_${job.jobNumber}.pdf`, options);
  }

  /**
   * Generates the official repair & insurance cost estimate sheet that a
   * driver can print and hand to an insurance company or another garage.
   */
  static generateRepairEstimatePdf(
    estimate: RepairEstimateInput,
    settings: GarageSettings,
    options?: PdfOutputOptions
  ): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const brand: [number, number, number] = [128, 0, 32];
    const ink: [number, number, number] = [28, 25, 23];
    const margin = 15;
    const pageW = 210;
    const bottom = 280;
    const contentW = pageW - margin * 2;
    const money = (value: number) => value.toLocaleString();

    const drawHeader = () => {
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.rect(0, 0, pageW, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(settings.garageName.toUpperCase(), margin, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.text('OFFICIAL VEHICLE REPAIR & INSURANCE COST ESTIMATE', margin, 15.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(estimate.estimateNumber, pageW - margin, 10, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.text(`Date: ${estimate.date}`, pageW - margin, 15.5, { align: 'right' });
      doc.setTextColor(ink[0], ink[1], ink[2]);
    };

    drawHeader();

    // Garage head office details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Head Office:', margin, 26);
    doc.text(settings.address, margin + 21, 26);
    doc.text(`Phone: ${settings.phone}`, margin, 30.5);
    doc.text(`Email: ${settings.email}`, margin + 92, 30.5);
    doc.text(`TIN No: ${settings.taxId}`, margin, 35);

    // Client & vehicle block
    let y = 41;
    doc.setFillColor(245, 246, 248);
    doc.rect(margin, y, contentW, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.text('CLIENT & VEHICLE INFORMATION', margin + 3, y + 4.5);
    y += 6.5;

    const leftX = margin + 3;
    const rightX = margin + 96;
    const fields: Array<[string, string, number]> = [
      ['Owner / Driver Name', estimate.ownerName, leftX],
      ['Insurance Company', estimate.insuranceCompany, rightX],
      ['Vehicle Model', estimate.vehicleModel, leftX],
      ['License Plate No', estimate.plateNumber, rightX],
      ['Date of Accident', estimate.accidentDate || '—', leftX],
      ['Inspection Date', estimate.inspectionDate || estimate.date, rightX],
    ];
    fields.forEach(([label, value, x], idx) => {
      const rowY = y + 6 + Math.floor(idx / 2) * 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`${label}:`, x, rowY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(value || '—', x + 38, rowY);
      doc.setDrawColor(214, 216, 220);
      doc.line(x + 37, rowY + 1, x + 87, rowY + 1);
    });
    y += 28;

    // Cost breakdown table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('COST BREAKDOWN — PARTS & LABOR', margin, y);
    y += 3.5;
    doc.setFillColor(ink[0], ink[1], ink[2]);
    doc.rect(margin, y, contentW, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.8);
    doc.text('NO.', margin + 3, y + 5);
    doc.text('DESCRIPTION OF PARTS & LABOR WORK', margin + 14, y + 5);
    doc.text('QTY', margin + 116, y + 5, { align: 'right' });
    doc.text('UNIT PRICE', margin + 145, y + 5, { align: 'right' });
    doc.text(`TOTAL (${settings.currency})`, pageW - margin - 3, y + 5, { align: 'right' });
    y += 8;

    const drawContinuation = () => {
      doc.addPage();
      drawHeader();
      doc.setFillColor(ink[0], ink[1], ink[2]);
      doc.rect(margin, 28, contentW, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.8);
      doc.text('NO.', margin + 3, 33);
      doc.text('DESCRIPTION OF PARTS & LABOR WORK', margin + 14, 33);
      doc.text('QTY', margin + 116, 33, { align: 'right' });
      doc.text('UNIT PRICE', margin + 145, 33, { align: 'right' });
      doc.text(`TOTAL (${settings.currency})`, pageW - margin - 3, 33, { align: 'right' });
      doc.setTextColor(ink[0], ink[1], ink[2]);
      y = 37;
    };

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const rows = estimate.rows.filter((row) => row.description.trim() !== '' || row.unitPrice > 0);
    if (rows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.text('No cost lines added yet.', margin + 14, y + 4.7);
      y += 7;
    }
    rows.forEach((row, idx) => {
      if (y + 7 > 222) drawContinuation();
      if (idx % 2 === 0) {
        doc.setFillColor(250, 248, 246);
        doc.rect(margin, y, contentW, 7, 'F');
      }
      const total = row.quantity * row.unitPrice;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.text(String(idx + 1), margin + 3, y + 4.7);
      doc.text(row.description.substring(0, 58) || '—', margin + 14, y + 4.7);
      doc.text(String(row.quantity), margin + 116, y + 4.7, { align: 'right' });
      doc.text(money(row.unitPrice), margin + 145, y + 4.7, { align: 'right' });
      doc.text(money(total), pageW - margin - 3, y + 4.7, { align: 'right' });
      y += 7;
    });

    doc.setDrawColor(214, 216, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    const subtotal = rows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0);
    const vat = estimate.includeVat ? Math.round(subtotal * (estimate.vatRate / 100)) : 0;
    const grandTotal = subtotal + vat;

    // Fixed standard prices for comparison
    if (estimate.standardPrices.length > 0) {
      if (y + 22 > bottom) {
        doc.addPage();
        drawHeader();
        y = 28;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.text('FIXED WORKSHOP PRICE LIST (standard items)', margin, y + 3);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const half = Math.ceil(estimate.standardPrices.length / 2);
      estimate.standardPrices.forEach((item, idx) => {
        const col = idx < half ? 0 : 1;
        const row = idx < half ? idx : idx - half;
        const x = margin + col * (contentW / 2);
        doc.text(item.label, x, y + row * 4.4);
        doc.text(`${settings.currency} ${money(item.amount)}`, x + contentW / 2 - 6, y + row * 4.4, {
          align: 'right',
        });
      });
      y += half * 4.4 + 6;
    }

    // Totals
    if (y + 40 > bottom) {
      doc.addPage();
      drawHeader();
      y = 30;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.text('Subtotal:', margin + 130, y, { align: 'right' });
    doc.text(`${settings.currency} ${money(subtotal)}`, pageW - margin - 3, y, { align: 'right' });
    y += 5.5;
    doc.text(
      `VAT / Tax (${estimate.includeVat ? estimate.vatRate : 0}%):`,
      margin + 130,
      y,
      { align: 'right' }
    );
    doc.text(`${settings.currency} ${money(vat)}`, pageW - margin - 3, y, { align: 'right' });
    y += 7;

    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.roundedRect(margin + 100, y - 4, contentW - 100, 11, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    doc.text('GRAND TOTAL:', margin + 145, y + 3.2, { align: 'right' });
    doc.text(`${settings.currency} ${money(grandTotal)}`, pageW - margin - 4, y + 3.2, {
      align: 'right',
    });
    doc.setTextColor(ink[0], ink[1], ink[2]);
    y += 16;

    // Notes / declaration
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.text('TERMS & DECLARATION', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    const notes =
      estimate.notes.trim() ||
      'This estimate is prepared from a physical inspection of the vehicle. Prices cover the parts and labor listed above only. Hidden damage found after dismantling will be estimated separately. The estimate is valid for 14 days from the inspection date.';
    const noteLines = doc.splitTextToSize(notes, contentW);
    doc.text(noteLines, margin, y + 4.5);
    y += 4.5 + noteLines.length * 3.6 + 8;

    // Signature & stamp
    if (y + 46 > bottom) {
      doc.addPage();
      drawHeader();
      y = 30;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.text('AUTHORIZATION', margin, y);
    y += 4;

    const sigLineY = y + 14;
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, sigLineY, margin + 78, sigLineY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Garage Representative Signature', margin, sigLineY + 3.6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(estimate.preparedByName || 'Authorized Staff', margin, sigLineY + 8.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Name & position', margin, sigLineY + 12);

    if (estimate.signature && estimate.signature.startsWith('data:image/')) {
      try {
        doc.addImage(estimate.signature, 'PNG', margin + 2, sigLineY - 12, 54, 11);
      } catch {
        // keep the printed line if the image cannot be embedded
      }
    }

    // Official stamp: the garage's scanned stamp image, in blue by default.
    const stampInk: [number, number, number] = [30, 64, 175];
    const stampX = margin + 118;
    const stampY = y - 2;
    const stampW = 62;
    const stampH = 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(120, 120, 120);
    doc.text('OFFICIAL STAMP / SEAL', stampX + stampW / 2, stampY + 3.6, { align: 'center' });
    doc.setTextColor(ink[0], ink[1], ink[2]);

    const drawVectorStamp = () => {
      doc.setDrawColor(180, 185, 195);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(stampX, stampY + 5, stampW, stampH - 5, 2, 2);
      doc.setLineDashPattern([], 0);
      const cx = stampX + stampW / 2;
      const cy = stampY + 22;
      doc.setDrawColor(stampInk[0], stampInk[1], stampInk[2]);
      doc.setTextColor(stampInk[0], stampInk[1], stampInk[2]);
      doc.setLineWidth(0.6);
      doc.circle(cx, cy, 11);
      doc.circle(cx, cy, 9.4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.2);
      doc.text('FEYAMET AUTO GARAGE', cx, cy - 4, { align: 'center' });
      doc.setFontSize(6);
      doc.text('ESTIMATE', cx, cy + 1.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.6);
      doc.text('ADDIS ABABA', cx, cy + 5, { align: 'center' });
      doc.setLineWidth(0.2);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(4.6);
      doc.text('Sample stamp', cx, stampY + stampH - 2.4, { align: 'center' });
      doc.setTextColor(ink[0], ink[1], ink[2]);
    };

    let stampDrawn = false;
    if (estimate.stampImage && estimate.stampImage.startsWith('data:image/')) {
      const format = estimate.stampImage.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      try {
        const props = doc.getImageProperties(estimate.stampImage);
        const maxW = 48;
        const maxH = 27;
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        const imageW = props.width * ratio;
        const imageH = props.height * ratio;
        doc.addImage(
          estimate.stampImage,
          format,
          stampX + (stampW - imageW) / 2,
          stampY + 6,
          imageW,
          imageH
        );
        stampDrawn = true;
      } catch {
        stampDrawn = false;
      }
    }
    if (!stampDrawn) drawVectorStamp();

    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(
      `${settings.garageName} · ${settings.phone} · ${settings.email} · ${settings.address}`,
      pageW / 2,
      289,
      { align: 'center' }
    );

    return PdfService.finish(doc, `Repair_Estimate_${estimate.estimateNumber}.pdf`, options);
  }

  /**
   * Generates Daily Jobs Summary or Financial Summary
   */
  static generateDailySummaryPdf(jobs: JobRecord[], settings: GarageSettings, options?: PdfOutputOptions): GeneratedPdf {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const primaryRed = [128, 0, 32];

    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${settings.garageName.toUpperCase()} — DAILY OPERATIONS SUMMARY REPORT`, 15, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toISOString().substring(0, 16)}`, 282, 12, { align: 'right' });

    // Table Header
    let y = 28;
    doc.setFillColor(28, 25, 23);
    doc.rect(15, y, 267, 7, 'F');
    doc.setFontSize(8.5);
    doc.text('JOB #', 18, y + 4.8);
    doc.text('PLATE', 48, y + 4.8);
    doc.text('VEHICLE MODEL', 78, y + 4.8);
    doc.text('CUSTOMER', 130, y + 4.8);
    doc.text('STATUS', 178, y + 4.8);
    doc.text('TEAM', 218, y + 4.8);
    doc.text(`AMOUNT (${settings.currency})`, 280, y + 4.8, { align: 'right' });
    y += 8;

    doc.setTextColor(28, 25, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    jobs.forEach((job) => {
      doc.text(job.jobNumber, 18, y + 4);
      doc.text(job.plateNumber, 48, y + 4);
      doc.text(`${job.vehicleMake} ${job.vehicleModel}`.substring(0, 25), 78, y + 4);
      doc.text(job.customerName.substring(0, 22), 130, y + 4);
      doc.text(job.status, 178, y + 4);
      doc.text(job.assignedTeamName ? job.assignedTeamName.substring(0, 18) : 'Unassigned', 218, y + 4);
      doc.text(job.totalEstimatedCost.toLocaleString(), 280, y + 4, { align: 'right' });
      y += 6.5;
    });

    return PdfService.finish(
      doc,
      `Feyamet_Daily_Summary_${new Date().toISOString().substring(0, 10)}.pdf`,
      options
    );
  }
}

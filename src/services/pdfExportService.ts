import jsPDF from 'jspdf';
import { TransactionRecord, AppSettings } from '../types/merchant';
import { SUPPORTED_FIAT } from '../config/constants';
import { formatCryptoAmount } from './blockchainService';

/**
 * Generates and downloads an official, professional Vector PDF Transaction Statement
 */
export function exportTransactionsToPdf(
  transactions: TransactionRecord[],
  settings: AppSettings,
  fileName?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const fiatConfig = SUPPORTED_FIAT[settings.fiatCurrency] || SUPPORTED_FIAT.USD;

  // Calculate Aggregates
  const totalTransactions = transactions.length;
  const paidTransactions = transactions.filter((t) => t.status === 'paid');
  const totalVolumeFiat = paidTransactions.reduce((acc, t) => acc + (t.amountFiat || 0), 0);

  // Asset breakdown
  const assetTotals: Record<string, { count: number; cryptoSum: number; fiatSum: number }> = {};
  paidTransactions.forEach((t) => {
    if (!assetTotals[t.cryptoAsset]) {
      assetTotals[t.cryptoAsset] = { count: 0, cryptoSum: 0, fiatSum: 0 };
    }
    assetTotals[t.cryptoAsset].count += 1;
    assetTotals[t.cryptoAsset].cryptoSum += t.amountCrypto || 0;
    assetTotals[t.cryptoAsset].fiatSum += t.amountFiat || 0;
  });

  let currentPage = 1;
  let y = 14;

  const renderHeader = (pageNumber: number) => {
    // Top banner
    doc.setFillColor(15, 17, 26);
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Accent strip
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 32, pageWidth, 2, 'F');

    // Brand & Document Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('MERCHANT X', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('OFFICIAL CRYPTO TRANSACTION & SETTLEMENT STATEMENT', margin, 20);
    doc.setTextColor(148, 163, 184);
    doc.text(`${settings.merchantName} • ${settings.merchantLocation}`, margin, 26);

    // Right-side statement meta
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`STATEMENT DATE: ${dateStr}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`RECORDS: ${totalTransactions} TRANSACTIONS`, pageWidth - margin, 20, { align: 'right' });
    doc.text(`PAGE: ${pageNumber}`, pageWidth - margin, 26, { align: 'right' });

    y = 42;
  };

  const renderFooter = (pageNumber: number) => {
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Merchant X Terminal • Non-Custodial Multi-Chain Settlement • All records finalized on public blockchain ledgers.',
      margin,
      pageHeight - 9
    );
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  };

  // 1. Initial Header
  renderHeader(currentPage);

  // 2. Executive Summary Metric Cards (Page 1)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'FD');

  // Total Volume Card
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SETTLED VOLUME', margin + 6, y + 7);
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${fiatConfig.symbol}${totalVolumeFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    margin + 6,
    y + 17
  );

  // Settled Count
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SETTLED ORDERS', margin + 68, y + 7);
  doc.setFontSize(15);
  doc.setTextColor(16, 185, 129);
  doc.text(`${paidTransactions.length} / ${totalTransactions}`, margin + 68, y + 17);

  // Asset Breakdown Summary text
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SETTLEMENT ASSETS', margin + 124, y + 7);
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const assetSummary = Object.keys(assetTotals).length > 0
    ? Object.keys(assetTotals).join(', ')
    : 'None yet';
  doc.text(assetSummary, margin + 124, y + 16);

  y += 30;

  // 3. Transactions Table Header
  const colX = {
    date: margin + 2,
    ref: margin + 34,
    fiat: margin + 74,
    crypto: margin + 104,
    asset: margin + 138,
    status: margin + 164,
  };

  const renderTableHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE / TIME', colX.date, y + 5.5);
    doc.text('REFERENCE / ID', colX.ref, y + 5.5);
    doc.text('FIAT AMOUNT', colX.fiat, y + 5.5);
    doc.text('CRYPTO SETTLED', colX.crypto, y + 5.5);
    doc.text('NETWORK', colX.asset, y + 5.5);
    doc.text('STATUS', colX.status, y + 5.5);
    y += 10;
  };

  renderTableHeader();

  // 4. Render Table Rows
  if (transactions.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No transactions recorded for this period.', margin + 4, y + 8);
    y += 16;
  } else {
    transactions.forEach((t, index) => {
      // Check page overflow
      if (y > pageHeight - 24) {
        renderFooter(currentPage);
        doc.addPage();
        currentPage += 1;
        renderHeader(currentPage);
        renderTableHeader();
      }

      // Alternating row fill
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 2, contentWidth, 9, 'F');
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      // Date / Time
      doc.text(`${t.formattedDate || ''} ${t.formattedTime || ''}`, colX.date, y + 3.5);

      // Reference
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(t.reference || t.id.slice(0, 10), colX.ref, y + 3.5);

      // Fiat Amount
      const curr = SUPPORTED_FIAT[t.fiatCurrency]?.symbol || '$';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${curr}${t.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX.fiat, y + 3.5);

      // Crypto Settled
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 83, 9);
      doc.text(`${formatCryptoAmount(t.amountCrypto, t.cryptoAsset)} ${t.cryptoAsset}`, colX.crypto, y + 3.5);

      // Network
      doc.setTextColor(71, 85, 105);
      doc.text(t.network || 'Polygon', colX.asset, y + 3.5);

      // Status
      if (t.status === 'paid') {
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('PAID ✓', colX.status, y + 3.5);
      } else if (t.status === 'pending') {
        doc.setTextColor(217, 119, 6);
        doc.setFont('helvetica', 'bold');
        doc.text('PENDING', colX.status, y + 3.5);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.text('FAILED', colX.status, y + 3.5);
      }

      // Divider line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

      y += 8.5;
    });
  }

  // Final Footer
  renderFooter(currentPage);

  // Save File
  const saveName = fileName || `MerchantX_Transactions_Statement_${Date.now()}.pdf`;
  doc.save(saveName);
}

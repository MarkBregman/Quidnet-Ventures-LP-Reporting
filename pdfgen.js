'use strict';
/**
 * Quidnet LP Update — PDF Generator (pdfkit)
 * Exports: generateLPPdf(data) → Promise<Buffer>
 */
const PDFDocument = require('pdfkit');

// ── Brand ──────────────────────────────────────────────────────────────────────
const DEEP_BLUE  = '#282561';
const TEAL       = '#23BDC3';
const TEAL_LIGHT = '#D4F4F5';
const AMBER      = '#BA7517';
const AMBER_LIGHT= '#FEF3CD';
const RED        = '#C0392B';
const GRAY       = '#666666';
const MID_GRAY   = '#999999';
const LIGHT_GRAY = '#F5F5F5';
const WHITE      = '#FFFFFF';
const DARK       = '#1A1A1A';
const GREEN      = '#27AE60';

const MARGIN     = 42;
const PAGE_W     = 595.28;   // A4
const PAGE_H     = 841.89;
const CONTENT_W  = PAGE_W - 2 * MARGIN;

// QV Logo as base64 JPEG (embedded)
const LOGO_B64 = process.env.QV_LOGO_B64 || null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  return [r,g,b];
}

function setFill(doc, hex)   { doc.fillColor(hex); }
function setStroke(doc, hex) { doc.strokeColor(hex); }

function drawRect(doc, x, y, w, h, color, radius=0) {
  setFill(doc, color);
  if (radius) doc.roundedRect(x, y, w, h, radius).fill();
  else        doc.rect(x, y, w, h).fill();
}

function drawRule(doc, y, color=TEAL, thickness=1.5) {
  doc.save()
    .moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
    .lineWidth(thickness).strokeColor(color).stroke()
    .restore();
}

function textBlock(doc, text, x, y, opts={}) {
  if (!text) return;
  doc.font(opts.font||'Helvetica')
     .fontSize(opts.size||10)
     .fillColor(opts.color||DARK)
     .text(text, x, y, {
       width:  opts.width  || CONTENT_W,
       align:  opts.align  || 'left',
       lineGap:opts.lineGap|| 3,
     });
}

// ── Page header / footer stamper ───────────────────────────────────────────────
function stampHeaderFooter(doc, fundName, quarter, dateRange, issueDate, logoBuffer) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);

    // ── Header ─────────────────────────────────────────────────────────────
    const hTop = PAGE_H - 48;

    // Logo
    if (logoBuffer) {
      try { doc.image(logoBuffer, MARGIN, hTop - 4, { width: 36, height: 28.5 }); }
      catch(e) {}
    }

    // Vertical teal rule
    doc.save().rect(MARGIN + 42, hTop - 2, 1.5, 28).fillColor(TEAL).fill().restore();

    // Title block
    const tx = MARGIN + 49;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DEEP_BLUE)
       .text(`${fundName}  —  LP Quarterly Update`, tx, hTop + 2, { width: CONTENT_W - 50 });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
       .text(`${quarter}  |  ${dateRange}  |  Issued ${issueDate}`, tx, hTop + 17, { width: CONTENT_W - 50 });

    // Header bottom rule
    drawRule(doc, hTop - 6, DEEP_BLUE, 1.5);

    // ── Footer ─────────────────────────────────────────────────────────────
    drawRule(doc, 36, TEAL, 1);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(RED)
       .text(`STRICTLY CONFIDENTIAL  —  Prepared for limited partners of Quidnet Ventures ${fundName} only`,
             MARGIN, 22, { width: CONTENT_W, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(MID_GRAY)
       .text(`Page ${i + 1}  |  Not for distribution  |  Internal use only`,
             MARGIN, 12, { width: CONTENT_W, align: 'center' });
  }
}

// ── Section heading ────────────────────────────────────────────────────────────
function sectionHeading(doc, title, tag, y) {
  // Tag pill
  if (tag) {
    const pillW = 56;
    drawRect(doc, MARGIN, y, pillW, 14, DEEP_BLUE, 2);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(WHITE)
       .text(tag.toUpperCase(), MARGIN + 4, y + 3, { width: pillW - 8, lineBreak: false });
    y += 18;
  }
  doc.font('Helvetica-Bold').fontSize(13).fillColor(DEEP_BLUE)
     .text(title, MARGIN, y, { width: CONTENT_W });
  y += 19;
  drawRule(doc, y, TEAL, 1.5);
  return y + 8;
}

// ── Body paragraphs ────────────────────────────────────────────────────────────
function bodyParas(doc, paras, startY) {
  let y = startY;
  (paras || []).forEach(p => {
    if (!p || !p.trim()) return;
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text(p.trim(), MARGIN, y, { width: CONTENT_W, align: 'justify', lineGap: 3 });
    y = doc.y + 8;
  });
  return y;
}

// ── Amber callout ──────────────────────────────────────────────────────────────
function amberCallout(doc, text, startY) {
  if (!text || !text.trim()) return startY;
  const padV = 8, padH = 12, labelH = 12;
  const textOpts = { width: CONTENT_W - padH * 2 - 4, align: 'left', lineGap: 3 };

  // Measure height
  const bodyH = doc.heightOfString(text.trim(), { ...textOpts, font: 'Helvetica', fontSize: 9.5 });
  const boxH  = labelH + bodyH + padV * 2 + 4;

  // Box
  doc.save()
     .rect(MARGIN, startY, CONTENT_W, boxH)
     .fillAndStroke(AMBER_LIGHT, AMBER);
  // Left bar
  doc.rect(MARGIN, startY, 3, boxH).fillColor(AMBER).fill();
  doc.restore();

  // Label
  doc.font('Helvetica-Bold').fontSize(8).fillColor(AMBER)
     .text('⬥  PARTNER NOTE', MARGIN + padH, startY + padV, { width: CONTENT_W - padH * 2 });

  // Body text
  doc.font('Helvetica').fontSize(9.5).fillColor('#7A4500')
     .text(text.trim(), MARGIN + padH, startY + padV + labelH + 2, textOpts);

  return startY + boxH + 10;
}

// ── Company name bar ───────────────────────────────────────────────────────────
function companyBar(doc, name, tagLine, bgColor, startY) {
  const barH = 24;
  drawRect(doc, MARGIN, startY, CONTENT_W, barH, bgColor || DEEP_BLUE);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
     .text(name, MARGIN + 10, startY + 6, { width: CONTENT_W * 0.6, lineBreak: false });
  if (tagLine) {
    doc.font('Helvetica').fontSize(8.5).fillColor(TEAL_LIGHT)
       .text(tagLine, MARGIN + CONTENT_W * 0.6, startY + 8,
             { width: CONTENT_W * 0.37, align: 'right', lineBreak: false });
  }
  return startY + barH + 6;
}

// ── Portfolio company card ─────────────────────────────────────────────────────
function portcoCard(doc, c, partnerNote, startY) {
  const healthColors = {
    'Strong': GREEN, 'Monitor': AMBER, 'Attention': RED, 'Concerns': RED
  };
  const bgColor = healthColors[c.companyHealth] || DEEP_BLUE;
  const name    = c.company || c.name || '(unnamed)';

  // Metrics tag line
  const metrics = [];
  if (c.arr)    metrics.push(`ARR: ${c.arr}`);
  if (c.runway) {
    const r = parseInt(c.runway);
    metrics.push(`Runway: ${c.runway} mo${(!isNaN(r) && r <= 3) ? ' ⚠' : ''}`);
  }
  if (c.headcount) metrics.push(`Team: ${c.headcount}`);
  const tagLine = metrics.join('  |  ');

  let y = companyBar(doc, name + (c.companyHealth ? `  [${c.companyHealth}]` : ''), tagLine, bgColor, startY);

  if (c.quarterSummary) {
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text(c.quarterSummary.trim(), MARGIN, y, { width: CONTENT_W, align: 'justify', lineGap: 3 });
    y = doc.y + 6;
  }

  y = bodyParas(doc, c.paragraphs, y);
  y = amberCallout(doc, partnerNote, y);
  return y + 4;
}

// ── Pipeline / ecosystem card ──────────────────────────────────────────────────
function genericCard(doc, item, startY) {
  const name = item.name || item.company || '(unnamed)';
  const tag  = item.tag  || item.stage   || '';
  let y = companyBar(doc, name, tag, DEEP_BLUE, startY);
  y = bodyParas(doc, item.paragraphs, y);
  return y + 4;
}

// ── Page break guard ───────────────────────────────────────────────────────────
function ensureSpace(doc, needed, topMargin=70) {
  if (doc.y + needed > PAGE_H - topMargin) {
    doc.addPage();
    doc.y = topMargin;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────
function generateLPPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const fundName  = data.fund      || 'Fund I';
      const quarter   = data.quarter   || '';
      const dateRange = data.dateRange || '';
      const issueDate = data.issueDate || new Date().toLocaleDateString('en-NZ', {day:'numeric',month:'long',year:'numeric'});
      const partnerNotes = data.partnerNotes || {};

      // Parse logo
      let logoBuffer = null;
      if (LOGO_B64) {
        try { logoBuffer = Buffer.from(LOGO_B64, 'base64'); } catch(e) {}
      }

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 70, bottom: 52, left: MARGIN, right: MARGIN },
        bufferPages: true,
        info: {
          Title:   `${fundName} — LP Quarterly Update ${quarter}`,
          Author:  'Quidnet Ventures',
          Subject: 'LP Update',
        }
      });

      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Cover block ────────────────────────────────────────────────────────
      let y = 78;

      // Logo on cover
      if (logoBuffer) {
        try { doc.image(logoBuffer, MARGIN, y, { width: 52, height: 41 }); } catch(e) {}
        y += 52;
      }

      doc.font('Helvetica-Bold').fontSize(26).fillColor(DEEP_BLUE)
         .text(fundName, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 2;
      doc.font('Helvetica').fontSize(16).fillColor(GRAY)
         .text('LP Quarterly Update', MARGIN, y, { width: CONTENT_W });
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(11).fillColor(MID_GRAY)
         .text(`${quarter}  ·  ${dateRange}`, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 10;

      drawRule(doc, y, DEEP_BLUE, 2.5);
      y += 14;

      // Confidentiality box
      const confText = `STRICTLY CONFIDENTIAL — This document is prepared for limited partners of Quidnet Ventures ${fundName} only. `
                     + `It contains non-public information about portfolio companies and must not be shared, forwarded, or distributed outside the partnership.`;
      const confH = doc.heightOfString(confText, { width: CONTENT_W - 28, fontSize: 9, lineGap: 3 }) + 20;
      doc.save().rect(MARGIN, y, CONTENT_W, confH).fillAndStroke('#FDF0F0', RED);
      doc.rect(MARGIN, y, 3, confH).fillColor(RED).fill().restore();
      doc.font('Helvetica').fontSize(9).fillColor('#7A0000')
         .text(confText, MARGIN + 14, y + 10, { width: CONTENT_W - 28, lineGap: 3 });
      y += confH + 20;

      // ── Opening ────────────────────────────────────────────────────────────
      const opening = data.openingParagraphs || [];
      if (opening.length) {
        ensureSpace(doc, 60);
        y = sectionHeading(doc, 'Opening letter', 'Fund Update', doc.y > 78 ? doc.y : y);
        y = bodyParas(doc, opening, doc.y);
        y = doc.y + 8;
      }

      // ── Fundraising ────────────────────────────────────────────────────────
      const fundraising = data.fundraisingParagraphs || [];
      if (fundraising.length) {
        ensureSpace(doc, 60);
        y = sectionHeading(doc, `${fundName} — Fundraising status`, 'Fundraising', doc.y);
        y = bodyParas(doc, fundraising, doc.y);
        y = doc.y + 8;
      }

      // ── Pipeline ───────────────────────────────────────────────────────────
      const pipeline = (data.pipeline || []).filter(p => p.name);
      if (pipeline.length) {
        doc.addPage(); doc.y = 78;
        y = sectionHeading(doc, 'Pipeline companies', 'Pipeline', doc.y);
        pipeline.forEach(p => {
          ensureSpace(doc, 60);
          doc.y = genericCard(doc, p, doc.y);
        });
      }

      // ── Portfolio ──────────────────────────────────────────────────────────
      const portcos = data.portcos || [];
      if (portcos.length) {
        doc.addPage(); doc.y = 78;
        y = sectionHeading(doc, `${fundName} portfolio — company updates`, 'Portfolio', doc.y);
        portcos.forEach(c => {
          ensureSpace(doc, 80);
          const name = c.company || c.name || '';
          const note = partnerNotes[name] || c.partnerNote || '';
          doc.y = portcoCard(doc, c, note, doc.y);
        });
      }

      // ── Ecosystem ──────────────────────────────────────────────────────────
      const ecoIntro = data.ecosystemIntro || '';
      const ecoItems = (data.ecosystemItems || []).filter(e => e.company);
      if (ecoIntro || ecoItems.length) {
        ensureSpace(doc, 80);
        y = sectionHeading(doc, 'Ecosystem highlights', 'Ecosystem', doc.y);
        if (ecoIntro) {
          doc.font('Helvetica').fontSize(10).fillColor(DARK)
             .text(ecoIntro.trim(), MARGIN, doc.y, { width: CONTENT_W, align: 'justify', lineGap: 3 });
          doc.y += 8;
        }
        ecoItems.forEach(e => {
          ensureSpace(doc, 60);
          doc.y = genericCard(doc, { name: e.company, tag: e.tag || '', paragraphs: e.paragraphs }, doc.y);
        });
      }

      // ── Market context ─────────────────────────────────────────────────────
      const context = data.marketContext || [];
      if (context.length) {
        ensureSpace(doc, 60);
        y = sectionHeading(doc, 'Market context', 'Context', doc.y);
        bodyParas(doc, context, doc.y);
        doc.y += 8;
      }

      // ── Looking ahead ──────────────────────────────────────────────────────
      const ahead = (data.lookingAhead || []).filter(a => a.heading);
      if (ahead.length) {
        ensureSpace(doc, 60);
        sectionHeading(doc, 'Looking ahead', 'Outlook', doc.y);
        ahead.forEach(a => {
          ensureSpace(doc, 40);
          doc.font('Helvetica-Bold').fontSize(11).fillColor(TEAL)
             .text(a.heading, MARGIN, doc.y, { width: CONTENT_W });
          doc.y += 2;
          if (a.body) {
            doc.font('Helvetica').fontSize(10).fillColor(DARK)
               .text(a.body.trim(), MARGIN, doc.y, { width: CONTENT_W, align: 'justify', lineGap: 3 });
          }
          doc.y += 8;
        });
      }

      // ── Stamp headers/footers on all pages ─────────────────────────────────
      stampHeaderFooter(doc, fundName, quarter, dateRange, issueDate, logoBuffer);

      doc.end();
    } catch(e) {
      reject(e);
    }
  });
}

module.exports = { generateLPPdf };

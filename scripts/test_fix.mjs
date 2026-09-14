import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 38, bottom: 38, left: 48, right: 48 },
});

const chunks = [];
doc.on('data', (c) => chunks.push(c));
doc.on('end', () => fs.writeFileSync('test_col_fix.pdf', Buffer.concat(chunks)));

const leftMargin = doc.page.margins.left;
const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;
const rightWidth = 140;
const leftWidth = contentWidth - rightWidth;

// Education entry
const startY = doc.y;
doc.font('Helvetica-Bold').fontSize(10.5).text('B.Tech in Computer Science', leftMargin, startY, { width: leftWidth });
const leftEnd = doc.y;
doc.font('Helvetica').fontSize(9).text('2018', leftMargin + leftWidth, startY, { width: rightWidth, align: 'right' });
const rightEnd = doc.y;

const nextY = Math.max(leftEnd, rightEnd) + 6;
doc.text('', leftMargin, nextY, { width: contentWidth });
doc.y = nextY;

// Section header
doc.font('Helvetica-Bold').fontSize(11).text('PROJECTS & KEY INITIATIVES', leftMargin, doc.y, { width: contentWidth });
const ruleY = doc.y + 2;
doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + contentWidth, ruleY).stroke();
doc.text('', leftMargin, ruleY + 5, { width: contentWidth });
doc.y = ruleY + 5;

doc.font('Helvetica-Bold').fontSize(10.5).text('NEXIS Platform', leftMargin, doc.y, { width: contentWidth });

doc.end();

/**
 * Extract PDF form field names from progress report PDFs
 * Run with: node scripts/extract-pdf-fields.js
 */

const fs = require('fs');
const path = require('path');

// Note: This script requires pdf-lib to be installed
// If running in Node.js context, you'll need to install it first:
// npm install pdf-lib

async function extractPDFFields(pdfPath) {
  try {
    const { PDFDocument } = require('pdf-lib');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`PDF: ${path.basename(pdfPath)}`);
    console.log(`Total Fields: ${fields.length}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const fieldInfo = [];
    
    fields.forEach((field, index) => {
      const name = field.getName();
      let type = field.constructor.name;
      
      // Detect ambiguous types
      if (type === 'e') {
        if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
          type = 'PDFCheckBox';
        } else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
          type = 'PDFTextField';
        }
      }
      
      fieldInfo.push({ index: index + 1, name, type });
      console.log(`${index + 1}. [${type}] ${name}`);
    });
    
    return fieldInfo;
  } catch (error) {
    console.error(`Error processing ${pdfPath}:`, error.message);
    return [];
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public', 'assets', 'ReportCards');
  
  const pdfFiles = [
    'kg-cl-initial-Observations.pdf',
    '1-6-edu-elementary-progress-report-card-public-schools.pdf',
    '7-8-edu-elementary-progress-report-card-public-schools.pdf'
  ];
  
  const allFields = {};
  
  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(publicDir, pdfFile);
    if (fs.existsSync(pdfPath)) {
      const fields = await extractPDFFields(pdfPath);
      allFields[pdfFile] = fields;
    } else {
      console.error(`PDF not found: ${pdfPath}`);
    }
  }
  
  // Save to JSON file for reference
  const outputPath = path.join(__dirname, 'pdf-fields-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(allFields, null, 2));
  console.log(`\n\nField mapping saved to: ${outputPath}`);
  
  // Generate a field mapping template
  console.log('\n' + '='.repeat(80));
  console.log('SUGGESTED FIELD MAPPINGS (add to generateFieldNameVariations):');
  console.log('='.repeat(80) + '\n');
  
  Object.keys(allFields).forEach(pdfFile => {
    console.log(`\n// Fields from ${pdfFile}:`);
    allFields[pdfFile].forEach(field => {
      const camelCase = field.name;
      const variations = `['${field.name}']`;
      console.log(`${camelCase}: ${variations},`);
    });
  });
}

main().catch(console.error);

/**
 * Generate field mapping JSON files for all report card PDFs
 * Run with: node scripts/generate-field-jsons.js
 * 
 * This script extracts form fields from PDFs and generates JSON files
 * that match the format used in src/views/ReportCard/Fields/
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

/**
 * Extract PDF form fields and convert to our JSON format
 */
async function extractFieldsToJSON(pdfPath) {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const fieldMapping = {};
    
    fields.forEach((field, index) => {
      const name = field.getName();
      let type = field.constructor.name;
      
      // Detect ambiguous types
      if (type === 'e') {
        if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
          type = 'PDFCheckBox2';
        } else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
          type = 'PDFTextField2';
        }
      }
      
      // Convert to lowercase for formDataKey (our convention)
      const formDataKey = name.toLowerCase();
      
      fieldMapping[name] = {
        type: type,
        formDataKey: formDataKey,
        id: index,
        name: name
      };
    });
    
    return fieldMapping;
  } catch (error) {
    console.error(`❌ Error processing ${pdfPath}:`, error.message);
    throw error;
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public', 'assets', 'ReportCards');
  const outputDir = path.join(__dirname, '..', 'src', 'views', 'ReportCard', 'Fields');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Map of PDF files to their output JSON files
  const pdfMappings = [
    {
      pdf: 'kg-cl-initial-Observations.pdf',
      json: 'kindergarten-initial.json',
      name: 'Kindergarten Initial Observations'
    },
    {
      pdf: 'edu-Kindergarten-Communication-of-Learning-public-schools.pdf',
      json: 'kindergarten-report.json',
      name: 'Kindergarten Report Card'
    },
    {
      pdf: '1-6-edu-elementary-progress-report-card-public-schools.pdf',
      json: '1-6-elementary-progress.json',
      name: 'Grades 1-6 Progress Report'
    },
    {
      pdf: '1-6-edu-elementary-provincial-report-card-public-schools.pdf',
      json: '1-6-elementary-report.json',
      name: 'Grades 1-6 Report Card'
    },
    {
      pdf: '7-8-edu-elementary-progress-report-card-public-schools.pdf',
      json: '7-8-elementary-progress.json',
      name: 'Grades 7-8 Progress Report'
    },
    {
      pdf: '7-8-edu-elementary-provincial-report-card-public-schools.pdf',
      json: '7-8-elementary-report.json',
      name: 'Grades 7-8 Report Card'
    }
  ];
  
  console.log('🔍 Extracting PDF form fields...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const mapping of pdfMappings) {
    const pdfPath = path.join(publicDir, mapping.pdf);
    const jsonPath = path.join(outputDir, mapping.json);
    
    if (!fs.existsSync(pdfPath)) {
      console.error(`⚠️  PDF not found: ${mapping.pdf}`);
      failCount++;
      continue;
    }
    
    try {
      console.log(`📄 Processing: ${mapping.name}`);
      console.log(`   PDF: ${mapping.pdf}`);
      
      const fieldMapping = await extractFieldsToJSON(pdfPath);
      const fieldCount = Object.keys(fieldMapping).length;
      
      // Check if date field exists
      const hasDate = fieldMapping['date'] || fieldMapping['Date'] || fieldMapping['DATE'];
      const hasData = fieldMapping['data']; // 7-8 progress typo
      
      console.log(`   ✅ Extracted ${fieldCount} fields`);
      if (hasDate) {
        console.log(`   ✅ Contains 'date' field`);
      } else if (hasData) {
        console.log(`   ⚠️  Contains 'data' field (typo for date)`);
      } else {
        console.log(`   ⚠️  NO date field found`);
      }
      
      // Write JSON file
      fs.writeFileSync(jsonPath, JSON.stringify(fieldMapping, null, 2));
      console.log(`   💾 Saved: ${mapping.json}\n`);
      
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to process ${mapping.name}:`, error.message);
      console.log('');
      failCount++;
    }
  }
  
  console.log('='.repeat(80));
  console.log(`✅ Successfully processed: ${successCount} PDFs`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} PDFs`);
  }
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



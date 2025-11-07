/**
 * Script to extract form fields from PDF files and generate JSON mapping files
 * Usage: node scripts/extract-pdf-fields.js <pdf-path> <output-json-path>
 * Example: node scripts/extract-pdf-fields.js public/assets/ReportCards/1-6-edu-elementary-progress-report-card-public-schools.pdf src/views/ReportCard/Fields/1-6-elementary-progress.json
 */

const fs = require('fs');
const path = require('path');

async function extractPDFFields(pdfPath, outputPath) {
  try {
    // Import pdf-lib using dynamic import (works for both CommonJS and ESM)
    const { PDFDocument } = await import('pdf-lib');
    
    console.log(`📄 Reading PDF from: ${pdfPath}`);
    
    // Read the PDF file
    const pdfBytes = fs.readFileSync(pdfPath);
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`✅ Found ${fields.length} form fields in PDF`);
    
      // Extract field information
      const fieldMapping = {};
      let idCounter = 0;
      
      // Sort fields by name for consistent output
      const sortedFields = [...fields].sort((a, b) => {
        const nameA = a.getName().toLowerCase();
        const nameB = b.getName().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      sortedFields.forEach((field) => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        
        // Generate formDataKey (lowercase, preserve structure)
        // Keep underscores and convert camelCase properly
        let formDataKey = fieldName
          .replace(/([a-z])([A-Z])/g, '$1$2') // Preserve camelCase boundaries
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, ''); // Remove special characters but keep underscores
        
        // Create field entry matching the existing JSON structure
        fieldMapping[fieldName] = {
          type: fieldType,
          formDataKey: formDataKey,
          id: idCounter++,
          name: fieldName
        };
        
        console.log(`  ${idCounter}. ${fieldName} (${fieldType}) -> ${formDataKey}`);
      });
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }
    
    // Write the JSON file with proper formatting
    const jsonContent = JSON.stringify(fieldMapping, null, 4);
    fs.writeFileSync(outputPath, jsonContent, 'utf8');
    
    console.log(`\n✅ Successfully generated field mapping:`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Total fields: ${fields.length}`);
    
    // Print summary by field type
    const fieldsByType = {};
    Object.values(fieldMapping).forEach(field => {
      const type = field.type;
      if (!fieldsByType[type]) fieldsByType[type] = 0;
      fieldsByType[type]++;
    });
    
    console.log(`\n📊 Fields by type:`);
    Object.entries(fieldsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    // Check for "sans" fields
    const sansFields = Object.keys(fieldMapping).filter(name => 
      name.toLowerCase().includes('sans')
    );
    
    if (sansFields.length > 0) {
      console.log(`\n🔍 Found ${sansFields.length} field(s) containing "sans":`);
      sansFields.forEach(name => {
        console.log(`   - ${name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error extracting PDF fields:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/extract-pdf-fields.js <pdf-path> <output-json-path>');
  console.error('\nExample:');
  console.error('  node scripts/extract-pdf-fields.js public/assets/ReportCards/1-6-edu-elementary-progress-report-card-public-schools.pdf src/views/ReportCard/Fields/1-6-elementary-progress.json');
  process.exit(1);
}

const pdfPath = args[0];
const outputPath = args[1];

// Resolve paths relative to project root
const projectRoot = path.resolve(__dirname, '..');
const resolvedPdfPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(projectRoot, pdfPath);
const resolvedOutputPath = path.isAbsolute(outputPath) ? outputPath : path.join(projectRoot, outputPath);

if (!fs.existsSync(resolvedPdfPath)) {
  console.error(`❌ PDF file not found: ${resolvedPdfPath}`);
  process.exit(1);
}

extractPDFFields(resolvedPdfPath, resolvedOutputPath);


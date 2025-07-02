// uploadCourses.js - parses SectionsReport.csv and uploads course docs to Firestore
// Usage: node uploadCourses.js [--file path/to/csv] [--dry-run]

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const admin = require('firebase-admin');
const cheerio = require('cheerio');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// CONFIG -------------------------------------------------------------
const DEFAULT_CSV = path.join(__dirname, 'SectionsReport.csv');
const COLLECTION_NAME = 'courses';
const COURSE_ID_PREFIX = 'TC';
const COURSE_ID_PAD = 6; // e.g. TC000123
//---------------------------------------------------------------------

// Helper to initialise Firebase Admin
function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  // 1️⃣ Prefer service account key if available --------------------------------
  const serviceAccountPath = path.join(__dirname, 'serviceAccountkey.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
      console.log('🔥 Firebase Admin initialised (service account)');
      return admin.firestore();
    } catch (e) {
      console.warn('⚠️  Failed to init with service account key, will try ADC. Error:', e.message);
    }
  }

  // 2️⃣ Fallback to Application Default Credentials ---------------------------
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('🔥 Firebase Admin initialised (ADC)');
  } catch (e) {
    console.error('❌ Firebase initialisation failed with both methods.');
    console.error('   Provide a valid serviceAccountkey.json or set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  return admin.firestore();
}

// Helper to fetch the next numeric part for courseId
async function getNextCourseNumber(db) {
  const snapshot = await db.collection(COLLECTION_NAME).get();
  let maxNum = -1;
  snapshot.forEach((doc) => {
    const id = doc.id || doc.data().courseId;
    if (typeof id === 'string' && id.startsWith(COURSE_ID_PREFIX)) {
      const n = parseInt(id.slice(COURSE_ID_PREFIX.length), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return maxNum + 1; // start from 0 if none
}

// Parse an HTML ordered-list string into an array of text values
function parseHtmlList(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('li').each((_, el) => {
    items.push($(el).text().trim());
  });
  return items;
}

// Derive subject from section string e.g. "Grade1-2653-Sep2024-Quran" -> "Quran"
function extractSubject(section) {
  if (!section) return '';
  const parts = section.split('-');
  return parts[parts.length - 1];
}

// Derive term and academicYear from section maybe containing "Sep2024" etc.
function extractTermAndYear(section) {
  const term = 'Term 1'; // default
  let academicYear = '';
  const match = section.match(/(\d{4})/g);
  if (match && match.length) {
    const year = parseInt(match[0], 10);
    academicYear = `${year}-${year + 1}`;
  }
  return { term, academicYear };
}

async function main() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');
  const csvFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : DEFAULT_CSV;
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    process.exit(1);
  }

  const db = initFirebase();
  const nextNumber = await getNextCourseNumber(db);
  let currentNumber = nextNumber;
  const courses = [];

  console.log(`📄 Parsing CSV: ${csvFile}`);

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        const section = row['Section'];
        if (!section) return;

        const subject = extractSubject(section);
        const gradeLevel = row['Class']?.trim();
        const { term } = extractTermAndYear(section);
        const academicYear = '2024-2025';

        const students = parseHtmlList(row['Students']).map((name) => ({ name, id: '' }));
        const facultyNames = parseHtmlList(row['Faculty']);

        const teachers = facultyNames.map((name) => ({ name: name, schoolId: '' }));

        const courseId = `${COURSE_ID_PREFIX}${String(currentNumber).padStart(COURSE_ID_PAD, '0')}`;
        currentNumber++;

        // Attempt to extract numeric grade and section values if present
        const gradeNumber = parseInt(gradeLevel?.match(/\d+/)?.[0] || '0', 10);
        const sectionNumber = parseInt(section.match(/-(\d+)-/)?.[1] || '0', 10);

        const courseDoc = {
          // Primary identifiers
          courseId,            // internal incremental ID (e.g. TC000001)
          courseID: section.match(/^\d+/)?.[0] || '', // original SIS/section id string if available

          // Human-readable
          title: `${subject} ${gradeLevel}`,
          name: `${subject} ${gradeLevel}`,

          // Meta
          gradeLevel,
          grade: gradeNumber,
          section: sectionNumber,
          term,
          academicYear,
          subject,
          description: '',

          // Staff & students
          teacherIds: [],            // to be filled with Firebase UID(s)
          teachers: teachers.map((t) => t.name),
          teacher: teachers,         // original array of objects (back-compat)
          students,                  // array of {name,id}
          enrolledList: [],          // list of student UIDs (placeholder)

          // Budget tracking
          budget: {
            totalBudget: 0,
            accumulatedCost: 0,
            itemList: [],
          },

          // Scheduling (blank placeholders)
          schedule: {
            days: [],
            startTime: '',
            endTime: '',
            location: '',
          },

          // Resources placeholder
          resources: [],

          // Timestamps
          timestamps: {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        };

        courses.push(courseDoc);
      })
      .on('end', () => {
        console.log(`✅ Parsed ${courses.length} courses from CSV.`);
        resolve();
      })
      .on('error', (err) => reject(err));
  });

  if (dryRun) {
    console.log('📝 Dry run enabled – showing first 3 course objects:');
    console.log(JSON.stringify(courses.slice(0, 3), null, 2));
    process.exit(0);
  }

  console.log(`⏫ Uploading ${courses.length} courses to Firestore collection "${COLLECTION_NAME}" ...`);
  for (const course of courses) {
    try {
      await db.collection(COLLECTION_NAME).doc(course.courseId).set(course);
      console.log(`   • Uploaded ${course.courseId} (${course.name})`);
    } catch (e) {
      console.error(`❌ Failed to upload ${course.courseId}:`, e.message);
    }
  }

  console.log('🎉 All done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}); 
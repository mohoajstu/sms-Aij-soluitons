// OpenAI API calls are now handled via Firebase Functions proxy
// This keeps the API key secure on the server side

export function buildReportType({ grade, term, explicitReportType }) {
  // If UI passes an explicit report type, prefer it
  if (explicitReportType) return explicitReportType;

  const g = String(grade || "").toUpperCase();
  const t = String(term || "");
  
  if (g === "JK" || g === "SK" || g === "KINDERGARTEN") {
    return "Kindergarten Communication of Learning";
  }
  if (t === "1") return "Term 1 Report Card";
  if (t === "2") return "Final (Term 2) Report Card";
  return "Progress Report";
}

// Builds the payload for AI generation from your existing formData
export function buildReportPayload(formData, { explicitReportType, subjectField }) {
  const reportType = buildReportType({
    grade: formData.grade,
    term: formData.term,
    explicitReportType,
  });

  const base = {
    studentName: formData.student_name || formData.student || "",
    gradeLevel: formData.grade || "",
    reportType,
    subject: subjectField ? formData[subjectField] : formData.subject || "",
    gradePercentage: formData.grade_percent || formData.gradePercentage || "",
  };

  if (reportType.includes("Kindergarten")) {
    return {
      ...base,
      keyLearning: formData.keyLearning || formData.key_learning || "",
      growthInLearning: formData.growthInLearning || formData.growth_in_learning || "",
      nextSteps: formData.nextStepsInLearning || formData.next_steps || "",
    };
  } else {
    return {
      ...base,
      strengths: formData.strengths_next_steps || "",
      improvements: formData.improvements || "",
    };
  }
}

// Generate report card comments using OpenAI via Firebase Functions proxy
export async function generateReportCardJSON(payload, { retry = 1 } = {}) {
  // Use Firebase Functions proxy instead of direct OpenAI API
  const functionsBase = `https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net`

  const isKindergarten = payload.reportType?.includes("Kindergarten");
  
  // Create the system prompt based on report type
  const systemPrompt = isKindergarten 
    ? createKindergartenSystemPrompt()
    : createRegularSystemPrompt();

  // Create the user prompt with student data
  const userPrompt = createUserPrompt(payload);

  const callAI = async () => {
    try {
      console.log('🔄 Calling OpenAI via Firebase Functions proxy...');
      
      const response = await fetch(`${functionsBase}/generateReportCard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase Functions proxy error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(`Firebase Functions proxy error: ${result.message}`);
      }

      const content = result.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const json = JSON.parse(content);
      if (!json?.comments) {
        throw new Error("Invalid JSON structure returned from AI");
      }

      console.log('✅ OpenAI API call successful via Firebase Functions proxy');
      return json;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  };

  try {
    return await callAI();
  } catch (err) {
    if (retry > 0) {
      console.log('Retrying AI generation...');
      return await callAI();
    }
    throw err;
  }
}

// Map AI JSON back into your existing form fields (non-destructive)
export function mapJsonToFormFields(aiJson, handleChange) {
  if (!aiJson?.comments) return;

  // Teacher Comments: combine subjectComments (+ kindergarten blocks if present)
  let teacherComments = "";
  
  if (aiJson.comments.subjectComments?.length) {
    teacherComments += aiJson.comments.subjectComments
      .map(s => `${s.subject ? `${s.subject}: ` : ""}${s.comment}`)
      .join("\n\n");
  }

  if (aiJson.comments.kindergartenSpecific) {
    const k = aiJson.comments.kindergartenSpecific;
    const kBlocks = [
      k.KeyLearning && `Key Learning: ${k.KeyLearning}`,
      k.GrowthInLearning && `Growth in Learning: ${k.GrowthInLearning}`,
    ].filter(Boolean);
    
    if (kBlocks.length > 0) {
      teacherComments = [teacherComments, kBlocks.join("\n\n")].filter(Boolean).join("\n\n");
    }
  }

  const nextSteps =
    aiJson.comments.progressIndicators?.nextSteps ||
    aiJson.comments.kindergartenSpecific?.NextStepsInLearning ||
    "";

  // Update form fields
  if (teacherComments.trim()) {
    handleChange("teacher_comments", teacherComments.trim());
  }
  
  if (nextSteps.trim()) {
    handleChange("strengths_next_steps", nextSteps.trim());
  }
}

// System prompt for regular grades (1-8)
function createRegularSystemPrompt() {
  return `You are an expert educational assessment assistant. Generate professional, constructive report card comments in valid JSON format.

REQUIRED JSON STRUCTURE:
{
  "comments": {
    "subjectComments": [
      {
        "subject": "Subject Name",
        "comment": "Detailed subject-specific comment"
      }
    ],
    "progressIndicators": {
      "nextSteps": "Clear, actionable next steps for improvement"
    }
  }
}

GUIDELINES:
- Use positive, professional language appropriate for parents
- Be specific and constructive
- Include both strengths and areas for growth
- Keep comments concise but meaningful (2-3 sentences per subject)
- Make next steps actionable and realistic
- Avoid negative language, use growth-focused terms instead

Return ONLY valid JSON, no additional text.`;
}

// System prompt for kindergarten
function createKindergartenSystemPrompt() {
  return `You are an expert early childhood education assessment assistant. Generate age-appropriate kindergarten report comments in valid JSON format.

REQUIRED JSON STRUCTURE:
{
  "comments": {
    "kindergartenSpecific": {
      "KeyLearning": "Key learning achievements and developments",
      "GrowthInLearning": "Observable growth in learning behaviors", 
      "NextStepsInLearning": "Gentle, age-appropriate next steps"
    }
  }
}

GUIDELINES:
- Use developmentally appropriate language for kindergarten age
- Focus on learning behaviors, social development, and foundational skills
- Emphasize effort, participation, and growth mindset
- Keep language positive and encouraging
- Mention specific examples when possible
- Make next steps gentle and achievable for young learners

Return ONLY valid JSON, no additional text.`;
}

// Create user prompt with student data
function createUserPrompt(payload) {
  const {
    studentName,
    gradeLevel,
    reportType,
    subject,
    gradePercentage,
    teacherPrompt,
    // Kindergarten fields
    keyLearning,
    growthInLearning,
    nextSteps,
    // Regular grade fields
    strengths,
    improvements
  } = payload;

  let prompt = `Generate report card comments for:

Student: ${studentName}
Grade: ${gradeLevel}
Report Type: ${reportType}`;

  if (subject) {
    prompt += `\nSubject(s): ${subject}`;
  }

  if (gradePercentage) {
    prompt += `\nGrade/Percentage: ${gradePercentage}`;
  }

  // Add existing content as context
  if (reportType.includes("Kindergarten")) {
    if (keyLearning) prompt += `\nExisting Key Learning: ${keyLearning}`;
    if (growthInLearning) prompt += `\nExisting Growth in Learning: ${growthInLearning}`;
    if (nextSteps) prompt += `\nExisting Next Steps: ${nextSteps}`;
  } else {
    if (strengths) prompt += `\nExisting Strengths/Next Steps: ${strengths}`;
    if (improvements) prompt += `\nExisting Improvements: ${improvements}`;
  }

  // Add teacher's specific instructions
  if (teacherPrompt?.trim()) {
    prompt += `\n\nTeacher Instructions: ${teacherPrompt}`;
  }

  prompt += `\n\nPlease generate professional, constructive comments that build upon any existing content while following the required JSON structure.`;

  return prompt;
} 
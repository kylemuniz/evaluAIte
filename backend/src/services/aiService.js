const OpenAI = require('openai');

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function computeLetterGrade(grade) {
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A-';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B-';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C-';
  if (grade >= 67) return 'D+';
  if (grade >= 60) return 'D';
  return 'F';
}

/**
 * Grade a single essay using OpenAI or a mock fallback.
 *
 * @param {object} params
 * @param {object} params.essay         - Essay row from DB
 * @param {Array}  params.rubric        - Array of rubric_categories rows
 * @param {string} params.guidance      - Teacher guidance text
 * @param {Array}  params.examples      - Up to 3 manually graded essays as examples
 * @returns {Promise<GradeResult>}
 */
async function gradeEssaysWithAI({ essay, rubric, guidance, examples }) {
  const client = getOpenAIClient();
  if (!client) {
    return mockGrade(essay, rubric);
  }

  const prompt = buildPrompt({ essay, rubric, guidance, examples });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert educational grader. You provide precise, fair, and constructive essay feedback. ' +
            'Always respond with valid JSON only—no markdown fences, no extra text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const raw = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    const grade = Math.min(100, Math.max(0, Number(parsed.grade)));
    return {
      grade,
      letter_grade: computeLetterGrade(grade),
      feedback_likes: parsed.feedback_likes || '',
      feedback_improvements: parsed.feedback_improvements || '',
      rubric_scores: parsed.rubric_scores || {},
      confidence_score: parsed.confidence_score != null ? Number(parsed.confidence_score) : null,
      ai_reasoning: parsed.ai_reasoning || '',
    };
  } catch (err) {
    console.error('[aiService] OpenAI call failed, falling back to mock:', err.message);
    return mockGrade(essay, rubric);
  }
}

function buildPrompt({ essay, rubric, guidance, examples }) {
  const rubricLines = rubric.map(
    (r, i) => `  ${i + 1}. ${r.name} (max ${r.max_points} pts): ${r.description || ''}`
  ).join('\n');

  const exampleLines = examples.map((ex, i) => {
    const scores = ex.rubric_scores
      ? rubric.map(r => `${r.name}: ${ex.rubric_scores[r.id] ?? '?'}/${r.max_points}`).join(', ')
      : 'N/A';
    return `--- Example ${i + 1}: ${ex.student_name} (Grade: ${ex.grade}, ${ex.letter_grade}) ---
Rubric scores: ${scores}
What worked well: ${ex.feedback_likes || 'N/A'}
Areas to improve: ${ex.feedback_improvements || 'N/A'}
Essay excerpt (first 600 chars):
${(ex.essay_text || '').slice(0, 600)}`;
  }).join('\n\n');

  const rubricIdList = rubric.map(r => `"${r.id}": <number 0-${r.max_points}>`).join(', ');

  return `You are grading the following student essay for the assignment.

## Rubric Categories
${rubricLines}

## Teacher Guidance
${guidance || 'No additional guidance provided.'}

## Grading Examples (from teacher's manual grades)
${exampleLines || 'No examples available yet.'}

## Essay to Grade
Student: ${essay.student_name}
${essay.essay_text}

## Instructions
Grade this essay according to the rubric and teacher guidance. Use the examples to calibrate your grading.
Respond ONLY with a JSON object in this exact shape:
{
  "grade": <total 0-100>,
  "rubric_scores": { ${rubricIdList} },
  "feedback_likes": "<2-4 sentences on what the student did well>",
  "feedback_improvements": "<2-4 sentences on specific areas to improve>",
  "ai_reasoning": "<1-2 sentences explaining your overall assessment>",
  "confidence_score": <0.0-1.0>
}`;
}

/**
 * Mock grader – returns a plausible but randomised grade for use without an API key.
 */
function mockGrade(essay, rubric) {
  const wordCount = (essay.essay_text || '').split(/\s+/).filter(Boolean).length;

  // Base score influenced by essay length (proxy for effort)
  let baseScore = 60;
  if (wordCount > 400) baseScore = 72;
  if (wordCount > 600) baseScore = 78;
  if (wordCount > 800) baseScore = 84;

  // Small random variation ±8
  const jitter = Math.floor(Math.random() * 16) - 8;
  const grade = Math.min(100, Math.max(40, baseScore + jitter));

  const rubric_scores = {};
  let distributed = 0;
  rubric.forEach((r, i) => {
    const pct = (grade / 100) + (Math.random() * 0.1 - 0.05);
    const pts = i === rubric.length - 1
      ? Math.max(0, Math.min(r.max_points, Math.round(grade - distributed)))
      : Math.round(Math.min(r.max_points, r.max_points * pct));
    rubric_scores[r.id] = pts;
    distributed += pts;
  });

  return {
    grade,
    letter_grade: computeLetterGrade(grade),
    feedback_likes:
      'The essay demonstrates understanding of the source material and includes relevant textual references. ' +
      'The organizational structure is generally clear.',
    feedback_improvements:
      'The thesis could be more specific and arguable. ' +
      'Analysis sections would benefit from deeper engagement with the text rather than summarizing plot events.',
    rubric_scores,
    confidence_score: 0.65,
    ai_reasoning:
      `[MOCK] Scored based on essay length (${wordCount} words) and heuristic rubric distribution. ` +
      'No OpenAI API key was configured.',
  };
}

module.exports = { gradeEssaysWithAI };

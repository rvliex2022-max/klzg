// How to run the scrip:
// Create file .env.local, and add GEMINI_API_KEY=<your gemini api key>
// node generate-questions.js

// To generate only specific categories:
// node generate-questions.js --categories science,geography,history

// Available categories:
// math, science, history, geography, nature_and_body, arts_and_literature, sports, pop_culture, general_knowledge

import fs from 'fs';
import path from 'path';

const QUESTIONS_PER_CATEGORY = 100;
const OUTPUT_PATH = "questions-bank.js";
const DRY_RUN = false;


const CATEGORIES = ["math", "science", "history", "geography", "nature_and_body", "arts_and_literature", "sports", "pop_culture", "general_knowledge"];
const MODEL = "gemini-3.8-flash";

const CATEGORY_PROMPTS = {
  math: "basic arithmetic and very simple problems (addition, subtraction, multiplication, division) — no algebra, no advanced concepts, but numbers can be in hundreds",
  science: "well-known physics, chemistry, and astronomy/space facts that a casual audience would know or could reasonably guess — not animal or human-body facts",
  history: "well-known world history facts and events — nothing obscure or highly specialized",
  geography: "well-known countries, capitals, landmarks, and geography facts",
  nature_and_body: "animal and nature facts, and human body/health facts (anatomy, organs, common health knowledge) — basic biology a casual audience would know",
  arts_and_literature: "well-known literature and authors, classical/visual art and painters, museums, and language facts — famous books, poems, paintings, and musical instruments or composers",
  sports: "well-known sports facts, rules, famous athletes, and major competitions (Olympics, World Cup, etc.) — casual sports-fan knowledge, not obscure stats",
  pop_culture: "popular movies, TV shows, anime, music, and celebrities — well-known pop culture trivia a casual audience would recognize",
  general_knowledge: "broad everyday general knowledge — food, currency, flags, measurement, codes, and miscellaneous facts that don't fit the other categories",
};

const QUESTION_ARRAY_SCHEMA = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            question: {type: "STRING"},
            options: {type: "ARRAY", items: {type: "STRING"}},
            correctIndex: {type: "INTEGER"},
        },
        required: ["question", "options", "correctIndex"],
    },
};

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
};

function parseJsonLenient(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
};

function normalizeText(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

function getCategoriesFromArgs(args = process.argv.slice(2)) {
  const inlineFlag = args.find((arg) => arg.startsWith("--categories="));
  const flagIndex = args.indexOf("--categories");
  const raw = inlineFlag
    ? inlineFlag.slice("--categories=".length)
    : flagIndex !== -1
      ? args[flagIndex + 1]
      : null;

  if (raw === null) return CATEGORIES;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Pass categories as a comma-separated list after --categories");
  }

  const selected = [...new Set(raw.split(",").map((category) => category.trim()).filter(Boolean))];
  const unknown = selected.filter(
    (category) => !Object.prototype.hasOwnProperty.call(CATEGORY_PROMPTS, category)
  );

  if (unknown.length) {
    throw new Error(`Unknown categories: ${unknown.join(", ")}`);
  }

  return selected;
};

function validateItem(item) {
  if (!item || typeof item !== "object") return null;
  const question = typeof item.question === "string" ? item.question.trim() : "";
  const options = Array.isArray(item.options) ? item.options.map((o) => String(o).trim()) : [];
  const correctIndex = item.correctIndex;

  if (question.length < 3 || question.length > 200) return null;
  if (options.length !== 4) return null;
  if (options.some((o) => o.length < 1 || o.length > 80)) return null;
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;

  return { question, options, correctIndex };
};

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: QUESTION_ARRAY_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini response had no text content");
  return parseJsonLenient(text);
};

function buildGenerationPrompt(category, count, existingQuestions) {
  const topic = CATEGORY_PROMPTS[category];
  const avoidList = existingQuestions.length
    ? `\n\nDo not repeat or closely rephrase any of these existing questions:\n${existingQuestions.map((q) => `- ${q}`).join("\n")}`
    : "";

  return `Generate exactly ${count} easy, casual party-trivia multiple-choice questions about ${topic}.
These are for a lighthearted trivia party game played by a general audience, including casual/non-expert players. Difficulty must be EASY — no expert, niche, or trick questions.
Each question must have exactly 4 answer options, with exactly one correct answer. The 3 incorrect options should be plausible but clearly wrong.
Return ONLY a JSON array where each item looks like: {"question": string, "options": [string, string, string, string], "correctIndex": number}, where correctIndex is the 0-based index (0, 1, 2, or 3) of the correct option.
Make sure the correct answer is not always the first choice, randomize its location.${avoidList}`;
};

function buildTranslationPrompt(englishQuestions) {
  const input = englishQuestions.map(({ question, options, correctIndex }) => ({ question, options, correctIndex }));
  return `Translate the following trivia questions and their 4 answer options into natural, simple Modern Standard Arabic suitable for a casual trivia game.
Rules:
- Keep the exact order of the 4 options — do not reorder, add, or remove any.
- Keep "correctIndex" identical to the input, since it refers to a position, not the wording.
- Return ONLY a JSON array, same length and order as the input, with items shaped like: {"question": string, "options": [string, string, string, string], "correctIndex": number}.

Input JSON:
${JSON.stringify(input)}`;
};

async function generateCategory({ category, count, apiKey, model, existingEnglishQuestions }) {
  const sampleToAvoid = existingEnglishQuestions.slice(0, 40).map(([text]) => text);
  const prompt = buildGenerationPrompt(category, count, sampleToAvoid);

  let raw;
  try {
    raw = await callGemini({ apiKey, model, prompt });
  } catch (e) {
    console.warn(`[${category}] generation failed: ${e.message}`);
    return [];
  }
  if (!Array.isArray(raw)) {
    console.warn(`[${category}] Gemini didn't return a list`);
    return [];
  }

  const alreadyHave = new Set(existingEnglishQuestions.map(([text]) => normalizeText(text)));
  const seenThisBatch = new Set();
  const goodOnes = [];

  for (const item of raw) {
    const checked = validateItem(item);
    if (!checked) {
      console.warn(`[${category}] skipped a badly-formed question`);
      continue;
    }
    const key = normalizeText(checked.question);
    if (alreadyHave.has(key) || seenThisBatch.has(key)) {
      console.warn(`[${category}] skipped duplicate: ${checked.question}`);
      continue;
    }
    seenThisBatch.add(key);
    goodOnes.push(checked);
  }
  return goodOnes;
};

async function translateBatch({ englishQuestions, apiKey, model }) {
  if (englishQuestions.length === 0) return [];
  const prompt = buildTranslationPrompt(englishQuestions);

  let raw;
  try {
    raw = await callGemini({ apiKey, model, prompt });
  } catch (e) {
    console.warn(`translation failed: ${e.message}`);
    return [];
  }
  if (!Array.isArray(raw)) {
    console.warn("translation didn't return a list");
    return [];
  }

  const pairs = [];
  for (let i = 0; i < englishQuestions.length; i++) {
    const translated = validateItem(raw[i]);
    if (!translated) {
      console.warn(`translation for item ${i} was missing/invalid, skipping it`);
      continue;
    }
    if (translated.correctIndex !== englishQuestions[i].correctIndex) {
      console.warn(`translation for item ${i} changed the correct answer index, skipping it`);
      continue;
    }
    pairs.push({ en: englishQuestions[i], ar: translated });
  }
  return pairs;
};

function extractConstObject(fileText, varName) {
  const marker = `const ${varName} = `;
  const start = fileText.indexOf(marker);
  if (start === -1) return null;

  const objectStart = start + marker.length;
  let depth = 0;
  let objectEnd = -1;
  for (let i = objectStart; i < fileText.length; i++) {
    if (fileText[i] === "{") depth++;
    if (fileText[i] === "}") {
      depth--;
      if (depth === 0) {
        objectEnd = i + 1;
        break;
      }
    }
  }
  if (objectEnd === -1) return null;

  return JSON.parse(fileText.slice(objectStart, objectEnd));
};

function emptyCategoryMap(categories = CATEGORIES) {
  return Object.fromEntries(categories.map((category) => [category, []]));
};

function loadExistingBank(outPath, categories = CATEGORIES) {
  if (!fs.existsSync(outPath)) {
    return { en: emptyCategoryMap(categories), ar: emptyCategoryMap(categories) };
  }
  const fileText = fs.readFileSync(outPath, "utf8");
  const en = extractConstObject(fileText, "AI_QUESTIONS_EN") || emptyCategoryMap(categories);
  const ar = extractConstObject(fileText, "AI_QUESTIONS_AR") || emptyCategoryMap(categories);
  for (const category of categories) {
    if (!Array.isArray(en[category])) en[category] = [];
    if (!Array.isArray(ar[category])) ar[category] = [];
  }
  return { en, ar };
};

function serializeBank(en, ar) {
  return `const AI_QUESTIONS_EN = ${JSON.stringify(en, null, 2)};\nconst AI_QUESTIONS_AR = ${JSON.stringify(ar, null, 2)};\n`;
};

async function main() {
  loadEnvLocal();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }
  const model = process.env.GEMINI_MODEL || MODEL;
  const outPath = path.resolve(process.cwd(), OUTPUT_PATH);

  const categories = getCategoriesFromArgs();
  const { en: enData, ar: arData } = loadExistingBank(outPath, categories);

  const targets = categories.map((category) => ({ category, count: QUESTIONS_PER_CATEGORY }));

  const summary = [];

  for (const { category, count } of targets) {
    console.log(`\n=== ${category}: asking Gemini for ${count} English questions ===`);
    const englishQuestions = await generateCategory({
      category,
      count,
      apiKey,
      model,
      existingEnglishQuestions: enData[category],
    });
    console.log(`[${category}] ${englishQuestions.length} English questions passed checks`);

    await sleep(1000);

    console.log(`[${category}] translating to Arabic...`);
    const pairs = await translateBatch({ englishQuestions, apiKey, model });
    console.log(`[${category}] ${pairs.length} question pairs made it through translation`);

    if (!DRY_RUN) {
      for (const { en, ar } of pairs) {
        enData[category].push([en.question, en.options, en.correctIndex]);
        arData[category].push([ar.question, ar.options, ar.correctIndex]);
      }
    }

    summary.push({ category, requested: count, added: pairs.length });
    await sleep(1000);
  }

  console.log("\n=== Summary ===");
  for (const s of summary) console.log(`${s.category}: requested ${s.requested}, added ${s.added}`);
  for (const category of categories) {
    console.log(`Total stored — ${category}: EN=${enData[category].length}, AR=${arData[category].length}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY_RUN is true, so nothing was saved.");
    return;
  }

  fs.writeFileSync(outPath, serializeBank(enData, arData), "utf8");
  console.log(`\nSaved to ${outPath}`);
};

main().catch((e) => {
  console.error("Something went wrong:", e);
  process.exit(1);
});


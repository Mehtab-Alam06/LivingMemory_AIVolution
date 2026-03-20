const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

/**
 * Helper to convert local file for Gemini ingestion
 */
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType,
        },
    };
}

/**
 * Helper to extract JSON from LLM response (handling markdown blocks)
 */
function extractJSON(text, errorFallback = "Analysis failed to produce structured data") {
    if (!text) {
        console.error("extractJSON received empty text");
        return { 
            vision_analysis: { tradition_name: errorFallback },
            topic_mismatch: false 
        };
    }
    try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
        const cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Extraction Error:", e.message);
        // Put the error directly in the fields so the user sees WHY it failed
        const msg = `AI Error: ${e.message}. Raw: ${text.slice(0, 50)}...`;
        return { 
            vision_analysis: { 
                tradition_name: msg,
                historical_origin: msg,
                geographic_region: msg
            },
            topic_mismatch: false,
            raw_text: text 
        };
    }
}

/**
 * 👁️ Image Analysis (Gemini 1.5 Flash)
 */
async function analyzeImage(filePath, domain, topic = "") {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    
    // Dynamic MIME detection
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
    const mimeType = mimeMap[ext] || "image/jpeg";

    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", safetySettings });

    const prompt = `
You are a Resilient Cultural Analyst specializing in the traditional knowledge (TK) of Odisha, India.
Analyze the provided image. The user has selected the topic '${topic}' within the '${domain}' domain.

INSTRUCTIONS:
1. **FLEXIBLE VALIDATION**: If the image depicts an Odia tradition that is NOT '${topic}' or belongs to a different domain (e.g., Art instead of Agriculture), DO NOT REJECT IT. Instead, perform a COMPLETE ANALYSIS of the tradition actually shown.
2. **TOPIC MISMATCH**: If the tradition shown is NOT substantially related to '${topic}', set "topic_mismatch": true.
3. **DEPTH**: For every metadata field, provide 2-3 SHORT, CONCISE **bullet points** (under 5 words each) capturing key details. Use a point-wise format (e.g., "- Point 1\\n- Point 2") INSIDE the string value. 
CRITICAL: All values MUST be valid JSON strings enclosed in double quotes. Do NOT write \`"field": - Point 1\`, you MUST write \`"field": "- Point 1\\n- Point 2"\`.
4. **NO DEFAULTS**: Do not mention 'agriculture' unless the content is strictly agricultural.

JSON Structure:
{
  "topic_mismatch": false,
  "vision_analysis": {
    "tradition_name": "Detailed Name & Type",
    "historical_origin": "Roots, Mythological links, or Historical era",
    "geographic_region": "Specific Districts and village clusters in Odisha",
    "practicing_community": "Specific Tribes, Caste-groups, or Guilds",
    "current_stage": "Detailed description of the action/object shown",
    "total_stages_in_tradition": "Estimate of full workflow count",
    "people_engaged_per_stage": "Roles of apprentices, masters, or community",
    "raw_materials_used": ["Detailed Material 1", "Detailed Material 2"],
    "tools_required": ["Specific Tool 1", "Specific Tool 2"],
    "cultural_impact": "Significance to identity and community resilience",
    "economic_significance": "Market value, livelihood impact, and trade",
    "spiritual_or_ritual_meaning": "Sacred associations or ceremonial use",
    "environmental_sustainability": "Eco-friendly aspects and material sourcing",
    "gender_roles": "Divisions of labor or specialized inclusive roles",
    "knowledge_at_risk": "Fading techniques or resource scarcity issues",
    "estimated_years_to_master": "Typical apprenticeship duration"
  }
}
`;

    try {
        console.log(`[Gemini] Analyzing Image (${mimeType}) for topic: ${topic}`);
        const result = await model.generateContent([prompt, fileToGenerativePart(filePath, mimeType)]);
        const response = await result.response;
        const text = response.text();
        return extractJSON(text, "Failed to parse image analysis result.");
    } catch (e) {
        console.error("Gemini Image Analysis Error:", e);
        const errorMsg = e.message?.includes("429") || e.message?.toLowerCase().includes("rate limit")
            ? "API Rate Limit reached. Please wait a moment and try again."
            : `Gemini Error: ${e.message}`;
            
        return { 
            vision_analysis: { 
                tradition_name: errorMsg,
                historical_origin: "Error occurred during analysis",
                geographic_region: "Error occurred during analysis"
            },
            topic_mismatch: false 
        };
    }
}

/**
 * 🎬 Video Analysis (Gemini 1.5 Flash Native)
 */
async function analyzeVideo(filePath, domain, topic = "") {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    
    // Dynamic MIME detection for video
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".avi": "video/x-msvideo" };
    const mimeType = mimeMap[ext] || "video/mp4";

    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", safetySettings });

    const prompt = `
You are a Resilient Cultural Analyst specializing in the traditional knowledge (TK) of Odisha.
Analyze the video. The user has selected the topic '${topic}' within the '${domain}' domain.

INSTRUCTIONS:
1. **FLEXIBLE VALIDATION**: If the video shows an Odia tradition NOT matching '${topic}', DO NOT REJECT IT. Perform a COMPLETE ANALYSIS of the tradition shown.
2. **TOPIC MISMATCH**: Set "topic_mismatch": true if the content is unrelated to '${topic}'.
3. **DEPTH**: Provide 2-3 SHORT, CONCISE **bullet points** (under 5 words each) for all metadata fields. Use a point-wise format (e.g., "- Point 1\\n- Point 2").
CRITICAL: All values MUST be valid JSON strings enclosed in double quotes. Do NOT write \`"field": - Point 1\`, you MUST write \`"field": "- Point 1\\n- Point 2"\`.
4. **NO DEFAULTS**: Avoid assuming 'agriculture' unless strictly present.

JSON Structure:
{
  "topic_mismatch": false,
  "raw_metrics": {"hands_visible_pct": 85, "rhythm_detected": true},
  "video_metadata": {"duration_seconds": 30, "resolution": "1080p", "domain": "${domain}"},
  "llm_interpretation": {
    "vision_analysis": {
      "tradition_name": "Full name & Sub-type",
      "historical_origin": "Historical roots or myths",
      "geographic_region": "Odisha districts/villages",
      "practicing_community": "Tribal or community groups",
      "current_stage": "Detailed stage description",
      "total_stages_in_tradition": "Full count",
      "people_engaged_per_stage": "Community roles",
      "raw_materials_used": ["Detailed Material"],
      "tools_required": ["Specific Tool"],
      "cultural_impact": "Details of identity preservation",
      "economic_significance": "Livelihood details",
      "spiritual_or_ritual_meaning": "Sacred context",
      "environmental_sustainability": "Eco-details",
      "gender_roles": "Labor division",
      "knowledge_at_risk": "Risk factors",
      "estimated_years_to_master": "Timeline",
      "technique_analysis": "Forensic details on strokes, pressure, or movement speed",
      "stroke_forensics": ["Stroke detail 1", "detail 2"],
      "pressure_indicators": "Visual evidence of force/pressure applied"
    },
    "step_by_step_execution": ["Step 1", "Step 2"],
    "expertise_markers": ["Expertise Marker 1", "Marker 2"]
  }
}
`;

    try {
        console.log(`[Gemini] Starting Video Analysis (${mimeType}) for topic: ${topic}`);
        const result = await model.generateContent([prompt, fileToGenerativePart(filePath, mimeType)]);
        const response = await result.response;
        const text = response.text();
        return extractJSON(text, "Failed to parse video analysis result.");
    } catch (e) {
        console.error("Gemini Video Analysis Error:", e);
        const errorMsg = e.message?.includes("429") || e.message?.toLowerCase().includes("rate limit")
            ? "API Rate Limit reached. Please wait a moment and try again."
            : `Gemini Error: ${e.message}`;

        return { 
            llm_interpretation: { 
                vision_analysis: { 
                    tradition_name: errorMsg,
                    historical_origin: "Error occurred during analysis"
                } 
            },
            topic_mismatch: false 
        };
    }
}

/**
 * 📄 Document Analysis (Groq Llama 3.1)
 */
async function analyzeDocument(filePath, domain, topic = "") {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    
    let textContent = "";
    const ext = path.extname(filePath).toLowerCase();

    try {
        console.log(`[Groq] Extracting text from ${ext} document...`);
        if (ext === ".txt") {
            textContent = fs.readFileSync(filePath, "utf-8");
        } else if (ext === ".docx") {
            const result = await mammoth.extractRawText({ path: filePath });
            textContent = result.value;
        } else if (ext === ".pdf") {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            textContent = data.text;
        } else {
            textContent = fs.readFileSync(filePath, "utf-8"); // fallback
        }
        console.log(`[Groq] Text extraction complete (${textContent.length} chars)`);
    } catch (e) {
        console.error("Document Extraction Error:", e);
        textContent = "Document content parsing error: " + e.message;
    }

    const prompt = `
You are a Resilient Cultural Analyst specializing in the traditional knowledge (TK) of Odisha.
Analyze the document text. The user has selected the topic '${topic}' within the '${domain}' domain.

INSTRUCTIONS:
1. **FLEXIBLE VALIDATION**: If the text describes an Odia tradition NOT matching '${topic}', DO NOT REJECT IT. Perform a COMPLETE ANALYSIS of the tradition found (e.g., Pattachitra, even if domain was Agriculture).
2. **TOPIC MISMATCH**: Set "topic_mismatch": true if the content is unrelated to specific '${topic}'.
3. **DEPTH**: Provide 2-3 SHORT, CONCISE **bullet points** (under 5 words each) for all metadata fields. Use a point-wise format (e.g., "- Point 1\\n- Point 2").
CRITICAL: All values MUST be valid JSON strings enclosed in double quotes. Do NOT write \`"field": - Point 1\`, you MUST write \`"field": "- Point 1\\n- Point 2"\`.
4. **NO DEFAULTS**: Do NOT mention 'agriculture' if the content is about Art, Health, or other domains.

JSON structure:
{
  "topic_mismatch": false,
  "vision_analysis": {
    "tradition_name": "Detailed Name & Type",
    "historical_origin": "Roots, Myths, or History",
    "geographic_region": "Odisha Districts/Villages",
    "practicing_community": "Tribe or Community",
    "current_stage": "Stage description",
    "total_stages_in_tradition": "Number",
    "people_engaged_per_stage": "Roles",
    "raw_materials_used": ["Detailed Material"],
    "tools_required": ["Specific Tool"],
    "cultural_impact": "Identity details",
    "economic_significance": "Value details",
    "spiritual_or_ritual_meaning": "Sacred details",
    "environmental_sustainability": "Eco details",
    "gender_roles": "Role details",
    "knowledge_at_risk": "Risk factors",
    "estimated_years_to_master": "Years"
  },
  "summary": "2-3 sentence technical summary",
  "key_entities": ["Key Entity 1", "Entity 2"]
}

Text snippet:
${textContent.slice(0, 7000)}
`;

    try {
        console.log(`[Groq] Analyzing document using Llama 3.3 70B...`);
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
        });
        const text = completion.choices[0].message.content;
        console.log(`[Groq] Document response received (${text.length} chars)`);
        return extractJSON(text);
    } catch (e) {
        console.error("Groq Document Analysis Error:", e);
        const errorMsg = e.message?.includes("429") || e.message?.toLowerCase().includes("rate limit")
            ? "Groq API Rate Limit reached. Please wait a moment."
            : `Groq Error: ${e.message}`;
            
        return { 
            vision_analysis: { 
                tradition_name: errorMsg,
                historical_origin: "Error occurred during Groq analysis"
            },
            topic_mismatch: false 
        };
    }
}

/**
 * 🎵 Audio Analysis (Groq Whisper + Llama 3.1)
 */
async function analyzeAudio(filePath, domain, topic = "") {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    
    try {
        console.log(`[Groq] Starting Multi-lingual Transcription (Whisper)...`);
        // 1. Transcription via Groq Whisper (Handles multilingual English/Hindi automatically)
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "text",
        });
        console.log(`[Groq] Transcription complete (${transcription.length} chars)`);

        const prompt = `
You are a Resilient Cultural Analyst specializing in the oral histories of Odisha. 
Analyze the transcription (English/Hindi/Odia). The user has selected the topic '${topic}' within the '${domain}' domain.

INSTRUCTIONS:
1. **FLEXIBLE VALIDATION**: If the transcription describes an Odia tradition NOT matching '${topic}', DO NOT REJECT IT. Perform a COMPLETE ANALYSIS of the tradition heard.
2. **TOPIC MISMATCH**: Set "topic_mismatch": true if unrelated to '${topic}'.
3. **DEPTH**: Provide 2-3 SHORT, CONCISE **bullet points** (under 5 words each) for all metadata. Use a point-wise format (e.g., "- Point 1\\n- Point 2").
CRITICAL: All values MUST be valid JSON strings enclosed in double quotes. Do NOT write \`"field": - Point 1\`, you MUST write \`"field": "- Point 1\\n- Point 2"\`.
4. **NO DEFAULTS**: Do NOT default to 'agriculture'.
5. **TRANSLATION**: Translate insights to English but preserve technical terms (e.g., 'Bandha', 'Ikat').

JSON Structure:
{
  "topic_mismatch": false,
  "vision_analysis": {
    "tradition_name": "Detailed Name",
    "historical_origin": "History/Myth",
    "geographic_region": "Odisha Region",
    "practicing_community": "Community",
    "current_stage": "Oral description of stage",
    "total_stages_in_tradition": "Number",
    "people_engaged_per_stage": "Roles",
    "raw_materials_used": ["Detailed Material"],
    "tools_required": ["Specific Tool"],
    "cultural_impact": "Identity Details",
    "economic_significance": "Value Details",
    "spiritual_or_ritual_meaning": "Sacred Details",
    "environmental_sustainability": "Eco Details",
    "gender_roles": "Role Details",
    "knowledge_at_risk": "Risk Factors",
    "estimated_years_to_master": "Years"
  },
  "transcript_summary": "Detailed technical summary",
  "tone_analysis": "Emotional/Technical depth",
  "speaker_expertise": "Expertise markers"
}

Transcription:
${transcription}
`;

        console.log(`[Groq] Analyzing transcript using Llama 3.3 70B...`);
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
        });
        const text = completion.choices[0].message.content;
        console.log(`[Groq] Audio response received (${text.length} chars)`);
        return extractJSON(text);
    } catch (e) {
        console.error("Groq Audio Analysis Error:", e);
        const errorMsg = e.message?.includes("429") || e.message?.toLowerCase().includes("rate limit")
            ? "Whisper/Groq Rate Limit reached. Please wait a moment."
            : `Audio AI Error: ${e.message}`;
            
        return { 
            vision_analysis: { 
                tradition_name: errorMsg,
                historical_origin: "Error occurred during audio transcription/analysis"
            },
            topic_mismatch: false 
        };
    }
}

module.exports = {
    analyzeImage,
    analyzeVideo,
    analyzeDocument,
    analyzeAudio
};

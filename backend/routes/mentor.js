const express = require('express');
const router = express.Router();
const KnowledgeSubmission = require('../models/KnowledgeSubmission');
const AnalysisHistory = require('../models/AnalysisHistory');
const ytSearch = require('yt-search');
const https = require('https');

router.post('/', async (req, res) => {
    try {
        const { message, history = [], topic = '', domain = '', ignoreMismatch = false, overrideTopic = null } = req.body;

        if (!message) return res.status(400).json({ error: "Message is required" });
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY missing" });

        console.log(`[Mentor RAG] Query: "${message}" | Modal Topic: "${topic}" | Override Topic: "${overrideTopic}"`);

        // --- TRADITIONAL KNOWLEDGE GUARDRAILS ---
        let isGreeting = false;
        if (!ignoreMismatch && !overrideTopic) {
            const checkPrompt = `You are a strict classifier for a Traditional Knowledge Mentor.
Current Topic: "${topic}"
User Message: "${message}"

Tasks:
1. is_greeting: (hi, hello, namaskar, thanks, okay)
2. mismatch: (asking about a DIFFERENT traditional craft, e.g. painting vs agriculture)
3. is_unrelated: Is this message UNRELATED to history, traditional crafts, heritage, or cultural practices? (Includes general world knowledge, tech, weather, math, pop culture, news).

Respond in JSON: {"mismatch": bool, "detected_topic": string|null, "is_greeting": bool, "is_unrelated": bool}`;

            const checkBody = JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: checkPrompt }],
                temperature: 0.1, response_format: { type: "json_object" }
            });

            try {
                const checkRes = await new Promise((resolve, reject) => {
                    const reqHttp = https.request({ hostname: "api.groq.com", path: "/openai/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "Content-Length": Buffer.byteLength(checkBody) } }, r => {
                        let b = ""; r.on("data", c => b += c); r.on("end", () => { try { resolve(JSON.parse(b)); } catch { reject(); } });
                    });
                    reqHttp.on("error", reject); reqHttp.write(checkBody); reqHttp.end();
                });
                const checkData = JSON.parse(checkRes.choices[0].message.content);
                isGreeting = checkData.is_greeting;
                
                if (checkData.is_unrelated && !isGreeting) {
                    return res.json({ reply: "I am a guardian of traditional wisdom. My purpose is to share knowledge of heritage, local crafts, and ancestral practices. I do not carry information on general world affairs, modern technology, or trivia outside our shared traditions. Please ask me about the wisdom of our ancestors." });
                }

                if (!isGreeting && checkData.mismatch && checkData.detected_topic && checkData.detected_topic.toLowerCase() !== topic.toLowerCase()) {
                    console.log("[Mentor RAG] Topic Mismatch Detected:", checkData.detected_topic);
                    return res.json({ topic_mismatch: true, detected_topic: checkData.detected_topic });
                }
            } catch (e) { console.error("[Mentor RAG] Guardrail check failed:", e.message); }
        }

        // Active topic context (either the modal topic, or the newly overridden topic if user pressed "Yes")
        const activeTopic = overrideTopic || topic;

        // 1. Gather DB Context
        let dbContextStr = "No local verified knowledge found for this topic.";
        let analysisContextStr = "";
        
        if (activeTopic) {
            try {
                const safeTopic = activeTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                const dbResults = await KnowledgeSubmission.find({ 
                    knowledgeTitle: { $regex: new RegExp(safeTopic, 'i') } 
                }).lean().limit(2);
                
                const analysisResults = await AnalysisHistory.find({ 
                    entryId: { $regex: new RegExp(safeTopic, 'i') } 
                }).lean().limit(3);

                if (dbResults.length > 0) {
                    dbContextStr = dbResults.map(r => 
                        `Title: ${r.knowledgeTitle}\nDesc: ${r.description || ''}\nExp: ${r.explanation || ''}`
                    ).join('\n---\n');
                }
                if (analysisResults.length > 0) {
                    analysisContextStr = analysisResults.map(r => {
                        const vis = r.result?.vision_analysis || r.result?.llm_interpretation?.vision_analysis || {};
                        return `Analysis Type: ${r.type}\nMaterials: ${JSON.stringify(vis.raw_materials_used || [])}\nTechniques: ${JSON.stringify(vis.techniques_and_tools || vis.tools_required || [])}`;
                    }).join('\n---\n');
                }
            } catch (err) {
                console.error("[Mentor RAG] DB Context error:", err.message);
            }
        }

        async function duckDuckHTMLScrape(q) {
            try {
                const axios = require('axios');
                const cheerio = require('cheerio');
                const { data } = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                const $ = cheerio.load(data);
                const results = [];
                $('.result').each((i, el) => {
                    if (results.length >= 3) return;
                    const titleAnchor = $(el).find('.result__title a');
                    const title = titleAnchor.text().trim();
                    let url = titleAnchor.attr('href');
                    const snippet = $(el).find('.result__snippet').text().trim();
                    if (title && url) {
                        try {
                            if (url.includes('uddg=')) url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                            if (!url.startsWith('http')) return; // Ignore invalid / relative URLs
                            results.push({ title, url: url.trim(), description: snippet });
                        } catch(e) {}
                    }
                });
                return { results };
            } catch (e) {
                return { results: [] };
            }
        }

        // 2. Web Search String Formulation
        const cleanMessage = message.replace(/what|are|the|materials|used|in|and|can|you|share|some|youtube|tutorials|how|to|do|that|for|me|yes|no|tell|me|about|please/gi, '').trim() || activeTopic;
        const msgSearchQuery = cleanMessage.split(' ').slice(0, 10).join(' '); // max 10 words
        
        console.log(`[Mentor RAG] Executing Web Searches for Topic: "${activeTopic}" AND Message: "${msgSearchQuery}"`);

        // 3. Perform Searches in Parallel (Skip if greeting)
        let webResultsStr = "No web results found.";
        let ytResultsStr = "No videos found.";
        let uniqueWeb = [];
        let uniqueVideos = [];
        
        if (!isGreeting) {
            try {
                const [webRes1, webRes2, ytRes1, ytRes2] = await Promise.allSettled([
                    duckDuckHTMLScrape(activeTopic),
                    duckDuckHTMLScrape(msgSearchQuery),
                    ytSearch(`${activeTopic} traditional`),
                    ytSearch(msgSearchQuery)
                ]);

                // Combine YT results safely
                let allVideos = [];
                if (ytRes1.status === 'fulfilled' && ytRes1.value?.videos) allVideos.push(...ytRes1.value.videos);
                if (ytRes2.status === 'fulfilled' && ytRes2.value?.videos) allVideos.push(...ytRes2.value.videos);
                
                // Deduplicate Videos
                uniqueVideos = Array.from(new Map(allVideos.map(v => [v.videoId, v])).values());

                // Combine Web results safely
                let allWeb = [];
                if (webRes1.status === 'fulfilled' && webRes1.value?.results) allWeb.push(...webRes1.value.results);
                if (webRes2.status === 'fulfilled' && webRes2.value?.results) allWeb.push(...webRes2.value.results);
                
                // Deduplicate Web
                uniqueWeb = Array.from(new Map(allWeb.map(w => [w.title, w])).values());

                if (uniqueWeb.length > 0) {
                    webResultsStr = uniqueWeb.slice(0, 4).map(r => 
                        `[WEB] Title: ${r.title}\nURL: ${r.url}\nExcerpt: ${r.description}`
                    ).join('\n\n');
                }

                if (uniqueVideos.length > 0) {
                    ytResultsStr = uniqueVideos.slice(0, 4).map(v => 
                        `[VIDEO] Title: ${v.title}\nURL: ${v.url}\nDuration: ${v.duration.timestamp}`
                    ).join('\n\n');
                }
            } catch (err) {
                console.error("[Mentor RAG] Search API error:", err.message);
            }
        }

        // 4. Construct Groq Prompt
        const systemPrompt = `You are a highly knowledgeable AI Mentor for a Traditional Knowledge Preservation system.
The user is exploring the topic: "${activeTopic}" (Domain: ${domain}).

### STRICT MANDATES:
1. BE CONCISE AND TRADITIONAL. Answer as a wise mentor.
2. YOU ONLY ANSWER QUESTIONS RELATED TO THE TRADITIONAL PRACTICE: "${activeTopic}" (DOMAIN: ${domain}).
3. IF THE USER ASKS FOR GENERAL WORLD KNOWLEDGE (WEATHER, NEWS, TRIVIA), POLITELY DECLINE AND BRING THEM BACK TO THE TRADITION.
4. HANDLE GREETINGS (HELLO, NAMASKAR) WARMLY OR CHARACTER, BUT DO NOT GIVE SOURCES FOR GREETINGS.
5. YOU ARE FORBIDDEN FROM CITING WEB OR YOUTUBE LINKS IN YOUR ACTUAL TEXT. The system will automatically inject them.
6. If the Verified Database Context has relevant information, prioritize it heavily.

### VERIFIED LOCAL DATABASE CONTEXT:
${dbContextStr}

${analysisContextStr ? '### LOCAL AI ANALYSIS CONTEXT:\n' + analysisContextStr : ''}
`;

        // Format history
        const groqMessages = [
            { role: "system", content: systemPrompt }
        ];

        // Format prior history map for Groq
        if (Array.isArray(history)) {
            history.forEach(h => {
                if (h.sender === 'user') groqMessages.push({ role: "user", content: h.text });
                if (h.sender === 'mentor') groqMessages.push({ role: "assistant", content: h.text });
            });
        }

        // Add current message
        groqMessages.push({ role: "user", content: message });

        // Ensure API key holds valid (already checked earlier, but fallback)
        if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY missing" });

        const postBody = JSON.stringify({
            model: "llama-3.3-70b-versatile", // Powerful model for RAG synthesis
            messages: groqMessages,
            temperature: 0.5,
            max_tokens: 2000
        });

        // 5. Call Groq API
        const axios = require('axios');
        let reply = "I apologize, but I could not formulate a response regarding this tradition.";
        try {
            const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.3-70b-versatile",
                messages: groqMessages,
                temperature: 0.5,
                max_tokens: 2000
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                }
            });
            reply = groqRes.data?.choices?.[0]?.message?.content?.trim() || reply;
        } catch (e) {
            console.error("Groq Error:", e.response?.data || e.message);
        }

        // 6. Return Structured Sources
        let sources = { web: [], yt: [] };
        
        if (isGreeting) {
            sources = { web: [], yt: [] };
        } else if (uniqueWeb.length > 0) {
            sources.web = uniqueWeb.slice(0, 3);
        } else {
            // Fallback: If DDG threw 403 Forbidden, let's inject a safe Wikipedia link
            sources.web = [{ title: `Wikipedia: ${activeTopic}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(activeTopic.replace(/ /g, '_'))}`, description: 'Encyclopedia entry covering traditional knowledge.' }];
        }

        if (uniqueVideos.length > 0) {
            sources.yt = uniqueVideos.slice(0, 3);
        }

        console.log(`[Mentor RAG] Success. Reply length: ${reply.length}`);
        return res.json({ reply, sources });

    } catch (err) {
        console.error("Mentor route error:", err);
        return res.status(500).json({ error: "Internal server error", msg: err.message });
    }
});

module.exports = router;

/**
 * findCrossDomainBridges
 * Sends the selected knowledge + entire corpus to Groq.
 * Groq returns which entries are similar and WHY (with a label).
 */
const findCrossDomainBridges = async (selectedTitle, allKnowledge) => {
    try {
        if (!process.env.GROQ_API_KEY || allKnowledge.length < 2) return [];

        // Build a clean summary of each knowledge entry
        const entries = allKnowledge.map((k, i) => 
          `${i+1}. "${k.knowledgeTitle}" [${k.domain}]: ${(k.description || '').substring(0, 200)}`
        ).join('\n');

        const prompt = `You are a cultural anthropologist and knowledge graph builder.

The user is currently viewing the tradition: "${selectedTitle}"

Here is the FULL catalog of all other knowledge entries in the system:
${entries}

Task: Find the top 5 to 10 entries from the catalog that are most strongly RELATED to "${selectedTitle}".
Explain the connection in 3-5 words. Look for:
- Shared raw materials or ingredients
- Similar techniques (e.g., fermentation, heating, weaving)
- Geographic/ecological similarities
- Medical or ritual alignments

Return a JSON object with exactly this structure:
{
  "connections": [
    {"title": "Exact title of related entry from catalog", "label": "Short reason (3-5 words)"}
  ]
}

Make sure to find at least 3 connections if possible.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "You are a helpful data analyst. Always respond with valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.4,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq API Error:", response.status, errText);
            return [];
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log("[AI Similarity] Groq response:", content.substring(0, 200));
        
        const parsed = JSON.parse(content);
        return parsed.connections || [];
    } catch (error) {
        console.error("Groq Similarity Error:", error.message);
        return [];
    }
};

module.exports = { findCrossDomainBridges };

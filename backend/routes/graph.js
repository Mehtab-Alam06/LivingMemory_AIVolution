const express = require('express');
const router = express.Router();
const AnalysisHistory = require('../models/AnalysisHistory');
const KnowledgeSubmission = require('../models/KnowledgeSubmission');
const { findCrossDomainBridges } = require('../utils/ai_similarity');

// Helper
function _list(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter(Boolean);
    if (typeof input === 'string') return input.split(',').map(s => s.trim()).filter(Boolean);
    return [];
}

// ═══════════════════════════════════════════════════════════════
// GRAPH 1: Internal Structure
// Shows analysis results + knowledge details for the SELECTED tradition
// ═══════════════════════════════════════════════════════════════
router.get('/knowledge/:title', async (req, res) => {
    try {
        const title = req.params.title?.trim();
        console.log(`[Graph] Internal structure for: "${title}"`);

        // Fetch analysis records for this tradition
        const analyses = await AnalysisHistory.find({ entryId: title }).lean();
        console.log(`[Graph] Found ${analyses.length} analysis records`);

        // Fetch knowledge submissions matching this title
        const submissions = await KnowledgeSubmission.find({
            knowledgeTitle: { $regex: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        }).lean();
        console.log(`[Graph] Found ${submissions.length} knowledge submissions`);

        const nodes = [];
        const links = [];
        const seen = new Set();

        const add = (id, label, category, size = 'small') => {
            if (!seen.has(id)) {
                nodes.push({ id, label, category, size });
                seen.add(id);
            }
        };
        const link = (from, to, label) => {
            if (from && to && from !== to) links.push({ source: from, target: to, type: label });
        };

        // Center node
        const centerId = 'center';
        add(centerId, title, 'craft', 'large');

        // ── Analysis Records (video, image, document) ──
        analyses.forEach((a, i) => {
            const id = `analysis-${i}`;
            const domain = (a.domain || 'General').charAt(0).toUpperCase() + (a.domain || 'general').slice(1);
            const type = (a.type || 'study').charAt(0).toUpperCase() + (a.type || 'study').slice(1);
            add(id, `${domain} ${type}`, 'history', 'medium');
            link(centerId, id, type.toLowerCase());

            const vis = a.result?.vision_analysis || a.result?.llm_interpretation?.vision_analysis || {};
            const techList = _list(vis.techniques_and_tools || vis.tools_required);
            techList.forEach(t => {
                const tid = `tech-${t.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                add(tid, t, 'technique');
                link(id, tid, 'technique');
            });
            _list(vis.raw_materials_used).forEach(m => {
                const mid = `mat-${m.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                add(mid, m, 'material');
                link(id, mid, 'material');
            });
            const expertiseList = _list(a.result?.expertise_markers || a.result?.llm_interpretation?.expertise_markers);
            expertiseList.forEach(e => {
                const eid = `exp-${e.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                add(eid, e, 'craft');
                link(id, eid, 'expertise');
            });
        });

        // ── Knowledge Submissions ──
        submissions.forEach((s, i) => {
            const id = `knowledge-${i}`;
            add(id, s.knowledgeTitle || 'Interview', 'history', 'medium');
            link(centerId, id, 'interview');

            if (s.community) {
                const cid = `comm-${s.community.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                add(cid, s.community, 'community');
                link(id, cid, 'community');
            }
            if (s.knowledgeRegion) {
                const rid = `region-${s.knowledgeRegion.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                add(rid, s.knowledgeRegion, 'ecology');
                link(id, rid, 'region');
            }
            if (s.materials) {
                _list(s.materials).forEach(m => {
                    const mid = `mat-${m.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                    add(mid, m, 'material');
                    link(id, mid, 'material');
                });
            }
        });

        console.log(`[Graph] Returning ${nodes.length} nodes, ${links.length} links`);
        res.json({ nodes, links });
    } catch (err) {
        console.error('Internal graph error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GRAPH 2: Cross-Domain Similarity (AI)
// Frontend POSTs the sidebar knowledge entries, backend sends to Groq
// ═══════════════════════════════════════════════════════════════
router.post('/similarity', async (req, res) => {
    try {
        const { selectedTitle, allEntries } = req.body;
        console.log(`[AI Graph] Similarity for "${selectedTitle}" against ${allEntries?.length || 0} entries`);

        if (!allEntries || allEntries.length < 2) {
            return res.json({ nodes: [], links: [] });
        }

        // Send to Groq
        const connections = await findCrossDomainBridges(selectedTitle, allEntries);
        console.log(`[AI Graph] Groq returned ${connections.length} connections`);

        const nodes = [];
        const links = [];
        const seen = new Set();

        const add = (id, label, category, size = 'small') => {
            if (!seen.has(id)) {
                nodes.push({ id, label, category, size });
                seen.add(id);
            }
        };

        // Center = selected entry
        add('selected', selectedTitle, 'craft', 'large');

        // Add ONLY entries Groq said are connected
        connections.forEach((conn, i) => {
            const nodeId = `conn-${i}`;
            const label = conn.label || 'Related';
            
            // Find matching entry for domain color
            const match = allEntries.find(e => 
                e.title.toLowerCase() === (conn.title || '').toLowerCase()
            );
            const domain = match?.domain || '';

            let category = 'technique';
            if (domain.toLowerCase().includes('agri')) category = 'ecology';
            else if (domain.toLowerCase().includes('health') || domain.toLowerCase().includes('medicine')) category = 'ritual';
            else if (domain.toLowerCase().includes('craft')) category = 'material';

            add(nodeId, conn.title, category, 'medium');
            links.push({ source: 'selected', target: nodeId, type: label });
        });

        console.log(`[AI Graph] Returning ${nodes.length} nodes, ${links.length} links`);
        res.json({ nodes, links });
    } catch (err) {
        console.error('Similarity graph error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

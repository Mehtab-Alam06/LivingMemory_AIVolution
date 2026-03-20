import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import domainData from '../data/domainData.json';

const ForceGraph2D = lazy(() => import('react-force-graph-2d'));

const COLORS = {
  craft: '#8c1c1c',
  history: '#b8860b',
  material: '#2E7D32',
  technique: '#1e40af',
  ritual: '#7e22ce',
  community: '#d97706',
  ecology: '#059669',
  default: '#64748b'
};

const SIZES = { large: 16, medium: 10, small: 6 };

const KnowledgeGraph = ({ title }) => {
  const [mode, setMode] = useState('knowledge');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const fgRef = useRef();

  useEffect(() => {
    if (!title) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      setSelected(null);
      try {
        const endpoint = mode === 'knowledge'
          ? `${API}/graph/knowledge/${encodeURIComponent(title)}`
          : `${API}/graph/similarity`;

        let res;
        if (mode === 'knowledge') {
          res = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${localStorage.getItem('lm_token')}` }
          });
        } else {
          const allEntries = [];
          Object.entries(domainData).forEach(([domain, lists]) => {
            Object.values(lists).forEach(letterList => {
               letterList.forEach(item => {
                 allEntries.push({ title: item.title, domain: domain, description: item.description, tags: item.tags });
               });
            });
          });

          res = await axios.post(endpoint, {
            selectedTitle: title,
            allEntries: allEntries
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('lm_token')}` }
          });
        }

        if (cancelled) return;

        if (!res.data.nodes || res.data.nodes.length === 0) {
          setError('No graph data yet. Record an interview or run an analysis first.');
          setGraphData({ nodes: [], links: [] });
        } else {
          const scattered = res.data.nodes.map(n => ({
            ...n,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200
          }));
          setGraphData({ nodes: scattered, links: res.data.links });

          setTimeout(() => {
            if (fgRef.current) {
              fgRef.current.d3Force('charge').strength(-1200);
              fgRef.current.d3Force('link').distance(180);
              fgRef.current.d3Force('center').strength(0.05);
            }
          }, 400);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load graph data.');
        console.error('Graph error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [title, mode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px', fontFamily: 'Cormorant Garamond, serif' }}>

      {/* ── Tab Buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { key: 'knowledge', label: '🧬 Internal Structure' },
            { key: 'similarity', label: '✨ Cross-Domain (AI)' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              style={{
                padding: '8px 18px',
                background: mode === t.key ? '#2a1a08' : 'transparent',
                color: mode === t.key ? '#f5e6c8' : '#2a1a08',
                border: '2px solid #2a1a08',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'similarity' && (
          <span style={{ fontSize: '11px', color: '#8c6414', fontStyle: 'italic' }}>
            ✨ Powered by Llama-3 AI
          </span>
        )}
      </div>

      {/* ── Graph + Inspector ── */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* Canvas */}
        <div style={{
          flex: 1,
          position: 'relative',
          background: '#fcf6e9',
          border: '3px double #d4ab63',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 60px rgba(140, 100, 20, 0.08), 0 4px 20px rgba(0,0,0,0.08)'
        }}>
          {/* Loading */}
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 10 }}>
              <div style={{ fontSize: '42px', animation: 'spin 2s linear infinite' }}>🏺</div>
              <div style={{ marginTop: '12px', color: '#8c6414', fontWeight: 700, letterSpacing: '3px', fontSize: '12px' }}>
                {mode === 'similarity' ? 'AI IS ANALYZING...' : 'LOADING GRAPH...'}
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', padding: '30px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📜</div>
              <p style={{ fontStyle: 'italic', color: '#8c6414', fontSize: '15px', maxWidth: '320px', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Force Graph */}
          {!loading && !error && graphData.nodes.length > 0 && (
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#8c6414' }}>Loading graph engine...</div>}>
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                backgroundColor="transparent"
                cooldownTicks={180}
                linkColor={() => 'rgba(140, 100, 20, 0.3)'}
                linkWidth={2}
                linkCurvature={0.15}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.003}
                linkDirectionalParticleColor={() => '#d4ab63'}
                onNodeClick={n => setSelected(n)}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={(link, ctx, globalScale) => {
                  if (!link.type) return;
                  // In knowledge mode, skip generic structural labels
                  if (mode === 'knowledge') {
                    const skip = ['analyzed','recorded','uses','material','domain','community','region'];
                    if (skip.includes(link.type)) return;
                  }
                  const s = link.source, e = link.target;
                  if (typeof s !== 'object' || typeof e !== 'object') return;
                  const mx = s.x + (e.x - s.x) * 0.5;
                  const my = s.y + (e.y - s.y) * 0.5;
                  let angle = Math.atan2(e.y - s.y, e.x - s.x);
                  if (angle > Math.PI/2 || angle < -Math.PI/2) angle += Math.PI;

                  ctx.save();
                  ctx.translate(mx, my);
                  ctx.rotate(angle);
                  const fs = Math.max(3, 10 / globalScale);
                  ctx.font = `bold ${fs}px sans-serif`;
                  const tw = ctx.measureText(link.type).width;
                  ctx.fillStyle = 'rgba(252,246,233,0.92)';
                  ctx.fillRect(-(tw+6)/2, -(fs+4)/2, tw+6, fs+4);
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#8c1c1c';
                  ctx.fillText(link.type, 0, 0);
                  ctx.restore();
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const r = SIZES[node.size] || 6;
                  const isSel = selected?.id === node.id;

                  // Glow
                  ctx.save();
                  ctx.shadowColor = isSel ? 'rgba(140,28,28,0.5)' : 'rgba(0,0,0,0.12)';
                  ctx.shadowBlur = (isSel ? 14 : 5) / globalScale;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                  ctx.fillStyle = COLORS[node.category] || COLORS.default;
                  ctx.fill();
                  ctx.shadowBlur = 0;
                  ctx.strokeStyle = isSel ? '#fff' : '#1a0f08';
                  ctx.lineWidth = (isSel ? 2.5 : 1) / globalScale;
                  ctx.stroke();
                  ctx.restore();

                  // Label
                  const fs = Math.max(3, 11 / globalScale);
                  ctx.font = `${fs}px serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#1a0f08';
                  ctx.fillText(node.label, node.x, node.y + r + fs + 2);
                }}
              />
            </Suspense>
          )}
        </div>

        {/* Inspector Panel */}
        {selected && (
          <div style={{
            width: '280px',
            background: '#fff9ef',
            border: '1px solid #d4ab63',
            borderRadius: '8px',
            padding: '18px',
            boxShadow: '-6px 0 24px rgba(0,0,0,0.04)',
            overflowY: 'auto',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d4ab63', paddingBottom: '10px', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, color: '#2a1a08', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>Node Detail</h4>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#8c1c1c' }}>×</button>
            </div>

            <span style={{
              background: COLORS[selected.category] || COLORS.default,
              color: '#fff', padding: '2px 10px', borderRadius: '4px',
              fontSize: '10px', textTransform: 'uppercase', fontWeight: 700
            }}>
              {selected.category}
            </span>
            <h3 style={{ color: '#2a1a08', marginTop: '10px', fontSize: '18px', lineHeight: 1.3 }}>{selected.label}</h3>

            <div style={{ fontSize: '13px', color: '#5d4037', lineHeight: 1.6, marginTop: '12px' }}>
              <p>Part of the <strong>{title}</strong> knowledge network.</p>
              {selected.category === 'community' && <p style={{ fontStyle: 'italic', borderLeft: '3px solid #d97706', paddingLeft: '8px' }}>Community / tribal group sustaining this practice.</p>}
              {selected.category === 'ecology' && <p style={{ fontStyle: 'italic', borderLeft: '3px solid #059669', paddingLeft: '8px' }}>Regional ecological context of this knowledge.</p>}
              {selected.category === 'material' && <p style={{ fontStyle: 'italic', borderLeft: '3px solid #2E7D32', paddingLeft: '8px' }}>Raw material used in this tradition.</p>}
              {selected.category === 'technique' && <p style={{ fontStyle: 'italic', borderLeft: '3px solid #1e40af', paddingLeft: '8px' }}>Specific technique or method documented.</p>}
            </div>

            <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed #d4ab63' }}>
              <label style={{ fontSize: '10px', color: '#8c6414', textTransform: 'uppercase', fontWeight: 700 }}>Connections</label>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#5a4a3a' }}>
                {graphData.links
                  .filter(l => (l.source?.id || l.source) === selected.id || (l.target?.id || l.target) === selected.id)
                  .map((l, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>• <strong style={{ color: '#8c1c1c' }}>{l.type || 'linked'}</strong></div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '14px', padding: '10px 14px', background: 'rgba(212,171,99,0.06)', borderRadius: '6px', border: '1px solid rgba(212,171,99,0.15)' }}>
        {Object.entries({ craft: 'Tradition', material: 'Material', technique: 'Technique/Domain', community: 'Community', ecology: 'Region', history: 'Analysis/Interview', ritual: 'Cultural/Age' }).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#5a4a3a' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[k] }} />
            {v}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default KnowledgeGraph;

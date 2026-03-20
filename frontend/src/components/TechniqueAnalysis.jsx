import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import PaperCard from './PaperCard';

// Force the new AI Analysis endpoints to hit the LOCAL development server parsing the Python models
// API paths: dynamic detection for Dev vs Production (Render/Vercel)
const LOCAL_API = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : API;
const BACKEND = window.location.hostname === 'localhost' ? 'http://localhost:5000' : (import.meta.env.VITE_BACKEND_URL || 'https://livingmemory-aivolution.onrender.com');

const TechniqueAnalysis = ({ title, domain }) => {
    const [file, setFile] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, error
    const [progress, setProgress] = useState(0);
    const [uploadMetrics, setUploadMetrics] = useState({ speed: 0, size: 0, loaded: 0 });
    const [result, setResult] = useState(null);
    const [activeAnalysis, setActiveAnalysis] = useState(null);
    const [history, setHistory] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [topicMismatch, setTopicMismatch] = useState(false);
    const [showDespiteMismatch, setShowDespiteMismatch] = useState(false);
    const pollRef = useRef(null);

    // ── Load History ──
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${LOCAL_API}/analysis/${encodeURIComponent(title)}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('lm_token')}` }
                });
                setHistory(res.data);
                if (res.data.length > 0) setActiveAnalysis(res.data[res.data.length - 1]);
            } catch (err) {
                console.error("Failed to load analysis history:", err);
            }
        };
        fetchHistory();
    }, [title]);

    // ── Polling ──
    useEffect(() => {
        if (jobId && (status === 'uploading' || status === 'processing')) {
            pollRef.current = setInterval(async () => {
                try {
                    const res = await axios.get(`${LOCAL_API}/analysis/status/${jobId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('lm_token')}` }
                    });
                    const job = res.data;
                    setProgress(job.progress);
                    if (job.status === 'done') {
                        setStatus('done');
                        const resObj = job.result;
                        setResult(resObj);
                        setActiveAnalysis(resObj);

                        // Check for topic mismatch
                        if (resObj.topic_mismatch === true) {
                            setTopicMismatch(true);
                            setShowDespiteMismatch(false);
                        } else {
                            setTopicMismatch(false);
                            setShowDespiteMismatch(false);
                            setHistory(prev => [...prev, resObj]);
                        }
                        clearInterval(pollRef.current);
                    } else if (job.status === 'error') {
                        setStatus('error');
                        setErrorMessage(job.error || "An unknown background error occurred.");
                        clearInterval(pollRef.current);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                    setErrorMessage("Connection lost while analyzing. Still trying...");
                    // Don't clear interval immediately, might be transient
                    // But if it persists, we might want to stop
                }
            }, 3000);
        }
        return () => clearInterval(pollRef.current);
    }, [jobId, status]);

    const handleUpload = async () => {
        if (!file) return;
        setStatus('uploading');
        setProgress(5);
        setTopicMismatch(false);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('entryId', title);
        formData.append('entryName', title);
        formData.append('domain', domain);

        const startTime = Date.now();
        try {
            const res = await axios.post(`${LOCAL_API}/analysis/media`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('lm_token')}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);

                    const timeElapsed = (Date.now() - startTime) / 1000; // seconds
                    const uploadSpeed = (progressEvent.loaded / 1024 / 1024) / timeElapsed; // MB/s
                    setUploadMetrics({
                        speed: uploadSpeed.toFixed(2),
                        size: (progressEvent.total / 1024 / 1024).toFixed(2),
                        loaded: (progressEvent.loaded / 1024 / 1024).toFixed(2)
                    });
                }
            });
            setJobId(res.data.jobId);
            setStatus('processing');
            setErrorMessage('');
        } catch (err) {
            console.error("Upload failed:", err);
            setStatus('error');
            const msg = err.response?.data?.error || err.message || "Failed to connect to analysis server.";
            setErrorMessage(msg);
        }
    };

    const renderInsightPanel = (data) => {
        if (!data) return null;

        // Unified data structure from backend
        const interp = data.llm_interpretation || {};
        const vision = interp.vision_analysis || data.vision_analysis || {};

        // Helper for consistent field rendering
        const renderField = (label, value) => {
            const isArray = Array.isArray(value);
            const isBulletString = typeof value === 'string' && (value.includes('- ') || value.includes('\n-'));

            if (isArray || isBulletString) {
                const points = isArray ? value : value.split(/\n- |^- /).filter(p => p.trim());
                return (
                    <div style={{ marginBottom: '14px' }}>
                        <strong style={{ color: '#9b6b2f', fontSize: '12px', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>{label}:</strong>
                        <ul style={{ paddingLeft: '18px', marginTop: '6px', listStyleType: 'circle' }}>
                            {points.map((v, i) => <li key={i} style={{ fontSize: '15px', color: '#3a2a1a', marginBottom: '6px', lineHeight: '1.4' }}>{v.replace(/^- /, '')}</li>)}
                        </ul>
                    </div>
                );
            }
            return (
                <div style={{ marginBottom: '14px' }}>
                    <strong style={{ color: '#9b6b2f', fontSize: '12px', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>{label}:</strong>
                    <div style={{
                        marginTop: '4px', fontSize: '15.5px',
                        color: (value?.toString().includes('Error') || value?.toString().includes('Limit')) ? '#c62828' : '#2a1a08',
                        lineHeight: '1.5',
                        fontWeight: (value?.toString().includes('Error') || value?.toString().includes('Limit')) ? 'bold' : 'normal'
                    }}>
                        {value || <span style={{ color: '#9b6b2f', opacity: 0.5, fontStyle: 'italic', fontSize: '14px' }}>Not specified in analysis</span>}
                    </div>
                </div>
            );
        };

        return (
            <div className="analysis-insights-panel" style={{ marginTop: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2a1a08', borderBottom: '1px solid rgba(140, 100, 20, 0.2)', paddingBottom: '10px' }}>
                    📖 Traditional Metadata
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '20px' }}>
                    <PaperCard title="📜 Cultural Context" className="alt" style={{ borderColor: '#d4ab63' }}>
                        {renderField("Tradition", vision.tradition_name)}
                        {renderField("Origin", vision.historical_origin)}
                        {renderField("Region", vision.geographic_region)}
                        {renderField("Community", vision.practicing_community)}
                    </PaperCard>

                    <PaperCard title="⚙️ Process Details" style={{ borderColor: '#9b6b2f' }}>
                        {renderField("Current Stage", vision.current_stage)}
                        {renderField("Total Stages", vision.total_stages_in_tradition)}
                        {renderField("Collaborators", vision.people_engaged_per_stage)}
                        {renderField("Est. Years to Master", interp.estimated_years_to_master || vision.estimated_years_to_master)}
                    </PaperCard>

                    <PaperCard title="🛠️ Materiality" style={{ borderColor: '#795548' }}>
                        {renderField("Raw Materials", vision.raw_materials_used)}
                        {renderField("Tools Required", vision.tools_required)}
                        {renderField("Sustainability", vision.environmental_sustainability)}
                    </PaperCard>

                    <PaperCard title="📊 Significance" style={{ borderColor: '#6db86d' }}>
                        {renderField("Cultural Impact", vision.cultural_impact)}
                        {renderField("Economic Value", vision.economic_significance)}
                        {renderField("Spiritual/Ritual", vision.spiritual_or_ritual_meaning)}
                        {renderField("Gender Roles", vision.gender_roles)}
                    </PaperCard>
                </div>

                {(interp.stroke_analysis || vision.technique_analysis || vision.stroke_forensics || vision.pressure_indicators) && (
                    <PaperCard title="✍️ Forensic Technique Insights" style={{ borderColor: '#2196f3', marginTop: '20px' }}>
                        {interp.stroke_analysis && (
                            <p style={{ color: '#2a1a08', fontSize: '16px', lineHeight: '1.7', fontStyle: 'italic', marginBottom: '20px' }}>
                                "{interp.stroke_analysis}"
                            </p>
                        )}
                        {vision.technique_analysis && renderField("Technique Overview", vision.technique_analysis)}
                        {vision.stroke_forensics && renderField("Stroke Forensics", vision.stroke_forensics)}
                        {vision.pressure_indicators && renderField("Pressure Indicators", vision.pressure_indicators)}

                        {interp.step_by_step_execution && renderField("Step-by-Step Execution", interp.step_by_step_execution)}
                        {interp.secret_techniques && renderField("Master Secrets", interp.secret_techniques)}
                        {interp.expertise_markers && renderField("Expertise Markers", interp.expertise_markers)}
                    </PaperCard>
                )}

                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(212,171,99,0.1)', borderRadius: '15px', border: '1px dashed #d4ab63' }}>
                    {renderField("🏛️ KNOWLEDGE AT RISK", interp.knowledge_at_risk || vision.knowledge_at_risk)}
                </div>
            </div>
        );
    };

    const renderTimeline = (data) => {
        if (!data || !data.phases) return null;
        return (
            <div style={{ marginTop: '30px', marginBottom: '30px', animation: 'fadeInUp 0.6s ease-out' }}>
                <h3 style={{ fontFamily: 'IM Fell DW Pica', color: '#2a1a08', fontSize: '22px', marginBottom: '15px', borderBottom: '1px solid rgba(140,100,20,0.1)', paddingBottom: '5px' }}>
                    🎞 Technique Timeline
                </h3>
                <div className="analysis-timeline" style={{
                    display: 'flex', background: 'rgba(212,171,99,0.05)', borderRadius: '12px', height: '70px',
                    marginTop: '10px', overflow: 'hidden', border: '2px solid rgba(140, 100, 20, 0.2)', position: 'relative',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    {data.phases.map((p, i) => {
                        const widthPct = (p.duration / (data.video_metadata?.duration_seconds || 1)) * 100;
                        return (
                            <div key={i} style={{
                                width: `${widthPct}%`, height: '100%',
                                background: ['#d4ab63', '#9b6b2f', '#7b6b5a', '#5d4037'][i % 4],
                                borderRight: '1px solid rgba(255,255,255,0.3)', cursor: 'help', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '13px', color: i % 2 === 0 ? '#2a1a08' : 'white',
                                textAlign: 'center', padding: '5px', fontFamily: 'Space Mono', fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                            }} title={`${p.name}: ${p.duration}s`}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    const renderActiveAnalysis = (data) => {
        return (
            <>
                {data.type === 'video' && data.technique_signature && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ background: '#7b6b5a', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.8, fontFamily: 'Space Mono' }}>Expertise Score</span>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', fontFamily: 'IM Fell DW Pica' }}>{data.technique_signature.expertise_score}%</div>
                        </div>
                        <div style={{ background: '#d4ab63', color: '#2a1a08', padding: '15px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.8, fontFamily: 'Space Mono' }}>Dominant Grip</span>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'IM Fell DW Pica' }}>{data.technique_signature.dominant_grip?.replace('_', ' ') || 'N/A'}</div>
                        </div>
                    </div>
                )}
                {data.type === 'video' && renderTimeline(data)}
                {renderInsightPanel(data)}
            </>
        );
    };


    const renderMediaPreview = (data) => {
        let url = data.fileUrl;
        if (url && !url.startsWith("http")) {
            url = `${BACKEND}${url}`;
        }
        const type = data.type || data.fileType || 'image'; // Fallback added here
        if (!url) return null;

        const containerStyle = {
            marginBottom: '30px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(196,146,42,0.4)',
            background: '#000',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            position: 'relative'
        };

        const headerStyle = {
            position: 'absolute',
            top: '15px',
            left: '15px',
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '4px',
            zIndex: 10,
            fontSize: '11px',
            fontFamily: 'Space Mono',
            color: '#d4ab63',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(212, 171, 99, 0.3)'
        };

        if (type === 'image') return (
            <div style={containerStyle}>
                <div style={headerStyle}>📷 Captured Visual Evidence</div>
                <img
                    src={url} alt="Uploaded"
                    style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block' }}
                />
            </div>
        );

        if (type === 'video') return (
            <div style={containerStyle}>
                <div style={headerStyle}>🎬 Recorded Technique</div>
                <video
                    controls
                    style={{ width: '100%', maxHeight: '500px', display: 'block' }}
                >
                    <source src={url} />
                </video>
            </div>
        );

        if (type === 'audio') return (
            <div style={{ ...containerStyle, background: 'rgba(212,171,99,0.1)', padding: '40px' }}>
                <div style={headerStyle}>🎵 Oral History Recording</div>
                <audio controls style={{ width: '100%' }}>
                    <source src={url} />
                </audio>
            </div>
        );

        if (type === 'document') return (
            <div style={{ ...containerStyle, background: 'rgba(212,171,99,0.1)', padding: '40px' }}>
                <div style={headerStyle}>📄 Cultural Manuscript</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '50px' }}>📜</div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2a1a08', fontFamily: 'IM Fell DW Pica' }}>
                            {url.split('/').pop()}
                        </div>
                        <a
                            href={url} target="_blank" rel="noreferrer"
                            className="btn-secondary"
                            style={{ display: 'inline-block', marginTop: '10px', padding: '8px 16px', fontSize: '14px' }}
                        >
                            Review Original Document ↗
                        </a>
                    </div>
                </div>
            </div>
        );

        return null;
    };

    return (
        <div className="technique-analysis-container" style={{
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            animation: 'fadeIn 0.8s ease-out'
        }}>
            {/* ── PARCHMENT WRAPPER ── */}
            <div className="parchment-container" style={{ animation: 'heroFloat 6s ease-in-out infinite' }}>
                <div className="parchment-body" style={{ padding: '40px 60px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid rgba(140, 100, 20, 0.2)', paddingBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button
                                onClick={() => { setStatus('idle'); setFile(null); setActiveAnalysis(null); setTopicMismatch(false); }}
                                style={{
                                    background: 'rgba(212,171,99,0.1)', border: '1px solid rgba(212,171,99,0.3)', color: '#c4922a',
                                    cursor: 'pointer', fontFamily: 'Space Mono', fontSize: '11px', padding: '6px 14px', borderRadius: '20px',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                ← BACK
                            </button>
                            <h1 style={{ margin: 0, fontSize: '1.8rem', textAlign: 'left' }}>AI Analysis Engine</h1>
                        </div>
                        {history.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontFamily: 'Space Mono', fontSize: '12px', color: '#9b6b2f' }}>ARCHIVES:</span>
                                <select
                                    onChange={(e) => {
                                        const analysis = history[e.target.value];
                                        setActiveAnalysis(analysis);
                                        setTopicMismatch(analysis?.topic_mismatch || false);
                                        setShowDespiteMismatch(false);
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #d4ab63',
                                        background: 'rgba(255,255,255,0.5)',
                                        fontSize: '13px',
                                        fontFamily: 'Cormorant Garamond',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    <option value="">Recent Logs ({history.length})</option>
                                    {history.map((h, i) => (
                                        <option key={i} value={i}>{new Date(h.analyzed_at || Date.now()).toLocaleDateString()} - {String(h.type || h.fileType || 'Analysis').toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* ── Upload Section ── */}
                    {(status === 'idle' || status === 'error') && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed rgba(140, 100, 20, 0.3)', borderRadius: '15px', background: 'rgba(255,255,255,0.2)' }}>
                            <div style={{ fontSize: '60px', marginBottom: '15px', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.1))' }}>🏺</div>
                            <h2 style={{ fontSize: '1.5rem', color: '#2a1a08' }}>Digitize Tacit Knowledge</h2>
                            <p style={{ color: '#5d4037', fontSize: '18px', maxWidth: '600px', margin: '0 auto 25px' }}>
                                Upload ancient techniques to extract strokes, secrets, and cultural signatures.
                            </p>

                            {status === 'error' && (
                                <div style={{
                                    color: '#c62828', background: '#ffebee', padding: '15px',
                                    borderRadius: '8px', marginBottom: '25px', fontSize: '15px',
                                    border: '1px solid #c62828', maxWidth: '500px', margin: '0 auto 25px'
                                }}>
                                    {errorMessage || "Connection interrupted. Please try a smaller file."}
                                </div>
                            )}

                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                    type="file" id="analysis-upload"
                                    accept="video/*,image/*,audio/*,.pdf,.txt"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="analysis-upload" className="btn btn-secondary" style={{ marginBottom: '20px', cursor: 'pointer' }}>
                                    {file ? `📎 ${file.name}` : "📂 Choose Manuscript / Media"}
                                </label>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file}
                                    className="btn btn-primary"
                                    style={{ padding: '16px 45px', fontSize: '18px', transform: file ? 'scale(1.1)' : 'scale(1)' }}
                                >
                                    ✨ INITIATE AI EXTRACTION
                                </button>
                            </div>
                        </div>
                    )}

                    {(status === 'uploading' || status === 'processing') && (
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <div className="analysis-loader" style={{
                                width: '100px', height: '100px', border: '5px solid rgba(212, 171, 99, 0.1)', borderTop: '5px solid #d4ab63',
                                borderRadius: '50%', animation: 'spin 1.5s linear infinite', margin: '0 auto 30px'
                            }} />

                            <h2 style={{ letterSpacing: '3px', color: '#9b6b2f' }}>
                                {status === 'uploading' ? 'TRANSMITTING...' : 'DECODING TACIT DATA...'}
                            </h2>

                            <div style={{ maxWidth: '500px', margin: '30px auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontFamily: 'Space Mono', fontSize: '14px', color: '#9b6b2f' }}>
                                    <span>{progress}% Completed</span>
                                    {status === 'uploading' && <span>{uploadMetrics.speed} MB/s</span>}
                                </div>
                                <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(140, 100, 20, 0.2)' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #d4ab63, #f0e8d8)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#5d4037', fontStyle: 'italic' }}>
                                    {status === 'uploading'
                                        ? `Moving ${uploadMetrics.loaded}MB of ${uploadMetrics.size}MB`
                                        : "Connecting to Multimodal Wisdom Engine... (This may take 15-20 seconds as the AI deciphers technical nuances)"}
                                </div>
                            </div>

                            <p className="hero-eyebrow" style={{ marginTop: '20px', fontSize: '12px' }}>Analyzing strokes, pressure, and cultural motifs</p>
                        </div>
                    )}

                    {/* ── Results Area ── */}
                    {activeAnalysis && (
                        <div style={{ marginTop: '40px', animation: 'fadeInUp 0.6s ease-out' }}>
                            {topicMismatch && !showDespiteMismatch && (
                                <div style={{
                                    background: '#8c1c1c', color: '#fff', padding: '30px',
                                    borderRadius: '15px', marginBottom: '30px', textAlign: 'center',
                                    border: '4px double #d4ab63', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                    animation: 'shake 0.5s ease-in-out'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                                    <h2 style={{ color: '#fff', fontSize: '1.8rem', letterSpacing: '2px', marginBottom: '10px' }}>
                                        THE KNOWLEDGE UPLOADED IS NOT THE KNOWLEDGE SELECTED
                                    </h2>
                                    <p style={{ color: '#ffcdd2', fontSize: '18px', marginBottom: '20px' }}>
                                        Our AI detected a discrepancy between your media and the chosen topic: <strong>{title}</strong>.
                                    </p>
                                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => { setStatus('idle'); setFile(null); setActiveAnalysis(null); setTopicMismatch(false); setShowDespiteMismatch(false); }}
                                            className="btn btn-primary"
                                            style={{ background: '#d4ab63', color: '#1a0f08' }}
                                        >
                                            TRY ANOTHER PATH
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDespiteMismatch(true);
                                                // If viewing anyway, add to history now
                                                if (history.indexOf(activeAnalysis) === -1) {
                                                    setHistory(prev => [...prev, activeAnalysis]);
                                                }
                                            }}
                                            style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            VIEW ANALYSIS ANYWAY
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(!topicMismatch || showDespiteMismatch) && (
                                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                                    {renderMediaPreview(activeAnalysis)}
                                    {renderActiveAnalysis(activeAnalysis)}

                                    <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid rgba(140, 100, 20, 0.1)', paddingTop: '20px' }}>
                                        <button
                                            onClick={() => { setStatus('idle'); setFile(null); setActiveAnalysis(null); setTopicMismatch(false); setShowDespiteMismatch(false); }}
                                            className="btn btn-secondary"
                                            style={{ padding: '12px 30px', background: 'rgba(212,171,99,0.1)', border: '1px solid rgba(212,171,99,0.3)' }}
                                        >
                                            📤 UPLOAD ANOTHER MANUSCRIPT/MEDIA
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default TechniqueAnalysis;

import { useMemo, useRef, useState } from "react";
import PaperCard from "./PaperCard.jsx";

function classifyDomain(title) {
  const t = title.toLowerCase();
  if (/(ikat|weav|warp|weft|bandha|tie[- ]?dye)/.test(t)) return "Weaving";
  if (/(pattachitra|paint|brush|pigment)/.test(t)) return "Painting";
  if (/(d[i|o]okra|dokra|metal|casting|bell[- ]?metal)/.test(t)) return "Metal Craft";
  if (/(stone|carv|konark|khondalite)/.test(t)) return "Stone Carving";
  if (/(millet|farming|agric|crop|leaf|soil)/.test(t)) return "Agriculture";
  return "Craft Technique";
}

function seededScore(seed, min = 55, max = 95) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.round(min + (h % (max - min)));
}

export default function TechniqueAnalysis({ title }) {
  const domain = useMemo(() => classifyDomain(title), [title]);
  const [url, setUrl] = useState("");
  const [showMarks, setShowMarks] = useState(true);
  const [mentorMode, setMentor] = useState(false);
  const [researchMode, setResearch] = useState(false);
  const imgRef = useRef(null);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    const u = URL.createObjectURL(f);
    setUrl(u);
  };
  const useSample = () => {
    const samples = {
      Weaving: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
      Painting: "https://images.unsplash.com/photo-1549893075-4bc09f5cf78b?q=80&w=800&auto=format&fit=crop",
      "Metal Craft": "https://images.unsplash.com/photo-1525958822501-79cf0de2abef?q=80&w=800&auto=format&fit=crop",
      "Stone Carving": "https://images.unsplash.com/photo-1601555890987-06ed6c36f8f7?q=80&w=800&auto=format&fit=crop",
      Agriculture: "https://images.unsplash.com/photo-1500382017468-9049fed3b0d5?q=80&w=800&auto=format&fit=crop",
      "Craft Technique": "https://images.unsplash.com/photo-1514996937319-344454492b37?q=80&w=800&auto=format&fit=crop",
    };
    setUrl(samples[domain]);
  };

  const scores = {
    symmetry: seededScore(title + "sym"),
    consistency: seededScore(title + "con"),
    precision: seededScore(title + "pre"),
    authenticity: seededScore(title + "auth"),
  };
  const domainIndicators = {
    Weaving: ["Thread tension", "Warp–weft alignment", "Dye bleed consistency"],
    Painting: ["Stroke thickness", "Layering order", "Border alignment"],
    "Metal Craft": ["Wax modeling", "Mold accuracy", "Casting texture"],
    "Stone Carving": ["Carving depth", "Geometric alignment", "Motif repetition"],
    Agriculture: ["Leaf health", "Soil moisture", "Growth stage"],
    "Craft Technique": ["Symmetry", "Tool marks", "Natural materials"],
  };
  const explanation = (text) => (mentorMode ? text : researchMode ? text : text);

  return (
    <div className="container">
      <h2>Technique Analysis – {title}</h2>
      <div className="tk-desc">Upload an image or visual reference to analyze technique, structure, and craftsmanship patterns.</div>

      {!url && (
        <div className="upload">
          <div className="upload-box">
            <div className="upload-icon">📷</div>
            <div>Upload Image of the Technique</div>
            <input className="upload-input" type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
          <button className="submit" onClick={useSample}>Use Sample Image</button>
        </div>
      )}

      {url && (
        <>
          <div className="domain-banner">
            <div>Analysis tailored for: {title} — Domain: {domain}</div>
            <div className="mode">
              <label><input type="checkbox" checked={showMarks} onChange={(e) => setShowMarks(e.target.checked)} /> Show AI Markings</label>
              <label><input type="checkbox" checked={mentorMode} onChange={(e) => setMentor(e.target.checked)} /> Explain Like a Mentor</label>
              <label><input type="checkbox" checked={researchMode} onChange={(e) => setResearch(e.target.checked)} /> Research Mode</label>
            </div>
          </div>

          <div className="tech-grid">
            <div className="tech-left">
              <div className="image-wrap">
                <img ref={imgRef} src={url} alt="Technique" />
                {showMarks && (
                  <div className="overlay">
                    <div className="mark m1"></div>
                    <div className="mark m2"></div>
                    <div className="mark m3"></div>
                    <div className="mark m4"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="tech-right">
              <PaperCard variant="default">
                <div className="panel">
                  <div className="panel-title">Structural Integrity</div>
                  <div className="panel-text">{explanation("Alignment and build quality appear consistent with tradition.")}</div>
                  <div className="panel-title">Pattern & Design Logic</div>
                  <div className="panel-text">{explanation("Repetition and motif geometry show disciplined symmetry.")}</div>
                  <div className="panel-title">Material & Texture Observations</div>
                  <div className="panel-text">{explanation("Surface textures reveal method and tool use.")}</div>
                  <div className="panel-title">Skill Level Indicator</div>
                  <div className="panel-text">{explanation("Inference: Intermediate to Master-level depending on consistency and precision.")}</div>
                  <div className="panel-title">Sustainability Indicators</div>
                  <div className="panel-text">{explanation("Signs of natural materials and eco-processes where observable.")}</div>
                </div>
              </PaperCard>
              <div className="metrics">
                <div className="metric"><span>Symmetry Score</span><div className="bar"><div style={{width: `${scores.symmetry}%`}}></div></div></div>
                <div className="metric"><span>Pattern Consistency</span><div className="bar"><div style={{width: `${scores.consistency}%`}}></div></div></div>
                <div className="metric"><span>Craft Precision</span><div className="bar"><div style={{width: `${scores.precision}%`}}></div></div></div>
                <div className="metric"><span>Cultural Authenticity</span><div className="bar"><div style={{width: `${scores.authenticity}%`}}></div></div></div>
              </div>
              <div className="domain-indicators">
                {domainIndicators[domain].map((d) => (
                  <div key={d} className="indicator">{d}</div>
                ))}
              </div>
              <div className="kg container">
                <button className="submit">Connect Findings to Knowledge Graph</button>
                <div className="kg-preview">
                  {domain === "Weaving" && "Ikat Pattern → Tie-Dye Technique → Natural Indigo → Sustainable Dye Practice"}
                  {domain === "Painting" && "Pattachitra Motif → Pigment Layering → Palm-Leaf Medium → Ritual Iconography"}
                  {domain === "Metal Craft" && "Wax Modeling → Mold Casting → Brass/Bell Metal → Reusable Furnace Practice"}
                  {domain === "Stone Carving" && "Motif Geometry → Depth Carving → Khondalite → Temple Iconography"}
                  {domain === "Agriculture" && "Leaf Health → Soil Texture → Millets → Seasonal Cycle Sustainability"}
                  {domain === "Craft Technique" && "Pattern Symmetry → Tool Marks → Natural Materials → Community Production"}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

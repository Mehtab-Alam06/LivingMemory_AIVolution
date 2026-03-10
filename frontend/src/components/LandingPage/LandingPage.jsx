import React, { useState, useEffect } from "react";

export default function LandingPage({ onEnter }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const FEATURES = [
    { icon: "📜", title: "Knowledge Archive", desc: "Explore a richly curated collection of traditional wisdom — agriculture, medicine, craftsmanship, festivals, and more — all from the heartlands of Odisha." },
    { icon: "🤖", title: "AI-Powered Chat", desc: "Engage with AI agents trained on real traditional knowledge. Ask questions, explore remedies, learn ancient techniques — all conversationally." },
    { icon: "🌿", title: "Community Forum", desc: "Connect with fellow knowledge holders, elders, students, and researchers. Share stories, discuss traditions, and keep the conversation alive." },
    { icon: "✍️", title: "Contribute Knowledge", desc: "Submit your own traditional or experiential knowledge. Our research team verifies and adds it to the living archive for future generations." },
    { icon: "🔬", title: "Research & Verification", desc: "Every submission is reviewed by a team of researchers before being added. We ensure accuracy, cultural respect, and proper attribution." },
    { icon: "🌍", title: "Open & Accessible", desc: "Living Memory is free and open to all. We believe traditional knowledge belongs to everyone and must be preserved for the world." },
  ];

  const STATS = [
    { num: "150+", label: "Knowledge Entries" },
    { num: "6", label: "Domain Categories" },
    { num: "50+", label: "Contributors" },
    { num: "∞", label: "Generations Preserved" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, #3d1f08 0%, #1c0d04 50%, #0a0401 100%)", overflow: "hidden" }}>
      <style>{`
        @keyframes lpFade { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }
        @keyframes lpGlow { 0%,100%{text-shadow:0 0 30px rgba(212,171,99,.2),0 0 60px rgba(212,171,99,.1)} 50%{text-shadow:0 0 50px rgba(212,171,99,.4),0 0 100px rgba(212,171,99,.2)} }
        @keyframes lpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lpPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes lpLine { from{width:0} to{width:80px} }
        .lp-btn:hover { background:linear-gradient(135deg,#c4922a,#9b6b2f)!important; box-shadow:0 8px 32px rgba(155,107,47,.5)!important; transform:translateY(-2px)!important; }
        .lp-btn-sec:hover { background:rgba(212,171,99,.15)!important; color:#d4ab63!important; }
        .lp-fcard { transition: all .3s cubic-bezier(.4,0,.2,1); }
        .lp-fcard:hover { transform:translateY(-6px) scale(1.02); box-shadow:0 16px 48px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.5)!important; border-color:rgba(155,107,47,.5)!important; }
        .lp-stat:hover { transform:translateY(-3px); border-color:rgba(212,171,99,.4)!important; }
        @media(max-width:768px) { .lp-fgrid { grid-template-columns:1fr!important; } .lp-sgrid { grid-template-columns:1fr 1fr!important; } .lp-hero-title { font-size:38px!important; } .lp-hero-sub { font-size:16px!important; } }
        @media(max-width:480px) { .lp-hero-title { font-size:30px!important; } .lp-sgrid { grid-template-columns:1fr 1fr!important; } }
      `}</style>

      {/* ═══ HEADER / NAV ═══ */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px", borderBottom: "1px solid rgba(212,171,99,.1)",
        background: "rgba(10,4,1,.6)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📜</span>
          <span style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 22, color: "#f0e8d8" }}>
            Living <em style={{ color: "#d4ab63", fontStyle: "normal" }}>Memory</em>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="lp-btn-sec" onClick={onEnter} style={{
            background: "rgba(212,171,99,.08)", border: "1px solid rgba(212,171,99,.25)",
            borderRadius: 4, padding: "8px 20px", color: "rgba(212,171,99,.7)",
            fontFamily: "IM Fell DW Pica,serif", fontSize: 15, cursor: "pointer", transition: "all .2s"
          }}>Sign In</button>
          <button className="lp-btn" onClick={onEnter} style={{
            background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none",
            borderRadius: 4, padding: "8px 22px", color: "#f5edd8",
            fontFamily: "IM Fell DW Pica,serif", fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(155,107,47,.3)", transition: "all .2s"
          }}>Get Started →</button>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section style={{
        textAlign: "center", padding: "100px 24px 80px",
        opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(30px)",
        transition: "all .8s cubic-bezier(.4,0,.2,1)"
      }}>
        <div style={{ fontSize: 56, marginBottom: 20, animation: "lpFloat 4s ease-in-out infinite" }}>📜</div>
        <h1 className="lp-hero-title" style={{
          fontFamily: "IM Fell DW Pica,serif", fontSize: 52, color: "#f0e8d8",
          fontWeight: "normal", lineHeight: 1.15, marginBottom: 10,
          animation: "lpGlow 4s ease-in-out infinite"
        }}>
          Living <em style={{ color: "#d4ab63", fontStyle: "normal" }}>Memory</em>
        </h1>
        <div style={{ fontFamily: "Space Mono,monospace", fontSize: 10, letterSpacing: ".25em", color: "rgba(212,171,99,.4)", textTransform: "uppercase", marginBottom: 20 }}>
          An AI Knowledge Preservation System
        </div>

        {/* Ornamental line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24, color: "rgba(155,107,47,.35)", fontSize: 12, letterSpacing: 6 }}>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,transparent,rgba(155,107,47,.3))" }} />
          ✦ ❧ ✦
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,rgba(155,107,47,.3),transparent)" }} />
        </div>

        <p className="lp-hero-sub" style={{
          fontFamily: "Cormorant Garamond,serif", fontSize: 20, color: "rgba(237,224,190,.55)",
          lineHeight: 1.7, maxWidth: 600, margin: "0 auto 36px", fontStyle: "italic"
        }}>
          Before the last elder forgets, before the last remedy fades, before the last story is silenced
          — we preserve the living wisdom of Odisha for generations to come.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn" onClick={onEnter} style={{
            background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none",
            borderRadius: 4, padding: "15px 36px", color: "#f5edd8",
            fontFamily: "IM Fell DW Pica,serif", fontSize: 20, cursor: "pointer",
            boxShadow: "0 6px 24px rgba(155,107,47,.35)", transition: "all .25s"
          }}>Enter the Archive →</button>
          <button className="lp-btn-sec" onClick={() => document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' })} style={{
            background: "rgba(212,171,99,.06)", border: "1px solid rgba(212,171,99,.2)",
            borderRadius: 4, padding: "15px 30px", color: "rgba(212,171,99,.65)",
            fontFamily: "IM Fell DW Pica,serif", fontSize: 18, cursor: "pointer", transition: "all .2s"
          }}>Explore Features ↓</button>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ padding: "0 24px 60px" }}>
        <div className="lp-sgrid" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          maxWidth: 700, margin: "0 auto"
        }}>
          {STATS.map((s, i) => (
            <div key={i} className="lp-stat" style={{
              textAlign: "center", padding: "20px 12px",
              background: "rgba(212,171,99,.04)", border: "1px solid rgba(212,171,99,.12)",
              borderRadius: 6, transition: "all .25s", cursor: "default"
            }}>
              <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 32, color: "#d4ab63", lineHeight: 1, marginBottom: 6 }}>{s.num}</div>
              <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".1em", color: "rgba(212,171,99,.4)", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="lp-features" style={{ padding: "40px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "Space Mono,monospace", fontSize: 10, letterSpacing: ".2em", color: "rgba(212,171,99,.35)", textTransform: "uppercase", marginBottom: 10 }}>What We Offer</div>
          <h2 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 32, color: "#f0e8d8", fontWeight: "normal", marginBottom: 8 }}>
            Features of <em style={{ color: "#d4ab63", fontStyle: "normal" }}>Living Memory</em>
          </h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "rgba(155,107,47,.3)", fontSize: 11, letterSpacing: 5 }}>
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg,transparent,rgba(155,107,47,.25))" }} />
            ❧
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg,rgba(155,107,47,.25),transparent)" }} />
          </div>
        </div>

        <div className="lp-fgrid" style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
          maxWidth: 900, margin: "0 auto"
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-fcard" style={{
              background: "linear-gradient(170deg, #f5edd8 0%, #ede0be 50%, #e4d4a8 100%)",
              border: "1px solid rgba(155,107,47,.28)", borderRadius: 6,
              boxShadow: "0 8px 32px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.4)",
              padding: "28px 22px", cursor: "default",
              animation: `lpFade .5s ease ${i * 0.1}s both`
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 18, color: "#3a2010", fontWeight: "normal", margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 15, color: "rgba(92,51,23,.6)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ABOUT / MISSION ═══ */}
      <section style={{ padding: "40px 24px 80px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(170deg, #f5edd8 0%, #ede0be 50%, #e4d4a8 100%)",
            border: "1px solid rgba(155,107,47,.3)", borderRadius: 6,
            boxShadow: "0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.45)",
            overflow: "hidden"
          }}>
            <div style={{ textAlign: "center", padding: "20px 0 0", color: "rgba(155,107,47,.42)", fontSize: 13, letterSpacing: 7 }}>✦ ❧ ✦</div>
            <div style={{ padding: "24px 40px 32px" }}>
              <h2 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 26, color: "#3a2010", fontWeight: "normal", textAlign: "center", margin: "0 0 16px" }}>Our Mission</h2>
              <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, color: "rgba(92,51,23,.65)", lineHeight: 1.8, textAlign: "center", margin: "0 0 20px", fontStyle: "italic" }}>
                In the villages of Odisha, elderly knowledge holders carry centuries of wisdom about agriculture, traditional medicine, crafts, and ecology. This knowledge, passed down through oral traditions, is rapidly disappearing as younger generations move to cities.
              </p>
              <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, color: "rgba(92,51,23,.65)", lineHeight: 1.8, textAlign: "center", margin: "0 0 20px" }}>
                <strong style={{ color: "#5a2e0a" }}>Living Memory</strong> is an AI-powered system that digitizes, preserves, and makes accessible this invaluable traditional knowledge — so that future generations can learn from the wisdom of their ancestors.
              </p>
              <div style={{ textAlign: "center" }}>
                <button className="lp-btn" onClick={onEnter} style={{
                  background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none",
                  borderRadius: 4, padding: "13px 32px", color: "#f5edd8",
                  fontFamily: "IM Fell DW Pica,serif", fontSize: 18, cursor: "pointer",
                  boxShadow: "0 4px 18px rgba(155,107,47,.3)", transition: "all .25s"
                }}>Join the Preservation →</button>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "0 0 18px", color: "rgba(155,107,47,.35)", fontSize: 13, letterSpacing: 7 }}>✦ ❧ ✦</div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        borderTop: "1px solid rgba(212,171,99,.1)", padding: "40px 24px 32px",
        background: "rgba(10,4,1,.4)"
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 24, color: "#f0e8d8", marginBottom: 6 }}>
            Living <em style={{ color: "#d4ab63", fontStyle: "normal" }}>Memory</em>
          </div>
          <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".2em", color: "rgba(212,171,99,.3)", textTransform: "uppercase", marginBottom: 20 }}>
            Preserving the Wisdom of Odisha
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { icon: "📧", text: "livingmemory104@gmail.com" },
              { icon: "📍", text: "GIFT, Bhubaneswar, Odisha" },
              { icon: "🌐", text: "Living Memory Project" },
            ].map((c, i) => (
              <div key={i} style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 15, color: "rgba(212,171,99,.5)" }}>
                {c.icon} {c.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, color: "rgba(155,107,47,.2)", fontSize: 11, letterSpacing: 5 }}>
            <div style={{ width: 30, height: 1, background: "linear-gradient(90deg,transparent,rgba(155,107,47,.2))" }} />
            ✦ ❧ ✦
            <div style={{ width: 30, height: 1, background: "linear-gradient(90deg,rgba(155,107,47,.2),transparent)" }} />
          </div>

          <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".1em", color: "rgba(212,171,99,.15)", textTransform: "uppercase" }}>
            © {new Date().getFullYear()} Living Memory · An AI Knowledge Preservation System · Odisha, India
          </div>
        </div>
      </footer>
    </div>
  );
}

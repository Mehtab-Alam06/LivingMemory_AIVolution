import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function AuthPage() {
  const { sendOtp, register, verifyOtp } = useAuth();
  const [mode, setMode]           = useState('login');
  const [step, setStep]           = useState('form');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState(['','','','','','']);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const nameRef   = useRef();
  const emailRef  = useRef();

  useEffect(() => {
    setTimeout(() => {
      if (mode === 'register') nameRef.current?.focus();
      else emailRef.current?.focus();
    }, 150);
  }, [mode]);

  useEffect(() => {
    if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 150);
  }, [step]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const resetOtp = () => setOtp(['','','','','','']);

  // ── VALIDATION ──
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validateName  = (n) => n.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(n.trim());

  const validate = () => {
    if (mode === 'register') {
      if (!name.trim()) { setError('Please enter your name'); return false; }
      if (!validateName(name)) { setError('Name must be at least 2 letters (only letters and spaces)'); return false; }
    }
    if (!email.trim()) { setError('Please enter your email address'); return false; }
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return false; }
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true); setError('');
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'login') {
        // CHECK if account exists first
        const { data } = await axios.post(`${API}/auth/check-email`, { email: cleanEmail });
        if (!data.exists) {
          setError('No account found with this email. Please register first.');
          setLoading(false); return;
        }
      }

      if (mode === 'register') {
        // CHECK if account already exists
        const { data } = await axios.post(`${API}/auth/check-email`, { email: cleanEmail });
        if (data.exists) {
          setError('An account already exists with this email. Please sign in instead.');
          setLoading(false); return;
        }
      }

      await sendOtp(cleanEmail);
      setStep('otp'); setCountdown(60);
      setSuccess('Code sent! Check your inbox.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send code. Try again.');
    }
    setLoading(false);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) inputRefs.current[i+1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i-1]?.focus();
    if (e.key === 'Enter' && otp.join('').length === 6) handleVerify();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (p.length === 6) { setOtp(p.split('')); inputRefs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the complete 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'register') await register(email.trim().toLowerCase(), code, name.trim());
      else await verifyOtp(email.trim().toLowerCase(), code);
      // success → AuthContext sets user → App unmounts this page
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid code. Try again.');
      resetOtp();
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await sendOtp(email.trim().toLowerCase());
      setCountdown(60); resetOtp();
      setSuccess('New code sent!');
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch { setError('Failed to resend.'); }
    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m); setStep('form'); setError('');
    setSuccess(''); resetOtp(); setName(''); setEmail('');
  };

  const sharedInpStyle = {
    width:'100%', padding:'12px 15px', boxSizing:'border-box',
    background:'rgba(255,255,255,.55)', border:'1px solid rgba(155,107,47,.28)',
    borderRadius:4, color:'#2a1508', fontFamily:'Cormorant Garamond,serif',
    fontSize:18, outline:'none', marginBottom:14, transition:'border-color .2s, box-shadow .2s'
  };

  const errBox = { background:'rgba(208,94,82,.08)', border:'1px solid rgba(208,94,82,.3)', borderRadius:4, padding:'9px 13px', fontFamily:'Cormorant Garamond,serif', fontSize:15, color:'#b03020', marginBottom:14, textAlign:'center', fontStyle:'italic' };
  const sucBox = { background:'rgba(109,184,109,.1)', border:'1px solid rgba(109,184,109,.3)', borderRadius:4, padding:'9px 13px', fontFamily:'Cormorant Garamond,serif', fontSize:15, color:'#2a6e30', marginBottom:14, textAlign:'center', fontStyle:'italic' };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse at 50% 0%, #3d1f08 0%, #1c0d04 50%, #0a0401 100%)',
      padding:20
    }}>
      <style>{`
        @keyframes apFade { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes apSpin { to{transform:rotate(360deg)} }
        .ap-inp:focus  { border-color:rgba(155,107,47,.65)!important; box-shadow:0 0 0 3px rgba(155,107,47,.1)!important; }
        .ap-otp:focus  { border-color:rgba(155,107,47,.7)!important; box-shadow:0 0 0 3px rgba(155,107,47,.12)!important; background:rgba(155,107,47,.07)!important; }
        .ap-btn:hover:not(:disabled) { background:linear-gradient(135deg,#c4922a,#9b6b2f)!important; box-shadow:0 6px 24px rgba(155,107,47,.4)!important; transform:translateY(-1px); }
        .ap-link:hover { color:#7b4c1a!important; text-decoration:underline; }
        .ap-back:hover { color:rgba(92,51,23,.7)!important; }
        .ap-spin { display:inline-block;width:13px;height:13px;border:2px solid rgba(58,32,16,.18);border-top-color:#3a2010;border-radius:50%;animation:apSpin .65s linear infinite;vertical-align:middle;margin-right:7px }
      `}</style>

      <div style={{width:'100%', maxWidth:480, animation:'apFade .4s ease'}}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:30}}>
          <div style={{fontFamily:'IM Fell DW Pica,serif', fontSize:40, color:'#f0e8d8', lineHeight:1.1, marginBottom:5,
            textShadow:'0 0 40px rgba(212,171,99,.25)'}}>
            Living <em style={{color:'#d4ab63', fontStyle:'normal'}}>Memory</em>
          </div>
          <div style={{fontFamily:'Space Mono,monospace', fontSize:10, letterSpacing:'.2em', color:'rgba(212,171,99,.4)', textTransform:'uppercase'}}>
            Preserving Traditional Knowledge
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'linear-gradient(170deg, #f5edd8 0%, #ede0be 45%, #e4d4a8 100%)',
          border:'1px solid rgba(155,107,47,.32)',
          borderRadius:6,
          boxShadow:'0 0 0 1px rgba(155,107,47,.08), 0 40px 100px rgba(0,0,0,.88), inset 0 1px 0 rgba(255,255,255,.45)',
          overflow:'hidden'
        }}>

          {/* Top ornament */}
          <div style={{textAlign:'center', padding:'18px 0 0', color:'rgba(155,107,47,.42)', fontSize:13, letterSpacing:7}}>
            ✦ ❧ ✦
          </div>

          {/* Mode tabs */}
          <div style={{display:'flex', justifyContent:'center', margin:'16px 36px 0', borderBottom:'1px solid rgba(155,107,47,.2)'}}>
            {[{id:'login',label:'Sign In'},{id:'register',label:'Register'}].map(t => (
              <button key={t.id} onClick={() => switchMode(t.id)}
                style={{
                  flex:1, background:'none', border:'none', padding:'11px 8px',
                  fontFamily:'IM Fell DW Pica,serif', fontSize:17,
                  color: mode===t.id ? '#5a2e0a' : 'rgba(155,107,47,.42)',
                  borderBottom: mode===t.id ? '2px solid #9b6b2f' : '2px solid transparent',
                  cursor:'pointer', transition:'all .2s', marginBottom:-1,
                  textShadow: mode===t.id ? '0 0 20px rgba(155,107,47,.4)' : 'none'
                }}>
                {t.id === 'login' ? '— Sign In —' : '— Register —'}
              </button>
            ))}
          </div>

          <div style={{padding:'24px 38px 32px'}}>

            {/* ── FORM STEP ── */}
            {step === 'form' && (<>
              {error   && <div style={errBox}>{error}</div>}
              {success && <div style={sucBox}>{success}</div>}

              {mode === 'register' && (<>
                <label style={{display:'block', fontFamily:'Space Mono,monospace', fontSize:10, letterSpacing:'.14em', color:'rgba(92,51,23,.58)', textTransform:'uppercase', marginBottom:7}}>
                  Your Name
                </label>
                <input ref={nameRef} className="ap-inp" type="text"
                  placeholder="e.g. Arjun Das"
                  value={name} onChange={e => { setName(e.target.value); setError(''); }}
                  onKeyDown={e => e.key==='Enter' && emailRef.current?.focus()}
                  style={sharedInpStyle}
                />
                {name && !validateName(name) && (
                  <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(180,60,40,.7)',marginTop:-10,marginBottom:10,letterSpacing:'.06em'}}>
                    ⚠ Letters and spaces only, min 2 characters
                  </div>
                )}
              </>)}

              <label style={{display:'block', fontFamily:'Space Mono,monospace', fontSize:10, letterSpacing:'.14em', color:'rgba(92,51,23,.58)', textTransform:'uppercase', marginBottom:7}}>
                Email Address
              </label>
              <input ref={emailRef} className="ap-inp" type="email"
                placeholder="you@example.com"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key==='Enter' && handleSend()}
                style={sharedInpStyle}
              />
              {email && !validateEmail(email) && (
                <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(180,60,40,.7)',marginTop:-10,marginBottom:10,letterSpacing:'.06em'}}>
                  ⚠ Enter a valid email address
                </div>
              )}

              <button className="ap-btn" onClick={handleSend} disabled={loading}
                style={{
                  width:'100%', padding:'14px', marginTop:4,
                  background: loading ? 'rgba(155,107,47,.3)' : 'linear-gradient(135deg,#9b6b2f,#7b4c1a)',
                  border:'none', borderRadius:4, color:'#f5edd8',
                  fontFamily:'IM Fell DW Pica,serif', fontSize:19,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition:'all .2s',
                  boxShadow: loading ? 'none' : '0 4px 18px rgba(155,107,47,.3)',
                  marginBottom:18
                }}>
                {loading
                  ? <><span className="ap-spin"/>Checking...</>
                  : mode==='register' ? 'Create Account →' : 'Enter the Archive →'
                }
              </button>

              <div style={{textAlign:'center', fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'rgba(92,51,23,.5)'}}>
                {mode==='login'
                  ? <>New to Living Memory?{' '}
                      <button className="ap-link" onClick={() => switchMode('register')}
                        style={{background:'none',border:'none',color:'#9b6b2f',cursor:'pointer',fontFamily:'Cormorant Garamond,serif',fontSize:16,padding:0,transition:'color .2s'}}>
                        Create an Account
                      </button>
                    </>
                  : <>Already registered?{' '}
                      <button className="ap-link" onClick={() => switchMode('login')}
                        style={{background:'none',border:'none',color:'#9b6b2f',cursor:'pointer',fontFamily:'Cormorant Garamond,serif',fontSize:16,padding:0,transition:'color .2s'}}>
                        Sign In
                      </button>
                    </>
                }
              </div>
            </>)}

            {/* ── OTP STEP ── */}
            {step === 'otp' && (<>
              <button className="ap-back" onClick={() => {setStep('form');setError('');resetOtp();}}
                style={{background:'none',border:'none',color:'rgba(92,51,23,.35)',cursor:'pointer',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',padding:0,marginBottom:20,display:'flex',alignItems:'center',gap:5,transition:'color .2s'}}>
                ← Back
              </button>

              <div style={{textAlign:'center', marginBottom:20}}>
                <div style={{fontSize:34, marginBottom:8}}>🔐</div>
                <h3 style={{fontFamily:'IM Fell DW Pica,serif', fontSize:23, color:'#3a2010', margin:'0 0 6px', fontWeight:'normal'}}>
                  Verify Your Identity
                </h3>
                <p style={{fontFamily:'Cormorant Garamond,serif', fontSize:15, color:'rgba(92,51,23,.58)', margin:'0 0 10px', fontStyle:'italic'}}>
                  Code sent to
                </p>
                <span style={{display:'inline-block', background:'rgba(155,107,47,.1)', border:'1px solid rgba(155,107,47,.22)', borderRadius:20, padding:'4px 16px', fontFamily:'Space Mono,monospace', fontSize:12, color:'#7b4c1a'}}>
                  {email}
                </span>
              </div>

              {error   && <div style={errBox}>{error}</div>}
              {success && <div style={sucBox}>{success}</div>}

              <label style={{display:'block',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.14em',color:'rgba(92,51,23,.55)',textTransform:'uppercase',marginBottom:11,textAlign:'center'}}>
                One-Time Passcode
              </label>

              <div style={{display:'flex', gap:9, justifyContent:'center', marginBottom:22}} onPaste={handlePaste}>
                {otp.map((d,i) => (
                  <input key={i} ref={el => inputRefs.current[i]=el} className="ap-otp"
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{
                      width:52, height:62,
                      background: d ? 'rgba(155,107,47,.1)' : 'rgba(255,255,255,.65)',
                      border: `1.5px solid ${d ? 'rgba(155,107,47,.5)' : 'rgba(155,107,47,.22)'}`,
                      borderRadius:4, color:'#7b4c1a',
                      fontFamily:'IM Fell DW Pica,serif', fontSize:30,
                      textAlign:'center', outline:'none', cursor:'text', transition:'all .15s'
                    }}
                  />
                ))}
              </div>

              <button className="ap-btn" onClick={handleVerify} disabled={loading||otp.join('').length!==6}
                style={{
                  width:'100%', padding:'14px',
                  background: (loading||otp.join('').length!==6) ? 'rgba(155,107,47,.28)' : 'linear-gradient(135deg,#9b6b2f,#7b4c1a)',
                  border:'none', borderRadius:4, color:'#f5edd8',
                  fontFamily:'IM Fell DW Pica,serif', fontSize:19,
                  cursor: (loading||otp.join('').length!==6) ? 'not-allowed' : 'pointer',
                  transition:'all .2s',
                  boxShadow: (loading||otp.join('').length!==6) ? 'none' : '0 4px 18px rgba(155,107,47,.3)',
                  marginBottom:16
                }}>
                {loading
                  ? <><span className="ap-spin"/>Verifying...</>
                  : mode==='register' ? 'Complete Registration →' : 'Unlock the Archive →'
                }
              </button>

              <div style={{textAlign:'center', fontFamily:'Cormorant Garamond,serif', fontSize:15, color:'rgba(92,51,23,.48)'}}>
                {countdown > 0
                  ? <>Resend in <strong style={{color:'#9b6b2f'}}>{countdown}s</strong></>
                  : <>Didn't receive it?{' '}
                      <button onClick={handleResend} disabled={loading}
                        style={{background:'none',border:'none',color:'#9b6b2f',cursor:'pointer',fontFamily:'Cormorant Garamond,serif',fontSize:15,textDecoration:'underline',padding:0}}>
                        Resend
                      </button>
                    </>
                }
              </div>

              <div style={{borderTop:'1px solid rgba(155,107,47,.14)',marginTop:20,paddingTop:13,fontFamily:'Space Mono,monospace',fontSize:9,letterSpacing:'.11em',color:'rgba(92,51,23,.26)',textAlign:'center',textTransform:'uppercase'}}>
                Code expires in 5 minutes · Living Memory Project
              </div>
            </>)}

          </div>

          {/* Bottom ornament */}
          <div style={{textAlign:'center', padding:'0 0 16px', color:'rgba(155,107,47,.35)', fontSize:13, letterSpacing:7}}>
            ✦ ❧ ✦
          </div>
        </div>

        <p style={{textAlign:'center', marginTop:18, fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.14em', color:'rgba(212,171,99,.16)', textTransform:'uppercase'}}>
          An AI Knowledge Preservation System — Odisha, India
        </p>
      </div>
    </div>
  );
}
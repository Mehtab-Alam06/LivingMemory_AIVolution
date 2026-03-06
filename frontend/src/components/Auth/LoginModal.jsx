import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginModal({ onClose }) {
  const { sendOtp, verifyOtp } = useAuth();
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState(['','','','','','']);
  const [step, setStep]       = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const emailRef  = useRef();

  useEffect(() => { setTimeout(() => emailRef.current?.focus(), 120); }, []);
  useEffect(() => { if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 120); }, [step]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      await sendOtp(email.trim().toLowerCase());
      setStep('otp'); setCountdown(60);
      setSuccess('OTP sent! Check your inbox.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.error || 'Failed to send OTP. Try again.'); }
    setLoading(false);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === 'Enter' && otp.join('').length === 6) handleVerify();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (p.length === 6) { setOtp(p.split('')); inputRefs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      await verifyOtp(email.trim().toLowerCase(), code);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid OTP. Try again.');
      setOtp(['','','','','','']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await sendOtp(email.trim().toLowerCase());
      setCountdown(60); setOtp(['','','','','','']);
      setSuccess('New code sent!'); setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch { setError('Failed to resend.'); }
    setLoading(false);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(8,3,1,0.92)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',animation:'lmFade .2s ease'}}
    >
      <style>{`
        @keyframes lmFade { from{opacity:0} to{opacity:1} }
        @keyframes lmUp   { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes lmSpin { to{transform:rotate(360deg)} }
        @keyframes lmPulse{ 0%,100%{opacity:1} 50%{opacity:.4} }
        .lm-inp:focus  { border-color:rgba(212,171,99,.5) !important; box-shadow:0 0 0 3px rgba(212,171,99,.07) !important; }
        .lm-otp:focus  { border-color:rgba(212,171,99,.6) !important; box-shadow:0 0 0 3px rgba(212,171,99,.1) !important; }
        .lm-btn:hover:not(:disabled) { background:linear-gradient(135deg,#d4ab63,#c4922a) !important; transform:translateY(-1px); box-shadow:0 6px 22px rgba(196,146,42,.35) !important; }
        .lm-close:hover { color:#d4ab63 !important; }
        .lm-back:hover  { color:rgba(212,171,99,.8) !important; }
        .lm-resend:hover{ color:#d4ab63 !important; }
        .lm-spin { display:inline-block;width:13px;height:13px;border:2px solid rgba(240,232,216,.2);border-top-color:#f0e8d8;border-radius:50%;animation:lmSpin .65s linear infinite;vertical-align:middle;margin-right:7px }
      `}</style>

      <div style={{position:'relative',width:'100%',maxWidth:430,margin:16,background:'linear-gradient(170deg,#2d1709 0%,#1c0d04 55%,#0a0401 100%)',border:'1px solid rgba(212,171,99,.22)',borderRadius:6,boxShadow:'0 0 0 1px rgba(212,171,99,.05), 0 50px 120px rgba(0,0,0,.95), inset 0 1px 0 rgba(212,171,99,.08)',overflow:'hidden',animation:'lmUp .32s cubic-bezier(.16,1,.3,1)'}}>

        {/* Top bar */}
        <div style={{background:'linear-gradient(90deg,rgba(212,171,99,.14),rgba(212,171,99,.04),rgba(212,171,99,.14))',borderBottom:'1px solid rgba(212,171,99,.13)',padding:'9px 22px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.18em',color:'rgba(212,171,99,.5)',textTransform:'uppercase'}}>🌿 Living Memory · Secure Access</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#6db86d',boxShadow:'0 0 7px #6db86d',animation:'lmPulse 2.4s ease infinite'}}/>
            <span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(109,184,109,.55)',letterSpacing:'.1em',textTransform:'uppercase'}}>secure</span>
          </div>
        </div>

        {/* Close */}
        <button className="lm-close" onClick={onClose} style={{position:'absolute',top:8,right:13,background:'none',border:'none',color:'rgba(212,171,99,.28)',fontSize:17,cursor:'pointer',lineHeight:1,transition:'color .2s',zIndex:2}}>✕</button>

        <div style={{padding:'32px 34px 38px'}}>

          {/* EMAIL STEP */}
          {step === 'email' && (<>
            <div style={{textAlign:'center',marginBottom:22}}>
              <div style={{fontSize:38,marginBottom:6,lineHeight:1}}>📜</div>
              <h2 style={{fontFamily:'IM Fell DW Pica,serif',fontSize:27,color:'#f0e8d8',margin:'0 0 5px',fontWeight:'normal'}}>Enter the Archive</h2>
              <p style={{fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'rgba(212,171,99,.6)',margin:0,fontStyle:'italic'}}>Sign in to preserve and learn ancestral wisdom</p>
            </div>
            <div style={{borderTop:'1px solid rgba(212,171,99,.1)',margin:'0 0 20px'}}/>
            {error   && <div style={{background:'rgba(208,94,82,.1)',border:'1px solid rgba(208,94,82,.28)',borderRadius:3,padding:'9px 13px',fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'#e07060',marginBottom:14,textAlign:'center'}}>{error}</div>}
            {success && <div style={{background:'rgba(109,184,109,.1)',border:'1px solid rgba(109,184,109,.28)',borderRadius:3,padding:'9px 13px',fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'#6db86d',marginBottom:14,textAlign:'center'}}>{success}</div>}
            <label style={{display:'block',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.16em',color:'rgba(212,171,99,.5)',textTransform:'uppercase',marginBottom:8}}>Your Email Address</label>
            <input ref={emailRef} className="lm-inp" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendOtp()}
              style={{width:'100%',padding:'13px 15px',boxSizing:'border-box',background:'rgba(0,0,0,.5)',border:'1px solid rgba(212,171,99,.18)',borderRadius:3,color:'#f0e8d8',fontFamily:'Cormorant Garamond,serif',fontSize:17,outline:'none',marginBottom:18,transition:'border-color .2s'}}
            />
            <button className="lm-btn" onClick={handleSendOtp} disabled={loading}
              style={{width:'100%',padding:'13px',background:loading?'rgba(196,146,42,.25)':'linear-gradient(135deg,#c4922a,#9b6b2f)',border:'none',borderRadius:3,color:'#f0e8d8',fontFamily:'IM Fell DW Pica,serif',fontSize:17,cursor:loading?'not-allowed':'pointer',transition:'all .2s',boxShadow:loading?'none':'0 4px 18px rgba(196,146,42,.22)'}}>
              {loading ? <><span className="lm-spin"/>Sending scroll...</> : 'Send Verification Scroll →'}
            </button>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:9,letterSpacing:'.11em',color:'rgba(212,171,99,.2)',textAlign:'center',marginTop:14,textTransform:'uppercase'}}>A 6-digit code will be sent to your inbox</p>
          </>)}

          {/* OTP STEP */}
          {step === 'otp' && (<>
            <button className="lm-back" onClick={() => {setStep('email');setError('');setOtp(['','','','','','']);}}
              style={{background:'none',border:'none',color:'rgba(212,171,99,.35)',cursor:'pointer',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',padding:0,marginBottom:18,display:'flex',alignItems:'center',gap:5,transition:'color .2s'}}>
              ← Back
            </button>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:38,marginBottom:6,lineHeight:1}}>🔐</div>
              <h2 style={{fontFamily:'IM Fell DW Pica,serif',fontSize:27,color:'#f0e8d8',margin:'0 0 5px',fontWeight:'normal'}}>Verify Your Identity</h2>
              <p style={{fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'rgba(212,171,99,.6)',margin:'0 0 8px',fontStyle:'italic'}}>OTP sent to</p>
              <span style={{display:'inline-block',background:'rgba(212,171,99,.08)',border:'1px solid rgba(212,171,99,.18)',borderRadius:20,padding:'4px 16px',fontFamily:'Space Mono,monospace',fontSize:12,color:'#d4ab63'}}>{email}</span>
            </div>
            <div style={{borderTop:'1px solid rgba(212,171,99,.1)',margin:'0 0 18px'}}/>
            {error   && <div style={{background:'rgba(208,94,82,.1)',border:'1px solid rgba(208,94,82,.28)',borderRadius:3,padding:'9px 13px',fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'#e07060',marginBottom:14,textAlign:'center'}}>{error}</div>}
            {success && <div style={{background:'rgba(109,184,109,.1)',border:'1px solid rgba(109,184,109,.28)',borderRadius:3,padding:'9px 13px',fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'#6db86d',marginBottom:14,textAlign:'center'}}>{success}</div>}
            <label style={{display:'block',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.16em',color:'rgba(212,171,99,.5)',textTransform:'uppercase',marginBottom:10}}>One-Time Passcode</label>
            <div style={{display:'flex',gap:9,justifyContent:'center',marginBottom:22}} onPaste={handlePaste}>
              {otp.map((d,i) => (
                <input key={i} ref={el => inputRefs.current[i]=el} className="lm-otp"
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpChange(i,e.target.value)}
                  onKeyDown={e => handleOtpKey(i,e)}
                  style={{width:50,height:60,background:d?'rgba(212,171,99,.09)':'rgba(0,0,0,.5)',border:`1.5px solid ${d?'rgba(212,171,99,.45)':'rgba(212,171,99,.18)'}`,borderRadius:3,color:'#d4ab63',fontFamily:'IM Fell DW Pica,serif',fontSize:30,textAlign:'center',outline:'none',cursor:'text',transition:'border-color .15s,background .15s'}}
                />
              ))}
            </div>
            <button className="lm-btn" onClick={handleVerify} disabled={loading||otp.join('').length!==6}
              style={{width:'100%',padding:'13px',background:(loading||otp.join('').length!==6)?'rgba(196,146,42,.25)':'linear-gradient(135deg,#c4922a,#9b6b2f)',border:'none',borderRadius:3,color:'#f0e8d8',fontFamily:'IM Fell DW Pica,serif',fontSize:17,cursor:(loading||otp.join('').length!==6)?'not-allowed':'pointer',transition:'all .2s',boxShadow:(loading||otp.join('').length!==6)?'none':'0 4px 18px rgba(196,146,42,.22)'}}>
              {loading ? <><span className="lm-spin"/>Verifying...</> : 'Unlock the Archive →'}
            </button>
            <div style={{textAlign:'center',marginTop:14,fontFamily:'Cormorant Garamond,serif',fontSize:15,color:'rgba(212,171,99,.4)'}}>
              {countdown > 0
                ? <>Resend in <strong style={{color:'#d4ab63'}}>{countdown}s</strong></>
                : <>Didn't receive it?{' '}<button className="lm-resend" onClick={handleResend} disabled={loading} style={{background:'none',border:'none',color:'#d4ab63',cursor:'pointer',fontFamily:'Cormorant Garamond,serif',fontSize:15,textDecoration:'underline',padding:0,transition:'color .2s'}}>Resend</button></>
              }
            </div>
            <div style={{borderTop:'1px solid rgba(212,171,99,.08)',marginTop:20,paddingTop:14,fontFamily:'Space Mono,monospace',fontSize:9,letterSpacing:'.11em',color:'rgba(212,171,99,.18)',textAlign:'center',textTransform:'uppercase'}}>
              OTP expires in 2 minutes · Living Memory Project · Odisha
            </div>
          </>)}

        </div>
      </div>
    </div>
  );
}
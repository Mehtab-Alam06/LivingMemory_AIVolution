import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProfileModal({ onClose }) {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName]       = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const colorFor = email => {
    const p = ['#c4922a','#6db86d','#d4ab63','#9b6b2f','#c19a6b'];
    let h = 0;
    for (const c of (email||'')) h = c.charCodeAt(0)+((h<<5)-h);
    return p[Math.abs(h)%p.length];
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setLoading(true); setError('');
    try {
      await updateProfile(name.trim());
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) { setError(e.response?.data?.error || 'Update failed'); }
    setLoading(false);
  };

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(8,3,1,.92)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',animation:'pfFade .2s ease'}}>
      <style>{`
        @keyframes pfFade { from{opacity:0} to{opacity:1} }
        @keyframes pfUp   { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes pfSpin { to{transform:rotate(360deg)} }
        .pf-inp:focus { border-color:rgba(212,171,99,.5)!important; box-shadow:0 0 0 3px rgba(212,171,99,.07)!important; }
        .pf-save:hover:not(:disabled) { background:linear-gradient(135deg,#d4ab63,#c4922a)!important; transform:translateY(-1px); }
        .pf-out:hover  { background:rgba(208,94,82,.18)!important; color:#e07060!important; }
        .pf-close:hover{ color:#d4ab63!important; }
        .pf-spin { display:inline-block;width:12px;height:12px;border:2px solid rgba(240,232,216,.2);border-top-color:#f0e8d8;border-radius:50%;animation:pfSpin .65s linear infinite;vertical-align:middle;margin-right:6px }
      `}</style>

      <div style={{position:'relative',width:'100%',maxWidth:400,margin:16,background:'linear-gradient(170deg,#2d1709 0%,#1c0d04 60%,#0a0401 100%)',border:'1px solid rgba(212,171,99,.22)',borderRadius:6,boxShadow:'0 50px 120px rgba(0,0,0,.95)',overflow:'hidden',animation:'pfUp .3s cubic-bezier(.16,1,.3,1)'}}>

        {/* Top bar */}
        <div style={{background:'linear-gradient(90deg,rgba(212,171,99,.13),rgba(212,171,99,.04),rgba(212,171,99,.13))',borderBottom:'1px solid rgba(212,171,99,.13)',padding:'10px 22px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.18em',color:'rgba(212,171,99,.5)',textTransform:'uppercase'}}>🌿 Your Profile</span>
          <button className="pf-close" onClick={onClose} style={{background:'none',border:'none',color:'rgba(212,171,99,.28)',fontSize:16,cursor:'pointer',lineHeight:1,transition:'color .2s'}}>✕</button>
        </div>

        <div style={{padding:'26px 30px 30px'}}>

          {/* Avatar + info */}
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
            <div style={{width:54,height:54,borderRadius:'50%',background:colorFor(user?.email),display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'IM Fell DW Pica,serif',fontSize:22,color:'#1c0d04',fontWeight:'bold',flexShrink:0}}>
              {(user?.name||'?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontFamily:'IM Fell DW Pica,serif',fontSize:20,color:'#f0e8d8',lineHeight:1.2}}>{user?.name}</div>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'rgba(212,171,99,.42)',letterSpacing:'.05em',marginTop:3}}>{user?.email}</div>
            </div>
          </div>

          <div style={{borderTop:'1px solid rgba(212,171,99,.1)',marginBottom:20}}/>

          {error   && <div style={{background:'rgba(208,94,82,.1)',border:'1px solid rgba(208,94,82,.28)',borderRadius:3,padding:'8px 12px',fontFamily:'Cormorant Garamond,serif',fontSize:14,color:'#e07060',marginBottom:12,textAlign:'center'}}>{error}</div>}
          {success && <div style={{background:'rgba(109,184,109,.1)',border:'1px solid rgba(109,184,109,.28)',borderRadius:3,padding:'8px 12px',fontFamily:'Cormorant Garamond,serif',fontSize:14,color:'#6db86d',marginBottom:12,textAlign:'center'}}>{success}</div>}

          <label style={{display:'block',fontFamily:'Space Mono,monospace',fontSize:10,letterSpacing:'.14em',color:'rgba(212,171,99,.5)',textTransform:'uppercase',marginBottom:7}}>Display Name</label>
          <input className="pf-inp" type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSave()}
            style={{width:'100%',padding:'12px 14px',boxSizing:'border-box',background:'rgba(0,0,0,.45)',border:'1px solid rgba(212,171,99,.18)',borderRadius:3,color:'#f0e8d8',fontFamily:'Cormorant Garamond,serif',fontSize:17,outline:'none',marginBottom:6,transition:'border-color .2s'}}
          />
          <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(212,171,99,.22)',letterSpacing:'.08em',marginBottom:18}}>Email cannot be changed</div>

          <button className="pf-save" onClick={handleSave} disabled={loading}
            style={{width:'100%',padding:'12px',background:loading?'rgba(196,146,42,.25)':'linear-gradient(135deg,#c4922a,#9b6b2f)',border:'none',borderRadius:3,color:'#f0e8d8',fontFamily:'IM Fell DW Pica,serif',fontSize:17,cursor:loading?'not-allowed':'pointer',transition:'all .2s',marginBottom:10}}>
            {loading ? <><span className="pf-spin"/>Saving...</> : 'Save Changes'}
          </button>

          <button className="pf-out" onClick={() => { logout(); onClose(); }}
            style={{width:'100%',padding:'11px',background:'rgba(208,94,82,.08)',border:'1px solid rgba(208,94,82,.2)',borderRadius:3,color:'rgba(208,94,82,.65)',fontFamily:'Space Mono,monospace',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase',cursor:'pointer',transition:'all .2s'}}>
            Sign Out
          </button>

        </div>
      </div>
    </div>
  );
}
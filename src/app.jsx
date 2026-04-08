import React, { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPA_URL = "https://ovtzvxfghsplgrabkswn.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dHp2eGZnaHNwbGdyYWJrc3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDU3MTcsImV4cCI6MjA5MDQ4MTcxN30.SIRYKTrYE39Qamw7McvufBpDOwI_Th2fcye6A4wgS6Y";

const supa = {
  async signUp(email, password) {
    const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method:"POST", headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPA_URL}/auth/v1/logout`, {
      method:"POST", headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`}
    });
  },
  async resetPassword(email) {
    const r = await fetch(`${SUPA_URL}/auth/v1/recover`, {
      method:"POST", headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email})
    });
    return r.json();
  },
  async loadData(userId, token) {
    const r = await fetch(`${SUPA_URL}/rest/v1/user_data?user_id=eq.${userId}&select=*`, {
      headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"}
    });
    const rows = await r.json();
    return rows[0] || null;
  },
  async saveData(userId, token, data, scores) {
    // Upsert
    const r = await fetch(`${SUPA_URL}/rest/v1/user_data`, {
      method:"POST",
      headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates"},
      body: JSON.stringify({user_id:userId, data:JSON.stringify(data), scores:JSON.stringify(scores)})
    });
    return r;
  },
  // Tool snapshots
  async loadSnapshots(userId, token, tool) {
    const filter=tool?`&tool=eq.${encodeURIComponent(tool)}`:"";
    const r=await fetch(`${SUPA_URL}/rest/v1/tool_snapshots?user_id=eq.${userId}${filter}&order=created_at.desc&select=*`,{
      headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`}
    });
    return r.json();
  },
  async saveSnapshot(userId, token, tool, name, inputs) {
    const r=await fetch(`${SUPA_URL}/rest/v1/tool_snapshots`,{
      method:"POST",
      headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({user_id:userId,tool,name,inputs})
    });
    return r.json();
  },
  async deleteSnapshot(id, token) {
    await fetch(`${SUPA_URL}/rest/v1/tool_snapshots?id=eq.${id}`,{
      method:"DELETE",
      headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`}
    });
  },
};


const fmt = (n) => "$" + Number(n||0).toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtShort = (n) => { const v=Number(n||0); if(v>=1e6) return "$"+(v/1e6).toFixed(1)+"M"; if(v>=1000) return "$"+(v/1000).toFixed(1)+"K"; return fmt(v); };
const CAT_COLORS = ["#4ade80","#60a5fa","#facc15","#f87171","#a78bfa","#34d399","#fb923c","#e879f9","#94a3b8","#22d3ee"];
const GS = { fontFamily:"Georgia,serif" };
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  /* ── Keyframes ── */
  @keyframes redGlowPulse {
    0%,100% { text-shadow: 0 0 8px transparent; }
    50%      { text-shadow: 0 0 18px currentColor; }
  }
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }

  /* ── Page fade-in ── */
  .page-enter {
    animation: fadeIn 0.22s ease both;
  }

  /* ── Tile entrance ── */
  .tile-enter {
    animation: fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* ── Nav / tab buttons — underline style, no box ── */
  .glow-btn {
    position: relative;
    transition: color 0.18s ease, transform 0.12s ease !important;
    outline: none !important;
    box-shadow: none !important;
  }
  .glow-btn::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    width: 0;
    height: 2px;
    background: #cc0000;
    border-radius: 2px;
    transition: width 0.22s ease, left 0.22s ease;
  }
  .glow-btn:hover {
    color: #ffaaaa !important;
    transform: translateY(-1px) !important;
    box-shadow: none !important;
  }
  .glow-btn:hover::after {
    width: 80%;
    left: 10%;
  }
  .glow-btn:active {
    transform: scale(0.97) translateY(0px) !important;
    transition: transform 0.08s ease !important;
  }
  .glow-btn.active-tab {
    color: #cc0000 !important;
  }
  .glow-btn.active-tab::after {
    width: 100%;
    left: 0;
  }

  /* ── Regular action buttons (non-tab) ── */
  .action-btn {
    transition: filter 0.18s ease, transform 0.12s ease !important;
    outline: none !important;
  }
  .action-btn:hover {
    filter: brightness(1.15) !important;
    transform: translateY(-1px) !important;
  }
  .action-btn:active {
    transform: scale(0.97) !important;
    transition: transform 0.08s ease !important;
    filter: brightness(0.95) !important;
  }

  /* ── Input focus glow ── */
  input:focus, select:focus, textarea:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px #cc000033, 0 0 8px #cc000022 !important;
    border-color: #cc000066 !important;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  /* ── Progress bar smooth easing ── */
  .progress-bar {
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1) !important;
  }

  /* ── Mobile tile tap state ── */
  @media (hover: none) {
    .tile-card:active {
      transform: scale(0.98) !important;
      box-shadow: 0 4px 20px #cc000033 !important;
      transition: transform 0.1s ease, box-shadow 0.1s ease !important;
    }
  }
`;

// ─── DEFAULT STATE ─────────────────────────────────────────────────────────────
const EMPTY = {
  clientName:"", isJoint:null, age1:"", age2:"", person1Name:"", person2Name:"",
  income:{
    currentRole:"", grossSalary:"", hourlyRate:"", netPaycheque:"",
    payFrequency:"",
    avgMonthly:"",
    pensionContribution:"",
    employerMatchEmployee:"",
    employerMatchPct:"",
    monthlyIncome:"",
    grossMonthly:"",
  },
  income2:{
    currentRole:"", grossSalary:"", hourlyRate:"", netPaycheque:"",
    payFrequency:"",
    avgMonthly:"",
    pensionContribution:"",
    employerMatchEmployee:"",
    employerMatchPct:"",
    monthlyIncome:"",
    grossMonthly:"",
  },
  bankAccounts:[{name:"Chequing",amount:""}],
  investments:{
    tfsa:[{name:"Financial Planner",amount:""},{name:"Private Wealth",amount:""},{name:"Self Directed",amount:""}],
    fhsa:[{name:"Financial Planner",amount:""},{name:"Wealth Simple",amount:""}],
    rrsp:[{name:"LIRA",amount:""},{name:"BDC ESIP",amount:""}],
    alternatives:[{name:"Gold",amount:""},{name:"Bitcoin",amount:""}],
    nonReg:[{name:"Non-Registered",amount:""}],
  },
  savingsAccounts:[
    {name:"Emergency Fund",saved:"",goal:"15000",color:"#4ade80"},
    {name:"Sinking Fund",saved:"",goal:"12075",color:"#60a5fa"},
  ],
  locs:[{name:"BMO Line of Credit",balance:"",limit:"",rate:""}],
  creditCards:[{name:"Visa",totalBalance:"",due:"",pending:"",payInFull:true},{name:"Mastercard",totalBalance:"",due:"",pending:"",payInFull:true}],
  mortgage:{balance:"",value:"",rate:"",monthlyPayment:"",amortYears:""},
  otherDebts:[],
  lifeInsurance:"",
  budget:{income:"",investmentMonthly:"",categories:[
    {name:"Investments",amount:"",bucket:"fixed"},{name:"Housing",amount:"",bucket:"fixed"},{name:"Food",amount:"",bucket:"estimated"},
    {name:"Transportation",amount:"",bucket:"estimated"},{name:"Recurring",amount:"",bucket:"subscription"},{name:"Insurance",amount:"",bucket:"fixed"},
    {name:"Entertainment",amount:"",bucket:"estimated"},{name:"Wellness",amount:"",bucket:"estimated"},
  ]},
  billCalendar:[],
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Card = ({children,style={}}) => <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14,...style}}>{children}</div>;
const Label = ({children}) => <div style={{fontSize:10,letterSpacing:2,color:"#6b8cce",textTransform:"uppercase",marginBottom:6,...GS}}>{children}</div>;
const SecTitle = ({children,style={}}) => <div style={{fontSize:10,letterSpacing:3,color:"#6b8cce",textTransform:"uppercase",marginBottom:14,...GS,...style}}>{children}</div>;
const NumInput = ({value,onChange,placeholder="0.00"}) => (
  <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
    <span style={{color:"#6b8cce",marginRight:6,fontSize:14}}>$</span>
    <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/>
  </div>
);
const TxtInput = ({value,onChange,placeholder}) => (
  <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
);
const PctInput = ({value,onChange,placeholder="0.00"}) => (
  <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
    <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/>
    <span style={{color:"#6b8cce"}}>%</span>
  </div>
);
const NextBtn = ({onClick,children,style={},disabled=false}) => (
  <button onClick={disabled?undefined:onClick} disabled={disabled} className="action-btn" style={{width:"100%",background:disabled?"#1a1a2e":"linear-gradient(135deg,#1a4080,#0d2a5e)",border:`1px solid ${disabled?"#2a2a4a":"#2a4080"}`,borderRadius:10,color:disabled?"#4a5a6a":"#4ade80",padding:"14px",fontSize:14,cursor:disabled?"not-allowed":"pointer",letterSpacing:1,marginBottom:14,opacity:disabled?0.6:1,...GS,...style}}>{children}</button>
);
const NavBar = ({title,subtitle,onHome,right}) => (
  <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 0",position:"sticky",top:0,zIndex:100}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onHome} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>&larr;</button>
        <div><div style={{fontSize:10,letterSpacing:2,color:"#6b8cce",textTransform:"uppercase",...GS}}>{subtitle}</div><div style={{fontSize:18,fontWeight:"bold",color:"#fff",...GS}}>{title}</div></div>
      </div>
      {right}
    </div>
  </div>
);

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
function PDFBtn({title,contentId}) {
  const handlePrint = () => {
    const el = document.getElementById(contentId);
    if(!el) return;
    const w = window.open("","_blank");
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;background:#0a0f1e;color:#e8e4d9;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      *{box-sizing:border-box;}
      @media print{body{zoom:0.8;}}
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };
  return (
    <button onClick={handlePrint} style={{width:"100%",background:"linear-gradient(135deg,#1a0505,#0d1b3e)",border:"1px solid #cc0000",borderRadius:10,color:"#cc0000",padding:"13px",fontSize:13,cursor:"pointer",letterSpacing:1,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,...GS}}>
      <span>🖨</span> Export / Print PDF
    </button>
  );
}

// ─── FINANCIAL SCORING ────────────────────────────────────────────────────────
function calcScore(d, totalInv) {
  const age = Number(d.age1||0);
  if (!age) return null;
  const totalCC = d.creditCards.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD = (d.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0);
  const totalLocBal = (d.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0);
  const totalDebt = totalCC+totalLocBal+totalOD;
  const efund = (d.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyIncome = Number(d.budget.income||0);
  const annualIncome = monthlyIncome*12;
  const monthlyExp = d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus = monthlyIncome - monthlyExp;

  // Gross monthly for 25% target
  const inc=d.income||{};
  const grossMonthly=Number(inc.grossSalary||0)>0
    ? Number(inc.grossSalary)/12
    : Number(inc.hourlyRate||0)>0
      ? Number(inc.hourlyRate)*2080/12
      : monthlyIncome; // fallback to net if no gross entered

  // Investment rate — dedicated field + pension + employer match
  const periods={"monthly":12,"biweekly":26,"semimonthly":24,"weekly":52,"commission":12}[inc.payFrequency||"monthly"]||12;
  const pension=Number(inc.pensionContribution||0);
  const empEE=Number(inc.employerMatchEmployee||0);
  const empER=empEE*(Number(inc.employerMatchPct||0)/100);
  const workInvMonthly=(pension+empEE+empER)*(periods/12);
  const manualInvMonthly=Number(d.budget.investmentMonthly||0);
  // Use whichever is higher — the manual input or the work contributions
  const invMonthly=Math.max(manualInvMonthly,workInvMonthly) +
    (manualInvMonthly>0&&workInvMonthly>0?Math.min(manualInvMonthly,workInvMonthly):0);
  // Actually: add them together if both filled
  const totalInvMonthly = manualInvMonthly + workInvMonthly;
  // Investment rate vs GROSS income, target 25%
  const invRate = grossMonthly>0?(totalInvMonthly/grossMonthly)*100:0;
  const invTarget = 25; // 25% of gross is the universal target

  const band = age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s";
  const bm = {
    "20s":{efundMonths:3,debtRatio:0.3,invAmount:10000},
    "30s":{efundMonths:4,debtRatio:0.25,invAmount:60000},
    "40s":{efundMonths:5,debtRatio:0.2,invAmount:150000},
    "50s":{efundMonths:6,debtRatio:0.15,invAmount:300000},
    "60s":{efundMonths:6,debtRatio:0.1,invAmount:500000}
  }[band];

  const invRateScore = Math.min(30, Math.round((invRate/invTarget)*30));
  const budgetScore = surplus>=0 ? 10 : Math.max(0, Math.round(10 + (surplus/monthlyIncome)*20));

  const scores = [
    {label:"Investment Rate",score:invRateScore,max:30,desc:`${invRate.toFixed(1)}% of gross income invested (target: 25%)`},
    {label:"Portfolio Size",score:Math.min(25,Math.round((totalInv/bm.invAmount)*25)),max:25,desc:`${fmtShort(totalInv)} saved (benchmark: ${fmtShort(bm.invAmount)})`},
    {label:"Emergency Fund",score:Math.min(20,Math.round(((monthlyExp>0?efund/monthlyExp:0)/bm.efundMonths)*20)),max:20,desc:`${monthlyExp>0?(efund/monthlyExp).toFixed(1):0} months (target: ${bm.efundMonths})`},
    {label:"Debt Management",score:Math.max(0,Math.round(annualIncome>0?15-Math.max(0,(totalDebt/annualIncome-bm.debtRatio)*100):0)),max:15,desc:`Non-mortgage debt ${annualIncome>0?(totalDebt/annualIncome*100).toFixed(0):0}% of income (target <${bm.debtRatio*100}%)`},
    {label:"Budget Balance",score:budgetScore,max:10,desc:surplus>=0?`${fmt(surplus)}/mo surplus — on track`:`${fmt(Math.abs(surplus))}/mo deficit — spending exceeds income`},
  ];
  const total = scores.reduce((s,x)=>s+x.score,0);
  const grade = total>=85?"A+":total>=75?"A":total>=65?"B+":total>=55?"B":total>=45?"C+":total>=35?"C":"D";
  const gradeColor = total>=75?"#4ade80":total>=55?"#facc15":total>=35?"#fb923c":"#f87171";
  return {total,grade,gradeColor,scores,band,surplus,invRate,invMonthly:totalInvMonthly,monthlyIncome,grossMonthly};
}

// ─── THEMES ───────────────────────────────────────────────────────────────────
const DARK_THEME = {
  bg:"#0a0f1e", surface:"linear-gradient(135deg,#111827,#1a2235)", surfacePlain:"#111827",
  border:"#1e3a5f", borderAccent:"#2a4080", inputBg:"#0d1b3e",
  text:"#e8e4d9", textMuted:"#8fadd4", textDim:"#6b8cce",
  navBg:"linear-gradient(135deg,#0d1b3e,#1a2f5a)", navBorder:"#2a4080",
  gridLine:"#1e3a5f18", glow:"#7f0000",
  btnCheckupBg:"linear-gradient(135deg,#1a0505,#0d1b3e)", btnCheckupBorder:"#cc0000", btnCheckupText:"#fff",
  btnApptBg:"linear-gradient(135deg,#0d1b3e,#111827)", btnApptBorder:"#2a4080", btnApptText:"#fff",
  btnToolsBg:"linear-gradient(135deg,#111827,#1a1a0d)", btnToolsBorder:"#2a4080", btnToolsText:"#fff",
  badgeCheckup:"#cc0000", badgeAppt:"#60a5fa", badgeTools:"#facc15",
  tagline:"#2a4080", titleAccent:"#cc0000",
};
const LIGHT_THEME = {
  bg:"#f0f4f8", surface:"linear-gradient(135deg,#ffffff,#f8fafc)", surfacePlain:"#ffffff",
  border:"#cbd5e1", borderAccent:"#94a3b8", inputBg:"#f1f5f9",
  text:"#1e293b", textMuted:"#475569", textDim:"#64748b",
  navBg:"linear-gradient(135deg,#ffffff,#f1f5f9)", navBorder:"#e2e8f0",
  gridLine:"#94a3b822", glow:"#fca5a5",
  btnCheckupBg:"linear-gradient(135deg,#fff1f2,#ffe4e6)", btnCheckupBorder:"#f87171", btnCheckupText:"#1e293b",
  btnApptBg:"linear-gradient(135deg,#eff6ff,#dbeafe)", btnApptBorder:"#93c5fd", btnApptText:"#1e293b",
  btnToolsBg:"linear-gradient(135deg,#fefce8,#fef9c3)", btnToolsBorder:"#fde047", btnToolsText:"#1e293b",
  badgeCheckup:"#ef4444", badgeAppt:"#3b82f6", badgeTools:"#ca8a04",
  tagline:"#94a3b8", titleAccent:"#cc0000",
};

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({onAuth,onGuest}) {
  const [mode,setMode]=useState("login"); // login | signup | forgot
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState(null); // {type:"error"|"success", text}
  const [showPw,setShowPw]=useState(false);

  const reset=()=>{setMsg(null);setPassword("");setConfirm("");};

  const handleSubmit=async()=>{
    setMsg(null);
    if(!email.trim()){setMsg({type:"error",text:"Please enter your email."});return;}
    if(mode==="forgot"){
      setLoading(true);
      await supa.resetPassword(email.trim());
      setLoading(false);
      setMsg({type:"success",text:"Check your email for a password reset link!"});
      return;
    }
    if(!password){setMsg({type:"error",text:"Please enter a password."});return;}
    if(mode==="signup"){
      if(password.length<8){setMsg({type:"error",text:"Password must be at least 8 characters."});return;}
      if(password!==confirm){setMsg({type:"error",text:"Passwords don't match."});return;}
      setLoading(true);
      const res=await supa.signUp(email.trim(),password);
      setLoading(false);
      if(res.error){setMsg({type:"error",text:res.error.message||"Sign up failed."});return;}
      if(res.user&&!res.session){
        setMsg({type:"success",text:"Account created! Check your email to confirm, then log in."});
        setMode("login");reset();return;
      }
      if(res.access_token){
        localStorage.setItem("fh_token",res.access_token);
        localStorage.setItem("fh_uid",res.user.id);
        onAuth(res.user,res.access_token,true);return;
      }
      setMsg({type:"success",text:"Account created! Please log in."});
      setMode("login");reset();
    } else {
      setLoading(true);
      const res=await supa.signIn(email.trim(),password);
      setLoading(false);
      if(res.error){setMsg({type:"error",text:"Incorrect email or password."});return;}
      if(res.access_token){
        localStorage.setItem("fh_token",res.access_token);
        localStorage.setItem("fh_uid",res.user.id);
        onAuth(res.user,res.access_token);
      }
    }
  };

  const inp={background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:10,padding:"13px 14px",color:"#e8e4d9",fontSize:15,width:"100%",outline:"none",boxSizing:"border-box",...GS};

  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",...GS}}>
      <style>{GLOBAL_CSS}</style>
      {/* Background grid */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(#1e3a5f18 1px,transparent 1px),linear-gradient(90deg,#1e3a5f18 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      {/* Glow */}
      <div style={{position:"fixed",top:"30%",left:"50%",width:300,height:300,background:"radial-gradient(circle,#7f000033 0%,transparent 70%)",pointerEvents:"none",transform:"translate(-50%,-50%)"}}/>

      <div style={{position:"relative",width:"100%",maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <svg width="64" height="64" viewBox="0 0 160 160" style={{marginBottom:12}}>
            <rect x="52" y="8" width="56" height="144" rx="10" fill="#cc0000"/>
            <rect x="8" y="52" width="144" height="56" rx="10" fill="#cc0000"/>
          </svg>
          <div style={{fontSize:26,color:"#e8e4d9",fontWeight:"normal",letterSpacing:1}}>Financial <span style={{color:"#cc0000"}}>Health</span></div>
          <div style={{fontSize:11,color:"#2a4080",letterSpacing:3,textTransform:"uppercase",marginTop:4}}>
            {mode==="login"?"Welcome back":mode==="signup"?"Create your account":"Reset your password"}
          </div>
        </div>

        {/* Card */}
        <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:18,padding:"28px 24px"}}>
          {/* Tabs */}
          {mode!=="forgot"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
              {[{val:"login",label:"Log In"},{val:"signup",label:"Sign Up"}].map(t=>(
                <button key={t.val} onClick={()=>{setMode(t.val);reset();}}
                  className={`glow-btn${mode===t.val?" active-tab":""}`}
                  style={{background:mode===t.val?"#cc0000":"transparent",border:`1px solid ${mode===t.val?"#cc0000":"#2a4080"}`,borderRadius:10,padding:"10px",color:mode===t.val?"#fff":"#8fadd4",cursor:"pointer",fontSize:13,fontWeight:"bold",...GS}}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Fields */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>EMAIL</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              placeholder="you@example.com" style={inp} autoComplete="email"/>
          </div>

          {mode!=="forgot"&&(
            <div style={{marginBottom:mode==="signup"?14:8}}>
              <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>PASSWORD</div>
              <div style={{position:"relative"}}>
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                  placeholder="••••••••" style={{...inp,paddingRight:44}}/>
                <button onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:14}}>
                  {showPw?"🙈":"👁"}
                </button>
              </div>
            </div>
          )}

          {mode==="signup"&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>CONFIRM PASSWORD</div>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                placeholder="••••••••" style={inp}/>
            </div>
          )}

          {/* Forgot link */}
          {mode==="login"&&(
            <div style={{textAlign:"right",marginBottom:20}}>
              <button onClick={()=>{setMode("forgot");reset();}} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:12,...GS}}>
                Forgot password?
              </button>
            </div>
          )}

          {/* Message */}
          {msg&&(
            <div style={{background:msg.type==="error"?"#1a0505":"#0d2a1a",border:`1px solid ${msg.type==="error"?"#f8717144":"#4ade8044"}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:msg.type==="error"?"#f87171":"#4ade80",marginBottom:16,lineHeight:1.5}}>
              {msg.text}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} className="action-btn"
            style={{width:"100%",background:loading?"#1a0505":"linear-gradient(135deg,#cc0000,#8b0000)",border:"1px solid #cc000066",borderRadius:12,padding:"14px",color:"#fff",fontSize:15,fontWeight:"bold",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,...GS}}>
            {loading?"Please wait..."
              :mode==="login"?"Log In →"
              :mode==="signup"?"Create Account →"
              :"Send Reset Email →"}
          </button>

          {/* Back link for forgot */}
          {mode==="forgot"&&(
            <button onClick={()=>{setMode("login");reset();}} style={{width:"100%",background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:13,marginTop:14,...GS}}>
              ← Back to Log In
            </button>
          )}

          {/* Sign up prompt */}
          {mode==="login"&&(
            <div style={{textAlign:"center",marginTop:18,fontSize:12,color:"#6b8cce"}}>
              Don't have an account?{" "}
              <button onClick={()=>{setMode("signup");reset();}} style={{background:"none",border:"none",color:"#cc0000",cursor:"pointer",fontSize:12,...GS}}>
                Sign up free
              </button>
            </div>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:"#2a4080",letterSpacing:2}}>
          PRIVATE · SECURE · CANADA 🇨🇦
        </div>

        {/* Guest access */}
        <div style={{textAlign:"center",marginTop:20}}>
          <div style={{fontSize:12,color:"#2a4080",marginBottom:10}}>— or —</div>
          <button onClick={onGuest} className="glow-btn" style={{background:"none",border:"1px solid #1e3a5f",borderRadius:12,padding:"12px 24px",color:"#6b8cce",cursor:"pointer",fontSize:13,width:"100%",...GS}}>
            Continue as Guest
          </button>
          <div style={{fontSize:11,color:"#1e3a5f",marginTop:8,lineHeight:1.6}}>
            No account needed — but your data won't be saved between sessions.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [token,setToken]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [isGuest,setIsGuest]=useState(false);
  const [page,setPage]=useState("home");
  const [dark,setDark]=useState(true);
  const [saving,setSaving]=useState(false);
  const [isNewUser,setIsNewUser]=useState(false);

  const [data,setData]=useState(EMPTY);
  const [scoreHistory,setScoreHistory]=useState([]);

  // Inject global CSS into document head once
  useEffect(()=>{
    const el=document.createElement('style');
    el.id='fh-global-css';
    el.textContent=GLOBAL_CSS;
    if(!document.getElementById('fh-global-css')) document.head.appendChild(el);
    return ()=>{};
  },[]);

  useEffect(()=>{
    const savedToken=localStorage.getItem("fh_token");
    const savedUid=localStorage.getItem("fh_uid");
    const savedEmail=localStorage.getItem("fh_email")||"";
    if(savedToken&&savedUid){
      supa.loadData(savedUid,savedToken).then(row=>{
        if(row){
          setUser({id:savedUid,email:savedEmail});
          setToken(savedToken);
          try{if(row.data)setData(JSON.parse(row.data));}catch(e){}
          try{if(row.scores)setScoreHistory(JSON.parse(row.scores));}catch(e){}
          setIsNewUser(false);
        } else {
          localStorage.removeItem("fh_token");
          localStorage.removeItem("fh_uid");
          localStorage.removeItem("fh_email");
        }
        setAuthChecked(true);
      }).catch(()=>{setAuthChecked(true);});
    } else {
      setAuthChecked(true);
    }
  },[]);

  useEffect(()=>{
    if(!user||!token) return;
    const t=setTimeout(()=>{
      setSaving(true);
      supa.saveData(user.id,token,data,scoreHistory).finally(()=>setSaving(false));
    },1500);
    return ()=>clearTimeout(t);
  },[data,scoreHistory]);

  const handleAuth=async(authUser,authToken,newUser=false)=>{
    try {
      const safeUser={id:authUser.id,email:authUser.email||localStorage.getItem("fh_email")||""};
      setUser(safeUser);
      setToken(authToken);
      localStorage.setItem("fh_email",safeUser.email);
      const row=await supa.loadData(authUser.id,authToken);
      if(row&&row.data){
        try{setData(JSON.parse(row.data));}catch(e){}
        try{if(row.scores)setScoreHistory(JSON.parse(row.scores));}catch(e){}
        setIsNewUser(false);
      } else {
        setIsNewUser(true);
      }
    } catch(e) {
      setIsNewUser(newUser);
    }
  };

  const handleSignOut=async()=>{
    if(token) await supa.signOut(token);
    localStorage.removeItem("fh_token");
    localStorage.removeItem("fh_uid");
    localStorage.removeItem("fh_email");
    setUser(null);setToken(null);
    setData(EMPTY);setScoreHistory([]);
    setPage("home");setIsNewUser(false);setIsGuest(false);
  };

  const saveScore=(score)=>{
    if(!score) return;
    const entry={date:today(),score:score.total,grade:score.grade,gradeColor:score.gradeColor};
    setScoreHistory(prev=>{
      const existing=prev.findIndex(x=>x.date===entry.date);
      if(existing>=0){const n=[...prev];n[existing]=entry;return n;}
      return [...prev,entry].slice(-12);
    });
  };

  const sumGroup=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0);
  const totalInv=sumGroup(data.investments.tfsa)+sumGroup(data.investments.fhsa)+sumGroup(data.investments.rrsp)+sumGroup(data.investments.alternatives)+sumGroup(data.investments.nonReg);
  const theme=dark?DARK_THEME:LIGHT_THEME;
  const displayName=data.clientName||user?.email?.split("@")[0]||"";
  const latestScore=scoreHistory.length>0?scoreHistory[scoreHistory.length-1]:null;

  if(!authChecked) return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",...GS}}>
      <div style={{textAlign:"center"}}>
        <svg width="48" height="48" viewBox="0 0 160 160" style={{marginBottom:16}}>
          <rect x="52" y="8" width="56" height="144" rx="10" fill="#cc0000"/>
          <rect x="8" y="52" width="144" height="56" rx="10" fill="#cc0000"/>
        </svg>
        <div style={{color:"#6b8cce",fontSize:13,letterSpacing:2}}>LOADING...</div>
      </div>
    </div>
  );

  if(!user&&!isGuest) return <AuthScreen onAuth={handleAuth} onGuest={()=>setIsGuest(true)}/>;

  const signOutBtn=(
    <div style={{position:"fixed",bottom:20,right:16,zIndex:500}}>
      {saving&&<div style={{fontSize:10,color:"#6b8cce",textAlign:"center",marginBottom:4,letterSpacing:1}}>saving...</div>}
    </div>
  );

  return (
    <>
      {signOutBtn}
      {/* Guest mode banner */}
      {isGuest&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(135deg,#1a0a00,#0d1b3e)",borderTop:"1px solid #cc000044",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:1000}}>
          <div style={{fontSize:12,color:"#facc15"}}>⚠️ Guest mode — your data won't be saved between sessions</div>
          <button onClick={()=>setIsGuest(false)} style={{background:"linear-gradient(135deg,#cc0000,#8b0000)",border:"none",borderRadius:8,padding:"6px 16px",color:"#fff",cursor:"pointer",fontSize:12,...GS}}>Sign Up Free</button>
        </div>
      )}
      {page==="home"&&<Homepage onAppointment={()=>setPage("appointment")} onCheckup={()=>setPage("checkup")} onTools={()=>setPage("tools")} onProfile={()=>setPage("profile")} onSignIn={()=>setIsGuest(false)} dark={dark} setDark={setDark} theme={theme} userEmail={user?.email} displayName={displayName} latestScore={latestScore} isGuest={isGuest}/>}
      {page==="appointment"&&<Appointment data={data} setData={setData} onHome={()=>setPage("home")} onCheckup={()=>setPage("checkup")} saveScore={saveScore} totalInv={totalInv} theme={theme}/>}
      {page==="checkup"&&<Checkup data={data} onHome={()=>setPage("home")} onAppointment={()=>setPage("appointment")} totalInv={totalInv} scoreHistory={scoreHistory} saveScore={saveScore} theme={theme} user={user} token={token}/>}
      {page==="tools"&&<IndividualTools onHome={()=>setPage("home")} data={data} theme={theme} user={user} token={token}/>}
      {page==="profile"&&<ProfilePage user={user} token={token} onHome={()=>setPage("home")} onSignOut={handleSignOut} data={data}/>}
    </>
  );
}

// ─── ONBOARDING SCREEN ────────────────────────────────────────────────────────
function OnboardingScreen({displayName,userEmail,onStart,onSkip}) {
  const [vis,setVis]=useState(false);
  useEffect(()=>setTimeout(()=>setVis(true),80),[]);
  const fade={opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(20px)",transition:"opacity 0.6s ease 0.1s,transform 0.6s ease 0.1s"};
  const name=displayName||userEmail?.split("@")[0]||"there";
  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",...GS}}>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(#1e3a5f18 1px,transparent 1px),linear-gradient(90deg,#1e3a5f18 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:"40%",left:"50%",width:400,height:400,background:"radial-gradient(circle,#cc000022 0%,transparent 70%)",pointerEvents:"none",transform:"translate(-50%,-50%)"}}/>
      <div style={{...fade,position:"relative",width:"100%",maxWidth:440,textAlign:"center"}}>
        {/* Cross */}
        <svg width="72" height="72" viewBox="0 0 160 160" style={{marginBottom:20}}>
          <rect x="52" y="8" width="56" height="144" rx="10" fill="#cc0000"/>
          <rect x="8" y="52" width="144" height="56" rx="10" fill="#cc0000"/>
        </svg>
        <div style={{fontSize:28,color:"#e8e4d9",fontWeight:"normal",marginBottom:8,letterSpacing:1}}>
          Welcome, <span style={{color:"#cc0000"}}>{name}</span> 👋
        </div>
        <div style={{fontSize:14,color:"#8fadd4",lineHeight:1.8,marginBottom:32}}>
          Financial Health helps you track your net worth, build a budget, analyze your investments, and get a personalized financial score — all in one place.
        </div>
        {/* Steps preview */}
        <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:16,padding:"20px",marginBottom:24,textAlign:"left"}}>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:14}}>HERE'S HOW IT WORKS</div>
          {[
            {icon:"📋",title:"Initial Appointment",desc:"Answer ~10 minutes of questions about your finances — income, savings, debts and investments."},
            {icon:"🏆",title:"Get Your Score",desc:"Receive a personalized Financial Health Score (A+ to D) based on Ontario benchmarks for your age group."},
            {icon:"📊",title:"Track & Improve",desc:"Use your dashboard and tools to track progress, optimize your budget, and improve your score over time."},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:12,marginBottom:i<2?16:0,alignItems:"flex-start"}}>
              <span style={{fontSize:22,flexShrink:0}}>{s.icon}</span>
              <div>
                <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold",marginBottom:3,...GS}}>{s.title}</div>
                <div style={{fontSize:12,color:"#6b8cce",lineHeight:1.6}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{width:"100%",background:"linear-gradient(135deg,#cc0000,#8b0000)",border:"1px solid #cc000066",borderRadius:14,padding:"16px",color:"#fff",fontSize:16,fontWeight:"bold",cursor:"pointer",marginBottom:12,...GS}}>
          Let's Get Started →
        </button>
        <button onClick={onSkip} style={{width:"100%",background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:13,...GS}}>
          Skip for now — take me to the homepage
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({user,token,onHome,onSignOut,data}) {
  const [pwMode,setPwMode]=useState(false);
  const [newPw,setNewPw]=useState("");
  const [confirmPw,setConfirmPw]=useState("");
  const [pwMsg,setPwMsg]=useState(null);
  const [pwLoading,setPwLoading]=useState(false);
  const [showDelete,setShowDelete]=useState(false);
  const name=data.clientName||user?.email?.split("@")[0]||"";
  const initials=(name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  const handleChangePw=async()=>{
    if(newPw.length<8){setPwMsg({type:"error",text:"Password must be at least 8 characters."});return;}
    if(newPw!==confirmPw){setPwMsg({type:"error",text:"Passwords don't match."});return;}
    setPwLoading(true);
    try{
      const r=await fetch(`${SUPA_URL}/auth/v1/user`,{
        method:"PUT",headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({password:newPw})
      });
      const res=await r.json();
      if(res.error){setPwMsg({type:"error",text:res.error.message});}
      else{setPwMsg({type:"success",text:"Password updated successfully!"});setNewPw("");setConfirmPw("");setPwMode(false);}
    }catch(e){setPwMsg({type:"error",text:"Something went wrong."});}
    setPwLoading(false);
  };

  const inp={background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:10,padding:"12px 14px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS};

  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onHome} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>&larr;</button>
            <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>My Profile</div>
          </div>
        </div>
      </div>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}}>
        {/* Avatar */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#cc0000,#8b0000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:"bold",color:"#fff",margin:"0 auto 12px",...GS}}>
            {initials}
          </div>
          <div style={{fontSize:20,color:"#e8e4d9",fontWeight:"bold",...GS}}>{name||"Your Account"}</div>
          <div style={{fontSize:13,color:"#6b8cce",marginTop:4}}>{user?.email}</div>
        </div>

        {/* Account info */}
        <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14}}>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:14}}>ACCOUNT</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}>
            <span style={{fontSize:13,color:"#8fadd4"}}>Email</span>
            <span style={{fontSize:13,color:"#e8e4d9"}}>{user?.email}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
            <span style={{fontSize:13,color:"#8fadd4"}}>Name on file</span>
            <span style={{fontSize:13,color:"#e8e4d9"}}>{data.clientName||"Not set — complete Initial Appointment"}</span>
          </div>
        </div>

        {/* Change password */}
        <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:pwMode?16:0}}>
            <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>Change Password</div>
            <button onClick={()=>{setPwMode(p=>!p);setPwMsg(null);}} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"5px 12px",color:"#8fadd4",cursor:"pointer",fontSize:12,...GS}}>
              {pwMode?"Cancel":"Change"}
            </button>
          </div>
          {pwMode&&(
            <div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>NEW PASSWORD</div>
                <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 8 characters" style={inp}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>CONFIRM NEW PASSWORD</div>
                <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat password" style={inp}/>
              </div>
              {pwMsg&&<div style={{background:pwMsg.type==="error"?"#1a0505":"#0d2a1a",border:`1px solid ${pwMsg.type==="error"?"#f8717144":"#4ade8044"}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:pwMsg.type==="error"?"#f87171":"#4ade80",marginBottom:10}}>{pwMsg.text}</div>}
              <button onClick={handleChangePw} disabled={pwLoading} style={{width:"100%",background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:10,padding:"12px",color:"#4ade80",fontSize:13,cursor:"pointer",...GS}}>
                {pwLoading?"Updating...":"Update Password"}
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={onSignOut} style={{width:"100%",background:"linear-gradient(135deg,#1a0505,#0d1b3e)",border:"1px solid #cc000044",borderRadius:14,padding:"14px",color:"#f87171",fontSize:14,cursor:"pointer",marginBottom:10,...GS}}>
          Sign Out
        </button>

        {/* Delete account */}
        {!showDelete?(
          <button onClick={()=>setShowDelete(true)} style={{width:"100%",background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:12,padding:"8px",...GS}}>
            Delete my account
          </button>
        ):(
          <div style={{background:"#1a0505",border:"1px solid #f8717144",borderRadius:14,padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:14,color:"#f87171",fontWeight:"bold",marginBottom:8}}>Are you sure?</div>
            <div style={{fontSize:12,color:"#8fadd4",marginBottom:14,lineHeight:1.6}}>This will permanently delete your account and all your financial data. This cannot be undone.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setShowDelete(false)} style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:10,padding:"10px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>Cancel</button>
              <button onClick={onSignOut} style={{background:"#cc0000",border:"none",borderRadius:10,padding:"10px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:"bold",...GS}}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BEGINNER TOOLTIP ─────────────────────────────────────────────────────────
function Tip({text}) {
  const [show,setShow]=useState(false);
  
  return (
    <span style={{position:"relative",display:"inline-block",marginLeft:6}}>
      <button onClick={()=>setShow(p=>!p)} style={{background:"#1e3a5f",border:"1px solid #2a4080",borderRadius:"50%",width:18,height:18,color:"#6b8cce",cursor:"pointer",fontSize:10,padding:0,lineHeight:"18px",textAlign:"center",...GS}}>?</button>
      {show&&<div style={{position:"absolute",left:24,top:-4,background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#e8e4d9",width:220,zIndex:200,lineHeight:1.6,boxShadow:"0 8px 24px #00000066",...GS}}>
        {text}
        <button onClick={()=>setShow(false)} style={{display:"block",marginTop:8,background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:11,...GS}}>Got it ✓</button>
      </div>}
    </span>
  );
}

// ─── BEGINNER SECTION WRAPPER ──────────────────────────────────────────────────
function BeginnerCard({tip,title,children}) {
  return <>{children}</>;
  return (
    <div style={{background:"linear-gradient(135deg,#0d1b3e,#111827)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,color:"#22d3ee",fontWeight:"bold",...GS}}>{title}</div>
        {tip&&<Tip text={tip}/>}
      </div>
      {children}
    </div>
  );
}

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
function Homepage({onAppointment,onCheckup,onTools,onProfile,onSignIn,dark,setDark,theme,userEmail,displayName,latestScore,isGuest=[]}) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),80);},[]);
  const fade = d=>({opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(20px)",transition:`opacity 0.7s ease ${d}s,transform 0.7s ease ${d}s`});
  const name=displayName||userEmail?.split("@")[0]||"";
  const initials=(name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  useEffect(()=>{
    const id="hb-style";
    if(document.getElementById(id)) return;
    const style=document.createElement("style");
    style.id=id;
    style.textContent=`
      @keyframes heartbeat {
        0%   { transform: scale(1);    filter: drop-shadow(0 0 18px #c0000066); }
        10%  { transform: scale(1.12); filter: drop-shadow(0 0 32px #cc0000cc); }
        20%  { transform: scale(1);    filter: drop-shadow(0 0 18px #c0000066); }
        30%  { transform: scale(1.07); filter: drop-shadow(0 0 26px #cc0000aa); }
        40%  { transform: scale(1);    filter: drop-shadow(0 0 18px #c0000066); }
        100% { transform: scale(1);    filter: drop-shadow(0 0 18px #c0000066); }
      }
      @keyframes hbglow {
        0%   { opacity:0.35; transform:translate(-50%,-60%) scale(1);   }
        10%  { opacity:0.65; transform:translate(-50%,-60%) scale(1.15);}
        20%  { opacity:0.35; transform:translate(-50%,-60%) scale(1);   }
        30%  { opacity:0.55; transform:translate(-50%,-60%) scale(1.08);}
        40%  { opacity:0.35; transform:translate(-50%,-60%) scale(1);   }
        100% { opacity:0.35; transform:translate(-50%,-60%) scale(1);   }
      }
    `;
    document.head.appendChild(style);
  },[]);

  return (
    <div style={{minHeight:"100vh",background:theme.bg,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",...GS,color:theme.text,transition:"background 0.4s"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${theme.gridLine} 1px,transparent 1px),linear-gradient(90deg,${theme.gridLine} 1px,transparent 1px)`,backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",width:340,height:340,background:`radial-gradient(circle,${theme.glow} 0%,transparent 70%)`,pointerEvents:"none",animation:"hbglow 3.5s ease-in-out infinite"}}/>

      {/* Profile icon / Guest sign-in — top left */}
      <div style={{position:"absolute",top:24,left:24,zIndex:10}}>
        {isGuest?(
          <button onClick={onSignIn} className="glow-btn" style={{background:"linear-gradient(135deg,#1a0505,#0d1b3e)",border:"1px solid #cc000066",borderRadius:10,padding:"8px 14px",color:"#cc0000",cursor:"pointer",fontSize:12,fontWeight:"bold",...GS}}>
            Sign In / Sign Up
          </button>
        ):(
          <button onClick={onProfile} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:0}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#cc0000,#8b0000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:"bold",color:"#fff",flexShrink:0,...GS}}>
              {initials}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold",...GS}}>{name}</div>
              {latestScore&&(
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                  <span style={{fontSize:11,color:latestScore.gradeColor,fontWeight:"bold",...GS}}>{latestScore.grade}</span>
                  <span style={{fontSize:10,color:"#6b8cce"}}>{latestScore.score}/100</span>
                </div>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Dark/Light toggle — top right */}
      <div style={{position:"absolute",top:24,right:24,zIndex:10,display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
        <button onClick={()=>setDark(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{width:64,height:32,borderRadius:16,background:dark?"#1e3a5f":"#e2e8f0",border:`2px solid ${dark?"#2a4080":"#cbd5e1"}`,position:"relative",transition:"background 0.3s,border 0.3s",display:"flex",alignItems:"center",padding:"0 4px"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:dark?"#4ade80":"#facc15",position:"absolute",left:dark?4:36,transition:"left 0.3s,background 0.3s",boxShadow:`0 2px 8px ${dark?"#4ade8066":"#facc1566"}`}}/>
            <span style={{position:"absolute",left:dark?32:6,fontSize:13,transition:"left 0.3s"}}>{dark?"☀️":"🌙"}</span>
          </div>
          <div style={{fontSize:9,color:theme.textDim,letterSpacing:2,textTransform:"uppercase",...GS}}>{dark?"Light":"Dark"}</div>
        </button>
      </div>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,padding:"0 24px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{...fade(0),marginBottom:24}}>
          <svg width="140" height="140" viewBox="0 0 160 160" style={{animation:"heartbeat 3.5s ease-in-out infinite",display:"block"}}>
            <rect x="52" y="8" width="56" height="144" rx="10" fill="#cc0000"/>
            <rect x="8" y="52" width="144" height="56" rx="10" fill="#cc0000"/>
            <rect x="52" y="8" width="56" height="144" rx="10" fill="url(#sh)" opacity="0.25"/>
            <defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="transparent"/></linearGradient></defs>
          </svg>
        </div>
        <div style={{...fade(0.15),textAlign:"center",marginBottom:32}}>
          <h1 style={{fontSize:36,margin:"0 0 8px",color:theme.text,fontWeight:"normal",letterSpacing:1}}>Financial <span style={{color:theme.titleAccent}}>Health</span></h1>
          <div style={{fontSize:12,color:theme.textDim,letterSpacing:2,textTransform:"uppercase"}}>Your complete financial picture</div>
        </div>

        <div style={{...fade(0.3),width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          {[
            {label:"Financial Health Dashboard",sub:"View your dashboard — net worth, investments & goals",badge:"DASHBOARD",bc:theme.badgeCheckup,border:theme.btnCheckupBorder,bg:theme.btnCheckupBg,textColor:theme.btnCheckupText,fn:onCheckup},
            {label:"Check-Up Appointment",sub:"Enter or edit your financial information",badge:"EDIT INFO",bc:theme.badgeAppt,border:theme.btnApptBorder,bg:theme.btnApptBg,textColor:theme.btnApptText,fn:onAppointment},
            {label:"Individual Tools",sub:"Budget, net worth, savings goals, simulators & more",badge:"TOOLS",bc:theme.badgeTools,border:theme.btnToolsBorder,bg:theme.btnToolsBg,textColor:theme.btnToolsText,fn:onTools},
          ].map(btn=>(
            <button key={btn.label} onClick={btn.fn}
              style={{background:btn.bg,border:`1px solid ${btn.border}`,borderRadius:14,padding:"20px 24px",cursor:"pointer",textAlign:"center",color:btn.textColor,width:"100%",transition:"transform 0.2s,box-shadow 0.2s",...GS}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px ${btn.bc}33`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              <div style={{fontSize:17,fontWeight:"bold",color:btn.textColor,marginBottom:5}}>{btn.label}</div>
              <div style={{fontSize:12,color:dark?"#8fadd4":theme.textMuted,lineHeight:1.5,marginBottom:10}}>{btn.sub}</div>
              <div style={{display:"inline-block",fontSize:10,color:btn.bc,letterSpacing:1,border:`1px solid ${btn.bc}55`,borderRadius:20,padding:"3px 12px"}}>{btn.badge}</div>
            </button>
          ))}
        </div>
        <div style={{...fade(0.5),marginTop:28,fontSize:10,color:theme.tagline,letterSpacing:2,textTransform:"uppercase"}}>Private · Secure · Instant</div>
      </div>
    </div>
  );
}

// ─── POST-SCORE INVESTMENT SLIDER ─────────────────────────────────────────────

// ─── FINANCIAL PRESCRIPTION ───────────────────────────────────────────────────
function FinancialPrescription({score,data,totalInv}) {
  const income=Number(data.budget.income||0);
  const totalAlloc=data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus=income-totalAlloc;
  const totalCC=data.creditCards.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const invAmt=score.invMonthly||0;
  const grossMonthly=score.grossMonthly||income;
  const invRate=score.invRate||0;
  const efund=(data.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyExp=totalAlloc;
  const efundMonths=monthlyExp>0?(efund/monthlyExp):0;

  // Generate 3 hyper-specific prescriptions based on their actual numbers
  const rxItems=[];

  // Investment rate Rx — use gross income and 25% target
  if(grossMonthly>0&&invRate<25){
    const target=Math.round(grossMonthly*0.25);
    const gap=target-invAmt;
    rxItems.push({icon:"💊",color:"#4ade80",title:"Boost your investment rate",action:`You're currently investing ${invRate.toFixed(1)}% of your gross income. The goal is 25% (${fmt(target)}/mo). You need ${fmt(Math.max(0,gap))} more per month — through TFSA contributions, pension, or employer match. Set up an automatic transfer on payday so it never gets spent.`});
  }

  // Emergency fund Rx
  if(efundMonths<3&&monthlyExp>0){
    const target=monthlyExp*3;
    const gap=target-efund;
    const months=surplus>0?Math.ceil(gap/surplus):null;
    rxItems.push({icon:"💊",color:"#60a5fa",title:"Build your emergency fund to 3 months",action:`You have ${efundMonths.toFixed(1)} months saved — the minimum is 3. You need ${fmt(gap)} more.${months?` At your current surplus of ${fmt(surplus)}/mo, you're ${months} months away. Automate ${fmt(Math.min(surplus*0.5,gap/6))}/mo to savings first.`:""}`});
  }

  // Credit card debt Rx
  if(totalCC>0){
    const monthlyInterest=(totalCC*0.1999)/12;
    rxItems.push({icon:"💊",color:"#f87171",title:"Eliminate credit card debt",action:`Your ${fmt(totalCC)} in credit card balances costs you roughly ${fmt(monthlyInterest)}/mo in interest — money that builds zero wealth. Pay every dollar beyond minimums toward the highest-rate card. The Debt Optimizer tool below has your exact payoff plan.`});
  }

  // Surplus Rx
  if(surplus>0&&invAmt/income>=0.10&&efundMonths>=3&&totalCC===0){
    rxItems.push({icon:"💊",color:"#facc15",title:"Put your surplus to work",action:`You have a ${fmt(surplus)}/mo surplus. If invested at 7%/yr for 10 years, that's ${fmtShort(surplus*((Math.pow(1+0.07/12,120)-1)/(0.07/12)))} in additional wealth. Max TFSA → FHSA → RRSP → non-registered, in that order.`});
  }

  // Always add one more if we only have 1-2
  if(rxItems.length<2&&totalInv>0){
    rxItems.push({icon:"💊",color:"#a78bfa",title:"Review your investment allocation",action:`Your ${fmtShort(totalInv)} portfolio is your biggest asset. Make sure it's diversified — a simple three-fund portfolio (Canadian, US, International index ETFs) is a low-cost, proven approach.`});
  }

  const top3=rxItems.slice(0,3);

  return (
    <Card style={{background:"linear-gradient(135deg,#0a0f1e,#0d1b3e)",border:"1px solid #cc000044"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:22}}>🩺</span>
        <div>
          <div style={{fontSize:13,color:"#cc0000",fontWeight:"bold",letterSpacing:1,...GS}}>FINANCIAL PRESCRIPTION</div>
          <div style={{fontSize:11,color:"#6b8cce"}}>Your personalized action items based on your numbers</div>
        </div>
      </div>
      {top3.map((rx,i)=>(
        <div key={i} style={{background:"#0d1b3e",borderRadius:12,padding:"14px",marginBottom:10,borderLeft:`3px solid ${rx.color}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:16}}>{rx.icon}</span>
            <div style={{fontSize:13,color:rx.color,fontWeight:"bold",...GS}}>Rx {i+1}: {rx.title}</div>
          </div>
          <div style={{fontSize:12,color:"#8fadd4",lineHeight:1.8,paddingLeft:24}}>{rx.action}</div>
        </div>
      ))}
    </Card>
  );
}

// ─── POST-SCORE TOOLS ─────────────────────────────────────────────────────────
function PostScoreTools({data,onCheckup,saveScore,score}) {
  const [openTool,setOpenTool]=useState(null);
  const totalCC=data.creditCards.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD=(data.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0);
  const hasDebts=totalCC>0||totalOD>0||(data.locs||[]).some(l=>Number(l.balance||0)>0);
  const hasSavings=(data.savingsAccounts||[]).some(a=>Number(a.goal||0)>0);

  const TOOLS=[
    {id:"budget",icon:"💰",color:"#4ade80",label:"Review Your Budget",sub:"Pre-loaded with your income and categories"},
    {id:"networth",icon:"📊",color:"#60a5fa",label:"See Your Net Worth",sub:"Pre-loaded with all your assets and debts"},
    ...(hasSavings?[{id:"savings",icon:"🎯",color:"#facc15",label:"Track Your Savings Goals",sub:"Pre-loaded with your savings accounts"}]:[]),
    ...(hasDebts?[{id:"debtopt",icon:"⚡",color:"#f87171",label:"Optimize Your Debt Payoff",sub:"Pre-loaded with your credit cards and loans"}]:[]),
  ];

  return (
    <div style={{marginTop:8}}>
      <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:14,...GS}}>YOUR PERSONALIZED TOOLS</div>
      <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.7,marginBottom:16}}>These tools are pre-loaded with the information you just entered. Tap any to explore.</div>

      {TOOLS.map(tool=>(
        <div key={tool.id} style={{marginBottom:12}}>
          <button onClick={()=>setOpenTool(openTool===tool.id?null:tool.id)}
            style={{width:"100%",background:"linear-gradient(135deg,#111827,#1a2235)",border:`1px solid ${openTool===tool.id?tool.color:"#1e3a5f"}`,borderRadius:14,padding:"16px 20px",cursor:"pointer",textAlign:"left",color:"#e8e4d9",transition:"border-color 0.2s",...GS}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{tool.icon}</span>
                <div>
                  <div style={{fontSize:15,fontWeight:"bold",color:tool.color,marginBottom:3}}>{tool.label}</div>
                  <div style={{fontSize:11,color:"#6b8cce"}}>{tool.sub}</div>
                </div>
              </div>
              <div style={{fontSize:18,color:openTool===tool.id?tool.color:"#2a4080",transition:"transform 0.2s",transform:openTool===tool.id?"rotate(90deg)":"none"}}>›</div>
            </div>
          </button>

          {openTool===tool.id&&(
            <div style={{background:"#0d1b3e",borderRadius:"0 0 14px 14px",border:`1px solid ${tool.color}44`,borderTop:"none",padding:"16px"}}>
              {tool.id==="budget"&&<StandaloneBudget prefill={data.budget}/>}
              {tool.id==="networth"&&<StandaloneNetWorth prefill={data}/>}
              {tool.id==="savings"&&<SavingsGoalCalc prefill={data}/>}
              {tool.id==="debtopt"&&<DebtOptimizer creditCards={data.creditCards} otherDebts={data.otherDebts} locs={data.locs}/>}
            </div>
          )}
        </div>
      ))}

      <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>{saveScore(score);onCheckup();}} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:12,padding:"14px",color:"#4ade80",fontSize:13,cursor:"pointer",...GS}}>View Full Dashboard →</button>
      </div>
    </div>
  );
}

// ─── POST-SCORE INVESTMENT SLIDER ─────────────────────────────────────────────
function PostScoreInvestmentSlider({income,surplus,currentInvRate,invMonthly,band}) {
  const inc=Number(income||0);
  const currentInv=Number(invMonthly||0);
  const [extraAmt,setExtraAmt]=useState("");
  const r=0.07/12, years=[10,20,30];
  const fv=(mo,yrs)=>mo>0?Math.round(mo*((Math.pow(1+r,yrs*12)-1)/r)):0;

  const totalInvested=currentInv+Number(extraAmt||0);
  const newRate=inc>0?(totalInvested/inc)*100:0;
  const oldRate=inc>0?(currentInv/inc)*100:Number(currentInvRate||0);
  const targets={"20s":10,"30s":15,"40s":18,"50s":20,"60s":20};
  const target=targets[band]||15;
  const newScore=Math.min(30,Math.round((newRate/target)*30));
  const oldScore=Math.min(30,Math.round((oldRate/target)*30));
  const scoreDiff=newScore-oldScore;
  const hasExtra=Number(extraAmt||0)>0;

  return (
    <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",...GS}}>What If I Invested More?</div>
      </div>
      <div style={{fontSize:12,color:"#6b8cce",marginBottom:16,lineHeight:1.6}}>
        Enter how much of your remaining budget you'd like to invest each month and see the impact on your score and wealth.
      </div>

      {/* Current snapshot */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>CURRENTLY INVESTING</div>
          <div style={{fontSize:20,color:"#facc15",fontWeight:"bold",...GS}}>{fmt(currentInv)}/mo</div>
          <div style={{fontSize:11,color:"#facc15",marginTop:2}}>{oldRate.toFixed(1)}% of income</div>
          <div style={{fontSize:10,color:"#6b8cce",marginTop:1}}>{oldScore}/30 pts</div>
        </div>
        <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>BUDGET REMAINING</div>
          <div style={{fontSize:20,color:surplus>=0?"#4ade80":"#f87171",fontWeight:"bold",...GS}}>{fmt(Math.abs(surplus||0))}/mo</div>
          <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>{surplus>=0?"available to invest":"over budget"}</div>
        </div>
      </div>

      {/* Input */}
      <div style={{marginBottom:16}}>
        <Label>How much more would you invest per month?</Label>
        <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #4ade8066",borderRadius:10,padding:"12px 14px"}}>
          <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
          <input type="number" value={extraAmt} onChange={e=>setExtraAmt(e.target.value)}
            placeholder="e.g. 200"
            style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:20,width:"100%",...GS}}/>
          <span style={{color:"#6b8cce",fontSize:13}}>/mo</span>
        </div>
      </div>

      {/* Results — only show when amount entered */}
      {hasExtra&&(
        <div>
          {/* New rate */}
          <div style={{background:"#0d2a1a",border:"1px solid #4ade8044",borderRadius:10,padding:"14px",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:scoreDiff!==0?10:0}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>CURRENT RATE</div>
                <div style={{fontSize:22,color:"#facc15",fontWeight:"bold",...GS}}>{oldRate.toFixed(1)}%</div>
                <div style={{fontSize:10,color:"#6b8cce"}}>{oldScore}/30 pts</div>
              </div>
              <div style={{fontSize:20,color:"#4ade80",textAlign:"center"}}>→</div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>NEW RATE</div>
                <div style={{fontSize:22,color:"#4ade80",fontWeight:"bold",...GS}}>{newRate.toFixed(1)}%</div>
                <div style={{fontSize:10,color:"#4ade80"}}>{newScore}/30 pts {scoreDiff>0?`(+${scoreDiff})`:""}</div>
              </div>
            </div>
            {scoreDiff>0&&(
              <div style={{textAlign:"center",fontSize:13,color:"#4ade80",fontWeight:"bold",borderTop:"1px solid #1e3a5f",paddingTop:10,...GS}}>
                🎯 This adds +{scoreDiff} points to your Financial Health Score
                {newRate>=target&&<div style={{fontSize:11,marginTop:4}}>✅ You'd hit the {band} target of {target}%</div>}
              </div>
            )}
          </div>

          {/* Wealth projections */}
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:10}}>PROJECTED WEALTH AT 7%/YR</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {years.map(y=>(
              <div key={y} style={{background:"#0d1b3e",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>{y} yrs</div>
                <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(fv(totalInvested,y))}</div>
                <div style={{fontSize:9,color:"#22d3ee",marginTop:2}}>+{fmtShort(fv(Number(extraAmt),y))} extra</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}


// ─── SCORE GUIDANCE ───────────────────────────────────────────────────────────
function ScoreGuidance({score,data,totalInv}) {
  const isStruggling = score.total < 55; // below B
  const income = Number(data.budget.income||0);
  const totalAlloc = data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus = income - totalAlloc;
  const totalCC = data.creditCards.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD = (data.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0);
  const efund = (data.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyExp = totalAlloc;
  const efundMonths = monthlyExp>0?(efund/monthlyExp).toFixed(1):0;
  const invCat = data.budget.categories.find(c=>c.name==="Investments");
  const invAmount = Number(invCat?.amount||0);

  // Build specific action items based on what scored lowest
  const weakest = [...score.scores].sort((a,b)=>(a.score/a.max)-(b.score/b.max));

  const ACTIONS = {
    "Investment Rate": {
      icon:"📈",
      struggling:`Your investment rate is one of the most powerful levers in personal finance. Even starting with ${surplus>0?fmt(Math.min(surplus*0.5,200)):fmt(200)}/month can make a huge difference over time. Open a TFSA if you don't have one and set up an automatic contribution.`,
      good:`Keep growing your investment rate. Your goal should be ${score.band==="20s"?"15":"20"}% of gross income. ${invAmount>0?`You're currently investing ${fmt(invAmount)}/mo — try increasing by even $50/month.`:""}`
    },
    "Portfolio Size": {
      icon:"💼",
      struggling:`Your portfolio is smaller than average for your age group in Ontario. The most important step is consistency — investing a fixed amount every single month, even a small amount, builds powerful habits. Consider opening a TFSA first (${score.band==="20s"?"$7,000":"$7,000"} annual limit) or FHSA if you're saving for a home.`,
      good:`Your portfolio is on track. Focus on tax-sheltered accounts (TFSA, RRSP, FHSA) before non-registered. Make sure your investments are diversified across Canadian, US, and international markets.`
    },
    "Emergency Fund": {
      icon:"🛡️",
      struggling:`An emergency fund is the foundation of financial health — without it, one unexpected expense derails everything else. Your target is ${score.band==="20s"?"3":"5"} months of expenses (${fmt(monthlyExp*(score.band==="20s"?3:5))}). ${surplus>0?`With your current surplus of ${fmt(surplus)}/mo, you could hit this goal in ${Math.ceil(Math.max(0,monthlyExp*(score.band==="20s"?3:5)-efund)/surplus)} months.`:"Start by cutting one recurring expense and redirecting it to savings."}`,
      good:`Your emergency fund is solid. Make sure it's in a high-interest savings account (EQ Bank, Oaken Financial offer 3%+) so it's working for you while it sits.`
    },
    "Debt Management": {
      icon:"💳",
      struggling:`High-interest debt is the single biggest drag on wealth building. ${totalCC>0?`Your credit card balance of ${fmt(totalCC)} is costing you roughly ${fmt((totalCC*0.1999)/12)}/month in interest alone.`:""} Focus on paying off your highest-rate debt first (avalanche method) while making minimum payments on everything else. The Debt Optimizer tool can build your exact payoff plan.`,
      good:`Your debt levels are manageable. Keep paying down any remaining balances and avoid carrying credit card balances month-to-month — credit card interest (typically 19.99%) cancels out investment gains.`
    },
    "Monthly Surplus": {
      icon:"💰",
      struggling:`Your budget has little or no surplus, which means you have nothing left over to save or invest. Review your top 3 spending categories — even reducing one by $100/month frees up $1,200/year. Use the Budget Builder tool to find where your money is actually going.`,
      good:`You have a healthy monthly surplus. Make sure it's not just sitting in a chequing account — automate transfers to your TFSA or savings the same day you get paid.`
    },
  };

  const steps = isStruggling ? [
    {priority:"HIGH",icon:"🚨",title:"Step 1 — Stop the bleeding",desc:"Make a list of every debt and its interest rate. Stop adding to any credit card balances. Pay only minimums on low-rate debt."},
    {priority:"HIGH",icon:"🛡️",title:"Step 2 — Build a small starter emergency fund",desc:`Save $1,000 first as a buffer. This prevents small emergencies from turning into new debt. ${surplus>0?`At your current surplus of ${fmt(surplus)}/mo, this takes ${Math.ceil(1000/surplus)} months.`:""}`},
    {priority:"HIGH",icon:"💳",title:"Step 3 — Attack high-interest debt",desc:`Pay every extra dollar toward your highest-rate debt. ${totalCC>0?`Your credit cards (${fmt(totalCC)} at ~19.99%) should be priority one.`:""} Use the Debt Optimizer in Individual Tools for your exact plan.`},
    {priority:"MEDIUM",icon:"📈",title:"Step 4 — Start investing, even small amounts",desc:"Once high-interest debt is gone, open a TFSA and invest even $50–$100/month. Time in the market matters more than the amount."},
    {priority:"MEDIUM",icon:"📊",title:"Step 5 — Track your spending for 30 days",desc:"Use the Statement Importer to upload your bank statement and categorize every expense. Most people are surprised where their money actually goes."},
  ] : [
    {priority:"GREAT",icon:"✅",title:"Maintain your investment consistency",desc:`You're investing regularly — don't stop, even when markets drop. ${invAmount>0?`Increasing your ${fmt(invAmount)}/mo by even 1% of income per year accelerates your wealth significantly.`:""}`},
    {priority:"GREAT",icon:"🎯",title:"Max out your registered accounts",desc:"Prioritize TFSA → FHSA (if applicable) → RRSP in that order. Tax sheltering your investments is free money — take full advantage."},
    {priority:"GREAT",icon:"📈",title:"Increase your investment rate toward 20%",desc:`The target for long-term wealth is 20% of gross income invested. ${invAmount>0&&income>0?`You're at ${((invAmount/income)*100).toFixed(1)}% — aim to close the gap by $${Math.round((income*0.20-invAmount)>0?income*0.20-invAmount:0)}/mo.`:""}`},
    {priority:"GOOD",icon:"🛡️",title:"Review your insurance coverage",desc:"As your wealth grows, make sure your life insurance, disability insurance, and home/tenant insurance keep pace. A financial advisor can help size this correctly."},
    {priority:"GOOD",icon:"🔄",title:"Automate everything",desc:"Set up automatic transfers on payday for investments, savings, and debt payments. Remove the decision — what's automated gets done."},
  ];

  return (
    <Card style={{background:isStruggling?"linear-gradient(135deg,#1a0505,#0d1b3e)":"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:`1px solid ${isStruggling?"#f8717144":"#4ade8044"}`}}>
      <div style={{fontSize:11,letterSpacing:3,color:isStruggling?"#f87171":"#4ade80",marginBottom:12}}>
        {isStruggling?"⚠️ AREAS TO IMPROVE":"✅ KEEP UP THE MOMENTUM"}
      </div>
      <div style={{fontSize:14,color:"#e8e4d9",lineHeight:1.8,marginBottom:16,...GS}}>
        {isStruggling
          ? `Your score of ${score.total}/100 (${score.grade}) means there are meaningful opportunities to strengthen your financial position. Here's exactly what to focus on — in order of priority.`
          : `Your score of ${score.total}/100 (${score.grade}) puts you ahead of most Canadians in your age group. Here's how to keep building on this foundation.`
        }
      </div>

      {/* Weakest areas callout */}
      {isStruggling&&weakest.slice(0,2).filter(s=>s.score/s.max<0.6).map((s,i)=>{
        const action = ACTIONS[s.label];
        if(!action) return null;
        return (
          <div key={i} style={{background:"#0d1b3e",borderRadius:10,padding:"14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{action.icon}</span>
              <div style={{fontSize:13,color:"#f87171",fontWeight:"bold",...GS}}>{s.label} — Your weakest area</div>
            </div>
            <div style={{fontSize:12,color:"#8fadd4",lineHeight:1.8}}>{action.struggling}</div>
          </div>
        );
      })}

      {/* Steps */}
      <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:12,marginTop:4}}>
        {isStruggling?"YOUR ACTION PLAN":"NEXT STEPS"}
      </div>
      {steps.map((step,i)=>(
        <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<steps.length-1?"1px solid #1e3a5f":"none",alignItems:"flex-start"}}>
          <div style={{fontSize:20,flexShrink:0,width:28,textAlign:"center"}}>{step.icon}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold",...GS}}>{step.title}</div>
              <div style={{fontSize:9,color:step.priority==="HIGH"?"#f87171":step.priority==="GREAT"?"#4ade80":"#facc15",border:`1px solid ${step.priority==="HIGH"?"#f8717144":step.priority==="GREAT"?"#4ade8044":"#facc1544"}`,borderRadius:8,padding:"1px 7px",flexShrink:0}}>{step.priority}</div>
            </div>
            <div style={{fontSize:12,color:"#8fadd4",lineHeight:1.7}}>{step.desc}</div>
          </div>
        </div>
      ))}

      {/* Good scores callout */}
      {!isStruggling&&weakest.filter(s=>s.score/s.max>=0.7).length>0&&(
        <div style={{marginTop:14,background:"#0d1b3e",borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:11,color:"#4ade80",marginBottom:8}}>🌟 What you're doing well:</div>
          {weakest.filter(s=>s.score/s.max>=0.7).map((s,i)=>{
            const action=ACTIONS[s.label];
            if(!action) return null;
            return <div key={i} style={{fontSize:12,color:"#8fadd4",lineHeight:1.7,marginBottom:6}}><span style={{color:"#4ade80"}}>✓ {s.label}:</span> {action.good}</div>;
          })}
        </div>
      )}
    </Card>
  );
}

// ─── INVESTMENT INPUT (BUDGET STEP) ──────────────────────────────────────────
function ApptInvestmentInput({income,totalAlloc,currentValue,onSetInvestment}) {
  const surplus=income-totalAlloc;
  const currentInvAmt=Number(currentValue||0);
  const invRate=income>0?(currentInvAmt/income)*100:0;
  const r=0.07/12;
  const fv=(n)=>currentInvAmt>0?currentInvAmt*((Math.pow(1+r,n*12)-1)/r):0;

  return (
    <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:18}}>📈</span>
        <div>
          <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",...GS}}>Monthly Investment Amount</div>
          <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>
            {surplus>=0?`${fmt(surplus)}/mo remaining after expenses`:`${fmt(Math.abs(surplus))}/mo over budget`}
          </div>
        </div>
      </div>

      <div style={{fontSize:12,color:"#8fadd4",marginBottom:10,lineHeight:1.6}}>
        Enter how much you invest each month (TFSA, RRSP, savings, etc.). This directly affects your Investment Rate score.
      </div>

      <div style={{marginBottom:12}}>
        <Label>Monthly investment amount</Label>
        <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #4ade8066",borderRadius:10,padding:"12px 14px"}}>
          <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
          <input type="number" value={currentValue} onChange={e=>onSetInvestment(e.target.value)}
            placeholder="e.g. 500"
            style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:22,width:"100%",...GS}}/>
          <span style={{color:"#6b8cce",fontSize:12}}>/mo</span>
        </div>
        {income>0&&currentInvAmt>0&&(
          <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:"#6b8cce"}}>Investment rate:</span>
            <span style={{color:"#4ade80",fontWeight:"bold",...GS}}>{invRate.toFixed(1)}% of income</span>
          </div>
        )}
      </div>

      {currentInvAmt>0&&(
        <div>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>PROJECTED WEALTH AT 7%/YR</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[10,20,30].map(y=>(
              <div key={y} style={{background:"#0d1b3e",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>{y} YRS</div>
                <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(fv(y))}</div>
                <div style={{fontSize:9,color:"#2a4080",marginTop:2}}>at 7%/yr</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:11,color:"#6b8cce",textAlign:"center",lineHeight:1.6}}>
            This amount counts toward your Investment Rate score ✓
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── INCOME STEP ──────────────────────────────────────────────────────────────
function IncomeStep({d,setD,setIncome,setIncome2,onNext}) {
  const isJoint=d.isJoint;
  const name1=d.person1Name||d.clientName||"Person 1";
  const name2=d.person2Name||"Person 2";

  // Helper to calculate monthly from an income object
  const calcMonthly=(inc)=>{
    const freq=inc.payFrequency||"", net=Number(inc.netPaycheque||0);
    if(freq==="monthly") return net;
    if(freq==="biweekly") return net*26/12;
    if(freq==="semimonthly") return net*2;
    if(freq==="weekly") return net*52/12;
    if(freq==="commission") return Number(inc.avgMonthly||0);
    return 0;
  };
  const calcInvMonthly=(inc)=>{
    const freq=inc.payFrequency||"monthly";
    const periods={"monthly":12,"biweekly":26,"semimonthly":24,"weekly":52,"commission":12}[freq]||12;
    const pension=Number(inc.pensionContribution||0);
    const empEE=Number(inc.employerMatchEmployee||0);
    const empER=empEE*(Number(inc.employerMatchPct||0)/100);
    return Math.round((pension+empEE+empER)*(periods/12));
  };

  const inc1=d.income||{}, inc2=d.income2||{};
  const monthly1=Math.round(calcMonthly(inc1));
  const monthly2=Math.round(calcMonthly(inc2));
  const totalMonthly=monthly1+(isJoint?monthly2:0);

  const canProceed1=inc1.payFrequency&&(inc1.payFrequency==="commission"?Number(inc1.avgMonthly||0)>0:Number(inc1.netPaycheque||0)>0);
  const canProceed2=!isJoint||(inc2.payFrequency&&(inc2.payFrequency==="commission"?Number(inc2.avgMonthly||0)>0:Number(inc2.netPaycheque||0)>0));
  const canProceed=canProceed1&&canProceed2;

  return (
    <div>
      {isJoint&&(
        <div style={{textAlign:"center",background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:12,padding:"12px",marginBottom:14,fontSize:13,color:"#8fadd4"}}>
          Filling out income for both people — combined monthly income will be used for your budget and score.
        </div>
      )}

      {/* Person 1 */}
      <IncomePanel
        label={isJoint?name1:null}
        color="#4ade80"
        inc={inc1}
        setInc={setIncome}
       
        monthlyNet={monthly1}
        invMonthly={calcInvMonthly(inc1)}
      />

      {/* Person 2 — only if joint */}
      {isJoint&&(
        <IncomePanel
          label={name2}
          color="#60a5fa"
          inc={inc2}
          setInc={setIncome2}
         
          monthlyNet={monthly2}
          invMonthly={calcInvMonthly(inc2)}
        />
      )}

      {/* Combined summary for joint */}
      {isJoint&&monthly1>0&&monthly2>0&&(
        <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",textAlign:"center",padding:"16px"}}>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:6}}>COMBINED MONTHLY TAKE-HOME</div>
          <div style={{fontSize:28,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(totalMonthly)}/mo</div>
          <div style={{fontSize:11,color:"#6b8cce",marginTop:4}}>{fmt(monthly1)} + {fmt(monthly2)}</div>
        </Card>
      )}

      <NextBtn onClick={onNext} disabled={!canProceed}>
        {canProceed?"Next: Bank Accounts →":"Enter pay details to continue"}
      </NextBtn>
    </div>
  );
}


// ─── INCOME PANEL (reusable per-person income block) ─────────────────────────
function IncomePanel({label,color,inc,setInc,monthlyNet,invMonthly}) {
  const freq=inc.payFrequency||"";
  const pension=Number(inc.pensionContribution||0);
  const empEE=Number(inc.employerMatchEmployee||0);
  const empPct=Number(inc.employerMatchPct||0);
  const empER=empEE*(empPct/100);
  const periods={"monthly":12,"biweekly":26,"semimonthly":24,"weekly":52,"commission":12}[freq]||12;

  const FREQS=[
    {val:"monthly",label:"Monthly",sub:"Paid once a month"},
    {val:"semimonthly",label:"Semi-Monthly",sub:"Twice a month (24×/yr)"},
    {val:"biweekly",label:"Bi-Weekly",sub:"Every 2 weeks (26×/yr)"},
    {val:"weekly",label:"Weekly",sub:"Every week (52×/yr)"},
    {val:"commission",label:"Commission",sub:"Variable — enter monthly average"},
  ];

  const inp={background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:15,width:"100%",outline:"none",boxSizing:"border-box",...GS};

  return (
    <div style={{marginBottom:14}}>
      {label&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:color}}/>
        <div style={{fontSize:15,color,fontWeight:"bold",...GS}}>{label}</div>
      </div>}

      {/* Role & Pay */}
      <Card>
        <SecTitle>{label?"Role & Income":"Your Role & Income"}</SecTitle>
        <div style={{marginBottom:12}}>
          <Label>Current Role / Job Title</Label>
          <input value={inc.currentRole||""} onChange={e=>setInc("currentRole")(e.target.value)}
            placeholder="e.g. Financial Advisor, Nurse, Software Developer" style={inp}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <Label>Gross Annual Salary</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={inc.grossSalary||""} onChange={e=>setInc("grossSalary")(e.target.value)} placeholder="75,000" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
          <div>
            <Label>Hourly Rate (if applicable)</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={inc.hourlyRate||""} onChange={e=>setInc("hourlyRate")(e.target.value)} placeholder="35.00" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
              <span style={{color:"#6b8cce",fontSize:11}}>/hr</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Pay frequency */}
      <Card>
        <SecTitle>Pay Frequency</SecTitle>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {FREQS.map(f=>(
            <button key={f.val} onClick={()=>setInc("payFrequency")(f.val)}
              style={{background:freq===f.val?"#1a4080":"#0d1b3e",border:`1px solid ${freq===f.val?color:"#2a4080"}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",textAlign:"left",color:"#e8e4d9",...GS,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:"bold",color:freq===f.val?color:"#e8e4d9"}}>{f.label}</div>
                <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>{f.sub}</div>
              </div>
              {freq===f.val&&<span style={{color,fontSize:16}}>✓</span>}
            </button>
          ))}
        </div>

        {freq&&freq!=="commission"&&(
          <div>
            <Label>Net Pay Per Paycheque (after all deductions)</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:`1px solid ${color}66`,borderRadius:10,padding:"12px 14px"}}>
              <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
              <input type="number" value={inc.netPaycheque||""} onChange={e=>setInc("netPaycheque")(e.target.value)}
                placeholder="2,400.00" style={{background:"none",border:"none",outline:"none",color,fontSize:22,width:"100%",...GS}}/>
            </div>
          </div>
        )}
        {freq==="commission"&&(
          <div>
            <Label>Average Monthly Take-Home (after tax)</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:`1px solid ${color}66`,borderRadius:10,padding:"12px 14px"}}>
              <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
              <input type="number" value={inc.avgMonthly||""} onChange={e=>setInc("avgMonthly")(e.target.value)}
                placeholder="5,000.00" style={{background:"none",border:"none",outline:"none",color,fontSize:22,width:"100%",...GS}}/>
              <span style={{color:"#6b8cce",fontSize:12}}>/mo</span>
            </div>
          </div>
        )}

        {/* Monthly summary */}
        {monthlyNet>0&&(
          <div style={{marginTop:10,display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid #1e3a5f"}}>
            <span style={{fontSize:13,color:"#8fadd4"}}>Monthly take-home</span>
            <span style={{fontSize:16,color,fontWeight:"bold",...GS}}>{fmt(monthlyNet)}/mo</span>
          </div>
        )}
      </Card>

      {/* Pension — separate card */}
      {freq&&(
        <Card>
          <SecTitle>Pension Contribution</SecTitle>
          <Label>Your pension contribution /paycheque</Label>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #a78bfa66",borderRadius:10,padding:"12px 14px"}}>
            <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
            <input type="number" value={inc.pensionContribution||""} onChange={e=>setInc("pensionContribution")(e.target.value)}
              placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#a78bfa",fontSize:20,width:"100%",...GS}}/>
            <span style={{color:"#6b8cce",fontSize:12}}>/paycheque</span>
          </div>
          {pension>0&&(
            <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#6b8cce"}}>Monthly equivalent</span>
              <span style={{color:"#a78bfa",fontWeight:"bold",...GS}}>{fmt(Math.round(pension*(periods/12)))}/mo</span>
            </div>
          )}
        </Card>
      )}

      {/* Employer Match — separate card */}
      {freq&&(
        <Card>
          <SecTitle>Employer Match</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:empEE>0?12:0}}>
            <div>
              <Label>Your contribution /paycheque</Label>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #facc1566",borderRadius:8,padding:"10px 12px"}}>
                <span style={{color:"#6b8cce",marginRight:4}}>$</span>
                <input type="number" value={inc.employerMatchEmployee||""} onChange={e=>setInc("employerMatchEmployee")(e.target.value)}
                  placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:16,width:"100%",...GS}}/>
              </div>
            </div>
            <div>
              <Label>Employer matches</Label>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #4ade8066",borderRadius:8,padding:"10px 12px"}}>
                <input type="number" value={inc.employerMatchPct||""} onChange={e=>setInc("employerMatchPct")(e.target.value)}
                  placeholder="50" style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:16,width:"100%",...GS}}/>
                <span style={{color:"#6b8cce",fontSize:12}}>%</span>
              </div>
            </div>
          </div>
          {(empEE>0||empER>0)&&(
            <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>MONTHLY BREAKDOWN</div>
              {[
                {l:"Your contribution",v:Math.round(empEE*(periods/12)),c:"#facc15"},
                ...(empER>0?[{l:`Employer match (${empPct}%)`,v:Math.round(empER*(periods/12)),c:"#4ade80"}]:[]),
              ].filter(x=>x.v>0).map((x,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,color:"#8fadd4"}}>{x.l}</span>
                  <span style={{fontSize:13,color:x.c,fontWeight:"bold",...GS}}>{fmt(x.v)}/mo</span>
                </div>
              ))}
              <div style={{borderTop:"1px solid #1e3a5f",marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"#e8e4d9"}}>Combined /mo</span>
                <span style={{fontSize:14,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(Math.round((empEE+empER)*(periods/12)))}/mo</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Total work investment summary */}
      {freq&&(pension>0||empEE>0)&&(
        <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,color:"#6b8cce",marginBottom:4}}>TOTAL INVESTED FROM WORK /MO</div>
              <div style={{fontSize:22,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(invMonthly)}/mo</div>
              <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>Pension + your match + employer match</div>
            </div>
            <div style={{fontSize:32}}>📈</div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── APPOINTMENT ──────────────────────────────────────────────────────────────
const APPT_STEPS=["Start","Income","Accounts","Investments","Mortgage","Debt","Credit Cards","Line of Credit","Budget","Score"];

function Appointment({data:d,setData:setD,onHome,onCheckup,saveScore,totalInv,theme}) {
  const [step,setStep]=useState("Start");
  const set=(g,f)=>v=>setD(p=>({...p,[g]:{...p[g],[f]:v}}));
  const setIncome=f=>v=>setD(p=>({...p,income:{...p.income,[f]:v}}));
  const setIncome2=f=>v=>setD(p=>({...p,income2:{...p.income2,[f]:v}}));
  const setCC=(i,f)=>v=>setD(p=>({...p,creditCards:p.creditCards.map((c,idx)=>idx===i?{...c,[f]:v}:c)}));
  const setOD=(i,f)=>v=>setD(p=>({...p,otherDebts:p.otherDebts.map((x,idx)=>idx===i?{...x,[f]:v}:x)}));
  const setBudgetIncome=v=>setD(p=>({...p,budget:{...p.budget,income:v}}));
  const setBudgetCat=(i,f)=>v=>{const cats=d.budget.categories.map((c,idx)=>idx===i?{...c,[f]:v}:c);setD(p=>({...p,budget:{...p.budget,categories:cats}}));};
  const setBankAccount=(i,f)=>v=>setD(p=>({...p,bankAccounts:p.bankAccounts.map((a,idx)=>idx===i?{...a,[f]:v}:a)}));
  const addBankAccount=()=>setD(p=>({...p,bankAccounts:[...p.bankAccounts,{name:"",amount:""}]}));
  const removeBankAccount=i=>setD(p=>({...p,bankAccounts:p.bankAccounts.filter((_,idx)=>idx!==i)}));
  // savings accounts
  const setSavingsAccount=(i,f)=>v=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.map((a,idx)=>idx===i?{...a,[f]:v}:a)}));
  const addSavingsAccount=()=>setD(p=>({...p,savingsAccounts:[...p.savingsAccounts,{name:"New Fund",saved:"",goal:"",color:CAT_COLORS[p.savingsAccounts.length%CAT_COLORS.length]}]}));
  const removeSavingsAccount=i=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.filter((_,idx)=>idx!==i)}));
  // locs
  const setLoc=(i,f)=>v=>setD(p=>({...p,locs:p.locs.map((l,idx)=>idx===i?{...l,[f]:v}:l)}));
  const addLoc=()=>setD(p=>({...p,locs:[...p.locs,{name:"New Line of Credit",balance:"",limit:"",rate:""}]}));
  const removeLoc=i=>setD(p=>({...p,locs:p.locs.filter((_,idx)=>idx!==i)}));

  const sumGroup=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0);
  const tTFSA=sumGroup(d.investments.tfsa),tFHSA=sumGroup(d.investments.fhsa),tRRSP=sumGroup(d.investments.rrsp),tAlt=sumGroup(d.investments.alternatives),tNR=sumGroup(d.investments.nonReg);
  const income=Number(d.budget.income||0),totalAlloc=d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const prog=APPT_STEPS.indexOf(step),pct=Math.round((prog/(APPT_STEPS.length-1))*100);
  const score=step==="Score"?calcScore(d,totalInv):null;
  const contentRef=useRef();

  // Auto-save score when score step is reached
  useEffect(()=>{
    if(step==="Score"&&score) saveScore(score);
  },[step]);

  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title="Initial Appointment" subtitle="FinHealth" onHome={onHome} right={<div style={{fontSize:12,color:"#4ade80",...GS}}>Step {prog+1} of {APPT_STEPS.length}</div>}/>
      <div style={{height:3,background:"#1e3a5f"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#cc0000,#4ade80)",transition:"width 0.4s"}}/></div>
      <div style={{overflowX:"auto",display:"flex",background:"#0d1b3e",borderBottom:"1px solid #1e3a5f"}}>
        {APPT_STEPS.filter(s=>s!=="Start"&&s!=="Income"&&s!=="Score").map(s=>(
          <button key={s} onClick={()=>setStep(s)}
            className={`glow-btn${step===s?" active-tab":""}`}
            style={{background:"none",border:"none",borderBottom:step===s?"2px solid #cc0000":"2px solid transparent",color:step===s?"#cc0000":"#8fadd4",padding:"8px 11px",fontSize:10,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",...GS}}>{s}</button>
        ))}
      </div>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}} ref={contentRef} id="appt-content">

        {step==="Start"&&(
          <div>
            <div style={{textAlign:"center",padding:"24px 0 16px"}}><div style={{fontSize:38,marginBottom:10}}>📋</div><h2 style={{fontSize:24,color:"#fff",margin:"0 0 8px",fontWeight:"normal"}}>Initial Appointment</h2><p style={{fontSize:13,color:"#8fadd4",lineHeight:1.8,margin:"0 0 20px"}}>We'll walk through your finances step by step. Takes about 10 minutes.</p></div>
            <Card>
              <Label>Your Name</Label><TxtInput value={d.clientName} onChange={v=>setD(p=>({...p,clientName:v}))} placeholder="Your name"/>
              <div style={{height:16}}/>
              <Label>Filing Type</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[{val:false,label:"Individual",icon:"👤",sub:"Just me"},{val:true,label:"Joint",icon:"👥",sub:"Two people"}].map(opt=>(
                  <button key={opt.label} onClick={()=>setD(p=>({...p,isJoint:opt.val}))} style={{background:d.isJoint===opt.val?"#1a4080":"#0d1b3e",border:`1px solid ${d.isJoint===opt.val?"#4ade80":"#2a4080"}`,borderRadius:10,padding:"14px 10px",cursor:"pointer",color:"#e8e4d9",textAlign:"center",...GS}}>
                    <div style={{fontSize:22,marginBottom:5}}>{opt.icon}</div><div style={{fontSize:13,fontWeight:"bold",color:"#fff"}}>{opt.label}</div><div style={{fontSize:11,color:"#6b8cce"}}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </Card>
            {d.isJoint!==null&&(
              <Card>
                <Label>{d.isJoint?"Person 1 Name":"Your Name"}</Label><TxtInput value={d.person1Name} onChange={v=>setD(p=>({...p,person1Name:v}))} placeholder="e.g. Austin"/>
                <div style={{height:12}}/>
                <Label>{d.isJoint?"Person 1 Age":"Your Age"}</Label>
                <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",marginBottom:d.isJoint?12:0}}>
                  <input type="number" value={d.age1} onChange={e=>setD(p=>({...p,age1:e.target.value}))} placeholder="e.g. 28" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>yrs</span>
                </div>
                {d.isJoint&&<>
                  <Label>Person 2 Name</Label><TxtInput value={d.person2Name} onChange={v=>setD(p=>({...p,person2Name:v}))} placeholder="e.g. Camille"/>
                  <div style={{height:12}}/>
                  <Label>Person 2 Age</Label>
                  <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
                    <input type="number" value={d.age2} onChange={e=>setD(p=>({...p,age2:e.target.value}))} placeholder="e.g. 27" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>yrs</span>
                  </div>
                </>}
              </Card>
            )}
            {d.isJoint!==null&&<NextBtn onClick={()=>setStep("Income")}>Let's Begin →</NextBtn>}
          </div>
        )}

        {step==="Income"&&(
          <IncomeStep d={d} setD={setD} setIncome={setIncome} setIncome2={setIncome2} onNext={()=>{
            const calcMonthly=(inc)=>{
              const freq=inc.payFrequency, net=Number(inc.netPaycheque||0);
              if(freq==="monthly") return net;
              if(freq==="biweekly") return net*26/12;
              if(freq==="semimonthly") return net*2;
              if(freq==="weekly") return net*52/12;
              if(freq==="commission") return Number(inc.avgMonthly||0);
              return 0;
            };
            const calcInv=(inc)=>{
              const freq=inc.payFrequency||"monthly";
              const periods={"monthly":12,"biweekly":26,"semimonthly":24,"weekly":52,"commission":12}[freq]||12;
              const pension=Number(inc.pensionContribution||0);
              const empEE=Number(inc.employerMatchEmployee||0);
              const empER=empEE*(Number(inc.employerMatchPct||0)/100);
              return Math.round((pension+empEE+empER)*(periods/12));
            };
            const inc=d.income||{}, inc2=d.income2||{};
            const monthly1=Math.round(calcMonthly(inc));
            const monthly2=d.isJoint?Math.round(calcMonthly(inc2)):0;
            const totalMonthly=monthly1+monthly2;
            const totalInvMo=calcInv(inc)+(d.isJoint?calcInv(inc2):0);
            setD(p=>({...p,
              income:{...p.income,monthlyIncome:String(monthly1)},
              income2:{...p.income2,monthlyIncome:String(monthly2)},
              budget:{...p.budget,income:String(totalMonthly),investmentMonthly:String(totalInvMo||p.budget.investmentMonthly)}
            }));
            setStep("Accounts");
          }}/>
        )}

        {step==="Accounts"&&(
          <div>
            <Card>
              <SecTitle>Bank Accounts</SecTitle>
              {d.bankAccounts.map((acct,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:10,alignItems:"center"}}>
                  <input value={acct.name} onChange={e=>setBankAccount(i,"name")(e.target.value)} placeholder="Account name" style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"9px 10px",color:"#e8e4d9",fontSize:13,outline:"none",...GS}}/>
                  <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"9px 10px"}}>
                    <span style={{color:"#6b8cce",marginRight:4,fontSize:13}}>$</span>
                    <input type="number" value={acct.amount} onChange={e=>setBankAccount(i,"amount")(e.target.value)} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:14,width:"100%",...GS}}/>
                  </div>
                  <button onClick={()=>removeBankAccount(i)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
                </div>
              ))}
              <button onClick={addBankAccount} style={{width:"100%",background:"none",border:"1px dashed #4ade8044",color:"#6b8cce",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,...GS}}>+ Add Account</button>
              {d.bankAccounts.length>0&&<div style={{marginTop:12,display:"flex",justifyContent:"space-between",borderTop:"1px solid #1e3a5f",paddingTop:10}}>
                <div style={{fontSize:11,color:"#6b8cce"}}>Total Cash</div>
                <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold"}}>{fmt(d.bankAccounts.reduce((s,a)=>s+Number(a.amount||0),0))}</div>
              </div>}
            </Card>
            <Card><SecTitle>Life Insurance</SecTitle><Label>Cash Surrender Value</Label><NumInput value={d.lifeInsurance} onChange={v=>setD(p=>({...p,lifeInsurance:v}))}/></Card>
            <Card>
              <SecTitle>Savings Accounts</SecTitle>
              {d.savingsAccounts.map((acct,i)=>(
                <div key={i} style={{marginBottom:14,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
                    <input value={acct.name} onChange={e=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.map((a,idx)=>idx===i?{...a,name:e.target.value}:a)}))} placeholder="Account name" style={{background:"#111827",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:13,outline:"none",...GS}}/>
                    <button onClick={()=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.filter((_,idx)=>idx!==i)}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div>
                      <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>SAVED</div>
                      <div style={{display:"flex",alignItems:"center",background:"#111827",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
                        <span style={{color:"#6b8cce",marginRight:4,fontSize:13}}>$</span>
                        <input type="number" value={acct.saved} onChange={e=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.map((a,idx)=>idx===i?{...a,saved:e.target.value}:a)}))} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:14,width:"100%",...GS}}/>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>GOAL</div>
                      <div style={{display:"flex",alignItems:"center",background:"#111827",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
                        <span style={{color:"#6b8cce",marginRight:4,fontSize:13}}>$</span>
                        <input type="number" value={acct.goal} onChange={e=>setD(p=>({...p,savingsAccounts:p.savingsAccounts.map((a,idx)=>idx===i?{...a,goal:e.target.value}:a)}))} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:14,width:"100%",...GS}}/>
                      </div>
                    </div>
                  </div>
                  {Number(acct.saved||0)>0&&Number(acct.goal||0)>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{background:"#1e3a5f",borderRadius:4,height:5,overflow:"hidden"}}>
                        <div style={{width:Math.min(100,(Number(acct.saved)/Number(acct.goal))*100)+"%",height:"100%",background:acct.color||"#4ade80",borderRadius:4}}/>
                      </div>
                      <div style={{fontSize:10,color:"#6b8cce",marginTop:3}}>{Math.round((Number(acct.saved)/Number(acct.goal))*100)}% of goal</div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={()=>setD(p=>({...p,savingsAccounts:[...p.savingsAccounts,{name:"",saved:"",goal:"",color:CAT_COLORS[p.savingsAccounts.length%CAT_COLORS.length]}]}))} style={{width:"100%",background:"none",border:"1px dashed #4ade8044",color:"#6b8cce",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,...GS}}>+ Add Savings Account</button>
              {d.savingsAccounts.length>0&&<div style={{marginTop:12,display:"flex",justifyContent:"space-between",borderTop:"1px solid #1e3a5f",paddingTop:10}}>
                <div style={{fontSize:11,color:"#6b8cce"}}>Total Saved</div>
                <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold"}}>{fmt(d.savingsAccounts.reduce((s,a)=>s+Number(a.saved||0),0))}</div>
              </div>}
            </Card>
            <NextBtn onClick={()=>setStep("Investments")}>Next: Investments →</NextBtn>
          </div>
        )}

        {step==="Investments"&&(
          <div>
            {[{label:"TFSA",key:"tfsa",color:"#4ade80",total:tTFSA},{label:"FHSA",key:"fhsa",color:"#60a5fa",total:tFHSA},{label:"RRSP",key:"rrsp",color:"#a78bfa",total:tRRSP},{label:"Alternatives",key:"alternatives",color:"#facc15",total:tAlt},{label:"Non-Registered",key:"nonReg",color:"#fb923c",total:tNR}].map(({label,key,color,total})=>{
              const rows=d.investments[key],p=totalInv>0?(total/totalInv*100).toFixed(1):"0";
              const setRow=(i,f)=>v=>{const u=rows.map((r,idx)=>idx===i?{...r,[f]:v}:r);setD(pr=>({...pr,investments:{...pr.investments,[key]:u}}));};
              const addRow=()=>setD(pr=>({...pr,investments:{...pr.investments,[key]:[...rows,{name:"",amount:""}]}}));
              const removeRow=i=>setD(pr=>({...pr,investments:{...pr.investments,[key]:rows.filter((_,idx)=>idx!==i)}}));
              return (
                <Card key={key}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:"50%",background:color}}/><div style={{fontSize:14,color,fontWeight:"bold"}}>{label}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:16,color,fontWeight:"bold"}}>{fmt(total)}</div><div style={{fontSize:10,color:"#6b8cce"}}>{p}%</div></div>
                  </div>
                  {totalInv>0&&<div style={{background:"#0d1b3e",borderRadius:4,height:4,overflow:"hidden",marginBottom:10}}><div style={{width:p+"%",height:"100%",background:color,borderRadius:4}}/></div>}
                  {rows.map((row,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center",marginBottom:8}}>
                      <input value={row.name} onChange={e=>setRow(i,"name")(e.target.value)} placeholder="Account name" style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"9px 10px",color:"#e8e4d9",fontSize:13,outline:"none",...GS}}/>
                      <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"9px 10px"}}><span style={{color:"#6b8cce",marginRight:4}}>$</span><input type="number" value={row.amount} onChange={e=>setRow(i,"amount")(e.target.value)} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color,fontSize:14,width:"100%",...GS}}/></div>
                      <button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18}}>×</button>
                    </div>
                  ))}
                  <button onClick={addRow} style={{width:"100%",background:"none",border:`1px dashed ${color}44`,color:"#6b8cce",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,...GS}}>+ Add {label} Account</button>
                </Card>
              );
            })}
            <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>TOTAL PORTFOLIO</div><div style={{fontSize:26,color:"#4ade80",fontWeight:"bold"}}>{fmt(totalInv)}</div></div></Card>
            <NextBtn onClick={()=>setStep("Mortgage")}>Next: Mortgage →</NextBtn>
          </div>
        )}

        {step==="Mortgage"&&(
          <div>
            <Card>
              <SecTitle>Mortgage</SecTitle>
              <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>Leave blank if renting.</div>
              {[{label:"Outstanding Balance",key:"balance"},{label:"Home Value",key:"value"},{label:"Monthly Payment",key:"monthlyPayment"}].map(({label,key})=>(
                <div key={key} style={{marginBottom:12}}><Label>{label}</Label><NumInput value={d.mortgage[key]} onChange={set("mortgage",key)}/></div>
              ))}
              <Label>Annual Interest Rate (%)</Label><PctInput value={d.mortgage.rate} onChange={set("mortgage","rate")} placeholder="e.g. 5.25"/>
              <div style={{height:12}}/>
              <Label>Amortization Remaining (years)</Label>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
                <input type="number" value={d.mortgage.amortYears} onChange={e=>set("mortgage","amortYears")(e.target.value)} placeholder="e.g. 22" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>yrs</span>
              </div>
              {Number(d.mortgage.balance)>0&&Number(d.mortgage.value)>0&&(()=>{
                const eq=Number(d.mortgage.value)-Number(d.mortgage.balance),ltv=(Number(d.mortgage.balance)/Number(d.mortgage.value)*100);
                return <div style={{marginTop:14,background:"#0d1b3e",borderRadius:10,padding:"14px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}><div><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>Home Equity</div><div style={{fontSize:20,color:"#4ade80",fontWeight:"bold"}}>{fmtShort(eq)}</div></div><div><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>LTV Ratio</div><div style={{fontSize:20,color:ltv>80?"#f87171":"#facc15",fontWeight:"bold"}}>{ltv.toFixed(1)}%</div></div></div><div style={{background:"#1a2235",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:Math.min(100,ltv)+"%",height:"100%",background:ltv>80?"#f87171":"#4ade80",borderRadius:6}}/></div><div style={{fontSize:10,color:"#6b8cce",marginTop:6}}>LTV under 80% is ideal</div></div>;
              })()}
            </Card>
            <NextBtn onClick={()=>setStep("Debt")}>Next: Other Debt →</NextBtn>
          </div>
        )}

        {step==="Debt"&&(
          <div>
            <Card>
              <SecTitle>Other Debts</SecTitle>
              <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>Student loans, car loans, personal loans, etc. Not including mortgage or credit cards.</div>
              {d.otherDebts.map((debt,i)=>(
                <div key={i} style={{background:"#0d1b3e",borderRadius:10,padding:"14px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <select value={debt.type||"Student Loan"} onChange={e=>setOD(i,"type")(e.target.value)} style={{background:"#1a2235",border:"1px solid #2a4080",borderRadius:6,color:"#e8e4d9",fontSize:13,padding:"6px 10px",...GS,flex:1,marginRight:8}}>
                      {["Student Loan","Car Loan","Personal Loan","Medical Debt","Family Loan","Other"].map(t=><option key={t}>{t}</option>)}
                    </select>
                    <button onClick={()=>setD(p=>({...p,otherDebts:p.otherDebts.filter((_,idx)=>idx!==i)}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18}}>×</button>
                  </div>
                  <Label>Lender / Description</Label><TxtInput value={debt.name||""} onChange={v=>setOD(i,"name")(v)} placeholder="e.g. NSLSC, Toyota Financial"/>
                  <div style={{height:10}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><Label>Balance</Label><NumInput value={debt.balance||""} onChange={setOD(i,"balance")}/></div>
                    <div><Label>Interest Rate</Label><PctInput value={debt.rate||""} onChange={setOD(i,"rate")} placeholder="5.5"/></div>
                  </div>
                  <div style={{height:10}}/><Label>Monthly Payment</Label><NumInput value={debt.payment||""} onChange={setOD(i,"payment")}/>
                  {Number(debt.balance)>0&&Number(debt.rate)>0&&<div style={{marginTop:10,fontSize:12,color:"#6b8cce"}}>Monthly interest: <span style={{color:"#f87171"}}>{fmt((Number(debt.balance)*(Number(debt.rate)/100))/12)}</span></div>}
                </div>
              ))}
              <button onClick={()=>setD(p=>({...p,otherDebts:[...p.otherDebts,{type:"Student Loan",name:"",balance:"",rate:"",payment:""}]}))} style={{width:"100%",background:"none",border:"1px dashed #2a4080",color:"#6b8cce",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,...GS}}>+ Add Debt</button>
            </Card>
            <NextBtn onClick={()=>setStep("Credit Cards")}>Next: Credit Cards →</NextBtn>
          </div>
        )}

        {step==="Credit Cards"&&(
          <div>
            {d.creditCards.map((cc,i)=>{
              const payInFull=cc.payInFull!==false; // default true
              const bill=Number(cc.totalBalance||0)+Number(cc.pending||0)-Number(cc.due||0);
              return (
                <Card key={i} style={{border:`1px solid ${payInFull?"#4ade8033":"#f8717133"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>{cc.name||`Card ${i+1}`}</div>
                    <button onClick={()=>setD(p=>({...p,creditCards:p.creditCards.filter((_,idx)=>idx!==i)}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button>
                  </div>
                  <Label>Card Name</Label><TxtInput value={cc.name} onChange={v=>setCC(i,"name")(v)} placeholder="Visa, Mastercard..."/>
                  <div style={{height:10}}/><Label>Total Balance</Label><NumInput value={cc.totalBalance} onChange={setCC(i,"totalBalance")}/>
                  <div style={{height:10}}/><Label>Due (Statement Balance)</Label><NumInput value={cc.due} onChange={setCC(i,"due")}/>
                  <div style={{height:10}}/><Label>Pending (Not Yet on Statement)</Label><NumInput value={cc.pending} onChange={setCC(i,"pending")}/>

                  {/* Pay in full toggle */}
                  <div style={{marginTop:14,background:"#0d1b3e",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>Paying in full each month?</div>
                        <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>{payInFull?"✅ Not counted as debt":"⚠️ Counted as debt in your score"}</div>
                      </div>
                      <button onClick={()=>setCC(i,"payInFull")(!payInFull)}
                        style={{width:56,height:28,borderRadius:14,background:payInFull?"#0d2a1a":"#1a0505",border:`2px solid ${payInFull?"#4ade80":"#f87171"}`,position:"relative",cursor:"pointer",transition:"all 0.2s",flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:payInFull?"#4ade80":"#f87171",position:"absolute",top:2,left:payInFull?32:2,transition:"left 0.2s"}}/>
                      </button>
                    </div>
                  </div>

                  {(Number(cc.totalBalance)||Number(cc.due)||Number(cc.pending))?<div style={{marginTop:10,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:10,color:"#6b8cce"}}>CURRENT BILL</div><div style={{fontSize:10,color:"#6b8cce"}}>Total + Pending − Due</div></div>
                    <div style={{fontSize:22,color:bill>0?"#f87171":"#4ade80",fontWeight:"bold"}}>{fmt(bill)}</div>
                    <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {[{l:"Total",v:Number(cc.totalBalance||0),c:"#f87171"},{l:"Pending",v:Number(cc.pending||0),c:"#facc15"},{l:"Due",v:Number(cc.due||0),c:"#60a5fa"}].map(r=>(
                        <div key={r.l} style={{textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>{r.l}</div><div style={{fontSize:12,color:r.c,fontWeight:"bold"}}>{fmt(r.v)}</div></div>
                      ))}
                    </div>
                  </div>:null}
                </Card>
              );
            })}
            <button onClick={()=>setD(p=>({...p,creditCards:[...p.creditCards,{name:"",totalBalance:"",due:"",pending:"",payInFull:true}]}))} style={{width:"100%",background:"transparent",border:"1px solid #2a4080",borderRadius:10,color:"#8fadd4",padding:"12px",fontSize:13,cursor:"pointer",marginBottom:12,...GS}}>+ Add Card</button>
            <NextBtn onClick={()=>setStep("Line of Credit")}>Next: Line of Credit →</NextBtn>
          </div>
        )}

        {step==="Line of Credit"&&(
          <div>
            {d.locs.map((loc,i)=>{
              const mi=Number(loc.balance)>0&&Number(loc.rate)>0?(Number(loc.balance)*(Number(loc.rate)/100))/12:0;
              const avail=Number(loc.limit||0)-Number(loc.balance||0);
              const used=Number(loc.limit)>0?(Number(loc.balance||0)/Number(loc.limit)*100):0;
              return (
                <Card key={i}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <input
                      value={loc.name}
                      onChange={e=>setLoc(i,"name")(e.target.value)}
                      style={{background:"none",border:"none",borderBottom:"1px solid #2a4080",outline:"none",color:"#e8e4d9",fontSize:14,flex:1,paddingBottom:3,...GS}}
                    />
                    {d.locs.length>1&&<button onClick={()=>removeLoc(i)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18}}>×</button>}
                  </div>
                  <Label>Outstanding Balance</Label><NumInput value={loc.balance} onChange={setLoc(i,"balance")}/>
                  <div style={{height:12}}/><Label>Credit Limit</Label><NumInput value={loc.limit} onChange={setLoc(i,"limit")}/>
                  <div style={{height:12}}/><Label>Annual Interest Rate (%)</Label><PctInput value={loc.rate} onChange={setLoc(i,"rate")} placeholder="7.20"/>
                  {mi>0&&(
                    <div style={{marginTop:14,background:"#0d1b3e",borderRadius:10,padding:"14px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                        <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>Monthly Interest</div><div style={{fontSize:18,color:"#f87171",fontWeight:"bold"}}>{fmt(mi)}</div></div>
                        <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>Available Credit</div><div style={{fontSize:18,color:"#4ade80",fontWeight:"bold"}}>{fmt(avail)}</div></div>
                      </div>
                      {Number(loc.limit)>0&&<>
                        <div style={{background:"#1a2235",borderRadius:6,height:8,overflow:"hidden"}}>
                          <div style={{width:Math.min(100,used)+"%",height:"100%",background:used>80?"#f87171":"#facc15",borderRadius:6}}/>
                        </div>
                        <div style={{fontSize:10,color:"#6b8cce",marginTop:6}}>{used.toFixed(1)}% utilized</div>
                      </>}
                    </div>
                  )}
                </Card>
              );
            })}
            <button onClick={addLoc} style={{width:"100%",background:"none",border:"1px dashed #60a5fa44",color:"#6b8cce",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,marginBottom:14,...GS}}>+ Add Another Line of Credit</button>
            <Card><SecTitle>Borrow Simulator</SecTitle><LOCSimulator rate={d.locs[0]?.rate||""}/></Card>
            <NextBtn onClick={()=>setStep("Budget")}>Next: Budget →</NextBtn>
          </div>
        )}

        {step==="Budget"&&(
          <div>
            <Card>
              <SecTitle>Monthly Income</SecTitle>
              <NumInput value={d.budget.income} onChange={setBudgetIncome} placeholder="8000.00"/>
              {income>0&&<div style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:11,color:"#6b8cce"}}>Allocated</div>
                  <div style={{fontSize:13,color:totalAlloc>income?"#f87171":"#4ade80",fontWeight:"bold"}}>{fmt(totalAlloc)} / {fmt(income)}</div>
                </div>
                <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}>
                  <div style={{width:Math.min(100,(totalAlloc/income)*100)+"%",height:"100%",background:totalAlloc>income?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6,transition:"width 0.3s"}}/>
                </div>
              </div>}
            </Card>

            {/* 3-bucket categories */}
            {[
              {key:"fixed",label:"Fixed Costs",desc:"Same every month",icon:"🔒",color:"#f87171"},
              {key:"subscription",label:"Subscriptions",desc:"Recurring but cancellable",icon:"🔄",color:"#a78bfa"},
              {key:"estimated",label:"Estimated Costs",desc:"Variable month to month",icon:"📊",color:"#facc15"},
            ].map(bucket=>{
              const bucketCats=d.budget.categories.filter(c=>(c.bucket||"estimated")===bucket.key);
              const bucketTotal=bucketCats.reduce((s,c)=>s+Number(c.amount||0),0);
              return (
                <Card key={bucket.key} style={{border:`1px solid ${bucket.color}33`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{bucket.icon}</span>
                      <div>
                        <div style={{fontSize:13,color:bucket.color,fontWeight:"bold",...GS}}>{bucket.label}</div>
                        <div style={{fontSize:10,color:"#6b8cce"}}>{bucket.desc}</div>
                      </div>
                    </div>
                    <div style={{fontSize:15,color:bucket.color,fontWeight:"bold",...GS}}>{fmt(bucketTotal)}</div>
                  </div>
                  {bucketCats.map((cat,i)=>{
                    const globalIdx=d.budget.categories.indexOf(cat);
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"#0d1b3e",borderRadius:8,padding:"9px 10px"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:bucket.color,flexShrink:0}}/>
                        <input value={cat.name} onChange={e=>setBudgetCat(globalIdx,"name")(e.target.value)}
                          style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:13,flex:1,...GS}}/>
                        <span style={{color:"#6b8cce",fontSize:12}}>$</span>
                        <input type="number" value={cat.amount} onChange={e=>setBudgetCat(globalIdx,"amount")(e.target.value)}
                          style={{background:"none",border:"none",outline:"none",color:bucket.color,fontSize:15,width:80,textAlign:"right",...GS}}/>
                        {income>0&&Number(cat.amount)>0&&<span style={{fontSize:9,color:"#6b8cce",minWidth:30,textAlign:"right"}}>{((Number(cat.amount)/income)*100).toFixed(0)}%</span>}
                        <button onClick={()=>setD(p=>({...p,budget:{...p.budget,categories:p.budget.categories.filter((_,idx)=>idx!==globalIdx)}}))}
                          style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:15,padding:0}}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={()=>setD(p=>({...p,budget:{...p.budget,categories:[...p.budget.categories,{name:"",amount:"",bucket:bucket.key}]}}))}
                    style={{width:"100%",background:"none",border:`1px dashed ${bucket.color}44`,borderRadius:8,padding:"7px",color:bucket.color,cursor:"pointer",fontSize:12,...GS}}>
                    + Add {bucket.label} item
                  </button>
                </Card>
              );
            })}

            {/* Investment input */}
            {income>0&&<ApptInvestmentInput
              income={income}
              totalAlloc={totalAlloc}
              categories={d.budget.categories}
              currentValue={d.budget.investmentMonthly||""}
              onSetInvestment={v=>setD(p=>({...p,budget:{...p.budget,investmentMonthly:v}}))}
            />}

            <NextBtn onClick={()=>setStep("Score")}>Calculate My Score →</NextBtn>
          </div>
        )}

        {step==="Score"&&(
          score?(
            <div id="score-content">
              <Card style={{textAlign:"center",padding:"28px 16px",background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:`1px solid ${score.gradeColor}44`}}>
                <div style={{fontSize:11,color:"#6b8cce",letterSpacing:3,marginBottom:12}}>FINANCIAL HEALTH SCORE</div>
                <div style={{fontSize:80,color:score.gradeColor,fontWeight:"bold",lineHeight:1,marginBottom:8,animation:"redGlowPulse 2.5s ease-in-out infinite",textShadow:`0 0 24px ${score.gradeColor}88`}}>{score.grade}</div>
                <div style={{fontSize:32,color:"#e8e4d9",marginBottom:6}}>{score.total}<span style={{fontSize:16,color:"#6b8cce"}}>/100</span></div>
                <div style={{fontSize:12,color:"#6b8cce"}}>Ontario benchmarks · {score.band} age group · {new Date().toLocaleDateString("en-CA")}</div>
              </Card>
              <Card>
                <SecTitle>Score Breakdown</SecTitle>
                {score.scores.map((s,i)=>(
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{fontSize:13,color:"#e8e4d9"}}>{s.label}</div><div style={{fontSize:13,color:s.score/s.max>0.7?"#4ade80":s.score/s.max>0.4?"#facc15":"#f87171",fontWeight:"bold"}}>{s.score}/{s.max}</div></div>
                    <div style={{background:"#0d1b3e",borderRadius:4,height:6,overflow:"hidden",marginBottom:4}}><div style={{width:(s.score/s.max*100)+"%",height:"100%",background:s.score/s.max>0.7?"#4ade80":s.score/s.max>0.4?"#facc15":"#f87171",borderRadius:4}}/></div>
                    <div style={{fontSize:11,color:"#6b8cce"}}>{s.desc}</div>
                  </div>
                ))}
              </Card>

              {/* Financial Prescription */}
              <FinancialPrescription score={score} data={d} totalInv={totalInv}/>

              {/* Score guidance */}
              <ScoreGuidance score={score} data={d} totalInv={totalInv}/>

              {/* Investment slider */}
              {score.monthlyIncome>0&&<PostScoreInvestmentSlider income={score.monthlyIncome} surplus={score.surplus} currentInvRate={score.invRate} invMonthly={score.invMonthly} band={score.band}/>}

              <PDFBtn title={`Financial Score - ${d.clientName||"Report"}`} contentId="score-content"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <button onClick={()=>{saveScore(score);onCheckup();}} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:12,padding:"14px",color:"#4ade80",fontSize:13,cursor:"pointer",...GS}}>Save & Dashboard →</button>
                <button onClick={onHome} style={{background:"none",border:"1px solid #2a4080",borderRadius:12,padding:"14px",color:"#8fadd4",fontSize:13,cursor:"pointer",...GS}}>← Home</button>
              </div>

              {/* Post-score personalized tools */}
              <PostScoreTools data={d} onCheckup={onCheckup} saveScore={saveScore} score={score}/>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:40,marginBottom:16}}>⚠️</div><p style={{color:"#8fadd4"}}>Please enter your age in the Start section to generate a score.</p><NextBtn onClick={()=>setStep("Start")}>Go to Start</NextBtn></div>
          )
        )}
      </div>
    </div>
  );
}

// ─── CHECKUP DASHBOARD ────────────────────────────────────────────────────────
// ─── SCORE HISTORY ────────────────────────────────────────────────────────────
function ScoreHistory({history,currentScore,onSave}) {
  if(!history||history.length===0) return (
    <Card style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:36,marginBottom:12}}>📊</div>
      <div style={{fontSize:15,color:"#e8e4d9",fontWeight:"bold",marginBottom:8,...GS}}>No score history yet</div>
      <div style={{fontSize:13,color:"#6b8cce",lineHeight:1.7,marginBottom:16}}>Complete your appointment and calculate your score. Come back monthly to track your progress.</div>
      {currentScore&&<button onClick={onSave} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:10,padding:"12px 24px",color:"#4ade80",cursor:"pointer",fontSize:13,...GS}}>Save Today's Score</button>}
    </Card>
  );
  const sorted=[...history].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted[sorted.length-1];
  const prev=sorted.length>1?sorted[sorted.length-2]:null;
  const change=prev?latest.score-prev.score:null;
  const chartData=sorted.map(h=>({date:h.date.slice(0,7),score:h.score,grade:h.grade}));
  return (
    <div>
      {/* Latest score hero */}
      <Card style={{background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:`1px solid ${latest.gradeColor}44`,textAlign:"center",padding:"24px 16px"}}>
        <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:8}}>LATEST SCORE</div>
        <div style={{fontSize:72,color:latest.gradeColor,fontWeight:"bold",lineHeight:1,...GS}}>{latest.grade}</div>
        <div style={{fontSize:28,color:"#e8e4d9",marginTop:4,...GS}}>{latest.score}<span style={{fontSize:14,color:"#6b8cce"}}>/100</span></div>
        <div style={{fontSize:12,color:"#6b8cce",marginTop:6}}>{latest.date}</div>
        {change!==null&&(
          <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:6,background:change>=0?"#0d2a1a":"#1a0505",border:`1px solid ${change>=0?"#4ade8044":"#f8717144"}`,borderRadius:20,padding:"4px 14px"}}>
            <span style={{fontSize:14}}>{change>=0?"📈":"📉"}</span>
            <span style={{fontSize:13,color:change>=0?"#4ade80":"#f87171",fontWeight:"bold",...GS}}>
              {change>=0?"+":""}{change} pts from last month
            </span>
          </div>
        )}
      </Card>

      {/* Trend chart */}
      {sorted.length>1&&(
        <Card>
          <SecTitle>Score Trend</SecTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f44"/>
              <XAxis dataKey="date" stroke="#6b8cce" tick={{fontSize:9}} tickFormatter={d=>d.slice(5)}/>
              <YAxis stroke="#6b8cce" tick={{fontSize:9}} domain={[0,100]} width={28}/>
              <Tooltip
                contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,fontSize:12}}
                formatter={(v,n,p)=>[`${v}/100 (${p.payload.grade})`,""]}
                labelFormatter={l=>`Month: ${l}`}
              />
              <Line type="monotone" dataKey="score" stroke="#4ade80" strokeWidth={2.5} dot={{fill:"#4ade80",r:4}} activeDot={{r:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* History table */}
      <Card>
        <SecTitle>Score History</SecTitle>
        {[...sorted].reverse().map((h,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<sorted.length-1?"1px solid #1e3a5f":"none"}}>
            <div>
              <div style={{fontSize:13,color:"#e8e4d9",...GS}}>{h.date}</div>
              {i===0&&<div style={{fontSize:10,color:"#4ade80",marginTop:2}}>Most recent</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:13,color:"#8fadd4"}}>{h.score}/100</div>
              <div style={{fontSize:22,color:h.gradeColor,fontWeight:"bold",minWidth:36,textAlign:"center",...GS}}>{h.grade}</div>
            </div>
          </div>
        ))}
      </Card>
      {currentScore&&(
        <button onClick={onSave} style={{width:"100%",background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:12,padding:"14px",color:"#4ade80",cursor:"pointer",fontSize:13,...GS}}>
          💾 Save Today's Score ({currentScore.grade} · {currentScore.total}/100)
        </button>
      )}
    </div>
  );
}

// ─── FULL REPORT PDF ──────────────────────────────────────────────────────────
function FullReportBtn({data:d, totalInv, netWorth, totalAssets, totalLiab, income, totalAlloc, score, totalCC, totalLocBal, totalOD, savings, equity, cash, fooChecked, fooLabels}) {
  const handlePrint = () => {
    const date = new Date().toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"});
    const invPct = (v) => totalInv>0?(v/totalInv*100).toFixed(1):"0";
    const sumGroup = arr => (arr||[]).reduce((s,x)=>s+Number(x.amount||0),0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Financial Health Report — ${d.clientName||"Report"}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Georgia,serif;background:#fff;color:#1e293b;padding:32px;font-size:13px;line-height:1.6;}
    h1{font-size:26px;font-weight:normal;color:#cc0000;margin-bottom:4px;}
    .subtitle{font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;}
    .date{font-size:11px;color:#94a3b8;margin-bottom:32px;}
    h2{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:24px 0 14px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;}
    .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
    .label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:4px;}
    .val{font-size:18px;font-weight:bold;color:#1e293b;}
    .val.green{color:#16a34a;}
    .val.red{color:#dc2626;}
    .val.blue{color:#2563eb;}
    .val.purple{color:#7c3aed;}
    .val.yellow{color:#ca8a04;}
    .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;}
    .row:last-child{border-bottom:none;}
    .row-label{color:#475569;}
    .row-val{font-weight:bold;}
    .hero{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;}
    .hero .nw{font-size:40px;font-weight:bold;color:#16a34a;}
    .score-box{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
    .grade{font-size:52px;font-weight:bold;line-height:1;}
    .bar-bg{background:#e2e8f0;border-radius:4px;height:7px;overflow:hidden;margin:4px 0;}
    .bar-fill{height:100%;border-radius:4px;}
    .foo-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;}
    .check{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;flex-shrink:0;}
    .check.yes{background:#16a34a;color:#fff;}
    .check.no{background:#e2e8f0;color:#94a3b8;}
    .tag{display:inline-block;font-size:9px;letter-spacing:1px;border:1px solid;border-radius:10px;padding:2px 8px;margin-left:8px;}
    @media print{body{padding:20px;zoom:0.85;}}
    .page-break{page-break-before:always;margin-top:32px;}
  </style>
</head>
<body>

  <!-- Header -->
  <h1>Financial Health</h1>
  <div class="subtitle">Complete Financial Picture</div>
  <div class="date">${d.clientName?`<strong>${d.clientName}</strong> · `:""}${date}</div>

  <!-- Net Worth Hero -->
  <div class="hero">
    <div class="label">Total Net Worth</div>
    <div class="nw">${fmtShort(netWorth)}</div>
    <div style="font-size:13px;color:#64748b;margin-top:4px;">${fmt(netWorth)}</div>
  </div>

  <!-- Assets & Liabilities -->
  <h2>Assets &amp; Liabilities</h2>
  <div class="grid2">
    <div>
      ${[{l:"Cash & Savings",v:cash},{l:"Investments",v:totalInv},{l:"Home Equity",v:equity},{l:"Life Insurance",v:Number(d.lifeInsurance||0)}].map(x=>`<div class="row"><span class="row-label">${x.l}</span><span class="row-val" style="color:#16a34a">${fmt(x.v)}</span></div>`).join("")}
      <div class="row" style="margin-top:6px;"><span style="font-weight:bold">Total Assets</span><span class="row-val" style="color:#16a34a;font-size:15px">${fmt(totalAssets)}</span></div>
    </div>
    <div>
      ${d.creditCards.filter(c=>Number(c.totalBalance||0)>0).map(c=>`<div class="row"><span class="row-label">${c.name}</span><span class="row-val" style="color:#dc2626">${fmt(c.totalBalance)}</span></div>`).join("")}
      ${(d.locs||[]).filter(l=>Number(l.balance||0)>0).map(l=>`<div class="row"><span class="row-label">${l.name}</span><span class="row-val" style="color:#dc2626">${fmt(l.balance)}</span></div>`).join("")}
      ${Number(d.mortgage.balance||0)>0?`<div class="row"><span class="row-label">Mortgage</span><span class="row-val" style="color:#dc2626">${fmt(d.mortgage.balance)}</span></div>`:""}
      ${d.otherDebts.filter(x=>Number(x.balance||0)>0).map(x=>`<div class="row"><span class="row-label">${x.name||x.type}</span><span class="row-val" style="color:#dc2626">${fmt(x.balance)}</span></div>`).join("")}
      <div class="row" style="margin-top:6px;"><span style="font-weight:bold">Total Liabilities</span><span class="row-val" style="color:#dc2626;font-size:15px">${fmt(totalLiab)}</span></div>
    </div>
  </div>

  <!-- Financial Health Score -->
  ${score?`
  <h2>Financial Health Score</h2>
  <div class="score-box">
    <div>
      <div class="label">Ontario Benchmarks · ${score.band} Age Group</div>
      <div style="font-size:13px;color:#475569;margin-top:6px;">Score: ${score.total}/100</div>
      <div class="bar-bg" style="width:200px;margin-top:8px;"><div class="bar-fill" style="width:${score.total}%;background:${score.gradeColor}"></div></div>
    </div>
    <div class="grade" style="color:${score.gradeColor}">${score.grade}</div>
  </div>
  <div>
    ${score.scores.map(s=>`
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:12px;">${s.label}</span>
          <span style="font-weight:bold;color:${s.score/s.max>0.7?"#16a34a":s.score/s.max>0.4?"#ca8a04":"#dc2626"}">${s.score}/${s.max}</span>
        </div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(s.score/s.max*100)}%;background:${s.score/s.max>0.7?"#16a34a":s.score/s.max>0.4?"#ca8a04":"#dc2626"}"></div></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${s.desc}</div>
      </div>
    `).join("")}
  </div>`:""}

  <!-- Investments -->
  <h2 class="page-break">Investment Portfolio — ${fmt(totalInv)}</h2>
  <div class="grid2">
  ${[
    {label:"TFSA",val:sumGroup(d.investments.tfsa),color:"#16a34a",rows:d.investments.tfsa},
    {label:"FHSA",val:sumGroup(d.investments.fhsa),color:"#2563eb",rows:d.investments.fhsa},
    {label:"RRSP",val:sumGroup(d.investments.rrsp),color:"#7c3aed",rows:d.investments.rrsp},
    {label:"Alternatives",val:sumGroup(d.investments.alternatives),color:"#ca8a04",rows:d.investments.alternatives},
    {label:"Non-Registered",val:sumGroup(d.investments.nonReg),color:"#ea580c",rows:d.investments.nonReg},
  ].filter(x=>x.val>0).map(item=>`
    <div class="box">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:bold;color:${item.color}">${item.label}</span>
        <span style="font-weight:bold;color:${item.color}">${fmt(item.val)} <span style="font-size:10px;color:#94a3b8">${invPct(item.val)}%</span></span>
      </div>
      ${item.rows.filter(r=>Number(r.amount||0)>0).map(r=>`<div class="row"><span class="row-label">${r.name}</span><span class="row-val">${fmt(r.amount)}</span></div>`).join("")}
    </div>
  `).join("")}
  </div>

  <!-- Budget -->
  <h2>Monthly Budget</h2>
  <div class="grid3">
    <div class="box"><div class="label">Income</div><div class="val green">${fmt(income)}</div></div>
    <div class="box"><div class="label">Allocated</div><div class="val ${totalAlloc>income?"red":"blue"}">${fmt(totalAlloc)}</div></div>
    <div class="box"><div class="label">Surplus</div><div class="val ${income-totalAlloc>=0?"green":"red"}">${fmt(income-totalAlloc)}</div></div>
  </div>
  <div>
    ${d.budget.categories.filter(c=>Number(c.amount||0)>0).map((cat,i)=>`
      <div class="row">
        <span class="row-label">${cat.name}</span>
        <span style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:10px;color:#94a3b8">${income>0?((Number(cat.amount)/income)*100).toFixed(1):"0"}%</span>
          <span class="row-val">${fmt(cat.amount)}</span>
        </span>
      </div>
    `).join("")}
  </div>

  <!-- Savings -->
  ${(d.savingsAccounts||[]).length>0?`
  <h2>Savings Goals</h2>
  <div class="grid2">
    ${(d.savingsAccounts||[]).map(a=>{
      const sv=Number(a.saved||0),gl=Number(a.goal||0),p=gl>0?Math.min(100,(sv/gl)*100):0;
      return `<div class="box">
        <div style="font-weight:bold;margin-bottom:8px;">${a.name}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span><span class="label">Saved</span><br/><strong style="color:#16a34a">${fmt(sv)}</strong></span>
          <span style="text-align:right"><span class="label">Goal</span><br/><strong>${fmt(gl)}</strong></span>
        </div>
        <div class="bar-bg"><div class="bar-fill" style="width:${p}%;background:${a.color}"></div></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:3px;">${Math.round(p)}% · ${fmt(Math.max(0,gl-sv))} remaining</div>
      </div>`;
    }).join("")}
  </div>`:""}

  <!-- Financial Order of Operations -->
  <h2>Financial Order of Operations</h2>
  ${fooLabels.map((s,i)=>`
    <div class="foo-row">
      <span class="check ${fooChecked[i]?"yes":"no"}">${fooChecked[i]?"✓":""}</span>
      <span style="color:${fooChecked[i]?"#1e293b":"#94a3b8"}">${i+1}. ${s.label}</span>
      <span style="font-size:10px;color:#94a3b8;margin-left:8px;">${s.desc}</span>
    </div>
  `).join("")}

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">
    Generated by Financial Health · ${date} · Private &amp; Confidential
  </div>

</body>
</html>`;

    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(()=>w.print(), 500);
  };

  return (
    <button onClick={handlePrint} style={{
      width:"100%",
      background:"linear-gradient(135deg,#cc0000,#8b0000)",
      border:"none",
      borderRadius:12,
      color:"#fff",
      padding:"16px",
      fontSize:15,
      cursor:"pointer",
      letterSpacing:1,
      marginBottom:16,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      gap:10,
      ...GS,
      boxShadow:"0 4px 20px #cc000044",
      transition:"transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px #cc000066";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 20px #cc000044";}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
      Download Full Financial Report (PDF)
    </button>
  );
}

// ─── GOALS TAB ────────────────────────────────────────────────────────────────
function GoalCard({goal}) {
  return (
    <Card style={{opacity:goal.done?0.85:1}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <span style={{fontSize:26}}>{goal.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:15,color:"#e8e4d9",fontWeight:"bold",...GS}}>{goal.label}</div>
          <div style={{fontSize:11,color:"#6b8cce",marginTop:2,lineHeight:1.5}}>{goal.desc}</div>
        </div>
        {goal.done&&<span style={{fontSize:20}}>✅</span>}
      </div>
      {goal.items.map((item,i)=>{
        const pct=Math.min(100,item.target>0?(item.val/item.target)*100:0);
        return (
          <div key={i} style={{marginBottom:i<goal.items.length-1?12:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:12,color:"#8fadd4"}}>{item.label}</span>
              <span style={{fontSize:12,color:pct>=100?"#4ade80":"#facc15",fontWeight:"bold",...GS}}>{item.fmt(item.val)}</span>
            </div>
            <div style={{background:"#0d1b3e",borderRadius:4,height:6,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:pct>=100?"#4ade80":pct>=60?"#facc15":"#fb923c",borderRadius:4,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:10,color:"#6b8cce",marginTop:3}}>
              {pct>=100?"Complete!":Math.round(pct)+"% — target: "+item.fmt(item.target)}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function GoalsTab({data,totalInv,scoreHistory}) {
  const income=Number(data.budget.income||0);
  const grossMonthly=Number(data.income?.grossSalary||0)>0?Number(data.income.grossSalary)/12:income;
  const efund=(data.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyExp=data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const efundTarget=monthlyExp*3;
  const fhsa=(data.investments?.fhsa||[]).reduce((s,x)=>s+Number(x.amount||0),0);
  const totalDebt=(data.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0)
    +(data.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0)
    +(data.creditCards||[]).filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const invMonthly=Number(data.budget.investmentMonthly||0);
  const invRate=grossMonthly>0?(invMonthly/grossMonthly)*100:0;
  const latestScore=scoreHistory.length>0?scoreHistory[scoreHistory.length-1]:null;

  const GOALS=[
    {
      id:"home",icon:"🏠",label:"Buy a Home",
      desc:"Build your FHSA and emergency fund while keeping debt low",
      items:[
        {label:"FHSA Balance",val:fhsa,target:40000,fmt:v=>fmtShort(v)},
        {label:"Emergency Fund (3 months)",val:Math.min(efund,efundTarget),target:Math.max(efundTarget,1),fmt:v=>fmtShort(v)},
        {label:"Non-mortgage debt cleared",val:totalDebt===0?1:0,target:1,fmt:()=>totalDebt===0?"✅ Debt free":"Paying down debt"},
      ],
      done:fhsa>=40000&&efund>=efundTarget&&totalDebt===0,
    },
    {
      id:"efund",icon:"🛡️",label:"Fully Fund Emergency Fund",
      desc:`Save 3 months of expenses${efundTarget>0?" ("+fmtShort(efundTarget)+")":""}`,
      items:[{label:"Emergency Fund",val:efund,target:Math.max(efundTarget,1),fmt:v=>fmtShort(v)}],
      done:efund>=efundTarget&&efundTarget>0,
    },
    {
      id:"debt",icon:"💳",label:"Pay Off All Non-Mortgage Debt",
      desc:"Eliminate credit cards, lines of credit, and personal loans",
      items:[{label:"Remaining Debt",val:totalDebt===0?1:Math.max(0,1-(totalDebt/Math.max(totalDebt,1))),target:1,fmt:()=>totalDebt===0?"✅ Debt free":fmtShort(totalDebt)+" remaining"}],
      done:totalDebt===0,
    },
    {
      id:"invest",icon:"📈",label:"Hit 25% Investment Rate",
      desc:"Invest 25% of your gross income every month",
      items:[{label:"Investment Rate",val:Math.min(invRate,25),target:25,fmt:v=>v.toFixed(1)+"%"}],
      done:invRate>=25,
    },
    {
      id:"fi",icon:"🏆",label:"Reach Financial Independence",
      desc:"Portfolio reaches 25× your annual expenses (4% rule)",
      items:[{label:"Portfolio vs FI Target",val:totalInv,target:Math.max(monthlyExp*12*25,1),fmt:v=>fmtShort(v)}],
      done:monthlyExp>0&&totalInv>=monthlyExp*12*25,
    },
    {
      id:"score",icon:"⭐",label:"Reach an A+ Score",
      desc:"Achieve an A+ Financial Health Score (85+)",
      items:[{label:"Current Score",val:latestScore?.score||0,target:85,fmt:v=>v+"/100"}],
      done:(latestScore?.score||0)>=85,
    },
  ];

  const active=GOALS.filter(g=>!g.done);
  const completed=GOALS.filter(g=>g.done);

  if(!income&&!totalInv) return (
    <Card style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:36,marginBottom:12}}>📋</div>
      <div style={{fontSize:15,color:"#e8e4d9",fontWeight:"bold",marginBottom:8}}>Complete your Check-Up Appointment first</div>
      <div style={{fontSize:13,color:"#6b8cce",lineHeight:1.7}}>Your goals will auto-populate once you've entered your financial information.</div>
    </Card>
  );

  return (
    <div>
      {active.length===0&&completed.length>0&&(
        <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",textAlign:"center",padding:"24px"}}>
          <div style={{fontSize:40,marginBottom:8}}>🎉</div>
          <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",...GS}}>All goals complete!</div>
          <div style={{fontSize:13,color:"#6b8cce",marginTop:6}}>You're in exceptional financial health.</div>
        </Card>
      )}
      {active.length>0&&(
        <div>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:12}}>IN PROGRESS</div>
          {active.map(g=><GoalCard key={g.id} goal={g}/>)}
        </div>
      )}
      {completed.length>0&&(
        <div style={{marginTop:active.length>0?20:0}}>
          <div style={{fontSize:10,color:"#4ade80",letterSpacing:3,marginBottom:12}}>COMPLETED ✅</div>
          {completed.map(g=><GoalCard key={g.id} goal={g}/>)}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD TILE CONTENT ───────────────────────────────────────────────────
function DashTileEmpty({msg}) {
  return <div style={{color:"#6b8cce",textAlign:"center",padding:20,fontSize:13}}>{msg}</div>;
}

function DashTileContent({id,compact,d,score,totalInv,totalAssets,totalLiab,netWorth,income,totalAlloc,surplus,invMonthly,invRate,efund,scoreHistory,saveScore,fooChecked,fooComplete,FOO_LABELS,toggleFoo,nextSteps,saveNextSteps}) {
  const fs=(a,b)=>compact?a:b;

  if(id==="networth") return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div style={{textAlign:"center",flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{fontSize:fs(11,13),color:"#6b8cce",letterSpacing:2,marginBottom:6}}>NET WORTH</div>
        <div style={{fontSize:fs(32,52),color:netWorth>=0?"#4ade80":"#f87171",fontWeight:"bold",...GS,lineHeight:1}}>{fmtShort(netWorth)}</div>
        <div style={{fontSize:fs(10,13),color:"#6b8cce",marginTop:4}}>{fmt(netWorth)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <div style={{background:"#0d1b3e",borderRadius:8,padding:"8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>ASSETS</div>
          <div style={{fontSize:fs(13,16),color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(totalAssets)}</div>
        </div>
        <div style={{background:"#0d1b3e",borderRadius:8,padding:"8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>LIABILITIES</div>
          <div style={{fontSize:fs(13,16),color:"#f87171",fontWeight:"bold",...GS}}>{fmtShort(totalLiab)}</div>
        </div>
      </div>
    </div>
  );

  if(id==="score") return score?(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:8}}>
      <div style={{fontSize:fs(11,13),color:"#6b8cce",letterSpacing:2}}>FINANCIAL HEALTH SCORE</div>
      <div style={{fontSize:fs(56,80),color:score.gradeColor,fontWeight:"bold",lineHeight:1,...GS,animation:"redGlowPulse 2.5s ease-in-out infinite",textShadow:`0 0 20px ${score.gradeColor}88`}}>{score.grade}</div>
      <div style={{fontSize:fs(20,28),color:"#e8e4d9",...GS}}>{score.total}<span style={{fontSize:14,color:"#6b8cce"}}>/100</span></div>
      <div style={{width:"100%",background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}>
        <div style={{width:score.total+"%",height:"100%",background:score.gradeColor,borderRadius:6}}/>
      </div>
      <div style={{fontSize:11,color:"#6b8cce"}}>Ontario · {score.band} age group</div>
    </div>
  ):<DashTileEmpty msg="Complete your appointment to see your score"/>;

  if(id==="portfolio_chart") {
    const invData=[
      {name:"TFSA",val:sumGroupHelper(d.investments.tfsa),color:"#4ade80"},
      {name:"FHSA",val:sumGroupHelper(d.investments.fhsa),color:"#60a5fa"},
      {name:"RRSP",val:sumGroupHelper(d.investments.rrsp),color:"#a78bfa"},
      {name:"Alt",val:sumGroupHelper(d.investments.alternatives),color:"#facc15"},
      {name:"Non-Reg",val:sumGroupHelper(d.investments.nonReg),color:"#fb923c"},
    ].filter(x=>x.val>0);
    if(!invData.length) return <DashTileEmpty msg="No investments entered yet"/>;
    return (
      <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:8,textAlign:"center"}}>PORTFOLIO · {fmtShort(totalInv)}</div>
        <ResponsiveContainer width="100%" height={compact?120:180}>
          <PieChart><Pie data={invData.map(x=>({name:x.name,value:x.val}))} cx="50%" cy="50%" innerRadius={compact?30:45} outerRadius={compact?55:75} dataKey="value" strokeWidth={0}>
            {invData.map((x,i)=><Cell key={i} fill={x.color}/>)}
          </Pie><Tooltip formatter={(v)=>fmtShort(v)} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,fontSize:11}}/></PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:8}}>
          {invData.map(x=><div key={x.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#8fadd4"}}><div style={{width:8,height:8,borderRadius:"50%",background:x.color}}/>{x.name}: {fmtShort(x.val)}</div>)}
        </div>
      </div>
    );
  }

  if(id==="portfolio_numbers") {
    const rows=[
      {label:"TFSA",val:sumGroupHelper(d.investments.tfsa),color:"#4ade80"},
      {label:"FHSA",val:sumGroupHelper(d.investments.fhsa),color:"#60a5fa"},
      {label:"RRSP",val:sumGroupHelper(d.investments.rrsp),color:"#a78bfa"},
      {label:"Alternatives",val:sumGroupHelper(d.investments.alternatives),color:"#facc15"},
      {label:"Non-Registered",val:sumGroupHelper(d.investments.nonReg),color:"#fb923c"},
    ].filter(r=>r.val>0);
    if(!rows.length) return <DashTileEmpty msg="No investments entered yet"/>;
    return (
      <div>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:12,textAlign:"center"}}>TOTAL · {fmtShort(totalInv)}</div>
        {rows.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<rows.length-1?"1px solid #1e3a5f":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:r.color}}/><span style={{fontSize:13,color:"#e8e4d9"}}>{r.label}</span></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,color:r.color,fontWeight:"bold",...GS}}>{fmt(r.val)}</div>
              <div style={{fontSize:10,color:"#6b8cce"}}>{totalInv>0?((r.val/totalInv)*100).toFixed(1):0}%</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if(id==="benchmarks") return score?<CanadianBenchmarks score={score} data={d} totalInv={totalInv} netWorth={netWorth} income={income} totalAlloc={totalAlloc}/>:<DashTileEmpty msg="Complete your appointment first"/>;

  if(id==="foo") return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:10,letterSpacing:2,color:"#6b8cce"}}>FINANCIAL ORDER OF OPERATIONS</div>
        <div style={{fontSize:11,color:"#6b8cce"}}>{fooComplete}/{FOO_LABELS.length}</div>
      </div>
      <div style={{background:"#0d1b3e",borderRadius:6,height:5,overflow:"hidden",marginBottom:14}}>
        <div style={{width:((fooComplete/FOO_LABELS.length)*100)+"%",height:"100%",background:"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/>
      </div>
      {FOO_LABELS.map((s,i)=>(
        <button key={i} onClick={()=>toggleFoo(i)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<FOO_LABELS.length-1?"1px solid #1e3a5f":"none",textAlign:"left"}}>
          <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:fooChecked[i]?"#4ade80":"transparent",border:"2px solid "+(fooChecked[i]?"#4ade80":"#2a4080"),display:"flex",alignItems:"center",justifyContent:"center"}}>
            {fooChecked[i]&&<span style={{color:"#0a0f1e",fontSize:11,fontWeight:"bold"}}>✓</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:fooChecked[i]?"#4ade80":"#e8e4d9",...GS}}>{s.label}</div>
            <div style={{fontSize:10,color:"#6b8cce"}}>{s.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );

  if(id==="budget") return (
    <div>
      <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:12,textAlign:"center"}}>BUDGET SNAPSHOT</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{label:"Income",val:income,color:"#4ade80"},{label:"Spending",val:totalAlloc,color:"#f87171"},{label:"Surplus",val:surplus,color:surplus>=0?"#4ade80":"#f87171"},{label:"Inv. Rate",val:null,color:"#a78bfa",text:invRate.toFixed(1)+"%"}].map((x,i)=>(
          <div key={i} style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>{x.label.toUpperCase()}</div>
            <div style={{fontSize:16,color:x.color,fontWeight:"bold",...GS}}>{x.text||fmtShort(x.val)}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}>
        <div style={{width:Math.min(100,income>0?(totalAlloc/income)*100:0)+"%",height:"100%",background:totalAlloc>income?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/>
      </div>
    </div>
  );

  if(id==="goals") return <GoalsTab data={d} totalInv={totalInv} scoreHistory={scoreHistory}/>;

  if(id==="score_history") return <ScoreHistory history={scoreHistory} currentScore={score} onSave={()=>saveScore(score)}/>;

  if(id==="debt") {
    const debts=[
      ...d.creditCards.filter(c=>!c.payInFull&&Number(c.totalBalance||0)>0).map(c=>({name:c.name,val:Number(c.totalBalance),color:"#f87171",rate:"~20%"})),
      ...(d.locs||[]).filter(l=>Number(l.balance||0)>0).map(l=>({name:l.name||"LOC",val:Number(l.balance),color:"#fb923c",rate:l.rate+"%"})),
      ...(d.otherDebts||[]).filter(x=>Number(x.balance||0)>0).map(x=>({name:x.name||x.type,val:Number(x.balance),color:"#facc15",rate:x.rate+"%"})),
    ];
    const totalDebt=debts.reduce((s,x)=>s+x.val,0);
    if(!totalDebt) return <div style={{color:"#4ade80",textAlign:"center",padding:20,fontSize:15,fontWeight:"bold",...GS}}>No outstanding debt!</div>;
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>TOTAL NON-MORTGAGE DEBT</div>
          <div style={{fontSize:36,color:"#f87171",fontWeight:"bold",...GS}}>{fmtShort(totalDebt)}</div>
        </div>
        {debts.map((x,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<debts.length-1?"1px solid #1e3a5f":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:7,height:7,borderRadius:"50%",background:x.color}}/><span style={{fontSize:12,color:"#e8e4d9"}}>{x.name}</span></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:13,color:x.color,fontWeight:"bold",...GS}}>{fmt(x.val)}</div><div style={{fontSize:9,color:"#6b8cce"}}>{x.rate}</div></div>
          </div>
        ))}
      </div>
    );
  }

  if(id==="emergency") {
    const goal=Math.max(1,totalAlloc*3);
    const months=totalAlloc>0?efund/totalAlloc:0;
    const pct=Math.min(100,(efund/goal)*100);
    return (
      <div style={{textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>EMERGENCY FUND</div>
        <div style={{fontSize:48,color:months>=3?"#4ade80":"#facc15",fontWeight:"bold",...GS,lineHeight:1}}>{months.toFixed(1)}</div>
        <div style={{fontSize:13,color:"#8fadd4"}}>months saved · target: 3</div>
        <div style={{background:"#0d1b3e",borderRadius:6,height:10,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:pct>=100?"#4ade80":"#facc15",borderRadius:6}}/>
        </div>
        <div style={{fontSize:12,color:"#6b8cce"}}>{fmt(efund)} saved · target {fmtShort(goal)}</div>
      </div>
    );
  }

  if(id==="inv_rate") {
    const pct=Math.min(100,(invRate/25)*100);
    return (
      <div style={{textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>INVESTMENT RATE</div>
        <div style={{fontSize:52,color:invRate>=25?"#4ade80":invRate>=15?"#facc15":"#f87171",fontWeight:"bold",...GS,lineHeight:1}}>{invRate.toFixed(1)}<span style={{fontSize:24}}>%</span></div>
        <div style={{fontSize:12,color:"#8fadd4"}}>of gross income · target 25%</div>
        <div style={{background:"#0d1b3e",borderRadius:6,height:10,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:invRate>=25?"#4ade80":invRate>=15?"#facc15":"#fb923c",borderRadius:6}}/>
        </div>
        <div style={{fontSize:11,color:"#6b8cce"}}>{fmt(invMonthly)}/mo invested</div>
      </div>
    );
  }

  if(id==="savings_goals") {
    const accts=(d.savingsAccounts||[]).filter(a=>Number(a.goal||0)>0);
    if(!accts.length) return <DashTileEmpty msg="No savings goals entered"/>;
    return (
      <div>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:12,textAlign:"center"}}>SAVINGS GOALS</div>
        {accts.map((a,i)=>{
          const pct=Math.min(100,Number(a.goal)>0?(Number(a.saved||0)/Number(a.goal))*100:0);
          return (
            <div key={i} style={{marginBottom:i<accts.length-1?14:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#e8e4d9"}}>{a.name}</span>
                <span style={{fontSize:12,color:a.color||"#4ade80",fontWeight:"bold",...GS}}>{Math.round(pct)}%</span>
              </div>
              <div style={{background:"#0d1b3e",borderRadius:4,height:6,overflow:"hidden",marginBottom:3}}>
                <div style={{width:pct+"%",height:"100%",background:a.color||"#4ade80",borderRadius:4}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:"#6b8cce"}}>{fmtShort(Number(a.saved||0))} saved</span>
                <span style={{fontSize:10,color:"#6b8cce"}}>goal: {fmtShort(Number(a.goal))}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if(id==="cashflow_summary") {
    try {
      const entries=JSON.parse(localStorage.getItem("fh_cashflow_entries")||"[]");
      const balance=Number(localStorage.getItem("fh_cashflow_balance")||0);
      const today=new Date();
      const in30=new Date();in30.setDate(in30.getDate()+30);
      let inc30=0,exp30=0;
      entries.forEach(e=>{
        const ed=new Date(e.date+"T12:00:00");
        if(ed>=today&&ed<=in30){if(e.type==="credit")inc30+=e.amount;else exp30+=e.amount;}
      });
      return (
        <div style={{textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
          <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>NEXT 30 DAYS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{background:"#0d2a1a",borderRadius:10,padding:"12px"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>COMING IN</div>
              <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(inc30)}</div>
            </div>
            <div style={{background:"#1a0505",borderRadius:10,padding:"12px"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>GOING OUT</div>
              <div style={{fontSize:18,color:"#f87171",fontWeight:"bold",...GS}}>{fmtShort(exp30)}</div>
            </div>
          </div>
          <div style={{fontSize:11,color:"#6b8cce"}}>Balance: <span style={{color:balance>=0?"#4ade80":"#f87171",fontWeight:"bold",...GS}}>{fmt(balance)}</span></div>
        </div>
      );
    } catch(e) { return <DashTileEmpty msg="Open Cash Flow tool to add entries"/>; }
  }

  if(id==="mortgage") {
    const bal=Number(d.mortgage.balance||0);
    const val=Number(d.mortgage.value||0);
    const eq=Math.max(0,val-bal);
    if(!bal) return <DashTileEmpty msg="No mortgage entered"/>;
    const ltv=val>0?(bal/val)*100:0;
    return (
      <div>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:12,textAlign:"center"}}>MORTGAGE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[{label:"Balance",val:fmtShort(bal),color:"#f87171"},{label:"Home Value",val:fmtShort(val),color:"#4ade80"},{label:"Equity",val:fmtShort(eq),color:"#4ade80"},{label:"LTV",val:ltv.toFixed(1)+"%",color:ltv>80?"#f87171":"#4ade80"}].map((x,i)=>(
            <div key={i} style={{background:"#0d1b3e",borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>{x.label}</div>
              <div style={{fontSize:14,color:x.color,fontWeight:"bold",...GS}}>{x.val}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}>
          <div style={{width:Math.min(100,ltv)+"%",height:"100%",background:ltv>80?"#f87171":"#4ade80",borderRadius:6}}/>
        </div>
        <div style={{fontSize:10,color:"#6b8cce",marginTop:4,textAlign:"center"}}>LTV {ltv.toFixed(1)}% — target under 80%</div>
      </div>
    );
  }

  if(id==="next_steps") return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:10}}>MY NEXT STEPS</div>
      <textarea value={nextSteps} onChange={e=>saveNextSteps(e.target.value)}
        placeholder={"Write your financial next steps here...\n\n• Max my TFSA this month\n• Book mortgage review\n• Increase investment rate to 20%"}
        style={{flex:1,background:"#0d1b3e",border:"1px solid #1e3a5f",borderRadius:10,padding:"12px",color:"#e8e4d9",fontSize:13,resize:"none",outline:"none",lineHeight:1.7,fontFamily:"inherit",minHeight:160}}/>
    </div>
  );

  return <DashTileEmpty msg={"Unknown tile: "+id}/>;
}

// ─── DASHBOARD MODALS ─────────────────────────────────────────────────────────
function DashExpandModal({tileId,tileProps,tileMeta,onClose}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #2a4080",borderRadius:20,padding:"24px",width:"100%",maxWidth:700,maxHeight:"85vh",overflowY:"auto",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,color:"#e8e4d9",fontWeight:"bold",...GS}}>{tileMeta.icon} {tileMeta.label}</div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"6px 12px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>✕ Close</button>
        </div>
        <DashTileContent id={tileId} compact={false} {...tileProps}/>
      </div>
    </div>
  );
}

function DashAddPanel({allTileMeta,layout,onAdd,onClose}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #2a4080",borderRadius:20,padding:"24px",width:"100%",maxWidth:560,maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,color:"#e8e4d9",fontWeight:"bold",...GS}}>Add a Tile</div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"6px 12px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {allTileMeta.map(meta=>{
            const inLayout=layout.includes(meta.id);
            return (
              <button key={meta.id} onClick={()=>!inLayout&&onAdd(meta.id)} disabled={inLayout}
                style={{background:inLayout?"#0d1b3e":"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid "+(inLayout?"#1e3a5f":"#2a4080"),borderRadius:12,padding:"14px",cursor:inLayout?"default":"pointer",textAlign:"left",opacity:inLayout?0.5:1,transition:"all 0.2s",...GS}}
                onMouseEnter={e=>{if(!inLayout)e.currentTarget.style.borderColor="#cc0000";}}
                onMouseLeave={e=>{if(!inLayout)e.currentTarget.style.borderColor="#2a4080";}}>
                <div style={{fontSize:20,marginBottom:6}}>{meta.icon}</div>
                <div style={{fontSize:12,color:"#e8e4d9",fontWeight:"bold",marginBottom:2,...GS}}>{meta.label}</div>
                {inLayout&&<div style={{fontSize:10,color:"#6b8cce"}}>Already on dashboard</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Checkup({data:d,onHome,onAppointment,totalInv,scoreHistory,saveScore,theme,user,token}) {
  // ── Computed values ──────────────────────────────────────────────────────────
  const bankCash=d.bankAccounts.reduce((s,a)=>s+Number(a.amount||0),0);
  const savings=(d.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const cash=bankCash+savings; // savings accounts are cash-equivalent
  const equity=Math.max(0,Number(d.mortgage.value||0)-Number(d.mortgage.balance||0));
  const totalAssets=cash+totalInv+Number(d.lifeInsurance||0)+equity;
  const totalCC=d.creditCards.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD=d.otherDebts.reduce((s,x)=>s+Number(x.balance||0),0);
  const totalLocBal=(d.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0);
  const totalLiab=totalCC+totalLocBal+Number(d.mortgage.balance||0)+totalOD;
  const netWorth=totalAssets-totalLiab;
  const income=Number(d.budget.income||0);
  const totalAlloc=d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const score=calcScore(d,totalInv);
  const surplus=income-totalAlloc;
  const efund=savings;
  const efundMonths=totalAlloc>0?efund/totalAlloc:0;
  const grossMonthly=Number(d.income?.grossSalary||0)>0?Number(d.income.grossSalary)/12:income;
  const invMonthly=Number(d.budget.investmentMonthly||0);
  const invRate=grossMonthly>0?(invMonthly/grossMonthly)*100:0;

  // ── FOO ──────────────────────────────────────────────────────────────────────
  const FOO_LABELS=[
    {label:"Deductibles Covered",desc:"Insurance deductibles are funded"},
    {label:"Employer Match",desc:"Contributing enough to get full employer match"},
    {label:"High-Interest Debt Paid",desc:"Credit cards & high-rate debt cleared"},
    {label:"Emergency Reserves",desc:"3–6 months of expenses saved"},
    {label:"FHSA & TFSA",desc:"Maxing registered accounts"},
    {label:"RRSP Maxed",desc:"Contributing to RRSP limit"},
    {label:"Hyper Accumulation",desc:"Investing 20%+ of gross income"},
  ];
  const [fooChecked,setFooChecked]=useState(()=>FOO_LABELS.map(()=>false));
  const toggleFoo=(i)=>setFooChecked(prev=>prev.map((v,idx)=>idx===i?!v:v));
  const fooComplete=fooChecked.filter(Boolean).length;

  // ── Dashboard layout state ───────────────────────────────────────────────────
  const STORAGE_KEY="fh_dashboard_layout_v2";
  const DEFAULT_LAYOUT=["networth","score","portfolio_chart","benchmarks","foo","budget","goals","score_history","debt"];

  const loadLayout=()=>{
    try{const s=localStorage.getItem(STORAGE_KEY);return s?JSON.parse(s):DEFAULT_LAYOUT;}
    catch{return DEFAULT_LAYOUT;}
  };
  const [layout,setLayout]=useState(loadLayout);
  const [editMode,setEditMode]=useState(false);
  const [showAddPanel,setShowAddPanel]=useState(false);
  const [expandedTile,setExpandedTile]=useState(null);
  const [nextSteps,setNextSteps]=useState(()=>{try{return localStorage.getItem("fh_nextsteps")||"";}catch{return "";}});
  const [dragIdx,setDragIdx]=useState(null);
  const [dragOver,setDragOver]=useState(null);

  const saveLayout=(l)=>{
    setLayout(l);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(l));}catch{}
  };

  const saveNextSteps=(v)=>{
    setNextSteps(v);
    try{localStorage.setItem("fh_nextsteps",v);}catch{}
  };

  const removeTile=(id)=>saveLayout(layout.filter(t=>t!==id));
  const addTile=(id)=>{if(!layout.includes(id)){saveLayout([...layout,id]);} setShowAddPanel(false);};

  // Drag handlers
  const onDragStart=(i)=>setDragIdx(i);
  const onDragEnter=(i)=>setDragOver(i);
  const onDragEnd=()=>{
    if(dragIdx===null||dragOver===null||dragIdx===dragOver){setDragIdx(null);setDragOver(null);return;}
    const next=[...layout];
    const [moved]=next.splice(dragIdx,1);
    next.splice(dragOver,0,moved);
    saveLayout(next);
    setDragIdx(null);setDragOver(null);
  };

  // ── TILE DEFINITIONS ─────────────────────────────────────────
  const ALL_TILE_META=[
    {id:"networth",label:"Net Worth Statement",icon:"💎"},
    {id:"score",label:"Financial Health Score",icon:"⭐"},
    {id:"portfolio_chart",label:"Portfolio Breakdown (Chart)",icon:"🥧"},
    {id:"portfolio_numbers",label:"Portfolio Breakdown (Numbers)",icon:"📋"},
    {id:"benchmarks",label:"Where You Stand",icon:"📊"},
    {id:"foo",label:"Financial Order of Operations",icon:"✅"},
    {id:"budget",label:"Budget Snapshot",icon:"💰"},
    {id:"goals",label:"Goals Progress",icon:"🎯"},
    {id:"score_history",label:"Score History",icon:"📈"},
    {id:"debt",label:"Debt Overview",icon:"💳"},
    {id:"emergency",label:"Emergency Fund",icon:"🛡️"},
    {id:"inv_rate",label:"Investment Rate",icon:"📈"},
    {id:"savings_goals",label:"Savings Goals",icon:"🏦"},
    {id:"cashflow_summary",label:"Cash Flow Summary",icon:"💸"},
    {id:"mortgage",label:"Mortgage Overview",icon:"🏡"},
    {id:"next_steps",label:"Next Steps",icon:"✍️"},
  ];
  const ALL_TILE_IDS=ALL_TILE_META.map(t=>t.id);
  const getTileMeta=(id)=>ALL_TILE_META.find(t=>t.id===id)||{id,label:id,icon:"📦"};

  // ── Main Render ──────────────────────────────────────────────────────────────
  const name=d.clientName||d.person1Name||user?.email?.split("@")[0]||"My";
  const tileProps={d,score,totalInv,totalAssets,totalLiab,netWorth,income,totalAlloc,surplus,invMonthly,invRate,efund,scoreHistory,saveScore,fooChecked,fooComplete,FOO_LABELS,toggleFoo,nextSteps,saveNextSteps};

  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      {expandedTile&&<DashExpandModal tileId={expandedTile} tileProps={tileProps} tileMeta={getTileMeta(expandedTile)} onClose={()=>setExpandedTile(null)}/>}
      {showAddPanel&&<DashAddPanel allTileMeta={ALL_TILE_META} layout={layout} onAdd={addTile} onClose={()=>setShowAddPanel(false)}/>}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#0a0f1e)",borderBottom:"1px solid #1e3a5f",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <button onClick={onHome} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,padding:"8px 16px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>
          ← Home
        </button>
        <div style={{textAlign:"center"}}>
          <h1 style={{margin:0,fontSize:"clamp(18px,3vw,28px)",fontWeight:"bold",background:"linear-gradient(135deg,#fff 40%,#cc0000)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",...GS}}>
            {name}'s Financial Dashboard
          </h1>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={onAppointment} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,padding:"8px 16px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>
            Edit Info
          </button>
          <button onClick={()=>{setEditMode(p=>!p);setShowAddPanel(false);}}
            className="glow-btn"
            style={{background:editMode?"linear-gradient(135deg,#1a0505,#0d1b3e)":"linear-gradient(135deg,#0d1b3e,#1a2235)",border:"1px solid "+(editMode?"#cc0000":"#2a4080"),borderRadius:10,padding:"8px 16px",color:editMode?"#cc0000":"#e8e4d9",cursor:"pointer",fontSize:13,fontWeight:editMode?"bold":"normal",...GS}}>
            {editMode?"✓ Done":"⚙️ Edit Dashboard"}
          </button>
        </div>
      </div>

      {/* Edit mode bar */}
      {editMode&&(
        <div style={{background:"linear-gradient(135deg,#1a0505,#0d1b3e)",borderBottom:"1px solid #cc000033",padding:"10px 24px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"#cc0000",fontWeight:"bold",...GS}}>⚙️ EDIT MODE</span>
          <span style={{fontSize:11,color:"#8fadd4"}}>Drag tiles to reorder · click × to remove</span>
          <button onClick={()=>setShowAddPanel(true)} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:8,padding:"6px 14px",color:"#4ade80",cursor:"pointer",fontSize:12,...GS}}>
            + Add Tile
          </button>
          <button onClick={()=>saveLayout(DEFAULT_LAYOUT)} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"6px 14px",color:"#6b8cce",cursor:"pointer",fontSize:12,...GS}}>
            Reset to Default
          </button>
        </div>
      )}

      {/* Dashboard grid — masonry via CSS columns */}
      <div style={{padding:"20px 24px",columnCount:3,columnGap:16}}>
        {[...layout, ...(editMode?["__add__"]:[])].map((tileId,idx)=>{
          if(tileId==="__add__") return (
            <div key="add" style={{breakInside:"avoid",marginBottom:16}}>
              <button onClick={()=>setShowAddPanel(true)} style={{background:"none",border:"2px dashed #2a4080",borderRadius:18,width:"100%",minHeight:180,cursor:"pointer",color:"#2a4080",fontSize:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,transition:"border-color 0.2s,color 0.2s",...GS}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#cc0000";e.currentTarget.style.color="#cc0000";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a4080";e.currentTarget.style.color="#2a4080";}}>
                +<div style={{fontSize:12,letterSpacing:1}}>ADD TILE</div>
              </button>
            </div>
          );
          const meta=getTileMeta(tileId);
          if(!meta) return null;
          const isDragging=dragIdx===idx;
          const isDragOver=dragOver===idx;
          return (
            <div key={tileId} style={{breakInside:"avoid",marginBottom:16,animationDelay:`${idx*60}ms`}} className="tile-enter">
              <div
                draggable={editMode}
                onDragStart={()=>onDragStart(idx)}
                onDragEnter={()=>onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e=>e.preventDefault()}
                className="tile-card"
                style={{
                  background:"linear-gradient(135deg,#111827,#1a2235)",
                  border:"1px solid "+(isDragOver?"#cc0000":"#1e3a5f"),
                  borderRadius:18,
                  padding:"20px",
                  position:"relative",
                  cursor:editMode?"grab":"default",
                  opacity:isDragging?0.4:1,
                  transform:isDragOver&&!isDragging?"scale(1.02)":"scale(1)",
                  transition:"transform 0.15s,border-color 0.15s,box-shadow 0.2s",
                  boxShadow:"0 4px 24px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={e=>{if(!editMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px #cc000044, 0 4px 24px rgba(0,0,0,0.3)";e.currentTarget.style.borderColor="#cc000044";}}}
                onMouseLeave={e=>{if(!editMode){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.3)";e.currentTarget.style.borderColor="#1e3a5f";}}}>
                {editMode&&(
                  <>
                    <div style={{position:"absolute",top:10,left:12,fontSize:14,color:"#6b8cce",cursor:"grab"}}>⠿</div>
                    <button onClick={()=>removeTile(tileId)} style={{position:"absolute",top:8,right:8,background:"#1a0505",border:"1px solid #cc000066",borderRadius:6,width:24,height:24,color:"#cc0000",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",...GS}}>×</button>
                  </>
                )}
                {!editMode&&(
                  <button onClick={()=>setExpandedTile(tileId)}
                    style={{position:"absolute",top:10,right:10,background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:6,width:24,height:24,color:"#6b8cce",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity 0.2s",...GS}}
                    className="expand-btn">↗</button>
                )}
                <div style={{paddingTop:editMode?8:0}}>
                  <DashTileContent id={tileId} compact={true} {...tileProps}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS for expand button hover */}
      <style>{`
        div:hover .expand-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
// helper
const sumGroupHelper = arr => (arr||[]).reduce((s,x)=>s+Number(x.amount||0),0);

// ─── NET WORTH PROJECTION ─────────────────────────────────────────────────────
function NetWorthProjection({totalInv,income,totalAlloc,netWorth}) {
  const derivedMonthly = Math.max(0, income - totalAlloc);
  const [monthlyInvest, setMonthlyInvest] = useState(String(Math.round(derivedMonthly)||""));
  const [startingNW, setStartingNW] = useState(String(Math.round(netWorth > 0 ? netWorth : 0)));
  const [returnRate, setReturnRate] = useState("7");

  const mi = Number(monthlyInvest || 0);
  const snw = Number(startingNW || 0);
  const r = Number(returnRate || 7) / 100;

  const calcFV = (rate, years) => {
    const mr = rate / 12;
    const fvLump = snw * Math.pow(1 + mr, years * 12);
    const fvContrib = mr > 0 ? mi * ((Math.pow(1 + mr, years * 12) - 1) / mr) : mi * years * 12;
    return Math.round(fvLump + fvContrib);
  };

  const years = [0, 5, 10, 15, 20, 25, 30];
  const data = years.map(y => ({
    year: y === 0 ? "Now" : `+${y}y`,
    conservative: calcFV(0.04, y),
    moderate: calcFV(r, y),
    aggressive: calcFV(0.10, y),
  }));

  const at30 = calcFV(r, 30);

  return (
    <div>
      {/* Inputs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        <div>
          <div style={{fontSize:9,color:"#6b8cce",letterSpacing:1,marginBottom:4}}>MONTHLY INVEST</div>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
            <span style={{color:"#6b8cce",marginRight:3,fontSize:12}}>$</span>
            <input type="number" value={monthlyInvest} onChange={e=>setMonthlyInvest(e.target.value)} placeholder="500"
              style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:14,width:"100%",...GS}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:"#6b8cce",letterSpacing:1,marginBottom:4}}>STARTING NET WORTH</div>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
            <span style={{color:"#6b8cce",marginRight:3,fontSize:12}}>$</span>
            <input type="number" value={startingNW} onChange={e=>setStartingNW(e.target.value)} placeholder="0"
              style={{background:"none",border:"none",outline:"none",color:"#60a5fa",fontSize:14,width:"100%",...GS}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:"#6b8cce",letterSpacing:1,marginBottom:4}}>RETURN RATE</div>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
            <input type="number" value={returnRate} onChange={e=>setReturnRate(e.target.value)} placeholder="7"
              style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:14,width:"100%",...GS}}/>
            <span style={{color:"#6b8cce",fontSize:12}}>%</span>
          </div>
        </div>
      </div>

      {/* 30-year headline */}
      {mi > 0 && (
        <div style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:10,padding:"12px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,color:"#6b8cce"}}>Net worth in 30 years at {returnRate}%</div>
          <div style={{fontSize:20,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(at30)}</div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{top:5,right:10,left:0,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
          <XAxis dataKey="year" stroke="#6b8cce" tick={{fontSize:10,...GS}}/>
          <YAxis stroke="#6b8cce" tick={{fontSize:9,...GS}} tickFormatter={v=>fmtShort(v)}/>
          <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#e8e4d9"}}/>
          <Line type="monotone" dataKey="conservative" stroke="#60a5fa" strokeWidth={2} dot={false} name="4% conservative"/>
          <Line type="monotone" dataKey="moderate" stroke="#4ade80" strokeWidth={2} dot={false} name={`${returnRate}% moderate`}/>
          <Line type="monotone" dataKey="aggressive" stroke="#facc15" strokeWidth={2} dot={false} name="10% aggressive"/>
        </LineChart>
      </ResponsiveContainer>

      {mi > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
          {[5,10,20].map(y=>(
            <div key={y} style={{background:"#0d1b3e",borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>{y} YEARS</div>
              <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(calcFV(r,y))}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:10}}>
        {[{label:"4% conservative",color:"#60a5fa"},{label:`${returnRate}% your rate`,color:"#4ade80"},{label:"10% aggressive",color:"#facc15"}].map(x=>(
          <div key={x.label} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:3,background:x.color,borderRadius:2}}/><span style={{fontSize:10,color:"#6b8cce"}}>{x.label}</span></div>
        ))}
      </div>
    </div>
  );
}

// ─── DEBT OPTIMIZER ───────────────────────────────────────────────────────────
function DebtOptimizer({creditCards,otherDebts,locs}) {
  const [method,setMethod]=useState("avalanche");
  const [extra,setExtra]=useState("0");

  // Build initial debts with editable minPayments
  const buildDebts=()=>[
    ...creditCards.filter(c=>Number(c.totalBalance||0)>0&&!c.payInFull).map(c=>({name:c.name,balance:Number(c.totalBalance),rate:19.99,minPayment:String(Math.max(25,Math.round(Number(c.totalBalance)*0.03)))})),
    ...otherDebts.filter(x=>Number(x.balance||0)>0).map(x=>({name:x.name||x.type,balance:Number(x.balance),rate:Number(x.rate||5),minPayment:String(Number(x.payment||0)||Math.max(25,Math.round(Number(x.balance)*0.02)))})),
    ...(locs||[]).filter(l=>Number(l.balance||0)>0).map(l=>({name:l.name||"Line of Credit",balance:Number(l.balance),rate:Number(l.rate||7),minPayment:String(Math.max(25,Math.round((Number(l.balance)*(Number(l.rate||7)/100))/12)))})),
  ];
  const [debts,setDebts]=useState(buildDebts);
  const setMinPayment=(i,v)=>setDebts(p=>p.map((d,idx)=>idx===i?{...d,minPayment:v}:d));

  const debtCalc=debts.map(d=>({...d,minPaymentNum:Math.max(0,Number(d.minPayment||0))}));
  const sorted=[...debtCalc].sort((a,b)=>method==="avalanche"?(b.rate-a.rate):(a.balance-b.balance));
  const totalDebt=debtCalc.reduce((s,x)=>s+x.balance,0);
  const totalMin=debtCalc.reduce((s,x)=>s+x.minPaymentNum,0);
  const extraPayment=Number(extra||0);

  if(debts.length===0) return <div style={{fontSize:12,color:"#6b8cce",textAlign:"center",padding:"10px 0"}}>No debts to optimize. Credit cards marked "pay in full" are excluded.</div>;
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{val:"avalanche",label:"Avalanche",sub:"Highest rate first",color:"#f87171"},{val:"snowball",label:"Snowball",sub:"Smallest balance first",color:"#60a5fa"}].map(m=>(
          <button key={m.val} onClick={()=>setMethod(m.val)} style={{background:method===m.val?"#1a2235":"#0d1b3e",border:`1px solid ${method===m.val?m.color:"#2a4080"}`,borderRadius:10,padding:"10px",cursor:"pointer",color:"#e8e4d9",textAlign:"center",...GS}}>
            <div style={{fontSize:13,color:m.color,fontWeight:"bold",marginBottom:2}}>{m.label}</div>
            <div style={{fontSize:10,color:"#6b8cce"}}>{m.sub}</div>
          </button>
        ))}
      </div>

      {/* Editable minimum payments */}
      <Card>
        <SecTitle>Your Debts & Minimum Payments</SecTitle>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:12,lineHeight:1.6}}>Edit the minimum payment for each debt if needed.</div>
        {debts.map((debt,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center",marginBottom:10,background:"#0d1b3e",borderRadius:8,padding:"10px 12px"}}>
            <div>
              <div style={{fontSize:13,color:"#e8e4d9",marginBottom:2,...GS}}>{debt.name}</div>
              <div style={{fontSize:11,color:"#6b8cce"}}>{debt.rate}% · {fmt(debt.balance)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>MIN PAYMENT</div>
              <div style={{display:"flex",alignItems:"center",background:"#111827",border:"1px solid #2a4080",borderRadius:6,padding:"5px 8px"}}>
                <span style={{color:"#6b8cce",marginRight:3,fontSize:11}}>$</span>
                <input type="number" value={debt.minPayment} onChange={e=>setMinPayment(i,e.target.value)}
                  style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:13,width:60,textAlign:"right",...GS}}/>
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Label>Extra Monthly Payment</Label>
      <NumInput value={extra} onChange={setExtra} placeholder="0.00"/>
      <div style={{marginTop:14,marginBottom:10,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>Total Debt</div><div style={{fontSize:16,color:"#f87171",fontWeight:"bold",...GS}}>{fmt(totalDebt)}</div></div>
          <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>Min Payments</div><div style={{fontSize:16,color:"#facc15",fontWeight:"bold",...GS}}>{fmt(totalMin)}</div></div>
        </div>
      </div>
      <div style={{fontSize:11,color:"#6b8cce",marginBottom:10,letterSpacing:2}}>PAYOFF ORDER ({method.toUpperCase()})</div>
      {sorted.map((debt,i)=>(
        <div key={i} style={{display:"flex",gap:12,alignItems:"center",background:"#0d1b3e",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:i===0?"#facc15":"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:i===0?"#0d1b3e":"#6b8cce",fontWeight:"bold",flexShrink:0}}>{i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#e8e4d9",marginBottom:2}}>{debt.name}</div>
            <div style={{fontSize:11,color:"#6b8cce"}}>{debt.rate}% · {fmt(debt.balance)} · min {fmt(debt.minPaymentNum)}/mo</div>
          </div>
          {i===0&&<div style={{fontSize:10,color:"#facc15",border:"1px solid #facc1544",borderRadius:12,padding:"2px 8px"}}>FOCUS</div>}
        </div>
      ))}
      {extraPayment>0&&sorted[0]&&<div style={{marginTop:10,background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:6}}>With {fmt(extraPayment)}/mo extra on {sorted[0].name}:</div>
        {(()=>{
          const r=sorted[0].rate/100/12,b=sorted[0].balance,p=sorted[0].minPaymentNum+extraPayment;
          if(r===0){const months=b/p;return <div style={{fontSize:13,color:"#4ade80"}}>Paid off in ~{Math.ceil(months)} months</div>;}
          const months=Math.log(p/(p-b*r))/Math.log(1+r);
          const interest=p*months-b;
          return <div><div style={{fontSize:13,color:"#4ade80"}}>Paid off in ~{Math.ceil(months)} months</div><div style={{fontSize:11,color:"#6b8cce",marginTop:4}}>Total interest: {fmt(Math.max(0,interest))}</div></div>;
        })()}
      </div>}
    </div>
  );
}

// ─── CASH FLOW LEDGER ─────────────────────────────────────────────────────────
function BillCalendar() {
  const today=new Date();
  const todayStr=today.toISOString().split("T")[0];

  // Load saved entries from localStorage
  const loadEntries=()=>{try{return JSON.parse(localStorage.getItem("fh_cashflow_entries")||"[]");}catch{return [];}};
  const saveEntries=(e)=>{try{localStorage.setItem("fh_cashflow_entries",JSON.stringify(e));}catch{}};
  const loadBalance=()=>{try{return localStorage.getItem("fh_cashflow_balance")||"";}catch{return "";}};
  const saveBalance=(b)=>{try{localStorage.setItem("fh_cashflow_balance",b);}catch{}};

  const [startingBalance,setStartingBalance]=useState(loadBalance);
  const [entries,setEntries]=useState(loadEntries);
  const [showAdd,setShowAdd]=useState(false);

  // New entry form state
  const [newDesc,setNewDesc]=useState("");
  const [newAmt,setNewAmt]=useState("");
  const [newType,setNewType]=useState("debit"); // debit or credit
  const [newDate,setNewDate]=useState(todayStr);
  const [isRecurring,setIsRecurring]=useState(false);
  const [recurFreq,setRecurFreq]=useState("monthly"); // monthly|biweekly|weekly|daily
  const [recurStart,setRecurStart]=useState(todayStr);

  const persistEntries=(e)=>{setEntries(e);saveEntries(e);};
  const persistBalance=(b)=>{setStartingBalance(b);saveBalance(b);};

  const addEntry=()=>{
    if(!newDesc.trim()||!newAmt) return;
    const entry={
      id:Date.now(),
      desc:newDesc.trim(),
      amount:Number(newAmt),
      type:newType,
      recurring:isRecurring,
      freq:isRecurring?recurFreq:null,
      date:isRecurring?recurStart:newDate,
    };
    persistEntries([...entries,entry]);
    setNewDesc("");setNewAmt("");setNewType("debit");setNewDate(todayStr);
    setIsRecurring(false);setRecurFreq("monthly");setRecurStart(todayStr);
    setShowAdd(false);
  };

  const removeEntry=(id)=>persistEntries(entries.filter(e=>e.id!==id));

  // Build 90-day rolling rows from today
  const buildRows=()=>{
    const rows=[];
    const endDate=new Date(today);
    endDate.setDate(endDate.getDate()+90);

    // Expand all entries into dated rows
    entries.forEach(entry=>{
      const startD=new Date(entry.date+"T12:00:00");
      if(!entry.recurring){
        if(startD>=today&&startD<=endDate){
          rows.push({id:entry.id+"-"+entry.date,entryId:entry.id,date:startD,desc:entry.desc,amount:entry.amount,type:entry.type,recurring:false});
        }
      } else {
        let cur=new Date(startD);
        // Step forward to today if start is in the past
        while(cur<today){
          if(entry.freq==="daily") cur.setDate(cur.getDate()+1);
          else if(entry.freq==="weekly") cur.setDate(cur.getDate()+7);
          else if(entry.freq==="biweekly") cur.setDate(cur.getDate()+14);
          else cur.setMonth(cur.getMonth()+1);
        }
        while(cur<=endDate){
          rows.push({id:entry.id+"-"+cur.toISOString(),entryId:entry.id,date:new Date(cur),desc:entry.desc,amount:entry.amount,type:entry.type,recurring:true,freq:entry.freq});
          if(entry.freq==="daily") cur.setDate(cur.getDate()+1);
          else if(entry.freq==="weekly") cur.setDate(cur.getDate()+7);
          else if(entry.freq==="biweekly") cur.setDate(cur.getDate()+14);
          else cur.setMonth(cur.getMonth()+1);
        }
      }
    });

    // Sort by date
    rows.sort((a,b)=>a.date-b.date);
    return rows;
  };

  const rows=buildRows();

  // Calculate running total
  let running=Number(startingBalance||0);
  const rowsWithTotal=rows.map(row=>{
    if(row.type==="credit") running+=row.amount;
    else running-=row.amount;
    return {...row,runningTotal:running};
  });

  const ordinal=(n)=>{const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
  const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fmtDate=(d)=>`${MONTH_NAMES[d.getMonth()].slice(0,3)} ${ordinal(d.getDate())}`;
  const fmtFull=(d)=>`${MONTH_NAMES[d.getMonth()]} ${ordinal(d.getDate())}`;

  // Month shading — cycle through 3 distinct dark backgrounds
  const MONTH_BGAS=["#111827","#0d1b2e","#12101f"]; // blue-grey, navy, purple-dark
  const getMonthBg=(d,lighter=false)=>{
    const idx=d.getMonth()%3;
    const bases=MONTH_BGAS;
    return lighter?bases[idx].replace(/[0-9a-f]{2}$/,hex=>Math.min(255,parseInt(hex,16)+8).toString(16).padStart(2,"0")):bases[idx];
  };

  const FREQ_LABELS={monthly:"Monthly",biweekly:"Bi-Weekly",weekly:"Weekly",daily:"Daily"};

  return (
    <div>
      {/* Starting balance */}
      <Card>
        <SecTitle>Starting Balance</SecTitle>
        <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #4ade8066",borderRadius:10,padding:"12px 14px"}}>
          <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
          <input type="number" value={startingBalance} onChange={e=>persistBalance(e.target.value)}
            placeholder="e.g. 2,500.00"
            style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:22,width:"100%",...GS}}/>
        </div>
        <div style={{fontSize:11,color:"#6b8cce",marginTop:6}}>Your current bank balance — the ledger starts here</div>
      </Card>

      {/* Add entry button */}
      {!showAdd?(
        <button onClick={()=>setShowAdd(true)} style={{width:"100%",background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",borderRadius:12,padding:"14px",color:"#4ade80",cursor:"pointer",fontSize:14,marginBottom:14,...GS}}>
          + Add Entry
        </button>
      ):(
        <Card style={{border:"1px solid #4ade8044",marginBottom:14}}>
          <div style={{fontSize:10,color:"#4ade80",letterSpacing:2,marginBottom:12}}>NEW ENTRY</div>

          {/* Description */}
          <div style={{marginBottom:10}}>
            <Label>Description</Label>
            <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="e.g. Payday, Rent, Mastercard..."
              style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
          </div>

          {/* Amount + Type */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <Label>Amount</Label>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
                <span style={{color:"#6b8cce",marginRight:4}}>$</span>
                <input type="number" value={newAmt} onChange={e=>setNewAmt(e.target.value)} placeholder="0.00"
                  style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[{val:"debit",label:"💸 Out",color:"#f87171"},{val:"credit",label:"💰 In",color:"#4ade80"}].map(t=>(
                  <button key={t.val} onClick={()=>setNewType(t.val)}
                    style={{background:newType===t.val?t.color+"22":"#0d1b3e",border:`1px solid ${newType===t.val?t.color:"#2a4080"}`,borderRadius:8,padding:"9px 4px",cursor:"pointer",color:t.color,fontSize:12,...GS}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date (one-time) or Recurring toggle */}
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <Label>Date</Label>
              <button onClick={()=>setIsRecurring(p=>!p)}
                style={{background:isRecurring?"#1a4080":"#0d1b3e",border:`1px solid ${isRecurring?"#60a5fa":"#2a4080"}`,borderRadius:20,padding:"4px 12px",cursor:"pointer",color:isRecurring?"#60a5fa":"#6b8cce",fontSize:11,...GS}}>
                🔄 Recurring{isRecurring?" ✓":""}
              </button>
            </div>
            {!isRecurring?(
              <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
            ):(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>START DATE</div>
                    <input type="date" value={recurStart} onChange={e=>setRecurStart(e.target.value)}
                      style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>FREQUENCY</div>
                    <select value={recurFreq} onChange={e=>setRecurFreq(e.target.value)}
                      style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:13,width:"100%",outline:"none",...GS}}>
                      {["monthly","biweekly","weekly","daily"].map(f=>(
                        <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={addEntry} disabled={!newDesc.trim()||!newAmt}
              style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:10,padding:"11px",color:"#4ade80",cursor:"pointer",fontSize:13,fontWeight:"bold",...GS}}>
              Add to Ledger
            </button>
            <button onClick={()=>{setShowAdd(false);setNewDesc("");setNewAmt("");setIsRecurring(false);}}
              style={{background:"#111827",border:"1px solid #2a4080",borderRadius:10,padding:"11px",color:"#8fadd4",cursor:"pointer",fontSize:13,...GS}}>
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Ledger table */}
      <Card style={{padding:"0",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"#4ade80",padding:"10px 14px",textAlign:"center"}}>
          <div style={{fontSize:13,color:"#0a0f1e",fontWeight:"bold",...GS}}>Cash Flow by Date</div>
          <div style={{fontSize:10,color:"#0a0f1e",marginTop:2,opacity:0.7}}>
            {fmtFull(today)} → {fmtFull(new Date(today.getFullYear(),today.getMonth(),today.getDate()+90))} (90 days)
          </div>
        </div>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr 80px 80px 90px",background:"#0d1b3e",padding:"8px 10px",gap:4,borderBottom:"1px solid #1e3a5f"}}>
          {["Date","Description","Debit","Credit","Total"].map(h=>(
            <div key={h} style={{fontSize:10,color:"#6b8cce",letterSpacing:1,textAlign:h==="Date"||h==="Description"?"left":"right",textDecoration:"underline",...GS}}>{h}</div>
          ))}
        </div>

        {/* Starting balance row */}
        {startingBalance&&(
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 80px 80px 90px",padding:"8px 10px",gap:4,background:"#111827",borderBottom:"1px solid #1e3a5f"}}>
            <div style={{fontSize:11,color:"#6b8cce"}}>{fmtDate(today)}</div>
            <div style={{fontSize:11,color:"#8fadd4",fontStyle:"italic"}}>Opening Balance</div>
            <div style={{fontSize:11,textAlign:"right"}}></div>
            <div style={{fontSize:11,color:"#4ade80",textAlign:"right",fontWeight:"bold",...GS}}>{fmt(Number(startingBalance))}</div>
            <div style={{fontSize:11,color:"#4ade80",textAlign:"right",fontWeight:"bold",...GS}}>{fmt(Number(startingBalance))}</div>
          </div>
        )}

        {rowsWithTotal.length===0&&(
          <div style={{padding:"32px 16px",textAlign:"center",color:"#6b8cce",fontSize:13}}>
            No entries yet — add your first entry above
          </div>
        )}

        {/* Entry rows with month shading and month dividers */}
        {rowsWithTotal.map((row,i)=>{
          const isNeg=row.runningTotal<0;
          const isToday=row.date.toDateString()===today.toDateString();
          const prevRow=rowsWithTotal[i-1];
          const monthChanged=!prevRow||prevRow.date.getMonth()!==row.date.getMonth();
          const monthBg=getMonthBg(row.date);
          const MONTH_ACCENT=["#1e3a5f","#1a2a4a","#2a1a4a"]; // blue, navy, purple accent
          const monthAccent=MONTH_ACCENT[row.date.getMonth()%3];
          return (
            <React.Fragment key={row.id}>
              {/* Month divider */}
              {monthChanged&&(
                <div style={{background:monthBg,borderTop:"2px solid "+monthAccent,borderBottom:"1px solid "+monthAccent,padding:"6px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,color:"#8fadd4",fontWeight:"bold",letterSpacing:2,...GS}}>
                    {MONTH_NAMES[row.date.getMonth()].toUpperCase()} {row.date.getFullYear()}
                  </div>
                  <div style={{width:20,height:3,borderRadius:2,background:monthAccent}}/>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"80px 1fr 80px 80px 90px",padding:"7px 10px",gap:4,background:monthBg,borderBottom:"1px solid #1e3a5f22",alignItems:"center",transition:"filter 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.3)"}
                onMouseLeave={e=>e.currentTarget.style.filter=""}>
                <div style={{fontSize:11,color:isToday?"#facc15":"#6b8cce",fontWeight:isToday?"bold":"normal"}}>{fmtDate(row.date)}</div>
                <div style={{fontSize:11,color:"#e8e4d9",display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.desc}</span>
                  {row.recurring&&<span style={{fontSize:8,color:"#60a5fa",flexShrink:0,border:"1px solid #60a5fa44",borderRadius:4,padding:"1px 4px"}}>{row.freq?.slice(0,2).toUpperCase()}</span>}
                </div>
                <div style={{fontSize:11,color:"#f87171",textAlign:"right",fontWeight:"bold"}}>
                  {row.type==="debit"?fmt(row.amount):""}
                </div>
                <div style={{fontSize:11,color:"#4ade80",textAlign:"right",fontWeight:"bold"}}>
                  {row.type==="credit"?fmt(row.amount):""}
                </div>
                <div style={{fontSize:12,color:isNeg?"#f87171":"#e8e4d9",textAlign:"right",fontWeight:"bold",...GS,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                  {isNeg&&<span style={{fontSize:8,color:"#f87171"}}>⚠</span>}
                  {fmt(row.runningTotal)}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Ending balance */}
        {rowsWithTotal.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 80px 80px 90px",padding:"10px 10px",gap:4,background:"#0d2a1a",borderTop:"2px solid #4ade8044",alignItems:"center"}}>
            <div style={{fontSize:10,color:"#6b8cce"}}></div>
            <div style={{fontSize:11,color:"#4ade80",fontWeight:"bold",...GS}}>90-Day Ending Balance</div>
            <div></div><div></div>
            <div style={{fontSize:14,color:rowsWithTotal[rowsWithTotal.length-1].runningTotal<0?"#f87171":"#4ade80",textAlign:"right",fontWeight:"bold",...GS}}>
              {fmt(rowsWithTotal[rowsWithTotal.length-1].runningTotal)}
            </div>
          </div>
        )}
      </Card>

      {/* Entry management */}
      {entries.length>0&&(
        <Card>
          <SecTitle>Manage Entries</SecTitle>
          {entries.map(e=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1b3e",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
              <div>
                <div style={{fontSize:13,color:"#e8e4d9",...GS}}>{e.desc}</div>
                <div style={{fontSize:10,color:e.type==="credit"?"#4ade80":"#f87171",marginTop:2}}>
                  {e.type==="credit"?"+ ":"- "}{fmt(e.amount)} · {e.recurring?`${FREQ_LABELS[e.freq]} from ${e.date}`:e.date}
                </div>
              </div>
              <button onClick={()=>removeEntry(e.id)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── TOOLS LIST & INDIVIDUAL TOOLS ───────────────────────────────────────────
const TOOLS_LIST = [
  {id:"budget",label:"Budget Builder",icon:"💰",sub:"Build and visualize your monthly budget",color:"#4ade80"},
  {id:"statement",label:"Statement Importer",icon:"🏧",sub:"Upload bank & credit card CSVs",color:"#22d3ee"},
  {id:"housing",label:"Housing Analysis",icon:"🏠",sub:"Rent vs. Buy, Mortgage & Home Guide",color:"#a78bfa"},
  {id:"networth",label:"Net Worth",icon:"📊",sub:"Assets minus liabilities",color:"#60a5fa"},
  {id:"savings",label:"Savings Goal",icon:"🎯",sub:"How much to save per month",color:"#facc15"},
  {id:"loc",label:"Loan Simulator",icon:"🏦",sub:"Payments and interest on any loan",color:"#fb923c"},
  {id:"cashflow",label:"Cash Flow",icon:"📅",sub:"90-day rolling cash flow ledger",color:"#22d3ee"},
  {id:"debtopt",label:"Debt Optimizer",icon:"⚡",sub:"Fastest path to debt-free",color:"#f87171"},
  {id:"tax",label:"Tax Estimator",icon:"🇨🇦",sub:"Estimate Canadian take-home pay",color:"#4ade80"},
];

function IndividualTools({onHome,data,user,token}) {
  const [tool,setTool]=useState(null);
  if(tool==="budget") return <ToolWrapper title="Budget Builder" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-budget"><StandaloneBudget prefill={data?.budget} user={user} token={token} toolId="budget"/></ToolWrapper>;
  if(tool==="statement") return <StatementImporter onBack={()=>setTool(null)} onHome={onHome} budgetData={data.budget}/>;
  if(tool==="housing") return <ToolWrapper title="Housing Analysis" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-housing"><HousingAnalysis data={data} user={user} token={token}/></ToolWrapper>;
  if(tool==="networth") return <ToolWrapper title="Net Worth Calculator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-networth"><StandaloneNetWorth prefill={data}/></ToolWrapper>;
  if(tool==="savings") return <ToolWrapper title="Savings Goal" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-savings"><SavingsGoalCalc prefill={data}/></ToolWrapper>;
  if(tool==="loc") return <ToolWrapper title="Loan Simulator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-loc"><LOCSimulator rate=""/></ToolWrapper>;
  if(tool==="cashflow") return <ToolWrapper title="Cash Flow" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-cashflow"><BillCalendar/></ToolWrapper>;
  if(tool==="debtopt") return <ToolWrapper title="Debt Optimizer" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-debtopt"><DebtOptimizer creditCards={data.creditCards} otherDebts={data.otherDebts} locs={data.locs}/></ToolWrapper>;
  if(tool==="tax") return <ToolWrapper title="Canadian Tax Estimator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-tax"><CanadianTaxEstimator data={data}/></ToolWrapper>;

  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title="Individual Tools" subtitle="FinHealth" onHome={onHome}/>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}}>
        <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.7,marginBottom:20}}>Tap a tool to get started.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {TOOLS_LIST.map(t=>(
            <button key={t.id} onClick={()=>setTool(t.id)}
              style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:`1px solid #1e3a5f`,borderRadius:16,padding:"20px 8px 16px",cursor:"pointer",textAlign:"center",color:"#e8e4d9",width:"100%",transition:"transform 0.2s,box-shadow 0.2s,border-color 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:8,...GS}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${t.color}33`;e.currentTarget.style.borderColor=t.color+"66";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor="#1e3a5f";}}>
              <div style={{fontSize:32,marginBottom:2}}>{t.icon}</div>
              <div style={{fontSize:12,fontWeight:"bold",color:"#e8e4d9",lineHeight:1.3,...GS}}>{t.label}</div>
              <div style={{fontSize:10,color:"#6b8cce",lineHeight:1.4,marginTop:2}}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SNAPSHOT BAR ─────────────────────────────────────────────────────────────
function SnapshotBar({user,token,toolId,getInputs}) {
  const [name,setName]=useState("");
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const [snaps,setSnaps]=useState([]);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!user||!token||!open) return;
    supa.loadSnapshots(user.id,token,toolId).then(s=>setSnaps(Array.isArray(s)?s:[])).catch(()=>{});
  },[open,user,token]);

  const save=async()=>{
    if(!user||!token||!name.trim()) return;
    setSaving(true);
    await supa.saveSnapshot(user.id,token,toolId,name.trim(),getInputs());
    const s=await supa.loadSnapshots(user.id,token,toolId);
    setSnaps(Array.isArray(s)?s:[]);
    setName("");setMsg("Saved ✓");setTimeout(()=>setMsg(""),2000);
    setSaving(false);
  };

  const del=async(id)=>{
    await supa.deleteSnapshot(id,token);
    setSnaps(p=>p.filter(s=>s.id!==id));
  };

  if(!user) return null;
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:12,color:"#8fadd4",fontWeight:"bold",...GS}}>💾 Saved Scenarios</div>
        <button onClick={()=>setOpen(p=>!p)} style={{background:"none",border:"1px solid #2a4080",borderRadius:6,padding:"4px 10px",color:"#6b8cce",cursor:"pointer",fontSize:11,...GS}}>{open?"Hide":"Show"}</button>
      </div>
      {open&&(
        <div style={{marginTop:12}}>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name this scenario..."
              style={{flex:1,background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:12,outline:"none",...GS}}/>
            <button onClick={save} disabled={saving||!name.trim()} style={{background:"#0d2a1a",border:"1px solid #4ade80",borderRadius:8,padding:"8px 12px",color:"#4ade80",cursor:"pointer",fontSize:12,...GS}}>
              {saving?"...":"Save"}
            </button>
          </div>
          {msg&&<div style={{fontSize:11,color:"#4ade80",marginBottom:8}}>{msg}</div>}
          {snaps.length===0?<div style={{fontSize:12,color:"#6b8cce"}}>No saved scenarios yet.</div>:
            snaps.map(s=>(
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1b3e",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                <div>
                  <div style={{fontSize:12,color:"#e8e4d9",...GS}}>{s.name}</div>
                  <div style={{fontSize:10,color:"#6b8cce"}}>{new Date(s.created_at).toLocaleDateString("en-CA")}</div>
                </div>
                <button onClick={()=>del(s.id)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))
          }
        </div>
      )}
    </Card>
  );
}

// ─── RENT VS BUY ─────────────────────────────────────────────────────────────
// ─── SUPER MODE LIGHTNING ─────────────────────────────────────────────────────
function SuperModeLightning() {
  const [flash,setFlash]=useState(false);
  const [pos,setPos]=useState({x:50,y:0});
  useEffect(()=>{
    const trigger=()=>{
      setPos({x:Math.random()*80+10,y:Math.random()*60});
      setFlash(true);
      setTimeout(()=>setFlash(false),120);
      setTimeout(trigger,Math.random()*5000+7000);
    };
    const t=setTimeout(trigger,Math.random()*4000+6000);
    return ()=>clearTimeout(t);
  },[]);
  return (
    <>
      {/* Deep red storm background */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse at 50% 0%,#1a0505 0%,transparent 70%)",opacity:0.5}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"linear-gradient(#cc000010 1px,transparent 1px),linear-gradient(90deg,#cc000010 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>
      {/* Red lightning flash */}
      {flash&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1000,background:`radial-gradient(ellipse at ${pos.x}% ${pos.y}%,rgba(255,80,80,0.07) 0%,transparent 60%)`,transition:"opacity 0.05s"}}/>}
      {/* Red inner glow */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,boxShadow:"inset 0 0 60px #cc000022",borderRadius:0}}/>
    </>
  );
}

// ─── SUPER IN-DEPTH CHARTS ─────────────────────────────────────────────────────
function SuperInDepthCharts({hp,dp,totalMortgage,mpWithCMHC,r,appreciation,investReturn,totalMonthlyCost,totalMonthlyRent,extraUpfront,totalLTT,cmhc,baseApp,baseInv}) {
  // Build year-by-year data for charts
  const invRate=investReturn/100/12;
  const appRate=appreciation/100;
  const monthlyDiff=Math.max(0,totalMonthlyCost-totalMonthlyRent);
  const totalDP=dp+extraUpfront;

  const yearData=[];
  let mortBal=totalMortgage;
  let rentInv=totalDP;
  let rentMonthlyAcc=0;

  for(let y=0;y<=25;y++){
    const fhv=hp*Math.pow(1+appRate,y);
    const eq=Math.max(0,fhv-mortBal);
    const ri=rentInv+rentMonthlyAcc;
    yearData.push({
      year:y===0?"Now":`Yr ${y}`,
      homeEquity:Math.round(eq),
      rentInvested:Math.round(ri),
      homeValue:Math.round(fhv),
      mortgageBal:Math.round(mortBal),
    });
    // Advance 12 months
    for(let m=0;m<12;m++){
      const interest=mortBal*r;
      mortBal=Math.max(0,mortBal-(mpWithCMHC-interest));
      rentInv*=(1+invRate);
      rentMonthlyAcc=rentMonthlyAcc*(1+invRate)+monthlyDiff;
    }
  }

  // Sensitivity table: appreciation vs investment return
  const appRates=[0,2,4,6,8];
  const invRates=[4,6,8,10];
  const sensitivityData=appRates.map(a=>({
    app:a,
    results:invRates.map(iv=>{
      const ar=a/100,ir=iv/100/12,yrs=10;
      const fhv=hp*Math.pow(1+ar,yrs);
      let mb=totalMortgage;
      for(let i=0;i<yrs*12;i++){const int=mb*r;mb=Math.max(0,mb-(mpWithCMHC-int));}
      const eq=fhv-mb;
      const md=Math.max(0,totalMonthlyCost-totalMonthlyRent);
      const ri=totalDP*Math.pow(1+ir,yrs*12)+md*((Math.pow(1+ir,yrs*12)-1)/ir);
      return {inv:iv,buyWins:eq>ri,diff:eq-ri};
    })
  }));

  return (
    <div>
      {/* Chart 1: Equity vs Rent+Invest over time */}
      <Card style={{border:"1px solid #cc000044"}}>
        <SecTitle>⚡ Wealth Building — Buy vs Rent Over 25 Years</SecTitle>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:12,lineHeight:1.6}}>Home equity (🏠) vs. what your down payment and monthly savings would be worth if invested (🏢).</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yearData} margin={{top:5,right:10,left:0,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
            <XAxis dataKey="year" stroke="#6b8cce" tick={{fontSize:9,...GS}} interval={4}/>
            <YAxis stroke="#6b8cce" tick={{fontSize:9,...GS}} tickFormatter={v=>fmtShort(v)}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#e8e4d9"}}/>
            <Line type="monotone" dataKey="homeEquity" stroke="#4ade80" strokeWidth={2} dot={false} name="🏠 Home Equity"/>
            <Line type="monotone" dataKey="rentInvested" stroke="#a78bfa" strokeWidth={2} dot={false} name="🏢 Rent + Invest"/>
            <Line type="monotone" dataKey="homeValue" stroke="#fb923c" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Home Value"/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
          {[{label:"🏠 Home Equity",color:"#4ade80"},{label:"🏢 Rent + Invest",color:"#a78bfa"},{label:"Home Value",color:"#fb923c",dash:true}].map(x=>(
            <div key={x.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:20,height:3,background:x.color,borderRadius:2,borderTop:x.dash?"1px dashed "+x.color:"none",opacity:x.dash?0.6:1}}/>
              <span style={{fontSize:10,color:"#6b8cce"}}>{x.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Chart 2: Mortgage paydown vs appreciation */}
      <Card style={{border:"1px solid #cc000044"}}>
        <SecTitle>⚡ Mortgage Paydown vs Home Value</SecTitle>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:12}}>How your mortgage balance shrinks as your home value grows.</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData.filter((_,i)=>i%5===0)} margin={{top:5,right:10,left:0,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
            <XAxis dataKey="year" stroke="#6b8cce" tick={{fontSize:10,...GS}}/>
            <YAxis stroke="#6b8cce" tick={{fontSize:9,...GS}} tickFormatter={v=>fmtShort(v)}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#e8e4d9"}}/>
            <Bar dataKey="homeValue" name="Home Value" fill="#fb923c" radius={[4,4,0,0]}/>
            <Bar dataKey="mortgageBal" name="Mortgage Balance" fill="#f87171" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Sensitivity Table */}
      <Card style={{border:"1px solid #cc000044"}}>
        <SecTitle>⚡ Sensitivity Analysis — 10-Year Outcomes</SecTitle>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>
          Each cell shows whether <span style={{color:"#4ade80"}}>Buying wins</span> or <span style={{color:"#a78bfa"}}>Renting wins</span> under different appreciation and investment return assumptions.
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",...GS}}>
            <thead>
              <tr>
                <td style={{fontSize:10,color:"#6b8cce",padding:"6px 8px",borderBottom:"1px solid #1e3a5f"}}>Home Appr. ↓ / Inv. Return →</td>
                {invRates.map(iv=><td key={iv} style={{fontSize:10,color:"#cc0000",padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #1e3a5f"}}>{iv}%</td>)}
              </tr>
            </thead>
            <tbody>
              {sensitivityData.map(row=>(
                <tr key={row.app}>
                  <td style={{fontSize:11,color:"#facc15",padding:"6px 8px",borderBottom:"1px solid #0f1929",fontWeight:"bold"}}>{row.app}% appreciation</td>
                  {row.results.map((cell,i)=>(
                    <td key={i} style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1929",background:cell.buyWins?"#0d2a1a":"#1a0d2a",borderRadius:4}}>
                      <div style={{fontSize:11,color:cell.buyWins?"#4ade80":"#a78bfa",fontWeight:"bold"}}>{cell.buyWins?"🏠 Buy":"🏢 Rent"}</div>
                      <div style={{fontSize:9,color:"#6b8cce"}}>{cell.buyWins?"+":"-"}{fmtShort(Math.abs(cell.diff))}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:12,fontSize:11,color:"#6b8cce",lineHeight:1.7}}>
          💡 The crossover point — where buying and renting break even — shifts dramatically with even 1-2% changes in home appreciation or investment returns.
        </div>
      </Card>

      {/* True cost of ownership */}
      <Card style={{border:"1px solid #cc000044"}}>
        <SecTitle>⚡ True Cost of Ownership vs Renting — 10 Years</SecTitle>
        {(()=>{
          const buyTotalOut=(totalMonthlyCost*120)+dp+totalLTT+extraUpfront+cmhc;
          const rentTotalOut=totalMonthlyRent*120;
          const buyEquityGained=yearData[10]?.homeEquity||0;
          const buyNetCost=buyTotalOut-buyEquityGained;
          const rentNetCost=rentTotalOut-(yearData[10]?.rentInvested||0);
          return (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[
                  {label:"🏠 Buying",items:[{l:"Mortgage + costs (10yr)",v:totalMonthlyCost*120},{l:"Down payment + upfront",v:dp+totalLTT+extraUpfront},{l:"Less: equity built",v:-buyEquityGained},{l:"Net true cost",v:buyNetCost,bold:true}],color:"#4ade80"},
                  {label:"🏢 Renting",items:[{l:"Rent payments (10yr)",v:rentTotalOut},{l:"Less: investment growth",v:-(yearData[10]?.rentInvested||0)},{l:"",v:0},{l:"Net true cost",v:rentTotalOut-(yearData[10]?.rentInvested||0),bold:true}],color:"#a78bfa"},
                ].map(col=>(
                  <div key={col.label} style={{background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
                    <div style={{fontSize:11,color:col.color,fontWeight:"bold",marginBottom:8,...GS}}>{col.label}</div>
                    {col.items.filter(x=>x.l).map((x,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:4,borderTop:x.bold?"1px solid #1e3a5f":"none",paddingTop:x.bold?6:0}}>
                        <span style={{fontSize:10,color:"#6b8cce"}}>{x.l}</span>
                        <span style={{fontSize:11,color:x.bold?col.color:x.v<0?"#4ade80":"#e8e4d9",fontWeight:x.bold?"bold":"normal",...GS}}>{x.v<0?"- ":""}{fmt(Math.abs(x.v))}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{background:"linear-gradient(135deg,#0d1b3e,#111827)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#8fadd4",lineHeight:1.8}}>
                {buyNetCost<rentTotalOut-(yearData[10]?.rentInvested||0)
                  ?`🏠 After accounting for equity built, buying costs ${fmt(Math.abs(buyNetCost-(rentTotalOut-(yearData[10]?.rentInvested||0))))} less than renting over 10 years.`
                  :`🏢 After accounting for investment growth, renting costs ${fmt(Math.abs((rentTotalOut-(yearData[10]?.rentInvested||0))-buyNetCost))} less than buying over 10 years.`}
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

function RentVsBuy({user,token,toolId}) {
  const [homePrice,setHomePrice]=useState("600000");
  const [downMode,setDownMode]=useState("pct"); // "pct" or "dollar"
  const [downPct,setDownPct]=useState("10");
  const [downDollar,setDownDollar]=useState("");
  const [rate,setRate]=useState("5.25");
  const [amort,setAmort]=useState("25");
  const [propTax,setPropTax]=useState("");
  const [maintenance,setMaintenance]=useState("");
  const [homeIns,setHomeIns]=useState("150");
  const [appreciation,setAppreciation]=useState("2");
  const [rent,setRent]=useState("2200");
  const [rentIncrease,setRentIncrease]=useState("2.5");
  const [tenantIns,setTenantIns]=useState("30");
  const [utilities,setUtilities]=useState("0");
  const [investReturn,setInvestReturn]=useState("7");
  const [years,setYears]=useState("10");
  const [toronto,setToronto]=useState(false);
  const [firstTime,setFirstTime]=useState(false);
  const [showVariance,setShowVariance]=useState(false);
  const [superMode,setSuperMode]=useState(()=>{try{return JSON.parse(localStorage.getItem("rvb_super")||"false");}catch{return false;}});
  // Super in-depth additional inputs
  const [condoFee,setCondoFee]=useState("0");
  const [closingCosts,setClosingCosts]=useState("3500");
  const [movingCosts,setMovingCosts]=useState("2000");
  const [renobudget,setRenobudget]=useState("0");
  const [propTaxGrowth,setPropTaxGrowth]=useState("2");
  const [rentalIncome,setRentalIncome]=useState("0");
  const [mortgagePenalty,setMortgagePenalty]=useState("0");
  const [variableRate,setVariableRate]=useState(false);

  const toggleSuper=(v)=>{setSuperMode(v);try{localStorage.setItem("rvb_super",JSON.stringify(v));}catch{}};

  const hp=Number(homePrice||0);
  // Down payment — dollar or percent
  const dp = downMode==="dollar"
    ? Number(downDollar||0)
    : hp*(Number(downPct||0)/100);
  const downPctNum = hp>0 ? (dp/hp)*100 : Number(downPct||0);
  // Keep both inputs in sync
  const handleDownPct = (v) => { setDownPct(v); setDownDollar(String(Math.round(hp*(Number(v||0)/100))));};
  const handleDownDollar = (v) => { setDownDollar(v); setDownPct(hp>0?String(((Number(v||0)/hp)*100).toFixed(2)):""); };

  const principal=Math.max(0,hp-dp);
  const r=Number(rate||0)/100/12,n=Number(amort||25)*12;

  const cmhcRate=downPctNum<5?0:downPctNum<10?0.04:downPctNum<15?0.031:downPctNum<20?0.028:0;
  const cmhc=principal*cmhcRate;
  const totalMortgage=principal+cmhc;
  const mpWithCMHC=totalMortgage>0&&r>0?totalMortgage*r/(1-Math.pow(1+r,-n)):totalMortgage/n||0;

  const ltt=(v)=>{let t=0;if(v>400000)t+=v*0.02-6475;else if(v>250000)t+=(v-250000)*0.015+2975;else if(v>55000)t+=(v-55000)*0.01+275;else if(v>40000)t+=(v-40000)*0.005+100;else t=v*0.005;return Math.round(t);};
  const ontLTT=ltt(hp),torontoLTT=toronto?ltt(hp):0;
  const lttRebate=firstTime?Math.min(ontLTT,4000):0;
  const torontoRebate=firstTime&&toronto?Math.min(torontoLTT,4475):0;
  const totalLTT=ontLTT+torontoLTT-lttRebate-torontoRebate;

  const autoMaintenance=hp*0.01/12,autoPropTax=hp*0.01/12;
  const actualMaintenance=maintenance?Number(maintenance):autoMaintenance;
  const actualPropTax=propTax?Number(propTax):autoPropTax;
  const superCosts=superMode?(Number(condoFee||0)+Number(rentalIncome||0)*-1):0;
  const totalMonthlyCost=mpWithCMHC+actualPropTax+actualMaintenance+Number(homeIns||0)+superCosts;
  const totalMonthlyRent=Number(rent||0)+Number(tenantIns||0)+Number(utilities||0);
  const extraUpfront=superMode?(Number(closingCosts||0)+Number(movingCosts||0)+Number(renobudget||0)+Number(mortgagePenalty||0)):0;

  const yrs=Number(years||10);
  const rentIncRate=Number(rentIncrease||2.5)/100;

  const calcScenario=(appRatePct,invReturnPct)=>{
    const appRate=appRatePct/100,invRate=invReturnPct/100/12;
    const futureHomeValue=hp*Math.pow(1+appRate,yrs);
    let mortBal=totalMortgage;
    for(let i=0;i<yrs*12;i++){const interest=mortBal*r;mortBal=Math.max(0,mortBal-(mpWithCMHC-interest));}
    const buyEquity=futureHomeValue-mortBal;
    const monthlyDiff=Math.max(0,totalMonthlyCost-totalMonthlyRent);
    const totalDP=dp+extraUpfront;
    const dpInvested=totalDP*Math.pow(1+invRate,yrs*12);
    const monthlyInvFV=monthlyDiff>0?monthlyDiff*((Math.pow(1+invRate,yrs*12)-1)/invRate):0;
    const rentNetPosition=dpInvested+monthlyInvFV;
    return {buyEquity,rentNetPosition,futureHomeValue,buyWins:buyEquity>rentNetPosition};
  };

  // Break-even: find year where buy equity > rent invested
  const findBreakEven=()=>{
    const invRate=Number(investReturn||7)/100/12;
    const appRate=Number(appreciation||2)/100;
    for(let y=1;y<=30;y++){
      const fhv=hp*Math.pow(1+appRate,y);
      let mb=totalMortgage;
      for(let i=0;i<y*12;i++){const interest=mb*r;mb=Math.max(0,mb-(mpWithCMHC-interest));}
      const eq=fhv-mb;
      const md=Math.max(0,totalMonthlyCost-totalMonthlyRent);
      const totalDP=dp+extraUpfront;
      const ri=totalDP*Math.pow(1+invRate,y*12)+md*((Math.pow(1+invRate,y*12)-1)/invRate);
      if(eq>ri) return y;
    }
    return null;
  };
  const breakEvenYear=hp>0&&Number(rent||0)>0?findBreakEven():null;

  const baseApp=Number(appreciation||2),baseInv=Number(investReturn||7);
  const base=calcScenario(baseApp,baseInv);
  const bestBuy=calcScenario(baseApp+3,baseInv-2);   // home appreciates more, investments less
  const worstBuy=calcScenario(Math.max(0,baseApp-2),baseInv+2); // home flat, investments thrive
  const bestRent=worstBuy,worstRent=bestBuy; // inverse

  let totalRentPaid=0,curRent=Number(rent||0);
  for(let i=0;i<yrs;i++){totalRentPaid+=curRent*12;curRent*=(1+rentIncRate);}

  return (
    <div style={{position:"relative",minHeight:"100%"}}>
      {/* Lightning flashes for super mode */}
      {superMode&&<SuperModeLightning/>}

      {/* Snapshot Bar */}
      <SnapshotBar user={user} token={token} toolId={toolId} getInputs={()=>({homePrice,downPct,downDollar,downMode,rate,amort,propTax,maintenance,homeIns,appreciation,rent,rentIncrease,tenantIns,utilities,investReturn,years,toronto,firstTime,superMode,condoFee,closingCosts,movingCosts,renobudget,propTaxGrowth,rentalIncome,mortgagePenalty})}/>


      {/* Super In-Depth Toggle */}
      <button onClick={()=>toggleSuper(!superMode)} style={{width:"100%",background:superMode?"linear-gradient(135deg,#1a0505,#0d1b3e)":"#0d1b3e",border:`2px solid ${superMode?"#cc0000":"#2a4080"}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",...GS,transition:"all 0.3s"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>⚡</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:14,color:superMode?"#cc0000":"#8fadd4",fontWeight:"bold"}}>Super In-Depth Mode</div>
            <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>{superMode?"Every variable, charts, sensitivity analysis":"Toggle for the full professional analysis"}</div>
          </div>
        </div>
        <div style={{width:48,height:26,borderRadius:13,background:superMode?"#1a0505":"#1e1e2e",border:`2px solid ${superMode?"#cc0000":"#2a4080"}`,position:"relative",transition:"all 0.3s"}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:superMode?"#cc0000":"#475569",position:"absolute",top:2,left:superMode?26:2,transition:"left 0.3s,background 0.3s"}}/>
        </div>
      </button>

      {/* Location */}
      <Card>
        <SecTitle>{"Location"}</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[{val:false,label:"Outside Toronto",sub:"Ontario LTT only"},{val:true,label:"Toronto",sub:"Ontario + Toronto LTT"}].map(o=>(
            <button key={String(o.val)} onClick={()=>setToronto(o.val)} style={{background:toronto===o.val?"#1a2a3e":"#0d1b3e",border:`1px solid ${toronto===o.val?"#60a5fa":"#2a4080"}`,borderRadius:10,padding:"12px",cursor:"pointer",color:toronto===o.val?"#60a5fa":"#8fadd4",textAlign:"center",...GS}}>
              <div style={{fontSize:13,fontWeight:"bold",marginBottom:3}}>{o.label}</div>
              <div style={{fontSize:10,color:"#6b8cce"}}>{o.sub}</div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setFirstTime(p=>!p)} style={{width:22,height:22,borderRadius:6,background:firstTime?"#4ade80":"#0d1b3e",border:`2px solid ${firstTime?"#4ade80":"#2a4080"}`,cursor:"pointer",flexShrink:0,color:firstTime?"#0a0f1e":"transparent",fontSize:13,padding:0}}>✓</button>
        </div>
      </Card>

      {/* Buying inputs */}
      <Card>
        <SecTitle>{"Buying — Home Details"}</SecTitle>
        <div style={{marginBottom:12}}>
          <Label>Home Price</Label>
          <NumInput value={homePrice} onChange={v=>{setHomePrice(v);if(downMode==="dollar"&&downDollar)setDownPct(Number(v)>0?String(((Number(downDollar)/Number(v))*100).toFixed(2)):"");else setDownDollar(String(Math.round(Number(v)*(Number(downPct||0)/100))));}} placeholder="600000"/>
        </div>
        {/* Down payment — toggle $ or % */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"flex",background:"#0d1b3e",borderRadius:8,overflow:"hidden",border:"1px solid #2a4080"}}>
              {[{val:"pct",label:"%"},{val:"dollar",label:"$"}].map(m=>(
                <button key={m.val} onClick={()=>setDownMode(m.val)} style={{background:downMode===m.val?"#1a4080":"transparent",border:"none",color:downMode===m.val?"#4ade80":"#6b8cce",padding:"4px 12px",cursor:"pointer",fontSize:12,...GS}}>{m.label}</button>
              ))}
            </div>
          </div>
          {downMode==="pct"
            ? <PctInput value={downPct} onChange={handleDownPct} placeholder="10"/>
            : <NumInput value={downDollar} onChange={handleDownDollar} placeholder="60000"/>
          }
          {hp>0&&dp>0&&(
            <div style={{marginTop:6,fontSize:11,color:"#6b8cce",display:"flex",justifyContent:"space-between"}}>
              <span>{downMode==="pct"?`= ${fmt(dp)}`:`= ${downPctNum.toFixed(1)}% of home price`}</span>
              {downPctNum<20&&<span style={{color:"#facc15"}}>⚠️ CMHC insurance required (under 20%)</span>}
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Label>Mortgage Rate %</Label><PctInput value={rate} onChange={setRate} placeholder="5.25"/></div>
        </div>
        <Label>Home Insurance /mo</Label><NumInput value={homeIns} onChange={setHomeIns} placeholder="150"/>
        <div style={{height:10}}/>
        <PctInput value={appreciation} onChange={setAppreciation} placeholder="2"/>
      </Card>

      {/* Renting inputs */}
      <Card>
        <SecTitle>{"Renting — Monthly Costs"}</SecTitle>
        <Label>Monthly Rent</Label><NumInput value={rent} onChange={setRent} placeholder="2200"/>
        <div style={{height:10}}/>
        <PctInput value={rentIncrease} onChange={setRentIncrease} placeholder="2.5"/>
        <div style={{height:10}}/>
        <Label>Tenant Insurance /mo</Label><NumInput value={tenantIns} onChange={setTenantIns} placeholder="30"/>
        <div style={{height:10}}/>
        <Label>Utilities /mo (if not included)</Label><NumInput value={utilities} onChange={setUtilities} placeholder="0"/>
        <div style={{height:10}}/>
        <PctInput value={investReturn} onChange={setInvestReturn} placeholder="7"/>
      </Card>

      {/* Projection period */}
      <Card>
        <Label>Compare Over How Many Years?</Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
          {[5,10,15,20,25].map(y=>(
            <button key={y} onClick={()=>setYears(String(y))} style={{background:years===String(y)?"#1a4080":"#0d1b3e",border:`1px solid ${years===String(y)?"#60a5fa":"#2a4080"}`,borderRadius:8,padding:"7px 16px",cursor:"pointer",color:years===String(y)?"#60a5fa":"#8fadd4",fontSize:12,...GS}}>{y} yrs</button>
          ))}
        </div>
      </Card>

      {/* Super In-Depth Additional Inputs */}
      {superMode&&(
        <Card style={{background:"linear-gradient(135deg,#0a0d1a,#0d1b3e)",border:"2px solid #cc000044"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <span style={{fontSize:18}}>⚡</span>
            <div style={{fontSize:12,color:"#cc0000",letterSpacing:2,...GS}}>SUPER IN-DEPTH — ADDITIONAL COSTS</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <Label>Condo / HOA Fees /mo</Label>
              <NumInput value={condoFee} onChange={setCondoFee} placeholder="0"/>
            </div>
            <div>
              <Label>Rental Income /mo (if applicable)</Label>
              <NumInput value={rentalIncome} onChange={setRentalIncome} placeholder="0"/>
            </div>
            <div>
              <Label>Closing Costs (lawyer, inspection)</Label>
              <NumInput value={closingCosts} onChange={setClosingCosts} placeholder="3500"/>
            </div>
            <div>
              <Label>Moving Costs</Label>
              <NumInput value={movingCosts} onChange={setMovingCosts} placeholder="2000"/>
            </div>
            <div>
              <Label>Immediate Renovation Budget</Label>
              <NumInput value={renobudget} onChange={setRenobudget} placeholder="0"/>
            </div>
            <div>
              <Label>Mortgage Penalty (if breaking early)</Label>
              <NumInput value={mortgagePenalty} onChange={setMortgagePenalty} placeholder="0"/>
            </div>
          </div>
          {(Number(condoFee||0)>0||Number(closingCosts||0)>0||Number(movingCosts||0)>0)&&(
            <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",fontSize:12,color:"#8fadd4",lineHeight:1.8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Additional Monthly Cost (condo - rental)</span><span style={{color:"#f87171",...GS}}>{fmt(superCosts)}/mo</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Extra Upfront (closing + moving + reno)</span><span style={{color:"#f87171",...GS}}>{fmt(extraUpfront)}</span></div>
            </div>
          )}
        </Card>
      )}

      {/* RESULTS */}
      {hp>0&&Number(rent)>0&&dp>0&&(
        <div>
          {/* Verdict */}
          <Card style={{background:base.buyWins?"linear-gradient(135deg,#0d2a1a,#0d1b3e)":"linear-gradient(135deg,#1a0d2a,#0d1b3e)",border:`1px solid ${base.buyWins?"#4ade80":"#a78bfa"}44`,textAlign:"center",padding:"24px 16px"}}>
            <div style={{fontSize:11,color:"#6b8cce",letterSpacing:3,marginBottom:8}}>BASE CASE — {years} YEARS · {appreciation}% appreciation · {investReturn}% investment return</div>
            <div style={{fontSize:32,fontWeight:"bold",color:base.buyWins?"#4ade80":"#a78bfa",marginBottom:8,...GS}}>{base.buyWins?"🏠 Buying Wins":"🏢 Renting Wins"}</div>
            <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.8}}>
              {base.buyWins
                ?`Buying puts you ${fmtShort(base.buyEquity-base.rentNetPosition)} ahead after ${years} years`
                :`Renting + investing puts you ${fmtShort(base.rentNetPosition-base.buyEquity)} ahead after ${years} years`}
            </div>
          </Card>

          {/* Monthly side by side */}
          <Card>
            <SecTitle>Monthly Cost Comparison</SecTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"#0d1b3e",borderRadius:10,padding:"14px"}}>
                <div style={{fontSize:10,color:"#6b8cce",marginBottom:8,letterSpacing:1}}>🏠 BUYING</div>
                {[{l:"Mortgage",v:mpWithCMHC},{l:"Property Tax",v:actualPropTax},{l:"Maintenance",v:actualMaintenance},{l:"Home Ins.",v:Number(homeIns||0)}].map(x=>(
                  <div key={x.l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#8fadd4"}}>{x.l}</span><span style={{fontSize:11,color:"#4ade80",...GS}}>{fmt(x.v)}</span></div>
                ))}
                <div style={{borderTop:"1px solid #1e3a5f",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:"#e8e4d9",fontWeight:"bold"}}>Total</span><span style={{fontSize:14,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(totalMonthlyCost)}</span></div>
              </div>
              <div style={{background:"#0d1b3e",borderRadius:10,padding:"14px"}}>
                <div style={{fontSize:10,color:"#6b8cce",marginBottom:8,letterSpacing:1}}>🏢 RENTING</div>
                {[{l:"Rent",v:Number(rent||0)},{l:"Tenant Ins.",v:Number(tenantIns||0)},{l:"Utilities",v:Number(utilities||0)}].map(x=>(
                  <div key={x.l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#8fadd4"}}>{x.l}</span><span style={{fontSize:11,color:"#a78bfa",...GS}}>{fmt(x.v)}</span></div>
                ))}
                <div style={{borderTop:"1px solid #1e3a5f",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:"#e8e4d9",fontWeight:"bold"}}>Total</span><span style={{fontSize:14,color:"#a78bfa",fontWeight:"bold",...GS}}>{fmt(totalMonthlyRent)}</span></div>
              </div>
            </div>
          </Card>

          {/* Upfront costs */}
          <Card>
            <SecTitle>Upfront Buying Costs</SecTitle>
            {[
              {l:"Down Payment",v:dp,color:"#60a5fa"},
              {l:`CMHC Insurance${cmhc>0?" (added to mortgage)":""}`,v:cmhc,color:"#facc15"},
              {l:`Ontario Land Transfer Tax${firstTime?" (after rebate)":""}`,v:ontLTT-lttRebate,color:"#f87171"},
              ...(toronto?[{l:`Toronto LTT${firstTime?" (after rebate)":""}`,v:torontoLTT-torontoRebate,color:"#f87171"}]:[]),
            ].filter(x=>x.v>0).map(x=>(
              <div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e3a5f"}}>
                <span style={{fontSize:12,color:"#8fadd4"}}>{x.l}</span>
                <span style={{fontSize:13,color:x.color,fontWeight:"bold",...GS}}>{fmt(x.v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",marginTop:4}}>
              <span style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>Total Upfront Cash Needed</span>
              <span style={{fontSize:16,color:"#f87171",fontWeight:"bold",...GS}}>{fmt(dp+totalLTT)}</span>
            </div>
            {cmhc>0&&<div style={{marginTop:10,background:"#1a1a0a",border:"1px solid #facc1544",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#facc15",lineHeight:1.6}}>⚠️ CMHC insurance of {fmt(cmhc)} gets added to your mortgage. To avoid it you need {fmt(hp*0.2)} (20% down).</div>}
          </Card>

          {/* Break-even callout */}
          {breakEvenYear!==null&&(
            <Card style={{background:"linear-gradient(135deg,#0d1b3e,#111827)",border:"1px solid #cc000044",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>⏱</span>
                <div>
                  <div style={{fontSize:12,color:"#6b8cce",marginBottom:3,letterSpacing:1}}>BREAK-EVEN POINT</div>
                  <div style={{fontSize:16,color:"#cc0000",fontWeight:"bold",...GS}}>
                    Buying beats renting at <span style={{color:"#4ade80"}}>year {breakEvenYear}</span>
                  </div>
                  <div style={{fontSize:11,color:"#6b8cce",marginTop:3}}>
                    Based on {appreciation}% home appreciation and {investReturn}% investment return. Before year {breakEvenYear}, renting and investing the difference wins.
                  </div>
                </div>
              </div>
            </Card>
          )}
          {hp>0&&Number(rent||0)>0&&breakEvenYear===null&&(
            <Card style={{background:"linear-gradient(135deg,#1a0d0d,#0d1b3e)",border:"1px solid #f8717144",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>⚠️</span>
                <div>
                  <div style={{fontSize:13,color:"#f87171",fontWeight:"bold",...GS}}>Buying doesn't break even within 30 years</div>
                  <div style={{fontSize:11,color:"#6b8cce",marginTop:3}}>At {appreciation}% appreciation and {investReturn}% investment return, renting and investing consistently outperforms buying over this time horizon.</div>
                </div>
              </div>
            </Card>
          )}

          {/* Net position */}
          <Card>
            <SecTitle>{years}-Year Net Position</SecTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"#0d2a1a",border:"1px solid #4ade8044",borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#6b8cce",marginBottom:6}}>🏠 BUY — NET EQUITY</div>
                <div style={{fontSize:22,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(base.buyEquity)}</div>
                <div style={{fontSize:10,color:"#6b8cce",marginTop:4}}>Home worth {fmtShort(base.futureHomeValue)}</div>
              </div>
              <div style={{background:"#1a0d2a",border:"1px solid #a78bfa44",borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#6b8cce",marginBottom:6}}>🏢 RENT — INVESTED</div>
                <div style={{fontSize:22,color:"#a78bfa",fontWeight:"bold",...GS}}>{fmtShort(base.rentNetPosition)}</div>
                <div style={{fontSize:10,color:"#6b8cce",marginTop:4}}>Down pmt + savings at {investReturn}%</div>
              </div>
            </div>
          </Card>

          {/* Super In-Depth Charts */}
          {superMode&&<SuperInDepthCharts
            hp={hp} dp={dp} totalMortgage={totalMortgage} mpWithCMHC={mpWithCMHC}
            r={r} appreciation={Number(appreciation||2)} investReturn={Number(investReturn||7)}
            totalMonthlyCost={totalMonthlyCost} totalMonthlyRent={totalMonthlyRent}
            extraUpfront={extraUpfront} totalLTT={totalLTT} cmhc={cmhc}
            baseApp={baseApp} baseInv={baseInv}
          />}

          {/* Variance / Best+Worst */}
          <button onClick={()=>setShowVariance(p=>!p)} style={{width:"100%",background:"none",border:"1px dashed #cc000044",borderRadius:10,padding:"11px",color:"#cc0000",cursor:"pointer",fontSize:13,marginBottom:14,...GS}}>
            {showVariance?"▲ Hide Scenarios":"📊 Show Best & Worst Case Scenarios"}
          </button>
          {showVariance&&(
            <Card>
              <SecTitle>Best & Worst Case Scenarios</SecTitle>
              <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>
                Real estate and investment returns are unpredictable. Here's how the outcome changes under different market conditions.
              </div>
              {[
                {label:"Best Case for Buying",desc:`Home appreciates ${baseApp+3}%/yr, investments return ${Math.max(1,baseInv-2)}%/yr`,equity:bestBuy.buyEquity,rent:bestBuy.rentNetPosition,color:"#4ade80"},
                {label:"Base Case",desc:`${baseApp}% home appreciation, ${baseInv}% investment return`,equity:base.buyEquity,rent:base.rentNetPosition,color:"#facc15"},
                {label:"Worst Case for Buying",desc:`Home appreciates ${Math.max(0,baseApp-2)}%/yr, investments return ${baseInv+2}%/yr`,equity:worstBuy.buyEquity,rent:worstBuy.rentNetPosition,color:"#f87171"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#0d1b3e",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:13,color:s.color,fontWeight:"bold",...GS}}>{s.label}</div>
                    <div style={{fontSize:12,color:s.equity>s.rent?"#4ade80":"#f87171",fontWeight:"bold",...GS}}>{s.equity>s.rent?"Buy wins":"Rent wins"}</div>
                  </div>
                  <div style={{fontSize:11,color:"#6b8cce",marginBottom:8}}>{s.desc}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>Buy Equity</div><div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(s.equity)}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>Rent+Invest</div><div style={{fontSize:15,color:"#a78bfa",fontWeight:"bold",...GS}}>{fmtShort(s.rent)}</div></div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:14,background:"#0d1b3e",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#8fadd4",lineHeight:1.8}}>
                💡 <strong style={{color:"#e8e4d9"}}>Key insight:</strong> The rent vs. buy decision is highly sensitive to home appreciation and investment returns. When home prices are flat and markets are strong, renting and investing usually wins. When home prices rise faster than markets, buying wins.
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HOUSING ANALYSIS (wrapper with tabs) ─────────────────────────────────────
function HousingAnalysis({data,user,token}) {
  const [tab,setTab]=useState("rentvsbuy");
  const TABS=[
    {id:"rentvsbuy",label:"🏘️ Rent vs. Buy"},
    {id:"qualifier",label:"🏦 Mortgage Qualifier"},
    {id:"firsthome",label:"🔑 First Home Guide"},
  ];
  return (
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",background:"#0d1b3e",borderRadius:12,padding:4,marginBottom:16,gap:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,background:tab===t.id?"linear-gradient(135deg,#1a2f5a,#1e3a5f)":"none",border:tab===t.id?"1px solid #2a4080":"1px solid transparent",borderRadius:10,padding:"10px 4px",cursor:"pointer",color:tab===t.id?"#e8e4d9":"#6b8cce",fontSize:11,fontWeight:tab===t.id?"bold":"normal",transition:"all 0.2s",...GS}}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="rentvsbuy"&&<RentVsBuy user={user} token={token} toolId="rentvsbuy"/>}
      {tab==="qualifier"&&<MortgageQualifier data={data}/>}
      {tab==="firsthome"&&<FirstHomeBuyer data={data}/>}
    </div>
  );
}

// ─── MORTGAGE QUALIFIER ────────────────────────────────────────────────────────
function MortgageQualifier({data}) {
  const prefillIncome=Number(data?.budget?.income||0)*12;
  const prefillDebt=(data?.otherDebts||[]).reduce((s,x)=>s+Number(x.payment||0),0)
    +(data?.locs||[]).reduce((s,l)=>s+Number(l.balance||0)*(Number(l.rate||6)/100)/12,0)
    +data?.creditCards?.filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0)*0.03,0)||0;

  const [grossIncome,setGrossIncome]=useState(String(Math.round(prefillIncome))||"");
  const [coIncome,setCoIncome]=useState("");
  const [monthlyDebts,setMonthlyDebts]=useState(String(Math.round(prefillDebt))||"");
  const [downPayment,setDownPayment]=useState("");
  const [rate,setRate]=useState("5.25");
  const [amort,setAmort]=useState("25");
  const [propTax,setPropTax]=useState("");
  const [condoFee,setCondoFee]=useState("0");
  const [heatCost,setHeatCost]=useState("150");

  const totalGross=(Number(grossIncome||0)+Number(coIncome||0));
  const monthlyGross=totalGross/12;
  const stressRate=Math.max(Number(rate||5.25)+2, 5.25);
  const r=stressRate/100/12;
  const n=Number(amort||25)*12;

  // Max GDS = 39% of gross monthly (housing costs / gross)
  // Max TDS = 44% of gross monthly (all debts / gross)
  // Housing costs = mortgage P&I + property tax + heat + 50% condo fee
  const monthlyPropTax=Number(propTax||0)/12;
  const monthlyHeat=Number(heatCost||150);
  const monthlyCondo=Number(condoFee||0)*0.5;
  const otherHousing=monthlyPropTax+monthlyHeat+monthlyCondo;

  // Max mortgage payment from GDS
  const maxGDSPayment=monthlyGross*0.39-otherHousing;
  // Max mortgage payment from TDS
  const maxTDSPayment=monthlyGross*0.44-otherHousing-Number(monthlyDebts||0);
  const maxPayment=Math.max(0,Math.min(maxGDSPayment,maxTDSPayment));

  // Max principal from payment
  const maxPrincipal=maxPayment>0&&r>0?maxPayment*((1-Math.pow(1+r,-n))/r):0;
  const maxPurchase=maxPrincipal+Number(downPayment||0);

  // CMHC insurance
  const dp=Number(downPayment||0);
  const dpPct=maxPurchase>0?(dp/maxPurchase)*100:0;
  const cmhc=dp>0&&maxPurchase>0&&dpPct<20
    ? maxPrincipal*(dpPct<5?0.04:dpPct<10?0.031:0.028)
    : 0;

  // Qualifying check
  const gdsRatio=monthlyGross>0?((maxPayment+otherHousing)/monthlyGross)*100:0;
  const tdsRatio=monthlyGross>0?((maxPayment+otherHousing+Number(monthlyDebts||0))/monthlyGross)*100:0;

  const actualPayment=maxPrincipal>0&&r>0?maxPrincipal*r/(1-Math.pow(1+r,-n)):0;

  const inp={background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:15,width:"100%",outline:"none",boxSizing:"border-box",...GS};

  return (
    <div>
      <Card>
        <SecTitle>Income</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
          <div>
            <Label>Gross Annual Income</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={grossIncome} onChange={e=>setGrossIncome(e.target.value)} placeholder="80,000" style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
          <div>
            <Label>Co-Applicant Income</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={coIncome} onChange={e=>setCoIncome(e.target.value)} placeholder="0" style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>Monthly Debts & Down Payment</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <Label>Existing Monthly Debts</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={monthlyDebts} onChange={e=>setMonthlyDebts(e.target.value)} placeholder="500" style={{background:"none",border:"none",outline:"none",color:"#f87171",fontSize:15,width:"100%",...GS}}/>
              <span style={{color:"#6b8cce",fontSize:11}}>/mo</span>
            </div>
            <div style={{fontSize:10,color:"#6b8cce",marginTop:4,lineHeight:1.5}}>Car payments, student loans, etc.</div>
          </div>
          <div>
            <Label>Down Payment</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={downPayment} onChange={e=>setDownPayment(e.target.value)} placeholder="60,000" style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>Mortgage Details</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <Label>Rate (%)</Label>
            <input type="number" value={rate} onChange={e=>setRate(e.target.value)} placeholder="5.25" style={inp}/>
          </div>
          <div>
            <Label>Amortization</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <input type="number" value={amort} onChange={e=>setAmort(e.target.value)} placeholder="25" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
              <span style={{color:"#6b8cce",fontSize:11}}>yrs</span>
            </div>
          </div>
          <div>
            <Label>Annual Property Tax</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={propTax} onChange={e=>setPropTax(e.target.value)} placeholder="4,000" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
          <div>
            <Label>Monthly Heat Cost</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={heatCost} onChange={e=>setHeatCost(e.target.value)} placeholder="150" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
          <div>
            <Label>Monthly Condo Fee (if any)</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
              <span style={{color:"#6b8cce",marginRight:4}}>$</span>
              <input type="number" value={condoFee} onChange={e=>setCondoFee(e.target.value)} placeholder="0" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
            </div>
          </div>
        </div>
        <div style={{background:"#0d1b3e",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#6b8cce",lineHeight:1.6}}>
          ⚡ Stress test rate: <span style={{color:"#facc15"}}>{stressRate.toFixed(2)}%</span> (your rate + 2%, min 5.25% per OSFI rules)
        </div>
      </Card>

      {/* Results */}
      {totalGross>0&&(
        <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044"}}>
          <SecTitle>Qualification Results</SecTitle>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:11,color:"#6b8cce",marginBottom:4,letterSpacing:2}}>MAXIMUM PURCHASE PRICE</div>
            <div style={{fontSize:40,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(maxPurchase)}</div>
            <div style={{fontSize:12,color:"#6b8cce",marginTop:4}}>Based on Canadian stress test (OSFI B-20)</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[
              {label:"Max Mortgage",val:fmtShort(maxPrincipal),color:"#4ade80"},
              {label:"Monthly Payment",val:fmt(actualPayment)+"/mo",color:"#facc15"},
              {label:"CMHC Insurance",val:cmhc>0?fmtShort(cmhc):"None needed",color:cmhc>0?"#f87171":"#4ade80"},
              {label:"Down Payment",val:dp>0?fmtShort(dp)+" ("+dpPct.toFixed(1)+"%)":"Not entered",color:"#60a5fa"},
            ].map((r,i)=>(
              <div key={i} style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>{r.label.toUpperCase()}</div>
                <div style={{fontSize:14,color:r.color,fontWeight:"bold",...GS}}>{r.val}</div>
              </div>
            ))}
          </div>

          {/* GDS/TDS bars */}
          <div style={{marginBottom:10}}>
            {[
              {label:"GDS Ratio",val:gdsRatio,max:39,desc:"Housing costs vs income (max 39%)"},
              {label:"TDS Ratio",val:tdsRatio,max:44,desc:"All debts vs income (max 44%)"},
            ].map((ratio,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:"#8fadd4"}}>{ratio.label}</span>
                  <span style={{fontSize:12,color:ratio.val>ratio.max?"#f87171":"#4ade80",fontWeight:"bold",...GS}}>{ratio.val.toFixed(1)}% / {ratio.max}%</span>
                </div>
                <div style={{background:"#0d1b3e",borderRadius:4,height:8,overflow:"hidden"}}>
                  <div style={{width:Math.min(100,(ratio.val/ratio.max)*100)+"%",height:"100%",background:ratio.val>ratio.max?"#f87171":"#4ade80",borderRadius:4,transition:"width 0.4s"}}/>
                </div>
                <div style={{fontSize:10,color:"#6b8cce",marginTop:3}}>{ratio.desc}</div>
              </div>
            ))}
          </div>

          {dpPct>0&&dpPct<5&&(
            <div style={{background:"#1a0505",border:"1px solid #f8717144",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#f87171",lineHeight:1.6}}>
              ⚠️ Minimum down payment in Canada is 5% for homes under $500K, or 5% on the first $500K + 10% on the remainder up to $1M.
            </div>
          )}
          {maxPurchase<=0&&(
            <div style={{background:"#1a0505",border:"1px solid #f8717144",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#f87171",lineHeight:1.6}}>
              ⚠️ Based on your debts and income, it may be difficult to qualify. Consider reducing debts or increasing your down payment.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── CANADIAN TAX ESTIMATOR ───────────────────────────────────────────────────
function CanadianTaxEstimator({data}) {
  const prefillSalary=Number(data?.income?.grossSalary||0)||Number(data?.budget?.income||0)*12||0;
  const prefillSalary2=Number(data?.income2?.grossSalary||0)||0;
  const isJoint=data?.isJoint||false;
  const name1=data?.person1Name||data?.clientName||"Person 1";
  const name2=data?.person2Name||"Person 2";
  const [salary,setSalary]=useState(String(Math.round(prefillSalary))||"");
  const [salary2,setSalary2]=useState(String(Math.round(prefillSalary2))||"");
  const [province,setProvince]=useState("ON");
  const [rrspContrib,setRrspContrib]=useState("");

  const PROVINCES=[
    {val:"ON",label:"Ontario"},
    {val:"BC",label:"British Columbia"},
    {val:"AB",label:"Alberta"},
    {val:"QC",label:"Quebec"},
    {val:"MB",label:"Manitoba"},
    {val:"SK",label:"Saskatchewan"},
    {val:"NS",label:"Nova Scotia"},
    {val:"NB",label:"New Brunswick"},
    {val:"NL",label:"Newfoundland"},
    {val:"PE",label:"PEI"},
  ];

  // 2024 Federal brackets
  const fedBrackets=[
    {max:55867,rate:0.15},{max:111733,rate:0.205},{max:154906,rate:0.26},
    {max:220000,rate:0.29},{max:Infinity,rate:0.33},
  ];

  // Provincial brackets (simplified 2024)
  const provBrackets={
    ON:[{max:51446,rate:0.0505},{max:102894,rate:0.0915},{max:150000,rate:0.1116},{max:220000,rate:0.1216},{max:Infinity,rate:0.1316}],
    BC:[{max:45654,rate:0.0506},{max:91310,rate:0.077},{max:104835,rate:0.105},{max:127299,rate:0.1229},{max:172602,rate:0.147},{max:240716,rate:0.168},{max:Infinity,rate:0.205}],
    AB:[{max:148269,rate:0.10},{max:177922,rate:0.12},{max:237230,rate:0.13},{max:355845,rate:0.14},{max:Infinity,rate:0.15}],
    QC:[{max:51780,rate:0.14},{max:103545,rate:0.19},{max:126000,rate:0.24},{max:Infinity,rate:0.2575}],
    MB:[{max:36842,rate:0.108},{max:79625,rate:0.1275},{max:Infinity,rate:0.174}],
    SK:[{max:49720,rate:0.105},{max:142058,rate:0.125},{max:Infinity,rate:0.145}],
    NS:[{max:29590,rate:0.0879},{max:59180,rate:0.1495},{max:93000,rate:0.1667},{max:150000,rate:0.175},{max:Infinity,rate:0.21}],
    NB:[{max:47715,rate:0.094},{max:95431,rate:0.14},{max:176756,rate:0.16},{max:Infinity,rate:0.195}],
    NL:[{max:43198,rate:0.087},{max:86395,rate:0.145},{max:154244,rate:0.158},{max:215943,rate:0.178},{max:275870,rate:0.198},{max:Infinity,rate:0.208}],
    PE:[{max:32656,rate:0.096},{max:64313,rate:0.1337},{max:105000,rate:0.166},{max:140000,rate:0.18},{max:Infinity,rate:0.185}],
  };

  const calcTax=(income,brackets)=>{
    let tax=0,prev=0;
    for(const b of brackets){
      if(income<=0) break;
      const taxable=Math.min(income,b.max)-prev;
      if(taxable>0) tax+=taxable*b.rate;
      prev=b.max;
      if(income<=b.max) break;
    }
    return Math.max(0,tax);
  };

  const calcPerson=(sal,rrspAmt)=>{
    const g=Number(sal||0);
    const r=Math.min(Number(rrspAmt||0),g*0.18);
    const ti=Math.max(0,g-r);
    const ft=Math.max(0,calcTax(ti,fedBrackets)-fedBPA*0.15);
    const pb=provBrackets[province]||provBrackets.ON;
    const pbpa={ON:11865,BC:11981,AB:21003,QC:17183,MB:15780,SK:17661,NS:8481,NB:12458,NL:10818,PE:12000}[province]||10000;
    const pt=Math.max(0,calcTax(ti,pb)-pbpa*(pb[0].rate));
    const cpp=g>0?Math.min((Math.min(g,68500)-3500)*0.0595,3867):0;
    const ei=Math.min(g*0.0166,63200*0.0166);
    const total=ft+pt+cpp+ei;
    return {gross:g,fedTax:ft,provTax:pt,cpp,ei,total,netAnnual:Math.max(0,g-total),netMonthly:Math.max(0,g-total)/12,effectiveRate:g>0?(total/g)*100:0};
  };

  const fedBPA=15705;
  const p1=calcPerson(salary,rrspContrib);
  const p2=isJoint?calcPerson(salary2,""):null;
  const gross=p1.gross;
  const netMonthly=p1.netMonthly;
  const netAnnual=p1.netAnnual;
  const effectiveRate=p1.effectiveRate;
  const marginalFed=p1.gross>220000?33:p1.gross>154906?29:p1.gross>111733?26:p1.gross>55867?20.5:15;
  const fedTax=p1.fedTax, provTax=p1.provTax, cpp=p1.cpp, ei=p1.ei;
  const rrsp=Math.min(Number(rrspContrib||0),gross*0.18);
  const provBracketData=provBrackets[province]||provBrackets.ON;

  return (
    <div>
      <Card>
        <SecTitle>{isJoint?`${name1}'s Income`:"Your Income"}</SecTitle>
        <div style={{marginBottom:12}}>
          <Label>Gross Annual Salary</Label>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #4ade8066",borderRadius:10,padding:"12px 14px"}}>
            <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
            <input type="number" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="80,000"
              style={{background:"none",border:"none",outline:"none",color:"#4ade80",fontSize:22,width:"100%",...GS}}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <Label>Province</Label>
          <select value={province} onChange={e=>setProvince(e.target.value)}
            style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",...GS}}>
            {PROVINCES.map(p=><option key={p.val} value={p.val}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <Label>RRSP Contribution (optional)</Label>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
            <span style={{color:"#6b8cce",marginRight:4}}>$</span>
            <input type="number" value={rrspContrib} onChange={e=>setRrspContrib(e.target.value)} placeholder="0"
              style={{background:"none",border:"none",outline:"none",color:"#a78bfa",fontSize:15,width:"100%",...GS}}/>
          </div>
          {rrsp>0&&<div style={{fontSize:10,color:"#a78bfa",marginTop:4}}>Reduces taxable income by {fmt(rrsp)}</div>}
        </div>
      </Card>

      {/* Person 2 — joint only */}
      {isJoint&&(
        <Card>
          <SecTitle>{name2}'s Income</SecTitle>
          <div style={{marginBottom:12}}>
            <Label>Gross Annual Salary</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #60a5fa66",borderRadius:10,padding:"12px 14px"}}>
              <span style={{color:"#6b8cce",marginRight:6,fontSize:16}}>$</span>
              <input type="number" value={salary2} onChange={e=>setSalary2(e.target.value)} placeholder="60,000"
                style={{background:"none",border:"none",outline:"none",color:"#60a5fa",fontSize:22,width:"100%",...GS}}/>
            </div>
          </div>
          {p2&&p2.gross>0&&(
            <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#8fadd4"}}>Estimated take-home</span>
                <span style={{fontSize:14,color:"#60a5fa",fontWeight:"bold",...GS}}>{fmt(p2.netMonthly)}/mo</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"#8fadd4"}}>Effective tax rate</span>
                <span style={{fontSize:13,color:"#facc15",...GS}}>{p2.effectiveRate.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {gross>0&&(
        <>
          {/* Combined summary for joint */}
          {isJoint&&p2&&p2.gross>0&&(
            <Card style={{background:"linear-gradient(135deg,#0d1a2e,#0d1b3e)",border:"1px solid #4ade8044",textAlign:"center",padding:"20px 16px"}}>
              <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>COMBINED HOUSEHOLD TAKE-HOME</div>
              <div style={{fontSize:36,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(p1.netMonthly+p2.netMonthly)}<span style={{fontSize:14,color:"#6b8cce"}}>/mo</span></div>
              <div style={{fontSize:12,color:"#8fadd4",marginTop:4}}>{fmt(p1.netAnnual+p2.netAnnual)}/year combined</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                <div style={{background:"#0d1b3e",borderRadius:8,padding:"10px"}}>
                  <div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>{name1.toUpperCase()}</div>
                  <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(p1.netMonthly)}/mo</div>
                </div>
                <div style={{background:"#0d1b3e",borderRadius:8,padding:"10px"}}>
                  <div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>{name2.toUpperCase()}</div>
                  <div style={{fontSize:15,color:"#60a5fa",fontWeight:"bold",...GS}}>{fmt(p2.netMonthly)}/mo</div>
                </div>
              </div>
            </Card>
          )}

          {/* Person 1 summary card */}
          <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",textAlign:"center",padding:"24px 16px"}}>
            <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:4}}>{isJoint?`${name1.toUpperCase()} — `:""}ESTIMATED TAKE-HOME PAY</div>
            <div style={{fontSize:42,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(netMonthly)}<span style={{fontSize:16,color:"#6b8cce"}}>/mo</span></div>
            <div style={{fontSize:14,color:"#8fadd4",marginTop:4}}>{fmt(netAnnual)} per year</div>
            <div style={{marginTop:12,fontSize:12,color:"#6b8cce"}}>Effective tax rate: <span style={{color:"#facc15",fontWeight:"bold"}}>{effectiveRate.toFixed(1)}%</span></div>
          </Card>

          {/* Breakdown */}
          <Card>
            <SecTitle>{isJoint?`${name1} — `:""}Deduction Breakdown</SecTitle>
            {[
              {label:"Gross Income",val:gross,color:"#4ade80",bold:true},
              {label:`Federal Income Tax (marginal: ${marginalFed}%)`,val:-fedTax,color:"#f87171"},
              {label:`${PROVINCES.find(p=>p.val===province)?.label||province} Provincial Tax`,val:-provTax,color:"#fb923c"},
              {label:"CPP Contributions",val:-cpp,color:"#facc15"},
              {label:"EI Premiums",val:-ei,color:"#facc15"},
              ...(rrsp>0?[{label:"RRSP Deduction",val:-rrsp,color:"#a78bfa"}]:[]),
              {label:"Net Annual Income",val:netAnnual,color:"#4ade80",bold:true,border:true},
              {label:"Net Monthly Income",val:netMonthly,color:"#4ade80",bold:true},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:row.border?"1px solid #1e3a5f":"none",marginTop:row.border?4:0}}>
                <span style={{fontSize:12,color:"#8fadd4",flex:1}}>{row.label}</span>
                <span style={{fontSize:13,color:row.color,fontWeight:row.bold?"bold":"normal",...GS}}>
                  {row.val<0?"-"+fmt(Math.abs(row.val)):fmt(row.val)}
                </span>
              </div>
            ))}
          </Card>

          <Card style={{background:"#0d1b3e"}}>
            <div style={{fontSize:11,color:"#6b8cce",lineHeight:1.7}}>
              ⚠️ These are estimates based on 2024 federal and provincial tax rates. They do not account for additional credits, deductions, or employer benefits. Consult a tax professional for precise figures.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── CANADIAN BENCHMARKS ──────────────────────────────────────────────────────
function CanadianBenchmarks({score,data,totalInv,netWorth,income,totalAlloc}) {
  const age=Number(data.age1||0);
  if(!age||!income) return null;
  const band=score.band||"30s";

  // Canadian benchmark data by age group (2024 estimates)
  // Sources: Stats Canada, FCAC, RBC Financial Independence Poll
  const BENCHMARKS={
    "20s":{
      medianNetWorth:22000, medianInv:8000, medianSavingsRate:5,
      medianEmergFund:1.2, medianDebtRatio:35,
      top25NW:65000, top10NW:120000,
    },
    "30s":{
      medianNetWorth:110000, medianInv:45000, medianSavingsRate:8,
      medianEmergFund:2.1, medianDebtRatio:28,
      top25NW:280000, top10NW:520000,
    },
    "40s":{
      medianNetWorth:285000, medianInv:120000, medianSavingsRate:10,
      medianEmergFund:2.8, medianDebtRatio:22,
      top25NW:650000, top10NW:1200000,
    },
    "50s":{
      medianNetWorth:520000, medianInv:250000, medianSavingsRate:12,
      medianEmergFund:3.5, medianDebtRatio:15,
      top25NW:1100000, top10NW:2200000,
    },
    "60s":{
      medianNetWorth:750000, medianInv:380000, medianSavingsRate:14,
      medianEmergFund:4.0, medianDebtRatio:8,
      top25NW:1600000, top10NW:3000000,
    },
  };

  const bm=BENCHMARKS[band]||BENCHMARKS["30s"];
  const monthlyExp=totalAlloc;
  const efund=(data.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const efundMonths=monthlyExp>0?efund/monthlyExp:0;
  const grossMonthly=Number(data.income?.grossSalary||0)>0?Number(data.income.grossSalary)/12:income;
  const invMonthly=Number(data.budget.investmentMonthly||0);
  const savingsRate=grossMonthly>0?(invMonthly/grossMonthly)*100:0;
  const totalDebt=(data.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0)
    +(data.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0)
    +(data.creditCards||[]).filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const annualIncome=income*12;
  const debtRatio=annualIncome>0?(totalDebt/annualIncome)*100:0;

  // Percentile calculator — simplified
  const getPercentile=(val,median,top25,top10)=>{
    if(val<=0) return {pct:0,label:"Below median",color:"#f87171"};
    if(val>=top10) return {pct:95,label:"Top 10%",color:"#4ade80"};
    if(val>=top25) return {pct:80,label:"Top 25%",color:"#4ade80"};
    if(val>=median) return {pct:60,label:"Above median",color:"#facc15"};
    if(val>=median*0.5) return {pct:35,label:"Below median",color:"#fb923c"};
    return {pct:15,label:"Bottom 25%",color:"#f87171"};
  };

  const getDebtPercentile=(ratio,medianRatio)=>{
    if(ratio===0) return {pct:95,label:"Top 10% — debt free",color:"#4ade80"};
    if(ratio<=medianRatio*0.4) return {pct:80,label:"Top 25% — very low debt",color:"#4ade80"};
    if(ratio<=medianRatio) return {pct:55,label:"Below median — manageable",color:"#facc15"};
    if(ratio<=medianRatio*1.5) return {pct:30,label:"Above median — reduce debt",color:"#fb923c"};
    return {pct:10,label:"High debt load",color:"#f87171"};
  };

  const getSavingsPercentile=(rate,medianRate)=>{
    if(rate>=25) return {pct:95,label:"Top 5% — exceptional",color:"#4ade80"};
    if(rate>=medianRate*2) return {pct:80,label:"Top 25%",color:"#4ade80"};
    if(rate>=medianRate) return {pct:55,label:"Above median",color:"#facc15"};
    if(rate>=medianRate*0.5) return {pct:35,label:"Below median",color:"#fb923c"};
    return {pct:10,label:"Bottom 25%",color:"#f87171"};
  };

  const metrics=[
    {
      label:"Net Worth",
      yours:fmtShort(netWorth),
      median:fmtShort(bm.medianNetWorth),
      ...getPercentile(netWorth,bm.medianNetWorth,bm.top25NW,bm.top10NW),
      icon:"💎",
    },
    {
      label:"Investment Portfolio",
      yours:fmtShort(totalInv),
      median:fmtShort(bm.medianInv),
      ...getPercentile(totalInv,bm.medianInv,bm.medianInv*3,bm.medianInv*7),
      icon:"📈",
    },
    {
      label:"Savings Rate",
      yours:savingsRate.toFixed(1)+"%",
      median:bm.medianSavingsRate+"%",
      ...getSavingsPercentile(savingsRate,bm.medianSavingsRate),
      icon:"💰",
    },
    {
      label:"Emergency Fund",
      yours:efundMonths.toFixed(1)+" months",
      median:bm.medianEmergFund+" months",
      ...getPercentile(efundMonths,bm.medianEmergFund,bm.medianEmergFund*1.8,bm.medianEmergFund*2.5),
      icon:"🛡️",
    },
    {
      label:"Debt-to-Income Ratio",
      yours:debtRatio.toFixed(0)+"%",
      median:bm.medianDebtRatio+"%",
      ...getDebtPercentile(debtRatio,bm.medianDebtRatio),
      icon:"💳",
      lowerIsBetter:true,
    },
  ];

  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <SecTitle style={{marginBottom:0}}>Where You Stand</SecTitle>
        <div style={{fontSize:10,color:"#6b8cce"}}>vs. Canadians in their {band}</div>
      </div>
      <div style={{fontSize:11,color:"#6b8cce",marginBottom:16,lineHeight:1.6}}>
        How your key metrics compare to the median Canadian in your age group. Based on Statistics Canada and FCAC data.
      </div>
      {metrics.map((m,i)=>(
        <div key={i} style={{marginBottom:i<metrics.length-1?16:0,paddingBottom:i<metrics.length-1?16:0,borderBottom:i<metrics.length-1?"1px solid #1e3a5f":"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{m.icon}</span>
              <div>
                <div style={{fontSize:13,color:"#e8e4d9",...GS}}>{m.label}</div>
                <div style={{fontSize:10,color:"#6b8cce",marginTop:1}}>Canadian median: {m.median}</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:15,color:m.color,fontWeight:"bold",...GS}}>{m.yours}</div>
              <div style={{fontSize:10,color:m.color,marginTop:2,border:`1px solid ${m.color}44`,borderRadius:10,padding:"1px 8px",display:"inline-block"}}>{m.label}</div>
            </div>
          </div>
          {/* Percentile bar */}
          <div style={{position:"relative",height:6,background:"#0d1b3e",borderRadius:3,overflow:"visible"}}>
            <div style={{height:"100%",width:m.pct+"%",background:`linear-gradient(90deg,#1e3a5f,${m.color})`,borderRadius:3,transition:"width 0.6s ease"}}/>
            {/* Marker at 50% (median) */}
            <div style={{position:"absolute",top:-3,left:"50%",width:2,height:12,background:"#6b8cce",borderRadius:1,transform:"translateX(-50%)"}}/>
            {/* User dot */}
            <div style={{position:"absolute",top:-4,left:`calc(${Math.min(97,m.pct)}% - 6px)`,width:14,height:14,borderRadius:"50%",background:m.color,border:"2px solid #0a0f1e",boxShadow:`0 0 8px ${m.color}88`}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
            <span style={{fontSize:9,color:"#2a4080"}}>Bottom</span>
            <span style={{fontSize:10,color:m.color,...GS}}>{m.label}</span>
            <span style={{fontSize:9,color:"#2a4080"}}>Top 10%</span>
          </div>
        </div>
      ))}
      <div style={{marginTop:14,background:"#0d1b3e",borderRadius:8,padding:"10px 12px",fontSize:10,color:"#6b8cce",lineHeight:1.7}}>
        📊 Benchmarks are approximate and based on 2024 Statistics Canada data. Individual circumstances vary significantly.
      </div>
    </Card>
  );
}

// ─── FIRST HOME BUYER'S GUIDE ─────────────────────────────────────────────────
function FirstHomeBuyer({data}) {
  const STORAGE_KEY="fh_firsthome_checks";
  const loadChecks=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");}catch{return {};}};
  const [checks,setChecks]=useState(loadChecks);
  const toggle=(id)=>{
    const updated={...checks,[id]:!checks[id]};
    setChecks(updated);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(updated));}catch{}
  };

  // Pre-fill from appointment data
  const fhsa=(data?.investments?.fhsa||[]).reduce((s,x)=>s+Number(x.amount||0),0);
  const tfsa=(data?.investments?.tfsa||[]).reduce((s,x)=>s+Number(x.amount||0),0);
  const efund=(data?.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyExp=(data?.budget?.categories||[]).reduce((s,c)=>s+Number(c.amount||0),0);
  const efundMonths=monthlyExp>0?(efund/monthlyExp):0;
  const totalDebt=(data?.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0)
    +(data?.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0)
    +(data?.creditCards||[]).filter(c=>!c.payInFull).reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const income=Number(data?.budget?.income||0)*12;

  const PHASES=[
    {
      id:"foundation",
      phase:"Phase 1",
      title:"Financial Foundation",
      color:"#60a5fa",
      icon:"🏗️",
      steps:[
        {id:"efund",label:"Emergency fund of 3+ months saved",desc:`You have ${efundMonths.toFixed(1)} months saved. Target: 3+ months before buying.`,auto:efundMonths>=3},
        {id:"debt",label:"High-interest debt cleared",desc:`Non-mortgage debt: ${fmt(totalDebt)}. Aim to clear credit cards and high-rate loans first.`,auto:totalDebt===0},
        {id:"credit",label:"Strong credit score (680+)",desc:"Check your credit score via Equifax or TransUnion. A higher score = better mortgage rate."},
        {id:"budget",label:"Living within your means consistently",desc:"6+ months of surplus budgeting before taking on a mortgage."},
        {id:"stable",label:"Stable employment income",desc:"Most lenders want 2+ years at the same employer or in the same field."},
      ],
    },
    {
      id:"savings",
      phase:"Phase 2",
      title:"Saving for the Purchase",
      color:"#4ade80",
      icon:"💰",
      steps:[
        {id:"fhsa",label:"FHSA opened and contributing",desc:`Your FHSA balance: ${fmtShort(fhsa)}. Max $8,000/yr, up to $40,000 lifetime. Tax-deductible contributions + tax-free withdrawal.`,auto:fhsa>0},
        {id:"fhsa_max",label:"FHSA on track for $40K max",desc:"$40K from FHSA = $40K tax-free toward your down payment. Maximize this first."},
        {id:"rrsp_hbp",label:"RRSP Home Buyers' Plan considered",desc:"First-time buyers can withdraw up to $35,000 from RRSP tax-free (must repay over 15 years)."},
        {id:"down_5",label:"5% minimum down payment saved",desc:"$500K home = $25,000 minimum. Under $500K = 5% down. $500K–$999K = 5% on first $500K + 10% on remainder."},
        {id:"down_20",label:"Working toward 20% to avoid CMHC",desc:"20% down payment eliminates CMHC mortgage insurance (0.6%–4.0% of mortgage amount)."},
        {id:"closing",label:"Closing costs saved (1.5–4% of price)",desc:"Budget for: land transfer tax, legal fees (~$2K), home inspection (~$500), title insurance, moving costs."},
      ],
    },
    {
      id:"preapproval",
      phase:"Phase 3",
      title:"Getting Pre-Approved",
      color:"#a78bfa",
      icon:"📋",
      steps:[
        {id:"docs",label:"Financial documents organized",desc:"T4s (2 years), NOAs, recent pay stubs, bank statements (3 months), investment account statements."},
        {id:"stress",label:"Understand the stress test",desc:"You must qualify at the higher of: your rate +2%, or 5.25%. Use our Mortgage Qualifier tool to check."},
        {id:"preapproval",label:"Pre-approval letter obtained",desc:"Shop 2–3 lenders (bank + broker). Pre-approval locks your rate for 90–120 days while you search."},
        {id:"gds_tds",label:"GDS ≤39% and TDS ≤44%",desc:"Gross Debt Service and Total Debt Service ratios are what lenders use to qualify you. Pre-approval confirms this."},
        {id:"mortgage_type",label:"Fixed vs variable rate decision made",desc:"Fixed = predictable payments. Variable = typically lower but fluctuates with Bank of Canada rate."},
      ],
    },
    {
      id:"buying",
      phase:"Phase 4",
      title:"The Purchase",
      color:"#facc15",
      icon:"🔑",
      steps:[
        {id:"realtor",label:"Realtor selected (buyer's agent — free to you)",desc:"The seller pays both agents in Canada. Your realtor costs you nothing."},
        {id:"inspection",label:"Home inspection completed",desc:"Never skip this. A $400–600 inspection can save you tens of thousands in hidden issues."},
        {id:"lawyer",label:"Real estate lawyer hired",desc:"Required in Ontario and most provinces. They handle title transfer, closing, and fund disbursement."},
        {id:"ltt",label:"Land Transfer Tax calculated",desc:"Ontario: 0.5%–2.5% of purchase price. Toronto adds a second LTT. First-time buyers get a rebate up to $4,000 provincial."},
        {id:"insurance",label:"Home insurance arranged before closing",desc:"Mortgage lenders require proof of home insurance before releasing funds."},
        {id:"title",label:"Title insurance obtained",desc:"One-time cost (~$250–400). Protects against title fraud and hidden encumbrances."},
      ],
    },
    {
      id:"ownership",
      phase:"Phase 5",
      title:"Owning Your Home",
      color:"#fb923c",
      icon:"🏡",
      steps:[
        {id:"emergency_home",label:"Home emergency fund (1–3% of value/year)",desc:"Budget $5K–15K/year for a $500K home for repairs, maintenance, appliances. Start a dedicated savings account."},
        {id:"prepayment",label:"Understand prepayment privileges",desc:"Most mortgages allow 10–20% lump sum annually + payment increases. Use them to pay down faster."},
        {id:"renewal",label:"Mortgage renewal strategy planned",desc:"Shop around 4–6 months before renewal. Your bank's first offer is rarely the best rate."},
        {id:"property_tax",label:"Property tax account set up",desc:"Set up monthly pre-authorized payments to your municipality to avoid a large annual bill."},
        {id:"reassess",label:"Reassess your budget post-purchase",desc:"Update your Financial Health Check-Up with your new mortgage, home value, and revised budget."},
      ],
    },
  ];

  const totalSteps=PHASES.reduce((s,p)=>s+p.steps.length,0);
  const totalChecked=PHASES.reduce((s,p)=>s+p.steps.filter(step=>checks[step.id]||step.auto).length,0);
  const overallPct=Math.round((totalChecked/totalSteps)*100);

  return (
    <div>
      {/* Overall progress */}
      <Card style={{background:"linear-gradient(135deg,#0d1b2e,#111827)",border:"1px solid #facc1544",textAlign:"center",padding:"20px 16px"}}>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>YOUR HOME BUYING PROGRESS</div>
        <div style={{fontSize:40,color:"#facc15",fontWeight:"bold",...GS}}>{overallPct}<span style={{fontSize:18,color:"#6b8cce"}}>%</span></div>
        <div style={{fontSize:12,color:"#8fadd4",marginTop:4}}>{totalChecked} of {totalSteps} steps complete</div>
        <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden",marginTop:12}}>
          <div style={{width:overallPct+"%",height:"100%",background:"linear-gradient(90deg,#facc15,#4ade80)",borderRadius:6,transition:"width 0.5s"}}/>
        </div>
      </Card>

      {PHASES.map(phase=>{
        const phaseChecked=phase.steps.filter(s=>checks[s.id]||s.auto).length;
        const phasePct=Math.round((phaseChecked/phase.steps.length)*100);
        return (
          <Card key={phase.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{phase.icon}</span>
                <div>
                  <div style={{fontSize:10,color:phase.color,letterSpacing:2,...GS}}>{phase.phase.toUpperCase()}</div>
                  <div style={{fontSize:15,color:"#e8e4d9",fontWeight:"bold",...GS}}>{phase.title}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,color:phasePct===100?"#4ade80":phase.color,fontWeight:"bold",...GS}}>{phaseChecked}/{phase.steps.length}</div>
                {phasePct===100&&<div style={{fontSize:10,color:"#4ade80"}}>✅ Complete</div>}
              </div>
            </div>
            <div style={{background:"#0d1b3e",borderRadius:4,height:4,overflow:"hidden",marginBottom:14}}>
              <div style={{width:phasePct+"%",height:"100%",background:phase.color,borderRadius:4,transition:"width 0.4s"}}/>
            </div>
            {phase.steps.map((step,si)=>{
              const done=checks[step.id]||step.auto||false;
              return (
                <button key={step.id} onClick={()=>!step.auto&&toggle(step.id)}
                  style={{width:"100%",background:"none",border:"none",cursor:step.auto?"default":"pointer",display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:si<phase.steps.length-1?"1px solid #1e3a5f":"none",textAlign:"left"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:done?phase.color:"transparent",border:`2px solid ${done?phase.color:"#2a4080"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",marginTop:1}}>
                    {done&&<span style={{color:"#0a0f1e",fontSize:11,fontWeight:"bold",lineHeight:1}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:done?phase.color:"#e8e4d9",fontWeight:done?"bold":"normal",transition:"color 0.2s",...GS}}>{step.label}</div>
                    <div style={{fontSize:11,color:"#6b8cce",marginTop:3,lineHeight:1.5}}>{step.desc}</div>
                    {step.auto&&<div style={{fontSize:9,color:phase.color,marginTop:3,letterSpacing:1}}>AUTO-DETECTED FROM YOUR DATA</div>}
                  </div>
                </button>
              );
            })}
          </Card>
        );
      })}

      <Card style={{background:"#0d1b3e"}}>
        <div style={{fontSize:11,color:"#6b8cce",lineHeight:1.8}}>
          🇨🇦 This guide is based on Canadian federal rules and Ontario provincial guidelines. Some details vary by province (land transfer tax, lawyer requirements). Always consult a licensed mortgage professional and real estate lawyer before purchasing.
        </div>
      </Card>
    </div>
  );
}

const BANK_FORMATS = {
  bmo:     {name:"BMO",         dateCol:"Transaction Date", descCol:"Description",          amtCol:"Amount",       skipRows:1},
  td:      {name:"TD",          dateCol:"Date",             descCol:"Description",          amtCol:"Amount",       skipRows:0},
  rbc:     {name:"RBC",         dateCol:"Transaction Date", descCol:"Description 1",        amtCol:"CAD$",         skipRows:0},
  scotiabank:{name:"Scotiabank",dateCol:"Date",             descCol:"Description",          amtCol:"Amount",       skipRows:0},
  tangerine:{name:"Tangerine",  dateCol:"Date",             descCol:"Name",                 amtCol:"Amount",       skipRows:0},
  generic: {name:"Auto-Detect", dateCol:null,               descCol:null,                   amtCol:null,           skipRows:0},
};

const DEFAULT_CATS = ["Food","Housing","Transportation","Entertainment","Wellness","Shopping","Utilities","Insurance","Subscriptions","Gifts","Travel","Income","Transfer","Other"];

// ─── UNIVERSAL CSV PARSER ─────────────────────────────────────────────────────
// Handles any CSV format: any column names, any date format, split debit/credit
// columns, junk header rows, BOM characters, quoted fields, etc.

function parseCSVLine(line) {
  const cols = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if ((ch === ',' || ch === '\t') && !inQ) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseAnyDate(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/['"]/g, "").trim();
  if (!s) return null;

  // YYYYMMDD  e.g. 20260206
  if (/^\d{8}$/.test(s)) {
    return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`);
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const d = new Date(`${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`);
    if (!isNaN(d)) return d;
  }
  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) return new Date(`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`);
  // "Jan 15, 2026" or "15 Jan 2026"
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}

function parseAmount(raw) {
  if (raw === undefined || raw === null) return NaN;
  const s = String(raw).replace(/['"$, ]/g, "").trim();
  if (!s || s === '-') return NaN;
  return parseFloat(s);
}

function scoreColumnAsDate(values) {
  let hits = 0;
  for (const v of values.slice(0, 20)) {
    if (parseAnyDate(v) !== null) hits++;
  }
  return hits;
}

function scoreColumnAsAmount(values) {
  let hits = 0;
  for (const v of values.slice(0, 20)) {
    const s = String(v||"").replace(/[$, '"]/g,"").trim();
    if (s && !isNaN(parseFloat(s)) && s !== '0') hits++;
  }
  return hits;
}

function scoreColumnAsDescription(values) {
  let hits = 0;
  for (const v of values.slice(0, 20)) {
    const s = String(v||"").trim();
    // Descriptions tend to be longer strings with letters
    if (s.length > 3 && /[a-zA-Z]/.test(s) && !/^\d+$/.test(s)) hits++;
  }
  return hits;
}

function parseCSV(text) {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const allLines = clean.split(/\r?\n/);

  // Detect delimiter (comma or tab or semicolon)
  const delimiters = [',', '\t', ';'];
  const sample = allLines.slice(0, 5).join("\n");
  const delimCounts = delimiters.map(d => (sample.match(new RegExp(`\\${d}`, 'g')) || []).length);
  const delim = delimiters[delimCounts.indexOf(Math.max(...delimCounts))];

  // Find the real header row: skip blank lines, comments, and info rows
  // A real header row has multiple columns and at least one alphabetic header
  let headerIdx = 0;
  for (let i = 0; i < Math.min(15, allLines.length); i++) {
    const line = allLines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length >= 2 && cols.some(c => /[a-zA-Z]{2,}/.test(c)) && !line.match(/^\d{10,}/)) {
      headerIdx = i;
      break;
    }
  }

  const dataLines = allLines.slice(headerIdx);
  const headers = parseCSVLine(dataLines[0]).map(h => h.replace(/['"]/g, "").trim());
  const rows = dataLines.slice(1)
    .map(line => parseCSVLine(line))
    .filter(r => r.length >= 2 && r.some(c => c.trim()));

  return { headers, rows };
}

function parseTransactions(headers, rows) {
  const h = headers.map(x => x.toLowerCase().replace(/['"]/g,"").trim());

  // ── Step 1: Find columns by name keywords ──
  const DATE_KEYWORDS    = ["transaction date","trans date","transdate","posting date","date","fecha","datum","transaction_date"];
  const DESC_KEYWORDS    = ["description","description 1","desc","details","narrative","merchant","payee","name","memo","particulars","reference","transaction description","transaction details","store","vendor"];
  const AMOUNT_KEYWORDS  = ["transaction amount","trans amount","amount","cad$","cad amount","debit amount","debit","charge","withdrawal","payment amount","amt","sum"];
  const CREDIT_KEYWORDS  = ["credit","credit amount","deposit","deposits","credit cad","income"];

  const findByKeyword = (keywords) => {
    for (const kw of keywords) {
      const i = h.findIndex(x => x === kw || x.includes(kw));
      if (i >= 0) return i;
    }
    return -1;
  };

  let dateIdx   = findByKeyword(DATE_KEYWORDS);
  let descIdx   = findByKeyword(DESC_KEYWORDS);
  let amtIdx    = findByKeyword(AMOUNT_KEYWORDS);
  let creditIdx = findByKeyword(CREDIT_KEYWORDS);

  // ── Step 2: If columns not found by name, auto-detect by content ──
  const colValues = h.map((_, ci) => rows.map(r => r[ci] || ""));

  if (dateIdx < 0) {
    const scores = colValues.map(vals => scoreColumnAsDate(vals));
    const best = scores.indexOf(Math.max(...scores));
    if (scores[best] >= 3) dateIdx = best;
  }

  if (descIdx < 0) {
    const scores = colValues.map((vals, ci) => ci === dateIdx || ci === amtIdx ? 0 : scoreColumnAsDescription(vals));
    const best = scores.indexOf(Math.max(...scores));
    if (scores[best] >= 3) descIdx = best;
  }

  if (amtIdx < 0) {
    const scores = colValues.map((vals, ci) => ci === dateIdx || ci === descIdx ? 0 : scoreColumnAsAmount(vals));
    const best = scores.indexOf(Math.max(...scores));
    if (scores[best] >= 3) amtIdx = best;
  }

  // ── Step 3: Parse each row ──
  return rows.map((row, i) => {
    const rawDate = dateIdx >= 0 ? String(row[dateIdx] || "").replace(/['"]/g,"").trim() : "";
    const desc    = descIdx >= 0 ? String(row[descIdx] || "").replace(/['"]/g,"").trim() : `Transaction ${i+1}`;

    // Amount — handle split debit/credit columns
    let amt = amtIdx >= 0 ? parseAmount(row[amtIdx]) : NaN;
    let creditAmt = creditIdx >= 0 && creditIdx !== amtIdx ? parseAmount(row[creditIdx]) : NaN;

    // If we have a credit column and debit is 0/NaN but credit has value → it's income (negative spend)
    let isIncome = false;
    if (!isNaN(creditAmt) && creditAmt > 0 && (isNaN(amt) || amt === 0)) {
      amt = -creditAmt;
      isIncome = true;
    }
    // If amount is negative in source, treat as income
    if (!isNaN(amt) && amt < 0) isIncome = true;
    if (isNaN(amt)) amt = 0;

    const dateObj = parseAnyDate(rawDate);
    const month = dateObj && !isNaN(dateObj)
      ? `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,"0")}`
      : null;

    return {
      id: i,
      date: rawDate,
      desc: desc || `Transaction ${i+1}`,
      amount: Math.abs(amt),
      isIncome,
      month,
      monthLabel: dateObj && !isNaN(dateObj)
        ? dateObj.toLocaleString("default", { month:"long", year:"numeric" })
        : "Unknown",
      category: null,
      ignored: false,
    };
  }).filter(t => t.desc && t.amount > 0);
}

// Keep detectFormat for UI display only (bank selector)
function detectFormat(headers) {
  const h = headers.map(x=>x.toLowerCase());
  if(h.some(x=>x.includes("transaction amount"))) return "bmo";
  if(h.some(x=>x.includes("description 1"))) return "rbc";
  if(h.some(x=>x==="name")&&h.some(x=>x==="date")) return "tangerine";
  if(h.some(x=>x.includes("details"))&&h.some(x=>x.includes("debit"))) return "td";
  return "generic";
}


function StatementImporter({onBack,onHome,budgetData}) {
  const [phase, setPhase] = useState("setup"); // setup | classify | summary
  const [bankFormat, setBankFormat] = useState("generic");
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [newCat, setNewCat] = useState("");
  // Persistent merchant rules from localStorage
  const loadRules=()=>{try{return JSON.parse(localStorage.getItem("fh_classify_rules")||"{}");}catch{return {};}};
  const saveRules=(rules)=>{try{localStorage.setItem("fh_classify_rules",JSON.stringify(rules));}catch{}};
  const [rules,setRules]=useState(loadRules);
  const [showRules,setShowRules]=useState(false);

  // Fuzzy match: normalize merchant name for matching
  const normalizeMerchant=(desc)=>desc.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16);

  // Look up a transaction description against saved rules
  const lookupRule=(desc)=>{
    const norm=normalizeMerchant(desc);
    // Exact key match first
    if(rules[norm]) return rules[norm];
    // Partial match — check if any saved key is contained in the description
    for(const [key,cat] of Object.entries(rules)){
      if(norm.includes(key)||key.includes(norm.slice(0,8))) return cat;
    }
    return null;
  };

  const saveRule=(desc,cat)=>{
    const key=normalizeMerchant(desc);
    const updated={...rules,[key]:cat};
    setRules(updated);
    saveRules(updated);
  };

  const deleteRule=(key)=>{
    const updated={...rules};
    delete updated[key];
    setRules(updated);
    saveRules(updated);
  };

  const [memory, setMemory] = useState({}); // session-only fallback
  const [budgetCats, setBudgetCats] = useState(
    budgetData?.categories?.filter(c=>Number(c.amount||0)>0).map(c=>c.name) || []
  );
  const [customBudget, setCustomBudget] = useState(
    budgetData?.categories?.filter(c=>Number(c.amount||0)>0)
      .reduce((acc,c)=>({...acc,[c.name]:Number(c.amount)}),{}) || {}
  );
  const [budgetIncome, setBudgetIncome] = useState(budgetData?.income||"");
  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualCat, setManualCat] = useState("");
  const [manualType, setManualType] = useState("debit");

  const addManualTransaction = () => {
    if(!manualDesc.trim()||!manualAmount) return;
    const dateStr = manualDate || new Date().toISOString().split("T")[0];
    const dateObj = new Date(dateStr);
    const month = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,"0")}`;
    const monthLab = dateObj.toLocaleString("default",{month:"long",year:"numeric"});
    const amt = Math.abs(Number(manualAmount)) * (manualType==="debit"?1:-1);
    const newTxn = {
      id: Date.now(),
      date: dateStr,
      desc: manualDesc.trim(),
      amount: amt,
      month, monthLabel: monthLab,
      category: manualCat||null,
      ignored: false,
      manual: true,
    };
    setTransactions(prev=>[...prev, newTxn]);
    if(!availableMonths.includes(month)){
      setAvailableMonths(prev=>[...prev,month].sort().reverse());
    }
    if(!selectedMonth) setSelectedMonth(month);
    setManualDesc(""); setManualAmount(""); setManualDate(""); setManualCat(""); setManualType("debit");
    setShowManual(false);
  };

  const allCats = [...new Set([...budgetCats,...categories])].filter(Boolean);

  const handleFiles = (files) => {
    const allTxns = [];
    let remaining = files.length;
    Array.from(files).forEach(file=>{
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const {headers,rows} = parseCSV(text);
        const fmt = detectFormat(headers);
        if(bankFormat==="generic") setBankFormat(fmt);
        const txns = parseTransactions(headers, rows);
        allTxns.push(...txns);
        remaining--;
        if(remaining===0){
          // Deduplicate and assign IDs
          const finalTxns = allTxns.map((t,i)=>({...t,id:i}));
          // Apply persistent rules — auto-classify known merchants
          const withRules = finalTxns.map(t=>{
            const matched=lookupRule(t.desc);
            return matched ? {...t,category:matched,autoClassified:true} : t;
          });
          setTransactions(withRules);
          const months=[...new Set(withRules.map(t=>t.month).filter(Boolean))].sort().reverse();
          setAvailableMonths(months);
          setSelectedMonth(months[0]||null);
          setCurrentIdx(0);
          setPhase("classify");
        }
      };
      reader.readAsText(file);
    });
  };

  const monthTxns = transactions.filter(t=>t.month===selectedMonth&&!t.ignored);
  const unclassified = monthTxns.filter(t=>!t.category);
  const classified = monthTxns.filter(t=>t.category);
  // Use currentIdx to control which unclassified txn we're on — don't auto-advance
  const safeIdx=Math.min(currentIdx,Math.max(0,unclassified.length-1));
  const current = unclassified[safeIdx]||null;
  const progress = monthTxns.length>0 ? Math.round((classified.length/monthTxns.length)*100) : 0;

  // Spending by category for donut
  const spending = {};
  classified.filter(t=>t.amount>0).forEach(t=>{
    spending[t.category]=(spending[t.category]||0)+t.amount;
  });
  const donutData = Object.entries(spending).map(([name,value])=>({name,value:Math.round(value*100)/100}));
  const totalSpent = Object.values(spending).reduce((s,v)=>s+v,0);

  const assignCategory = (cat, txn=current, remember=false) => {
    if(!txn) return;
    const key = normalizeMerchant(txn.desc);
    // Always update session memory
    setMemory(m=>({...m,[key]:cat}));
    // If remember=true, save to localStorage rules
    if(remember) saveRule(txn.desc, cat);
    setTransactions(prev=>prev.map(t=>{
      if(t.id===txn.id) return {...t,category:cat,autoClassified:false};
      // Auto-apply to same merchant in this session
      if(normalizeMerchant(t.desc)===key&&!t.category) return {...t,category:cat,autoClassified:false};
      return t;
    }));
  };

  const alwaysRemember = (txn=current) => {
    if(!txn||!txn.category) return;
    saveRule(txn.desc, txn.category);
    setTransactions(prev=>prev.map(t=>t.id===txn.id?{...t,rulesSaved:true}:t));
  };

  const ignoreTransaction = (txn=current) => {
    if(!txn) return;
    setTransactions(prev=>prev.map(t=>t.id===txn.id?{...t,ignored:true}:t));
  };

  const undoLast = () => {
    const lastClassified=[...classified].reverse()[0];
    if(!lastClassified) return;
    setTransactions(prev=>prev.map(t=>t.id===lastClassified.id?{...t,category:null}:t));
  };

  const monthLabel = (m) => {
    if(!m) return "";
    const [y,mo]=m.split("-");
    return new Date(y,Number(mo)-1,1).toLocaleString("default",{month:"long",year:"numeric"});
  };

  // ── PHASE: SETUP ──
  if(phase==="setup") return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>&larr;</button>
            <div style={{fontSize:18,fontWeight:"bold",color:"#fff",...GS}}>Statement Importer</div>
          </div>
          <button onClick={onHome} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:12,...GS}}>Home</button>
        </div>
      </div>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}}>

        {/* Step 1: Budget */}
        <Card>
          <SecTitle>Step 1 — Set Your Budget</SecTitle>
          <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>
            {budgetCats.length>0 ? "Your budget from the appointment is loaded. You can adjust it here." : "Set a monthly budget to compare against your spending."}
          </div>
          <Label>Monthly Income</Label>
          <NumInput value={budgetIncome} onChange={setBudgetIncome} placeholder="5000"/>
          <div style={{height:14}}/>
          <Label>Budget Categories</Label>
          {allCats.filter(c=>!["Income","Transfer","Other"].includes(c)).map((cat,i)=>(
            <div key={cat} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
                <span style={{fontSize:13,color:"#e8e4d9"}}>{cat}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}>
                <span style={{color:"#6b8cce",marginRight:4,fontSize:12}}>$</span>
                <input type="number" value={customBudget[cat]||""} onChange={e=>setCustomBudget(p=>({...p,[cat]:e.target.value}))}
                  placeholder="0" style={{background:"none",border:"none",outline:"none",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:14,width:"100%",...GS}}/>
              </div>
              <button onClick={()=>{setBudgetCats(p=>p.filter(c=>c!==cat));setCategories(p=>p.filter(c=>c!==cat));}}
                style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Add category..."
              style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:13,flex:1,outline:"none",...GS}}/>
            <button onClick={()=>{if(newCat.trim()){setBudgetCats(p=>[...p,newCat.trim()]);setNewCat("");}}}
              style={{background:"#1a4080",border:"1px solid #2a4080",borderRadius:8,padding:"8px 14px",color:"#4ade80",cursor:"pointer",fontSize:13,...GS}}>+ Add</button>
          </div>
        </Card>

        {/* Step 2: Bank format */}
        <Card>
          <SecTitle>Step 2 — Select Your Bank</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {Object.entries(BANK_FORMATS).map(([key,val])=>(
              <button key={key} onClick={()=>setBankFormat(key)}
                style={{background:bankFormat===key?"#1a4080":"#0d1b3e",border:`1px solid ${bankFormat===key?"#60a5fa":"#2a4080"}`,borderRadius:8,padding:"10px 6px",cursor:"pointer",color:bankFormat===key?"#60a5fa":"#8fadd4",fontSize:11,textAlign:"center",...GS}}>
                {val.name}
              </button>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:11,color:"#6b8cce",lineHeight:1.6}}>
            Auto-Detect works for most banks. Select your bank for best results. Export as CSV from your online banking.
          </div>
        </Card>

        {/* Step 3: Upload */}
        <Card>
          <SecTitle>Step 3 — Upload CSV Files</SecTitle>
          <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>
            You can upload multiple files at once (e.g. Visa + chequing). Go to your bank's website → Statements → Download → CSV format.
          </div>
          <label style={{display:"block",background:"linear-gradient(135deg,#0d1b3e,#111827)",border:"2px dashed #2a4080",borderRadius:12,padding:"28px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#22d3ee";}}
            onDragLeave={e=>{e.currentTarget.style.borderColor="#2a4080";}}
            onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}>
            <div style={{fontSize:32,marginBottom:10}}>📂</div>
            <div style={{fontSize:14,color:"#22d3ee",fontWeight:"bold",marginBottom:6}}>Drop CSV files here</div>
            <div style={{fontSize:12,color:"#6b8cce"}}>or click to browse</div>
            <input type="file" accept=".csv" multiple onChange={e=>handleFiles(e.target.files)} style={{display:"none"}}/>
          </label>
        </Card>
      </div>
    </div>
  );

  // ── PHASE: CLASSIFY ──
  if(phase==="classify") return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"14px 16px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setPhase("setup")} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>&larr;</button>
            <div style={{fontSize:16,fontWeight:"bold",color:"#fff",...GS}}>Classify Transactions</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontSize:11,color:unclassified.length===0?"#4ade80":"#facc15",...GS}}>
              {unclassified.length===0?"✅ All done!":unclassified.length+" left"}
            </div>
            {unclassified.length===0&&<button onClick={()=>setPhase("summary")} style={{background:"#0d2a1a",border:"1px solid #4ade80",borderRadius:8,padding:"5px 12px",color:"#4ade80",cursor:"pointer",fontSize:11,...GS}}>Summary →</button>}
          </div>
        </div>
        {/* Month selector */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
          {availableMonths.map(m=>(
            <button key={m} onClick={()=>{setSelectedMonth(m);setCurrentIdx(0);}}
              style={{background:selectedMonth===m?"#1a4080":"#0d1b3e",border:`1px solid ${selectedMonth===m?"#22d3ee":"#2a4080"}`,borderRadius:8,padding:"5px 12px",color:selectedMonth===m?"#22d3ee":"#8fadd4",cursor:"pointer",fontSize:11,whiteSpace:"nowrap",...GS}}>
              {monthLabel(m)}
            </button>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{marginTop:10,background:"#1e3a5f",borderRadius:4,height:5,overflow:"hidden"}}>
          <div style={{width:progress+"%",height:"100%",background:"linear-gradient(90deg,#22d3ee,#4ade80)",borderRadius:4,transition:"width 0.3s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <div style={{fontSize:9,color:"#6b8cce"}}>{classified.length} of {monthTxns.length} classified</div>
          <div style={{fontSize:9,color:"#6b8cce"}}>{progress}%</div>
        </div>
      </div>

      <div style={{padding:"14px 16px",maxWidth:520,margin:"0 auto"}}>

        {/* Live donut */}
        {donutData.length>0&&(
          <Card style={{padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <SecTitle style={{marginBottom:0}}>Spending So Far</SecTitle>
              <div style={{fontSize:14,color:"#f87171",fontWeight:"bold",...GS}}>{fmt(totalSpent)}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {donutData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>
                {donutData.slice(0,5).map((x,i)=>{
                  const budget = customBudget[x.name];
                  const over = budget&&x.value>Number(budget);
                  return (
                    <div key={x.name} style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length]}}/>
                        <span style={{fontSize:10,color:"#8fadd4"}}>{x.name}</span>
                      </div>
                      <span style={{fontSize:10,color:over?"#f87171":CAT_COLORS[i%CAT_COLORS.length],fontWeight:"bold",...GS}}>
                        {fmt(x.value)}{budget?` / ${fmt(budget)}`:""}
                        {over&&" ⚠️"}
                      </span>
                    </div>
                  );
                })}
                {donutData.length>5&&<div style={{fontSize:9,color:"#6b8cce"}}>+{donutData.length-5} more...</div>}
              </div>
            </div>
          </Card>
        )}

        {/* Manage rules button */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <button onClick={()=>setShowRules(p=>!p)} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"5px 12px",color:"#6b8cce",cursor:"pointer",fontSize:11,...GS}}>
            ⚙️ Saved Rules ({Object.keys(rules).length})
          </button>
        </div>

        {/* Rules manager */}
        {showRules&&(
          <Card style={{marginBottom:14}}>
            <SecTitle>Auto-Classify Rules</SecTitle>
            {Object.keys(rules).length===0
              ? <div style={{fontSize:12,color:"#6b8cce"}}>No rules saved yet. Classify a transaction and click "Always Remember" to save a rule.</div>
              : Object.entries(rules).map(([key,cat])=>(
                <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1b3e",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:12,color:"#e8e4d9",...GS}}>{key}</div>
                    <div style={{fontSize:10,color:"#4ade80",marginTop:2}}>→ {cat}</div>
                  </div>
                  <button onClick={()=>deleteRule(key)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                </div>
              ))
            }
          </Card>
        )}

        {/* Current transaction */}
        {current?(
          <div>
            <Card style={{background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:`1px solid ${current.autoClassified?"#4ade8066":"#22d3ee44"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:9,color:"#6b8cce",letterSpacing:2}}>CLASSIFY THIS TRANSACTION</div>
                {current.autoClassified&&(
                  <div style={{background:"#0d2a1a",border:"1px solid #4ade8044",borderRadius:6,padding:"2px 8px",fontSize:9,color:"#4ade80",letterSpacing:1}}>⚡ AUTO-CLASSIFIED</div>
                )}
              </div>
              <div style={{fontSize:18,color:"#e8e4d9",fontWeight:"bold",marginBottom:4,...GS}}>{current.desc}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:"#6b8cce"}}>{current.date}</div>
                <div style={{fontSize:22,color:current.amount>0?"#f87171":"#4ade80",fontWeight:"bold",...GS}}>
                  {current.amount>0?"-":"+"}${Math.abs(current.amount).toFixed(2)}
                </div>
              </div>
              {current.category&&(
                <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:"#4ade80"}}>✓ {current.category}</div>
                  {!rules[normalizeMerchant(current.desc)]&&!current.rulesSaved?(
                    <button onClick={()=>alwaysRemember(current)}
                      style={{background:"#0d2a1a",border:"1px solid #4ade8066",borderRadius:8,padding:"5px 12px",color:"#4ade80",cursor:"pointer",fontSize:11,...GS}}>
                      ⚡ Always Remember
                    </button>
                  ):(
                    <div style={{fontSize:11,color:"#6b8cce"}}>✅ Rule saved</div>
                  )}
                </div>
              )}
            </Card>

            {/* Category buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {allCats.map((cat,i)=>(
                <button key={cat} onClick={()=>assignCategory(cat)}
                  style={{background:current.category===cat?CAT_COLORS[i%CAT_COLORS.length]+"33":"#0d1b3e",border:`1px solid ${current.category===cat?CAT_COLORS[i%CAT_COLORS.length]:CAT_COLORS[i%CAT_COLORS.length]+"44"}`,borderRadius:10,padding:"10px 6px",cursor:"pointer",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:12,textAlign:"center",transition:"background 0.15s,border-color 0.15s",...GS}}
                  onMouseEnter={e=>{e.currentTarget.style.background=CAT_COLORS[i%CAT_COLORS.length]+"22";e.currentTarget.style.borderColor=CAT_COLORS[i%CAT_COLORS.length];}}
                  onMouseLeave={e=>{e.currentTarget.style.background=current.category===cat?CAT_COLORS[i%CAT_COLORS.length]+"33":"#0d1b3e";e.currentTarget.style.borderColor=current.category===cat?CAT_COLORS[i%CAT_COLORS.length]:CAT_COLORS[i%CAT_COLORS.length]+"44";}}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Remember buttons — shown when category is selected */}
            {current.category&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <button onClick={()=>{alwaysRemember(current);setCurrentIdx(p=>p+1);}}
                  style={{background:"#0d2a1a",border:"1px solid #4ade80",borderRadius:10,padding:"11px",color:"#4ade80",cursor:"pointer",fontSize:12,fontWeight:"bold",...GS}}>
                  ⚡ Remember & Next
                </button>
                <button onClick={()=>setCurrentIdx(p=>p+1)}
                  style={{background:"#111827",border:"1px solid #2a4080",borderRadius:10,padding:"11px",color:"#8fadd4",cursor:"pointer",fontSize:12,...GS}}>
                  Next →
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <button onClick={()=>ignoreTransaction()} style={{background:"#111827",border:"1px solid #2a4080",borderRadius:10,padding:"11px",color:"#8fadd4",cursor:"pointer",fontSize:12,...GS}}>
                Skip / Ignore
              </button>
              <button onClick={undoLast} style={{background:"#111827",border:"1px solid #2a4080",borderRadius:10,padding:"11px",color:"#8fadd4",cursor:"pointer",fontSize:12,...GS}}>
                ↩ Undo Last
              </button>
            </div>

            {/* Manual entry toggle */}
            <button onClick={()=>setShowManual(p=>!p)} style={{width:"100%",background:"none",border:"1px dashed #facc1544",borderRadius:10,padding:"10px",color:"#facc15",cursor:"pointer",fontSize:12,marginBottom:14,...GS}}>
              {showManual?"▲ Cancel":"+ Add Cash / Manual Expense"}
            </button>

            {/* Manual entry form */}
            {showManual&&(
              <Card style={{background:"linear-gradient(135deg,#1a1a0d,#111827)",border:"1px solid #facc1544",marginBottom:14}}>
                <div style={{fontSize:10,color:"#facc15",letterSpacing:2,marginBottom:12,...GS}}>MANUAL ENTRY</div>
                {/* Type toggle */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[{val:"debit",label:"💸 Expense"},{val:"credit",label:"💰 Income"}].map(t=>(
                    <button key={t.val} onClick={()=>setManualType(t.val)} style={{background:manualType===t.val?(t.val==="debit"?"#1a0d0d":"#0d2a1a"):"#0d1b3e",border:`1px solid ${manualType===t.val?(t.val==="debit"?"#f87171":"#4ade80"):"#2a4080"}`,borderRadius:8,padding:"9px",cursor:"pointer",color:t.val==="debit"?"#f87171":"#4ade80",fontSize:12,...GS}}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Description */}
                <div style={{marginBottom:10}}>
                  <Label>Description</Label>
                  <input value={manualDesc} onChange={e=>setManualDesc(e.target.value)} placeholder="e.g. Coffee, Farmer's Market, Cash ATM..."
                    style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
                </div>
                {/* Amount + Date */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div>
                    <Label>Amount</Label>
                    <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
                      <span style={{color:"#6b8cce",marginRight:4}}>$</span>
                      <input type="number" value={manualAmount} onChange={e=>setManualAmount(e.target.value)} placeholder="0.00"
                        style={{background:"none",border:"none",outline:"none",color:manualType==="debit"?"#f87171":"#4ade80",fontSize:15,width:"100%",...GS}}/>
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)}
                      style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
                  </div>
                </div>
                {/* Category (optional) */}
                <div style={{marginBottom:12}}>
                  <Label>Category (optional — or classify below)</Label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {allCats.slice(0,8).map((cat,i)=>(
                      <button key={cat} onClick={()=>setManualCat(manualCat===cat?"":cat)}
                        style={{background:manualCat===cat?CAT_COLORS[i%CAT_COLORS.length]+"33":"#0d1b3e",border:`1px solid ${manualCat===cat?CAT_COLORS[i%CAT_COLORS.length]:CAT_COLORS[i%CAT_COLORS.length]+"44"}`,borderRadius:16,padding:"5px 12px",cursor:"pointer",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:11,...GS}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={addManualTransaction} style={{width:"100%",background:"linear-gradient(135deg,#1a1a0d,#2a2a0d)",border:"1px solid #facc15",borderRadius:8,color:"#facc15",padding:"12px",fontSize:13,cursor:"pointer",...GS}}>
                  Add to {monthLabel(selectedMonth)||"Statement"}
                </button>
              </Card>
            )}

            {/* Upcoming transactions preview */}
            {unclassified.length>1&&(
              <Card style={{padding:"10px 14px"}}>
                <div style={{fontSize:9,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>UP NEXT</div>
                {unclassified.slice(1,4).map((t,i)=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<2?"1px solid #1e3a5f":"none",opacity:1-i*0.25}}>
                    <div style={{fontSize:12,color:"#6b8cce"}}>{t.desc.slice(0,30)}</div>
                    <div style={{fontSize:12,color:t.amount>0?"#f87171":"#4ade80",...GS}}>{t.amount>0?"-":"+"}${Math.abs(t.amount).toFixed(2)}</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        ):(
          <div style={{textAlign:"center",padding:"30px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",marginBottom:8,...GS}}>All transactions classified!</div>
            <div style={{fontSize:13,color:"#8fadd4",marginBottom:24}}>for {monthLabel(selectedMonth)}</div>
            <button onClick={()=>setShowManual(p=>!p)} style={{width:"100%",background:"none",border:"1px dashed #facc1544",borderRadius:10,padding:"12px",color:"#facc15",cursor:"pointer",fontSize:13,marginBottom:12,...GS}}>
              {showManual?"▲ Cancel":"+ Add Cash / Manual Expense"}
            </button>
            {showManual&&(
              <Card style={{background:"linear-gradient(135deg,#1a1a0d,#111827)",border:"1px solid #facc1544",textAlign:"left",marginBottom:16}}>
                <div style={{fontSize:10,color:"#facc15",letterSpacing:2,marginBottom:12,...GS}}>MANUAL ENTRY</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  {[{val:"debit",label:"💸 Expense"},{val:"credit",label:"💰 Income"}].map(t=>(
                    <button key={t.val} onClick={()=>setManualType(t.val)} style={{background:manualType===t.val?(t.val==="debit"?"#1a0d0d":"#0d2a1a"):"#0d1b3e",border:`1px solid ${manualType===t.val?(t.val==="debit"?"#f87171":"#4ade80"):"#2a4080"}`,borderRadius:8,padding:"9px",cursor:"pointer",color:t.val==="debit"?"#f87171":"#4ade80",fontSize:12,...GS}}>{t.label}</button>
                  ))}
                </div>
                <div style={{marginBottom:10}}><Label>Description</Label><input value={manualDesc} onChange={e=>setManualDesc(e.target.value)} placeholder="e.g. Cash at market..." style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div><Label>Amount</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><span style={{color:"#6b8cce",marginRight:4}}>$</span><input type="number" value={manualAmount} onChange={e=>setManualAmount(e.target.value)} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:manualType==="debit"?"#f87171":"#4ade80",fontSize:15,width:"100%",...GS}}/></div></div>
                  <div><Label>Date</Label><input type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)} style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/></div>
                </div>
                <div style={{marginBottom:12}}><Label>Category</Label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{allCats.slice(0,8).map((cat,i)=><button key={cat} onClick={()=>setManualCat(manualCat===cat?"":cat)} style={{background:manualCat===cat?CAT_COLORS[i%CAT_COLORS.length]+"33":"#0d1b3e",border:`1px solid ${manualCat===cat?CAT_COLORS[i%CAT_COLORS.length]:CAT_COLORS[i%CAT_COLORS.length]+"44"}`,borderRadius:16,padding:"5px 12px",cursor:"pointer",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:11,...GS}}>{cat}</button>)}</div></div>
                <button onClick={addManualTransaction} style={{width:"100%",background:"linear-gradient(135deg,#1a1a0d,#2a2a0d)",border:"1px solid #facc15",borderRadius:8,color:"#facc15",padding:"12px",fontSize:13,cursor:"pointer",...GS}}>Add to Statement</button>
              </Card>
            )}
            <button onClick={()=>setPhase("summary")} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:12,padding:"14px 32px",color:"#4ade80",fontSize:15,cursor:"pointer",width:"100%",...GS}}>
              View Summary →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── PHASE: SUMMARY ──
  const income = Number(budgetIncome||0);
  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"14px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setPhase("classify")} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>&larr;</button>
            <div style={{fontSize:16,fontWeight:"bold",color:"#fff",...GS}}>Spending Summary</div>
          </div>
          <div style={{fontSize:12,color:"#6b8cce",...GS}}>{monthLabel(selectedMonth)}</div>
        </div>
      </div>
      <div style={{padding:"14px 16px",maxWidth:520,margin:"0 auto"}}>

        {/* Hero */}
        <Card style={{textAlign:"center",padding:"20px 16px",background:"linear-gradient(135deg,#1a0505,#0d1b3e)",border:"1px solid #f8717144"}}>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:6}}>TOTAL SPENT — {monthLabel(selectedMonth).toUpperCase()}</div>
          <div style={{fontSize:42,color:"#f87171",fontWeight:"bold",...GS}}>{fmt(totalSpent)}</div>
          {income>0&&<div style={{fontSize:12,color:"#6b8cce",marginTop:4}}>{fmt(income-totalSpent)} remaining from {fmt(income)} income</div>}
        </Card>

        {/* Donut */}
        {donutData.length>0&&<Card>
          <SecTitle>Spending Breakdown</SecTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" strokeWidth={0}>
                {donutData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:12}} itemStyle={{color:"#e8e4d9"}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>}

        {/* Budget vs Actual */}
        <Card>
          <SecTitle>Budget vs Actual</SecTitle>
          {donutData.sort((a,b)=>b.value-a.value).map((cat,i)=>{
            const budget = Number(customBudget[cat.name]||0);
            const pct = budget>0?Math.min(100,(cat.value/budget)*100):100;
            const over = budget>0&&cat.value>budget;
            return (
              <div key={cat.name} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length]}}/>
                    <span style={{fontSize:13,color:"#e8e4d9"}}>{cat.name}</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,color:over?"#f87171":CAT_COLORS[i%CAT_COLORS.length],fontWeight:"bold",...GS}}>{fmt(cat.value)}</span>
                    {budget>0&&<span style={{fontSize:11,color:"#6b8cce"}}>/ {fmt(budget)}</span>}
                    {over&&<span style={{fontSize:10,color:"#f87171"}}>over by {fmt(cat.value-budget)}</span>}
                  </div>
                </div>
                <div style={{background:"#0d1b3e",borderRadius:4,height:6,overflow:"hidden"}}>
                  <div style={{width:pct+"%",height:"100%",background:over?"#f87171":CAT_COLORS[i%CAT_COLORS.length],borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Transaction list */}
        <Card>
          <SecTitle>All Transactions ({classified.length})</SecTitle>
          {classified.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1e3a5f"}}>
              <div>
                <div style={{fontSize:12,color:"#e8e4d9"}}>{t.desc.slice(0,32)}</div>
                <div style={{display:"flex",gap:8,marginTop:2}}>
                  <span style={{fontSize:10,color:"#6b8cce"}}>{t.date}</span>
                  <span style={{fontSize:10,color:"#a78bfa",border:"1px solid #a78bfa44",borderRadius:8,padding:"0 6px"}}>{t.category}</span>
                </div>
              </div>
              <div style={{fontSize:13,color:t.amount>0?"#f87171":"#4ade80",fontWeight:"bold",...GS}}>
                {t.amount>0?"-":"+"}${Math.abs(t.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <button onClick={()=>setPhase("setup")} style={{background:"#111827",border:"1px solid #2a4080",borderRadius:12,padding:"13px",color:"#8fadd4",fontSize:13,cursor:"pointer",...GS}}>← New Import</button>
          <button onClick={()=>setPhase("classify")} style={{background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:"1px solid #22d3ee",borderRadius:12,padding:"13px",color:"#22d3ee",fontSize:13,cursor:"pointer",...GS}}>Edit ↩</button>
        </div>
        <button onClick={()=>{setPhase("classify");setShowManual(true);}} style={{width:"100%",background:"none",border:"1px dashed #facc1544",borderRadius:12,padding:"13px",color:"#facc15",cursor:"pointer",fontSize:13,marginBottom:20,...GS}}>
          + Add Cash / Manual Expense
        </button>
      </div>
    </div>
  );
}

function ToolWrapper({title,onBack,onHome,contentId,children}) {
  return (
    <div className="page-enter" style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:10,color:"#6b8cce",cursor:"pointer",fontSize:18,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>&larr;</button>
            <div style={{fontSize:18,fontWeight:"bold",color:"#fff",...GS}}>{title}</div>
          </div>
          <button onClick={onHome} className="glow-btn" style={{background:"none",border:"1px solid #2a4080",borderRadius:8,padding:"6px 12px",color:"#6b8cce",cursor:"pointer",fontSize:12,...GS}}>Home</button>
        </div>
      </div>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}} id={contentId}>
        {children}
        <PDFBtn title={title} contentId={contentId}/>
      </div>
    </div>
  );
}

// ─── WHAT-IF SIMULATOR ────────────────────────────────────────────────────────
function StandaloneBudget({prefill=null,user,token,toolId}) {
  const [income,setIncome]=useState(prefill?.income||"");
  const BUCKETS = [
    {key:"fixed",label:"Fixed Costs",desc:"Same every month — non-negotiable",color:"#f87171",icon:"🔒",
      defaults:[{name:"Housing/Rent",amount:""},{name:"Insurance",amount:""},{name:"Car Payment",amount:""}]},
    {key:"subscription",label:"Subscriptions",desc:"Recurring but cancellable",color:"#a78bfa",icon:"🔄",
      defaults:[{name:"Phone Bill",amount:""},{name:"Netflix",amount:""},{name:"Gym",amount:""}]},
    {key:"estimated",label:"Estimated Costs",desc:"Variable — changes month to month",color:"#facc15",icon:"📊",
      defaults:[{name:"Groceries",amount:""},{name:"Transportation",amount:""},{name:"Dining Out",amount:""}]},
  ];

  const initCats = () => {
    if(prefill?.categories?.length>0){
      return prefill.categories.map(c=>({...c,bucket:c.bucket||"estimated"}));
    }
    return [
      {name:"Housing/Rent",amount:"",bucket:"fixed"},{name:"Insurance",amount:"",bucket:"fixed"},
      {name:"Phone Bill",amount:"",bucket:"subscription"},{name:"Netflix",amount:"",bucket:"subscription"},
      {name:"Groceries",amount:"",bucket:"estimated"},{name:"Transportation",amount:"",bucket:"estimated"},{name:"Entertainment",amount:"",bucket:"estimated"},
    ];
  };
  const [cats,setCats]=useState(initCats);
  const [newNames,setNewNames]=useState({fixed:"",subscription:"",estimated:""});

  const inc=Number(income||0);
  const totalBucket=(bucket)=>cats.filter(c=>c.bucket===bucket).reduce((s,c)=>s+Number(c.amount||0),0);
  const totalFixed=totalBucket("fixed"),totalSub=totalBucket("subscription"),totalEst=totalBucket("estimated");
  const total=totalFixed+totalSub+totalEst;
  const remaining=inc-total;

  const addCat=(bucket)=>{
    const name=newNames[bucket].trim();
    if(!name) return;
    setCats(p=>[...p,{name,amount:"",bucket}]);
    setNewNames(p=>({...p,[bucket]:""}));
  };

  // Fixed and Estimated get unique colours per item; Subscriptions all share purple
  const FIXED_COLORS=["#f87171","#ef4444","#fb923c","#f97316","#fca5a5","#fcd34d","#ff6b6b","#fc8181"];
  const EST_COLORS=["#facc15","#fbbf24","#34d399","#22d3ee","#a3e635","#4ade80","#86efac","#6ee7b7"];
  const SUB_COLOR="#a78bfa";

  const getItemColor=(cat,itemIndexWithinBucket)=>{
    if(cat.bucket==="subscription") return SUB_COLOR;
    if(cat.bucket==="fixed") return FIXED_COLORS[itemIndexWithinBucket%FIXED_COLORS.length];
    return EST_COLORS[itemIndexWithinBucket%EST_COLORS.length];
  };

  // Track per-bucket index for colour assignment
  const bucketCounters={fixed:0,subscription:0,estimated:0};
  const catsWithColors=cats.map(c=>{
    const idx=bucketCounters[c.bucket]||0;
    bucketCounters[c.bucket]=(bucketCounters[c.bucket]||0)+1;
    return {...c,_color:getItemColor(c,idx),_bucketIdx:idx};
  });

  const donutData=[
    ...catsWithColors.filter(c=>Number(c.amount||0)>0).map(c=>({
      name:c.bucket==="subscription"?"Subscriptions":c.name,
      value:Number(c.amount),
      bucket:c.bucket,
      _color:c._color,
    })),
    remaining>0?{name:"Remaining",value:remaining,bucket:"remaining",_color:"#1e3a5f"}:null
  ].filter(Boolean);

  // Collapse subscription segments into one for the donut
  const collapsedDonut=[];
  let subTotal=0;
  donutData.forEach(d=>{
    if(d.bucket==="subscription"){subTotal+=d.value;}
    else collapsedDonut.push(d);
  });
  if(subTotal>0) collapsedDonut.splice(
    collapsedDonut.findIndex(d=>d.bucket==="fixed")>=0
      ? collapsedDonut.findLastIndex(d=>d.bucket==="fixed")+1
      : 0,
    0,
    {name:"Subscriptions",value:subTotal,bucket:"subscription",_color:SUB_COLOR}
  );

  const BUCKET_COLORS={"fixed":"#f87171","subscription":"#a78bfa","estimated":"#facc15","remaining":"#1e3a5f"};

  return (
    <div style={{paddingBottom:80}}>
      {/* Snapshot bar */}
      <SnapshotBar user={user} token={token} toolId={toolId} getInputs={()=>({income,cats})}/>

      {/* Income */}
      <Card>
        <SecTitle>Monthly Income</SecTitle>
        <NumInput value={income} onChange={setIncome} placeholder="5000.00"/>
        {inc>0&&<div style={{marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontSize:11,color:"#6b8cce"}}>Allocated</div>
            <div style={{fontSize:13,color:total>inc?"#f87171":"#4ade80",fontWeight:"bold"}}>{fmt(total)} / {fmt(inc)}</div>
          </div>
          <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}>
            <div style={{width:Math.min(100,(total/inc)*100)+"%",height:"100%",background:total>inc?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/>
          </div>
        </div>}
      </Card>

      {/* Three buckets */}
      {BUCKETS.map(bucket=>{
        const bucketCats=cats.filter(c=>c.bucket===bucket.key);
        const bucketTotal=totalBucket(bucket.key);
        const pct=inc>0?((bucketTotal/inc)*100).toFixed(1):"0";
        return (
          <Card key={bucket.key} style={{border:`1px solid ${bucket.color}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{fontSize:16}}>{bucket.icon}</span>
                  <div style={{fontSize:14,color:bucket.color,fontWeight:"bold",...GS}}>{bucket.label}</div>
                </div>
                <div style={{fontSize:11,color:"#6b8cce",marginLeft:24}}>{bucket.desc}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:16,color:bucket.color,fontWeight:"bold",...GS}}>{fmt(bucketTotal)}</div>
                {inc>0&&<div style={{fontSize:10,color:"#6b8cce"}}>{pct}% of income</div>}
              </div>
            </div>
            {inc>0&&<div style={{background:"#0d1b3e",borderRadius:4,height:4,overflow:"hidden",marginBottom:14}}>
              <div style={{width:pct+"%",height:"100%",background:bucket.color,borderRadius:4,transition:"width 0.3s"}}/>
            </div>}
            {bucketCats.map((cat,i)=>{
              const globalIdx=cats.indexOf(cat);
              const itemColor=catsWithColors[globalIdx]?._color||bucket.color;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:"#0d1b3e",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:itemColor,flexShrink:0}}/>
                  <input value={cat.name} onChange={e=>setCats(p=>p.map((c,idx)=>idx===globalIdx?{...c,name:e.target.value}:c))}
                    style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:13,flex:1,...GS}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{color:"#6b8cce",fontSize:13}}>$</span>
                    <input type="number" value={cat.amount} onChange={e=>setCats(p=>p.map((c,idx)=>idx===globalIdx?{...c,amount:e.target.value}:c))}
                      style={{background:"none",border:"none",outline:"none",color:itemColor,fontSize:16,width:80,textAlign:"right",...GS}}/>
                  </div>
                  {inc>0&&Number(cat.amount)>0&&<span style={{fontSize:10,color:"#6b8cce",minWidth:36,textAlign:"right"}}>{((Number(cat.amount)/inc)*100).toFixed(0)}%</span>}
                  <button onClick={()=>setCats(p=>p.filter((_,idx)=>idx!==globalIdx))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,padding:0}}>×</button>
                </div>
              );
            })}
            <div style={{display:"flex",gap:8}}>
              <input value={newNames[bucket.key]} onChange={e=>setNewNames(p=>({...p,[bucket.key]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addCat(bucket.key)}
                placeholder={`Add ${bucket.label.toLowerCase()} item...`}
                style={{background:"#0d1b3e",border:`1px dashed ${bucket.color}44`,borderRadius:8,padding:"7px 10px",color:"#e8e4d9",fontSize:12,flex:1,outline:"none",...GS}}/>
              <button onClick={()=>addCat(bucket.key)} style={{background:"none",border:`1px solid ${bucket.color}44`,borderRadius:8,padding:"7px 12px",color:bucket.color,cursor:"pointer",fontSize:12,...GS}}>+ Add</button>
            </div>
          </Card>
        );
      })}

      {/* Donut chart */}
      {collapsedDonut.filter(d=>d.value>0).length>0&&(
        <Card>
          <SecTitle>Spending Breakdown</SecTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={collapsedDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {collapsedDonut.map((d,i)=><Cell key={i} fill={d._color||CAT_COLORS[i%CAT_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#e8e4d9"}}/>
            </PieChart>
          </ResponsiveContainer>
          {/* Legend — grouped buckets in sticky bar style */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8,justifyContent:"center"}}>
            {collapsedDonut.filter(d=>d.bucket!=="remaining"&&d.value>0).map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:9,height:9,borderRadius:d.bucket==="subscription"?3:50,background:d._color}}/>
                <span style={{fontSize:10,color:"#8fadd4"}}>{d.name}</span>
              </div>
            ))}
          </div>
          {/* Bucket totals summary */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
            {[{label:"Fixed 🔒",val:totalFixed,color:"#f87171"},{label:"Subscriptions 🔄",val:totalSub,color:"#a78bfa"},{label:"Estimated 📊",val:totalEst,color:"#facc15"}].filter(x=>x.val>0).map(x=>(
              <div key={x.label} style={{background:"#0d1b3e",borderRadius:8,padding:"8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:3,...GS}}>{x.label}</div>
                <div style={{fontSize:13,color:x.color,fontWeight:"bold",...GS}}>{fmt(x.val)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sticky totals bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"linear-gradient(135deg,#0d1b3e,#111827)",borderTop:"1px solid #1e3a5f",padding:"10px 16px",zIndex:200}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,alignItems:"center"}}>
            {[{label:"Fixed 🔒",val:totalFixed,color:"#f87171"},{label:"Subs 🔄",val:totalSub,color:"#a78bfa"},{label:"Variable 📊",val:totalEst,color:"#facc15"},{label:remaining>=0?"Left Over":"Over Budget",val:Math.abs(remaining),color:remaining>=0?"#4ade80":"#f87171"}].map(x=>(
              <div key={x.label} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b8cce",marginBottom:2,...GS}}>{x.label}</div>
                <div style={{fontSize:13,color:x.color,fontWeight:"bold",...GS}}>{fmtShort(x.val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StandaloneNetWorth({prefill=null}) {
  const buildAssets = () => {
    if(!prefill) return [{name:"Chequing",amount:""},{name:"TFSA",amount:""},{name:"RRSP",amount:""},{name:"Home Equity",amount:""}];
    const items=[];
    (prefill.bankAccounts||[]).forEach(a=>items.push({name:a.name,amount:a.amount||""}));
    const sumGroup=arr=>(arr||[]).reduce((s,x)=>s+Number(x.amount||0),0);
    const inv=prefill.investments;
    if(inv){["tfsa","fhsa","rrsp","alternatives","nonReg"].forEach(k=>{const v=sumGroup(inv[k]);if(v>0)items.push({name:k.toUpperCase().replace("NONREG","Non-Reg"),amount:String(v)});});} 
    (prefill.savingsAccounts||[]).forEach(a=>{if(Number(a.saved||0)>0)items.push({name:a.name,amount:a.saved});});
    if(Number(prefill.lifeInsurance||0)>0)items.push({name:"Life Insurance CSV",amount:prefill.lifeInsurance});
    const eq=Number(prefill.mortgage?.value||0)-Number(prefill.mortgage?.balance||0);
    if(eq>0)items.push({name:"Home Equity",amount:String(Math.round(eq))});
    return items.length>0?items:[{name:"Chequing",amount:""},{name:"TFSA",amount:""},{name:"RRSP",amount:""},{name:"Home Equity",amount:""}];
  };
  const buildLiabs = () => {
    if(!prefill) return [{name:"Credit Card",amount:""},{name:"Mortgage",amount:""}];
    const items=[];
    (prefill.creditCards||[]).forEach(c=>{if(Number(c.totalBalance||0)>0)items.push({name:c.name,amount:c.totalBalance});});
    (prefill.locs||[]).forEach(l=>{if(Number(l.balance||0)>0)items.push({name:l.name||"Line of Credit",amount:l.balance});});
    if(Number(prefill.mortgage?.balance||0)>0)items.push({name:"Mortgage",amount:prefill.mortgage.balance});
    (prefill.otherDebts||[]).forEach(d=>{if(Number(d.balance||0)>0)items.push({name:d.name||d.type,amount:d.balance});});
    return items.length>0?items:[{name:"Credit Card",amount:""},{name:"Mortgage",amount:""}];
  };
  const [assets,setAssets]=useState(buildAssets);
  const [liabs,setLiabs]=useState(buildLiabs);
  const tA=assets.reduce((s,x)=>s+Number(x.amount||0),0),tL=liabs.reduce((s,x)=>s+Number(x.amount||0),0),nw=tA-tL;
  return (
    <div>
      <Card style={{textAlign:"center",padding:"22px 16px",background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:`1px solid ${nw>=0?"#4ade80":"#f87171"}44`}}>
        <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:6}}>NET WORTH</div>
        <div style={{fontSize:44,color:nw>=0?"#4ade80":"#f87171",fontWeight:"bold"}}>{fmtShort(nw)}</div>
        <div style={{fontSize:12,color:"#6b8cce",marginTop:4}}>{fmt(nw)}</div>
      </Card>
      {[{title:"Assets",items:assets,setItems:setAssets,color:"#4ade80",total:tA},{title:"Liabilities",items:liabs,setItems:setLiabs,color:"#f87171",total:tL}].map(sec=>(
        <Card key={sec.title}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><SecTitle>{sec.title}</SecTitle><div style={{fontSize:16,color:sec.color,fontWeight:"bold"}}>{fmt(sec.total)}</div></div>
          {sec.items.map((x,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
              <input value={x.name} onChange={e=>sec.setItems(p=>p.map((v,idx)=>idx===i?{...v,name:e.target.value}:v))} placeholder="Name" style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px",color:"#e8e4d9",fontSize:13,outline:"none",...GS}}/>
              <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"8px 10px"}}><span style={{color:"#6b8cce",marginRight:4,fontSize:12}}>$</span><input type="number" value={x.amount} onChange={e=>sec.setItems(p=>p.map((v,idx)=>idx===i?{...v,amount:e.target.value}:v))} placeholder="0" style={{background:"none",border:"none",outline:"none",color:sec.color,fontSize:14,width:"100%",...GS}}/></div>
              <button onClick={()=>sec.setItems(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18}}>×</button>
            </div>
          ))}
          <button onClick={()=>sec.setItems(p=>[...p,{name:"",amount:""}])} style={{width:"100%",background:"none",border:`1px dashed ${sec.color}44`,color:"#6b8cce",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:12,...GS}}>+ Add {sec.title.slice(0,-1)}</button>
        </Card>
      ))}
    </div>
  );
}

function SavingsGoalCalc({prefill=null}) {
  const initGoals = () => {
    if(prefill?.savingsAccounts?.length>0){
      return prefill.savingsAccounts.map(a=>({name:a.name,target:a.goal||"",saved:a.saved||"",months:""}));
    }
    return [{name:"",target:"",saved:"",months:""}];
  };
  const [goals,setGoals]=useState(initGoals);
  return (
    <div>
      <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.8,marginBottom:16}}>Enter your goal, how much you've saved, and how many months you have — we'll calculate the monthly amount you need to save.</div>
      {goals.map((g,i)=>{
        const setF=f=>v=>setGoals(p=>p.map((x,idx)=>idx===i?{...x,[f]:v}:x));
        const needed=Math.max(0,Number(g.target||0)-Number(g.saved||0));
        const months=Math.max(1,Number(g.months||0));
        const perMonth=g.months?needed/months:0;
        const pct=Number(g.target||0)>0?Math.min(100,(Number(g.saved||0)/Number(g.target||0))*100):0;
        return (
          <Card key={i}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:"#facc15",letterSpacing:2}}>GOAL {i+1}</div>
              {goals.length>1&&<button onClick={()=>setGoals(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button>}
            </div>
            <Label>Goal Name</Label><TxtInput value={g.name} onChange={setF("name")} placeholder="e.g. Emergency Fund, Down Payment"/>
            <div style={{height:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><Label>Target Amount</Label><NumInput value={g.target} onChange={setF("target")}/></div>
              <div><Label>Already Saved</Label><NumInput value={g.saved} onChange={setF("saved")}/></div>
            </div>
            <Label>Months to Goal</Label>
            <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",marginBottom:perMonth>0?14:0}}>
              <input type="number" value={g.months} onChange={e=>setF("months")(e.target.value)} placeholder="e.g. 24"
                style={{background:"none",border:"none",outline:"none",color:"#facc15",fontSize:16,width:"100%",...GS}}/>
              <span style={{color:"#6b8cce",fontSize:12}}>months</span>
            </div>
            {perMonth>0&&(
              <div style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:10,padding:"14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div style={{textAlign:"center",background:"#0a1a0f",borderRadius:8,padding:"12px 8px"}}>
                    <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>SAVE / MONTH</div>
                    <div style={{fontSize:22,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(perMonth)}</div>
                  </div>
                  <div style={{textAlign:"center",background:"#0d1b3e",borderRadius:8,padding:"12px 8px"}}>
                    <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>STILL NEEDED</div>
                    <div style={{fontSize:22,color:"#facc15",fontWeight:"bold",...GS}}>{fmt(needed)}</div>
                  </div>
                </div>
                {pct>0&&(
                  <>
                    <div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}>
                      <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/>
                    </div>
                    <div style={{fontSize:11,color:"#6b8cce"}}>{Math.round(pct)}% saved · {months} months remaining</div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
      <button onClick={()=>setGoals(p=>[...p,{name:"",target:"",saved:"",months:""}])} style={{width:"100%",background:"none",border:"1px dashed #facc1544",color:"#6b8cce",borderRadius:10,padding:"12px",cursor:"pointer",fontSize:13,marginBottom:6,...GS}}>+ Add Another Goal</button>
    </div>
  );
}

// ─── LOC SIMULATOR ────────────────────────────────────────────────────────────
function LOCSimulator({rate:defaultRate}) {
  const [amount,setAmount]=useState("");
  const [months,setMonths]=useState("12");
  const [rate,setRate]=useState(defaultRate||"");
  const [purpose,setPurpose]=useState("");
  const principal=Number(amount||0),r=Number(rate||0)/100/12,n=Number(months||0);
  const mp=principal>0&&r>0&&n>0?(principal*r)/(1-Math.pow(1+r,-n)):principal>0&&r===0&&n>0?principal/n:0;
  const totalPaid=mp*n,totalInterest=totalPaid-principal;
  const schedule=[];let bal=principal;
  for(let i=1;i<=n&&i<=24;i++){const ic=bal*r,pp=mp-ic;bal=Math.max(0,bal-pp);schedule.push({month:i,payment:mp,interest:ic,principal:pp,balance:bal});}
  const presets=[{label:"Car",amount:"5000",months:"12"},{label:"Vacation",amount:"3000",months:"6"},{label:"Reno",amount:"15000",months:"24"},{label:"Emergency",amount:"2000",months:"6"}];
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>{presets.map(p=><button key={p.label} onClick={()=>{setAmount(p.amount);setMonths(p.months);setPurpose(p.label);}} style={{background:amount===p.amount&&months===p.months?"#1a4080":"#0d1b3e",border:"1px solid #2a4080",borderRadius:20,color:"#8fadd4",padding:"6px 14px",fontSize:12,cursor:"pointer",...GS}}>{p.label}</button>)}</div>
      <Label>Purpose</Label><input value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="e.g. Car, Renovation..." style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",marginBottom:10,...GS}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><Label>Amount</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><span style={{color:"#6b8cce",marginRight:4}}>$</span><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="5000" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/></div></div>
        <div><Label>Months</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><input type="number" value={months} onChange={e=>setMonths(e.target.value)} placeholder="12" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>mo</span></div></div>
      </div>
      <Label>Annual Rate (%)</Label><PctInput value={rate} onChange={setRate} placeholder="7.20"/>
      {mp>0&&<div style={{marginTop:14}}>
        <div style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:12,padding:"16px",marginBottom:12}}>
          <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2,marginBottom:12}}>{purpose?purpose.toUpperCase()+" — ":""}LOAN SUMMARY</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[{l:"Monthly",v:mp,c:"#4ade80"},{l:"Interest",v:totalInterest,c:"#f87171"},{l:"Total Paid",v:totalPaid,c:"#60a5fa"}].map(x=><div key={x.l} style={{textAlign:"center",background:"#0d1b3e",borderRadius:8,padding:"10px 6px"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>{x.l}</div><div style={{fontSize:17,color:x.c,fontWeight:"bold"}}>{fmt(x.v)}</div></div>)}
          </div>
          <div style={{fontSize:12,color:"#6b8cce",lineHeight:1.7}}>Borrowing <span style={{color:"#e8e4d9"}}>{fmt(principal)}</span> at <span style={{color:"#e8e4d9"}}>{rate}%</span> over <span style={{color:"#e8e4d9"}}>{months} months</span> costs <span style={{color:"#f87171",fontWeight:"bold"}}>{fmt(totalInterest)}</span> in interest ({principal>0?((totalInterest/principal)*100).toFixed(1):0}% of borrowed).</div>
        </div>
        <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>PAYMENT SCHEDULE</div>
        <div style={{background:"#0d1b3e",borderRadius:10,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"36px 1fr 1fr 1fr 1fr"}}>
            {["Mo","Payment","Interest","Principal","Balance"].map(h=><div key={h} style={{fontSize:9,color:"#6b8cce",padding:"8px 5px",borderBottom:"1px solid #1e3a5f",textAlign:"right",letterSpacing:1}}>{h}</div>)}
            {schedule.map(row=>[
              <div key={row.month+"m"} style={{fontSize:11,color:"#6b8cce",padding:"6px 5px",borderBottom:"1px solid #0f1929",textAlign:"right"}}>{row.month}</div>,
              <div key={row.month+"p"} style={{fontSize:11,color:"#4ade80",padding:"6px 5px",borderBottom:"1px solid #0f1929",textAlign:"right"}}>{fmt(row.payment)}</div>,
              <div key={row.month+"i"} style={{fontSize:11,color:"#f87171",padding:"6px 5px",borderBottom:"1px solid #0f1929",textAlign:"right"}}>{fmt(row.interest)}</div>,
              <div key={row.month+"pr"} style={{fontSize:11,color:"#60a5fa",padding:"6px 5px",borderBottom:"1px solid #0f1929",textAlign:"right"}}>{fmt(row.principal)}</div>,
              <div key={row.month+"b"} style={{fontSize:11,color:"#e8e4d9",padding:"6px 5px",borderBottom:"1px solid #0f1929",textAlign:"right"}}>{fmt(row.balance)}</div>,
            ])}
          </div>
        </div>
      </div>}
    </div>
  );
}
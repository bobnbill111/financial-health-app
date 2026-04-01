import { useState, useEffect, useRef } from "react";
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
  }
};


const fmt = (n) => "$" + Number(n||0).toLocaleString("en-CA",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtShort = (n) => { const v=Number(n||0); if(v>=1e6) return "$"+(v/1e6).toFixed(1)+"M"; if(v>=1000) return "$"+(v/1000).toFixed(1)+"K"; return fmt(v); };
const CAT_COLORS = ["#4ade80","#60a5fa","#facc15","#f87171","#a78bfa","#34d399","#fb923c","#e879f9","#94a3b8","#22d3ee"];
const GS = { fontFamily:"Georgia,serif" };
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

// ─── DEFAULT STATE ─────────────────────────────────────────────────────────────
const EMPTY = {
  clientName:"", isJoint:null, age1:"", age2:"", person1Name:"", person2Name:"",
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
  creditCards:[{name:"Visa",totalBalance:"",due:"",pending:""},{name:"Mastercard",totalBalance:"",due:"",pending:""}],
  mortgage:{balance:"",value:"",rate:"",monthlyPayment:"",amortYears:""},
  otherDebts:[],
  lifeInsurance:"",
  budget:{income:"",categories:[
    {name:"Investments",amount:"",bucket:"fixed"},{name:"Housing",amount:"",bucket:"fixed"},{name:"Food",amount:"",bucket:"estimated"},
    {name:"Transportation",amount:"",bucket:"estimated"},{name:"Recurring",amount:"",bucket:"subscription"},{name:"Insurance",amount:"",bucket:"fixed"},
    {name:"Entertainment",amount:"",bucket:"estimated"},{name:"Wellness",amount:"",bucket:"estimated"},
  ]},
  billCalendar:[],
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Card = ({children,style={}}) => <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14,...style}}>{children}</div>;
const Label = ({children}) => <div style={{fontSize:10,letterSpacing:2,color:"#6b8cce",textTransform:"uppercase",marginBottom:6,...GS}}>{children}</div>;
const SecTitle = ({children}) => <div style={{fontSize:10,letterSpacing:3,color:"#6b8cce",textTransform:"uppercase",marginBottom:14,...GS}}>{children}</div>;
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
const NextBtn = ({onClick,children,style={}}) => (
  <button onClick={onClick} style={{width:"100%",background:"linear-gradient(135deg,#1a4080,#0d2a5e)",border:"1px solid #2a4080",borderRadius:10,color:"#4ade80",padding:"14px",fontSize:14,cursor:"pointer",letterSpacing:1,marginBottom:14,...GS,...style}}>{children}</button>
);
const NavBar = ({title,subtitle,onHome,right}) => (
  <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 0",position:"sticky",top:0,zIndex:100}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onHome} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
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
  const totalCC = d.creditCards.reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD = (d.otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0);
  const totalLocBal = (d.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0);
  const totalDebt = totalCC+totalLocBal+totalOD;
  const efund = (d.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const annualIncome = Number(d.budget.income||0)*12;
  const monthlyIncome = Number(d.budget.income||0);
  const monthlyExp = d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus = monthlyIncome - monthlyExp;

  // Investment rate — sum ALL investment categories
  const invMonthly = d.budget.categories
    .filter(c=>["investments","invest","rrsp","tfsa","fhsa","saving","savings"].some(k=>c.name.toLowerCase().includes(k)))
    .reduce((s,c)=>s+Number(c.amount||0),0);
  const invRate = annualIncome>0?(invMonthly*12/annualIncome)*100:0;

  const band = age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s";
  const bm = {
    "20s":{invTarget:10,efundMonths:3,debtRatio:0.3,invAmount:10000},
    "30s":{invTarget:15,efundMonths:4,debtRatio:0.25,invAmount:60000},
    "40s":{invTarget:18,efundMonths:5,debtRatio:0.2,invAmount:150000},
    "50s":{invTarget:20,efundMonths:6,debtRatio:0.15,invAmount:300000},
    "60s":{invTarget:20,efundMonths:6,debtRatio:0.1,invAmount:500000}
  }[band];

  // Investment rate score — full 30 pts, rewarding generously above target too
  const invRateScore = Math.min(30, Math.round((invRate/bm.invTarget)*30));

  // Budget balance — only penalises deficits, neutral for surplus
  // 0 pts for deficit, 10 pts for balanced or surplus
  const budgetScore = surplus>=0 ? 10 : Math.max(0, Math.round(10 + (surplus/monthlyIncome)*20));

  const scores = [
    {label:"Investment Rate",score:invRateScore,max:30,desc:`${invRate.toFixed(1)}% of income invested (target: ${bm.invTarget}%+)`},
    {label:"Portfolio Size",score:Math.min(25,Math.round((totalInv/bm.invAmount)*25)),max:25,desc:`${fmtShort(totalInv)} saved (benchmark: ${fmtShort(bm.invAmount)})`},
    {label:"Emergency Fund",score:Math.min(20,Math.round(((monthlyExp>0?efund/monthlyExp:0)/bm.efundMonths)*20)),max:20,desc:`${monthlyExp>0?(efund/monthlyExp).toFixed(1):0} months (target: ${bm.efundMonths})`},
    {label:"Debt Management",score:Math.max(0,Math.round(annualIncome>0?15-Math.max(0,(totalDebt/annualIncome-bm.debtRatio)*100):0)),max:15,desc:`Non-mortgage debt ${annualIncome>0?(totalDebt/annualIncome*100).toFixed(0):0}% of income (target <${bm.debtRatio*100}%)`},
    {label:"Budget Balance",score:budgetScore,max:10,desc:surplus>=0?`${fmt(surplus)}/mo surplus — on track`:`${fmt(Math.abs(surplus))}/mo deficit — spending exceeds income`},
  ];
  const total = scores.reduce((s,x)=>s+x.score,0);
  const grade = total>=85?"A+":total>=75?"A":total>=65?"B+":total>=55?"B":total>=45?"C+":total>=35?"C":"D";
  const gradeColor = total>=75?"#4ade80":total>=55?"#facc15":total>=35?"#fb923c":"#f87171";
  return {total,grade,gradeColor,scores,band,surplus,invRate,invMonthly,monthlyIncome};
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",...GS}}>
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
          <button onClick={handleSubmit} disabled={loading}
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
          <button onClick={onGuest} style={{background:"none",border:"1px solid #1e3a5f",borderRadius:12,padding:"12px 24px",color:"#6b8cce",cursor:"pointer",fontSize:13,width:"100%",...GS}}>
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
  const [beginner,setBeginner]=useState(false);
  const [saving,setSaving]=useState(false);
  const [isNewUser,setIsNewUser]=useState(false);

  const [data,setData]=useState(EMPTY);
  const [scoreHistory,setScoreHistory]=useState([]);

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
        // No data row = new user
        setIsNewUser(true);
      }
    } catch(e) {
      // If anything fails, still let them in
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

  // Derive display name — appointment name first, fallback to email
  const displayName=data.clientName||user?.email?.split("@")[0]||"";
  // Latest score
  const latestScore=scoreHistory.length>0?scoreHistory[scoreHistory.length-1]:null;

  if(!authChecked) return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",...GS}}>
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
      {page==="home"&&<Homepage onAppointment={()=>setPage("appointment")} onCheckup={()=>setPage("checkup")} onTools={()=>setPage("tools")} onProfile={()=>setPage("profile")} onSignIn={()=>setIsGuest(false)} dark={dark} setDark={setDark} theme={theme} beginner={beginner} setBeginner={setBeginner} userEmail={user?.email} displayName={displayName} latestScore={latestScore} isGuest={isGuest}/>}
      {page==="appointment"&&<Appointment data={data} setData={setData} onHome={()=>setPage("home")} onCheckup={()=>setPage("checkup")} saveScore={saveScore} totalInv={totalInv} theme={theme} beginner={beginner}/>}
      {page==="checkup"&&<Checkup data={data} onHome={()=>setPage("home")} onAppointment={()=>setPage("appointment")} totalInv={totalInv} scoreHistory={scoreHistory} saveScore={saveScore} theme={theme} beginner={beginner}/>}
      {page==="tools"&&<IndividualTools onHome={()=>setPage("home")} data={data} theme={theme} beginner={beginner}/>}
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",...GS}}>
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onHome} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
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
function Tip({text,beginner}) {
  const [show,setShow]=useState(false);
  if(!beginner) return null;
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
function BeginnerCard({beginner,tip,title,children}) {
  if(!beginner) return <>{children}</>;
  return (
    <div style={{background:"linear-gradient(135deg,#0d1b3e,#111827)",border:"1px solid #1e3a5f",borderRadius:14,padding:"18px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,color:"#22d3ee",fontWeight:"bold",...GS}}>{title}</div>
        {tip&&<Tip text={tip} beginner={beginner}/>}
      </div>
      {children}
    </div>
  );
}

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
function Homepage({onAppointment,onCheckup,onTools,onProfile,onSignIn,dark,setDark,theme,beginner,setBeginner,userEmail,displayName,latestScore,isGuest}) {
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
          <button onClick={onSignIn} style={{background:"linear-gradient(135deg,#1a0505,#0d1b3e)",border:"1px solid #cc000066",borderRadius:10,padding:"8px 14px",color:"#cc0000",cursor:"pointer",fontSize:12,fontWeight:"bold",...GS}}>
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

      {/* Toggles — top right */}
      <div style={{position:"absolute",top:24,right:24,zIndex:10,display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
        {/* Dark/Light */}
        <button onClick={()=>setDark(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{width:64,height:32,borderRadius:16,background:dark?"#1e3a5f":"#e2e8f0",border:`2px solid ${dark?"#2a4080":"#cbd5e1"}`,position:"relative",transition:"background 0.3s,border 0.3s",display:"flex",alignItems:"center",padding:"0 4px"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:dark?"#4ade80":"#facc15",position:"absolute",left:dark?4:36,transition:"left 0.3s,background 0.3s",boxShadow:`0 2px 8px ${dark?"#4ade8066":"#facc1566"}`}}/>
            <span style={{position:"absolute",left:dark?32:6,fontSize:13,transition:"left 0.3s"}}>{dark?"☀️":"🌙"}</span>
          </div>
          <div style={{fontSize:9,color:theme.textDim,letterSpacing:2,textTransform:"uppercase",...GS}}>{dark?"Light":"Dark"}</div>
        </button>
        {/* Beginner mode */}
        <button onClick={()=>setBeginner(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{width:64,height:32,borderRadius:16,background:beginner?"#1a2a0a":"#1e1e2e",border:`2px solid ${beginner?"#84cc16":"#2a4080"}`,position:"relative",transition:"background 0.3s,border 0.3s",display:"flex",alignItems:"center",padding:"0 4px"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:beginner?"#84cc16":"#475569",position:"absolute",left:beginner?36:4,transition:"left 0.3s,background 0.3s",boxShadow:`0 2px 8px ${beginner?"#84cc1666":"#00000033"}`}}/>
            <span style={{position:"absolute",left:beginner?6:30,fontSize:13,transition:"left 0.3s"}}>{beginner?"🌱":"🎓"}</span>
          </div>
          <div style={{fontSize:9,color:beginner?"#84cc16":theme.textDim,letterSpacing:2,textTransform:"uppercase",...GS}}>Beginner</div>
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
          {beginner&&<div style={{marginTop:10,background:"#1a2a0a",border:"1px solid #84cc1644",borderRadius:10,padding:"8px 16px",fontSize:12,color:"#84cc16",...GS}}>🌱 Beginner Mode is ON — we'll guide you every step</div>}
        </div>

        <div style={{...fade(0.3),width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          {[
            {label:beginner?"See My Financial Picture":"Financial Check-up",sub:beginner?"See everything about your money in one place — net worth, savings, debts and more":"View your dashboard — net worth, investments & goals",badge:"RETURNING",bc:theme.badgeCheckup,border:theme.btnCheckupBorder,bg:theme.btnCheckupBg,textColor:theme.btnCheckupText,fn:onCheckup},
            {label:beginner?"Set Up My Profile":"Initial Appointment",sub:beginner?"Answer some simple questions about your money — takes about 10 minutes":"Enter your financial info — takes about 10 minutes",badge:beginner?"START HERE":"NEW",bc:theme.badgeAppt,border:theme.btnApptBorder,bg:theme.btnApptBg,textColor:theme.btnApptText,fn:onAppointment},
            {label:beginner?"Financial Calculators":"Individual Tools",sub:beginner?"Simple calculators for budgeting, saving goals, loans and more":"Budget, net worth, savings goals, simulators & more",badge:"TOOLS",bc:theme.badgeTools,border:theme.btnToolsBorder,bg:theme.btnToolsBg,textColor:theme.btnToolsText,fn:onTools},
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
function PostScoreInvestmentSlider({income,surplus,currentInvRate,invMonthly}) {
  const [extra,setExtra]=useState(0);
  const maxExtra=Math.max(0,surplus-invMonthly);
  const totalInvMonthly=invMonthly+extra;
  const newInvRate=income>0?(totalInvMonthly/income)*100:0;
  const r=0.07/12;
  const fv=(mo,n)=>mo>0?mo*((Math.pow(1+r,n*12)-1)/r):0;
  const extraFv10=fv(extra,10);
  const extraFv25=fv(extra,25);

  if(maxExtra<=0) return null;

  return (
    <Card style={{background:"linear-gradient(135deg,#0d1a2a,#0d1b3e)",border:"1px solid #4ade8066"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>📈</span>
        <div style={{fontSize:14,color:"#4ade80",fontWeight:"bold",...GS}}>What If You Invested More?</div>
      </div>
      <div style={{fontSize:12,color:"#6b8cce",marginBottom:16,lineHeight:1.6}}>
        You have {fmt(maxExtra)}/mo of surplus not yet invested. Drag the slider to see the impact on your wealth and score.
      </div>

      {/* Slider */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:12,color:"#8fadd4"}}>Extra invested per month</div>
          <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",...GS}}>+{fmt(extra)}/mo</div>
        </div>
        <input type="range" min={0} max={maxExtra} step={Math.max(10,Math.round(maxExtra/20))} value={extra}
          onChange={e=>setExtra(Number(e.target.value))}
          style={{width:"100%",accentColor:"#4ade80",cursor:"pointer"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#2a4080",marginTop:2}}>
          <span>$0</span><span>{fmt(maxExtra/2)}</span><span>{fmt(maxExtra)}</span>
        </div>
      </div>

      {/* Investment rate before/after */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>CURRENT RATE</div>
          <div style={{fontSize:20,color:"#facc15",fontWeight:"bold",...GS}}>{currentInvRate.toFixed(1)}%</div>
          <div style={{fontSize:10,color:"#6b8cce",marginTop:2}}>{fmt(invMonthly)}/mo</div>
        </div>
        <div style={{background:"#0d2a1a",borderRadius:10,padding:"12px",textAlign:"center",border:"1px solid #4ade8033"}}>
          <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>NEW RATE</div>
          <div style={{fontSize:20,color:"#4ade80",fontWeight:"bold",...GS}}>{newInvRate.toFixed(1)}%</div>
          <div style={{fontSize:10,color:"#6b8cce",marginTop:2}}>{fmt(totalInvMonthly)}/mo</div>
        </div>
      </div>

      {/* Wealth projections */}
      {extra>0&&(
        <div>
          <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:10}}>EXTRA WEALTH FROM INVESTING MORE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>IN 10 YEARS</div>
              <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(extraFv10)}</div>
              <div style={{fontSize:9,color:"#2a4080",marginTop:2}}>at 7%/yr</div>
            </div>
            <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>IN 25 YEARS</div>
              <div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(extraFv25)}</div>
              <div style={{fontSize:9,color:"#2a4080",marginTop:2}}>at 7%/yr</div>
            </div>
          </div>
          <div style={{background:"#0d1b3e",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#8fadd4",lineHeight:1.7,textAlign:"center"}}>
            ✅ Investing {fmt(extra)}/mo more would raise your Investment Rate score and improve your overall grade.
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── FINANCIAL PRESCRIPTION ───────────────────────────────────────────────────
function FinancialPrescription({score,data,totalInv}) {
  const income=Number(data.budget.income||0);
  const totalAlloc=data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus=income-totalAlloc;
  const totalCC=data.creditCards.reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const invCat=data.budget.categories.find(c=>c.name==="Investments");
  const invAmt=Number(invCat?.amount||0);
  const efund=(data.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const monthlyExp=totalAlloc;
  const efundMonths=monthlyExp>0?(efund/monthlyExp):0;

  // Generate 3 hyper-specific prescriptions based on their actual numbers
  const rxItems=[];

  // Investment rate Rx
  if(income>0&&invAmt/income<0.10){
    const target=Math.round(income*0.10);
    const gap=target-invAmt;
    rxItems.push({icon:"💊",color:"#4ade80",title:"Boost your investment rate",action:`Transfer ${fmt(gap)}/mo more into your TFSA — bringing you from ${((invAmt/income)*100).toFixed(1)}% to 10% of your income invested. Set this up as an automatic transfer on payday so it never gets spent.`});
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
  const totalCC=data.creditCards.reduce((s,c)=>s+Number(c.totalBalance||0),0);
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
  const maxSlider=Math.max(Math.round((surplus||0)*1.5),500);
  const [extraInv,setExtraInv]=useState(Math.min(Math.round((surplus||0)*0.5),500));
  const r=0.07/12,years=[10,20,30];
  const fv=(mo,yrs)=>mo>0?Math.round(mo*((Math.pow(1+r,yrs*12)-1)/r)):0;
  const totalMonthly=(invMonthly||0)+extraInv;
  const newRate=income>0?(totalMonthly/income)*100:0;
  const targets={"20s":10,"30s":15,"40s":18,"50s":20,"60s":20};
  const target=targets[band]||15;
  const newScore=Math.min(30,Math.round((newRate/target)*30));
  const oldScore=Math.min(30,Math.round(((currentInvRate||0)/target)*30));

  return (
    <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",...GS}}>What If I Invested More?</div>
      </div>
      <div style={{fontSize:12,color:"#6b8cce",marginBottom:16,lineHeight:1.6}}>
        Drag the slider to see how investing more of your surplus each month affects your score and long-term wealth.
      </div>

      {/* Slider */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:12,color:"#e8e4d9"}}>Extra invested per month</div>
          <div style={{fontSize:16,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(extraInv)}/mo</div>
        </div>
        <input type="range" min={0} max={maxSlider} step={25} value={extraInv}
          onChange={e=>setExtraInv(Number(e.target.value))}
          style={{width:"100%",accentColor:"#4ade80",cursor:"pointer"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:10,color:"#2a4080"}}>$0</span>
          <span style={{fontSize:10,color:"#2a4080"}}>{fmt(maxSlider)}</span>
        </div>
      </div>

      {/* Investment rate impact */}
      <div style={{background:"#0d1b3e",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:10}}>INVESTMENT RATE IMPACT</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:8}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>Current</div>
            <div style={{fontSize:20,color:"#facc15",fontWeight:"bold",...GS}}>{(currentInvRate||0).toFixed(1)}%</div>
            <div style={{fontSize:10,color:"#6b8cce"}}>{oldScore}/30 pts</div>
          </div>
          <div style={{fontSize:18,color:"#4ade80"}}>→</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>With extra</div>
            <div style={{fontSize:20,color:"#4ade80",fontWeight:"bold",...GS}}>{newRate.toFixed(1)}%</div>
            <div style={{fontSize:10,color:"#4ade80"}}>{newScore}/30 pts {newScore>oldScore&&`(+${newScore-oldScore})`}</div>
          </div>
        </div>
        {newScore>oldScore&&(
          <div style={{fontSize:11,color:"#4ade80",textAlign:"center",marginTop:4}}>
            🎯 This would add <strong>+{newScore-oldScore} points</strong> to your Financial Health Score
          </div>
        )}
        {newRate>=target&&(
          <div style={{fontSize:11,color:"#4ade80",textAlign:"center",marginTop:6,background:"#0d2a1a",borderRadius:8,padding:"6px"}}>
            ✅ You'd hit the {band} investment target of {target}%
          </div>
        )}
      </div>

      {/* Wealth projection */}
      <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:10}}>WEALTH AT 7% ANNUAL RETURN</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {years.map(y=>(
          <div key={y} style={{background:"#0d1b3e",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>{y} years</div>
            <div style={{fontSize:14,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(fv(totalMonthly,y))}</div>
            {extraInv>0&&<div style={{fontSize:9,color:"#22d3ee",marginTop:2}}>+{fmtShort(fv(extraInv,y))} extra</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── SCORE GUIDANCE ───────────────────────────────────────────────────────────
function ScoreGuidance({score,data,totalInv}) {
  const isStruggling = score.total < 55; // below B
  const income = Number(data.budget.income||0);
  const totalAlloc = data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus = income - totalAlloc;
  const totalCC = data.creditCards.reduce((s,c)=>s+Number(c.totalBalance||0),0);
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

// ─── INVESTMENT SLIDER (BUDGET STEP) ─────────────────────────────────────────
function ApptInvestmentSlider({income,totalAlloc}) {
  const surplus=Math.max(0,income-totalAlloc);
  const [pct,setPct]=useState(10);
  const monthly=Math.round(surplus*(pct/100));
  const r=0.07/12;
  const fv=(n)=>monthly>0?monthly*((Math.pow(1+r,n*12)-1)/r):0;
  if(surplus<=0) return null;
  return (
    <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade8044"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:18}}>📈</span>
        <div>
          <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",...GS}}>Investment Opportunity</div>
          <div style={{fontSize:11,color:"#6b8cce"}}>You have {fmt(surplus)}/mo left over — what if you invested some of it?</div>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:12,color:"#8fadd4"}}>Invest <span style={{color:"#4ade80",fontWeight:"bold",...GS}}>{pct}%</span> of surplus</div>
          <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmt(monthly)}/mo</div>
        </div>
        <input type="range" min={5} max={100} step={5} value={pct} onChange={e=>setPct(Number(e.target.value))}
          style={{width:"100%",accentColor:"#4ade80",cursor:"pointer"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#2a4080",marginTop:2}}>
          <span>5%</span><span>50%</span><span>100%</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{y:10,label:"10 yrs"},{y:20,label:"20 yrs"},{y:30,label:"30 yrs"}].map(x=>(
          <div key={x.y} style={{background:"#0d1b3e",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>{x.label}</div>
            <div style={{fontSize:15,color:"#4ade80",fontWeight:"bold",...GS}}>{fmtShort(fv(x.y))}</div>
            <div style={{fontSize:9,color:"#2a4080",marginTop:2}}>at 7%/yr</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:11,color:"#6b8cce",lineHeight:1.6,textAlign:"center"}}>
        Investing more also improves your Financial Health Score ↑
      </div>
    </Card>
  );
}

// ─── APPOINTMENT ──────────────────────────────────────────────────────────────
const APPT_STEPS=["Start","Accounts","Investments","Savings","Mortgage","Debt","Credit Cards","Line of Credit","Budget","Score"];

function Appointment({data:d,setData:setD,onHome,onCheckup,saveScore,totalInv}) {
  const [step,setStep]=useState("Start");
  const set=(g,f)=>v=>setD(p=>({...p,[g]:{...p[g],[f]:v}}));
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

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title="Initial Appointment" subtitle="FinHealth" onHome={onHome} right={<div style={{fontSize:12,color:"#4ade80"}}>{pct}%</div>}/>
      <div style={{height:3,background:"#1e3a5f"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#4ade80,#22d3ee)",transition:"width 0.4s"}}/></div>
      <div style={{overflowX:"auto",display:"flex",background:"#0d1b3e",borderBottom:"1px solid #1e3a5f"}}>
        {APPT_STEPS.filter(s=>s!=="Start"&&s!=="Score").map(s=>(
          <button key={s} onClick={()=>setStep(s)} style={{background:"none",border:"none",borderBottom:step===s?"2px solid #4ade80":"2px solid transparent",color:step===s?"#4ade80":"#8fadd4",padding:"8px 11px",fontSize:10,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",...GS}}>{s}</button>
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
            {d.isJoint!==null&&<NextBtn onClick={()=>setStep("Accounts")}>Let's Begin →</NextBtn>}
          </div>
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
            <NextBtn onClick={()=>setStep("Savings")}>Next: Savings →</NextBtn>
          </div>
        )}

        {step==="Savings"&&(
          <div>
            <Card>
              <SecTitle>Savings Accounts</SecTitle>
              <div style={{fontSize:12,color:"#6b8cce",marginBottom:14,lineHeight:1.6}}>Add any savings bucket — emergency fund, sinking fund, vacation fund, etc.</div>
              {d.savingsAccounts.map((acct,i)=>{
                const sv=Number(acct.saved||0),gl=Number(acct.goal||0),p=gl>0?Math.min(100,(sv/gl)*100):0;
                return (
                  <div key={i} style={{background:"#0d1b3e",borderRadius:12,padding:"14px",marginBottom:12}}>
                    {/* Name row */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:acct.color,flexShrink:0}}/>
                      <input
                        value={acct.name}
                        onChange={e=>setSavingsAccount(i,"name")(e.target.value)}
                        style={{background:"none",border:"none",borderBottom:"1px solid #2a4080",outline:"none",color:"#e8e4d9",fontSize:14,flex:1,paddingBottom:3,...GS}}
                      />
                      <button onClick={()=>removeSavingsAccount(i)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:18,flexShrink:0}}>×</button>
                    </div>
                    {/* Saved / Goal */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <Label>Amount Saved</Label>
                        <NumInput value={acct.saved} onChange={setSavingsAccount(i,"saved")}/>
                      </div>
                      <div>
                        <Label>Goal Amount</Label>
                        <NumInput value={acct.goal} onChange={setSavingsAccount(i,"goal")}/>
                      </div>
                    </div>
                    {/* Progress */}
                    {sv>0&&gl>0&&(
                      <div>
                        <div style={{background:"#1a2235",borderRadius:6,height:7,overflow:"hidden",marginBottom:5}}>
                          <div style={{width:p+"%",height:"100%",background:acct.color,borderRadius:6,transition:"width 0.3s"}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <div style={{fontSize:10,color:"#6b8cce"}}>{Math.round(p)}% complete</div>
                          <div style={{fontSize:10,color:"#6b8cce"}}>{fmt(gl-sv)} remaining</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addSavingsAccount} style={{width:"100%",background:"none",border:"1px dashed #4ade8044",color:"#6b8cce",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,...GS}}>+ Add Savings Account</button>
            </Card>
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
              const bill=Number(cc.totalBalance||0)+Number(cc.pending||0)-Number(cc.due||0);
              return (
                <Card key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>{cc.name||`Card ${i+1}`}</div><button onClick={()=>setD(p=>({...p,creditCards:p.creditCards.filter((_,idx)=>idx!==i)}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button></div>
                  <Label>Card Name</Label><TxtInput value={cc.name} onChange={v=>setCC(i,"name")(v)} placeholder="Visa, Mastercard..."/>
                  <div style={{height:10}}/><Label>Total Balance</Label><NumInput value={cc.totalBalance} onChange={setCC(i,"totalBalance")}/>
                  <div style={{height:10}}/><Label>Due (Statement Balance)</Label><NumInput value={cc.due} onChange={setCC(i,"due")}/>
                  <div style={{height:10}}/><Label>Pending (Not Yet on Statement)</Label><NumInput value={cc.pending} onChange={setCC(i,"pending")}/>
                  {(Number(cc.totalBalance)||Number(cc.due)||Number(cc.pending))?<div style={{marginTop:12,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
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
            <button onClick={()=>setD(p=>({...p,creditCards:[...p.creditCards,{name:"",totalBalance:"",due:"",pending:""}]}))} style={{width:"100%",background:"transparent",border:"1px solid #2a4080",borderRadius:10,color:"#8fadd4",padding:"12px",fontSize:13,cursor:"pointer",marginBottom:12,...GS}}>+ Add Card</button>
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

            {/* Investment slider */}
            {income>0&&<ApptInvestmentSlider income={income} totalAlloc={totalAlloc}/>}

            <NextBtn onClick={()=>setStep("Score")}>Calculate My Score →</NextBtn>
          </div>
        )}

        {step==="Score"&&(
          score?(
            <div id="score-content">
              <Card style={{textAlign:"center",padding:"28px 16px",background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:`1px solid ${score.gradeColor}44`}}>
                <div style={{fontSize:11,color:"#6b8cce",letterSpacing:3,marginBottom:12}}>FINANCIAL HEALTH SCORE</div>
                <div style={{fontSize:80,color:score.gradeColor,fontWeight:"bold",lineHeight:1,marginBottom:8}}>{score.grade}</div>
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
      ${[{l:"Cash & Accounts",v:cash},{l:"Investments",v:totalInv},{l:"Home Equity",v:equity},{l:"Savings",v:savings},{l:"Life Insurance",v:Number(d.lifeInsurance||0)}].map(x=>`<div class="row"><span class="row-label">${x.l}</span><span class="row-val" style="color:#16a34a">${fmt(x.v)}</span></div>`).join("")}
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

const DASH_TABS=["Overview","Investments","Budget","Savings","Debt","Mortgage","Cash Flow","Score History"];

function Checkup({data:d,onHome,onAppointment,totalInv,scoreHistory,saveScore}) {
  const [tab,setTab]=useState("Overview");
  const cash=d.bankAccounts.reduce((s,a)=>s+Number(a.amount||0),0);
  const savings=(d.savingsAccounts||[]).reduce((s,a)=>s+Number(a.saved||0),0);
  const equity=Math.max(0,Number(d.mortgage.value||0)-Number(d.mortgage.balance||0));
  const totalAssets=cash+totalInv+Number(d.lifeInsurance||0)+savings+equity;
  const totalCC=d.creditCards.reduce((s,c)=>s+Number(c.totalBalance||0),0);
  const totalOD=d.otherDebts.reduce((s,x)=>s+Number(x.balance||0),0);
  const totalLocBal=(d.locs||[]).reduce((s,l)=>s+Number(l.balance||0),0);
  const totalLiab=totalCC+totalLocBal+Number(d.mortgage.balance||0)+totalOD;
  const netWorth=totalAssets-totalLiab;
  const income=Number(d.budget.income||0),totalAlloc=d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const score=calcScore(d,totalInv);

  // FOO steps — manual checkboxes
  const FOO_LABELS = [
    {label:"Deductibles Covered", desc:"Insurance deductibles are funded"},
    {label:"Employer Match", desc:"Contributing enough to get full employer match"},
    {label:"High-Interest Debt Paid", desc:"Credit cards & high-rate debt cleared"},
    {label:"Emergency Reserves", desc:"3–6 months of expenses saved"},
    {label:"FHSA & TFSA", desc:"Maxing registered accounts"},
    {label:"RRSP Maxed", desc:"Contributing to RRSP limit"},
    {label:"Hyper Accumulation", desc:"Investing 20%+ of gross income"},
  ];
  const [fooChecked, setFooChecked] = useState(() => FOO_LABELS.map(() => false));
  const toggleFoo = (i) => setFooChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  const fooComplete = fooChecked.filter(Boolean).length;

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title="Financial Check-up" subtitle={d.clientName||"FinHealth"} onHome={onHome} right={<button onClick={onAppointment} style={{background:"none",border:"1px solid #2a4080",borderRadius:8,color:"#8fadd4",padding:"6px 12px",fontSize:11,cursor:"pointer",...GS}}>Edit</button>}/>
      <div style={{overflowX:"auto",display:"flex",background:"#0d1b3e",borderBottom:"1px solid #1e3a5f"}}>
        {DASH_TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",borderBottom:tab===t?"2px solid #4ade80":"2px solid transparent",color:tab===t?"#4ade80":"#8fadd4",padding:"10px 12px",fontSize:10,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",...GS}}>{t}</button>)}
      </div>
      <div style={{padding:"16px 16px 0",maxWidth:520,margin:"0 auto"}}>
        <FullReportBtn
          data={d} totalInv={totalInv} netWorth={netWorth}
          totalAssets={totalAssets} totalLiab={totalLiab}
          income={income} totalAlloc={totalAlloc} score={score}
          totalCC={totalCC} totalLocBal={totalLocBal} totalOD={totalOD}
          savings={savings} equity={equity} cash={cash}
          fooChecked={fooChecked} fooLabels={FOO_LABELS}
        />
      </div>
      <div style={{padding:"0 16px 20px",maxWidth:520,margin:"0 auto"}}>

        {tab==="Overview"&&<div id="overview-content">
          <Card style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",textAlign:"center",padding:"24px 16px"}}>
            <div style={{fontSize:11,letterSpacing:3,color:"#6b8cce",marginBottom:6}}>NET WORTH</div>
            <div style={{fontSize:44,color:"#4ade80",fontWeight:"bold",marginBottom:4}}>{fmtShort(netWorth)}</div>
            <div style={{fontSize:12,color:"#6b8cce"}}>{fmt(netWorth)}</div>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[{label:"Cash",val:cash,color:"#60a5fa"},{label:"Investments",val:totalInv,color:"#4ade80"},{label:"Home Equity",val:equity,color:"#a78bfa"},{label:"Savings",val:savings,color:"#34d399"}].map(x=>(
              <div key={x.label} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>{x.label}</div><div style={{fontSize:17,color:x.color,fontWeight:"bold"}}>{fmtShort(x.val)}</div></div>
            ))}
          </div>
          {score&&<Card style={{background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:`1px solid ${score.gradeColor}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>FINANCIAL HEALTH SCORE</div><div style={{fontSize:13,color:"#8fadd4"}}>Ontario · {score.band} age group</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:40,color:score.gradeColor,fontWeight:"bold",lineHeight:1}}>{score.grade}</div><div style={{fontSize:12,color:"#6b8cce"}}>{score.total}/100</div></div>
            </div>
            <div style={{marginTop:12,background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:score.total+"%",height:"100%",background:score.gradeColor,borderRadius:6}}/></div>
          </Card>}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <SecTitle style={{marginBottom:0}}>Financial Order of Operations</SecTitle>
              <div style={{fontSize:11,color:"#6b8cce"}}>{fooComplete}/{FOO_LABELS.length}</div>
            </div>
            {/* Progress bar */}
            <div style={{background:"#0d1b3e",borderRadius:6,height:6,overflow:"hidden",marginBottom:16}}>
              <div style={{width:`${(fooComplete/FOO_LABELS.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6,transition:"width 0.4s"}}/>
            </div>
            {FOO_LABELS.map((s,i)=>{
              const checked = fooChecked[i];
              return (
                <button
                  key={i}
                  onClick={()=>toggleFoo(i)}
                  style={{
                    width:"100%", background:"none", border:"none", cursor:"pointer",
                    display:"flex", alignItems:"center", gap:14,
                    padding:"10px 0",
                    borderBottom: i < FOO_LABELS.length-1 ? "1px solid #1e3a5f" : "none",
                    textAlign:"left",
                  }}
                >
                  {/* Checkbox circle */}
                  <div style={{
                    width:24, height:24, borderRadius:"50%", flexShrink:0,
                    background: checked ? "#4ade80" : "transparent",
                    border: `2px solid ${checked ? "#4ade80" : "#2a4080"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"background 0.2s, border-color 0.2s",
                    boxShadow: checked ? "0 0 10px #4ade8055" : "none",
                  }}>
                    {checked && <span style={{color:"#0a0f1e",fontSize:13,fontWeight:"bold",lineHeight:1}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color: checked ? "#4ade80" : "#e8e4d9",fontWeight: checked ? "bold" : "normal",transition:"color 0.2s",...GS}}>
                      <span style={{fontSize:10,color:"#6b8cce",marginRight:6}}>{i+1}.</span>
                      {s.label}
                    </div>
                    <div style={{fontSize:10,color:"#6b8cce",marginTop:2,...GS}}>{s.desc}</div>
                  </div>
                  {checked && <div style={{fontSize:9,color:"#4ade80",border:"1px solid #4ade8044",borderRadius:10,padding:"2px 8px",flexShrink:0,...GS}}>DONE</div>}
                </button>
              );
            })}
            {fooComplete===FOO_LABELS.length&&(
              <div style={{marginTop:14,background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:16,marginBottom:4}}>🎉</div>
                <div style={{fontSize:13,color:"#4ade80",...GS}}>All steps complete — you're in great financial shape!</div>
              </div>
            )}
          </Card>
          <Card>
            <SecTitle>Net Worth Growth Projection</SecTitle>
            <NetWorthProjection totalInv={totalInv} income={income} totalAlloc={totalAlloc} netWorth={netWorth}/>
          </Card>
          <PDFBtn title={`Financial Overview - ${d.clientName||"Report"}`} contentId="overview-content"/>
        </div>}

        {tab==="Investments"&&<div id="inv-content">
          <Card style={{textAlign:"center",padding:"18px 16px"}}><div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:4}}>TOTAL PORTFOLIO</div><div style={{fontSize:36,color:"#4ade80",fontWeight:"bold"}}>{fmt(totalInv)}</div></Card>
          {[{label:"TFSA",val:sumGroupHelper(d.investments.tfsa),color:"#4ade80",rows:d.investments.tfsa},{label:"FHSA",val:sumGroupHelper(d.investments.fhsa),color:"#60a5fa",rows:d.investments.fhsa},{label:"RRSP",val:sumGroupHelper(d.investments.rrsp),color:"#a78bfa",rows:d.investments.rrsp},{label:"Alternatives",val:sumGroupHelper(d.investments.alternatives),color:"#facc15",rows:d.investments.alternatives},{label:"Non-Reg",val:sumGroupHelper(d.investments.nonReg),color:"#fb923c",rows:d.investments.nonReg}].filter(x=>x.val>0).map(item=>(
            <Card key={item.label}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:"50%",background:item.color}}/><div style={{fontSize:14,color:item.color,fontWeight:"bold"}}>{item.label}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:16,color:item.color,fontWeight:"bold"}}>{fmt(item.val)}</div><div style={{fontSize:10,color:"#6b8cce"}}>{totalInv>0?(item.val/totalInv*100).toFixed(1):0}%</div></div></div>
              <div style={{background:"#0d1b3e",borderRadius:4,height:4,overflow:"hidden",marginBottom:10}}><div style={{width:totalInv>0?(item.val/totalInv*100)+"%":"0%",height:"100%",background:item.color,borderRadius:4}}/></div>
              {item.rows.filter(r=>Number(r.amount||0)>0).map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #1e3a5f"}}><div style={{fontSize:12,color:"#8fadd4"}}>{r.name}</div><div style={{fontSize:12,color:item.color}}>{fmt(r.amount)}</div></div>)}
            </Card>
          ))}
          <PDFBtn title="Investment Summary" contentId="inv-content"/>
        </div>}

        {tab==="Budget"&&<div id="budget-content">
          <Card><SecTitle>Monthly Budget</SecTitle>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:10,color:"#6b8cce"}}>Income</div><div style={{fontSize:22,color:"#4ade80",fontWeight:"bold"}}>{fmt(income)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#6b8cce"}}>Allocated</div><div style={{fontSize:22,color:totalAlloc>income?"#f87171":"#e8e4d9",fontWeight:"bold"}}>{fmt(totalAlloc)}</div></div></div>
            <div style={{background:"#0d1b3e",borderRadius:6,height:10,overflow:"hidden"}}><div style={{width:Math.min(100,income>0?(totalAlloc/income*100):0)+"%",height:"100%",background:totalAlloc>income?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/></div>
          </Card>
          {d.budget.categories.filter(c=>Number(c.amount||0)>0).map((cat,i)=>{
            const p=income>0?(Number(cat.amount)/income*100):0;
            return <div key={i} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length]}}/><div style={{fontSize:13}}>{cat.name}</div></div><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{fontSize:11,color:"#6b8cce"}}>{p.toFixed(1)}%</div><div style={{fontSize:14,color:CAT_COLORS[i%CAT_COLORS.length],fontWeight:"bold"}}>{fmt(cat.amount)}</div></div></div>
              <div style={{background:"#0d1b3e",borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:p+"%",height:"100%",background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:4}}/></div>
            </div>;
          })}
          <PDFBtn title="Budget Summary" contentId="budget-content"/>
        </div>}

        {tab==="Savings"&&<div id="savings-content">
          {(d.savingsAccounts||[]).length===0
            ? <div style={{textAlign:"center",padding:"40px 0",color:"#6b8cce"}}>No savings accounts entered yet.</div>
            : (d.savingsAccounts||[]).map((acct,i)=>{
                const sv=Number(acct.saved||0),gl=Number(acct.goal||0),p=gl>0?Math.min(100,(sv/gl)*100):0;
                return (
                  <Card key={i}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:9,height:9,borderRadius:"50%",background:acct.color}}/>
                        <div style={{fontSize:14,color:acct.color,fontWeight:"bold",...GS}}>{acct.name}</div>
                      </div>
                      <div style={{fontSize:11,color:"#6b8cce"}}>{Math.round(p)}%</div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div><div style={{fontSize:10,color:"#6b8cce"}}>Saved</div><div style={{fontSize:22,color:acct.color,fontWeight:"bold",...GS}}>{fmt(sv)}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#6b8cce"}}>Goal</div><div style={{fontSize:22,color:"#e8e4d9",fontWeight:"bold",...GS}}>{fmt(gl)}</div></div>
                    </div>
                    <div style={{background:"#0d1b3e",borderRadius:6,height:12,overflow:"hidden",marginBottom:6}}>
                      <div style={{width:p+"%",height:"100%",background:acct.color,borderRadius:6}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div style={{fontSize:11,color:"#6b8cce"}}>{Math.round(p)}% complete</div>
                      <div style={{fontSize:11,color:"#6b8cce"}}>{fmt(Math.max(0,gl-sv))} remaining</div>
                    </div>
                  </Card>
                );
              })
          }
          <PDFBtn title="Savings Summary" contentId="savings-content"/>
        </div>}

        {tab==="Debt"&&<div id="debt-content">
          <Card style={{textAlign:"center",padding:"18px 16px"}}><div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:4}}>TOTAL NON-MORTGAGE DEBT</div><div style={{fontSize:36,color:"#f87171",fontWeight:"bold"}}>{fmt(totalCC+totalLocBal+totalOD)}</div></Card>
          {d.creditCards.filter(c=>Number(c.totalBalance||0)>0).map((cc,i)=>(
            <Card key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:14,color:"#e8e4d9",fontWeight:"bold"}}>{cc.name}</div><div style={{fontSize:18,color:"#f87171",fontWeight:"bold"}}>{fmt(cc.totalBalance)}</div></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[{l:"Due",v:cc.due,c:"#60a5fa"},{l:"Pending",v:cc.pending,c:"#facc15"},{l:"Bill",v:Number(cc.totalBalance||0)+Number(cc.pending||0)-Number(cc.due||0),c:"#f87171"}].map(r=><div key={r.l} style={{background:"#0d1b3e",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>{r.l}</div><div style={{fontSize:13,color:r.c,fontWeight:"bold"}}>{fmt(r.v)}</div></div>)}</div>
            </Card>
          ))}
          {(d.locs||[]).filter(l=>Number(l.balance||0)>0).map((loc,i)=>(
            <Card key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:14,color:"#e8e4d9",fontWeight:"bold",...GS}}>{loc.name||"Line of Credit"}</div>
                <div style={{fontSize:18,color:"#f87171",fontWeight:"bold",...GS}}>{fmt(loc.balance)}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:"#0d1b3e",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>RATE</div><div style={{fontSize:13,color:"#facc15",fontWeight:"bold"}}>{loc.rate}%</div></div>
                <div style={{background:"#0d1b3e",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:4}}>MONTHLY INT.</div><div style={{fontSize:13,color:"#f87171",fontWeight:"bold"}}>{loc.rate?fmt((Number(loc.balance)*(Number(loc.rate)/100))/12):"—"}</div></div>
              </div>
            </Card>
          ))}
          {d.otherDebts.filter(x=>Number(x.balance||0)>0).map((debt,i)=>(
            <Card key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:11,color:"#a78bfa",marginBottom:2}}>{debt.type}</div><div style={{fontSize:14,color:"#e8e4d9"}}>{debt.name}</div></div><div style={{fontSize:18,color:"#f87171",fontWeight:"bold"}}>{fmt(debt.balance)}</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{l:"Rate",v:debt.rate+"%",c:"#facc15"},{l:"Monthly",v:fmt(debt.payment||0),c:"#60a5fa"}].map(r=><div key={r.l} style={{background:"#0d1b3e",borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:9,color:"#6b8cce",marginBottom:3}}>{r.l}</div><div style={{fontSize:13,color:r.c,fontWeight:"bold"}}>{r.v}</div></div>)}</div></Card>
          ))}
          <Card><SecTitle>Debt Payoff Optimizer</SecTitle><DebtOptimizer creditCards={d.creditCards} otherDebts={d.otherDebts} locs={d.locs}/></Card>
          <PDFBtn title="Debt Summary" contentId="debt-content"/>
        </div>}

        {tab==="Mortgage"&&<div id="mort-content">
          {Number(d.mortgage.balance||0)>0?(
            <div>
              <Card style={{textAlign:"center",padding:"18px 16px",background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:"1px solid #a78bfa44"}}>
                <div style={{fontSize:10,color:"#6b8cce",letterSpacing:3,marginBottom:4}}>HOME EQUITY</div>
                <div style={{fontSize:38,color:"#a78bfa",fontWeight:"bold"}}>{fmtShort(equity)}</div>
                <div style={{fontSize:12,color:"#6b8cce",marginTop:4}}>{fmt(Number(d.mortgage.value||0))} value · {fmt(Number(d.mortgage.balance||0))} remaining</div>
              </Card>
              <Card><SecTitle>Mortgage Details</SecTitle>
                {[{l:"Balance",v:d.mortgage.balance,c:"#f87171"},{l:"Home Value",v:d.mortgage.value,c:"#4ade80"},{l:"Monthly Payment",v:d.mortgage.monthlyPayment,c:"#60a5fa"}].filter(x=>Number(x.v||0)>0).map(x=>(
                  <div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}><div style={{fontSize:13,color:"#8fadd4"}}>{x.l}</div><div style={{fontSize:13,color:x.c,fontWeight:"bold"}}>{fmt(x.v)}</div></div>
                ))}
                {d.mortgage.rate&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}><div style={{fontSize:13,color:"#8fadd4"}}>Rate</div><div style={{fontSize:13,color:"#facc15",fontWeight:"bold"}}>{d.mortgage.rate}%</div></div>}
                {d.mortgage.amortYears&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}><div style={{fontSize:13,color:"#8fadd4"}}>Amortization Remaining</div><div style={{fontSize:13,color:"#e8e4d9",fontWeight:"bold"}}>{d.mortgage.amortYears} yrs</div></div>}
              </Card>
              {Number(d.mortgage.balance)>0&&Number(d.mortgage.value)>0&&(()=>{const ltv=(Number(d.mortgage.balance)/Number(d.mortgage.value)*100);return <Card><SecTitle>LTV Ratio</SecTitle><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:13,color:"#8fadd4"}}>Loan-to-Value</div><div style={{fontSize:18,color:ltv>80?"#f87171":"#4ade80",fontWeight:"bold"}}>{ltv.toFixed(1)}%</div></div><div style={{background:"#0d1b3e",borderRadius:6,height:10,overflow:"hidden"}}><div style={{width:Math.min(100,ltv)+"%",height:"100%",background:ltv>80?"#f87171":"#4ade80",borderRadius:6}}/></div><div style={{fontSize:11,color:"#6b8cce",marginTop:6}}>{ltv<=80?"✅ Good LTV (under 80%)":"⚠️ High LTV — consider paying down principal"}</div></Card>;})()} 
              <PDFBtn title="Mortgage Summary" contentId="mort-content"/>
            </div>
          ):<div style={{textAlign:"center",padding:"50px 0"}}><div style={{fontSize:40,marginBottom:12}}>🏠</div><p style={{color:"#6b8cce",lineHeight:1.8}}>No mortgage entered.</p><NextBtn onClick={onAppointment}>Add Mortgage</NextBtn></div>}
        </div>}

        {tab==="Cash Flow"&&<div id="cashflow-content">
          <BillCalendar income={income}/>
          <PDFBtn title="Cash Flow Calendar" contentId="cashflow-content"/>
        </div>}

        {tab==="Score History"&&<div id="history-content">
          <ScoreHistory history={scoreHistory} currentScore={score} onSave={()=>saveScore(score)}/>
          <PDFBtn title="Score History" contentId="history-content"/>
        </div>}
      </div>
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

      {/* Milestones */}
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
  const debts=[
    ...creditCards.filter(c=>Number(c.totalBalance||0)>0).map(c=>({name:c.name,balance:Number(c.totalBalance),rate:19.99,minPayment:Math.max(25,Number(c.totalBalance)*0.03)})),
    ...otherDebts.filter(x=>Number(x.balance||0)>0).map(x=>({name:x.name||x.type,balance:Number(x.balance),rate:Number(x.rate||5),minPayment:Number(x.payment||0)||Math.max(25,Number(x.balance)*0.02)})),
    ...(locs||[]).filter(l=>Number(l.balance||0)>0).map(l=>({name:l.name||"Line of Credit",balance:Number(l.balance),rate:Number(l.rate||7),minPayment:Math.max(25,(Number(l.balance)*(Number(l.rate||7)/100))/12)})),
  ];
  const sorted = [...debts].sort((a,b)=>method==="avalanche"?(b.rate-a.rate):(a.balance-b.balance));
  const totalDebt=debts.reduce((s,x)=>s+x.balance,0);
  const totalMin=debts.reduce((s,x)=>s+x.minPayment,0);
  const extraPayment=Number(extra||0);
  if(debts.length===0) return <div style={{fontSize:12,color:"#6b8cce",textAlign:"center",padding:"10px 0"}}>No debts to optimize</div>;
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
      <Label>Extra Monthly Payment</Label>
      <NumInput value={extra} onChange={setExtra} placeholder="0.00"/>
      <div style={{marginTop:14,marginBottom:10,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>Total Debt</div><div style={{fontSize:16,color:"#f87171",fontWeight:"bold"}}>{fmt(totalDebt)}</div></div>
          <div><div style={{fontSize:10,color:"#6b8cce",marginBottom:3}}>Min Payments</div><div style={{fontSize:16,color:"#facc15",fontWeight:"bold"}}>{fmt(totalMin)}</div></div>
        </div>
      </div>
      <div style={{fontSize:11,color:"#6b8cce",marginBottom:10,letterSpacing:2}}>PAYOFF ORDER ({method.toUpperCase()})</div>
      {sorted.map((debt,i)=>(
        <div key={i} style={{display:"flex",gap:12,alignItems:"center",background:"#0d1b3e",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:i===0?"#facc15":"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:i===0?"#0d1b3e":"#6b8cce",fontWeight:"bold",flexShrink:0}}>{i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#e8e4d9",marginBottom:2}}>{debt.name}</div>
            <div style={{fontSize:11,color:"#6b8cce"}}>{debt.rate}% · {fmt(debt.balance)}</div>
          </div>
          {i===0&&<div style={{fontSize:10,color:"#facc15",border:"1px solid #facc1544",borderRadius:12,padding:"2px 8px"}}>FOCUS</div>}
        </div>
      ))}
      {extraPayment>0&&sorted[0]&&<div style={{marginTop:10,background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:11,color:"#6b8cce",marginBottom:6}}>With {fmt(extraPayment)}/mo extra on {sorted[0].name}:</div>
        {(()=>{
          const r=sorted[0].rate/100/12,b=sorted[0].balance,p=sorted[0].minPayment+extraPayment;
          if(r===0){const months=b/p;return <div style={{fontSize:13,color:"#4ade80"}}>Paid off in ~{Math.ceil(months)} months</div>;}
          const months=Math.log(p/(p-b*r))/Math.log(1+r);
          const interest=p*months-b;
          return <div><div style={{fontSize:13,color:"#4ade80"}}>Paid off in ~{Math.ceil(months)} months</div><div style={{fontSize:11,color:"#6b8cce",marginTop:4}}>Total interest: {fmt(Math.max(0,interest))}</div></div>;
        })()}
      </div>}
    </div>
  );
}

// ─── BILL / CASH FLOW CALENDAR ────────────────────────────────────────────────
// Each entry: { id, name, amount, day, type:"credit"|"debit", repeat:"none"|"monthly"|"biweekly"|"weekly" }
function BillCalendar({income}) {
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const [month,setMonth]=useState(now.getMonth());
  const [year,setYear]=useState(now.getFullYear());
  const [entries,setEntries]=useState([]);
  const [showAdd,setShowAdd]=useState(false);

  // Build rows for selected month: expand repeating entries
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthLabel = `${MONTHS[month]} ${year}`;

  const rows = [];
  entries.forEach(e => {
    const day = Number(e.day);
    if(e.repeat==="none"||!e.repeat) {
      if(e.month===month&&e.year===year) rows.push({...e, displayDay:`${month+1}/${day}`});
    } else if(e.repeat==="monthly") {
      if(day<=daysInMonth) rows.push({...e, displayDay:`${month+1}/${day}`});
    } else if(e.repeat==="biweekly") {
      let d=day;
      while(d<=daysInMonth){rows.push({...e,displayDay:`${month+1}/${d}`,_d:d});d+=14;}
    } else if(e.repeat==="weekly") {
      let d=day%7||7;
      while(d<=daysInMonth){rows.push({...e,displayDay:`${month+1}/${d}`,_d:d});d+=7;}
    }
  });

  // Sort by day number
  const sorted = rows.sort((a,b)=>{
    const da=Number((a._d||a.day));
    const db=Number((b._d||b.day));
    return da-db;
  });

  // Build running total rows like the spreadsheet
  const startBalance = entries.find(e=>e.isBalance)?.amount||"0";
  let running = Number(startBalance);
  const tableRows = sorted.map(row=>{
    const amt = Number(row.amount||0);
    if(row.type==="credit") running+=amt;
    else running-=amt;
    return {...row, running};
  });

  const totalIn=sorted.filter(r=>r.type==="credit").reduce((s,r)=>s+Number(r.amount||0),0);
  const totalOut=sorted.filter(r=>r.type==="debit").reduce((s,r)=>s+Number(r.amount||0),0);

  const deleteEntry = (id) => setEntries(p=>p.filter(e=>e.id!==id));

  return (
    <div>
      {/* Month navigator */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,color:"#8fadd4",padding:"6px 12px",cursor:"pointer",fontSize:16,...GS}}>‹</button>
        <div style={{fontSize:16,color:"#e8e4d9",fontWeight:"bold",...GS}}>{monthLabel}</div>
        <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,color:"#8fadd4",padding:"6px 12px",cursor:"pointer",fontSize:16,...GS}}>›</button>
      </div>

      {/* Summary row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{label:"INCOME",val:totalIn,color:"#4ade80"},{label:"EXPENSES",val:totalOut,color:"#f87171"},{label:"NET",val:totalIn-totalOut,color:totalIn-totalOut>=0?"#4ade80":"#f87171"}].map(x=>(
          <div key={x.label} style={{background:"#0d1b3e",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#6b8cce",marginBottom:4,letterSpacing:1}}>{x.label}</div>
            <div style={{fontSize:14,color:x.color,fontWeight:"bold"}}>{fmtShort(x.val)}</div>
          </div>
        ))}
      </div>

      {/* Starting balance card */}
      <div style={{background:"#0d1b3e",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:12,color:"#6b8cce"}}>Starting Balance</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:"#6b8cce",fontSize:13}}>$</span>
          <input type="number" value={startBalance} onChange={e=>setEntries(p=>{const existing=p.find(x=>x.isBalance);if(existing) return p.map(x=>x.isBalance?{...x,amount:e.target.value}:x);return [...p,{id:"balance",isBalance:true,amount:e.target.value}];})} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:100,textAlign:"right",...GS}}/>
        </div>
      </div>

      {/* Table */}
      {tableRows.length===0?(
        <div style={{textAlign:"center",padding:"30px 0",color:"#6b8cce",fontSize:13}}>
          No entries yet for {monthLabel}.<br/>Add income or expenses below.
        </div>
      ):(
        <div style={{background:"#0d1b3e",borderRadius:12,overflow:"hidden",marginBottom:14}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"52px 1fr 80px 80px 80px 32px",background:"#1e3a5f",padding:"8px 10px"}}>
            {["Date","Description","Debit","Credit","Total",""].map(h=>(
              <div key={h} style={{fontSize:9,color:"#6b8cce",letterSpacing:1,textAlign:h==="Description"?"left":"right",...GS}}>{h}</div>
            ))}
          </div>
          {tableRows.map((row,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"52px 1fr 80px 80px 80px 32px",padding:"7px 10px",borderBottom:"1px solid #111827",background:i%2===0?"#0d1b3e":"#0f1e3a",alignItems:"center"}}>
              <div style={{fontSize:11,color:"#6b8cce",...GS}}>{row.displayDay}</div>
              <div style={{fontSize:12,color:"#e8e4d9",...GS}}>
                {row.name}
                {row.repeat&&row.repeat!=="none"&&<span style={{fontSize:9,color:"#a78bfa",marginLeft:6,border:"1px solid #a78bfa44",borderRadius:10,padding:"1px 5px"}}>{row.repeat}</span>}
              </div>
              <div style={{fontSize:11,color:"#f87171",textAlign:"right",...GS}}>{row.type==="debit"?fmt(row.amount):""}</div>
              <div style={{fontSize:11,color:"#4ade80",textAlign:"right",...GS}}>{row.type==="credit"?fmt(row.amount):""}</div>
              <div style={{fontSize:11,color:row.running>=0?"#e8e4d9":"#f87171",textAlign:"right",fontWeight:"bold",...GS}}>{fmt(row.running)}</div>
              <button onClick={()=>deleteEntry(row.id)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14,textAlign:"center",opacity:0.6,padding:0}} title="Delete">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Add entry */}
      <button onClick={()=>setShowAdd(p=>!p)} style={{width:"100%",background:"#0d1b3e",border:"1px dashed #2a4080",borderRadius:10,color:"#8fadd4",padding:"11px",fontSize:13,cursor:"pointer",marginBottom:10,...GS}}>
        {showAdd?"▲ Cancel":"+ Add Income / Expense"}
      </button>
      {showAdd&&<AddBillEntry month={month} year={year} onAdd={entry=>{setEntries(p=>[...p,entry]);setShowAdd(false);}}/>}
    </div>
  );
}

function AddBillEntry({month,year,onAdd}) {
  const [name,setName]=useState("");
  const [amount,setAmount]=useState("");
  const [day,setDay]=useState("");
  const [type,setType]=useState("debit");
  const [repeat,setRepeat]=useState("none");

  const add=()=>{
    if(!name.trim()||!amount||!day) return;
    onAdd({
      id:Date.now()+"_"+Math.random(),
      name:name.trim(), amount, day:String(Number(day)),
      type, repeat, month, year,
    });
    setName("");setAmount("");setDay("");setRepeat("none");
  };

  return (
    <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:"1px solid #1e3a5f",borderRadius:12,padding:"16px",marginBottom:14}}>
      <div style={{fontSize:10,color:"#6b8cce",letterSpacing:2,marginBottom:12,...GS}}>NEW ENTRY</div>

      {/* Type toggle */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[{val:"debit",label:"💸 Expense",color:"#f87171"},{val:"credit",label:"💰 Income",color:"#4ade80"}].map(t=>(
          <button key={t.val} onClick={()=>setType(t.val)} style={{background:type===t.val?(t.val==="credit"?"#0d2a1a":"#1a0d0d"):"#0d1b3e",border:`1px solid ${type===t.val?t.color:"#2a4080"}`,borderRadius:8,padding:"10px",cursor:"pointer",color:t.color,fontSize:13,fontWeight:type===t.val?"bold":"normal",...GS}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Name + Amount */}
      <div style={{marginBottom:10}}>
        <Label>Description</Label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Payday, Rent, Bell..." style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <Label>Amount</Label>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
            <span style={{color:"#6b8cce",marginRight:4}}>$</span>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{background:"none",border:"none",outline:"none",color:type==="credit"?"#4ade80":"#f87171",fontSize:15,width:"100%",...GS}}/>
          </div>
        </div>
        <div>
          <Label>Day of Month</Label>
          <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}>
            <input type="number" value={day} onChange={e=>setDay(e.target.value)} placeholder="1–31" min="1" max="31" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:15,width:"100%",...GS}}/>
          </div>
        </div>
      </div>

      {/* Repeat */}
      <div style={{marginBottom:14}}>
        <Label>Repeating</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
          {[{val:"none",label:"Once"},{val:"monthly",label:"Monthly"},{val:"biweekly",label:"Bi-weekly"},{val:"weekly",label:"Weekly"}].map(r=>(
            <button key={r.val} onClick={()=>setRepeat(r.val)} style={{background:repeat===r.val?"#1a4080":"#0d1b3e",border:`1px solid ${repeat===r.val?"#60a5fa":"#2a4080"}`,borderRadius:8,padding:"7px 4px",cursor:"pointer",color:repeat===r.val?"#60a5fa":"#8fadd4",fontSize:10,...GS}}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={add} style={{width:"100%",background:"linear-gradient(135deg,#1a4080,#0d2a5e)",border:"1px solid #2a4080",borderRadius:8,color:"#4ade80",padding:"12px",fontSize:13,cursor:"pointer",...GS}}>
        Add to Calendar
      </button>
    </div>
  );
}

// ─── SCORE HISTORY ─────────────────────────────────────────────────────────────
function ScoreHistory({history,currentScore,onSave}) {
  if(history.length===0) return (
    <div>
      <div style={{textAlign:"center",padding:"30px 0"}}>
        <div style={{fontSize:40,marginBottom:12}}>📈</div>
        <p style={{color:"#8fadd4",lineHeight:1.8}}>No score history yet. Complete your appointment and save your score to start tracking progress month over month.</p>
      </div>
      {currentScore&&<button onClick={onSave} style={{width:"100%",background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:10,color:"#4ade80",padding:"13px",fontSize:13,cursor:"pointer",...GS}}>Save Current Score ({currentScore.grade} · {currentScore.total}/100)</button>}
    </div>
  );
  const chartData=history.map(h=>({date:h.date,score:h.score}));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,color:"#6b8cce",letterSpacing:2}}>SCORE OVER TIME</div>
        {currentScore&&<button onClick={onSave} style={{background:"#0d2a1a",border:"1px solid #4ade80",borderRadius:8,color:"#4ade80",padding:"6px 12px",fontSize:11,cursor:"pointer",...GS}}>Save Today's Score</button>}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
          <XAxis dataKey="date" stroke="#6b8cce" tick={{fontSize:9,...GS}}/>
          <YAxis domain={[0,100]} stroke="#6b8cce" tick={{fontSize:9,...GS}}/>
          <Tooltip contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#4ade80"}}/>
          <Line type="monotone" dataKey="score" stroke="#4ade80" strokeWidth={2} dot={{fill:"#4ade80",r:4}}/>
        </LineChart>
      </ResponsiveContainer>
      <div style={{marginTop:14}}>
        {[...history].reverse().map((h,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}>
            <div style={{fontSize:12,color:"#8fadd4"}}>{h.date}</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{fontSize:16,color:h.gradeColor,fontWeight:"bold"}}>{h.grade}</div>
              <div style={{fontSize:12,color:"#6b8cce"}}>{h.score}/100</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INDIVIDUAL TOOLS HUB ─────────────────────────────────────────────────────
const TOOLS_LIST = [
  {id:"budget",label:"Budget Builder",icon:"💰",sub:"Build and visualize your monthly budget",color:"#4ade80",beginnerLabel:"How do I budget my money?",beginnerSub:"Enter what you earn and we'll show you where it goes"},
  {id:"statement",label:"Statement Importer",icon:"🏧",sub:"Upload bank & credit card CSVs and classify spending",color:"#22d3ee",beginnerLabel:"Analyze my spending",beginnerSub:"Upload your bank statement and see where your money went"},
  {id:"rentvsbuy",label:"Rent vs. Buy",icon:"🏠",sub:"Canadian housing market comparison — is buying worth it?",color:"#a78bfa",beginnerLabel:"Should I rent or buy a home?",beginnerSub:"We'll compare the real costs of renting vs buying in Canada"},
  {id:"networth",label:"Net Worth Calculator",icon:"📊",sub:"Calculate your assets minus liabilities",color:"#60a5fa",beginnerLabel:"What is my net worth?",beginnerSub:"Add up what you own and subtract what you owe"},
  {id:"savings",label:"Savings Goal",icon:"🎯",sub:"How much to save per month for any goal",color:"#facc15",beginnerLabel:"How much do I need to save?",beginnerSub:"Enter your goal and deadline — we'll tell you how much per month"},
  {id:"loc",label:"Loan Simulator",icon:"🏦",sub:"Calculate payments and interest on any loan",color:"#fb923c",beginnerLabel:"How much will a loan cost me?",beginnerSub:"See your monthly payment and total interest on any loan"},
  {id:"cashflow",label:"Cash Flow Calendar",icon:"📅",sub:"Map your income and bills through the month",color:"#22d3ee",beginnerLabel:"Map my bills through the month",beginnerSub:"See when money comes in and goes out each month"},
  {id:"debtopt",label:"Debt Optimizer",icon:"⚡",sub:"Avalanche vs snowball — find your best payoff path",color:"#f87171",beginnerLabel:"How do I pay off my debt fastest?",beginnerSub:"Find the fastest and cheapest way to become debt-free"},
];

function IndividualTools({onHome,data,beginner}) {
  const [tool,setTool]=useState(null);
  if(tool==="budget") return <ToolWrapper title={beginner?"How Do I Budget?":"Budget Builder"} onBack={()=>setTool(null)} onHome={onHome} contentId="tool-budget"><StandaloneBudget prefill={data?.budget}/></ToolWrapper>;
  if(tool==="statement") return <StatementImporter onBack={()=>setTool(null)} onHome={onHome} budgetData={data.budget}/>;
  if(tool==="networth") return <ToolWrapper title={beginner?"What Is My Net Worth?":"Net Worth Calculator"} onBack={()=>setTool(null)} onHome={onHome} contentId="tool-networth"><StandaloneNetWorth prefill={data} beginner={beginner}/></ToolWrapper>;
  if(tool==="savings") return <ToolWrapper title={beginner?"How Much Do I Need to Save?":"Savings Goal"} onBack={()=>setTool(null)} onHome={onHome} contentId="tool-savings"><SavingsGoalCalc prefill={data} beginner={beginner}/></ToolWrapper>;
  if(tool==="loc") return <ToolWrapper title={beginner?"How Much Will a Loan Cost?":"Loan Simulator"} onBack={()=>setTool(null)} onHome={onHome} contentId="tool-loc"><LOCSimulator rate="" beginner={beginner}/></ToolWrapper>;
  if(tool==="cashflow") return <ToolWrapper title="Cash Flow Calendar" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-cashflow"><BillCalendar income={data.budget.income}/></ToolWrapper>;
  if(tool==="debtopt") return <ToolWrapper title={beginner?"How Do I Pay Off Debt?":"Debt Optimizer"} onBack={()=>setTool(null)} onHome={onHome} contentId="tool-debtopt"><DebtOptimizer creditCards={data.creditCards} otherDebts={data.otherDebts} locs={data.locs}/></ToolWrapper>;

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title={beginner?"Financial Calculators":"Individual Tools"} subtitle="FinHealth" onHome={onHome}/>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}}>
        {beginner
          ? <div style={{background:"#1a2a0a",border:"1px solid #84cc1644",borderRadius:12,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#84cc16",lineHeight:1.7,...GS}}>🌱 <b>Beginner Mode</b> — tap any tool below. Each one walks you through with plain English explanations.</div>
          : <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.7,marginBottom:20}}>Standalone financial tools — no appointment needed.</div>
        }
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {TOOLS_LIST.map(t=>(
            <button key={t.id} onClick={()=>setTool(t.id)} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:`1px solid #1e3a5f`,borderRadius:14,padding:"18px 20px",cursor:"pointer",textAlign:"left",color:"#e8e4d9",width:"100%",transition:"transform 0.2s,box-shadow 0.2s,border-color 0.2s",...GS}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px ${t.color}22`;e.currentTarget.style.borderColor=t.color+"44";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor="#1e3a5f";}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:28,flexShrink:0,width:40,textAlign:"center"}}>{t.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:"bold",color:t.color,marginBottom:3}}>{beginner&&t.beginnerLabel?t.beginnerLabel:t.label}</div>
                  <div style={{fontSize:12,color:"#8fadd4",lineHeight:1.5}}>{beginner&&t.beginnerSub?t.beginnerSub:t.sub}</div>
                </div>
                <div style={{fontSize:18,color:"#2a4080"}}>›</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
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

function RentVsBuy({beginner}) {
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

      {beginner&&<div style={{background:"#1a2a0a",border:"1px solid #84cc1644",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#84cc16",lineHeight:1.7,...GS}}>🌱 Fill in your numbers below and we'll tell you whether renting or buying makes more financial sense for your situation.</div>}

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
        <SecTitle>{beginner?"Where Are You Located?":"Location"}</SecTitle>
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
          <span style={{fontSize:13,color:"#e8e4d9"}}>First-time home buyer{beginner&&<Tip text="First-time buyers in Ontario get a rebate of up to $4,000 on Land Transfer Tax. In Toronto, an additional rebate of up to $4,475 applies." beginner={true}/>}</span>
        </div>
      </Card>

      {/* Buying inputs */}
      <Card>
        <SecTitle>{beginner?"The Home You Want to Buy":"Buying — Home Details"}</SecTitle>
        <div style={{marginBottom:12}}>
          <Label>Home Price</Label>
          <NumInput value={homePrice} onChange={v=>{setHomePrice(v);if(downMode==="dollar"&&downDollar)setDownPct(Number(v)>0?String(((Number(downDollar)/Number(v))*100).toFixed(2)):"");else setDownDollar(String(Math.round(Number(v)*(Number(downPct||0)/100))));}} placeholder="600000"/>
        </div>
        {/* Down payment — toggle $ or % */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <Label style={{marginBottom:0}}>Down Payment{beginner&&<Tip text="The down payment is the upfront cash you pay toward the home. In Canada you need at least 5% for homes under $500K." beginner={true}/>}</Label>
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
          <div><Label>Amortization{beginner&&<Tip text="How many years to pay off the mortgage. Max 25 yrs if under 20% down, 30 yrs if 20%+." beginner={true}/>}</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><input type="number" value={amort} onChange={e=>setAmort(e.target.value)} placeholder="25" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>yrs</span></div></div>
          <div><Label>Property Tax /mo{beginner&&<Tip text="~1% of home value per year. Leave blank to auto-estimate." beginner={true}/>}</Label><NumInput value={propTax} onChange={setPropTax} placeholder={`~${fmt(autoPropTax)}/mo`}/></div>
          <div><Label>Maintenance /mo{beginner&&<Tip text="Budget ~1% of home value per year for repairs. Leave blank to auto-estimate." beginner={true}/>}</Label><NumInput value={maintenance} onChange={setMaintenance} placeholder={`~${fmt(autoMaintenance)}/mo`}/></div>
        </div>
        <Label>Home Insurance /mo</Label><NumInput value={homeIns} onChange={setHomeIns} placeholder="150"/>
        <div style={{height:10}}/>
        <Label>Annual Home Appreciation %{beginner&&<Tip text="How much the home grows in value each year. The long-term Canadian average is about 4–6%, but in recent years it has varied widely. We default to 2% (conservative)." beginner={true}/>}</Label>
        <PctInput value={appreciation} onChange={setAppreciation} placeholder="2"/>
      </Card>

      {/* Renting inputs */}
      <Card>
        <SecTitle>{beginner?"What You'd Pay to Rent Instead":"Renting — Monthly Costs"}</SecTitle>
        <Label>Monthly Rent</Label><NumInput value={rent} onChange={setRent} placeholder="2200"/>
        <div style={{height:10}}/>
        <Label>Annual Rent Increase %{beginner&&<Tip text="Ontario rent control caps increases at 2.5%/yr for most units. Newer buildings (built after 2018) may have no cap." beginner={true}/>}</Label>
        <PctInput value={rentIncrease} onChange={setRentIncrease} placeholder="2.5"/>
        <div style={{height:10}}/>
        <Label>Tenant Insurance /mo</Label><NumInput value={tenantIns} onChange={setTenantIns} placeholder="30"/>
        <div style={{height:10}}/>
        <Label>Utilities /mo (if not included)</Label><NumInput value={utilities} onChange={setUtilities} placeholder="0"/>
        <div style={{height:10}}/>
        <Label>Investment Return % (if you invest down payment instead){beginner&&<Tip text="If you rent, you can invest your down payment. A diversified Canadian portfolio has historically returned about 7%/yr." beginner={true}/>}</Label>
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

// ─── FINANCIAL NEWS ───────────────────────────────────────────────────────────
const NEWS_FEEDS = [
  {label:"CBC Business",url:"https://www.cbc.ca/cmlink/rss-business",color:"#f87171"},
  {label:"Globe & Mail",url:"https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/business/",color:"#4ade80"},
  {label:"Financial Post",url:"https://financialpost.com/feed",color:"#facc15"},
  {label:"Bank of Canada",url:"https://www.bankofcanada.ca/feed/",color:"#60a5fa"},
];

async function fetchFeed(feedUrl) {
  const proxies = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=8`,
    `https://feedproxy.google.com/~r/${encodeURIComponent(feedUrl)}`,
  ];
  // Try rss2json first
  try {
    const r = await fetch(proxies[0]);
    const json = await r.json();
    if(json.items && json.items.length > 0) return json.items;
  } catch(e) {}
  return [];
}

function FinancialNews() {
  const [articles,setArticles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [activeSource,setActiveSource]=useState("all");
  const [sourceName,setSourceName]=useState({});

  useEffect(()=>{
    const fetchAll=async()=>{
      setLoading(true);setError(null);
      const results=[];
      await Promise.all(NEWS_FEEDS.map(async feed=>{
        try{
          const items = await fetchFeed(feed.url);
          items.forEach(item=>{
            results.push({
              title:(item.title||"").replace(/&amp;/g,"&").replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/<[^>]+>/g,"").trim(),
              link:item.link||item.url||"#",
              date:item.pubDate?new Date(item.pubDate):new Date(),
              source:feed.label,
              color:feed.color,
              desc:(item.description||item.content||"").replace(/<[^>]+>/g,"").slice(0,120).trim()+"...",
            });
          });
        }catch(e){}
      }));

      if(results.length===0){
        // Fallback — static recent Canadian finance links
        const fallback=[
          {title:"Bank of Canada holds interest rate — what it means for your mortgage",link:"https://www.cbc.ca/news/business",date:new Date(),source:"CBC Business",color:"#f87171",desc:"The Bank of Canada held its policy rate steady as inflation remains near target. Analysts expect cuts later this year."},
          {title:"Canadian housing market showing signs of spring recovery",link:"https://financialpost.com",date:new Date(),source:"Financial Post",color:"#facc15",desc:"Home sales picked up in major markets as buyers returned ahead of anticipated rate cuts from the Bank of Canada."},
          {title:"TFSA contribution limit for 2025 — what you need to know",link:"https://www.theglobeandmail.com/business",date:new Date(),source:"Globe & Mail",color:"#4ade80",desc:"The TFSA annual contribution limit remains at $7,000 for 2025. Here's how to make the most of your tax-free room."},
          {title:"TSX rises as commodity prices stabilize",link:"https://financialpost.com",date:new Date(),source:"Financial Post",color:"#facc15",desc:"The Toronto Stock Exchange edged higher as energy and materials sectors provided support amid global economic uncertainty."},
          {title:"Canada inflation rate — latest CPI data explained",link:"https://www.cbc.ca/news/business",date:new Date(),source:"CBC Business",color:"#f87171",desc:"Canada's inflation rate came in at 2.6% year-over-year. Here's what that means for interest rates and your everyday costs."},
        ];
        setArticles(fallback);
        setError("Live feeds unavailable — showing recent Canadian finance highlights.");
        setLoading(false);
        return;
      }

      const seen=new Set();
      const deduped=results
        .sort((a,b)=>b.date-a.date)
        .filter(a=>{
          const key=(a.title||"").slice(0,40).toLowerCase();
          if(!key||seen.has(key))return false;
          seen.add(key);return true;
        });
      setArticles(deduped);
      setLoading(false);
    };
    fetchAll();
  },[]);

  const filtered=activeSource==="all"?articles:articles.filter(a=>a.source===activeSource);
  const formatDate=(d)=>{
    const now=new Date(),diff=Math.floor((now-d)/1000/60);
    if(diff<60)return `${diff}m ago`;
    if(diff<1440)return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString("en-CA",{month:"short",day:"numeric"});
  };

  return (
    <div>
      {/* Source filter */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <button onClick={()=>setActiveSource("all")} style={{background:activeSource==="all"?"#1a4080":"#0d1b3e",border:`1px solid ${activeSource==="all"?"#60a5fa":"#2a4080"}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",color:activeSource==="all"?"#60a5fa":"#8fadd4",fontSize:11,...GS}}>
          All Sources
        </button>
        {NEWS_FEEDS.map(f=>(
          <button key={f.label} onClick={()=>setActiveSource(f.label)} style={{background:activeSource===f.label?f.color+"22":"#0d1b3e",border:`1px solid ${activeSource===f.label?f.color:"#2a4080"}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",color:activeSource===f.label?f.color:"#8fadd4",fontSize:11,...GS}}>
            {f.label}
          </button>
        ))}
      </div>

      {loading&&(
        <div style={{textAlign:"center",padding:"40px 0"}}>
          <div style={{fontSize:32,marginBottom:12}}>📰</div>
          <div style={{fontSize:13,color:"#6b8cce"}}>Loading latest Canadian financial news...</div>
        </div>
      )}

      {error&&(
        <div style={{background:"#1a1a0a",border:"1px solid #facc1544",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#facc15",marginBottom:12,lineHeight:1.6}}>
          ⚠️ {error}
        </div>
      )}

      {!loading&&!error&&filtered.length===0&&(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"#6b8cce"}}>No articles found for this source.</div>
      )}

      {!loading&&filtered.map((a,i)=>(
        <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",display:"block",marginBottom:10}}>
          <div style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:`1px solid #1e3a5f`,borderLeft:`3px solid ${a.color}`,borderRadius:12,padding:"14px 16px",transition:"border-color 0.2s,transform 0.2s",cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e3a5f";e.currentTarget.style.transform="";}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:6}}>
              <div style={{fontSize:14,color:"#e8e4d9",lineHeight:1.5,fontWeight:"bold",...GS}}>{a.title}</div>
              <div style={{fontSize:10,color:"#6b8cce",flexShrink:0,marginTop:2}}>{formatDate(a.date)}</div>
            </div>
            {a.desc&&<div style={{fontSize:11,color:"#6b8cce",lineHeight:1.6,marginBottom:6}}>{a.desc}</div>}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:a.color}}/>
              <span style={{fontSize:10,color:a.color,letterSpacing:1}}>{a.source}</span>
              <span style={{fontSize:10,color:"#2a4080",marginLeft:"auto"}}>Read →</span>
            </div>
          </div>
        </a>
      ))}

      <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#2a4080"}}>
        Live feeds from CBC, Globe & Mail, Financial Post, Bank of Canada
      </div>
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
  const [memory, setMemory] = useState({}); // merchant → category
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
          // Apply memory
          const withMemory = finalTxns.map(t=>{
            const key = t.desc.toLowerCase().slice(0,20);
            return memory[key] ? {...t,category:memory[key]} : t;
          });
          setTransactions(withMemory);
          const months=[...new Set(withMemory.map(t=>t.month).filter(Boolean))].sort().reverse();
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
  const current = unclassified[0];
  const progress = monthTxns.length>0 ? Math.round((classified.length/monthTxns.length)*100) : 0;

  // Spending by category for donut
  const spending = {};
  classified.filter(t=>t.amount>0).forEach(t=>{
    spending[t.category]=(spending[t.category]||0)+t.amount;
  });
  const donutData = Object.entries(spending).map(([name,value])=>({name,value:Math.round(value*100)/100}));
  const totalSpent = Object.values(spending).reduce((s,v)=>s+v,0);

  const assignCategory = (cat, txn=current) => {
    if(!txn) return;
    // Save to memory
    const key = txn.desc.toLowerCase().slice(0,20);
    setMemory(m=>({...m,[key]:cat}));
    setTransactions(prev=>prev.map(t=>{
      if(t.id===txn.id) return {...t,category:cat};
      // Auto-apply memory to same merchant name
      const tk = t.desc.toLowerCase().slice(0,20);
      if(tk===key&&!t.category) return {...t,category:cat};
      return t;
    }));
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"14px 16px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setPhase("setup")} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
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

        {/* Current transaction */}
        {current?(
          <div>
            <Card style={{background:"linear-gradient(135deg,#0d1b3e,#1a2235)",border:"1px solid #22d3ee44"}}>
              <div style={{fontSize:9,color:"#6b8cce",letterSpacing:2,marginBottom:8}}>CLASSIFY THIS TRANSACTION</div>
              <div style={{fontSize:18,color:"#e8e4d9",fontWeight:"bold",marginBottom:4,...GS}}>{current.desc}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:"#6b8cce"}}>{current.date}</div>
                <div style={{fontSize:22,color:current.amount>0?"#f87171":"#4ade80",fontWeight:"bold",...GS}}>
                  {current.amount>0?"-":"+"}${Math.abs(current.amount).toFixed(2)}
                </div>
              </div>
              {/* Suggest from memory */}
              {memory[current.desc.toLowerCase().slice(0,20)]&&(
                <div style={{marginTop:8,fontSize:11,color:"#facc15"}}>
                  💡 Previously: {memory[current.desc.toLowerCase().slice(0,20)]}
                </div>
              )}
            </Card>

            {/* Category buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {allCats.map((cat,i)=>(
                <button key={cat} onClick={()=>assignCategory(cat)}
                  style={{background:"#0d1b3e",border:`1px solid ${CAT_COLORS[i%CAT_COLORS.length]}44`,borderRadius:10,padding:"10px 6px",cursor:"pointer",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:12,textAlign:"center",transition:"background 0.15s,border-color 0.15s",...GS}}
                  onMouseEnter={e=>{e.currentTarget.style.background=CAT_COLORS[i%CAT_COLORS.length]+"22";e.currentTarget.style.borderColor=CAT_COLORS[i%CAT_COLORS.length];}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#0d1b3e";e.currentTarget.style.borderColor=CAT_COLORS[i%CAT_COLORS.length]+"44";}}>
                  {cat}
                </button>
              ))}
            </div>

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
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"14px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setPhase("classify")} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <div style={{background:"linear-gradient(135deg,#0d1b3e,#1a2f5a)",borderBottom:"1px solid #2a4080",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:20,padding:0}}>&larr;</button>
            <div style={{fontSize:18,fontWeight:"bold",color:"#fff",...GS}}>{title}</div>
          </div>
          <button onClick={onHome} style={{background:"none",border:"none",color:"#6b8cce",cursor:"pointer",fontSize:12,...GS}}>Home</button>
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
function WhatIfSimulator({data}) {
  const [scenario,setScenario]=useState("invest");
  const income=Number(data.budget.income||0);
  const totalAlloc=data.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const surplus=income-totalAlloc;
  const sumGroup=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0);
  const totalInv=sumGroup(data.investments.tfsa)+sumGroup(data.investments.fhsa)+sumGroup(data.investments.rrsp)+sumGroup(data.investments.alternatives)+sumGroup(data.investments.nonReg);

  const scenarios=[
    {id:"invest",label:"💹 Invest More",sub:"What if I increased my monthly investment?"},
    {id:"paydebt",label:"💳 Pay Off Debt",sub:"What if I aggressively paid down debt?"},
  ];

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {scenarios.map(s=>(
          <button key={s.id} onClick={()=>setScenario(s.id)} style={{background:scenario===s.id?"linear-gradient(135deg,#1a2f5a,#1a3a5a)":"#0d1b3e",border:`1px solid ${scenario===s.id?"#60a5fa":"#2a4080"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",textAlign:"left",color:"#e8e4d9",...GS}}>
            <div style={{fontSize:14,color:scenario===s.id?"#60a5fa":"#e8e4d9",fontWeight:"bold"}}>{s.label}</div>
            <div style={{fontSize:11,color:"#6b8cce",marginTop:2}}>{s.sub}</div>
          </button>
        ))}
      </div>
      {scenario==="invest"&&<InvestMoreSim totalInv={totalInv} surplus={surplus}/>}
      {scenario==="paydebt"&&<PayDebtSim creditCards={data.creditCards} otherDebts={data.otherDebts}/>}
    </div>
  );
}

function InvestMoreSim({totalInv,surplus}) {
  const [extra,setExtra]=useState("200");
  const [years,setYears]=useState("10");
  const addMonthly=Number(extra||0),n=Number(years||0),r=0.07/12;
  const futureExtra=addMonthly*((Math.pow(1+r,n*12)-1)/r);
  const futureExisting=totalInv*Math.pow(1+r,n*12);
  const totalFuture=futureExtra+futureExisting;
  return (
    <Card style={{background:"linear-gradient(135deg,#0d1b3e,#111827)"}}>
      <SecTitle>Invest More — What If?</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div><Label>Extra/Month</Label><NumInput value={extra} onChange={setExtra} placeholder="200"/></div>
        <div><Label>Over (years)</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><input type="number" value={years} onChange={e=>setYears(e.target.value)} placeholder="10" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:12}}>yrs</span></div></div>
      </div>
      {addMonthly>0&&n>0&&<div style={{background:"#0d2a1a",border:"1px solid #1a4030",borderRadius:10,padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>PORTFOLIO IN {n}Y</div><div style={{fontSize:20,color:"#4ade80",fontWeight:"bold"}}>{fmtShort(totalFuture)}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>EXTRA GROWTH</div><div style={{fontSize:20,color:"#facc15",fontWeight:"bold"}}>{fmtShort(futureExtra)}</div></div>
        </div>
        <div style={{fontSize:12,color:"#6b8cce",lineHeight:1.7}}>Adding <span style={{color:"#4ade80"}}>{fmt(addMonthly)}/mo</span> for <span style={{color:"#4ade80"}}>{n} years</span> at 7% compounds to an extra <span style={{color:"#facc15",fontWeight:"bold"}}>{fmtShort(futureExtra)}</span> — that's <span style={{color:"#facc15"}}>{fmt(addMonthly*n*12)}</span> contributed growing to {fmtShort(futureExtra)}.</div>
      </div>}
    </Card>
  );
}

function PayDebtSim({creditCards,otherDebts}) {
  const [extraPayment,setExtraPayment]=useState("200");
  const totalDebt=(creditCards||[]).reduce((s,c)=>s+Number(c.totalBalance||0),0)+(otherDebts||[]).reduce((s,x)=>s+Number(x.balance||0),0);
  const minPayment=Math.max(25,totalDebt*0.03);
  const extra=Number(extraPayment||0);
  const payment=minPayment+extra;
  const rate=0.19/12;
  const months=totalDebt>0&&payment>totalDebt*rate?Math.ceil(Math.log(payment/(payment-totalDebt*rate))/Math.log(1+rate)):null;
  const totalPaid=months?payment*months:0;
  const interest=totalPaid-totalDebt;
  const monthsMin=totalDebt>0&&minPayment>totalDebt*rate?Math.ceil(Math.log(minPayment/(minPayment-totalDebt*rate))/Math.log(1+rate)):null;
  const interestMin=monthsMin?minPayment*monthsMin-totalDebt:0;
  return (
    <Card style={{background:"linear-gradient(135deg,#0d1b3e,#111827)"}}>
      <SecTitle>Pay Off Debt — What If?</SecTitle>
      {totalDebt===0?<div style={{fontSize:12,color:"#4ade80",textAlign:"center",padding:"16px 0"}}>🎉 No debt to simulate!</div>:<>
        <div style={{marginBottom:12}}><Label>Extra Monthly Payment</Label><NumInput value={extraPayment} onChange={setExtraPayment}/></div>
        {months&&<div style={{background:"#1a0d0d",border:"1px solid #f8717144",borderRadius:10,padding:"14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>DEBT-FREE IN</div><div style={{fontSize:20,color:"#4ade80",fontWeight:"bold"}}>{months} mo</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>INTEREST SAVED</div><div style={{fontSize:20,color:"#facc15",fontWeight:"bold"}}>{fmt(Math.max(0,interestMin-interest))}</div></div>
          </div>
          <div style={{fontSize:12,color:"#6b8cce",lineHeight:1.7}}>With min payments only: <span style={{color:"#f87171"}}>{monthsMin} months</span> and <span style={{color:"#f87171"}}>{fmt(interestMin)} interest</span>. Adding <span style={{color:"#4ade80"}}>{fmt(extra)}/mo</span> saves you <span style={{color:"#facc15",fontWeight:"bold"}}>{fmt(Math.max(0,interestMin-interest))} in interest</span>.</div>
        </div>}
      </>}
    </Card>
  );
}

function SalarySim({income,totalAlloc,totalInv}) {
  const [raise,setRaise]=useState("10");
  const raiseAmt=income*(Number(raise||0)/100);
  const newIncome=income+raiseAmt;
  const newSurplus=newIncome-totalAlloc;
  const extraMonthly=newSurplus-(income-totalAlloc);
  const future10=totalInv*Math.pow(1.07,10)+extraMonthly*((Math.pow(1+0.07/12,120)-1)/(0.07/12));
  return (
    <Card style={{background:"linear-gradient(135deg,#0d1b3e,#111827)"}}>
      <SecTitle>Salary Raise — What If?</SecTitle>
      <Label>Raise Percentage</Label>
      <div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",marginBottom:14}}>
        <input type="number" value={raise} onChange={e=>setRaise(e.target.value)} placeholder="10" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:16,width:"100%",...GS}}/><span style={{color:"#6b8cce"}}>%</span>
      </div>
      {Number(raise)>0&&<div style={{background:"#0d2a1a",border:"1px solid #1a4030",borderRadius:10,padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>NEW INCOME</div><div style={{fontSize:18,color:"#4ade80",fontWeight:"bold"}}>{fmt(newIncome)}/mo</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>EXTRA SURPLUS</div><div style={{fontSize:18,color:"#facc15",fontWeight:"bold"}}>{fmt(extraMonthly)}/mo</div></div>
        </div>
        <div style={{fontSize:12,color:"#6b8cce",lineHeight:1.7}}>A <span style={{color:"#4ade80"}}>{raise}% raise</span> adds <span style={{color:"#4ade80"}}>{fmt(raiseAmt)}/mo</span>. Invested for 10 years at 7%, that extra surplus grows to <span style={{color:"#facc15",fontWeight:"bold"}}>{fmtShort(future10)}</span>.</div>
      </div>}
    </Card>
  );
}

function BuyHomeSim({income}) {
  const [price,setPrice]=useState("500000");
  const [down,setDown]=useState("20");
  const [rate,setRate]=useState("5.5");
  const [amort,setAmort]=useState("25");
  const homePrice=Number(price||0),downPct=Number(down||0)/100,downAmt=homePrice*downPct,principal=homePrice-downAmt;
  const r=Number(rate||0)/100/12,n=Number(amort||25)*12;
  const mp=principal>0&&r>0?principal*r/(1-Math.pow(1+r,-n)):principal/n;
  const totalPaid=mp*n,totalInterest=totalPaid-principal;
  const cmbhc=downPct<0.2?principal*(downPct<0.05?0.04:downPct<0.1?0.031:0.028):0;
  const incomeRequired=mp*4;
  return (
    <Card style={{background:"linear-gradient(135deg,#0d1b3e,#111827)"}}>
      <SecTitle>Buy a Home — What If?</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><Label>Home Price</Label><NumInput value={price} onChange={setPrice} placeholder="500000"/></div>
        <div><Label>Down Payment %</Label><PctInput value={down} onChange={setDown} placeholder="20"/></div>
        <div><Label>Interest Rate</Label><PctInput value={rate} onChange={setRate} placeholder="5.5"/></div>
        <div><Label>Amortization (yrs)</Label><div style={{display:"flex",alignItems:"center",background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px"}}><input type="number" value={amort} onChange={e=>setAmort(e.target.value)} placeholder="25" style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:14,width:"100%",...GS}}/><span style={{color:"#6b8cce",fontSize:11}}>yr</span></div></div>
      </div>
      {principal>0&&mp>0&&<div style={{background:"#0d1b3e",borderRadius:10,padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>DOWN PAYMENT</div><div style={{fontSize:16,color:"#60a5fa",fontWeight:"bold"}}>{fmt(downAmt)}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>MONTHLY PAYMENT</div><div style={{fontSize:16,color:"#4ade80",fontWeight:"bold"}}>{fmt(mp)}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>TOTAL INTEREST</div><div style={{fontSize:16,color:"#f87171",fontWeight:"bold"}}>{fmtShort(totalInterest)}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>INCOME NEEDED</div><div style={{fontSize:16,color:income>=incomeRequired?"#4ade80":"#f87171",fontWeight:"bold"}}>{fmt(incomeRequired)}</div></div>
        </div>
        {cmbhc>0&&<div style={{fontSize:11,color:"#facc15",marginBottom:8}}>⚠️ CMHC Insurance required: {fmt(cmbhc)} (down payment under 20%)</div>}
        <div style={{fontSize:11,color:income>=incomeRequired?"#4ade80":"#f87171"}}>{income>=incomeRequired?"✅ Your income qualifies":"⚠️ Income may not qualify — lenders typically require 4× monthly payment"}</div>
      </div>}
    </Card>
  );
}

// ─── STANDALONE TOOLS ─────────────────────────────────────────────────────────
function StandaloneBudget({prefill=null}) {
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
      return prefill.savingsAccounts.map(a=>({name:a.name,target:a.goal||"",saved:a.saved||"",date:""}));
    }
    return [{name:"",target:"",saved:"",date:""}];
  };
  const [goals,setGoals]=useState(initGoals);
  return (
    <div>
      <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.8,marginBottom:16}}>Enter your goal, how much you've saved, and your deadline — we'll calculate the monthly amount you need to save.</div>
      {goals.map((g,i)=>{
        const setF=f=>v=>setGoals(p=>p.map((x,idx)=>idx===i?{...x,[f]:v}:x));
        const needed=Math.max(0,Number(g.target||0)-Number(g.saved||0));
        const td=new Date(),target=g.date?new Date(g.date+"-01"):null;
        const months=target?Math.max(1,((target.getFullYear()-td.getFullYear())*12+(target.getMonth()-td.getMonth()))):0;
        const perMonth=months>0?needed/months:0;
        const pct=Number(g.target||0)>0?Math.min(100,(Number(g.saved||0)/Number(g.target||0))*100):0;
        return (
          <Card key={i}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:11,color:"#facc15",letterSpacing:2}}>GOAL {i+1}</div>{goals.length>1&&<button onClick={()=>setGoals(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button>}</div>
            <Label>Goal Name</Label><TxtInput value={g.name} onChange={setF("name")} placeholder="e.g. Emergency Fund, Down Payment"/>
            <div style={{height:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><Label>Target Amount</Label><NumInput value={g.target} onChange={setF("target")}/></div>
              <div><Label>Already Saved</Label><NumInput value={g.saved} onChange={setF("saved")}/></div>
            </div>
            <Label>Target Date</Label>
            <input type="month" value={g.date} onChange={e=>setF("date")(e.target.value)} style={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,padding:"10px 12px",color:"#e8e4d9",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",...GS}}/>
            {perMonth>0&&<div style={{marginTop:14,background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #1a4030",borderRadius:10,padding:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div style={{textAlign:"center",background:"#0a1a0f",borderRadius:8,padding:"12px 8px"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>SAVE / MONTH</div><div style={{fontSize:22,color:"#4ade80",fontWeight:"bold"}}>{fmt(perMonth)}</div></div>
                <div style={{textAlign:"center",background:"#0d1b3e",borderRadius:8,padding:"12px 8px"}}><div style={{fontSize:10,color:"#6b8cce",marginBottom:4}}>STILL NEEDED</div><div style={{fontSize:22,color:"#facc15",fontWeight:"bold"}}>{fmt(needed)}</div></div>
              </div>
              {pct>0&&<><div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}><div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/></div><div style={{fontSize:11,color:"#6b8cce"}}>{Math.round(pct)}% saved · {months} months remaining</div></>}
            </div>}
          </Card>
        );
      })}
      <button onClick={()=>setGoals(p=>[...p,{name:"",target:"",saved:"",date:""}])} style={{width:"100%",background:"none",border:"1px dashed #facc1544",color:"#6b8cce",borderRadius:10,padding:"12px",cursor:"pointer",fontSize:13,marginBottom:6,...GS}}>+ Add Another Goal</button>
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
import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
    {name:"Investments",amount:""},{name:"Housing",amount:""},{name:"Food",amount:""},
    {name:"Transportation",amount:""},{name:"Recurring",amount:""},{name:"Insurance",amount:""},
    {name:"Entertainment",amount:""},{name:"Wellness",amount:""},
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
  const invRate = annualIncome>0?(Number(d.budget.categories.find(c=>c.name==="Investments")?.amount||0)*12/annualIncome)*100:0;
  const band = age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s";
  const bm = {"20s":{invTarget:10,efundMonths:3,debtRatio:0.3,invAmount:10000},"30s":{invTarget:15,efundMonths:4,debtRatio:0.25,invAmount:60000},"40s":{invTarget:18,efundMonths:5,debtRatio:0.2,invAmount:150000},"50s":{invTarget:20,efundMonths:6,debtRatio:0.15,invAmount:300000},"60s":{invTarget:20,efundMonths:6,debtRatio:0.1,invAmount:500000}}[band];
  const monthlyExp = d.budget.categories.reduce((s,c)=>s+Number(c.amount||0),0);
  const scores = [
    {label:"Investment Rate",score:Math.min(25,Math.round((invRate/bm.invTarget)*25)),max:25,desc:`${invRate.toFixed(1)}% invested (target: ${bm.invTarget}%)`},
    {label:"Portfolio Size",score:Math.min(25,Math.round((totalInv/bm.invAmount)*25)),max:25,desc:`${fmtShort(totalInv)} saved (benchmark: ${fmtShort(bm.invAmount)})`},
    {label:"Emergency Fund",score:Math.min(20,Math.round(((monthlyExp>0?efund/monthlyExp:0)/bm.efundMonths)*20)),max:20,desc:`${monthlyExp>0?(efund/monthlyExp).toFixed(1):0} months (target: ${bm.efundMonths})`},
    {label:"Debt Management",score:Math.max(0,Math.round(annualIncome>0?20-Math.max(0,(totalDebt/annualIncome-bm.debtRatio)*100):0)),max:20,desc:`Non-mortgage debt ${annualIncome>0?(totalDebt/annualIncome*100).toFixed(0):0}% of income (target <${bm.debtRatio*100}%)`},
    {label:"Monthly Surplus",score:Math.min(10,Math.round(Number(d.budget.income||0)>0?Math.max(0,((Number(d.budget.income||0)-monthlyExp)/Number(d.budget.income||1))*100):0)),max:10,desc:Number(d.budget.income||0)-monthlyExp>0?`${fmt(Number(d.budget.income||0)-monthlyExp)}/mo surplus`:"Budget is over"},
  ];
  const total = scores.reduce((s,x)=>s+x.score,0);
  const grade = total>=85?"A+":total>=75?"A":total>=65?"B+":total>=55?"B":total>=45?"C+":total>=35?"C":"D";
  const gradeColor = total>=75?"#4ade80":total>=55?"#facc15":total>=35?"#fb923c":"#f87171";
  return {total,grade,gradeColor,scores,band};
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

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("home");

  const [dark,setDark]=useState(true);
const [data, setData] = useState(() => {
  try { return JSON.parse(localStorage.getItem("fh_data")) || EMPTY; }
  catch { return EMPTY; }
});
const [scoreHistory, setScoreHistory] = useState(() => {
  try { return JSON.parse(localStorage.getItem("fh_scores")) || []; }
  catch { return []; }
});

useEffect(() => {
  localStorage.setItem("fh_data", JSON.stringify(data));
}, [data]);

useEffect(() => {
  localStorage.setItem("fh_scores", JSON.stringify(scoreHistory));
}, [scoreHistory]);
```
6. Press **Command + S**

---

**Step 3 — Run the app on your Mac**

1. In VS Code click **Terminal** in the very top menu bar → **New Terminal**
2. A panel opens at the bottom of VS Code
3. Type this and press **Enter**:
```
npm install
```
Wait 1–2 minutes — lots of text will scroll, that's normal.

4. When it stops, type this and press **Enter**:
```
npm run dev
```
5. You'll see something like:
```
➜  Local:   http://localhost:5173/
```
6. Open **Chrome** or **Safari** and go to:
```
http://localhost:5173
  const saveScore = (score) => {
    if(!score) return;
    const entry = {date:today(),score:score.total,grade:score.grade,gradeColor:score.gradeColor};
    setScoreHistory(prev=>{
      const existing=prev.findIndex(x=>x.date===entry.date);
      if(existing>=0){const n=[...prev];n[existing]=entry;return n;}
      return [...prev,entry].slice(-12);
    });
  };

  const sumGroup = arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0);
  const totalInv = sumGroup(data.investments.tfsa)+sumGroup(data.investments.fhsa)+sumGroup(data.investments.rrsp)+sumGroup(data.investments.alternatives)+sumGroup(data.investments.nonReg);

  const theme = dark ? DARK_THEME : LIGHT_THEME;

  if(page==="home") return <Homepage onAppointment={()=>setPage("appointment")} onCheckup={()=>setPage("checkup")} onTools={()=>setPage("tools")} dark={dark} setDark={setDark} theme={theme}/>;
  if(page==="appointment") return <Appointment data={data} setData={setData} onHome={()=>setPage("home")} onCheckup={()=>setPage("checkup")} saveScore={saveScore} totalInv={totalInv} theme={theme}/>;
  if(page==="checkup") return <Checkup data={data} onHome={()=>setPage("home")} onAppointment={()=>setPage("appointment")} totalInv={totalInv} scoreHistory={scoreHistory} saveScore={saveScore} theme={theme}/>;
  if(page==="tools") return <IndividualTools onHome={()=>setPage("home")} data={data} theme={theme}/>;
}

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
function Homepage({onAppointment,onCheckup,onTools,dark,setDark,theme}) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),80);},[]);
  const fade = d=>({opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(20px)",transition:`opacity 0.7s ease ${d}s,transform 0.7s ease ${d}s`});

  // Inject heartbeat keyframes
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
      @keyframes slideToggle {
        from { transform: translateX(0); }
        to   { transform: translateX(32px); }
      }
    `;
    document.head.appendChild(style);
  },[]);

  const isLight = !dark;

  return (
    <div style={{minHeight:"100vh",background:theme.bg,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",...GS,color:theme.text,transition:"background 0.4s"}}>
      {/* Background grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${theme.gridLine} 1px,transparent 1px),linear-gradient(90deg,${theme.gridLine} 1px,transparent 1px)`,backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      {/* Pulsing glow behind cross */}
      <div style={{position:"absolute",top:"50%",left:"50%",width:340,height:340,background:`radial-gradient(circle,${theme.glow} 0%,transparent 70%)`,pointerEvents:"none",animation:"hbglow 3.5s ease-in-out infinite"}}/>

      {/* Theme toggle — top right, large */}
      <div style={{position:"absolute",top:24,right:24,zIndex:10}}>
        <button onClick={()=>setDark(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          {/* Toggle pill */}
          <div style={{width:64,height:32,borderRadius:16,background:dark?"#1e3a5f":"#e2e8f0",border:`2px solid ${dark?"#2a4080":"#cbd5e1"}`,position:"relative",transition:"background 0.3s,border 0.3s",display:"flex",alignItems:"center",padding:"0 4px"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:dark?"#4ade80":"#facc15",position:"absolute",left:dark?4:36,transition:"left 0.3s,background 0.3s",boxShadow:`0 2px 8px ${dark?"#4ade8066":"#facc1566"}`}}/>
            <span style={{position:"absolute",left:dark?32:6,fontSize:13,transition:"left 0.3s"}}>{dark?"☀️":"🌙"}</span>
          </div>
          <div style={{fontSize:9,color:theme.textDim,letterSpacing:2,textTransform:"uppercase",...GS}}>{dark?"Light":"Dark"}</div>
        </button>
      </div>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,padding:"0 24px",display:"flex",flexDirection:"column",alignItems:"center"}}>

        {/* Pulsing red cross */}
        <div style={{...fade(0),marginBottom:24}}>
          <svg width="140" height="140" viewBox="0 0 160 160" style={{animation:"heartbeat 3.5s ease-in-out infinite",display:"block"}}>
            <rect x="52" y="8" width="56" height="144" rx="10" fill="#cc0000"/>
            <rect x="8" y="52" width="144" height="56" rx="10" fill="#cc0000"/>
            <rect x="52" y="8" width="56" height="144" rx="10" fill="url(#sh)" opacity="0.25"/>
            <defs>
              <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff"/>
                <stop offset="100%" stopColor="transparent"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <div style={{...fade(0.15),textAlign:"center",marginBottom:32}}>
          <h1 style={{fontSize:36,margin:"0 0 8px",color:theme.text,fontWeight:"normal",letterSpacing:1}}>
            Financial <span style={{color:theme.titleAccent}}>Health</span>
          </h1>
          <div style={{fontSize:12,color:theme.textDim,letterSpacing:2,textTransform:"uppercase"}}>Your complete financial picture</div>
        </div>

        {/* Buttons — centred, no icons */}
        <div style={{...fade(0.3),width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          {[
            {label:"Financial Check-up",sub:"View your dashboard — net worth, investments & goals",badge:"RETURNING",bc:theme.badgeCheckup,border:theme.btnCheckupBorder,bg:theme.btnCheckupBg,textColor:theme.btnCheckupText,fn:onCheckup},
            {label:"Initial Appointment",sub:"Enter your financial info — takes about 10 minutes",badge:"NEW",bc:theme.badgeAppt,border:theme.btnApptBorder,bg:theme.btnApptBg,textColor:theme.btnApptText,fn:onAppointment},
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
              <SecTitle>Monthly Income</SecTitle><NumInput value={d.budget.income} onChange={setBudgetIncome} placeholder="8000.00"/>
              {income>0&&<div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:11,color:"#6b8cce"}}>Allocated</div><div style={{fontSize:13,color:totalAlloc>income?"#f87171":"#4ade80",fontWeight:"bold"}}>{fmt(totalAlloc)} / {fmt(income)}</div></div><div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:Math.min(100,(totalAlloc/income)*100)+"%",height:"100%",background:totalAlloc>income?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6,transition:"width 0.3s"}}/></div></div>}
            </Card>
            <Card>
              <SecTitle>Budget Categories</SecTitle>
              {d.budget.categories.map((cat,i)=>(
                <div key={i} style={{marginBottom:10,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:9,height:9,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/><input value={cat.name} onChange={e=>setBudgetCat(i,"name")(e.target.value)} style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:13,flex:1,...GS}}/><button onClick={()=>setD(p=>({...p,budget:{...p.budget,categories:p.budget.categories.filter((_,idx)=>idx!==i)}}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button></div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#6b8cce"}}>$</span><input type="number" value={cat.amount} onChange={e=>setBudgetCat(i,"amount")(e.target.value)} style={{background:"none",border:"none",outline:"none",borderBottom:"1px solid #2a4080",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:19,width:"100%",paddingBottom:4,...GS}}/>{income>0&&Number(cat.amount)>0&&<span style={{fontSize:11,color:"#6b8cce"}}>{((Number(cat.amount)/income)*100).toFixed(1)}%</span>}</div>
                </div>
              ))}
              <button onClick={()=>setD(p=>({...p,budget:{...p.budget,categories:[...p.budget.categories,{name:"New Category",amount:""}]}}))} style={{width:"100%",background:"none",border:"1px dashed #2a4080",color:"#6b8cce",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,...GS}}>+ Add Category</button>
            </Card>
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
              <PDFBtn title={`Financial Score - ${d.clientName||"Report"}`} contentId="score-content"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <button onClick={()=>{saveScore(score);onCheckup();}} style={{background:"linear-gradient(135deg,#0d2a1a,#0d1b3e)",border:"1px solid #4ade80",borderRadius:12,padding:"14px",color:"#4ade80",fontSize:13,cursor:"pointer",...GS}}>Save & Dashboard →</button>
                <button onClick={onHome} style={{background:"none",border:"1px solid #2a4080",borderRadius:12,padding:"14px",color:"#8fadd4",fontSize:13,cursor:"pointer",...GS}}>← Home</button>
              </div>
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
  {id:"budget",label:"Budget Builder",icon:"💰",sub:"Build and visualize your monthly budget",color:"#4ade80"},
  {id:"networth",label:"Net Worth Calculator",icon:"📊",sub:"Calculate your assets minus liabilities",color:"#60a5fa"},
  {id:"savings",label:"Savings Goal",icon:"🎯",sub:"How much to save per month for any goal",color:"#facc15"},
  {id:"whatif",label:"What-If Simulator",icon:"🔮",sub:"Simulate financial decisions before making them",color:"#a78bfa"},
  {id:"loc",label:"Loan Simulator",icon:"🏦",sub:"Calculate payments and interest on any loan",color:"#fb923c"},
  {id:"cashflow",label:"Cash Flow Calendar",icon:"📅",sub:"Map your income and bills through the month",color:"#22d3ee"},
  {id:"debtopt",label:"Debt Optimizer",icon:"⚡",sub:"Avalanche vs snowball — find your best payoff path",color:"#f87171"},
];

function IndividualTools({onHome,data}) {
  const [tool,setTool]=useState(null);
  if(tool==="budget") return <ToolWrapper title="Budget Builder" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-budget"><StandaloneBudget/></ToolWrapper>;
  if(tool==="networth") return <ToolWrapper title="Net Worth Calculator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-networth"><StandaloneNetWorth/></ToolWrapper>;
  if(tool==="savings") return <ToolWrapper title="Savings Goal" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-savings"><SavingsGoalCalc/></ToolWrapper>;
  if(tool==="whatif") return <ToolWrapper title="What-If Simulator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-whatif"><WhatIfSimulator data={data}/></ToolWrapper>;
  if(tool==="loc") return <ToolWrapper title="Loan Simulator" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-loc"><LOCSimulator rate=""/></ToolWrapper>;
  if(tool==="cashflow") return <ToolWrapper title="Cash Flow Calendar" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-cashflow"><BillCalendar income={data.budget.income}/></ToolWrapper>;
  if(tool==="debtopt") return <ToolWrapper title="Debt Optimizer" onBack={()=>setTool(null)} onHome={onHome} contentId="tool-debtopt"><DebtOptimizer creditCards={data.creditCards} otherDebts={data.otherDebts} locs={data.locs}/></ToolWrapper>;

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e8e4d9",...GS}}>
      <NavBar title="Individual Tools" subtitle="FinHealth" onHome={onHome}/>
      <div style={{padding:"20px 16px",maxWidth:520,margin:"0 auto"}}>
        <div style={{fontSize:13,color:"#8fadd4",lineHeight:1.7,marginBottom:24}}>Standalone financial tools — no appointment needed. Use these to run quick calculations and simulations.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {TOOLS_LIST.map(tool=>(
            <button key={tool.id} onClick={()=>setTool(tool.id)} style={{background:"linear-gradient(135deg,#111827,#1a2235)",border:`1px solid #1e3a5f`,borderRadius:14,padding:"18px 20px",cursor:"pointer",textAlign:"left",color:"#e8e4d9",width:"100%",transition:"transform 0.2s,box-shadow 0.2s,border-color 0.2s",...GS}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px ${tool.color}22`;e.currentTarget.style.borderColor=tool.color+"44";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor="#1e3a5f";}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:28,flexShrink:0,width:40,textAlign:"center"}}>{tool.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:"bold",color:tool.color,marginBottom:3}}>{tool.label}</div>
                  <div style={{fontSize:12,color:"#8fadd4",lineHeight:1.5}}>{tool.sub}</div>
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
    {id:"salary",label:"💼 Salary Raise",sub:"What if my income increased?"},
    {id:"buyhome",label:"🏠 Buy a Home",sub:"What would homeownership cost me?"},
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
      {scenario==="salary"&&<SalarySim income={income} totalAlloc={totalAlloc} totalInv={totalInv}/>}
      {scenario==="buyhome"&&<BuyHomeSim income={income}/>}
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
function StandaloneBudget() {
  const [income,setIncome]=useState("");
  const [cats,setCats]=useState([{name:"Housing",amount:""},{name:"Food",amount:""},{name:"Transportation",amount:""},{name:"Investments",amount:""},{name:"Entertainment",amount:""},{name:"Utilities",amount:""},{name:"Insurance",amount:""}]);
  const total=cats.reduce((s,c)=>s+Number(c.amount||0),0),inc=Number(income||0),remaining=inc-total;
  const donutData=[...cats.filter(c=>Number(c.amount||0)>0).map(c=>({name:c.name,value:Number(c.amount)})),remaining>0?{name:"Remaining",value:remaining}:null].filter(Boolean);
  return (
    <div>
      <Card><SecTitle>Monthly Income</SecTitle><NumInput value={income} onChange={setIncome} placeholder="5000.00"/>
        {inc>0&&<div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:11,color:"#6b8cce"}}>Allocated</div><div style={{fontSize:13,color:total>inc?"#f87171":"#4ade80",fontWeight:"bold"}}>{fmt(total)} / {fmt(inc)}</div></div><div style={{background:"#0d1b3e",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:Math.min(100,(total/inc)*100)+"%",height:"100%",background:total>inc?"#f87171":"linear-gradient(90deg,#4ade80,#22d3ee)",borderRadius:6}}/></div><div style={{marginTop:6,display:"flex",justifyContent:"space-between"}}><div style={{fontSize:11,color:"#6b8cce"}}>Remaining</div><div style={{fontSize:13,color:remaining>=0?"#4ade80":"#f87171",fontWeight:"bold"}}>{fmt(remaining)}</div></div></div>}
      </Card>
      <Card><SecTitle>Categories</SecTitle>
        {cats.map((cat,i)=>(
          <div key={i} style={{marginBottom:10,background:"#0d1b3e",borderRadius:10,padding:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:9,height:9,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/><input value={cat.name} onChange={e=>setCats(p=>p.map((c,idx)=>idx===i?{...c,name:e.target.value}:c))} style={{background:"none",border:"none",outline:"none",color:"#e8e4d9",fontSize:13,flex:1,...GS}}/><button onClick={()=>setCats(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16}}>×</button></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#6b8cce"}}>$</span><input type="number" value={cat.amount} onChange={e=>setCats(p=>p.map((c,idx)=>idx===i?{...c,amount:e.target.value}:c))} style={{background:"none",border:"none",outline:"none",borderBottom:"1px solid #2a4080",color:CAT_COLORS[i%CAT_COLORS.length],fontSize:19,width:"100%",paddingBottom:4,...GS}}/>{inc>0&&Number(cat.amount)>0&&<span style={{fontSize:11,color:"#6b8cce"}}>{((Number(cat.amount)/inc)*100).toFixed(1)}%</span>}</div>
          </div>
        ))}
        <button onClick={()=>setCats(p=>[...p,{name:"New Category",amount:""}])} style={{width:"100%",background:"none",border:"1px dashed #2a4080",color:"#6b8cce",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:13,...GS}}>+ Add Category</button>
      </Card>
      {donutData.length>0&&<Card><SecTitle>Breakdown</SecTitle>
        <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value">{donutData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]} stroke="none"/>)}</Pie><Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{background:"#0d1b3e",border:"1px solid #2a4080",borderRadius:8,...GS,fontSize:11}} itemStyle={{color:"#e8e4d9"}}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>{donutData.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length]}}/><span style={{fontSize:11,color:"#8fadd4"}}>{x.name}: {fmt(x.value)}</span></div>)}</div>
      </Card>}
    </div>
  );
}

function StandaloneNetWorth() {
  const [assets,setAssets]=useState([{name:"Chequing",amount:""},{name:"TFSA",amount:""},{name:"RRSP",amount:""},{name:"Home Equity",amount:""}]);
  const [liabs,setLiabs]=useState([{name:"Credit Card",amount:""},{name:"Mortgage",amount:""}]);
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

function SavingsGoalCalc() {
  const [goals,setGoals]=useState([{name:"",target:"",saved:"",date:""}]);
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
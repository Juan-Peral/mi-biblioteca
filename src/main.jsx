import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";

// ── SUPABASE CONFIG ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qmciftrozaurmcnrhumi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtY2lmdHJvemF1cm1jbnJodW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MDY2ODksImV4cCI6MjA5Mzk4MjY4OX0.qqoUeSUh6A3Rnowgk84F9ows-OHSZiGXS2zRtY5thVs";

const db = {
  async get(table) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  }
};

// ── CONSTANTES ─────────────────────────────────────────────────────────────────
const DEWEY = ["000 - Generalidades","100 - Filosofía y Psicología","200 - Religión","300 - Ciencias Sociales","400 - Lenguaje","500 - Ciencias Naturales","600 - Tecnología","700 - Arte y Recreación","800 - Literatura","900 - Historia y Geografía"];
const GENRES = ["Novela","Cuento","Poesía","Teatro","Ensayo","Historia","Biografía","Ciencia","Filosofía","Arte","Derecho","Economía","Medicina","Informática","Viajes","Infantil","Juvenil","Otro"];
const AGES = ["Infantil (0-8)","Juvenil (9-14)","Adolescente (15-17)","Adulto","Todas las edades"];
const SITUATIONS = ["Ocio y entretenimiento","Estudio y consulta","Viaje","Profesional","Reflexión personal","Club de lectura","Regalo"];
const STATUSES = ["Disponible","Prestado","En lectura","Deteriorado"];
const ROLES = { admin:"Administrador", editor:"Editor", user:"Usuario", guest:"Invitado" };
const MODEL = "claude-sonnet-4-20250514";

// ── ESTILOS ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#1a1f2e", sidebar:"#16213e", card:"#1e2640",
  accent:"#4f8ef7", success:"#2ecc71", warning:"#f39c12",
  danger:"#e74c3c", info:"#3498db", text:"#e8eaf0", textSec:"#8892a4",
  border:"#2a3352", inputBg:"#141929", gold:"#f0c040"
};
const css = `
  * { box-sizing:border-box; font-family:'Segoe UI',system-ui,sans-serif; }
  input,select,textarea { background:${C.inputBg}; color:${C.text}; border:1px solid ${C.border}; border-radius:8px; padding:8px 12px; font-size:14px; width:100%; outline:none; transition:border-color 0.2s; }
  input:focus,select:focus,textarea:focus { border-color:${C.accent}; }
  select option { background:${C.inputBg}; }
  label { font-size:12px; color:${C.textSec}; display:block; margin-bottom:4px; font-weight:500; }
  ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:${C.bg};} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
`;

const Btn = ({ children, onClick, disabled, variant="primary", style={}, small=false }) => {
  const base = { border:"none", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontWeight:600, fontSize:small?12:14, padding:small?"6px 14px":"9px 18px", transition:"all 0.18s", opacity:disabled?0.5:1, ...style };
  const variants = { primary:{background:C.accent,color:"#fff"}, success:{background:C.success,color:"#fff"}, danger:{background:C.danger,color:"#fff"}, ghost:{background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}, dark:{background:C.border,color:C.text} };
  return <button onClick={disabled?undefined:onClick} style={{...base,...variants[variant]}} disabled={disabled}>{children}</button>;
};
const Card = ({ children, style={} }) => <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:"1.25rem", ...style }}>{children}</div>;
const Badge = ({ children, color=C.accent }) => <span style={{ background:color+"22", color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, border:`1px solid ${color}44` }}>{children}</span>;
const Stars = ({ value=0, size=16, onChange }) => <span>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>onChange&&onChange(n)} style={{ fontSize:size, cursor:onChange?"pointer":"default", color:n<=value?C.gold:"#2a3352" }}>★</span>)}</span>;

// ── API CLAUDE ─────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens=900) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:MODEL, max_tokens:maxTokens, messages:[{role:"user",content:prompt}] })
  });
  const data = await res.json();
  const text = data.content?.map(i=>i.text||"").join("")||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}
async function callClaudeImage(base64, prompt, maxTokens=900) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:MODEL, max_tokens:maxTokens, messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:"image/jpeg",data:base64}},
      {type:"text",text:prompt}
    ]}]})
  });
  const data = await res.json();
  const text = data.content?.map(i=>i.text||"").join("")||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

// ── SCANNER ────────────────────────────────────────────────────────────────────
function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [ready, setReady] = useState(false);
  const stop = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); if(intervalRef.current)clearInterval(intervalRef.current); };
  useEffect(() => {
    (async()=>{
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        streamRef.current=stream; videoRef.current.srcObject=stream; videoRef.current.play(); setReady(true);
        setStatus("Apunta al código de barras o captura la portada");
        if("BarcodeDetector" in window){
          const det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128"]});
          intervalRef.current=setInterval(async()=>{
            if(!videoRef.current||videoRef.current.readyState<2) return;
            const codes=await det.detect(videoRef.current).catch(()=>[]);
            if(codes.length){clearInterval(intervalRef.current);stop();onResult({type:"isbn",value:codes[0].rawValue});}
          },500);
        }
      } catch { setStatus("No se pudo acceder a la cámara. Usa la opción de subir archivo."); }
    })();
    return stop;
  },[]);
  const capture = () => {
    const v=videoRef.current,c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
    stop();onResult({type:"image",value:c.toDataURL("image/jpeg",0.9)});
  };
  return (
    <div style={{textAlign:"center"}}>
      <h3 style={{color:C.text,marginBottom:8}}>Escanear libro</h3>
      <p style={{fontSize:13,color:C.textSec,marginBottom:12}}>{status}</p>
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",background:"#000",marginBottom:12}}>
        <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxHeight:260,display:"block"}}/>
        {ready&&<div style={{position:"absolute",inset:0,pointerEvents:"none"}}><div style={{position:"absolute",top:"20%",left:"10%",right:"10%",bottom:"20%",border:`2px solid ${C.success}cc`,borderRadius:6}}/></div>}
      </div>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={capture} style={{flex:1}}>📸 Capturar imagen</Btn>
        <Btn onClick={()=>{stop();onClose();}} variant="ghost" style={{flex:1}}>Cancelar</Btn>
      </div>
    </div>
  );
}

// ── BOOK FORM ──────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  title:"",author:"",year:"",publisher:"",isbn:"",genre:"Novela",dewey:"800 - Literatura",
  language:"Español",age:"Adulto",situation:"Ocio y entretenimiento",status:"Disponible",
  cover:"",review:"",translator:"",edition:"",rating:0,
  editorial:{originalTitle:"",firstYear:"",firstPlace:"",format:"",originalPublisher:"",originalLanguage:"",notableTranslations:"",details:"",sources:[]}
});

function BookForm({ initial, onSave, onCancel, onScan }) {
  const [form, setForm] = useState(initial||emptyForm());
  const [busy, setBusy] = useState("");
  const [corrections, setCorrections] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [useAsCover, setUseAsCover] = useState(false);
  const isbnImgRef = useRef();

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setEd=(k,v)=>setForm(f=>({...f,editorial:{...f.editorial,[k]:v}}));
  const toBase64=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.onerror=rej;r.readAsDataURL(file);});

  const processImage = async (dataUrl) => {
    setBusy("Analizando imagen con IA..."); setPreviewImage(dataUrl); setUseAsCover(false);
    try {
      const base64=dataUrl.split(",")[1];
      const parsed=await callClaudeImage(base64,
        `Eres un experto bibliotecario. Analiza esta imagen: portada, lomo, contraportada o código de barras de un libro.
INSTRUCCIONES: 1) Si ves código de barras EAN-13, lee el número de 13 dígitos en texto debajo. 2) Si ves "ISBN" seguido de números, extráelo. 3) Extrae título, autor, editorial, año, traductor, edición. 4) isCover:true solo si es la portada principal.
SOLO JSON sin backticks: {"title":"","author":"","year":0,"publisher":"","isbn":"","genre":"","language":"","translator":"","edition":"","isCover":true,"found":true}`
      );
      if(!parsed.found){setPreviewImage(null);setBusy("");return;}
      setUseAsCover(parsed.isCover===true);
      setForm(f=>{const m={...f};
        if(parsed.title)m.title=parsed.title; if(parsed.author)m.author=parsed.author;
        if(parsed.year)m.year=parsed.year; if(parsed.publisher)m.publisher=parsed.publisher;
        if(parsed.isbn)m.isbn=parsed.isbn; if(parsed.genre)m.genre=parsed.genre;
        if(parsed.language)m.language=parsed.language; if(parsed.translator)m.translator=parsed.translator;
        if(parsed.edition)m.edition=parsed.edition; return m;
      });
      if(parsed.isbn)await fetchByISBN(parsed.isbn,false);
      else if(parsed.title&&parsed.author)await fetchEditorial(parsed.title,parsed.author);
    } catch(e){}
    setBusy("");
  };

  const fetchByISBN = async(isbn,updateIsbn=true)=>{
    setBusy("Buscando datos por ISBN..."); const clean=isbn.replace(/-/g,""); let found=false;
    try{const r=await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`);const d=await r.json();const b=d[`ISBN:${clean}`];
      if(b?.title){setForm(f=>({...f,title:b.title||f.title,author:b.authors?.map(a=>a.name).join(", ")||f.author,year:b.publish_date?parseInt(b.publish_date)||f.year:f.year,publisher:b.publishers?.[0]?.name||f.publisher,language:b.languages?.[0]?.key?.replace("/languages/","")||f.language,...(updateIsbn?{isbn}:{})}));found=true;}
    }catch(_){}
    if(!found){try{const r=await fetch(`https://openlibrary.org/search.json?isbn=${clean}&limit=1`);const d=await r.json();const b=d.docs?.[0];
      if(b?.title){setForm(f=>({...f,title:b.title||f.title,author:b.author_name?.[0]||f.author,year:b.first_publish_year||f.year,publisher:b.publisher?.[0]||f.publisher,...(updateIsbn?{isbn}:{})}));found=true;}
    }catch(_){}}
    if(updateIsbn&&!found)setForm(f=>({...f,isbn}));
    setForm(f=>{if(f.title&&f.author)fetchEditorial(f.title,f.author);return f;});
    setBusy("");
  };

  const fetchEditorial=async(title,author)=>{
    setBusy("Buscando historia editorial...");
    try{const ed=await callClaude(`Información bibliográfica de primera edición de "${title}" de "${author}". SOLO JSON sin backticks: {"originalTitle":"","firstYear":0,"firstPlace":"","format":"libro único / volúmenes / publicación periódica","originalPublisher":"","originalLanguage":"","notableTranslations":"","details":"2-3 frases","sources":["fuente1"]}`);
      if(ed)setForm(f=>({...f,editorial:{...f.editorial,...ed}}));
    }catch(_){}
    setBusy("");
  };

  const handleSave=async()=>{
    if(!form.title||!form.author){alert("Título y autor son obligatorios");return;}
    setBusy("Verificando y corrigiendo datos...");
    try{const corrected=await callClaude(`Eres un bibliotecario experto. Revisa y corrige:
Título: "${form.title}" | Autor(es): "${form.author}" | Traductor: "${form.translator}" | Editorial: "${form.publisher}" | Año: "${form.year}" | Idioma: "${form.language}" | Género: "${form.genre}"
Reglas: 1)Título completo oficial con subtítulo. 2)Mayúsculas correctas. 3)Acentos y diacríticos. 4)Añade coautores con "&". 5)No inventes datos.
SOLO JSON sin backticks: {"title":"","author":"","translator":"","publisher":"","year":0,"language":"","genre":"","corrections":["máx 5"]}`);
      if(corrected){const final={...form,...corrected};delete final.corrections;setCorrections(corrected.corrections||[]);setBusy("");onSave(final);return;}
    }catch(_){}
    setBusy("");onSave(form);
  };

  const handleFileInput=async(file)=>{if(!file||!file.type.startsWith("image/"))return;const d=await toBase64(file);processImage(d);};
  const handleDrop=(e)=>{e.preventDefault();e.stopPropagation();setDragOver(false);handleFileInput(e.dataTransfer.files[0]);};

  const fld=(label,key,type="text",ph="")=><div><label>{label}</label><input type={type} value={form[key]||""} onChange={e=>set(key,e.target.value)} placeholder={ph}/></div>;
  const sel=(label,key,opts)=><div><label>{label}</label><select value={form[key]||""} onChange={e=>set(key,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>;

  return (
    <div style={{maxHeight:"80vh",overflowY:"auto",paddingRight:4,color:C.text}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,color:C.text}}>{initial?.id?"Editar ejemplar":"Añadir nuevo ejemplar"}</h2>
        <Btn onClick={onScan} variant="dark" small>📷 Usar cámara</Btn>
      </div>
      <div onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}} onDragEnter={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>isbnImgRef.current.click()}
        style={{border:`2px dashed ${dragOver?C.accent:C.border}`,borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",marginBottom:16,background:dragOver?C.accent+"22":"transparent",transition:"all 0.2s"}}>
        <div style={{fontSize:32,marginBottom:6}}>📷</div>
        <p style={{margin:"0 0 3px",fontSize:14,fontWeight:600,color:C.text}}>{dragOver?"Suelta la imagen aquí...":"Arrastra aquí una foto del ISBN, código de barras o portada"}</p>
        <p style={{margin:0,fontSize:12,color:C.textSec}}>o pulsa para seleccionar un archivo desde tu dispositivo</p>
        <input type="file" accept="image/*" ref={isbnImgRef} style={{display:"none"}} onChange={e=>handleFileInput(e.target.files[0])}/>
      </div>
      {busy&&<div style={{background:C.info+"22",color:C.info,border:`1px solid ${C.info}44`,borderRadius:8,padding:"9px 14px",marginBottom:12,fontSize:13}}>⏳ {busy}</div>}
      {corrections.length>0&&<div style={{background:C.success+"18",color:C.success,border:`1px solid ${C.success}44`,borderRadius:8,padding:"9px 14px",marginBottom:12,fontSize:13}}>
        <strong>✅ Correcciones aplicadas:</strong><ul style={{margin:"5px 0 0",paddingLeft:18}}>{corrections.map((c,i)=><li key={i}>{c}</li>)}</ul>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><label>Título *</label><input value={form.title} onChange={e=>set("title",e.target.value)}/></div>
        <div style={{gridColumn:"1/-1"}}><label>Autor(es) *</label><input value={form.author} onChange={e=>set("author",e.target.value)}/></div>
        {fld("Traductor","translator","text","Si es traducción")}
        {fld("Número de edición","edition","text","Ej: 3ª edición")}
        {fld("Año de esta edición","year","number")}
        {fld("Editorial","publisher")}
        <div><label>ISBN</label>
          <div style={{display:"flex",gap:8}}>
            <input value={form.isbn} onChange={e=>set("isbn",e.target.value)} placeholder="978-..." style={{flex:1}}/>
            <Btn onClick={()=>fetchByISBN(form.isbn)} disabled={!form.isbn||!!busy} small>Buscar</Btn>
          </div>
        </div>
        {fld("Idioma","language")}
        {sel("Género","genre",GENRES)}
        {sel("Clasificación Dewey","dewey",DEWEY)}
        {sel("Edad recomendada","age",AGES)}
        {sel("Situación de lectura","situation",SITUATIONS)}
        {sel("Estado del ejemplar","status",STATUSES)}
        <div>
          <label>Portada</label>
          {form.cover
            ?<div><img src={form.cover} alt="portada" style={{height:90,borderRadius:6,border:`1px solid ${C.border}`,display:"block",marginBottom:6}}/><Btn onClick={()=>set("cover","")} variant="ghost" small>Eliminar portada</Btn></div>
            :previewImage
              ?<div style={{background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
                <img src={previewImage} alt="previa" style={{height:80,borderRadius:4,display:"block",marginBottom:8,opacity:0.7}}/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="checkbox" id="usecover" checked={useAsCover} onChange={e=>setUseAsCover(e.target.checked)} style={{width:"auto",accentColor:C.accent}}/>
                  <label htmlFor="usecover" style={{fontSize:13,color:C.text,cursor:"pointer",margin:0}}>Usar como portada</label>
                </div>
                {useAsCover&&<Btn onClick={()=>{set("cover",previewImage);setPreviewImage(null);}} style={{marginTop:8,width:"100%"}} small>✔ Confirmar portada</Btn>}
              </div>
              :<div style={{background:C.inputBg,border:`1px dashed ${C.border}`,borderRadius:8,padding:"12px",textAlign:"center",fontSize:13,color:C.textSec}}>Sin portada — sube una imagen arriba</div>
          }
        </div>
        <div>
          <label>Tu valoración</label>
          <div style={{marginTop:8}}><Stars value={form.rating||0} size={30} onChange={n=>set("rating",n)}/>{form.rating>0&&<span onClick={()=>set("rating",0)} style={{fontSize:12,color:C.textSec,cursor:"pointer",marginLeft:8}}>Quitar</span>}</div>
        </div>
        <div style={{gridColumn:"1/-1"}}><label>Tu reseña personal</label><textarea value={form.review} onChange={e=>set("review",e.target.value)} rows={3} style={{resize:"vertical"}}/></div>
      </div>
      <div style={{marginTop:20,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:15,color:C.text}}>Historia editorial — primera edición</h3>
          <Btn onClick={()=>fetchEditorial(form.title,form.author)} disabled={!form.title||!form.author||!!busy} small variant="dark">{busy==="Buscando historia editorial..."?"Buscando...":"Buscar automáticamente"}</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Título original","originalTitle"],["Año primera publicación","firstYear"],["Lugar primera publicación","firstPlace"],["Formato original","format"],["Editorial original","originalPublisher"],["Idioma original","originalLanguage"]].map(([lb,key])=>(
            <div key={key}><label>{lb}</label><input value={form.editorial[key]||""} onChange={e=>setEd(key,e.target.value)}/></div>
          ))}
          <div style={{gridColumn:"1/-1"}}><label>Traducciones notables</label><input value={form.editorial.notableTranslations||""} onChange={e=>setEd("notableTranslations",e.target.value)}/></div>
          <div style={{gridColumn:"1/-1"}}><label>Detalles histórico-editoriales</label><textarea value={form.editorial.details||""} onChange={e=>setEd("details",e.target.value)} rows={3} style={{resize:"vertical"}}/></div>
          <div style={{gridColumn:"1/-1"}}><label>Fuentes (separadas por coma)</label><input value={Array.isArray(form.editorial.sources)?form.editorial.sources.join(", "):form.editorial.sources||""} onChange={e=>setEd("sources",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/></div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}>
        <Btn onClick={handleSave} disabled={!!busy} style={{flex:1}}>{busy==="Verificando y corrigiendo datos..."?"Verificando...":"✔ Guardar"}</Btn>
        <Btn onClick={onCancel} variant="ghost" style={{flex:1}}>Cancelar</Btn>
      </div>
    </div>
  );
}

// ── BOOK DETAIL ────────────────────────────────────────────────────────────────
function BookDetail({ book, onClose, onEdit, onDelete, canEdit, canDelete, canRate, currentUser, setBooks }) {
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [showRate, setShowRate] = useState(false);
  const avg = book.ratings?.length ? book.ratings.reduce((a,b)=>a+b.rating,0)/book.ratings.length : (book.rating||0);
  const statusColor = {"Disponible":C.success,"Prestado":C.warning,"En lectura":C.info,"Deteriorado":C.danger};
  const submitRating = async () => {
    if(!userRating) return;
    const nr=[...(book.ratings||[]),{userId:currentUser.id,name:currentUser.name,rating:userRating,review:userReview,date:new Date().toLocaleDateString("es-ES")}];
    await db.update("books",book.id,{ratings:JSON.stringify(nr)});
    setBooks(bs=>bs.map(b=>b.id===book.id?{...b,ratings:nr}:b));
    setShowRate(false);
  };
  return (
    <div style={{maxHeight:"85vh",overflowY:"auto",color:C.text}}>
      <div style={{display:"flex",gap:20,marginBottom:20}}>
        {book.cover?<img src={book.cover} alt="portada" style={{width:110,height:155,objectFit:"cover",borderRadius:8,flexShrink:0,border:`1px solid ${C.border}`}}/>
          :<div style={{width:110,height:155,background:C.inputBg,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:36,border:`1px solid ${C.border}`}}>📚</div>}
        <div style={{flex:1}}>
          <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 4px"}}>{book.title}</h2>
          <p style={{margin:"0 0 2px",color:C.accent,fontWeight:600}}>{book.author}</p>
          {book.translator&&<p style={{margin:"0 0 10px",fontSize:13,color:C.textSec}}>Trad. {book.translator}</p>}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
            <Badge color={statusColor[book.status]}>{book.status}</Badge>
            <Badge color={C.accent}>{book.genre}</Badge>
            <Badge color="#9b59b6">{book.age}</Badge>
          </div>
          <div style={{fontSize:13,color:C.textSec,lineHeight:2}}>
            {book.dewey&&<div>📂 {book.dewey}</div>}
            {book.edition&&<div>📌 {book.edition}</div>}
            {book.year&&<div>📅 {book.year}{book.publisher?` · ${book.publisher}`:""}</div>}
            {book.language&&<div>🌐 {book.language}</div>}
            {book.isbn&&<div>🔢 ISBN: {book.isbn}</div>}
            {book.situation&&<div>💡 {book.situation}</div>}
          </div>
        </div>
      </div>
      {book.review&&<div style={{background:C.inputBg,borderRadius:10,padding:"12px 16px",marginBottom:14,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>RESEÑA PERSONAL</div>
        <p style={{margin:0,fontSize:14,lineHeight:1.6}}>{book.review}</p>
      </div>}
      {book.editorial?.firstYear&&<div style={{background:C.inputBg,borderRadius:10,padding:"14px 16px",marginBottom:14,border:`1px solid ${C.border}`}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",color:C.accent}}>HISTORIA EDITORIAL — PRIMERA EDICIÓN</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px",fontSize:13}}>
          {[["Título original","originalTitle"],["Primera publicación","firstYear"],["Lugar","firstPlace"],["Formato","format"],["Editorial original","originalPublisher"],["Idioma original","originalLanguage"],["Traducciones","notableTranslations"]].map(([lb,key])=>
            book.editorial[key]?[<span key={lb} style={{color:C.textSec}}>{lb}</span>,<span key={key}>{book.editorial[key]}</span>]:null
          )}
        </div>
        {book.editorial.details&&<p style={{fontSize:13,margin:"12px 0 6px",borderTop:`1px solid ${C.border}`,paddingTop:10,lineHeight:1.6}}>{book.editorial.details}</p>}
        {book.editorial.sources?.length>0&&<div style={{fontSize:12,color:C.textSec}}>Fuentes: {book.editorial.sources.join(" · ")}</div>}
      </div>}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <h3 style={{fontSize:14,fontWeight:700,margin:0}}>VALORACIONES ({book.ratings?.length||0})</h3>
          {canRate&&!showRate&&<Btn onClick={()=>setShowRate(true)} small>Valorar</Btn>}
        </div>
        <div style={{marginBottom:10}}><Stars value={Math.round(avg)} size={20}/><span style={{color:C.textSec,fontSize:13,marginLeft:8}}>{avg>0?Number(avg).toFixed(1):"-"}/5</span></div>
        {showRate&&<div style={{background:C.inputBg,borderRadius:10,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
          <div style={{marginBottom:10}}><Stars value={userRating} size={28} onChange={setUserRating}/></div>
          <textarea value={userReview} onChange={e=>setUserReview(e.target.value)} placeholder="Tu opinión (opcional)..." rows={2} style={{resize:"none"}}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <Btn onClick={submitRating} style={{flex:1}} small>Guardar</Btn>
            <Btn onClick={()=>setShowRate(false)} variant="ghost" style={{flex:1}} small>Cancelar</Btn>
          </div>
        </div>}
        {book.ratings?.map((r,i)=><div key={i} style={{borderTop:`1px solid ${C.border}`,padding:"10px 0",fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600}}>{r.name}</span><span style={{color:C.textSec}}>{r.date}</span></div>
          <Stars value={r.rating} size={15}/>
          {r.review&&<p style={{margin:"5px 0 0",color:C.textSec}}>{r.review}</p>}
        </div>)}
      </div>
      <div style={{display:"flex",gap:10}}>
        {canEdit&&<Btn onClick={onEdit} variant="dark" style={{flex:1}} small>✏️ Editar</Btn>}
        {canDelete&&<Btn onClick={onDelete} variant="danger" style={{flex:1}} small>🗑 Eliminar</Btn>}
        <Btn onClick={onClose} variant="ghost" style={{flex:1}} small>Cerrar</Btn>
      </div>
    </div>
  );
}

// ── USER MANAGEMENT ────────────────────────────────────────────────────────────
function UserMgmt({ users, setUsers, currentUser, onClose }) {
  const [form, setForm] = useState({name:"",email:"",password:"",role:"user"});
  const addUser = async () => {
    if(!form.name||!form.email||!form.password) return;
    if(users.find(u=>u.email===form.email)) return;
    const res = await db.insert("users",{...form,active:true});
    if(res[0]) setUsers(us=>[...us,res[0]]);
    setForm({name:"",email:"",password:"",role:"user"});
  };
  const updateRole = async (id,role) => { await db.update("users",id,{role}); setUsers(us=>us.map(u=>u.id===id?{...u,role}:u)); };
  const toggleActive = async (id,active) => { await db.update("users",id,{active:!active}); setUsers(us=>us.map(u=>u.id===id?{...u,active:!active}:u)); };
  return (
    <div style={{color:C.text}}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>Gestión de usuarios</h2>
      {users.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:14}}>
        <div><span style={{fontWeight:600}}>{u.name}</span><span style={{color:C.textSec,marginLeft:10}}>{u.email}</span>{!u.active&&<Badge color={C.danger}>Inactivo</Badge>}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} disabled={u.id===currentUser.id} style={{width:"auto"}}>{Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          {u.id!==currentUser.id&&<Btn onClick={()=>toggleActive(u.id,u.active)} variant={u.active?"danger":"success"} small>{u.active?"Desactivar":"Activar"}</Btn>}
        </div>
      </div>)}
      <h3 style={{fontSize:15,fontWeight:700,margin:"18px 0 12px"}}>Añadir usuario</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label>Nombre</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
        <div><label>Email</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
        <div><label>Contraseña</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
        <div><label>Rol</label><select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>{Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={addUser} style={{flex:1}}>Añadir usuario</Btn>
        <Btn onClick={onClose} variant="ghost" style={{flex:1}}>Cerrar</Btn>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
function App() {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({genre:"",dewey:"",age:"",status:"",situation:""});
  const [sortBy, setSortBy] = useState("title");
  const [selectedBook, setSelectedBook] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [loginData, setLoginData] = useState({email:"",password:""});
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState("");
  const [activeSection, setActiveSection] = useState("catalog");

  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const can = (a) => {
    if(!currentUser) return false; const r=currentUser.role;
    if(a==="add"||a==="edit") return r==="admin"||r==="editor";
    if(a==="delete"||a==="manageUsers") return r==="admin";
    if(a==="rate") return r==="admin"||r==="editor"||r==="user";
    return true;
  };

  useEffect(()=>{
    (async()=>{
      const [bks,usrs] = await Promise.all([db.get("books"),db.get("users")]);
      setBooks(bks.map(b=>({...b,editorial:typeof b.editorial==="string"?JSON.parse(b.editorial||"{}"):b.editorial||{},ratings:typeof b.ratings==="string"?JSON.parse(b.ratings||"[]"):b.ratings||[]})));
      setUsers(usrs);
      setLoading(false);
    })();
  },[]);

  const handleLogin = () => {
    const u=users.find(u=>u.email===loginData.email&&u.password===loginData.password&&u.active);
    if(u){setCurrentUser(u);setLoginError("");}
    else setLoginError("Email o contraseña incorrectos");
  };

  const filtered = books.filter(b=>{
    const q=search.toLowerCase();
    const ms=!q||[b.title,b.author,b.genre,b.dewey,b.translator].some(f=>(f||"").toLowerCase().includes(q));
    return ms&&(!filters.genre||b.genre===filters.genre)&&(!filters.dewey||b.dewey===filters.dewey)&&(!filters.age||b.age===filters.age)&&(!filters.status||b.status===filters.status)&&(!filters.situation||b.situation===filters.situation);
  }).sort((a,b)=>{
    if(sortBy==="title") return (a.title||"").localeCompare(b.title||"");
    if(sortBy==="author") return (a.author||"").localeCompare(b.author||"");
    if(sortBy==="year") return (a.year||0)-(b.year||0);
    if(sortBy==="rating") return (b.rating||0)-(a.rating||0);
    return 0;
  });

  const stats = {total:books.length,available:books.filter(b=>b.status==="Disponible").length,reading:books.filter(b=>b.status==="En lectura").length,loaned:books.filter(b=>b.status==="Prestado").length};
  const sideItems = [{id:"catalog",icon:"📚",label:"Catálogo"},{id:"stats",icon:"📊",label:"Estadísticas"},...(can("manageUsers")?[{id:"users",icon:"👥",label:"Usuarios"}]:[])];

  if(!currentUser) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{css}</style>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"2.5rem 2rem",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>📚</div>
          <h1 style={{fontSize:22,fontWeight:700,margin:0,color:C.text}}>Mi Biblioteca</h1>
          <p style={{fontSize:13,color:C.textSec,margin:"6px 0 0"}}>Catálogo personal de libros</p>
        </div>
        {loading
          ?<p style={{textAlign:"center",color:C.textSec}}>Conectando...</p>
          :<>
            <label>Email</label>
            <input type="email" value={loginData.email} onChange={e=>setLoginData(d=>({...d,email:e.target.value}))} placeholder="tu@email.com" style={{marginBottom:12}}/>
            <label>Contraseña</label>
            <input type="password" value={loginData.password} onChange={e=>setLoginData(d=>({...d,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••" style={{marginBottom:18}}/>
            {loginError&&<p style={{color:C.danger,fontSize:13,margin:"0 0 12px"}}>{loginError}</p>}
            <Btn onClick={handleLogin} style={{width:"100%",padding:"11px"}}>Entrar</Btn>
            <p style={{fontSize:12,color:C.textSec,textAlign:"center",marginTop:16}}>Admin: admin@biblioteca.com / 1234</p>
          </>
        }
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text}}>
      <style>{css}</style>
      <div style={{width:220,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"24px 20px 20px"}}>
          <div style={{fontSize:28,marginBottom:6}}>📚</div>
          <h1 style={{fontSize:16,fontWeight:700,margin:0,color:C.text}}>Mi Biblioteca</h1>
          <p style={{fontSize:12,color:C.textSec,margin:"3px 0 6px"}}>{currentUser.name}</p>
          <Badge color={C.accent}>{ROLES[currentUser.role]}</Badge>
        </div>
        <nav style={{flex:1,padding:"0 12px"}}>
          {sideItems.map(item=><div key={item.id} onClick={()=>setActiveSection(item.id)}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:activeSection===item.id?C.accent+"22":"transparent",color:activeSection===item.id?C.accent:C.textSec,fontWeight:activeSection===item.id?600:400,fontSize:14,transition:"all 0.15s"}}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>)}
        </nav>
        <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`}}>
          <Btn onClick={()=>setCurrentUser(null)} variant="ghost" style={{width:"100%",fontSize:13}}>Cerrar sesión</Btn>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{activeSection==="catalog"?"Catálogo":activeSection==="stats"?"Estadísticas":"Usuarios"}</h2>
            <p style={{margin:0,fontSize:12,color:C.textSec}}>{books.length} ejemplares guardados en la nube ☁️</p>
          </div>
          {can("add")&&activeSection==="catalog"&&<div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>{setEditBook(null);setShowScanner(true);setShowForm(false);}} variant="dark">📷 Escanear</Btn>
            <Btn onClick={()=>{setEditBook(null);setShowForm(true);setShowScanner(false);}}>+ Añadir libro</Btn>
          </div>}
        </div>

        {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:999,background:C.success,color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>✅ {toast}</div>}

        <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
          {activeSection==="stats"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:24}}>
              {[["Total",stats.total,C.accent,"📚"],["Disponibles",stats.available,C.success,"✅"],["En lectura",stats.reading,C.info,"📖"],["Prestados",stats.loaned,C.warning,"🔄"]].map(([lb,val,col,ic])=>(
                <Card key={lb}><div style={{fontSize:28,marginBottom:8}}>{ic}</div><div style={{fontSize:32,fontWeight:700,color:col}}>{val}</div><div style={{fontSize:13,color:C.textSec}}>{lb}</div></Card>
              ))}
            </div>
            <Card><h3 style={{margin:"0 0 14px",color:C.text}}>Por género</h3>
              {Object.entries(books.reduce((acc,b)=>{acc[b.genre]=(acc[b.genre]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).map(([g,n])=>(
                <div key={g} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}><span>{g}</span><span style={{color:C.textSec}}>{n}</span></div>
                  <div style={{height:6,background:C.border,borderRadius:3}}><div style={{height:6,background:C.accent,borderRadius:3,width:`${(n/books.length)*100}%`}}/></div>
                </div>
              ))}
            </Card>
          </div>}

          {activeSection==="users"&&<Card><UserMgmt users={users} setUsers={setUsers} currentUser={currentUser} onClose={()=>setActiveSection("catalog")}/></Card>}

          {activeSection==="catalog"&&<>
            {showScanner&&<Card style={{marginBottom:20}}><Scanner onResult={r=>{setShowScanner(false);setEditBook({_scan:r});setShowForm(true);}} onClose={()=>setShowScanner(false)}/></Card>}
            {showForm&&<Card style={{marginBottom:20}}><BookForm initial={editBook} onScan={()=>{setShowForm(false);setShowScanner(true);}}
              onSave={async form=>{
                const clean={...form};delete clean._scan;
                const payload={...clean,editorial:JSON.stringify(clean.editorial||{}),ratings:JSON.stringify(clean.ratings||[])};
                if(editBook?.id){await db.update("books",editBook.id,payload);setBooks(bs=>bs.map(b=>b.id===editBook.id?{...b,...clean}:b));notify("Libro actualizado");}
                else{const res=await db.insert("books",{...payload,added_by:currentUser.id});if(res[0])setBooks(bs=>[...bs,{...res[0],editorial:clean.editorial,ratings:clean.ratings||[]}]);notify("Libro añadido");}
                setShowForm(false);setEditBook(null);
              }}
              onCancel={()=>{setShowForm(false);setEditBook(null);}}/></Card>}
            {selectedBook&&<Card style={{marginBottom:20}}><BookDetail book={selectedBook} onClose={()=>setSelectedBook(null)}
              onEdit={()=>{setEditBook(selectedBook);setShowForm(true);setSelectedBook(null);}}
              onDelete={async()=>{await db.delete("books",selectedBook.id);setBooks(bs=>bs.filter(b=>b.id!==selectedBook.id));setSelectedBook(null);notify("Libro eliminado");}}
              canEdit={can("edit")} canDelete={can("delete")} canRate={can("rate")}
              currentUser={currentUser} setBooks={setBooks}/></Card>}

            <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por título, autor, traductor, tema..." style={{flex:1,minWidth:220}}/>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:"auto"}}>
                <option value="title">Título</option><option value="author">Autor</option><option value="year">Año</option><option value="rating">Valoración</option>
              </select>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
              {[{l:"Género",k:"genre",o:GENRES},{l:"Dewey",k:"dewey",o:DEWEY},{l:"Edad",k:"age",o:AGES},{l:"Estado",k:"status",o:STATUSES},{l:"Situación",k:"situation",o:SITUATIONS}].map(f=>(
                <select key={f.k} value={filters[f.k]} onChange={e=>setFilters(fs=>({...fs,[f.k]:e.target.value}))} style={{width:"auto",fontSize:12}}>
                  <option value="">{f.l}: todos</option>{f.o.map(o=><option key={o}>{o}</option>)}
                </select>
              ))}
              {Object.values(filters).some(Boolean)&&<Btn onClick={()=>setFilters({genre:"",dewey:"",age:"",status:"",situation:""})} variant="ghost" small>✕ Limpiar</Btn>}
            </div>
            <p style={{fontSize:13,color:C.textSec,marginBottom:14}}>{filtered.length} de {books.length} ejemplares</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:14}}>
              {filtered.map(book=>{
                const avg=book.ratings?.length?book.ratings.reduce((a,b)=>a+b.rating,0)/book.ratings.length:(book.rating||0);
                const sCol={"Disponible":C.success,"Prestado":C.warning,"En lectura":C.info,"Deteriorado":C.danger};
                return <div key={book.id} onClick={()=>setSelectedBook(book)}
                  style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,cursor:"pointer",transition:"all 0.18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.3)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  {book.cover?<img src={book.cover} alt="" style={{width:"100%",height:120,objectFit:"cover",borderRadius:8,marginBottom:10}}/>
                    :<div style={{width:"100%",height:90,background:C.inputBg,borderRadius:8,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>📖</div>}
                  <p style={{fontWeight:700,fontSize:14,margin:"0 0 3px",lineHeight:1.3,color:C.text,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{book.title}</p>
                  <p style={{fontSize:12,color:C.accent,margin:"0 0 2px",fontWeight:500}}>{book.author}</p>
                  {book.translator&&<p style={{fontSize:11,color:C.textSec,margin:"0 0 6px"}}>Trad. {book.translator}</p>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                    <span style={{fontSize:11,color:C.textSec}}>{book.genre}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:sCol[book.status],fontSize:8}}>●</span>
                      {avg>0&&<span style={{fontSize:12,color:C.gold}}>{"★".repeat(Math.round(avg))}</span>}
                    </div>
                  </div>
                </div>;
              })}
            </div>
            {filtered.length===0&&<div style={{textAlign:"center",padding:"4rem 1rem",color:C.textSec}}>
              <div style={{fontSize:48,marginBottom:14}}>🔍</div>
              <p style={{fontSize:16}}>No se encontraron ejemplares.</p>
              {can("add")&&<Btn onClick={()=>{setEditBook(null);setShowForm(true);}}>Añadir el primero</Btn>}
            </div>}
          </>}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

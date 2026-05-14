import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";

// ── SUPABASE ───────────────────────────────────────────────────────────────────
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

// ── ESTILOS ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#1a1f2e", sidebar:"#16213e", card:"#1e2640",
  accent:"#4f8ef7", success:"#2ecc71", warning:"#f39c12",
  danger:"#e74c3c", info:"#3498db", text:"#e8eaf0", textSec:"#8892a4",
  border:"#2a3352", inputBg:"#141929", gold:"#f0c040"
};

const css = `
  *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html, body, #root { margin:0; padding:0; width:100%; height:100%; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:${C.bg}; color:${C.text}; }
  input,select,textarea { background:${C.inputBg}; color:${C.text}; border:1px solid ${C.border}; border-radius:8px; padding:10px 12px; font-size:16px; width:100%; outline:none; transition:border-color 0.2s; -webkit-appearance:none; appearance:none; }
  input:focus,select:focus,textarea:focus { border-color:${C.accent}; }
  select { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238892a4' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
  select option { background:${C.inputBg}; }
  label { font-size:12px; color:${C.textSec}; display:block; margin-bottom:4px; font-weight:500; }
  button { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:${C.bg};} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
`;

const Btn = ({ children, onClick, disabled, variant="primary", style={}, small=false, full=false }) => {
  const base = { border:"none", borderRadius:10, cursor:disabled?"not-allowed":"pointer", fontWeight:600, fontSize:small?13:15, padding:small?"8px 16px":"11px 20px", transition:"all 0.18s", opacity:disabled?0.5:1, width:full?"100%":"auto", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, ...style };
  const v = { primary:{background:C.accent,color:"#fff"}, success:{background:C.success,color:"#fff"}, danger:{background:C.danger,color:"#fff"}, ghost:{background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}, dark:{background:C.border,color:C.text} };
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}} disabled={disabled}>{children}</button>;
};
const Card = ({ children, style={} }) => <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:"1.2rem", ...style }}>{children}</div>;
const Badge = ({ children, color=C.accent }) => <span style={{ background:color+"22", color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, border:`1px solid ${color}44`, whiteSpace:"nowrap" }}>{children}</span>;
const Stars = ({ value=0, size=16, onChange }) => <span>{[1,2,3,4,5].map(n=><span key={n} onClick={()=>onChange&&onChange(n)} style={{ fontSize:size, cursor:onChange?"pointer":"default", color:n<=value?C.gold:"#2a3352", padding:"0 1px" }}>★</span>)}</span>;

// ── NETLIFY FUNCTIONS ──────────────────────────────────────────────────────────
async function searchByISBN(isbn) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isbn: isbn.replace(/-/g,"") })
  });
  return r.json();
}

async function analyzeImage(base64) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });
  return r.json();
}

// ── SCANNER ────────────────────────────────────────────────────────────────────
function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const startCamera = async () => {
    try {
      setStatus("Solicitando permiso de cámara...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.onloadedmetadata = async () => {
        try {
          await video.play();
          setReady(true);
          setStatus("Cámara lista — apunta al código de barras");
          if ("BarcodeDetector" in window) {
            detectorRef.current = new BarcodeDetector({ formats:["ean_13","ean_8","upc_a","upc_e","code_128"] });
            const scan = async () => {
              if (!videoRef.current) return;
              try {
                const codes = await detectorRef.current.detect(videoRef.current);
                if (codes.length) { stop(); onResult({ type:"isbn", value:codes[0].rawValue }); return; }
              } catch(_) {}
              rafRef.current = requestAnimationFrame(scan);
            };
            rafRef.current = requestAnimationFrame(scan);
            setStatus("Detección activa — apunta al código de barras");
          }
        } catch(e) {
          setError("Error al reproducir vídeo: " + e.message);
        }
      };
    } catch(e) {
      setError("No se pudo acceder a la cámara: " + e.message);
      setStatus("Error de cámara");
    }
  };

  useEffect(() => {
    startCamera();
    return stop;
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0);
    stop();
    onResult({ type:"image", value: c.toDataURL("image/jpeg", 0.9) });
  };

  return (
    <div style={{ textAlign:"center", color:C.text }}>
      <h3 style={{ margin:"0 0 8px", fontSize:17 }}>Escanear libro</h3>
      <p style={{ fontSize:13, color:C.textSec, marginBottom:8 }}>{status}</p>
      {error && <p style={{ fontSize:12, color:C.danger, marginBottom:8, padding:"8px", background:C.danger+"22", borderRadius:8 }}>{error}</p>}
      <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#111", marginBottom:12, minHeight:200 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", maxHeight:320, display:"block", objectFit:"cover" }} />
        {ready && <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"25%", left:"10%", right:"10%", bottom:"25%", border:`3px solid ${C.success}`, borderRadius:8 }} />
          <div style={{ position:"absolute", bottom:10, left:0, right:0, color:"#fff", fontSize:11 }}>Centra el código de barras en el recuadro</div>
        </div>}
        {!ready && !error && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:C.textSec, fontSize:13 }}>Iniciando...</div>}
      </div>
      <canvas ref={canvasRef} style={{ display:"none" }} />
      <Btn onClick={capture} full style={{ marginBottom:10 }} disabled={!ready}>📸 Capturar foto del código</Btn>
      <Btn onClick={() => { stop(); onClose(); }} variant="ghost" full>Cancelar</Btn>
    </div>
  );
}

// ── BOOK FORM ──────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  title:"", author:"", year:"", publisher:"", isbn:"", genre:"Novela", dewey:"800 - Literatura",
  language:"Español", age:"Adulto", situation:"Ocio y entretenimiento", status:"Disponible",
  cover:"", review:"", translator:"", edition:"", rating:0,
  editorial:{ originalTitle:"", firstYear:"", firstPlace:"", format:"", originalPublisher:"",
    originalLanguage:"", notableTranslations:"", details:"", sources:[] }
});

function BookForm({ initial, onSave, onCancel, onScan }) {
  const [form, setForm] = useState(initial || emptyForm());
  const [busy, setBusy] = useState("");
  const [corrections, setCorrections] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [useAsCover, setUseAsCover] = useState(false);
  const [tab, setTab] = useState("basic");
  const fileRef = useRef();

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setEd = (k,v) => setForm(f=>({...f,editorial:{...f.editorial,[k]:v}}));
  const toBase64 = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(f); });

  // ── ANALIZAR IMAGEN ──────────────────────────────────────────────────────────
  const processImage = async (dataUrl) => {
    setBusy("Analizando imagen con IA...");
    setPreviewImage(dataUrl);
    setUseAsCover(false);
    try {
      // Reducir tamaño de imagen antes de enviar (máx 1MB)
      const compressed = await compressImage(dataUrl, 800, 0.7);
      const base64 = compressed.split(",")[1];
      const r = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 })
      });
      if (!r.ok) {
        const err = await r.text();
        console.error("Function error:", err);
        setBusy("");
        return;
      }
      const parsed = await r.json();
      console.log("Image analysis result:", parsed);
      if (!parsed?.found) { setPreviewImage(null); setBusy(""); return; }
      setUseAsCover(parsed.isCover === true);
      setForm(f => {
        const m = {...f};
        if (parsed.title) m.title = parsed.title;
        if (parsed.author) m.author = parsed.author;
        if (parsed.year) m.year = parsed.year;
        if (parsed.publisher) m.publisher = parsed.publisher;
        if (parsed.isbn) m.isbn = parsed.isbn;
        if (parsed.language) m.language = parsed.language;
        if (parsed.translator) m.translator = parsed.translator;
        if (parsed.edition) m.edition = parsed.edition;
        return m;
      });
      if (parsed.isbn) {
        await fetchByISBN(parsed.isbn, false);
      } else if (parsed.title && parsed.author) {
        console.log("Buscando ISBN por título+autor:", parsed.title, parsed.author);
        try {
          const r = await fetch("/api/claude", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: parsed.title, author: parsed.author })
          });
          const d = await r.json();
          console.log("Resultado búsqueda inversa:", d);
          if (d.found) {
            setForm(f => ({...f,
              isbn: d.isbn || f.isbn,
              year: d.year || f.year,
              publisher: d.publisher || f.publisher,
              language: d.language || f.language,
              genre: d.genre || f.genre,
              cover: f.cover || d.cover || "",
            }));
          }
        } catch(e) { console.error("Error búsqueda inversa:", e); }
        await fetchEditorial(parsed.title, parsed.author);
      }
    } catch(e) { console.error("Error analizando imagen:", e); }
    setBusy("");
  };

  const compressImage = (dataUrl, maxWidth, quality) => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      res(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });

  // ── BUSCAR POR ISBN ──────────────────────────────────────────────────────────
  const fetchByISBN = async (isbn, updateIsbn=true) => {
    setBusy("Buscando datos por ISBN...");
    let found = false;
    try {
      const d = await searchByISBN(isbn);
      if (d.found && d.title) {
        setForm(f => ({...f,
          title: d.title || f.title,
          author: d.author || f.author,
          year: d.year || f.year,
          publisher: d.publisher || f.publisher,
          language: d.language || f.language,
          genre: d.genre || f.genre,
          cover: d.cover || f.cover,
          ...(updateIsbn ? {isbn} : {})
        }));
        found = true;
      }
    } catch(_) {}

    if (!found) {
      try {
        const clean = isbn.replace(/-/g,"");
        const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`);
        const d = await r.json();
        const b = d[`ISBN:${clean}`];
        if (b?.title) {
          setForm(f => ({...f,
            title: b.title || f.title,
            author: b.authors?.map(a=>a.name).join(", ") || f.author,
            year: b.publish_date ? parseInt(b.publish_date) || f.year : f.year,
            publisher: b.publishers?.[0]?.name || f.publisher,
            ...(updateIsbn ? {isbn} : {})
          }));
          found = true;
        }
      } catch(_) {}
    }

    if (updateIsbn && !found) {
      setForm(f => ({...f, isbn}));
      alert("No se encontró el libro. Rellena los datos manualmente.");
    }
    setForm(f => { if(f.title && f.author) fetchEditorial(f.title, f.author); return f; });
    setBusy("");
  };

  // ── HISTORIA EDITORIAL ───────────────────────────────────────────────────────
  const fetchEditorial = async (title, author) => {
    setBusy("Buscando historia editorial...");
    try {
      const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`);
      const d = await r.json();
      const b = d.docs?.[0];
      if (b) {
        setForm(f => ({...f, editorial: {...f.editorial,
          originalTitle: b.title || f.editorial.originalTitle,
          firstYear: b.first_publish_year || f.editorial.firstYear,
          originalLanguage: b.language?.[0] || f.editorial.originalLanguage,
          originalPublisher: b.publisher?.[0] || f.editorial.originalPublisher,
        }}));
      }
    } catch(_) {}
    setBusy("");
  };

  // ── GUARDAR ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title || !form.author) { alert("Título y autor son obligatorios"); return; }
    setBusy("Guardando...");
    onSave(form);
  };

  const handleFile = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    const d = await toBase64(file);
    processImage(d);
  };

  const fld = (label,key,type="text",ph="") => (
    <div><label>{label}</label><input type={type} value={form[key]||""} onChange={e=>set(key,e.target.value)} placeholder={ph}/></div>
  );
  const sel = (label,key,opts) => (
    <div><label>{label}</label><select value={form[key]||""} onChange={e=>set(key,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
  );

  return (
    <div style={{ color:C.text }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <h2 style={{ margin:0, fontSize:17 }}>{initial?.id ? "Editar" : "Añadir libro"}</h2>
        <Btn onClick={onScan} variant="dark" small>📷 Cámara</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, background:C.inputBg, borderRadius:10, padding:4 }}>
        {["basic","editorial","cover"].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, border:"none", borderRadius:8, padding:"8px 4px", fontSize:12, fontWeight:600, cursor:"pointer", background:tab===t?C.accent:"transparent", color:tab===t?"#fff":C.textSec, transition:"all 0.2s" }}>
            {t==="basic"?"📋 Datos":t==="editorial"?"📖 Historia":"🖼 Portada"}
          </button>
        ))}
      </div>

      {busy && <div style={{ background:C.info+"22", color:C.info, border:`1px solid ${C.info}44`, borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13 }}>⏳ {busy}</div>}
      {corrections.length > 0 && <div style={{ background:C.success+"18", color:C.success, border:`1px solid ${C.success}44`, borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13 }}>
        <strong>✅ Correcciones:</strong><ul style={{ margin:"5px 0 0", paddingLeft:18 }}>{corrections.map((c,i)=><li key={i}>{c}</li>)}</ul>
      </div>}

      {/* Tab Datos */}
      {tab === "basic" && <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div><label>Título *</label><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Título del libro"/></div>
        <div><label>Autor(es) *</label><input value={form.author} onChange={e=>set("author",e.target.value)} placeholder="Nombre del autor"/></div>
        {fld("Traductor","translator","text","Si es traducción")}
        {fld("Edición","edition","text","Ej: 3ª edición")}
        {fld("Año","year","number")}
        {fld("Editorial","publisher")}
        <div><label>ISBN</label>
          <div style={{ display:"flex", gap:8 }}>
            <input value={form.isbn} onChange={e=>set("isbn",e.target.value)} placeholder="978-..." style={{ flex:1 }}/>
            <Btn onClick={()=>fetchByISBN(form.isbn)} disabled={!form.isbn||!!busy} small>Buscar</Btn>
          </div>
        </div>
        {fld("Idioma","language")}
        {sel("Género","genre",GENRES)}
        {sel("Clasificación Dewey","dewey",DEWEY)}
        {sel("Edad recomendada","age",AGES)}
        {sel("Situación de lectura","situation",SITUATIONS)}
        {sel("Estado","status",STATUSES)}
        <div><label>Tu valoración</label>
          <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
            <Stars value={form.rating||0} size={32} onChange={n=>set("rating",n)}/>
            {form.rating > 0 && <span onClick={()=>set("rating",0)} style={{ fontSize:12, color:C.textSec, cursor:"pointer" }}>Quitar</span>}
          </div>
        </div>
        <div><label>Tu reseña personal</label><textarea value={form.review} onChange={e=>set("review",e.target.value)} rows={3} style={{ resize:"vertical" }}/></div>
      </div>}

      {/* Tab Historia */}
      {tab === "editorial" && <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Btn onClick={()=>fetchEditorial(form.title,form.author)} disabled={!form.title||!form.author||!!busy} full variant="dark">
          {busy==="Buscando historia editorial..."?"Buscando...":"🔍 Buscar automáticamente"}
        </Btn>
        {[["Título original","originalTitle"],["Año primera pub.","firstYear"],["Lugar primera pub.","firstPlace"],["Formato original","format"],["Editorial original","originalPublisher"],["Idioma original","originalLanguage"],["Traducciones notables","notableTranslations"]].map(([lb,key])=>(
          <div key={key}><label>{lb}</label><input value={form.editorial[key]||""} onChange={e=>setEd(key,e.target.value)}/></div>
        ))}
        <div><label>Detalles histórico-editoriales</label><textarea value={form.editorial.details||""} onChange={e=>setEd("details",e.target.value)} rows={4} style={{ resize:"vertical" }}/></div>
        <div><label>Fuentes (separadas por coma)</label><input value={Array.isArray(form.editorial.sources)?form.editorial.sources.join(", "):form.editorial.sources||""} onChange={e=>setEd("sources",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/></div>
      </div>}

      {/* Tab Portada */}
      {tab === "cover" && <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current.click()}
          style={{ border:`2px dashed ${dragOver?C.accent:C.border}`, borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", background:dragOver?C.accent+"11":"transparent", transition:"all 0.2s" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📷</div>
          <p style={{ margin:"0 0 4px", fontSize:14, fontWeight:600, color:C.text }}>Toca para subir una foto</p>
          <p style={{ margin:0, fontSize:12, color:C.textSec }}>Portada, contraportada o código de barras</p>
          <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
        </div>

        {previewImage && !form.cover && (
          <div style={{ background:C.inputBg, borderRadius:10, padding:14, border:`1px solid ${C.border}` }}>
            <img src={previewImage} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"contain", borderRadius:8, marginBottom:10 }}/>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <input type="checkbox" checked={useAsCover} onChange={e=>setUseAsCover(e.target.checked)} style={{ width:20, height:20, accentColor:C.accent }}/>
              <span style={{ fontSize:14, color:C.text, cursor:"pointer" }} onClick={()=>setUseAsCover(v=>!v)}>Usar como portada del libro</span>
            </div>
            {useAsCover && <Btn onClick={()=>{set("cover",previewImage);setPreviewImage(null);}} full>✔ Confirmar portada</Btn>}
          </div>
        )}

        {form.cover && (
          <div style={{ textAlign:"center" }}>
            <img src={form.cover} alt="portada" style={{ maxHeight:200, borderRadius:10, border:`1px solid ${C.border}`, marginBottom:10 }}/>
            <Btn onClick={()=>set("cover","")} variant="ghost" full>Eliminar portada</Btn>
          </div>
        )}
      </div>}

      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <Btn onClick={handleSave} disabled={!!busy} style={{ flex:1 }}>✔ Guardar</Btn>
        <Btn onClick={onCancel} variant="ghost" style={{ flex:1 }}>Cancelar</Btn>
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
  const sCol = { "Disponible":C.success, "Prestado":C.warning, "En lectura":C.info, "Deteriorado":C.danger };

  const submitRating = async () => {
    if (!userRating) return;
    const nr = [...(book.ratings||[]), { userId:currentUser.id, name:currentUser.name, rating:userRating, review:userReview, date:new Date().toLocaleDateString("es-ES") }];
    await db.update("books", book.id, { ratings:JSON.stringify(nr) });
    setBooks(bs=>bs.map(b=>b.id===book.id?{...b,ratings:nr}:b));
    setShowRate(false);
  };

  return (
    <div style={{ color:C.text }}>
      <div style={{ display:"flex", gap:16, marginBottom:18 }}>
        {book.cover
          ? <img src={book.cover} alt="portada" style={{ width:90, height:130, objectFit:"cover", borderRadius:8, flexShrink:0, border:`1px solid ${C.border}` }}/>
          : <div style={{ width:90, height:130, background:C.inputBg, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:30, border:`1px solid ${C.border}` }}>📚</div>}
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:17, fontWeight:700, margin:"0 0 4px", lineHeight:1.3 }}>{book.title}</h2>
          <p style={{ margin:"0 0 2px", color:C.accent, fontWeight:600, fontSize:14 }}>{book.author}</p>
          {book.translator && <p style={{ margin:"0 0 8px", fontSize:12, color:C.textSec }}>Trad. {book.translator}</p>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
            <Badge color={sCol[book.status]}>{book.status}</Badge>
            <Badge color={C.accent}>{book.genre}</Badge>
          </div>
          <div style={{ fontSize:12, color:C.textSec, lineHeight:1.9 }}>
            {book.dewey && <div>📂 {book.dewey}</div>}
            {book.year && <div>📅 {book.year}{book.publisher?` · ${book.publisher}`:""}</div>}
            {book.isbn && <div>🔢 {book.isbn}</div>}
            {book.situation && <div>💡 {book.situation}</div>}
          </div>
        </div>
      </div>

      {book.review && <div style={{ background:C.inputBg, borderRadius:10, padding:"12px 14px", marginBottom:14, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.textSec, marginBottom:5 }}>RESEÑA PERSONAL</div>
        <p style={{ margin:0, fontSize:14, lineHeight:1.6 }}>{book.review}</p>
      </div>}

      {book.editorial?.firstYear && <div style={{ background:C.inputBg, borderRadius:10, padding:"12px 14px", marginBottom:14, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.accent, marginBottom:10 }}>HISTORIA EDITORIAL</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px", fontSize:12 }}>
          {[["Título original","originalTitle"],["Primera pub.","firstYear"],["Lugar","firstPlace"],["Formato","format"],["Editorial orig.","originalPublisher"],["Idioma orig.","originalLanguage"],["Traducciones","notableTranslations"]].map(([lb,key])=>
            book.editorial[key]?[<span key={lb} style={{ color:C.textSec }}>{lb}</span>,<span key={key}>{book.editorial[key]}</span>]:null
          )}
        </div>
        {book.editorial.details && <p style={{ fontSize:13, margin:"10px 0 6px", borderTop:`1px solid ${C.border}`, paddingTop:8, lineHeight:1.6 }}>{book.editorial.details}</p>}
        {book.editorial.sources?.length>0 && <div style={{ fontSize:11, color:C.textSec }}>Fuentes: {book.editorial.sources.join(" · ")}</div>}
      </div>}

      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>VALORACIONES ({book.ratings?.length||0})</div>
          {canRate && !showRate && <Btn onClick={()=>setShowRate(true)} small>⭐ Valorar</Btn>}
        </div>
        <div style={{ marginBottom:8 }}><Stars value={Math.round(avg)} size={20}/> <span style={{ color:C.textSec, fontSize:13 }}>{avg>0?Number(avg).toFixed(1):"-"}/5</span></div>
        {showRate && <div style={{ background:C.inputBg, borderRadius:10, padding:14, marginBottom:12, border:`1px solid ${C.border}` }}>
          <Stars value={userRating} size={30} onChange={setUserRating}/>
          <textarea value={userReview} onChange={e=>setUserReview(e.target.value)} placeholder="Tu opinión (opcional)..." rows={2} style={{ resize:"none", marginTop:10 }}/>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <Btn onClick={submitRating} style={{ flex:1 }} small>Guardar</Btn>
            <Btn onClick={()=>setShowRate(false)} variant="ghost" style={{ flex:1 }} small>Cancelar</Btn>
          </div>
        </div>}
        {book.ratings?.map((r,i)=><div key={i} style={{ borderTop:`1px solid ${C.border}`, padding:"10px 0", fontSize:13 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600 }}>{r.name}</span><span style={{ color:C.textSec, fontSize:12 }}>{r.date}</span></div>
          <Stars value={r.rating} size={14}/>
          {r.review && <p style={{ margin:"4px 0 0", color:C.textSec, fontSize:13 }}>{r.review}</p>}
        </div>)}
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {canEdit && <Btn onClick={onEdit} variant="dark" style={{ flex:1 }} small>✏️ Editar</Btn>}
        {canDelete && <Btn onClick={onDelete} variant="danger" style={{ flex:1 }} small>🗑 Borrar</Btn>}
        <Btn onClick={onClose} variant="ghost" style={{ flex:1 }} small>Cerrar</Btn>
      </div>
    </div>
  );
}

// ── USER MANAGEMENT ────────────────────────────────────────────────────────────
function UserMgmt({ users, setUsers, currentUser }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"user" });
  const addUser = async () => {
    if (!form.name||!form.email||!form.password) return;
    if (users.find(u=>u.email===form.email)) { alert("Ese email ya existe"); return; }
    const res = await db.insert("users", {...form, active:true});
    if (res[0]) setUsers(us=>[...us,res[0]]);
    setForm({ name:"", email:"", password:"", role:"user" });
  };
  return (
    <div style={{ color:C.text }}>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Usuarios</h2>
      {users.map(u=><div key={u.id} style={{ padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div><span style={{ fontWeight:600 }}>{u.name}</span>{!u.active && <Badge color={C.danger} style={{ marginLeft:8 }}>Inactivo</Badge>}</div>
          {u.id!==currentUser.id && <Btn onClick={()=>db.update("users",u.id,{active:!u.active}).then(()=>setUsers(us=>us.map(x=>x.id===u.id?{...x,active:!x.active}:x)))} variant={u.active?"danger":"success"} small>{u.active?"Desactivar":"Activar"}</Btn>}
        </div>
        <div style={{ fontSize:12, color:C.textSec, marginBottom:6 }}>{u.email}</div>
        <select value={u.role} onChange={e=>db.update("users",u.id,{role:e.target.value}).then(()=>setUsers(us=>us.map(x=>x.id===u.id?{...x,role:e.target.value}:x)))} disabled={u.id===currentUser.id} style={{ fontSize:13 }}>
          {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>)}
      <h3 style={{ fontSize:15, fontWeight:700, margin:"20px 0 12px" }}>Añadir usuario</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
        <div><label>Nombre</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
        <div><label>Email</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
        <div><label>Contraseña</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
        <div><label>Rol</label><select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>{Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <Btn onClick={addUser} full>Añadir usuario</Btn>
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
  const [filters, setFilters] = useState({ genre:"", age:"", status:"" });
  const [sortBy, setSortBy] = useState("title");
  const [selectedBook, setSelectedBook] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loginData, setLoginData] = useState({ email:"", password:"" });
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState("");
  const [activeSection, setActiveSection] = useState("catalog");
  const [showFilters, setShowFilters] = useState(false);

  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const can = (a) => {
    if (!currentUser) return false;
    const r = currentUser.role;
    if (a==="add"||a==="edit") return r==="admin"||r==="editor";
    if (a==="delete"||a==="manageUsers") return r==="admin";
    if (a==="rate") return ["admin","editor","user"].includes(r);
    return true;
  };

  useEffect(() => {
    (async () => {
      try {
        const [bks, usrs] = await Promise.all([db.get("books"), db.get("users")]);
        setBooks(bks.map(b=>({...b,
          editorial: typeof b.editorial==="string" ? JSON.parse(b.editorial||"{}") : b.editorial||{},
          ratings: typeof b.ratings==="string" ? JSON.parse(b.ratings||"[]") : b.ratings||[]
        })));
        setUsers(usrs);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleLogin = () => {
    const u = users.find(u=>u.email===loginData.email&&u.password===loginData.password&&u.active);
    if (u) { setCurrentUser(u); setLoginError(""); }
    else setLoginError("Email o contraseña incorrectos");
  };

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const ms = !q || [b.title,b.author,b.genre,b.translator].some(f=>(f||"").toLowerCase().includes(q));
    return ms && (!filters.genre||b.genre===filters.genre) && (!filters.age||b.age===filters.age) && (!filters.status||b.status===filters.status);
  }).sort((a,b) => {
    if (sortBy==="title") return (a.title||"").localeCompare(b.title||"");
    if (sortBy==="author") return (a.author||"").localeCompare(b.author||"");
    if (sortBy==="year") return (a.year||0)-(b.year||0);
    if (sortBy==="rating") return (b.rating||0)-(a.rating||0);
    return 0;
  });

  const stats = {
    total: books.length,
    available: books.filter(b=>b.status==="Disponible").length,
    reading: books.filter(b=>b.status==="En lectura").length,
    loaned: books.filter(b=>b.status==="Prestado").length
  };

  const openForm = (book=null) => {
    setEditBook(book);
    setFormKey(k=>k+1);
    setShowForm(true);
    setShowScanner(false);
  };

  const openScanner = () => {
    setEditBook(null);
    setFormKey(k=>k+1);
    setShowScanner(true);
    setShowForm(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowScanner(false);
    setEditBook(null);
    setFormKey(k=>k+1);
  };

  const saveBook = async (form) => {
    const clean = {...form};
    delete clean._scan;
    const payload = {
      title: clean.title,
      author: clean.author,
      translator: clean.translator || null,
      edition: clean.edition || null,
      year: clean.year && clean.year !== "" ? String(clean.year) : null,
      publisher: clean.publisher || null,
      isbn: clean.isbn || null,
      language: clean.language || null,
      genre: clean.genre || null,
      dewey: clean.dewey || null,
      age: clean.age || null,
      situation: clean.situation || null,
      status: clean.status || "Disponible",
      cover: clean.cover || null,
      rating: clean.rating ? parseInt(clean.rating) : 0,
      review: clean.review || null,
      editorial: JSON.stringify(clean.editorial || {}),
      ratings: JSON.stringify(clean.ratings || []),
    };
    try {
      if (editBook?.id) {
        await db.update("books", editBook.id, payload);
        setBooks(bs=>bs.map(b=>b.id===editBook.id?{...b,...clean}:b));
        notify("Libro actualizado");
      } else {
        const res = await db.insert("books", {...payload, added_by: currentUser.id});
        if (res?.error) { alert("Error al guardar: " + res.error.message); return; }
        if (res[0]) setBooks(bs=>[...bs,{...res[0], editorial:clean.editorial, ratings:clean.ratings||[]}]);
        notify("Libro añadido");
      }
      closeForm();
    } catch(e) { alert("Error al guardar: " + e.message); }
  };

  // Panel deslizante desde abajo
  const Panel = ({ show, children, preventClose=false }) => show ? (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-end" }}
      onClick={e=>{ if(preventClose) return; e.target===e.currentTarget&&closeForm(); }}>
      <div style={{ background:C.card, borderRadius:"16px 16px 0 0", width:"100%", maxHeight:"92vh", overflowY:"auto", padding:"20px 16px 32px" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ width:40, height:4, background:C.border, borderRadius:2, margin:"0 auto 16px" }}/>
        {children}
      </div>
    </div>
  ) : null;

  // LOGIN
  if (!currentUser) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <style>{css}</style>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"2rem 1.5rem", width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>📚</div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:C.text }}>Mi Biblioteca</h1>
          <p style={{ fontSize:13, color:C.textSec, margin:"6px 0 0" }}>Catálogo personal de libros</p>
        </div>
        {loading ? <p style={{ textAlign:"center", color:C.textSec }}>Conectando...</p> : <>
          <label>Email</label>
          <input type="email" value={loginData.email} onChange={e=>setLoginData(d=>({...d,email:e.target.value}))} placeholder="tu@email.com" style={{ marginBottom:12 }}/>
          <label>Contraseña</label>
          <input type="password" value={loginData.password} onChange={e=>setLoginData(d=>({...d,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••" style={{ marginBottom:18 }}/>
          {loginError && <p style={{ color:C.danger, fontSize:13, margin:"0 0 12px" }}>{loginError}</p>}
          <Btn onClick={handleLogin} full style={{ padding:14, fontSize:16 }}>Entrar</Btn>
          <p style={{ fontSize:12, color:C.textSec, textAlign:"center", marginTop:14 }}>Admin: admin@biblioteca.com / 1234</p>
        </>}
      </div>
    </div>
  );

  // MAIN
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, paddingBottom:70 }}>
      <style>{css}</style>

      {toast && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:999, background:C.success, color:"#fff", padding:"10px 20px", borderRadius:30, fontWeight:600, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>✅ {toast}</div>}

      {/* Topbar */}
      <div style={{ background:C.sidebar, borderBottom:`1px solid ${C.border}`, padding:"14px 16px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: activeSection==="catalog"?10:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>📚</span>
            <div>
              <h2 style={{ margin:0, fontSize:16, fontWeight:700 }}>
                {activeSection==="catalog"?"Mi Biblioteca":activeSection==="stats"?"Estadísticas":"Usuarios"}
              </h2>
              <p style={{ margin:0, fontSize:11, color:C.textSec }}>{currentUser.name} · {ROLES[currentUser.role]}</p>
            </div>
          </div>
          {can("add") && activeSection==="catalog" && (
            <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={openScanner} variant="dark" small>📷</Btn>
              <Btn onClick={()=>openForm()} small>+ Añadir</Btn>
            </div>
          )}
        </div>
        {activeSection==="catalog" && <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar título, autor, tema..." style={{ marginBottom:8 }}/>
          <div style={{ display:"flex", gap:8 }}>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ flex:1, fontSize:13 }}>
              <option value="title">Título</option>
              <option value="author">Autor</option>
              <option value="year">Año</option>
              <option value="rating">Valoración</option>
            </select>
            <Btn onClick={()=>setShowFilters(v=>!v)} variant={Object.values(filters).some(Boolean)?"primary":"dark"} small>⚙️ Filtros</Btn>
          </div>
          {showFilters && <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
            <select value={filters.genre} onChange={e=>setFilters(f=>({...f,genre:e.target.value}))} style={{ flex:1, fontSize:12 }}>
              <option value="">Género: todos</option>{GENRES.map(o=><option key={o}>{o}</option>)}
            </select>
            <select value={filters.age} onChange={e=>setFilters(f=>({...f,age:e.target.value}))} style={{ flex:1, fontSize:12 }}>
              <option value="">Edad: todas</option>{AGES.map(o=><option key={o}>{o}</option>)}
            </select>
            <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} style={{ flex:1, fontSize:12 }}>
              <option value="">Estado: todos</option>{STATUSES.map(o=><option key={o}>{o}</option>)}
            </select>
            {Object.values(filters).some(Boolean) && <Btn onClick={()=>setFilters({genre:"",age:"",status:""})} variant="ghost" small>✕</Btn>}
          </div>}
        </>}
      </div>

      {/* Contenido */}
      <div style={{ padding:"16px 14px" }}>

        {/* CATÁLOGO */}
        {activeSection==="catalog" && <>
          <p style={{ fontSize:12, color:C.textSec, margin:"0 0 12px" }}>{filtered.length} de {books.length} ejemplares</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
            {filtered.map(book => {
              const avg = book.ratings?.length ? book.ratings.reduce((a,b)=>a+b.rating,0)/book.ratings.length : (book.rating||0);
              const sCol = { "Disponible":C.success, "Prestado":C.warning, "En lectura":C.info, "Deteriorado":C.danger };
              return (
                <div key={book.id} onClick={()=>setSelectedBook(book)}
                  style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:12, cursor:"pointer" }}>
                  {book.cover
                    ? <img src={book.cover} alt="" style={{ width:"100%", height:110, objectFit:"cover", borderRadius:8, marginBottom:8 }}/>
                    : <div style={{ width:"100%", height:80, background:C.inputBg, borderRadius:8, marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>📖</div>}
                  <p style={{ fontWeight:700, fontSize:13, margin:"0 0 3px", lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{book.title}</p>
                  <p style={{ fontSize:12, color:C.accent, margin:"0 0 6px", fontWeight:500, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{book.author}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:C.textSec }}>{book.genre}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ color:sCol[book.status], fontSize:8 }}>●</span>
                      {avg>0 && <span style={{ fontSize:11, color:C.gold }}>{"★".repeat(Math.round(avg))}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length===0 && <div style={{ textAlign:"center", padding:"4rem 1rem", color:C.textSec }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <p>No se encontraron ejemplares.</p>
            {can("add") && <Btn onClick={()=>openForm()}>Añadir el primero</Btn>}
          </div>}
        </>}

        {/* ESTADÍSTICAS */}
        {activeSection==="stats" && <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            {[["Total",stats.total,C.accent,"📚"],["Disponibles",stats.available,C.success,"✅"],["En lectura",stats.reading,C.info,"📖"],["Prestados",stats.loaned,C.warning,"🔄"]].map(([lb,val,col,ic])=>(
              <Card key={lb} style={{ textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{ic}</div>
                <div style={{ fontSize:28, fontWeight:700, color:col }}>{val}</div>
                <div style={{ fontSize:12, color:C.textSec }}>{lb}</div>
              </Card>
            ))}
          </div>
          <Card>
            <h3 style={{ margin:"0 0 14px", fontSize:15 }}>Por género</h3>
            {Object.entries(books.reduce((acc,b)=>{acc[b.genre]=(acc[b.genre]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).map(([g,n])=>(
              <div key={g} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}><span>{g}</span><span style={{ color:C.textSec }}>{n}</span></div>
                <div style={{ height:6, background:C.border, borderRadius:3 }}><div style={{ height:6, background:C.accent, borderRadius:3, width:`${books.length?(n/books.length)*100:0}%` }}/></div>
              </div>
            ))}
          </Card>
        </div>}

        {/* USUARIOS */}
        {activeSection==="users" && <Card><UserMgmt users={users} setUsers={setUsers} currentUser={currentUser}/></Card>}
      </div>

      {/* Navegación inferior */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.sidebar, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100 }}>
        {[
          { id:"catalog", icon:"📚", label:"Catálogo" },
          { id:"stats", icon:"📊", label:"Stats" },
          ...(can("manageUsers")?[{ id:"users", icon:"👥", label:"Usuarios" }]:[]),
          { id:"logout", icon:"🚪", label:"Salir" },
        ].map(item=>(
          <button key={item.id} onClick={()=>item.id==="logout"?setCurrentUser(null):setActiveSection(item.id)}
            style={{ flex:1, border:"none", background:"transparent", color:activeSection===item.id?C.accent:C.textSec, padding:"10px 4px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10, fontWeight:activeSection===item.id?700:400 }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <Panel show={showScanner} preventClose>
        <Scanner
          onResult={r=>{ setShowScanner(false); setEditBook({_scan:r}); setShowForm(true); }}
          onClose={closeForm}/>
      </Panel>

      <Panel show={showForm}>
        {showForm && <BookForm
          key={formKey}
          initial={editBook}
          onScan={()=>{ setShowForm(false); setShowScanner(true); }}
          onSave={saveBook}
          onCancel={closeForm}/>}
      </Panel>

      <Panel show={!!selectedBook}>
        {selectedBook && <BookDetail
          book={selectedBook}
          onClose={()=>setSelectedBook(null)}
          onEdit={()=>{ openForm(selectedBook); setSelectedBook(null); }}
          onDelete={async()=>{ await db.delete("books",selectedBook.id); setBooks(bs=>bs.filter(b=>b.id!==selectedBook.id)); setSelectedBook(null); notify("Libro eliminado"); }}
          canEdit={can("edit")} canDelete={can("delete")} canRate={can("rate")}
          currentUser={currentUser} setBooks={setBooks}/>}
      </Panel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

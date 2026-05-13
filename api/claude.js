export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;
  if (!body) return res.status(400).json({ error: "Empty body" });

  // ── BÚSQUEDA POR ISBN ──────────────────────────────────────────────────────
  if (body.isbn) {
    const clean = body.isbn.replace(/-/g, "");
    try {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`);
      const d = await r.json();
      if (d.items?.length > 0) {
        const b = d.items[0].volumeInfo;
        return res.status(200).json({
          found: true,
          title: b.title || "",
          author: b.authors ? b.authors.join(" & ") : "",
          year: b.publishedDate ? parseInt(b.publishedDate) : null,
          publisher: b.publisher || "",
          language: b.language || "",
          genre: b.categories ? b.categories[0] : "",
          cover: b.imageLinks ? b.imageLinks.thumbnail.replace("http://","https://") : "",
        });
      }
      return res.status(200).json({ found: false });
    } catch(e) {
      return res.status(200).json({ found: false, error: e.message });
    }
  }

  // ── BÚSQUEDA POR TÍTULO Y AUTOR → ISBN ────────────────────────────────────
  if (body.title && body.author) {
    const title = body.title;
    const author = body.author;

    // 1) Google Books
    const searches = [
      `intitle:${title} inauthor:${author}`,
      `${title} ${author}`,
      `intitle:${title}`,
    ];
    for (const q of searches) {
      try {
        const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`);
        const d = await r.json();
        if (d.items?.length > 0) {
          for (const item of d.items) {
            const b = item.volumeInfo;
            const isbn = b.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier ||
                         b.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier || "";
            if (isbn) {
              return res.status(200).json({
                found: true, isbn,
                year: b.publishedDate ? parseInt(b.publishedDate) : null,
                publisher: b.publisher || "",
                language: b.language || "",
                genre: b.categories ? b.categories[0] : "",
                cover: b.imageLinks ? b.imageLinks.thumbnail.replace("http://","https://") : "",
              });
            }
          }
        }
      } catch(e) {}
    }

    // 2) Open Library como respaldo
    try {
      const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=3`);
      const d = await r.json();
      for (const doc of (d.docs || [])) {
        const isbn = doc.isbn?.[0] || "";
        if (isbn) {
          return res.status(200).json({
            found: true, isbn,
            year: doc.first_publish_year || null,
            publisher: doc.publisher?.[0] || "",
            language: doc.language?.[0] || "",
          });
        }
      }
    } catch(e) {}

    return res.status(200).json({ found: false });
  }

  if (body.image) {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ found: false, error: "GEMINI_API_KEY not set" });

    const prompt = `Eres un experto bibliotecario. Analiza esta imagen de un libro (portada, lomo, contraportada o código de barras).
Extrae toda la información visible: título completo con subtítulo, todos los autores, traductor, editorial, año, edición, ISBN (número de 13 dígitos bajo el código de barras).
Si es la portada principal: isCover true.
Devuelve SOLO este JSON sin backticks: {"title":"","author":"","year":0,"publisher":"","isbn":"","language":"","translator":"","edition":"","isCover":true,"found":true}
Si no es imagen de un libro: {"found":false}`;

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: body.image } }
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
          })
        }
      );
      if (!r.ok) {
        const errText = await r.text();
        return res.status(200).json({ found: false, error: `Gemini ${r.status}: ${errText}` });
      }
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return res.status(200).json(parsed);
    } catch(e) {
      return res.status(200).json({ found: false, error: e.message });
    }
  }

  return res.status(400).json({ error: "Send isbn or image" });
}

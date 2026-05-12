exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  let body;
  try {
    if (!event.body || event.body.trim() === "") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Empty body" }) };
    }
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON: " + e.message }) };
  }

  // ── BÚSQUEDA POR ISBN ──────────────────────────────────────────────────────
  if (body.isbn) {
    const clean = body.isbn.replace(/-/g, "");
    try {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`);
      const d = await r.json();
      if (d.items?.length > 0) {
        const b = d.items[0].volumeInfo;
        return {
          statusCode: 200, headers,
          body: JSON.stringify({
            found: true,
            title: b.title || "",
            author: b.authors ? b.authors.join(" & ") : "",
            year: b.publishedDate ? parseInt(b.publishedDate) : null,
            publisher: b.publisher || "",
            language: b.language || "",
            genre: b.categories ? b.categories[0] : "",
            cover: b.imageLinks ? b.imageLinks.thumbnail.replace("http://","https://") : "",
          })
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ found: false }) };
    } catch(e) {
      return { statusCode: 200, headers, body: JSON.stringify({ found: false, error: e.message }) };
    }
  }

  // ── ANÁLISIS DE IMAGEN con Google Gemini ──────────────────────────────────
  if (body.image) {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ found: false, error: "GEMINI_API_KEY not set" }) };
    }

    const prompt = `Eres un experto bibliotecario. Analiza esta imagen de un libro (portada, lomo, contraportada o código de barras).
Extrae toda la información visible: título completo con subtítulo, todos los autores, traductor, editorial, año, edición, ISBN (número de 13 dígitos bajo el código de barras).
Si es la portada principal: isCover true.
Devuelve SOLO este JSON sin backticks: {"title":"","author":"","year":0,"publisher":"","isbn":"","language":"","translator":"","edition":"","isCover":true,"found":true}
Si no es imagen de un libro: {"found":false}`;

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/jpeg", data: body.image } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
          })
        }
      );

      if (!r.ok) {
        const errText = await r.text();
        return { statusCode: 200, headers, body: JSON.stringify({ found: false, error: `Gemini error ${r.status}: ${errText}` }) };
      }

      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch(e) {
      return { statusCode: 200, headers, body: JSON.stringify({ found: false, error: e.message }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request — send isbn or image" }) };
};

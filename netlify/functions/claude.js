exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

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
    } catch(e) {}
    return { statusCode: 200, headers, body: JSON.stringify({ found: false }) };
  }

  // ── ANÁLISIS DE IMAGEN con Google Gemini ──────────────────────────────────
  if (body.image) {
    try {
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      const prompt = `Eres un experto bibliotecario. Analiza esta imagen de un libro.
Puede ser portada, lomo, contraportada o foto del código de barras/ISBN.
Extrae TODA la información visible con máxima precisión:
- Título completo (con subtítulo si lo hay)
- Todos los autores o coautores
- Traductor si aparece
- Editorial
- Año de publicación
- Número de edición
- ISBN: el número de 13 dígitos en texto debajo del código de barras, o junto a la palabra ISBN
- Si es la portada principal del libro: isCover true

Devuelve SOLO este JSON sin backticks ni texto adicional:
{"title":"","author":"","year":0,"publisher":"","isbn":"","language":"","translator":"","edition":"","isCover":true,"found":true}

Si no puedes leer un campo déjalo vacío. "found" es false solo si claramente no es imagen de un libro.`;

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
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return { statusCode: 200, headers, body: JSON.stringify(parsed) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ found: false, error: e.message }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
};

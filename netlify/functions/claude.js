exports.handler = async (event) => {
  const isbn = JSON.parse(event.body).isbn;
  const clean = isbn.replace(/-/g, "");

  try {
    // Google Books API — mejor cobertura de libros españoles
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&langRestrict=es`);
    const d = await r.json();

    if (d.items && d.items.length > 0) {
      const b = d.items[0].volumeInfo;
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          found: true,
          title: b.title || "",
          author: b.authors ? b.authors.join(" & ") : "",
          year: b.publishedDate ? parseInt(b.publishedDate) : null,
          publisher: b.publisher || "",
          language: b.language || "",
          genre: b.categories ? b.categories[0] : "",
          cover: b.imageLinks ? b.imageLinks.thumbnail.replace("http://", "https://") : "",
          description: b.description || ""
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ found: false })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ found: false, error: e.message })
    };
  }
};

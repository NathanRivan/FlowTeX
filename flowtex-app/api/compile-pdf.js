export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const latex = req.body;
  if (!latex) {
    return res.status(400).json({ error: 'No LaTeX content provided' });
  }

  try {
    const response = await fetch('https://rtex.probablyaweb.site/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: latex }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('rtex error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Compilation failed (${response.status}): ${errorText}`,
      });
    }

    const pdfBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
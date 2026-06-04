export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const latex = req.body;
  if (!latex) {
    return res.status(400).json({ error: 'No LaTeX content provided' });
  }

  try {
    const response = await fetch('https://texlive.net/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: latex }),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Compilation failed (${response.status})`,
      });
    }

    const pdfBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
export default async function handler(req, res) {
  // Only allow POST with LaTeX body
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const latex = req.body;
  if (!latex) {
    return res.status(400).json({ error: 'No LaTeX content provided' });
  }

  try {
    // Forward the LaTeX to the real compilation service
    const response = await fetch('https://latexonline.cc/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: latex,
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
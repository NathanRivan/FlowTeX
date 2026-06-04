export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const latex = req.body;
  if (!latex) {
    return res.status(400).json({ error: 'No LaTeX content provided' });
  }

  // Try multiple compilers in sequence
  const compilers = [
    {
      name: 'latexonline.cc',
      url: 'https://latexonline.cc/compile',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: latex,
      },
    },
    {
      name: 'rtex',
      url: 'https://rtex.probablyaweb.site/api/v2',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: latex }),
      },
    },
  ];

  for (const compiler of compilers) {
    try {
      console.log(`Trying ${compiler.name}…`);
      const response = await fetch(compiler.url, compiler.options);
      
      if (response.ok) {
        const pdfBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
        return res.send(Buffer.from(pdfBuffer));
      }
      
      console.error(`${compiler.name} failed with ${response.status}`);
      const errorText = await response.text();
      console.error('Error body:', errorText);
    } catch (err) {
      console.error(`${compiler.name} threw:`, err);
    }
  }

  // All compilers failed
  res.status(500).json({
    error: 'All compilation services failed. Please download the .tex file and compile locally.',
    latex: latex,
  });
}
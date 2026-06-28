const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const corsOptions = { origin: CORS_ORIGIN, methods: ['GET', 'POST', 'OPTIONS'] };
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

function runPdflatex(texFile, outDir) {
  return new Promise((resolve, reject) => {
    execFile(
      'pdflatex',
      ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${outDir}`, texFile],
      { timeout: 30000 },
      (err, stdout, stderr) => {
        resolve({ err, stdout, stderr });
      }
    );
  });
}

function extractErrors(logPath) {
  try {
    const log = fs.readFileSync(logPath, 'utf8');
    const lines = log.split('\n');
    const errors = lines
      .filter(l => l.startsWith('!') || l.startsWith('l.'))
      .slice(0, 20)
      .join('\n');
    return errors || log.slice(0, 2000);
  } catch {
    return 'No log available.';
  }
}

app.post('/compile', async (req, res) => {
  const { latex } = req.body;
  if (!latex || typeof latex !== 'string') {
    return res.status(400).json({ error: 'Missing latex field in body.' });
  }

  const id = uuidv4();
  const tmpDir = path.join(os.tmpdir(), `flowtex-${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const texFile = path.join(tmpDir, 'document.tex');
  const pdfFile = path.join(tmpDir, 'document.pdf');
  const logFile = path.join(tmpDir, 'document.log');

  fs.writeFileSync(texFile, latex, 'utf8');

  try {
    // Run twice so \ref, \label, \tableofcontents resolve correctly
    await runPdflatex(texFile, tmpDir);
    await runPdflatex(texFile, tmpDir);

    if (!fs.existsSync(pdfFile)) {
      const errors = extractErrors(logFile);
      return res.status(422).json({ error: 'Compilation failed.', log: errors });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');

    const stream = fs.createReadStream(pdfFile);
    stream.pipe(res);
    stream.on('end', () => fs.rmSync(tmpDir, { recursive: true, force: true }));
    stream.on('error', () => fs.rmSync(tmpDir, { recursive: true, force: true }));
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    res.status(500).json({ error: 'Internal server error.', detail: e.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`PDF compile server on :${PORT}`));

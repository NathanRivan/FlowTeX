import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './LandingPage.css';

/* ── Motion helpers ── */

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
      delay: i * 0.08,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

function InViewSection({ children, className, delay = 0, ...rest }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      {...rest}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Hero ── */

function HeroSection({ onGetStarted }) {
  return (
    <section className="landing-hero">
      <motion.div
        className="landing-hero-bg"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
      />
      <div className="landing-hero-content">
        <motion.div
          className="landing-hero-badge"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          FlumenWorks
        </motion.div>
        <motion.h1
          className="landing-hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Software for the
          <br />
          <span className="landing-hero-emphasis">long session.</span>
        </motion.h1>
        <motion.p
          className="landing-hero-subtitle"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          FlumenWorks builds focused, opinionated tools for researchers, writers,
          academics, and anyone who works with complex ideas. Each product does
          one thing exceptionally well.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <button className="landing-hero-cta" onClick={onGetStarted}>
            Get started
            <motion.svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </motion.svg>
          </button>
        </motion.div>
        <motion.p
          className="landing-hero-footnote"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.65 }}
        >
          Free to try. No credit card required.
        </motion.p>
      </div>
    </section>
  );
}

/* ── Products ── */

const products = [
  {
    id: 'flumenwrite',
    name: 'FlumenWrite',
    icon: 'f',
    desc: 'A document editor built for deep work — rich text, LaTeX math, and elegant typesetting in one place.',
    available: true,
  },
  {
    id: 'soon-2',
    name: 'Coming Soon',
    icon: '“',
    desc: '',
    available: false,
  },
];

function ProductsSection({ onGetStarted }) {
  return (
    <InViewSection className="landing-products" id="products">
      <div className="landing-section-header">
        <p className="landing-eyebrow">What we build</p>
        <h2 className="landing-section-title">Our products</h2>
      </div>
      <motion.div
        className="landing-products-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            className={`landing-product-card ${p.available ? 'available clickable' : ''}`}
            variants={fadeInUp}
            custom={i}
            whileHover={p.available ? { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' } : {}}
            onClick={p.available ? onGetStarted : undefined}
            tabIndex={p.available ? 0 : -1}
            role={p.available ? 'button' : undefined}
            onKeyDown={p.available ? (e) => { if (e.key === 'Enter') onGetStarted(); } : undefined}
          >
            <div className="landing-product-icon">{p.icon}</div>
            <h3 className="landing-product-name">{p.name}</h3>
            <p className="landing-product-desc">{p.desc}</p>
            <span className={`landing-product-badge ${p.available ? 'live' : 'soon'}`}>
              {p.available ? 'Available now' : 'Coming soon'}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </InViewSection>
  );
}

/* ── Live Demo ── */

/* Renders $...$ inline math and $$...$$ display math in a text string.
   Splits on $$ first (display), then on $ (inline). */
function renderMathBlocks(text) {
  const elements = [];
  const displayParts = text.split(/(\$\$[^$]*\$\$)/g);
  displayParts.forEach((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const expr = part.slice(2, -2).trim();
      try {
        const html = katex.renderToString(expr, { displayMode: true, throwOnError: false });
        elements.push(<span key={i} className="demo-math-block" dangerouslySetInnerHTML={{ __html: html }} />);
      } catch {
        elements.push(<span key={i} className="demo-math-block demo-math-error">{part}</span>);
      }
    } else {
      // Split inline
      const inlineParts = part.split(/(\$[^$]*\$)/g);
      inlineParts.forEach((seg, j) => {
        if (seg.startsWith('$') && seg.endsWith('$')) {
          const expr = seg.slice(1, -1).trim();
          try {
            const html = katex.renderToString(expr, { displayMode: false, throwOnError: false });
            elements.push(<span key={`${i}-${j}`} className="demo-math-inline" dangerouslySetInnerHTML={{ __html: html }} />);
          } catch {
            elements.push(<span key={`${i}-${j}`} className="demo-math-inline demo-math-error">{seg}</span>);
          }
        } else {
          elements.push(<span key={`${i}-${j}`}>{seg}</span>);
        }
      });
    }
  });
  return elements;
}

function DemoLine({ text, as, indent }) {
  const content = renderMathBlocks(text);
  if (as === 'h1') return <div className="demo-h1">{content}</div>;
  if (as === 'h2') return <div className="demo-h2">{content}</div>;
  if (as === 'bullet') return <div className="demo-bullet">{content}</div>;
  return <div className="demo-p" style={indent ? { paddingLeft: 20 } : undefined}>{content}</div>;
}

const DEMO_DOCUMENT = [
  { as: 'h1', text: 'Quantum Information Theory' },
  { as: 'h2', text: '1. Introduction' },
  { as: 'p', text: 'The field of quantum information theory explores how quantum mechanical effects—such as superposition and entanglement—can be harnessed for computation and communication. Unlike classical bits, which take values of 0 or 1, a $\\text{qubit}$ can exist in a linear combination of both states.' },
  { as: 'p', text: 'The state of a qubit is described by a vector $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ where $\\alpha, \\beta \\in \\mathbb{C}$ and $|\\alpha|^2 + |\\beta|^2 = 1$.' },
  { as: 'h2', text: '2. Entanglement and Bell States' },
  { as: 'p', text: 'When two qubits become entangled, their joint state cannot be factored into independent states. The Bell states form a basis of maximally entangled two-qubit states:' },
  { as: 'p', text: '$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)$$' },
  { as: 'p', text: '$$|\\Psi^-\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle - |10\\rangle)$$' },
  { as: 'p', text: 'These states exhibit correlations that violate Bell\'s inequality, demonstrating the non-classical nature of quantum mechanics.' },
  { as: 'h2', text: '3. Quantum Gates' },
  { as: 'p', text: 'Quantum gates are represented by unitary matrices. The single-qubit $X$ gate and Hadamard gate are:' },
  { as: 'p', text: '$$X = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}, \\quad H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$$' },
  { as: 'p', text: 'A key two-qubit gate is CNOT, which flips the target qubit if the control qubit is $|1\\rangle$:' },
  { as: 'p', text: '$$\\text{CNOT} = \\begin{pmatrix} 1 & 0 & 0 & 0 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 0 & 0 & 1 \\\\ 0 & 0 & 1 & 0 \\end{pmatrix}$$' },
  { as: 'h2', text: '4. Key Properties' },
  { as: 'bullet', text: 'Superposition — qubits encode probabilities, not definite values' },
  { as: 'bullet', text: 'Entanglement — non-local correlations with no classical analogue' },
  { as: 'bullet', text: 'Interference — amplitudes can constructively or destructively interfere' },
  { as: 'bullet', text: 'No-cloning — unknown quantum states cannot be copied' },
  { as: 'bullet', text: 'Teleportation — a quantum state can be transferred using entanglement and classical communication' },
  { as: 'p', text: 'These principles form the foundation of quantum computing and quantum cryptography, promising exponential speedups for certain problems and provably secure communication channels.' },
];

function DemoSection({ onGetStarted }) {
  const [customText, setCustomText] = useState('');
  const [mode, setMode] = useState('demo'); // 'demo' or 'play'
  const wrapperRef = useRef(null);
  const isInView = useInView(wrapperRef, { once: true, margin: '-60px' });

  return (
    <section className="landing-demo" id="demo" ref={wrapperRef}>
      <div className="landing-section-header">
        <p className="landing-eyebrow">Try it</p>
        <h2 className="landing-section-title">See FlumenWrite in action</h2>
      </div>

      <motion.div
        className="demo-editor-wrapper"
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        {/* Toolbar */}
        <div className="demo-toolbar">
          <div className="demo-toolbar-left">
            <span className="demo-toolbar-brand">FlumenWrite</span>
            <span className="demo-toolbar-sep" />
            <button
              className={`demo-toolbar-btn ${mode === 'demo' ? 'active' : ''}`}
              onClick={() => setMode('demo')}
            >
              Demo
            </button>
            <button
              className={`demo-toolbar-btn ${mode === 'play' ? 'active' : ''}`}
              onClick={() => setMode('play')}
            >
              Playground
            </button>
            <span className="demo-toolbar-sep" />
            <span className="demo-toolbar-hint">
              {mode === 'demo' ? 'Read-only preview' : 'Type and experiment'}
            </span>
          </div>
          <div className="demo-toolbar-right">
            <span className="demo-toolbar-badge">LaTeX math</span>
            <span className="demo-toolbar-badge">Rich text</span>
          </div>
        </div>

        {/* Editor body */}
        <motion.div
          className="demo-editor-body"
          layout
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {mode === 'demo' ? (
            <div className="demo-content">
              {DEMO_DOCUMENT.map((line, i) => (
                <DemoLine key={i} as={line.as} text={line.text} />
              ))}
            </div>
          ) : (
            <div className="demo-playground">
              <textarea
                className="demo-textarea"
                placeholder={`Try typing here...\n\nUse $...$ for inline math and $$...$$ for display math.\n\nExample: The energy is given by $E = mc^2$\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$`}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              {customText.trim() && (
                <div className="demo-preview">
                  <div className="demo-preview-header">Preview</div>
                  <div className="demo-preview-body">
                    {customText.split('\n').map((line, i) => {
                      if (!line.trim()) return <div key={i} className="demo-p-empty" />;
                      return <DemoLine key={i} text={line} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="demo-footer">
          <span>Try the full experience—create an account</span>
          <motion.button
            className="demo-cta-inline"
            onClick={onGetStarted}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Try FlumenWrite
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}

/* ── CTA ── */

function CTASection({ onGetStarted }) {
  return (
    <InViewSection className="landing-cta">
      <div className="landing-cta-content">
        <h2 className="landing-cta-title">Ready to go deeper?</h2>
        <p className="landing-cta-desc">
          Start with FlumenWrite, the document editor built for serious work.
        </p>
        <motion.button
          className="landing-cta-button"
          onClick={onGetStarted}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Get started for free
        </motion.button>
      </div>
    </InViewSection>
  );
}

/* ── Navbar ── */

function Navbar({ onGetStarted }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      className="landing-navbar"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="landing-navbar-inner">
        <span className="landing-logo">FlumenWorks</span>
        <button
          className="landing-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className={`landing-hamburger ${menuOpen ? 'open' : ''}`} />
        </button>
        <nav className={`landing-nav ${menuOpen ? 'open' : ''}`}>
          <button className="landing-nav-link" onClick={() => scrollTo('products')}>Products</button>
          <button className="landing-nav-link" onClick={() => scrollTo('demo')}>Demo</button>
          <button className="landing-nav-cta" onClick={onGetStarted}>Sign in</button>
        </nav>
      </div>
    </motion.header>
  );
}

/* ── Footer ── */

function Footer() {
  return (
    <motion.footer
      className="landing-footer"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="landing-footer-inner">
        <span className="landing-footer-logo">FlumenWorks</span>
        <p className="landing-footer-copy">&copy; {new Date().getFullYear()} FlumenWorks. All rights reserved.</p>
      </div>
    </motion.footer>
  );
}

/* ── Page ── */

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page">
      <Navbar onGetStarted={onGetStarted} />
      <main>
        <HeroSection onGetStarted={onGetStarted} />
        <ProductsSection onGetStarted={onGetStarted} />
        <DemoSection onGetStarted={onGetStarted} />
        <CTASection onGetStarted={onGetStarted} />
      </main>
      <Footer />
    </div>
  );
}
import { useEffect, useState } from 'react';
import Seo from '@/components/Seo';
import { Reveal } from '@/components/motion';
import { TerminalSquare } from 'lucide-react';
import CodeRunner from '@/components/CodeRunner';
import { RUN_LANGS } from '@/src/lib/runners';

export default function CompilerPage() {
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState(RUN_LANGS[0].sample);

  // kode dari modal "Kode request" di Playground
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wudysoft_compiler_seed');
      if (raw) { const s = JSON.parse(raw); sessionStorage.removeItem('wudysoft_compiler_seed'); if (s.lang && s.code) { setLang(s.lang); setCode(s.code); } }
    } catch {}
  }, []);

  return (
    <>
      <Seo title="Compiler Online" description="Jalankan kode langsung di browser: JavaScript, TypeScript, Python, HTML, serta C, C++, Java, Go, Rust, PHP, Ruby dan lainnya lewat server." path="/tools/compiler" />
      <div className="cp">
        <Reveal>
          <header className="cp-h">
            <span className="cp-ico"><TerminalSquare size={24} /></span>
            <div>
              <h1>Compiler</h1>
              <p>JavaScript, TypeScript, Python dan HTML berjalan langsung di browser. Bahasa lain dikirim ke layanan eksekusi.</p>
            </div>
          </header>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="cp-card">
            <CodeRunner lang={lang} onLang={setLang} code={code} onCode={setCode} minHeight={320} />
          </div>
        </Reveal>
        <p className="cp-note">Kode di browser berjalan dengan batas waktu dan tidak menyentuh server kami. Eksekusi server tidak punya akses internet, jadi uji request API dengan JavaScript/Python di browser atau lewat API Playground.</p>
      </div>
      <style jsx>{`
        .cp { max-width: 960px; margin: 0 auto; display: grid; gap: 16px; }
        .cp-h { display: flex; align-items: center; gap: 14px; }
        .cp-ico { width: 52px; height: 52px; border-radius: var(--r-m); display: grid; place-items: center; background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); flex-shrink: 0; }
        h1 { margin: 0; font-size: clamp(1.4rem, 4vw, 2rem); }
        p { margin: 4px 0 0; color: var(--muted); font-size: .9rem; }
        .cp-card { padding: 14px; border-radius: var(--r-l); border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 60%, transparent); backdrop-filter: blur(14px); }
        .cp-note { font-size: .76rem; }
      `}</style>
    </>
  );
}

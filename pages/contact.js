import Seo from '@/components/Seo';
import ContactCard from '@/components/ContactCard';
import { Reveal, TextReveal } from '@/components/motion';
import { MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Kontak & Komunitas"
        path="/contact"
        label="KONTAK"
        description="Hubungi admin/author Wudysoft lewat WhatsApp atau email, gabung grup & komunitas WhatsApp, dan temukan source code di GitHub."
      />
      <div className="ct-page">
        <header>
          <Reveal variant="down">
            <div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MessageCircle size={14} color="var(--a2)" /> <span>KONTAK</span>
            </div>
          </Reveal>
          <h1><TextReveal as="span" text="Kontak & Komunitas" by="word" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>
            Proyek ini open source. Hubungi admin/author, gabung grup atau komunitas WhatsApp, atau kirim kontribusi lewat GitHub.
          </Reveal>
        </header>
        <ContactCard />
      </div>
      <style jsx>{`
        .ct-page { width: min(960px, 100%); margin: 0 auto; display: grid; gap: 18px; padding-bottom: 24px; }
      `}</style>
    </>
  );
}

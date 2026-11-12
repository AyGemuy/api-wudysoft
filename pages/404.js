import Link from 'next/link';
import { motion } from 'framer-motion';
import Seo from '@/components/Seo';
import { 
  Radio, 
  Satellite, 
  Compass, 
  ArrowLeft, 
  ShieldAlert, 
  Terminal,
  RefreshCw 
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function NotFound() {
  return (
    <>
      <Seo title="404 — Signal Disconnected" noindex />
      <div className="center">
        <motion.div
          className="glass auth-card"
          style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 180 }}
        >
          {/* Radar Scanner Line Effect */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--a2), transparent)',
              opacity: 0.75,
            }}
            animate={{ y: [0, 420, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
          />

          {/* Floating Satellite HUD Icon */}
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 10px' }}>
            {/* Animated Radar Pulse Rings */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid var(--a2)',
                opacity: 0.4,
              }}
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            />
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid var(--a3)',
                opacity: 0.3,
              }}
              animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.6, ease: 'easeOut' }}
            />

            {/* Satellite Icon with Orbit Rotation */}
            <motion.div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(56, 189, 248, 0.1)',
                borderRadius: '50%',
                border: '1px solid var(--border)',
              }}
              animate={{ y: [-4, 4, -4], rotate: [-6, 6, -6] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <Satellite size={42} color="var(--a2)" />
            </motion.div>
          </div>

          {/* Signal Lost Status Badge */}
          <motion.div
            className="badge err"
            style={{ margin: '8px auto 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Radio size={14} />
            <span>SIGNAL LOST // SECTOR DISCONNECTED</span>
          </motion.div>

          {/* Glitch Animated 404 Header */}
          <motion.h1
            style={{
              fontSize: '5rem',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontWeight: 800,
              background: 'linear-gradient(180deg, #ffffff 40%, rgba(255,255,255,0.2) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px',
            }}
            animate={{ x: [-1, 1, -1] }}
            transition={{ repeat: Infinity, duration: 0.1 }}
          >
            404
          </motion.h1>

          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', maxWidth: '320px', margin: '0 auto 16px' }}>
            Koordinat node yang kamu tuju tidak ditemukan pada cluster jaringan ini.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gap: '10px' }}>
            <Link href="/" onClick={() => sound.playClick()}>
              <motion.div
                className="btn primary full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ gap: '8px' }}
              >
                <ArrowLeft size={16} />
                <span>Kembali ke Pusat Kendali</span>
              </motion.div>
            </Link>

            <Link href="/playground" onClick={() => sound.playClick()}>
              <motion.div
                className="btn full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ gap: '8px', fontSize: '0.82rem' }}
              >
                <Terminal size={15} color="var(--a2)" />
                <span>Buka API Playground</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
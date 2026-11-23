import { forwardRef } from 'react';

/**
 * Kartu berstruktur seperti kartu Home: HEADER (ikon + judul + aksi) · BODY · FOOTER.
 * Tampilannya dikendalikan Theme Studio: bentuk (kaca terpisah, air, kayu, listrik, es, …),
 * gaya header, dan footer tampil/sembunyi — semuanya lewat atribut di <html> (lihat styles/shapes.css).
 *
 *   <Card Icon={Plus} title="Judul" subtitle="Keterangan" badge="3" actions={<button/>} footer={<>…</>}>isi</Card>
 *
 * Untuk elemen yang dirender wrapper animasi (Item, Reveal, motion.*), pakai potongannya langsung:
 *   <Item className="glass card kc"><CardDeco /><CardHead … /><CardBody>…</CardBody><CardFoot>…</CardFoot></Item>
 */
export function CardDeco() {
  return <span className="kc-deco" aria-hidden="true" />;
}

export function CardHead({ Icon, title, subtitle, badge, actions, as: T = 'h3' }) {
  if (!(Icon || title || subtitle || badge || actions)) return null;
  return (
    <header className="kc-head">
      <span className="kc-dots" aria-hidden="true"><i /><i /><i /></span>
      {Icon && <span className="kc-ico"><Icon size={16} /></span>}
      <div className="kc-titles">
        {title && <T>{title}</T>}
        {subtitle && <small>{subtitle}</small>}
      </div>
      {badge != null && badge !== '' && <span className="kc-badge">{badge}</span>}
      {actions && <div className="kc-actions">{actions}</div>}
    </header>
  );
}

export function CardBody({ className = '', children, ...rest }) {
  return <div className={`kc-body ${className}`.trim()} {...rest}>{children}</div>;
}

export function CardFoot({ children, className = '', ...rest }) {
  return <footer className={`kc-foot ${className}`.trim()} {...rest}>{children}</footer>;
}

const Card = forwardRef(function Card(
  { as: Tag = 'section', Icon, title, subtitle, badge, actions, footer, className = '', bodyClassName = '', children, ...rest },
  ref
) {
  return (
    <Tag ref={ref} className={`kc glass card ${className}`.trim()} {...rest}>
      <CardDeco />
      <CardHead Icon={Icon} title={title} subtitle={subtitle} badge={badge} actions={actions} />
      <CardBody className={bodyClassName}>{children}</CardBody>
      {footer && <CardFoot>{footer}</CardFoot>}
    </Tag>
  );
});

export default Card;

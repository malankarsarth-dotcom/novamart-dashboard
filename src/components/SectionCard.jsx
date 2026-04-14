export default function SectionCard({ title, children, style = {} }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.25rem', ...style }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: '#1E2761', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #F8FAFC' }}>{title}</div>}
      {children}
    </div>
  );
}

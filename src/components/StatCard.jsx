export default function StatCard({ label, value, sub, trend, color = '#0D9488' }) {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#64748B';
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.1rem 1.25rem', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: trendColor, marginTop: 4, fontWeight: 500 }}>{arrow} {sub}</div>}
    </div>
  );
}

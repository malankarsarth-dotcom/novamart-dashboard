const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'regression', label: 'Revenue & Regression' },
  { id: 'churn', label: 'Churn Prediction' },
  { id: 'clustering', label: 'Segmentation' },
  { id: 'basket', label: 'Market Basket' },
  { id: 'strategic', label: 'Strategic' },
];

export default function Header({ activeTab, setActiveTab }) {
  return (
    <div style={{ background: '#1E2761', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ color: '#F59E0B', fontSize: 18, fontWeight: 700 }}>NovaMart</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>ML Analytics Dashboard | MAIB Applied ML</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === t.id ? 700 : 400,
                background: activeTab === t.id ? '#F8FAFC' : 'transparent',
                color: activeTab === t.id ? '#1E2761' : 'rgba(255,255,255,0.75)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

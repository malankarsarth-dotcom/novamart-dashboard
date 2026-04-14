import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ZAxis, Cell,
  LineChart, Line, ComposedChart, Bar,
} from 'recharts';

const RULES = [
  { antecedent: 'Smartphone', consequent: 'Protective Case', support: 8.2, confidence: 76, lift: 4.8, category: 'Electronics' },
  { antecedent: 'Laptop', consequent: 'Laptop Stand', support: 6.5, confidence: 68, lift: 4.2, category: 'Electronics' },
  { antecedent: 'Skincare Set', consequent: 'Perfume', support: 5.9, confidence: 62, lift: 3.9, category: 'Beauty' },
  { antecedent: 'Summer Dress', consequent: 'Sandals', support: 5.4, confidence: 58, lift: 3.5, category: 'Fashion' },
  { antecedent: 'Wireless Charger', consequent: 'Phone Stand', support: 4.8, confidence: 71, lift: 3.8, category: 'Electronics' },
  { antecedent: 'Keyboard', consequent: 'Mouse', support: 7.1, confidence: 82, lift: 4.5, category: 'Electronics' },
  { antecedent: 'Coffee Maker', consequent: 'Coffee Beans', support: 6.2, confidence: 74, lift: 3.7, category: 'Home' },
  { antecedent: 'Running Shoes', consequent: 'Sports Socks', support: 5.7, confidence: 65, lift: 3.4, category: 'Sports' },
  { antecedent: 'Yoga Mat', consequent: 'Resistance Bands', support: 4.3, confidence: 59, lift: 3.2, category: 'Sports' },
  { antecedent: 'Smart Watch', consequent: 'Watch Band', support: 7.8, confidence: 85, lift: 4.6, category: 'Electronics' },
  { antecedent: 'Baby Shampoo', consequent: 'Baby Lotion', support: 4.1, confidence: 71, lift: 3.6, category: 'Baby' },
  { antecedent: 'Perfume', consequent: 'Gift Wrap', support: 3.8, confidence: 54, lift: 2.9, category: 'Beauty' },
  { antecedent: 'Desk Lamp', consequent: 'Notebook', support: 3.5, confidence: 48, lift: 2.6, category: 'Home' },
  { antecedent: 'Protein Powder', consequent: 'Shaker Bottle', support: 5.1, confidence: 77, lift: 4.1, category: 'Sports' },
  { antecedent: 'Pillow Set', consequent: 'Bedsheet Set', support: 4.6, confidence: 63, lift: 3.1, category: 'Home' },
];

const CAT_COLORS = { Electronics: '#1E2761', Beauty: '#EC4899', Fashion: '#F59E0B', Home: '#0D9488', Sports: '#10B981', Baby: '#8B5CF6' };

const BUNDLES = [
  { title: 'Smart Home Starter Pack', items: ['Smartphone', 'Protective Case', 'Wireless Charger'], discount: '15% off bundle', uplift: '+AED 45', targets: ['High-Value Loyalists', 'Category Specialists'], color: '#1E2761' },
  { title: 'Beauty & Fashion Drop', items: ['Skincare Set', 'Perfume', 'Summer Dress'], discount: 'Free shipping + 10% off', uplift: '+AED 28', targets: ['Price-Sensitive Bargain Hunters'], color: '#EC4899' },
  { title: 'Home Office Essentials', items: ['Laptop Stand', 'Keyboard', 'Desk Lamp'], discount: '12% off', uplift: '+AED 38', targets: ['New & Tentative'], color: '#0D9488' },
];

// Support threshold impact
const thresholdData = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(t => ({
  support: `${t}%`,
  rules: Math.round(320 - t * 55 + (t > 3 ? (t - 3) * 10 : 0)),
  avgLift: +(2.5 + (1 / t) * 1.2).toFixed(2),
}));

// Simple SVG network diagram
const NODES = [
  { id: 'Electronics', x: 280, y: 180, r: 38, color: '#1E2761' },
  { id: 'Smartphones', x: 160, y: 90, r: 26, color: '#3B4FBA' },
  { id: 'Laptops', x: 400, y: 90, r: 24, color: '#3B4FBA' },
  { id: 'Watches', x: 160, y: 270, r: 22, color: '#3B4FBA' },
  { id: 'Accessories', x: 400, y: 270, r: 30, color: '#60A5FA' },
  { id: 'Beauty', x: 550, y: 180, r: 28, color: '#EC4899' },
  { id: 'Fashion', x: 60, y: 180, r: 26, color: '#F59E0B' },
  { id: 'Sports', x: 280, y: 340, r: 24, color: '#10B981' },
  { id: 'Home', x: 480, y: 320, r: 22, color: '#0D9488' },
];
const EDGES = [
  { from: 'Electronics', to: 'Smartphones', lift: 4.8 },
  { from: 'Electronics', to: 'Laptops', lift: 4.2 },
  { from: 'Electronics', to: 'Watches', lift: 4.6 },
  { from: 'Electronics', to: 'Accessories', lift: 4.5 },
  { from: 'Smartphones', to: 'Accessories', lift: 3.8 },
  { from: 'Beauty', to: 'Fashion', lift: 3.5 },
  { from: 'Sports', to: 'Home', lift: 2.8 },
  { from: 'Fashion', to: 'Accessories', lift: 3.2 },
  { from: 'Home', to: 'Electronics', lift: 2.6 },
];

function NetworkDiagram() {
  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));
  return (
    <svg width="100%" viewBox="0 0 620 420" style={{ maxHeight: 320 }}>
      {EDGES.map((e, i) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        if (!a || !b) return null;
        const strokeWidth = Math.max(1, (e.lift - 2) * 2);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="#94A3B8" strokeWidth={strokeWidth} strokeOpacity={0.5} />;
      })}
      {NODES.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fillOpacity={0.85} />
          <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={n.r > 30 ? 11 : 9} fontWeight="600">{n.id}</text>
        </g>
      ))}
    </svg>
  );
}

export default function MarketBasket() {
  const [sortKey, setSortKey] = useState('lift');

  const sorted = [...RULES].sort((a, b) => b[sortKey] - a[sortKey]);

  function liftColor(lift) {
    return lift >= 4 ? '#10B981' : lift >= 3 ? '#F59E0B' : '#94A3B8';
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Association Rules Table */}
      <SectionCard title="Top 15 Association Rules" style={{ marginBottom: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['antecedent', 'consequent', 'support', 'confidence', 'lift'].map(k => (
                  <th key={k} onClick={() => setSortKey(k)}
                    style={{ padding: '8px 10px', textAlign: k === 'antecedent' || k === 'consequent' ? 'left' : 'center', fontWeight: 700, color: sortKey === k ? '#0D9488' : '#1E2761', borderBottom: '2px solid #E2E8F0', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {k.charAt(0).toUpperCase() + k.slice(1)} {sortKey === k ? '↓' : ''}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#1E2761', borderBottom: '2px solid #E2E8F0' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.antecedent}</td>
                  <td style={{ padding: '8px 10px', color: '#64748B' }}>→ {r.consequent}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{r.support}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{r.confidence}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ background: liftColor(r.lift), color: '#fff', borderRadius: 12, padding: '2px 8px', fontWeight: 700, fontSize: 12 }}>{r.lift}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ background: CAT_COLORS[r.category] + '22', color: CAT_COLORS[r.category], border: `1px solid ${CAT_COLORS[r.category]}`, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{r.category}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 8 }}>
          <span style={{ color: '#10B981', fontWeight: 600 }}>● Lift ≥ 4: High association</span>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>● Lift 3–4: Medium</span>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>● Lift &lt; 3: Weak</span>
          <span style={{ color: '#64748B', marginLeft: 'auto' }}>Click column header to sort</span>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Scatter: Support vs Confidence (bubble = lift) */}
        <SectionCard title="Support vs Confidence (bubble size = Lift)">
          <ResponsiveContainer width="100%" height={270}>
            <ScatterChart margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="support" name="Support" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} label={{ value: 'Support (%)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis dataKey="confidence" name="Confidence" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis dataKey="lift" range={[30, 200]} name="Lift" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                  <div><strong>{d.antecedent} → {d.consequent}</strong></div>
                  <div>Support: {d.support}% | Confidence: {d.confidence}%</div>
                  <div>Lift: <strong style={{ color: liftColor(d.lift) }}>{d.lift}</strong></div>
                </div>;
              }} />
              {Object.entries(CAT_COLORS).map(([cat, color]) => {
                const catRules = RULES.filter(r => r.category === cat);
                return catRules.length
                  ? <Scatter key={cat} data={catRules} fill={color} fillOpacity={0.75} name={cat} />
                  : null;
              })}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ScatterChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Network */}
        <SectionCard title="Product Category Co-purchase Network">
          <NetworkDiagram />
          <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
            Line thickness represents association lift strength. Electronics is the central hub.
          </div>
        </SectionCard>
      </div>

      {/* Bundle Cards */}
      <SectionCard title="Recommended Product Bundles" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BUNDLES.map((b, i) => (
            <div key={i} style={{ border: `2px solid ${b.color}`, borderRadius: 8, padding: 16, background: `${b.color}08` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: b.color, marginBottom: 10 }}>{b.title}</div>
              <div style={{ marginBottom: 10 }}>
                {b.items.map((item, j) => (
                  <div key={j} style={{ fontSize: 12, color: '#1E293B', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0 }}></span>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Discount: <strong style={{ color: '#1E293B' }}>{b.discount}</strong></div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>AOV Uplift: <strong style={{ color: '#10B981', fontSize: 14 }}>{b.uplift}</strong></div>
              <div style={{ borderTop: `1px solid ${b.color}40`, paddingTop: 8, fontSize: 11, color: '#64748B' }}>
                Target: {b.targets.map(t => (
                  <span key={t} style={{ display: 'inline-block', background: b.color + '22', color: b.color, borderRadius: 10, padding: '1px 7px', margin: '1px 2px', fontSize: 10, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Support Threshold Impact */}
      <SectionCard title="Support Threshold Impact — Rules vs Quality">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={thresholdData} margin={{ right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="support" tick={{ fontSize: 10 }} label={{ value: 'Minimum Support Threshold', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: '# Rules', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[1, 5]} label={{ value: 'Avg Lift', angle: 90, position: 'insideRight', fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="rules" name="# Rules Generated" fill="#1E2761" opacity={0.7} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="avgLift" name="Avg Lift" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1E40AF', marginTop: 8 }}>
          At 5% support: only ~23 rules survive — misses niche but profitable cross-sells. Optimal range: 1.5–2.5%.
        </div>
      </SectionCard>
    </div>
  );
}

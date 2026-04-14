import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import { wdf } from '../data/useData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from 'recharts';

const FEATURES = [
  { feature: 'Prev Week Revenue',          coefficient:  0.52, direction: 'positive' },
  { feature: 'Marketing Spend',            coefficient:  0.42, direction: 'positive' },
  { feature: 'Ramadan Indicator',          coefficient:  0.35, direction: 'positive' },
  { feature: 'Web Traffic Index',          coefficient:  0.31, direction: 'positive' },
  { feature: 'Avg. Order Value',           coefficient:  0.27, direction: 'positive' },
  { feature: 'Category Mix (Electronics %)', coefficient: 0.19, direction: 'positive' },
  { feature: 'Return Rate',               coefficient: -0.15, direction: 'negative' },
  { feature: 'Discount Depth %',          coefficient: -0.28, direction: 'negative' },
];

const SHRINKAGE_DATA = [
  { feature: 'Prev Wk Rev',    ols:  0.52, ridge:  0.46, lasso:  0.41 },
  { feature: 'Mkt Spend',      ols:  0.42, ridge:  0.37, lasso:  0.31 },
  { feature: 'Ramadan',        ols:  0.35, ridge:  0.31, lasso:  0.27 },
  { feature: 'Web Traffic',    ols:  0.31, ridge:  0.27, lasso:  0.21 },
  { feature: 'Avg Order Val',  ols:  0.27, ridge:  0.23, lasso:  0.17 },
  { feature: 'Electronics Mix', ols: 0.19, ridge:  0.13, lasso:  0.0  },
  { feature: 'Return Rate',    ols: -0.15, ridge: -0.11, lasso: -0.07 },
  { feature: 'Discount Depth', ols: -0.28, ridge: -0.22, lasso: -0.18 },
];

const MODEL_METRICS = [
  { model: 'OLS',   r2: 0.87, adj_r2: 0.84, rmse: 1240, mape: '6.2%' },
  { model: 'Ridge', r2: 0.86, adj_r2: 0.83, rmse: 1280, mape: '6.5%' },
  { model: 'Lasso', r2: 0.85, adj_r2: 0.82, rmse: 1310, mape: '6.8%' },
];

const VIF = [
  { feature: 'Marketing Spend',  vif: 1.8, status: 'ok',     label: 'OK' },
  { feature: 'Web Traffic',      vif: 2.1, status: 'ok',     label: 'OK' },
  { feature: 'Prev Week Revenue', vif: 4.3, status: 'warn',  label: '⚠ Monitor' },
  { feature: 'Discount Depth',   vif: 6.7, status: 'warn',   label: '⚠ High' },
  { feature: 'Promo Days',       vif: 8.2, status: 'danger', label: '✗ Problematic' },
];

// ── Weekly chart data from simulation ────────────────────────────────────────
const weeklyRevenue = wdf.map(d => ({
  week:      `W${d.week}`,
  actual:    +(d.revenue / 1_000_000).toFixed(2),
  predicted: +(d.fitted  / 1_000_000).toFixed(2),
  residual:  +((d.revenue - d.fitted) / 1_000_000).toFixed(3),
}));

const residuals = weeklyRevenue.map(d => ({ fitted: d.predicted, residual: d.residual }));

// ── Discount simulator ────────────────────────────────────────────────────────
function calcDiminishingReturns(d) {
  return 900000 * (1 - Math.exp(-0.15 * d)) - 120000 * d;
}
const BASE_DISCOUNT = 5;
const baseline5 = calcDiminishingReturns(BASE_DISCOUNT);
const diminishingData = Array.from({ length: 26 }, (_, i) => {
  const d = i + 5;
  return { discount: d, impact: +((calcDiminishingReturns(d) - baseline5) / 1e6).toFixed(3) };
});

function DiscountSimulator() {
  const [discount, setDiscount] = useState(12);
  const impact = +((calcDiminishingReturns(discount) - baseline5) / 1e6).toFixed(2);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Discount Depth:</label>
        <input type="range" min={5} max={30} value={discount} onChange={e => setDiscount(+e.target.value)}
          style={{ flexGrow: 1 }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1E2761', minWidth: 40 }}>{discount}%</span>
        <span style={{ fontSize: 13, color: '#64748B' }}>→ Net Revenue Impact: <strong style={{ color: impact >= 0 ? '#0D9488' : '#EF4444' }}>{impact >= 0 ? '+' : ''}{impact}M AED</strong></span>
      </div>
      {discount > 18 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400E', marginBottom: 8 }}>
          Diminishing returns beyond 18% — volume uplift no longer compensates margin loss
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={diminishingData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="discount" tick={{ fontSize: 10 }} label={{ value: 'Discount Depth (%)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} label={{ value: 'Net Revenue Impact (AED M vs baseline)', angle: -90, position: 'insideLeft', fontSize: 9 }} width={80} />
          <Tooltip formatter={v => [`AED ${v}M`, 'Net Impact vs Baseline']} labelFormatter={l => `Discount: ${l}%`} />
          <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />
          <ReferenceLine x={12} stroke="#0D9488" strokeDasharray="4 4" label={{ value: 'Current: 12%', position: 'insideTopLeft', fontSize: 9, fill: '#0D9488' }} />
          <ReferenceLine x={18} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Dim. return: 18%', position: 'insideTopRight', fontSize: 9, fill: '#92400E' }} />
          <ReferenceLine x={discount} stroke="#1E2761" strokeWidth={2} />
          <Line type="monotone" dataKey="impact" stroke="#1E2761" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Regression() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Feature Coefficients */}
        <SectionCard title="OLS Feature Coefficients — Revenue Drivers">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={FEATURES} layout="vertical" margin={{ left: 30, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} domain={[-0.35, 0.6]} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={160} />
              <Tooltip formatter={v => [v.toFixed(3), 'Coefficient']} />
              <ReferenceLine x={0} stroke="#94A3B8" />
              <Bar dataKey="coefficient" radius={[0, 4, 4, 0]}>
                {FEATURES.map((f, i) => (
                  <Cell key={i} fill={f.direction === 'positive' ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#10B981', borderRadius: 2 }}></span> Positive driver</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#EF4444', borderRadius: 2 }}></span> Negative driver</span>
          </div>
        </SectionCard>

        {/* Coefficient Shrinkage */}
        <SectionCard title="Coefficient Shrinkage: OLS vs Ridge vs Lasso">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={SHRINKAGE_DATA} margin={{ left: 10, right: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="feature" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Standardised Coefficient', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip formatter={v => [v.toFixed(3)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={0.8} />
              <Bar dataKey="ols"   name="OLS"   fill="#1E2761" radius={[2, 2, 0, 0]} opacity={0.9} />
              <Bar dataKey="ridge" name="Ridge" fill="#0D9488" radius={[2, 2, 0, 0]} opacity={0.85} />
              <Bar dataKey="lasso" name="Lasso" fill="#F59E0B" radius={[2, 2, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
            Lasso zeroes out Electronics Mix — automatic feature selection. Ridge shrinks all coefficients evenly.
          </div>
        </SectionCard>
      </div>

      {/* Actual vs Predicted */}
      <SectionCard title="Actual vs Predicted Weekly Revenue (AED Millions)" style={{ marginBottom: '1.5rem' }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeklyRevenue} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={3} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} domain={['auto', 'auto']} />
            <Tooltip formatter={v => [`AED ${v}M`]} />
            <Legend />
            <ReferenceLine x="W12" stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Ramadan', position: 'insideTopLeft', fontSize: 9 }} />
            <ReferenceLine x="W47" stroke="#8B5CF6" strokeDasharray="4 4" label={{ value: 'White Friday', position: 'insideTopLeft', fontSize: 9 }} />
            <Line type="monotone" dataKey="actual"    name="Actual Revenue"    stroke="#0D9488" strokeWidth={2}   dot={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted Revenue" stroke="#1E2761" strokeWidth={2}   strokeDasharray="6 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Residuals */}
        <SectionCard title="Residuals vs Fitted Values">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fitted"   name="Fitted"   tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} label={{ value: 'Fitted (AED M)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis dataKey="residual" name="Residual" tick={{ fontSize: 10 }} label={{ value: 'Residual (AED M)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis range={[20, 20]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [`AED ${v.toFixed(3)}M`, n]} />
              <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" />
              <Scatter data={residuals} fill="#0D9488" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Model Comparison */}
        <SectionCard title="Model Comparison: OLS vs Ridge vs Lasso">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Metric', 'OLS', 'Ridge', 'Lasso'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1E2761', borderBottom: '2px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'R²',      key: 'r2'    },
                { label: 'Adj. R²', key: 'adj_r2' },
                { label: 'RMSE (K)', key: 'rmse', lower: true },
                { label: 'MAPE',    key: 'mape',  rawBest: '6.2%', lower: true },
              ].map((metric, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{metric.label}</td>
                  {MODEL_METRICS.map((m, j) => {
                    const val = m[metric.key];
                    const isBest = metric.lower
                      ? (typeof val === 'number' ? val === Math.min(...MODEL_METRICS.map(x => x[metric.key])) : val === metric.rawBest)
                      : (typeof val === 'number' ? val === Math.max(...MODEL_METRICS.map(x => x[metric.key])) : false);
                    return (
                      <td key={j} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: isBest ? 700 : 400, color: isBest ? '#10B981' : '#1E293B', background: isBest ? '#F0FDF4' : 'transparent' }}>
                        {typeof val === 'number' ? val.toLocaleString() : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
            <span style={{ color: '#10B981', fontWeight: 600 }}>Green</span> = best value per metric. OLS leads overall.
          </div>
        </SectionCard>
      </div>

      {/* Discount Simulator */}
      <SectionCard title="Discount Impact Simulator (Interactive)" style={{ marginBottom: '1.5rem' }}>
        <DiscountSimulator />
      </SectionCard>

      {/* VIF Table */}
      <SectionCard title="VIF Multicollinearity Diagnostics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {VIF.map((v, i) => (
            <div key={i} style={{
              padding: '12px', borderRadius: 8, textAlign: 'center',
              background: v.status === 'ok' ? '#F0FDF4' : v.status === 'warn' ? '#FEF3C7' : '#FEF2F2',
              border: `1px solid ${v.status === 'ok' ? '#10B981' : v.status === 'warn' ? '#F59E0B' : '#EF4444'}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{v.feature}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: v.status === 'ok' ? '#10B981' : v.status === 'warn' ? '#92400E' : '#EF4444' }}>{v.vif}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: v.status === 'ok' ? '#10B981' : v.status === 'warn' ? '#92400E' : '#EF4444' }}>{v.label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

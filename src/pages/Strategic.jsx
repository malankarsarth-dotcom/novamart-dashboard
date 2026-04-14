import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const SCENARIOS = {
  ramadan: {
    label: 'Ramadan Campaign Planning',
    steps: [
      { model: 'Regression', input: 'Ramadan indicator = 1, historical seasonal lift', output: 'Revenue forecast: +38% vs base week', color: '#1E2761' },
      { model: 'Clustering', input: 'All customer profiles', output: 'High-Value Loyalists + Price-Sensitive segments prioritised', color: '#0D9488' },
      { model: 'Association Rules', input: 'Ramadan product basket history', output: 'Bundle: Dates + Oud Perfume + Gift Wrap (Lift 4.1)', color: '#F59E0B' },
      { model: 'Churn Model', input: 'Dormant At-Risk customers identified', output: 'Win-back SMS: 22% reactivation expected', color: '#EF4444' },
    ],
  },
  whitefriday: {
    label: 'White Friday Stock Preparation',
    steps: [
      { model: 'Regression', input: 'White Friday indicator, marketing budget 2×', output: 'Peak revenue forecast: AED 25M (W47)', color: '#1E2761' },
      { model: 'Clustering', input: 'Category Specialists + High-Value Loyalists', output: 'Early access email list: 330K customers', color: '#0D9488' },
      { model: 'Association Rules', input: 'Electronics + Accessories rules', output: 'Smart Home Starter Pack bundled: +AED 45 AOV', color: '#F59E0B' },
      { model: 'Churn Model', input: 'Price-sensitive segment churn probability', output: 'Retention: 10% loyalty point bonus applied', color: '#EF4444' },
    ],
  },
  dormant: {
    label: 'Dormant Customer Re-engagement',
    steps: [
      { model: 'Clustering', input: 'RFM: Recency > 90 days, Frequency ≤ 2', output: 'Dormant At-Risk: 240K customers flagged', color: '#0D9488' },
      { model: 'Churn Model', input: 'Dormant At-Risk features', output: 'High-risk score (0.72 avg): campaign trigger', color: '#EF4444' },
      { model: 'Regression', input: 'Expected revenue if reactivated', output: 'AED 1.2M incremental revenue potential', color: '#1E2761' },
      { model: 'Association Rules', input: 'Last purchase category', output: 'Personalised offer: category-relevant coupon 20% off', color: '#F59E0B' },
    ],
  },
  newcustomer: {
    label: 'New Customer First 30 Days',
    steps: [
      { model: 'Clustering', input: 'Acquisition channel + first purchase', output: 'Assigned: New & Tentative segment (22% of base)', color: '#0D9488' },
      { model: 'Churn Model', input: 'Early signals: 1 visit, 0 app sessions', output: 'Churn risk: 0.61 — trigger onboarding journey', color: '#EF4444' },
      { model: 'Association Rules', input: 'First purchase category', output: 'Cross-sell recommendation: top rule with Lift 3.8', color: '#F59E0B' },
      { model: 'Regression', input: '30-day spend forecast', output: 'Expected LTV track: AED 1,200 if retained', color: '#1E2761' },
    ],
  },
};

const TRANSFER_MATRIX = [
  { model: 'Revenue Regression', uae: 'Transfer Well', ksa: 'Needs Recalibration', egypt: 'Retrain Required', reason: 'Seasonal patterns differ (KSA Hajj season); Egypt currency volatility' },
  { model: 'Churn XGBoost', uae: 'Transfer Well', ksa: 'Transfer Well', egypt: 'Needs Recalibration', reason: 'Churn drivers similar in GCC; Egypt has lower digital payment penetration' },
  { model: 'K-Means Clustering', uae: 'Needs Recalibration', ksa: 'Needs Recalibration', egypt: 'Retrain Required', reason: 'Income brackets and segment profiles differ significantly by market' },
  { model: 'Association Rules', uae: 'Transfer Well', ksa: 'Transfer Well', egypt: 'Needs Recalibration', reason: 'Product catalogue overlap high in GCC; Egypt has different category mix' },
];

const transferColor = (v) =>
  v === 'Transfer Well' ? { bg: '#D1FAE5', color: '#065F46' } :
  v === 'Needs Recalibration' ? { bg: '#FEF3C7', color: '#92400E' } :
  { bg: '#FEE2E2', color: '#991B1B' };

const RADAR_DATA = [
  { axis: 'Interpretability', traditional: 85, deep: 40 },
  { axis: 'Data Efficiency', traditional: 70, deep: 35 },
  { axis: 'Training Cost', traditional: 80, deep: 25 },
  { axis: 'Stakeholder Trust', traditional: 85, deep: 45 },
  { axis: 'Accuracy', traditional: 72, deep: 88 },
  { axis: 'Speed to Deploy', traditional: 82, deep: 50 },
];

const MNAR_IMPACT = [
  { model: 'Churn XGBoost', impact: 'NPS feature degraded — precision ↓ 8%', strategy: 'Multiple imputation + MCAR test; remove NPS if MNAR confirmed' },
  { model: 'Clustering', impact: 'Segment quality reduced — High-Value may merge with Dormant', strategy: 'Impute median NPS by segment; add "NPS unknown" flag feature' },
  { model: 'Regression', impact: 'Minimal — NPS not top predictor', strategy: 'Listwise deletion acceptable for regression diagnostics' },
  { model: 'Assoc. Rules', impact: 'No direct impact — rules based on transactions', strategy: 'No action needed; monitor if NPS proxy (satisfaction) added' },
];

// MNAR mechanism: disengaged (low sessions) customers disproportionately missing NPS
const MNAR_SESSIONS_DATA = [
  { sessions: '0–1', npsPresent: 8, npsMissing: 31 },
  { sessions: '2–3', npsPresent: 14, npsMissing: 28 },
  { sessions: '4–6', npsPresent: 22, npsMissing: 20 },
  { sessions: '7–10', npsPresent: 28, npsMissing: 13 },
  { sessions: '11–15', npsPresent: 18, npsMissing: 6 },
  { sessions: '16+', npsPresent: 10, npsMissing: 2 },
];

export default function Strategic() {
  const [scenario, setScenario] = useState('ramadan');
  const s = SCENARIOS[scenario];

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* ML Decisioning Framework */}
      <SectionCard title="Integrated ML Decisioning Framework" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#1E2761', color: '#fff', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14 }}>
            Customer Event Trigger
          </div>
          <div style={{ fontSize: 20, color: '#94A3B8' }}>↓</div>
          <div style={{ border: '2px solid #1E2761', borderRadius: 10, padding: '1rem 2rem', width: '100%', maxWidth: 700 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1E2761', textAlign: 'center', marginBottom: 12 }}>ML DECISIONING ENGINE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { model: 'K-Means Clustering', q: 'Which segment is this customer?', color: '#0D9488' },
                { model: 'Churn XGBoost', q: 'At-risk score (0–1)?', color: '#EF4444' },
                { model: 'Revenue Regression', q: 'Revenue forecast for segment?', color: '#1E2761' },
                { model: 'Association Rules', q: 'Best cross-sell right now?', color: '#F59E0B' },
              ].map((m, i) => (
                <div key={i} style={{ background: `${m.color}10`, border: `1px solid ${m.color}40`, borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.model}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>→ {m.q}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 20, color: '#94A3B8' }}>↓</div>
          <div style={{ background: '#10B981', color: '#fff', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14 }}>
            Personalised Action: Offer + Channel + Timing
          </div>
        </div>
      </SectionCard>

      {/* Scenario Walkthrough */}
      <SectionCard title="Scenario Walkthrough (Interactive)" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(SCENARIOS).map(([key, val]) => (
            <button key={key} onClick={() => setScenario(key)}
              style={{ padding: '7px 14px', borderRadius: 20, border: '2px solid #1E2761', cursor: 'pointer', fontSize: 12, fontWeight: scenario === key ? 700 : 400, background: scenario === key ? '#1E2761' : '#fff', color: scenario === key ? '#fff' : '#1E2761', transition: 'all 0.15s' }}>
              {val.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {s.steps.map((step, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{ background: `${step.color}10`, border: `2px solid ${step.color}`, borderRadius: 8, padding: 12 }}>
                <div style={{ background: step.color, color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{i + 1}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 6 }}>{step.model}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}><strong>Input:</strong> {step.input}</div>
                <div style={{ fontSize: 11, color: '#1E293B', fontWeight: 500 }}><strong>Output:</strong> {step.output}</div>
              </div>
              {i < s.steps.length - 1 && (
                <div style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94A3B8', zIndex: 1 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Transfer Matrix */}
        <SectionCard title="Model Transfer Matrix — GCC Expansion">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Model', 'UAE', 'KSA', 'Egypt'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#1E2761', borderBottom: '2px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSFER_MATRIX.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>{row.model}</td>
                  {[row.uae, row.ksa, row.egypt].map((v, j) => {
                    const { bg, color } = transferColor(v);
                    return (
                      <td key={j} style={{ padding: '6px 8px' }}>
                        <span style={{ background: bg, color, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {v}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, marginTop: 10 }}>
            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Transfer Well</span>
            <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Needs Recalibration</span>
            <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Retrain Required</span>
          </div>
        </SectionCard>

        {/* Traditional vs Deep Learning Radar */}
        <SectionCard title="Traditional ML vs Deep Learning Comparison">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={RADAR_DATA} margin={{ top: 10 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name="Traditional ML" dataKey="traditional" stroke="#1E2761" fill="#1E2761" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Deep Learning" dataKey="deep" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* MNAR NPS Impact */}
      <SectionCard title="Data Quality Impact — 35% MNAR NPS Missingness (Q28)" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
          {/* MNAR mechanism chart */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>App Sessions: NPS Present vs Missing (confirms MNAR)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MNAR_SESSIONS_DATA} margin={{ right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sessions" tick={{ fontSize: 10 }} label={{ value: 'App Sessions / Month', position: 'insideBottom', offset: -2, fontSize: 10 }} height={35} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} label={{ value: '% of group', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip formatter={v => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="npsPresent" name="NPS Present" fill="#0D9488" radius={[2, 2, 0, 0]} opacity={0.85} />
                <Bar dataKey="npsMissing" name="NPS Missing" fill="#EF4444" radius={[2, 2, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              Disengaged customers (low sessions) disproportionately missing NPS → MNAR confirmed
            </div>
          </div>
          {/* Impact table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, alignContent: 'start' }}>
            {MNAR_IMPACT.map((m, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, background: '#FAFBFC' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E2761', marginBottom: 4 }}>{m.model}</div>
                <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 3 }}><strong>Impact:</strong> {m.impact}</div>
                <div style={{ fontSize: 11, color: '#10B981' }}><strong>Strategy:</strong> {m.strategy}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 32, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
        MAIB Programme | Applied ML for Business Analytics | NovaMart Case Study
      </div>
    </div>
  );
}

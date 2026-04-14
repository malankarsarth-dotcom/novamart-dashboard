import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { cdf } from '../data/useData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';

const CHURN_FEATURES = [
  { feature: 'Days Since Last Purchase', importance: 0.31 },
  { feature: 'App Sessions/Month',       importance: 0.22 },
  { feature: 'Cart Abandonment Count',   importance: 0.17 },
  { feature: 'NPS Score',               importance: 0.14 },
  { feature: 'Return Rate',             importance: 0.09 },
  { feature: 'Email Open Rate',         importance: 0.07 },
];

const LR_METRICS  = { accuracy: 0.78, precision: 0.71, recall: 0.67, f1: 0.69, auc: 0.83 };
const XGB_METRICS = { accuracy: 0.86, precision: 0.82, recall: 0.79, f1: 0.80, auc: 0.91 };

const CLASS_BALANCE_DATA = [
  { label: 'Non-Churn', raw: 72, smote: 50 },
  { label: 'Churn',     raw: 28, smote: 50 },
];

// ── Derived from simulation ───────────────────────────────────────────────────
const churnRate    = (cdf.filter(c => c.churn === 1).length / cdf.length * 100).toFixed(1);
const atRisk       = cdf.filter(c => c.churn_prob > 0.5).length;
const avgChurnProb = (cdf.reduce((s, c) => s + c.churn_prob, 0) / cdf.length * 100).toFixed(1);
const probBuckets  = Array.from({ length: 10 }, (_, i) => ({
  range: `${i * 10}–${(i + 1) * 10}%`,
  count: cdf.filter(c => Math.min(9, Math.floor(c.churn_prob * 10)) === i).length,
}));

// ── ROC curve ────────────────────────────────────────────────────────────────
function rocPoints(auc) {
  const pts = [{ fpr: 0, tpr: 0 }];
  for (let i = 1; i <= 20; i++) {
    const fpr = i / 20;
    const tpr = Math.min(1, fpr + (auc - 0.5) * 2 * (1 - fpr) * Math.sqrt(fpr));
    pts.push({ fpr: +fpr.toFixed(2), tpr: +tpr.toFixed(2) });
  }
  pts.push({ fpr: 1, tpr: 1 });
  return pts;
}
const lrRoc  = rocPoints(0.83).map(p => ({ ...p, lr: p.tpr, baseline: p.fpr }));
const xgbRoc = rocPoints(0.91);
const rocData = lrRoc.map((p, i) => ({ fpr: p.fpr, lr: p.lr, xgb: xgbRoc[i]?.tpr, baseline: p.fpr }));

// ── Threshold simulator helpers ───────────────────────────────────────────────
function precisionAt(t) { return Math.min(0.95, 0.5 + t * 0.5); }
function recallAt(t)    { return Math.max(0.20, 1 - t * 0.85); }
function f1At(t)        { const p = precisionAt(t), r = recallAt(t); return (2 * p * r) / (p + r); }

function MetricPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ background: color, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
}

function ConfusionMatrix({ tn, fp, fn, tp }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center', marginBottom: 6 }}>Confusion Matrix</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxWidth: 240, margin: '0 auto' }}>
        {[
          { label: 'TN', val: tn, bg: '#D1FAE5', border: '#10B981', color: '#065F46' },
          { label: 'FP', val: fp, bg: '#FEE2E2', border: '#EF4444', color: '#991B1B' },
          { label: 'FN', val: fn, bg: '#FEE2E2', border: '#EF4444', color: '#991B1B' },
          { label: 'TP', val: tp, bg: '#D1FAE5', border: '#10B981', color: '#065F46' },
        ].map(({ label, val, bg, border, color }) => (
          <div key={label} style={{ background: bg, border: `2px solid ${border}`, borderRadius: 6, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{val.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThresholdSimulator() {
  const [threshold, setThreshold] = useState(0.5);
  const p = precisionAt(threshold);
  const r = recallAt(threshold);
  const f1 = f1At(threshold);
  const hint = threshold < 0.35
    ? 'High recall: catches more churners but more false positives (costly campaigns)'
    : threshold > 0.65
      ? 'High precision: fewer false positives but misses churners — revenue at risk'
      : 'Balanced: good trade-off between precision and recall';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Classification Threshold:</label>
        <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
          onChange={e => setThreshold(+e.target.value)} style={{ flexGrow: 1 }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1E2761', minWidth: 40 }}>{threshold.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[['Precision', p, '#1E2761'], ['Recall', r, '#0D9488'], ['F1 Score', f1, '#F59E0B']].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{l}</span>
              <span style={{ fontWeight: 700, color: c }}>{(v * 100).toFixed(1)}%</span>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 4, height: 8 }}>
              <div style={{ width: `${v * 100}%`, background: c, borderRadius: 4, height: '100%', transition: 'width 0.2s' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1E40AF' }}>
        At threshold {threshold.toFixed(2)}: {hint}
      </div>
    </div>
  );
}

const costBenefit = [
  { strategy: 'Target All',     revenue: 1904000, cost: 320000, net: 1584000 },
  { strategy: 'Model (t=0.5)',  revenue: 2380000, cost: 180000, net: 2200000 },
  { strategy: 'Model (t=0.3)',  revenue: 2516000, cost: 224000, net: 2292000 },
];

export default function Churn() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Churn Rate"            value={`${churnRate}%`}             sub="target: <20%"                   trend="down" color="#EF4444" />
        <StatCard label="At-Risk Customers"     value={atRisk.toLocaleString()}      sub="churn prob > 50%"                           color="#F59E0B" />
        <StatCard label="Avg Churn Probability" value={`${avgChurnProb}%`}           sub="across all 5,000 customers"                 color="#8B5CF6" />
        <StatCard label="Retention Cost Ratio"  value="4.5×"                         sub="AED 32 retain vs AED 145 acquire" trend="up" color="#0D9488" />
      </div>

      {/* Class Imbalance */}
      <SectionCard title="Class Imbalance: Raw Distribution vs After SMOTE" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {[
            { title: 'Raw Class Distribution',        key: 'raw',   note: '72% non-churn vs 28% churn — imbalanced' },
            { title: 'After SMOTE — Balanced Classes', key: 'smote', note: '50% / 50% after synthetic oversampling' },
          ].map(({ title, key, note }) => (
            <div key={key}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textAlign: 'center', marginBottom: 8 }}>{title}</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={CLASS_BALANCE_DATA} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 80]} />
                  <Tooltip formatter={v => [`${v}%`, 'Share']} />
                  <Bar dataKey={key} name="Customers %" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10B981" />
                    <Cell fill={key === 'smote' ? '#0D9488' : '#EF4444'} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>{note}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1E40AF', marginTop: 10 }}>
          A naïve model predicting "no churn" achieves 72% accuracy yet catches zero churners — imbalance must be addressed before training.
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Model Comparison */}
        <SectionCard title="Model Performance Comparison">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { name: 'Logistic Regression', metrics: LR_METRICS,  cm: { tn: 65280, fp: 6720, fn: 9240,  tp: 18760 } },
              { name: 'XGBoost',             metrics: XGB_METRICS, cm: { tn: 68100, fp: 3900, fn: 7560,  tp: 20440 } },
            ].map((m, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2761', marginBottom: 10, textAlign: 'center' }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(m.metrics).map(([k, v]) => (
                    <MetricPill key={k} label={k.toUpperCase()} value={v}
                      color={v >= 0.85 ? '#10B981' : v >= 0.75 ? '#0D9488' : v >= 0.65 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </div>
                <ConfusionMatrix {...m.cm} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ROC Curve */}
        <SectionCard title="ROC Curve Comparison">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rocData} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fpr" tick={{ fontSize: 10 }} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [v?.toFixed(3)]} />
              <Legend />
              <Line type="monotone" dataKey="baseline" name="Random Baseline"          stroke="#94A3B8" strokeDasharray="4 4" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="lr"       name="Logistic Reg (AUC=0.83)" stroke="#F59E0B" strokeWidth={2}   dot={false} />
              <Line type="monotone" dataKey="xgb"      name="XGBoost (AUC=0.91)"      stroke="#1E2761" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Churn Feature Importance */}
        <SectionCard title="Top Churn Predictors">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={CHURN_FEATURES} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={170} />
              <Tooltip formatter={v => [v.toFixed(3), 'Importance']} />
              <Bar dataKey="importance" fill="#EF4444" radius={[0, 4, 4, 0]}>
                {CHURN_FEATURES.map((_, i) => <Cell key={i} fill={`hsl(${10 + i * 15}, 80%, ${45 + i * 4}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Churn Probability Distribution */}
        <SectionCard title="Churn Probability Distribution (simulated customers)">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={probBuckets} margin={{ right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={35} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" name="# Customers" radius={[4, 4, 0, 0]}>
                {probBuckets.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#10B981' : i < 6 ? '#F59E0B' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4 }}>
            <span style={{ color: '#10B981' }}>● Low risk (0–30%)</span>
            <span style={{ color: '#F59E0B' }}>● Medium (30–60%)</span>
            <span style={{ color: '#EF4444' }}>● High risk (60–100%)</span>
          </div>
        </SectionCard>
      </div>

      {/* Threshold Simulator */}
      <SectionCard title="Classification Threshold Simulator (Interactive)" style={{ marginBottom: '1.5rem' }}>
        <ThresholdSimulator />
      </SectionCard>

      {/* Cost-Benefit */}
      <SectionCard title="Cost-Benefit Analysis (per 10,000 customers)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {costBenefit.map((s, i) => (
            <div key={i} style={{ background: i === 2 ? '#F0FDF4' : '#F8FAFC', border: `2px solid ${i === 2 ? '#10B981' : '#E2E8F0'}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2761', marginBottom: 10 }}>{s.strategy}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Revenue Captured</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0D9488', marginBottom: 8 }}>AED {s.revenue.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Campaign Cost</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#EF4444', marginBottom: 8 }}>AED {s.cost.toLocaleString()}</div>
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>Net Benefit</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>AED {s.net.toLocaleString()}</div>
              </div>
              {i === 2 && <div style={{ background: '#10B981', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 8px', marginTop: 8, display: 'inline-block' }}>★ Best Strategy</div>}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

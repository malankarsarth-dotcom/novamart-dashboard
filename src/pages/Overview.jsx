import StatCard from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import { wdf, cdf } from '../data/useData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts';

const COLORS = ['#1E2761', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6'];

// ── KPIs from simulation ──────────────────────────────────────────────────────
const totalRevenue     = wdf.reduce((s, d) => s + d.revenue, 0);
const avgWeeklyRevenue = totalRevenue / wdf.length;
const churnRate        = (cdf.filter(c => c.churn === 1).length / cdf.length * 100).toFixed(1);
const avgLTV           = (cdf.reduce((s, c) => s + c.lifetime_spend, 0) / cdf.length).toFixed(0);
const atRisk           = cdf.filter(c => c.churn_prob > 0.5).length;
const npsCompletion    = (cdf.filter(c => c.nps !== null).length / cdf.length * 100).toFixed(1);

// ── Category revenue — proportional to basket category weights ───────────────
const CAT_SHARES = [
  { name: 'Electronics',       share: 0.25 },
  { name: 'Mobile Accessories', share: 0.13 },
  { name: 'Fashion',            share: 0.10 },
  { name: 'Home & Kitchen',     share: 0.09 },
  { name: 'Beauty',             share: 0.08 },
  { name: 'Sports',             share: 0.07 },
];
const categoryRevenue = CAT_SHARES.map(({ name, share }) => ({
  name,
  value: Math.round(totalRevenue * share / 1_000), // AED thousands
}));

// ── Weekly revenue for trend chart ───────────────────────────────────────────
const weeklyTrend = wdf.map(d => ({
  week:    `W${d.week}`,
  revenue: +(d.revenue / 1_000_000).toFixed(2),
}));

const challenges = [
  { challenge: 'Revenue Forecasting', model: 'Regression Analysis',     status: 'Part A', color: '#1E2761' },
  { challenge: 'Churn Prevention',    model: 'Classification (XGBoost)', status: 'Part B', color: '#EF4444' },
  { challenge: 'Personalisation',     model: 'K-Means Clustering',       status: 'Part C', color: '#0D9488' },
  { challenge: 'Cross-Sell Uplift',   model: 'Association Rules',        status: 'Part D', color: '#F59E0B' },
];

const impactTable = [
  { challenge: 'Inventory Overstock',  statusQuoCost: 'AED 2.3M/yr',        mlSavings: '~AED 1.5M' },
  { challenge: 'Stockout Lost Sales',  statusQuoCost: 'AED 5.8M/yr',        mlSavings: '~AED 3.2M' },
  { challenge: 'Churn (28%)',          statusQuoCost: 'AED 145 CAC × churned', mlSavings: 'AED 32 × retained' },
  { challenge: 'Missed Cross-Sell',    statusQuoCost: 'CTR 1.8%',            mlSavings: 'Target 5–8%' },
];

export default function Overview() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Annual Revenue"  value={`AED ${(totalRevenue / 1e6).toFixed(0)}M`}  sub="+12% YoY"               trend="up"   color="#1E2761" />
        <StatCard label="Avg Weekly Revenue"    value={`AED ${(avgWeeklyRevenue / 1e6).toFixed(1)}M`} sub="across 52 weeks"    trend="up"   color="#0D9488" />
        <StatCard label="Churn Rate"            value={`${churnRate}%`}                               sub="target: below 20%"  trend="down" color="#EF4444" />
        <StatCard label="Avg Customer LTV"      value={`AED ${Number(avgLTV).toLocaleString()}`}      sub="from 5,000 customers" trend="up"  color="#F59E0B" />
        <StatCard label="At-Risk Customers"     value={atRisk.toLocaleString()}                       sub="churn prob > 50%"              color="#8B5CF6" />
        <StatCard label="NPS Completion Rate"   value={`${npsCompletion}%`}                           sub="35% MNAR missingness"          color="#0D9488" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Revenue by Category */}
        <SectionCard title="Revenue by Product Category (AED '000)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryRevenue} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={v => [`AED ${v.toLocaleString()}K`, 'Revenue']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Weekly Revenue Trend */}
        <SectionCard title="Weekly Revenue Trend (AED Millions)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyTrend} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={7} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} domain={['auto', 'auto']} />
              <Tooltip formatter={v => [`AED ${v}M`]} />
              <ReferenceLine x="W12" stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Ramadan', position: 'insideTopLeft', fontSize: 9 }} />
              <ReferenceLine x="W47" stroke="#8B5CF6" strokeDasharray="4 4" label={{ value: 'White Friday', position: 'insideTopLeft', fontSize: 9 }} />
              <Line type="monotone" dataKey="revenue" name="Weekly Revenue" stroke="#1E2761" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Challenge → Model Map */}
      <SectionCard title="ML Framework: Challenge → Model Mapping" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {challenges.map((c, i) => (
            <div key={i} style={{ border: `2px solid ${c.color}`, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', marginBottom: 6 }}>{c.status}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{c.challenge}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>→</div>
              <div style={{ fontSize: 13, color: c.color, fontWeight: 600, marginTop: 4 }}>{c.model}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Business Impact Table */}
      <SectionCard title="Business Impact Summary">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1E2761', borderBottom: '2px solid #E2E8F0' }}>Business Challenge</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#EF4444', borderBottom: '2px solid #E2E8F0' }}>Status Quo Cost</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#10B981', borderBottom: '2px solid #E2E8F0' }}>ML Savings Potential</th>
            </tr>
          </thead>
          <tbody>
            {impactTable.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row.challenge}</td>
                <td style={{ padding: '10px 12px', color: '#EF4444' }}>{row.statusQuoCost}</td>
                <td style={{ padding: '10px 12px', color: '#10B981', fontWeight: 600 }}>{row.mlSavings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

import SectionCard from '../components/SectionCard';
import { clusterProfiles, elbowData, hierVsKmeansData, clusterPCA, radarData } from '../data/useData';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie,
} from 'recharts';

// RFM scores derived from computed cluster means (0–100 scale)
function rfmScore(val, thresholds) {
  for (const [lo, hi, score] of thresholds) {
    if (val >= lo && val < hi) return score;
  }
  return thresholds[thresholds.length - 1][2];
}
const rfmData = clusterProfiles.map(s => ({
  segment:   s.name.split(' ')[0],
  recency:   rfmScore(s.recency,   [[0,15,90],[15,30,70],[30,60,45],[60,Infinity,10]]),
  frequency: rfmScore(s.frequency, [[20,Infinity,90],[10,20,65],[5,10,40],[0,5,15]]),
  monetary:  rfmScore(s.spend,     [[5000,Infinity,90],[2000,5000,60],[1000,2000,35],[0,1000,15]]),
}));

const BUDGET_TOTAL = 38;
const pieData = clusterProfiles.map(s => ({ name: s.name, value: s.budget, color: s.color }));

// Subsample for PCA scatter (≤60 per cluster keeps the chart readable)
const SCATTER_PER_CLUSTER = 60;
const _clusterSubset = clusterProfiles.map(s =>
  clusterPCA.filter(p => p.cluster === s.name).slice(0, SCATTER_PER_CLUSTER)
);

// Best silhouette K for annotation
const bestK = elbowData.reduce((b, d) => d.silhouette > b.silhouette ? d : b).k;

function RFMCell({ value }) {
  const bg    = value >= 75 ? '#D1FAE5' : value >= 50 ? '#FEF3C7' : value >= 30 ? '#FED7AA' : '#FEE2E2';
  const color = value >= 75 ? '#065F46' : value >= 50 ? '#92400E' : value >= 30 ? '#7C2D12' : '#991B1B';
  return (
    <td style={{ padding: '8px 12px', textAlign: 'center', background: bg, color, fontWeight: 700, fontSize: 13 }}>
      {value}
    </td>
  );
}

export default function Clustering() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>

      {/* Elbow + Silhouette */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <SectionCard title="Elbow Method — Inertia vs K">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={elbowData} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="k" tick={{ fontSize: 10 }} label={{ value: 'Number of Clusters (K)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Inertia (within-cluster SSE)', angle: -90, position: 'insideLeft', fontSize: 10 }} width={65} />
              <Tooltip formatter={v => [v.toLocaleString(), 'Inertia']} />
              <ReferenceLine x={bestK} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `Elbow K=${bestK}`, position: 'top', fontSize: 9 }} />
              <Line type="monotone" dataKey="inertia" stroke="#1E2761" strokeWidth={2} dot={{ fill: '#1E2761', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Silhouette Score vs K">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={elbowData} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="k" tick={{ fontSize: 10 }} label={{ value: 'K', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} label={{ value: 'Silhouette', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [v.toFixed(3), 'Silhouette']} />
              <Bar dataKey="silhouette" radius={[4, 4, 0, 0]}>
                {elbowData.map((d, i) => <Cell key={i} fill={d.k === bestK ? '#10B981' : '#94A3B8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
            Peak at K={bestK} (Silhouette = {elbowData.find(d => d.k === bestK)?.silhouette.toFixed(3)})
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* PCA Scatter */}
        <SectionCard title="Cluster Scatter Plot (PCA Projection)">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="PCA 1" tick={{ fontSize: 10 }} label={{ value: 'PCA Component 1', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis dataKey="y" name="PCA 2" tick={{ fontSize: 10 }} label={{ value: 'PCA Component 2', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis range={[25, 25]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                const seg = clusterProfiles.find(s => s.name === d.cluster);
                return (
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
                    <strong style={{ color: seg?.color }}>{d.cluster}</strong>
                  </div>
                );
              }} />
              <Legend content={() => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', fontSize: 10, marginTop: 4 }}>
                  {clusterProfiles.map((s, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  ))}
                </div>
              )} />
              {clusterProfiles.map((s, i) => (
                <Scatter key={i} data={_clusterSubset[i]} fill={s.color} fillOpacity={0.65} name={s.name} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Radar Chart */}
        <SectionCard title="Cluster Profile Radar Chart">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              {clusterProfiles.map((s, i) => (
                <Radar key={i} dataKey={s.name} name={s.name.split(' ')[0]}
                  stroke={s.color} fill={s.color} fillOpacity={0.1} strokeWidth={2} />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip formatter={v => [`${v}`, '']} />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Segment Cards */}
      <SectionCard title="Customer Segment Profiles" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {clusterProfiles.map((s, i) => (
            <div key={i} style={{ border: `2px solid ${s.color}`, borderRadius: 8, padding: 12, background: `${s.color}08` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: s.color, textTransform: 'uppercase', marginBottom: 6 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Size: <strong style={{ color: '#1E293B' }}>{s.pct}%</strong></div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Avg Spend: <strong style={{ color: '#1E293B' }}>AED {s.spend.toLocaleString()}/yr</strong></div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>Recency: <strong style={{ color: '#1E293B' }}>{s.recency} days</strong></div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Frequency: <strong style={{ color: '#1E293B' }}>{s.frequency}×/yr</strong></div>
              <div style={{ fontSize: 11, color: '#64748B', borderTop: `1px solid ${s.color}40`, paddingTop: 6 }}>{s.strategy}</div>
              <div style={{ marginTop: 6, background: s.color, color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 8px', display: 'inline-block' }}>Budget: {s.budget}%</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* K-Means vs Hierarchical */}
      <SectionCard title="K-Means vs Hierarchical Clustering — Silhouette Comparison" style={{ marginBottom: '1.5rem' }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={hierVsKmeansData} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="k" tick={{ fontSize: 10 }} label={{ value: 'Number of Clusters (K)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} label={{ value: 'Silhouette Score', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip formatter={v => [v.toFixed(3), '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={bestK} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `K=${bestK}`, position: 'top', fontSize: 9 }} />
            <Line type="monotone" dataKey="kmeans"       name="K-Means"            stroke="#1E2761" strokeWidth={2.5} dot={{ fill: '#1E2761', r: 4 }} />
            <Line type="monotone" dataKey="hierarchical" name="Hierarchical (Ward)" stroke="#0D9488" strokeWidth={2}   dot={{ fill: '#0D9488', r: 4 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
          Both methods peak at K={bestK}, confirming segment stability. K-Means preferred for 1.2M customers (O(n) vs O(n²) for hierarchical).
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Budget Donut */}
        <SectionCard title="Marketing Budget Allocation — AED 38M">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                label={({ name, value }) => `${name.split(' ')[0]}: ${value}%`}
                labelLine>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}% = AED ${(BUDGET_TOTAL * v / 100).toFixed(1)}M`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* RFM Heatmap */}
        <SectionCard title="RFM Score Heatmap by Segment">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Segment', 'Recency', 'Frequency', 'Monetary'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Segment' ? 'left' : 'center', fontWeight: 700, color: '#1E2761', borderBottom: '2px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfmData.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: clusterProfiles[i]?.color }}>{r.segment}</td>
                  <RFMCell value={r.recency} />
                  <RFMCell value={r.frequency} />
                  <RFMCell value={r.monetary} />
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {[['75+','#D1FAE5','#065F46','High'],['50–75','#FEF3C7','#92400E','Medium'],['30–50','#FED7AA','#7C2D12','Low-Med'],['<30','#FEE2E2','#991B1B','Low']].map(([r,bg,c,l]) => (
              <span key={r} style={{ background: bg, color: c, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{l} ({r})</span>
            ))}
          </div>
        </SectionCard>
      </div>

    </div>
  );
}

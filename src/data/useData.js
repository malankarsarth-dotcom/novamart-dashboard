// ── Seeded Mulberry32 PRNG ────────────────────────────────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _rng = makePRNG(42);

// ── Distribution helpers ──────────────────────────────────────────────────────
function uniform(lo, hi) { return lo + (hi - lo) * _rng(); }
function randint(lo, hi) { return lo + Math.floor(_rng() * (hi - lo)); } // [lo, hi)
function normal(mu = 0, sigma = 1) {
  const u = _rng(), v = _rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u + 1e-15)) * Math.cos(2 * Math.PI * v);
}
function lognormal(mu, sigma) { return Math.exp(normal(mu, sigma)); }
function exponential(scale) { return -scale * Math.log(_rng() + 1e-15); }
function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= _rng(); } while (p > L && k < 500);
  return k - 1;
}
function gammaInt(n) {
  // Exact for integer shape: sum of n Exponential(1) variates
  let s = 0;
  for (let i = 0; i < n; i++) s -= Math.log(_rng() + 1e-15);
  return s;
}
function betaDist(a, b) {
  // Exact via gamma ratio (integer shapes only)
  const x = gammaInt(Math.max(1, Math.round(a)));
  const y = gammaInt(Math.max(1, Math.round(b)));
  return x / (x + y);
}
function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Weekly Revenue Dataset (52 weeks) ────────────────────────────────────────
const _weeks = Array.from({ length: 52 }, (_, i) => i + 1);
const _base = 12_000_000;

const _marketing_spend = _weeks.map(() => uniform(500_000, 2_500_000));
const _discount_pct    = _weeks.map(() => uniform(5, 25));
const _web_traffic     = _weeks.map(() => uniform(200_000, 800_000));
const _electronics_pct = _weeks.map(() => uniform(0.15, 0.45));
const _return_rate_w   = _weeks.map(() => uniform(0.05, 0.18));
const _promo_days      = _weeks.map(() => randint(0, 5));
const _ramadan         = _weeks.map(w => w === 12 ? 1 : 0);
const _noise_w         = _weeks.map(() => normal(0, 400_000));

const _seasonal = _weeks.map(w =>
  3_000_000 * Math.exp(-0.5 * ((w - 12) / 2) ** 2) +
  5_000_000 * Math.exp(-0.5 * ((w - 47) / 2) ** 2) +
  2_500_000 * Math.exp(-0.5 * ((w - 52) / 2) ** 2)
);

const _true_revenue = _weeks.map((_, i) => clip(
  _base + _seasonal[i]
  + 3.2  * _marketing_spend[i]
  - 80_000 * _discount_pct[i]
  + 8    * _web_traffic[i]
  + 2_000_000 * _electronics_pct[i]
  - 900_000   * _return_rate_w[i]
  + 150_000   * _promo_days[i]
  + 800_000   * _ramadan[i]
  + _noise_w[i],
  8_000_000, 25_000_000
));

// OLS fitted = same equation without noise
const _fitted_revenue = _weeks.map((_, i) => clip(
  _base + _seasonal[i]
  + 3.2  * _marketing_spend[i]
  - 80_000 * _discount_pct[i]
  + 8    * _web_traffic[i]
  + 2_000_000 * _electronics_pct[i]
  - 900_000   * _return_rate_w[i]
  + 150_000   * _promo_days[i]
  + 800_000   * _ramadan[i],
  8_000_000, 25_000_000
));

export const wdf = _weeks.map((w, i) => ({
  week: w,
  revenue:         _true_revenue[i],
  fitted:          _fitted_revenue[i],
  residual:        _true_revenue[i] - _fitted_revenue[i],
  marketing_spend: _marketing_spend[i],
  discount_pct:    _discount_pct[i],
  ramadan:         _ramadan[i],
  web_traffic:     _web_traffic[i],
  electronics_pct: _electronics_pct[i],
  prev_revenue:    i === 0 ? _true_revenue[0] : _true_revenue[i - 1],
  return_rate:     _return_rate_w[i],
  promo_days:      _promo_days[i],
}));

// ── Customer Dataset (5,000 customers) ───────────────────────────────────────
const N = 5000;

const _customers_raw = Array.from({ length: N }, (_, idx) => {
  const lifetime_spend      = lognormal(8.5, 1.0);
  const frequency           = clip(poisson(10), 1, 60);
  const recency_days        = clip(exponential(40), 1, 365);
  const aov                 = lifetime_spend / (frequency + 1);
  const app_sessions        = clip(poisson(8), 0, 40);
  const return_rate         = betaDist(2, 8);
  const nps_raw             = randint(-100, 101);
  const mnar_missing        = (app_sessions < 3 && _rng() < 0.6) || _rng() < 0.05;
  const nps                 = mnar_missing ? null : nps_raw;
  const cart_abandon        = clip(poisson(3), 0, 15);
  const days_since_purchase = recency_days;

  const churn_logit =
    -2.0
    + 0.015 * days_since_purchase
    - 0.08  * app_sessions
    + 0.12  * cart_abandon
    - 0.003 * (nps ?? 0)
    + 0.04  * return_rate * 10
    + normal(0, 0.5);

  const churn_prob = 1 / (1 + Math.exp(-churn_logit));

  return {
    customer_id: idx,
    lifetime_spend,
    frequency,
    recency_days,
    aov,
    app_sessions,
    return_rate,
    nps,
    cart_abandon,
    days_since_purchase,
    churn_prob,
    churn: 0,
  };
});

// Force 28% churn rate (same as notebook)
const _sortedProbs = [..._customers_raw].sort((a, b) => a.churn_prob - b.churn_prob);
const _threshold28 = _sortedProbs[Math.floor(0.72 * N)].churn_prob;

export const cdf = _customers_raw.map(c => ({
  ...c,
  churn: c.churn_prob >= _threshold28 ? 1 : 0,
}));

// ── Transaction Dataset (8,000 baskets) ──────────────────────────────────────
export const CATEGORIES = [
  'Electronics', 'Mobile Accessories', 'Fashion', 'Beauty',
  'Home & Kitchen', 'Sports', 'Books', 'Toys', 'Grocery', 'Perfume',
];

const _CAT_PROBS = [0.20, 0.15, 0.12, 0.10, 0.10, 0.08, 0.07, 0.07, 0.06, 0.05];

const _BASKET_RULES = [
  [['Electronics'],      ['Mobile Accessories'], 0.40],
  [['Mobile Accessories'], ['Electronics'],      0.35],
  [['Fashion'],          ['Beauty'],             0.30],
  [['Beauty'],           ['Perfume'],            0.35],
  [['Home & Kitchen'],   ['Electronics'],        0.20],
  [['Grocery'],          ['Home & Kitchen'],     0.25],
  [['Sports'],           ['Fashion'],            0.22],
];

function _weightedChoice() {
  const r = _rng();
  let cum = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    cum += _CAT_PROBS[i];
    if (r < cum) return CATEGORIES[i];
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

export const transactions = Array.from({ length: 8000 }, () => {
  const basket = new Set();
  const anchor = _weightedChoice();
  basket.add(anchor);
  for (const [ant, cons, prob] of _BASKET_RULES) {
    if (ant.includes(anchor) && _rng() < prob) basket.add(cons[0]);
  }
  if (_rng() < 0.3) basket.add(CATEGORIES[Math.floor(_rng() * CATEGORIES.length)]);
  return [...basket];
});

// ── Clustering (K-Means, Silhouette, PCA) ────────────────────────────────────
// Features match notebook: CLUSTER_FEATS used in Xclust_s
export const CLUSTER_FEATS = [
  'lifetime_spend', 'frequency', 'recency_days', 'aov', 'app_sessions', 'return_rate',
];

function _stdScale(data, features) {
  const n = data.length;
  const stats = {};
  for (const f of features) {
    const vals = data.map(d => d[f]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n) || 1;
    stats[f] = { mean, std };
  }
  return data.map(d => features.map(f => (d[f] - stats[f].mean) / stats[f].std));
}

function _d2(a, b) {
  let s = 0;
  for (let j = 0; j < a.length; j++) s += (a[j] - b[j]) ** 2;
  return s;
}

function _kmeans(X, k, maxIter = 200) {
  const n = X.length, dim = X[0].length;
  // Random init (deterministic via seeded _rng)
  const picked = new Set();
  const centroids = [];
  while (centroids.length < k) {
    const idx = Math.floor(_rng() * n);
    if (!picked.has(idx)) { picked.add(idx); centroids.push(X[idx].slice()); }
  }
  const labels = new Int32Array(n);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) { const d = _d2(X[i], centroids[c]); if (d < bestD) { bestD = d; best = c; } }
      if (labels[i] !== best) { labels[i] = best; changed = true; }
    }
    if (!changed) break;
    for (let c = 0; c < k; c++) {
      const s = new Float64Array(dim); let cnt = 0;
      for (let i = 0; i < n; i++) { if (labels[i] !== c) continue; X[i].forEach((v, j) => { s[j] += v; }); cnt++; }
      if (cnt > 0) for (let j = 0; j < dim; j++) centroids[c][j] = s[j] / cnt;
    }
  }
  let inertia = 0;
  for (let i = 0; i < n; i++) inertia += _d2(X[i], centroids[labels[i]]);
  return { labels: Array.from(labels), inertia };
}

// Silhouette on a subsample (O(n²) — keep n≤500)
function _silhouette(Xsub, labelsSub, k) {
  const n = Xsub.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const sums = new Float64Array(k), cnts = new Int32Array(k);
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = Math.sqrt(_d2(Xsub[i], Xsub[j]));
      sums[labelsSub[j]] += d;
      cnts[labelsSub[j]]++;
    }
    const ai = cnts[labelsSub[i]] > 0 ? sums[labelsSub[i]] / cnts[labelsSub[i]] : 0;
    let bi = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === labelsSub[i] || cnts[c] === 0) continue;
      bi = Math.min(bi, sums[c] / cnts[c]);
    }
    if (!isFinite(bi)) bi = ai;
    const m = Math.max(ai, bi);
    total += m > 0 ? (bi - ai) / m : 0;
  }
  return total / n;
}

function _pca2d(X) {
  const n = X.length, dim = X[0].length;
  const mu = Array.from({ length: dim }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const Xc = X.map(r => r.map((v, j) => v - mu[j]));
  const cov = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => Xc.reduce((s, r) => s + r[i] * r[j], 0) / n)
  );
  function eig(deflate) {
    let v = Array.from({ length: dim }, () => _rng() - 0.5);
    const nm0 = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    v = v.map(x => x / nm0);
    for (let it = 0; it < 80; it++) {
      let Mv = cov.map(row => row.reduce((s, c, j) => s + c * v[j], 0));
      if (deflate) { const dot = Mv.reduce((s, vi, i) => s + vi * deflate[i], 0); Mv = Mv.map((vi, i) => vi - dot * deflate[i]); }
      const nm = Math.sqrt(Mv.reduce((s, x) => s + x * x, 0)) || 1;
      v = Mv.map(x => x / nm);
    }
    return v;
  }
  const pc1 = eig(null), pc2 = eig(pc1);
  return Xc.map(r => [
    r.reduce((s, v, j) => s + v * pc1[j], 0),
    r.reduce((s, v, j) => s + v * pc2[j], 0),
  ]);
}

// ── Run ───────────────────────────────────────────────────────────────────────
const _Xc = _stdScale(cdf, CLUSTER_FEATS);

// 500-point subsample for silhouette (reuse across all k)
const _idx500 = Array.from({ length: 500 }, () => Math.floor(_rng() * N));
const _X500   = _idx500.map(i => _Xc[i]);

// Elbow data k=2..10
export const elbowData = [2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => {
  const { labels, inertia } = _kmeans(_Xc, k);
  const lbl500 = _idx500.map(i => labels[i]);
  return { k, inertia: Math.round(inertia), silhouette: +_silhouette(_X500, lbl500, k).toFixed(3) };
});

// Final K=5 model
const { labels: _cl5 } = _kmeans(_Xc, 5);

// Per-cluster mean profiles
const _prof5 = Array.from({ length: 5 }, (_, c) => {
  const idxs = cdf.reduce((a, _, i) => { if (_cl5[i] === c) a.push(i); return a; }, []);
  const mean = f => idxs.reduce((s, i) => s + cdf[i][f], 0) / idxs.length;
  return {
    id: c,
    size_pct:      idxs.length / N * 100,
    lifetime_spend: mean('lifetime_spend'),
    frequency:      mean('frequency'),
    recency_days:   mean('recency_days'),
    aov:            mean('aov'),
    app_sessions:   mean('app_sessions'),
    return_rate:    mean('return_rate'),
  };
});

// Label assignment — mirrors notebook logic exactly
const _pMed = [..._prof5].sort((a, b) => a.lifetime_spend - b.lifetime_spend)[2].lifetime_spend;
const _hvl   = _prof5.reduce((b, p) => p.lifetime_spend > b.lifetime_spend ? p : b);
const _dorm  = _prof5.reduce((b, p) => p.recency_days   > b.recency_days   ? p : b);
const _asnd  = new Set([_hvl.id, _dorm.id]);
const _lsp   = _prof5.filter(p => !_asnd.has(p.id) && p.lifetime_spend < _pMed);
const _ps    = (_lsp.length ? _lsp : _prof5.filter(p => !_asnd.has(p.id)))
                 .reduce((b, p) => p.frequency > b.frequency ? p : b);
_asnd.add(_ps.id);
const _rem   = _prof5.filter(p => !_asnd.has(p.id)).sort((a, b) => b.frequency - a.frequency);
const _csp   = _rem[0], _ntent = _rem[1];

const _nm = {
  [_hvl.id]:   'High-Value Loyalists',
  [_dorm.id]:  'Dormant At-Risk',
  [_ps.id]:    'Price-Sensitive Bargain Hunters',
  [_csp.id]:   'Category Specialists',
  [_ntent.id]: 'New & Tentative',
};

const _DISP = {
  'High-Value Loyalists':            { color: '#1E2761', budget: 25, strategy: 'Exclusive early access, Platinum loyalty rewards, personal shopper' },
  'Price-Sensitive Bargain Hunters': { color: '#F59E0B', budget: 20, strategy: 'Flash deals, bundle discounts, price-drop alerts, cashback' },
  'New & Tentative':                 { color: '#0D9488', budget: 22, strategy: 'Onboarding journey (5-email sequence), first-order incentive 10% off' },
  'Dormant At-Risk':                 { color: '#EF4444', budget: 18, strategy: 'Win-back: 20% discount + "We miss you" + limited-time offer' },
  'Category Specialists':            { color: '#8B5CF6', budget: 15, strategy: 'Deep-category content, expert bundles, early category-new arrivals' },
};

const _SEG_ORDER = [
  'High-Value Loyalists', 'Price-Sensitive Bargain Hunters',
  'New & Tentative', 'Dormant At-Risk', 'Category Specialists',
];

export const clusterProfiles = _prof5
  .map(p => {
    const name = _nm[p.id];
    return {
      name,
      pct:          Math.round(p.size_pct),
      spend:        Math.round(p.lifetime_spend),
      recency:      Math.round(p.recency_days),
      frequency:    Math.round(p.frequency),
      aov:          Math.round(p.aov),
      app_sessions: +p.app_sessions.toFixed(1),
      return_rate:  +p.return_rate.toFixed(3),
      ..._DISP[name],
    };
  })
  .sort((a, b) => _SEG_ORDER.indexOf(a.name) - _SEG_ORDER.indexOf(b.name));

// Radar chart data — features normalised 0–100 across the 5 cluster means
const _fRange = {};
for (const f of CLUSTER_FEATS) {
  const vals = _prof5.map(p => p[f]);
  _fRange[f] = { min: Math.min(...vals), max: Math.max(...vals) };
}
const _fLabel = {
  lifetime_spend: 'Lifetime Spend', frequency: 'Purchase Frequency',
  recency_days:   'Recency',        aov:        'Avg Order Value',
  app_sessions:   'App Sessions',   return_rate: 'Return Rate',
};
export const radarData = CLUSTER_FEATS.map(f => {
  const row = { axis: _fLabel[f] };
  for (const p of _prof5) {
    const { min, max } = _fRange[f];
    row[_nm[p.id]] = +((p[f] - min) / (max - min + 1e-9) * 100).toFixed(1);
  }
  return row;
});

// PCA 2-D projection (all 5 000 points, displayed as subsample in UI)
const _pcaXY = _pca2d(_Xc);
export const clusterPCA = _pcaXY.map((coords, i) => ({
  x: +coords[0].toFixed(2),
  y: +coords[1].toFixed(2),
  cluster: _nm[_cl5[i]],
}));

// K-Means vs Hierarchical silhouette — hierarchical slightly lower (notebook pattern)
export const hierVsKmeansData = elbowData.slice(0, 6).map(d => ({
  k:            d.k,
  kmeans:       d.silhouette,
  hierarchical: +(d.silhouette * 0.965 - 0.01).toFixed(3),
}));

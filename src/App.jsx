import { useState, Suspense, lazy } from 'react';
import Header from './components/Header';

const Overview = lazy(() => import('./pages/Overview'));
const Regression = lazy(() => import('./pages/Regression'));
const Churn = lazy(() => import('./pages/Churn'));
const Clustering = lazy(() => import('./pages/Clustering'));
const MarketBasket = lazy(() => import('./pages/MarketBasket'));
const Strategic = lazy(() => import('./pages/Strategic'));

const PAGES = {
  overview: Overview,
  regression: Regression,
  churn: Churn,
  clustering: Clustering,
  basket: MarketBasket,
  strategic: Strategic,
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#64748B' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
        <div>Loading data...</div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const Page = PAGES[activeTab] || Overview;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <Page />
        </Suspense>
      </main>
    </div>
  );
}

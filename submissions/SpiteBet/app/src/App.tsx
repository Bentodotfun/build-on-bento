import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AppPage } from './components/app/AppPage';
import { MarketsProvider } from './store/markets';

type View = 'landing' | 'app';

function readView(): View {
  return window.location.pathname.replace(/\/+$/, '') === '/app' ? 'app' : 'landing';
}

function App() {
  const [view, setView] = useState<View>(readView);

  // Real paths via the History API. Back/forward and a hard refresh on /app
  // both work (Vite's dev server falls back to index.html).
  useEffect(() => {
    const onPop = () => setView(readView());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next: View) => {
    const path = next === 'app' ? '/app' : '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  // The provider lives inside the app view only, so the landing page never
  // touches Bento — no keys, no fetches, no real money on the marketing site.
  if (view === 'app') {
    return (
      <MarketsProvider>
        <AppPage onExit={() => go('landing')} />
      </MarketsProvider>
    );
  }

  return <LandingPage onEnterApp={() => go('app')} />;
}

export default App;

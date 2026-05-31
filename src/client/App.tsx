import { useEffect, useState } from 'react';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { cx } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './store/auth';
import { useLibrary } from './store/library';

function WorkbenchApp() {
  const init = useLibrary((s) => s.init);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="grid min-h-0 lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden min-h-0 border-r border-border lg:flex">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] animate-fade-in flex-col border-r border-border-strong bg-surface shadow-2xl">
              <Sidebar />
            </div>
          </div>
        )}

        <main
          className={cx(
            'grid min-h-0',
            'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
            'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-rows-1',
          )}
        >
          <RequestPanel />
          <ResponsePanel />
        </main>
      </div>
    </div>
  );
}

export function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const bootstrapping = useAuth((s) => s.bootstrapping);
  const mode = useAuth((s) => s.mode);
  const resetLibrary = useLibrary((s) => s.reset);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (mode === 'unknown') {
      resetLibrary();
    }
  }, [mode, resetLibrary]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-faint">
        <span className="text-sm">…</span>
      </div>
    );
  }

  if (mode === 'unknown') {
    return <AuthPage />;
  }

  return <WorkbenchApp />;
}

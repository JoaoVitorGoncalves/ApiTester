import { useEffect, useState } from 'react';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { WebhookReceiptPanel } from './components/WebhookReceiptPanel';
import { WebhooksWorkbench } from './components/WebhooksWorkbench';
import { Sidebar } from './components/Sidebar';
import { DialogHost } from './components/DialogHost';
import { Topbar } from './components/Topbar';
import { cx } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './store/auth';
import { useLibrary } from './store/library';
import { useWebhooks } from './store/webhooks';

function WorkbenchApp() {
  const init = useLibrary((s) => s.init);
  const initWebhooks = useWebhooks((s) => s.init);
  const webhooksPanelActive = useWebhooks((s) => s.panelActive);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void init().then(() => initWebhooks());
  }, [init, initWebhooks]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="grid min-h-[100dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <DialogHost />
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col border-r border-border lg:flex">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeSidebar} aria-hidden />
            <div className="relative flex h-full min-h-0 w-[min(100%,20rem)] max-w-[85vw] animate-fade-in flex-col border-r border-border-strong bg-surface shadow-2xl">
              <Sidebar onNavigate={closeSidebar} />
            </div>
          </div>
        )}

        <main
          className={cx(
            'grid min-h-0 min-w-0',
            'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
            'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1',
          )}
        >
          {webhooksPanelActive ? <WebhooksWorkbench /> : <RequestPanel />}
          {webhooksPanelActive ? <WebhookReceiptPanel /> : <ResponsePanel />}
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
  const resetWebhooks = useWebhooks((s) => s.reset);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (mode === 'unknown') {
      resetLibrary();
      resetWebhooks();
    }
  }, [mode, resetLibrary, resetWebhooks]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-text-faint">
        <span className="text-sm">…</span>
      </div>
    );
  }

  if (mode === 'unknown') {
    return <AuthPage />;
  }

  return <WorkbenchApp />;
}

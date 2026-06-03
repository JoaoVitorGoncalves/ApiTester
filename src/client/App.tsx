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
    <div className="grid h-[100dvh] min-h-0 animate-fade-in-soft grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <DialogHost />
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)]">
        <div className="hidden h-full min-h-0 flex-col border-r border-border lg:flex">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 animate-backdrop-in bg-black/50"
              onClick={closeSidebar}
              aria-hidden
            />
            <div className="relative flex h-full min-h-0 w-[min(100%,20rem)] max-w-[85vw] animate-slide-in-left flex-col border-r border-border-strong bg-surface shadow-2xl">
              <Sidebar onNavigate={closeSidebar} />
            </div>
          </div>
        )}

        <main
          className={cx(
            'grid h-full min-h-0 min-w-0',
            'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
            'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1',
          )}
        >
          {webhooksPanelActive ? (
            <>
              <div key="webhooks-main" className="flex h-full min-h-0 flex-col animate-fade-in">
                <WebhooksWorkbench />
              </div>
              <div
                key="webhooks-detail"
                className="flex h-full min-h-0 flex-col animate-fade-in [animation-delay:40ms]"
              >
                <WebhookReceiptPanel />
              </div>
            </>
          ) : (
            <>
              <div key="request-main" className="flex h-full min-h-0 flex-col animate-fade-in">
                <RequestPanel />
              </div>
              <div
                key="request-detail"
                className="flex h-full min-h-0 flex-col animate-fade-in [animation-delay:40ms]"
              >
                <ResponsePanel />
              </div>
            </>
          )}
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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-bg text-text-faint">
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft [animation-delay:240ms]" />
        </span>
        <span className="text-sm">…</span>
      </div>
    );
  }

  if (mode === 'unknown') {
    return <AuthPage />;
  }

  return <WorkbenchApp />;
}

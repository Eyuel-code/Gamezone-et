import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { isDynamicImportError } from '@/utils/lazyWithRetry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isChunkError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error?.message || 'Unexpected rendering error.';
    if (readable.startsWith('{')) {
      try {
        const parsed = JSON.parse(readable);
        if (typeof parsed?.error === 'string') {
          readable = parsed.error;
        }
      } catch {
        // Use raw message
      }
    }
    const isChunkError = isDynamicImportError(error);
    return {
      hasError: true,
      errorMessage: isChunkError
        ? 'A recent server restart or update refreshed the page modules. Reload once to fetch the latest view.'
        : readable,
      isChunkError,
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GameZoneET ErrorBoundary caught:', error, info.componentStack);
  }

  private handleResetHome = () => {
    window.location.hash = '/home';
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, errorMessage: '', isChunkError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center p-6 bg-[#040611] text-slate-100"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.2), transparent 45%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.25), transparent 50%)',
        }}
      >
        <div className="glass-strong max-w-md w-full rounded-3xl p-7 text-center space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-extrabold text-white">
            {this.state.isChunkError ? 'Page update ready' : 'Something interrupted this view'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {this.state.errorMessage || 'A module encountered a temporary hiccup. Your saved account and tournament state remain intact.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleResetHome}
              className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-ghost px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

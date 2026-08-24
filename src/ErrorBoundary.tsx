import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MerchantXLogo } from './components/MerchantXLogo';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Merchant X ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07080b] text-white flex flex-col items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-[#13151b] border border-purple-900/30 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center space-y-6">
            <MerchantXLogo size="lg" glow />

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-white">
                Merchant <span className="text-amber-400">X</span>
              </h1>
              <p className="text-sm text-zinc-300">
                Something went wrong while loading the application.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-left font-mono text-[11px] text-red-300 max-h-32 overflow-y-auto break-all">
                <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Error Details:</span>
                </div>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, ShieldCheck, Terminal } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dialética UI Error Boundary Capturou:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="error-boundary-screen"
          className="min-h-screen w-full bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30"
        >
          <div className="max-w-lg w-full bg-[#111728] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white font-display">
                  Recuperação Dialética Ativada
                </h1>
                <p className="text-xs text-slate-400">
                  O Error Boundary conteve uma exceção não tratada na renderização.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs text-rose-200">
              <p className="font-semibold mb-1">Causa Detectada:</p>
              <p className="font-mono text-[11px] break-words">
                {this.state.error?.message || "Exceção de renderização desconhecida."}
              </p>
            </div>

            {this.state.errorInfo && (
              <details className="text-[11px] text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
                <summary className="cursor-pointer font-mono text-cyan-400 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  Ver pilha de componentes (StackTrace)
                </summary>
                <pre className="mt-2 p-2 overflow-x-auto text-[10px] text-slate-300 font-mono">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                id="btn-error-boundary-retry"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Restaurar Estado Seguro</span>
              </button>

              <button
                id="btn-error-boundary-reload"
                onClick={this.handleHardReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recarregar App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

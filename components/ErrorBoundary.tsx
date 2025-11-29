import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { resetConfig } from '../firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-red-500 font-mono flex flex-col items-center justify-center p-6 text-center">
          <div className="border border-red-900 bg-red-950/10 p-8 max-w-lg w-full shadow-2xl shadow-red-900/20 relative overflow-hidden">
            {/* Background Noise */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'}}></div>
            
            <AlertTriangle size={48} className="mx-auto mb-6 animate-pulse" />
            
            <h1 className="text-2xl font-bold uppercase tracking-widest mb-2">System Critical Failure</h1>
            <p className="text-xs text-red-400/70 mb-6 border-b border-red-900/30 pb-4">
              RUNTIME_EXCEPTION_DETECTED
            </p>
            
            <div className="bg-black/50 p-4 border border-red-900/50 text-left mb-8 overflow-auto max-h-32">
              <code className="text-[10px] break-all block">
                {this.state.error?.message || "Unknown Error"}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={14} />
                Reboot System
              </button>
              
              <button 
                onClick={resetConfig}
                className="w-full bg-red-500 text-black hover:bg-red-400 py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 size={14} />
                Factory Reset Config
              </button>
            </div>
            
            <p className="mt-6 text-[10px] text-red-700">
              * Using "Factory Reset" will clear stored API keys and allow re-configuration.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
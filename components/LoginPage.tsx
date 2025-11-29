import React, { useState } from 'react';
import { Shield, ChevronRight, Lock, AlertTriangle, Terminal, Globe } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`DOMAIN UNAUTHORIZED: Access denied from this origin.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("AUTH CANCELLED: User terminated the handshake.");
      } else {
        setError("AUTHENTICATION FAILED: " + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md border border-zinc-800 bg-[#080808] relative z-10 shadow-2xl shadow-black">
        {/* Header */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-white" />
            <span className="font-mono text-xs tracking-widest text-white">SECURE_GATEWAY</span>
          </div>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
             <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
           <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white font-mono mb-2">ZENITH.SYS</h1>
           <p className="text-xs font-mono text-zinc-500 mb-8 tracking-widest uppercase">
             Task Protocol Management Interface
           </p>

           <div className="w-full h-px bg-zinc-800 mb-8 relative">
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#080808] px-2 text-[10px] text-zinc-600 font-mono">
                ACCESS CONTROL
              </div>
           </div>

           <div className="bg-red-500/5 border border-red-900/20 p-4 w-full mb-8 flex items-start gap-3 text-left">
              <Lock size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                 <h3 className="text-xs font-bold text-red-500 font-mono mb-1">AUTHORIZATION REQUIRED</h3>
                 <p className="text-[10px] text-red-400/70 font-mono leading-relaxed">
                    This system is restricted to authorized personnel. Biometric or cryptographic key verification is required to proceed.
                 </p>
              </div>
           </div>

           {error && (
             <div className="mb-6 w-full bg-zinc-900 border border-red-500/50 p-4 text-left">
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold font-mono mb-2">
                  <AlertTriangle size={14} />
                  ERROR DETECTED
                </div>
                <div className="text-red-400 text-xs font-mono break-words mb-2">
                  {error}
                </div>
                {error.includes('DOMAIN UNAUTHORIZED') && (
                   <div className="bg-black/50 p-2 border border-zinc-800 mt-2">
                      <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Required Action:</p>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Add <span className="text-white bg-zinc-800 px-1">{window.location.hostname}</span> to:
                        <br/>
                        Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains
                      </p>
                   </div>
                )}
             </div>
           )}

           <button 
             onClick={handleLogin}
             disabled={loading}
             className="w-full group relative bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden"
           >
              <div className="absolute inset-0 w-1 bg-zinc-400 group-hover:w-full transition-all duration-300 opacity-10"></div>
              <div className="relative p-4 flex items-center justify-center gap-3">
                 {loading ? (
                    <span className="text-sm font-bold font-mono uppercase animate-pulse">ESTABLISHING LINK...</span>
                 ) : (
                   <>
                     <Terminal size={18} />
                     <span className="text-sm font-bold font-mono uppercase tracking-wider">INITIATE GOOGLE AUTH</span>
                   </>
                 )}
              </div>
           </button>
           
           <div className="mt-6 flex flex-col gap-1 text-[10px] text-zinc-600 font-mono">
              <span>ENCRYPTION: AES-256</span>
              <span>SESSION ID: {crypto.randomUUID().split('-')[0]}</span>
              <span className="flex items-center justify-center gap-1">
                 HOST: {window.location.hostname}
                 <Globe size={10} />
              </span>
           </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-zinc-800 p-2 bg-zinc-950 flex justify-between items-center text-[10px] font-mono text-zinc-700">
           <span>v2.4.1</span>
           <span className="flex items-center gap-1">WAITING FOR INPUT <div className="w-1.5 h-3 bg-zinc-700 animate-blink"></div></span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

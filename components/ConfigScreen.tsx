import React, { useState } from 'react';
import { Settings, Save, AlertTriangle, Terminal, Database } from 'lucide-react';
import { saveConfig } from '../firebase';

const ConfigScreen: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      // Allow user to paste the whole JS object (handling keys without quotes loosely) or valid JSON
      // We'll try a loose parse first by sanitizing
      let parsed;
      try {
        parsed = JSON.parse(jsonInput);
      } catch (e) {
        // If strict JSON fails, try to evaluate strictly as data if it looks like a JS object
        // NOTE: In a real secure app, eval is dangerous. Here we assume technical user.
        // For safety in this demo, we'll ask for JSON strictly or attempt to fix quotes.
        const fixedJson = jsonInput.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace(/'/g, '"');
        parsed = JSON.parse(fixedJson);
      }

      if (!parsed.apiKey || !parsed.authDomain) {
        throw new Error("Missing required fields (apiKey, authDomain)");
      }

      saveConfig(parsed);
    } catch (e: any) {
      setError("INVALID FORMAT: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-2xl border border-red-900/30 bg-[#080808] relative z-10 shadow-2xl shadow-black flex flex-col">
        
        {/* Header */}
        <div className="bg-red-950/10 border-b border-red-900/30 p-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-red-500">
             <AlertTriangle size={18} />
             <span className="font-mono text-sm font-bold tracking-widest uppercase">SYSTEM CONFIGURATION REQUIRED</span>
           </div>
           <div className="font-mono text-[10px] text-red-500/50">ERROR_CODE: MISSING_CREDENTIALS</div>
        </div>

        <div className="p-8">
           <div className="flex gap-4 mb-6">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 h-fit">
                <Database size={24} className="text-zinc-500" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white font-mono mb-2">FIREBASE CONNECTION</h2>
                 <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                   The application requires valid Firebase credentials to establish a secure database link. 
                   Environment variables were not detected.
                 </p>
              </div>
           </div>

           <div className="mb-6">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block">
                 PASTE CONFIGURATION JSON
              </label>
              <div className="relative group">
                <div className="absolute top-3 left-3 text-zinc-600 pointer-events-none">
                   <Terminal size={14} />
                </div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`}
                  className="w-full h-64 bg-black border border-zinc-800 p-4 pl-10 font-mono text-xs text-zinc-300 focus:border-red-500/50 focus:outline-none resize-none leading-relaxed custom-scrollbar placeholder-zinc-800"
                  spellCheck={false}
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-2 font-mono flex gap-2">
                 <span>* Paste the 'firebaseConfig' object from your Project Settings.</span>
              </p>
           </div>

           {error && (
             <div className="mb-6 bg-red-950/20 border-l-2 border-red-500 p-3 text-red-400 text-xs font-mono">
               {error}
             </div>
           )}

           <button
             onClick={handleSave}
             className="w-full bg-white text-black hover:bg-zinc-200 py-4 font-mono text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
           >
             <Save size={16} />
             INITIALIZE SYSTEM
           </button>
        </div>

      </div>
    </div>
  );
};

export default ConfigScreen;
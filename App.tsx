import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, BrainCircuit, AlertTriangle, Terminal, Activity, BarChart3, Layers, Database, User as UserIcon } from 'lucide-react';
import { Task, TaskStatus, Priority, AIAnalysisResult } from './types';
import TaskCard from './components/TaskCard';
import TaskFormModal from './components/TaskFormModal';
import { parseTaskWithAI, analyzeScheduleWithAI } from './services/geminiService';
import { db } from './firebase';

type MobileTab = 'TASKS' | 'SYSTEM';

// Safe ID generator for environments where crypto.randomUUID might be unavailable
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // AI Input State
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | TaskStatus>('ALL');
  const [sortBy, setSortBy] = useState<'DATE' | 'PRIORITY'>('DATE');
  const [mobileTab, setMobileTab] = useState<MobileTab>('TASKS');

  // Firestore Real-time Listener (Global Tasks Collection)
  useEffect(() => {
    const unsubscribe = db.collection('tasks')
      .onSnapshot((snapshot) => {
        const loadedTasks = snapshot.docs.map(doc => doc.data() as Task);
        setTasks(loadedTasks);
      }, (error) => {
        console.error("Firestore sync error:", error);
      });

    return unsubscribe;
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, []);

  // Alert Polling Logic
  useEffect(() => {
    if (tasks.length === 0) return;

    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      
      tasks.forEach(task => {
        // Skip if done
        if (task.status === TaskStatus.DONE) return;

        const dueTime = new Date(task.dueDate).getTime();
        const timeRemaining = dueTime - now;
        
        // NEAR DUE ALERT (e.g., <= 30 mins)
        if (timeRemaining > 0 && timeRemaining <= 30 * 60 * 1000 && !task.alertedNear) {
           playNotificationSound();
           
           if ('Notification' in window && Notification.permission === 'granted') {
             try {
               new Notification(`UPCOMING: ${task.title}`, {
                 body: `Protocol due in ${Math.ceil(timeRemaining / 60000)} minutes.`,
                 icon: '/favicon.ico',
                 tag: `task-near-${task.id}`
               });
             } catch(e) { console.log(e); }
           }
           
           db.collection('tasks').doc(task.id).update({ alertedNear: true });
        }
        
        // OVERDUE ALERT
        if (dueTime <= now && !task.alerted) {
          playNotificationSound();

          const title = `SYSTEM ALERT: ${task.title}`;
          const options = {
            body: "DEADLINE REACHED. PROTOCOL OVERDUE.",
            icon: '/favicon.ico',
            tag: `task-overdue-${task.id}`,
          };

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(title, options);
            } catch (e) { console.log(e); }
          }
          
          // Update alerted state in Firestore
          db.collection('tasks').doc(task.id).update({
            alerted: true
          });
        }
      });

    }, 5000); 

    return () => clearInterval(intervalId);
  }, [tasks, playNotificationSound]);

  // CRUD Operations (Firestore)
  const addTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: generateId(),
      title: taskData.title || 'Untitled Protocol',
      description: taskData.description || '',
      dueDate: taskData.dueDate || new Date().toISOString(),
      priority: taskData.priority || Priority.MEDIUM,
      status: TaskStatus.TODO,
      createdAt: new Date().toISOString(),
      aiSuggested: !!taskData.aiSuggested,
      alerted: false,
      alertedNear: false,
      subtasks: taskData.subtasks || []
    };
    
    try {
      await db.collection('tasks').doc(newTask.id).set(newTask);
      setMobileTab('TASKS');
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  };

  const updateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;
    try {
      await db.collection('tasks').doc(editingTask.id).update(taskData);
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await db.collection('tasks').doc(id).delete();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const toggleStatus = async (id: string, status: TaskStatus) => {
    try {
      await db.collection('tasks').doc(id).update({ status });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    try {
      await db.collection('tasks').doc(taskId).update({ subtasks: updatedSubtasks });
    } catch (error) {
      console.error("Error toggling subtask:", error);
    }
  };

  const handleAiSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    
    const textToProcess = aiInput.trim();
    if (!textToProcess) return;

    if (isAiLoading) return;

    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const parsedTask = await parseTaskWithAI(textToProcess);
      await addTask(parsedTask);
      setAiInput('');
    } catch (error: any) {
      console.error(error);
      setAiError(error.message || "PARSING_ERROR");
    } finally {
      setIsAiLoading(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeScheduleWithAI(tasks);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const upcomingTasksCount = tasks.filter(t => {
    if (t.status === TaskStatus.DONE) return false;
    const diff = new Date(t.dueDate).getTime() - new Date().getTime();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }).length;

  const filteredTasks = tasks
    .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const priorityWeight = { [Priority.URGENT]: 3, [Priority.HIGH]: 2, [Priority.MEDIUM]: 1, [Priority.LOW]: 0 };
        const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (diff !== 0) return diff;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 selection:bg-white selection:text-black flex flex-col font-sans pb-16 md:pb-0">
      
      {/* Top Protocol Bar */}
      <header className="border-b border-zinc-800 bg-[#050505] sticky top-0 z-40 shadow-2xl shadow-black/50">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="flex items-center justify-between p-3 md:p-4 md:w-64 md:border-r border-zinc-800 shrink-0">
            <h1 className="text-lg md:text-xl font-bold tracking-tighter text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 md:w-3 md:h-3 bg-white block"></span>
              ZENITH.SYS
            </h1>
            
            <div className="md:hidden flex items-center gap-3">
               {upcomingTasksCount > 0 && (
                  <div className="flex items-center gap-1 text-orange-500 animate-pulse">
                     <AlertTriangle size={14} />
                     <span className="text-xs font-mono font-bold">{upcomingTasksCount}</span>
                  </div>
               )}
            </div>
          </div>
          
          <div className="hidden md:flex flex-1 items-center overflow-hidden border-t md:border-t-0 border-zinc-800 bg-zinc-900/20 justify-between">
            <div className="flex-1 px-4 py-2 font-mono text-xs text-zinc-500 truncate flex items-center gap-6">
               <span className="flex items-center gap-2 text-emerald-500/80">
                 <Database size={12} />
                 STORAGE: CLOUD_OPEN
               </span>
               <span className="flex items-center gap-2">
                 <UserIcon size={12} />
                 USR: ADMIN_ACCESS
               </span>
               {upcomingTasksCount > 0 && <span className="text-orange-500 animate-pulse">ALERT: {upcomingTasksCount} CRITICAL TASKS PENDING</span>}
            </div>
            <div className="border-l border-zinc-800 h-full flex items-center">
              <button 
                onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                className="h-full px-6 hover:bg-white hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2"
              >
                <Plus size={14} /> New Entry
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-60px)] md:h-auto overflow-hidden md:overflow-visible">
        
        {/* Main Content Area (Mobile Tab: TASKS) */}
        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${mobileTab === 'TASKS' ? 'translate-x-0' : '-translate-x-full md:translate-x-0 hidden md:flex'}`}>
          
          {/* AI Command Input */}
          <section className="border-b border-zinc-800 bg-[#050505] relative group shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
              <Terminal size={16} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={aiInput}
              onChange={(e) => { setAiInput(e.target.value); setAiError(null); }}
              placeholder="ENTER PROTOCOL..."
              className={`w-full bg-transparent text-white p-4 pl-10 md:p-6 md:pl-12 text-base md:text-2xl font-light focus:outline-none placeholder-zinc-700 font-mono transition-colors ${aiError ? 'text-red-500' : ''} ${isAiLoading ? 'opacity-50 cursor-wait' : ''}`}
              onKeyDown={handleAiSubmit}
              disabled={isAiLoading}
            />
            {isAiLoading && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                 <div className="w-2 h-2 bg-white animate-ping"></div>
              </div>
            )}
            {aiError && (
               <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 flex items-center gap-2">
                 <span className="text-[10px] font-mono text-red-500 bg-red-950/30 px-2 py-1 border border-red-900/50 uppercase tracking-widest hidden md:block">
                   {aiError}
                 </span>
                 <AlertTriangle size={16} className="text-red-500" />
               </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-[1px] transition-colors duration-500 ${aiError ? 'bg-red-500' : 'bg-zinc-800 group-focus-within:bg-white'}`}></div>
          </section>

          {/* Controls Bar */}
          <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar bg-[#050505] shrink-0">
            <div className="flex p-2 gap-2 shrink-0">
               {(['ALL', TaskStatus.TODO, TaskStatus.DONE] as const).map(status => (
                 <button
                   key={status}
                   onClick={() => setFilterStatus(status)}
                   className={`px-3 py-1.5 md:px-4 md:py-1.5 text-[10px] md:text-xs font-mono uppercase tracking-wider border transition-all
                     ${filterStatus === status 
                       ? 'bg-zinc-800 text-white border-zinc-600' 
                       : 'text-zinc-500 border-transparent hover:border-zinc-800 hover:text-zinc-300'
                     }`}
                 >
                   [{status === 'ALL' ? 'ALL' : status}]
                 </button>
               ))}
            </div>
            <div className="ml-auto flex items-center border-l border-zinc-800 px-4 gap-4 shrink-0">
               <button onClick={() => setSortBy('DATE')} className={`text-[10px] md:text-xs font-mono whitespace-nowrap hover:text-white ${sortBy === 'DATE' ? 'text-white underline decoration-zinc-500 underline-offset-4' : 'text-zinc-500'}`}>SORT: TIME</button>
               <button onClick={() => setSortBy('PRIORITY')} className={`text-[10px] md:text-xs font-mono whitespace-nowrap hover:text-white ${sortBy === 'PRIORITY' ? 'text-white underline decoration-zinc-500 underline-offset-4' : 'text-zinc-500'}`}>SORT: LVL</button>
            </div>
          </div>

          {/* Task Grid */}
          <div className="flex-1 bg-zinc-900/10 overflow-y-auto pb-20 md:pb-0">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-4">
                <Activity size={32} strokeWidth={1} />
                <p className="font-mono text-xs tracking-widest">NO ACTIVE PROTOCOLS</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 auto-rows-min">
                {filteredTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onStatusChange={toggleStatus}
                    onSubtaskToggle={toggleSubtask}
                    onDelete={deleteTask}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Sidebar Diagnostics (Mobile Tab: SYSTEM) */}
        <aside className={`w-full md:w-80 border-l border-zinc-800 bg-[#080808] flex flex-col md:h-auto overflow-y-auto transition-all duration-300 
          ${mobileTab === 'SYSTEM' ? 'translate-x-0 h-[calc(100vh-120px)]' : 'translate-x-full hidden md:flex md:translate-x-0'}
        `}>
           <div className="p-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <BrainCircuit size={14} />
                    DIAGNOSTICS
                 </h2>
                 <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || tasks.length === 0}
                  className="text-[10px] bg-white text-black px-3 py-1 font-mono hover:bg-zinc-200 disabled:opacity-50"
                 >
                   {isAnalyzing ? 'COMPUTING...' : 'RUN ANALYSIS'}
                 </button>
              </div>
              
              {analysis ? (
                 <div className="space-y-4">
                    <div className="border border-zinc-800 p-3 bg-zinc-900/30">
                       <span className="text-[10px] text-zinc-500 font-mono block mb-1">SYSTEM LOAD</span>
                       <span className={`text-lg font-bold uppercase ${analysis.mood === 'overloaded' ? 'text-red-500' : 'text-white'}`}>
                          {analysis.mood}
                       </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-mono border-l-2 border-zinc-700 pl-3">
                       {analysis.summary}
                    </p>
                    <div className="space-y-2">
                       {analysis.suggestions.map((s, i) => (
                          <div key={i} className="flex gap-2 text-xs text-zinc-500">
                             <span className="text-zinc-700">::</span>
                             {s}
                          </div>
                       ))}
                    </div>
                 </div>
              ) : (
                 <div className="h-32 border border-zinc-800 border-dashed flex items-center justify-center text-[10px] text-zinc-700 font-mono">
                    AWAITING INPUT DATA
                 </div>
              )}
           </div>

           <div className="p-4 flex-1">
              <h3 className="text-[10px] font-mono text-zinc-600 mb-4 tracking-widest">METRICS</h3>
              <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
                 <div className="bg-[#080808] p-4">
                    <div className="text-2xl font-light text-white">{tasks.filter(t => t.status === TaskStatus.DONE).length}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">ARCHIVED</div>
                 </div>
                 <div className="bg-[#080808] p-4">
                    <div className="text-2xl font-light text-white">{tasks.filter(t => t.status === TaskStatus.TODO).length}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">PENDING</div>
                 </div>
                 <div className="bg-[#080808] p-4">
                    <div className="text-2xl font-light text-red-500">
                      {tasks.filter(t => t.priority === Priority.URGENT && t.status !== TaskStatus.DONE).length}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">CRITICAL</div>
                 </div>
                 <div className="bg-[#080808] p-4">
                    <div className="text-2xl font-light text-zinc-400">
                      {tasks.filter(t => t.aiSuggested).length}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">AUTO-GEN</div>
                 </div>
              </div>
           </div>
           
           <div className="p-4 border-t border-zinc-800 shrink-0">
              <div className="text-[10px] text-zinc-700 font-mono">
                 ZENITH.SYS v2.4.1<br/>
                 MEMORY USAGE: OPTIMAL
              </div>
           </div>
        </aside>

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-zinc-800 flex justify-between px-2 z-50 pb-safe">
         <button 
            onClick={() => setMobileTab('TASKS')}
            className={`flex-1 p-3 flex flex-col items-center gap-1 transition-colors ${mobileTab === 'TASKS' ? 'text-white' : 'text-zinc-600'}`}
         >
            <Layers size={18} />
            <span className="text-[10px] font-mono tracking-widest">TASKS</span>
         </button>
         <div className="w-[1px] bg-zinc-800 my-2"></div>
         <div className="flex-1 flex items-center justify-center">
             <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-white text-black p-3 rounded-none">
                <Plus size={20} />
             </button>
         </div>
         <div className="w-[1px] bg-zinc-800 my-2"></div>
         <button 
            onClick={() => setMobileTab('SYSTEM')}
            className={`flex-1 p-3 flex flex-col items-center gap-1 transition-colors ${mobileTab === 'SYSTEM' ? 'text-white' : 'text-zinc-600'}`}
         >
            <BarChart3 size={18} />
            <span className="text-[10px] font-mono tracking-widest">SYSTEM</span>
         </button>
      </nav>

      <TaskFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={editingTask ? updateTask : addTask}
        editingTask={editingTask}
      />
    </div>
  );
};

export default App;
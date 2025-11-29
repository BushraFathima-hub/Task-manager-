import React, { useState, useEffect } from 'react';
import { Task, Priority, TaskStatus, Subtask } from '../types';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  editingTask?: Task | null;
}

// Safe ID generator for environments where crypto.randomUUID might be unavailable
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSubmit, editingTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    let dateObj = new Date();

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      dateObj = new Date(editingTask.dueDate);
      setPriority(editingTask.priority);
      setSubtasks(editingTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority(Priority.MEDIUM);
      setSubtasks([]);
      dateObj.setDate(dateObj.getDate() + 1);
      dateObj.setHours(9, 0, 0, 0);
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');

    setDateInput(`${year}-${month}-${day}`);
    setTimeInput(`${hours}:${mins}`);
    setNewSubtaskTitle('');
  }, [editingTask, isOpen]);

  const handleAddSubtask = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    e?.preventDefault(); 

    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, {
        id: generateId(),
        title: newSubtaskTitle.trim(),
        isCompleted: false
      }]);
      setNewSubtaskTitle('');
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedDate = new Date(`${dateInput}T${timeInput}`);
    
    onSubmit({
      title: title || 'Untitled Protocol',
      description,
      dueDate: combinedDate.toISOString(),
      priority,
      status: editingTask ? editingTask.status : TaskStatus.TODO,
      subtasks
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-12 bg-black/90 backdrop-blur-sm">
      <div className="bg-[#050505] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl border border-zinc-700 shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 md:px-8 md:py-6 border-b border-zinc-800 bg-zinc-900/10 shrink-0">
            <h2 className="text-base md:text-lg font-mono tracking-widest text-white uppercase flex items-center gap-2">
               <span className="w-2 h-2 bg-orange-500"></span>
               {editingTask ? 'MODIFY' : 'INITIATE'}
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={24} strokeWidth={1} />
            </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 md:px-8 md:py-8 flex-1 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            
            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] font-mono text-zinc-500 tracking-widest">PROTOCOL TITLE</label>
              <input 
                type="text" 
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-2xl md:text-4xl text-white placeholder-zinc-800 focus:outline-none font-light border-b border-zinc-800 focus:border-white transition-colors pb-2 rounded-none"
                placeholder="ENTER TITLE..."
              />
            </div>

            <div className="space-y-2 md:space-y-4">
               <label className="text-[10px] font-mono text-zinc-500 tracking-widest">DETAILS</label>
               <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900/30 text-zinc-300 p-4 min-h-[100px] border border-zinc-800 focus:border-zinc-500 focus:outline-none font-mono text-sm resize-none rounded-none"
                  placeholder="// Add technical details..."
               />
            </div>

            {/* Subtasks */}
            <div className="space-y-3">
               <label className="text-[10px] font-mono text-zinc-500 tracking-widest">EXECUTION STEPS</label>
               <div className="border border-zinc-800 bg-zinc-900/20 p-4">
                   {subtasks.map(st => (
                     <div key={st.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 group">
                       <span className="text-sm font-mono text-zinc-300">{st.title}</span>
                       <button type="button" onClick={() => removeSubtask(st.id)} className="text-zinc-600 hover:text-red-500 p-2">
                         <Trash2 size={14} />
                       </button>
                     </div>
                   ))}
                   <div className="flex gap-2 mt-2 pt-2">
                     <span className="text-zinc-600 font-mono mt-2">{'>'}</span>
                     <input
                       type="text"
                       value={newSubtaskTitle}
                       onChange={(e) => setNewSubtaskTitle(e.target.value)}
                       onKeyDown={handleAddSubtask}
                       placeholder="Add Step..."
                       className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none py-2 placeholder-zinc-700 rounded-none"
                     />
                     <button type="button" onClick={handleAddSubtask} className="text-zinc-500 hover:text-white p-2"><Plus size={16}/></button>
                   </div>
               </div>
            </div>

            {/* Meta Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 border-t border-zinc-800 pt-6 md:pt-8">
               
               {/* Time */}
               <div className="space-y-2 md:space-y-4">
                  <label className="text-[10px] font-mono text-zinc-500 tracking-widest">DEADLINE</label>
                  <div className="flex gap-4">
                     <input 
                        type="date" 
                        required
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="bg-[#0a0a0a] border border-zinc-800 p-3 text-white font-mono text-sm focus:border-white focus:outline-none w-full rounded-none"
                        style={{ colorScheme: 'dark' }}
                     />
                     <input 
                        type="time" 
                        required
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                        className="bg-[#0a0a0a] border border-zinc-800 p-3 text-white font-mono text-sm focus:border-white focus:outline-none w-32 rounded-none"
                        style={{ colorScheme: 'dark' }}
                     />
                  </div>
               </div>

               {/* Priority */}
               <div className="space-y-2 md:space-y-4">
                  <label className="text-[10px] font-mono text-zinc-500 tracking-widest">PRIORITY LEVEL</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.values(Priority).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-3 text-[10px] font-mono uppercase tracking-wider border transition-all rounded-none
                          ${priority === p 
                             ? 'bg-white text-black border-white' 
                             : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-500'
                          }`}
                      >
                        {p.substring(0, 3)}
                      </button>
                    ))}
                  </div>
               </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-zinc-800 bg-[#050505] flex justify-end shrink-0 mb-safe">
          <button 
            onClick={handleSubmit}
            className="w-full md:w-auto px-10 py-4 bg-white hover:bg-zinc-200 text-black font-bold font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-colors rounded-none"
          >
            {editingTask ? 'SAVE_CHANGES' : 'INITIALIZE'}
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default TaskFormModal;
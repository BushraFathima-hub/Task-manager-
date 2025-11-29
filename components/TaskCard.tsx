import React from 'react';
import { Task, Priority, TaskStatus } from '../types';
import { AlertCircle, Trash2, Edit2, Sparkles, CheckSquare, ArrowUpRight, Check } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDelete, onEdit, onSubtaskToggle }) => {
  const isDone = task.status === TaskStatus.DONE;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  
  const isOverdue = diffMs < 0;
  const isNearDue = diffHrs > 0 && diffHrs < 24;

  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const priorityColor = () => {
    switch (task.priority) {
      case Priority.URGENT: return 'bg-red-500 text-black';
      case Priority.HIGH: return 'bg-orange-500 text-black';
      case Priority.MEDIUM: return 'bg-white text-black';
      case Priority.LOW: return 'bg-zinc-800 text-zinc-400';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className={`
      group border-b border-r border-zinc-800 bg-[#050505] p-6 flex flex-col h-full relative transition-all
      hover:bg-zinc-900/30
      ${isDone ? 'opacity-50 grayscale' : ''}
    `}>
      {/* Header Meta */}
      <div className="flex justify-between items-start mb-4 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <div className="flex items-center gap-3">
            <span className={`px-1.5 py-0.5 font-bold ${priorityColor()}`}>
              {task.priority.substring(0, 3)}
            </span>
            <span>ID: {task.id.substring(0, 6)}</span>
            {task.aiSuggested && <span className="text-zinc-300 flex items-center gap-1"><Sparkles size={10} /> AI</span>}
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => onEdit(task)} className="hover:text-white"><Edit2 size={12} /></button>
           <button onClick={() => onDelete(task.id)} className="hover:text-red-500"><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mb-6">
        <h3 className={`text-xl font-light leading-tight mb-2 ${isDone ? 'line-through decoration-zinc-600' : 'text-zinc-100'}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className="text-sm text-zinc-500 font-mono leading-relaxed mb-4 border-l border-zinc-800 pl-3">
            {task.description}
          </p>
        )}
        
        {totalSubtasks > 0 && (
          <div className="space-y-1 mt-4">
             {task.subtasks!.map(st => (
                <div 
                   key={st.id} 
                   onClick={(e) => { e.stopPropagation(); onSubtaskToggle(task.id, st.id); }}
                   className="flex items-center gap-3 group/item cursor-pointer hover:bg-zinc-900 py-1"
                >
                   <div className={`w-3 h-3 border border-zinc-600 flex items-center justify-center ${st.isCompleted ? 'bg-zinc-600' : ''}`}>
                      {st.isCompleted && <Check size={8} className="text-black" />}
                   </div>
                   <span className={`text-xs font-mono ${st.isCompleted ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>{st.title}</span>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Footer / Status */}
      <div className="pt-4 border-t border-zinc-800 border-dashed flex items-end justify-between">
         <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-zinc-600">DEADLINE</span>
            <div className={`text-xs font-mono flex items-center gap-2 ${isOverdue && !isDone ? 'text-red-500' : 'text-zinc-300'}`}>
               {isOverdue && !isDone && <AlertCircle size={12} />}
               {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span className="text-zinc-600">/</span> {dueDate.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
            </div>
         </div>

         <button 
           onClick={() => onStatusChange(task.id, isDone ? TaskStatus.TODO : TaskStatus.DONE)}
           className={`border px-3 py-1 text-xs font-mono uppercase tracking-widest transition-all
             ${isDone 
               ? 'border-zinc-700 text-zinc-500 hover:border-zinc-500' 
               : 'border-white text-white hover:bg-white hover:text-black'
             }
           `}
         >
           {isDone ? 'RESTORE' : 'COMPLETE'}
         </button>
      </div>

      {/* Corner Accent */}
      {!isDone && <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-600 opacity-20 group-hover:opacity-100 transition-opacity"></div>}
      {!isDone && <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-600 opacity-20 group-hover:opacity-100 transition-opacity"></div>}
    </div>
  );
};

export default TaskCard;
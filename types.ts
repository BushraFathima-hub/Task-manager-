export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO Date string
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  aiSuggested?: boolean;
  alerted?: boolean; // For overdue alerts
  alertedNear?: boolean; // For approaching deadline alerts
  subtasks?: Subtask[];
}

export interface AIAnalysisResult {
  summary: string;
  suggestions: string[];
  mood: 'calm' | 'busy' | 'overloaded';
}
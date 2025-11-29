import { GoogleGenAI, Type } from "@google/genai";
import { Task, Priority, TaskStatus, AIAnalysisResult } from "../types";

// Robust ID generation to handle contexts where crypto.randomUUID might be unavailable
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initialize Gemini Client directly using process.env.API_KEY as per guidelines
// This ensures the bundler can correctly replace the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseTaskWithAI = async (input: string): Promise<Partial<Task>> => {
  const now = new Date();
  const nowString = now.toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZoneName: 'short' 
  });
  
  const systemInstruction = `
    You are the parser for Zenith.sys, a technical task management system.
    Your objective is to convert natural language input into a structured JSON task protocol.
    
    CURRENT SYSTEM TIME: ${nowString}

    ### 1. PRIORITY ASSIGNMENT ALGORITHM (Strict Order)
    - Override Keywords:
      - "${Priority.URGENT}": urgent, asap, emergency, critical, right now
      - "${Priority.HIGH}": high priority, important, major, must do
      - "${Priority.LOW}": low priority, whenever, eventually, minor
    - Time-Based (If no keywords):
      - < 4h: ${Priority.URGENT}
      - < 24h: ${Priority.HIGH}
      - < 72h: ${Priority.MEDIUM}
      - >= 72h: ${Priority.LOW}

    ### 2. SUBTASK GENERATION
    - Flatten nested lists.
    - Break conditional tasks ("If X then Y") into steps.
    - If vague goal ("Plan trip"), generate 3-5 logical steps.
    
    ### 3. DATE & TIME
    - Resolve relative time to absolute ISO 8601.
    - Default: 24h from now.

    ### 4. STYLE
    - Title: Imperative, concise.
    - Description: Technical summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            dueDate: { type: Type.STRING, description: "ISO 8601 format date string" },
            priority: { type: Type.STRING, enum: [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT] },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING }
                }
              }
            }
          },
          required: ["title", "dueDate", "priority"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      
      const subtasks = parsed.subtasks?.map((st: any) => ({
        id: generateId(),
        title: st.title,
        isCompleted: false
      })) || [];

      return {
        ...parsed,
        subtasks,
        status: TaskStatus.TODO,
        aiSuggested: true,
        alerted: false
      };
    }
    throw new Error("No response text from Gemini");
  } catch (error: any) {
    console.error("Error parsing task with AI:", error);
    throw error;
  }
};

export const analyzeScheduleWithAI = async (tasks: Task[]): Promise<AIAnalysisResult> => {
  const activeTasks = tasks.filter(t => t.status !== TaskStatus.DONE);
  
  if (activeTasks.length === 0) {
    return {
      summary: "System idle. No active protocols detected.",
      suggestions: ["Initiate new protocols", "Review archived data", "Optimize system resources"],
      mood: 'calm'
    };
  }

  const tasksJson = JSON.stringify(activeTasks.map(t => ({
    title: t.title,
    due: t.dueDate,
    priority: t.priority,
    subtasksCount: t.subtasks?.length || 0
  })));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here is the current task registry: ${tasksJson}`,
      config: {
        systemInstruction: "Analyze the user's workload as a technical system monitor. Provide a brief, clinical summary, 3 efficiency optimization protocols (suggestions), and determine the system load (mood: calm, busy, or overloaded).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestions: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            mood: { type: Type.STRING, enum: ['calm', 'busy', 'overloaded'] }
          },
          required: ["summary", "suggestions", "mood"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    throw new Error("No analysis returned");
  } catch (error) {
    console.error("Error analyzing schedule:", error);
    return {
      summary: "Analysis subsystem offline.",
      suggestions: [],
      mood: 'busy'
    };
  }
};
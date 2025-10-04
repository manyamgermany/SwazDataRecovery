
import { GoogleGenAI, Chat } from "@google/genai";
import { RecoveredFile, FileType } from '../types';

// The API key MUST be obtained from environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}


export const analyzeFileContent = async (file: RecoveredFile): Promise<string> => {
  if (!API_KEY) {
    return "Gemini analysis is disabled. API key is missing.";
  }

  try {
    let prompt: string;
    if (file.type === FileType.Image) {
      prompt = `You are a file analysis expert. Briefly describe the following image as if it were a recovered file. Be concise and professional. The image is a placeholder representing a file named "${file.name}". The placeholder image URL is ${file.previewUrl}.`;
    } else if (file.type === FileType.Document) {
      prompt = `You are a file analysis expert. Briefly summarize the following document content as if it were a recovered file. The file is named "${file.name}". Document content: "${file.content}"`;
    } else {
        return `File type "${file.type}" cannot be analyzed.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error analyzing file with Gemini:", error);
    if (error instanceof Error) {
        return `Failed to analyze file with Gemini. Error: ${error.message}`;
    }
    return "Failed to analyze file with Gemini due to an unknown error.";
  }
};

const KNOWLEDGE_BASE = `
- **Company Name**: Swaz Data Recovery Labs
- **Core Business**: We provide a web application that **simulates** the process of data recovery from various storage devices. Our goal is to educate users on the recovery process and help them understand what might be recoverable in a real data loss scenario.
- **Is this a real recovery service?**: No. Swaz Data Recovery Labs is a **simulation tool only**. It does not access, read, or modify any files on a user's actual storage devices. It is completely safe.
- **Services Shown**: The simulation demonstrates recovery from Hard Drives (HDDs), SSDs, USB Drives, RAID Arrays, and Mobile Devices.
- **Simulated Process**:
  1. **Evaluation & Diagnosis**: User selects a drive to start a mock scan.
  2. **Secure Data Recovery**: The app simulates a deep scan and generates a list of fake "recoverable" files.
  3. **File Verification**: Users can preview these mock files.
  4. **Data Return**: Users can select files to "recover", which completes the simulation.
- **Pricing**: The simulation application is **completely free**. For real data recovery services, we have a "Pricing & Quote" page where users can submit a form to get a personalized quote for a real-world scenario. There are no fixed prices; every case is unique.
- **Contact**: Users can contact us via the form on our "Contact" page for questions about the simulation or real data recovery inquiries.
`;

const systemInstruction = `You are "Swaz AI", a friendly and professional support assistant for Swaz Data Recovery Labs.

**Your Core Directives:**
1.  **Strictly Adhere to the Knowledge Base**: Your knowledge is exclusively limited to the information provided here. Do not invent services, pricing, or capabilities.
    <KNOWLEDGE_BASE>
    ${KNOWLEDGE_BASE}
    </KNOWLEDGE_BASE>
2.  **Maintain Your Persona**: You are helpful, reassuring, and professional. You are an AI assistant.
3.  **Enforce Business Guardrails**:
    - If a user asks about anything unrelated to Swaz Data Recovery Labs or data recovery (e.g., politics, math problems, personal opinions, general knowledge), you MUST politely decline and steer the conversation back. Example: "I can only assist with questions about Swaz Data Recovery Labs and our data recovery simulation services. How can I help you with that?"
    - Do NOT provide advice on how to perform real data recovery. Instead, explain what the simulation demonstrates and suggest they contact a professional (or fill out our quote form for a real service inquiry).
    - If a user expresses panic about data loss, be empathetic but remind them that this is a simulation tool to help them understand the process.
4.  **Be Concise**: Provide clear, direct answers. Use formatting like lists if it improves clarity.
`;

let chat: Chat | null = null;

const initializeChat = () => {
    if (!API_KEY) return null;
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
};


export const getAiChatResponse = async (message: string, history: ChatMessage[]): Promise<string> => {
    if (!API_KEY) {
        return Promise.resolve("The AI chat agent is currently unavailable because the API key is not configured.");
    }

    try {
        // Use a single chat session to maintain context
        if (!chat) {
             chat = initializeChat();
             if (!chat) throw new Error("Chat initialization failed.");
             // Note: The history from the client is used to rebuild context if the page was refreshed,
             // but for an ongoing session, the `chat` object maintains its own history.
             // For simplicity here, we'll rely on the object's internal state.
             // A more robust implementation might sync history.
        }
       
        const response = await chat.sendMessage({ message });
        return response.text;

    } catch (error) {
        console.error("Error getting AI response:", error);
        chat = null; // Reset chat on error
        if (error instanceof Error) {
            return `I'm sorry, but I encountered an error: ${error.message}`;
        }
        return "I'm sorry, but I'm unable to respond at the moment. Please try again later.";
    }
};
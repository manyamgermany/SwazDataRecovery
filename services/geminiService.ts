
import { GoogleGenAI, Chat } from "@google/genai";
// Fix: Import types required for the new analyzeFileContent function.
import { RecoveredFile, FileType } from "../types";

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

const KNOWLEDGE_BASE = `
- **Company Name**: Swaz Data Recovery Labs
- **Core Business**: We provide a web application that **simulates** data recovery and offers a **real, secure peer-to-peer (P2P) file transfer** service.
- **Data Recovery Simulation**:
  - **Is it real?**: No. The recovery part is a **simulation tool only**. It does not access, read, or modify any files on a user's actual storage devices. It is completely safe and demonstrates the recovery process.
  - **Process**: Select a drive, simulate a scan, see a list of fake "recoverable" files, and preview them.
- **P2P File Transfer Feature**:
  - **Is it real?**: Yes. This feature allows users to send files directly to another person's browser securely.
  - **How it works**: It uses WebRTC technology to create a direct connection between two browsers. Files are never uploaded to a central server.
  - **Security**: The connection is **end-to-end encrypted**. We use a sophisticated method (ECDH key exchange) to create a unique, secret encryption key for each session. Files are broken into chunks and each chunk is encrypted using AES-256-GCM before it is sent. This is a very high level of security.
  - **Troubleshooting Connection Issues**:
    - **Signaling Server**: The feature requires a local "signaling server" to be running for the initial connection. If users see a "Signaling server connection error," they should check the instructions in the project's README file to ensure the server is started.
    - **Firewalls**: Sometimes, strict corporate or personal firewalls can block WebRTC connections. Users may need to try a different network or adjust their firewall settings.
    - **Browser Compatibility**: The feature works best on modern browsers like Chrome, Firefox, and Edge.
  - **How to use**:
    - **Sender**: Clicks "Start Sending", selects files, and clicks "Create Secure Room". They will get a "Room ID" to share with the receiver.
    - **Receiver**: Clicks "Receive Files", enters the Room ID provided by the sender, and clicks "Join & Receive". The transfer will start automatically once the connection is established.
- **Pricing & Quotes**:
  - **Simulation & P2P Transfer**: Both the simulation and the file transfer service are **completely free**.
  - **Real Data Recovery Quotes**: For real data recovery needs, users can fill out the form on the "Pricing & Quote" page. They need to describe their issue (e.g., "hard drive is clicking") and device type. Our team will review it and provide a personalized, no-obligation quote via email. There are no fixed prices because every recovery case is different.
- **Contact**: Users can contact us via the form on our "Contact" page for questions about the simulation, the file transfer tool, or for real data recovery inquiries.
`;

const systemInstruction = `You are "Swaz AI", a friendly and professional support assistant for Swaz Data Recovery Labs.

**Your Core Directives:**
1.  **Strictly Adhere to the Knowledge Base**: Your knowledge is exclusively limited to the information provided here. Do not invent services, pricing, or capabilities.
    <KNOWLEDGE_BASE>
    ${KNOWLEDGE_BASE}
    </KNOWLEDGE_BASE>
2.  **Maintain Your Persona**: You are helpful, reassuring, and professional. You are an AI assistant.
3.  **Enforce Business Guardrails**:
    - If a user asks about anything unrelated to Swaz Data Recovery Labs or our services (e.g., politics, math problems, general knowledge), you MUST politely decline and steer the conversation back. Example: "I can only assist with questions about Swaz Data Recovery Labs, our data recovery simulation, and our secure file transfer service. How can I help you with that?"
    - Do NOT provide advice on how to perform real data recovery. Instead, explain what the simulation demonstrates and suggest they fill out our quote form for a real service inquiry.
    - For file transfer issues, use the troubleshooting steps from the knowledge base.
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

// Fix: Add missing analyzeFileContent function used in PreviewModal.
export const analyzeFileContent = async (file: RecoveredFile): Promise<string> => {
    if (!API_KEY) {
        return Promise.resolve("AI analysis is currently unavailable because the API key is not configured.");
    }

    try {
        let prompt = `Analyze the following metadata for a simulated recovered file. Based on the information, provide a brief, one-sentence summary of its likely content and condition. Be creative and reassuring.
- File Name: ${file.name}
- File Type: ${file.type}
- Size: ${file.size}
- Path: ${file.path}
- Simulated Recovery Chance: ${file.recoveryChance}`;

        if (file.type === FileType.Document && file.content) {
            prompt += `\n- Content Snippet: "${file.content}"`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing file with Gemini:", error);
        if (error instanceof Error) {
            return `I'm sorry, but I encountered an error during analysis: ${error.message}`;
        }
        return "An error occurred during AI analysis.";
    }
};

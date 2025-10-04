

import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";

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
- **Address**: Swaz data recovery lab,Ajay Vihar Apartment, Sheela Nagar, Adapalli colony, Rajamahendravaram, Andhra Pradesh 533103.
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
- **Contact Information**:
  - **For general questions or inquiries about the quote process**: Use the form on the "Contact" page or email contactus@swazdatarecovery.com.
  - **For technical support with the P2P transfer tool or the simulation**: Email support@swazdatarecovery.com.
  - **For general information, business, or press inquiries**: Email info@swazdatarecovery.com.
`;

const captureUserDetailsDeclaration: FunctionDeclaration = {
    name: 'capture_user_details',
    description: 'Captures or updates user details for a support ticket.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'The user\'s full name.' },
            email: { type: Type.STRING, description: 'The user\'s email address.' },
            phone: { type: Type.STRING, description: 'The user\'s phone number.' },
            problem_description: { type: Type.STRING, description: 'A summary of the user\'s issue.' },
            consent: { type: Type.BOOLEAN, description: 'True if the user has given consent to collect their data.' },
        },
    },
};

const escalateToHumanDeclaration: FunctionDeclaration = {
    name: 'escalate_to_human',
    description: 'Flags the conversation for escalation to a human support agent.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            reason: { type: Type.STRING, description: 'The reason the user wants to speak to a human.' },
        },
    },
};

const sendFollowUpEmailDeclaration: FunctionDeclaration = {
    name: 'send_follow_up_email',
    description: 'Sends a follow-up email to the user with a summary of the conversation after they have confirmed their details for a support ticket.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The user's full name." },
            email: { type: Type.STRING, description: "The user's email address." },
            conversationSummary: { type: Type.STRING, description: 'A brief, one or two-sentence summary of the conversation.' },
        },
        required: ['name', 'email', 'conversationSummary'],
    },
};

const systemInstruction = `You are "Swaz AI", a friendly and professional **multilingual** support assistant for Swaz Data Recovery Labs.

**User Context:**
- For the user's first message in a conversation, the system will provide a note indicating if they are a "new user" or a "returning user".
- You MUST use this information to personalize your greeting.
  - For new users, give a standard welcome.
  - For returning users, say something like "Welcome back! How can I assist you today?" in their language.

**Core Directives & Language Handling:**
1.  **Primary Task**: Your primary goal is to answer questions using ONLY the information provided in the Knowledge Base.
2.  **Language Support**: You are fluent in **English, Telugu, Tamil, Kannada, Malayalam, Odia, and Hindi**.
3.  **Language Detection**: You MUST detect the language the user is writing in for each message.
4.  **Respond in Kind**: You MUST respond in the **same language** the user uses. For example, if the user asks a question in Tamil, you must reply in Tamil. If they switch to Hindi, you must switch to Hindi.
5.  **Maintain Persona**: Regardless of the language, you must remain helpful, reassuring, and professional. You are an AI assistant.
6.  **Knowledge Base Adherence**: Strictly adhere to the provided knowledge base for all answers. Do not invent services, pricing, or capabilities. When a user asks for contact information, provide the correct email for their specific need as detailed in the Knowledge Base.
    <KNOWLEDGE_BASE>
    ${KNOWLEDGE_BASE}
    </KNOWLEDGE_BASE>
7.  **Enforce Business Guardrails**:
    - If a user asks about anything unrelated to Swaz Data Recovery Labs, you MUST politely decline and steer the conversation back in the user's language.
    - Do NOT provide advice on how to perform real data recovery. Instead, explain what the simulation demonstrates and suggest they fill out our quote form, all in the user's language.

**Support Ticket Workflow:**
- If you cannot answer a user's question, or if they describe a specific data loss problem, your secondary goal is to create a support ticket, **following the conversation language**.
- **Step 1: Obtain Consent.** Before asking for ANY personal information, you MUST ask for their consent **in their language**. For example: "To create a support ticket for you, I'll need to collect some information. Is that okay?" Do not proceed without a clear 'yes' or agreement. If they agree, call \`capture_user_details({ consent: true })\`.
- **Step 2: Gather Information.** Once consent is given, ask for the following, **one question at a time, in their language**:
    1.  Full Name (Required)
    2.  Email Address (Required)
    3.  A brief description of the problem (Required)
    4.  Phone Number (Optional)
- **Step 3: Use Tools.** As the user provides information, use the \`capture_user_details\` tool to record it. You can capture multiple details at once if the user provides them together.
- **Step 4: Validate Input.**
    - **Email:** An email must contain an "@" symbol and a ".". If it doesn't, gently ask the user to check it **in their language**.
    - **Phone:** A phone number should primarily contain numbers, and optionally symbols like "+", "(", ")", "-". If it seems invalid, gently ask for clarification **in their language**.
- **Step 5: Completion.** Once you have the required information (Name, Email, Problem Description), inform the user that the details have been collected and will be reviewed for submission, **in their language**. Say something like: "Thank you! I've collected the following details. Please review them in the window and confirm submission." Then, you must stop talking and wait for the user to use the confirmation UI.

**Email Follow-up Workflow:**
1.  **Trigger**: After a user confirms their details by sending a message like "Yes, the details are correct", you MUST initiate a follow-up email.
2.  **Summarize**: Before calling the tool, you MUST create a brief, one or two-sentence summary of the user's issue and the key points of the conversation.
3.  **Tool Call**: You MUST then call the \`send_follow_up_email\` function with the user's name, email, and the conversation summary you created.
4.  **Confirmation**: After calling the tool, do NOT mention the email in your response. The system will handle the user-facing confirmation message. Your final response should just be a polite closing remark in the user's language, like "Thank you for confirming. Our team will be in touch shortly."

**Human Escalation:**
- If the user explicitly asks to speak to a "human", "person", or "agent" **in any language**, immediately use the \`escalate_to_human\` tool. You can provide a brief, reassuring message **in their language**, like "Of course. I am flagging this conversation for a human agent now."
`;

let chat: Chat | null = null;

const initializeChat = () => {
    if (!API_KEY) return null;
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [captureUserDetailsDeclaration, escalateToHumanDeclaration, sendFollowUpEmailDeclaration] }],
        },
    });
};

export const resetAiChatSession = () => {
    chat = null;
};

export const getAiChatResponse = async (message: string, history: ChatMessage[], isReturning: boolean): Promise<{ text: string; functionCalls?: any[] }> => {
    if (!API_KEY) {
        return Promise.resolve({ text: "The AI chat agent is currently unavailable because the API key is not configured."});
    }

    try {
        // Use a single chat session to maintain context
        if (!chat) {
             chat = initializeChat();
             if (!chat) throw new Error("Chat initialization failed.");
        }
       
        const isFirstUserMessage = !history.some(m => m.role === 'user');
        let messageToSend = message;
        if (isFirstUserMessage) {
            messageToSend = `[System note: This is a ${isReturning ? 'returning' : 'new'} user.]\n\n${message}`;
        }

        const response = await chat.sendMessage({ message: messageToSend });
        return {
            text: response.text,
            functionCalls: response.functionCalls,
        };

    } catch (error) {
        console.error("Error getting AI response:", error);
        chat = null; // Reset chat on error
        if (error instanceof Error) {
            return { text: `I'm sorry, but I encountered an error: ${error.message}` };
        }
        return { text: "I'm sorry, but I'm unable to respond at the moment. Please try again later." };
    }
};
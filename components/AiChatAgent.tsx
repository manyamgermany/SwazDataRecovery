

import React, { useState, useEffect, useRef } from 'react';
import { getAiChatResponse, ChatMessage } from '../services/geminiService';
import { ChatBubbleIcon, CloseIcon, SendIcon, SwazLogoIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons/Icons';

interface UserDetails {
    name: string;
    email: string;
    phone: string;
    problem: string;
    consent: boolean;
}

const initialUserDetails: UserDetails = {
    name: '',
    email: '',
    phone: '',
    problem: '',
    consent: false,
};

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai' | 'system';
    feedback?: 'good' | 'bad' | null;
}

const ConfirmationForm: React.FC<{ details: UserDetails; onSubmit: () => void; onEdit: () => void }> = ({ details, onSubmit, onEdit }) => {
    const detailItems = [
        { label: 'Full Name', value: details.name },
        { label: 'Email Address', value: details.email },
        { label: 'Phone Number', value: details.phone || 'Not provided' },
        { label: 'Problem Summary', value: details.problem }
    ];

    return (
        <div className="p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-bl-lg animate-slide-in">
            <h4 className="font-bold mb-2 text-sm">Please confirm your details:</h4>
            <ul className="space-y-1 text-sm mb-4 border-l-2 border-accent pl-3">
                {detailItems.map(item => (
                    <li key={item.label}>
                        <span className="font-semibold">{item.label}:</span>
                        <p className="whitespace-pre-wrap leading-tight">{item.value}</p>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2">
                <button onClick={onSubmit} className="flex-1 px-3 py-2 text-sm bg-primary-light text-white font-bold rounded-lg hover:bg-secondary-light transition-colors">
                    Submit Inquiry
                </button>
                <button onClick={onEdit} className="flex-1 px-3 py-2 text-sm bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                    Edit Details
                </button>
            </div>
        </div>
    );
};


const AiChatAgent: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Hello! I'm Swaz AI. How can I assist you with the Swaz Data Recovery Labs simulation today?", sender: 'ai' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackConfirmationId, setFeedbackConfirmationId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [userDetails, setUserDetails] = useState<UserDetails>(initialUserDetails);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, showConfirmation]);

    useEffect(() => {
        try {
            const savedDetails = localStorage.getItem('swaz-chat-userDetails');
            if (savedDetails) {
                const parsed = JSON.parse(savedDetails);
                if (typeof parsed.name === 'string') {
                     setUserDetails(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load user details from localStorage", e);
        }
    }, []);

    useEffect(() => {
        if(userDetails !== initialUserDetails) {
            localStorage.setItem('swaz-chat-userDetails', JSON.stringify(userDetails));
        }
    }, [userDetails]);

    useEffect(() => {
        const { name, email, problem, consent } = userDetails;
        if (name && email && problem && consent && !isLoading && !showConfirmation) {
            const lastMessage = messages[messages.length - 1];
            // Show confirmation only after the AI has asked for it.
            if(lastMessage?.sender === 'ai' && lastMessage?.text.includes('review')) {
                setShowConfirmation(true);
            }
        }
    }, [userDetails, isLoading, showConfirmation, messages]);

    const handleSendMessage = async (e: React.FormEvent, overrideMessage?: string) => {
        e.preventDefault();
        const textToSend = overrideMessage || inputValue.trim();
        if (!textToSend || isLoading) return;

        const userMessage: Message = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setShowConfirmation(false);
        setIsLoading(true);

        const history: ChatMessage[] = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        try {
            const { text, functionCalls } = await getAiChatResponse(textToSend, history);

            if (functionCalls && functionCalls.length > 0) {
                let detailsChanged = false;
                let newDetails = { ...userDetails };
    
                for (const funcCall of functionCalls) {
                    if (funcCall.name === 'capture_user_details') {
                        const { name, email, phone, problem_description, consent } = funcCall.args;
                        if (name) newDetails.name = name;
                        if (email) newDetails.email = email;
                        if (phone) newDetails.phone = phone;
                        if (problem_description) newDetails.problem = problem_description;
                        if (consent !== undefined) newDetails.consent = consent;
                        detailsChanged = true;
                    }
                    if (funcCall.name === 'escalate_to_human') {
                        const escalationMessage: Message = { id: Date.now() + 2, text: "A human agent will be with you shortly. Please stand by.", sender: 'system' };
                        setMessages(prev => [...prev, escalationMessage]);
                        console.log("ESCALATION REQUESTED:", funcCall.args.reason);
                    }
                }
    
                if (detailsChanged) {
                    setUserDetails(newDetails);
                }
            }
            
            if (text) {
                 const aiMessage: Message = { id: Date.now() + 1, text, sender: 'ai' };
                 setMessages(prev => [...prev, aiMessage]);
            }

        } catch (error) {
            console.error("Failed to get AI response:", error);
            const errorMessage: Message = { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting. Please try again later.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitInquiry = () => {
        console.log("--- SUBMITTING SUPPORT INQUIRY ---");
        console.log(JSON.stringify({
            details: userDetails,
            conversation: messages.map(m => `[${m.sender}] ${m.text}`).join('\n'),
            timestamp: new Date().toISOString()
        }, null, 2));
    
        const successMessage: Message = { id: Date.now(), text: "Thank you! Your inquiry has been submitted. Our support team will contact you at your provided email address shortly.", sender: 'system' };
        setMessages(prev => [...prev, successMessage]);
    
        setShowConfirmation(false);
        setUserDetails(initialUserDetails);
        localStorage.removeItem('swaz-chat-userDetails');
    };

    const handleEditInquiry = () => {
        setShowConfirmation(false);
        const editRequestText = "I need to change some of my details.";
        
        // Pass a synthetic event object to satisfy the function signature.
        // The override message is what's actually used.
        handleSendMessage({ preventDefault: () => {} } as React.FormEvent, editRequestText);
    }
    
    const handleFeedback = (id: number, feedback: 'good' | 'bad') => {
        const messageToUpdate = messages.find(m => m.id === id);
        if (!messageToUpdate || messageToUpdate.feedback) return;

        setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, feedback } : msg));

        setFeedbackConfirmationId(id);
        setTimeout(() => setFeedbackConfirmationId(null), 3000);

        const messageIndex = messages.findIndex(m => m.id === id);
        const context = messages.slice(Math.max(0, messageIndex - 4), messageIndex + 1);

        console.log("AI_FEEDBACK_LOG:", JSON.stringify({
            feedback,
            messageId: id,
            messageText: messageToUpdate.text,
            conversationContext: context.map(m => ({ sender: m.sender, text: m.text })),
            timestamp: new Date().toISOString()
        }, null, 2));
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-16 h-16 bg-primary-light text-white rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:bg-secondary-light focus:outline-none focus:ring-4 focus:ring-accent ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                aria-label="Open AI Chat Agent"
            >
                <ChatBubbleIcon className="w-8 h-8" />
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-sm h-[75vh] max-h-[600px] bg-background-light dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <SwazLogoIcon className="w-6 h-6 text-primary-light" />
                        <h2 className="font-bold text-lg text-text-light dark:text-text-dark">Swaz AI Assistant</h2>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close chat">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Message List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                            {msg.sender === 'system' ? (
                                <div className="max-w-[90%] p-3 my-2 text-center text-sm text-accent bg-accent/10 rounded-lg">
                                    <p>{msg.text}</p>
                                </div>
                            ) : (
                                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-lg' : 'bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-bl-lg'}`}>
                                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                            )}

                            {msg.sender === 'ai' && (
                                <div className="mt-1.5 flex items-center space-x-3">
                                    <div className="flex items-center space-x-1.5">
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'good')}
                                            disabled={!!msg.feedback}
                                            className={`p-1 rounded-full transition-colors ${
                                                msg.feedback === 'good' ? 'text-green-500 bg-green-100 dark:bg-green-900/50' : 
                                                msg.feedback ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' :
                                                'text-gray-400 hover:text-green-500'
                                            }`}
                                            aria-label="Good response"
                                        >
                                            <ThumbsUpIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(msg.id, 'bad')}
                                            disabled={!!msg.feedback}
                                            className={`p-1 rounded-full transition-colors ${
                                                msg.feedback === 'bad' ? 'text-red-500 bg-red-100 dark:bg-red-900/50' :
                                                msg.feedback ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' :
                                                'text-gray-400 hover:text-red-500'
                                            }`}
                                            aria-label="Bad response"
                                        >
                                            <ThumbsDownIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {feedbackConfirmationId === msg.id && (
                                        <p className="text-xs text-accent animate-slide-in">
                                            Feedback recorded. Thank you!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {showConfirmation && (
                         <div className="flex flex-col items-start">
                             <ConfirmationForm details={userDetails} onSubmit={handleSubmitInquiry} onEdit={handleEditInquiry} />
                         </div>
                    )}
                    {isLoading && (
                         <div className="flex items-start">
                             <div className="max-w-[80%] p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-lg">
                                 <div className="flex items-center space-x-2">
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                 </div>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full pl-4 pr-12 py-2 bg-gray-100 dark:bg-gray-700 rounded-full border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                            disabled={isLoading || showConfirmation}
                        />
                        <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-full hover:bg-opacity-80 disabled:opacity-50" disabled={!inputValue.trim() || isLoading || showConfirmation} aria-label="Send message">
                           <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default AiChatAgent;
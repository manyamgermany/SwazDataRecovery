
import React, { useState, useEffect, useRef } from 'react';
import { getAiChatResponse, ChatMessage } from '../services/geminiService';
import { ChatBubbleIcon, CloseIcon, SendIcon, SwazLogoIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons/Icons';

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    feedback?: 'good' | 'bad' | null;
}

const AiChatAgent: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Hello! I'm Swaz AI. How can I assist you with the Swaz Data Recovery Labs simulation today?", sender: 'ai', feedback: null }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackConfirmationId, setFeedbackConfirmationId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: Message = { id: Date.now(), text: trimmedInput, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        // Format history for the API
        const history: ChatMessage[] = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        try {
            const aiResponseText = await getAiChatResponse(trimmedInput, history);
            const aiMessage: Message = { id: Date.now() + 1, text: aiResponseText, sender: 'ai', feedback: null };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to get AI response:", error);
            const errorMessage: Message = { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting. Please try again later.", sender: 'ai', feedback: null };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFeedback = (id: number, feedback: 'good' | 'bad') => {
        const messageToUpdate = messages.find(m => m.id === id);
        if (!messageToUpdate || messageToUpdate.feedback) return; // Already given feedback

        setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, feedback } : msg));

        // Show temporary confirmation message
        setFeedbackConfirmationId(id);
        setTimeout(() => {
            setFeedbackConfirmationId(null);
        }, 3000); // Hide after 3 seconds

        // Simulate sending detailed feedback to a backend service for analysis
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
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-lg' : 'bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-bl-lg'}`}>
                                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            </div>
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
                            disabled={isLoading}
                        />
                        <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-full hover:bg-opacity-80 disabled:opacity-50" disabled={!inputValue.trim() || isLoading} aria-label="Send message">
                           <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default AiChatAgent;

import React, { useEffect } from 'react';
import { CloseIcon, XCircleIcon, InformationCircleIcon } from './icons/Icons';

interface ErrorNotificationModalProps {
  title: string;
  message: string;
  suggestions: string[];
  onClose: () => void;
}

const ErrorNotificationModal: React.FC<ErrorNotificationModalProps> = ({ title, message, suggestions, onClose }) => {
  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60] p-4"
      onClick={onClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-message"
    >
      <div
        className="bg-background-light dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-8 h-8 text-primary-light" />
            <h2 id="error-title" className="text-xl font-bold text-primary-light">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close error notification">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6">
          <p id="error-message" className="text-text-light dark:text-text-dark mb-4">{message}</p>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-accent" />
                What you can do:
            </h3>
            <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                ))}
            </ul>
          </div>

          <div className="mt-6 text-center">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-accent text-white font-semibold rounded-lg shadow-md hover:bg-opacity-80 transition-colors"
            >
                Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotificationModal;
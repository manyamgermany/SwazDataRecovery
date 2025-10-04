import React from 'react';
import { CloseIcon, CopyIcon, CheckIcon } from './icons/Icons';

interface P2PTransferModalProps {
    shareableLink: string;
    onClose: () => void;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({ shareableLink, onClose }) => {
    const [isCopied, setIsCopied] = React.useState(false);
    
    // Using an external API for QR code generation
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareableLink)}`;

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
        >
            <div 
                className="bg-background-light dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-slide-in"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 id="share-modal-title" className="text-xl font-bold">Share Room Link</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close share modal">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="p-6 flex flex-col items-center gap-4">
                    <p className="text-center text-gray-600 dark:text-gray-400">Scan this QR code or copy the link to invite someone to the room.</p>
                    <div className="p-4 bg-white rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code for joining the room" width="200" height="200" />
                    </div>
                     <div className="w-full flex gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={shareableLink}
                            className="w-full flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent text-sm" 
                        />
                        <button onClick={handleCopyToClipboard} className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors">
                           {isCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { SwazLogoIcon } from './icons/Icons';
import { AppView } from '../App';

interface DriveSelectorProps {
  onScrollToSection: (section: AppView) => void;
}

const DriveSelector: React.FC<DriveSelectorProps> = ({ onScrollToSection }) => {
  return (
    <section className="animate-slide-in">
        {/* Hero Section */}
        <div className="text-center py-16 md:py-24">
            <div className="inline-block bg-primary-light/10 text-primary-light p-3 rounded-full mb-4 animate-glowing">
                <SwazLogoIcon className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-text-light dark:text-text-dark leading-tight">
                Fast, Secure, and Reliable Data Recovery You Can Trust
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-gray-600 dark:text-gray-400">
                Explore our expert solutions, including secure peer-to-peer file transfers and insightful recovery simulations.
            </p>
            <button
                onClick={() => onScrollToSection('services')}
                className="px-8 py-4 bg-primary-light text-white font-bold rounded-lg shadow-lg hover:bg-secondary-light transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
            >
                Explore Our Services
            </button>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 italic">
                "Swaz Data Recovery Labs saved my project files. A true lifesaver!" - A Happy User
            </p>
        </div>
    </section>
  );
};

export default DriveSelector;
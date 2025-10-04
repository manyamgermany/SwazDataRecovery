
import React from 'react';
import { Drive, DriveType } from '../types';
import { mockDrives } from '../services/mockData';
import { HddIcon, SsdIcon, UsbIcon, SwazLogoIcon } from './icons/Icons';

interface DriveSelectorProps {
  onDriveSelect: (drive: Drive) => void;
  error?: string | null;
}

const getDriveIcon = (type: DriveType) => {
    switch(type) {
        case DriveType.HDD: return <HddIcon className="w-16 h-16" />;
        case DriveType.SSD: return <SsdIcon className="w-16 h-16" />;
        case DriveType.USB: return <UsbIcon className="w-16 h-16" />;
    }
}

const DriveSelector: React.FC<DriveSelectorProps> = ({ onDriveSelect, error }) => {
    const handleStartRecoveryClick = () => {
        document.getElementById('drive-selection-grid')?.scrollIntoView({ behavior: 'smooth' });
    };

  return (
    <section className="animate-slide-in">
        {/* Hero Section */}
        <div className="text-center py-16 md:py-24">
            <div className="inline-block bg-primary-light/10 text-primary-light p-3 rounded-full mb-4">
                <SwazLogoIcon className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-text-light dark:text-text-dark leading-tight">
                Fast, Secure, and Reliable Data Recovery You Can Trust
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-gray-600 dark:text-gray-400">
                Recover lost files from any device with our expert solutions and cutting-edge simulation technology.
            </p>
            <button
                onClick={handleStartRecoveryClick}
                className="px-8 py-4 bg-primary-light text-white font-bold rounded-lg shadow-lg hover:bg-secondary-light transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent"
            >
                Start Your Recovery Now
            </button>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 italic">
                "Swaz Data Recovery Labs saved my project files. A true lifesaver!" - A Happy User
            </p>
        </div>

        {/* Drive Selection Section */}
        <div id="drive-selection-grid" className="pt-12 text-center">
            <h2 className="text-3xl font-bold mb-2 text-text-light dark:text-text-dark">Select a Drive to Scan</h2>
            <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">Choose a storage device to begin the recovery simulation.</p>
            
            {error && (
                <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-left max-w-3xl mx-auto" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {mockDrives.map((drive) => (
                <button
                    key={drive.id}
                    onClick={() => onDriveSelect(drive)}
                    className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl hover:-translate-y-1 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-accent group text-center"
                >
                    <div className="text-primary-light mx-auto mb-4 group-hover:scale-110 transition-transform">
                        {getDriveIcon(drive.type)}
                    </div>
                    <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">{drive.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{drive.type} - {drive.size}</p>
                </button>
                ))}
            </div>
        </div>
    </section>
  );
};

export default DriveSelector;
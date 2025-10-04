import React, { useState } from 'react';
import { DriveType } from '../types';
import { StarIcon, QuoteIcon } from './icons/Icons';

const PricingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    deviceType: DriveType.HDD,
    dataSize: '',
    description: '',
  });
  const [formStatus, setFormStatus] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('Sending your request...');
    console.log('Quote request submitted:', formData);
    setTimeout(() => {
        setFormStatus(`Thank you, ${formData.name}! We have received your quote request and will respond within 24 hours.`);
        setFormData({ name: '', email: '', phone: '', deviceType: DriveType.HDD, dataSize: '', description: '' });
    }, 1500);
  };

  return (
    <div className="animate-slide-in space-y-16">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Pricing & Free Quote</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Every data recovery case is unique. For fair and transparent pricing, please provide details about your situation to receive a personalized, no-obligation quote.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Quote Form */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6">Request a Personalized Quote</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
                            <input type="text" name="name" id="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                            <input type="email" name="email" id="email" required value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (Optional)</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                        <div>
                            <label htmlFor="deviceType" className="block text-sm font-medium mb-1">Device Type</label>
                            <select name="deviceType" id="deviceType" value={formData.deviceType} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent">
                                {Object.values(DriveType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="dataSize" className="block text-sm font-medium mb-1">Estimated Data Size (e.g., 500 GB)</label>
                        <input type="text" name="dataSize" id="dataSize" value={formData.dataSize} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1">Describe the Issue</label>
                        <textarea name="description" id="description" rows={5} required value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g., My hard drive is making clicking noises and won't show up on my computer..."></textarea>
                    </div>
                    <div>
                        <button type="submit" className="w-full px-6 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-colors focus:outline-none focus:ring-4 focus:ring-accent">
                            Request Your Free Quote
                        </button>
                    </div>
                    {formStatus && <p className="text-center text-accent mt-4">{formStatus}</p>}
                </form>
            </div>

            {/* Trust Elements */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4">Why Request a Quote?</h3>
                    <ul className="space-y-3 list-disc list-inside text-gray-600 dark:text-gray-400">
                        <li><strong>No Surprises:</strong> Get a clear, upfront cost estimate before committing.</li>
                        <li><strong>Accurate Pricing:</strong> Costs vary by device type and severity of damage. A quote ensures accuracy.</li>
                        <li><strong>Expert Advice:</strong> Our team will review your case and provide initial feedback.</li>
                        <li><strong>Completely Free:</strong> The evaluation and quote are 100% free and no-obligation.</li>
                    </ul>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                        ))}
                    </div>
                    <QuoteIcon className="w-6 h-6 text-primary-light/30 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 italic mb-4">"The quote process was fast and transparent. I knew exactly what to expect. The team was professional and recovered all my critical business files."</p>
                    <div>
                        <p className="font-bold text-text-light dark:text-text-dark">Jennifer M.</p>
                        <p className="text-sm text-gray-500">Business Owner</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PricingPage;
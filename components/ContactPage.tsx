

import React, { useState } from 'react';
import { DriveType } from '../types';
import { PhoneIcon, EmailIcon, MapPinIcon, ClockIcon, ChevronDownIcon } from './icons/Icons';

const faqItems = [
  {
    question: 'How does the data recovery simulation work?',
    answer: 'Our application simulates the process of scanning a storage device for lost files. It generates a list of mock "recovered" files to demonstrate what a real recovery process might look like. No actual data is recovered from your drives.',
  },
  {
    question: 'Is this application safe to use?',
    answer: 'Yes, it is completely safe. The application does not access, read, or modify any files on your actual storage devices. It is a simulation tool designed for demonstration purposes only.',
  },
  {
    question: 'What kind of files can be "recovered"?',
    answer: 'The simulation can generate various file types, including images, documents, videos, and audio files, to show the potential scope of a real data recovery service.',
  },
  {
    question: 'Do I need to pay for this service?',
    answer: 'No, this is a free simulation tool. There are no charges or fees associated with using the Swaz Data Recovery Labs application.',
  },
];

const FaqItem: React.FC<{ item: typeof faqItems[0]; isOpen: boolean; onClick: () => void }> = ({ item, isOpen, onClick }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button
                className="w-full flex justify-between items-center py-4 text-left"
                onClick={onClick}
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-lg">{item.question}</span>
                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <p className="pb-4 text-gray-600 dark:text-gray-400">
                    {item.answer}
                </p>
            </div>
        </div>
    );
};


const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    deviceType: DriveType.HDD,
    description: '',
  });
  const [formStatus, setFormStatus] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('Submitting...');
    // Simulate form submission
    console.log('Form data submitted:', formData);
    setTimeout(() => {
        setFormStatus(`Thank you, ${formData.name}! Your request has been received.`);
        setFormData({ name: '', email: '', phone: '', deviceType: DriveType.HDD, description: '' });
    }, 1500);
  };

  return (
    <div className="animate-slide-in space-y-16">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Contact & Support</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Have questions or need assistance? We're here to help.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
                        <input type="text" name="name" id="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                        <input type="email" name="email" id="email" required value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                        <label htmlFor="deviceType" className="block text-sm font-medium mb-1">Device Type</label>
                        <select name="deviceType" id="deviceType" value={formData.deviceType} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent">
                            {Object.values(DriveType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1">How can we help?</label>
                        <textarea name="description" id="description" rows={4} required value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"></textarea>
                    </div>
                    <div>
                        <button type="submit" className="w-full px-6 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-colors focus:outline-none focus:ring-4 focus:ring-accent">
                            Submit Request
                        </button>
                    </div>
                    {formStatus && <p className="text-center text-accent mt-4">{formStatus}</p>}
                </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
                    <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start">
                            <MapPinIcon className="w-6 h-6 mr-4 text-accent flex-shrink-0" />
                            <span>Swaz data recovery lab,Ajay Vihar Apartment, Sheela Nagar, Adapalli colony, Rajamahendravaram, Andhra Pradesh 533103.</span>
                        </li>
                        <li className="flex items-start">
                            <EmailIcon className="w-6 h-6 mr-4 text-accent flex-shrink-0 mt-1" />
                            <div>
                                <strong className="font-semibold text-text-light dark:text-text-dark">General Inquiries:</strong>
                                <a href="mailto:contactus@swazdatarecovery.com" className="block hover:underline hover:text-accent transition-colors">contactus@swazdatarecovery.com</a>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <EmailIcon className="w-6 h-6 mr-4 text-accent flex-shrink-0 mt-1" />
                            <div>
                                <strong className="font-semibold text-text-light dark:text-text-dark">Technical Support:</strong>
                                <a href="mailto:support@swazdatarecovery.com" className="block hover:underline hover:text-accent transition-colors">support@swazdatarecovery.com</a>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <EmailIcon className="w-6 h-6 mr-4 text-accent flex-shrink-0 mt-1" />
                            <div>
                                <strong className="font-semibold text-text-light dark:text-text-dark">Information:</strong>
                                <a href="mailto:info@swazdatarecovery.com" className="block hover:underline hover:text-accent transition-colors">info@swazdatarecovery.com</a>
                            </div>
                        </li>
                        <li className="flex items-center">
                            <PhoneIcon className="w-6 h-6 mr-4 text-accent" />
                            <a href="tel:+919701087446" className="hover:underline hover:text-accent transition-colors">+91-9701087446</a>
                        </li>
                    </ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Operating Hours</h2>
                     <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                        <li className="flex items-center">
                            <ClockIcon className="w-6 h-6 mr-4 text-accent" />
                            <span>Monday - Friday: 9:00 AM - 6:00 PM</span>
                        </li>
                         <li className="flex items-center">
                            <ClockIcon className="w-6 h-6 mr-4 text-accent invisible" />
                            <span>Saturday - Sunday: Closed</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        {/* FAQ Section */}
        <section>
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Frequently Asked Questions</h2>
            </div>
            <div className="max-w-3xl mx-auto">
                {faqItems.map((item, index) => (
                    <FaqItem 
                        key={index} 
                        item={item}
                        isOpen={openFaq === index}
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    />
                ))}
            </div>
        </section>
    </div>
  );
};

export default ContactPage;
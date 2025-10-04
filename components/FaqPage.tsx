import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, SearchIcon, DocumentIcon } from './icons/Icons';
import { AppView } from '../App';

interface FaqPageProps {
    onScrollToSection: (section: AppView) => void;
}

const faqData = [
  {
    category: 'General & Process',
    questions: [
      {
        q: 'How does the data recovery simulation work?',
        a: 'Our application simulates the process of scanning a storage device for lost files. It generates a list of mock "recovered" files to demonstrate what a real recovery process might look like. No actual data is recovered from your drives.',
      },
      {
        q: 'Is this application safe to use?',
        a: 'Yes, it is completely safe. The application does not access, read, or modify any files on your actual storage devices. It is a simulation tool designed for demonstration purposes only.',
      },
      {
        q: 'What is the success rate of recovery?',
        a: 'As a simulation, the "success rate" is 100%. In real-world scenarios, success rates vary depending on the type of damage and how the device has been handled since the data loss occurred. It is crucial to stop using a device as soon as you suspect data loss.',
      },
    ],
  },
  {
    category: 'P2P File Transfer',
    questions: [
        {
            q: 'How does the P2P file transfer work?',
            a: 'It uses a technology called WebRTC to create a direct, secure connection between your browser and the receiver\'s browser. Your files are sent straight from your device to theirs without ever being uploaded to a central server, ensuring privacy and speed.',
        },
        {
            q: 'Is the file transfer secure?',
            a: 'Yes, it is highly secure. The connection is end-to-end encrypted using the latest standards (ECDH for key exchange and AES-256-GCM for data encryption). This means only you and the person you are sending files to can decrypt and view them.',
        },
        {
            q: 'My connection is failing or the transfer is stuck. What should I do?',
            a: 'Connection issues are often caused by restrictive network firewalls (like at a school or office) that can block direct P2P connections. Try using a different network. Also, ensure both you and your peer have a stable internet connection and are using a modern browser like Chrome or Firefox.',
        },
        {
            q: 'Is there a limit to the file size I can send?',
            a: 'There are no hard limits on file size. Our system streams files in small, encrypted chunks, which means even very large files can be transferred without overloading your computer\'s memory. The main limitation is the stability and speed of your internet connection.',
        },
    ]
  },
  {
    category: 'Technical Questions',
    questions: [
        {
            q: 'What types of devices can be recovered?',
            a: 'Our simulation covers various device types including Hard Disk Drives (HDDs), Solid-State Drives (SSDs), USB flash drives, and more. Professional services can often recover data from an even wider range of media.',
        },
        {
            q: 'What kind of files can be "recovered"?',
            a: 'The simulation can generate various file types, including images, documents, videos, and audio files, to show the potential scope of a real data recovery service.',
        },
    ]
  },
  {
    category: 'Security & Pricing',
    questions: [
        {
            q: 'Do I need to pay for this service?',
            a: 'No. Both the data recovery simulation and the secure P2P file transfer service are completely free to use. There are no hidden charges or fees.',
        },
        {
            q: 'How is my data security handled?',
            a: 'Since this is a simulation, we do not handle any of your personal data. We are committed to privacy, and the app operates entirely within your browser without accessing local files.',
        },
    ]
  },
];

const resources = [
    { title: 'Guide: 5 Steps to Take Immediately After Data Loss', id: 'data-loss-steps' },
    { title: 'Article: Understanding the Difference Between HDD and SSD Failure', id: 'hdd-vs-ssd' },
    { title: 'Best Practices for Backing Up Your Important Files', id: 'backup-best-practices' },
];

const FaqItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button
                className="w-full flex justify-between items-center py-4 text-left gap-4"
                onClick={onClick}
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-lg">{question}</span>
                <ChevronDownIcon className={`w-6 h-6 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <p className="pb-4 pr-6 text-gray-600 dark:text-gray-400">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const FaqPage: React.FC<FaqPageProps> = ({ onScrollToSection }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>('General & Process-0');

  const filteredFaqData = useMemo(() => {
    if (!searchTerm.trim()) return faqData;

    return faqData.map(category => {
        const filteredQuestions = category.questions.filter(
            q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || q.a.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return { ...category, questions: filteredQuestions };
    }).filter(category => category.questions.length > 0);
  }, [searchTerm]);
  
  const slugify = (text: string) => text.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/[^\w-]+/g, '');

  const handleResourceClick = (e: React.MouseEvent<HTMLAnchorElement>, resourceId: string) => {
    e.preventDefault();
    // We need to navigate to the resources page first, then scroll.
    onScrollToSection('resources');
    // Use a timeout to allow the page to scroll to the section first, then to the element.
    setTimeout(() => {
        document.getElementById(resourceId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500); // 500ms delay, adjust if needed
  };

  return (
    <div className="animate-slide-in space-y-16">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">FAQ & Resources</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Find answers to common questions and learn more about data recovery best practices.
            </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto">
            <div className="relative">
                <input
                    type="search"
                    placeholder="Search for a question..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <SearchIcon className="w-6 h-6 text-gray-400" />
                </div>
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-x-12 gap-y-8">
            {/* Sticky Navigation */}
            <aside className="hidden lg:block lg:col-span-1">
                <nav className="sticky top-24">
                    <h3 className="font-bold text-lg mb-4 text-text-light dark:text-text-dark">Categories</h3>
                    {filteredFaqData.length > 0 && (
                        <ul className="space-y-2 border-l-2 border-gray-200 dark:border-gray-700">
                            {filteredFaqData.map(category => (
                                <li key={category.category}>
                                    <a 
                                        href={`#${slugify(category.category)}`}
                                        className="font-semibold text-gray-600 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors block -ml-0.5 pl-4 border-l-2 border-transparent hover:border-accent"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(slugify(category.category))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                    >
                                        {category.category}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>
            </aside>

            {/* FAQ Section */}
            <main className="lg:col-span-3">
                {filteredFaqData.length > 0 ? (
                    <div className="space-y-12">
                        {filteredFaqData.map(category => (
                            <section key={category.category} id={slugify(category.category)} className="scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary-light/50 text-text-light dark:text-text-dark">{category.category}</h2>
                                {category.questions.map((item, index) => (
                                    <FaqItem 
                                        key={index}
                                        question={item.q}
                                        answer={item.a}
                                        isOpen={openFaq === `${category.category}-${index}`}
                                        onClick={() => setOpenFaq(openFaq === `${category.category}-${index}` ? null : `${category.category}-${index}`)}
                                    />
                                ))}
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 lg:col-span-3">
                        <p className="text-xl font-semibold">No results found for "{searchTerm}"</p>
                        <p className="mt-2">Try searching for a different keyword or clearing the search.</p>
                    </div>
                )}
            </main>
        </div>

        {/* Resources Section */}
        <section className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-text-light dark:text-text-dark">Helpful Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resources.map((resource, index) => (
                     <a 
                        href={`#${resource.id}`}
                        onClick={(e) => handleResourceClick(e, resource.id)} 
                        key={index} 
                        className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-lg transition-transform duration-300 text-left"
                    >
                        <DocumentIcon className="w-8 h-8 mb-3 text-accent" />
                        <h3 className="font-semibold text-text-light dark:text-text-dark">{resource.title}</h3>
                    </a>
                ))}
            </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gray-100 dark:bg-gray-800 py-16 rounded-xl mt-16">
            <h2 className="text-3xl font-extrabold text-text-light dark:text-text-dark">Still Have Questions?</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Our support team is ready to assist you. Don't hesitate to reach out for personalized help.
            </p>
            <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  onScrollToSection('contact');
                }}
                className="inline-block mt-8 px-8 py-4 bg-accent text-white font-bold rounded-lg shadow-lg hover:bg-opacity-80 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/50"
            >
                Contact Support
            </a>
        </section>
    </div>
  );
};

export default FaqPage;
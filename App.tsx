import React, { useRef } from 'react';
import { useTheme } from './context/ThemeContext';
import Header from './components/Header';
import DriveSelector from './components/DriveSelector';
import ServicesPage from './components/ServicesPage';
import ContactPage from './components/ContactPage';
import TestimonialsPage from './components/TestimonialsPage';
import PricingPage from './components/PricingPage';
import FaqPage from './components/FaqPage';
import FileTransferPage from './components/FileTransferPage';
import AiChatAgent from './components/AiChatAgent';

export type AppView = 'home' | 'services' | 'transfer' | 'pricing' | 'contact' | 'testimonials' | 'faq';

const App: React.FC = () => {
  const { theme } = useTheme();
  
  const sectionRefs = {
    home: useRef<HTMLDivElement>(null),
    services: useRef<HTMLDivElement>(null),
    transfer: useRef<HTMLDivElement>(null),
    pricing: useRef<HTMLDivElement>(null),
    testimonials: useRef<HTMLDivElement>(null),
    faq: useRef<HTMLDivElement>(null),
    contact: useRef<HTMLDivElement>(null),
  };

  const scrollToSection = (section: AppView) => {
    sectionRefs[section].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className={`min-h-screen font-sans text-text-light dark:text-text-dark transition-colors duration-500 ${theme}`}>
      <Header onNavigate={scrollToSection} />
      <main className="container mx-auto px-4 py-8">
        <section id="home" ref={sectionRefs.home} className="min-h-[calc(100vh-80px)] scroll-mt-20 flex items-center justify-center">
          <DriveSelector onScrollToSection={scrollToSection} />
        </section>
        <section id="services" ref={sectionRefs.services} className="py-16 scroll-mt-20">
          <ServicesPage onScrollToSection={scrollToSection} />
        </section>
        <section id="transfer" ref={sectionRefs.transfer} className="py-16 scroll-mt-20">
          <FileTransferPage />
        </section>
        <section id="pricing" ref={sectionRefs.pricing} className="py-16 scroll-mt-20">
          <PricingPage />
        </section>
        <section id="testimonials" ref={sectionRefs.testimonials} className="py-16 scroll-mt-20">
          <TestimonialsPage onScrollToSection={scrollToSection} />
        </section>
        <section id="faq" ref={sectionRefs.faq} className="py-16 scroll-mt-20">
          <FaqPage onScrollToSection={scrollToSection} />
        </section>
        <section id="contact" ref={sectionRefs.contact} className="py-16 scroll-mt-20">
          <ContactPage />
        </section>
      </main>
      <footer className="text-center py-4 text-xs text-gray-500">
        <p>&copy; 2024 Swaz Data Recovery Labs. All rights reserved. This is a simulation application.</p>
      </footer>
      <AiChatAgent />
    </div>
  );
};

export default App;
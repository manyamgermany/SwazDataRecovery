import React from 'react';
import { HddIcon, SsdIcon, UsbIcon, RaidIcon, SwazLogoIcon } from './icons/Icons';
import { AppView } from '../App';

interface ServicesPageProps {
  onScrollToSection: (section: AppView) => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ onScrollToSection }) => {
    const services = [
      {
        icon: <HddIcon className="w-12 h-12 mb-4 text-primary-light" />,
        title: 'Hard Drive Recovery',
        description: 'We specialize in recovering data from all types of internal and external hard drives (HDDs) regardless of the cause of failure.',
      },
      {
        icon: <SsdIcon className="w-12 h-12 mb-4 text-primary-light" />,
        title: 'SSD Recovery',
        description: 'Our advanced techniques allow for high success rates in data recovery from solid-state drives (SSDs) that are failing or corrupted.',
      },
      {
        icon: <UsbIcon className="w-12 h-12 mb-4 text-primary-light" />,
        title: 'USB & Flash Drive Recovery',
        description: 'Recover your important files from damaged, formatted, or inaccessible USB flash drives, SD cards, and other memory devices.',
      },
      {
        icon: <RaidIcon className="w-12 h-12 mb-4 text-primary-light" />,
        title: 'RAID Recovery',
        description: 'Complex RAID array failures require expert handling. We can recover data from all RAID levels (RAID 0, 1, 5, 6, 10).',
      },
    ];

    const processSteps = [
      {
        step: '01',
        title: 'Evaluation & Diagnosis',
        description: 'Our simulation begins with a free, no-obligation evaluation. Simply select your drive to start the diagnostic scan.',
      },
      {
        step: '02',
        title: 'Secure Data Recovery',
        description: 'Using cutting-edge simulated algorithms, we perform a deep scan to locate and piece together your recoverable files.',
      },
      {
        step: '03',
        title: 'File Verification',
        description: 'After the scan, you can preview the recovered files to verify their integrity before proceeding with the final recovery.',
      },
      {
        step: '04',
        title: 'Data Return',
        description: 'Select the files you need, and our tool will securely "recover" them, completing the process and restoring your data.',
      },
    ];

  return (
    <div className="animate-slide-in space-y-24">
      {/* Services Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Our Recovery Services</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We provide expert data recovery solutions for a wide range of devices and data loss scenarios.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div key={index} className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center text-center">
              {service.icon}
              <h3 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">{service.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 flex-grow mb-4">{service.description}</p>
              {/* Fix: Removed button that referenced a non-existent 'cta' property on the service object. */}
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Our 4-Step Recovery Process</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">A transparent and straightforward process to get your data back quickly.</p>
        </div>
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-8 w-1 h-full bg-primary-light/20 -translate-x-1/2" aria-hidden="true"></div>

          <div className="space-y-12">
            {processSteps.map((step, index) => (
              <div key={index} className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex items-center space-x-4 md:space-x-0">
                   <div className="relative z-10 flex-shrink-0 w-16 h-16 flex items-center justify-center bg-primary-light text-white font-extrabold text-2xl rounded-full shadow-lg">
                    {step.step}
                  </div>
                  <div className="md:hidden">
                    <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{step.title}</h3>
                  </div>
                </div>
                <div className="border-l-4 border-primary-light/20 pl-6 md:border-none md:pl-0 md:pt-4">
                  <h3 className="hidden md:block text-2xl font-bold text-text-light dark:text-text-dark">{step.title}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="text-center bg-gray-100 dark:bg-gray-800 py-16 rounded-xl">
        <h2 className="text-3xl font-extrabold text-text-light dark:text-text-dark">Ready to Recover Your Files?</h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Don't wait. Start the secure recovery simulation now and see how Swaz Data Recovery Labs can help you retrieve your lost data.
        </p>
        <button
            onClick={() => onScrollToSection('home')}
            className="mt-8 px-8 py-4 bg-primary-light text-white font-bold rounded-lg shadow-lg hover:bg-secondary-light transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        >
            Start Your Recovery Now
        </button>
      </section>
    </div>
  );
};

export default ServicesPage;
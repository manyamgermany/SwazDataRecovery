import React from 'react';
import { AppView } from '../App';
import { DocumentIcon, UploadCloudIcon } from './icons/Icons';

interface ResourcesPageProps {
    onScrollToSection: (section: AppView) => void;
}

const resources = [
  {
    id: 'data-loss-steps',
    title: '5 Steps to Take Immediately After Data Loss',
    icon: <DocumentIcon className="w-8 h-8 text-primary-light" />,
    content: [
      {
        step: '1. Stop Using the Device Immediately',
        description: 'The most critical step. Continuing to use the drive can overwrite the very data you need to recover, significantly reducing the chances of success. Power down the device safely.',
      },
      {
        step: '2. Do Not Format or Re-install Software',
        description: 'Your operating system or device might prompt you to format the disk if it detects an error. Do not do this. Formatting erases the file system\'s map to your data, making recovery much harder.',
      },
      {
        step: '3. Assess the Situation Calmly',
        description: 'Think about what happened. Was the device dropped (physical damage)? Did you accidentally delete files (logical damage)? Knowing the cause helps professionals choose the right recovery method.',
      },
      {
        step: '4. Avoid DIY Recovery Software (If Data is Critical)',
        description: 'While some software can recover simple deletions, using it incorrectly on a physically failing drive can cause irreversible platter damage. If the data is priceless, it\'s best to leave it to the experts.',
      },
      {
        step: '5. Contact a Professional',
        description: 'A professional data recovery service has the cleanroom environments and specialized tools to safely diagnose and treat both physical and logical drive failures without risking further data loss.',
      },
    ]
  },
  {
    id: 'hdd-vs-ssd',
    title: 'Understanding HDD vs. SSD Failure',
    icon: <DocumentIcon className="w-8 h-8 text-primary-light" />,
    content: [
      {
        step: 'Hard Disk Drives (HDD)',
        description: 'HDDs store data on spinning magnetic platters. Failures are often mechanical. Signs include clicking, whirring, or grinding noises. Causes can be physical shock from a drop or simple wear and tear. Recovery is often possible if the platters are not severely damaged.',
      },
      {
        step: 'Solid-State Drives (SSD)',
        description: 'SSDs use flash memory with no moving parts. Failures are typically electronic, affecting the controller chip or memory cells. Signs include read/write errors, a drive that disappears, or extremely slow performance. Recovery is more complex due to features like TRIM (which actively erases deleted data) and requires highly specialized tools to bypass the controller.',
      },
    ]
  },
  {
    id: 'backup-best-practices',
    title: 'Best Practices for Backing Up Your Files',
    icon: <UploadCloudIcon className="w-8 h-8 text-primary-light" />,
    content: [
      {
        step: 'The 3-2-1 Rule',
        description: 'This is the gold standard. Keep at least 3 copies of your data, on 2 different types of storage media, with 1 copy located off-site (e.g., in the cloud or at a different physical location).',
      },
      {
        step: 'Automate Your Backups',
        description: 'Manual backups are easy to forget. Use software (like Windows File History, macOS Time Machine, or third-party cloud services) to automate the process daily or weekly.',
      },
      {
        step: 'Test Your Backups Regularly',
        description: 'A backup is useless if it can\'t be restored. Periodically test a few files from your backup to ensure they are readable and not corrupted. Don\'t wait until a disaster to find out your backup is broken.',
      },
    ]
  }
];

const ResourcesPage: React.FC<ResourcesPageProps> = ({ onScrollToSection }) => {
  const isMobileDevice = () => {
    // A common way to check for touch-capable devices, which are mostly mobile.
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  };

  const contactHref = isMobileDevice() ? 'tel:+919701087446' : 'mailto:contactus@swazdatarecovery.com';

  return (
    <div className="animate-slide-in space-y-16">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Helpful Resources</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Knowledge to help you prevent data loss and understand the recovery process.
            </p>
        </div>

        {resources.map((resource) => (
            <section key={resource.id} id={resource.id} className="scroll-mt-24 max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                    {resource.icon}
                    <h2 className="text-3xl font-bold text-text-light dark:text-text-dark">{resource.title}</h2>
                </div>
                <div className="space-y-6">
                    {resource.content.map((item, index) => (
                        <div key={index} className="border-l-4 border-accent pl-4">
                            <h3 className="font-semibold text-xl text-text-light dark:text-text-dark">{item.step}</h3>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">{item.description}</p>
                        </div>
                    ))}
                </div>
            </section>
        ))}

        <section className="text-center bg-gray-100 dark:bg-gray-800 py-16 rounded-xl mt-16">
            <h2 className="text-3xl font-extrabold text-text-light dark:text-text-dark">Need Professional Help?</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                If you're facing a data loss situation, our team is ready to assist. Don't hesitate to reach out for a free quote.
            </p>
            <a
                href={contactHref}
                className="inline-block mt-8 px-8 py-4 bg-primary-light text-white font-bold rounded-lg shadow-lg hover:bg-secondary-light transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
            >
                Contact Us
            </a>
        </section>
    </div>
  );
};

export default ResourcesPage;
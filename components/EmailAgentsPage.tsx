import React from 'react';
// Fix: Replaced missing icons with existing alternatives from Icons.tsx
import { EmailIcon, UsbIcon, HddIcon, ChatBubbleIcon, InformationCircleIcon } from './icons/Icons';

const features = [
  {
    icon: <EmailIcon className="w-10 h-10 mb-4 text-primary-light" />,
    title: 'Secure Email Integration',
    description: 'Connects directly to Hostinger email servers (IMAP/SMTP over SSL) to securely poll for new messages and send replies, ensuring all communication is encrypted and private.',
  },
  {
    icon: <UsbIcon className="w-10 h-10 mb-4 text-primary-light" />,
    title: 'Contextual AI Responses',
    description: 'Utilizes advanced AI/NLP to classify incoming emails by intent, generating helpful, context-aware replies from a tailored knowledge base for each specific support channel.',
  },
  {
    icon: <ChatBubbleIcon className="w-10 h-10 mb-4 text-primary-light" />,
    title: 'Automated Workflows',
    description: 'Extracts key user data (name, phone, issue details) to create support tickets and detects when a conversation requires human intervention, automatically escalating to our team.',
  },
];

const agents = [
  {
    icon: <InformationCircleIcon className="w-12 h-12 text-accent" />,
    name: 'General Inquiry Agent',
    email: 'info@swazdatarecovery.com',
    description: 'Handles all general questions about our services, simulation tools, and company information. This agent is trained to provide clear, concise answers and guide users to the right resources on our website.',
  },
  {
    icon: <HddIcon className="w-12 h-12 text-accent" />,
    name: 'HDD Recovery Support Agent',
    email: 'support@swazdatarecovery.com',
    description: 'A specialized agent focused on inquiries related to hard drive recovery. It can understand technical details, provide initial troubleshooting steps, and gather necessary information for complex recovery cases.',
  },
  {
    icon: <ChatBubbleIcon className="w-12 h-12 text-accent" />,
    name: 'Contact Us Agent',
    email: 'contactus@swazdatarecovery.com',
    description: 'Manages all submissions from our "Contact Us" and "Quote" forms. It parses form data, confirms receipt with the user, and forwards the structured information to the appropriate internal team for follow-up.',
  },
];

const EmailAgentsPage: React.FC = () => {
  return (
    <div className="animate-slide-in space-y-24">
      {/* Header Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Automated Email Support Agents</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Our intelligent AI agents work around the clock to provide instant, helpful responses to your email inquiries, ensuring you get the information you need, when you need it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center text-center">
              {feature.icon}
              <h3 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Meet Our Agents</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Each agent is tailored to handle specific types of inquiries with expertise.</p>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
            {agents.map((agent, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transition-shadow hover:shadow-2xl">
                    <div className="flex-shrink-0">
                        {agent.icon}
                    </div>
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{agent.name}</h3>
                        <p className="font-mono text-accent my-2">{agent.email}</p>
                        <p className="text-gray-600 dark:text-gray-400">{agent.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default EmailAgentsPage;
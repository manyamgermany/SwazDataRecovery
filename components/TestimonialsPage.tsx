import React from 'react';
import { StarIcon, QuoteIcon } from './icons/Icons';
import { AppView } from '../App';

interface TestimonialsPageProps {
    onScrollToSection: (section: AppView) => void;
}

const testimonials = [
  {
    name: 'Priya K.',
    role: 'Freelance Photographer',
    quote: 'I thought I lost a whole photoshoot from a corrupted SD card. Swaz Data Recovery Labs\'s simulation showed me what was possible, and it gave me the confidence to seek professional help. A true lifesaver!',
    rating: 5,
  },
  {
    name: 'Ananth R.',
    role: 'University Student',
    quote: 'My external hard drive with my thesis failed days before the deadline. This app helped me understand the recovery process. So grateful for this tool!',
    rating: 5,
  },
  {
    name: 'Suresh V.',
    role: 'Small Business Owner',
    quote: 'We lost critical financial records from a server failure. The RAID recovery simulation was incredibly insightful. Highly recommend for anyone facing data loss.',
    rating: 5,
  },
];

const successStories = [
    {
        title: 'The Missing Wedding Photos',
        challenge: 'A professional photographer accidentally formatted a memory card containing an entire wedding shoot. The files were irreplaceable.',
        solution: 'Using the app\'s simulation for "Image Recovery," the photographer could see how specialized software scans for file signatures, bypassing the file system to find deleted photos.',
        outcome: 'The simulation demonstrated a high probability of recovery, prompting the user to successfully use a real recovery service to restore over 95% of the priceless photos.',
    },
    {
        title: 'Crisis of the Corrupted Thesis',
        challenge: 'A graduate student\'s laptop crashed, corrupting a multi-year research thesis stored on the primary SSD.',
        solution: 'The "Document Recovery" simulation showed how file fragments could be identified and pieced back together, even from a non-booting drive.',
        outcome: 'Understanding the process, the student was able to get professional help that successfully reconstructed the entire thesis, saving years of work.',
    },
]

const TestimonialsPage: React.FC<TestimonialsPageProps> = ({ onScrollToSection }) => {
  return (
    <div className="animate-slide-in space-y-24">
      {/* Header Section */}
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">What Our Users Say</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Real stories from users who have trusted Swaz Data Recovery Labs to understand and navigate data loss.
        </p>
      </section>

      {/* Testimonials Grid */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col h-full">
                <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                        <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                </div>
                <QuoteIcon className="w-8 h-8 text-primary-light/30 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 italic flex-grow">"{testimonial.quote}"</p>
                <div className="mt-6">
                    <p className="font-bold text-text-light dark:text-text-dark">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
            </div>
          ))}
        </div>
      </section>

      {/* Success Stories Section */}
      <section>
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">Detailed Success Stories</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">In-depth looks at how we help solve complex data loss scenarios.</p>
        </div>
        <div className="space-y-8 max-w-4xl mx-auto">
            {successStories.map((story, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transition-shadow hover:shadow-2xl">
                    <h3 className="text-2xl font-bold text-primary-light mb-4">{story.title}</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-text-light dark:text-text-dark">The Challenge:</h4>
                            <p className="text-gray-600 dark:text-gray-400">{story.challenge}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-text-light dark:text-text-dark">Our Simulated Solution:</h4>
                            <p className="text-gray-600 dark:text-gray-400">{story.solution}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-text-light dark:text-text-dark">The Outcome:</h4>
                            <p className="text-gray-600 dark:text-gray-400">{story.outcome}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center bg-gray-100 dark:bg-gray-800 py-16 rounded-xl">
        <h2 className="text-3xl font-extrabold text-text-light dark:text-text-dark">Have a Story to Share?</h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            If our simulation helped you, we'd love to hear about it. Your story could help others in a similar situation.
        </p>
        <button
            onClick={() => onScrollToSection('contact')}
            className="mt-8 px-8 py-4 bg-accent text-white font-bold rounded-lg shadow-lg hover:bg-opacity-80 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/50"
        >
            Share Your Experience
        </button>
      </section>
    </div>
  );
};

export default TestimonialsPage;
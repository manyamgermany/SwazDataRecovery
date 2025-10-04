import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AppView } from '../App';
import { SunIcon, MoonIcon, SwazLogoIcon, MenuIcon, CloseIcon } from './icons/Icons';

interface HeaderProps {
  onNavigate: (view: AppView) => void;
}

const navLinks: { view: AppView, label: string }[] = [
    { view: 'services', label: 'Services' },
    { view: 'transfer', label: 'File Transfer' },
    { view: 'pricing', label: 'Pricing' },
    { view: 'testimonials', label: 'Testimonials' },
    { view: 'faq', label: 'FAQ' },
    { view: 'contact', label: 'Contact' },
]

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Prevent scrolling when mobile menu is open
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
  }, [isMenuOpen]);

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setIsMenuOpen(false);
  }

  return (
    <>
      <header className="bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm shadow-md sticky top-0 z-50 transition-colors duration-500">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => handleNavClick('home')} className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-accent rounded-lg p-1">
            <SwazLogoIcon className="w-8 h-8 text-primary-light" />
            <h1 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">
              Swaz Data Recovery Labs
            </h1>
          </button>
          
          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center space-x-1 md:space-x-4">
              {navLinks.map(link => (
                  <button
                    key={link.view}
                    onClick={() => handleNavClick(link.view)}
                    className="font-semibold text-text-light dark:text-text-dark hover:text-accent dark:hover:text-accent-light transition-colors duration-300 px-2 py-1 rounded-md"
                >
                    {link.label}
                </button>
              ))}
              <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-background-light dark:focus:ring-offset-background-dark text-text-light dark:text-text-dark"
                  aria-label="Toggle theme"
              >
                  {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
              </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center">
             <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-text-light dark:text-text-dark mr-2"
                  aria-label="Toggle theme"
              >
                  {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
              </button>
            <button onClick={() => setIsMenuOpen(true)} className="p-2" aria-label="Open menu">
              <MenuIcon className="w-6 h-6 text-text-light dark:text-text-dark" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[100] bg-background-light dark:bg-background-dark p-4 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} sm:hidden`}>
          <div className="flex justify-end mb-8">
              <button onClick={() => setIsMenuOpen(false)} className="p-2" aria-label="Close menu">
                  <CloseIcon className="w-8 h-8 text-text-light dark:text-text-dark"/>
              </button>
          </div>
          <nav className="flex flex-col items-center justify-center space-y-8 h-full -mt-16">
              {navLinks.map(link => (
                  <button
                    key={link.view}
                    onClick={() => handleNavClick(link.view)}
                    className="text-3xl font-bold text-text-light dark:text-text-dark hover:text-accent transition-colors"
                >
                    {link.label}
                </button>
              ))}
          </nav>
      </div>
    </>
  );
};

export default Header;
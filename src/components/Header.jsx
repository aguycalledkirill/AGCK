import { useState, useEffect } from 'react';
import './Header.css';

const NAV = [
  { href: '#work', label: 'Work' },
  { href: '#profile', label: 'Profile' },
  { href: '#feed', label: 'Feed' },
  { href: '#photography', label: 'Photography' },
  { href: '#contact', label: 'Contact' },
];

function Header({ active = 'photography' }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York',
      };
      setCurrentTime(now.toLocaleTimeString('en-US', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-logo">
        <a href="/">AGUYCALLED KIRILL</a>
      </div>

      <div className="header-center">
        <span className="header-title">Brand Creative Director</span>
        <div className="header-location">
          <span>New York</span>
          <span className="location-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>{currentTime}</span>
        </div>
      </div>

      <nav className="header-nav" aria-label="Primary">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={active === item.label.toLowerCase() ? 'is-active' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export default Header;

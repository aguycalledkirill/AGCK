import './Footer.css';

function Footer({ className = '', style }) {
  return (
    <footer className={`footer ${className}`.trim()} style={style}>
      <div className="footer-content">
        <div className="footer-copyright">
          <p>&copy; {new Date().getFullYear()} A Guy Called Kirill</p>
        </div>

        <div className="footer-links">
          <div className="footer-link-group">
            <a href="#work">Work</a>
            <a href="#feed">Feed</a>
            <a href="#profile">Profile</a>
            <a href="#photography">Photography</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-link-group">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://www.workingnotworking.com" target="_blank" rel="noopener noreferrer">
              WNW
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="https://savee.it" target="_blank" rel="noopener noreferrer">
              Savee
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

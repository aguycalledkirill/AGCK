import './Profile.css';

const experience = [
  {
    title: 'A Guy Called Kirill',
    role: 'Creative Director',
    years: '2023 — Now',
    details: 'Partnering with founders to build narrative-driven systems.'
  },
  {
    title: 'R/GA',
    role: 'Executive Creative Director',
    years: '2018 — 2023',
    details: 'Led multi-disciplinary teams across digital platforms.'
  },
  {
    title: 'Huge',
    role: 'Creative Director',
    years: '2015 — 2018',
    details: 'Built brand systems and campaigns for global clients.'
  }
];

const timeline = [
  {
    year: '2025',
    caption: 'Moments in Melbourne',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&auto=format&fit=crop'
  },
  {
    year: '2024',
    caption: 'Brooklyn studio desk',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop'
  },
  {
    year: '2023',
    caption: 'Field recordings',
    image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=600&auto=format&fit=crop'
  }
];

function Profile() {
  return (
    <section className="profile" id="profile">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Creative lead with systems thinking</h2>
        </div>
        <p className="section-note">Three-column dossier: portrait, bio, timeline</p>
      </div>

      <div className="profile-grid">
        <div className="profile-left">
          <img
            className="profile-portrait"
            src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&auto=format&fit=crop"
            alt="Portrait of Kirill"
            loading="lazy"
          />
          <div className="profile-links">
            <a href="mailto:hello@agck.studio">Email</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>

        <div className="profile-center">
          <p className="profile-intro">
            AGCK is the practice of Kirill Sudosa, connecting narrative clarity with
            visual rigor. He helps founders articulate positioning, product teams
            scale design languages, and marketing squads launch cohesive stories.
          </p>

          <div className="profile-section">
            <h3>Experience</h3>
            <ul>
              {experience.map((item) => (
                <li key={item.title}>
                  <div className="exp-title">{item.title}</div>
                  <div className="exp-role">{item.role}</div>
                  <div className="exp-years">{item.years}</div>
                  <p className="exp-details">{item.details}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="profile-section">
            <h3>Skills</h3>
            <div className="skill-tags">
              <span>Brand systems</span>
              <span>Design direction</span>
              <span>Narrative design</span>
              <span>Product strategy</span>
              <span>Art direction</span>
              <span>Workshop facilitation</span>
            </div>
          </div>
        </div>

        <div className="profile-right">
          <div className="timeline">
            {timeline.map((item) => (
              <div className="timeline-card" key={item.year}>
                <div className="timeline-meta">
                  <span className="timeline-year">{item.year}</span>
                  <span className="timeline-caption">{item.caption}</span>
                </div>
                <div className="timeline-image">
                  <img src={item.image} alt={item.caption} loading="lazy" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Profile;

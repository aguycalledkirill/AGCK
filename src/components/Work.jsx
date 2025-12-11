import { useState } from 'react';
import './Work.css';

const projects = [
  {
    id: 1,
    title: 'Ford',
    subtitle: 'Rewards platform',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1000&auto=format&fit=crop',
    categories: ['Digital', 'Product'],
    size: 'large'
  },
  {
    id: 2,
    title: 'Starbucks',
    subtitle: 'Digital Network Platform',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1000&auto=format&fit=crop',
    categories: ['Platform', 'Service'],
    size: 'medium'
  },
  {
    id: 3,
    title: 'Peraton',
    subtitle: "Do The Can't Be Done",
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop',
    categories: ['Campaign', 'Brand'],
    size: 'medium',
    hasArrow: true
  },
  {
    id: 4,
    title: 'Beoplay',
    subtitle: 'Freedom launch',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1000&auto=format&fit=crop',
    categories: ['Motion', 'Launch'],
    size: 'small'
  },
  {
    id: 5,
    title: 'Ford',
    subtitle: 'Adaptive ownership',
    image: 'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=1000&auto=format&fit=crop',
    categories: ['Platform', 'Product'],
    size: 'large-tall'
  },
  {
    id: 6,
    title: 'Peloton',
    subtitle: 'Motion language',
    image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07d?w=1000&auto=format&fit=crop',
    categories: ['Motion', 'Brand'],
    size: 'small'
  },
  {
    id: 7,
    title: 'Ford',
    subtitle: 'Future-ready mobility',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1000&auto=format&fit=crop',
    categories: ['Film', 'Campaign'],
    size: 'large'
  },
  {
    id: 8,
    title: 'Sleep Aid',
    subtitle: 'AI dreamscapes',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1000&auto=format&fit=crop',
    categories: ['Product', 'Narrative'],
    size: 'medium'
  }
];

function Work() {
  const [viewMode, setViewMode] = useState('grid');

  return (
    <section className="work" id="work">
      <div className="work-header">
        <div className="work-title">
          <div>
            <p className="eyebrow">Work</p>
            <h2>Selected engagements</h2>
          </div>
          <span className="work-years">2005—2025</span>
        </div>

        <div className="work-view-toggle">
          <button
            className={`view-btn ${viewMode === 'index' ? 'active' : ''}`}
            onClick={() => setViewMode('index')}
          >
            Index
          </button>
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
        </div>
      </div>

      <div className={`work-grid ${viewMode}`}>
        {projects.map((project) => (
          <article
            key={project.id}
            className={`project-card ${project.size}`}
          >
            <div className="project-image">
              <img src={project.image} alt={project.title} loading="lazy" />
            </div>
            <div className="project-info">
              <h3>
                <span className="project-title">{project.title}</span>
                {' '}
                <span className="project-subtitle">{project.subtitle}</span>
              </h3>
              {project.categories.length > 0 && (
                <p className="project-categories">
                  {project.categories.join(', ')}
                </p>
              )}
              {project.hasArrow && (
                <span className="project-arrow">→</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Work;

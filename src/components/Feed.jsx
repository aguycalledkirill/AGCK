import './Feed.css';

const feedItems = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1421809313281-48f03fa45e9f?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&auto=format&fit=crop&sat=-70',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop'
];

function Feed() {
  return (
    <section className="feed" id="feed">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Feed</p>
          <h2>Captured thoughts</h2>
        </div>
        <p className="section-note">Continuous stream of visual experiments</p>
      </div>

      <div className="feed-grid">
        {feedItems.map((src, index) => (
          <div className="feed-card" key={src}>
            <div className="feed-image">
              <img src={src} alt={`Feed item ${index + 1}`} loading="lazy" />
            </div>
            <span className="feed-year">{2025 - Math.floor(index / 2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Feed;

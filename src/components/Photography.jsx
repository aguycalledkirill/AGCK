import './Photography.css';

const photos = [
  {
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop',
    caption: '©A Guy Called Kirill 23'
  },
  {
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&auto=format&fit=crop&sat=-50',
    caption: '©A Guy Called Kirill 23'
  },
  {
    src: 'https://images.unsplash.com/photo-1421809313281-48f03fa45e9f?w=800&auto=format&fit=crop',
    caption: '©A Guy Called Kirill 23'
  },
  {
    src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=700&auto=format&fit=crop',
    caption: '©A Guy Called Kirill 23'
  },
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop',
    caption: '©A Guy Called Kirill 23'
  },
  {
    src: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=700&auto=format&fit=crop',
    caption: '©A Guy Called Kirill 23'
  }
];

function Photography() {
  return (
    <section className="photography" id="photography">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Photography</p>
          <h2>Places &amp; light studies</h2>
        </div>
        <p className="section-note">Responsive gallery maintaining native ratios</p>
      </div>

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <figure className="photo-card" key={photo.src}>
            <img src={photo.src} alt={`Photography ${index + 1}`} loading="lazy" />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default Photography;

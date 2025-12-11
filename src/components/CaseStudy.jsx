import './CaseStudy.css';

const gallery = [
  'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522199743304-836ff1b68a0c?w=1000&auto=format&fit=crop'
];

function CaseStudy() {
  return (
    <section className="case-study" id="case-study">
      <div className="case-hero">
        <div className="case-hero-text">
          <p className="eyebrow">Featured Case Study</p>
          <h2>Sleep Aid — AI-narrated dreamscapes</h2>
          <p className="case-subhead">
            Building a calming audio platform that pairs generative soundscapes with
            vivid editorial visuals. Oversized typography overlaps the gallery to echo the
            layered storytelling of the work.
          </p>
        </div>
        <div className="case-hero-gallery">
          {gallery.map((src, index) => (
            <img key={src} src={src} alt={`Case study frame ${index + 1}`} loading="lazy" />
          ))}
        </div>
      </div>

      <div className="case-body">
        <div className="case-column">
          <h3>Brief</h3>
          <p>
            Create a visual and verbal identity for a product that helps users unwind
            through generative audio. The solution needed to feel premium yet warm, with
            motion cues that echo circadian rhythms.
          </p>
        </div>
        <div className="case-column">
          <h3>Insight</h3>
          <p>
            The most effective prompts are atmospheric. We leaned on cinematic frames,
            layering gradients and iridescent textures to cue imagination before the
            sound even starts.
          </p>
        </div>
        <div className="case-column">
          <h3>Solution</h3>
          <p>
            A modular layout system with paired typography and photography. Users explore
            a horizontal gallery of episodes while the oversized headline anchors the
            narrative.
          </p>
        </div>
      </div>
    </section>
  );
}

export default CaseStudy;

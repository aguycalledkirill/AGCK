import './WorkIndex.css';

const indexRows = [
  {
    year: '2025',
    client: 'Sleep Aid',
    project: 'AI-fueled dreamscapes',
    agency: 'AGCK Studio',
    discipline: 'Product, Narrative',
    role: 'Creative Director',
    thumb: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=400&h=300&fit=crop'
  },
  {
    year: '2024',
    client: 'Starbucks',
    project: 'Digital Network Platform',
    agency: 'R/GA',
    discipline: 'Platform, Product',
    role: 'Executive Creative Director'
  },
  {
    year: '2023',
    client: 'Ford',
    project: 'Rewards',
    agency: 'BBDO',
    discipline: 'Experience, Film',
    role: 'Creative Lead'
  },
  {
    year: '2022',
    client: 'Peraton',
    project: "Do The Can't Be Done",
    agency: 'Huge',
    discipline: 'Brand, Campaign',
    role: 'Creative Director',
    thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop'
  }
];

function WorkIndex() {
  return (
    <section className="work-index" id="work-index">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Index</p>
          <h2>Project archive</h2>
        </div>
        <p className="section-note">Sortable table with hover preview</p>
      </div>

      <div className="index-table" role="table">
        <div className="index-header" role="row">
          <span role="columnheader">Year</span>
          <span role="columnheader">Client</span>
          <span role="columnheader">Project</span>
          <span role="columnheader">Agency</span>
          <span role="columnheader">Discipline</span>
          <span role="columnheader">Role</span>
          <span className="thumbnail-col" role="columnheader">Preview</span>
        </div>
        {indexRows.map((row) => (
          <div className="index-row" role="row" key={`${row.year}-${row.project}`}>
            <span>{row.year}</span>
            <span>{row.client}</span>
            <span>{row.project}</span>
            <span>{row.agency}</span>
            <span>{row.discipline}</span>
            <span>{row.role}</span>
            <span className="thumbnail-col">
              {row.thumb ? (
                <img src={row.thumb} alt={`${row.project} thumbnail`} loading="lazy" />
              ) : (
                <span className="placeholder-thumb" aria-hidden="true" />
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WorkIndex;

import './Contact.css';

function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Contact</p>
          <h2>Let’s build the next chapter</h2>
        </div>
        <p className="section-note">Drop a line about collaborations or speaking</p>
      </div>

      <form className="contact-form">
        <div className="form-row">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" placeholder="Your name" />
        </div>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@company.com" />
        </div>
        <div className="form-row">
          <label htmlFor="message">Project notes</label>
          <textarea id="message" name="message" rows="4" placeholder="Timeline, scope, goals" />
        </div>
        <button type="submit">Send inquiry</button>
      </form>
    </section>
  );
}

export default Contact;

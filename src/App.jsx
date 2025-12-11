import Header from './components/Header';
import Hero from './components/Hero';
import Work from './components/Work';
import WorkIndex from './components/WorkIndex';
import Feed from './components/Feed';
import Photography from './components/Photography';
import Profile from './components/Profile';
import CaseStudy from './components/CaseStudy';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <Work />
        <WorkIndex />
        <CaseStudy />
        <Feed />
        <Photography />
        <Profile />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;

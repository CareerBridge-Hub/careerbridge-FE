import { NotificationBar } from './components/NotificationBar';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { TrackTabs } from './components/TrackTabs';
import { Cards } from './components/Cards';
import { Note, List, Task, Sheet } from './components/Showcase';
import { Reviews } from './components/Reviews';
import { Download, Marquee, Footer } from './components/Outro';
import { CookieConsent } from './components/CookieConsent';

export function App() {
  return (
    <div className="flexwrapper">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <NotificationBar />
      <Header />
      <main id="main" className="loadanimation">
        <Hero />
        <TrackTabs />
        <Cards />
        <Note />
        <List />
        <Task />
        <Sheet />
        <Reviews />
        <Download />
        <Marquee />
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}

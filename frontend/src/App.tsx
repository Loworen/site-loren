import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import AboutMe from './pages/AboutMe';
import AboutMySona from './pages/AboutMySona';
import MyLinks from './pages/MyLinks';
import More from './pages/More';
import Confidential from './pages/Confidential';

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/about" element={<AboutMe />} />
        <Route path="/about/sona" element={<AboutMySona />} />
        <Route path="/about/links" element={<MyLinks />} />
        <Route path="/about/more" element={<More />} />
        <Route path="/confidential" element={<Confidential />} />
      </Routes>
    </>
  );
}

export default App;

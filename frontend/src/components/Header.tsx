import { useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { searchSite } from '../api/searchApi';

function Header() {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      const results = await searchSite(trimmed);
      if (results.length > 0) {
        setMessage('');
        setQuery('');
        navigate(results[0].path);
      } else {
        setMessage(`no pages found for "${trimmed}"`);
      }
    } catch {
      setMessage('search is taking a nap, try again later');
    }
  }

  // Returns the pill class + active variant for NavLink's className callback
  function navClass({ isActive }: { isActive: boolean }) {
    return `nav-btn${isActive ? ' nav-btn--active' : ''}`;
  }

  return (
    <div className="header-wrapper">
      <header className="site-header">
        {/* Logo — doubles as the home link */}
        <NavLink to="/" end className="logo" aria-label="go home">
          loren&apos;s <span>safespace</span>
        </NavLink>

        <nav className="nav" aria-label="main navigation">
          <NavLink to="/" end className={navClass}>
            <i className="ti ti-home" aria-hidden="true" />
            home
          </NavLink>

          {/* About me — dropdown on hover (pure CSS) */}
          <div className="dropdown">
            <NavLink to="/about" className={navClass}>
              <i className="ti ti-user" aria-hidden="true" />
              about me
              <i
                className="ti ti-chevron-down header-chevron"
                aria-hidden="true"
                style={{ fontSize: '12px' }}
              />
            </NavLink>
            <div className="dropdown-panel" role="menu">
              <NavLink to="/about/sona" className="dropdown-item" role="menuitem">
                <i className="ti ti-star" aria-hidden="true" />
                my sona
              </NavLink>
              <NavLink to="/about/links" className="dropdown-item" role="menuitem">
                <i className="ti ti-link" aria-hidden="true" />
                my links
              </NavLink>
              <NavLink to="/about/more" className="dropdown-item" role="menuitem">
                <i className="ti ti-info-circle" aria-hidden="true" />
                more info
              </NavLink>
            </div>
          </div>

          <NavLink to="/gallery" className={navClass}>
            <i className="ti ti-photo" aria-hidden="true" />
            gallery
          </NavLink>

          {/* "pet the cat" always goes to gallery; no active highlight of its own */}
          <NavLink to="/gallery" className="nav-btn">
            <i className="ti ti-paw" aria-hidden="true" />
            pet the cat
          </NavLink>

          <NavLink to="/confidential" className={navClass}>
            <i className="ti ti-lock" aria-hidden="true" />
            confidential
          </NavLink>
        </nav>

        {/* Search — inline pill, submit on Enter */}
        <form className="search-pill" onSubmit={handleSearch} role="search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="text"
            maxLength={20}
            placeholder="search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="search the site"
          />
          {/* visually hidden submit keeps Enter-key accessible */}
          <button type="submit" aria-label="search" className="search-pill-submit">
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </form>
      </header>

      {message && (
        <p className="search-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default Header;

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        navigate(results[0].path);
      } else {
        setMessage(`no pages found for "${trimmed}"`);
      }
    } catch {
      setMessage('search is taking a nap, try again later');
    }
  }

  return (
    <header className="site-header">
      <h1 id="p2">Loren&apos;s safespace</h1>

      <Link to="/">
        <button id="botao_1_index">• home</button>
      </Link>

      <div className="dropdown">
        <Link to="/about">
          <button>• about me [⬇]</button>
        </Link>
        <div className="content">
          <Link to="/about/sona">• my sona</Link>
          <Link to="/about/links">• my links</Link>
          <Link to="/about/more">• more info</Link>
        </div>
      </div>

      <Link to="/gallery">
        <button id="botao_1_index">• gallery</button>
      </Link>

      <Link to="/gallery">
        <button id="botao_1_index">• pet the cat</button>
      </Link>

      <Link to="/confidential">
        <button id="botao_1_index">• confidential</button>
      </Link>

      <form className="search-form" onSubmit={handleSearch}>
        <label htmlFor="search" className="search-label">
          search:
        </label>
        <input
          id="search"
          type="text"
          maxLength={20}
          placeholder="try 'sona'..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <input type="submit" value="go" />
      </form>
      {message && <p className="search-message">{message}</p>}
    </header>
  );
}

export default Header;

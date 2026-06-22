import { useEffect, useState } from 'react';
import { fetchCatCount, petTheCat } from '../api/catApi';
import lorenArt from '../assets/lorenrenn2.png';

function Gallery() {
  const [count, setCount] = useState<number | null>(null);
  const [isPetting, setIsPetting] = useState(false);

  useEffect(() => {
    fetchCatCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  async function handlePet() {
    setIsPetting(true);
    try {
      const newCount = await petTheCat();
      setCount(newCount);
    } catch {
      // backend unreachable - leave the count as-is
    } finally {
      setIsPetting(false);
    }
  }

  return (
    <main>
      <br />
      <p>the cat has been pet {count ?? '...'} times</p>
      <button id="button" onClick={handlePet} disabled={isPetting}>
        pet the cat
      </button>
      <br />
      <img src={lorenArt} height={621} alt="Loren character artwork" />
    </main>
  );
}

export default Gallery;

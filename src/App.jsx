import '@/App.css';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import PokemonDetailPage from '@/pages/PokemonDetailPage';
import TypesPage from '@/pages/TypesPage';
import GenerationsPage from '@/pages/GenerationsPage';
import BattlePage from '@/pages/BattlePage';
import FavoritesPage from '@/pages/FavoritesPage';

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
          <Route path="/types" element={<TypesPage />} />
          <Route path="/generations" element={<GenerationsPage />} />
          <Route path="/battle" element={<BattlePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;

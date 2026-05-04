import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PriceUpdater from './pages/PriceUpdater';
import SupplierConverter from './pages/SupplierConverter';

export default function App() {
  return (
    <Router>
      <Navbar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<PriceUpdater />} />
          <Route path="/price-updater" element={<PriceUpdater />} />
          <Route path="/converter" element={<SupplierConverter />} />
        </Routes>
      </main>
    </Router>
  );
}

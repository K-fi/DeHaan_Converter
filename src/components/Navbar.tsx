import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">De Haan Converter</div>
      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          Price Updater
        </NavLink>
        <NavLink
          to="/converter"
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          Supplier Converter
        </NavLink>
      </div>
    </nav>
  );
}

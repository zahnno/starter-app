import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Menu, X, LogIn, LogOut, User, Sun, Moon } from "react-feather";
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Cookies from "universal-cookie";

// Here, we display our Navbar
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const cookies = new Cookies();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    cookies.remove('token', {path: "/"});
    window.location.href = '/';
  };

  const handleProfileClick = () => {
    closeMenu();
    navigate('/settings');
  };

  return (
    <>
      <button className="hamburger-button" onClick={toggleMenu}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`overlay ${isOpen ? 'visible' : ''}`} onClick={closeMenu}></div>

      <nav className={`side-nav ${isOpen ? 'open' : ''}`}>
        <div className="nav-section">Main</div>
        <NavLink className="nav-link" to="/" onClick={closeMenu}>
          <Home />
          <span>Home</span>
        </NavLink>
        <div className="nav-section">Settings</div>
        <button className="nav-link theme-toggle" onClick={toggleTheme}>
          {isDarkMode ? <Sun /> : <Moon />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <div className="nav-section">Account</div>
        {user ? (
          <>
            <div className="user-info clickable" onClick={handleProfileClick}>
              <div className="user-info-main">
                <div className="user-avatar">
                  {user.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.username} 
                      className="user-avatar-img"
                    />
                  ) : (
                    <User size={24} strokeWidth={1.5} />
                  )}
                </div>
                <div styles={{maxWidth: '105px'}}>
                  <div className="user-name">{user.username || 'User'}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
            </div>
            <button className="nav-link logout-button" onClick={handleLogout}>
              <LogOut />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <NavLink className="nav-link" to="/login" onClick={closeMenu}>
            <LogIn />
            <span>Sign In</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}
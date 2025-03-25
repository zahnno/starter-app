import React from "react";
import { NavLink} from "react-router-dom";
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`app-header ${isDarkMode ? 'dark' : 'light'}`}>
      <NavLink className="nav-header-title" to="/">
        <h1>App Name</h1>
      </NavLink>
    </div>
  );
}
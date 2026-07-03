import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import Dock from './Dock.js';

const h = React.createElement;

// Enhanced mobile navigation items with better labels and accessibility
const items = [
  { 
    icon: h('i', { className: 'fas fa-house', 'aria-hidden': 'true' }), 
    label: 'Home', 
    onClick: () => window.S?.tab('home'),
    className: 'dock-nav-home'
  },
  { 
    icon: h('i', { className: 'fas fa-chart-line', 'aria-hidden': 'true' }), 
    label: 'Trending', 
    onClick: () => window.S?.tab('trending'),
    className: 'dock-nav-trending'
  },
  { 
    icon: h('i', { className: 'fas fa-heart', 'aria-hidden': 'true' }), 
    label: 'Liked Songs', 
    onClick: () => window.S?.tab('liked'),
    className: 'dock-nav-liked'
  },
  { 
    icon: h('i', { className: 'fas fa-list', 'aria-hidden': 'true' }), 
    label: 'Playlists', 
    onClick: () => window.S?.tab('playlist'),
    className: 'dock-nav-playlist'
  },
  { 
    icon: h('i', { className: 'fas fa-file-import', 'aria-hidden': 'true' }), 
    label: 'Imported Music', 
    onClick: () => window.S?.tab('imported'),
    className: 'dock-nav-imported'
  },
];

// Enhanced spring configuration optimized for different device types
const getOptimizedDockConfig = () => {
  const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
  
  return {
    items,
    panelHeight: isMobile ? 68 : 72,
    baseItemSize: isMobile ? 52 : 56,
    magnification: isMobile ? 68 : 74,
    distance: isMobile ? 160 : 180,
    spring: {
      mass: isMobile ? 0.05 : 0.1,
      stiffness: isMobile ? 300 : 150,
      damping: isMobile ? 20 : 12,
      restDelta: 0.001,
      restSpeed: 0.01
    }
  };
};

const container = document.getElementById('dockMount');
if (container) {
  const root = createRoot(container);
  const config = getOptimizedDockConfig();
  
  // Add performance optimizations for mobile devices
  if ('ontouchstart' in window) {
    // Optimize touch event handling
    container.style.touchAction = 'manipulation';
    container.style.webkitTouchCallout = 'none';
    container.style.webkitUserSelect = 'none';
  }
  
  root.render(h(Dock, config));
  
}

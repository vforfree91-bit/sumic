import React, { Children, cloneElement, useEffect, useMemo, useRef, useState, useCallback } from 'https://esm.sh/react@18.2.0';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, useAnimation, useMotionTemplate } from 'https://esm.sh/framer-motion@10.16.12';

const h = React.createElement;

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize, label, isMobile = false }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);
  const controls = useAnimation();
  const [isPressed, setIsPressed] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Enhanced spring configuration optimized for 60 FPS mobile performance
  const mobileSpring = useMemo(() => ({
    type: "spring",
    stiffness: isMobile ? 400 : 150,      // Increased for snappier mobile response
    damping: isMobile ? 25 : 12,          // Higher damping for stability on touch
    mass: isMobile ? 0.03 : 0.1,          // Lower mass for faster animations
    velocity: isMobile ? 0 : 1,           // Controlled initial velocity
    bounce: isMobile ? 0.15 : 0.25        // Reduced bounce for smoother mobile feel
  }), [isMobile]);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });

  // Enhanced magnification with improved easing and mobile optimization
  const magnificationRange = isMobile ? 
    [-distance * 1.5, -distance * 0.8, -distance * 0.3, 0, distance * 0.3, distance * 0.8, distance * 1.5] :
    [-distance * 1.2, -distance * 0.6, 0, distance * 0.6, distance * 1.2];
  
  const magnificationOutput = isMobile ?
    [baseItemSize, baseItemSize * 1.02, baseItemSize * 1.08, magnification * 1.15, baseItemSize * 1.08, baseItemSize * 1.02, baseItemSize] :
    [baseItemSize, baseItemSize * 1.05, magnification * 1.1, baseItemSize * 1.05, baseItemSize];

  // Use hardware-accelerated transforms with proper easing
  const targetSize = useTransform(mouseDistance, magnificationRange, magnificationOutput, {
    ease: isMobile ? [0.25, 0.46, 0.45, 0.94] : [0.4, 0.0, 0.2, 1] // Custom easing for smoother curves
  });
  const size = useSpring(targetSize, mobileSpring);

  // Enhanced touch feedback with haptic-style animations optimized for 60 FPS
  const scale = useMotionValue(1);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const shadowBlur = useMotionValue(10);
  const glowOpacity = useMotionValue(0);
  const brightness = useMotionValue(1);
  
  // Performance-optimized springs for smooth 60 FPS animations
  const fastSpring = { type: "spring", stiffness: 600, damping: 30, mass: 0.02 };
  const smoothSpring = { type: "spring", stiffness: 300, damping: 25, mass: 0.05 };

  // Enhanced haptic-style feedback with improved visual effects
  const triggerHapticFeedback = useCallback(() => {
    if (navigator.vibrate && isMobile) {
      navigator.vibrate([3, 2, 3]); // Subtle double-tap haptic pattern
    }
    
    // Premium visual haptic effect with staggered animations
    controls.start({
      scale: [1, 0.94, 1.12, 1.02, 1],
      rotateX: [0, -3, 4, -1, 0],
      rotateY: [0, 2, -3, 1, 0],
      brightness: [1, 1.2, 0.9, 1.1, 1],
      transition: { 
        duration: 0.22,
        ease: [0.175, 0.885, 0.32, 1.375], // Enhanced bounce easing
        times: [0, 0.25, 0.5, 0.75, 1]     // Precise keyframe timing
      }
    });
  }, [controls, isMobile]);

  // Touch event handlers with enhanced feedback and performance optimization
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    setIsPressed(true);
    setIsActive(true);
    
    // Immediate feedback for responsive feel
    scale.set(0.90);
    brightness.set(1.3);
    glowOpacity.set(0.8);
    shadowBlur.set(25);
    
    if (isMobile) {
      triggerHapticFeedback();
      
      // Add subtle 3D tilt effect based on touch position
      const rect = ref.current?.getBoundingClientRect();
      if (rect && e.touches[0]) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.touches[0].clientX - centerX) / (rect.width / 2);
        const deltaY = (e.touches[0].clientY - centerY) / (rect.height / 2);
        
        rotateX.set(deltaY * -8); // Subtle 3D tilt
        rotateY.set(deltaX * 8);
      }
    }
  }, [scale, brightness, glowOpacity, shadowBlur, rotateX, rotateY, isMobile, triggerHapticFeedback]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    setIsPressed(false);
    
    // Smooth spring-back animation
    scale.set(1);
    brightness.set(1);
    glowOpacity.set(0);
    shadowBlur.set(10);
    rotateX.set(0);
    rotateY.set(0);
    
    // Delayed active state reset for better visual feedback
    setTimeout(() => setIsActive(false), 180);
    
    if (onClick) {
      // Small delay for visual feedback completion
      setTimeout(onClick, 50);
    }
  }, [scale, brightness, glowOpacity, shadowBlur, rotateX, rotateY, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      isHovered.set(1);
      glowOpacity.set(0.4);
      brightness.set(1.1);
    }
  }, [isHovered, glowOpacity, brightness, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      isHovered.set(0);
      glowOpacity.set(0);
      brightness.set(1);
    }
  }, [isHovered, glowOpacity, brightness, isMobile]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHapticFeedback();
      onClick?.();
    }
  }, [onClick, triggerHapticFeedback]);

  // Enhanced shadow with dynamic glow and brightness effects
  const boxShadowTemplate = useMotionTemplate`
    0 ${shadowBlur}px ${shadowBlur.get() * 2.2}px rgba(0, 0, 0, 0.25),
    0 0 ${shadowBlur}px rgba(29, 185, 84, ${glowOpacity}),
    inset 0 1px 1px rgba(255, 255, 255, ${brightness.get() * 0.1})
  `;
  
  // Hardware-accelerated filter for brightness
  const filterTemplate = useMotionTemplate`brightness(${brightness})`;

  return h(
    motion.div,
    {
      ref,
      style: { 
        width: size, 
        height: size,
        scale,
        rotateX,
        rotateY,
        boxShadow: boxShadowTemplate,
        filter: filterTemplate,
        willChange: isMobile ? 'transform, filter, box-shadow' : 'transform' // Performance hint
      },
      animate: controls,
      onHoverStart: handleMouseEnter,
      onHoverEnd: handleMouseLeave,
      onFocus: () => !isMobile && isHovered.set(1),
      onBlur: () => !isMobile && isHovered.set(0),
      onTouchStart: isMobile ? handleTouchStart : undefined,
      onTouchEnd: isMobile ? handleTouchEnd : undefined,
      onTouchCancel: isMobile ? handleTouchEnd : undefined, // Handle touch cancellation
      onClick: !isMobile ? onClick : undefined,
      className: `dock-item ${className} ${isPressed ? 'pressed' : ''} ${isActive ? 'active' : ''}`,
      tabIndex: 0,
      role: 'button',
      'aria-label': label,
      onKeyDown: handleKeyDown,
      whileHover: !isMobile ? { 
        scale: 1.08,
        transition: { ...fastSpring, duration: 0.12 }
      } : undefined,
      whileTap: !isMobile ? { 
        scale: 0.96,
        transition: { ...fastSpring, duration: 0.08 }
      } : undefined,
      // Optimize layout for smooth animations
      layout: false, // Disable layout animations for performance
      transformTemplate: ({ scale, rotateX, rotateY }) => 
        `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)` // Force GPU layer
    },
    Children.map(children, child => cloneElement(child, { 
      isHovered, 
      isPressed, 
      isActive, 
      isMobile 
    }))
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return h(
    AnimatePresence,
    null,
    isVisible && h(
      motion.div,
      {
        initial: { opacity: 0, y: 0 },
        animate: { opacity: 1, y: -10 },
        exit: { opacity: 0, y: 0 },
        transition: { duration: 0.2 },
        className: `dock-label ${className}`,
        role: 'tooltip',
        style: { x: '-50%' },
      },
      children
    )
  );
}

function DockIcon({ children, className = '' }) {
  return h('div', { className: `dock-icon ${className}` }, children);
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  
  // Enhanced mobile detection with multiple methods for accuracy
  const isMobile = useMemo(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenSize = window.innerWidth <= 768;
    const isMobileUA = /android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent);
    
    return touchSupport && (screenSize || isMobileUA);
  }, []);

  // Performance-optimized spring configuration based on device
  const optimizedSpring = useMemo(() => ({
    ...spring,
    stiffness: isMobile ? 300 : spring.stiffness,
    damping: isMobile ? 20 : spring.damping,
    mass: isMobile ? 0.05 : spring.mass,
    restDelta: 0.001, // Fine-tune for 60 FPS
    restSpeed: 0.01
  }), [spring, isMobile]);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, optimizedSpring);
  
  // Performance optimization: throttle mouse move events on mobile
  const handleMouseMove = useCallback(
    isMobile ? 
      // Throttled version for mobile to maintain 60 FPS
      throttle(({ pageX }) => {
        isHovered.set(1);
        mouseX.set(pageX);
      }, 16) : // ~60 FPS throttling
      ({ pageX }) => {
        isHovered.set(1);
        mouseX.set(pageX);
      },
    [isHovered, mouseX, isMobile]
  );

  const handleMouseLeave = useCallback(() => {
    isHovered.set(0);
    mouseX.set(Infinity);
  }, [isHovered, mouseX]);

  return h(
    motion.div,
    { 
      style: { 
        height, 
        scrollbarWidth: 'none',
        // Force GPU compositing for smooth animations
        willChange: 'height',
        backfaceVisibility: 'hidden',
        perspective: '1000px'
      }, 
      className: 'dock-outer'
    },
    h(
      motion.div,
      {
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
        className: `dock-panel ${className} ${isMobile ? 'mobile' : 'desktop'}`,
        style: { 
          height: panelHeight,
          // Hardware acceleration optimizations
          transform: 'translateZ(0)', // Force GPU layer
          willChange: 'transform'
        },
        role: 'toolbar',
        'aria-label': 'Application dock',
      },
      items.map((item, index) =>
        h(
          DockItem,
          {
            key: `dock-item-${index}`, // Stable keys for performance
            onClick: item.onClick,
            className: item.className,
            mouseX,
            spring: optimizedSpring,
            distance,
            magnification,
            baseItemSize,
            label: item.label,
            isMobile
          },
          h(DockIcon, null, item.icon),
          h(DockLabel, null, item.label)
        )
      )
    )
  );
}

// Throttle utility for performance optimization
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

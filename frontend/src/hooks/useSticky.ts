import { useState, useEffect, useRef, RefObject } from 'react';

interface UseStickyOptions {
  offsetTop?: number;
  threshold?: number;
}

interface UseStickyReturn {
  isSticky: boolean;
  elementRef: RefObject<HTMLDivElement>;
  containerRef: RefObject<HTMLDivElement>;
  elementHeight: number;
}

export const useSticky = (options: UseStickyOptions = {}): UseStickyReturn => {
  const { offsetTop = 0, threshold = 0 } = options;
  const [isSticky, setIsSticky] = useState(false);
  const [elementHeight, setElementHeight] = useState(0);
  const [originalOffset, setOriginalOffset] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current || !containerRef.current) return;

      const elementRect = elementRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Capturar altura do elemento apenas uma vez
      if (elementHeight === 0) {
        setElementHeight(elementRef.current.offsetHeight);
      }

      // Capturar posição original do elemento
      if (originalOffset === 0 && !isSticky) {
        setOriginalOffset(elementRef.current.offsetTop);
      }
      
      // Condição para ativar sticky: elemento saiu da tela pelo topo
      const shouldActivateSticky = !isSticky && 
                                  elementRect.top <= offsetTop;
      
      // Condição para desativar sticky: voltamos à posição original do elemento
      const shouldDeactivateSticky = isSticky && 
                                    (window.scrollY <= originalOffset - threshold);
      
      if (shouldActivateSticky) {
        setIsSticky(true);
      } else if (shouldDeactivateSticky) {
        setIsSticky(false);
      }
    };

    // Throttle para melhor performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    // Verificar estado inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [offsetTop, threshold, isSticky, elementHeight, originalOffset]);

  return {
    isSticky,
    elementRef,
    containerRef,
    elementHeight
  };
}; 
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type RoutePath =
  | '/'
  | '/login'
  | '/register'
  | '/onboarding'
  | '/dashboard'
  | '/resume'
  | '/jobs'
  | '/skills'
  | '/learning'
  | '/interview'
  | '/tracker'
  | '/passport'
  | '/career-health'
  | '/outcomes'
  | '/network'
  | '/settings'
  | string;

interface RouterContextType {
  pathname: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({
  pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
  navigate: () => {},
  params: {},
});

export const useRouter = () => useContext(RouterContext);
export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};
export const usePathname = () => {
  const { pathname } = useContext(RouterContext);
  return pathname;
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/'
  );

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (options?.replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setPathname(to);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RouterContext.Provider value={{ pathname, navigate, params: {} }}>
      {children}
    </RouterContext.Provider>
  );
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, replace, children, className, onClick, ...props }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(to, { replace });
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
};

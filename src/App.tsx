import { useState, useEffect } from "react";
import { AppLayout } from "./components/layout";
import { debugResourceManager } from "./lib/debugResourceManager";
import routes from "./routes";

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // 简单的路由匹配
  const currentRoute = routes.find(route => route.path === currentPath) || routes[0];
  const CurrentComponent = currentRoute.component;

  // 监听浏览器前进后退
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <AppLayout>
      <CurrentComponent />
    </AppLayout>
  );
}

export default App;

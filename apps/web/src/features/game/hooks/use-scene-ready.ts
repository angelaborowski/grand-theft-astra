import { useEffect, useState } from "react";

/** Allow one complete artwork cycle before exposing the prepared scene and its controls. */
export function useSceneReady() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  return { ready: assetsReady && minimumElapsed, setAssetsReady };
}

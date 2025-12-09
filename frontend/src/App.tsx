import "./App.css";
import MagicBento from "./components/MagicBento";
import { useEffect, useState } from "react";

function App() {
  const [ParticlesComponent, setParticlesComponent] = useState<null | React.ComponentType<any>>(null);

  useEffect(() => {
    let mounted = true;
    // Dynamically import Particles to avoid hard-failing in environments without WebGL
    import("./components/Particles")
      .then((mod) => {
        if (mounted) setParticlesComponent(() => mod.default ?? null);
      })
      .catch((err) => {
        // If import fails, log and continue — app still renders MagicBento
        // eslint-disable-next-line no-console
        console.warn("Particles failed to load:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app">
      {ParticlesComponent ? (
        <ParticlesComponent
          particleColors={["#ffffff", "#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      ) : null}

      <main className="app-main">
        <MagicBento />
      </main>
    </div>
  );
}

export default App;



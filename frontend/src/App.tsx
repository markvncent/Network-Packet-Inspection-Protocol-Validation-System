import "./App.css";
import MagicBento from "./components/MagicBento";
import Particles from "./components/Particles";

function App() {
  return (
    <div className="app">
      <Particles
        particleColors={['#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      <main className="app-main">
        <MagicBento />
      </main>
    </div>
  );
}

export default App;


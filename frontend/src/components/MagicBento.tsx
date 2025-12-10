import { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import PacketGeneratorModal from "./PacketGenerator";
import HexView from './HexView';
import StackVisualizer from './StackVisualizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PDAController } from '../utils/pdaController';
import { PDATrace, PDAState } from '../utils/pdaEngine';
import "./MagicBento.css";

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "132, 0, 255";
const MOBILE_BREAKPOINT = 768;

type CardDefinition = {
  color: string;
  title: string;
  description: string;
  label: string;
  layoutClass: string;
  isPlaceholder?: boolean;
  isHeader?: boolean;
  placeholderLabel?: string;
};

const cardData: CardDefinition[] = [
  {
    color: "#060010",
    title: "",
    description: "",
    label: "Header",
    layoutClass: "magic-bento-card--header magic-bento-card--placeholder",
    isHeader: true
  },
  {
    color: "#060010",
    title: "Upload or Add Packet",
    description: "Drop .pcap / hex payloads or connect live capture.",
    label: "Packet Intake",
    layoutClass: "magic-bento-card--upload"
  },
  {
    color: "#060010",
    title: "Initiate DFA + PDA Validation",
    description: "Trigger DFA-based malicious scan and HTTP PDA verification.",
    label: "Inspection Controls",
    layoutClass: "magic-bento-card--controls"
  },
  {
    color: "#060010",
    title: "Visualization & Diagram",
    description: "Render automata transitions, anomaly overlays, and protocol stacks.",
    label: "Result View",
    layoutClass: "magic-bento-card--visualization"
  }
];

const createParticleElement = (x: number, y: number, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

type ParticleCardProps = {
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
};

const ParticleCard = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false
}: ParticleCardProps) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: "power2.out",
          transformPerspective: 1000
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("click", handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("click", handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
};

type GlobalSpotlightProps = {
  gridRef: React.RefObject<HTMLDivElement>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
};

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}: GlobalSpotlightProps) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      const cards = gridRef.current.querySelectorAll<HTMLElement>(".magic-bento-card");
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);
        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out"
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gridRef.current?.querySelectorAll(".magic-bento-card").forEach(card => {
        (card as HTMLElement).style.setProperty("--glow-intensity", "0");
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

type BentoCardGridProps = {
  children: React.ReactNode;
  gridRef: React.RefObject<HTMLDivElement>;
};

const BentoCardGrid = ({ children, gridRef }: BentoCardGridProps) => (
  <div className="card-grid bento-section" ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

type MagicBentoProps = {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
};

const MagicBento = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true
}: MagicBentoProps) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [dfaStatus, setDfaStatus] = useState<'idle' | 'inspecting' | 'approved' | 'malicious'>('idle');
  const [pdaStatus, setPdaStatus] = useState<'idle' | 'inspecting' | 'approved' | 'malicious'>('idle');
  const [dfaActiveState, setDfaActiveState] = useState<string | undefined>(undefined);
  const [dfaHighlightedPath, setDfaHighlightedPath] = useState<string[]>([]);
  const [dfaAnimatedEdges, setDfaAnimatedEdges] = useState<Array<{ from: string; to: string }>>([]);

  const [trieHighlightedNode, setTrieHighlightedNode] = useState<number | undefined>(undefined);
  const [trieAnimatedEdges, setTrieAnimatedEdges] = useState<Array<{ from: number; to: number }>>([]);

  const simTimersRef = useRef<number[]>([]);
  const [activeTrieData, setActiveTrieData] = useState<any | null>(null);
  const [highlightedPositions, setHighlightedPositions] = useState<number[]>([]);

  // Payload / parsing state
  const [payloadHex, setPayloadHex] = useState<string>('');
  const [payloadAscii, setPayloadAscii] = useState<string>('');
  const [payloadBytes, setPayloadBytes] = useState<Uint8Array | null>(null);
  const [matchedPatterns, setMatchedPatterns] = useState<Array<{ pattern: string; position: number }>>([]);
  const [packetInfo, setPacketInfo] = useState<any>(null);
  const [pdaTrace, setPdaTrace] = useState<PDATrace[]>([]);
  const [pdaController] = useState(() => new PDAController());
  const [pdaCurrentStep, setPdaCurrentStep] = useState<number>(0);
  const [pdaErrorPosition, setPdaErrorPosition] = useState<number | null>(null);
  const [pdaStack, setPdaStack] = useState<string[]>([]);
  const [pdaIsAnimating, setPdaIsAnimating] = useState<boolean>(false);
  const [pdaHttpPayloadOffset, setPdaHttpPayloadOffset] = useState<number>(0);

  const renderPdaTrace = (trace: PDATrace[]) => {
    if (!trace || trace.length === 0) {
      return (
        <div style={{ color: '#a8adc5', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
          PDA trace will appear here after validation.
        </div>
      );
    }

    // Show up to current step + some context, or last 120 steps if not animating
    const maxSteps = 120;
    const displayTrace = pdaIsAnimating 
      ? trace.slice(0, Math.min(pdaCurrentStep + 1, trace.length))
      : trace.slice(-maxSteps);
    const startIdx = pdaIsAnimating ? 0 : Math.max(0, trace.length - maxSteps);

    const badgeStyle = (state: string) => {
      if (state === 'ACCEPT') return { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' };
      if (state === 'ERROR') return { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' };
      return { background: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: '1px solid rgba(168,85,247,0.35)' };
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5f5', fontSize: '0.9rem', fontWeight: 600 }}>
          <span>
            PDA Trace {pdaIsAnimating ? `(Step ${pdaCurrentStep + 1}/${trace.length})` : `(${displayTrace.length} of ${trace.length} steps)`}
          </span>
          <span style={{ color: '#a8adc5', fontSize: '0.8rem' }}>State / Input / Action</span>
        </div>
        <div style={{ maxHeight: '320px', overflowY: 'auto', background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '0.5rem' }}>
          {displayTrace.map((t, idx) => {
            const actualIdx = pdaIsAnimating ? idx : startIdx + idx;
            const isError = t.state === 'ERROR' || t.action.toLowerCase().includes('reject') || t.action.toLowerCase().includes('invalid');
            const isCurrent = pdaIsAnimating && actualIdx === pdaCurrentStep;
            return (
              <div
                key={`${actualIdx}-${t.state}-${t.input}-${t.action}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 110px 1fr',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  borderBottom: idx === displayTrace.length - 1 ? 'none' : '1px solid rgba(148,163,184,0.1)',
                  background: isCurrent 
                    ? 'rgba(59,130,246,0.2)' 
                    : isError 
                    ? 'rgba(239,68,68,0.08)' 
                    : 'transparent',
                  borderLeft: isCurrent ? '3px solid #3b82f6' : isError ? '3px solid #ef4444' : 'none'
                }}
              >
                <span style={{ color: '#a8adc5', fontSize: '0.8rem' }}>#{actualIdx + 1}</span>
                <span style={{ ...badgeStyle(t.state), padding: '0.2rem 0.4rem', borderRadius: '0.4rem', fontSize: '0.75rem', textAlign: 'center' }}>
                  {t.state}
                </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#cbd5f5' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Input:</span> {t.input === '' || t.input === 'ε' ? 'ε' : JSON.stringify(t.input)}
                    {t.position !== undefined && (
                      <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.75rem' }}>@ pos {t.position}</span>
                    )}
                  </div>
                  <div style={{ color: isError ? '#ef4444' : '#cbd5f5' }}>
                    {t.action}
                    {isError && t.position !== undefined && (
                      <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        [ERROR at position {t.position}]
                      </span>
                    )}
                  </div>
                  {t.stackTop && (
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      Stack top: <span style={{ fontFamily: 'monospace', color: '#c4b5fd' }}>{t.stackTop}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Hex view sizing (compute after payload state is available)
  const bytesPerLine = 16;
  const maxHexViewHeight = 400; // px
  const minHexViewHeight = 80; // px
  const payloadByteCount = payloadHex ? Math.ceil(payloadHex.length / 2) : (payloadBytes ? payloadBytes.length : 0);
  const hexLineCount = Math.max(1, Math.ceil(payloadByteCount / bytesPerLine));
  const computedHexHeight = Math.min(maxHexViewHeight, Math.max(minHexViewHeight, 24 + hexLineCount * 32));

  // Basic pattern set — replaceable with a fetch to /patterns
  const maliciousPatterns = [
    'virus', 'malware', 'exploit', 'ransom', 'trojan', 'backdoor', 'rootkit',
    '<script', '</script', '<iframe', 'eval', 'base64',
    "' OR 1", 'UNION SELECT', 'DROP TABLE',
    'login', 'verify', 'password', 'account',
    ';r', '&&w', '|b'
  ];

  // Build a simple Aho-Corasick automaton (trie with fail links)
  function buildAC(patterns: string[]) {
    const nodes: any[] = [{ edges: new Map<string, number>(), fail: 0, output: [] }];

    for (const pat of patterns) {
      let node = 0;
      for (const ch of pat) {
        const key = ch;
        const nxt = nodes[node].edges.get(key);
        if (nxt === undefined) {
          nodes.push({ edges: new Map<string, number>(), fail: 0, output: [] });
          const newIdx = nodes.length - 1;
          nodes[node].edges.set(key, newIdx);
          node = newIdx;
        } else {
          node = nxt;
        }
      }
      nodes[node].output.push(pat);
    }

    // failure links
    const q: number[] = [];
    for (const [k, v] of nodes[0].edges) {
      nodes[v].fail = 0;
      q.push(v);
    }
    while (q.length) {
      const r = q.shift()!;
      for (const [a, s] of nodes[r].edges) {
        q.push(s);
        let state = nodes[r].fail;
        while (state !== 0 && !nodes[state].edges.has(a)) {
          state = nodes[state].fail;
        }
        if (nodes[state].edges.has(a)) {
          nodes[s].fail = nodes[state].edges.get(a)!;
        } else {
          nodes[s].fail = 0;
        }
        nodes[s].output = nodes[s].output.concat(nodes[nodes[s].fail].output || []);
      }
    }

    const trieNodes = nodes.map((n, idx) => ({ id: idx, fail: n.fail ?? 0, output: n.output || [] }));
    const trieEdges: any[] = [];
    nodes.forEach((n, idx) => {
      for (const [k, v] of n.edges) trieEdges.push({ from: idx, input: k, to: v });
    });
    return { nodes: trieNodes, edges: trieEdges, rawNodes: nodes };
  }

  async function parseFile(file: File) {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.hex') || name.endsWith('.txt')) {
        const text = await file.text();
        const hex = text.replace(/[^0-9a-fA-F]/g, '');
        const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map(h => parseInt(h, 16)) || []);
        // Preserve HTTP control characters
        const ascii = Array.from(bytes).map(b => {
          if (b >= 32 && b <= 126) return String.fromCharCode(b);
          if (b === 13) return '\r'; // CR
          if (b === 10) return '\n'; // LF
          if (b === 9) return '\t'; // TAB
          return '.'; // Other non-printable
        }).join('');
        setPayloadHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
        setPayloadAscii(ascii);
        setPayloadBytes(bytes);
        setPacketInfo({ filename: file.name, length: bytes.length, protocol: 'raw' });
        return;
      }

      if (name.endsWith('.pcap') || name.endsWith('.pcapng')) {
        const ab = await file.arrayBuffer();
        const dv = new DataView(ab);
        // naive pcap: skip 24-byte global header, read first packet's incl_len
        if (dv.byteLength >= 24 + 16) {
          const offset = 24;
          const inclLen = dv.getUint32(offset + 8, true);
          const pktStart = offset + 16;
          const pktEnd = Math.min(pktStart + inclLen, dv.byteLength);
          const pkt = new Uint8Array(ab.slice(pktStart, pktEnd));

          let payloadOffset = 0;
          if (pkt.length >= 14) {
            const etherType = (pkt[12] << 8) | pkt[13];
            if (etherType === 0x0800 && pkt.length >= 14 + 20) {
              const ipHeaderStart = 14;
              const ihl = (pkt[ipHeaderStart] & 0x0f) * 4;
              const protocol = pkt[ipHeaderStart + 9];
              const srcIP = pkt.slice(ipHeaderStart + 12, ipHeaderStart + 16).join('.');
              const dstIP = pkt.slice(ipHeaderStart + 16, ipHeaderStart + 20).join('.');
              if (protocol === 6 && pkt.length >= 14 + ihl + 20) {
                const tcpStart = 14 + ihl;
                const dataOffset = ((pkt[tcpStart + 12] & 0xf0) >> 4) * 4;
                payloadOffset = 14 + ihl + dataOffset;
                setPacketInfo({ srcIP, dstIP, protocol: 'TCP', length: pkt.length });
              } else if (protocol === 17) {
                const udpStart = 14 + ihl;
                payloadOffset = udpStart + 8;
                setPacketInfo({ srcIP, dstIP, protocol: 'UDP', length: pkt.length });
              } else {
                payloadOffset = 14 + ihl;
                setPacketInfo({ srcIP, dstIP, protocol: `IP/${protocol}`, length: pkt.length });
              }
            } else {
              payloadOffset = 0;
              setPacketInfo({ filename: file.name, length: pkt.length, protocol: 'unknown' });
            }
          }

          const payload = pkt.slice(payloadOffset);
          setPayloadBytes(payload);
          setPayloadHex(Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(''));
          // Convert bytes to ASCII, preserving HTTP control characters (\r, \n, \t)
          const ascii = Array.from(payload).map(b => {
            if (b >= 32 && b <= 126) return String.fromCharCode(b);
            if (b === 13) return '\r'; // CR
            if (b === 10) return '\n'; // LF
            if (b === 9) return '\t'; // TAB
            return '.'; // Other non-printable
          }).join('');
          setPayloadAscii(ascii);
          return;
        }
      }

      // fallback: text
      const text = await file.text();
      const enc = new TextEncoder();
      const bytes = enc.encode(text);
      setPayloadBytes(bytes);
      setPayloadHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
      // Preserve HTTP control characters for text files too
      const ascii = Array.from(bytes).map(b => {
        if (b >= 32 && b <= 126) return String.fromCharCode(b);
        if (b === 13) return '\r'; // CR
        if (b === 10) return '\n'; // LF
        if (b === 9) return '\t'; // TAB
        return '.'; // Other non-printable
      }).join('');
      setPayloadAscii(ascii);
      setPacketInfo({ filename: file.name, length: bytes.length, protocol: 'text' });
    } catch (err) {
      console.warn('parseFile error', err);
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      console.log('File uploaded:', file.name, file.size, 'bytes');
      parseFile(file).catch(err => console.warn('parse failed', err));
    }
  };

  const handleDfaInspection = () => {
    // Run AC-based traversal animation over the uploaded payload
    setDfaStatus('inspecting');
    clearSimulationTimers();
    setMatchedPatterns([]);
    setHighlightedPositions([]);
    runACSimulation();
  };

  function runACSimulation() {
    if (!payloadBytes || payloadBytes.length === 0) {
      setDfaStatus('approved');
      return;
    }

    // build lowercase patterns for case-insensitive matching
    const pats = maliciousPatterns.map(p => p.toLowerCase());
    const ac = buildAC(pats);
    setActiveTrieData({ nodes: ac.nodes, edges: ac.edges });

    const raw = ac.rawNodes; // array with edges Map, fail, output
    let state = 0;
    let i = 0;
    const matches: Array<{ pattern: string; position: number }> = [];

    const intervalId = window.setInterval(() => {
      if (i >= payloadBytes.length) {
        window.clearInterval(intervalId);
        if (matches.length > 0) {
          setDfaStatus('malicious');
          setMatchedPatterns(matches);
        } else {
          setDfaStatus('approved');
        }
        return;
      }

      const b = payloadBytes[i];
      const ch = String.fromCharCode(b).toLowerCase();
      let prev = state;

      // follow transitions with fail links
      while (state !== 0 && !raw[state].edges.has(ch)) {
        state = raw[state].fail;
      }
      if (raw[state].edges.has(ch)) state = raw[state].edges.get(ch);

      // highlight node and edge in visualizer
      setTrieHighlightedNode(state);
      setTrieAnimatedEdges([{ from: prev, to: state }]);

      // highlight current byte
      setHighlightedPositions([i]);

      // check outputs
      if (raw[state].output && raw[state].output.length > 0) {
        for (const pat of raw[state].output) {
          const pos = i - pat.length + 1;
          matches.push({ pattern: pat, position: Math.max(0, pos) });
        }
        // stop on first match and mark malicious
        setMatchedPatterns(matches);
        setDfaStatus('malicious');
        window.clearInterval(intervalId);
        return;
      }

      i += 1;
    }, 120);

    simTimersRef.current.push(intervalId);
  }

  function clearSimulationTimers() {
    simTimersRef.current.forEach((id) => window.clearInterval(id));
    simTimersRef.current = [];
  }

  function runInspectionSimulation(dfaData: any, trieData: any, forceApproved = false) {
    // Reset visual states
    setDfaActiveState(dfaData.start);
    setDfaHighlightedPath([dfaData.start]);
    setDfaAnimatedEdges([]);
    setTrieHighlightedNode(undefined);
    setTrieAnimatedEdges([]);

    // Simple DFA traversal simulation: step through transitions in order
    let step = 0;
    const steps = dfaData.transitions.length;

    const intervalId = window.setInterval(() => {
      const t = dfaData.transitions[step];
      if (!t) return;

      // highlight edge and target state
      setDfaAnimatedEdges([{ from: t.from, to: t.to }]);
      setDfaActiveState(t.to);
      setDfaHighlightedPath((prev) => [...prev, t.to]);

      // mimic trie traversal: map transition index to node ids if available
      const trieEdge = trieData.edges[step];
      if (trieEdge) {
        setTrieAnimatedEdges([{ from: trieEdge.from, to: trieEdge.to }]);
        setTrieHighlightedNode(trieEdge.to);
      }

      step += 1;
      if (step >= steps) {
        window.clearInterval(intervalId);
        // final decision
        const finalState = dfaData.transitions[steps - 1]?.to || dfaData.start;
        const isAccepting = dfaData.accept.includes(finalState);
        const result = forceApproved ? 'approved' : isAccepting ? 'malicious' : 'approved';
        // if accepting means match found (malicious) for our demo DFA
        setTimeout(() => setDfaStatus(result as any), 300);
      }
    }, 700);

    simTimersRef.current.push(intervalId);
  }

  const handlePdaValidation = () => {
    setPdaStatus('inspecting');
    setPdaTrace([]);
    setPdaCurrentStep(0);
    setPdaErrorPosition(null);
    setPdaStack(['$']);
    setPdaIsAnimating(true);
    clearSimulationTimers();

    // Extract HTTP payload from packet
    // Try to find HTTP content in the ASCII payload
    let httpPayload = '';
    
    if (payloadAscii) {
      // Look for HTTP request line pattern - must start with uppercase method
      // Match: METHOD SPACE URI SPACE HTTP/VERSION CRLF
      const httpMatch = payloadAscii.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s+[^\s]+\s+HTTP\/[\d.]+\r\n/i);
      
      if (httpMatch) {
        // Found at start - use from match index
        const startIdx = payloadAscii.indexOf(httpMatch[0]);
        httpPayload = payloadAscii.substring(startIdx);
      } else {
        // Try to find HTTP method anywhere in the payload
        const methodMatch = payloadAscii.match(/(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s+[^\s]+\s+HTTP\/[\d.]+\r\n/i);
        if (methodMatch && methodMatch.index !== undefined) {
          httpPayload = payloadAscii.substring(methodMatch.index);
        } else {
          // Last resort: check if entire payload looks like HTTP
          if (/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)/i.test(payloadAscii.trim())) {
            httpPayload = payloadAscii.trim();
          }
        }
      }
      
      // Clean up: remove any leading non-printable characters or whitespace before HTTP method
      if (httpPayload) {
        // Find the first HTTP method character (uppercase letter)
        const methodStart = httpPayload.search(/[A-Z]/);
        if (methodStart > 0) {
          httpPayload = httpPayload.substring(methodStart);
        }
        
        // Ensure it starts with a valid HTTP method
        if (!/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s/.test(httpPayload)) {
          httpPayload = '';
        }
      }
      
      // If we have HTTP payload, extract the complete message
      if (httpPayload) {
        // Find end of headers (CRLF CRLF)
        const headerEnd = httpPayload.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const headersEnd = headerEnd + 4;
          const headers = httpPayload.substring(0, headersEnd);
          
          // Check for Content-Length header
          const contentLengthMatch = headers.match(/content-length:\s*(\d+)/i);
          if (contentLengthMatch) {
            const bodyLength = parseInt(contentLengthMatch[1], 10);
            if (bodyLength >= 0) {
              httpPayload = httpPayload.substring(0, headersEnd + bodyLength);
            } else {
              httpPayload = httpPayload.substring(0, headersEnd);
            }
          } else {
            // No Content-Length - take up to end of headers or next HTTP request
            const nextHttpMatch = httpPayload.substring(headersEnd).match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s/i);
            if (nextHttpMatch && nextHttpMatch.index !== undefined) {
              httpPayload = httpPayload.substring(0, headersEnd + nextHttpMatch.index);
            } else {
              // No next HTTP request, take everything up to end of headers
              httpPayload = httpPayload.substring(0, headersEnd);
            }
          }
        }
      }
    }

    if (!httpPayload || httpPayload.trim().length === 0) {
      // No HTTP content found
      setTimeout(() => {
        setPdaStatus('malicious');
        setPdaTrace([{
          state: 'ERROR' as any,
          input: '',
          stackTop: '',
          action: 'No HTTP content found in packet payload',
          position: 0
        }]);
        setPdaErrorPosition(0);
        setPdaIsAnimating(false);
      }, 500);
      return;
    }

    // Ensure payload starts with HTTP method (no leading whitespace)
    httpPayload = httpPayload.trimStart();
    
    // Verify it starts with a valid HTTP method
    if (!/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s/.test(httpPayload)) {
      setTimeout(() => {
        setPdaStatus('malicious');
        setPdaTrace([{
          state: 'ERROR' as any,
          input: '',
          stackTop: '',
          action: 'Invalid HTTP request format - does not start with valid method',
          position: 0
        }]);
        setPdaErrorPosition(0);
        setPdaIsAnimating(false);
      }, 500);
      return;
    }

    // Calculate offset of HTTP payload in the full payloadAscii
    const httpPayloadOffset = payloadAscii ? payloadAscii.indexOf(httpPayload) : 0;
    setPdaHttpPayloadOffset(httpPayloadOffset >= 0 ? httpPayloadOffset : 0);
    
    // Load and validate with PDA
    pdaController.loadPacket(httpPayload);
    
    // Run validation first to get full trace
    const isValid = pdaController.validate();
    const trace = pdaController.getAllTrace();
    
    // Find error position and map it to full payload
    const errorTrace = trace.find(t => t.state === 'ERROR' || t.action.toLowerCase().includes('reject') || t.action.toLowerCase().includes('invalid') || t.action.toLowerCase().includes('expected'));
    if (errorTrace && errorTrace.position !== undefined) {
      // Map position from HTTP payload to full payload
      const fullPosition = httpPayloadOffset >= 0 ? httpPayloadOffset + errorTrace.position : errorTrace.position;
      setPdaErrorPosition(fullPosition);
    }
    
    // Start step-by-step animation
    setPdaTrace(trace);
    // Initialize stack to empty - it will be built up during animation
    setPdaStack([]);
    runPdaSimulation(trace, isValid);
  };

  function runPdaSimulation(trace: PDATrace[], isValid: boolean) {
    let step = 0;
    // Initialize stack based on first trace entry
    const stack: string[] = [];
    
    const intervalId = window.setInterval(() => {
      if (step >= trace.length) {
        window.clearInterval(intervalId);
        setPdaIsAnimating(false);
        setPdaStatus(isValid ? 'approved' : 'malicious');
        return;
      }

      const currentTrace = trace[step];
      
      // Update stack based on action - parse new format from refactored engine
      // Actions look like: "push bottom marker (push $)" or "pop REQ_LINE marker - request line complete (pop REQ_LINE)"
      if (currentTrace.action.includes('(push')) {
        // Extract symbol from patterns like:
        // "push bottom marker (push $)"
        // "push HTTP marker (push HTTP)"
        // "push REQ_LINE marker - start request line parsing (push REQ_LINE)"
        let symbol = '';
        
        // First try to extract from "(push SYMBOL)" pattern at the end
        const pushMatch1 = currentTrace.action.match(/\(push\s+([A-Z_$]+)\)/);
        if (pushMatch1) {
          symbol = pushMatch1[1];
        } else {
          // Try to extract from "push SYMBOL marker" pattern
          const pushMatch2 = currentTrace.action.match(/push\s+([A-Z_$]+)\s+marker/);
          if (pushMatch2) {
            symbol = pushMatch2[1];
          } else {
            // Try to extract from action text directly
            const pushMatch3 = currentTrace.action.match(/push\s+([A-Z_$]+)/);
            if (pushMatch3) {
              symbol = pushMatch3[1];
            }
          }
        }
        
        if (symbol) {
          stack.push(symbol);
        }
      } else if (currentTrace.action.includes('(pop') && !currentTrace.action.includes('(pop failed')) {
        // Extract symbol from patterns like:
        // "pop REQ_LINE marker - request line complete (pop REQ_LINE)"
        // "pop CR marker (pop CR)"
        let symbol = '';
        
        // First try to extract from "(pop SYMBOL)" pattern at the end
        const popMatch1 = currentTrace.action.match(/\(pop\s+([A-Z_$]+)\)/);
        if (popMatch1) {
          symbol = popMatch1[1];
        } else {
          // Try to extract from "pop SYMBOL marker" pattern
          const popMatch2 = currentTrace.action.match(/pop\s+([A-Z_$]+)\s+marker/);
          if (popMatch2) {
            symbol = popMatch2[1];
          } else {
            // Try to extract from action text directly
            const popMatch3 = currentTrace.action.match(/pop\s+([A-Z_$]+)/);
            if (popMatch3) {
              symbol = popMatch3[1];
            }
          }
        }
        
        if (symbol && stack.length > 0) {
          // Pop the expected symbol (should be on top)
          if (stack[stack.length - 1] === symbol) {
            stack.pop();
          } else {
            // If top doesn't match, still pop (might be out of sync, but try to recover)
            console.warn(`[PDA] Stack mismatch at step ${step}: expected to pop ${symbol}, but top is ${stack.length > 0 ? stack[stack.length - 1] : 'empty'}. Action: ${currentTrace.action}`);
            if (stack.length > 0) {
              stack.pop();
            }
          }
        } else if (stack.length > 0) {
          // Fallback: just pop if we have something
          stack.pop();
        }
      }
      
      // Use stackTop from trace to validate/sync our tracked stack
      // The trace's stackTop is authoritative - use it to ensure we're in sync
      if (currentTrace.stackTop && currentTrace.stackTop !== '') {
        // If our tracked stack top doesn't match trace, rebuild from trace
        if (stack.length === 0 || stack[stack.length - 1] !== currentTrace.stackTop) {
          // The trace shows what should be on top - we need to ensure our stack matches
          // For now, we'll trust the push/pop operations, but use stackTop as validation
          // If there's a mismatch, it means we missed something - try to sync
          const expectedTop = currentTrace.stackTop;
          
          // If expected top is not on our stack, we might have missed a push
          if (!stack.includes(expectedTop)) {
            // Add it (this handles initialization cases)
            stack.push(expectedTop);
          } else {
            // Expected top is in stack but not on top - remove everything above it
            const symbolIndex = stack.lastIndexOf(expectedTop);
            if (symbolIndex !== -1 && symbolIndex < stack.length - 1) {
              stack.splice(symbolIndex + 1);
            }
          }
        }
      }
      
      // Update state with current stack (always show at least bottom marker if empty)
      const displayStack = stack.length > 0 ? [...stack] : ['$'];
      setPdaStack(displayStack);
      setPdaCurrentStep(step);
      
      // Check if this is an error step
      const isError = currentTrace.state === 'ERROR' || 
                     currentTrace.action.toLowerCase().includes('reject') || 
                     currentTrace.action.toLowerCase().includes('invalid') || 
                     currentTrace.action.toLowerCase().includes('expected');
      
      if (isError) {
        if (currentTrace.position !== undefined) {
          // Map position from HTTP payload to full payload
          const fullPosition = pdaHttpPayloadOffset >= 0 ? pdaHttpPayloadOffset + currentTrace.position : currentTrace.position;
          setPdaErrorPosition(fullPosition);
        }
      }
      
      step += 1;
    }, 150); // 150ms per step for smooth animation

    simTimersRef.current.push(intervalId);
  }

  // Demo visualization data so the Result View shows something by default
  const demoDfaData = {
    states: ['S', 'A', 'B'],
    start: 'S',
    accept: ['B'],
    transitions: [
      { from: 'S', to: 'A', input: 'a' },
      { from: 'A', to: 'B', input: 'b' },
      { from: 'B', to: 'B', input: 'b' }
    ]
  };

  const demoTrieData = {
    nodes: [
      { id: 0, fail: 0, output: [] },
      { id: 1, fail: 0, output: [] },
      { id: 2, fail: 0, output: ['he'] }
    ],
    edges: [
      { from: 0, input: 'h', to: 1 },
      { from: 1, input: 'e', to: 2 }
    ]
  };

  return (
    <section className="magic-bento-wrapper">
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        {cardData.map((card, index) => {
          const baseClassName = `magic-bento-card ${card.layoutClass} ${
            textAutoHide ? "magic-bento-card--text-autohide" : ""
          } ${enableBorderGlow ? "magic-bento-card--border-glow" : ""}`;

          const cardProps = {
            className: baseClassName,
            style: {
              backgroundColor: card.color,
              "--glow-color": glowColor
            } as React.CSSProperties
          };

          if (card.isHeader) {
            return (
              <ParticleCard key={index} {...cardProps} disableAnimations={shouldDisableAnimations}>
                <div className="magic-bento-card__content placeholder-content header-placeholder">
                  <p className="header-course">CS311: Automata Theory and Formal Langauges</p>
                  <h1 className="header-title">PACKET PAYLOAD INSPECTOR w/ HTTP PROTOCOL VALIDATION</h1>
                  <p className="header-authors">Chiong, H., Bentuzal, C. L., Limpahan, M. V., Silmaro, J.</p>
                </div>
              </ParticleCard>
            );
          }

          if (card.isPlaceholder) {
            return (
              <ParticleCard key={index} {...cardProps} disableAnimations={shouldDisableAnimations}>
                <div className="magic-bento-card__content placeholder-content header-placeholder">
                  <div className="placeholder-label">{card.placeholderLabel || card.label}</div>
                </div>
              </ParticleCard>
            );
          }

          if (card.label === "Packet Intake") {
            const uploadCardContent = (
              <div className="magic-bento-card__content packet-intake-content">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pcap,.pcapng,.hex,.txt"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                
                {/* File Preview Section - Moved to top */}
                <div className="file-preview-container">
                  <div className="file-preview">
                    {uploadedFile ? (
                      <div className="file-preview-content">
                        <div className="file-preview-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <div className="file-info">
                            <p className="file-name">{uploadedFile.name}</p>
                            <p className="file-size">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="file-preview-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p>No file selected</p>
                        <p className="text-xs mt-2 text-gray-400">Upload a PCAP file or generate a packet to begin</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons Section - Moved to bottom */}
                <div className="packet-buttons-container">
                  <button 
                    className="packet-btn packet-btn--upload" 
                    onClick={handleUploadClick}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload PCAP/Hex
                  </button>
                  
                  <button 
                    className="packet-btn packet-btn--generate" 
                    onClick={() => setIsGeneratorOpen(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    Generate Packet
                  </button>
                </div>
              </div>
            );

            if (enableStars) {
              return (
                <ParticleCard
                  key={card.label}
                  {...cardProps}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">{card.label}</div>
                  </div>
                  {uploadCardContent}
                </ParticleCard>
              );
            }

            return (
              <div key={card.label} {...cardProps}>
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">{card.label}</div>
                </div>
                {uploadCardContent}
              </div>
            );
          }

          if (card.label === "Inspection Controls") {
            const controlsCardContent = (
              <div className="magic-bento-card__content inspection-controls-content">
                <div className="inspection-control-group">
                  <div className="inspection-control-header">
                    <button
                      className="inspection-btn"
                      onClick={handleDfaInspection}
                      disabled={dfaStatus === 'inspecting'}
                      title="Run DFA-based malicious packet detection"
                    >
                      <span>Payload Inspection</span>
                      <div className={`status-indicator status-${dfaStatus}`}>
                        {dfaStatus === 'idle' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3" opacity="0.5" />
                          </svg>
                        )}
                        {dfaStatus === 'inspecting' && (
                          <svg className="status-icon status-icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 3v9" strokeLinecap="round" />
                          </svg>
                        )}
                        {dfaStatus === 'approved' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {dfaStatus === 'malicious' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                  <div className="inspection-language">
                    <span className="language-label">Language:</span>
                    <span className="language-value">DFA (Deterministic Finite Automaton)</span>
                  </div>
                </div>

                <div className="inspection-control-group">
                  <div className="inspection-control-header">
                    <button
                      className="inspection-btn"
                      onClick={handlePdaValidation}
                      disabled={pdaStatus === 'inspecting'}
                      title="Run HTTP PDA protocol validation"
                    >
                      <span>Protocol Validation</span>
                      <div className={`status-indicator status-${pdaStatus}`}>
                        {pdaStatus === 'idle' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3" opacity="0.5" />
                          </svg>
                        )}
                        {pdaStatus === 'inspecting' && (
                          <svg className="status-icon status-icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 3v9" strokeLinecap="round" />
                          </svg>
                        )}
                        {pdaStatus === 'approved' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {pdaStatus === 'malicious' && (
                          <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                  <div className="inspection-language">
                    <span className="language-label">Language:</span>
                    <span className="language-value">PDA (Pushdown Automaton)</span>
                  </div>
                </div>
              </div>
            );

            if (enableStars) {
              return (
                <ParticleCard
                  key={card.label}
                  {...cardProps}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">{card.label}</div>
                  </div>
                  {controlsCardContent}
                </ParticleCard>
              );
            }

            return (
              <div key={card.label} {...cardProps}>
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">{card.label}</div>
                </div>
                {controlsCardContent}
              </div>
            );
          }

          if (enableStars) {
            return (
              <ParticleCard
                key={card.label}
                {...cardProps}
                disableAnimations={shouldDisableAnimations}
                particleCount={particleCount}
                glowColor={glowColor}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
              >
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">{card.label}</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title">{card.title}</h2>
                  <p className="magic-bento-card__description">{card.description}</p>
                  {card.label === 'Result View' && (
                    <div className="result-visualizations" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                      <Tabs defaultValue="payload" className="w-full">
                        <TabsList className="grid w-full grid-cols-2" shape="pill">
                          <TabsTrigger value="payload">Payload</TabsTrigger>
                          <TabsTrigger value="protocol">Protocol</TabsTrigger>
                        </TabsList>
                        <TabsContent value="payload">
                          <div style={{ minHeight: computedHexHeight, transition: 'min-height 200ms ease', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem' }}>
                            <HexView 
                              payloadHex={payloadHex} 
                              payloadAscii={payloadAscii} 
                              highlightedPositions={pdaErrorPosition !== null ? [pdaErrorPosition] : highlightedPositions} 
                              matchedPatterns={matchedPatterns} 
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="protocol">
                          <div style={{ padding: '1rem', minHeight: '200px', maxHeight: '500px', overflowY: 'auto' }}>
                            {packetInfo ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cbd5f5' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Protocol:</span>
                                    <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                      {packetInfo.protocol || 'Unknown'}
                                    </span>
                                  </div>
                                  {packetInfo.srcIP && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                      <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Source IP:</span>
                                      <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                        {packetInfo.srcIP}
                                      </span>
                                    </div>
                                  )}
                                  {packetInfo.dstIP && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                      <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Destination IP:</span>
                                      <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                        {packetInfo.dstIP}
                                      </span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Length:</span>
                                    <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                      {packetInfo.length || 0} bytes
                                    </span>
                                  </div>
                                  {packetInfo.filename && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                      <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Filename:</span>
                                      <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1, wordBreak: 'break-all' }}>
                                        {packetInfo.filename}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* PDA Validation Results */}
                                {pdaTrace.length > 0 && (
                                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                    <div style={{ marginBottom: '0.75rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>
                                      HTTP PDA Validation
                                    </div>
                                    <div style={{ 
                                      padding: '0.5rem', 
                                      borderRadius: '0.5rem', 
                                      backgroundColor: pdaStatus === 'approved' 
                                        ? 'rgba(34, 197, 94, 0.1)' 
                                        : pdaStatus === 'malicious' 
                                        ? 'rgba(239, 68, 68, 0.1)' 
                                        : 'rgba(15, 23, 42, 0.3)',
                                      border: `1px solid ${pdaStatus === 'approved' 
                                        ? 'rgba(34, 197, 94, 0.3)' 
                                        : pdaStatus === 'malicious' 
                                        ? 'rgba(239, 68, 68, 0.3)' 
                                        : 'rgba(168, 85, 247, 0.2)'}`
                                    }}>
                                      <div style={{ 
                                        color: pdaStatus === 'approved' ? '#22c55e' : pdaStatus === 'malicious' ? '#ef4444' : '#a8adc5',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        marginBottom: '0.75rem'
                                      }}>
                                        Status: {pdaStatus === 'approved' ? 'VALID HTTP' : pdaStatus === 'malicious' ? 'INVALID HTTP' : 'VALIDATING...'}
                                        {pdaErrorPosition !== null && (
                                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400 }}>
                                            (Error at position {pdaErrorPosition})
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ 
                                      display: 'grid', 
                                      gridTemplateColumns: !isMobile ? '1fr 300px' : '1fr', 
                                      gap: '1rem', 
                                      marginBottom: '0.75rem' 
                                    }}>
                                        <div style={{ minWidth: 0 }}>
                                          {renderPdaTrace(pdaTrace)}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                          <StackVisualizer 
                                            stack={pdaStack} 
                                            currentState={pdaTrace[pdaCurrentStep]?.state}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ color: '#a8adc5', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                                No protocol information available. Upload a packet to see details.
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              </ParticleCard>
            );
          }

          return (
            <div key={card.label} {...cardProps}>
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">{card.label}</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{card.title}</h2>
                <p className="magic-bento-card__description">{card.description}</p>
                {card.label === 'Result View' && (
                  <div className="result-visualizations" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                    <Tabs defaultValue="payload" className="w-full">
                      <TabsList className="grid w-full grid-cols-2" shape="pill">
                        <TabsTrigger value="payload">Payload</TabsTrigger>
                        <TabsTrigger value="protocol">Protocol</TabsTrigger>
                      </TabsList>
                      <TabsContent value="payload">
                        <div style={{ minHeight: computedHexHeight, transition: 'min-height 200ms ease', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem' }}>
                          <HexView 
                            payloadHex={payloadHex} 
                            payloadAscii={payloadAscii} 
                            highlightedPositions={pdaErrorPosition !== null ? [pdaErrorPosition] : highlightedPositions} 
                            matchedPatterns={matchedPatterns} 
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="protocol">
                        <div style={{ padding: '1rem', minHeight: '200px', maxHeight: '500px', overflowY: 'auto' }}>
                          {packetInfo ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cbd5f5' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                  <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Protocol:</span>
                                  <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                    {packetInfo.protocol || 'Unknown'}
                                  </span>
                                </div>
                                {packetInfo.srcIP && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Source IP:</span>
                                    <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                      {packetInfo.srcIP}
                                    </span>
                                  </div>
                                )}
                                {packetInfo.dstIP && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Destination IP:</span>
                                    <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                      {packetInfo.dstIP}
                                    </span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                  <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Length:</span>
                                  <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1 }}>
                                    {packetInfo.length || 0} bytes
                                  </span>
                                </div>
                                {packetInfo.filename && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ color: '#a8adc5', fontSize: '0.85rem', minWidth: '100px' }}>Filename:</span>
                                    <span style={{ color: '#cbd5f5', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right', flex: 1, wordBreak: 'break-all' }}>
                                      {packetInfo.filename}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* PDA Validation Results */}
                              {pdaTrace.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                  <div style={{ marginBottom: '0.75rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>
                                    HTTP PDA Validation
                                  </div>
                                  <div style={{ 
                                    padding: '0.5rem', 
                                    borderRadius: '0.5rem', 
                                    backgroundColor: pdaStatus === 'approved' 
                                      ? 'rgba(34, 197, 94, 0.1)' 
                                      : pdaStatus === 'malicious' 
                                      ? 'rgba(239, 68, 68, 0.1)' 
                                      : 'rgba(15, 23, 42, 0.3)',
                                    border: `1px solid ${pdaStatus === 'approved' 
                                      ? 'rgba(34, 197, 94, 0.3)' 
                                      : pdaStatus === 'malicious' 
                                      ? 'rgba(239, 68, 68, 0.3)' 
                                      : 'rgba(168, 85, 247, 0.2)'}`
                                  }}>
                                    <div style={{ 
                                      color: pdaStatus === 'approved' ? '#22c55e' : pdaStatus === 'malicious' ? '#ef4444' : '#a8adc5',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      marginBottom: '0.75rem'
                                    }}>
                                      Status: {pdaStatus === 'approved' ? 'VALID HTTP' : pdaStatus === 'malicious' ? 'INVALID HTTP' : 'VALIDATING...'}
                                      {pdaErrorPosition !== null && (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400 }}>
                                          (Error at position {pdaErrorPosition})
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ 
                                      display: 'grid', 
                                      gridTemplateColumns: !isMobile ? '1fr 300px' : '1fr', 
                                      gap: '1rem', 
                                      marginBottom: '0.75rem' 
                                    }}>
                                      <div style={{ minWidth: 0 }}>
                                        {renderPdaTrace(pdaTrace)}
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <StackVisualizer 
                                          stack={pdaStack} 
                                          currentState={pdaTrace[pdaCurrentStep]?.state}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: '#a8adc5', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                              No protocol information available. Upload a packet to see details.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </BentoCardGrid>

      <PacketGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} />
    </section>
  );
};

export default MagicBento;



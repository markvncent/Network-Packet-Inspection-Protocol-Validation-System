import { useState, useRef } from 'react';
import { generatePacket, exportPacketAsHex, exportPacketAsText, GeneratedPacket } from '../utils/packetGenerator';
import './PacketGenerator.css';

interface PacketGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PacketGeneratorModal = ({ isOpen, onClose }: PacketGeneratorModalProps) => {
  const [packetType, setPacketType] = useState<'benign' | 'malicious'>('benign');
  const [protocol, setProtocol] = useState<'http' | 'tcp' | 'dns'>('http');
  const [generatedPacket, setGeneratedPacket] = useState<GeneratedPacket | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay for visual effect
    setTimeout(() => {
      const packet = generatePacket({
        type: packetType,
        protocol
      });
      setGeneratedPacket(packet);
      setIsGenerating(false);
      // Auto-scroll to bottom of log
      setTimeout(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500);
  };

  const handleDownloadHex = () => {
    if (!generatedPacket) return;

    const hex = exportPacketAsHex(generatedPacket);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(hex));
    element.setAttribute('download', `packet_${generatedPacket.type}_${Date.now()}.hex`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadText = () => {
    if (!generatedPacket) return;

    const text = exportPacketAsText(generatedPacket);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `packet_${generatedPacket.type}_${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Test Packet</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="generator-controls">
            <div className="control-group">
              <label>Packet Type</label>
              <select value={packetType} onChange={e => setPacketType(e.target.value as 'benign' | 'malicious')}>
                <option value="benign">Benign (Normal Traffic)</option>
                <option value="malicious">Malicious (Attack Pattern)</option>
              </select>
            </div>

            <div className="control-group">
              <label>Protocol</label>
              <select value={protocol} onChange={e => setProtocol(e.target.value as 'http' | 'tcp' | 'dns')}>
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="dns">DNS</option>
              </select>
            </div>

            <button 
              className="generate-btn" 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Packet'}
            </button>
          </div>

          {generatedPacket && (
            <div className="packet-results">
              <div className="results-header">
                <h3>Generated Packet</h3>
                <span className={`packet-badge ${generatedPacket.type}`}>
                  {generatedPacket.type.toUpperCase()}
                </span>
              </div>

              <div className="packet-info">
                <div className="info-row">
                  <span className="label">Timestamp:</span>
                  <span className="value">{generatedPacket.timestamp}</span>
                </div>
                <div className="info-row">
                  <span className="label">Protocol:</span>
                  <span className="value">{generatedPacket.protocol.toUpperCase()}</span>
                </div>
                <div className="info-row">
                  <span className="label">Source:</span>
                  <span className="value">{generatedPacket.metadata.sourceIP}:{generatedPacket.metadata.sourcePort}</span>
                </div>
                <div className="info-row">
                  <span className="label">Destination:</span>
                  <span className="value">{generatedPacket.metadata.destIP}:{generatedPacket.metadata.destPort}</span>
                </div>
                <div className="info-row">
                  <span className="label">Size:</span>
                  <span className="value">{generatedPacket.rawHex.length / 2} bytes</span>
                </div>
                {generatedPacket.metadata.anomalies && generatedPacket.metadata.anomalies.length > 0 && (
                  <div className="info-row anomalies">
                    <span className="label">Anomalies:</span>
                    <ul className="anomaly-list">
                      {generatedPacket.metadata.anomalies.map((anomaly, idx) => (
                        <li key={idx}>{anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="generation-log">
                <h4>Generation Process Log</h4>
                <div className="log-content">
                  {generatedPacket.generationLog.map((line, idx) => (
                    <div key={idx} className="log-line">
                      {line}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              <div className="download-buttons">
                <button className="download-btn hex" onClick={handleDownloadHex}>
                  ↓ Download as .hex
                </button>
                <button className="download-btn text" onClick={handleDownloadText}>
                  ↓ Download as .txt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PacketGeneratorModal;

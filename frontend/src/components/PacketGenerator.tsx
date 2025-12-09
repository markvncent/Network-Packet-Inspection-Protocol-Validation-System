import { useState, useRef } from 'react';
import { generatePacket, exportPacketAsHex, exportPacketAsText, exportPacketAsPcap, GeneratedPacket } from '../utils/packetGenerator';
import './PacketGenerator.css';

interface PacketGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PacketGeneratorModal = ({ isOpen, onClose }: PacketGeneratorModalProps) => {
  const [packetType, setPacketType] = useState<'benign' | 'malicious'>('benign');
  const [generatedPacket, setGeneratedPacket] = useState<GeneratedPacket | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay for visual effect
    setTimeout(() => {
      const packet = generatePacket({
        type: packetType
      });
      setGeneratedPacket(packet);
      setIsGenerating(false);
      // Auto-scroll to bottom of log
      setTimeout(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500);
  };

  const handleDownloadPcap = () => {
    if (!generatedPacket) return;

    const pcapBase64 = exportPacketAsPcap(generatedPacket);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/octet-stream;base64,' + pcapBase64);
    element.setAttribute('download', `packet_${generatedPacket.type}_${Date.now()}.pcap`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          <h2>Generate HTTP PCAP Packet</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="generator-controls">
            <div className="control-group">
              <label>Packet Type</label>
              <select value={packetType} onChange={e => setPacketType(e.target.value as 'benign' | 'malicious')}>
                <option value="benign">Benign (Normal HTTP Traffic)</option>
                <option value="malicious">Malicious (HTTP with Attack Patterns)</option>
              </select>
            </div>

            <button 
              className="generate-btn" 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate PCAP Packet'}
            </button>
          </div>

          {generatedPacket && (
            <div className="packet-results">
              <div className="results-header">
                <h3>Generated Packet</h3>
              </div>

              <div className="packet-info">
                <div className="info-row">
                  <span className="label">Protocol:</span>
                  <span className="value">{generatedPacket.protocol.toUpperCase()}</span>
                </div>
                <div className="info-row">
                  <span className="label">Payload:</span>
                  <span className="value" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {generatedPacket.payload}
                  </span>
                </div>
              </div>

              <div className="download-buttons">
                <button className="download-btn pcap" onClick={handleDownloadPcap}>
                  ↓ Download as .pcap
                </button>
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

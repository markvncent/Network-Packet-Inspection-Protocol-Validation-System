import { useState, useRef } from 'react';
import { generatePacket, exportPacketAsHex, exportPacketAsText, exportPacketAsPcap, GeneratedPacket } from '../utils/packetGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import './PacketGenerator.css';

interface PacketGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PacketOption = {
  payloadType: 'benign' | 'malicious';
  protocolType: 'valid' | 'invalid';
};

export const PacketGeneratorModal = ({ isOpen, onClose }: PacketGeneratorModalProps) => {
  const [selectedOption, setSelectedOption] = useState<PacketOption>({
    payloadType: 'benign',
    protocolType: 'valid'
  });
  const [generatedPacket, setGeneratedPacket] = useState<GeneratedPacket | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      const packet = generatePacket({
        payloadType: selectedOption.payloadType,
        protocolType: selectedOption.protocolType
      });
      setGeneratedPacket(packet);
      setIsGenerating(false);
      setTimeout(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500);
  };

  const handleGenerateRandom = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      const packet = generatePacket({
        random: true
      });
      setGeneratedPacket(packet);
      setIsGenerating(false);
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
          <Tabs defaultValue="configure" className="generator-tabs">
            <TabsList className="generator-tabs-list">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="random">Random</TabsTrigger>
            </TabsList>

            <TabsContent value="configure" className="generator-tab-content">
              <div className="generator-controls">
                <div className="control-group">
                  <label>Packet Configuration</label>
                  <p className="option-description">
                    Select a combination of payload type and protocol structure
                  </p>
                  <div className="option-grid">
                    <button
                      className={`option-card ${selectedOption.payloadType === 'benign' && selectedOption.protocolType === 'valid' ? 'active' : ''}`}
                      onClick={() => setSelectedOption({ payloadType: 'benign', protocolType: 'valid' })}
                    >
                      <div className="option-card-header">
                        <span className="option-badge benign">Benign</span>
                        <span className="option-badge valid">Valid</span>
                      </div>
                      <div className="option-card-body">
                        <p>Safe payload with valid HTTP protocol structure</p>
                        <small>PDA will accept</small>
                      </div>
                    </button>

                    <button
                      className={`option-card ${selectedOption.payloadType === 'benign' && selectedOption.protocolType === 'invalid' ? 'active' : ''}`}
                      onClick={() => setSelectedOption({ payloadType: 'benign', protocolType: 'invalid' })}
                    >
                      <div className="option-card-header">
                        <span className="option-badge benign">Benign</span>
                        <span className="option-badge invalid">Invalid</span>
                      </div>
                      <div className="option-card-body">
                        <p>Safe payload with invalid HTTP protocol structure</p>
                        <small>PDA will reject</small>
                      </div>
                    </button>

                    <button
                      className={`option-card ${selectedOption.payloadType === 'malicious' && selectedOption.protocolType === 'valid' ? 'active' : ''}`}
                      onClick={() => setSelectedOption({ payloadType: 'malicious', protocolType: 'valid' })}
                    >
                      <div className="option-card-header">
                        <span className="option-badge malicious">Malicious</span>
                        <span className="option-badge valid">Valid</span>
                      </div>
                      <div className="option-card-body">
                        <p>Attack patterns with valid HTTP protocol structure</p>
                        <small>PDA will accept, DFA will detect</small>
                      </div>
                    </button>

                    <button
                      className={`option-card ${selectedOption.payloadType === 'malicious' && selectedOption.protocolType === 'invalid' ? 'active' : ''}`}
                      onClick={() => setSelectedOption({ payloadType: 'malicious', protocolType: 'invalid' })}
                    >
                      <div className="option-card-header">
                        <span className="option-badge malicious">Malicious</span>
                        <span className="option-badge invalid">Invalid</span>
                      </div>
                      <div className="option-card-body">
                        <p>Attack patterns with invalid HTTP protocol structure</p>
                        <small>PDA will reject, DFA will detect</small>
                      </div>
                    </button>
                  </div>
                </div>

                <button 
                  className="generate-btn" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Packet'}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="random" className="generator-tab-content">
              <div className="generator-controls">
                <div className="control-group">
                  <label>Random Generation</label>
                  <p className="option-description">
                    Generate a random HTTP packet without explicit rules. May be valid or invalid, 
                    benign or malicious. Perfect for testing validation systems.
                  </p>
                </div>

                <button 
                  className="generate-btn" 
                  onClick={handleGenerateRandom}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Random Packet'}
                </button>
              </div>
            </TabsContent>
          </Tabs>

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

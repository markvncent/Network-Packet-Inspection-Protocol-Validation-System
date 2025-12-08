import React from 'react';
import './PacketList.css';

export interface PacketSummary {
  packetId: number;
  payloadLength: number;
  matchCount: number;
  patternNames: string[];
  severity: 'safe' | 'warning' | 'critical';
}

interface PacketListProps {
  packets: PacketSummary[];
  selectedPacketId?: number;
  onPacketSelect?: (packetId: number) => void;
}

/**
 * PacketList: Displays list of packet payload summaries
 * - Shows packet ID, size, match count
 * - Color-coded severity indicators
 * - Clickable to select packet for detailed analysis
 */
const PacketList: React.FC<PacketListProps> = ({
  packets,
  selectedPacketId,
  onPacketSelect
}) => {
  if (packets.length === 0) {
    return <div className="packet-list packet-list--empty">No packets scanned</div>;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safe':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#8b7aa8';
    }
  };

  const getSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  return (
    <div className="packet-list">
      <div className="packet-list__header">
        <div className="packet-list__col-id">ID</div>
        <div className="packet-list__col-size">Size</div>
        <div className="packet-list__col-matches">Matches</div>
        <div className="packet-list__col-severity">Severity</div>
        <div className="packet-list__col-patterns">Patterns Matched</div>
      </div>

      <div className="packet-list__content">
        {packets.map((packet) => (
          <div
            key={packet.packetId}
            className={`packet-list__row ${
              selectedPacketId === packet.packetId ? 'packet-list__row--selected' : ''
            }`}
            onClick={() => onPacketSelect?.(packet.packetId)}
          >
            <div className="packet-list__col-id">#{packet.packetId}</div>
            <div className="packet-list__col-size">{packet.payloadLength} B</div>
            <div className="packet-list__col-matches">
              <span className={`match-badge ${packet.matchCount > 0 ? 'match-badge--alert' : ''}`}>
                {packet.matchCount}
              </span>
            </div>
            <div className="packet-list__col-severity">
              <span
                className={`severity-badge severity-${packet.severity}`}
                style={{ backgroundColor: getSeverityColor(packet.severity) }}
              >
                {getSeverityLabel(packet.severity)}
              </span>
            </div>
            <div className="packet-list__col-patterns">
              <div className="pattern-tags">
                {packet.patternNames.slice(0, 3).map((pattern, idx) => (
                  <span key={idx} className="pattern-tag">
                    {pattern}
                  </span>
                ))}
                {packet.patternNames.length > 3 && (
                  <span className="pattern-tag pattern-tag--more">
                    +{packet.patternNames.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="packet-list__footer">
        <div className="packet-list__stats">
          <span>Total Packets: <strong>{packets.length}</strong></span>
          <span>Total Matches: <strong>{packets.reduce((sum, p) => sum + p.matchCount, 0)}</strong></span>
          <span>Critical: <strong>{packets.filter(p => p.severity === 'critical').length}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default PacketList;

import React, { useMemo } from 'react';
import './HexView.css';

interface HexViewProps {
  payloadHex?: string;
  payloadAscii?: string;
  highlightedPositions?: number[];
  matchedPatterns?: Array<{ pattern: string; position: number }>;
  bytesPerLine?: number;
  onByteClick?: (position: number) => void;
}

/**
 * HexView: Displays packet payload in hex and ASCII format
 * - Shows hex bytes with ASCII representation
 * - Highlights matched pattern bytes
 * - Supports interactive byte selection
 */
const HexView: React.FC<HexViewProps> = ({
  payloadHex = '',
  payloadAscii = '',
  highlightedPositions = [],
  matchedPatterns = [],
  bytesPerLine = 16,
  onByteClick
}) => {
  // Build highlighted set for O(1) lookups
  const highlightedSet = useMemo(
    () => new Set(highlightedPositions),
    [highlightedPositions]
  );

  // Build pattern position map
  const patternMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const match of matchedPatterns) {
      if (!map.has(match.position)) {
        map.set(match.position, []);
      }
      map.get(match.position)!.push(match.pattern);
    }
    return map;
  }, [matchedPatterns]);

  const hexBytes = payloadHex.match(/.{2}/g) || [];
  const lines = [];

  for (let i = 0; i < hexBytes.length; i += bytesPerLine) {
    const lineBytes = hexBytes.slice(i, i + bytesPerLine);
    const lineAscii = payloadAscii.slice(i, i + bytesPerLine);
    lines.push({ bytes: lineBytes, ascii: lineAscii, offset: i });
  }

  if (lines.length === 0) {
    return <div className="hex-view hex-view--empty">No payload data</div>;
  }

  return (
    <div className="hex-view">
      <div className="hex-view__header">
        <div className="hex-view__offset">Offset</div>
        <div className="hex-view__hex-dump">Hex Dump</div>
        <div className="hex-view__ascii">ASCII</div>
      </div>

      <div className="hex-view__content">
        {lines.map((line, lineIdx) => (
          <div key={lineIdx} className="hex-view__line">
            <div className="hex-view__offset-value">
              {String(line.offset * 2).padStart(8, '0')}
            </div>

            <div className="hex-view__hex-group">
              {line.bytes.map((byte, byteIdx) => {
                const position = line.offset + byteIdx;
                const isHighlighted = highlightedSet.has(position);
                const patterns = patternMap.get(position) || [];

                return (
                  <div
                    key={byteIdx}
                    className={`hex-byte ${isHighlighted ? 'hex-byte--highlighted' : ''} ${
                      patterns.length > 0 ? 'hex-byte--matched' : ''
                    }`}
                    onClick={() => onByteClick?.(position)}
                    title={patterns.length > 0 ? `Matches: ${patterns.join(', ')}` : ''}
                  >
                    {byte}
                  </div>
                );
              })}
            </div>

            <div className="hex-view__ascii-group">
              {line.ascii.split('').map((char, charIdx) => {
                const position = line.offset + charIdx;
                const isHighlighted = highlightedSet.has(position);
                const patterns = patternMap.get(position) || [];

                return (
                  <span
                    key={charIdx}
                    className={`hex-ascii-char ${isHighlighted ? 'hex-ascii-char--highlighted' : ''} ${
                      patterns.length > 0 ? 'hex-ascii-char--matched' : ''
                    }`}
                    title={patterns.length > 0 ? `Matches: ${patterns.join(', ')}` : ''}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {matchedPatterns.length > 0 && (
        <div className="hex-view__matches">
          <h4>Matched Patterns ({matchedPatterns.length})</h4>
          <ul>
            {matchedPatterns.map((match, idx) => (
              <li key={idx}>
                <span className="match-pattern">{match.pattern}</span>
                <span className="match-position">@ {match.position}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HexView;

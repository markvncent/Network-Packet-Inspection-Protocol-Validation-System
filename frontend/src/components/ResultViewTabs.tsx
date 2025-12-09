import React, { useState } from 'react';
import './ResultViewTabs.css';

export type ResultViewTab = 'hex' | 'protocol' | 'dfa' | 'pda';

interface ResultViewTabsProps {
  activeTab: ResultViewTab;
  onTabChange: (tab: ResultViewTab) => void;
  hexViewCount?: number;
  protocolValidationCount?: number;
  dfaMatchCount?: number;
  pdaValidationCount?: number;
}

/**
 * ResultViewTabs: Modular tab system for Result View
 * - Tracks active tab state
 * - Easy to extend with new views
 * - Shows view-specific indicators
 */
const ResultViewTabs: React.FC<ResultViewTabsProps> = ({
  activeTab,
  onTabChange,
  hexViewCount,
  protocolValidationCount,
  dfaMatchCount,
  pdaValidationCount
}) => {
  const tabs: Array<{ id: ResultViewTab; label: string; count?: number }> = [
    { id: 'hex', label: 'Hex View', count: hexViewCount },
    { id: 'protocol', label: 'Protocol Validation', count: protocolValidationCount },
    { id: 'dfa', label: 'Payload Inspection', count: dfaMatchCount },
    { id: 'pda', label: 'PDA Validation', count: pdaValidationCount }
  ];

  return (
    <div className="result-view-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`result-view-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
        >
          <span className="tab-label">{tab.label}</span>
          {tab.count !== undefined && tab.count > 0 && (
            <span className="tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ResultViewTabs;


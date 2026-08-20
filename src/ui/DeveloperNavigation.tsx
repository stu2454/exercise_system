import { DEVELOPER_TABS, type DeveloperTab } from "./developerTabs";

interface DeveloperNavigationProps {
  activeTab: DeveloperTab;
  onChange: (tab: DeveloperTab) => void;
}

export function DeveloperNavigation({ activeTab, onChange }: DeveloperNavigationProps) {
  return (
    <nav className="developer-navigation" aria-label="Developer workspace">
      <div role="tablist" aria-label="Developer workspace sections">
        {DEVELOPER_TABS.map((tab) => (
          <button
            id={`developer-tab-${tab.id}`}
            className={activeTab === tab.id ? "developer-navigation__active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`developer-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            key={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

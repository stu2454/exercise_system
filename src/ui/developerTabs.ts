export const DEVELOPER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "programmes", label: "Programmes" },
  { id: "exercise-library", label: "Exercise Library" },
  { id: "sessions", label: "Sessions" },
  { id: "developer", label: "Developer" },
] as const;

export type DeveloperTab = (typeof DEVELOPER_TABS)[number]["id"];

export function isDeveloperTab(value: string): value is DeveloperTab {
  return DEVELOPER_TABS.some((tab) => tab.id === value);
}

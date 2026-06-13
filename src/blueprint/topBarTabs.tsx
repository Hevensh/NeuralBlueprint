const blueprintTabs = [
  'Neural Blueprint',
  'Knowledge Graph',
  'Training Process',
];

export function BlueprintTopBarTabs() {
  return (
    <div className="top-bar-tabs">
      {blueprintTabs.map((tab, index) => (
        <button
          className={`top-bar-tab ${index === 0 ? 'active' : ''}`}
          key={tab}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

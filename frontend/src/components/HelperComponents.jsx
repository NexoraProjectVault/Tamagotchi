const statusMap = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Completed",
};

const priorityMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const tagMap = {
  feeding: "Feeding",
  cleaning: "Cleaning",
  playing: "Playing",
};

// Convert backend value to UI value
export const toUIValue = (type, value) => {
  const maps = {
    status: statusMap,
    priority: priorityMap,
    tag: tagMap,
  };
  return maps[type]?.[value?.toLowerCase()] || value;
};

// Convert UI value to backend value
export const toBackendValue = (type, value) => {
  const maps = {
    status: reverseMap(statusMap),
    priority: reverseMap(priorityMap),
    tag: reverseMap(tagMap),
  };
  return maps[type]?.[value] || value;
};

// Helper to reverse a map
const reverseMap = (map) => {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
};
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

export function listenToEvents(onEvent) {
  const eventSource = new EventSource(`${import.meta.env.VITE_BACKEND_URL}/v1/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (err) {
      console.error("Error parsing SSE event:", err);
    }
  };

  eventSource.onerror = (err) => {
    console.error("SSE connection error:", err);
    eventSource.close();
  };

  return eventSource;
}

export function isoToDatetimeLocal(isoString) {
  if (!isoString) return "";
  
  const date = new Date(isoString);
  
  // Convert to local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function datetimeLocalToISO(datetimeLocal) {
  if (!datetimeLocal) return null;
  
  // datetime-local is in browser's local time
  const [datePart, timePart] = datetimeLocal.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");
  
  // Create a date in local time
  const date = new Date(year, parseInt(month) - 1, day, hours, minutes, 0);
  
  // Convert to ISO string
  return date.toISOString();
}

export const formatDatetimeDisplay = (isoString) => {
  if (!isoString) return "No due date";
  
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour12: true,
  });
};

export function getToday() {
  const today = new Date();
  today.setHours(23, 59, 0, 0);
  return today.toISOString();
}

export function ensureDatetimeLocal(value) {
  if (!value) return "";
  
  // If it's already in datetime-local format (YYYY-MM-DDTHH:MM)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  
  // If it's ISO format, convert it
  return isoToDatetimeLocal(value);
}
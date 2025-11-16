// src/pages/RoadmapForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RoadmapForm.css";
import { toUIValue, toBackendValue } from "../components/HelperComponents";

const baseUrl = import.meta.env.VITE_API_GATEWAY_URL;
const dataTrackingUrl = `${baseUrl}/v1/data-tracking-service`; // API Gateway to data tracking service

export function getAuthHeaders() {
  const token  = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");
  const h = { "Content-Type": "application/json" };
  if (token)  h.Authorization = `Bearer ${token}`;
  if (userId) h["X-User-Id"] = userId;
  return h;
}

export default function RoadmapForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const editingRoadmap = location.state?.roadmap || null;
  const isEdit = Boolean(editingRoadmap);
  const roadmapId = editingRoadmap?.id;

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [roadmapData, setRoadmapData] = useState(editingRoadmap);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roadmapCount, setRoadmapCount] = useState(0);

  // Check roadmap count when creating a new roadmap
  useEffect(() => {
    if (!isEdit) {
      const checkRoadmapCount = async () => {
        try {
          const response = await fetch(`${dataTrackingUrl}/roadmaps`, {
            method: "GET",
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            setRoadmapCount(data.length || 0);
          }
        } catch (err) {
          console.error("Error checking roadmap count:", err);
        }
      };

      checkRoadmapCount();
    }
  }, [isEdit]);

  // Fetch full roadmap data if editing (to ensure we have latest data including task_ids)
  useEffect(() => {
    if (isEdit && roadmapId) {
      const fetchRoadmap = async () => {
        try {
          const response = await fetch(`${dataTrackingUrl}/roadmaps/${roadmapId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Fetched roadmap data:", data);
            setRoadmapData(data);
          }
        } catch (err) {
          console.error("Error fetching roadmap:", err);
          // Fall back to state data if fetch fails
        }
      };

      fetchRoadmap();
    }
  }, [isEdit, roadmapId]);

  // Fetch tasks for roadmap assignment
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setTasksLoading(true);

        const response = await fetch(`${baseUrl}/v1/task-service/tasks`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.statusText}`);
        }

        const data = await response.json();
        const activeTasks = data.items?.filter((task) => task.status !== "completed") || [];
        let mergedTasks = [...activeTasks];

        const currentRoadmap = roadmapData || editingRoadmap;
        if (currentRoadmap?.task_ids?.length) {
          const existingTaskIds = new Set(mergedTasks.map((task) => task.id));
          const missingTaskIds = currentRoadmap.task_ids
            .map(Number)
            .filter((taskId) => !existingTaskIds.has(taskId));

          if (missingTaskIds.length) {
            const fetchedTasks = await Promise.all(
              missingTaskIds.map(async (taskId) => {
                try {
                  const res = await fetch(`${baseUrl}/v1/task-service/tasks/${taskId}`, {
                    method: "GET",
                    headers: getAuthHeaders(),
                  });
                  if (res.ok) {
                    return await res.json();
                  }
                } catch (error) {
                  console.error(`Failed to fetch task ${taskId}:`, error);
                }
                return null;
              })
            );

            mergedTasks = mergedTasks.concat(fetchedTasks.filter(Boolean));
          }
        }

        setTasks(mergedTasks);
        
        // After tasks are loaded, ensure selectedTaskIds are set if editing
        if (currentRoadmap?.task_ids && Array.isArray(currentRoadmap.task_ids)) {
          const taskIds = currentRoadmap.task_ids.map(Number).filter(id => !isNaN(id));
          setSelectedTaskIds(prev => {
            // Only update if we have valid task IDs and they're different
            if (taskIds.length > 0 && JSON.stringify(prev.sort()) !== JSON.stringify(taskIds.sort())) {
              return taskIds;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [editingRoadmap, roadmapData]);

  useEffect(() => {
    const currentRoadmap = roadmapData || editingRoadmap;
    if (currentRoadmap) {
      console.log("Editing Roadmap:", currentRoadmap);

      setName(currentRoadmap.title || currentRoadmap.name || "");
      setDesc(currentRoadmap.description || currentRoadmap.desc || "");
      
      // Format due date - handle both ISO string and date object
      if (currentRoadmap.due_date) {
        try {
          const dueDate = new Date(currentRoadmap.due_date);
          if (!isNaN(dueDate.getTime())) {
            setDue(dueDate.toISOString().split("T")[0]);
          } else {
            setDue("");
          }
        } catch (e) {
          console.error("Error parsing due_date:", e);
          setDue("");
        }
      } else {
        setDue("");
      }

      // Set selected task IDs
      if (currentRoadmap.task_ids && Array.isArray(currentRoadmap.task_ids)) {
        const taskIds = currentRoadmap.task_ids.map(Number).filter(id => !isNaN(id));
        setSelectedTaskIds(taskIds);
        console.log("Set selected task IDs:", taskIds);
      } else {
        setSelectedTaskIds([]);
      }
    } else {
      // Reset form when not editing
      setName("");
      setDesc("");
      setDue("");
      setSelectedTaskIds([]);
    }
  }, [editingRoadmap, roadmapData]);

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!due) {
      setError("Due date is required");
      setLoading(false);
      return;
    }

    // Check roadmap limit before submitting (only for new roadmaps)
    if (!isEdit && roadmapCount >= 3) {
      setError("Maximum limit of 3 roadmaps reached. Please complete or delete an existing roadmap before creating a new one.");
      setLoading(false);
      return;
    }

    try {

      let dueDateTime = null;
      if (due) {
        const [year, month, day] = due.split('-').map(Number);
        // Create date in UTC to avoid timezone shift
        dueDateTime = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      }

      const submitData = {
        title: name,
        description: desc,
        due_date: due ? new Date(due).toISOString() : null,
        task_ids: selectedTaskIds,
      };

      let response;

      if (isEdit) {
        // Update existing roadmap via PATCH
        const idToUpdate = roadmapId || editingRoadmap?.id;
        console.log("Updating roadmap:", idToUpdate);
        console.log("Payload:", submitData);
        response = await fetch(`${dataTrackingUrl}/roadmaps/${idToUpdate}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(submitData),
        });
      } else {
        // Create new roadmap via POST
        const postUrl = `${dataTrackingUrl}/roadmaps`;
        console.log("POST URL:", postUrl);
        console.log("Payload:", submitData);

        response = await fetch(postUrl, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(submitData),
        });
      }

      if (!response.ok) {
        let errorMessage = "Failed to save roadmap";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Roadmap saved successfully:", result);

      navigate("/roadmaps/manage", { state: { refreshRoadmaps: true } });
    } catch (err) {
      console.error("Error saving roadmap:", err);
      setError(err.message || "An error occurred while saving the roadmap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tf-page">
      <header className="tf-header">
        <h1 className="tf-title">{isEdit ? "Edit Roadmap" : "Create Roadmap"}</h1>
      </header>

      {error && (
        <div className="tf-error-message">
          <span>❌ {error}</span>
        </div>
      )}

      <form className="tf-form" onSubmit={submitForm}>
        {/* Name */}
        <label className="tf-field">
          <span className="tf-label">Name</span>
          <input
            className="tf-input"
            placeholder="Enter roadmap name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
          <span className="tf-hint">This field is required</span>
        </label>

        {/* Description */}
        <label className="tf-field">
          <span className="tf-label">Description</span>
          <input
            className="tf-input"
            placeholder="Enter roadmap description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={loading}
          />
        </label>

        {/* Due Date */}
        <label className="tf-field">
          <span className="tf-label">Due Date</span>
          <input
            type="date"
            className="tf-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            disabled={loading}
            required
          />
        </label>

        {/* Task Selection (only for new roadmaps) */}
        <div className="tf-field">
          <span className="tf-label">Select Tasks (up to 5)</span>
          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No active tasks available</p>
          ) : (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: '#f9f9f9'
            }}>
              {tasks.map((task) => {
                const taskId = Number(task.id);
                const isSelected = selectedTaskIds.includes(taskId);
                const canSelect = isSelected || selectedTaskIds.length < 5;
                
                return (
                  <label
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      backgroundColor: isSelected ? '#e3f2fd' : 'white',
                      border: isSelected ? '2px solid #2196f3' : '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: canSelect ? 'pointer' : 'not-allowed',
                      opacity: canSelect ? 1 : 0.6
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
                        } else if (selectedTaskIds.length < 5) {
                          setSelectedTaskIds([...selectedTaskIds, taskId]);
                        } else {
                          alert("You can only select up to 5 tasks for a roadmap.");
                        }
                      }}
                      disabled={!canSelect || loading}
                      style={{
                        marginRight: '0.75rem',
                        width: '18px',
                        height: '18px',
                        cursor: canSelect ? 'pointer' : 'not-allowed'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          {task.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {task.priority && (
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px'
                          }}>
                            {task.priority}
                          </span>
                        )}
                        {task.tags?.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#e0e0e0',
                              borderRadius: '4px'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {selectedTaskIds.length > 0 && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#2e7d32'
            }}>
              {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="tf-actions">
          <button
            type="button"
            className="tf-btn outline"
            onClick={() => navigate("/roadmaps/manage")}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="tf-btn solid" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
// src/pages/ManageRoadmaps.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ManageRoadmaps.css";
import "./manage-theme.css";

const baseUrl = import.meta.env.VITE_API_GATEWAY_URL;
const roadmapsUrl = `${baseUrl}/v1/data-tracking-service/roadmaps`;

// Time conversion to UTC date string
const formatUTCDate = (iso) => {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
};


const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  return headers;
};

export default function ManageRoadmaps() {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState([]);
  const [allRoadmaps, setAllRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedRoadmaps, setCompletedRoadmaps] = useState([]);
  const [deletedRoadmaps, setDeletedRoadmaps] = useState([]);
  const [error, setError] = useState(null);
  const [tasksMap, setTasksMap] = useState({}); // Map of task_id -> task object

  // Fetch roadmaps from API
  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(roadmapsUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch roadmaps: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`=> data received from 'get all roadmaps' request: ${data}`);
        const activeRoadmaps = data.filter((roadmap) => roadmap.status !== "completed");
        const completed = data.filter((roadmap) => roadmap.status === "completed");
        setAllRoadmaps(data);
        setRoadmaps(activeRoadmaps);
        setCompletedRoadmaps(completed);

        // Collect all unique task IDs from all roadmaps
        const allTaskIds = new Set();
        data.forEach((roadmap) => {
          if (roadmap.task_ids && Array.isArray(roadmap.task_ids)) {
            roadmap.task_ids.forEach((taskId) => allTaskIds.add(taskId));
          }
        });

        // Fetch task details for all assigned tasks
        if (allTaskIds.size > 0) {
          const taskPromises = Array.from(allTaskIds).map(async (taskId) => {
            try {
              const taskResponse = await fetch(`${baseUrl}/v1/task-service/tasks/${taskId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (taskResponse.ok) {
                const taskData = await taskResponse.json();
                return { id: taskId, task: taskData };
              }
            } catch (err) {
              console.error(`Error fetching task ${taskId}:`, err);
            }
            return null;
          });

          const taskResults = await Promise.all(taskPromises);
          const tasksMapObj = {};
          taskResults.forEach((result) => {
            if (result && result.task) {
              tasksMapObj[result.id] = result.task;
            }
          });
          setTasksMap(tasksMapObj);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching roadmaps:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmaps();
  }, []);

  const deleteRoadmap = async (roadmapId) => {
    if (!window.confirm("Are you sure you want to delete this roadmap?")){
      return;
    }
    try{
      // delete the roadmaps given the id
      const response = await fetch(`${roadmapsUrl}/${roadmapId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete roadmaps with id-${roadmapId}: ${response.statusText}`);
      }

      const deletedRoadmap = roadmaps.find((roadmaps) => roadmaps.id === roadmapId) || 
                        completedRoadmaps.find((roadmaps) => roadmaps.id === roadmapId);

      // remove the roadmaps from all roadmaps
      if (deletedRoadmap) {
        setRoadmaps(roadmaps.filter((roadmaps) => roadmaps.id !== roadmapId));
        setCompletedRoadmaps(completedRoadmaps.filter((roadmaps) => roadmaps.id !== roadmapId));
        setDeletedRoadmaps([...completedRoadmaps, { ...deletedRoadmap, deleted_at: new Date().toISOString() }]);
      }
    } catch (err){
      setError(err.message);
    }
  };


  return (
    <div className="mt-page">
      <header className="mt-hero">
        <h1 className="mt-title">Your Roadmap List</h1>
        <p className="mt-subtitle">
          Organize your tasks more with roadmaps!
        </p>
      </header>

      <section className="mt-list">
        {/* Show loading state */}
        {loading && <p>Loading roadmaps...</p>}

        {/* Show error state */}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {/* Show roadmaps */}
        {!loading && !error && roadmaps.length === 0 && (
          <p>No roadmaps found. Create one to get started!</p>
        )}

        {!loading &&
          !error &&
          roadmaps.map((roadmap) => (
          <article key={roadmap.id} className="mt-item">
              <div className="mt-item-left">
                <h2 className="mt-item-title">{roadmap.title}</h2>
                <p className="mt-desc">{roadmap.description}</p>
                {/* <div className="mt-badges">
                  <span className="mt-badge">
                    {roadmap.task_ids?.length || 0} Assigned Task{roadmap.task_ids?.length === 1 ? "" : "s"}
                  </span>
                </div> */}
                {/* Display assigned tasks */}
                {roadmap.task_ids && roadmap.task_ids.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ 
                      fontSize: "0.875rem", 
                      fontWeight: "500", 
                      marginBottom: "0.5rem",
                      color: "#666"
                    }}>
                      Assigned Tasks:
                    </div>
                    <div style={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: "0.5rem" 
                    }}>
                      {roadmap.task_ids.map((taskId) => {
                        const task = tasksMap[taskId];
                        return (
                          <span
                            key={taskId}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.375rem 0.75rem",
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                              borderRadius: "4px",
                              border: "1px solid #90caf9"
                            }}
                          >
                            {task?.title || `Task #${taskId}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-item-middle">
                <span className="mt-due-label">Due:</span>{" "}
                <span className="mt-due-val">
                  {formatUTCDate(roadmap.due_date)}
                </span>
              </div>
              <div className="button-container">
                <button
                  className="mt-edit-btn"
                  onClick={() =>
                    navigate("/roadmaps/form", {
                      state: { roadmap },
                    })
                  }
                >
                  Edit
                </button>
                <button
                  className="mt-delete-btn"
                  onClick={() => deleteRoadmap(roadmap.id)}
                >
                  DELETE
                </button>
              </div>
            </article>
          ))}

        <div className="mt-create-wrap">
          <button
            className="mt-create-btn"
            onClick={() => navigate("/roadmaps/form")}
          >
            + Create New Roadmap
          </button>
        </div>
      </section>
    </div>
  );
}
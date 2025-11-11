// src/pages/ManageTasks.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ManageTasks.css";
import "./manage-theme.css";


export default function ManageTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [alltasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [error, setError] = useState(null);

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        
        const response = await fetch(`${baseUrl}/v1/task-service/tasks`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`=> data received from 'get all tasks' request: ${data}`);
        const activeTasks = data.items.filter((task) => task.status !== "completed");
        const completed = data.items.filter((task) => task.status === "completed");
        setAllTasks(data.tasks);
        setTasks(activeTasks);
        setCompletedTasks(completed);

        setError(null);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")){
      return;
    }
    try{
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

      // delete the task given the id
      const response = await fetch(`${baseUrl}/v1/task-service/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task with id-${taskId}: ${response.statusText}`);
      }

      const deletedTask = tasks.find((task) => task.id === taskId) || 
                        completedTasks.find((task) => task.id === taskId);

      // remove the task from all tasks
      if (deletedTask) {
        setTasks(tasks.filter((task) => task.id !== taskId));
        setCompletedTasks(completedTasks.filter((task) => task.id !== taskId));
        setDeletedTasks([...deletedTasks, { ...deletedTask, deleted_at: new Date().toISOString() }]);
      }
    } catch (err){
      setError(err.message);
    }
  };

  const completeTask = async (taskId) => {
    try{
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${baseUrl}/v1/task-service/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok){
        throw new Error(`Failed to set status of task with id-${taskId} to completed: ${response.statusText}`);
      }
      const completedTask = tasks.find((task) => task.id === taskId);
      if (completedTask) {
        setTasks(tasks.filter((task) => task.id !== taskId));
        setCompletedTasks([...completedTasks, { ...completedTask, status: "completed" }]);
      }
    } catch (err) {
      console.error("Error completing task:", err);
      setError(err.message);
    }
  };

  return (
    <div className="mt-page">
      <header className="mt-hero">
        <h1 className="mt-title">Your Task List</h1>
        <p className="mt-subtitle">
          Stay productive by taking care of your Tamagotchi while completing tasks!
        </p>

        <div className="mt-search-wrap">
          <input
            className="mt-search-input"
            placeholder="Search Task"
            type="text"
          />
          <button className="mt-search-btn">Search</button>
        </div>

        <div className="mt-filters">
          <button className="mt-chip active">Personal</button>
          <button className="mt-chip " style={{ cursor: 'not-allowed' }} >Work</button> 
          <button className="mt-chip " style={{ cursor: 'not-allowed' }}>Hobbies</button>
          <button className="mt-chip " style={{ cursor: 'not-allowed' }}>Filter Tasks</button>
        </div>
      </header>

      <section className="mt-list">
        {/* Show loading state */}
        {loading && <p>Loading tasks...</p>}

        {/* Show error state */}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {/* Show tasks */}
        {!loading && !error && tasks.length === 0 && (
          <p>No tasks found. Create one to get started!</p>
        )}

        {!loading &&
          !error &&
          tasks.map((task) => (
            <article key={task.id} className="mt-item">
              <div className="mt-item-left">
                <h2 className="mt-item-title">{task.title}</h2>
                <div className="mt-badges">
                  <span className={`mt-badge pri-${task.priority?.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  {task.tags?.map((tag) => (
                    <span key={tag} className="mt-badge">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-desc">{task.description}</p>
              </div>
              <div className="mt-item-middle">
                <span className="mt-due-label">Due:</span>{" "}
                <span className="mt-due-val">
                  {task.due_at
                    ? new Date(task.due_at).toLocaleDateString()
                    : "No due date"}
                </span>
              </div>
              <div className="button-container">
                <button
                  className="mt-edit-btn"
                  onClick={() =>
                    navigate("/tasks/form", {
                      state: { task: task },
                    })
                  }
                >
                  Edit
                </button>
                <button className="mt-done-btn"
                  onClick={() => completeTask(task.id)}
                >  
                  DONE
                </button>
                <button
                  className="mt-delete-btn"
                  onClick={() => deleteTask(task.id)}
                >
                  DELETE
                </button>
              </div>
            </article>
          ))}

        <div className="mt-create-wrap">
          <button
            className="mt-create-btn"
            onClick={() => navigate("/tasks/form")}
          >
            + Create New Task
          </button>
        </div>
      </section>
    </div>
  );
}
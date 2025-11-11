// src/pages/TaskForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./TaskForm.css";
import { toUIValue, toBackendValue } from "../components/HelperComponents";

const API_BASE_URL = "http://localhost:5000/v1/task-service"; // API Gateway to task service

export default function TaskForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const editingTask = location.state?.task || null;
  const isEdit = Boolean(editingTask);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tag, setType] = useState("Feeding");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("To Do");
  const [priority, setPriority] = useState("Low");
  const [points, setPoints] = useState("");
  const [recurrence, setRecurrence] = useState("daily");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingTask) {
      console.log("Editing task:", editingTask);

      setName(editingTask.title || editingTask.name);
      setDesc(editingTask.description || editingTask.desc);
      
      // Convert tag from backend format to UI format
      setStatus(toUIValue("status", editingTask.status));
      setPriority(toUIValue("priority", editingTask.priority));
      setType(toUIValue("tag", editingTask.tags?.[0]));
      
      setPoints(editingTask.points || "");
      setRecurrence(editingTask.recurrence || "daily");
      
      // Format due date
      setDue(
        editingTask.due_at
          ? new Date(editingTask.due_at).toISOString().split("T")[0]
          : editingTask.due || ""
      );
    }
  }, [editingTask]);

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const taskData = {
        title: name,
        description: desc,
        tags: [toBackendValue("tag", tag)],
        due_at: due ? new Date(due).toISOString() : null,
        priority: toBackendValue("priority", priority),
        points: Number(points) || 0,
        status: toBackendValue("status", status),
      };

      let response;

      if (isEdit) {
        // Update existing task via PATCH
        console.log("Updating task:", editingTask.id);
        console.log("Payload:", taskData);
        response = await fetch(`${API_BASE_URL}/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
      } else {
        // Create new task via POST
        const postUrl = `${API_BASE_URL}/tasks`;
        console.log("POST URL:", postUrl);
        console.log("Payload:", taskData);

        response = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save task");
      }

      const result = await response.json();
      console.log("✅ Task saved successfully:", result);

      navigate("/tasks/manage", { state: { refreshTasks: true } });
    } catch (err) {
      console.error("Error saving task:", err);
      setError(err.message || "An error occurred while saving the task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tf-page">
      <header className="tf-header">
        <h1 className="tf-title">{isEdit ? "Edit Task" : "Create Task"}</h1>
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
            placeholder="Enter task name"
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
            placeholder="Enter task description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={loading}
          />
        </label>

        {/* Type */}
        <div className="tf-field">
          <span className="tf-label">Tag</span>
          <div className="tf-chip-row">
            {["Feeding", "Cleaning", "Playing"].map((t) => (
              <button
                key={t}
                type="button"
                className={`tf-chip ${tag === t ? "active" : ""}`}
                onClick={() => setType(t)}
                disabled={loading}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="tf-hint">Select the task type</span>
        </div>

        {/* Priority */}
        <div className="tf-field">
          <span className="tf-label">Priority</span>
          <div className="tf-chip-row">
            {["Low", "Medium", "High"].map((p) => (
              <button
                key={p}
                type="button"
                className={`tf-chip ${priority === p ? "active" : ""}`}
                onClick={() => setPriority(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="tf-hint">Select the task priority</span>
        </div>

        {/* Status */}
        <div className="tf-field">
          <span className="tf-label">Status</span>
          <div className="tf-chip-row">
            {["To Do", "In Progress", "Completed"].map((s) => (
              <button
                key={s}
                type="button"
                className={`tf-chip ${status === s ? "active" : ""}`}
                onClick={() => setStatus(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <label className="tf-field">
          <span className="tf-label">Due Date</span>
          <input
            type="date"
            className="tf-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            disabled={loading}
          />
        </label>

        {/* Points */}
        <label className="tf-field">
          <span className="tf-label">Points</span>
          <input
            className="tf-input"
            type="number"
            placeholder="Enter points for this task"
            value={points}
            onChange={(e) =>
              setPoints(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={loading}
            min="0"
            max="100"
          />
        </label>

        {/* Actions */}
        <div className="tf-actions">
          <button
            type="button"
            className="tf-btn outline"
            onClick={() => navigate("/tasks/manage")}
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
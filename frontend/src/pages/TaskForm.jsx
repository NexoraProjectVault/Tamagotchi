// src/pages/TaskForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./TaskForm.css";
import { toUIValue, toBackendValue } from "../components/HelperComponents";

const taskServiceUrl = `${import.meta.env.VITE_API_GATEWAY_URL}/v1/task-service`; // API Gateway to task service

export function getAuthHeaders() {
  const token  = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");
  const h = { "Content-Type": "application/json" };
  if (token)  h.Authorization = `Bearer ${token}`;
  if (userId) h["X-User-Id"] = userId;
  return h;
}

// Helper to format ISO date to datetime-local format
const formatDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to convert datetime-local to ISO
const datetimeLocalToISO = (datetimeLocal) => {
  if (!datetimeLocal) return null;
  const date = new Date(datetimeLocal);
  return date.toISOString();
};


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
  const [recurrence, setRecurrence] = useState("");
  const [repeatEnd, setRepeatEnd] = useState("");
  

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("📝 TaskForm mounted, editingTask:", editingTask);
    
    if (editingTask) {
      console.log("✏️ Editing task:", editingTask);

      // Set all fields
      setName(editingTask.title || "");
      setDesc(editingTask.description || "");
      
      // Convert from backend format to UI format
      setStatus(toUIValue("status", editingTask.status) || "To Do");
      setPriority(toUIValue("priority", editingTask.priority) || "Low");
      setType(toUIValue("tag", editingTask.tags?.[0]) || "Feeding");
      
      setPoints(editingTask.points || "");

      setRecurrence(editingTask.repeat_every || "");

      if (editingTask.repeat_until) {
        const endDate = editingTask.repeat_until.split("T")[0];
        setRepeatEnd(endDate);
      } else {
        setRepeatEnd("");
      }
      
      // Format due datetime for datetime-local input
      if (editingTask.due_at) {
        const formattedDatetime = formatDatetimeLocal(editingTask.due_at);
        setDue(formattedDatetime);
        console.log("📅 Due datetime set to:", formattedDatetime);
      } else {
        // Default to tomorrow at 11:59 PM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0, 0);
        const formattedDatetime = formatDatetimeLocal(tomorrow.toISOString());
        setDue(formattedDatetime);
        console.log("📅 No due_at, setting default:", formattedDatetime);
      }
    } else {
      console.log("➕ Creating new task, setting defaults");
      
      // For new tasks, set defaults
      setName("");
      setDesc("");
      setStatus("To Do");
      setPriority("Low");
      setType("Feeding");
      setPoints("");
      setRecurrence("");
      setRepeatEnd("");

      // Default to tomorrow at 11:59 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      const formattedDatetime = formatDatetimeLocal(tomorrow.toISOString());
      setDue(formattedDatetime);
      console.log("📅 New task default due date:", formattedDatetime);
    }
  }, [editingTask]);

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {

      // Convert datetime-local to ISO format
      let dueDate = null;
      if (due) {
        dueDate = datetimeLocalToISO(due);
        if (!dueDate) {
          throw new Error("Invalid date format");
        }
      } else {
        // Default to tomorrow at 11:59 PM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0, 0);
        dueDate = tomorrow.toISOString();
      }
      const taskData = {
        title: name,
        description: desc,
        tags: [toBackendValue("tag", tag)],
        due_at: dueDate,
        priority: toBackendValue("priority", priority),
        points: Number(points) || 0,
        status: toBackendValue("status", status),
      };

      if (!isEdit) {
        // Only allow setting recurring when creating new task
        if (recurrence) {
          taskData.repeat_every = recurrence;
          if (repeatEnd) {
            taskData.repeat_until = new Date(repeatEnd + "T23:59:59Z").toISOString();
          }
        } else {
          taskData.repeat_every = null;
          taskData.repeat_until = null;
        }
      }



      let response;

      if (isEdit) {
        // Update existing task via PATCH
        console.log("Updating task:", editingTask.id);
        console.log("Payload:", taskData);
        response = await fetch(`${taskServiceUrl}/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(taskData),
        });
      } else {
        // Create new task via POST
        const postUrl = `${taskServiceUrl}/tasks`;
        console.log("POST URL:", postUrl);
        console.log("Payload:", taskData);

        response = await fetch(postUrl, {
          method: "POST",
          headers: getAuthHeaders(),
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
            {["To Do", "In Progress"].map((s) => (
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

        {/* Due Date and Time */}
        <label className="tf-field">
          <span className="tf-label">Due Date & Time</span>
          <input
            type="datetime-local"
            className="tf-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            disabled={loading}
          />
        </label>

        {/* 🔁 Recurring (only when creating new task) */}
        {!isEdit && (
          <div className="tf-field">
            <span className="tf-label">Repeat</span>
            <div className="tf-chip-row">
              <button
                type="button"
                className={`tf-chip ${recurrence === "" ? "active" : ""}`}
                onClick={() => setRecurrence("")}
                disabled={loading}
              >
                Does not repeat
              </button>
              <button
                type="button"
                className={`tf-chip ${recurrence === "daily" ? "active" : ""}`}
                onClick={() => setRecurrence("daily")}
                disabled={loading}
              >
                Daily
              </button>
              <button
                type="button"
                className={`tf-chip ${recurrence === "weekly" ? "active" : ""}`}
                onClick={() => setRecurrence("weekly")}
                disabled={loading}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`tf-chip ${recurrence === "monthly" ? "active" : ""}`}
                onClick={() => setRecurrence("monthly")}
                disabled={loading}
              >
                Monthly
              </button>
            </div>

            {recurrence && (
              <label className="tf-subfield" style={{ marginTop: "0.75rem" }}>
                <span className="tf-label">End date (optional)</span>
                <input
                  type="date"
                  className="tf-input"
                  value={repeatEnd}
                  onChange={(e) => setRepeatEnd(e.target.value)}
                  disabled={loading}
                />
              </label>
            )}
          </div>
        )}



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
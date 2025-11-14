// src/pages/ManageTasks.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ManageTasks.css";
import "./manage-theme.css";

const baseUrl = import.meta.env.VITE_API_GATEWAY_URL;
const taskUrl = `${baseUrl}/v1/task-service/tasks`;

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


export default function ManageTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");//
  const [tagFilter, setTagFilter] = useState("");//
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false); 
  const [view, setView] = useState("all"); 
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("-id");

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10; 


  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();

        if (view === "trash") {
          qs.set("only_deleted", "1");
        } else {
          if (sort) {
            qs.set("sort", sort);
          }
        }

        const url = `${taskUrl}${qs.toString() ? `?${qs.toString()}` : ""}`;
        console.log("[ManageTasks] GET:", url);


        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.statusText}`);
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setTasks(items);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setTasks([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

      fetchTasks();
  }, [view, sort]);
  
  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")){
      return;
    }
    try{
      // delete the task given the id
      const response = await fetch(`${taskUrl}/${taskId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status !== 204 && !response.ok) {
        throw new Error(`Failed to delete task with id-${taskId}: ${response.statusText}`);
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message);
    }
  };

  const restoreTask = async (taskId) => {
    try {
      const response = await fetch(`${taskUrl}/${taskId}/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to restore task with id-${taskId}: ${response.statusText}`
        );
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Restore error:", err);
      setError(err.message);
    }
  };

  const startTask = async (taskId) => {
    try {
      const response = await fetch(`${taskUrl}/${taskId}/start`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to start task with id-${taskId}: ${response.statusText}`
        );
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: "in_progress" } : task
        )
      );
    } catch (err) {
      console.error("Start error:", err);
      setError(err.message);
    }
  };


  const completeTask = async (taskId) => {
    try{
      const response = await fetch(`${taskUrl}/${taskId}/complete`, {
        method: "POST",
        headers: getAuthHeaders(), 
        body: JSON.stringify({
          status: "completed",
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok){
        throw new Error(`Failed to set status of task with id-${taskId} to completed: ${response.statusText}`);
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: "completed" } : task
        )
      );
    } catch (err) {
      console.error("Error completing task:", err);
      setError(err.message);
    }
  };

  const triggerSearch = () => {
    const term = searchInput.trim();
    setSearch(term);
    setIsSearching(!!term); 
  };

  const clearSearch = () => {
    setSearch("");
    setSearchInput("");
    setIsSearching(false);
  };


  const visibleTasks = tasks.filter((task) => {
    if (view === "trash") {
      return !!task.deleted_at;
    }
    
    if (task.deleted_at) {
      return false;
    }

    // When "All tags" is selected AND no status filter is applied
    if (tagFilter === "" && statusFilter === "") {
      // Only show active tasks (not completed)
      if (task.status === "completed") {
        return false;
      }
    }

    if (tagFilter) {
      const tags = Array.isArray(task.tags) ? task.tags : [];
      if (!tags.includes(tagFilter)) {
        return false;
      }
    }

    if (statusFilter) {
      const raw = (task.status || "").toLowerCase();

      const normalized = raw === "done" ? "completed" : raw;

      if (normalized !== statusFilter) {
        return false;
      }
    }

    if (search) {
      const s = search.toLowerCase().trim();
      const title = (task.title || "").toLowerCase();
      const desc = (task.description || "").toLowerCase();
      if (!title.includes(s) && !desc.includes(s)) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(visibleTasks.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTasks = visibleTasks.slice(startIndex, startIndex + PAGE_SIZE);



  return (
    <div className="mt-page">
      <header className="mt-hero">
        <h1 className="mt-title">Your Task List</h1>
        <p className="mt-subtitle">
          Stay productive by taking care of your Tamagotchi while completing tasks!
        </p>

        <div className="mt-search-wrap">
          <div className="mt-search-inner">
            <input //search input
              className="mt-search-input"
              placeholder="Search Task"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {   
                if (e.key === "Enter") {
                  triggerSearch();
                }
              }}
            />
            {isSearching ? (
                <button
                  className="mt-search-btn mt-cancel-btn"
                  onClick={clearSearch}
                >
                  Cancel
                </button>
              ) : (
                <button //search button
                  className="mt-search-btn"
                  onClick={triggerSearch} 
                >
                  Search 
                </button>
              )}
          </div>

          {view === "trash" ? (
            <button
              className="mt-back-btn"
              onClick={() => {
                setView("all");

              }}
            >
              ← Back
            </button>
          ) : (
            <button
              className="mt-trash-btn"
              onClick={() => {
                setView("trash");
                clearSearch();
              }}
              title="View Trash"
            >
              🗑️
            </button>
          )}
        </div>


        <div className="mt-filter-rows">

          {/* row：tag */}
          <div className="mt-filter-row">
            <select
              className="mt-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              disabled={view === "trash"} 
            >
              <option value="-id">Newest</option>
              <option value="title">Title A-Z</option>
              <option value="-title">Title Z-A</option>
              <option value="priority">Priority</option>
              <option value="due_at">Due date</option>
            </select>
            <div className="mt-chip-row">
              <button
                className={`mt-chip ${tagFilter === "" ? "active" : ""}`}
                onClick={() => setTagFilter("")}
              >
                All tags
              </button>
              <button
                className={`mt-chip ${tagFilter === "feeding" ? "active" : ""}`}
                onClick={() => setTagFilter("feeding")}
              >
                Feeding
              </button>
              <button
                className={`mt-chip ${tagFilter === "cleaning" ? "active" : ""}`}
                onClick={() => setTagFilter("cleaning")}
              >
                Cleaning
              </button>
              <button
                className={`mt-chip ${tagFilter === "playing" ? "active" : ""}`}
                onClick={() => setTagFilter("playing")}
              >
                Playing
              </button>

            </div>
          </div>

          {/* row：status */}
          <div className="mt-filter-row">
            <div className="mt-sort-placeholder" />

            <div className="mt-chip-row">
              <button
                className={`mt-chip ${statusFilter === "" ? "active" : ""}`}
                onClick={() => setStatusFilter("")}
              >
                All status
              </button>
              <button
                className={`mt-chip ${statusFilter === "todo" ? "active" : ""}`}
                onClick={() => setStatusFilter("todo")}
              >
                To do
              </button>
              <button
                className={`mt-chip ${statusFilter === "in_progress" ? "active" : ""}`}
                onClick={() => setStatusFilter("in_progress")}
              >
                In progress
              </button>
              <button
                className={`mt-chip ${statusFilter === "completed" ? "active" : ""}`}
                onClick={() => setStatusFilter("completed")}
              >
                Done
              </button>
            </div>
          </div>
        </div>

      </header>

      <section className="mt-list">
        {/* Show loading state */}
        {loading && <p className="mt-desc">Loading tasks...</p>}

        {/* Show error state */}
        {error && !loading && (
          <p style={{ color: "red" }}>Error: {error}</p>
        )}

        {/* Show tasks */}
        {!loading && !error && visibleTasks.length === 0 && (
          <p className="mt-desc">
            {view === "trash"
              ? "Trash is empty."
              : "No tasks yet. Create your first task!"}
          </p>
        )}


        {!loading &&
          !error &&
          paginatedTasks.map((task) => (
            <article key={task.id} className="mt-item">
              <div className="mt-item-left">
                <h2 className="mt-item-title">
                  {task.title || "Untitled Task"}</h2>
                <div className="mt-badges">
                  {task.priority && (
                  <span className={`mt-badge pri-${task.priority?.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  )}
                  {task.tags?.map((tag) => (
                    <span key={tag} className="mt-badge">
                      {tag}
                    </span>
                  ))}
                  {view === "trash" && (
                    <span className="mt-badge trash-label">In Trash</span>
                  )}
                </div>
                <p className="mt-desc">{task.description}</p>
              </div>

              <div className="mt-item-middle">
                <span className="mt-due-label">Due:</span>{" "}
                <span className="mt-due-val">
                  {task.due_at
                    ? new Date(task.due_at.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : "No due date"}
                </span>
                {task.points != null && (
                  <div className="mt-points">Points: {task.points}</div>
                )}
                <div className="mt-status">
                  Status: {task.status || "unknown"}
                </div>
              </div>

              <div className="button-container">
                {view === "trash" ? (
                  <>
                    <button
                      className="mt-restore-btn"
                      onClick={() => restoreTask(task.id)}
                    >
                      Restore
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="mt-edit-btn"
                      onClick={() =>
                        navigate("/tasks/form", {
                          state: { task: task },
                        })
                      }
                      disabled={task.status === "completed"}   
                      title={
                        task.status === "completed"
                          ? "Completed tasks cannot be edited"
                          : "Edit this task"
                      }
                    >
                      Edit
                    </button>


                    {task.status === "todo" && (
                      <button className="mt-start-btn"
                        onClick={() => startTask(task.id)}
                        disabled={task.status !== "todo"}
                      >
                        Start
                      </button>
                    )}

                    {task.status === "in_progress" && (
                      <button
                        className="mt-done-btn"
                        onClick={() => completeTask(task.id)}
                      > 
                        DONE
                      </button>
                    )}
                    {task.status === "completed" && (
                      <span className="mt-complete-label"> Completed</span>
                    )}
                    <button
                      className="mt-delete-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      DELETE
                    </button>
                      
                  </>
                )}
              </div>
            </article>
          ))}
        
        {view === "all" && (
          <div className="mt-create-wrap">
            <button
              className="mt-create-btn"
              onClick={() => navigate("/tasks/form")}
            >
              + Create New Task
            </button>
          </div>
        )}

        {!loading && !error && visibleTasks.length > 0 && (
          <div className="mt-pagination">
            <button
              className="mt-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>

            <div className="mt-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`mt-page-btn ${
                    page === currentPage ? "mt-page-btn-active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="mt-page-btn"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              Next ›
            </button>
          </div>
        )}

      </section>
    </div>
  );
}
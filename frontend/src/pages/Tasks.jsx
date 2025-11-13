import React, { useRef, useState, useEffect } from "react";
import "./Tasks.css";
import { useNavigate } from "react-router-dom";
import { toUIValue } from "../components/HelperComponents";
import petRelatesImg from "../assets/checklist_pg.png";  


export function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (userId) h["X-User-Id"] = userId;
  return h;
}

function TasksSidebar({ onDashboardClick, onStatsClick, onPetClick, activeKey }) {
  const items = [
    { key: "dashboard", icon: "📝", label: "Dashboard" },
    { key: "stats", icon: "📊", label: "Statistics" },
    { key: "pet", icon: "🐱", label: "Pet Relates" },
  ];

  return (
    <aside className="tasks-sidenav">
      <ul className="tasks-navlist">
        {items.map((it) => (
          <li
            key={it.key}
            className={`tasks-navitem ${activeKey === it.key ? "active" : ""}`}
            onClick={() => {
              if (it.key === "dashboard" && onDashboardClick) onDashboardClick();
              if (it.key === "stats" && onStatsClick) onStatsClick();
              if (it.key === "pet" && onPetClick) onPetClick();
            }}
          >
            <span className="navicon">{it.icon}</span>
            <span className="navlabel">{it.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Format due date to readable string
const formatDueDate = (due_at) => {
  if (!due_at) return "No deadline";

  const dueDate = new Date(due_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  dueDate.setHours(0, 0, 0, 0);

  // Check if due date is today
  if (dueDate.getTime() === today.getTime()) {
    return "Today";
  }

  // Check if due date is tomorrow
  if (dueDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }

  // Calculate days left
  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (daysLeft > 0) {
    return `${daysLeft} days left`;
  }

  // Return formatted date for past dates
  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Check if task is overdue and get days overdue
const getOverdueInfo = (due_at) => {
  if (!due_at) return null;

  const dueDate = new Date(due_at);
  const now = new Date();

  // If the due datetime has passed, it's overdue
  if (now > dueDate) {
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    return daysOverdue + 1; // Round up to at least 1 day
  }

  return null;
};

export default function TasksPageUI() {
  const dashboardRef = useRef(null);
  const statsRef = useRef(null);
  const navigate = useNavigate();
  const petRef = useRef(null);
  const [active, setActive] = useState("dashboard");
  const [nextTasksByTag, setNextTasksByTag] = useState({});
  const [topThreeTasksByTag, setTopThreeTasksByTag] = useState({});
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });

  const getAuthHeadersLocal = () => {
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

  // Fetch active tasks on component mount
  useEffect(() => {
    fetchAndProcessTasks();
    fetchRoadmaps();
  }, []);

  const fetchAndProcessTasks = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.API_GATEWAY_URL;

      const response = await fetch(`${baseUrl}/v1/task-service/tasks`, {
        method: "GET",
        headers: getAuthHeadersLocal(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      const allTasks = data.items || [];

      // Calculate statistics from ALL tasks
      const total = allTasks.length;
      const completed = allTasks.filter((task) => task.status === "completed").length;
      const inProgress = allTasks.filter((task) => task.status === "in_progress").length;
      const pending = allTasks.filter((task) => task.status !== "completed").length;

      console.log("Task stats:", { total, completed, inProgress, pending });

      // Update stats state
      setStats({
        total,
        completed,
        inProgress,
        pending,
      });

      // Filter active tasks (not completed)
      const activeTasks = allTasks.filter((task) => task.status !== "completed");

      console.log("Active tasks:", activeTasks);

      // Get the next task for each tag
      const nextTasks = {
        feeding: getNextTaskByTag(activeTasks, "feeding"),
        cleaning: getNextTaskByTag(activeTasks, "cleaning"),
        playing: getNextTaskByTag(activeTasks, "playing"),
      };

      // Get top 3 upcoming tasks for each tag (exclude overdue)
      const topThreeTasks = {
        feeding: getTopThreeUpcomingTasks(activeTasks, "feeding"),
        cleaning: getTopThreeUpcomingTasks(activeTasks, "cleaning"),
        playing: getTopThreeUpcomingTasks(activeTasks, "playing"),
      };

      console.log("Next tasks by tag:", nextTasks);
      console.log("Top three tasks by tag:", topThreeTasks);

      setNextTasksByTag(nextTasks);
      setTopThreeTasksByTag(topThreeTasks);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoadmaps = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.API_GATEWAY_URL;

      const response = await fetch(`${baseUrl}/v1/data-tracking-service/roadmaps`, {
        method: "GET",
        headers: getAuthHeadersLocal(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch roadmaps: ${response.statusText}`);
      }

      const data = await response.json();
      setRoadmaps(data || []);
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
      setRoadmaps([]);
    } finally {
      setLoading(false);
    }
  };

  // Get the task with the soonest deadline for a specific tag
  const getNextTaskByTag = (tasks, tag) => {
    if (!tasks || tasks.length === 0) return null;

    // Filter tasks by tag
    const tasksWithTag = tasks.filter(
      (task) => task.tags && task.tags.includes(tag)
    );

    if (tasksWithTag.length === 0) return null;

    // Sort by due_at date and get the first one
    const sortedTasks = tasksWithTag.sort((a, b) => {
      const dateA = new Date(a.due_at || Infinity);
      const dateB = new Date(b.due_at || Infinity);
      return dateA - dateB;
    });

    console.log(`Next task for tag "${tag}":`, sortedTasks[0]);
    return sortedTasks[0];
  };

  // Get top 3 upcoming (non-overdue) tasks for a specific tag
  const getTopThreeUpcomingTasks = (tasks, tag) => {
    if (!tasks || tasks.length === 0) return [];

    const now = new Date();

    const tasksWithTag = tasks.filter(
      (task) => task.tags && task.tags.includes(tag)
    );

    // Filter out overdue tasks (only include tasks with due_at in the future)
    const upcomingTasks = tasksWithTag.filter((task) => {
      if (!task.due_at) return true; // Include tasks with no due date
      const dueDate = new Date(task.due_at);
      return dueDate >= now; // Only future tasks
    });

    // Sort by due date (nearest first)
    const sortedTasks = upcomingTasks.sort((a, b) => {
      const dateA = new Date(a.due_at || Infinity);
      const dateB = new Date(b.due_at || Infinity);
      return dateA - dateB;
    });

    // Return top 3
    return sortedTasks.slice(0, 3);
  };

  const scrollToDashboard = () => {
    setActive("dashboard");
    dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToStats = () => {
    setActive("stats");
    statsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToPet = () => {
    setActive("pet");
    petRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tagConfig = {
    feeding: { icon: "🍎", label: "Feed" },
    cleaning: { icon: "🧹", label: "Clean" },
    playing: { icon: "🎮", label: "Play with" },
  };

  return (
    <div className="tasks-layout">
      <TasksSidebar
        onDashboardClick={scrollToDashboard}
        onStatsClick={scrollToStats}
        onPetClick={scrollToPet}
        activeKey={active}
      />

      <main className="tasks-main">
        {/* ===== Dashboard Section ===== */}
        <section ref={dashboardRef} className="tasks-dashboard-section fullpage">
          <header className="tasks-hero">
            <h1 className="tasks-title">Your Tasks</h1>
            <button className="manage-btn" onClick={() => navigate("/tasks/manage")}>
              Manage Your Task
            </button>
          </header>

          {loading && <p>Loading tasks...</p>}
          {error && <p style={{ color: "red" }}>Error: {error}</p>}

          <section className="task-grid">
            {Object.entries(tagConfig).map(([tag, config]) => {
              const task = nextTasksByTag[tag];
              const topThreeTasks = topThreeTasksByTag[tag] || [];

              return (
                <article key={tag} className="task-card-container">
                  <div className="task-card">
                    <div className="icon-circle">{config.icon}</div>
                    <h3 className="task-name">
                      {`${config.label} Tamagotchi`}
                    </h3>
                    <div className="task-sub">
                      {task ? toUIValue("tag", task.tags[0]) : "No active tasks"}
                    </div>
                    <div className="due-xl">
                      Due: {task ? formatDueDate(task.due_at) : "N/A"}
                    </div>
                  </div>

                  {/* Top 3 Upcoming Tasks */}
                  {topThreeTasks.length > 0 && (
                    <div className="upcoming-tasks-section">
                      <h4 className="upcoming-tasks-title">Upcoming</h4>
                      <ul className="upcoming-tasks-list">
                        {topThreeTasks.map((t, idx) => (
                          <li key={idx} className="upcoming-task-item">
                            <span className="task-index">{idx + 1}</span>
                            <div className="task-details">
                              <div className="upcoming-task-name">{t.title || "Untitled"}</div>
                              <div className="upcoming-task-due">
                                {formatDueDate(t.due_at)}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {topThreeTasks.length === 0 && (
                    <div className="upcoming-tasks-section">
                      <p className="no-upcoming">No upcoming tasks</p>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </section>

        {/* ===== Statistics Section ===== */}
        <section ref={statsRef} className="tasks-stats-section fullpage">
          <h2 className="stats-title">Task Overview</h2>
          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-subtitle">Total Tasks</div>
              <div className="stats-number">{stats.total}</div>
            </div>
            <div className="stats-card">
              <div className="stats-subtitle">Completed Tasks</div>
              <div className="stats-number">{stats.completed}</div>
              <div className="stats-note">
                {stats.total > 0
                  ? `${Math.round((stats.completed / stats.total) * 100)}% complete`
                  : "0% complete"}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-subtitle">In Progress</div>
              <div className="stats-number">{stats.inProgress}</div>
            </div>
            <div className="stats-card">
              <div className="stats-subtitle">Pending Tasks</div>
              <div className="stats-number">{stats.pending}</div>
            </div>
          </div>
          <h2 className="stats-title">Roadmap Overview</h2>
          <header className="tasks-hero">
            <button className="manage-btn" onClick={() => navigate("/roadmaps/manage")}>
              Manage Your Roadmap
            </button>
          </header>
          {loading ? (
            <div className="stats-loading">Loading roadmaps...</div>
          ) : roadmaps.length === 0 ? (
            <div className="stats-empty">
              <p>No roadmaps found. Create your first roadmap to see statistics here!</p>
            </div>
          ) : (
            <div className="stats-grid">
              {roadmaps.map((roadmap) => {
                const totalTasks = roadmap.total_tasks || 0;
                const completedTasks = roadmap.completed_tasks || 0;
                const pendingTasks = Math.max(0, totalTasks - completedTasks);
                const percentage = roadmap.progress_percentage || 0;

                return (
                  <div key={roadmap.id} className="roadmap-stats-card">
                    <div className="roadmap-title">{roadmap.title}</div>
                    <div className="roadmap-category">{roadmap.category}</div>
                    <div className="roadmap-stats-details">
                      <div className="roadmap-stat-item">
                        <div className="roadmap-stat-label">Total Tasks</div>
                        <div className="roadmap-stat-value">{totalTasks}</div>
                      </div>
                      <div className="roadmap-stat-item">
                        <div className="roadmap-stat-label">Completed</div>
                        <div className="roadmap-stat-value completed">{completedTasks}</div>
                      </div>
                      <div className="roadmap-stat-item">
                        <div className="roadmap-stat-label">In Progress</div>
                        <div className="roadmap-stat-value pending">{pendingTasks}</div>
                      </div>
                      <div className="roadmap-stat-item">
                        <div className="roadmap-stat-label">Overall Completion</div>
                        <div className="roadmap-stat-value progress">{percentage}%</div>
                      </div>
                    </div>
                    <div className="roadmap-progress-bar">
                      <div
                        className="roadmap-progress-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== Pet Relates Section ===== */}
        <section ref={petRef} className="tasks-pet-section fullpage">
          <h2 className="pet-title">Pet Relates</h2>
          <div className="pet-placeholder">
            <img
              src={petRelatesImg}
              alt="Pet relates illustration"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
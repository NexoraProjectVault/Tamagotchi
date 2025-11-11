// src/pages/Tasks.jsx
import React, { useRef, useState, useEffect } from "react";
import "./Tasks.css";
import { useNavigate } from "react-router-dom";
import { toUIValue } from "../components/HelperComponents";

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
  if (!due_at) return "N/A";
  
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
    year: "numeric" 
  });
};

export default function TasksPageUI() {
  const dashboardRef = useRef(null);
  const statsRef = useRef(null);
  const navigate = useNavigate();
  const petRef = useRef(null);
  const [active, setActive] = useState("dashboard");
  const [nextTasksByTag, setNextTasksByTag] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });


  // Fetch active tasks on component mount
  useEffect(() => {
    fetchAndProcessTasks();
  }, []);

  const fetchAndProcessTasks = async () => {
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
      
      console.log("Next tasks by tag:", nextTasks);
      setNextTasksByTag(nextTasks);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
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
    feeding: { icon: "✅", label: "Feed" },
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
              
              return (
                <article key={tag} className="task-card">
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
                {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% complete`: "0% complete"
                }
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
        </section>

        {/* ===== Pet Relates Section ===== */}
        <section ref={petRef} className="tasks-pet-section fullpage">
          <h2 className="pet-title">Pet Relates</h2>
          <div className="pet-placeholder">
            <p>Keep your Tamagotchi happy by staying on top of your tasks!</p>
          </div>
        </section>
      </main>
    </div>
  );
}
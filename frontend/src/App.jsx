/**
 * App.jsx
 * ----------------------------
 * Main application component that defines page structure and routes.
 * Includes sidebar navigation, individual section layouts (Home, Pet, Tasks, Profile, Settings),
 * and a shared global footer.
 * ----------------------------
 * Editor: 
 * RichelleP, 2025-10
 * Lynneliu, 2025-10
 */

/* Import necessary modules and components */
import React, { useEffect, useState, Fragment } from "react";
/* Google Auth import Login from "./pages/Login.jsx";*/
import FloatingQuickSwitch from "./components/FloatingQuickSwitch.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import RouteChangeLoader from "./components/RouteChangeLoader.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import ManageTasks from "./pages/ManageTasks.jsx";
import TaskForm from "./pages/TaskForm.jsx";
import TasksPageUI from "./pages/Tasks.jsx";
import PetOverview from "./pages/PetOverview.jsx";
import "./App.css";
import { Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";



/* ===== Navigator===== */
const NAV_ITEMS = [
  { icon: "🏠", label: "Home",    key: "home", active: true },
  { icon: "🐾", label: "Pet",     key: "pet"  },
  { icon: "📋", label: "Tasks",   key: "tasks" },
  { icon: "👤", label: "Profile", key: "profile" },
];

const priorityMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const getIconForTag = (tag) => {
  const icons = {
    feeding: "🍎",
    cleaning: "🧹",
    playing: "🎮",
  };
  return icons[tag?.toLowerCase()] || "📝";
};

/* ===== Event Notification Popup ===== */
function EventNotification({ event, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade-out animation
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Map event types to readable names and icons
  const eventConfig = {
    user_created: { icon: "👤", label: "User Created", color: "#3b82f6" },
    user_updated: { icon: "👤", label: "User Updated", color: "#8b5cf6" },
    task_created: { icon: "✏️", label: "Task Created", color: "#10b981" },
    task_pending: { icon: "⏳", label: "Task Started", color: "#f59e0b" },
    task_completed: { icon: "✅", label: "Task Completed", color: "#06b6d4" },
    pet_created: { icon: "🐾", label: "Pet Created", color: "#ec4899" },
    pet_updated: { icon: "🐾", label: "Pet Updated", color: "#f43f5e" },
  };

  const config = eventConfig[event.type] || {
    icon: "📢",
    label: "Event",
    color: "#6b7280",
  };

  return (
    <div
      className={`event-notification ${isVisible ? "show" : "hide"}`}
      style={{ "--notification-color": config.color }}
    >
      <div className="notification-icon">{config.icon}</div>
      <div className="notification-content">
        <div className="notification-title">{config.label}</div>
        <div className="notification-message">
          {event.data.title || event.data.name || `ID: ${event.data.id || event.data.task_id}`}
        </div>
        <div className="notification-time">
          {new Date(event.timestamp).toLocaleTimeString()}
        </div>
      </div>
      <button
        className="notification-close"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      >
        ✕
      </button>
    </div>
  );
}


/* ===== Event Notifications Container ===== */
function EventNotificationsContainer() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/v1";
    
    const eventSource = new EventSource(`${backendUrl}/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Event received:", data);
        
        // Add notification with unique ID
        const notification = {
          id: `${Date.now()}-${Math.random()}`,
          ...data,
        };
        setNotifications((prev) => [...prev, notification]);
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ SSE connection error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <div className="notifications-container">
      {notifications.map((notif) => (
        <EventNotification
          key={notif.id}
          event={notif}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  );
}


/* ===== Side bar: click will scroll to each section ===== */
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const goToSection = (id) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return (
    <aside className="sidebar">
      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const onClick =
            item.key === "pet"
              ? () => goToSection("pet")
              : item.key === "home"
              ? () => goToSection("home")
              : item.key === "tasks"
              ? () => {
                if (location.pathname !== "/") {
                  navigate("/");
                  requestAnimationFrame(() => {
                    document.getElementById("progress")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                } else {
                  document.getElementById("progress")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }
              : item.key === "profile"
              ? () => goToSection("profile") 
              : () => goToSection("home");
          return (
            <button key={item.key} className="nav-item" onClick={onClick}>
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


/* ===== Task priority and badge ===== */
function PriorityBadge({ level }) {
  const cls =
    level === "High" ? "badge high" :
    level === "Low"  ? "badge low"  : "badge medium";
  return <span className={cls}>{level} Priority</span>;
}

function TaskItem({ emoji, title, tag, priority }) {
  return (
    <div className="task-row">
      <div className="task-left">
        <div className="task-avatar" aria-hidden>{emoji}</div>
        <div className="task-texts">
          <div className="task-title">{title}</div>
          <div className="task-tag">{tag}</div>
        </div>
      </div>
      <PriorityBadge level={priority} />
    </div>
  );
}


/* ===== User（Profile）===== */
function UserSection() {
  const navigate = useNavigate();
  return (
    <section id="profile" className="user-section">
      <div className="user-left">
        <div className="user-avatar" aria-hidden />
        <div className="user-info">
          <div className="user-name">User Name</div>
          <div className="user-greet">Welcome back! Let&apos;s take care of Pixel.</div>
        </div>
      </div>
      <div className="user-actions">
        <button
          className="btn btn-outline"
          onClick={() => navigate("/user")}
        >
          View Profile
        </button>
        <button
          className="btn btn-solid"
          onClick={() => navigate("/tasks")}
        >
          Start New Task
        </button>
      </div>
      <hr className="user-divider" />
    </section>
  );
}


/* ===== Pet Snapshot (the card) ===== */
function PetSnapshotCard() {
  return (
    <section id="pet" className="pet-section">
      <h2 className="pet-title">Pet Snapshot</h2>
      <div className="pet-card">
        <div className="pet-avatar-placeholder" />
        <div className="pet-info">
          <div className="pet-name">
            <b>Pet Name:</b>{" "}
            <Link to="/pet-overview" className="pet-link">Pixel</Link> 
          </div>
          <div className="pet-level">Level: 5</div>
          <div className="pet-badges">
            <span className="pill">XP: 200/500</span>
            <span className="pill">Growth: 60%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const isThisWeek = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  
  // start at (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  // end at (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
};

/* ===== Home page (includes Tasks + pet) ===== */
function HomePage() {
  const navigate = useNavigate();
  const [thisWeekTasks, setThisWeekTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
      
      // Filter active tasks due this week (not completed)
      const activeThisWeekTasks = allTasks.filter(
        (task) => isThisWeek(task.due_at) && task.status !== "completed"
      );
      
      // Sort by due date
      activeThisWeekTasks.sort((date1, date2) => {
        const dateA = new Date(date1.due_at);
        const dateB = new Date(date2.due_at);
        return dateA - dateB;
      });
      
      console.log("Active tasks this week:", activeThisWeekTasks);
      setThisWeekTasks(activeThisWeekTasks);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app">
        <Sidebar />
        <main id="home" className="main">
          <div className="hero-block">
            <h1 className="hero">Today's Tasks</h1>
            <button
              className="edit-solid-btn"
              onClick={() => navigate("/tasks")}
            >
              Edit Tasks ➜
            </button>
          </div>
        </main>


        <section className="tasks" id="tasks">
          {loading && <p>Loading tasks...</p>}
          {error && <p style={{ color: "red" }}>Error: {error}</p>}
          
          {!loading && !error && thisWeekTasks.length === 0 && (
            <p>No active tasks this week</p>
          )}
          
          {!loading &&
            !error &&
            thisWeekTasks.map((task, i) => (
              <Fragment key={task.id} >
                {/* {getIconForTag(task.tags?.[0])} */}
                <TaskItem {...task} priority={priorityMap[task.priority?.toLowerCase()]} />
                {i !== thisWeekTasks.length - 1 && <hr className="divider" />}
              </Fragment>
            ))}
        </section>

        
      </div>
      {/* scroll down to see */}
      <PetSnapshotCard />
      {/* scroll down to see */}
      <section id="progress" className="home-insights">
        <ProgressSection />
      </section>
      <section id="neglected" className="home-insights">
        <NeglectedSection />
      </section>
      <UserSection />
    </>
  );
}


/* ===== /pet page (empty occuppier) ===== */
function PetDetailPage() {
  return (
    <div className="app">
      <Sidebar />
      <main className="pet-detail-main">
        <h1 className="hero">Pixel</h1>
        <p className="muted">This is a placeholder for the Pet detail page. You can build it later.</p>
        <Link to="/" className="back-link">← Back to Home</Link>
      </main>
    </div>
  );
}


/* ===== /tasks page (empty occuppier) ===== */
function TasksPlaceholderPage() {
  return (
    <div className="app">
      <Sidebar />
      <main className="pet-detail-main">
        <h1 className="hero">Tasks</h1>
        <p className="muted">This is a placeholder for the Tasks page. You can build it later.</p>
        <Link to="/" className="back-link">← Back to Home</Link>
      </main>
    </div>
  );
}


/* ===== /settings page (empty occuppier) ===== */
function SettingsPlaceholderPage() {
  return (
    <div className="app">
      <Sidebar />
      <main className="pet-detail-main">
        <h1 className="hero">Settings</h1>
        <p className="muted">This is a placeholder for the Settings page. You can build it later.</p>
        <Link to="/" className="back-link">← Back to Home</Link>
      </main>
    </div>
  );
}


/* ===== Progress / Neglected section ===== */
function ProgressSection() {
  return (
    <section className="section">
      <h1 className="section-title">Progress This Week</h1>
      <div className="card">
        <div className="card-title">Task Completion</div>
        <div className="card-subtitle">Tasks Completed</div>
        <div className="bar-chart-placeholder">
          <div className="bar" style={{height:'64%'}} />
          <div className="bar" style={{height:'48%'}} />
          <div className="bar" style={{height:'32%'}} />
          <div className="bar" style={{height:'50%'}} />
          <div className="bar" style={{height:'40%'}} />
          <div className="bar" style={{height:'70%'}} />
          <div className="bar" style={{height:'42%'}} />
        </div>
        <div className="card-axis-note">Days</div>
      </div>
    </section>
  );
}

function NeglectedSection() {
  return (
    <section className="section">
      <h1 className="section-title">Neglected Categories</h1>
      <p className="section-subtitle">Don't forget to engage with your tasks!</p>
      <div className="neglected-grid">
        <div className="neg-card">
          <div className="neg-title">Fitness</div>
          <div className="neg-value">2 tasks neglected</div>
          <div className="neg-delta">↓ 1</div>
        </div>
        <div className="neg-card">
          <div className="neg-title">Reading</div>
          <div className="neg-value">1 task neglected</div>
          <div className="neg-delta">↓ 0</div>
        </div>
        <div className="neg-card">
          <div className="neg-title">Work</div>
          <div className="neg-value">3 tasks neglected</div>
          <div className="neg-delta">↓ 2</div>
        </div>
      </div>
    </section>
  );
}


/* ===== Route list ===== */
export default function App() {

  return (
    <>
      <div className="page-bg-fixed" />
        <RouteChangeLoader minDuration={1000} delay={0} />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pet" element={<PetDetailPage />} />
          <Route path="/tasks" element={<TasksPageUI />} />
          <Route path="/tasks/manage" element={<ManageTasks />} />
          <Route path="/tasks/form" element={<TaskForm />} />
          <Route path="/pet-overview" element={<PetOverview />} />
          <Route path="/settings" element={<SettingsPlaceholderPage />} />
          <Route path="/user" element={<UserProfile />} />
        </Routes>

        <FloatingQuickSwitch /> 

        {/* Global Footer, shared by all sections */}
        <footer className="global-footer">
          <div className="footer-links">
            <a href="#" className="footer-link">Help</a>
            <a href="#" className="footer-link">FAQ</a>
            <a href="#" className="footer-link">Support</a>
            <a href="#" className="footer-link">Privacy Policy</a>
          </div>
          {/* Health Check for backend */}
          <button
            className="footer-health-btn"
            onClick={() => window.location.href = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/v1/health`}
          >
            Health Check
          </button>
        </footer>
    </>
  );
}
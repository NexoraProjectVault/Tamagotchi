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
/* Import Pet_Service helper functions */
import { fetchPetMe, fetchPetStatus } from "./pages/PetOverview.jsx";
/* Google Auth import Login from "./pages/Login.jsx";*/
import RequireAuth from "./auth/RequireAuth.jsx";
import RedirectIfAuthed from "./auth/RedirectIfAuthed.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import RouteChangeLoader from "./components/RouteChangeLoader.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import ManageTasks from "./pages/ManageTasks.jsx";
import TaskForm from "./pages/TaskForm.jsx";
import TasksPageUI from "./pages/Tasks.jsx";
import PetOverview from "./pages/PetOverview.jsx";
import Help from "./pages/Help";
import FAQ from "./pages/FAQ";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FloatingQuickSwitch from "./components/FloatingQuickSwitch.jsx";
import FloatingMusicToggle from "./components/FloatingMusicToggle.jsx";

import "./App.css";
import { Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import ManageRoadmaps from "./pages/ManageRoadmaps.jsx";
import RoadmapForm from "./pages/RoadmapForm.jsx";
import Welcome from "./pages/Welcome.jsx";
import SelectPet from "./pages/SelectPet.jsx";
import CursorTrail from "./components/CursorTrail.jsx";

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

/* ===== Side bar: click will scroll to each section ===== */
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    window.location.href = "/login"; // redirect
  }

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
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // 1) Try localStorage first
    const storedName = localStorage.getItem("user_name");
    const storedEmail = localStorage.getItem("user_email");

    if (storedName && storedName.trim()) {
      setUserName(storedName.trim());
    } else if (storedEmail) {
      setUserName(storedEmail.split("@")[0]);
    } else {
      setUserName("User");
    }

    // 2) Always fetch current user to override any stale cache
    const token = localStorage.getItem("access_token");
    const baseUrl = import.meta.env.API_GATEWAY_URL;
    if (token) {
      fetch(`${baseUrl}/v1/user-service/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          const n = (d.name && d.name.trim()) || (d.email ? d.email.split("@")[0] : "User");
          setUserName(n);
          // keep cache in sync for next mount
          localStorage.setItem("user_name", d.name || "");
          localStorage.setItem("user_email", d.email || "");
          if (d.avatar_emoji) localStorage.setItem("user_avatar_emoji", d.avatar_emoji);
          if (d.id != null) localStorage.setItem("user_id", String(d.id));
        })
        .catch(() => {});
    

    }
  }, []);

  return (
    <section id="profile" className="user-section">
      <div className="user-left">
        <div className="user-avatar" aria-hidden />
        <div className="user-info">
          <div className="user-name">{userName}</div>
          <div className="user-greet">Welcome back! Let&apos;s take care of Pixel.</div>
        </div>
      </div>
      <div className="user-actions">
        <button className="btn btn-outline" onClick={() => navigate("/user")}>
          View Profile
        </button>
        <button className="btn btn-solid" onClick={() => navigate("/tasks")}>
          Start New Task
        </button>
      </div>
      <hr className="user-divider" />
    </section>
  );
}

/* ===== Pet Snapshot (the card) ===== */
function PetSnapshotCard() {
  const [pet, setPet] = React.useState(null);
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([fetchPetMe(), fetchPetStatus()]);
        setPet(p);
        setStatus(s);
      } catch (e) {
        console.error("Pet snapshot load failed:", e);
      }
    }
    load();
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const growthPct =
    status ? Math.min(100, Math.round((status.xp / Math.max(1, status.xp_to_next)) * 100)) : 0;

    return (
    <section id="pet" className="pet-section">
      <h2 className="pet-title">Pet Snapshot</h2>
      <div className="pet-card">
        {pet ? (
          <img
            className="pet-avatar-placeholder"
            src={
              (() => {
                const lvl = Math.max(0, Math.min(9, Number(pet.level || 0)));
                try {
                  return new URL(
                    `./assets/pets/${pet.breed}/${lvl}.png`,
                    import.meta.url
                  ).href;
                } catch {
                  return new URL(`./assets/pets/Generic/0.png`, import.meta.url).href;
                }
              })()
            }
            alt={`${pet.breed} level ${pet.level}`}
          />
        ) : (
          <div className="pet-avatar-placeholder" />
        )}
        <div className="pet-info">
          <div className="pet-name">
            <b>Pet Name:</b>{" "}
            <Link to="/pet-overview" className="pet-link">
              {pet ? pet.name : "PixelPet"}
            </Link>
          </div>
          <div className="pet-level">Level: {status ? status.level : "-"}</div>
          <div className="pet-badges">
            <span className="pill">
              {status ? `XP: ${status.xp}/${status.xp_to_next}` : "XP: —"}
            </span>
            <span className="pill">Growth: {growthPct}%</span>
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
  const [allTasks, setAllTasks] = useState([]);

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
      const baseUrl = import.meta.env.API_GATEWAY_URL;
      const response = await fetch(`${baseUrl}/v1/task-service/tasks`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.statusText}`);
        }

      const data = await response.json();
      const items = data.items || [];
      setAllTasks(items);
      
      // Filter active tasks due this week (not completed)
      const activeThisWeekTasks = items.filter(
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
            <h1 className="hero">This Weeks's Tasks</h1>
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
              <Fragment key={task.id}>
                {/* Pass emoji/icon as prop to TaskItem */}
                <TaskItem 
                  {...task} 
                  priority={priorityMap[task.priority?.toLowerCase()]}
                  emoji={getIconForTag(task.tags?.[0])}
                />
                {i !== thisWeekTasks.length - 1 && <hr className="divider" />}
              </Fragment>
            ))}
          </section>

        
      </div>
      {/* scroll down to see */}
      <PetSnapshotCard />
      {/* scroll down to see */}
      <section id="progress" className="home-insights">
        <ProgressSection tasks={allTasks} />
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
function ProgressSection({ tasks = [] }) {
  // ---- Helpers ----
  const startOfThisWeek = (() => {
    const today = new Date();
    const s = new Date(today);
    s.setDate(today.getDate() - today.getDay()); // Sunday
    s.setHours(0, 0, 0, 0);
    return s;
  })();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfThisWeek);
    d.setDate(startOfThisWeek.getDate() + i);
    return d;
  });

  const fmtYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const sameDay = (iso, d) => {
    if (!iso) return false;
    const x = new Date(iso);
    return (
      x.getFullYear() === d.getFullYear() &&
      x.getMonth() === d.getMonth() &&
      x.getDate() === d.getDate()
    );
  };

  // ---- Aggregate completed for each day ----
  const series = days.map((d) => {
   // const planned = tasks.filter((t) => sameDay(t.due_at, d)).length;
    const completed = tasks.filter((t) => {
      // treat task as completed for the day iff it has completed_at that day
      // (prefer completed_at; if missing but status says completed, you could optionally fall back to due_at)
      if (t.completed_at) return sameDay(t.completed_at, d);
      if (t.status === "completed" && t.updated_at) return sameDay(t.updated_at, d);
      return false;
    }).length;
    return { date: d, completed, label: d.toLocaleDateString(undefined, { weekday: "short" }) };
  });

  const maxVal = Math.max(1, ...series.map((x) => x.completed));

  return (
    <section className="section">
      <h1 className="section-title">Progress This Week</h1>

      <div className="card">
        <div className="card-title">Tasks Completed Each Day</div>
        <div className="card-subtitle">Count per day (Sun-Sat)</div>

        {/* Grouped bars: planned (left), completed (right) */}
        <div className="pw-chart">
          {series.map((d) => {
            const completedH = `${Math.round((d.completed / maxVal) * 100)}%`;
            return (
              <div className="pw-day" key={fmtYMD(d.date)}>
                <div className="pw-bars">
                  <div className="pw-bar completed" style={{ height: completedH }} title={`Completed: ${d.completed}`} />
                </div>
                <div className="pw-xlabel">
                  <div className="pw-dayname">{d.label}</div>
                  <div className="pw-values">
                    <span className="pw-val completed">C:{d.completed}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pw-legend">
          <span className="pw-dot completed" /> Completed
        </div>
      </div>
    </section>
  );
}

/// ===== Neglected Section =====
function NeglectedSection() {
  const [neglectedByCategory, setNeglectedByCategory] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchNeglectedTasks();
  }, []);

  const fetchNeglectedTasks = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.API_GATEWAY_URL;
      const response = await fetch(`${baseUrl}/v1/task-service/tasks`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      const allTasks = data.items || [];

      // Get neglected tasks
      const neglectedTasks = getNeglectedTasks(allTasks);

      // Group by category/tags
      const groupedByCategory = {};

      neglectedTasks.forEach((task) => {
        const category = task.tags && task.tags.length > 0 ? task.tags[0] : "Uncategorized";

        if (!groupedByCategory[category]) {
          groupedByCategory[category] = {
            count: 0,
            tasks: [],
          };
        }

        groupedByCategory[category].count += 1;
        groupedByCategory[category].tasks.push(task);
      });

      setNeglectedByCategory(groupedByCategory);
      setError(null);
    } catch (err) {
      console.error("Error fetching neglected tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get tasks that are overdue and not started or completed
  const getNeglectedTasks = (tasks) => {
    if (!tasks || tasks.length === 0) return [];

    const now = new Date();

    return tasks.filter((task) => {
      // Must have a due_at date
      if (!task.due_at) return false;

      const dueDate = new Date(task.due_at);

      // Must be past the due date
      if (dueDate >= now) return false;

      // Must not be completed
      if (task.status === "completed") return false;

      return true;
    });
  };

  // Calculate days overdue
  const getDaysOverdue = (dueDate) => {
    const now = new Date();
    const diffTime = now - new Date(dueDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format category name
  const formatCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Format due date
  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="section">
        <h1 className="section-title">Neglected Categories</h1>
        <p className="section-subtitle">Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <h1 className="section-title">Neglected Categories</h1>
        <p className="section-subtitle" style={{ color: "#ef4444" }}>
          Error: {error}
        </p>
      </section>
    );
  }

  const categories = Object.entries(neglectedByCategory);

  if (categories.length === 0) {
    return (
      <section className="section">
        <h1 className="section-title">Neglected Categories</h1>
        <p className="section-subtitle">Great job! No neglected tasks!</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h1 className="section-title">Neglected Categories</h1>
      <p className="section-subtitle">
        Tasks that passed their deadline but weren't started or completed
      </p>
      <div className="neglected-grid">
        {categories.map(([category, data]) => {
          const oldestTask = data.tasks.reduce((oldest, current) => {
            const oldestDate = new Date(oldest.due_at || Infinity);
            const currentDate = new Date(current.due_at || Infinity);
            return currentDate < oldestDate ? current : oldest;
          });

          const daysOverdue = getDaysOverdue(oldestTask.due_at);
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="neg-card">
              <div 
                className="neg-card-header"
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              >
                <div>
                  <div className="neg-title">{formatCategoryName(category)}</div>
                  <div className="neg-value">
                    {data.count} {data.count === 1 ? "task" : "tasks"} neglected
                  </div>
                  {/* show the days overdue from oldest task */}
                  <div className="neg-delta">↓ {daysOverdue}</div>
                  <div className="neg-detail">
                    Oldest: {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue
                  </div>
                </div>
                <div className={`expand-icon ${isExpanded ? "expanded" : ""}`}>
                  ▼
                </div>
              </div>

              {isExpanded && (
                <div className="neg-tasks-list">
                  {data.tasks
                    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
                    .map((task, idx) => (
                      <div key={idx} className="neg-task-item">
                        <div className="neg-task-info">
                          <div className="neg-task-title">{task.title}</div>
                          <div className="neg-task-due">
                            Due: {formatDueDate(task.due_at)}
                          </div>
                        </div>
                        <div className="neg-task-overdue">
                          <span className="overdue-days">
                            ↓ {getDaysOverdue(task.due_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


/* ===== Route list ===== */
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const location = useLocation();

  // treat these as auth pages
  const isAuthRoute =
  location.pathname.startsWith("/login") ||
  location.pathname.startsWith("/register") ||
  location.pathname.startsWith("/welcome");

  React.useEffect(() => {
    const body = document.body;
    if (isAuthRoute) {
      body.classList.add("auth-mode");
    } else {
      body.classList.remove("auth-mode");
    }
  }, [isAuthRoute]);

  const navigate = useNavigate();

  // treat these as auth pages
   useEffect(() => {
     const token = localStorage.getItem("access_token");
     if (!token) return; 

     const baseUrl = import.meta.env.API_GATEWAY_URL;

     (async () => {
       try {
         const res = await fetch(`${baseUrl}/v1/user-service/users/me`, {
           headers: {
             Authorization: `Bearer ${token}`,
           },
         });


         if (res.status === 401) {
           localStorage.removeItem("access_token");
           localStorage.removeItem("user_email");
           localStorage.removeItem("user_id");
           localStorage.removeItem("user_name");

           navigate("/login", { replace: true });
         }
       } catch (e) {

         console.error("auth check failed:", e);
       }
     })();
   }, [location.pathname, navigate]);

  return (
    // mark the whole tree with a class we can target in CSS
    <div className={isAuthRoute ? "auth-page" : ""}>
      {/* Only show the fixed background on app pages */}
      {!isAuthRoute && <div className="page-bg-fixed" />}

      <RouteChangeLoader minDuration={1000} delay={0} />
      <ScrollToTop />

      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        {/* auth routes */}
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
        <Route
          path="/select-pet"
          element={
            <RequireAuth>
              <SelectPet />
            </RequireAuth>
          }
        />

        {/* protected routes below */}
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/pet" element={<RequireAuth><PetDetailPage /></RequireAuth>} />
        <Route path="/tasks" element={<RequireAuth><TasksPageUI /></RequireAuth>} />
        <Route path="/tasks/manage" element={<RequireAuth><ManageTasks /></RequireAuth>} />
        <Route path="/roadmaps/manage" element={<RequireAuth><ManageRoadmaps /></RequireAuth>} />
        <Route path="/tasks/form" element={<RequireAuth><TaskForm /></RequireAuth>} />
        <Route path="/roadmaps/form" element={<RequireAuth><RoadmapForm /></RequireAuth>} />
        <Route path="/pet-overview" element={<RequireAuth><PetOverview /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPlaceholderPage /></RequireAuth>} />
        <Route path="/user" element={<RequireAuth><UserProfile /></RequireAuth>} />
        <Route path="/help" element={<Help />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>

      {/* Hide the quick switch on auth pages */}
      {!isAuthRoute && <FloatingQuickSwitch />}
      {!isAuthRoute && <FloatingMusicToggle />}
      {!isAuthRoute && <CursorTrail />}

      {/* Hide the footer on auth pages */}
      {!isAuthRoute && (
        <footer className="global-footer">
          <div className="footer-links">
            <Link className="footer-link" to="/help">Help</Link>
            <Link className="footer-link" to="/faq">FAQ</Link>
            <Link className="footer-link" to="/support">Support</Link>
            <Link className="footer-link" to="/privacy">Code of Conduct</Link>
          </div>
          <button
            className="footer-health-btn"
            onClick={() => window.location.href = `${import.meta.env.API_GATEWAY_URL}/v1/health`}
          >
            Health Check
          </button>
        </footer>
      )}
    </div>
  );
}

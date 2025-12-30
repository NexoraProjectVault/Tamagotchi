<a id="readme-top"></a>
# Project - [Tamagotchi](https://tamagotchi-n0y6.onrender.com/)

Team 6 - PixelNova

### Contributors:
Collaborators: Joshua Chau, Lynne Liu, Richelle Pereira, Vivian Tu, Kyna Wu, Jingqiao Xiao

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#tech-stack">Tech Stack</a></li>
        <li><a href="#architecture-overview">Architecture Overview</a></li>
      </ul>
    </li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#teaser-video">Teaser Video</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>


<!-- ABOUT THE PROJECT -->
## About The Project
Pixel Pet is a Tamagotchi-inspired productivity app where completing real-world tasks grows your virtual pet. Instead of boring checklists, users nurture their digital companion through task completion, creating gamified motivation for sustained productivity.

Key Features:
* Task Organization: Categorize, filter, and prioritize tasks by type 📝🚩
* Smart Automation: Recurring daily, weekly, or monthly tasks ⚙️⚡
* Progress Tracking: Analytics and milestone roadmaps visualize productivity 📈🎯
* Customization: Select pets and unlock accessories through task completion 🛠️🎨

⭐ Turn invisible productivity into visible pet growth—making effort tangible and rewarding ⭐

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- Tech Stack -->
## Tech Stack
Application is built using: 

<!-- Badge URLs -->
[![React][React.js]][React-url] [![Javascript][Javascript.com]][Javascript-url] [![Python][Python.org]][Python-url] [![Flask][Flask.com]][Flask-url] [![Docker][Docker.com]][Docker-url] [![Vite][Vitejs.dev]][Vite-url]

<!-- Badge URLs -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/

[Javascript.com]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[Javascript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript

[Python.org]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/

[Flask.com]: https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white
[Flask-url]: https://flask.palletsprojects.com/

[Docker.com]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/

[Vitejs.dev]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E
[Vite-url]: https://vitejs.dev/

> Note - Application is currently set for development and not prod.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## Architecture Overview

Pixel Pet is implemented as a **microservices-based web application** orchestrated with Docker and an API gateway.

### Frontend

- **React + Vite SPA (`/frontend`)**
  - Handles routing between login, registration, dashboard, pet view, and account/profile pages.
  - Communicates only with the **API Gateway** (no direct calls to individual services).
  - Uses `VITE_BACKEND_URL` (e.g. `http://localhost:5000` in dev, or the deployed API URL in prod) to configure the API base URL.

### Backend Services

All backend services are written with **Flask** and are accessed by the frontend through the API Gateway:

- **API Gateway**
  - Single entry point for the frontend.
  - Routes requests to the appropriate backend services.
  - Central place to handle authentication, error handling, and CORS.

- **User Service**
  - Handles user registration, login, and authentication logic.
  - Stores and returns user profiles (e.g., name, email, phone, address).
  - Provides endpoints such as `/users/me` for retrieving the currently authenticated user.

- **Pet Service**
  - Manages pet state (level, experience, mood, etc.).
  - Updates pet attributes whenever tasks are completed.
  - Designed so future cosmetic upgrades (e.g., skins, accessories) can be layered on top.

- **Task Service**
  - Core CRUD for tasks (create, read, update, delete).
  - Supports recurring tasks (daily / weekly / monthly) and completion status.
  - Integrates with the Pet Service and Data Tracking Service on task completion.

- **Data Tracking Service**
  - Tracks user events like task completion and streaks.
  - Provides a foundation for future analytical views such as weekly productivity and habit streaks.

### Data & Persistence

- Each service uses its **own database** (e.g., user DB, task DB, pet DB, tracking DB) to keep data bounded to each service.
- Database connection strings (e.g., `USER_DATABASE_URL`, `TASK_DATABASE_URL`, etc.) are configured via environment variables.
- This separation supports independent scaling and better fault isolation between services.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## Project Structure
```bash
├── frontend/                        # React + Vite SPA
│   ├── public/                      # Static assets
│   ├── src/                         # Source code (pages, components, hooks)
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile                   # Frontend Docker configuration
│   ├── eslint.config.js
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Frontend dependencies
│   ├── package-lock.json
│   └── vite.config.js
│
├── backend/                         # Backend services (Flask microservices)
│   ├── api-gateway/                 # API Gateway service (main entrypoint)
│   ├── user-service/                # User service (auth & profile)
│   ├── pet-service/                 # Pet service (pet state & evolution)
│   ├── task-service/                # Task service (CRUD & recurrence)
│   ├── data-tracking-service/       # Data tracking / analytics foundation
│   └── shared/                      # Shared utilities/models between services (if any)
│
├── .dockerignore
├── .gitignore
├── CODE_OF_CONDUCT.md               # Code of conduct for collaborators
├── CONTRIBUTING.md                  # Contribution guidelines
├── Dockerfile                       # Root Docker configuration (if used)
├── README.md                        # Project documentation (this file)
├── docker-compose.yml               # Docker Compose configuration (all services)
└── requirements.txt                 # Python dependency list (for backend)
```
<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

To start application locally:
1. Clone repository
2. Create a virtual environment, activate the virtual environment and run `pip install -r requirements.txt`
3. Add a .env file in project root directory
4. Start Docker
5. Build containers and start services: `docker-compose up -d --build` in a terminal in the project directory 
6. Once services have started, navigate to the container and checkout frontend endpoints and api-gateway endpoints

Extras:
- If any service is modified, only rebuild and restart that service: `docker-compose up -d --build <service-name>`
- To stop all services (i.e. docker containers): `docker-compose down` or if specific service: `docker-compose down <service-name>`
- To start services (i.e. containers): `docker-compose up -d` or if specific service: `docker-compose up -d <service-name>`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TEASER VIDEO -->
## Teaser Video
Here is a [teaser video](https://drive.google.com/file/d/1xSD2XLhvUd3MN2xNaXCTKFmk4M2huoqG/view?usp=sharing) to help getting start with PixelPals! Enjoy!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repository and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch - `git checkout -b feature/NewFeature`
3. Commit your Changes - `git commit -m 'Added a NewFeature'`
4. Push to the Branch - `git push origin feature/NewFeature`
5. Open a Pull Request.
<p align="right">(<a href="#readme-top">back to top</a>)</p>

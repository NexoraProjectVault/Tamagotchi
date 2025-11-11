<a id="readme-top"></a>
# Project - Tamagotchi

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
      </ul>
    </li>
    <li>
       <a href="#getting-started">Getting Started</a>
    </li>
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

Note - Application is currently set for development and not prod.
<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Structure
```bash

├── frontend/
├── public/                           # Static assets
│   ├── src/                          # Source code
│   ├── .dockerignore                
│   ├── .gitignore                   
│   ├── Dockerfile                    # Frontend Docker configuration
│   ├── eslint.config.js              
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Project dependencies
│   ├── package-lock.json             
│   └── vite.config.js               
├── backend/                          # Backend services
│   ├── api-gateway/                  # API Gateway service
│   │     ├──...
│   ├── pet-service/                  # Pet service
│   │     ├──...
│   └── user-service/                 # User service
│         ├──...
|         └──...
│
├── .dockerignore                    
├── .gitignore                        
├── CODE_OF_CONDUCT.md                
├── CONTRIBUTING.md                  
├── Dockerfile                        # Root Docker configuration
├── README.md                         # Project documentation
├── docker-compose.yml                # Docker Compose configuration
└── requirements.txt                 

```

<!-- GETTING STARTED -->
## Getting Started

To start application locally:
1. Clone repository.
2. Create a virtual environment, activate the virtual environment and run `pip install -r requirements.txt`
3. Add the .env file in project root directory
4. Start Docker.
5. In terminal, in project directory, to build containers and start services: `docker-compose up -d --build`
6. Once services have started, navigate to the container and checkout frontend endpoints and api-gateway endpoints.

Extras:
- If any service is modified, only rebuild and restart that service: `docker-compose up -d --build <service-name>`
- To stop all services (i.e. docker containers): `docker-compose down` or if specific service: `docker-compose down <service-name>`
- To start services (i.e. containers): `docker-compose up -d` or if specific service: `docker-compose up -d <service-name>`

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

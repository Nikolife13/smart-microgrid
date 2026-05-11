⚡ Smart Microgrid – Affordable and Clean Energy Simulation

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![gRPC](https://img.shields.io/badge/gRPC-Framework-blue)](https://grpc.io/)
[![SDG 7](https://img.shields.io/badge/SDG-7_Affordable_%26_Clean_Energy-orange)](https://sdgs.un.org/goals/goal7)

This project simulates a **Smart Microgrid** ecosystem for modern homes or small industrial facilities. It was developed to support **UN Sustainable Development Goal #7**, focusing on efficient energy distribution and monitoring using distributed systems.

The architecture consists of three independent **gRPC services** (Solar, Meter, Battery) coordinated via a **Naming Service** and managed through a centralized **Web GUI**.

---

## 🛠 Technologies
*   **Backend:** [Node.js](https://nodejs.org/)
*   **Communication:** [gRPC](https://grpc.io/) (`@grpc/grpc-js`, `@grpc/proto-loader`)
*   **Web Server:** Express.js
*   **Frontend:** HTML5, CSS3 (Modern UI), JavaScript
*   **Version Control:** Git

---

## 📂 Project Structure
```text
smart-microgrid/
├── proto/               # Protocol buffer definitions (.proto)
├── services/            # gRPC server-side logic
│   ├── naming_server.js
│   ├── naming_client_helper.js
│   ├── solar_panel.js
│   ├── smart_meter.js
│   └── battery.js
├── gui/                 # Express gateway & Web interface
│   ├── server.js
│   └── public/          # Client-side assets
├── package.json
└── README.md
🚀 Getting StartedPrerequisitesNode.js (v14 or higher)npmInstallationBash# Clone the repository
git clone [https://github.com/Nikolife13/smart-microgrid.git](https://github.com/Nikolife13/smart-microgrid.git)

# Navigate into the project
cd smart-microgrid

# Install dependencies
npm install
Running the SystemOpen five separate terminal tabs and run the following commands in order:StepServiceCommandPort1Naming Servicenpm run naming500552Solar Panelnpm run solar500513Smart Meternpm run meter500524Battery Storagenpm run battery500535Web GUInpm run gui3000Access the Dashboard: Once all services are running, visit http://localhost:3000.📡 RPC Implementation DetailsThis project demonstrates all four gRPC communication patterns:Unary (GetCurrentPower): Simple request-response to fetch instantaneous solar data.Server-Streaming (StreamPower): Real-time telemetry feed from the solar panels every 2 seconds.Client-Streaming (SubmitReadings): Batch upload of energy consumption data for server-side processing and summarization.Bidirectional Streaming (ManageBattery): Real-time control loop where client commands and battery status updates flow simultaneously.✨ Advanced FeaturesService Discovery: Services register themselves with the Naming Service, allowing the GUI to locate them dynamically.Deadlines & Timeouts: All gRPC calls include enforced deadlines (5s-10s) to prevent system hangs.Metadata Integration: The GUI passes a user-id header in metadata for service-side logging and auditing.Resource Management: Stream cancellation is handled properly; closing the browser UI triggers server-side cleanup.Robust Error Handling: Custom gRPC error codes (e.g., INVALID_ARGUMENT, UNAVAILABLE) with human-readable feedback.📸 Demo & MediaScreenshots(Upload your screenshots to a folder like assets/ and link them here)![Dashboard UI](./assets/dashboard.png)Video Demonstration📺 Watch the Video Walkthrough👨‍💻 AuthorNikolaiStudent at National College of IrelandDistributed Systems Module📄 LicenseThis project was created for educational purposes as part of a University assignment.

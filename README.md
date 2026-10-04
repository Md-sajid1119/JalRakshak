# 🌊 JalRakshak

### AI-Powered Urban Flood Safety & Emergency Response System

JalRakshak is a web-based flood safety and emergency response platform designed to help citizens during urban flooding situations.

The system provides **flood safety information, AI-assisted flood image analysis, safe-route guidance, emergency help requests, request tracking, and an administrative dashboard** for managing emergency requests.

The project is built with **Node.js, Express.js, MongoDB, Mongoose, JavaScript, HTML, CSS, Leaflet, and Gemini AI integration**.

---

## 🚨 Problem Statement

During urban flooding, citizens may face:

* Flooded roads and underpasses
* Rapidly increasing water levels
* Open drains and unsafe areas
* Electrical hazards
* Difficulty identifying safer routes
* Delays in communicating emergency situations to authorities

General navigation systems may not always have real-time information about temporary flood hazards.

**JalRakshak** aims to provide a dedicated flood-safety platform where citizens can receive safety guidance, analyze flood conditions, find safer routes, and send emergency help requests to an administrative response system.

---

## 💡 Solution

JalRakshak connects the **citizen side** with an **administrative response system**.

### Citizen Side

A citizen can:

* View flood safety information
* Check flood conditions
* Upload a flood image for analysis
* Get safety recommendations
* Find a safer route
* Submit an emergency **Request Help**
* Receive a unique request ID
* Track the status of their emergency request

### Admin Side

Authorized administrators can:

* Log in securely
* View incoming emergency requests
* View request details and location information
* Search/manage requests
* Accept emergency requests
* Mark requests as completed
* Manage government administrator accounts
* Monitor administrative activity

---

# ✨ Key Features

## 1. 🌧️ Flood Safety Analysis

Users can provide flood-related information and upload a flood image.

The system provides:

* Danger level
* Estimated water level
* Safety advice
* Flood-related warnings

Gemini AI integration can be used for AI-assisted flood image analysis when the API configuration is available.

---

## 2. 🗺️ Safe Route Guidance

JalRakshak provides a map-based route guidance interface using **Leaflet** and **OpenStreetMap**.

The system is designed around the idea of helping users move toward safer areas during flood situations.

The prototype demonstrates safe-route visualization and flood safety points.

---

## 3. 🆘 Emergency Request Help

Citizens can submit an emergency help request containing information such as:

* Name
* Mobile number
* Emergency details
* Location
* Request ID

Each request receives a unique ID in the format:

```text
JR-XXXXXX
```

This ID can be used to identify and track the request.

---

## 4. 📍 Location-Based Emergency Requests

The emergency request workflow supports capturing the user's location so that the response team can identify where assistance is required.

Request information is stored in MongoDB and made available through the administrative dashboard.

---

## 5. 📊 Admin Dashboard

The administrator dashboard provides a centralized interface for handling emergency requests.

Administrators can:

* View pending requests
* Accept requests
* Complete requests
* Delete requests when required
* Search requests
* Review request details
* Monitor request status

### Request Flow

```text
Citizen
   ↓
Request Help
   ↓
Unique Request ID
   ↓
MongoDB
   ↓
Admin Dashboard
   ↓
Pending
   ↓
Accepted
   ↓
Completed
```

---

## 6. 👨‍💼 Government Administrator Management

The backend supports multiple administrator accounts.

The system distinguishes between:

### Main Admin

The Main Admin can:

* Manage government administrators
* Enable/disable administrator accounts
* Delete administrator accounts
* Manage administrator passwords
* Monitor administrative activity

### Government Admin

Government administrators can:

* Log in to the dashboard
* View emergency requests
* Handle requests
* Update request status
* Manage their own password

---

## 7. 📝 Activity Logging

Administrative actions can be recorded through the activity logging system.

The system stores information such as:

* Administrator ID
* Username
* Action
* Request ID
* Details
* Timestamp

This helps provide accountability for emergency request handling.

---

# 🛠️ Technology Stack

| Technology      | Purpose                                 |
| --------------- | --------------------------------------- |
| HTML5           | Frontend structure                      |
| CSS3            | User interface styling                  |
| JavaScript      | Frontend functionality                  |
| Node.js         | Backend runtime                         |
| Express.js      | REST API and server                     |
| MongoDB         | Database                                |
| Mongoose        | MongoDB object modeling                 |
| Express Session | Admin authentication/session management |
| Leaflet.js      | Interactive maps                        |
| OpenStreetMap   | Map data                                |
| Gemini AI       | AI-assisted flood image analysis        |

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Citizen        │
                    │     Web Browser     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   JalRakshak UI     │
                    │ HTML/CSS/JavaScript  │
                    └──────────┬──────────┘
                               │
                         HTTP / REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node.js + Express │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐   ┌────────────┐   ┌─────────────┐
        │ MongoDB   │   │ Gemini AI  │   │   Leaflet   │
        │ Database  │   │ Integration│   │     Map     │
        └───────────┘   └────────────┘   └─────────────┘
                              
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Admin Dashboard   │
                    │ Main / Government   │
                    │      Admins         │
                    └─────────────────────┘
```

---

# 📂 Project Structure

```text
JalRakshak/
│
├── public/
│   ├── index.html
│   ├── script.js
│   ├── admin.html
│   └── README.txt
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

### Important

Sensitive configuration such as API keys should be stored in `.env` and should **never be uploaded to GitHub**.

The `.gitignore` file excludes:

```text
.env
node_modules/
```

---

# ⚙️ Local Installation

## 1. Clone the repository

```bash
git clone https://github.com/Md-sajid1119/JalRakshak.git
```

Then enter the project directory:

```bash
cd JalRakshak
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Start MongoDB

Make sure MongoDB is installed and running locally.

The current application uses:

```text
mongodb://127.0.0.1:27017/jalrakshak
```

---

## 4. Configure environment variables

Create a `.env` file in the project root.

Example:

```env
GEMINI_API_KEY=your_api_key_here
SESSION_SECRET=your_secure_secret_here
```

Do not commit the `.env` file to GitHub.

---

## 5. Start the server

```bash
node server.js
```

The application should start at:

```text
http://localhost:3000
```

Open the URL in your browser.

---

# 🔐 Security Notes

This project is a prototype intended for demonstration and portfolio purposes.

For production deployment, additional security measures should be implemented, including:

* HTTPS
* Strong production session configuration
* Secure cookies
* Environment-based secrets
* Rate limiting
* Input validation
* CSRF protection
* Strong password hashing and password policies
* Production-grade authentication
* Proper authorization controls
* Secure file/image upload handling
* Database access controls
* Production monitoring and logging

API keys and other secrets should always remain outside the source repository.

---

# 🧪 Tested Workflow

The current prototype has been tested through the following workflow:

```text
Mobile / Desktop User
        ↓
JalRakshak Website
        ↓
Flood Safety / Analysis
        ↓
Request Help
        ↓
Request ID Generated
        ↓
Request Stored in MongoDB
        ↓
Admin Dashboard
        ↓
Pending Request
        ↓
Accept Request
        ↓
Complete Request
```

The citizen-to-backend-to-database-to-admin workflow has been tested successfully in the local development environment.

---

# 🎯 Project Goals

JalRakshak focuses on improving flood emergency communication by bringing together:

* Flood safety information
* AI-assisted image analysis
* Map-based guidance
* Citizen emergency reporting
* Location-aware emergency requests
* Centralized administrative response

The goal is to provide a simple interface that can be understood and used quickly during emergency situations.

---

# 🚀 Future Improvements

Possible future development includes:

* Real-time government/civic flood sensor integration
* CCTV-based flood monitoring
* Real-time weather API integration
* Advanced flood-depth estimation
* Dynamic flood-safe routing
* Multilingual voice assistance
* SMS/notification alerts
* Verified volunteer assistance
* Shelter and safe-zone mapping
* Real-time emergency response tracking
* Cloud deployment
* Mobile application
* Advanced analytics and monitoring

These features are planned as future improvements and are not represented as fully implemented features of the current prototype.

---

# 👨‍💻 Developer

**Md Sajid Ansari**

Computer Science Engineering

### Skills demonstrated in this project

* HTML
* CSS
* JavaScript
* Node.js
* Express.js
* MongoDB
* Mongoose
* REST APIs
* Authentication & Sessions
* Leaflet Maps
* AI API Integration
* Git & GitHub

---

# 📌 Project Status

**Status: Working Prototype ✅**

JalRakshak currently demonstrates a functional flood-safety and emergency-response workflow with citizen-side features, MongoDB-backed emergency requests, and an administrative dashboard.

---

# ⭐ Why JalRakshak?

Flood emergencies require fast and understandable information.

JalRakshak explores how **AI + maps + citizen reporting + centralized emergency management** can be combined into one platform to improve flood safety and emergency response.

---

## 📜 License

This project is currently provided for educational, demonstration, and portfolio purposes.

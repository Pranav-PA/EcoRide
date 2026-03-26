# 🚗🌿 EcoRide – Smart Eco-Friendly Ride-Sharing Platform
**EcoRide** is an intelligent carpooling platform designed to reduce travel cost, traffic congestion, and carbon emissions.  
It features secure authentication, smart route matching, smooth booking, and responsive dashboards — all powered by **Node.js, Express, MongoDB, Leaflet, and OSRM (OpenStreetMap Routing)** with **zero API limits**.

<div align="center">
✨ Eco-Friendly ▪ Cost-Effective ▪ Smart Mobility ✨  
👨‍💻 Developed by <strong>Dilip Das M Nayaka</strong> & <strong>Akshobya</strong>  
</div>

---

## 🚀 Key Features
- 🔐 **Secure Login & Authentication**
- 🎯 **Smart Ride Search** (exact, nearby, direction-aware)
- 🚗 **Post Rides** with image upload (Multer)
- 👥 **Accept/Reject Booking Requests**
- ⭐ **Ride Reviews**
- 🔔 **Notifications**
- 🗺 **Leaflet Map (OSM) Integration**
- 📍 **OSRM Routing (Free, No API key required)**
- 📊 **Responsive Dashboards**
- 🗂 **Modular & scalable backend architecture**

---

## 🧭 Smart Route Matching (OSRM + OSM)
EcoRide uses **OpenStreetMap + OSRM** for routing:

- ✓ Realistic driving distance  
- ✓ Nearby radius match  
- ✓ Detects correct direction  
- ✓ No Google API  
- ✓ 100% free & unlimited  

This ensures highly accurate search results for passengers.

---

## 🗂 Project Structure
```
Ecoride/
 ├── backend/
 │    ├── controllers/
 │    ├── middleware/
 │    ├── models/
 │    ├── routes/
 │    ├── uploads/
 │    └── server.js
 ├── frontend/
 │    ├── index.html
 │    ├── login.html
 │    ├── signup.html
 │    ├── dashboard-user.html
 │    ├── dashboard-driver.html
 │    ├── css/
 │    └── js/
 └── README.md
```

---

## 🛠 Tech Stack
| Layer | Technology |
|------|------------|
| **Frontend** | HTML, CSS, Vanilla JS, Leaflet.js |
| **Backend** | Node.js, Express |
| **Auth** | JWT  (Gmail SMTP) |
| **Database** | MongoDB + Mongoose |
| **Maps** | Leaflet + OpenStreetMap |
| **Routing** | OSRM |
| **Upload** | Multer |
| **Tools** | Nodemon, Ngrok |

---

## ⚙️ Environment Variables (`.env`)
Create `.env` inside the **Ecoride** folder:

```
PORT=5008
MONGO_URI=mongodb://127.0.0.1:27017/ecoride
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
BASE_URL=http://localhost:5008
FRONTEND_URL=http://localhost:5008
```

---

# ▶️ How to Run the Project (Simplified – REAL Setup)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/DilipDD26/Ecoride.git
cd Ecoride
```

### 2️⃣ Install **all dependencies** (backend + frontend if needed)
Just run this inside the main folder:
```bash
npm install
```

EcoRide is structured so **one command installs everything required**.

### 3️⃣ Create `.env` file  
(Inside the `Ecoride` folder — see environment section above.)

### 4️⃣ Start MongoDB
```bash
mongod
```

### 5️⃣ Run EcoRide
```bash
node backend/server.js
```

The server runs at:  
👉 **http://localhost:5008**

### 6️⃣ Open the Application
Open:

```
frontend/index.html
```

✔ No need to run separate frontend server  
✔ Everything loads directly from local files  

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/verify
```

### Rides
```
POST /api/rides/create
GET  /api/rides/all
GET  /api/rides/search
POST /api/rides/:id/book
POST /api/rides/:id/accept
POST /api/rides/:id/reject
POST /api/rides/:id/complete
DELETE /api/rides/:id/delete
```

### Notifications
```
GET /api/notifications
```

---

## 🌟 Why EcoRide?
- 🌍 Eco-friendly shared travel  
- 🚘 Saves travel cost  
- 🧭 Smart, direction-aware routing  
- 🔐 Secure user verification  
- 📱 Clean UI, smooth experience  
- 💯 Zero-cost map & routing APIs  

---

## 🎯 Future Upgrades
- 📱 Mobile App (RN or Flutter)  
- 💳 Online Payments  
- 🗺 Live location tracking  
- 💬 Chat system  
- 🚨 SOS (Emergency Button)  
- 🤖 ML-based route optimization  

---

## 👥 Developers
👨‍💻 **Dilip Das M Nayaka**  
👨‍💻 **Akshobya A S**

---

## ⭐ Support the Project
If you like this project, please **⭐ star the repository**.  
Your support encourages new features & improvements!

---

## 🌿 EcoRide — Move Together. Move Green.

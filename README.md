# Secure Resume Portal & Session Gateway (BFF Architecture)

This repository contains the source code for a secure, multi-layer resume portal built as per the assessment requirements. The application features a **React** frontend, a **Node.js Gateway BFF (Backend-For-Frontend)** for session control and secure cookie handling, and a **Quarkus Java** backend microservice integrated with a **PostgreSQL** database.

---

## 🏗️ System Architecture & Workflow

The application is split into four distinct layers to ensure separation of concerns, high scalability, and robust security:

```text
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│                  React Frontend (Vercel)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ HTTPS Requests & Secure Session Cookies
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     GATEWAY / BFF LAYER                     │
│              Node.js Express BFF Gateway (Port 3001)        │
│      ┌──────────────────────────────────────────────┐       │
│      │ • Client Session Management (Cookie Control) │       │
│      │ • Sensitive Data Scrubbing (Deletes Hash)   │       │
│      │ • Proxy Routing & CORS Management            │       │
│      └──────────────────────────────────────────────┘       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ Internal HTTP REST API calls (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                     │
│                Quarkus Java Backend (Port 8082)             │
│      ┌──────────────────────────────────────────────┐       │
│      │ • BCrypt Hashing (Salted Password Hashing)   │       │
│      │ • User & Resume CRUD Operations              │       │
│      │ • 6-Digit OTP Generator & Resend Services    │       │
│      │ • SMTP Mailer Trigger (Gmail SMTP Integration)│       │
│      └──────────────────────┬───────────────────────┘       │
└─────────────────────────────┼───────────────────────────────┘
                              │
               JPA Hibernate  │
               (Panache ORM)  ▼
┌─────────────────────────────────────────────────────────────┐
│                         DATA LAYER                          │
│                  Neon PostgreSQL Cloud DB                   │
└─────────────────────────────────────────────────────────────┘
```

### 🔁 Data & Authentication Flow:
1. **Frontend to BFF**: The React frontend hosted on Vercel sends all API requests to the Node.js BFF gateway. Cross-origin cookies (`connect.sid`) are stored securely on the browser using `SameSite=None` and `Secure` headers.
2. **Session Verification**: The BFF verifies the incoming cookie. If valid, it forwards the request internally to the Quarkus service.
3. **Stateless Backend Processing**: Quarkus handles the logic (database queries via Hibernate, trigger verification emails using Gmail SMTP Mailer) and returns raw data to the BFF.
4. **Data Scrubbing**: The BFF filters out sensitive fields (like `passwordHash` and `validationToken`) from the user payload before sending a clean JSON response back to the browser.

---

## 🌟 Assessment Requirements Mapping

Here is how each assessment requirement has been implemented and resolved:

### 1. User Signup with Salted Password Encryption (Req 1)
* **Encryption**: When a user registers, their password is encrypted using the industry-standard **BCrypt hashing algorithm** with a secure workload factor (salt).
* **Database**: User credentials, along with their validation state, are persisted securely in **PostgreSQL**.

### 2. Email Validation after Signup (Req 2)
* **6-Digit OTP**: Once registered, the Quarkus service generates a unique 6-digit verification code.
* **SMTP Delivery**: The code is sent to the user's email using a custom SMTP mailer configuration via Gmail.
* **Resend System**: A "Resend Code" API and UI link allow regeneration and re-mailing of the code if it expires.

### 3. Login Verification States (Req 3)
* If the logged-in user is **unverified**, they are presented with a warning card: *"You need to validate your email to access the portal"* along with 6-digit OTP code inputs.
* If the user is **verified**, the portal unlocks to show the message: *"Your email is validated. You can access the portal"* and renders their resume management dashboard.

### 4. Auto-Logout and Session Expiration (Req 4)
* **Stateful Sessions**: Handled using secure, signed session cookies (`connect.sid`) managed by Node.js.
* **Auto-Logout**: Configured as a session-only cookie (without `maxAge`). Closing the browser tab or window destroys the cookie, requiring re-authentication.
* **Clean Logout**: Clicking the logout button clears local browser states and redirects the user immediately to the login view.

### 5. Testing Frameworks (Req 5)
* **Backend Tests**: Built using Quarkus JUnit tests and **RestAssured** (located in `/backend/src/test/`). Asserts signup, verification validation, and login workflows.
* **Frontend Tests**: Configured using Jest / React Testing Library (located in `/frontend/src/__tests__/`).

### 6. Quarkus Backend & Node BFF Decoupling (Req 6)
* **Quarkus**: Implements a dedicated User Service, Persistence Layer, and database migrations.
* **Node.js**: Operates as a security gateway between the UI and backend, handling CORS rules, proxy-routing, and session cookies. It also strips out sensitive fields (`passwordHash`, `validationToken`) before sending JSON payloads to the browser.

---

## 🛠️ Tech Stack & Build System

* **Frontend**: React (Vite), HTML5 , Tailwind (Modern split-column theme)
* **BFF Gateway**: Node.js, Express, Express-Session, Axios
* **Backend**: Quarkus (Java 21), Maven (Build system), Quarkus Mailer (Google SMTP)
* **Database**: Neon Cloud PostgreSQL (Relational Database)
* **Proxy & Host**: Nginx (Reverse Proxy with SSL), AWS EC2 (Free-Tier Ubuntu instance)

---

## 🚀 How to Run locally

### Prerequisites
* Docker & Docker Compose
* Maven (for Java building)
* Node.js (for frontend & gateway)

### Commands
In the root directory of the project, run:
```bash
# Start all containers in the background (Postgres, Gateway, Quarkus)
docker-compose up -d --build
```
* Access the gateway at `http://localhost:3001`
* Access the Quarkus service at `http://localhost:8082`

---

## 🧪 Running Tests

### Backend Tests
Navigate to the `backend` folder and run:
```bash
./mvnw test
```

### Frontend Tests
Navigate to the `frontend` folder and run:
```bash
npm run test
```

---

## 🌐 Deployments
* **Portal Link**: https://resume-handler-roan.vercel.app
* **AWS API Endpoint**: https://100-27-99-108.sslip.io (Protected with Certbot SSL)

# Task Manager Agent

> **Task Manager Agent** — An AI-enabled task management system to create, track, remind, and prioritise tasks. This repository contains the codebase for a Task Manager Agent that supports task scheduling, reminders (email / SMS / push), recurring tasks, user authentication, and an admin dashboard for managing FAQs and settings.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)

   * Architecture diagram (ASCII)
   * Components and responsibilities
   * Data flow
4. [Tech Stack](#tech-stack)
5. [Deployment Diagram](#deployment-diagram)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Contributing](#contributing)
9. [License](#license)

---

## Project Overview

Task Manager Agent is a full-stack application designed to help users create, organize and track tasks. It includes features for scheduling reminders, repeating tasks, prioritization, admin-managed FAQs, and a lightweight AI assistant for natural language task creation and suggestions.

This README focuses on the **System Architecture** — components, how they interact, and where to extend functionality (vector search, chat history, admin dashboard, notification worker, etc.).

---

## Key Features

* Create / update / delete tasks
* Due date & time, recurrence rules (cron-like or natural language)
* Task priorities, tags, and attachments
* Reminders via email, SMS and push notifications
* Background worker for sending reminders and processing recurring tasks
* Admin dashboard: manage FAQs, users and system settings
* AI assistant: natural-language task entry ("Remind me to...") and smart suggestions
* Audit logs & task history

---

## System Architecture

Below is a clear explanation of each architectural component and how they communicate. Use this as a blueprint for development and deployment.

### ASCII Architecture Diagram

```
+----------------------+    HTTPS     +----------------------+    Queue    +--------------------+
|   Web / Mobile UI    | <--------->  |  API Gateway / REST  | <--------> |  Worker / Scheduler |
|  (React / ReactNat)  |              |  Backend (Node/Express|           |  (Node / Celery /   |
+----------------------+              |   or Python/Flask)   |           |   Bull / Sidekiq)   |
         |                                    |                   |           +--------------------+
         | GraphQL/REST                        |                   |                   |
         v                                    v                   |                   v
+----------------------+    DB Queries   +----------------------+   Push/SMS/Email   +--------------------+
|  Local Cache/Client  | <-------------> |    Application DB    | ----------------> | Notification Serivce|
| (IndexedDB / Async)  |                 |  (Postgres / Mongo)  |                   | (SMTP / Twilio /    |
+----------------------+                 +----------------------+                   |  Push Providers)    |
                                                                                       +--------------------+
                                                                                             |
                                                                                             v
                                                                                       +--------------------+
                                                                                       |   Object Storage    |
                                                                                       | (S3 / MinIO)        |
                                                                                       +--------------------+

```

### Components & Responsibilities

1. **Client (Web / Mobile)**

   * UI for creating/updating tasks, viewing reminders, and the admin dashboard.
   * Local caching for offline support (IndexedDB or local storage).
   * Communicates via HTTPS to API Gateway; optionally GraphQL for efficient queries.

2. **API Gateway / Backend**

   * REST or GraphQL API that handles authentication, task CRUD, reporting, and admin endpoints.
   * Validates requests, enforces permissions and rate limits.
   * Schedules background jobs by pushing messages to a queue.
   * Responsible for saving chat history if AI chat is enabled (short-term and long-term storage options).

3. **Authentication / Authorization**

   * JWT-based tokens for stateless auth, or session-based for more control.
   * Role-based access control (user, admin) for the admin dashboard.

4. **Database**

   * Primary persistent storage for users, tasks, reminders, settings and audit logs.
   * Relational DB (Postgres) recommended for transactional integrity and queries; NoSQL (MongoDB) can be used if flexible schema is preferred.
   * Use separate tables/collections for tasks, reminders, users, and chat history.

5. **Worker / Scheduler**

   * A separate background service that processes queued jobs:

     * Sending reminders at scheduled times
     * Resolving recurring tasks (compute next due date)
     * Running cleanup jobs and analytics
   * Implemented with a job queue like Bull (Redis), Celery (Redis/RabbitMQ), or Sidekiq.

6. **Queue & Message Broker**

   * Reliable job queuing (Redis, RabbitMQ) to decouple API from background processing.
   * Push job messages (send_reminder, compute_next_occurrence, send_digest).

7. **Notification Service**

   * Integrations for Email (SMTP / SendGrid), SMS (Twilio, Nexmo), and Push (Firebase Cloud Messaging / APNs).
   * Exposes a uniform interface to the worker to send notifications.

8. **Object Storage**

   * Store attachments, exported reports and backups in S3-compatible storage (AWS S3, MinIO).

9. **AI Assistant & Vector Search (optional)**

   * Natural language parsing to convert text into structured tasks.
   * Vector search (e.g., using Pinecone, Milvus, or self-hosted FAISS) for semantic search of chat history and tasks.
   * Store embeddings in a vector DB and keep short metadata pointers in primary DB.

10. **Admin Dashboard**

    * Web UI for admins to manage FAQs, user accounts, view logs, and system metrics.
    * CRUD interfaces to add/delete FAQs and update system settings.

11. **Monitoring & Observability**

    * Logs (ELK / Loki), metrics (Prometheus + Grafana), and alerts for worker failures or delivery failure rates.

### Data Flow (high-level)

1. User creates a task via the UI and clicks save.
2. UI sends request to the API backend.
3. Backend persists the task and creates a scheduled reminder job in the message queue.
4. Worker consumes the job when the scheduled time arrives (or cron triggers it), resolves recurrence if needed, and calls the Notification Service.
5. Notification Service uses third-party providers to deliver the reminder.
6. Delivery status is written back to DB for audit and retry.

---

## Tech Stack (Suggested)

* Frontend: React (Vite or Create React App), React Router, React Query / SWR, TailwindCSS
* Mobile: React Native or Flutter (optional)
* Backend: Node.js + Express / NestJS or Python + FastAPI
* Database: PostgreSQL (primary) + Redis (cache + job broker) + optionally MongoDB
* Queue/Workers: BullMQ (Node) / Celery (Python) / Sidekiq (Ruby)
* Notification Providers: SendGrid (Email), Twilio (SMS), Firebase Cloud Messaging (Push)
* Storage: AWS S3 or MinIO
* AI / Vector Search: OpenAI embeddings + Pinecone or Milvus / FAISS
* Containerization: Docker + Docker Compose, Kubernetes for production
* Observability: Prometheus, Grafana, Loki / ELK

---

## Deployment Diagram (simplified)

```
[Users] -> HTTPS -> [Load Balancer] -> [API Servers (Auto-scaled)] -> [Postgres / Redis]
                                             |-> [Message Broker (Redis/RabbitMQ)] -> [Worker Pool]
                                             |-> [Object Storage (S3)]
                                             |-> [3rd Party Services (Twilio, SendGrid, FCM)]
```

---

## Getting Started (local)

> Quick steps — adapt commands to chosen stack.

1. Clone the repo

```bash
git clone https://github.com/BushraFathima-hub/Task-manager-.git
cd Task-manager-
```

2. Create `.env` file from `.env.example` and set values (see Environment Variables section below).

3. Start services (example using Docker Compose):

```bash
docker-compose up --build
```

4. Run migrations and seed (example with Node/Postgres):

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

5. Start worker:

```bash
npm run worker
```

## Extensibility & Notes

* **Offline support:** Use service workers + IndexedDB for queuing offline-created tasks.
* **Rate limits & throttling:** Protect notification provider usage (especially SMS) with throttles.
* **Privacy:** Mask sensitive data in logs; secure backups.
* **Scaling:** Separate read replicas for heavy read load, horizontally scale workers for high reminder volume.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes and follow the repo's contribution guidelines (PR, code style, tests).

---

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

*README generated by Task Manager Agent — system architecture focused. Edit or expand sections as needed.*

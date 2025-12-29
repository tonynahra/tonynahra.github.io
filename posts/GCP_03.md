This guide is designed for a developer who wants to use **Google Cloud Run** without becoming a DevOps expert. Since you are using **Google Antigravity** (the AI-first IDE), you can skip 90% of the terminal commands by delegating them to the AI Agent.

---

# Google Cloud Run: Setup, Deployment, & Maintenance Guide

## **Phase 1: The One-Time Setup**

*Goal: Get your Google Cloud account ready to accept code.*

1. **Create a Google Cloud Project**
* Go to the [Google Cloud Console](https://console.cloud.google.com/).
* Click the dropdown in the top-left -> **New Project**.
* Name it (e.g., `mediamaze-main`).


2. **Enable Billing**
* You must attach a credit card, even for the free tier.


3. **Enable APIs** (The "Plumbing")
* Cloud Run needs permission to run. In Antigravity, tell the Agent:
> *"Enable the Cloud Run, Cloud Build, and Artifact Registry APIs for my current project."*





---

## **Phase 2: Creating the App (The "Docker" Part)**

*Goal: Package your PHP code so Google can run it. You do NOT need to learn Docker commands, but you DO need one file.*

**The Only Docker Concept You Need to Know:**
Cloud Run doesn't read PHP files directly; it reads a "Container Image" (a sealed box containing your Linux OS, Apache, and PHP code). A `Dockerfile` is the recipe card for that box.

**Step 1: Create the Recipe**
In Antigravity, ask the Agent:

> *"Create a production-ready `Dockerfile` for a PHP 8.2 application using Apache. Include the `mysqli` and `gd` extensions."*

It will create a file named `Dockerfile` in your root folder. It usually looks like this (you rarely need to edit it):

```dockerfile
FROM php:8.2-apache
RUN docker-php-ext-install mysqli pdo pdo_mysql
COPY . /var/www/html/
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

```

* **What you need to know here:** If you add a new PHP requirement (like an image library), you just ask the Agent to *"Add the library to my Dockerfile,"* and it adds a line. That is the extent of Docker knowledge required.

**Step 2: The Build & Deploy**
Instead of typing complex commands, use the Antigravity Agent:

> *"Deploy this project to Cloud Run service `mediamaze-photos` in region `us-central1`. Allow unauthenticated access."*

* **Documentation:** [Deploying from Source Code](https://cloud.google.com/run/docs/deploying-source-code)

---

## **Phase 3: Adding Services (Database & Storage)**

*Goal: Connect your app to persistent data.*

### **1. The Database (Cloud SQL)**

Your app connects to the database via a "Unix Socket" (a magical file path), not an IP address.

1. **Create the DB:**
* **Antigravity Prompt:** *"Create a Cloud SQL MySQL instance named `mediamaze-db`."*


2. **Connect it to Cloud Run:**
* Go to **Cloud Run Console** -> Click your Service -> **Edit & Deploy New Revision**.
* Tab: **Container, Variables & Secrets, Connections** -> Scroll to **Cloud SQL connections**.
* Click **Add Connection** -> Select your database.
* **Crucial Step:** Add Environment Variables so your PHP code knows where to look.
* `DB_SOCKET`: `/cloudsql/YOUR_PROJECT_ID:REGION:INSTANCE_NAME`
* `DB_USER`: `root`
* `DB_PASS`: `(your password)`




3. **PHP Code Change:**
* Your PHP connection string changes slightly:


```php
// Connect via Socket (The Cloud Run way)
$dsn = sprintf('mysql:dbname=%s;unix_socket=%s', $dbName, $dbSocket);

```



* **Documentation:** [Connect Cloud Run to Cloud SQL](https://cloud.google.com/sql/docs/mysql/connect-run)

### **2. User Uploads (Cloud Storage)**

You cannot save photos to the server folder (they disappear when the server restarts). You must save to a "Bucket".

1. **Create Bucket:**
* **Antigravity Prompt:** *"Create a public Cloud Storage bucket named `mediamaze-uploads`."*


2. **Mount the Bucket (The Easy Way):**
* In the **Cloud Run Edit** screen (same as above), go to the **Volumes** tab.
* Click **Add Volume** -> **Cloud Storage Bucket**.
* Name: `my-uploads`.
* Mount Path: `/var/www/html/uploads` (This is the magic part. Your PHP code can still save to `uploads/` like normal, but it actually goes to the cloud!)



---

## **Phase 4: Maintenance & Updates**

*Goal: Keep the site running and fix bugs.*

### **How to Update Your Code**

In the old world, you dragged files via FileZilla. In Cloud Run, you **Re-Deploy**.

1. Make changes to your `index.php`.
2. **Antigravity Prompt:** *"Redeploy the `mediamaze-photos` service."*
3. Wait 60 seconds. The new version is live.

### **How to Read Logs (Error Handling)**

If your site crashes (Error 500), you can't open a log file on the server.

1. Go to [Cloud Run Console](https://console.cloud.google.com/run).
2. Click your service.
3. Click the **Logs** tab.
4. You will see standard PHP error outputs here.

* **Documentation:** [Viewing Logs in Cloud Run](https://www.google.com/search?q=https://cloud.google.com/run/docs/logging/view-logs)

### **Rollbacks (The Undo Button)**

If you break the site:

1. Go to the **Revisions** tab in Cloud Run.
2. Find the previous green checkmark (the last working version).
3. Click **Manage Traffic** -> Send 100% to that revision.

---

## **Summary Checklist for Antigravity Users**

| Task | Antigravity / AI Prompt | Manual Step Required? |
| --- | --- | --- |
| **Setup Docker** | "Create a Dockerfile for PHP 8.2 Apache" | No |
| **Deploy App** | "Deploy to Cloud Run service [name]" | No |
| **Create DB** | "Create a Cloud SQL instance [name]" | No |
| **Link DB** | N/A | **Yes** (Use Console UI to add Connection) |
| **Map Domain** | "Map domain [domain.com] to service [name]" | **Yes** (Update DNS at Registrar) |
| **Fix Bug** | "Fix this error in index.php then redeploy" | No |

*(Visualizes the flow: Users -> Global Load Balancer -> Cloud Run Container -> Cloud SQL / Cloud Storage)*

This guide mirrors the Antigravity workflow but uses the **Google Cloud Console (GUI)**. This is the best way to understand the "physics" of the cloud—seeing exactly which buttons are clicked and what resources are created.

---

# Manual Google Cloud Administration: The "Pilot's Manual"

### **Phase 1: The Foundation (Project & APIs)**

*What Antigravity did: `gcloud services enable...*`
*What you do:*

1. **Create Project:**
* Go to [Manage Resources](https://console.cloud.google.com/cloud-resource-manager).
* Click **Create Project**. Name it `mediamaze-main`.


2. **Enable the "Plumbing" (APIs):**
* Google's services are turned off by default to save you money/confusion. You must turn on the ones you need.
* Go to **APIs & Services** > **Library**.
* Search for and **Enable** these four:
* **Cloud Run Admin API**
* **Artifact Registry API** (Stores your Docker images)
* **Cloud Build API** (Builds your Docker images)
* **Cloud SQL Admin API** (If using a database)





---

### **Phase 2: The "Container Garage" (Artifact Registry)**

*What Antigravity did: Created a hidden registry automatically.*
*What you do:*
Before you can run a car, you need a garage to park it. Artifact Registry is where your "built" app (Docker Image) lives before it gets deployed.

1. Go to **Artifact Registry** in the console.
2. Click **Create Repository**.
3. **Name:** `my-repo`
4. **Format:** `Docker`
5. **Mode:** `Standard`
6. **Region:** `us-central1` (Keep all your services in the same region to reduce latency/cost).
7. Click **Create**.

---

### **Phase 3: The Database (Cloud SQL)**

*What Antigravity did: `gcloud sql instances create...*`
*What you do:*

1. Go to **SQL** in the console.
2. Click **Create Instance** > **Choose MySQL**.
3. **Instance ID:** `mediamaze-db`
4. **Password:** Generate a strong one. **Write this down.**
5. **Database Version:** MySQL 8.0.
6. **Configuration (Crucial for Cost):**
* **Region:** `us-central1` (Same as above).
* **Zonal availability:** `Single zone` (Cheaper).
* **Machine configuration:** Select **Shared Core** -> `db-f1-micro` (This is the cheapest option, ~$9/mo).
* **Storage:** Uncheck "Enable automatic storage increases" if you want strict cost control, and set it to 10GB.


7. Click **Create Instance**. (This takes ~5-10 minutes).
8. **Create the Database Name:**
* Once the instance is green, click it.
* Go to the **Databases** tab on the left.
* Click **Create Database**. Name it `mediamaze_photos`.



---

### **Phase 4: The Deployment (Cloud Run)**

*What Antigravity did: `gcloud run deploy...*`
*What you do:*

This is where you bring it all together.

1. Go to **Cloud Run**.
2. Click **Deploy Container** > **Service**.
3. **Source:**
* Select **Deploy from source repository** (if you have your code in GitHub).
* *OR* select **Deploy one revision from an existing container image** (if you built it locally).
* *For beginners:* Use **"Test with a sample container"** first to see how it works, OR connect your **GitHub** repo here. Google will automatically set up "Cloud Build" to watch your repo and deploy when you push code.


4. **Service Name:** `mediamaze-photos`.
5. **Region:** `us-central1`.
6. **Authentication:** Check **"Allow unauthenticated invocations"** (This makes it public).
7. **Container, Variables & Secrets, Connections** (Expand this arrow at the bottom):
* **Variables:** Add your Environment Variables here (`DB_USER`, `DB_PASS`, etc.).
* **Cloud SQL Connections:** Click **Add Connection** and select the `mediamaze-db` you created in Phase 3.


8. Click **Create**.

---

### **Phase 5: Connecting Storage (The "Mount")**

*What Antigravity did: Added volume arguments to the deploy command.*
*What you do:*

1. Go to **Cloud Storage** > **Create Bucket**.
* Name: `mediamaze-uploads`.
* Region: `us-central1`.
* **Uncheck** "Enforce public access prevention" if you want these photos to be viewable by users directly.


2. Go back to **Cloud Run**.
3. Click your service (`mediamaze-photos`).
4. Click **Edit & Deploy New Revision** (Top center).
5. Go to the **Volumes** tab.
6. Click **Add Volume** > **Cloud Storage Bucket**.
* Name: `upload-volume`.
* Bucket: Select `mediamaze-uploads`.


7. Go to the **Container** tab (next to Volumes).
8. Click **Volume Mounts**.
* Select `upload-volume`.
* Mount path: `/var/www/html/uploads`.


9. Click **Deploy**.

---

### **Admin & Maintenance Tasks**

#### **1. How to Rollback (Undo a mistake)**

If you deploy bad code and the site crashes:

1. Go to **Cloud Run** > Your Service.
2. Click the **Revisions** tab.
3. You will see a list of every deployment you've ever made.
4. Find the last green one. Click **Manage Traffic**.
5. Set traffic to 100% for that healthy revision.

#### **2. Viewing Logs (Debugging)**

1. Go to **Cloud Run** > Your Service.
2. Click the **Logs** tab.
3. You can filter by "Severity" (e.g., jump straight to **Error**).
4. *Pro Tip:* Text searches work here. Search for "syntax error" or "connection failed".

#### **3. Cost Control**

1. Go to **Billing** in the console.
2. Click **Budgets & Alerts**.
3. Create a Budget for **$10.00**.
4. Set it to email you at 50%, 90%, and 100%. *This prevents "bill shock".*

---

### **Learning Resources**

**The Basics (Start Here):**

* **[Google Cloud Console 101:](https://www.google.com/search?q=https://cloud.google.com/docs/console)** Official overview of the interface.
* **[Cloud Run Quickstart (Console):](https://cloud.google.com/run/docs/quickstarts/deploy-container)** The official "Hello World" tutorial.
* **[Cloud SQL for MySQL Quickstart:](https://cloud.google.com/sql/docs/mysql/create-instance)** How to click through the database setup.

**The Advanced Stuff (For when you're ready):**

* **[IAM & Permissions:](https://cloud.google.com/iam/docs/overview)** Learning how to give specific people access to specific buckets (Cloud IAM).
* **[Custom Domains & SSL:](https://cloud.google.com/run/docs/mapping-custom-domains)** The official manual guide for what we discussed regarding domains.
* **[Secret Manager:](https://cloud.google.com/secret-manager/docs)** The "Professional" way to store database passwords instead of environment variables.

Here is the consolidated guide for hosting your PHP application on Google Cloud Run, formatted as a printable Markdown document. You can save this text as a `.md` file or print it directly.

---

# Migrating PHP Apps to Google Cloud Run: A Comprehensive Guide

## 1. Executive Summary

This document outlines the transition from a traditional Virtual Machine (VM) hosting model to Google Cloud Run (Serverless). This approach removes the need for operating system maintenance (Ubuntu updates, security patches) while offering significant cost savings for personal or medium-traffic applications.

## 2. Cost Analysis: VM vs. Serverless

A side-by-side comparison of running a standard PHP application on a Virtual Machine (Compute Engine) versus Cloud Run.

| Feature | Compute Engine (VM) | Cloud Run (Serverless) |
| --- | --- | --- |
| **Billing Model** | **Rent by the Second.** You pay for every second the server is *on*, even if no one visits. | **Pay per Request.** You pay only when code is actually running (processing a user visit). |
| **Idle Cost** | **~$25/mo** (for an always-on `e2-medium`). | **$0.00**. If no one visits at 3 AM, you pay nothing. |
| **Scaling** | **Manual/Risk of Crash.** If traffic spikes, the server may fail unless complex auto-scaling is configured. | **Instant/Automatic.** Google spins up hundreds of copies instantly to handle spikes, then shuts them down. |
| **Maintenance** | **High.** Requires manual patching of Linux, PHP, and Apache. | **Zero.** Google handles OS, PHP versions, and security patches. |
| **Free Tier** | **e2-micro** is free (1 instance). | **2 Million Requests/mo** are free. |
| **Est. Monthly Bill** | **$0 - $30** | **$0 - $5** (Typical for personal/SMB apps). |

**Note on Databases:** Since your current app does not use SQL, your cost will likely be **$0.00**. If you add SQL later, Cloud SQL (Managed MySQL) starts at ~$10/mo, or you can run a small database in a container for cheaper.

---

## 3. The "Antigravity" Integration (AI-First Workflow)

Since you are using Google's Antigravity IDE, you can bypass complex command-line setups by linking the IDE directly to your Cloud account via the **Model Context Protocol (MCP)**.

### Step A: Enable GCP Integration

1. Open Antigravity.
2. Open the **Agent Manager** (Cmd+K / Ctrl+K).
3. Type: *"Install the Google Cloud MCP server."*
4. Allow the Agent to authenticate. A browser window will open to log you into Google Cloud.

### Step B: Verification

Ask the Agent: *"List my current Cloud Run services."*

* If it replies "You have no services yet," the connection is successful. The AI can now deploy infrastructure for you.

---

## 4. Migration Step-by-Step (Docker Setup)

Cloud Run requires your application to be packaged as a "Container." This replaces the need to manually install Apache/PHP on a server.

### Create the Dockerfile

Create a file named `Dockerfile` (no extension) in your project's root folder (where `index.php` is). Paste the following content:

```dockerfile
# 1. Use the official PHP image with Apache pre-installed
FROM php:8.2-apache

# 2. Copy your local files into the container's web folder
COPY . /var/www/html/

# 3. Configure Apache to listen on the correct Cloud Run port
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# 4. Use production PHP settings
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# 5. Set ownership permissions
RUN chown -R www-data:www-data /var/www/html

```

---

## 5. Deployment

With Antigravity connected, you do not need to use the terminal.

1. Open the Antigravity chat.
2. Issue the command:
> *"Build this project as a container and deploy it to Cloud Run. Call the service 'my-photo-app'. Allow unauthenticated access."*


3. **The Process:**
* The Agent enables Artifact Registry (storage for your code images).
* It builds the Docker container.
* It deploys to Cloud Run and returns a URL (e.g., `https://my-photo-app-xyz.a.run.app`).



---

## 6. Domain Name & SSL Configuration

SSL certificates are managed automatically by Google.

1. Go to the **Google Cloud Console** > **Cloud Run**.
2. Click **Manage Custom Domains** (top bar).
3. Click **Add Mapping**.
4. Select your service (`my-photo-app`).
5. Select your domain. (If you haven't used this domain on GCP before, you will be prompted to add a TXT record to your DNS settings to verify ownership).
6. **Update DNS:** Google will provide an IP address or CNAME. Log in to your registrar (GoDaddy, Namecheap, etc.) and update your **A Record** to point to this IP.
7. **SSL:** Wait 15-30 minutes. Google will automatically provision and install a valid SSL certificate.

---

## 7. Testing vs. Production Strategy

To ensure stability, use two separate Cloud Run services.

### The Strategy

1. **Staging Service:** Create a service named `app-staging`. Map it to `test.yourdomain.com`.
2. **Production Service:** Create a service named `app-prod`. Map it to `www.yourdomain.com`.

### The Workflow

1. **Develop:** Make code changes locally.
2. **Test:** Tell Antigravity: *"Deploy this to the 'app-staging' service."*
3. **Verify:** Visit `test.yourdomain.com`.
4. **Release:** If the test site works, tell Antigravity: *"Deploy the exact same image to 'app-prod'."*

This ensures you never break your live site while testing new features or SQL integrations.

---

### Next Step

Would you like me to generate the specific **SQL schema** for your photo album now, so you have it ready for when you decide to integrate the database?

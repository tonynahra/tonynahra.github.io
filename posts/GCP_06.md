Since Cloud Run containers are **ephemeral** (they are destroyed when not in use), any files saved to the "local disk" vanish when the container stops. For a photo album, you need **persistent storage**.

You have two main options. For your use case, **Option 1 is the clear winner**, but here is the breakdown of both.

### Option 1: Cloud Storage FUSE (Recommended)

This is the "Cloud Native" way. You store photos in a **Cloud Storage Bucket** (like a folder in the cloud), but you "mount" it to your container so your PHP app treats it like a normal folder (e.g., `/var/www/html/uploads`).

* **Best For:** Photo albums, user uploads, backups.
* **Pros:** Virtually infinite storage; you pay **only** for what you use.
* **Cons:** Slightly slower than a physical disk (milliseconds of latency), but negligible for viewing photos.
* **The "Gotcha":** It is not a "real" hard drive. You cannot run a database (like SQLite) on it because it doesn't support file locking. (You are using SQL, so this is fine).

**Cost Structure (Pay-per-use):**

* **Storage:** ~$0.02 per GB / month.
* **Operations:** Tiny cost for "Class A" operations (uploads) and "Class B" (reads).
* **Data Transfer:** Free within the same region (e.g., if Cloud Run and Bucket are both in `us-central1`).
* **Example Bill:**
* 10 GB of photos (approx 3,000 images) = **$0.20 / month**.



### Option 2: Cloud Filestore (NFS)

This connects a high-performance Network File System (NFS) to your Cloud Run instances. It behaves exactly like a local network drive on a Windows/Linux LAN.

* **Best For:** Legacy enterprise apps that require high-speed file processing or file locking.
* **Pros:** Fast, standard file system behavior.
* **Cons:** **Extremely Expensive** for small apps due to minimum sizing.
* **The "Gotcha":** The "Basic" tier has a **minimum size of 1 TiB (1,000 GB)**. You must pay for the full terabyte even if you store one photo.

**Cost Structure (Provisioned):**

* **Minimum Cost:** ~$0.16 per GB * 1,024 GB (min) = **~$163.00 / month**.
* **Example Bill:**
* 10 GB of photos = **$163.00 / month** (wasted capacity).



---

### Comparison Summary

| Feature | **Option 1: Cloud Storage FUSE** | **Option 2: Cloud Filestore** |
| --- | --- | --- |
| **Ideal for** | **Photo Albums**, Media, Backups | High-performance enterprise apps |
| **Minimum Cost** | **$0.00** (Pay for usage) | **~$163.00 / month** (1TB Minimum) |
| **Capacity** | Infinite (Auto-expanding) | Fixed (Must resize manually) |
| **Performance** | Good (Network speed) | Excellent (Local disk speed) |
| **Setup Difficulty** | Easy (Native in Cloud Run) | Medium (Requires VPC connector) |

---

### How to set up Option 1 (Cloud Storage) with Antigravity

Since you are using Antigravity, you can have the Agent handle the connection for you.

**1. Create the Bucket**

> "Create a Standard Class Cloud Storage bucket named `mediamaze-uploads` in `us-central1`. Make it private."

**2. Mount it to Cloud Run**

> "Update the `mediamaze-photos` service. Mount the bucket `mediamaze-uploads` to the path `/var/www/html/uploads`."

**3. Update PHP Code**
Your PHP code doesn't need to change much. It just writes to that folder:

```php
$target_dir = "/var/www/html/uploads/";
$target_file = $target_dir . basename($_FILES["fileToUpload"]["name"]);
move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file);

```

*Note: Because this is a "network" folder, functions like `file_exists()` might be slightly slower than on a local laptop, but `move_uploaded_file` works perfectly.*

Here are the CLI commands to generate your project structure locally, create the necessary Google Cloud resources, and deploy the application with the **users/** folder connected to Cloud Storage.

This script assumes you have the `gcloud` CLI installed and authorized (`gcloud auth login`).

### Phase 1: Create Local Project Structure

Copy and paste this block into your terminal. It creates the folders, a basic `index.php`, and the `Dockerfile`.

```bash
# 1. Create directory structure
mkdir -p my-photo-album/common/css
mkdir -p my-photo-album/common/js
cd my-photo-album

# 2. Create a simple CSS file
echo "body { font-family: sans-serif; padding: 20px; }" > common/css/style.css

# 3. Create the index.php (The App)
# This script checks if a user folder exists, creates it if not, and handles uploads.
cat <<EOF > index.php
<?php
// Define the path to the mounted bucket
\$storage_root = '/var/www/html/users';

// Simple Router to simulate "User Folders"
\$user = \$_GET['user'] ?? 'guest';
\$user_folder = "\$storage_root/\$user";

// Create user folder if it doesn't exist (This actually creates a "folder" in the Bucket)
if (!file_exists(\$user_folder)) {
    mkdir(\$user_folder, 0755, true);
}

// Handle Upload
if (\$_SERVER['REQUEST_METHOD'] === 'POST' && isset(\$_FILES['photo'])) {
    \$target_file = "\$user_folder/" . basename(\$_FILES['photo']['name']);
    if (move_uploaded_file(\$_FILES['photo']['tmp_name'], \$target_file)) {
        echo "<p style='color:green'>Uploaded to Cloud Storage: \$target_file</p>";
    } else {
        echo "<p style='color:red'>Upload failed. Check permissions.</p>";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="common/css/style.css">
    <title>Cloud Run Photo Album</title>
</head>
<body>
    <h1>Album for: <?php echo htmlspecialchars(\$user); ?></h1>
    
    <form method="post" enctype="multipart/form-data">
        <input type="file" name="photo" required>
        <button type="submit">Upload Photo</button>
    </form>

    <hr>
    <h3>Files in Bucket (<?php echo htmlspecialchars(\$user); ?>):</h3>
    <ul>
        <?php
        // List files in the user's folder
        \$files = scandir(\$user_folder);
        foreach (\$files as \$file) {
            if (\$file !== '.' && \$file !== '..') {
                echo "<li>\$file</li>";
            }
        }
        ?>
    </ul>
</body>
</html>
EOF

# 4. Create the Dockerfile
# We install Apache and ensure permissions are correct
cat <<EOF > Dockerfile
FROM php:8.2-apache

# Copy local files to web root
COPY . /var/www/html/

# Enable mod_rewrite (optional but good for future)
RUN a2enmod rewrite

# Fix permissions for the web root
RUN chown -R www-data:www-data /var/www/html
EOF

```

---

### Phase 2: Create Cloud Resources

Now we use `gcloud` to set up the storage and permissions.

```bash
# 1. Set your project ID (Replace 'YOUR_PROJECT_ID' with your actual ID)
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=us-central1
export BUCKET_NAME=mediamaze-users-storage
export SERVICE_NAME=mediamaze-photos

gcloud config set project $PROJECT_ID

# 2. Enable necessary APIs
gcloud services enable run.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com

# 3. Create the Cloud Storage Bucket (This will be your 'users' folder)
gcloud storage buckets create gs://$BUCKET_NAME --location=$REGION

# 4. Create the Cloud Run Service Account (Identity)
# It is best practice to give the app its own identity, not use the default one.
gcloud iam service-accounts create photo-app-sa --display-name="Photo App Service Account"

# 5. Grant Permission: Allow the App to Read/Write to the Bucket
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member="serviceAccount:photo-app-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

```

---

### Phase 3: Deploy with FUSE Mount

This is the critical command. We tell Cloud Run to take the bucket `mediamaze-users-storage` and mount it to `/var/www/html/users`.

```bash
# Deploy the container
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --service-account photo-app-sa@${PROJECT_ID}.iam.gserviceaccount.com \
    --allow-unauthenticated \
    --add-volume name=users_vol,type=cloud-storage,bucket=$BUCKET_NAME \
    --add-volume-mount volume=users_vol,mount-path=/var/www/html/users

```

### Explanation of flags:

* `--source .`: Builds the Docker container from your current folder automatically.
* `--add-volume`: Defines the bucket as a "disk" named `users_vol`.
* `--add-volume-mount`: Tells Linux to make that "disk" appear at `/var/www/html/users`.

### Testing

Once the command finishes, it will output a URL (e.g., `https://mediamaze-photos-xyz.run.app`).

1. Open `YOUR_URL?user=tony`.
2. Upload a file.
3. Go to the Google Cloud Console > **Cloud Storage**.
4. Open the `mediamaze-users-storage` bucket. You will see a folder named `tony` containing your photo.

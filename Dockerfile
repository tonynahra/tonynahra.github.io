# Use the official PHP image with Apache
FROM php:8.2-apache

# Enable mod_rewrite for future routing
RUN a2enmod rewrite

# Set the working directory inside the container
WORKDIR /var/www/html

# --- STEP 1: Copy and Rename the Main File ---
# This takes your current 'index2.html' and saves it as 'index.php' inside the container
COPY index2.html index.php

# --- STEP 2: Create Directories ---
# We need to manually create the 'common' folder inside the container
# because we aren't copying the whole folder at once.
RUN mkdir -p common
RUN mkdir -p images
RUN mkdir -p posts

# --- STEP 3: Copy Specific CSS Files ---
# Only copying the CSS files referenced in your HTML
COPY common/mainPage.css \
     common/cardLogic.css \
     common/tutorialEngine.css \
     common/

# --- STEP 4: Copy Specific JS Files ---
# Only copying the JS files referenced in your HTML
COPY common/financialTools.js \
     common/filterConfig.js \
     common/cardLogic.js \
     common/mainPage.js \
     common/tracker.js \
     common/

# --- STEP 5: Copy Data and Assets ---
# You mentioned JSON files and images.
# This copies ALL .json files from your root folder (modify if they are in a subfolder)
COPY *.json ./

COPY posts/ posts/

# This copies the entire 'images' folder. 
# If your images are mixed with other apps' images, let me know!
COPY images/ images/

# --- STEP 6: Google Cloud Run Port Configuration ---
# Configure Apache to listen on port 8080 (Cloud Run requirement)
RUN sed -i 's/80/8080/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# Expose the port
EXPOSE 8080

(function() {
    // 1. Get the current URL parameters from the hash (MediaMaze format)
    // Format: https://mediamaze.com/media/LP/?PUB/tony/Certificates_Album#info
    const queryString = window.location.search.substring(1); // PUB/tony/Certificates_Album
    if (!queryString.startsWith('PUB/')) return;

    const parts = queryString.split('/');
    if (parts.length < 3) return;

    const user = parts[1];
    const album = parts[2];

    // 2. Determine the API Endpoint
    // If this script is loaded from the origin server, we can deduce the base path.
    // Otherwise, you must hardcode the URL below.
    // Example Hardcode: const apiUrl = 'https://tonynahra.github.io/PhotoAlbum/public/view_counts.php';
    
    // Auto-detection logic (assumes script is in same folder as view_counts.php)
    const scriptSrc = document.currentScript.src;
    const apiUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) + '/view_counts.php';

    // 3. Call the API
    fetch(`${apiUrl}?user=${user}&album=${album}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("View recorded. Total views:", data.views);
            }
        })
        .catch(err => console.error("View tracking error:", err));
})();

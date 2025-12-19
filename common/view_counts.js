(function() {
    const API_URL = 'https://mediamaze.com/tony/PhotoAlbum/public/view_counts.php'; 
    const queryString = window.location.search.substring(1); 
    if (!queryString.startsWith('PUB/')) return;
    const parts = queryString.split('/');
    if (parts.length < 3) return;
    const user = parts[1];
    const album = parts[2];
    fetch(`${API_URL}?user=${user}&album=${album}`)
        .then(response => response.json())
        .then(data => { if (data.success) console.log("View recorded:", data.views); })
        .catch(err => console.error(err));
})();

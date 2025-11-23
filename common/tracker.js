  const ENDPOINT = 'https://mediamaze.com/tony/track.php'; 

  const payload = {
    event: 'page_view',
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  // We use fetch here to see the specific error in the Console
  fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Server responded with ' + response.status);
    }
    return response.text(); // Read as text first to debug PHP errors
  })
  .then(data => {
    console.log('SUCCESS: Data sent to server:', data);
  })
  .catch(error => {
    console.error('FAILED: Tracking error:', error);
    // This alert will tell us exactly what's wrong
    alert('Tracking Error: ' + error.message);
  });

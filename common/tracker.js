fetch('https://mediamaze.com/tony/track.php', {
    method: 'POST',
    credentials: 'omit', 
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
})
.then(response => console.log('Logged'))
.catch(error => console.error('Error:', error));

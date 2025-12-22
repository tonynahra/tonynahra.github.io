// --- SECURITY FLAG (Required for LP.js to run) ---
window.lpEndLoaded = true; 

// --- STATE ---
let endListLinks = [];
let endSelectedIndex = -1;

// --- END SCREEN LOGIC ---
async function openEndScreen() {
    const modal = document.getElementById('end-screen-modal');
    const contentList = document.getElementById('end-album-list');
    
    // Strip query/hash
    let currentAlbum = "";
    if (window.location.search && window.location.search.length > 1) {
        currentAlbum = window.location.search.substring(1).replace('.json', '');
    } else {
        currentAlbum = window.location.hash.substring(1).split('#')[0].replace('.json', '');
    }

    if (!modal || !contentList) return;

    modal.style.display = 'flex';
    contentList.innerHTML = '<div class="loading-spinner">Loading other albums...</div>';
    
    endListLinks = [];
    endSelectedIndex = -1;

    try {
        const response = await fetch(`list_albums.php?album=${encodeURIComponent(currentAlbum)}`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        let user = "User";
        if (data.dir) {
            const parts = data.dir.split('/');
            if (parts.length > 1) user = parts[1]; 
        }

        const titleEl = modal.querySelector('h2');
        if (titleEl) titleEl.textContent = `Other albums by ${user}`;

        contentList.innerHTML = '';
        
        if (data.albums && data.albums.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'end-album-list';

            data.albums.forEach(album => {
                const li = document.createElement('li');
                
                if (album.is_current) {
                    li.className = 'current';
                    li.textContent = album.name;
                } else {
                    const a = document.createElement('a');
                    a.href = `?${data.dir}/${album.name}#info`; 
                    a.textContent = album.name;
                    li.appendChild(a);
                }
                ul.appendChild(li);
            });
            
            const container = document.createElement('div');
            container.className = 'album-list-container';
            container.appendChild(ul);
            contentList.appendChild(container);

            endListLinks = Array.from(ul.querySelectorAll('a'));

        } else {
            contentList.innerHTML = '<p>No other albums found.</p>';
        }

    } catch (e) {
        console.error(e);
        contentList.innerHTML = '<p style="color:red">Error loading list.</p>';
    }
}

// --- KEYBOARD NAVIGATION HANDLER ---
window.lpEndNav = function(key) {
    if (endListLinks.length === 0) return;

    if (key === 'ArrowDown') {
        endSelectedIndex++;
        if (endSelectedIndex >= endListLinks.length) endSelectedIndex = 0; 
    } else if (key === 'ArrowUp') {
        endSelectedIndex--;
        if (endSelectedIndex < 0) endSelectedIndex = endListLinks.length - 1; 
    } else if (key === 'Enter') {
        if (endSelectedIndex > -1 && endListLinks[endSelectedIndex]) {
            endListLinks[endSelectedIndex].click();
        }
        return;
    }

    endListLinks.forEach((link, idx) => {
        if (idx === endSelectedIndex) {
            link.classList.add('keyboard-selected');
            link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            link.classList.remove('keyboard-selected');
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-end-btn');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('end-screen-modal').style.display = 'none';
        });
    }
});

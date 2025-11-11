document.addEventListener('DOMContentLoaded', () => {
    // Selects all section headings
    const sections = document.querySelectorAll('h2[id], h3[id]');
    
    // Selects only the pillar/section links in the nav
    const navLinks = document.querySelectorAll('#tna-sidebar-nav a[href^="#"]');
    
    // Filter out the "Top of Page" link
    const sectionLinks = Array.from(navLinks).filter(link => link.getAttribute('href') !== '#tna-page-top');

    // Create a list of section IDs to observe
    const sectionIds = sectionLinks.map(link => link.getAttribute('href'));
    
    // Find the section elements themselves
    const sectionElements = sectionIds
        .map(id => document.querySelector(id))
        .filter(section => section !== null);

    const removeActiveClasses = () => {
        sectionLinks.forEach(link => link.classList.remove('tna-active'));
    };

    const addActiveClass = (id) => {
        // Find the link that points to this ID
        const activeLink = document.querySelector(`#tna-sidebar-nav a[href="#${id}"]`);
        if (activeLink) {
            removeActiveClasses();
            activeLink.classList.add('tna-active');
        }
    };

    // This observer watches as you scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                addActiveClass(entry.target.id);
            }
        });
    }, { 
        rootMargin: '0px 0px -70% 0px', // Triggers when the section is 30% from the top
        threshold: 0.1 
    });

    // Tell the observer to watch each section
    sectionElements.forEach(section => observer.observe(section));

    // Inject a small <style> tag to highlight the active link
    const style = document.createElement('style');
    style.innerHTML = `
        #tna-sidebar-nav a.tna-active {
            color: #0056b3;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
});

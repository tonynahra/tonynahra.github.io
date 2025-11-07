document.addEventListener('DOMContentLoaded', () => {
    // Selects all section headings
    const sections = document.querySelectorAll('h3[id^="pillar-"]');
    // Selects only the pillar links in the nav
    const navLinks = document.querySelectorAll('#sidebar-nav a[href^="#pillar-"]');

    const removeActiveClasses = () => {
        navLinks.forEach(link => link.classList.remove('active'));
    };

    const addActiveClass = (id) => {
        const activeLink = document.querySelector(`#sidebar-nav a[href="#${id}"]`);
        if (activeLink) {
            removeActiveClasses();
            activeLink.classList.add('active');
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
    sections.forEach(section => observer.observe(section));

    // Inject a small <style> tag to highlight the active link
    const style = document.createElement('style');
    style.innerHTML = `
        #sidebar-nav a.active {
            color: #0056b3;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
});

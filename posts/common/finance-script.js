/**
 * This script handles the "active" state highlighting for the sidebar navigation
 * as the user scrolls through the report sections.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('#nav-list .nav-link');
    
    if (!sections.length || !navLinks.length) {
        console.warn('Scroll-spy navigation or sections not found.');
        return;
    }

    const onScroll = () => {
        let current = '';

        sections.forEach( section => {
            const sectionTop = section.offsetTop;
            // Add a 150px offset to trigger the active state a bit earlier
            if (pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach( link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    };
    
    // Run on load and on scroll
    window.addEventListener('scroll', onScroll);
    onScroll(); 
});

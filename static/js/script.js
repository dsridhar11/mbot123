// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Responsive navbar toggle (if you add hamburger in future)
// const toggleBtn = document.querySelector('.nav-toggle');
// const navMenu = document.querySelector('.nav-links');

// toggleBtn.addEventListener('click', () => {
//   navMenu.classList.toggle('active');
// });

// Highlight navbar items on scroll
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section');
  const scrollY = window.pageYOffset;

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    const sectionHeight = section.offsetHeight;
    const id = section.getAttribute('id');

    if (scrollY > sectionTop && scrollY < sectionTop + sectionHeight) {
      document.querySelectorAll('.navbar nav ul li a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
});

// Optional: Button click feedback or loading effect
document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 300);
  });
});

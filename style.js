// Navigation mobile
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Fermer le menu quand on clique sur un lien
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
}

// Smooth scroll avec offset pour la navbar fixe
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// Animation au scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observer les éléments à animer
document.querySelectorAll('.project-card, .skill-category, .stat-card, .timeline-item, .contact-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Navbar change on scroll avec effet 3D
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  lastScroll = currentScroll;
});

// Téléchargement du CV
const downloadCVBtn = document.getElementById('downloadCV');

if (downloadCVBtn) {
  downloadCVBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Créer un élément <a> temporaire pour télécharger
    // Note: Vous devrez ajouter votre fichier CV dans le dossier
    // Pour l'instant, on simule le téléchargement
    const link = document.createElement('a');
    link.href = 'images/monCV.pdf'; // Remplacez par le chemin de votre CV
    link.download = 'monCV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Si le fichier n'existe pas, afficher un message
    link.addEventListener('error', () => {
      alert('Suis désolé, je n\'ai pas encore ajouté mon CV.');
    });
  });
}

// Effet parallaxe sur les shapes
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const shapes = document.querySelectorAll('.shape');
  
  shapes.forEach((shape, index) => {
    const speed = 0.5 + (index * 0.1);
    shape.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
  });
});

// Compteur animé pour les stats
const animateCounter = (element, target) => {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target === 'M1' ? 'M1' : Math.floor(target) + '+';
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current) + '+';
    }
  }, 30);
};

// Observer pour les stats
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
      entry.target.classList.add('counted');
      const statNumber = entry.target.querySelector('.stat-number');
      if (statNumber) {
        const text = statNumber.textContent;
        if (text.includes('+')) {
          const number = parseInt(text);
          animateCounter(statNumber, number);
        }
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-card').forEach(card => {
  statsObserver.observe(card);
});

// Effet de typing pour le nom (optionnel)
const nameElement = document.querySelector('.name');
if (nameElement) {
  const text = nameElement.textContent;
  nameElement.textContent = '';
  let i = 0;
  
  const typeWriter = () => {
    if (i < text.length) {
      nameElement.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 100);
    }
  };
  
  // Démarrer après un court délai
  setTimeout(typeWriter, 500);
}


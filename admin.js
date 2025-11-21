// ============================================
// SYSTÈME D'ADMINISTRATION COMPLET
// ============================================


const ADMIN_PASSWORD = 'mamekhady1'; 

// Fonction de hash simple (pour un portfolio statique)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Vérifier si l'utilisateur est connecté
function isAdmin() {
  const storedHash = localStorage.getItem('adminHash');
  const correctHash = hashPassword(ADMIN_PASSWORD);
  return storedHash === correctHash;
}

// Connexion admin
function loginAdmin(password) {
  const inputHash = hashPassword(password);
  const correctHash = hashPassword(ADMIN_PASSWORD);
  
  if (inputHash === correctHash) {
    localStorage.setItem('adminHash', inputHash);
    return true;
  }
  return false;
}

// Déconnexion admin
function logoutAdmin() {
  localStorage.removeItem('adminHash');
  location.reload();
}

// ============================================
// GESTION DES PROJETS
// ============================================

// Charger les projets depuis localStorage
function loadProjects() {
  const stored = localStorage.getItem('portfolioProjects');
  return stored ? JSON.parse(stored) : [];
}

// Sauvegarder les projets
function saveProjects(projects) {
  localStorage.setItem('portfolioProjects', JSON.stringify(projects));
}

// Ajouter un nouveau projet
function addProject(projectData) {
  if (!isAdmin()) {
    alert('Accès refusé. Vous devez être connecté en tant qu\'administrateur.');
    return false;
  }

  const projects = loadProjects();
  const newProject = {
    id: Date.now(),
    image: projectData.image || 'images/senelec-predict.jpg',
    title: projectData.title || 'Nouveau projet',
    description: projectData.description || '',
    technologies: projectData.technologies || [],
    link: projectData.link || '#',
    linkText: projectData.linkText || 'En savoir plus',
    createdAt: new Date().toISOString()
  };

  projects.push(newProject);
  saveProjects(projects);
  renderProjects();
  return true;
}

// Supprimer un projet
function deleteProject(projectId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
    return false;
  }

  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
  renderProjects();
  return true;
}

// Ajouter les boutons de suppression aux projets statiques
function addDeleteButtonsToStaticProjects() {
  if (!isAdmin()) return;
  
  const staticProjects = document.querySelectorAll('.projects-grid .project-card:not(.project-card-dynamic):not(.project-placeholder)');
  staticProjects.forEach((projectCard, index) => {
    if (projectCard.querySelector('.delete-project-btn')) return;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-project-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = 'Supprimer';
    deleteBtn.onclick = () => {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce projet statique ? Cette action ne peut pas être annulée.')) {
        projectCard.style.display = 'none';
      }
    };
    projectCard.style.position = 'relative';
    projectCard.appendChild(deleteBtn);
  });
}

// Rendre les projets dans la page
function renderProjects() {
  const projectsGrid = document.querySelector('.projects-grid');
  if (!projectsGrid) return;

  const dynamicProjects = projectsGrid.querySelectorAll('.project-card-dynamic');
  dynamicProjects.forEach(project => project.remove());

  addDeleteButtonsToStaticProjects();

  const projects = loadProjects();
  
  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card project-card-dynamic';
    projectCard.dataset.projectId = project.id;

    const techTags = project.technologies.map(tech => 
      `<span class="tech-tag">${tech}</span>`
    ).join('');

    const projectImage = project.image || 'images/senelec-predict.jpg';
    // Supporter plusieurs images par projet (image principale + additionalImages)
    const allProjectImages = [projectImage].concat(project.additionalImages || []).filter(Boolean).slice(0,5);
    const projectImagesHTML = allProjectImages.map(img => `
        <div class="project-image-item">
          <img src="${img}" alt="${project.title}">
        </div>
      `).join('');

    projectCard.innerHTML = `
      <div class="project-images-container">
        ${projectImagesHTML}
      </div>
      ${isAdmin() ? `<button class="delete-project-btn" onclick="deleteProject(${project.id})" title="Supprimer">
        <i class="fas fa-times"></i>
      </button>` : ''}
      <h3 class="project-title">${project.title}</h3>
      <p class="project-description">${project.description}</p>
      <div class="project-tech">${techTags}</div>
      <a href="${project.link}" ${project.link.startsWith('http') ? 'target="_blank"' : ''} class="project-link">
        <i class="${project.link.includes('github') ? 'fab fa-github' : 'fas fa-eye'}"></i> ${project.linkText}
      </a>
    `;

    const placeholder = projectsGrid.querySelector('.project-placeholder');
    if (placeholder) {
      projectsGrid.insertBefore(projectCard, placeholder);
    } else {
      projectsGrid.appendChild(projectCard);
    }
  });

  // Initialiser les sliders d'images pour les projets
  initImageSliders('.projects-grid .project-images-container', 1000);

  const placeholder = projectsGrid.querySelector('.project-placeholder');
  if (placeholder) {
    if (isAdmin()) {
      placeholder.style.display = 'block';
      placeholder.style.cursor = 'pointer';
      placeholder.onclick = () => showAddProjectModal();
    } else {
      placeholder.style.display = 'none';
    }
  }
}

// Initialiser les sliders d'images pour une liste de conteneurs
function initImageSliders(selector, intervalMs = 1000) {
  const containers = document.querySelectorAll(selector);
  containers.forEach(container => {
    // Clear existing interval if any
    if (container._sliderInterval) {
      clearInterval(container._sliderInterval);
      container._sliderInterval = null;
    }

    const items = Array.from(container.querySelectorAll('.project-image-item, .activity-image-item'));
    if (items.length <= 1) return;

    // Activate slider mode via class so CSS can position items absolutely
    container.classList.add('slider');

    // Hide all except first
    items.forEach((it, idx) => {
      it.style.display = idx === 0 ? 'block' : 'none';
      // ensure item fills container when in slider mode
      it.style.position = idx === 0 ? (it.style.position || '') : 'absolute';
    });

    let current = 0;
    container._sliderInterval = setInterval(() => {
      items[current].style.display = 'none';
      current = (current + 1) % items.length;
      items[current].style.display = 'block';
    }, intervalMs);
  });
}

// ============================================
// GESTION DES FORMATIONS
// ============================================

// Charger les formations depuis localStorage
function loadEducations() {
  const stored = localStorage.getItem('portfolioEducations');
  if (stored) return JSON.parse(stored);
  
  // Initialiser avec les formations par défaut
  const defaultEducations = [
    { id: 1, year: '2024-2025', title: 'Master 1 Gestion des Données et Ingénierie Logiciel', location: 'Université Gaston Berger (UGB)' },
    { id: 2, year: '2023-2024', title: 'Licence 3 Informatique', location: 'Université Gaston Berger (UGB)' },
    { id: 3, year: '2022-2023', title: 'Licence 2 MPI', location: 'Université Gaston Berger (UGB)' },
    { id: 4, year: '2021-2022', title: 'Licence 1 MPI', location: 'Université Gaston Berger (UGB)' },
    { id: 5, year: '2021', title: 'Baccalauréat S1', location: 'Kaolack' }
  ];
  saveEducations(defaultEducations);
  return defaultEducations;
}

// Sauvegarder les formations
function saveEducations(educations) {
  localStorage.setItem('portfolioEducations', JSON.stringify(educations));
}

// Rendre les formations
function renderEducations() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  // Supprimer les formations dynamiques
  const dynamicItems = timeline.querySelectorAll('.timeline-item-dynamic');
  dynamicItems.forEach(item => item.remove());

  const educations = loadEducations();
  
  educations.forEach((edu, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item timeline-item-dynamic';
    item.dataset.educationId = edu.id;
    
    if (index % 2 === 0) {
      item.style.flexDirection = 'row';
    } else {
      item.style.flexDirection = 'row-reverse';
    }

    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        ${isAdmin() ? `<button class="edit-education-btn" onclick="editEducation(${edu.id})" title="Modifier">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-education-btn" onclick="deleteEducation(${edu.id})" title="Supprimer">
          <i class="fas fa-times"></i>
        </button>` : ''}
        <div class="timeline-year">${edu.year}</div>
        <h3 class="timeline-title">${edu.title}</h3>
        <p class="timeline-location">${edu.location}</p>
      </div>
    `;
    
    timeline.appendChild(item);
  });
}

// Ajouter une formation
function addEducation(educationData) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  const educations = loadEducations();
  const newEducation = {
    id: Date.now(),
    year: educationData.year || '',
    title: educationData.title || '',
    location: educationData.location || ''
  };

  educations.push(newEducation);
  saveEducations(educations);
  renderEducations();
  return true;
}

// Modifier une formation
function editEducation(educationId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return;
  }

  const educations = loadEducations();
  const education = educations.find(e => e.id === educationId);
  if (!education) return;

  showEditEducationModal(education);
}

// Supprimer une formation
function deleteEducation(educationId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
    return false;
  }

  const educations = loadEducations();
  const filtered = educations.filter(e => e.id !== educationId);
  saveEducations(filtered);
  renderEducations();
  return true;
}

// ============================================
// GESTION DES COMPÉTENCES
// ============================================

// Charger les compétences depuis localStorage
function loadSkills() {
  const stored = localStorage.getItem('portfolioSkills');
  if (stored) return JSON.parse(stored);
  
  // Initialiser avec les compétences par défaut
  const defaultSkills = [
    {
      id: 1,
      icon: 'fa-code',
      title: 'Langages de programmation',
      skills: ['C', 'C++', 'Java', 'JavaScript', 'HTML/CSS', 'PHP', 'PL/pgSQL', 'Python', 'SQL', 'Lisp']
    },
    {
      id: 2,
      icon: 'fa-database',
      title: 'Bases de données',
      skills: ['PostgreSQL', 'MySQL', 'PHPMyAdmin', 'Oracle']
    },
    {
      id: 3,
      icon: 'fa-tools',
      title: 'Outils & Frameworks',
      skills: ['Git', 'Firebase', 'Flutter', 'Qt', 'VS Code', 'Cursor', 'Kali Linux', 'Angular', 'MongoDB', 'Spring Boot']
    },
    {
      id: 4,
      icon: 'fa-cogs',
      title: 'Autres compétences',
      skills: ['Programmation Système', 'Réseaux (Sockets)', 'Shell Scripting', 'Conception UML', 'MCD']
    }
  ];
  saveSkills(defaultSkills);
  return defaultSkills;
}

// Sauvegarder les compétences
function saveSkills(skills) {
  localStorage.setItem('portfolioSkills', JSON.stringify(skills));
}

// Rendre les compétences
function renderSkills() {
  const skillsGrid = document.querySelector('.skills-grid');
  if (!skillsGrid) return;

  // Supprimer les catégories dynamiques
  const dynamicCategories = skillsGrid.querySelectorAll('.skill-category-dynamic');
  dynamicCategories.forEach(cat => cat.remove());

  const skills = loadSkills();
  
  skills.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'skill-category skill-category-dynamic';
    categoryDiv.dataset.categoryId = category.id;

    const skillTags = category.skills.map(skill => 
      `<span class="skill-tag">${skill}</span>`
    ).join('');

    categoryDiv.innerHTML = `
      ${isAdmin() ? `
        <button class="edit-skill-category-btn" onclick="editSkillCategory(${category.id})" title="Modifier">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-skill-category-btn" onclick="deleteSkillCategory(${category.id})" title="Supprimer">
          <i class="fas fa-times"></i>
        </button>
      ` : ''}
      <h3 class="category-title">
        <i class="fas ${category.icon}"></i> ${category.title}
      </h3>
      <div class="skill-tags">${skillTags}</div>
    `;
    
    skillsGrid.appendChild(categoryDiv);
  });
}

// Ajouter une catégorie de compétences
function addSkillCategory(categoryData) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  const skills = loadSkills();
  const newCategory = {
    id: Date.now(),
    icon: categoryData.icon || 'fa-code',
    title: categoryData.title || 'Nouvelle catégorie',
    skills: categoryData.skills || []
  };

  skills.push(newCategory);
  saveSkills(skills);
  renderSkills();
  return true;
}

// Modifier une catégorie de compétences
function editSkillCategory(categoryId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return;
  }

  const skills = loadSkills();
  const category = skills.find(c => c.id === categoryId);
  if (!category) return;

  showEditSkillCategoryModal(category);
}

// Supprimer une catégorie de compétences
function deleteSkillCategory(categoryId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
    return false;
  }

  const skills = loadSkills();
  const filtered = skills.filter(c => c.id !== categoryId);
  saveSkills(filtered);
  renderSkills();
  return true;
}

// ============================================
// GESTION DE LA SECTION "À PROPOS"
// ============================================

// Charger les données "À propos"
function loadAbout() {
  const stored = localStorage.getItem('portfolioAbout');
  if (stored) return JSON.parse(stored);
  
  const defaultAbout = {
    paragraphs: [
      'Étudiant en Master 1 Gestion des Données et Ingénierie Logiciel à l\'UGB, je suis passionné par le développement logiciel, l\'IA et l\'administration de bases de données. Je m\'oriente vers la data science avec une forte base en programmation système, web et mobile.',
      'Mon objectif est de combiner mes compétences techniques en développement avec une expertise approfondie en analyse de données et intelligence artificielle pour créer des solutions innovantes.'
    ],
    stats: [
      { icon: 'fa-code', number: '10+', label: 'Projets réalisés' },
      { icon: 'fa-graduation-cap', number: 'M1', label: 'Niveau d\'étude actuel' },
      { icon: 'fa-language', number: '6+', label: 'Langages de programmation maîtrisés' }
    ]
  };
  saveAbout(defaultAbout);
  return defaultAbout;
}

// Sauvegarder les données "À propos"
function saveAbout(about) {
  localStorage.setItem('portfolioAbout', JSON.stringify(about));
}

// Rendre la section "À propos"
function renderAbout() {
  const aboutText = document.querySelector('.about-text');
  const aboutStats = document.querySelector('.about-stats');
  if (!aboutText || !aboutStats) return;

  const about = loadAbout();

  // Rendre les paragraphes
  aboutText.innerHTML = about.paragraphs.map((para, index) => `
    <p data-para-index="${index}">
      ${para}
      ${isAdmin() ? `<button class="edit-para-btn" onclick="editAboutParagraph(${index})" title="Modifier">
        <i class="fas fa-edit"></i>
      </button>` : ''}
    </p>
  `).join('');

  // Rendre les stats
  aboutStats.innerHTML = about.stats.map((stat, index) => `
    <div class="stat-card" data-stat-index="${index}">
      ${isAdmin() ? `
        <button class="edit-stat-btn" onclick="editStat(${index})" title="Modifier">
          <i class="fas fa-edit"></i>
        </button>
      ` : ''}
      <div class="stat-icon">
        <i class="fas ${stat.icon}"></i>
      </div>
      <div class="stat-number">${stat.number}</div>
      <div class="stat-label">${stat.label}</div>
    </div>
  `).join('');

  // Ajouter le bouton d'ajout de paragraphe
  if (isAdmin() && !aboutText.querySelector('.add-para-btn')) {
    const addBtn = document.createElement('button');
    addBtn.className = 'add-para-btn btn btn-secondary';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter un paragraphe';
    addBtn.onclick = () => showAddParagraphModal();
    aboutText.appendChild(addBtn);
  }

  // Ajouter le bouton d'ajout de stat
  if (isAdmin() && !aboutStats.querySelector('.add-stat-btn')) {
    const addBtn = document.createElement('button');
    addBtn.className = 'add-stat-btn btn btn-secondary';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter une statistique';
    addBtn.onclick = () => showAddStatModal();
    aboutStats.appendChild(addBtn);
  }
}

// ============================================
// GESTION DU CV
// ============================================

// Charger le chemin du CV
function loadCV() {
  return localStorage.getItem('portfolioCV') || 'cv.pdf';
}

// Sauvegarder le chemin du CV
function saveCV(cvPath) {
  localStorage.setItem('portfolioCV', cvPath);
  updateCVLink();
}

// Mettre à jour le lien du CV
function updateCVLink() {
  const cvPath = loadCV();
  const downloadBtn = document.getElementById('downloadCV');
  if (downloadBtn) {
    downloadBtn.href = cvPath;
  }
}

// ============================================
// GESTION DU HERO (Description, Subtitle)
// ============================================

// Charger les données du hero
function loadHero() {
  const stored = localStorage.getItem('portfolioHero');
  if (stored) return JSON.parse(stored);
  
  const defaultHero = {
    description: 'Étudiant en Master 1 Gestion des Données et Ingénierie Logiciel à l\'UGB',
    subtitle: 'Développeur Web & Mobile | Futur Data Scientist'
  };
  saveHero(defaultHero);
  return defaultHero;
}

// Sauvegarder les données du hero
function saveHero(hero) {
  localStorage.setItem('portfolioHero', JSON.stringify(hero));
  renderHero();
}

// Rendre le hero
function renderHero() {
  const hero = loadHero();
  const descriptionEl = document.querySelector('.hero-description');
  const subtitleEl = document.querySelector('.hero-subtitle-wrapper');
  
  if (descriptionEl) {
    descriptionEl.textContent = hero.description;
    if (isAdmin()) {
      descriptionEl.style.cursor = 'pointer';
      descriptionEl.title = 'Cliquez pour modifier';
      descriptionEl.onclick = () => showEditHeroModal();
    }
  }
  
  if (subtitleEl) {
    subtitleEl.textContent = hero.subtitle;
  }
}

// ============================================
// GESTION DES ACTIVITÉS
// ============================================

// Charger les activités depuis localStorage
function loadActivities() {
  const stored = localStorage.getItem('portfolioActivities');
  return stored ? JSON.parse(stored) : [];
}

// Sauvegarder les activités
function saveActivities(activities) {
  localStorage.setItem('portfolioActivities', JSON.stringify(activities));
}

// Ajouter une nouvelle activité
function addActivity(activityData) {
  if (!isAdmin()) {
    alert('Accès refusé. Vous devez être connecté en tant qu\'administrateur.');
    return false;
  }

  const activities = loadActivities();
  const newActivity = {
    id: Date.now(),
    image: activityData.image || 'images/senelec-predict.jpg',
    title: activityData.title || 'Nouvelle activité',
    description: activityData.description || '',
    date: activityData.date || new Date().toLocaleDateString('fr-FR'),
    additionalImages: activityData.additionalImages || [],
    createdAt: new Date().toISOString()
  };

  activities.push(newActivity);
  saveActivities(activities);
  renderActivities();
  return true;
}

// Supprimer une activité
function deleteActivity(activityId) {
  if (!isAdmin()) {
    alert('Accès refusé.');
    return false;
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
    return false;
  }

  const activities = loadActivities();
  const filtered = activities.filter(a => a.id !== activityId);
  saveActivities(filtered);
  renderActivities();
  return true;
}

// Initialiser les activités par défaut
function initDefaultActivities() {
  const activities = loadActivities();
  
  if (activities.length === 0) {
    const defaultActivities = [
      {
        id: Date.now(),
        image: 'images/tutorat.jpg',
        title: 'Tutorat',
        description: 'Session de tutorat que j\'ai animée pour aider les étudiants en programmation.',
        date: '2024',
        createdAt: new Date().toISOString()
      },
      {
        id: Date.now() + 1,
        image: 'images/avecBambaDiagne.jpg',
        title: '72H du Club Informatique de l\'UGB',
        description: 'Participation aux 72 heures du club informatique de l\'Université Gaston Berger. Événement rassemblant les membres du club pour des activités de développement et d\'innovation.',
        date: '2024',
        additionalImages: ['images/avecLesAutreMembreDuClub.jpg', 'images/avecMonAmi.jpg'],
        createdAt: new Date().toISOString()
      }
    ];
    
    saveActivities(defaultActivities);
  }
}

// Rendre les activités dans la page
function renderActivities() {
  const activitiesGrid = document.querySelector('.activities-grid');
  if (!activitiesGrid) return;

  const dynamicActivities = activitiesGrid.querySelectorAll('.activity-card-dynamic');
  dynamicActivities.forEach(activity => activity.remove());

  const activities = loadActivities();
  
  activities.forEach(activity => {
    const activityCard = document.createElement('div');
    activityCard.className = 'activity-card activity-card-dynamic';
    activityCard.dataset.activityId = activity.id;

    const activityImage = activity.image || 'images/senelec-predict.jpg';
    
    let imagesHTML = '';
    if (activity.additionalImages && activity.additionalImages.length > 0) {
      const allImages = [activityImage, ...activity.additionalImages].slice(0, 3);
      imagesHTML = allImages.map(img => `
        <div class="activity-image-item">
          <img src="${img}" alt="${activity.title}">
        </div>
      `).join('');
    } else {
      imagesHTML = `
        <div class="activity-image-item">
          <img src="${activityImage}" alt="${activity.title}">
        </div>
      `;
    }
    
    activityCard.innerHTML = `
      <div class="activity-images-container">
        ${imagesHTML}
      </div>
      ${isAdmin() ? `<button class="delete-activity-btn" onclick="deleteActivity(${activity.id})" title="Supprimer">
        <i class="fas fa-times"></i>
      </button>` : ''}
      <div class="activity-content">
        <h3 class="activity-title">${activity.title}</h3>
        <p class="activity-description">${activity.description}</p>
        <div class="activity-date">
          <i class="fas fa-calendar-alt"></i>
          <span>${activity.date}</span>
        </div>
      </div>
    `;

    const placeholder = activitiesGrid.querySelector('.activity-placeholder');
    if (placeholder) {
      activitiesGrid.insertBefore(activityCard, placeholder);
    } else {
      activitiesGrid.appendChild(activityCard);
    }
  });

  const placeholder = activitiesGrid.querySelector('.activity-placeholder');
  if (placeholder) {
    if (isAdmin()) {
      placeholder.style.display = 'block';
      placeholder.style.cursor = 'pointer';
      placeholder.onclick = () => showAddActivityModal();
    } else {
      placeholder.style.display = 'none';
    }
  }

  // Initialiser les sliders d'images pour les activités
  initImageSliders('.activities-grid .activity-images-container', 1000);
}

// ============================================
// MENU ADMIN CENTRALISÉ
// ============================================

// Créer le menu admin
function createAdminMenu() {
  const menu = document.createElement('div');
  menu.id = 'adminMenu';
  menu.className = 'admin-menu';
  menu.innerHTML = `
    <div class="admin-menu-header">
      <h3><i class="fas fa-cog"></i> Panneau d'administration</h3>
      <button class="admin-menu-close" onclick="closeAdminMenu()">&times;</button>
    </div>
    <div class="admin-menu-content">
      <div class="admin-menu-section" style="background: #f0f0f0; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <button class="admin-menu-item" onclick="handleLogout()" style="background: #ff4444; color: white; justify-content: center;">
          <i class="fas fa-sign-out-alt"></i> Se déconnecter
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-user"></i> Profil</h4>
        <button class="admin-menu-item" onclick="showChangeProfileModal()">
          <i class="fas fa-camera"></i> Changer la photo de profil
        </button>
        <button class="admin-menu-item" onclick="showEditHeroModal()">
          <i class="fas fa-edit"></i> Modifier la description
        </button>
        <button class="admin-menu-item" onclick="showCVModal()">
          <i class="fas fa-file-pdf"></i> Gérer le CV
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-info-circle"></i> À propos</h4>
        <button class="admin-menu-item" onclick="showEditAboutModal()">
          <i class="fas fa-edit"></i> Modifier le texte
        </button>
        <button class="admin-menu-item" onclick="showManageStatsModal()">
          <i class="fas fa-chart-bar"></i> Gérer les statistiques
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-code"></i> Compétences</h4>
        <button class="admin-menu-item" onclick="showAddSkillCategoryModal()">
          <i class="fas fa-plus"></i> Ajouter une catégorie
        </button>
        <button class="admin-menu-item" onclick="showManageSkillsModal()">
          <i class="fas fa-cog"></i> Gérer les compétences
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-graduation-cap"></i> Formation</h4>
        <button class="admin-menu-item" onclick="showAddEducationModal()">
          <i class="fas fa-plus"></i> Ajouter une formation
        </button>
        <button class="admin-menu-item" onclick="showManageEducationsModal()">
          <i class="fas fa-list"></i> Gérer les formations
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-project-diagram"></i> Projets</h4>
        <button class="admin-menu-item" onclick="showAddProjectModal()">
          <i class="fas fa-plus"></i> Ajouter un projet
        </button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-calendar"></i> Activités</h4>
        <button class="admin-menu-item" onclick="showAddActivityModal()">
          <i class="fas fa-plus"></i> Ajouter une activité
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(menu);
}

// Afficher/masquer le menu admin
function showAdminMenu() {
  if (!isAdmin()) {
    showLoginModal();
    return;
  }
  document.getElementById('adminMenu').classList.add('active');
}

function closeAdminMenu() {
  document.getElementById('adminMenu').classList.remove('active');
}

// ============================================
// MODALS ET FORMULAIRES
// ============================================

// Créer la modal de connexion
function createLoginModal() {
  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeLoginModal()">&times;</span>
      <h2><i class="fas fa-lock"></i> Connexion Administrateur</h2>
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="admin-form-group">
          <label for="adminPassword">Mot de passe</label>
          <input type="password" id="adminPassword" required autocomplete="off">
        </div>
        <button type="submit" class="btn btn-primary">Se connecter</button>
      </form>
      <p class="admin-error" id="loginError"></p>
    </div>
  `;
  document.body.appendChild(modal);
}

// Gérer la connexion
function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById('adminPassword').value;
  const errorMsg = document.getElementById('loginError');

  if (loginAdmin(password)) {
    closeLoginModal();
    showAdminInterface();
    // Recharger pour appliquer tous les changements
    setTimeout(() => {
      location.reload();
    }, 100);
  } else {
    errorMsg.textContent = 'Mot de passe incorrect';
    errorMsg.style.display = 'block';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 3000);
  }
}

// Gérer la déconnexion
function handleLogout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
    logoutAdmin();
  }
}

// Créer la modal d'ajout de projet
function createAddProjectModal() {
  const modal = document.createElement('div');
  modal.id = 'addProjectModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddProjectModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter un nouveau projet</h2>
      <form id="addProjectForm" onsubmit="handleAddProject(event)">
        <div class="admin-form-group">
          <label for="projectTitle">Titre du projet *</label>
          <input type="text" id="projectTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="projectDescription">Description *</label>
          <textarea id="projectDescription" rows="4" required></textarea>
        </div>
        <div class="admin-form-group">
          <label for="projectImage">Image principale (fichier)</label>
          <input type="file" id="projectImage" accept="image/*" onchange="previewProjectImage(1, this)">
          <div id="projectPreview1" style="margin-top: 10px;"></div>
          <small style="color: #666; font-size: 0.85rem;">Sélectionnez un fichier. Après ajout, assurez-vous que le fichier est présent dans le dossier images/ du site ou utilisez la fonction serveur pour commit.</small>
        </div>
        <div class="admin-form-group">
          <label for="projectImage2">Image supplémentaire 1 (optionnel)</label>
          <input type="file" id="projectImage2" accept="image/*" onchange="previewProjectImage(2, this)">
          <div id="projectPreview2" style="margin-top: 10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="projectImage3">Image supplémentaire 2 (optionnel)</label>
          <input type="file" id="projectImage3" accept="image/*" onchange="previewProjectImage(3, this)">
          <div id="projectPreview3" style="margin-top: 10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="projectTechnologies">Technologies (séparées par des virgules)</label>
          <input type="text" id="projectTechnologies" placeholder="Ex: React, Node.js, MongoDB">
        </div>
        <div class="admin-form-group">
          <label for="projectLink">Lien (URL GitHub ou autre)</label>
          <input type="url" id="projectLink" placeholder="https://github.com/...">
        </div>
        <div class="admin-form-group">
          <label for="projectLinkText">Texte du lien</label>
          <input type="text" id="projectLinkText" value="Voir sur GitHub">
        </div>
        <button type="submit" class="btn btn-primary">Ajouter le projet</button>
      </form>
      <p class="admin-error" id="addProjectError"></p>
    </div>
  `;
  document.body.appendChild(modal);
}

// Prévisualiser les images sélectionnées pour les projets
function previewProjectImage(num, input) {
  const preview = document.getElementById(`projectPreview${num}`);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-top: 5px;">`;
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.innerHTML = '';
  }
}

// Gérer l'ajout de projet
function handleAddProject(event) {
  event.preventDefault();
  if (!isAdmin()) {
    alert('Vous devez être connecté en tant qu\'administrateur.');
    return;
  }

  const technologies = document.getElementById('projectTechnologies').value
    .split(',')
    .map(t => t.trim())
    .filter(t => t);

  // Récupérer les fichiers sélectionnés (si fournis)
  const imageFile1 = document.getElementById('projectImage').files ? document.getElementById('projectImage').files[0] : null;
  const imageFile2 = document.getElementById('projectImage2').files ? document.getElementById('projectImage2').files[0] : null;
  const imageFile3 = document.getElementById('projectImage3').files ? document.getElementById('projectImage3').files[0] : null;

  const additionalImages = [];
  if (imageFile2) additionalImages.push('images/' + imageFile2.name);
  if (imageFile3) additionalImages.push('images/' + imageFile3.name);

  const projectData = {
    title: document.getElementById('projectTitle').value,
    description: document.getElementById('projectDescription').value,
    image: imageFile1 ? ('images/' + imageFile1.name) : (document.getElementById('projectImage').value || 'images/senelec-predict.jpg'),
    additionalImages: additionalImages,
    technologies: technologies,
    link: document.getElementById('projectLink').value || '#',
    linkText: document.getElementById('projectLinkText').value || 'En savoir plus'
  };

  if (addProject(projectData)) {
    // Inform the admin to upload the files to the repo (or use the server-side function)
    const names = [imageFile1, imageFile2, imageFile3].filter(Boolean).map(f => f.name);
    if (names.length > 0) {
      alert('Note: Assurez-vous que les images (' + names.join(', ') + ') sont présentes dans le dossier images/ du site (ou utilisez la fonction server-side pour commit).');
    }
    document.getElementById('addProjectForm').reset();
    document.getElementById('projectPreview1').innerHTML = '';
    document.getElementById('projectPreview2').innerHTML = '';
    document.getElementById('projectPreview3').innerHTML = '';
    closeAddProjectModal();
    alert('Projet ajouté avec succès !');
  }
}

// Créer la modal d'ajout d'activité
function createAddActivityModal() {
  const modal = document.createElement('div');
  modal.id = 'addActivityModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content" style="max-width: 600px;">
      <span class="admin-modal-close" onclick="closeAddActivityModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter une nouvelle activité</h2>
      <form id="addActivityForm" onsubmit="handleAddActivity(event)">
        <div class="admin-form-group">
          <label for="activityTitle">Titre de l'activité *</label>
          <input type="text" id="activityTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="activityDescription">Description *</label>
          <textarea id="activityDescription" rows="4" required></textarea>
        </div>
        <div class="admin-form-group">
          <label for="activityImage1">Image principale *</label>
          <input type="file" id="activityImage1" accept="image/*" onchange="previewActivityImage(1, this)">
          <small style="color: #666; font-size: 0.85rem;">Sélectionnez l'image principale</small>
          <div id="preview1" style="margin-top: 10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityImage2">Image supplémentaire 1 (optionnel)</label>
          <input type="file" id="activityImage2" accept="image/*" onchange="previewActivityImage(2, this)">
          <div id="preview2" style="margin-top: 10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityImage3">Image supplémentaire 2 (optionnel)</label>
          <input type="file" id="activityImage3" accept="image/*" onchange="previewActivityImage(3, this)">
          <div id="preview3" style="margin-top: 10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityDate">Date</label>
          <input type="text" id="activityDate" placeholder="Ex: Janvier 2024" value="${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}">
        </div>
        <button type="submit" class="btn btn-primary">Ajouter l'activité</button>
      </form>
      <p class="admin-error" id="addActivityError"></p>
    </div>
  `;
  document.body.appendChild(modal);
}

// Prévisualiser les images sélectionnées
function previewActivityImage(num, input) {
  const preview = document.getElementById(`preview${num}`);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-top: 5px;">`;
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.innerHTML = '';
  }
}

// Gérer l'ajout d'activité
function handleAddActivity(event) {
  event.preventDefault();
  if (!isAdmin()) {
    alert('Vous devez être connecté en tant qu\'administrateur.');
    return;
  }

  const image1File = document.getElementById('activityImage1').files[0];
  const image2File = document.getElementById('activityImage2').files[0];
  const image3File = document.getElementById('activityImage3').files[0];

  if (!image1File) {
    alert('Veuillez sélectionner au moins une image principale.');
    return;
  }

  const image1Name = image1File.name;
  const additionalImages = [];
  
  if (image2File) additionalImages.push('images/' + image2File.name);
  if (image3File) additionalImages.push('images/' + image3File.name);

  const activityData = {
    title: document.getElementById('activityTitle').value,
    description: document.getElementById('activityDescription').value,
    image: 'images/' + image1Name,
    additionalImages: additionalImages,
    date: document.getElementById('activityDate').value || new Date().toLocaleDateString('fr-FR')
  };

  alert('Note: Assurez-vous que les images sont déjà dans le dossier images/ avec les noms: ' + 
        image1Name + (image2File ? ', ' + image2File.name : '') + (image3File ? ', ' + image3File.name : ''));

  if (addActivity(activityData)) {
    document.getElementById('addActivityForm').reset();
    document.getElementById('preview1').innerHTML = '';
    document.getElementById('preview2').innerHTML = '';
    document.getElementById('preview3').innerHTML = '';
    closeAddActivityModal();
    alert('Activité ajoutée avec succès !');
  }
}

// Créer la modal de changement de photo de profil
function createChangeProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'changeProfileModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeChangeProfileModal()">&times;</span>
      <h2><i class="fas fa-user-circle"></i> Changer la photo de profil</h2>
      <form id="changeProfileForm" onsubmit="handleChangeProfile(event)">
        <div class="admin-form-group">
          <label for="profilePhoto">Nouvelle photo de profil *</label>
          <input type="file" id="profilePhoto" accept="image/*" onchange="previewProfilePhoto(this)" required>
          <small style="color: #666; font-size: 0.85rem;">Sélectionnez une nouvelle image</small>
          <div id="profilePreview" style="margin-top: 10px;"></div>
        </div>
        <button type="submit" class="btn btn-primary">Changer la photo</button>
      </form>
      <p class="admin-error" id="changeProfileError"></p>
    </div>
  `;
  document.body.appendChild(modal);
}

// Prévisualiser la photo de profil
function previewProfilePhoto(input) {
  const preview = document.getElementById('profilePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 300px; max-height: 400px; border-radius: 15px; margin-top: 10px; border: 3px solid var(--primary-color);">`;
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.innerHTML = '';
  }
}

// Gérer le changement de photo de profil
async function handleChangeProfile(event) {
  event.preventDefault();
  if (!isAdmin()) {
    alert('Vous devez être connecté en tant qu\'administrateur.');
    return;
  }

  const photoFile = document.getElementById('profilePhoto').files[0];
  if (!photoFile) {
    alert('Veuillez sélectionner une image.');
    return;
  }

  const photoName = photoFile.name;
  const profilePhoto = document.querySelector('.profile-photo');
  if (profilePhoto) {
    // Option: proposer de committer directement l'image dans le repo GitHub
    const commitNow = confirm('Voulez-vous committer cette image directement dans le dépôt GitHub pour que le changement soit global ? (Nécessite un Personal Access Token)');

    if (commitNow) {
      // Envoi à la Netlify Function server-side. Le token GitHub doit être configuré
      // comme variable d'environnement `GITHUB_TOKEN` dans les settings Netlify.
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
        const base64Content = dataUrl.split(',')[1];

        const resp = await fetch('/.netlify/functions/uploadProfile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: photoName, content: base64Content })
        });

        const json = await resp.json().catch(() => ({}));
        if (resp.ok) {
          const newPath = 'images/' + photoName + '?v=' + Date.now();
          localStorage.setItem('profilePhotoPath', newPath);
          profilePhoto.src = newPath;
          alert('Image commitée sur GitHub via la fonction server-side. Netlify déclenchera un deploy pour rendre la modification publique.');
        } else {
          console.error('Server error', json);
          alert('Erreur serveur lors de l\'upload : ' + (json.error || resp.status));
        }
      } catch (e) {
        console.error(e);
        alert('Erreur lors de l\'appel de la fonction server-side. Voir console pour détails.');
      }
    }

    // Toujours mettre à jour localement avec cache-buster pour affichage immédiat
    const newPathLocal = 'images/' + photoName + '?v=' + Date.now();
    localStorage.setItem('profilePhotoPath', newPathLocal);
    profilePhoto.src = newPathLocal;
    alert('Photo de profil changée localement !');
  }

  document.getElementById('changeProfileForm').reset();
  document.getElementById('profilePreview').innerHTML = '';
  closeChangeProfileModal();
}

// Créer les modals pour les formations
function createEducationModals() {
  // Modal d'ajout
  const addModal = document.createElement('div');
  addModal.id = 'addEducationModal';
  addModal.className = 'admin-modal';
  addModal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddEducationModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter une formation</h2>
      <form id="addEducationForm" onsubmit="handleAddEducation(event)">
        <div class="admin-form-group">
          <label for="educationYear">Année *</label>
          <input type="text" id="educationYear" placeholder="Ex: 2024-2025" required>
        </div>
        <div class="admin-form-group">
          <label for="educationTitle">Titre *</label>
          <input type="text" id="educationTitle" placeholder="Ex: Master 1..." required>
        </div>
        <div class="admin-form-group">
          <label for="educationLocation">Lieu *</label>
          <input type="text" id="educationLocation" placeholder="Ex: Université..." required>
        </div>
        <button type="submit" class="btn btn-primary">Ajouter</button>
      </form>
    </div>
  `;
  document.body.appendChild(addModal);

  // Modal d'édition
  const editModal = document.createElement('div');
  editModal.id = 'editEducationModal';
  editModal.className = 'admin-modal';
  editModal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeEditEducationModal()">&times;</span>
      <h2><i class="fas fa-edit"></i> Modifier la formation</h2>
      <form id="editEducationForm" onsubmit="handleEditEducation(event)">
        <input type="hidden" id="editEducationId">
        <div class="admin-form-group">
          <label for="editEducationYear">Année *</label>
          <input type="text" id="editEducationYear" required>
        </div>
        <div class="admin-form-group">
          <label for="editEducationTitle">Titre *</label>
          <input type="text" id="editEducationTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="editEducationLocation">Lieu *</label>
          <input type="text" id="editEducationLocation" required>
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  `;
  document.body.appendChild(editModal);
}

// Gérer l'ajout de formation
function handleAddEducation(event) {
  event.preventDefault();
  const educationData = {
    year: document.getElementById('educationYear').value,
    title: document.getElementById('educationTitle').value,
    location: document.getElementById('educationLocation').value
  };
  if (addEducation(educationData)) {
    document.getElementById('addEducationForm').reset();
    closeAddEducationModal();
    alert('Formation ajoutée avec succès !');
  }
}

// Gérer l'édition de formation
function handleEditEducation(event) {
  event.preventDefault();
  const educationId = parseInt(document.getElementById('editEducationId').value);
  const educations = loadEducations();
  const index = educations.findIndex(e => e.id === educationId);
  
  if (index !== -1) {
    educations[index].year = document.getElementById('editEducationYear').value;
    educations[index].title = document.getElementById('editEducationTitle').value;
    educations[index].location = document.getElementById('editEducationLocation').value;
    saveEducations(educations);
    renderEducations();
    closeEditEducationModal();
    alert('Formation modifiée avec succès !');
  }
}

// Afficher la modal d'édition de formation
function showEditEducationModal(education) {
  document.getElementById('editEducationId').value = education.id;
  document.getElementById('editEducationYear').value = education.year;
  document.getElementById('editEducationTitle').value = education.title;
  document.getElementById('editEducationLocation').value = education.location;
  document.getElementById('editEducationModal').style.display = 'flex';
}

// Créer les modals pour les compétences
function createSkillModals() {
  const addModal = document.createElement('div');
  addModal.id = 'addSkillCategoryModal';
  addModal.className = 'admin-modal';
  addModal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddSkillCategoryModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter une catégorie de compétences</h2>
      <form id="addSkillCategoryForm" onsubmit="handleAddSkillCategory(event)">
        <div class="admin-form-group">
          <label for="skillCategoryIcon">Icône FontAwesome (ex: fa-code)</label>
          <input type="text" id="skillCategoryIcon" placeholder="fa-code" value="fa-code">
        </div>
        <div class="admin-form-group">
          <label for="skillCategoryTitle">Titre *</label>
          <input type="text" id="skillCategoryTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="skillCategorySkills">Compétences (séparées par des virgules) *</label>
          <textarea id="skillCategorySkills" rows="4" placeholder="Ex: React, Node.js, MongoDB" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Ajouter</button>
      </form>
    </div>
  `;
  document.body.appendChild(addModal);

  const editModal = document.createElement('div');
  editModal.id = 'editSkillCategoryModal';
  editModal.className = 'admin-modal';
  editModal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeEditSkillCategoryModal()">&times;</span>
      <h2><i class="fas fa-edit"></i> Modifier la catégorie</h2>
      <form id="editSkillCategoryForm" onsubmit="handleEditSkillCategory(event)">
        <input type="hidden" id="editSkillCategoryId">
        <div class="admin-form-group">
          <label for="editSkillCategoryIcon">Icône FontAwesome</label>
          <input type="text" id="editSkillCategoryIcon">
        </div>
        <div class="admin-form-group">
          <label for="editSkillCategoryTitle">Titre *</label>
          <input type="text" id="editSkillCategoryTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="editSkillCategorySkills">Compétences (séparées par des virgules) *</label>
          <textarea id="editSkillCategorySkills" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  `;
  document.body.appendChild(editModal);
}

// Gérer l'ajout de catégorie de compétences
function handleAddSkillCategory(event) {
  event.preventDefault();
  const skills = document.getElementById('skillCategorySkills').value
    .split(',')
    .map(s => s.trim())
    .filter(s => s);
  
  const categoryData = {
    icon: document.getElementById('skillCategoryIcon').value || 'fa-code',
    title: document.getElementById('skillCategoryTitle').value,
    skills: skills
  };
  
  if (addSkillCategory(categoryData)) {
    document.getElementById('addSkillCategoryForm').reset();
    closeAddSkillCategoryModal();
    alert('Catégorie ajoutée avec succès !');
  }
}

// Gérer l'édition de catégorie de compétences
function handleEditSkillCategory(event) {
  event.preventDefault();
  const categoryId = parseInt(document.getElementById('editSkillCategoryId').value);
  const skills = loadSkills();
  const index = skills.findIndex(c => c.id === categoryId);
  
  if (index !== -1) {
    const skillList = document.getElementById('editSkillCategorySkills').value
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    
    skills[index].icon = document.getElementById('editSkillCategoryIcon').value;
    skills[index].title = document.getElementById('editSkillCategoryTitle').value;
    skills[index].skills = skillList;
    saveSkills(skills);
    renderSkills();
    closeEditSkillCategoryModal();
    alert('Catégorie modifiée avec succès !');
  }
}

// Afficher la modal d'édition de catégorie
function showEditSkillCategoryModal(category) {
  document.getElementById('editSkillCategoryId').value = category.id;
  document.getElementById('editSkillCategoryIcon').value = category.icon;
  document.getElementById('editSkillCategoryTitle').value = category.title;
  document.getElementById('editSkillCategorySkills').value = category.skills.join(', ');
  document.getElementById('editSkillCategoryModal').style.display = 'flex';
}

// Créer les modals pour "À propos"
function createAboutModals() {
  const editModal = document.createElement('div');
  editModal.id = 'editAboutModal';
  editModal.className = 'admin-modal';
  editModal.innerHTML = `
    <div class="admin-modal-content" style="max-width: 700px;">
      <span class="admin-modal-close" onclick="closeEditAboutModal()">&times;</span>
      <h2><i class="fas fa-edit"></i> Modifier "À propos"</h2>
      <form id="editAboutForm" onsubmit="handleEditAbout(event)">
        <div class="admin-form-group">
          <label>Paragraphes (un par ligne)</label>
          <textarea id="editAboutParagraphs" rows="6" placeholder="Paragraphe 1&#10;Paragraphe 2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  `;
  document.body.appendChild(editModal);
}

// Gérer l'édition de "À propos"
function handleEditAbout(event) {
  event.preventDefault();
  const paragraphs = document.getElementById('editAboutParagraphs').value
    .split('\n')
    .map(p => p.trim())
    .filter(p => p);
  
  const about = loadAbout();
  about.paragraphs = paragraphs;
  saveAbout(about);
  renderAbout();
  closeEditAboutModal();
  alert('Section "À propos" modifiée avec succès !');
}

// Créer la modal pour le CV
function createCVModal() {
  const modal = document.createElement('div');
  modal.id = 'cvModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeCVModal()">&times;</span>
      <h2><i class="fas fa-file-pdf"></i> Gérer le CV</h2>
      <form id="cvForm" onsubmit="handleCVChange(event)">
        <div class="admin-form-group">
          <label for="cvFile">Nouveau fichier CV (PDF)</label>
          <input type="file" id="cvFile" accept=".pdf">
          <small style="color: #666; font-size: 0.85rem;">Sélectionnez un nouveau fichier PDF</small>
        </div>
        <div class="admin-form-group">
          <label for="cvPath">Ou chemin relatif vers le CV</label>
          <input type="text" id="cvPath" placeholder="cv.pdf" value="${loadCV()}">
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

// Gérer le changement de CV
function handleCVChange(event) {
  event.preventDefault();
  const cvFile = document.getElementById('cvFile').files[0];
  const cvPath = document.getElementById('cvPath').value;
  
  if (cvFile) {
    const cvName = cvFile.name;
    saveCV('images/' + cvName);
    alert('CV changé ! Assurez-vous que le fichier "' + cvName + '" est dans le dossier images/.');
  } else if (cvPath) {
    saveCV(cvPath);
    alert('Chemin du CV mis à jour !');
  }
  
  closeCVModal();
}

// Créer la modal pour le hero
function createHeroModal() {
  const modal = document.createElement('div');
  modal.id = 'heroModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeHeroModal()">&times;</span>
      <h2><i class="fas fa-edit"></i> Modifier la description</h2>
      <form id="heroForm" onsubmit="handleHeroChange(event)">
        <div class="admin-form-group">
          <label for="heroDescription">Description *</label>
          <textarea id="heroDescription" rows="3" required></textarea>
        </div>
        <div class="admin-form-group">
          <label for="heroSubtitle">Sous-titre (texte déroulant) *</label>
          <input type="text" id="heroSubtitle" required>
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

// Gérer le changement du hero
function handleHeroChange(event) {
  event.preventDefault();
  const hero = {
    description: document.getElementById('heroDescription').value,
    subtitle: document.getElementById('heroSubtitle').value
  };
  saveHero(hero);
  closeHeroModal();
  alert('Description mise à jour !');
}

// Fonctions d'affichage/masquage des modals
function showAddEducationModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('addEducationModal').style.display = 'flex';
}

function closeAddEducationModal() {
  document.getElementById('addEducationModal').style.display = 'none';
}

function showEditEducationModal(education) {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('editEducationId').value = education.id;
  document.getElementById('editEducationYear').value = education.year;
  document.getElementById('editEducationTitle').value = education.title;
  document.getElementById('editEducationLocation').value = education.location;
  document.getElementById('editEducationModal').style.display = 'flex';
}

function closeEditEducationModal() {
  document.getElementById('editEducationModal').style.display = 'none';
}

function showAddSkillCategoryModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('addSkillCategoryModal').style.display = 'flex';
}

function closeAddSkillCategoryModal() {
  document.getElementById('addSkillCategoryModal').style.display = 'none';
}

function showEditSkillCategoryModal(category) {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('editSkillCategoryId').value = category.id;
  document.getElementById('editSkillCategoryIcon').value = category.icon;
  document.getElementById('editSkillCategoryTitle').value = category.title;
  document.getElementById('editSkillCategorySkills').value = category.skills.join(', ');
  document.getElementById('editSkillCategoryModal').style.display = 'flex';
}

function closeEditSkillCategoryModal() {
  document.getElementById('editSkillCategoryModal').style.display = 'none';
}

function showEditAboutModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  const about = loadAbout();
  document.getElementById('editAboutParagraphs').value = about.paragraphs.join('\n');
  document.getElementById('editAboutModal').style.display = 'flex';
}

function closeEditAboutModal() {
  document.getElementById('editAboutModal').style.display = 'none';
}

function showCVModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('cvPath').value = loadCV();
  document.getElementById('cvModal').style.display = 'flex';
}

function closeCVModal() {
  document.getElementById('cvModal').style.display = 'none';
}

function showEditHeroModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  const hero = loadHero();
  document.getElementById('heroDescription').value = hero.description;
  document.getElementById('heroSubtitle').value = hero.subtitle;
  document.getElementById('heroModal').style.display = 'flex';
}

function closeHeroModal() {
  document.getElementById('heroModal').style.display = 'none';
}

function showAddProjectModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('addProjectModal').style.display = 'flex';
}

function closeAddProjectModal() {
  document.getElementById('addProjectModal').style.display = 'none';
  document.getElementById('addProjectError').style.display = 'none';
}

function showAddActivityModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('addActivityModal').style.display = 'flex';
}

function closeAddActivityModal() {
  document.getElementById('addActivityModal').style.display = 'none';
  document.getElementById('addActivityError').style.display = 'none';
  const previews = ['preview1', 'preview2', 'preview3'];
  previews.forEach(id => {
    const preview = document.getElementById(id);
    if (preview) preview.innerHTML = '';
  });
}

function showChangeProfileModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  document.getElementById('changeProfileModal').style.display = 'flex';
}

function closeChangeProfileModal() {
  document.getElementById('changeProfileModal').style.display = 'none';
  document.getElementById('changeProfileError').style.display = 'none';
}

function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('adminPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

// Fonctions supplémentaires pour la gestion
function showManageEducationsModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  alert('Utilisez les boutons d\'édition sur chaque formation pour les modifier.');
}

function showManageSkillsModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  alert('Utilisez les boutons d\'édition sur chaque catégorie pour les modifier.');
}

function showManageStatsModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  alert('Utilisez les boutons d\'édition sur chaque statistique pour les modifier.');
}

function editAboutParagraph(index) {
  if (!isAdmin()) { alert('Accès refusé.'); return; }
  const about = loadAbout();
  const newText = prompt('Modifier le paragraphe:', about.paragraphs[index]);
  if (newText !== null) {
    about.paragraphs[index] = newText;
    saveAbout(about);
    renderAbout();
  }
}

function showAddParagraphModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  const newText = prompt('Nouveau paragraphe:');
  if (newText) {
    const about = loadAbout();
    about.paragraphs.push(newText);
    saveAbout(about);
    renderAbout();
  }
}

function editStat(index) {
  if (!isAdmin()) { alert('Accès refusé.'); return; }
  const about = loadAbout();
  const stat = about.stats[index];
  const newIcon = prompt('Icône FontAwesome (ex: fa-code):', stat.icon);
  const newNumber = prompt('Nombre:', stat.number);
  const newLabel = prompt('Label:', stat.label);
  
  if (newIcon && newNumber && newLabel) {
    about.stats[index] = { icon: newIcon, number: newNumber, label: newLabel };
    saveAbout(about);
    renderAbout();
  }
}

function showAddStatModal() {
  if (!isAdmin()) { showLoginModal(); return; }
  const newIcon = prompt('Icône FontAwesome (ex: fa-code):', 'fa-code');
  const newNumber = prompt('Nombre:', '0+');
  const newLabel = prompt('Label:', 'Nouvelle statistique');
  
  if (newIcon && newNumber && newLabel) {
    const about = loadAbout();
    about.stats.push({ icon: newIcon, number: newNumber, label: newLabel });
    saveAbout(about);
    renderAbout();
  }
}

// Ajouter le bouton de changement de photo en mode admin
function addProfilePhotoButton() {
  if (!isAdmin()) return;
  
  const profileCard = document.querySelector('.profile-card');
  if (!profileCard) return;
  
  if (profileCard.querySelector('.change-profile-btn')) return;
  
  const changeBtn = document.createElement('button');
  changeBtn.className = 'change-profile-btn';
  changeBtn.innerHTML = '<i class="fas fa-camera"></i>';
  changeBtn.title = 'Changer la photo de profil';
  changeBtn.onclick = () => changeProfilePhoto();
  profileCard.appendChild(changeBtn);
}

// Charger la photo de profil sauvegardée
function loadProfilePhoto() {
  const savedPath = localStorage.getItem('profilePhotoPath');
  if (savedPath) {
    const profilePhoto = document.querySelector('.profile-photo');
    if (profilePhoto) {
      // Si le chemin sauvegardé n'a pas de cache-buster, en ajouter un pour forcer le reload
      let src = savedPath;
      if (!src.includes('?v=')) {
        src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
      }
      profilePhoto.src = src;
    }
  }
}

// Mettre à jour l'interface admin
function showAdminInterface() {
  // Vérifier à nouveau qu'on est bien admin
  if (!isAdmin()) {
    hideAdminInterface();
    return;
  }

  const adminBtn = document.getElementById('adminAccessBtn');
  if (adminBtn) {
    adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
    adminBtn.title = 'Panneau d\'administration (cliquez pour ouvrir)';
    adminBtn.onclick = () => showAdminMenu();
  }

  addProfilePhotoButton();
  
  const placeholder = document.querySelector('.project-placeholder');
  if (placeholder) {
    placeholder.innerHTML = `
      <div class="project-icon">
        <i class="fas fa-plus"></i>
      </div>
      <h3 class="project-title">Ajouter un projet</h3>
      <p class="project-description">Cliquez pour ajouter un nouveau projet</p>
      <button class="btn btn-primary" onclick="showAddProjectModal()" style="margin-top: 1rem;">
        <i class="fas fa-plus"></i> Ajouter un projet
      </button>
    `;
    placeholder.style.cursor = 'pointer';
    placeholder.style.display = 'block';
  }

  const activityPlaceholder = document.querySelector('.activity-placeholder');
  if (activityPlaceholder) {
    activityPlaceholder.innerHTML = `
      <div class="activity-content">
        <div class="activity-icon">
          <i class="fas fa-plus"></i>
        </div>
        <h3 class="activity-title">Ajouter une activité</h3>
        <p class="activity-description">Cliquez pour ajouter une nouvelle activité</p>
        <button class="btn btn-primary" onclick="showAddActivityModal()" style="margin-top: 1rem;">
          <i class="fas fa-plus"></i> Ajouter une activité
        </button>
      </div>
    `;
    activityPlaceholder.style.cursor = 'pointer';
    activityPlaceholder.style.display = 'block';
  }
  
  renderProjects();
  renderActivities();
  renderEducations();
  renderSkills();
  renderAbout();
  renderHero();
}

// Masquer l'interface admin
function hideAdminInterface() {
  const adminBtn = document.getElementById('adminAccessBtn');
  if (adminBtn) {
    adminBtn.innerHTML = '<i class="fas fa-lock"></i> Admin';
    adminBtn.title = 'Accès administrateur';
    adminBtn.onclick = () => showLoginModal();
  }

  // Retirer le bouton de photo de profil
  const changeProfileBtn = document.querySelector('.change-profile-btn');
  if (changeProfileBtn) {
    changeProfileBtn.remove();
  }

  // Masquer les placeholders
  const placeholder = document.querySelector('.project-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }

  const activityPlaceholder = document.querySelector('.activity-placeholder');
  if (activityPlaceholder) {
    activityPlaceholder.style.display = 'none';
  }

  // Retirer les boutons d'édition
  document.querySelectorAll('.edit-education-btn, .delete-education-btn, .edit-skill-category-btn, .delete-skill-category-btn, .edit-para-btn, .edit-stat-btn, .add-para-btn, .add-stat-btn').forEach(btn => {
    btn.remove();
  });

  // Re-render sans les boutons admin
  renderProjects();
  renderActivities();
  renderEducations();
  renderSkills();
  renderAbout();
  renderHero();
}

// Initialiser l'interface admin
function initAdminInterface() {
  // Créer le bouton admin
  const adminBtn = document.createElement('button');
  adminBtn.id = 'adminAccessBtn';
  adminBtn.className = 'admin-access-btn';
  
  // Vérifier l'état de connexion
  if (isAdmin()) {
    adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
    adminBtn.title = 'Panneau d\'administration (cliquez pour ouvrir)';
    adminBtn.onclick = () => showAdminMenu();
  } else {
    adminBtn.innerHTML = '<i class="fas fa-lock"></i> Admin';
    adminBtn.title = 'Accès administrateur';
    adminBtn.onclick = () => showLoginModal();
  }
  
  document.body.appendChild(adminBtn);

  // Créer tous les modals
  createLoginModal();
  createAddProjectModal();
  createAddActivityModal();
  createChangeProfileModal();
  createEducationModals();
  createSkillModals();
  createAboutModals();
  createCVModal();
  createHeroModal();
  createAdminMenu();

  loadProfilePhoto();
  updateCVLink();

  // Initialiser les activités par défaut
  initDefaultActivities();
  
  // Rendre toutes les sections
  renderProjects();
  renderActivities();
  renderEducations();
  renderSkills();
  renderAbout();
  renderHero();

  // Si on est admin, activer l'interface admin
  if (isAdmin()) {
    showAdminInterface();
  } else {
    hideAdminInterface();
  }
}

// Fermer les modals en cliquant à l'extérieur
window.onclick = function(event) {
  const modals = ['loginModal', 'addProjectModal', 'addActivityModal', 'changeProfileModal', 
                  'addEducationModal', 'editEducationModal', 'addSkillCategoryModal', 
                  'editSkillCategoryModal', 'editAboutModal', 'cvModal', 'heroModal'];
  
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
      const closeFunc = modalId.replace('Modal', '');
      if (typeof window['close' + closeFunc.charAt(0).toUpperCase() + closeFunc.slice(1)] === 'function') {
        window['close' + closeFunc.charAt(0).toUpperCase() + closeFunc.slice(1)]();
      }
    }
  });
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  initAdminInterface();
});

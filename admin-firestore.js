// admin-firestore.js - Complete Admin Module with Firestore
// Manages: Profile, About, Skills, Education, Projects, Activities
// All data persists in Firestore and syncs in realtime

import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, orderBy } from './firebase-client.js';

const ADMIN_PASSWORD = 'mamekhady1';

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function isAdmin() {
  const storedHash = localStorage.getItem('adminHash');
  const correctHash = hashPassword(ADMIN_PASSWORD);
  return storedHash === correctHash;
}

function loginAdmin(password) {
  const inputHash = hashPassword(password);
  const correctHash = hashPassword(ADMIN_PASSWORD);
  if (inputHash === correctHash) {
    localStorage.setItem('adminHash', inputHash);
    return true;
  }
  return false;
}

function logoutAdmin() {
  localStorage.removeItem('adminHash');
  location.reload();
}

// -----------------------
// Helpers
async function uploadFileToServer(file) {
  if (!file) return null;
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const base64Content = dataUrl.split(',')[1];
    const resp = await fetch('/.netlify/functions/uploadProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content: base64Content })
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      console.error('Upload error', j);
      return null;
    }
    const json = await resp.json();
    // Netlify function returns cloud.upload_result or secure_url depending on implementation
    // try common fields
    const secureUrl = json.secure_url || (json.upload && json.upload.secure_url) || (json.cloud && json.cloud.secure_url) || json.profileResult?.content?.secure_url;
    return secureUrl || json.result?.secure_url || null;
  } catch (e) {
    console.error('uploadFileToServer failed', e);
    return null;
  }
}

function initImageSliders(selector, intervalMs = 2500) {
  const containers = document.querySelectorAll(selector);
  containers.forEach(container => {
    if (container._sliderInterval) {
      clearInterval(container._sliderInterval);
      container._sliderInterval = null;
    }
    const items = Array.from(container.querySelectorAll('.project-image-item, .activity-image-item'));
    if (items.length <= 1) return;
    container.classList.add('slider');
    items.forEach((it, idx) => {
      it.style.display = idx === 0 ? 'block' : 'none';
      it.style.position = idx === 0 ? '' : 'absolute';
    });
    let current = 0;
    container._sliderInterval = setInterval(() => {
      items[current].style.display = 'none';
      current = (current + 1) % items.length;
      items[current].style.display = 'block';
    }, intervalMs);
  });
}

// -----------------------
// Profile (realtime)
function subscribeProfilePhoto() {
  try {
    const profileDoc = doc(db, 'profile', 'main');
    onSnapshot(profileDoc, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const profilePhoto = document.querySelector('.profile-photo');
      if (profilePhoto && data.photo) {
        const src = data.photo + (data.photo.includes('?') ? '&' : '?') + 'v=' + Date.now();
        profilePhoto.src = src;
      }
    }, err => console.error('profile onSnapshot error', err));
  } catch (e) {
    console.error('subscribeProfilePhoto failed', e);
  }
}

async function changeProfilePhotoHandler(file) {
  if (!isAdmin()) { alert('Accès refusé'); return false; }
  if (!file) { alert('Aucun fichier sélectionné'); return false; }
  const url = await uploadFileToServer(file);
  if (!url) { alert('Échec de l\'upload'); return false; }
  try {
    await setDoc(doc(db, 'profile', 'main'), { photo: url, updatedAt: new Date().toISOString() });
    alert('Photo de profil mise à jour. Les visiteurs verront la modification immédiatement.');
    return true;
  } catch (e) {
    console.error('save profile error', e);
    alert('Erreur lors de la sauvegarde du profil');
    return false;
  }
}

// -----------------------
// ABOUT TEXT
function subscribeAboutText() {
  try {
    const aboutDoc = doc(db, 'content', 'about');
    onSnapshot(aboutDoc, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const aboutText = document.querySelector('.about-text p');
      if (aboutText && data.text) {
        aboutText.textContent = data.text;
      }
    }, err => console.error('about onSnapshot error', err));
  } catch (e) {
    console.error('subscribeAboutText failed', e);
  }
}

async function saveAboutText(text) {
  if (!isAdmin()) { alert('Accès refusé'); return false; }
  try {
    await setDoc(doc(db, 'content', 'about'), { text, updatedAt: new Date().toISOString() });
    alert('Texte "À propos" mis à jour.');
    return true;
  } catch (e) {
    console.error('save about error', e);
    alert('Erreur lors de la sauvegarde');
    return false;
  }
}

// -----------------------
// SKILLS
function subscribeSkills() {
  try {
    const q = query(collection(db, 'skills'), orderBy('order', 'asc'));
    onSnapshot(q, snap => {
      const skills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSkills(skills);
    }, err => console.error('skills onSnapshot error', err));
  } catch (e) {
    console.error('subscribeSkills failed', e);
  }
}

function renderSkills(skills) {
  const skillsGrid = document.querySelector('.skills-grid');
  if (!skillsGrid) return;
  skillsGrid.innerHTML = '';
  skills.forEach(skill => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <h3 class="skill-category-title">${skill.category}</h3>
      <div class="skill-category-items">
        ${(skill.items || []).map(item => `<span class="skill-item">${item}</span>`).join('')}
      </div>
      ${isAdmin() ? `<button class="delete-skill-btn" data-id="${skill.id}" style="margin-top:10px;width:100%;"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
    `;
    skillsGrid.appendChild(card);
    if (isAdmin()) {
      card.querySelector('.delete-skill-btn').onclick = () => deleteSkill(skill.id);
    }
  });
}

async function addSkillHandler(category, items) {
  if (!isAdmin()) { alert('Accès refusé'); return false; }
  const id = Date.now().toString();
  const maxOrder = (await getDocs(collection(db, 'skills'))).size;
  try {
    await setDoc(doc(db, 'skills', id), {
      category,
      items: items.split(',').map(s => s.trim()).filter(Boolean),
      order: maxOrder,
      createdAt: new Date().toISOString()
    });
    alert('Compétence ajoutée.');
    return true;
  } catch (e) {
    console.error('save skill error', e);
    alert('Erreur lors de la sauvegarde');
    return false;
  }
}

async function deleteSkill(skillId) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  if (!confirm('Supprimer cette compétence ?')) return;
  try {
    await deleteDoc(doc(db, 'skills', skillId));
    alert('Compétence supprimée.');
  } catch (e) {
    console.error('delete skill error', e);
    alert('Erreur lors de la suppression');
  }
}

// -----------------------
// EDUCATION
function subscribeEducation() {
  try {
    const q = query(collection(db, 'education'), orderBy('startDate', 'desc'));
    onSnapshot(q, snap => {
      const educations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderEducation(educations);
    }, err => console.error('education onSnapshot error', err));
  } catch (e) {
    console.error('subscribeEducation failed', e);
  }
}

function renderEducation(educations) {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;
  const dynamic = timeline.querySelectorAll('.timeline-item-dynamic');
  dynamic.forEach(d => d.remove());
  educations.forEach(edu => {
    const item = document.createElement('div');
    item.className = 'timeline-item timeline-item-dynamic';
    item.dataset.eduId = edu.id;
    item.innerHTML = `
      <div class="timeline-marker"></div>
      <div class="timeline-content">
        <h3>${edu.title}</h3>
        <p class="timeline-period">${edu.school} • ${edu.period}</p>
        <p>${edu.description || ''}</p>
        ${isAdmin() ? `<button class="delete-edu-btn" data-id="${edu.id}" style="width:100%;margin-top:10px;"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
      </div>
    `;
    timeline.appendChild(item);
    if (isAdmin()) {
      item.querySelector('.delete-edu-btn').onclick = () => deleteEducation(edu.id);
    }
  });
}

async function addEducationHandler(title, school, period, description) {
  if (!isAdmin()) { alert('Accès refusé'); return false; }
  const id = Date.now().toString();
  try {
    await setDoc(doc(db, 'education', id), {
      title,
      school,
      period,
      description,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    alert('Formation ajoutée.');
    return true;
  } catch (e) {
    console.error('save education error', e);
    alert('Erreur lors de la sauvegarde');
    return false;
  }
}

async function deleteEducation(eduId) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  if (!confirm('Supprimer cette formation ?')) return;
  try {
    await deleteDoc(doc(db, 'education', eduId));
    alert('Formation supprimée.');
  } catch (e) {
    console.error('delete education error', e);
    alert('Erreur lors de la suppression');
  }
}

// -----------------------
// Projects
function subscribeProjects() {
  try {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    onSnapshot(q, snap => {
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProjectsFromData(projects);
    }, err => console.error('projects onSnapshot error', err));
  } catch (e) {
    console.error('subscribeProjects failed', e);
  }
}

function renderProjectsFromData(projects) {
  const projectsGrid = document.querySelector('.projects-grid');
  if (!projectsGrid) return;
  const dynamicProjects = projectsGrid.querySelectorAll('.project-card-dynamic');
  dynamicProjects.forEach(p => p.remove());
  // Keep static cards and placeholder
  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card project-card-dynamic';
    projectCard.dataset.projectId = project.id;

    const techTags = (project.technologies || []).map(tech => `<span class="tech-tag">${tech}</span>`).join('');
    const projectImage = project.image || 'images/senelec-predict.jpg';
    const allProjectImages = [projectImage].concat(project.additionalImages || []).filter(Boolean).slice(0, 10);
    const projectImagesHTML = allProjectImages.map(img => `
      <div class="project-image-item">
        <img src="${img}" alt="${project.title}">
      </div>
    `).join('');

    projectCard.innerHTML = `
      <div class="project-images-container">
        ${projectImagesHTML}
      </div>
      ${isAdmin() ? `<button class="delete-project-btn" data-id="${project.id}" title="Supprimer"><i class="fas fa-times"></i></button>` : ''}
      <h3 class="project-title">${project.title}</h3>
      <p class="project-description">${project.description}</p>
      <div class="project-tech">${techTags}</div>
      <a href="${project.link || '#'}" ${project.link && project.link.startsWith('http') ? 'target="_blank"' : ''} class="project-link">
        <i class="${project.link && project.link.includes('github') ? 'fab fa-github' : 'fas fa-eye'}"></i> ${project.linkText || 'En savoir plus'}
      </a>
    `;

    const placeholder = projectsGrid.querySelector('.project-placeholder');
    if (placeholder) projectsGrid.insertBefore(projectCard, placeholder);
    else projectsGrid.appendChild(projectCard);

    if (isAdmin()) {
      const delBtn = projectCard.querySelector('.delete-project-btn');
      if (delBtn) delBtn.onclick = () => deleteProject(project.id);
    }
  });

  initImageSliders('.projects-grid .project-images-container', 2500);
}

async function handleAddProjectForm(form) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  const title = form.querySelector('#projectTitle').value;
  const description = form.querySelector('#projectDescription').value;
  const technologies = (form.querySelector('#projectTechnologies').value || '').split(',').map(s => s.trim()).filter(Boolean);
  const link = form.querySelector('#projectLink').value || '#';
  const linkText = form.querySelector('#projectLinkText').value || 'Voir sur GitHub';

  const fileMain = form.querySelector('#projectImage').files[0];
  const file2 = form.querySelector('#projectImage2').files[0];
  const file3 = form.querySelector('#projectImage3').files[0];

  let mainUrl = 'images/senelec-predict.jpg';
  if (fileMain) {
    const u = await uploadFileToServer(fileMain);
    if (u) mainUrl = u;
  }
  const additional = [];
  for (const f of [file2, file3]) {
    if (f) {
      const u = await uploadFileToServer(f);
      if (u) additional.push(u);
    }
  }

  const id = Date.now().toString();
  const projectData = {
    id,
    title,
    description,
    image: mainUrl,
    additionalImages: additional,
    technologies,
    link,
    linkText,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'projects', id), projectData);
    alert('Projet ajouté.');
    form.reset();
    closeAddProjectModal();
  } catch (e) {
    console.error('save project error', e);
    alert('Erreur lors de l\'enregistrement du projet');
  }
}

async function deleteProject(projectId) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
  try {
    await deleteDoc(doc(db, 'projects', String(projectId)));
    alert('Projet supprimé.');
  } catch (e) {
    console.error('delete project error', e);
    alert('Erreur lors de la suppression');
  }
}

// -----------------------
// Activities
function subscribeActivities() {
  try {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    onSnapshot(q, snap => {
      const activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderActivitiesFromData(activities);
    }, err => console.error('activities onSnapshot error', err));
  } catch (e) {
    console.error('subscribeActivities failed', e);
  }
}

function renderActivitiesFromData(activities) {
  const activitiesGrid = document.querySelector('.activities-grid');
  if (!activitiesGrid) return;
  const dynamic = activitiesGrid.querySelectorAll('.activity-card-dynamic');
  dynamic.forEach(d => d.remove());
  activities.forEach(activity => {
    const card = document.createElement('div');
    card.className = 'activity-card activity-card-dynamic';
    card.dataset.activityId = activity.id;
    const activityImage = activity.image || 'images/senelec-predict.jpg';
    const allImages = [activityImage].concat(activity.additionalImages || []).filter(Boolean).slice(0,10);
    const imagesHTML = allImages.map(img => `
      <div class="activity-image-item">
        <img src="${img}" alt="${activity.title}">
      </div>
    `).join('');

    card.innerHTML = `
      <div class="activity-images-container">
        ${imagesHTML}
      </div>
      ${isAdmin() ? `<button class="delete-activity-btn" data-id="${activity.id}" title="Supprimer"><i class="fas fa-times"></i></button>` : ''}
      <div class="activity-content">
        <h3 class="activity-title">${activity.title}</h3>
        <p class="activity-description">${activity.description}</p>
        <div class="activity-date"><i class="fas fa-calendar-alt"></i> <span>${activity.date || ''}</span></div>
      </div>
    `;

    const placeholder = activitiesGrid.querySelector('.activity-placeholder');
    if (placeholder) activitiesGrid.insertBefore(card, placeholder);
    else activitiesGrid.appendChild(card);

    if (isAdmin()) {
      const del = card.querySelector('.delete-activity-btn');
      if (del) del.onclick = () => deleteActivity(activity.id);
    }
  });

  initImageSliders('.activities-grid .activity-images-container', 2500);
}

async function handleAddActivityForm(form) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  const title = form.querySelector('#activityTitle').value;
  const description = form.querySelector('#activityDescription').value;
  const date = form.querySelector('#activityDate').value || new Date().toLocaleDateString('fr-FR');

  const file1 = form.querySelector('#activityImage1').files[0];
  const file2 = form.querySelector('#activityImage2').files[0];
  const file3 = form.querySelector('#activityImage3').files[0];

  if (!file1) { alert('Sélectionnez une image principale'); return; }
  const mainUrl = await uploadFileToServer(file1);
  const additional = [];
  for (const f of [file2, file3]) {
    if (f) {
      const u = await uploadFileToServer(f);
      if (u) additional.push(u);
    }
  }

  const id = Date.now().toString();
  const activityData = {
    id,
    title,
    description,
    date,
    image: mainUrl,
    additionalImages: additional,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'activities', id), activityData);
    alert('Activité ajoutée.');
    form.reset();
    closeAddActivityModal();
  } catch (e) {
    console.error('save activity error', e);
    alert('Erreur lors de l\'enregistrement de l\'activité');
  }
}

async function deleteActivity(activityId) {
  if (!isAdmin()) { alert('Accès refusé'); return; }
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) return;
  try {
    await deleteDoc(doc(db, 'activities', String(activityId)));
    alert('Activité supprimée.');
  } catch (e) {
    console.error('delete activity error', e);
    alert('Erreur lors de la suppression');
  }
}

// -----------------------
// UI: build minimal admin modals and menu
function createLoginModal() {
  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeLoginModal()">&times;</span>
      <h2><i class="fas fa-lock"></i> Connexion Administrateur</h2>
      <form id="loginForm">
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
  const form = modal.querySelector('#loginForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('adminPassword').value;
    if (loginAdmin(pw)) {
      closeLoginModal();
      showAdminInterface();
      setTimeout(() => location.reload(), 150);
    } else {
      const err = document.getElementById('loginError');
      err.textContent = 'Mot de passe incorrect'; err.style.display = 'block';
      setTimeout(() => err.style.display = 'none', 4000);
    }
  });
}

function closeLoginModal() { const m = document.getElementById('loginModal'); if (m) m.style.display = 'none'; }

function createChangeProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'changeProfileModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeChangeProfileModal()">&times;</span>
      <h2><i class="fas fa-user-circle"></i> Changer la photo de profil</h2>
      <form id="changeProfileForm">
        <div class="admin-form-group">
          <label for="profilePhoto">Nouvelle photo de profil *</label>
          <input type="file" id="profilePhoto" accept="image/*" required>
          <div id="profilePreview" style="margin-top:10px;"></div>
        </div>
        <button type="submit" class="btn btn-primary">Changer la photo</button>
      </form>
      <p class="admin-error" id="changeProfileError"></p>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#changeProfileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('profilePhoto').files[0];
    await changeProfilePhotoHandler(file);
    form.reset();
    closeChangeProfileModal();
  });
}
function closeChangeProfileModal() { const m = document.getElementById('changeProfileModal'); if (m) m.style.display = 'none'; }

function createChangeAboutModal() {
  const modal = document.createElement('div');
  modal.id = 'changeAboutModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeChangeAboutModal()">&times;</span>
      <h2><i class="fas fa-edit"></i> Modifier "À propos"</h2>
      <form id="changeAboutForm">
        <div class="admin-form-group">
          <label for="aboutText">Texte "À propos" *</label>
          <textarea id="aboutText" rows="6" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Sauvegarder</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#changeAboutForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('aboutText').value;
    await saveAboutText(text);
    closeChangeAboutModal();
  });
}
function closeChangeAboutModal() { const m = document.getElementById('changeAboutModal'); if (m) m.style.display = 'none'; }

function createAddSkillModal() {
  const modal = document.createElement('div');
  modal.id = 'addSkillModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddSkillModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter une compétence</h2>
      <form id="addSkillForm">
        <div class="admin-form-group">
          <label for="skillCategory">Catégorie *</label>
          <input type="text" id="skillCategory" placeholder="ex: Web, Python, etc." required>
        </div>
        <div class="admin-form-group">
          <label for="skillItems">Compétences (séparées par des virgules) *</label>
          <textarea id="skillItems" rows="4" placeholder="ex: HTML, CSS, JavaScript" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Ajouter</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#addSkillForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('skillCategory').value;
    const items = document.getElementById('skillItems').value;
    await addSkillHandler(category, items);
    form.reset();
    closeAddSkillModal();
  });
}
function closeAddSkillModal() { const m = document.getElementById('addSkillModal'); if (m) m.style.display = 'none'; }

function createAddEducationModal() {
  const modal = document.createElement('div');
  modal.id = 'addEducationModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddEducationModal()">&times;</span>
      <h2><i class="fas fa-graduation-cap"></i> Ajouter une formation</h2>
      <form id="addEducationForm">
        <div class="admin-form-group">
          <label for="eduTitle">Titre du diplôme *</label>
          <input type="text" id="eduTitle" required>
        </div>
        <div class="admin-form-group">
          <label for="eduSchool">École/Université *</label>
          <input type="text" id="eduSchool" required>
        </div>
        <div class="admin-form-group">
          <label for="eduPeriod">Période (ex: 2023 - 2025) *</label>
          <input type="text" id="eduPeriod" required>
        </div>
        <div class="admin-form-group">
          <label for="eduDescription">Description</label>
          <textarea id="eduDescription" rows="4"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Ajouter</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#addEducationForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('eduTitle').value;
    const school = document.getElementById('eduSchool').value;
    const period = document.getElementById('eduPeriod').value;
    const description = document.getElementById('eduDescription').value;
    await addEducationHandler(title, school, period, description);
    form.reset();
    closeAddEducationModal();
  });
}
function closeAddEducationModal() { const m = document.getElementById('addEducationModal'); if (m) m.style.display = 'none'; }

function createAddProjectModal() {
  const modal = document.createElement('div');
  modal.id = 'addProjectModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <span class="admin-modal-close" onclick="closeAddProjectModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter un nouveau projet</h2>
      <form id="addProjectForm">
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
          <input type="file" id="projectImage" accept="image/*">
          <div id="projectPreview1" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="projectImage2">Image supplémentaire 1 (optionnel)</label>
          <input type="file" id="projectImage2" accept="image/*">
          <div id="projectPreview2" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="projectImage3">Image supplémentaire 2 (optionnel)</label>
          <input type="file" id="projectImage3" accept="image/*">
          <div id="projectPreview3" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="projectTechnologies">Technologies (séparées par des virgules)</label>
          <input type="text" id="projectTechnologies">
        </div>
        <div class="admin-form-group">
          <label for="projectLink">Lien (URL)</label>
          <input type="url" id="projectLink">
        </div>
        <div class="admin-form-group">
          <label for="projectLinkText">Texte du lien</label>
          <input type="text" id="projectLinkText" value="Voir sur GitHub">
        </div>
        <button type="submit" class="btn btn-primary">Ajouter le projet</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#addProjectForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddProjectForm(form);
  });
}
function closeAddProjectModal() { const m = document.getElementById('addProjectModal'); if (m) m.style.display = 'none'; }

function createAddActivityModal() {
  const modal = document.createElement('div');
  modal.id = 'addActivityModal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content" style="max-width:600px;">
      <span class="admin-modal-close" onclick="closeAddActivityModal()">&times;</span>
      <h2><i class="fas fa-plus-circle"></i> Ajouter une nouvelle activité</h2>
      <form id="addActivityForm">
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
          <input type="file" id="activityImage1" accept="image/*">
          <div id="preview1" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityImage2">Image supplémentaire 1 (optionnel)</label>
          <input type="file" id="activityImage2" accept="image/*">
          <div id="preview2" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityImage3">Image supplémentaire 2 (optionnel)</label>
          <input type="file" id="activityImage3" accept="image/*">
          <div id="preview3" style="margin-top:10px;"></div>
        </div>
        <div class="admin-form-group">
          <label for="activityDate">Date</label>
          <input type="text" id="activityDate" value="${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}">
        </div>
        <button type="submit" class="btn btn-primary">Ajouter l'activité</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const form = modal.querySelector('#addActivityForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddActivityForm(form);
  });
}
function closeAddActivityModal() { const m = document.getElementById('addActivityModal'); if (m) m.style.display = 'none'; }

function createAdminMenu() {
  const menu = document.createElement('div');
  menu.id = 'adminMenu';
  menu.className = 'admin-menu';
  menu.innerHTML = `
    <div class="admin-menu-header">
      <h3><i class="fas fa-cog"></i> Admin</h3>
      <button class="admin-menu-close" onclick="closeAdminMenu()">&times;</button>
    </div>
    <div class="admin-menu-content">
      <div class="admin-menu-section">
        <button class="admin-menu-item" onclick="handleLogout()" style="background:#ff4444;color:white;justify-content:center;"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-user"></i> Profil</h4>
        <button class="admin-menu-item" onclick="showChangeProfileModal()"><i class="fas fa-camera"></i> Photo de profil</button>
        <button class="admin-menu-item" onclick="showChangeAboutModal()"><i class="fas fa-edit"></i> Texte "À propos"</button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-star"></i> Compétences</h4>
        <button class="admin-menu-item" onclick="showAddSkillModal()"><i class="fas fa-plus"></i> Ajouter</button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-graduation-cap"></i> Formation</h4>
        <button class="admin-menu-item" onclick="showAddEducationModal()"><i class="fas fa-plus"></i> Ajouter</button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-code"></i> Projets</h4>
        <button class="admin-menu-item" onclick="showAddProjectModal()"><i class="fas fa-plus"></i> Ajouter</button>
      </div>
      <div class="admin-menu-section">
        <h4><i class="fas fa-calendar"></i> Activités</h4>
        <button class="admin-menu-item" onclick="showAddActivityModal()"><i class="fas fa-plus"></i> Ajouter</button>
      </div>
    </div>
  `;
  document.body.appendChild(menu);
}

function showAdminMenu() { if (!isAdmin()) { showLoginModal(); return; } const m = document.getElementById('adminMenu'); if (m) m.classList.add('active'); }
function closeAdminMenu() { const m = document.getElementById('adminMenu'); if (m) m.classList.remove('active'); }

function showLoginModal() { const m = document.getElementById('loginModal'); if (m) m.style.display = 'flex'; }

function showChangeProfileModal() { const m = document.getElementById('changeProfileModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }
function showChangeAboutModal() { const m = document.getElementById('changeAboutModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }
function showAddSkillModal() { const m = document.getElementById('addSkillModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }
function showAddEducationModal() { const m = document.getElementById('addEducationModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }
function showAddProjectModal() { const m = document.getElementById('addProjectModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }
function showAddActivityModal() { const m = document.getElementById('addActivityModal'); if (!isAdmin()) { showLoginModal(); return; } if (m) m.style.display = 'flex'; }

function handleLogout() { if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) { logoutAdmin(); } }

// Add admin button & wire UI
function addProfilePhotoButton() {
  if (!isAdmin()) return;
  const profileCard = document.querySelector('.profile-card');
  if (!profileCard) return;
  if (profileCard.querySelector('.change-profile-btn')) return;
  const changeBtn = document.createElement('button');
  changeBtn.className = 'change-profile-btn';
  changeBtn.innerHTML = '<i class="fas fa-camera"></i>';
  changeBtn.title = 'Changer la photo de profil';
  changeBtn.onclick = () => showChangeProfileModal();
  profileCard.appendChild(changeBtn);
}

function showAdminInterface() {
  if (!isAdmin()) { hideAdminInterface(); return; }
  const adminBtn = document.getElementById('adminAccessBtn');
  if (adminBtn) { adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin'; adminBtn.title='Panneau d\'administration (cliquez pour ouvrir)'; adminBtn.onclick = () => showAdminMenu(); }
  addProfilePhotoButton();
}

function hideAdminInterface() {
  const adminBtn = document.getElementById('adminAccessBtn');
  if (adminBtn) { adminBtn.innerHTML = '<i class="fas fa-lock"></i> Admin'; adminBtn.title='Accès administrateur'; adminBtn.onclick = () => showLoginModal(); }
  const changeBtn = document.querySelector('.change-profile-btn'); if (changeBtn) changeBtn.remove();
}

function createAdminUI() {
  const adminBtn = document.createElement('button');
  adminBtn.id = 'adminAccessBtn';
  adminBtn.className = 'admin-access-btn';
  adminBtn.innerHTML = isAdmin() ? '<i class="fas fa-user-shield"></i> Admin' : '<i class="fas fa-lock"></i> Admin';
  adminBtn.onclick = () => { if (isAdmin()) showAdminMenu(); else showLoginModal(); };
  document.body.appendChild(adminBtn);

  createLoginModal();
  createChangeProfileModal();
  createAddProjectModal();
  createAddActivityModal();
  createAdminMenu();
}

// Close modals by clicking outside
window.addEventListener('click', (event) => {
  const ids = ['loginModal','changeProfileModal','changeAboutModal','addSkillModal','addEducationModal','addProjectModal','addActivityModal'];
  ids.forEach(id => {
    const modal = document.getElementById(id);
    if (modal && event.target === modal) modal.style.display = 'none';
  });
});

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  createAdminUI();
  subscribeProfilePhoto();
  subscribeAboutText();
  subscribeSkills();
  subscribeEducation();
  subscribeProjects();
  subscribeActivities();
  // Ajout : forcer l'UI admin si hash correct ou paramètre ?admin=1
  const params = new URLSearchParams(window.location.search);
  if (isAdmin() || params.get('admin') === '1') {
    showAdminInterface();
    // Optionnel : retirer le paramètre admin de l'URL après affichage
    if (params.get('admin') === '1') {
      params.delete('admin');
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    }
  } else {
    hideAdminInterface();
  }
});

// Global functions for onclick handlers
window.closeLoginModal = closeLoginModal;
window.closeChangeProfileModal = closeChangeProfileModal;
window.closeChangeAboutModal = closeChangeAboutModal;
window.closeAddSkillModal = closeAddSkillModal;
window.closeAddEducationModal = closeAddEducationModal;
window.closeAddProjectModal = closeAddProjectModal;
window.closeAddActivityModal = closeAddActivityModal;
window.closeAdminMenu = closeAdminMenu;
window.showLoginModal = showLoginModal;
window.showChangeProfileModal = showChangeProfileModal;
window.showChangeAboutModal = showChangeAboutModal;
window.showAddSkillModal = showAddSkillModal;
window.showAddEducationModal = showAddEducationModal;
window.showAddProjectModal = showAddProjectModal;
window.showAddActivityModal = showAddActivityModal;
window.showAdminMenu = showAdminMenu;
window.handleLogout = handleLogout;
window.deleteProject = deleteProject;
window.deleteActivity = deleteActivity;
window.deleteSkill = deleteSkill;
window.deleteEducation = deleteEducation;

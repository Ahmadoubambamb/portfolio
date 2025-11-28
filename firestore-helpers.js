// Firestore Helper Functions
import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from './firebase-client.js';

// ===== PROFILE =====
export async function loadProfile() {
  try {
    const docSnap = await getDoc(doc(db, 'profile', 'main'));
    return docSnap.exists() ? docSnap.data() : { photo: 'images/bamba.jpg' };
  } catch (e) {
    console.error('Error loading profile:', e);
    return { photo: 'images/bamba.jpg' };
  }
}

export async function saveProfile(profileData) {
  try {
    await setDoc(doc(db, 'profile', 'main'), profileData);
    return true;
  } catch (e) {
    console.error('Error saving profile:', e);
    return false;
  }
}

// ===== ACTIVITIES =====
export async function loadActivities() {
  try {
    const snapshot = await getDocs(collection(db, 'activities'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error loading activities:', e);
    return [];
  }
}

export async function saveActivity(activityId, activityData) {
  try {
    await setDoc(doc(db, 'activities', String(activityId)), { id: activityId, ...activityData });
    return true;
  } catch (e) {
    console.error('Error saving activity:', e);
    return false;
  }
}

export async function deleteActivity(activityId) {
  try {
    await deleteDoc(doc(db, 'activities', String(activityId)));
    return true;
  } catch (e) {
    console.error('Error deleting activity:', e);
    return false;
  }
}

// ===== EDUCATIONS =====
export async function loadEducations() {
  try {
    const snapshot = await getDocs(collection(db, 'educations'));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by createdAt (newest first) or by original order
    return docs.length > 0 ? docs : [
      { id: 1, year: '2024-2025', title: 'Master 1 Gestion des Données et Ingénierie Logiciel', location: 'Université Gaston Berger (UGB)' },
      { id: 2, year: '2023-2024', title: 'Licence 3 Informatique', location: 'Université Gaston Berger (UGB)' },
      { id: 3, year: '2022-2023', title: 'Licence 2 MPI', location: 'Université Gaston Berger (UGB)' },
      { id: 4, year: '2021-2022', title: 'Licence 1 MPI', location: 'Université Gaston Berger (UGB)' },
      { id: 5, year: '2021', title: 'Baccalauréat S1', location: 'Kaolack' }
    ];
  } catch (e) {
    console.error('Error loading educations:', e);
    return [];
  }
}

export async function saveEducation(educationId, educationData) {
  try {
    await setDoc(doc(db, 'educations', String(educationId)), { id: educationId, ...educationData });
    return true;
  } catch (e) {
    console.error('Error saving education:', e);
    return false;
  }
}

export async function deleteEducation(educationId) {
  try {
    await deleteDoc(doc(db, 'educations', String(educationId)));
    return true;
  } catch (e) {
    console.error('Error deleting education:', e);
    return false;
  }
}

// ===== SKILLS =====
export async function loadSkills() {
  try {
    const snapshot = await getDocs(collection(db, 'skills'));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return docs.length > 0 ? docs : [
      { id: 1, icon: 'fa-code', title: 'Langages de programmation', skills: ['C', 'C++', 'Java', 'JavaScript', 'HTML/CSS', 'PHP', 'PL/pgSQL', 'Python', 'SQL', 'Lisp'] },
      { id: 2, icon: 'fa-database', title: 'Bases de données', skills: ['PostgreSQL', 'MySQL', 'PHPMyAdmin', 'Oracle'] },
      { id: 3, icon: 'fa-tools', title: 'Outils & Frameworks', skills: ['Git', 'Firebase', 'Flutter', 'Qt', 'VS Code', 'Cursor', 'Kali Linux', 'Angular', 'MongoDB', 'Spring Boot'] },
      { id: 4, icon: 'fa-cogs', title: 'Autres compétences', skills: ['Programmation Système', 'Réseaux (Sockets)', 'Shell Scripting', 'Conception UML', 'MCD'] }
    ];
  } catch (e) {
    console.error('Error loading skills:', e);
    return [];
  }
}

export async function saveSkill(skillId, skillData) {
  try {
    await setDoc(doc(db, 'skills', String(skillId)), { id: skillId, ...skillData });
    return true;
  } catch (e) {
    console.error('Error saving skill:', e);
    return false;
  }
}

export async function deleteSkill(skillId) {
  try {
    await deleteDoc(doc(db, 'skills', String(skillId)));
    return true;
  } catch (e) {
    console.error('Error deleting skill:', e);
    return false;
  }
}

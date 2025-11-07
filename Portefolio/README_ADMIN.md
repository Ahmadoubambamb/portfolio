# Système d'Administration du Portfolio

## 🔐 Accès Administrateur

Pour ajouter ou supprimer des projets, vous devez vous connecter en tant qu'administrateur.

### Mot de passe par défaut
Le mot de passe par défaut est : `portfolio2024`

**⚠️ IMPORTANT : Changez ce mot de passe avant de déployer votre portfolio !**

## 📝 Comment changer le mot de passe

1. Ouvrez le fichier `admin.js`
2. Trouvez la ligne : `const ADMIN_PASSWORD = 'portfolio2024';`
3. Remplacez `'portfolio2024'` par votre propre mot de passe sécurisé
4. Sauvegardez le fichier

## 🚀 Utilisation

### Se connecter en tant qu'admin

1. Cliquez sur le bouton **"Admin"** en bas à droite de la page
2. Entrez votre mot de passe
3. Cliquez sur "Se connecter"

### Ajouter un projet

1. Une fois connecté, la carte "Ajouter un projet" apparaîtra
2. Cliquez sur "Ajouter un projet"
3. Remplissez le formulaire :
   - **Titre du projet** (obligatoire)
   - **Description** (obligatoire)
   - **Icône** : choisissez une icône FontAwesome
   - **Technologies** : séparez par des virgules (ex: React, Node.js, MongoDB)
   - **Lien** : URL GitHub ou autre lien
   - **Texte du lien** : texte à afficher sur le bouton
4. Cliquez sur "Ajouter le projet"

### Supprimer un projet

1. Une fois connecté, un bouton rouge (X) apparaît en haut à droite de chaque projet ajouté
2. Cliquez sur ce bouton pour supprimer le projet
3. Confirmez la suppression

### Se déconnecter

1. Cliquez sur le bouton "Admin" (en bas à droite)
2. Confirmez la déconnexion

## 💾 Stockage des données

Les projets ajoutés sont stockés dans le **localStorage** du navigateur. Cela signifie que :
- Les projets sont sauvegardés localement sur votre ordinateur
- Si vous supprimez les données du navigateur, les projets seront perdus
- Pour un déploiement en production, vous devriez envisager d'utiliser un backend (API, base de données)

## 🔒 Sécurité

**Note importante** : Ce système utilise une protection basique côté client. Pour une sécurité renforcée en production, il est recommandé de :
- Utiliser un backend avec authentification serveur
- Implémenter une vraie base de données
- Utiliser des tokens JWT ou sessions sécurisées

Le système actuel est suffisant pour un portfolio personnel, mais ne devrait pas être utilisé pour des applications critiques.

## 📱 Responsive

L'interface d'administration est entièrement responsive et fonctionne sur mobile, tablette et desktop.



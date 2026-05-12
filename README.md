# RDC Floor Card v4.8.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HA Badge](https://img.shields.io/badge/Home%20Assistant-Custom%20Card-blue.svg)](https://www.home-assistant.io/)

Une carte Lovelace personnalisée, moderne et intuitive pour Home Assistant, conçue pour centraliser le contrôle de votre rez-de-chaussée avec un style **Glassmorphism**.

![Aperçu de la carte](https://github.com/xez7082/rez-de-chauss-/blob/main/img/rdca.png?raw=true)

---

## ✨ Points forts

* **Interface Glassmorphism :** Design épuré avec effets de transparence et flou d'arrière-plan.
* **Système d'onglets dynamique :** Navigation fluide entre 5 catégories (Éclairages, Ouvertures, Températures, Prises, Sécurité).
* **Résumé intelligent (Chips) :** Le header affiche dynamiquement le nombre d'appareils actifs et inactifs.
* **Badges de comptage :** Chaque onglet indique en temps réel le ratio (ex: 2/5) d'appareils allumés.
* **Éditeur visuel complet :** Configurez vos entités et changez les noms des onglets directement depuis l'interface UI, sans toucher au YAML.

---

## 🚀 Installation

### Via HACS (Recommandé)
1. Ouvrez **HACS** > **Interface**.
2. Cliquez sur les trois points en haut à droite > **Dépôts personnalisés**.
3. Ajoutez l'URL de ce dépôt et sélectionnez la catégorie **Lovelace**.
4. Recherchez `RDC Floor Card` et installez-le.

### Installation manuelle
1. Téléchargez le fichier `rdc-floor-card.js`.
2. Déposez-le dans votre dossier `www/` de Home Assistant.
3. Ajoutez la ressource dans vos paramètres Lovelace :
   ```yaml
   url: /local/rdc-floor-card.js
   type: module

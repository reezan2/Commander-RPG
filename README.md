# Commander RPG

Application web progressive (PWA) compagnon pour Magic: The Gathering
Commander : chaque profil suit un Commander, gagne de l'XP en fin de
partie, monte de niveau (1 à 20) et débloque des bonus RPG.

## Lancer le projet en local

Un service worker et `fetch()` nécessitent un serveur HTTP (pas
d'ouverture directe du fichier `index.html` en `file://`).

```bash
cd commander-rpg
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

N'importe quel serveur statique fonctionne (`npx serve`, Live Server
de VS Code, etc.).

## Déployer

L'app est 100% statique : elle peut être déployée telle quelle sur
GitHub Pages, Netlify, Vercel, Cloudflare Pages... Il suffit de
pousser le dossier `commander-rpg/` et de définir `index.html` comme
page d'accueil. Une fois servie en HTTPS, le bouton "Ajouter à l'écran
d'accueil" du navigateur permet l'installation en PWA.

## Structure du projet

```
commander-rpg/
├── index.html          Toutes les vues de l'application (SPA Alpine.js)
├── manifest.json        Manifeste PWA (nom, icônes, couleurs)
├── sw.js                 Service worker (cache de l'app shell)
├── css/style.css         Thème "grimoire arcanique" (tokens, médaillon...)
├── js/
│   ├── db.js              Persistance (localStorage) + export/import
│   ├── scryfall.js         Recherche de Commander via l'API Scryfall
│   ├── bonuses-data.js      Base de données des bonus par tranche
│   ├── xp-engine.js         Règles XP + progression de niveau
│   └── app.js               Contrôleur Alpine.js (état + navigation)
└── icons/                 Icônes PWA générées (192/512/maskable)
```

## Règles XP (gagnées uniquement en fin de partie)

- Participation : **+30 XP**
- Place obtenue : 1er **+150**, 2e **+100**, 3e **+60**, 4e ou moins **+30**
- Commander adverse tué / renvoyé : **+25 XP** par élimination
- Joueurs éliminés dans la partie : 1 joueur **+40**, 2 joueurs **+70**,
  3 joueurs ou plus **+110** (palier maximum atteint, non cumulatif)
- Kill par dégâts de Commander : **+50 XP** par kill

Ces valeurs sont centralisées dans `js/xp-engine.js` (objet `XP_RULES`)
et peuvent être ajustées facilement.

## Progression et bonus

- Niveaux 1 à 20, avec un besoin d'XP croissant par niveau
  (table `XP_TO_NEXT_LEVEL` dans `xp-engine.js`).
- 4 tranches : 1-5, 6-10, 11-15, 16-20.
- À chaque montée de niveau, 2 bonus sont tirés aléatoirement dans la
  tranche correspondante ; le joueur en choisit un.
- Aux niveaux **10** et **20**, les 2 bonus proposés sont des **bonus
  majeurs** (double XP temporaire, réduction de tax permanente, mode
  "Légende Vivante"...).
- Toute la liste des bonus est dans `js/bonuses-data.js` — facile à
  étendre ou rééquilibrer.

## Notes techniques

- **Stockage** : `localStorage`, encapsulé derrière une petite API
  asynchrone (`db.js`) pour rester facilement migrable vers IndexedDB.
- **Recherche Commander** : API publique Scryfall (`is:commander` +
  nom recherché), avec cache mémoire simple pour éviter les appels
  redondants.
- **UI** : Tailwind CSS (CDN) + Alpine.js (CDN) + CSS custom pour les
  éléments de thème (médaillon de niveau, pips de mana, cartes
  "parchemin").
- Aucune donnée n'est envoyée à un serveur : tout reste sur l'appareil
  de l'utilisateur (à part les requêtes de recherche vers Scryfall).

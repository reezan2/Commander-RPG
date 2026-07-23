/**
 * db.js
 * ----------------------------------------------------------------------
 * Couche de persistance. Utilise localStorage (simple, synchrone, fiable
 * hors-ligne pour une PWA de ce volume de données) derrière une petite
 * API asynchrone afin de pouvoir migrer vers IndexedDB plus tard sans
 * toucher au reste de l'app.
 * ----------------------------------------------------------------------
 */

const DB = {
  KEYS: {
    PROFILES: 'crpg_profiles',
    ACTIVE_PROFILE: 'crpg_active_profile_id',
    SETTINGS: 'crpg_settings',
  },

  /** Charge tous les profils. */
  async getProfiles() {
    try {
      const raw = localStorage.getItem(this.KEYS.PROFILES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erreur de lecture des profils', e);
      return [];
    }
  },

  /** Sauvegarde la liste complète des profils. */
  async saveProfiles(profiles) {
    localStorage.setItem(this.KEYS.PROFILES, JSON.stringify(profiles));
  },

  async getActiveProfileId() {
    return localStorage.getItem(this.KEYS.ACTIVE_PROFILE);
  },

  async setActiveProfileId(id) {
    localStorage.setItem(this.KEYS.ACTIVE_PROFILE, id);
  },

  async getSettings() {
    try {
      const raw = localStorage.getItem(this.KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : { darkMode: true };
    } catch (e) {
      return { darkMode: true };
    }
  },

  async saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  /** Crée un nouveau profil "vierge" prêt à l'emploi. */
  createEmptyProfile(name) {
    return {
      id: crypto.randomUUID(),
      name: name || 'Nouveau Joueur',
      commander: null, // { name, imageUrl, scryfallId, colors, manaCost, cmc }
      level: 1,
      xp: 0,
      bonuses: [], // bonus choisis: { id, name, desc, icon, level, major }
      activeBoosts: {
        doubleXpGamesLeft: 0,
        bonusXpGamesLeft: 0,
        bonusXpAmount: 0,
        permanentXpBonusPct: 0,
      },
      stats: {
        gamesPlayed: 0,
        firstPlace: 0,
        secondPlace: 0,
        thirdPlace: 0,
        otherPlace: 0,
        totalCommanderKills: 0,
        totalEliminations: 0,
        totalCommanderDamageKills: 0,
        totalXpEarned: 0,
      },
      history: [], // { id, date, placement, breakdown, totalXp, levelsGained }
      createdAt: new Date().toISOString(),
    };
  },

  // ---------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------

  /** Exporte toutes les données de l'app en JSON téléchargeable. */
  async exportJSON() {
    const profiles = await this.getProfiles();
    const settings = await this.getSettings();
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Commander RPG',
      version: 1,
      profiles,
      settings,
    };
    this._downloadFile(
      `commander-rpg-export-${this._dateStamp()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  },

  /** Exporte l'historique des parties de tous les profils en CSV. */
  async exportCSV() {
    const profiles = await this.getProfiles();
    const rows = [
      ['Profil', 'Commander', 'Date', 'Place', 'XP Total', 'Détail'],
    ];
    profiles.forEach(p => {
      p.history.forEach(h => {
        rows.push([
          p.name,
          p.commander ? p.commander.name : '',
          h.date,
          h.placement,
          h.totalXp,
          h.breakdown.map(b => `${b.label}:${b.xp}`).join(' | '),
        ]);
      });
    });
    const csv = rows.map(r => r.map(this._csvEscape).join(',')).join('\n');
    this._downloadFile(`commander-rpg-historique-${this._dateStamp()}.csv`, csv, 'text/csv');
  },

  /** Importe un fichier JSON exporté précédemment. Remplace les données actuelles. */
  async importJSON(fileContent) {
    const data = JSON.parse(fileContent);
    if (!data.profiles || !Array.isArray(data.profiles)) {
      throw new Error('Fichier invalide : liste de profils manquante.');
    }
    await this.saveProfiles(data.profiles);
    if (data.settings) await this.saveSettings(data.settings);
    return data.profiles;
  },

  _csvEscape(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },

  _dateStamp() {
    return new Date().toISOString().slice(0, 10);
  },

  _downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

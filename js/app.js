/**
 * app.js
 * ----------------------------------------------------------------------
 * Contrôleur principal de l'application, construit avec Alpine.js.
 * Regroupe la navigation entre écrans, la gestion des profils, la
 * recherche Scryfall, le compteur de vie et le flux de fin de partie.
 * ----------------------------------------------------------------------
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({
    // -----------------------------------------------------------------
    // État global
    // -----------------------------------------------------------------
    view: 'profiles', // profiles | new-profile | dashboard | life-setup | life-counter | game-summary | settings
    profiles: [],
    activeProfileId: null,
    darkMode: true,
    toast: null,
    toastTimeout: null,

    // Création / édition de profil
    draftProfile: { name: '', commander: null },
    commanderQuery: '',
    commanderResults: [],
    searching: false,
    searchError: '',

    // Compteur de vie
    numPlayers: 4,
    startingLife: 40,
    players: [],
    lifeHistory: [],

    // Fin de partie
    gameForm: { placement: 1, commanderKills: 0, eliminationsTier: 0, commanderDamageKills: 0 },
    lastGameResult: null, // { breakdown, total, finalXp, boostsApplied }

    // Level up
    levelUpQueue: [],       // niveaux en attente d'un choix de bonus
    currentLevelUpChoices: null, // [bonus, bonus] affiché dans la modale

    // Import
    importError: '',

    // Flag interne : le formulaire "new-profile" sert-il à changer le
    // Commander d'un profil existant plutôt qu'à en créer un nouveau ?
    _editingExisting: false,

    // -----------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------
    async init() {
      this.profiles = await DB.getProfiles();
      this.activeProfileId = await DB.getActiveProfileId();
      const settings = await DB.getSettings();
      this.darkMode = settings.darkMode !== false;
      this.applyDarkMode();

      if (this.profiles.length === 0) {
        this.view = 'profiles';
      }

      // Enregistrement du service worker pour le mode PWA hors-ligne
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW non enregistré', err));
      }
    },

    // -----------------------------------------------------------------
    // Utilitaires généraux
    // -----------------------------------------------------------------
    get activeProfile() {
      return this.profiles.find(p => p.id === this.activeProfileId) || null;
    },

    goTo(view) {
      this.view = view;
    },

    showToast(message) {
      clearTimeout(this.toastTimeout);
      this.toast = message;
      this.toastTimeout = setTimeout(() => (this.toast = null), 2600);
    },

    async persist() {
      await DB.saveProfiles(this.profiles);
    },

    applyDarkMode() {
      document.documentElement.classList.toggle('dark', this.darkMode);
    },

    async toggleDarkMode() {
      this.darkMode = !this.darkMode;
      this.applyDarkMode();
      await DB.saveSettings({ darkMode: this.darkMode });
    },

    tierLabel(level) {
      const tier = getTierForLevel(level);
      return { 1: 'Recrue', 2: 'Vétéran', 3: 'Champion', 4: 'Légende' }[tier];
    },

    tierColorClass(level) {
      const tier = getTierForLevel(level);
      return { 1: 'tier-1', 2: 'tier-2', 3: 'tier-3', 4: 'tier-4' }[tier];
    },

    xpProgress(profile) {
      return getXpProgress(profile);
    },

    // -----------------------------------------------------------------
    // Gestion des profils
    // -----------------------------------------------------------------
    openNewProfile() {
      this.draftProfile = { name: '', commander: null };
      this.commanderQuery = '';
      this.commanderResults = [];
      this.searchError = '';
      this.view = 'new-profile';
    },

    selectProfile(id) {
      this.activeProfileId = id;
      DB.setActiveProfileId(id);
      this.view = 'dashboard';
    },

    async deleteProfile(id) {
      if (!confirm('Supprimer définitivement ce profil et toute sa progression ?')) return;
      this.profiles = this.profiles.filter(p => p.id !== id);
      await this.persist();
      if (this.activeProfileId === id) this.activeProfileId = null;
      this.showToast('Profil supprimé.');
      this.view = 'profiles';
    },

    async searchCommander() {
      this.searchError = '';
      if (this.commanderQuery.trim().length < 2) {
        this.commanderResults = [];
        return;
      }
      this.searching = true;
      try {
        this.commanderResults = await Scryfall.searchCommanders(this.commanderQuery);
        if (this.commanderResults.length === 0) {
          this.searchError = 'Aucun Commander trouvé pour cette recherche.';
        }
      } catch (e) {
        this.searchError = 'Recherche impossible (connexion à Scryfall indisponible).';
      } finally {
        this.searching = false;
      }
    },

    pickCommander(card) {
      this.draftProfile.commander = card;
      this.commanderResults = [];
      this.commanderQuery = card.name;
    },

    async saveNewProfile() {
      if (!this.draftProfile.name.trim()) {
        this.showToast('Donne un nom à ton profil.');
        return;
      }
      if (!this.draftProfile.commander) {
        this.showToast('Choisis un Commander pour ce profil.');
        return;
      }
      const profile = DB.createEmptyProfile(this.draftProfile.name.trim());
      profile.commander = this.draftProfile.commander;
      this.profiles.push(profile);
      await this.persist();
      this.selectProfile(profile.id);
      this.showToast(`${profile.name} est prêt à combattre !`);
    },

    async changeCommander() {
      this.draftProfile = { name: this.activeProfile.name, commander: this.activeProfile.commander };
      this.commanderQuery = this.activeProfile.commander?.name || '';
      this.commanderResults = [];
      this._editingExisting = true;
      this.view = 'new-profile';
    },

    async saveCommanderChange() {
      if (this._editingExisting) {
        const p = this.activeProfile;
        p.commander = this.draftProfile.commander;
        await this.persist();
        this._editingExisting = false;
        this.view = 'dashboard';
        this.showToast('Commander mis à jour.');
      } else {
        await this.saveNewProfile();
      }
    },

    // -----------------------------------------------------------------
    // Compteur de vie
    // -----------------------------------------------------------------
    setupLifeCounter(count) {
      this.numPlayers = count;
      this.players = Array.from({ length: count }, (_, i) => ({
        name: i === 0 && this.activeProfile ? this.activeProfile.name : `Joueur ${i + 1}`,
        life: this.startingLife,
        commanderDamage: Array(count).fill(0),
        poison: 0,
      }));
      this.lifeHistory = [];
      this.view = 'life-counter';
    },

    _snapshotLife() {
      this.lifeHistory.push(JSON.parse(JSON.stringify(this.players)));
      if (this.lifeHistory.length > 50) this.lifeHistory.shift();
    },

    adjustLife(index, delta) {
      this._snapshotLife();
      this.players[index].life += delta;
    },

    adjustPoison(index, delta) {
      this._snapshotLife();
      this.players[index].poison = Math.max(0, this.players[index].poison + delta);
    },

    adjustCommanderDamage(targetIndex, fromIndex, delta) {
      this._snapshotLife();
      const cd = this.players[targetIndex].commanderDamage;
      cd[fromIndex] = Math.max(0, cd[fromIndex] + delta);
      // Les dégâts de commandant s'appliquent aussi à la vie totale
      this.players[targetIndex].life -= delta;
    },

    undoLife() {
      if (this.lifeHistory.length === 0) return;
      this.players = this.lifeHistory.pop();
    },

    endGameFromCounter() {
      this.gameForm = { placement: 1, commanderKills: 0, eliminationsTier: 0, commanderDamageKills: 0 };
      this.view = 'game-summary';
    },

    // -----------------------------------------------------------------
    // Fin de partie : calcul et application de l'XP
    // -----------------------------------------------------------------
    gamePreviewXp() {
      return calculateGameXp(this.gameForm).total;
    },

    async submitGameSummary() {
      const profile = this.activeProfile;
      if (!profile) return;

      const { breakdown, total } = calculateGameXp(this.gameForm);
      const { finalXp, applied } = applyActiveBoosts(profile, total);

      // Mise à jour des statistiques cumulées
      profile.stats.gamesPlayed += 1;
      profile.stats.totalCommanderKills += this.gameForm.commanderKills;
      profile.stats.totalEliminations += this.gameForm.eliminationsTier;
      profile.stats.totalCommanderDamageKills += this.gameForm.commanderDamageKills;
      profile.stats.totalXpEarned += finalXp;
      if (this.gameForm.placement === 1) profile.stats.firstPlace += 1;
      else if (this.gameForm.placement === 2) profile.stats.secondPlace += 1;
      else if (this.gameForm.placement === 3) profile.stats.thirdPlace += 1;
      else profile.stats.otherPlace += 1;

      // Décrémente les boosts temporaires APRES les avoir appliqués à cette partie
      tickBoostCounters(profile);

      // Applique l'XP et détecte les montées de niveau
      const levelsGained = applyXpToProfile(profile, finalXp);

      // Historique
      profile.history.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        placement: this.gameForm.placement,
        breakdown,
        totalXp: finalXp,
        levelsGained,
      });

      await this.persist();

      this.lastGameResult = { breakdown, total, finalXp, boostsApplied: applied, levelsGained };
      this.levelUpQueue = [...levelsGained];

      this.view = 'game-result';
      this._maybeStartLevelUp();
    },

    _maybeStartLevelUp() {
      if (this.levelUpQueue.length === 0) {
        this.currentLevelUpChoices = null;
        return;
      }
      const level = this.levelUpQueue[0];
      const owned = this.activeProfile.bonuses.map(b => b.id);
      this.currentLevelUpChoices = {
        level,
        options: drawTwoRandomBonuses(level, owned),
      };
    },

    async chooseBonus(bonus) {
      const profile = this.activeProfile;
      const level = this.levelUpQueue.shift();

      profile.bonuses.push({ ...bonus, level, chosenAt: new Date().toISOString() });

      // Applique les effets "actifs" (boosts temporaires ou permanents)
      const eff = bonus.effect;
      if (eff.type === 'double_xp_games') {
        profile.activeBoosts.doubleXpGamesLeft += eff.value;
      } else if (eff.type === 'bonus_xp_games') {
        profile.activeBoosts.bonusXpGamesLeft += eff.value.games;
        profile.activeBoosts.bonusXpAmount = eff.value.amount;
      } else if (eff.type === 'permanent_xp_bonus_pct') {
        profile.activeBoosts.permanentXpBonusPct += eff.value;
      }

      await this.persist();
      this.showToast(`Bonus obtenu : ${bonus.name}`);
      this._maybeStartLevelUp();
    },

    finishGameResult() {
      this.lastGameResult = null;
      this.view = 'dashboard';
    },

    // -----------------------------------------------------------------
    // Export / Import
    // -----------------------------------------------------------------
    async doExportJSON() {
      await DB.exportJSON();
      this.showToast('Export JSON téléchargé.');
    },

    async doExportCSV() {
      await DB.exportCSV();
      this.showToast('Export CSV téléchargé.');
    },

    async handleImportFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.importError = '';
      try {
        const text = await file.text();
        this.profiles = await DB.importJSON(text);
        this.showToast('Import réussi.');
        this.view = 'profiles';
      } catch (e) {
        this.importError = "Échec de l'import : fichier invalide.";
      } finally {
        event.target.value = '';
      }
    },

    async resetAllData() {
      if (!confirm('Tout supprimer (profils, historique, réglages) ? Cette action est irréversible.')) return;
      this.profiles = [];
      this.activeProfileId = null;
      await this.persist();
      await DB.setActiveProfileId('');
      this.showToast('Toutes les données ont été réinitialisées.');
      this.view = 'profiles';
    },

    // -----------------------------------------------------------------
    // Aides d'affichage divers
    // -----------------------------------------------------------------
    formatDate(iso) {
      return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    placementLabel(p) {
      return { 1: '🥇 1ère place', 2: '🥈 2ème place', 3: '🥉 3ème place' }[p] || '4ème place ou moins';
    },
  }));
});

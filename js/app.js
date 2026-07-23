/**
 * app.js — Contrôleur principal Alpine.js
 */
document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({

    // ── État global ────────────────────────────────────────────────
    view: 'profiles',
    profiles: [],
    activeProfileId: null,
    darkMode: true,
    toast: null,
    _toastTimer: null,

    // Formulaire nouveau profil
    draftName: '',
    draftCommander: null,
    commanderQuery: '',
    commanderResults: [],
    searching: false,
    searchError: '',
    _editingExisting: false,

    // Compteur de vie
    numPlayers: 4,
    startingLife: 40,
    players: [],
    lifeHistory: [],

    // Fin de partie
    gameForm: { placement: 1, commanderKills: 0, eliminationsTier: 0, commanderDamageKills: 0 },
    lastGameResult: null,

    // Level up
    levelUpQueue: [],
    currentLevelUp: null, // { level, options: [bonus, bonus] }

    // Settings
    importError: '',

    // ── Init ───────────────────────────────────────────────────────
    async init() {
      this.profiles = await DB.getProfiles();
      this.activeProfileId = await DB.getActiveProfileId();
      const s = await DB.getSettings();
      this.darkMode = s.darkMode !== false;
      this._applyDark();

      // Restaurer activeProfileId valide
      if (this.activeProfileId && !this.profiles.find(p => p.id === this.activeProfileId)) {
        this.activeProfileId = this.profiles[0]?.id || null;
        await DB.setActiveProfileId(this.activeProfileId || '');
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
    },

    // ── Helpers ────────────────────────────────────────────────────
    get ap() { // activeProfile raccourci
      return this.profiles.find(p => p.id === this.activeProfileId) || null;
    },

    go(v) { this.view = v; },

    toast_(msg) {
      clearTimeout(this._toastTimer);
      this.toast = msg;
      this._toastTimer = setTimeout(() => { this.toast = null; }, 2800);
    },

    async save() { await DB.saveProfiles(this.profiles); },

    _applyDark() {
      document.documentElement.classList.toggle('dark', this.darkMode);
    },

    async toggleDark() {
      this.darkMode = !this.darkMode;
      this._applyDark();
      await DB.saveSettings({ darkMode: this.darkMode });
    },

    tierLabel(lvl) {
      return ['','Recrue','Recrue','Recrue','Recrue','Recrue',
              'Vétéran','Vétéran','Vétéran','Vétéran','Vétéran',
              'Champion','Champion','Champion','Champion','Champion',
              'Légende','Légende','Légende','Légende','Légende'][lvl] || 'Recrue';
    },

    tierClass(lvl) {
      if (lvl <= 5)  return 'tier-1';
      if (lvl <= 10) return 'tier-2';
      if (lvl <= 15) return 'tier-3';
      return 'tier-4';
    },

    xpBar(profile) { return getXpProgress(profile); },

    formatDate(iso) {
      return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
    },

    placeLabel(p) {
      return {1:'🥇 1ère place',2:'🥈 2ème',3:'🥉 3ème'}[p] || '4ème ou moins';
    },

    previewXp() {
      try { return calculateGameXp(this.gameForm).total; } catch(e) { return 0; }
    },

    navTo(v) {
      // Navigation basse : bloque si pas de profil actif pour dashboard/partie
      if ((v === 'dashboard' || v === 'life-setup') && !this.ap) {
        this.toast_('Sélectionne un profil d\'abord.');
        this.go('profiles');
        return;
      }
      this.go(v);
    },

    // ── Profils ────────────────────────────────────────────────────
    openNew() {
      this.draftName = '';
      this.draftCommander = null;
      this.commanderQuery = '';
      this.commanderResults = [];
      this.searchError = '';
      this._editingExisting = false;
      this.go('new-profile');
    },

    selectProfile(id) {
      this.activeProfileId = id;
      DB.setActiveProfileId(id);
      this.go('dashboard');
    },

    async deleteProfile(id) {
      if (!confirm('Supprimer ce profil définitivement ?')) return;
      this.profiles = this.profiles.filter(p => p.id !== id);
      await this.save();
      if (this.activeProfileId === id) {
        this.activeProfileId = this.profiles[0]?.id || null;
        await DB.setActiveProfileId(this.activeProfileId || '');
      }
      this.toast_('Profil supprimé.');
      this.go('profiles');
    },

    // ── Scryfall ───────────────────────────────────────────────────
    async doSearch() {
      this.searchError = '';
      const q = this.commanderQuery.trim();
      if (q.length < 2) { this.commanderResults = []; return; }
      this.searching = true;
      try {
        this.commanderResults = await Scryfall.searchCommanders(q);
        if (this.commanderResults.length === 0)
          this.searchError = 'Aucun Commander trouvé. Essaie un autre nom.';
      } catch (e) {
        this.searchError = 'Connexion à Scryfall impossible. Vérifie ta connexion.';
      } finally {
        this.searching = false;
      }
    },

    pickCard(card) {
      this.draftCommander = card;
      this.commanderQuery = card.name;
      this.commanderResults = [];
    },

    async saveProfile() {
      if (!this._editingExisting && !this.draftName.trim()) {
        this.toast_('Entre un nom de joueur.'); return;
      }
      if (!this.draftCommander) {
        this.toast_('Choisis un Commander.'); return;
      }
      if (this._editingExisting) {
        this.ap.commander = this.draftCommander;
        await this.save();
        this._editingExisting = false;
        this.toast_('Commander mis à jour.');
        this.go('dashboard');
      } else {
        const p = DB.createEmptyProfile(this.draftName.trim());
        p.commander = this.draftCommander;
        this.profiles.push(p);
        await this.save();
        this.selectProfile(p.id);
        this.toast_(`${p.name} est prêt !`);
      }
    },

    openChangeCommander() {
      if (!this.ap) return;
      this.draftCommander = this.ap.commander;
      this.commanderQuery = this.ap.commander?.name || '';
      this.commanderResults = [];
      this.searchError = '';
      this._editingExisting = true;
      this.go('new-profile');
    },

    // ── Compteur de vie ────────────────────────────────────────────
    setupLife(n) {
      this.numPlayers = n;
      this.players = Array.from({ length: n }, (_, i) => ({
        name: i === 0 && this.ap ? this.ap.name : `Joueur ${i + 1}`,
        life: this.startingLife,
        cmdDmg: Array(n).fill(0),
        poison: 0,
        showDetails: false,
      }));
      this.lifeHistory = [];
      this.go('life-counter');
    },

    snap() {
      this.lifeHistory.push(JSON.parse(JSON.stringify(this.players)));
      if (this.lifeHistory.length > 60) this.lifeHistory.shift();
    },

    adj(i, d) { this.snap(); this.players[i].life = Math.max(-99, this.players[i].life + d); },
    adjPoison(i, d) { this.snap(); this.players[i].poison = Math.max(0, this.players[i].poison + d); },
    adjCmd(target, from, d) {
      this.snap();
      this.players[target].cmdDmg[from] = Math.max(0, this.players[target].cmdDmg[from] + d);
      this.players[target].life = Math.max(-99, this.players[target].life - d);
    },
    undo() { if (this.lifeHistory.length) this.players = this.lifeHistory.pop(); },

    goToSummary() {
      this.gameForm = { placement: 1, commanderKills: 0, eliminationsTier: 0, commanderDamageKills: 0 };
      this.go('game-summary');
    },

    // ── Fin de partie ──────────────────────────────────────────────
    async submitGame() {
      const p = this.ap;
      if (!p) { this.toast_('Aucun profil actif.'); return; }

      const { breakdown, total } = calculateGameXp(this.gameForm);
      const { finalXp, applied } = applyActiveBoosts(p, total);

      p.stats.gamesPlayed++;
      p.stats.totalCommanderKills += this.gameForm.commanderKills;
      p.stats.totalEliminations += this.gameForm.eliminationsTier;
      p.stats.totalCommanderDamageKills += this.gameForm.commanderDamageKills;
      p.stats.totalXpEarned += finalXp;
      if (this.gameForm.placement === 1) p.stats.firstPlace++;
      else if (this.gameForm.placement === 2) p.stats.secondPlace++;
      else if (this.gameForm.placement === 3) p.stats.thirdPlace++;
      else p.stats.otherPlace++;

      tickBoostCounters(p);
      const levelsGained = applyXpToProfile(p, finalXp);

      p.history.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        placement: this.gameForm.placement,
        breakdown,
        totalXp: finalXp,
        levelsGained,
      });

      await this.save();

      this.lastGameResult = { breakdown, total, finalXp, boostsApplied: applied, levelsGained };
      this.levelUpQueue = [...levelsGained];
      this.go('game-result');
      this._nextLevelUp();
    },

    _nextLevelUp() {
      if (!this.levelUpQueue.length) { this.currentLevelUp = null; return; }
      const lvl = this.levelUpQueue[0];
      const owned = (this.ap?.bonuses || []).map(b => b.id);
      this.currentLevelUp = { level: lvl, options: drawTwoRandomBonuses(lvl, owned) };
    },

    async pickBonus(bonus) {
      const p = this.ap;
      if (!p) return;
      const lvl = this.levelUpQueue.shift();
      p.bonuses.push({ ...bonus, level: lvl, chosenAt: new Date().toISOString() });
      const e = bonus.effect;
      if (e.type === 'double_xp_games') p.activeBoosts.doubleXpGamesLeft += e.value;
      else if (e.type === 'bonus_xp_games') { p.activeBoosts.bonusXpGamesLeft += e.value.games; p.activeBoosts.bonusXpAmount = e.value.amount; }
      else if (e.type === 'permanent_xp_bonus_pct') p.activeBoosts.permanentXpBonusPct += e.value;
      await this.save();
      this.toast_(`✨ ${bonus.name}`);
      this._nextLevelUp();
    },

    doneResult() { this.lastGameResult = null; this.go('dashboard'); },

    // ── Export / Import ────────────────────────────────────────────
    async exportJSON() { await DB.exportJSON(); this.toast_('Export JSON téléchargé.'); },
    async exportCSV()  { await DB.exportCSV();  this.toast_('Export CSV téléchargé.'); },

    async importFile(e) {
      const file = e.target.files[0]; if (!file) return;
      this.importError = '';
      try {
        const text = await file.text();
        this.profiles = await DB.importJSON(text);
        this.toast_('Import réussi.');
        this.go('profiles');
      } catch { this.importError = 'Fichier invalide.'; }
      finally { e.target.value = ''; }
    },

    async resetAll() {
      if (!confirm('Tout supprimer ? Action irréversible.')) return;
      this.profiles = []; this.activeProfileId = null;
      await this.save(); await DB.setActiveProfileId('');
      this.toast_('Données réinitialisées.');
      this.go('profiles');
    },
  }));
});

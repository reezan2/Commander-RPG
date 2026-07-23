/**
 * xp-engine.js
 * ----------------------------------------------------------------------
 * Moteur de règles XP et de progression de niveau (1 à 20).
 * Ne dépend d'aucune autre partie de l'app : uniquement des fonctions
 * pures + les constantes de règles, faciles à tester/ajuster.
 * ----------------------------------------------------------------------
 */

const XP_RULES = {
  PARTICIPATION: 30,
  PLACEMENT: { 1: 150, 2: 100, 3: 60, 4: 30 }, // 4e place ou moins = 30
  COMMANDER_KILL: 25,           // par Commander adverse tué / changé de zone
  ELIMINATIONS_TIER: { 0: 0, 1: 40, 2: 70, 3: 110 }, // palier atteint (max, non cumulatif)
  COMMANDER_DAMAGE_KILL: 50,    // par joueur tué via dégâts de Commander
};

// XP nécessaire pour passer du niveau N au niveau N+1 (index = niveau actuel)
const XP_TO_NEXT_LEVEL = {
  1: 150, 2: 180, 3: 210, 4: 240, 5: 300,
  6: 340, 7: 380, 8: 420, 9: 460, 10: 550,
  11: 600, 12: 650, 13: 700, 14: 750, 15: 850,
  16: 900, 17: 950, 18: 1000, 19: 1100,
  // 20 = niveau max, pas de seuil suivant
};

const MAX_LEVEL = 20;

/**
 * Calcule le détail de l'XP gagnée pour une partie à partir du formulaire
 * de fin de partie. Retourne { breakdown: [{label, xp}], total }.
 *
 * form = {
 *   placement: 1|2|3|4,
 *   commanderKills: number,       // Commanders adverses tués/renvoyés
 *   eliminationsTier: 0|1|2|3,    // palier de joueurs éliminés atteint
 *   commanderDamageKills: number, // joueurs tués via dégâts de commandant
 * }
 */
function calculateGameXp(form) {
  const breakdown = [];

  breakdown.push({ label: 'Participation à la partie', xp: XP_RULES.PARTICIPATION });

  const placementXp = XP_RULES.PLACEMENT[form.placement] ?? XP_RULES.PLACEMENT[4];
  const placementLabel = { 1: '1ère place', 2: '2ème place', 3: '3ème place' }[form.placement] || '4ème place ou moins';
  breakdown.push({ label: placementLabel, xp: placementXp });

  if (form.commanderKills > 0) {
    breakdown.push({
      label: `Commander(s) adverse(s) éliminé(s) ×${form.commanderKills}`,
      xp: form.commanderKills * XP_RULES.COMMANDER_KILL,
    });
  }

  const elimXp = XP_RULES.ELIMINATIONS_TIER[form.eliminationsTier] || 0;
  if (elimXp > 0) {
    const elimLabel = form.eliminationsTier >= 3 ? '3 joueurs ou plus éliminés' : `${form.eliminationsTier} joueur(s) éliminé(s)`;
    breakdown.push({ label: elimLabel, xp: elimXp });
  }

  if (form.commanderDamageKills > 0) {
    breakdown.push({
      label: `Kill(s) par dégâts de Commander ×${form.commanderDamageKills}`,
      xp: form.commanderDamageKills * XP_RULES.COMMANDER_DAMAGE_KILL,
    });
  }

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  return { breakdown, total };
}

/**
 * Applique les boosts actifs du profil (bonus majeurs) à un montant d'XP brut.
 * Retourne { finalXp, boostsApplied: [label] } et mute PAS le profil
 * (la décrémentation des compteurs se fait séparément dans applyXpToProfile).
 */
function applyActiveBoosts(profile, rawXp) {
  let xp = rawXp;
  const applied = [];
  const boosts = profile.activeBoosts || {};

  if (boosts.doubleXpGamesLeft > 0) {
    xp *= 2;
    applied.push('Double XP active');
  }
  if (boosts.bonusXpGamesLeft > 0) {
    xp += boosts.bonusXpAmount || 0;
    applied.push(`+${boosts.bonusXpAmount} XP bonus`);
  }
  if (boosts.permanentXpBonusPct) {
    xp += Math.round(rawXp * (boosts.permanentXpBonusPct / 100));
    applied.push(`+${boosts.permanentXpBonusPct}% XP permanent`);
  }

  return { finalXp: Math.round(xp), applied };
}

/**
 * Décrémente les compteurs de boosts "temporaires" (Nb de parties restantes)
 * après qu'une partie a été enregistrée.
 */
function tickBoostCounters(profile) {
  const b = profile.activeBoosts;
  if (!b) return;
  if (b.doubleXpGamesLeft > 0) b.doubleXpGamesLeft -= 1;
  if (b.bonusXpGamesLeft > 0) b.bonusXpGamesLeft -= 1;
}

/**
 * Ajoute de l'XP à un profil, gère les montées de niveau en cascade.
 * Retourne un tableau des niveaux atteints (pour déclencher les choix de
 * bonus successifs), ex: [6, 7] si le joueur passe 2 niveaux d'un coup.
 */
function applyXpToProfile(profile, xpGained) {
  const levelsGained = [];
  profile.xp += xpGained;

  while (profile.level < MAX_LEVEL) {
    const needed = XP_TO_NEXT_LEVEL[profile.level];
    if (profile.xp >= needed) {
      profile.xp -= needed;
      profile.level += 1;
      levelsGained.push(profile.level);
    } else {
      break;
    }
  }

  if (profile.level >= MAX_LEVEL) {
    profile.xp = 0; // niveau max atteint : plus de barre de progression utile
  }

  return levelsGained;
}

/**
 * Retourne { current, needed, pct } pour afficher la barre de progression.
 */
function getXpProgress(profile) {
  if (profile.level >= MAX_LEVEL) {
    return { current: 0, needed: 0, pct: 100 };
  }
  const needed = XP_TO_NEXT_LEVEL[profile.level];
  const pct = Math.min(100, Math.round((profile.xp / needed) * 100));
  return { current: profile.xp, needed, pct };
}

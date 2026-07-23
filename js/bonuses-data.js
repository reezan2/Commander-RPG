/**
 * bonuses-data.js
 * ----------------------------------------------------------------------
 * Base de données de tous les bonus de level up, organisés par tranche.
 * Chaque bonus a :
 *   - id        : identifiant unique stable (sert aussi de clé d'effet)
 *   - name      : nom RP du bonus
 *   - desc      : description courte affichée au joueur
 *   - icon      : emoji utilisé comme icône (pas d'images à charger)
 *   - major     : true uniquement pour les bonus de niveau 10 et 20
 *   - effect    : { type, value } -> utilisé pour l'affichage synthétique
 *                 des bonus actifs sur le dashboard (pas de simulation
 *                 de règles Magic, juste un aide-mémoire pour le joueur)
 * ----------------------------------------------------------------------
 */

const BONUS_TIERS = {
  // Tranche 1 : niveaux 1 à 5
  1: [
    { id: 't1_life1', name: 'Souffle Vital', desc: '+1 vie de départ pour toute la partie.', icon: '❤️', effect: { type: 'life_start', value: 1 } },
    { id: 't1_tax1', name: 'Marché Noir', desc: 'Réduction du coût de relance du Commander de -1.', icon: '💰', effect: { type: 'commander_tax', value: -1 } },
    { id: 't1_shield', name: 'Bouclier Naissant', desc: '+5 PV la première fois que vous lancez votre Commander.', icon: '🛡️', effect: { type: 'commander_cast_shield', value: 5 } },
    { id: 't1_hand', name: 'Vision Précoce', desc: '+1 carte piochée à la main de départ.', icon: '🔮', effect: { type: 'starting_hand', value: 1 } },
    { id: 't1_token', name: 'Serviteur Loyal', desc: 'Commencez la partie avec un token 1/1 gratuit.', icon: '🐾', effect: { type: 'token_start', value: '1/1' } },
    { id: 't1_mulligan', name: 'Main Studieuse', desc: 'Regardez une carte de plus lors de votre premier mulligan.', icon: '📖', effect: { type: 'peek_extra_card', value: 1 } },
    { id: 't1_firststrike', name: 'Premier Sang', desc: '+1 dégât sur la première attaque de votre Commander.', icon: '⚔️', effect: { type: 'first_strike_commander_dmg', value: 1 } },
    { id: 't1_turn1', name: 'Coffre Personnel', desc: '+1 carte piochée pendant votre premier tour.', icon: '📦', effect: { type: 'turn1_extra_draw', value: 1 } },
  ],

  // Tranche 2 : niveaux 6 à 10 (bonus normaux, 10 = majeur uniquement)
  2: [
    { id: 't2_tax2', name: 'Trésorier de Guerre', desc: 'Réduction du coût de relance du Commander de -2.', icon: '🏦', effect: { type: 'commander_tax', value: -2 } },
    { id: 't2_drawattack', name: 'Frappe Vampirique', desc: 'Piochez une carte quand votre Commander attaque.', icon: '🧛', effect: { type: 'draw_on_commander_attack', value: 1 } },
    { id: 't2_anthem', name: 'Bénédiction du Clan', desc: '+1/+1 à toutes vos créatures pour la partie.', icon: '✨', effect: { type: 'anthem', value: '+1/+1' } },
    { id: 't2_life2', name: 'Second Souffle', desc: '+1 vie de départ supplémentaire (cumulable).', icon: '💗', effect: { type: 'life_start', value: 1 } },
    { id: 't2_counter', name: 'Main de Fer', desc: 'Ignorez le premier sort de contre ciblant votre Commander.', icon: '✊', effect: { type: 'counter_immunity_once', value: 1 } },
    { id: 't2_mana4', name: 'Réserve Arcanique', desc: '+1 mana disponible pendant votre tour 4.', icon: '💎', effect: { type: 'extra_mana_turn4', value: 1 } },
    { id: 't2_scry', name: "Œil du Stratège", desc: "Regardez la main d'un adversaire au début de la partie.", icon: '👁️', effect: { type: 'peek_opponent_hand', value: 1 } },
    { id: 't2_roar', name: 'Rugissement', desc: '+2 dégâts la première fois que votre Commander inflige des dégâts.', icon: '🦁', effect: { type: 'commander_dmg_bonus', value: 2 } },
  ],

  // Niveau 10 : bonus MAJEUR uniquement
  10: [
    { id: 'maj10_doublexp', name: 'Double XP', desc: "Double l'XP gagnée pendant les 5 prochaines parties.", icon: '⚡', major: true, effect: { type: 'double_xp_games', value: 5 } },
    { id: 'maj10_emblem', name: 'Emblème Permanent', desc: '+10% XP gagnée en permanence sur toutes les parties futures.', icon: '🏵️', major: true, effect: { type: 'permanent_xp_bonus_pct', value: 10 } },
    { id: 'maj10_tax3', name: 'Trésor de Guerre', desc: 'Réduction permanente du coût de relance du Commander de -3.', icon: '👑', major: true, effect: { type: 'commander_tax', value: -3 } },
  ],

  // Tranche 3 : niveaux 11 à 15
  3: [
    { id: 't3_tax3', name: 'Second Souffle Ultime', desc: 'Réduction du coût de relance du Commander de -3.', icon: '🏦', effect: { type: 'commander_tax', value: -3 } },
    { id: 't3_lifekill', name: 'Vitalité Ancestrale', desc: '+2 vies à chaque kill par dégâts de Commander.', icon: '🩸', effect: { type: 'life_on_commander_kill', value: 2 } },
    { id: 't3_draw3', name: 'Bibliothèque Interdite', desc: '+1 pioche supplémentaire tous les 3 tours.', icon: '📚', effect: { type: 'draw_every_3_turns', value: 1 } },
    { id: 't3_resist', name: 'Résistance du Titan', desc: 'Réduisez de 3 les premiers dégâts de Commander subis chaque partie.', icon: '🗿', effect: { type: 'commander_dmg_reduction_once', value: -3 } },
    { id: 't3_dragon', name: 'Souffle du Dragon', desc: 'Votre Commander gagne le vol lors de sa première attaque.', icon: '🐉', effect: { type: 'commander_flying_first_attack', value: 1 } },
    { id: 't3_graveyard', name: "Marché de l'Ombre", desc: "Retirez une carte de la défausse d'un adversaire, une fois par partie.", icon: '🕸️', effect: { type: 'graveyard_hate_once', value: 1 } },
    { id: 't3_tablelife', name: 'Générosité Royale', desc: '+1 vie de départ pour tous les joueurs de la table (bonus social).', icon: '🍻', effect: { type: 'table_life', value: 1 } },
    { id: 't3_scry', name: 'Œil Omniscient', desc: "Vous pouvez regarder le dessus de votre bibliothèque à tout moment.", icon: '👁️‍🗨️', effect: { type: 'scry_1_always', value: 1 } },
  ],

  // Tranche 4 : niveaux 16 à 19 (bonus normaux, 20 = majeur uniquement)
  4: [
    { id: 't4_tax4', name: 'Coffre du Archimage', desc: 'Réduction du coût de relance du Commander de -4.', icon: '🏦', effect: { type: 'commander_tax', value: -4 } },
    { id: 't4_life3', name: 'Vitalité Suprême', desc: '+2 vies de départ supplémentaires.', icon: '💗', effect: { type: 'life_start', value: 2 } },
    { id: 't4_doubleattack', name: 'Frénésie du Commandant', desc: 'Votre Commander peut être relancé sans payer la tax une fois par partie.', icon: '🔥', effect: { type: 'free_recast_once', value: 1 } },
    { id: 't4_draw', name: 'Sagesse Ancestrale', desc: '+1 carte piochée chaque fois que votre Commander inflige des dégâts.', icon: '📜', effect: { type: 'draw_on_commander_dmg', value: 1 } },
    { id: 't4_anthem2', name: 'Aura de Puissance', desc: '+2/+2 à toutes vos créatures pour la partie.', icon: '💠', effect: { type: 'anthem', value: '+2/+2' } },
    { id: 't4_immunity', name: 'Volonté Inébranlable', desc: 'Immunité à un sort ciblant votre Commander, une fois par partie.', icon: '🛡️', effect: { type: 'targeted_immunity_once', value: 1 } },
  ],

  // Niveau 20 : bonus MAJEUR uniquement
  20: [
    { id: 'maj20_legendary', name: 'Pouvoir Légendaire Permanent', desc: 'Votre Commander inflige +2 dégâts de façon permanente.', icon: '🌟', major: true, effect: { type: 'commander_dmg_permanent', value: 2 } },
    { id: 'maj20_chrono', name: 'Chronomancien', desc: '+100 XP pendant les 10 prochaines parties.', icon: '⏳', major: true, effect: { type: 'bonus_xp_games', value: { games: 10, amount: 100 } } },
    { id: 'maj20_legend', name: 'Légende Vivante', desc: 'Cumul de tous vos bonus majeurs, +5% XP permanent, titre spécial "Légende Vivante".', icon: '🏆', major: true, effect: { type: 'legend_mode', value: 1 } },
  ],
};

/**
 * Retourne le numéro de tranche (1 à 4) correspondant à un niveau donné.
 */
function getTierForLevel(level) {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 15) return 3;
  return 4;
}

/**
 * Retourne la pile de bonus (tableau) dans laquelle piocher pour un niveau
 * donné. Gère le cas spécial des niveaux majeurs 10 et 20.
 */
function getBonusPoolForLevel(level) {
  if (level === 10) return BONUS_TIERS[10];
  if (level === 20) return BONUS_TIERS[20];
  const tier = getTierForLevel(level);
  return BONUS_TIERS[tier];
}

/**
 * Tire 2 bonus aléatoires distincts dans la tranche appropriée pour "level".
 */
function drawTwoRandomBonuses(level, alreadyOwnedIds = []) {
  const pool = getBonusPoolForLevel(level).filter(b => !alreadyOwnedIds.includes(b.id));
  const source = pool.length >= 2 ? pool : getBonusPoolForLevel(level); // fallback si tout est déjà pris
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

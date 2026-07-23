/**
 * scryfall.js
 * ----------------------------------------------------------------------
 * Recherche de cartes Commander via l'API publique Scryfall.
 * https://scryfall.com/docs/api
 * ----------------------------------------------------------------------
 */

const Scryfall = {
  _cache: new Map(),

  /**
   * Recherche des cartes légendaires pouvant être Commander, par nom.
   * Retourne un tableau simplifié [{ id, name, imageUrl, colors, manaCost, cmc, typeLine }]
   */
  async searchCommanders(query) {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = query.trim().toLowerCase();
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    // is:commander filtre déjà les cartes légales comme Commander
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent('is:commander ' + query)}&order=name`;

    try {
      const res = await fetch(url);
      if (res.status === 404) {
        // Scryfall renvoie 404 si aucune carte ne correspond
        this._cache.set(cacheKey, []);
        return [];
      }
      if (!res.ok) throw new Error(`Scryfall a répondu ${res.status}`);

      const data = await res.json();
      const results = (data.data || []).slice(0, 12).map(this._simplifyCard);
      this._cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.error('Erreur de recherche Scryfall', err);
      throw err;
    }
  },

  _simplifyCard(card) {
    // Les cartes double-face n'ont pas d'image directe : on prend la face avant
    const image =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      null;

    return {
      id: card.id,
      name: card.name,
      imageUrl: image,
      colors: card.color_identity || [],
      manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
      cmc: card.cmc,
      typeLine: card.type_line,
    };
  },
};

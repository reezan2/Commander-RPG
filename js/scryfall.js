/**
 * scryfall.js — Recherche Commander via l'API Scryfall
 */
const Scryfall = {
  _cache: new Map(),

  async searchCommanders(query) {
    if (!query || query.trim().length < 2) return [];
    const key = query.trim().toLowerCase();
    if (this._cache.has(key)) return this._cache.get(key);

    const q = encodeURIComponent('is:commander name:' + query.trim());
    const url = `https://api.scryfall.com/cards/search?q=${q}&order=name&unique=cards`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (res.status === 404) { this._cache.set(key, []); return []; }
      if (!res.ok) throw new Error('Scryfall ' + res.status);
      const data = await res.json();
      const results = (data.data || []).slice(0, 15).map(this._simplify);
      this._cache.set(key, results);
      return results;
    } catch (err) {
      console.error('Scryfall error', err);
      throw err;
    }
  },

  _simplify(card) {
    const image =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      card.image_uris?.small ||
      null;
    return {
      id: card.id,
      name: card.name,
      imageUrl: image,
      colors: card.color_identity || [],
      manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
      cmc: card.cmc || 0,
      typeLine: card.type_line || '',
    };
  },
};

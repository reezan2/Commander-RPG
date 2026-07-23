/**
 * scryfall.js — Recherche Commander via l'API Scryfall
 * Query : (is:commander OR is:background) + terme libre
 * Fallback : recherche sans filtre commander si 0 résultats
 */
const Scryfall = {
  _cache: new Map(),

  async searchCommanders(query) {
    if (!query || query.trim().length < 2) return [];
    const key = query.trim().toLowerCase();
    if (this._cache.has(key)) return this._cache.get(key);

    // Essai 1 : filtre commander strict
    let results = await this._fetch('is:commander ' + query.trim());

    // Fallback : si aucun résultat, on cherche parmi les légendaires
    if (results.length === 0) {
      results = await this._fetch('is:legendary type:creature ' + query.trim());
    }

    this._cache.set(key, results);
    return results;
  },

  async _fetch(queryStr) {
    const url = 'https://api.scryfall.com/cards/search?q='
      + encodeURIComponent(queryStr)
      + '&order=name&unique=cards';
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).slice(0, 15).map(this._simplify);
    } catch (e) {
      console.warn('Scryfall fetch error', e);
      return [];
    }
  },

  _simplify(card) {
    const image =
      card.image_uris?.normal ||
      card.image_uris?.large ||
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

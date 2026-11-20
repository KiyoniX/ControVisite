// Logique pure : ordre et rang des centres. Aucun accès au DOM.
import { CONFIG } from "./config.js";

const JOUR = 24 * 3600 * 1000;

/**
 * @returns {{ centres, min, max }}
 *   centres : du moins cher au plus cher (à prix égal, le plus proche d'abord), avec `rang`
 */
export function classer(centres) {
  const tries = [...centres].sort((a, b) => a.prix - b.prix || a.distance - b.distance);

  // Rang « sportif » : deux centres au même prix ont le même rang (1, 1, 3…).
  const classes = tries.map((c, i) => ({ ...c, rang: i + 1 }));
  for (let i = 1; i < classes.length; i++) {
    if (classes[i].prix === classes[i - 1].prix) classes[i].rang = classes[i - 1].rang;
  }

  return {
    centres: classes,
    min: classes.length ? classes[0].prix : null,
    max: classes.length ? classes.at(-1).prix : null,
  };
}

export const estAncien = (date, maintenant = new Date()) => !date || maintenant - date > CONFIG.prixAncienJours * JOUR;

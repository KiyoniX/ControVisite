import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../js/config.js";
import { classer, estAncien } from "../js/selection.js";

test("classer : minimum, maximum et rangs", () => {
  const { centres, min, max } = classer([
    { id: "1", prix: 82, distance: 1 },
    { id: "2", prix: 67, distance: 4 },
    { id: "3", prix: 82, distance: 3 },
  ]);
  assert.equal(min, 67);
  assert.equal(max, 82);
  assert.deepEqual(centres.map((c) => [c.id, c.rang]), [["2", 1], ["1", 2], ["3", 2]]);
});

test("classer : aucun centre", () => {
  assert.deepEqual(classer([]), { centres: [], min: null, max: null });
});

test("estAncien : au-delà de CONFIG.prixAncienJours, ou sans date", () => {
  const maintenant = new Date("2026-11-20");
  const ilYa = (jours) => new Date(maintenant - jours * 86400e3);
  assert.equal(estAncien(ilYa(CONFIG.prixAncienJours - 1), maintenant), false);
  assert.equal(estAncien(ilYa(CONFIG.prixAncienJours + 1), maintenant), true);
  assert.equal(estAncien(null, maintenant), true);
});

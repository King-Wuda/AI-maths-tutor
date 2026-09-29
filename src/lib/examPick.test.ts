import test from "node:test";
import assert from "node:assert/strict";
import { pickQuestion } from "./examPick";

const c = [{ id: 1, year: 2020 }, { id: 2, year: 2021 }, { id: 3, year: 2021 }];

test("prefers unseen and unused year", () => {
  // unseen {2,3}, none in unused year → falls to unseen
  const p = pickQuestion(c, new Set([1]), new Set([2021]), () => 0)!;
  assert.ok([2, 3].includes(p.id));
});

test("falls back to seen when everything was seen", () => {
  const p = pickQuestion(c, new Set([1, 2, 3]), new Set(), () => 0)!;
  assert.ok(p);
});

test("empty returns null", () => assert.equal(pickQuestion([], new Set(), new Set()), null));

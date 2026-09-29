import test from "node:test";
import assert from "node:assert/strict";
import { renderText, renderBlocks, hasPlaceholder } from "./render";

test("escapes html and renders inline maths", () => {
  const h = renderText("a <b> $x^2$");
  assert.ok(h.includes("&lt;b&gt;"));
  assert.ok(h.includes("katex"));
});

test("nested subq render", () => {
  const r = renderBlocks([{ type: "subq", label: "4.1", marks: 2, blocks: [{ type: "latex", value: "x" }] }]);
  assert.equal(r[0].type, "subq");
});

test("placeholder detection is recursive", () => {
  assert.equal(hasPlaceholder([{ type: "subq", label: "1", blocks: [{ type: "image", path: null }] }]), true);
  assert.equal(hasPlaceholder([{ type: "image", path: "a.png" }]), false);
});

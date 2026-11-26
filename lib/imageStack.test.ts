import assert from "node:assert/strict";
import test from "node:test";
import { LAYOUT_RANGE, RATIO_VALUE, STACK_LAYOUTS, STACK_RATIOS, parseImageStack, stackLayout } from "./imageStack";

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ src: `/cases/x/${i}.png` }));

test("every composition fits the width, in every proportion and for every count", () => {
  for (const layout of STACK_LAYOUTS) {
    for (const ratio of STACK_RATIOS) {
      for (let n = LAYOUT_RANGE[layout].min; n <= LAYOUT_RANGE[layout].max; n++) {
        for (const mirror of [false, true]) {
          const { height, slots } = stackLayout(layout, n, ratio, mirror);
          assert.equal(slots.length, n, `${layout}/${ratio}/${n}`);
          assert.ok(height > 0 && height <= 78.05, `${layout}/${ratio}/${n} height ${height}`);
          // unrotated frames stay inside the 100 × height box; the rotated ones too, within rounding
          if (layout !== "fan") {
            for (const s of slots) {
              assert.ok(s.x >= -0.01 && s.x + s.w <= 100.01, `${layout}/${ratio}/${n} x ${s.x}+${s.w}`);
              assert.ok(s.y >= -0.01 && s.y + s.w / RATIO_VALUE[ratio] <= height + 0.05, `${layout}/${ratio}/${n} y ${s.y}`);
            }
          }
        }
      }
    }
  }
});

test("the last image of a cascade is in front and further down and right", () => {
  const { slots } = stackLayout("cascade", 3);
  assert.deepEqual(slots.map((s) => s.z), [0, 1, 2]);
  assert.ok(slots[0].x < slots[1].x && slots[1].x < slots[2].x);
  assert.ok(slots[0].y < slots[1].y && slots[1].y < slots[2].y);
});

test("spotlight puts the first image in front of the others", () => {
  const { slots } = stackLayout("spotlight", 3);
  assert.equal(Math.max(...slots.map((s) => s.z)), slots[0].z);
  assert.ok(slots[0].w > slots[1].w);
});

test("fan puts the middle image on top, tilted outward", () => {
  const { slots } = stackLayout("fan", 5);
  assert.equal(slots[2].z, Math.max(...slots.map((s) => s.z)));
  assert.equal(slots[2].rotate, 0);
  assert.ok(slots[0].rotate < 0 && slots[4].rotate > 0);
});

test("mirroring swaps the sides and the tilt", () => {
  const a = stackLayout("cascade", 3), b = stackLayout("cascade", 3, undefined, true);
  assert.ok(a.slots[0].x < 1 && b.slots[0].x + b.slots[0].w > 99);
  const f = stackLayout("fan", 3), g = stackLayout("fan", 3, undefined, true);
  assert.equal(f.slots[0].rotate, -g.slots[0].rotate);
});

test("a count outside a composition's range is brought into it", () => {
  assert.equal(stackLayout("spotlight", 9).slots.length, 3);
  assert.equal(stackLayout("cascade", 1).slots.length, 2);
});

test("parseImageStack keeps the valid images and the choices it knows", () => {
  const stack = parseImageStack({ layout: "spotlight", frame: "browser", mirror: true, ratio: "square", items: [...items(5), { src: "" }, 3, null] });
  assert.ok(stack);
  assert.equal(stack.items.length, 3);
  assert.equal(stack.layout, "spotlight");
  assert.equal(stack.frame, "browser");
  assert.equal(stack.mirror, true);
  assert.equal(stack.ratio, "square");
});

test("parseImageStack needs two images and falls back on unknown choices", () => {
  assert.equal(parseImageStack({ items: items(1) }), null);
  assert.equal(parseImageStack({}), null);
  const stack = parseImageStack({ layout: "nope", frame: "nope", ratio: "nope", background: "custom", color: "red", items: [{ src: "/a.png", focus: "10% 20%" }, { src: "/b.png", focus: "x" }] });
  assert.ok(stack);
  assert.equal(stack.layout, "cascade");
  assert.equal(stack.frame, "card");
  assert.equal(stack.ratio, undefined);
  assert.equal(stack.background, undefined);
  assert.equal(stack.items[0].focus, "10% 20%");
  assert.equal(stack.items[1].focus, undefined);
});

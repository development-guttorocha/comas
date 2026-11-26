// Builds a "gutto-screen-layout" package (exported by the admin, lib/screenDesign/figmaPackage.ts)
// as native Figma layers. Shared by the plugin (code.js) and the agent test.
async function buildScreenLayout(pkg, decodeImage) {
  const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
  const solid = (h) => [{ type: "SOLID", color: hex(h) }];

  // the font: the package's family when this Figma has it, else Inter; the style closest to each weight
  const fonts = await figma.listAvailableFontsAsync();
  const styles = (family) => fonts.filter((f) => f.fontName.family === family).map((f) => f.fontName.style);
  const family = styles(pkg.family).length ? pkg.family : "Inter";
  const available = styles(family);
  const NAMES = { 100: ["Thin"], 200: ["Extra Light", "ExtraLight"], 300: ["Light"], 400: ["Regular", "Normal", "Book"], 500: ["Medium"], 600: ["Semi Bold", "SemiBold", "Semibold", "Demi Bold"], 700: ["Bold"], 800: ["Extra Bold", "ExtraBold"], 900: ["Black", "Heavy"] };
  const styleFor = (w) => {
    const order = [w, w + 100, w - 100, w + 200, w - 200, 400].filter((x) => NAMES[x]);
    for (const k of order) for (const name of NAMES[k]) if (available.includes(name)) return name;
    return available[0] || "Regular";
  };
  const needed = new Set();
  (function walk(n) { if (n.type === "text") needed.add(styleFor(n.weight || 400)); (n.children || []).forEach(walk); })(pkg.root);
  await Promise.all([...needed].map((style) => figma.loadFontAsync({ family, style })));

  let count = 0;
  const make = (n, parent) => {
    let node;
    if (n.type === "text") {
      node = figma.createText();
      node.fontName = { family, style: styleFor(n.weight || 400) };
      node.characters = n.text || "";
      node.fontSize = n.fontSize || 14;
      if (n.fill) node.fills = solid(n.fill);
    } else if (n.type === "frame") {
      node = figma.createFrame();
      node.resize(Math.max(1, n.w), Math.max(1, n.h));
      node.fills = n.fill ? solid(n.fill) : [];
      node.clipsContent = !!n.clip;
    } else {
      node = figma.createRectangle();
      node.resize(Math.max(1, n.w), Math.max(1, n.h));
      if (n.type === "image" && pkg.images[n.image] && decodeImage) {
        const image = figma.createImage(decodeImage(pkg.images[n.image]));
        node.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
      } else node.fills = n.fill ? solid(n.fill) : n.type === "image" ? solid("#d9d9d9") : [];
    }
    node.name = n.name || node.name;
    if (n.radius && "cornerRadius" in node) node.cornerRadius = n.radius;
    if (n.stroke && "strokes" in node) { node.strokes = solid(n.stroke); node.strokeWeight = n.strokeWeight || 1; node.strokeAlign = "INSIDE"; }
    if (parent) parent.appendChild(node);
    node.x = n.x || 0; node.y = n.y || 0;
    count++;
    (n.children || []).forEach((c) => make(c, node));
    return node;
  };

  let maxX = 0;
  for (const c of figma.currentPage.children) maxX = Math.max(maxX, c.x + c.width);
  const root = make(pkg.root, null);
  root.name = pkg.name || root.name;
  root.x = figma.currentPage.children.length > 1 ? maxX + 200 : 0;
  root.y = 0;
  return { root, count, family };
}
figma.showUI(__html__, { width: 340, height: 460, themeColors: true });

// Settings (admin address and key) live in Figma's storage for this plugin, on this computer.
(async () => {
  const settings = (await figma.clientStorage.getAsync("settings")) || {};
  figma.ui.postMessage({ type: "settings", settings, selection: describe() });
})();
function describe() {
  return figma.currentPage.selection.filter((n) => "exportAsync" in n).map((n) => ({ id: n.id, name: n.name, w: Math.round(n.width), h: Math.round(n.height) }));
}
figma.on("selectionchange", () => figma.ui.postMessage({ type: "selection", selection: describe() }));

figma.ui.onmessage = async (msg) => {
  if (msg.type === "save-settings") {
    await figma.clientStorage.setAsync("settings", msg.settings);
    return;
  }
  if (msg.type === "export") {
    // each selected layer, exported at the chosen scale, handed to the UI that sends it
    try {
      const nodes = figma.currentPage.selection.filter((n) => "exportAsync" in n);
      if (!nodes.length) throw new Error("Selecione uma ou mais telas (frames) para enviar.");
      const files = [];
      for (const n of nodes) {
        const format = msg.format === "JPG" ? "JPG" : msg.format === "SVG" ? "SVG" : "PNG";
        const bytes = await n.exportAsync(format === "SVG" ? { format } : { format, constraint: { type: "SCALE", value: msg.scale || 2 } });
        files.push({ name: `${n.name}.${format.toLowerCase()}`, type: format === "SVG" ? "image/svg+xml" : format === "JPG" ? "image/jpeg" : "image/png", bytes });
      }
      figma.ui.postMessage({ type: "exported", files });
    } catch (e) {
      figma.ui.postMessage({ type: "status", text: e.message || String(e), error: true });
    }
    return;
  }
  if (msg.type === "build") {
    // importing a layout package from the admin (Imagem para layout)
    try {
      const { root, count, family } = await buildScreenLayout(msg.pkg, (b64) => figma.base64Decode(b64));
      figma.currentPage.selection = [root];
      figma.viewport.scrollAndZoomIntoView([root]);
      const swapped = family !== msg.pkg.family ? ` (${msg.pkg.family} não está instalada; usei ${family})` : "";
      figma.ui.postMessage({ type: "status", text: `Pronto: ${count} camadas${swapped}.` });
    } catch (e) {
      figma.ui.postMessage({ type: "status", text: `Não consegui montar: ${e.message || e}`, error: true });
    }
  }
};

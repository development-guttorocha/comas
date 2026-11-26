import { setup, render } from "./MovingGradient";

// Canvas host for the verbatim Figma shader module. The supplied setup/render
// exports define all geometry, shading and uniforms.
export function mountMovingGradient(canvas) {
  let cancelled = false;
  let frameId = 0;
  let device, observer, visibility;
  const state = {};
  const controller = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const params = {
    intensity: 4.289999961853027, gradientBalance: 0, material: 0,
    morphSpeed: 3.740000009536743, detail: 1.7799999713897705,
    twist: 0.03999999910593033, zoom: 72, gradientMethod: 0,
    warp: 0.25999999046325684, rotationSpeed: 12,
    gradient: { stops: [
      { position: 0, color: { r: 1, g: .9137254953384399, b: .6196078658103943, a: 1 } },
      { position: .5, color: { r: .5058823823928833, g: .47058823704719543, b: 1, a: 1 } },
      { position: 1, color: { r: 1, g: 0, b: .6078431606292725, a: 1 } },
    ] },
  };
  async function initialize() {
    if (!navigator.gpu) { canvas.dataset.gpu = "unavailable"; return; }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter || cancelled) return;
    device = await adapter.requestDevice();
    if (cancelled) { device.destroy(); return; }
    const context = canvas.getContext("webgpu");
    if (!context) return;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    setup(device, { state });
    let visible = true;
    const draw = time => {
      frameId = 0;
      if (cancelled || !visible || document.hidden) return;
      render(device, { state, output: context.getCurrentTexture(), params, time: reduced.matches ? 0 : time });
      canvas.dataset.gpu = "ready";
      if (!reduced.matches) frameId = requestAnimationFrame(draw);
    };
    const start = () => { if (!frameId && !cancelled) frameId = requestAnimationFrame(draw); };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      start();
    };
    observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else { cancelAnimationFrame(frameId); frameId = 0; }
    }); visibility.observe(canvas);
    document.addEventListener("visibilitychange", start, { signal: controller.signal });
    reduced.addEventListener("change", start, { signal: controller.signal });
    device.lost.then(() => { cancelAnimationFrame(frameId); canvas.dataset.gpu = "unavailable"; });
  }
  initialize().catch(error => { canvas.dataset.gpu = "unavailable"; console.warn("Home shader:", error); });
  return () => {
    cancelled = true; cancelAnimationFrame(frameId); controller.abort();
    observer?.disconnect(); visibility?.disconnect();
    for (const resource of Object.values(state)) {
      if (resource && typeof resource.destroy === "function") resource.destroy();
    }
    device?.destroy();
  };
}

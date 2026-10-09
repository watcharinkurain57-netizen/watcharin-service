export function mountCampusMotion(root, T, onOpen) {
  const disposers = [];
  let disposed = false;
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    disposers.push(() => target.removeEventListener(type, handler, options));
  };
  const observe = (observer, target, options) => {
    observer.observe(target, options);
    disposers.push(() => observer.disconnect());
  };
  const cleanup = () => {
    disposed = true;
    for (const dispose of disposers.reverse()) dispose();
    for (const animation of uiAnimations) animation.cancel();
  };
  const screen = root.querySelector('[data-screen="home"]'),
    page = screen.querySelector(".ww-page");
  const host = page.querySelector(".ww-world"),
    canvas = page.querySelector("canvas"),
    detail = page.querySelector(".ww-detail");
  const catalog = {
    systems: {
      tag: "01 / SERVICENOW · SYSTEMS",
      title: "Systems Lab",
      description: "สำรวจระบบองค์กร สถาปัตยกรรม และการเชื่อมต่อข้อมูล",
    },
    brands: {
      tag: "02 / IDENTITY · APPAREL",
      title: "Brand House",
      description: "พบกับ WANSABYE และ Thai Thrae พร้อมเรื่องราวของแบรนด์",
    },
    media: {
      tag: "03 / 3D · VISUAL STORIES",
      title: "Creative Studio",
      description: "พื้นที่ของภาพ 3D ภาพโฆษณา และเรื่องราวที่กำลังสร้าง",
    },
    web: {
      tag: "04 / WEBSITES · SOFTWARE",
      title: "Digital Garage",
      description: "จากเว็บไซต์และแอป สู่รายละเอียดวิธีออกแบบและพัฒนา",
    },
  };
  const reduceButton = page.querySelector("[data-motion-reduce]"),
    replayButton = page.querySelector("[data-motion-replay]"),
    skipButton = page.querySelector("[data-motion-skip]");
  const status = page.querySelector("[data-motion-status]"),
    openButton = screen.querySelector("[data-open-zone]");
  const osMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let userReduced = false;
  try {
    userReduced = localStorage.getItem("campus:reduce-motion") === "true";
  } catch {}
  let reduced = osMotion.matches || userReduced,
    selected = null,
    hovered = null,
    engine = null;
  const uiAnimations = new Set();
  function animateUI(node, frames, options) {
    if (reduced || document.hidden || !node?.animate) return;
    const animation = node.animate(frames, options);
    uiAnimations.add(animation);
    animation.finished
      .catch(() => {})
      .finally(() => uiAnimations.delete(animation));
  }
  function phase(name, message, progress = 1) {
    page.dataset.motionPhase = name;
    if (message) status.textContent = message;
    page.style.setProperty("--campus-progress", String(progress));
    skipButton.hidden = !["intro", "travel", "opening"].includes(name);
  }
  function updatePreference() {
    reduced = osMotion.matches || userReduced;
    root.dataset.reducedMotion = String(reduced);
    reduceButton.setAttribute("aria-pressed", String(reduced));
    reduceButton.textContent = osMotion.matches
      ? "ลด Motion · ระบบ"
      : "ลด Motion";
    reduceButton.setAttribute("aria-disabled", String(osMotion.matches));
    if (reduced) {
      for (const animation of uiAnimations) animation.cancel();
      engine?.skip();
    }
    engine?.refresh();
    root.dispatchEvent(
      new CustomEvent("campus:motion-preference", { detail: { reduced } }),
    );
  }
  function revealDetails(zone) {
    const item = catalog[zone];
    selected = zone;
    detail.querySelector(".ww-detail-kicker").textContent = item.tag;
    detail.querySelector("h3").textContent = item.title;
    detail.querySelector("p").textContent = item.description;
    openButton.textContent = "เข้าสู่ " + item.title + " ↗";
    for (const button of page.querySelectorAll("[data-zone]"))
      button.setAttribute("aria-pressed", String(button.dataset.zone === zone));
    root.dispatchEvent(new CustomEvent("campus:zone", { detail: { zone } }));
    animateUI(
      detail,
      [
        { opacity: 0.35, transform: "translateY(9px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }
  function openZone(zone) {
    onOpen(zone);
  }
  function choose(zone) {
    if (!catalog[zone]) return;
    if (selected === zone && page.dataset.motionPhase === "selected") {
      requestOpen(zone);
      return;
    }
    revealDetails(zone);
    if (engine) engine.travel(zone);
    else phase("selected", catalog[zone].title + " · พร้อมสำรวจ");
  }
  function requestOpen(zone = selected || "web") {
    if (page.dataset.motionPhase === "opening") return;
    if (selected !== zone) revealDetails(zone);
    if (engine) engine.open(zone);
    else openZone(zone);
  }
  function hover(zone) {
    hovered = zone;
    for (const button of page.querySelectorAll("[data-zone]"))
      button.dataset.hovered = String(button.dataset.zone === zone);
    engine?.refresh();
  }
  for (const button of page.querySelectorAll("[data-zone]")) {
    listen(button, "click", () => choose(button.dataset.zone));
    listen(button, "pointerenter", () => {
      if (matchMedia("(hover:hover)").matches) hover(button.dataset.zone);
    });
    listen(button, "pointerleave", () => hover(null));
    listen(button, "focus", () => hover(button.dataset.zone));
    listen(button, "blur", () => hover(null));
  }
  // Own this action before the legacy navigation handler: selection → journey → zone.
  listen(
    openButton,
    "click",
    (event) => {
      event.stopImmediatePropagation();
      requestOpen();
    },
    true,
  );
  listen(reduceButton, "click", () => {
    if (osMotion.matches) return;
    userReduced = !userReduced;
    try {
      localStorage.setItem("campus:reduce-motion", String(userReduced));
    } catch {}
    updatePreference();
  });
  listen(osMotion, "change", updatePreference);
  listen(skipButton, "click", () => engine?.skip());
  listen(replayButton, "click", () => engine?.intro());
  listen(root, "campus:motion-preference", (event) => {
    reduced = Boolean(event.detail.reduced);
    userReduced = reduced && !osMotion.matches;
    reduceButton.setAttribute("aria-pressed", String(reduced));
    if (reduced) {
      for (const animation of uiAnimations) animation.cancel();
      engine?.skip();
    }
    engine?.refresh();
  });
  updatePreference();
  phase("ready", "เลือกอาคารเพื่อเริ่มสำรวจ");
  function fallback() {
    engine = null;
    canvas.hidden = true;
    page.dataset.ready = "false";
    page.dataset.renderActive = "false";
    replayButton.disabled = true;
    skipButton.hidden = true;
    page.querySelector(".ww-drive").hidden = true;
    detail.querySelector("p").textContent =
      "เลือกโซนจากแผนที่ แล้วเปิดเรื่องราวและผลงานแต่ละด้าน";
    openButton.textContent = "เริ่มสำรวจ Digital Garage ↗";
    phase("fallback", "เลือกโซนจากแผนที่เพื่อสำรวจ");
  }
  if (
    new URLSearchParams(location.search).get("scene") === "poster" ||
    navigator.connection?.saveData
  ) {
    fallback();
    return cleanup;
  }
  try {
    const kind = "campus",
      accent = "#d17b4c";
    const renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    // Geometry retained from the approved Creative Campus concept.
    const scene = new T.Scene(),
      camera = new T.OrthographicCamera(-12, 12, 9, -9, 0.1, 150),
      world = new T.Group();
    scene.add(world);
    const ambient = new T.HemisphereLight(0xffffff, 0x484457, 2.4);
    scene.add(ambient);
    const light = new T.DirectionalLight(0xfff6e5, 3);
    light.position.set(-10, 17, 12);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -15;
    light.shadow.camera.right = 15;
    light.shadow.camera.top = 15;
    light.shadow.camera.bottom = -15;
    light.shadow.normalBias = 0.025;
    scene.add(light);
    const materials = {};
    function resolved(name) {
      const probe = document.createElement("span");
      probe.style.color = `var(--ww-${name})`;
      page.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }
    for (const name of [
      "ground",
      "edge",
      "road",
      "building",
      "accent",
      "tree",
      "window",
      "ink",
      "panel",
    ])
      materials[name] = new T.MeshStandardMaterial({
        color: name === "accent" ? accent : resolved(name),
        roughness: 0.78,
        metalness: name === "window" ? 0.25 : 0,
      });
    const pale = new T.MeshStandardMaterial({
        color: 0xe4dcbd,
        roughness: 0.8,
      }),
      dark = new T.MeshStandardMaterial({ color: 0x303340, roughness: 0.7 }),
      rubber = new T.MeshStandardMaterial({ color: 0x232936, roughness: 0.92 }),
      glass = new T.MeshStandardMaterial({
        color: 0x9db9c4,
        roughness: 0.24,
        metalness: 0.35,
      });
    function mesh(geometry, material, parent = world, x = 0, y = 0, z = 0) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    }
    function box(w, h, d, m, parent, x, y, z) {
      return mesh(new T.BoxGeometry(w, h, d), m, parent, x, y, z);
    }
    function cylinder(r1, r2, h, m, parent, x, y, z, n = 16) {
      return mesh(new T.CylinderGeometry(r1, r2, h, n), m, parent, x, y, z);
    }
    function group(x, y, z) {
      const g = new T.Group();
      g.position.set(x, y, z);
      world.add(g);
      return g;
    }
    function sign(word) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 192;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#303340";
      ctx.fillRect(0, 0, 512, 192);
      ctx.fillStyle = "#f5efd9";
      ctx.font = "600 68px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, 256, 98);
      const texture = new T.CanvasTexture(c);
      texture.colorSpace = T.SRGBColorSpace;
      return new T.MeshBasicMaterial({ map: texture });
    }
    const positions =
      kind === "campus"
        ? {
            systems: [-4.1, -2.5],
            brands: [3.6, -2.7],
            media: [-4, 3],
            web: [3.7, 3],
          }
        : {
            systems: [-3.6, -2.8],
            brands: [3.8, -2.5],
            media: [-3.5, 3.3],
            web: [4, 3.1],
          };
    if (kind === "campus") {
      box(15, 0.75, 12, materials.edge, world, 0, -0.55, 0);
      box(15, 0.15, 12, materials.ground, world, 0, -0.1, 0);
      box(1.7, 0.035, 11.8, materials.road, world, 0, 0.012, 0);
      box(14.8, 0.035, 1.4, materials.road, world, 0, 0.02, 0.25);
      for (let i = -5; i < 6; i += 1.4)
        box(0.1, 0.015, 0.55, pale, world, 0, 0.05, i);
      for (let i = -6; i < 7; i += 1.4)
        box(0.55, 0.015, 0.1, pale, world, i, 0.06, 0.25);
      cylinder(1.6, 1.6, 0.1, materials.building, world, 0, 0.09, 0.3, 32);
    } else {
      for (const pos of Object.values(positions)) {
        const g = group(pos[0], -0.1, pos[1]);
        cylinder(2, 1.65, 0.5, materials.edge, g, 0, -0.5, 0, 32);
        cylinder(2, 2, 0.1, materials.ground, g, 0, -0.21, 0, 32);
      }
      cylinder(1.6, 1.35, 0.5, materials.edge, world, 0, -0.28, 0.15, 32);
      cylinder(1.6, 1.6, 0.1, materials.ground, world, 0, 0.02, 0.15, 32);
      const ring = mesh(
        new T.TorusGeometry(1.05, 0.18, 12, 48),
        materials.accent,
        world,
        0,
        1.65,
        0.15,
      );
      ring.rotation.y = -0.45;
      const emblem = box(
        0.92,
        0.72,
        0.16,
        materials.panel,
        world,
        0,
        1.64,
        0.28,
      );
      emblem.rotation.y = -0.45;
      const face = mesh(
        new T.PlaneGeometry(0.84, 0.6),
        sign("W"),
        world,
        0,
        1.64,
        0.38,
      );
      face.rotation.y = -0.45;
      const points = [];
      for (let i = 0; i < 45; i++) {
        const a = i * 2.39996,
          r = 7 + ((i * 7) % 11) * 0.55;
        points.push(
          Math.cos(a) * r,
          ((i * 3) % 13) * 0.22 - 1,
          Math.sin(a) * r,
        );
      }
      const starsGeo = new T.BufferGeometry();
      starsGeo.setAttribute(
        "position",
        new T.Float32BufferAttribute(points, 3),
      );
      scene.add(
        new T.Points(
          starsGeo,
          new T.PointsMaterial({
            color: materials.accent.color,
            size: 0.055,
            transparent: true,
            opacity: 0.65,
          }),
        ),
      );
    }
    const buildings = {};
    let sculpture;
    for (const [name, [x, z]] of Object.entries(positions)) {
      const g = group(x, kind === "campus" ? 0 : -0.1, z);
      buildings[name] = g;
      g.userData.zone = name;
      if (name === "systems") {
        box(2.6, 1.7, 2, materials.building, g, 0, 0.85, 0);
        box(2.85, 0.2, 2.25, materials.accent, g, 0, 1.8, 0);
        for (let i = -0.85; i < 1; i += 0.6) {
          box(0.35, 0.53, 0.05, glass, g, i, 1.15, 1.03);
          box(0.35, 0.4, 0.05, materials.window, g, i, 0.5, 1.03);
        }
        box(0.7, 1.35, 0.06, dark, g, 0.65, 0.675, 1.045);
        cylinder(0.45, 0.45, 1.9, materials.window, g, -1.65, 0.95, -0.4);
        cylinder(0.49, 0.49, 0.12, materials.building, g, -1.65, 1.91, -0.4);
        cylinder(0.12, 0.12, 2.7, materials.edge, g, 0.55, 1.8, -0.55);
        box(1.3, 0.26, 0.03, sign("SYSTEMS"), g, 0, 1.81, 1.15);
        box(1, 0.16, 0.7, materials.road, g, 1.8, 0.1, 0.7);
        for (let i = 0; i < 3; i++)
          box(0.15, 0.34, 0.34, materials.accent, g, 1.55 + i * 0.25, 0.3, 0.7);
      } else if (name === "brands") {
        box(2.7, 1.4, 2.25, materials.building, g, 0, 0.7, 0);
        box(2.95, 0.2, 2.45, materials.accent, g, 0, 1.5, 0);
        box(1.85, 0.9, 0.05, glass, g, -0.1, 0.67, 1.14);
        box(0.38, 1.1, 0.07, dark, g, 1.06, 0.55, 1.16);
        for (let i = 0; i < 8; i++)
          box(
            0.37,
            0.15,
            0.8,
            i % 2 ? materials.building : materials.accent,
            g,
            -1.29 + i * 0.37,
            1.2,
            1.4,
          );
        box(2, 0.44, 0.05, sign("BRAND HOUSE"), g, 0, 1.9, 1.1);
        cylinder(0.5, 0.5, 0.12, materials.accent, g, -1.35, 0.6, 2);
        cylinder(0.07, 0.07, 0.6, materials.edge, g, -1.35, 0.3, 2);
        for (const off of [-0.45, 0.5])
          box(0.28, 0.3, 0.28, materials.tree, g, -1.35 + off, 0.15, 1.85);
      } else if (name === "media") {
        cylinder(1.28, 1.28, 0.18, materials.building, g, 0, 0.1, 0, 32);
        const shape = mesh(
          new T.TorusKnotGeometry(0.6, 0.19, 72, 10, 2, 3),
          materials.accent,
          g,
          0,
          1.25,
          0,
        );
        shape.rotation.set(0.4, 0.4, 0.2);
        sculpture = shape;
        box(1, 0.65, 0.7, dark, g, -1.5, 0.92, 0.8);
        const lens = cylinder(
          0.3,
          0.3,
          0.52,
          materials.window,
          g,
          -1.5,
          0.95,
          1.35,
        );
        lens.rotation.x = Math.PI / 2;
        for (const dx of [-0.3, 0.3]) {
          const leg = box(
            0.06,
            1.1,
            0.06,
            materials.edge,
            g,
            -1.5 + dx,
            0.46,
            0.8,
          );
          leg.rotation.z = dx > 0 ? -0.3 : 0.3;
        }
        box(1.9, 0.7, 0.09, dark, g, 0.1, 1.9, -1.15);
        mesh(
          new T.PlaneGeometry(1.7, 0.48),
          sign("CREATIVE"),
          g,
          0.1,
          1.9,
          -1.09,
        );
        box(0.08, 1.6, 0.08, materials.edge, g, -0.6, 0.85, -1.15);
        box(0.08, 1.6, 0.08, materials.edge, g, 0.8, 0.85, -1.15);
      } else {
        box(2.75, 0.18, 1.8, materials.window, g, 0, 0.15, 0.1);
        const screen = box(2.3, 1.55, 0.14, dark, g, 0, 1.03, -0.65);
        screen.rotation.x = -0.13;
        box(2.03, 1.27, 0.035, materials.accent, g, 0, 1.03, -0.54);
        for (let i = 0; i < 4; i++)
          box(
            1.35 - i * 0.17,
            0.045,
            0.035,
            materials.building,
            g,
            -0.13,
            1.42 - i * 0.22,
            -0.51,
          );
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 8; col++)
            box(
              0.18,
              0.025,
              0.15,
              dark,
              g,
              -0.84 + col * 0.24,
              0.26,
              -0.08 + row * 0.24,
            );
        box(0.67, 1.4, 0.65, materials.building, g, 1.86, 0.72, -0.15);
        for (let i = 0; i < 3; i++) {
          box(
            0.47,
            0.04,
            0.04,
            materials.window,
            g,
            1.85,
            0.37 + i * 0.34,
            0.19,
          );
          cylinder(
            0.055,
            0.055,
            0.045,
            materials.accent,
            g,
            2,
            0.39 + i * 0.34,
            0.235,
          ).rotation.x = Math.PI / 2;
        }
      }
    }
    function tree(x, z, scale = 1) {
      const g = group(x, 0, z);
      g.scale.setScalar(scale);
      cylinder(0.12, 0.12, 0.8, materials.edge, g, 0, 0.4, 0, 8);
      cylinder(0, 0.67, 1.3, materials.tree, g, 0, 1.17, 0, 7);
      cylinder(0, 0.53, 1, materials.tree, g, 0, 1.85, 0, 7);
    }
    if (kind === "campus") {
      for (const [x, z, s] of [
        [-6.45, -4.5, 1.1],
        [-2.2, -4.7, 0.8],
        [6, -4.7, 1.2],
        [6.5, 4.7, 0.8],
        [-6.6, 4.8, 0.7],
        [1.8, 5, 0.65],
        [-6.5, 0, 1],
      ])
        tree(x, z, s);
      for (let i = 0; i < 4; i++) {
        box(0.8, 0.25, 0.35, materials.edge, world, 1.5 + i * 0.3, 0.15, 4.95);
      }
    }
    const car = group(0, 0.18, 0.35);
    box(0.75, 0.25, 1.16, materials.accent, car, 0, 0.23, 0);
    box(0.58, 0.27, 0.56, materials.building, car, 0, 0.48, -0.06);
    box(0.5, 0.2, 0.045, glass, car, 0, 0.48, 0.245);
    const wheels = [];
    for (const x of [-0.41, 0.41])
      for (const z of [-0.37, 0.4]) {
        const wheel = cylinder(0.19, 0.19, 0.16, rubber, car, x, 0.16, z, 12);
        wheel.rotation.z = Math.PI / 2;
        wheels.push(wheel);
      }
    for (const x of [-0.24, 0.24])
      box(0.14, 0.1, 0.03, pale, car, x, 0.24, 0.594);
    if (kind === "floating") {
      car.visible = false;
    }

    const rings = {};
    for (const [zone, [x, z]] of Object.entries(positions)) {
      const ring = new T.Mesh(
        new T.RingGeometry(1.65, 1.71, 64),
        new T.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.09, z);
      ring.userData.amount = 0;
      world.add(ring);
      rings[zone] = ring;
    }
    const routeLine = new T.Line(
      new T.BufferGeometry(),
      new T.LineDashedMaterial({
        color: accent,
        dashSize: 0.18,
        gapSize: 0.16,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    world.add(routeLine);
    routeLine.visible = false;
    const view = { azimuth: Math.PI / 9, elevation: 43, zoom: 1, x: 0, z: 0 };
    let width = 0,
      height = 0,
      compact = false,
      frameID = 0,
      lastTick = 0,
      track = null,
      inView = true,
      introPlayed = false;
    const parallax = { x: 0, z: 0, targetX: 0, targetZ: 0 };
    let renderCount = 0,
      openAfter = false;
    const smooth = (t) => t * t * (3 - 2 * t),
      out = (t) => 1 - Math.pow(1 - t, 3),
      lerp = (a, b, t) => a + (b - a) * t;
    const overview = {
      azimuth: Math.PI / 9,
      elevation: 43,
      zoom: 1,
      x: 0,
      z: 0,
    };
    function visible() {
      return (
        !disposed &&
        !document.hidden &&
        !screen.hidden &&
        inView &&
        host.clientWidth > 0
      );
    }
    function poseFor(zone, opening = false) {
      const [x, z] = positions[zone];
      return {
        azimuth: Math.PI / 9 + (x < 0 ? -0.045 : 0.045),
        elevation: opening ? 39 : 43,
        zoom: opening ? (compact ? 1.55 : 1.7) : compact ? 1.045 : 1.12,
        x: x * (opening ? 0.82 : 0.12),
        z: z * (opening ? 0.82 : 0.12),
      };
    }
    function interpolateView(from, to, t) {
      for (const key of Object.keys(view))
        view[key] = lerp(from[key], to[key], t);
    }
    function layout() {
      const w = host.clientWidth,
        h = Math.max(
          1,
          host.clientHeight - (page.clientWidth <= 520 ? 100 : 0),
        );
      if (!w || !host.clientHeight) return false;
      compact = page.clientWidth <= 520;
      if (w !== width || h !== height) {
        width = w;
        height = h;
        renderer.setSize(w, h, false);
        canvas.style.height = h + "px";
        renderer.shadowMap.autoUpdate = true;
      }
      const ratio = width / height,
        span = Math.max(compact ? 5.2 : 7.2, 8.8 / ratio);
      camera.left = -span * ratio;
      camera.right = span * ratio;
      camera.top = span;
      camera.bottom = -span;
      return true;
    }
    function draw() {
      if (!visible() || !layout()) return;
      const rad = (view.elevation * Math.PI) / 180,
        ax = view.azimuth + parallax.x * 0.022;
      const target = new T.Vector3(
        view.x + parallax.x * 0.14,
        0.35,
        view.z + parallax.z * 0.1,
      );
      camera.position.set(
        target.x + Math.sin(ax) * 25 * Math.cos(rad),
        25 * Math.sin(rad),
        target.z + Math.cos(ax) * 25 * Math.cos(rad),
      );
      camera.zoom = view.zoom;
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      page.dataset.ready = "true";
      page.dataset.renderCount = String(++renderCount);
      page.dataset.cameraZoom = view.zoom.toFixed(3);
      page.dataset.carPosition =
        car.position.x.toFixed(2) + "," + car.position.z.toFixed(2);
      for (const button of page.querySelectorAll(".ww-zone")) {
        const p = positions[button.dataset.zone],
          point = new T.Vector3(p[0], 2.7, p[1]).project(camera);
        button.style.left =
          Math.max(
            button.offsetWidth / 2 + 12,
            Math.min(
              width - button.offsetWidth / 2 - 12,
              ((point.x + 1) * width) / 2,
            ),
          ) + "px";
        button.style.top =
          Math.max(28, Math.min(height - 30, ((1 - point.y) * height) / 2)) +
          "px";
      }
    }
    function requestFrame() {
      if (frameID || !visible()) return;
      page.dataset.renderActive = "true";
      frameID = requestAnimationFrame(tick);
    }
    function tick(now) {
      frameID = 0;
      if (!visible()) {
        lastTick = 0;
        page.dataset.renderActive = "false";
        return;
      }
      const dt = lastTick ? Math.min(now - lastTick, 48) : 16;
      lastTick = now;
      let moving = false;
      if (track) {
        const current = track;
        current.elapsed += dt;
        const t = Math.min(current.elapsed / current.duration, 1);
        current.update(t);
        moving = t < 1;
        if (t === 1 && track === current) {
          track = null;
          current.finish?.();
        }
      }
      for (const [zone, g] of Object.entries(buildings)) {
        const amount = reduced
          ? 0
          : hovered === zone
            ? 1
            : selected === zone
              ? 0.55
              : 0;
        const target = amount * 0.24,
          difference = target - g.position.y;
        if (page.dataset.motionPhase !== "intro") {
          g.position.y = reduced
            ? 0
            : g.position.y + difference * Math.min(dt / 95, 1);
          if (Math.abs(difference) > 0.001) moving = true;
        }
        const ring = rings[zone],
          targetOpacity =
            zone === selected ? 0.72 : zone === hovered ? 0.38 : 0;
        ring.material.opacity = lerp(
          ring.material.opacity,
          targetOpacity,
          Math.min(dt / 110, 1),
        );
        if (Math.abs(ring.material.opacity - targetOpacity) > 0.001)
          moving = true;
        ring.scale.setScalar(1 + g.position.y * 0.25);
      }
      const sculptureTarget =
        0.4 +
        (reduced
          ? 0
          : hovered === "media"
            ? 0.7
            : selected === "media"
              ? 0.3
              : 0);
      sculpture.rotation.y = lerp(
        sculpture.rotation.y,
        sculptureTarget,
        Math.min(dt / 170, 1),
      );
      if (Math.abs(sculpture.rotation.y - sculptureTarget) > 0.001)
        moving = true;
      for (const axis of ["x", "z"]) {
        const target = reduced
          ? 0
          : parallax[axis === "x" ? "targetX" : "targetZ"];
        parallax[axis] = lerp(parallax[axis], target, Math.min(dt / 140, 1));
        if (Math.abs(parallax[axis] - target) > 0.001) moving = true;
      }
      draw();
      if (track || moving) requestFrame();
      else {
        lastTick = 0;
        page.dataset.renderActive = "false";
      }
    }
    function run(duration, update, finish) {
      track = { duration, elapsed: 0, update, finish };
      lastTick = 0;
      if (reduced) {
        update(1);
        track = null;
        finish?.();
        draw();
        return;
      }
      requestFrame();
    }
    function clearTrack() {
      track = null;
      cancelAnimationFrame(frameID);
      frameID = 0;
      lastTick = 0;
      openAfter = false;
      routeLine.visible = false;
      page.dataset.renderActive = "false";
    }
    function settled() {
      routeLine.visible = false;
      car.rotation.z = 0;
      phase(
        selected ? "selected" : "ready",
        selected
          ? catalog[selected].title + " · พร้อมสำรวจ"
          : "เลือกอาคารเพื่อเริ่มสำรวจ",
      );
      if (!selected && !page.dataset.captured) {
        draw();
        page.querySelector(".ww-fallback img").src =
          canvas.toDataURL("image/png");
        page.dataset.captured = "true";
      }
      if (openAfter) {
        openAfter = false;
        enter(selected);
      }
    }
    function routeTo(x, z) {
      // Go back to the cross road before changing streets. Never cut across buildings.
      const points = [
        car.position.clone(),
        new T.Vector3(car.position.x, 0.18, 0.25),
        new T.Vector3(x, 0.18, 0.25),
        new T.Vector3(x, 0.18, z),
      ];
      const segments = points
        .slice(1)
        .map((to, i) => ({
          from: points[i],
          to,
          length: to.distanceTo(points[i]),
        }))
        .filter((s) => s.length > 0.001);
      return {
        points,
        segments,
        total: segments.reduce((sum, s) => sum + s.length, 0),
      };
    }
    function pathPoint(route, t) {
      let remaining = t * route.total,
        segment = route.segments.at(-1);
      if (!segment) return;
      for (const [index, next] of route.segments.entries()) {
        segment = next;
        if (remaining <= next.length || index === route.segments.length - 1)
          break;
        remaining -= next.length;
      }
      const u = Math.max(0, Math.min(remaining / segment.length, 1)),
        previous = car.position.clone();
      car.position.lerpVectors(segment.from, segment.to, u);
      const angle = Math.atan2(
        segment.to.x - segment.from.x,
        segment.to.z - segment.from.z,
      );
      // Shortest turn avoids a full rotation when crossing ±PI.
      car.rotation.y +=
        Math.atan2(
          Math.sin(angle - car.rotation.y),
          Math.cos(angle - car.rotation.y),
        ) * 0.25;
      const distance = previous.distanceTo(car.position);
      for (const wheel of wheels) wheel.rotateY(-distance / 0.19);
      car.rotation.z = Math.sin(u * Math.PI) * 0.035;
    }
    function travel(zone) {
      clearTrack();
      introPlayed = true;
      Object.values(buildings).forEach((g) => g.scale.setScalar(1));
      const [x, z] = positions[zone],
        route = routeTo(x, z + (z < 0.25 ? 1.8 : -1.8)),
        from = { ...view },
        to = poseFor(zone);
      routeLine.geometry.dispose();
      routeLine.geometry = new T.BufferGeometry().setFromPoints(
        route.points.map((p) => new T.Vector3(p.x, 0.095, p.z)),
      );
      routeLine.computeLineDistances();
      routeLine.visible = !reduced;
      phase("travel", "กำลังไป " + catalog[zone].title, 0);
      run(
        Math.min(1450, Math.max(800, route.total * 115)),
        (t) => {
          pathPoint(route, smooth(t));
          interpolateView(from, to, out(t));
          page.style.setProperty("--campus-progress", String(t));
        },
        settled,
      );
    }
    function enter(zone) {
      const from = { ...view },
        to = poseFor(zone, true);
      phase("opening", "เข้าสู่ " + catalog[zone].title, 1);
      run(
        420,
        (t) => interpolateView(from, to, smooth(t)),
        () => {
          openZone(zone);
        },
      );
    }
    function intro() {
      clearTrack();
      introPlayed = true;
      selected = null;
      hover(null);
      for (const button of page.querySelectorAll("[data-zone]"))
        button.setAttribute("aria-pressed", "false");
      detail.querySelector(".ww-detail-kicker").textContent =
        "WELCOME TO MY WORLD";
      detail.querySelector("h3").textContent = "Watcharin World";
      detail.querySelector("p").textContent =
        "เลือกอาคาร แล้วพาเจ้ารถคันเล็กไปสำรวจสิ่งที่ผมสร้าง";
      openButton.textContent = "เริ่มสำรวจ Digital Garage ↗";
      car.position.set(0, 0.18, 0.35);
      car.rotation.set(0, 0, 0);
      parallax.x = parallax.z = parallax.targetX = parallax.targetZ = 0;
      phase("intro", "ยินดีต้อนรับสู่ Creative Campus", 0);
      const from = {
        azimuth: Math.PI / 9 - 0.3,
        elevation: 52,
        zoom: 0.82,
        x: 0,
        z: 0,
      };
      Object.assign(view, from);
      animateUI(
        page.querySelector(".ww-intro"),
        [
          { opacity: 0, transform: "translateY(14px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      run(
        1750,
        (t) => {
          interpolateView(from, overview, out(t));
          Object.values(buildings).forEach((g, i) => {
            const p = reduced
              ? 1
              : Math.min(1, Math.max(0, (t - i * 0.08) / 0.55));
            g.scale.setScalar(0.78 + 0.22 * out(p));
            g.position.y = -1.1 * (1 - out(p));
          });
          page.style.setProperty("--campus-progress", String(t));
        },
        () => {
          Object.values(buildings).forEach((g) => {
            g.scale.setScalar(1);
            g.position.y = 0;
          });
          settled();
        },
      );
    }
    engine = {
      travel,
      intro,
      refresh: requestFrame,
      skip() {
        if (track) {
          const current = track;
          track = null;
          current.update(1);
          current.finish?.();
        }
        requestFrame();
      },
      open(zone) {
        if (selected !== zone) revealDetails(zone);
        if (reduced) {
          clearTrack();
          openZone(zone);
          return;
        }
        if (page.dataset.motionPhase === "travel") {
          openAfter = true;
          return;
        }
        if (
          page.dataset.motionPhase === "intro" ||
          car.position.distanceTo(
            new T.Vector3(
              positions[zone][0],
              0.18,
              positions[zone][1] + (positions[zone][1] < 0.25 ? 1.8 : -1.8),
            ),
          ) > 0.01
        ) {
          travel(zone);
          openAfter = true;
        } else enter(zone);
      },
    };
    function visibilityChanged() {
      if (!visible()) {
        cancelAnimationFrame(frameID);
        frameID = 0;
        lastTick = 0;
        page.dataset.renderActive = "false";
      } else {
        draw();
        if (!introPlayed) intro();
        else requestFrame();
      }
    }
    listen(document, "visibilitychange", visibilityChanged);
    observe(
      new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          visibilityChanged();
        },
        { threshold: 0 },
      ),
      host,
    );
    observe(
      new ResizeObserver(() => {
        draw();
        if (!introPlayed && visible()) intro();
      }),
      host,
    );
    observe(
      new MutationObserver(() => {
        if (screen.hidden) {
          if (page.dataset.motionPhase === "intro") introPlayed = false;
          clearTrack();
          Object.assign(view, selected ? poseFor(selected) : overview);
          phase(
            selected ? "selected" : "ready",
            selected
              ? catalog[selected].title + " · พร้อมสำรวจ"
              : "เลือกอาคารเพื่อเริ่มสำรวจ",
          );
        } else visibilityChanged();
      }),
      screen,
      { attributes: true, attributeFilter: ["hidden"] },
    );
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    function hitZone(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Object.values(buildings), true);
      let object = hits[0]?.object;
      while (object && !object.userData.zone) object = object.parent;
      return object?.userData.zone || null;
    }
    listen(canvas, "click", (event) => {
      const zone = hitZone(event);
      if (zone) choose(zone);
    });
    listen(canvas, "pointermove", (event) => {
      if (!matchMedia("(hover:hover)").matches || compact || reduced || track)
        return;
      const rect = canvas.getBoundingClientRect();
      parallax.targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      parallax.targetZ = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      hover(hitZone(event));
      canvas.style.cursor = hovered ? "pointer" : "default";
      requestFrame();
    });
    listen(canvas, "pointerleave", () => {
      parallax.targetX = parallax.targetZ = 0;
      hover(null);
      requestFrame();
    });
    function drive(dir) {
      if (page.dataset.motionPhase === "opening") return;
      clearTrack();
      introPlayed = true;
      const from = car.position.clone(),
        to = from.clone();
      // Arrow exploration stays on the public cross road, rather than entering a building.
      if (dir === "left" || dir === "right") {
        to.z = 0.25;
        to.x = T.MathUtils.clamp(
          from.x + (dir === "left" ? -0.8 : 0.8),
          -6.3,
          6.3,
        );
      } else {
        to.x = 0;
        to.z = T.MathUtils.clamp(
          from.z + (dir === "up" ? -0.8 : 0.8),
          -5.2,
          5.2,
        );
      }
      const route = routeTo(to.x, to.z),
        viewFrom = { ...view };
      phase("drive", "ขับสำรวจแคมปัส");
      run(
        Math.max(380, route.total * 105),
        (t) => {
          pathPoint(route, smooth(t));
          interpolateView(viewFrom, overview, out(t));
        },
        settled,
      );
    }
    for (const button of page.querySelectorAll("[data-drive]"))
      listen(button, "click", () => drive(button.dataset.drive));
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "แคมปัส 3D ใช้ปุ่มลูกศรขับสำรวจ หรือเลือกโซนจากปุ่มชื่ออาคาร",
    );
    listen(canvas, "keydown", (event) => {
      const dirs = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (dirs[event.key]) {
        event.preventDefault();
        drive(dirs[event.key]);
      } else if (event.key === "Escape") engine.skip();
    });
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      clearTrack();
      fallback();
    });
    disposers.push(() => {
      clearTrack();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (!material) continue;
          materials.add(material);
          for (const value of Object.values(material))
            if (value?.isTexture) textures.add(value);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      renderer.dispose();
    });
    draw();
  } catch (error) {
    page.dataset.motionError = error.message;
    fallback();
  }
  return cleanup;
}

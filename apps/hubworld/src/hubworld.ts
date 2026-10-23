import {
  Application,
  Color,
  Entity,
  FILLMODE_FILL_WINDOW,
  FOG_LINEAR,
  Mouse,
  type MouseEvent,
  RESOLUTION_AUTO,
  SHADOW_PCF3_32F,
  StandardMaterial,
  TouchDevice,
  type TouchEvent,
  Vec3,
} from "playcanvas";
import { createAvatar } from "./avatar";
import { CameraFollow } from "./camera-follow";
import { createInventory, screenToGround } from "./inventory";
import { type Island, loadIsland } from "./island";
import { connectMultiplayer } from "./multiplayer";
import { PlayerController } from "./player-controller";

const SKY = new Color().fromString("#8fd3f4");

function material(hex: string): StandardMaterial {
  const mat = new StandardMaterial();
  mat.diffuse = new Color().fromString(hex);
  mat.update();
  return mat;
}

export function createHubWorld(canvas: HTMLCanvasElement) {
  const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
  });
  app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  const onResize = () => app.resizeCanvas();
  window.addEventListener("resize", onResize);

  app.scene.ambientLight = new Color(0.55, 0.6, 0.7);
  app.scene.fog.type = FOG_LINEAR;
  app.scene.fog.color = SKY;
  app.scene.fog.start = 60;
  app.scene.fog.end = 140;

  const sun = new Entity("sun");
  sun.addComponent("light", {
    type: "directional",
    color: new Color(1, 0.96, 0.88),
    intensity: 1.1,
    castShadows: true,
    shadowType: SHADOW_PCF3_32F,
    shadowDistance: 90,
    shadowResolution: 2048,
    shadowBias: 0.3,
    normalOffsetBias: 0.05,
  });
  sun.setEulerAngles(50, 30, 0);
  app.root.addChild(sun);

  app.start();

  let teardown: (() => void) | null = null;
  let destroyed = false;
  loadIsland(app)
    .then((island) => {
      if (!destroyed) teardown = populate(app, canvas, island);
    })
    .catch((err) => console.error("Failed to load the hub island", err));

  return {
    app,
    destroy() {
      destroyed = true;
      teardown?.();
      window.removeEventListener("resize", onResize);
      app.destroy();
    },
  };
}

/** Adds the player, camera and interaction once the island has loaded. */
function populate(app: Application, canvas: HTMLCanvasElement, island: Island) {
  const { ground, obstacles, noBuildZones } = island;

  const { root: player, body } = createAvatar("player", "#ffb347");
  app.root.addChild(player);
  player.setPosition(0, 0, 12);
  player.addComponent("script");
  const controller = player.script?.create(PlayerController);
  if (!(controller instanceof PlayerController))
    throw new Error("PlayerController failed to start");
  controller.obstacles = obstacles;
  controller.ground = ground;
  controller.body = body;

  const multiplayer = connectMultiplayer(app, player, () => controller.heading);

  const camera = new Entity("camera");
  camera.addComponent("camera", {
    clearColor: SKY,
    fov: 35,
    nearClip: 1,
    farClip: 300,
  });
  camera.addComponent("script");
  app.root.addChild(camera);
  const follow = camera.script?.create(CameraFollow, {
    properties: { target: player },
  });
  if (!(follow instanceof CameraFollow))
    throw new Error("CameraFollow failed to start");

  const inventory = createInventory({
    app,
    camera,
    player,
    getHeading: () => controller.heading,
    ground,
    obstacles,
    noBuildZones,
  });

  // Ring that marks where the player was sent; shrinks away over time.
  const marker = new Entity("marker");
  marker.addComponent("render", {
    type: "torus",
    material: material("#ffffff"),
    castShadows: false,
  });
  marker.enabled = false;
  app.root.addChild(marker);
  let markerLife = 0;

  const hit = new Vec3();
  const moveTo = (x: number, y: number) => {
    if (inventory.pointerDown(x, y)) return;
    if (!screenToGround(camera, ground, x, y, hit)) return;
    controller.setTarget(hit);
    marker.setPosition(hit.x, hit.y + 0.1, hit.z);
    marker.enabled = true;
    markerLife = 1;
  };

  // Mouse events arrive from the whole window; ignore presses on the HUD.
  const onCanvas = (e: MouseEvent) => e.event.target === canvas;
  const onMouseDown = (e: MouseEvent) => {
    if (onCanvas(e)) moveTo(e.x, e.y);
  };
  const onTouchStart = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch) moveTo(touch.x, touch.y);
    e.event.preventDefault();
  };
  app.mouse?.on("mousedown", onMouseDown);
  app.touch?.on("touchstart", onTouchStart);

  const onUpdate = (dt: number) => {
    if (!marker.enabled) return;
    markerLife -= dt * 1.5;
    if (markerLife <= 0) {
      marker.enabled = false;
      return;
    }
    const s = 0.4 + markerLife * 0.6;
    marker.setLocalScale(s, s, s);
  };
  app.on("update", onUpdate);

  return () => {
    app.mouse?.off("mousedown", onMouseDown);
    app.touch?.off("touchstart", onTouchStart);
    app.off("update", onUpdate);
    multiplayer.destroy();
    inventory.destroy();
  };
}

import type * as THREE from 'three';
import {
  PAN_SPEED,
  ZOOM_SPEED,
  MIN_ZOOM,
  MAX_ZOOM,
  GRID_SIZE,
  TILE_SIZE,
} from '../constants';
import type { SceneManager } from './SceneManager';

const EDGE_SCROLL_MARGIN = 20; // pixels from screen edge

export class CameraController {
  private camera: THREE.OrthographicCamera;
  private sceneManager: SceneManager;
  private keys: Set<string> = new Set();
  private mouseX = -1;
  private mouseY = -1;
  private homeX: number;
  private homeZ: number;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.camera;

    // Center camera on grid
    const center = (GRID_SIZE * TILE_SIZE) / 2;
    this.camera.position.x += center;
    this.camera.position.z += center;

    // Save home position (includes isometric offset from translateZ)
    this.homeX = this.camera.position.x;
    this.homeZ = this.camera.position.z;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('mousemove', this.onMouseMove);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    // Scale by actual delta for smooth trackpad support; clamp to avoid huge jumps
    const raw = e.deltaY * ZOOM_SPEED * 0.01;
    const delta = Math.sign(raw) * Math.min(Math.abs(raw), 0.5);
    const newFrustum = this.sceneManager.cameraFrustum + delta;
    if (newFrustum >= MIN_ZOOM && newFrustum <= MAX_ZOOM) {
      this.sceneManager.setFrustum(newFrustum);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  centerOnGrid(): void {
    this.camera.position.x = this.homeX;
    this.camera.position.z = this.homeZ;
  }

  update(dt: number): void {
    // In isometric view, "up" on screen is (-x, -z) in world space
    // due to the 45-degree Y rotation
    const speed = PAN_SPEED * dt;

    let panUp = false;
    let panDown = false;
    let panLeft = false;
    let panRight = false;

    // Keyboard input
    if (this.keys.has('w') || this.keys.has('arrowup')) panUp = true;
    if (this.keys.has('s') || this.keys.has('arrowdown')) panDown = true;
    if (this.keys.has('a') || this.keys.has('arrowleft')) panLeft = true;
    if (this.keys.has('d') || this.keys.has('arrowright')) panRight = true;

    // Edge scrolling
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.mouseX >= 0) {
      if (this.mouseY < EDGE_SCROLL_MARGIN) panUp = true;
      if (this.mouseY > h - EDGE_SCROLL_MARGIN) panDown = true;
      if (this.mouseX < EDGE_SCROLL_MARGIN) panLeft = true;
      if (this.mouseX > w - EDGE_SCROLL_MARGIN) panRight = true;
    }

    // Apply pan in isometric screen directions
    // Camera right in world = (+0.707, 0, +0.707)
    // Camera up in world (XZ) = (+0.707, 0, -0.707)
    if (panUp) {
      this.camera.position.x += speed * 0.707;
      this.camera.position.z -= speed * 0.707;
    }
    if (panDown) {
      this.camera.position.x -= speed * 0.707;
      this.camera.position.z += speed * 0.707;
    }
    if (panLeft) {
      this.camera.position.x -= speed * 0.707;
      this.camera.position.z -= speed * 0.707;
    }
    if (panRight) {
      this.camera.position.x += speed * 0.707;
      this.camera.position.z += speed * 0.707;
    }
  }
}

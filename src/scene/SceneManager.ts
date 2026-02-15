import * as THREE from 'three';
import {
  CAMERA_FRUSTUM,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_DISTANCE,
} from '../constants';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;

  private frustum: number;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Isometric orthographic camera
    this.frustum = CAMERA_FRUSTUM;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.frustum * aspect,
      this.frustum * aspect,
      this.frustum,
      -this.frustum,
      CAMERA_NEAR,
      CAMERA_FAR
    );

    // True isometric rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = -Math.PI / 4;
    this.camera.rotation.x = Math.atan(-1 / Math.sqrt(2));
    this.camera.translateZ(CAMERA_DISTANCE);

    // Renderer with retro pixel look
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    window.addEventListener('resize', this.onResize);
  }

  get cameraFrustum(): number {
    return this.frustum;
  }

  setFrustum(value: number): void {
    this.frustum = value;
    this.updateCameraProjection();
  }

  private updateCameraProjection(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -this.frustum * aspect;
    this.camera.right = this.frustum * aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
  }

  private onResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateCameraProjection();
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";

import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

import { MeshLine, MeshLineMaterial, MeshLineRaycast } from "three.meshline";

let container;
let camera, scene, renderer;

let mouseMeshB, mouseMeshBcopy, mouseMeshM, mouseMeshF;
const mouse = { x: 0, y: 0 };
let cube;
let composer;
var hblur, vblur;
var refractSphere, refractSphereCamera; // for refract material

const initThree = () => {
  // container = document.createElement("div");
  container = document.getElementById("three");
  document.body.appendChild(container);

  // Camera
  camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);
  camera.position.z = 5;

  // Renderer engine together with the background
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(
    Math.min(window.innerWidth, window.innerHeight),
    Math.min(window.innerWidth, window.innerHeight)
  );
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);

  // Scene
  scene = new THREE.Scene();
  const scene2 = new THREE.Scene();

  // Define the lights for the scene
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // import textures
  const textureBack = new THREE.TextureLoader().load("/bee_4000X4000.jpg");
  const textureMiddle = new THREE.TextureLoader().load("/test.jpg");
  // const textureFront = new THREE.TextureLoader().load("/beepollx4.png");
  const textureFront = new THREE.TextureLoader().load("/beepoll_h.png");

  // Create a PlaneB around the mouse and move it
  // Back
  var mouseGeometryB = new THREE.PlaneGeometry(6.5, 6.5);
  const materialBack = new THREE.MeshBasicMaterial({ map: textureBack });
  mouseMeshB = new THREE.Mesh(mouseGeometryB, materialBack);
  mouseMeshB.position.z = 0; // doesn't do anything
  scene.add(mouseMeshB);
  mouseMeshBcopy = new THREE.Mesh(mouseGeometryB, materialBack);
  // Create a PlaneM around the mouse and move it
  // Middle
  var mouseGeometryM = new THREE.PlaneGeometry(5, 5);
  const materialMiddle = new THREE.MeshBasicMaterial({ map: textureMiddle });
  mouseMeshM = new THREE.Mesh(mouseGeometryM, materialMiddle);
  mouseMeshM.position.z = 0; // doesn't do anything
  // scene.add(mouseMeshM);

  // Create a PlaneF around the mouse and move it
  // Front
  // var mouseGeometryF = new THREE.PlaneGeometry(1, 1);
  var mouseGeometryF = new THREE.PlaneGeometry(5.4, 5.4);
  // const mouseMaterialF = new THREE.MeshBasicMaterial({ map: textureFront });
  const mouseMaterialF = new THREE.MeshBasicMaterial({
    map: textureFront,
    transparent: true,
    opacity: 1,
    // color: 0xff0000,
  });
  // var mouseMaterialF = new THREE.MeshBasicMaterial({
  //   color: 0xff00b3,
  // });
  mouseMeshF = new THREE.Mesh(mouseGeometryF, mouseMaterialF);
  mouseMeshF.position.z = 10; // doesn't do anything
  scene.add(mouseMeshF);

  // custom
  const rtWidth = 512;
  const rtHeight = 512;
  const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);
  // renderTarget.setSize(
  //   Math.min(window.innerWidth, window.innerHeight),
  //   Math.min(window.innerWidth, window.innerHeight)
  // );
  const rtFov = 110;
  const rtAspect = rtWidth / rtHeight;
  const rtNear = 0.1;
  const rtFar = 5;
  const rtCamera = new THREE.PerspectiveCamera(rtFov, rtAspect, rtNear, rtFar);
  rtCamera.position.z = 2;

  const rtScene = new THREE.Scene();
  // rtScene.background = new THREE.Color("red");

  rtScene.add(mouseMeshBcopy);

  const material = new THREE.MeshPhongMaterial({
    map: renderTarget.texture,
  });
  // const geometry = new THREE.PlaneGeometry(6, 6);

  // const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
  // const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
  const heartShape = new THREE.Shape();
  const x = 0,
    y = 0;
  heartShape.moveTo(x + 0, y + 0);
  heartShape.lineTo(x + 3, y + 0);
  heartShape.lineTo(x - 3, y + 5.5);
  heartShape.lineTo(x - 6, y + 3);
  heartShape.lineTo(x - 3, y - 3);
  heartShape.lineTo(x - 3, y + 0);
  heartShape.lineTo(x + 0, y - 3);
  // heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
  // heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
  // heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
  // heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
  // heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
  // heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
  const geometry = new THREE.ShapeGeometry(heartShape);
  geometry.scale(-0.2, -0.2, 1);

  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  //composer
  composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(rtScene, rtCamera);
  hblur = new ShaderPass(HorizontalBlurShader);
  vblur = new ShaderPass(VerticalBlurShader);
  // const glitchPass = new GlitchPass();

  const effectCopy = new ShaderPass(CopyShader);
  effectCopy.renderToScreen = true;

  // vblur.renderToScreen = true;
  composer.addPass(renderPass);
  composer.addPass(hblur);
  composer.addPass(vblur);

  // composer.addPass(glitchPass);
  composer.addPass(effectCopy);

  // When the mouse moves, call the given function
  document.addEventListener("mousemove", onMouseMove, false);

  const render = (timestamp, frame) => {
    // renderer.setRenderTarget(renderTarget);

    // renderer.render(rtScene, rtCamera);

    // renderer.setRenderTarget(null);
    // renderer.setRenderTarget(renderTarget);

    renderer.render(scene, camera);
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
  };

  const animate = () => {
    renderer.setAnimationLoop(render);
    // // if using RequestAnimation()
    requestAnimationFrame(animate);
    composer.render();

    render();
  };
  animate();
};

// Follows the mouse event
function onMouseMove(event) {
  // Update the mouse variable
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Make the sphere follow the mouse
  const vectorB = new THREE.Vector3(mouse.x / 30, mouse.y / 30, 10);
  vectorB.unproject(camera);
  const dirB = vectorB.sub(camera.position).normalize();
  const distanceB = -camera.position.z / dirB.z;
  const posB = camera.position.clone().add(dirB.multiplyScalar(distanceB));
  mouseMeshB.position.copy(posB);
  mouseMeshB.position.z = 0;
  cube.position.copy(posB);

  // Make the sphere follow the mouse
  const vectorM = new THREE.Vector3(mouse.x / 5, mouse.y / 5, 10);
  vectorM.unproject(camera);
  const dirM = vectorM.sub(camera.position).normalize();
  const distanceM = -camera.position.z / dirM.z;
  const posM = camera.position.clone().add(dirM.multiplyScalar(distanceM));
  // mouseMeshM.position.copy(posM);
  // mouseMeshM.position.z = 0.5;
  cube.position.copy(posM);
  cube.position.z = 0.5;

  // Make the sphere follow the mouse
  const vectorF = new THREE.Vector3(mouse.x / 10, mouse.y / 10, 10);
  vectorF.unproject(camera);
  const dirF = vectorF.sub(camera.position).normalize();
  const distanceF = -camera.position.z / dirF.z;
  const posF = camera.position.clone().add(dirF.multiplyScalar(distanceF));
  mouseMeshF.position.copy(posF);
  mouseMeshF.position.z = 1;

  // Make the sphere follow the mouse
  //	mouseMesh.position.set(event.clientX, event.clientY, 0);
}

const onWindowResize = () => {
  camera.aspect = 1;
  camera.updateProjectionMatrix();

  // renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setSize(
    Math.min(window.innerWidth, window.innerHeight),
    Math.min(window.innerWidth, window.innerHeight)
  );
};

export { initThree };

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../../stores/editorStore";

export function ThreePreview() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (!containerRef.current || !activeTab?.path) return;

    const container = containerRef.current;
    const ext = activeTab.path.split(".").pop()?.toLowerCase() || "stl";

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Grid helper
    scene.add(new THREE.GridHelper(10, 10, 0x333333, 0x222222));

    // Load model
    const assetUrl = convertFileSrc(activeTab.path);

    if (ext === "stl") {
      new STLLoader().load(assetUrl, (geometry) => {
        const material = new THREE.MeshPhongMaterial({
          color: 0x4fc1ff,
          specular: 0x111111,
          shininess: 30,
        });
        const mesh = new THREE.Mesh(geometry, material);
        // Center the model
        geometry.computeBoundingBox();
        const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
        mesh.position.sub(center);
        scene.add(mesh);
        fitCameraToObject(camera, controls, geometry.boundingBox!);
      });
    } else {
      // glb/gltf/obj
      new GLTFLoader().load(assetUrl, (gltf) => {
        scene.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        fitCameraToObject(camera, controls, box);
      }, undefined, () => {
        // GLTF failed — try STL as fallback
        new STLLoader().load(assetUrl, (geometry) => {
          scene.add(new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x4fc1ff })));
        });
      });
    }

    // Animation loop
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [activeTab?.path]);

  if (!activeTab?.path) {
    return <div className="markdown-empty">{t("preview.saveFirst3d")}</div>;
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  box: THREE.Box3,
) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
  camera.position.set(center.x + distance * 0.7, center.y + distance * 0.5, center.z + distance * 0.7);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

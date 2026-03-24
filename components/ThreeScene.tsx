import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG, COLORS } from '../constants';
import { PlotData, SceneRef, BuildingStats } from '../types';

interface ThreeSceneProps {
  plotA: PlotData;
  plotB: PlotData;
}

// Helper to calculate building dimensions
const getBestGridDimensions = (cellCount: number) => {
  if (cellCount <= 0) return { w: 0, d: 0 };
  
  let bestW = 1;
  let bestD = cellCount;
  let minDiff = Infinity;

  for (let w = 1; w <= Math.sqrt(cellCount); w++) {
      if (cellCount % w === 0) {
          let d = cellCount / w;
          if (d <= 10 && w <= 10) {
              if ((d - w) < minDiff) {
                  minDiff = d - w;
                  bestW = w;
                  bestD = d;
              }
          }
      }
  }
  return { w: bestW, d: bestD };
};

const calculateBuilding = (data: PlotData): BuildingStats => {
  const cellCount = data.bcr; 
  
  if (cellCount <= 0 || data.far <= 0) {
      return { 
        valid: false, widthM: 0, depthM: 0, widthCells: 0, depthCells: 0, 
        wholeFloors: 0, remainder: 0, footprintArea: 0, totalFloorArea: 0, displayFloors: 0 
      };
  }

  const dims = getBestGridDimensions(cellCount);
  const widthM = dims.w * 10;
  const depthM = dims.d * 10;
  
  const footprintArea = widthM * depthM;
  const landArea = CONFIG.landSize * CONFIG.landSize;
  const totalFloorArea = landArea * (data.far / 100);
  
  let floors = totalFloorArea / footprintArea;
  const wholeFloors = Math.floor(floors);
  const remainder = floors - wholeFloors;

  return {
      valid: true,
      widthM,
      depthM,
      widthCells: dims.w,
      depthCells: dims.d,
      wholeFloors,
      remainder,
      footprintArea,
      totalFloorArea,
      displayFloors: remainder > 0.01 ? wholeFloors + 1 : wholeFloors
  };
};

const ThreeScene = forwardRef<SceneRef, ThreeSceneProps>(({ plotA, plotB }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Keep track of Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const requestRef = useRef<number | null>(null);
  
  // Groups
  const buildingGroupARef = useRef<THREE.Group>(new THREE.Group());
  const buildingGroupBRef = useRef<THREE.Group>(new THREE.Group());

  // Animation Refs
  const animARef = useRef<number | null>(null);
  const animBRef = useRef<number | null>(null);
  const delayARef = useRef<number | null>(null);
  const delayBRef = useRef<number | null>(null);

  // Expose reset method
  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current && cameraRef.current) {
        controlsRef.current.reset();
        cameraRef.current.position.set(0, 100, 180);
      }
    }
  }));

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xf0f4f8, 50, 400);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 100, 180);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(60, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    scene.add(dirLight);

    // Land Generation Helper
    const createLand = (xPos: number, colorHex: number, labelText: string, groupToAdd: THREE.Group) => {
        const group = new THREE.Group();
        group.position.set(xPos, 0, 0);

        // Ground Plane
        const geometry = new THREE.PlaneGeometry(CONFIG.landSize, CONFIG.landSize);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xe2e8f0, 
            side: THREE.DoubleSide,
            roughness: 1,
            metalness: 0
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        group.add(plane);

        // Grid
        const gridHelper = new THREE.GridHelper(CONFIG.landSize, CONFIG.gridDivisions, 0x94a3b8, 0xcbd5e1);
        gridHelper.position.y = 0.1;
        group.add(gridHelper);

        // Border
        const borderGeo = new THREE.EdgesGeometry(geometry);
        const borderMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 3 });
        const border = new THREE.LineSegments(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.2;
        group.add(border);

        // Label Texture
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0)';
            ctx.fillRect(0,0,512,128);
            
            // Title
            ctx.font = 'bold 60px "Noto Sans TC", sans-serif';
            ctx.fillStyle = colorHex === 0x3b82f6 ? '#1e40af' : '#991b1b';
            ctx.textAlign = 'center';
            ctx.fillText(labelText, 256, 50);

            // Subtitle
            ctx.font = 'bold 30px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText("100m x 100m | 10,000 m²", 256, 100);
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: tex });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.position.set(0, 0, CONFIG.landSize/2 + 25);
        labelSprite.scale.set(80, 20, 1);
        group.add(labelSprite);
        
        // Add the building container group
        group.add(groupToAdd);
        scene.add(group);
    };

    createLand(-65, COLORS.a.base, "土地 A", buildingGroupARef.current);
    createLand(65, COLORS.b.base, "土地 B", buildingGroupBRef.current);

    // Event Listeners
    const onMouseMove = (event: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (tooltipRef.current) {
            tooltipRef.current.style.left = event.clientX + 15 + 'px';
            tooltipRef.current.style.top = event.clientY + 15 + 'px';
        }
    };
    
    containerRef.current.addEventListener('mousemove', onMouseMove, false);

    const onResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    const animate = () => {
        requestRef.current = requestAnimationFrame(animate);
        if (controlsRef.current) controlsRef.current.update();
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            
            // Raycasting logic inside the loop
            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
            let targets: THREE.Object3D[] = [];
            buildingGroupARef.current.children.forEach(g => targets.push(...g.children));
            buildingGroupBRef.current.children.forEach(g => targets.push(...g.children));
            targets = targets.filter((o: any) => o.isMesh);
            
            const intersects = raycasterRef.current.intersectObjects(targets);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                const userData = obj.userData;
                if (userData && userData.landKey && tooltipRef.current) {
                    const isA = userData.landKey === 'a';
                    const info = userData.buildingInfo;
                    const bonusLabel = userData.hasBonus 
                        ? '<span style="color:#fbbf24; font-size:0.85em; margin-left:6px; font-weight:normal;">(含容積獎勵)</span>' 
                        : '';

                    tooltipRef.current.style.display = 'block';
                    tooltipRef.current.innerHTML = `
                        <strong style="color:#fcd34d; font-size:1.1em;">${isA ? '土地 A' : '土地 B'}</strong>${bonusLabel}<br>
                        <hr style="border-color:rgba(255,255,255,0.3); margin:4px 0;">
                        尺寸: ${info.width}m x ${info.depth}m<br>
                        單層面積: ${info.area} m²<br>
                        總樓層: ${info.floors} 樓<br>
                        <span style="color:#94a3b8; font-size:0.9em">(此層: 第 ${userData.floorIndex} 樓)</span>
                    `;
                    document.body.style.cursor = 'pointer';
                }
            } else {
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
                document.body.style.cursor = 'default';
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    };
    animate();

    return () => {
        if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
        window.removeEventListener('resize', onResize);
        if (containerRef.current) {
            containerRef.current.removeEventListener('mousemove', onMouseMove);
            if (rendererRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
        }
        rendererRef.current?.dispose();
    };
  }, []);

  // Update Building Function
  const updateBuilding = (landKey: 'a' | 'b', data: PlotData) => {
    const group = landKey === 'a' ? buildingGroupARef.current : buildingGroupBRef.current;
    const colorHex = landKey === 'a' ? COLORS.a.mesh : COLORS.b.mesh;
    const wireHex = landKey === 'a' ? COLORS.a.wire : COLORS.b.wire;
    const animRef = landKey === 'a' ? animARef : animBRef;
    const delayRef = landKey === 'a' ? delayARef : delayBRef;

    // Cleanup existing intervals/timeouts for this specific plot
    if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
    }
    if (delayRef.current) {
        clearTimeout(delayRef.current);
        delayRef.current = null;
    }

    // Cleanup meshes
    while(group.children.length > 0){ 
        const obj = group.children[0] as any;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
             if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
             else obj.material.dispose();
        }
        if (obj.children) {
            obj.children.forEach((c: any) => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }
        group.remove(obj); 
    }

    const stats = calculateBuilding(data);
    if (!stats.valid) return;

    const buildingInfo = {
        width: stats.widthM,
        depth: stats.depthM,
        floors: stats.displayFloors,
        area: stats.footprintArea
    };

    const meshes: THREE.Group[] = [];
    const boxGeo = new THREE.BoxGeometry(stats.widthM, CONFIG.floorHeight, stats.depthM);
    const boxMat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        transparent: true, 
        opacity: 0.9, 
        metalness: 0.1, 
        roughness: 0.5 
    });
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: wireHex, opacity: 0.5, transparent: true });

    const totalVisualFloors = stats.remainder > 0.01 ? stats.wholeFloors + 1 : stats.wholeFloors;

    for (let i = 0; i < totalVisualFloors; i++) {
        const floorWrapper = new THREE.Group();
        
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add user data to mesh for raycasting identification
        mesh.userData = { 
            landKey: landKey,
            floorIndex: i + 1,
            buildingInfo: buildingInfo,
            hasBonus: data.bonuses.length > 0
        };

        const line = new THREE.LineSegments(edgesGeo, lineMat);
        
        if (i === stats.wholeFloors && stats.remainder > 0) {
            mesh.scale.y = stats.remainder;
            line.scale.y = stats.remainder;
        }

        floorWrapper.add(mesh);
        floorWrapper.add(line);

        let yPos = (i * CONFIG.floorHeight) + (CONFIG.floorHeight / 2);
        if (i === stats.wholeFloors && stats.remainder > 0) {
             yPos = (i * CONFIG.floorHeight) + ((CONFIG.floorHeight * stats.remainder) / 2);
        }
        floorWrapper.position.y = yPos;

        // Initially hidden
        floorWrapper.visible = false;
        floorWrapper.scale.set(0.1, 0.1, 0.1);

        group.add(floorWrapper);
        meshes.push(floorWrapper);
    }

    // Animation logic with Delay
    let currentIdx = 0;
    let delay = Math.min(300, Math.max(50, 2000 / totalVisualFloors));
    
    // Set a timeout to delay the start of the animation by 500ms
    delayRef.current = window.setTimeout(() => {
        animRef.current = window.setInterval(() => {
            if (currentIdx >= meshes.length) {
                if (animRef.current) clearInterval(animRef.current);
                return;
            }
            const f = meshes[currentIdx];
            f.visible = true;
            let s = 0;
            const popAnim = window.setInterval(() => {
                s += 0.2;
                if (s >= 1) {
                    s = 1;
                    clearInterval(popAnim);
                }
                f.scale.set(s, s, s);
            }, 20);
            currentIdx++;
        }, delay);
    }, 500); // 0.5s delay
  };

  // Watch for changes in plot data
  useEffect(() => {
    updateBuilding('a', plotA);
  }, [plotA]);

  useEffect(() => {
    updateBuilding('b', plotB);
  }, [plotB]);

  return (
    <>
      <div 
        ref={containerRef} 
        id="canvas-container" 
        className="w-full h-[60vh] relative block bg-[#f0f4f8]"
      >
        <div 
            ref={tooltipRef}
            id="tooltip"
            className="absolute bg-black/85 text-white p-2 rounded-md text-sm pointer-events-none hidden z-50 whitespace-pre-line shadow-lg border border-white/20 leading-relaxed"
        ></div>
      </div>
    </>
  );
});

ThreeScene.displayName = 'ThreeScene';

export default ThreeScene;
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Constants & Data ---
const ZONES: Record<string, any> = {
    CBD: { id: 'CBD', name: '中心商業區 (1)', color: 0xFF0000, defaultBCR: 80, defaultFAR: 800 }, 
    IND_H: { id: 'IND_H', name: '批發輕工業 (2/6)', color: 0xFF8C00, defaultBCR: 70, defaultFAR: 200 }, 
    RES_L: { id: 'RES_L', name: '低級住宅區 (3/8)', color: 0xC8E6C9, defaultBCR: 60, defaultFAR: 300 }, 
    RES_M: { id: 'RES_M', name: '中級住宅區 (4)', color: 0x4CAF50, defaultBCR: 50, defaultFAR: 200 }, 
    RES_H: { id: 'RES_H', name: '高級住宅區 (5)', color: 0x2196F3, defaultBCR: 40, defaultFAR: 120 }, 
    ZONE_T: { id: 'ZONE_T', name: '過渡區', color: 0x9C27B0, defaultBCR: 70, defaultFAR: 400 }, 
    SUB_BIZ: { id: 'SUB_BIZ', name: '副都心 (7)', color: 0xFFD700, defaultBCR: 70, defaultFAR: 500 }, 
};

const MODELS: Record<string, any> = {
    CONCENTRIC: { id: 'CONCENTRIC', name: '同心圓模式', shape: 'circle', cityStyle: 'Chicago' },
    SECTOR: { id: 'SECTOR', name: '扇形模式', shape: 'circle', cityStyle: 'London' },
    MULTIPLE_NUCLEI: { id: 'MULTIPLE_NUCLEI', name: '多核心模式', shape: 'square', cityStyle: 'Tokyo' },
};

// --- Texture Generator ---
const TextureGenerator = {
    createBuildingTexture: (baseColor: string, windowColor: string, density = 4) => {
        const size = 128;
        const canvasColor = document.createElement('canvas');
        canvasColor.width = size; canvasColor.height = size;
        const ctx = canvasColor.getContext('2d');
        if (!ctx) return { map: new THREE.Texture(), emissive: new THREE.Texture() };
        
        // Color Map
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);
        // Noise
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        for(let i=0; i<80; i++) ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        
        // Emissive Map
        const canvasEmiss = document.createElement('canvas');
        canvasEmiss.width = size; canvasEmiss.height = size;
        const ctxE = canvasEmiss.getContext('2d');
        if (!ctxE) return { map: new THREE.Texture(), emissive: new THREE.Texture() };
        ctxE.fillStyle = '#000000';
        ctxE.fillRect(0, 0, size, size);
        
        const tileSize = size / density;
        const gap = tileSize * 0.3;
        
        for(let x=0; x<density; x++) {
            for(let y=0; y<density; y++) {
                if(Math.random() > 0.2) { 
                    const wx = x*tileSize + gap/2;
                    const wy = y*tileSize + gap/2;
                    const w = tileSize - gap;
                    const h = tileSize - gap;
                    
                    // Color Map
                    ctx.fillStyle = windowColor;
                    ctx.fillRect(wx, wy, w, h);
                    
                    // Emissive Map
                    ctxE.fillStyle = '#FFFFFF'; 
                    ctxE.fillRect(wx, wy, w, h);
                }
            }
        }
        const texColor = new THREE.CanvasTexture(canvasColor);
        texColor.wrapS = THREE.RepeatWrapping; texColor.wrapT = THREE.RepeatWrapping;
        const texEmiss = new THREE.CanvasTexture(canvasEmiss);
        texEmiss.wrapS = THREE.RepeatWrapping; texEmiss.wrapT = THREE.RepeatWrapping;
        return { map: texColor, emissive: texEmiss };
    },

    createAsphalt: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Texture();
        ctx.fillStyle = '#333';
        ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#444';
        for(let i=0; i<200; i++) ctx.fillRect(Math.random()*64, Math.random()*64, 1, 1);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 5);
        return tex;
    },

    createRail: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Texture();
        ctx.fillStyle = '#5c5042'; 
        ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#2b2118';
        for(let i=0; i<64; i+=8) ctx.fillRect(0, i+2, 64, 4);
        ctx.fillStyle = '#888';
        ctx.fillRect(16, 0, 4, 64);
        ctx.fillRect(44, 0, 4, 64);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 4); 
        return tex;
    }
};

// --- Components ---

const CityVisualizer: React.FC<{ modelType: string; zoneSettings: any; showDetails: boolean; timeOfDay: string }> = ({ modelType, zoneSettings, showDetails, timeOfDay }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null);
    const materialsRef = useRef<any>({});
    const particleSystemRef = useRef<THREE.Points | null>(null);
    const lightsRef = useRef<any>({});
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const requestRef = useRef<number | null>(null);
    
    const gridSize = 64; 
    const cellSize = 1.4;

    // Initialization
    useEffect(() => {
        if (!mountRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(45, 50, 45); 
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(renderer.domElement);

        // Lighting Init
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffcfa, 1.2);
        dirLight.position.set(50, 80, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        lightsRef.current = { ambientLight, hemiLight, dirLight };

        // Ground
        const planeGeometry = new THREE.PlaneGeometry(200, 200);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 1 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.enableZoom = true; // Ensure zoom is enabled
        controls.enableRotate = true; // Ensure rotation is enabled

        // Groups
        const buildingsGroup = new THREE.Group();
        const transportGroup = new THREE.Group();
        const particlesGroup = new THREE.Group();
        const treesGroup = new THREE.Group();
        scene.add(buildingsGroup);
        scene.add(transportGroup);
        scene.add(particlesGroup);
        scene.add(treesGroup);

        sceneRef.current = { scene, camera, renderer, buildingsGroup, transportGroup, particlesGroup, treesGroup, controls };

        const onMouseMove = (event: MouseEvent) => {
            if (!mountRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            if (tooltipRef.current) {
                tooltipRef.current.style.left = (event.clientX + 15) + 'px';
                tooltipRef.current.style.top = (event.clientY + 15) + 'px';
            }
        };
        window.addEventListener('mousemove', onMouseMove, false);

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            controls.update();
            
            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            const intersects = raycasterRef.current.intersectObjects(buildingsGroup.children, true);
            
            if (tooltipRef.current) {
                if (intersects.length > 0) {
                    let object: any = intersects[0].object;
                    while(object && !object.userData.zoneName && object.parent) {
                        object = object.parent;
                    }

                    if (object && object.userData && object.userData.zoneName) {
                        tooltipRef.current.style.display = 'block';
                        tooltipRef.current.innerText = object.userData.zoneName;
                    } else {
                        tooltipRef.current.style.display = 'none';
                    }
                } else {
                    tooltipRef.current.style.display = 'none';
                }
            }
            
            if (particleSystemRef.current && showDetails) {
                const positions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
                const isNight = showDetails && timeOfDay === 'Night';
                const speed = 0.2; 
                const limit = 45;

                for (let i = 0; i < positions.length; i += 3) {
                    let x = positions[i];
                    let z = positions[i+2];
                    let dx = 0, dz = 0;

                    if (modelType === 'SECTOR' || modelType === 'CONCENTRIC') {
                        const angle = Math.atan2(z, x);
                        const moveDir = isNight ? 1 : -1; 
                        dx = Math.cos(angle) * moveDir * speed;
                        dz = Math.sin(angle) * moveDir * speed;
                    } else {
                        if (Math.abs(x) > Math.abs(z)) {
                            const dir = isNight ? Math.sign(x) : -Math.sign(x);
                            dx = dir * speed;
                        } else {
                            const dir = isNight ? Math.sign(z) : -Math.sign(z);
                            dz = dir * speed;
                        }
                    }
                    positions[i] += dx;
                    positions[i+2] += dz;

                    const isOut = Math.abs(positions[i]) > limit || Math.abs(positions[i+2]) > limit;
                    const isCenter = Math.abs(positions[i]) < 1 && Math.abs(positions[i+2]) < 1;

                    if (isNight) {
                        if (isOut) {
                            positions[i] = (Math.random()-0.5)*2; 
                            positions[i+2] = (Math.random()-0.5)*2;
                        }
                    } else {
                        if (isCenter) {
                            const angle = Math.random() * Math.PI * 2;
                            positions[i] = Math.cos(angle) * limit;
                            positions[i+2] = Math.sin(angle) * limit;
                        }
                    }
                }
                particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
            }
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mountRef.current) return;
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', onMouseMove);
            if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
            renderer.dispose();
        };
    }, []); // Run once on mount

    // Update Materials and Lights based on props
    useEffect(() => {
        if (!sceneRef.current) return;
        
        // Initialize materials if not done
        if(Object.keys(materialsRef.current).length === 0) {
             const asphalt = TextureGenerator.createAsphalt();
             const railTex = TextureGenerator.createRail();
             const chicagoRes = TextureGenerator.createBuildingTexture('#374151', '#e5e7eb', 4); 
             const chicagoComm = TextureGenerator.createBuildingTexture('#4b5563', '#a0aec0', 5);
             const londonRes = TextureGenerator.createBuildingTexture('#7c2d12', '#e2e8f0', 4);
             const londonComm = TextureGenerator.createBuildingTexture('#4a3631', '#cbd5e0', 4);
             const londonRoof = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 });
             const tokyoCommercialTex = TextureGenerator.createBuildingTexture('#525252', '#A0C4FF', 6);
             const tokyoIndTex = TextureGenerator.createBuildingTexture('#795548', '#d6d3d1', 4); 
             const tokyoResTex = TextureGenerator.createBuildingTexture('#9ca3af', '#e5e7eb', 6);
             const neonTex = TextureGenerator.createBuildingTexture('#000000', '#00ffff', 8);

             materialsRef.current = {
                road: new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }),
                rail: new THREE.MeshStandardMaterial({ map: railTex, roughness: 1.0 }),
                sidewalk: new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 1 }),
                Chicago: {
                    Residential: new THREE.MeshStandardMaterial({ map: chicagoRes.map, emissiveMap: chicagoRes.emissive, emissive: 0x000000, roughness: 0.9 }),
                    Commercial: new THREE.MeshStandardMaterial({ map: chicagoComm.map, emissiveMap: chicagoComm.emissive, emissive: 0x000000, roughness: 0.6 }),
                },
                London: {
                    WallRes: new THREE.MeshStandardMaterial({ map: londonRes.map, emissiveMap: londonRes.emissive, emissive: 0x000000, roughness: 0.95 }),
                    WallComm: new THREE.MeshStandardMaterial({ map: londonComm.map, emissiveMap: londonComm.emissive, emissive: 0x000000, roughness: 0.8 }),
                    Roof: londonRoof
                },
                Tokyo: {
                    CBD: new THREE.MeshStandardMaterial({ map: tokyoCommercialTex.map, emissiveMap: tokyoCommercialTex.emissive, emissive: 0x000000, roughness: 0.2, metalness: 0.6 }),
                    Commercial: new THREE.MeshStandardMaterial({ map: tokyoCommercialTex.map, emissiveMap: tokyoCommercialTex.emissive, emissive: 0x000000, roughness: 0.2, metalness: 0.6 }),
                    Ind: new THREE.MeshStandardMaterial({ map: tokyoIndTex.map, emissiveMap: tokyoIndTex.emissive, emissive: 0x000000, roughness: 0.7 }),
                    Residential: new THREE.MeshStandardMaterial({ map: tokyoResTex.map, emissiveMap: tokyoResTex.emissive, emissive: 0x000000, roughness: 0.5 }),
                    Neon: new THREE.MeshStandardMaterial({ map: neonTex.map, emissiveMap: neonTex.emissive, emissive: 0xffffff, roughness: 0.2 }),
                }
            };
        }

        const { scene } = sceneRef.current;
        const { dirLight, hemiLight, ambientLight } = lightsRef.current;
        const mats = materialsRef.current;

        const isNight = showDetails && timeOfDay === 'Night';

        if (isNight) {
            scene.background = new THREE.Color(0x0f172a); 
            scene.fog = null;
            dirLight.intensity = 0.2; 
            dirLight.color.setHex(0xaaccff);
            hemiLight.intensity = 0.2; 
            hemiLight.groundColor.setHex(0x1a202c); 
            ambientLight.intensity = 0.35; 
        } else {
            const bgColor = 0x1e293b; 
            scene.background = new THREE.Color(bgColor);
            scene.fog = null;

            if (showDetails) {
                dirLight.intensity = 1.0; 
                ambientLight.intensity = 0.5;
                hemiLight.intensity = 0.4;
            } else {
                dirLight.intensity = 0.3; 
                ambientLight.intensity = 1.0; 
                hemiLight.intensity = 0.2;
            }
            dirLight.color.setHex(0xfffcfa);
            hemiLight.groundColor.setHex(0x222222);
        }

        const resLightColor = 0xffcc77; 
        
        mats.Chicago.Residential.emissive.setHex(resLightColor);
        mats.Chicago.Residential.emissiveIntensity = isNight ? 1.0 : 0.0;
        mats.Chicago.Commercial.emissiveIntensity = 0.0; 

        mats.London.WallRes.emissive.setHex(resLightColor);
        mats.London.WallRes.emissiveIntensity = isNight ? 1.0 : 0.0;
        mats.London.WallComm.emissiveIntensity = 0.0; 

        mats.Tokyo.Neon.emissiveIntensity = isNight ? 0.5 : 0.8; 
        mats.Tokyo.Residential.emissive.setHex(resLightColor); 
        mats.Tokyo.Residential.emissiveIntensity = isNight ? 0.9 : 0.0;
        
        mats.Tokyo.CBD.emissiveIntensity = 0.0;
        mats.Tokyo.Commercial.emissiveIntensity = 0.0; 
        mats.Tokyo.Ind.emissiveIntensity = 0.0;

    }, [timeOfDay, showDetails]); 

    // Rebuild Scene Content
    useEffect(() => {
        if (!sceneRef.current) return;
        const { buildingsGroup, transportGroup, particlesGroup, treesGroup } = sceneRef.current;
        
        buildingsGroup.clear();
        transportGroup.clear();
        particlesGroup.clear();
        treesGroup.clear();

        const halfGrid = gridSize / 2;
        const mats = materialsRef.current;

        const getZoneType = (x: number, z: number) => {
            const dist = Math.sqrt(x*x + z*z);
            const angle = Math.atan2(z, x); 
            
            if (modelType === MODELS.CONCENTRIC.id) {
                if (dist > halfGrid) return null;
                if (dist < 4) return ZONES.CBD;
                if (dist < 8) return ZONES.ZONE_T;
                if (dist < 15) return ZONES.RES_L;
                if (dist < 24) return ZONES.RES_M;
                return ZONES.RES_H;
            } 
            else if (modelType === MODELS.SECTOR.id) {
                if (dist > halfGrid) return null;
                if (dist < 3) return ZONES.CBD;
                if (angle > -0.4 && angle < 0.4) return ZONES.RES_H;
                const indWidth = 0.4;
                if ((angle > 2.35 - indWidth && angle < 2.35 + indWidth) || 
                    (angle > -2.35 - indWidth && angle < -2.35 + indWidth)) {
                    return ZONES.IND_H;
                }
                const lowResWidth = 0.9;
                if ((angle > 2.35 - lowResWidth && angle < 2.35 + lowResWidth) || 
                    (angle > -2.35 - lowResWidth && angle < -2.35 + lowResWidth)) {
                    return ZONES.RES_L;
                }
                if (dist < 6) return ZONES.RES_L;
                return ZONES.RES_M;
            }
            else if (modelType === MODELS.MULTIPLE_NUCLEI.id) {
                if (Math.abs(x) > 30 || Math.abs(z) > 30) return null;
                if (x > -5 && x < 5 && z > -5 && z < 5) return ZONES.CBD;
                if (x >= -12 && x <= -5 && z >= -8 && z <= 8) return ZONES.IND_H;
                if (x <= -10 && z >= 15) return ZONES.IND_H;
                if (x > 0 && x < 12 && z > 20) return ZONES.IND_H;
                if (Math.sqrt((x-18)**2 + (z-5)**2) < 4) return ZONES.SUB_BIZ;
                if (x >= 15 && z >= 22) return ZONES.RES_L;
                if (x >= 12 && x <= 25 && z >= 5 && z <= 18) return ZONES.RES_H;
                if (x < 0) return ZONES.RES_L; 
                return ZONES.RES_M;
            }
            return null;
        };

        const createRoadSegment = (p1: THREE.Vector3, p2: THREE.Vector3, width: number, material = mats.road) => {
            const dist = p1.distanceTo(p2);
            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, dist), material);
            mesh.position.copy(mid);
            mesh.position.y = 0.02; 
            mesh.rotation.x = -Math.PI/2;
            mesh.rotation.z = Math.atan2(p2.x - p1.x, p2.z - p1.z);
            mesh.receiveShadow = true;
            transportGroup.add(mesh);
        };

        let currentStyle = 'Chicago'; 
        if (modelType === 'CONCENTRIC') currentStyle = 'Chicago';
        if (modelType === 'SECTOR') currentStyle = 'London';
        if (modelType === 'MULTIPLE_NUCLEI') currentStyle = 'Tokyo';

        const treeCoords: number[] = [];

        // --- 1. Building Generation ---
        for (let x = -halfGrid; x <= halfGrid; x++) {
            for (let z = -halfGrid; z <= halfGrid; z++) {
                const zone = getZoneType(x, z);
                if (!zone) continue;

                const posX = x * cellSize;
                const posZ = z * cellSize;
                
                if (modelType === MODELS.SECTOR.id) {
                    const angle = Math.atan2(z, x);
                    if ((Math.abs(angle - 2.35) < 0.1 || Math.abs(angle + 2.35) < 0.1) && Math.sqrt(posX*posX+posZ*posZ) > 3) continue;
                }

                const settings = zoneSettings[zone.id];
                const floors = (settings.far / 100) / (settings.bcr / 100);
                let height = Math.max(0.2, floors * 0.6 * (Math.random() * 0.2 + 0.9));
                let baseWidth = Math.max(0.1, Math.sqrt(settings.bcr / 100) * cellSize * 0.9);

                const group = new THREE.Group();
                group.position.set(posX, 0, posZ);
                group.userData.zoneName = zone.name.split(' ')[0]; 

                if (!showDetails) {
                    const mat = new THREE.MeshLambertMaterial({ color: zone.color }); 
                    const geo = new THREE.BoxGeometry(baseWidth, height, baseWidth);
                    geo.translate(0, height/2, 0);
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.userData.zoneName = zone.name.split(' ')[0];
                    group.add(mesh);
                } else {
                    if (currentStyle === 'Chicago') {
                        let mat = zone.id.includes('RES') ? mats.Chicago.Residential : mats.Chicago.Commercial;
                        const base = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, height, baseWidth), mat);
                        base.position.y = height/2; base.castShadow = true; base.receiveShadow = true;
                        group.add(base);
                        if (height > 4) {
                            const top = new THREE.Mesh(new THREE.BoxGeometry(baseWidth*0.7, height*0.3, baseWidth*0.7), mat);
                            top.position.y = height + (height*0.3)/2; top.castShadow = true;
                            group.add(top);
                        }
                    }
                    else if (currentStyle === 'London') {
                        let wallMat = zone.id.includes('RES') ? mats.London.WallRes : mats.London.WallComm;
                        const body = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, height, baseWidth), wallMat);
                        body.position.y = height/2; body.castShadow = true; body.receiveShadow = true;
                        group.add(body);
                        const roofHeight = 0.6;
                        const roofGeo = new THREE.ConeGeometry(baseWidth * 0.8, roofHeight, 4);
                        roofGeo.rotateY(Math.PI / 4);
                        const roof = new THREE.Mesh(roofGeo, mats.London.Roof);
                        roof.position.y = height + roofHeight/2;
                        group.add(roof);
                    }
                    else if (currentStyle === 'Tokyo') {
                        let mat;
                        if (zone.id === 'CBD') mat = mats.Tokyo.CBD;
                        else if (zone.id === 'IND_H') mat = mats.Tokyo.Ind;
                        else if (zone.id.includes('RES')) mat = mats.Tokyo.Residential;
                        else mat = mats.Tokyo.Commercial; 

                        const mesh = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, height, baseWidth), mat);
                        mesh.position.y = height/2; mesh.castShadow = true; mesh.receiveShadow = true;
                        group.add(mesh);
                        
                        if ((zone.id === 'CBD' || zone.id === 'SUB_BIZ') && Math.random() > 0.6) {
                            const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), mats.Tokyo.Neon);
                            sign.position.set(baseWidth/2 + 0.02, Math.random() * (height * 0.8) + 0.5, 0);
                            sign.rotation.y = Math.PI/2;
                            group.add(sign);
                        }
                    }
                }
                
                group.scale.y = 0; group.userData = { ...group.userData, targetScale: 1 };
                buildingsGroup.add(group);

                if (showDetails && zone.id.includes('RES') && Math.random() > 0.3) {
                    treeCoords.push(posX + baseWidth/2 + 0.2, 0, posZ + baseWidth/2 + 0.2);
                }
            }
        }

        // --- 2. Transport ---
        if (modelType === MODELS.SECTOR.id) {
            [2.35, -2.35].forEach(a => createRoadSegment(new THREE.Vector3(0,0,0), new THREE.Vector3(Math.cos(a)*50,0,Math.sin(a)*50), 1.2, mats.rail));
        }

        if (showDetails) {
             if (modelType === 'CONCENTRIC') {
                [5, 10, 20].forEach(r => { for(let i=0;i<64;i++) createRoadSegment(new THREE.Vector3(Math.cos(i/64*Math.PI*2)*r,0,Math.sin(i/64*Math.PI*2)*r), new THREE.Vector3(Math.cos((i+1)/64*Math.PI*2)*r,0,Math.sin((i+1)/64*Math.PI*2)*r), 0.8) });
                for(let i=0;i<8;i++) createRoadSegment(new THREE.Vector3(0,0,0), new THREE.Vector3(Math.cos(i/8*Math.PI*2)*40,0,Math.sin(i/8*Math.PI*2)*40), 1.0);
            } else if (modelType === 'SECTOR') {
                 [0, 1.57, 3.14, -1.57, 1.2, -1.2].forEach(a => createRoadSegment(new THREE.Vector3(0,0,0), new THREE.Vector3(Math.cos(a)*45,0,Math.sin(a)*45), 1.0, mats.road));
                 [10, 20, 30].forEach(r => { for(let i=0;i<64;i++) createRoadSegment(new THREE.Vector3(Math.cos(i/64*Math.PI*2)*r,0,Math.sin(i/64*Math.PI*2)*r), new THREE.Vector3(Math.cos((i+1)/64*Math.PI*2)*r,0,Math.sin((i+1)/64*Math.PI*2)*r), 0.6) });
            } else {
                for(let i=-30; i<=30; i+=10) { createRoadSegment(new THREE.Vector3(i,0,-30), new THREE.Vector3(i,0,30), 1.0); createRoadSegment(new THREE.Vector3(-30,0,i), new THREE.Vector3(30,0,i), 1.0); }
            }

            if (treeCoords.length > 0) {
                const iMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.25, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.9 }), Math.floor(treeCoords.length/3));
                const dummy = new THREE.Object3D();
                for(let i=0; i<treeCoords.length; i+=3) {
                    dummy.position.set(treeCoords[i], 0.4, treeCoords[i+2]);
                    dummy.scale.setScalar(0.8 + Math.random()*0.4);
                    dummy.updateMatrix(); iMesh.setMatrixAt(i/3, dummy.matrix);
                }
                iMesh.receiveShadow = true; iMesh.castShadow = true;
                treesGroup.add(iMesh);
            }

            const pGeo = new THREE.BufferGeometry();
            const pPos = new Float32Array(600 * 3);
            for(let i=0; i<600; i++) {
                 const a = Math.random()*Math.PI*2, d = Math.random()*40;
                 pPos[i*3] = Math.cos(a)*d; pPos[i*3+1] = 0.1; pPos[i*3+2] = Math.sin(a)*d;
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
            const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffd700, size: 0.4 }));
            particlesGroup.add(particles);
            particleSystemRef.current = particles;
        }

        let frame = 0;
        const grow = () => { if(frame<=60) { buildingsGroup.children.forEach((b: any)=>{ if(b.scale && b.userData) b.scale.y+=(b.userData.targetScale-b.scale.y)*0.1}); frame++; requestAnimationFrame(grow); }};
        grow();

    }, [modelType, zoneSettings, showDetails]);

    return (
        <>
            <div ref={mountRef} className="absolute top-0 left-0 w-full h-full z-0 pointer-events-auto" />
            <div ref={tooltipRef} id="tooltip" className="hidden absolute bg-black/80 text-white px-3 py-1.5 rounded text-xs font-bold border border-white/20 shadow-md whitespace-nowrap z-50 pointer-events-none" />
        </>
    );
};

const ZoneControl: React.FC<{ zoneKey: string; zoneDef: any; settings: any; onChange: any; isStandardMode: boolean }> = ({ zoneKey, zoneDef, settings, onChange, isStandardMode }) => {
    const estimatedFloors = Math.round(settings.far / settings.bcr);
    const MAX_BCR = 100;
    const MAX_FAR = 1200;

    return (
        <div className={`mb-3 p-3 rounded border transition-colors ${
            isStandardMode 
                ? 'bg-blue-900 bg-opacity-20 border-blue-500/50' 
                : 'bg-gray-800 bg-opacity-60 border-gray-700 hover:border-gray-500'
        }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: '#' + zoneDef.color.toString(16).padStart(6, '0') }}></div>
                    <span className="font-bold text-sm text-gray-200">{zoneDef.name}</span>
                </div>
                <div className={`text-xs font-mono px-2 py-1 rounded flex items-center gap-1 ${
                    isStandardMode ? 'bg-green-500 text-white shadow-sm' : 'bg-blue-900 bg-opacity-30 text-blue-300'
                }`}>
                    {isStandardMode && <i className="fa-solid fa-check-circle text-[10px]"></i>}
                    約 {estimatedFloors} 層樓
                </div>
            </div>
            <div className="space-y-3 relative">
                {isStandardMode && <div className="absolute inset-0 z-10 cursor-not-allowed" title="標準模式下無法手動調整"></div>}
                <div className="relative">
                    <div className="flex justify-between text-xs mb-1">
                        <span className={isStandardMode ? "text-blue-300 font-bold" : "text-gray-400"}>建蔽率 (BCR)</span>
                        <span className={`font-mono ${isStandardMode ? "text-green-400 font-bold" : "text-white"}`}>{settings.bcr}%</span>
                    </div>
                    <input type="range" min="10" max={MAX_BCR} value={settings.bcr} disabled={isStandardMode} onChange={(e) => onChange(zoneKey, 'bcr', parseInt(e.target.value))} className={`w-full h-1 rounded-lg appearance-none ${isStandardMode ? 'bg-blue-500/30' : 'bg-gray-600 cursor-pointer'}`} />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className={isStandardMode ? "text-blue-300 font-bold" : "text-gray-400"}>容積率 (FAR)</span>
                        <span className={`font-mono ${isStandardMode ? "text-green-400 font-bold" : "text-white"}`}>{settings.far}%</span>
                    </div>
                    <input type="range" min="50" max={MAX_FAR} step="10" value={settings.far} disabled={isStandardMode} onChange={(e) => onChange(zoneKey, 'far', parseInt(e.target.value))} className={`w-full h-1 rounded-lg appearance-none ${isStandardMode ? 'bg-blue-500/30' : 'bg-gray-600 cursor-pointer'}`} />
                </div>
            </div>
        </div>
    );
};

const CitySimulator: React.FC = () => {
    const [selectedModel, setSelectedModel] = useState(MODELS.CONCENTRIC.id);
    const [zoneSettings, setZoneSettings] = useState(() => {
        const initial: Record<string, any> = {};
        Object.keys(ZONES).forEach(key => { initial[key] = { bcr: ZONES[key].defaultBCR, far: ZONES[key].defaultFAR }; });
        return initial;
    });
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isStandardMode, setStandardMode] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState('Day');

    const handleSettingChange = (zoneKey: string, field: string, value: number) => { if(!isStandardMode) setZoneSettings(prev => ({ ...prev, [zoneKey]: { ...prev[zoneKey], [field]: value } })); };
    const resetSettings = () => { const initial: any = {}; Object.keys(ZONES).forEach(key => { initial[key] = { bcr: ZONES[key].defaultBCR, far: ZONES[key].defaultFAR }; }); setZoneSettings(initial); };
    const toggleStandardMode = () => { const newMode = !isStandardMode; setStandardMode(newMode); if (newMode) resetSettings(); };
    const currentCityStyle = Object.values(MODELS).find(m => m.id === selectedModel)?.cityStyle;

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#1a202c]">
            <div className="flex flex-col h-full pointer-events-none">
                <header className="pointer-events-auto absolute top-20 left-4 z-40 flex gap-2">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="bg-gray-900 bg-opacity-80 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all border border-gray-600 backdrop-blur-sm w-12 h-12 flex justify-center items-center">
                        <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-sliders'} text-lg`}></i>
                    </button>
                </header>
                <aside className={`pointer-events-auto absolute top-0 left-0 h-full w-80 bg-slate-900/90 backdrop-blur-md border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-5 border-b border-gray-700 bg-gray-900 bg-opacity-50 pt-32">
                        <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2"><i className="fa-solid fa-city text-blue-400"></i>都市空間模擬 Pro</h1>
                        <p className="text-xs text-gray-400 mt-1">互動式分區管制與形態生成</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <section className="mb-6">
                            <h2 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">1. 空間結構模式</h2>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.values(MODELS).map(model => (
                                    <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`px-3 py-2 rounded text-left transition-all border text-sm flex justify-between items-center ${selectedModel === model.id ? 'bg-blue-600 border-blue-400 text-white shadow' : 'bg-gray-800 bg-opacity-50 border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                                        <div><div className="font-bold">{model.name}</div>{showDetails && <div className="text-[10px] opacity-75">風格: {model.cityStyle}</div>}</div>
                                        {selectedModel === model.id && <i className="fa-solid fa-check text-xs"></i>}
                                    </button>
                                ))}
                            </div>
                        </section>
                        
                        <section>
                            <div className="flex justify-between items-end mb-3"><h2 className="text-xs uppercase tracking-wider text-blue-400 font-bold">2. 參數與外觀</h2>{!isStandardMode && (<button onClick={resetSettings} className="text-[10px] text-gray-400 hover:text-white border border-gray-600 px-1.5 rounded transition-colors">重置</button>)}</div>
                            
                            <div className="mb-3 bg-indigo-900 bg-opacity-40 p-3 rounded-lg border border-indigo-500/30 flex items-center justify-between">
                                <div><div className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-paintbrush text-indigo-400"></i>建築外觀與細節</div><div className="text-[10px] text-gray-400 mt-1">{showDetails ? `目前風格: ${currentCityStyle}` : '顯示簡單色彩模型'}</div></div>
                                <label htmlFor="details-toggle" className="flex items-center cursor-pointer relative"><input type="checkbox" id="details-toggle" className="sr-only" checked={showDetails} onChange={() => setShowDetails(!showDetails)}/><div className={`w-10 h-5 bg-gray-600 rounded-full shadow-inner transition-colors ${showDetails ? 'bg-indigo-500' : ''}`}></div><div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${showDetails ? 'translate-x-5' : ''}`}></div></label>
                            </div>

                            {showDetails && (
                                <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 mb-4 border border-gray-600 animate-fade-in">
                                    <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">時間與環境</h3>
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setTimeOfDay('Day')} className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${timeOfDay === 'Day' ? 'bg-yellow-500 text-gray-900 font-bold shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}><i className="fa-solid fa-sun"></i> 白天</button>
                                        <button onClick={() => setTimeOfDay('Night')} className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${timeOfDay === 'Night' ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/50' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}><i className="fa-solid fa-moon"></i> 晚上</button>
                                    </div>
                                    <div className="text-[10px] text-gray-400 text-center">{timeOfDay === 'Day' ? '交通：匯入市中心 (Inbound)' : '交通：返回住宅區 (Outbound) + 點燈'}</div>
                                </div>
                            )}

                            <div className="mb-4 bg-gray-700 bg-opacity-40 p-3 rounded-lg border border-gray-600 flex items-center justify-between">
                                <div><div className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-book-open text-yellow-400"></i>標準範本模式</div><div className="text-[10px] text-gray-400 mt-1">鎖定為理論標準值</div></div>
                                <label htmlFor="standard-toggle" className="flex items-center cursor-pointer relative"><input type="checkbox" id="standard-toggle" className="sr-only" checked={isStandardMode} onChange={toggleStandardMode}/><div className={`w-10 h-5 bg-gray-600 rounded-full shadow-inner transition-colors ${isStandardMode ? 'bg-green-500' : ''}`}></div><div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${isStandardMode ? 'translate-x-5' : ''}`}></div></label>
                            </div>
                            <div className="space-y-1">{Object.keys(ZONES).map(key => (<ZoneControl key={key} zoneKey={key} zoneDef={ZONES[key]} settings={zoneSettings[key]} onChange={handleSettingChange} isStandardMode={isStandardMode}/>))}</div>
                        </section>
                    </div>
                </aside>
                <CityVisualizer modelType={selectedModel} zoneSettings={zoneSettings} showDetails={showDetails} timeOfDay={timeOfDay} />
            </div>
        </div>
    );
};

export default CitySimulator;
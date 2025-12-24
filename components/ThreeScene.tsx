
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { AppMode } from '../types';
import { COLORS, PARTICLE_CONFIG } from '../constants';

interface Props {
    onLoaded: () => void;
    onModeChange: (mode: AppMode) => void;
}

const ThreeScene = forwardRef(({ onLoaded, onModeChange }: Props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneElements = useRef<any>(null);
    const state = useRef<{
        mode: AppMode;
        mainGroup: THREE.Group;
        particles: any[];
        dust: THREE.Points;
        handData: { x: number; y: number; isTracking: boolean };
        targetPhoto: any;
    }>({
        mode: AppMode.TREE,
        mainGroup: new THREE.Group(),
        particles: [],
        dust: null as any,
        handData: { x: 0, y: 0, isTracking: false },
        targetPhoto: null
    });

    useImperativeHandle(ref, () => ({
        addPhoto: (dataUrl: string) => {
            new THREE.TextureLoader().load(dataUrl, (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                addPhotoToScene(t);
            });
        }
    }));

    const addPhotoToScene = (texture: THREE.Texture) => {
        const { mainGroup, particles } = state.current;
        
        // Frame creation
        const geometry = new THREE.BoxGeometry(4, 5, 0.2);
        const material = new THREE.MeshStandardMaterial({ color: COLORS.CHAMPAGNE_GOLD, metalness: 0.9, roughness: 0.1 });
        const frame = new THREE.Mesh(geometry, material);
        
        const photoGeo = new THREE.PlaneGeometry(3.6, 4.6);
        const photoMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.position.z = 0.11;
        
        const photoGroup = new THREE.Group();
        photoGroup.add(frame);
        photoGroup.add(photo);
        
        photoGroup.userData = { 
            type: 'PHOTO', 
            velocity: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.05)
        };
        
        // Initial random position
        photoGroup.position.set(Math.random()*40-20, Math.random()*40-20, Math.random()*40-20);
        mainGroup.add(photoGroup);
        particles.push(photoGroup);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        // --- Init Three ---
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 2, 50);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2.2;
        containerRef.current.appendChild(renderer.domElement);

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 10;
        controls.maxDistance = 150;

        // Post Processing
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.4, 0.7);
        composer.addPass(bloomPass);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        
        const coreLight = new THREE.PointLight(COLORS.GLOW_ORANGE, 2, 50);
        scene.add(coreLight);

        const spotGold = new THREE.SpotLight(COLORS.CHAMPAGNE_GOLD, 1200);
        spotGold.position.set(30, 40, 40);
        scene.add(spotGold);

        const spotBlue = new THREE.SpotLight(COLORS.ICE_BLUE, 600);
        spotBlue.position.set(-30, 20, -30);
        scene.add(spotBlue);

        scene.add(state.current.mainGroup);

        // --- Content Generation ---
        const createCandyCaneTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 128, 128);
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 15;
            for (let i = -128; i < 128; i += 32) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + 128, 128);
                ctx.stroke();
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 1);
            return tex;
        };

        const candyTexture = createCandyCaneTexture();

        const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        
        const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.CHAMPAGNE_GOLD, metalness: 0.9, roughness: 0.1 });
        const greenMat = new THREE.MeshStandardMaterial({ color: COLORS.DEEP_GREEN, roughness: 0.4 });
        const redMat = new THREE.MeshPhysicalMaterial({ color: COLORS.CHRISTMAS_RED, clearcoat: 1.0, clearcoatRoughness: 0.1 });

        // Main Particles
        for (let i = 0; i < PARTICLE_CONFIG.TOTAL_MAIN; i++) {
            let mesh;
            const rand = Math.random();
            if (rand < 0.4) {
                mesh = new THREE.Mesh(boxGeo, Math.random() > 0.5 ? goldMat : greenMat);
            } else if (rand < 0.8) {
                mesh = new THREE.Mesh(sphereGeo, Math.random() > 0.5 ? goldMat : redMat);
            } else {
                // Candy Cane
                const curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 1.2, 0),
                    new THREE.Vector3(0.4, 1.5, 0),
                    new THREE.Vector3(0.8, 1.2, 0),
                ]);
                const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.08, 8, false);
                mesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ map: candyTexture }));
            }
            
            mesh.position.set(Math.random()*100-50, Math.random()*100-50, Math.random()*100-50);
            mesh.userData = { 
                type: 'DECOR',
                velocity: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.1),
                phase: Math.random() * Math.PI * 2
            };
            state.current.mainGroup.add(mesh);
            state.current.particles.push(mesh);
        }

        // Dust
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(PARTICLE_CONFIG.TOTAL_DUST * 3);
        for (let i = 0; i < PARTICLE_CONFIG.TOTAL_DUST * 3; i++) {
            dustPos[i] = Math.random() * 100 - 50;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({ color: COLORS.CREAM_WHITE, size: 0.05, transparent: true, opacity: 0.6 });
        state.current.dust = new THREE.Points(dustGeo, dustMat);
        scene.add(state.current.dust);

        // Initial default photo
        const defaultCanvas = document.createElement('canvas');
        defaultCanvas.width = 512;
        defaultCanvas.height = 512;
        const dctx = defaultCanvas.getContext('2d')!;
        dctx.fillStyle = '#013220';
        dctx.fillRect(0,0,512,512);
        dctx.fillStyle = '#d4af37';
        dctx.font = 'bold 48px Cinzel';
        dctx.textAlign = 'center';
        dctx.fillText('JOYEUX NOEL', 256, 256);
        const defaultTex = new THREE.CanvasTexture(defaultCanvas);
        addPhotoToScene(defaultTex);

        // --- MediaPipe Setup ---
        let handLandmarker: HandLandmarker;
        const setupCV = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });

                const video = document.getElementById('webcam') as HTMLVideoElement;
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.addEventListener('loadeddata', () => {
                    detectHands(video);
                });
                onLoaded();
            } catch (err) {
                console.error("CV Setup Error:", err);
                onLoaded(); // Fail gracefully
            }
        };

        const detectHands = (video: HTMLVideoElement) => {
            if (handLandmarker) {
                const results = handLandmarker.detectForVideo(video, performance.now());
                if (results.landmarks && results.landmarks.length > 0) {
                    const lms = results.landmarks[0];
                    const wrist = lms[0];
                    const thumb = lms[4];
                    const index = lms[8];
                    const middle = lms[12];
                    const ring = lms[16];
                    const pinky = lms[20];
                    const center = lms[9];

                    // Map Hand to Rotation
                    state.current.handData = {
                        x: (center.x - 0.5) * 2,
                        y: (center.y - 0.5) * 2,
                        isTracking: true
                    };

                    // Gesture Logic
                    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
                    
                    const fingertips = [index, middle, ring, pinky];
                    let avgDistToWrist = 0;
                    fingertips.forEach(f => {
                        avgDistToWrist += Math.hypot(f.x - wrist.x, f.y - wrist.y);
                    });
                    avgDistToWrist /= 4;

                    if (pinchDist < 0.05) {
                        updateMode(AppMode.FOCUS);
                    } else if (avgDistToWrist < 0.25) {
                        updateMode(AppMode.TREE);
                    } else if (avgDistToWrist > 0.4) {
                        updateMode(AppMode.SCATTER);
                    }
                } else {
                    state.current.handData.isTracking = false;
                }
            }
            requestAnimationFrame(() => detectHands(video));
        };

        const updateMode = (newMode: AppMode) => {
            if (state.current.mode !== newMode) {
                state.current.mode = newMode;
                onModeChange(newMode);
                
                if (newMode === AppMode.FOCUS) {
                    const photos = state.current.particles.filter(p => p.userData.type === 'PHOTO');
                    state.current.targetPhoto = photos[Math.floor(Math.random() * photos.length)];
                }
            }
        };

        setupCV();

        // --- Animation Loop ---
        const clock = new THREE.Clock();
        const animate = () => {
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();
            
            // Lerp rotations from hand data
            if (state.current.handData.isTracking) {
                state.current.mainGroup.rotation.y = THREE.MathUtils.lerp(state.current.mainGroup.rotation.y, state.current.handData.x * 0.5, 0.05);
                state.current.mainGroup.rotation.x = THREE.MathUtils.lerp(state.current.mainGroup.rotation.x, state.current.handData.y * 0.5, 0.05);
            } else {
                state.current.mainGroup.rotation.y += 0.002;
            }

            // Dust movement
            state.current.dust.rotation.y += 0.0005;
            state.current.dust.position.y = Math.sin(time * 0.2) * 2;

            // Particle Positioning
            state.current.particles.forEach((p, idx) => {
                const t = idx / state.current.particles.length;
                let targetPos = new THREE.Vector3();
                let targetScale = new THREE.Vector3(1, 1, 1);
                let targetRot = new THREE.Euler();

                switch (state.current.mode) {
                    case AppMode.TREE:
                        const radius = PARTICLE_CONFIG.TREE_MAX_RADIUS * (1 - t);
                        const angle = t * 50 * Math.PI;
                        targetPos.set(
                            Math.cos(angle) * radius,
                            t * PARTICLE_CONFIG.TREE_HEIGHT - (PARTICLE_CONFIG.TREE_HEIGHT/2),
                            Math.sin(angle) * radius
                        );
                        targetRot.set(0, angle, 0);
                        break;
                    
                    case AppMode.SCATTER:
                        // Physics-based drift
                        p.position.add(p.userData.velocity);
                        // Bounding sphere
                        const dist = p.position.length();
                        if (dist > 25) p.userData.velocity.negate();
                        
                        // Self-rotation in scatter mode
                        p.rotation.x += p.userData.velocity.x * 2;
                        p.rotation.y += p.userData.velocity.y * 2;
                        return; // Early return for manual physics

                    case AppMode.FOCUS:
                        if (p === state.current.targetPhoto) {
                            targetPos.set(0, 2, 35);
                            targetScale.set(4.5, 4.5, 4.5);
                            targetRot.set(0, 0, 0);
                        } else {
                            // Others scatter
                            targetPos.set(
                                Math.cos(t * 10) * 40,
                                Math.sin(t * 10) * 40,
                                -20
                            );
                        }
                        break;
                }

                p.position.lerp(targetPos, PARTICLE_CONFIG.TRANSITION_SPEED);
                p.scale.lerp(targetScale, PARTICLE_CONFIG.TRANSITION_SPEED);
                p.quaternion.slerp(new THREE.Quaternion().setFromEuler(targetRot), PARTICLE_CONFIG.TRANSITION_SPEED);
            });

            composer.render();
            requestAnimationFrame(animate);
        };
        animate();

        // Resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        sceneElements.current = { renderer, composer, scene, camera };
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    return <div ref={containerRef} className="w-full h-full" />;
});

export default ThreeScene;

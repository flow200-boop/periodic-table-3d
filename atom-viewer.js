import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class AtomViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Animation state
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    
    // Visualizer configuration
    this.visualizationMode = 'bohr'; // 'bohr' or 'cloud'
    this.showOrbitPaths = true;
    this.speedMultiplier = 1.0;
    
    // Groups for scene elements
    this.nucleusGroup = new THREE.Group();
    this.orbitsGroup = new THREE.Group();
    this.cloudGroup = new THREE.Group();
    
    // Current loaded element details
    this.currentElement = null;
    
    // Lists of objects to update in animation loop
    this.orbitingElectrons = [];
    this.nucleusSpheres = [];
    
    this.init();
  }

  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    
    // 2. Camera Setup (FOV, aspect, near, far)
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 8, 16);
    
    // 3. Renderer Setup with antialiasing
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true // transparent background to blend with CSS
    });
    this.renderer.setSize(rect.width, rect.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // 4. Controls Setup (OrbitControls for mouse rotation/zoom)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    
    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);
    
    // Dynamic lights inside scene to cast gorgeous shadows
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.4);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
    
    // Strong central glowing light from the nucleus
    this.nucleusLight = new THREE.PointLight(0xffffff, 1.5, 15);
    this.nucleusLight.position.set(0, 0, 0);
    this.scene.add(this.nucleusLight);
    
    // Add primary container groups to scene
    this.scene.add(this.nucleusGroup);
    this.scene.add(this.orbitsGroup);
    this.scene.add(this.cloudGroup);
    
    // Start rendering loop
    this.animate();
    
    // Listen to resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height, false);
  }

  // Load a new element and generate its 3D model
  loadElement(element) {
    this.currentElement = element;
    
    // Reset groups and clean up WebGL buffers
    this.clearScene();
    
    // Set nucleus light color to reflect element category color
    const catColorHex = this.getCategoryColor(element.category);
    this.nucleusLight.color.setHex(catColorHex);
    
    // 1. Build Central Nucleus
    this.buildNucleus(element.number, Math.round(element.mass - element.number));
    
    // 2. Build Bohr Orbiting Shells
    this.buildBohrShells(element.shells, catColorHex);
    
    // 3. Build Quantum Electron Cloud
    this.buildElectronCloud(element.shells, catColorHex);
    
    // Apply initial mode
    this.updateModes();
    
    // Auto-adjust camera zoom based on size of shells
    const maxRadius = 2.5 + element.shells.length * 1.5;
    this.camera.position.set(0, maxRadius * 0.9, maxRadius * 1.6);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // Packs protons & neutrons programmatically in a spherical cluster
  buildNucleus(protonsCount, neutronsCount) {
    this.nucleusSpheres = [];
    const totalParticles = protonsCount + neutronsCount;
    
    // Performance optimization: limit rendering cluster spheres
    const maxRenderedSpheres = Math.min(totalParticles, 42);
    
    // Protons / Neutrons sizes
    const sphereRadius = 0.28;
    const protonGeom = new THREE.SphereGeometry(sphereRadius, 16, 16);
    const neutronGeom = new THREE.SphereGeometry(sphereRadius, 16, 16);
    
    // Glowing materials
    const protonMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,        // Vibrant Red
      emissive: 0x8b0000,
      roughness: 0.15,
      metalness: 0.8
    });
    
    const neutronMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,        // Electric Blue
      emissive: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8
    });
    
    // Golden spiral algorithm to pack spheres tightly on concentric layers
    for (let i = 0; i < maxRenderedSpheres; i++) {
      const isProton = (i % 2 === 0 && protonsCount > 0) || neutronsCount <= 0;
      const mesh = new THREE.Mesh(isProton ? protonGeom : neutronGeom, isProton ? protonMat : neutronMat);
      
      // Compute spherical packing coordinates
      const phi = Math.acos(-1 + (2 * i) / maxRenderedSpheres);
      const theta = Math.sqrt(maxRenderedSpheres * Math.PI) * phi;
      
      // Add standard radial packing layering with noise
      const baseDistance = 0.35 + Math.random() * 0.22;
      const r = maxRenderedSpheres > 10 ? baseDistance * (1 + (i / maxRenderedSpheres) * 0.4) : baseDistance;
      
      mesh.position.x = r * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = r * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = r * Math.cos(phi);
      
      // Store random offsets for vibrating movement
      mesh.userData = {
        baseX: mesh.position.x,
        baseY: mesh.position.y,
        baseZ: mesh.position.z,
        vibeSpeed: 8 + Math.random() * 12,
        vibeAmplitude: 0.02 + Math.random() * 0.02
      };
      
      this.nucleusGroup.add(mesh);
      this.nucleusSpheres.push(mesh);
    }
  }

  // Generates 3D rings and orbiting electrons at Keplerian angles
  buildBohrShells(shellsArray, themeColor) {
    this.orbitingElectrons = [];
    
    const electronGeom = new THREE.SphereGeometry(0.14, 16, 16);
    const electronMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,       // Glowing cyan electron
      emissive: 0x0891b2,
      roughness: 0.1,
      metalness: 0.9
    });
    
    shellsArray.forEach((electronsInShell, shellIdx) => {
      const shellNum = shellIdx + 1;
      const radius = 2.5 + shellNum * 1.5;
      
      // Orbit Ring Geometry
      const ringGeom = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 64);
      // Faint glowing, double-sided transparent material
      const ringMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      
      const orbitRing = new THREE.Mesh(ringGeom, ringMat);
      orbitRing.rotation.x = Math.PI / 2; // Flat layout
      
      // Generate clean 3D orbital inclination angles
      const inclination = (Math.PI / 8) * (shellNum - 1) + (Math.random() * 0.2 - 0.1); 
      const azimuth = (Math.PI / 4) * (shellNum - 1);
      
      // Primary group wrapper to handle rotation angles
      const orbitGroupWrapper = new THREE.Group();
      orbitGroupWrapper.rotation.x = inclination;
      orbitGroupWrapper.rotation.y = azimuth;
      
      orbitGroupWrapper.add(orbitRing);
      
      // Orbit Path Lines (Fine glow line)
      const points = [];
      for (let theta = 0; theta <= Math.PI * 2; theta += Math.PI / 64) {
        points.push(new THREE.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta)));
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: themeColor, 
        transparent: true, 
        opacity: 0.32 
      });
      const orbitLine = new THREE.Line(lineGeom, lineMat);
      orbitGroupWrapper.add(orbitLine);
      
      this.orbitsGroup.add(orbitGroupWrapper);
      
      // Distribute electrons along orbit ring dynamically
      for (let e = 0; e < electronsInShell; e++) {
        const electronMesh = new THREE.Mesh(electronGeom, electronMat);
        
        // Save orbiting parameters
        const speed = (0.75 / Math.sqrt(radius)) * (Math.random() > 0.5 ? 1 : -1); // Dynamic orbital velocity
        const startAngle = (Math.PI * 2 / electronsInShell) * e;
        
        this.orbitingElectrons.push({
          mesh: electronMesh,
          radius: radius,
          angle: startAngle,
          angularSpeed: speed,
          parentGroup: orbitGroupWrapper
        });
        
        orbitGroupWrapper.add(electronMesh);
      }
    });
  }

  // Builds a gorgeous particle electron probability cloud (Quantum mode)
  buildElectronCloud(shellsArray, themeColor) {
    const totalElectrons = shellsArray.reduce((a, b) => a + b, 0);
    // Generate lots of small dots to form clouds
    const particleCount = Math.min(totalElectrons * 100, 3000); 
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const colorObj = new THREE.Color(themeColor);
    
    for (let i = 0; i < particleCount; i++) {
      // Pick a random shell to distribute particle
      const shellIdx = Math.floor(Math.random() * shellsArray.length);
      const meanRadius = 2.5 + (shellIdx + 1) * 1.5;
      
      // Gaussian distribution for electron density cloud
      const u1 = Math.random();
      const u2 = Math.random();
      const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const radius = meanRadius + randStdNormal * 0.45; // standard deviation deviation
      
      // Spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Soft color shifting of particles
      const shift = Math.random() * 0.2 - 0.1;
      colors[i * 3] = Math.max(0, Math.min(1, colorObj.r + shift));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, colorObj.g + shift));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, colorObj.b + shift));
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create subtle circular particles points material
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const points = new THREE.Points(geometry, material);
    this.cloudGroup.add(points);
  }

  // Toggles visual states of subcomponents based on selected settings
  updateModes() {
    if (this.visualizationMode === 'bohr') {
      this.orbitsGroup.visible = true;
      this.cloudGroup.visible = false;
      
      // Toggle path lines inside Bohr group
      this.orbitsGroup.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          child.visible = this.showOrbitPaths;
        }
      });
    } else {
      // Cloud Mode
      this.orbitsGroup.visible = false;
      this.cloudGroup.visible = true;
    }
  }

  setVisualizationMode(mode) {
    this.visualizationMode = mode;
    this.updateModes();
  }

  toggleOrbitPaths(show) {
    this.showOrbitPaths = show;
    this.updateModes();
  }

  setSpeed(speedMultiplier) {
    this.speedMultiplier = speedMultiplier;
  }

  // Dynamic animation frame
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // 1. Update controls
    if (this.controls) this.controls.update();
    
    // 2. Animate central nucleus (subtle vibrating noise)
    const vibeIntensity = 0.95;
    this.nucleusSpheres.forEach(mesh => {
      const data = mesh.userData;
      const wave = Math.sin(elapsedTime * data.vibeSpeed) * data.vibeAmplitude * vibeIntensity;
      mesh.position.x = data.baseX + wave;
      mesh.position.y = data.baseY + wave;
      mesh.position.z = data.baseZ + wave;
    });
    
    // Slow rotate nucleus group for volumetric look
    this.nucleusGroup.rotation.y = elapsedTime * 0.12;
    
    // 3. Animate orbiting Bohr electrons
    if (this.visualizationMode === 'bohr') {
      this.orbitingElectrons.forEach(electron => {
        // Increment angle
        electron.angle += electron.angularSpeed * delta * this.speedMultiplier;
        
        // Update positions on orbital flat layout
        electron.mesh.position.x = electron.radius * Math.cos(electron.angle);
        electron.mesh.position.z = electron.radius * Math.sin(electron.angle);
      });
    } else {
      // 4. Slow rotate Quantum cloud particles
      this.cloudGroup.rotation.y = elapsedTime * 0.18;
      this.cloudGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.1;
    }
    
    // 5. Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Properly dispose WebGL structures to avoid RAM/VRAM memory leaks
  clearGroup(group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      
      if (obj.geometry) obj.geometry.dispose();
      
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      
      // Recursive for subcomponents
      if (obj.children && obj.children.length > 0) {
        this.clearGroup(obj);
      }
    }
  }

  clearScene() {
    this.clearGroup(this.nucleusGroup);
    this.clearGroup(this.orbitsGroup);
    this.clearGroup(this.cloudGroup);
    
    this.orbitingElectrons = [];
    this.nucleusSpheres = [];
  }

  // Destroy the visualizer fully
  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.clearScene();
    
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  // Returns standard hex color code mapped to element categories
  getCategoryColor(category) {
    const colors = {
      "reactive-nonmetal": 0x0284c7,
      "noble-gas": 0xdb2777,
      "alkali-metal": 0xdc2626,
      "alkaline-earth-metal": 0xea580c,
      "metalloid": 0xca8a04,
      "post-transition-metal": 0x059669,
      "transition-metal": 0x2563eb,
      "lanthanide": 0x7c3aed,
      "actinide": 0xc026d3
    };
    return colors[category] || 0xffffff;
  }
}

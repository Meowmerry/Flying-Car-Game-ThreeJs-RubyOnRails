
// Global variables for game state
let isNight = false;
let scene, ambientLight, directionalLight, moonLight, cityObjects;
let cars = [];
let clouds = [];
let characters = [];
let ground; // Add ground to global variables
let activeCar = 0;
let camera, cameraDistance = 10;
const minCameraDistance = 5;
const maxCameraDistance = 30;
let altitude = 10; // Track car's altitude
const maxAltitude = 100; // Maximum flying height
const minAltitude = 1; // Minimum flying height

// Game physics
const GRAVITY = 0.05;
const THRUST = 0.15;
const DRAG = 0.02;
let verticalSpeed = 0;

// Constants for day/night colors
const DAY_SKY_COLOR = 0x87CEEB;
const NIGHT_SKY_COLOR = 0x001133;
const WINDOW_COLORS = {
    day: { color: 0x808080, emissive: 0x000000 },
    night: { color: 0xffff00, emissive: 0xffff00 }
};

// Car colors and positions
const carColors = [0xff0000, 0x0000ff, 0x00ff00];
const carPositions = [
    { x: 0, y: 10, z: 0 },
    { x: 5, y: 10, z: 0 },
    { x: -5, y: 10, z: 0 }
];

let speed = 0;
let boost = 100;
let score = 0;

// Game variables
let gameSpeed = 0.2;
const rotationSpeed = 0.03;
const tiltSpeed = 0.02;
const maxTilt = Math.PI / 4;
let currentSpeed = 0;
const acceleration = 0.02;
const deceleration = 0.01;
const maxSpeed = 1.5;
const SPEED_MULTIPLIER = 30;
const BOOST_MULTIPLIER = 2.5; // Increased boost effect

// Global function for selecting cars
function selectCar(index) {
    if (cars.length > index) {
        activeCar = index;
        updateCameraPosition();
    }
}

// Global function for updating camera
function updateCameraPosition() {
    if (!camera || !cars[activeCar]) return;
    const car = cars[activeCar];
    const cameraOffset = new THREE.Vector3(0, 3, cameraDistance);
    cameraOffset.applyQuaternion(car.quaternion);
    camera.position.copy(car.position).add(cameraOffset);
    camera.lookAt(car.position);
}

// Global function for toggling day/night
function toggleDayNight() {
    if (!scene || !ambientLight || !directionalLight || !moonLight || !cityObjects) {
        console.warn('Scene not fully initialized yet');
        return;
    }

    isNight = !isNight;

    // Update the icon
    const timeIcon = document.querySelector('.time-icon');
    timeIcon.textContent = isNight ? '🌙' : '☀️';

    const targetColor = isNight ? NIGHT_SKY_COLOR : DAY_SKY_COLOR;
    scene.background.setHex(targetColor);
    scene.fog.color.setHex(targetColor);

    if (isNight) {
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.2;
        moonLight.visible = true;
        moonLight.intensity = 0.8;
        scene.fog.density = 0.002;
        ground.material.emissive.setHex(0x222222);
    } else {
        ambientLight.intensity = 0.4;
        directionalLight.intensity = 1;
        moonLight.visible = false;
        scene.fog.density = 0.002;
        ground.material.emissive.setHex(0x111111);
    }

    cityObjects.forEach(object => {
        if (object.userData.isBuilding) {
            object.traverse(child => {
                if (child.userData.isWindow) {
                    const colors = isNight ? WINDOW_COLORS.night : WINDOW_COLORS.day;
                    child.material.color.setHex(colors.color);
                    child.material.emissive.setHex(colors.emissive);
                    child.material.emissiveIntensity = isNight ? 1.0 : 0;
                }
            });
        }
    });
}

// Verify Three.js loaded correctly
window.addEventListener('DOMContentLoaded', function () {
    if (typeof THREE === 'undefined') {
        console.error('Failed to load Three.js');
        document.body.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,0,0,0.8); padding: 20px; border-radius: 5px; color: white;">Error: Failed to load Three.js. Please check the console for more details.</div>';
        return;
    }
    console.log('Three.js loaded successfully:', THREE.REVISION);
});

function calculateSpeed(car) {
    if (!car.userData.lastPosition) {
        car.userData.lastPosition = car.position.clone();
        return 0;
    }

    // Calculate distance moved since last frame
    const distance = car.position.distanceTo(car.userData.lastPosition);

    // Convert to MPH (multiplied by 60 for fps and scaled)
    const speedMPH = Math.round(distance * SPEED_MULTIPLIER);

    // Update last position
    car.userData.lastPosition.copy(car.position);

    return speedMPH;
}

function updateStats() {
    const car = cars[activeCar];
    if (!car) return;

    // Get current speed
    const speedMPH = calculateSpeed(car);

    // Update UI
    document.getElementById('speedValue').textContent = speedMPH;
    document.getElementById('speed-value').textContent = speedMPH;
    document.getElementById('altitude-value').textContent = Math.round(car.position.y);
    document.getElementById('score-value').textContent = Math.round(score);

    // Update boost meter
    document.querySelector('.boost-fill').style.height = boost + '%';
}


// Check if Three.js loaded properly
window.addEventListener('load', function () {
    if (typeof THREE === 'undefined') {
        console.error('Three.js failed to load');
        document.body.innerHTML += `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,0,0,0.8); padding: 20px; border-radius: 5px; color: white;">Error: Three.js failed to load. Please check your internet connection and try again.</div>`;
        return;
    }

    try {
        // Scene setup with fog for depth
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

        // Use global camera variable
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 10, 20);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: true
        });

        // Check if WebGL is available
        if (!renderer) {
            console.error('WebGL not supported');
            throw new Error('WebGL not supported');
        }

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        document.body.appendChild(renderer.domElement);

        // Enhanced lighting
        ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0001;
        scene.add(directionalLight);

        // Moon light with enhanced settings
        moonLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        moonLight.position.set(-50, 100, -50);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 4096;
        moonLight.shadow.mapSize.height = 4096;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 500;
        moonLight.shadow.bias = -0.0001;
        scene.add(moonLight);
        moonLight.visible = false;

        // Enhanced ground with better texture
        const groundSize = 200;
        const groundSegments = 100;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, groundSegments, groundSegments);
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            side: THREE.DoubleSide,
            shininess: 30,
            flatShading: true,
            emissive: 0x111111
        });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;

        // Add some terrain variation
        const vertices = ground.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            if (Math.abs(vertices[i]) > groundSize * 0.4 || Math.abs(vertices[i + 1]) > groundSize * 0.4) {
                vertices[i + 2] = Math.random() * 2;
            }
        }
        ground.geometry.attributes.position.needsUpdate = true;
        ground.geometry.computeVertexNormals();
        scene.add(ground);

        // Enhanced building creation
        function createBuilding(x, z) {
            const height = 5 + Math.random() * 30;
            const width = 4 + Math.random() * 2;
            const depth = 4 + Math.random() * 2;

            const buildingGroup = new THREE.Group();
            buildingGroup.userData.isBuilding = true;

            // Main structure with slight emissive for night
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const buildingMaterial = new THREE.MeshPhongMaterial({
                color: 0x808080 + Math.random() * 0x404040,
                shininess: 30,
                flatShading: true,
                emissive: 0x111111
            });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.y = height / 2;
            building.castShadow = true;
            building.receiveShadow = true;
            buildingGroup.add(building);

            // Roof details
            const roofGeometry = new THREE.BoxGeometry(width * 1.1, 0.5, depth * 1.1);
            const roofMaterial = new THREE.MeshPhongMaterial({
                color: 0x505050,
                shininess: 30
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = height + 0.25;
            roof.castShadow = true;
            buildingGroup.add(roof);

            // Windows
            const windowRows = Math.floor(height / 2);
            const windowCols = 3;
            const windowGeometry = new THREE.PlaneGeometry(0.6, 1);
            const windowMaterial = new THREE.MeshPhongMaterial({
                color: WINDOW_COLORS.day.color,
                emissive: WINDOW_COLORS.day.emissive,
                emissiveIntensity: 0,
                shininess: 100
            });

            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowCols; col++) {
                    if (Math.random() > 0.1) { // 90% chance of window
                        const window = new THREE.Mesh(windowGeometry, windowMaterial.clone());
                        window.position.set(
                            (col - 1) * width / 3,
                            1 + row * 2,
                            depth / 2 + 0.01
                        );
                        window.userData.isWindow = true;
                        buildingGroup.add(window);

                        // Back windows
                        const backWindow = window.clone();
                        backWindow.position.z = -depth / 2 - 0.01;
                        backWindow.rotation.y = Math.PI;
                        buildingGroup.add(backWindow);

                        // Side windows if building is wide enough
                        if (width > 5 && col % 2 === 0) {
                            const sideWindow = window.clone();
                            sideWindow.position.set(
                                width / 2 + 0.01,
                                1 + row * 2,
                                (col - 1) * depth / 3
                            );
                            sideWindow.rotation.y = Math.PI / 2;
                            buildingGroup.add(sideWindow);

                            const oppositeSideWindow = sideWindow.clone();
                            oppositeSideWindow.position.x = -width / 2 - 0.01;
                            oppositeSideWindow.rotation.y = -Math.PI / 2;
                            buildingGroup.add(oppositeSideWindow);
                        }
                    }
                }
            }

            buildingGroup.position.set(x, 0, z);
            return buildingGroup;
        }

        // Enhanced tree creation
        function createTree(x, z) {
            const treeGroup = new THREE.Group();

            // Enhanced trunk with better geometry
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
            const trunkMaterial = new THREE.MeshPhongMaterial({
                color: 0x4A3C2A,
                shininess: 5,
                flatShading: true
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            // Multiple layers of leaves for fuller appearance
            const createLeafLayer = (y, scale) => {
                const leavesGeometry = new THREE.ConeGeometry(2 * scale, 4 * scale, 8);
                const leavesMaterial = new THREE.MeshPhongMaterial({
                    color: 0x0F5F13,
                    shininess: 10,
                    flatShading: true
                });
                const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.position.y = y;
                leaves.castShadow = true;
                leaves.receiveShadow = true;
                treeGroup.add(leaves);
            };

            createLeafLayer(3, 1);
            createLeafLayer(2, 0.8);
            createLeafLayer(4, 0.6);

            treeGroup.position.set(x, 1, z);
            return treeGroup;
        }

        // Enhanced car creation
        function createCar(color) {
            const carGroup = new THREE.Group();

            // Main body with enhanced visibility
            const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4);
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 100,
                specular: 0xffffff,  // Brighter specular highlights
                emissive: color,     // Add slight glow
                emissiveIntensity: 0.2
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.castShadow = true;
            body.receiveShadow = true;
            carGroup.add(body);

            // Enhanced thrusters with stronger glow
            const thrusterGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
            const thrusterMaterial = new THREE.MeshPhongMaterial({
                color: 0xff3300,
                emissive: 0xff3300,
                emissiveIntensity: 1,
                shininess: 100
            });

            const leftThruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
            leftThruster.position.set(-1.5, 0, 1.5);
            leftThruster.rotation.x = Math.PI / 2;
            carGroup.add(leftThruster);

            const rightThruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
            rightThruster.position.set(1.5, 0, 1.5);
            rightThruster.rotation.x = Math.PI / 2;
            carGroup.add(rightThruster);

            // Enhanced particle effects
            function createThrusterParticles() {
                const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                const particleMaterial = new THREE.MeshPhongMaterial({
                    color: 0xff4400,
                    emissive: 0xff4400,
                    emissiveIntensity: 2,
                    transparent: true,
                    opacity: 0.9
                });

                // Create two particles, one for each thruster
                [-1.5, 1.5].forEach(offsetX => {
                    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

                    // Position particle behind the car's thrusters
                    const worldPosition = new THREE.Vector3();
                    carGroup.getWorldPosition(worldPosition);

                    particle.position.set(
                        worldPosition.x + offsetX * Math.cos(carGroup.rotation.y),
                        worldPosition.y,
                        worldPosition.z + offsetX * Math.sin(carGroup.rotation.y)
                    );

                    scene.add(particle);

                    // More dramatic particle animation
                    let life = 1.0;
                    let scale = 1.0;
                    function animateParticle() {
                        life -= 0.03;
                        scale += 0.1;
                        particle.material.opacity = life;
                        particle.scale.set(scale, scale, scale);

                        // Move particle backward relative to car's direction
                        particle.position.x -= Math.sin(carGroup.rotation.y) * 0.1;
                        particle.position.z += Math.cos(carGroup.rotation.y) * 0.1;
                        particle.position.y += 0.05;

                        if (life <= 0) {
                            scene.remove(particle);
                            particle.geometry.dispose();
                            particle.material.dispose();
                        } else {
                            requestAnimationFrame(animateParticle);
                        }
                    }
                    animateParticle();
                });
            }

            // Store the particle creation function
            carGroup.userData.createThrusterParticles = createThrusterParticles;

            return carGroup;
        }

        // Enhanced cloud creation
        function createCloud() {
            const cloudGroup = new THREE.Group();
            const numBlobs = 5 + Math.floor(Math.random() * 4); // More blobs for bigger clouds

            for (let j = 0; j < numBlobs; j++) {
                const cloudGeometry = new THREE.SphereGeometry(1.2 + Math.random() * 0.5, 16, 16);
                const cloudMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8,
                    flatShading: true
                });
                const cloudPiece = new THREE.Mesh(cloudGeometry, cloudMaterial);
                cloudPiece.position.set(
                    Math.random() * 2.5,
                    Math.random() * 0.8,
                    Math.random() * 2.5
                );
                cloudPiece.scale.set(
                    1.5 + Math.random() * 0.8,
                    0.8 + Math.random() * 0.4,
                    1.5 + Math.random() * 0.8
                );
                cloudGroup.add(cloudPiece);
            }

            return cloudGroup;
        }

        // Create bird function
        function createBird() {
            const bird = new THREE.Group();

            // Bird body
            const bodyGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? 0x333333 : 0x666666,
                shininess: 30
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.rotation.x = Math.PI / 2;
            bird.add(body);

            // Wings
            const wingGeometry = new THREE.PlaneGeometry(1, 0.3);
            const wingMaterial = new THREE.MeshPhongMaterial({
                color: bodyMaterial.color,
                side: THREE.DoubleSide
            });

            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(0.5, 0, 0);
            bird.add(leftWing);
            bird.userData.leftWing = leftWing;

            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(-0.5, 0, 0);
            bird.add(rightWing);
            bird.userData.rightWing = rightWing;

            // Initialize bird properties
            bird.userData.speed = 0.1 + Math.random() * 0.1;
            bird.userData.wingSpeed = 0.15 + Math.random() * 0.1;
            bird.userData.phase = Math.random() * Math.PI * 2;
            bird.userData.amplitude = 0.2 + Math.random() * 0.3;
            bird.userData.verticalSpeed = 0;
            bird.userData.verticalPhase = Math.random() * Math.PI * 2;

            return bird;
        }

        // Add buildings and trees
        cityObjects = [];
        for (let x = -90; x <= 90; x += 20) {
            for (let z = -90; z <= 90; z += 20) {
                if (Math.random() > 0.3) {
                    const building = createBuilding(x + Math.random() * 10 - 5, z + Math.random() * 10 - 5);
                    scene.add(building);
                    cityObjects.push(building);
                } else {
                    for (let i = 0; i < 3; i++) {
                        const tree = createTree(
                            x + Math.random() * 10 - 5,
                            z + Math.random() * 10 - 5
                        );
                        scene.add(tree);
                        cityObjects.push(tree);
                    }
                }
            }
        }

        // Create enhanced clouds
        clouds = [];  // Clear the array before adding new clouds
        for (let i = 0; i < 35; i++) {  // Increased number of clouds
            const cloud = createCloud();
            cloud.position.set(
                Math.random() * 200 - 100,
                15 + Math.random() * 20,  // Higher altitude range
                Math.random() * 200 - 100
            );
            cloud.userData.speed = 0.02 + Math.random() * 0.03;
            scene.add(cloud);
            clouds.push(cloud);
        }

        // Create birds
        const birds = [];
        for (let i = 0; i < 20; i++) {
            const bird = createBird();
            bird.position.set(
                Math.random() * 200 - 100,
                20 + Math.random() * 30,
                Math.random() * 200 - 100
            );
            bird.rotation.y = Math.random() * Math.PI * 2;
            scene.add(bird);
            birds.push(bird);
        }

        // Create and add cars to the scene
        carColors.forEach((color, index) => {
            const car = createCar(color);
            car.position.set(
                carPositions[index].x,
                carPositions[index].y,
                carPositions[index].z
            );
            cars.push(car);
            scene.add(car);
        });

        // Create animated characters
        function createHuman() {
            const human = new THREE.Group();

            // Body
            const bodyGeometry = new THREE.CapsuleGeometry(0.25, 1, 4, 8);
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? 0x2244aa : 0x223344,
                shininess: 30
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.8;
            human.add(body);

            // Head
            const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const headMaterial = new THREE.MeshPhongMaterial({
                color: 0xffdbac,
                shininess: 30
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 1.6;
            human.add(head);

            // Legs
            const legGeometry = new THREE.CapsuleGeometry(0.12, 0.8, 4, 8);
            const legMaterial = new THREE.MeshPhongMaterial({
                color: 0x1a1a1a,
                shininess: 30
            });

            const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
            leftLeg.position.set(0.15, 0.4, 0);
            human.add(leftLeg);
            human.userData.leftLeg = leftLeg;

            const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
            rightLeg.position.set(-0.15, 0.4, 0);
            human.add(rightLeg);
            human.userData.rightLeg = rightLeg;

            // Arms
            const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
            const armMaterial = bodyMaterial;

            const leftArm = new THREE.Mesh(armGeometry, armMaterial);
            leftArm.position.set(0.35, 1.2, 0);
            human.add(leftArm);
            human.userData.leftArm = leftArm;

            const rightArm = new THREE.Mesh(armGeometry, armMaterial);
            rightArm.position.set(-0.35, 1.2, 0);
            human.add(rightArm);
            human.userData.rightArm = rightArm;

            // Animation properties
            human.userData.speed = 0.05 + Math.random() * 0.05;
            human.userData.direction = new THREE.Vector3(1, 0, 0);
            human.userData.animationPhase = Math.random() * Math.PI * 2;

            return human;
        }

        function createAnimal() {
            const animal = new THREE.Group();

            // Body
            const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? 0x8B4513 : 0xD2B48C,
                shininess: 30
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.4;
            body.rotation.x = -Math.PI / 4;
            animal.add(body);

            // Head
            const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.set(0, 0.6, -0.4);
            animal.add(head);

            // Legs
            const legGeometry = new THREE.CapsuleGeometry(0.06, 0.4, 4, 8);
            const legs = [];
            const legPositions = [
                { x: 0.15, z: 0.2 },
                { x: -0.15, z: 0.2 },
                { x: 0.15, z: -0.2 },
                { x: -0.15, z: -0.2 }
            ];

            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, bodyMaterial);
                leg.position.set(pos.x, 0.2, pos.z);
                animal.add(leg);
                legs.push(leg);
            });
            animal.userData.legs = legs;

            // Tail
            const tailGeometry = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
            const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
            tail.position.set(0, 0.4, 0.4);
            tail.rotation.x = Math.PI / 4;
            animal.add(tail);
            animal.userData.tail = tail;

            // Animation properties
            animal.userData.speed = 0.08 + Math.random() * 0.05;
            animal.userData.direction = new THREE.Vector3(1, 0, 0);
            animal.userData.animationPhase = Math.random() * Math.PI * 2;

            return animal;
        }

        // Create and add characters to the scene
        const numHumans = 20;
        const numAnimals = 10;

        // Add humans
        for (let i = 0; i < numHumans; i++) {
            const human = createHuman();
            human.position.set(
                Math.random() * 180 - 90,
                0,
                Math.random() * 180 - 90
            );
            human.rotation.y = Math.random() * Math.PI * 2;
            scene.add(human);
            characters.push(human);
        }

        // Add animals
        for (let i = 0; i < numAnimals; i++) {
            const animal = createAnimal();
            animal.position.set(
                Math.random() * 180 - 90,
                0,
                Math.random() * 180 - 90
            );
            animal.rotation.y = Math.random() * Math.PI * 2;
            scene.add(animal);
            characters.push(animal);
        }

        // Handle keyboard input
        const keys = {
            arrowup: false,
            arrowdown: false,
            arrowleft: false,
            arrowright: false,
            w: false,
            s: false,
            q: false,
            e: false,
            shift: false
        };

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            // Fix arrow key detection
            if (key === 'arrowup' || key === 'up') {
                keys.arrowup = true;
            } else if (key === 'arrowdown' || key === 'down') {
                keys.arrowdown = true;
            } else if (key === 'arrowleft' || key === 'left') {
                keys.arrowleft = true;
            } else if (key === 'arrowright' || key === 'right') {
                keys.arrowright = true;
            } else if (key === 'w' || key === 's' || key === 'q' || key === 'e') {
                keys[key] = true;
            } else if (key === 'shift') {
                keys.shift = true;
            }
            e.preventDefault(); // Prevent default scrolling
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            // Fix arrow key detection
            if (key === 'arrowup' || key === 'up') {
                keys.arrowup = false;
            } else if (key === 'arrowdown' || key === 'down') {
                keys.arrowdown = false;
            } else if (key === 'arrowleft' || key === 'left') {
                keys.arrowleft = false;
            } else if (key === 'arrowright' || key === 'right') {
                keys.arrowright = false;
            } else if (key === 'w' || key === 's' || key === 'q' || key === 'e') {
                keys[key] = false;
            } else if (key === 'shift') {
                keys.shift = false;
            }
        });

        // Handle mouse wheel for zoom
        document.addEventListener('wheel', (e) => {
            cameraDistance = Math.max(minCameraDistance,
                Math.min(maxCameraDistance,
                    cameraDistance + e.deltaY * 0.01));
            updateCameraPosition();
        });

        // Update the game loop to include character animations
        function animate() {
            requestAnimationFrame(animate);

            // Animate clouds
            clouds.forEach(cloud => {
                // Move clouds horizontally
                cloud.position.x += (cloud.userData.speed || 0.02);

                // Reset cloud position when it goes off the map
                if (cloud.position.x > 100) {
                    cloud.position.x = -100;
                    cloud.position.z = Math.random() * 200 - 100;
                    cloud.position.y = 15 + Math.random() * 20;
                    cloud.userData.speed = 0.02 + Math.random() * 0.03;
                }
            });

            // Animate birds
            birds.forEach(bird => {
                // Update bird position
                const speed = bird.userData.speed;
                bird.position.x += Math.cos(bird.rotation.y) * speed;
                bird.position.z += Math.sin(bird.rotation.y) * speed;

                // Vertical movement
                bird.userData.verticalPhase += 0.02;
                bird.position.y += Math.sin(bird.userData.verticalPhase) * 0.05;

                // Wing flapping animation
                bird.userData.phase += bird.userData.wingSpeed;
                const wingAngle = Math.sin(bird.userData.phase) * bird.userData.amplitude;
                bird.userData.leftWing.rotation.z = wingAngle;
                bird.userData.rightWing.rotation.z = -wingAngle;

                // Check boundaries and change direction
                const boundary = 100;
                if (Math.abs(bird.position.x) > boundary ||
                    Math.abs(bird.position.z) > boundary ||
                    Math.random() < 0.005) {
                    // Random new direction
                    const newAngle = Math.random() * Math.PI * 2;
                    bird.rotation.y = newAngle;
                    // Smooth turn
                    const turnSpeed = 0.1;
                    bird.rotation.y += (newAngle - bird.rotation.y) * turnSpeed;
                }

                // Keep birds within vertical bounds
                if (bird.position.y < 15) bird.position.y = 15;
                if (bird.position.y > 50) bird.position.y = 50;
            });

            // Animate characters (humans and animals)
            characters.forEach(character => {
                // Update position based on direction and speed
                character.position.x += character.userData.direction.x * character.userData.speed;
                character.position.z += character.userData.direction.z * character.userData.speed;

                // Update animation phase
                character.userData.animationPhase += character.userData.speed * 5;

                // Animate legs and arms for humans
                if (character.userData.leftLeg) {  // This means it's a human
                    // Walking animation for legs
                    character.userData.leftLeg.rotation.x = Math.sin(character.userData.animationPhase) * 0.5;
                    character.userData.rightLeg.rotation.x = Math.sin(character.userData.animationPhase + Math.PI) * 0.5;

                    // Arm swing animation
                    character.userData.leftArm.rotation.x = Math.sin(character.userData.animationPhase + Math.PI) * 0.5;
                    character.userData.rightArm.rotation.x = Math.sin(character.userData.animationPhase) * 0.5;
                } else if (character.userData.legs) {  // This means it's an animal
                    // Animate animal legs
                    character.userData.legs.forEach((leg, index) => {
                        const phase = character.userData.animationPhase + (index * Math.PI / 2);
                        leg.rotation.x = Math.sin(phase) * 0.3;
                    });

                    // Animate tail
                    if (character.userData.tail) {
                        character.userData.tail.rotation.z = Math.sin(character.userData.animationPhase * 2) * 0.2;
                    }
                }

                // Check boundaries and change direction
                const boundary = 90;  // City boundary
                if (Math.abs(character.position.x) > boundary || Math.abs(character.position.z) > boundary || Math.random() < 0.01) {
                    // Random new direction
                    const angle = Math.random() * Math.PI * 2;
                    character.userData.direction.x = Math.cos(angle);
                    character.userData.direction.z = Math.sin(angle);

                    // Rotate character model to face movement direction
                    character.rotation.y = angle;

                    // Randomly adjust speed
                    character.userData.speed = (0.05 + Math.random() * 0.05) * (Math.random() < 0.3 ? 2 : 1); // 30% chance to run
                }

                // Avoid buildings
                cityObjects.forEach(object => {
                    if (object.userData.isBuilding) {
                        const dx = object.position.x - character.position.x;
                        const dz = object.position.z - character.position.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);

                        if (distance < 5) {  // If too close to a building
                            // Turn away from building
                            const angle = Math.atan2(-dz, -dx);
                            character.userData.direction.x = Math.cos(angle);
                            character.userData.direction.z = Math.sin(angle);
                            character.rotation.y = angle;
                        }
                    }
                });
            });

            const car = cars[activeCar];

            // Calculate boost effect
            const boostActive = keys.shift && boost > 0;
            const speedMultiplier = boostActive ? BOOST_MULTIPLIER : 1;

            // Forward/Backward movement with boost effect
            if (keys.arrowup || keys.arrowdown) {
                const direction = keys.arrowup ? -1 : 1;
                // Faster acceleration when boosting
                const currentAcceleration = boostActive ? acceleration * 1.5 : acceleration;
                currentSpeed = Math.min(maxSpeed, currentSpeed + currentAcceleration);
                car.translateZ(direction * currentSpeed * speedMultiplier * 0.3);

                // Create particles more frequently when moving
                if (Math.random() > 0.3) { // Increased frequency
                    car.userData.createThrusterParticles();
                }
                if (boostActive) {
                    // Even more particles when boosting
                    car.userData.createThrusterParticles();
                    car.userData.createThrusterParticles();
                }
            } else {
                // Slower deceleration when no keys are pressed
                currentSpeed = Math.max(0, currentSpeed - deceleration);
                if (currentSpeed > 0) {
                    car.translateZ(-currentSpeed * speedMultiplier * 0.3);
                }
            }

            // Turning with better response
            if (keys.arrowleft) {
                car.rotation.y += rotationSpeed * (currentSpeed + 0.5);
            }
            if (keys.arrowright) {
                car.rotation.y -= rotationSpeed * (currentSpeed + 0.5);
            }

            // Vertical movement (Up/Down thrust) with improved physics
            if (keys.w) {
                verticalSpeed = Math.min(verticalSpeed + THRUST, 1.5);
                car.position.y += verticalSpeed;
                // Create particles when thrusting upward
                if (Math.random() > 0.3) {
                    car.userData.createThrusterParticles();
                }
            } else if (keys.s && car.position.y > minAltitude + 0.5) {
                verticalSpeed = Math.max(verticalSpeed - THRUST, -1.5);
                car.position.y += verticalSpeed;
            } else {
                // Apply drag when no vertical input
                verticalSpeed *= (1 - DRAG);
                car.position.y += verticalSpeed;
            }

            // Apply gravity with smoother fall
            if (car.position.y > minAltitude) {
                verticalSpeed -= GRAVITY;
            } else {
                verticalSpeed = Math.max(0, verticalSpeed);
                car.position.y = minAltitude;
            }

            // Enforce altitude limits with bounce effect
            if (car.position.y > maxAltitude) {
                car.position.y = maxAltitude;
                verticalSpeed = -verticalSpeed * 0.5;
            } else if (car.position.y < minAltitude) {
                car.position.y = minAltitude;
                verticalSpeed = 0;
            }

            // Tilt controls with improved response
            if (keys.q) {
                car.rotation.z = Math.min(maxTilt, car.rotation.z + tiltSpeed * (currentSpeed + 0.5));
            }
            if (keys.e) {
                car.rotation.z = Math.max(-maxTilt, car.rotation.z - tiltSpeed * (currentSpeed + 0.5));
            }
            if (!keys.q && !keys.e) {
                car.rotation.z *= 0.9; // Faster auto-level when not tilting
            }

            // Update boost meter and create boost effects
            if (boostActive && (keys.arrowup || keys.arrowdown)) {
                boost = Math.max(0, boost - 1);
                // Add score bonus when boosting
                score += currentSpeed * 0.02;

                // Create particles more frequently when boosting
                if (Math.random() > 0.3) {
                    car.userData.createThrusterParticles();
                }
            } else {
                // Regenerate boost more slowly
                boost = Math.min(100, boost + 0.3);
            }

            // Calculate actual speed including boost
            const actualSpeed = Math.round((currentSpeed * speedMultiplier + Math.abs(verticalSpeed)) * SPEED_MULTIPLIER);

            // Update speed displays
            document.getElementById('speedValue').textContent = actualSpeed;
            document.getElementById('speed-value').textContent = actualSpeed;

            // Update boost meter with smooth transition
            document.querySelector('.boost-fill').style.height = boost + '%';
            document.querySelector('.boost-fill').style.background = boostActive ?
                'linear-gradient(to top, #ff4d4d, #ff9933)' :
                'linear-gradient(to top, #4CAF50, #45a049)';

            // Update stats
            document.getElementById('altitude-value').textContent = Math.round(car.position.y);
            document.getElementById('score-value').textContent = Math.round(score);

            // Update camera and render
            updateCameraPosition();
            renderer.render(scene, camera);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Start the game
        animate();

        // Add a spotlight to follow the car
        const spotlight = new THREE.SpotLight(0xffffff, 1);
        spotlight.position.set(0, 20, 0);
        spotlight.angle = Math.PI / 4;
        spotlight.penumbra = 0.1;
        spotlight.decay = 2;
        spotlight.distance = 200;
        spotlight.castShadow = true;
        scene.add(spotlight);

        // Update spotlight position in animate loop
        spotlight.position.copy(cars[activeCar].position);
        spotlight.position.y += 20;
        spotlight.target = cars[activeCar];

    } catch (error) {
        console.error('Error initializing game:', error);
        document.body.innerHTML += `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,0,0,0.8); padding: 20px; border-radius: 5px; color: white;">Error loading game: ${ error.message }</div>`;
    }
});
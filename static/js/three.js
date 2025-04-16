// Import Three.js dynamically

let THREE;

async function loadThreeJS() {
    try {
        const module = await import('https://unpkg.com/three@0.128.0/build/three.module.js');
        THREE = module;
        console.log('La bibliothèque Three.js a été chargée avec succès');
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement de la bibliothèque Three.js:', error);
        return false;
    }
}

// Three.js configuration
const threeConfig = {
    busHeight: 0.1,      
    busWidth: 0.1,       
    busLength: 0.2,      
    busScale: 0.1,    
    markerOpacity: 1.0
};

// Three.js variables
let threeScene;
let threeCamera;
let threeRenderer;
let threeMarkers = {};
let simpleBusModel = null;
let threeContainer = null;

// Function to initialize Three.js
async function initThreeJS() {
    console.log("Initialisation du modèle 3D...");

    // Load Three.js
    const loaded = await loadThreeJS();
    if (!loaded) {
        console.error('Impossible d\'initialiser Three.js');
        return;
    }
    
    // Create a container for Three.js
    threeContainer = document.createElement('div');
    threeContainer.id = 'three-container';
    threeContainer.style.position = 'absolute';
    threeContainer.style.top = '0';
    threeContainer.style.left = '0';
    threeContainer.style.width = '100%';
    threeContainer.style.height = '100%';
    threeContainer.style.pointerEvents = 'none';
    threeContainer.style.zIndex = '1';
    document.getElementById('map').appendChild(threeContainer);

    // Initialize Three.js scene
    threeScene = new THREE.Scene();
    
    // Initialize camera with correct FOV and aspect ratio
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    threeCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
    
    // Initialize renderer with proper settings
    threeRenderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true,
        canvas: document.createElement('canvas')
    });
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setClearColor(0x000000, 0);
    threeContainer.appendChild(threeRenderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    threeScene.add(directionalLight);

    // Create the simple bus model
    createSimpleBusModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
    
    console.log('Modèle 3D initialisé avec succès');
}

// Handle window resize
function onWindowResize() {
    threeCamera.aspect = window.innerWidth / window.innerHeight;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Function to create a simple bus model
function createSimpleBusModel() {
    console.log("Création du modèle de bus rectangulaire");
    
    simpleBusModel = new THREE.Group();

    // Bus body (simple rectangle)
    const bodyGeometry = new THREE.BoxGeometry(
        threeConfig.busLength,
        threeConfig.busHeight,
        threeConfig.busWidth
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFFFFF,
        transparent: false,
        opacity: threeConfig.markerOpacity,
        side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Positionner le bus au-dessus du sol
    body.position.y = threeConfig.busHeight;
    simpleBusModel.add(body);

    // Scale the entire model
    simpleBusModel.scale.set(threeConfig.busScale, threeConfig.busScale, threeConfig.busScale);
}

// Animation loop for Three.js
function animate() {
    requestAnimationFrame(animate);
    if (map) {
        updateThreeCamera();
    }
    threeRenderer.render(threeScene, threeCamera);
}

// Update Three.js camera based on map position
function updateThreeCamera() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();
    
    // Convert to mercator coordinates
    const mercator = mapboxgl.MercatorCoordinate.fromLngLat(center, 0);
    const scale = Math.pow(2, zoom);

    // Update camera position
    threeCamera.position.set(
        mercator.x,
        mercator.y,
        mercator.z + (1 / scale) // Plus proche
    );

    // Update camera rotation
    const pitchRadians = pitch * Math.PI / 180;
    const bearingRadians = bearing * Math.PI / 180;
    
    threeCamera.rotation.x = pitchRadians;
    threeCamera.rotation.y = 0;
    threeCamera.rotation.z = -bearingRadians;
}

// Function to create a 3D marker
function createThreeMarker(coordinates, status) {
    const marker = simpleBusModel.clone();
    
    // Set color based on status
    marker.traverse((child) => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color = new THREE.Color(busConfig.colors[status] || busConfig.colors.default);
        }
    });
    
    // Convert coordinates to mercator
    const mercator = mapboxgl.MercatorCoordinate.fromLngLat(coordinates, 0);
    
    // Position the marker
    marker.position.set(
        mercator.x,
        mercator.y,
        mercator.z + 0.005 // Plus haut au-dessus du sol
    );

    // Scale based on zoom level
    const zoom = map.getZoom();
    const scale = Math.pow(2, zoom - 15) * threeConfig.busScale;
    marker.scale.set(scale, scale, scale);

    // Rotate marker to face the direction of travel
    marker.rotation.x = 0;  // Pas de rotation en X
    marker.rotation.y = map.getBearing() * Math.PI / 180;
    
    return marker;
}

// Function to update 3D markers
function updateThreeMarkers(features) {
    // Remove old markers
    Object.values(threeMarkers).forEach(marker => {
        threeScene.remove(marker);
    });
    threeMarkers = {};

    // Add new markers
    features.forEach(feature => {
        const coordinates = feature.geometry.coordinates;
        const status = feature.properties.status;
        const busId = feature.properties.bus_id;

        const marker = createThreeMarker(coordinates, status);
        threeScene.add(marker);
        threeMarkers[busId] = marker;
    });
}

// Export functions and variables needed by map.js
window.initThreeJS = initThreeJS;
window.updateThreeMarkers = updateThreeMarkers;
window.updateThreeCamera = updateThreeCamera; 
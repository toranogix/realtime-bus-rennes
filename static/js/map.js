
// Map configuration
const mapConfig = {
    container: 'map',
    style: 'mapbox://styles/karmadc/cm8tk145000fy01s74mh1fxzc',
    center: [-1.6778, 48.1173],
    zoom: 12,
    pitch: 45,
    bearing: 0,
    antialias: true
};

// Bus configuration
const busConfig = {
    colors: {
        'En ligne': '#4CAF50',
        'Hors-service': '#F44336',
        'En retard': '#FFC107',
        'Inconnu': '#999999',
        'default': '#FFFFFF'
    },
    size: 8,
    height: 20,
    animationDuration: 5000
};

// URL de l'API STAR
const API_URL = "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-vehicules-position-tr/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326";

let map;
let busSource;
let busPositions = {};
let lastUpdateTime = null;

// Function to initialize the map
function initMap() {
    map = new mapboxgl.Map(mapConfig);

    map.on('load', () => {
        
        map.addControl(new mapboxgl.NavigationControl());
        map.addControl(new mapboxgl.ScaleControl());

        setupBusSource();
        setupInteractions();
        setupSearch();
        updateBusData();
    });

    map.on('error', (e) => {
        console.error('Erreur de la carte:', e);
    });
}

// Function to setup the bus source
function setupBusSource() {
    
    map.addSource('buses', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        'id': 'buses-layer',
        'type': 'circle',
        'source': 'buses',
        'paint': {
            'circle-radius': busConfig.size,
            'circle-color': [
                'match',
                ['get', 'status'],
                'En ligne', busConfig.colors['En ligne'],
                'Hors-service', busConfig.colors['Hors-service'],
                'En retard', busConfig.colors['En retard'],
                'Inconnu', busConfig.colors['Inconnu'],
                busConfig.colors.default
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });
}

// Function to setup the interactions
function setupInteractions() {
    map.on('click', 'buses-layer', (e) => {
        if (e.features.length > 0) {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;
            
            const description = `
                <div class="bus-popup">
                    <h3><i class="fas fa-bus"></i> Bus ${properties.line_name || 'N/A'}</h3>
                    <p><i class="fas fa-compass"></i><strong>Direction:</strong> ${properties.direction || 'N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i><strong>Destination:</strong> ${properties.destination || 'N/A'}</p>
                    <p><i class="fas fa-info-circle"></i><strong>Statut:</strong> ${properties.status}</p>
                    <p><i class="fas fa-clock"></i><strong>Retard:</strong> ${properties.delay_seconds || 0} secondes</p>
                </div>
            `;

            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
        }
    });

    map.on('mouseenter', 'buses-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'buses-layer', () => {
        map.getCanvas().style.cursor = '';
    });
}

// Function to setup the search
function setupSearch() {
    const searchInput = document.getElementById('bus-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const source = map.getSource('buses');
        if (!source || !source._data) return;
        
        const features = source._data.features;
        const filteredFeatures = features.filter(feature => {
            const properties = feature.properties;
            return (properties.line_name && properties.line_name.toLowerCase().includes(searchTerm)) ||
                   (properties.destination && properties.destination.toLowerCase().includes(searchTerm));
        });

        source.setData({
            type: 'FeatureCollection',
            features: filteredFeatures
        });
    });
}

// Function to update the bus data
function updateBusData() {
    
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            
            // Process the received GeoJSON directly
            const features = data.features.map(feature => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    bus_id: feature.properties.idbus,
                    line_name: feature.properties.nomcourtligne,
                    direction: feature.properties.sens === 0 ? "Aller" : feature.properties.sens === 1 ? "Retour" : "N/A",
                    destination: feature.properties.destination,
                    status: Array.isArray(feature.properties.etat) ? feature.properties.etat[0] : feature.properties.etat || 'Inconnu',
                    delay_seconds: feature.properties.ecartsecondes
                }
            }));

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            if (!map.getSource('buses')) {
                console.error("Source 'buses' non trouvée");
                return;
            }
            
            map.getSource('buses').setData(geojson);
            updateStats(features);
            
            lastUpdateTime = new Date();
            const lastUpdateElement = document.getElementById('last-update');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = lastUpdateTime.toLocaleTimeString();
            }
        })

        // If error, log the error
        .catch(error => {
            console.error('Erreur lors de la mise à jour des bus:', error);
        });
}
// Function to update the stats
function updateStats(features) {
    const stats = {
        total: features.length,
        delayed: features.filter(f => f.properties.status === 'En retard').length,
        outOfService: features.filter(f => f.properties.status === 'Hors-service').length
    };

    const elements = {
        total: document.getElementById('total-buses'),
        delayed: document.getElementById('delayed-buses'),
        outOfService: document.getElementById('out-of-service')
    };

    if (elements.total) elements.total.textContent = stats.total;
    if (elements.delayed) elements.delayed.textContent = stats.delayed;
    if (elements.outOfService) elements.outOfService.textContent = stats.outOfService;
}

// Update every 5 seconds
setInterval(updateBusData, 5000);

// Export the necessary functions
window.initMap = initMap;
window.updateBusData = updateBusData; 
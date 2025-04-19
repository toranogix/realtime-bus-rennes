// Map configuration
const mapConfig = {
    container: 'map',
    style: 'mapbox://styles/karmadc/cm8tk145000fy01s74mh1fxzc', // perso mapbox style
    
    center: [-1.6778, 48.1173],
    zoom: 11.5, 
    pitch: 30,
    bearing: -30,
    antialias: true,
    maxZoom: 18,
    minZoom: 9
};



// Bus configuration
const busConfig = {
    colors: {
        'En ligne': '#4CAF50',
        'Hors-service': '#F44336',
        'En retard': '#FFC107',
        'Inconnu': '#999999',
        'default': '#4CAF50'
    },
    size: 8,
    height: 20,
    animationDuration: 5000,
    minSpeed: 5, // vitesse minimale en km/h
    maxSpeed: 50 // vitesse maximale en km/h
};

// URLs de l'API STAR
const API_URLS = {
    BUS_POSITION: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-vehicules-position-tr/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326",
    BUS_LANES: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-parcours-td/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326",
    TRAFFIC_ALERTS: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-busmetro-trafic-alertes-tr/records?limit=-1",
    BUS_ICONS: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-lignes-pictogrammes-dm/records?limit=-1",
    BUS_PASSAGES: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?limit=-1",
    BUS_STOPS: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-pointsarret-td/records?limit=-1"
};



// Initialize global variables
let map;
let lastUpdateTime = null;
let busIcons = new Map(); 
let busPositions = new Map(); // Store previous bus positions
let busPassages = new Map(); // Store bus passages
let animationFrameId = null; // For handling animation
let lastAnimationTime = 0; // For tracking animation time
let busStops = new Map(); // Add a Map to store bus stops
let lastBusPositions = new Map(); // Store the latest known bus positions
const ANIMATION_DURATION = 5000; // Animation duration in milliseconds




// Initialize info widget
function initInfoWidget() {

    const infoWidget = document.getElementById('info-widget');
    const infoToggle = document.getElementById('info-toggle');
    const closeButton = infoWidget.querySelector('.toggle-button');
    
    // Hide the widget by default
    infoWidget.style.display = 'none';
    
    // Toggle widget visibility
    infoToggle.addEventListener('click', (me) => {
        me.stopPropagation();
        const isVisible = infoWidget.style.display === 'block';
        
        infoWidget.style.display = isVisible ? 'none' : 'block';
        infoToggle.classList.toggle('active', !isVisible);
        
        // Log for debugging
        console.log('Bouton info cliqué:', !isVisible);
    });
    
    closeButton.addEventListener('click', () => {
        infoWidget.style.display = 'none';
        infoToggle.classList.remove('active');
    });
    
    // Close widget when clicking outside
    document.addEventListener('click', (me) => {
        if (infoWidget.style.display === 'block' && 
            !infoWidget.contains(me.target) && 
            me.target !== infoToggle) {
            infoWidget.style.display = 'none';
            infoToggle.classList.remove('active');
        }
    });
    
    // Prevent clicks inside widget from closing the widget
    infoWidget.addEventListener('click', (me) => {
        me.stopPropagation();
    });
}



// Initialize alerts widget
function initAlertsWidget() {
    const alertsWidget = document.getElementById('alerts-widget');
    const alertsToggle = document.getElementById('alerts-toggle');
    const closeButton = alertsWidget.querySelector('.toggle-button');
    const alertsContent = document.getElementById('traffic-alerts-widget');

    console.log('Initialisation du widget d\'alertes:', {
        alertsWidget: alertsWidget ? 'Trouvé' : 'Non trouvé',
        alertsToggle: alertsToggle ? 'Trouvé' : 'Non trouvé',
        closeButton: closeButton ? 'Trouvé' : 'Non trouvé',
        alertsContent: alertsContent ? 'Trouvé' : 'Non trouvé'
    });

    // Hide the widget by default
    alertsWidget.style.display = 'none';
    
    // Toggle widget visibility
    alertsToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = alertsWidget.style.display === 'block';
        console.log('Bouton alertes cliqué. État actuel:', isVisible ? 'visible' : 'masqué');
        
        alertsWidget.style.display = isVisible ? 'none' : 'block';
        alertsToggle.classList.toggle('active', !isVisible);
        
        if (!isVisible) {
            // Update alerts when showing the widget
            updateTrafficAlerts();
        }
        
        console.log('Nouvel état du widget:', alertsWidget.style.display);
    });
    
    // Close button functionality
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            alertsWidget.style.display = 'none';
            alertsToggle.classList.remove('active');
            console.log('Widget d\'alertes fermé via bouton fermer');
        });
    }
    
    // Close widget when clicking outside
    document.addEventListener('click', function(e) {
        if (alertsWidget.style.display === 'block' && 
            !alertsWidget.contains(e.target) && 
            e.target !== alertsToggle) {
            alertsWidget.style.display = 'none';
            alertsToggle.classList.remove('active');
            console.log('Widget d\'alertes fermé (clic extérieur)');
        }
    });
    
    // Prevent clicks inside widget from closing it
    alertsWidget.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Initial update of traffic alerts
    updateTrafficAlerts();
    console.log('Mise à jour initiale des alertes effectuée');
}


// Function to search for a bus line in the alerts widget
function searchBusLine(lineName) {
    const alertsWidget = document.getElementById('alerts-widget');
    const alertsContent = document.getElementById('traffic-alerts-widget');
    
    if (!alertsWidget || !alertsContent) {
        console.error('Widget d\'alertes non trouvé');
        return;
    }
    
    
    
    
}




// Function to load bus icons
async function loadBusIcons() {
    try {
        const response = await fetch(API_URLS.BUS_ICONS);
        const data = await response.json();
        


        // For each pictogram, we use the 30x30 version
        const iconPromises = data.results
            .filter(item => item.resolution === "1:30" && item.image && item.image.url)
            .map(item => new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";  // NB : Important pour gérer l'erreur CORS !!!
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageId = `bus-icon-${item.idligne}`;
                    if (!map.hasImage(imageId)) {
                        map.addImage(imageId, ctx.getImageData(0, 0, img.width, img.height));
                    }
                    busIcons.set(item.idligne, imageId);
                    resolve();
                };
                
                img.onerror = () => {
                    console.warn('Impossible de charger l\'icône pour la ligne ' + item.idligne);
                    resolve(); // On continue même en cas d'erreur !!!
                };
                
                img.src = item.image.url;
            }));
        
        await Promise.all(iconPromises);
        console.log("Pictogrammes de bus chargés:", busIcons.size);
        
    } catch (error) {
        console.error('Erreur lors du chargement des pictogrammes:', error);
    }
}

// Function to initialize the map
function initMap() {
    map = new mapboxgl.Map(mapConfig);

    map.on('load', () => {
        console.log("Carte chargée, initialisation des contrôles...");
        
        // Initialize info and widget
        initInfoWidget();
        initAlertsWidget();
        
        // Navigation controls
        const zoomInButton = document.getElementById('zoom-in');
        const zoomOutButton = document.getElementById('zoom-out');
        const rotateButton = document.getElementById('rotate');

        zoomInButton.addEventListener('click', () => {
            map.zoomIn();
        });

        zoomOutButton.addEventListener('click', () => {
            map.zoomOut();
        });

        let isRotating = false;
        rotateButton.addEventListener('click', () => {
            if (!isRotating) {
                map.rotateTo(map.getBearing() + 90, { duration: 1000 });
            } else {
                map.rotateTo(0, { duration: 1000 });
            }
            isRotating = !isRotating;
            rotateButton.classList.toggle('active');
        });

        map.addControl(new mapboxgl.ScaleControl());

        // 1. Add sources first
        // Bus lines source
        map.addSource('bus-lanes', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Bus stops source
        map.addSource('bus-stops', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Bus source
        map.addSource('buses', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // 2. Add layers in order: lines, stops, buses
        // Bus lines layer
        map.addLayer({
            'id': 'bus-lanes-layer',
            'type': 'line',
            'source': 'bus-lanes',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': 'visible'
            },
            'paint': {
                'line-color': [
                    'case',
                    ['has', 'couleurtrace'],
                    ['get', 'couleurtrace'],
                    '#888888'
                ],
                'line-width': 3,
                'line-opacity': 0.7
            }
        });

        // Bus stops
        map.addLayer({
            'id': 'bus-stops-layer',
            'type': 'circle',
            'source': 'bus-stops',
            'paint': {
                'circle-radius': 4,
                'circle-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#4CAF50',
                'circle-opacity': 0.9,
                'circle-stroke-opacity': 1
            },
            'filter': ['!=', ['get', 'mobilier'], 'Poteau']
        });

        // Bus stops
        map.addLayer({
            'id': 'bus-stops-poles-layer',
            'type': 'circle',
            'source': 'bus-stops',
            'paint': {
                'circle-radius': 3,
                'circle-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFA000',
                'circle-opacity': 0.9,
                'circle-stroke-opacity': 1
            },
            'filter': ['==', ['get', 'mobilier'], 'Poteau']
        });

        // Bus layer
        map.addLayer({
            'id': 'buses-fallback-layer',
            'type': 'circle',
            'source': 'buses',
            'filter': [
                'all',
                ['!=', ['get', 'status'], 'Hors-service'],
                ['!', ['has', 'icon_id']]
            ],
            'paint': {
                'circle-radius': busConfig.size,
                'circle-color': [
                    'match',
                    ['get', 'status'],
                    'En ligne', busConfig.colors['En ligne'],
                    'En retard', busConfig.colors['En retard'],
                    'Inconnu', busConfig.colors['Inconnu'],
                    busConfig.colors.default
                ],
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        map.addLayer({
            'id': 'buses-layer',
            'type': 'symbol',
            'source': 'buses',
            'filter': [
                'all',
                ['!=', ['get', 'status'], 'Hors-service'],
                ['has', 'icon_id']
            ],
            'layout': {
                'icon-image': ['get', 'icon_id'],
                'icon-size': 0.8,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map'
            }
        });

        setupInteractions();
        setupSearch();

        // Add data in order
        console.log("Chargement des données...");
        Promise.all([
            loadBusIcons(),
            loadBusStops(),
            fetchBusLanes()
        ]).then(() => {
            console.log("Mise à jour des couches...");
            updateBusStopsLayer();
            updateBusData();
            updateTrafficAlerts();
            restorePanelStates();
        }).catch(error => {
            console.error("Erreur lors du chargement initial:", error);
        });
    });

    map.on('error', (e) => {
        console.error('Erreur affichage de la carte:', e);
    });
}

// Function to setup the interactions
function setupInteractions() {
    let currentPopup = null;
    let hoverPopup = null;
    let hoverTimeout = null;
    
    function clearHoverPopup() {
        if (hoverPopup) {
            hoverPopup.remove();
            hoverPopup = null;
        }
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    }
    // Bus markers popup ===> onhover (survol)
    map.on('mouseenter', ['buses-layer', 'buses-fallback-layer'], (me) => {
        if (!me.features.length) return;
        clearHoverPopup();

        const coordinates = me.features[0].geometry.coordinates.slice();
        const properties = me.features[0].properties;

        // Mini popup au survol
        const hoverDescription = `
            <div class="hover-popup">
                <div class="hover-header" style="background-color: ${busConfig.colors[properties.status] || busConfig.colors.default}">
                    <span class="line-number">Bus ${properties.line_name || 'N/A'}</span>
                </div>
                <div class="hover-content">
                    <span class="destination">${properties.destination || 'N/A'}</span>
                </div>
            </div>
        `;

        hoverPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'hover-popup-container',
            offset: 15
        })
            .setLngLat(coordinates)
            .setHTML(hoverDescription)
            .addTo(map);

        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', ['buses-layer', 'buses-fallback-layer'], () => {
        clearHoverPopup();
        map.getCanvas().style.cursor = '';
    });

    // Bus markers popup ===> onclick
    map.on('click', ['buses-layer', 'buses-fallback-layer'], (me) => {
        if (me.features.length > 0) {
            if (currentPopup) currentPopup.remove();
            clearHoverPopup();

            const coordinates = me.features[0].geometry.coordinates.slice();
            const properties = me.features[0].properties;
            
            const retard = properties.delay_seconds || 0;
            const retardText = retard === 0 ? 'À l\'heure' : 
                             retard < 60 ? retard + ' secondes' :
                             Math.floor(retard/60) + ' min ' + retard%60 + ' sec';
            
            // Add progress and speed information
            const progressText = properties.progress ? properties.progress + '%' : 'N/A';
            //const speedText = properties.speed ? properties.speed + ' km/h' : 'N/A';
            const nextStopText = properties.nextStop || 'N/A';
            
            const description = `
                <div class="popup-container animated fadeIn">
                    <div class="popup-header" style="background-color: ${busConfig.colors[properties.status] || busConfig.colors.default}">
                        <h3><i class="fas fa-bus"></i> Bus ${properties.line_name || 'N/A'}</h3>
                    </div>
                    <div class="popup-content">
                        <p><i class="fas fa-compass"></i><strong>Direction:</strong> ${properties.direction || 'N/A'}</p>
                        <p><i class="fas fa-map-marker-alt"></i><strong>Destination:</strong> ${properties.destination || 'N/A'}</p>
                        <p><i class="fas fa-info-circle"></i><strong>Statut:</strong> ${properties.status}</p>
                        <p><i class="fas fa-clock"></i><strong>Retard:</strong> ${retardText}</p>
                        <p><i class="fas fa-running"></i><strong>Progression:</strong> ${progressText}</p>
                        <p><i class="fas fa-stop"></i><strong>Prochain arrêt:</strong> ${nextStopText}</p>
                    </div>
                </div>
            `;

            currentPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                className: 'custom-popup',
                maxWidth: '300px',
                offset: 15
            })
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
        }
    });

    // Bus lanes popup ===> onhover (survol)
    map.on('mouseenter', 'bus-lanes-layer', (me) => {
        if (!me.features.length) return;
        clearHoverPopup();

        const coordinates = me.lngLat;
        const properties = me.features[0].properties;

        const hoverDescription = `
            <div class="hover-popup">
                <div class="hover-header" style="background-color: ${properties.couleurtrace || '#888888'}">
                    <span class="line-number">Ligne ${properties.nomcourtligne || 'N/A'}</span>
                </div>
                <div class="hover-content">
                    <span class="destination">${properties.type || 'N/A'}</span>
                </div>
            </div>
        `;

        hoverPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'hover-popup-container',
            offset: 5
        })
            .setLngLat(coordinates)
            .setHTML(hoverDescription)
            .addTo(map);

        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'bus-lanes-layer', () => {
        clearHoverPopup();
        map.getCanvas().style.cursor = '';
    });

    
    // Bus lanes popup ===> onclick
    map.on('click', 'bus-lanes-layer', (me) => {
        if (me.features.length > 0) {
            if (currentPopup) currentPopup.remove();
            clearHoverPopup();

            const coordinates = me.lngLat;
            const properties = me.features[0].properties;
            
            const routeText = properties.libellelong ? 
                properties.libellelong.replace(/\\u00e9/g, 'é')
                    .replace(/\\u00e8/g, 'è')
                    .replace(/\\u00e0/g, 'à') : 'N/A';

            const description = `
                <div class="popup-container animated fadeIn">
                    <div class="popup-header" style="background-color: ${properties.couleurtrace || '#888888'}">
                        <h3><i class="fas fa-route"></i> Ligne ${properties.nomcourtligne || 'N/A'}</h3>
                    </div>
                    <div class="popup-content">
                        <p><i class="fas fa-info-circle"></i><strong>Type:</strong> ${properties.type || 'N/A'}</p>
                        <p><i class="fas fa-map-signs"></i><strong>Direction:</strong> ${properties.senscommercial || 'N/A'}</p>
                        <p><i class="fas fa-road"></i><strong>Itinéraire:</strong> ${routeText}</p>
                        <p><i class="fas fa-ruler"></i><strong>Distance:</strong> ${Math.round(properties.longueur/100)/10} km</p>
                        <p><i class="fas fa-wheelchair"></i><strong>Accessible PMR:</strong> ${properties.estaccessiblepmr === 'oui' ? 'Oui' : 'Non'}</p>
                    </div>
                </div>
            `;

            currentPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                className: 'custom-popup',
                maxWidth: '300px',
                offset: 5
            })
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
        }
    });


    // Bus stops popup ===> onhover
    map.on('mouseenter', 'bus-stops-layer', (me) => {
        if (!me.features.length) return;
        clearHoverPopup();

        const coordinates = me.features[0].geometry.coordinates.slice();
        const properties = me.features[0].properties;

        // Mini popup au survol
        const hoverDescription = `
            <div class="hover-popup">
                <div class="hover-header" style="background-color: ${properties.mobilier === 'Poteau' ? '#FFA000' : '#4CAF50'}">
                    <span class="line-number">${properties.name || 'N/A'}</span>
                </div>
                <div class="hover-content">
                    <span class="destination">${properties.commune || 'N/A'}</span>
                </div>
            </div>
        `;

        hoverPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'hover-popup-container',
            offset: 15
        })
            .setLngLat(coordinates)
            .setHTML(hoverDescription)
            .addTo(map);

        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'bus-stops-layer', () => {
        clearHoverPopup();
        map.getCanvas().style.cursor = '';
    });

    map.on('click', 'bus-stops-layer', (me) => {
        if (me.features.length > 0) {
            if (currentPopup) currentPopup.remove();
            clearHoverPopup();

            const coordinates = me.features[0].geometry.coordinates.slice();
            const properties = me.features[0].properties;

            const description = `
                <div class="popup-container animated fadeIn">
                    <div class="popup-header" style="background-color: ${properties.mobilier === 'Poteau' ? '#FFA000' : '#4CAF50'}">
                        <h3><i class="fas fa-bus-simple"></i> ${properties.name || 'N/A'}</h3>
                    </div>
                    <div class="popup-content">
                        <p><i class="fas fa-map-marker-alt"></i><strong>Commune:</strong> ${properties.commune || 'N/A'}</p>
                        <p><i class="fas fa-info-circle"></i><strong>Type:</strong> ${properties.mobilier || 'N/A'}</p>
                        <p><i class="fas fa-wheelchair"></i><strong>Accessible PMR:</strong> ${properties.accessible ? 'Oui' : 'Non'}</p>
                    </div>
                </div>
            `;

            currentPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                className: 'custom-popup',
                maxWidth: '300px',
                offset: 15
            })
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
        }
    });
}

// Function to setup the search 
function setupSearch() {
    const searchWidget = document.querySelector('.search-widget');
    const searchInput = document.getElementById('bus-search');
    const searchIcon = searchWidget.querySelector('.fa-search');
    const suggestionsContainer = searchWidget.querySelector('.search-suggestions');
    let busLines = new Set();


    function toggleSearch(show) {
        if (show) {
            searchWidget.classList.add('expanded');
            searchInput.focus();
        } else if (!searchInput.value) {
            searchWidget.classList.remove('expanded');
        }
    }

    // Onclick expand search bar
    searchIcon.addEventListener('click', () => {
        toggleSearch(!searchWidget.classList.contains('expanded'));
    });

    document.addEventListener('click', (me) => {
        if (!searchWidget.contains(me.target)) {
            toggleSearch(false);
        }
    });

    // Search input
    searchInput.addEventListener('input', (me) => {
        const searchTerm = me.target.value.toLowerCase();
        const source = map.getSource('buses');
        
        if (!source || !source._data) return;
        
        // Filter bus
        const features = source._data.features;
        const filteredFeatures = features.filter(feature => {
            const properties = feature.properties;
            return properties.line_name && 
                   properties.line_name.toLowerCase().includes(searchTerm);
        });

        // Update map ===> display bus filtered
        source.setData({
            type: 'FeatureCollection',
            features: filteredFeatures
        });

        // Update search suggestions
        updateSuggestions(searchTerm, features);
    });

    // Function to update suggestions
    function updateSuggestions(searchTerm, features) {
        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        // Collect unique lines
        const matchingLines = new Set();
        features.forEach(feature => {
            const lineName = feature.properties.line_name;
            if (lineName && lineName.toLowerCase().includes(searchTerm)) {
                matchingLines.add(lineName);
            }
        });

        //  ===> display suggestions
        if (matchingLines.size > 0) {
            const suggestionsHTML = Array.from(matchingLines)
                .sort()
                .map(line => `
                    <div class="suggestion-item" data-line="${line}">
                        <i class="fas fa-bus"></i>
                        <span>Ligne ${line}</span>
                    </div>
                `).join('');
            
            suggestionsContainer.innerHTML = suggestionsHTML;
            suggestionsContainer.style.display = 'block';

            // Add onclick handlers to suggestions
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const line = item.dataset.line;
                    searchInput.value = line;
                    const event = new Event('input');
                    searchInput.dispatchEvent(event);
                    suggestionsContainer.style.display = 'none';
                });
            });
        } else {
            suggestionsContainer.innerHTML = '<div class="suggestion-item" style="color: #888888; font-size: 10px;">Aucune ligne trouvée</div>';
            suggestionsContainer.style.display = 'block';
        }
    }
}

// Function to fetch and display bus lanes
function fetchBusLanes() {
    fetch(API_URLS.BUS_LANES)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des lignes de bus');
            }
            return response.json();
        })
        .then(data => {
            if (!map.getSource('bus-lanes')) {
                console.error("Source 'bus-lanes' non trouvée");
                return;
            }

            // Verify if color is in hex format
            const processedData = {
                type: 'FeatureCollection',
                features: data.features.map(feature => ({
                    ...feature,
                    properties: {
                        ...feature.properties,


                        couleurtrace: feature.properties.couleurtrace && 
                            feature.properties.couleurtrace.startsWith('#') ? 
                            feature.properties.couleurtrace : 
                            '#888888'
                    }
                }))
            };

            // Update the source data
            map.getSource('bus-lanes').setData(processedData);
            console.log("Lignes de bus mises à jour avec succès");
        })
        .catch(error => {
            console.error('Erreur lors du chargement des lignes de bus:', error);
        });
}

// Function to load bus passages
async function loadBusPassages() {
    try {
        console.log('Chargement des passages des bus...');
        const response = await fetch(API_URLS.BUS_PASSAGES);
        const data = await response.json();
        
        if (!data || !data.results || !Array.isArray(data.results)) {
            console.error('Format de données invalide pour les passages:', data);
            return;
        }
        
        console.log('Nombre total de passages reçus: ' + data.results.length);
        
        // Group passages by bus number
        const passages = new Map();
        data.results.forEach(passage => {
            // Create a unique key for each bus
            const busKey = passage.numerobus || passage.idligne + '_' + passage.idcourse;
            
            if (!busKey) {
                console.warn('Passage sans identifiant de bus:', passage);
                return;
            }
            
            // Verify that coordinates are valid
            if (!passage.coordonnees || !passage.coordonnees.lon || !passage.coordonnees.lat) {
                console.warn('Invalid coordinates for passage:', passage);
                return;
            }
            
            // Verify that hours are valid
            const arrivalTime = new Date(passage.arrivee || passage.arriveetheorique).getTime();
            const departureTime = new Date(passage.depart || passage.departtheorique).getTime();
            
            if (isNaN(arrivalTime) || isNaN(departureTime)) {
                console.warn('Heures invalides pour le passage:', passage);
                return;
            }
            
            if (!passages.has(busKey)) {
                passages.set(busKey, []);
            }
            
            passages.get(busKey).push({
                coordinates: [passage.coordonnees.lon, passage.coordonnees.lat],
                arrivalTime: arrivalTime,
                departureTime: departureTime,
                stopId: passage.idarret,
                stopName: passage.nomarret || 'Arrêt inconnu',
                destination: passage.destination,
                precision: passage.precision,
                courseId: passage.idcourse,
                lineId: passage.idligne,
                lineName: passage.nomcourtligne
            });
        });
        
        // Sort passages by arrival time for each bus
        passages.forEach(passageList => {
            passageList.sort((a, b) => a.arrivalTime - b.arrivalTime);
        });
        
        busPassages = passages;
        console.log('Passages des bus chargés avec succès. Nombre de bus:', passages.size);
    } catch (error) {
        console.error('Erreur lors du chargement des passages:', error);
    }
}

// Function to find next stop of a bus
function findNextStop(busId, currentTime) {
    if (!busId) return null;
    
    const busIdStr = String(busId);
    
    let passages = busPassages.get(busIdStr);
    
    if (!passages && typeof busIdStr === 'string' && busIdStr.indexOf('_') !== -1) {
        const [lineId, courseId] = busIdStr.split('_');
        passages = busPassages.get(`${lineId}_${courseId}`);
    }
    
    if (!passages) {
        for (const [key, value] of busPassages.entries()) {
            if (value.length > 0 && value[0].lineId === busIdStr) {
                passages = value;
                break;
            }
        }
    }
    
    if (!passages || passages.length === 0) {
        return null;
    }
    
    // Find next passage
    for (let i = 0; i < passages.length; i++) {
        if (passages[i].arrivalTime > currentTime) {
            return {
                nextStop: passages[i].stopName,
                progress: calculateProgress(
                    currentTime,
                    i > 0 ? passages[i-1].departureTime : currentTime,
                    passages[i].arrivalTime
                ),
                speed: calculateSpeed(
                    i > 0 ? passages[i-1].coordinates : null,
                    passages[i].coordinates,
                    i > 0 ? passages[i-1].departureTime : currentTime,
                    passages[i].arrivalTime
                )
            };
        }
    }
    
    return null;
}

// Function to calculate progress
function calculateProgress(currentTime, startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const total = endTime - startTime;
    const elapsed = currentTime - startTime;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

// Function to calculate speed
function calculateSpeed(startCoords, endCoords, startTime, endTime) {
    if (!startCoords || !endCoords || !startTime || !endTime) return 0;
    
    const distance = calculateDistance(startCoords, endCoords);
    const duration = (endTime - startTime) / 3600000; // Convertir en heures
    return Math.round(distance / duration); // km/h
}

// Function to calculate bearing between two points
function calculateBearing(start, end) {
    const startLat = start[1] * Math.PI / 180;
    const startLng = start[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
             Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    if (bearing < 0) {
        bearing += 360;
    }
    return bearing;
}

// Function to calculate distance between two points in km
function calculateDistance(start, end) {
    const R = 6371; // Earth radius in km
    const lat1 = start[1] * Math.PI / 180;
    const lat2 = end[1] * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (end[0] - start[0]) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1) * Math.cos(lat2) * 
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Function to interpolate bus position
function interpolateBusPosition(lineId, sens, currentTime) {
    if (!lineId || sens === undefined) {
        console.warn('Paramètres invalides pour interpolateBusPosition:', { lineId, sens });
        return null;
    }
    
    const key = lineId + '_' + sens;
    const passages = busPassages.get(key);
    
    if (!passages || passages.length < 2) {
        console.warn(`Pas assez de passages pour la ligne ${key}:`, passages);
        return null;
    }
    
    // Find the two passages that encircle the current time
    let prevPassage = null;
    let nextPassage = null;
    
    for (let i = 0; i < passages.length - 1; i++) {
        if (passages[i].time <= currentTime && passages[i + 1].time >= currentTime) {
            prevPassage = passages[i];
            nextPassage = passages[i + 1];
            break;
        }
    }
    
    // If no passage is found, use the first and last
    if (!prevPassage || !nextPassage) {
        if (currentTime < passages[0].time) {
            // The bus has not yet started its journey
            prevPassage = passages[0];
            nextPassage = passages[1];
        } else if (currentTime > passages[passages.length - 1].time) {
            // The bus has finished its journey
            prevPassage = passages[passages.length - 2];
            nextPassage = passages[passages.length - 1];
        } else {
            console.warn(`Impossible de trouver des passages pour la ligne ${key} à ${new Date(currentTime).toISOString()}`);
            return null;
        }
    }
    
    // Calculate progress between the two passages
    const totalDuration = nextPassage.time - prevPassage.time;
    const elapsed = currentTime - prevPassage.time;
    const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
    
    // Calculate distance between the stops
    const distance = calculateDistance(prevPassage.coordinates, nextPassage.coordinates);
    
    // Calculate current speed (in km/h)
    const speed = distance / (totalDuration / 3600000); // Convert ms to hours
    
    // Calculate bearing
    const bearing = calculateBearing(prevPassage.coordinates, nextPassage.coordinates);
    
    // Linear interpolation between the two positions
    const interpolatedPosition = [
        prevPassage.coordinates[0] + (nextPassage.coordinates[0] - prevPassage.coordinates[0]) * progress,
        prevPassage.coordinates[1] + (nextPassage.coordinates[1] - prevPassage.coordinates[1]) * progress
    ];
    
    return {
        coordinates: interpolatedPosition,
        prevStop: prevPassage.arret,
        nextStop: nextPassage.arret,
        progress: progress,
        bearing: bearing,
        speed: speed
    };
}

// Function to animate buses
function animateBuses() {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastAnimationTime;
    lastAnimationTime = currentTime;

    const source = map.getSource('buses');
    if (!source || !source._data) {
        animationFrameId = null;
        return;
    }

    const features = source._data.features.map(feature => {
        const properties = feature.properties;
        const startTime = properties.startTime;
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(1, elapsedTime / ANIMATION_DURATION);

        // Interpolation linéaire entre la position précédente et la position cible
        if (properties.targetCoordinates && properties.previousCoordinates) {
            const newCoordinates = [
                properties.previousCoordinates[0] + (properties.targetCoordinates[0] - properties.previousCoordinates[0]) * progress,
                properties.previousCoordinates[1] + (properties.targetCoordinates[1] - properties.previousCoordinates[1]) * progress
            ];

            return {
                ...feature,
                geometry: {
                    ...feature.geometry,
                    coordinates: newCoordinates
                }
            };
        }

        return feature;
    });

    source.setData({
        type: 'FeatureCollection',
        features: features
    });

    // Continuer l'animation
    animationFrameId = requestAnimationFrame(animateBuses);
}

// Function to load bus stops
async function loadBusStops() {
    try {
        console.log('Chargement des arrêts de bus...');
        const response = await fetch(API_URLS.BUS_STOPS);
        const data = await response.json();
        
        if (!data || !data.results) {
            console.error('Format de données invalide pour les arrêts');
            return;
        }
        
        busStops.clear();
        
        data.results.forEach(stop => {
            if (stop.code && stop.coordonnees) {
                busStops.set(stop.code, {
                    id: stop.code,
                    name: stop.nom,
                    coordinates: [stop.coordonnees.lon, stop.coordonnees.lat],
                    commune: stop.nomcommune,
                    accessible: stop.estaccessiblepmr === "true",
                    mobilier: stop.mobilier,
                    visibilite: stop.visibilite
                });
            }
        });
        
        console.log(`${busStops.size} arrêts de bus chargés`);
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement des arrêts:', error);
        throw error;
    }
}

// Function to update bus stops layer
function updateBusStopsLayer() {
    if (!map.getSource('bus-stops')) return;
    
    const features = Array.from(busStops.values()).map(stop => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: stop.coordinates
        },
        properties: {
            id: stop.id,
            name: stop.name,
            commune: stop.commune,
            accessible: stop.accessible,
            mobilier: stop.mobilier,
            visibilite: stop.visibilite
        }
    }));
    
    map.getSource('bus-stops').setData({
        type: 'FeatureCollection',
        features: features
    });
}

// Function to find the nearest stop to a given position
function findNearestStop(coordinates) {
    if (!coordinates || coordinates.length !== 2) {
        console.warn('Invalid coordinates for findNearestStop:', coordinates);
        return null;
    }

    let nearestStop = null;
    let minDistance = Infinity;

    busStops.forEach(stop => {
        if (!stop.coordinates || stop.coordinates.length !== 2) return;

        const distance = calculateDistance(coordinates, stop.coordinates);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStop = stop;
        }
    });

    // If the nearest stop is more than 200 meters away, we don't consider it relevant
    if (minDistance > 0.2) {
        return null;
    }

    return nearestStop;
}

// Function to update bus data
function updateBusData() {
    console.log('Mise à jour des données des bus...');
    fetch(API_URLS.BUS_POSITION)
        .then(response => response.text())
        .then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Erreur de parsing JSON:', e);
                const cleanedText = text.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
                return JSON.parse(cleanedText);
            }
        })
        .then(async data => {
            if (!data || !data.features) {
                console.error('Données invalides reçues de l\'API');
                return;
            }

            // Load stops bus
            if (busStops.size === 0) {
                await loadBusStops();
            }
            
            // Update bus passages
            await loadBusPassages();
            
            const currentTime = Date.now();
            const features = data.features
                .filter(feature => 
                    feature.properties && 
                    feature.properties.etat !== 'Hors-service' &&
                    feature.geometry &&
                    feature.geometry.coordinates &&
                    feature.geometry.coordinates.length === 2
                )
                .map(feature => {
                    const properties = feature.properties;
                    const coordinates = feature.geometry.coordinates;
                    const busId = properties.numerobus;

                    // Save previous position before updating
                    const previousPosition = lastBusPositions.get(busId);
                    lastBusPositions.set(busId, {
                        coordinates: coordinates,
                        timestamp: currentTime,
                        properties: properties
                    });

                    // Calculate bearing if we have a previous position
                    let bearing = 0;
                    if (previousPosition) {
                        bearing = calculateBearing(previousPosition.coordinates, coordinates);
                    }

                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: previousPosition ? previousPosition.coordinates : coordinates
                        },
                        properties: {
                            ...properties,
                            bus_id: busId,
                            line_name: properties.nomcourtligne,
                            direction: properties.sens === 0 ? "Aller" : properties.sens === 1 ? "Retour" : "N/A",
                            destination: properties.destination,
                            delay_seconds: properties.ecartsecondes,
                            bearing: bearing,
                            targetCoordinates: coordinates,
                            startTime: currentTime,
                            previousCoordinates: previousPosition ? previousPosition.coordinates : coordinates
                        }
                    };
                });

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
            



            // Start animation
            if (!animationFrameId) {
                lastAnimationTime = performance.now();
                animateBuses();
            }
            
            lastUpdateTime = new Date();
            const mobileLastUpdateElement = document.getElementById('mobile-last-update');
            if (mobileLastUpdateElement) {
                mobileLastUpdateElement.textContent = lastUpdateTime.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour des bus:', error);
        });
}

// Function to update the stats
function updateStats(features) {
    const stats = {
        total: features.length,
        delayed: features.filter(f => f.properties.status === 'En retard' || f.properties.delay_seconds > 0).length,
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

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to fetch and display traffic alerts
function updateTrafficAlerts() {
    console.log('Début de la mise à jour des alertes...');
    const alertsContainer = document.getElementById('traffic-alerts-widget');
    
    if (!alertsContainer) {
        console.error('Container des alertes non trouvé');
        return;
    }

    // Show loading state
    alertsContainer.innerHTML = '<p class="no-alerts">Chargement des alertes...</p>';

    fetch(API_URLS.TRAFFIC_ALERTS)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur HTTP: ' + response.status);  // Erreur HTTP
            }
            return response.json();
        })
        .then(data => {
            console.log('Données d\'alertes reçues:', data);
            
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Format de données invalide');
            }

            // Sort alerts by publication date (most recent first)
            const alerts = data.results.sort((a, b) => 
                new Date(b.publication) - new Date(a.publication)
            );

            if (alerts.length === 0) {
                alertsContainer.innerHTML = '<p class="no-alerts">Aucune perturbation en cours</p>';
                console.log('Aucune alerte à afficher');
                return;
            }

            // Generate HTML for alerts
            const alertsHTML = alerts.map(alert => {
                const startDate = formatDate(alert.debutvalidite);
                const endDate = formatDate(alert.finvalidite);
                const niveau = alert.niveau && alert.niveau.length > 0 ? alert.niveau[0].toLowerCase() : 'mineure';
                
                return `
                    <div class="alert-item ${niveau}">
                        <div class="alert-header">
                            <span class="alert-line">Ligne ${alert.nomcourtligne || 'N/A'}</span>
                            <span class="alert-level">${alert.niveau && alert.niveau.length > 0 ? alert.niveau[0] : 'N/A'}</span>
                        </div>
                        <h3>${alert.titre || 'Sans titre'}</h3>
                        <p>${alert.description || 'Aucune description disponible'}</p>
                        <div class="alert-dates">
                            <span>Du ${startDate}</span>
                            <span>Au ${endDate}</span>
                        </div>
                    </div>
                `;
            }).join('');

            // Update widget content
            alertsContainer.innerHTML = alertsHTML;
            

            // NB : force a reflow to ensure the content is displayed
            alertsContainer.style.display = 'none';
            alertsContainer.offsetHeight;
            alertsContainer.style.display = 'block';
            
            console.log('Contenu des alertes mis à jour avec succès');
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des alertes:', error);
            alertsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Impossible de charger les alertes</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        });
}

// Update every 5 seconds
setInterval(updateBusData, 5000);

// Update every 30 seconds
setInterval(updateTrafficAlerts, 30000);

// Function to toggle panel collapse/expand
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const isCollapsed = panel.classList.toggle('panel-collapsed');
    const button = panel.querySelector('.toggle-button i');
    
    if (button) {
        button.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    // If it's the info widget ===> update the control button
    if (panelId === 'info-widget') {
        const infoToggle = document.getElementById('info-toggle');
        if (infoToggle) {
            if (isCollapsed) {
                infoToggle.classList.remove('active');
            } else {
                infoToggle.classList.add('active');
            }
        }
    }

    localStorage.setItem(panelId + 'State', isCollapsed ? 'collapsed' : 'expanded');
}

// Function to restore panel states
function restorePanelStates() {
    const panels = ['control-panel', 'alerts-panel', 'legend-panel'];
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            const state = localStorage.getItem(panelId + 'State');
            if (state === 'collapsed') {
                panel.classList.add('panel-collapsed');
                const button = panel.querySelector('.toggle-button i');
                if (button) {
                    button.style.transform = 'rotate(180deg)';
                }
            }
        }
    });
}

// Export the necessary functions
window.initMap = initMap;
window.updateBusData = updateBusData;
window.updateTrafficAlerts = updateTrafficAlerts;
window.togglePanel = togglePanel;

// Update the CSS ===> adding animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .animated {
        animation-duration: 0.3s;
        animation-fill-mode: both;
    }

    .fadeIn {
        animation-name: fadeIn;
    }

    .custom-popup .mapboxgl-popup-content {
        padding: 0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .popup-container {
        overflow: hidden;
    }

    .popup-header {
        padding: 12px 15px;
        color: white;
        background-color: #4CAF50;
    }

    .popup-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }

    .popup-content {
        padding: 15px;
        background: white;
    }

    .popup-content p {
        margin: 8px 0;
        font-size: 14px;
        color: #444;
    }

    .popup-content i {
        width: 20px;
        margin-right: 8px;
        color: #666;
    }

    .hover-popup-container .mapboxgl-popup-content {
        padding: 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .hover-popup {
        min-width: 150px;
    }

    .hover-header {
        padding: 8px 12px;
        color: white;
        font-weight: bold;
    }

    .hover-content {
        padding: 8px 12px;
        font-size: 12px;
        color: #666;
    }

    .mapboxgl-popup-tip {
        display: none;
    }

    .alerts-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 300px;
        max-height: 60vh;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        overflow: hidden;
        z-index: 1;
    }

    .alerts-header {
        padding: 15px 20px;
        background: #1a1a1a;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .alerts-header h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .alerts-content {
        padding: 15px;
        max-height: calc(60vh - 50px);
        overflow-y: auto;
    }

    .alert-item {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        border-left: 4px solid #666;
    }

    .alert-item.bloquante {
        border-left-color: #F44336;
    }

    .alert-item.mineure {
        border-left-color: #FFC107;
    }

    .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .alert-line {
        font-weight: 600;
        color: #1a1a1a;
    }

    .alert-level {
        font-size: 0.8rem;
        padding: 2px 8px;
        border-radius: 12px;
        background: #f0f0f0;
    }

    .alert-item.bloquante .alert-level {
        background: #ffebee;
        color: #d32f2f;
    }

    .alert-item.mineure .alert-level {
        background: #fff8e1;
        color: #ffa000;
    }

    .alert-item h3 {
        margin: 0 0 8px 0;
        font-size: 0.9rem;
        color: #1a1a1a;
    }

    .alert-item p {
        margin: 0 0 8px 0;
        font-size: 0.85rem;
        color: #666;
        line-height: 1.4;
    }

    .alert-dates {
        font-size: 0.8rem;
        color: #999;
        display: flex;
        justify-content: space-between;
    }

    .no-alerts {
        text-align: center;
        color: #666;
        font-size: 0.9rem;
        padding: 20px;
    }

    .error-message {
        text-align: center;
        color: #d32f2f;
        font-size: 0.9rem;
        padding: 20px;
    }

    @media (max-width: 768px) {
        .alerts-panel {
            top: auto;
            bottom: 70px;
            left: 10px;
            right: 10px;
            width: 180px;
            max-height: 40vh;
        }
        .alerts-header h2 {
            font-size: 0.7rem;
        }
        .alerts-header h2 i {
            font-size: 0.7rem;
        }
    }

    .panel-collapsed .panel-content,
    .panel-collapsed .alerts-content {
        display: none;
    }

    .panel-collapsed {
        background: rgba(255, 255, 255, 0.8);
    }

    .panel-collapsed .panel-header,
    .panel-collapsed .alerts-header {
        border-bottom: none;
    }

    .toggle-button {
        cursor: pointer;
        transition: transform 0.3s ease;
    }

    .toggle-button:hover {
        background: #eeeeee;
    }

    .panel-collapsed .toggle-button i {
        transform: rotate(180deg);
    }

    .control-button.active {
        background: #4CAF50;
    }
    
    .control-button.active i {
        color: white;
    }
`;
document.head.appendChild(style);

// Initialize panels state
document.addEventListener('DOMContentLoaded', () => {
    restorePanelStates();
    
    // Initialize legend panel state
    const legendPanel = document.getElementById('legend-panel');
    if (legendPanel) {
        const legendState = localStorage.getItem('legendPanelState');
        if (legendState === 'collapsed') {
            legendPanel.classList.add('panel-collapsed');
        }
        
        // Add click event listener for legend toggle
        const legendToggle = legendPanel.querySelector('.toggle-button');
        if (legendToggle) {
            legendToggle.addEventListener('click', () => togglePanel('legend-panel'));
        }
    }
}); 
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
    animationDuration: 5000
};

// URLs de l'API STAR
const API_URLS = {
    BUS_POSITION: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-vehicules-position-tr/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326",
    BUS_LANES: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-parcours-td/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326",
    TRAFFIC_ALERTS: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-busmetro-trafic-alertes-tr/records?limit=-1",
    BUS_ICONS: "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-lignes-pictogrammes-dm/records?limit=-1"
};



// Initialize global variables
let map;
let lastUpdateTime = null;
let busIcons = new Map(); 




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
        
        // Initialize info widget
        initInfoWidget();
        
        // Navigation controls ===> zoom in, zoom out, rotate
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

        // Add bus lanes first
        map.addSource('bus-lanes', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add the bus lanes layer ==> use couleurtrace for color
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

        // Add buses source
        map.addSource('buses', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add circle layer first (for buses without icons)
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

        // Add icon layer on top
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
                'icon-ignore-placement': true
            }
        });

        console.log("Configuration des interactions...");
        setupInteractions();
        setupSearch();

        // Load bus icons first
        console.log("Chargement des pictogrammes de bus...");
        loadBusIcons().then(() => {
            // Then fetch bus lanes
            console.log("Chargement des lignes de bus...");
            fetchBusLanes();

            console.log("Première mise à jour des données...");
            updateBusData();
            updateTrafficAlerts();
            restorePanelStates();
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
            

            
            // Convert seconds to a more readable format
            const retard = properties.delay_seconds || 0;
            const retardText = retard === 0 ? 'À l\'heure' : 
                             retard < 60 ? retard + ' secondes' :
                             Math.floor(retard/60) + ' min ' + retard%60 + ' sec';
            
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


// Function to update the bus data
function updateBusData() {
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
        .then(data => {
            if (!data || !data.features) {
                console.error('Données invalides reçues de l\'API');
                return;
            }

            const features = data.features
                .filter(feature => 
                    feature.properties && 
                    feature.properties.etat !== 'Hors-service' &&
                    feature.geometry &&
                    feature.geometry.coordinates &&
                    feature.geometry.coordinates.length === 2
                )
                .map(feature => {
                    const idligne = feature.properties.idligne;
                    // Vérifier si l'icône existe dans notre Map
                    const hasIcon = busIcons.has(idligne);
                    
                    return {
                        type: 'Feature',
                        geometry: feature.geometry,
                        properties: {
                            ...feature.properties,
                            bus_id: feature.properties.idbus,
                            line_name: feature.properties.nomcourtligne,
                            direction: feature.properties.sens === 0 ? "Aller" : feature.properties.sens === 1 ? "Retour" : "N/A",
                            destination: feature.properties.destination,
                            delay_seconds: feature.properties.ecartsecondes,
                            // Ajouter icon_id seulement si l'icône existe
                            ...(hasIcon && { icon_id: busIcons.get(idligne) }),
                            status: feature.properties.ecartsecondes > 0 ? 'En retard' : 
                                   Array.isArray(feature.properties.etat) ? feature.properties.etat[0] : 
                                   feature.properties.etat || 'Inconnu'
                        }
                    };
                });

            // Process geojson data
            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            if (!map.getSource('buses')) {
                console.error("Source 'buses' non trouvée");
                return;
            }
            
            map.getSource('buses').setData(geojson);
            
            // Debug logs
            const withIcons = features.filter(f => f.properties.icon_id).length;
            const withoutIcons = features.filter(f => !f.properties.icon_id).length;
            console.log('Nombre total de bus: ' + features.length);
            console.log('Nombre de bus avec icônes: ' + withIcons);
            console.log('Nombre de bus sans icônes: ' + withoutIcons);
            
            updateStats(features);
            
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
    fetch(API_URLS.TRAFFIC_ALERTS)
        .then(response => response.json())
        .then(data => {
            const alertsContainer = document.getElementById('traffic-alerts');
            if (!alertsContainer) return;

            // Sort alerts by publication date (most recent first)
            const alerts = data.results.sort((a, b) => 
                new Date(b.publication) - new Date(a.publication)
            );

            // ===> display alerts
            const alertsHTML = alerts.map(alert => {
                const startDate = formatDate(alert.debutvalidite);
                const endDate = formatDate(alert.finvalidite);
                
                return `
                    <div class="alert-item ${alert.niveau[0].toLowerCase()}">
                        <div class="alert-header">
                            <span class="alert-line">Ligne ${alert.nomcourtligne}</span>
                            <span class="alert-level">${alert.niveau[0]}</span>
                        </div>
                        <h3>${alert.titre}</h3>
                        <p>${alert.description}</p>
                        <div class="alert-dates">
                            <span>Du ${startDate}</span>
                            <span>Au ${endDate}</span>
                        </div>
                    </div>
                `;
            }).join('');

            alertsContainer.innerHTML = alertsHTML || '<p class="no-alerts">Aucune perturbation en cours</p>';
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des alertes:', error);
            const alertsContainer = document.getElementById('traffic-alerts');
            if (alertsContainer) {
                alertsContainer.innerHTML = '<p class="error-message">Impossible de charger les alertes</p>';
            }
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

    // Si c'est le widget d'information, on met à jour aussi le bouton de contrôle
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
            bottom: 60px;
            left: 10px;
            right: 10px;
            width: auto;
            max-height: 40vh;
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
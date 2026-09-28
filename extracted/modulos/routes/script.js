(function() {
    let map;
    let markers = [];
    let routeLine;
    let currentDate = new Date().toISOString().split('T')[0];

    window.renderRoutesView = async function() {
        const container = document.getElementById('routes-view');
        if (!container) return;

        // Cargar HTML
        const response = await fetch('modulos/routes/view.html');
        const html = await response.text();
        container.innerHTML = html;

        // Inicializar fecha
        const dateInput = document.getElementById('route-date');
        dateInput.value = currentDate;
        
        dateInput.addEventListener('change', (e) => {
            currentDate = e.target.value;
            loadRoute(currentDate);
        });

        document.getElementById('prev-day').addEventListener('click', () => {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - 1);
            currentDate = date.toISOString().split('T')[0];
            dateInput.value = currentDate;
            loadRoute(currentDate);
        });

        document.getElementById('next-day').addEventListener('click', () => {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + 1);
            currentDate = date.toISOString().split('T')[0];
            dateInput.value = currentDate;
            loadRoute(currentDate);
        });

        // Botón Recargar Mapa
        document.getElementById('reload-map-btn').addEventListener('click', () => {
            // Forzar limpieza y recarga completa
            if (map) {
                map.remove();
                map = null;
            }
            setTimeout(() => {
                initMap();
                loadRoute(currentDate);
            }, 100);
        });

        // Inicializar mapa
        setTimeout(initMap, 100); // Pequeño delay para asegurar DOM
        loadRoute(currentDate);
    };

    function initMap() {
        // Coordenadas por defecto (Centro de México o ubicación genérica)
        const defaultLat = 24.0277202; 
        const defaultLng = -104.6531759; // Durango por defecto

        // Si el mapa ya existe, limpiarlo
        if (map) {
            map.remove();
        }

        map = L.map('route-map').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }

    async function loadRoute(date) {
        // Limpiar marcadores anteriores
        if (markers) {
            markers.forEach(m => map.removeLayer(m));
        }
        markers = [];
        if (routeLine) map.removeLayer(routeLine);

        const companyId = AppState.currentUser.companyId;
        const response = await fetch(`api/get_daily_route.php?date=${date}&company_id=${companyId}`);
        const result = await response.json();

        if (!result.success) {
            alert('Error al cargar la ruta');
            return;
        }

        const services = result.data;
        renderSidebar(services);
        await renderMap(services);
    }

    function renderSidebar(services) {
        const list = document.getElementById('routes-list');
        list.innerHTML = '';

        if (services.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center;">No hay servicios para este día.</div>';
            return;
        }

        services.forEach((service, index) => {
            const div = document.createElement('div');
            div.className = 'route-item';
            div.innerHTML = `
                <div class="route-time">${service.time.substring(0, 5)} <span style="font-size: 0.8em; color: #aaa;">#${index + 1}</span></div>
                <div class="route-client">${service.client}</div>
                <div class="route-address">${service.address || 'Sin dirección'}</div>
                <button class="btn-maps-link" style="margin-top: 5px; background: #3B82F6; border: none; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; cursor: pointer;">📍 Pegar Link Maps</button>
                ${!service.lat ? '<div style="color: #F59E0B; font-size: 0.8em; margin-top: 4px;">⚠️ Sin ubicación verificada</div>' : ''}
            `;
            
            // Botón Link Maps
            const btnMaps = div.querySelector('.btn-maps-link');
            btnMaps.onclick = (e) => {
                e.stopPropagation(); // Evitar que se active el click del item
                saveLocationFromLink(service, index);
            };

            // Al hacer clic en la lista, centrar mapa
            div.onclick = () => {
                // Buscamos el marcador correspondiente en el array global
                if (markers[index]) {
                    const latLng = markers[index].getLatLng();
                    map.setView(latLng, 16);
                    markers[index].openPopup();
                } else {
                    alert('Ubicación no disponible en el mapa.');
                }
            };
            list.appendChild(div);
        });
    }

    // Función auxiliar para crear íconos
    function createMarkerIcon(number, isVerified) {
        const color = isVerified ? '#34D399' : '#EF4444'; // Verde verificado, Rojo sin verificar
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });
    }

    // Función para obtener ruta de OSRM
    async function getRouteFromOSRM(points) {
        if (points.length < 2) return null;

        // Formato OSRM: lon,lat;lon,lat;...
        const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                // Actualizar UI con distancia y tiempo
                const distKm = (data.routes[0].distance / 1000).toFixed(1);
                const timeMin = Math.round(data.routes[0].duration / 60);
                
                const distEl = document.getElementById('total-distance');
                const timeEl = document.getElementById('total-time');
                
                if(distEl) distEl.textContent = `Distancia: ${distKm} km`;
                if(timeEl) timeEl.textContent = `Tiempo: ${timeMin} min`;

                // Devolver coordenadas de la geometría [lon, lat] -> [lat, lon] para Leaflet
                return route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            }
        } catch (e) {
            console.error("Error fetching OSRM route:", e);
        }
        return null;
    }

    // Función para actualizar la línea de ruta
    async function updateRouteLine() {
        if (routeLine) map.removeLayer(routeLine);
        
        // Filtrar solo los puntos que tienen ubicación válida (no por defecto)
        const validPoints = [];
        
        // Recorremos los marcadores para obtener sus posiciones actuales
        markers.forEach(marker => {
             if(marker) {
                 validPoints.push(marker.getLatLng());
             }
        });

        if (validPoints.length > 1) {
            // Intentar obtener ruta por calles
            const routeCoords = await getRouteFromOSRM(validPoints);
            
            if (routeCoords) {
                // Dibujar ruta detallada
                routeLine = L.polyline(routeCoords, { color: '#3B82F6', weight: 5, opacity: 0.8 }).addTo(map);
            } else {
                // Fallback a línea recta si falla OSRM
                console.log("Usando línea recta (fallback)");
                routeLine = L.polyline(validPoints, { color: '#3B82F6', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
            }
        }
    }

    async function parseMapsLink(url) {
        // Limpiar URL de espacios o saltos de línea
        url = url.trim();

        // 1. Intentar resolver link corto primero si es necesario
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl') || !url.includes('@')) {
            try {
                // Mostrar un pequeño indicador de que estamos trabajando (opcional, por ahora solo en consola)
                console.log("Resolviendo URL corta...", url);
                
                const response = await fetch(`api/resolve_map_url.php?url=${encodeURIComponent(url)}`);
                const data = await response.json();
                
                if (data.success && data.final_url) {
                    console.log("URL resuelta:", data.final_url);
                    url = data.final_url;
                }
            } catch (e) {
                console.error("Error resolviendo URL corta", e);
                // Si falla, intentamos seguir con la URL original por si acaso
            }
        }

        // 2. Extraer coordenadas de la URL (ya sea la original o la expandida)
        
        // Formato @lat,lng (Estándar en URLs de escritorio)
        const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const matchAt = url.match(regexAt);
        if (matchAt) return { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };

        // Formato q=lat,lng (Estándar en URLs móviles antiguas)
        const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const matchQ = url.match(regexQ);
        if (matchQ) return { lat: parseFloat(matchQ[1]), lng: parseFloat(matchQ[2]) };
        
        // Formato ll=lat,lng (Otro formato antiguo)
        const regexLL = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const matchLL = url.match(regexLL);
        if (matchLL) return { lat: parseFloat(matchLL[1]), lng: parseFloat(matchLL[2]) };

        // Formato !3dlat!4dlng (Usado en URLs de "Compartir lugar" embebidas en data)
        // Ejemplo: ...!3d26.046396!4d-98.2562477...
        const regex3d4d = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
        const match3d4d = url.match(regex3d4d);
        if (match3d4d) return { lat: parseFloat(match3d4d[1]), lng: parseFloat(match3d4d[2]) };

        // Si después de todo no encontramos nada
        return null;
    }

    async function saveLocationFromLink(service, index) {
        const url = prompt("Pega el link de Google Maps aquí:");
        if (!url) return;

        const coords = await parseMapsLink(url);
        
        if (coords) {
            // Actualizar mapa y guardar
            if (markers[index]) {
                const newLatLng = new L.LatLng(coords.lat, coords.lng);
                markers[index].setLatLng(newLatLng);
                map.setView(newLatLng, 16);
                
                // Guardar en BD
                try {
                    const response = await fetch('api/update_coords.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: service.location_id,
                            type: service.location_type,
                            lat: coords.lat,
                            lng: coords.lng
                        })
                    });
                    const res = await response.json();
                    
                    if (res.success) {
                        alert('Ubicación actualizada desde el link.');
                        markers[index].setIcon(createMarkerIcon(index + 1, true));
                        
                        // Actualizar datos locales
                        service.lat = coords.lat;
                        service.lng = coords.lng;
                        
                        // Actualizar línea
                        updateRouteLine();
                    } else {
                        alert('Error al guardar: ' + res.message);
                    }
                } catch (e) {
                    console.error(e);
                    alert('Error de conexión.');
                }
            }
        } else {
            alert('No se pudieron extraer las coordenadas. Asegúrate de copiar el link completo (largo) de Google Maps que contiene los números @lat,lon');
        }
    }

    async function geocodeAddress(address) {
        if (!address) return null;
        // Limpiar dirección de caracteres extraños para mejorar búsqueda
        let cleanAddress = address.replace(/[^a-zA-Z0-9\s,.-]/g, '');
        
        // Aseguramos que la búsqueda sea en México
        if (!cleanAddress.toLowerCase().includes('mexico')) {
             cleanAddress += ', Mexico';
        }

        try {
            // Usamos nuestro propio backend (proxy) para evitar bloqueos CORS
            const response = await fetch(`api/geocode_address.php?address=${encodeURIComponent(cleanAddress)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        } catch (e) {
            console.error("Error geocoding", e);
        }
        return null;
    }

    async function renderMap(services) {
        const routePoints = [];
        const bounds = L.latLngBounds();

        // Procesar servicios uno por uno
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            let lat = parseFloat(service.lat);
            let lng = parseFloat(service.lng);
            let hasLocation = !isNaN(lat) && !isNaN(lng);
            let autoGeocoded = false;

            // Si no tiene ubicación pero tiene dirección, intentar geocodificar
            if (!hasLocation && service.address && service.address.length > 5) {
                // Pequeño delay para no saturar API
                if (i > 0) await new Promise(r => setTimeout(r, 800)); 
                
                const coords = await geocodeAddress(service.address);
                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                    hasLocation = true; // Tenemos ubicación tentativa
                    autoGeocoded = true; // Marcamos que fue automática
                    
                    // Actualizar en memoria localmente para que al hacer clic funcione
                    service.lat = lat;
                    service.lng = lng;
                }
            }

            // Si aún no tiene ubicación, poner en el centro aleatoriamente
            if (!hasLocation) {
                const center = map.getCenter();
                lat = center.lat + (Math.random() - 0.5) * 0.005;
                lng = center.lng + (Math.random() - 0.5) * 0.005;
            } else {
                routePoints.push([lat, lng]);
                bounds.extend([lat, lng]);
            }

            // Crear marcador
            // Si fue autogeocodificado, lo mostramos Naranja (aviso), si ya estaba en BD Verde, si no Rojo.
            let statusColor = hasLocation ? (autoGeocoded ? '#F59E0B' : '#34D399') : '#EF4444';
            
            const markerIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${statusColor}; color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${i + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });

            const marker = L.marker([lat, lng], {
                icon: markerIcon,
                draggable: true 
            }).addTo(map);

            let popupContent = `<b>${service.time.substring(0, 5)} - ${service.client}</b><br>${service.address}<br>`;
            
            if (!hasLocation) {
                popupContent += '<br><b style="color:red">📍 Sin ubicación. Arrástrame al lugar correcto.</b>';
            } else if (autoGeocoded) {
                popupContent += '<br><b style="color:#F59E0B">📍 Ubicación aproximada por dirección. Arrastra si es incorrecta.</b>';
            }

            marker.bindPopup(popupContent);

            // Guardar ubicación al soltar
            marker.on('dragend', async (event) => {
                const newPos = event.target.getLatLng();
                
                try {
                    const response = await fetch('api/update_coords.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: service.location_id,
                            type: service.location_type,
                            lat: newPos.lat,
                            lng: newPos.lng
                        })
                    });
                    const res = await response.json();
                    
                    if (res.success) {
                        // Cambiar a verde
                        marker.setIcon(createMarkerIcon(i + 1, true));
                        service.lat = newPos.lat;
                        service.lng = newPos.lng;
                        
                        // Si fue autogeocodificado y lo movimos, ya no es auto
                        autoGeocoded = false;
                        
                        // Actualizar línea de ruta en tiempo real
                        updateRouteLine();
                    } else {
                        console.error('Error al guardar ubicación:', res.message);
                    }
                } catch (e) {
                    console.error('Error de conexión al guardar coordenadas:', e);
                }
            });

            markers.push(marker);
        }

        // Ajustar vista
        if (routePoints.length > 0) {
            // Usar updateRouteLine para dibujar la ruta inicial (ya sea recta o por calles)
            await updateRouteLine();
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Si no hay puntos válidos, mantener vista por defecto
        }
    }
})();

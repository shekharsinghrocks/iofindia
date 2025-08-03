let map;
let currentMarker = null;
let noteForm = null;
let notes = [];

// Mobile menu functionality
window.addEventListener('load', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (!mobileMenuBtn || !navMenu) {
        console.error('Mobile menu elements not found');
        return;
    }

    function toggleMenu(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const isActive = navMenu.classList.contains('active');
        
        // Toggle the active class
        if (isActive) {
            navMenu.classList.remove('active');
        } else {
            navMenu.classList.add('active');
        }
        
        console.log('Menu toggled:', !isActive);
    }

    // Handle menu button clicks
    mobileMenuBtn.addEventListener('click', toggleMenu);

    // Handle menu item clicks
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // Ensure menu starts closed
    navMenu.classList.remove('active');
});

// Load saved notes from localStorage
function loadSavedNotes() {
    const savedNotes = localStorage.getItem('mapNotes');
    if (savedNotes) {
        const notesData = JSON.parse(savedNotes);
        notesData.forEach(noteData => {
            const marker = new google.maps.Marker({
                position: noteData.position,
                map: map,
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                animation: google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<div style="padding: 10px;">${noteData.text}</div>`
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            notes.push({
                position: noteData.position,
                text: noteData.text,
                marker: marker
            });
        });
    }
}

function initMap() {
    noteForm = document.getElementById('noteForm');
    
    // Default coordinates (will be replaced with user's location)
    let defaultLocation = { lat: 0, lng: 0 };
    
    // Create the map centered at the default location with custom styling
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "on" }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#e9e9e9" }]
            }
        ],
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true
    });

    noteForm = document.getElementById('noteForm');

    // Add click listener to map
    map.addListener('click', function(e) {
        showNoteForm(e.latLng);
    });

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // Center map on user's location
                map.setCenter(userLocation);

                // Add a marker at user's location
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "Your Location",
                    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    animation: google.maps.Animation.DROP
                });
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Error getting your location. Please enable location services.");
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        alert("Your browser doesn't support geolocation.");
    }
}

function showNoteForm(latLng) {
    // Remove existing temporary marker if any
    if (currentMarker) {
        currentMarker.setMap(null);
    }

    // Create a temporary marker
    currentMarker = new google.maps.Marker({
        position: latLng,
        map: map,
        animation: google.maps.Animation.DROP,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    // Get the pixel coordinates of the click
    const projection = map.getProjection();
    const bounds = map.getBounds();
    
    if (projection && bounds) {
        const scale = Math.pow(2, map.getZoom());
        const worldPoint = projection.fromLatLngToPoint(latLng);
        const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
        const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
        
        const x = (worldPoint.x - bottomLeft.x) * scale;
        const y = (worldPoint.y - topRight.y) * scale;

        // Position the form near the click
        noteForm.style.display = 'block';
        noteForm.style.left = (x + 10) + 'px';  // Offset by 10px to not overlap with marker
        noteForm.style.top = (y - 10) + 'px';
    }
    
    // Clear previous note text
    document.getElementById('noteText').value = '';
}

function saveNote() {
    const noteText = document.getElementById('noteText').value.trim();
    
    if (noteText && currentMarker) {
        const position = currentMarker.getPosition();
        
        // Create info window for the note
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 10px;">${noteText}</div>`
        });

        // Add click listener to show note
        currentMarker.addListener('click', () => {
            infoWindow.open(map, currentMarker);
        });

        // Store the note data
        notes.push({
            position: position.toJSON(),
            text: noteText,
            marker: currentMarker
        });

        // Save to localStorage
        localStorage.setItem('mapNotes', JSON.stringify(
            notes.map(note => ({
                position: note.position,
                text: note.text
            }))
        ));

        // Reset current marker and hide form
        currentMarker = null;
        noteForm.style.display = 'none';
    }
}

function cancelNote() {
    if (currentMarker) {
        currentMarker.setMap(null);
        currentMarker = null;
    }
    noteForm.style.display = 'none';
}

// Load saved notes when the map is ready
google.maps.event.addListenerOnce(map, 'idle', () => {
    const savedNotes = localStorage.getItem('mapNotes');
    if (savedNotes) {
        const notesData = JSON.parse(savedNotes);
        notesData.forEach(noteData => {
            const marker = new google.maps.Marker({
                position: noteData.position,
                map: map,
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                animation: google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<div style="padding: 10px;">${noteData.text}</div>`
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            notes.push({
                position: noteData.position,
                text: noteData.text,
                marker: marker
            });
        });
    }
});
}

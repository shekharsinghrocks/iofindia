// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBL684gZlCi7zeQxeRLq06guoMT5Ea4izs",
    databaseURL: "https://map-comments-e5ba0-default-rtdb.firebaseio.com",
    projectId: "map-comments-e5ba0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let map;
let currentMarker = null;
let noteForm = null;
let notes = [];
let markers = {};

function initMap() {
    // Get the note form element
    noteForm = document.getElementById('noteForm');
    
    // Default coordinates (will be replaced with user's location)
    let defaultLocation = { lat: 12.9716, lng: 77.5946 }; // Default to Bangalore coordinates
    
    // Create the map centered at the default location
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "on" }]
            }
        ],
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true
    });

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

                // Load existing comments and start listening for new ones
                loadAllComments();
                listenForNewComments();
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Error getting your location. Using default location.");
                loadAllComments();
                listenForNewComments();
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        alert("Your browser doesn't support geolocation. Using default location.");
        loadAllComments();
        listenForNewComments();
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

    // Get the pixel coordinates
    const mapDiv = map.getDiv();
    const mapRect = mapDiv.getBoundingClientRect();
    const scale = Math.pow(2, map.getZoom());
    const worldPoint = map.getProjection().fromLatLngToPoint(latLng);
    const topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    const bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    
    const x = Math.floor((worldPoint.x - bottomLeft.x) * scale + mapRect.left);
    const y = Math.floor((worldPoint.y - topRight.y) * scale + mapRect.top);

    // Position the form near the click
    noteForm.style.left = (x + 20) + 'px';
    noteForm.style.top = (y - 20) + 'px';
    noteForm.style.display = 'block';
    
    // Clear previous note text
    document.getElementById('noteText').value = '';
}

function saveNote() {
    const noteText = document.getElementById('noteText').value.trim();
    
    if (noteText && currentMarker) {
        const position = currentMarker.getPosition().toJSON();
        const timestamp = new Date().toISOString();
        
        // Save to Firebase
        const newCommentRef = database.ref('comments').push();
        newCommentRef.set({
            position: position,
            text: noteText,
            timestamp: timestamp
        }).then(() => {
            // Only remove the temporary marker after successful save
            currentMarker.setMap(null);
            currentMarker = null;
            noteForm.style.display = 'none';
        }).catch((error) => {
            console.error("Error saving comment:", error);
            alert("Error saving your comment. Please try again.");
        });
    }
}

function cancelNote() {
    if (currentMarker) {
        currentMarker.setMap(null);
        currentMarker = null;
    }
    noteForm.style.display = 'none';
}

function loadAllComments() {
    // Clear existing markers
    Object.values(markers).forEach(marker => marker.setMap(null));
    markers = {};
    
    // Load all comments from Firebase
    database.ref('comments').once('value')
        .then((snapshot) => {
            const comments = snapshot.val() || {};
            Object.entries(comments).forEach(([id, comment]) => {
                createMarkerForComment(id, comment);
            });
        })
        .catch((error) => {
            console.error("Error loading comments:", error);
        });
}

function createMarkerForComment(id, comment) {
    const marker = new google.maps.Marker({
        position: comment.position,
        map: map,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        animation: google.maps.Animation.DROP
    });

    const date = new Date(comment.timestamp).toLocaleString();
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 10px;">
                <p>${comment.text}</p>
                <small>Posted: ${date}</small>
            </div>
        `
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    markers[id] = marker;
}

function listenForNewComments() {
    // Listen for new comments being added
    database.ref('comments').on('child_added', (snapshot) => {
        const id = snapshot.key;
        const comment = snapshot.val();
        if (!markers[id]) {
            createMarkerForComment(id, comment);
        }
    });

    // Listen for comments being removed
    database.ref('comments').on('child_removed', (snapshot) => {
        const id = snapshot.key;
        if (markers[id]) {
            markers[id].setMap(null);
            delete markers[id];
        }
    });
}

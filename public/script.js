/* =========================================================
   JALRAKSHAK - MAIN FRONTEND SCRIPT
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let userLocation = null;

let isSubmittingRequest = false;

let map = null;

let userMarker = null;

let routeLine = null;

let destinationMarker = null;

let safePointMarkers = [];

let safePoints = [];

const REQUEST_ID_STORAGE_KEY =
    "jalrakshak_latest_request_id";


/* =========================================================
   BASIC DOM HELPER
   ========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   LOCATION STATUS
   ========================================================= */

function updateLocationStatus(
    message,
    type = "info"
) {

    const elements =
        document.querySelectorAll(
            "#locationStatus, #requestLocationInfo"
        );


    elements.forEach(
        (element) => {

            if (!element) {
                return;
            }


            element.textContent =
                message;


            if (type === "success") {

                element.style.background =
                    "#ecfdf5";

                element.style.color =
                    "#047857";

                element.style.border =
                    "1px solid #86efac";

            } else if (
                type === "error"
            ) {

                element.style.background =
                    "#fef2f2";

                element.style.color =
                    "#b91c1c";

                element.style.border =
                    "1px solid #fca5a5";

            } else if (
                type === "warning"
            ) {

                element.style.background =
                    "#fffbeb";

                element.style.color =
                    "#b45309";

                element.style.border =
                    "1px solid #fcd34d";

            } else {

                element.style.background =
                    "#f1f5f9";

                element.style.color =
                    "#475569";

                element.style.border =
                    "1px solid transparent";

            }

        }
    );

}


/* =========================================================
   INITIALIZE MAP
   ========================================================= */

function initializeMap() {

    const mapElement =
        getElement("map");


    if (!mapElement) {
        return;
    }


    if (typeof L === "undefined") {

        console.error(
            "Leaflet library is not loaded."
        );


        mapElement.innerHTML =
            "Map could not be loaded. Please check your internet connection.";

        return;
    }


    if (map) {
        return;
    }


    map =
        L.map("map").setView(
            [24.7955, 85.0002],
            13
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        }
    ).addTo(map);


    setTimeout(
        () => {

            if (map) {
                map.invalidateSize();
            }

        },
        500
    );

}


/* =========================================================
   LOAD SAFE POINTS
   ========================================================= */

async function loadSafePoints() {

    try {

        const response =
            await fetch(
                "/api/safe-points",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load safe points."
            );

        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            safePoints =
                data;

        } else if (
            Array.isArray(
                data.safePoints
            )
        ) {

            safePoints =
                data.safePoints;

        } else {

            safePoints = [];

        }


        /*
         * BACKEND ALREADY RETURNS ACTIVE SAFE POINTS ONLY.
         *
         * This extra frontend filter is kept as a safety
         * check so inactive locations are never selected
         * even if the API response changes in the future.
         */

        safePoints =
            safePoints.filter(
                (point) => {

                    if (
                        point.active === undefined ||
                        point.active === null
                    ) {

                        return true;

                    }

                    return (
                        point.active === true
                    );

                }
            );


        displaySafePoints();


        return safePoints;

    } catch (error) {

        console.warn(
            "Safe points could not be loaded:",
            error
        );


        /*
         * Do not destroy already loaded safe points if
         * a temporary network error happens.
         */

        return safePoints;

    }

}


/* =========================================================
   DISPLAY SAFE POINTS
   ========================================================= */

function displaySafePoints() {

    if (
        !map ||
        typeof L === "undefined"
    ) {
        return;
    }


    safePointMarkers.forEach(
        (marker) => {

            map.removeLayer(
                marker
            );

        }
    );


    safePointMarkers = [];


    safePoints.forEach(
        (point) => {

            const latitude =
                Number(
                    point.latitude ??
                    point.lat
                );


            const longitude =
                Number(
                    point.longitude ??
                    point.lng ??
                    point.lon
                );


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return;

            }


            const marker =
                L.marker(
                    [
                        latitude,
                        longitude
                    ]
                ).addTo(map);


            const name =
                point.name ||
                "Verified Safe Area";


            const address =
                point.address ||
                point.location ||
                "";


            const type =
                point.type ||
                "Safe Area";


            marker.bindPopup(
                `
                    <strong>
                        🛡️ ${escapeHtml(name)}
                    </strong>

                    <br>

                    <strong>
                        Type:
                    </strong>

                    ${escapeHtml(type)}

                    ${
                        address
                            ? `<br>${escapeHtml(address)}`
                            : ""
                    }

                    <br>

                    <small>
                        JalRakshak Verified Safe Point
                    </small>
                `
            );


            safePointMarkers.push(
                marker
            );

        }
    );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   CURRENT LOCATION
   ========================================================= */

function getCurrentLocation() {

    if (
        !navigator.geolocation
    ) {

        updateLocationStatus(
            "❌ Your browser does not support location services.",
            "error"
        );

        return;

    }


    updateLocationStatus(
        "📍 Getting your current location... Please wait.",
        "info"
    );


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude =
                Number(
                    position.coords.latitude
                );


            const longitude =
                Number(
                    position.coords.longitude
                );


            const accuracy =
                Number(
                    position.coords.accuracy
                );


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                updateLocationStatus(
                    "❌ Invalid location received. Please try again.",
                    "error"
                );

                return;

            }


            if (
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {

                updateLocationStatus(
                    "❌ Invalid GPS coordinates received.",
                    "error"
                );

                return;

            }


            userLocation = {

                latitude,

                longitude,

                accuracy:
                    Number.isFinite(
                        accuracy
                    )
                        ? accuracy
                        : null

            };


            console.log(
                "JalRakshak Current Location:",
                userLocation
            );


            if (
                Number.isFinite(accuracy) &&
                accuracy > 500
            ) {

                updateLocationStatus(
                    `⚠️ Location detected, but accuracy is low.
Latitude: ${latitude.toFixed(6)}
Longitude: ${longitude.toFixed(6)}
Accuracy: ±${Math.round(accuracy)} meters

Please click "Get My Current Location" again.`,
                    "warning"
                );

            } else {

                updateLocationStatus(
                    `✅ Location detected successfully.
Latitude: ${latitude.toFixed(6)}
Longitude: ${longitude.toFixed(6)}
Accuracy: ±${
    Number.isFinite(accuracy)
        ? Math.round(accuracy)
        : "Unknown"
} meters`,
                    "success"
                );

            }


            showUserLocationOnMap();

        },


        function (error) {

            console.error(
                "Geolocation error:",
                error
            );


            let message =
                "❌ Unable to get your location.";


            if (
                error.code === 1
            ) {

                message =
                    "❌ Location permission was denied. Please allow location access in your browser.";

            } else if (
                error.code === 2
            ) {

                message =
                    "❌ Your location could not be determined. Please turn on Location Services.";

            } else if (
                error.code === 3
            ) {

                message =
                    "❌ Location request timed out. Please try again.";

            }


            updateLocationStatus(
                message,
                "error"
            );

        },


        {
            enableHighAccuracy: true,

            timeout: 30000,

            maximumAge: 0
        }

    );

}


/* =========================================================
   SHOW USER LOCATION
   ========================================================= */

function showUserLocationOnMap() {

    if (
        !map ||
        !userLocation ||
        typeof L === "undefined"
    ) {

        return;

    }


    const coordinates = [

        userLocation.latitude,

        userLocation.longitude

    ];


    if (userMarker) {

        map.removeLayer(
            userMarker
        );

    }


    userMarker =
        L.marker(
            coordinates
        ).addTo(map);


    let popupText =
        `
            <strong>
                📍 Your Current Location
            </strong>

            <br><br>

            Latitude:
            ${userLocation.latitude.toFixed(6)}

            <br>

            Longitude:
            ${userLocation.longitude.toFixed(6)}
        `;


    if (
        Number.isFinite(
            userLocation.accuracy
        )
    ) {

        popupText +=
            `
                <br>

                Accuracy:
                ±${Math.round(
                    userLocation.accuracy
                )} meters
            `;

    }


    userMarker.bindPopup(
        popupText
    );


    userMarker.openPopup();


    map.setView(
        coordinates,
        15
    );


    setTimeout(
        () => {

            if (map) {
                map.invalidateSize();
            }

        },
        300
    );

}


/* =========================================================
   FIND NEAREST SAFE POINT
   ========================================================= */

function findNearestSafePoint() {

    if (
        !userLocation ||
        !Array.isArray(safePoints) ||
        safePoints.length === 0
    ) {

        return null;

    }


    let nearestPoint = null;

    let nearestDistance =
        Infinity;


    safePoints.forEach(
        (point) => {

            /*
             * Only ACTIVE safe points are allowed.
             *
             * Backend already sends active points only,
             * but this check protects the frontend too.
             */

            if (
                point.active !== undefined &&
                point.active !== null &&
                point.active !== true
            ) {

                return;

            }


            const latitude =
                Number(
                    point.latitude ??
                    point.lat
                );


            const longitude =
                Number(
                    point.longitude ??
                    point.lng ??
                    point.lon
                );


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return;

            }


            if (
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {

                return;

            }


            const distance =
                calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    latitude,
                    longitude
                );


            if (
                distance <
                nearestDistance
            ) {

                nearestDistance =
                    distance;

                nearestPoint = {

                    ...point,

                    latitude,

                    longitude,

                    distanceKm:
                        distance

                };

            }

        }
    );


    return nearestPoint;

}


/* =========================================================
   DISTANCE
   ========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadiusKm =
        6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =
        Math.sin(
            dLat / 2
        ) *
        Math.sin(
            dLat / 2
        ) +

        Math.cos(
            toRadians(lat1)
        ) *
        Math.cos(
            toRadians(lat2)
        ) *
        Math.sin(
            dLon / 2
        ) *
        Math.sin(
            dLon / 2
        );


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return (
        earthRadiusKm *
        c
    );

}


/* =========================================================
   RADIANS
   ========================================================= */

function toRadians(
    degrees
) {

    return (
        degrees *
        Math.PI /
        180
    );

}


/* =========================================================
   FIND SAFE ROUTE
   ========================================================= */

async function findSafeRoute() {

    const routeInfo =
        getElement("routeInfo");


    if (!routeInfo) {
        return;
    }


    routeInfo.style.display =
        "block";


    if (!userLocation) {

        routeInfo.innerHTML =
            `
                <strong>
                    📍 Location Required
                </strong>

                <br><br>

                Please click
                <strong>
                    "Get My Current Location"
                </strong>
                before finding a safe route.
            `;

        return;

    }


    /*
     * IMPORTANT NEW FEATURE:
     *
     * Refresh safe locations from the server every time
     * the user clicks Find Safe Route.
     *
     * This means if Main Admin recently added,
     * enabled or disabled a Safe Location, the latest
     * information is used without requiring the user
     * to reload the page.
     */

    routeInfo.innerHTML =
        `
            <strong>
                🛡️ Finding nearest verified safe location...
            </strong>

            <br><br>

            Please wait...
        `;


    try {

        await loadSafePoints();

    } catch (error) {

        console.warn(
            "Safe point refresh failed:",
            error
        );

    }


    const nearestSafePoint =
        findNearestSafePoint();


    if (!nearestSafePoint) {

        routeInfo.innerHTML =
            `
                <strong>
                    ⚠️ Safe Point Not Available
                </strong>

                <br><br>

                Your location was detected, but
                no verified active safe location is
                currently available in the database.

                <br><br>

                Please avoid deep or fast-moving water,
                open drains and electrical hazards.
            `;

        return;

    }


    const safeLatitude =
        nearestSafePoint.latitude;


    const safeLongitude =
        nearestSafePoint.longitude;


    const safeName =
        nearestSafePoint.name ||
        "Verified Safe Area";


    const safeType =
        nearestSafePoint.type ||
        "Safe Area";


    const safeAddress =
        nearestSafePoint.address ||
        nearestSafePoint.location ||
        "";


    const googleMapsUrl =
        `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${safeLatitude},${safeLongitude}&travelmode=walking`;


    routeInfo.innerHTML =
        `
            <strong>
                🛡️ Nearest Verified Safe Location Found
            </strong>

            <br><br>

            <strong>
                Destination:
            </strong>

            ${escapeHtml(safeName)}

            <br>

            <strong>
                Type:
            </strong>

            ${escapeHtml(safeType)}

            ${
                safeAddress
                    ? `
                        <br>

                        <strong>
                            Address:
                        </strong>

                        ${escapeHtml(
                            safeAddress
                        )}
                    `
                    : ""
            }

            <br>

            <strong>
                Approx. Distance:
            </strong>

            ${nearestSafePoint.distanceKm.toFixed(2)}
            km

            <br><br>

            <a
                href="${googleMapsUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                    display:inline-block;
                    background:#008c95;
                    color:white;
                    padding:10px 15px;
                    border-radius:8px;
                    text-decoration:none;
                    font-weight:bold;
                "
            >
                🗺️ Open Walking Route
            </a>

            <br><br>

            <small>
                🛡️ This destination is a verified
                active safe location maintained by
                JalRakshak.

                <br><br>

                ⚠️ Always check actual road and flood
                conditions before moving. Do not enter
                deep or fast-moving water.
            </small>
        `;


    drawSafeRoute(
        safeLatitude,
        safeLongitude
    );

}


/* =========================================================
   DRAW SAFE ROUTE
   ========================================================= */

function drawSafeRoute(
    destinationLatitude,
    destinationLongitude
) {

    if (
        !map ||
        !userLocation ||
        typeof L === "undefined"
    ) {

        return;

    }


    if (routeLine) {

        map.removeLayer(
            routeLine
        );

        routeLine = null;

    }


    if (destinationMarker) {

        map.removeLayer(
            destinationMarker
        );

        destinationMarker = null;

    }


    const routeCoordinates = [

        [
            userLocation.latitude,
            userLocation.longitude
        ],

        [
            (
                userLocation.latitude +
                destinationLatitude
            ) / 2,

            (
                userLocation.longitude +
                destinationLongitude
            ) / 2
        ],

        [
            destinationLatitude,
            destinationLongitude
        ]

    ];


    /*
     * This line is only a visual indication on the
     * Leaflet map. Actual road navigation is provided
     * through the Google Maps walking route above.
     */

    routeLine =
        L.polyline(
            routeCoordinates,
            {
                color: "#008c95",
                weight: 5,
                opacity: 0.85
            }
        ).addTo(map);


    destinationMarker =
        L.marker(
            [
                destinationLatitude,
                destinationLongitude
            ]
        ).addTo(map);


    destinationMarker.bindPopup(
        "🛡️ Verified Active Safe Location"
    );


    const bounds =
        L.latLngBounds(
            routeCoordinates
        );


    map.fitBounds(
        bounds,
        {
            padding: [40, 40]
        }
    );

}


/* =========================================================
   FILE TO BASE64
   ========================================================= */

function fileToBase64(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const result =
                        reader.result;


                    const base64 =
                        String(result)
                            .split(",")[1];


                    resolve(
                        base64
                    );

                };


            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Unable to read image."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   FLOOD PHOTO PREVIEW
   ========================================================= */

function setupFloodPhotoPreview() {

    const floodPhoto =
        getElement(
            "floodPhoto"
        );


    const photoPreview =
        getElement(
            "photoPreview"
        );


    if (
        !floodPhoto ||
        !photoPreview
    ) {

        return;

    }


    floodPhoto.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];


            if (!file) {

                photoPreview.src =
                    "";

                photoPreview.style.display =
                    "none";

                return;

            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                photoPreview.src =
                    "";

                photoPreview.style.display =
                    "none";


                alert(
                    "Please select a valid image file."
                );


                this.value =
                    "";

                return;

            }


            const imageUrl =
                URL.createObjectURL(
                    file
                );


            photoPreview.src =
                imageUrl;


            photoPreview.style.display =
                "block";

        }
    );

}


/* =========================================================
   ANALYZE FLOOD
   ========================================================= */

async function analyzeFlood() {

    const floodPhoto =
        getElement(
            "floodPhoto"
        );


    const analyzeButton =
        getElement(
            "analyzeFloodBtn"
        );


    const analysisResult =
        getElement(
            "analysisResult"
        );


    const dangerLevel =
        getElement(
            "dangerLevel"
        );


    const waterLevel =
        getElement(
            "waterLevel"
        );


    const safetyMessage =
        getElement(
            "safetyMessage"
        );


    if (!floodPhoto) {
        return;
    }


    const file =
        floodPhoto.files &&
        floodPhoto.files[0];


    if (!file) {

        alert(
            "Please select a flood photo first."
        );

        return;

    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        alert(
            "Please select a valid image file."
        );

        return;

    }


    try {

        if (analyzeButton) {

            analyzeButton.disabled =
                true;

            analyzeButton.textContent =
                "🤖 Analyzing Flood...";

        }


        if (analysisResult) {

            analysisResult.style.display =
                "none";

        }


        const image =
            await fileToBase64(
                file
            );


        const response =
            await fetch(
                "/api/analyze-flood",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            image,

                            mimeType:
                                file.type

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Flood analysis failed."
            );

        }


        if (dangerLevel) {

            dangerLevel.textContent =
                data.dangerLevel ||
                "Unknown";

        }


        if (waterLevel) {

            waterLevel.textContent =
                data.waterLevel ||
                "Unknown";

        }


        if (safetyMessage) {

            safetyMessage.textContent =
                data.safetyMessage ||
                "Please move towards a verified safe area and avoid flooded roads.";

        }


        if (analysisResult) {

            analysisResult.style.display =
                "block";

        }

    } catch (error) {

        console.error(
            "Flood analysis error:",
            error
        );


        alert(
            error.message ||
            "Unable to analyze the flood image."
        );

    } finally {

        if (analyzeButton) {

            analyzeButton.disabled =
                false;

            analyzeButton.textContent =
                "🤖 Analyze Flood";

        }

    }

}


/* =========================================================
   REQUEST ID STORAGE
   ========================================================= */

function saveRequestId(
    requestId
) {

    if (!requestId) {
        return;
    }


    localStorage.setItem(
        REQUEST_ID_STORAGE_KEY,
        requestId
    );

}


/* =========================================================
   LOAD SAVED REQUEST ID
   ========================================================= */

function loadSavedRequestId() {

    const requestId =
        localStorage.getItem(
            REQUEST_ID_STORAGE_KEY
        );


    const statusInput =
        getElement(
            "requestId"
        );


    if (
        requestId &&
        statusInput &&
        !statusInput.value
    ) {

        statusInput.value =
            requestId;

    }


    return requestId;

}


/* =========================================================
   REQUEST MESSAGE
   ========================================================= */

function showRequestMessage(
    message,
    type = "info"
) {

    const element =
        getElement(
            "requestMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `message ${type}`;


    element.style.display =
        "block";

}


/* =========================================================
   HIDE REQUEST MESSAGE
   ========================================================= */

function hideRequestMessage() {

    const element =
        getElement(
            "requestMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        "";


    element.className =
        "message";


    element.style.display =
        "none";

}


/* =========================================================
   SUBMIT HELP REQUEST
   ========================================================= */

async function submitHelpRequest() {

    if (
        isSubmittingRequest
    ) {

        return;

    }


    const nameInput =
        getElement(
            "name"
        );


    const mobileInput =
        getElement(
            "mobile"
        );


    const emergencyDetailsInput =
        getElement(
            "emergencyDetails"
        );


    const emergencyCheckbox =
        getElement(
            "isEmergency"
        );


    const submitButton =
        getElement(
            "submitRequestBtn"
        );


    const requestSuccess =
        getElement(
            "requestSuccess"
        );


    const requestIdText =
        getElement(
            "requestIdText"
        );


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const mobile =
        mobileInput
            ? mobileInput.value.trim()
            : "";


    const emergencyDetails =
        emergencyDetailsInput
            ? emergencyDetailsInput.value.trim()
            : "";


    const isEmergency =
        emergencyCheckbox
            ? emergencyCheckbox.checked
            : false;


    hideRequestMessage();


    if (requestSuccess) {

        requestSuccess.style.display =
            "none";

    }


    if (!name) {

        showRequestMessage(
            "Please enter your full name.",
            "error"
        );

        return;

    }


    if (
        !/^[6-9]\d{9}$/.test(
            mobile
        )
    ) {

        showRequestMessage(
            "Please enter a valid 10-digit Indian mobile number.",
            "error"
        );

        return;

    }


    if (!emergencyDetails) {

        showRequestMessage(
            "Please describe your emergency.",
            "error"
        );

        return;

    }


    if (!userLocation) {

        showRequestMessage(
            "Please get your current location before submitting the emergency request.",
            "error"
        );

        return;

    }


    if (
        Number.isFinite(
            userLocation.accuracy
        ) &&
        userLocation.accuracy > 1000
    ) {

        showRequestMessage(
            `⚠️ Your location accuracy is too low (±${Math.round(userLocation.accuracy)} meters). Please click "Get My Current Location" again.`,
            "error"
        );

        return;

    }


    isSubmittingRequest =
        true;


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "🚨 Submitting Request...";

    }


    try {

        const response =
            await fetch(
                "/api/volunteer-request",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            name,

                            mobile,

                            emergencyDetails,

                            isEmergency,

                            location: {

                                latitude:
                                    userLocation.latitude,

                                longitude:
                                    userLocation.longitude

                            }

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to submit emergency request."
            );

        }


        const requestId =
            data.requestId ||
            (
                data.request &&
                data.request.requestId
            );


        if (!requestId) {

            throw new Error(
                "Request was submitted but Request ID was not received."
            );

        }


        saveRequestId(
            requestId
        );


        const statusInput =
            getElement(
                "requestId"
            );


        if (statusInput) {

            statusInput.value =
                requestId;

        }


        if (requestIdText) {

            requestIdText.textContent =
                requestId;

        }


        if (requestSuccess) {

            requestSuccess.style.display =
                "block";

        }


        showRequestMessage(
            isEmergency
                ? "🚨 Emergency request submitted successfully. Response team can now view your request."
                : "✅ Your help request has been submitted successfully.",
            "success"
        );


        if (nameInput) {
            nameInput.value = "";
        }


        if (mobileInput) {
            mobileInput.value = "";
        }


        if (emergencyDetailsInput) {
            emergencyDetailsInput.value = "";
        }


        if (emergencyCheckbox) {
            emergencyCheckbox.checked = false;
        }


        updateLocationStatus(
            `✅ Location attached to your request.
Latitude: ${userLocation.latitude.toFixed(6)}
Longitude: ${userLocation.longitude.toFixed(6)}
${
    Number.isFinite(userLocation.accuracy)
        ? `Accuracy: ±${Math.round(userLocation.accuracy)} meters`
        : ""
}`,
            "success"
        );


    } catch (error) {

        console.error(
            "Request submission error:",
            error
        );


        showRequestMessage(
            error.message ||
            "Unable to submit your request.",
            "error"
        );

    } finally {

        isSubmittingRequest =
            false;


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "🚨 Submit Request for Help";

        }

    }

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    dateValue
) {

    if (!dateValue) {
        return "-";
    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
        );

    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    );

}


/* =========================================================
   CHECK REQUEST STATUS
   ========================================================= */

async function checkRequestStatus() {

    const statusInput =
        getElement(
            "requestId"
        );


    const statusResult =
        getElement(
            "statusResult"
        );


    const statusBox =
        getElement(
            "statusBox"
        );


    const statusRequestIdText =
        getElement(
            "statusRequestIdText"
        );


    const statusName =
        getElement(
            "statusName"
        );


    const statusValue =
        getElement(
            "statusValue"
        );


    const statusEmergencyDetails =
        getElement(
            "statusEmergencyDetails"
        );


    const statusCreatedAt =
        getElement(
            "statusCreatedAt"
        );


    const statusHandledBy =
        getElement(
            "statusHandledBy"
        );


    const statusError =
        getElement(
            "statusError"
        );


    if (!statusInput) {
        return;
    }


    const requestId =
        statusInput.value
            .trim()
            .toUpperCase();


    if (!requestId) {

        if (statusError) {

            statusError.textContent =
                "Please enter your Request ID.";

            statusError.style.display =
                "block";

        }

        return;

    }


    if (statusError) {

        statusError.style.display =
            "none";

    }


    try {

        const response =
            await fetch(
                `/api/volunteer-request/${encodeURIComponent(requestId)}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Request not found."
            );

        }


        const request =
            data.request ||
            data;


        if (statusRequestIdText) {

            statusRequestIdText.textContent =
                request.requestId ||
                requestId;

        }


        if (statusName) {

            statusName.textContent =
                request.name ||
                "-";

        }


        if (statusValue) {

            statusValue.textContent =
                request.status ||
                "Pending";

        }


        if (statusEmergencyDetails) {

            statusEmergencyDetails.textContent =
                request.emergencyDetails ||
                "-";

        }


        if (statusCreatedAt) {

            statusCreatedAt.textContent =
                formatDate(
                    request.createdAt
                );

        }


        if (statusHandledBy) {

            const handledBy =
                request.handledBy;


            if (
                handledBy &&
                (
                    handledBy.username ||
                    handledBy.adminId
                )
            ) {

                statusHandledBy.textContent =
                    handledBy.username ||
                    handledBy.adminId;

            } else {

                statusHandledBy.textContent =
                    "Not assigned yet";

            }

        }


        if (statusBox) {

            statusBox.className =
                "status-box";


            const status =
                String(
                    request.status ||
                    "Pending"
                ).toLowerCase();


            if (
                status === "pending"
            ) {

                statusBox.classList.add(
                    "status-pending"
                );

            } else if (
                status === "accepted"
            ) {

                statusBox.classList.add(
                    "status-accepted"
                );

            } else if (
                status === "completed"
            ) {

                statusBox.classList.add(
                    "status-completed"
                );

            } else {

                statusBox.classList.add(
                    "status-pending"
                );

            }

        }


        if (statusResult) {

            statusResult.style.display =
                "block";

        }


        saveRequestId(
            request.requestId ||
            requestId
        );


    } catch (error) {

        console.error(
            "Status check error:",
            error
        );


        if (statusResult) {

            statusResult.style.display =
                "none";

        }


        if (statusError) {

            statusError.textContent =
                error.message ||
                "Request not found.";

            statusError.style.display =
                "block";

        }

    }

}


/* =========================================================
   MOBILE INPUT
   ========================================================= */

function setupMobileInput() {

    const mobileInput =
        getElement(
            "mobile"
        );


    if (!mobileInput) {
        return;
    }


    mobileInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(
                        /\D/g,
                        ""
                    )
                    .slice(
                        0,
                        10
                    );

        }
    );

}


/* =========================================================
   REQUEST ID INPUT
   ========================================================= */

function setupRequestIdInput() {

    const input =
        getElement(
            "requestId"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .toUpperCase()
                    .replace(
                        /\s/g,
                        ""
                    );

        }
    );

}


/* =========================================================
   REQUEST HELP PANEL
   ========================================================= */

function setupRequestHelpButton() {

    const requestHelpBtn =
        getElement(
            "requestHelpBtn"
        );


    const volunteerForm =
        getElement(
            "volunteerForm"
        );


    if (
        !requestHelpBtn ||
        !volunteerForm
    ) {

        return;

    }


    requestHelpBtn.addEventListener(
        "click",
        function () {

            const hidden =
                volunteerForm.style.display ===
                "none";


            volunteerForm.style.display =
                hidden
                    ? "block"
                    : "none";


            if (hidden) {

                requestHelpBtn.textContent =
                    "✖ Close Request Form";


                setTimeout(
                    () => {

                        volunteerForm.scrollIntoView(
                            {
                                behavior:
                                    "smooth",

                                block:
                                    "nearest"
                            }
                        );

                    },
                    50
                );

            } else {

                requestHelpBtn.textContent =
                    "🚨 Request Help";

            }

        }
    );

}


/* =========================================================
   DOM CONTENT LOADED
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "JalRakshak frontend loaded successfully."
        );


        initializeMap();


        loadSafePoints();


        const locationButtons =
            document.querySelectorAll(
                "#allowLocationBtn"
            );


        locationButtons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    getCurrentLocation
                );

            }
        );


        setupFloodPhotoPreview();


        const submitRequestBtn =
            getElement(
                "submitRequestBtn"
            );


        if (submitRequestBtn) {

            submitRequestBtn.addEventListener(
                "click",
                submitHelpRequest
            );

        }


        const checkStatusBtn =
            getElement(
                "checkStatusBtn"
            );


        if (checkStatusBtn) {

            checkStatusBtn.addEventListener(
                "click",
                checkRequestStatus
            );

        }


        setupMobileInput();


        setupRequestIdInput();


        setupRequestHelpButton();


        loadSavedRequestId();

    }
);
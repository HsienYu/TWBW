import { createI18n, bindLanguageUI } from './i18n.js';
import { createCompass } from './compass.js';
import { validCoordinates } from './navigation.js';

const i18n = createI18n({ window });
bindLanguageUI(i18n, document);
const mobile = /Mobi|Android/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!mobile) {
    document.getElementById('landing-page').hidden = true;
    document.getElementById('mobile-notice').hidden = false;
} else {
    startJourney();
}
function startJourney() {

    const API_BASE = 'https://data.therewillbeworks.com/gpt';
    const sessionStorageKey = 'twbw-session-id';
    let currentLat = 0;
    let currentLng = 0;
    let currentAccuracy = 0;
    let availableTargets = [];
    let selectedTarget = null;
    let hasReachedSelectedTarget = false;
    let photoBlob = null;
    let cameraStream = null;
    let targetListLoaded = false;
    let targetListRequestInFlight = false;
    let fallbackToken = null;
    let currentPosition = null;
    let positionInFlight = false;
    let messageKey = 'locationRequired';
    let photoAction = 'takePhoto';
    let compassState = { status: 'location', bearing: null, rotation: null };
    let interval = null;
    let previewUrl = null;
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const compass = createCompass({ window, onChange(state) { compassState = state; render(); } });

    function sessionId() {
        let id = localStorage.getItem(sessionStorageKey);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(sessionStorageKey, id);
        }
        return id;
    }

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, options);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
        return data;
    }

    function setMessage(key) {
        messageKey = key;
        render();
    }

    function render() {
        document.getElementById('message').textContent = i18n.t(messageKey);
        document.getElementById('taipei-time').textContent = i18n.date(Date.now());
        document.getElementById('upload-button').textContent = i18n.t(photoAction);
        const fresh = currentPosition && Date.now() - currentPosition.timestamp <= 15000;
        document.getElementById('distance').textContent = fresh && selectedTarget
            ? i18n.t('distance', { distance: i18n.number(distanceInMeters(currentPosition, selectedTarget), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
            : i18n.t('locationRequired');
        document.getElementById('coordinates').textContent = selectedTarget
            ? i18n.t('coordinates', { latitude: selectedTarget.latitude, longitude: selectedTarget.longitude })
            : i18n.t('coordinatesUnavailable');
        const { status, bearing, rotation, enabled, permissionPending } = compassState;
        const arrow = document.getElementById('compass-arrow');
        arrow.toggleAttribute('hidden', rotation === null);
        if (rotation !== null) arrow.style.transform = `rotate(${rotation}deg)`;
        document.getElementById('compass-status').textContent = i18n.t(`compass_${status}`);
        document.getElementById('bearing').textContent = bearing === null ? '' : i18n.t('bearing', {
            direction: i18n.t(directions[Math.round(bearing / 45) % 8]),
            degrees: i18n.number(Math.round(bearing) % 360)
        });
        const enableButton = document.getElementById('enable-compass');
        enableButton.hidden = Boolean(enabled) || hasReachedSelectedTarget;
        enableButton.disabled = Boolean(permissionPending);
    }

    function updateGuidance() {
        compass.update(currentPosition, selectedTarget, hasReachedSelectedTarget);
    }

    function distanceInMeters(first, second) {
        const earthRadius = 6371000;
        const latitudeDelta = (second.latitude - first.latitude) * Math.PI / 180;
        const longitudeDelta = (second.longitude - first.longitude) * Math.PI / 180;
        const value = Math.sin(latitudeDelta / 2) ** 2
            + Math.cos(first.latitude * Math.PI / 180) * Math.cos(second.latitude * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
        return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    }

    function setDistance(target) {
        const distance = distanceInMeters({ latitude: currentLat, longitude: currentLng }, target);
        updateGuidance();
        return distance;
    }

    function chooseNearestCachedTarget() {
        if (!availableTargets.length || hasReachedSelectedTarget) return;
        selectedTarget = [...availableTargets]
            .sort((first, second) => distanceInMeters({ latitude: currentLat, longitude: currentLng }, first) - distanceInMeters({ latitude: currentLat, longitude: currentLng }, second))[0];
        setMessage('follow');
        setDistance(selectedTarget);
    }

    async function loadTargetList() {
        if (targetListRequestInFlight) return;
        targetListRequestInFlight = true;
        try {
            const data = await request('/location/targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: currentLat, longitude: currentLng, sessionId: sessionId() })
            });
            if (!Array.isArray(data.targets) || data.targets.some(target => !validCoordinates(target))) {
                throw new Error('Invalid target coordinates');
            }
            availableTargets = data.targets;
            fallbackToken = data.journeyType === 'fallback' ? data.fallbackToken : null;
            selectedTarget = null;
            hasReachedSelectedTarget = false;
            targetListLoaded = true;
            chooseNearestCachedTarget();
            if (!availableTargets.length) setMessage('noTargets');
            updateGuidance();
        } finally {
            targetListRequestInFlight = false;
        }
    }

    async function checkSelectedTarget() {
        const data = await request('/location/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: currentLat,
                longitude: currentLng,
                accuracy: currentAccuracy,
                sessionId: sessionId(),
                targetId: selectedTarget.id,
                fallbackToken
            })
        });
        document.getElementById('server-message').textContent = typeof data.message === 'string' ? data.message : '';
        document.getElementById('server-instructions').hidden = !data.message;
        setMessage('compass_arrived');
        hasReachedSelectedTarget = true;
        updateGuidance();
        document.getElementById('upload-button').style.display = 'block';
        document.getElementById('message').style.fontSize = '5vw';
    }

    function openCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert(i18n.t('cameraError'));
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then((stream) => {
                cameraStream = stream;
                const videoContainer = document.getElementById('video-container');
                videoContainer.innerHTML = '<video id="video" autoplay playsinline muted class="img-fluid"></video>';
                const video = document.getElementById('video');
                video.srcObject = stream;
                video.play();

                const takePhotoButton = document.getElementById('upload-button');
                photoAction = 'takePhoto';
                render();
                takePhotoButton.onclick = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    document.getElementById('flash').style.opacity = '1';
                    setTimeout(() => { document.getElementById('flash').style.opacity = '0'; }, 100);
                    canvas.toBlob((blob) => {
                        photoBlob = blob;
                        photoAction = 'uploadImage';
                        render();
                        takePhotoButton.onclick = uploadPhoto;
                        const image = document.createElement('img');
                        previewUrl = URL.createObjectURL(blob);
                        image.src = previewUrl;
                        image.alt = i18n.t('workImage');
                        image.style.width = '80%';
                        image.style.borderRadius = '8px';
                        image.onclick = openCamera;
                        videoContainer.replaceChildren(image);
                    }, 'image/jpeg', 0.9);
                    cameraStream?.getTracks().forEach((track) => track.stop());
                    cameraStream = null;
                };
                videoContainer.style.display = 'block';
            })
            .catch((error) => {
                console.error('Camera access failed:', error.name);
                alert(i18n.t('cameraError'));
            });
    }

    async function uploadPhoto() {
        if (!photoBlob || !selectedTarget) return;
        const formData = new FormData();
        formData.append('photo', photoBlob, 'photo.jpg');
        formData.append('latitude', String(currentLat));
        formData.append('longitude', String(currentLng));
        formData.append('accuracy', String(currentAccuracy));
        formData.append('targetId', selectedTarget.id);
        formData.append('sessionId', sessionId());
        if (fallbackToken) formData.append('fallbackToken', fallbackToken);
        document.getElementById('uploading-indicator').style.display = 'block';
        try {
            await request('/upload', { method: 'POST', body: formData });
            window.location.href = new URL('./pages/works.html', window.location.href).href;
        } catch (error) {
            console.error('Photo upload failed.');
            alert(i18n.t('uploadError'));
        } finally {
            document.getElementById('uploading-indicator').style.display = 'none';
        }
    }

    function updatePosition() {
        if (positionInFlight || document.hidden) return;
        if (!navigator.geolocation) {
            setMessage('locationUnavailable');
            return;
        }
        positionInFlight = true;
        navigator.geolocation.getCurrentPosition(async (position) => {
            if (!validCoordinates(position.coords)) {
                positionInFlight = false;
                currentPosition = null;
                compass.invalidatePosition();
                setMessage('locationUnavailable');
                return;
            }
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            currentAccuracy = position.coords.accuracy;
            currentPosition = { latitude: currentLat, longitude: currentLng, timestamp: position.timestamp };
            try {
                if (!targetListLoaded) await loadTargetList();
                chooseNearestCachedTarget();
                if (selectedTarget) {
                    const distance = setDistance(selectedTarget);
                    if (!hasReachedSelectedTarget && distance <= selectedTarget.radiusMeters + currentAccuracy) await checkSelectedTarget();
                }
            } catch (error) {
                document.getElementById('upload-button').style.display = 'none';
                console.error('Target request failed.');
                setMessage('targetError');
            } finally {
                positionInFlight = false;
                updateGuidance();
            }
        }, (error) => {
            positionInFlight = false;
            currentPosition = null;
            compass.invalidatePosition();
            console.warn('Location unavailable:', error.code);
            setMessage('locationUnavailable');
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }

    window.addEventListener('pagehide', (event) => {
        cameraStream?.getTracks().forEach((track) => track.stop());
        cameraStream = null;
        currentPosition = null;
        compass.invalidatePosition();
        if (!event.persisted) {
            clearInterval(interval);
            compass.destroy();
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    });
    i18n.subscribe(() => {
        render();
        const preview = document.querySelector('#video-container img');
        if (preview) preview.alt = i18n.t('workImage');
    });
    document.getElementById('enable-compass').onclick = () => compass.enable();
    document.getElementById('upload-button').onclick = openCamera;
    document.getElementById('start-button').onclick = () => {
        document.getElementById('landing-page').hidden = true;
        document.getElementById('main-content').style.display = 'block';
        if (interval === null) {
            updatePosition();
            interval = setInterval(updatePosition, 5000);
        }
    };
    render();
}

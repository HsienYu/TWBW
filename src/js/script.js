document.addEventListener('DOMContentLoaded', () => {
    if (!isMobileDevice()) return;

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

    function setMessage(message) {
        document.getElementById('message').textContent = message;
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
        document.getElementById('distance').textContent = `${distance.toFixed(1)} meters to the next location`;
        document.getElementById('coordinates').textContent = `${target.latitude} , ${target.longitude}`;
        return distance;
    }

    function chooseNearestCachedTarget() {
        if (!availableTargets.length || hasReachedSelectedTarget) return;
        selectedTarget = [...availableTargets]
            .sort((first, second) => distanceInMeters({ latitude: currentLat, longitude: currentLng }, first) - distanceInMeters({ latitude: currentLat, longitude: currentLng }, second))[0];
        setMessage(`Follow the coordinates ${selectedTarget.latitude} , ${selectedTarget.longitude} to reach the target location in range.`);
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
            availableTargets = data.targets;
            fallbackToken = data.journeyType === 'fallback' ? data.fallbackToken : null;
            selectedTarget = null;
            hasReachedSelectedTarget = false;
            targetListLoaded = true;
            chooseNearestCachedTarget();
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
        setMessage(data.message);
        hasReachedSelectedTarget = true;
        document.getElementById('upload-button').style.display = 'block';
        document.getElementById('message').style.fontSize = '5vw';
    }

    function openCamera() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then((stream) => {
                cameraStream = stream;
                const videoContainer = document.getElementById('video-container');
                videoContainer.innerHTML = '<video id="video" autoplay playsinline muted class="img-fluid"></video>';
                const video = document.getElementById('video');
                video.srcObject = stream;
                video.play();

                const takePhotoButton = document.getElementById('upload-button');
                takePhotoButton.textContent = 'Take Photo';
                takePhotoButton.onclick = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    document.getElementById('flash').style.opacity = '1';
                    setTimeout(() => { document.getElementById('flash').style.opacity = '0'; }, 100);
                    canvas.toBlob((blob) => {
                        photoBlob = blob;
                        takePhotoButton.textContent = 'Upload Image';
                        takePhotoButton.onclick = uploadPhoto;
                        const image = document.createElement('img');
                        image.src = URL.createObjectURL(blob);
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
                console.error('Error accessing camera:', error);
                alert('Failed to access camera. Please check camera permission.');
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
            window.location.href = 'https://therewillbeworks.com/pages/works.html';
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.message || 'Failed to upload photo.');
        } finally {
            document.getElementById('uploading-indicator').style.display = 'none';
        }
    }

    function updatePosition() {
        document.getElementById('taipei-time').textContent = new Date().toLocaleString();
        navigator.geolocation.getCurrentPosition(async (position) => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            currentAccuracy = position.coords.accuracy;
            try {
                if (!targetListLoaded) await loadTargetList();
                chooseNearestCachedTarget();
                if (selectedTarget) {
                    const distance = setDistance(selectedTarget);
                    if (!hasReachedSelectedTarget && distance <= selectedTarget.radiusMeters + currentAccuracy) await checkSelectedTarget();
                }
            } catch (error) {
                document.getElementById('upload-button').style.display = 'none';
                setMessage(error.message || 'Unable to load target locations.');
            }
        }, (error) => {
            console.error('Error getting location:', error);
            setMessage('Location is required to find target locations.');
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }

    window.addEventListener('beforeunload', () => cameraStream?.getTracks().forEach((track) => track.stop()));
    document.getElementById('upload-button').onclick = openCamera;
    updatePosition();
    setInterval(updatePosition, 5000);
});

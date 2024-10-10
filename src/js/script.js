document.addEventListener('DOMContentLoaded', () => {
    function isMobileDevice() {
        return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
    }

    function openCamera() {
        const constraints = {
            video: { facingMode: "environment" }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                // Recreate the video element
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
                    const context = canvas.getContext('2d');
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Flash effect
                    const flash = document.getElementById('flash');
                    flash.style.opacity = '1';
                    setTimeout(() => {
                        flash.style.opacity = '0';
                    }, 100);

                    canvas.toBlob((blob) => {
                        photoBlob = blob;
                        takePhotoButton.textContent = 'Upload Image';
                        takePhotoButton.onclick = uploadPhoto;

                        // Display the still image
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(blob);
                        img.style.width = '80%';
                        img.style.border = '1px solid #ccc';
                        img.style.borderRadius = '8px';
                        img.onclick = openCamera; // Add click event to retake photo
                        videoContainer.innerHTML = '';
                        videoContainer.appendChild(img);
                    });

                    stream.getTracks().forEach(track => track.stop());
                };

                videoContainer.style.display = 'block';
            })
            .catch((error) => {
                console.error('Error accessing camera:', error);
                alert('Failed to access camera.');
            });
    }

    function uploadPhoto() {
        if (photoBlob) {
            const formData = new FormData();
            formData.append('photo', photoBlob, 'photo.jpg');

            fetch('YOUR_BACKEND_URL', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data);
                    alert('Photo uploaded successfully!');
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('Failed to upload photo.');
                });
        }
    }

    let photoBlob = null;

    if (!isMobileDevice()) {
        document.body.innerHTML = '<div id="non-mobile-message">This site is only accessible on mobile devices.</div>';
    }

    const targets = [
        { latitude: 25.054617999204893, longitude: 121.51873566781988, message: 'There should be a work.' },
        { latitude: 25.053129564646287, longitude: 121.52107905291801, message: 'There may have a work.' },
        { latitude: 25.051985738512794, longitude: 121.52107905291801, message: 'There could be a work' },
        { latitude: 25.057500352102065, longitude: 121.56949563667358, message: 'The works might be not artwork.' },
        { latitude: 25.058500352102065, longitude: 121.57049563667358, message: 'There might be no works.' }
    ];
    const rangeInMeters = 111;

    function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }

    function updatePosition() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                // For testing purposes, use fixed coordinates
                // const latitude = 25.054617999204893;
                // const longitude = 121.51873566781988;

                console.log('Current position:', { latitude, longitude });

                document.getElementById('coordinates').textContent = `${latitude.toFixed(6)} , ${longitude.toFixed(6)}`;

                let message = 'Follow the coordinates to reach the target location in range.';
                let foundTarget = false;
                for (const target of targets) {
                    const distance = getDistanceFromLatLonInMeters(latitude, longitude, target.latitude, target.longitude);
                    console.log(`Distance to ${target.message}: ${distance} meters`);
                    if (distance <= rangeInMeters) {
                        message = target.message;
                        foundTarget = true;
                        document.getElementById('upload-button').style.display = 'block';
                        break;
                    }
                }
                if (!foundTarget) {
                    console.log('No target found within range.');
                    document.getElementById('upload-button').style.display = 'none';
                }
                document.getElementById('message').textContent = message;
                document.getElementById('message').style.display = 'block';
            },
            (error) => {
                console.error('Error getting location:', error);
                if (error.code === 3) {
                    alert('Position acquisition timed out. Please try again.');
                }
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }

    setInterval(updatePosition, 1000);

    // Attach openCamera function to the button after DOM is loaded
    document.getElementById('upload-button').onclick = openCamera;
});
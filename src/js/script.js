document.addEventListener('DOMContentLoaded', () => {
    if (isMobileDevice()) {

        //define global variables
        var currentLat = 0;
        var currentLng = 0;

        var isNextLocation = false;

        var currentURL = window.location.href;


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
                            img.style.border = '0px solid #ccc';
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
                    alert('Failed to access camera. Please try again or check if the camera permission is granted.');
                });
        }

        function uploadPhoto() {
            if (photoBlob) {
                const formData = new FormData();
                formData.append('photo', photoBlob, 'photo.jpg');
                formData.append('coordinates', `${currentLat}, ${currentLng}`);

                document.getElementById('uploading-indicator').style.display = 'block';


                fetch('https://696b0e2d10d7.ngrok.app/upload', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Success:', data);
                        alert('Photo uploaded successfully!');
                        window.location.href = 'https://therewillbeworks.com/pages/works.html';
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        alert('Failed to upload photo.');
                    })
                    .finally(() => {
                        // Hide the uploading indicator
                        document.getElementById('uploading-indicator').style.display = 'none';
                    });
            }
        }

        let photoBlob = null;

        const targets = [
            { latitude: 25.054656876401825, longitude: 121.51881076967368, message: 'There should be a work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.053610270447848, longitude: 121.519501592617, message: 'There may have a work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.05112201470363, longitude: 121.52145852057377, message: 'There could be a work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.055468618506882, longitude: 121.52167848541225, message: 'The works might be not artwork. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.056763758169904, longitude: 121.51925175121426, message: 'There might be no works. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.059300864105335, longitude: 121.5206885230802, message: 'There could be work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.057136937711785, longitude: 121.52020752372813, message: 'There might be work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.057813858365396, longitude: 121.51913946120331, message: 'There was a work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.053125279064247, longitude: 121.52490692010204, message: 'There might be no work. If you have seen it, pls. take and upload the photo.' },
            { latitude: 25.053076681951502, longitude: 121.52672545782569, message: 'There could be work. If you have seen it, pls. take and upload the photo.' },
        ];
        const rangeInMeters = 30;

        function getRandomTarget(targets) {
            const randomIndex = Math.floor(Math.random() * targets.length);
            return targets[randomIndex];
        }

        // Get a random target
        const randomTarget = getRandomTarget(targets);

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
            const taipeiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
            document.getElementById('taipei-time').textContent = `${taipeiTime}`;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    // For testing purposes, use fixed coordinates
                    // const latitude = 25.054656876401825;
                    // const longitude = 121.51881076967368;
                    currentLat = latitude;
                    currentLng = longitude;

                    console.log('Current position:', { latitude, longitude });

                    document.getElementById('coordinates').textContent = `${latitude} , ${longitude}`;

                    //check if the user is going to the next location, parameter isNextLocation is set to true, https://therewillbeworks.com?nextLocation=true
                    if (currentURL.includes('nextLocation=true')) {
                        console.log('Set nextLocation to true');
                        isNextLocation = true;
                    }


                    let message = `Follow the coordinates ${randomTarget.latitude} , ${randomTarget.longitude} to reach the target location in range.`;
                    let foundTarget = false;

                    if (isNextLocation) {
                        console.log('Next location is true');
                        const distance = getDistanceFromLatLonInMeters(latitude, longitude, randomTarget.latitude, randomTarget.longitude);
                        console.log(`Distance to target: ${distance} meters`);
                        document.getElementById('distance').textContent = `${distance.toFixed(1)} meters`;
                        if (distance <= rangeInMeters) {
                            message = randomTarget.message;
                            foundTarget = true;
                            document.getElementById('upload-button').style.display = 'block';
                            document.getElementById('message').style.fontSize = '5vw';
                        }
                    } else {
                        console.log('First location to start');
                        for (const target of targets) {
                            const distance = getDistanceFromLatLonInMeters(latitude, longitude, target.latitude, target.longitude);
                            console.log(`Distance to ${target.message}: ${distance} meters`);
                            document.getElementById('distance').textContent = `${distance.toFixed(1)} meters`;
                            if (distance <= rangeInMeters) {
                                message = target.message;
                                foundTarget = true;
                                document.getElementById('upload-button').style.display = 'block';
                                document.getElementById('message').style.fontSize = '5vw';
                                break;
                            }
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
                        console.log('Position acquisition timed out. Please try again.');
                    }
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }

        setInterval(updatePosition, 1000);

        // Attach openCamera function to the button after DOM is loaded
        document.getElementById('upload-button').onclick = openCamera;
    }
});
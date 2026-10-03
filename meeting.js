// ==========================================
// AUTHENTICATION
// ==========================================

checkAuthentication();

const token = getToken();

const username = getUsername();

document.getElementById(
    "usernameDisplay"
).textContent = username;


// ==========================================
// SOCKET.IO
// ==========================================

const socket = io();


// ==========================================
// ROOM
// ==========================================

let roomId =
    new URLSearchParams(
        window.location.search
    ).get("room");


if (!roomId) {

    roomId =
        prompt("Enter Meeting Room ID:");

    if (!roomId) {

        roomId =
            Math.random()
                .toString(36)
                .substring(2, 8);
    }

    window.history.replaceState(
        {},
        "",
        `meeting.html?room=${roomId}`
    );
}


// ==========================================
// VIDEO
// ==========================================

const localVideo =
    document.getElementById("localVideo");

let localStream;

const peers = {};


// ==========================================
// START CAMERA
// ==========================================

async function startCamera() {

    try {

        localStream =
            await navigator.mediaDevices
                .getUserMedia({
                    video: true,
                    audio: true
                });

        localVideo.srcObject =
            localStream;

        socket.emit(
            "join-room",
            {
                roomId,
                username
            }
        );

    } catch (error) {

        alert(
            "Camera and microphone permission is required."
        );

        console.error(error);
    }
}


startCamera();


// ==========================================
// CREATE PEER CONNECTION
// ==========================================

function createPeerConnection(
    targetSocketId
) {

    const peer =
        new RTCPeerConnection({

            iceServers: [
                {
                    urls:
                        "stun:stun.l.google.com:19302"
                }
            ]

        });


    localStream
        .getTracks()
        .forEach(track => {

            peer.addTrack(
                track,
                localStream
            );
        });


    peer.ontrack =
        function (event) {

            addRemoteVideo(
                targetSocketId,
                event.streams[0]
            );
        };


    peer.onicecandidate =
        function (event) {

            if (event.candidate) {

                socket.emit(
                    "ice-candidate",
                    {
                        target:
                            targetSocketId,

                        candidate:
                            event.candidate
                    }
                );
            }
        };


    peers[targetSocketId] =
        peer;


    return peer;
}


// ==========================================
// ADD REMOTE VIDEO
// ==========================================

function addRemoteVideo(
    socketId,
    stream
) {

    let video =
        document.getElementById(
            `video-${socketId}`
        );


    if (!video) {

        video =
            document.createElement(
                "video"
            );

        video.id =
            `video-${socketId}`;

        video.autoplay = true;

        video.playsInline = true;

        document.getElementById(
            "videoGrid"
        ).appendChild(video);
    }


    video.srcObject = stream;
}


// ==========================================
// EXISTING USERS
// ==========================================

socket.on(
    "existing-users",
    async function (users) {

        for (const user of users) {

            const peer =
                createPeerConnection(
                    user.socketId
                );


            const offer =
                await peer.createOffer();


            await peer.setLocalDescription(
                offer
            );


            socket.emit(
                "offer",
                {
                    target:
                        user.socketId,

                    offer
                }
            );
        }
    }
);


// ==========================================
// NEW USER
// ==========================================

socket.on(
    "user-joined",
    function (user) {

        console.log(
            `${user.username} joined`
        );
    }
);


// ==========================================
// RECEIVE OFFER
// ==========================================

socket.on(
    "offer",
    async function ({
        sender,
        offer
    }) {

        const peer =
            createPeerConnection(
                sender
            );


        await peer.setRemoteDescription(
            new RTCSessionDescription(
                offer
            )
        );


        const answer =
            await peer.createAnswer();


        await peer.setLocalDescription(
            answer
        );


        socket.emit(
            "answer",
            {
                target: sender,
                answer
            }
        );
    }
);


// ==========================================
// RECEIVE ANSWER
// ==========================================

socket.on(
    "answer",
    async function ({
        sender,
        answer
    }) {

        const peer =
            peers[sender];

        if (!peer) return;

        await peer.setRemoteDescription(
            new RTCSessionDescription(
                answer
            )
        );
    }
);


// ==========================================
// ICE CANDIDATE
// ==========================================

socket.on(
    "ice-candidate",
    async function ({
        sender,
        candidate
    }) {

        const peer =
            peers[sender];

        if (!peer) return;

        try {

            await peer.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

        } catch (error) {

            console.error(
                error
            );
        }
    }
);


// ==========================================
// USER LEFT
// ==========================================

socket.on(
    "user-left",
    function ({
        socketId
    }) {

        const video =
            document.getElementById(
                `video-${socketId}`
            );

        if (video) {
            video.remove();
        }


        if (peers[socketId]) {

            peers[socketId].close();

            delete peers[socketId];
        }
    }
);


// ==========================================
// MICROPHONE
// ==========================================

document.getElementById(
    "micButton"
).addEventListener(
    "click",
    function () {

        const audioTrack =
            localStream.getAudioTracks()[0];

        if (!audioTrack) return;

        audioTrack.enabled =
            !audioTrack.enabled;

        this.textContent =
            audioTrack.enabled
                ? "🎤 Microphone"
                : "🔇 Microphone";
    }
);


// ==========================================
// CAMERA
// ==========================================

document.getElementById(
    "cameraButton"
).addEventListener(
    "click",
    function () {

        const videoTrack =
            localStream.getVideoTracks()[0];

        if (!videoTrack) return;

        videoTrack.enabled =
            !videoTrack.enabled;

        this.textContent =
            videoTrack.enabled
                ? "📷 Camera"
                : "🚫 Camera";
    }
);


// ==========================================
// SCREEN SHARING
// ==========================================

document.getElementById(
    "screenButton"
).addEventListener(
    "click",
    async function () {

        try {

            const screenStream =
                await navigator.mediaDevices
                    .getDisplayMedia({
                        video: true
                    });


            const screenTrack =
                screenStream.getVideoTracks()[0];


            const localVideoTrack =
                localStream
                    .getVideoTracks()[0];


            Object.values(peers)
                .forEach(peer => {

                    const sender =
                        peer.getSenders()
                            .find(
                                sender =>
                                    sender.track &&
                                    sender.track.kind ===
                                    "video"
                            );

                    if (sender) {

                        sender.replaceTrack(
                            screenTrack
                        );
                    }
                });


            localVideo.srcObject =
                screenStream;


            screenTrack.onended =
                function () {

                    Object.values(peers)
                        .forEach(peer => {

                            const sender =
                                peer.getSenders()
                                    .find(
                                        sender =>
                                            sender.track &&
                                            sender.track.kind ===
                                            "video"
                                    );

                            if (sender) {

                                sender.replaceTrack(
                                    localVideoTrack
                                );
                            }
                        });


                    localVideo.srcObject =
                        localStream;
                };


        } catch (error) {

            console.error(
                "Screen sharing failed:",
                error
            );
        }
    }
);


// ==========================================
// LEAVE MEETING
// ==========================================

document.getElementById(
    "leaveButton"
).addEventListener(
    "click",
    function () {

        Object.values(peers)
            .forEach(peer =>
                peer.close()
            );


        if (localStream) {

            localStream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );
        }


        socket.disconnect();

        window.location.href =
            "index.html";
    }
);


// ==========================================
// CHAT
// ==========================================

const chatForm =
    document.getElementById(
        "chatForm"
    );

const chatInput =
    document.getElementById(
        "chatInput"
    );

const messages =
    document.getElementById(
        "messages"
    );


chatForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const message =
            chatInput.value.trim();

        if (!message) return;


        socket.emit(
            "chat-message",
            {
                roomId,
                username,
                message
            }
        );


        chatInput.value = "";
    }
);


socket.on(
    "chat-message",
    function (data) {

        const messageElement =
            document.createElement(
                "p"
            );


        messageElement.innerHTML =
            `<strong>${data.username}</strong>: ${data.message}`;


        messages.appendChild(
            messageElement
        );


        messages.scrollTop =
            messages.scrollHeight;
    }
);


// ==========================================
// WHITEBOARD
// ==========================================

const canvas =
    document.getElementById(
        "whiteboard"
    );

const ctx =
    canvas.getContext("2d");


function resizeCanvas() {

    canvas.width =
        canvas.clientWidth;

    canvas.height =
        canvas.clientHeight;
}


resizeCanvas();


let drawing = false;

let lastX = 0;

let lastY = 0;


canvas.addEventListener(
    "mousedown",
    function (event) {

        drawing = true;

        lastX = event.offsetX;

        lastY = event.offsetY;
    }
);


canvas.addEventListener(
    "mousemove",
    function (event) {

        if (!drawing) return;


        const currentX =
            event.offsetX;

        const currentY =
            event.offsetY;


        drawLine(
            lastX,
            lastY,
            currentX,
            currentY
        );


        socket.emit(
            "drawing",
            {
                roomId,

                data: {
                    x1: lastX,
                    y1: lastY,

                    x2: currentX,
                    y2: currentY
                }
            }
        );


        lastX = currentX;

        lastY = currentY;
    }
);


canvas.addEventListener(
    "mouseup",
    function () {

        drawing = false;
    }
);


canvas.addEventListener(
    "mouseleave",
    function () {

        drawing = false;
    }
);


function drawLine(
    x1,
    y1,
    x2,
    y2
) {

    ctx.beginPath();

    ctx.moveTo(
        x1,
        y1
    );

    ctx.lineTo(
        x2,
        y2
    );

    ctx.strokeStyle =
        "#111827";

    ctx.lineWidth =
        2;

    ctx.stroke();
}


socket.on(
    "drawing",
    function (data) {

        drawLine(
            data.x1,
            data.y1,
            data.x2,
            data.y2
        );
    }
);


// ==========================================
// CLEAR WHITEBOARD
// ==========================================

document.getElementById(
    "clearBoard"
).addEventListener(
    "click",
    function () {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        socket.emit(
            "clear-board",
            roomId
        );
    }
);


socket.on(
    "clear-board",
    function () {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }
);


// ==========================================
// FILE UPLOAD
// ==========================================

const fileForm =
    document.getElementById(
        "fileForm"
    );


fileForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const fileInput =
            document.getElementById(
                "fileInput"
            );


        const file =
            fileInput.files[0];


        if (!file) return;


        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        try {

            const response =
                await fetch(
                    "/api/upload",
                    {
                        method: "POST",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        },

                        body: formData
                    }
                );


            const data =
                await response.json();


            const result =
                document.getElementById(
                    "fileResult"
                );


            if (response.ok) {

                result.innerHTML =
                    `<a href="${data.fileURL}" target="_blank">
                        ${data.filename}
                    </a>`;

            } else {

                result.textContent =
                    data.message;
            }


        } catch (error) {

            console.error(error);
        }
    }
);
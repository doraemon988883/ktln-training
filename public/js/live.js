var io = io();
var room;
var pcContainer = {};
var roomInfo = {};
var localVideoStream;
var localSlideStream;

const configuration = {
    iceServers: [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'turn:numb.viagenie.ca',
            'credential': '0984495395',
            'username': 'doraemon988883@gmail.com'
        }
    ]
}
var sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};
const qvgaConstraints = {
    video: { width: { exact: 320 }, height: { exact: 240 } }
};
const hdConstraints = {
    video: { width: { exact: 1280 }, height: { exact: 720 } }
};
const connectType = {
    CAM: 0,
    SLIDE: 1,
    MIC: 2
}

io.on('connect', function (data) {
    room = prompt('Please enter your room ID:');
    io.emit('join', { room: room });
});

io.on('joined', function (data) {
    console.log('Joined room:', data);
    // prepareCAMDevice();
});

/**
 * Tham số truyền vào hàm callback có dạng:
 * data = {
 *  fromSocket: fromSocket,
 *  content: content,
 *  pcInfo: {
 *      pcId:pcId,
        pc:new RTCPeerConnection(configuration),
        toSocket: toSocket,
        conType:conType
 *  }
 * }
 */
io.on('receiveMsg', function (data) {
    console.log("Receive msg:", data)

    if (data.content.type === "offer") {

        var pcInfo = createConnector(uuid(), data.fromSocket, data.pcInfo.conType, data.pcInfo.pcId);

        if (data.pcInfo.conType == connectType.CAM) {

            console.log('Prepare to addStream-cam:',localVideoStream)

            pcInfo.pc.addStream(localVideoStream);

            pcInfo.pc.setRemoteDescription(new RTCSessionDescription(data.content));

            pcInfo.pc.createAnswer(function (sessionDescription) {
                pcInfo.pc.setLocalDescription(sessionDescription);

                /**
                 * Gửi lại thông tin Answer to Client. Kèm theo là thông tin pcInfo của Client (bên Offer)
                 */
                sendMsg(data.fromSocket, sessionDescription, data.pcInfo);
            }, onCreateSessionDescriptionError);
        } else if (data.pcInfo.conType == connectType.SLIDE) {
            console.log('Prepare add Canvas to Stream - StreamInfo:', localSlideStream)

            // pcInfo.pc.addStream(localSlideStream);

            /**
             * Testing new track for slide
             */
            localSlideStream.getTracks().forEach(
                track => {
                  pcInfo.pc.addTrack(
                    track,
                    localSlideStream
                  );
                }
              );
             //End Test

            pcInfo.pc.setRemoteDescription(new RTCSessionDescription(data.content));

            pcInfo.pc.createAnswer(function (sessionDescription) {
                pcInfo.pc.setLocalDescription(sessionDescription);

                /**
                 * Gửi lại thông tin Answer to Client. Kèm theo là thông tin pcInfo của Client (bên Offer)
                 */
                sendMsg(data.fromSocket, sessionDescription, data.pcInfo);
            }, onCreateSessionDescriptionError);
        }
    } else if (data.content.type === "candidate") {

        console.log("Receive candidate msg!", data)
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: data.content.label,
            candidate: data.content.candidate
        });
        pcContainer[findPcIdByPartnerId(data.pcInfo.pcId)].pc.addIceCandidate(candidate);
    }


});

io.on('requestMediaStage', function(data){
    
    let content = getMediaStage();
     
    io.emit('sendMediaStage',{toSocket:data.fromSocket,stages:content});
});

// io.on('SendNewFrame', function(){
//     console.log('Receive SendNewFrame Request');
//     for(var i=0; i<5; i++){
//         console.log('Paint after:', 2000*i)
//         setTimeout(forcePainting(),2000*i);
//     }
// });

io.on('redirectCmd', function (data) {
    console.log('recieve redirect request!', data.toUrl)
    self.location = data.toUrl;
});


io.on('receiveRoomInfo', function (data) {
    /**
     * @TODO
     * Do somethings here
     */
    console.log("Receive new room info:", data)
})

function getMediaStage(){
    let content = {
        isCamReady: false,
        isSlideReady: false
    };
    /**
     * Check media
     */
    console.log('Check CAM:', localVideoStream);
    console.log('Check SLIDE:', localSlideStream);

    if(localVideoStream){
        content.isCamReady = true;
    }
    if(localSlideStream){
        content.isSlideReady = true;
    }
    return content;
}
function getNewRoomInfo() {
    io.emit('getRoomInfo', { room: room });
}

function sendMsg(toSocket, content, pcInfo) {

    var data = {
        toSocket: toSocket,
        content: content,
        pcInfo: pcInfo
    }
    console.log('Prepare sending msg:', data)
    io.emit('sendMsg', data);
    console.log('Finish sending msg:', content, " to", toSocket);
}

/**
 * 
 * @param {*} partnerId 
 * @returns partnerId
 */
function findPcIdByPartnerId(partnerId) {
    for (id in pcContainer) {
        if (pcContainer[id].partnerId === partnerId) return id
    }
    return null;
}

function prepareCAMDevice() {
    console.log('PrepareCAMDevice')
    localVideo = document.getElementById('local-video');
    navigator.mediaDevices.getUserMedia(qvgaConstraints)
        .then(function (stream) {
            localVideoStream = stream;
            localVideo.srcObject = stream;

            io.emit('hostIsReady',{room:room, stages:getMediaStage()});
        })
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
}

function prepareSlideDevice(canvas) {
    try {
        if (canvas) {
            localSlideStream = canvas.captureStream();
            console.log('Finish set Stream:', localSlideStream);
            io.emit('hostIsReady',{room:room, stages:getMediaStage()});
        }
    } catch (error) {
        alert('getCanvas fail: ' + error.name);
    }
    setInterval(()=>{
        let canvas = $('#paper');
        let ctx = canvas[0].getContext('2d');
     ctx.drawImage(ctx.canvas, 0, 0);
    }, 1000);
}


function onCreateSessionDescriptionError(error) {
    alert('Failed to create session description: ' + error.toString());
}
/**
 * 
 * @param {*} pcId 
 * @param {*} toSocket 
 * @param {*} conType 
 * @param {*} partnerId
 * @returns RTCPeerConnection
 */
function createConnector(pcId, toSocket, conType, partnerId) {
    try {

        switch (conType) {
            case connectType.CAM:
                pcContainer[pcId] = {
                    pcId: pcId,
                    pc: new RTCPeerConnection(configuration),
                    toSocket: toSocket,
                    conType: conType,
                    partnerId: partnerId
                }
                pcContainer[pcId].pc.onicecandidate = handleIceCandidate(event, toSocket, pcId);
                break;
            case connectType.SLIDE:
                pcContainer[pcId] = {
                    pcId: pcId,
                    pc: new RTCPeerConnection(configuration),
                    toSocket: toSocket,
                    conType: conType,
                    partnerId: partnerId
                }
                pcContainer[pcId].pc.onicecandidate = handleIceCandidate(event, toSocket, pcId);
                break;
            case connectType.MIC:
                /**
                 * @TODO 
                 * 
                */
                break;
            default:
                throw "Unknow ConnectType";
        }
        return pcContainer[pcId];
    } catch (error) {
        alert('Cant create RTC Object: ' + error);
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function handleIceCandidate(event, fromSocket, pcId) {
    console.log('icecandidate event: ', event);
    console.log('SenderID from ICE Handle:', fromSocket);
    if (event.candidate) {
        console.log('Find candidate in event')
        sendMsg(fromSocket, {
            type: 'candidate',
            pcId: pcId,
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        }, { pcId: pcId });
    } else {
        console.log('End of candidates.');
    }
}
// function forcePainting(){
//     console.log('Start force painting');
//     let canvas = $('#paper');
//     let ctx = canvas[0].getContext('2d');
//     ctx.drawImage(ctx.canvas, 0, 0);
// }
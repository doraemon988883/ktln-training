var io = io();
var room;
var pcContainer={};
var roomInfo = {};
var remoteVideo = document.getElementById('remote-video');
var remoteSlide = document.getElementById('remote-slide');
var remoteStream;
var remoteSlideStream;

// var uuidv4 = require('uuid/v4');
// var io = require('socket.io-client')('http://localhost');

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

const connectType = {
    CAM: 0,
    SLIDE: 1,
    MIC:2
}

// remoteSlide.onplay = ()=>{
//     console.log('RemoteSlide onplay is called')
//     io.emit('RequestNewSlideFrame',{toSocket:findStreamer()});
// }

// remoteVideo.onpause = ()=>{
//     console.log('Video onload is called')
// }

io.on('connect', function(data){
    room = prompt('Please enter your room ID:');
    io.emit('join', {room:room});
});

/**
 * Tham số cho hàm callback là data = socMan[data.room]
 * socMan[data.room] = {
 *  socketId: {
 *      socketID: String ,
 *      isStreamer: boolean
 *  },
 *  ...
 * }
 */
io.on('joined', function(data){
    console.log('Joined room:', data);
    roomInfo = data;

    var streamerSocketId = findStreamer();


    if(streamerSocketId!== null && streamerSocketId !== undefined){
        console.log('Found Host!')
        // createConnectToCAM(streamerSocketId);
        // createConnectToSLIDE(streamerSocketId);

        io.emit('requestMediaStage',{hostSocketId:streamerSocketId});

    }else{
        console.log('Host not found')
    }

});
io.on('receivedMediaStage', function(data){
    if(data.stages.isCamReady){
        createConnectToCAM(data.fromSocket);
    } else {
        console.log('CAM is not ready')
    }
    if(data.stages.isSlideReady){
        createConnectToSLIDE(data.fromSocket);
    }else {
        console.log('SLIDE is not ready')
    };
});
/**
 * Kết nối lại với CAM và SLIDE của máy Host
 */
io.on('connectToHost',function(data){
    console.log('Receive connectToHost cmd!!')
    let foundCAM = false;
    let foundSLIDE = false;
    for(pcInfo in pcContainer){
        if(pcInfo.conType == connectType.CAM){
            foundCAM = true;
            if(pcInfo.pc.connectionState == "disconnected" || pcInfo.pc.connectionState == "failed" || pcInfo.pc.connectionState == "closed"){
                // createConnectToHost(data.hostSocketId);
                createConnectToCAM(data.hostSocketId, pcInfo.pcId);
            }else{
                console.log('Connection stage of CAM is:',pcInfo.pc.connectionState);
            }   
        }else if(pcInfo.conType == connectType.SLIDE){
            foundSLIDE = true;
            if(pcInfo.pc.connectionState == "disconnected" || pcInfo.pc.connectionState == "failed" || pcInfo.pc.connectionState == "closed"){
                // createConnectToHost(data.hostSocketId);
                createConnectToSLIDE(data.hostSocketId, pcInfo.pcId);
            }else{
                console.log('Connection stage of SLIDE is:',pcInfo.pc.connectionState);
            }
        }
    }
    if(!foundCAM&&data.stages.isCamReady){
        createConnectToCAM(data.hostSocketId);
    }
    if(!foundSLIDE&&data.stages.isSlideReady){
        createConnectToSLIDE(data.hostSocketId);
    }
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
io.on('receiveMsg', function(data){
    console.log("Receive msg:",data);

    if(data.content.type === "answer"){
        console.log('Starting response to Host (Client pcID):', data.pcInfo.pcId)
        pcContainer[data.pcInfo.pcId].pc.setRemoteDescription(new RTCSessionDescription(data.content))
    } else if(data.content.type === "candidate"){
        console.log('Receive candidate msg', data)
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: data.content.label,
            candidate: data.content.candidate
        });
        pcContainer[data.pcInfo.pcId].pc.addIceCandidate(candidate);
    }

});

io.on('redirectCmd', function(data){
    self.location = data.toUrl;
});

io.on('handleDisconectSocket', function(data){
    console.log("Receive disconnected SocketID:", data);
    delete pcContainer[data.disconnectedSocket]

});


/**
 * Tạo RTCConnection đến CAM của Host
 * @param {*} toSocket 
 */
function createConnectToCAM(toSocket, pcId){
    
    let camPC;

    if(pcId){
        camPC=createConnector(pcId,toSocket, connectType.CAM);
    }else{
        camPC=createConnector(uuid(),toSocket, connectType.CAM);
    }

    camPC.pc.createOffer(
        (des)=>{
            console.log('callback warp is call:', des)
            setLocalAndSendMessage(des, toSocket, {pcId:camPC.pcId, conType:camPC.conType})
        },
        handleCreateOfferError, 
        sdpConstraints
    );
}

/**
 * Tạo RTCConnection đến SLIDE của Host
 * @param {*} toSocket 
 */
function createConnectToSLIDE(toSocket, pcId){
    let slidePC;

    if(pcId){
        slidePC= createConnector(pcId,toSocket, connectType.SLIDE);
    }else {
        slidePC = createConnector(uuid(),toSocket, connectType.SLIDE)
    }

    slidePC.pc.createOffer(
        (des)=>{
            console.log('callback warp is call:', des)
            setLocalAndSendMessage(des, toSocket, {pcId:slidePC.pcId, conType:slidePC.conType})
        },
        handleCreateOfferError, 
        sdpConstraints
    );
}
/**
 * @returns socketId
 */
function findStreamer(){
    console.log('Start finding host', roomInfo)
    for(id in roomInfo){
        console.log('RoomInfo:', roomInfo[id]);
        if(roomInfo[id].isStreamer) return id; 
    }
    return null;
}

function getNewRoomInfo(){
    io.emit('getRoomInfo', {room:room});
}
/**
 * 
 * @param {*} toSocket 
 * @param {*} content 
 * @param {*} pcId
 */
function sendMsg(toSocket, content, pcInfo){
    var data = {
        toSocket: toSocket,
        content: content,
        pcInfo: pcInfo
    }
    console.log('Prepare sending msg:', data)
    io.emit('sendMsg',data);
    console.log('Finish sending msg:', content, " to", toSocket);
}

/**
 * 
 * @param {*} event 
 */
function handleCreateOfferError(event) {
    alert('createOffer() error: '+ event);
}
/**
 * 
 * @param {*} sessionDescription 
 * @param {*} toSocket 
 * @param {*} pcInfo 
 */
function setLocalAndSendMessage(sessionDescription, toSocket, pcInfo) {
    console.log("setLocalAndSendMessage || pcInfo",pcInfo)
    pcContainer[pcInfo.pcId].pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMsg(toSocket, sessionDescription , pcInfo);
}
function handleIceCandidate(event, toSocket, pcId) {
    console.log('pcId:', pcId, ' has icecandidate event: ', event, "to socketId:",toSocket);
    if (event.candidate) {
        console.log('Find candidate in event')
        sendMsg(toSocket, {
            type: 'candidate',
            pcId:pcId,
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        }, {pcId:pcId});
    } else {
        if(pcContainer[pcId].conType == connectType.SLIDE){
            console.log('Info of RemoteSlide:', remoteSlideStream);
            remoteSlide.play();
            io.emit('RequestNewSlideFrame',{toSocket:toSocket});
        } else if(pcContainer[pcId].conType == connectType.CAM){
            remoteVideo.play();
        }
        console.log('End of candidates.');
    }
}
/**
 * 
 * @param {*} event 
 * @param {*} pcId 
 */
function handleRemoteStreamAdded(event, pcId) {
    console.log('Remote stream added.');
    if(pcContainer[pcId].conType === connectType.CAM){
        console.log('Event form CAM:', event, event.stream)
        remoteStream = event.stream;
        remoteVideo.srcObject = remoteStream;

    } else if(pcContainer[pcId].conType === connectType.SLIDE){
        // alert('Receive Slide stream from host!');
        console.log('Event form SLIDE:', event, event.stream)
        remoteSlideStream = event.stream;
        remoteSlide.srcObject = remoteSlideStream;

       
        if(remoteSlideStream.getTracks().size == 0) {
            console.log('First Tracks is 0');
            remoteSlideStream = event.stream.getTracks();
        } else {
            console.log('First Track:',remoteSlideStream.getTracks())
        }
    }
}
function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function createConnector(pcId, toSocket, conType){
    try {

        switch(conType){
            case connectType.CAM:
                pcContainer[pcId] = {
                    pcId:pcId,
                    pc:new RTCPeerConnection(configuration),
                    toSocket: toSocket,
                    conType:conType
                }
                pcContainer[pcId].pc.onicecandidate = function(event){
                    handleIceCandidate(event, toSocket, pcId);
                };
                pcContainer[pcId].pc.onaddstream = function(event){
                    handleRemoteStreamAdded(event, pcId)
                };
                pcContainer[pcId].pc.onremovestream = handleRemoteStreamRemoved;
               
                break;
            case connectType.SLIDE:
                pcContainer[pcId] = {
                    pcId:pcId,
                    pc:new RTCPeerConnection(configuration),
                    toSocket: toSocket,
                    conType:conType
                }
                pcContainer[pcId].pc.onicecandidate = function(event){
                    handleIceCandidate(event, toSocket, pcId);
                };
                pcContainer[pcId].pc.onaddstream = function(event){
                    handleRemoteStreamAdded(event, pcId)
                };
                pcContainer[pcId].pc.onremovestream = handleRemoteStreamRemoved;
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
        console.log('Finish create RTCPeerConnection');
        return pcContainer[pcId];

    } catch (error) {
        alert('Cant create RTC Object'+ error);
    }
}
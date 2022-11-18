const video = document.getElementById('video')
const text = document.getElementById('text')
let start_flag = 0;

Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
]).then(startVideo)

function startVideo() {
    console.log("Nan")
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }
    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function (constraints) {
            const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
            }
            return new Promise(function (resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        }
    }
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }
    var constraints = window.constraints = {
        audio: false,
        video: {
            sourceId: 'default',
            facingMode: {exact: "user"}
        }
    };
    navigator.mediaDevices.getUserMedia(constraints
    ).then((stream) => {
        video.srcObject = stream

    }).then((err) => {
        console.log(err)
    })
}

video.addEventListener('trackSuccess', () => {
    text.innerHTML = "请按照提示完成动作";
    setTimeout(() => {
        start_flag = 1
    }, 2000)
})
video.addEventListener('start_Diff', () => {
    setTimeout(() => {
        text.innerHTML = "屏幕将高亮三秒";
    }, 1500);
    setTimeout(() => {
        text.innerHTML = "3";
        text.style.color = 'white'
        document.body.style.background = 'hsl(0,100%,50%)';
    }, 3500);
    setTimeout(() => {
        text.innerHTML = "2"
        document.body.style.background = 'hsl(120,100%,50%)';
    }, 4500);
    setTimeout(() => {
        text.innerHTML = "1"
        document.body.style.background = 'hsl(240,100%,50%)';
    }, 5500);
    setTimeout(() => {
        text.innerHTML = "正在进行活体检测"
    }, 6500);
})
video.addEventListener('Fail', () => {
    setTimeout(() => {
        text.innerHTML = "活体检测失败";
        document.body.style.background = 'hsl(200,20%,20%)';
    }, 1000)

})

video.addEventListener('playing', () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    // console.log(video[0].videoHeight,video[0].videoWidth)
    const displaySize = {width: video.width, height: video.height}
    faceapi.matchDimensions(canvas, displaySize)
    let pose_index = 0
    let flag1 = true;
    let flag2 = true;
    let flag3 = true, flag4 = true, flag5 = true, flag6 = true, flag7 = true, flag8 = true, flag9 = true;
    let offset = [{x: 0, y: 0}, {x: 0, y: 0}]
    let B_r_images, B_g_images, B_b_images, r_images, g_images, b_images;
    const Fail = new Event('Fail');
    const start_Diff = new Event('start_Diff')
    let times = 0
    let Id = setInterval(async () => {
        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks();
        const trackSuccess = new Event('trackSuccess');
        const resizedDetection = faceapi.resizeResults(detection, displaySize)
        if (flag1 && isNaN(detection)) {
            video.dispatchEvent(trackSuccess);
            flag1 = false
        }
        if (start_flag === 1) {
            if (times > 200) {
                alert("活体检测超时")
                clearInterval(Id);
            }
            if (pose_index <= 1) {
                console.log(resizedDetection.detection.box.width, resizedDetection.detection.box.height)
                pose_index = pose_detection(resizedDetection.landmarks, pose_index)
                times += 1
            }
            if (pose_index === 2) {
                times = 0
                start_flag = -1
                text.innerHTML = "动作检测完成,请保持头部静止"
                setTimeout(() => {
                    video.dispatchEvent(start_Diff);
                    flag2 = false;
                }, 1000)
            }
        }
        if (flag3 && (!flag2)) {
            flag3 = false;
            B_r_images = cutFaceAndEyes(resizedDetection, offset, video, 'R');
            B_g_images = cutFaceAndEyes(resizedDetection, offset, video, 'G');
            B_b_images = cutFaceAndEyes(resizedDetection, offset, video, 'B');
            setTimeout(() => {
                flag4 = false
            }, 3000)
        }
        if (flag5 && (!flag4)) {
            console.log(resizedDetection)

            flag5 = false;
            r_images = cutFaceAndEyes(resizedDetection, offset, video, 'R');
            setTimeout(() => {
                flag6 = false
            }, 1000)

        }
        if (flag7 && (!flag6)) {

            flag7 = false;
            g_images = cutFaceAndEyes(resizedDetection, offset, video, 'G');
            setTimeout(() => {
                flag8 = false
            }, 1000)

        }
        if (flag9 && (!flag8)) {

            flag9 = false;
            b_images = cutFaceAndEyes(resizedDetection, offset, video, 'B');

            setTimeout(() => {
                let score_r = runSVM(calcFeat(r_images, B_r_images))
                let score_g = runSVM(calcFeat(g_images, B_g_images))
                let score_b = runSVM(calcFeat(b_images, B_b_images))
                console.log(score_b)
                console.log(score_g)
                console.log(score_r)
                if (math.min(score_r, score_g, score_b) < -2.5 && math.max(score_r, score_g, score_b) < -0.5) {
                    video.dispatchEvent(Fail);
                } else {
                    text.innerHTML = "活体检测成功";
                    document.body.style.background = 'hsl(200,20%,20%)';
                }
            }, 1000)
        }
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetection)
    }, 100)

})
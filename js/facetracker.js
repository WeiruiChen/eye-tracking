$(document).ready(function () {
  const video = document.getElementById('webcam');
  const overlay = document.getElementById('overlay');
  var facePosition = [];
  var openIndex = 0;
  var videoIndex = 0;
  var srcList = [
    '2.mp4',
    '4.mp4'
  ];
  // let myVideo = document.getElementById('videdSet');
  // if (myVideo.paused) {
  //   myVideo.play();
  // }

  window.facetracker = {
    video: video,
    videoWidthExternal: video.width,
    videoHeightExternal: video.height,
    videoWidthInternal: video.videoWidth,
    videoHeightInternal: video.videoHeight,
    overlay: overlay,
    overlayCC: overlay.getContext('2d'),

    trackingStarted: false,
    currentPosition: null,
    currentEyeRect: null,

    adjustVideoProportions: function () {
      // resize overlay and video if proportions of video are not 4:3
      // keep same height, just change width
      facetracker.videoWidthInternal = video.videoWidth;
      facetracker.videoHeightInternal = video.videoHeight;
      const proportion =
        facetracker.videoWidthInternal / facetracker.videoHeightInternal;
      facetracker.videoWidthExternal = Math.round(
        facetracker.videoHeightExternal * proportion,
      );
      facetracker.video.width = facetracker.videoWidthExternal;
      facetracker.overlay.width = facetracker.videoWidthExternal;
    },

    gumSuccess: function (stream) {
      ui.onWebcamEnabled();

      // add camera stream if getUserMedia succeeded
      if ('srcObject' in facetracker.video) {
        facetracker.video.srcObject = stream;
      } else {
        facetracker.video.src =
          window.URL && window.URL.createObjectURL(stream);
      }

      facetracker.video.onloadedmetadata = function () {
        facetracker.adjustVideoProportions();
        facetracker.video.play();
      };

      facetracker.video.onresize = function () {
        facetracker.adjustVideoProportions();
        if (facetracker.trackingStarted) {
          facetracker.ctrack.stop();
          facetracker.ctrack.reset();
          facetracker.ctrack.start(facetracker.video);
        }
      };
    },

    gumFail: function () {
      ui.showInfo(
        'There was some problem trying to fetch video from your webcam 😭',
        true,
      );
    },

    throttle: function (fn, delay = 100) {
      let last = 0;
      return function () {
        let curr = +new Date();
        if (curr - last > delay) {
          fn.apply(this, arguments);
          last = curr;
        }
      }
    },

    startVideo: function () {
      // start video
      facetracker.video.play();
      // start tracking
      facetracker.ctrack.start(facetracker.video);
      facetracker.trackingStarted = true;
      // start loop to draw face
      facetracker.positionLoop();
      // facePosition
      // setInterval(() => {

      // }, 100);
      // setInterval(() => {
      //   console.log('执行');
      //   if (facePosition.length < 0) {return };
    },

    positionLoop: function () {
      // if (Math.abs(facetracker.currentPosition[57][1] - facetracker.currentPosition[60][1]) > 20) {
      //   openIndex++;
      //   if (openIndex > 50) {
      //     openIndex = 0;
      //   }
      // }
      // Check if a face is detected, and if so, track it.
      requestAnimationFrame(facetracker.positionLoop);
      facetracker.currentPosition = facetracker.ctrack.getCurrentPosition();
      // if('')
      // console.log('facetracker.currentPosition',facetracker.currentPosition);
      // setInterval(() => {
      //   console.log('执行');
      // }, 1000);
      facePosition = facetracker.currentPosition;
      facetracker.overlayCC.clearRect(
        0,
        0,
        facetracker.videoWidthExternal,
        facetracker.videoHeightExternal,
      );
      if (facetracker.currentPosition) {
        facetracker.trackFace(facetracker.currentPosition);
        facetracker.ctrack.draw(facetracker.overlay);
        ui.onFoundFace();
      }

      if (Math.abs(facePosition[57][1] - facePosition[60][1]) > 15) {
        openIndex++;
        console.log('openIndex',openIndex);
        if (openIndex > 30 && facePosition[57][0] < 200) {
          console.log('张嘴下一张');
          document.getElementById('videdSet').src = srcList[videoIndex++];
          videoIndex === 2 ? videoIndex = 0 : '';
          openIndex = 0;
        }
        if (openIndex > 30 && facePosition[57][0] > 200) {
          console.log('张嘴上一张');
          document.getElementById('videdSet').src = srcList[videoIndex--];
          videoIndex < 0 ? videoIndex = 0 : '';
          openIndex = 0;
        }
      }
    },

    getEyesRect: function (position) {
      // Given a tracked face, returns a rectangle surrounding the eyes.
      const minX = position[19][0] + 3;
      const maxX = position[15][0] - 3;
      const minY =
        Math.min(
          position[20][1],
          position[21][1],
          position[17][1],
          position[16][1],
        ) + 6;
      const maxY =
        Math.max(
          position[23][1],
          position[26][1],
          position[31][1],
          position[28][1],
        ) + 3;

      const width = maxX - minX;
      const height = maxY - minY - 5;

      return [minX, minY, width, height * 1.25];
    },

    trackFace: function (position) {
      // Given a tracked face, crops out the eyes and draws them in the eyes canvas.
      const rect = facetracker.getEyesRect(position);
      facetracker.currentEyeRect = rect;

      const eyesCanvas = document.getElementById('eyes');
      const eyesCtx = eyesCanvas.getContext('2d');

      // Resize because the underlying video might be a different resolution:
      const resizeFactorX =
        facetracker.videoWidthInternal / facetracker.videoWidthExternal;
      const resizeFactorY =
        facetracker.videoHeightInternal / facetracker.videoHeightExternal;

      facetracker.overlayCC.strokeStyle = 'red';
      facetracker.overlayCC.strokeRect(rect[0], rect[1], rect[2], rect[3]);
      eyesCtx.drawImage(
        facetracker.video,
        rect[0] * resizeFactorX,
        rect[1] * resizeFactorY,
        rect[2] * resizeFactorX,
        rect[3] * resizeFactorY,
        0,
        0,
        eyesCanvas.width,
        eyesCanvas.height,
      );
    },
  };

  video.addEventListener('canplay', facetracker.startVideo, false);

  // set up video
  if (navigator.mediaDevices) {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
      })
      .then(facetracker.gumSuccess)
      .catch(facetracker.gumFail);
  } else if (navigator.getUserMedia) {
    navigator.getUserMedia(
      {
        video: true,
      },
      facetracker.gumSuccess,
      facetracker.gumFail,
    );
  } else {
    ui.showInfo(
      'Your browser does not seem to support getUserMedia. 😭 This will probably only work in Chrome or Firefox.',
      true,
    );
  }

  facetracker.ctrack = new clm.tracker();
  facetracker.ctrack.init();
});
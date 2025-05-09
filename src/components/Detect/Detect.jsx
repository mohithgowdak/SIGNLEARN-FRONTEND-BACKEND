import React, { useState, useRef, useEffect, useCallback } from "react";
import "./Detect.css";
import { v4 as uuidv4 } from "uuid";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision"; // media pipe task vision for hand gesture
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils"; // for drawing the hand signs on cam window
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import Webcam from "react-webcam";
import { SignImageData } from "../../data/SignImageData";
import { useDispatch, useSelector } from "react-redux";
import { addSignData } from "../../redux/actions/signdataaction";
import ProgressBar from "./ProgressBar/ProgressBar";
import DisplayImg from "../../assests/displayGif.gif";

let startTime = "";

const Detect = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("");
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const [progress, setProgress] = useState(0);
  const requestRef = useRef();
  const lastSpokenWordRef = useRef("");
  const lastDetectedTimeRef = useRef(Date.now());
  const [detectedData, setDetectedData] = useState([]);
  const [signDetected, setSignDetected] = useState(false); // New state to track if a sign is detected

  const user = useSelector((state) => state.auth?.user);
  const { accessToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [currentImage, setCurrentImage] = useState(null);

  useEffect(() => {
    let intervalId;
    if (webcamRunning) {
      intervalId = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * SignImageData.length);
        const randomImage = SignImageData[randomIndex];
        setCurrentImage(randomImage);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [webcamRunning]);

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production") {
    console.log = function () {};
  }

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2; // Adjust the speech rate if necessary
    speechSynthesis.speak(utterance);
  };

  const predictWebcam = useCallback(() => {
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(
      webcamRef.current.video,
      nowInMs
    );

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });

        drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }

    if (results.gestures.length > 0) {
      const detectedSign = results.gestures[0][0].categoryName;
      const detectedScore = Math.round(parseFloat(results.gestures[0][0].score) * 100);
      setSignDetected(true); // Set signDetected to true when a sign is detected

      const now = Date.now();

      if (detectedSign === lastSpokenWordRef.current) {
        if (now - lastDetectedTimeRef.current > 1000) {
          setDetectedData((prevData) => [
            ...prevData,
            {
              SignDetected: detectedSign ? detectedSign : null,
              DetectedScore: detectedScore,
            },
          ]);

          setGestureOutput(detectedSign);
          setProgress(detectedScore);

          speak(detectedSign);
          lastSpokenWordRef.current = detectedSign;
          lastDetectedTimeRef.current = now;
        }
      } else {
        lastSpokenWordRef.current = detectedSign;
        lastDetectedTimeRef.current = now;
      }
    } else {
      setGestureOutput("");
      setProgress(0);
    }

    if (webcamRunning === true) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [webcamRunning, runningMode, gestureRecognizer]);

  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);
    predictWebcam();
  }, [predictWebcam]);

  const enableCam = useCallback(() => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    if (webcamRunning === true) {
      setWebcamRunning(false);
      cancelAnimationFrame(requestRef.current);
      setCurrentImage(null);

      const endTime = new Date();
      const timeElapsed = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);

      const nonEmptyData = detectedData.filter(
        (data) => data.SignDetected !== "" && data.DetectedScore !== ""
      );

      const resultArray = [];
      let current = nonEmptyData[0];

      for (let i = 1; i < nonEmptyData.length; i++) {
        if (nonEmptyData[i].SignDetected !== current.SignDetected) {
          resultArray.push(current);
          current = nonEmptyData[i];
        }
      }

      resultArray.push(current);

      const countMap = new Map();

      for (const item of resultArray) {
        const count = countMap.get(item.SignDetected) || 0;
        countMap.set(item.SignDetected, count + 1);
      }

      const sortedArray = Array.from(countMap.entries()).sort(
        (a, b) => b[1] - a[1]
      );

      const outputArray = sortedArray
        .slice(0, 5)
        .map(([sign, count]) => ({ SignDetected: sign, count }));

      const data = {
        signsPerformed: outputArray,
        id: uuidv4(),
        username: user?.name,
        userId: user?.userId,
        createdAt: String(endTime),
        secondsSpent: Number(timeElapsed),
      };

      dispatch(addSignData(data));
      setDetectedData([]);
      setSignDetected(false); // Reset the signDetected state when stopping the webcam
      lastSpokenWordRef.current = "";
    } else {
      setWebcamRunning(true);
      startTime = new Date();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [
    webcamRunning,
    gestureRecognizer,
    animate,
    detectedData,
    user?.name,
    user?.userId,
    dispatch,
  ]);

  useEffect(() => {
    async function loadGestureRecognizer() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            process.env.REACT_APP_FIREBASE_STORAGE_TRAINED_MODEL_25_04_2023,
        },
        numHands: 2,
        runningMode: runningMode,
      });
      setGestureRecognizer(recognizer);
    }
    loadGestureRecognizer();
  }, [runningMode]);

  return (
    <>
      <div className="signlang_detection-container">
        {accessToken ? (
          <>
            <div style={{ position: "relative" }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="signlang_webcam"
              />

              <canvas ref={canvasRef} className="signlang_canvas" />

              <div className="signlang_data-container">
                <button onClick={enableCam} disabled={webcamRunning && !signDetected}>
                  {webcamRunning ? "Stop" : "Start"}
                </button>

                <div className="signlang_data">
                  <p className="gesture_output">{gestureOutput}</p>

                  {progress ? <ProgressBar progress={progress} /> : null}
                </div>
              </div>
            </div>

            <div className="signlang_imagelist-container">
              <h2 className="gradient__text">Image</h2>

              <div className="signlang_image-div">
                {currentImage ? (
                  <img src={currentImage.url} alt={`img ${currentImage.id}`} />
                ) : (
                  <h3 className="gradient__text">
                    Click on the Start Button <br /> to practice with Images
                  </h3>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="signlang_detection_notLoggedIn">
            <h1 className="gradient__text">Please Login !</h1>
            <img src={DisplayImg} alt="display-img" />
            <p>
              We Save Your Detection Data to show your progress and learning in dashboard, So please Login to Test this Detection Feature.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Detect;

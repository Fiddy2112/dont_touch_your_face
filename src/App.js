import React, { useCallback, useEffect, useRef, useState } from "react";
import { initNotifications, notify } from "@mycv/f8-notification";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import { Howl } from "howler";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import "./App.css";
import hey from "./assets/hey-botayra.mp3";
import tay from "./assets/tay-tay-tay.mp3";

var sound = new Howl({
  src: [hey],
  volume: 0.5,
  // html5: true,
  onend: function () {
    console.log("Finished!");
  },
});

var tayNe = new Howl({
  src: [tay],
  volume: 0.5,
});

function App() {
  const [touched, setTouched] = useState(false);
  const [trainFist, setTrainFirst] = useState(false);
  const [trainTimes, setTrainTimes] = useState("...");
  const [done, setDone] = useState(false);

  const video = useRef();
  const mobilenetModule = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);

  //constants
  const NOT_TOUCH_LABEL = "not_touch";
  const TOUCHED_LABEL = "touched";
  const TRAINING_TIMES = 50;
  const TOUCHED_CONFIDENCE = 0.6;

  const setupCamare = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", resolve);
          },
          (error) => reject(error)
        );
      } else {
        reject();
      }
    });
  };

  const train = async (label) => {
    console.log(`[${label}] Training for AI`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(parseInt(((i + 1) / TRAINING_TIMES) * 100));
      setTrainTimes(`${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`);
      if (parseInt(((i + 1) / TRAINING_TIMES) * 100) === 100) {
        setTrainFirst(true);
        setTrainTimes("...");
      }
      await training(label);
    }
  };

  /**
   * Buoc 1: Train cho may khuon mat khong cham tay
   * Buoc 2: Train cho may khuon mat co cham tay
   * Buoc 3: Lay hinh anh hien tai va phan tich va so sanh cho may voi data da hoc truoc do
   *  ==> Neu ma matching voi data khuon mat cham tay ---> canh bao
   */

  const training = (label) => {
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(video.current, true);
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };

  const run = async () => {
    const embedding = mobilenetModule.current.infer(video.current, true);
    //Making a prediction
    const result = await classifier.current.predictClass(embedding);
    console.log("label:", result.label);
    console.log("confidences:", result.confidences);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
    ) {
      console.log("Touched");
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify("Don't touch your face", { body: "You just touched your face" });
      setTouched(true);
    } else {
      console.log(" Not Touched");
      setTouched(false);
    }

    await sleep(200);

    run();
  };

  const sleep = (ms = 0) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  useEffect(() => {
    const init = async () => {
      console.log("init...");
      await setupCamare();
      console.log("setup camera success!");
      // Load the model.
      mobilenetModule.current = await mobilenet.load();
      // Create the classifier.
      classifier.current = knnClassifier.create();

      console.log("setup done!");
      console.log("Don't touch your face and press Train 1");
      setDone(!done);
      initNotifications({ cooldown: 3000 });
    };
    init();
    // Fires when the sound finishes playing.
    sound.on("end", function () {
      canPlaySound.current = true;
    });
    //cleanup
    return () => {};
  }, []);

  return (
    <div className={`main ${touched ? "touched" : ""}`}>
      <h1 style={{ marginBottom: "10px", textTransform: "uppercase" }}>
        Giúp bạn bỏ thói quen chạm tay lên mặt
      </h1>
      <video ref={video} className="video" autoPlay width="480" height="360" />

      {!trainFist ? (
        <h2>
          Bấm Train 1: Vui lòng không chạm lên mặt cho đến khi hoàn thành AI:{" "}
          {trainTimes}
        </h2>
      ) : (
        <h2>
          Bấm Train 2: Quay video đưa tay cách 10cm gần lên mặt : {trainTimes}
        </h2>
      )}

      {done && (
        <div className="control">
          {!trainFist ? (
            <button
              className={`btn`}
              onClick={() => {
                train(NOT_TOUCH_LABEL);
              }}
            >
              Train 1
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                train(TOUCHED_LABEL);
              }}
            >
              Train 2
            </button>
          )}

          <button className="btn" onClick={() => run()}>
            Run
          </button>
          <button className="btn" onClick={() => tayNe.play()}>
            Tay
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

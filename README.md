# Chessboard image to FEN online converter with automatic chessboard detection. [Live demo here](https://truekendor.github.io/chessboard-image-to-fen/)

Chessboard detection is done using [Yolov8n.pt](https://github.com/ultralytics/ultralytics) trained on a custom dataset and exported to Tensorflow.JS

Pieces classification is done using [TensorFlow.js](https://www.tensorflow.org/js), 
[MobileNet v3](https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1) and transfer learning 
 trained on a procedurally generated dataset

### Preview 

![preview image 1](https://github.com/truekendor/chessboard-image-to-fen/blob/main/assets/preview_1.jpg)

![preview image 2](https://github.com/truekendor/chessboard-image-to-fen/blob/main/assets/preview_2.jpg)

### Prediction head arch

![Model Arch](https://github.com/truekendor/chessboard-image-to-fen/blob/main/assets/model_arch.webp)


# Acknowledgements
- Detection output parsed with slightly modified version of the [onnx runtime web](https://github.com/Hyuto/yolov8-onnxruntime-web)

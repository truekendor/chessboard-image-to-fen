# chessboard-image-to-fen

Chessboard image to FEN convertation using [TensorFlow.js](https://www.tensorflow.org/js), [MobileNet v3](https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1) and transfer learning

Model can recognize default lichess and chesscom pieces and quite a few other piece styles 

## [Сonverter Here](https://truekendor.github.io/chessboard-image-to-fen/)

### Preview / Examples

input -> output

![Example](https://github.com/truekendor/chessboard-image-to-fen/blob/main/preview/preview_1.webp)

input -> output

![Example](https://github.com/truekendor/chessboard-image-to-fen/blob/main/preview/preview_2.webp)

### How to use

Copy or drag the chessboard image and wait for the model to finish converting.

Alternatively, select the image in the file input at the top of the page

### Important 

The chessboard image must be cropped around the edges of the chessboard

in order for conversion to work

Small image cropping offsets should not affect the result ***much***

### Model TBA

The model arch

![Model Arch](https://github.com/truekendor/chessboard-image-to-fen/blob/main/assets/model_arch.webp)

TBA








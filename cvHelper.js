export class CV_Helper {
  static getBoardContours(canvas) {
    const boundingRectList = [];

    let src = cv.imread(canvas);
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 120, 200, cv.THRESH_BINARY);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    // You can try more different parameters
    cv.findContours(
      src,
      contours,
      hierarchy,
      cv.RETR_CCOMP,
      cv.CHAIN_APPROX_SIMPLE
    );

    // draw contours with random Scalar
    for (let i = 0; i < contours.size(); ++i) {
      let color = new cv.Scalar(
        Math.round(Math.random() * 255),
        Math.round(Math.random() * 255),
        Math.round(Math.random() * 255)
      );

      const whiteColor = new cv.Scalar(255, 255, 255);
      const colorGreen = new cv.Scalar(40, 190, 40);

      cv.drawContours(
        dst,
        contours,
        i,
        colorGreen,
        1,
        cv.LINE_8,
        hierarchy,
        100
      );

      const rect = cv.boundingRect(contours.get(i));
      const aspectRatio = rect.width / rect.height;

      boundingRectList.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        aspectRatio,
      });
    }

    cv.imshow(canvas, dst);

    src.delete();
    dst.delete();
    contours.delete();
    hierarchy.delete();

    return boundingRectList;
  }

  static canny(canvas) {
    const src = cv.imread(canvas);
    const dst = new cv.Mat();
    cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
    // You can try more different parameters
    cv.Canny(src, dst, 50, 100, 3, false);
    cv.imshow(canvas, dst);

    src.delete();
    dst.delete();
  }

  static morphGradient(canvas) {
    const src = cv.imread(canvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);

    const dst = new cv.Mat();
    const M = cv.Mat.ones(5, 5, cv.CV_8U);

    // You can try more different parameters
    cv.morphologyEx(src, dst, cv.MORPH_GRADIENT, M);
    cv.imshow(canvas, dst);

    src.delete();
    dst.delete();
    M.delete();
  }

  static getStructuringElement(canvas) {
    let src = cv.imread(canvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);

    let dst = new cv.Mat();
    let M = new cv.Mat();
    let ksize = new cv.Size(5, 5);
    // You can try more different parameters

    // M = cv.getStructuringElement(cv.MORPH_CROSS, ksize);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(src, dst, cv.MORPH_GRADIENT, M);

    cv.imshow(canvas, dst);

    src.delete();
    dst.delete();
    M.delete();
  }

  static probabilisticHoughTransform(canvas) {
    let src = cv.imread(canvas);
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    let lines = new cv.Mat();
    let color = new cv.Scalar(255, 0, 0);

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(src, src, 50, 200, 3);
    // You can try more different parameters
    cv.HoughLinesP(src, lines, 1, Math.PI / 180, 2, 0, 0);
    // draw lines
    for (let i = 0; i < lines.rows; ++i) {
      let startPoint = new cv.Point(
        lines.data32S[i * 4],
        lines.data32S[i * 4 + 1]
      );
      let endPoint = new cv.Point(
        lines.data32S[i * 4 + 2],
        lines.data32S[i * 4 + 3]
      );
      cv.line(dst, startPoint, endPoint, color);
    }
    cv.imshow(canvas, dst);
    src.delete();
    dst.delete();
    lines.delete();
  }

  static drawLines(canvas) {
    let src = cv.imread(canvas);

    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    let lines = new cv.Mat();
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(src, src, 50, 200, 3);
    // You can try more different parameters
    cv.HoughLines(src, lines, 1, Math.PI / 180, 30, 0, 0, 0, Math.PI);
    // draw lines

    for (let i = 0; i < lines.rows; ++i) {
      let rho = lines.data32F[i * 2];
      let theta = lines.data32F[i * 2 + 1];
      let a = Math.cos(theta);
      let b = Math.sin(theta);
      let x0 = a * rho;
      let y0 = b * rho;
      let startPoint = { x: x0 - 1000 * b, y: y0 + 1000 * a };
      let endPoint = { x: x0 + 1000 * b, y: y0 - 1000 * a };
      cv.line(dst, startPoint, endPoint, [255, 0, 0, 255]);
    }

    cv.imshow(canvas, dst);

    src.delete();
    dst.delete();
    lines.delete();
  }

  static imageErode(canvas) {
    const src = cv.imread(canvas);
    const dst = new cv.Mat();
    const M = cv.Mat.ones(5, 5, cv.CV_8U);
    const anchor = new cv.Point(-1, -1);
    // You can try more different parameters
    cv.erode(
      src,
      dst,
      M,
      anchor,
      1,
      cv.BORDER_CONSTANT,
      cv.morphologyDefaultBorderValue()
    );
    cv.imshow(canvas, dst);
    src.delete();
    dst.delete();
    M.delete();
  }

  static imageDilate(canvas) {
    let src = cv.imread(canvas);
    let dst = new cv.Mat();
    let M = cv.Mat.ones(5, 5, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    // You can try more different parameters
    cv.dilate(
      src,
      dst,
      M,
      anchor,
      1,
      cv.BORDER_CONSTANT,
      cv.morphologyDefaultBorderValue()
    );
    cv.imshow(canvas, dst);
    src.delete();
    dst.delete();
    M.delete();
  }
}

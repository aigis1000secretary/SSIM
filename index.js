

const fs = require('fs');
const canvas = require('canvas');

const toCompressData = (image, imgWidth = 8) => {

    const mainCanvas = canvas.createCanvas(imgWidth, imgWidth);
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, imgWidth, imgWidth);

    return ctx.getImageData(0, 0, imgWidth, imgWidth);;
};

const toCanvas = (imageData) => {

    const mainCanvas = canvas.createCanvas(imageData.width, imageData.height);
    const ctx = mainCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    return mainCanvas;
}

const toGrayData = (imageData) => {
    for (let i = 0; i < imageData.data.length; i += 4) {
        let R = imageData.data[i + 0];
        let G = imageData.data[i + 1];
        let B = imageData.data[i + 2];
        const gray = parseInt(R * 0.299 + G * 0.587 + B * 0.114);
        imageData.data[i + 0] = gray;
        imageData.data[i + 1] = gray;
        imageData.data[i + 2] = gray;
        imageData.data[i + 3] = 255 // Alpha 值固定为255
    }

    return imageData;
}

// OTSU algorithm
// rewrite from http://www.labbookpages.co.uk/software/imgProc/otsuThreshold.html
const OTSUAlgorithm = (grayData) => {
    let total = grayData.data.length / 4;

    let histData = Array(256).fill(0);
    for (let i = 0; i < total * 4; i += 4) {
        let h = 0xFF & grayData.data[i];
        histData[h]++;
    }

    let sum = 0;
    for (let i = 0; i < 256; ++i) {
        sum += i * histData[i];
    }

    let wB = 0, wF = 0, sumB = 0;
    let varMax = 0, threshold = 0;

    for (let t = 0; t < 256; ++t) {
        wB += histData[t];
        if (wB === 0) continue;
        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histData[t];

        let mB = sumB / wB;
        let mF = (sum - sumB) / wF;

        let varBetween = wB * wF * (mB - mF) ** 2;

        if (varBetween > varMax) {
            varMax = varBetween;
            threshold = t;
        }
    }

    return threshold;
}

const toBinaryData = (grayData, threshold) => {
    for (let i = 0; i < grayData.data.length; i += 4) {
        let gray = grayData.data[i + 0];
        const binary = gray > threshold ? 255 : 0;
        grayData.data[i + 0] = binary;
        grayData.data[i + 1] = binary;
        grayData.data[i + 2] = binary;
        grayData.data[i + 3] = 255 // Alpha 值固定为255
    }

    return grayData;
}

const toEigenvalue = (binaryData) => {
    let buffer = [];
    for (let i = 0; i < binaryData.data.length; i += 4) {
        const binary = binaryData.data[i] ? 1 : 0;
        buffer.push(binary);
    }

    return buffer.join('');
}

const getImageEigenvalue = async (filepath, imgWidth = 8) => {
    let image = await canvas.loadImage(filepath);           // filepath => image object
    const imageData = toCompressData(image, imgWidth);             // image object => RGBA data array
    const grayData = toGrayData(imageData);                 // RGBA data array => gray data array
    const threshold = OTSUAlgorithm(imageData);             // gray data array => binary threshold
    const binaryData = toBinaryData(grayData, threshold);   // gray data array => binary data array
    const eigenvalue = toEigenvalue(binaryData);            // binary data array => eigen value

    // img = toCanvas(binaryData);                             // binary data array => image object
    // fs.writeFileSync(filepath.replace(`images`, `binary`), img.toBuffer(`image/png`), 'binary');

    return eigenvalue;
}

const doSSIM = async (file1, file2) => {
    let image1 = await canvas.loadImage(file1);
    let image2 = await canvas.loadImage(file2);
    image1 = toCompressData(image1, 8);
    image2 = toCompressData(image2, 8);
    image1.channels = 4;
    image2.channels = 4;
    return ssim.compare(image1, image2);
}

const ssim = require('image-ssim');


(async (args) => {

    if (args.length >= 2) {
        const file1 = args[0];
        const file2 = args[1];
        let now = Date.now();
        let result = await doSSIM(file1, file2)
        console.log((Date.now() - now).toString().padStart(4, ' '), 'ms', result.ssim);
        console.log(file1);
        console.log(file2);
        return;
    }

    const images = fs.readdirSync(`./images`);
    for (let i in images) for (let j in images) {
        if (j <= i) { continue; }

        const file1 = `./images/${images[i]}`;
        const file2 = `./images/${images[j]}`;

        let now = Date.now();
        let result = await doSSIM(file1, file2)
        // console.log(Date.now() - now, 'ms');
        // console.log(file1);
        // console.log(file2);
        // console.log(result);
        // console.log('');

        console.log((Date.now() - now).toString().padStart(4, ' '), 'ms', result.ssim);
        if (result.ssim > 0.95) {
            console.log(file1);
            console.log(file2);
        }

        // let eigenvalue1 = await getImageEigenvalue(file1);
        // let eigenvalue2 = await getImageEigenvalue(file2);

        // console.log(eigenvalue1);
        // console.log(eigenvalue2);

    }
})(process.argv.slice(2));



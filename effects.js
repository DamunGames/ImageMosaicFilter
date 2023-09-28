// effects.js
// 画像効果処理

// プレーンな状態を描画
function drawPlane(ctx, image, dx = 0, dy = 0) {
    ctx.filter = "none";
    ctx.drawImage(image, dx, dy);
}

class EffectBase {
    constructor(showImage) {
        this._showImage = showImage;
    }
    getShowImage() {
        return this._showImage;
    }
    drawEffect(isOverlap = false) {}
}

// モザイク描画クラス
class MosaicEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.blockSize;     // モザイクのブロックサイズ
        this._isRunningDraw;        // モザイク描画処理中フラグ
        this._isRequestedCancel;    // モザイク描画処理のキャンセル要求フラグ
        this._canvas = document.createElement("canvas");    // モザイク作業用のキャンバス
        this._canvas.style.display = "none";
        this._ctx = this._canvas.getContext("2d");
    }

    async drawEffectAsync(isOverlap) {
        // キャンセルをリクエストし、既に開始している描画のキャンセルを待つ
        this._isRequestedCancel = true;
        const result = await this.asyncWaitCancel();

        // 非同期で描画開始
        this._isRunningDraw = true;
        this._isRequestedCancel = false;
        this.drawEffect(isOverlap);
    }

    // 1フレーム待つ関数
    async waitForNextFrame() {
        return new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }

    // 非同期描画のキャンセルを待つ
    asyncWaitCancel() {
        return new Promise((resolve) => {
            const checkIsRunningDraw = () => {
                if (!this._isRunningDraw) {
                    resolve();
                }
                else {
                    // 一定時間待機後に再度チェック
                    setTimeout(checkIsRunningDraw, 10);
                }
            }
            checkIsRunningDraw();
        });
    }

    // モザイクで描画
    async drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.blockSize) || this.blockSize <= 0) {
            console.warn(`Invalid mosaic block size:${this.blockSize}`);
            this._isRunningDraw = false;
            return;
        }

        // モザイクで描画
        if (this.blockSize > 1) {
            // 作業キャンバスをリサイズ
            this._canvas.width = showImage.image.width * showImage.scale;
            this._canvas.height = showImage.image.height * showImage.scale;
            this._ctx.setTransform(1, 0, 0, 1, 0, 0);
            this._ctx.scale(showImage.scale, showImage.scale);
            this._ctx.clearRect(0, 0, this._canvas.width / showImage.scale, this._canvas.height / showImage.scale);
            // モザイクの計算をするため一度プレーンな状態を作業キャンバスに描画
            drawPlane(this._ctx, showImage.image);
            
            const blockUnitSize = this.blockSize * this.blockSize;
            const piexelCountThreshold = 5000;
            let pixelCount = 0;
            try {
                for (let y = 0; y < this._canvas.height && !this._isRequestedCancel; y += this.blockSize) {
                    for (let x = 0; x < this._canvas.width && !this._isRequestedCancel; x += this.blockSize) {
                        const blockWidth = Math.min(this.blockSize, this._canvas.width - x);
                        const blockHeight = Math.min(this.blockSize, this._canvas.height - y);
                        const imageData = this._ctx.getImageData(x, y, blockWidth, blockHeight);
                        const averageColor = this._calculateAverageColor(imageData);
                        // モザイクのブロック部分だけクリア(NOTE:半透明対応)
                        this._ctx.clearRect(x / showImage.scale, y / showImage.scale, this.blockSize  / showImage.scale, this.blockSize  / showImage.scale);
                        // モザイクの色で塗りつぶし
                        this._fillBlockWithColor(this._ctx, x / showImage.scale, y / showImage.scale, this.blockSize  / showImage.scale, this.blockSize  / showImage.scale, averageColor);
    
                        // 一定描画毎にキャンセルリクエスト確認の為にawaitを挟む
                        pixelCount += blockUnitSize;
                        if (pixelCount > piexelCountThreshold) {
                            pixelCount -= piexelCountThreshold;
                            await this.waitForNextFrame();
                        }
                    }
                }
    
                // 全ブロックの処理が完了したら表示に反映
                if (!this._isRequestedCancel) {
                    const mosaicImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
                    showImage.ctx.putImageData(mosaicImageData, 0, 0);    
                }    
            }
            catch (error) {
                this._isRunningDraw = false;
                console.error(`Error handling draw mosaic: ${error}`);
                alert("モザイク処理中にエラーが発生しました。ページをリロードして別の画像を試してみてください。");    
            }
        }
        else {
            // エフェクトの重複を避けるため、キャンバスをクリア
            // NOTE:モザイクは独自で計算した色のみを描画するため、isOverlap=trueに対応していない
            showImage.clearRect();
            // プレーンな状態を描画
            drawPlane(showImage.ctx, showImage.image);
        }
        this._isRunningDraw = false;
    }

    // 画像データから平均色を計算する関数
    _calculateAverageColor(imageData) {
        let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
        const pixels = imageData.data;
    
        let pixelCount = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0) {
                totalR += pixels[i];
                totalG += pixels[i + 1];
                totalB += pixels[i + 2];
                totalA += pixels[i + 3];
                pixelCount += 1;
            }
        }
    
        if (pixelCount <= 0) {
            return "rgba(0, 0, 0, 0)";
        }
        else {
            const avgR = Math.round(totalR / pixelCount);
            const avgG = Math.round(totalG / pixelCount);
            const avgB = Math.round(totalB / pixelCount);
            const avgA = Math.round(totalA / pixelCount) / 255;
            return `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA})`;    
        }
    }

    // ブロックを指定色で塗りつぶす関数
    _fillBlockWithColor(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }
}

// ぼかし描画
class BlurEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.size;      // ぼかしのサイズ
        this.isScaling; // ぼかしに応じて拡縮するフラグ
    }

    // ぼかして描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.size) || this.size < 0) {
            console.warn(`Invalid blur size: ${this.size}`);
            return;
        }
    
        const blurSize = this.size * 2.5 / showImage.scale * (this.isScaling ? 1 : 0);
        const bothSideBlurSize = blurSize * 2;

        let canvasWidth = showImage.image.width + bothSideBlurSize;
        let canvasHeight = showImage.image.height + bothSideBlurSize;

        // キャンバスをリサイズ
        showImage.canvas.width = canvasWidth * showImage.scale;
        showImage.canvas.height = canvasHeight * showImage.scale;
        showImage.ctx.setTransform(1, 0, 0, 1, 0, 0);
        showImage.ctx.scale(showImage.scale, showImage.scale);

        // エフェクトの重複を避けるため、キャンバスをクリア
        // NOTE:リサイズ時は元のimageの位置変更が必要なため、isOverlap=trueに対応していない
        if (!isOverlap && blurSize <= 0) {
            showImage.clearRect();
        }
    
        // ぼかして描画
        showImage.ctx.filter = `blur(${this.size}px)`;
        showImage.ctx.drawImage(showImage.image, blurSize, blurSize);    
    }
}

// 輝度描画
class BrightnessEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.brightness;        // 輝度
    }

    // 輝度を反映して描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.brightness) || this.brightness < 0) {
            console.warn(`Invalid brightness: ${this.brightness}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // 輝度を反映して描画
        showImage.ctx.filter = `brightness(${this.brightness})`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// コントラスト描画
class ContrastEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.contrastRate;      // コントラストの割合
    }

    // コントラストを反映して描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.contrastRate) || this.contrastRate < 0) {
            console.warn(`Invalid contrast rate: ${this.contrastRate}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // コントラストを反映して描画
        showImage.ctx.filter = `contrast(${this.contrastRate}%)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// ドロップシャドウ描画
class DropShadowEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.offset = { x: 0, y: 0 };       // ドロップシャドウのオフセット
        this.blurRadius;                    // ドロップシャドウのぼかし半径
        this.color;                         // ドロップシャドウの色
    }

    // ドロップシャドウ描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.offset.x) || isNaN(this.offset.y)) {
            console.warn(`Invalid offset: ${this.offset}`);
            return;
        }
        if (isNaN(this.blurRadius) || this.blurRadius < 0) {
            console.warn(`Invalid blur radius: ${this.blurRadius}`);
            return;
        }
    
        // ドロップシャドウのぼかしサイズも含めてキャンバスのサイズを計算
        const blurSize = this.blurRadius * 2.5 / showImage.scale;
        const bothSideBlurSize = blurSize * 2;
        let canvasWidth = showImage.image.width + bothSideBlurSize;
        let canvasHeight = showImage.image.height + bothSideBlurSize;
        if (Math.abs(this.offset.x) > blurSize) {
            canvasWidth += Math.abs(this.offset.x) - blurSize;
        }
        if (Math.abs(this.offset.y) > blurSize) {
            canvasHeight += Math.abs(this.offset.y) - blurSize;
        }
    
        // キャンバスをリサイズ
        showImage.canvas.width = canvasWidth * showImage.scale;
        showImage.canvas.height = canvasHeight * showImage.scale;
        showImage.ctx.setTransform(1, 0, 0, 1, 0, 0);
        showImage.ctx.scale(showImage.scale, showImage.scale);
    
        // エフェクトの重複を避けるため、キャンバスをクリア
        // NOTE:シャドウによっては元のimageの位置変更が必要なため、isOverlap=trueに対応していない
        showImage.clearRect();
    
        // 輝度を反映して描画
        showImage.ctx.filter = `drop-shadow(${this.offset.x * showImage.scale}px ${this.offset.y * showImage.scale}px ${this.blurRadius}px ${this.color})`;
        showImage.ctx.drawImage(showImage.image, Math.max(blurSize - this.offset.x, 0), Math.max(blurSize - this.offset.y, 0));
    }
}

// グレースケール描画
class GrayscaleEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.grayscaleRate;      // グレースケールの割合
    }

    // グレースケールを反映して描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.grayscaleRate) || this.grayscaleRate < 0) {
            console.warn(`Invalid grayscale rate: ${this.grayscaleRate}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // グレースケールを反映して描画
        showImage.ctx.filter = `grayscale(${this.grayscaleRate}%)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// 色相回転描画
class HueRotateEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.degreeAngle;      // 色相回転の角度
    }

    // 色相回転を反映して描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.degreeAngle) || this.degreeAngle < 0) {
            console.warn(`Invalid hue rotate degree angle: ${this.degreeAngle}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // 色相回転を反映して描画
        showImage.ctx.filter = `hue-rotate(${this.degreeAngle}deg)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// 色反転描画
class InvertEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.invertRate;      // 色反転の割合
    }

    // 色反転描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.invertRate) || this.invertRate < 0) {
            console.warn(`Invalid invert rate: ${this.invertRate}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // 色反転描画
        showImage.ctx.filter = `invert(${this.invertRate}%)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// 透過描画
class OpacityEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.opacityRate;      // 透過の割合
    }

    // 透過描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.opacityRate) || this.opacityRate < 0) {
            console.warn(`Invalid opacity rate: ${this.opacityRate}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // 透過描画
        showImage.ctx.filter = `opacity(${this.opacityRate}%)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

// 彩度描画
class SaturateEffect extends EffectBase {
    constructor(showImage) {
        super(showImage);
        this.saturateRate;      // 透過の割合
    }

    // 彩度描画
    drawEffect(isOverlap) {
        const showImage = super.getShowImage();
        if (!showImage || !showImage.isShowableImage) return;     // 表示できない場合は無視

        if (isNaN(this.saturateRate) || this.saturateRate < 0) {
            console.warn(`Invalid saturate rate: ${this.saturateRate}`);
            return;
        }
    
        if (!isOverlap) {
            // エフェクトの重複を避けるため、キャンバスをクリア
            showImage.clearRect();
        }
    
        // 彩度描画
        showImage.ctx.filter = `saturate(${this.saturateRate}%)`;
        showImage.ctx.drawImage(showImage.image, 0, 0);
    }
}

export { drawPlane, MosaicEffect, BlurEffect, BrightnessEffect, ContrastEffect, DropShadowEffect, GrayscaleEffect, HueRotateEffect, InvertEffect, OpacityEffect, SaturateEffect };
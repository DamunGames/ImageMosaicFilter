// scripts.js

import * as common from "./common.js";
import * as effects from "./effects.js";

// 定数定義
const EFFECTS = {
    MOSAIC: "mosaic",           // モザイク描画
    BLUR: "blur",               // ぼかし描画
    BRIGHTNESS: "brightness",   // 輝度描画
    CONTRAST: "contrast",       // コントラスト描画
    DROP_SHADOW: "dropShadow",  // ドロップシャドウ描画
    GRAYSCALE: "grayscale",     // グレースケール描画
    HUE_ROTATE: "hueRotate",    // 色相回転描画
    INVERT: "invert",           // 色反転描画
    OPACITY: "opacity",         // 透過描画
    SATURATE: "saturate",       // 彩度描画
};

// 画像URLの処理可能フラグ
const isCanProcessImageURL = false;

// 表示用キャンバス
const showImage = new common.ShowImage(
    document.getElementById("showImageCanvas"),
    document.getElementById("showImageCanvas").getContext("2d")
);

// エフェクトのインスタンス
const mosaicEffect = new effects.MosaicEffect(showImage);
const blurEffect = new effects.BlurEffect(showImage);
const brightnessEffect = new effects.BrightnessEffect(showImage); 
const contrastEffect = new effects.ContrastEffect(showImage);
const dropShadowEffect = new effects.DropShadowEffect(showImage);
const grayscaleEffect = new effects.GrayscaleEffect(showImage);
const hueRotateEffect = new effects.HueRotateEffect(showImage);
const invertEffect = new effects.InvertEffect(showImage);
const opacityEffect = new effects.OpacityEffect(showImage);
const saturateEffect = new effects.SaturateEffect(showImage);

// エフェクト描画関数
const EFFECT_FUNCTIONS = {
    [EFFECTS.MOSAIC]: mosaicEffect.drawEffectAsync.bind(mosaicEffect),
    [EFFECTS.BLUR]: blurEffect.drawEffect.bind(blurEffect),
    [EFFECTS.BRIGHTNESS]: brightnessEffect.drawEffect.bind(brightnessEffect),
    [EFFECTS.CONTRAST]: contrastEffect.drawEffect.bind(contrastEffect),
    [EFFECTS.DROP_SHADOW]: dropShadowEffect.drawEffect.bind(dropShadowEffect),
    [EFFECTS.GRAYSCALE]: grayscaleEffect.drawEffect.bind(grayscaleEffect),
    [EFFECTS.HUE_ROTATE]: hueRotateEffect.drawEffect.bind(hueRotateEffect),
    [EFFECTS.INVERT]: invertEffect.drawEffect.bind(invertEffect),
    [EFFECTS.OPACITY]: opacityEffect.drawEffect.bind(opacityEffect),
    [EFFECTS.SATURATE]: saturateEffect.drawEffect.bind(saturateEffect),
};

// 最終描画エフェクト
let lastDrawEffect = EFFECTS.MOSAIC;

// 表示画像名
let loadImageName = "";

// ダウンロードボタン
const downloadButton = document.getElementById("downloadButton");

// エフェクト毎のパラメータ
const effectRadios = document.getElementsByName("effects");
const effectsParameters = {};

// 初期化処理
(function() {
    // 状態表示用Label
    const statusLabel = document.getElementById("statusLabel");

    // ダークモード対応
    const osDark = window.matchMedia("(prefers-color-scheme: dark)");
    const onChangeDarkMode = (event) => { setDarkMode(event.matches); }
    osDark.addEventListener("change", onChangeDarkMode);
    // ダークモード初回反映
    onChangeDarkMode(osDark);
    // 手動切替用チェックボックス初期化
    const darkModeCheckbox = document.getElementById("darkModeCheckbox");
    darkModeCheckbox.checked = osDark.matches;
    darkModeCheckbox.addEventListener("change", () => { setDarkMode(darkModeCheckbox.checked); }); 

    // URLの画像読み込み関数
    const loadImageURL = (url, imageName = "") => {
        loadImageName = imageName;
        statusLabel.textContent = (imageName == "" ? url : imageName);
        setIsShowableImage(false);
        showImage.image.src = url;
    };
    // Fileオブジェクトの画像読み込み関数
    const loadImageFile = (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        loadImageURL(URL.createObjectURL(file), file.name);
    };

    // ファイル読み込みイベント登録
    const imageInput = document.getElementById("imageInput");
    imageInput.addEventListener("change", (event) => { loadImageFile(event.target.files[0]); });

    // ドラッグ＆ドロップのイベント登録
    document.addEventListener("dragover", (event) => {
        event.preventDefault();     // デフォルトの挙動をキャンセル
    });
    document.addEventListener("drop", (event) => {
        event.preventDefault();     // デフォルトの挙動をキャンセル
        if (event.dataTransfer.files[0]) {
            // ファイルの画像読み込み
            loadImageFile(event.dataTransfer.files[0]);
        }
        else if (isCanProcessImageURL) {
            const url = event.dataTransfer.getData("text/plain");
            if (common.isImageURL(url)) {
                // URLの画像読み込み
                loadImageURL(url);
            }
        }
    });

    // 貼り付けイベント登録
    document.addEventListener("paste", (event) => {
        const clipboardData = event.clipboardData || window.clipboardData;
        if (clipboardData.files[0]) {
            // ファイルの画像読み込み
            loadImageFile(clipboardData.files[0]);
        }
        else if (isCanProcessImageURL) {
            const url = clipboardData.getData("text/plain");
            if (common.isImageURL(url)) {
                // URLの画像読み込み
                loadImageURL(url);
            }    
        }
    });

    // Imageのイベント登録
    showImage.image.onload = () => {
        try {
            // 読み込んだ画像を表示
            scaleCanvas(showImage.canvas, showImage.ctx, showImage.image, showImage.scale);
            setIsShowableImage(true);
            drawLastEffect();
        } catch (error) {
            console.error(`Error handling image loading:${error}`);
            alert("画像の読み込み中にエラーが発生しました。別の画像を試してみてください。");
        } finally {
            URL.revokeObjectURL(showImage.image.src);
        }
    };
    showImage.image.onerror = () => {
        setIsShowableImage(false);
        console.error("Error loading the image");
        alert("画像の読み込み中にエラーが発生しました。別の画像を試してみてください。");
        URL.revokeObjectURL(showImage.image.src);
    };

    // ファイル名表示チェックボックスイベント登録
    const imageInputButton = document.getElementById("imageInputButton");
    const setShowFileName = (isShow) => {
        imageInput.style = "display: " + (isShow ? "inline-block;" : "none;");
        imageInputButton.style = "display: " + (isShow ? "none;" : "inline-block;");
        statusLabel.style = "display: " + (isShow ? "inline-block;" : "none;");
    }
    const showFileNameCheckbox = document.getElementById("showFileNameCheckbox");
    setShowFileName(showFileNameCheckbox.checked);
    showFileNameCheckbox.addEventListener("change", () => { setShowFileName(showFileNameCheckbox.checked); });

    // ダウンロードボタンのイベント登録
    downloadButton.addEventListener("click", () => {
        try{
            showImage.canvas.toBlob(function(blob) {
                if (!blob) {
                    throw new Error("画像の変換中にエラーが発生しました。");
                }
                const downloadURL = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = downloadURL;
                downloadLink.download = loadImageName || "image.png";
                downloadLink.click();
                URL.revokeObjectURL(downloadURL);
            });    
        } catch (error) {
            console.error("ダウンロードエラー:", error);
            alert("ダウンロード中にエラーが発生しました。別の方法で試してみてください。");    
        }
    });

    // パラメータの登録
    for(const key in EFFECTS) {
        const effect = EFFECTS[key];
        effectsParameters[effect] = document.getElementById(effect + "Parameters");
    }

    // ラジオボタンの変更イベント登録
    effectRadios.forEach((radio) => {
        radio.addEventListener("change", function() {
            // 選択したエフェクトのパラメータを表示し、再描画
            showEffectParameters(this.value);
            scaleCanvas(showImage.canvas, showImage.ctx, showImage.image, showImage.scale);
            drawEffect(this.value);
        });
    });

    // スケールボタンのイベント登録
    common.setupSliderAndTextInput("scaleSlider", "scaleNumberInput", (value) => { showImage.scale = parseFloat(value); }, () => { scaleCanvas(showImage.canvas, showImage.ctx, showImage.image, showImage.scale); drawLastEffect(); } );
    document.getElementById("scaleResetButton").addEventListener("click", () => {
        document.getElementById("scaleSlider").value = 1;
        document.getElementById("scaleNumberInput").value = 1;
        showImage.scale = 1;
        scaleCanvas(showImage.canvas, showImage.ctx, showImage.image, showImage.scale);
        drawLastEffect();
    });

    // スライダーとテキスト入力の関連付けし、コールバックを登録
    common.setupSliderAndTextInput("mosaicSlider", "mosaicNumberInput", (value) => { mosaicEffect.blockSize = parseInt(value); }, () => { mosaicEffect.drawEffectAsync(); });
    common.setupSliderAndTextInput("blurSlider", "blurNumberInput", (value) => { blurEffect.size = parseInt(value); }, () => { blurEffect.drawEffect(); });
    common.setupCheckbox("blurCheckbox", (value) => { blurEffect.isScaling = value; }, () => { blurEffect.drawEffect(); });
    common.setupSliderAndTextInput("brightnessSlider", "brightnessNumberInput", (value) => { brightnessEffect.brightness = parseFloat(value); }, () => { brightnessEffect.drawEffect(); });
    common.setupSliderAndTextInput("contrastSlider", "contrastNumberInput", (value) => { contrastEffect.contrastRate = parseFloat(value); }, () => { contrastEffect.drawEffect(); });
    common.setupSliderAndTextInput("dropShadowOffsetXSlider", "dropShadowOffsetXNumberInput", (value) => { dropShadowEffect.offset.x = parseInt(value); }, () => { dropShadowEffect.drawEffect(); });
    common.setupSliderAndTextInput("dropShadowOffsetYSlider", "dropShadowOffsetYNumberInput", (value) => { dropShadowEffect.offset.y = parseInt(value); }, () => { dropShadowEffect.drawEffect(); });
    common.setupSliderAndTextInput("dropShadowBlurRadiusSlider", "dropShadowBlurRadiusNumberInput", (value) => { dropShadowEffect.blurRadius = parseInt(value); }, () => { dropShadowEffect.drawEffect(); });
    common.setupColorPicker("dropShadowColorPicker", (value) => { dropShadowEffect.color = value; }, () => { dropShadowEffect.drawEffect(); });
    common.setupSliderAndTextInput("grayscaleSlider", "grayscaleNumberInput", (value) => { grayscaleEffect.grayscaleRate = parseFloat(value); }, () => { grayscaleEffect.drawEffect(); });
    common.setupSliderAndTextInput("hueRotateSlider", "hueRotateNumberInput", (value) => { hueRotateEffect.degreeAngle = parseFloat(value); }, () => { hueRotateEffect.drawEffect(); });
    common.setupSliderAndTextInput("invertSlider", "invertNumberInput", (value) => { invertEffect.invertRate = parseFloat(value); }, () => { invertEffect.drawEffect(); });
    common.setupSliderAndTextInput("opacitySlider", "opacityNumberInput", (value) => { opacityEffect.opacityRate = parseFloat(value); }, () => { opacityEffect.drawEffect(); });
    common.setupSliderAndTextInput("saturateSlider", "saturateNumberInput", (value) => { saturateEffect.saturateRate = parseFloat(value); }, () => { saturateEffect.drawEffect(); });
})();

// <html>にダークモード対応用クラス追加/削除
function setDarkMode(isOn) {
    const darkmode = "darkmode";
    if (isOn) {
        document.documentElement.classList.add(darkmode);
    }
    else {
        document.documentElement.classList.remove(darkmode);
    }
}

// キャンバスを画像サイズでリサイズ
function fitCanvasSize(canvas, image) {
    canvas.width = image.width;
    canvas.height = image.height;
}

// キャンバスをスケール
function scaleCanvas(canvas, ctx, image, scale) {
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
}

// 画像の表示可能状態を設定
function setIsShowableImage(isShowable) {
    showImage.isShowableImage = isShowable;
    downloadButton.disabled = !isShowable;
}

// 指定のエフェクトのパラメータ表示
function showEffectParameters(showEffect) {
    for (const key in EFFECTS) {
        const effect = EFFECTS[key];
        const effectParameters = effectsParameters[effect];
        if (effectParameters) {
            effectParameters.style.display = effect == showEffect ? "block" : "none";
        }
    }
}

// 最後に描画したエフェクトを描画
function drawLastEffect() {
    if (lastDrawEffect != null) {
        drawEffect(lastDrawEffect);
    }
}

// エフェクトをかけて描画
function drawEffect(effect) {
    const effectFunction = EFFECT_FUNCTIONS[effect];
    if (effectFunction) {
        try {
            lastDrawEffect = effect;
            effectFunction();
        } catch (error) {
            console.error("Error applying effect:", error);
            alert("エフェクトの適用中にエラーが発生しました。別のエフェクトを選択してみてください。");
        }
    }
    else {
        console.warn("Unknown effect:" + effect);
        alert("不明なエフェクトが選択されました。正しいエフェクトを選択してください。");
    }
}

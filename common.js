// common.js
// 汎用処理

// 表示用Context2D、キャンバス、Imageのまとめ
class ShowImage {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.image = new Image();
        this.isShowableImage = false;
        this.scale = 1;
    }

    clearRect() {
        this.ctx.clearRect(0, 0, this.canvas.width / this.scale, this.canvas.height / this.scale);
    }
}

// 画像URL判定
function isImageURL (url) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|svg)$/i;
    return imageExtensions.test(url);
}

// スライダーとテキスト入力の関連付けし、コールバックを登録
function setupSliderAndTextInput(sliderName, textInputName, setValue = null, onInput = null, parse = parseFloat) {
    // HTMLElementの取得
    const slider = document.getElementById(sliderName);
    const textInput = document.getElementById(textInputName);
    if (!slider || !textInput) {
        console.warn(`Invalid element name slider:${sliderName} textInput:${textInputName}`);
        return;
    }

    // スライダーの値を基準に値を統一
    textInput.value = slider.value;
    setValue?.(slider.value);

    // スライダー変更イベントからテキストボックスへ入力反映
    slider.addEventListener("input", function() {
        textInput.value = slider.value;
        setValue?.(slider.value);
        onInput?.();
    });

    // テキストボックス変更イベントからスライダーへ入力反映
    textInput.addEventListener("input", function() {
        const value = parse(textInput.value);
        if (!isNaN(value) && value >= parse(slider.min) && value <= parse(slider.max)) {
            slider.value = value;
            setValue?.(slider.value);
            onInput?.();
        }
    });
}

// チェックボックスにコールバックを東麓
function setupCheckbox(checkboxName, setValue = null, onInput = null) {
    // HTMLElementの取得
    const checkbox = document.getElementById(checkboxName);
    if (!checkbox) {
        console.warn(`Invalid element name checkbox:${checkboxName}`);
        return;
    }

    // チェックボックスを基準に値を統一
    setValue?.(checkbox.checked);

    // 入力イベントを東麓
    checkbox.addEventListener("input", function() {
        setValue?.(checkbox.checked);
        onInput?.();
    })
}

// カラーピッカーにコールバックを登録
function setupColorPicker(colorPickerName, setValue = null, onInput = null) {
    // HTMLElementの取得
    const colorPicker = document.getElementById(colorPickerName);
    if (!colorPicker) {
        console.warn(`Invalid element name color picker:${colorPickerName}`);
        return;
    }

    // カラーピッカーを基準に値を統一
    setValue?.(colorPicker.value);

    // 入力イベントを登録
    colorPicker.addEventListener("input", function() {
        setValue?.(colorPicker.value);
        onInput?.();
    });
}

export { ShowImage, isImageURL, setupSliderAndTextInput, setupCheckbox, setupColorPicker };
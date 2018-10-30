const px = (n) => {
    if (typeof n === 'undefined') return void 0;
    if (!n) return 0;
    const {
        windowWidth
    } = wx.getSystemInfoSync();
    return parseInt(n, 10) / 750 * windowWidth;
}

/**
    shape Radial/Linear
    start Array [x, y, width, height]
    colorStop Array [stop, color]
    end Array [x, y, width, height]
*/
const fillColor = (ctx, start, end, colorStop, shape) => {
    const grd = ctx[`create${shape}Gradient`](...start);
    colorStop.forEach((cs) => {
        grd.addColorStop(...cs);
    });
    ctx.setFillStyle(grd);
    ctx.fillRect(...end);
};

const roundRect = (ctx, px, py, width, height, radius, lineWidth) => {
    const x = px - lineWidth / 2;
    const y = py - lineWidth / 2;
    const w = width + lineWidth;
    const h = height + lineWidth;
    const r = Math.min(radius, h / 2, w / 2);
    ctx.setLineWidth(lineWidth);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.clip();
}

const formatBorder = (border) => {
    const borderArr = border.split(' ');
    borderArr[0] = px(borderArr[0]);
    return borderArr;
}

const formatPadding = (padding) => {
    let paddingArr = [];
    if (typeof padding === 'number') {
        paddingArr.length = 4;
        paddingArr.fill(px(padding));
    } else {
        paddingArr = padding.split(' ').map(p => px(p));
    }
    return paddingArr;
}

const formatText = (ctx, text, pxMW, pxLH) => {
    const textArr = [];
    let tempArr = [];
    let tempWidth = 0;
    text.split('').forEach(word => {
        const w = ctx.measureText(word).width;

        if (tempWidth + w > pxMW) {
            textArr.push(tempArr.join(''));
            tempArr = [word];
            tempWidth = 0;
        } else {
            tempArr.push(word);
            tempWidth = w + tempWidth + 1;
        }
    });
    if (tempArr.length > 0) {
        textArr.push(tempArr.join(''));
    }

    const textWidth = textArr.length > 1 ? pxMW : ctx.measureText(text).width;
    const textHeight = textArr.length * pxLH;

    return {textArr, textWidth, textHeight};
}

Component({
    properties: {
        width: {
            type: Number,
            value: 750,
        },
        height: {
            type: Number,
            value: 500,
        },
        layers: {
            type: Array,
            value: [],
        },
        background: {
            type: Object,
            value: null,
        },
    },

    data: {
        drawing: true,
    },

    attached() {
        const ctx = wx.createCanvasContext('draw-canvas', this);

        const {
            background,
            layers,
            width,
            height
        } = this.data;

        // 背景图片
        if (background) {
            const {
                imageResource,
                dx = 0,
                dy = 0,
                dWidth = width,
                dHeight = height,
                color
            } = background;
            // 背景颜色
            if (color) {
                const {
                    start,
                    end,
                    colorStop,
                    shape = 'Linear'
                } = color;
                fillColor(ctx, start, end, colorStop, shape);
            }

            ctx.drawImage(imageResource, px(dx), px(dy), px(dWidth), px(dHeight));
        }

        // 图层
        layers.forEach((layer) => {
            if (layer.type === 'text') {
                const {
                    // textBaseline = 'top',
                    textAlign = 'left',
                    fontSize = 32,
                    text = '',
                    x = 0,
                    y = 0,
                    color = '#000',
                    lineHeight = 44,
                    maxWidth = width,
                    border = '0',
                    radius = 0,
                    padding = 0,
                    bgColor = null,
                } = layer;
                const pxx = px(x);
                const pxy = px(y);
                const pxFS = px(fontSize);
                const pxLH = px(lineHeight);
                const pxMW = px(maxWidth);
                const pxRadius = px(radius);
                ctx.setFontSize(pxFS);

                // border
                const [pxbw, bc = '#000'] = formatBorder(border);
                // padding 上右下左
                const [pt, pr, pb, pl] = formatPadding(padding);

                const {textArr, textWidth, textHeight} = formatText(ctx, text, pxMW, pxLH);

                // 背景
                // if (bgColor) {
                //     ctx.setStrokeStyle(bgColor);
                //     ctx.setLineJoin(radius ? 'round' : 'miter');
                //     const textBgWidth = pxMW + pl + pr;
                //     const textBgHeight = textHeight + pt + pb;
                //     ctx.setFillStyle(bgColor);
                //     ctx.fillRect(pxx - pl, pxy, pxMW + pl + pr, textHeight);
                //     ctx.setLineWidth(pxRadius);
                //     ctx.strokeRect(pxx - pl, pxy - pt,
                //         textBgWidth, textBgHeight - pxRadius);
                // }

                // 真实宽高
                const realWidth = textWidth + pl + pr;
                const realHeight = textHeight + pt + pb;

                let realX = pxx - pl;
                let realY = pxy - pt;
                if (textAlign === 'right') {
                    realX = pxx - pl - textWidth;
                    realY = pxy - pt;
                } else if (textAlign === 'center') {
                    realX = pxx - pl - textWidth / 2;
                    realY = pxy - pt;
                }

                // 边框
                ctx.save();
                ctx.setStrokeStyle(pxbw === 0 ? 'rgba(0,0,0,0)' : bc);
                roundRect(ctx, realX, realY, realWidth, realHeight, pxRadius, pxbw);
                if (bgColor) {
                    ctx.setFillStyle(bgColor);
                    ctx.fillRect(realX, realY, realWidth, realHeight);
                }
                ctx.stroke();
                ctx.restore();

                ctx.setFillStyle(color);
                ctx.setTextBaseline('top');
                ctx.setTextAlign(textAlign);
                textArr.forEach((str, i) => {
                    ctx.fillText(str, pxx, pxy + i * pxLH, pxMW);
                });
            }

            if (layer.type === 'color') {
                const {
                    start,
                    end,
                    colorStop,
                    shape = 'Linear'
                } = layer;
                fillColor(ctx, start, end, colorStop, shape);
            }

            if (layer.type === 'image') {
                const {
                    imageResource,
                    dx = 0,
                    dy = 0,
                    radius = 0,
                    dWidth = width,
                    dHeight = height
                } = layer;

                if (radius) {
                    ctx.save();
                    ctx.beginPath();
                    const cx = px(dx + radius / 2);
                    const cy = px(dy + radius / 2);
                    ctx.arc(cx, cy, px(dWidth) / 2, 0, 2 * Math.PI);
                    ctx.clip();
                    ctx.drawImage(imageResource, px(dx), px(dy), px(dWidth), px(dHeight));
                    ctx.restore();
                } else {
                    ctx.drawImage(imageResource, px(dx), px(dy), px(dWidth), px(dHeight));
                }
            }
        });

        ctx.draw(false);
        setTimeout(() => {
            this.setData({
                drawing: false,
            });
        }, 300);
    },

    methods: {
        toTempFilePath({
            destWidth,
            destHeight
        } = {}) {
            return new Promise((resolve) => {
                const {
                    width,
                    height
                } = this.data;

                wx.canvasToTempFilePath({
                    destWidth: destWidth || width,
                    destHeight: destHeight || height,
                    canvasId: 'draw-canvas',
                    success(res) {
                        resolve(res.tempFilePath)
                    }
                }, this);
            });
        },
    }
});

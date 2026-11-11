// --- Variables Globales ---
const upload = document.getElementById('upload');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const ctxOriginal = originalCanvas.getContext('2d');
const ctxResult = resultCanvas.getContext('2d');

const tooltipPixel = document.getElementById('tooltipPixel');
const panelDet = document.getElementById('panelDeterminante');
const valDet = document.getElementById('val-det');
const mensajeDet = document.getElementById('mensaje-det');
const matrizTexto = document.getElementById('matrizTexto');

// Sliders
const sA = document.getElementById('slider-a');
const sB = document.getElementById('slider-b');
const sC = document.getElementById('slider-c');
const sD = document.getElementById('slider-d');
const valA = document.getElementById('val-a');
const valB = document.getElementById('val-b');
const valC = document.getElementById('val-c');
const valD = document.getElementById('val-d');

let img = new Image();
let imagenCargada = false;

// --- 1. Cargar Imagen ---
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        img.onload = () => {
            // Redimensionar si es muy grande para que no se trabe
            const maxSize = 400;
            let width = img.width;
            let height = img.height;
            if (width > maxSize) {
                height = Math.floor(height * (maxSize / width));
                width = maxSize;
            }
            originalCanvas.width = width;
            originalCanvas.height = height;
            ctxOriginal.drawImage(img, 0, 0, width, height);
            
            imagenCargada = true;
            aplicarTransformacion(); // Dibuja por primera vez
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- 2. Escuchar los Sliders en Tiempo Real ---
function actualizarValores() {
    valA.textContent = parseFloat(sA.value).toFixed(1);
    valB.textContent = parseFloat(sB.value).toFixed(1);
    valC.textContent = parseFloat(sC.value).toFixed(1);
    valD.textContent = parseFloat(sD.value).toFixed(1);

    // Actualizar matriz visual
    matrizTexto.textContent = `[ ${parseFloat(sA.value).toFixed(1)}  ${parseFloat(sB.value).toFixed(1)} ]\n[ ${parseFloat(sC.value).toFixed(1)}  ${parseFloat(sD.value).toFixed(1)} ]`;

    if (imagenCargada) {
        aplicarTransformacion();
        actualizarDeterminante();
    }
}

sA.addEventListener('input', actualizarValores);
sB.addEventListener('input', actualizarValores);
sC.addEventListener('input', actualizarValores);
sD.addEventListener('input', actualizarValores);

// --- 3. Calcular y mostrar el Determinante ---
function actualizarDeterminante() {
    const a = parseFloat(sA.value);
    const b = parseFloat(sB.value);
    const c = parseFloat(sC.value);
    const d = parseFloat(sD.value);
    
    const det = (a * d) - (b * c);
    valDet.textContent = det.toFixed(2);

    if (det === 0) {
        mensajeDet.textContent = "⚠️ ¡Matriz Singular! La imagen se aplasta por completo.";
        mensajeDet.style.color = "#ff5555";
    } else if (det < 0) {
        mensajeDet.textContent = "🔄 El área se refleja (como un espejo).";
        mensajeDet.style.color = "#ffff00";
    } else if (Math.abs(det) > 1) {
        mensajeDet.textContent = "🔍 La imagen se expande (Zoom In).";
        mensajeDet.style.color = "#00ffcc";
    } else if (Math.abs(det) < 1) {
        mensajeDet.textContent = "🔎 La imagen se encoge (Zoom Out).";
        mensajeDet.style.color = "#00ffcc";
    } else {
        mensajeDet.textContent = "⚖️ El área se mantiene igual.";
        mensajeDet.style.color = "#fff";
    }
}

// --- 4. La Matemática: Aplicar Matriz a la Imagen ---
function aplicarTransformacion() {
    const w = originalCanvas.width;
    const h = originalCanvas.height;
    
    const originalData = ctxOriginal.getImageData(0, 0, w, h);
    const data = originalData.data;

    const a = parseFloat(sA.value);
    const b = parseFloat(sB.value);
    const c = parseFloat(sC.value);
    const d = parseFloat(sD.value);

    const det = (a * d) - (b * c);
    if (det === 0) {
        // Si el determinante es 0, no podemos calcular la inversa, limpiamos el canvas
        resultCanvas.width = w; resultCanvas.height = h;
        ctxResult.fillStyle = "#000";
        ctxResult.fillRect(0, 0, w, h);
        return;
    }

    // Matriz Inversa (Mapeo hacia atrás para no dejar huecos negros)
    const invA = d / det;
    const invB = -b / det;
    const invC = -c / det;
    const invD = a / det;

    resultCanvas.width = w;
    resultCanvas.height = h;
    const newImageData = ctxResult.createImageData(w, h);
    const newData = newImageData.data;

    // Centro de la imagen para que escale desde el medio
    const cx = w / 2;
    const cy = h / 2;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Coordenadas relativas al centro
            const relX = x - cx;
            const relY = y - cy;

            // Mapeo Inverso
            const origRelX = (invA * relX) + (invB * relY);
            const origRelY = (invC * relX) + (invD * relY);

            // Volver a coordenadas absolutas
            const origX = Math.round(origRelX + cx);
            const origY = Math.round(origRelY + cy);

            // Si el origen existe en la imagen original, copiamos el color
            if (origX >= 0 && origX < w && origY >= 0 && origY < h) {
                const origenIdx = (origY * w + origX) * 4;
                const destinoIdx = (y * w + x) * 4;

                newData[destinoIdx] = data[origenIdx];         // R
                newData[destinoIdx + 1] = data[origenIdx + 1]; // G
                newData[destinoIdx + 2] = data[origenIdx + 2]; // B
                newData[destinoIdx + 3] = data[origenIdx + 3]; // A
            }
        }
    }
    ctxResult.putImageData(newImageData, 0, 0);
}

// --- 5. Interacción del Mouse (Mostrar Píxeles) ---
originalCanvas.addEventListener('mousemove', (e) => {
    if (!imagenCargada) return;

    const rect = originalCanvas.getBoundingClientRect();
    // Calcular posición exacta del píxel
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Mostrar tooltip
    tooltipPixel.style.display = 'block';
    tooltipPixel.style.left = (e.clientX - rect.left + 10) + 'px';
    tooltipPixel.style.top = (e.clientY - rect.top + 10) + 'px';
    tooltipPixel.textContent = `x: ${x}, y: ${y}`;
});

originalCanvas.addEventListener('mouseleave', () => {
    tooltipPixel.style.display = 'none';
});

// --- 6. Botón Restaurar ---
document.getElementById('reset').addEventListener('click', () => {
    sA.value = 1; sB.value = 0; sC.value = 0; sD.value = 1;
    actualizarValores();
});

// --- 7. Botón Mágico (Transformación Aleatoria) ---
document.getElementById('btnQuizas').addEventListener('click', () => {
    // Generar valores aleatorios entre -1.5 y 1.5
    sA.value = (Math.random() * 3 - 1.5).toFixed(1);
    sB.value = (Math.random() * 3 - 1.5).toFixed(1);
    sC.value = (Math.random() * 3 - 1.5).toFixed(1);
    sD.value = (Math.random() * 3 - 1.5).toFixed(1);
    actualizarValores();
});

// Iniciar valores por defecto
actualizarValores();
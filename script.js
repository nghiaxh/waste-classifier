const SMALL_MODEL = "N3iLxQA7A";
const LARGE_MODEL = "paTmySuYs";
const MODEL_URL = `https://teachablemachine.withgoogle.com/models/${LARGE_MODEL}/`;

let model = null;
let currentImage = null;
let webcam = null;

const resultsDiv = document.getElementById('results');
const predictionsDiv = document.getElementById('predictions');
const notification = document.getElementById('notification');

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

async function initializeApp() {
    notification.innerHTML = "Đang tải mô hình...";
    model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
    notification.innerHTML = "Mô hình đã sẵn sàng!";
    console.log("Mô hình đã sẵn sàng!");
    setTimeout(() => {
        notification.style.display = "none";
    }, 4000);
}

document.getElementById('image-upload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            showImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('start-camera').addEventListener('click', async function () {
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        let videoConfig;

        if (isMobile) {
            videoConfig = {
                facingMode: "environment"
            };
        } else {
            videoConfig = {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConfig
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.maxWidth = '300px';

        const container = document.getElementById('webcam-container');
        container.innerHTML = '';
        container.appendChild(video);

        const captureBtn = document.createElement('button');
        captureBtn.textContent = '📸 Chụp';
        captureBtn.className = 'btn';
        captureBtn.style.marginTop = '10px';
        captureBtn.onclick = () => captureImage(video);
        container.appendChild(captureBtn);

        webcam = { video, stream };

        document.getElementById('start-camera').classList.add('hidden');
        document.getElementById('stop-camera').classList.remove('hidden');
    } catch (error) {
        alert('Không thể truy cập camera! Vui lòng kiểm tra quyền truy cập.');
    }
});

document.getElementById('stop-camera').addEventListener('click', function () {
    if (webcam && webcam.stream) {
        webcam.stream.getTracks().forEach(track => track.stop());
        document.getElementById('webcam-container').innerHTML = '';

        document.getElementById('start-camera').classList.remove('hidden');
        document.getElementById('stop-camera').classList.add('hidden');

        webcam = null;
    }
});

function captureImage(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    showImage(imageData);

    document.getElementById('stop-camera').click();
}

function showImage(imageSrc) {
    currentImage = imageSrc;

    const container = document.getElementById('image-container');
    container.innerHTML = `<img src="${imageSrc}" alt="Ảnh để phân loại">`;

    document.getElementById('image-section').classList.remove('hidden');
    document.getElementById('classify-btn').classList.remove('hidden');
}

document.getElementById('classify-btn').addEventListener('click', async function () {
    if (!currentImage) {
        alert('Vui lòng chọn ảnh hoặc chụp ảnh từ camera trước khi phân loại!');
        return;
    }
    if (!model) {
        alert('Mô hình chưa sẵn sàng! Vui lòng đợi hoặc kiểm tra lại.');
        return;
    }

    predictionsDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Đang phân tích...</p>
        </div>
    `;
    resultsDiv.classList.add('show');

    const imgElement = document.createElement('img');
    imgElement.src = currentImage;
    imgElement.width = 224;
    imgElement.height = 224;

    imgElement.onload = async function () {
        try {
            const predictions = await model.predict(imgElement);

            const results = predictions.map(pred => ({
                name: pred.className,
                confidence: Math.round(pred.probability * 100)
            })).sort((a, b) => b.confidence - a.confidence);

            showResults(results);
        } catch (error) {
            console.error('Lỗi khi phân loại:', error);
            predictionsDiv.innerHTML = '<p style="color: red;">Có lỗi xảy ra khi phân loại ảnh!</p>';
        }
    };

    imgElement.onerror = function () {
        predictionsDiv.innerHTML = '<p style="color: red;">Không thể tải ảnh!</p>';
    };
});

function showResults(results) {
    const predictionsDiv = document.getElementById('predictions');
    let html = '';
    results.forEach((result, index) => {
        const isTop = index === 0;
        html += `
            <div class="result-item ${isTop ? 'top' : ''}">
                <span>${result.name}</span>
                <span class="confidence">${result.confidence}%</span>
            </div>
        `;
    });

    const topResult = results[0];

    const advice = getAdvice(topResult.name);
    const color = getColor(topResult.name);

    html += `
        <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid ${color};">
            <strong>💡 Gợi ý xử lý:</strong><br>
            ${advice}
        </div>
    `;

    predictionsDiv.innerHTML = html;
}

function getAdvice(wasteType) {
    const advice = {
        'Rác tái chế': 'Rửa sạch và để khô các vật liệu tái chế như chai nhựa, lon, giấy, bìa cứng. Nhớ tháo nắp chai và ép dẹp nếu có thể.',
        'Rác hữu cơ': 'Gồm thức ăn thừa, vỏ rau củ, lá cây,... Có thể dùng để ủ phân compost tại nhà hoặc làm phán bón cho cây.',
        'Rác không thể tái chế': 'Gồm túi nilon bẩn, giấy lau, gốm vỡ, khẩu trang... Đóng gói chắc chắn trước khi bỏ, đặc biệt với gốm vỡ hoặc vật sắc nhọn.',
        'Rác độc hại': 'Bao gồm pin, bóng đèn, hóa chất, thiết bị điện tử hỏng... Hãy mang đến điểm thu gom rác độc hại gần nhất.'
    };
    return advice[wasteType] || 'Xử lý theo quy định địa phương';
}

function getColor(wasteType) {
    const colors = {
        'Rác hữu cơ': '#cc9900',
        'Rác tái chế': '#4CAF50',
        'Rác không thể tái chế': '#aaaaaa',
        'Rác độc hại': '#FF5722'
    };
    return colors[wasteType] || '#666';
}
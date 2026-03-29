// حالة التطبيق
const appState = {
    currentCategory: "women",
    currentSize: "38",
    currentModel: "jacket",
    zoomLevel: 1.0,
    measurements: {},
    svgDrawing: null,
    svgCanvas: null
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
    drawPattern();
});

// تهيئة التطبيق
function initializeApp() {
    // إنشاء لوحة SVG
    const viewport = document.getElementById('drawing-viewport');
    appState.svgDrawing = SVG().addTo('#drawing-viewport').size('100%', '100%');
    appState.svgCanvas = appState.svgDrawing.group();
    
    // تعيين القياسات الابتدائية
    appState.measurements = measurementsDatabase[appState.currentCategory][appState.currentSize];
    
    // تحديث واجهة المستخدم
    updateCategoryDisplay();
    updateMeasurementsTable();
    populateSizesTables();
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // أزرار الفئات
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            switchCategory(category);
            
            // تحديث حالة الأزرار النشطة
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // أزرار النوافذ المنبثقة
    document.getElementById('sizes-popup-btn').addEventListener('click', () => openPopup('sizes-popup'));
    document.getElementById('models-popup-btn').addEventListener('click', () => openPopup('models-popup'));
    document.getElementById('calculations-popup-btn').addEventListener('click', () => openPopup('calculations-popup'));
    document.getElementById('instructions-popup-btn').addEventListener('click', () => openPopup('instructions-popup'));
    
    // إغلاق النوافذ
    document.querySelectorAll('.close-popup').forEach(button => {
        button.addEventListener('click', closeAllPopups);
    });
    
    document.getElementById('popup-overlay').addEventListener('click', closeAllPopups);
    
    // التبويبات
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // تحديث الأزرار النشطة
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // إظهار المحتوى المناسب
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // أزرار التحكم في منطقة الرسم
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('export-btn').addEventListener('click', exportSVG);
    
    // بطاقات الموديلات
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', function() {
            const model = this.dataset.model;
            selectModel(model);
            closeAllPopups();
        });
    });
    
    // الحسابات الرياضية
    document.getElementById('calculate-armhole').addEventListener('click', calculateArmhole);
    document.getElementById('calculate-neck').addEventListener('click', calculateNeck);
    document.getElementById('calculate-width').addEventListener('click', calculateWidth);
    
    // تحديث القيم في الجدول
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('measurement-input')) {
            updateMeasurement(e.target.dataset.key, parseFloat(e.target.value) || 0);
        }
    });
}

// تحميل البيانات الأولية
function loadInitialData() {
    // لا حاجة لتحميل إضافي حيث البيانات مخزنة محلياً
}

// تبديل الفئة
function switchCategory(category) {
    appState.currentCategory = category;
    
    // الحصول على أول مقاس متوفر لهذه الفئة
    const sizes = Object.keys(measurementsDatabase[category]);
    appState.currentSize = sizes[0];
    appState.measurements = measurementsDatabase[category][appState.currentSize];
    
    // تحديث الواجهة
    updateCategoryDisplay();
    updateMeasurementsTable();
    drawPattern();
}

// تحديث عرض الفئة
function updateCategoryDisplay() {
    const categoryName = categoryNames[appState.currentCategory];
    document.getElementById('current-category').textContent = categoryName;
    
    // تحديث اسم الفئة في النافذة المنبثقة
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === `${appState.currentCategory}-tab`) {
            btn.click();
        }
    });
}

// تحديث جدول القياسات
function updateMeasurementsTable() {
    const tableBody = document.querySelector('#measurements-table tbody');
    tableBody.innerHTML = '';
    
    const measurements = appState.measurements;
    const category = appState.currentCategory;
    
    // إنشاء صفوف الجدول
    Object.keys(measurements).forEach(key => {
        const value = measurements[key];
        let formula = '';
        
        // تحديد القاعدة الرياضية بناءً على القياس
        if (key === 'ظهر') {
            formula = `فتحة الإبط = (${value} ÷ 2) + 4 = ${calculateArmholeValue(value)} سم`;
        } else if (key === 'رقبة') {
            formula = `عرض الرقبة = (${value} ÷ 5) + 1 = ${calculateNeckValue(value)} سم`;
        } else if (key === 'صدر') {
            formula = `عرض القطعة = (${value} ÷ 4) + 2 = ${calculateWidthValue(value, 2)} سم`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${getMeasurementName(key)}</td>
            <td>
                <input type="number" class="measurement-input" data-key="${key}" 
                       value="${value}" step="0.5" min="10" max="200">
            </td>
            <td>${formula}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // تحديث عرض المقاس
    document.getElementById('current-size').textContent = `المقاس ${appState.currentSize}`;
}

// الحصول على الاسم العربي للقياس
function getMeasurementName(key) {
    const names = {
        'صدر': 'الصدر',
        'وسط': 'الوسط',
        'ظهر': 'طول الظهر',
        'عرض_ظهر': 'عرض الظهر',
        'رقبة': 'محيط الرقبة'
    };
    
    return names[key] || key;
}

// ملء جداول المقاسات في النافذة المنبثقة
function populateSizesTables() {
    // جدول الحريمي
    const womenTable = document.getElementById('women-sizes');
    womenTable.innerHTML = '';
    
    Object.keys(measurementsDatabase.women).forEach(size => {
        const measurements = measurementsDatabase.women[size];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${size}</td>
            <td>${measurements.صدر}</td>
            <td>${measurements.وسط}</td>
            <td>${measurements.ظهر}</td>
            <td>${measurements.عرض_ظهر}</td>
            <td>${measurements.رقبة}</td>
            <td><button class="size-select-btn" data-category="women" data-size="${size}">اختر</button></td>
        `;
        womenTable.appendChild(row);
    });
    
    // جدول الرجالي
    const menTable = document.getElementById('men-sizes');
    menTable.innerHTML = '';
    
    Object.keys(measurementsDatabase.men).forEach(size => {
        const measurements = measurementsDatabase.men[size];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${size}</td>
            <td>${measurements.صدر}</td>
            <td>${measurements.وسط}</td>
            <td>${measurements.ظهر}</td>
            <td>${measurements.عرض_ظهر}</td>
            <td><button class="size-select-btn" data-category="men" data-size="${size}">اختر</button></td>
        `;
        menTable.appendChild(row);
    });
    
    // جدول البناتي
    const girlsTable = document.getElementById('girls-sizes');
    girlsTable.innerHTML = '';
    
    Object.keys(measurementsDatabase.girls).forEach(size => {
        const measurements = measurementsDatabase.girls[size];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${size}</td>
            <td>${measurements.صدر}</td>
            <td>${measurements.وسط}</td>
            <td>${measurements.ظهر}</td>
            <td>${measurements.رقبة}</td>
            <td><button class="size-select-btn" data-category="girls" data-size="${size}">اختر</button></td>
        `;
        girlsTable.appendChild(row);
    });
    
    // جدول الأطفال
    const kidsTable = document.getElementById('kids-sizes');
    kidsTable.innerHTML = '';
    
    Object.keys(measurementsDatabase.kids).forEach(size => {
        const measurements = measurementsDatabase.kids[size];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${size}</td>
            <td>${measurements.صدر}</td>
            <td>${measurements.ظهر}</td>
            <td>${measurements.رقبة}</td>
            <td><button class="size-select-btn" data-category="kids" data-size="${size}">اختر</button></td>
        `;
        kidsTable.appendChild(row);
    });
    
    // إضافة مستمعي الأحداث لأزرار الاختيار
    document.querySelectorAll('.size-select-btn').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            const size = this.dataset.size;
            
            // تحديث حالة التطبيق
            appState.currentCategory = category;
            appState.currentSize = size;
            appState.measurements = measurementsDatabase[category][size];
            
            // تحديث واجهة المستخدم
            updateCategoryDisplay();
            updateMeasurementsTable();
            
            // تحديث أزرار الفئة النشطة
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                }
            });
            
            // رسم النموذج الجديد
            drawPattern();
            
            // إغلاق النافذة
            closeAllPopups();
        });
    });
}

// فتح النافذة المنبثقة
function openPopup(popupId) {
    document.getElementById('popup-overlay').style.display = 'block';
    document.getElementById(popupId).style.display = 'block';
}

// إغلاق جميع النوافذ المنبثقة
function closeAllPopups() {
    document.getElementById('popup-overlay').style.display = 'none';
    document.querySelectorAll('.popup').forEach(popup => {
        popup.style.display = 'none';
    });
}

// اختيار الموديل
function selectModel(model) {
    appState.currentModel = model;
    drawPattern();
}

// رسم البترون
function drawPattern() {
    // مسح الرسم الحالي
    appState.svgCanvas.clear();
    
    // إعداد إعدادات الرسم
    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // تحديد نوع الرسم بناءً على الموديل المختار
    switch(appState.currentModel) {
        case 'jacket':
            drawJacketPattern(centerX, centerY);
            break;
        case 'pants':
            drawPantsPattern(centerX, centerY);
            break;
        case 'skirt':
            drawSkirtPattern(centerX, centerY);
            break;
        case 'shirt':
            drawShirtPattern(centerX, centerY);
            break;
        case 'blouse':
            drawBlousePattern(centerX, centerY);
            break;
        default:
            drawJacketPattern(centerX, centerY);
    }
}

// رسم بترون الجاكيت/البالطو
function drawJacketPattern(centerX, centerY) {
    const measurements = appState.measurements;
    
    // القياسات الأساسية
    const bust = measurements.صدر || 88;
    const backLength = measurements.ظهر || 40;
    const neckCirc = measurements.رقبة || 36;
    
    // الحسابات الرياضية
    const armholeDepth = calculateArmholeValue(backLength);
    const neckWidth = calculateNeckValue(neckCirc);
    const pieceWidth = calculateWidthValue(bust, 2);
    
    // رسم المستطيل الأساسي
    const rectX = centerX - pieceWidth * 2;
    const rectY = centerY - backLength / 2;
    const rectWidth = pieceWidth * 4;
    const rectHeight = backLength;
    
    const baseRect = appState.svgCanvas.rect(rectWidth, rectHeight)
        .move(rectX, rectY)
        .fill('none')
        .stroke({ width: 2, color: '#333' });
    
    // تحديد النقاط الأساسية
    const pointA = { x: rectX, y: rectY };
    const pointB = { x: rectX + rectWidth, y: rectY };
    const pointS = { x: rectX + rectWidth / 2, y: rectY + rectHeight };
    const pointD = { x: rectX + rectWidth / 2, y: rectY };
    
    // رسم خط الإبط
    const armholeY = rectY + armholeDepth;
    const armholeLine = appState.svgCanvas.line(rectX, armholeY, rectX + rectWidth, armholeY)
        .stroke({ width: 1, color: '#e74c3c', dasharray: '5,5' });
    
    // رسم ميل الكتف
    const shoulderSlope = 15; // زاوية ميل الكتف
    const shoulderLine = appState.svgCanvas.line(
        rectX + neckWidth, rectY,
        rectX + rectWidth / 2 - 10, rectY + shoulderSlope
    ).stroke({ width: 2, color: '#3498db' });
    
    // إضافة تسميات النقاط
    drawPointLabel(pointA.x - 15, pointA.y - 10, 'أ');
    drawPointLabel(pointB.x + 15, pointB.y - 10, 'ب');
    drawPointLabel(pointS.x, pointS.y + 20, 'س');
    drawPointLabel(pointD.x, pointD.y - 20, 'ص');
    
    // إضافة نص توضيحي
    appState.svgCanvas.text(`جاكيت / بالطو - المقاس ${appState.currentSize}`)
        .move(centerX - 100, rectY - 40)
        .font({ family: 'Tajawal', size: 16, weight: 'bold' })
        .fill('#2c3e50');
    
    // إضافة وسيلة إيضاح
    addLegend(centerX + 200, rectY);
}

// رسم بترون البنطلون
function drawPantsPattern(centerX, centerY) {
    const measurements = appState.measurements;
    
    // القياسات الأساسية
    const waist = measurements.وسط || 70;
    const hip = measurements.صدر || 88; // استخدام الصدر كبديل للورك
    
    // رسم شبكة البنطلون
    const gridSize = 30;
    const gridWidth = Math.floor(hip / 4) * 2;
    const gridHeight = 100;
    
    const gridX = centerX - gridWidth / 2;
    const gridY = centerY - gridHeight / 2;
    
    // رسم خط الحجر
    const crotchLineY = gridY + 30;
    const crotchLine = appState.svgCanvas.line(gridX, crotchLineY, gridX + gridWidth, crotchLineY)
        .stroke({ width: 2, color: '#e74c3c' });
    
    // رسم خط الركبة
    const kneeLineY = gridY + 60;
    const kneeLine = appState.svgCanvas.line(gridX, kneeLineY, gridX + gridWidth, kneeLineY)
        .stroke({ width: 2, color: '#3498db' });
    
    // رسم الطول الكلي
    const totalLengthY = gridY + gridHeight;
    const totalLengthLine = appState.svgCanvas.line(gridX, totalLengthY, gridX + gridWidth, totalLengthY)
        .stroke({ width: 2, color: '#2ecc71' });
    
    // إضافة تسميات
    drawPointLabel(gridX - 15, crotchLineY, 'خط الحجر');
    drawPointLabel(gridX - 15, kneeLineY, 'خط الركبة');
    drawPointLabel(gridX - 15, totalLengthY, 'الطول الكلي');
    
    // إضافة نص توضيحي
    appState.svgCanvas.text(`بنطلون - المقاس ${appState.currentSize}`)
        .move(centerX - 80, gridY - 40)
        .font({ family: 'Tajawal', size: 16, weight: 'bold' })
        .fill('#2c3e50');
    
    // رسم الشبكة
    drawGrid(gridX, gridY, gridWidth, gridHeight, gridSize);
}

// رسم بترون التنورة
function drawSkirtPattern(centerX, centerY) {
    // رسم بترون التنورة الأساسي مع البنسات
    const radius = 80;
    
    // رسم الدائرة الأساسية
    const baseCircle = appState.svgCanvas.circle(radius * 2)
        .move(centerX - radius, centerY - radius)
        .fill('none')
        .stroke({ width: 2, color: '#333' });
    
    // رسم البنسات
    const dartCount = 4;
    const dartLength = 15;
    
    for (let i = 0; i < dartCount; i++) {
        const angle = (i * 360 / dartCount) * Math.PI / 180;
        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        const endX = centerX + Math.cos(angle) * (radius - dartLength);
        const endY = centerY + Math.sin(angle) * (radius - dartLength);
        
        const dart = appState.svgCanvas.line(startX, startY, endX, endY)
            .stroke({ width: 2, color: '#e74c3c' });
    }
    
    // إضافة نص توضيحي
    appState.svgCanvas.text(`تنورة (جيبة) - المقاس ${appState.currentSize}`)
        .move(centerX - 100, centerY - radius - 40)
        .font({ family: 'Tajawal', size: 16, weight: 'bold' })
        .fill('#2c3e50');
}

// رسم بترون القميص
function drawShirtPattern(centerX, centerY) {
    // رسم قميص رجالي مع حساب مقدار المرد والياقة
    const width = 120;
    const height = 150;
    
    const shirtX = centerX - width / 2;
    const shirtY = centerY - height / 2;
    
    // رسم الشكل الأساسي
    const shirtShape = appState.svgCanvas.rect(width, height)
        .move(shirtX, shirtY)
        .fill('none')
        .stroke({ width: 2, color: '#333' });
    
    // رسم الياقة
    const collarWidth = 15;
    const collarHeight = 10;
    
    const collar = appState.svgCanvas.rect(collarWidth, collarHeight)
        .move(shirtX + width / 2 - collarWidth / 2, shirtY - 5)
        .fill('#f1c40f')
        .stroke({ width: 1, color: '#333' });
    
    // رسم المرد
    const placketWidth = 5;
    const placketHeight = 40;
    
    const placket = appState.svgCanvas.rect(placketWidth, placketHeight)
        .move(shirtX + width / 2 - placketWidth / 2, shirtY + 20)
        .fill('#3498db')
        .stroke({ width: 1, color: '#333' });
    
    // إضافة نص توضيحي
    appState.svgCanvas.text(`قميص رجالي - المقاس ${appState.currentSize}`)
        .move(centerX - 80, shirtY - 40)
        .font({ family: 'Tajawal', size: 16, weight: 'bold' })
        .fill('#2c3e50');
    
    // إضافة تسمية المرد والياقة
    drawPointLabel(shirtX + width / 2, shirtY - 10, 'الياقة');
    drawPointLabel(shirtX + width / 2, shirtY + 40, 'المرد');
}

// رسم بترون البلوزة
function drawBlousePattern(centerX, centerY) {
    // رسم الكورساج الحريمي مع بنسة الصدر
    const width = 100;
    const height = 120;
    
    const blouseX = centerX - width / 2;
    const blouseY = centerY - height / 2;
    
    // رسم الشكل الأساسي
    const blouseShape = appState.svgCanvas.rect(width, height)
        .move(blouseX, blouseY)
        .fill('none')
        .stroke({ width: 2, color: '#333' });
    
    // رسم بنسة الصدر
    const dartX = blouseX + width / 2;
    const dartY = blouseY + 40;
    const dartLength = 15;
    
    const dart = appState.svgCanvas.line(dartX, dartY, dartX, dartY + dartLength)
        .stroke({ width: 3, color: '#e74c3c' });
    
    // إضافة نص توضيحي
    appState.svgCanvas.text(`بلوزة - المقاس ${appState.currentSize}`)
        .move(centerX - 60, blouseY - 40)
        .font({ family: 'Tajawal', size: 16, weight: 'bold' })
        .fill('#2c3e50');
    
    // إضافة تسمية بنسة الصدر
    drawPointLabel(dartX + 15, dartY + dartLength / 2, 'بنسة الصدر');
}

// رسم تسمية النقطة
function drawPointLabel(x, y, text) {
    appState.svgCanvas.text(text)
        .move(x, y)
        .font({ family: 'Tajawal', size: 14, weight: 'bold' })
        .fill('#e74c3c');
}

// إضافة وسيلة إيضاح
function addLegend(x, y) {
    const legend = appState.svgCanvas.group();
    
    const items = [
        { color: '#333', label: 'الخطوط الأساسية' },
        { color: '#e74c3c', label: 'خط الإبط' },
        { color: '#3498db', label: 'ميل الكتف' },
        { color: '#2ecc71', label: 'خط الطول' }
    ];
    
    items.forEach((item, index) => {
        // رسم عينة اللون
        legend.rect(15, 15)
            .move(x, y + index * 25)
            .fill(item.color);
        
        // إضافة النص
        legend.text(item.label)
            .move(x + 20, y + index * 25)
            .font({ family: 'Tajawal', size: 12 })
            .fill('#333');
    });
}

// رسم الشبكة
function drawGrid(x, y, width, height, size) {
    // الخطوط الأفقية
    for (let i = 0; i <= height; i += size) {
        appState.svgCanvas.line(x, y + i, x + width, y + i)
            .stroke({ width: 0.5, color: '#ddd' });
    }
    
    // الخطوط الرأسية
    for (let i = 0; i <= width; i += size) {
        appState.svgCanvas.line(x + i, y, x + i, y + height)
            .stroke({ width: 0.5, color: '#ddd' });
    }
}

// الدوال الرياضية المطلوبة
function calculateArmholeValue(backLen) {
    return (backLen / 2) + 4;
}

function calculateNeckValue(neckCirc) {
    return (neckCirc / 5) + 1;
}

function calculateWidthValue(bust, extra) {
    return (bust / 4) + extra;
}

// أدوات التحكم في العرض
function zoomIn() {
    appState.zoomLevel *= 1.2;
    updateZoom();
}

function zoomOut() {
    appState.zoomLevel /= 1.2;
    updateZoom();
}

function resetView() {
    appState.zoomLevel = 1.0;
    updateZoom();
}

function updateZoom() {
    appState.svgCanvas.scale(appState.zoomLevel);
}

// تصدير SVG
function exportSVG() {
    const svgElement = document.querySelector('#drawing-viewport svg');
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    
    // إضافة تعريف XML
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const svgBlob = new Blob([preface + source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // إنشاء رابط للتحميل
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `باترون_${appState.currentCategory}_${appState.currentSize}_${appState.currentModel}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// تحديث القياس
function updateMeasurement(key, value) {
    appState.measurements[key] = value;
    drawPattern();
}

// الحسابات الرياضية التفاعلية
function calculateArmhole() {
    const backLen = parseFloat(document.getElementById('back-length-input').value);
    if (isNaN(backLen)) {
        alert('الرجاء إدخال قيمة صحيحة لطول الظهر');
        return;
    }
    
    const result = calculateArmholeValue(backLen);
    document.getElementById('armhole-result').textContent = `فتحة الإبط = ${result.toFixed(1)} سم`;
}

function calculateNeck() {
    const neckCirc = parseFloat(document.getElementById('neck-circ-input').value);
    if (isNaN(neckCirc)) {
        alert('الرجاء إدخال قيمة صحيحة لمحيط الرقبة');
        return;
    }
    
    const result = calculateNeckValue(neckCirc);
    document.getElementById('neck-result').textContent = `عرض الرقبة = ${result.toFixed(1)} سم`;
}

function calculateWidth() {
    const bust = parseFloat(document.getElementById('bust-input').value);
    const extra = parseFloat(document.getElementById('extra-input').value);
    
    if (isNaN(bust) || isNaN(extra)) {
        alert('الرجاء إدخال قيم صحيحة');
        return;
    }
    
    const result = calculateWidthValue(bust, extra);
    document.getElementById('width-result').textContent = `عرض القطعة = ${result.toFixed(1)} سم`;
}

// تهيئة الحسابات باستخدام القيم الحالية
function initializeCalculations() {
    const measurements = appState.measurements;
    
    if (measurements.ظهر) {
        document.getElementById('back-length-input').value = measurements.ظهر;
        calculateArmhole();
    }
    
    if (measurements.رقبة) {
        document.getElementById('neck-circ-input').value = measurements.رقبة;
        calculateNeck();
    }
    
    if (measurements.صدر) {
        document.getElementById('bust-input').value = measurements.صدر;
        calculateWidth();
    }
}

// إضافة مستمعي الأحداث للحسابات عند فتح النافذة
document.getElementById('calculations-popup-btn').addEventListener('click', initializeCalculations);
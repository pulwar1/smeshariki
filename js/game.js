let scene = new THREE.Scene();
scene.background = new THREE.Color(0x6a6a6a); // светлый серый фон
// Устанавливаем камеру дальше, чтобы сфера была ближе к центру и цифры располагались ровно по шарика
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7; // чуть дальше
camera.lookAt(0,0,0);

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
let sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xf0f0f0 }); // светлый серо-белый цвет
let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Плоскость с текстом, которая всегда обращена к камере
let textPlane = null;

let light = new THREE.PointLight(0xffffff, 1.1);
light.position.set(10, 10, 10);
scene.add(light);

// Центруем текст на текстуре точнее (двигаем его чуть выше)
let numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
let colors = [0xffb3b3, 0xb3ffb3, 0xb3d1ff, 0xffffb3, 0xffb3ff, 0xb3ffff];
let lastColorIdx = null, lastNumberIdx = null;
let changeInterval = 1200; // медленнее

let textCanvas = document.createElement('canvas');
textCanvas.width = 256;
textCanvas.height = 256;
let ctx = textCanvas.getContext('2d');

let isColorChanged = false;
let times = [];
let good = 0, bad = 0;

let gameActive = true;
let startTime = Date.now();
let gameStartTime = Date.now();
let gameDuration = 20000; // 20 секунд

// Таймер обратного отсчета
let timerElement = document.getElementById('timer');
let timerInterval = setInterval(() => {
  if (!gameActive) {
    clearInterval(timerInterval);
    return;
  }
  let elapsed = Date.now() - gameStartTime;
  let remaining = Math.max(0, Math.ceil((gameDuration - elapsed) / 1000));
  timerElement.textContent = remaining;
  if (remaining === 0) {
    clearInterval(timerInterval);
  }
}, 100);

let notif = document.createElement('div');
notif.style.position = 'absolute';
notif.style.top = '50%';
notif.style.left = '50%';
notif.style.transform = 'translate(-50%,-220px)';
notif.style.background = 'rgba(30,30,30,0.86)';
notif.style.color = '#fff';
notif.style.fontSize = '36px';
notif.style.padding = '15px 50px';
notif.style.borderRadius = '16px';
notif.style.zIndex = 13;
notif.style.display = 'none';
document.body.appendChild(notif);

function showNotif(msg, color = '#fff') {
  notif.textContent = msg;
  notif.style.color = color;
  notif.style.display = 'block';
  setTimeout(() => { notif.style.display = 'none'; }, 700);
}

// Функция для воспроизведения звука фейла "Wha wha wha" из MP3 файла
function playFailSound() {
  try {
    let failSound = document.getElementById('failSound');
    if (failSound) {
      failSound.currentTime = 0; // Сбрасываем на начало
      failSound.play().catch(e => {
        // Игнорируем ошибки автовоспроизведения (браузер может блокировать)
        console.log('Audio play failed:', e);
      });
    }
  } catch (e) {
    console.log('Audio not supported:', e);
  }
}

function updateSphere(number, color) {
  // Создаем текстуру с цифрой
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // прозрачный фон
  ctx.fillRect(0, 0, 256, 256);
  
  // Увеличиваем размер шрифта для 80% от шарика (шарик диаметр 2, 80% = 1.6)
  ctx.font = 'bold 120px Arial';
  
  // Применяем цвет к цифре
  let colorHex = '#' + color.toString(16).padStart(6, '0');
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, 128, 128);
  
  let texture = new THREE.CanvasTexture(textCanvas);
  texture.needsUpdate = true;
  
  // Цвет сферы остается светлым, не меняется
  // sphere.material.color.setHex(0xf0f0f0); // оставляем светлый цвет
  
  // Создаем или обновляем плоскость с текстом на поверхности сферы
  if (textPlane) {
    scene.remove(textPlane);
    textPlane.material.dispose();
    textPlane.geometry.dispose();
  }
  
  // Размер плоскости 80% от диаметра шарика (2 * 0.8 = 1.6)
  let planeSize = 1.6;
  let planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
  let planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false, // всегда рендерится поверх других объектов
    depthWrite: false // не записывает в буфер глубины
  });
  textPlane = new THREE.Mesh(planeGeometry, planeMaterial);
  textPlane.renderOrder = 999; // рендерится последним
  // Размещаем плоскость на поверхности сферы (достаточно далеко, чтобы не уходить внутрь)
  textPlane.position.copy(sphere.position);
  textPlane.position.z = sphere.position.z + 1.15; // увеличили расстояние от поверхности
  scene.add(textPlane);
}

function nextStep() {
  if (!gameActive) return;
  let numberIdx = Math.floor(Math.random() * numbers.length);
  let colorIdx = Math.floor(Math.random() * colors.length);
  let changeColor = Math.random() < 0.5;
  if (changeColor) {
    while (colorIdx === lastColorIdx) colorIdx = Math.floor(Math.random() * colors.length);
    isColorChanged = true;
  } else {
    colorIdx = lastColorIdx !== null ? lastColorIdx : colorIdx;
    isColorChanged = false;
  }
  while (numberIdx === lastNumberIdx) numberIdx = Math.floor(Math.random() * numbers.length);
  updateSphere(numbers[numberIdx], colors[colorIdx]);
  lastColorIdx = colorIdx;
  lastNumberIdx = numberIdx;
}

setInterval(() => {
  if (!gameActive) return;
  nextStep();
}, changeInterval);

function endGame() {
  gameActive = false;
  clearInterval(timerInterval);
  notif.style.display = 'none';
  timerElement.textContent = '0';
  let avgReaction = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) : '-';
  let resultDiv = document.getElementById('results');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <b>Результаты</b><br>
    Средняя реакция: <b>${avgReaction}</b> мс<br>
    Верных нажатий: <b>${good}</b><br>
    Ошибок: <b>${bad}</b>
    <br><br>Обновите страницу, чтобы сыграть ещё раз
  `;
}

window.addEventListener('keydown', (e) => {
  if (!gameActive) return;
  if (e.code === 'Space') {
    if (isColorChanged) {
      let reactionTime = Date.now() - startTime;
      times.push(reactionTime);
      good++;
      showNotif('Отлично!', '#5fff5f');
      startTime = Date.now();
    } else {
      bad++;
      showNotif('Ошибка!', '#ff4f5f');
      playFailSound(); // Воспроизводим звук фейла
    }
    nextStep();
  }
});

// Для движения по всему экрану вычисляем максимальные координаты
function getMaxBounds() {
  let aspect = window.innerWidth / window.innerHeight;
  let vFOV = camera.fov * Math.PI / 180;
  let height = 2 * Math.tan(vFOV / 2) * camera.position.z;
  let width = height * aspect;
  return { width, height };
}

// Плавное непрерывное движение шарика
let velocityX = 0;
let velocityY = 0;
let currentX = 0;
let currentY = 0;
let speed = 0.015;
let changeDirectionInterval = 2000; // меняем направление каждые 2 секунды
let lastDirectionChange = Date.now();

function chooseNewDirection() {
  let bounds = getMaxBounds();
  let pad = 1.2;
  let maxX = (bounds.width - pad * 2) / 2;
  let maxY = (bounds.height - pad * 2) / 2;
  
  // Выбираем случайное направление
  let angle = Math.random() * Math.PI * 2;
  velocityX = Math.cos(angle) * speed;
  velocityY = Math.sin(angle) * speed;
  
  // Иногда меняем направление на противоположное, если близко к краю
  if (Math.abs(currentX) > maxX * 0.8) {
    velocityX = -Math.sign(currentX) * speed;
  }
  if (Math.abs(currentY) > maxY * 0.8) {
    velocityY = -Math.sign(currentY) * speed;
  }
}

chooseNewDirection();

function animate() {
  requestAnimationFrame(animate);
  
  // Непрерывное плавное движение
  let now = Date.now();
  if (now - lastDirectionChange > changeDirectionInterval) {
    chooseNewDirection();
    lastDirectionChange = now;
  }
  
  // Обновляем позицию
  currentX += velocityX;
  currentY += velocityY;
  
  // Ограничиваем движение границами экрана
  let bounds = getMaxBounds();
  let pad = 1.2;
  let maxX = (bounds.width - pad * 2) / 2;
  let maxY = (bounds.height - pad * 2) / 2;
  
  if (Math.abs(currentX) > maxX) {
    currentX = Math.sign(currentX) * maxX;
    velocityX = -velocityX; // отскок от края
  }
  if (Math.abs(currentY) > maxY) {
    currentY = Math.sign(currentY) * maxY;
    velocityY = -velocityY; // отскок от края
  }
  
  sphere.position.x = currentX;
  sphere.position.y = currentY;
  
  // Сфера не вращается - rotation остается (0, 0, 0)
  sphere.rotation.set(0, 0, 0);
  
  // Плоскость с текстом всегда обращена к камере и следует за сферой
  if (textPlane) {
    textPlane.position.x = sphere.position.x;
    textPlane.position.y = sphere.position.y;
    textPlane.position.z = sphere.position.z + 1.15; // увеличили расстояние от поверхности
    textPlane.lookAt(camera.position);
  }
  
  renderer.render(scene, camera);
}
animate();

nextStep();
setTimeout(endGame, 20_000);

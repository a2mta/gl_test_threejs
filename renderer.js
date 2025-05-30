//
//i dont know why, but i was constanlty thinking about postal 2 game menu, so i decided to make the scene a bit alike
//
import * as THREE from 'three';
const font = new FontFace('Smash', 'url(./Smash.ttf)', {
  style: 'normal',
  weight: 'normal',
});
document.fonts.add(font);
font.load();
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const loader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const CAMERA_TRAVEL_RADIUS = 5;
const LINE_HEIGHT_RATIO = 1.15;

const CAMERA_TRAVEL_SPEED = 0.3;
const AMOUNT_OF_PLANES = 4;
let precomputedWordBoxes = [];
const planesArray = [];
const text =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

//temp canvas to draw text on
let textCanvas;
let textCanvasContext;
textCanvas = document.createElement('canvas');
textCanvasContext = textCanvas.getContext('2d');
textCanvas.width = 256;
textCanvas.height = 256;
textCanvasContext.textAlign = 'center';
textCanvasContext.textBaseline = 'middle';
//

const bgTexture = loader.load('./fireball.jpg');
bgTexture.colorSpace = THREE.SRGBColorSpace;

// Create a large sphere for the background
const sphereGeometry = new THREE.SphereGeometry(20, 64, 64);
bgTexture.wrapS = THREE.RepeatWrapping;
bgTexture.wrapT = THREE.RepeatWrapping;
bgTexture.repeat.set(8, 4); // Repeat the fireball texture
const sphereMaterial = new THREE.MeshBasicMaterial({
  map: bgTexture,
  side: THREE.BackSide, // Render inside of sphere
});
const backgroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(backgroundSphere);

// Raycaster mouseover detection
const spawnRaycaster = (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(
    planesArray.map((plane) => plane.planeMesh)
  );

  if (intersects.length === 1) {
    const {
      uv,
      object: { userData },
    } = intersects[0];
    if (uv) {
      const canvasX = uv.x * textCanvas.width;
      const canvasY = (1 - uv.y) * textCanvas.height;
      let found = -1;
      const wordBoxes = planesArray[userData.planeId].wordBoxes;
      for (let i = 0; i < wordBoxes.length; i++) {
        const box = wordBoxes[i];
        if (
          canvasX >= box.x &&
          canvasX <= box.x + box.width &&
          canvasY >= box.y &&
          canvasY <= box.y + box.height
        ) {
          found = box.idx;
          break;
        }
      }
      drawText(found, userData.planeId);
    }
  }
};

// calculate optimal font size and dipsense text into lines
/**
 * Calculates the optimal font size for a given text to fit within specified dimensions.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {string} text - The text to measure.
 * @param {number} maxWidth - The maximum width allowed for the text.
 * @param {number} maxHeight - The maximum height allowed for the text.
 * @param {number} minFont - The minimum font size to use.
 * @param {number} maxFont - The maximum font size to use.
 * @param {number} lineHeightRatio - The ratio of line height to font size.
 * @returns {{fontSize: number, lines: string[]}} - The optimal font size and the lines of text.
 */
const getOptimalFontSize = (
  context,
  text,
  maxWidth,
  maxHeight,
  minFont = 10,
  maxFont = 40,
  lineHeightRatio = 1.15
) => {
  let fontSize = maxFont;
  let fits = false;
  let lines = [];
  let totalHeight = 0;
  // check what is the maximum font size we can fit
  while (fontSize >= minFont && !fits) {
    context.font = fontSize + 'px Smash';

    const words = text.split(' ');
    let line = '';
    lines = [];
    //trying to determine how many words can be fitted in one line and push it to lines array
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    totalHeight = lines.length * fontSize * lineHeightRatio;
    // check if total height of lines fits in maxHeight
    if (totalHeight <= maxHeight) {
      fits = true;
    } else {
      fontSize -= 1;
    }
  }
  return { fontSize, lines, totalHeight };
};

const wrapTextAndTrackWords = (context, x, y, maxWidth, maxHeight) => {
  const { fontSize, lines, totalHeight } = getOptimalFontSize(
    context,
    text,
    maxWidth,
    maxHeight,
    10,
    40,
    LINE_HEIGHT_RATIO
  );
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  let allLineWords = lines.reduce(
    (acc, line) => [...acc, line.trim().split(' ').filter(Boolean)],
    []
  );
  let startY = y - totalHeight / 2 + lineHeight / 2;
  let wordIdx = 0;
  let wordBoxes = [];
  for (let i = 0; i < lines.length; i++) {
    let lineText = lines[i];
    let wordsInLine = allLineWords[i];
    let lineWidth = context.measureText(lineText).width;
    let startX = x - lineWidth / 2;
    let currX = startX;
    for (let j = 0; j < wordsInLine.length; j++) {
      let word = wordsInLine[j];
      let wordWidth = context.measureText(word + ' ').width;
      wordBoxes.push({
        x: currX,
        y: startY + i * lineHeight - lineHeight / 2,
        width: wordWidth,
        height: lineHeight,
        idx: wordIdx,
      });
      currX += wordWidth;
      wordIdx++;
    }
  }
  return wordBoxes;
};

const drawText = (highlightIdx = -1, planeId = -1) => {
  textCanvasContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
  textCanvasContext.fillStyle = '#ffffff';
  textCanvasContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
  const { fontSize, lines, totalHeight } = getOptimalFontSize(
    textCanvasContext,
    text,
    textCanvas.width * 0.9,
    textCanvas.height * 0.9,
    10,
    40,
    LINE_HEIGHT_RATIO
  );
  textCanvasContext.font = fontSize + 'px Smash';
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  let allLineWords = lines.reduce(
    (acc, line) => [...acc, line.trim().split(' ').filter(Boolean)],
    []
  );
  let startY = textCanvas.height / 2 - totalHeight / 2 + lineHeight / 2;
  let wordIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    let lineText = lines[i];
    let wordsInLine = allLineWords[i];
    let lineWidth = textCanvasContext.measureText(lineText).width;
    let startX = textCanvas.width / 2 - lineWidth / 2;
    let currX = startX;
    for (let j = 0; j < wordsInLine.length; j++) {
      let word = wordsInLine[j];
      let wordWidth = textCanvasContext.measureText(word + ' ').width;
      if (wordIdx === highlightIdx) {
        textCanvasContext.save();
        textCanvasContext.fillStyle = 'red';
        textCanvasContext.fillRect(
          currX,
          startY + i * lineHeight - lineHeight / 2,
          wordWidth,
          lineHeight
        );
        textCanvasContext.restore();
      }
      textCanvasContext.fillStyle = '#000000';
      textCanvasContext.fillText(
        word,
        currX + wordWidth / 2,
        startY + i * lineHeight,
        wordWidth
      );
      currX += wordWidth;
      wordIdx++;
    }
  }
  if (planeId !== -1) {
    planesArray[planeId].texture.needsUpdate = true;
  }
};

document.fonts.ready.then(() => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.z = 5;

  for (let i = 0; i < AMOUNT_OF_PLANES; i++) {
    const texture = new THREE.CanvasTexture(textCanvas);
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.position.set(i * 2 - 3 + i * 0.2, 0, 0); // Spread planes along x-axis
    planeMesh.rotation.x = Math.PI / Math.random(0, 0.5); // Rotate to face the camera
    planeMesh.rotation.y = Math.PI / Math.random(0, 0.5); // Rotate to face the camera
    planeMesh.userData.planeId = i;
    planesArray.push({
      planeMesh,
      wordBoxes: {},
      texture,
    });
  }
  scene.add(...planesArray.map(({ planeMesh }) => planeMesh));

  precomputedWordBoxes = wrapTextAndTrackWords(
    textCanvasContext,
    textCanvas.width / 2,
    textCanvas.height / 2,
    textCanvas.width * 0.9,
    textCanvas.height * 0.9
  );
  for (let i = 0; i < AMOUNT_OF_PLANES; i++) {
    planesArray[i].wordBoxes = precomputedWordBoxes;
  }

  drawText();
  window.addEventListener('mousemove', spawnRaycaster);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
const animate = () => {
  const time = performance.now() * 0.001 * CAMERA_TRAVEL_SPEED;
  camera.position.x = Math.cos(time) * CAMERA_TRAVEL_RADIUS;
  camera.position.y = -Math.sin(time) * CAMERA_TRAVEL_RADIUS * 0.5; // Add vertical movement
  camera.position.z = Math.sin(time) * CAMERA_TRAVEL_RADIUS;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
};
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

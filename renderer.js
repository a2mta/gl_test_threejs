import * as THREE from 'three';
const text =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const textCanvas = document.createElement('canvas');
const ctx = textCanvas.getContext('2d');
textCanvas.width = 256;
textCanvas.height = 256;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const AMOUNT_OF_PLANES = 4;
let hoveredWordIdx = -1;

const planesArray = [];

for (let i = 0; i < AMOUNT_OF_PLANES; i++) {
  const texture = new THREE.CanvasTexture(textCanvas);
  const planeGeometry = new THREE.PlaneGeometry(2, 2);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  planeMesh.position.set(i * 2 - 3 + i * 0.2, 0, 0); // Spread planes along x-axis
  planeMesh.userData['planeId'] = i;
  planesArray.push({
    planeMesh,
    planeId: i,
    wordBoxes: {},
    hoveredWordIdx: -1,
    texture,
  });
}
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(...planesArray.map(({ planeMesh }) => planeMesh));

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
function getOptimalFontSize(
  context,
  text,
  maxWidth,
  maxHeight,
  minFont = 10,
  maxFont = 40,
  lineHeightRatio = 1.15
) {
  let fontSize = maxFont;
  let fits = false;
  let lines = [];
  let totalHeight = 0;
  // check what is the maximum font size we can fit
  while (fontSize >= minFont && !fits) {
    context.font = fontSize + 'px Arial';

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
}

function wrapTextAndTrackWords(
  context,
  x,
  y,
  maxWidth,
  maxHeight,
  highlightIdx = -1,
  planeIdx = -1
) {
  const lineHeightRatio = 1.15;
  const { fontSize, lines, totalHeight } = getOptimalFontSize(
    context,
    text,
    maxWidth,
    maxHeight,
    10,
    40,
    lineHeightRatio
  );
  const lineHeight = fontSize * lineHeightRatio;
  // Split words for bounding boxes
  let allLineWords = lines.reduce(
    (acc, line) => [...acc, line.trim().split(' ').filter(Boolean)],
    []
  );
  // Center vertically
  let startY = y - totalHeight / 2 + lineHeight / 2;
  let wordIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    let lineText = lines[i];
    let wordsInLine = allLineWords[i];
    let lineWidth = context.measureText(lineText).width;
    let startX = x - lineWidth / 2;
    let currX = startX;
    for (let j = 0; j < wordsInLine.length; j++) {
      let word = wordsInLine[j];
      let wordWidth = context.measureText(word + ' ').width;
      if (wordIdx === highlightIdx) {
        context.save();
        context.fillStyle = '#ffff00';
        context.fillRect(
          currX,
          startY + i * lineHeight - lineHeight / 2,
          wordWidth,
          lineHeight
        );
        context.restore();
      }
      context.fillStyle = '#000000';
      context.fillText(
        word,
        currX + wordWidth / 2,
        startY + i * lineHeight,
        wordWidth
      );
      if (planeIdx === -1) {
        for (let k = 0; k < AMOUNT_OF_PLANES; k++) {
          planesArray[k].wordBoxes[currX + startY] = {
            x: currX,
            y: startY + i * lineHeight - lineHeight / 2,
            width: wordWidth,
            height: lineHeight,
            idx: wordIdx,
          };
          //   planesArray[k].wordBoxes.push();
        }
      }
      currX += wordWidth;
      wordIdx++;
    }
  }
}

const drawText = (highlightIdx = -1, planeId = -1) => {
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  //since the text and the sizes of the planes are same, we can use the result of text wrapping function for all planes
  wrapTextAndTrackWords(
    ctx,
    textCanvas.width / 2,
    textCanvas.height / 2,
    textCanvas.width * 0.9,
    textCanvas.height * 0.9,
    highlightIdx,
    planeId
  );
  if (planeId !== -1) {
    planesArray[planeId].texture.needsUpdate = true;
  }
};
drawText();

// Raycaster mouseover detection
const spawnRaycaster = (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(
    planesArray.map((plane) => plane.planeMesh)
  );
  if (intersects.length > 0) {
    // Get intersection point in plane local space
    const {
      uv,
      object: { userData },
    } = intersects[0];
    if (uv) {
      // Convert uv (0-1) to canvas coordinates
      const canvasX = uv.x * textCanvas.width;
      const canvasY = (1 - uv.y) * textCanvas.height;
      // Find hovered word
      let found = -1;
      const wordBoxes = planesArray[userData.planeId].wordBoxes;
      console.log(wordBoxes);

      //   console.log(wordBoxes);
      for (let i = 0; i < Object.values(wordBoxes).length; i++) {
        const box = Object.values(wordBoxes)[i];
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
      if (found !== hoveredWordIdx) {
        hoveredWordIdx = found;
        drawText(hoveredWordIdx, userData.planeId);
      }
    }
  } else {
    if (hoveredWordIdx !== -1) {
      hoveredWordIdx = -1;
      drawText();
    }
  }
};

window.addEventListener('mousemove', spawnRaycaster);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const animate = () => {
  renderer.render(scene, camera);
};
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

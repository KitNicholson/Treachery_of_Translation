// key info

let versionNum = '1.1.1 Graphic Score';
let fileName = 'Adagio for Strings';
let filetype = '.mp3';
let artistName = 'Samuel Barber';

// 'Requiem Lacrimosa' - 'Wolfgang Amadeus Mozart'
//  colours: spec 225, 375,  line (350, 100, 80)

// 'Moonlight Sonata' - '.mp3'- 'Ludwig van Beethoven'
//  colours: spec 260, 110,  line (165, 100, 80)

// 'Adagio for Strings' - 'mp3' - 'Samuel Barber'
//  colours: spec 300, 450,  line (37, 100, 80)

// 'Recorded Performance' - '.WAV' -
//  colours: spec 200, 50,  line (68, 100, 80) 

// states
let isListening = false;
let isThinking = false;
let reset = false;

let memoryTime;

let recordingMemory = false;
let recordingMelody = false;

let memoryTrigger;
let maxTriggerWait = 6; // must be less than 60

let keyMemoryIndex = 0;
let keyMemoryIsPlaying = false;

let stopAll = false;
let runCode = false;

let screenFormat;

// display variables

//let scale = 2.2; // for print
let scale = 1;

let edgeOffset = 0;
//let memorySpecHeight = 100; // screen size
// let memorySpecHeight = 1200; // print size A1
//let memorySpecHeight = 440; // print size A4
let memorySpecHeight;

let lineSpacing;

let y = 0;
let x = 0;
let yOrigin = 0;
let xOrigin = 0;

// let xIncriment = 1; // screen size
// let xIncriment = 60; // 35 for landscape // print size
//let xIncriment = 3.6; // print size A4 // the slower (smaller) it is the more lines and less dots there will be
let xIncriment = 17.424;

let markerWidth = 2;
let markerSpacing = 5;

let prevKeyfileTime = 0;

let textBoxHeight;
let keySpecHeight;

let fretqwikc;
let authorReg;

// sound variables
let fft;
let amp;
let prevAmp; // amp from the previous frame

let keySoundFile;
let keyFileDuration = 45; // try to keep keFileDuration 4* longer than maxMemoryDuration

let mRecorder;
let memories = [];
let maxMemories = 100;
let maxMemoryDuration = 9; // must be less than 60

// misc

let runTime = 0; // how long the functions have been running for since starting;

let bins = 1024;

let prevNotePoint = [];
let prevNoteIsLine = false

let minLength;

// ================ Setup Functions ================ //

function preload() {
  let fullFileName = 'Classical_Sound_Files/' + fileName + filetype;
  keySoundFile = loadSound(fullFileName, soundIsReady(fileName));

  fretqwikc = loadFont('Fonts/Fretqwikc-nA71.ttf');
  authorReg = loadFont('Fonts/Author-Regular.otf');

}

function setup() {

  console.log(versionNum);

  createCanvas(windowWidth-1, windowHeight-1); // full screen
  //createCanvas(2480 * scale, 3508 * scale); // A4 @300 dpi
  frameRate(60);
  colorMode(HSB);
  background(0);

  //console.log("width " + width + "height " + height);

  // set up display variables
  textBoxHeight = height/14;
  keySpecHeight = height/3;

  memorySpecHeight = height/7.97;
  lineSpacing = memorySpecHeight/4;

  // select screen format
  if (width > height) {
    screenFormat = 'LANDSCAPE';
    minLength = height;
    yOrigin = edgeOffset+memorySpecHeight;
  } else {
    screenFormat = 'PORTRAIT';
    minLength = width
    yOrigin = height*0+memorySpecHeight;
  }

  xIncriment = 1.2;
  y = yOrigin;
  x = xOrigin;

  // set up fft and amplitude
  fft = new p5.FFT(0.4, 1024);
  amp = new p5.Amplitude();

  // create the recorder for the canvas
  mRecorder = new p5.SoundRecorder();

  // create the soundfile to hold the canvas audio
  memories[0] = new p5.SoundFile();

  console.log(screenFormat);

}

function startups() {
  // functions that need to be called before the running draw()

  // start playing the key file
  keySoundFile.play(0,1,1,0, keyFileDuration);

  // set the first memory time
  setMemoryTime(keySoundFile);

  // set global state to listening
  isListening = true;
  //console.log('LISTENING TIME');
}

function thinkingStateStartup() {
  // set the first memory trigger
  setMemoryTrigger();

  // play the first key memory
  keyMemoryIndex = 0;
  memories[keyMemoryIndex].play();
  keyMemoryIsPlaying = true;
}

// ================ MAIN Functions ================ //

function draw() {

  keySoundFile.amp(0.8);

  if (!runCode) {

    fill(100);
    noStroke();

    textFont(authorReg);
    textAlign(CENTER);
    textSize(height*0.03);
    text("Click, tap, or press 'g' to generate a score", width/2, height*0.46);
    text("On a computer it can be downloaded by pressing ‘d’", width/2, height*0.54);

    return;
  }

  stateControl();

  // draw key sound file - style is dependant on screenformat
  if (screenFormat === 'LANDSCAPE') {
    drawSoundFilePlayback_H();
  } else {
    drawSoundFilePlayback_V();
  }

  drawMemoryTimeGaps();

  memoryControl();

  freeAssociations();

  progressiveThought();

  if (runCode) {
    incrimentRunTime();
    incrimentX();
    prevAmp = getAmp();
  }

}

// ================ Helper Functions ================ //

function stateControl() {
  if (isListening && !keySoundFile.isPlaying()) {
    console.log("THINKING TIME");
    isListening = false;
    isThinking = true;

    thinkingStateStartup();
  }
}

function resetCode() {
  
  console.log('RESET CODE');

  // reset states
  isListening = false;
  isThinking = false;

  recordingMemory = false;
  recordingMelody = false;

  prevKeyfileTime = 0;
  runTime = 0;
  // reset x and y positions
  x = xOrigin;
  y = yOrigin;

  //reset display variables
  prevNotePoint = [];
  prevNoteIsLine = false;
  
  // stop all currently active audio
  stopAllAudio();

  // reset memories
  keyMemoryIndex = 0; // also hapens in thinking state startup. This is backup
  memories = [];
  // create the soundfile to hold the canvas audio
  memories[0] = new p5.SoundFile();

  reset = true;
}

function stopAllAudio() {
  console.log('stop audio');

  keySoundFile.jump(0);
  keySoundFile.stop();

  for (let i=0; i<memories.length; i++) {
    memories[i].stop();
  }
}

function soundIsReady(name) {
  print(name + ' is loaded');
}

function incrimentRunTime() {
  runTime += deltaTime*0.001;
}

function incrimentX() {
  // incrimentents xOffset, 
  // when the edge of the page is reached a new line is added

  if (edgeOffset + x <= width-edgeOffset) {
    x += xIncriment;
    //console.log('going right');
  } else {
    x = edgeOffset;
    y += lineSpacing+memorySpecHeight;
    prevNotePoint = [x,y];
  }

}

function addInfoForPrintBASE() {
  // adds info to the page and stops all other functions

  textFont(fretqwikc);

  let boxHeight = height/15;

  stroke(0);
  strokeWeight(minLength/250);

  // draw the music name
  fill(100);
  textAlign(LEFT);
  textSize(boxHeight*0.65);
  //\text(fileName, 40, boxTop-100);
  text(fileName, width*0.01, height-boxHeight*0.63);

  // draw the original artists name, and the code version as the arranger.
  textFont(authorReg);

  textSize(boxHeight*0.33);
  text('Composed by: ' + artistName + ". Interpreted by code", width*0.01, height-boxHeight*0.22);
  //text('Performed by Kit Nicholson and Yong En', width*0.98, height-boxHeight*0.54);
}

function addInfoForPrintBaseRIght() {
  // adds info to the page and stops all other functions

  textFont(fretqwikc);

  let boxHeight = height/15;
  let boxTop = height - boxHeight;

  // draw background for the text box
  fill(100);
  //stroke(0);
  //strokeWeight(1);
  noStroke();
  //rect(-10, boxTop, width + 2*10, boxHeight+10);

  stroke(0);
  strokeWeight(minLength/250);

  // draw the music name
  fill(100);
  textAlign(RIGHT);
  textSize(boxHeight*0.65);
  //\text(fileName, 40, boxTop-100);
  text(fileName, width*0.99, height-boxHeight*0.63);

  // draw the original artists name, and the code version as the arranger.
  textFont(authorReg);

  textSize(boxHeight*0.33);
  text('Composed by: ' + artistName + ". Interpreted by code", width*0.99, height-boxHeight*0.22);
}

function addInfoForPrintTOP() {
  // adds info to the page and stops all other functions

  textFont(fretqwikc);

  let boxTop = height*0.02;
  let boxHeight = height*0.06

  // draw background for the text box
  // fill(100);
  stroke(0);
  strokeWeight(minLength/250);
  // noStroke();
  //rect(-edgeOffset, 0, width + 2*edgeOffset, boxHeight);

  noStroke();

  // draw the music name
  fill(100);
  textAlign(CENTER);
  textSize(boxHeight);
  text(fileName, width/2, boxTop*0.6 + boxHeight);

  textFont(authorReg);
  textAlign(RIGHT);
  textSize(boxHeight*0.35);
  text(artistName, width*0.99, boxTop + boxHeight*1.7);
  //text('Performed by Kit Nicholson and Yong En', width*0.99, boxTop + boxHeight*1.7);
  text('Interpreted by code', width*0.99, boxTop + boxHeight*2.05);
}

function euclidDist(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2))
}

function getAmp() {

  // draw amplitude below spectograph
  let level = amp.getLevel();
  return level;

}

function nonLinearMap(value, max, newMax) {
  // maps an value beteen o and max to between newMin newMax

  // map incoming value to between 0 and 1 using exponentials
  //let newValue = 1/(max**50) * (value**50);

  let newValue = ((-1/(max**6)) * ((value-max)**6)) + 1;

  newValue = newValue * newMax;

  return newValue;
}

function nonLinearMap2(value, max, newMax) {
  // maps an value beteen o and max to between newMin newMax

  // map incoming value to between 0 and 1 using exponentials
  //let newValue = 1/(max**50) * (value**50);

  let newValue = ((-1/(max**4)) * ((value-max)**4)) + 1;

  newValue = newValue * newMax;

  return newValue;
}

function findLoudestFreq() {

  let spectrum = fft.analyze();

  let loudestFreqVolume = 0;

  // find and save the loudest frequencey yet. If there is a tie, the highest freq wins
  for (let i=0; i<spectrum.length; i++) {
    if (spectrum[i] >= loudestFreqVolume) {
      loudestFreqIndex = i;
      loudestFreqVolume = spectrum[i];
    }
  }

  return loudestFreqIndex;
}

// ================ Sound Functions ================ //

// key sound file

function drawSoundFilePlayback_V() {
  // analyses the sound file when it is playing, and draws 
  // it as a spectogram on the left side of the screen

  if (keySoundFile.isPlaying()) {

    // move playhead down screen on left hand side

    let time = keySoundFile.currentTime()
    let mTime = map(time, 0, keyFileDuration, 0, height);

    // get the distance the keyfile travels
    let distance = height;
    // use the keyfile duration to find how long it takes to move one pixel
    let pixelPerSecond = distance / keyFileDuration;
    // found how long ago the last frame was
    let timeToCover = time - prevKeyfileTime;
    // use both ti figure out the optimal width
    let h = timeToCover * pixelPerSecond;

    if (reset) {
      h=0;

      if (mTime < 1) {
        reset = false;
      }
    }

    let spectrum = fft.analyze();

    let prevPixelData = [0,100,0,0] // hue, saturation, brighness, alpha

    noStroke();
    for (let i=0; i<spectrum.length; i++) {
      //let x = map(i, 0, spectrum.length, width/2, 0);
      let x = nonLinearMap2(i, spectrum.length, width/2);
      let quartX = nonLinearMap2(i-0.25, spectrum.length, width/2);
      let midX = nonLinearMap2(i-0.5, spectrum.length, width/2); // mid x is point betwen x and previous x position.
      let threeQuartx = nonLinearMap2(i-0.75, spectrum.length, width/2);

      let w1 =(width/1024) * 2; // default segment length
      let w2 =(width/1024);
      let w3 =(width/1024) / 2;
      let w4 =(width/1024) / 2;

      if (i>0) {
      // w1 = x - nonLinearMap2(i-1, spectrum.length, width/2); // to get the width of each segment (non linear)

      // w2 = x - midX;

      w1 = x - quartX; // to get the width of each segment (non linear)
      w2 = midX - threeQuartx;
      w3 = (quartX - midX) * 1;
      w4 = (threeQuartx - nonLinearMap2(i-1, spectrum.length, width/2)) * 1;
      } 

      // green = 124 
      // blue = 230
      // purple = 242 
      // red = 0 or 3604

      let hue = map(spectrum[i], 0, 255, 300, 450); // change these arguments to change the colour
      hue1 = hue % 360;

      let brightness = map(spectrum[i], 0,255, 0, 100);

      let alpha = map(spectrum[i], 0,255, 0, 1);

      fill(hue1, 100, brightness, alpha);
      rect(width/2-x, mTime, w1, -h); // draw pixel
      rect(width/2+x, mTime, w1, -h); // draw mirror of pixel

      // draw interpolated pixel, anb it's mirror image
      if (i>0) {

        let hue2f = prevPixelData[0] + (hue-prevPixelData[0])/2;
        hue2 = hue2f%360;
        let brightness2 = prevPixelData[2] + (brightness-prevPixelData[2])/2;
        let alpha2 = prevPixelData[3] + (alpha-prevPixelData[3])/2;

        fill(hue2, 100, brightness2, alpha2);
        rect(width/2-midX, mTime, w2, -h); // draw pixel
        rect(width/2+midX, mTime, w2, -h); // draw pixel

        // FAKE HI-RES
        // fill(0);
        // rect(width/2-quartX, mTime, w3, -h); // draw pixel
        // rect(width/2-threeQuartx, mTime, w4, -h); // draw pixel
        // rect(width/2+quartX, mTime, w3, -h); // draw pixel
        // rect(width/2+threeQuartx, mTime, w4, -h); // draw pixel

        // Real Hi-Res
        let hue3 = hue2f + (hue-hue2f)/2;
        hue3 = hue3%360;
        let brightness3 = brightness2 + (brightness-brightness2)/2;
        let alpha3 = alpha2 + (alpha-alpha2)/2;

        let hue4 = prevPixelData[0] + (hue2f-prevPixelData[0])/2;
        hue4 = hue4%360;
        let brightness4 = prevPixelData[2] + (brightness2-prevPixelData[2])/2;
        let alpha4 = prevPixelData[3] + (alpha2-prevPixelData[3])/2;

        fill(hue3, 100, brightness3, alpha3);
        rect(width/2-quartX, mTime, w3, -h); // draw pixel
        rect(width/2+quartX, mTime, w3, -h); // draw pixel
    
        fill(hue4, 100, brightness4, alpha4);
        rect(width/2-threeQuartx, mTime, w4, -h); // draw pixel
        rect(width/2+threeQuartx, mTime, w4, -h); // draw pixe
      }

      prevPixelData = [hue, 100, brightness, alpha];
    }

    prevKeyfileTime = time;

  }
}

function drawSoundFilePlayback_H() {
  // analyses the sound file when it is playing, and draws 
  // it as a spectogram on the left side of the screen

  if (keySoundFile.isPlaying()) {

    // move playhead down screen on left hand side

    let time = keySoundFile.currentTime()
    let mTime = map(time, 0, keyFileDuration, 0, width);

    // get the distance the keyfile travels
    let distance = width;
    // use the keyfile duration to find how long it takes to move one pixel
    let pixelPerSecond = distance / keyFileDuration;
    // found how long ago the last frame was
    let timeToCover = time - prevKeyfileTime;
    // use both ti figure out the optimal width
    let w = timeToCover * pixelPerSecond;

    if (reset) {
      w=0;

      if (mTime < 1.5) {
        reset = false;
      }
    }

    let spectrum = fft.analyze();

    let prevPixelData = [0,100,0,0] // hue, saturation, brighness, alpha

    noStroke();
    for (let i=0; i<spectrum.length; i++) {
      //let x = map(i, 0, spectrum.length, width/2, 0);
      let y = nonLinearMap2(i, spectrum.length, height/2);
      let quartY = nonLinearMap2(i-0.25, spectrum.length, height/2);
      let midY = nonLinearMap2(i-0.5, spectrum.length, height/2); // mid x is point betwen x and previous x position.
      let threeQuartY = nonLinearMap2(i-0.75, spectrum.length, height/2);

      let h1 =(height/1024) * 2; // default segment length
      let h2 =(height/1024);
      let h3 =(height/1024) / 2;
      let h4 =(height/1024) / 2;

      if (i>0) {
      // w1 = x - nonLinearMap2(i-1, spectrum.length, width/2); // to get the width of each segment (non linear)

      // w2 = x - midX;

      h1 = y - quartY; // to get the width of each segment (non linear)
      h2 = midY - threeQuartY;
      h3 = (quartY - midY) * 1;
      h4 = (threeQuartY - nonLinearMap2(i-1, spectrum.length, height/2)) * 1;
      } 

      // green = 124 
      // blue = 230
      // purple = 242 
      // red = 0 or 3604

      let hue = map(spectrum[i], 0, 255, 300, 450); // change these arguments to change the colour
      hue1 = hue % 360;

      let brightness = map(spectrum[i], 0,255, 0, 100);

      let alpha = map(spectrum[i], 0,255, 0, 1);

      fill(hue1, 100, brightness, alpha);
      rect(mTime, height/2-y, -w, h1); // draw pixel
      rect(mTime, height/2+y, -w, h1); // draw mirror of pixel

      // draw interpolated pixel, anb it's mirror image
      if (i>0) {

        let hue2f = prevPixelData[0] + (hue-prevPixelData[0])/2;
        hue2 = hue2f%360;
        let brightness2 = prevPixelData[2] + (brightness-prevPixelData[2])/2;
        let alpha2 = prevPixelData[3] + (alpha-prevPixelData[3])/2;

        fill(hue2, 100, brightness2, alpha2);
        rect(mTime, height/2-midY, -w, h2); // draw pixel
        rect(mTime, height/2+midY, -w, h2); // draw pixel

        // FAKE HI-RES
        // fill(0);
        // rect(width/2-quartX, mTime, w3, -h); // draw pixel
        // rect(width/2-threeQuartx, mTime, w4, -h); // draw pixel
        // rect(width/2+quartX, mTime, w3, -h); // draw pixel
        // rect(width/2+threeQuartx, mTime, w4, -h); // draw pixel

        // Real Hi-Res
        let hue3 = hue2f + (hue-hue2f)/2;
        hue3 = hue3%360;
        let brightness3 = brightness2 + (brightness-brightness2)/2;
        let alpha3 = alpha2 + (alpha-alpha2)/2;

        let hue4 = prevPixelData[0] + (hue2f-prevPixelData[0])/2;
        hue4 = hue4%360;
        let brightness4 = prevPixelData[2] + (brightness2-prevPixelData[2])/2;
        let alpha4 = prevPixelData[3] + (alpha2-prevPixelData[3])/2;

        fill(hue3, 100, brightness3, alpha3);
        rect(mTime, height/2-quartY, -w, h3); // draw pixel
        rect(mTime, height/2+quartY, -w, h3); // draw pixel
    
        fill(hue4, 100, brightness4, alpha4);
        rect(mTime, height/2-threeQuartY, -w, h4); // draw pixel
        rect(mTime, height/2+threeQuartY, -w, h4); // draw pixe
      }

      prevPixelData = [hue, 100, brightness, alpha];
    }

    prevKeyfileTime = time;

  }
}

// memory functions

function recordMemory() {
  // if not recording, it will start recording the sound from the canvas,
  // else it will stop the recording and save it to canvas sound.

  if (!recordingMemory) {
    // start recording the canvas sound
    recordingMemory = true;
    mRecorder.record(memories[memories.length-1]);

    //console.log('RECORDING');
  } else {
    // stop recording the canvas sound
    recordingMemory = false;
    mRecorder.stop();
    prevNotePoint = null;

    //console.log('RECORDING FINISHED');

    memories[memories.length] = new p5.SoundFile();
  } 
}

function setMemoryTime() {
  // starts and stops recording memories at random points
    
  // get current time in seconds
  let secNow = second();

  // select random time at most the length of the track
  let randomDuration= random(2, 9);

  // set time to start/stop memory
  memoryTime = (secNow + randomDuration);

  // round memory time to the nearest second
  memoryTime = Math.round(memoryTime) % 60;

  // console.log('current time is ' + second());
  // console.log('Next memory time is ' + memoryTime)

}

function memoryControl() {

  // if the number of memories exceds a set limit do not record anymore
  if (!recordingMemory && (memories.length > maxMemories) || stopAll) {
    return;
  }

  // console.log('= ' + second() + ' ' + memoryTime);
  if ((second() === memoryTime) && !stopAll) {
    recordMemory();
    setMemoryTime(keySoundFile)
  }
}

function drawMemoryTimeGaps() {
  // draws the memory onscreen as it is recorded

  // draw memory only when recording
  if (recordingMemory) {

    let spectrum = fft.analyze();

    let prevYOffset = 0;

    let loudestFreqPos;
    let loudestFreqVolume = 0;

    let prevPixelData = [0,100,0,0] // hue, saturation, brighness, alpha

    noStroke();
    // draw each frequency in the spectrum
    for (let i=0; i<spectrum.length; i++) {
      //let yOffset = map(i, 0, spectrum.length, 0, -memorySpecHeight);

      let yOffset = nonLinearMap(i, spectrum.length, -memorySpecHeight);
      let yOffsetMid = nonLinearMap(i-0.5, spectrum.length, -memorySpecHeight); // point betwen yOffset and previous yOffset

      let h1 = prevYOffset - yOffset;
      let h2 = prevYOffset - yOffsetMid;

      if (i>0) {
        h1 = yOffsetMid - yOffset;
      }

      if (spectrum[i] > loudestFreqVolume) {
        loudestFreqPos = yOffset;
        loudestFreqVolume = spectrum[i];
      }

      // yellow = 50
      // green = 124 
      // cyan = 180
      // blue = 230
      // purple = 242
      // pink = 297 
      // red = 0 or 360

      let hue = map(spectrum[i], 0, 255, 200, 50); // change these arguments to chose the colour
      hue1 = hue % 360;
      let brightness = map(spectrum[i], 0,255, 0, 100); // 0 is to match cavas background
      let alpha = map(spectrum[i], 0,255, 0, 1);
      
      fill(hue1, 0, brightness, alpha);
      rect(x , y + yOffset, xIncriment, h1);  /// THIS LINE DRAWS THE SPECTOGRAPH

      let hue2 = prevPixelData[0] + (hue-prevPixelData[0])/2;
      hue2 = hue2 % 360;
      let brightness2 = prevPixelData[2] + (brightness-prevPixelData[2])/2;
      let alpha2 = prevPixelData[3] + (alpha-prevPixelData[3])/2;

      fill(hue2, 0, brightness2, alpha2);
      rect(x , y + yOffsetMid, xIncriment, h2);

      prevYOffset = yOffset;
      prevPixelData = [hue, 100, brightness, alpha];
    }

    let noteWidth = memorySpecHeight/(20);

    drawAmp(x, y);

    // draw the loudes frequencey when volume increases, or within a set range

    if (getAmp() > (prevAmp)) { // for more lines make it >= instead of >

      // if too close to last note, draw a line to the new point instead

      if (prevNotePoint) {
        // if there is a previous note, get it's distance from the current note

        let noteDist = euclidDist(prevNotePoint[0], prevNotePoint[1], x-noteWidth, y + (loudestFreqPos*2));
        let noteDistH = (x-noteWidth) - prevNotePoint[0];

        if (noteDist < noteWidth+2 || noteDistH < noteWidth) { // remove condition after || for more notes and less lines
          // if the note is too close to the previous note, draw a line instead 

          stroke(37, 100, 80);
          //stroke(100);
          strokeWeight(memorySpecHeight/50);
          line(prevNotePoint[0], prevNotePoint[1], x-noteWidth, y + (loudestFreqPos*2))

          prevNoteIsLine = true;
        } else {
          // else when the note is far enough away, draw a new note. If it's not connected to a line
          
          if (!prevNoteIsLine) {
            drawNote(prevNotePoint[0], prevNotePoint[1], noteWidth);
          }
          // drawNote(prevNotePoint[0], prevNotePoint[1], noteWidth);

          prevNoteIsLine = false;
        }
      }

      // save the point of the last note
      prevNotePoint = [x-noteWidth, y + (loudestFreqPos*2)];
    }

  }
}

function drawNote(x, y, width) {
  // note is offset by circle width to apear as a full circle and not be cut by next frame of spectograph
  
  //fill(350, 100, 70);
  fill(100);
  noStroke();
  circle(x, y, width);
}

function drawAmp(x, y) {

  // draw amplitude below spectograph
  let level = amp.getLevel();
  level = map(level, 0, 1, 0, memorySpecHeight*2);

  fill(0, 0, 80);
  rect(x, y + (memorySpecHeight/4) - level, xIncriment, memorySpecHeight/100);

}

// free associations

function freeAssociations() {
  // randomly selects memories to play

  // only run if in thinking state
  if (isThinking && !stopAll) {

    // console.log("+ " + second() + ' ' + memoryTrigger);
    if ((second() === memoryTrigger) && !stopAll) {
      //console.log('+ PLAY RANDOM FILE');
      triggerMemories();
      setMemoryTrigger();
    }
  }

}

function setMemoryTrigger() {
  // sets a time for when then next memory should be triggerd/played

  // get current time in seconds
  let secNow = second();

  // select random time
  let randomDuration= random(0.2, maxTriggerWait);

  // set time for memory trigger
  memoryTrigger = (secNow + randomDuration);

  // round memory time to the nearest second
  memoryTrigger = Math.round(memoryTrigger) % 60;

  // console.log('current time is ' + second());
  // console.log('Next memoryTrigger is ' + memoryTrigger)
}

function triggerMemories() {
  // randomly selects from all memories which ones to trigger

  // if no memories/files are ready for playback do not play any files
  // there must be at least 2 as the last file is probably not ready for playback
  if ((memories.length-1) < 2) {
    return;
  }

  let maxIndex = memories.length-2;

  let i = Math.round(random(maxIndex))

  //console.log('playing file num ' + i);
  if (memories[i].isLoaded()) {
    memories[i].play();
  }
}

// progressive thought

function progressiveThought() {

  // if key memory is playing, or not thinking do nothing
  if (memories[keyMemoryIndex].isPlaying() || !isThinking || stopAll) {
    return;
  }

  // if key memory has just stoped playing, make the next file the key memory
  if (keyMemoryIsPlaying) {
    //console.log('CHANGE KEY MEMORY');
    keyMemoryIndex++;
    keyMemoryIsPlaying = false;
  }

  // if the key memory is ready to play, play it. else the end of the thought process is reached
  if (memories[keyMemoryIndex].isLoaded()) {
    memories[keyMemoryIndex].play();
    keyMemoryIsPlaying = true;
  } else {
    //console.log('============ END OF THOUGHT PROCESS ============');
  }
}

// ================ Control Functions ================ //

function keyPressed() {
  if (key === "1") {
    // prepare for print by adding info to top of page
    addInfoForPrintTOP();
    stopAll = true;
    noLoop();
  } else if (key === '2') {
    // prepare for print by adding info to bottome of page
    addInfoForPrintBASE();
    stopAll = true;
    noLoop();
  } else if (key === '3') {
    addInfoForPrintBaseRIght();
    stopAll = true;
    noLoop();
  } else if (key === 'g') {
    // clear the background, then run the code

    console.log('GENERATE');

    resetCode();
    background(0);

    startups();
    runCode = true;
  } else if (key === 's') {
    // stop
    console.log('STOP')

    resetCode();

    background(0);
  } else if (key === 'd') {
    // download canvas as img
    save('Graphic_Score_A4.jpg');
  }
}

function mouseClicked() {
  // clear the background, then run the code

  console.log('GENERATE');

  resetCode();
  background(0);

  startups();
  runCode = true;
}

function touchStarted() {
  console.log('GENERATE');

  resetCode();
  background(0);

  startups();
  runCode = true;
}

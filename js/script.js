WebFont.load({
    custom: {
        families: ['ScoreFont']// Specify the font family name here
    },
    active: function () {
        // The font has been loaded
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let debugMode = false;
        let lastTouchEnd = 0;
        let scale = 1;

        canvas.focus(); // Focus the canvas to receive keyboard input

        // Check if the user agent contains any keywords typically found in mobile browsers
        function isMobileBrowser() {
            return ('ontouchstart' in document.documentElement);
        }

        function toggleDebug() {
            debugMode = !debugMode;
            console.log('Debug mode:', debugMode); // Console log to check status
        }

        canvas.addEventListener('keydown', function (event) {
            if (event.key === '`') {
                toggleDebug();
                event.preventDefault(); // Prevent default to avoid any unwanted browser behavior
            }
        });

        canvas.addEventListener('touchstart', function (event) {
            lastTouchTime = Date.now(); // Record time when touch starts
        }, false);

        canvas.addEventListener('touchend', function (event) {
            if (Date.now() - lastTouchTime > 500) { // Check if touch lasted longer than 500 ms
                toggleDebug();
            }
        }, false);

        function drawRect(x, y, width, height, color = '#FFF') {
            ctx.fillStyle = debugMode ? 'rgba(128, 128, 128, 0.5)' : color; // Dim if debug mode is active
            ctx.fillRect(x * scale, y * scale, width * scale, height * scale);
        }

        function drawCircle(x, y, radius, color = '#FFF') {
            ctx.beginPath();
            ctx.fillStyle = debugMode ? 'rgba(128, 128, 128, 0.5)' : color; // Dim if debug mode is active
            ctx.arc(x * scale, y * scale, radius * scale, 0, 2 * Math.PI);
            ctx.fill();
        }

        function drawText(text, x, y, fontSize, color = '#FFF') {
            ctx.font = `${fontSize * scale}px 'ScoreFont'`;
            ctx.fillStyle = debugMode ? 'rgba(128, 128, 128, 0.5)' : color; // Dim if debug mode is active
            ctx.fillText(text, x * scale, y * scale);
        }

        function drawDebugInfo() {
            // Apply a semi-transparent overlay for the entire canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Dark overlay for high contrast
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Debug information array
            const debugInfo = [
                `Detected: ${isMobileBrowser() ? 'Mobile' : 'Desktop'} Browser`, 
                `Logical Canvas Resolution: ${canvas.width}x${canvas.height}`, 
`Actual Display Resolution: ${canvas.clientWidth}x${canvas.clientHeight}`,
            ];

            // Check if ball object is defined and has necessary properties
            if (typeof ball !== 'undefined' && ball !== null) {
                debugInfo.push(
                    `Ball Speed: ${ball.speed}`, 
                    `Ball Speed Increment: ${ball.speedIncrement}`, 
                    `Ball Position: (${ball.x?.toFixed(2) || 'N/A'}, ${ball.y?.toFixed(2) || 'N/A'})`, 
`Ball Velocity: (${ball.velocityX?.toFixed(2) || 'N/A'}, ${ball.velocityY?.toFixed(2) || 'N/A'})`, );
            }

            // Check if playerOne object is defined and has necessary properties
            if (typeof playerOne !== 'undefined' && playerOne !== null) {
                debugInfo.push(
                    `Player One Position: (${playerOne.x?.toFixed(2) || 'N/A'}, ${playerOne.y?.toFixed(2) || 'N/A'})`, 
                    `Player One Speed: ${playerOne.speed?.toFixed(2) || 'N/A'}`, 
`Player One Speed Increment: ${playerOne.speedIncrement?.toFixed(2) || 'N/A'}`);
            }

            // Check if playerTwo object is defined and has necessary properties
            if (typeof playerTwo !== 'undefined' && playerTwo !== null) {
                debugInfo.push(
                    `Player Two Position: (${playerTwo.x?.toFixed(2) || 'N/A'}, ${playerTwo.y?.toFixed(2) || 'N/A'})`, 
                    `Player Two Speed: ${playerTwo.speed?.toFixed(2) || 'N/A'}`, 
`Player Two Speed Increment: ${playerTwo.speedIncrement?.toFixed(2) || 'N/A'}`);
            }

            // Settings for debug text
            ctx.fillStyle = 'yellow'; // High contrast color
            ctx.font = '17px ScoreFont'; // Set initial font properties
            ctx.textAlign = 'left'; // Align text to the left
            const margin = 40; // Margin from the left edge of the canvas

            // Save the context's current state
            ctx.save();

            // Apply scaling to make the font 25% taller
            ctx.scale(1, 1.50); // X stays the same, Y increases by 25%

            // Increased line spacing factor, you can adjust this as needed
            const lineSpacing = 35; // Adjusted for the scale, original was 20

            // Iterate through each debug info and draw it, adjust y-coordinate to account for scaling
            debugInfo.forEach((info, index) => {
                // Adjust y position by dividing by the scale factor to maintain layout
                // The line spacing is also adjusted by the same factor to accommodate the increased line height
                ctx.fillText(info, margin, (30 + (index * lineSpacing)) / 1.25);
            });
            // Restore the context to undo the scaling effect for other drawing operations
            ctx.restore();

        }

        // Delayed AudioContext initialization
        let audioContext;
        let isPlaying = false; // Global state to control sound playback
        let squareWaveBuffer,
        scoreSquareWaveBuffer,
        bounceSquareWaveBuffer; // Buffers for sound

        function initAudio() {
            if (!audioContext) {
                audioContext = new(window.AudioContext || window.webkitAudioContext)();
                // Generate audio buffers after initializing the AudioContext
                squareWaveBuffer = generateSquareWaveAudio(0.01, 440);
                scoreSquareWaveBuffer = generateSquareWaveAudio(0.25, 40);
                bounceSquareWaveBuffer = generateSquareWaveAudio(0.01, 100);
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }

        function resizeCanvas() {
            const widthToHeight = 800 / 600;
            let newWidth = window.innerWidth;
            let newHeight = window.innerHeight * 0.95; // 95% of the viewport height
            let newWidthToHeight = newWidth / newHeight;

            if (newWidthToHeight > widthToHeight) {
                newWidth = newHeight * widthToHeight;
                canvas.style.width = `${newWidth}px`;
            } else {
                newHeight = newWidth / widthToHeight;
                canvas.style.width = `${window.innerWidth}px`;
            }

            canvas.style.height = `${newHeight}px`;
            canvas.width = 800; // logical canvas size
            canvas.height = 600;
            scale = newHeight / 600;

            // Update game elements with new canvas dimensions
            updateGameElementsForResize();
        }

        function updateGameElementsForResize() {
            playerOne.adjustPosition(canvas.width, canvas.height);
            playerTwo.adjustPosition(canvas.width, canvas.height);
            ball.adjustPosition(canvas.width, canvas.height);
        }

        function generateSquareWaveAudio(duration, frequency) {
            const sampleRate = audioContext.sampleRate;
            const frameCount = Math.max(1, sampleRate * duration);
            const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                data[i] = (i % (sampleRate / (2 * frequency))) < (sampleRate / (4 * frequency)) ? 1 : -1;
            }
            return buffer;
        }

        function playBounceSound() {
            if (!isPlaying || !audioContext)
                return;
            const bounceSource = audioContext.createBufferSource();
            bounceSource.buffer = bounceSquareWaveBuffer;
            bounceSource.connect(audioContext.destination);
            bounceSource.start();
        }

        function playSquareWave() {
            if (!isPlaying || !audioContext)
                return;
            const squareWaveSource = audioContext.createBufferSource();
            squareWaveSource.buffer = squareWaveBuffer;
            squareWaveSource.connect(audioContext.destination);
            squareWaveSource.start();
        }

        function playScoreSound() {
            if (!isPlaying || !audioContext)
                return;
            const scoreSource = audioContext.createBufferSource();
            scoreSource.buffer = scoreSquareWaveBuffer;
            scoreSource.connect(audioContext.destination);
            scoreSource.start();
        }

        canvas.addEventListener('click', function () {
            initAudio(); // Initialize and resume audio on user interaction
            isPlaying = !isPlaying; // Toggle sound state
        });
		function displayWaitMessage() {
			const { hours, minutes, seconds } = getCurrentTime();
			const condition = hours - player1Score + minutes - player2Score > 2;

			if (condition && seconds % 2 !== 0) {
				ctx.font = '80px ScoreFont';
				ctx.fillStyle = '#FFF';
				ctx.textAlign = 'center';
				ctx.fillText('SYNCING', canvas.width / 2, canvas.height / 2 + 50);
			}
		}
        function getCurrentTime() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            return {
                hours,
                minutes,
                seconds
            };
        }
        function Points(difference) {
            if (difference > 7) {
                return 8;
            } else if (difference > 4) {
                return 5;
            } else if (difference > 2) {
                return 3;
            } else if (difference > 1) {
                return 2;
            } else if (difference < -4) {
                return -5;
            } else if (difference < -2) {
                return -3;
            } else if (difference < -1) {
                return -2;
            } else if (difference < 0) {
                return -1;
            } else {
                return 1;
            }
        }

        // ---------------- Thermo-Trail Parameters ----------------
        const heatStartFactor = 1.5; // Activate heating above 150% of v0
        const frictionHeatCoeff = 2;
        const Tmin = 900;
        const Tmax = 3000;
        const trailBase = 70; // milliseconds
        const trailSkew = 5;
        const tauMax = 200;
        const coolRGB = [255, 255, 255];

        const blackBodyLUT = [
            { T: 900,  rgb: [255, 85, 0] },
            { T: 1500, rgb: [255, 215, 0] },
            { T: 2200, rgb: [255, 239, 231] },
            { T: 2600, rgb: [214, 239, 255] },
            { T: 3000, rgb: [155, 214, 255] }
        ];

        function sampleBlackBody(T) {
            if (T <= blackBodyLUT[0].T) return blackBodyLUT[0].rgb;
            for (let i = 0; i < blackBodyLUT.length - 1; i++) {
                const a = blackBodyLUT[i];
                const b = blackBodyLUT[i + 1];
                if (T <= b.T) {
                    const t = (T - a.T) / (b.T - a.T);
                    return [
                        Math.round(a.rgb[0] + t * (b.rgb[0] - a.rgb[0])),
                        Math.round(a.rgb[1] + t * (b.rgb[1] - a.rgb[1])),
                        Math.round(a.rgb[2] + t * (b.rgb[2] - a.rgb[2]))
                    ];
                }
            }
            return blackBodyLUT[blackBodyLUT.length - 1].rgb;
        }

        function computeHeat(ball) {
            const v = Math.hypot(ball.velocityX, ball.velocityY);
            const excess = Math.max(0, v - heatStartFactor * ball.v0);
            const norm = Math.max(0, Math.min(1, excess / (ball.vMax - heatStartFactor * ball.v0)));
            const theta = Math.pow(norm, frictionHeatCoeff);
            const T = Tmin + (Tmax - Tmin) * theta;
            const rgb = sampleBlackBody(T);
            const tau = trailBase / (1 + trailSkew * theta);
            return { theta, T, rgb, tau };
        }

        let trail = [];

        function updateTrail(dt, heatState, x, y) {
            trail.forEach(vx => { vx.age += dt; });
            trail.push({ x, y, age: 0 });
            trail = trail.filter(vx => vx.age < tauMax);
        }

        let lastPlayer;
        class Paddle {
            constructor(x, canvasHeight, isRight = false, controlMode = 0) {
                this.isRight = isRight;
                this.canvasHeight = canvasHeight; // Track canvas height.
                this.x = x; // Set during initialization and adjusted in adjustPosition.
                this.y = canvasHeight / 2;
                this.width = 15;
                this.height = 110;
                this.adjustSpeedForMobile();
                this.controlMode = controlMode;
                this.lastControlMode = 0;
            }

            adjustSpeedForMobile() {
                if (isMobileBrowser()) {
                    this.speed = 12;
                    this.speedIncrement = 0;
                } else {
                    this.speed = 8;
                    this.speedIncrement = 0;
                }
            }

            adjustPosition(canvasWidth, canvasHeight) {
                this.canvasHeight = canvasHeight; // Update canvas height on resize.
                if (this.isRight) {
                    this.x = canvasWidth - this.width / 2 - 10; // Ensure it's inside the canvas
                } else {
                    this.x = this.width / 2 + 10; // Ensure it's inside the canvas
                }
            }

            update(ball) {
                this.speed += this.speedIncrement;
                if (this.y + this.height / 2 < ball.y) {
                    this.y = Math.min(this.y + this.speed, this.canvasHeight - this.height / 2);
                } else if (this.y + this.height / 2 > ball.y) {
                    this.y = Math.max(this.y - this.speed, this.height / 2);
                }
            }

            draw(ctx) {
                ctx.fillStyle = '#FFF';
                ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            }

            updateControlMode(currentHour, currentMinute, currentSecond, player1Score, player2Score) {
                this.controlMode = 0;
                if ((currentMinute === 59 && currentSecond >= 55) || (currentHour > player1Score || currentHour < player1Score)) {
                    this.controlMode = 1;
                }
                if ((currentMinute > player2Score && currentSecond >= 55) || (currentMinute > player2Score || currentMinute < player2Score)) {
                    // Calculate the control mode based on the described logic
                    if (this.controlMode === 1 && this.lastControlMode === 2) {
                        this.controlMode === 1;
                        this.lastControlMode === 1;
                    } else {
                        this.controlMode = 2;
                        this.lastControlMode === 2;
                    }
                }
            }
            predictBallPosition(ball) {
                const opponentPaddle = (ball.velocityX > 0) ? playerTwo : playerOne;
                const distanceX = Math.abs(ball.x - this.x);
                const distanceY = Math.abs(ball.y - this.y);
                if (distanceX < this.trackDistanceX && distanceY > this.trackDistanceY) {
                    const targetY = ball.y + (this.x - ball.x) * (ball.velocityY / ball.velocityX);
                    this.moveToPosition(targetY);
                } else {
                    if (this.lastPlayer !== (ball.velocityX > 0)) {
                        this.lastPlayer = (ball.velocityX > 0);
                        this.speed += this.speedIncrement;
                        opponentPaddle.targetY = (Math.random() * (opponentPaddle.height * 0.9)) - (opponentPaddle.height * 0.9 / 2) + (opponentPaddle.height * 0.05);
                    }
                    let ballCurrentX = ball.x;
                    let ballCurrentY = ball.y;
                    let ballVelocityY = ball.velocityY;
                    const deltaX = ball.velocityX > 0 ? 1 : -1;
                    while ((ballCurrentX > 0 && ballCurrentX < canvas.width) && (ballCurrentX !== this.x)) {
                        ballCurrentX += deltaX;
                        ballCurrentY += ballVelocityY * deltaX / Math.abs(ball.velocityX);
                        if (ballCurrentY < 0 || ballCurrentY > canvas.height) {
                            ballVelocityY = -ballVelocityY;
                            ballCurrentY += ballVelocityY * deltaX / Math.abs(ball.velocityX);
                        }
                    }
                    let ballBlockY = ballCurrentY;
                    if (this.controlMode === 1 && opponentPaddle === playerTwo) {
                        ballBlockY = (this.canvasHeight - ballCurrentY);
                    }
                    if (this.controlMode === 2 && opponentPaddle === playerOne) {
                        ballBlockY = (this.canvasHeight - ballCurrentY);
                    }
                    opponentPaddle.moveToPosition(ballBlockY - opponentPaddle.targetY);
                }
            }
            moveToPosition(yPosition) {
                let direction = yPosition - this.y;
                if (direction > this.speed) {
                    this.y += this.speed;
                } else if (direction < -this.speed) {
                    this.y -= this.speed;
                } else {
                    this.y = yPosition;
                }
                this.y = Math.max(this.y, this.height / 2);
                this.y = Math.min(this.y, this.canvasHeight - this.height + (this.height / 2));
            }
        }
        class Ball {
            constructor(canvasWidth, canvasHeight, audioContext) {
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                this.speed = 0; // Initialize speed
                this.speedIncrement = 0; // Initialize speed increment
                this.speedCap = 0; // Initialize speed cap
                this.adjustSpeedForMobile();
                // Store design speed and max speed for heat calculations
                this.v0 = this.speed;
                this.vMax = this.speedCap;
                this.reset();
            }

            adjustSpeedForMobile() {
                if (isMobileBrowser()) {
                    this.speed = 4;
                    this.speedIncrement = 0.2;
                    this.speedCap = 14;
                } else {
                    this.speed = 2;
                    this.speedIncrement = 0.15;
                    this.speedCap = 7;
                }
            }

            reset() {
                this.x = this.canvasWidth / 2;
                this.y = this.canvasHeight / 2;
                this.radius = 10;
                this.velocityX = this.speed * (Math.random() > 0.5 ? 1 : -1);
                this.velocityY = this.speed * (Math.random() > 0.5 ? 1 : -1);
            }

            adjustPosition(canvasWidth, canvasHeight) {
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                this.reset(); // Resets position to the center of the new canvas size
            }
            draw(ctx) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            update(paddles) {
                this.x += this.velocityX;
                this.y += this.velocityY;
                if (this.y - this.radius < 0) {
                    this.y = this.radius;
                    this.velocityY = Math.abs(this.velocityY);
                    playBounceSound();
                } else if (this.y + this.radius > this.canvasHeight) {
                    this.y = this.canvasHeight - this.radius;
                    this.velocityY = -Math.abs(this.velocityY);
                    playBounceSound();
                }
                const {
                    hours,
                    minutes
                } = getCurrentTime();
                if (this.x + this.radius < 0) {
                    player2Score += Points(minutes - player2Score);
                    playScoreSound();
                    this.reset();
                } else if (this.x - this.radius > this.canvasWidth) {
                    player1Score += Points(hours - player1Score);
                    playScoreSound();
                    this.reset();
                }

                // Check collision with paddles
                paddles.forEach(paddle => {
                    const paddleLeft = paddle.x - paddle.width / 2;
                    const paddleRight = paddle.x + paddle.width / 2;
                    const paddleTop = paddle.y - paddle.height / 2;
                    const paddleBottom = paddle.y + paddle.height / 2;

                    if (this.x - this.radius < paddleRight &&
                        this.x + this.radius > paddleLeft &&
                        this.y + this.radius > paddleTop &&
                        this.y - this.radius < paddleBottom) {

                        // Calculate hit point more accurately
                        let collidePoint = (this.y - paddle.y) / (paddle.height / 2);
                        // Limiting the collision point to the range -1 to 1 to avoid extreme angles
                        collidePoint = Math.max(-1, Math.min(1, collidePoint));

                        // Calculate the angle in radians
                        let angleRad = collidePoint * (Math.PI / 4); // Adjust this to reduce the maximum possible angle

                        // Determine the direction based on which paddle is hit
                        let direction = paddle.x > this.canvasWidth / 2 ? -1 : 1;

                        // Update velocities using both sine and cosine, ensure that the angles are not too steep
                        this.velocityX = direction * this.speed * Math.cos(angleRad);
                        this.velocityY = this.speed * Math.sin(angleRad);

                        // Ensure speed does not increase too rapidly
                        this.speed = Math.min(this.speed + this.speedIncrement, this.speedCap);

                        // Play sound
                        playSquareWave();
                    }
                });

                if (this.x + this.radius < 0 || this.x - this.radius > this.canvasWidth) {
                    this.reset();
                }
            }
            draw(ctx) {
                ctx.fillStyle = '#FFF';
                ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            }
        }
        // Initialization of game elements
        const playerOne = new Paddle(10, canvas.height, false);
        const playerTwo = new Paddle(canvas.width - 10, canvas.height, true);
        const ball = new Ball(canvas.width, canvas.height, audioContext);
        let player1Score = 0;
        let player2Score = 0;

        playerOne.adjustPosition(canvas.width);
        playerTwo.adjustPosition(canvas.width);
        ball.adjustPosition(canvas.width, canvas.height);

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // To set initial sizes and positions

        let lastTime = null;

        function gameLoop(timestamp) {
            if (lastTime === null) lastTime = timestamp;
            const dt = timestamp - lastTime;
            lastTime = timestamp;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let paddles = [playerTwo, playerOne];
            const { hours, minutes, seconds } = getCurrentTime();

            if (player1Score > 23) player1Score = 0;
            if (player2Score > 59) player2Score = 0;

            const boxWidth = 10;
            const boxHeight = 10;
            const numBoxes = Math.floor(canvas.height / (boxHeight * 2));
            for (let i = 0; i < numBoxes; i++) {
                ctx.fillStyle = '#FFF';
                ctx.fillRect(canvas.width / 2 - boxWidth / 2, i * boxHeight * 2, boxWidth, boxHeight);
            }

            ctx.font = '70px ScoreFont';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.scale(1, 1.8);
            ctx.fillText(player1Score.toString().padStart(2, '0'), (canvas.width * 0.29), 80);
            ctx.fillText(player2Score.toString().padStart(2, '0'), (canvas.width * 0.74), 80);
            ctx.restore();

            ball.update([playerOne, playerTwo]);
            const heat = computeHeat(ball);
            updateTrail(dt, heat, ball.x, ball.y);

            trail.forEach(vx => {
                const fade = Math.exp(-vx.age / heat.tau);
                const mix = vx.age / tauMax;
                const r = Math.round(heat.rgb[0] * (1 - mix) + coolRGB[0] * mix);
                const g = Math.round(heat.rgb[1] * (1 - mix) + coolRGB[1] * mix);
                const b = Math.round(heat.rgb[2] * (1 - mix) + coolRGB[2] * mix);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fade})`;
                ctx.fillRect(vx.x - ball.radius, vx.y - ball.radius, ball.radius * 2, ball.radius * 2);
            });

            ctx.fillStyle = `rgb(${heat.rgb[0]}, ${heat.rgb[1]}, ${heat.rgb[2]})`;
            ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);

            playerOne.updateControlMode(hours, minutes, seconds, player1Score, player2Score);
            playerTwo.updateControlMode(hours, minutes, seconds, player1Score, player2Score);
            playerOne.predictBallPosition(ball);
            playerOne.draw(ctx);
            playerTwo.predictBallPosition(ball);
            playerTwo.draw(ctx);

            displayWaitMessage();

            if (debugMode) {
                drawDebugInfo();
            }

            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
    },
    inactive: function () {
        console.error('The custom font could not be loaded!');
    }
});

var CANVAS_BG_COLOR = "#000";
var PLAYER_NAME = "Erlend Klouman Høiner";
var BOX_WIDTH = 400;
var BOX_HEIGHT = 80;
var BALL_SIZE = 24;
var NAME_PADDING = 24;
var NAME_FONT = "bold 28px Helvetica, Arial, sans-serif";
var SMALL_TEXT = "Teams are created when all students have joined.";
var SMALL_FONT = "16px Helvetica, Arial, sans-serif";
var SMALL_TEXT_COLOR = "#fff";
var SMALL_TEXT_Y_OFFSET = 18; // px gap from box to small text
var SMALL_TEXT_HEIGHT = 18; // estimate for vertical centering
var PADDLE_ACCEL = 1.1;
var PADDLE_MAX_SPEED = 20;
var PADDLE_FRICTION = 0.85;
var GRAVITY = 0.45;
var BALL_BOUNCE = 0.8;
// Spring/damping for the 'rubber band' effect
var SPRING_STIFFNESS = 0.11;
var SPRING_DAMPING = 0.72;
var canvas;
var ctx;
var CANVAS_WIDTH = window.innerWidth;
var CANVAS_HEIGHT = window.innerHeight;
var gameActive = false;
var paddleX = 0;
var paddleVX = 0;
var keyLeft = false;
var keyRight = false;
// "Hanging" small text position/velocity (follows paddleX + BOX_WIDTH/2)
var smallTextX = 0;
var smallTextVX = 0;
var balls = [];
var lastSpawnTime = 0;
var spawnInterval = 1800;
var gameStart = 0;
// Calculate vertical center for both box and small text as a group
function getPaddleGroupY() {
    var groupHeight = BOX_HEIGHT + SMALL_TEXT_Y_OFFSET + SMALL_TEXT_HEIGHT;
    return (CANVAS_HEIGHT - groupHeight) / 2;
}
function drawLobby(ctx) {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    var groupY = getPaddleGroupY();
    var centerX = CANVAS_WIDTH / 2;
    // White box (paddle)
    ctx.fillStyle = "#fff";
    ctx.fillRect(centerX - BOX_WIDTH / 2, groupY, BOX_WIDTH, BOX_HEIGHT);
    // Name with padding
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(centerX - BOX_WIDTH / 2 + NAME_PADDING, groupY + NAME_PADDING, BOX_WIDTH - 2 * NAME_PADDING, BOX_HEIGHT - 2 * NAME_PADDING);
    ctx.clip();
    ctx.fillText(PLAYER_NAME, centerX, groupY + BOX_HEIGHT / 2);
    ctx.restore();
    // Small text underneath
    ctx.font = SMALL_FONT;
    ctx.fillStyle = SMALL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(SMALL_TEXT, centerX, groupY + BOX_HEIGHT + SMALL_TEXT_Y_OFFSET);
}
function drawGame(ctx) {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    var groupY = getPaddleGroupY();
    // Paddle (white box)
    ctx.fillStyle = "#fff";
    ctx.fillRect(paddleX, groupY, BOX_WIDTH, BOX_HEIGHT);
    // Name with padding
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(paddleX + NAME_PADDING, groupY + NAME_PADDING, BOX_WIDTH - 2 * NAME_PADDING, BOX_HEIGHT - 2 * NAME_PADDING);
    ctx.clip();
    ctx.fillText(PLAYER_NAME, paddleX + BOX_WIDTH / 2, groupY + BOX_HEIGHT / 2);
    ctx.restore();
    // Small text underneath ("hanging" effect)
    ctx.font = SMALL_FONT;
    ctx.fillStyle = SMALL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(SMALL_TEXT, smallTextX, groupY + BOX_HEIGHT + SMALL_TEXT_Y_OFFSET);
    // Balls
    for (var _i = 0, balls_1 = balls; _i < balls_1.length; _i++) {
        var ball = balls_1[_i];
        ctx.fillStyle = "#fff";
        ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
    }
}
function updatePaddle() {
    // Physics-based movement
    if (keyLeft && !keyRight) {
        paddleVX -= PADDLE_ACCEL;
    }
    else if (keyRight && !keyLeft) {
        paddleVX += PADDLE_ACCEL;
    }
    else {
        // Apply friction
        paddleVX *= PADDLE_FRICTION;
        if (Math.abs(paddleVX) < 0.2)
            paddleVX = 0;
    }
    // Clamp speed
    if (paddleVX > PADDLE_MAX_SPEED)
        paddleVX = PADDLE_MAX_SPEED;
    if (paddleVX < -PADDLE_MAX_SPEED)
        paddleVX = -PADDLE_MAX_SPEED;
    paddleX += paddleVX;
    // Clamp to bounds
    if (paddleX < 0) {
        paddleX = 0;
        paddleVX = 0;
    }
    if (paddleX > CANVAS_WIDTH - BOX_WIDTH) {
        paddleX = CANVAS_WIDTH - BOX_WIDTH;
        paddleVX = 0;
    }
    // Update the springy "hanging" text
    var paddleCenter = paddleX + BOX_WIDTH / 2;
    var dx = paddleCenter - smallTextX;
    smallTextVX = smallTextVX * SPRING_DAMPING + dx * SPRING_STIFFNESS;
    smallTextX += smallTextVX;
}
function updateGame() {
    updatePaddle();
    var groupY = getPaddleGroupY();
    // Advance balls
    for (var _i = 0, balls_2 = balls; _i < balls_2.length; _i++) {
        var ball = balls_2[_i];
        if (!ball.active)
            continue;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += GRAVITY;
        // Bounce off left/right walls
        if (ball.x < 0) {
            ball.x = 0;
            ball.vx = -ball.vx * BALL_BOUNCE;
        }
        else if (ball.x + BALL_SIZE > CANVAS_WIDTH) {
            ball.x = CANVAS_WIDTH - BALL_SIZE;
            ball.vx = -ball.vx * BALL_BOUNCE;
        }
        // Bounce off paddle (name box)
        var paddleY = groupY;
        if (ball.y + BALL_SIZE > paddleY &&
            ball.y < paddleY + BOX_HEIGHT &&
            ball.x + BALL_SIZE > paddleX &&
            ball.x < paddleX + BOX_WIDTH &&
            ball.vy > 0) {
            ball.y = paddleY - BALL_SIZE;
            // Paddle movement affects bounce direction (no randomness)
            var contactPoint = ((ball.x + BALL_SIZE / 2) - (paddleX + BOX_WIDTH / 2)) / (BOX_WIDTH / 2); // -1 (left) to 1 (right)
            var speed = Math.sqrt(Math.pow(ball.vx, 2) + Math.pow(ball.vy, 2)) * BALL_BOUNCE + 3;
            ball.vx = 0.5 * paddleVX + contactPoint * 7;
            ball.vy = -Math.abs(speed);
        }
        // Bottom (lose condition)
        if (ball.y > CANVAS_HEIGHT) {
            ball.active = false;
            // Could trigger lose/game over state here
        }
    }
    // Remove inactive balls
    balls = balls.filter(function (b) { return b.active; });
}
function gameLoop(ctx) {
    if (!gameActive) {
        drawLobby(ctx);
        return;
    }
    updateGame();
    drawGame(ctx);
    // Spawn new ball if needed
    var now = performance.now();
    if (now - lastSpawnTime > spawnInterval) {
        balls.push({
            x: Math.random() * (CANVAS_WIDTH - BALL_SIZE),
            y: 0,
            vx: (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 1.5,
            active: true,
        });
        lastSpawnTime = now;
        // Increase difficulty
        if (spawnInterval > 600)
            spawnInterval -= 15;
    }
}
function handleKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = true;
    if (e.key === "ArrowRight" || e.key === "s")
        keyRight = true;
}
function handleKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = false;
    if (e.key === "ArrowRight" || e.key === "s")
        keyRight = false;
}
function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    if (canvas) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }
}
function main() {
    canvas = document.createElement("canvas");
    resizeCanvas();
    document.body.style.background = CANVAS_BG_COLOR;
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", function () {
        resizeCanvas();
        // Recenter paddle and small text (keep relative position)
        paddleX = CANVAS_WIDTH / 2 - BOX_WIDTH / 2;
        smallTextX = CANVAS_WIDTH / 2;
    });
    // Start game immediately:
    gameActive = true;
    gameStart = performance.now();
    paddleX = CANVAS_WIDTH / 2 - BOX_WIDTH / 2;
    paddleVX = 0;
    smallTextX = CANVAS_WIDTH / 2;
    smallTextVX = 0;
    balls = [];
    lastSpawnTime = performance.now();
    spawnInterval = 1800;
    function loop() {
        gameLoop(ctx);
        requestAnimationFrame(loop);
    }
    loop();
}
main();

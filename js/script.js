// Constants
const CANVAS_SIZE = 400;
const SCALE = 20; // Pixels per unit
const CENTER = CANVAS_SIZE / 2;
const X_MIN = -10;
const X_MAX = 10;

const dateSpan = document.getElementById('date');
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
const userInput = document.getElementById("userGuess");
const submitBtn = document.getElementById("submitBtn");
const newGameBtn = document.getElementById("newGameBtn");
const feedback = document.getElementById("feedback");
const hintText = document.getElementById("hintText");
const scoreVal = document.getElementById("scoreVal");
const streakVal = document.getElementById("streakVal");
const bestScoreVal = document.getElementById("bestScoreVal");
const bestStreakVal = document.getElementById("bestStreakVal");
const themeToggle = document.getElementById("themeToggle");

// Variables
let currentFunction = null;
let hasGuessed = false;
let score = 0;
let streak = 0;
let bestScore = parseInt(localStorage.getItem('curveGameBestScore') || '0', 10);
let bestStreak = parseInt(localStorage.getItem('curveGameBestStreak') || '0', 10);
let isDarkMode = localStorage.getItem('curveGameDarkMode') === 'true';

// Logic and Math
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNonZeroInt(min, max) {
    let val = getRandomInt(min, max);
    return val === 0 ? 1 : val;
}

function generateFunction() {
    const types = [
        "linear", "quadratic", "cubic", "sine", "cosine",
        "tangent", "exponential", "absolute", "rational", "square_root"
    ];
    
    const type = types[getRandomInt(0, types.length - 1)];

    let evaluate, humanReadable, hint;
    const a = getNonZeroInt(-3, 3);
    const b = getNonZeroInt(-3, 3);
    const c = getRandomInt(-3, 3);
    const d = getRandomInt(-3, 3);

    switch (type) {
        case "linear":
            evaluate = (x) => a * x + c;
            humanReadable = `${formatTerm(a, "x", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Linear (e.g., 2x + 3 or -x + 1)";
            break;

        case "quadratic":
            evaluate = (x) => a * Math.pow(x, 2) + b * x + c;
            humanReadable = `${formatTerm(a, "x^2", true)}${formatTerm(b, "x", false)}${formatTerm(c, "", false)}`;
            hint = "Type: Quadratic (e.g., 2x^2 + 3x + 1)";
            break;

        case "cubic":
            evaluate = (x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;
            humanReadable = `${formatTerm(a, 'x^3', true)}${formatTerm(b, 'x^2', false)}${formatTerm(c, 'x', false)}${formatTerm(d, '', false)}`;
            hint = "Type: Cubic (e.g., x^3 - 2x^2 + x - 1)";
            break;

        case "sine":
            evaluate = (x) => a * Math.sin(b * x) + c;
            humanReadable = `${formatTerm(a, "sin(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Sine wave (e.g., 2sin(x) + 1)";
            break;

        case "cosine":
            evaluate = (x) => a * Math.cos(b * x) + c;
            humanReadable = `${formatTerm(a, "cos(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Cosine wave (e.g., 2cos(x) + 1)";
            break;

        case "tangent":
            evaluate = (x) => {
                const val = b * x;
                if (Math.abs(Math.cos(val)) < 0.001) return NaN;
                return a * Math.tan(val) + c;
            };
            humanReadable = `${formatTerm(a, "tan(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Tangent function (e.g., 2tan(x) + 1)";
            break;

        case "exponential":
            evaluate = (x) => a * Math.exp(b * x) + c;
            humanReadable = `${formatTerm(a, "e^(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Exponential (e.g., 2e^x + 1 or e^(2x))";
            break;

        case "absolute":
            evaluate = (x) => a * Math.abs(b * x + c) + d;

            // Build inner expression properly
            let inner = "";
            if (b !== 0) inner += formatTerm(b, "x", true);
            if (c !== 0) inner += formatTerm(c, "", inner === "");
            if (inner === "") inner = "0";

            let absPart = `|${inner}|`;
            if (a === -1) absPart = `-${absPart}`;
            else if (a !== 1) absPart = `${a}${absPart}`;

            let dStr = "";
            if (d > 0) dStr = ` + ${d}`;
            else if (d < 0) dStr = ` - ${Math.abs(d)}`;

            humanReadable = absPart + dStr;
            hint = "Type: Absolute value (e.g., |2x + 1| or 2|x| - 3)";
            break;

        case "rational":
            evaluate = (x) => {
                if (Math.abs(x + b) < 0.001) return NaN;
                return a / (x + b) + c;
            };
            // Fix denominator formatting for negative b
            const denom = b === 0 ? "x" : `(x${b < 0 ? b : '+' + b})`;
            humanReadable = `${a}/${denom}${formatTerm(c, "", false)}`;
            hint = "Type: Rational (e.g., 2/(x+1) + 3 or 1/x - 2)";
            break;

        case "square_root":
            evaluate = (x) => {
                const val = x + c;
                if (val < 0) return NaN;
                return a * Math.sqrt(val) + d;
            };
            // Ensure proper parentheses for non-zero c
            const innerSqrt = c === 0 ? "x" : `(x${c < 0 ? c : '+' + c})`;
            humanReadable = `${formatTerm(a, `sqrt(${innerSqrt})`, true)}${formatTerm(d, "", false)}`;
            hint = "Type: Square root (e.g., 2sqrt(x) or sqrt(x-1) + 3)";
            break;
    }

    if (humanReadable === "") humanReadable = "0";
    return { evaluate, humanReadable, hint, type };
}

function formatTerm(coeff, varPart, isFirst) {
    if (coeff === 0) return "";
    const sign = coeff > 0 ? (isFirst ? "" : " + ") : (isFirst ? "-" : " - ");
    const absCoeff = Math.abs(coeff);
    const coeffStr = (absCoeff === 1 && varPart !== "" && varPart !== "|") ? "" : absCoeff;
    return `${sign}${coeffStr}${varPart}`;
}

function pad(n, len = 3) {
    return String(n).padStart(len, '0');
}

function updateScoreUI() {
    scoreVal.textContent = pad(score);
    streakVal.textContent = pad(streak, 2);
    bestScoreVal.textContent = pad(bestScore);
    bestStreakVal.textContent = pad(bestStreak, 2);
}

function flashStat(el) {
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 600);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('curveGameDarkMode', isDarkMode);
    if (currentFunction) drawGraph();
}

function parseHumanMath(expr) {
    let jsExpr = expr.toLowerCase().trim();

    // Convert |...| directly into the SAME placeholder used for a typed "abs" word,
    // so both paths behave identically through the rest of the pipeline.
    jsExpr = jsExpr.replace(/\|([^|]+)\|/g, '__ABS__($1)');
    jsExpr = jsExpr.replace(/\babs\b/gi, '__ABS__');

    // Implicit multiplication: digit/letter adjacency
    jsExpr = jsExpr.replace(/(\d)([a-z])/gi, '$1*$2');
    jsExpr = jsExpr.replace(/([a-z])(\d)/gi, '$1*$2');

    // Implicit multiplication into ANY placeholder (covers 3__ABS__(...), x__SIN__(...), etc.)
    // Underscore boundaries mean the rules above never catch these, so handle explicitly.
    jsExpr = jsExpr.replace(/(\d)(__[A-Z]+__)/g, '$1*$2');
    jsExpr = jsExpr.replace(/([a-z])(__[A-Z]+__)/gi, '$1*$2');
    jsExpr = jsExpr.replace(/(\))(__[A-Z]+__)/g, '$1*$2');

    // Function placeholders
    jsExpr = jsExpr.replace(/\bsin\b/gi, '__SIN__');
    jsExpr = jsExpr.replace(/\bcos\b/gi, '__COS__');
    jsExpr = jsExpr.replace(/\btan\b/gi, '__TAN__');
    jsExpr = jsExpr.replace(/\bsqrt\b/gi, '__SQRT__');
    jsExpr = jsExpr.replace(/\blog\b/gi, '__LOG__');
    jsExpr = jsExpr.replace(/\bexp\b/gi, '__EXP__');

    // Exponentiation (unary-minus-before-** fix)
    const token = '(?:__[A-Z]+__\\([^()]*\\)|[a-zA-Z_$][\\w$]*|\\d+(?:\\.\\d+)?|\\([^()]*\\))';
    const unaryBeforePow = new RegExp(
        '(^|[-+*/(,])\\s*-\\s*(' + token + ')\\^(' + token + ')',
        'g'
    );
    jsExpr = jsExpr.replace(unaryBeforePow, (_, prefix, base, exp) => `${prefix}-(${base}^${exp})`);
    jsExpr = jsExpr.replace(/\^/g, '**');

    // Remaining implicit multiplication (parens, letters — NOT placeholders, already handled above)
    jsExpr = jsExpr.replace(/(\d)\(/g, '$1*(');
    jsExpr = jsExpr.replace(/\)(\d)/g, ')*$1');
    jsExpr = jsExpr.replace(/\)\(/g, ')*(');
    jsExpr = jsExpr.replace(/([a-z])\(/gi, '$1*(');
    jsExpr = jsExpr.replace(/\)([a-z])/gi, ')*$1');

    // Restore functions — LAST, so nothing downstream can re-match generated "Math.xxx" text
    jsExpr = jsExpr.replace(/__SIN__/gi, 'Math.sin');
    jsExpr = jsExpr.replace(/__COS__/gi, 'Math.cos');
    jsExpr = jsExpr.replace(/__TAN__/gi, 'Math.tan');
    jsExpr = jsExpr.replace(/__ABS__/gi, 'Math.abs');
    jsExpr = jsExpr.replace(/__SQRT__/gi, 'Math.sqrt');
    jsExpr = jsExpr.replace(/__LOG__/gi, 'Math.log');
    jsExpr = jsExpr.replace(/__EXP__/gi, 'Math.exp');

    // Constants
    jsExpr = jsExpr.replace(/(?<![a-z])e(?![a-z])/gi, 'Math.E');
    jsExpr = jsExpr.replace(/\bpi\b/gi, 'Math.PI');

    // Sanitization
    const safeRegex = /^(?:[0-9x\.\+\-\*\/\(\)\s]|Math\.(?:sin|cos|tan|abs|sqrt|log|exp|PI|E))+$/i;
    if (!safeRegex.test(jsExpr)) {
        console.log(jsExpr);
        throw new Error("Invalid characters.");
    }
    console.log(jsExpr);
    return new Function('x', `return ${jsExpr};`);
}

// Graphing
function toCanvasX(x) { return CENTER + x * SCALE; }
function toCanvasY(y) { return CENTER - y * SCALE; }

function drawGraph() {
    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? "#2a2a2a" : "#d4cfc4";
    const axisColor = isDark ? "#f2ede4" : "#1a1a1a";
    const curveColor = isDark ? "#5ce1e6" : "#e85d3c";

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let i = X_MIN; i <= X_MAX; i++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(i), 0);
        ctx.lineTo(toCanvasX(i), CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(i));
        ctx.lineTo(CANVAS_SIZE, toCanvasY(i));
        ctx.stroke();
    }

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CENTER); ctx.lineTo(CANVAS_SIZE, CENTER);
    ctx.moveTo(CENTER, 0); ctx.lineTo(CENTER, CANVAS_SIZE);
    ctx.stroke();

    if (!currentFunction) return;

    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3;
    ctx.beginPath();

    let firstPoint = true;
    let lastY = 0;

    for (let x = X_MIN; x <= X_MAX; x += 0.05) {
        const y = currentFunction.evaluate(x);
        const cx = toCanvasX(x);
        const cy = toCanvasY(y);
        const hugeJump = !firstPoint && Math.abs(cy - lastY) > CANVAS_SIZE;

        if (isNaN(y) || cy < -100 || cy > CANVAS_SIZE + 100 || hugeJump) {
            firstPoint = true;
            continue;
        }

        if (firstPoint) {
            ctx.moveTo(cx, cy);
            firstPoint = false;
        } else {
            ctx.lineTo(cx, cy);
        }
        lastY = cy;
    }
    ctx.stroke();
}

function checkAnswer() {
    if (hasGuessed) return;

    feedback.classList.remove("hidden");

    const userExpr = userInput.value.trim();
    if (!userExpr) {
        feedback.textContent = "Please enter an expression.";
        feedback.style.backgroundColor = "rgba(255, 193, 7, 0.2)";
        feedback.style.color = "#ffc107";
        return;
    }

    let userEvaluate;
    try {
        userEvaluate = parseHumanMath(userExpr);
    } catch (e) {
        feedback.className = 'feedback warn';
        feedback.textContent = "Invalid syntax — check your expression.";
        return;
    }

    const testPoints = [-9.5, -5, -2.5, -1, 0, 1, 2.5, 5, 9.5];
    let isMatch = true;

    for (const x of testPoints) {
        const expectedY = currentFunction.evaluate(x);
        const userY = userEvaluate(x);

        const expectedInvalid = !isFinite(expectedY); // catches NaN AND ±Infinity
        const userInvalid = !isFinite(userY);

        if (expectedInvalid && userInvalid) continue;   // both blow up at this x — fine
        if (expectedInvalid || userInvalid) {
            isMatch = false;
            break;
        }
        if (Math.abs(expectedY - userY) > 1e-2) {
            isMatch = false;
            break;
        }
    }

    hasGuessed = true;
    userInput.disabled = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("hidden");
    newGameBtn.classList.remove("hidden");
    feedback.className = 'feedback';

    if (isMatch) {
        streak++;
        const points = 10 + (streak - 1) * 5;
        score += points;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('curveGameBestScore', String(bestScore));
            flashStat(bestScoreVal);
        }
        if (streak > bestStreak) {
            bestStreak = streak;
            localStorage.setItem('curveGameBestStreak', String(bestStreak));
            flashStat(bestStreakVal);
        }

        feedback.textContent = `Correct. +${points} points.`;
        feedback.classList.add('success');
        flashStat(scoreVal);
        flashStat(streakVal);
    } else {
        streak = 0;
        score = Math.max(0, score - 50);
        feedback.textContent = `Missed it. The curve was: ${currentFunction.humanReadable}`;
        feedback.classList.add('fail');
    }

    updateScoreUI();
}

function startNewGame() {
    currentFunction = generateFunction();
    hasGuessed = false;

    console.log("Generated:", currentFunction.type, "| Answer:", currentFunction.humanReadable);

    hintText.textContent = currentFunction.hint;
    userInput.value = '';
    userInput.disabled = false;
    feedback.textContent = '';
    feedback.style.backgroundColor = 'transparent';
    feedback.style.color = 'inherit';
    feedback.classList.add("hidden");
    submitBtn.disabled = false;
    submitBtn.classList.remove('hidden');
    newGameBtn.classList.add('hidden');
    drawGraph();
    updateScoreUI();
}

// Event Listeners
submitBtn.addEventListener('click', checkAnswer);
newGameBtn.addEventListener('click', startNewGame);
themeToggle.addEventListener('click', toggleTheme);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !hasGuessed) checkAnswer();
    // if (e.key === 'Enter' && hasGuessed) startNewGame();
});

// Initialize
const now = new Date();

const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const weekday = days[now.getDay()];

const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const yyyy = now.getFullYear();

dateSpan.textContent = `${weekday} ${dd}.${mm}.${yyyy}`;
if (isDarkMode) document.body.classList.add('dark-mode');
startNewGame();
updateScoreUI();
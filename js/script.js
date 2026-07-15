// Constants
const CANVAS_SIZE = 400;
const SCALE = 20; // Pixels per unit (-10 to 10 range on the x axis)
const CENTER = CANVAS_SIZE / 2;
const X_MIN = -10;
const X_MAX = 10;

const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
const userInput = document.getElementById("userGuess");
const submitBtn = document.getElementById("submitBtn");
const newGameBtn = document.getElementById("newGameBtn");
const feedback = document.getElementById("feedback");
const hintText = document.getElementById("hintText");

// Variables
let currentFunction = null;
let hasGuessed = false;

// Logic and Math
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNonZeroInt(min, max) {
    let val = getRandomInt(min, max);
    return val === 0 ? 1 : val; // Prevent flat lines for multipliers
}

function generateFunction() {
    const types = [
        "linear",
        "quadratic",
        "cubic",
        "sine",
        "cosine",
        "tangent",
        "exponential",
        "absolute",
        "rational",
        "square_root"
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
                if (Math.abs(Math.cos(val)) < 0.001) return NaN; // Prevent drawing exactly at asymptotes
                return a * Math.tan(val) + c;
            };
            humanReadable = `${formatTerm(a, "tan(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`;
            hint = "Type: Tangent function (e.g., 2tan(x) + 1)";
            break;
        case "exponential":
            evaluate = (x) => a * Math.exp(b * x) + c;
            humanReadable = `${formatTerm(a, "e^(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`
            hint = "Type: Exponential (e.g., 2e^x + 1 or e^(2x))"
            break;
        case "absolute":
            evaluate = (x) => a * Math.abs(b * x + c) + d;
            humanReadable = `${formatTerm(a, "|", true)}${formatTerm(b, "x", false)}${formatTerm(c, "|", false)}${formatTerm(d, "", false)}`;
            hint = "Type: Absolute value (e.g., |2x + 1| or 2|x| - 3)";
            break;
        case "rational":
            evaluate = (x) => {
                if (Math.abs(x + b) < 0.001) return NaN;
                return a / (x + b) + c;
            };
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
            const inner = c === 0 ? "x" : `(x${c < 0 ? c : '+' + c})`;
            humanReadable = `${formatTerm(a, `sqrt(${inner})`, true)}${formatTerm(d, "", false)}`;
            hint = "Type: Square root (e.g., 2sqrt(x) or sqrt(x-1) + 3)";
    }

    // Fallback for when all terms cancel out (rare, but possible)
    if (humanReadable === "") humanReadable = "0";

    return { evaluate, humanReadable, hint, type };
}

// Helper to format math beautifully (e.g., "2x^2 - 3x + 1" instead of "2*x**2 + -3*x + 1")
function formatTerm(coeff, varPart, isFirst) {
    if (coeff === 0) return "";
    const sign = coeff > 0 ? (isFirst ? "" : " + ") : (isFirst ? "-" : " - ");
    const absCoeff = Math.abs(coeff);
    // Hide coefficient '1' unless it's a standalone number or absolute value bar
    const coeffStr = (absCoeff === 1 && varPart !== "" && varPart !== "|") ? "" : absCoeff;

    return `${sign}${coeffStr}${varPart}`;
}

function parseHumanMath(expr) {
    let jsExpr = expr.toLowerCase().trim();

    // Handle implicit multiplication (digit-letter, letter-digit) FIRST
    // This turns "3sqrt" into "3*sqrt" and "2x" into "2*x"
    jsExpr = jsExpr.replace(/(\d)([a-z])/gi, '$1*$2');
    jsExpr = jsExpr.replace(/([a-z])(\d)/gi, '$1*$2');

    // Replace functions with safe placeholders
    // This prevents later regex rules from breaking "Math.sin" into "Math.sin*"
    jsExpr = jsExpr.replace(/\bsin\b/gi, '__SIN__');
    jsExpr = jsExpr.replace(/\bcos\b/gi, '__COS__');
    jsExpr = jsExpr.replace(/\btan\b/gi, '__TAN__');
    jsExpr = jsExpr.replace(/\babs\b/gi, '__ABS__');
    jsExpr = jsExpr.replace(/\bsqrt\b/gi, '__SQRT__');
    jsExpr = jsExpr.replace(/\blog\b/gi, '__LOG__');
    jsExpr = jsExpr.replace(/\bexp\b/gi, '__EXP__');

    // Handle absolute value notation
    jsExpr = jsExpr.replace(/\|([^|]+)\|/g, 'Math.abs($1)');

    // Replace ^ with **
    jsExpr = jsExpr.replace(/\^/g, '**');
    
    // Handle remaining implicit multiplication
    jsExpr = jsExpr.replace(/(\d)\(/g, '$1*(');         // 2( -> 2*(
    jsExpr = jsExpr.replace(/\)(\d)/g, ')*$1');         // )2 -> )*2
    jsExpr = jsExpr.replace(/\)\(/g, ')*(');            // )( -> )*(
    jsExpr = jsExpr.replace(/([a-z])\(/gi, '$1*(');     // x( -> x*( (Safe now, functions are __SIN__)
    jsExpr = jsExpr.replace(/\)([a-z])/gi, ')*$1');     // )x -> )*x

    // Restore functions to Math.* equivalents
    jsExpr = jsExpr.replace(/__SIN__/gi, 'Math.sin');
    jsExpr = jsExpr.replace(/__COS__/gi, 'Math.cos');
    jsExpr = jsExpr.replace(/__TAN__/gi, 'Math.tan');
    jsExpr = jsExpr.replace(/__ABS__/gi, 'Math.abs');
    jsExpr = jsExpr.replace(/__SQRT__/gi, 'Math.sqrt');
    jsExpr = jsExpr.replace(/__LOG__/gi, 'Math.log');
    jsExpr = jsExpr.replace(/__EXP__/gi, 'Math.exp');

    // Handle standalone 'e' as Euler's number and 'pi' as Math.PI
    jsExpr = jsExpr.replace(/(?<![a-z])e(?![a-z])/gi, 'Math.E');
    jsExpr = jsExpr.replace(/\bpi\b/gi, 'Math.PI');

    // STRICT SANITIZATION: Only allow safe characters
    const safeRegex = /^(?:[0-9x\.\+\-\*\/\(\)\s]|Math\.(?:sin|cos|tan|abs|sqrt|log|exp|PI|E))+$/i;
    if (!safeRegex.test(jsExpr)) {
        throw new Error("Invalid characters. Use only x, numbers, +, -, *, /, ^, and functions like sin, cos, abs.");
    }

    // Compile into a safe, executable function
    return new Function('x', `return ${jsExpr};`);
}

// Graphing and display
function toCanvasX(x) { return CENTER + x * SCALE; }
function toCanvasY(y) { return CENTER - y * SCALE; }

function drawGraph() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "rgb(160, 160, 160)";
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

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CENTER); ctx.lineTo(CANVAS_SIZE, CENTER);
    ctx.moveTo(CENTER, 0); ctx.lineTo(CENTER, CANVAS_SIZE);
    ctx.stroke();

    if (!currentFunction) return;

    ctx.strokeStyle = "#39b5e6";
    ctx.lineWidth = 3;
    ctx.beginPath();

    let firstPoint = true;
    let lastY = 0;

    for (let x = X_MIN; x <= X_MAX; x += 0.05) {
        const y = currentFunction.evaluate(x);
        const cx = toCanvasX(x);
        const cy = toCanvasY(y);

        // Check if point is way off screen OR if there's a huge jump (discontinuity)
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

function checkAnswer () {
    if (hasGuessed) return;

    const userExpr = userInput.value.trim();
    if (!userExpr) {
        feedback.textContent = "Please enter and expression.";
        feedback.style.backgroundColor = "rgba(255, 193, 7, 0.2)";
        feedback.style.color = "#ffc107";
        return;
    }

    let userEvaluate;
    try {
        userEvaluate = parseHumanMath(userExpr);
    }

    catch (e) {
        feedback.textContent = "Invald syntax. Check your expression (e.g., use 'x', not 'X'.)";
        feedback.style.backgroundColor = "rgba(255, 193, 7, 0.2)";
        feedback.style.color = "#ffc107";
        return;
    }

    // Test at multiple points to verify mathematical equivalence
    const testPoints = [-9.5, -5, -2.5, -1, 0, 1, 2.5, 5, 9.5];
    let isMatch = true;

    for (const x of testPoints) {
        const expectedY = currentFunction.evaluate(x);
        const userY = userEvaluate(x);

        if (isNaN(expectedY) && isNaN(userY)) continue;

        if (isNaN(expectedY) || isNaN(userY)) {
            isMatch = false;
            break;
        }

        if (Math.abs(expectedY - userY) > 1e-4) {
            isMatch = false;
            break;
        }
    }

    hasGuessed = true;
    userInput.disabled = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("hidden");
    newGameBtn.classList.remove("hidden");

    if (isMatch) {
        feedback.textContent = "Correct! 🎉 Great job!";
        feedback.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
        feedback.style.color = "#28a745";
    }

    else {
        feedback.textContent = `Incorrect. The correct answer was: ${currentFunction.humanReadable}`;
        feedback.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
        feedback.style.color = "#dc3545";
    }
}

function startNewGame() {
    currentFunction = generateFunction();
    hasGuessed = false;

    // TODO: Remove this debugging stuff
    console.log("Function generated:");
    console.log("Type:", currentFunction.type);
    console.log("Answer:", currentFunction.humanReadable);
    console.log("Hint:", currentFunction.hint);

    hintText.textContent = currentFunction.hint;
    userInput.value = '';
    userInput.disabled = false;
    feedback.textContent = '';
    feedback.style.backgroundColor = 'transparent';
    feedback.style.color = 'inherit';


    submitBtn.disabled = false;
    submitBtn.classList.remove('hidden');
    newGameBtn.classList.add('hidden');

    drawGraph();
}

// Event Listeners
// TODO: Add missing funtion (checkAnswer)
submitBtn.addEventListener('click', checkAnswer);
newGameBtn.addEventListener('click', startNewGame);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !hasGuessed) checkAnswer();
});

// Initialize
startNewGame();
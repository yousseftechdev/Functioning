// Constants
const CANVAS_SIZE = 400;
const SCALE = 20; // Pixels per unit (-10 to 10 range on the x axis)
const CENTER = CANVAS_SIZE / 2;
const X_MIN = -10
const X_MAX = 10

const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
const userInput = document.getElementById("userGuess");
const submitBtn = document.getElementById("submitBtn");
const newGameBtn = document.getElementById("newGameBtn");
const feedback = document.getElementById("feedback");
const hintText = document.getElementById("hintText");

// Variables
let currentFunction = null
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
    // TODO: Add the rest of the function types and make generation more flexible
    const types = [
        "linear",
        "quadratic",
        "cubic",
        "sine",
        "cosine",
        // "tangent",
        "exponential",
        "absolute",
        "rational"
    ];
    // Setting the type index to a variable to log out for debugging purposes
    // TODO: Remove that index later
    let index = getRandomInt(0, types.length - 1)
    console.log(index)
    const type = types[index];

    let evaluate, humanReadable, hint;
    const a = getNonZeroInt(-3, 3) || 1;
    const b = getNonZeroInt(-3, 3) || 1;
    const c = getNonZeroInt(-3, 3) || 1;
    const d = getNonZeroInt(-3, 3);

    switch (type) {
        case "linear":
            evaluate = (x) => a * x + b;
            humanReadable = `${formatTerm(a, "X", true)}${formatTerm(b, "", false)}`;
            hint = "Type: Linear (e.g., 2x + 3 or -x + 1)";
            break;

        case "quadratic":
            evaluate = (x) => a * Math.pow(x, 2) + b * x + c;
            humanReadable = `${formatTerm(a, "x^2", true)}${formatTerm(b, "x", false)}${formatTerm(c, "", false)}`
            hint = "Type: Quadratic (e.g., 2x^2 + 3x +1)"
            break;

        case "cubic":
            evaluate = (x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;
            humanReadable = `${formatTerm(a, 'x^3', true)}${formatTerm(b, 'x^2', false)}${formatTerm(c, 'x', false)}${formatTerm(d, '', false)}`;
            hint = "Type: Cubic (e.g., x^3 - 2x^2 + x - 1)";
            break;
        case "sine":
            evaluate = (x) => a * Math.sin(b * x) + c
            humanReadable = `${formatTerm(a, "sin(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`
            hint = "Type: Sine wave (e.g., 2sin(x) + 1)"
            break;
        case "cosine":
            evaluate = (x) => a * Math.cos(b * x) + c
            humanReadable = `${formatTerm(a, "cos(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`
            hint = "Type: Cosine wave (e.g., 2cos(x) + 1)"
            break;
        // case "tangent":
        //     evaluate = (x) => a * Math.tan(b * x) + c
        //     humanReadable = `${formatTerm(a, "tan(" + (b !== 1 ? b + "x" : "x") + ")", true)}${formatTerm(c, "", false)}`
        //     hint = "Type: Tangent function (e.g., 2tan(x) + 1)"
        //     break;
        case "exponential":
            evaluate = (x) => a * Math.exp(b *x) + c;
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
            humanReadable = `${a}/(x${b <= 0 ? '+' + b : b})${formatTerm(c, "", false)}`;
            hint = "Type: Rational (e.g., 2/(x+1) + 3 or 1/x - 2";
            break;
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
    const coeffStr = (absCoeff === 1 && varPart !== "") ? "" : absCoeff;
    return `${sign}${coeffStr}${varPart}`;
}

function parseHumanMath(expr) {
    let jsExpr = expr.toLowerCase().trim();

    // Replace human math functions with Math.* equivalents
    jsExpr = jsExpr.replace(/\bsin\b/g, 'Math.sin');
    jsExpr = jsExpr.replace(/\bcos\b/g, 'Math.cos');
    jsExpr = jsExpr.replace(/\btan\b/g, 'Math.tan');
    jsExpr = jsExpr.replace(/\babs\b/g, 'Math.abs');
    jsExpr = jsExpr.replace(/\bsqrt\b/g, 'Math.sqrt');
    jsExpr = jsExpr.replace(/\blog\b/g, 'Math.log');
    jsExpr = jsExpr.replace(/\bexp\b/g, 'Math.exp');
    
    // Handle absolute value notation |...|
    jsExpr = jsExpr.replace(/\|([^|]+)\|/g, 'Math.abs($1)');

    // Replace ^ with ** (JS exponentiation)
    jsExpr = jsExpr.replace(/\^/g, '**');
    
    // Handle implicit multiplication
    jsExpr = jsExpr.replace(/(\d)([a-z])/g, '$1*$2');   // 2x -> 2*x
    jsExpr = jsExpr.replace(/([a-z])(\d)/g, '$1*$2');   // x2 -> x*2
    jsExpr = jsExpr.replace(/(\d)\(/g, '$1*(');         // 2( -> 2*(
    jsExpr = jsExpr.replace(/\)(\d)/g, ')*$1');         // )2 -> )*2
    jsExpr = jsExpr.replace(/\)\(/g, ')*(');            // )( -> )*(
    jsExpr = jsExpr.replace(/([a-z])\(/g, '$1*(');      // x( -> x*(
    jsExpr = jsExpr.replace(/\)([a-z])/g, ')*$1');      // )x -> )*x
    
    // Handle standalone 'e' as Euler's number (if not part of 'exp' or 'sqrt')
    // We do this after function replacement to avoid breaking 'exp'
    jsExpr = jsExpr.replace(/(?<![a-z])e(?![a-z])/g, 'Math.E');

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
    
    submitBtn.disabled = false;
    submitBtn.classList.remove('hidden');
    newGameBtn.classList.add('hidden');
    
    drawGraph();
}

// Event Listeners
// TODO: Add missing funtion (checkAnswer)
// submitBtn.addEventListener('click', checkAnswer);
newGameBtn.addEventListener('click', startNewGame);

// userInput.addEventListener('keypress', (e) => {
//     if (e.key === 'Enter' && !hasGuessed) checkAnswer();
// });

// Initialize
startNewGame();
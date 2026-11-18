"use strict";

const display = document.querySelector("#display");
const expression = document.querySelector("#expression");
const keypad = document.querySelector(".keypad");
const buttons = new Map([...keypad.querySelectorAll("button")].map(button => [button.dataset.key, button]));
const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const operators = {
  "+": (left, right) => left + right,
  "-": (left, right) => left - right,
  "*": (left, right) => left * right,
  "/": (left, right) => left / right
};
const maxDigits = 15;
let entry, tokens, result, error, completed;

// Store the number being typed separately from completed operands and operators.
function reset() {
  entry = "";
  tokens = [];
  result = null;
  error = "";
  completed = "";
}
function render() {
  const value = error ? "Error" : entry || result || "0";
  expression.textContent = error || completed || tokens.map(token => symbols[token] || token).join(" ");
  display.textContent = value;
  display.classList.toggle("compact", value.length > 9);
}

// Evaluate in two passes so multiplication and division have standard precedence.
function evaluate(items) {
  const terms = [Number(items[0])];
  const additions = [];
  for (let i = 1; i < items.length; i += 2) {
    const operator = items[i];
    const right = Number(items[i + 1]);
    if (operator === "/" && right === 0) throw new Error("Cannot divide by zero");
    if (operator === "*" || operator === "/") {
      terms.push(operators[operator](terms.pop(), right));
    } else {
      additions.push(operator);
      terms.push(right);
    }
  }
  const answer = additions.reduce((left, op, i) => operators[op](left, terms[i + 1]), terms[0]);
  if (!Number.isFinite(answer)) throw new Error("Result is out of range");
  // Round floating-point noise such as 0.1 + 0.2 before displaying.
  return String(Number(answer.toPrecision(maxDigits)));
}

function typeNumber(key) {
  if (result !== null || error) reset();
  if (key === ".") {
    if (!entry.includes(".")) entry = (entry || "0") + ".";
  } else if (entry === "0") {
    entry = key;
  } else if (entry.replace(".", "").length < maxDigits) {
    entry += key;
  }
}

function addOperator(key) {
  if (error) return;
  if (result !== null) {
    tokens.push(result, key);
    result = null;
    completed = "";
  } else if (entry) {
    tokens.push(entry, key);
    entry = "";
  } else if (tokens.length) {
    tokens[tokens.length - 1] = key;
  } else {
    tokens.push("0", key);
  }
}

function removeLast() {
  if (error || result !== null) { reset(); return; }
  if (entry) entry = entry.slice(0, -1);
  else if (tokens.length) {
    tokens.pop();
    entry = tokens.pop();
    // If this operand came from a rounded result, do not edit its exponent.
    if (entry.includes("e") || entry.startsWith("-")) {
      if (!tokens.length) result = entry;
      entry = "";
    }
  }
}

function calculate() {
  if (!entry || error || !tokens.length) return;
  const items = [...tokens, entry];
  try {
    result = evaluate(items);
    completed = items.map(token => symbols[token] || token).join(" ") + " =";
  } catch (issue) {
    error = issue.message;
  }
  entry = "";
  tokens = [];
}

function handleKey(key) {
  if (key === "AC") reset();
  else if (key === "Backspace") removeLast();
  else if (key === "=") calculate();
  else if (Object.hasOwn(operators, key)) addOperator(key);
  else if (/^[0-9.]$/.test(key)) typeNumber(key);
  render();
}

// Clicks and physical keys share the same action handler.
const feedbackTimers = new WeakMap();
function flash(button) {
  clearTimeout(feedbackTimers.get(button));
  button.classList.add("pressed");
  feedbackTimers.set(button, setTimeout(() => button.classList.remove("pressed"), 135));
}
keypad.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (button) { handleKey(button.dataset.key); flash(button); }
});
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
  const aliases = { Enter: "=", Escape: "AC", Delete: "AC", c: "AC", C: "AC", x: "*", X: "*" };
  const key = Object.hasOwn(aliases, event.key) ? aliases[event.key] : event.key;
  const button = buttons.get(key);
  if (!button) return;
  event.preventDefault();
  handleKey(key);
  flash(button);
});
reset();
render();

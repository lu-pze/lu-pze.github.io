'use strict';

const NOF_CONSTANT_VARIABLES = 1; // We have 'e'. Shall not make a slider for that one.
const UNSET_SLIDER = 18012001; // In range_slider_variables: this variable has no slider value yet.
let range_slider_variables = [2.718281828459045, ...Array(41).fill(UNSET_SLIDER)];
let range_slider_alphabet = ['e','a','b','c','f','g','h','j','l','L','m','n','o','p','q','r','t','u','v','x','y','k_1','k_2','k_3','k_4','k_5','k_6','w','z','K','T_1','T_2','T_3','T_4','T_5','T_6','T_7','T_8','T_i','T_d'];
// To go from "T_1" to the index in range_slider_variables:
let variable_position = {};
function slider_value(name){
  return range_slider_variables[variable_position[name]];
}
let input_formula = "1/s";

// Functions a formula may call. A name only counts as a function when "(" follows it, so a
// formula like "cos" still means c*o*s.
const FORMULA_FUNCTIONS = ['sqrt','exp','log','sin','cos','tan','abs'];
// Product signs MathLive has produced in the past; they become "*".
const PRODUCT_SIGNS = ['⋅','·'];
// Compiled formulas by formula text. Every edit in a MathLive field adds one, so the cache is
// emptied when it gets this big.
const MAX_COMPILED_FORMULAS = 500;
let compiled_formulas = new Map();

// MathLive's ascii-math writes products without a sign: "T_2s", "Kk_1", "2zws", "(1+s)e^(-Ls)".
// math.js reads "T_2s" as one symbol and "(3)/(1+s)e^(-Ls)" as 3/((1+s)e^(-Ls)), so split the text
// into numbers, known names, functions and operators, and write "*" between adjacent operands.
// The first matching name is taken; this relies on no name being the start of another
// (tests/transfer_math.test.js checks it). Whitespace is dropped.
function insert_explicit_multiplication(formula){
  const names = [...range_slider_alphabet,'s','i'];
  let output = '';
  let previous_ends_operand = false;
  let pos = 0;
  while (pos < formula.length){
    const rest = formula.slice(pos);
    if (/^\s/.test(rest)){
      pos += 1;
      continue;
    }
    const number = rest.match(/^(\d+\.?\d*|\.\d+)/);
    const function_name = FORMULA_FUNCTIONS.find((name) => rest.startsWith(name + '('));
    const name = names.find((candidate) => rest.startsWith(candidate));
    let token = rest[0];
    let starts_operand = false;
    let ends_operand = false;
    if (number){
      token = number[0];
      starts_operand = ends_operand = true;
    } else if (function_name){
      token = function_name;
      starts_operand = true;
    } else if (name){
      token = name;
      starts_operand = ends_operand = true;
    } else if (/^[A-Za-z]/.test(rest)){
      // An unknown letter is still an operand; math.js reports it as an undefined symbol.
      starts_operand = ends_operand = true;
    } else if (token == '('){
      starts_operand = true;
    } else if (token == ')'){
      ends_operand = true;
    }
    pos += token.length;
    if (PRODUCT_SIGNS.includes(token)) token = '*';
    if (previous_ends_operand && starts_operand) output += '*';
    output += token;
    previous_ends_operand = ends_operand;
  }
  return output;
}

// Parses and compiles a formula once and remembers which symbols it uses (function names
// such as "sqrt" are listed too; bind_formula skips them). Throws math.js's syntax error for a
// formula that cannot be parsed.
function compile_formula(formula){
  let compiled = compiled_formulas.get(formula);
  if (compiled === undefined){
    const node = math.parse(insert_explicit_multiplication(formula));
    const symbols = new Set(node.filter((child) => child.isSymbolNode).map((child) => child.name));
    compiled = {node: node, code: node.compile(), symbols: [...symbols]};
    if (compiled_formulas.size >= MAX_COMPILED_FORMULAS) compiled_formulas.clear();
    compiled_formulas.set(formula, compiled);
  }
  return compiled;
}

// The variables of range_slider_alphabet that a formula uses, or null if it cannot be parsed.
// Comes from the parsed formula, because a search in its text also finds the x and p of "exp(".
function formula_variables(formula){
  try{
    return compile_formula(formula).symbols.filter((name) => range_slider_alphabet.includes(name));
  } catch(error){
    return null;
  }
}

// Compiles a formula and binds the current slider values of the variables it uses:
// {node, code, scope}. Returns null when one of those sliders has no value yet.
// A formula that cannot be parsed gets a binding whose evaluation throws (and no node), so
// getComplexValues returns 0 for it, as it did before formulas were compiled.
function bind_formula(formula){
  let compiled;
  try{
    compiled = compile_formula(formula);
  } catch(error){
    return {node: null, code: {evaluate: () => { throw error; }}, scope: {}};
  }
  const scope = {};
  for (const name of compiled.symbols){
    const position = range_slider_alphabet.indexOf(name);
    if (position < 0) continue; // s, i, or a symbol math.js resolves (or reports) itself
    if (range_slider_variables[position] == UNSET_SLIDER) return null;
    scope[name] = Number(range_slider_variables[position]);
  }
  return {node: compiled.node, code: compiled.code, scope: scope};
}

// The bound formula's value at s (a number or a math.complex).
function evaluate_formula(binding, s){
  binding.scope.s = s;
  return binding.code.evaluate(binding.scope);
}

// G(j*freq) as a math.complex; 0 when the formula cannot be evaluated.
function getComplexValues(binding, freq){
  try{
    return math.complex(evaluate_formula(binding, math.complex(0,freq)));
  }
  catch(error){
    return math.complex(0,0);
  }
}

// |G(j*freq)| in dB, or NaN when the formula cannot be evaluated.
function gain_db_at(binding, freq){
  try{
    return 20*Math.log(math.complex(evaluate_formula(binding, math.complex(0,freq))).toPolar().r)/Math.log(10);
  }
  catch(error){
    return NaN;
  }
}

// Gaver-Stehfest inverse Laplace transform of the bound formula (which already contains the
// input signal) at `time`, delayed by `time_delay`.
function getTimeValues(binding,time,time_delay){
  let time_to_use = time-time_delay;
  if (time_to_use < 0) return 0.0;
  let v = [1/12,-385/12,1279,-46871/3,505465/6,-473915/2,1127735/3,-1020215/3,328125/2,-65625/2];
  const ln2=0.69314718056;
  let sum = 0;
  for(let j=0; j<=9; j++){
    let new_s = (j+1)*ln2/time_to_use;
    sum += v[j]*evaluate_formula(binding, new_s);
  }
  return ln2 * sum/time_to_use;
}

// Polynomials are arrays of coefficients in ascending powers of s: [a_0, a_1, ...].
function poly_add(a, b, sign){
  const sum = [];
  // Missing coefficients are 0; not "|| 0", which would also turn NaN into 0.
  const at = (p, k) => k < p.length ? p[k] : 0;
  for (let k = 0; k < Math.max(a.length, b.length); k++) sum.push(at(a, k) + sign * at(b, k));
  return sum;
}

function poly_multiply(a, b){
  const product = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++){
    for (let j = 0; j < b.length; j++) product[i + j] += a[i] * b[j];
  }
  return product;
}

// Drops leading coefficients that are 0 or negligible next to the largest one (1e-12 of it).
function poly_trim(a){
  const largest = Math.max(...a.map(Math.abs));
  let degree = a.length - 1;
  while (degree > 0 && Math.abs(a[degree]) <= 1e-12 * largest) degree--;
  return a.slice(0, degree + 1);
}

// Highest exponent accepted in s^n; larger ones are not plotted as rational functions.
const MAX_RATIONAL_EXPONENT = 50;

function not_rational(){
  return new Error('not a rational function of s');
}

// A parsed formula as a ratio of polynomials in s, {num, den}, with the slider values from
// `scope`. This is math.rationalize's job, but rationalize takes ~160 ms for (1+0.7s)^4 and throws
// on the PID closed-loop formulas, which is too slow and fragile for dragging. Throws "not a
// rational function of s" for functions (sqrt, exp), non-integer powers, the imaginary unit and
// unknown symbols. Common factors are not cancelled.
function to_rational(node, scope){
  if (node.isParenthesisNode) return to_rational(node.content, scope);
  if (node.isConstantNode && typeof node.value == 'number') return {num: [node.value], den: [1]};
  if (node.isSymbolNode){
    if (node.name == 's') return {num: [0,1], den: [1]};
    if (typeof scope[node.name] == 'number') return {num: [scope[node.name]], den: [1]};
    throw not_rational();
  }
  if (!node.isOperatorNode) throw not_rational();
  const args = node.args.map((arg) => to_rational(arg, scope));
  const [a, b] = args;
  switch (node.fn){
    case 'unaryPlus': return a;
    case 'unaryMinus': return {num: a.num.map((c) => -c), den: a.den};
    case 'add': return {num: poly_add(poly_multiply(a.num, b.den), poly_multiply(b.num, a.den), 1), den: poly_multiply(a.den, b.den)};
    case 'subtract': return {num: poly_add(poly_multiply(a.num, b.den), poly_multiply(b.num, a.den), -1), den: poly_multiply(a.den, b.den)};
    case 'multiply': return {num: poly_multiply(a.num, b.num), den: poly_multiply(a.den, b.den)};
    case 'divide': return {num: poly_multiply(a.num, b.den), den: poly_multiply(a.den, b.num)};
    case 'pow': {
      const exponent_num = poly_trim(b.num);
      const exponent_den = poly_trim(b.den);
      if (exponent_num.length != 1 || exponent_den.length != 1) throw not_rational();
      const exponent = exponent_num[0] / exponent_den[0];
      if (!Number.isInteger(exponent) || Math.abs(exponent) > MAX_RATIONAL_EXPONENT) throw not_rational();
      let power = {num: [1], den: [1]};
      for (let k = 0; k < Math.abs(exponent); k++) power = {num: poly_multiply(power.num, a.num), den: poly_multiply(power.den, a.den)};
      return exponent >= 0 ? power : {num: power.den, den: power.num};
    }
    default: throw not_rational();
  }
}

const strip_parentheses = (node) => node.isParenthesisNode ? strip_parentheses(node.content) : node;

// The delay L of a factor e^(-L*s) or exp(-L*s), or null when the node is not such a factor.
function delay_of_factor(node, scope){
  let exponent = null;
  const base = node.isOperatorNode && node.fn == 'pow' ? strip_parentheses(node.args[0]) : null;
  if (base && base.isSymbolNode && base.name == 'e') exponent = node.args[1];
  if (node.isFunctionNode && node.fn.name == 'exp' && node.args.length == 1) exponent = node.args[0];
  if (exponent === null) return null;
  let rational;
  try{
    rational = to_rational(exponent, scope);
  } catch(error){
    return null;
  }
  const num = poly_trim(rational.num);
  const den = poly_trim(rational.den);
  // The exponent must be c*s: degree 1, no constant term, constant denominator.
  if (num.length != 2 || num[0] != 0 || den.length != 1) return null;
  return -num[1] / den[0];
}

// Splits time-delay factors e^(-L*s) off a parsed formula: {node: the rest, delay: the total L}.
// A factor counts when the rest of the formula is multiplied by it, also in the numerator of a
// division; inside a sum it stays where it is. A negative delay is ignored (set to 0), as before.
function split_time_delay(node, scope){
  if (node.isParenthesisNode){
    const inner = split_time_delay(node.content, scope);
    return {node: new math.ParenthesisNode(inner.node), delay: inner.delay};
  }
  if (node.isOperatorNode && node.fn == 'multiply' && node.args.length == 2){
    const left = split_time_delay(node.args[0], scope);
    const right = split_time_delay(node.args[1], scope);
    return {node: new math.OperatorNode('*', 'multiply', [left.node, right.node]), delay: left.delay + right.delay};
  }
  if (node.isOperatorNode && node.fn == 'divide'){
    const numerator = split_time_delay(node.args[0], scope);
    return {node: new math.OperatorNode('/', 'divide', [numerator.node, node.args[1]]), delay: numerator.delay};
  }
  const delay = delay_of_factor(node, scope);
  if (delay === null) return {node: node, delay: 0};
  return {node: new math.ConstantNode(1), delay: Math.max(0, delay)};
}

// y(t) at `times` (evenly spaced, starting at 0) of the impulse response of num/den, delayed by
// `delay`. Uses the controllable canonical state-space form (A, B, C) of the strictly proper part:
// y(t) = C*e^(A*t)*B, stepped with Phi = e^(A*dt), which is exact for repeated, complex and
// unstable poles alike. The polynomial part of an improper num/den (impulses at t = 0) is left out.
// Throws when the coefficients are not finite.
function rational_impulse_response(rational, delay, times){
  const den = poly_trim(rational.den);
  const order = den.length - 1;
  const leading = den[order];
  if (leading == 0 || ![...den, ...rational.num].every(Number.isFinite)) throw not_rational();
  if (order == 0) return times.map(() => 0);
  // Remainder of num divided by den, over a monic den.
  const remainder = rational.num.map((c) => c / leading);
  const monic = den.map((c) => c / leading);
  for (let k = remainder.length - 1; k >= order; k--){
    const factor = remainder[k];
    for (let j = 0; j <= order; j++) remainder[k - order + j] -= factor * monic[j];
  }
  const C = remainder.slice(0, order);
  while (C.length < order) C.push(0);
  const A = [];
  for (let row = 0; row < order; row++){
    A.push(new Array(order).fill(0));
    if (row < order - 1) A[row][row + 1] = 1;
  }
  for (let col = 0; col < order; col++) A[order - 1][col] = -monic[col];
  const exp_A = (t) => math.expm(math.matrix(A.map((row) => row.map((c) => c * t)))).toArray();
  const multiply = (M, v) => M.map((row) => row.reduce((sum, c, j) => sum + c * v[j], 0));
  const dt = times.length > 1 ? times[1] - times[0] : 0;
  const phi = exp_A(dt);
  let state = null;
  return times.map((t) => {
    if (t < delay) return 0;
    if (state === null){
      // First sample after the delay: start from e^(A*(t-L))*B, which may lie between two samples.
      const B = new Array(order).fill(0);
      B[order - 1] = 1;
      state = multiply(exp_A(t - delay), B);
    } else {
      state = multiply(phi, state);
    }
    return C.reduce((sum, c, j) => sum + c * state[j], 0);
  });
}

// The times [s] of a response's samples: one every `step` pixels across a plot `width` pixels wide,
// which shows `max_time` seconds. The width is rarely a multiple of `step`, so the samples stop
// short of max_time, by less than `step` pixels.
function time_samples(width, step, max_time){
  const times = [];
  for (let x = 0; x < width; x += step) times.push(x/width*max_time);
  return times;
}

// The response at `times` (evenly spaced, starting at 0) of `formula` to the input signal `input`,
// both formula text in s ("1/s" is a unit step). Exact when (input)*(formula) is a rational function
// of s times a delay e^(-L*s); otherwise Gaver-Stehfest on the rest of the formula, as before, with
// t = 0 replaced by 0.00001. Returns null when a slider the formulas use has no value.
function time_response(input, formula, times){
  const binding = bind_formula("(" + input + ")*(" + formula + ")");
  if (binding === null) return null;
  if (binding.node === null) return times.map((t) => getTimeValues(binding, t, 0)); // throws, as before
  const split = split_time_delay(binding.node, binding.scope);
  try{
    return rational_impulse_response(to_rational(split.node, binding.scope), split.delay, times);
  } catch(error){
    const rest = {code: split.node.compile(), scope: binding.scope};
    return times.map((t) => getTimeValues(rest, t == 0 ? 0.00001 : t, split.delay));
  }
}

// Roots of a polynomial (ascending coefficients) as [{re, im}], from the eigenvalues of its
// companion matrix (as BOWDE does; math.polynomialRoot only handles degree 3 and below).
// A repeated root comes out spread by about 1e-3 relative, which does not show in the map.
function polynomial_roots(coefficients){
  const c = poly_trim(coefficients);
  const degree = c.length - 1;
  if (degree < 1) return [];
  const companion = [];
  for (let row = 0; row < degree; row++){
    companion.push(new Array(degree).fill(0));
    if (row > 0) companion[row][row - 1] = 1;
    companion[row][degree - 1] = -c[row]/c[degree];
  }
  return math.eigs(companion).values.map((value) => {
    const root = math.complex(value);
    return {re: root.re, im: root.im};
  });
}

// Poles and zeros of a bound formula, {poles: [{re, im}], zeros: [{re, im}]}, or null when it is
// not a rational function of s (a delay e^(-L*s) is split off first: it has neither), when a
// slider is unset (binding null) or when the formula cannot be parsed.
function poles_and_zeros(binding){
  if (binding === null || binding.node === null) return null;
  try{
    const split = split_time_delay(binding.node, binding.scope);
    const rational = to_rational(split.node, binding.scope);
    if (![...rational.num, ...rational.den].every(Number.isFinite)) return null;
    return {poles: polynomial_roots(rational.den), zeros: polynomial_roots(rational.num)};
  } catch(error){
    return null;
  }
}

// The total delay L [s] of the e^(-L*s) factors of a bound formula, 0 if it cannot be parsed.
function formula_delay(binding){
  return binding.node === null ? 0 : split_time_delay(binding.node, binding.scope).delay;
}

// The axis range [min, max] of a closed-form response that runs between 0 and `gain`, or between 0
// and -gain when `towards_gain` is false.
function gain_range(gain, towards_gain){
  if (gain > 0) return towards_gain ? [0, gain] : [-gain, 0];
  return towards_gain ? [gain, 0] : [0, -gain];
}

// k_1/(T_1*s+1): {values, range} at `times`, or null for an input other than a step or an impulse.
function one_real_pole_response(input, k_1, T_1, times){
  if (input === "1/s"){       // Unit Step response
    // Step input response for
    //     w_0              1
    //   -------  =      -----------
    //   s + w_0          s/w_0 + 1
    // v_out(t) = V_i * (1 - e^{-\omega_{0}*t})}
//        if (T_1 >= 0){
    // With T_1 = 0 the system is the constant k_1 (and exp(-0/0) would be NaN at t = 0):
    const values = times.map((t) => (T_1 === 0) ? k_1 : k_1 * (1.0 - Math.exp(-t / T_1)));
    return {values, range: gain_range(k_1, T_1 >= 0)};
  }
  if (input === "1"){      // Dirac Impulse response:
    // k_1/(1+T_1*s) = (k_1/T_1)/(s+1/T_1), so h(t) = k_1/T_1 * e^(-t/T_1).
    // With T_1 = 0 the system is the constant k_1: only an impulse at t = 0, so 0 after it.
    const h_0 = (T_1 === 0) ? 0 : k_1 / T_1;
    const values = times.map((t) => (T_1 === 0) ? 0 : h_0 * Math.exp(-t / T_1));
    // Decays from h_0 towards 0:
    if (T_1 >= 0) return {values, range: [Math.min(h_0, 0), Math.max(h_0, 0)]};
    // Negative T: grows without bound, so the axis is capped at 20 as before:
    return {values, range: (h_0 > 0) ? [0, 20] : [-20, 0]};
  }
  return null;
}

// k_2/(T_2s+1)*1/(T_3s+1): {values, range} at `times`, or null without a closed form.
function two_real_poles_response(input, k_2, T_2, T_3, times){
  // The closed forms divide by T_2, T_3 and 1/T_3 - 1/T_2. A double pole, or a T of 0, goes to time_response.
  if ((T_2 === T_3) || (T_2 === 0) || (T_3 === 0)) return null;
  // Stable poles or two unstable poles; otherwise one unstable pole.
  const towards_gain = ((T_2 >= 0) && (T_3 >= 0))||((T_2 <= 0) && (T_3 <= 0));
  if (input === "1/s"){       // Unit Step response
//        console.log("Doing " + this.bode_formula);
    // Step input response for
    //     w_0              1
    //   -------  =      -----------
    //   s + w_0          s/w_0 + 1
    // v_out(t) = V_i * (1 - e^{-\omega_{0}*t})}
    // Y(s)=1/(s(s-1)^2) ->
    // y(t)=1 - e^{-t} - te^{-t}
    // To find the inverse Laplace transform of the transfer function
    // https://lpsa.swarthmore.edu/LaplaceZTable/LaplaceZFuncTable.html
    // "Asymptotic double exponential"
    // 1/(s(s+a)(s+b))
    // ab / (s(1+s/a)(1+s/b))
    // Let a=1/T_2
    // let b=1/T_3
    const a = 1/T_2;
    const b = 1/T_3;
    const values = times.map((t) => k_2*(1-(b*Math.exp(-a*t) - a*Math.exp(-b*t))/(b-a)));
    return {values, range: gain_range(k_2, towards_gain)};
  }
  if (input === "1"){      // Dirac Impulse response:
    const values = times.map((t) => k_2/T_2/T_3 * (Math.exp(-t / T_2) - Math.exp(-t / T_3)) / (1/T_3 - 1/T_2));
    return {values, range: gain_range(k_2, towards_gain)};
  }
  return null;
}

// k_3*w^2/(s^2+2*z*w*s+w^2): {values, range} at `times`, or null without a closed form.
function two_complex_poles_response(input, k_3, z, w, times){
  // When z > 1, we don't have an oscillating system. We have two real poles, which isn't handled here.
  // This handles two complex conjugated poles with a damped response:
  if (!((z < 1.0) && (z >= 0))) return null;
  let values;
  if (input === "1/s"){       // Unit Step response
    // Step input response for
    //   H(s) = 1 / (s^2 + +2ζωs + w^2)
    // is
    //   h(t) = 1/(w*Math.sqrt(1-ζ^2)) * exp(-ζwt) * sin(w*Math.sqrt(1-*ζ^2)*t)
    values = times.map((t) => {
      // Calculate time-step response
      //console.log("z=" + z);
      //console.log("w=" + w);
      //console.log("k_3=" + k_3);
      const exponentTerm = Math.exp(-z*w*t);
      const sinTerm = Math.sin(w * Math.sqrt(1.0-z*z) * t + Math.acos(z));  // acos = inverse cosine (in radians)
      return k_3 * (1.0 - (1.0 / (Math.sqrt(1.0-z*z)) * exponentTerm * sinTerm));
    });
  } else if (input === "1"){      // Dirac Impulse response:
    // https://lpsa.swarthmore.edu/LaplaceZTable/LaplaceZFuncTable.html
    // "Prototype 2nd order lowpass impulse response":
    values = times.map((t) => {
      // Calculate time-step response
      const exponentTerm = Math.exp(-z*w*t);
      const sinTerm = Math.sin(w * Math.sqrt(1.0-z*z) * t);
      return k_3*w/(Math.sqrt(1-z*z)) * exponentTerm * sinTerm;
    });
  } else {
    return null;
  }
  return {values, range: value_range(values, 100000)};
}

// The closed-form response of `formula` to `input` at `times`, as {values, range: [min, max]}, or
// null when there is none. `slider` gives the value of a variable by name.
function closed_form_time_response(formula, input, times, slider){
  if (formula === GRAPH_ONE_REAL_POLE.formula){
    return one_real_pole_response(input, slider("k_1"), slider("T_1"), times);
  }
  if (formula === GRAPH_TWO_REAL_POLES.formula){
    return two_real_poles_response(input, slider("k_2"), slider("T_2"), slider("T_3"), times);
  }
  if (formula === GRAPH_TWO_COMPLEX_POLES.formula){
    return two_complex_poles_response(input, slider("k_3"), slider("z"), slider("w"), times);
  }
  return null;
}

// Unwraps a phase [rad]: `phase` plus the whole turns that bring it within half a turn of
// `previous`, which is NaN for the first sample. A step of exactly half a turn counts as falling,
// as at an undamped resonance. Two samples that really differ by more than half a turn, such as
// two undamped resonances within one pixel, cannot be told apart from a smaller step.
function continue_phase(phase, previous){
  if (Number.isNaN(previous)) return phase;
  return phase - 2*Math.PI*Math.floor((phase - previous + Math.PI)/(2*Math.PI));
}

// The frequencies [rad/s] of the Bode samples: one per pixel of a plot `width` pixels wide, whose
// log axis starts at 10^min_power and spans `decades` decades.
function bode_frequencies(width, min_power, decades){
  const frequencies = [];
  for (let x = 0; x < width; x++) frequencies.push(Math.pow(10, min_power + x*decades/width));
  return frequencies;
}

// [smallest, largest] of `values`, skipping NaN. They start at `start` and -start, so a range never
// reaches past them on its inner side: with no values, or only values below -start, the largest is -start.
function value_range(values, start){
  let smallest = start;
  let largest = -start;
  for (const value of values){
    if (value < smallest) smallest = value;
    if (value > largest) largest = value;
  }
  return [smallest, largest];
}

// G(j*omega) of the bound formula at `frequencies`: the complex values, the gain [dB], the unwrapped
// phase [rad] and the ranges of the phase and of the Nyquist curve.
function frequency_response(binding, frequencies){
  const complex = [];
  const gain = [];
  const phase = [];
  // The delay's phase -L*w is known exactly, while at high frequencies it can turn more than once between
  // two samples, which no unwrapping can follow. So only the rest of G is unwrapped.
  const delay = formula_delay(binding);
  let previous_phase = NaN;
  for (const omega of frequencies){
    const value = getComplexValues(binding, omega);
    const polar = value.toPolar();
    // On a pole G is infinite and has no phase; polar.phi is then only the angle of Infinity+Infinity*i.
    const sampled_phase = Number.isFinite(polar.r) ? polar.phi + delay*omega : NaN;
    const phase_without_delay = continue_phase(sampled_phase, previous_phase);
    if (!Number.isNaN(phase_without_delay)) previous_phase = phase_without_delay;
    complex.push(value);
    gain.push(20*Math.log(polar.r)/Math.log(10));
    phase.push(phase_without_delay - delay*omega);
  }
  return {
    complex, gain, phase,
    phase_range: value_range(phase, 10000),
    nyquist_x_range: value_range(complex.map((value) => value.re), 10000),
    nyquist_y_range: value_range(complex.map((value) => value.im), 10000),
  };
}

// Pairs [i, j] of sample indices on either side of each sign change of `values`. Samples within
// `dead_band` of 0 have no sign, so a curve that only hovers around 0 (float noise) has none.
// With `branch`, a sign change only counts between samples on the same branch.
function sign_changes(values, dead_band, branch){
  const changes = [];
  let last = -1;
  for (let i = 0; i < values.length; i++){
    if (!(Math.abs(values[i]) > dead_band)) continue; // also skips NaN
    if (last >= 0 && (values[i] > 0) != (values[last] > 0) && (!branch || branch[i] == branch[last])){
      changes.push([last, i]);
    }
    last = i;
  }
  return changes;
}

// The frequency between `low_omega` and `high_omega` where f(omega) changes sign, by bisection on log10(omega).
function refine_crossing(f, low_omega, high_omega){
  let lo = Math.log10(low_omega);
  let hi = Math.log10(high_omega);
  const positive_at_lo = f(Math.pow(10, lo)) > 0;
  for (let h = 0; h < 50; h++){
    const mid = (lo + hi)/2;
    if ((f(Math.pow(10, mid)) > 0) == positive_at_lo) lo = mid; else hi = mid;
  }
  return Math.pow(10, (lo + hi)/2);
}

// arg G(j*omega) [rad] in (-pi, pi], or NaN when the formula cannot be evaluated there.
function phase_at(binding, omega){
  try{
    return math.complex(evaluate_formula(binding, math.complex(0,omega))).arg();
  } catch(error){
    return NaN;
  }
}

// Wraps an angle in degrees into (-180, 180].
const wrap_degrees = (angle) => angle - 360*Math.ceil((angle - 180)/360);

// Of all crossings, the one with the margin closest to 0 (closest to instability), as MATLAB's
// margin() reports: [margin, frequency], or NaN when there is no crossing.
function smallest_margin(crossings){
  let best = null;
  for (const crossing of crossings){
    if (best === null || Math.abs(crossing[0]) < Math.abs(best[0])) best = crossing;
  }
  return best === null ? NaN : best;
}

// Phase margin [degrees, wrapped into (-180, 180]] and gain crossover frequency [rad/s]: the
// crossings of 0 dB in the gain curve sampled at `frequencies`, each refined on the exact |G(j*omega)|.
// Returns [phase_margin, frequency], or NaN when the gain never crosses 0 dB.
function findOmegaZero(binding,gain_array,frequencies){
  if (binding === null) return NaN;
  const crossings = sign_changes(gain_array, 1e-6).map(([i, j]) => {
    const omega = refine_crossing((w) => gain_db_at(binding, w), frequencies[i], frequencies[j]);
    return [wrap_degrees(phase_at(binding, omega)*180/Math.PI + 180), omega];
  });
  return smallest_margin(crossings);
}

// Gain margin [dB] and phase crossover frequency [rad/s]: the crossings of -180 + k*360 degrees
// in the (unwrapped) phase curve sampled at `frequencies`, each refined on the exact phase: arg G(j*omega) jumps
// between +pi and -pi exactly there, so bisection on its sign finds the crossing. A phase within
// 0.005 rad of -180 (for example 1/s^2, which stays there) is not a crossing.
// Returns [gain_margin, frequency], or NaN when the phase never crosses -180 + k*360.
function findOmega180(binding,phase_array,frequencies){
  if (binding === null) return NaN;
  const turns = phase_array.map((phase) => Math.round((phase + Math.PI)/(2*Math.PI)));
  const distance = phase_array.map((phase, i) => phase + Math.PI - 2*Math.PI*turns[i]);
  const crossings = sign_changes(distance, 0.005, turns).map(([i, j]) => {
    const omega = refine_crossing((w) => phase_at(binding, w), frequencies[i], frequencies[j]);
    return [-gain_db_at(binding, omega), omega];
  });
  return smallest_margin(crossings);
}

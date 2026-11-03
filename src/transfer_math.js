'use strict';

const NOF_CONSTANT_VARIABLES = 1; // We have 'e'. Shall not make a slider for that one.
let range_slider_variables = [2.718281828459045,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001];
let range_slider_alphabet = ['e','a','b','c','f','g','h','j','l','L','m','n','o','p','q','r','t','u','v','x','y','k_1','k_2','k_3','k_4','k_5','k_6','w','z','K','T_1','T_2','T_3','T_4','T_5','T_6','T_7','T_8','T_i','T_d'];
// To go from "T_1" to the index in range_slider_variables:
let variable_position = {};
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
    compiled = {code: node.compile(), symbols: [...symbols]};
    if (compiled_formulas.size >= MAX_COMPILED_FORMULAS) compiled_formulas.clear();
    compiled_formulas.set(formula, compiled);
  }
  return compiled;
}

// Compiles a formula and binds the current slider values of the variables it uses.
// Returns null when one of those sliders has no value yet (18012001).
// A formula that cannot be parsed gets a binding whose evaluation throws, so getComplexValues
// returns 0 for it, as it did before formulas were compiled.
function bind_formula(formula){
  let compiled;
  try{
    compiled = compile_formula(formula);
  } catch(error){
    return {code: {evaluate: () => { throw error; }}, scope: {}};
  }
  const scope = {};
  for (const name of compiled.symbols){
    const position = range_slider_alphabet.indexOf(name);
    if (position < 0) continue; // s, i, or a symbol math.js resolves (or reports) itself
    if (range_slider_variables[position] == 18012001) return null;
    scope[name] = Number(range_slider_variables[position]);
  }
  return {code: compiled.code, scope: scope};
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

function findOmegaZero(binding,input_array){
  if (binding === null) return NaN;
  let a_bound = min_10power;
  let b_bound = min_10power + x_case_gain;
  let f_a = gain_db_at(binding, Math.pow(10,a_bound));
  let f_b = gain_db_at(binding, Math.pow(10,b_bound));
  if(f_a * f_b < 0){
    for(let h=0; h<20; h++){
      let mid_point = (a_bound + b_bound)/2;
      let f_mid = gain_db_at(binding, Math.pow(10,mid_point));
      if(f_mid * f_a < 0){
        b_bound = mid_point;
      }
      else{
        a_bound = mid_point;
      }
    }
    a_bound = (a_bound + b_bound)/2;
    //let output = buffer_formula.replaceAll('s','(i*' + Math.pow(10,a_bound).toString() + ')');
    //output = math.evaluate(output).toPolar().phi;
    let linked_array_pos = map(a_bound,min_10power,min_10power + x_case_gain,0,graph_bode_mag_width-1);
    let output = input_array[Math.ceil(linked_array_pos)];
    return [output*180/Math.PI + 180, Math.pow(10,a_bound)];
  }
  else{
    return NaN
  }
}

function findOmega180(binding,input_array){
  if (binding === null) return NaN;
  let a_bound = min_10power;
  let b_bound = min_10power + x_case_gain;
  let f_a = input_array[Math.ceil(map(a_bound,min_10power,min_10power + x_case_gain,0,graph_bode_mag_width-1))] + Math.PI;
  let f_b = input_array[Math.ceil(map(b_bound,min_10power,min_10power + x_case_gain,0,graph_bode_mag_width-1))] + Math.PI;
  if(f_a * f_b < 0 && Math.abs(f_a) > 0.005 && Math.abs(f_b) > 0.005){
    for(let h=0; h<20; h++){
      let mid_point = (a_bound + b_bound)/2;
      let f_mid = input_array[Math.ceil(map(mid_point,min_10power,min_10power + x_case_gain,0,graph_bode_mag_width-1))] + Math.PI;
      if(f_mid * f_a < 0){
        b_bound = mid_point;
      }
      else{
        a_bound = mid_point
      }
    }
    a_bound = (a_bound + b_bound)/2;
    let output = -gain_db_at(binding, Math.pow(10,a_bound));
    return [output,Math.pow(10,a_bound)];
  }
  else{
    return NaN;
  }
}

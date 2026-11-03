'use strict';

const NOF_CONSTANT_VARIABLES = 1; // We have 'e'. Shall not make a slider for that one.
let range_slider_variables = [2.718281828459045,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001];
let range_slider_alphabet = ['e','a','b','c','f','g','h','j','l','L','m','n','o','p','q','r','t','u','v','x','y','k_1','k_2','k_3','k_4','k_5','k_6','w','z','K','T_1','T_2','T_3','T_4','T_5','T_6','T_7','T_8','T_i','T_d'];
// To go from "T_1" to the index in range_slider_variables:
let variable_position = {};
let buffer_formula = 0;
let input_formula = "1/s";

function getComplexValues(freq){
  let jomega = '(' + freq.toString().concat('','i') + ')';
  //Can make it faster for the upcoming for loop by creating the string of the function just once
  let function_new_value = buffer_formula.replaceAll('s',jomega);
  try{
    let complex_value = math.evaluate(function_new_value);
    return complex_value;
  }
  catch(error){
    return math.complex(0,0);
  }
}

function replaceLetterByValue(input_bode_formula){
  let output = true;
  buffer_formula = input_bode_formula;
  for(let i=0; i<range_slider_alphabet.length; i++){
    let current_letter = range_slider_alphabet[i];
    if(buffer_formula.includes(current_letter)){
      if(range_slider_variables[i] != 18012001){
        buffer_formula = buffer_formula.replaceAll(current_letter,range_slider_variables[i]);
      }
      else{
        output = false;
      }
    }
  }
  return output;
}

function getTimeValues(time,time_delay){
  let time_to_use = time-time_delay;
  if (time_to_use < 0) return 0.0;
  let current_formula = "(" + input_formula + ")" + "(" + buffer_formula + ")"
  let v = [1/12,-385/12,1279,-46871/3,505465/6,-473915/2,1127735/3,-1020215/3,328125/2,-65625/2];
  const ln2=0.69314718056;
  let sum = 0;
  current_formula = current_formula.replace('⋅','');
  for(let j=0; j<=9; j++){
    let new_s = (j+1)*ln2/time_to_use;
    let new_s_string = '(' + new_s.toString() + ')';
    let new_function_value = current_formula.replaceAll('s',new_s_string);
    sum += v[j]*math.evaluate(new_function_value);
  }
  return ln2 * sum/time_to_use;
}

function findOmegaZero(input_array){
  let a_bound = min_10power;
  let b_bound = min_10power + x_case_gain;
  let f_a = buffer_formula.replaceAll('s','(i*' + Math.pow(10,a_bound).toString() + ')');
  let f_b = buffer_formula.replaceAll('s','(i*' + Math.pow(10,b_bound).toString() + ')');
  f_a = 20*Math.log(math.evaluate(f_a).toPolar().r)/Math.log(10);
  f_b = 20*Math.log(math.evaluate(f_b).toPolar().r)/Math.log(10);
  if(f_a * f_b < 0){
    for(let h=0; h<20; h++){
      let mid_point = (a_bound + b_bound)/2;
      let f_mid = buffer_formula.replaceAll('s','(i*' + Math.pow(10,mid_point).toString() + ')');
      f_mid = 20*Math.log(math.evaluate(f_mid).toPolar().r)/Math.log(10);
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

function findOmega180(input_array){
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
    let output = buffer_formula.replaceAll('s','(i*' + Math.pow(10,a_bound).toString() + ')');
    output = -20*Math.log(math.evaluate(output).toPolar().r)/Math.log(10);
    return [output,Math.pow(10,a_bound)];
  }
  else{
    return NaN;
  }
}

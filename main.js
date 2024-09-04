//
// LU-PZE: Lund University Pole-Zero Explorer
// - an Automatic Control theory playground
//
// Try the live version at https://lu-pze.github.io
// Source code at https://github.com/lu-pze/lu-pze.github.io
//
// MIT License
// 
// Copyright (c) 2024 lu-pze
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

if (document.readyState == 'loading'){
  document.addEventListener('DOMContentLoaded', ready)
} else {
  ready();
}

const GRAPH_ONE_REAL_POLE = {name:"One real pole", mf:"\\frac{k_1}{1+T_1s}", formula:"k_1/(1+T_1*s)"};
const GRAPH_TWO_REAL_POLES = {name:"Two real poles", mf:"\\frac{k_2}{(1+T_2s)(1+T_3s)}", formula:"k_2/((1+T_2s)(1+T_3s))"};
const GRAPH_TWO_COMPLEX_POLES = {name:"Two complex poles", mf:"\\frac{k_3w^2}{s^2+2zws+w^2}", formula:"k_3*w^2/(s^2+2*z*w*s+w^2)"};
const GRAPH_TIME_DELAY = {name:"Time delay", mf:"\\frac{3}{1+s}e^{-Ls}", formula:"3/(1+s)*e^(-L*s)"};
const GRAPH_ONE_ZERO_TWO_POLES = {name:"One zero two poles", mf:"\\frac{k_4(1+T_8s)}{(1+T_6s)(1+T_7s)}", formula:"k_4(1+T_8s)/(1+T_6s)*1/(1+T_7s)"};
const GRAPH_FOUR_POLES = {name:"Four poles", mf:"\\frac{k_5}{(1+T_5s)^4}", formula:"k_5/((1+T_5s)^4)"};
const GRAPH_ONE_ZERO = {name:"One zero", mf:"T_4s+0.5", formula:"T_4*s+0.5"};
//const GRAPH_ONE_POLE_WITH_PID_YR = {name:"One pole with PID R->Y", mf:"\\frac{K k_1 (1 + T_i s + T_iT_ds^2)}{K k_1 + T_i (1 + K k_1)s + T_i (T_1 + K k_1 T_d)s^2}", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s)) / (K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_ONE_POLE_WITH_PID_YR = {name:"One pole with PID R->Y", mf:"G_{YR} = \\frac{G_{PID} \\cdot G}{1 + G_{PID} \\cdot G}", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s)) / (K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_PID = {name:"PID controller", mf:"G_{PID}=K \\left(1 + \\frac{1}{s T_i} + s T_d \\right)}", formula:"K + K / (s * T_i) + K * T_d * s"};
const GRAPH_ONE_POLE_WITH_PID_S = {name:"One pole with PID Sensitivity", mf:"S = \\frac{1}{1 + G_{PID} \\cdot G}", formula:"(s*T_i*(1+T_1*s))/(K*k_1 + (K*k_1*T_i + T_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_ONE_POLE_WITH_PID_YL = {name:"One pole with PID Load", mf:"G_{YL} = \\frac{G}{1 + G_{PID} \\cdot G}", formula:"(k_1*T_i*s)/(K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)s*s)"};
const GRAPH_ONE_POLE_WITH_PID_OPEN = {name:"One pole with PID open-loop", mf:"G_{OL} = G_{PID} \\cdot G", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s))/(T_i*(s+T_1*s*s))"};


const GRAPH_ORDER = [
  GRAPH_ONE_REAL_POLE,
  GRAPH_TWO_REAL_POLES,
  GRAPH_TWO_COMPLEX_POLES,
  GRAPH_TIME_DELAY,
  GRAPH_ONE_ZERO_TWO_POLES,
  GRAPH_FOUR_POLES,
  GRAPH_ONE_ZERO,
  GRAPH_PID,
  GRAPH_ONE_POLE_WITH_PID_YR,
  GRAPH_ONE_POLE_WITH_PID_S,
  GRAPH_ONE_POLE_WITH_PID_YL,
  GRAPH_ONE_POLE_WITH_PID_OPEN,
];
const NOF_GRAPHS_AT_STARTUP = 4;
let next_graph_no_to_add = 0;
let id_bank = 1;

let start_date = new Date();
let session_started_at = start_date.getTime();
let debug_mode = false;

let min_10power = -2;
let rate = 1.4;
let precision = 4;
const DEFAULT_PRECISION=4;
const SPEED_PRECISION=12;
let we_need_faster_calculations_right_now = false; // Flag to know if precision is reduced

let x_case_gain = 5;
let y_case_gain = 6;

let bode_graphs = [];
let current_tab = 0;

let phase_lower_bound = 0;
let phase_upper_bound = 0;
let gain_upper_bound = 60;
let phase_case_number;

//                              red   yellow    green     blue  magenta   light green        green
let color_table = [     270,    350,      32,     170,     202,-90+5*81,           76,-90-360+7*81,-90-360+8*81,-90-360+9*81,-90-360+10*81,-90-360+11*81,-90-360+12*81,-90-360+13*81,-90-360+14*81,-90-360+15*81];

let max_y_timerep = 100;
let min_y_timerep = 0;
let max_x_timerep = 10;

let min_nyquist_x = -1;
let max_nyquist_x = 1;
let min_nyquist_y = -1;
let max_nyquist_y = 1;

let line_stroke_weight = 2;
let text_color;
let angle_color;
let line_color;
let background_color;
let box_background_color;

let canvas_width;
let canvas_height;
let graph_bode_mag_width;
let graph_bode_mag_height;
let graph_bode_mag_x;
let graph_bode_mag_y;
const graph_bode_mag_x_offset = 68;
const graph_bode_mag_y_offset = 30;
let graph_bode_phase_width;
let graph_bode_phase_height;
let graph_bode_phase_x;
let graph_bode_phase_y;
const graph_bode_phase_x_offset = 68;
const graph_bode_phase_y_offset = 110;
const graph_bode_phase_axis_height = 35;
let graph_step_response_width;
let graph_step_response_height;
let graph_step_response_x;
let graph_step_response_y;
const graph_step_response_x_offset = 65;
const graph_step_response_y_offset = 40;
const graph_step_response_timeaxis_height = 35;
let graph_nyquist_width;
let graph_nyquist_height;
let graph_nyquist_x;
let graph_nyquist_y;
const graph_nyquist_x_offset = 65;
const graph_nyquist_y_offset = 45;
let graph_pole_zero_width;
let graph_pole_zero_x;
let graph_pole_zero_y;
let pole_zero_width;
let pole_zero_height;


function getGraphById(input_id){
  for(let i=0; i<bode_graphs.length; i++){
    let current_graph = bode_graphs[i];
    if(current_graph.bode_id == input_id){
      return current_graph;
    }
  }
  return "none";
}

function updateInputFormula(event){
  input_formula = event.target.getValue('ascii-math');
  if ((input_formula.includes("/(s^2)")) ||
      (input_formula.includes("/(s⋅s)")) ||
      (input_formula.includes("(1)/(s)⋅(1)/(s)")) ||
      (input_formula.includes("(1)/(s)(1)/(s)")) ||
      (input_formula.includes("/(s*s)"))){
    achievement_done("set_input_to_ramp");
  }
  redraw_canvas_gain("all");
}

function checkSlider(input_id){
  let linked_formula = getGraphById(input_id).bode_formula;
  for(let i=0; i<range_slider_alphabet.length; i++){
    let current_letter = range_slider_alphabet[i];
    let linked_button = document.getElementById("BTNS_" + input_id.toString() + "_" + i.toString());
    if(linked_formula.includes(current_letter)){
      if(range_slider_variables[i] == 18012001 && linked_button == null){
        createSliderButton(input_id,i);
      }
    }
    else if(linked_button != null){
      linked_button.remove();
    }
  }
}

function createSliderButton(equation_id,letter_id){
  let slider_button = document.createElement("button");
  slider_button.classList.add("slider-button")
  slider_button.innerHTML = range_slider_alphabet[letter_id];
  slider_button.id = "BTNS_" + equation_id.toString() + "_" + letter_id.toString();
  slider_button.setAttribute("style","margin: 0 0 5px 10px");
  slider_button.addEventListener('click',createRangeSlider);
  let button_wrapper = document.getElementById(equation_id).parentElement.parentElement.getElementsByClassName("slider-buttons")[0];
  button_wrapper.append(slider_button);
}


const default_variable_values={
  "L"  :{min:  0.0,max: 3.0,value:0.0},
  "k_1":{min: -4.0,max:20.0,value:4.0},
  "k_2":{min: -4.0,max:20.0,value:2.0},
  "k_3":{min: -4.0,max:20.0,value:0.7},
  "k_4":{min: -4.0,max:20.0,value:2.5},
  "k_5":{min: -4.0,max:20.0,value:1.0},
  "z"  :{min:  0.0,max: 1.2,value:0.2},
  "T_1":{min: -5.0,max:10.0,value:0.6},
  "T_2":{min:  0.0,max:10.0,value:0.6},
  "T_3":{min:  0.0,max:10.0,value:2.0},
  "T_4":{min:  0.0,max:10.0,value:1.0},
  "T_5":{min:  0.0,max:10.0,value:1.0},
  "T_6":{min:  0.0,max:10.0,value:1.5},
  "T_7":{min:  0.0,max:10.0,value:1.1},
  "T_8":{min:-10.0,max:10.0,value:0.7},
  "T_d":{min:  0.0,max:10.0,value:0.0},
  "T_i":{min:  0.01,max:10.0,value:1.0},
  "K"  :{min:  0.01,max:10.0,value:1.0},
  "q"  :{min:  0.01,max:1.0,value:0.1},
  "v"  :{min:  0.1,max:20.0,value:4.5}};

function createRangeSlider(event){
  let slider = document.createElement('div');
  let button = event.target;
  let button_id = button.id.split("_")[2];
  let variable_name = range_slider_alphabet[button_id];
  let range_min=0.1;
  let range_max=20;
  let range_value=1.0;
  if (variable_name in default_variable_values){
    range_min=default_variable_values[variable_name]["min"];
    range_max=default_variable_values[variable_name]["max"];
    range_value=default_variable_values[variable_name]["value"];
  }
  // When a PID controller is attached, inverting the ONE_POLE output will always make the system unstable.
  // So don't encourage that:
  if ((variable_name=="k_1")&&((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL"))){
    range_min=0.01;
  }
  if ((variable_name=="T_1")&&((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL"))){
    range_value=6.0;
  }

  slider.classList.add("slider-wrapper");
  // Yes, this is ugly. But flex layout is broken (or at least differs) in mobile ios and Firefox vs. Chrome.
  // So table-based layout is a safer bet:
  slider.innerHTML =
  `<table><tr><td>
        <span style="margin:0 0 0 10px;font-size:24px" id="variable_${variable_name}">a =</span>
</td><td class="value-wrapper">
        <input type="text" id="variable_${button_id}" value="">
</td><td>
        <input type="text" id="text_${button_id}" value="${range_min}" class="slider-bound" style="text-align:right">
</td><td width="100%">
        <input type="range" min="${range_min}" max="${range_max}" step="0.01" class="range-slider" id=${"RANGE_" + button_id} value="${range_value}" style="width:100%;margin:0 auto;">
</td><td>
        <input type="text" id="text2_${button_id}" value="${range_max}" class="slider-bound">
</td></tr></table>`
//      <button type="button" class="delete-graph"><svg width="30" height="30" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>
//  let delete_button = slider.getElementsByClassName("delete-graph")[0];
//  delete_button.addEventListener('click',removeSlider);

  // Printing variable names using mathlive:
  slider.getElementsByTagName("span")[0].innerHTML = "<math-field read-only style='vertical-align:bottom;display:inline-block' class='slider_mf'>" + range_slider_alphabet[button_id] + " =</math-field>";

  //let linked_letter = range_slider_alphabet[button_id];
  let range_slider = slider.getElementsByClassName("range-slider")[0];
  let linked_span = slider.getElementsByClassName("value-wrapper")[0].getElementsByTagName("input")[0];
  linked_span.value = (+range_slider.value).toFixed(2);
  const mf = slider.getElementsByClassName('slider_mf')[0];
  mf.menuItems = []; // Stop MathLive from grabbing right mouse clicks.

  range_slider.onchange = function(){
    // Only reacts on the final value of the slider, and not continuous movements:
    if ((range_slider_alphabet[button_id]=="T_1") && (+range_slider.value >= 1.9) && (+range_slider.value <= 2.12)){
      task_done("T1=2");
    }
    if ((range_slider_alphabet[button_id]=="T_1") && (+range_slider.value < 0)){
      task_done("T1_unstable");
    }
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    let max_T = Math.max(T_2,T_3);
    let min_T = Math.min(T_2,T_3);
    if ((min_T >= 0.035) && (min_T <= 0.07)&&
        (max_T >= 4.0) && (max_T <= 5.8)){
      task_done("T2,T3=0.05_and_5");
    }
  }

  range_slider.oninput = function(){
    linked_span.value = +(+range_slider.value).toFixed(2);
    range_slider_variables[button_id] = +range_slider.value;
    if (range_slider_alphabet[button_id]=="L"){
      achievement_done("change_L");
    } else if ((range_slider_alphabet[button_id][0]=="k") && (+range_slider.value >= 100)){
      // We dragged a slider to a k-value above or equal 100:
      achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
    } else if ((range_slider_alphabet[button_id]=="z") && (+range_slider.value <= 0.1)){
      achievement_done("low_z");
    } else if (range_slider_alphabet[button_id][0]=="T"){
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
    }
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    // Make the relevant information bar active when a slider is changed:
    let variable_name = range_slider_alphabet[button_id];
    if ((variable_name == "k_1")||(variable_name == "T_1")){
      let info_tab = document.getElementById("graph_1_info");
      info_tab.checked = "true";
    } else if ((variable_name == "k_2")||(variable_name == "T_2")||(variable_name=="T_3")){
      let info_tab = document.getElementById("graph_2_info");
      info_tab.checked = "true";
    } else if ((variable_name == "w")||(variable_name == "z")||(variable_name=="k_3")){
      let info_tab = document.getElementById("graph_3_info");
      info_tab.checked = "true";
    } else if (variable_name == "L"){
      let info_tab = document.getElementById("graph_4_info");
      info_tab.checked = "true";
    } else if ((variable_name == "k_4")||(variable_name == "T_6")||(variable_name == "T_7")||(variable_name == "T_8")){
      let info_tab = document.getElementById("graph_5_info");
      info_tab.checked = "true";
    } else if ((variable_name == "k_5")||(variable_name == "T_5")){
      let info_tab = document.getElementById("graph_6_info");
      info_tab.checked = "true";
    } else if (variable_name == "T_4"){
      let info_tab = document.getElementById("graph_7_info");
      info_tab.checked = "true";
    }
    redraw_canvas_gain("all");
  }
  range_slider_variables[button_id] = range_value; // Initial value of variable

  let slider_bounds = slider.getElementsByClassName("slider-bound");
  let slider_min = slider_bounds[0];
  slider_min.oninput = function(){
    range_slider.min = +slider_min.value;
  }
  let slider_max = slider_bounds[1];
  slider_max.oninput = function(){
    range_slider.max = +slider_max.value;
  }

  linked_span.onchange = function(){
    // Only reacts on the final value, and not while editing:
    if ((range_slider_alphabet[button_id]=="T_1") && (+linked_span.value >= 1.95) && (+linked_span.value <= 2.05)){
      task_done("T1=2");
    }
    if ((range_slider_alphabet[button_id]=="T_1") && (+linked_span.value < 0)){
      task_done("T1_unstable");
    }
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    let max_T = Math.max(T_2,T_3);
    let min_T = Math.min(T_2,T_3);
    if ((min_T >= 0.035) && (min_T <= 0.07)&&
        (max_T >= 4.0) && (max_T <= 5.8)){
      task_done("T2,T3=0.05_and_5");
    }

    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    let k_3 = range_slider_variables[variable_position["k_3"]];
    if ((k_3>=0.90)&&(k_3<=1.1)&&(w>=7.3)&&(w<=8.7)&&(z>=0.2)&&(z<=0.7)){
      task_done("w=8;z=0.05;k_3=1");
    }
    // When pressing enter, we shall lose focus:
    this.blur();
  }

  linked_span.oninput = function(){
    if(+linked_span.value > +range_slider.max){
      range_slider.max = linked_span.value;
      slider_max.value = linked_span.value;
    }
    if(+linked_span.value < +range_slider.min){
      range_slider.min = linked_span.value;
      slider_min.value = linked_span.value;
    }
    range_slider_variables[button_id] = +linked_span.value;
    if (range_slider_alphabet[button_id]=="L"){
      achievement_done("change_L");
    } else if ((range_slider_alphabet[button_id][0]=="k") && (+linked_span.value >= 100)){
      // We have entered a k-value above or equal 100 in the text box:
      achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
    } else if ((range_slider_alphabet[button_id]=="z") && (+linked_span.value <= 0.1)){
      achievement_done("low_z");
    } else if (range_slider_alphabet[button_id][0]=="T"){
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
    }
    range_slider.value = +linked_span.value;
    redraw_canvas_gain("all");
  }

  let equations_div = document.getElementsByClassName("equations")[0];
  equations_div.append(slider);
  try{
    // This will fail if there is no button:
//    let equations = button.parentElement.parentElement.parentElement;
//    equations.append(slider);
    // If adding a slider at startup, there is no button to remove, so this may fail:
    button.remove();
  } catch {
//    console.log("No button to remove");
  }
}

function removeSlider(event){
  let button = event.target;
  let linked_id = button.parentElement.parentElement.getElementsByClassName("range-slider")[0].id.split("_")[1];
  range_slider_variables[linked_id] = 18012001;
  let slider = button.parentElement.parentElement.parentElement;
  slider.remove();
  for(let b=0; b<bode_graphs.length; b++){
    let graph_id = bode_graphs[b].bode_id;
    checkSlider(graph_id);
    redraw_canvas_gain(graph_id);
  }
}


function addNewGraphClicked(event, graph_to_add){
  if (current_quiz!="none"){
    quiz_perhaps("Sorry, you cannot add new graphs during the quiz.");
    return;
  } else if (current_assignment!="none"){
    quiz_perhaps("Sorry, you cannot add new graphs during an assignment.");
    return;
  }
  add_event("add_graph");
  achievement_done("add_graph");
  addNewGraph(event, graph_to_add);
}

function addNewGraph(event, graph_to_add={name:"", mf:"\\frac{0.9s+1}{(s+1)^2}\\frac{v^2}{s^2+2qvs+v^2}", formula:"(0.9s+1)/((s+1)^2)*(v^2)/(s^2+2*q*v*s+v^2)"}, enable_string="_____MPTNIE"){
  let graph_name = graph_to_add.name;
  let mathfield_string = graph_to_add.mf;
  let equation_string = graph_to_add.formula;

  if (graph_to_add.name == ""){
    // User clicked "add" button.
    if (next_graph_no_to_add < GRAPH_ORDER.length){
      // Yes, there are still default graphs left to add:
      graph_to_add = GRAPH_ORDER[next_graph_no_to_add];
      graph_name = graph_to_add.name;
      mathfield_string = graph_to_add.mf;
      equation_string = graph_to_add.formula;
    } else {
      graph_name = "Graph " + (next_graph_no_to_add+1);
      mathfield_string = "\\frac{1}{(s+1)^2}";
      equation_string = "1/((s+1)^2)";
    }
  }
  next_graph_no_to_add += 1;

  if (graph_name.startsWith("Ghost")){
    enable_string=graph_name;
  }

  let new_equation_wrapper = document.createElement('div');
  new_equation_wrapper.classList.add('equation-wrapper');
  id_bank += 1;
  let linked_color = color_table[id_bank%color_table.length];
  let s ='<hr><div class="equation"';
  if (enable_string[10]==".") s='<div class="equation" style="display:none;"';
  s +=" id='" + graph_name + "'>";

  s +=`<input type="checkbox" id="${graph_name}-checkbox" class="show-graph" style="background: hsl(${linked_color},100%,50%)" title="${graph_name}">`;
  s += "<math-field ";
  // These are the GRAPHS that should be not changeable. "read only":
  //if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
  //    (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
  //    (equation_string == GRAPH_TWO_COMPLEX_POLES.formula) ||
  //    (equation_string == GRAPH_TIME_DELAY.formula)){
  //  s += "read-only ";
  //}
  s += `class="formula" id="${id_bank}" style="`
  // These are the GRAPHS that should be not changeable. "read only":
  //if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
  //    (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
  //    (equation_string == GRAPH_TWO_COMPLEX_POLES.formula) ||
  //    (equation_string == GRAPH_TIME_DELAY.formula)){ // Make sure that hover doesn't make read-only graphs yellow:
  //  s += "background:none;";
  //}
  let font_size=20;
  //if (equation_string == GRAPH_ONE_POLE_WITH_PID_YR.formula){
  //  font_size=14.5;
  //}
  s += `font-size: ${font_size}px;" title="${graph_name}">${mathfield_string}</math-field>`;
  // These are the GRAPHS that should have download code buttons:
  if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
      (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
      (equation_string == GRAPH_TWO_COMPLEX_POLES.formula)){
    s += `<button type="button" class="download-script" id="download_script(${id_bank})" onclick="download_script(${id_bank})"><svg width="28" height="28" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_ios_share"/></svg></button>`;
  }
  s += `<button type="button" class="delete-graph" id="delete-graph_${id_bank}" onclick="removeGraph(${id_bank});updateAfterRemoveGraph();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>
  </div>
  <div class="slider-buttons">
  </div>
  `
  new_equation_wrapper.innerHTML = s;

  let equations_div = document.getElementsByClassName("equations")[0];
  equations_div.append(new_equation_wrapper);

  let new_equation = new_equation_wrapper.getElementsByClassName("equation")[0];
  new_equation.getElementsByClassName("show-graph")[0].addEventListener('change',changeGraphDisplayStatus);
  let mf = new_equation_wrapper.getElementsByClassName("formula")[0];
  mf.menuItems = []; // This prevents MathField from grabbing right mouse clicks. We want to handle those ourselves.

  let new_bode_graph = new bode_graph(id_bank,equation_string);
  bode_graphs.push(new_bode_graph);
  new_bode_graph.graph_name = graph_name;
  new_bode_graph.full_name = graph_name;

  // Let's set the displaybools:
  // The name tells where this formula will be shown:
  // GhostMPTNIE_Displayed name
  //      M      = shows up in Bode magnitude plot
  //       P     = shows up in Bode phase plot
  //        T    = shows up in Bode time response plot
  //         N   = shows up in Nyquist diagram
  //          I  = shows up in information tab
  //           E = shows up in Equations
  if (enable_string[5]==".")  new_bode_graph.bode_display_bodemag_bool = false;
  if (enable_string[6]==".")  new_bode_graph.bode_display_bodephase_bool = false;
  if (enable_string[7]==".")  new_bode_graph.bode_display_timeresponse_bool = false;
  if (enable_string[8]==".")  new_bode_graph.bode_display_nyquist_bool = false;
  if (enable_string[9]==".")  new_bode_graph.bode_display_information_bool = false;
  if (enable_string[10]==".") new_bode_graph.bode_display_equation_bool = false;
  if (graph_name.startsWith("Ghost")){
    new_bode_graph.graph_name = graph_name.substr(12);
  }

  let yes_add_range_sliders = true;
  if (equation_string == GRAPH_ONE_POLE_WITH_PID_S.formula) yes_add_range_sliders=false;
  if (equation_string == GRAPH_ONE_POLE_WITH_PID_YL.formula) yes_add_range_sliders=false;
  if (equation_string == GRAPH_ONE_POLE_WITH_PID_YR.formula) yes_add_range_sliders=false;
  if (equation_string == GRAPH_ONE_POLE_WITH_PID_OPEN.formula) yes_add_range_sliders=false;

  if (yes_add_range_sliders){
    let input_element_id = id_bank;
    for(let i=0; i<bode_graphs.length; i++){
      let current_bode_graph = bode_graphs[i];
      if(parseInt(input_element_id) == current_bode_graph.bode_id){
        // Create sliders for all included variables directly:
        let event={};
        event.target={};
        let equation_id=input_element_id; // The DOM number of the equation
        // Search for all variables in the equation_string:
        for(let i=NOF_CONSTANT_VARIABLES; i<range_slider_alphabet.length; i++){
          let current_letter = range_slider_alphabet[i];
          if(equation_string.includes(current_letter)){
            //let linked_button = document.getElementById("BTNS_" + equation_id.toString() + "_" + i.toString());
            range_slider_variables[i] = 1.0;  // Initial value
            event.target.id="BTNS_" + equation_id.toString() + "_" + i.toString();
            createRangeSlider(event);
          }
        }
      }
    }
  }

  if (!(enable_string[9]==".")){
    addNewInformationTab(id_bank, graph_name);
  }

//  bode_graphs[bode_graphs.length-1].get_complex_p5();
  updateFormulaAndDraw(document.getElementById(id_bank.toString()));
  redraw_canvas_gain(id_bank);
}


function addNewInformationTab(input_id, graph_name){
  let tabs_wrapper = document.getElementsByClassName("graph-information-tabs")[0];
  let new_input = document.createElement("input");
  new_input.setAttribute("type","radio");
  new_input.setAttribute("name","tab-inf");
  new_input.id = "graph_" + input_id.toString() + "_info";
  new_input.setAttribute("onchange","updateGraphInformation()");
  if (input_id == 1) {
    new_input.checked = "true";
  }

  let linked_color = color_table[input_id%color_table.length];
  let new_label = document.createElement("label");
  let span_content = "Graph " + input_id.toString();
  if (graph_name!=""){
    span_content = graph_name;
  }
  new_label.setAttribute("for","graph_" + input_id.toString() + "_info");
  new_label.innerHTML =
  `
  <div style="width:20px;height:20px;border-radius:20px;background:hsl(${linked_color},100%,50%);padding-right:8px;margin-right:6px"></div>
  <span>${span_content}</span>
  `
  new_label.id = "graph_" + input_id.toString() + "_infolabel";

  tabs_wrapper.append(new_input);
  tabs_wrapper.append(new_label);
}

function removeInformationTab(input_id){
  let linked_tab = document.getElementById("graph_" + input_id.toString() + "_info");
  let linked_label = document.getElementById("graph_" + input_id.toString() + "_infolabel");
  if (linked_tab) linked_tab.remove();
  if (linked_label) linked_label.remove();
}


function removeAllGraphs (){
  const equations = document.querySelectorAll(".equation-wrapper .equation .delete-graph");
  equations.forEach((equation) => {
    let linked_id=parseInt(equation.id.substr(13));
    removeGraph(linked_id);
  });
  updateAfterRemoveGraph();
  bode_graphs = [];
  id_bank = 1;
  input_formula = "1/s";
  let input_equation = document.getElementById("input-formula");
  input_equation.value = "\\frac{1}{s}";
  let i2 = document.getElementById("input-choices");
  i2.value = "Unit step";
}

function removeGraph (linked_id){
  add_event("remove_graph");
  let linked_button = document.getElementById("delete-graph_"+linked_id);
  let linked_equation = linked_button.parentElement;
  removeInformationTab(+linked_id);
  let equation_to_remove = "";
  for(let i=0; i<bode_graphs.length; i++){
    let current_graph = bode_graphs[i];
    if(current_graph.bode_id == parseInt(linked_id)){
      equation_to_remove = current_graph.bode_formula;
      bode_graphs.splice(bode_graphs.indexOf(current_graph),1);
    }
  }
  //Now remove any variables that belongs to this equation:
  let variables_to_delete = [];
  if (equation_to_remove == GRAPH_ONE_REAL_POLE.formula){
    variables_to_delete = ["k_1","T_1"];
  } else if (equation_to_remove == GRAPH_TWO_REAL_POLES.formula){
    variables_to_delete = ["k_2","T_2","T_3"];
  } else if (equation_to_remove == GRAPH_TWO_COMPLEX_POLES.formula){
    variables_to_delete = ["k_3","w","z"];
  } else if (equation_to_remove == GRAPH_TIME_DELAY.formula){
    variables_to_delete = ["L"];
  } else if (equation_to_remove == GRAPH_ONE_ZERO_TWO_POLES.formula){
    variables_to_delete = ["k_4","T_6","T_7","T_8"];
  } else if (equation_to_remove == GRAPH_FOUR_POLES.formula){
    variables_to_delete = ["T_5","k_5"];
  } else if (equation_to_remove == GRAPH_ONE_ZERO.formula){
    variables_to_delete = ["T_4"];
  } else if (equation_to_remove == GRAPH_PID.formula){
    variables_to_delete = ["K","T_i","T_d"];
  }
  for(let i=0; i<variables_to_delete.length; i++){
    let variable_to_delete = variables_to_delete[i];
    let button = document.getElementById("RANGE_" + variable_position[variable_to_delete]);
    range_slider_variables[linked_id] = 18012001;
//    let linked_id = button.parentElement.parentElement.getElementsByClassName("range-slider")[0].id.split("_")[1];
    let slider = button.parentElement.parentElement.parentElement;
    slider.remove();
  }
  linked_equation.parentElement.remove();
}

function updateAfterRemoveGraph(){
  for(let b=0; b<bode_graphs.length; b++){
    let graph_id = bode_graphs[b].bode_id;
    checkSlider(graph_id);
    redraw_canvas_gain(graph_id);
  }
  redraw();
}

function changeGraphDisplayStatus(event){
  let equation_id = event.target.parentElement.getElementsByClassName("formula")[0].id;
  for(let i=0; i<bode_graphs.length; i++){
    let current_graph = bode_graphs[i];
    if(current_graph.bode_id == parseInt(equation_id)){
      current_graph.bode_displaybool = !current_graph.bode_displaybool;
      redraw();
    }
  }
}

function updateFormulaAndDraw(input_element){
  add_event("update_formula_and_draw");
  input_element.addEventListener('input',(ev) => {
    let input_element_id = ev.target.id;
    for(let i=0; i<bode_graphs.length; i++){
      let current_bode_graph = bode_graphs[i];
      if(parseInt(input_element_id) == current_bode_graph.bode_id){
        current_bode_graph.bode_formula = ev.target.getValue('ascii-math');
        /*
        //bug since mathlive update hope I can remove it soon
        if(ev.target.value.includes("/")){
          ev.target.value = ev.target.value.replaceAll("/","\\frac{\\placeholder{⬚}}{\\placeholder{⬚}}");
          ev.target.value = ev.target.value.replaceAll("\\frac{}{}","")
        }
        */
        // Disable the download code button:
        let the_button=document.getElementById("download_script("+input_element_id+")");
        try{
          the_button.style.visibility="hidden";
        } catch {}
        checkSlider(input_element_id);
        redraw_canvas_gain(input_element_id);
        break;
      }
    }
  });
}


// ---------------- start of questions and answers code

let questions_enabled = false;
function questionsToggle(event){
  add_event("questions_toggle");
  if (questions_enabled){
    disable_questions();
    redraw_canvas_gain("all");
  } else {
    enable_questions();
    // Directly show a question without waiting for mouseMoved:
    handle_questions();
  }
}
const all_questions={
  "seconds":{q:"Why are we using seconds as time unit?",pos:function(){return {visible:true,x:graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,y:graph_step_response_y+graph_step_response_height+graph_step_response_y_offset+20}},
    a:`In automatic control systems, particularly in the context of time-domain analysis, the unit of seconds is commonly used on the time axis for several reasons:<br><br>
1. <b>Standardization</b>: Using seconds as the unit of time provides a standardized and universally accepted measurement. It allows for consistency and comparability across different systems and analyses.<br>
2. <b>Precision</b>: Seconds provide a level of precision that is often necessary in control systems where timing is critical. Many control algorithms and computations require precise timing information to function effectively.<br>
3. <b>Compatibility</b>: Seconds are compatible with various units of measurement used in control systems, such as meters for distance and radians for angular displacement. This compatibility simplifies the integration of time-based variables into control system equations and models.<br>
4. <b>Practicality</b>: Seconds are a practical unit of time for describing dynamic processes in control systems. They offer a convenient balance between granularity (small time intervals) and readability (larger time intervals), making them suitable for analyzing both fast and slow dynamics.<br>
5. <b>Engineering Convention</b>: The use of seconds on the time axis aligns with established engineering conventions and standards. It allows control engineers to communicate effectively and interpret results consistently within the field.<br><br>
Overall, using seconds on the time axis in automatic control simplifies analysis, enhances precision, and ensures compatibility with established engineering practices, making it a common and practical choice.`},

  "degrees":{q:"Degrees vs. radians - which is it?",pos:function(){return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset,y:graph_bode_phase_y+graph_bode_phase_y_offset-20}},
    a:`In automatic control theory, particularly in the context of frequency domain analysis and Bode plots, the choice between using degrees and radians depends on the conventions of the specific analysis or system, as well as personal preference. However, there are some general guidelines:<br><br>
1. <b>Phase Angle (φ)</b>:<br>
   - Degrees: Degrees are commonly used to represent phase angles in Bode plots, especially in introductory or practical contexts. Phase angles are often more intuitively understood in degrees, ranging from -180° to 180°.<br>
   - Radians: Radians can also be used to represent phase angles, particularly in more advanced or theoretical analyses. In mathematical calculations and advanced control theory, radians are preferred due to their natural connection with trigonometric functions and calculus.<br>
2. <b>Frequency (ω)</b>:<br>
   - Radians per Second (rad/s): Frequency in control theory is typically expressed in radians per second. This convention aligns with the use of Laplace transforms and complex numbers in control system analysis. Radians per second are favored because they provide a direct relationship with angular frequency, facilitating mathematical manipulation and analysis.<br>
   - Hertz (Hz): While radians per second is the standard unit for frequency in control theory, Hertz (cycles per second) can also be used, especially in practical applications or when discussing frequency in terms more familiar to non-specialists.<br><br>
In summary, the choice between using degrees and radians depends on the context and requirements of the analysis. Degrees are more common and intuitive for phase angles in practical applications, especially in introductory settings. However, radians are preferred for more advanced mathematical analyses due to their natural compatibility with trigonometric functions and calculus. Radians per second is the standard unit for frequency in control theory, aligning with the use of Laplace transforms and complex numbers.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of first-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "ONE_REAL_POLE_pz":{q:"Why do we study systems with one pole?",pos:function(){
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)){
        return {visible:true,x:pole_zero_graph_x[i]+graph_pole_zero_width/2,y:pole_zero_graph_y[i]+graph_pole_zero_width/2};
      }
    }
    return {visible:false}
  },a:`<ul>
      <li><strong>Electronics</strong>: RC (Resistor-Capacitor) Low Pass Filter - Governed by the equation V<sub>out</sub> = V<sub>in</sub> * (1 - e<sup>-t/RC</sup>)</li>
      <li><strong>Thermal Engineering</strong>: Temperature control of a room using a heater - Where the room temperature's rate of change is proportional to the difference between the ambient and desired temperatures.</li>
      <li><strong>Mechanics</strong>: Viscous damping in a mechanical shock absorber - Can be modeled as a first-order system where the force is proportional to the velocity.</li>
      <li><strong>Chemistry</strong>: Chemical reactors in which the reaction rate is of first-order with respect to a reactant concentration.</li>
      <li><strong>Physics</strong>: Charging of a capacitor through a resistor - Described by the equation q(t) = Q(1 - e<sup>-t/RC</sup>), where q(t) is the charge at time t.</li>
      <li><strong>Mathematics</strong>: Solutions of first-order linear differential equations used to model diverse physical phenomena.</li>
      <li><strong>Biomedical Engineering</strong>: Modeling the rate of absorption of a drug into the bloodstream.</li>
      <li><strong>Automobiles</strong>: The cruise control system in a vehicle, adjusting the throttle position to maintain a constant speed.</li>
      <li><strong>Aeronautics</strong>: The altitude hold mode in autopilot systems, maintaining a set altitude by adjusting flight control surfaces.</li>
      <li><strong>Household Appliances</strong>: Thermostat control for heating systems, maintaining a target temperature within a room.</li>
      <li><strong>Environmental Engineering</strong>: Modeling the dilution of pollutants in a river, assuming first-order decay of pollutant concentration.</li>
      <li><strong>Electrical Engineering</strong>: Current control in a DC motor, governed by the motor's inductance and resistance.</li>
      <li><strong>Robotics</strong>: Position control of a robotic arm's single joint, where the position is controlled by varying the input voltage.</li>
      <li><strong>Optics</strong>: The response of a photodetector circuit, where the output voltage changes as a function of light intensity.</li>
      <li><strong>Fluid Dynamics</strong>: The flow of fluid in a pipe with a constant cross-sectional area, where the flow rate stabilizes due to frictional forces.</li>
      <li><strong>Sound Engineering</strong>: High-pass filters used in audio systems to attenuate lower frequencies while allowing higher frequencies to pass through.</li>
      <li><strong>Signal Processing</strong>: Exponential moving average filter, often used to smooth out time series data.</li>
      <li><strong>Telecommunications</strong>: The tuning circuit in a radio receiver, selecting a particular frequency while filtering out others.</li>
      <li><strong>Marine Engineering</strong>: Control of a ship's velocity by adjusting its propeller speed.</li>
      <li><strong>Space Exploration</strong>: Orientation control in satellites using reaction wheels, adjusting the satellite's angular position.</li>
      </ul>
  This list provides a glance into the incredible diversity of applications for first-order systems across engineering disciplines, illustrating the fundamental role that principles of automatic control theory play in technological advancements and everyday applications.`},




//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of second-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "TWO_REAL_POLES_pz":{q:"Why do we study systems with two poles?",pos:function(){
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)){
        return {visible:true,x:pole_zero_graph_x[i]+graph_pole_zero_width/2,y:pole_zero_graph_y[i]+graph_pole_zero_width/2};
      }
    }
    return {visible:false}
  },a:`<ul>
        <li><b>Electronics:</b> LC Circuit (Tank Circuit) - A classic example where the electric charge oscillates between an inductor (<em>L</em>) and capacitor (<em>C</em>), described by d<sup>2</sup>q/dt<sup>2</sup> + q/(LC) = 0.</li>
        <li><b>Automotive:</b> Suspension System - Represents the vehicle's dynamics, where the oscillatory behavior models comfort and handling.</li>
        <li><b>Mechatronics:</b> Robotic Arm Joints - The positioning control typically involves second-order dynamics to describe the movement.</li>
        <li><b>Physics:</b> Mass-Spring-Damper System - A fundamental second-order system, described by m*d<sup>2</sup>x/dt<sup>2</sup> + c*dx/dt + kx = F(t), where m, c, and k are mass, damping coefficient, and spring constant, respectively.</li>
        <li><b>Chemical Engineering:</b> Temperature Control in a Chemical Reactor - Where the temperature control loop can be approximated by a second-order system to maintain optimal reaction conditions.</li>
        <li><b>Electrical Engineering:</b> RLC Circuits - Used in filters, tuners, and frequency discriminators, representing a resistive (R), inductive (L), and capacitive (C) elements.</li>
        <li><b>Aerospace:</b> Attitude Control Systems - Governs the orientation of aircraft or spacecraft, often modelled with second-order dynamics.</li>
        <li><b>Mechanics:</b> Pendulum Dynamics (Small Angle Approximation) - Described by d<sup>2</sup>&theta;/dt<sup>2</sup> + g/l * &theta; = 0, where g is the acceleration due to gravity and l is the pendulum length.</li>
        <li><b>Marine Engineering:</b> Ship Roll Dynamics - Explains how ships stabilize after being tilted by waves, displaying second-order characteristics.</li>
        <li><b>Mathematics:</b> Differential Equations - Many natural phenomena and engineering problems are modeled as second-order linear differential equations.</li>
        <li><b>Heating, Ventilation, and Air Conditioning (HVAC):</b> Temperature Control Systems - Regulate the building's climate using feedback mechanisms akin to second-order systems.</li>
        <li><b>Household Appliances:</b> Washing Machine Balance Control - Ensures stability during the spin cycle, a problem of dynamic balancing and vibration control.</li>
        <li><b>Gadgets:</b> Gyroscopes in Smartphones - Employed for orientation detection, involving principles of angular momentum and second-order control for accuracy.</li>
        <li><b>Renewable Energy:</b> Wind Turbine Pitch Control - Adjusts the blade pitch to optimize efficiency and regulate power output, a second-order control challenge.</li>
        <li><b>Biomedical Engineering:</b> Drug Delivery Systems - The kinetics of drug absorption and effects can sometimes be modeled as second-order processes.</li>
        <li><b>Optics:</b> Laser Cavity Control - Stability and precision in the laser output are managed through feedback that closely resembles second-order dynamics.</li>
        <li><b>Acoustics:</b> Loudspeaker Systems - The mechanical and electrical aspects of speaker design often involve second-order dynamic models.</li>
        <li><b>Robotics:</b> Drone Stabilization - The flight control systems for drones, ensuring stable operation, leverage second-order dynamics.</li>
        <li><b>Information Technology:</b> Packet Switching in Network Routers - While primarily a function of software, the control of data flow can be conceptually understood through second-order system analogies.</li>
        <li><b>Environmental Engineering:</b> Pollution Dispersion Models - The spread and dissipation of pollutants in ecosystems can be described using principles akin to second-order systems.</li>
    </ul>Note that some of the systems described above may have complex poles, having a damped oscillating system response.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of second-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "TWO_COMPLEX_POLES_pz":{q:"Why do we study systems with two poles?",pos:function(){
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)){
        return {visible:true,x:pole_zero_graph_x[i]+graph_pole_zero_width/2,y:pole_zero_graph_y[i]+graph_pole_zero_width/2};
      }
    }
    return {visible:false}
  },a:`<ul>
        <li><b>Electronics:</b> LC Circuit (Tank Circuit) - A classic example where the electric charge oscillates between an inductor (<em>L</em>) and capacitor (<em>C</em>), described by d<sup>2</sup>q/dt<sup>2</sup> + q/(LC) = 0.</li>
        <li><b>Automotive:</b> Suspension System - Represents the vehicle's dynamics, where the oscillatory behavior models comfort and handling.</li>
        <li><b>Mechatronics:</b> Robotic Arm Joints - The positioning control typically involves second-order dynamics to describe the movement.</li>
        <li><b>Physics:</b> Mass-Spring-Damper System - A fundamental second-order system, described by m*d<sup>2</sup>x/dt<sup>2</sup> + c*dx/dt + kx = F(t), where m, c, and k are mass, damping coefficient, and spring constant, respectively.</li>
        <li><b>Chemical Engineering:</b> Temperature Control in a Chemical Reactor - Where the temperature control loop can be approximated by a second-order system to maintain optimal reaction conditions.</li>
        <li><b>Electrical Engineering:</b> RLC Circuits - Used in filters, tuners, and frequency discriminators, representing a resistive (R), inductive (L), and capacitive (C) elements.</li>
        <li><b>Aerospace:</b> Attitude Control Systems - Governs the orientation of aircraft or spacecraft, often modelled with second-order dynamics.</li>
        <li><b>Mechanics:</b> Pendulum Dynamics (Small Angle Approximation) - Described by d<sup>2</sup>&theta;/dt<sup>2</sup> + g/l * &theta; = 0, where g is the acceleration due to gravity and l is the pendulum length.</li>
        <li><b>Marine Engineering:</b> Ship Roll Dynamics - Explains how ships stabilize after being tilted by waves, displaying second-order characteristics.</li>
        <li><b>Mathematics:</b> Differential Equations - Many natural phenomena and engineering problems are modeled as second-order linear differential equations.</li>
        <li><b>Heating, Ventilation, and Air Conditioning (HVAC):</b> Temperature Control Systems - Regulate the building's climate using feedback mechanisms akin to second-order systems.</li>
        <li><b>Household Appliances:</b> Washing Machine Balance Control - Ensures stability during the spin cycle, a problem of dynamic balancing and vibration control.</li>
        <li><b>Gadgets:</b> Gyroscopes in Smartphones - Employed for orientation detection, involving principles of angular momentum and second-order control for accuracy.</li>
        <li><b>Renewable Energy:</b> Wind Turbine Pitch Control - Adjusts the blade pitch to optimize efficiency and regulate power output, a second-order control challenge.</li>
        <li><b>Biomedical Engineering:</b> Drug Delivery Systems - The kinetics of drug absorption and effects can sometimes be modeled as second-order processes.</li>
        <li><b>Optics:</b> Laser Cavity Control - Stability and precision in the laser output are managed through feedback that closely resembles second-order dynamics.</li>
        <li><b>Acoustics:</b> Loudspeaker Systems - The mechanical and electrical aspects of speaker design often involve second-order dynamic models.</li>
        <li><b>Robotics:</b> Drone Stabilization - The flight control systems for drones, ensuring stable operation, leverage second-order dynamics.</li>
        <li><b>Information Technology:</b> Packet Switching in Network Routers - While primarily a function of software, the control of data flow can be conceptually understood through second-order system analogies.</li>
        <li><b>Environmental Engineering:</b> Pollution Dispersion Models - The spread and dissipation of pollutants in ecosystems can be described using principles akin to second-order systems.</li>
    </ul>Note that some of the systems described above may have real poles, having a damped system response without oscillation.`},




//In automatic control, why do we study second-order systems with two complex poles? Give an answer with vivid examples of resonating systems, with correct automatic control vocabulary while keeping the rest of the english simple.
  "ONE_ZERO_TWO_POLES_pz":{q:"Why do we study systems with one zero and two poles?",pos:function(){
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
        return {visible:true,x:pole_zero_graph_x[i]+graph_pole_zero_width/2,y:pole_zero_graph_y[i]+graph_pole_zero_width/2};
      }
    }
    return {visible:false}
  },a:`<b>DC Motor Speed Control System</b>: A direct current (DC) motor's speed can be controlled through voltage adjustments. The mathematical model of a DC motor might result in a transfer function with one zero and two poles when considering the electrical dynamics (voltage-to-current) and mechanical dynamics (torque-to-speed). This system showcases how input voltage changes can affect the steady-state speed and transient performance, such as overshoot and settling time.<br>
<b>Mass-Spring-Damper System</b>: This classic mechanical system comprises a mass attached to a spring and a damper, where the force applied to the mass is countered by the spring's restoring force and the damper's resistive force. The system's transfer function, relating force to displacement, often features one zero and two poles, demonstrating natural frequencies, damping ratios, and resonance phenomena.<br>
<b>Thermal System for a Heated Tank</b>: Consider a tank where liquid is heated through an electric heater and cooled by the surrounding environment. The dynamics of heating (considering the heater power as input and the liquid temperature as output) might be represented by a transfer function with one zero and two poles, revealing how heat transfer rates, heat capacity, and environmental interaction influence temperature control and stability.<br><br>
Many physical and engineering systems can be approximated or modeled accurately enough with one zero and two poles. This simplification aids in the conceptual understanding and practical application of control theory without overwhelming complexity.<br>
These systems provide a clear view of how the pole and zero locations affect the system's response, including factors like stability, settling time, overshoot, and steady-state error.<br><br>
With a relatively simple system configuration, various feedback control techniques (like PID control, lead or lag compensators) can be applied and analyzed, offering lessons on how control actions modify system behavior.`},
//In automatic control theory, studying systems with one zero and two poles provides insights into the dynamics of a wide range of physical and engineering applications. Such configurations often occur in practical systems and offer a balance between simplicity and the ability to capture significant dynamic behaviors. This focus allows for the exploration of essential concepts such as stability, transient response, and steady-state accuracy within a manageable framework, facilitating the understanding and design of feedback control systems.
//In summary, studying systems with one zero and two poles in automatic control theory is a foundational step that bridges theoretical concepts with practical applications, encouraging a deep understanding of how various control strategies can be employed to achieve desired system behaviors in a wide range of real-world scenarios.


//Who invented the Nyquist diagram, and why is it essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Nyquist_who":{q:"Who invented the Nyquist diagram?",pos:function(){return {visible:true,x:graph_nyquist_x+graph_nyquist_x_offset+graph_nyquist_width/2,y:graph_nyquist_y+graph_nyquist_y_offset-10};},
  a:`The Nyquist diagram was invented by the Swedish-American engineer and physicist Harry Nyquist in the early 1930s. It's a powerful tool in automatic control theory for analyzing the stability of feedback control systems.`},


//Who invented the Nyquist diagram, and why is it essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Nyquist":{q:"Why is the Nyquist diagram useful?",pos:function(){return {visible:true,x:graph_nyquist_x+graph_nyquist_x_offset+graph_nyquist_width/2,y:graph_nyquist_y+graph_nyquist_y_offset+graph_nyquist_height/2};},
  a:`Imagine you're driving a car and you want to maintain a steady speed. The car's cruise control system adjusts the throttle based on feedback from your speedometer. If the control system is unstable, it might overcorrect, causing the car to speed up and slow down unpredictably.<br><br>
The Nyquist diagram helps you understand and predict the stability of such control systems. It plots the frequency response of a system on a complex plane, providing insights into how system dynamics change with frequency.<br><br>
By analyzing the Nyquist plot, you can determine if a control system is stable or if it's prone to oscillations or instability. This information is crucial for designing reliable and effective control systems for various applications, such as aircraft autopilots, robotic arms, or temperature controllers in industrial processes.
<h3>Nyquist curve drawing</h3>
The Nyquist curve is constituted of the complex number G(i&omega;) drawn in the complex plane for &omega; in [0,∞]. Assume that the process is described by the first-order transfer function<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
G(s)=\\frac{1}{1+s}
</math-field><br>
We compute G(i&omega;) and separate into its real- and imaginary parts:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
G(i\\omega)=\\frac{1}{1+i\\omega}=\\frac{1-i\\omega}{1+\\omega^2}
=\\frac{1}{1+\\omega^2}-i\\frac{\\omega}{1+\\omega^2}
</math-field><br>
We see that the real part is positive, whereas the imaginary part is negative for all &omega;.
In other words, the Nyquist curve will be contained in the fourth quadrant. Further, we see that G(i&omega;) ≈ 1 for small &omega; and G(i&omega;) → 0 as 
&omega; → ∞.<br><br>
Most processes have low-pass characteristics. This means that the
output signal of the process is affected by low frequency inputs,
whereas high frequency signals are damped out. Since the distance
between the origin and points on the Nyquist curve describes the gain
of process, it is normal that the Nyquist curve approaches the origin
for high frequencies.
The phase shift between in- and output does usually increase with the
frequency. This is the explanation to the commonly found spiral shapes in the Nyquist diagram.`},


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plot_who":{q:"Who invented Bode plots?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset+graph_bode_mag_width/2,y:graph_bode_mag_y+graph_bode_mag_y_offset-10};},
  a:`Bode plots were developed by the American engineer Hendrik Wade Bode in the 1930s. They are fundamental tools in automatic control theory for analyzing the frequency response of dynamic systems.`},


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plots":{q:"Why are Bode plots useful?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset+graph_bode_mag_width/2,y:graph_bode_mag_y+graph_bode_mag_y_offset+graph_bode_mag_height/2};},
  a:`Imagine you're designing a sound system for a concert hall. You want to ensure that the system delivers clear and balanced sound across a wide range of frequencies. Bode plots help engineers understand how the system responds to different frequencies, allowing them to optimize its performance.<br><br>
Bode plots display the magnitude and phase of a system's frequency response on logarithmic scales. This makes it easier to visualize how a system amplifies or attenuates signals at different frequencies and how it shifts the phase of those signals.<br><br>
The Bode plot features two curves, |G(i&omega;)|
and arg G(i&omega;) as functions of &omega;.
The magnitude plot is drawn in a logarithmic scale, whereas the phase shift/argument is drawn in a linear scale. The frequency axis is
logarithmic.
The low frequency gain is often constant and corresponds
to the static gain of the process.<br><br>
By analyzing Bode plots, you can identify resonance frequencies, damping ratios, and stability margins of control systems. This information is crucial for designing stable and robust control systems for applications such as aircraft autopilots, electronic circuits, or motion control systems in robotics.`},



//Why does the Bode magnitude plot use magnitude instead of amplitude in automatic control? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
//Some automatic control engineers use decibel dB scale on their Bode magnitude plots instead of decimal magnitude numbers. Give me pros and cons of using decibel scale vs. log-scaled numbers.
  "Bode_mag":{q:"Why use logarithmic scale in the Bode magnitude plot?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset,y:graph_bode_mag_y+graph_bode_mag_y_offset-10};},
  a:`Magnitude, in this context, refers to the ratio of output signal amplitude to input signal amplitude, typically expressed as a real value, or in decibels (dB). Using log-scale magnitude allows engineers to compare signal levels across different frequencies on a logarithmic scale, which is more intuitive and easier to interpret.
Some automatic control engineers use the decibel (dB) scale on their Bode magnitude plots instead of decimal magnitude numbers.<br>
<b>Using Log-Scaled Numbers:</b>Pros:<ul>
<li>Direct Representation: Log-scaled numbers provide a direct representation of the logarithmic relationship between input and output signals, which can be beneficial for those with a strong mathematical background.<br>
<li>Simplicity in Conversion: Converting log-scaled numbers back to linear magnitude is straightforward, requiring basic exponentiation.<br>
<li>Simplicity in Visualization: For those familiar with logarithmic scales, log-scaled numbers may offer simpler visualization and interpretation of the frequency response.<br>
</ul>
Cons:<ul>
<li>Less Intuitive: Log-scaled numbers may be less intuitive for engineers without a strong mathematical background or experience with logarithmic scales, making interpretation more challenging.<br>
<li>Limited Direct Comparison: Direct comparison of gain values at different frequencies may be less straightforward compared to dB, potentially complicating the identification of critical system characteristics.<br>
</ul><b>Using Decibel (dB) Scale:</b>Pros:<ul>
<li>Logarithmic Representation: dB scale provides a logarithmic representation of magnitude, compressing a wide range of values into a more manageable scale. This simplifies visualization and interpretation of the frequency response over a broad range of frequencies.<br>
<li>Relative Sensitivity: dB scale emphasizes relative changes in magnitude rather than absolute values, making it easier to focus on significant changes in gain or attenuation, which is crucial in control systems where small changes can have significant effects.<br>
<li>Ease of Interpretation: dB values are more intuitive for many engineers, particularly those with backgrounds in signal processing or telecommunications. They provide a standardized way to express signal levels and system gains across different frequencies.<br>
<li>Direct Comparison: dB allows for direct comparison of gain values at different frequencies, simplifying the identification of critical system characteristics such as bandwidth, gain margin, and resonance frequencies.<br>
<li>Consistency with Standards: dB is consistent with industry standards and practices in fields like telecommunications and audio engineering, facilitating communication and collaboration among professionals.<br>
</ul>Cons:<ul>
<li>Complex Conversion: Converting dB values back to linear magnitude can be more complex compared to log-scaled numbers, especially for those less familiar with the dB scale.</li>
<li>Potential Misinterpretation: Some individuals may misinterpret dB values if they are not familiar with the scale, leading to errors in analysis or design.
</ul>`},
//Too long, so removed: While both decibel (dB) scale and log-scaled numbers have their advantages and disadvantages, the choice between them often depends on the engineer's background, preferences, and the specific requirements of the analysis or design task at hand.


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plot_phase":{q:"How do we get the Bode plot phase curve?",pos:function(){return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset+graph_bode_phase_width/2,y:graph_bode_phase_y+graph_bode_phase_y_offset+graph_bode_phase_height/2};},
  a:`

<h3>Bode phase for real poles and zeros G(s)&nbsp;=&nbsp;(1+Ts)<sup>n</sup></h3>
The argument of the transfer function G(s)&nbsp;=&nbsp;(1+Ts)<sup>n</sup> is given by
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) = n \\arg (1+i\\omega T) = n\\arctan(\\omega T) 
</math-field><br>
For small values of &omega; the function is given by<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) \\rightarrow 0
</math-field><br>
For large values of &omega; the functions is given by<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) \\rightarrow n\\frac{\\pi}{2}
</math-field><br>
The corner frequency is defined as &omega;=1/T.

<h3>Bode phase for a time delay G(s)&nbsp;=&nbsp;e<sup>-sL</sup></h3>
This transfer function describes a pure time delay.
This means that the output is identical to the input, except that it has been delayed by a time L, y(t)=u(t-L).
If one sends a sinusoid through such a process, it outputs a sinusoid with the same amplitude, but with a phase shift which is larger for higher frequencies. For the transfer function G(s)&nbsp;=&nbsp;e<sup>-sL</sup> the argument becomes<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) = \\arg e^{-i\\omega L} =-\\omega L
</math-field><br>
  `},



//Why is the step input response of a automatic control transfer function important? What can I learn from it? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Step_response":{q:"Why is the step input response important?",pos:function(){return {visible:true,x:graph_step_response_x+graph_step_response_x_offset+graph_step_response_width/2,y:graph_step_response_y+graph_step_response_y_offset+graph_step_response_height/2};},
  a:`Imagine you're driving a car with cruise control. When you press the accelerator pedal to set a new speed, the car's cruise control system adjusts the throttle to reach the desired speed smoothly and without overshooting. The step input response of the cruise control system shows how quickly and accurately the car reaches the new speed and how stable the system is during this transition.<br><br>
The step input response of a transfer function is important because it provides valuable insights into how a control system behaves when subjected to a sudden change in its input signal.<br><br>
By analyzing the step input response, engineers can determine several key characteristics of the control system:<br>
1. <b>Rise Time</b>: This is the time it takes for the system's output to reach a certain percentage (usually 90% or 95%) of its final value after the step input is applied. A shorter rise time indicates a faster response.<br>
2. <b>Settling Time</b>: This is the time it takes for the system's output to settle within a certain tolerance band around its final value and stay there. A shorter settling time indicates a faster response and better stability.<br>
3. <b>Overshoot</b>: This is the maximum deviation of the system's output from its final value during the transient response. Excessive overshoot can lead to oscillations or instability in the system.<br>
4. <b>Steady-State Error</b>: This is the difference between the desired output and the actual output of the system once it has settled. Minimizing steady-state error is important for achieving accurate and precise control.<br><br>
By analyzing these characteristics, you can evaluate the performance and stability of the control system and make necessary adjustments to improve its behavior. For example, if the system exhibits excessive overshoot or slow settling time, you may need to tune the controller parameters to achieve better response.<br><br>
The step input response of an automatic control transfer function is crucial for understanding and optimizing the dynamic behavior of control systems, ensuring they respond quickly, accurately, and stably to changes in their inputs.`},



//In automatic control and a resonant second order system, what is the damping factor? Give an answer with vivid examples of resonating systems, with correct automatic control vocabulary while keeping the rest of the english simple.

//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the damping factor &zeta; of a two-pole system with complex valued poles when we start with the differential equation, and compute the laplace transform and pole locations in the s-plane. Use an example such as a Mass-Spring-Damper System, described by m*d^2x/dt^2 + c*dx/dt + kx = F(t), where m, c, and k are mass, damping coefficient, and spring constant, respectively.</li>. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "Damping_factor_z":{q:"What is the damping factor (&zeta; or z)?",pos:function(){
    let span = document.getElementById('variable_z');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's imagine a bell as an example of a resonating system. When you strike a bell, it produces a ringing sound that gradually fades away. The damping factor determines how quickly the sound fades. If the bell has high damping, the sound dies down rapidly. But if the damping is low, the sound lingers for longer.<br><br>
The damping factor (often called z or the Greek letter zeta &zeta;) of a resonant second-order system measures how fast the system's oscillations fade away over time. It's like the system's ability to dampen or reduce its vibrations.<br><br>
Damping is crucial for ensuring stable and controlled behavior of systems. If a resonant system has insufficient damping, it can lead to excessive oscillations or even instability. Engineers adjust the damping factor to strike a balance between stability and responsiveness in control systems, just like tuning a bell to produce the desired sound.
<h3>How do we calculate the damping factor?</h3>
Let's walk through an example of computing the damping factor (&zeta;) of a Mass-Spring-Damper System, which is a common two-pole system in automatic control theory. Given is the differential equation for the Mass-Spring-Damper System:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
m\\frac{d^2x}{dt^2} + c\\frac{dx}{dt} + kx = F(t)
  </math-field><br>
where m is the mass, c is the damping coefficient, k is the spring constant, and F(t) is the input force as a function of time.

<h4>Step 1: Express in Standard Form</h4>
First, we express this second-order differential equation in a standard form by assuming F(t) = 0 (homogeneous solution).<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
m\\frac{d^2x}{dt^2} + c\\frac{dx}{dt} + kx = 0
  </math-field>

<h4>Step 2: Apply Laplace Transform</h4>
Applying the Laplace transform and assuming zero initial conditions (for simplicity), we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
ms^2X(s) + csX(s) + kX(s) = 0
  </math-field><br>
Rearranging terms gives us the characteristic equation:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
ms^2 + cs + k = 0
  </math-field>

<h4>Step 3: Compute Pole Locations</h4>
The roots of the characteristic equation will give us the pole locations in the s-plane. These roots can be calculated using the quadratic formula:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
s = \\frac{-c \\pm \\sqrt{c^2 - 4mk}}{2m}
  </math-field>

<h4>Step 4: Damping Factor &zeta;</h4>
The damping factor &zeta; is a non-dimensional measure that describes how oscillations in a system decay after a disturbance. The general form for the roots when there are complex-valued poles (underdamped system) is:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
s = -\\zeta\\omega_n \\pm \\omega_n\\sqrt{\\zeta^2 - 1}
  </math-field><br>
where &omega;<sub>n</sub> = √(k/m) is the natural frequency of the system. Comparing this with the roots obtained from the quadratic formula, we can deduce:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\zeta = \\frac{c}{2\\sqrt{mk}}
  </math-field><br>

As an example, assume a mass-spring-damper system with m=1&nbsp;kg, c=2&nbsp;Ns/m, and k=5&nbsp;N/m. First, calculate the natural frequency:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\omega_n = \\sqrt{\\frac{k}{m}} = \\sqrt{5} \\, \\text{rad/s}
  </math-field><br>
Then, calculate the damping factor &zeta;:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\zeta = \\frac{c}{2\\sqrt{mk}} = \\frac{2}{2\\sqrt{1 \\times 5}} = \\frac{2}{2\\sqrt{5}} = \\frac{1}{\\sqrt{5}}
  </math-field><br>

This calculates the damping factor of the system, showing us a direct measure of how quickly perturbations or oscillations will die out. Now you know how to take a differential equation representing a Mass-Spring-Damper System, convert it into its Laplace form to find its characteristic equation, then find the system's pole locations and, importantly, compute its damping factor. This process is fundamental in control theory for designing and analyzing system responses.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"Respond using HTML and LaTeX. In automatic control theory, what is the definition of phase margin? Give me three vivid examples where the phase margin is crucial. Answer with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "phase_margin":{q:"What is the phase margin?",pos:function(){
    let span = document.getElementById('phase_margin');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<b>Phase margin</b> is defined as the amount of additional phase lag at the gain crossover frequency that would lead to the system becoming unstable. The gain crossover frequency is the frequency at which the magnitude of the open-loop transfer function equals 1.0 (which sometimes is refered to as 0 dB). The phase margin is a measure of system stability; a higher phase margin indicates a more stable system. It is usually expressed in degrees.<br><br>
Mathematically, the phase margin can be expressed as<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>PhaseMargin = 180^\\circ + \\phi(\\omega_{gc})</math-field><br>
where &phi;(&omega;<sub>gc</sub>) is the phase of the open-loop transfer function at the gain crossover frequency &omega;<sub>gc</sub>.<br><br>
<b>Aircraft Autopilot Systems</b>: Stability is paramount in aircraft control systems to ensure smooth and safe flight operations. The phase margin plays a critical role in the design of autopilot systems, where it ensures that even with the presence of uncertainties in aircraft dynamics or external disturbances (like wind gusts), the system remains stable and can maintain or return to the desired flight path. A sufficiently high phase margin is needed to account for these uncertainties and provide a buffer against instability.<br>
<b>Industrial Robot Arms</b>: In robotic systems used for manufacturing or assembly, precise and stable control of robotic arms is essential for accuracy and efficiency. The phase margin is crucial in tuning the control systems that govern these robotic arms, making sure they can follow desired trajectories smoothly without oscillating or veering off course. This is especially important when the robotic arms are performing high-speed movements or delicate operations, where stability translates into safety and precision.<br>
<b>Automotive Cruise Control Systems</b>: Modern vehicles often come equipped with cruise control systems that automatically adjust the vehicle's speed to maintain a set speed. The stability of these control systems is heavily dependent on having an adequate phase margin. A good phase margin ensures that the vehicle smoothly accelerates or decelerates to the desired speed without excessive overshoot, undershoot, or oscillations, thereby enhancing both comfort and safety for passengers and other road users.<br><br>
In each of these examples, the phase margin ensures that the control system is sufficiently robust to handle deviations from ideal conditions without sacrificing performance or safety.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, what is the definition of phase crossover frequency? Give me three vivid examples where the phase crossover frequency is crucial. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "phase_crossover_frequency":{q:"What is the phase crossover frequency?",pos:function(){
    let span = document.getElementById('phase_crossover_frequency');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>The <strong>phase crossover frequency</strong> (often denoted as &omega;<sub>pc</sub>) refers to the frequency at which the phase angle of the open-loop transfer function of a system crosses through -180°. This is a crucial parameter in analyzing and designing control systems, especially when dealing with stability and performance characteristics as per the Nyquist stability criterion. At the phase crossover frequency, the phase margin of the system is determined, which is a measure of the system's tolerance to gain changes before becoming unstable.</p>
  <ul>
  <li><strong>Aerospace Control Systems:</strong> In the design of flight control systems for aircraft, the phase crossover frequency is vital in ensuring that the aircraft responds appropriately to pilot inputs without entering into oscillatory or unstable behavior. A well-designed phase crossover frequency helps in maintaining the aircraft's stability and maneuverability, especially during critical maneuvers.</li>
  <li><strong>Process Control in Chemical Plants:</strong> In chemical process control, maintaining the desired reaction conditions precisely is critical for both safety and product quality. The phase crossover frequency plays a key role in the design of control systems that regulate temperature, pressure, and flow rates within reactors. A poorly chosen phase crossover frequency can lead to system instability, leading to over-correction and oscillations, or even catastrophic failures in worst-case scenarios.</li>
  <li><strong>Automotive Cruise Control Systems:</strong> The phase crossover frequency is also critical in the design of cruise control systems, ensuring that the vehicle can maintain a set speed regardless of varying load conditions (like climbing hills or carrying additional passengers). An optimal phase crossover frequency ensures that the system provides smooth acceleration and deceleration, enhancing both comfort and fuel efficiency, without leading to instability that could cause uncomfortable ride experiences or loss of control.</li>
  </ul>
The phase crossover frequency is a fundamental concept in automatic control theory that influences the stability and performance of a wide variety of systems. Its proper determination is essential for the design of robust and effective control systems in numerous practical applications.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, what is the definition of gain margin? Give me three vivid examples where the gain margin is crucial. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "gain_margin":{q:"What is the gain margin?",pos:function(){
    let span = document.getElementById('gain_margin');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>The <strong>gain margin</strong> is a measure of the stability of a system. Specifically, it is the amount by which the system's open-loop gain can be increased before the system becomes unstable. The gain margin is calculated as:</p>
  <p>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\text{Gain Margin} = \\frac{1}{|G(j\\omega_{pc})|}
  </math-field>
    <math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\text{or in decibel scale, } Gain Margin_{dB} = 20 \\log_{10} \\left( \\frac{1}{|G(j\\omega_{pc})|} \\right)
  </math-field><br><br>
  <p>where |G(j&omega;<sub>pc</sub>)| is the magnitude of the open-loop transfer function G at the phase crossover frequency &omega;<sub>pc</sub>, where the phase angle is -180°.</p>
  <ul>
  <li><strong>Aircraft Control Systems:</strong> In aircraft, ensuring the stability of control systems like autopilots is crucial for safety. A significant gain margin allows for changes in aircraft dynamics due to different flight conditions (speed, altitude) without risking instability. For instance, abrupt maneuvers or changes in aerodynamic conditions could potentially push the system towards instability. A healthy gain margin ensures there's enough 'buffer' to handle such variations without compromising control.</li>

  <li><strong>Automotive Cruise Control:</strong> Cruise control systems maintain a vehicle's speed without manual input by adjusting the throttle position. Variations in vehicle load (e.g., passengers or cargo) and road inclinations can alter system dynamics. A sufficient gain margin ensures that the system can accommodate such changes and maintain speed without becoming unstable, avoiding oscillations or erratic speed adjustments.</li>

  <li><strong>Chemical Process Control:</strong> In chemical plants, the control of processes such as reactor temperatures, pressure, and flow rates is vital. These processes are highly sensitive to operating conditions. A control system with an adequate gain margin ensures stability even as the process dynamics change with varying reactant concentrations, temperature, or pressure. This is particularly crucial in ensuring consistent product quality and preventing potentially hazardous conditions.</li>
  </ul>
The gain margin is a fundamental measure in ensuring the stability of control systems across a variety of applications. By providing a quantifiable buffer against changes that could lead to instability, it plays a critical role in the design and analysis of robust control systems.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why is -180 degree on the y axis in the Bode phase plot important? Give me three vivid examples when feedback control goes wrong and the catastrophic results. Give your answer in HTML and LaTeX formatting, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "Bode_-180_degrees":{q:"Why is -180° important in the Bode phase plot?",pos:function(){
  let angle=-180;
  if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
    let screen_y = map(angle,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
    return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset,y:graph_bode_phase_y+graph_bode_phase_y_offset+screen_y}
  } else return {visible:false};},
  a:`<b>Tacoma Narrows Bridge Collapse (1940)</b>
  <p>The Tacoma Narrows Bridge collapse is a classic example of a physical system falling into catastrophic oscillation due to inadequate damping and feedback. The bridge entered a resonance condition under wind forces, which matched one of its natural frequencies. The aerodynamic feedback, supposed to dampen the motion, instead led to destructive oscillations because the dynamic response of the bridge was not correctly anticipated in the design.</p>
<b>Chernobyl Nuclear Disaster (1986)</b>
  <p>At Chernobyl, a series of operator errors compounded by a reactor design vulnerable to runaway conditions due to positive feedback led to an explosion and catastrophic meltdown. The reactor's design, which had a positive void coefficient, meant that an increase in temperature led to increased reactor power, a classic example of positive feedback leading to instability, contrary to the desired negative feedback for controlling nuclear reactions.</p>
<b>Air France Flight 447 Crash (2009)</b>
  <p>The crash of Air France Flight 447 offers a modern example where feedback control systems may have contributed to catastrophe. In this case, the aircraft's pitot tubes iced over, feeding incorrect airspeed data to the flight computers. The automated control systems, misled by this data, made inappropriate control commands that the pilots struggled to correct, ultimately leading to a fatal stall.</p>
The Bode phase plot is an essential tool for analyzing and designing control systems. A point of critical importance on this plot is the -180-degree mark on the y-axis. This angle is particularly significant because:
<ul>
<li><b>Phase Margin:</b> The -180-degree phase angle is pivotal in determining the phase margin of the system. The phase margin is the amount of additional phase lag at the crossover frequency (where the gain is 1 or 0 dB in the magnitude plot) that will bring the system to the verge of instability. A phase margin close to zero or negative indicates a system that could be unstable or exhibit poor transient behavior.
<li><b>Stability Criterion:</b> According to the Nyquist Stability Criterion, for a system to be stable, the closed-loop frequency response should not encircle the point (-1, j0) in the complex plane. A phase shift of -180 degrees combined with a gain greater than one at this phase shift means the system output will be in phase opposition to the input, potentially leading to positive feedback loop instead of the desired negative feedback. This creates the risk of undamped oscillations or instability.
<li><b>Feedback Control:</b> In a negative feedback loop, the goal is generally to subtract the feedback signal from the input signal. If the phase lag reaches -180 degrees at a frequency where the gain is higher than 1, then the feedback becomes positive instead, amplifying errors rather than correcting them, leading to potential instability.
</ul>
The -180-degree mark on a Bode phase plot is crucial for ensuring the stability of control systems by avoiding conditions that turn negative feedback into positive feedback, potentially causing undamped oscillations and instability. These examples elucidate the dire consequences of neglecting or miscalculating feedback control in engineering systems.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why is a transfer function with a time delay difficult to use feedback control with? Give me three vivid examples of systems with time delays. Give your answer in HTML and LaTeX formatting, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "time_delay_L":{q:"Why is a time delay a problem?",pos:function(){
    let span = document.getElementById('variable_L');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>A transfer function with a time delay presents significant challenges for feedback control implementation. Time delay in a system, often denoted as <i>L</i> or &tau;, effectively means that the system's output response to a control action is not instant but delayed by a certain time duration. This attribute complicates the use of feedback control for several reasons:</p>
<ul><li><b>Predictability:</b> The presence of a time delay makes the system's response less predictable. Feedback control relies on correcting errors by adjusting inputs based on the difference between the desired and actual outputs. A delay disrupts this dynamic, as adjustments made by the controller will not have an immediate effect, making it harder to stabilize the system.</li>
<li><b>Stability:</b> Time delays can introduce or exacerbate stability issues. In feedback systems, the controller's actions based on delayed information can lead to overcompensation, initiating oscillatory or even unstable behavior.</li>
<li><b>Performance:</b> Achieving desired performance metrics (like settling time, overshoot, and bandwidth) becomes more challenging with time delays since the delay limits how quickly and accurately the system can respond to changes.</li>
</ul>Examples of systems with time delays:
<ol><li><b>Networked Control Systems:</b> In systems where the control loops are closed via communication networks (such as the Internet), delays inherent in the network transmission can significantly affect the control performance, making it difficult to ensure stability and responsiveness.</li>
<li><b>Chemical Process Control:</b> Many processes in chemical engineering, such as distillation columns or chemical reactors, have inherent time delays due to the time it takes for heat, mass transfer, or chemical reactions to occur. Controlling these processes accurately requires accounting for these delays.</li>
<li><b>Automotive Engine Control:</b> There is a time delay between the moment the fuel injector is activated and when the increased engine power is realized. This delay must be considered in the engine control system to ensure optimal performance and fuel efficiency.</li>
</ol>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, in a system with two complex poles, what is the resonance frequency and what options do we have to deal with it? Give me three vivid examples of systems with resonance, both good and bad ones. Give your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "resonance_frequency_w":{q:"What about the resonance frequency w?",pos:function(){
    let span = document.getElementById('variable_w');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<h3>Beneficial Resonance</h3>
      <ul>
          <li><strong>Musical Instruments:</strong> The body of a violin acts as a resonator, amplifying the sound at certain frequencies, which enriches the music's quality and volume.</li>
          <li><strong>Radio Receivers:</strong> Tuning a receiver to resonate at a specific frequency allows it to selectively pick up the desired radio signal amidst numerous other signals.</li>
      </ul>
      <h3>Harmful Resonance</h3>
      <ul>
          <li><strong>Tacoma Narrows Bridge (1940):</strong> Due to resonance, the bridge experienced drastic oscillations in windy conditions, ultimately leading to its collapse. This classic example highlights the critical importance of considering resonance in engineering design.</li>
          <li><strong>Building Vibrations:</strong> Buildings that resonate with seismic or wind-induced vibrations can suffer from structural damage. This necessitates careful design to avoid resonant frequencies that could coincide with environmental forces.</li>
      </ul>
  A system with two complex poles exhibits a phenomenon known as <em>resonance</em>. The resonance frequency, often denoted as &omega;<sub>r</sub>, is a specific frequency at which the system's output amplitude significantly increases. This frequency is closely related to the natural frequency of the system but is affected by damping.</p>
      <p>To manage or mitigate the effects of resonance, there are several strategies we can employ:</p>
      <ol>
          <li><strong>Damping Increase:</strong> By increasing the damping ratio of the system, the peak of the resonance can be reduced, making the system less sensitive to variations around the resonance frequency.</li>
          <li><strong>Feedback Control:</strong> Implementing a feedback control strategy can help regulate the system's response, including at the resonance frequency, ensuring stability and desired performance.</li>
          <li><strong>Tuning:</strong> Adjusting the system parameters (such as spring constants or masses in mechanical systems) can shift the resonance frequency away from the operating range, thus minimizing its impact.</li>
      </ol>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, give four positive examples of outcomes of doing rapid exercises with quiz-type questions where the difficulty level adapts to the performance of the student. Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, just write the html code with the embedded LaTeX formulas."}]}'
  "quiz_badge":{q:"Who's the quiz for?",pos:function(){
    let span = document.getElementById('cap_0');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`It's for you. The adapting difficulty level of the quiz will help your training, regardless of your level, with rapid questions and personalized feedback where you make mistakes. You will get:
<ul>
    <li>Improved <strong>feedback-loop understanding</strong>: By engaging in adaptive difficulty exercises, you can grasp concepts such as the transfer function,<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{Y(s)}{U(s)},
  </math-field><br>
and the significance of stability in control systems more effectively. This approach ensures that the material is neither too challenging nor too easy, facilitating optimal learning progress.</li>
    <li>Increased <strong>frequency response analysis</strong> proficiency: You can enhance your understanding of Bode plots and Nyquist plots, crucial for determining the frequency response of a system. Through adaptive questioning, you will be gradually introduced to more sophisticated analysis techniques, improving your ability to assess system performance and stability margins using these methods, exemplified by the gain margin G<sub>m</sub> and phase margin &phi;<sub>m</sub>.</li>
    </ul>Click on the quiz icon to get started!`},
//    <li>Enhanced <strong>root locus skills</strong>: Adaptive quizzes can help you master the plotting of root locus diagrams, essential for analyzing system responses. Through tailored questions, students can progressively understand complex plots, for instance, how to determine the system's stability by examining the locations of poles in the s-plane, represented by (s = &sigma; + j&omega;).</li>
//    <li>Better <strong>PID controller tuning</strong>: Personalized exercises enable you to experiment with proportional (P), integral (I), and derivative (D) controller parameters and observe their effects on system performance, including minimizing the error signal, e(t). This hands-on approach helps demystify the process of optimizing a PID controller, given as<br>
//  <math-field read-only style='vertical-align:bottom;display:inline-block'>
//  PID(s) = K_p + \\frac{K_i}{s} + K_ds,
//  </math-field><br>
//for different system dynamics.</li>





//What is the closed-loop transfer function when the open-loop transfer function is \\frac{k_1}{1+T_1s} and the regulator is a PID controller with k_p, k_i and k_d?
  "GRAPH_ONE_POLE_WITH_PID_YR":{q:"What is the closed-loop response G<sub>YR</sub>?",pos:function(){
    let span = document.getElementById('One pole with PID R->Y');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<center><img src="images/PID_control_loop_v2.svg" width="80%"></center><br>
The closed-loop response is how the output Y responds to the input R.<br><br>
When we take our system and control it with, in this example, a PID controller, then the closed-loop response G<sub>YR</sub> will tell us how the output y(t) reacts to the reference input. The step input response graph shows a system with the reference input value 0.0 for time t<0, and reference value 1.0 when t>=0. Ideally, this would make the output y(t) also resemble a step function. However, it's difficult to make an ideal controller.<br>
  <h3>How do we get the closed-loop transfer function?</h3>
  To find the closed-loop transfer function G<sub>YR</sub>(s) when the open-loop transfer function is<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
and the regulator is a PID controller with gain K, and time constants T<sub>i</sub>, and T<sub>d</sub>, we need to first derive the transfer function of the PID controller and then use the concept of feedback control. The transfer function of this PID controller is given by:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
Now, the closed-loop transfer function G<sub>YR</sub>(s) is given by the formula for the feedback system:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{G_{PID}(s) \\cdot G(s)}{1 + G_{PID}(s) \\cdot G(s)}
  </math-field><br>
where G(s) is the open-loop transfer function.
Substituting the given values, we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot (\\frac{k_1}{1+T_1s})}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot (\\frac{k_1}{1+T_1s})}
  </math-field><br>
To simplify further, we can multiply both numerator and denominator by (1+T<sub>1</sub>s) to get rid of the denominators:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K (1 + \\frac{1}{sT_i} + sT_d) \\cdot k_1}{(1 + T_1s) + K (1 + \\frac{1}{sT_i} + sT_d) \\cdot k_1}
  </math-field><br>
Let's multiply the nominator and denominator by sT<sub>i</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K (sT_i + 1 + s^2 T_i T_d) \\cdot k_1}{(s T_i + T_1 T_i s^2) + K (s T_i + 1 + s^2 T_i T_d) \\cdot k_1}
  </math-field><br>
And finally, let's collect terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K k_1 (1 + T_i s + T_iT_ds^2)}{K k_1 + T_i (1 + K k_1)s + T_i (T_1 + K k_1 T_d)s^2}
  </math-field><br>
This gives us the closed-loop transfer function G<sub>YR</sub>(s) for the given open-loop transfer function and the PID controller.`},




//Sensitivity function
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, describe the sensitivity function for a system with one pole, controlled using a PI controller. Give three examples of systems where the sensitivity function is useful. Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you don't need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_S":{q:"What is the sensitivity function, S?",pos:function(){
    let span = document.getElementById('One pole with PID Sensitivity');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The sensitivity function, S(s), measures the system's sensitivity to changes in the open loop gain. For a system with one pole controlled by a Proportional-Integral-Derivative (PID) controller, S(s) can be defined as follows:</p>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1}{1 + G_{PID}(s)G(s)}
  </math-field><br>
      <p>where G(s) is the transfer function of the plant, and G<sub>PID</sub>(s) is the transfer function of the PID controller.</p>
      <p>The sensitivity function is particularly useful in evaluating and designing control systems to ensure robust performance. It helps in identifying how the system's output is affected by disturbances or changes in system parameters.</p>
      <h3>Examples of Systems Where the Sensitivity Function is Useful</h3>
      <ol>
          <li>Automotive Cruise Control: Helps to assess how changes in vehicle load or hill gradient affect the speed control.</li>
          <li>Temperature Regulation Systems: Important for determining how external temperature fluctuations or changes in the heating element characteristics affect the controlled temperature.</li>
          <li>Robotics: Used to evaluate how variations in load or joint stiffness influence the robot's position control accuracy.</li>
      </ol>
<h3>How do we get the sensitivity function?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for the sensitivity function above gives us:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}}
  </math-field><br>
Let's multiply by 1+T<sub>1</sub>s in both the nominator and denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1 + T_1s}{1 + T_1s + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot k_1}
  </math-field><br>
Let's multiply by sT<sub>i</sub> in both the nominator and denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{sT_i + T_1 T_i s^2}{s T_i + T_1 T_i s^2 + K (T_i s + 1 + T_iT_d s^2) \\cdot k_1}
  </math-field><br>
And we collect the terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{sT_i(1 + T_1 s)}{K k_1 + (K k_1 T_i + T_1) s + T_i (T_1 + K k_1 T_d) s^2}
  </math-field>`},


//Load
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, explain why the transfer function from the load (or a disturbance that is added to the input of the plant) to the output is useful when using a PID controller to control a first order system with transfer function G(s). Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you do not need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_YL":{q:"Why do we look at the Load Disturbance Transfer Function G<sub>YL</sub> in PID Control?",pos:function(){
    let span = document.getElementById('One pole with PID Load');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Understanding the impact of a load (or a disturbance) on the system is vital for designing an effective control strategy. To manage the system effectively, the transfer function of the controlled system, or plant, G(s), is combined with the transfer function of the PID controller, G<sub>PID</sub>(s), to analyze the overall system behavior.</p>
      <p>When a load or disturbance influences the system, it impacts the output directly. To comprehend this effect, the transfer function from the load to the output is derived. This function elucidates how disturbances affect the system's output, aiding in designing the PID controller to mitigate these effects, ensuring the system's output remains stable and tracks the desired setpoint effectively.</p>
      <p>Let's denote the transfer function from the load to the output as G<sub>YL</sub>. This function is critical because it provides insight into the system's robustness and sensitivity to external disturbances. By minimizing the impact of G<sub>YL</sub>, the PID controller helps maintain the system's performance even in the presence of unexpected loads or disturbances.</p>
      For a first order system with transfer function G(s) being controlled by a PID controller, the goal is to adjust the PID parameters K, T<sub>i</sub>, and T<sub>d</sub> to achieve a balance where the system remains stable, achieves the desired speed of response, and minimizes the effect of any load or disturbance on the output.
<h3>How do we get the load-to-output transfer function G<sub>YL</sub>?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for G<sub>YL</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{G}{1 + G_{PID} \\cdot G}
  </math-field><br>
we end up with:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{\\frac{k_1}{1+T_1s}}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}}
  </math-field><br>
Let's multiply nominator and denominator with 1+T<sub>1</sub>s:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1}{(1+T_1s) + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot k_1}
  </math-field><br>
Let's multiply nominator and denominator with sT<sub>i</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 s T_i}{(1+T_1s)sT_i + K \\left(sT_i + 1 + sT_isT_d\\right) \\cdot k_1}
  </math-field><br>
Let's get rid of the paranthesis in the denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 T_i s}{sT_i + T_1T_is^2 + Kk_1T_is + Kk_1 + Kk_1T_iT_ds^2}
  </math-field><br>
Let's group our terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 T_i s}{Kk_1 + T_i(1 + Kk_1)s + T_i(T_1 + Kk_1T_d)s^2}
  </math-field><br>
...and we end up with an expression where we can insert our coefficients, and we can see that this is a second-order transfer function, since the largest power of s in the denominator is 2.
      `},



//Open-loop
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, describe what can be learnt from the open-loop transfer function G_{OL}(s) = G_{PID}(s) * G(s) when using a PID controller to control a first order system with transfer function G(s). Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you do not need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_OPEN":{q:"How can we use the open-loop transfer function G<sub>OL</sub>?",pos:function(){
    let span = document.getElementById('One pole with PID open-loop');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The open-loop transfer function, denoted as G<sub>OL</sub>(s) = G<sub>PID</sub>(s) * G(s), is a fundamental concept when using a PID (Proportional-Integral-Derivative) controller to manage a first order system represented by its transfer function G(s). This function provides crucial insights into the behavior of the control system before the feedback loop is closed. Here are several aspects one can learn from G<sub>OL</sub>(s):</p>
  <ul>
      <li><strong>System Type and Order:</strong> By examining G<sub>OL</sub>(s), we can identify the overall order and type of the system. The order is determined by the highest power of s in the denominator of G<sub>OL</sub>(s), which influences the system's response time and stability. The type, defined by the number of integrators (or poles at the origin), affects the system's ability to track step, ramp, and parabolic inputs without steady-state error.</li>
      <li><strong>Stability:</strong> The roots of the denominator of G<sub>OL</sub>(s), also known as the poles of the system, can be analyzed to assess stability. In general, for a system to be stable, all poles must have negative real parts (lie in the left half of the s-plane). This assessment is crucial before applying feedback.</li>
      <li><strong>Gain and Phase Margins:</strong> G<sub>OL</sub>(s) can be used to calculate the gain and phase margins, which are indicators of how much the system's gain or phase can change before the system becomes unstable. These margins are essential for designing a robust control system that can tolerate certain levels of model inaccuracies and disturbances.</li>
      <li><strong>Frequency Response:</strong> From G<sub>OL</sub>(s), the frequency response of the system can be derived, which shows how the system responds to different frequencies of input signals. This is particularly useful for understanding the resonance frequencies and the bandwidth of the system, which are critical for ensuring the desired speed of response without excessive oscillations or noise amplification.</li>
      <li><strong>PID Tuning Insights:</strong> The incorporation of G<sub>PID</sub>(s) in G<sub>OL</sub>(s) helps in tuning the PID controller's parameters (Proportional, Integral, and Derivative gains). By altering these gains and analyzing the resulting open-loop transfer function, one can achieve desired transient response characteristics (like settling time, overshoot) and steady-state performance (like steady-state error).</li>
      </ul>
  Understanding these aspects through the analysis of G<sub>OL</sub>(s) is pivotal for designing and implementing effective PID control strategies in automatic control systems.
<h3>How do we get the open-loop transfer function G<sub>OL</sub>?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for G<sub>OL</sub> above, we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}
  </math-field><br>
Aiming for getting one single denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1}{1+T_1s} \\left(\\frac{sT_i + 1 + sT_isT_d}{sT_i}\\right)
  </math-field><br>
And multiplying these together:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1(sT_i + 1 + sT_isT_d)}{sT_i(1+T_1s)}
  </math-field><br>
Grouping the terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1(1 + T_is + T_iT_ds^2)}{T_i(s+T_1s^2)}
  </math-field><br>
...and we end up with our open-loop transfer function. The reason you would want to simplify the expression as shown above is to get a formula that can be used by inserting our constants, and also to see the structure of the nominator and denominator polynomials - this is a second-order transfer function, since the highest power of s in the denominator is 2.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why do we use PID controllers, what is the transfer function of a PID-controller? Explain why the introduction of the PID controller was such a revolution using three vivid examples. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_PID":{q:"What is a PID controller?",pos:function(){
    let span = document.getElementById('PID controller');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`In automatic control theory, PID controllers are used to regulate the behavior of a system. A PID controller combines three types of control: Proportional (P), Integral (I), and Derivative (D). These components are combined to make control decisions that help a system reach its desired setpoint efficiently and with minimal error.
The PID controller function can be described as<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
u(t)=K\\left[e(t)+\\frac{1}{T_i}\\,\\int\\limits^t\\,e(\\tau)\\,d\\tau\\,+ 
    T_d \\frac{de(t) }{ dt}\\right]=P+I+D
</math-field><br>
where u is the controller output, and e is the error, i.e. the
difference between the reference value r (the set point)
and process output y (the measured variable). The transfer function of a PID controller is given by:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
  Where: G<sub>PID</sub>(s) is the transfer function in the Laplace domain, K is the gain of the controller, T<sub>i</sub> is the time constant of the integral term, T<sub>d</sub> is the time constant of the derivative term, and s is the complex frequency variable in the Laplace transform.<br><br>
<center><img src="images/PID_control_loop_v2.svg" width="80%"></center><br>
The PID controller is usually connected in a feedback loop as in the image above, responding to the error e, and producing a suitable input signal U to the system trying to make the output Y as similar to the reference signal R as possible.<br><br>
  The introduction of the PID controller was revolutionary in the field of automatic control theory for several reasons:
  <h3>Improved Stability and Performance in Industrial Control Systems</h3>
  <div>The introduction of PID controllers allowed for significant improvements in the stability and performance of industrial control systems. For example, in a chemical processing plant, maintaining the temperature at a specific point is crucial for the quality of the product. A PID controller can take the temperature readings (process variable), compare it to the desired setpoint, and adjust the heat input (control variable) proportionally (P), based on the accumulated error over time (I), and anticipating future trends (D). This fine-tuned control prevents overshoot and helps maintain the temperature within a very narrow range, leading to consistent product quality.</div>
  <h3>Automation in Automotive Systems</h3>
  <div>PID controllers have been fundamental in the automation of various systems within the automotive industry, notably in cruise control. Traditional systems could struggle with maintaining a set speed over varying terrains. Through the application of PID control, a vehicle can automatically adjust the throttle position to maintain the set speed as closely as possible, considering changes in road gradient and load. For example, when driving uphill, the controller anticipates the need for more power and adjusts accordingly, ensuring smoother rides and enhanced fuel efficiency.</div>
  <h3>Flight Control Systems</h3>
  <div>In aerospace, the precision and reliability of PID controllers have enabled advancements in flight control systems. Automatic altitude control is a pertinent example. A PID controller can continuously adjust the aircraft's control surfaces to maintain a target altitude, taking into account the varying aerodynamic forces and disturbances. This capability is crucial not only for passenger comfort but also for reducing pilot workload, especially during long-haul flights or when flying through turbulent weather conditions.</div><br>`},
//  In conclusion, the PID controller's ability to combine real-time error correction with predictive and historical data makes it a versatile and powerful tool in automatic control theory. Its widespread adoption across various industries underscores its importance in enhancing control system performance, stability, and efficiency.





//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a one-pole system when we start with the differential equation. Use an example of heating water. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_ONE_REAL_POLE":{q:"How do we get this transfer function for one pole?",pos:function(){
    let span = document.getElementById('One real pole');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`To explain how to derive the transfer function G(s) of a one-pole system, let’s consider a simplified example in the context of heating water, a common process in automatic control systems. The goal is to understand how the temperature of the water changes in response to some heating input.<br><br>
  Our starting point is the first-order differential equation that represents the dynamic behavior of the system. In this case, it involves the rate of temperature change in the water in relation to the heating power applied.<br><br>

  Let’s say the differential equation is:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\frac{dT}{dt} = K \\cdot P(t)
  </math-field><br>

  where,<br>
  - T is the temperature of the water,<br>
  - t is time,<br>
  - K is a constant that combines the properties of the water and the heating element (like the heat transfer coefficient),<br>
  - P(t) is the heating power applied, a function of time.<br><br>

  <h3>Step 1: Laplace Transform</h3>
  The first step is to apply the Laplace transform to both sides of the differential equation. The Laplace transform of a function f(t), designated as F(s), translates the function from the time domain into the complex frequency domain, represented by s.<br><br>
  The Laplace transform of dT/dt is sT(s) - T(0), where T(s) is the Laplace transform of T(t), and T(0) represents the initial condition (initial temperature of the water, which we'll assume to be zero for simplicity).

  Hence, after applying the Laplace transform, our equation becomes:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  sT(s) = K \\cdot P(s)
  </math-field><br>
  Note: We have dropped the initial condition for simplicity, assuming it to be zero.

  <h3>Step 2: Transfer Function</h3>

  The transfer function, G(s), of a system is defined as the ratio of the output (in the Laplace domain) to the input (also in the Laplace domain), under the assumption of zero initial conditions. In our example, the output is T(s), and the input is P(s).<br><br>

  From the Laplace-transformed equation, rearrange for G(s):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{T(s)}{P(s)} = \\frac{K}{s}
  </math-field><br>

  This denotes that the system has a simple pole at s = 0, indicating that the system's response will have characteristics akin to a first-order system, such as an exponential rise or decay depending on the input.<br><br>

  In controlling the temperature of the water, G(s) gives us crucial information on how the system will respond to various inputs. By understanding the transfer function, control strategies, such as PID (Proportional-Integral-Derivative) control, can be designed and implemented to achieve desired temperature regulation accurately and efficiently.

  This example illustrates the fundamental steps of deriving the transfer function of a one-pole (first-order) system, moving from a time-domain differential equation to a frequency-domain representation, crucial for analyzing and designing control systems in automatic control theory.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a two-pole system with real valued poles when we start with the differential equation. Use an example of suspension system in a car. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TWO_REAL_POLES":{q:"How do we get this transfer function for two real poles?",pos:function(){
    let span = document.getElementById('Two real poles');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's walk through the process of deriving the transfer function G(s) for a two-pole system, taking a car suspension system as an illustrative example. In an automatic control context, a suspension system aims to minimize the impact of road bumps on the car's body, enhancing passenger comfort. This system can be simplified to a mass-spring-damper model.

  <h3>Step 1: Define the Physical System</h3>
  Consider a car suspension system simplified as: m is the mass of the car body, c is the damping coefficient (represents the shock absorber), k is the spring constant. The external force on the system, F(t), is due to road irregularities. The displacement of the mass from its equilibrium position is x(t).

  <h3>Step 2: Write the Differential Equation</h3>
  The dynamics of the system can be captured by the second-order differential equation derived from Newton's second law of motion:
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  m\\frac{d^2x(t)}{dt^2} + c\\frac{dx(t)}{dt} + kx(t) = F(t)
  </math-field><br>

  <h3>Step 3: Laplace Transform</h3>
  To find the transfer function G(s), we apply the Laplace transform to the differential equation, assuming zero initial conditions.<br>
  Laplace transforms of derivatives are<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\mathcal{L}\\left\\{\\frac{d^n f(t)}{dt^n}\\right\\} = s^n F(s) - s^{n-1}f(0) - ... - f^{(n-1)}(0),
</math-field><br>
  where f(0) and its derivatives up to (n-1) are initial conditions and are zero in our case.
  Applying the Laplace transform gives:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  ms^2X(s) + csX(s) + kX(s) = F(s)
</math-field><br>

  <h3>Step 4: Derive the Transfer Function</h3>
  The transfer function G(s) is defined as the output over the input in the Laplace domain, where the output is X(s) and the input is F(s).<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{X(s)}{F(s)} = \\frac{1}{ms^2 + cs + k}
</math-field><br>

  <h3>Step 5: Identify the Poles</h3>
  The poles of the system are the roots of the characteristic polynomial in the denominator of G(s):<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  ms^2 + cs + k = 0
</math-field><br>

  The solutions to this quadratic equation are:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\frac{-c \\pm \\sqrt{c^2 - 4mk}}{2m}
</math-field><br>

  As an example, let's say our suspension system has mass m=1000&nbsp;kg, damping coefficient c=1000&nbsp;Ns/m, and spring constant k=5000&nbsp;N/m.
  Then the transfer function becomes:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{1}{1000s^2 + 1000s + 5000}
</math-field><br>
  And the poles would be:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\frac{-1000 \\pm \\sqrt{1000^2 - 4 \\cdot 1000 \\cdot 5000}}{2 \\cdot 1000}
</math-field><br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\frac{-1000 \\pm \\sqrt{-16000000}}{2000}
</math-field><br>
  This illustrates a system with complex conjugate poles, indicating an underdamped system typical for making the car suspension comfortable by allowing it to \"bounce\" slightly before settling. Notice, however, in this example and the given values, the calculation gives real poles, and we will end up with the transfer function for two real poles.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a two-pole system with complex valued poles when we start with the differential equation. Use an example of Pendulum Dynamics (Small Angle Approximation) - Described by d<sup>2</sup>&theta;/dt<sup>2</sup> + g/l * &theta; = 0, where g is the acceleration due to gravity and l is the pendulum length.</li>. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TWO_COMPLEX_POLES":{q:"How do we get this transfer function for two complex poles?",pos:function(){
    let span = document.getElementById('Two complex poles');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's derive the transfer function G(s) of a system with complex-valued poles, using the example of a pendulum's dynamics under the small angle approximation. This is a fundamental concept in automatic control theory, which helps us understand system behavior in response to inputs. We'll start with the pendulum's differential equation and proceed step-by-step.
  <h3>Differential Equation</h3>
  For a simple pendulum under the small angle approximation, the equation of motion is given as follows:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\frac{d^2\\theta}{dt^2} + \\frac{g}{l}\\theta = 0,
</math-field><br>
  where: &theta; is the angular displacement (in radians), g is the acceleration due to gravity m/s<sup>2</sup>, l is the length of the pendulum (m).<br>

  <h3>Laplace Transform</h3>
  To find the transfer function G(s), we first apply the Laplace transform to the differential equation. The Laplace transform of a derivative transforms derivatives into algebraic terms, making the equation easier to manipulate.
  Given a function f(t), the Laplace transform of its second derivative is s<sup>2</sup>F(s) - s*f(0) - f'(0), where F(s) is the Laplace transform of f(t). Assuming zero initial conditions &theta;(0)=0 and d&theta;/dt(0)=0, which is common in control theory for simplicity, the Laplace transform of our differential equation becomes:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s^2\\Theta(s) + \\frac{g}{l}\\Theta(s) = 0,
</math-field><br>
  where &Theta;(s) is the Laplace transform of &theta;(t).

  <h3>Rearranging the equation</h3>
  Collecting terms, we express the above equation as:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  (s^2 + \\frac{g}{l})\\Theta(s) = 0.
</math-field><br>
  To find the transfer function G(s), we usually express the equation in the form of &Theta;(s) = G(s) * Input(s). However, in our case, the equation represents natural dynamics without an explicit input. For educational purposes, if we consider a modified equation that includes an input, such as a torque or a force F(t) that influences &theta;(t), we could write:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\frac{d^2\\theta}{dt^2} + \\frac{g}{l}\\theta = F(t),
</math-field><br>
  and the Laplace transform would give us (assuming F(t) is the input):<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s^2\\Theta(s) + \\frac{g}{l}\\Theta(s) = F(s).
</math-field><br>
  From this point, we can express &Theta;(s) in terms of F(s) and derive the transfer function.

  <h3>Transfer Function</h3>
  The transfer function G(s) is defined as the ratio of the output (in this case, &Theta;(s)) to the input F(s), determined under the assumption of zero initial conditions. So, we have:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{\\Theta(s)}{F(s)} = \\frac{1}{s^2 + \\frac{g}{l}}.
</math-field><br>

  <h3>Complex Poles</h3>
  The characteristic equation of the system is the denominator of G(s), which is:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s^2 + \\frac{g}{l} = 0.
</math-field><br>
  Solving for s, we find the poles of the system:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\pm\\sqrt{-\\frac{g}{l}} = \\pm j\\sqrt{\\frac{g}{l}}.
</math-field><br>
  These are complex-valued poles, indicating the oscillatory nature of the pendulum’s motion. The presence of j (the imaginary unit) indicates that the system will exhibit sinusoidal oscillations, with a frequency dependent on √(g/l).<br><br>

  By transforming the differential equation of a pendulum into the s-domain, we obtained the transfer function G(s), revealing complex poles which indicate the oscillatory response of the system. This approach using Laplace transforms is pivotal in control theory, allowing the analysis and design of control systems based on the system’s dynamics represented by its transfer function.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the laplace transform of a time delay in a one-pole system. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TIME_DELAY":{q:"How do we get this transfer function for a time delayed system?",pos:function(){
    let span = document.getElementById('Time delay');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The Laplace transform of a function f(t), where t represents time and f(t) is a time-domain function, is given by:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
F(s) = \\mathcal{L}\\{f(t)\\} = \\int_{0}^{-\\infty} e^{-st}f(t) dt
</math-field><br>
Here, s is a complex frequency variable, and F(s) is the Laplace transform of f(t), representing the function in the s-domain. A one-pole system can be described by a first-order differential equation. For example, the time-domain representation might look like f(t) = e<sup>-at</sup>, where a is a constant. The Laplace transform of f(t) is:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
F(s) = \\mathcal{L}\\{e^{-at}\\} = \\frac{1}{s+a}
</math-field><br>

Now, let's introduce a time delay. If our system has a time delay T<sub>d</sub>, the output signal is delayed by T<sub>d</sub> units in time. For a generic function f(t), the time-delayed function is f(t - T<sub>d</sub>).

The Laplace transform of a time-delayed function f(t-T<sub>d</sub>) can be derived using a shift theorem and is given by:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
F(s, T_d) = e^{-T_ds}\\mathcal{L}\\{f(t)\\}
</math-field><br>

Assume our one-pole system's time-domain function with a time delay T<sub>d</sub> is f(t-T<sub>d</sub>) = e<sup>-a(t-T<sub>d</sub>)</sup>. To find the Laplace transform of this time-delayed function, we'd apply the formula for a time-delayed function:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
F(s, T_d) = e^{-T_ds}\\mathcal{L}\\{e^{-at}\\} = e^{-T_ds} \\cdot \\frac{1}{s+a}
</math-field><br>
`},

//To describe the process of obtaining the Laplace transform of a time delay in a one-pole system, we'll begin with the basics and then move into the specific scenario you're asking about. Time delays are common in control systems and understanding their impact is crucial for designing effective controllers.\n\n### What is a Time Delay?\n\nIn automatic control, a time delay (often denoted as \\(T_d\\) or \\(\\tau\\)) represents a period during which the response of a system is deferred. This can occur due to physical limitations, processing times, or transport phenomena among others. Time delays are especially critical in control theory because they can significantly affect the stability and performance of control systems.\n\n
//### Conclusion. In the context of a one-pole system with a time delay, applying the Laplace transform allows us to convert the time-domain behavior, including the delay effect, into the s-domain. This is crucial for analyzing and designing control systems, as working in the s-domain can simplify many aspects of controller design, including stability and performance analysis.
//<p>The Laplace transform of a time-delayed one-pole system is represented as:</p>
//<p>\\(F(s, T_d) = e^{-T_ds} \\cdot \\frac{1}{s+a}\\)</p>
//<p>This formula combines the effects of the system's dynamics and the time delay into a single s-domain expression, facilitating the analysis and design of control systems dealing with delays.</p>
//This representation offers a clear picture of how the time delay affects the system’s behavior in the frequency domain, providing valuable insights for control engineers.


};
function enable_questions(){
  have_asked_questions=true;
  remove_banner_if_needed();
  questions_enabled = true;
  let questions_icon_svg = document.getElementById("questions_icon_svg");
  questions_icon_svg.style.fill="#5050ff";
  let s="";
  // Find out the placement of question icons:
  for (let q_id in all_questions){
    let q_position = all_questions[q_id].pos();
    if (q_position.visible){
      s += "<div class='question_div' id='"+q_id+"' style='top:"+(q_position.y+6)+"px;left:"+(q_position.x+4)+"px;'>";
//      s += '<svg fill="#ffff00a0" width="100px" height="100px" viewBox="0 0 24 24"><use href="#icon_help"/></svg>';
      s += '<img src="images/question_small.webp" width="100px" style="opacity:0.8">';
      s += "</div>";
    }
  }
  // Find out the placement of question icons for tasks in assignments:
  for (let task_id in all_tasks){
    if (all_tasks[task_id].a!=null){ // Yes, there is an answer connected to this task:
      let span = document.getElementById('task_'+task_id);
      if (span!=null){
        let rect = span.getBoundingClientRect();
        let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
        let scroll_y = window.pageYOffset || document.documentElement.scrollTop;
        let x=scroll_x + rect.left + rect.width/2;
        let y=scroll_y + rect.top + rect.height/2;
        s += "<div class='question_div' id='task_"+task_id+"' style='top:"+(y+6)+"px;left:"+(x+4)+"px;'>";
        s += '<img src="images/question_small.webp" width="100px" style="opacity:0.8">';
        s += "</div>";
      }
    }
  }
  let questions_div=document.getElementById("questions_div");
  questions_div.innerHTML=s;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML="";
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.remove('active');
}
function disable_questions(){
  questions_enabled = false;
  let questions_icon_svg = document.getElementById("questions_icon_svg");
  questions_icon_svg.style.fill=null;
  let questions_div=document.getElementById("questions_div");
  questions_div.innerHTML="";
  let hover_answer = document.getElementById("hover_answer");
  hover_answer.style.visibility="hidden";
  hover_answer.innerHTML="";
  last_hover_answer_id="";
}

function answerToggle(event){
  add_event("answer_toggle");
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.toggle('active');
}

function show_answer (q_id){
  // Show a box with the text for the q_id question:
  let s="";
  s+="<h2>" + all_questions[q_id].q + "</h2>";
  s+=all_questions[q_id].a;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML=s;
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.add('active');
}

function show_answer_to_task(task_id){
  add_event("show_answer_to_task="+task_id);
  // Show a box with the text for the task_id task:
  let s="";
  s+=all_tasks[task_id].a;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML=s;
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.add('active');
  toggleElement.style.animation = 'none';
  toggleElement.offsetHeight; /* trigger reflow */
  toggleElement.style.animation="slidein 1.0s ease-out 1";
  let placement=all_tasks[task_id].placement;
  toggleElement.style.top=null;
  toggleElement.style.bottom=null;
  toggleElement.style.left=null;
  toggleElement.style.right=null;
  if (placement==null){
    toggleElement.style.top="30%";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="UL"){
    toggleElement.style.top="5%";
    toggleElement.style.left="3%";
  } else if (placement=="UC"){
    toggleElement.style.top="5%";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="UR"){
    toggleElement.style.top="5%";
    toggleElement.style.right="390px";
  } else if (placement=="DL"){
    toggleElement.style.bottom="120px";
    toggleElement.style.left="3%";
  } else if (placement=="DC"){
    toggleElement.style.bottom="120px";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="DR"){
    toggleElement.style.bottom="120px";
    toggleElement.style.right="390px";
  }
}





// ---------------- end of questions and answer code

function toolboxMenuToggle(event){
  add_event("toolbox_toggle");
  let toggleElement = document.querySelector('.toolbox');
  toggleElement.classList.toggle('active');
}

function infoToggle(event){
  add_event("view_info");
  achievement_done("view_info");
  let toggleElement = document.querySelector('.info');
  toggleElement.classList.toggle('active');
}

const copy_code = async () => {
  let text=document.getElementById('the_code').innerHTML;
  try {
    await navigator.clipboard.writeText(text.replace(/(?:<br>)/g, "\n"));
    //console.log('Content copied to clipboard');
  } catch (err) {
//      console.error('Failed to copy: ', err);
  }
}

function download_script(id){
  let element = document.getElementById("download_script_box");
  element.innerHTML = 
    `This is the<select id="language-choices" style="height:30px;margin-top:9px;margin-left:8px" onchange="update_programming_language(${id})">
  <option value="Python">Python script</option>
  <option value="MATLAB">MATLAB script</option>
  <option value="Julia">Julia code</option>
</select> for plotting your transfer function.<br>Copy to clipboard:
<button type="button" onclick="copy_code()" class="copy-button"><svg width="28" height="28" viewBox="0 0 24 24" fill="#404040" style="vertical-align:middle"><use href="#icon_content_copy"/></svg></button>
<button type="button" class="close-window" onclick="hide_script()"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>
<br><br><div id="the_code"></div>`;

  let toggleElement = document.querySelector('.download_script_box');
  toggleElement.classList.toggle('active');
  update_programming_language(id);
}

function update_programming_language(id){
  let selected_language = document.getElementById("language-choices").value;
  let code="";
  if (selected_language == "Python"){
    code = get_python_script(id);
  } else if (selected_language == "Julia"){
    code = get_julia_script(id);
  } else {
    code = get_matlab_script(id);
  }
  let element = document.getElementById("the_code");
  element.innerHTML = code;
}

function get_python_script(id){
  add_event("get_python_script");
  achievement_done("python_script");
  let current_graph;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_id == id){
      current_graph = bode_graphs[i];
    }
  }
  let python_string = "";
  if (current_graph.bode_formula == GRAPH_ONE_REAL_POLE.formula){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    python_string = "k_1 = " + k_1 + "\nT_1 = " + T_1 + "\n" + "num = [k_1]\nden = [T_1, 1]";
  } else if (current_graph.bode_formula == GRAPH_TWO_REAL_POLES.formula){
    let k_2 = range_slider_variables[variable_position["k_2"]];
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    python_string = "k_2 = " + k_2 + "\nT_2 = " + T_2 + "\n" + "T_3 = " + T_3 + "\n" + "num = [k_2]\nden = [T_2*T_3, T_2+T_3, 1]";
  } else if (current_graph.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
    let k_3 = range_slider_variables[variable_position["k_3"]];
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    python_string = "k_3 = " + k_3 + "\nw = " + w + "\n" + "z = " + z + "\n" + "num = [k_3*w*w]\nden = [1, 2*z*w, w*w]";
  } else {
    return "";
  }

  let html=`# Make sure you have the control module installed. You can install it using:
# pip install control
import control
import matplotlib.pyplot as plt
import numpy as np
# Clear previous plots:
plt.close('all')

# Creating the transfer function:
${python_string}
system = control.tf(num, den)
print ("Transfer function G(s)=", system)

# Plot poles and zeroes:
plt.figure(1)
(poles, zeros) = control.pzmap(system)
plt.title('Pole-Zero Map')
plt.show(block=False)
print ("poles=", poles)
print ("zeros=", zeros)

# Step response for the system
plt.figure(2)
(time, output) = control.step_response(system)
plt.plot(time, output)
plt.title('Step input response')
plt.show(block=False)

# Plot Bode diagram:
plt.figure(3)
Gmag, Gphase, Gomega = control.bode_plot(system, plot=True)
plt.title('Bode Diagram')
plt.show(block=False)

# Nyquist plot for the system
plt.figure(4)
control.nyquist(system,mirror_style=False)
plt.axis('equal')
plt.show(block=False)

`.replace(/(?:\r\n|\r|\n)/g, "<br>");
  return html;
}


function get_julia_script(id){
  add_event("get_julia_script");
  let current_graph;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_id == id){
      current_graph = bode_graphs[i];
    }
  }
  let julia_string = "";
  if (current_graph.bode_formula == GRAPH_ONE_REAL_POLE.formula){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    julia_string = "k_1 = " + k_1 + "\nT_1 = " + T_1 + "\n" + "num = [k_1]\nden = [T_1, 1]";
  } else if (current_graph.bode_formula == GRAPH_TWO_REAL_POLES.formula){
    let k_2 = range_slider_variables[variable_position["k_2"]];
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    julia_string = "k_2 = " + k_2 + "\nT_2 = " + T_2 + "\n" + "T_3 = " + T_3 + "\n" + "num = [k_2]\nden = [T_2*T_3, T_2+T_3, 1]";
  } else if (current_graph.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
    let k_3 = range_slider_variables[variable_position["k_3"]];
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    julia_string = "k_3 = " + k_3 + "\nw = " + w + "\n" + "z = " + z + "\n" + "num = [k_3*w*w]\nden = [1, 2*z*w, w*w]";
  } else {
    return "";
  }

  let html=`# Installing required packages
import Pkg
pkgs = [ "ControlSystems", "Plots" ]
Pkg.add(pkgs)
# Loading packages
using ControlSystems
using Plots

# Creating the transfer function:
${julia_string}
system = tf(num, den)
println("$(system)")

# plot poles and zeros
pzmap(system)
title!("Pole-Zero Map")
display(plot!())
(zs, ps, k) = zpkdata(system)
println("poles=$(ps)")
println("zeros=$(zs)")
 
# Step response for the system
yout, T = step(system)
plot(T, vec(yout), label = "")
title!("Step input response")
display(plot!())

# Plot Bode diagram:
bodeplot(system, label = "")
title!("Bode Diagram")
display(plot!())

# Nyquist plot for the system
nyquistplot(system, label = "")
display(plot!())
 

`.replace(/(?:\r\n|\r|\n)/g, "<br>");
  return html;
}


function get_matlab_script(id){
  add_event("get_matlab_script");
  achievement_done("matlab_script");
  let current_graph;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_id == id){
      current_graph = bode_graphs[i];
    }
  }
  let matlab_string = "";
  if (current_graph.bode_formula == GRAPH_ONE_REAL_POLE.formula){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    matlab_string = "k_1 = " + k_1 + ";\nT_1 = " + T_1 + ";\nnum = [k_1];\nden = [T_1, 1];";
  } else if (current_graph.bode_formula == GRAPH_TWO_REAL_POLES.formula){
    let k_2 = range_slider_variables[variable_position["k_2"]];
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    matlab_string = "k_2 = " + k_2 + ";\nT_2 = " + T_2 + ";\nT_3 = " + T_3 + ";\nnum = [k_2];\nden = [T_2*T_3, T_2+T_3, 1];";
  } else if (current_graph.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
    let k_3 = range_slider_variables[variable_position["k_3"]];
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    matlab_string = "k_3 = " + k_3 + ";\nw = " + w + ";\nz = " + z + ";\nnum = [k_3*w*w];\nden = [1, 2*z*w, w*w];";
  } else {
    return "";
  }

  let html=`% Clear previous variables and plots:
clear all; format compact; close all
linewidth = 2.0;
fontsize = 18;
% Define poles and zeroes:
${matlab_string}

% Create transfer function:
transfer_function = tf(num,den)

% Plot poles and zeroes:
figure(1)
pzmap(transfer_function)
lines = findobj(gcf,'Type','Line');
for i = 1:numel(lines)
   lines(i).LineWidth = linewidth;
   lines(i).MarkerSize = 20;
end
set(findall(gcf,'-property','FontSize'),'FontSize',fontsize);
a = axis    % Get current axis
axis(a*1.2) % Zoom out a little

% Plot Bode diagram:
figure(2)
x = bodeoptions;
x.XLim = [0.01 1000]
bode(transfer_function,x)
lines = findobj(gcf,'Type','Line');
for i = 1:numel(lines)
   lines(i).LineWidth = linewidth;
end
set(findall(gcf,'-property','FontSize'),'FontSize',fontsize)

% Step response for the system
figure(3)
step(transfer_function, 10)
lines = findobj(gcf,'Type','Line');
for i = 1:numel(lines)
   lines(i).LineWidth = linewidth;
end
set(findall(gcf,'-property','FontSize'),'FontSize',fontsize)

% Nyquist plot for the system
figure(4)
h = nyquistplot(transfer_function)
lines = findobj(gcf,'Type','Line');
for i = 1:numel(lines)
   lines(i).LineWidth = linewidth;
end
set(findall(gcf,'-property','FontSize'),'FontSize',fontsize)


`.replace(/(?:\r\n|\r|\n)/g, "<br>");
  return html;
}

function hide_script(id){
  let toggleElement = document.querySelector('.download_script_box');
  toggleElement.classList.toggle('active');
}


function showInputFunction(input){
//  if((input == 1 || current_tab == 1) && current_tab != input){
//    let toggleElement = document.querySelector('.input-equation');
//    toggleElement.classList.toggle('active');
//    toggleElement.classList="active"; //toggle('active');
//  }
  current_tab = input;
}

// ----------------------
// Quiz
let quiz_enabled = false;

const quiz_questions=['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];
let current_quiz = "none";

let quiz_nof_done = 0;
let quiz_nof_tries = 0;
let quiz_current_streak = 0;
let quiz_longest_streak = 0;
let quiz_nof_correct = 0;

let quiz_no = 0;
let quiz_freq = 0;
let quiz_time_to_click = 0;
let quiz_nyquist_angle_to_click = -1;
let quiz_system_to_click = -1;
let quiz_click_wrong = -1;
let quiz_questions_nof_done={};

// lu-pze quiz Difficulty level:
// Kindergarten - elementary school - high school - University - PhD candidate - PhD student - Professor
//     12.5             25              37.5            50           62.5           75           87.5
//             18.75              31.25         43.75        56.25           68.75         81.25
let quiz_difficulty=50.0; // The average difficulty, the one shown in the slider
let quiz_difficulties={}; // The difficulties of each type of question
let quiz_streaks={}; // The streak for this type of question.
let adaptive_difficulty_enabled = true;
let enabled_quiz_types={};


function toggle_quiz_enabled(event){
  if (current_quiz!="none"){
    stop_quiz();
  }
  if (quiz_enabled == false){
    quiz_enabled = true;
    let quiz_icon = document.getElementById("quiz_icon");
    quiz_icon.style.display = "inline";
  } else {
    quiz_enabled = false;
    let quiz_icon = document.getElementById("quiz_icon");
    quiz_icon.style.display = "none";
  }
}

function toggle_quiz(){
  if (current_quiz=="none"){
    start_quiz();
  } else {
    stop_quiz();
  }
}

let nof_quiz_started = 0;
let quiz_start_time = null;
let quiz_timer_div;
let quiz_is_running = 0; //0:not_started, 1:running, 2:ended
let quiz_seconds_left = 90;

function quiz_countdown (){
  if (quiz_is_running==1) {
    quiz_seconds_left -= 1;
    if (quiz_seconds_left < 0) {
      quiz_seconds_left = 0;
      quiz_is_running = 2;
      quiz_time_is_up();
    } else {
      quiz_timer_div.innerHTML="Time left: " + quiz_seconds_left + "s";
      setTimeout(quiz_countdown, 1000);
    }
  }
}

let quiz_experience = 50;
function set_quiz_experience(event) {
  quiz_experience = +(event.value);
  add_event("set_quiz_experience="+event.value);
}

function set_nickname(event) {
  client_nick = event.value.replace(/[^A-ZÅÄÖa-zåäö0123456789]/g, '_')
  add_event("set_quiz_nickname="+client_nick);
}

function start_quiz (){
  quiz_is_running = 1;
  quiz_longest_streak = 0;

  if (splash_screen_active){
    remove_banner();
  }

  achievement_done("start_quiz");

  // Remove the "Take the initial quiz"-text:
  let welcome_text=document.getElementById("welcome_text");
  welcome_text.innerHTML='';
//  update_tasks();
  //remove the assignments box:
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.remove('active');
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill=null;
  //removeAllGraphs();
  quiz_nof_done = 0;
  quiz_nof_tries = 0;
  quiz_current_streak = 0;
  quiz_nof_correct = 0;
  for (let question in quiz_questions){
    quiz_streaks[quiz_questions[question]] = 0;
    quiz_questions_nof_done[quiz_questions[question]]=0;
  }
  removeAllGraphs();

  if (nof_quiz_started > 0) {
    quiz_bell_clicked();
  } else {
    let toggleElement = document.querySelector('.quiz_intro');
    toggleElement.classList.add('active');
    let nickname_input_element = document.getElementById("nickname");
    nickname_input_element.focus();
    add_event("quiz_banner_shown");
  }
}

function quiz_bell_clicked (){
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  add_event("start_quiz");

  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill="#5050ff";

  quiz_timer_div = document.getElementById("quiz_timer");
  quiz_timer_div.innerHTML="Time left: 90s";
  quiz_seconds_left = 90;

  setTimeout(quiz_countdown, 1000);
  nof_quiz_started += 1;
  current_assignment="none";
  removeAllGraphs();
  quiz_no=0;
  next_quiz();
  update_quiz();
}

function next_quiz (){
  let quiz_text = document.getElementById("quiz_text");

  removeAllGraphs();

  // First count the enabled quiz_types. If there are fewer than two, simply select the only chosen quiz_type.
  let nof_enabled=0;
  let the_only_enabled_quiz_type="";
  for (let question_no in quiz_questions){
    if (enabled_quiz_types[quiz_questions[question_no]]){
      nof_enabled+=1;
      the_only_enabled_quiz_type=quiz_questions[question_no];
    }
  }
  if (nof_enabled == 1){
    current_quiz = the_only_enabled_quiz_type;
  } else {
    // If there are no enabled quiz_types, all quiz_types should be enabled:
    let quiz_type_enabled_should_be=true;
    if (nof_enabled==0){
      quiz_type_enabled_should_be=false;
    }

    // Randomize where we will pick assignments from.
    // The first round should pick every type of question once.
    // After that, let's pick questions that has lower level,
    //  which probably is something the user needs to practice.

    let quiz_possible_questions={};
    if (quiz_no < nof_enabled){
      // We shall pick "not yet used" questions:
      for (let question_no in quiz_questions){
        let question_id = quiz_questions[question_no];
        if (enabled_quiz_types[question_id]==quiz_type_enabled_should_be){
          if (quiz_questions_nof_done[question_id]==0){
            quiz_possible_questions[question_id]=1; // All should be similar numbers, to make picking any of them equally likely
          }
        }
      }
    } else {
      for (let question_no in quiz_questions){
        let question_id = quiz_questions[question_no];
        if (enabled_quiz_types[question_id]==quiz_type_enabled_should_be){
          if (question_id != current_quiz){
            quiz_possible_questions[question_id]= (104 - quiz_difficulties[question_id]) / 104; // Almost a "probability" for getting picked
          }
        }
      }
    }

    // Now pick randomly from the quiz_possible_questions array.

    // Calculate the "total probability" for all the values in the dict
    let total_probability = 0;
    for (let question_id in quiz_possible_questions) {
      total_probability += quiz_possible_questions[question_id];
    }
    // Generate a random number between 0 and total_probability
    let random_num = Math.random() * total_probability;
    // Iterate through the dictionary again to find the selected item
    let cumulative_probability = 0;
    let next_question_id="";
    for (let question_id in quiz_possible_questions){
      cumulative_probability += quiz_possible_questions[question_id];
      if (random_num <= cumulative_probability){
        next_question_id = question_id;
        break;
      }
    }
    current_quiz = next_question_id;
  }
  quiz_questions_nof_done[current_quiz]+=1;
  add_event("next_quiz="+current_quiz);

  if (current_quiz=="click_freq"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_freq;
    if (level < 6){
      quiz_freq = 0;
      quiz_text.innerHTML="Click on any of the Bode plots to the left";
    } else if (level < 17){
      if (last_value != -1){
        quiz_freq = -1;
        quiz_text.innerHTML="Click on the Bode magnitude plot";
      } else {
        quiz_freq = -2;
        quiz_text.innerHTML="Click on the Bode phase plot";
      }
    } else if (level < 40){
      while(quiz_freq==last_value){
        let decimal = 1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    } else if (level < 75){
      while(quiz_freq==last_value){
        let decimal = Math.floor(Math.random()*4)+1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    } else {
      while(quiz_freq==last_value){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    }

  } else if (current_quiz=="click_time"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_time_to_click;
    if (level < 6){
      quiz_time_to_click = -1;
      quiz_text.innerHTML="Click on the Step input response graph. It has time on the horizontal axis.";
    } else if (level < 40){
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(Math.random()*10);
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(0) + " seconds in the Step input response graph";
    } else if (level < 70){
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(100*Math.random())/10.0;
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(1) + " s";
    } else {
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(1000*Math.random())/100.0;
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(2) + " s";
    }

  } else if (current_quiz=="click_nyquist_angle"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_nyquist_angle_to_click;
    if (level < 6){
      quiz_nyquist_angle_to_click = 1000;
      quiz_text.innerHTML="Click on the Nyquist diagram. It has a unit circle, and the critical point -1 is at the left edge of the unit circle.";
    } else if (level < 20){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = -90 * (Math.floor(Math.random()*3));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else if (level < 40){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - 90 * (Math.floor(Math.random()*5));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else if (level < 70){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - 45 * (Math.floor(Math.random()*9));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else {
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - Math.floor(Math.random()*360);
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    }

  } else if (current_quiz=="click_system"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_system_to_click;
    // Randomize the colors of the graphs:
    next_graph_no_to_add=Math.floor(Math.random()*5);
    id_bank=next_graph_no_to_add;
    // Add some graphs:

    // Add ghost graphs:
    // The name tells where this formula will be shown:
    // GhostMPTNIE_Displayed name
    //      M      = shows up in Bode magnitude plot
    //       P     = shows up in Bode phase plot
    //        T    = shows up in Bode time response plot
    //         N   = shows up in Nyquist diagram
    //          I  = shows up in information tab
    //           E = shows up in Equations
    let name_prefix="";
    let name_prefix2="";
    let name_prefix4="";
    if (level < 30){
      name_prefix="GhostMPTNIE_";
      name_prefix2="GhostMPTNIE_";
      name_prefix4="GhostMPTNIE_";
    } else if (level < 60){
      let r = Math.random();
      if (r<0.33) name_prefix="GhostMP...._";
      else if (r<0.67) name_prefix="Ghost..TN.._";
      else name_prefix="GhostM.T..._";
      name_prefix2=name_prefix;
      name_prefix4=name_prefix;
    } else if (level < 90){
      let r = Math.random();
      if (r<0.33) name_prefix="GhostM....._";
      else if (r<0.67) name_prefix="Ghost.P...._";
      else name_prefix="Ghost..T..._";
      name_prefix2=name_prefix;
      name_prefix4=name_prefix;
    } else {
      let r = Math.random();
      if (r<0.33){
        name_prefix="GhostM....._";
        name_prefix2="Ghost.P...._";
        name_prefix4="Ghost..T..._";
      } else if (r<0.67){
        name_prefix2="GhostM....._";
        name_prefix4="Ghost.P...._";
        name_prefix="Ghost..T..._";
      } else {
        name_prefix4="GhostM....._";
        name_prefix="Ghost.P...._";
        name_prefix2="Ghost..T..._";
      }
    }

    let k = 0.5 + 3.5 * Math.random();
    if (level > 70){
      if (Math.random() < 0.5) k = -k;
    }
    let t = 1;
    if (level > 30){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = Math.floor(Math.random()*2)-1;
      t = 1 / (decimal * Math.pow(10,power));
    }
    addNewGraph(null, {name:name_prefix+"", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});

    let r = Math.random();
    if (r<0.25)      addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{0.5}{1+2s+s^2}", formula:"0.5/(1+2s+s^2)"});
    else if (r<0.5)  addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{1}{(1+5s)(1+0.05s)}", formula:"1/(1+5s)*1/(1+0.05s)"});
    else if (r<0.75) addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{8^2}{s^2+2*0.05*8*s+8^2}", formula:"8^2/(s^2+2*0.05*8*s+8^2)"});
    else             addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}", formula:"0.7*2^2/(s^2+2*0.7*2*s+2^2)"});

    let k4 = 0.5 + 3.5 * Math.random();
    if (level > 70){
      if (Math.random() < 0.5) k4 = -k4;
    }
    let t4 = 1;
    if (level > 80){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = Math.floor(Math.random()*2);
      t4 = 3 / (decimal * Math.pow(10,power));
    } else if (level > 30){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = 0;
      t4 = 3 / (decimal * Math.pow(10,power));
    }
    addNewGraph(null, {name:name_prefix4+"", mf:"\\frac{"+k4+"}{(1+"+t4+"s)^4}", formula:k4+"/((1+"+t4+"s)^4)"});

    if (level > 95){
      if (Math.random() < 0.33){
        //Select Dirac impulse for time responses
        //updateInputFormulaFromList()
        input_formula = "1";
        let input_equation = document.getElementById("input-formula");
        input_equation.value = "1";
        let i2 = document.getElementById("input-choices");
        i2.value = "Impulse";
      }
    }

    while (quiz_system_to_click==last_value){
      quiz_system_to_click = Math.floor(Math.random()*3)+1;
    }
    if (quiz_system_to_click==1) quiz_text.innerHTML="Click a first-order system";
    else if (quiz_system_to_click==2) quiz_text.innerHTML="Click a second-order system";
    else quiz_text.innerHTML="Click a fourth-order system";


  } else if (current_quiz=="click_wrong"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_click_wrong;
    // Control the colors of the graphs:
    let graph_color=Math.floor(5*Math.random());
    next_graph_no_to_add=graph_color;
    id_bank=next_graph_no_to_add;
    // Add ghost graphs:
    // The name tells where this formula will be shown:
    // GhostMPTNIE_Displayed name
    //      M      = shows up in Bode magnitude plot
    //       P     = shows up in Bode phase plot
    //        T    = shows up in Bode time response plot
    //         N   = shows up in Nyquist diagram
    //          I  = shows up in information tab
    //           E = shows up in Equations
    while (quiz_click_wrong==last_value){
      quiz_click_wrong=Math.floor(Math.random()*4);
    }
    add_event("quiz_click_wrong="+quiz_click_wrong);
    // What kind of system is a correct one?
    let correct_system_order=1;
    let wrong_system_order=1;
    if (level>40){
      if (Math.random()<0.5){
        correct_system_order=2;
        wrong_system_order=2;
      }
    }
    if (level>90){
      if (Math.random()<0.4){
        wrong_system_order=3-wrong_system_order;  // 2->1  and 1->2
      }
    }

    if (quiz_click_wrong==0){
      // Let's make the Bode magnitude plot wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*3)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"Ghost.PTN.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.PTN.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      if (Math.random() < 0.5){
        // Let's make k/w wrong:
        if (level < 50){
          if (Math.random() < 0.5) k=k*(8+14*Math.random());
          else k=k/(8+14*Math.random());
        } else {
          if (Math.random() < 0.5) k=k*(2+40*Math.random());
          else k=k/(2+40*Math.random());
        }
        if (Math.random()<0.5) w=w/(10+14*Math.random());
        else w=w*(10+14*Math.random());
      } else {
        // Let's make t/z wrong:
        if (Math.random() < 0.5) t=t*(18+14*Math.random());
        else t=t/(18+14*Math.random());
        if (Math.random()<0.5) z=z/(10+14*Math.random());
        else z=z*(10+14*Math.random());
      }
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }


    } else if (quiz_click_wrong==1){
      // Let's make the Bode phase plot wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostM.TN.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostM.TN.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make t/w wrong:
      if (Math.random() < 0.5) t=t*(18+14*Math.random());
      else t=t/(18+14*Math.random());
      if (Math.random()<0.5) w=w/(10+14*Math.random());
      else w=w*(10+14*Math.random());

      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }


    } else if (quiz_click_wrong==2){
      // Let's make the Step input response wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostMP.N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostMP.N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make k and z and w wrong:
      if (level < 50){
        if (Math.random() < 0.5) k=k*(8+14*Math.random());
        else k=k/(8+14*Math.random());
      } else {
        if (Math.random() < 0.5) k=k*(2+40*Math.random());
        else k=k/(2+40*Math.random());
      }
      if ((level > 80) && (Math.random()<0.5)) k=-k;
      if (Math.random()<0.5) w=w/(10+14*Math.random());
      else w=w*(10+14*Math.random());
      if (Math.random()<0.5) z=z/(10+14*Math.random());
      else z=z*(10+14*Math.random());
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;

      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

    } else {
      // Let's make the Nyquist diagram wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostMPT..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostMPT..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make k/z wrong:
      if (Math.random() < 0.5) k=k*(3+6*Math.random());
      else k=k/(3+6*Math.random());
      if (Math.random()<0.5) z=z/(10+14*Math.random());
      else z=z*(10+14*Math.random());
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }
    }
    quiz_text.innerHTML="Click on the wrong graph";


  } else {
    console.log("ERROR, the current_quiz was a value I don't handle:" + current_quiz);
  }
  quiz_no+=1;

  quiz_text.style.animation = 'none';
  quiz_text.offsetHeight; /* trigger reflow */
  quiz_text.style.animation="quiz_fade_repeat 7s ease-out infinite";

  let quiz_text_norepeat = document.getElementById("quiz_text_norepeat");
  quiz_text_norepeat.style.animation = 'none';
  quiz_text_norepeat.offsetHeight; /* trigger reflow */
  quiz_text_norepeat.style.animation="quiz_fade 1s ease-out 1";

  add_event("quiz_text="+quiz_text.innerHTML);
  redraw(); // Needed to get the title of the Dirac Impulse response correct
}

let cap_grade=0;

function update_quiz (){
  if (current_quiz == "none") return;
//  let difficulty_geom=1;
//  for (let question_no in quiz_questions){
//    difficulty_geom *= (100-quiz_difficulties[quiz_questions[question_no]]);
//  }
//  quiz_difficulty = 100 - Math.pow(difficulty_geom,1.0/(quiz_questions.length));

  let difficulty_mean=0;
  for (let question_no in quiz_questions){
    difficulty_mean += quiz_difficulties[quiz_questions[question_no]];
  }
  quiz_difficulty = difficulty_mean/quiz_questions.length;

  let new_cap_grade=0;
  if (quiz_difficulty<70){
    new_cap_grade=0; // Black
  } else if (quiz_difficulty<80){
    new_cap_grade=1; // Bronze
  } else if (quiz_difficulty<98){
    new_cap_grade=2; // Silver
  } else {
    new_cap_grade=3; // Gold
  }
  if (new_cap_grade != cap_grade){
    let cap_0 = document.getElementById("cap_0");
    cap_grade=new_cap_grade;
    cap_0.src = "images/cap_"+new_cap_grade+".webp";
    cap_0.style.animation = 'none';
    cap_0.offsetHeight; /* trigger reflow */
    cap_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let cap_0_text = document.getElementById("cap_0_text");
  cap_0_text.innerHTML = quiz_difficulty.toFixed(0) + "/100&nbsp";

  let task_div=document.getElementById("task_list");
  let s = "";
  s += '<center><svg width="34" height="34" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg>&nbsp;&nbsp;<b>Quiz time!</b></center><br>';

  s += "So far, you've got " + quiz_nof_correct + " correct answers,<br>";
  s += "with a streak of " + quiz_current_streak + " immediately correct answers.<br>";
  s += "You've answered " + quiz_nof_done + " questions in " + (quiz_nof_tries) + " tries";
  if(quiz_nof_done > 0) s += ",<br>which is a " + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "% accuracy.<br>";
  else s += ".<br>";
  s += "Longest streak so far " + quiz_longest_streak + ".";
  if (quiz_longest_streak == 0) s+= " Better get started!";
  else if (quiz_longest_streak <= 3) s+= " Nice going!";
  else if (quiz_longest_streak <= 6) s+= " You're doing good!";
  else if (quiz_longest_streak <= 9) s+= " You deserve a longer streak - go and make one!";
  else s+= " Keep it up, Legend!";
  s += "<br>";

  s +='<div class="quiz-container">';
  s +='<input type="range" min="0" max="100" step="0.01" class="quiz-slider" id="difficulty_level" value="' + quiz_difficulty + '" style="width:100%" onchange="set_difficulty_level(this);next_quiz();"';
  if (debug_mode == false) {
    s += " disabled";
  }
  s += '>';
  s +='<div class="quiz-labels">';
  s +='<label for="0"></label>';
  s +='<label for="12.5">&nbsp;Novice</label>';
  s +='<label for="25"></label>';
  s +='<label for="37.5"></label>';
  s +='<label for="50">&nbsp;Intermediate</label>';
  s +='<label for="62.5"></label>';
  s +='<label for="75"></label>';
  s +='<label for="87.5">&nbsp;Professor</label>';
  s +='<label for="100"></label>';
  s +='</div>';
  s +='<center>';

  if (debug_mode==true) {
    s +='<input type="checkbox" id="adaptive_difficulty" ';
    if (adaptive_difficulty_enabled==true){
      s +='checked ';
    }
    s +='onchange="toggle_adaptive_difficulty(this);"><label for="adaptive_difficulty">Adaptive difficulty level</label>';
  }

  s +='</center>';
  s +='</div>';

  if (debug_mode==true) {
    s += '<br><br><span style="color:#808080">Your stats:</span><br>';
    for (let question in quiz_questions){
      s += "<input type='checkbox' name='quiz_type' id='"+quiz_questions[question]+"' value='"+quiz_questions[question]+"' onchange='select_quiz_type(event);'";
      if (enabled_quiz_types[quiz_questions[question]]==true){
        s+=" checked";
      }
      s+="><label for='"+quiz_questions[question]+"'>";

      s += '<span style="color:#808080">' + quiz_questions[question] + ": " + quiz_difficulties[quiz_questions[question]].toFixed(1) + "</span><br>";
      s += "</label>";
    }
    s += '<span style="color:#808080">Total: ' + quiz_difficulty.toFixed(1) + "</span><br>";
  }

  task_div.innerHTML = s;
}

function stop_quiz (){
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  quiz_is_running = 0;
  quiz_timer_div = document.getElementById("quiz_timer");
  quiz_timer_div.innerHTML="";
  add_event("stop_quiz");
  restart_lupze();
}

function quiz_time_is_up (){
  let quiz_intro_div = document.getElementById("quiz_intro");

  let s = "";
  s += '<center><button type="button" class="close-window" onclick="stop_quiz();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';
  s += '<br><br>';
  s += '<img src="images/bell_small.webp" width="300px" style="margin:0;padding:0" onclick="stop_quiz()">';
  s += '<h2>';
  if (client_nick != "") {
    s += client_nick + ', ';
  }
  s += 'Time\'s up!</h2><br>';


  s += "You got " + quiz_nof_correct + " correct answers,<br>";
  s += "with a longest streak of " + quiz_longest_streak + " correct answers.<br>";
  s += "You answered " + quiz_nof_done + " questions in " + (quiz_nof_tries) + " clicks";
  if(quiz_nof_tries > 0) s += ",<br>which is a " + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "% accuracy.<br>";
  else s += ".<br>";

  s += '<div class="quiz-container">';
  s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="experience_level" value="' + quiz_difficulty + '" style="width:100%" onchange="set_quiz_experience(this)" disabled>';
  s += '<div class="quiz-labels">';
  s += '<label for="0"></label>';
  s += '<label for="12.5">&nbsp;Novice</label>';
  s += '<label for="25"></label>';
  s += '<label for="37.5"></label>';
  s += '<label for="50">&nbsp;Intermediate</label>';
  s += '<label for="62.5"></label>';
  s += '<label for="75"></label>';
  s += '<label for="87.5">&nbsp;Professor</label>';
  s += '<label for="100"></label>';
  s += '</div>';
  s += '</div>';
  s += "Your total result";
  s += '<br><br>';

//  s += '<span style="color:#808080"><br>';


  // Sort according to quiz_difficulties[quiz_questions[question]]
  // Create items array
  var items = Object.keys(quiz_difficulties).map(function(key) {
    return [key, quiz_difficulties[key]];
  });
  // Sort the array based on the second element
  items.sort(function(first, second) {
    return second[1] - first[1];
  });

  const quiz_explanation = {
"click_freq":"reading log scale diagrams",
"click_time":"clicking on linear x axes",
"click_nyquist_angle":"identifying angles in the Nyquist diagram",
"click_system":"understanding a system's order",
"click_wrong":"finding the odd-one-out graph"};
  // The results:
  let res = "quiz_time_is_up.";
  for (let position in items){
    let question_id = items[position][0];
    let difficulty_level = items[position][1];
    res += question_id + "=" + difficulty_level.toFixed(1) + ",";
  }
  res += 'total='+quiz_difficulty.toFixed(1)+",";
  res += 'nof_correct=' + quiz_nof_correct+",";
  res += "longest_streak=" + quiz_longest_streak + ",";
  res += "nof_questions=" + quiz_nof_done + ",";
  if(quiz_nof_tries > 0) res += "accuracy=" + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "%,";
  res += "nof_clicks=" + (quiz_nof_tries) + ",";
  res += "nof_quiz_started=" + nof_quiz_started + ".";
  add_event(res);

  let top_question_id = items[0][0];
  let top_difficulty_level = items[0][1];
  s += "You're ";
  if (top_difficulty_level > 80) {
    s += "really";
  }
  s += "good at " + quiz_explanation[top_question_id];
  let bottom_question_id = items[items.length - 1][0];
  let bottom_difficulty_level = items[items.length - 1][1];
  s += ", but you could focus on learning more about " + quiz_explanation[bottom_question_id] + ".<br><br>";
//  s += '<span style="color:#808080">Total: ' + quiz_difficulty.toFixed(1) + "</span><br>";
  s += '</center>';


  quiz_intro_div.innerHTML = s;

  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.add('active');
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  removeAllGraphs();
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  quiz_is_running = 0;
}

function set_difficulty_level(event){
  quiz_difficulty = +(event.value);
  add_event("set_difficulty_level="+event.value);
  quiz_difficulties={};
  for (let question in quiz_questions){
    quiz_difficulties[quiz_questions[question]] = quiz_difficulty;
    quiz_streaks[quiz_questions[question]] = 0;
    quiz_questions_nof_done[quiz_questions[question]]=0;
    if (enabled_quiz_types[quiz_questions[question]] == undefined){
      enabled_quiz_types[quiz_questions[question]]=false;
    }
  }
  update_quiz();
}


function quiz_clicked_pole_zero(clicked_on_pole_zero_graph_no,real,imaginary,clicked_on_time_variable){
  quiz_clicked({where:"pz",graph_no:clicked_on_pole_zero_graph_no,real:real,imaginary:imaginary,time_variable:clicked_on_time_variable});
}
function quiz_clicked_time_response(clicked_on_time_response_graph_no,time,amplitude,clicked_on_time_variable){
  quiz_clicked({where:"time",graph_no:clicked_on_time_response_graph_no,time:time,amplitude:amplitude,time_variable:clicked_on_time_variable});
}
function quiz_clicked_time_response_xaxis(time){
  quiz_clicked({where:"time_xaxis",time:time});
}
function quiz_clicked_bode_mag(clicked_on_bode_mag_graph_no,frequency,magnitude,clicked_on_time_variable){
  quiz_clicked({where:"Bmag",graph_no:clicked_on_bode_mag_graph_no,frequency:frequency,magnitude:magnitude,time_variable:clicked_on_time_variable});
}
function quiz_clicked_bode_mag_xaxis(frequency){
  quiz_clicked({where:"Bmag_xaxis",frequency:frequency});
}
function quiz_clicked_bode_mag_yaxis(magnitude){
  quiz_clicked({where:"Bmag_yaxis",magnitude:magnitude});
}
function quiz_clicked_bode_phase(clicked_on_bode_phase_graph_no,frequency,phase,clicked_on_time_variable){
  quiz_clicked({where:"Bphase",graph_no:clicked_on_bode_phase_graph_no,frequency:frequency,phase:phase,time_variable:clicked_on_time_variable});
}
function quiz_clicked_bode_phase_xaxis(frequency){
  quiz_clicked({where:"Bphase_xaxis",frequency:frequency});
}
function quiz_clicked_bode_phase_yaxis(phase){
  quiz_clicked({where:"Bphase_yaxis",phase:phase});
}
function quiz_clicked_nyquist(magnitude,angle){
  quiz_clicked({where:"Nyq",magnitude:magnitude,phase:angle});
}
function quiz_clicked(all){
  console.log("quiz clicked:where="+all.where+",graph_no="+all.graph_no+",time_variable="+all.time_variable+",real="+all.real+",imaginary="+all.imaginary+",time="+all.time+",amplitude="+all.amplitude+",frequency="+all.frequency+",magnitude="+all.magnitude+",phase="+all.phase);
  add_event("quiz_clicked:where="+all.where+",graph_no="+all.graph_no+",time_variable="+all.time_variable+",real="+all.real+",imaginary="+all.imaginary+",time="+all.time+",amplitude="+all.amplitude+",frequency="+all.frequency+",magnitude="+all.magnitude+",phase="+all.phase);

  if (current_quiz=="click_freq"){
    if ((all.where=="Bmag")||(all.where=="Bmag_xaxis")||(all.where=="Bmag_yaxis")||(all.where=="Bphase")||(all.where=="Bphase_xaxis")||(all.where=="Bphase_yaxis")){
      if (quiz_freq==0) quiz_correct();
      else if (quiz_freq==-1){
        if ((all.where=="Bmag")||(all.where=="Bmag_xaxis")||(all.where=="Bmag_yaxis")) quiz_correct();
        else quiz_incorrect("No. The Bode <i>magnitude</i> plot is above this one.");
      } else if (quiz_freq==-2){
        if ((all.where=="Bphase")||(all.where=="Bphase_xaxis")||(all.where=="Bphase_yaxis")) quiz_correct();
        else quiz_incorrect("No. The Bode <i>phase</i> plot is below this one.");
      }
      else if ((all.frequency >= quiz_freq*0.6667) && (all.frequency <= quiz_freq*1.4)) quiz_correct();
      else if (all.where=="Bmag_yaxis") quiz_incorrect("No, the Bode magnitude is not a frequency. Try again!");
      else if (all.where=="Bphase_yaxis") quiz_incorrect("No, the Bode phase is not a frequency. Try again!");
      else quiz_incorrect("No. You did click the correct graph, but your "+all.frequency.toFixed(2)+" is too far off the correct "+quiz_freq.toFixed(2)+".");
    }
    else if (all.where=="Nyq") quiz_incorrect("No. The Nyquist diagram contains phases and magnitudes. The frequency information we can find is 0 rad/s and ∞ rad/s which corresponds to the start and end of the Nyquist graph. For a specific frequency, look somewhere else.");
    else if (all.where=="time") quiz_incorrect("No. The time response of a system shows the amplitude after the input signal is applied. If you're looking for frequencies, look elsewhere.");
    else if (all.where=="time_xaxis") quiz_incorrect("No. This axis is about time and seconds.If you're looking for frequencies, look elsewhere.");
    else if (all.where=="pz") quiz_perhaps("Perhaps. The pole-zero map can tell you time constants of a system through the location of the poles and zeros. However, for pinpointing a certain frequency there's an easier way.");

  } else if (current_quiz=="click_time"){
    if ((all.where=="time")||(all.where=="time_xaxis")){
      if (quiz_time_to_click==-1) quiz_correct();
      else if ((all.time >= quiz_time_to_click-0.5)&&(all.time <= quiz_time_to_click+0.5)) quiz_correct();
      else quiz_incorrect("No. You did click the right graph, but at the wrong position. Your " + (all.time.toFixed(1)) + " is too far away from the desired " + quiz_time_to_click.toFixed(1) + ".");
    }
    else if (all.where=="Bmag") quiz_incorrect("No. There is no time information in the Bode magnitude plot.");
    else if (all.where=="Bphase") quiz_incorrect("No. There is no time information in the Bode phase plot.");
    else if (all.where=="Bmag_xaxis") quiz_incorrect("No. There is no time information in the Bode magnitude frequency axis.");
    else if (all.where=="Bphase_xaxis") quiz_incorrect("No. There is no time information in the Bode phase frequency axis.");
    else if (all.where=="Bmag_yaxis") quiz_incorrect("No. There is no time information in the Bode magnitude y-axis.");
    else if (all.where=="Bphase_yaxis") quiz_incorrect("No. There is no time information in the Bode phase y-axis.");
    else if (all.where=="Nyq") quiz_incorrect("No. The Nyquist diagram contains phases and magnitudes. There is no direct time information in the Nyquist diagram.");
    else if (all.where=="pz"){
      if (quiz_time_to_click==-1){
        quiz_perhaps("No. The pole-zero map is not the place to find time.");
      } else {
        quiz_perhaps("No. The pole-zero map is not the place to find " + quiz_time_to_click.toFixed(1) + " seconds.");
      }
    }

  } else if (current_quiz=="click_nyquist_angle"){
    //console.log(all.phase); // Phase is between -0 and -359.9 degrees.
    if (all.where=="Nyq"){
      if (quiz_nyquist_angle_to_click==1000) quiz_correct();
      else {
        let angle_difference = quiz_nyquist_angle_to_click - all.phase;
        if (angle_difference > 180) angle_difference -= 360;
        if ((angle_difference >= -15)&&(angle_difference<=15)){
          quiz_correct();
        } else {
          let angle_to_print = all.phase;
          if (angle_to_print < -270) angle_to_print += 360;
          quiz_incorrect("No. You did click the right graph, but at the wrong angle. Your " + (angle_to_print.toFixed(0)) + "° is too far away from the desired " + quiz_nyquist_angle_to_click.toFixed(0) + "°.");
        }
      }
    } else if (all.where=="time") quiz_incorrect("No. There are no angles in the time response graph.");
    else if (all.where=="Bmag") quiz_incorrect("No. There are no angles in the Bode magnitude plot.");
    else if (all.where=="Bmag_xaxis") quiz_incorrect("No. There are no angles in the Bode magnitude frequency axis.");
    else if (all.where=="Bmag_yaxis") quiz_incorrect("No. There are no angles in the Bode magnitude y-axis.");
    else if (all.where=="Bphase") quiz_perhaps("Well, there are angles in the Bode phase plot, but this time we asked for the Nyquist angles. Try again!");
    else if (all.where=="Bphase_xaxis") quiz_incorrect("No. There are no angles in the Bode phase frequency axis.");
    else if (all.where=="Bphase_yaxis") quiz_perhaps("Well, there are angles in the Bode phase plot, but this time we asked for the Nyquist angles. Try again!");
    else if (all.where=="pz") quiz_incorrect("No, there are no angles in the pole-zero map.");

  } else if (current_quiz=="click_system"){
    if (all.graph_no==-1) quiz_perhaps("Perhaps. Please click directly on one line, not just inside a graph.");
    else{
      if ((all.where=="time")||(all.where=="Bmag")||(all.where=="Bphase")||(all.where=="pz")){
        if (quiz_system_to_click==1){ // 1st order
          if (all.graph_no==0) quiz_correct();
          else if(all.graph_no==2) quiz_incorrect("No. You clicked the fourth-order system.");
          else quiz_incorrect("No. You clicked a second-order system.");
        } else if (quiz_system_to_click==2){ //2nd order
          if (all.graph_no==0) quiz_incorrect("No. You clicked a first-order system.");
          else if(all.graph_no==2) quiz_incorrect("No. You clicked the fourth-order system.");
          else quiz_correct();
        } else { //4th order
          if (all.graph_no==0) quiz_incorrect("No. You clicked a first-order system.");
          else if(all.graph_no==2) quiz_correct();
          else quiz_incorrect("No. You clicked a second-order system.");
        }
      } else if (all.where=="Nyq") quiz_perhaps("Please click in the other graphs or plots.");
    }

  } else if (current_quiz=="click_wrong"){
    if (all.where=="Bmag"){
      if (quiz_click_wrong==0) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Bode magnitude plot.");
    } else if (all.where=="Bphase"){
      if (quiz_click_wrong==1) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Bode phase plot.");
    } else if (all.where=="time"){
      if (quiz_click_wrong==2) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this step input response.");
    } else if (all.where=="Nyq"){
      if (quiz_click_wrong==3) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Nyquist diagram.");
    }
  }

  update_quiz();
}

var confetti_defaults = {
  spread: 360,
  ticks: 55,
  gravity: -0.8,
  decay: 0.96,
  startVelocity: 8,
  origin: { x:0.2, y: 0.6 },
  colors: ['FFFF00', 'FF8080', 'E89400', 'FFCA6C', 'FDFFB8']
};

function shoot_confetti() {
  confetti({
    ...confetti_defaults,
    particleCount: 30,
    gravity: -0.2,
    scalar: 2.8,
    shapes: ['star']
  });
  confetti({
    ...confetti_defaults,
    particleCount: 15,
    scalar: 1.5,
    startVelocity: 24,
    flat:false,
    shapes: ['square'],
    colors: ['FF0000', 'FF8000', 'c0c0c0', 'a04070']
  });
  confetti({
    ...confetti_defaults,
    particleCount: 10,
    gravity: 1.0,
    scalar: 2.5,
    startVelocity: 14,
    shapes: ['circle'],
    colors: ['a0d0a0', 'a0a0d0', 'c0c0c0', 'a05050']
  });
}

function quiz_correct (){
  add_event("quiz_correct");
  quiz_nof_done += 1;
  quiz_nof_correct += 1;
  quiz_nof_tries += 1;
  quiz_current_streak += 1;
  if (quiz_longest_streak<quiz_current_streak){
    quiz_longest_streak = quiz_current_streak;
  }
  let quiz_answer_div = document.getElementById("quiz_answer");
  let quiz_no_div = document.getElementById("quiz_no");
  quiz_answer_div.style.animation = 'none';
  quiz_no_div.style.animation = 'none';
  if (sound_enabled==true){
    play_jingle();
  }
  if (adaptive_difficulty_enabled==true){
    quiz_difficulties[current_quiz] += 7.5 + 5*quiz_streaks[current_quiz]; // The difficulties of each type of question
    if (quiz_difficulties[current_quiz] > 100) quiz_difficulties[current_quiz] = 100.0;
    quiz_streaks[current_quiz] += 1; // The streak for this type of question.
  }
  confetti_defaults.origin.x = mouseX / windowWidth;
  confetti_defaults.origin.y = mouseY / windowHeight;
  shoot_confetti();
  setTimeout(next_quiz, 50); // Make sure that the star animation starts rolling before updating graphs for the next quiz question.
}

function show_quiz_wrong_text(text){
  // Trigger an animation with the text:
  let quiz_answer_div = document.getElementById("quiz_answer");
  quiz_answer_div.innerHTML=text;
  let left = (100*mouseX/windowWidth) + 1;
  if (left > 75) left = 75;
  document.querySelector('.quiz_answer').style.setProperty('--left',left+"%");
  document.querySelector('.quiz_no').style.setProperty('--left',left+"%");
  let top = (100*mouseY/windowHeight);
  if (top > 84) top = 84;
  if (top < 3) top = 3;
  document.querySelector('.quiz_answer').style.setProperty('--top',top+"%");
  document.querySelector('.quiz_no').style.setProperty('--top',top+"%");
  let quiz_no_div = document.getElementById("quiz_no");
  // Order of the animation parameters:
  //  animation-name: example;
  //  animation-duration: 5s;
  //  animation-timing-function: linear;
  //  animation-delay: 2s;
  //  animation-iteration-count: infinite;
  //  animation-direction: alternate;
  quiz_answer_div.style.animation = 'none';
  quiz_answer_div.offsetHeight; /* trigger reflow */
  quiz_answer_div.style.animation="QuizAnim 12s ease-in-out 0s 1";
  quiz_no_div.style.animation = 'none';
  quiz_no_div.offsetHeight; /* trigger reflow */
  quiz_no_div.style.animation="QuizAnim2 12s ease-out 0s 1";
}

function quiz_perhaps (why_its_almost_wrong){
  show_quiz_wrong_text(why_its_almost_wrong);
}

function quiz_incorrect (why_its_wrong){
  add_event("quiz_incorrect");
  quiz_current_streak = 0;
  quiz_streaks[current_quiz] = 0; // The streak for this type of question.
  if (adaptive_difficulty_enabled==true){
    quiz_difficulties[current_quiz] -= 20.0; // The difficulties of each type of question
    if (quiz_difficulties[current_quiz] < 0) quiz_difficulties[current_quiz] = 0.0;
  }
  quiz_nof_tries += 1;
  show_quiz_wrong_text(why_its_wrong);
  update_quiz(); // Show the new difficulty level
}

function toggle_adaptive_difficulty(event){
  adaptive_difficulty_enabled = event.checked;
}

function select_quiz_type(event){
  let quiz_type = event.target.id;
  if (event.target.checked){
    enabled_quiz_types[quiz_type]=true;
  } else {
    enabled_quiz_types[quiz_type]=false;
  }
  next_quiz();
  update_quiz();
}



// ----------------------
// Assignments

let assignments_enabled = false;
let current_assignment = "none";

function toggle_assignments(event){
  if (assignments_enabled == false){
    assignments_enabled = true;
    let show_assignments_icon = document.getElementById("show_assignments");
    show_assignments_icon.style.display = "inline";
  } else {
    assignments_enabled = false;
    let show_assignments_icon = document.getElementById("show_assignments");
    show_assignments_icon.style.display = "none";
  }
}

function toggle_assignments_box(event){
  add_event("view_assignments");
  achievement_done("view_assignments");
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.toggle('active');
  update_assignments();
}

function task_done (which_one){
  if (quiz_is_running>0) return;
  if (assignments_enabled==true){
    if (all_assignments[current_assignment].tasks.includes(which_one)){
      if (!(done_tasks.includes(which_one))){
        // This is a task that hasn't been done before:
        add_event("task_done="+which_one);
        done_tasks.push(which_one);

        // Trigger an animation with the text:
        let achievement_text_div = document.getElementById("achievement_text");
        let assignment_star_div = document.getElementById("assignment_star");
        achievement_text_div.innerHTML=all_tasks[which_one].t;
        let left = (100*mouseX /windowWidth);
        if (left > 85) left = 85;
        let top = (100*mouseY/windowHeight);
        if (top > 90) left = 90;
        document.querySelector('.achievement_text').style.setProperty('--left',left+"%");
        document.querySelector('.achievement_text').style.setProperty('--top',top+"%");
        document.querySelector('.assignment_star').style.setProperty('--left',left+"%");
        document.querySelector('.assignment_star').style.setProperty('--top',top+"%");
        achievement_text_div.style.animation = 'none';
        achievement_text_div.offsetHeight; /* trigger reflow */
        achievement_text_div.style.animation="MoveToStar4 7s ease-in-out 0s 1";
        assignment_star_div.style.animation = 'none';
        assignment_star_div.offsetHeight; /* trigger reflow */
        assignment_star_div.style.animation="MoveToStar3 8s ease-out 0s 1";
        if (sound_enabled==true){
          play_jingle();
        }
        // Let the menu star wiggle a little:
        let menu_assignment_div = document.getElementById("show_assignments");
        menu_assignment_div.style.animation = 'none';
        menu_assignment_div.offsetHeight; /* trigger reflow */
        menu_assignment_div.style.animation="MenuAssignment 4s ease-out 0s 1";
        update_assignments();
        update_tasks();

        //And, if this happens to be a task in an assignment, and there is an answer text,
        //display that answer text with a close button.
        if (all_tasks[which_one]!=null){
          if (all_tasks[which_one].a!=null){
            console.log(which_one);
            show_answer_to_task(which_one);
          }
        }


      }
    }
  }
}

function reset_task(task_to_reset){
  let index = done_tasks.indexOf(task_to_reset);
  if (index !== -1) {
    // We found it. Remove it:
    done_tasks.splice(index, 1);
  }
  update_tasks();
}

const all_assignments={
  "one_pole":{t:"1. Investigate a system with <b>one pole</b>",tasks:["T1=2","k1=2.9","T1_k1_bode","T1_pole=-2","T1_unstable"],info:"A system with <b>one pole</b> is one of the fundamental system responses, where high frequencies are attenuated."},
  "two_real_poles":{t:"2. Investigate a system with <b>two real poles</b>",tasks:["T2,T3=0.05_and_5","T2,T3=1;k2=0.5","T2=10;T3=0.5","phasemargin=55","gaincrossover=3"],info:"When combining <b>two real poles</b>, the Bode phase response goes all the way to -180°."},
  "two_complex_poles":{t:"3. Investigate a system with <b>two complex poles</b>",tasks:["w=0.9;z=0.0","w=1.6;z=0.2","w=8;z=0.05;k_3=1","w=2;z=0.7;k3=0.7"],info:"A set of <b>two complex poles</b> will make the system's time response oscillate."},
  "time_delay":{t:"4. Investigate a system with <b>time delay</b>",tasks:["L=3","L_gain_margin=2"],info:"A system with <b>time delay</b> is more difficult to control."},
  "one_zero_two_poles":{t:"5. Investigate a system with <b>one zero two poles</b>",tasks:["k4=1;T6=2.5;T7=1;T8=6","k4=0.75;T6=9.25;T7=0.5;T8=2","k4,T6,T7=1,T8=1.5_poles"],info:"With <b>one zero and two poles</b>, the phase response and the critical magnitude at -180 degrees needs to be considered when using a feedback loop."},
  "four_poles":{t:"6. Investigate a system with <b>four poles</b>",tasks:["gainm=5_phasex=2","phasemargin=45"],info:"A system with <b>four poles</b> gets a lot more phase shift, with a larger spin in the Nyquist diagram."},
  "pid_controller":{t:"7. Investigate a <b>PID controller</b> and <b>one pole</b>",tasks:["pid_help_PID","pid_help_YR","PID_(K>1)","PID_(T_i)>(T_1)","PID_(T_d!=0)","PID_(Td=0,T_1=1)","PID_(k_1)"],info:"This assignment is about using a PID controller with a first-order system."},


  //"pid_controller_S":{t:"8. EXPERIMENTAL: <b>PID controller</b> and <b>sensitivity</b>",tasks:["pid_help_PID","pid_help_YR","pid_help_S"],info:"WE'RE WORKING ON IT. Don't expect anything to make sense here right now. This assignment will be about understanding the sensitivity function. / Frida & Pex"},
  "pid_controller_YL":{t:"8. Investigate a <b>PID controller</b> and <b>load</b>",tasks:["pid_help_PID","pid_help_YR","pid_help_YL","PID_Load"],info:"This assignment is about using a PID controller with a load."},
  //"pid_controller_OL":{t:"10.EXPERIMENTAL: <b>PID controller</b> and <b>open-loop</b>",tasks:["pid_help_PID","pid_help_OPEN"],info:"WE'RE WORKING ON IT. Don't expect anything to make sense here right now. This assignment will be about understanding the open-loop transfer function when using a PID controller with a first-order system. / Frida & Pex"},

  "none":{t:"...<b>no assignment</b>",tasks:["impossible"],info:""},
};
let done_assignments={};

const all_tasks={
//t: is the text that appears in the task, on screen, directly.
//a: is the hint question that comes up when you right click on the task text on screen.
//placement: is where the explaining hint comes up when the task was completed, to avoid covering the part of the screen that the hint/solution tries to explain. It can be "none", which means center, then UL, UC, UR, DL, DC, DR. for Up/Down + Left/Center/Right.

//## One pole
//"reference eq in step response(k=0.65, T1=2)"
"T1=2":{t:"Your task is to change T<sub>1</sub> by moving the slider or type in T<sub>1</sub>'s value to make the pole's location -1/2 in the pole-zero map. Can you explain how the pole's location and its time constant are related?",a:"<h2>How is the pole related to the time constant and step resonse of a first order system?</h2>For a first-order system with the given transfer function, the pole is placed in -1/T. The time constant T corresponds to the time it takes for the system to reach 63% of its final value<br><math-field read-only style='vertical-align:bottom;display:inline-block'>y(t) = 1 - e^{-t/T}</math-field><br>By setting t=T, we get<br><math-field read-only style='vertical-align:bottom;display:inline-block'>y(t)= 1-e^{-1}≈0.63</math-field>.<br>The larger value of T we have, the slower the system is. In other words, a system with poles farther away from the origin corresponds to a faster system than a system with poles placed closer to the origin.<h3>Take a few seconds to think about</h3>How are the different representations affected when you change T? Why is the shape of the Nyquist diagram not affected?<h2>Summary</h2>The amplitude of the step response is not affected, but the time constant is given by T. The pole is in s=-1/T, which means that a large time constant gives a pole close to the origin, whereas a short time constant gives a pole far away from the origin. In the Bode diagram, the corner frequency is 1/T, and it thereby varies when T varies. No change is visible in the Nyquist diagram, but the frequency varies along the curve.<br><br>Suppose that we have two processes with different values of T. Then, we can always find two frequencies such that<math-field read-only style='vertical-align:bottom;display:inline-block'>G(i\\omega_1 T_1) = \\frac{K}{1+i\\omega_1 T_1}=G(i\\omega_2 T_2) = \\frac{K}{1+i\\omega_2 T_2}</math-field><br>i.e., all points that are on the first Nyquist curve are also on the second one, but at another frequency."},//. (T1=2)
"k1=2.9":{t:"Your task is to drag the <b>step input response</b> making the static gain of the system 2.9. When will the system reach its static gain?",a:"<h2>When will a system reach its static gain?</h2>The system reaches its static gain when time goes to infinity. For an asymptotically stable system, the static gain from a unit step input is calculated as G(0) as a result of the final value theorem.<h3>Take a few seconds to think about</h3>How are the poles, step response, Nyquist diagram, and Bode diagram affected by changes in K? How can K be determined from the step response, Nyquist diagram, and Bode diagram?<h2>Summary</h2>The amplitude of the step response is affected by K, but not the time constant. The pole is not affected by K. The Nyquist diagram keeps its shape, but each point on the curve moves radially from the origin. In the Bode diagram, the gain curve changes in the y direction while the phase curve is unchanged.<br><br>Since the control signal is a unit step, K is given by the stationary value of the measurement signal in the step response. In the Nyquist diagram, K is given from the starting point on the positive real axis. In the Bode diagram, K is given from the gain curve where &omega; -> 0."},//. (k1=2.9)
"T1_k1_bode":{t:"Save the princess from the dragon by dragging the pole marker in the Bode plots to mimick the orange step response. The princess, as it turns out, will only leave the dragon if you can explain how she can find the <b>static gain</b> in the Bode magnitude plot. Can you save her?",a:"<h2>How can you find the static gain from the Bode plot?</h2>The static gain is found as the value for the low-frequency asymptote G(0). In the Nyquist diagram the static gain is found as the value for where the curve starts at the positive real axis."},// (k=0.65, T1=2)
"T1_pole=-2":{t:"Drag the pole marker in the <b>pole-zero map</b> to make the system four times faster than the orange one. What does it mean to have a faster system?",a:"<h2>What does it mean to have a faster system?</h2>A faster system reacts faster to input changes than a slow system. For a first-order system, it thus also reaches its stationary value faster."},//. (pole in -2)
"T1_unstable":{t:"Make the pole <b>unstable</b>.",a:"<h2>What are the characteristics for an unstable system?</h2>Poles that are placed in the right half plane correspond to an unstable system. An unstable system has an output y(t) that goes to infinity."}, // T_1 < 0

//## Two real poles
//reference in step (T2=T3=1, k2=0.5)
//reference in bode phase (T2=5, T3=0.05, k2=1)
"T2,T3=1;k2=0.5":{t:"Your first subtask is to set k<sub>2</sub>=0.5 exactly, then drag the two pole markers in the <b>pole-zero map</b> to make the step response follow the cyan line. Can you explain how this second-order step response differs from a first-order system?",a:"<h2>How does a second-order step response differs from a first-order system?</h2>A first-order system immediately rises after the step change. A second-order system (and higher-order system) with no zeros is flat in the beginning. In other words, the step response for a second-order system with no zeros has a derivative of zero at time 0.<h3>Take a few seconds to think about</h3>How can G(s) be approximated in the case T<sub>1</sub> >> T<sub>2</sub>?<h2>Summary</h2>When T<sub>1</sub> >> T<sub>2</sub>, the step response is similar to a first order system with T &asymp; T<sub>1</sub>$. The Bode and Nyquist diagrams are also similar to the ones of a first order system for low frequencies. Thus, you can in many cases approximate the transfer function by <math-field read-only style='vertical-align:bottom;display:inline-block'>G(s)=\\frac{K}{(1+sT_1)(1+sT_2)} \\approx \\frac{K}{(1+sT_1)}</math-field>"},//. (T2=T3=1, k2=1)
"T2,T3=0.05_and_5":{t:"Your task is to change T<sub>2</sub> and T<sub>3</sub> to make your Bode phase plot mimick the blue curve in the Bode phase plot. Feel free to change these time constants in whatever way you find suitable.",a:"<h2>How do poles affect the bode plot?</h2>Each pole lowers the phase by 90 degrees in the bode plot. Thus, for a second-order system, the bode plot starts at 0 degrees and ends at -180 degrees."},//. (T2=0.05, T3=5.0)
"T2=10;T3=0.5":{t:"Your task is to drag the pole markers in the Bode plots making the <b>cutoff frequencies</b> in the Bode plot become 0.1 rad/s and 2.0 rad/s. Now, tell me how the cutoff frequencies as seen in the Bode plots are related to the poles' locations in the pole-zero map.",a:"<h2>What is the cutoff frequency?</h2>The cutoff frequency is the frequency at which the Bode curve \"bends\". These frequencies are directly related to the poles' placement."},// (T2=10, T3=0.5 or vice versa)
"phasemargin=55":{t:"Please drag the two pole markers in the Bode diagram to ensure that the <b>Phase margin</b> for the system is 55°. Can you explain how the phase margin can be found in the Nyquist diagram?",a:"<h2>What is the phase margin?</h2>The phase margin tells us how \"far away from the -1 point in the Nyquist diagram the curve is\" if we look at the phase for the frequency where the amplitude is 1. The phase margin is one way to evaluate the robustness of a system."},// (T2=T3=0.5-1.5k k2=7-8 approximately
"gaincrossover=3":{t:"Finally, drag the two pole markers in the Bode diagram to ensure that the <b>gain crossover frequency</b> becomes 3.0 rad/s. But before you go, call your friend and tell them how you can get the gain crossover frequency from a Bode magnitude plot.",a:"<h2>What is the crossover fequency?</h2>The crossover frequency is the frequency for which the amplitude is 1. It's at this frequency the phase margin is found."},// (T2=T3=0.5-1.5k k2=7-8 approximately)

//## Two complex poles
//Step reference (w=2,z=0.7,k=0.7)
//Bode reference (w=8, z=0.05)
"w=1.6;z=0.2":{t:"Drag the pole markers in the <b>pole-zero map</b> so that the resonance frequency w=1.6 and damping factor z=0.2. How does changing w affect the step response of the system? How does changing z affect the step response of the system?",a:"<h2>How does changing w affect the step response of the system?</h2>Complex poles always come in pairs. The w<sub>0</sub> corresponds to the distance between the poles and the origin. Increasing w<sub>0</sub> gives a faster system.<h2>How does changing z affect the step response of the system?</h2>z corresponds to cos(&phi;), where &phi; is the angle between the negative real axis and the pole. Increasing z gives more relative damping to the system and, thus, less oscillations in the system.<h3>Take a few seconds to think about</h3>How are the poles, step response, Nyquist diagram, and Bode diagram affected by changes in &omega;?<h2>Summary</h2>The frequency &omega; affects the speed of the system, but not the shape of the step response. Variations in &omega; moves the poles radially from the origin. In the Bode diagram, &omega; does not affect the shape, but only the location of the corner frequency. The shape of the Nyquist curve is not affected, but the frequencies are moved along the curve."},
"w=0.9;z=0.0":{t:"Move the pole markers in the <b>pole-zero map</b> in such way that the resonance frequency w becomes 0.9 and the damping factor z becomes 0.0. What happens with the system when z is 0? Is the system stable?",a:"<h2>What happens with the system when z is 0? Is the system stable?</h2>When z is 0, there is no relative damping in the system, and the system oscillates forever. This is called <i>a marginally stable system</i>."},
"w=8;z=0.05;k_3=1":{t:"The very evil vampire Dracula is afraid of heights. Save the world by putting Dracula on a high mountain by changing the <b>resonance frequency</b> w, <b>damping factor</b> z and <b>static gain</b> k<sub>3</sub> to make the Bode plots mimick the blue lines. As the Hero<sup>TM</sup> you've now become, tell your admirers the name of the peak. Also, tell the press what could happen if the system has input with this specific frequency.",a:"<h2>What is a resonance peak?</h2>The placement of the resonance peak corresponds to the value of w<sub>0</sub>. The lower z is, the higher the peak is. If the system has an input with that frequency, the system starts to self oscillate, which in the past has resulted in multiple accidents such as bridges that collapse (for example the Tacoma Narrows Bridge in 1940)."},
"w=2;z=0.7;k3=0.7":{t:"Your task is to match the pink step input response. First, set your <b>static gain</b> k<sub>3</sub>. Then, drag the <b>Bode plot</b> to align your system response with the pink step input response. How does the second-order-system step response differ between a system with real poles versus complex poles?",a:"<h2>How does the second-order-system step response differ between a system with real poles versus complex poles?</h2>A system with real poles oscillates before the oscillations are damped. A system with only real poles has no oscillations, and it is a fully damped system."},

//## Time delay
"L=3":{t:"Drag the step input response to change the time delay to 3.0 seconds. What does it mean that a system has a time delay?",a:"<h2>What does it mean that a system has a time delay?</h2>A system with a time delay has a delayed response to the input. In this case, it takes three seconds after the inut is given before anything happens in the system. Once the system reacts, it behaves as an ordinary first-order system (since we, in this case, have a first-order system with a time delay, second-order systems could also have a time delay). As we have discovered in previous assignments, a second-order system without time delay has a derivative of zero at time 0, which means that nothing happens with the system immediately. This is, however, not a time delay; it is simply slow dynamics. A time delay means that the input's effect on the system is delayed. It could, for example, be a signal that takes some time to be transmitted. A system with a time delay could be very hard to control as there is a delay between the input signal and the system reacting to that signal, so you can't control the system faster than the time delay unless you include a simulation model of the system. One example of this is the Otto Smith predictor with a two-loop control structure.<h3>Take a few seconds to think about</h3>What happens with the step response when there is a time delay? Why does the Nyquist curve look like it does? Why is the gain curve of the Bode diagram not affected?<h2>Summary</h2>A variation in L corresponds to a translational movement of the step response. We can not represent a dead time in a singularity diagram. The gain curve in the Bode diagram is not affected, since <math-field read-only style='vertical-align:bottom;display:inline-block'>\\vert e^{-i\\omega L}\\vert=1</math-field>, but the phase is reduced. For each frequency point in the Nyquist diagram, the distance to the origin remains unchanged, but the phase decreases. Since the phase goes towards -&infin; when &omega; -> &infin;, the Nyquist curve has the spiral shape."},
"L_gain_margin=2":{t:"Change the <b>time delay</b> L so that the <b>Gain margin</b> becomes 2.0. Why is there a spiral in the Nyquist diagram?",a:"<h2>Why is there a spiral in the Nyquist diagram?</h2>The spiral is a result of phase loss in a system with a time delay. This can also be seen in the bode diagram as the phase curve goes down to negative infinity."},// (L=0.3)

//## One zero two Poles
//Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
//Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
//Step reference (k4=1,T6=1,T7=1,T8=-1.5)
"k4=1;T6=2.5;T7=1;T8=6":{t:"Your task is to make your Nyquist diagram match up with the green one. <b>Drag the pole and zero markers in the Bode plots</b>, and change k<sub>4</sub> to make the Nyquist curve follow the orange line. Note that there are many combinations of T<sub>6</sub>, T<sub>7</sub>, and T<sub>8</sub> that gives identical Nyquist diagrams but non-similar Bode diagrams. Can you explain why?",a:"<h2>Why are there many combinations of T6, T7, and T8 that gives identical Nyquist diagrams but non-similar Bode diagrams?</h2>The shape of the Nyquist curve comes from how the poles and zeros are placed relative to each other. The frequencies in the bode plot would differ, but that is not visible in the Nyquist curve."},// (k=1,T6=2.5,T7=1,T8=6)
"k4=0.75;T6=9.25;T7=0.5;T8=2":{t:"Change the parameters so that your Bode plots align with the green lines. Can you summarize how a pole and a zero affect the shape of the Bode digrams?",a:"<h2>How do poles and zeros affect the shape of the Bode digrams?</h2>A pole lowers the phase by 90 degrees and reduces the slope of the amplitude curve by 1. A zero increases the phase by 90 degrees and increases the slope of the amplitude curve by 1."},//. (k4=0.75,T6=9.25,T7=0.5,T8=2)
"k4,T6,T7=1,T8=1.5_poles":{t:"With k<sub>4</sub>=1, drag the pole and zero markers in the <b>pole-zero map</b> so that the step response follows the blue line. Why is the step response reversed in the beginning? Is the system stable?",a:"<h2>Why is the step response reversed in the beginning? Is the system stable?</h2>The system is stable since the poles are placed in the left half plane. The zero is placed in the right half plane, which gives a reversed response in the beginning. The stability of a system is determined by the poles. The zeros affect the system's initial response but not its stability.<h3>Take a few seconds to think about</h3>What happens when T<sub>3</sub> < 0? What does this mean if you want to control such a process? Try to explain the phenomenon.<h2>Summary</h2>If the zero is far away from the origin, the representations are not significantly affected. If the zero is negative and is close to the origin, there is a large overshoot in the step response. If the zero is positive and close to the origin, the step response will initially go in the wrong direction. If the zero is positive it will give a positive contribution to the phase.<br><br>When T<sub>3</sub> < 0, e.g., when the zero is in the right half plane, the process is hard to control. You can imagine that it is hard for a controller to act in the right way when a control signal change makes the measurement signal go in the wrong direction initially. The phenomenon could be understood by writing the transfer function in the following way<br><math-field read-only style='vertical-align:bottom;display:inline-block'>G(s)=\\frac{K(1+sT_3)}{(1+sT_1)(1+sT_2)}=\\frac{K}{(1+sT_1)(1+sT_2)}+\\frac{sKT_3}{(1+sT_1)(1+sT_2)}</math-field><br>Thus, the transfer function consists of two terms, one that is the transfer function for a second order system without zeros, and one that is the same transfer function, but multiplied with sT<sub>3</sub>. Thus, the second term is proportional to the derivative of the measurement signal we would have obtained if we did not have any zero. If T<sub>3</sub> < 0, this term will give a negative contribution, which explains that the step response initially goes in the wrong direction."},
//#Four poles
"gainm=5_phasex=2":{t:"Drag the Bode plot so that the <b>Gain margin</b> is 5 and the <b>Phase crossover frequency</b> is 2 rad/s. What practical implication does mean that the Gain margin is 5?",a:"<h2>What is the gain margin?</h2>The gain margin tells how much the system's gain can be changed before the system gets unstable. In this case, the gain can be five times bigger before the system becomes unstable."},// (T5=0.3, k=2)
"phasemargin=45":{t:"Change k<sub>5</sub> so that the <b>Phase margin</b> is 45°. How can you analyze the closed loop system stability from the Nyquist diagram?",a:"<h2>How can you analyze the closed loop system stability from the Nyquist diagram?</h2>The Nyquist diagram is shown for the open loop system. If point -1 is to the left of the Nyquist curve, the closed loop system will be stable. If the -1 point is to the right, the closed-loop system would be unstable."},

//#PID controller
"pid_help_PID":{t:"Read about <b>PID control</b> by right clicking on the G<sub>PID</sub> equation above."},
"pid_help_YR":{t:"Read about the <b>closed-loop response G<sub>YR</sub></b>."},
//"pid_help_S":{t:"Read about the <b>sensitivity function S</b>.",
"pid_help_YL":{t:"Read about the <b>Load disturbance transfer function G<sub>YL</sub></b>."},
//"pid_help_OPEN":{t:"Read about the <b>open-loop formula G<sub>OL</sub></b>.",



// #PID controller and one pole
//Sol: K is increased.
"PID_(K>1)":{t:"<b>Make the closed-loop system faster</b> by changing K while looking at the step response. How does changing the K parameter affect the step response of the closed-loop system?",a:`<h2>What happens when you change the proportional part P in the PID controller?</h2>Changing K affects the speed of the closed-loop system step response. Higher K means a faster step response and that the closed loop poles, not shown in any of the diagrams, are placed further away from the origin in the pole-zero map.`,placement:"DR"},

//Sol: Ti pole is greater than system pole.
"PID_(T_i)>(T_1)":{t:"Change T<sub>i</sub> so that the T<sub>i</sub> pole in the Bode plot (orange) is to the right of the pole for the system (red). How does changing the T<sub>i</sub> parameter affect the Bode plot and step response of the closed-loop system?",a:`<h2>What happens when you change the integrating part T<sub>i</sub> of the PID controller</h2>Including the integrating I part of the PID controller removes the stationary error that we get with only a proportional P-controller. The smaller T<sub>i</sub> is, the more "power" the I-part has. Small T<sub>i</sub> values can result in oscillations and overshoot which we can see on the resonance peak that appears in the Bode plot as well. Large T<sub>i</sub> values, which means "little power to the I-part", results in a step response where it takes a long time for the stationary error to disappear.`},

//Sol: Td != 0
"PID_(T_d!=0)":{t:"Change T<sub>d</sub> and explain the <b>Bode plot of the PID-controller</b>. How are the poles (marked with x) in the bode plot related to the T<sub>i</sub> and T<sub>d</sub> parameters?",a:`<h2>What happens when you change the derivative part T<sub>d</sub> of the PID controller</h2>The "downhill" slope in the Bode plot for the PID controller comes from the I-part of the controller. The slope bends upwards for the value of the pole corresponding to the integrating I-part of the controller, i.e., the T<sub>i</sub> value.<br><br>The "uphill" slope in the Bode plot for the PID controller comes from the derivative D-part of the controller. The slope bends upwards for the value of the pole corresponsing to the D-part of the controller, i.e., the T<sub>d</sub> value. From here one can realise that including the D-part in a PID controller could result in problems with high-frequency noise.<br><br>The "height" of the Bode plot for the PID controller comes from the proportional P-part of the controller. Changing K will lower and raise the curve.`},

//Sol: Change T1.
"PID_(Td=0,T_1=1)":{t:"For any fixed PI controller (T<sub>d</sub>=0). What happens with the closed-loop step response if the system's T<sub>1</sub>-parameter is changed? In other words, what happens if you have a model for a system and design your controller for that model, but then it turns out that T<sub>1</sub> for <b>the actual system differs from the model</b>? Set T<sub>d</sub>=0.0 and T<sub>1</sub> to 1.0.",a:`<h2>What if the model and actual system differs?</h2>If the difference in time constants between the model and the actual system is small, it will not make a large change in control behavior. If the differene between the model and the actual system is large, the closed loop system step response will be very different. This could result in safety issues if the controlled system is a sensitive system.`},

//Sol: k1 changed.
"PID_(k_1)":{t:"Change the k<sub>1</sub> parameter of the system to make the static gain of the closed-loop system anything else than 1. Change k<sub>1</sub> to 0.6.",a:`<h2>What about changing the static gain of the closed-loop transfer function G<sub>YR</sub>?</h2>No. You cannot do that. The reason is that the a static gain of 1.0 in the closed-loop step response means that the desired reference value is followed, which is what the PID controller is designed for. The system's static gain on the other hand show how the system changes when there is a step change in the input to the system. So even though both the system and the closed-loop system has a step change as input, the change is done on different signals: the reference value for the closed-loop system, and the system's input for the system.`},


//Sol: Any PID parameter changed.
"PID_Load":{t:"Can you change any of the PID controller parameters so that the static gain of the load disturbance is not 0? Why is it good thing that the step response for the load disturbance approaches 0.0 and not 1.0, as it does for the closed-loop system?",a:`<h2>What about changing the static gain of a load disturbance G<sub>YL</sub>?</h2>No. You cannot change it. A static gain of 0.0 means that the load disturbance is removed. For a step load disturbance, the PID controller can remove the disturbance. If the load disurbance were to be a ramp input (with a Laplace transform like 1/s^2), the load disturbance can no longer be removed. Try changing the input to a ramp function and see yourself!`},



};
let done_tasks=[];


function update_assignments(){
  let assignments_box = document.querySelector('.assignments_box');
  let s = "";
  s += '<br><button type="button" class="close-window" onclick="toggle_assignments_box();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';

  s += "<center>";
  s += '<svg width="34" height="34" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_assignment"/></svg>';
  s += "&nbsp;Your Assignments";
  s += "</center><br>";

  // Let's see which assignments are done:
  done_assignments = {};
  for (let assignment_id in all_assignments){
    done_assignments[assignment_id]=0;
  }
  for (let task_id in all_tasks){
    if (done_tasks.includes(task_id)){
      // Increase a done counter for the assignments:
      for (let assignment_id in all_assignments){
        if (all_assignments[assignment_id].tasks.includes(task_id)){
          done_assignments[assignment_id]+=1;
        }
      }
    }
  }

  let nof_assignments_done=0;
  s += "Please select an assignment:<br>";
  for (let assignment_id in all_assignments){
    if (done_assignments[assignment_id] != all_assignments[assignment_id].tasks.length){
      let long_name = all_assignments[assignment_id].t;
      s += "<input type='radio' name='assignment' id='"+assignment_id+"' value='"+assignment_id+"' onchange='select_assignment(this);'";
      if (current_assignment == assignment_id){
        s+=" checked";
      }
      s+="><label for='"+assignment_id+"'>&nbsp;" + long_name + "</label><br>";
    } else {
      nof_assignments_done+=1;
    }
  }

  s += "<br><b>" + (nof_assignments_done) + "/"+(Object.keys(all_assignments).length-1)+"</b> done so far. ";
  if (nof_assignments_done == 0) s+="Better get started!";
  else if (nof_assignments_done == 1) s+="You're getting up to speed!";
  else if (nof_assignments_done == 2) s+="So get on with the next one!";
  else if (nof_assignments_done == 3) s+="You're halfway there!";
  else if (nof_assignments_done == 4) s+="Good job!";
  else if (nof_assignments_done == 5) s+="You can smell the finish line!";
  else if (nof_assignments_done == 6) s+="You're a legend!";
  s += "<br>";

  if (nof_assignments_done > 0){
    s+="<br>Completed assignments:<br>";
    for (let assignment_id in all_assignments){
      if (done_assignments[assignment_id] == all_assignments[assignment_id].tasks.length){
        let long_name = all_assignments[assignment_id].t;
  //      s += "<input type='checkbox' checked>&nbsp;" + long_name + "<br>";
        s += "<input type='radio' name='assignment' id='"+assignment_id+"' value='"+assignment_id+"' onchange='select_assignment(this);'";
        if (current_assignment == assignment_id){
          s+=" checked";
        }
        s+="><label for='"+assignment_id+"'>&nbsp;" + long_name + "</label><br>";
      }
    }
  }
  s += '<img src="images/explorers_1024.webp" width="384px" style="margin:0;padding:0">';
  assignments_box.innerHTML=s;
}

function restart_lupze(){
  add_event("restart_lupze");
  //location.reload();
  disable_questions();
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  current_assignment = "none";
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill=null;
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  quiz_is_running = 0;
  update_tasks();
  removeAllGraphs();
  next_graph_no_to_add=0;
  id_bank=0;
  // Add the initial startup graphs:
  for(let graph_no=0; graph_no<NOF_GRAPHS_AT_STARTUP; graph_no++){
    let graph_to_add = GRAPH_ORDER[graph_no];
    addNewGraph(null, graph_to_add);
  }
  next_graph_no_to_add = NOF_GRAPHS_AT_STARTUP;
}

function select_assignment (event){
  add_event("select_assignment="+event.value);
  current_assignment = event.value;
  update_tasks();
  removeAllGraphs();
  //stop_quiz:
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  //remove the assignments box:
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.remove('active');
  if(event.value=="none"){
    next_graph_no_to_add=0;
    id_bank=0;
    // Add the initial startup graphs:
    for(let graph_no=0; graph_no<NOF_GRAPHS_AT_STARTUP; graph_no++){
      let graph_to_add = GRAPH_ORDER[graph_no];
      addNewGraph(null, graph_to_add);
    }
    next_graph_no_to_add = NOF_GRAPHS_AT_STARTUP;
    let assignment_icon_svg = document.getElementById("assignment_icon_svg");
    assignment_icon_svg.style.fill=null;
    return;
  }
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill="#5050ff";

  if(event.value=="one_pole"){
    next_graph_no_to_add=0;
  } else if(event.value=="two_real_poles"){
    next_graph_no_to_add=1;
  } else if(event.value=="two_complex_poles"){
    next_graph_no_to_add=2;
  } else if(event.value=="time_delay"){
    next_graph_no_to_add=3;
  } else if(event.value=="one_zero_two_poles"){
    next_graph_no_to_add=4;
  } else if(event.value=="four_poles"){
    next_graph_no_to_add=5;
  } else if(event.value=="pid_controller"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_S"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_YL"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_OL"){
    next_graph_no_to_add=0;
  }
  // Set the color of the graph:
  id_bank = next_graph_no_to_add;
  addNewGraph();
  // Make main graph information bar active:
  let info_tab = document.getElementById("graph_"+(next_graph_no_to_add)+"_info");
  info_tab.checked = "true";

  // Add ghost graphs:
  // The name tells where this formula will be shown:
  // GhostMPTNIE_Displayed name
  //      M      = shows up in Bode magnitude plot
  //       P     = shows up in Bode phase plot
  //        T    = shows up in Bode time response plot
  //         N   = shows up in Nyquist diagram
  //          I  = shows up in information tab
  //           E = shows up in Equations
  if(event.value=="one_pole"){
    //"reference eq in step response(k=0.65, T1=2)"
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.65}{1+2s}", formula:"(0.65)/((1+2s))"});
  } else if(event.value=="two_real_poles"){
    //reference in step (T2=T3=1, k2=0.5)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.5}{1+2s+s^2}", formula:"0.5/(1+2s+s^2)"});
    //reference in bode phase (T2=5, T3=0.05, k2=1)
    addNewGraph(null, {name:"Ghost.P...._Match this Bode phase", mf:"\\frac{1}{(1+5s)(1+0.05s)}", formula:"1/(1+5s)*1/(1+0.05s)"});
  } else if(event.value=="two_complex_poles"){
    //Bode reference (w=8, z=0.05)
    addNewGraph(null, {name:"GhostMP...._Match this Bode", mf:"\\frac{8^2}{s^2+2*0.05*8*s+8^2}", formula:"8^2/(s^2+2*0.05*8*s+8^2)"});
    //Step reference (w=2,z=0.7,k=0.7)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}", formula:"0.7*2^2/(s^2+2*0.7*2*s+2^2)"});
  } else if(event.value=="one_zero_two_poles"){
    //Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
    addNewGraph(null, {name:"Ghost...N.._Match this Nyquist", mf:"\\frac{(1+6s)}{(1+2.5s)(1+s)}", formula:"(1+6s)/(1+2.5s)*1/(1+s)"});
    //Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
    addNewGraph(null, {name:"GhostMP...._Match this Bode", mf:"\\frac{0.75(1+2s)}{(1+9.25s)(1+0.5s)}", formula:"0.75(1+2s)/(1+9.25s)*1/(1+0.5s)"});
    //Step reference (k4=1,T6=1,T7=1,T8=-1.5)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{(1-1.5s)}{(1+s)(1+s)}", formula:"(1-1.5s)/(1+s)*1/(1+s)"});
  } else if(event.value=="pid_controller"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
  } else if(event.value=="pid_controller_S"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
  } else if(event.value=="pid_controller_YL"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    //addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YL, "_____MPT..E");
  } else if(event.value=="pid_controller_OL"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YL, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_OPEN, "_____MP.NIE");
  }
  // Recalculate figures in the information bar, Phase margin, Gain crossover frequency, gain margin, etc.:
  redraw_canvas_gain("all");
}

let assignment_grade=0;
function update_tasks (){
  let task_div=document.getElementById("task_list");
  if (current_assignment=="none"){
    task_div.innerHTML = '<div class="yellow_hover"><center><span onclick="addNewGraph();" style="color:#b0b0b0;vertical-align:middle">Click <svg width="20" height="20" viewBox="0 0 24 24" fill="#b0b0b0" style="vertical-align:top"><use href="#icon_add"/></svg> or here to add next graph</span></center></div>';
    return;
  }

  let assignment_score = 100.0 * done_tasks.length / Object.keys(all_tasks).length;
  let new_assignment_grade=0;
  if (assignment_score<15){
    new_assignment_grade=0; // Black
  } else if (assignment_score<50){
    new_assignment_grade=1; // Bronze
  } else if (assignment_score<98){
    new_assignment_grade=2; // Silver
  } else {
    new_assignment_grade=3; // Gold
  }
  if (new_assignment_grade != assignment_grade){
    let assignment_0 = document.getElementById("assignment_0");
    assignment_0.src = "images/assignment_"+assignment_grade+".webp";
    assignment_grade = new_assignment_grade;
    assignment_0.style.animation = 'none';
    assignment_0.offsetHeight; /* trigger reflow */
    assignment_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let assignment_0_text = document.getElementById("assignment_0_text");
  assignment_0_text.innerHTML = done_tasks.length + "/" + Object.keys(all_tasks).length + "&nbsp";


  let s="";
  s += "<center><b>"+all_assignments[current_assignment].t+"</b></center><br>";

  // List all tasks not yet done:
  let todo = "Your tasks in this assignment:<br>";
  let nof_done_subtasks = 0;
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        nof_done_subtasks+=1;
      } else {
        let long_name = all_tasks[task_id].t;
        todo += "<input type='checkbox' onclick='return false;'>&nbsp;<span style='color:#4040b0;' id='task_"+task_id+"'>" + long_name + "</span><br><br>";
      }
    }
  }
  if (nof_done_subtasks != Object.keys(all_assignments[current_assignment].tasks).length){
    s += todo;
    s += "Completed tasks:<br>";
  }
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        let long_name = all_tasks[task_id].t;
        s += "<input type='checkbox' checked onclick='reset_task(\""+task_id+"\");'>&nbsp;<span style='color:#4040b0;' id='task_"+task_id+"'>" + long_name + "</span><br>";
      }
    }
  }
  if (nof_done_subtasks != Object.keys(all_assignments[current_assignment].tasks).length){
    s += "<br><b>" + (nof_done_subtasks) + "/"+Object.keys(all_assignments[current_assignment].tasks).length+"</b> done so far.";
  } else {
    s+="<br><span onclick='toggle_assignments_box()' class='clickable-link'>You're done with this assignment! Click <b>here</b> to choose the next assignment.</span>";
  }
  s += "<br><br><br><center><i><div style='width:70%;border-radius:20px;padding:5%;background:#e0e0e0;'>"+all_assignments[current_assignment].info+"</span></i></center>";

  task_div.innerHTML=s;
}



// ----------------------
// Achievements

let gamification_enabled = false;
let sound_enabled=0; // 1 means "audio context needs to be initialized". true means "everything works"
                     // 0 means "audio context needs to be initialized". false means "everything works but don't play anything"
let done_achievements=[];
let achievement_score=0;
let achievement_rank="";
let achievement_score_to_next_rank=0;

function toggle_gamification(event){
  if (gamification_enabled == false){
    gamification_enabled = true;
    let show_achievements_icon = document.getElementById("show_achievements");
    show_achievements_icon.style.display = "inline";
  } else {
    gamification_enabled = false;
    let show_achievements_icon = document.getElementById("show_achievements");
    show_achievements_icon.style.display = "none";
  }
}

function toggle_sound(event){
  if (sound_enabled==0){
    sound_enabled = 1;
  } else if (sound_enabled==false){
    sound_enabled = true;
  } else if (sound_enabled==1){
    sound_enabled = 0;
  } else {
    sound_enabled = false;
  }
}

function achievement_done (which_one){
  if (quiz_is_running>0) return;
  if (!(done_achievements.includes(which_one))){
    // This is a new achievement
    add_event("achievement_done="+which_one);
    done_achievements.push(which_one);

    if (gamification_enabled==true){
      // Trigger an animation with the text:
      let achievement_text_div = document.getElementById("achievement_text");
      achievement_text_div.innerHTML=all_achievements[which_one];
      let left = (100*mouseX /windowWidth);
      if (left > 85) left = 85;
      let top = (100*mouseY/windowHeight);
      if (top > 90) left = 90;
      document.querySelector('.achievement_text').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_text').style.setProperty('--top',top+"%");
      document.querySelector('.achievement_star').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_star').style.setProperty('--top',top+"%");
      let achievement_star_div = document.getElementById("achievement_star");
      achievement_text_div.style.animation = 'none';
      achievement_text_div.offsetHeight; /* trigger reflow */
      achievement_text_div.style.animation="MoveToStar 7s ease-in-out 0s 1";
      achievement_star_div.style.animation = 'none';
      achievement_star_div.offsetHeight; /* trigger reflow */
      achievement_star_div.style.animation="MoveToStar2 8s ease-out 0s 1";
      if (sound_enabled==true){
        play_jingle();
      }

      // Let the menu star wiggle a little:
      let menu_star_div = document.getElementById("show_achievements");
      menu_star_div.style.animation = 'none';
      menu_star_div.offsetHeight; /* trigger reflow */
      menu_star_div.style.animation="MenuStar 7s ease-in-out 0s 1";
    }

    update_achievements();
  //} else {
  //   This achievement has already been completed. No need to do anything.
  }
}

const all_achievements={
  "view_achievements":"Open your <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_star'/></svg> Achievements",
  "view_assignments":"Open your <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_assignment'/></svg> Assignments",
  "view_info":"Open the <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_info'/></svg> info section",
  "go_fullscreen":"Get rid of distractions by going <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_fullscreen'/></svg> fullscreen",
  "drag_pole":"Drag a pole <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_clear'/></svg> in the pole-zero map",
  "drag_zero":"Drag a zero <b>O</b> in the pole-zero map",
  "ask_a_question":"Right click to ask <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_help'/></svg> questions.",
  "drag_bode_mag":"Drag a transfer function in the Bode magnitude plot",
  "drag_bode_phase":"Drag a transfer function in the Bode phase plot",
  "drag_complex_pole":"Drag <b>two complex poles</b> in the pole-zero map",
  "hover_nyquist_-90":"Hover or click the Nyquist diagram at -90° on the unit circle",
  "drag_time_response":"Drag the <b>two complex poles</b> transfer function in the time domain",
  "drag_pole_to_right_half_plane":"Drag a pole <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_clear'/></svg> in the pole-zero map into the right half plane",
  "drag_zero_to_right_half_plane":"Drag a zero <b>O</b> in the pole-zero map into the right half plane",
  "start_quiz":"Start a <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_school'/></svg> quiz",
  "add_graph":"Add <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_add'/></svg> another graph",
  "set_input_to_impulse":"Change the input function to a dirac impulse",
  "python_script":"Get <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_ios_share'/></svg> the Python script for any transfer function",
  "matlab_script":"Get <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_ios_share'/></svg> the MATLAB script for any transfer function",
  "change_L":"Change time delay L in the <b>time delay</b> transfer function",
  "low_z":"Make damping factor z for <b>two complex poles</b> less than 0.1",
  "T2_T3_far_apart":"Separate <b>two real poles'</b> time constants a factor 100 apart",
  "k_above_or_equal_100":"Change a transfer function to have a magnitude k≥100",
  "set_input_to_ramp":"Change the input to a ramp function"
};

const achievement_ranks={
  99:"Automatic Control Legend",
  95:"Automatic Control Guru",
  90:"Automatic Control Diamond Welder",
  85:"Gold Medal Control 先生 Sensei",
  80:"Automatic Contrl 指導者 Shidousha", // "guidance person"
  75:"Silver Medal Control Master",
  70:"Automatic Control 真剣な競争者 Shinken na Kyoushuusha", //  "Serious contender"
  65:"Automatic Control Brave Knight",
  60:"Bronze Medal Control Whiz",
  50:"Automatic Control Hero",
  40:"Automatic Control Citizen",
  25:"Automatic Control Apprentice",
  10:"Automatic Control Wannabe",
  5:"Automatic Control 初心者 Shoshinsha", // "beginner"
  0:"Automatic Control Newbie"
}

let star_grade=0;
function update_achievements (){
  achievement_score = 100.0 * done_achievements.length / Object.keys(all_achievements).length;
  achievement_rank="";
  achievement_score_to_next_rank=-1;
  let new_star_grade=0;
  if (achievement_score<15){
    new_star_grade=0; // Black
  } else if (achievement_score<50){
    new_star_grade=1; // Bronze
  } else if (achievement_score<98){
    new_star_grade=2; // Silver
  } else {
    new_star_grade=3; // Gold
  }
  if (new_star_grade != star_grade){
    let star_0 = document.getElementById("star_0");
    star_grade=new_star_grade;
    star_0.src = "images/star_"+new_star_grade+".webp";
    star_0.style.animation = 'none';
    star_0.offsetHeight; /* trigger reflow */
    star_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let star_0_text = document.getElementById("star_0_text");
  star_0_text.innerHTML = done_achievements.length + "/" + Object.keys(all_achievements).length + "&nbsp";

  const entries = Object.entries(achievement_ranks);
  // Sort the array based on integer keys in descending order
  entries.sort(([keyA], [keyB]) => keyB - keyA);
  // Iterate over the sorted array
  for (const [threshold, rank] of entries) {
    if (achievement_score>=threshold){
      achievement_rank=achievement_ranks[threshold];
      break;
    } else {
      achievement_score_to_next_rank=threshold-achievement_score;
    }
  }

  let achievements_box = document.querySelector('.achievements_box');
  let s = "";
  s += '<br><button type="button" class="close-window" onclick="toggle_achievements();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';

  s += "<center>";
  s += "<svg width='28' height='28' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_star'/></svg>";
  s += " Your Achievements ";
  s += "</center><br>";
  s += "Completed:<br>";
  for (let achievement_id in all_achievements){
    if (done_achievements.includes(achievement_id)){
      let long_name = all_achievements[achievement_id]
      s += "<input type='checkbox' checked onclick='reset_achievement(\""+achievement_id+"\");'>&nbsp;" + long_name + "<br>";
    }
  }
  s += "<br>Your Score: <b>" + achievement_score.toFixed(1) + "/100</b><br>";
  s += "Your Rank: <b>" + achievement_rank + "</b><br><br>";

  if (done_achievements.length == Object.keys(all_achievements).length){
    s += "<center>Well done! You're one in a million, Legend.</center><br>";
  } else {
    s += "Level up with another " + achievement_score_to_next_rank.toFixed(1) + " points:<br>";
    for (let achievement_id in all_achievements){
      if (!(done_achievements.includes(achievement_id))){
        let long_name = all_achievements[achievement_id]
        s += "<input type='checkbox' onclick='return false;'>&nbsp;" + long_name + "<br>";
      }
    }
  }
  s += "<br>";

  achievements_box.innerHTML=s;
}

function reset_achievement(achievement_to_reset){
  let index = done_achievements.indexOf(achievement_to_reset);
  if (index !== -1) {
    // We found it. Remove it:
    done_achievements.splice(index, 1);
  }
  update_achievements();
}

function toggle_achievements(event){
  achievement_done("view_achievements");
  let achievements_box = document.querySelector('.achievements_box');
  achievements_box.classList.toggle('active');
  update_achievements();
}


//// seed_jingle1:
//var jingle_positions = [
//  0.0,
//  6.87,
//  13.92,
//  21.58,
//  30.82,
//  41.40,
//  50.78,
//  61.32,
//  71.61,
//  82.81,
//  95.55,
//  109.48
//];
//// pling_v01.mp3:
//var jingle_positions = [
//  0.0,
//  1.0,
//  2.0,
//  3.0,
//  4.0,
//  5.0,
//  6.0,
//  7.0,
//  8.0,
//  9.0,
//  10.0,
//  11.0,
//  12.0,
//  13.0,
//  14.0,
//  15.0,
//  16.0,
//  17.0,
//  18.0,
//  19.0,
//  20.0,
//  21.0,
//  22.0,
//  23.0,
//  24.0,
//  25.0,
//  26.0,
//  27.0,
//  28.0
//];

// bonus_pling7.wav:
var jingle_positions = [
  0.0,
  3.0
];

var current_jingle = 0;// Jingle_positions.length-2;
var last_jingle_play = 0;
var jingle_buffer;
var jingle_source;
function init_jingle (){
//  var audioSource = "audio/pling_v01.mp3";
//  var audioSource = "audio/seed_jingle1.mp3";
  var audioSource = "audio/bonus_pling7.wav";
  var request = new XMLHttpRequest();
  request.open("GET", audioSource, true);
  request.responseType = "arraybuffer";
  // Decode asynchronously
  request.onload = function () {
    window.audioContext.decodeAudioData(request.response, (theBuffer) => {
      jingle_buffer = theBuffer;
      //        Play_jingle();
    });
  };
  request.send();
}
function play_jingle (){
  //console.log("Play jingle");
  try {
    // This is how non-iOS stops a sound:
    if (jingle_source) {
      jingle_source.stop();
    }
  } catch (e) {}
  try {
    // This is how iOS stops a sound:
    if (jingle_source) {
      jingle_source.noteOff();
    }
  } catch (e) {}
  try {
    if (jingle_source) {
      jingle_source.disconnect();
    }
  } catch (e) {}
  if (jingle_buffer) {
    jingle_source = window.audioContext.createBufferSource();
    jingle_source.buffer = jingle_buffer;
    jingle_source.connect(window.audioContext.destination);
  }
  if (current_jingle >= jingle_positions.length - 1) {
    current_jingle = 0;
  }
  var real_from = jingle_positions[current_jingle] - 0.05;
  if (real_from < 0) {
    real_from = 0;
  }
  var to = jingle_positions[current_jingle + 1];
  if (jingle_source) {
    jingle_source.start(0, real_from, to - real_from - 0.10);  //-0.3 for seed_jingle1.mp3
    current_jingle++;
  }
}


// ----------------------

function changeStrokeWeight(event){
  let slider_value = document.getElementById("stroke-range").value;
  line_stroke_weight = +slider_value;
  redraw();
}

function changeColorMode(event){
  let checkbox_value = document.getElementById("color-mode-checkbox").checked;
  let graph_information_tabs = document.getElementsByClassName("graph-information-tabs")[0];
  let graph_information = document.getElementsByClassName("graph-information")[0];
  if(!checkbox_value){
    // Set to dark mode:
    background_color = color('hsb(0, 0%, 4%)');
    line_color = color('hsb(0, 0%, 22%)'); // Grey graph lines
    text_color = color('hsb(0, 0%, 100%)');
    angle_color = "#ff40ff";
    box_background_color = 120;  // The tooltip hover box
    graph_information_tabs.style.background="#202020";
    graph_information.style.background="#484848";
    const checkedRadio = document.querySelector('.graph-information-tabs input[type="radio"]:checked');
    if (checkedRadio) {
      // Select the corresponding label using the adjacent sibling selector
      const labelElement = checkedRadio.nextElementSibling;
      labelElement.style.background="#484848";
    }
  } else {
    // Set to light mode:
    background_color = color('hsb(0, 0%, 100%)');
    line_color = color('hsb(0, 0%, 64%)');
    text_color = color('hsb(0, 0%, 5%)');
    angle_color = "#ff40ff";
    box_background_color = 255;  // The tooltip hover box
    graph_information_tabs.style.background="#fff";
    graph_information.style.background="#ddd";
    const checkedRadio = document.querySelector('.graph-information-tabs input[type="radio"]:checked');
    if (checkedRadio) {
      // Select the corresponding label using the adjacent sibling selector
      const labelElement = checkedRadio.nextElementSibling;
      labelElement.style.background="#ddd";
    }
  }
  redraw();
}


function updateInputFormulaFromList(event){
  let selected_input = document.getElementById("input-choices").value;
  let input_equation = document.getElementById("input-formula");
  switch(selected_input){
    case 'Ramp':
      input_formula = "1/(s^2)";
      input_equation.value = "\\frac{1}{s^2}";
      break;
    case 'Unit step':
      input_formula = "1/s";
      input_equation.value = "\\frac{1}{s}";
      break;
    case 'Impulse':
      achievement_done("set_input_to_impulse");
      input_formula = "1";
      input_equation.value = "1";
      break;
    case 'Oscillation':
      input_formula = "1/(1 + s^2)"
      input_equation.value = "\\frac{1}{1 + s^2}";
      break;
    case 'Oscillation10':
      input_formula = "100/(1 + 20s + 100s^2)"
      input_equation.value = "\\frac{100}{1 + 20s + 100s^2}";
      break;
  }
  redraw_canvas_gain("all");
}

function updateGraphInformation(){
  let tabs_wrapper = document.getElementsByClassName("graph-information-tabs")[0];
  let inputs = tabs_wrapper.getElementsByTagName('input');
  let sub_information = document.getElementsByClassName("sub-information");
  let phase = sub_information[0].getElementsByClassName("value")[0];
  let gain_cross = sub_information[0].getElementsByClassName("value")[1];
  let gain = sub_information[0].getElementsByClassName("value")[2];
  let phase_cross = sub_information[0].getElementsByClassName("value")[3];
  for(let h=0; h<inputs.length; h++){
    if(inputs[h].checked){
      let input_id = +inputs[h].id.split("_")[1];
      let current_graph;
      for(let j=0; j<bode_graphs.length; j++){
        if(bode_graphs[j].bode_id == input_id){
          current_graph = bode_graphs[j];
        }
      }
      if(isNaN(current_graph.bode_phase_margin)){
        phase.innerHTML = "NaN";
        gain_cross.innerHTML = "NaN";
      }
      else{
        phase.innerHTML = current_graph.bode_phase_margin.toFixed(2) + "°";
        gain_cross.innerHTML = current_graph.bode_gain_crossover_freq.toFixed(2);
      }
      if(isNaN(current_graph.bode_gain_margin)){
        gain.innerHTML = "NaN";
        phase_cross.innerHTML = "NaN";
      }
      else{
        // Print gain margin in dB:
        //gain.innerHTML = current_graph.bode_gain_margin.toFixed(2) + "dB";
        let value_dB = current_graph.bode_gain_margin;
        let value = Math.pow(10.0, value_dB / 20.0);
        gain.innerHTML = value.toFixed(2);
        phase_cross.innerHTML = current_graph.bode_phase_crossover_freq.toFixed(2);
      }
    }
  }
}


function windowResized(){
  setGraphDimensions();
  resizeCanvas(canvas_width,canvas_height);
  redraw_canvas_gain("all");
}

function setGraphDimensions(){
  let this_window_width=max(1295,windowWidth);  // Also present in style.css  "body{min-width: 1280px;}
  canvas_width = this_window_width - 380;
  canvas_height = windowHeight - 110;
  add_event("set_graph_dimensions:windowWidth="+windowWidth+",windowHeight="+windowHeight);

  graph_bode_mag_width = (canvas_width - 100)*0.42;
  graph_bode_mag_height = (canvas_height-150)*0.48;
  graph_bode_mag_x = 0;
  graph_bode_mag_y = 0;
  graph_bode_phase_width = (canvas_width - 100)*0.42;
  graph_bode_phase_height = (canvas_height-150)*0.48;
  graph_bode_phase_x = 0;
  graph_bode_phase_y = graph_bode_mag_height;

  graph_step_response_width = (canvas_width - 100)*0.35;
  graph_step_response_height = (canvas_height-150)*0.48;
  graph_step_response_x = graph_bode_mag_width+100;
  graph_step_response_y = -10;
  graph_nyquist_width = (canvas_width - 100)*0.35;
  graph_nyquist_height = (canvas_height-150)*0.48;
  graph_nyquist_x = graph_bode_mag_width+100;
  graph_nyquist_y = graph_bode_mag_height+65;

  graph_pole_zero_width = (canvas_width - 100)*1/6 - 40;
  graph_pole_zero_x = canvas_width - graph_pole_zero_width - 20;
  graph_pole_zero_y = 0;
}


function draw(){
  background(background_color);
  push();
  translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y + graph_nyquist_y_offset);
  draw_nyquist_responses();
  pop();

  push();
  translate(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y+graph_bode_mag_y_offset);
  draw_bode_responses('gain');
  pop();

  push();
  translate(graph_bode_phase_x + 60,graph_bode_phase_y + 76);
  x_axis_steps_text();
  pop();

  push();
  translate(graph_bode_phase_x_offset+graph_bode_phase_x,graph_bode_phase_y_offset + graph_bode_phase_y);
  draw_bode_responses('phase');
  pop();

  push();
  translate(graph_step_response_x + graph_step_response_x_offset,graph_step_response_y + graph_step_response_y_offset);
  draw_time_responses();
  pop();

  push();
  translate(graph_pole_zero_x,graph_pole_zero_y);
  draw_pole_zeros();
  pop();
}

function roundup_decimal(input){
  let sign = Math.sign(input);
  input = Math.abs(input);
  let decimal_part = input % 1;
  if(decimal_part >= 0.5){
    return Math.ceil(input)*sign;
  }
  else{
    return Math.floor(input)*sign;
  }
}

function value_magnet(input,magnet_value){
  let magnet_count = roundup_decimal(input/magnet_value);
  return magnet_count * magnet_value;
}

function get_bestMultiple(input,divider,type){
  let sign = Math.sign(input);
  input = Math.abs(input);
  let dividend = +(input/divider).toFixed(1);
  if(type == 'upper'){
    if(sign < 0){
      dividend = Math.floor(dividend);
    }
    else{
      dividend = Math.ceil(dividend);
    }
  }
  else if(type == 'lower'){
    if(sign < 0){
      dividend = Math.ceil(dividend);
    }
    else{
      dividend = Math.floor(dividend);
    }
  }
  return (dividend*divider)*sign;
}

function textPowerOfTen(input_power,x_pos,y_pos){
  textSize(15);
  fill(text_color);
  push()
  translate(x_pos,y_pos);
  text('10',0,0);
  textSize(11);
  text(input_power.toString(),18,-8);
  pop();
}

let rad_phase_lower_bound;
let rad_phase_upper_bound;
function draw_bode_phase_T(T,i,pole_zero="pole"){
  let frequency = 1/Math.abs(T);
  let screen_x = (Math.log(frequency)/Math.log(10)+2) * graph_bode_phase_width/5;
  let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
  let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(3);
  if (pole_zero=="pole") draw_X(screen_x,screen_y);
  else {
    noFill();
    draw_O(screen_x,screen_y);
  }
}

function draw_bode_mag_T(T,i,pole_zero="pole"){
  let frequency = 1 / Math.abs(T);
  // Need to map frequency to pixel:
  let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
  // Now we know the x position. Let's find out the y position:
  let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(3);
  if (pole_zero=="pole") draw_X(screen_x,screen_y);
  else {
    noFill();
    draw_O(screen_x,screen_y);
  }
}

//Drawing functions
function draw_bode_responses(type){
  if(type == "phase"){
    let nof_shown=0;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)) nof_shown+=1;
    }
    let min_phase = 10000;
    let max_phase = -10000;
    if (nof_shown==0){
      min_phase = -270/180*Math.PI;
      max_phase = 90/180*Math.PI;
    } else {
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
          let current_graph = bode_graphs[i];
          if(current_graph.bode_min_phase < min_phase){
            min_phase = current_graph.bode_min_phase;
          }
          if(current_graph.bode_max_phase > max_phase){
            max_phase = current_graph.bode_max_phase;
          }
        }
      }
    }
    // Limiting the phase axis into something sane:
    min_phase = Math.max(-360/180*Math.PI,min_phase);
    min_phase = min_phase*180/Math.PI;
    max_phase = max_phase*180/Math.PI;
    phase_lower_bound = get_bestMultiple(min_phase,45,"lower");
    phase_upper_bound = get_bestMultiple(max_phase,45,"upper");
    phase_case_number = (phase_upper_bound - phase_lower_bound)/45;
    if(phase_case_number == 0){
      phase_upper_bound += 45;
      phase_lower_bound -= 45;
      phase_case_number = 2;
    }
    textAlign(CENTER);
    noStroke();
    fill(text_color);
    textSize(15);
    text("Bode phase plot",graph_bode_phase_width/2,-5);
    text("phase arg{G(s)}",0,-30);
    text("[degrees]",0,-15);
    draw_loglines(x_case_gain,y_case_gain);
    text("angular freq [rad/s]",graph_bode_phase_width,graph_bode_phase_height+35);
    textAlign(RIGHT);
    textSize(15);
    for(let y=0; y<=phase_case_number; y++){
      stroke(line_color);
      let pas = graph_bode_phase_height*y/phase_case_number;
      let value = phase_upper_bound - 45*y;
      if (value!=0){
        strokeWeight(1);
      } else {
        strokeWeight(3);
      }
      line(0,pas,graph_bode_phase_width,pas);
      noStroke();
      fill(text_color);
      text(value,-7,pas+5);
    }
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
        let stop_on_overflow=false;
//        if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
//          // A workaround to not plot the high frequency way-off phase in the bode phase plot of GRAPH_TIME_DELAY with L > 1:
//          stop_on_overflow=true;
//        }
        bode_graphs[i].draw_phase(stop_on_overflow);
      }
    }
    // Draw X for T_1, T_2, T_3 and w:
    rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
    rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
        if(bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
          // Draw T_1:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_1"]],i);
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
          // Draw T_2 and T_3:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_2"]],i);
            draw_bode_phase_T(range_slider_variables[variable_position["T_3"]],i);
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
          // Draw w:
          try{ // The graph may be deleted, so this might fail:
            let w = range_slider_variables[variable_position["w"]];
            let z = range_slider_variables[variable_position["z"]];
            if (z <= 1){
              // One single frequency, so only one X in the graph:
              if (w >= 0){
                draw_bode_phase_T(1/w,i);
              }
            } else {
              //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
              // We should draw 2 X in this graph:
              let bode_3_real_1 = z*w + w * Math.sqrt(z*z-1);
              let bode_3_real_2 = z*w - w * Math.sqrt(z*z-1);
              w = bode_3_real_1;
              if (w >= 0){
                draw_bode_phase_T(1/w,i);
              }
              w = bode_3_real_2;
              if (w >= 0){
                draw_bode_phase_T(1/w,i);
              }
            }
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
          // Draw T_4:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_4"]],i);
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
          // Draw T_8, T_6 and T_7:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_6"]],i);
            draw_bode_phase_T(range_slider_variables[variable_position["T_7"]],i);
            draw_bode_phase_T(range_slider_variables[variable_position["T_8"]],i,"zero");
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
          // Draw T_5:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_5"]],i);
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_PID.formula){
          // Draw T_i and T_d:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_i"]],i);
            draw_bode_phase_T(range_slider_variables[variable_position["T_d"]],i);
          } catch {}
        }
      }
    }


  } else if(type == "gain"){
    textAlign(CENTER);
    noStroke();
    fill(text_color);
    textSize(15);
    text("Bode magnitude plot",graph_bode_mag_x + graph_bode_mag_width/2,graph_bode_mag_y-5);
    text("magnitude |G(s)|",0,-15);
    draw_loglines(x_case_gain,y_case_gain);
    text("angular freq [rad/s]",graph_bode_phase_width,graph_bode_phase_height+35);
//    draw_loglines(x_case_gain,y_case_gain);

    textAlign(RIGHT);
    textSize(15);
    for(let y=0; y<=y_case_gain; y++){
      stroke(line_color);
      let pas = graph_bode_mag_height*y/y_case_gain;
      strokeWeight(1);
      line(0,pas,graph_bode_mag_width,pas);
      if (y>0){
        strokeWeight(0.5);
        for(let i=1; i<=9; i++){
          let pas2 = pas - graph_bode_mag_height/y_case_gain * Math.log(i+1)/Math.log(10);
          line(0,pas2,graph_bode_mag_width,pas2);
        }
      }

      noStroke();
      fill(text_color);
      let value_dB = gain_upper_bound - 20*y;
      let value = 1.0 * Math.pow(10.0, value_dB / 20.0);
      text(value,-7,pas+5);
    }

    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        bode_graphs[i].draw_gain();
      }
    }


    // Draw X for T_1, T_2, T_3 and w:
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
          // Draw T_1:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_1"]],i);
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
          // Draw T_2 and T_3:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_2"]],i);
            draw_bode_mag_T(range_slider_variables[variable_position["T_3"]],i);
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
          // Draw w:
          try{ // The graph may be deleted, so this might fail:
            let w = range_slider_variables[variable_position["w"]];
            let z = range_slider_variables[variable_position["z"]];
            if (z <= 1){
              // One single frequency, so only one X in the graph:
              if (w >= 0){
                draw_bode_mag_T(1/w,i);
              }
            } else {
              //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
              // We should draw 2 X in this graph:
              let bode_3_real_1 = z*w + w * Math.sqrt(z*z-1);
              let bode_3_real_2 = z*w - w * Math.sqrt(z*z-1);
              w = bode_3_real_1;
              if (w >= 0){
                draw_bode_mag_T(1/w,i);
              }
              w = bode_3_real_2;
              if (w >= 0){
                draw_bode_mag_T(1/w,i);
              }
            }
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
          // Draw T_4:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_4"]],i);
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
          // Draw T_8, T_6 and T_7:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_6"]],i);
            draw_bode_mag_T(range_slider_variables[variable_position["T_7"]],i);
            draw_bode_mag_T(range_slider_variables[variable_position["T_8"]],i,"zero");
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
          // Draw T_5:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_5"]],i);
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_PID.formula){
          // Draw T_i and T_d:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_i"]],i);
            draw_bode_mag_T(range_slider_variables[variable_position["T_d"]],i);
          } catch {}
        }
      }
    }
  }
}

function draw_X(screen_x,screen_y){
  line(screen_x-6,screen_y-6,screen_x+6,screen_y+6);
  line(screen_x+6,screen_y-6,screen_x-6,screen_y+6);
}

function draw_O(screen_x,screen_y){
  ellipse(screen_x,screen_y,15,15);
}

function draw_static_gain(k,i){
  let screen_y = map(k,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(0.5);
  line(0,screen_y,graph_step_response_width,screen_y);
}

function draw_time_response_T(T,i,pole_zero="pole"){
  // We might have changed the precision for new calculations, but this graph still has old values.
  // So get the precision for this graph alone:
  let this_precision = graph_step_response_width / bode_graphs[i].bode_timerep_array.length;
  let linked_x = Math.round(Math.abs(T) / 10.0 * graph_step_response_width/this_precision);
  let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
  let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
  let screen_x = graph_step_response_width / 10 * Math.abs(T);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(3);
  if (pole_zero=="pole"){
    draw_X(screen_x,screen_y);
  } else {
    noFill();
    draw_O(screen_x,screen_y);
  }
}

function draw_time_responses(){
  // Find out a suitable max_y and min_y for the time responses:
  let nof_shown=0;
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)) nof_shown+=1;
  }
  if (nof_shown==0){
    min_y_timerep = -2;
    max_y_timerep = 2;
  } else {
    min_y_timerep = 100000;
    max_y_timerep = -100000;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)){
        let current_graph = bode_graphs[i];
        if(current_graph.bode_max_timerep > max_y_timerep){
          max_y_timerep = current_graph.bode_max_timerep;
        }
        if(current_graph.bode_min_timerep < min_y_timerep){
          min_y_timerep = current_graph.bode_min_timerep;
        }
      }
    }
  }
  // The startup screen should be nice. So force the y range a little:
  if ((max_y_timerep >= 1.0)&&(min_y_timerep<0.01)&&(min_y_timerep>-0.01)) min_y_timerep = 0;
  if (max_y_timerep > 500) max_y_timerep = 500;
  if (min_y_timerep < -500) min_y_timerep = -500;

  textAlign(CENTER);
  noStroke();
  fill(text_color);
  textSize(15);
  if (input_formula == "1/s"){
    text("Step input response",graph_step_response_width/2,-5);
  } else if (input_formula == "1"){
    text("Dirac impulse response",graph_step_response_width/2,-5);
  } else {
    text("Time response",graph_step_response_width/2,-5);
  }
  text("output y(t)",0,-15);
  text("time [s]",graph_step_response_width,graph_step_response_height + graph_step_response_y_offset);
  draw_timelines();

  // Draw "final value":
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)){
      if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
        let T_1 = range_slider_variables[variable_position["T_1"]];
        if (T_1 >= 0) draw_static_gain(range_slider_variables[variable_position["k_1"]],i);
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        let T_2 = range_slider_variables[variable_position["T_2"]];
        let T_3 = range_slider_variables[variable_position["T_3"]];
        if ((T_2>=0)&&(T_3>=0)){
          // Two stable poles. There is a stationary final value we will reach.
          draw_static_gain(range_slider_variables[variable_position["k_2"]],i);
        }
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
        draw_static_gain(range_slider_variables[variable_position["k_3"]],i);
      } else if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
        draw_static_gain(3,i);
      } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        draw_static_gain(range_slider_variables[variable_position["k_4"]],i);
      } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
        let T_5 = range_slider_variables[variable_position["T_5"]];
        if (T_5 >= 0){
          draw_static_gain(range_slider_variables[variable_position["k_5"]],i);
        }
      } else if (bode_graphs[i].bode_formula == GRAPH_ONE_POLE_WITH_PID_YR.formula){
        draw_static_gain(1.0,i);
      }
    }
  }


  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)){
      if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
        // Draw T_1:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_1"]],i);
        } catch {}
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // Draw T_2:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_2"]],i);
          let T_2 = range_slider_variables[variable_position["T_2"]];
        } catch {}
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_3"]],i);
        } catch {}

      } else if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
        // Draw time delay L:
        try{ // The graph may be deleted, so this might fail:
          let L = range_slider_variables[variable_position["L"]];
          if (L >= 0){
            // Now we know the x position. Let's find out the y position:
            draw_time_response_T(range_slider_variables[variable_position["L"]]+1,i);
          }
        } catch {}

      } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // Draw T_6:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_6"]],i);
          draw_time_response_T(range_slider_variables[variable_position["T_7"]],i);
        } catch {}

        // Draw T_8:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_8"]],i,"zero");
          let T_8 = range_slider_variables[variable_position["T_8"]];
        } catch {}
      } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
        // Draw T_5:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_5"]],i);
        } catch {}
      }

    }
  }

  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)){
      bode_graphs[i].draw_timeresponse();
    }
  }
}

function draw_nyquist_responses(){
//  // Find out the aspect ratio of the graph:
//  let nyquist_aspect_ratio = graph_nyquist_width / graph_nyquist_height;
//  // Decide how many sqares there will be on each axis:
//  let nyquist_y_squares = 10;
//  let nyquist_x_squares = Math.floor(nyquist_y_squares * nyquist_aspect_ratio);
//  if (nyquist_aspect_ratio < 1.0){
//    nyquist_x_squares = 10;
//    nyquist_y_squares = Math.floor(nyquist_x_squares / nyquist_aspect_ratio);
//  }
//  //console.log("nyquist_y_squares=" + nyquist_y_squares);
//  //console.log("nyquist_x_squares=" + nyquist_x_squares);
  let nof_shown=0;
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_nyquist_bool)) nof_shown+=1;
  }
  if (nof_shown==0){
    min_nyquist_x = -1;
    max_nyquist_x = 1;
    min_nyquist_y = -1;
    max_nyquist_y = 1;
  } else {
    min_nyquist_x = -1;
    max_nyquist_x = 1;
    min_nyquist_y = -1;
    max_nyquist_y = 0.2;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_nyquist_bool)){
        let current_graph = bode_graphs[i];
        if(current_graph.bode_max_nyquist_x > max_nyquist_x){
          max_nyquist_x = current_graph.bode_max_nyquist_x;
        }
        if(current_graph.bode_min_nyquist_x < min_nyquist_x){
          min_nyquist_x = current_graph.bode_min_nyquist_x;
        }
        if(current_graph.bode_max_nyquist_y > max_nyquist_y){
          max_nyquist_y = current_graph.bode_max_nyquist_y;
        }
        if(current_graph.bode_min_nyquist_y < min_nyquist_y){
          min_nyquist_y = current_graph.bode_min_nyquist_y;
        }
      }
    }
    if (max_nyquist_y > 5) max_nyquist_y = 5;
    if (max_nyquist_x > 5) max_nyquist_x = 5;
    if (min_nyquist_y < -5) min_nyquist_y = -5;
    if (min_nyquist_x < -5) min_nyquist_x = -5;
  }

  // Correct max/mins so that the aspect ratio of the Nyquist diagram is 1.0:
  let mag_x = max_nyquist_x - min_nyquist_x;
  let mag_y = max_nyquist_y - min_nyquist_y;
  let center_x = (max_nyquist_x + min_nyquist_x) / 2;
  let center_y = (max_nyquist_y + min_nyquist_y) / 2;
  let desired_aspect_ratio = graph_nyquist_width / graph_nyquist_height;

  let desired_mag_x = mag_y * desired_aspect_ratio;
  let desired_mag_y = mag_x / desired_aspect_ratio;

  if (desired_mag_x > mag_x) mag_x = desired_mag_x;
  if (desired_mag_y > mag_y) mag_y = desired_mag_y;

  max_nyquist_x = center_x + mag_x/2;
  min_nyquist_x = center_x - mag_x/2;
  max_nyquist_y = center_y + mag_y/2;
  min_nyquist_y = center_y - mag_y/2;

  draw_nyquist_lines();

  // Draw a faint unit circle:
  push();
  let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  stroke(line_color);
  strokeWeight(1);
  noFill();
  ellipse(screen_x0,screen_y0,screen_xw - screen_x0,screen_yw - screen_y0);
  pop();

  // Put a blob at -1,0
  push();
  let x=-1;
  let y=0;
  let screen_x = map(x,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y = map(y,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  noStroke();
  let blob_color = color('hsb(0, 0%, 50%)');
  fill(blob_color,360,360);
  ellipse(screen_x,screen_y,12,12);
  textAlign(RIGHT);
//  text("Feedback ->",screen_x-12,screen_y+4);
//  text("Feed",screen_x-32,screen_y+4-7);
//  text("back",screen_x-32,screen_y+4+7);
//  text("->",screen_x-12,screen_y+4);
  text("-1",screen_x+7,screen_y+18);
  pop();

  textAlign(CENTER);
  noStroke();
  fill(text_color);
  textSize(15);
  text("Nyquist diagram",graph_nyquist_width/2,-5);
  text("Real axis",graph_nyquist_width/2,graph_nyquist_height+graph_step_response_y_offset);

  // text("im",-60,graph_nyquist_height/2 + 4);
  push();
  translate(-55,graph_nyquist_height/2 + 4);
  rotate(-Math.PI/2);
  text("Imaginary axis",0,0);
  pop();

  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_nyquist_bool)){
      bode_graphs[i].draw_nyquist_response();
    }
  }
}

let pole_zero_graph_x = [];
let pole_zero_graph_y = [];

function draw_pole_zeros(){
  pole_zero_width = graph_pole_zero_width;
  pole_zero_height = pole_zero_width;
  // Draw pole zeros for these graphs:
  let draw_position = 0;

  // Find out the last pole zero graph:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
         (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula)||
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula)){
        draw_position += 1;
      }
    }
  }
  let last_graph = draw_position;

  draw_position = 0;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
         (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula)||
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)||
         (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula)){
        pole_zero_graph_x[i] = graph_pole_zero_x;
        pole_zero_graph_y[i] = 30 + (pole_zero_height + 10) * draw_position;
        push();
        translate(0,pole_zero_graph_y[i]);
        let draw_axis = false;
        if (draw_position == last_graph-1){
          draw_axis=true;
        }
        bode_graphs[i].draw_pole_zero(draw_axis);
        pop();
        draw_position += 1;
      }
    }
  }
  push();
  noStroke();
  textSize(15);
  textAlign(CENTER);
  fill(text_color);
  text("Pole-zero map",graph_pole_zero_width/2,25);
  pop();
}


function redraw_canvas_gain(input_id){
  for(let v=0; v<bode_graphs.length; v++){
    if(bode_graphs[v].bode_id == input_id || input_id == "all"){
      bode_graphs[v].get_complex_p5();
    }
  }
  for(let v=0; v<bode_graphs.length; v++){
    if(bode_graphs[v].bode_id == input_id || input_id == "all"){
      bode_graphs[v].get_timevalues_p5();
    }
  }
  updateGraphInformation();
  redraw();
}


// --------------------------------
// Mouse functions

let bode_3_real = -1.0;
let bode_3_imaginary = 0.5;

let clicked_on_time_response_graph_no=-1;
let clicked_on_bode_mag_graph_no=-1;
let clicked_on_bode_phase_graph_no=-1;
let clicked_on_time_variable="";
let clicked_on_pole_zero_graph_no = -1;

let initial_mouseX = 0;
let initial_mouseY = 0;

let splash_screen_active=true;
let this_is_a_touch_device=false;

function mouse_is_in_a_box(mouseX,mouseY){
  const boxes_to_not_handle_clicks_in=['.download_script_box','.toolbox','.info','.achievements_box','.assignments_box'];
  let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
  let scroll_y = window.pageYOffset || document.documentElement.scrollTop
  for (let box_no in boxes_to_not_handle_clicks_in){
    let box = document.querySelector(boxes_to_not_handle_clicks_in[box_no]);
    if (box.classList.contains('active')){
      //See if user clicked inside one of these boxes:
      //The getBoundingClientRect() method returns the size of an element and its position relative to the viewport.
      //Note: The scrolling that has been done is taken into account. This means that the rectangle's edges (top, left, bottom, and right) change their values every time the scrolling position changes.
      const rect = box.getBoundingClientRect();
      if ((mouseX>=rect.left+scroll_x)&&(mouseX<=rect.right+scroll_x)&&(mouseY>=rect.top+scroll_y)&&(mouseY<=rect.bottom+scroll_y)){
        //// Disable mouse clicks to prevent poles & zeros from moving "underneath" this box:
        return true; // Let system handle mouse after this, can be used for iPad scrolling:
      }
    }
  }
  return false;
}

function touchStarted(event){
  this_is_a_touch_device = true;
  mousePressed(event);
}

function remove_banner (){
  let pze_logo=document.getElementById("pze_logo");
  pze_logo.style.animation = 'none';
  pze_logo.offsetHeight; /* trigger reflow */
  pze_logo.style.animation="pze_logo_anim_out 1s ease-out 1";
  pze_logo.style.opacity=0;

  let lu_logo=document.getElementById("lu_logo");
  lu_logo.style.animation = 'none';
  lu_logo.offsetHeight; /* trigger reflow */
  lu_logo.style.animation="lu_logo_anim_out 1s ease-out 1";
  lu_logo.style.opacity=0;

  let explorer_1=document.getElementById("explorer_1");
  explorer_1.style.animation = 'none';
  explorer_1.offsetHeight; /* trigger reflow */
  explorer_1.style.animation="explorer_1_anim_out 1s ease-out 1";
  explorer_1.style.opacity=0;

  let explorer_2=document.getElementById("explorer_2");
  explorer_2.style.animation = 'none';
  explorer_2.offsetHeight; /* trigger reflow */
  explorer_2.style.animation="explorer_2_anim_out 1s ease-out 1";
  explorer_2.style.opacity=0;

  text_color = color('hsb(0,0%,100%)');
  splash_screen_active=false;
  add_event("banner_remove");
}


// p5.js: Browsers may have different default behaviors attached to various mouse events. To prevent any default behavior for this event, add "return false" to the end of the function.
//function mouseClicked(){
function mousePressed(event){
  // Audio API stuff. Can only initialize and play sound at user action, and clicking is one such action:
  if (sound_enabled==1){
    // https://webaudio.github.io/web-audio-api/#AudioBufferSourceNode
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.audioContext = new window.AudioContext();
      sound_enabled = true;
    } catch (e) {
      console.log("No Web Audio API support");
    }
    init_jingle();
  }

  let quizSplashElement = document.querySelector('.quiz_intro');
  if (quizSplashElement.classList.contains('active')){
    // The quiz spash screen is shown.
    // Make sure that clicks go though to the range slider.
    return true; // Propagate default actions
  }

  if (splash_screen_active){
    // This first click is to get rid of the splash screen:
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    remove_banner();
    if (quiz_is_running == 0) {
      const first_time=200;
      const delay=150;
      setTimeout(initial_graph, first_time + 0*delay);
      setTimeout(initial_graph, first_time + 1*delay);
      setTimeout(initial_graph, first_time + 2*delay);
      setTimeout(initial_graph, first_time + 3*delay);
    }
    return false;
  }

  if (mouseButton==RIGHT){
    return;
  }

  if (questions_enabled){
    add_event("questions_removed");
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    //// This is a question click. It's a one-time click.
    //let queue = [];
    //let yes_close_enough = false;
    //for (let q_id in all_questions){
    //  let q_position = all_questions[q_id].pos();
    //  if (q_position.visible){
    //    let distance = Math.sqrt((mouseY - q_position.y)*(mouseY - q_position.y) + (mouseX - q_position.x)*(mouseX - q_position.x));
    //    if(distance < 500){
    //      yes_close_enough = true;
    //      queue.push([distance,q_id]);
    //    }
    //  }
    //}
    //let output;
    //let distance = 10000;
    //for(let h=0; h<queue.length; h++){
    //  if(queue[h][0] < distance){
    //    distance = queue[h][0];
    //    output = queue[h];
    //  }
    //}
    //if(yes_close_enough){
    //  redraw();
    //  let q_position = all_questions[output[1]].pos();
    //  push();
    //  strokeWeight(8);
    //  stroke("#ffff00c0");
    //  line(mouseX,mouseY,q_position.x,q_position.y);
    //  pop();
    //  show_answer(output[1]);
    //}
    disable_questions();
    // Get rid of the yellow line drawn when hovering:
    redraw_canvas_gain("all");
    return false;
  }

  // Decide what we clicked on initially, to know what to move.
  // Reset what we've clicked on:
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable = "";
  clicked_on_pole_zero_graph_no = -1;
  direction_of_T_drag=0; // Let first run of mouseDragged decide which direction to move T

  if (mouse_is_in_a_box(mouseX,mouseY) == true) return true; // Let system handle mouse after this, can be used for iPad scrolling:

  // Check if we've clicked any of the pole-zero graphs:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if ((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
            event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
            let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
            clicked_on_pole_zero_graph_no = i;
            if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
              // See if the user clicked on T_2 or T_3:
              let T_2 = range_slider_variables[variable_position["T_2"]];
              let T_3 = range_slider_variables[variable_position["T_3"]];
              // If T is outside of the box, clamp it to the side of the box:
              if ((1/T_2) > 3.2) T_2=1/3.2;
              if ((1/T_3) > 3.2) T_3=1/3.2;
              if (Math.abs(-1/T_2 - real) < Math.abs(-1/T_3 - real)){
                clicked_on_time_variable = "T_2";
              } else {
                clicked_on_time_variable = "T_3";
              }
            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
              // See if the user clicked on T_8, T_6 or T_7: T_8 is the preferred one if overlapping.
              let T_8 = range_slider_variables[variable_position["T_8"]];
              let T_6 = range_slider_variables[variable_position["T_6"]];
              let T_7 = range_slider_variables[variable_position["T_7"]];
              // If T is outside of the box, clamp it to the side of the box:
              if ((1/T_6) > 3.2) T_6=1/3.2;
              if ((1/T_7) > 3.2) T_7=1/3.2;
              if ((1/T_8) > 3.2) T_8=1/3.2;
              if ((Math.abs(-1/T_8 - real) <= Math.abs(-1/T_6 - real)) && (Math.abs(-1/T_8 - real) <= Math.abs(-1/T_7 - real))){
                clicked_on_time_variable = "T_8";
              } else if ((Math.abs(-1/T_6 - real) <= Math.abs(-1/T_7 - real)) && (Math.abs(-1/T_6 - real) <= Math.abs(-1/T_8 - real))){
                clicked_on_time_variable = "T_6";
              } else {
                clicked_on_time_variable = "T_7";
              }
            }
            if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
              // Let's use fast precision:
              we_need_faster_calculations_right_now=true;
              precision=SPEED_PRECISION;
            }
            add_event("click_pole_zero_map="+i+",clicked_on_time_variable="+clicked_on_time_variable);
            if (current_quiz!="none"){
              quiz_clicked_pole_zero(clicked_on_pole_zero_graph_no,real,imaginary,clicked_on_time_variable);
              return false; // Cancel default actions
            }
            mouseDragged(); // Handle this directly
            return false; // Cancel default actions
          }
        }
      }
    }
  }


  // Check if we've clicked the time axis of the step response graph:
  if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    (((mouseY-graph_step_response_y) >= graph_step_response_height + graph_step_response_y_offset) && ((mouseY-graph_step_response_y) <= graph_step_response_height + graph_step_response_y_offset + graph_step_response_timeaxis_height))){
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      quiz_clicked_time_response_xaxis(time);
      return false; // Cancel default actions
    }

  // Check if we've clicked the step response graph:
  } else if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    ((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset)){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let queue_with_ghosts = [];
    let queue = [];
    let yes_close_enough = false;
    let yes_close_enough_with_ghosts = false;
    let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
    for(let h=0; h<bode_graphs.length; h++){
      if((bode_graphs[h].bode_displaybool)&&(bode_graphs[h].bode_display_timeresponse_bool)){
        let current_graph = bode_graphs[h];
        let linked_y = current_graph.bode_timerep_array[linked_x];
        let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,h,linked_y]);
          if (!(bode_graphs[h].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,h,linked_y]);
          }
        }
      }
    }
    let output;
    let distance = 10000;
    for(let h=0; h<queue.length; h++){
      if(queue[h][0] < distance){
        distance = queue[h][0];
        output = queue[h];
      }
    }
    push();
    stroke(text_color);
    strokeWeight(2);
    line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
    pop();
    if(yes_close_enough){
      clicked_on_time_response_graph_no = output[1];  // 0 - 3
      initial_mouseX = mouseX;
      initial_mouseY = mouseY;

      if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // If user clicked on TWO_REAL_POLES,
        // we need to figure out if user wants to move T_2 or T_3:
        let T_2 = range_slider_variables[variable_position["T_2"]];
        let T_2_x = graph_step_response_width / 10 * Math.abs(T_2);
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_x = graph_step_response_width / 10 * Math.abs(T_3);
        if (Math.abs(T_2_x - (mouseX - graph_step_response_x - graph_step_response_x_offset)) < Math.abs(T_3_x - (mouseX - graph_step_response_x - graph_step_response_x_offset))){
          clicked_on_time_variable = "T_2";
        } else {
          clicked_on_time_variable = "T_3";
        }
      } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // If user clicked on ONE_ZERO_TWO_POLES,
        // we need to figure out if user wants to move T_8, T_6 or T_7:
        let T_8 = range_slider_variables[variable_position["T_8"]];
        let T_8_x = graph_step_response_width / 10 * Math.abs(T_8);
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_x = graph_step_response_width / 10 * Math.abs(T_6);
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_x = graph_step_response_width / 10 * Math.abs(T_7);
        let x = mouseX - graph_step_response_x - graph_step_response_x_offset;
        if ((Math.abs(T_8_x - x) <= Math.abs(T_6_x - x)) && (Math.abs(T_8_x - x) <= Math.abs(T_7_x - x))){
          clicked_on_time_variable = "T_8";
        } else if ((Math.abs(T_6_x - x) <= Math.abs(T_7_x - x)) && (Math.abs(T_6_x - x) <= Math.abs(T_8_x - x))){
          clicked_on_time_variable = "T_6";
        } else {
          clicked_on_time_variable = "T_7";
        }
      }
    }
    add_event("click_step_response,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_time_response_graph_no_with_ghosts = -1;
      if(yes_close_enough_with_ghosts){
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_time_response_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      let amplitude=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
      quiz_clicked_time_response(clicked_on_time_response_graph_no_with_ghosts,time,amplitude,clicked_on_time_variable);
      return false; // Cancel default actions
    } else {
      mouseDragged(); // Handle this directly
      return false; // Cancel default actions
    }


  // Check if we've clicked the frequency axis of the Bode magnitude plot:
  } else if(((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset) &&
           (((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height)))) {
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      quiz_clicked_bode_mag_xaxis(frequency);
      return false; // Cancel default actions
    }


  // Check if we've clicked the yaxis axis of the Bode magnitude plot:
  } else if(((mouseX-graph_bode_mag_x) > 0 && (mouseX-graph_bode_mag_x) <= graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset)){
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      quiz_clicked_bode_mag_yaxis(magnitude);
      return false; // Cancel default actions
    }


  // Check if we've clicked the Bode magnitude plot. Let's find out which graph we clicked:
  } else if(((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset)){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
    let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
    let perc_x = linked_x / graph_bode_mag_width;
    let perc_y = linked_y / graph_bode_mag_height;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    let queue_with_ghosts = [];
    let yes_close_enough_with_ghosts = false;
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_gain_array[math.round(linked_x)];
        let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,i,screen_y,linked_y]);
          if (!(bode_graphs[i].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y]);
          }
        }
      }
    }
    let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
    let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
    // Find the closest point from the graphs:
    let output;
    let distance = 10000;
    for(let h=0; h<queue.length; h++){
      if(queue[h][0] < distance){
        distance = queue[h][0];
        output = queue[h];
      }
    }
    if(yes_close_enough){
      clicked_on_bode_mag_graph_no=output[1];
      initial_mouseX = mouseX;
      initial_mouseY = mouseY;
      if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // If user clicked on TWO_REAL_POLES, let's find out if closest to T_2 or T_3:
        let T_2 = range_slider_variables[variable_position["T_2"]];
        let T_2_frequency = 1 / Math.abs(T_2);
        let T_2_x = (Math.log(T_2_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_frequency = 1 / Math.abs(T_3);
        let T_3_x = (Math.log(T_3_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_mag_x_offset - graph_bode_mag_x;
        if (Math.abs(T_2_x - x) < Math.abs(T_3_x - x)){
          clicked_on_time_variable="T_2";
        } else {
          clicked_on_time_variable="T_3";
        }
      } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // If user clicked on ONE_ZERO_TWO_POLES, let's find out if closest to T_8,T_6 or T_7:
        let T_8 = range_slider_variables[variable_position["T_8"]];
        let T_8_frequency = 1 / Math.abs(T_8);
        let T_8_x = (Math.log(T_8_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_frequency = 1 / Math.abs(T_6);
        let T_6_x = (Math.log(T_6_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_frequency = 1 / Math.abs(T_7);
        let T_7_x = (Math.log(T_7_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_mag_x_offset - graph_bode_mag_x;
        if ((Math.abs(T_8_x - x) <= Math.abs(T_6_x - x)) && (Math.abs(T_8_x - x) <= Math.abs(T_7_x - x))){
          clicked_on_time_variable="T_8";
        } else if ((Math.abs(T_6_x - x) <= Math.abs(T_7_x - x)) && (Math.abs(T_6_x - x) <= Math.abs(T_8_x - x))){
          clicked_on_time_variable="T_6";
        } else {
          clicked_on_time_variable="T_7";
        }
      } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_PID.formula){
        // If user clicked on PID, let's find out if closest to T_i or T_d:
        let T_i = range_slider_variables[variable_position["T_i"]];
        let T_i_frequency = 1 / Math.abs(T_i);
        let T_i_x = (Math.log(T_i_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_d = range_slider_variables[variable_position["T_d"]];
        let T_d_frequency = 1 / Math.abs(T_d);
        let T_d_x = (Math.log(T_d_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_mag_x_offset - graph_bode_mag_x;
        if (Math.abs(T_i_x - x) < Math.abs(T_d_x - x)){
          clicked_on_time_variable="T_i";
        } else {
          clicked_on_time_variable="T_d";
        }
      }
    }
    add_event("click_bode_magnitude,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_bode_mag_graph_no_with_ghosts = -1;
      if (yes_close_enough_with_ghosts){
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_bode_mag_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      quiz_clicked_bode_mag(clicked_on_bode_mag_graph_no_with_ghosts,frequency,magnitude,clicked_on_time_variable);
      return false; // Cancel default actions
    }
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  // Check if we're dragging the Nyquist diagram:
  } else if(((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && ((mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset)) &&
            ((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height)) {
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    add_event("click_nyquist");
    if (current_quiz!="none"){
      let origo_x = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let origo_y = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      let screen_x = graph_nyquist_x + origo_x + graph_nyquist_x_offset;
      let screen_y = graph_nyquist_y + origo_y + graph_nyquist_y_offset;
      let perc_x = (mouseX - graph_nyquist_x - graph_nyquist_x_offset) / graph_nyquist_width;
      let perc_y = (mouseY - graph_nyquist_y - graph_nyquist_y_offset) / graph_nyquist_height;
      let axis_x = min_nyquist_x + (max_nyquist_x - min_nyquist_x) * perc_x;
      let axis_y = max_nyquist_y + (min_nyquist_y - max_nyquist_y) * perc_y;
      let angle_rad = Math.atan(axis_x / axis_y);
      let angle=0;
      if (mouseY > screen_y){
        // The lower half plane: angles 0 at the right edge, 90 pointing downwards, and -180 to the left:
        angle = -(90 + angle_rad * 180 / Math.PI);
      } else {
        // The upper half plane: angles 360 at the right edge, 270 pointing upwards, and 180 to the left:
        angle = -(270 + angle_rad * 180 / Math.PI);
      }
      // Get the magnitude of the line from origo to the mouse:
      let magnitude = Math.sqrt(axis_x * axis_x + axis_y * axis_y);
      quiz_clicked_nyquist(magnitude,angle);
      return false; // Cancel default actions
    }
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  // Check if we've clicked the frequency axis of the Bode phase plot:
  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) >= graph_bode_phase_height) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < (graph_bode_phase_height + graph_bode_phase_axis_height))) {
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      quiz_clicked_bode_phase_xaxis(frequency);
      return false; // Cancel default actions
    }


  // Check if we've clicked the Bode phase plot yaxis, the phase:
  } else if(((mouseX-graph_bode_phase_x) > 0 && (mouseX-graph_bode_phase_x) <= graph_bode_mag_x_offset)&&
     ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height)) {
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_y = linked_y / graph_bode_phase_height;
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase_yaxis(phase);
      return false; // Cancel default actions
    }


  // Check if we've clicked the bode phase plot:
  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height)){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
    let perc_x = linked_x / graph_bode_phase_width;
    let perc_y = linked_y / graph_bode_phase_height;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
    let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
    let queue_with_ghosts = [];
    let yes_close_enough_with_ghosts = false;
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_phase_array[math.round(linked_x)];
        let screen_y = graph_bode_phase_y_offset + map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
        let distance = Math.abs(mouseY - graph_bode_phase_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,i,screen_y,linked_y]);
          if (!(bode_graphs[i].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y]);
          }
        }
      }
    }
    // Find the closest point from the graphs:
    let output;
    let distance = 10000;
    for(let h=0; h<queue.length; h++){
      if(queue[h][0] < distance){
        distance = queue[h][0];
        output = queue[h];
      }
    }
    if(yes_close_enough){
      clicked_on_bode_phase_graph_no=output[1];
      initial_mouseX = mouseX;
      initial_mouseY = mouseY;

      if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // If user clicked on TWO_REAL_POLES, let's find out if closest to T_2 or T_3:
        let T_2 = range_slider_variables[variable_position["T_2"]];
        let T_2_frequency = 1 / Math.abs(T_2);
        let T_2_x = (Math.log(T_2_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_frequency = 1 / Math.abs(T_3);
        let T_3_x = (Math.log(T_3_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_phase_x_offset - graph_bode_phase_x;
        if (Math.abs(T_2_x - x) < Math.abs(T_3_x - x)){
          clicked_on_time_variable="T_2";
        } else {
          clicked_on_time_variable="T_3";
        }
      } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // If user clicked on ONE_ZERO_TWO_POLES, let's find out if closest to T_8,T_6 or T_7:
        let T_8 = range_slider_variables[variable_position["T_8"]];
        let T_8_frequency = 1 / Math.abs(T_8);
        let T_8_x = (Math.log(T_8_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_frequency = 1 / Math.abs(T_6);
        let T_6_x = (Math.log(T_6_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_frequency = 1 / Math.abs(T_7);
        let T_7_x = (Math.log(T_7_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_phase_x_offset - graph_bode_phase_x;
        if ((Math.abs(T_8_x - x) <= Math.abs(T_6_x - x)) && (Math.abs(T_8_x - x) <= Math.abs(T_7_x - x))){
          clicked_on_time_variable="T_8";
        } else if ((Math.abs(T_6_x - x) <= Math.abs(T_7_x - x)) && (Math.abs(T_6_x - x) <= Math.abs(T_8_x - x))){
          clicked_on_time_variable="T_6";
        } else {
          clicked_on_time_variable="T_7";
        }
      } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_PID.formula){
        // If user clicked on TWO_REAL_POLES, let's find out if closest to T_i or T_d:
        let T_i = range_slider_variables[variable_position["T_i"]];
        let T_i_frequency = 1 / Math.abs(T_i);
        let T_i_x = (Math.log(T_i_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_d = range_slider_variables[variable_position["T_d"]];
        let T_d_frequency = 1 / Math.abs(T_d);
        let T_d_x = (Math.log(T_d_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_phase_x_offset - graph_bode_phase_x;
        if (Math.abs(T_i_x - x) < Math.abs(T_d_x - x)){
          clicked_on_time_variable="T_i";
        } else {
          clicked_on_time_variable="T_d";
        }
      }
    }
    add_event("click_bode_phase,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_bode_phase_graph_no_with_ghosts = -1;
      if (yes_close_enough_with_ghosts){
        // Find the closest point from the graphs:
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_bode_phase_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase(clicked_on_bode_phase_graph_no_with_ghosts,frequency,phase,clicked_on_time_variable);
      return false; // Cancel default actions
    }
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions
  }

  // Let the system handle this click. It didn't touch anything we handle.
  // For tablets, this is used to scroll the page vertically, for instance.
  return true;
}


function mouseReleased(){
  add_event("mouse_released");
  if (we_need_faster_calculations_right_now==true){
    // Let's stop using fast precision:
    we_need_faster_calculations_right_now=false;
    precision=DEFAULT_PRECISION;
    redraw_canvas_gain("all");
  }
  for(let v=0; v<bode_graphs.length; v++){
    if (bode_graphs[v].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      if ((bode_graphs[v].bode_phase_margin >= 53.0)&&(bode_graphs[v].bode_phase_margin <= 57.0)){
        task_done("phasemargin=55");
      }
      if ((bode_graphs[v].bode_gain_crossover_freq >= 2.8)&&(bode_graphs[v].bode_gain_crossover_freq <= 3.2)){
        task_done("gaincrossover=3");
      }
    }
    if (bode_graphs[v].bode_formula == GRAPH_TIME_DELAY.formula){
      let value_dB = bode_graphs[v].bode_gain_margin;
      let value = Math.pow(10.0, value_dB / 20.0);
      if ((value >= 1.91)&&(value <= 2.1)){
        task_done("L_gain_margin=2");
      }
    }
    if (bode_graphs[v].bode_formula == GRAPH_FOUR_POLES.formula){
      let value_dB = bode_graphs[v].bode_gain_margin;
      let value = Math.pow(10.0, value_dB / 20.0);
      if ((value >= 4.8)&&(value <= 5.2)&&(bode_graphs[v].bode_phase_crossover_freq>=1.9)&&(bode_graphs[v].bode_phase_crossover_freq<=2.1)){
        task_done("gainm=5_phasex=2");
      }
      if ((bode_graphs[v].bode_phase_margin>=42)&&(bode_graphs[v].bode_phase_margin<=48)){
        task_done("phasemargin=45");
      }
    }
  }

  // PID assignments:
  let K = range_slider_variables[variable_position["K"]];
  if (K>1.0) task_done("PID_(K>1)");
  let T_1 = range_slider_variables[variable_position["T_1"]];
  let T_i = range_slider_variables[variable_position["T_i"]];
  if (T_i > T_1) task_done("PID_(T_i)>(T_1)");
  let T_d = range_slider_variables[variable_position["T_d"]];
  if ((T_d==0) && (T_1 > 0.89) && (T_1<1.1)) task_done("PID_(Td=0,T_1=1)");
  let k_1 = range_slider_variables[variable_position["k_1"]];
  if ((k_1 > 0.5) && (k_1<0.7)) task_done("PID_(k_1)");
  if (T_d != 0) task_done("PID_(T_d!=0)");
  if ((K!=1.0)&&(T_i!=1.0)&&(T_d!=0)) task_done("PID_Load");

  let w = range_slider_variables[variable_position["w"]];
  let z = range_slider_variables[variable_position["z"]];
  let k_3 = range_slider_variables[variable_position["k_3"]];
  if ((k_3>=0.90)&&(k_3<=1.1)&&(w>=7.3)&&(w<=8.7)&&(z>=0.02)&&(z<=0.07)){
    task_done("w=8;z=0.05;k_3=1");
  } else if ((k_3>=0.6)&&(k_3<=0.8)&&(w>=1.88)&&(w<=2.15)&&(z>=0.66)&&(z<=0.75)){
    task_done("w=2;z=0.7;k3=0.7");
  }

  //"k4=0.75;T6=9.25;T7=0.5;T8=2":"Change the parameters so that the Bode plots follow the green lines.",//. (k4=0.75,T6=9.25,T7=0.5,T8=2)
  let k_4 = range_slider_variables[variable_position["k_4"]];
  let T_6 = range_slider_variables[variable_position["T_6"]];
  let T_7 = range_slider_variables[variable_position["T_7"]];
  let T_8 = range_slider_variables[variable_position["T_8"]];
  let max_T67 = Math.max(T_6,T_7);
  let min_T67 = Math.min(T_6,T_7);
  if ((k_4>=0.65)&&(k_4<=0.85)&&(min_T67>=0.33)&&(min_T67<=0.7)&&(max_T67>=8)&&(max_T67<=10)&&(T_8>=1.5)&&(T_8<=2.5)){
    task_done("k4=0.75;T6=9.25;T7=0.5;T8=2");
  }

  if (clicked_on_time_response_graph_no==0){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    if ((k_1 > 2.8) && (k_1 <= 2.99)){
      task_done("k1=2.9");
    }
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    let max_T = Math.max(T_2,T_3);
    let min_T = Math.min(T_2,T_3);
    if ((min_T >= 0.035) && (min_T <= 0.07)&&
        (max_T >= 4.0) && (max_T <= 5.8)){
      task_done("T2,T3=0.05_and_5");
    }
    let L = range_slider_variables[variable_position["L"]];
    if ((L>=2.93)&&(L<3.1)){
      task_done("L=3");
    }
  }

  if ((clicked_on_bode_mag_graph_no==0)||(clicked_on_bode_phase_graph_no==0)){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    if ((k_1 >= 0.55) && (k_1 <= 0.75) && (T_1 >= 1.82) && (T_1 <= 2.25)){
      task_done("T1_k1_bode");
    }
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    let max_T = Math.max(T_2,T_3);
    let min_T = Math.min(T_2,T_3);
    if ((min_T >= 0.035) && (min_T <= 0.07)&&
        (max_T >= 4.0) && (max_T <= 5.8)){
      task_done("T2,T3=0.05_and_5");
    }
    if ((min_T>=0.45)&&(min_T<=0.55)&&(max_T>=9.0)&&(max_T<=11.0)){
      task_done("T2=10;T3=0.5");
    }
    // See if two Nyquist diagrams are equal:
    let k_4 = range_slider_variables[variable_position["k_4"]];
    if ((k_4>=0.95)&&(k_4<=1.05)){
      // This is kind of difficult to check using ranges for T_6, T_7 and T_8.
      // Depending on T_8 (the zero), T_6 and T_7 can vary a lot.
      // So let's find a couple of angles in the Nyquist diagram, and 
      // check the distance between the lines.

      // Find the maximum amplitude in magnitude
      // for both Ghost...N.._Match this Nyquist and One_zero_two_poles.
      // This is not allowed to differ too much.
      let max_gain_user = Math.max(...bode_graphs[0].bode_gain_array);
      let max_gain_ghost = Math.max(...bode_graphs[1].bode_gain_array);
      if ((max_gain_ghost >= max_gain_user*0.92)&&(max_gain_ghost <= max_gain_user*1.07)){
        // Find the maximum amplitude in the s-plane real axis
        // for both Ghost...N.._Match this Nyquist and One_zero_two_poles.
        // This is not allowed to differ too much.
        let max_real_user=-100;
        for (let complex_no in bode_graphs[0].bode_complex_array){
          let this_re=bode_graphs[0].bode_complex_array[complex_no].re;
          if (this_re > max_real_user) max_real_user=this_re;
        }
        let max_real_ghost=-100;
        for (let complex_no in bode_graphs[1].bode_complex_array){
          let this_re=bode_graphs[1].bode_complex_array[complex_no].re;
          if (this_re > max_real_ghost) max_real_ghost=this_re;
        }
        if ((max_real_ghost >= max_real_user*0.92)&&(max_real_ghost <= max_real_user*1.07)){
          // Find the maximum amplitude in the s-plane imaginary axis
          // for both Ghost...N.._Match this Nyquist and One_zero_two_poles.
          // This is not allowed to differ too much.
          let max_imaginary_user=-100;
          let min_imaginary_user=100;
          for (let complex_no in bode_graphs[0].bode_complex_array){
            let this_im=bode_graphs[0].bode_complex_array[complex_no].im;
            if (this_im > max_imaginary_user) max_imaginary_user=this_im;
            if (this_im < min_imaginary_user) min_imaginary_user=this_im;
          }
          let max_imaginary_ghost=-100;
          let min_imaginary_ghost=100;
          for (let complex_no in bode_graphs[1].bode_complex_array){
            let this_im=bode_graphs[1].bode_complex_array[complex_no].im;
            if (this_im > max_imaginary_ghost) max_imaginary_ghost=this_im;
            if (this_im < min_imaginary_ghost) min_imaginary_ghost=this_im;
          }
          if ((max_imaginary_ghost >= max_imaginary_user*0.92)&&(max_imaginary_ghost <= max_imaginary_user*1.07)){
            if ((-min_imaginary_ghost >= -min_imaginary_user*0.92)&&(-min_imaginary_ghost <= -min_imaginary_user*1.07)){
              task_done("k4=1;T6=2.5;T7=1;T8=6");
            }
          }
        }
      }
    }
  }

  if (clicked_on_pole_zero_graph_no==0){
    let T_1 = range_slider_variables[variable_position["T_1"]];
    if ((T_1 >= 0.45) && (T_1 <= 0.55)){
      task_done("T1_pole=-2");
    }
    if (T_1 < 0){
      task_done("T1_unstable");
    }
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    let max_T = Math.max(T_2,T_3);
    let min_T = Math.min(T_2,T_3);
    if ((min_T >= 0.035) && (min_T <= 0.07)&&
        (max_T >= 4.0) && (max_T <= 5.8)){
      task_done("T2,T3=0.05_and_5");
    }
    let k_2 = range_slider_variables[variable_position["k_2"]];
    if ((k_2 >=0.49)&&(k_2<=0.51)){
      let T_2 = range_slider_variables[variable_position["T_2"]];
      let T_3 = range_slider_variables[variable_position["T_3"]];
      let min_T = Math.min(T_2,T_3);
      let max_T = Math.max(T_2,T_3);
      if ((min_T >= 0.55)&&(max_T<=1.65)&&((min_T+max_T)>=1.75)&&((min_T+max_T)<=2.3)){
        task_done("T2,T3=1;k2=0.5");
      }
    }
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    if ((w>=0.85)&&(w<=0.95)&&(z<=0.05)){
      task_done("w=0.9;z=0.0");
    }
    if ((w>=1.55)&&(w<=1.65)&&(z>=0.15)&&(z<=0.25)){
      task_done("w=1.6;z=0.2");
    }
    //"k4,T6,T7=1,T8=1.5_poles":"With k<sub>4</sub>=1, drag the poles and zeros in the <b>pole-zero map</b> so that the step response follows the blue line.",
    let k_4 = range_slider_variables[variable_position["k_4"]];
    let T_6 = range_slider_variables[variable_position["T_6"]];
    let T_7 = range_slider_variables[variable_position["T_7"]];
    let T_8 = range_slider_variables[variable_position["T_8"]];
    let min_T67 = Math.min(T_6,T_7);
    let max_T67 = Math.max(T_6,T_7);
    if ((k_4>0.95)&&(k_4<=1.05)&&(T_8>=-1.7)&&(T_8<=-1.35)&&(min_T67+max_T67>=1.7)&&(min_T67+max_T67<=2.3)){
      task_done("k4,T6,T7=1,T8=1.5_poles");
    }
  }

  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable="";
  clicked_on_pole_zero_graph_no = -1;
}


let direction_of_T_drag=0;
function drag_T_in_step_response (T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  if (direction_of_T_drag==0){
    // Figure our if T is positive or negative, and adjust the dragging direction:
    if (T_x >= 0) direction_of_T_drag=1;
    else direction_of_T_drag=-1;
  }
  T_x = T_x + direction_of_T_drag * mouseDiffX * 10.0;
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_T_in_Bode (T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  T_x = T_x * (1.0 - mouseDiffX*10.0);
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_k_in_step_response (k_to_change,mouseDiffY,y_range){
  let k = range_slider_variables[variable_position[k_to_change]];
  k = k - mouseDiffY * y_range;
  range_slider_variables[variable_position[k_to_change]] = k;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[k_to_change]).value = k.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[k_to_change]).value = k.toFixed(2);
}

function drag_k_in_Bode (k_to_change,mouseDiffY){
  let k = range_slider_variables[variable_position[k_to_change]];
  k = k * (1.0 - mouseDiffY*12.0);
  range_slider_variables[variable_position[k_to_change]] = k;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[k_to_change]).value = k.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[k_to_change]).value = k.toFixed(2);
}

function set_T_in_pz_map(T_to_change,real){
  range_slider_variables[variable_position[T_to_change]] = -1/real;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = -(1/real).toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = -(1/real).toFixed(2);

}


function redraw_canvas_gain_for_variables(vars){
  // Find out which graphs needs to be recalculated if any of the vars were changed:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      let need_to_recalculate=false;
      let formula = bode_graphs[i].bode_formula;
      for (let the_var in vars){
        if (formula.includes(vars[the_var])){
          need_to_recalculate = true;
          break;
        }
      }
      if (need_to_recalculate){
        redraw_canvas_gain(bode_graphs[i].bode_id);
      }
    }
  }
}

function mouseDragged (){
  if (mouseButton==RIGHT){
    if (questions_enabled){
      handle_questions();
    }
    return;
  }

  if (mouse_is_in_a_box(mouseX,mouseY) == true) return true; // Let system handle mouse after this, can be used for iPad scrolling:

  // Dragging one of the graphs in the step response:
  if (clicked_on_time_response_graph_no != -1){
    let i=clicked_on_time_response_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;
    let y_range = max_y_timerep - min_y_timerep;
    if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      drag_T_in_step_response("T_1",mouseDiffX);
      drag_k_in_step_response("k_1",mouseDiffY,y_range);
      let k_1 = range_slider_variables[variable_position["k_1"]];
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["k_1","T_1"]);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      drag_T_in_step_response(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      drag_k_in_step_response("k_2",mouseDiffY,y_range);
      let k_2 = range_slider_variables[variable_position["k_2"]];
      if (k_2>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_time_response");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T + mouseDiffX * 10.0;
      if (T < 0.001) T=0.001;
      w = 1/T;
      range_slider_variables[variable_position["w"]] = w;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);
      let z = range_slider_variables[variable_position["z"]];
      z = z + mouseDiffY * 1.7;
      if (z<0) z=0;
      if (z>1.2) z=1.2;
      range_slider_variables[variable_position["z"]] = z;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["z"]).value = z.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["z"]).value = z.toFixed(2);
      if (z <= 0.1){
        achievement_done("low_z");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TIME_DELAY.formula){
      achievement_done("change_L");
      let L = range_slider_variables[variable_position["L"]];
      L = L + mouseDiffX * 10.0;
      if (L < 0) L=0;
      range_slider_variables[variable_position["L"]] = L;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["L"]).value = L.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["L"]).value = L.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      if (direction_of_T_drag==0){
        // Figure our if T is positive or negative, and adjust the dragging direction:
        if (T_x >= 0) direction_of_T_drag=1;
        else direction_of_T_drag=-1;
      }
      T_x = T_x + direction_of_T_drag * mouseDiffX * 10.0;
      if ((variable_to_change == "T_6")||(variable_to_change == "T_7")){
        if (T_x<0) T_x = 0;
      }
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);

      drag_k_in_step_response("k_4",mouseDiffY,y_range);
      let k_4 = range_slider_variables[variable_position["k_4"]];
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      drag_T_in_step_response("T_5",mouseDiffX);
      drag_k_in_step_response("k_5",mouseDiffY,y_range);
      let k_5 = range_slider_variables[variable_position["k_5"]];
      if (k_5>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  // Dragging one of the graphs in the bode magnitude plot:
  } else if (clicked_on_bode_mag_graph_no != -1){
    let i=clicked_on_bode_mag_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

    if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_1",mouseDiffX);
      drag_k_in_Bode("k_1",mouseDiffY);
      let k_1 = range_slider_variables[variable_position["k_1"]];
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["k_1","T_1"]);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      drag_k_in_Bode("k_2",mouseDiffY);
      let k_2 = range_slider_variables[variable_position["k_2"]];
      if (k_2>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_bode_mag");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T * (1.0 - mouseDiffX*10.0);
      if (T < 0.0001) T=0.0001;
      w = 1/T;
      range_slider_variables[variable_position["w"]] = w;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);

      let z = range_slider_variables[variable_position["z"]];
      z = z + mouseDiffY * 1.7;
      if (z<0) z=0;
      if (z>1.2) z=1.2;
      range_slider_variables[variable_position["z"]] = z;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["z"]).value = z.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["z"]).value = z.toFixed(2);
      if (z <= 0.1){
        achievement_done("low_z");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_4",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      drag_k_in_Bode("k_4",mouseDiffY);
      let k_4 = range_slider_variables[variable_position["k_4"]];
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_5",mouseDiffX);
      drag_k_in_Bode("k_5",mouseDiffY);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_PID.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      drag_k_in_Bode("K",mouseDiffY);
      //redraw_canvas_gain(bode_graphs[i].bode_id);
      redraw_canvas_gain_for_variables(["K","T_i","T_d"]);

    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  // Dragging one of the graphs in the bode phase plot:
  } else if (clicked_on_bode_phase_graph_no != -1){
    let i=clicked_on_bode_phase_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

    if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_1",mouseDiffX);
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["T_1"]);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_bode_phase");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T * (1.0 - mouseDiffX*10.0);
      if (T < 0.0001) T=0.0001;
      w = 1/T;
      range_slider_variables[variable_position["w"]] = w;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_4",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_5",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_PID.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      //redraw_canvas_gain(bode_graphs[i].bode_id);
      redraw_canvas_gain_for_variables(["K","T_i","T_d"]);

    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  } else {
    // Check if we're dragging the Nyquist diagram:
    if((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && (mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset){
      if((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height){
        draw();
        draw_hover_nyquist();
      }
    }


    // Check if we've dragged in any of the pole-zero graphs:
    for(let i=0; i<bode_graphs.length; i++){
      if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
        if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
          if(bode_graphs[i].bode_displaybool){
            let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;

            if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
              achievement_done("drag_pole");
              set_T_in_pz_map("T_1",real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
              redraw_canvas_gain_for_variables(["T_1"]);

            } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
              achievement_done("drag_pole");
              // Change T_2 or T_3
              set_T_in_pz_map(clicked_on_time_variable,real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
              achievement_done("drag_pole");
              achievement_done("drag_complex_pole");
              // Change complex poles:
              if (real > 0) real=0;
              if (imaginary < 0) imaginary=-imaginary;
              bode_3_real = real;
              bode_3_imaginary = imaginary;
              // Update variable w  = "cutoff frequency"
              // w = length of vector (re,im)
              let w = Math.sqrt(real*real + imaginary*imaginary);
              range_slider_variables[variable_position["w"]] = w;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);
              // Update variable z "zeta" = "damping factor 0.0-1.0"
              // z = the angle from origo to the upper complex pole.
              // z = 0 when complex pole is on the imaginary axis
              // z = 1.0 when complex pole is on the real axis
              // z = 1.0 when complex pole is on the real axis
              // z = 0.880 when (-1,0.5)
              // z = 0.707 when (-1,1)
              // z = 0.446 when (-0.5,1)
              // ζ= - Re(pole) / Math.sqrt(Re(pole)^2 + Im(pole)^2)
              let z = -real / Math.sqrt(real*real + imaginary*imaginary);
              range_slider_variables[variable_position["z"]] = z;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["z"]).value = z.toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["z"]).value = z.toFixed(2);
              if (z <= 0.1){
                achievement_done("low_z");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
              achievement_done("drag_zero");
              set_T_in_pz_map("T_4",real);
              if (real>0){
                achievement_done("drag_zero_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
              // Change T_8, T_6 or T_7:
              let variable_to_change = clicked_on_time_variable;
              if (variable_to_change=="T_8"){
                achievement_done("drag_zero");
                if (real>0){
                  achievement_done("drag_zero_to_right_half_plane");
                }
              } else {
                achievement_done("drag_pole");
                const EPS = 0.06777777;
                if (real > EPS) real=EPS;
                if (real>0){
                  achievement_done("drag_pole_to_right_half_plane");
                }
              }
              set_T_in_pz_map(clicked_on_time_variable,real);
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
              achievement_done("drag_pole");
              const EPS = 0.0677777;
              if (real > EPS) real=EPS;
              set_T_in_pz_map("T_5",real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);
            }
          }
        }
      }
    }
  }
}


function handle_questions(){
  redraw();
  let queue = [];
  let yes_close_enough = false;

  for (let q_id in all_questions){
    let q_position = all_questions[q_id].pos();
    if (q_position.visible){
      let distance = Math.sqrt((mouseY - q_position.y)*(mouseY - q_position.y) + (mouseX - q_position.x)*(mouseX - q_position.x));
      if(distance < 500){
        yes_close_enough = true;
        queue.push([distance,q_id,q_position]);
        let stroke_weight = 10 - distance/50;
        if (stroke_weight>0.01){
          // Draw a yellow line to the closest questions:
          push();
          strokeWeight(stroke_weight);
          stroke("#ffff0080");
          line(mouseX,mouseY,q_position.x,q_position.y);
          pop();
        }
      }
    }
  }
  // Also, check distances to the questions related to tasks:
  for (let task_id in all_tasks){
    if (all_tasks[task_id].a!=null){ // Yes, there is an answer connected to this task:
      let span = document.getElementById('task_'+task_id);
      if (span!=null){
        let rect = span.getBoundingClientRect();
        let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
        let scroll_y = window.pageYOffset || document.documentElement.scrollTop;
        let x=scroll_x + rect.left + rect.width/2;
        let y=scroll_y + rect.top + rect.height/2;
        let distance = Math.sqrt((mouseY - y)*(mouseY - y) + (mouseX - x)*(mouseX - x));
        if(distance < 500){
          yes_close_enough = true;
          queue.push([distance,"task_"+task_id,{x:x,y:y}]);
          let stroke_weight = 10 - distance/50;
          if (stroke_weight>0.01){
            // Draw a yellow line to the closest questions:
            push();
            strokeWeight(stroke_weight);
            stroke("#ffff0080");
            line(mouseX,mouseY,x,y);
            pop();
          }
        }
      }
    }
  }
  let output;
  let distance = 10000;
  for(let h=0; h<queue.length; h++){
    if(queue[h][0] < distance){
      distance = queue[h][0];
      output = queue[h];
    }
  }
  if(yes_close_enough){
    //// Draw a grey box with the question text:
    //push();
    //noStroke();
    //translate(mouseX,mouseY);
    //fill(box_background_color,200);
    //stroke(150);
    //rect(0,0,375,40);
    //noStroke();
    //fill(text_color);
    //textSize(15);
    //text(all_questions[output[1]].q,13,25);
    //pop();
    let hover_answer = document.getElementById("hover_answer");
    let q_id=output[1];
    if (q_id!=last_hover_answer_id){
      add_event("ask_a_question="+q_id);
      hover_answer.style.transform=null;
      let s="";
      if (q_id.startsWith("task_")){ // This is an answer connected to a task:
        console.log(q_id.substr(5));
        s+=all_tasks[q_id.substr(5)].a;
      } else { // This is from all_questions dict:
        s+="<h2>" + all_questions[q_id].q + "</h2>";
        s+=all_questions[q_id].a;
      }
      hover_answer.innerHTML=s;
      last_hover_answer_id=q_id;
      let rect=hover_answer.getBoundingClientRect();
      if (rect.height > windowHeight){
        // Scale around center:
        hover_answer.style.transform="translate(-50%,-50%) scale(" + (windowHeight/(rect.height)) +") translate(50%,50%)";
      }
      if (q_id == "GRAPH_PID") task_done("pid_help_PID");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_YR") task_done("pid_help_YR");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_S") task_done("pid_help_S");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_YL") task_done("pid_help_YL");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_OPEN") task_done("pid_help_OPEN");
    }
    //Move this div:
    if (mouseX<windowWidth/2){
      // Place to the right of mouse pointer:
      hover_answer.style.left=mouseX+"px";
      hover_answer.style.right=null;
    } else {
      // Place to the left of mouse pointer:
      hover_answer.style.left=null;
      hover_answer.style.right=(windowWidth-mouseX)+"px";
    }

    let rect=hover_answer.getBoundingClientRect();
    let scroll_y = window.pageYOffset || document.documentElement.scrollTop
    if (rect.height > (windowHeight-10)){
      // Full height answer that was scaled at creation. Fixed position in y-dir:
      hover_answer.style.top="0px";
      hover_answer.style.bottom=null;
    } else if ((mouseY-scroll_y)<windowHeight/2){
      // Place above mouse pointer:
      // Check to make sure that a "high" infobox doesn't get too far down:
      if (rect.height + (mouseY-scroll_y) > windowHeight){
        // Stick to bottom of screen to prevent it going too far down:
        hover_answer.style.top=null;
        hover_answer.style.bottom="0px";
      } else {
        // Move with mouseY pos:
        hover_answer.style.top=(mouseY-scroll_y)+"px";
        hover_answer.style.bottom=null;
      }
    } else {
      // Place below mouse pointer:
//      if (rect.height + (windowHeight-mouseY) > windowHeight){
      if (rect.height + (windowHeight-(mouseY-scroll_y)) > windowHeight){
        // Stick to top of screen to prevent it going too far up:
        hover_answer.style.top="0px";
        hover_answer.style.bottom=null;
      } else {
        // Move with mouseY pos:
        hover_answer.style.top=null;
//        hover_answer.style.bottom=(windowHeight-mouseY)+"px";
        hover_answer.style.bottom=(windowHeight-mouseY+scroll_y)+"px";
      }
    }
    hover_answer.style.visibility=null;

    rect=hover_answer.getBoundingClientRect();
    // Draw a white line to the closest questions:
    let q_position=output[2];
    push();
    let stroke_weight = 10 - distance/50;
    strokeWeight(stroke_weight);
    //stroke("#ffff00c0");
    //line(q_position.x,q_position.y,rect.left,rect.top);
    //line(q_position.x,q_position.y,rect.right,rect.top);
    //line(q_position.x,q_position.y,rect.left,rect.bottom);
    //line(q_position.x,q_position.y,rect.right,rect.bottom);
    stroke("#ffffffff");
    line(mouseX,mouseY,q_position.x,q_position.y);
    pop();

  } else {
    if (last_hover_answer_id!=""){
      let hover_answer = document.getElementById("hover_answer");
      hover_answer.style.visibility="hidden";
      hover_answer.innerHTML="";
      last_hover_answer_id="";
    }
  }
  return;
}


function draw_hover_nyquist(){
  let origo_x = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let origo_y = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  push();
  stroke(text_color);
  strokeWeight(2);
  let screen_x = graph_nyquist_x + origo_x + graph_nyquist_x_offset;
  let screen_y = graph_nyquist_y + origo_y + graph_nyquist_y_offset;
  line(screen_x,screen_y,mouseX,mouseY);
  pop();
  // Let's calculate the angle we're at:
  // We need to map the mouseX and mouseY to real and imaginary axis:
  let perc_x = (mouseX - graph_nyquist_x - graph_nyquist_x_offset) / graph_nyquist_width;
  let perc_y = (mouseY - graph_nyquist_y - graph_nyquist_y_offset) / graph_nyquist_height;
  let axis_x = min_nyquist_x + (max_nyquist_x - min_nyquist_x) * perc_x;
  let axis_y = max_nyquist_y + (min_nyquist_y - max_nyquist_y) * perc_y;
  let angle_rad = Math.atan(axis_x / axis_y);
  let angle=0;
  if (mouseY > screen_y){
    // The lower half plane: angles 0 at the right edge, 90 pointing downwards, and -180 to the left:
    angle = -(90 + angle_rad * 180 / Math.PI);
  } else {
    // The upper half plane: angles 360 at the right edge, 270 pointing upwards, and 180 to the left:
    angle = -(270 + angle_rad * 180 / Math.PI);
  }
  // Paint an arc in the nyquist diagram over the unit circle:
  push();
  let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  stroke(angle_color);
  strokeWeight(2);
  noFill();
  arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
  pop();
  // Now paint a horizontal line on the Bode phase plot, at the right height:
  let linked_y = angle;
  if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
    screen_y = map(linked_y,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
    push();
    stroke(angle_color);
    strokeWeight(2);
    line(graph_bode_phase_x + graph_bode_mag_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_mag_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
    pop();
  }
  // We might show positive angles in the bode phase plot, so draw a line at positive angles as well:
  linked_y = angle + 360;
  if ((linked_y >= phase_lower_bound) && (linked_y <= phase_upper_bound)){
    screen_y = map(linked_y,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
    push();
    stroke(angle_color);
    strokeWeight(2);
    line(graph_bode_phase_x + graph_bode_mag_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_mag_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
    pop();
  }
  // Get the magnitude of the line from origo to the mouse:
  let magnitude = Math.sqrt(axis_x * axis_x + axis_y * axis_y);
  // Now paint a horizontal line on the Bode magnitude plot, at the right height:
  let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
  screen_y = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
  push();
  stroke(text_color);
  strokeWeight(2);
  line(graph_bode_mag_x + graph_bode_mag_x_offset,graph_bode_mag_y + screen_y + graph_bode_mag_y_offset,graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width,graph_bode_mag_y + screen_y + graph_bode_mag_y_offset);
  pop();
  if ((magnitude > 0.8) && (magnitude < 1.2) && (angle < -75) && (angle > -105)){
    achievement_done("hover_nyquist_-90");
  }
}

let last_hover_answer_id="";
let nof_redraws_in_math_bar=0;
function mouseMoved(){
  // If we are in the math-bar, no need to redraw.
  // Or, more correctly, if previous redraw was in the math-bar area, we don't need to redraw again:
  if ((mouseX > canvas_width)||(mouseY>canvas_height)){
    if (nof_redraws_in_math_bar < 1){
      redraw();
    }
    nof_redraws_in_math_bar += 1;
  } else {
    redraw();
    nof_redraws_in_math_bar = 0;
  }

  // If questions are enabled, draw a line to the closest question icon:
  if (questions_enabled){
    handle_questions();
    return;
  }


  // Check if we're hovering any of the pole-zero graphs:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if ((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
            let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
            noStroke();
            push();
            translate(mouseX,mouseY);
            fill(box_background_color,200);
            stroke(150);
            rect(0,0,80,40);
            noStroke();
            fill(text_color);
            textSize(15);
            text("Re=" + real.toFixed(2),13,15);
            text("Im=" + imaginary.toFixed(2),13,35);
            pop();
          }
        }
      }
    }
  }

  // Check if we're hovering the time axis of the step response graph:
  if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    (((mouseY-graph_step_response_y) >= graph_step_response_height + graph_step_response_y_offset) && ((mouseY-graph_step_response_y) <= graph_step_response_height + graph_step_response_y_offset + graph_step_response_timeaxis_height))){
    let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
    push();
    stroke("#808080");
    strokeWeight(2);
    line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
    pop();
    push();
    translate(mouseX,mouseY);
    fill(box_background_color,200);
    stroke(150);
    rect(0,0,200,90);
    noStroke();
    fill(text_color);
    textSize(15);
    text("time=" + time.toFixed(3) + "s",13,53);
    pop();
  }

  // Check if we're hovering the step response graph:
  let queue = [];
  let yes_close_enough = false;
  if((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset){
    if((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset){
      let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
      for(let h=0; h<bode_graphs.length; h++){
        if((bode_graphs[h].bode_displaybool)&&(bode_graphs[h].bode_display_timeresponse_bool)){
          let current_graph = bode_graphs[h];
          let linked_y = current_graph.bode_timerep_array[linked_x];
          let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
          let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
          if(distance < 70){
            yes_close_enough = true;
            queue.push([distance,h,linked_y,current_graph.graph_name]);
          }
        }
      }
      let output;
      let distance = 10000;
      for(let h=0; h<queue.length; h++){
        if(queue[h][0] < distance){
          distance = queue[h][0];
          output = queue[h];
        }
      }
      push();
      stroke("#808080");
      strokeWeight(2);
      line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
      pop();
      if(yes_close_enough){
        let linked_bode_graph = bode_graphs[output[1]];
        let linked_x = map(mouseX - graph_step_response_x - graph_step_response_x_offset,0,graph_step_response_width,0,max_x_timerep,true);
        let screen_y = map(output[2],min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        // Draw a white dot at the right edge of the time response graph
        fill(text_color);
        ellipse(graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,graph_step_response_y+screen_y+graph_step_response_y_offset,12,12);
        // Draw a corresponding white dot at the left edge of the bode magnitude graph
        let magnitude = Math.abs(output[2]);
        let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
        let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
        // Draw a corresponding white dot at the real axis of the Nyquist diagram
        let screen_x0 = map(output[2],min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2*magnitude,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2*magnitude,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if ((screen_x0>=0)&&(screen_x0<=graph_nyquist_width)){
          ellipse(graph_nyquist_x+graph_nyquist_x_offset+screen_x0,graph_nyquist_y+graph_nyquist_y_offset+screen_y0,12,12);
        }
        noStroke();
        fill(linked_bode_graph.bode_hue,360,360);
        ellipse(mouseX,screen_y + graph_step_response_y_offset + graph_step_response_y,12,12);
        push();
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,200,90);
        noStroke();
        fill(linked_bode_graph.bode_hue,360,360);
        ellipse(18,18,20,20);
        noStroke();
        fill(text_color);
        textSize(18);
//          text("Graph " + linked_bode_graph.bode_id,35,24);
        text(output[3],35,24);
        textSize(15);
        text("time=" + linked_x.toFixed(3) + "s",13,53);
        text("output=" + output[2].toFixed(3),13,77);
        pop();
      } else {
        let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
        let output=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
        let linked_y = Math.ceil((mouseY - graph_step_response_y)/precision);
        push();
        // Draw a white dot at the right edge of the time response graph
        fill(text_color);
        ellipse(graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,mouseY,12,12);
        // Draw a corresponding white dot at the left edge of the bode magnitude graph
        let magnitude = Math.abs(output);
        let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
        let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
        // Draw a corresponding white dot at the real axis of the Nyquist diagram
        let screen_x0 = map(output,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2*magnitude,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2*magnitude,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if ((screen_x0>=0)&&(screen_x0<=graph_nyquist_width)){
          ellipse(graph_nyquist_x+graph_nyquist_x_offset+screen_x0,graph_nyquist_y+graph_nyquist_y_offset+screen_y0,12,12);
        }
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,200,90);
        noStroke();
        fill(text_color);
        textSize(15);
        text("time=" + time.toFixed(3) + "s",13,53);
        text("output=" + output.toFixed(3),13,77);
        pop();
      }
    }
  }


  // Check if we're hovering the frequency axis of the Bode magnitude plot:
  if((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset){
    if(((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height))) {
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
        }
      }
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      push();
      strokeWeight(2);
      stroke("#808080");
      line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
      line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
      noStroke();
      translate(mouseX,mouseY);
      fill(box_background_color,200);
      stroke(150);
      rect(0,0,160,90);
      noStroke();
      fill(text_color);
      textSize(15);
      text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
      pop();
    }
  }

  // Check if we're hovering the bode magnitude yaxis, the magnitude:
  if((mouseX-graph_bode_mag_x) > 0 && (mouseX-graph_bode_mag_x) <= graph_bode_mag_x_offset){
    if((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset){
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      push();
      noStroke();
      translate(mouseX,mouseY);
      fill(box_background_color,200);
      stroke(150);
      rect(0,0,160,90);
      noStroke();
      fill(text_color);
      textSize(15);
      text("magnitude=" + magnitude.toFixed(3),13,53);
      pop();
      // Draw a magnitude circle in the Nyquist graph:
      push();
      let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      let screen_xw = map(2*magnitude,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_yw = map(-2*magnitude,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      stroke(text_color);
      strokeWeight(2);
      noFill();
      ellipse(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0);
      pop();
      // Draw a horizontal line for the magnitude in the bode mag plot:
      push();
      stroke(text_color);
      strokeWeight(2);
      line(graph_bode_mag_x+graph_bode_mag_x_offset,mouseY,graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width, mouseY);
      pop();
    }
  }

  // Check if we're hovering the bode magnitude plot:
  if((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset){
    if((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset){
      let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_x = linked_x / graph_bode_mag_width;
      let perc_y = linked_y / graph_bode_mag_height;
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      let queue = [];
      let yes_close_enough = false;
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
          let current_graph = bode_graphs[i];
          let linked_y = current_graph.bode_gain_array[linked_x];
          let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
          let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
          if(distance < 70){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y,current_graph.graph_name]);
          }
        }
      }
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      // perc_y = 1.0 -> magnitude = 0.001
      // perc_y = 0.0 -> magnitude = 1000
      // Find the closest point from the graphs:
      let output;
      let distance = 10000;
      for(let h=0; h<queue.length; h++){
        if(queue[h][0] < distance){
          distance = queue[h][0];
          output = queue[h];
        }
      }
      push();
      strokeWeight(2);
      stroke("#808080");
      line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
      line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
      pop();
      if(yes_close_enough){
        noStroke();
        push();
        fill(bode_graphs[output[1]].bode_hue,360,360);
        ellipse(mouseX,output[2] + graph_bode_mag_y,12,12);
        noStroke();
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,200,90);
        noStroke();
        fill(text_color);
        textSize(18);
//          text("Graph " + linked_bode_graph.bode_id,35,24);
        text(output[4],35,24);
        textSize(15);
//          text("time=" + linked_x.toFixed(3) + "s",13,53);
//          text("output=" + output[2].toFixed(3),13,77);
        text("freq=" + frequency.toFixed(3) + "rad/s",13,53);
        let magnitude_in_dB = output[3];
        let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
        text("magnitude=" + magnitude.toFixed(3),13,77);
        pop();
        // Draw a magnitude circle in the Nyquist graph:
        push();
        let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2*magnitude,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2*magnitude,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        stroke(text_color);
        strokeWeight(2);
        noFill();
        ellipse(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0);
        pop();
        // Draw a horizontal line for the magnitude in the bode mag plot:
        push();
        stroke(text_color);
        strokeWeight(2);
        line(graph_bode_mag_x+graph_bode_mag_x_offset,output[2] + graph_bode_mag_y,graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width, output[2] + graph_bode_mag_y);
        pop();
      } else {
        push();
        noStroke();
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,160,90);
        noStroke();
        fill(text_color);
        textSize(15);
        text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
        text("magnitude=" + magnitude.toFixed(3),13,53);
        pop();
        // Draw a magnitude circle in the Nyquist graph:
        push();
        let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2*magnitude,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2*magnitude,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        stroke(text_color);
        strokeWeight(2);
        noFill();
        ellipse(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0);
        pop();
        // Draw a horizontal line for the magnitude in the bode mag plot:
        push();
        stroke(text_color);
        strokeWeight(2);
        line(graph_bode_mag_x+graph_bode_mag_x_offset,mouseY,graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width, mouseY);
        pop();
      }
    }
  }


  // Check if we're hovering the Nyquist diagram:
  if((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && (mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset){
    if((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height){
      draw_hover_nyquist();
    }
  }


  // Check if we're hovering the frequency axis of the Bode phase plot:
  if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) >= graph_bode_phase_height) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < (graph_bode_phase_height + graph_bode_phase_axis_height))) {
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    let perc_x = linked_x / graph_bode_phase_width;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        if (bode_graphs[i].bode_display_nyquist_bool){
          bode_graphs[i].draw_nyquist_value(perc_x);
        }
      }
    }
    // And draw a vertical white line in the bode phase plot.
    // And draw a vertical line in the bode mag plot:
    push();
    strokeWeight(2);
    stroke("#808080");
    line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
    line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
    noStroke();
    translate(mouseX,mouseY);
    fill(box_background_color,200);
    stroke(150);
    rect(0,0,160,90);
    noStroke();
    fill(text_color);
    textSize(15);
    text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
    pop();
  }


  // Check if we're hovering the bode phase plot yaxis, the phase:
  if((mouseX-graph_bode_phase_x) > 0 && (mouseX-graph_bode_phase_x) <= graph_bode_mag_x_offset){
    if((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height){
      let linked_y2 = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_y = linked_y2 / graph_bode_phase_height;
      noStroke();
      push();
      translate(mouseX,mouseY);
      fill(box_background_color,200);
      stroke(150);
      rect(0,0,160,90);
      noStroke();
      fill(text_color);
      textSize(15);
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      text("phase=" + phase.toFixed(0) + "°",13,53);
      pop();
      // Paint an arc in the nyquist diagram over the unit circle:
      let angle = phase;
      push();
      let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      stroke(angle_color);
      strokeWeight(2);
      noFill();
      let screen_x2 = map(1.2*cos(angle/180*Math.PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y2 = map(1.2*sin(angle/180*Math.PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if (angle < 0){
        arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
      } else {
        arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
      }
      line(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,graph_nyquist_x + graph_nyquist_x_offset + screen_x2, graph_nyquist_y + graph_nyquist_y_offset + screen_y2);
      pop();
      // Now paint a horizontal line on the Bode phase plot, at the right height:
      let linked_y = phase;
      if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
        let screen_y = map(linked_y,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
        push();
        stroke(angle_color);
        strokeWeight(2);
        line(graph_bode_phase_x + graph_bode_phase_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_phase_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
        pop();
      }
    }
  }


  // Check if we're hovering the bode phase plot:
  if((mouseX-graph_bode_phase_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_mag_x_offset){
    if((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height){
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_mag_x_offset;
      let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      let perc_y = linked_y / graph_bode_phase_height;
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
      let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
      let queue = [];
      let yes_close_enough = false;
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
          let current_graph = bode_graphs[i];
          let linked_y = current_graph.bode_phase_array[linked_x];
          let screen_y = graph_bode_phase_y_offset + map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
          let distance = Math.abs(mouseY - graph_bode_phase_y - screen_y);
          if(distance < 70){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y,current_graph.graph_name]);
          }
        }
      }
      // Find the closest point from the graphs:
      let output;
      let distance = 10000;
      for(let h=0; h<queue.length; h++){
        if(queue[h][0] < distance){
          distance = queue[h][0];
          output = queue[h];
        }
      }
      // Find the phase where the mouse is.
      // perc_y=0  -> phase = highest phase
      // perc_y=1.0  -> phase = lowest phase
      if(yes_close_enough){
        noStroke();
        push();
        fill(bode_graphs[output[1]].bode_hue,360,360);
        ellipse(mouseX,output[2] + graph_bode_phase_y,12,12);
        noStroke();
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,200,90);
        noStroke();
        fill(bode_graphs[output[1]].bode_hue,360,360);
        ellipse(18,18,20,20);
        noStroke();
        fill(text_color);
        textSize(18);
//          text("Graph " + linked_bode_graph.bode_id,35,24);
        text(output[4],35,24);
        textSize(15);
//          text("time=" + linked_x.toFixed(3) + "s",13,53);
//          text("output=" + output[2].toFixed(3),13,77);
        text("freq=" + frequency.toFixed(3) + "rad/s",13,53);
        let phase = output[3] * 180/Math.PI;
        text("phase=" + phase.toFixed(1) + "°",13,77);
        pop();
        let angle = phase;
        let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (bode_graphs[output[1]].bode_display_nyquist_bool){
          // Paint an arc in the nyquist diagram over the unit circle:
          push();
          stroke(angle_color);
          strokeWeight(2);
          noFill();
          if (angle < 0){
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
          } else {
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
          }
          pop();
        }
        // Now paint a horizontal line on the Bode phase plot, at the right height:
        let linked_y = phase;
        if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
          let screen_y = map(linked_y,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
          push();
          stroke(angle_color);
          strokeWeight(2);
          line(graph_bode_phase_x + graph_bode_phase_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_phase_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
          pop();
        }
        // And paint a white line from origo to the hovered color:
        let hovered_graph_no = output[1];
        let point = bode_graphs[hovered_graph_no].get_nyquist_value(perc_x);
        let screen_x1 = point[0];
        let screen_y1 = point[1];
        screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (bode_graphs[output[1]].bode_display_nyquist_bool){
          push();
          stroke(text_color);
          strokeWeight(2);
          translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
          line(screen_x0,screen_y0,screen_x1,screen_y1);
          pop();
        }
        // And draw a vertical white line in the bode phase plot.
        // And draw a vertical line ending up at the hovered graph:
        push();
        strokeWeight(2);
        stroke("#808080");
        line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
        stroke(text_color);
        let current_graph = bode_graphs[hovered_graph_no];
        let linked_y8 = current_graph.bode_gain_array[linked_x];
        let screen_y = graph_bode_mag_y_offset + map(linked_y8,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        if (screen_y < graph_bode_mag_height + graph_bode_mag_y_offset){ // Only draw this line inside the Bode mag plot
          push();
          noStroke();
          fill(bode_graphs[output[1]].bode_hue,360,360);
          ellipse(mouseX,screen_y + graph_bode_mag_y,12,12);
          pop();
          line(mouseX,graph_bode_mag_y+screen_y,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
        }
        pop();
      } else {
        push();
        strokeWeight(2);
        stroke("#808080");
        line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
        line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
        pop();
        noStroke();
        push();
        translate(mouseX,mouseY);
        fill(box_background_color,200);
        stroke(150);
        rect(0,0,160,90);
        noStroke();
        fill(text_color);
        textSize(15);
        let phase = phase_upper_bound - 45*phase_case_number*perc_y;
        text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
        text("phase=" + phase.toFixed(0) + "°",13,53);
        pop();
        // Paint an arc in the nyquist diagram over the unit circle:
        let angle = phase;
        push();
        let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        stroke(angle_color);
        strokeWeight(2);
        noFill();
        let screen_x2 = map(1.2*cos(angle/180*Math.PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y2 = map(1.2*sin(angle/180*Math.PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (angle < 0){
          arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
        } else {
          arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
        }
        line(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,graph_nyquist_x + graph_nyquist_x_offset + screen_x2, graph_nyquist_y + graph_nyquist_y_offset + screen_y2);
        pop();
        // Now paint a horizontal line on the Bode phase plot, at the right height:
        let linked_y = phase;
        if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
          let screen_y = map(linked_y,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
          push();
          stroke(angle_color);
          strokeWeight(2);
          line(graph_bode_phase_x + graph_bode_phase_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_phase_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
          pop();
        }
      }
    }
  }
}


let screenshot_number = 0;
function capture_screen(){
  saveCanvas(canvas,"Pexperiment_screenshot_" + screenshot_number.toString(),'png');
  screenshot_number++;
}


function draw_loglines(x_case,y_case,type){
  stroke(line_color);
  let sum = (1 - Math.pow(1/rate,9))/(1 - 1/rate);
  let step_x = (graph_bode_mag_width/x_case)/sum;
  for(let x=0; x<x_case; x++){
    let pas = graph_bode_mag_width*x/x_case;
    for(let i=0; i<=9; i++){
      if(i == 0){
        strokeWeight(2);
      } else {
        strokeWeight(1);
      }
      line(pas,0,pas,graph_bode_mag_height);
      pas += step_x/Math.pow(rate,i);
    }
  }
}

function draw_timelines(){
  min_y_timerep = Math.floor(min_y_timerep*1) / 1;
  max_y_timerep = Math.ceil(max_y_timerep*1) / 1;
  let x_step = +(Math.abs(max_x_timerep)/10).toPrecision(1);
  let y_step = +(Math.abs(max_y_timerep - min_y_timerep)/10).toPrecision(1);
  max_y_timerep = +(get_bestMultiple(max_y_timerep, y_step, "upper") + y_step).toFixed(2);
  min_y_timerep = +(get_bestMultiple(min_y_timerep, y_step, "lower")).toFixed(2);
  // Since max_y and min_y might have changed - recalculate this:
  y_step = +(Math.abs(max_y_timerep - min_y_timerep)/10).toPrecision(1);
  let x_case_number = Math.ceil(max_x_timerep/x_step);
  let y_case_number = Math.ceil(Math.abs(max_y_timerep - min_y_timerep)/y_step);
  // Since max_y and min_y might have changed - recalculate this:
  y_step = Math.abs(max_y_timerep - min_y_timerep)/y_case_number;
  let x_tile_length = graph_step_response_width/x_case_number;
  let y_tile_length = graph_step_response_height/y_case_number;
  textAlign(CENTER);
  for(let x=0; x<=x_case_number; x++){
    stroke(line_color);
    if (x==0){
      strokeWeight(3);
    } else {
      strokeWeight(1);
    }
    line(x*x_tile_length,0,x*x_tile_length,graph_step_response_height);
    let text_value = x_step*x;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(0),x*x_tile_length,graph_step_response_height + 25);
  }
  for(let y=0; y<=y_case_number; y++){
    stroke(line_color);
    strokeWeight(1);
    line(0,y*y_tile_length,graph_step_response_width,y*y_tile_length);
    let text_value = max_y_timerep - y_step*y;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(2),-30,y*y_tile_length+5);
  }
  // Draw a thicker line at y=0:
  let screen_y = map(0,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
  stroke(line_color);
  strokeWeight(3);
  line(0,screen_y,graph_step_response_width,screen_y);
}


function draw_nyquist_lines(){
  let x_step = +(Math.abs(max_nyquist_x - min_nyquist_x)/10).toPrecision(1);
  let y_step = +(Math.abs(max_nyquist_y - min_nyquist_y)/10).toPrecision(1);
  min_nyquist_y = +(value_magnet(min_nyquist_y,y_step) - y_step).toFixed(2);
  max_nyquist_y = +(value_magnet(max_nyquist_y,y_step) + y_step).toFixed(2);
  min_nyquist_x = +(value_magnet(min_nyquist_x,x_step) - x_step).toFixed(2);
  max_nyquist_x = +(value_magnet(max_nyquist_x,x_step) + x_step).toFixed(2);
  let x_case_number = roundup_decimal(Math.abs(max_nyquist_x - min_nyquist_x)/x_step);
  let y_case_number = roundup_decimal(Math.abs(max_nyquist_y - min_nyquist_y)/y_step);
  let x_tile_length = graph_nyquist_width/x_case_number;
  let y_tile_length = graph_nyquist_height/y_case_number;
  textAlign(CENTER);
  for(let x=0; x<=x_case_number; x++){
    stroke(line_color);
    strokeWeight(1);
    line(x*x_tile_length,0,x*x_tile_length,graph_nyquist_height);
    let text_value = +min_nyquist_x + x*x_step;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(1),x*x_tile_length,graph_nyquist_height + 25);
  }
  for(let y=0; y<=y_case_number; y++){
    stroke(line_color);
    strokeWeight(1);
    line(0,y*y_tile_length,graph_nyquist_width,y*y_tile_length);
    let text_value = +max_nyquist_y - y*y_step;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(1),-30,y*y_tile_length+4);
  }
  // Thicker line at real=0, and im=0:
  stroke(line_color);
  strokeWeight(3);
  let screen_x = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  line(screen_x,0,screen_x,graph_nyquist_height);
  line(0,screen_y,graph_nyquist_width,screen_y);
}


function x_axis_steps_text(){
  let screen_step = graph_bode_mag_width / x_case_gain;
  for(let h=0; h<=x_case_gain; h++){
    textPowerOfTen(min_10power + h,h * screen_step,-25);
    textPowerOfTen(min_10power + h,h * screen_step,graph_bode_mag_height+80 -25);
  }
}


class bode_graph{
  constructor(a,b){
    this.bode_id = a;
    this.bode_formula = b;
    this.bode_complex_array = [];
    this.bode_gain_array = [];
    this.bode_phase_array = [];
    this.bode_timerep_array = [];
    this.bode_max_phase = -10000;
    this.bode_min_phase = 10000;
    this.bode_max_timerep = -10000;
    this.bode_min_timerep = 10000;
    this.bode_hue = color_table[a % color_table.length];
    this.bode_displaybool = true;
    this.bode_display_bodemag_bool = true;
    this.bode_display_bodephase_bool = true;
    this.bode_display_timeresponse_bool = true;
    this.bode_display_nyquist_bool = true;
    this.bode_display_information_bool = true;
    this.bode_display_equation_bool = true;
    this.bode_min_nyquist_x = 10000;
    this.bode_max_nyquist_x = -10000;
    this.bode_min_nyquist_y = 10000;
    this.bode_max_nyquist_y = -10000;
    this.bode_gain_margin = 0;
    this.bode_phase_margin = 0;
    this.bode_gain_crossover_freq = 0;
    this.bode_phase_crossover_freq = 0;
    this.graph_name = "Graph";
    this.full_name = "";
  }

  get_complex_p5(){
    //Reset Values
    if(replaceLetterByValue(this.bode_formula)){
      this.bode_max_phase = -10000;
      this.bode_min_phase = 10000;
      this.bode_min_nyquist_x = 10000;
      this.bode_max_nyquist_x = -10000;
      this.bode_min_nyquist_y = 10000;
      this.bode_max_nyquist_y = -10000;
      this.bode_phase_array = [];
      this.bode_gain_array = [];
      this.bode_complex_array = [];

      let phase_bias = 0;
      buffer_formula = buffer_formula.replace('⋅','');
      for(let x=0; x<graph_bode_mag_width; x++){
        let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
        let math_x = Math.pow(10,log_pow);
        let bode_value = getComplexValues(math_x);
        if(bode_value.re > this.bode_max_nyquist_x){
          this.bode_max_nyquist_x = bode_value.re;
        }
        if(bode_value.re < this.bode_min_nyquist_x){
          this.bode_min_nyquist_x = bode_value.re;
        }
        if(bode_value.im > this.bode_max_nyquist_y){
          this.bode_max_nyquist_y = bode_value.im;
        }
        if(bode_value.im < this.bode_min_nyquist_y){
          this.bode_min_nyquist_y = bode_value.im;
        }
        this.bode_complex_array.push(bode_value);
        bode_value = bode_value.toPolar();

        let bode_gain = 20*Math.log(bode_value.r)/Math.log(10);
        let bode_phase = bode_value.phi;
        bode_phase += phase_bias;

        // Compensate the phase when it has crossed the 2*PI wrap-around:
        if(x>=1 && (Math.abs(bode_phase - this.bode_phase_array[x-1]) > 0.1*2*Math.PI)) {
          let sign = Math.sign(this.bode_phase_array[x-1]);
          phase_bias = sign * Math.PI * 2;
          bode_phase += phase_bias;
        }

        this.bode_gain_array.push(bode_gain);
        this.bode_phase_array.push(bode_phase);

        if(bode_phase > this.bode_max_phase){
          this.bode_max_phase = bode_phase;
        }
        if(bode_phase < this.bode_min_phase){
          this.bode_min_phase = bode_phase;
        }
      }
    }
    let omegaZero = findOmegaZero(this.bode_phase_array);
    let omega180 = findOmega180(this.bode_phase_array);
    this.bode_gain_margin = omega180[0];
    this.bode_phase_margin = omegaZero[0];
    this.bode_gain_crossover_freq = omegaZero[1];
    this.bode_phase_crossover_freq = omega180[1];
  }


  get_timevalues_p5(){
    let formula_to_use = this.bode_formula;

    // Some formulas will never be displayed in the time response window, so just don't waste time calculating them:
    if (formula_to_use==GRAPH_PID.formula) return;
    if (formula_to_use==GRAPH_ONE_POLE_WITH_PID_S.formula) return;
    if (formula_to_use==GRAPH_ONE_POLE_WITH_PID_OPEN.formula) return;

    // Take care of "known good" formulas that we know an exact answer to:
    let have_a_solution = false;
    if (this.bode_formula == GRAPH_ONE_REAL_POLE.formula){ //  "k_1/(T_1*s+1)"
      let k_1 = range_slider_variables[variable_position["k_1"]];
      let T_1 = range_slider_variables[variable_position["T_1"]];
      if (input_formula=="1/s"){       // Unit Step response
        // Step input response for
        //     w_0              1
        //   -------  =      -----------
        //   s + w_0          s/w_0 + 1
        // v_out(t) = V_i * (1 - e^{-\omega_{0}*t})}
//        if (T_1 >= 0){
        have_a_solution = true;
        this.bode_timerep_array = []
        for(let x=0; x<graph_step_response_width; x+=precision){
          let t = map(x,0,graph_step_response_width,0,max_x_timerep);
          let math_y = k_1 * (1.0 - Math.exp(-t / T_1));
          this.bode_timerep_array.push(math_y);
        }
        if (T_1 >= 0){
          if (k_1 > 0){
            this.bode_max_timerep = k_1;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_1;
          }
        } else {
          if (k_1 > 0){
            this.bode_max_timerep = 0;
            this.bode_min_timerep = -k_1;
          } else {
            this.bode_max_timerep = -k_1;
            this.bode_min_timerep = 0;
          }
        }
      } else if (input_formula=="1"){      // Dirac Impulse response:
        have_a_solution = true;
        this.bode_timerep_array = []
        if (T_1 >= 0){
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            let math_y = k_1 * Math.exp(-t / T_1);
            this.bode_timerep_array.push(math_y);
          }
          if (k_1 > 0){
            this.bode_max_timerep = k_1;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_1;
          }
        } else {
          // Negative T:
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            let math_y = -k_1/T_1 * Math.exp(-t / T_1);
            this.bode_timerep_array.push(math_y);
          }
          if (k_1 > 0){
            this.bode_max_timerep = 20;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = -20;
          }
        }
      }

    } else if (this.bode_formula == GRAPH_TWO_REAL_POLES.formula){ // "k_2/(T_2s+1)*1/(T_3s+1)"
      let k_2 = range_slider_variables[variable_position["k_2"]];
      let T_2 = range_slider_variables[variable_position["T_2"]];
      let T_3 = range_slider_variables[variable_position["T_3"]];
      if (input_formula=="1/s"){       // Unit Step response
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
        // This solution cannot be calculated when T_2==T_3, so let's just move them a little bit apart:
        if (T_2==T_3) T_2+=0.001;
        if (T_2==0) T_2=0.0000001;
        if (T_3==0) T_3=0.0000001;
        let a = 1/T_2;
        let b = 1/T_3;
        have_a_solution = true;
        this.bode_timerep_array = []
        for(let x=0; x<graph_step_response_width; x+=precision){
          let t = map(x,0,graph_step_response_width,0,max_x_timerep);
          let math_y = k_2*(1-(b*Math.exp(-a*t) - a*Math.exp(-b*t))/(b-a));
          this.bode_timerep_array.push(math_y);
        }
        if (((T_2 >= 0) && (T_3 >= 0))||((T_2 <= 0) && (T_3 <= 0))){
          // Stable poles or two unstable poles:
          if (k_2 > 0){
            this.bode_max_timerep = k_2;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_2;
          }
        } else {
          // One unstable pole.
          if (k_2 > 0){
            this.bode_max_timerep = 0;
            this.bode_min_timerep = -k_2;
          } else {
            this.bode_max_timerep = -k_2;
            this.bode_min_timerep = 0;
          }
        }
      } else if (input_formula=="1"){      // Dirac Impulse response:
        have_a_solution = true;
        this.bode_timerep_array = []
        for(let x=0; x<graph_step_response_width; x+=precision){
          let t = map(x,0,graph_step_response_width,0,max_x_timerep);
          let math_y = k_2/T_2/T_3 * (Math.exp(-t / T_2) - Math.exp(-t / T_3)) / (1/T_3 - 1/T_2);
          if (T_2 == 0){
            math_y = k_2 * Math.exp(-t / T_3);
          } else if (T_3 == 0){
            math_y = k_2 * Math.exp(-t / T_2);
          }
          this.bode_timerep_array.push(math_y);
        }
        if (((T_2 >= 0) && (T_3 >= 0))||((T_2 <= 0) && (T_3 <= 0))){
          // Stable poles or two unstable poles:
          if (k_2 > 0){
            this.bode_max_timerep = k_2;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_2;
          }
        } else {
          if (k_2 > 0){
            this.bode_max_timerep = 0;
            this.bode_min_timerep = -k_2;
          } else {
            this.bode_max_timerep = -k_2;
            this.bode_min_timerep = 0;
          }
        }
      }

    } else if (this.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){ // "k_3*w^2/(s^2+2*z*w*s+w^2)"
      let k_3 = range_slider_variables[variable_position["k_3"]];
      let z = range_slider_variables[variable_position["z"]];
      let w = range_slider_variables[variable_position["w"]];
      if (input_formula=="1/s"){       // Unit Step response
        // Step input response for
        //   H(s) = 1 / (s^2 + +2ζωs + w^2)
        // is
        //   h(t) = 1/(w*Math.sqrt(1-ζ^2)) * exp(-ζwt) * sin(w*Math.sqrt(1-*ζ^2)*t)
        if ((z < 1.0) && (z >= 0)){
          // When z > 1, we don't have an oscillating system. We have two real poles, which isn't handled here.
          // This handles two complex conjugated poles with a damped response:
          have_a_solution = true;
          this.bode_timerep_array = []
          this.bode_max_timerep = -100000;
          this.bode_min_timerep = 100000;
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            // Calculate time-step response
            //console.log("z=" + z);
            //console.log("w=" + w);
            //console.log("k_3=" + k_3);
            let exponentTerm = Math.exp(-z*w*t);
            let sinTerm = Math.sin(w * Math.sqrt(1.0-z*z) * t + Math.acos(z));  // acos = inverse cosine (in radians)
            let math_y = k_3 * (1.0 - (1.0 / (Math.sqrt(1.0-z*z)) * exponentTerm * sinTerm));
            if(math_y > this.bode_max_timerep){
              this.bode_max_timerep = math_y;
            }
            if(math_y < this.bode_min_timerep){
              this.bode_min_timerep = math_y;
            }
            this.bode_timerep_array.push(math_y);
          }
        }
      } else if (input_formula=="1"){      // Dirac Impulse response:
        if ((z < 1.0) && (z >= 0)){
          // When z > 1, we don't have an oscillating system. We have two real poles, which isn't handled here.
          // This handles two complex conjugated poles with a damped response:
          // https://lpsa.swarthmore.edu/LaplaceZTable/LaplaceZFuncTable.html
          // "Prototype 2nd order lowpass impulse response":
          have_a_solution = true;
          this.bode_timerep_array = []
          this.bode_max_timerep = -100000;
          this.bode_min_timerep = 100000;
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            // Calculate time-step response
            let math_y;
            let exponentTerm = Math.exp(-z*w*t);
            let sinTerm = sin(w * Math.sqrt(1.0-z*z) * t);
            math_y = k_3*w/(Math.sqrt(1-z*z)) * exponentTerm * sinTerm;
            if(math_y > this.bode_max_timerep){
              this.bode_max_timerep = math_y;
            }
            if(math_y < this.bode_min_timerep){
              this.bode_min_timerep = math_y;
            }
            this.bode_timerep_array.push(math_y);
          }
        }
      }
    }


    if (have_a_solution == false){
      // We could not calculate an exact value, let's use
      // Inverse Laplace approximation by Gaver-Stehfest.
      // Will not be an exact solution for complex poles.
      // https://dl.acm.org/doi/10.1145/361953.361969.
      // https://mpmath.org/doc/current/calculus/inverselaplace.html
      // https://inverselaplace.org/

      let time_delay = 0.0;
      if (formula_to_use.includes("*e^(-L*s)"))
      {
        // Remove the time from the formula, and add the time delay afterwards
        formula_to_use = formula_to_use.substr(0,formula_to_use.length-9);
        time_delay = range_slider_variables[variable_position["L"]];
        if (time_delay < 0.0) time_delay = 0.0;
      }
      // This is how the time delay formula looks "after manual edit":
      if (formula_to_use.includes("e^(-Ls)"))
      {
        // Remove the time from the formula, and add the time delay afterwards
        formula_to_use = formula_to_use.substr(0,formula_to_use.length-7);
        time_delay = range_slider_variables[variable_position["L"]];
        if (time_delay < 0.0) time_delay = 0.0;
      }
      //console.log("Calculate:" + formula_to_use + " with time delay " + time_delay);

      if(replaceLetterByValue(formula_to_use)){
        this.bode_max_timerep = -100000;
        this.bode_min_timerep = 100000;
        this.bode_timerep_array = []
        for(let x=0; x<graph_step_response_width; x+=precision){
          let math_x = map(x,0,graph_step_response_width,0,max_x_timerep);
          let math_y;
          if(x != 0){
            math_y = getTimeValues(math_x,time_delay);
          }
          else{
            math_y = getTimeValues(0.00001,time_delay);
          }
          if(math_y > this.bode_max_timerep){
            this.bode_max_timerep = math_y;
          }
          if(math_y < this.bode_min_timerep){
            this.bode_min_timerep = math_y;
          }
          this.bode_timerep_array.push(math_y);
        }
      }
    }
  }


  draw_gain(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    beginShape();
    for(let x=0; x<graph_bode_mag_width; x++){
      let screen_y = map(this.bode_gain_array[x],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
      if(screen_y < graph_bode_mag_height && screen_y > 0){
        vertex(x,screen_y);
      }
    }
    endShape();
  }


  draw_phase(stop_on_overflow=false){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
    let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
    beginShape();
    for(let x=0; x<graph_bode_phase_width; x++){
      let screen_y = map(this.bode_phase_array[x],rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
      if(screen_y < graph_bode_phase_height && screen_y > 0){
        vertex(x,screen_y);
      } else {
        if (stop_on_overflow == true){
          // Stop drawing phase if it goes off graph. Removes garbage at end of GRAPH_TIME_DELAY:
          break;
        }
      }
    }
    endShape();
  }


  draw_timeresponse(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    beginShape();
    // We might have changed the precision for new calculations, but this graph still has old values.
    // So get the precision for this graph alone:
    let this_precision = graph_step_response_width / this.bode_timerep_array.length;
    for(let x=0; x<this.bode_timerep_array.length; x++){
      let screen_y = map(this.bode_timerep_array[x],min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
      vertex(x*this_precision,screen_y);
    }
    endShape();
  }

  draw_T_in_Nyquist(T_to_draw,pole_zero="pole"){
    let T = range_slider_variables[variable_position[T_to_draw]];
    if (T != 0){
      let frequency = 1 / T;
      if (pole_zero=="pole"){
        this.draw_nyquist_X(frequency);
      } else {
        this.draw_nyquist_O(frequency);
      }
    }
  }

  draw_nyquist_response(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    let new_complex_array = this.bode_complex_array;
    beginShape();
    for(let x=0; x<new_complex_array.length; x++){
      let current_complex = this.bode_complex_array[x];
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x > 0) &&
          (screen_x <= graph_nyquist_width) &&
          (screen_y > 0) &&
          (screen_y <= graph_nyquist_height)){
        vertex(screen_x,screen_y);
      } else {
        endShape();
        beginShape();
      }
    }
    endShape();
    // Draw a red X for T_1 in the Nyquist diagram:
    if(this.bode_displaybool){
      if(this.bode_formula == GRAPH_ONE_REAL_POLE.formula){
        this.draw_T_in_Nyquist("T_1");

      } else if(this.bode_formula == GRAPH_TWO_REAL_POLES.formula){
        this.draw_T_in_Nyquist("T_2");
        this.draw_T_in_Nyquist("T_3");

      } else if(this.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
        // Draw a X for w in the Nyquist diagram:
        let w = range_slider_variables[variable_position["w"]];
        let z = range_slider_variables[variable_position["z"]];
        if (z <= 1){
          // One single frequency, so only one X in the graph:
          if (w != 0){
            let frequency = w;
            this.draw_nyquist_X(frequency);
          }
        } else {
          //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
          // We should draw 2 X in this graph:
          let bode_3_real_1 = z*w + w * Math.sqrt(z*z-1);
          let bode_3_real_2 = z*w - w * Math.sqrt(z*z-1);
          w = bode_3_real_1;
          if (w != 0){
            let frequency = w;
            this.draw_nyquist_X(frequency);
          }
          w = bode_3_real_2;
          if (w != 0){
            let frequency = w;
            this.draw_nyquist_X(frequency);
          }
        }
      } else if(this.bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        this.draw_T_in_Nyquist("T_8","zero");
        this.draw_T_in_Nyquist("T_6");
        this.draw_T_in_Nyquist("T_7");
      }
    }
  }

  draw_nyquist_X(frequency){
    //let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = Math.pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);
    let screen_x1 = (Math.log(Math.abs(frequency))/Math.log(10) + 2) * graph_bode_mag_width/5;
    //console.log("frequency="+frequency);
    //console.log("screen_x1="+screen_x1);
    let sample_no = Math.round(screen_x1);
//    let sample_no = Math.floor(new_complex_array.length * percentage);

    // This may fail, if the frequency is "outside" of the calculated frequencies.
    // So let's add a safety measure:
    if ((sample_no >= 0)&&(sample_no <new_complex_array.length)){
      let current_complex = new_complex_array[sample_no];
  //    console.log("current_complex="+current_complex);
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
        try {
          push();
      //    translate(graph_nyquist_x_offset+graph_nyquist_x,45+graph_nyquist_y);
          //console.log("screen_x="+screen_x);
          //console.log("screen_y="+screen_y);
          stroke(this.bode_hue,240,360);
          strokeWeight(3);
          draw_X(screen_x, screen_y);
          pop();
        } catch {};
      }
    }
  }

  draw_nyquist_O(frequency){
    //let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    let screen_x1 = (Math.log(Math.abs(frequency))/Math.log(10) + 2) * graph_bode_mag_width/5;
    let sample_no = Math.round(screen_x1);
    // This may fail, if the frequency is "outside" of the calculated frequencies.
    // So let's add a safety measure:
    if ((sample_no >= 0)&&(sample_no <new_complex_array.length)){
      let current_complex = new_complex_array[sample_no];
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
        try {
          push();
          stroke(this.bode_hue,240,360);
          strokeWeight(3);
          draw_O(screen_x, screen_y);
          pop();
        } catch {};
      }
    }
  }

  draw_nyquist_value(percentage){
//    let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = Math.pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);
    let sample_no = Math.floor(graph_bode_mag_width * percentage);
//    let sample_no = Math.floor(new_complex_array.length * percentage);
    let current_complex = new_complex_array[sample_no];
    let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
    let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
    if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
      push();
      noStroke();
      translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
      fill(this.bode_hue,360,360);
      ellipse(screen_x,screen_y,12,12);
      pop();
    }
  }

  get_nyquist_value(percentage){
    let new_complex_array = this.bode_complex_array;
    let sample_no = Math.floor(graph_bode_mag_width * percentage);
    let current_complex = new_complex_array[sample_no];
    let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
    let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
    return [screen_x, screen_y];
  }

  draw_pole_zero(draw_axis){
    for(let x=1; x<=3; x++){
      stroke(line_color);
      if (x==3){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      line(x*pole_zero_width/4,0,x*pole_zero_width/4,pole_zero_height);
    }
    for(let y=0; y<=4; y++){
      if (y==2){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      if ((y==0)||(y==4)){
        strokeWeight(line_stroke_weight / 2);
        stroke(this.bode_hue,360,360);
      } else {
        stroke(line_color);
      }
      line(0,y*pole_zero_height/4,pole_zero_width,y*pole_zero_height/4);
    }
    stroke(this.bode_hue,360,360);
    strokeWeight(line_stroke_weight / 2);
    line(0,0,0,pole_zero_height);
    line(pole_zero_width,0,pole_zero_width,pole_zero_height);
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    if (draw_axis == true){
      push();
      noStroke();
      textSize(15);
      textAlign(CENTER);
      fill(text_color);
      for(let x=0; x<=4; x++){
        text((x-3).toFixed(1),x*graph_pole_zero_width/4,pole_zero_height+20);
      }
      text("Real axis [1/s]",graph_pole_zero_width/2,pole_zero_height+35);
      pop();
    }
    if (this.bode_formula == GRAPH_ONE_REAL_POLE.formula){
      //pole_x = range_slider_variables[0];
      let T_1inv = 1/range_slider_variables[variable_position["T_1"]];
      if (T_1inv > 3.2) T_1inv=3.2;
      this.plot_pole(-T_1inv,0); // Should be T_1

    } else if (this.bode_formula == GRAPH_TWO_REAL_POLES.formula){
      //pole_x = range_slider_variables[0];
      let T_2inv = 1/range_slider_variables[variable_position["T_2"]];
      if (T_2inv > 3.2) T_2inv=3.2;
      this.plot_pole(-T_2inv,0); // Should be T_2
      let T_3inv = 1/range_slider_variables[variable_position["T_3"]];
      if (T_3inv > 3.2) T_3inv=3.2;
      this.plot_pole(-T_3inv,0); // Should be T_3

    } else if (this.bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      // Calculate bode_3_real and imaginary from z and w:
      // s = −ζω_n ± jω_n * Math.sqrt(1−ζ^2)
      let z = range_slider_variables[variable_position["z"]];
      let w = range_slider_variables[variable_position["w"]];

      if (z <= 1){
        bode_3_real = -z*w;
        bode_3_imaginary = w * Math.sqrt(1-z*z);
        let tmp_x = bode_3_real;
        let tmp_y = bode_3_imaginary;
        if (tmp_x < -3.2){
          // We need to scale down the y-axis just as much as we're scaling on x axis:
          let scale = tmp_x / -3.2;
          tmp_y = tmp_y / scale;
          tmp_x=-3.2;
        }
        if (tmp_y < -2.2){
          // We need to scale down the x-axis just as much as we're scaling on y axis:
          let scale = tmp_y / -2.2;
          tmp_x = tmp_x / scale;
          tmp_y=-2.2;
        }
        if (tmp_y > 2.2){
          // We need to scale down the x-axis just as much as we're scaling on y axis:
          let scale = tmp_y / 2.2;
          tmp_x = tmp_x / scale;
          tmp_y=2.2;
        }
        // Since these are complex, let's draw a line from origo as well:
        stroke(line_color);
        strokeWeight(1);
        line(pole_zero_width/2 + (tmp_x+1) * pole_zero_width/4,
             pole_zero_height/2 + tmp_y * pole_zero_height/4,
             pole_zero_width/2 + (0+1) * pole_zero_width/4,
             pole_zero_height/2 + 0 * pole_zero_height/4);
        line(pole_zero_width/2 + (tmp_x+1) * pole_zero_width/4,
             pole_zero_height/2 - tmp_y * pole_zero_height/4,
             pole_zero_width/2 + (0+1) * pole_zero_width/4,
             pole_zero_height/2 + 0 * pole_zero_height/4);
        noFill();
        strokeWeight(line_stroke_weight);
        stroke(this.bode_hue,360,360);
        this.plot_pole(tmp_x,tmp_y); // complex
        this.plot_pole(tmp_x,-tmp_y); // complex
      } else {
        //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
        let bode_3_real_1 = -z*w + w * Math.sqrt(z*z-1);
        let bode_3_real_2 = -z*w - w * Math.sqrt(z*z-1);
        bode_3_imaginary = 0;
        let tmp_x = bode_3_real_1;
        if (tmp_x < -3.2) tmp_x=-3.2;
        if (tmp_x > 1.2) tmp_x=1.2;
        this.plot_pole(tmp_x,0); // complex
        tmp_x = bode_3_real_2;
        if (tmp_x < -3.2) tmp_x=-3.2;
        if (tmp_x > 1.2) tmp_x=1.2;
        this.plot_pole(tmp_x,0); // complex
      }

    } else if (this.bode_formula == GRAPH_ONE_ZERO.formula){
      //pole_x = range_slider_variables[0];
      let T_4inv = 1/range_slider_variables[variable_position["T_4"]];
      if (T_4inv > 3.2) T_4inv=3.2;
      this.plot_zero(-T_4inv,0); // Should be T_4

    } else if (this.bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      //pole_x = range_slider_variables[0];
      let T_6inv = 1/range_slider_variables[variable_position["T_6"]];
      if (T_6inv > 3.2) T_6inv=3.2;
      this.plot_pole(-T_6inv,0); // Should be T_6
      let T_7inv = 1/range_slider_variables[variable_position["T_7"]];
      if (T_7inv > 3.2) T_7inv=3.2;
      this.plot_pole(-T_7inv,0); // Should be T_7
      let T_8inv = 1/range_slider_variables[variable_position["T_8"]];
      if (T_8inv > 3.2) T_8inv=3.2;
      this.plot_zero(-T_8inv,0); // Should be T_4

    } else if (this.bode_formula == GRAPH_FOUR_POLES.formula){
      //pole_x = range_slider_variables[0];
      let T_5inv = 1/range_slider_variables[variable_position["T_5"]];
      if (T_5inv > 3.2) T_5inv=3.2;
      this.plot_pole(-T_5inv,0); // Should be T_1
    }

    noStroke();
    textSize(15);
    textAlign(CENTER);
    let grey_color = color('hsb(0, 0%, 50%)');
    fill(grey_color,360,360);
    text(this.graph_name,graph_pole_zero_width/2,pole_zero_height-7);
  }

  plot_pole(pole_x,pole_y){
    let screen_x = pole_zero_width/2 + (pole_x+1) * pole_zero_width/4;
    let screen_y = pole_zero_height/2 + pole_y * pole_zero_height/4;
    line(screen_x-6,screen_y-6,screen_x+6,screen_y+6);
    line(screen_x+6,screen_y-6,screen_x-6,screen_y+6);
  }

  plot_zero(pole_x,pole_y){
    let screen_x = pole_zero_width/2 + (pole_x+1) * pole_zero_width/4;
    let screen_y = pole_zero_height/2 + pole_y * pole_zero_height/4;
    ellipse(screen_x,screen_y,15,15);
  }
}


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


// --------------------- banner

let have_asked_questions=false;
let banner_is_visible=false;
function prepare_banner(){
  setTimeout(trigger_banner,60*1000);
}

function trigger_banner(){
  if (have_asked_questions==false){
    if (this_is_a_touch_device==false){
      if (quiz_enabled==true) {
        // Don't show the banner if a quiz is ongoing.
        // Instead, schedule the banner to appear later.
        setTimeout(trigger_banner,120*1000);
        return;
      }
      banner_is_visible=true;
      const banner=document.getElementById("banner");
      banner.innerHTML='<img src="images/Right_click_banner_small.webp" alt="Right click to ask questions!" class="banner" width="45%"><img src="images/Right_click_banner_small.webp" width="45%" style="visibility:hidden">';
      banner.style.animation = 'none';
      banner.offsetHeight; /* trigger reflow */
      banner.style.animation="banner_anim_in 7s ease-out 1";
      add_event("banner_enter");
    }
  }
}

function remove_banner_if_needed(){
  if (banner_is_visible==true){
    banner_is_visible = false;
    banner.innerHTML='<img src="images/Right_click_banner_small.webp" alt="Right click to ask questions!" class="banner" width="45%">';
    banner.style.animation = 'none';
    banner.offsetHeight; /* trigger reflow */
    banner.style.animation="banner_anim_out 5s ease-out 1";
    banner.style.opacity = 0.0;
    add_event("banner_removed");
  }
}

// --------------------- end of banner code
// --------------------- start of improvement code

let improvement_enabled = true;
function opt_out_tracking() {
  improvement_enabled = false;
}

var pending = [];
var event_no = 0;
var periodic_timer_id = 0;
let client_id = Math.random()*2**31>>>0; // A pretty random 31-bit uint id
let client_nick = "";
let client_place = "";

function add_event (string) {
  if (debug_mode) console.log("Event:"+string);
  if (improvement_enabled == false) return;
  let date_now = new Date();
  let now = date_now.getTime();
  let time_diff = now-session_started_at;
  let mseconds_elapsed = Math.floor(time_diff);
  let thestring = `E${event_no};T${mseconds_elapsed/1000};`;
  let delay = 5000;
  if (string !== "") {
    string = string.replace(";","_");
    thestring += "A" + string + ";";
    if (periodic_timer_id !== 0) {
      clearTimeout(periodic_timer_id);
    }
    periodic_timer_id = 0;
    delay = 1500;
  }
  event_no++;
  pending.push(thestring);
  if (periodic_timer_id === 0) {
    periodic_timer_id = setTimeout(periodic_send, delay);
  }
}

var server_error = "";

function periodic_send () {
  periodic_timer_id = 0;
  if (pending.length > 0) {
    let date_now = new Date();
    let now = date_now.getTime();
    let time_diff = now-session_started_at;
    let mseconds_elapsed = Math.floor(time_diff);
    var XHR = new XMLHttpRequest();
    var to_send = `T${mseconds_elapsed/1000};U${client_id};L${client_place}_${client_nick};`;
    for (var pending_no = 0; pending_no < pending.length; pending_no++) {
      to_send += pending[pending_no];
    }
    var urlEncodedData = `e=${encodeURIComponent(to_send).replace(/%20/g, "+")}`;
    // Define what happens on successful data submission
    XHR.addEventListener("load", (event) => {
      // We got an answer.
      //console.log("Got answer:" + event.target.response);
      // Let's see if there is anything to erase from our pending queue:
      if (event.target.status === 200) {
        // HTTP OK
        var response = event.target.response;
        if (debug_mode) console.log("RESP=" + response);
        if (response.startsWith("ERROR")) {
          server_error = response;
        } else if (response.startsWith("E")) {
          var done_up_until = -1;
          var resplit = response.split(";");
          for (var res in resplit) {
            if (resplit[res].startsWith("E")) {
              done_up_until = Number(resplit[res].substr(1).replace(/;/g, ""));
            } else if (resplit[res].startsWith("CID")) {
              client_id = Number(resplit[res].substr(3).replace(/;/g, ""));
            }
          }

          // And now, remove all events in pending up until this number:
          var done = false;
          while (pending.length > 0 && done === false) {
            if (Number(pending[0].substr(1, pending[0].indexOf(";") - 1)) <= done_up_until) {
              pending.shift();
            } else {
              done = true;
            }
          }
        }
        // Now, if there's still events pending, let's setup another try to send it:
        if (pending.length > 0) {
          if (periodic_timer_id === 0) {
            periodic_timer_id = setTimeout(periodic_send, 20000);
          }
        }
      }
    });
    XHR.addEventListener("error", (event) => {
      console.log("Error");
      console.log(event);
    });
    // Helping making LU-PZE better:
    XHR.open("POST", "https://livet.se/lu-pze.php", true);
    XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    XHR.send(urlEncodedData);
    if (debug_mode) console.log("S:" + urlEncodedData);
  }
}

// --------------------- end of improvement code

let is_fullscreen = false;
function toggle_fullscreen(){
  if (is_fullscreen == false){
    add_event("go_fullscreen");
    achievement_done("go_fullscreen");
    openFullscreen();
  } else {
    closeFullscreen();
  }
}

function openFullscreen() {
  let elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
    is_fullscreen = true;
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
    is_fullscreen = true;
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
    is_fullscreen = true;
  }
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
    is_fullscreen = false;
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
    is_fullscreen = false;
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
    is_fullscreen = false;
  }
}

let graph_no=0;
function initial_graph(){
  // Add the initial startup graphs, with a little delay to make it look good:
  let graph_to_add = GRAPH_ORDER[graph_no];
  addNewGraph(null, graph_to_add);
  graph_no +=1;
  next_graph_no_to_add = graph_no;

  let welcome_text=document.getElementById("welcome_text");
  if (nof_quiz_started == 0) {
    welcome_text.innerHTML='<div class="yellow_hover" id="inital_quiz_button"><span onclick="toggle_quiz()" style="color:#b0b0b0;vertical-align:middle"><button type="button" id="initial_quiz_icon" style="padding:0 3px;margin-right:0px;background:none;border:none;margin-top:11px;" title="Start quiz"><svg width="27" height="27" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg> Take the initial quiz</button></span></div>';
  } else {
    welcome_text.innerHTML='';
  }
}

// Called by p5:
function setup (){
  setGraphDimensions();
  let canvas = createCanvas(canvas_width,canvas_height);
  canvas.parent('sketch_holder');
  colorMode(HSB,360);
  background_color = color('hsb(0,0%,4%)');
  box_background_color = 120;
  line_color = color('hsb(0,0%,22%)');  // Grey graph lines
  text_color = color('hsb(0,0%,20%)');
  angle_color = "#ff40ff";
  // To go from "T_1" to the index in range_slider_variables:
  for(let i=0; i<range_slider_alphabet.length; i++){
    variable_position[range_slider_alphabet[i]] = i;
  }
  id_bank=0;
  noLoop();

  let footer_div=document.getElementsByClassName("footer")[0];
  footer_div.style.display="inline";
  let graph_information_div=document.getElementsByClassName("graph-information")[0];
  graph_information_div.style.display="inline";
  add_event("setup="+start_date.toLocaleString().replace(" ",""));

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  if (urlParams.has('p')) {
    let place = urlParams.get('p').replace(";","_").replace("\\","/");
    client_place = place.replace(/[^A-ZÅÄÖa-zåäö0123456789]/g, '_')
  }
  if (urlParams.has('debug')) {
    debug_mode = true;
  }
}

function ready (){
  let add_button = document.getElementsByClassName("add-graph")[0];
  add_button.addEventListener('click',addNewGraphClicked);
  let setting_button = document.getElementsByClassName("option-button")[0];
  setting_button.addEventListener('click',toolboxMenuToggle);
  let input_equation = document.getElementsByClassName("input-equation")[0].getElementsByClassName("formula")[0];
  input_equation.addEventListener('input',updateInputFormula);
  // Make sure that input function selector is visible:
  let toggleElement = document.querySelector('.input-equation');
  toggleElement.classList="active";
  let hover_answer = document.getElementById("hover_answer");
  hover_answer.style.visibility="hidden";
  // Enable gamification from start:
  toggle_gamification();
  toggle_assignments();
  set_difficulty_level({value:50});
  toggle_quiz_enabled();

  document.addEventListener('keydown', function(event) {
    //console.log(event.key);
    //if (event.key=='F1'){
    //  toggle_quiz_enabled();
    //}
    if (event.key=='F2'){
      start_quiz();
    }
    //if (event.key=='F3'){
    //  quiz_correct();
    //  update_quiz();
    //}
    //if (event.key=='F1') select_assignment({value:"pid_controller"});
    //if (event.key=='F2') select_assignment({value:"pid_controller_YL"});
    //if (event.key=='F3') show_answer_to_task("PID_(T_d!=0)");
    if (event.key=='Escape') restart_lupze();
  });

  document.addEventListener('contextmenu', function(event) {
    // Prevent the default right-click behavior
    event.preventDefault();
    questionsToggle();
    add_event("ask_a_question");
    achievement_done("ask_a_question");
  });
  //document.addEventListener('mouseup', function(event) {
  //  if (event.button === 2) {
  //    console.log('Right mouse button released');
  //  }
  //  disable_questions();
  //});

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      add_event("LU-PZE_hidden");
    } else {
      add_event("LU-PZE_visible");
    }
  });

  prepare_banner();
}

//
// LU-PZE: Lund University Pole-Zero Explorer
// - an Automatic Control theory playground
//
// Tryout a live version at https://lu-pze.github.io
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

if (document.readyState == 'loading') {
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

const GRAPH_ORDER = [
  GRAPH_ONE_REAL_POLE,
  GRAPH_TWO_REAL_POLES,
  GRAPH_TWO_COMPLEX_POLES,
  GRAPH_TIME_DELAY,
  GRAPH_ONE_ZERO_TWO_POLES,
  GRAPH_FOUR_POLES,
  GRAPH_ONE_ZERO
];
const NOF_GRAPHS_AT_STARTUP = 4;
let next_graph_no_to_add = 0;
let id_bank = 1;

let min_10power = -2;
let rate = 1.4;
let precision = 4;

let x_case_gain = 5;
let y_case_gain = 6;

let bode_graphs = [];
let current_tab = 0;

let phase_lower_bound = 0;
let phase_upper_bound = 0;
let gain_upper_bound = 60;
let phase_case_number;

//                              red   yellow    green     blue  magenta       orange        green
let color_table = [     270,    350,      32,     170,     202,-90+5*81,-90-360+6*81,-90-360+7*81,-90-360+8*81,-90-360+9*81,-90-360+10*81,-90-360+11*81,-90-360+12*81,-90-360+13*81,-90-360+14*81,-90-360+15*81];

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
let graph_width = 1200;
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

  slider.classList.add("slider-wrapper");
  slider.innerHTML =
  `
    <div class="slider-subwrapper">
      <div class="value-wrapper">
        <span style="margin:0">a =</span>
        <input type="text" id="variable_${button_id}" value="">
      </div>
      <div class="slider">
        <input type="text" value="${range_min}" class="slider-bound" style="text-align:right">
        <input type="range" min="${range_min}" max="${range_max}" step="0.01" class="range-slider" id=${"RANGE_" + button_id} value="${range_value}" style="width:100%">
        <input type="text" value="${range_max}" class="slider-bound">
      </div>
    </div>
  `
//      <button type="button" class="delete-graph"><i class="material-icons" style="font-size: 30px; color: #b0b0b0">clear</i></button>
//  let delete_button = slider.getElementsByClassName("delete-graph")[0];
//  delete_button.addEventListener('click',removeSlider);

  // Printing variable names using mathlive:
  slider.getElementsByTagName("span")[0].innerHTML = "<math-field read-only style='vertical-align:bottom;display:inline-block'>" + range_slider_alphabet[button_id] + " =</math-field>";

  //let linked_letter = range_slider_alphabet[button_id];
  let range_slider = slider.getElementsByClassName("range-slider")[0];
  let linked_span = slider.getElementsByClassName("value-wrapper")[0].getElementsByTagName("input")[0];
  linked_span.value = (+range_slider.value).toFixed(2);

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
  achievement_done("add_graph");
  addNewGraph(event, graph_to_add);
}

function addNewGraph(event, graph_to_add={name:"", mf:"\\frac{0.9s+1}{(s+1)^2}\\frac{v^2}{s^2+2qvs+v^2}", formula:"(0.9s+1)/((s+1)^2)*(v^2)/(s^2+2*q*v*s+v^2)"}){
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

  let new_equation_wrapper = document.createElement('div');
  new_equation_wrapper.classList.add('equation-wrapper');
  id_bank += 1;
  let linked_color = color_table[id_bank%color_table.length];
  let s ='<hr><div class="equation"';
  if (graph_name.startsWith("Ghost")){
    if (graph_name[10]==".") s='<div class="equation" style="display:none;"';
  }
  s +=">";

  s +=`<input type="checkbox" class="show-graph" style="background: hsl(${linked_color},100%,50%)" title="${graph_name}">`;
  s += "<math-field ";
  // These are the GRAPHS that should be not changeable. "read only":
  if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
      (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
      (equation_string == GRAPH_TWO_COMPLEX_POLES.formula) ||
      (equation_string == GRAPH_TIME_DELAY.formula)){
    s += "read-only ";
  }
  s += `class="formula" id="${id_bank}" style="`
  // These are the GRAPHS that should be not changeable. "read only":
  if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
      (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
      (equation_string == GRAPH_TWO_COMPLEX_POLES.formula) ||
      (equation_string == GRAPH_TIME_DELAY.formula)){ // Make sure that hover doesn't make read-only graphs yellow:
    s += "background:#fff;";
  }
  s += `font-size: 20px;" title="${graph_name}">${mathfield_string}</math-field>`;
  // These are the GRAPHS that should have download code buttons:
  if ((equation_string == GRAPH_ONE_REAL_POLE.formula) ||
      (equation_string == GRAPH_TWO_REAL_POLES.formula) ||
      (equation_string == GRAPH_TWO_COMPLEX_POLES.formula)){
    s += `<button type="button" class="download-script" id="${id_bank}" onclick="download_script(${id_bank})"><i class="material-icons" style="font-size:28px;color:#b0b0b0">ios_share</i></button>`;
  }
  s += `<button type="button" class="delete-graph"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
  </div>
  <div class="slider-buttons">
  </div>
  `
  new_equation_wrapper.innerHTML = s;

  let equations_div = document.getElementsByClassName("equations")[0];
  equations_div.append(new_equation_wrapper);

  let new_equation = new_equation_wrapper.getElementsByClassName("equation")[0];
  new_equation.getElementsByClassName("delete-graph")[0].addEventListener('click',removeGraph);
  new_equation.getElementsByClassName("show-graph")[0].addEventListener('change',changeGraphDisplayStatus);

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
  if (graph_name.startsWith("Ghost")){
    if (graph_name[5]==".")  new_bode_graph.bode_display_bodemag_bool = false;
    if (graph_name[6]==".")  new_bode_graph.bode_display_bodephase_bool = false;
    if (graph_name[7]==".")  new_bode_graph.bode_display_timeresponse_bool = false;
    if (graph_name[8]==".")  new_bode_graph.bode_display_nyquist_bool = false;
    if (graph_name[9]==".")  new_bode_graph.bode_display_information_bool = false;
    if (graph_name[10]==".") new_bode_graph.bode_display_equation_bool = false;
    new_bode_graph.graph_name = graph_name.substr(12);
  }

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

  if (!((graph_name.startsWith("Ghost"))&&(graph_name[9]=="."))){
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


function removeAllGraphs(){
  const equations = document.querySelectorAll(".equation-wrapper .equation .delete-graph .material-icons");
  equations.forEach((equation) => {
    equation.click();
  });
  bode_graphs = [];
  id_bank = 1;
  input_formula = "1/s";
  let input_equation = document.getElementById("input-formula");
  input_equation.value = "\\frac{1}{s}";
  let i2 = document.getElementById("input-choices");
  i2.value = "Unit step";
}

function removeGraph(event){
  let clicked_button = event.target;
  let linked_equation = clicked_button.parentElement.parentElement;
  if (event.target.type=="button"){
    // This is a bugged click that would remove all graphs, somehow.
    //If event.target is:
    //<i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i>
    //...the removeGraph function below is ok.
    //If event.target is:
    //<button type="button" class="delete-graph"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
    //...the function below will remove all graphs.

    // Only clicks on the actual material-icon will be correct, so go to the correct level in the DOM:
    //console.log("removeGraph");
    //console.log(event);
    //console.log(event.target);
    //console.log(event.target.type);
    linked_equation = clicked_button.parentElement;
  }
  let linked_id = linked_equation.getElementsByClassName("formula")[0].id;
  removeInformationTab(+linked_id);
  let equation_to_remove = "";
  for(let i=0; i<bode_graphs.length; i++){
    let current_graph = bode_graphs[i];
    if(current_graph.bode_id == parseInt(linked_id)){
      equation_to_remove = current_graph.bode_formula;
      bode_graphs.splice(bode_graphs.indexOf(current_graph),1);
      redraw();
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

  for(let b=0; b<bode_graphs.length; b++){
    let graph_id = bode_graphs[b].bode_id;
    checkSlider(graph_id);
    redraw_canvas_gain(graph_id);
  }

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
        
        checkSlider(input_element_id);
        redraw_canvas_gain(input_element_id);
        break;
      }
    }
  });
}


function toolboxMenuToggle(event){
  let toggleElement = document.querySelector('.toolbox');
  toggleElement.classList.toggle('active');
}

function helpToggle(event){
  achievement_done("view_help");
  let toggleElement = document.querySelector('.help');
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
<button type="button" onclick="copy_code()" class="copy-button"><i class="material-icons" style="font-size:24px;color:#404040">content_copy</i></button>
<button type="button" class="close-window" onclick="hide_script()"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
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

function start_quiz(){
  achievement_done("start_quiz");
  current_assignment="none";
  removeAllGraphs();
  update_tasks();
  //remove the assignments box:
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.remove('active');
  let assignment_icon = document.getElementById("show_assignments");
  assignment_icon.style.color=null;
  let quiz_icon = document.getElementById("quiz_icon");
  quiz_icon.style.color="#5050ff";
  //removeAllGraphs();
  quiz_nof_done = 0;
  quiz_nof_tries = 0;
  quiz_current_streak = 0;
  quiz_nof_correct = 0;
  for (let question in quiz_questions){
    quiz_streaks[quiz_questions[question]] = 0;
    quiz_questions_nof_done[quiz_questions[question]]=0;
  }
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

  if (current_quiz=="click_freq"){
    let level=quiz_difficulties[current_quiz];
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
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
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
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
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
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
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
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
        next_graph_no_to_add=graph_color;
        id_bank=next_graph_no_to_add;
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
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

  redraw(); // Needed to get the title of the Dirac Impulse response correct
}


function update_quiz(){
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

  let task_div=document.getElementById("task_list");
  let s = "";
  s += '<center><i class="material-icons" style="font-size: 27px;vertical-align: middle;">school</i>&nbsp;&nbsp;<b>Quiz time</b></center><br>';

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
  s +='<input type="range" min="0" max="100" step="0.01" class="quiz-slider" id="difficulty_level" value="' + quiz_difficulty + '" style="width:100%" onchange="set_difficulty_level(this);next_quiz();">';
  s +='<div class="quiz-labels">';
  s +='<label for="0"></label>';
  s +='<label for="12.5">Kindergarten</label>';
  s +='<label for="25">Elementary&nbsp;school</label>';
  s +='<label for="37.5">High&nbsp;school</label>';
  s +='<label for="50">University</label>';
  s +='<label for="62.5">PhD&nbsp;candidate</label>';
  s +='<label for="75">PhD&nbsp;student</label>';
  s +='<label for="87.5">Professor</label>';
  s +='<label for="100"></label>';
  s +='</div>';
  s +='<center>';
  s +='<input type="checkbox" id="adaptive_difficulty" ';
  if (adaptive_difficulty_enabled==true){
    s +='checked ';
  }
  s +='onchange="toggle_adaptive_difficulty(this);"><label for="adaptive_difficulty">Adaptive difficulty level</label>';
  s +='</center>';
  s +='</div>';

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
  s +="<br><br><center><span style='font-size:200%;color:#c02020'>We're working on the QUIZ right now. It will be longer.</span><br><br>Check back later. Thanks for your patience! <br>/ Pex & Frida</center>";

  task_div.innerHTML = s;
}

function stop_quiz(){
  restart_lupze();
}

function set_difficulty_level(event){
  quiz_difficulty = +(event.value);
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
  let left = (100*mouseX /windowWidth);
  if (left > 85) left = 85;
  let top = (100*mouseY/windowHeight);
  if (top > 90) left = 90;
  document.querySelector('.quiz_answer').style.setProperty('--left',left+"%");
  document.querySelector('.quiz_answer').style.setProperty('--top',top+"%");
  document.querySelector('.quiz_no').style.setProperty('--left',left+"%");
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

function quiz_perhaps(why_its_almost_wrong){
  show_quiz_wrong_text(why_its_almost_wrong);
}

function quiz_incorrect(why_its_wrong){
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
  achievement_done("view_assignments");
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.toggle('active');
  update_assignments();
}

function task_done (which_one){
  if (assignments_enabled==true){
    if (all_assignments[current_assignment].tasks.includes(which_one)){
      if (!(done_tasks.includes(which_one))){
        // This is a task that hasn't been done before:
        done_tasks.push(which_one);

        // Trigger an animation with the text:
        let achievement_text_div = document.getElementById("achievement_text");
        let assignment_star_div = document.getElementById("assignment_star");
        achievement_text_div.innerHTML=all_tasks[which_one];
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
  "four_poles":{t:"6. Investigate a system with <b>four poles</b>",tasks:["T5=0.3;k=2","phase_margin=20"],info:"A system with <b>four poles</b> gets a lot more phase shift, with a larger spin in the Nyquist diagram."},
  "none":{t:"...no assignment",tasks:["impossible"],info:""},
//  "nyquist":{t:"Check out the <b>Nyquist diagram</b>",tasks:["k_above_or_equal_100","set_input_to_ramp"],info:"Named after Harry Nyquist 1889-1976, a Swedish-American physicist and electronic engineer."}
};
let done_assignments={};

const all_tasks={
//## One pole
//"reference eq in step response(k=0.65, T1=2)"
"T1=2":"Your task is to change T<sub>1</sub> by moving the slider or type in T<sub>1</sub>'s value to make the pole's location -1/2 in the pole-zero map. Can you explain how the pole's location and its time constant are related?",//. (T1=2)
"k1=2.9":"Your task is to drag the <b>step input response</b> making the static gain of the system 2.9. When will the system reach its static gain?",//. (k1=2.9)
"T1_k1_bode":"Save the princess from the dragon by dragging the pole marker in the Bode plots to mimick the orange step response. The princess, as it turns out, will only leave the dragon if you can explain how she can find the <b>static gain</b> in the Bode magnitude plot. Can you save her?",// (k=0.65, T1=2)
"T1_pole=-2":"Drag the pole marker in the <b>pole-zero map</b> to make the system four times faster than the orange one. What does it mean to have a faster system?",//. (pole in -2)
"T1_unstable":"Make the pole <b>unstable</b>.", // T_1 < 0

//## Two real poles
//reference in step (T2=T3=1, k2=0.5)
//reference in bode phase (T2=5, T3=0.05, k2=1)
"T2,T3=0.05_and_5":"Your task is to change T<sub>2</sub> and T<sub>3</sub> to make your Bode phase plot mimick the blue curve in the Bode phase plot. Feel free to change these time constants in whatever way you find suitable.",//. (T2=0.05, T3=5.0)
"T2,T3=1;k2=0.5":"Your first subtask is to set k<sub>2</sub>=0.5 exactly, then drag the two pole markers in the <b>pole-zero map</b> to make the step response follow the cyan line. Can you explain how this second-order step response differs from a first-order system?",//. (T2=T3=1, k2=1)
"T2=10;T3=0.5":"Your task is to drag the pole markers in the Bode plots making the <b>cutoff frequencies</b> in the Bode plot become 0.1 rad/s and 2.0 rad/s. Now, tell me how the cutoff frequencies as seen in the Bode plots are related to the poles' locations in the pole-zero map.",// (T2=10, T3=0.5 or vice versa)
"phasemargin=55":"Please drag the two pole markers in the Bode diagram to ensure that the <b>Phase margin</b> for the system is 55°. Can you explain how the phase margin can be found in the Nyquist diagram?",// (T2=T3=0.5-1.5k k2=7-8 approximately
"gaincrossover=3":"Finally, drag the two pole markers in the Bode diagram to ensure that the <b>gain crossover frequency</b> becomes 3.0 rad/s. But before you go, call your friend and tell them how you can get the gain crossover frequency from a Bode magnitude plot.",// (T2=T3=0.5-1.5k k2=7-8 approximately)

//## Two complex poles
//Step reference (w=2,z=0.7,k=0.7)
//Bode reference (w=8, z=0.05)
"w=0.9;z=0.0":"Move the pole markers in the <b>pole-zero map</b> in such way that the resonance frequency w becomes 0.9 and the damping factor z becomes 0.0.",
"w=1.6;z=0.2":"Drag the pole markers in the <b>pole-zero map</b> so that the resonance frequency w=1.6 and damping factor z=0.2.",
"w=8;z=0.05;k_3=1":"Change the <b>resonance frequency</b> w, <b>damping factor</b> z and <b>static gain</b> k<sub>3</sub> to make the Bode plots mimick the blue lines.",
"w=2;z=0.7;k3=0.7":"Your task is to match the pink step input response. First, set your <b>static gain</b> k<sub>3</sub>. Then, drag the <b>Bode plot</b> to align your system response with the pink step input response.",

//## Time delay
"L=3":"Drag the step input response to change the time delay to 3.0 seconds.",
"L_gain_margin=2":"Change the <b>time delay</b> L so that the <b>Gain margin</b> becomes 2.0.",// (L=0.3)

//## One zero two Poles
//Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
//Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
//Step reference (k4=1,T6=1,T7=1,T8=-1.5)
"k4=1;T6=2.5;T7=1;T8=6":"Your task is to make your Nyquist diagram match up with the orange one. <b>Drag the pole and zero markers in the Bode plots</b>, and change k<sub>4</sub> to make the Nyquist curve follow the orange line. Note that there are many combinations of T<sub>6</sub>, T<sub>7</sub>, and T<sub>8</sub> that gives identical Nyquist diagrams but non-similar Bode diagrams. Can you explain why?",// (k=1,T6=2.5,T7=1,T8=6)
"k4=0.75;T6=9.25;T7=0.5;T8=2":"Change the parameters so that your Bode plots align with the green lines.",//. (k4=0.75,T6=9.25,T7=0.5,T8=2)
"k4,T6,T7=1,T8=1.5_poles":"With k<sub>4</sub>=1, drag the pole and zero markers in the <b>pole-zero map</b> so that the step response follows the blue line.",

//#Four poles
// ToDo:
"T5=0.3;k=2":"CURRENTLY NOT SOLVABLE (but we're working on it!): Change k<sub>5</sub> and T<sub>5</sub> by dragging the sliders or typing in a number so that the <b>Gain margin</b> is 0.5 and the <b>Phase crossover frequency</b> is 1.25 rad/s.",// (T5=0.3, k=2)
"phase_margin=20":"CURRENTLY NOT SOLVABLE (but we're working on it!): Drag the Bode plot so that the <b>Phase margin</b> is 20° with a <b>Gain crossover frequency</b> of 5 rad/s.",
};
let done_tasks=[];


function update_assignments(){
  let assignments_box = document.querySelector('.assignments_box');
  let s = "";
  s += '<br><button type="button" class="close-window" onclick="toggle_assignments_box();"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>';

  s += "<center>";
  s += '<i class="material-icons" style="font-size: 27px;vertical-align: middle;">assignments</i>';
  s += "Your Assignments";
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
  s += "<br><br>";

  if (nof_assignments_done > 0){
    s+="Completed assignments:<br>";
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
    s += "<br>";
  }

  assignments_box.innerHTML=s;
}

function restart_lupze(){
  //location.reload();
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon = document.getElementById("quiz_icon");
  quiz_icon.style.color=null;
  current_assignment = "none";
  let assignment_icon = document.getElementById("show_assignments");
  assignment_icon.style.color=null;
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

function select_assignment(event){
  current_assignment = event.value;
  update_tasks();
  removeAllGraphs();
  //stop_quiz:
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon = document.getElementById("quiz_icon");
  quiz_icon.style.color=null;
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
    let assignment_icon = document.getElementById("show_assignments");
    assignment_icon.style.color=null;
    return;
  }
  let assignment_icon = document.getElementById("show_assignments");
  assignment_icon.style.color="#5050ff";

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
    addNewGraph(none, {name:"Ghost..T..._Match this response", mf:"\\frac{0.65}{1+2s}", formula:"(0.65)/((1+2s))"});
  } else if(event.value=="two_real_poles"){
    //reference in step (T2=T3=1, k2=0.5)
    addNewGraph(none, {name:"Ghost..T..._Match this response", mf:"\\frac{0.5}{1+2s+s^2}", formula:"0.5/(1+2s+s^2)"});
    //reference in bode phase (T2=5, T3=0.05, k2=1)
    addNewGraph(none, {name:"Ghost.P...._Match this Bode phase", mf:"\\frac{1}{(1+5s)(1+0.05s)}", formula:"1/(1+5s)*1/(1+0.05s)"});
  } else if(event.value=="two_complex_poles"){
    //Bode reference (w=8, z=0.05)
    addNewGraph(none, {name:"GhostMP...._Match this Bode", mf:"\\frac{8^2}{s^2+2*0.05*8*s+8^2}", formula:"8^2/(s^2+2*0.05*8*s+8^2)"});
    //Step reference (w=2,z=0.7,k=0.7)
    addNewGraph(none, {name:"Ghost..T..._Match this response", mf:"\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}", formula:"0.7*2^2/(s^2+2*0.7*2*s+2^2)"});
  } else if(event.value=="one_zero_two_poles"){
    //Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
    addNewGraph(none, {name:"Ghost...N.._Match this Nyquist", mf:"\\frac{(1+6s)}{(1+2.5s)(1+s)}", formula:"(1+6s)/(1+2.5s)*1/(1+s)"});
    //Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
    addNewGraph(none, {name:"GhostMP...._Match this Bode", mf:"\\frac{0.75(1+2s)}{(1+9.25s)(1+0.5s)}", formula:"0.75(1+2s)/(1+9.25s)*1/(1+0.5s)"});
    //Step reference (k4=1,T6=1,T7=1,T8=-1.5)
    addNewGraph(none, {name:"Ghost..T..._Match this response", mf:"\\frac{(1-1.5s)}{(1+s)(1+s)}", formula:"(1-1.5s)/(1+s)*1/(1+s)"});
  }
}

function update_tasks(){
  let task_div=document.getElementById("task_list");
  if (current_assignment=="none"){
    task_div.innerHTML = '<div class="yellow_hover"><center><span onclick="addNewGraph();" style="color:#b0b0b0">Click <i class="material-icons" style="font-size:28px; vertical-align: middle;">add</i> or here to add next graph</span></center></div>';
    return;
  }

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
        let long_name = all_tasks[task_id];
        todo += "<input type='checkbox' onclick='return false;'>&nbsp;<span style='color:#4040b0;'>" + long_name + "</span><br><br>";
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
        let long_name = all_tasks[task_id];
        s += "<input type='checkbox' checked onclick='reset_task(\""+task_id+"\");'>&nbsp;<span style='color:#4040b0;'>" + long_name + "</span><br>";
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
  if (!(done_achievements.includes(which_one))){
    // This is a new achievement
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
  "view_achievements":"Open your <i class='material-icons' style='font-size:20px; vertical-align: middle;'>star</i> Achievements",
  "view_assignments":"Open your <i class='material-icons' style='font-size:20px; vertical-align: middle;'>assignments</i>Assignments",
  "view_help":"Open the <i class='material-icons' style='font-size:20px; vertical-align: middle;'>help</i> help section",
  "go_fullscreen":"Get rid of distractions by going <i class='material-icons' style='font-size:20px; vertical-align: middle;'>fullscreen</i> fullscreen",
  "drag_pole":"Drag a pole in the pole-zero map",
  "drag_zero":"Drag a zero in the pole-zero map",
  "drag_bode_mag":"Drag a transfer function in the Bode magnitude plot",
  "drag_bode_phase":"Drag a transfer function in the Bode phase plot",
  "drag_complex_pole":"Drag <b>two complex poles</b> in the pole-zero map",
  "hover_nyquist_-90":"Hover or click the Nyquist diagram at -90° on the unit circle",
  "drag_time_response":"Drag the <b>two complex poles</b> transfer function in the time domain",
  "drag_pole_to_right_half_plane":"Drag a pole in the pole-zero map into the right half plane",
  "drag_zero_to_right_half_plane":"Drag a zero in the pole-zero map into the right half plane",
  "start_quiz":"Start a <i class='material-icons' style='font-size:20px; vertical-align: middle;'>school</i> quiz",
  "add_graph":"Add <i class='material-icons' style='font-size:20px; vertical-align: middle;'>add</i> another graph",
  "set_input_to_impulse":"Change the input function to a dirac impulse",
  "python_script":"Get the Python script for any transfer function",
  "matlab_script":"Get the MATLAB script for any transfer function",
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

function update_achievements(){
  achievement_score = 100.0 * done_achievements.length / Object.keys(all_achievements).length;
  achievement_rank="";
  achievement_score_to_next_rank=-1;

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
  s += '<br><button type="button" class="close-window" onclick="toggle_achievements();"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>';

  s += "<center>";
  s += '<i class="material-icons" style="font-size: 28px;vertical-align: middle;">star</i>';
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
  let graph_space = document.getElementsByClassName("graph-space")[0];
  let graph_information_tabs = document.getElementsByClassName("graph-information-tabs")[0];
  let graph_information = document.getElementsByClassName("graph-information")[0];
  if(!checkbox_value){
    // Set to dark mode:
    background_color = color('hsb(0, 0%, 4%)');
    line_color = color('hsb(0, 0%, 22%)'); // Grey graph lines
    text_color = color('hsb(0, 0%, 100%)');
    angle_color = "#ff40ff";
    box_background_color = 120;  // The tooltip hover box
    graph_space.setAttribute("style","grid-column: 2;grid-row: 2;background:#292929;")
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
    graph_space.setAttribute("style","grid-column: 2;grid-row: 2;background:#fff;")
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

function updateToolbox(){
    let math_preferences = document.getElementsByClassName("math-preferences")[0];
    math_preferences.innerHTML =
    `
    <span style="font-weight:500;color:#777777;visibility:hidden">Bode plot preferences:</span>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>x-axis | tenth power from:</span>
      <div class="range-wrapper-bode">
        <input type="text" value="-2">
        <span style="margin: 0 6px 0 6px">to </span>
        <input type="text" value="4">
      </div>
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>y-axis | dB from:</span>
      <div class="range-wrapper-bode2">
        <input type="text" value="-60">
        <span style="margin: 0 6px 0 6px">to </span>
        <input type="text" value="60">
      </div>
    </div>
    <div class="expression-wrapper" style="margin-bottom:15px;visibility:hidden">
      <span>Phase correction:</span>
      <input type="checkbox" id="phase_correction_checkbox" style="width:15px;height:15px;" checked="checked" onchange="redraw_canvas_gain('all')">
    </div>
    `
    let x_inputs = math_preferences.getElementsByClassName("range-wrapper-bode")[0].getElementsByTagName("input");
    let x_min = x_inputs[0];
    let x_max = x_inputs[1];
    x_min.oninput = function(){
      let min_tenth_power_value = roundup_decimal(x_min.value);
      let max_tenth_power_value = roundup_decimal(x_max.value);
      min_10power = min_tenth_power_value;
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
      redraw_canvas_gain("all");
    }
    x_max.oninput = function(){
      let min_tenth_power_value = roundup_decimal(x_min.value);
      let max_tenth_power_value = roundup_decimal(x_max.value);
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
      redraw_canvas_gain("all");
    }
    let y_inputs = math_preferences.getElementsByClassName("range-wrapper-bode2")[0].getElementsByTagName("input");
    let y_min = y_inputs[0];
    let y_max = y_inputs[1];
    y_max.oninput = function(){
      let new_max = value_magnet(y_max.value,20);
      let new_min = value_magnet(y_min.value,20);
      gain_upper_bound = new_max;
      y_case_gain = (new_max - new_min)/20;
      redraw_canvas_gain("all");
    }
    y_min.oninput = function(){
      let new_max = value_magnet(y_max.value,20);
      let new_min = value_magnet(y_min.value,20);
      y_case_gain = (new_max - new_min)/20;
      redraw_canvas_gain("all");
    }

    math_preferences.innerHTML +=
    `
    <span style="font-weight:500;color:#777777;visibility:hidden">Time response preferences:</span>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>x-axis | time from:</span>
      <div class="range-wrapper-time">
        <span style="font-size:14px;margin-top:2px;font-family:Arial">0</span>
        <span style="margin: 0 6px 0 6px">to </span>
        <input type="text" value="10">
      </div>
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>y-axis | from:</span>
      <div class="range-wrapper-time">
        <input type="text" value="0">
        <span style="margin: 0 6px 0 6px">to </span>
        <input type="text" value="10">
      </div>
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>Graph precision:</span>
      <input type="range" id="precision-range" name="" value="4" step="1" min="1" max="6" onchange="changeStrokeWeight()">
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>Automatic range:</span>
      <input id="automatic-range-time" type="checkbox" name="" value="" style="width:15px;height:15px;" checked="checked">
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>Additional information:</span>
      <input id="addition-information" type="checkbox" name="" value="" style="width:15px;height:15px;" checked="checked">
    </div>

    `
    let time_input = math_preferences.getElementsByClassName("range-wrapper-time")[0].getElementsByTagName("input")[0];
    let auto_range_checkbox = document.getElementById("automatic-range-time");
    let precision_range = document.getElementById("precision-range");
    let timerep_inputs = math_preferences.getElementsByClassName("range-wrapper-time")[1].getElementsByTagName("input");
    let timerep_min = timerep_inputs[0];
    let timerep_max = timerep_inputs[1];

    precision_range.onchange = function(){
      precision = 7 - precision_range.value;
      redraw_canvas_gain("all");
    }

    auto_range_checkbox.onchange = function(){
      if(!auto_range_checkbox.checked){
        max_y_timerep = timerep_max.value;
        min_y_timerep = timerep_min.value;
      }
      redraw_canvas_gain("all");
    }

    timerep_max.onchange = function(){
      if(!isNaN(timerep_max.value)){
        max_y_timerep = timerep_max.value;
        redraw_canvas_gain("all");
      }
    }

    timerep_min.onchange = function(){
      if(!isNaN(timerep_min.value)){
        min_y_timerep = timerep_min.value;
        redraw_canvas_gain("all");
      }
    }

    time_input.oninput = function(){
      max_x_timerep = time_input.value;
      if(max_x_timerep != 0){
        redraw_canvas_gain("all");
      }
    }

    math_preferences.innerHTML +=
    `
    <span style="font-weight:500;color:#777777;visibility:hidden">Nyquist preferences:</span>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>x-axis | from:</span>
      <div class="range-wrapper-nyquist">
        <input type="text" value="-1">
        <span style="margin: 0 6px 0 6px">to </span>
        <input type="text" value="1">
      </div>
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>y-axis | max/min:</span>
      <div class="range-wrapper-nyquist">
        <span style="margin: 0 6px 0 0">at </span>
        <input type="text" value="1">
      </div>
    </div>
    <div class="expression-wrapper" style="visibility:hidden">
      <span>Automatic range:</span>
      <input id="automatic-range-nyq" type="checkbox" name="" value="" style="width:15px;height:15px;" checked="checked">
    </div>
    `
    let auto_range_checkbox2 = document.getElementById("automatic-range-nyq");
    let range_inputs2 = math_preferences.getElementsByClassName("range-wrapper-nyquist");
    let x_inputs2 = range_inputs2[0].getElementsByTagName("input");
    let y_inputs2 = range_inputs2[1].getElementsByTagName("input");
    let x_min2 = x_inputs2[0];
    let x_max2 = x_inputs2[1];
    let y_min2 = y_inputs2[0];

    auto_range_checkbox2.onchange = function(){
      if(!auto_range_checkbox2.checked){
        min_nyquist_x = x_min2.value;
        max_nyquist_x = x_max2.value;
        max_nyquist_y = y_min2.value;
      }
      redraw_canvas_gain("all");
    }

    x_min2.oninput = function(){
      if(!isNaN(x_min2.value)){
        min_nyquist_x = x_min2.value;
        redraw_canvas_gain("all");
      }
    }

    x_max2.oninput = function(){
      if(!isNaN(x_max2.value)){
        max_nyquist_x = x_max2.value;
        redraw_canvas_gain("all");
      }
    }

    y_min2.oninput = function(){
      if(!isNaN(y_min2.value) || y_min2.value == 0){
        min_nyquist_y = 0;
        max_nyquist_y = y_min2.value;
        redraw_canvas_gain("all");
      }
    }
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
  let settling_time = sub_information[0].getElementsByClassName("value")[4];
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
      if(isNaN(current_graph.bode_settling_time)){
        settling_time.innerHTML = "NaN";
      }
      else{
        settling_time.innerHTML = current_graph.bode_settling_time.toFixed(3) + "s";
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
  canvas_width = this_window_width - 395;
  canvas_height = windowHeight - 110;
  graph_width = (canvas_width - 100)*2/5;

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


function setup(){
  setGraphDimensions();
  let canvas = createCanvas(canvas_width,canvas_height);
  canvas.parent('sketch_holder');
  colorMode(HSB,360);
  background_color = color('hsb(0, 0%, 4%)');
  box_background_color = 120;
  line_color = color('hsb(0, 0%, 22%)');  // Grey graph lines
  text_color = color('hsb(0, 0%, 100%)');
  angle_color = "#ff40ff";
  // To go from "T_1" to the index in range_slider_variables:
  for(let i=0; i<range_slider_alphabet.length; i++){
    variable_position[range_slider_alphabet[i]] = i;
  }
  id_bank=0;
  // Add the initial startup graphs:
  for(let graph_no=0; graph_no<NOF_GRAPHS_AT_STARTUP; graph_no++){
    let graph_to_add = GRAPH_ORDER[graph_no];
    addNewGraph(null, graph_to_add);
  }
  next_graph_no_to_add = NOF_GRAPHS_AT_STARTUP;
  noLoop();
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
  let linked_x = Math.round(Math.abs(T) / 10.0 * graph_step_response_width/precision);
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
  if(document.getElementById("automatic-range-time").checked){
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
  }
  // Make sure that "0" is kind of stable if we have 'almost zero':
  if (Math.abs(min_y_timerep) < 0.1){
    min_y_timerep = Math.round(min_y_timerep);
  }
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

//function mouseClicked(){
function mousePressed(){
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

  // Decide what we clicked on initially, to know what to move.
  // Reset what we've clicked on:
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable = "";
  clicked_on_pole_zero_graph_no = -1;

  const boxes_to_not_handle_clicks_in=['.download_script_box','.toolbox','.help','.achievements_box','.assignments_box'];
  for (let box_no in boxes_to_not_handle_clicks_in){
    let box = document.querySelector(boxes_to_not_handle_clicks_in[box_no]);
    if (box.classList.contains('active')){
      //See if user clicked inside one of these boxes:
      const rect = box.getBoundingClientRect();
      if ((mouseX>=rect.left)&&(mouseX<=rect.right)&&(mouseY>=rect.top)&&(mouseY<=rect.bottom)){
        //// Disable mouse clicks to prevent poles & zeros from moving "underneath" this box:
        return true; // Let system handle mouse after this
      }
    }
  }

  // Check if we've clicked any of the pole-zero graphs:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if ((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
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
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      quiz_clicked_time_response_xaxis(time);
      return false; // Cancel default actions
    }


  // Check if we've clicked the step response graph:
  } else if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    ((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset)){
    let queue = [];
    let yes_close_enough = false;
    let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
    for(let h=0; h<bode_graphs.length; h++){
      if((bode_graphs[h].bode_displaybool)&&(bode_graphs[h].bode_display_timeresponse_bool)&&(!(bode_graphs[h].full_name.startsWith("Ghost")))) {
        let current_graph = bode_graphs[h];
        let linked_y = current_graph.bode_timerep_array[linked_x];
        let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough = true;
          queue.push([distance,h,linked_y]);
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
    if (current_quiz!="none"){
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      let amplitude=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
      quiz_clicked_time_response(clicked_on_time_response_graph_no,time,amplitude,clicked_on_time_variable);
      return false; // Cancel default actions
    } else {
      mouseDragged(); // Handle this directly
      return false; // Cancel default actions
    }


  // Check if we've clicked the frequency axis of the Bode magnitude plot:
  } else if(((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset) &&
           (((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height)))) {
    if (current_quiz!="none"){
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
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)&&(!(bode_graphs[i].full_name.startsWith("Ghost")))){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_gain_array[math.round(linked_x)];
        let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough = true;
          queue.push([distance,i,screen_y,linked_y]);
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
      }
    }
    if (current_quiz!="none"){
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      quiz_clicked_bode_mag(clicked_on_bode_mag_graph_no,frequency,magnitude,clicked_on_time_variable);
      return false; // Cancel default actions
    }
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  // Check if we're dragging the Nyquist diagram:
  } else if(((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && ((mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset)) &&
            ((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height)) {
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
      let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_y = linked_y / graph_bode_phase_height;
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase_yaxis(phase);
      return false; // Cancel default actions
    }


  // Check if we've clicked the bode phase plot:
  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height)){
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
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)&&(!(bode_graphs[i].full_name.startsWith("Ghost")))){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_phase_array[math.round(linked_x)];
        let screen_y = graph_bode_phase_y_offset + map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
        let distance = Math.abs(mouseY - graph_bode_phase_y - screen_y);
        if(distance < 70){
          yes_close_enough = true;
          queue.push([distance,i,screen_y,linked_y]);
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
      }
    }
    if (current_quiz!="none"){
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase(clicked_on_bode_phase_graph_no,frequency,phase,clicked_on_time_variable);
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
  }

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


function drag_T_in_step_response(T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  T_x = T_x + mouseDiffX * 10.0;
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_T_in_Bode(T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  T_x = T_x * (1.0 - mouseDiffX*10.0);
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_k_in_step_response(k_to_change,mouseDiffY,y_range){
  let k = range_slider_variables[variable_position[k_to_change]];
  k = k - mouseDiffY * y_range;
  range_slider_variables[variable_position[k_to_change]] = k;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[k_to_change]).value = k.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[k_to_change]).value = k.toFixed(2);
}

function drag_k_in_Bode(k_to_change,mouseDiffY){
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

function mouseDragged(){
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
      redraw_canvas_gain(bode_graphs[i].bode_id);

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
      T_x = T_x + mouseDiffX * 10.0;
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
      redraw_canvas_gain(bode_graphs[i].bode_id);

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
      redraw_canvas_gain(bode_graphs[i].bode_id);

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
              redraw_canvas_gain(bode_graphs[i].bode_id);

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


function mouseMoved(){
  redraw();

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
  if(document.getElementById("automatic-range-time").checked){
    max_y_timerep = +(get_bestMultiple(max_y_timerep, y_step, "upper") + y_step).toFixed(2);
  }
  else{
    max_y_timerep = +(get_bestMultiple(max_y_timerep, y_step, "upper")).toFixed(2);
  }
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
    this.bode_settling_time = 0;
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
    let fivePercent = fivePercentTimeResponse(this.bode_timerep_array);
    this.bode_settling_time = fivePercent;
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
    for(let x=0; x<this.bode_timerep_array.length; x++){
      let screen_y = map(this.bode_timerep_array[x],min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
      vertex(x*precision,screen_y);
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
let range_slider_variables = [2.718281828459045,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001];
let range_slider_alphabet = ['e','a','b','c','d','f','g','h','i','j','l','L','m','n','o','p','q','r','t','u','v','x','y','k_1','k_2','k_3','k_4','k_5','k_6','w','z','T_1','T_2','T_3','T_4','T_5','T_6','T_7','T_8'];
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
    let linked_array_pos = map(a_bound,min_10power,min_10power + x_case_gain,0,graph_width-1);
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
  let f_a = input_array[Math.ceil(map(a_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + Math.PI;
  let f_b = input_array[Math.ceil(map(b_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + Math.PI;
  if(f_a * f_b < 0 && Math.abs(f_a) > 0.005 && Math.abs(f_b) > 0.005){
    for(let h=0; h<20; h++){
      let mid_point = (a_bound + b_bound)/2;
      let f_mid = input_array[Math.ceil(map(mid_point,min_10power,min_10power + x_case_gain,0,graph_width-1))] + Math.PI;
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

function fivePercentTimeResponse(input_array){
  let final_value = +getTimeValues(max_x_timerep + 50).toFixed(3);
  let values = [];
  for(let h=0; h<input_array.length; h++){
    let ratio = Math.abs(input_array[h] - final_value)/final_value;
    if(Math.abs(ratio - 0.05) < 0.001){
      values.push(map(h,0,input_array.length,0,max_x_timerep));
    }
  }
  if(values.length == 0){
    return NaN;
  }
  else{
    return values[values.length-1];
  }
}


let is_fullscreen = false;
function toggle_fullscreen(){
  if (is_fullscreen == false){
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


function ready(){
  let add_button = document.getElementsByClassName("add-graph")[0];
  add_button.addEventListener('click',addNewGraphClicked);
  let setting_button = document.getElementsByClassName("option-button")[0];
  setting_button.addEventListener('click',toolboxMenuToggle);
  let input_equation = document.getElementsByClassName("input-equation")[0].getElementsByClassName("formula")[0];
  input_equation.addEventListener('input',updateInputFormula);
  // Make sure that input function selector is visible:
  let toggleElement = document.querySelector('.input-equation');
  toggleElement.classList="active";
  // Enable gamification from start:
  toggle_gamification();
  toggle_assignments();
  set_difficulty_level({value:50});
  toggle_quiz_enabled();
  updateToolbox();

  document.addEventListener('keydown', function(event) {
    console.log(event.key);
    if (event.key=='F1'){
      toggle_quiz_enabled();
    }
    if (event.key=='F2'){
      start_quiz();
    }
    if (event.key=='F3'){
      quiz_correct();
      update_quiz();
    }
    if (event.key=='Escape'){
      restart_lupze();
    }
  });
}

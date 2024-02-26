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
const GRAPH_TWO_REAL_POLES = {name:"Two real poles", mf:"\\frac{k_2}{(1+T_2s)(1+T_3s)}", formula:"k_2/(1+T_2s)*1/(1+T_3s)"};
const GRAPH_TWO_COMPLEX_POLES = {name:"Two complex poles", mf:"\\frac{k_3w^2}{s^2+2zws+w^2}", formula:"k_3*w^2/(s^2+2*z*w*s+w^2)"};
const GRAPH_TIME_DELAY = {name:"Time delay", mf:"\\frac{3}{1+s}e^{-Ls}", formula:"3/(1+s)*e^(-L*s)"};
const GRAPH_ONE_ZERO_TWO_POLES = {name:"One zero two poles", mf:"\\frac{k_4(1+T_8s)}{(1+T_6s)(1+T_7s)}", formula:"k_4(1+T_8s)/(1+T_6s)*1/(1+T_7s)"};
const GRAPH_FOUR_POLES = {name:"Four poles", mf:"\\frac{1}{(1+T_5s)^4}", formula:"1/((1+T_5s)^4)"};
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

// Bad, because the Nyquist diagram gets very wide:
//  addNewGraph(null, mathfield_string="\\frac{4}{s^2+1}", equation_string="4/(s^2+1)","Oscillator");
//  addNewGraph(null, mathfield_string="\\frac{4(s+1)}{s^2+s+1}", equation_string="4(s+1)/(s^2+s+1)","2poles+1zero");
//  addNewGraph(null, mathfield_string="\\frac{5(s+1)*6}{s^2+2s+6}", equation_string="5(s+1)*6/(s^2+2s+6)","Complex");
// Some day, make a pole-zero plot that can handle this case:
//  addNewGraph(null, mathfield_string="\\frac{0.9s+1}{(s+1)^2}\\frac{w^2}{s^2+2zws+w^2}", equation_string="(0.9s+1)/((s+1)^4)","4 poles + 1 zero");


let graph_width = 1200;

let min_10power = -2;
let rate = 1.4;
let precision = 4;

let x_case_gain = 5;
let y_case_gain = 6;

let bode_graphs = [];

let phase_lower_bound = 0;
let phase_upper_bound = 0;
let gain_upper_bound = 60;
let phase_case_number;

//                              red   yellow    green     blue  magenta       orange        green
let color_table = [     270,    350,      32,     170,     202,-90+5*81,-90-360+6*81,-90-360+7*81,-90-360+8*81,-90-360+9*81,-90-360+10*81,-90-360+11*81,-90-360+12*81,-90-360+13*81,-90-360+14*81,-90-360+15*81];
let screenshot_number = 0;

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
let graph_step_response_width;
let graph_step_response_height;
let graph_step_response_x;
let graph_step_response_y;
const graph_step_response_x_offset = 65;
const graph_step_response_y_offset = 40;
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

const PI = 3.141592653589793238;

let id_bank = 1;
let current_tab = 0;

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
  console.log(input_formula);
  if ((input_formula.includes("/(s^2)")) ||
      (input_formula.includes("/(s⋅s)")) ||
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

function createRangeSlider(event){
  let slider = document.createElement('div');
  let button = event.target;
  let button_id = button.id.split("_")[2];
  let variable_name = range_slider_alphabet[button_id];
  let range_min=0.1;
  let range_max=20;
  let range_value=1.0;
  if (variable_name == "L"){
    range_min=0.0;
    range_max=3.0;
    range_value=0.0;
  } else if (variable_name == "k_1"){
    range_min=-4.0;
    range_max=20.0;
    range_value=4.0;
  } else if (variable_name == "k_2"){
    range_min=-4.0;
    range_max=20.0;
    range_value=2.0;
  } else if (variable_name == "k_3"){
    range_min=-4.0;
    range_max=20.0;
    range_value=0.7;
  } else if (variable_name == "k_4"){
    range_min=-4.0;
    range_max=20.0;
    range_value=2.5;
  } else if (variable_name == "z"){
    range_min=0.0;
    range_max=1.2;
    range_value=0.20;
  } else if (variable_name == "T_1"){
    range_value=0.6;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_2"){
    range_value=0.6;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_3"){
    range_value=2.0;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_4"){
    range_value=1.0;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_5"){
    range_value=1.0;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_6"){
    range_value=1.0;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_7"){
    range_value=1.0;
    range_min=0.0;
    range_max=10.0;
  } else if (variable_name == "T_8"){
    range_value=1.0;
    range_min=-10.0;
    range_max=10.0;
  } else if (variable_name == "q"){
    range_min=0.01;
    range_max=1.0;
    range_value=0.1;
  } else if (variable_name == "v"){
    range_min=0.1;
    range_max=20.0;
    range_value=4.5;
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

    let variable_name = range_slider_alphabet[button_id];
    if ((variable_name == "k_1")||(variable_name == "T_1")){
      // Make information bar "1" active:
      let info_tab = document.getElementById("graph_1_info");
      info_tab.checked = "true";
    } else if ((variable_name == "k_2")||(variable_name == "T_2")||(variable_name=="T_3")){
      // Make information bar "2" active:
      let info_tab = document.getElementById("graph_2_info");
      info_tab.checked = "true";
    } else if ((variable_name == "w")||(variable_name == "z")||(variable_name=="k_3")){
      // Make information bar "2" active:
      let info_tab = document.getElementById("graph_3_info");
      info_tab.checked = "true";
    } else if (variable_name == "L"){
      // Make information bar "3" active:
      let info_tab = document.getElementById("graph_4_info");
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
  let s =
  `
  <hr>
  <div class="equation">
    <input type="checkbox" class="show-graph" style="background: hsl(${linked_color},100%,50%)" title="${graph_name}">
    <math-field `
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

//  let new_bode_graph = new bode_graph(id_bank,'1/(10+p)');
//  let new_bode_graph = new bode_graph(id_bank,'2/(10+0.5*p^2+p)');
  let new_bode_graph = new bode_graph(id_bank,equation_string);
  bode_graphs.push(new_bode_graph);
  new_bode_graph.graph_name = graph_name;


  let input_element_id = id_bank;
  for(let i=0; i<bode_graphs.length; i++){
    let current_bode_graph = bode_graphs[i];
    if(parseInt(input_element_id) == current_bode_graph.bode_id){
//      current_bode_graph.bode_formula = "k_1/(s+1)";
//      checkSlider(input_element_id);

      // Create sliders for all included variables directly:
      let event={};
      event.target={};
      let equation_id=input_element_id; // The DOM number of the equation
      // Search for all variables in the equation_string:

      for(let i=NOF_CONSTANT_VARIABLES; i<range_slider_alphabet.length; i++){
        //let letter_id=i; // The variable position in the variable array.
        let current_letter = range_slider_alphabet[i];
        if(equation_string.includes(current_letter)){
//          console.log("# found variable " + current_letter);
          //let linked_button = document.getElementById("BTNS_" + equation_id.toString() + "_" + i.toString());
          range_slider_variables[i] = 1.0;  // Initial value
          event.target.id="BTNS_" + equation_id.toString() + "_" + i.toString();
          createRangeSlider(event);
        }
      }
    }
  }
  addNewInformationTab(id_bank, graph_name);
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
  linked_tab.remove();
  linked_label.remove();
}

function removeGraph(event){
  let clicked_button = event.target;
  let linked_equation = clicked_button.parentElement.parentElement;
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
  linked_equation.parentElement.remove();

  //Now also remove any variables that belongs to this equation:
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
  }
  for(let i=0; i<variables_to_delete.length; i++){
    let variable_to_delete = variables_to_delete[i];
    let button = document.getElementById("RANGE_" + variable_position[variable_to_delete]);
    let linked_id = button.parentElement.parentElement.getElementsByClassName("range-slider")[0].id.split("_")[1];
    range_slider_variables[linked_id] = 18012001;
    let slider = button.parentElement.parentElement.parentElement;
    slider.remove();
  }

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
    console.log('Content copied to clipboard');
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
<button type="button" class="delete-graph" onclick="hide_script()"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
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


//# Time discrete version:
//time, response = ctrl.step_response(system)
//plt.plot(time, response)
//plt.title('Step Response')
//plt.xlabel('Time')
//plt.ylabel('Amplitude')
//plt.grid(True)
//plt.show()
//# Convert to discrete-time transfer function with zero-order hold (zoh):
//time_resolution = 0.05
//discrete_transfer_function = ctrl.sample_system(transfer_function, time_resolution, method='zoh')
//# Plot discrete-time pole-zero map
//plt.figure(4)
//ctrl.pzmap(discrete_transfer_function)
//plt.title('Discrete-Time Pole-Zero Map')
//# Plot step response of discrete-time system
//time_discrete, response_discrete = ctrl.step_response(discrete_transfer_function)
//plt.figure(5)
//plt.plot(time_discrete, response_discrete)
//plt.title('Discrete-Time Step Response')
//plt.xlabel('Time')
//plt.ylabel('Amplitude')
//plt.grid(True)
//plt.show()
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

//% Time discrete version:
//time_resolution = 0.05;
//discrete_transfer_function = c2d(transfer_function, time_resolution, 'zoh')
//figure(4)
//pzmap(discrete_transfer_function)
//figure(5)
//step(discrete_transfer_function, 1)

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
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.toggle('active');
  update_assignments();
}


function assignment_done (which_one){
  if (!(done_assignments.includes(which_one))){
    // This is a new assignments
    done_assignments.push(which_one);

    if (assignments_enabled==true){
      // Trigger an animation with the text:
      let achievement_text_div = document.getElementById("achievement_text");
      achievement_text_div.innerHTML=all_assignments[which_one];
      let left = (100*mouseX /windowWidth);
      if (left > 85) left = 85;
      let top = (100*mouseY/windowHeight);
      if (top > 90) left = 90;
      document.querySelector('.achievement_text').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_text').style.setProperty('--top',top+"%");
      document.querySelector('.achievement_star').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_star').style.setProperty('--top',top+"%");
      let achievement_star_div = document.getElementById("achievement_star");
      // Order of the animation parameters:
      //div {
      //  animation-name: example;
      //  animation-duration: 5s;
      //  animation-timing-function: linear;
      //  animation-delay: 2s;
      //  animation-iteration-count: infinite;
      //  animation-direction: alternate;
      //}
      achievement_text_div.style.animation = 'none';
      achievement_text_div.offsetHeight; /* trigger reflow */
      achievement_text_div.style.animation="MoveToStar 7s ease-in-out 0s 1";
      achievement_star_div.style.animation = 'none';
      achievement_star_div.offsetHeight; /* trigger reflow */
      achievement_star_div.style.animation="MoveToStar2 8s ease-out 0s 1";
      if (sound_enabled==true){
        play_jingle();
      }
    }
    update_assignments();
  } else {
    // This has already been done. No need to do anything.
  }
}

const all_assignments={
  "one_pole":{t:"Investigate a system with <b>one pole</b>",tasks:["T1=2","T1_pole=-2","k1_3","T1_k1_bode","T1_unstable"],info:"This is one of the basic system responses, where high frequencies are attenuated."},
  "two_real_poles":{t:"Investigate a system with <b>two real poles</b>",tasks:["T2,T3_phase","T2,T3=1;k2=0.5","T2=10;T3=0.5","two_real_poles1"],info:"When combining two poles, the phase goes all the way to -180 degrees."},
//  "two_complex_poles":{t:"Investigate a system with <b>two complex poles</b>",tasks:["low_z"],info:"A set of two complex poles will make a system oscillate."},
//  "time_delay":{t:"See how a <b>time delay</b> affects stability",tasks:["k_above_or_equal_100","set_input_to_ramp"],info:"A time delayed system is more difficult to control."},
//  "one_zero_two_poles":{t:"Investigate a system with <b>one zero two poles</b>",tasks:["set_input_to_ramp"],info:"With more poles and zeros, the phase response and the critical magnitude at -180 degrees needs to be considered when using a feedback loop."},
//  "nyquist":{t:"Check out the <b>Nyquist diagram</b>",tasks:["k_above_or_equal_100","set_input_to_ramp"],info:"Named after Harry Nyquist 1889-1976, a Swedish-American physicist and electronic engineer."}
};
let done_assignments=["nyquist"];

const all_tasks={



// ToDo:
//## One pole
//"reference eq in step response(k=0.65, T1=2)"
"T1=2":"Change T1 so that the pole is placed in -1/2",//. (T1=2)
"T1_pole=-2":"Drag the pole in the pole-zero map so the system is four times faster",//. (pole in -2)
"k1_3":"Drag the step respomse so that the static gain is 3",//. (k1=3)
"T1_k1_bode":"Drag the Bode plots so that the step reponse follows the dotted line",// (k=0.65, T1=2)
"T1_unstable":"Make the pole unstable",

//## Two real poles
"T2,T3_phase":"Change T2 and T3 so that the Bode phase curve is as the dotted one",//. (T2=0.05, T3=5.0)
"T2,T3=1;k2=0.5":"Drag the poles in the pole-zero map so that the step response follows the dotted line",// (T2=T3=1, k2=0.5)
"T2=10;T3=0.5":"Drag the poles in the pole-zero map so that the cutoff frequencies in the bode plot are 0.1 rad/s and 2rad/s",//. (T2=10, T3=0.5 eller vice versa)
"two_real_poles1":"Drag the bode diagram so that the Phase margin for the system is 55 degrees with a gain crossover frequency of 2.68 rad/s",

  "hover_nyquist_-90":"Hover the Nyquist diagram at -90 degrees on the unit circle",
  "set_input_to_impulse":"Change the input function to a dirac impulse",
  "change_L":"Change time delay L in the <b>time delay</b> transfer function",
  "low_z":"Make damping factor z for <b>two complex poles</b> less than 0.1",
  "T2_T3_far_apart":"Separate <b>two real poles'</b> time constants a factor 100 apart",
  "k_above_or_equal_100":"Change a transfer function to have a magnitude k≥100",
  "set_input_to_ramp":"Change the input to a ramp function"
};
let done_tasks=["set_input_to_ramp"];


function update_assignments(){
  let assignments_box = document.querySelector('.assignments_box');
  let s = "";
  s += '<br><button type="button" class="delete-graph" onclick="toggle_assignments_box();"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>';

  s += "<center>";
  s += '<i class="material-icons" style="font-size: 27px;">assignments</i>';
  s += "Your Assignments ";
  s += "</center><br>";

  s += "Please select an assignment:<br>";
  for (let assignment_id in all_assignments){
    if (!(done_assignments.includes(assignment_id))){
      let long_name = all_assignments[assignment_id].t;
      s += "<input type='radio' name='assignment' id='"+assignment_id+"' value='"+assignment_id+"' onchange='select_assignment(this);'";
      if (current_assignment == assignment_id){
        s+=" checked";
      }
      s+="><label for='"+assignment_id+"'>&nbsp;" + long_name + "</label><br>";
    }
  }
  s += "<input type='radio' name='assignment' id='none' value='none' onchange='select_assignment(this);'";
  if (current_assignment == "none"){
    s+=" checked";
  }
  s += "><label for='none'>&nbsp;...no assignment</label><br>";
  s += "<br><b>" + (done_assignments.length) + "/"+Object.keys(all_assignments).length+"</b> done so far.<br><br>";

  s+="Completed assignments:<br>";
  for (let assignment_id in all_assignments){
    if (done_assignments.includes(assignment_id)){
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
  assignments_box.innerHTML=s;

}

function select_assignment(event){
  current_assignment = event.value;
  update_tasks();
}

function update_tasks(){
  let task_div=document.getElementById("task_list");
  if (current_assignment=="none"){
    task_div.innerHTML = '<div class="yellow_hover"><center><span onclick="addNewGraph();" style="color:#b0b0b0">Click <i class="material-icons" style="font-size:28px; vertical-align: middle;">add</i> or here to add next graph</span></center></div>';
    return;
  }

  let s="";
  // List all tasks not yet done:
  s += "<center><b>Your tasks:</b></center><br>";
  let nof_done_subtasks = 0;
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        nof_done_subtasks+=1;
      } else {
        let long_name = all_tasks[task_id];
        s += "<input type='checkbox'>&nbsp;" + long_name + "<br><br>";
      }
    }
  }

  s += "<br><center><b>Completed tasks:</b></center><br>";
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        let long_name = all_tasks[task_id];
        s += "<input type='checkbox' checked>&nbsp;" + long_name + "<br>";
      }
    }
  }
  s += "<br><b>" + (nof_done_subtasks) + "/"+Object.keys(all_assignments[current_assignment].tasks).length+"</b> done so far.<br>";
  s += "<br><br><center>"+all_assignments[current_assignment].info+"</center>";
  task_div.innerHTML=s;

}

// ----------------------
// Gamification

let gamification_enabled = false;
let sound_enabled=0; // 1 means "audio context needs to be initialized". true means "everything works"
                     // 0 means "audio context needs to be initialized". false means "everything works but don't play anything"

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
      // Order of the animation parameters:
      //div {
      //  animation-name: example;
      //  animation-duration: 5s;
      //  animation-timing-function: linear;
      //  animation-delay: 2s;
      //  animation-iteration-count: infinite;
      //  animation-direction: alternate;
      //}
      achievement_text_div.style.animation = 'none';
      achievement_text_div.offsetHeight; /* trigger reflow */
      achievement_text_div.style.animation="MoveToStar 7s ease-in-out 0s 1";
      achievement_star_div.style.animation = 'none';
      achievement_star_div.offsetHeight; /* trigger reflow */
      achievement_star_div.style.animation="MoveToStar2 8s ease-out 0s 1";

      if (sound_enabled==true){
        play_jingle();
      }
    }

    update_achievements();
  } else {
    // This has already been done. No need to do anything.
  }
}

const all_achievements={
  "view_achievements":"Open your achievements",
  "view_help":"Open the help section",
  "drag_pole":"Drag a pole in the s-domain",
  "drag_zero":"Drag a zero in the s-domain",
  "drag_bode_mag":"Drag a transfer function in the Bode magnitude plot",
  "drag_bode_phase":"Drag a transfer function in the Bode phase plot",
  "drag_complex_pole":"Drag <b>two complex poles</b> in the s-domain",
  "hover_nyquist_-90":"Hover the Nyquist diagram at -90 degrees on the unit circle",
  "drag_time_response":"Drag the <b>two complex poles</b> transfer function in the time domain",
  "drag_pole_to_right_half_plane":"Drag a pole in the s-domain into the right half plane",
  "drag_zero_to_right_half_plane":"Drag a zero in the s-domain into the right half plane",
  "add_graph":"Add another graph",
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

let done_achievements=[];
let achievement_score=0;
let achievement_rank="";
let achievement_score_to_next_rank=0;

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
  s += '<br><button type="button" class="delete-graph" onclick="toggle_achievements();"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>';

  s += "<center>";
  s += "Your Achievements ";
  s += '<i class="material-icons" style="font-size: 27px;">star</i>';
  s += "</center><br>";
  for (let achievement_id in all_achievements){
    if (done_achievements.includes(achievement_id)){
      let long_name = all_achievements[achievement_id]
      s += "<input type='checkbox' checked>&nbsp;" + long_name + "<br>";
    }
  }
  s += "<br>Your Score: <b>" + achievement_score.toFixed(1) + "/100</b><br>";
  s += "Your Rank: <b>" + achievement_rank + "</b><br><br>";

  if (done_achievements.length == Object.keys(all_achievements).length){
    s += "<center>Well done! You're one in a million, Legend.</center><br>";
  } else {
    s += "Level up with another " + achievement_score_to_next_rank.toFixed(1) + " points:<br>";

//    s+="<center>Raise your score:</center><br>";
    for (let achievement_id in all_achievements){
      if (!(done_achievements.includes(achievement_id))){
        let long_name = all_achievements[achievement_id]
        s += "<input type='checkbox'>&nbsp;" + long_name + "<br>";
      }
    }
  }

  s += "<br>";
  achievements_box.innerHTML=s;

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
function init_jingle () {
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
function play_jingle () {
  console.log("Play jingle");
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
    // Check if the element is found
    if (checkedRadio) {
      // Select the corresponding label using the adjacent sibling selector
      const labelElement = checkedRadio.nextElementSibling;
      // Set the CSS values as needed
      labelElement.style.background="#484848";
    }
  }
  else{
    // Set to light mode:
    background_color = color('hsb(0, 0%, 100%)');
    line_color = color('hsb(0, 0%, 64%)');
    text_color = color('hsb(0, 0%, 5%)');
    angle_color = "#ff40ff";
    box_background_color = 255;  // The tooltip hover box
    graph_space.setAttribute("style","grid-column: 2;grid-row: 2;background:#fff;")

//    graph_information_tabs.setAttribute("style","background:#fff")
    graph_information_tabs.style.background="#fff";
    graph_information.style.background="#ddd";

    const checkedRadio = document.querySelector('.graph-information-tabs input[type="radio"]:checked');
    // Check if the element is found
    if (checkedRadio) {
      // Select the corresponding label using the adjacent sibling selector
      const labelElement = checkedRadio.nextElementSibling;
      // Set the CSS values as needed
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
//    console.log("x_inputs=");
//    console.log(x_inputs);
    let x_min = x_inputs[0];
    let x_max = x_inputs[1];
    x_min.oninput = function(){
      let min_tenth_power_value = roundup_decimal(x_min.value);
      let max_tenth_power_value = roundup_decimal(x_max.value);
      min_10power = min_tenth_power_value;
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
//      console.log("xmin=" + x_case_gain);
      redraw_canvas_gain("all");
    }
    x_max.oninput = function(){
      let min_tenth_power_value = roundup_decimal(x_min.value);
      let max_tenth_power_value = roundup_decimal(x_max.value);
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
      redraw_canvas_gain("all");
    }
    let y_inputs = math_preferences.getElementsByClassName("range-wrapper-bode2")[0].getElementsByTagName("input");
//    console.log("y_inputs=");
//    console.log(y_inputs);
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
      console.log(precision);
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

function setGraphDimensions(){
  canvas_width = windowWidth - 395;
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

//Toolbox
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

//Drawing functions
function draw_bode_responses(type){
  if(type == "phase"){

    let min_phase = 10000;
    let max_phase = -10000;

    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        let current_graph = bode_graphs[i];
        if(current_graph.bode_min_phase < min_phase){
          min_phase = current_graph.bode_min_phase;
        }
        if(current_graph.bode_max_phase > max_phase){
          max_phase = current_graph.bode_max_phase;
        }
      }
    }

    // Limiting the phase axis into something sane:
    min_phase = Math.max(-5,min_phase);
    //max_phase = math.min(5,max_phase);

    min_phase = min_phase*180/PI;
    max_phase = max_phase*180/PI;

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
    text("phase",0,-30);
    text("[degrees]",0,-15);
    draw_loglines(x_case_gain,y_case_gain);
    text("angular freq [rad/s]",graph_bode_phase_width,graph_bode_phase_height+35);

    textAlign(RIGHT);
    textSize(15);

    for(let y=0; y<=phase_case_number; y++){
      stroke(line_color);
      strokeWeight(1);
      let pas = graph_bode_phase_height*y/phase_case_number;
      let value = phase_upper_bound - 45*y;
      line(0,pas,graph_bode_phase_width,pas);
      noStroke();
      fill(text_color);
      text(value,-7,pas+5);
    }

    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        let stop_on_overflow=false;
        if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
          // A workaround to not plot the high frequency way-off phase in the bode phase plot of GRAPH_TIME_DELAY with L > 1:
          stop_on_overflow=true;
        }
        bode_graphs[i].draw_phase(stop_on_overflow);
      }
    }

    // Draw X for T_1, T_2, T_3 and w:
    let rad_phase_lower_bound = phase_lower_bound*PI/180;
    let rad_phase_upper_bound = phase_upper_bound*PI/180;
    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        if(bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
          // Draw T_1:
          try{ // The graph may be deleted, so this might fail:
            let T_1 = range_slider_variables[variable_position["T_1"]];
            if (T_1 >= 0){
              let frequency = 1 / T_1;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
          // Draw T_2 and T_3:
          try{ // The graph may be deleted, so this might fail:
            let T_2 = range_slider_variables[variable_position["T_2"]];
            if (T_2 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_2;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
            let T_3 = range_slider_variables[variable_position["T_3"]];
            if (T_3 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_3;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
          // Draw w:
          try{ // The graph may be deleted, so this might fail:
            let w = range_slider_variables[variable_position["w"]];
            let z = range_slider_variables[variable_position["z"]];
            if (z <= 1){
              // One single frequency, so only one X in the graph:
              if (w >= 0){
                let frequency = w;
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
                let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
            } else {
              //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
              // We should draw 2 X in this graph:
              let bode_3_real_1 = z*w + w * Math.sqrt(z*z-1);
              let bode_3_real_2 = z*w - w * Math.sqrt(z*z-1);
              w = bode_3_real_1;
              if (w >= 0){
                let frequency = w;
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
                let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
              w = bode_3_real_2;
              if (w >= 0){
                let frequency = w;
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
                let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
            }
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
          // Draw T_4:
          try{ // The graph may be deleted, so this might fail:
            let T_4 = range_slider_variables[variable_position["T_4"]];
            if (T_4 >= 0){
              let frequency = 1 / T_4;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if(bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
          // Draw T_8, T_6 and T_7:
          try{ // The graph may be deleted, so this might fail:
            let T_6 = range_slider_variables[variable_position["T_6"]];
            if (T_6 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_6;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
            let T_7 = range_slider_variables[variable_position["T_7"]];
            if (T_7 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_7;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
            let T_8 = range_slider_variables[variable_position["T_8"]];
            if (T_8 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_8;
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
              let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              noFill();
              draw_O(screen_x,screen_y);
            }
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
    text("magnitude",0,-15);
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
      if(bode_graphs[i].bode_displaybool){
        bode_graphs[i].draw_gain();
      }
    }


    // Draw X for T_1, T_2, T_3 and w:
    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
          // Draw T_1:
          try{ // The graph may be deleted, so this might fail:
            let T_1 = range_slider_variables[variable_position["T_1"]];
            if (T_1 >= 0){
              let frequency = 1 / T_1;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
          // Draw T_2 and T_3:
          try{ // The graph may be deleted, so this might fail:
            let T_2 = range_slider_variables[variable_position["T_2"]];
            if (T_2 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_2;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
              stroke(bode_graphs[i].bode_hue,240,360);
            }
            let T_3 = range_slider_variables[variable_position["T_3"]];
            if (T_3 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_3;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
          // Draw w:
          try{ // The graph may be deleted, so this might fail:
            let w = range_slider_variables[variable_position["w"]];
            let z = range_slider_variables[variable_position["z"]];
            if (z <= 1){
              // One single frequency, so only one X in the graph:
              if (w >= 0){
                let frequency = w;
                // Need to map frequency to pixel:
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                // Now we know the x position. Let's find out the y position:
                let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
            } else {
              //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
              // We should draw 2 X in this graph:
              let bode_3_real_1 = z*w + w * Math.sqrt(z*z-1);
              let bode_3_real_2 = z*w - w * Math.sqrt(z*z-1);
              w = bode_3_real_1;
              if (w >= 0){
                let frequency = w;
                // Need to map frequency to pixel:
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                // Now we know the x position. Let's find out the y position:
                let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
              w = bode_3_real_2;
              if (w >= 0){
                let frequency = w;
                // Need to map frequency to pixel:
                let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
                // Now we know the x position. Let's find out the y position:
                let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
                stroke(bode_graphs[i].bode_hue,240,360);
                strokeWeight(3);
                draw_X(screen_x,screen_y);
              }
            }
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
          // Draw T_4:
          try{ // The graph may be deleted, so this might fail:
            let T_4 = range_slider_variables[variable_position["T_4"]];
            if (T_4 >= 0){
              let frequency = 1 / T_4;
              // Need to map frequency to pixel:
  //            console.log("frequency="+frequency);
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
  //            console.log("screen_x="+screen_x);
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
          } catch {}
        } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
          // Draw T_8, T_6 and T_7:
          try{ // The graph may be deleted, so this might fail:
            let T_6 = range_slider_variables[variable_position["T_6"]];
            if (T_6 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_6;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
              stroke(bode_graphs[i].bode_hue,240,360);
            }
            let T_7 = range_slider_variables[variable_position["T_7"]];
            if (T_7 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_7;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
            }
            let T_8 = range_slider_variables[variable_position["T_8"]];
            if (T_8 >= 0){
              // Now we know the x position. Let's find out the y position:
              let frequency = 1 / T_8;
              // Need to map frequency to pixel:
              let screen_x = (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              noFill();
              draw_O(screen_x,screen_y);
            }
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

function draw_time_responses(){
  if(document.getElementById("automatic-range-time").checked){
    min_y_timerep = 100000;
    max_y_timerep = -100000;

    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
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
  // Make sure that "0" is kind of stable if we have 'almost zero':
  if (Math.abs(min_y_timerep) < 0.1){
    min_y_timerep = Math.round(min_y_timerep);
  }

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
  text("output",0,-15);
  text("time [s]",graph_step_response_width,graph_step_response_height + graph_step_response_y_offset);
  draw_timelines();

  // Draw "final value":
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
        let k_1 = range_slider_variables[variable_position["k_1"]];
        let screen_y = map(k_1,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        let k_2 = range_slider_variables[variable_position["k_2"]];
        let screen_y = map(k_2,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
        let k_3 = range_slider_variables[variable_position["k_3"]];
        let screen_y = map(k_3,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
        let k_4 = 3;
        let screen_y = map(k_4,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        let k_4 = range_slider_variables[variable_position["k_4"]];
        let screen_y = map(k_4,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      }
    }
  }


  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
        // Draw T_1:
        try{ // The graph may be deleted, so this might fail:
          let T_1 = range_slider_variables[variable_position["T_1"]];
          if (T_1 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_1 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_1;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}
      } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // Draw T_2:
        try{ // The graph may be deleted, so this might fail:
          let T_2 = range_slider_variables[variable_position["T_2"]];
          if (T_2 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_2 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_2;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

        // Draw T_3:
        try{ // The graph may be deleted, so this might fail:
          let T_3 = range_slider_variables[variable_position["T_3"]];
          if (T_3 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_3 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_3;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

      } else if (bode_graphs[i].bode_formula == GRAPH_TIME_DELAY.formula){
        // Draw time delay L:
        try{ // The graph may be deleted, so this might fail:
          let L = range_slider_variables[variable_position["L"]];
          if (L >= 0){
            // Now we know the x position. Let's find out the y position:
            let T_1 = 1;
            let linked_x = Math.round((T_1+L) / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * (T_1 + L);
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

      } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // Draw T_6:
        try{ // The graph may be deleted, so this might fail:
          let T_6 = range_slider_variables[variable_position["T_6"]];
          if (T_6 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_6 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_6;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

        // Draw T_7:
        try{ // The graph may be deleted, so this might fail:
          let T_7 = range_slider_variables[variable_position["T_7"]];
          if (T_7 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_7 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_7;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

        // Draw T_8:
        try{ // The graph may be deleted, so this might fail:
          let T_8 = range_slider_variables[variable_position["T_8"]];
          if (T_8 >= 0){
            // Now we know the x position. Let's find out the y position:
            let linked_x = Math.round(T_8 / 10.0 * graph_step_response_width/precision);
            let linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            let screen_x = graph_step_response_width / 10 * T_8;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            noFill();
            draw_O(screen_x,screen_y);
          }
        } catch {}

      }
    }
  }

  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
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

  min_nyquist_x = -1;
  max_nyquist_x = 1;
  min_nyquist_y = -1;
  max_nyquist_y = 0.2;

  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
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
  rotate(-PI/2);
  text("Imaginary axis",0,0);
  pop();

  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
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
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
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
         (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)){
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
  text("Poles & zeros",graph_pole_zero_width/2,25);
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

//Update function
function windowResized(){
  setGraphDimensions();
  resizeCanvas(canvas_width,canvas_height);
  redraw_canvas_gain("all");
}

let bode_3_real = -1.0;
let bode_3_imaginary = 0.5;

let clicked_on_time_response_graph_no=-1;
let clicked_on_bode_mag_graph_no=-1;
let clicked_on_bode_phase_graph_no=-1;
let clicked_on_time_variable="";

let initial_mouseX = 0;
let initial_mouseY = 0;

//function mouseClicked(){
function mousePressed(){
  // Decide what we clicked on initially, to know what to move.

  if (sound_enabled==1){
    // Audio API stuff:
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

  let toggleElement = document.querySelector('.download_script_box');
  if (toggleElement.classList.contains('active')){
    // The code text is active. Just disable mouse clicks to prevent poles & zeros from moving:
    clicked_on_time_response_graph_no = -1;
    clicked_on_bode_mag_graph_no = -1;
    clicked_on_bode_phase_graph_no = -1;
    clicked_on_time_variable="";
    return true; // Let system handle mouse after this
  }

  // Reset what we've clicked on:
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable = "";

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
            //let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;

            if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
              // See if the user clicked on T_2 or T_3:
              let T_2 = range_slider_variables[variable_position["T_2"]];
              let T_3 = range_slider_variables[variable_position["T_3"]];
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
              if ((Math.abs(-1/T_8 - real) <= Math.abs(-1/T_6 - real)) && (Math.abs(-1/T_8 - real) <= Math.abs(-1/T_7 - real))){
                clicked_on_time_variable = "T_8";
              } else if ((Math.abs(-1/T_6 - real) <= Math.abs(-1/T_7 - real)) && (Math.abs(-1/T_6 - real) <= Math.abs(-1/T_8 - real))){
                clicked_on_time_variable = "T_6";
              } else {
                clicked_on_time_variable = "T_7";
              }
            }
            mouseDragged(); // Handle this directly
            return false; // Cancel default actions
          }
        }
      }
    }
  }


  // Check if we've clicked the step response graph:
  let queue = [];
  let yes_close_enough = false;
  if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    ((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset)){
    let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
    for(let h=0; h<bode_graphs.length; h++){
      let current_graph = bode_graphs[h];
      let linked_y = current_graph.bode_timerep_array[linked_x];
      let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
      let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
      if(distance < 70){
        yes_close_enough = true;
        queue.push([distance,h,linked_y]);
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
        let T_2_x = graph_step_response_width / 10 * T_2;
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_x = graph_step_response_width / 10 * T_3;
        if (Math.abs(T_2_x - (mouseX - graph_step_response_x - graph_step_response_x_offset)) < Math.abs(T_3_x - (mouseX - graph_step_response_x - graph_step_response_x_offset))){
          clicked_on_time_variable = "T_2";
        } else {
          clicked_on_time_variable = "T_3";
        }
      } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
        // If user clicked on ONE_ZERO_TWO_POLES,
        // we need to figure out if user wants to move T_8, T_6 or T_7:
        let T_8 = range_slider_variables[variable_position["T_8"]];
        let T_8_x = graph_step_response_width / 10 * T_8;
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_x = graph_step_response_width / 10 * T_6;
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_x = graph_step_response_width / 10 * T_7;
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
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  } else if(((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset)){
    // we clicked the bode magnitude plot. Let's find out which graph we clicked:
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
      if(bode_graphs[i].bode_displaybool){
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
        let T_2_frequency = 1 / T_2;
        let T_2_x = (Math.log(T_2_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_frequency = 1 / T_3;
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
        let T_8_frequency = 1 / T_8;
        let T_8_x = (Math.log(T_8_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_frequency = 1 / T_6;
        let T_6_x = (Math.log(T_6_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_frequency = 1 / T_7;
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
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions

  // Check if we're dragging the Nyquist diagram:
  } else if(((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && ((mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset)) &&
            ((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height)) {
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height)){
    // Check if we've clicked the bode phase plot:
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
//        console.log("# inside bode_phase graph, x="+linked_x+", y="+linked_y);
    let perc_x = linked_x / graph_bode_phase_width;
    let perc_y = linked_y / graph_bode_phase_height;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    let rad_phase_lower_bound = phase_lower_bound*PI/180;
    let rad_phase_upper_bound = phase_upper_bound*PI/180;
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
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
        let T_2_frequency = 1 / T_2;
        let T_2_x = (Math.log(T_2_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_3 = range_slider_variables[variable_position["T_3"]];
        let T_3_frequency = 1 / T_3;
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
        let T_8_frequency = 1 / T_8;
        let T_8_x = (Math.log(T_8_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_6 = range_slider_variables[variable_position["T_6"]];
        let T_6_frequency = 1 / T_6;
        let T_6_x = (Math.log(T_6_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_7 = range_slider_variables[variable_position["T_7"]];
        let T_7_frequency = 1 / T_7;
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
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions
  }

  // Let the system handle this click. It didn't touch anything we handle:
  return true;
}

function mouseReleased(){
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable="";
}

function mouseDragged(){
  let toggleElement = document.querySelector('.download_script_box');
  if (toggleElement.classList.contains('active')){
    // The code text is active. Just disable mouse drags to prevent poles & zeros from moving:
    return;
  }

  if (clicked_on_time_response_graph_no != -1){
    let i=clicked_on_time_response_graph_no;
    // Dragging one of the graphs in the step response:
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;
    let y_range = max_y_timerep - min_y_timerep;
    if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      let T_1 = range_slider_variables[variable_position["T_1"]];
      T_1 = T_1 + mouseDiffX * 10.0;
      if (T_1 < 0) T_1=0;
      range_slider_variables[variable_position["T_1"]] = T_1;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_1"]).value = T_1.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_1"]).value = T_1.toFixed(2);

      let k_1 = range_slider_variables[variable_position["k_1"]];
      k_1 = k_1 - mouseDiffY * y_range;
      range_slider_variables[variable_position["k_1"]] = k_1;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_1"]).value = k_1.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_1"]).value = k_1.toFixed(2);
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      T_x = T_x + mouseDiffX * 10.0;
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }

      let k_2 = range_slider_variables[variable_position["k_2"]];
      k_2 = k_2 - mouseDiffY * y_range;
      range_slider_variables[variable_position["k_2"]] = k_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_2"]).value = k_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_2"]).value = k_2.toFixed(2);
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
      if (T < 0.01) T=0.01;
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
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);

      let k_4 = range_slider_variables[variable_position["k_4"]];
      k_4 = k_4 - mouseDiffY * y_range;
      range_slider_variables[variable_position["k_4"]] = k_4;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_4"]).value = k_4.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_4"]).value = k_4.toFixed(2);
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }

    initial_mouseX = mouseX;
    initial_mouseY = mouseY;

  } else if (clicked_on_bode_mag_graph_no != -1){
    let i=clicked_on_bode_mag_graph_no;
    // Dragging one of the graphs in the bode magnitude plot:
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

    if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_mag");
      let T_1 = range_slider_variables[variable_position["T_1"]];
      T_1 = T_1 * (1.0 - mouseDiffX*10.0);
      if (T_1 < 0) T_1=0;
      range_slider_variables[variable_position["T_1"]] = T_1;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_1"]).value = T_1.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_1"]).value = T_1.toFixed(2);

      let k_1 = range_slider_variables[variable_position["k_1"]];
      k_1 = k_1 * (1.0 - mouseDiffY*12.0);
      range_slider_variables[variable_position["k_1"]] = k_1;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_1"]).value = k_1.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_1"]).value = k_1.toFixed(2);
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_mag");
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      T_x = T_x * (1.0 - mouseDiffX*10.0);
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }

      let k_2 = range_slider_variables[variable_position["k_2"]];
      k_2 = k_2 * (1.0 - mouseDiffY*12.0);
      range_slider_variables[variable_position["k_2"]] = k_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_2"]).value = k_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_2"]).value = k_2.toFixed(2);
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
      if (T < 0.01) T=0.01;
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
      let T_4 = range_slider_variables[variable_position["T_4"]];
      T_4 = T_4 * (1.0 - mouseDiffX*10.0);
      if (T_4 < 0) T_4=0;
      range_slider_variables[variable_position["T_4"]] = T_4;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_4"]).value = T_4.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_4"]).value = T_4.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_mag");
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      T_x = T_x * (1.0 - mouseDiffX*10.0);
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);

      let k_4 = range_slider_variables[variable_position["k_4"]];
      k_4 = k_4 * (1.0 - mouseDiffY*12.0);
      range_slider_variables[variable_position["k_4"]] = k_4;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_4"]).value = k_4.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_4"]).value = k_4.toFixed(2);
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }

    initial_mouseX = mouseX;
    initial_mouseY = mouseY;

  } else if (clicked_on_bode_phase_graph_no != -1){
    let i=clicked_on_bode_phase_graph_no;
    // Dragging one of the graphs in the bode phase plot:
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

    if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_phase");
      let T_1 = range_slider_variables[variable_position["T_1"]];
      T_1 = T_1 * (1.0 - mouseDiffX*10.0);
      if (T_1 < 0) T_1=0;
      range_slider_variables[variable_position["T_1"]] = T_1;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_1"]).value = T_1.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_1"]).value = T_1.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_phase");
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      T_x = T_x * (1.0 - mouseDiffX*10.0);
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
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
      if (T < 0.01) T=0.01;
      w = 1/T;
      range_slider_variables[variable_position["w"]] = w;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO.formula){
      achievement_done("drag_bode_phase");
      let T_4 = range_slider_variables[variable_position["T_4"]];
      T_4 = T_4 * (1.0 - mouseDiffX*10.0);
      if (T_4 < 0) T_4=0;
      range_slider_variables[variable_position["T_4"]] = T_4;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_4"]).value = T_4.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_4"]).value = T_4.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_phase");
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      T_x = T_x * (1.0 - mouseDiffX*10.0);
      if (T_x < 0) T_x=0;
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
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

            const EPS = 0.06666667;
            if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
              achievement_done("drag_pole");
              // Change T_1
              if (real > EPS) real=EPS;

              range_slider_variables[variable_position["T_1"]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["T_1"]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["T_1"]).value = -(1/real).toFixed(2);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
              achievement_done("drag_pole");
              // Change T_2 or T_3
              let variable_to_change = clicked_on_time_variable;
              if (real > EPS) real=EPS;
              // ToDo. Let's select the one that is closest to our initial click.
              range_slider_variables[variable_position[variable_to_change]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position[variable_to_change]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position[variable_to_change]).value = -(1/real).toFixed(2);
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

              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
              achievement_done("drag_zero");
              // Change T_4
              range_slider_variables[variable_position["T_4"]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["T_4"]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["T_4"]).value = -(1/real).toFixed(2);
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
                if (real > EPS) real=EPS;
                achievement_done("drag_pole");
                if (real>0){
                  achievement_done("drag_pole_to_right_half_plane");
                }
              }
              range_slider_variables[variable_position[variable_to_change]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position[variable_to_change]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position[variable_to_change]).value = -(1/real).toFixed(2);
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
    angle = -(90 + angle_rad * 180 / PI);
  } else {
    // The upper half plane: angles 360 at the right edge, 270 pointing upwards, and 180 to the left:
    angle = -(270 + angle_rad * 180 / PI);
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
  arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*PI);
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

  let additional_information_bool = document.getElementById("addition-information").checked;
  if(additional_information_bool){

    // Check if we're hovering any of the pole-zero graphs:
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

    // Check if we're hovering the step response graph:
    let queue = [];
    let yes_close_enough = false;
    if((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset){
      if((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset){
        let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
        for(let h=0; h<bode_graphs.length; h++){
          if(bode_graphs[h].bode_displaybool){
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
        stroke(text_color);
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
          // Now paint a horizontal line on the Bode magnitude plot, at the right height:
          let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
          let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
          ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
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
          // Now paint a horizontal line on the Bode magnitude plot, at the right height:
          let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
          let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
          ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);

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



    // Check if we're hovering the bode magnitude plot:
    if((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset){
      if((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset){
        let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
        let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
//        console.log("# inside bode_mag graph, x="+linked_x+", y="+linked_y);
        let perc_x = linked_x / graph_bode_mag_width;
        let perc_y = linked_y / graph_bode_mag_height;
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y);
        // 0.0   equals hovering over frequency 10^min_10power (= -2);
        // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
        let exponent = perc_x*x_case_gain + min_10power;
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", exp="+exponent);
        let frequency = Math.pow(10,exponent);
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", freq="+frequency);
        let queue = [];
        let yes_close_enough = false;
        for(let i=0; i<bode_graphs.length; i++){
          if(bode_graphs[i].bode_displaybool){
//            bode_graphs[i].draw_nyquist_value(frequency);
            bode_graphs[i].draw_nyquist_value(perc_x);
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
        //console.log("perc_y="+perc_y);
        //console.log("magnitude_in_dB="+magnitude_in_dB); //=6
        let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
        // perc_y = 1.0 -> magnitude = 0.001
        // perc_y = 0.0 -> magnitude = 1000
//        console.log("magnitude="+magnitude);


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
        stroke(angle_color);
        strokeWeight(2);
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


    // Check if we're hovering the bode phase plot:
    if((mouseX-graph_bode_phase_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_mag_x_offset){
      if((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height){
        let linked_x = mouseX - graph_bode_phase_x - graph_bode_mag_x_offset;
        let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
//        console.log("# inside bode_phase graph, x="+linked_x+", y="+linked_y);
        let perc_x = linked_x / graph_bode_phase_width;
        let perc_y = linked_y / graph_bode_phase_height;
//        console.log("# inside bode_phase graph, x="+perc_x+", y="+perc_y);
        // 0.0   equals hovering over frequency 10^min_10power (= -2);
        // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
        let exponent = perc_x*x_case_gain + min_10power;
//        console.log("# inside bode_phase graph, x="+perc_x+", y="+perc_y+", exp="+exponent);
        let frequency = Math.pow(10,exponent);
//        console.log("# inside bode_phase graph, x="+perc_x+", y="+perc_y+", freq="+frequency);

        let rad_phase_lower_bound = phase_lower_bound*PI/180;
        let rad_phase_upper_bound = phase_upper_bound*PI/180;
        let queue = [];
        let yes_close_enough = false;
        for(let i=0; i<bode_graphs.length; i++){
          if(bode_graphs[i].bode_displaybool){
//            bode_graphs[i].draw_nyquist_value(frequency);
            bode_graphs[i].draw_nyquist_value(perc_x);
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
        //console.log("perc_y="+perc_y);
        // perc_y=0  -> phase = highest phase
        // perc_y=1.0  -> phase = lowest phase
        //console.log("phase="+phase);

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
          let phase = output[3] * 180/PI;
          text("phase=" + phase.toFixed(1) + "°",13,77);
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
          if (angle < 0){
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*PI);
          } else {
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*PI, 0);
          }
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

          // And paint a white line from origo to the hovered color:
          let hovered_graph_no = output[1];
//          console.log("hovered_graph_no="+hovered_graph_no);
          let point = bode_graphs[hovered_graph_no].get_nyquist_value(perc_x);
          let screen_x1 = point[0];
          let screen_y1 = point[1];
          screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
          screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
          push();
          stroke(text_color);
          strokeWeight(2);
          translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
          line(screen_x0,screen_y0,screen_x1,screen_y1);
          pop();
          // And draw a vertical white line in the bode phase plot.
          // And draw a vertical line ending up at the hovered graph:
          push();
          stroke(text_color);
          strokeWeight(2);
          line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
          let current_graph = bode_graphs[hovered_graph_no];
          let linked_y8 = current_graph.bode_gain_array[linked_x];
          let screen_y = graph_bode_mag_y_offset + map(linked_y8,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
          push();
          noStroke();
          fill(bode_graphs[output[1]].bode_hue,360,360);
          ellipse(mouseX,screen_y + graph_bode_mag_y,12,12);
          pop();
          line(mouseX,graph_bode_mag_y+screen_y,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
          pop();

        } else {
          push();
          stroke(text_color);
          strokeWeight(2);
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

          let screen_x2 = map(1.2*cos(angle/180*PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
          let screen_y2 = map(1.2*sin(angle/180*PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);

          if (angle < 0){
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*PI);
          } else {
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*PI, 0);
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
}

function capture_screen(){
  saveCanvas(canvas,"Pexperiment_screenshot_" + screenshot_number.toString(),'png');
  screenshot_number++;
}

//Line functions
function draw_loglines(x_case,y_case,type){
  stroke(line_color);
  let sum = (1 - Math.pow(1/rate,9))/(1 - 1/rate);
  let step_x = (graph_bode_mag_width/x_case)/sum;
  for(let x=0; x<x_case; x++){
    let pas = graph_bode_mag_width*x/x_case;
    for(let i=0; i<=9; i++){
      if(i == 0){
        strokeWeight(2);
      }
      else{
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
//  min_y_timerep = 0;

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

//  max_nyquist_y = Math.max(Math.abs(max_nyquist_y),Math.abs(min_nyquist_y));
//  let tmp = max_nyquist_y;
//  max_nyquist_y = -min_nyquist_y;
//  min_nyquist_y = -tmp;

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
      let corrector_bool = true;
//      if(document.getElementById('bodetab').checked){
        corrector_bool = document.getElementById("phase_correction_checkbox").checked;
//      }

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

        if(x > 0 && Math.abs(bode_phase - this.bode_phase_array[x-1]) > 5.23 && corrector_bool){
          let sign = Math.sign(this.bode_phase_array[x-1]);
          phase_bias = sign * PI * 2;
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
    //Reset Values
    let formula_to_use = this.bode_formula;


    //console.log(input_formula);
    //console.log(this.bode_formula);
    // Take care of "known good" formulas that we know an exact answer to:

    let have_a_solution = false;
    // Make analytic solutions for:
    // k_1/(T_1*s+1)
    // k_2/(T_2s+1)*1/(T_3s+1)
    // k_3*w^2/(s^2+2*z*w*s+w^2)
    // 3/(s+1)*e^(-L*s)
    if (this.bode_formula == GRAPH_ONE_REAL_POLE.formula){ //  "k_1/(T_1*s+1)"
      let k_1 = range_slider_variables[variable_position["k_1"]];
      let T_1 = range_slider_variables[variable_position["T_1"]];
      if (input_formula=="1/s"){       // Unit Step response
        // Step input response for
        //     w_0              1
        //   -------  =      -----------
        //   s + w_0          s/w_0 + 1
        // v_out(t) = V_i * (1 - e^{-\omega_{0}*t})}
        if (T_1 >= 0){
          have_a_solution = true;
          this.bode_timerep_array = []
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            let math_y = k_1 * (1.0 - Math.exp(-t / T_1));
            this.bode_timerep_array.push(math_y);
          }
          if (k_1 > 0){
            this.bode_max_timerep = k_1;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_1;
          }
        }
      } else if (input_formula=="1"){      // Dirac Impulse response:
        if (T_1 >= 0){
          have_a_solution = true;
          this.bode_timerep_array = []
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
        if ((T_2 >= 0) && (T_3 >= 0)){
          have_a_solution = true;
          this.bode_timerep_array = []
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);
            let math_y = k_2 * (1.0 - Math.exp(-t / T_2)) * (1.0 - Math.exp(-t / T_3));
            this.bode_timerep_array.push(math_y);
          }
          if (k_2 > 0){
            this.bode_max_timerep = k_2;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_2;
          }
        }
      } else if (input_formula=="1"){      // Dirac Impulse response:
        if ((T_2 >= 0) && (T_3 >= 0)){
          have_a_solution = true;
          this.bode_timerep_array = []
          for(let x=0; x<graph_step_response_width; x+=precision){
            let t = map(x,0,graph_step_response_width,0,max_x_timerep);

            let math_y = k_2 * (1/T_2) * (1/T_3) * (Math.exp(-t / T_2) - Math.exp(-t / T_3)) / (1/T_3 - 1/T_2);
            if (T_2 == 0){
              math_y = k_2 * Math.exp(-t / T_3);
            } else if (T_3 == 0){
              math_y = k_2 * Math.exp(-t / T_2);
            }
            this.bode_timerep_array.push(math_y);
          }
          if (k_2 > 0){
            this.bode_max_timerep = k_2;
            this.bode_min_timerep = 0;
          } else {
            this.bode_max_timerep = 0;
            this.bode_min_timerep = k_2;
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
/*        if ((z < 1.0) && (z >= 0)){
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
            let math_y;
            if (z==0){
              math_y = k_3 * sin(w * t);
            } else if (z==1){
              math_y = k_3 * t * Math.exp(-w*t);
            } else if (z<1){
              let exponentTerm = Math.exp(-z*w*t);
              let sinTerm = sin(w * Math.sqrt(1.0-z*z));
              math_y = k_3 * (1.0 / Math.sqrt(1-z*z)) * exponentTerm * sinTerm;
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
*/
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

    let rad_phase_lower_bound = phase_lower_bound*PI/180;
    let rad_phase_upper_bound = phase_upper_bound*PI/180;

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

  draw_nyquist_response(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
//    let reversed_conj_complex_array = this.bode_complex_array.map(x => x.conjugate()).reverse();
//    let new_complex_array = this.bode_complex_array.concat(reversed_conj_complex_array);

//    let reversed_conj_complex_array = this.bode_complex_array.map(x => x.conjugate()).reverse();
//    let new_complex_array = this.bode_complex_array.map(x => x.conjugate()).reverse();
//    let new_complex_array = this.bode_complex_array.map(x => x.conjugate()).reverse();
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
        // Draw a red X for T_1 in the Nyquist diagram:
        let T_1 = range_slider_variables[variable_position["T_1"]];
        if (T_1 != 0){
          let frequency = 1 / T_1;
          this.draw_nyquist_X(frequency);
        }
      } else if(this.bode_formula == GRAPH_TWO_REAL_POLES.formula){
        // Draw a X for T_2 in the Nyquist diagram:
        let T_2 = range_slider_variables[variable_position["T_2"]];
        if (T_2 != 0){
          let frequency = 1 / T_2;
          this.draw_nyquist_X(frequency);
        }
        // Draw a X for T_3 in the Nyquist diagram:
        let T_3 = range_slider_variables[variable_position["T_3"]];
        if (T_3 != 0){
          let frequency = 1 / T_3;
          this.draw_nyquist_X(frequency);
        }
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
        let T_8 = range_slider_variables[variable_position["T_8"]];
        if (T_8 != 0){
          let frequency = 1 / T_8;
          this.draw_nyquist_O(frequency);
        }
        let T_6 = range_slider_variables[variable_position["T_6"]];
        if (T_6 != 0){
          let frequency = 1 / T_6;
          this.draw_nyquist_X(frequency);
        }
        let T_7 = range_slider_variables[variable_position["T_7"]];
        if (T_7 != 0){
          let frequency = 1 / T_7;
          this.draw_nyquist_X(frequency);
        }
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
    let current_complex = new_complex_array[sample_no];
//    console.log("current_complex="+current_complex);
    try {
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
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

  draw_nyquist_O(frequency){
    //let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    let screen_x1 = (Math.log(Math.abs(frequency))/Math.log(10) + 2) * graph_bode_mag_width/5;
    let sample_no = Math.round(screen_x1);
    let current_complex = new_complex_array[sample_no];
    try {
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      push();
      stroke(this.bode_hue,240,360);
      strokeWeight(3);
      draw_O(screen_x, screen_y);
      pop();
    } catch {};
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
    push();
    noStroke();
    translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
    fill(this.bode_hue,360,360);
    ellipse(screen_x,screen_y,12,12);
    pop();
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
    //let blob_color = color('hsb(0, 0%, 20%)');
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
//    ellipse(pole_zero_width/2,pole_zero_height/2,12,12);

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
// Skipping graph 4 "Time delay", since nothing is movable:
//    } else if (this.bode_formula == GRAPH_TIME_DELAY.formula){
//      //pole_x = range_slider_variables[0];
//      this.plot_pole(-1.0,0);
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
let range_slider_alphabet = ['e','a','b','c','d','f','g','h','i','j','l','m','n','o','p','q','r','t','u','v','w','x','y','z','k_1','k_2','k_3','k_4','k_5','k_6','L','T_1','T_2','T_3','T_4','T_5','T_6','T_7','T_8'];
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
    return [output*180/PI + 180, Math.pow(10,a_bound)];
  }
  else{
    return NaN
  }
}

function findOmega180(input_array){
  let a_bound = min_10power;
  let b_bound = min_10power + x_case_gain;
  let f_a = input_array[Math.ceil(map(a_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
  let f_b = input_array[Math.ceil(map(b_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
  if(f_a * f_b < 0 && Math.abs(f_a) > 0.005 && Math.abs(f_b) > 0.005){
    for(let h=0; h<20; h++){
      let mid_point = (a_bound + b_bound)/2;
      let f_mid = input_array[Math.ceil(map(mid_point,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
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


/* Get the documentElement (<html>) to display the page in fullscreen */
let elem = document.documentElement;
let is_fullscreen = false;

function toggle_fullscreen(){
  if (is_fullscreen == false){
    openFullscreen();
  } else {
    closeFullscreen();
  }
}

/* View in fullscreen */
function openFullscreen() {
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

/* Close fullscreen */
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
//  toggle_assignments();
  updateToolbox();
}

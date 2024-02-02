//
// LU-PZE: Lund University Pole-Zero Explorer
// - an Automatic Control theory playground
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

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', ready)
} else {
  ready();
}


var graph_width = 1200;

var min_10power = -2;
var rate = 1.4;
var precision = 4;

var x_case_gain = 5;
var y_case_gain = 6;

var bode_graphs = [];

var phase_lower_bound = 0;
var phase_upper_bound = 0;
var gain_upper_bound = 60;

//                              red   yellow    green     blue  magenta       orange        green
var color_table = [     270,    350,      48,     155,     200,-90+5*81,-90-360+6*81,-90-360+7*81,-90-360+8*81,-90-360+9*81,-90-360+10*81,-90-360+11*81,-90-360+12*81,-90-360+13*81,-90-360+14*81,-90-360+15*81];
var screenshot_number = 0;

var max_y_timerep = 100;
var min_y_timerep = 0;
var max_x_timerep = 10;

var min_nyquist_x = -1;
var max_nyquist_x = 1;
var min_nyquist_y = -1;
var max_nyquist_y = 1;

var line_stroke_weight = 2;
var text_color;
var line_color;
var background_color;
var box_background_color;

var canvas_width;
var canvas_height;

var graph_bode_mag_width;
var graph_bode_mag_height;
var graph_bode_mag_x;
var graph_bode_mag_y;
var graph_bode_phase_width;
var graph_bode_phase_height;
var graph_bode_phase_x;
var graph_bode_phase_y;
var graph_step_response_width;
var graph_step_response_height;
var graph_step_response_x;
var graph_step_response_y;
var graph_nyquist_width;
var graph_nyquist_height;
var graph_nyquist_x;
var graph_nyquist_y;
var graph_pole_zero_width;
var graph_pole_zero_height;
var graph_pole_zero_x;
var graph_pole_zero_y;
var pole_zero_width;
var pole_zero_height;

const PI = 3.141592653589793238;

var id_bank = 1;
var current_info_tab_id = 1;
var current_tab = 0;

function getGraphById(input_id){
  for(i = 0;i < bode_graphs.length;i++){
    var current_graph = bode_graphs[i];
    if(current_graph.bode_id == input_id){
      return current_graph;
    }
  }
  return "none";
}

function updateInputFormula(event){
  input_formula = event.target.getValue('ascii-math');
  redraw_canvas_gain("all");
}

function checkSlider(input_id){
  var linked_formula = getGraphById(input_id).bode_formula;
  for(i=0;i<range_slider_alphabet.length;i++){
    var current_letter = range_slider_alphabet[i];
    var linked_button = document.getElementById("BTNS_" + input_id.toString() + "_" + i.toString());
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
  var slider_button = document.createElement("button");
  slider_button.classList.add("slider-button")
  slider_button.innerHTML = range_slider_alphabet[letter_id];
  slider_button.id = "BTNS_" + equation_id.toString() + "_" + letter_id.toString();
  slider_button.setAttribute("style","margin: 0 0 5px 10px");
  slider_button.addEventListener('click',createRangeSlider);

  var button_wrapper = document.getElementById(equation_id).parentElement.parentElement.getElementsByClassName("slider-buttons")[0];
  button_wrapper.append(slider_button);
}

function createRangeSlider(event){
  var slider = document.createElement('div');
  var button = event.target;
  var button_id = button.id.split("_")[2];
  var variable_name = range_slider_alphabet[button_id];
  var range_min=0.1;
  var range_max=20;
  var range_value=1.0;
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
//  var delete_button = slider.getElementsByClassName("delete-graph")[0];
//  delete_button.addEventListener('click',removeSlider);

  // Printing variable names using text only:
//  slider.getElementsByTagName("span")[0].innerHTML = range_slider_alphabet[button_id] + " =";
  // Printing variable names using mathlive:
  slider.getElementsByTagName("span")[0].innerHTML = "<math-field read-only style='vertical-align:bottom;display:inline-block'>" + range_slider_alphabet[button_id] + " =</math-field>";
  //slider.getElementsByTagName("span")[0].innerHTML = "<math-field read-only>" + range_slider_alphabet[button_id] + " =</math-field>";

  var linked_letter = range_slider_alphabet[button_id];
  var range_slider = slider.getElementsByClassName("range-slider")[0];
  var linked_span = slider.getElementsByClassName("value-wrapper")[0].getElementsByTagName("input")[0];
  linked_span.value = (+range_slider.value).toFixed(2);
  range_slider.oninput = function(){
    linked_span.value = +(+range_slider.value).toFixed(2);
    range_slider_variables[button_id] = +range_slider.value;

    var variable_name = range_slider_alphabet[button_id];
    if ((variable_name == "k_1")||(variable_name == "T_1")){
      // Make information bar "1" active:
      var info_tab = document.getElementById("graph_1_info");
      info_tab.checked = "true";
    } else if ((variable_name == "k_2")||(variable_name == "T_2")||(variable_name=="T_3")){
      // Make information bar "2" active:
      var info_tab = document.getElementById("graph_2_info");
      info_tab.checked = "true";
    } else if ((variable_name == "w")||(variable_name == "z")||(variable_name=="k_3")){
      // Make information bar "2" active:
      var info_tab = document.getElementById("graph_3_info");
      info_tab.checked = "true";
    } else if (variable_name == "L"){
      // Make information bar "3" active:
      var info_tab = document.getElementById("graph_4_info");
      info_tab.checked = "true";
    }

    redraw_canvas_gain("all");
  }
  range_slider_variables[button_id] = range_value; // Initial value of variable

//  try{
//    // If adding two variables at the same time, this function will fail:
//    redraw_canvas_gain("all");
//    // ...but it will succeed when adding the second variable.
//  } catch {}

  var slider_bounds = slider.getElementsByClassName("slider-bound");

  var slider_min = slider_bounds[0];
  slider_min.oninput = function(){
    range_slider.min = +slider_min.value;
  }

  var slider_max = slider_bounds[1];
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
    range_slider.value = +linked_span.value;
    redraw_canvas_gain("all");
  }

//  console.log("button=");
//  console.log(typeof(button));
//  console.log(button);
  var equations_div = document.getElementsByClassName("equations")[0];
  equations_div.append(slider);
  try{
    // This will fail if there is no button:
//    var equations = button.parentElement.parentElement.parentElement;
//    equations.append(slider);
    // If adding a slider at startup, there is no button to remove, so this may fail:
    button.remove();
  } catch {
//    console.log("No button to remove");
  }
}

function removeSlider(event){
  var button = event.target;
  var linked_id = button.parentElement.parentElement.getElementsByClassName("range-slider")[0].id.split("_")[1];
  range_slider_variables[linked_id] = 18012001;
  var slider = button.parentElement.parentElement.parentElement;
  slider.remove();
  for(b = 0;b < bode_graphs.length;b++){
    var graph_id = bode_graphs[b].bode_id;
    checkSlider(graph_id);
    redraw_canvas_gain(graph_id);
  }
}


//function addNewGraph(event, mathfield_string="\\frac{1}{s+1}", equation_string="1/(s+1)", graph_name=""){
function addNewGraph(event, mathfield_string="\\frac{0.9s+1}{(s+1)^2}\\frac{v^2}{s^2+2qvs+v^2}", equation_string="(0.9s+1)/((s+1)^2)*(v^2)/(s^2+2*q*v*s+v^2)", graph_name=""){
  var new_equation_wrapper = document.createElement('div');
  new_equation_wrapper.classList.add('equation-wrapper');
  id_bank += 1;
  var linked_color = color_table[id_bank%color_table.length];
  let s =
  `
  <hr>
  <div class="equation">
    <input type="checkbox" class="show-graph" style="background: hsl(${linked_color},100%,50%)">
    <math-field `
  if (id_bank <= 4){
    s += "read-only ";
  }
  s += `class="formula" id="${id_bank}" style="`
  if (id_bank <= 4){ // Make sure that hover doesn't make read-only graphs yellow:
    s += "background:#fff;";
  }
  s += `font-size: 20px;">${mathfield_string}</math-field>`;
  if (id_bank <= 3){
    s += `<button type="button" class="download-script" id="${id_bank}" onclick="download_script(${id_bank})"><i class="material-icons" style="font-size:28px;color:#b0b0b0">ios_share</i></button>`;
  }
  s += `<button type="button" class="delete-graph"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
  </div>
  <div class="slider-buttons">
  </div>
  `
  new_equation_wrapper.innerHTML = s;

  var equations_div = document.getElementsByClassName("equations")[0];
  equations_div.append(new_equation_wrapper);

  var new_equation = new_equation_wrapper.getElementsByClassName("equation")[0];
  new_equation.getElementsByClassName("delete-graph")[0].addEventListener('click',removeGraph);
  new_equation.getElementsByClassName("show-graph")[0].addEventListener('change',changeGraphDisplayStatus);

//  var new_bode_graph = new bode_graph(id_bank,'1/(10+p)');
//  var new_bode_graph = new bode_graph(id_bank,'2/(10+0.5*p^2+p)');
  var new_bode_graph = new bode_graph(id_bank,equation_string);
  bode_graphs.push(new_bode_graph);
  new_bode_graph.graph_name = graph_name;


  var input_element_id = id_bank;
  for(i = 0;i < bode_graphs.length;i++){
    var current_bode_graph = bode_graphs[i];
    if(parseInt(input_element_id) == current_bode_graph.bode_id){
//      current_bode_graph.bode_formula = "k_1/(s+1)";
//      checkSlider(input_element_id);

      // Create sliders for all included variables directly:
      var event={};
      event.target={};
      var equation_id=input_element_id; // The DOM number of the equation
      // Search for all variables in the equation_string:

      for(i=NOF_CONSTANT_VARIABLES;i<range_slider_alphabet.length;i++){
        var letter_id=i; // The variable position in the variable array.
        var current_letter = range_slider_alphabet[i];
        if(equation_string.includes(current_letter)){
//          console.log("# found variable " + current_letter);
          var linked_button = document.getElementById("BTNS_" + equation_id.toString() + "_" + i.toString());
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
  //redraw();
}

function addNewInformationTab(input_id, graph_name){
  var tabs_wrapper = document.getElementsByClassName("graph-information-tabs")[0];
  var new_input = document.createElement("input");
  new_input.setAttribute("type","radio");
  new_input.setAttribute("name","tab-inf");
  new_input.id = "graph_" + input_id.toString() + "_info";
  new_input.setAttribute("onchange","updateGraphInformation()");
  if (input_id == 1) {
    new_input.checked = "true";
  }

  var linked_color = color_table[input_id%color_table.length];
  var new_label = document.createElement("label");
  var span_content = "Graph " + input_id.toString();
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
  var linked_tab = document.getElementById("graph_" + input_id.toString() + "_info");
  var linked_label = document.getElementById("graph_" + input_id.toString() + "_infolabel");
  linked_tab.remove();
  linked_label.remove();
}

function removeGraph(event){
  var clicked_button = event.target;
  var linked_equation = clicked_button.parentElement.parentElement;
  var linked_id = linked_equation.getElementsByClassName("formula")[0].id;
  removeInformationTab(+linked_id);
  for(i = 0; i<bode_graphs.length;i++){
    var current_graph = bode_graphs[i];
    if(current_graph.bode_id == parseInt(linked_id)){
      bode_graphs.splice(bode_graphs.indexOf(current_graph),1);
      redraw();
    }
  }
  linked_equation.parentElement.remove();

  //Now also remove any variables that belongs to this equation:
  let variables_to_delete = [];
  if (linked_id == 1){
    variables_to_delete = ["k_1","T_1"];
  } else if (linked_id == 2){
    variables_to_delete = ["k_2","T_2","T_3"];
  } else if (linked_id == 3){
    variables_to_delete = ["k_3","w","z"];
  } else if (linked_id == 4){
    variables_to_delete = ["L"];
  }
  for (let i = 0; i<variables_to_delete.length; i++){
    let variable_to_delete = variables_to_delete[i];
    let button = document.getElementById("RANGE_" + variable_position[variable_to_delete]);
    var linked_id = button.parentElement.parentElement.getElementsByClassName("range-slider")[0].id.split("_")[1];
    range_slider_variables[linked_id] = 18012001;
    var slider = button.parentElement.parentElement.parentElement;
    slider.remove();
  }

  for(b=0; b<bode_graphs.length; b++){
    var graph_id = bode_graphs[b].bode_id;
    checkSlider(graph_id);
    redraw_canvas_gain(graph_id);
  }

}

function changeGraphDisplayStatus(event){
  var equation_id = event.target.parentElement.getElementsByClassName("formula")[0].id;
  for(i = 0; i < bode_graphs.length; i++){
    var current_graph = bode_graphs[i];
    if(current_graph.bode_id == parseInt(equation_id)){
      current_graph.bode_displaybool = !current_graph.bode_displaybool;
      redraw();
    }
  }
}

function updateFormulaAndDraw(input_element){
  input_element.addEventListener('input',(ev) => {
    var input_element_id = ev.target.id;
    for(i = 0;i < bode_graphs.length;i++){
      var current_bode_graph = bode_graphs[i];
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


function toolboxMenuToogle(event){
  var toggleElement = document.querySelector('.toolbox');
  toggleElement.classList.toggle('active');
}

function helpToogle(event){
  var toggleElement = document.querySelector('.help');
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
  var element = document.getElementById("download_script_box");
  element.innerHTML = 
    `This is the<select id="language-choices" style="height:30px;margin-top:9px;margin-left:8px" onchange="update_programming_language(${id})">
  <option value="Python">Python script</option>
  <option value="MATLAB">MATLAB script</option>
</select> for plotting your transfer function.<br>Copy to clipboard:
<button type="button" onclick="copy_code()" class="copy-button"><i class="material-icons" style="font-size:24px;color:#404040">content_copy</i></button>
<button type="button" class="delete-graph" onclick="hide_script()"><i class="material-icons" style="font-size: 34px; color: #b0b0b0">clear</i></button>
<br><br><div id="the_code"></div>`;
//  <option value="Julia">Julia code</option>

  var toggleElement = document.querySelector('.download_script_box');
  toggleElement.classList.toggle('active');
  update_programming_language(id);
}

function update_programming_language(id){
  var selected_language = document.getElementById("language-choices").value;
  var code="";
  if (selected_language == "Python"){
    code = get_python_script(id);
  } else if (selected_language == "Julia"){
    code = get_julia_script(id);
  } else {
    code = get_matlab_script(id);
  }
  var element = document.getElementById("the_code");
  element.innerHTML = code;
}

function get_python_script(id){
  //console.log("Generating Python code for Graph #" + id);
  let python_string = "";
  if (id==1){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    python_string = "k_1 = " + k_1 + "\nT_1 = " + T_1 + "\n" + "num = [k_1]\nden = [T_1, 1]";
  } else if (id==2){
    let k_2 = range_slider_variables[variable_position["k_2"]];
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    python_string = "k_2 = " + k_2 + "\nT_2 = " + T_2 + "\n" + "T_3 = " + T_3 + "\n" + "num = [k_2]\nden = [T_2*T_3, T_2+T_3, 1]";
  } else if (id==3){
    let k_3 = range_slider_variables[variable_position["k_3"]];
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    python_string = "k_3 = " + k_3 + "\nw = " + w + "\n" + "z = " + z + "\n" + "num = [k_3*w*w]\nden = [1, 2*z*w, w*w]";
  } else {
    return "";
  }

  var html=`# Make sure you have the control module installed. You can install it using:
# pip install control
import control
import matplotlib.pyplot as plt
import numpy as np
from control.matlab import *  # MATLAB-like functions
# Clear previous variables and plots:
plt.close('all')

# Creating the transfer function:
${python_string}
system = control.tf(num, den)
print ("Transfer function G(s)=", system)

# Plot poles and zeroes:
plt.figure(1)
(poles, zeros) = control.pzmap(system)
plt.title('Pole-Zero Map')
plt.show()
print ("poles=", poles)
print ("zeros=", zeros)

# Step response for the system
plt.figure(2)
yout, T = step(system)
plt.plot(T.T, yout.T)
plt.show(block=False)
plt.title('Step input response')

# Plot Bode diagram:
plt.figure(3)
Gmag, Gphase, Gomega = control.bode_plot(system, plot=True)
plt.title('Bode Diagram')
plt.show()

# Nyquist plot for the system
plt.figure(4)
control.nyquist(system)
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
  var html=`* Julia version for ${id}:
# Make sure you have the required Julia packages installed. You can install them using:
# import Pkg
# Pkg.add("ControlSystems")
# Pkg.add("Plots")
using ControlSystems
using Plots
# Clear previous variables and plots
plotly()  # or use another plot backend
plotlyjs()  # For Jupyter notebooks
# Define poles and zeroes
poles = [-65.0 - 25.5im, -65.0 + 25.5im]
zeroes = []
# Create transfer function
system = TransferFunction([], poles)
# Display transfer function
println("Transfer Function:")
print(system)
# Plot poles and zeroes
plot(pzmap(system), seriestype=:scatter, title="Pole-Zero Map")
# Plot Bode diagram
bode_opts = BodeDefaults()
bode_opts.xlimits = (0.01, 100)
bode(system, bode_opts, title="Bode Diagram")
# Plot step response
time, response = stepresponse(system)
plot(time, response, title="Step Response", xlabel="Time", ylabel="Amplitude", grid=true)
# Convert to discrete-time transfer function with zero-order hold (zoh)
time_resolution = 0.05
discrete_transfer_function = c2d(system, time_resolution, method="zoh")
# Plot discrete-time pole-zero map
pzmap(discrete_transfer_function, title="Discrete-Time Pole-Zero Map")
# Plot step response of discrete-time system
time_discrete, response_discrete = stepresponse(discrete_transfer_function)
plot(time_discrete, response_discrete, title="Discrete-Time Step Response", xlabel="Time", ylabel="Amplitude", grid=true)

`.replace(/(?:\r\n|\r|\n)/g, "<br>");
  return html;
}


function get_matlab_script(id){
//  var html=`* Matlab for plotting ${id}:
  let matlab_string = "";
  if (id==1){
    let k_1 = range_slider_variables[variable_position["k_1"]];
    let T_1 = range_slider_variables[variable_position["T_1"]];
    matlab_string = "k_1 = " + k_1 + ";\nT_1 = " + T_1 + ";\nnum = [k_1];\nden = [T_1, 1];";
  } else if (id==2){
    let k_2 = range_slider_variables[variable_position["k_2"]];
    let T_2 = range_slider_variables[variable_position["T_2"]];
    let T_3 = range_slider_variables[variable_position["T_3"]];
    matlab_string = "k_2 = " + k_2 + ";\nT_2 = " + T_2 + ";\nT_3 = " + T_3 + ";\nnum = [k_2];\nden = [T_2*T_3, T_2+T_3, 1];";
  } else if (id==3){
    let k_3 = range_slider_variables[variable_position["k_3"]];
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    matlab_string = "k_3 = " + k_3 + ";\nw = " + w + ";\nz = " + z + ";\nnum = [k_3*w*w];\nden = [1, 2*z*w, w*w];";
  } else {
    return "";
  }

  var html=`% Clear previous variables and plots:
clear all; format compact; close all
% Define poles and zeroes:
${matlab_string}
% Create transfer function:
transfer_function = tf(num,den)

% Plot poles and zeroes:
figure(1)
pzmap(transfer_function)

% Plot Bode diagram:
figure(2)
x = bodeoptions;
x.XLim = [0.01 1000]
bode(transfer_function,x)

% Step response for the system
figure(3)
step(transfer_function, 1)

% Nyquist plot for the system
figure(4)
h = nyquistplot(transfer_function)


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
  var toggleElement = document.querySelector('.download_script_box');
  toggleElement.classList.toggle('active');
}

function showInputFunction(input){
//  if((input == 1 || current_tab == 1) && current_tab != input){
//    var toggleElement = document.querySelector('.input-equation');
//    toggleElement.classList.toggle('active');
//    toggleElement.classList="active"; //toggle('active');
//  }
  current_tab = input;
}

function changeStrokeWeight(event){
  var slider_value = document.getElementById("stroke-range").value;
  line_stroke_weight = +slider_value;
  redraw();
}

function changeColorMode(event){
  var checkbox_value = document.getElementById("color-mode-checkbox").checked;
  var graph_space = document.getElementsByClassName("graph-space")[0];
  if(!checkbox_value){
    background_color = color('hsb(0, 0%, 4%)');
    line_color = color('hsb(0, 0%, 22%)'); // Grey graph lines
    text_color = color('hsb(0, 0%, 100%)');
    box_background_color = 120;  // The tooltip hover box
    graph_space.setAttribute("style","grid-column: 2;grid-row: 2;background:#292929;")
  }
  else{
    background_color = color('hsb(0, 0%, 100%)');
    line_color = color('hsb(0, 0%, 64%)');
    text_color = color('hsb(0, 0%, 5%)');
    box_background_color = 255;  // The tooltip hover box
    graph_space.setAttribute("style","grid-column: 2;grid-row: 2;background:#fff;")
  }
  redraw();
}

function updateToolbox(){

    var math_preferences = document.getElementsByClassName("math-preferences")[0];

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
    var x_inputs = math_preferences.getElementsByClassName("range-wrapper-bode")[0].getElementsByTagName("input");
//    console.log("x_inputs=");
//    console.log(x_inputs);
    var x_min = x_inputs[0];
    var x_max = x_inputs[1];
    x_min.oninput = function(){
      var min_tenth_power_value = roundup_decimal(x_min.value);
      var max_tenth_power_value = roundup_decimal(x_max.value);
      min_10power = min_tenth_power_value;
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
//      console.log("xmin=" + x_case_gain);
      redraw_canvas_gain("all");
    }
    x_max.oninput = function(){
      var min_tenth_power_value = roundup_decimal(x_min.value);
      var max_tenth_power_value = roundup_decimal(x_max.value);
      x_case_gain = max_tenth_power_value - min_tenth_power_value;
      redraw_canvas_gain("all");
    }
    var y_inputs = math_preferences.getElementsByClassName("range-wrapper-bode2")[0].getElementsByTagName("input");
//    console.log("y_inputs=");
//    console.log(y_inputs);
    var y_min = y_inputs[0];
    var y_max = y_inputs[1];
    y_max.oninput = function(){
      var new_max = value_magnet(y_max.value,20);
      var new_min = value_magnet(y_min.value,20);
      gain_upper_bound = new_max;
      y_case_gain = (new_max - new_min)/20;
      redraw_canvas_gain("all");
    }
    y_min.oninput = function(){
      var new_max = value_magnet(y_max.value,20);
      var new_min = value_magnet(y_min.value,20);
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
    var time_input = math_preferences.getElementsByClassName("range-wrapper-time")[0].getElementsByTagName("input")[0];
    var auto_range_checkbox = document.getElementById("automatic-range-time");
    var precision_range = document.getElementById("precision-range");
    var timerep_inputs = math_preferences.getElementsByClassName("range-wrapper-time")[1].getElementsByTagName("input");
    var timerep_min = timerep_inputs[0];
    var timerep_max = timerep_inputs[1];

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
    var auto_range_checkbox = document.getElementById("automatic-range-nyq");
    var range_inputs = math_preferences.getElementsByClassName("range-wrapper-nyquist");
    var x_inputs = range_inputs[0].getElementsByTagName("input");
    var y_inputs = range_inputs[1].getElementsByTagName("input");
    var x_min = x_inputs[0];
    var x_max = x_inputs[1];
    var y_min = y_inputs[0];

    auto_range_checkbox.onchange = function(){
      if(!auto_range_checkbox.checked){
        min_nyquist_x = x_min.value;
        max_nyquist_x = x_max.value;
        max_nyquist_y = y_min.value;
      }
      redraw_canvas_gain("all");
    }

    x_min.oninput = function(){
      if(!isNaN(x_min.value)){
        min_nyquist_x = x_min.value;
        redraw_canvas_gain("all");
      }
    }

    x_max.oninput = function(){
      if(!isNaN(x_max.value)){
        max_nyquist_x = x_max.value;
        redraw_canvas_gain("all");
      }
    }

    y_min.oninput = function(){
      if(!isNaN(y_min.value) || y_min.value == 0){
        min_nyquist_y = 0;
        max_nyquist_y = y_min.value;
        redraw_canvas_gain("all");
      }
    }
}



function updateInputFormulaFromList(event){
  var selected_input = document.getElementById("input-choices").value;
  var input_equation = document.getElementById("input-formula");
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
  var tabs_wrapper = document.getElementsByClassName("graph-information-tabs")[0];
  var inputs = tabs_wrapper.getElementsByTagName('input');
  var sub_information = document.getElementsByClassName("sub-information");
  var phase = sub_information[0].getElementsByClassName("value")[0];
  var gain_cross = sub_information[0].getElementsByClassName("value")[1];
  var gain = sub_information[0].getElementsByClassName("value")[2];
  var phase_cross = sub_information[0].getElementsByClassName("value")[3];
  var settling_time = sub_information[0].getElementsByClassName("value")[4];
  for(h = 0; h < inputs.length; h++){
    if(inputs[h].checked){
      var input_id = +inputs[h].id.split("_")[1];
      var current_graph;
      for(j = 0;j < bode_graphs.length;j++){
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
        var value_dB = current_graph.bode_gain_margin;
        var value = Math.pow(10.0, value_dB / 20.0);
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
  graph_pole_zero_height = canvas_height - 20;
  graph_pole_zero_x = canvas_width - graph_pole_zero_width - 20;
  graph_pole_zero_y = 10;
}

function setup(){
  setGraphDimensions();
  var canvas = createCanvas(canvas_width,canvas_height);
  canvas.parent('sketch_holder');
  colorMode(HSB,360);
  background_color = color('hsb(0, 0%, 4%)');
  box_background_color = 120;
  line_color = color('hsb(0, 0%, 22%)');  // Grey graph lines
  text_color = color('hsb(0, 0%, 100%)');

  // To go from "T_1" to the index in range_slider_variables:
  for (i=0; i<range_slider_alphabet.length; i++){
    variable_position[range_slider_alphabet[i]] = i;
  }

//var id_bank = 1;
//var current_info_tab_id = 1;
//var current_tab = 0;

//  var first_bode = new bode_graph(1,'1/(s+1)');
//  bode_graphs.push(first_bode);
//  bode_graphs[0].get_complex_p5();
//  bode_graphs[0].get_timevalues_p5();

  id_bank = 0;
// One pole:
  addNewGraph(null, mathfield_string="\\frac{k_1}{T_1s+1}", equation_string="k_1/(T_1*s+1)","One real pole");

// Two poles:
//  addNewGraph(null, mathfield_string="\\frac{2}{s+1}*\\frac{1}{0.1*k_3s+1}", equation_string="2/(s+1)*1/(0.1*k_3s+1)","LowPass 2nd");
  addNewGraph(null, mathfield_string="\\frac{k_2}{(T_2s+1)(T_3s+1)}", equation_string="k_2/(T_2s+1)*1/(T_3s+1)","Two real poles");
//  addNewGraph(null, mathfield_string="\\frac{2}{T_1*s+1}*\\frac{1}{T_2*s+1}", equation_string="2/(T_1*s+1)*1/(T_2*s+1)","2 real poles");

// Complex poles:
//  addNewGraph(null, mathfield_string="\\frac{3}{s^2+s+1}", equation_string="3/(s^2+s+1)","2nd");
  addNewGraph(null, mathfield_string="\\frac{k_3w^2}{s^2+2zws+w^2}", equation_string="k_3*w^2/(s^2+2*z*w*s+w^2)","Two complex poles");

// One pole, with time delay
  addNewGraph(null, mathfield_string="\\frac{3}{s+1}e^{-Ls}", equation_string="3/(s+1)*e^(-L*s)","Time delay");


// Bad, because the Nyquist diagram gets very wide:
//  addNewGraph(null, mathfield_string="\\frac{4}{s^2+1}", equation_string="4/(s^2+1)","Oscillator");
//  addNewGraph(null, mathfield_string="\\frac{4(s+1)}{s^2+s+1}", equation_string="4(s+1)/(s^2+s+1)","2poles+1zero");
//  addNewGraph(null, mathfield_string="\\frac{5(s+1)*6}{s^2+2s+6}", equation_string="5(s+1)*6/(s^2+2s+6)","Complex");


// Some day, make a pole-zero plot that can handle this case:
//  addNewGraph(null, mathfield_string="\\frac{0.9s+1}{(s+1)^2}\\frac{w^2}{s^2+2zws+w^2}", equation_string="(0.9s+1)/((s+1)^4)","4 poles + 1 zero");



  noLoop();
}

function draw(){
  background(background_color);
  push();
  translate(65+graph_nyquist_x,45+graph_nyquist_y);
  draw_nyquist_responses();
  pop();

  push();
  translate(70+graph_bode_mag_x,30+graph_bode_mag_y);
  draw_bode_responses('gain');
  pop();

  push();
  translate(60+graph_bode_phase_x,30 + graph_bode_phase_y + 46);
  x_axis_steps_text();
  pop();

  push();
  translate(70+graph_bode_phase_x,30 + graph_bode_phase_y + 80);
  draw_bode_responses('phase');
  pop();

  push();
  translate(65+graph_step_response_x,45+graph_step_response_y);
  draw_time_responses();
  pop();

  push();
  translate(graph_pole_zero_x,graph_pole_zero_y);
  draw_pole_zeros();
  pop();

}

//Toolbox
function roundup_decimal(input){
  var sign = Math.sign(input);
  input = abs(input);
  var decimal_part = input % 1;
  if(decimal_part >= 0.5){
    return ceil(input)*sign;
  }
  else{
    return floor(input)*sign;
  }
}

function value_magnet(input,magnet_value){
  var magnet_count = roundup_decimal(input/magnet_value);
  return magnet_count * magnet_value;
}

function get_bestMultiple(input,divider,type){
  var sign = Math.sign(input);
  input = abs(input);
  var dividend = +(input/divider).toFixed(1);
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

    var min_phase = 10000;
    var max_phase = -10000;

    for(i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        var current_graph = bode_graphs[i];
        if(current_graph.bode_min_phase < min_phase){
          min_phase = current_graph.bode_min_phase;
        }
        if(current_graph.bode_max_phase > max_phase){
          max_phase = current_graph.bode_max_phase;
        }
      }
    }

    // Limiting the phase axis into something sane:
    min_phase = math.max(-5,min_phase);
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

    for(y = 0; y <= phase_case_number; y++){
      stroke(line_color);
      strokeWeight(1);

      var pas = graph_bode_phase_height*y/phase_case_number;
      var value = phase_upper_bound - 45*y;

      line(0,pas,graph_bode_phase_width,pas);

      noStroke();
      fill(text_color);
      text(value,-7,pas+5);
    }

    for(i = 0;i < bode_graphs.length;i++){
      if(bode_graphs[i].bode_displaybool){
        bode_graphs[i].draw_phase();
      }
    }
  }

  else if(type == "gain"){
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
    for(y=0; y<=y_case_gain; y++){
      stroke(line_color);
      pas = graph_bode_mag_height*y/y_case_gain;
      strokeWeight(1);
      line(0,pas,graph_bode_mag_width,pas);
      if (y>0){
        strokeWeight(0.5);
        for(i=1; i<=9; i++){
          var pas2 = pas - graph_bode_mag_height/y_case_gain * log(i+1)/log(10);
          line(0,pas2,graph_bode_mag_width,pas2);
        }
      }

      noStroke();
      fill(text_color);
      value_dB = gain_upper_bound - 20*y;
      var value = 1.0 * Math.pow(10.0, value_dB / 20.0);
      text(value,-7,pas+5);
    }

    for(i=0;i < bode_graphs.length;i++){
      if(bode_graphs[i].bode_displaybool){
        bode_graphs[i].draw_gain();
      }
    }


    // Draw X for T_1, T_2, T_3 and w:
    for (var i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        if (bode_graphs[i].bode_id == 1){
          // Draw T_1:
          try{ // The graph may be deleted, so this might fail:
            var T_1 = range_slider_variables[variable_position["T_1"]];
            if (T_1 >= 0){
              var frequency = 1 / T_1;
              // Need to map frequency to pixel:
  //            console.log("frequency="+frequency);
              var screen_x = (log(frequency)/log(10) + 2) * graph_bode_mag_width/5;
  //            console.log("screen_x="+screen_x);
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
  //            strokeWeight(1);
  //            line(screen_x,0,screen_x,graph_bode_mag_height);
            }
          } catch {}
        } else if (bode_graphs[i].bode_id == 2){
          // Draw T_2 and T_3:
          try{ // The graph may be deleted, so this might fail:
            var T_2 = range_slider_variables[variable_position["T_2"]];
            if (T_2 >= 0){
              // Now we know the x position. Let's find out the y position:
              var frequency = 1 / T_2;
              // Need to map frequency to pixel:
              var screen_x = (log(frequency)/log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
              stroke(bode_graphs[i].bode_hue,240,360);
  //            strokeWeight(1);
  //            line(screen_x,0,screen_x,graph_bode_mag_height);
            }
            var T_3 = range_slider_variables[variable_position["T_3"]];
            if (T_3 >= 0){
              // Now we know the x position. Let's find out the y position:
              var frequency = 1 / T_3;
              // Need to map frequency to pixel:
              var screen_x = (log(frequency)/log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
  //            strokeWeight(1);
  //            line(screen_x,0,screen_x,graph_bode_mag_height);
            }
          } catch {}
        } else if (bode_graphs[i].bode_id == 3){
          // Draw w:
          try{ // The graph may be deleted, so this might fail:
            var w = range_slider_variables[variable_position["w"]];
            if (w >= 0){
              var frequency = w;
              // Need to map frequency to pixel:
              var screen_x = (log(frequency)/log(10) + 2) * graph_bode_mag_width/5;
              // Now we know the x position. Let's find out the y position:
              let screen_y = map(bode_graphs[i].bode_gain_array[round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
              stroke(bode_graphs[i].bode_hue,240,360);
              strokeWeight(3);
              draw_X(screen_x,screen_y);
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

function draw_time_responses(){
  if(document.getElementById("automatic-range-time").checked){
    min_y_timerep = 100000;
    max_y_timerep = -100000;

    for(i = 0;i < bode_graphs.length;i++){
      if(bode_graphs[i].bode_displaybool){
        current_graph = bode_graphs[i];
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
  if (abs(min_y_timerep) < 0.1){
    min_y_timerep = round(min_y_timerep);
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
  text("time [s]",graph_step_response_width,graph_step_response_height+45);
  draw_timelines();

  // Draw "final value":
  for (var i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if (bode_graphs[i].bode_id == 1){
        var k_1 = range_slider_variables[variable_position["k_1"]];
        var screen_y = map(k_1,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_id == 2){
        var k_2 = range_slider_variables[variable_position["k_2"]];
        var screen_y = map(k_2,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_id == 3){
        var k_3 = range_slider_variables[variable_position["k_3"]];
        var screen_y = map(k_3,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      } else if (bode_graphs[i].bode_id == 4){
        var k_4 = 3;
        var screen_y = map(k_4,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
        stroke(bode_graphs[i].bode_hue,240,360);
        strokeWeight(0.5);
        line(0,screen_y,graph_step_response_width,screen_y);
      }
    }
  }





  for (var i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if (bode_graphs[i].bode_id == 1){
        // Draw T_1:
        try{ // The graph may be deleted, so this might fail:
          var T_1 = range_slider_variables[variable_position["T_1"]];
          if (T_1 >= 0){
            // Now we know the x position. Let's find out the y position:
            var linked_x = round(T_1 / 10.0 * graph_step_response_width/precision);
            var linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            var screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            var screen_x = graph_step_response_width / 10 * T_1;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
        //    strokeWeight(1);
        //    line(screen_x,0,screen_x,graph_step_response_height);
          }
        } catch {}
      } else if (bode_graphs[i].bode_id == 2){
        // Draw T_2:
        try{ // The graph may be deleted, so this might fail:
          var T_2 = range_slider_variables[variable_position["T_2"]];
          if (T_2 >= 0){
            // Now we know the x position. Let's find out the y position:
            var linked_x = round(T_2 / 10.0 * graph_step_response_width/precision);
            var linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            var screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            var screen_x = graph_step_response_width / 10 * T_2;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}

        // Draw T_3:
        try{ // The graph may be deleted, so this might fail:
          var T_3 = range_slider_variables[variable_position["T_3"]];
          if (T_3 >= 0){
            // Now we know the x position. Let's find out the y position:
            var linked_x = round(T_3 / 10.0 * graph_step_response_width/precision);
            var linked_y = bode_graphs[i].bode_timerep_array[linked_x];
            var screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
            var screen_x = graph_step_response_width / 10 * T_3;
            stroke(bode_graphs[i].bode_hue,240,360);
            strokeWeight(3);
            draw_X(screen_x,screen_y);
          }
        } catch {}
      }
    }
  }

  for(i = 0;i < bode_graphs.length;i++){
    if(bode_graphs[i].bode_displaybool){
      bode_graphs[i].draw_timeresponse();
    }
  }
}

function draw_nyquist_responses(){
  if(document.getElementById("automatic-range-nyq").checked){
    min_nyquist_x = 10000;
    max_nyquist_x = -10000;
    min_nyquist_y = 10000;
    max_nyquist_y = -10000;

    for(i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        var current_graph = bode_graphs[i];
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

    // Correct max/mins so that the aspect ratio of the Nyquist diagram is 1.0:
    var mag_x = max_nyquist_x - min_nyquist_x;
    var mag_y = max_nyquist_y - min_nyquist_y;
    var center_x = (max_nyquist_x + min_nyquist_x) / 2;
    var center_y = (max_nyquist_y + min_nyquist_y) / 2;
    var desired_aspect_ratio = graph_nyquist_height / graph_nyquist_width;
    var current_aspect_ratio = mag_x / mag_y;
    if (desired_aspect_ratio < current_aspect_ratio){
      // The graph is currently "too wide"
      var correction_factor = current_aspect_ratio / desired_aspect_ratio;
      max_nyquist_x = center_x + mag_x / 3 * correction_factor;
      min_nyquist_x = center_x - mag_x / 3 * correction_factor;
    } else {
      // The graph is currently "too thin"
      var correction_factor = current_aspect_ratio / desired_aspect_ratio;
      max_nyquist_y = center_y + mag_y/2 / correction_factor;
      min_nyquist_y = center_y - mag_y/2 / correction_factor;
    }


  }

  textAlign(CENTER);
  noStroke();
  fill(text_color);
  textSize(15);
  text("Nyquist diagram",graph_nyquist_width/2,-5);
  text("Real axis",graph_nyquist_width/2,graph_nyquist_height+45);

//  text("im",-60,graph_nyquist_height/2 + 4);
  push();
  translate(-55,graph_nyquist_height/2 + 4);
  rotate(-PI/2);
  text("Imaginary axis",0,0);
  pop();

  draw_nyquist_lines();

  // Put a blob at -1,0
  push();
  var x=-1;
  var y=0;
  let screen_x = map(x,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y = map(y,min_nyquist_y,max_nyquist_y,0,graph_nyquist_height);
  noStroke();
  var blob_color = color('hsb(0, 0%, 50%)');
  fill(blob_color,360,360);
  ellipse(screen_x,screen_y,12,12);
  textAlign(RIGHT);
//  text("Feedback ->",screen_x-12,screen_y+4);
//  text("Feed",screen_x-32,screen_y+4-7);
//  text("back",screen_x-32,screen_y+4+7);
//  text("->",screen_x-12,screen_y+4);
  text("-1",screen_x+7,screen_y+18);
  pop();

  for(i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      bode_graphs[i].draw_nyquist_response();
    }
  }
}

var pole_zero_graph_x = []
var pole_zero_graph_y = []

function draw_pole_zeros(){
  pole_zero_width = graph_pole_zero_width;
  pole_zero_height = pole_zero_width;
//  strokeWeight(2);
//  var blob_color = color('hsb(30, 30%, 15%)');
//  fill(blob_color,360,360);
//  ellipse(graph_pole_zero_width/2, graph_pole_zero_height/2, graph_pole_zero_width, graph_pole_zero_height);
  // Only draw pole zeros for startup graphs:
  for(i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_id<=3)){
      pole_zero_graph_x[i] = graph_pole_zero_x;
      pole_zero_graph_y[i] = 30 + (pole_zero_height + 10) * i;
      push();
      translate(0,pole_zero_graph_y[i]);
      var draw_axis = false;
      if (i == bode_graphs.length-2){
        draw_axis=true;
      }
      bode_graphs[i].draw_pole_zero(draw_axis);
      pop();
    }
  }
  push();
  noStroke();
  textSize(15);
  textAlign(CENTER);
  fill(text_color);
  text("Poles & zeros",graph_pole_zero_width/2,20);
  pop();
}


function redraw_canvas_gain(input_id){
  for(v=0; v<bode_graphs.length; v++){
    if(bode_graphs[v].bode_id == input_id || input_id == "all"){
      bode_graphs[v].get_complex_p5();
    }
  }
  for(v=0; v<bode_graphs.length; v++){
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

var bode_3_real = -1.0;
var bode_3_imaginary = 0.5;

let clicked_on_time_response_graph_no=-1;

let initial_mouseX = 0;
let initial_mouseY = 0;

//function mouseClicked(){
function mousePressed(){
  // Decide what we clicked on initially, to know what to move.

  var toggleElement = document.querySelector('.download_script_box');
  if (toggleElement.classList.contains('active')){
    // The code text is active. Just disable mouse clicks to prevent poles & zeros from moving:
    clicked_on_time_response_graph_no = -1;
    clicked_on_bode_mag_graph_no = -1;
    return;
  }

  // Check if we've clicked the step response graph:
  var queue = [];
  var yes_close_enough = false;
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  if(((mouseX-graph_step_response_x) > 65 && (mouseX-graph_step_response_x) < graph_step_response_width + 65)&&
    ((mouseY-graph_step_response_y) > 45 && (mouseY-graph_step_response_y) < graph_step_response_height + 45)){
    var linked_x = ceil((mouseX - graph_step_response_x - 65)/precision);
    for(h=0; h<bode_graphs.length;h++){
      var current_graph = bode_graphs[h];
      var linked_y = current_graph.bode_timerep_array[linked_x];
      var screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + 45;
      var distance = abs(mouseY - graph_step_response_y - screen_y);
      if(distance < 70){
        yes_close_enough = true;
        queue.push([distance,h,linked_y]);
      }
    }
    var output;
    var distance = 10000;
    for(h = 0;h < queue.length;h++){
      if(queue[h][0] < distance){
        distance = queue[h][0];
        output = queue[h];
      }
    }
    push();
    stroke(text_color);
    strokeWeight(2);
    line(mouseX,graph_step_response_y+45,mouseX,graph_step_response_y + 45 + graph_step_response_height);
    pop();
    if(yes_close_enough){
      clicked_on_time_response_graph_no = output[1];  // 0 - 3
      initial_mouseX = mouseX;
      initial_mouseY = mouseY;
    }
  } else if(((mouseX-graph_bode_mag_x) > 68 && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + 68)&&
    ((mouseY-graph_bode_mag_y) > 30 && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + 30)){
    // we clicked the bode magnitude plot. Let's find out which graph we clicked:
    var linked_x = mouseX - graph_bode_mag_x - 68;
    var linked_y = mouseY - graph_bode_mag_y - 30;
    var perc_x = linked_x / graph_bode_mag_width;
    var perc_y = linked_y / graph_bode_mag_height;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    var exponent = perc_x*x_case_gain + min_10power;
    var frequency = pow(10,exponent);

    var queue = [];
    var yes_close_enough = false;
    for(i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        var current_graph = bode_graphs[i];
        var linked_y = current_graph.bode_gain_array[linked_x];
        let screen_y = 30 + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        var distance = abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough = true;
          queue.push([distance,i,screen_y,linked_y]);
        }
      }
    }
    var magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
    var magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
    // Find the closest point from the graphs:
    var output;
    var distance = 10000;
    for(h = 0;h < queue.length;h++){
      if(queue[h][0] < distance){
        distance = queue[h][0];
        output = queue[h];
      }
    }
    if(yes_close_enough){
      clicked_on_bode_mag_graph_no=output[1];
      initial_mouseX = mouseX;
      initial_mouseY = mouseY;
    }
  }

  // When we know what was clicked on, we can run mouseDragged directly:
  mouseDragged();
}

function mouseReleased(){
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
}

function mouseDragged(){
  var toggleElement = document.querySelector('.download_script_box');
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
    if (clicked_on_time_response_graph_no == 0){
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
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (clicked_on_time_response_graph_no == 1){
      let T_2 = range_slider_variables[variable_position["T_2"]];
      T_2 = T_2 + mouseDiffX * 10.0;
      if (T_2 < 0) T_2=0;
      range_slider_variables[variable_position["T_2"]] = T_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_2"]).value = T_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_2"]).value = T_2.toFixed(2);

      let k_2 = range_slider_variables[variable_position["k_2"]];
      k_2 = k_2 - mouseDiffY * y_range;
      range_slider_variables[variable_position["k_2"]] = k_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_2"]).value = k_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_2"]).value = k_2.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);
    } else if (clicked_on_time_response_graph_no == 2){
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
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }

    initial_mouseX = mouseX;
    initial_mouseY = mouseY;
  } else if (clicked_on_bode_mag_graph_no != -1){
    let i=clicked_on_bode_mag_graph_no;
    // Dragging one of the graphs in the bode magnitude plot:
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;
    if (clicked_on_bode_mag_graph_no == 0){
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
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (clicked_on_bode_mag_graph_no == 1){
      let T_2 = range_slider_variables[variable_position["T_2"]];
      T_2 = T_2 * (1.0 - mouseDiffX*10.0);
      if (T_2 < 0) T_2=0;
      range_slider_variables[variable_position["T_2"]] = T_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["T_2"]).value = T_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["T_2"]).value = T_2.toFixed(2);

      let k_2 = range_slider_variables[variable_position["k_2"]];
      k_2 = k_2 * (1.0 - mouseDiffY*12.0);
      range_slider_variables[variable_position["k_2"]] = k_2;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["k_2"]).value = k_2.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["k_2"]).value = k_2.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);
    } else if (clicked_on_bode_mag_graph_no == 2){
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
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }

    initial_mouseX = mouseX;
    initial_mouseY = mouseY;

  } else {
    // Check if we've dragged in any of the pole-zero graphs:
    for(i=0; i<bode_graphs.length; i++){
      if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
        if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
          if(bode_graphs[i].bode_displaybool){
            var real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            var imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;

            const EPS = 0.06666667;
            if (bode_graphs[i].bode_id == 1){
              // Change T_1
              if (real > EPS) real=EPS;

              range_slider_variables[variable_position["T_1"]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["T_1"]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["T_1"]).value = -(1/real).toFixed(2);
              redraw_canvas_gain(bode_graphs[i].bode_id);
            } else if (bode_graphs[i].bode_id == 2){
              // Change T_2 or T_3
              if (real > EPS) real=EPS;
              // ToDo. Let's select the one that is closest to our initial click.
              range_slider_variables[variable_position["T_2"]] = -1/real;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["T_2"]).value = -(1/real).toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["T_2"]).value = -(1/real).toFixed(2);
              redraw_canvas_gain(bode_graphs[i].bode_id);
            } else if (bode_graphs[i].bode_id == 3){
              // Change complex poles:
              if (real > 0) real=0;
              if (imaginary < 0) imaginary=-imaginary;
              bode_3_real = real;
              bode_3_imaginary = imaginary;

              // Update variable w  = "cutoff frequency"
              // w = length of vector (re,im)
              var w = sqrt(real*real + imaginary*imaginary);
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
              // ζ= - Re(pole) / sqrt(Re(pole)^2 + Im(pole)^2)
              var z = -real / sqrt(real*real + imaginary*imaginary);
              range_slider_variables[variable_position["z"]] = z;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["z"]).value = z.toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["z"]).value = z.toFixed(2);

              redraw_canvas_gain(bode_graphs[i].bode_id);
            }
          }

        }
      }
    }
  }
}

function mouseMoved(){
  redraw();

  var additional_information_bool = document.getElementById("addition-information").checked;
  if(additional_information_bool){

    // Check if we're hovering any of the pole-zero graphs:
    for(i=0; i<bode_graphs.length; i++){
      if(bode_graphs[i].bode_displaybool){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
            var real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 2;
            var imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
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

    // Check if we're hovering the step response graph:
    var queue = [];
    var yes_close_enough = false;
    if((mouseX-graph_step_response_x) > 65 && (mouseX-graph_step_response_x) < graph_step_response_width + 62){
      if((mouseY-graph_step_response_y) > 45 && (mouseY-graph_step_response_y) < graph_step_response_height + 45){
        var linked_x = ceil((mouseX - graph_step_response_x - 65)/precision);
        for(h=0; h<bode_graphs.length;h++){
          if(bode_graphs[h].bode_displaybool){
            var current_graph = bode_graphs[h];
            var linked_y = current_graph.bode_timerep_array[linked_x];
            var screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + 45;
            var distance = abs(mouseY - graph_step_response_y - screen_y);
            if(distance < 70){
              yes_close_enough = true;
              queue.push([distance,h,linked_y]);
            }
          }
        }
        var output;
        var distance = 10000;
        for(h = 0;h < queue.length;h++){
          if(queue[h][0] < distance){
            distance = queue[h][0];
            output = queue[h];
          }
        }
        push();
        stroke(text_color);
        strokeWeight(2);
        line(mouseX,graph_step_response_y+45,mouseX,graph_step_response_y + 45 + graph_step_response_height);
        pop();
        if(yes_close_enough){
          var linked_bode_graph = bode_graphs[output[1]];
          var linked_x = map(mouseX - graph_step_response_x - 65,0,graph_step_response_width,0,max_x_timerep,true);
          var screen_y = map(output[2],min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
          noStroke();
          fill(linked_bode_graph.bode_hue,360,360);
          ellipse(mouseX,screen_y + 45 + graph_step_response_y,12,12);
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
          text(bode_graphs[linked_bode_graph.bode_id-1].graph_name,35,24);
          textSize(15);
          text("time=" + linked_x.toFixed(3) + "s",13,53);
          text("output=" + output[2].toFixed(3),13,77);
          pop();
        }
      }
    }



    // Check if we're hovering the bode magnitude plot:
    if((mouseX-graph_bode_mag_x) > 68 && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + 68){
      if((mouseY-graph_bode_mag_y) > 30 && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + 30){
        var linked_x = mouseX - graph_bode_mag_x - 68;
        var linked_y = mouseY - graph_bode_mag_y - 30;
//        console.log("# inside bode_mag graph, x="+linked_x+", y="+linked_y);
        var perc_x = linked_x / graph_bode_mag_width;
        var perc_y = linked_y / graph_bode_mag_height;
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y);
        // 0.0   equals hovering over frequency 10^min_10power (= -2);
        // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
        var exponent = perc_x*x_case_gain + min_10power;
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", exp="+exponent);
        var frequency = pow(10,exponent);
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", freq="+frequency);
        var queue = [];
        var yes_close_enough = false;
        for(i=0; i<bode_graphs.length; i++){
          if(bode_graphs[i].bode_displaybool){
//            bode_graphs[i].draw_nyquist_value(frequency);
            bode_graphs[i].draw_nyquist_value(perc_x);
            var current_graph = bode_graphs[i];
            var linked_y = current_graph.bode_gain_array[linked_x];
            let screen_y = 30 + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
            var distance = abs(mouseY - graph_step_response_y - screen_y);
            if(distance < 70){
              yes_close_enough = true;
              queue.push([distance,i,screen_y,linked_y]);
            }
          }
        }
        push();
        stroke(text_color);
        strokeWeight(2);
        line(mouseX,graph_bode_mag_y+30,mouseX,graph_bode_mag_y + 30 + graph_bode_mag_height);
        line(mouseX,graph_bode_phase_y+110,mouseX,graph_bode_phase_y + 110 + graph_bode_phase_height);
        pop();

        var magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
        //console.log("perc_y="+perc_y);
        //console.log("magnitude_in_dB="+magnitude_in_dB); //=6
        var magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
        // perc_y = 1.0 -> magnitude = 0.001
        // perc_y = 0.0 -> magnitude = 1000
//        console.log("magnitude="+magnitude);

        // Find the closest point from the graphs:
        var output;
        var distance = 10000;
        for(h = 0;h < queue.length;h++){
          if(queue[h][0] < distance){
            distance = queue[h][0];
            output = queue[h];
          }
        }
        push();
        stroke(text_color);
        strokeWeight(2);
        line(mouseX,graph_bode_mag_y+45,mouseX,graph_bode_mag_y + 30 + graph_bode_mag_height);
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
          text(bode_graphs[bode_graphs[output[1]].bode_id-1].graph_name,35,24);
          textSize(15);
//          text("time=" + linked_x.toFixed(3) + "s",13,53);
//          text("output=" + output[2].toFixed(3),13,77);
          text("freq=" + frequency.toFixed(3) + "rad/s",13,53);
          var magnitude_in_dB = output[3];
          var magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
          text("magnitude=" + magnitude.toFixed(3),13,77);
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
        }
      }
    }

    // Check if we're hovering the bode phase plot:
    if((mouseX-graph_bode_phase_x) > 68 && (mouseX-graph_bode_phase_x) < graph_bode_phase_width + 68){
      if((mouseY-graph_bode_phase_y-110) > 0 && (mouseY-graph_bode_phase_y-110) < graph_bode_phase_height){
        var linked_x = mouseX - graph_bode_phase_x - 68;
        var linked_y = mouseY - graph_bode_phase_y - 110;
//        console.log("# inside bode_phase graph, x="+linked_x+", y="+linked_y);
        var perc_x = linked_x / graph_bode_phase_width;
        var perc_y = linked_y / graph_bode_phase_height;
//        console.log("# inside bode_phase graph, x="+perc_x+", y="+perc_y);
        // 0.0   equals hovering over frequency 10^min_10power (= -2);
        // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
        var exponent = perc_x*x_case_gain + min_10power;
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", exp="+exponent);
        var frequency = pow(10,exponent);
//        console.log("# inside bode_mag graph, x="+perc_x+", y="+perc_y+", freq="+frequency);
        for(i=0; i<bode_graphs.length; i++){
          if(bode_graphs[i].bode_displaybool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
        }
        push();
        stroke(text_color);
        strokeWeight(2);
        line(mouseX,graph_bode_mag_y+30,mouseX,graph_bode_mag_y + 30 + graph_bode_mag_height);
        line(mouseX,graph_bode_phase_y+110,mouseX,graph_bode_phase_y + 110 + graph_bode_phase_height);
        pop();

        // Find the phase where the mouse is.
        //console.log("perc_y="+perc_y);
        // perc_y=0  -> phase = highest phase
        // perc_y=1.0  -> phase = lowest phase
        var phase = phase_upper_bound - 45*phase_case_number*perc_y;
        //console.log("phase="+phase);

        yes_close_enough = true;
        if(yes_close_enough){
          noStroke();
          push();
          translate(mouseX,mouseY);
          fill(box_background_color,200);
          stroke(150);
          rect(0,0,160,90);
          noStroke();
          fill(text_color);
          textSize(15);
          text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
          text("phase=" + phase.toFixed(0) + "°",13,53);
          pop();
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

  sum = (1 - pow(1/rate,9))/(1 - 1/rate);
  step_x = (graph_bode_mag_width/x_case)/sum;

  for(x = 0; x < x_case; x++){
    pas = graph_bode_mag_width*x/x_case;
    for(i = 0; i<=9 ; i++){
      if(i == 0){
        strokeWeight(2);
      }
      else{
        strokeWeight(1);
      }
      line(pas,0,pas,graph_bode_mag_height);
      pas += step_x/pow(rate,i);
    }
  }
}

function draw_timelines(){
  min_y_timerep = floor(min_y_timerep*1) / 1;
  max_y_timerep = ceil(max_y_timerep*1) / 1;
//  min_y_timerep = 0;

  var x_step = +(abs(max_x_timerep)/10).toPrecision(1);
  var y_step = +(abs(max_y_timerep - min_y_timerep)/10).toPrecision(1);

  if(document.getElementById("automatic-range-time").checked){
    max_y_timerep = +(get_bestMultiple(max_y_timerep, y_step, "upper") + y_step).toFixed(2);
  }
  else{
    max_y_timerep = +(get_bestMultiple(max_y_timerep, y_step, "upper")).toFixed(2);
  }

  min_y_timerep = +(get_bestMultiple(min_y_timerep, y_step, "lower")).toFixed(2);

  // Since max_y and min_y might have changed - recalculate this:
  y_step = +(abs(max_y_timerep - min_y_timerep)/10).toPrecision(1);

  var x_case_number = Math.ceil(max_x_timerep/x_step);
  var y_case_number = Math.ceil(abs(max_y_timerep - min_y_timerep)/y_step);

  // Since max_y and min_y might have changed - recalculate this:
  y_step = abs(max_y_timerep - min_y_timerep)/y_case_number;

  var x_tile_length = graph_step_response_width/x_case_number;
  var y_tile_length = graph_step_response_height/y_case_number;

  textAlign(CENTER);

  for(x=0; x<=x_case_number; x++){
    stroke(line_color);
    if (x==0){
      strokeWeight(3);
    } else {
      strokeWeight(1);
    }
    line(x*x_tile_length,0,x*x_tile_length,graph_step_response_height);
    var text_value = x_step*x;

    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(0),x*x_tile_length,graph_step_response_height + 25);
  }

  for(y=0; y<=y_case_number; y++){
    stroke(line_color);
    strokeWeight(1);
    line(0,y*y_tile_length,graph_step_response_width,y*y_tile_length);
    var text_value = max_y_timerep - y_step*y;

    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(2),-30,y*y_tile_length+5);
  }

  // Draw a thicker line at y=0:
  var screen_y = map(0,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
  stroke(line_color);
  strokeWeight(3);
  line(0,screen_y,graph_step_response_width,screen_y);
}

function draw_nyquist_lines(){
  var x_step = +(abs(max_nyquist_x - min_nyquist_x)/10).toPrecision(1);
  var y_step = +(abs(max_nyquist_y - min_nyquist_y)/10).toPrecision(1) * 2;

  max_nyquist_y = Math.max(abs(max_nyquist_y),abs(min_nyquist_y));

//  var tmp = max_nyquist_y;
//  max_nyquist_y = -min_nyquist_y;
//  min_nyquist_y = -tmp;

  if(document.getElementById("automatic-range-nyq").checked){
    max_nyquist_y = +(value_magnet(max_nyquist_y,y_step) + y_step).toFixed(2);
    min_nyquist_y = -max_nyquist_y;
    min_nyquist_x = +(value_magnet(min_nyquist_x,x_step) - x_step).toFixed(2);
    max_nyquist_x = +(value_magnet(max_nyquist_x,x_step) + x_step).toFixed(2);
  } else {
    max_nyquist_y = +(value_magnet(max_nyquist_y,y_step)).toFixed(2);
    min_nyquist_y = -max_nyquist_y;
    min_nyquist_x = +(value_magnet(min_nyquist_x,x_step)).toFixed(2);
    max_nyquist_x = +(value_magnet(max_nyquist_x,x_step)).toFixed(2);
  }

  var x_case_number = roundup_decimal(abs(max_nyquist_x - min_nyquist_x)/x_step);
  var y_case_number = roundup_decimal(abs(max_nyquist_y - min_nyquist_y)/y_step);

  var x_tile_length = graph_nyquist_width/x_case_number;
  var y_tile_length = graph_nyquist_height/y_case_number;

  textAlign(CENTER);

  for(x=0; x<=x_case_number; x++){
    stroke(line_color);
    strokeWeight(1);
    line(x*x_tile_length,0,x*x_tile_length,graph_nyquist_height);
    var text_value = +min_nyquist_x + x*x_step;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(1),x*x_tile_length,graph_nyquist_height + 25);
  }

  for(y=0; y<=y_case_number; y++){
    stroke(line_color);
    strokeWeight(1);
    line(0,y*y_tile_length,graph_nyquist_width,y*y_tile_length);
    var text_value = +max_nyquist_y - y*y_step;
    noStroke();
    fill(text_color);
    textSize(15);
    text(text_value.toFixed(1),-30,y*y_tile_length+4);
  }

  // Thicker line at real=0, and im=0:
  stroke(line_color);
  strokeWeight(3);
  let screen_x = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y = map(0,min_nyquist_y,max_nyquist_y,0,graph_nyquist_height);
  line(screen_x,0,screen_x,graph_nyquist_height);
  line(0,screen_y,graph_nyquist_width,screen_y);
}

function x_axis_steps_text(){
  var screen_step = graph_bode_mag_width / x_case_gain;
  for(h=0; h<=x_case_gain; h++){
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
        let math_x = pow(10,log_pow);
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

        let bode_gain = 20*log(bode_value.r)/log(10);
        let bode_phase = bode_value.phi;
        bode_phase += phase_bias;

        if(x > 0 && abs(bode_phase - this.bode_phase_array[x-1]) > 5.23 && corrector_bool){
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
    var formula_to_use = this.bode_formula;


    //console.log(input_formula);
    //console.log(this.bode_formula);
    // Take care of "known good" formulas that we know an exact answer to:

    let have_a_solution = false;
    // Make analytic solutions for:
    // k_1/(T_1*s+1)
    // k_2/(T_2s+1)*1/(T_3s+1)
    // k_3*w^2/(s^2+2*z*w*s+w^2)
    // 3/(s+1)*e^(-L*s)
    if (this.bode_formula == "k_1/(T_1*s+1)"){
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
    } else if (this.bode_formula == "k_2/(T_2s+1)*1/(T_3s+1)"){
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
    } else if (this.bode_formula == "k_3*w^2/(s^2+2*z*w*s+w^2)"){
      let k_3 = range_slider_variables[variable_position["k_3"]];
      let z = range_slider_variables[variable_position["z"]];
      let w = range_slider_variables[variable_position["w"]];
      if (input_formula=="1/s"){       // Unit Step response
        // Step input response for
        //   H(s) = 1 / (s^2 + +2ζωs + w^2)
        // is
        //   h(t) = 1/(w*sqrt(1-ζ^2)) * exp(-ζwt) * sin(w*sqrt(1-*ζ^2)*t)
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
            var exponentTerm = exp(-z*w*t);
            var sinTerm = sin(w * sqrt(1.0-z*z) * t + acos(z));  // acos = inverse cosine (in radians)
            var math_y = k_3 * (1.0 - (1.0 / (sqrt(1.0-z*z)) * exponentTerm * sinTerm));
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
            var math_y;
            if (z==0){
              math_y = k_3 * sin(w * t);
            } else if (z==1){
              math_y = k_3 * t * exp(-w*t);
            } else if (z<1){
              var exponentTerm = exp(-z*w*t);
              var sinTerm = sin(w * sqrt(1.0-z*z));
              math_y = k_3 * (1.0 / sqrt(1-z*z)) * exponentTerm * sinTerm;
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

      var time_delay = 0.0;
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

        for(let x=0;x < graph_step_response_width; x+=precision){
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
    for(let x=0;x < graph_bode_mag_width; x++){
      let screen_y = map(this.bode_gain_array[x],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
      if(screen_y < graph_bode_mag_height && screen_y > 0){
        vertex(x,screen_y);
      }
    }
    endShape();
  }

  draw_phase(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);

    let rad_phase_lower_bound = phase_lower_bound*PI/180;
    let rad_phase_upper_bound = phase_upper_bound*PI/180;

    beginShape();
    for(let x=0;x < graph_bode_phase_width; x++){
      let screen_y = map(this.bode_phase_array[x],rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
      if(screen_y < graph_bode_phase_height && screen_y > 0){
        vertex(x,screen_y);
      } else {
        // Stop drawing phase if it goes off graph. Removes garbage at end of time-delayed plot:
        break;
      }
    }
    endShape();
  }

  draw_timeresponse(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    beginShape();
    for(let x=0;x < this.bode_timerep_array.length;x++){
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
    let new_complex_array = this.bode_complex_array.map(x => x.conjugate()).reverse();

    beginShape();
    for(let x=0;x < new_complex_array.length;x++){
      let current_complex = new_complex_array[x];
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,min_nyquist_y,max_nyquist_y,0,graph_nyquist_height);
      vertex(screen_x,screen_y);
    }
    endShape();

    // Draw a red X for T_1 in the Nyquist diagram:
    if(this.bode_displaybool){
      if(this.bode_id==1){
        // Draw a red X for T_1 in the Nyquist diagram:
        var T_1 = range_slider_variables[variable_position["T_1"]];
        if (T_1 != 0){
          var frequency = 1 / T_1;
          bode_graphs[i].draw_nyquist_X(frequency);
        }
      } else if(this.bode_id==2){
        // Draw a X for T_2 in the Nyquist diagram:
        var T_2 = range_slider_variables[variable_position["T_2"]];
        if (T_2 != 0){
          var frequency = 1 / T_2;
          bode_graphs[i].draw_nyquist_X(frequency);
        }
        // Draw a X for T_3 in the Nyquist diagram:
        var T_3 = range_slider_variables[variable_position["T_3"]];
        if (T_3 != 0){
          var frequency = 1 / T_3;
          bode_graphs[i].draw_nyquist_X(frequency);
        }
      } else if(this.bode_id==3){
        // Draw a X for w in the Nyquist diagram:
        var w = range_slider_variables[variable_position["w"]];
        if (w != 0){
          var frequency = w;
          bode_graphs[i].draw_nyquist_X(frequency);
        }
      }
    }
  }

  draw_nyquist_X(frequency){
    let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);
    var screen_x1 = (log(frequency)/log(10) + 2) * graph_bode_mag_width/5;
    //console.log("frequency="+frequency);
    //console.log("screen_x1="+screen_x1);
    var sample_no = round(screen_x1);
//    var sample_no = floor(new_complex_array.length * percentage);
    let current_complex = new_complex_array[sample_no];
//    console.log("current_complex="+current_complex);
    try {
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,min_nyquist_y,max_nyquist_y,0,graph_nyquist_height);
      push();
  //    translate(65+graph_nyquist_x,45+graph_nyquist_y);
      //console.log("screen_x="+screen_x);
      //console.log("screen_y="+screen_y);
      stroke(bode_graphs[i].bode_hue,240,360);
      strokeWeight(3);
      draw_X(screen_x, screen_y);
      pop();
    } catch {};
  }

  draw_nyquist_value(percentage){
    let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);

    var sample_no = floor(graph_bode_mag_width * percentage);
//    var sample_no = floor(new_complex_array.length * percentage);

    let current_complex = new_complex_array[sample_no];
    let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
    let screen_y = map(current_complex.im,min_nyquist_y,max_nyquist_y,0,graph_nyquist_height);
    push();
    noStroke();
    translate(65+graph_nyquist_x,45+graph_nyquist_y);
    fill(this.bode_hue,360,360);
    ellipse(screen_x,screen_y,12,12);
    pop();
  }

  draw_pole_zero(draw_axis){
    for(x=1; x<=3; x++){
      stroke(line_color);
      if (x==3){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      line(x*pole_zero_width/4,0,x*pole_zero_width/4,pole_zero_height);
    }

    for(y=0; y<=4; y++){
      if ((y==0)||(y==4)){
        stroke(this.bode_hue,360,360);
      } else {
        stroke(line_color);
      }
      if (y==2){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      line(0,y*pole_zero_height/4,pole_zero_width,y*pole_zero_height/4);
    }

    stroke(this.bode_hue,360,360);
    strokeWeight(1);
    line(0,0,0,pole_zero_height);
    line(pole_zero_width,0,pole_zero_width,pole_zero_height);

    noFill();
    var blob_color = color('hsb(0, 0%, 20%)');
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
//    ellipse(pole_zero_width/2,pole_zero_height/2,12,12);

    if (draw_axis == true){
      push();
      noStroke();
      textSize(15);
      textAlign(CENTER);
      fill(text_color);
      for(x=0; x<=4; x++){
        text((x-3).toFixed(1),x*graph_pole_zero_width/4,pole_zero_height+20);
      }
      text("Real axis [1/s]",graph_pole_zero_width/2,pole_zero_height+35);
      pop();
    }


    var pole_x = -1.0;
    if (this.bode_id == 1){
      //pole_x = range_slider_variables[0];
      var T_1inv = 1/range_slider_variables[variable_position["T_1"]];
      if (T_1inv > 3.2) T_1inv=3.2;
      this.plot_pole(-T_1inv,0); // Should be T_1
    } else if (this.bode_id == 2){
      //pole_x = range_slider_variables[0];
      var T_2inv = 1/range_slider_variables[variable_position["T_2"]];
      if (T_2inv > 3.2) T_2inv=3.2;
      this.plot_pole(-T_2inv,0); // Should be T_2
      var T_3inv = 1/range_slider_variables[variable_position["T_3"]];
      if (T_3inv > 3.2) T_3inv=3.2;
      this.plot_pole(-T_3inv,0); // Should be T_3
    } else if (this.bode_id == 3){
      // Calculate bode_3_real and imaginary from z and w:
      // s = −ζω_n ± jω_n * sqrt(1−ζ^2)
      var z = range_slider_variables[variable_position["z"]];
      var w = range_slider_variables[variable_position["w"]];

      if (z <= 1){
        bode_3_real = -z*w;
        bode_3_imaginary = w * sqrt(1-z*z);
        var tmp_x = bode_3_real;
        var tmp_y = bode_3_imaginary;
        if (tmp_x < -3.2) tmp_x=-3.2;
        if (tmp_y < -2.2) tmp_y=-2.2;
        if (tmp_y > 2.2) tmp_y=2.2;
        this.plot_pole(tmp_x,tmp_y); // complex
        this.plot_pole(tmp_x,-tmp_y); // complex
      } else {
        //If sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
        var bode_3_real_1 = -z*w + w * sqrt(z*z-1);
        var bode_3_real_2 = -z*w - w * sqrt(z*z-1);
        bode_3_imaginary = 0;

        var tmp_x = bode_3_real_1;
        if (tmp_x < -3.2) tmp_x=-3.2;
        if (tmp_x > 1.2) tmp_x=1.2;
        this.plot_pole(tmp_x,0); // complex
        tmp_x = bode_3_real_2;
        if (tmp_x < -3.2) tmp_x=-3.2;
        if (tmp_x > 1.2) tmp_x=1.2;
        this.plot_pole(tmp_x,0); // complex
      }


// Skipping graph 4 "Time delay", since nothing is movable:
//    } else if (this.bode_id == 4){
//      //pole_x = range_slider_variables[0];
//      this.plot_pole(-1.0,0);
    }




    noStroke();
    textSize(15);
    textAlign(CENTER);
    var grey_color = color('hsb(0, 0%, 50%)');
    fill(grey_color,360,360);
    text(bode_graphs[i].graph_name,graph_pole_zero_width/2,pole_zero_height-7);

  }

  plot_pole(pole_x,pole_y){
    var screen_x = pole_zero_width/2 + (pole_x+1) * pole_zero_width/4;
    var screen_y = pole_zero_height/2 + pole_y * pole_zero_height/4;
    line(screen_x-6,screen_y-6,screen_x+6,screen_y+6);
    line(screen_x+6,screen_y-6,screen_x-6,screen_y+6);
  }

}


const NOF_CONSTANT_VARIABLES = 1; // We have 'e'. Shall not make a slider for that one.
var range_slider_variables = [2.718281828459045,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001,18012001];
var range_slider_alphabet = ['e','a','b','c','d','f','g','h','i','j','l','m','n','o','p','q','r','t','u','v','w','x','y','z','k_1','k_2','k_3','k_4','k_5','L','T_1','T_2','T_3'];
// To go from "T_1" to the index in range_slider_variables:
var variable_position = {};

var buffer_formula = 0;
var input_formula = "1/s";

function getComplexValues(freq){
  jomega = '(' + freq.toString().concat('','i') + ')';
  //Can make it faster for the upcoming for loop by creating the string of the function just once
  function_new_value = buffer_formula.replaceAll('s',jomega);
  try{
    complex_value = math.evaluate(function_new_value);
    return complex_value;
  }
  catch(error){
    return math.complex(0,0);
  }
}

function replaceLetterByValue(input_bode_formula){
  var output = true;
  buffer_formula = input_bode_formula;
  for(i=0; i<range_slider_alphabet.length; i++){
    var current_letter = range_slider_alphabet[i];
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
  var current_formula = "(" + input_formula + ")" + "(" + buffer_formula + ")"
  var v = [1/12,-385/12,1279,-46871/3,505465/6,-473915/2,1127735/3,-1020215/3,328125/2,-65625/2];
  const ln2=0.69314718056;
  sum = 0;
  current_formula = current_formula.replace('⋅','');
  for(j=0;j<=9;j++){
    new_s = (j+1)*ln2/time_to_use;
    new_s_string = '(' + new_s.toString() + ')';
    new_function_value = current_formula.replaceAll('s',new_s_string);
    sum += v[j]*math.evaluate(new_function_value);
  }
  return ln2 * sum/time_to_use;
}


function findOmegaZero(input_array){
  var a_bound = min_10power;
  var b_bound = min_10power + x_case_gain;
  var f_a = buffer_formula.replaceAll('s','(i*' + pow(10,a_bound).toString() + ')');
  var f_b = buffer_formula.replaceAll('s','(i*' + pow(10,b_bound).toString() + ')');
  f_a = 20*log(math.evaluate(f_a).toPolar().r)/log(10);
  f_b = 20*log(math.evaluate(f_b).toPolar().r)/log(10);
  if(f_a * f_b < 0){
    for(h = 0;h < 20;h++){
      var mid_point = (a_bound + b_bound)/2;
      f_mid = buffer_formula.replaceAll('s','(i*' + pow(10,mid_point).toString() + ')');
      f_mid = 20*log(math.evaluate(f_mid).toPolar().r)/log(10);
      if(f_mid * f_a < 0){
        b_bound = mid_point;
      }
      else{
        a_bound = mid_point;
      }
    }
    a_bound = (a_bound + b_bound)/2;
    //var output = buffer_formula.replaceAll('s','(i*' + pow(10,a_bound).toString() + ')');
    //output = math.evaluate(output).toPolar().phi;
    var linked_array_pos = map(a_bound,min_10power,min_10power + x_case_gain,0,graph_width-1);
    var output = input_array[ceil(linked_array_pos)];
    return [output*180/PI + 180, pow(10,a_bound)];
  }
  else{
    return NaN
  }
}

function findOmega180(input_array){
  var a_bound = min_10power;
  var b_bound = min_10power + x_case_gain;
  var f_a = input_array[ceil(map(a_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
  var f_b = input_array[ceil(map(b_bound,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
  if(f_a * f_b < 0 && abs(f_a) > 0.005 && abs(f_b) > 0.005){
    for(h = 0;h < 20;h++){
      var mid_point = (a_bound + b_bound)/2;
      var f_mid = input_array[ceil(map(mid_point,min_10power,min_10power + x_case_gain,0,graph_width-1))] + PI;
      if(f_mid * f_a < 0){
        b_bound = mid_point;
      }
      else{
        a_bound = mid_point
      }
    }
    a_bound = (a_bound + b_bound)/2;
    var output = buffer_formula.replaceAll('s','(i*' + pow(10,a_bound).toString() + ')');
    output = -20*log(math.evaluate(output).toPolar().r)/log(10);
    return [output,pow(10,a_bound)];
  }
  else{
    return NaN;
  }
}

function fivePercentTimeResponse(input_array){
  var final_value = +getTimeValues(max_x_timerep + 50).toFixed(3);
  var values = [];
  for(h = 0;h < input_array.length;h++){
    var ratio = abs(input_array[h] - final_value)/final_value;
    if(abs(ratio - 0.05) < 0.001){
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
var elem = document.documentElement;
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
  var add_button = document.getElementsByClassName("add-graph")[0];
  add_button.addEventListener('click',addNewGraph);
  var setting_button = document.getElementsByClassName("option-button")[0];
  setting_button.addEventListener('click',toolboxMenuToogle);
  var input_equation = document.getElementsByClassName("input-equation")[0].getElementsByClassName("formula")[0];
  input_equation.addEventListener('input',updateInputFormula);
  // Make sure that input function selector is visible:
  var toggleElement = document.querySelector('.input-equation');
  toggleElement.classList="active";
  updateToolbox();
}

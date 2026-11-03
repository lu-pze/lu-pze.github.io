'use strict';

function view_settings (event){
  add_event("view_settings");
  remove_all_windows();
  let settings_element = document.querySelector('.toolbox');
  settings_element.classList.add('active');
}
function hide_settings (event){
  add_event("hide_settings");
  remove_all_windows();
}

function view_info (event){
  add_event("view_info");
  achievement_done("view_info");
  remove_all_windows();
  let toggleElement = document.querySelector('.info');
  toggleElement.classList.toggle('active');
}
function hide_info (event){
  add_event("hide_info");
  remove_all_windows();
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

function hide_script(){
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

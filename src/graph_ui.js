'use strict';

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
        <span style="margin:0 0 0 10px;font-size:120%" id="variable_${variable_name}">a =</span>
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
      task_done("w=8,z=0.05,k_3=1");
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
  s += `font-size:115%;" title="${graph_name}">${mathfield_string}</math-field>`;
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
    new_bode_graph.bode_display_pole_zero_bool = false;
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

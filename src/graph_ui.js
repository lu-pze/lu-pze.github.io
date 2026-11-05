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
  const variables = formula_variables(getGraphById(input_id).bode_formula);
  if (variables === null) return; // Half-typed: the buttons stay until the formula parses again.
  for(let i=0; i<range_slider_alphabet.length; i++){
    let current_letter = range_slider_alphabet[i];
    let linked_button = document.getElementById("BTNS_" + input_id.toString() + "_" + i.toString());
    if(variables.includes(current_letter)){
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

// Achievements for a slider variable that just got a new value, by slider or typed in.
function check_slider_achievements(variable_name, value){
  if (variable_name=="L"){
    achievement_done("change_L");
  } else if ((variable_name[0]=="k") && (value >= 100)){
    achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
  } else if ((variable_name=="z") && (value <= 0.1)){
    achievement_done("low_z");
  } else if (variable_name[0]=="T"){
    check_T2_T3_achievement();
  }
}

// The information tab that the slider of a variable opens. Tab N belongs to the N:th graph on the page.
const SLIDER_INFO_TABS = {
  "k_1":1,"T_1":1,
  "k_2":2,"T_2":2,"T_3":2,
  "w":3,"z":3,"k_3":3,
  "L":4,
  "k_4":5,"T_6":5,"T_7":5,"T_8":5,
  "k_5":6,"T_5":6,
  "T_4":7,
};

// Make the relevant information bar active when a slider is changed:
function show_info_tab_of_variable(variable_name){
  if (variable_name in SLIDER_INFO_TABS){
    let info_tab = document.getElementById("graph_"+SLIDER_INFO_TABS[variable_name]+"_info");
    info_tab.checked = "true";
  }
}

function slider_start_values(variable_name){
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
  if ((variable_name=="k_1")&&is_pid_assignment()){
    range_min=0.01;
  }
  if ((variable_name=="T_1")&&is_pid_assignment()){
    range_value=6.0;
  }
  return {range_min, range_max, range_value};
}

function slider_html(variable_name, button_id, {range_min, range_max, range_value}){
  // Yes, this is ugly. But flex layout is broken (or at least differs) in mobile ios and Firefox vs. Chrome.
  // So table-based layout is a safer bet:
  return (
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
  );
}

function connect_range_slider({range_slider, linked_span, variable_name, button_id}){
  range_slider.onchange = function(){
    // Only reacts on the final value of the slider, and not continuous movements:
    check_tasks(TASK_RULES.after_slider_change, variable_name);
  }

  range_slider.oninput = function(){
    linked_span.value = +(+range_slider.value).toFixed(2);
    range_slider_variables[button_id] = +range_slider.value;
    check_slider_achievements(variable_name, +range_slider.value);
    use_fast_precision_in_pid_assignments();
    show_info_tab_of_variable(variable_name);
    redraw_canvas_gain("all");
  }
}

function connect_slider_bounds({range_slider, slider_min, slider_max}){
  slider_min.oninput = function(){
    range_slider.min = +slider_min.value;
  }
  slider_max.oninput = function(){
    range_slider.max = +slider_max.value;
  }
}

function connect_value_field({range_slider, linked_span, slider_min, slider_max, variable_name, button_id}){
  linked_span.onchange = function(){
    // Only reacts on the final value, and not while editing:
    check_tasks(TASK_RULES.after_slider_change, variable_name);
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
    check_slider_achievements(variable_name, +linked_span.value);
    range_slider.value = +linked_span.value;
    redraw_canvas_gain("all");
  }
}

function createRangeSlider(event){
  let slider = document.createElement('div');
  let button = event.target;
  let button_id = button.id.split("_")[2];
  let variable_name = range_slider_alphabet[button_id];
  let start_values = slider_start_values(variable_name);

  slider.classList.add("slider-wrapper");
  slider.innerHTML = slider_html(variable_name, button_id, start_values);
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
  range_slider_variables[button_id] = start_values.range_value; // Initial value of variable

  let slider_bounds = slider.getElementsByClassName("slider-bound");
  let parts = {range_slider, linked_span, slider_min:slider_bounds[0], slider_max:slider_bounds[1], variable_name, button_id};
  connect_range_slider(parts);
  connect_slider_bounds(parts);
  connect_value_field(parts);

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
  s += `class="formula" id="${id_bank}" style="`
  s += `font-size:115%;" title="${graph_name}">${mathfield_string}</math-field>`;
  if (preset_of_formula(equation_string)?.script_transfer_function !== undefined){
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

  if (!preset_of_formula(equation_string)?.shares_sliders){
    let input_element_id = id_bank;
    for(let i=0; i<bode_graphs.length; i++){
      let current_bode_graph = bode_graphs[i];
      if(parseInt(input_element_id) == current_bode_graph.bode_id){
        // Create sliders for all included variables directly:
        let event={};
        event.target={};
        let equation_id=input_element_id; // The DOM number of the equation
        const variables = formula_variables(equation_string) || [];
        for(let i=NOF_CONSTANT_VARIABLES; i<range_slider_alphabet.length; i++){
          let current_letter = range_slider_alphabet[i];
          if(variables.includes(current_letter)){
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
  const variables_to_delete = preset_of_formula(equation_to_remove)?.own_sliders || [];
  for(let i=0; i<variables_to_delete.length; i++){
    let variable_to_delete = variables_to_delete[i];
    let button = document.getElementById("RANGE_" + variable_position[variable_to_delete]);
    range_slider_variables[variable_position[variable_to_delete]] = 18012001; // "unset": checkSlider offers a "+" button again
    button.closest(".slider-wrapper").remove();
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

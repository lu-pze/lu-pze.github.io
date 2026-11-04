'use strict';

// ----------------------

function changeStrokeWeight(event){
  let slider_value = document.getElementById("stroke-range").value;
  line_stroke_weight = +slider_value;
  redraw();
}

let light_mode = "dark";

function changeColorMode (event){
  let checkbox_value = document.getElementById("color-mode-checkbox").checked;
  let graph_information_tabs = document.getElementsByClassName("graph-information-tabs")[0];
  let graph_information = document.getElementsByClassName("graph-information")[0];
  if(!checkbox_value){
    // Set to dark mode:
    light_mode = "dark";
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
    light_mode = "light";
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
  let screenCssPixelRatio = (window.outerWidth - 8) / window.innerWidth;
  add_event("dim_sw="+window.screen.width);
  add_event("dim_ww="+windowWidth);
  add_event("dim_wsaw="+window.screen.availWidth);
  add_event("dim_wiw="+window.innerWidth);
  add_event("dim_sh="+window.screen.height);
  add_event("dim_wh="+windowHeight);
  add_event("dim_wsah="+window.screen.availHeight);
  add_event("dim_wih="+window.innerHeight);
  add_event("dim_dpr="+window.devicePixelRatio);
  add_event("dim_scpr="+screenCssPixelRatio);
  add_event("dim_wvvs="+window.visualViewport.scale);
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
function draw_bode_phase_T (T,i,pole_zero="pole"){
  let frequency = 1/Math.abs(T);
  let screen_x = (Math.log(frequency)/Math.log(10)+2) * graph_bode_phase_width/5;
  if (!isFinite(screen_x)) return; // T = 0 or T = Infinity (w = 0): no corner frequency to mark
  let linked_y = bode_graphs[i].bode_phase_array[Math.round(screen_x)];
  let screen_y = map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(line_stroke_weight);
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
  if (!isFinite(screen_x)) return; // T = 0 or T = Infinity (w = 0): no corner frequency to mark
  // Now we know the x position. Let's find out the y position:
  let screen_y = map(bode_graphs[i].bode_gain_array[Math.round(screen_x)],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(line_stroke_weight);
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
          // Draw the PID zeros at 1/T_i and 1/T_d:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_phase_T(range_slider_variables[variable_position["T_i"]],i,"zero");
            draw_bode_phase_T(range_slider_variables[variable_position["T_d"]],i,"zero");
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
          // Draw the PID zeros at 1/T_i and 1/T_d:
          try{ // The graph may be deleted, so this might fail:
            draw_bode_mag_T(range_slider_variables[variable_position["T_i"]],i,"zero");
            draw_bode_mag_T(range_slider_variables[variable_position["T_d"]],i,"zero");
          } catch {}
        }
      }
    }
  }
}

function draw_X(screen_x,screen_y){
  let line_length = 6 + 2*Math.log(line_stroke_weight);
  line(screen_x-line_length,screen_y-line_length,screen_x+line_length,screen_y+line_length);
  line(screen_x+line_length,screen_y-line_length,screen_x-line_length,screen_y+line_length);
}

function draw_O(screen_x,screen_y){
  let radius = 15 + 3*Math.log(line_stroke_weight);
  ellipse(screen_x,screen_y,radius,radius);
}

function draw_static_gain(k,i){
  let screen_y = map(k,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
  stroke(bode_graphs[i].bode_hue,240,360);
  strokeWeight(0.4 * line_stroke_weight);
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
  strokeWeight(line_stroke_weight);
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

  // Draw the response
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_timeresponse_bool)){
      bode_graphs[i].draw_timeresponse();
    }
  }

  // Draw the time constants
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
        } catch {}
      } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
        // Draw T_5:
        try{ // The graph may be deleted, so this might fail:
          draw_time_response_T(range_slider_variables[variable_position["T_5"]],i);
        } catch {}
      }

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

function draw_pole_zeros (){
  // Count the pole-zero maps to draw:
  let nof_maps = 0;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool && bode_graphs[i].has_pole_zero_map()){
      nof_maps += 1;
    }
  }
  // The maps are square and stacked from y = 30, 10 pixels apart, with the axis labels (40 pixels)
  // below the last one. Shrink them when they would not all fit in the canvas:
  pole_zero_width = Math.min(graph_pole_zero_width, (canvas_height - 30 - 40) / nof_maps - 10);
  pole_zero_height = pole_zero_width;
  let last_graph = nof_maps;

  let draw_position = 0;
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if(bode_graphs[i].has_pole_zero_map()){
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

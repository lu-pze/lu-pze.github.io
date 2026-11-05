'use strict';

// Sets a slider variable, and shows it in the slider and its text field.
function set_slider(name, value){
  range_slider_variables[variable_position[name]] = value;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[name]).value = value.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[name]).value = value.toFixed(2);
}

function check_k_achievement(k_name){
  if (slider_value(k_name) >= 100){
    // We dragged a slider to a k-value above or equal 100:
    achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
  }
}

function check_T2_T3_achievement(){
  let T2_T3_factor = Math.abs(slider_value("T_2") / slider_value("T_3"));
  if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
    achievement_done("T2_T3_far_apart");
  }
}

function check_low_z_achievement(z){
  if (z <= 0.1){
    achievement_done("low_z");
  }
}

let direction_of_T_drag=0;
// T stays at `minimum` or above.
function drag_T_in_step_response (T_to_change,mouseDiffX,minimum=-Infinity){
  let T_x = slider_value(T_to_change);
  if (direction_of_T_drag==0){
    // Figure our if T is positive or negative, and adjust the dragging direction:
    if (T_x >= 0) direction_of_T_drag=1;
    else direction_of_T_drag=-1;
  }
  T_x = T_x + direction_of_T_drag * mouseDiffX * 10.0;
  if (T_x < minimum) T_x = minimum;
  set_slider(T_to_change, T_x);
}

function drag_T_in_Bode (T_to_change,mouseDiffX){
  set_slider(T_to_change, slider_value(T_to_change) * (1.0 - mouseDiffX*10.0));
}

function drag_k_in_step_response (k_to_change,mouseDiffY,y_range){
  set_slider(k_to_change, slider_value(k_to_change) - mouseDiffY * y_range);
}

function drag_k_in_Bode (k_to_change,mouseDiffY){
  set_slider(k_to_change, slider_value(k_to_change) * (1.0 - mouseDiffY*12.0));
}

function drag_z(mouseDiffY){
  let z = slider_value("z") + mouseDiffY * 1.7;
  if (z<0) z=0;
  if (z>1.2) z=1.2;
  set_slider("z", z);
  check_low_z_achievement(z);
}

function set_T_in_pz_map(T_to_change,real){
  // A pole/zero exactly on the imaginary axis would give T = -Infinity: nudge it into the left half-plane.
  if (real === 0) real = -0.0678;
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

// ---------------- What a drag does, per plot and preset. A preset that is not in a table does not react.

// Each gets (graph, mouseDiffX, mouseDiffY, y_range).
const STEP_RESPONSE_DRAGS = new Map([
  [GRAPH_ONE_REAL_POLE, (graph, mouseDiffX, mouseDiffY, y_range) => {
    drag_T_in_step_response("T_1",mouseDiffX);
    drag_k_in_step_response("k_1",mouseDiffY,y_range);
    check_k_achievement("k_1");
    redraw_canvas_gain_for_variables(["k_1","T_1"]); // Other graphs may use these too
  }],
  [GRAPH_TWO_REAL_POLES, (graph, mouseDiffX, mouseDiffY, y_range) => {
    drag_T_in_step_response(clicked_on_time_variable,mouseDiffX);
    check_T2_T3_achievement();
    drag_k_in_step_response("k_2",mouseDiffY,y_range);
    check_k_achievement("k_2");
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_TWO_COMPLEX_POLES, (graph, mouseDiffX, mouseDiffY) => {
    achievement_done("drag_time_response");
    let T = 1/slider_value("w") + mouseDiffX * 10.0;
    if (T < 0.001) T=0.001;
    set_slider("w", 1/T);
    drag_z(mouseDiffY);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_TIME_DELAY, (graph, mouseDiffX) => {
    achievement_done("change_L");
    let L = slider_value("L") + mouseDiffX * 10.0;
    if (L < 0) L=0;
    set_slider("L", L);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_ONE_ZERO_TWO_POLES, (graph, mouseDiffX, mouseDiffY, y_range) => {
    // The time constants of the poles stay positive, the zero's can be negative:
    const is_pole = (clicked_on_time_variable == "T_6") || (clicked_on_time_variable == "T_7");
    drag_T_in_step_response(clicked_on_time_variable,mouseDiffX, is_pole ? 0 : -Infinity);
    drag_k_in_step_response("k_4",mouseDiffY,y_range);
    check_k_achievement("k_4");
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_FOUR_POLES, (graph, mouseDiffX, mouseDiffY, y_range) => {
    drag_T_in_step_response("T_5",mouseDiffX);
    drag_k_in_step_response("k_5",mouseDiffY,y_range);
    check_k_achievement("k_5");
    redraw_canvas_gain(graph.bode_id);
  }],
]);

function drag_w_in_Bode(mouseDiffX){
  let T = (1/slider_value("w")) * (1.0 - mouseDiffX*10.0);
  if (T < 0.0001) T=0.0001;
  set_slider("w", 1/T);
}

// sideways(mouseDiffX) is for both Bode plots, up_down(mouseDiffY) only for the magnitude plot.
// redraw(graph, mouseDiffY), where mouseDiffY is undefined in the phase plot, is for presets whose
// variables other graphs may use too; the others only recalculate their own graph.
const BODE_DRAGS = new Map([
  [GRAPH_ONE_REAL_POLE, {
    sideways: (mouseDiffX) => drag_T_in_Bode("T_1",mouseDiffX),
    up_down: (mouseDiffY) => { drag_k_in_Bode("k_1",mouseDiffY); check_k_achievement("k_1"); },
    redraw: (graph, mouseDiffY) => redraw_canvas_gain_for_variables(mouseDiffY === undefined ? ["T_1"] : ["k_1","T_1"]),
  }],
  [GRAPH_TWO_REAL_POLES, {
    sideways: (mouseDiffX) => { drag_T_in_Bode(clicked_on_time_variable,mouseDiffX); check_T2_T3_achievement(); },
    up_down: (mouseDiffY) => { drag_k_in_Bode("k_2",mouseDiffY); check_k_achievement("k_2"); },
  }],
  [GRAPH_TWO_COMPLEX_POLES, {sideways: drag_w_in_Bode, up_down: drag_z}],
  [GRAPH_ONE_ZERO, {sideways: (mouseDiffX) => drag_T_in_Bode("T_4",mouseDiffX)}],
  [GRAPH_ONE_ZERO_TWO_POLES, {
    sideways: (mouseDiffX) => drag_T_in_Bode(clicked_on_time_variable,mouseDiffX),
    up_down: (mouseDiffY) => { drag_k_in_Bode("k_4",mouseDiffY); check_k_achievement("k_4"); },
  }],
  [GRAPH_FOUR_POLES, {
    sideways: (mouseDiffX) => drag_T_in_Bode("T_5",mouseDiffX),
    up_down: (mouseDiffY) => drag_k_in_Bode("k_5",mouseDiffY),
  }],
  [GRAPH_PID, {
    sideways: (mouseDiffX) => drag_T_in_Bode(clicked_on_time_variable,mouseDiffX),
    up_down: (mouseDiffY) => drag_k_in_Bode("K",mouseDiffY),
    redraw: () => redraw_canvas_gain_for_variables(["K","T_i","T_d"]),
  }],
]);

function drag_in_bode_plot(achievement, graph, mouseDiffX, mouseDiffY){
  const drag = BODE_DRAGS.get(preset_of_formula(graph.bode_formula));
  if (drag === undefined) return;
  achievement_done(achievement);
  drag.sideways(mouseDiffX);
  if ((mouseDiffY !== undefined) && (drag.up_down !== undefined)) drag.up_down(mouseDiffY);
  if (drag.redraw !== undefined) drag.redraw(graph, mouseDiffY);
  else redraw_canvas_gain(graph.bode_id);
}

// Moves a pole to `real`, held at `rightmost` or left of it.
function drag_pole_in_map(T_to_change, real, rightmost=Infinity){
  achievement_done("drag_pole");
  if (real > rightmost) real=rightmost;
  set_T_in_pz_map(T_to_change,real);
  if (real>0){
    achievement_done("drag_pole_to_right_half_plane");
  }
}

function drag_zero_in_map(T_to_change, real){
  achievement_done("drag_zero");
  set_T_in_pz_map(T_to_change,real);
  if (real>0){
    achievement_done("drag_zero_to_right_half_plane");
  }
}

function drag_complex_poles_in_map(graph, real, imaginary){
  achievement_done("drag_pole");
  achievement_done("drag_complex_pole");
  // Change complex poles:
  if (real > 0) real=0;
  if (imaginary < 0) imaginary=-imaginary;
  bode_3_real = real;
  bode_3_imaginary = imaginary;
  // Update variable w  = "cutoff frequency"
  // w = length of vector (re,im)
  set_slider("w", Math.sqrt(real*real + imaginary*imaginary));
  // Update variable z "zeta" = "damping factor 0.0-1.0"
  // z = the angle from origo to the upper complex pole.
  // z = 0 when complex pole is on the imaginary axis
  // z = 1.0 when complex pole is on the real axis
  // z = 0.880 when (-1,0.5)
  // z = 0.707 when (-1,1)
  // z = 0.446 when (-0.5,1)
  // ζ= - Re(pole) / Math.sqrt(Re(pole)^2 + Im(pole)^2)
  let z = -real / Math.sqrt(real*real + imaginary*imaginary);
  set_slider("z", z);
  check_low_z_achievement(z);
  redraw_canvas_gain(graph.bode_id);
}

// Each gets (graph, real, imaginary), the point in the map.
const POLE_ZERO_MAP_DRAGS = new Map([
  [GRAPH_ONE_REAL_POLE, (graph, real) => {
    drag_pole_in_map("T_1",real);
    redraw_canvas_gain_for_variables(["T_1"]); // Other graphs may use it too
  }],
  [GRAPH_TWO_REAL_POLES, (graph, real) => {
    drag_pole_in_map(clicked_on_time_variable,real);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_TWO_COMPLEX_POLES, drag_complex_poles_in_map],
  [GRAPH_ONE_ZERO, (graph, real) => {
    drag_zero_in_map("T_4",real);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_ONE_ZERO_TWO_POLES, (graph, real) => {
    if (clicked_on_time_variable=="T_8") drag_zero_in_map("T_8",real);
    else drag_pole_in_map(clicked_on_time_variable,real,0.06777777);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_FOUR_POLES, (graph, real) => {
    drag_pole_in_map("T_5",real,0.0677777);
    redraw_canvas_gain(graph.bode_id);
  }],
  [GRAPH_PID, (graph, real) => {
    drag_pole_in_map(clicked_on_time_variable,real);
    redraw_canvas_gain(graph.bode_id);
  }],
]);

function mouse_is_in_pole_zero_map(i){
  return ((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width) &&
    ((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height) &&
    bode_graphs[i]?.bode_displaybool === true;
}

// The graph of the shown pole-zero map under the mouse, or -1.
function pole_zero_map_under_mouse(){
  return bode_graphs.findIndex((graph, i) => mouse_is_in_pole_zero_map(i));
}

// Moves what is in the map the press started on, while the mouse is inside that map.
function drag_in_pole_zero_map(){
  const i = pole_zero_drag_graph_no;
  if (!mouse_is_in_pole_zero_map(i)) return;
  let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
  let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
  POLE_ZERO_MAP_DRAGS.get(preset_of_formula(bode_graphs[i].bode_formula))?.(bode_graphs[i],real,imaginary);
}

function mouseDragged (){
  if (mouseButton==RIGHT){
    if (questions_enabled){
      handle_questions();
    }
    return;
  }

  if (mouse_is_in_a_box(mouseX,mouseY) == true) return true; // Let system handle mouse after this, can be used for iPad scrolling:

  let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
  let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

  if (clicked_on_time_response_graph_no != -1){
    const graph = bode_graphs[clicked_on_time_response_graph_no];
    STEP_RESPONSE_DRAGS.get(preset_of_formula(graph.bode_formula))?.(graph,mouseDiffX,mouseDiffY,max_y_timerep - min_y_timerep);
  } else if (clicked_on_bode_mag_graph_no != -1){
    drag_in_bode_plot("drag_bode_mag",bode_graphs[clicked_on_bode_mag_graph_no],mouseDiffX,mouseDiffY);
  } else if (clicked_on_bode_phase_graph_no != -1){
    drag_in_bode_plot("drag_bode_phase",bode_graphs[clicked_on_bode_phase_graph_no],mouseDiffX);
  } else {
    // Check if we're dragging the Nyquist diagram:
    if((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && (mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset){
      if((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height){
        draw();
        draw_hover_nyquist();
      }
    }
    drag_in_pole_zero_map();
    return;
  }
  initial_mouseX = mouseX;
  initial_mouseY = mouseY;
}

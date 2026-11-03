'use strict';

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

function remove_splash_screen (){
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
  add_event("splash_screen_remove");
}


// --------------------------------
// Which time constant is closest to a press

// The time constants that a drag in a plot of this graph can move, in tie-breaking order
// (the first one wins), or null if the graph has no such choice.
// The step response never offered the PID controller's time constants, hence include_pid.
function draggable_time_variables(formula, include_pid){
  if (formula == GRAPH_TWO_REAL_POLES.formula) return ["T_2", "T_3"];
  if (formula == GRAPH_ONE_ZERO_TWO_POLES.formula) return ["T_8", "T_6", "T_7"]; // T_8 is the preferred one if overlapping
  if (include_pid && formula == GRAPH_PID.formula) return ["T_i", "T_d"];
  return null;
}

function time_variable_value(name){
  return range_slider_variables[variable_position[name]];
}

// position_of(name) and click_position are in the same unit (pixels, or real part in the pole-zero map).
function closest_time_variable(names, position_of, click_position){
  let distances = names.map((name) => Math.abs(position_of(name) - click_position));
  if (names.length == 2){
    return (distances[0] < distances[1]) ? names[0] : names[1];
  }
  if ((distances[0] <= distances[1]) && (distances[0] <= distances[2])) return names[0];
  if ((distances[1] <= distances[2]) && (distances[1] <= distances[0])) return names[1];
  return names[2];
}

// Where the pole of a time constant is in the pole-zero map (real part).
function pole_zero_time_position(name){
  let T = time_variable_value(name);
  // If T is outside of the box, clamp it to the side of the box:
  if ((1/T) > 3.2) T=1/3.2;
  return -1/T;
}

// Where the time constant is on the time axis of the step response (pixels).
function step_response_time_position(name){
  return graph_step_response_width / 10 * Math.abs(time_variable_value(name));
}

// Where the corner frequency of the time constant is on the frequency axis of the Bode plots (pixels).
function bode_time_position(name){
  let frequency = 1 / Math.abs(time_variable_value(name));
  return (Math.log(frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
}

// While dragging in the PID assignments, the plots are redrawn with lower precision to keep up.
function use_fast_precision_in_pid_assignments(){
  if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
    we_need_faster_calculations_right_now=true;
    precision=SPEED_PRECISION;
  }
}

// --------------------------------
// Pressing on a curve in the step response or a Bode plot

const GHOST_PREFIX = "Ghost";

// Splits the graphs shown in a plot into those within 70 pixels of the press ("queue_with_ghosts")
// and the same without ghost graphs ("queue"). Entries are [distance, graph_no].
function graphs_near_press(is_displayed, distance_to_curve){
  let queue_with_ghosts = [];
  let queue = [];
  for(let h=0; h<bode_graphs.length; h++){
    if((bode_graphs[h].bode_displaybool)&&(is_displayed(bode_graphs[h]))){
      let distance = distance_to_curve(bode_graphs[h]);
      if(distance < 70){
        queue_with_ghosts.push([distance,h]);
        if (!(bode_graphs[h].full_name.startsWith(GHOST_PREFIX))){
          queue.push([distance,h]);
        }
      }
    }
  }
  return {queue: queue, queue_with_ghosts: queue_with_ghosts};
}

// The entry with the smallest distance (the first one if equal), or undefined if the queue is empty.
function closest_in_queue(queue){
  let output;
  let distance = 10000;
  for(let h=0; h<queue.length; h++){
    if(queue[h][0] < distance){
      distance = queue[h][0];
      output = queue[h];
    }
  }
  return output;
}

// The common part of a press on the curves of the step response and the Bode magnitude and phase plots:
// find the graph that was pressed, which time constant it moves, and then either answer the quiz
// or start dragging. plot describes what differs between the plots:
//   is_displayed(graph), distance_to_curve(graph): which graphs are in the plot, and how far the press is from each,
//   set_clicked_graph(graph_no), click_x(), position_of(name), include_pid: what to drag,
//   event_name: for the event log, quiz_click(graph_no_with_ghosts): what to tell the quiz.
function press_on_curves(plot){
  let near = graphs_near_press(plot.is_displayed, plot.distance_to_curve);
  let closest = closest_in_queue(near.queue);
  if (closest !== undefined){
    plot.set_clicked_graph(closest[1]);
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;
    let names = draggable_time_variables(bode_graphs[closest[1]].bode_formula, plot.include_pid);
    if (names !== null){
      clicked_on_time_variable = closest_time_variable(names, plot.position_of, plot.click_x());
    }
  }
  add_event(plot.event_name + clicked_on_time_variable);
  use_fast_precision_in_pid_assignments();
  if (current_quiz!="none"){
    // The quiz also counts the ghost graphs:
    let closest_with_ghosts = closest_in_queue(near.queue_with_ghosts);
    plot.quiz_click((closest_with_ghosts === undefined) ? -1 : closest_with_ghosts[1]);
  } else {
    mouseDragged(); // Handle this directly
  }
}

// 0.0 equals frequency 10^min_10power (= -2); 1.0 equals frequency 10^(min_10power + x_case_gain)   -2+5=3
function bode_frequency_at(linked_x, plot_width){
  let perc_x = linked_x / plot_width;
  let exponent = perc_x*x_case_gain + min_10power;
  return Math.pow(10,exponent);
}

function bode_magnitude_at_mouse_y(){
  let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
  let perc_y = linked_y / graph_bode_mag_height;
  let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
  return 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
}

function bode_phase_at_mouse_y(){
  let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
  let perc_y = linked_y / graph_bode_phase_height;
  return phase_upper_bound - 45*phase_case_number*perc_y;
}

// --------------------------------
// The regions of the canvas that react to a press. mousePressed tries them in this order, so the
// earlier ones win where they overlap. Each hit_* tells if the mouse is in the region, and each
// press_* handles the press and returns what mousePressed should return.

function mouse_in_step_response_time_axis(){
  return ((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    (((mouseY-graph_step_response_y) >= graph_step_response_height + graph_step_response_y_offset) && ((mouseY-graph_step_response_y) <= graph_step_response_height + graph_step_response_y_offset + graph_step_response_timeaxis_height));
}

function mouse_in_step_response(){
  return ((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    ((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset);
}

function mouse_in_bode_mag_frequency_axis(){
  return ((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset) &&
    (((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height)));
}

function mouse_in_bode_mag_yaxis(){
  return ((mouseX-graph_bode_mag_x) > 0 && (mouseX-graph_bode_mag_x) <= graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset);
}

function mouse_in_bode_mag(){
  return ((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset);
}

function mouse_in_nyquist(){
  return ((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && ((mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset)) &&
    ((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height);
}

function mouse_in_bode_phase_frequency_axis(){
  return ((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) &&
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) >= graph_bode_phase_height) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < (graph_bode_phase_height + graph_bode_phase_axis_height));
}

function mouse_in_bode_phase_yaxis(){
  return ((mouseX-graph_bode_phase_x) > 0 && (mouseX-graph_bode_phase_x) <= graph_bode_mag_x_offset)&&
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height);
}

function mouse_in_bode_phase(){
  return ((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) &&
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height);
}

// The axes only react in the quiz; otherwise the press is left to the system.
function press_step_response_time_axis(event){
  if (current_quiz!="none"){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
    quiz_clicked_time_response_xaxis(time);
    return false; // Cancel default actions
  }
  return true;
}

function press_step_response(event){
  event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
  push();
  stroke(text_color);
  strokeWeight(2);
  line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
  pop();
  let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
  press_on_curves({
    is_displayed: (graph) => graph.bode_display_timeresponse_bool,
    distance_to_curve: (graph) => {
      let linked_y = graph.bode_timerep_array[linked_x];
      let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
      return Math.abs(mouseY - graph_step_response_y - screen_y);
    },
    set_clicked_graph: (graph_no) => { clicked_on_time_response_graph_no = graph_no; },  // 0 - 3
    include_pid: false,
    position_of: step_response_time_position,
    click_x: () => mouseX - graph_step_response_x - graph_step_response_x_offset,
    event_name: "click_step_response,clicked_on_time_variable=",
    quiz_click: (graph_no_with_ghosts) => {
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      let amplitude=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
      quiz_clicked_time_response(graph_no_with_ghosts,time,amplitude,clicked_on_time_variable);
    },
  });
  return false; // Cancel default actions
}

// Note: the frequency axis of the Bode magnitude plot is measured with the geometry of the phase plot.
function press_bode_mag_frequency_axis(event){
  if (current_quiz!="none"){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    quiz_clicked_bode_mag_xaxis(bode_frequency_at(linked_x, graph_bode_phase_width));
    return false; // Cancel default actions
  }
  return true;
}

function press_bode_mag_yaxis(event){
  if (current_quiz!="none"){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    quiz_clicked_bode_mag_yaxis(bode_magnitude_at_mouse_y());
    return false; // Cancel default actions
  }
  return true;
}

function press_bode_mag(event){
  event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
  let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
  let frequency = bode_frequency_at(linked_x, graph_bode_mag_width);
  press_on_curves({
    is_displayed: (graph) => graph.bode_display_bodemag_bool,
    distance_to_curve: (graph) => {
      let linked_y = graph.bode_gain_array[math.round(linked_x)];
      let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
      return Math.abs(mouseY - graph_step_response_y - screen_y);
    },
    set_clicked_graph: (graph_no) => { clicked_on_bode_mag_graph_no = graph_no; },
    include_pid: true,
    position_of: bode_time_position,
    click_x: () => mouseX - graph_bode_mag_x_offset - graph_bode_mag_x,
    event_name: "click_bode_magnitude,clicked_on_time_variable=",
    quiz_click: (graph_no_with_ghosts) => {
      quiz_clicked_bode_mag(graph_no_with_ghosts,frequency,bode_magnitude_at_mouse_y(),clicked_on_time_variable);
    },
  });
  return false; // Cancel default actions
}

// Dragging in the Nyquist diagram is handled by mouseDragged; in the quiz the angle is what counts.
function press_nyquist(event){
  event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
  add_event("click_nyquist");
  if (current_quiz!="none"){
    let origo_y = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
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
}

function press_bode_phase_frequency_axis(event){
  if (current_quiz!="none"){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    quiz_clicked_bode_phase_xaxis(bode_frequency_at(linked_x, graph_bode_phase_width));
    return false; // Cancel default actions
  }
  return true;
}

function press_bode_phase_yaxis(event){
  if (current_quiz!="none"){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    quiz_clicked_bode_phase_yaxis(bode_phase_at_mouse_y());
    return false; // Cancel default actions
  }
  return true;
}

function press_bode_phase(event){
  event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
  let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
  let frequency = bode_frequency_at(linked_x, graph_bode_phase_width);
  let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
  let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
  press_on_curves({
    is_displayed: (graph) => graph.bode_display_bodephase_bool,
    distance_to_curve: (graph) => {
      let linked_y = graph.bode_phase_array[math.round(linked_x)];
      let screen_y = graph_bode_phase_y_offset + map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
      return Math.abs(mouseY - graph_bode_phase_y - screen_y);
    },
    set_clicked_graph: (graph_no) => { clicked_on_bode_phase_graph_no = graph_no; },
    include_pid: true,
    position_of: bode_time_position,
    click_x: () => mouseX - graph_bode_phase_x_offset - graph_bode_phase_x,
    event_name: "click_bode_phase,clicked_on_time_variable=",
    quiz_click: (graph_no_with_ghosts) => {
      quiz_clicked_bode_phase(graph_no_with_ghosts,frequency,bode_phase_at_mouse_y(),clicked_on_time_variable);
    },
  });
  return false; // Cancel default actions
}

const CLICK_REGIONS = [
  {hit: mouse_in_step_response_time_axis, press: press_step_response_time_axis},
  {hit: mouse_in_step_response, press: press_step_response},
  {hit: mouse_in_bode_mag_frequency_axis, press: press_bode_mag_frequency_axis},
  {hit: mouse_in_bode_mag_yaxis, press: press_bode_mag_yaxis},
  {hit: mouse_in_bode_mag, press: press_bode_mag},
  {hit: mouse_in_nyquist, press: press_nyquist},
  {hit: mouse_in_bode_phase_frequency_axis, press: press_bode_phase_frequency_axis},
  {hit: mouse_in_bode_phase_yaxis, press: press_bode_phase_yaxis},
  {hit: mouse_in_bode_phase, press: press_bode_phase},
];

// --------------------------------
// The pole-zero maps

function graph_has_pole_zero_map(formula){
  return (formula == GRAPH_ONE_REAL_POLE.formula)||
    (formula == GRAPH_TWO_REAL_POLES.formula)||
    (formula == GRAPH_TWO_COMPLEX_POLES.formula)||
    (formula == GRAPH_ONE_ZERO_TWO_POLES.formula)||
    (formula == GRAPH_PID.formula);
}

// Handles a press in one of the pole-zero maps. Returns true if the press was in a map.
function press_in_pole_zero_maps(event){
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if (graph_has_pole_zero_map(bode_graphs[i].bode_formula)){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
            event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
            let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
            clicked_on_pole_zero_graph_no = i;
            let names = draggable_time_variables(bode_graphs[i].bode_formula, true);
            if (names !== null){
              clicked_on_time_variable = closest_time_variable(names, pole_zero_time_position, real);
            }
            use_fast_precision_in_pid_assignments();
            add_event("click_pole_zero_map="+i+",clicked_on_time_variable="+clicked_on_time_variable);
            if (current_quiz!="none"){
              quiz_clicked_pole_zero(clicked_on_pole_zero_graph_no,real,imaginary,clicked_on_time_variable);
            } else {
              mouseDragged(); // Handle this directly
            }
            return true;
          }
        }
      }
    }
  }
  return false;
}

// --------------------------------
// mousePressed

// Audio API stuff. Can only initialize and play sound at user action, and clicking is one such action:
function start_audio_on_press(){
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
}

// The first press only gets rid of the splash screen, and starts the four starting graphs.
function press_to_remove_splash_screen(event){
  event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
  remove_splash_screen();
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

// A press while the help questions are shown only closes them.
function press_to_close_questions(event){
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

// p5.js: Browsers may have different default behaviors attached to various mouse events. To prevent any default behavior for this event, add "return false" to the end of the function.
//function mouseClicked(){
function mousePressed (event){
  start_audio_on_press();

  let quizSplashElement = document.querySelector('.quiz_intro');
  if (quizSplashElement.classList.contains('active')){
    // The quiz splash screen is shown.
    // Make sure that clicks go though to the range slider.
    return true; // Propagate default actions
  }

/*
  let fbElement = document.querySelector('.feedback');
  if (fbElement.classList.contains('active')){
    // The feedback screen is shown.
    // Make sure that clicks go though to the range slider.
    return true; // Propagate default actions
  }
*/

  if (splash_screen_active){
    // This first click is to get rid of the splash screen:
    return press_to_remove_splash_screen(event);
  }

  if (mouseButton==RIGHT){
    return;
  }

  if (questions_enabled){
    return press_to_close_questions(event);
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

  if (press_in_pole_zero_maps(event)) return false; // Cancel default actions

  for (let region of CLICK_REGIONS){
    if (region.hit()) return region.press(event);
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
    task_done("w=8,z=0.05,k_3=1");
  } else if ((k_3>=0.6)&&(k_3<=0.8)&&(w>=1.88)&&(w<=2.15)&&(z>=0.66)&&(z<=0.75)){
    task_done("w=2,z=0.7,k3=0.7");
  }

  //"k4=0.75,T6=9.25,T7=0.5,T8=2":"Change the parameters so that the Bode plots follow the green lines.",//. (k4=0.75,T6=9.25,T7=0.5,T8=2)
  let k_4 = range_slider_variables[variable_position["k_4"]];
  let T_6 = range_slider_variables[variable_position["T_6"]];
  let T_7 = range_slider_variables[variable_position["T_7"]];
  let T_8 = range_slider_variables[variable_position["T_8"]];
  let max_T67 = Math.max(T_6,T_7);
  let min_T67 = Math.min(T_6,T_7);
  if ((k_4>=0.65)&&(k_4<=0.85)&&(min_T67>=0.33)&&(min_T67<=0.7)&&(max_T67>=8)&&(max_T67<=10)&&(T_8>=1.5)&&(T_8<=2.5)){
    task_done("k4=0.75,T6=9.25,T7=0.5,T8=2");
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
      task_done("T2=10,T3=0.5");
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
              task_done("k4=1,T6=2.5,T7=1,T8=6");
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
        task_done("T2,T3=1,k2=0.5");
      }
    }
    let w = range_slider_variables[variable_position["w"]];
    let z = range_slider_variables[variable_position["z"]];
    if ((w>=0.85)&&(w<=0.95)&&(z<=0.05)){
      task_done("w=0.9,z=0.0");
    }
    if ((w>=1.55)&&(w<=1.65)&&(z>=0.15)&&(z<=0.25)){
      task_done("w=1.6,z=0.2");
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

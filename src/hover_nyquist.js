'use strict';

// Reading the answer to one of these questions completes this task.
const HELP_QUESTION_TASKS = {
  "GRAPH_PID":"pid_help_PID",
  "GRAPH_ONE_POLE_WITH_PID_YR":"pid_help_YR",
  "GRAPH_ONE_POLE_WITH_PID_S":"pid_help_S",
  "GRAPH_ONE_POLE_WITH_PID_YL":"pid_help_YL",
  "GRAPH_ONE_POLE_WITH_PID_OPEN":"pid_help_OPEN",
};

function question_line_weight(distance){
  return 10 - distance/50;
}

// A question or task answer close to the mouse joins the list and gets a yellow line.
function add_near_question(near_questions, q_id, q_position){
  let distance = Math.sqrt((mouseY - q_position.y)*(mouseY - q_position.y) + (mouseX - q_position.x)*(mouseX - q_position.x));
  if(distance < 500){
    near_questions.push([distance,q_id,q_position]);
    let stroke_weight = question_line_weight(distance);
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

function center_on_page(element){
  let rect = element.getBoundingClientRect();
  let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
  let scroll_y = window.pageYOffset || document.documentElement.scrollTop;
  return {x:scroll_x + rect.left + rect.width/2, y:scroll_y + rect.top + rect.height/2};
}

function find_near_questions(){
  let near_questions = [];
  for (let q_id in all_questions){
    let q_position = all_questions[q_id].pos();
    if (q_position.visible){
      add_near_question(near_questions, q_id, q_position);
    }
  }
  // Also, check distances to the questions related to tasks:
  for (let task_id in all_tasks){
    if (all_tasks[task_id].a!=null){ // Yes, there is an answer connected to this task:
      let span = document.getElementById('task_'+task_id);
      if (span!=null){
        add_near_question(near_questions, "task_"+task_id, center_on_page(span));
      }
    }
  }
  return near_questions;
}

function closest_question(near_questions){
  let output;
  let distance = 10000;
  for(let h=0; h<near_questions.length; h++){
    if(near_questions[h][0] < distance){
      distance = near_questions[h][0];
      output = near_questions[h];
    }
  }
  return output;
}

function fill_hover_answer(hover_answer, q_id){
  add_event("ask_a_question="+q_id);
  hover_answer.style.transform=null;
  let s="";
  if (q_id.startsWith("task_")){ // This is an answer connected to a task:
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
  if (q_id in HELP_QUESTION_TASKS) task_done(HELP_QUESTION_TASKS[q_id]);
}

function place_hover_answer(hover_answer){
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
//    if (rect.height + (windowHeight-mouseY) > windowHeight){
    if (rect.height + (windowHeight-(mouseY-scroll_y)) > windowHeight){
      // Stick to top of screen to prevent it going too far up:
      hover_answer.style.top="0px";
      hover_answer.style.bottom=null;
    } else {
      // Move with mouseY pos:
      hover_answer.style.top=null;
//      hover_answer.style.bottom=(windowHeight-mouseY)+"px";
      hover_answer.style.bottom=(windowHeight-mouseY+scroll_y)+"px";
    }
  }
  hover_answer.style.visibility=null;
}

function show_hover_answer([distance, q_id, q_position]){
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
  if (q_id!=last_hover_answer_id){
    fill_hover_answer(hover_answer, q_id);
  }
  place_hover_answer(hover_answer);

  // Draw a white line to the closest questions:
  push();
  strokeWeight(question_line_weight(distance));
  //stroke("#ffff00c0");
  //line(q_position.x,q_position.y,rect.left,rect.top);
  //line(q_position.x,q_position.y,rect.right,rect.top);
  //line(q_position.x,q_position.y,rect.left,rect.bottom);
  //line(q_position.x,q_position.y,rect.right,rect.bottom);
  stroke("#ffffffff");
  line(mouseX,mouseY,q_position.x,q_position.y);
  pop();
}

function handle_questions(){
  redraw();
  let closest = closest_question(find_near_questions());
  if (closest){
    show_hover_answer(closest);
  } else {
    if (last_hover_answer_id!=""){
      let hover_answer = document.getElementById("hover_answer");
      hover_answer.style.visibility="hidden";
      hover_answer.innerHTML="";
      last_hover_answer_id="";
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

let last_hover_answer_id="";
let nof_redraws_in_math_bar=0;

// ---------------- What the hover overlays are made of

// Moves to the mouse and draws the background of a tooltip. Goes between push() and pop().
function draw_tooltip_box(width, height=90){
  translate(mouseX,mouseY);
  fill(box_background_color,200);
  stroke(150);
  rect(0,0,width,height);
  noStroke();
}

// 0.0 equals hovering over frequency 10^min_10power (= -2);
// 1.0 equals hovering over frequency 10^(min_10power + x_case_gain) (-2+5=3)
function frequency_at(perc_x){
  return Math.pow(10, perc_x*x_case_gain + min_10power);
}

function magnitude_of_dB(magnitude_in_dB){
  return 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
}

function line_across_bode_mag_at_mouse(){
  line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
}

function line_across_bode_phase_at_mouse(){
  line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
}

// The value of every shown curve at the mouse, in the Nyquist diagram.
function draw_nyquist_values_at(perc_x){
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
      if (bode_graphs[i].bode_display_nyquist_bool){
        bode_graphs[i].draw_nyquist_value(perc_x);
      }
    }
  }
}

// The curve closest to the mouse, within 70 pixels, as {graph_no, screen_y, value, name}, or undefined.
// is_shown(graph) tells if the graph is in this plot, value_of(graph) gives its value at the mouse,
// and screen_y_of(value) the height of that value in the plot, which starts at plot_y.
// With perc_x, the shown curves also get their value drawn in the Nyquist diagram.
function closest_curve(is_shown, value_of, screen_y_of, plot_y, perc_x){
  let closest;
  let closest_distance = 70;
  for(let i=0; i<bode_graphs.length; i++){
    if((bode_graphs[i].bode_displaybool)&&(is_shown(bode_graphs[i]))){
      if ((perc_x !== undefined) && bode_graphs[i].bode_display_nyquist_bool){
        bode_graphs[i].draw_nyquist_value(perc_x);
      }
      const value = value_of(bode_graphs[i]);
      const screen_y = screen_y_of(value);
      const distance = Math.abs(mouseY - plot_y - screen_y);
      if(distance < closest_distance){
        closest_distance = distance;
        closest = {graph_no: i, screen_y: screen_y, value: value, name: bode_graphs[i].graph_name};
      }
    }
  }
  return closest;
}

// Dots at this output value: at the right edge of the step response, at the left edge of the
// Bode magnitude plot, and on the real axis of the Nyquist diagram.
function draw_output_dots(output, right_edge_screen_y){
  fill(text_color);
  ellipse(graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,right_edge_screen_y,12,12);
  let magnitude = Math.abs(output);
  let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
  let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
  ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
  let screen_x0 = map(output,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  if ((screen_x0>=0)&&(screen_x0<=graph_nyquist_width)){
    ellipse(graph_nyquist_x+graph_nyquist_x_offset+screen_x0,graph_nyquist_y+graph_nyquist_y_offset+screen_y0,12,12);
  }
}

// The origin of the Nyquist diagram, and the size of the circle of radius 1 around it, on the canvas.
function nyquist_unit_circle(){
  let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  return {x: graph_nyquist_x + graph_nyquist_x_offset + screen_x0, y: graph_nyquist_y + graph_nyquist_y_offset + screen_y0,
    width: screen_xw - screen_x0, height: screen_yw - screen_y0};
}

function draw_magnitude_circle_in_nyquist(magnitude){
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
}

function draw_magnitude_line_in_bode_mag(screen_y){
  push();
  stroke(text_color);
  strokeWeight(2);
  line(graph_bode_mag_x+graph_bode_mag_x_offset,screen_y,graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width, screen_y);
  pop();
}

// An arc over the unit circle of the Nyquist diagram, for a phase in degrees.
function draw_phase_arc_in_nyquist(angle){
  const circle = nyquist_unit_circle();
  stroke(angle_color);
  strokeWeight(2);
  noFill();
  if (angle < 0){
    arc(circle.x,circle.y,circle.width,circle.height, 0, -angle/180*Math.PI);
  } else {
    arc(circle.x,circle.y,circle.width,circle.height, -angle/180*Math.PI, 0);
  }
}

// The same arc, and a line out from the origin at that angle.
function draw_phase_arc_and_radius_in_nyquist(angle){
  push();
  draw_phase_arc_in_nyquist(angle);
  const circle = nyquist_unit_circle();
  let screen_x2 = map(1.2*cos(angle/180*Math.PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
  let screen_y2 = map(1.2*sin(angle/180*Math.PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
  line(circle.x,circle.y,graph_nyquist_x + graph_nyquist_x_offset + screen_x2, graph_nyquist_y + graph_nyquist_y_offset + screen_y2);
  pop();
}

// A horizontal line in the Bode phase plot, if this phase in degrees is inside it.
function draw_phase_line_in_bode_phase(phase){
  if ((phase >= phase_lower_bound) && (phase <= phase_upper_bound)){
    let screen_y = map(phase,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
    push();
    stroke(angle_color);
    strokeWeight(2);
    line(graph_bode_phase_x + graph_bode_phase_x_offset,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset,graph_bode_phase_x + graph_bode_phase_x_offset + graph_bode_phase_width,graph_bode_phase_y + screen_y + graph_bode_phase_y_offset);
    pop();
  }
}

// ---------------- One function per region of the canvas

function hover_pole_zero_maps(){
  for(let i=0; i<bode_graphs.length; i++){
    if(mouse_is_in_pole_zero_map(i) && bode_graphs[i].has_pole_zero_map()){
      let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
      let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;
      noStroke();
      push();
      draw_tooltip_box(80,40);
      fill(text_color);
      textSize(15);
      text("Re=" + real.toFixed(2),13,15);
      text("Im=" + imaginary.toFixed(2),13,35);
      pop();
    }
  }
}

function hover_step_response_time_axis(){
  let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
  push();
  stroke("#808080");
  strokeWeight(2);
  line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
  pop();
  push();
  draw_tooltip_box(200);
  fill(text_color);
  textSize(15);
  text("time=" + time.toFixed(3) + "s",13,53);
  pop();
}

function hover_step_response(){
  const screen_x = mouseX - graph_step_response_x - graph_step_response_x_offset;
  const closest = closest_curve(
    (graph) => graph.bode_display_timeresponse_bool,
    (graph) => time_response_at(graph, screen_x),
    (value) => map(value,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset,
    graph_step_response_y);
  push();
  stroke("#808080");
  strokeWeight(2);
  line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
  pop();
  if (closest !== undefined){
    let linked_bode_graph = bode_graphs[closest.graph_no];
    let time = map(mouseX - graph_step_response_x - graph_step_response_x_offset,0,graph_step_response_width,0,max_x_timerep,true);
    let screen_y = map(closest.value,min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
    draw_output_dots(closest.value, graph_step_response_y+screen_y+graph_step_response_y_offset);
    noStroke();
    fill(linked_bode_graph.bode_hue,360,360);
    ellipse(mouseX,screen_y + graph_step_response_y_offset + graph_step_response_y,12,12);
    push();
    draw_tooltip_box(200);
    fill(linked_bode_graph.bode_hue,360,360);
    ellipse(18,18,20,20);
    noStroke();
    fill(text_color);
    textSize(18);
    text(closest.name,35,24);
    textSize(15);
    text("time=" + time.toFixed(3) + "s",13,53);
    text("output=" + closest.value.toFixed(3),13,77);
    pop();
  } else {
    let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
    let output=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
    push();
    draw_output_dots(output, mouseY);
    draw_tooltip_box(200);
    fill(text_color);
    textSize(15);
    text("time=" + time.toFixed(3) + "s",13,53);
    text("output=" + output.toFixed(3),13,77);
    pop();
  }
}

function hover_bode_mag_frequency_axis(){
  let perc_x = (mouseX - graph_bode_phase_x - graph_bode_phase_x_offset) / graph_bode_phase_width;
  draw_nyquist_values_at(perc_x);
  push();
  strokeWeight(2);
  stroke("#808080");
  line_across_bode_phase_at_mouse();
  line_across_bode_mag_at_mouse();
  noStroke();
  draw_tooltip_box(160);
  fill(text_color);
  textSize(15);
  text("freq=" + frequency_at(perc_x).toFixed(3) + "rad/s",13,33);
  pop();
}

function hover_bode_mag_yaxis(){
  let perc_y = (mouseY - graph_bode_mag_y - graph_bode_mag_y_offset) / graph_bode_mag_height;
  let magnitude = magnitude_of_dB(gain_upper_bound - perc_y*120);
  push();
  noStroke();
  draw_tooltip_box(160);
  fill(text_color);
  textSize(15);
  text("magnitude=" + magnitude.toFixed(3),13,53);
  pop();
  draw_magnitude_circle_in_nyquist(magnitude);
  draw_magnitude_line_in_bode_mag(mouseY);
}

function hover_bode_mag(){
  let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
  let perc_x = linked_x / graph_bode_mag_width;
  let perc_y = (mouseY - graph_bode_mag_y - graph_bode_mag_y_offset) / graph_bode_mag_height;
  let frequency = frequency_at(perc_x);
  const closest = closest_curve(
    (graph) => graph.bode_display_bodemag_bool,
    (graph) => graph.bode_gain_array[linked_x],
    (value) => graph_bode_mag_y_offset + map(value,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0),
    graph_bode_mag_y, perc_x);
  push();
  strokeWeight(2);
  stroke("#808080");
  line_across_bode_mag_at_mouse();
  line_across_bode_phase_at_mouse();
  pop();
  if (closest !== undefined){
    let magnitude = magnitude_of_dB(closest.value);
    noStroke();
    push();
    fill(bode_graphs[closest.graph_no].bode_hue,360,360);
    ellipse(mouseX,closest.screen_y + graph_bode_mag_y,12,12);
    noStroke();
    draw_tooltip_box(200);
    fill(text_color);
    textSize(18);
    text(closest.name,35,24);
    textSize(15);
    text("freq=" + frequency.toFixed(3) + "rad/s",13,53);
    text("magnitude=" + magnitude.toFixed(3),13,77);
    pop();
    draw_magnitude_circle_in_nyquist(magnitude);
    draw_magnitude_line_in_bode_mag(closest.screen_y + graph_bode_mag_y);
  } else {
    // perc_y = 1.0 -> magnitude = 0.001
    // perc_y = 0.0 -> magnitude = 1000
    let magnitude = magnitude_of_dB(gain_upper_bound - perc_y*120);
    push();
    noStroke();
    draw_tooltip_box(160);
    fill(text_color);
    textSize(15);
    text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
    text("magnitude=" + magnitude.toFixed(3),13,53);
    pop();
    draw_magnitude_circle_in_nyquist(magnitude);
    draw_magnitude_line_in_bode_mag(mouseY);
  }
}

function hover_bode_phase_frequency_axis(){
  let perc_x = (mouseX - graph_bode_phase_x - graph_bode_phase_x_offset) / graph_bode_phase_width;
  draw_nyquist_values_at(perc_x);
  // And draw a vertical white line in the bode phase plot.
  // And draw a vertical line in the bode mag plot:
  push();
  strokeWeight(2);
  stroke("#808080");
  line_across_bode_phase_at_mouse();
  line_across_bode_mag_at_mouse();
  noStroke();
  draw_tooltip_box(160);
  fill(text_color);
  textSize(15);
  text("freq=" + frequency_at(perc_x).toFixed(3) + "rad/s",13,33);
  pop();
}

function hover_bode_phase_yaxis(){
  let perc_y = (mouseY - graph_bode_phase_y - graph_bode_phase_y_offset) / graph_bode_phase_height;
  let phase = phase_upper_bound - 45*phase_case_number*perc_y;
  noStroke();
  push();
  draw_tooltip_box(160);
  fill(text_color);
  textSize(15);
  text("phase=" + phase.toFixed(0) + "°",13,53);
  pop();
  draw_phase_arc_and_radius_in_nyquist(phase);
  draw_phase_line_in_bode_phase(phase);
}

// The curve the mouse is close to, in the Nyquist diagram and in the Bode magnitude plot.
function draw_hovered_phase_curve(closest, linked_x, perc_x, frequency){
  const graph = bode_graphs[closest.graph_no];
  noStroke();
  push();
  fill(graph.bode_hue,360,360);
  ellipse(mouseX,closest.screen_y + graph_bode_phase_y,12,12);
  noStroke();
  draw_tooltip_box(200);
  fill(graph.bode_hue,360,360);
  ellipse(18,18,20,20);
  noStroke();
  fill(text_color);
  textSize(18);
  text(closest.name,35,24);
  textSize(15);
  text("freq=" + frequency.toFixed(3) + "rad/s",13,53);
  let phase = closest.value * 180/Math.PI;
  text("phase=" + phase.toFixed(1) + "°",13,77);
  pop();
  if (graph.bode_display_nyquist_bool){
    push();
    draw_phase_arc_in_nyquist(phase);
    pop();
  }
  draw_phase_line_in_bode_phase(phase);
  // And paint a white line from origo to the hovered color:
  let point = graph.get_nyquist_value(perc_x);
  if (graph.bode_display_nyquist_bool){
    push();
    stroke(text_color);
    strokeWeight(2);
    translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
    line(map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width),map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height),point[0],point[1]);
    pop();
  }
  // And draw a vertical white line in the bode phase plot.
  // And draw a vertical line ending up at the hovered graph:
  push();
  strokeWeight(2);
  stroke("#808080");
  line_across_bode_phase_at_mouse();
  stroke(text_color);
  let screen_y = graph_bode_mag_y_offset + map(graph.bode_gain_array[linked_x],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
  if (screen_y < graph_bode_mag_height + graph_bode_mag_y_offset){ // Only draw this line inside the Bode mag plot
    push();
    noStroke();
    fill(graph.bode_hue,360,360);
    ellipse(mouseX,screen_y + graph_bode_mag_y,12,12);
    pop();
    line(mouseX,graph_bode_mag_y+screen_y,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
  }
  pop();
}

function hover_bode_phase(){
  let linked_x = mouseX - graph_bode_phase_x - graph_bode_mag_x_offset;
  let perc_x = linked_x / graph_bode_phase_width;
  let perc_y = (mouseY - graph_bode_phase_y - graph_bode_phase_y_offset) / graph_bode_phase_height;
  let frequency = frequency_at(perc_x);
  let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
  let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
  const closest = closest_curve(
    (graph) => graph.bode_display_bodephase_bool,
    (graph) => graph.bode_phase_array[linked_x],
    (value) => graph_bode_phase_y_offset + map(value,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0),
    graph_bode_phase_y, perc_x);
  if (closest !== undefined){
    draw_hovered_phase_curve(closest, linked_x, perc_x, frequency);
  } else {
    push();
    strokeWeight(2);
    stroke("#808080");
    line_across_bode_mag_at_mouse();
    line_across_bode_phase_at_mouse();
    pop();
    noStroke();
    push();
    draw_tooltip_box(160);
    fill(text_color);
    textSize(15);
    // perc_y=0  -> phase = highest phase
    // perc_y=1.0  -> phase = lowest phase
    let phase = phase_upper_bound - 45*phase_case_number*perc_y;
    text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
    text("phase=" + phase.toFixed(0) + "°",13,53);
    pop();
    draw_phase_arc_and_radius_in_nyquist(phase);
    draw_phase_line_in_bode_phase(phase);
  }
}

// Every region that holds the mouse gets its overlay, in this order.
const HOVER_REGIONS = [
  {hit: mouse_in_step_response_time_axis, hover: hover_step_response_time_axis},
  {hit: mouse_in_step_response, hover: hover_step_response},
  {hit: mouse_in_bode_mag_frequency_axis, hover: hover_bode_mag_frequency_axis},
  {hit: mouse_in_bode_mag_yaxis, hover: hover_bode_mag_yaxis},
  {hit: mouse_in_bode_mag, hover: hover_bode_mag},
  {hit: mouse_in_nyquist, hover: () => draw_hover_nyquist()},
  {hit: mouse_in_bode_phase_frequency_axis, hover: hover_bode_phase_frequency_axis},
  {hit: mouse_in_bode_phase_yaxis, hover: hover_bode_phase_yaxis},
  {hit: mouse_in_bode_phase, hover: hover_bode_phase},
];

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

  hover_pole_zero_maps();
  for (const region of HOVER_REGIONS){
    if (region.hit()) region.hover();
  }
}


function draw_loglines(x_case){
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


// One decimal, but never "-0.0" (rounding noise such as -4.4e-16 would otherwise print as "-0.0").
function nyquist_axis_label(value){
  return (+value.toFixed(1)).toFixed(1);
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
    text(nyquist_axis_label(text_value),x*x_tile_length,graph_nyquist_height + 25);
  }
  for(let y=0; y<=y_case_number; y++){
    stroke(line_color);
    strokeWeight(1);
    line(0,y*y_tile_length,graph_nyquist_width,y*y_tile_length);
    let text_value = +max_nyquist_y - y*y_step;
    noStroke();
    fill(text_color);
    textSize(15);
    text(nyquist_axis_label(text_value),-30,y*y_tile_length+4);
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

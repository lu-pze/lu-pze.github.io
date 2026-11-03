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


// p5.js: Browsers may have different default behaviors attached to various mouse events. To prevent any default behavior for this event, add "return false" to the end of the function.
//function mouseClicked(){
function mousePressed (event){
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

  if (mouseButton==RIGHT){
    return;
  }

  if (questions_enabled){
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

  // Decide what we clicked on initially, to know what to move.
  // Reset what we've clicked on:
  clicked_on_time_response_graph_no = -1;
  clicked_on_bode_mag_graph_no = -1;
  clicked_on_bode_phase_graph_no = -1;
  clicked_on_time_variable = "";
  clicked_on_pole_zero_graph_no = -1;
  direction_of_T_drag=0; // Let first run of mouseDragged decide which direction to move T

  if (mouse_is_in_a_box(mouseX,mouseY) == true) return true; // Let system handle mouse after this, can be used for iPad scrolling:

  // Check if we've clicked any of the pole-zero graphs:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if ((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_PID.formula)){
        if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
          if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
            event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
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
            } else if (bode_graphs[i].bode_formula == GRAPH_PID.formula){
              // See if the user clicked on T_i or T_d:
              let T_i = range_slider_variables[variable_position["T_i"]];
              let T_d = range_slider_variables[variable_position["T_d"]];
              // If T is outside of the box, clamp it to the side of the box:
              if ((1/T_i) > 3.2) T_i=1/3.2;
              if ((1/T_d) > 3.2) T_d=1/3.2;
              if (Math.abs(-1/T_i - real) < Math.abs(-1/T_d - real)){
                clicked_on_time_variable = "T_i";
              } else {
                clicked_on_time_variable = "T_d";
              }
            }
            if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
              // Let's use fast precision:
              we_need_faster_calculations_right_now=true;
              precision=SPEED_PRECISION;
            }
            add_event("click_pole_zero_map="+i+",clicked_on_time_variable="+clicked_on_time_variable);
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
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      quiz_clicked_time_response_xaxis(time);
      return false; // Cancel default actions
    }

  // Check if we've clicked the step response graph:
  } else if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    ((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset)){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let queue_with_ghosts = [];
    let queue = [];
    let yes_close_enough = false;
    let yes_close_enough_with_ghosts = false;
    let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
    for(let h=0; h<bode_graphs.length; h++){
      if((bode_graphs[h].bode_displaybool)&&(bode_graphs[h].bode_display_timeresponse_bool)){
        let current_graph = bode_graphs[h];
        let linked_y = current_graph.bode_timerep_array[linked_x];
        let screen_y = map(linked_y,min_y_timerep,max_y_timerep,graph_step_response_height,0,true) + graph_step_response_y_offset;
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,h,linked_y]);
          if (!(bode_graphs[h].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,h,linked_y]);
          }
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
    add_event("click_step_response,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_time_response_graph_no_with_ghosts = -1;
      if(yes_close_enough_with_ghosts){
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_time_response_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
      let amplitude=max_y_timerep - (max_y_timerep - min_y_timerep) * (mouseY - graph_step_response_y - graph_step_response_y_offset) / graph_step_response_height;
      quiz_clicked_time_response(clicked_on_time_response_graph_no_with_ghosts,time,amplitude,clicked_on_time_variable);
      return false; // Cancel default actions
    } else {
      mouseDragged(); // Handle this directly
      return false; // Cancel default actions
    }


  // Check if we've clicked the frequency axis of the Bode magnitude plot:
  } else if(((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset) &&
           (((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height)))) {
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
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
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
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
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
    let linked_x = mouseX - graph_bode_mag_x - graph_bode_mag_x_offset;
    let perc_x = linked_x / graph_bode_mag_width;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    let queue_with_ghosts = [];
    let yes_close_enough_with_ghosts = false;
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_gain_array[math.round(linked_x)];
        let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        let distance = Math.abs(mouseY - graph_step_response_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,i,screen_y,linked_y]);
          if (!(bode_graphs[i].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y]);
          }
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
      } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_PID.formula){
        // If user clicked on PID, let's find out if closest to T_i or T_d:
        let T_i = range_slider_variables[variable_position["T_i"]];
        let T_i_frequency = 1 / Math.abs(T_i);
        let T_i_x = (Math.log(T_i_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_d = range_slider_variables[variable_position["T_d"]];
        let T_d_frequency = 1 / Math.abs(T_d);
        let T_d_x = (Math.log(T_d_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_mag_x_offset - graph_bode_mag_x;
        if (Math.abs(T_i_x - x) < Math.abs(T_d_x - x)){
          clicked_on_time_variable="T_i";
        } else {
          clicked_on_time_variable="T_d";
        }
      }
    }
    add_event("click_bode_magnitude,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_bode_mag_graph_no_with_ghosts = -1;
      if (yes_close_enough_with_ghosts){
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_bode_mag_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      quiz_clicked_bode_mag(clicked_on_bode_mag_graph_no_with_ghosts,frequency,magnitude,clicked_on_time_variable);
      return false; // Cancel default actions
    }
    mouseDragged(); // Handle this directly
    return false; // Cancel default actions


  // Check if we're dragging the Nyquist diagram:
  } else if(((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && ((mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset)) &&
            ((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height)) {
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


  // Check if we've clicked the frequency axis of the Bode phase plot:
  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) >= graph_bode_phase_height) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < (graph_bode_phase_height + graph_bode_phase_axis_height))) {
    if (current_quiz!="none"){
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
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
      event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
      let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_y = linked_y / graph_bode_phase_height;
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase_yaxis(phase);
      return false; // Cancel default actions
    }


  // Check if we've clicked the bode phase plot:
  } else if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height)){
    event.preventDefault(); // Make sure that iPads don't drag/scroll the contents
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
    let queue_with_ghosts = [];
    let yes_close_enough_with_ghosts = false;
    let queue = [];
    let yes_close_enough = false;
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
        let current_graph = bode_graphs[i];
        let linked_y = current_graph.bode_phase_array[math.round(linked_x)];
        let screen_y = graph_bode_phase_y_offset + map(linked_y,rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
        let distance = Math.abs(mouseY - graph_bode_phase_y - screen_y);
        if(distance < 70){
          yes_close_enough_with_ghosts = true;
          queue_with_ghosts.push([distance,i,screen_y,linked_y]);
          if (!(bode_graphs[i].full_name.startsWith("Ghost"))){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y]);
          }
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
      } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_PID.formula){
        // If user clicked on TWO_REAL_POLES, let's find out if closest to T_i or T_d:
        let T_i = range_slider_variables[variable_position["T_i"]];
        let T_i_frequency = 1 / Math.abs(T_i);
        let T_i_x = (Math.log(T_i_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let T_d = range_slider_variables[variable_position["T_d"]];
        let T_d_frequency = 1 / Math.abs(T_d);
        let T_d_x = (Math.log(T_d_frequency)/Math.log(10) + 2) * graph_bode_mag_width/5;
        let x = mouseX - graph_bode_phase_x_offset - graph_bode_phase_x;
        if (Math.abs(T_i_x - x) < Math.abs(T_d_x - x)){
          clicked_on_time_variable="T_i";
        } else {
          clicked_on_time_variable="T_d";
        }
      }
    }
    add_event("click_bode_phase,clicked_on_time_variable="+clicked_on_time_variable);
    if ((current_assignment=="pid_controller")||(current_assignment=="pid_controller_S")||(current_assignment=="pid_controller_YL")||(current_assignment=="pid_controller_OL")){
      // Let's use fast precision:
      we_need_faster_calculations_right_now=true;
      precision=SPEED_PRECISION;
    }
    if (current_quiz!="none"){
      let clicked_on_bode_phase_graph_no_with_ghosts = -1;
      if (yes_close_enough_with_ghosts){
        // Find the closest point from the graphs:
        let output_with_ghosts;
        let distance = 10000;
        for(let h=0; h<queue_with_ghosts.length; h++){
          if(queue_with_ghosts[h][0] < distance){
            distance = queue_with_ghosts[h][0];
            output_with_ghosts = queue_with_ghosts[h];
          }
        }
        clicked_on_bode_phase_graph_no_with_ghosts = output_with_ghosts[1];
      }
      let phase = phase_upper_bound - 45*phase_case_number*perc_y;
      quiz_clicked_bode_phase(clicked_on_bode_phase_graph_no_with_ghosts,frequency,phase,clicked_on_time_variable);
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

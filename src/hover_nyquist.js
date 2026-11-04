'use strict';

function handle_questions(){
  redraw();
  let queue = [];
  let yes_close_enough = false;

  for (let q_id in all_questions){
    let q_position = all_questions[q_id].pos();
    if (q_position.visible){
      let distance = Math.sqrt((mouseY - q_position.y)*(mouseY - q_position.y) + (mouseX - q_position.x)*(mouseX - q_position.x));
      if(distance < 500){
        yes_close_enough = true;
        queue.push([distance,q_id,q_position]);
        let stroke_weight = 10 - distance/50;
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
  }
  // Also, check distances to the questions related to tasks:
  for (let task_id in all_tasks){
    if (all_tasks[task_id].a!=null){ // Yes, there is an answer connected to this task:
      let span = document.getElementById('task_'+task_id);
      if (span!=null){
        let rect = span.getBoundingClientRect();
        let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
        let scroll_y = window.pageYOffset || document.documentElement.scrollTop;
        let x=scroll_x + rect.left + rect.width/2;
        let y=scroll_y + rect.top + rect.height/2;
        let distance = Math.sqrt((mouseY - y)*(mouseY - y) + (mouseX - x)*(mouseX - x));
        if(distance < 500){
          yes_close_enough = true;
          queue.push([distance,"task_"+task_id,{x:x,y:y}]);
          let stroke_weight = 10 - distance/50;
          if (stroke_weight>0.01){
            // Draw a yellow line to the closest questions:
            push();
            strokeWeight(stroke_weight);
            stroke("#ffff0080");
            line(mouseX,mouseY,x,y);
            pop();
          }
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
  if(yes_close_enough){
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
    let q_id=output[1];
    if (q_id!=last_hover_answer_id){
      add_event("ask_a_question="+q_id);
      hover_answer.style.transform=null;
      let s="";
      if (q_id.startsWith("task_")){ // This is an answer connected to a task:
        console.log(q_id.substr(5));
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
      if (q_id == "GRAPH_PID") task_done("pid_help_PID");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_YR") task_done("pid_help_YR");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_S") task_done("pid_help_S");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_YL") task_done("pid_help_YL");
      if (q_id == "GRAPH_ONE_POLE_WITH_PID_OPEN") task_done("pid_help_OPEN");
    }
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
//      if (rect.height + (windowHeight-mouseY) > windowHeight){
      if (rect.height + (windowHeight-(mouseY-scroll_y)) > windowHeight){
        // Stick to top of screen to prevent it going too far up:
        hover_answer.style.top="0px";
        hover_answer.style.bottom=null;
      } else {
        // Move with mouseY pos:
        hover_answer.style.top=null;
//        hover_answer.style.bottom=(windowHeight-mouseY)+"px";
        hover_answer.style.bottom=(windowHeight-mouseY+scroll_y)+"px";
      }
    }
    hover_answer.style.visibility=null;

    rect=hover_answer.getBoundingClientRect();
    // Draw a white line to the closest questions:
    let q_position=output[2];
    push();
    let stroke_weight = 10 - distance/50;
    strokeWeight(stroke_weight);
    //stroke("#ffff00c0");
    //line(q_position.x,q_position.y,rect.left,rect.top);
    //line(q_position.x,q_position.y,rect.right,rect.top);
    //line(q_position.x,q_position.y,rect.left,rect.bottom);
    //line(q_position.x,q_position.y,rect.right,rect.bottom);
    stroke("#ffffffff");
    line(mouseX,mouseY,q_position.x,q_position.y);
    pop();

  } else {
    if (last_hover_answer_id!=""){
      let hover_answer = document.getElementById("hover_answer");
      hover_answer.style.visibility="hidden";
      hover_answer.innerHTML="";
      last_hover_answer_id="";
    }
  }
  return;
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


  // Check if we're hovering any of the pole-zero graphs:
  for(let i=0; i<bode_graphs.length; i++){
    if(bode_graphs[i].bode_displaybool){
      if ((bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula)||
          (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula)||
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

  // Check if we're hovering the time axis of the step response graph:
  if(((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset)&&
    (((mouseY-graph_step_response_y) >= graph_step_response_height + graph_step_response_y_offset) && ((mouseY-graph_step_response_y) <= graph_step_response_height + graph_step_response_y_offset + graph_step_response_timeaxis_height))){
    let time=(mouseX - graph_step_response_x - graph_step_response_x_offset) / graph_step_response_width * 10.0;
    push();
    stroke("#808080");
    strokeWeight(2);
    line(mouseX,graph_step_response_y+graph_step_response_y_offset,mouseX,graph_step_response_y + graph_step_response_y_offset + graph_step_response_height);
    pop();
    push();
    translate(mouseX,mouseY);
    fill(box_background_color,200);
    stroke(150);
    rect(0,0,200,90);
    noStroke();
    fill(text_color);
    textSize(15);
    text("time=" + time.toFixed(3) + "s",13,53);
    pop();
  }

  // Check if we're hovering the step response graph:
  let queue = [];
  let yes_close_enough = false;
  if((mouseX-graph_step_response_x) > graph_step_response_x_offset && (mouseX-graph_step_response_x) < graph_step_response_width + graph_step_response_x_offset){
    if((mouseY-graph_step_response_y) > graph_step_response_y_offset && (mouseY-graph_step_response_y) < graph_step_response_height + graph_step_response_y_offset){
      let linked_x = Math.ceil((mouseX - graph_step_response_x - graph_step_response_x_offset)/precision);
      for(let h=0; h<bode_graphs.length; h++){
        if((bode_graphs[h].bode_displaybool)&&(bode_graphs[h].bode_display_timeresponse_bool)){
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
      stroke("#808080");
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
        let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
        let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
        // Draw a corresponding white dot at the real axis of the Nyquist diagram
        let screen_x0 = map(output[2],min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if ((screen_x0>=0)&&(screen_x0<=graph_nyquist_width)){
          ellipse(graph_nyquist_x+graph_nyquist_x_offset+screen_x0,graph_nyquist_y+graph_nyquist_y_offset+screen_y0,12,12);
        }
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
        push();
        // Draw a white dot at the right edge of the time response graph
        fill(text_color);
        ellipse(graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,mouseY,12,12);
        // Draw a corresponding white dot at the left edge of the bode magnitude graph
        let magnitude = Math.abs(output);
        let magnitude_in_dB = 20*Math.log(magnitude)/Math.log(10);
        let screen_y5 = map(magnitude_in_dB,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        ellipse(graph_bode_mag_x+graph_bode_mag_x_offset,graph_bode_mag_y + screen_y5 + graph_bode_mag_y_offset,12,12);
        // Draw a corresponding white dot at the real axis of the Nyquist diagram
        let screen_x0 = map(output,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if ((screen_x0>=0)&&(screen_x0<=graph_nyquist_width)){
          ellipse(graph_nyquist_x+graph_nyquist_x_offset+screen_x0,graph_nyquist_y+graph_nyquist_y_offset+screen_y0,12,12);
        }
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


  // Check if we're hovering the frequency axis of the Bode magnitude plot:
  if((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset){
    if(((mouseY-graph_bode_mag_y) >= graph_bode_mag_height + graph_bode_mag_y_offset) && (mouseY-graph_bode_mag_y < (graph_bode_mag_height + graph_bode_mag_y_offset + graph_bode_phase_axis_height))) {
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
        }
      }
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      push();
      strokeWeight(2);
      stroke("#808080");
      line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
      line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
      noStroke();
      translate(mouseX,mouseY);
      fill(box_background_color,200);
      stroke(150);
      rect(0,0,160,90);
      noStroke();
      fill(text_color);
      textSize(15);
      text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
      pop();
    }
  }

  // Check if we're hovering the bode magnitude yaxis, the magnitude:
  if((mouseX-graph_bode_mag_x) > 0 && (mouseX-graph_bode_mag_x) <= graph_bode_mag_x_offset){
    if((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset){
      let linked_y = mouseY - graph_bode_mag_y - graph_bode_mag_y_offset;
      let perc_y = linked_y / graph_bode_mag_height;
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      push();
      noStroke();
      translate(mouseX,mouseY);
      fill(box_background_color,200);
      stroke(150);
      rect(0,0,160,90);
      noStroke();
      fill(text_color);
      textSize(15);
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

  // Check if we're hovering the bode magnitude plot:
  if((mouseX-graph_bode_mag_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_mag_x) < graph_bode_mag_width + graph_bode_mag_x_offset){
    if((mouseY-graph_bode_mag_y) > graph_bode_mag_y_offset && (mouseY-graph_bode_mag_y) < graph_bode_mag_height + graph_bode_mag_y_offset){
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
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
          let current_graph = bode_graphs[i];
          let linked_y = current_graph.bode_gain_array[linked_x];
          let screen_y = graph_bode_mag_y_offset + map(linked_y,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
          let distance = Math.abs(mouseY - graph_bode_mag_y - screen_y);
          if(distance < 70){
            yes_close_enough = true;
            queue.push([distance,i,screen_y,linked_y,current_graph.graph_name]);
          }
        }
      }
      let magnitude_in_dB = gain_upper_bound - perc_y*120;//y_case_gain; //60 - perc_y
      let magnitude = 1.0 * Math.pow(10.0, magnitude_in_dB / 20.0);
      // perc_y = 1.0 -> magnitude = 0.001
      // perc_y = 0.0 -> magnitude = 1000
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
      strokeWeight(2);
      stroke("#808080");
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


  // Check if we're hovering the frequency axis of the Bode phase plot:
  if(((mouseX-graph_bode_phase_x) > graph_bode_phase_x_offset) && ((mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_phase_x_offset) && 
    ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) >= graph_bode_phase_height) && ((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < (graph_bode_phase_height + graph_bode_phase_axis_height))) {
    let linked_x = mouseX - graph_bode_phase_x - graph_bode_phase_x_offset;
    let perc_x = linked_x / graph_bode_phase_width;
    // 0.0   equals hovering over frequency 10^min_10power (= -2);
    // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
    let exponent = perc_x*x_case_gain + min_10power;
    let frequency = Math.pow(10,exponent);
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodemag_bool)){
        if (bode_graphs[i].bode_display_nyquist_bool){
          bode_graphs[i].draw_nyquist_value(perc_x);
        }
      }
    }
    // And draw a vertical white line in the bode phase plot.
    // And draw a vertical line in the bode mag plot:
    push();
    strokeWeight(2);
    stroke("#808080");
    line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
    line(mouseX,graph_bode_mag_y+graph_bode_mag_y_offset,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
    noStroke();
    translate(mouseX,mouseY);
    fill(box_background_color,200);
    stroke(150);
    rect(0,0,160,90);
    noStroke();
    fill(text_color);
    textSize(15);
    text("freq=" + frequency.toFixed(3) + "rad/s",13,33);
    pop();
  }


  // Check if we're hovering the bode phase plot yaxis, the phase:
  if((mouseX-graph_bode_phase_x) > 0 && (mouseX-graph_bode_phase_x) <= graph_bode_mag_x_offset){
    if((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height){
      let linked_y2 = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_y = linked_y2 / graph_bode_phase_height;
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
      let screen_x2 = map(1.2*cos(angle/180*Math.PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y2 = map(1.2*sin(angle/180*Math.PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if (angle < 0){
        arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
      } else {
        arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
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


  // Check if we're hovering the bode phase plot:
  if((mouseX-graph_bode_phase_x) > graph_bode_mag_x_offset && (mouseX-graph_bode_phase_x) < graph_bode_phase_width + graph_bode_mag_x_offset){
    if((mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) > 0 && (mouseY-graph_bode_phase_y-graph_bode_phase_y_offset) < graph_bode_phase_height){
      let linked_x = mouseX - graph_bode_phase_x - graph_bode_mag_x_offset;
      let linked_y = mouseY - graph_bode_phase_y - graph_bode_phase_y_offset;
      let perc_x = linked_x / graph_bode_phase_width;
      let perc_y = linked_y / graph_bode_phase_height;
      // 0.0   equals hovering over frequency 10^min_10power (= -2);
      // 1.0   equals hovering over frequency 10^(min_10power + x_case_gain)   -2+5=3
      let exponent = perc_x*x_case_gain + min_10power;
      let frequency = Math.pow(10,exponent);
      let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
      let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
      let queue = [];
      let yes_close_enough = false;
      for(let i=0; i<bode_graphs.length; i++){
        if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_display_bodephase_bool)){
          if (bode_graphs[i].bode_display_nyquist_bool){
            bode_graphs[i].draw_nyquist_value(perc_x);
          }
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
      // perc_y=0  -> phase = highest phase
      // perc_y=1.0  -> phase = lowest phase
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
        let phase = output[3] * 180/Math.PI;
        text("phase=" + phase.toFixed(1) + "°",13,77);
        pop();
        let angle = phase;
        let screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        let screen_xw = map(2,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_yw = map(-2,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (bode_graphs[output[1]].bode_display_nyquist_bool){
          // Paint an arc in the nyquist diagram over the unit circle:
          push();
          stroke(angle_color);
          strokeWeight(2);
          noFill();
          if (angle < 0){
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
          } else {
            arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
          }
          pop();
        }
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
        let point = bode_graphs[hovered_graph_no].get_nyquist_value(perc_x);
        let screen_x1 = point[0];
        let screen_y1 = point[1];
        screen_x0 = map(0,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        screen_y0 = map(0,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (bode_graphs[output[1]].bode_display_nyquist_bool){
          push();
          stroke(text_color);
          strokeWeight(2);
          translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
          line(screen_x0,screen_y0,screen_x1,screen_y1);
          pop();
        }
        // And draw a vertical white line in the bode phase plot.
        // And draw a vertical line ending up at the hovered graph:
        push();
        strokeWeight(2);
        stroke("#808080");
        line(mouseX,graph_bode_phase_y+graph_bode_phase_y_offset,mouseX,graph_bode_phase_y + graph_bode_phase_y_offset + graph_bode_phase_height);
        stroke(text_color);
        let current_graph = bode_graphs[hovered_graph_no];
        let linked_y8 = current_graph.bode_gain_array[linked_x];
        let screen_y = graph_bode_mag_y_offset + map(linked_y8,gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
        if (screen_y < graph_bode_mag_height + graph_bode_mag_y_offset){ // Only draw this line inside the Bode mag plot
          push();
          noStroke();
          fill(bode_graphs[output[1]].bode_hue,360,360);
          ellipse(mouseX,screen_y + graph_bode_mag_y,12,12);
          pop();
          line(mouseX,graph_bode_mag_y+screen_y,mouseX,graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height);
        }
        pop();
      } else {
        push();
        strokeWeight(2);
        stroke("#808080");
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
        let screen_x2 = map(1.2*cos(angle/180*Math.PI),min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
        let screen_y2 = map(1.2*sin(angle/180*Math.PI),max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
        if (angle < 0){
          arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, 0, -angle/180*Math.PI);
        } else {
          arc(graph_nyquist_x + graph_nyquist_x_offset + screen_x0, graph_nyquist_y + graph_nyquist_y_offset + screen_y0,screen_xw - screen_x0,screen_yw - screen_y0, -angle/180*Math.PI, 0);
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

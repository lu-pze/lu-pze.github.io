'use strict';

let direction_of_T_drag=0;
function drag_T_in_step_response (T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  if (direction_of_T_drag==0){
    // Figure our if T is positive or negative, and adjust the dragging direction:
    if (T_x >= 0) direction_of_T_drag=1;
    else direction_of_T_drag=-1;
  }
  T_x = T_x + direction_of_T_drag * mouseDiffX * 10.0;
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_T_in_Bode (T_to_change,mouseDiffX){
  let T_x = range_slider_variables[variable_position[T_to_change]];
  T_x = T_x * (1.0 - mouseDiffX*10.0);
  range_slider_variables[variable_position[T_to_change]] = T_x;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[T_to_change]).value = T_x.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[T_to_change]).value = T_x.toFixed(2);
}

function drag_k_in_step_response (k_to_change,mouseDiffY,y_range){
  let k = range_slider_variables[variable_position[k_to_change]];
  k = k - mouseDiffY * y_range;
  range_slider_variables[variable_position[k_to_change]] = k;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[k_to_change]).value = k.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[k_to_change]).value = k.toFixed(2);
}

function drag_k_in_Bode (k_to_change,mouseDiffY){
  let k = range_slider_variables[variable_position[k_to_change]];
  k = k * (1.0 - mouseDiffY*12.0);
  range_slider_variables[variable_position[k_to_change]] = k;
  // Update range slider value:
  document.getElementById("variable_"+variable_position[k_to_change]).value = k.toFixed(2);
  // Update range slider:
  document.getElementById("RANGE_"+variable_position[k_to_change]).value = k.toFixed(2);
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

function mouseDragged (){
  if (mouseButton==RIGHT){
    if (questions_enabled){
      handle_questions();
    }
    return;
  }

  if (mouse_is_in_a_box(mouseX,mouseY) == true) return true; // Let system handle mouse after this, can be used for iPad scrolling:

  // Dragging one of the graphs in the step response:
  if (clicked_on_time_response_graph_no != -1){
    let i=clicked_on_time_response_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;
    let y_range = max_y_timerep - min_y_timerep;
    if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      drag_T_in_step_response("T_1",mouseDiffX);
      drag_k_in_step_response("k_1",mouseDiffY,y_range);
      let k_1 = range_slider_variables[variable_position["k_1"]];
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["k_1","T_1"]);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      drag_T_in_step_response(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      drag_k_in_step_response("k_2",mouseDiffY,y_range);
      let k_2 = range_slider_variables[variable_position["k_2"]];
      if (k_2>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_time_response");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T + mouseDiffX * 10.0;
      if (T < 0.001) T=0.001;
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
      if (z <= 0.1){
        achievement_done("low_z");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_TIME_DELAY.formula){
      achievement_done("change_L");
      let L = range_slider_variables[variable_position["L"]];
      L = L + mouseDiffX * 10.0;
      if (L < 0) L=0;
      range_slider_variables[variable_position["L"]] = L;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["L"]).value = L.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["L"]).value = L.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      let variable_to_change = clicked_on_time_variable;
      let T_x = range_slider_variables[variable_position[variable_to_change]];
      if (direction_of_T_drag==0){
        // Figure our if T is positive or negative, and adjust the dragging direction:
        if (T_x >= 0) direction_of_T_drag=1;
        else direction_of_T_drag=-1;
      }
      T_x = T_x + direction_of_T_drag * mouseDiffX * 10.0;
      if ((variable_to_change == "T_6")||(variable_to_change == "T_7")){
        if (T_x<0) T_x = 0;
      }
      range_slider_variables[variable_position[variable_to_change]] = T_x;
      // Update range slider value:
      document.getElementById("variable_"+variable_position[variable_to_change]).value = T_x.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position[variable_to_change]).value = T_x.toFixed(2);

      drag_k_in_step_response("k_4",mouseDiffY,y_range);
      let k_4 = range_slider_variables[variable_position["k_4"]];
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    } else if (bode_graphs[clicked_on_time_response_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      drag_T_in_step_response("T_5",mouseDiffX);
      drag_k_in_step_response("k_5",mouseDiffY,y_range);
      let k_5 = range_slider_variables[variable_position["k_5"]];
      if (k_5>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);
    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  // Dragging one of the graphs in the bode magnitude plot:
  } else if (clicked_on_bode_mag_graph_no != -1){
    let i=clicked_on_bode_mag_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;
    let mouseDiffY = (mouseY - initial_mouseY) / graph_step_response_height;

    if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_1",mouseDiffX);
      drag_k_in_Bode("k_1",mouseDiffY);
      let k_1 = range_slider_variables[variable_position["k_1"]];
      if (k_1>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["k_1","T_1"]);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      drag_k_in_Bode("k_2",mouseDiffY);
      let k_2 = range_slider_variables[variable_position["k_2"]];
      if (k_2>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_bode_mag");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T * (1.0 - mouseDiffX*10.0);
      if (T < 0.0001) T=0.0001;
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
      if (z <= 0.1){
        achievement_done("low_z");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_4",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      drag_k_in_Bode("k_4",mouseDiffY);
      let k_4 = range_slider_variables[variable_position["k_4"]];
      if (k_4>=100){
        // We dragged a slider to a k-value above or equal 100:
        achievement_done("k_above_or_equal_100"); //"Make a transfer function with magnitude larger than 100"
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode("T_5",mouseDiffX);
      drag_k_in_Bode("k_5",mouseDiffY);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_mag_graph_no].bode_formula == GRAPH_PID.formula){
      achievement_done("drag_bode_mag");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      drag_k_in_Bode("K",mouseDiffY);
      //redraw_canvas_gain(bode_graphs[i].bode_id);
      redraw_canvas_gain_for_variables(["K","T_i","T_d"]);

    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  // Dragging one of the graphs in the bode phase plot:
  } else if (clicked_on_bode_phase_graph_no != -1){
    let i=clicked_on_bode_phase_graph_no;
    let mouseDiffX = (mouseX - initial_mouseX) / graph_step_response_width;

    if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_REAL_POLE.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_1",mouseDiffX);
      //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
      redraw_canvas_gain_for_variables(["T_1"]);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_REAL_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      let T2_T3_factor = Math.abs(range_slider_variables[variable_position["T_2"]] / range_slider_variables[variable_position["T_3"]]);
      if ((T2_T3_factor <= 0.01) || (T2_T3_factor >= 100)){
        achievement_done("T2_T3_far_apart");
      }
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
      achievement_done("drag_bode_phase");
      let w = range_slider_variables[variable_position["w"]];
      let T=1/w;
      T = T * (1.0 - mouseDiffX*10.0);
      if (T < 0.0001) T=0.0001;
      w = 1/T;
      range_slider_variables[variable_position["w"]] = w;
      // Update range slider value:
      document.getElementById("variable_"+variable_position["w"]).value = w.toFixed(2);
      // Update range slider:
      document.getElementById("RANGE_"+variable_position["w"]).value = w.toFixed(2);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_4",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_FOUR_POLES.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode("T_5",mouseDiffX);
      redraw_canvas_gain(bode_graphs[i].bode_id);

    } else if (bode_graphs[clicked_on_bode_phase_graph_no].bode_formula == GRAPH_PID.formula){
      achievement_done("drag_bode_phase");
      drag_T_in_Bode(clicked_on_time_variable,mouseDiffX);
      //redraw_canvas_gain(bode_graphs[i].bode_id);
      redraw_canvas_gain_for_variables(["K","T_i","T_d"]);

    }
    initial_mouseX = mouseX;
    initial_mouseY = mouseY;


  } else {
    // Check if we're dragging the Nyquist diagram:
    if((mouseX-graph_nyquist_x) > graph_nyquist_x_offset && (mouseX-graph_nyquist_x) < graph_nyquist_width + graph_nyquist_x_offset){
      if((mouseY-graph_nyquist_y-graph_nyquist_y_offset) > 0 && (mouseY-graph_nyquist_y-graph_nyquist_y_offset) < graph_nyquist_height){
        draw();
        draw_hover_nyquist();
      }
    }


    // Check if we've dragged in any of the pole-zero graphs:
    for(let i=0; i<bode_graphs.length; i++){
      if(((mouseX-pole_zero_graph_x[i]) > 0) && ((mouseX-pole_zero_graph_x[i]) < pole_zero_width)){
        if(((mouseY-pole_zero_graph_y[i]) > 0) && ((mouseY-pole_zero_graph_y[i]) < pole_zero_height)){
          if(bode_graphs[i].bode_displaybool){
            let real=(mouseX-pole_zero_graph_x[i])/pole_zero_width * 4 - 3;
            let imaginary=2 - (mouseY-pole_zero_graph_y[i])/pole_zero_height * 4;

            if (bode_graphs[i].bode_formula == GRAPH_ONE_REAL_POLE.formula){
              achievement_done("drag_pole");
              set_T_in_pz_map("T_1",real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              //redraw_canvas_gain(bode_graphs[i].bode_id); //faster, but we might affect other graphs here:
              redraw_canvas_gain_for_variables(["T_1"]);

            } else if (bode_graphs[i].bode_formula == GRAPH_TWO_REAL_POLES.formula){
              achievement_done("drag_pole");
              // Change T_2 or T_3
              set_T_in_pz_map(clicked_on_time_variable,real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_TWO_COMPLEX_POLES.formula){
              achievement_done("drag_pole");
              achievement_done("drag_complex_pole");
              // Change complex poles:
              if (real > 0) real=0;
              if (imaginary < 0) imaginary=-imaginary;
              bode_3_real = real;
              bode_3_imaginary = imaginary;
              // Update variable w  = "cutoff frequency"
              // w = length of vector (re,im)
              let w = Math.sqrt(real*real + imaginary*imaginary);
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
              // ζ= - Re(pole) / Math.sqrt(Re(pole)^2 + Im(pole)^2)
              let z = -real / Math.sqrt(real*real + imaginary*imaginary);
              range_slider_variables[variable_position["z"]] = z;
              // Update range slider value:
              document.getElementById("variable_"+variable_position["z"]).value = z.toFixed(2);
              // Update range slider:
              document.getElementById("RANGE_"+variable_position["z"]).value = z.toFixed(2);
              if (z <= 0.1){
                achievement_done("low_z");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO.formula){
              achievement_done("drag_zero");
              set_T_in_pz_map("T_4",real);
              if (real>0){
                achievement_done("drag_zero_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_ONE_ZERO_TWO_POLES.formula){
              // Change T_8, T_6 or T_7:
              let variable_to_change = clicked_on_time_variable;
              if (variable_to_change=="T_8"){
                achievement_done("drag_zero");
                if (real>0){
                  achievement_done("drag_zero_to_right_half_plane");
                }
              } else {
                achievement_done("drag_pole");
                const EPS = 0.06777777;
                if (real > EPS) real=EPS;
                if (real>0){
                  achievement_done("drag_pole_to_right_half_plane");
                }
              }
              set_T_in_pz_map(clicked_on_time_variable,real);
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_FOUR_POLES.formula){
              achievement_done("drag_pole");
              const EPS = 0.0677777;
              if (real > EPS) real=EPS;
              set_T_in_pz_map("T_5",real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);

            } else if (bode_graphs[i].bode_formula == GRAPH_PID.formula){
              achievement_done("drag_pole");
              // Change T_i or T_d
              set_T_in_pz_map(clicked_on_time_variable,real);
              if (real>0){
                achievement_done("drag_pole_to_right_half_plane");
              }
              redraw_canvas_gain(bode_graphs[i].bode_id);
            }
          }
        }
      }
    }
  }
}

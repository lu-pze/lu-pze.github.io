'use strict';

class bode_graph{
  constructor(a,b){
    this.bode_id = a;
    this.bode_formula = b;
    this.bode_complex_array = [];
    this.bode_gain_array = [];
    this.bode_phase_array = [];
    this.bode_timerep_array = [];
    this.bode_timerep_step = DEFAULT_PRECISION; // the pixels between the samples of bode_timerep_array
    this.bode_max_phase = -10000;
    this.bode_min_phase = 10000;
    this.bode_max_timerep = -10000;
    this.bode_min_timerep = 10000;
    this.bode_hue = color_table[a % color_table.length];
    this.bode_displaybool = true;
    this.bode_display_bodemag_bool = true;
    this.bode_display_bodephase_bool = true;
    this.bode_display_timeresponse_bool = true;
    this.bode_display_nyquist_bool = true;
    this.bode_display_information_bool = true;
    this.bode_display_equation_bool = true;
    this.is_ghost = false; // true for the reference graphs of quizzes and assignments
    this.bode_display_pole_zero_bool = true; // false for quiz ghosts: their poles could give answers away
    this.bode_poles_zeros = null; // {poles, zeros} for a computed pole-zero map, see get_complex_p5
    this.bode_min_nyquist_x = 10000;
    this.bode_max_nyquist_x = -10000;
    this.bode_min_nyquist_y = 10000;
    this.bode_max_nyquist_y = -10000;
    this.bode_gain_margin = 0;
    this.bode_phase_margin = 0;
    this.bode_gain_crossover_freq = 0;
    this.bode_phase_crossover_freq = 0;
    this.graph_name = "Graph";
  }

  get_complex_p5(){
    const binding = bind_formula(this.bode_formula);
    const frequencies = bode_frequencies(graph_bode_mag_width, min_10power, x_case_gain);
    if(binding !== null){
      const response = frequency_response(binding, frequencies);
      this.bode_complex_array = response.complex;
      this.bode_gain_array = response.gain;
      this.bode_phase_array = response.phase;
      [this.bode_min_phase, this.bode_max_phase] = response.phase_range;
      [this.bode_min_nyquist_x, this.bode_max_nyquist_x] = response.nyquist_x_range;
      [this.bode_min_nyquist_y, this.bode_max_nyquist_y] = response.nyquist_y_range;
    }
    let omegaZero = findOmegaZero(binding, this.bode_gain_array, frequencies);
    let omega180 = findOmega180(binding, this.bode_phase_array, frequencies);
    this.bode_gain_margin = omega180[0];
    this.bode_phase_margin = omegaZero[0];
    this.bode_gain_crossover_freq = omegaZero[1];
    this.bode_phase_crossover_freq = omega180[1];
    this.bode_poles_zeros = this.has_parameter_pole_zero_map() ? null : poles_and_zeros(binding);
  }

  // Whether the pole-zero map is drawn from the slider values (see pole_zero_map in presets_state.js).
  has_parameter_pole_zero_map(){
    return preset_of_formula(this.bode_formula)?.pole_zero_map !== undefined;
  }

  // Whether this graph gets a pole-zero map at all: presets with a parameter map always do,
  // other graphs when they have computed poles or zeros and are not quiz ghosts.
  has_pole_zero_map(){
    if (this.has_parameter_pole_zero_map()) return true;
    return this.bode_display_pole_zero_bool && this.bode_poles_zeros !== null;
  }


  get_timevalues_p5(){
    let formula_to_use = this.bode_formula;

    // Some formulas will never be displayed in the time response window, so just don't waste time calculating them:
    if (formula_to_use==GRAPH_PID.formula) return;
    if (formula_to_use==GRAPH_ONE_POLE_WITH_PID_S.formula) return;
    if (formula_to_use==GRAPH_ONE_POLE_WITH_PID_OPEN.formula) return;

    const sample_times = time_samples(graph_step_response_width, precision, max_x_timerep);

    // Take care of "known good" formulas that we know an exact answer to:
    const closed_form = closed_form_time_response(formula_to_use, input_formula, sample_times, slider_value);
    if (closed_form !== null){
      this.store_time_response(closed_form.values, closed_form.range);
      return;
    }

    // No closed form for this formula: time_response solves it exactly when it is a rational
    // function of s (times a delay), and falls back to Gaver-Stehfest otherwise.
    const response = time_response(input_formula, formula_to_use, sample_times);
    if(response !== null){
      this.store_time_response(response, value_range(response, 100000));
    }
  }

  // The step belongs to these samples: `precision` can change while this graph keeps them.
  store_time_response(values, range){
    this.bode_timerep_array = values;
    this.bode_timerep_step = precision;
    [this.bode_min_timerep, this.bode_max_timerep] = range;
  }


  draw_gain(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    beginShape();
    for(let x=0; x<graph_bode_mag_width; x++){
      let screen_y = map(this.bode_gain_array[x],gain_upper_bound - 20*y_case_gain,gain_upper_bound,graph_bode_mag_height,0);
      if(screen_y < graph_bode_mag_height && screen_y > 0){
        vertex(x,screen_y);
      }
    }
    endShape();
  }


  draw_phase(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    let rad_phase_lower_bound = phase_lower_bound*Math.PI/180;
    let rad_phase_upper_bound = phase_upper_bound*Math.PI/180;
    beginShape();
    for(let x=0; x<graph_bode_phase_width; x++){
      let screen_y = map(this.bode_phase_array[x],rad_phase_lower_bound,rad_phase_upper_bound,graph_bode_phase_height,0);
      if(screen_y < graph_bode_phase_height && screen_y > 0){
        vertex(x,screen_y);
      }
    }
    endShape();
  }


  draw_timeresponse(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    beginShape();
    for(let x=0; x<this.bode_timerep_array.length; x++){
      let screen_y = map(this.bode_timerep_array[x],min_y_timerep,max_y_timerep,graph_step_response_height,0,true);
      vertex(x*this.bode_timerep_step,screen_y);
    }
    endShape();
  }

  draw_T_in_Nyquist (T_to_draw,pole_zero="pole"){
    let T = slider_value(T_to_draw);
    if (T != 0){
      let frequency = 1 / T;
      if (pole_zero=="pole"){
        this.draw_nyquist_X(frequency);
      } else {
        this.draw_nyquist_O(frequency);
      }
    }
  }

  draw_nyquist_response(){
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    let new_complex_array = this.bode_complex_array;
    beginShape();
    for(let x=0; x<new_complex_array.length; x++){
      let current_complex = this.bode_complex_array[x];
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x > 0) &&
          (screen_x <= graph_nyquist_width) &&
          (screen_y > 0) &&
          (screen_y <= graph_nyquist_height)){
        vertex(screen_x,screen_y);
      } else {
        endShape();
        beginShape();
      }
    }
    endShape();
    // Draw a red X for T_1 in the Nyquist diagram:
    if(this.bode_displaybool){
      preset_of_formula(this.bode_formula)?.plot_on_nyquist?.(this);
    }
  }

  // An X for each of the two complex poles' frequencies, or for two real poles above z = 1.
  draw_complex_poles_in_nyquist(){
    for (const frequency of complex_pole_frequencies()){
      if (frequency != 0) this.draw_nyquist_X(frequency);
    }
  }

  draw_nyquist_X (frequency){
    //let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = Math.pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);
    let screen_x1 = (Math.log(Math.abs(frequency))/Math.log(10) + 2) * graph_bode_mag_width/5;
    //console.log("frequency="+frequency);
    //console.log("screen_x1="+screen_x1);
    let sample_no = Math.round(screen_x1);
//    let sample_no = Math.floor(new_complex_array.length * percentage);

    // This may fail, if the frequency is "outside" of the calculated frequencies.
    // So let's add a safety measure:
    if ((sample_no >= 0)&&(sample_no <new_complex_array.length)){
      let current_complex = new_complex_array[sample_no];
  //    console.log("current_complex="+current_complex);
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
        try {
          push();
      //    translate(graph_nyquist_x_offset+graph_nyquist_x,45+graph_nyquist_y);
          //console.log("screen_x="+screen_x);
          //console.log("screen_y="+screen_y);
          stroke(this.bode_hue,240,360);
          strokeWeight(line_stroke_weight);
          draw_X(screen_x, screen_y);
          pop();
        } catch {}
      }
    }
  }

  draw_nyquist_O(frequency){
    //let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    let screen_x1 = (Math.log(Math.abs(frequency))/Math.log(10) + 2) * graph_bode_mag_width/5;
    let sample_no = Math.round(screen_x1);
    // This may fail, if the frequency is "outside" of the calculated frequencies.
    // So let's add a safety measure:
    if ((sample_no >= 0)&&(sample_no <new_complex_array.length)){
      let current_complex = new_complex_array[sample_no];
      let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
      let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
      if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
        try {
          push();
          stroke(this.bode_hue,240,360);
          strokeWeight(line_stroke_weight);
          draw_O(screen_x, screen_y);
          pop();
        } catch {}
      }
    }
  }

  draw_nyquist_value(percentage){
//    let new_complex_array = this.bode_complex_array.map(x => x.conjugate());
    let new_complex_array = this.bode_complex_array;
    // This is the values that we have calculated in new_complex_array[x]:
    //  for(let x=0; x<graph_bode_mag_width; x++){
    //    let log_pow = map(x,0,graph_bode_mag_width,min_10power,min_10power+x_case_gain);
    //    let freq = Math.pow(10,log_pow);
    //    let bode_value = getComplexValues(freq);
    let sample_no = Math.floor(graph_bode_mag_width * percentage);
//    let sample_no = Math.floor(new_complex_array.length * percentage);
    let current_complex = new_complex_array[sample_no];
    let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
    let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
    if ((screen_x>=0)&&(screen_x<=graph_nyquist_width)&&(screen_y>=0)&&(screen_y<=graph_nyquist_height)){
      push();
      noStroke();
      translate(graph_nyquist_x_offset+graph_nyquist_x,graph_nyquist_y_offset+graph_nyquist_y);
      fill(this.bode_hue,360,360);
      ellipse(screen_x,screen_y,12,12);
      pop();
    }
  }

  get_nyquist_value(percentage){
    let new_complex_array = this.bode_complex_array;
    let sample_no = Math.floor(graph_bode_mag_width * percentage);
    let current_complex = new_complex_array[sample_no];
    let screen_x = map(current_complex.re,min_nyquist_x,max_nyquist_x,0,graph_nyquist_width);
    let screen_y = map(current_complex.im,max_nyquist_y,min_nyquist_y,0,graph_nyquist_height);
    return [screen_x, screen_y];
  }

  draw_pole_zero(draw_axis){
    for(let x=1; x<=3; x++){
      stroke(line_color);
      if (x==3){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      line(x*pole_zero_width/4,0,x*pole_zero_width/4,pole_zero_height);
    }
    for(let y=0; y<=4; y++){
      if (y==2){
        strokeWeight(3);
      } else {
        strokeWeight(1);
      }
      if ((y==0)||(y==4)){
        strokeWeight(line_stroke_weight / 2);
        stroke(this.bode_hue,360,360);
      } else {
        stroke(line_color);
      }
      line(0,y*pole_zero_height/4,pole_zero_width,y*pole_zero_height/4);
    }
    stroke(this.bode_hue,360,360);
    strokeWeight(line_stroke_weight / 2);
    line(0,0,0,pole_zero_height);
    line(pole_zero_width,0,pole_zero_width,pole_zero_height);
    noFill();
    strokeWeight(line_stroke_weight);
    stroke(this.bode_hue,360,360);
    if (draw_axis == true){
      push();
      noStroke();
      textSize(15);
      textAlign(CENTER);
      fill(text_color);
      for(let x=0; x<=4; x++){
        text((x-3).toFixed(1),x*pole_zero_width/4,pole_zero_height+20);
      }
      text("Real axis [1/s]",pole_zero_width/2,pole_zero_height+35);
      pop();
    }
    const preset = preset_of_formula(this.bode_formula);
    if (preset?.plot_on_pole_zero_map !== undefined){
      preset.plot_on_pole_zero_map(this);
    } else if (this.bode_poles_zeros !== null){
      // Display-only map: computed poles (X) and zeros (O).
      for (const pole of this.bode_poles_zeros.poles){
        this.plot_pole(...pole_zero_map_position(pole.re, pole.im));
      }
      for (const zero of this.bode_poles_zeros.zeros){
        this.plot_zero(...pole_zero_map_position(zero.re, zero.im));
      }
    }

    noStroke();
    textSize(15);
    textAlign(CENTER);
    let grey_color = color('hsb(0, 0%, 50%)');
    fill(grey_color,360,360);
    text(this.graph_name,pole_zero_width/2,pole_zero_height-7);
  }

  // Marks at s = -1/T on the real axis of the pole-zero map. A fast one is held at the left edge.
  plot_marks(marks){
    for (const mark of marks){
      let T_inverse = 1/mark.T;
      if (T_inverse > 3.2) T_inverse=3.2;
      if (mark.kind == "pole") this.plot_pole(-T_inverse,0);
      else this.plot_zero(-T_inverse,0);
    }
  }

  plot_complex_poles(){
    // Calculate bode_3_real and imaginary from z and w:
    // s = −ζω_n ± jω_n * Math.sqrt(1−ζ^2)
    let z = slider_value("z");
    let w = slider_value("w");

    if (Math.abs(z) <= 1){
      bode_3_real = -z*w;
      bode_3_imaginary = w * Math.sqrt(1-z*z);
      let [tmp_x, tmp_y] = pole_zero_map_position(bode_3_real, bode_3_imaginary);
      // Since these are complex, let's draw a line from origo as well:
      stroke(line_color);
      strokeWeight(1);
      line(pole_zero_width/2 + (tmp_x+1) * pole_zero_width/4,
           pole_zero_height/2 + tmp_y * pole_zero_height/4,
           pole_zero_width/2 + (0+1) * pole_zero_width/4,
           pole_zero_height/2 + 0 * pole_zero_height/4);
      line(pole_zero_width/2 + (tmp_x+1) * pole_zero_width/4,
           pole_zero_height/2 - tmp_y * pole_zero_height/4,
           pole_zero_width/2 + (0+1) * pole_zero_width/4,
           pole_zero_height/2 + 0 * pole_zero_height/4);
      noFill();
      strokeWeight(line_stroke_weight);
      stroke(this.bode_hue,360,360);
      this.plot_pole(tmp_x,tmp_y); // complex
      this.plot_pole(tmp_x,-tmp_y); // complex
    } else {
      //If Math.sqrt(1-ζ^2) is negative, then the square root becomes imaginary, resulting in real valued poles:
      let bode_3_real_1 = -z*w + w * Math.sqrt(z*z-1);
      let bode_3_real_2 = -z*w - w * Math.sqrt(z*z-1);
      bode_3_imaginary = 0;
      let tmp_x = bode_3_real_1;
      if (tmp_x < -3.2) tmp_x=-3.2;
      if (tmp_x > 1.2) tmp_x=1.2;
      this.plot_pole(tmp_x,0); // complex
      tmp_x = bode_3_real_2;
      if (tmp_x < -3.2) tmp_x=-3.2;
      if (tmp_x > 1.2) tmp_x=1.2;
      this.plot_pole(tmp_x,0); // complex
    }
  }

  plot_pole(pole_x,pole_y){
    let screen_x = pole_zero_width/2 + (pole_x+1) * pole_zero_width/4;
    let screen_y = pole_zero_height/2 + pole_y * pole_zero_height/4;

    let line_length = 6 + 2*Math.log(line_stroke_weight);
    line(screen_x-line_length,screen_y-line_length,screen_x+line_length,screen_y+line_length);
    line(screen_x+line_length,screen_y-line_length,screen_x-line_length,screen_y+line_length);
  }

  plot_zero(pole_x,pole_y){
    let radius = 15 + 3*Math.log(line_stroke_weight);
    let screen_x = pole_zero_width/2 + (pole_x+1) * pole_zero_width/4;
    let screen_y = pole_zero_height/2 + pole_y * pole_zero_height/4;
    ellipse(screen_x,screen_y,radius,radius);
  }
}

// Where a pole or zero at re + im*j is drawn in a pole-zero map (real axis -3..1, imaginary -2..2).
// A point outside is moved to just outside the edge (real -3.2..1.2, imaginary -2.2..2.2): a real
// point along the axis, a complex point towards the origin, keeping its direction.
function pole_zero_map_position(re, im){
  let x = re;
  let y = im;
  if (x < -3.2){
    y = y / (x / -3.2);
    x = -3.2;
  }
  if (x > 1.2){
    y = y / (x / 1.2);
    x = 1.2;
  }
  if (y < -2.2){
    x = x / (y / -2.2);
    y = -2.2;
  }
  if (y > 2.2){
    x = x / (y / 2.2);
    y = 2.2;
  }
  return [x, y];
}

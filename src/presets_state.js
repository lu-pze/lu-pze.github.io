//
// LU-PZE: Lund University Pole-Zero Explorer
// - an Automatic Control theory playground
//
// Try the live version at https://lu-pze.github.io
// Source code at https://github.com/lu-pze/lu-pze.github.io
//
// MIT License
// 
// Copyright (c) 2024 lu-pze
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';


// pole_zero_map: "draggable" or "shown" for a map drawn from the slider values, where "draggable"
// also takes mouse presses. A preset without it gets a computed map, if it has poles or zeros.
// bode_marks: gives the corner frequencies to mark in the Bode plots, as {T, kind}: an X for
// the kind "pole", an O for "zero". They are functions because they read the sliders.
const pole_mark = (name) => ({T: slider_value(name), kind: "pole"});
const zero_mark = (name) => ({T: slider_value(name), kind: "zero"});

// One X at w for complex poles. Above z = 1 the poles are real, and each gets its own X.
function complex_pole_marks(){
  const w = slider_value("w");
  const z = slider_value("z");
  const frequencies = (z <= 1) ? [w] : [z*w + w*Math.sqrt(z*z-1), z*w - w*Math.sqrt(z*z-1)];
  return frequencies.filter((frequency) => frequency >= 0).map((frequency) => ({T: 1/frequency, kind: "pole"}));
}

const GRAPH_ONE_REAL_POLE = {name:"One real pole", mf:"\\frac{k_1}{1+T_1s}", formula:"k_1/(1+T_1*s)", pole_zero_map:"draggable", bode_marks:() => [pole_mark("T_1")]};
const GRAPH_TWO_REAL_POLES = {name:"Two real poles", mf:"\\frac{k_2}{(1+T_2s)(1+T_3s)}", formula:"k_2/((1+T_2s)(1+T_3s))", pole_zero_map:"draggable", bode_marks:() => [pole_mark("T_2"), pole_mark("T_3")]};
const GRAPH_TWO_COMPLEX_POLES = {name:"Two complex poles", mf:"\\frac{k_3w^2}{s^2+2zws+w^2}", formula:"k_3*w^2/(s^2+2*z*w*s+w^2)", pole_zero_map:"draggable", bode_marks:complex_pole_marks};
const GRAPH_TIME_DELAY = {name:"Time delay", mf:"\\frac{3}{1+s}e^{-Ls}", formula:"3/(1+s)*e^(-L*s)"};
const GRAPH_ONE_ZERO_TWO_POLES = {name:"One zero two poles", mf:"\\frac{k_4(1+T_8s)}{(1+T_6s)(1+T_7s)}", formula:"k_4(1+T_8s)/(1+T_6s)*1/(1+T_7s)", pole_zero_map:"draggable", bode_marks:() => [pole_mark("T_6"), pole_mark("T_7"), zero_mark("T_8")]};
const GRAPH_FOUR_POLES = {name:"Four poles", mf:"\\frac{k_5}{(1+T_5s)^4}", formula:"k_5/((1+T_5s)^4)", pole_zero_map:"shown", bode_marks:() => [pole_mark("T_5")]};
const GRAPH_ONE_ZERO = {name:"One zero", mf:"T_4s+0.5", formula:"T_4*s+0.5", pole_zero_map:"shown", bode_marks:() => [pole_mark("T_4")]};
//const GRAPH_ONE_POLE_WITH_PID_YR = {name:"One pole with PID R->Y", mf:"\\frac{K k_1 (1 + T_i s + T_iT_ds^2)}{K k_1 + T_i (1 + K k_1)s + T_i (T_1 + K k_1 T_d)s^2}", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s)) / (K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_ONE_POLE_WITH_PID_YR = {name:"One pole with PID R->Y", mf:"G_{YR} = \\frac{G_{PID} \\cdot G}{1 + G_{PID} \\cdot G}", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s)) / (K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_PID = {name:"PID controller", mf:"G_{PID}=K \\left(1 + \\frac{1}{s T_i} + s T_d \\right)}", formula:"K + K / (s * T_i) + K * T_d * s", pole_zero_map:"draggable", bode_marks:() => [zero_mark("T_i"), zero_mark("T_d")]};
const GRAPH_ONE_POLE_WITH_PID_S = {name:"One pole with PID Sensitivity", mf:"S = \\frac{1}{1 + G_{PID} \\cdot G}", formula:"(s*T_i*(1+T_1*s))/(K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)*s*s)"};
const GRAPH_ONE_POLE_WITH_PID_YL = {name:"One pole with PID Load", mf:"G_{YL} = \\frac{G}{1 + G_{PID} \\cdot G}", formula:"(k_1*T_i*s)/(K*k_1 + T_i*(1 + K*k_1)*s + T_i*(T_1 + K*k_1*T_d)s*s)"};
const GRAPH_ONE_POLE_WITH_PID_OPEN = {name:"One pole with PID open-loop", mf:"G_{OL} = G_{PID} \\cdot G", formula:"(K*k_1*(1 + T_i*s + T_i*T_d*s*s))/(T_i*(s+T_1*s*s))"};


const GRAPH_ORDER = [
  GRAPH_ONE_REAL_POLE,
  GRAPH_TWO_REAL_POLES,
  GRAPH_TWO_COMPLEX_POLES,
  GRAPH_TIME_DELAY,
  GRAPH_ONE_ZERO_TWO_POLES,
  GRAPH_FOUR_POLES,
  GRAPH_ONE_ZERO,
  GRAPH_PID,
  GRAPH_ONE_POLE_WITH_PID_YR,
  GRAPH_ONE_POLE_WITH_PID_S,
  GRAPH_ONE_POLE_WITH_PID_YL,
  GRAPH_ONE_POLE_WITH_PID_OPEN,
];

// The preset with this formula, or undefined. A graph whose formula was edited is no longer a preset.
function preset_of_formula(formula){
  return GRAPH_ORDER.find((preset) => preset.formula == formula);
}

const NOF_GRAPHS_AT_STARTUP = 4;
let next_graph_no_to_add = 0;
let id_bank = 1;

let start_date = new Date();
let session_started_at = start_date.getTime();
let debug_mode = false;

let min_10power = -2;
let rate = 1.4;
let precision = 4;
const DEFAULT_PRECISION=4;
const SPEED_PRECISION=12;
let we_need_faster_calculations_right_now = false; // Flag to know if precision is reduced

let x_case_gain = 5;
let y_case_gain = 6;

let bode_graphs = [];
let current_tab = 0;

let phase_lower_bound = 0;
let phase_upper_bound = 0;
let gain_upper_bound = 60;
let phase_case_number;

//                              red   yellow    green     blue  magenta   light green        green
let color_table = [     270,    350,      32,     170,     202,-90+5*81,           76,-90-360+7*81,-90-360+8*81,-90-360+9*81,-90-360+10*81,-90-360+11*81,-90-360+12*81,-90-360+13*81,-90-360+14*81,-90-360+15*81];

let max_y_timerep = 100;
let min_y_timerep = 0;
let max_x_timerep = 10;

let min_nyquist_x = -1;
let max_nyquist_x = 1;
let min_nyquist_y = -1;
let max_nyquist_y = 1;

let line_stroke_weight = 2;
let text_color;
let angle_color;
let line_color;
let background_color;
let box_background_color;

let canvas_width;
let canvas_height;
let graph_bode_mag_width;
let graph_bode_mag_height;
let graph_bode_mag_x;
let graph_bode_mag_y;
const graph_bode_mag_x_offset = 68;
const graph_bode_mag_y_offset = 30;
let graph_bode_phase_width;
let graph_bode_phase_height;
let graph_bode_phase_x;
let graph_bode_phase_y;
const graph_bode_phase_x_offset = 68;
const graph_bode_phase_y_offset = 110;
const graph_bode_phase_axis_height = 35;
let graph_step_response_width;
let graph_step_response_height;
let graph_step_response_x;
let graph_step_response_y;
const graph_step_response_x_offset = 65;
const graph_step_response_y_offset = 40;
const graph_step_response_timeaxis_height = 35;
let graph_nyquist_width;
let graph_nyquist_height;
let graph_nyquist_x;
let graph_nyquist_y;
const graph_nyquist_x_offset = 65;
const graph_nyquist_y_offset = 45;
let graph_pole_zero_width;
let graph_pole_zero_x;
let graph_pole_zero_y;
let pole_zero_width;
let pole_zero_height;

'use strict';

let is_fullscreen = false;
function toggle_fullscreen(){
  if (is_fullscreen == false){
    add_event("go_fullscreen");
    achievement_done("go_fullscreen");
    openFullscreen();
  } else {
    closeFullscreen();
  }
}

function openFullscreen() {
  let elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
    is_fullscreen = true;
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
    is_fullscreen = true;
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
    is_fullscreen = true;
  }
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
    is_fullscreen = false;
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
    is_fullscreen = false;
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
    is_fullscreen = false;
  }
}

let graph_no=0;
function initial_graph(){
  // Add the initial startup graphs, with a little delay to make it look good:
  let graph_to_add = GRAPH_ORDER[graph_no];
  addNewGraph(null, graph_to_add);
  graph_no +=1;
  next_graph_no_to_add = graph_no;

  let welcome_text=document.getElementById("welcome_text");
  if (nof_quiz_started == 0) {
    welcome_text.innerHTML='<div class="yellow_hover" id="inital_quiz_button"><span onclick="toggle_quiz()" style="color:#b0b0b0;vertical-align:middle"><button type="button" id="initial_quiz_icon" style="padding:0 3px;margin-right:0px;background:none;border:none;margin-top:11px;" title="Start quiz"><svg width="27" height="27" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg> Take the initial quiz</button></span></div>';
  } else {
    welcome_text.innerHTML='';
  }
}

function set_cookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function get_cookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// Called by p5:
function setup (){
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  if (urlParams.has('p')) {
    let place = urlParams.get('p').replace(";","_").replace("\\","/");
    client_place = place.replace(/[^A-ZÅÄÖa-zåäö0123456789]/g, '_')
  }
  if (urlParams.has('debug')) {
    debug_mode = true;
  }
  add_event("setup="+start_date.toLocaleString().replace(" ",""));
  client_cookid = get_cookie("cookid");
  if (client_cookid=="") {
    client_cookid = str(Math.random()*2**31>>>0); // A pretty random 31-bit uint id
    add_event("set_cookid=" + client_cookid);
    set_cookie("cookid", client_cookid, 50);
  } else {
    add_event("got_cookid=" + client_cookid);
  }
  setGraphDimensions();
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      add_event("gpu="+gl.getParameter(gl.RENDERER));
      if ((navigator.userAgent.toLowerCase().indexOf('firefox') >= 0)==false){
        // This is not firefox, so we can ask for more:
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        add_event("gpu2="+gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        add_event("gpu_vendor="+gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      }
    }
  } catch {}
  try {
    add_event("tz="+Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {}
  try {
    add_event("lang="+navigator.language);
  } catch {}
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      add_event("theme=dark_mode");
    } else {
      add_event("theme=light_mode");
    }
  } catch {}
  try {
    add_event("nof_cores="+navigator.hardwareConcurrency);
  } catch {}
  try {
    add_event("ram_gb="+navigator.deviceMemory); //0.25, 0.5, 1, 2, 4 or 8.
  } catch {}
  try {
    add_event("platform="+navigator.platform);
  } catch {}
  try {
    add_event("ref="+document.referrer);
  } catch {}
  // Setting the p5 line drawing type. Regardless of setting,
  // there are artifacts in the TIME DELAY blue Nyquist diagram when the time delay is present,
  // and the Preference "Line stroke weight" is large.
  //strokeJoin(ROUND);  //mitered (MITER), beveled (BEVEL), or rounded (ROUND
  let canvas = createCanvas(canvas_width,canvas_height);
  canvas.parent('sketch_holder');
  colorMode(HSB,360);
  background_color = color('hsb(0,0%,4%)');
  box_background_color = 120;
  line_color = color('hsb(0,0%,22%)');  // Grey graph lines
  text_color = color('hsb(0,0%,20%)');
  angle_color = "#ff40ff";
  // To go from "T_1" to the index in range_slider_variables:
  for(let i=0; i<range_slider_alphabet.length; i++){
    variable_position[range_slider_alphabet[i]] = i;
  }
  id_bank=0;
  noLoop();

  let footer_div=document.getElementsByClassName("footer")[0];
  footer_div.style.display="inline";
  let graph_information_div=document.getElementsByClassName("graph-information")[0];
  graph_information_div.style.display="inline";
  init_quiz();
}

function ready (){
  let add_button = document.getElementsByClassName("add-graph")[0];
  add_button.addEventListener('click',addNewGraphClicked);
  let setting_button = document.getElementsByClassName("option-button")[0];
  setting_button.addEventListener('click',view_settings);
  let input_equation = document.getElementsByClassName("input-equation")[0].getElementsByClassName("formula")[0];
  input_equation.addEventListener('input',updateInputFormula);
  // Make sure that input function selector is visible:
  let toggleElement = document.querySelector('.input-equation');
  toggleElement.classList="active";
  let hover_answer = document.getElementById("hover_answer");
  hover_answer.style.visibility="hidden";
  // Enable gamification from start:
  toggle_gamification();
  toggle_assignments();
  set_difficulty_level({value:50});
  toggle_quiz_enabled();

  document.addEventListener('keydown', function(event) {
    //console.log(event.key);
    //if (event.key=='F1'){
    //  toggle_quiz_enabled();
    //}
    if (event.key=='F2'){
      start_quiz();
    }
    //if (event.key=='F3'){
    //  quiz_correct();
    //  update_quiz();
    //}
    //if (event.key=='F1') select_assignment({value:"pid_controller"});
    //if (event.key=='F2') select_assignment({value:"pid_controller_YL"});
    //if (event.key=='F3') show_answer_to_task("PID_(T_d!=0)");
    if (event.key=='Escape') restart_lupze();
  });

  document.addEventListener('contextmenu', function(event) {
    // Prevent the default right-click behavior
    event.preventDefault();
    questionsToggle();
    add_event("ask_a_question");
    achievement_done("ask_a_question");
  });
  //document.addEventListener('mouseup', function(event) {
  //  if (event.button === 2) {
  //    console.log('Right mouse button released');
  //  }
  //  disable_questions();
  //});

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      add_event("LU-PZE_hidden");
    } else {
      add_event("LU-PZE_visible");
    }
  });

  prepare_banner();
  setInterval(timer_feedback, fb_popup_interval * 1000)
}

// Start the app: register ready() for DOMContentLoaded (or run it right away if the
// page has already loaded). This is last because it needs everything above defined.
if (document.readyState == 'loading'){
  document.addEventListener('DOMContentLoaded', ready)
} else {
  ready();
}

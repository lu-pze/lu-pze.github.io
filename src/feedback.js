'use strict';

// ----------------------
// Feedback

const fb_popup_interval = 12;
let feedback_is_visible=0;

function timer_feedback () {
  // Don't show the banner if a quiz is ongoing.
  if (quiz_is_running==0) {
    start_feedback();
  }
}

function start_feedback () {
  if (feedback_is_visible==1) return;
  let fb_text = get_next_fb_text();
  if (fb_text=="") {
    // No feedback question available right now. Just ignore.
    // There is nothing to show
    if (feedback_is_visible==1){
      stop_feedback();
    }
  } else {
    add_event("start_fb");
    let toggleElement = document.querySelector('.feedback');
    toggleElement.classList.add('active');
    feedback_is_visible=1;
    let fb_div = document.getElementById("feedback_text");
    fb_div.innerHTML = fb_text;
  }
}

function stop_feedback () {
  let toggleElement = document.querySelector('.feedback');
  toggleElement.classList.remove('active');
  feedback_is_visible=0;
  add_event("stop_fb");
}


// A list of all fb that are already answered:
let done_fb = [];
const fb_all_assignments={
  "fb_one_pole":"I have learnt more about systems with one pole from this assignment:",
  "fb_two_real_poles":"I have learnt more about systems with two real poles from this assignment:",
  "fb_two_complex_poles":"I have learnt more about systems with two complex poles from this assignment:",
  "fb_time_delay":"I have learnt more about systems with time delay from this assignment:",
  "fb_one_zero_two_poles":"I have learnt more about systems with one zero and two poles from this assignment:",
  "fb_four_poles":"I have learnt more about systems with four poles from this assignment:",
  "fb_pid_controller":"I have learnt more about a PID controller with a one-pole system from this assignment:",
  "fb_pid_controller_YL":"I have learnt more about a PID controller and a system with a load from this assignment:"};
let have_done_a_compete_quiz = false;

function get_next_fb_text() {
  let available_fb = [];

//  available_fb.push("fb_quiz_new");
//  available_fb.push("fb_quiz_knowledge");
//  available_fb.push("fb_quiz_enjoy");
//  available_fb.push("fb_quiz_highscore");
//  available_fb.push("fb_ass_new");
//  available_fb.push("fb_ass_knowledge");
//  available_fb.push("fb_ass_enjoy");
//  available_fb.push("fb_achievements");
//  available_fb.push("fb_liketext");
//  available_fb.push("fb_text");
//  available_fb.push("fb_increased");
//  available_fb.push("fb_good_learning");
//  available_fb.push("fb_gamified");
//  available_fb.push("fb_questions");
//  available_fb.push("fb_bode");
//  available_fb.push("fb_nyquist");
//  available_fb.push("fb_polezero");
//  available_fb.push("fb_one_pole");
//  available_fb.push("fb_two_real_poles");
//  available_fb.push("fb_two_complex_poles");
//  available_fb.push("fb_time_delay");
//  available_fb.push("fb_one_zero_two_poles");
//  available_fb.push("fb_four_poles");
//  available_fb.push("fb_pid_controller");
//  available_fb.push("fb_pid_controller_YL");
//  available_fb.push("fb_bode2");
//  available_fb.push("fb_nyquist2");
//  available_fb.push("fb_polezero2");


  if (nof_quiz_started >= 1) {
    available_fb.push("fb_quiz_new");
    available_fb.push("fb_quiz_knowledge");
    available_fb.push("fb_quiz_enjoy");
  }
  if (nof_quiz_started >= 2) {
    available_fb.push("fb_quiz_many");
  }
  if (nof_assignments_done >= 2) {
    available_fb.push("fb_ass_new");
    available_fb.push("fb_ass_knowledge");
    available_fb.push("fb_ass_enjoy");
  }
  if ((nof_times_achievements_window_opened>0) && (achievement_score >= 20)) {
    available_fb.push("fb_achievements");
  }
  if (done_fb.includes("fb_quiz_new") && done_fb.includes("fb_ass_new") && done_fb.includes("fb_achievements")) {
    available_fb.push("fb_liketext");
  }
  if (done_fb.includes("fb_liketext")) {
    available_fb.push("fb_text");
  }
  if (have_done_a_compete_quiz == true) {
    available_fb.push("fb_quiz_highscore");
  }

  let date_now = new Date();
  let now = date_now.getTime();
  let time_diff = now-session_started_at;
  let mseconds_elapsed = Math.floor(time_diff);


  // Let these fb appear after 40 seconds:
  if (mseconds_elapsed > 40*1000) {
    available_fb.push("fb_edu");
  }

  // Let these fb appear after 4 minutes:
  if (mseconds_elapsed > 4*60*1000) {
    available_fb.push("fb_questions");
  }

  // Let these fb appear after 7 minutes:
  if (mseconds_elapsed > 7*60*1000) {
    available_fb.push("fb_bode");
    available_fb.push("fb_nyquist");
    available_fb.push("fb_polezero");
  }

  // Let these fb appear after 10 minutes:
  if (mseconds_elapsed > 10*60*1000) {
    available_fb.push("fb_increased");
  }

  // Let these fb appear after 13 minutes:
  if (mseconds_elapsed > 13*60*1000) {
    available_fb.push("fb_good_learning");
    available_fb.push("fb_gamified");
  }

  // Let these fb appear after 20 minutes:
  if (mseconds_elapsed > 20*60*1000) {
    available_fb.push("fb_bode2");
    available_fb.push("fb_nyquist2");
    available_fb.push("fb_polezero2");
  }

  // Check which assignments are done, and enable fb for these:
  for (let assignment_id in all_assignments){
    if (done_assignments[assignment_id] == all_assignments[assignment_id].tasks.length){
      available_fb.push("fb_"+assignment_id);
    }
  }




  // Don't show an fb that has already been answered:
  let fb_to_choose_from = available_fb.filter(element => !done_fb.includes(element));
  const index_to_choose = Math.floor(Math.random() * fb_to_choose_from.length);
  const fb_to_show_this_time = fb_to_choose_from[index_to_choose];

  let s="";
  if (fb_to_show_this_time=="fb_quiz_new"){
    s += 'I learned something new from the quiz <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg>:<br>';
    s += '<fieldset style="border:0"><label for="fb_quiz_new">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_quiz_new" value="50" style="width:50%" onchange="set_fb_quiz_new(this)">';
    s += '<label for="fb_quiz_new">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_quiz_knowledge"){
    s += 'The quiz <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg> has deepened my knowledge:<br>';
    s += '<fieldset style="border:0"><label for="fb_quiz_knowledge">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_quiz_knowledge" value="50" style="width:50%" onchange="set_fb_quiz_knowledge(this)">';
    s += '<label for="fb_quiz_knowledge">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_quiz_enjoy"){
    s += 'I enjoyed doing the quiz <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg>:<br>';
    s += '<fieldset style="border:0"><label for="fb_quiz_enjoy">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_quiz_enjoy" value="50" style="width:50%" onchange="set_fb_quiz_enjoy(this)">';
    s += '<label for="fb_quiz_enjoy">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_quiz_highscore"){
    s += 'The highscore table motivates me to do more quizzes <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg>:<br>';
    s += '<fieldset style="border:0"><label for="fb_quiz_highscore">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_quiz_highscore" value="50" style="width:50%" onchange="set_fb_quiz_highscore(this)">';
    s += '<label for="fb_quiz_highscore">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_achievements"){
    s += 'The achievements <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_star"/></svg> motivate me to explore the webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_achievements">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_achievements" value="50" style="width:60%" onchange="set_fb_achievements(this)">';
    s += '<label for="fb_achievements">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_increased"){
    s += 'This webpage increases my interest in Automatic Control:<br>';
    s += '<fieldset style="border:0"><label for="fb_increased">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_increased" value="50" style="width:60%" onchange="set_fb_increased(this)">';
    s += '<label for="fb_increased">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_good_learning"){
    s += 'Interactive tools are good for learning:<br>';
    s += '<fieldset style="border:0"><label for="fb_good_learning">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_good_learning" value="50" style="width:60%" onchange="set_fb_good_learning(this)">';
    s += '<label for="fb_good_learning">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_gamified"){
    s += 'Teaching in general should be more gamified:<br>';
    s += '<fieldset style="border:0"><label for="fb_gamified">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_gamified" value="50" style="width:60%" onchange="set_fb_gamified(this)">';
    s += '<label for="fb_gamified">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_ass_new"){
    s += 'I learned something new from the assignments <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_assignment"/></svg>:<br>';
    s += '<fieldset style="border:0"><label for="fb_ass_new">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_ass_new" value="50" style="width:60%" onchange="set_fb_ass_new(this)">';
    s += '<label for="fb_ass_new">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_ass_knowledge"){
    s += 'The assignments <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_assignment"/></svg> have deepened my knowledge:<br>';
    s += '<fieldset style="border:0"><label for="fb_ass_knowledge">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_ass_knowledge" value="50" style="width:60%" onchange="set_fb_ass_knowledge(this)">';
    s += '<label for="fb_ass_knowledge">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_ass_enjoy"){
    s += 'I enjoy doing the assignments <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_assignment"/></svg>:<br>';
    s += '<fieldset style="border:0"><label for="fb_ass_enjoy">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_ass_enjoy" value="50" style="width:60%" onchange="set_fb_ass_enjoy(this)">';
    s += '<label for="fb_ass_enjoy">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_questions"){
    s += 'The right-click questions helped me:<br>';
    s += '<fieldset style="border:0"><label for="fb_questions">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_questions" value="50" style="width:60%" onchange="set_fb_questions(this)">';
    s += '<label for="fb_questions">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_bode"){
    s += 'I have learned more about the relation between Bode plots and step responses from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_bode">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_bode" value="50" style="width:60%" onchange="set_fb_bode(this)">';
    s += '<label for="fb_bode">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_nyquist"){
    s += 'I have learned more about the relation between Nyquist diagrams and Bode plots from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_nyquist">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_nyquist" value="50" style="width:60%" onchange="set_fb_nyquist(this)">';
    s += '<label for="fb_nyquist">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_polezero"){
    s += 'I have learned more about the relation between pole-zero maps and step responses from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_polezero">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_polezero" value="50" style="width:60%" onchange="set_fb_polezero(this)">';
    s += '<label for="fb_polezero">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_bode2"){
    s += 'I have learned more about the relation between Bode plots and step responses from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_bode2">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_bode2" value="50" style="width:60%" onchange="set_fb_bode2(this)">';
    s += '<label for="fb_bode2">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_nyquist2"){
    s += 'I have learned more about the relation between Nyquist diagrams and Bode plots from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_nyquist2">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_nyquist2" value="50" style="width:60%" onchange="set_fb_nyquist2(this)">';
    s += '<label for="fb_nyquist2">Agree</label></fieldset>';
  } else if (fb_to_show_this_time=="fb_polezero2"){
    s += 'I have learned more about the relation between pole-zero maps and step responses from this webpage:<br>';
    s += '<fieldset style="border:0"><label for="fb_polezero2">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_polezero2" value="50" style="width:60%" onchange="set_fb_polezero2(this)">';
    s += '<label for="fb_polezero2">Agree</label></fieldset>';

  } else if ((fb_to_show_this_time=="fb_one_pole") ||
             (fb_to_show_this_time=="fb_two_real_poles") ||
             (fb_to_show_this_time=="fb_two_complex_poles") ||
             (fb_to_show_this_time=="fb_time_delay") ||
             (fb_to_show_this_time=="fb_one_zero_two_poles") ||
             (fb_to_show_this_time=="fb_four_poles") ||
             (fb_to_show_this_time=="fb_pid_controller") ||
             (fb_to_show_this_time=="fb_pid_controller_YL")) {
    s += fb_all_assignments[fb_to_show_this_time]+'<br>';
    s += '<fieldset style="border:0"><label for="fb_all_assignments">Don\'t&nbsp;agree</label>';
    s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="fb_all_assignments" value="50" style="width:60%" onchange="set_fb_all_assignments(\''+fb_to_show_this_time+'\',this)">';
    s += '<label for="fb_all_assignments">Agree</label></fieldset>';

  } else if (fb_to_show_this_time=="fb_text"){
    s += 'Suggestions for improvement:<br><textarea rows="3" cols="60" id="fb_text" name="fb_text" style="font-size:80%;text-align:left;background:#fff" oninput="set_fb_text(this)"></textarea>';
    s += '<table width="90%"><tr><td width="50%" class="yellow_hover" onclick="done_fb_text()" align="center">';
    s += '<span id="fb_done_button" style="color:#000000;vertical-align:middle;text-align:center;margin:10px" width="100%">Done!</span><br>';
    s += '</td></tr></table>';
  } else if (fb_to_show_this_time=="fb_nickname"){
    s += 'Your nickname (optional): <input type="text" id="nickname" name="nickname" size="12" style="font-size:162%;text-align:center;background:#fff" value="" oninput="set_nickname(this)">';
  } else if (fb_to_show_this_time=="fb_edu"){
    s += '<table><tr><td>';
    s += 'Automatic control:<br>';
    s += '<label><input type="radio" id="fb_edu" name="fb_edu" value="nothing" onchange="set_fb_edu(this)">';
    s += 'I know nothing.</label><br>';
    s += '<label><input type="radio" id="fb_edu" name="fb_edu" value="student" onchange="set_fb_edu(this)">';
    s += 'I\'m studying it.</label><br>';
    s += '<label><input type="radio" id="fb_edu" name="fb_edu" value="have_studied" onchange="set_fb_edu(this)">';
    s += 'I have studied it.</label><br>';
    s += '<label><input type="radio" id="fb_edu" name="fb_edu" value="phd" onchange="set_fb_edu(this)">';
    s += 'I\'m an Automatic Control PhD student.</label><br>';
    s += '<label><input type="radio" id="fb_edu" name="fb_edu" value="professor" onchange="set_fb_edu(this)">';
    s += 'I\'m an Automatic Control Professor.</label><br>';
    s += '</td></tr></table>';
  } else if (fb_to_show_this_time=="fb_quiz_many"){
    s += '<table><tr><td>';
    s += 'What makes you do more quizzes?<br>';
    s += '<label><input type="radio" id="fb_quiz_many" name="fb_quiz_many" value="fun_compete" onchange="set_fb_quiz_many(this)">It’s fun to compete</label><br>';
    s += '<label><input type="radio" id="fb_quiz_many" name="fb_quiz_many" value="good_practice" onchange="set_fb_quiz_many(this)">Good practice</label><br>';
    s += '<label><input type="radio" id="fb_quiz_many" name="fb_quiz_many" value="challenge_myself" onchange="set_fb_quiz_many(this)">Fun to challenge myself</label><br>';
    s += '<label><input type="radio" id="fb_quiz_many" name="fb_quiz_many" value="professor" onchange="set_fb_quiz_many(this)">Want to reach professor level</label><br>';
    s += '<label><input type="radio" id="fb_quiz_many" name="fb_quiz_many" value="other" onchange="set_fb_quiz_many(this)">Other</label><br>';
    s += '</td></tr></table>';
  } else if (fb_to_show_this_time=="fb_liketext"){
    s += 'What did you like the most here:<br><textarea rows="5" cols="40" id="fb_liketext" name="fb_liketext" style="font-size:80%;text-align:left;background:#fff" oninput="set_fb_liketext(this)"></textarea>';
    s += '<table width="90%"><tr><td width="50%" class="yellow_hover" onclick="done_fb_liketext()" align="center">';
    s += '<span id="fb_done_button" style="color:#000000;vertical-align:middle;text-align:center;margin:10px" width="100%">Done!</span><br>';
    s += '</td></tr></table>';
  }

  return s;
}

function done_feedback () {
  add_event("done_fb");
  stop_feedback();
}

function set_fb_quiz_new (event) {
  done_fb.push("fb_quiz_new");
  add_event("set_fb_quiz_new="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_quiz_knowledge (event) {
  done_fb.push("fb_quiz_knowledge");
  add_event("set_fb_quiz_knowledge="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_quiz_enjoy (event) {
  done_fb.push("fb_quiz_enjoy");
  add_event("set_fb_quiz_enjoy="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_quiz_highscore (event) {
  done_fb.push("fb_quiz_highscore");
  add_event("set_fb_quiz_highscore="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_achievements (event) {
  done_fb.push("fb_achievements");
  add_event("set_fb_achievements="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_increased (event) {
  done_fb.push("fb_increased");
  add_event("set_fb_increased="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_good_learning (event) {
  done_fb.push("fb_good_learning");
  add_event("set_fb_good_learning="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_gamified (event) {
  done_fb.push("fb_gamified");
  add_event("set_fb_gamified="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_ass_new (event) {
  done_fb.push("fb_ass_new");
  add_event("set_fb_ass_new="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_ass_knowledge (event) {
  done_fb.push("fb_ass_knowledge");
  add_event("set_fb_ass_knowledge="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_ass_enjoy (event) {
  done_fb.push("fb_ass_enjoy");
  add_event("set_fb_ass_enjoy="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_questions (event) {
  done_fb.push("fb_questions");
  add_event("set_fb_questions="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_bode (event) {
  done_fb.push("fb_bode");
  add_event("set_fb_bode="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_nyquist (event) {
  done_fb.push("fb_nyquist");
  add_event("set_fb_nyquist="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_polezero (event) {
  done_fb.push("fb_polezero");
  add_event("set_fb_polezero="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_all_assignments (which_assignment, event) {
  done_fb.push(which_assignment);
  add_event(which_assignment+"="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_bode2 (event) {
  done_fb.push("fb_bode2");
  add_event("set_fb_bode2="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_nyquist2 (event) {
  done_fb.push("fb_nyquist2");
  add_event("set_fb_nyquist2="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_polezero2 (event) {
  done_fb.push("fb_polezero2");
  add_event("set_fb_polezero2="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_text (event) {
  add_event("set_fb_text="+event.value);
}
function done_fb_text () {
  done_fb.push("fb_text");
  stop_feedback();
  start_feedback();
}

function set_fb_liketext (event) {
  add_event("set_fb_liketext="+event.value);
}
function done_fb_liketext () {
  done_fb.push("fb_liketext");
  stop_feedback();
  start_feedback();
}

function set_fb_edu (event) {
  done_fb.push("fb_edu");
  add_event("set_fb_edu="+event.value);
  stop_feedback();
  start_feedback();
}

function set_fb_quiz_many (event) {
  done_fb.push("fb_quiz_many");
  add_event("set_fb_quiz_many="+event.value);
  stop_feedback();
  start_feedback();
}

'use strict';

// ----------------------
// Achievements

let gamification_enabled = false;
// The states of the "Enable sound" checkbox. Compare with === : 1 == true and 0 == false in JavaScript.
let sound_enabled=0; // 0 means "sound off, no audio context yet". 1 means "sound on, the audio context is initialized at the next press".
                     // true means "everything works". false means "everything works but don't play anything" (muted, the context is kept).
let done_achievements=[];
let achievement_score=0;
let achievement_rank="";
let achievement_score_to_next_rank=0;

function toggle_gamification(event){
  if (gamification_enabled == false){
    gamification_enabled = true;
    let show_achievements_icon = document.getElementById("show_achievements");
    show_achievements_icon.style.display = "inline";
  } else {
    gamification_enabled = false;
    let show_achievements_icon = document.getElementById("show_achievements");
    show_achievements_icon.style.display = "none";
  }
}

function toggle_sound(event){
  if (sound_enabled===0){
    sound_enabled = 1;
  } else if (sound_enabled===1){
    sound_enabled = 0;
  } else if (sound_enabled===false){
    sound_enabled = true;
  } else {
    sound_enabled = false;
  }
}

function achievement_done (which_one){
  if (quiz_is_running>0) return;
  if (!(done_achievements.includes(which_one))){
    // This is a new achievement
    add_event("achievement_done="+which_one);
    done_achievements.push(which_one);
    if (gamification_enabled==true){
      // Trigger an animation with the text:
      let achievement_text_div = document.getElementById("achievement_text");
      achievement_text_div.innerHTML=all_achievements[which_one];
      let left = (100*mouseX /windowWidth);
      if (left > 85) left = 85;
      let top = (100*mouseY/windowHeight);
      if (top > 90) top = 90;
      document.querySelector('.achievement_text').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_text').style.setProperty('--top',top+"%");
      document.querySelector('.achievement_star').style.setProperty('--left',left+"%");
      document.querySelector('.achievement_star').style.setProperty('--top',top+"%");
      let achievement_star_div = document.getElementById("achievement_star");
      achievement_text_div.style.animation = 'none';
      achievement_text_div.offsetHeight; /* trigger reflow */
      achievement_text_div.style.animation="MoveToStar 7s ease-in-out 0s 1";
      achievement_star_div.style.animation = 'none';
      achievement_star_div.offsetHeight; /* trigger reflow */
      achievement_star_div.style.animation="MoveToStar2 8s ease-out 0s 1";
      if (sound_enabled===true){
        play_jingle();
      }
      // Let the menu star wiggle a little:
      let menu_star_div = document.getElementById("show_achievements");
      menu_star_div.style.animation = 'none';
      menu_star_div.offsetHeight; /* trigger reflow */
      menu_star_div.style.animation="MenuStar 7s ease-in-out 0s 1";
    }
    update_achievements();
//  } else {
    //   This achievement has already been completed. No need to do anything.
    //add_event("achievement_done_again="+which_one);
  }
}

const all_achievements={
  "view_achievements":"Open your <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_star'/></svg> Achievements",
  "view_assignments":"Open your <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_assignment'/></svg> Assignments",
  "view_info":"Open the <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_info'/></svg> info section",
  "go_fullscreen":"Get rid of distractions by going <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_fullscreen'/></svg> fullscreen",
  "drag_pole":"Drag a pole <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_clear'/></svg> in the pole-zero map",
  "drag_zero":"Drag a zero <b>O</b> in the pole-zero map",
  "ask_a_question":"Right click to ask <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_help'/></svg> questions.",
  "drag_bode_mag":"Drag a transfer function in the Bode magnitude plot",
  "drag_bode_phase":"Drag a transfer function in the Bode phase plot",
  "drag_complex_pole":"Drag <b>two complex poles</b> in the pole-zero map",
  "hover_nyquist_-90":"Hover or click the Nyquist diagram at -90° on the unit circle",
  "drag_time_response":"Drag the <b>two complex poles</b> transfer function in the time domain",
  "drag_pole_to_right_half_plane":"Drag a pole <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_clear'/></svg> in the pole-zero map into the right half plane",
  "drag_zero_to_right_half_plane":"Drag a zero <b>O</b> in the pole-zero map into the right half plane",
  "start_quiz":"Start a <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_school'/></svg> quiz",
  "add_graph":"Add <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_add'/></svg> another graph",
  "set_input_to_impulse":"Change the input function to a dirac impulse",
  "python_script":"Get <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_ios_share'/></svg> the Python script for any transfer function",
  "matlab_script":"Get <svg width='20' height='20' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_ios_share'/></svg> the MATLAB script for any transfer function",
  "change_L":"Change time delay L in the <b>time delay</b> transfer function",
  "low_z":"Make relative damping z for <b>two complex poles</b> less than 0.1",
  "T2_T3_far_apart":"Separate <b>two real poles'</b> time constants a factor 100 apart",
  "k_above_or_equal_100":"Change a transfer function to have a magnitude k≥100",
  "set_input_to_ramp":"Change the input to a ramp function"
};

const achievement_ranks={
  99:"Automatic Control Legend",
  95:"Automatic Control Guru",
  90:"Automatic Control Diamond Welder",
  85:"Gold Medal Control 先生 Sensei",
  80:"Automatic Contrl 指導者 Shidousha", // "guidance person"
  75:"Silver Medal Control Master",
  70:"Automatic Control 真剣な競争者 Shinken na Kyoushuusha", //  "Serious contender"
  65:"Automatic Control Brave Knight",
  60:"Bronze Medal Control Whiz",
  50:"Automatic Control Hero",
  40:"Automatic Control Citizen",
  25:"Automatic Control Apprentice",
  10:"Automatic Control Wannabe",
  5:"Automatic Control 初心者 Shoshinsha", // "beginner"
  0:"Automatic Control Newbie"
}

let star_grade=0;
function update_achievements (){
  achievement_score = 100.0 * done_achievements.length / Object.keys(all_achievements).length;
  achievement_rank="";
  achievement_score_to_next_rank=-1;
  let new_star_grade=0;
  if (achievement_score<15){
    new_star_grade=0; // Black
  } else if (achievement_score<50){
    new_star_grade=1; // Bronze
  } else if (achievement_score<98){
    new_star_grade=2; // Silver
  } else {
    new_star_grade=3; // Gold
  }
  if (new_star_grade != star_grade){
    let star_0 = document.getElementById("star_0");
    star_grade=new_star_grade;
    star_0.src = "images/star_"+new_star_grade+".webp";
    star_0.style.animation = 'none';
    star_0.offsetHeight; /* trigger reflow */
    star_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let star_0_text = document.getElementById("star_0_text");
  star_0_text.innerHTML = done_achievements.length + "/" + Object.keys(all_achievements).length + "&nbsp";

  const entries = Object.entries(achievement_ranks);
  // Sort the array based on integer keys in descending order
  entries.sort(([keyA], [keyB]) => keyB - keyA);
  // Iterate over the sorted array
  for (const [threshold] of entries) {
    if (achievement_score>=threshold){
      achievement_rank=achievement_ranks[threshold];
      break;
    } else {
      achievement_score_to_next_rank=threshold-achievement_score;
    }
  }

  let achievements_box = document.querySelector('.achievements_box');
  let s = "";
  s += '<br><button type="button" class="close-window" onclick="hide_achievements();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';

  s += "<center>";
  s += "<svg width='28' height='28' viewBox='0 0 24 24' style='vertical-align:middle'><use href='#icon_star'/></svg>";
  s += " Your Achievements ";
  s += "</center><br>";
  s += "Completed:<br>";
  for (let achievement_id in all_achievements){
    if (done_achievements.includes(achievement_id)){
      let long_name = all_achievements[achievement_id]
      s += "<input type='checkbox' checked onclick='reset_achievement(\""+achievement_id+"\");'>&nbsp;" + long_name + "<br>";
    }
  }
  s += "<br>Your Score: <b>" + achievement_score.toFixed(1) + "/100</b><br>";
  s += "Your Rank: <b>" + achievement_rank + "</b><br><br>";

  if (done_achievements.length == Object.keys(all_achievements).length){
    s += "<center>Well done! You're one in a million, Legend.</center><br>";
  } else {
    s += "Level up with another " + achievement_score_to_next_rank.toFixed(1) + " points:<br>";
    for (let achievement_id in all_achievements){
      if (!(done_achievements.includes(achievement_id))){
        let long_name = all_achievements[achievement_id]
        s += "<input type='checkbox' onclick='return false;'>&nbsp;" + long_name + "<br>";
      }
    }
  }
  s += "<br>";

  achievements_box.innerHTML=s;
}

function reset_achievement(achievement_to_reset){
  let index = done_achievements.indexOf(achievement_to_reset);
  if (index !== -1) {
    // We found it. Remove it:
    done_achievements.splice(index, 1);
  }
  update_achievements();
}

let nof_times_achievements_window_opened = 0;

function view_achievements (event){
  achievement_done("view_achievements");
  add_event("view_achievements");
  remove_all_windows();
  nof_times_achievements_window_opened += 1;
  let achievements_box = document.querySelector('.achievements_box');
  achievements_box.classList.toggle('active');
  update_achievements();
}
function hide_achievements (event){
  add_event("hide_achievements");
  remove_all_windows();
}


//// seed_jingle1:
//var jingle_positions = [
//  0.0,
//  6.87,
//  13.92,
//  21.58,
//  30.82,
//  41.40,
//  50.78,
//  61.32,
//  71.61,
//  82.81,
//  95.55,
//  109.48
//];
//// pling_v01.mp3:
//var jingle_positions = [
//  0.0,
//  1.0,
//  2.0,
//  3.0,
//  4.0,
//  5.0,
//  6.0,
//  7.0,
//  8.0,
//  9.0,
//  10.0,
//  11.0,
//  12.0,
//  13.0,
//  14.0,
//  15.0,
//  16.0,
//  17.0,
//  18.0,
//  19.0,
//  20.0,
//  21.0,
//  22.0,
//  23.0,
//  24.0,
//  25.0,
//  26.0,
//  27.0,
//  28.0
//];

// bonus_pling7.wav:
var jingle_positions = [
  0.0,
  3.0
];

var current_jingle = 0;// Jingle_positions.length-2;
var last_jingle_play = 0;
var jingle_buffer;
var jingle_source;
function init_jingle (){
//  var audioSource = "audio/pling_v01.mp3";
//  var audioSource = "audio/seed_jingle1.mp3";
  var audioSource = "audio/bonus_pling7.wav";
  var request = new XMLHttpRequest();
  request.open("GET", audioSource, true);
  request.responseType = "arraybuffer";
  // Decode asynchronously
  request.onload = function () {
    window.audioContext.decodeAudioData(request.response, (theBuffer) => {
      jingle_buffer = theBuffer;
      //        Play_jingle();
    });
  };
  request.send();
}
function play_jingle (){
  //console.log("Play jingle");
  try {
    // This is how non-iOS stops a sound:
    if (jingle_source) {
      jingle_source.stop();
    }
  } catch (e) {}
  try {
    // This is how iOS stops a sound:
    if (jingle_source) {
      jingle_source.noteOff();
    }
  } catch (e) {}
  try {
    if (jingle_source) {
      jingle_source.disconnect();
    }
  } catch (e) {}
  if (jingle_buffer) {
    jingle_source = window.audioContext.createBufferSource();
    jingle_source.buffer = jingle_buffer;
    jingle_source.connect(window.audioContext.destination);
  }
  if (current_jingle >= jingle_positions.length - 1) {
    current_jingle = 0;
  }
  var real_from = jingle_positions[current_jingle] - 0.05;
  if (real_from < 0) {
    real_from = 0;
  }
  var to = jingle_positions[current_jingle + 1];
  if (jingle_source) {
    jingle_source.start(0, real_from, to - real_from - 0.10);  //-0.3 for seed_jingle1.mp3
    current_jingle++;
  }
}

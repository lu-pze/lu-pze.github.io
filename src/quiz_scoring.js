'use strict';

// Parses the highscore log (one line per result, see php/lu-pze_compete.php) into per-player best values.
// A player is identified by "<place>_<nickname>" (";L...;" in the line), "_Anonymous" if missing.
function parse_highscore_lines(raw) {
  let lines = raw.split('\n');
  let high_total = {};
  let high_total_nof_correct = {};
  let high_total2 = {}; // =total + 0.01*nof_correct  to separate those having the same total.
  let high_longest_streak = {};
  let high_nof_correct = {};
  let high_latest = {};
  for(let i=0; i<lines.length; i++){
    let line=lines[i];
    if (line.startsWith("T")){
      const place_name_re = new RegExp(/;L(.*?);/,"g");
      let placename = "_Anonymous";
      const m=place_name_re.exec(line);
      if (m) {
        placename = m[1];
      }

      const total_re = new RegExp(/,total=([0-9.]+),/,"g");
      const longest_streak_re = new RegExp(/,longest_streak=([0-9.]+),/,"g");
      const nof_correct_re = new RegExp(/,nof_correct=([0-9.]+),/,"g");
//,#server_time=2024/09/27 14:37:16.
      const server_time_re = new RegExp(/,#server_time=([0-9/ :]+)/,"g");

      const m2=total_re.exec(line);
      const m3=longest_streak_re.exec(line);
      const m4=nof_correct_re.exec(line);
      const m5=server_time_re.exec(line);
      if (m2) {
        let this_total = float(m2[1]);
        let this_nof_correct = 0;
        if (m4) {
          this_nof_correct = float(m4[1]);
        }
        let this_score = this_total + 0.01*this_nof_correct;
        if (placename.includes("Pex")) this_score -= 0.001;
//          console.log(placename + ":total=" + this_total + ",nofc=" + this_nof_correct + ",score=" + this_score);
        if (placename in high_total){
          if (this_score > high_total2[placename]){
            high_total[placename] = this_total;
            high_total2[placename] = this_score;
            high_total_nof_correct[placename] = this_nof_correct;
          }
        } else {
          high_total[placename] = this_total;
          high_total2[placename] = this_score;
          high_total_nof_correct[placename] = this_nof_correct;
        }
      }

      if (m3) {
        let this_longest_streak = float(m3[1]);
        if (placename in high_longest_streak){
          if (this_longest_streak > high_longest_streak[placename]){
            high_longest_streak[placename] = this_longest_streak;
          }
        } else {
          high_longest_streak[placename] = this_longest_streak;
        }
      }

      if (m4) {
        let this_nof_correct = float(m4[1]);
        if (placename in high_nof_correct){
          if (this_nof_correct > high_nof_correct[placename]){
            high_nof_correct[placename] = this_nof_correct;
          }
        } else {
          high_nof_correct[placename] = this_nof_correct;
        }
      }

      if (m5) {
        let this_server_time = m5[1];
        if (placename in high_latest){
          if (this_server_time > high_latest[placename]){
            high_latest[placename] = this_server_time;
          }
        } else {
          high_latest[placename] = this_server_time;
        }
      }

    }
  }
  return {high_total, high_total_nof_correct, high_total2, high_longest_streak, high_nof_correct, high_latest};
}

// [[key, value], ...] sorted with the highest value first.
function sorted_by_value_descending(values_by_name) {
  let entries = Object.keys(values_by_name).map(function(name) {
    return [name, values_by_name[name]];
  });
  entries.sort(function(first, second) {
    return second[1] - first[1];
  });
  return entries;
}

// The highscore log is plain text that anyone can POST to, so a name in it is never trusted as HTML.
function escape_html(text) {
  return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// "FRTF05_Nick" -> {place:"FRTF05", nickname:"Nick"}, nickname shortened with "..." if longer than max_length.
// The nickname comes back escaped for HTML; the place is raw, highscore_place_cell escapes it after cutting it.
function split_placename(placename, max_length) {
  let i = placename.indexOf('_');
  let parts = [placename.slice(0,i), placename.slice(i+1)];
  let nickname = parts[1];
  if (nickname.length>max_length) {
    nickname = nickname.substr(0,max_length-3)+"...";
  }
  return {place: parts[0], nickname: escape_html(nickname)};
}

// "NN. " for the first row with a new value, otherwise blanks of the same width (ties).
function highscore_rank_prefix(row_no, is_new_value) {
  if (is_new_value) {
    return str(row_no+1).padStart(2," ").replace(" ","&nbsp;") +". ";
  }
  return "&nbsp;&nbsp;&nbsp;&nbsp;";
}

// Place name padded or cut to 6 characters, followed by a space.
function highscore_place_cell(place) {
  return escape_html((place + "      ").substr(0,6)).replaceAll(" ","&nbsp;") + "&nbsp;";
}

function render_highscore_section(high_total_sorted, scores, latest_cutoff_date) {
  let s="<h2>High score last 3 months</h2>";
  let prev_score = -1;
  for (let row_no=0; row_no<high_total_sorted.length; row_no++) {
    let this_placename = high_total_sorted[row_no][0];
    let who = split_placename(this_placename, 19);
    let date1 = new Date(scores.high_latest[this_placename]);
    if (date1 < latest_cutoff_date) continue;
    let this_score = scores.high_total[this_placename].toFixed(1);
    s += highscore_rank_prefix(row_no, prev_score != this_score);
    prev_score = this_score;
    s += this_score.padStart(5,' ').replace(" ","&nbsp;") + " ";
    s += highscore_place_cell(who.place);
    s += who.nickname + ", after "+scores.high_total_nof_correct[this_placename]+" questions<br>";
  }
  return s;
}

function render_latest_quizzers_section(high_latest) {
  let high_latest_sorted = Object.keys(high_latest).map(function(nickname) {
    return [nickname, high_latest[nickname]];
  });
  // Newest first; the times are strings like "2024/09/27 14:37:16".
  high_latest_sorted.sort(function(first, second) {
    return (second[1] < first[1]) ? -1 : (second[1] > first[1]) ? 1 : 0;
  });
  let s="<h2>Latest quizzers</h2>";
  for (let row_no=0; row_no<Math.min(10,high_latest_sorted.length); row_no++) {
    let row=high_latest_sorted[row_no];
    let who = split_placename(row[0], 24);
    s += str(row[1]) + " ";
    s += highscore_place_cell(who.place);
    s += who.nickname + "<br>";
  }
  return s;
}

function render_legends_section(high_total_sorted, scores) {
  let s="<h2>Legends</h2>";
  let prev_score = -1;
  for (let row_no=0; row_no<high_total_sorted.length; row_no++) {
    let this_placename = high_total_sorted[row_no][0];
    let who = split_placename(this_placename, 19);
    if (scores.high_total[this_placename] < 99.99) continue;
    let this_score = scores.high_total[this_placename].toFixed(1);
    let date1 = new Date(scores.high_latest[this_placename]);
    s += highscore_rank_prefix(row_no, prev_score != this_score);
    prev_score = this_score;
    s += this_score.padStart(5,' ').replace(" ","&nbsp;") + " ";
    s += highscore_place_cell(who.place);
    s += who.nickname + ", "+scores.high_total_nof_correct[this_placename]+" questions, "+date1.toLocaleString('en-US', { month: 'short' })+" "+date1.getFullYear().toString()+"<br>";
  }
  return s;
}

// Top-N list of "<rank>. <value> <place> <nickname>" rows, used for streaks and answered questions.
function render_top_list_section(heading, values_by_name, max_rows) {
  let sorted = sorted_by_value_descending(values_by_name);
  let s="<h2>" + heading + "</h2>";
  let prev_value = -1;
  for (let row_no=0; row_no<Math.min(max_rows,sorted.length); row_no++) {
    let row=sorted[row_no];
    let who = split_placename(row[0], 24);
    s += highscore_rank_prefix(row_no, prev_value != row[1]);
    prev_value = row[1];
    s += str(row[1]).padStart(2," ").replace(" ","&nbsp;") + " ";
    s += highscore_place_cell(who.place);
    s += who.nickname + "<br>";
  }
  return s;
}

function read_highscores () {
  add_event("read_highscores");
  var XHR = new XMLHttpRequest();
  XHR.addEventListener("load", (event) => {
    let scores = parse_highscore_lines(event.target.response);
    // Rank numbers count every player, also those hidden by the 3 month limit.
    let high_total_sorted = sorted_by_value_descending(scores.high_total2);
    let latest_cutoff_date = new Date();
    latest_cutoff_date.setMonth(latest_cutoff_date.getMonth() - 3);

    let s = render_highscore_section(high_total_sorted, scores, latest_cutoff_date);
    s += render_latest_quizzers_section(scores.high_latest);
    s += render_legends_section(high_total_sorted, scores);
    s += render_top_list_section("Longest streak", scores.high_longest_streak, 10);
    s += render_top_list_section("Most answered questions", scores.high_nof_correct, 15);

    let highscore_div = document.getElementById("quiz_highscores");
    highscore_div.innerHTML=s;
  });
  XHR.addEventListener("error", (event) => {
    console.log("Error");
    console.log(event);
  });
  // Compete:
  XHR.open("GET", "https://livet.se/lu-pze_compete.php", true);
  XHR.send("");
}

function quiz_time_is_up (){
  let quiz_intro_div = document.getElementById("quiz_intro");

  let s = "";
  s += '<center><h2>';
  if (client_nick != "") {
    s += client_nick + ', ';
  }
  s += 'Time\'s up!</h2>';
  s += '<button type="button" class="close-window" onclick="stop_quiz();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';
  s += '<img src="images/bell_small.webp" width="300px" style="margin:0;padding:0">';
  s += '<br>';


  s += "You got " + quiz_nof_correct + " correct answers,<br>";
  s += "with a longest streak of " + quiz_longest_streak + " correct answers.<br>";
  s += "You answered " + quiz_nof_done + " questions in " + (quiz_nof_tries) + " clicks";
  if(quiz_nof_tries > 0) s += ",<br>which is a " + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "% accuracy.<br>";
  else s += ".<br>";

  s += '<div class="quiz-container">';
  s += '<input type="range" min="0" max="100" step="1" class="quiz-slider" id="experience_level" value="' + quiz_difficulty + '" style="width:100%" onchange="set_quiz_experience(this)" disabled>';
  s += '<div class="quiz-labels">';
  s += '<label for="0"></label>';
  s += '<label for="12.5">&nbsp;Novice</label>';
  s += '<label for="25"></label>';
  s += '<label for="37.5"></label>';
  s += '<label for="50">&nbsp;Intermediate</label>';
  s += '<label for="62.5"></label>';
  s += '<label for="75"></label>';
  s += '<label for="87.5">&nbsp;Professor</label>';
  s += '<label for="100"></label>';
  s += '</div>';
  s += '</div>';
  s += "Your total result";
  s += '<br><br>';

//  s += '<span style="color:#808080"><br>';

  if (quiz_nof_correct > 0) {
    // Sort according to quiz_difficulties[quiz_questions[question]]
    // Create items array
    var items = Object.keys(quiz_difficulties).map(function(key) {
      return [key, quiz_difficulties[key]];
    });
    // Sort the array based on the second element
    items.sort(function(first, second) {
      return second[1] - first[1];
    });

    const quiz_explanation = {
"click_freq":"reading log scale diagrams",
"click_time":"clicking on linear x axes",
"click_nyquist_angle":"identifying angles in the Nyquist diagram",
"click_system":"understanding a system's order",
"click_wrong":"finding the odd-one-out graph"};
    // The results:
    let res = "quiz_time_is_up.";
    for (let position in items){
      let question_id = items[position][0];
      let difficulty_level = items[position][1];
      res += question_id + "=" + difficulty_level.toFixed(1) + ",";
    }
    res += 'total='+quiz_difficulty.toFixed(1)+",";
    res += 'nof_correct=' + quiz_nof_correct+",";
    res += "longest_streak=" + quiz_longest_streak + ",";
    res += "nof_questions=" + quiz_nof_done + ",";
    if (quiz_nof_tries > 0) res += "accuracy=" + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "%,";
    res += "nof_clicks=" + (quiz_nof_tries) + ",";
    res += "nof_quiz_started=" + nof_quiz_started + ",";
    res += "quiz_practice=" + quiz_practice + ",";
    res += "quiz_compete=" + quiz_compete + ",";
    res += "cookid=" + client_cookid + ",";
    // Now pretty-print the quiz_timeline list of answers:
    let st="qt=[";
    for (let i=0; i < quiz_timeline.length; i++) {
      let answer = quiz_timeline[i];
      st+="{t" + str(answer["t"]) + ",r" + str(answer["r"]) + ",q" + answer["q"] + ",a" + answer["a"] + "},";
    }
    st+="].";
    res += st;
    add_event(res);
    if (quiz_compete == true) {
      have_done_a_compete_quiz = true;
      let date_now = new Date();
      let now = date_now.getTime();
      let time_diff = now-session_started_at;
      let mseconds_elapsed = Math.floor(time_diff);
      var XHR = new XMLHttpRequest();
      var to_send = `T${mseconds_elapsed/1000};U${client_id};L${client_place}_${client_nick};`;
      to_send += res;
      var urlEncodedData = `e=${encodeURIComponent(to_send).replace(/%20/g, "+")}`;
      XHR.addEventListener("load", (event) => {
        console.log("OK");
        console.log(event);
        console.log(event.target.response);
        read_highscores();
      });
      XHR.addEventListener("error", (event) => {
        console.log("Error");
        console.log(event);
      });
      // Compete:
      XHR.open("POST", "https://livet.se/lu-pze_compete.php", true);
      XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      XHR.send(urlEncodedData);
    }
    let top_question_id = items[0][0];
    let top_difficulty_level = items[0][1];
    s += "You're ";
    if (top_difficulty_level > 80) {
      s += "really ";
    }
    s += "good at " + quiz_explanation[top_question_id];
    let bottom_question_id = items[items.length - 1][0];
    s += ", but you could focus on learning more about " + quiz_explanation[bottom_question_id] + ".<br><br>";
    //  s += '<span style="color:#808080">Total: ' + quiz_difficulty.toFixed(1) + "</span><br>";
  }

  s += '<div id="nickname_area">';
  s += 'Your nickname: <input type="text" id="nickname" name="nickname" size="12" style="font-size:162%;text-align:center;background:#fff" autofocus value="" oninput="set_nickname(this)"><br>';
  s += '</div>';

  s += '<table width="90%"><tr><td width="20%" class="yellow_hover" onclick="stop_quiz()" align="center">';
  s += '<br><span id="quiz_cancel_button" style="color:#b0b0b0;vertical-align:middle;margin:10px">I\'m done</span><br><br>';
  s += '</td><td width="30%" class="yellow_hover" onclick="quiz_lets_go_practice()" align="center">';
  s += '<br><span id="quiz_practice_button" style="color:#000000;vertical-align:middle;text-align:center;margin:10px" width="100%">Practice!</span><br><br>';
  s += '</td><td width="40%" class="yellow_hover" onclick="quiz_lets_go_compete()" align="center">';
  s += '<br><span id="quiz_compete_button" style="color:#000000;vertical-align:middle;margin:10px" width="100%">Let\'s go Compete!</span><br><br>';
  s += '</td></tr></table>';

  s += '</center>';



  quiz_intro_div.innerHTML = s;

  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.add('active');
  let toggleElement2 = document.querySelector('.quiz_highscores');
  toggleElement2.classList.add('active');
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  removeAllGraphs();
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  quiz_is_running = 0;
}


function set_difficulty_level(event){
  quiz_difficulty = +(event.value);
  add_event("set_difficulty_level="+event.value);
  quiz_difficulties={};
  for (let question in quiz_questions){
    quiz_difficulties[quiz_questions[question]] = quiz_difficulty;
    quiz_streaks[quiz_questions[question]] = 0;
    quiz_questions_nof_done[quiz_questions[question]]=0;
    if (enabled_quiz_types[quiz_questions[question]] == undefined){
      enabled_quiz_types[quiz_questions[question]]=false;
    }
  }
  update_quiz();
}


function quiz_clicked_pole_zero(clicked_on_pole_zero_graph_no,real,imaginary,clicked_on_time_variable){
  quiz_clicked({where:"pz",graph_no:clicked_on_pole_zero_graph_no,real:real,imaginary:imaginary,time_variable:clicked_on_time_variable});
}
function quiz_clicked_time_response(clicked_on_time_response_graph_no,time,amplitude,clicked_on_time_variable){
  quiz_clicked({where:"time",graph_no:clicked_on_time_response_graph_no,time:time,amplitude:amplitude,time_variable:clicked_on_time_variable});
}
function quiz_clicked_time_response_xaxis(time){
  quiz_clicked({where:"time_xaxis",time:time});
}
function quiz_clicked_bode_mag(clicked_on_bode_mag_graph_no,frequency,magnitude,clicked_on_time_variable){
  quiz_clicked({where:"Bmag",graph_no:clicked_on_bode_mag_graph_no,frequency:frequency,magnitude:magnitude,time_variable:clicked_on_time_variable});
}
function quiz_clicked_bode_mag_xaxis(frequency){
  quiz_clicked({where:"Bmag_xaxis",frequency:frequency});
}
function quiz_clicked_bode_mag_yaxis(magnitude){
  quiz_clicked({where:"Bmag_yaxis",magnitude:magnitude});
}
function quiz_clicked_bode_phase(clicked_on_bode_phase_graph_no,frequency,phase,clicked_on_time_variable){
  quiz_clicked({where:"Bphase",graph_no:clicked_on_bode_phase_graph_no,frequency:frequency,phase:phase,time_variable:clicked_on_time_variable});
}
function quiz_clicked_bode_phase_xaxis(frequency){
  quiz_clicked({where:"Bphase_xaxis",frequency:frequency});
}
function quiz_clicked_bode_phase_yaxis(phase){
  quiz_clicked({where:"Bphase_yaxis",phase:phase});
}
function quiz_clicked_nyquist(magnitude,angle){
  quiz_clicked({where:"Nyq",magnitude:magnitude,phase:angle});
}
function quiz_clicked(all){
  add_event("quiz_clicked:where="+all.where+",graph_no="+all.graph_no+",time_variable="+all.time_variable+",real="+all.real+",imaginary="+all.imaginary+",time="+all.time+",amplitude="+all.amplitude+",frequency="+all.frequency+",magnitude="+all.magnitude+",phase="+all.phase);
  if (current_quiz=="click_freq"){
    if ((all.where=="Bmag")||(all.where=="Bmag_xaxis")||(all.where=="Bmag_yaxis")||(all.where=="Bphase")||(all.where=="Bphase_xaxis")||(all.where=="Bphase_yaxis")){
      if (quiz_freq==0) quiz_correct();
      else if (quiz_freq==-1){
        if ((all.where=="Bmag")||(all.where=="Bmag_xaxis")||(all.where=="Bmag_yaxis")) quiz_correct();
        else quiz_incorrect("No. The Bode <i>magnitude</i> plot is above this one.");
      } else if (quiz_freq==-2){
        if ((all.where=="Bphase")||(all.where=="Bphase_xaxis")||(all.where=="Bphase_yaxis")) quiz_correct();
        else quiz_incorrect("No. The Bode <i>phase</i> plot is below this one.");
      }
      else if ((all.frequency >= quiz_freq*0.6667) && (all.frequency <= quiz_freq*1.4)) quiz_correct();
      else if (all.where=="Bmag_yaxis") quiz_incorrect("No, the Bode magnitude is not a frequency. Try again!");
      else if (all.where=="Bphase_yaxis") quiz_incorrect("No, the Bode phase is not a frequency. Try again!");
      else quiz_incorrect("No. You did click the correct graph, but your "+all.frequency.toFixed(2)+" is too far off the correct "+quiz_freq.toFixed(2)+".");
    }
    else if (all.where=="Nyq") quiz_incorrect("No. The Nyquist diagram contains phases and magnitudes. The frequency information we can find is 0 rad/s and ∞ rad/s which corresponds to the start and end of the Nyquist graph. For a specific frequency, look somewhere else.");
    else if (all.where=="time") quiz_incorrect("No. The time response of a system shows the amplitude after the input signal is applied. If you're looking for frequencies, look elsewhere.");
    else if (all.where=="time_xaxis") quiz_incorrect("No. This axis is about time and seconds.If you're looking for frequencies, look elsewhere.");
    else if (all.where=="pz") quiz_perhaps("Perhaps. The pole-zero map can tell you time constants of a system through the location of the poles and zeros. However, for pinpointing a certain frequency there's an easier way.");

  } else if (current_quiz=="click_time"){
    if ((all.where=="time")||(all.where=="time_xaxis")){
      if (quiz_time_to_click==-1) quiz_correct();
      else if ((all.time >= quiz_time_to_click-0.5)&&(all.time <= quiz_time_to_click+0.5)) quiz_correct();
      else quiz_incorrect("No. You did click the right graph, but at the wrong position. Your " + (all.time.toFixed(1)) + " is too far away from the desired " + quiz_time_to_click.toFixed(1) + ".");
    }
    else if (all.where=="Bmag") quiz_incorrect("No. There is no time information in the Bode magnitude plot.");
    else if (all.where=="Bphase") quiz_incorrect("No. There is no time information in the Bode phase plot.");
    else if (all.where=="Bmag_xaxis") quiz_incorrect("No. There is no time information in the Bode magnitude frequency axis.");
    else if (all.where=="Bphase_xaxis") quiz_incorrect("No. There is no time information in the Bode phase frequency axis.");
    else if (all.where=="Bmag_yaxis") quiz_incorrect("No. There is no time information in the Bode magnitude y-axis.");
    else if (all.where=="Bphase_yaxis") quiz_incorrect("No. There is no time information in the Bode phase y-axis.");
    else if (all.where=="Nyq") quiz_incorrect("No. The Nyquist diagram contains phases and magnitudes. There is no direct time information in the Nyquist diagram.");
    else if (all.where=="pz"){
      if (quiz_time_to_click==-1){
        quiz_perhaps("No. The pole-zero map is not the place to find time.");
      } else {
        quiz_perhaps("No. The pole-zero map is not the place to find " + quiz_time_to_click.toFixed(1) + " seconds.");
      }
    }

  } else if (current_quiz=="click_nyquist_angle"){
    //console.log(all.phase); // Phase is between -0 and -359.9 degrees.
    if (all.where=="Nyq"){
      if (quiz_nyquist_angle_to_click==1000) quiz_correct();
      else {
        let angle_difference = quiz_nyquist_angle_to_click - all.phase;
        if (angle_difference > 180) angle_difference -= 360;
        if ((angle_difference >= -15)&&(angle_difference<=15)){
          quiz_correct();
        } else {
          let angle_to_print = all.phase;
          if (angle_to_print < -270) angle_to_print += 360;
          quiz_incorrect("No. You did click the right graph, but at the wrong angle. Your " + (angle_to_print.toFixed(0)) + "° is too far away from the desired " + quiz_nyquist_angle_to_click.toFixed(0) + "°.");
        }
      }
    } else if (all.where=="time") quiz_incorrect("No. There are no angles in the time response graph.");
    else if (all.where=="Bmag") quiz_incorrect("No. There are no angles in the Bode magnitude plot.");
    else if (all.where=="Bmag_xaxis") quiz_incorrect("No. There are no angles in the Bode magnitude frequency axis.");
    else if (all.where=="Bmag_yaxis") quiz_incorrect("No. There are no angles in the Bode magnitude y-axis.");
    else if (all.where=="Bphase") quiz_perhaps("Well, there are angles in the Bode phase plot, but this time we asked for the Nyquist angles. Try again!");
    else if (all.where=="Bphase_xaxis") quiz_incorrect("No. There are no angles in the Bode phase frequency axis.");
    else if (all.where=="Bphase_yaxis") quiz_perhaps("Well, there are angles in the Bode phase plot, but this time we asked for the Nyquist angles. Try again!");
    else if (all.where=="pz") quiz_incorrect("No, there are no angles in the pole-zero map.");

  } else if (current_quiz=="click_system"){
    if (all.graph_no==-1) quiz_perhaps("Perhaps. Please click directly on one line, not just inside a graph.");
    else{
      if ((all.where=="time")||(all.where=="Bmag")||(all.where=="Bphase")||(all.where=="pz")){
        if (quiz_system_to_click==1){ // 1st order
          if (all.graph_no==0) quiz_correct();
          else if(all.graph_no==2) quiz_incorrect("No. You clicked the fourth-order system.");
          else quiz_incorrect("No. You clicked a second-order system.");
        } else if (quiz_system_to_click==2){ //2nd order
          if (all.graph_no==0) quiz_incorrect("No. You clicked a first-order system.");
          else if(all.graph_no==2) quiz_incorrect("No. You clicked the fourth-order system.");
          else quiz_correct();
        } else { //4th order
          if (all.graph_no==0) quiz_incorrect("No. You clicked a first-order system.");
          else if(all.graph_no==2) quiz_correct();
          else quiz_incorrect("No. You clicked a second-order system.");
        }
      } else if (all.where=="Nyq") quiz_perhaps("Please click in the other graphs or plots.");
    }

  } else if (current_quiz=="click_wrong"){
    if (all.where=="Bmag"){
      if (quiz_click_wrong==0) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Bode magnitude plot.");
    } else if (all.where=="Bphase"){
      if (quiz_click_wrong==1) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Bode phase plot.");
    } else if (all.where=="time"){
      if (quiz_click_wrong==2) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this step input response.");
    } else if (all.where=="Nyq"){
      if (quiz_click_wrong==3) quiz_correct();
      else quiz_incorrect("No. There's nothing wrong with this Nyquist diagram.");
    }
  }

  update_quiz();
}

var confetti_defaults = {
  spread: 360,
  ticks: 55,
  gravity: -0.8,
  decay: 0.96,
  startVelocity: 8,
  origin: { x:0.2, y: 0.6 },
  colors: ['FFFF00', 'FF8080', 'E89400', 'FFCA6C', 'FDFFB8']
};

function shoot_confetti() {
  confetti({
    ...confetti_defaults,
    particleCount: 30,
    gravity: -0.2,
    scalar: 2.8,
    shapes: ['star']
  });
  confetti({
    ...confetti_defaults,
    particleCount: 15,
    scalar: 1.5,
    startVelocity: 24,
    flat:false,
    shapes: ['square'],
    colors: ['FF0000', 'FF8000', 'c0c0c0', 'a04070']
  });
  confetti({
    ...confetti_defaults,
    particleCount: 10,
    gravity: 1.0,
    scalar: 2.5,
    startVelocity: 14,
    shapes: ['circle'],
    colors: ['a0d0a0', 'a0a0d0', 'c0c0c0', 'a05050']
  });
}

function quiz_correct (){
  add_event("quiz_correct");
  quiz_nof_done += 1;
  quiz_nof_correct += 1;
  quiz_nof_tries += 1;
  quiz_current_streak += 1;
  if (quiz_longest_streak<quiz_current_streak){
    quiz_longest_streak = quiz_current_streak;
  }
  let quiz_answer_div = document.getElementById("quiz_answer");
  let quiz_no_div = document.getElementById("quiz_no");
  quiz_answer_div.style.animation = 'none';
  quiz_no_div.style.animation = 'none';
  if (sound_enabled===true){
    play_jingle();
  }
  if (adaptive_difficulty_enabled==true){
    quiz_difficulties[current_quiz] += 7.5 + 5*quiz_streaks[current_quiz]; // The difficulties of each type of question
    if (quiz_difficulties[current_quiz] > 100) quiz_difficulties[current_quiz] = 100.0;
    quiz_streaks[current_quiz] += 1; // The streak for this type of question.
  }
  add_to_quiz_timeline(1);
  confetti_defaults.origin.x = mouseX / windowWidth;
  confetti_defaults.origin.y = mouseY / windowHeight;
  shoot_confetti();
  setTimeout(next_quiz, 50); // Make sure that the star animation starts rolling before updating graphs for the next quiz question.
}

function add_to_quiz_timeline (correct) {
  let date_now = new Date();
  let now = date_now.getTime();
  let time_diff = now-quiz_started_at;
  let mseconds_elapsed = Math.floor(time_diff);
  let this_answer = {};
  this_answer["t"] = mseconds_elapsed/1000;
  let difficulty_mean=0;
  for (let question_no in quiz_questions){
    difficulty_mean += quiz_difficulties[quiz_questions[question_no]];
  }
  let quiz_result = difficulty_mean/quiz_questions.length;
  this_answer["r"] = quiz_result;
  this_answer["q"] = quiz_questions.indexOf(current_quiz); // The type of question, numbered by "quiz_questions" list
  this_answer["a"] = correct;
  quiz_timeline.push(this_answer);
}

function show_quiz_wrong_text(text){
  // Trigger an animation with the text:
  let quiz_answer_div = document.getElementById("quiz_answer");
  quiz_answer_div.innerHTML=text;
  let left = (100*mouseX/windowWidth) + 1;
  if (left > 75) left = 75;
  document.querySelector('.quiz_answer').style.setProperty('--left',left+"%");
  document.querySelector('.quiz_no').style.setProperty('--left',left+"%");
  let top = (100*mouseY/windowHeight);
  if (top > 84) top = 84;
  if (top < 3) top = 3;
  document.querySelector('.quiz_answer').style.setProperty('--top',top+"%");
  document.querySelector('.quiz_no').style.setProperty('--top',top+"%");
  let quiz_no_div = document.getElementById("quiz_no");
  // Order of the animation parameters:
  //  animation-name: example;
  //  animation-duration: 5s;
  //  animation-timing-function: linear;
  //  animation-delay: 2s;
  //  animation-iteration-count: infinite;
  //  animation-direction: alternate;
  quiz_answer_div.style.animation = 'none';
  quiz_answer_div.offsetHeight; /* trigger reflow */
  quiz_answer_div.style.animation="QuizAnim 12s ease-in-out 0s 1";
  quiz_no_div.style.animation = 'none';
  quiz_no_div.offsetHeight; /* trigger reflow */
  quiz_no_div.style.animation="QuizAnim2 12s ease-out 0s 1";
}

function quiz_perhaps (why_its_almost_wrong){
  show_quiz_wrong_text(why_its_almost_wrong);
}

function quiz_incorrect (why_its_wrong){
  add_event("quiz_incorrect");
  quiz_current_streak = 0;
  quiz_streaks[current_quiz] = 0; // The streak for this type of question.
  if (adaptive_difficulty_enabled==true){
    quiz_difficulties[current_quiz] -= 20.0; // The difficulties of each type of question
    if (quiz_difficulties[current_quiz] < 0) quiz_difficulties[current_quiz] = 0.0;
  }
  quiz_nof_tries += 1;
  add_to_quiz_timeline(0);
  show_quiz_wrong_text(why_its_wrong);
  update_quiz(); // Show the new difficulty level
}

function toggle_adaptive_difficulty(event){
  adaptive_difficulty_enabled = event.checked;
}

function select_quiz_type(event){
  let quiz_type = event.target.id;
  if (event.target.checked){
    enabled_quiz_types[quiz_type]=true;
  } else {
    enabled_quiz_types[quiz_type]=false;
  }
  next_quiz();
  update_quiz();
}

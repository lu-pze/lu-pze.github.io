'use strict';

// ----------------------
// Quiz
let quiz_enabled = false;

const quiz_questions=['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];
let current_quiz = "none";

let quiz_nof_done = 0;
let quiz_nof_tries = 0;
let quiz_current_streak = 0;
let quiz_longest_streak = 0;
let quiz_nof_correct = 0;

let quiz_no = 0;
let quiz_freq = 0;
let quiz_time_to_click = 0;
let quiz_nyquist_angle_to_click = -1;
let quiz_system_to_click = -1;
let quiz_click_wrong = -1;
let quiz_questions_nof_done={};

// lu-pze quiz Difficulty level:
// Kindergarten - elementary school - high school - University - PhD candidate - PhD student - Professor
//     12.5             25              37.5            50           62.5           75           87.5
//             18.75              31.25         43.75        56.25           68.75         81.25
let quiz_difficulty=50.0; // The average difficulty, the one shown in the slider
let quiz_difficulties={}; // The difficulties of each type of question
let quiz_streaks={}; // The streak for this type of question.
let adaptive_difficulty_enabled = true;
let enabled_quiz_types={};


function toggle_quiz_enabled(event){
  if (current_quiz!="none"){
    stop_quiz();
  }
  if (quiz_enabled == false){
    quiz_enabled = true;
    let quiz_icon = document.getElementById("quiz_icon");
    quiz_icon.style.display = "inline";
  } else {
    quiz_enabled = false;
    let quiz_icon = document.getElementById("quiz_icon");
    quiz_icon.style.display = "none";
  }
}

function toggle_quiz(){
  if (current_quiz=="none"){
    start_quiz();
  } else {
    stop_quiz();
  }
}

let nof_quiz_started = 0;
let quiz_start_time = null;
let quiz_timer_div;
let quiz_is_running = 0; //0:not_started, 1:running, 2:ended
let quiz_seconds_left = -1;
let quiz_compete = false;
let quiz_practice = false;

function quiz_countdown (){
  if (quiz_is_running==1) {
    quiz_seconds_left -= 1;
    if (quiz_seconds_left < 0) {
      quiz_seconds_left = 0;
      quiz_is_running = 2;
      quiz_time_is_up();
    } else {
      quiz_timer_div.innerHTML="Time left: " + quiz_seconds_left + "s";
      setTimeout(quiz_countdown, 1000);
    }
  }
}

let quiz_experience = 50;
function set_quiz_experience (event) {
  quiz_experience = +(event.value);
  add_event("set_quiz_experience="+event.value);
}

function set_nickname(event) {
  client_nick = event.value.replace(/[^A-ZÅÄÖa-zåäö0123456789]/g, '_')
  add_event("set_quiz_nickname="+client_nick);
}

function init_quiz (){
  quiz_nof_done = 0;
  quiz_nof_tries = 0;
  quiz_current_streak = 0;
  quiz_nof_correct = 0;
  for (let question in quiz_questions){
    quiz_streaks[quiz_questions[question]] = 0;
    quiz_questions_nof_done[quiz_questions[question]]=0;
  }
}

function start_quiz (){
  quiz_is_running = 1;
  quiz_longest_streak = 0;
  if (splash_screen_active){
    remove_splash_screen();
  }
  achievement_done("start_quiz");
  // Remove the "Take the initial quiz"-text:
  let welcome_text=document.getElementById("welcome_text");
  welcome_text.innerHTML='';
  remove_all_windows();
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill=null;
  removeAllGraphs();
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.add('active');
  let toggleElement2 = document.querySelector('.quiz_highscores');
  toggleElement2.classList.add('active');
  read_highscores();
  try {
    // The nickname text input is only shown in the initial quiz window.
    // So, this might fail, hence the "try":
    let nickname_input_element = document.getElementById("nickname");
    nickname_input_element.focus();
  } catch (e) {}
  add_event("view_quiz");
}

function quiz_lets_go_compete (){
  if (client_nick == "") {
    add_event("tried_start_quiz_compete_but_no_nickname");
    let nickname_area = document.getElementById("nickname_area");
    nickname_area.style.background = "#ff0000";

    return;
  }
  add_event("start_quiz_compete");
  quiz_compete = true;
  quiz_practice = false;
  quiz_is_running = 1;
  removeAllGraphs();
  quiz_nof_done = 0;
  quiz_nof_tries = 0;
  quiz_current_streak = 0;
  quiz_longest_streak = 0;
  quiz_nof_correct = 0;
  quiz_difficulty = 50;
  add_event("set_difficulty_level=50");
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
  quiz_lets_go();
}

function quiz_lets_go_practice (){
  add_event("start_quiz_practice");
  quiz_compete = false;
  quiz_practice = true;
  quiz_lets_go();
}

// This is a list of answers during the quiz:
let quiz_timeline = [];
let quiz_started_at = null;

function quiz_lets_go (){
  quiz_timeline = [];
  let start_date = new Date();
  quiz_started_at = start_date.getTime();
  quiz_is_running = 1;
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  let toggleElement2 = document.querySelector('.quiz_highscores');
  toggleElement2.classList.remove('active');

  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill="#5050ff";

  quiz_timer_div = document.getElementById("quiz_timer");
  quiz_seconds_left = 90;
  quiz_timer_div.innerHTML="Time left: " + quiz_seconds_left + "s";

  setTimeout(quiz_countdown, 1000);
  nof_quiz_started += 1;
  current_assignment="none";
  removeAllGraphs();
  quiz_no=0;
  next_quiz();
  update_quiz();
}

function next_quiz (){
  let quiz_text = document.getElementById("quiz_text");

  removeAllGraphs();

  // First count the enabled quiz_types. If there are fewer than two, simply select the only chosen quiz_type.
  let nof_enabled=0;
  let the_only_enabled_quiz_type="";
  for (let question_no in quiz_questions){
    if (enabled_quiz_types[quiz_questions[question_no]]){
      nof_enabled+=1;
      the_only_enabled_quiz_type=quiz_questions[question_no];
    }
  }
  if (nof_enabled == 1){
    current_quiz = the_only_enabled_quiz_type;
  } else {
    // If there are no enabled quiz_types, all quiz_types should be enabled:
    let quiz_type_enabled_should_be=true;
    if (nof_enabled==0){
      quiz_type_enabled_should_be=false;
    }

    // Randomize where we will pick assignments from.
    // The first round should pick every type of question once.
    // After that, let's pick questions that has lower level,
    //  which probably is something the user needs to practice.

    let quiz_possible_questions={};
    if (quiz_no < nof_enabled){
      // We shall pick "not yet used" questions:
      for (let question_no in quiz_questions){
        let question_id = quiz_questions[question_no];
        if (enabled_quiz_types[question_id]==quiz_type_enabled_should_be){
          if (quiz_questions_nof_done[question_id]==0){
            quiz_possible_questions[question_id]=1; // All should be similar numbers, to make picking any of them equally likely
          }
        }
      }
    } else {
      for (let question_no in quiz_questions){
        let question_id = quiz_questions[question_no];
        if (enabled_quiz_types[question_id]==quiz_type_enabled_should_be){
          if (question_id != current_quiz){
            quiz_possible_questions[question_id]= (104 - quiz_difficulties[question_id]) / 104; // Almost a "probability" for getting picked
          }
        }
      }
    }

    // Now pick randomly from the quiz_possible_questions array.

    // Calculate the "total probability" for all the values in the dict
    let total_probability = 0;
    for (let question_id in quiz_possible_questions) {
      total_probability += quiz_possible_questions[question_id];
    }
    // Generate a random number between 0 and total_probability
    let random_num = Math.random() * total_probability;
    // Iterate through the dictionary again to find the selected item
    let cumulative_probability = 0;
    let next_question_id="";
    for (let question_id in quiz_possible_questions){
      cumulative_probability += quiz_possible_questions[question_id];
      if (random_num <= cumulative_probability){
        next_question_id = question_id;
        break;
      }
    }
    current_quiz = next_question_id;
  }
  quiz_questions_nof_done[current_quiz]+=1;
  add_event("next_quiz="+current_quiz);

  if (current_quiz=="click_freq"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_freq;
    if (level < 6){
      quiz_freq = 0;
      quiz_text.innerHTML="Click on any of the Bode plots to the left";
    } else if (level < 17){
      if (last_value != -1){
        quiz_freq = -1;
        quiz_text.innerHTML="Click on the Bode magnitude plot";
      } else {
        quiz_freq = -2;
        quiz_text.innerHTML="Click on the Bode phase plot";
      }
    } else if (level < 40){
      while(quiz_freq==last_value){
        let decimal = 1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    } else if (level < 75){
      while(quiz_freq==last_value){
        let decimal = Math.floor(Math.random()*4)+1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    } else {
      while(quiz_freq==last_value){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*5)-2;
        quiz_freq=decimal * Math.pow(10,power);
      }
      quiz_text.innerHTML="Click on the frequency " + quiz_freq.toFixed(2) + " rad/s";
    }

  } else if (current_quiz=="click_time"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_time_to_click;
    if (level < 6){
      quiz_time_to_click = -1;
      quiz_text.innerHTML="Click on the Step input response graph. It has time on the horizontal axis.";
    } else if (level < 40){
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(Math.random()*10);
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(0) + " seconds in the Step input response graph";
    } else if (level < 70){
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(100*Math.random())/10.0;
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(1) + " s";
    } else {
      while(quiz_time_to_click==last_value){
        quiz_time_to_click = Math.round(1000*Math.random())/100.0;
      }
      quiz_text.innerHTML="Click on the time " + quiz_time_to_click.toFixed(2) + " s";
    }

  } else if (current_quiz=="click_nyquist_angle"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_nyquist_angle_to_click;
    if (level < 6){
      quiz_nyquist_angle_to_click = 1000;
      quiz_text.innerHTML="Click on the Nyquist diagram. It has a unit circle, and the critical point -1 is at the left edge of the unit circle.";
    } else if (level < 20){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = -90 * (Math.floor(Math.random()*3));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else if (level < 40){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - 90 * (Math.floor(Math.random()*5));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else if (level < 70){
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - 45 * (Math.floor(Math.random()*9));
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    } else {
      while (quiz_nyquist_angle_to_click==last_value){
        quiz_nyquist_angle_to_click = 90 - Math.floor(Math.random()*360);
      }
      quiz_text.innerHTML="Click on the angle " + quiz_nyquist_angle_to_click.toFixed(0) + "° in the Nyquist diagram";
    }

  } else if (current_quiz=="click_system"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_system_to_click;
    // Randomize the colors of the graphs:
    next_graph_no_to_add=Math.floor(Math.random()*5);
    id_bank=next_graph_no_to_add;
    // Add some graphs:

    // Add ghost graphs:
    // The name tells where this formula will be shown:
    // GhostMPTNIE_Displayed name
    //      M      = shows up in Bode magnitude plot
    //       P     = shows up in Bode phase plot
    //        T    = shows up in Bode time response plot
    //         N   = shows up in Nyquist diagram
    //          I  = shows up in information tab
    //           E = shows up in Equations
    let name_prefix="";
    let name_prefix2="";
    let name_prefix4="";
    if (level < 30){
      name_prefix="GhostMPTNIE_";
      name_prefix2="GhostMPTNIE_";
      name_prefix4="GhostMPTNIE_";
    } else if (level < 60){
      let r = Math.random();
      if (r<0.33) name_prefix="GhostMP...._";
      else if (r<0.67) name_prefix="Ghost..TN.._";
      else name_prefix="GhostM.T..._";
      name_prefix2=name_prefix;
      name_prefix4=name_prefix;
    } else if (level < 90){
      let r = Math.random();
      if (r<0.33) name_prefix="GhostM....._";
      else if (r<0.67) name_prefix="Ghost.P...._";
      else name_prefix="Ghost..T..._";
      name_prefix2=name_prefix;
      name_prefix4=name_prefix;
    } else {
      let r = Math.random();
      if (r<0.33){
        name_prefix="GhostM....._";
        name_prefix2="Ghost.P...._";
        name_prefix4="Ghost..T..._";
      } else if (r<0.67){
        name_prefix2="GhostM....._";
        name_prefix4="Ghost.P...._";
        name_prefix="Ghost..T..._";
      } else {
        name_prefix4="GhostM....._";
        name_prefix="Ghost.P...._";
        name_prefix2="Ghost..T..._";
      }
    }

    let k = 0.5 + 3.5 * Math.random();
    if (level > 70){
      if (Math.random() < 0.5) k = -k;
    }
    let t = 1;
    if (level > 30){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = Math.floor(Math.random()*2)-1;
      t = 1 / (decimal * Math.pow(10,power));
    }
    addNewGraph(null, {name:name_prefix+"", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});

    let r = Math.random();
    if (r<0.25)      addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{0.5}{1+2s+s^2}", formula:"0.5/(1+2s+s^2)"});
    else if (r<0.5)  addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{1}{(1+5s)(1+0.05s)}", formula:"1/(1+5s)*1/(1+0.05s)"});
    else if (r<0.75) addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{8^2}{s^2+2*0.05*8*s+8^2}", formula:"8^2/(s^2+2*0.05*8*s+8^2)"});
    else             addNewGraph(null, {name:name_prefix2+"", mf:"\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}", formula:"0.7*2^2/(s^2+2*0.7*2*s+2^2)"});

    let k4 = 0.5 + 3.5 * Math.random();
    if (level > 70){
      if (Math.random() < 0.5) k4 = -k4;
    }
    let t4 = 1;
    if (level > 80){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = Math.floor(Math.random()*2);
      t4 = 3 / (decimal * Math.pow(10,power));
    } else if (level > 30){
      let decimal = Math.floor(Math.random()*9)+1;
      let power = 0;
      t4 = 3 / (decimal * Math.pow(10,power));
    }
    addNewGraph(null, {name:name_prefix4+"", mf:"\\frac{"+k4+"}{(1+"+t4+"s)^4}", formula:k4+"/((1+"+t4+"s)^4)"});

    if (level > 95){
      if (Math.random() < 0.33){
        //Select Dirac impulse for time responses
        //updateInputFormulaFromList()
        input_formula = "1";
        let input_equation = document.getElementById("input-formula");
        input_equation.value = "1";
        let i2 = document.getElementById("input-choices");
        i2.value = "Impulse";
      }
    }

    while (quiz_system_to_click==last_value){
      quiz_system_to_click = Math.floor(Math.random()*3)+1;
    }
    if (quiz_system_to_click==1) quiz_text.innerHTML="Click a first-order system";
    else if (quiz_system_to_click==2) quiz_text.innerHTML="Click a second-order system";
    else quiz_text.innerHTML="Click a fourth-order system";


  } else if (current_quiz=="click_wrong"){
    let level=quiz_difficulties[current_quiz];
    add_event("level="+level);
    let last_value=quiz_click_wrong;
    // Control the colors of the graphs:
    let graph_color=Math.floor(5*Math.random());
    next_graph_no_to_add=graph_color;
    id_bank=next_graph_no_to_add;
    // Add ghost graphs:
    // The name tells where this formula will be shown:
    // GhostMPTNIE_Displayed name
    //      M      = shows up in Bode magnitude plot
    //       P     = shows up in Bode phase plot
    //        T    = shows up in Bode time response plot
    //         N   = shows up in Nyquist diagram
    //          I  = shows up in information tab
    //           E = shows up in Equations
    while (quiz_click_wrong==last_value){
      quiz_click_wrong=Math.floor(Math.random()*4);
    }
    add_event("quiz_click_wrong="+quiz_click_wrong);
    // What kind of system is a correct one?
    let correct_system_order=1;
    let wrong_system_order=1;
    if (level>40){
      if (Math.random()<0.5){
        correct_system_order=2;
        wrong_system_order=2;
      }
    }
    if (level>90){
      if (Math.random()<0.4){
        wrong_system_order=3-wrong_system_order;  // 2->1  and 1->2
      }
    }

    if (quiz_click_wrong==0){
      // Let's make the Bode magnitude plot wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*3)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"Ghost.PTN.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.PTN.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      if (Math.random() < 0.5){
        // Let's make k/w wrong:
        if (level < 50){
          if (Math.random() < 0.5) k=k*(8+14*Math.random());
          else k=k/(8+14*Math.random());
        } else {
          if (Math.random() < 0.5) k=k*(2+40*Math.random());
          else k=k/(2+40*Math.random());
        }
        if (Math.random()<0.5) w=w/(10+14*Math.random());
        else w=w*(10+14*Math.random());
      } else {
        // Let's make t/z wrong:
        if (Math.random() < 0.5) t=t*(18+14*Math.random());
        else t=t/(18+14*Math.random());
        if (Math.random()<0.5) z=z/(10+14*Math.random());
        else z=z*(10+14*Math.random());
      }
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostM....._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }


    } else if (quiz_click_wrong==1){
      // Let's make the Bode phase plot wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostM.TN.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostM.TN.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make t/w wrong:
      if (Math.random() < 0.5) t=t*(18+14*Math.random());
      else t=t/(18+14*Math.random());
      if (Math.random()<0.5) w=w/(10+14*Math.random());
      else w=w*(10+14*Math.random());

      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost.P...._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }


    } else if (quiz_click_wrong==2){
      // Let's make the Step input response wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostMP.N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostMP.N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make k and z and w wrong:
      if (level < 50){
        if (Math.random() < 0.5) k=k*(8+14*Math.random());
        else k=k/(8+14*Math.random());
      } else {
        if (Math.random() < 0.5) k=k*(2+40*Math.random());
        else k=k/(2+40*Math.random());
      }
      if ((level > 80) && (Math.random()<0.5)) k=-k;
      if (Math.random()<0.5) w=w/(10+14*Math.random());
      else w=w*(10+14*Math.random());
      if (Math.random()<0.5) z=z/(10+14*Math.random());
      else z=z*(10+14*Math.random());
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;

      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost..T..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

    } else {
      // Let's make the Nyquist diagram wrong
      let k = 0.5 + 3.5 * Math.random();
      if (level > 70){
        if (Math.random() < 0.5) k = -k;
      }
      let t = 1;
      if (level > 30){
        let decimal = Math.floor(Math.random()*9)+1;
        let power = Math.floor(Math.random()*2)-1;
        t = 1 / (decimal * Math.pow(10,power));
      }
      let z=2.0*Math.random();
      let w=0.4+4.0*Math.random();
      if (correct_system_order==1){
        addNewGraph(null, {name:"GhostMPT..._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"GhostMPT..._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }

      // Let's make k/z wrong:
      if (Math.random() < 0.5) k=k*(3+6*Math.random());
      else k=k/(3+6*Math.random());
      if (Math.random()<0.5) z=z/(10+14*Math.random());
      else z=z*(10+14*Math.random());
      next_graph_no_to_add=graph_color;
      id_bank=next_graph_no_to_add;
      if (wrong_system_order==1){
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"}{1+"+t+"s}", formula:"("+k+")/((1+"+t+"s))"});
      } else {
        addNewGraph(null, {name:"Ghost...N.._", mf:"\\frac{"+k+"*("+w+")^2}{s^2+2*("+z+")*("+w+")*s+("+w+")^2}", formula:k+"*("+w+")^2/(s^2+2*("+z+")*("+w+")*s+("+w+")^2)"});
      }
    }
    quiz_text.innerHTML="Click on the wrong graph";


  } else {
    console.log("ERROR, the current_quiz was a value I don't handle:" + current_quiz);
  }
  quiz_no+=1;

  quiz_text.style.animation = 'none';
  quiz_text.offsetHeight; /* trigger reflow */
  quiz_text.style.animation="quiz_fade_repeat 7s ease-out infinite";

  let quiz_text_norepeat = document.getElementById("quiz_text_norepeat");
  quiz_text_norepeat.style.animation = 'none';
  quiz_text_norepeat.offsetHeight; /* trigger reflow */
  if (light_mode == "dark") {
    quiz_text_norepeat.style.color="#bfbfffc0";
    quiz_text_norepeat.style.animation="quiz_fade 1s ease-out 1";
    quiz_text_norepeat.style.textShadow="10px 10px 40px #000000ff";
  } else {
    quiz_text_norepeat.style.color="#202080c0";
    quiz_text_norepeat.style.animation="quiz_fade_light_mode 1s ease-out 1";
    quiz_text_norepeat.style.textShadow="10px 10px 40px #ffffffff";
  }

  add_event("quiz_text="+quiz_text.innerHTML);
  redraw(); // Needed to get the title of the Dirac Impulse response correct
}

let cap_grade=0;

function update_quiz (){
  if (current_quiz == "none") return;
//  let difficulty_geom=1;
//  for (let question_no in quiz_questions){
//    difficulty_geom *= (100-quiz_difficulties[quiz_questions[question_no]]);
//  }
//  quiz_difficulty = 100 - Math.pow(difficulty_geom,1.0/(quiz_questions.length));

  let difficulty_mean=0;
  for (let question_no in quiz_questions){
    difficulty_mean += quiz_difficulties[quiz_questions[question_no]];
  }
  quiz_difficulty = difficulty_mean/quiz_questions.length;

  let new_cap_grade=0;
  if (quiz_difficulty<70){
    new_cap_grade=0; // Black
  } else if (quiz_difficulty<80){
    new_cap_grade=1; // Bronze
  } else if (quiz_difficulty<98){
    new_cap_grade=2; // Silver
  } else {
    new_cap_grade=3; // Gold
  }
  if (new_cap_grade != cap_grade){
    let cap_0 = document.getElementById("cap_0");
    cap_grade=new_cap_grade;
    cap_0.src = "images/cap_"+new_cap_grade+".webp";
    cap_0.style.animation = 'none';
    cap_0.offsetHeight; /* trigger reflow */
    cap_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let cap_0_text = document.getElementById("cap_0_text");
  cap_0_text.innerHTML = quiz_difficulty.toFixed(0) + "/100&nbsp";

  let task_div=document.getElementById("task_list");
  let s = "";
  s += '<center><svg width="34" height="34" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_school"/></svg>&nbsp;&nbsp;<b>Quiz time!</b></center><br>';

  s += "So far, you've got " + quiz_nof_correct + " correct answers,<br>";
  s += "with a streak of " + quiz_current_streak + " immediately correct answers.<br>";
  s += "You've answered " + quiz_nof_done + " questions in " + (quiz_nof_tries) + " tries";
  if(quiz_nof_done > 0) s += ",<br>which is a " + (100*quiz_nof_done/quiz_nof_tries).toFixed(2) + "% accuracy.<br>";
  else s += ".<br>";
  s += "Longest streak so far " + quiz_longest_streak + ".";
  if (quiz_longest_streak == 0) s+= " Better get started!";
  else if (quiz_longest_streak <= 3) s+= " Nice going!";
  else if (quiz_longest_streak <= 6) s+= " You're doing good!";
  else if (quiz_longest_streak <= 9) s+= " You deserve a longer streak - go and make one!";
  else s+= " Keep it up, Legend!";
  s += "<br>";

  s +='<div class="quiz-container">';
  s +='<input type="range" min="0" max="100" step="0.01" class="quiz-slider" id="difficulty_level" value="' + quiz_difficulty + '" style="width:100%" onchange="set_difficulty_level(this);next_quiz();"';
  if (debug_mode == false) {
    s += " disabled";
  }
  s += '>';
  s +='<div class="quiz-labels">';
  s +='<label for="0"></label>';
  s +='<label for="12.5">&nbsp;Novice</label>';
  s +='<label for="25"></label>';
  s +='<label for="37.5"></label>';
  s +='<label for="50">&nbsp;Intermediate</label>';
  s +='<label for="62.5"></label>';
  s +='<label for="75"></label>';
  s +='<label for="87.5">&nbsp;Professor</label>';
  s +='<label for="100"></label>';
  s +='</div>';
  s +='<center>';

  if (debug_mode==true) {
    s +='<input type="checkbox" id="adaptive_difficulty" ';
    if (adaptive_difficulty_enabled==true){
      s +='checked ';
    }
    s +='onchange="toggle_adaptive_difficulty(this);"><label for="adaptive_difficulty">Adaptive difficulty level</label>';
  }

  s +='</center>';
  s +='</div>';

  if (debug_mode==true) {
    s += '<br><br><span style="color:#808080">Your stats:</span><br>';
    for (let question in quiz_questions){
      s += "<input type='checkbox' name='quiz_type' id='"+quiz_questions[question]+"' value='"+quiz_questions[question]+"' onchange='select_quiz_type(event);'";
      if (enabled_quiz_types[quiz_questions[question]]==true){
        s+=" checked";
      }
      s+="><label for='"+quiz_questions[question]+"'>";

      s += '<span style="color:#808080">' + quiz_questions[question] + ": " + quiz_difficulties[quiz_questions[question]].toFixed(1) + "</span><br>";
      s += "</label>";
    }
    s += '<span style="color:#808080">Total: ' + quiz_difficulty.toFixed(1) + "</span><br>";
  }

  task_div.innerHTML = s;
}

function stop_quiz (){
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  let toggleElement2 = document.querySelector('.quiz_highscores');
  toggleElement2.classList.remove('active');
  add_event("hide_quiz");
  quiz_is_running = 0;
  quiz_timer_div = document.getElementById("quiz_timer");
  quiz_timer_div.innerHTML="";
  add_event("stop_quiz");
  restart_lupze();
}

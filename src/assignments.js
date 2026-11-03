'use strict';

// ----------------------
// Assignments

let assignments_enabled = false;
let current_assignment = "none";

function toggle_assignments (event){
  if (assignments_enabled == false){
    assignments_enabled = true;
    let show_assignments_icon = document.getElementById("show_assignments");
    show_assignments_icon.style.display = "inline";
  } else {
    assignments_enabled = false;
    let show_assignments_icon = document.getElementById("show_assignments");
    show_assignments_icon.style.display = "none";
  }
}

function view_assignments (event){
  add_event("view_assignments");
  achievement_done("view_assignments");
  remove_all_windows();
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.add('active');
  update_assignments();
}
function hide_assignments (event){
  add_event("hide_assignments");
  remove_all_windows();
}

function task_done (which_one){
  if (quiz_is_running>0) return;
  if (assignments_enabled==true){
    if (all_assignments[current_assignment].tasks.includes(which_one)){
      if (!(done_tasks.includes(which_one))){
        // This is a task that hasn't been done before:
        add_event("task_done="+which_one);
        done_tasks.push(which_one);
        // Trigger an animation with the text:
        let achievement_text_div = document.getElementById("achievement_text");
        let assignment_star_div = document.getElementById("assignment_star");
        achievement_text_div.innerHTML=all_tasks[which_one].t;
        let left = (100*mouseX /windowWidth);
        if (left > 85) left = 85;
        let top = (100*mouseY/windowHeight);
        if (top > 90) left = 90;
        document.querySelector('.achievement_text').style.setProperty('--left',left+"%");
        document.querySelector('.achievement_text').style.setProperty('--top',top+"%");
        document.querySelector('.assignment_star').style.setProperty('--left',left+"%");
        document.querySelector('.assignment_star').style.setProperty('--top',top+"%");
        achievement_text_div.style.animation = 'none';
        achievement_text_div.offsetHeight; /* trigger reflow */
        achievement_text_div.style.animation="MoveToStar4 7s ease-in-out 0s 1";
        assignment_star_div.style.animation = 'none';
        assignment_star_div.offsetHeight; /* trigger reflow */
        assignment_star_div.style.animation="MoveToStar3 8s ease-out 0s 1";
        if (sound_enabled==true){
          play_jingle();
        }
        // Let the menu star wiggle a little:
        let menu_assignment_div = document.getElementById("show_assignments");
        menu_assignment_div.style.animation = 'none';
        menu_assignment_div.offsetHeight; /* trigger reflow */
        menu_assignment_div.style.animation="MenuAssignment 4s ease-out 0s 1";
        update_assignments();
        update_tasks();

        //And, if this happens to be a task in an assignment, and there is an answer text,
        //display that answer text with a close button.
        if (all_tasks[which_one]!=null){
          if (all_tasks[which_one].a!=null){
            console.log(which_one);
            show_answer_to_task(which_one);
          }
        }
      }
    }
  }
}

function reset_task(task_to_reset){
  let index = done_tasks.indexOf(task_to_reset);
  if (index !== -1) {
    // We found it. Remove it:
    done_tasks.splice(index, 1);
  }
  update_tasks();
}

const all_assignments={
  "one_pole":{t:"1. Investigate a system with <b>one pole</b>",tasks:["T1=2","k1=2.9","T1_k1_bode","T1_pole=-2","T1_unstable"],info:"A system with <b>one pole</b> is one of the fundamental system responses, where high frequencies are attenuated."},
  "two_real_poles":{t:"2. Investigate a system with <b>two real poles</b>",tasks:["T2,T3=0.05_and_5","T2,T3=1,k2=0.5","T2=10,T3=0.5","phasemargin=55","gaincrossover=3"],info:"When combining <b>two real poles</b>, the Bode phase response goes all the way to -180°."},
  "two_complex_poles":{t:"3. Investigate a system with <b>two complex poles</b>",tasks:["w=0.9,z=0.0","w=1.6,z=0.2","w=8,z=0.05,k_3=1","w=2,z=0.7,k3=0.7"],info:"A set of <b>two complex poles</b> will make the system's time response oscillate."},
  "time_delay":{t:"4. Investigate a system with <b>time delay</b>",tasks:["L=3","L_gain_margin=2"],info:"A system with <b>time delay</b> is more difficult to control."},
  "one_zero_two_poles":{t:"5. Investigate a system with <b>one zero two poles</b>",tasks:["k4=1,T6=2.5,T7=1,T8=6","k4=0.75,T6=9.25,T7=0.5,T8=2","k4,T6,T7=1,T8=1.5_poles"],info:"With <b>one zero and two poles</b>, the phase response and the critical magnitude at -180 degrees needs to be considered when using a feedback loop."},
  "four_poles":{t:"6. Investigate a system with <b>four poles</b>",tasks:["gainm=5_phasex=2","phasemargin=45"],info:"A system with <b>four poles</b> gets a lot more phase shift, with a larger spin in the Nyquist diagram."},
  "pid_controller":{t:"7. Investigate a <b>PID controller</b> and <b>one pole</b>",tasks:["pid_help_PID","pid_help_YR","PID_(K>1)","PID_(T_i)>(T_1)","PID_(T_d!=0)","PID_(Td=0,T_1=1)","PID_(k_1)"],info:"This assignment is about using a PID controller with a first-order system."},
  //"pid_controller_S":{t:"8. EXPERIMENTAL: <b>PID controller</b> and <b>sensitivity</b>",tasks:["pid_help_PID","pid_help_YR","pid_help_S"],info:"WE'RE WORKING ON IT. Don't expect anything to make sense here right now. This assignment will be about understanding the sensitivity function. / Frida & Pex"},
  "pid_controller_YL":{t:"8. Investigate a <b>PID controller</b> and <b>load</b>",tasks:["pid_help_PID","pid_help_YR","pid_help_YL","PID_Load"],info:"This assignment is about using a PID controller with a load."},
  //"pid_controller_OL":{t:"10.EXPERIMENTAL: <b>PID controller</b> and <b>open-loop</b>",tasks:["pid_help_PID","pid_help_OPEN"],info:"WE'RE WORKING ON IT. Don't expect anything to make sense here right now. This assignment will be about understanding the open-loop transfer function when using a PID controller with a first-order system. / Frida & Pex"},
  "none":{t:"...<b>no assignment</b>",tasks:["impossible"],info:""},
};
let done_assignments={};

const all_tasks={
//t: is the text that appears in the task, on screen, directly.
//a: is the hint question that comes up when you right click on the task text on screen.
//placement: is where the explaining hint comes up when the task was completed, to avoid covering the part of the screen that the hint/solution tries to explain. It can be "none", which means center, then UL, UC, UR, DL, DC, DR. for Up/Down + Left/Center/Right.

//## One pole
//"reference eq in step response(k=0.65, T1=2)"
"T1=2":{t:"Your task is to change T<sub>1</sub> by moving the slider or type in T<sub>1</sub>'s value to make the pole's location -1/2 in the pole-zero map. Can you explain how the pole's location and its time constant are related?",a:"<h2>How is the pole related to the time constant and step resonse of a first order system?</h2>For a first-order system with the given transfer function, the pole is placed in -1/T. The time constant T corresponds to the time it takes for the system to reach 63% of its final value<br><math-field read-only style='vertical-align:bottom;display:inline-block'>y(t) = 1 - e^{-t/T}</math-field><br>By setting t=T, we get<br><math-field read-only style='vertical-align:bottom;display:inline-block'>y(t)= 1-e^{-1}≈0.63</math-field>.<br>The larger value of T we have, the slower the system is. In other words, a system with poles farther away from the origin corresponds to a faster system than a system with poles placed closer to the origin.<h3>Take a few seconds to think about</h3>How are the different representations affected when you change T? Why is the shape of the Nyquist diagram not affected?<h2>Summary</h2>The amplitude of the step response is not affected, but the time constant is given by T. The pole is in s=-1/T, which means that a large time constant gives a pole close to the origin, whereas a short time constant gives a pole far away from the origin. In the Bode diagram, the corner frequency is 1/T, and it thereby varies when T varies. No change is visible in the Nyquist diagram, but the frequency varies along the curve.<br><br>Suppose that we have two processes with different values of T. Then, we can always find two frequencies such that<math-field read-only style='vertical-align:bottom;display:inline-block'>G(i\\omega_1 T_1) = \\frac{K}{1+i\\omega_1 T_1}=G(i\\omega_2 T_2) = \\frac{K}{1+i\\omega_2 T_2}</math-field><br>i.e., all points that are on the first Nyquist curve are also on the second one, but at another frequency."},//. (T1=2)
"k1=2.9":{t:"Your task is to drag the <b>step input response</b> making the static gain of the system 2.9. When will the system reach its static gain?",a:"<h2>When will a system reach its static gain?</h2>The system reaches its static gain when time goes to infinity. For an asymptotically stable system, the static gain from a unit step input is calculated as G(0) as a result of the final value theorem.<h3>Take a few seconds to think about</h3>How are the poles, step response, Nyquist diagram, and Bode diagram affected by changes in K? How can K be determined from the step response, Nyquist diagram, and Bode diagram?<h2>Summary</h2>The amplitude of the step response is affected by K, but not the time constant. The pole is not affected by K. The Nyquist diagram keeps its shape, but each point on the curve moves radially from the origin. In the Bode diagram, the gain curve changes in the y direction while the phase curve is unchanged.<br><br>Since the control signal is a unit step, K is given by the stationary value of the measurement signal in the step response. In the Nyquist diagram, K is given from the starting point on the positive real axis. In the Bode diagram, K is given from the gain curve where &omega; -> 0."},//. (k1=2.9)
"T1_k1_bode":{t:"Save the princess from the dragon by dragging the pole marker in the Bode plots to mimick the orange step response. The princess, as it turns out, will only leave the dragon if you can explain how she can find the <b>static gain</b> in the Bode magnitude plot. Can you save her?",a:"<h2>How can you find the static gain from the Bode plot?</h2>The static gain is found as the value for the low-frequency asymptote G(0). In the Nyquist diagram the static gain is found as the value for where the curve starts at the positive real axis."},// (k=0.65, T1=2)
"T1_pole=-2":{t:"Drag the pole marker in the <b>pole-zero map</b> to make the system four times faster than the orange one. What does it mean to have a faster system?",a:"<h2>What does it mean to have a faster system?</h2>A faster system reacts faster to input changes than a slow system. For a first-order system, it thus also reaches its stationary value faster."},//. (pole in -2)
"T1_unstable":{t:"Make the pole <b>unstable</b>.",a:"<h2>What are the characteristics for an unstable system?</h2>Poles that are placed in the right half plane correspond to an unstable system. An unstable system has an output y(t) that goes to infinity."}, // T_1 < 0

//## Two real poles
//reference in step (T2=T3=1, k2=0.5)
//reference in bode phase (T2=5, T3=0.05, k2=1)
"T2,T3=1,k2=0.5":{t:"Your first subtask is to set k<sub>2</sub>=0.5 exactly, then drag the two pole markers in the <b>pole-zero map</b> to make the step response follow the cyan line. Can you explain how this second-order step response differs from a first-order system?",a:"<h2>How does a second-order step response differs from a first-order system?</h2>A first-order system immediately rises after the step change. A second-order system (and higher-order system) with no zeros is flat in the beginning. In other words, the step response for a second-order system with no zeros has a derivative of zero at time 0.<h3>Take a few seconds to think about</h3>How can G(s) be approximated in the case T<sub>1</sub> >> T<sub>2</sub>?<h2>Summary</h2>When T<sub>1</sub> >> T<sub>2</sub>, the step response is similar to a first order system with T &asymp; T<sub>1</sub>$. The Bode and Nyquist diagrams are also similar to the ones of a first order system for low frequencies. Thus, you can in many cases approximate the transfer function by <math-field read-only style='vertical-align:bottom;display:inline-block'>G(s)=\\frac{K}{(1+sT_1)(1+sT_2)} \\approx \\frac{K}{(1+sT_1)}</math-field>"},//. (T2=T3=1, k2=1)
"T2,T3=0.05_and_5":{t:"Your task is to change T<sub>2</sub> and T<sub>3</sub> to make your Bode phase plot mimick the blue curve in the Bode phase plot. Feel free to change these time constants in whatever way you find suitable.",a:"<h2>How do poles affect the bode plot?</h2>Each pole lowers the phase by 90 degrees in the bode plot. Thus, for a second-order system, the bode plot starts at 0 degrees and ends at -180 degrees."},//. (T2=0.05, T3=5.0)
"T2=10,T3=0.5":{t:"Your task is to drag the pole markers in the Bode plots making the <b>cutoff frequencies</b> in the Bode plot become 0.1 rad/s and 2.0 rad/s. Now, tell me how the cutoff frequencies as seen in the Bode plots are related to the poles' locations in the pole-zero map.",a:"<h2>What is the cutoff frequency?</h2>The cutoff frequency is the frequency at which the Bode curve \"bends\". These frequencies are directly related to the poles' placement."},// (T2=10, T3=0.5 or vice versa)
"phasemargin=55":{t:"Please drag the two pole markers in the Bode diagram to ensure that the <b>Phase margin</b> for the system is 55°. Can you explain how the phase margin can be found in the Nyquist diagram?",a:"<h2>What is the phase margin?</h2>The phase margin tells us how \"far away from the -1 point in the Nyquist diagram the curve is\" if we look at the phase for the frequency where the amplitude is 1. The phase margin is one way to evaluate the robustness of a system."},// (T2=T3=0.5-1.5k k2=7-8 approximately
"gaincrossover=3":{t:"Finally, drag the two pole markers in the Bode diagram to ensure that the <b>gain crossover frequency</b> becomes 3.0 rad/s. But before you go, call your friend and tell them how you can get the gain crossover frequency from a Bode magnitude plot.",a:"<h2>What is the crossover fequency?</h2>The crossover frequency is the frequency for which the amplitude is 1. It's at this frequency the phase margin is found."},// (T2=T3=0.5-1.5k k2=7-8 approximately)

//## Two complex poles
//Step reference (w=2,z=0.7,k=0.7)
//Bode reference (w=8, z=0.05)
"w=1.6,z=0.2":{t:"Drag the pole markers in the <b>pole-zero map</b> so that the resonance frequency w=1.6 and damping factor z=0.2. How does changing w affect the step response of the system? How does changing z affect the step response of the system?",a:"<h2>How does changing w affect the step response of the system?</h2>Complex poles always come in pairs. The w<sub>0</sub> corresponds to the distance between the poles and the origin. Increasing w<sub>0</sub> gives a faster system.<h2>How does changing z affect the step response of the system?</h2>z corresponds to cos(&phi;), where &phi; is the angle between the negative real axis and the pole. Increasing z gives more relative damping to the system and, thus, less oscillations in the system.<h3>Take a few seconds to think about</h3>How are the poles, step response, Nyquist diagram, and Bode diagram affected by changes in &omega;?<h2>Summary</h2>The frequency &omega; affects the speed of the system, but not the shape of the step response. Variations in &omega; moves the poles radially from the origin. In the Bode diagram, &omega; does not affect the shape, but only the location of the corner frequency. The shape of the Nyquist curve is not affected, but the frequencies are moved along the curve."},
"w=0.9,z=0.0":{t:"Move the pole markers in the <b>pole-zero map</b> in such way that the resonance frequency w becomes 0.9 and the damping factor z becomes 0.0. What happens with the system when z is 0? Is the system stable?",a:"<h2>What happens with the system when z is 0? Is the system stable?</h2>When z is 0, there is no relative damping in the system, and the system oscillates forever. This is called <i>a marginally stable system</i>."},
"w=8,z=0.05,k_3=1":{t:"The very evil vampire Dracula is afraid of heights. Save the world by putting Dracula on a high mountain by changing the <b>resonance frequency</b> w, <b>damping factor</b> z and <b>static gain</b> k<sub>3</sub> to make the Bode plots mimick the blue lines. As the Hero<sup>TM</sup> you've now become, tell your admirers the name of the peak. Also, tell the press what could happen if the system has input with this specific frequency.",a:"<h2>What is a resonance peak?</h2>The placement of the resonance peak corresponds to the value of w<sub>0</sub>. The lower z is, the higher the peak is. If the system has an input with that frequency, the system starts to self oscillate, which in the past has resulted in multiple accidents such as bridges that collapse (for example the Tacoma Narrows Bridge in 1940)."},
"w=2,z=0.7,k3=0.7":{t:"Your task is to match the pink step input response. First, set your <b>static gain</b> k<sub>3</sub>. Then, drag the <b>Bode plot</b> to align your system response with the pink step input response. How does the second-order-system step response differ between a system with real poles versus complex poles?",a:"<h2>How does the second-order-system step response differ between a system with real poles versus complex poles?</h2>A system with real poles oscillates before the oscillations are damped. A system with only real poles has no oscillations, and it is a fully damped system."},

//## Time delay
"L=3":{t:"Drag the step input response to change the time delay to 3.0 seconds. What does it mean that a system has a time delay?",a:"<h2>What does it mean that a system has a time delay?</h2>A system with a time delay has a delayed response to the input. In this case, it takes three seconds after the inut is given before anything happens in the system. Once the system reacts, it behaves as an ordinary first-order system (since we, in this case, have a first-order system with a time delay, second-order systems could also have a time delay). As we have discovered in previous assignments, a second-order system without time delay has a derivative of zero at time 0, which means that nothing happens with the system immediately. This is, however, not a time delay; it is simply slow dynamics. A time delay means that the input's effect on the system is delayed. It could, for example, be a signal that takes some time to be transmitted. A system with a time delay could be very hard to control as there is a delay between the input signal and the system reacting to that signal, so you can't control the system faster than the time delay unless you include a simulation model of the system. One example of this is the Otto Smith predictor with a two-loop control structure.<h3>Take a few seconds to think about</h3>What happens with the step response when there is a time delay? Why does the Nyquist curve look like it does? Why is the gain curve of the Bode diagram not affected?<h2>Summary</h2>A variation in L corresponds to a translational movement of the step response. We can not represent a dead time in a singularity diagram. The gain curve in the Bode diagram is not affected, since <math-field read-only style='vertical-align:bottom;display:inline-block'>\\vert e^{-i\\omega L}\\vert=1</math-field>, but the phase is reduced. For each frequency point in the Nyquist diagram, the distance to the origin remains unchanged, but the phase decreases. Since the phase goes towards -&infin; when &omega; -> &infin;, the Nyquist curve has the spiral shape."},
"L_gain_margin=2":{t:"Change the <b>time delay</b> L so that the <b>Gain margin</b> becomes 2.0. Why is there a spiral in the Nyquist diagram?",a:"<h2>Why is there a spiral in the Nyquist diagram?</h2>The spiral is a result of phase loss in a system with a time delay. This can also be seen in the bode diagram as the phase curve goes down to negative infinity."},// (L=0.3)

//## One zero two Poles
//Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
//Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
//Step reference (k4=1,T6=1,T7=1,T8=-1.5)
"k4=1,T6=2.5,T7=1,T8=6":{t:"Your task is to make your Nyquist diagram match up with the green one. <b>Drag the pole and zero markers in the Bode plots</b>, and change k<sub>4</sub> to make the Nyquist curve follow the orange line. Note that there are many combinations of T<sub>6</sub>, T<sub>7</sub>, and T<sub>8</sub> that gives identical Nyquist diagrams but non-similar Bode diagrams. Can you explain why?",a:"<h2>Why are there many combinations of T6, T7, and T8 that gives identical Nyquist diagrams but non-similar Bode diagrams?</h2>The shape of the Nyquist curve comes from how the poles and zeros are placed relative to each other. The frequencies in the bode plot would differ, but that is not visible in the Nyquist curve."},// (k=1,T6=2.5,T7=1,T8=6)
"k4=0.75,T6=9.25,T7=0.5,T8=2":{t:"Change the parameters so that your Bode plots align with the green lines. Can you summarize how a pole and a zero affect the shape of the Bode digrams?",a:"<h2>How do poles and zeros affect the shape of the Bode digrams?</h2>A pole lowers the phase by 90 degrees and reduces the slope of the amplitude curve by 1. A zero increases the phase by 90 degrees and increases the slope of the amplitude curve by 1."},//. (k4=0.75,T6=9.25,T7=0.5,T8=2)
"k4,T6,T7=1,T8=1.5_poles":{t:"With k<sub>4</sub>=1, drag the pole and zero markers in the <b>pole-zero map</b> so that the step response follows the blue line. Why is the step response reversed in the beginning? Is the system stable?",a:"<h2>Why is the step response reversed in the beginning? Is the system stable?</h2>The system is stable since the poles are placed in the left half plane. The zero is placed in the right half plane, which gives a reversed response in the beginning. The stability of a system is determined by the poles. The zeros affect the system's initial response but not its stability.<h3>Take a few seconds to think about</h3>What happens when T<sub>3</sub> < 0? What does this mean if you want to control such a process? Try to explain the phenomenon.<h2>Summary</h2>If the zero is far away from the origin, the representations are not significantly affected. If the zero is negative and is close to the origin, there is a large overshoot in the step response. If the zero is positive and close to the origin, the step response will initially go in the wrong direction. If the zero is positive it will give a positive contribution to the phase.<br><br>When T<sub>3</sub> < 0, e.g., when the zero is in the right half plane, the process is hard to control. You can imagine that it is hard for a controller to act in the right way when a control signal change makes the measurement signal go in the wrong direction initially. The phenomenon could be understood by writing the transfer function in the following way<br><math-field read-only style='vertical-align:bottom;display:inline-block'>G(s)=\\frac{K(1+sT_3)}{(1+sT_1)(1+sT_2)}=\\frac{K}{(1+sT_1)(1+sT_2)}+\\frac{sKT_3}{(1+sT_1)(1+sT_2)}</math-field><br>Thus, the transfer function consists of two terms, one that is the transfer function for a second order system without zeros, and one that is the same transfer function, but multiplied with sT<sub>3</sub>. Thus, the second term is proportional to the derivative of the measurement signal we would have obtained if we did not have any zero. If T<sub>3</sub> < 0, this term will give a negative contribution, which explains that the step response initially goes in the wrong direction."},
//#Four poles
"gainm=5_phasex=2":{t:"Drag the Bode plot so that the <b>Gain margin</b> is 5 and the <b>Phase crossover frequency</b> is 2 rad/s. What practical implication does mean that the Gain margin is 5?",a:"<h2>What is the gain margin?</h2>The gain margin tells how much the system's gain can be changed before the system gets unstable. In this case, the gain can be five times bigger before the system becomes unstable."},// (T5=0.3, k=2)
"phasemargin=45":{t:"Change k<sub>5</sub> so that the <b>Phase margin</b> is 45°. How can you analyze the closed loop system stability from the Nyquist diagram?",a:"<h2>How can you analyze the closed loop system stability from the Nyquist diagram?</h2>The Nyquist diagram is shown for the open loop system. If point -1 is to the left of the Nyquist curve, the closed loop system will be stable. If the -1 point is to the right, the closed-loop system would be unstable."},

//#PID controller
"pid_help_PID":{t:"Read about <b>PID control</b> by right clicking on the G<sub>PID</sub> equation above."},
"pid_help_YR":{t:"Read about the <b>closed-loop response G<sub>YR</sub></b>."},
//"pid_help_S":{t:"Read about the <b>sensitivity function S</b>.",
"pid_help_YL":{t:"Read about the <b>Load disturbance transfer function G<sub>YL</sub></b>."},
//"pid_help_OPEN":{t:"Read about the <b>open-loop formula G<sub>OL</sub></b>.",

// #PID controller and one pole
//Sol: K is increased.
"PID_(K>1)":{t:"<b>Make the closed-loop system faster</b> by changing K while looking at the step response. How does changing the K parameter affect the step response of the closed-loop system?",a:`<h2>What happens when you change the proportional part P in the PID controller?</h2>Changing K affects the speed of the closed-loop system step response. Higher K means a faster step response and that the closed loop poles, not shown in any of the diagrams, are placed further away from the origin in the pole-zero map.`,placement:"DR"},

//Sol: Ti pole is greater than system pole.
"PID_(T_i)>(T_1)":{t:"Change T<sub>i</sub> so that the T<sub>i</sub> pole in the Bode plot (orange) is to the right of the pole for the system (red). How does changing the T<sub>i</sub> parameter affect the Bode plot and step response of the closed-loop system?",a:`<h2>What happens when you change the integrating part T<sub>i</sub> of the PID controller</h2>Including the integrating I part of the PID controller removes the stationary error that we get with only a proportional P-controller. The smaller T<sub>i</sub> is, the more "power" the I-part has. Small T<sub>i</sub> values can result in oscillations and overshoot which we can see on the resonance peak that appears in the Bode plot as well. Large T<sub>i</sub> values, which means "little power to the I-part", results in a step response where it takes a long time for the stationary error to disappear.`},

//Sol: Td != 0
"PID_(T_d!=0)":{t:"Change T<sub>d</sub> and explain the <b>Bode plot of the PID-controller</b>. How are the poles (marked with x) in the bode plot related to the T<sub>i</sub> and T<sub>d</sub> parameters?",a:`<h2>What happens when you change the derivative part T<sub>d</sub> of the PID controller</h2>The "downhill" slope in the Bode plot for the PID controller comes from the I-part of the controller. The slope bends upwards for the value of the pole corresponding to the integrating I-part of the controller, i.e., the T<sub>i</sub> value.<br><br>The "uphill" slope in the Bode plot for the PID controller comes from the derivative D-part of the controller. The slope bends upwards for the value of the pole corresponsing to the D-part of the controller, i.e., the T<sub>d</sub> value. From here one can realise that including the D-part in a PID controller could result in problems with high-frequency noise.<br><br>The "height" of the Bode plot for the PID controller comes from the proportional P-part of the controller. Changing K will lower and raise the curve.`},

//Sol: Change T1.
"PID_(Td=0,T_1=1)":{t:"For any fixed PI controller (T<sub>d</sub>=0). What happens with the closed-loop step response if the system's T<sub>1</sub>-parameter is changed? In other words, what happens if you have a model for a system and design your controller for that model, but then it turns out that T<sub>1</sub> for <b>the actual system differs from the model</b>? Set T<sub>d</sub>=0.0 and T<sub>1</sub> to 1.0.",a:`<h2>What if the model and actual system differs?</h2>If the difference in time constants between the model and the actual system is small, it will not make a large change in control behavior. If the differene between the model and the actual system is large, the closed loop system step response will be very different. This could result in safety issues if the controlled system is a sensitive system.`},

//Sol: k1 changed.
"PID_(k_1)":{t:"Change the k<sub>1</sub> parameter of the system to make the static gain of the closed-loop system anything else than 1. Change k<sub>1</sub> to 0.6.",a:`<h2>What about changing the static gain of the closed-loop transfer function G<sub>YR</sub>?</h2>No. You cannot do that. The reason is that the a static gain of 1.0 in the closed-loop step response means that the desired reference value is followed, which is what the PID controller is designed for. The system's static gain on the other hand show how the system changes when there is a step change in the input to the system. So even though both the system and the closed-loop system has a step change as input, the change is done on different signals: the reference value for the closed-loop system, and the system's input for the system.`},

//Sol: Any PID parameter changed.
"PID_Load":{t:"Can you change any of the PID controller parameters so that the static gain of the load disturbance is not 0? Why is it good thing that the step response for the load disturbance approaches 0.0 and not 1.0, as it does for the closed-loop system?",a:`<h2>What about changing the static gain of a load disturbance G<sub>YL</sub>?</h2>No. You cannot change it. A static gain of 0.0 means that the load disturbance is removed. For a step load disturbance, the PID controller can remove the disturbance. If the load disurbance were to be a ramp input (with a Laplace transform like 1/s^2), the load disturbance can no longer be removed. Try changing the input to a ramp function and see yourself!`},
};
let done_tasks=[];

let nof_assignments_done=0;

function update_assignments (){
  let assignments_box = document.querySelector('.assignments_box');
  let s = "";
  s += '<br><button type="button" class="close-window" onclick="hide_assignments();"><svg width="34" height="34" viewBox="0 0 24 24" fill="#b0b0b0"><use href="#icon_clear"/></svg></button>';
  s += "<center>";
  s += '<svg width="34" height="34" viewBox="0 0 24 24" fill="#000" style="vertical-align:middle"><use href="#icon_assignment"/></svg>';
  s += "&nbsp;Your Assignments";
  s += "</center><br>";

  // Let's see which assignments are done:
  done_assignments = {};
  for (let assignment_id in all_assignments){
    done_assignments[assignment_id]=0;
  }
  for (let task_id in all_tasks){
    if (done_tasks.includes(task_id)){
      // Increase a done counter for the assignments:
      for (let assignment_id in all_assignments){
        if (all_assignments[assignment_id].tasks.includes(task_id)){
          done_assignments[assignment_id]+=1;
        }
      }
    }
  }

  nof_assignments_done=0;
  s += "Please select an assignment:<br>";
  for (let assignment_id in all_assignments){
    if (done_assignments[assignment_id] != all_assignments[assignment_id].tasks.length){
      let long_name = all_assignments[assignment_id].t;
      s += "<input type='radio' name='assignment' id='"+assignment_id+"' value='"+assignment_id+"' onchange='select_assignment(this);'";
      if (current_assignment == assignment_id){
        s+=" checked";
      }
      s+="><label for='"+assignment_id+"'>&nbsp;" + long_name + "</label><br>";
    } else {
      nof_assignments_done+=1;
    }
  }

  s += "<br><b>" + (nof_assignments_done) + "/"+(Object.keys(all_assignments).length-1)+"</b> done so far. ";
  if (nof_assignments_done == 0) s+="Better get started!";
  else if (nof_assignments_done == 1) s+="You're getting up to speed!";
  else if (nof_assignments_done == 2) s+="So get on with the next one!";
  else if (nof_assignments_done == 3) s+="You're halfway there!";
  else if (nof_assignments_done == 4) s+="Good job!";
  else if (nof_assignments_done == 5) s+="You can smell the finish line!";
  else if (nof_assignments_done == 6) s+="You're a legend!";
  s += "<br>";

  if (nof_assignments_done > 0){
    s+="<br>Completed assignments:<br>";
    for (let assignment_id in all_assignments){
      if (done_assignments[assignment_id] == all_assignments[assignment_id].tasks.length){
        let long_name = all_assignments[assignment_id].t;
  //      s += "<input type='checkbox' checked>&nbsp;" + long_name + "<br>";
        s += "<input type='radio' name='assignment' id='"+assignment_id+"' value='"+assignment_id+"' onchange='select_assignment(this);'";
        if (current_assignment == assignment_id){
          s+=" checked";
        }
        s+="><label for='"+assignment_id+"'>&nbsp;" + long_name + "</label><br>";
      }
    }
  }
  s += '<img src="images/explorers_1024.webp" width="384px" style="margin:0;padding:0">';
  assignments_box.innerHTML=s;
}

function remove_all_windows (){
  let toggleElement = document.querySelector('.quiz_intro');
  toggleElement.classList.remove('active');
  let toggleElement4 = document.querySelector('.quiz_highscores');
  toggleElement4.classList.remove('active');
  let toggleElement2 = document.querySelector('.feedback');
  toggleElement2.classList.remove('active');
  let toggleElement3 = document.querySelector('.toolbox');
  toggleElement3.classList.remove('active');
  let toggleElement5 = document.querySelector('.info');
  toggleElement5.classList.remove('active');
  let achievements_box = document.querySelector('.achievements_box');
  achievements_box.classList.remove('active');
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.remove('active');
}

function restart_lupze (){
  add_event("restart_lupze");
  //location.reload();
  disable_questions();
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  current_assignment = "none";
  remove_all_windows();
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill=null;
  quiz_is_running = 0;
  feedback_is_visible=0;
  update_tasks();
  removeAllGraphs();
  next_graph_no_to_add=0;
  id_bank=0;
  // Add the initial startup graphs:
  for(let graph_no=0; graph_no<NOF_GRAPHS_AT_STARTUP; graph_no++){
    let graph_to_add = GRAPH_ORDER[graph_no];
    addNewGraph(null, graph_to_add);
  }
  next_graph_no_to_add = NOF_GRAPHS_AT_STARTUP;
}

function select_assignment (event){
  add_event("select_assignment="+event.value);
  current_assignment = event.value;
  update_tasks();
  removeAllGraphs();
  //stop_quiz:
  let quiz_text = document.getElementById("quiz_text");
  quiz_text.innerHTML="";
  current_quiz="none";
  let quiz_icon_svg = document.getElementById("quiz_icon_svg");
  quiz_icon_svg.style.fill=null;
  //remove the assignments box:
  let assignments_box = document.querySelector('.assignments_box');
  assignments_box.classList.remove('active');
  if(event.value=="none"){
    next_graph_no_to_add=0;
    id_bank=0;
    // Add the initial startup graphs:
    for(let graph_no=0; graph_no<NOF_GRAPHS_AT_STARTUP; graph_no++){
      let graph_to_add = GRAPH_ORDER[graph_no];
      addNewGraph(null, graph_to_add);
    }
    next_graph_no_to_add = NOF_GRAPHS_AT_STARTUP;
    let assignment_icon_svg = document.getElementById("assignment_icon_svg");
    assignment_icon_svg.style.fill=null;
    return;
  }
  let assignment_icon_svg = document.getElementById("assignment_icon_svg");
  assignment_icon_svg.style.fill="#5050ff";

  if(event.value=="one_pole"){
    next_graph_no_to_add=0;
  } else if(event.value=="two_real_poles"){
    next_graph_no_to_add=1;
  } else if(event.value=="two_complex_poles"){
    next_graph_no_to_add=2;
  } else if(event.value=="time_delay"){
    next_graph_no_to_add=3;
  } else if(event.value=="one_zero_two_poles"){
    next_graph_no_to_add=4;
  } else if(event.value=="four_poles"){
    next_graph_no_to_add=5;
  } else if(event.value=="pid_controller"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_S"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_YL"){
    next_graph_no_to_add=0;
  } else if(event.value=="pid_controller_OL"){
    next_graph_no_to_add=0;
  }
  // Set the color of the graph:
  id_bank = next_graph_no_to_add;
  addNewGraph();
  // Make main graph information bar active:
  let info_tab = document.getElementById("graph_"+(next_graph_no_to_add)+"_info");
  info_tab.checked = "true";

  // Add ghost graphs:
  // The name tells where this formula will be shown:
  // GhostMPTNIE_Displayed name
  //      M      = shows up in Bode magnitude plot
  //       P     = shows up in Bode phase plot
  //        T    = shows up in Bode time response plot
  //         N   = shows up in Nyquist diagram
  //          I  = shows up in information tab
  //           E = shows up in Equations
  if(event.value=="one_pole"){
    //"reference eq in step response(k=0.65, T1=2)"
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.65}{1+2s}", formula:"(0.65)/((1+2s))"});
  } else if(event.value=="two_real_poles"){
    //reference in step (T2=T3=1, k2=0.5)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.5}{1+2s+s^2}", formula:"0.5/(1+2s+s^2)"});
    //reference in bode phase (T2=5, T3=0.05, k2=1)
    addNewGraph(null, {name:"Ghost.P...._Match this Bode phase", mf:"\\frac{1}{(1+5s)(1+0.05s)}", formula:"1/(1+5s)*1/(1+0.05s)"});
  } else if(event.value=="two_complex_poles"){
    //Bode reference (w=8, z=0.05)
    addNewGraph(null, {name:"GhostMP...._Match this Bode", mf:"\\frac{8^2}{s^2+2*0.05*8*s+8^2}", formula:"8^2/(s^2+2*0.05*8*s+8^2)"});
    //Step reference (w=2,z=0.7,k=0.7)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}", formula:"0.7*2^2/(s^2+2*0.7*2*s+2^2)"});
  } else if(event.value=="one_zero_two_poles"){
    //Nyquist reference (k=1,T6=2.5,T7=1,T8=6)
    addNewGraph(null, {name:"Ghost...N.._Match this Nyquist", mf:"\\frac{(1+6s)}{(1+2.5s)(1+s)}", formula:"(1+6s)/(1+2.5s)*1/(1+s)"});
    //Bode reference (k4=0.75,T6=9.25,T7=0.5,T8=2)
    addNewGraph(null, {name:"GhostMP...._Match this Bode", mf:"\\frac{0.75(1+2s)}{(1+9.25s)(1+0.5s)}", formula:"0.75(1+2s)/(1+9.25s)*1/(1+0.5s)"});
    //Step reference (k4=1,T6=1,T7=1,T8=-1.5)
    addNewGraph(null, {name:"Ghost..T..._Match this response", mf:"\\frac{(1-1.5s)}{(1+s)(1+s)}", formula:"(1-1.5s)/(1+s)*1/(1+s)"});
  } else if(event.value=="pid_controller"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
  } else if(event.value=="pid_controller_S"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
  } else if(event.value=="pid_controller_YL"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    //addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YL, "_____MPT..E");
  } else if(event.value=="pid_controller_OL"){
    addNewGraph(null, GRAPH_PID, "_____MP...E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YR, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_S, "_____M..N.E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_YL, "_____MPT..E");
    addNewGraph(null, GRAPH_ONE_POLE_WITH_PID_OPEN, "_____MP.NIE");
  }
  // Recalculate figures in the information bar, Phase margin, Gain crossover frequency, gain margin, etc.:
  redraw_canvas_gain("all");
}

let assignment_grade=0;
function update_tasks (){
  let task_div=document.getElementById("task_list");
  if (current_assignment=="none"){
    task_div.innerHTML = '<div class="yellow_hover"><center><span onclick="addNewGraph();" style="color:#b0b0b0;vertical-align:middle">Click <svg width="20" height="20" viewBox="0 0 24 24" fill="#b0b0b0" style="vertical-align:top"><use href="#icon_add"/></svg> or here to add next graph</span></center></div>';
    return;
  }

  let assignment_score = 100.0 * done_tasks.length / Object.keys(all_tasks).length;
  let new_assignment_grade=0;
  if (assignment_score<15){
    new_assignment_grade=0; // Black
  } else if (assignment_score<50){
    new_assignment_grade=1; // Bronze
  } else if (assignment_score<98){
    new_assignment_grade=2; // Silver
  } else {
    new_assignment_grade=3; // Gold
  }
  if (new_assignment_grade != assignment_grade){
    let assignment_0 = document.getElementById("assignment_0");
    assignment_0.src = "images/assignment_"+assignment_grade+".webp";
    assignment_grade = new_assignment_grade;
    assignment_0.style.animation = 'none';
    assignment_0.offsetHeight; /* trigger reflow */
    assignment_0.style.animation="new_badge_anim 2s ease-out 1";
  }
  let assignment_0_text = document.getElementById("assignment_0_text");
  assignment_0_text.innerHTML = done_tasks.length + "/" + Object.keys(all_tasks).length + "&nbsp";


  let s="";
  s += "<center><b>"+all_assignments[current_assignment].t+"</b></center><br>";

  // List all tasks not yet done:
  let todo = "Your tasks in this assignment:<br>";
  let nof_done_subtasks = 0;
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        nof_done_subtasks+=1;
      } else {
        let long_name = all_tasks[task_id].t;
        todo += "<input type='checkbox' onclick='return false;'>&nbsp;<span style='color:#4040b0;' id='task_"+task_id+"'>" + long_name + "</span><br><br>";
      }
    }
  }
  if (nof_done_subtasks != Object.keys(all_assignments[current_assignment].tasks).length){
    s += todo;
    s += "Completed tasks:<br>";
  }
  for (let task_id in all_tasks){
    if (all_assignments[current_assignment].tasks.includes(task_id)){
      if (done_tasks.includes(task_id)){
        let long_name = all_tasks[task_id].t;
        s += "<input type='checkbox' checked onclick='reset_task(\""+task_id+"\");'>&nbsp;<span style='color:#4040b0;' id='task_"+task_id+"'>" + long_name + "</span><br>";
      }
    }
  }
  if (nof_done_subtasks != Object.keys(all_assignments[current_assignment].tasks).length){
    s += "<br><b>" + (nof_done_subtasks) + "/"+Object.keys(all_assignments[current_assignment].tasks).length+"</b> done so far.";
  } else {
    s+="<br><span onclick='toggle_assignments_box()' class='clickable-link'>You're done with this assignment! Click <b>here</b> to choose the next assignment.</span>";
  }
  s += "<br><br><br><center><i><div style='width:70%;border-radius:20px;padding:5%;background:#e0e0e0;'>"+all_assignments[current_assignment].info+"</span></i></center>";

  task_div.innerHTML=s;
}

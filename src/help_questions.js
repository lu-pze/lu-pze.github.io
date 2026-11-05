'use strict';

// ---------------- start of questions and answers code

let questions_enabled = false;
function questionsToggle(event){
  add_event("questions_toggle");
  if (questions_enabled){
    disable_questions();
    redraw_canvas_gain("all");
  } else {
    enable_questions();
    // Directly show a question without waiting for mouseMoved:
    handle_questions();
  }
}
// Shared by the answers for two real poles and two complex poles:
const HELP_SECOND_ORDER_EXAMPLES = `<ul>
        <li><b>Physics:</b> Mass-spring-damper system - The fundamental second-order system, described by m&middot;d<sup>2</sup>x/dt<sup>2</sup> + c&middot;dx/dt + kx = F(t), where m, c, and k are mass, damping coefficient, and spring constant, respectively. A weak damper gives complex poles, a strong damper gives real poles.</li>
        <li><b>Electrical Engineering:</b> RLC circuits - Used in filters and radio tuners, with a resistor (R), an inductor (L), and a capacitor (C). A small R gives complex poles and a resonance, a large R gives real poles.</li>
        <li><b>Automotive:</b> Suspension system - The car body on its springs and shock absorbers is a mass-spring-damper system. It is usually designed with complex poles and moderate damping, as a compromise between comfort and road holding.</li>
        <li><b>Mechanics:</b> Pendulum dynamics (small angle approximation) - Described by d<sup>2</sup>&theta;/dt<sup>2</sup> + g/l &middot; &theta; = 0, where g is the acceleration due to gravity and l is the pendulum length. Without friction, the poles lie on the imaginary axis and the pendulum swings forever.</li>
        <li><b>Marine Engineering:</b> Ship roll dynamics - A ship tilted by a wave rolls back and forth with a damped oscillation.</li>
        <li><b>Acoustics:</b> Loudspeakers - The cone mass, the stiffness of its suspension, and the damping give a mechanical resonance at the low end of the frequency range.</li>
        <li><b>Gadgets:</b> Gyroscopes in smartphones - MEMS gyroscopes contain a tiny vibrating mass, a resonating second-order system. A rotation of the phone is sensed through the Coriolis force acting on that mass.</li>
        <li><b>Process Engineering:</b> Two tanks in series, where the first tank drains into the second - Each tank is a first-order system, and together they give two real poles.</li>
        <li><b>Thermal Engineering:</b> An electric radiator heating a room - The radiator and the room each store heat, which gives two real poles.</li>
        <li><b>Biomedical Engineering:</b> Two-compartment models of a drug, first absorbed from the stomach and then eliminated from the blood - Two real poles.</li>
        <li><b>Mechatronics:</b> A DC motor positioning a robot arm joint - The angle responds to the voltage as K/(s(1+Ts)): one pole at the origin (an integrator) and one real pole.</li>
        <li><b>Aerospace:</b> The attitude of a spacecraft, or the tilt of a drone - The angle responds to the applied torque as a double integrator, 1/(Js<sup>2</sup>), with both poles at the origin.</li>
    </ul>`;

// A question's position: the centre of the pole-zero map of the first shown graph of this preset.
function on_pole_zero_map_of(preset){
  return function(){
    for(let i=0; i<bode_graphs.length; i++){
      if((bode_graphs[i].bode_displaybool)&&(bode_graphs[i].bode_formula == preset.formula)){
        return {visible:true,x:pole_zero_graph_x[i]+graph_pole_zero_width/2,y:pole_zero_graph_y[i]+graph_pole_zero_width/2};
      }
    }
    return {visible:false}
  };
}

const all_questions={
  "seconds":{q:"Why are we using seconds as time unit?",pos:function(){return {visible:true,x:graph_step_response_x+graph_step_response_width+graph_step_response_x_offset,y:graph_step_response_y+graph_step_response_height+graph_step_response_y_offset+20}},
    a:`In automatic control systems, particularly in the context of time-domain analysis, the unit of seconds is commonly used on the time axis for several reasons:<br><br>
1. <b>Standardization</b>: Using seconds as the unit of time provides a standardized and universally accepted measurement. It allows for consistency and comparability across different systems and analyses.<br>
2. <b>Precision</b>: Seconds provide a level of precision that is often necessary in control systems where timing is critical. Many control algorithms and computations require precise timing information to function effectively.<br>
3. <b>Compatibility</b>: Seconds are compatible with various units of measurement used in control systems, such as meters for distance and radians for angular displacement. This compatibility simplifies the integration of time-based variables into control system equations and models.<br>
4. <b>Practicality</b>: Seconds are a practical unit of time for describing dynamic processes in control systems. They offer a convenient balance between granularity (small time intervals) and readability (larger time intervals), making them suitable for analyzing both fast and slow dynamics.<br>
5. <b>Engineering Convention</b>: The use of seconds on the time axis aligns with established engineering conventions and standards. It allows control engineers to communicate effectively and interpret results consistently within the field.<br><br>
Overall, using seconds on the time axis in automatic control simplifies analysis, enhances precision, and ensures compatibility with established engineering practices, making it a common and practical choice.`},

  "degrees":{q:"Degrees vs. radians - which is it?",pos:function(){return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset,y:graph_bode_phase_y+graph_bode_phase_y_offset-20}},
    a:`In automatic control theory, particularly in the context of frequency domain analysis and Bode plots, the choice between using degrees and radians depends on the conventions of the specific analysis or system, as well as personal preference. However, there are some general guidelines:<br><br>
1. <b>Phase Angle (φ)</b>:<br>
   - Degrees: Degrees are commonly used to represent phase angles in Bode plots, especially in introductory or practical contexts. Phase angles are often more intuitively understood in degrees. Note that the Bode phase curve is not limited to -180°...180°: the phase is drawn continuously, so four poles give -360° at high frequencies, and a time delay makes the phase decrease without limit.<br>
   - Radians: Radians can also be used to represent phase angles, particularly in more advanced or theoretical analyses. In mathematical calculations and advanced control theory, radians are preferred due to their natural connection with trigonometric functions and calculus.<br>
2. <b>Frequency (ω)</b>:<br>
   - Radians per Second (rad/s): Frequency in control theory is typically expressed in radians per second. This convention aligns with the use of Laplace transforms and complex numbers in control system analysis. Radians per second are favored because they provide a direct relationship with angular frequency, facilitating mathematical manipulation and analysis.<br>
   - Hertz (Hz): While radians per second is the standard unit for frequency in control theory, Hertz (cycles per second) can also be used, especially in practical applications or when discussing frequency in terms more familiar to non-specialists.<br><br>
In summary, the choice between using degrees and radians depends on the context and requirements of the analysis. Degrees are more common and intuitive for phase angles in practical applications, especially in introductory settings. However, radians are preferred for more advanced mathematical analyses due to their natural compatibility with trigonometric functions and calculus. Radians per second is the standard unit for frequency in control theory, aligning with the use of Laplace transforms and complex numbers.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of first-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "ONE_REAL_POLE_pz":{q:"Why do we study systems with one pole?",pos:on_pole_zero_map_of(GRAPH_ONE_REAL_POLE),a:`A system with one pole (a first-order system) is the simplest dynamic system. It is described by only two numbers: the static gain k and the time constant T. Its step response rises exponentially towards k and reaches 63% of the final value after the time T. Many real processes behave approximately like this, so it is a good first model. Some examples:
  <ul>
      <li><strong>Electronics</strong>: RC (Resistor-Capacitor) low-pass filter, with the time constant T = RC. The step response is V<sub>out</sub> = V<sub>in</sub> (1 - e<sup>-t/RC</sup>).</li>
      <li><strong>Thermal Engineering</strong>: A room heated by a heater. The rate of change of the room temperature depends on the heating power and on the difference between the room temperature and the outdoor temperature.</li>
      <li><strong>Mechanics</strong>: A mass moving against viscous friction, where the friction force is proportional to the velocity. The velocity responds to an applied force as a first-order system.</li>
      <li><strong>Chemistry</strong>: Chemical reactors in which the reaction rate is of first order with respect to a reactant concentration.</li>
      <li><strong>Biomedical Engineering</strong>: The concentration of a drug in the bloodstream, modelled with one compartment.</li>
      <li><strong>Automobiles</strong>: The speed of a car as a response to the engine force, where the speed is limited by friction and air drag. This is the process that a cruise control system controls.</li>
      <li><strong>Environmental Engineering</strong>: The concentration of a pollutant in a well-mixed lake with inflow and outflow.</li>
      <li><strong>Electrical Engineering</strong>: The current in a DC motor winding, governed by the motor's inductance and resistance (with the motor held at constant speed).</li>
      <li><strong>Fluid Dynamics</strong>: The water level in a tank with an outflow at the bottom, around an operating point.</li>
      <li><strong>Signal Processing</strong>: The exponential moving average filter, often used to smooth out time series data.</li>
      <li><strong>Marine Engineering</strong>: The velocity of a ship as a response to the propeller thrust.</li>
      </ul>`},




//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of second-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "TWO_REAL_POLES_pz":{q:"Why do we study systems with two real poles?",pos:on_pole_zero_map_of(GRAPH_TWO_REAL_POLES),a:`Two real poles appear when two first-order systems are connected in series, or when a system has two energy stores and a lot of damping. The step response has no overshoot. In contrast to a single pole, it starts with zero slope, which makes it look slower and S-shaped. The pole closest to the origin (the largest time constant) dominates the response. Some examples of second-order systems:
  ` + HELP_SECOND_ORDER_EXAMPLES},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, make a list of tweny examples of second-order systems from various engineering fields such as electronics, chemistry, physics, mechanics, mathematics, household appliances, and gadgets. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "TWO_COMPLEX_POLES_pz":{q:"Why do we study systems with two complex poles?",pos:on_pole_zero_map_of(GRAPH_TWO_COMPLEX_POLES),a:`Two complex poles give a damped oscillation in the step response and, for low damping, a resonance peak in the Bode magnitude plot. Systems that store energy in two ways and exchange it back and forth behave like this, for example a mass and a spring, or an inductor and a capacitor. The form k<sub>3</sub>w<sup>2</sup>/(s<sup>2</sup>+2zws+w<sup>2</sup>) describes such a system with three numbers: the static gain k<sub>3</sub>, the natural frequency w (&omega;<sub>n</sub>), and the relative damping z (&zeta;). Some examples of second-order systems:
  ` + HELP_SECOND_ORDER_EXAMPLES},




//In automatic control, why do we study second-order systems with two complex poles? Give an answer with vivid examples of resonating systems, with correct automatic control vocabulary while keeping the rest of the english simple.
  "ONE_ZERO_TWO_POLES_pz":{q:"Why do we study systems with one zero and two poles?",pos:on_pole_zero_map_of(GRAPH_ONE_ZERO_TWO_POLES),a:`A zero does not add dynamics of its own, but it changes the shape of the response. A common way to get a zero is two parallel paths whose outputs are added, for example a fast and a slow process: a/(1+T<sub>6</sub>s) + b/(1+T<sub>7</sub>s) has one zero and two poles. With k<sub>4</sub>(1+T<sub>8</sub>s)/((1+T<sub>6</sub>s)(1+T<sub>7</sub>s)), the zero is at s = -1/T<sub>8</sub>:<br><br>
<b>T<sub>8</sub> &gt; 0, zero in the left half-plane</b>: The zero makes the response faster. If the zero is closer to the origin than the poles (T<sub>8</sub> larger than T<sub>6</sub> and T<sub>7</sub>), the step response overshoots even though both poles are real. Examples:
<ul>
<li><b>Mass-spring-damper, from force to velocity</b>: s/(ms<sup>2</sup>+cs+k), with the zero at the origin. From force to position there is no zero.</li>
<li><b>DC motor, from voltage to current</b>: the electrical and mechanical dynamics give two poles, and the mechanical part (Js+b) shows up as a zero. From voltage to speed there is no zero.</li>
<li><b>A first-order process controlled by a PI controller</b>: the closed-loop transfer function G<sub>YR</sub> (with T<sub>d</sub>=0) is Kk<sub>1</sub>(1+T<sub>i</sub>s)/(Kk<sub>1</sub>+T<sub>i</sub>(1+Kk<sub>1</sub>)s+T<sub>i</sub>T<sub>1</sub>s<sup>2</sup>), where the zero comes from the controller.</li>
</ul>
<b>T<sub>8</sub> &lt; 0, zero in the right half-plane</b>: The system is <i>non-minimum phase</i>. The step response first goes in the wrong direction (inverse response), which happens when two parallel paths have opposite signs and the faster one wins at first. Such systems are harder to control, because a controller that reacts too fast is fooled by the initial wrong-way response. Examples:
<ul>
<li><b>The water level in a steam boiler drum</b>: when more cold feedwater is added, steam bubbles collapse and the level first drops (shrink), before it rises.</li>
<li><b>The altitude of an aircraft</b>: when the pilot pulls the elevator, the tail is pushed down, and the aircraft loses a little altitude before it starts to climb.</li>
</ul>
Try dragging the zero in the pole-zero map from the left half-plane to the right half-plane and watch the step response.`},
//In automatic control theory, studying systems with one zero and two poles provides insights into the dynamics of a wide range of physical and engineering applications. Such configurations often occur in practical systems and offer a balance between simplicity and the ability to capture significant dynamic behaviors. This focus allows for the exploration of essential concepts such as stability, transient response, and steady-state accuracy within a manageable framework, facilitating the understanding and design of feedback control systems.
//In summary, studying systems with one zero and two poles in automatic control theory is a foundational step that bridges theoretical concepts with practical applications, encouraging a deep understanding of how various control strategies can be employed to achieve desired system behaviors in a wide range of real-world scenarios.


//Who invented the Nyquist diagram, and why is it essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Nyquist_who":{q:"Who invented the Nyquist diagram?",pos:function(){return {visible:true,x:graph_nyquist_x+graph_nyquist_x_offset+graph_nyquist_width/2,y:graph_nyquist_y+graph_nyquist_y_offset-10};},
  a:`The Nyquist diagram was invented by the Swedish-American engineer and physicist Harry Nyquist in the early 1930s. It's a powerful tool in automatic control theory for analyzing the stability of feedback control systems.`},


//Who invented the Nyquist diagram, and why is it essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Nyquist":{q:"Why is the Nyquist diagram useful?",pos:function(){return {visible:true,x:graph_nyquist_x+graph_nyquist_x_offset+graph_nyquist_width/2,y:graph_nyquist_y+graph_nyquist_y_offset+graph_nyquist_height/2};},
  a:`Imagine you're driving a car and you want to maintain a steady speed. The car's cruise control system adjusts the throttle based on feedback from your speedometer. If the control system is unstable, it might overcorrect, causing the car to speed up and slow down unpredictably.<br><br>
The Nyquist diagram helps you understand and predict the stability of such control systems. It plots the frequency response of a system on a complex plane, providing insights into how system dynamics change with frequency.<br><br>
The key point is -1 in the complex plane. If we draw the Nyquist curve of the open-loop transfer function G<sub>OL</sub>(i&omega;), the closed-loop system becomes unstable if the curve passes on the wrong side of -1. This is the Nyquist stability criterion: for a stable open-loop system, the closed loop is stable if the curve does not encircle -1. The distance from the curve to -1 shows how close to instability the system is, and the gain and phase margins can be read directly in the diagram. This information is crucial for designing reliable and effective control systems for various applications, such as aircraft autopilots, robotic arms, or temperature controllers in industrial processes.
<h3>Nyquist curve drawing</h3>
The Nyquist curve is constituted of the complex number G(i&omega;) drawn in the complex plane for &omega; in [0,∞]. Assume that the process is described by the first-order transfer function<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
G(s)=\\frac{1}{1+s}
</math-field><br>
We compute G(i&omega;) and separate into its real- and imaginary parts:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
G(i\\omega)=\\frac{1}{1+i\\omega}=\\frac{1-i\\omega}{1+\\omega^2}
=\\frac{1}{1+\\omega^2}-i\\frac{\\omega}{1+\\omega^2}
</math-field><br>
We see that the real part is positive, whereas the imaginary part is negative for all &omega;.
In other words, the Nyquist curve will be contained in the fourth quadrant. Further, we see that G(i&omega;) ≈ 1 for small &omega; and G(i&omega;) → 0 as 
&omega; → ∞.<br><br>
Most processes have low-pass characteristics. This means that the
output signal of the process is affected by low frequency inputs,
whereas high frequency signals are damped out. Since the distance
between the origin and points on the Nyquist curve describes the gain
of the process, it is normal that the Nyquist curve approaches the origin
for high frequencies.
The phase shift between in- and output does usually increase with the
frequency. This explains the spiral shapes commonly found in the Nyquist diagram, for example for systems with a time delay.`},


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plot_who":{q:"Who invented Bode plots?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset+graph_bode_mag_width/2,y:graph_bode_mag_y+graph_bode_mag_y_offset-10};},
  a:`Bode plots were developed by the American engineer Hendrik Wade Bode in the 1930s. They are fundamental tools in automatic control theory for analyzing the frequency response of dynamic systems.`},


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plots":{q:"Why are Bode plots useful?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset+graph_bode_mag_width/2,y:graph_bode_mag_y+graph_bode_mag_y_offset+graph_bode_mag_height/2};},
  a:`Imagine you're designing a sound system for a concert hall. You want to ensure that the system delivers clear and balanced sound across a wide range of frequencies. Bode plots help engineers understand how the system responds to different frequencies, allowing them to optimize its performance.<br><br>
Bode plots display the magnitude and phase of a system's frequency response against a logarithmic frequency axis. This makes it easier to visualize how a system amplifies or attenuates signals at different frequencies and how it shifts the phase of those signals.<br><br>
The Bode plot features two curves, |G(i&omega;)|
and arg G(i&omega;) as functions of &omega;.
The magnitude plot is drawn in a logarithmic scale, whereas the phase shift/argument is drawn in a linear scale. The frequency axis is
logarithmic.
The low frequency gain is often constant and corresponds
to the static gain of the process.<br><br>
By analyzing Bode plots, you can identify resonance frequencies, damping ratios, and stability margins of control systems. This information is crucial for designing stable and robust control systems for applications such as aircraft autopilots, electronic circuits, or motion control systems in robotics.`},



//Why does the Bode magnitude plot use magnitude instead of amplitude in automatic control? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
//Some automatic control engineers use decibel dB scale on their Bode magnitude plots instead of decimal magnitude numbers. Give me pros and cons of using decibel scale vs. log-scaled numbers.
  "Bode_mag":{q:"Why use logarithmic scale in the Bode magnitude plot?",pos:function(){return {visible:true,x:graph_bode_mag_x+graph_bode_mag_x_offset,y:graph_bode_mag_y+graph_bode_mag_y_offset-10};},
  a:`The magnitude |G(i&omega;)| is the ratio of the output amplitude to the input amplitude when a sinusoid with frequency &omega; is sent through the system. There are three good reasons for drawing it on a logarithmic scale:
<ul>
<li><b>Products become sums</b>: For systems connected in series, the transfer functions are multiplied, G(s)=G<sub>1</sub>(s)G<sub>2</sub>(s). Since log|G<sub>1</sub>G<sub>2</sub>| = log|G<sub>1</sub>| + log|G<sub>2</sub>|, the magnitude curves can simply be added, just like the phase curves.</li>
<li><b>Straight-line asymptotes</b>: With logarithmic axes for both magnitude and frequency, each pole and zero gives an asymptote that is a straight line. Above the corner frequency, a pole bends the curve down by a slope of -1 (a factor 10 per decade of frequency) and a zero bends it up by +1. This makes it possible to sketch Bode plots by hand.</li>
<li><b>Wide range</b>: Gains from 0.001 to 1000 fit in one readable plot.</li>
</ul>
Some engineers label the magnitude axis in decibel (dB) instead, where |G|<sub>dB</sub> = 20&middot;log<sub>10</sub>|G|. This is the same curve on the same logarithmic scale, only with different numbers on the axis: a gain of 10 is 20 dB, a gain of 1 is 0 dB, a gain of 0.1 is -20 dB, and a slope of -1 is -20 dB/decade. LU-PZE labels the axis with the gain values themselves (0.1, 1, 10, ...).`},
//Too long, so removed: While both decibel (dB) scale and log-scaled numbers have their advantages and disadvantages, the choice between them often depends on the engineer's background, preferences, and the specific requirements of the analysis or design task at hand.


//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Bode_plot_phase":{q:"How do we get the Bode plot phase curve?",pos:function(){return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset+graph_bode_phase_width/2,y:graph_bode_phase_y+graph_bode_phase_y_offset+graph_bode_phase_height/2};},
  a:`

<h3>Bode phase for real poles and zeros G(s)&nbsp;=&nbsp;(1+Ts)<sup>n</sup></h3>
The argument of the transfer function G(s)&nbsp;=&nbsp;(1+Ts)<sup>n</sup> is given by
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) = n \\arg (1+i\\omega T) = n\\arctan(\\omega T) 
</math-field><br>
For small values of &omega; the function is given by<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) \\rightarrow 0
</math-field><br>
For large values of &omega; the function is given by<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) \\rightarrow n\\frac{\\pi}{2}
</math-field><br>
The corner frequency is defined as &omega;=1/T, where the phase is n&middot;45&deg;. Use n=1 for a zero (the phase goes from 0&deg; to +90&deg;) and n=-1 for a pole (from 0&deg; to -90&deg;). For a product of factors, such as G(s)=1/((1+T<sub>1</sub>s)(1+T<sub>2</sub>s)), the phase curves are added: arg G = -arctan(&omega;T<sub>1</sub>) - arctan(&omega;T<sub>2</sub>).

<h3>Bode phase for a time delay G(s)&nbsp;=&nbsp;e<sup>-sL</sup></h3>
This transfer function describes a pure time delay.
This means that the output is identical to the input, except that it has been delayed by a time L, y(t)=u(t-L).
If one sends a sinusoid through such a process, it outputs a sinusoid with the same amplitude, but with a phase shift which is larger for higher frequencies. For the transfer function G(s)&nbsp;=&nbsp;e<sup>-sL</sup> the argument becomes<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\arg G(i\\omega) = \\arg e^{-i\\omega L} =-\\omega L
</math-field><br>
in radians, or -&omega;L&middot;180&deg;/&pi; in degrees. The phase decreases without limit as &omega; grows, which is why time delays are hard to control.
  `},



//Why is the step input response of a automatic control transfer function important? What can I learn from it? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
//Who invented the Bode plots, and why are they essential for Automatic control theory? Give an answer with vivid examples of Automatic control theory, with correct automatic control vocabulary while keeping the rest of the english simple.
  "Step_response":{q:"Why is the step input response important?",pos:function(){return {visible:true,x:graph_step_response_x+graph_step_response_x_offset+graph_step_response_width/2,y:graph_step_response_y+graph_step_response_y_offset+graph_step_response_height/2};},
  a:`Imagine you're driving a car with cruise control. When you raise the set speed with the cruise control button, the controller adjusts the throttle to reach the new speed. The step response shows how quickly and accurately the car reaches the new speed, and whether it overshoots or oscillates on the way.<br><br>
The step response shows how a system behaves after a sudden change of its input signal. From it, we can read several key characteristics:<br>
1. <b>Rise Time</b> T<sub>r</sub>: Draw the tangent to the step response where it is steepest (at the inflection point). The rise time is the time between where this tangent crosses zero and where it reaches the final value. Equivalently, T<sub>r</sub> = (final value)/(maximum slope). A shorter rise time means a faster response. (Other textbooks use the time from 10% to 90% of the final value instead.)<br>
2. <b>Settling Time</b>: The time it takes for the output to enter a tolerance band around its final value (often &plusmn;2% or &plusmn;5%) and stay there.<br>
3. <b>Overshoot</b>: How far the output goes past its final value, usually given in percent of the final value. Overshoot is a sign of low damping, for example complex poles close to the imaginary axis.<br>
4. <b>Static gain and steady-state error</b>: The final value of the step response equals the static gain G(0) of the system. For a closed-loop system, the difference between the reference and the final value of the output is the steady-state error. Integral action in the controller removes it.<br><br>
If a controlled system has too much overshoot or a slow settling time, we can tune the controller parameters to get a better response.`},



//In automatic control and a resonant second order system, what is the damping factor? Give an answer with vivid examples of resonating systems, with correct automatic control vocabulary while keeping the rest of the english simple.

//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the damping factor &zeta; of a two-pole system with complex valued poles when we start with the differential equation, and compute the laplace transform and pole locations in the s-plane. Use an example such as a Mass-Spring-Damper System, described by m*d^2x/dt^2 + c*dx/dt + kx = F(t), where m, c, and k are mass, damping coefficient, and spring constant, respectively.</li>. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "Damping_factor_z":{q:"What is the relative damping (&zeta; or z)?",pos:function(){
    let span = document.getElementById('variable_z');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's imagine a bell as an example of a resonating system. When you strike a bell, it produces a ringing sound that gradually fades away. The damping determines how quickly the sound fades. If the bell has high damping, the sound dies down rapidly. But if the damping is low, the sound lingers for longer.<br><br>
The relative damping, also called the damping ratio (written z, or the Greek letter zeta &zeta;), of a second-order system measures how fast the system's oscillations fade away. In the transfer function k<sub>3</sub>w<sup>2</sup>/(s<sup>2</sup>+2zws+w<sup>2</sup>):
<ul>
<li>z = 0: no damping, the poles lie on the imaginary axis and the system oscillates forever.</li>
<li>0 &lt; z &lt; 1: complex poles, a damped oscillation. The lower z, the larger the overshoot and the resonance peak.</li>
<li>z = 1: two equal real poles, the fastest response without overshoot.</li>
<li>z &gt; 1: two different real poles, slower and without overshoot.</li>
</ul>
In the pole-zero map, z = cos(&phi;), where &phi; is the angle between a pole and the negative real axis.
<h3>How do we calculate the relative damping?</h3>
Let's walk through an example of computing the relative damping (&zeta;) of a Mass-Spring-Damper System, which is a common two-pole system in automatic control theory. Given is the differential equation for the Mass-Spring-Damper System:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
m\\frac{d^2x}{dt^2} + c\\frac{dx}{dt} + kx = F(t)
  </math-field><br>
where m is the mass, c is the damping coefficient, k is the spring constant, and F(t) is the input force as a function of time.

<h4>Step 1: Apply Laplace Transform</h4>
Applying the Laplace transform and assuming zero initial conditions, we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
ms^2X(s) + csX(s) + kX(s) = F(s) \\quad\\Rightarrow\\quad G(s)=\\frac{X(s)}{F(s)}=\\frac{1}{ms^2+cs+k}
  </math-field><br>
The poles are the roots of the denominator, the characteristic equation:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
ms^2 + cs + k = 0
  </math-field>

<h4>Step 2: Compute Pole Locations</h4>
The roots of the characteristic equation will give us the pole locations in the s-plane. These roots can be calculated using the quadratic formula:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
s = \\frac{-c \\pm \\sqrt{c^2 - 4mk}}{2m}
  </math-field>

<h4>Step 3: Relative Damping &zeta;</h4>
The relative damping &zeta; is a dimensionless number that describes how oscillations in a system decay. Dividing the characteristic equation by m gives the standard form s<sup>2</sup> + 2&zeta;&omega;<sub>n</sub>s + &omega;<sub>n</sub><sup>2</sup> = 0, with the roots<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
s = -\\zeta\\omega_n \\pm \\omega_n\\sqrt{\\zeta^2 - 1}
  </math-field><br>
which for complex poles (&zeta; &lt; 1, an underdamped system) is s = -&zeta;&omega;<sub>n</sub> &plusmn; i&omega;<sub>n</sub>√(1-&zeta;<sup>2</sup>). Here &omega;<sub>n</sub> = √(k/m) is the natural frequency of the system. Comparing this with the roots obtained from the quadratic formula, we can deduce:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\zeta = \\frac{c}{2\\sqrt{mk}}
  </math-field><br>

As an example, assume a mass-spring-damper system with m=1&nbsp;kg, c=2&nbsp;Ns/m, and k=5&nbsp;N/m. First, calculate the natural frequency:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\omega_n = \\sqrt{\\frac{k}{m}} = \\sqrt{5} \\, \\text{rad/s}
  </math-field><br>
Then, calculate the relative damping &zeta;:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
\\zeta = \\frac{c}{2\\sqrt{mk}} = \\frac{2}{2\\sqrt{1 \\times 5}} = \\frac{2}{2\\sqrt{5}} = \\frac{1}{\\sqrt{5}}
  </math-field><br>

which is approximately 0.45. The poles are s = -1 &plusmn; 2i.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"Respond using HTML and LaTeX. In automatic control theory, what is the definition of phase margin? Give me three vivid examples where the phase margin is crucial. Answer with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "phase_margin":{q:"What is the phase margin?",pos:function(){
    let span = document.getElementById('phase_margin');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<b>Phase margin</b> is defined as the amount of additional phase lag at the gain crossover frequency that would lead to the system becoming unstable. The gain crossover frequency is the frequency at which the magnitude of the open-loop transfer function equals 1.0 (0 dB). The phase margin is a measure of robustness: a larger phase margin means that the system is further from instability, and usually gives less overshoot. It is usually expressed in degrees, and a common rule of thumb is 30°-60°.<br><br>
Mathematically, the phase margin can be expressed as<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>PhaseMargin = 180^\\circ + \\phi(\\omega_{gc})</math-field><br>
where &phi;(&omega;<sub>gc</sub>) is the phase of the open-loop transfer function at the gain crossover frequency &omega;<sub>gc</sub>.<br><br>
<b>Aircraft Autopilot Systems</b>: Stability is paramount in aircraft control systems to ensure smooth and safe flight operations. The phase margin plays a critical role in the design of autopilot systems, where it ensures that even with the presence of uncertainties in aircraft dynamics or external disturbances (like wind gusts), the system remains stable and can maintain or return to the desired flight path. A sufficiently high phase margin is needed to account for these uncertainties and provide a buffer against instability.<br>
<b>Industrial Robot Arms</b>: In robotic systems used for manufacturing or assembly, precise and stable control of robotic arms is essential for accuracy and efficiency. The phase margin is crucial in tuning the control systems that govern these robotic arms, making sure they can follow desired trajectories smoothly without oscillating or veering off course. This is especially important when the robotic arms are performing high-speed movements or delicate operations, where stability translates into safety and precision.<br>
<b>Automotive Cruise Control Systems</b>: Modern vehicles often come equipped with cruise control systems that automatically adjust the vehicle's speed to maintain a set speed. The stability of these control systems is heavily dependent on having an adequate phase margin. A good phase margin ensures that the vehicle smoothly accelerates or decelerates to the desired speed without excessive overshoot, undershoot, or oscillations, thereby enhancing both comfort and safety for passengers and other road users.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, what is the definition of phase crossover frequency? Give me three vivid examples where the phase crossover frequency is crucial. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "phase_crossover_frequency":{q:"What is the phase crossover frequency?",pos:function(){
    let span = document.getElementById('phase_crossover_frequency');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>The <strong>phase crossover frequency</strong> (often denoted as &omega;<sub>pc</sub>) is the frequency at which the phase of the open-loop transfer function crosses -180°. At this frequency, a sinusoid that goes around the feedback loop comes back with opposite sign, so the negative feedback acts as positive feedback.</p>
<p>The <b>gain margin</b> is read at the phase crossover frequency: for an open-loop stable system, if the open-loop gain |G<sub>OL</sub>(i&omega;<sub>pc</sub>)| is less than 1, the closed loop is stable, and the gain margin 1/|G<sub>OL</sub>(i&omega;<sub>pc</sub>)| tells how much the gain can be increased before the closed-loop system becomes unstable. (The phase margin, in contrast, is read at the gain crossover frequency, where |G<sub>OL</sub>| = 1.)</p>
<p>In the Nyquist diagram, the phase crossover frequency is where the curve crosses the negative real axis. Not all systems have one: a system with only one or two stable poles, no zeros in the right half-plane, and no time delay never crosses -180°, so its gain margin is infinite. Extra poles and time delays add phase lag, which moves the phase crossover frequency down.</p>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, what is the definition of gain margin? Give me three vivid examples where the gain margin is crucial. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "gain_margin":{q:"What is the gain margin?",pos:function(){
    let span = document.getElementById('gain_margin');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>The <strong>gain margin</strong> is a measure of the stability of a system. Specifically, it is the amount by which the system's open-loop gain can be increased before the system becomes unstable. The gain margin is calculated as:</p>
  <p>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\text{Gain Margin} = \\frac{1}{|G(i\\omega_{pc})|}
  </math-field>
  or, in decibel,
    <math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\text{Gain Margin}_{\\text{dB}} = 20 \\log_{10} \\left( \\frac{1}{|G(i\\omega_{pc})|} \\right)
  </math-field></p>
  <p>where |G(i&omega;<sub>pc</sub>)| is the magnitude of the open-loop transfer function G at the phase crossover frequency &omega;<sub>pc</sub>, where the phase angle is -180°. LU-PZE shows the gain margin as a plain factor, not in dB. A common rule of thumb is a gain margin of 2-6 (6-16 dB).</p>
  <ul>
  <li><strong>Aircraft Control Systems:</strong> In aircraft, ensuring the stability of control systems like autopilots is crucial for safety. A significant gain margin allows for changes in aircraft dynamics due to different flight conditions (speed, altitude) without risking instability. For instance, abrupt maneuvers or changes in aerodynamic conditions could potentially push the system towards instability. A healthy gain margin ensures there's enough 'buffer' to handle such variations without compromising control.</li>

  <li><strong>Automotive Cruise Control:</strong> Cruise control systems maintain a vehicle's speed without manual input by adjusting the throttle position. Variations in vehicle load (e.g., passengers or cargo) and road inclinations can alter system dynamics. A sufficient gain margin ensures that the system can accommodate such changes and maintain speed without becoming unstable, avoiding oscillations or erratic speed adjustments.</li>

  <li><strong>Chemical Process Control:</strong> In chemical plants, the control of processes such as reactor temperatures, pressure, and flow rates is vital. These processes are highly sensitive to operating conditions. A control system with an adequate gain margin ensures stability even as the process dynamics change with varying reactant concentrations, temperature, or pressure. This is particularly crucial in ensuring consistent product quality and preventing potentially hazardous conditions.</li>
  </ul>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why is -180 degree on the y axis in the Bode phase plot important? Give me three vivid examples when feedback control goes wrong and the catastrophic results. Give your answer in HTML and LaTeX formatting, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "Bode_-180_degrees":{q:"Why is -180° important in the Bode phase plot?",pos:function(){
  let angle=-180;
  if ((angle >= phase_lower_bound) && (angle <= phase_upper_bound)){
    let screen_y = map(angle,phase_lower_bound,phase_upper_bound,graph_bode_phase_height,0);
    return {visible:true,x:graph_bode_phase_x+graph_bode_phase_x_offset,y:graph_bode_phase_y+graph_bode_phase_y_offset+screen_y}
  } else return {visible:false};},
  a:`In a negative feedback loop, the measured output is subtracted from the reference. A phase lag of -180° means that a sinusoid comes back around the loop with opposite sign, so the subtraction turns into an addition: the negative feedback becomes positive feedback. If the loop gain at that frequency is 1 or more, an oscillation can build up by itself, and the closed-loop system becomes unstable.
<ul>
<li><b>Phase margin:</b> The phase margin is the distance from the phase curve to -180° at the gain crossover frequency (where the gain is 1, or 0 dB). A phase margin close to zero gives large overshoot and weakly damped oscillations, and a negative phase margin means an unstable closed loop.</li>
<li><b>Gain margin:</b> The gain margin is read at the frequency where the phase curve crosses -180°.</li>
<li><b>Nyquist stability criterion:</b> The -180° crossing is where the Nyquist curve of the open-loop transfer function crosses the negative real axis. For an open-loop stable system, the closed loop is stable if this curve does not encircle the point -1.</li>
</ul>
Some examples where feedback went wrong:<br><br>
<b>Audio feedback</b>
  <p>When a microphone is held close to a loudspeaker, the sound goes around the loop microphone &rarr; amplifier &rarr; loudspeaker &rarr; air &rarr; microphone. At a frequency where the sound comes back in phase with itself and the loop gain is larger than 1, the sound builds up into a loud howl. Turning down the amplifier gain (increasing the gain margin) stops it.</p>
<b>JAS 39 Gripen (1989 and 1993)</b>
  <p>Two early Gripen fighter aircraft crashed after pilot-induced oscillations: the pilot and the aircraft's flight control system formed a feedback loop that started to oscillate. Rate limits on the control surfaces added phase lag in the loop, so the pilot's corrections came too late and made the oscillation larger. The flight control laws were redesigned after the crashes.</p>
<b>Tacoma Narrows Bridge Collapse (1940)</b>
  <p>The bridge collapsed in a fairly steady wind of about 65 km/h. It was not a matter of the wind "matching" a natural frequency of the bridge. The twisting of the deck changed the airflow around it, and the changed airflow pushed the deck to twist even more (aeroelastic flutter). This feedback acted like negative damping, so the oscillation grew until the bridge broke.</p>
<b>Chernobyl Nuclear Disaster (1986)</b>
  <p>The RBMK reactor had a positive void coefficient: when steam bubbles (voids) formed in the cooling water, the reactor power increased, which produced even more steam. Operating the reactor at low power during a test made this positive feedback dominate, which led to a power surge and an explosion.</p>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why is a transfer function with a time delay difficult to use feedback control with? Give me three vivid examples of systems with time delays. Give your answer in HTML and LaTeX formatting, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "time_delay_L":{q:"Why is a time delay a problem?",pos:function(){
    let span = document.getElementById('variable_L');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>A time delay, often denoted L (or &tau;), means that the output does not react at all to a control action until the time L has passed: y(t) = u(t-L), and the transfer function is e<sup>-sL</sup>. This makes feedback control difficult for several reasons:</p>
<ul><li><b>Phase lag without limit:</b> The delay does not change the gain (|e<sup>-i&omega;L</sup>| = 1), but it adds the phase lag -&omega;L, which grows without limit with the frequency. The phase therefore reaches -180° at some frequency, which limits how high the gain crossover frequency can be, and so how fast the closed-loop system can be. A rule of thumb is that the gain crossover frequency must be below about 1/L.</li>
<li><b>Stability:</b> A controller that acts on old information tends to overcorrect. If the controller gain is too high, this leads to oscillations or instability.</li>
<li><b>Performance:</b> No controller can react to a disturbance faster than the delay allows. A step disturbance always gives an error during at least the time L.</li>
</ul>A pure delay is perfectly predictable, though. If a good model of the process is available, a Smith predictor can compensate for the known delay.<br><br>
Examples of systems with time delays:
<ol><li><b>Transport delays:</b> Material that travels on a conveyor belt or fluid that flows through a long pipe reaches the sensor after a delay. A classic example is the shower: when you turn the tap, it takes a few seconds before the water at the new temperature reaches you, and it is easy to overcorrect.</li>
<li><b>Networked control systems:</b> When the control loop is closed via a communication network, the network transmission adds a delay.</li>
<li><b>Remote control of vehicles in space:</b> A radio signal takes between about 3 and 22 minutes to reach Mars, so the rovers there cannot be steered directly from Earth and must drive partly on their own.</li>
</ol>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, in a system with two complex poles, what is the resonance frequency and what options do we have to deal with it? Give me three vivid examples of systems with resonance, both good and bad ones. Give your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "resonance_frequency_w":{q:"What is the natural frequency w?",pos:function(){
    let span = document.getElementById('variable_w');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`In the transfer function k<sub>3</sub>w<sup>2</sup>/(s<sup>2</sup>+2zws+w<sup>2</sup>), w is the <em>natural frequency</em> &omega;<sub>n</sub> (sometimes called the undamped natural frequency). In the pole-zero map, w is the distance from the poles to the origin. Increasing w moves the poles radially outwards and makes the system faster, without changing the shape of the step response. In the Bode plot, w is the corner frequency.<br><br>
The <em>resonance frequency</em> &omega;<sub>r</sub>, where the Bode magnitude has its peak, is close to w but not equal to it:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
\\omega_r = w\\sqrt{1-2z^2}
</math-field><br>
This only applies when z &lt; 1/√2 &asymp; 0.71. With more damping than that, there is no resonance peak, even though the poles can still be complex. The lower the relative damping z, the closer &omega;<sub>r</sub> is to w, and the higher the peak.
<h3>Beneficial Resonance</h3>
      <ul>
          <li><strong>Musical Instruments:</strong> The body of a violin acts as a resonator, amplifying the sound at certain frequencies, which enriches the music's quality and volume.</li>
          <li><strong>Radio Receivers:</strong> Tuning a receiver to resonate at a specific frequency allows it to selectively pick up the desired radio signal amidst numerous other signals.</li>
      </ul>
      <h3>Harmful Resonance</h3>
      <ul>
          <li><strong>Buildings and bridges:</strong> Structures that are excited by earthquakes, wind, machines, or marching people near their resonance frequency can get large oscillations and structural damage. The Millennium Bridge in London (2000) started to sway sideways when crowds walked on it, and had to be closed and fitted with dampers.</li>
          <li><strong>Machines:</strong> A washing machine with an unbalanced load shakes the most when the drum speed passes the resonance frequency of the machine on its springs.</li>
      </ul>
      <p>To manage or mitigate the effects of resonance, there are several strategies we can employ:</p>
      <ol>
          <li><strong>Damping Increase:</strong> By increasing the relative damping of the system, the peak of the resonance can be reduced.</li>
          <li><strong>Feedback Control:</strong> A feedback controller can add damping to a weakly damped system.</li>
          <li><strong>Tuning:</strong> Adjusting the system parameters (such as spring constants or masses in mechanical systems) can shift the resonance frequency away from the frequencies of the disturbances.</li>
      </ol>`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, give four positive examples of outcomes of doing rapid exercises with quiz-type questions where the difficulty level adapts to the performance of the student. Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, just write the html code with the embedded LaTeX formulas."}]}'
  "quiz_badge":{q:"Who's the quiz for?",pos:function(){
    let span = document.getElementById('cap_0');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`It's for you. The adapting difficulty level of the quiz will help your training, regardless of your level, with rapid questions and personalized feedback where you make mistakes. You will get:
<ul>
    <li>Improved <strong>feedback-loop understanding</strong>: By engaging in adaptive difficulty exercises, you can grasp concepts such as the transfer function,<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{Y(s)}{U(s)},
  </math-field><br>
and the significance of stability in control systems more effectively. This approach ensures that the material is neither too challenging nor too easy, facilitating optimal learning progress.</li>
    <li>Increased <strong>frequency response analysis</strong> proficiency: You can enhance your understanding of Bode plots and Nyquist plots, crucial for determining the frequency response of a system. Through adaptive questioning, you will be gradually introduced to more sophisticated analysis techniques, improving your ability to assess system performance and stability margins using these methods, exemplified by the gain margin G<sub>m</sub> and phase margin &phi;<sub>m</sub>.</li>
    </ul>Click on the quiz icon to get started!`},
//    <li>Enhanced <strong>root locus skills</strong>: Adaptive quizzes can help you master the plotting of root locus diagrams, essential for analyzing system responses. Through tailored questions, students can progressively understand complex plots, for instance, how to determine the system's stability by examining the locations of poles in the s-plane, represented by (s = &sigma; + j&omega;).</li>
//    <li>Better <strong>PID controller tuning</strong>: Personalized exercises enable you to experiment with proportional (P), integral (I), and derivative (D) controller parameters and observe their effects on system performance, including minimizing the error signal, e(t). This hands-on approach helps demystify the process of optimizing a PID controller, given as<br>
//  <math-field read-only style='vertical-align:bottom;display:inline-block'>
//  PID(s) = K_p + \\frac{K_i}{s} + K_ds,
//  </math-field><br>
//for different system dynamics.</li>





//What is the closed-loop transfer function when the open-loop transfer function is \\frac{k_1}{1+T_1s} and the regulator is a PID controller with k_p, k_i and k_d?
  "GRAPH_ONE_POLE_WITH_PID_YR":{q:"What is the closed-loop response G<sub>YR</sub>?",pos:function(){
    let span = document.getElementById('One pole with PID R->Y');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<center><img src="images/PID_control_loop_v2.svg" width="80%"></center><br>
The closed-loop response is how the output Y responds to the input R.<br><br>
When we take our system and control it with, in this example, a PID controller, then the closed-loop response G<sub>YR</sub> will tell us how the output y(t) reacts to the reference input. The step input response graph shows a system with the reference input value 0.0 for time t&lt;0, and reference value 1.0 when t>=0. Ideally, this would make the output y(t) also resemble a step function. However, it's difficult to make an ideal controller.<br>
  <h3>How do we get the closed-loop transfer function?</h3>
  To find the closed-loop transfer function G<sub>YR</sub>(s) when the open-loop transfer function is<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
and the regulator is a PID controller with gain K, and time constants T<sub>i</sub>, and T<sub>d</sub>, we need to first derive the transfer function of the PID controller and then use the concept of feedback control. The transfer function of this PID controller is given by:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
Now, the closed-loop transfer function G<sub>YR</sub>(s) is given by the formula for the feedback system:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{G_{PID}(s) \\cdot G(s)}{1 + G_{PID}(s) \\cdot G(s)}
  </math-field><br>
where G(s) is the open-loop transfer function.
Substituting the given values, we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot (\\frac{k_1}{1+T_1s})}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot (\\frac{k_1}{1+T_1s})}
  </math-field><br>
To simplify further, we can multiply both numerator and denominator by (1+T<sub>1</sub>s) to get rid of the denominators:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K (1 + \\frac{1}{sT_i} + sT_d) \\cdot k_1}{(1 + T_1s) + K (1 + \\frac{1}{sT_i} + sT_d) \\cdot k_1}
  </math-field><br>
Let's multiply the numerator and denominator by sT<sub>i</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K (sT_i + 1 + s^2 T_i T_d) \\cdot k_1}{(s T_i + T_1 T_i s^2) + K (s T_i + 1 + s^2 T_i T_d) \\cdot k_1}
  </math-field><br>
And finally, let's collect terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YR}(s) = \\frac{K k_1 (1 + T_i s + T_iT_ds^2)}{K k_1 + T_i (1 + K k_1)s + T_i (T_1 + K k_1 T_d)s^2}
  </math-field><br>
This gives us the closed-loop transfer function G<sub>YR</sub>(s) for the given open-loop transfer function and the PID controller.`},




//Sensitivity function
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, describe the sensitivity function for a system with one pole, controlled using a PI controller. Give three examples of systems where the sensitivity function is useful. Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you don't need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_S":{q:"What is the sensitivity function, S?",pos:function(){
    let span = document.getElementById('One pole with PID Sensitivity');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The sensitivity function, S(s), tells how sensitive the closed-loop system is to changes in the process: a relative change in G gives a relative change in G<sub>YR</sub> that is S times as large. It is also the transfer function from a disturbance added at the process output to the output y. For a system with one pole controlled by a PID controller, it is defined as:
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1}{1 + G_{PID}(s)G(s)}
  </math-field><br>
      <p>where G(s) is the transfer function of the plant, and G<sub>PID</sub>(s) is the transfer function of the PID controller.</p>
      <p>The sensitivity function is particularly useful in evaluating and designing control systems to ensure robust performance. It helps in identifying how the system's output is affected by disturbances or changes in system parameters.</p>
      <h3>Examples of Systems Where the Sensitivity Function is Useful</h3>
      <ol>
          <li>Automotive Cruise Control: Helps to assess how changes in vehicle load or hill gradient affect the speed control.</li>
          <li>Temperature Regulation Systems: Important for determining how external temperature fluctuations or changes in the heating element characteristics affect the controlled temperature.</li>
          <li>Robotics: Used to evaluate how variations in load or joint stiffness influence the robot's position control accuracy.</li>
      </ol>
<h3>How do we get the sensitivity function?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for the sensitivity function above gives us:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}}
  </math-field><br>
Let's multiply by 1+T<sub>1</sub>s in both the numerator and denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{1 + T_1s}{1 + T_1s + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot k_1}
  </math-field><br>
Let's multiply by sT<sub>i</sub> in both the numerator and denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{sT_i + T_1 T_i s^2}{s T_i + T_1 T_i s^2 + K (T_i s + 1 + T_iT_d s^2) \\cdot k_1}
  </math-field><br>
And we collect the terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
      S(s) = \\frac{sT_i(1 + T_1 s)}{K k_1 + T_i (1 + K k_1) s + T_i (T_1 + K k_1 T_d) s^2}
  </math-field>`},


//Load
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, explain why the transfer function from the load (or a disturbance that is added to the input of the plant) to the output is useful when using a PID controller to control a first order system with transfer function G(s). Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you do not need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_YL":{q:"Why do we look at the Load Disturbance Transfer Function G<sub>YL</sub> in PID Control?",pos:function(){
    let span = document.getElementById('One pole with PID Load');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`<p>A load disturbance L is a disturbance that enters at the process input, added to the control signal u. Examples are a hill for a car with cruise control, or an opened window for a room temperature controller. The transfer function G<sub>YL</sub> from the load to the output tells how much such a disturbance affects the output y, and how quickly the controller removes the effect. A good controller makes |G<sub>YL</sub>| small.</p>
      For a first order system with transfer function G(s) being controlled by a PID controller, the goal is to adjust the PID parameters K, T<sub>i</sub>, and T<sub>d</sub> to achieve a balance where the system remains stable, achieves the desired speed of response, and minimizes the effect of any load or disturbance on the output.
<h3>How do we get the load-to-output transfer function G<sub>YL</sub>?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for G<sub>YL</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{G}{1 + G_{PID} \\cdot G}
  </math-field><br>
we end up with:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{\\frac{k_1}{1+T_1s}}{1 + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}}
  </math-field><br>
Let's multiply numerator and denominator with 1+T<sub>1</sub>s:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1}{(1+T_1s) + K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot k_1}
  </math-field><br>
Let's multiply numerator and denominator with sT<sub>i</sub>:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 s T_i}{(1+T_1s)sT_i + K \\left(sT_i + 1 + sT_isT_d\\right) \\cdot k_1}
  </math-field><br>
Let's get rid of the parentheses in the denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 T_i s}{sT_i + T_1T_is^2 + Kk_1T_is + Kk_1 + Kk_1T_iT_ds^2}
  </math-field><br>
Let's group our terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
G_{YL} = \\frac{k_1 T_i s}{Kk_1 + T_i(1 + Kk_1)s + T_i(T_1 + Kk_1T_d)s^2}
  </math-field><br>
...and we end up with an expression where we can insert our coefficients, and we can see that this is a second-order transfer function, since the largest power of s in the denominator is 2. Note the factor s in the numerator: G<sub>YL</sub>(0) = 0, so the integral action in the controller removes the effect of a constant load disturbance completely in steady state.
      `},



//Open-loop
//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For a student learning automatic control theory, describe what can be learnt from the open-loop transfer function G_{OL}(s) = G_{PID}(s) * G(s) when using a PID controller to control a first order system with transfer function G(s). Write your answer in HTML with LaTeX for mathematical formulas, with correct automatic control vocabulary while keeping the rest of the english simple. You do not need to make an introduction or a summary, and you do not need to include JavaScript libraries, just write the html code with the embedded LaTeX formulas."}]}'
  "GRAPH_ONE_POLE_WITH_PID_OPEN":{q:"How can we use the open-loop transfer function G<sub>OL</sub>?",pos:function(){
    let span = document.getElementById('One pole with PID open-loop');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The open-loop transfer function, G<sub>OL</sub>(s) = G<sub>PID</sub>(s)&middot;G(s), is the product of everything in the feedback loop. Even though the closed-loop behavior is what we care about, it is easier to study G<sub>OL</sub>(s), and from it we can learn:
  <ul>
      <li><strong>System Type and Order:</strong> By examining G<sub>OL</sub>(s), we can identify the overall order and type of the system. The order is determined by the highest power of s in the denominator of G<sub>OL</sub>(s). The type, defined by the number of integrators (poles at the origin), decides whether the closed-loop system can follow step, ramp, and parabolic references without steady-state error. Here, the integral part of the PID controller gives one pole at s=0, so a step reference is followed without steady-state error.</li>
      <li><strong>Closed-loop stability:</strong> The poles of G<sub>OL</sub>(s) do not decide whether the closed loop is stable (here, G<sub>OL</sub> even has a pole at s=0). Instead, the Nyquist curve or the Bode plot of G<sub>OL</sub>(s) is used with the Nyquist criterion: for an open-loop stable system, the closed loop is stable if the Nyquist curve of G<sub>OL</sub> does not encircle -1. The closed-loop poles are the roots of 1 + G<sub>OL</sub>(s) = 0.</li>
      <li><strong>Gain and Phase Margins:</strong> G<sub>OL</sub>(s) can be used to calculate the gain and phase margins, which are indicators of how much the system's gain or phase can change before the system becomes unstable. These margins are essential for designing a robust control system that can tolerate certain levels of model inaccuracies and disturbances.</li>
      <li><strong>Frequency Response:</strong> From G<sub>OL</sub>(s), the frequency response of the system can be derived, which shows how the system responds to different frequencies of input signals. The gain crossover frequency of G<sub>OL</sub> is roughly the bandwidth of the closed-loop system, so it tells how fast the closed loop will be. A high gain of G<sub>OL</sub> at high frequencies means that measurement noise is amplified.</li>
      <li><strong>PID Tuning Insights:</strong> The incorporation of G<sub>PID</sub>(s) in G<sub>OL</sub>(s) helps in tuning the PID controller's parameters K, T<sub>i</sub>, and T<sub>d</sub>. By altering these parameters and analyzing the resulting open-loop transfer function, one can achieve desired transient response characteristics (like settling time, overshoot) and steady-state performance (like steady-state error).</li>
      </ul>
<h3>How do we get the open-loop transfer function G<sub>OL</sub>?</h3>
  By combining the transfer function for our system (also known as plant, or process):<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{k_1}{1+T_1s},
  </math-field><br>
with the transfer function of a general PID controller:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
and the formula for G<sub>OL</sub> above, we get:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right) \\cdot \\frac{k_1}{1+T_1s}
  </math-field><br>
Aiming for getting one single denominator:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1}{1+T_1s} \\left(\\frac{sT_i + 1 + sT_isT_d}{sT_i}\\right)
  </math-field><br>
And multiplying these together:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1(sT_i + 1 + sT_isT_d)}{sT_i(1+T_1s)}
  </math-field><br>
Grouping the terms:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{OL}(s) = \\frac{Kk_1(1 + T_is + T_iT_ds^2)}{T_i(s+T_1s^2)}
  </math-field><br>
...and we end up with our open-loop transfer function. The reason you would want to simplify the expression as shown above is to get a formula that can be used by inserting our constants, and also to see the structure of the numerator and denominator polynomials - this is a second-order transfer function, since the highest power of s in the denominator is 2.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"In automatic control theory, why do we use PID controllers, what is the transfer function of a PID-controller? Explain why the introduction of the PID controller was such a revolution using three vivid examples. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_PID":{q:"What is a PID controller?",pos:function(){
    let span = document.getElementById('PID controller');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`In automatic control theory, PID controllers are used to regulate the behavior of a system. A PID controller combines three types of control: Proportional (P), Integral (I), and Derivative (D). These components are combined to make control decisions that help a system reach its desired setpoint efficiently and with minimal error.
The PID controller function can be described as<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
u(t)=K\\left[e(t)+\\frac{1}{T_i}\\,\\int\\limits^t\\,e(\\tau)\\,d\\tau\\,+ 
    T_d \\frac{de(t) }{ dt}\\right]=P+I+D
</math-field><br>
where u is the controller output, and e is the error, i.e. the
difference between the reference value r (the set point)
and process output y (the measured variable). The transfer function of a PID controller is given by:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
 G_{PID}(s) = K \\left(1 + \\frac{1}{sT_i} + sT_d\\right)
  </math-field><br>
  Where: G<sub>PID</sub>(s) is the transfer function in the Laplace domain, K is the gain of the controller, T<sub>i</sub> is the integral time, T<sub>d</sub> is the derivative time, and s is the complex frequency variable in the Laplace transform.<br><br>
<center><img src="images/PID_control_loop_v2.svg" width="80%"></center><br>
The PID controller is usually connected in a feedback loop as in the image above, responding to the error e, and producing a suitable input signal U to the system trying to make the output Y as similar to the reference signal R as possible.<br><br>
  The PID controller has been used for about a century. One of the first analyses was by Nicolas Minorsky in 1922, for the automatic steering of ships. It is still by far the most common controller in industry. Some examples:
  <h3>Improved Stability and Performance in Industrial Control Systems</h3>
  <div>The introduction of PID controllers allowed for significant improvements in the stability and performance of industrial control systems. For example, in a chemical processing plant, maintaining the temperature at a specific point is crucial for the quality of the product. A PID controller can take the temperature readings (process variable), compare it to the desired setpoint, and adjust the heat input (control variable) proportionally (P), based on the accumulated error over time (I), and on how fast the error changes (D), which acts like a short-term prediction of the error. Well-tuned control limits the overshoot and helps maintain the temperature within a very narrow range, leading to consistent product quality.</div>
  <h3>Automation in Automotive Systems</h3>
  <div>PID controllers have been fundamental in the automation of various systems within the automotive industry, notably in cruise control. Traditional systems could struggle with maintaining a set speed over varying terrains. Through the application of PID control, a vehicle can automatically adjust the throttle position to maintain the set speed as closely as possible, considering changes in road gradient and load. For example, when the car starts driving uphill, the speed drops below the set speed, and the controller opens the throttle. The integral part keeps increasing the throttle until the speed error is gone, even though the hill needs more power than flat road.</div>
  <h3>Flight Control Systems</h3>
  <div>In aerospace, the precision and reliability of PID controllers have enabled advancements in flight control systems. Automatic altitude control is a pertinent example. A PID controller can continuously adjust the aircraft's control surfaces to maintain a target altitude, taking into account the varying aerodynamic forces and disturbances. This capability is crucial not only for passenger comfort but also for reducing pilot workload, especially during long-haul flights or when flying through turbulent weather conditions.</div><br>`},
//  In conclusion, the PID controller's ability to combine real-time error correction with predictive and historical data makes it a versatile and powerful tool in automatic control theory. Its widespread adoption across various industries underscores its importance in enhancing control system performance, stability, and efficiency.





//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a one-pole system when we start with the differential equation. Use an example of heating water. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_ONE_REAL_POLE":{q:"How do we get this transfer function for one pole?",pos:function(){
    let span = document.getElementById('One real pole');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's derive the transfer function G(s) of a one-pole system, using the example of heating water in a tank. The water is heated with the power P(t), and it loses heat to the surroundings, which have the constant temperature &theta;<sub>a</sub>.<br><br>
  <h3>Step 1: Differential Equation</h3>
  The energy balance says that the stored heat changes with the heating power minus the heat loss:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  C\\frac{d\\theta}{dt} = P(t) - \\frac{\\theta(t)-\\theta_a}{R}
  </math-field><br>
  where,<br>
  - &theta; is the temperature of the water,<br>
  - C is the heat capacity of the water (J/K),<br>
  - R is the thermal resistance between the water and the surroundings (K/W),<br>
  - P(t) is the heating power (W).<br><br>
  Let y(t) = &theta;(t) - &theta;<sub>a</sub> be the temperature above the surroundings. Multiplying by R gives<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  RC\\frac{dy}{dt} + y(t) = R\\,P(t)
  </math-field><br>

  <h3>Step 2: Laplace Transform</h3>
  The Laplace transform of dy/dt is sY(s) - y(0). We assume that the water starts at the temperature of the surroundings, y(0) = 0, which gives<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  RCs\\,Y(s) + Y(s) = R\\,P(s)
  </math-field><br>

  <h3>Step 3: Transfer Function</h3>
  The transfer function G(s) is the ratio of the output to the input in the Laplace domain, with zero initial conditions:<br>
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{Y(s)}{P(s)} = \\frac{R}{1+RCs} = \\frac{k_1}{1+T_1s}
  </math-field><br>
  with the static gain k<sub>1</sub> = R and the time constant T<sub>1</sub> = RC. The pole is at s = -1/T<sub>1</sub>.<br><br>
  If the heater is switched on with a constant power P<sub>0</sub>, the temperature rises as y(t) = k<sub>1</sub>P<sub>0</sub>(1 - e<sup>-t/T<sub>1</sub></sup>): it approaches k<sub>1</sub>P<sub>0</sub> and has reached 63% of that after the time T<sub>1</sub>. A better insulated tank (larger R) gets both a higher final temperature and a longer time constant.<br><br>
  Without any heat loss (R &rarr; &infin;), the equation becomes C d&theta;/dt = P(t), and the transfer function becomes 1/(Cs), an integrator with the pole at s = 0. Then the temperature would keep rising for as long as the heater is on.`},


//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a two-pole system with real valued poles when we start with the differential equation. Use an example of suspension system in a car. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TWO_REAL_POLES":{q:"How do we get this transfer function for two real poles?",pos:function(){
    let span = document.getElementById('Two real poles');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's walk through the process of deriving the transfer function G(s) for a two-pole system, taking a car suspension system as an illustrative example. In an automatic control context, a suspension system aims to minimize the impact of road bumps on the car's body, enhancing passenger comfort. This system can be simplified to a mass-spring-damper model. Whether the two poles become real or complex depends on how strong the damping is.

  <h3>Step 1: Define the Physical System</h3>
  Consider a car suspension system simplified as: m is the mass of the car body, c is the damping coefficient (represents the shock absorber), k is the spring constant. The input is an external force F(t) acting on the car body. (Road bumps really move the wheel, which acts on the body through the spring and the damper, but a force input keeps the example simple.) The displacement of the mass from its equilibrium position is x(t).

  <h3>Step 2: Write the Differential Equation</h3>
  The dynamics of the system can be captured by the second-order differential equation derived from Newton's second law of motion:
  <math-field read-only style='vertical-align:bottom;display:inline-block'>
  m\\frac{d^2x(t)}{dt^2} + c\\frac{dx(t)}{dt} + kx(t) = F(t)
  </math-field><br>

  <h3>Step 3: Laplace Transform</h3>
  To find the transfer function G(s), we apply the Laplace transform to the differential equation, assuming zero initial conditions.<br>
  Laplace transforms of derivatives are<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\mathcal{L}\\left\\{\\frac{d^n f(t)}{dt^n}\\right\\} = s^n F(s) - s^{n-1}f(0) - ... - f^{(n-1)}(0),
</math-field><br>
  where f(0) and its derivatives up to (n-1) are initial conditions and are zero in our case.
  Applying the Laplace transform gives:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  ms^2X(s) + csX(s) + kX(s) = F(s)
</math-field><br>

  <h3>Step 4: Derive the Transfer Function</h3>
  The transfer function G(s) is defined as the output over the input in the Laplace domain, where the output is X(s) and the input is F(s).<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{X(s)}{F(s)} = \\frac{1}{ms^2 + cs + k}
</math-field><br>

  <h3>Step 5: Identify the Poles</h3>
  The poles of the system are the roots of the characteristic polynomial in the denominator of G(s):<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  ms^2 + cs + k = 0
</math-field><br>

  The solutions to this quadratic equation are:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\frac{-c \\pm \\sqrt{c^2 - 4mk}}{2m}
</math-field><br>

  The poles are real when c<sup>2</sup> &gt; 4mk, that is, when the damping is strong, and complex when the damping is weak.<br><br>
  As an example, let's say our suspension system has mass m=1000&nbsp;kg, damping coefficient c=6000&nbsp;Ns/m, and spring constant k=5000&nbsp;N/m.
  Then the transfer function becomes:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{1}{1000s^2 + 6000s + 5000}
</math-field><br>
  And the poles are:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = \\frac{-6000 \\pm \\sqrt{6000^2 - 4 \\cdot 1000 \\cdot 5000}}{2 \\cdot 1000} = \\frac{-6000 \\pm 4000}{2000}
</math-field><br>
  that is, two real poles at s = -1 and s = -5. Factoring the denominator, 1000s<sup>2</sup> + 6000s + 5000 = 1000(s+1)(s+5) = 5000(1+s)(1+0.2s), gives the form used in LU-PZE:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{0.0002}{(1+s)(1+0.2s)} = \\frac{k_2}{(1+T_2s)(1+T_3s)}
</math-field><br>
  with k<sub>2</sub> = 1/k = 0.0002&nbsp;m/N, T<sub>2</sub> = 1&nbsp;s and T<sub>3</sub> = 0.2&nbsp;s. Such a strongly damped suspension would feel stiff. Real car suspensions have weaker damping and complex poles, so that the car "bounces" slightly before settling, as in the "Two complex poles" example.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the transfer function G(s) of a two-pole system with complex valued poles when we start with the differential equation. Use an example of Pendulum Dynamics (Small Angle Approximation) - Described by d<sup>2</sup>&theta;/dt<sup>2</sup> + g/l * &theta; = 0, where g is the acceleration due to gravity and l is the pendulum length.</li>. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TWO_COMPLEX_POLES":{q:"How do we get this transfer function for two complex poles?",pos:function(){
    let span = document.getElementById('Two complex poles');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`Let's derive the transfer function G(s) of a system with complex-valued poles, using the example of a pendulum with small swings.
  <h3>Step 1: Differential Equation</h3>
  For a pendulum with friction, driven by an input u(t), the equation of motion under the small angle approximation (sin &theta; &asymp; &theta;) is:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  \\frac{d^2\\theta}{dt^2} + d\\frac{d\\theta}{dt} + \\frac{g}{l}\\theta = u(t),
</math-field><br>
  where &theta; is the angle (in radians), g is the acceleration due to gravity (m/s<sup>2</sup>), l is the length of the pendulum (m), d describes the friction (1/s), and u(t) is the applied torque divided by the moment of inertia ml<sup>2</sup>.<br>

  <h3>Step 2: Laplace Transform</h3>
  The Laplace transform of the second derivative is s<sup>2</sup>&Theta;(s) - s&theta;(0) - &theta;'(0), where &Theta;(s) is the Laplace transform of &theta;(t). With zero initial conditions, &theta;(0)=0 and d&theta;/dt(0)=0, we get:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s^2\\Theta(s) + ds\\Theta(s) + \\frac{g}{l}\\Theta(s) = U(s).
</math-field><br>

  <h3>Step 3: Transfer Function</h3>
  The transfer function is the ratio of the output &Theta;(s) to the input U(s):<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  G(s) = \\frac{\\Theta(s)}{U(s)} = \\frac{1}{s^2 + ds + \\frac{g}{l}}.
</math-field><br>
  Comparing with the form used in LU-PZE, k<sub>3</sub>w<sup>2</sup>/(s<sup>2</sup>+2zws+w<sup>2</sup>), we see that the natural frequency is w = √(g/l), the relative damping is z = d/(2w), and the static gain is k<sub>3</sub> = 1/w<sup>2</sup> = l/g.

  <h3>Step 4: Poles</h3>
  The poles are the roots of s<sup>2</sup> + 2zws + w<sup>2</sup> = 0:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
  s = -zw \\pm iw\\sqrt{1-z^2}.
</math-field><br>
  For z &lt; 1 (little friction), these are complex-valued poles, and the pendulum swings with a damped oscillation. Without friction (d = 0, z = 0), the poles are s = &plusmn;i√(g/l) on the imaginary axis, and the pendulum swings forever. For a pendulum of length l = 1&nbsp;m, w = √9.81 &asymp; 3.1&nbsp;rad/s, which gives a period of 2&pi;/w &asymp; 2.0&nbsp;s.`},



//curl https://api.openai.com/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" -d '{"model":"gpt-4-turbo-preview","messages":[{"role":"user","content":"For an automatic control theory student, show how we get the laplace transform of a time delay in a one-pole system. Write your answer using HTML and LaTeX, with correct automatic control vocabulary while keeping the rest of the english simple."}]}'
  "GRAPH_TIME_DELAY":{q:"How do we get this transfer function for a time delayed system?",pos:function(){
    let span = document.getElementById('Time delay');
    if (span!=null){
      let rect = span.getBoundingClientRect();
      let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
      let scroll_y = window.pageYOffset || document.documentElement.scrollTop
      return {visible:true,x:scroll_x + rect.left + rect.width/2,y:scroll_y + rect.top + rect.height/2};
    } else {
      return {visible:false};
    }
  },a:`The Laplace transform of a function f(t), where t represents time, is given by:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
F(s) = \\mathcal{L}\\{f(t)\\} = \\int_{0}^{\\infty} e^{-st}f(t)\\, dt
</math-field><br>
Here, s is a complex frequency variable, and F(s) is the Laplace transform of f(t), representing the function in the s-domain.<br><br>
A time delay L means that the output is the input delayed by L: y(t) = u(t-L). We assume that u(t) = 0 for t &lt; 0, so that y(t) = 0 for t &lt; L. Substituting &tau; = t - L in the Laplace integral gives the time shift theorem:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
Y(s) = \\int_{L}^{\\infty} e^{-st}u(t-L)\\, dt = e^{-sL}\\int_{0}^{\\infty} e^{-s\\tau}u(\\tau)\\, d\\tau = e^{-sL}\\,U(s)
</math-field><br>
So the transfer function of a pure time delay is e<sup>-sL</sup>.<br><br>
For systems in series, the transfer functions are multiplied. The example in LU-PZE is a one-pole system with static gain 3 and time constant 1&nbsp;s, followed by the time delay L:<br>
<math-field read-only style='vertical-align:bottom;display:inline-block'>
G(s) = \\frac{3}{1+s}e^{-Ls}
</math-field><br>
Its step response is the step response of 3/(1+s), 3(1-e<sup>-t</sup>), shifted L seconds to the right: nothing at all happens during the first L seconds.
`},

//To describe the process of obtaining the Laplace transform of a time delay in a one-pole system, we'll begin with the basics and then move into the specific scenario you're asking about. Time delays are common in control systems and understanding their impact is crucial for designing effective controllers.\n\n### What is a Time Delay?\n\nIn automatic control, a time delay (often denoted as \\(T_d\\) or \\(\\tau\\)) represents a period during which the response of a system is deferred. This can occur due to physical limitations, processing times, or transport phenomena among others. Time delays are especially critical in control theory because they can significantly affect the stability and performance of control systems.\n\n
//### Conclusion. In the context of a one-pole system with a time delay, applying the Laplace transform allows us to convert the time-domain behavior, including the delay effect, into the s-domain. This is crucial for analyzing and designing control systems, as working in the s-domain can simplify many aspects of controller design, including stability and performance analysis.
//<p>The Laplace transform of a time-delayed one-pole system is represented as:</p>
//<p>\\(F(s, T_d) = e^{-T_ds} \\cdot \\frac{1}{s+a}\\)</p>
//<p>This formula combines the effects of the system's dynamics and the time delay into a single s-domain expression, facilitating the analysis and design of control systems dealing with delays.</p>
//This representation offers a clear picture of how the time delay affects the system’s behavior in the frequency domain, providing valuable insights for control engineers.


};
function enable_questions(){
  have_asked_questions=true;
  remove_banner_if_needed();
  questions_enabled = true;
  let questions_icon_svg = document.getElementById("questions_icon_svg");
  questions_icon_svg.style.fill="#5050ff";
  let s="";
  // Find out the placement of question icons:
  for (let q_id in all_questions){
    let q_position = all_questions[q_id].pos();
    if (q_position.visible){
      s += "<div class='question_div' id='"+q_id+"' style='top:"+(q_position.y+6)+"px;left:"+(q_position.x+4)+"px;'>";
//      s += '<svg fill="#ffff00a0" width="100px" height="100px" viewBox="0 0 24 24"><use href="#icon_help"/></svg>';
      s += '<img src="images/question_small.webp" width="100px" style="opacity:0.8">';
      s += "</div>";
    }
  }
  // Find out the placement of question icons for tasks in assignments:
  for (let task_id in all_tasks){
    if (all_tasks[task_id].a!=null){ // Yes, there is an answer connected to this task:
      let span = document.getElementById('task_'+task_id);
      if (span!=null){
        let rect = span.getBoundingClientRect();
        let scroll_x = window.pageXOffset || document.documentElement.scrollLeft;
        let scroll_y = window.pageYOffset || document.documentElement.scrollTop;
        let x=scroll_x + rect.left + rect.width/2;
        let y=scroll_y + rect.top + rect.height/2;
        s += "<div class='question_div' id='icon_task_"+task_id+"' style='top:"+(y+6)+"px;left:"+(x+4)+"px;'>";
        s += '<img src="images/question_small.webp" width="100px" style="opacity:0.8">';
        s += "</div>";
      }
    }
  }
  let questions_div=document.getElementById("questions_div");
  questions_div.innerHTML=s;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML="";
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.remove('active');
}
function disable_questions(){
  questions_enabled = false;
  let questions_icon_svg = document.getElementById("questions_icon_svg");
  questions_icon_svg.style.fill=null;
  let questions_div=document.getElementById("questions_div");
  questions_div.innerHTML="";
  let hover_answer = document.getElementById("hover_answer");
  hover_answer.style.visibility="hidden";
  hover_answer.innerHTML="";
  last_hover_answer_id="";
}

function answerToggle(event){
  add_event("answer_toggle");
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.toggle('active');
}

function show_answer (q_id){
  // Show a box with the text for the q_id question:
  let s="";
  s+="<h2>" + all_questions[q_id].q + "</h2>";
  s+=all_questions[q_id].a;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML=s;
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.add('active');
}

function show_answer_to_task(task_id){
  add_event("show_answer_to_task="+task_id);
  // Show a box with the text for the task_id task:
  let s="";
  s+=all_tasks[task_id].a;
  let answer_text_div = document.getElementById("answer_text");
  answer_text_div.innerHTML=s;
  let toggleElement = document.querySelector('.answer');
  toggleElement.classList.add('active');
  toggleElement.style.animation = 'none';
  toggleElement.offsetHeight; /* trigger reflow */
  toggleElement.style.animation="slidein 1.0s ease-out 1";
  let placement=all_tasks[task_id].placement;
  toggleElement.style.top=null;
  toggleElement.style.bottom=null;
  toggleElement.style.left=null;
  toggleElement.style.right=null;
  if (placement==null){
    toggleElement.style.top="30%";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="UL"){
    toggleElement.style.top="5%";
    toggleElement.style.left="3%";
  } else if (placement=="UC"){
    toggleElement.style.top="5%";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="UR"){
    toggleElement.style.top="5%";
    toggleElement.style.right="390px";
  } else if (placement=="DL"){
    toggleElement.style.bottom="120px";
    toggleElement.style.left="3%";
  } else if (placement=="DC"){
    toggleElement.style.bottom="120px";
    toggleElement.style.left="32.5%";  //50%-35%/2
  } else if (placement=="DR"){
    toggleElement.style.bottom="120px";
    toggleElement.style.right="390px";
  }
}





// ---------------- end of questions and answer code

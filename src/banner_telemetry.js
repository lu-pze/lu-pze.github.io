'use strict';

// --------------------- banner

let have_asked_questions=false;
let banner_is_visible=false;
function prepare_banner (){
  setTimeout(trigger_banner,60*1000);
}

function trigger_banner (){
  if (have_asked_questions==false){
    if (this_is_a_touch_device==false){
      if (quiz_is_running!=0) {
        // Don't show the banner if a quiz is ongoing.
        // Instead, schedule the banner to appear later.
        setTimeout(trigger_banner,120*1000);
        return;
      }
      banner_is_visible=true;
      const banner=document.getElementById("banner");
      banner.innerHTML='<img src="images/Right_click_banner_small.webp" alt="Right click to ask questions!" class="banner" width="45%"><img src="images/Right_click_banner_small.webp" width="45%" style="visibility:hidden">';
      banner.style.animation = 'none';
      banner.offsetHeight; /* trigger reflow */
      banner.style.animation="banner_anim_in 7s ease-out 1";
      add_event("banner_enter");
    }
  }
}

function remove_banner_if_needed (){
  if (banner_is_visible==true){
    banner_is_visible = false;
    banner.innerHTML='<img src="images/Right_click_banner_small.webp" alt="Right click to ask questions!" class="banner" width="45%">';
    banner.style.animation = 'none';
    banner.offsetHeight; /* trigger reflow */
    banner.style.animation="banner_anim_out 5s ease-out 1";
    banner.style.opacity = 0.0;
    add_event("banner_removed");
  }
}

// --------------------- end of banner code
// --------------------- start of improvement code

let improvement_enabled = true;
const TRACKING_OFF_COOKIE = "tracking_off"; // Only remembers the choice, and is never sent anywhere.
const TRACKING_OFF_COOKIE_DAYS = 365;

var pending = [];
var event_no = 0;
var periodic_timer_id = 0;
let client_id = Math.random()*2**31>>>0; // A pretty random 31-bit uint id
let client_nick = "";
let client_place = "";
let client_cookid = -1;

// The checkbox on the splash screen. Turning tracking off also drops what is queued and the id.
function set_tracking_enabled(enabled) {
  improvement_enabled = enabled;
  if (enabled) {
    set_cookie(TRACKING_OFF_COOKIE, "", -1);
    identify_client();
    return;
  }
  set_cookie(TRACKING_OFF_COOKIE, "1", TRACKING_OFF_COOKIE_DAYS);
  set_cookie("cookid", "", -1);
  client_cookid = -1;
  pending = [];
  clearTimeout(periodic_timer_id);
  periodic_timer_id = 0;
}

function add_event (string) {
  if (debug_mode) console.log("Event:"+string);
  if (improvement_enabled == false) return;
  let date_now = new Date();
  let now = date_now.getTime();
  let time_diff = now-session_started_at;
  let mseconds_elapsed = Math.floor(time_diff);
  let thestring = `E${event_no};T${mseconds_elapsed/1000};`;
  let delay = 5000;
  if (string !== "") {
    string = string.replaceAll(";","_");
    thestring += "A" + string + ";";
    if (periodic_timer_id !== 0) {
      clearTimeout(periodic_timer_id);
    }
    periodic_timer_id = 0;
    delay = 1500;
  }
  event_no++;
  pending.push(thestring);
  if (periodic_timer_id === 0) {
    periodic_timer_id = setTimeout(periodic_send, delay);
  }
}

var server_error = "";

function periodic_send () {
  periodic_timer_id = 0;
  if (pending.length > 0) {
    let date_now = new Date();
    let now = date_now.getTime();
    let time_diff = now-session_started_at;
    let mseconds_elapsed = Math.floor(time_diff);
    var XHR = new XMLHttpRequest();
    var to_send = `T${mseconds_elapsed/1000};U${client_id};L${client_place}_${client_nick};`;
    for (var pending_no = 0; pending_no < pending.length; pending_no++) {
      to_send += pending[pending_no];
    }
    var urlEncodedData = `e=${encodeURIComponent(to_send).replace(/%20/g, "+")}`;
    // Define what happens on successful data submission
    XHR.addEventListener("load", (event) => {
      // We got an answer.
      //console.log("Got answer:" + event.target.response);
      // Let's see if there is anything to erase from our pending queue:
      if (event.target.status === 200) {
        // HTTP OK
        var response = event.target.response;
        //if (debug_mode) console.log("RESP=" + response);
        if (response.startsWith("ERROR")) {
          server_error = response;
        } else if (response.startsWith("E")) {
          var done_up_until = -1;
          var resplit = response.split(";");
          for (var res in resplit) {
            if (resplit[res].startsWith("E")) {
              done_up_until = Number(resplit[res].substr(1).replace(/;/g, ""));
            } else if (resplit[res].startsWith("CID")) {
              client_id = Number(resplit[res].substr(3).replace(/;/g, ""));
            }
          }

          // And now, remove all events in pending up until this number:
          var done = false;
          while (pending.length > 0 && done === false) {
            if (Number(pending[0].substr(1, pending[0].indexOf(";") - 1)) <= done_up_until) {
              pending.shift();
            } else {
              done = true;
            }
          }
        }
        // Now, if there's still events pending, let's setup another try:
        if (pending.length > 0) {
          if (periodic_timer_id === 0) {
            periodic_timer_id = setTimeout(periodic_send, 20000);
          }
        }
      }
    });
    XHR.addEventListener("error", (event) => {
      console.log("Error");
      console.log(event);
    });
    // Helping making LU-PZE better:
    XHR.open("POST", "https://livet.se/lu-pze.php", true);
    XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    XHR.send(urlEncodedData);
    //if (debug_mode) console.log("S:" + urlEncodedData);
  }
}

// --------------------- end of improvement code

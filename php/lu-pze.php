<?php
$timestamp = time(); // This is what global_time is referenced to
date_default_timezone_set('Europe/Copenhagen');
header('HTTP/1.1 200 OK');
//Set compact cookie policy:
header('P3P: CP="NOI ADM DEV PSAi COM NAV OUR OTRo STP IND DEM"');

// CORS Allow from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
  // Decide if the origin in $_SERVER['HTTP_ORIGIN'] is one
  // you want to allow, and if so:
  header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Max-Age: 86400');    // cache for 1 day
}
// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
    // may also be using PUT, PATCH, HEAD etc
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  }
  if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
    header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
  }
  exit(0);
}

$POST_VARS = isset($_POST) ? $_POST : $HTTP__POST;
$now = date("Y-m-d H:i:s");
function clean_input($str) {
  $str = trim($str);
  $str = stripslashes($str);
  return $str;
}

if(isset($POST_VARS['e'])) {
  $e = clean_input($POST_VARS['e']);

  // parse every single event,
  if (preg_match("#^T(?P<global_time>[0-9.]+);U(?P<client_id>[a-z0-9\-]*);L(?P<client_name>[a-zA-Z0-9_]*);(?P<events>.*)$#i", $e, $m) == 1) {
    $extra_info_to_send_to_client = "";
    $global_time = $m['global_time'];
    $client_id = (int)$m['client_id'];
    $client_name = $m['client_name'];
    $events = $m['events'];

    $filename = "/home/pex/web/se.livet/data/lu-pze/lu-pze_log_s".$client_id.".txt";
    $file = fopen($filename, "a");
    fwrite($file, $e."\n");
    fclose($file);

    // Let's loop through all events:
    $done = false;
    while (preg_match("#^E(?P<event_no>[0-9]+);T(?P<event_time>[0-9.]+);(?P<more_events>.*)$#i", $events, $m) == 1) {
      $event_no = $m['event_no'];
      // $global_time is the number of seconds in the user's session.
      // We can use this to backwards "time" the events.
      $answer = '';
      $events = $m['more_events'];
      if (preg_match("#^A(?P<answer>[^;]+);(?P<more_events>.*)$#i", $events, $m) == 1) {
        $answer = $m['answer'];
        $events = $m['more_events'];
      }
      echo "";
    }
    // Report back to javascript that we've heard these events:
    echo 'E'.$event_no.';'.$extra_info_to_send_to_client;
  }
}
?>
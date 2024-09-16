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
  $filename = "/home/pex/web/se.livet/data/lu-pze/_highscores.txt";
  $file = fopen($filename, "a");
  fwrite($file, $e."\n");
  fclose($file);
  // Report back to javascript:
  echo 'OKEY';
}
?>
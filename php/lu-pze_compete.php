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

$filename = "/home/pex/web/se.livet/data/lu-pze/_highscores.txt";
if(isset($POST_VARS['e'])) {
  $e = clean_input($POST_VARS['e']);
  // We can get some static info here.
  $info = "";
  $info .= "#ip=".$_SERVER['REMOTE_ADDR'].",";
  if (isset($_SERVER['HTTP_CLIENT_IP'])) {
    $info .= "#ip_cip=".$_SERVER['HTTP_CLIENT_IP'].",";
  }
  if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $info .= "#ip_xff=".$_SERVER['HTTP_X_FORWARDED_FOR'].",";
  }
  if (isset($_SERVER['HTTP_X_FORWARDED'])) {
    $info .= "#ip_xf=".$_SERVER['HTTP_X_FORWARDED'].",";
  }
  if (isset($_SERVER['HTTP_FORWARDED_FOR'])) {
    $info .= "#ip_ff=".$_SERVER['HTTP_FORWARDED_FOR'].",";
  }
  if (isset($_SERVER['HTTP_FORWARDED'])) {
    $info .= "#ip_f=".$_SERVER['HTTP_FORWARDED'].",";
  }
  $info .= "#port=".$_SERVER['REMOTE_PORT'].",";
  $info .= "#ref=".$_SERVER['HTTP_REFERER'].",";
  $info .= "#server_time=".date('Y/m/d H:i:s').".";

  $file = fopen($filename, "a");
  fwrite($file, $e.$info."\n");
  fclose($file);
}

if (file_exists($filename)) {
  $fileHandle = fopen($filename, 'r');
  if ($fileHandle) {
    $lines = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    for ($i = 0; $i < count($lines); $i++) {
      $line = $lines[$i];
      // Filter out stuff that client doesn't need to build a highscore table:
      $line = preg_replace('/#ip_xff=\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3},/','',$line);
      $line = preg_replace('/#ip=\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3},/','',$line);
      $line = preg_replace('/#port=\d+,/','',$line);
      echo $line."\n";
    }
    fclose($fileHandle);
  } else {
    echo "Error: Unable to open the highscore file.";
  }
} else {
  echo "Error: Highscore file does not exist.";
}
?>

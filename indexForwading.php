<?php
/* Redirect browser */
header("HTTP/1.1 307 Temporary Redirect");
header("Location: http://198.199.111.138/");
 
/* Make sure that code below does not get executed when we redirect. */
exit;
?>

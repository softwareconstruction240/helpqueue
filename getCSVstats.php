<?php
require_once 'CAS-1.3.4/CAS.php';

// Enable debugging
//phpCAS::setDebug();
// Enable verbose error messages. Disable in production!
phpCAS::setVerbose(false);

// Initialize phpCAS
phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');


// check CAS authentication
$auth = phpCAS::checkAuthentication();

if($auth)
{
	require_once("DBConnect.php");
	$thisUsersID = phpCAS::getUser();
	if(verifyTA($thisUsersID))
	{
		$array = getStats();

		date_default_timezone_set ("America/Denver");
		$fileName = 'QUEUE CSV '.(string)date("g:i:s A n/d/y").'.csv';
		 
		header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
		header('Content-Description: File Transfer');
		header("Content-type: text/csv");
		header("Content-Disposition: attachment; filename={$fileName}");
		header("Expires: 0");
		header("Pragma: public");
		 
		$fh = @fopen( 'php://output', 'w' );

		$headerDisplayed = false;
		$headers = array("NetId", "Name", "Help Count", "Pass Off Count");
		fputcsv($fh, $headers);	
		foreach($array["students"] as $row)
		{
			fputcsv($fh, $row);	
		}

		// Close the file
		fclose($fh);
		// Make sure nothing else is sent, our file is done
		exit;


	}
	else
	{
		echo "Not authorized";
	}
}
else
{
	echo "Not BYU authorized";
}
?>

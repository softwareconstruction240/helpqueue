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
		$netId = isset($_GET["netId"]) ? $_GET["netId"] : null;
		$startTime = isset($_GET["startTime"]) ? $_GET["startTime"] : null;
		$endTime = isset($_GET["endTime"]) ? $_GET["endTime"] : null;
		echo json_encode(getExtendedStats($netId, $startTime, $endTime));
	}
	else
	{
		echo json_encode(array("status"=>"Not authorized"));
	}
}
else
{
	echo json_encode(array("status"=>"Not BYU authorized"));
}
?>

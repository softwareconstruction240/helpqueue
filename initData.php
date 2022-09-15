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
		echo json_encode(getInitValues(true, $thisUsersID));
	}
	else
	{
		echo json_encode(getInitValues(false, $thisUsersID));
	}
}
else
{
	echo json_encode(array("status"=>"Not BYU authorized"));
}
?>

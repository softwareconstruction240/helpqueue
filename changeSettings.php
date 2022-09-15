<?php

	if(isset($_POST["key"]) && isset($_POST["value"]))
	{
		require_once 'CAS-1.3.4/CAS.php';

		// Initialize phpCAS
		phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');
		$auth = phpCAS::checkAuthentication();	
		require_once 'DBConnect.php';
		if(verifyTA(phpCAS::getUser()))
		{
			echo json_encode(changeSetting($_POST["key"], $_POST["value"]));
		}
		else
		{
			echo json_encode(array("status"=>"error", "message"=>"not authorized"));
		}
	}
	else
	{
		echo json_encode(array("status"=>"error", "message"=>"not authorized"));
	}

?>

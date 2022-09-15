<?php
	require_once 'CAS-1.3.4/CAS.php';

	// Initialize phpCAS
	phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');
	$auth = phpCAS::checkAuthentication();
	
	if($auth)
	{
		if(isset($_POST["username"]) && isset($_POST["action"]))
		{
			require_once "DBConnect.php";	
			if(verifyTA(phpCAS::getUser()))
			{
				if($_POST["action"] == "toggleTAActive")
				{
					echo json_encode(array("stats"=>toggleTAActive($_POST["username"]), "list"=>array()));
				}
				else if ($_POST["action"] == "addTA")
				{
					echo json_encode(array("stats"=>addTA($_POST["username"], $_POST["name"]), "list"=>array()));
				}
				else
					echo json_encode(array("status"=>"error", "message"=>"mal formed post"));
			}
			else
			{
				echo json_encode(array("status"=>"error", "message"=>"You are not authorized to preform that action"));
			}	
		}
	}
	else
	{
		echo json_encode(array("status"=>"error", "message"=>"not logged in"));
	}

?>

<?php

if(isset($_GET["id"])) //only get one person
{
	$user = $_GET["id"];

		//check if byu cas returns $auth = true. if not return {status:loggedOut} else whats already here
		require_once 'CAS-1.3.4/CAS.php';
		phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');
		$auth = phpCAS::checkAuthentication();
		
		if($auth && $user == phpCAS::getUser())
		{
			require_once "DBConnect.php";
			if(verifyTA($user))
			{

				$avgs = getAverages(null);
				echo json_encode(array("status"=>"success", "list"=>getQueue(null), "stats"=>getStats(), "avgs"=>$avgs, "settings"=>getSettings()));
			}
			else
			{
				$temp = getUserStatus($user);
				echo json_encode($temp);
			}		
		}
		else
		{
			echo json_encode(array("status"=>"loggedOut"));
		}	
	
	//send back the info
}
else
	echo json_encode(array("status"=>"error:no id supplied"));
?>

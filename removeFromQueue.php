<?php

	if(isset($_POST["username"]))
	{
		//see if the person is already on the list. if so proceed other wise return "user not on list"

		//IF	see if the person logged in is the same as the person being reuqested to remove 
		//	if so remove but don't increment counter	

		
		//ELSE	see if the logged in user is on the TA table
			//if yes then increment their counter and remove from the list
		require_once "DBConnect.php";		
		echo json_encode(dequeueUser($_POST["username"]));

		//echo json_encode(array("status"=>"success", "user"=>$user, "spot"=>"6");
	}
	else
	{
		echo json_encode(array("status"=>"error", "message"=>"username missing from post"));
	}

?>

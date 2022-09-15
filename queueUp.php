<?php

	if(isset($_POST["username"]))
	{
		//see if the person is already on the list. if so echo "already on list

		//get the current time

		//add the user to the db

		//echo the same info as getStatus (user name, spot in line, and time queued up)
		require_once 'DBConnect.php';
		echo json_encode(enqueue($_POST["username"], $_POST["question"], $_POST["passOff"], $_POST["zoomLink"]));

		//echo json_encode(array("status"=>"success", "user"=>$user, "spot"=>rand(3,5), "enqueueTime"=time()));
	}
	else
	{
		echo json_encode(array("status"=>"error", "message"=>"username required in post"));
	}

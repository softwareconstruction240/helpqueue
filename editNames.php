<?php
	require_once 'CAS-1.3.4/CAS.php';
	require_once 'DBConnect.php';
	// Initialize phpCAS
	phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');
	$auth = phpCAS::checkAuthentication();
	
	if ($_SERVER['REQUEST_METHOD'] === 'POST')
	{
		echo json_encode(updateName(phpCAS::getUser(), $_POST['name'], $_POST['netId']));
	}
	else if ($_SERVER['REQUEST_METHOD'] === 'GET')
	{
		echo json_encode(getNameStatus(phpCAS::getUser()));
	}
	else
		echo "ERROR";
?>

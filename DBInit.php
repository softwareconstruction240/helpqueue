<?php
	//require a CAS log in
	require_once 'CAS-1.3.4/CAS.php';
	phpCAS::client(CAS_VERSION_2_0,'cas.byu.edu',443,'cas');
	$auth = phpCAS::checkAuthentication();
	if(!file_exists('database.sqlite'))
	{
		//echo "This API is to clear an exsising database. There currenlty is no database " .
		//	"file found. Go to the home page, which will set up the initial database";
		require_once "DBConnect.php";		
		$db = new MyDB();
		echo json_encode(array("status"=>"Successfully created the DB"));
		exit();
	}
	else
	{
		if (isset($_REQUEST['logout'])) {
			phpCAS::logout();
		}
		if (isset($_REQUEST['login'])) {
			phpCAS::forceAuthentication();
		}
	
		if($auth)
		{
			try
			{
				require_once "DBConnect.php";
				//check the supplied userID is the same as the logged in user
				if(verifyTA(phpCAS::getUser()))
				{
					if($_POST["confirmed"] == true)
					{
						$r = getNameStatus(phpCAS::getUser());
						$name = $r["name"];
						
						//a TA has authorized the reseting of the database
						if(unlink('database.sqlite'))
						{
							$db = new MyDB();
							updateName(phpCAS::getUser(), $name);
							echo json_encode(array("status"=>"Successfully re-created the DB"));
						}
						else
							echo json_encode(array("status"=>"Error removing old DB"));
					}
					else
					{
						echo json_encode(array("status"=>"reset not confirmed"));
					}
				}
				else
				{
					echo json_encode(array("status"=>"You are not authorized to make that call"));
				}
			}
			catch(CAS_OutOfSequenceBeforeClientException $e)
			{
				echo json_encode(array("status"=>"Error getting netID from BYU"));
			}

		} else { //go to login page!
	?>
		<script language="javascript">
			window.location.href = "?login="
		</script>    
	<?php
	}
}
?>

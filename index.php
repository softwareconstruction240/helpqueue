<?php
header("Access-Control-Allow-Origin: *");
// Load the settings from the central config file
//echo 'PHP version: ' . phpversion();
//require_once 'config.php';
//ini_set('display_errors', 1);

// Load the CAS lib
require_once 'CAS-1.3.4/CAS.php';
require_once 'DBConnect.php';
// Enable debugging
//phpCAS::setDebug();
// Enable verbose error messages. Disable in production!
phpCAS::setVerbose(false);

// Initialize phpCAS
phpCAS::client(CAS_VERSION_2_0, 'cas.byu.edu', 443, 'cas');

// For production use set the CA certificate that is the issuer of the cert
// on the CAS server and uncomment the line below
// phpCAS::setCasServerCACert($cas_server_ca_cert_path);

// For quick testing you can disable SSL validation of the CAS server.
// THIS SETTING IS NOT RECOMMENDED FOR PRODUCTION.
// VALIDATING THE CAS SERVER IS CRUCIAL TO THE SECURITY OF THE CAS PROTOCOL!
phpCAS::setNoCasServerValidation();

if (isset($_REQUEST['logout'])) {
	phpCAS::logout();
}
if (isset($_REQUEST['login'])) {
	phpCAS::forceAuthentication();
}

// check CAS authentication
$auth = phpCAS::checkAuthentication();
$isThisATA = $auth ? verifyTA(phpCAS::getUser()) : false;
?>
<html>

<head>
	<title><?php echo getCourseTitle(); ?> Help Queue</title>
	<link rel="stylesheet" href="static/css/bootstrap.min.css">
	<link rel="stylesheet" href="static/css/font-awesome.min.css">
	<link rel="stylesheet" href="static/css/myStyleSheet.css">
	<!-- ----------------- TA Resources ----------------------->
	<link rel="stylesheet" href="static/css/bootstrap-datepicker.css">
	<link rel="stylesheet" href="static/css/jquery.timepicker.css">
	<link rel="stylesheet" href="static/css/datatables.min.css" />
	<link rel="stylesheet" href="static/css/easy-autocomplete.min.css" />
	<link rel="stylesheet" href="static/css/easy-autocomplete.themes.min.css" />
	<!-- ----------------- End TA Resources ------------------->

	<script src="static/js/jquery-2.1.4.min.js"></script>
	<script src="static/js/bootstrap.min.js"></script>
	<script src="static/js/spin.min.js"></script>
	<!-- ----------------- TA Resources ----------------------->
	<script src="static/js/Chart.min.js"></script>
	<script src="static/js/bootstrap-datepicker.js"></script>
	<script src="static/js/jquery.timepicker.min.js"></script>
	<script src="static/js/datepair.min.js"></script>
	<script src="static/js/jquery.datepair.min.js"></script>
	<script src="static/js/datatables.min.js"></script>
	<script src="static/js/jquery.easy-autocomplete.min.js"></script>
	<!-- ----------------- End TA Resources ------------------->
	<script src="static/js/index.js"></script>
</head>
<meta name="viewport" content="width=device-width, initial-scale=1">

<body>
	<?php
	if ($auth) {
		echo "<script> var user = '" . phpCAS::getUser() . "'; var notifyThresholdNum = '" . getNotifyThreshold() . "' </script>";
	?>
		<nav class="navbar navbar-default" role="navigation">
			<div class="navbar-header">
				<button type="button" data-target="#navbarCollapse" data-toggle="collapse" class="navbar-toggle"> <span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>

				</button>
				<a class="navbar-brand" ui-sref="home"><span id="courseTitle"></span> Help Queue</a>
			</div>
			<?php
			//			require_once "DBConnect.php";
			if ($isThisATA) //TA
			{
				echo "<script> var pollTimer = '" . getTAPollTime() . "'; </script>";	?>
				<div id="navbarCollapse" class="collapse navbar-collapse">
					<ul class="nav navbar-nav">
						<li><a href="#" id="viewQueue">View Queue</a></li>
						<li><a><input type="checkbox" id="queueActive" />
								<span class="checkboxtext"> Queue Active </span>
							</a></li>
						<li class="dropdown">
							<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
								More<span class="caret"></span>
							</a>
							<ul class="dropdown-menu">
								<li><a href="#" id="viewAddTa">Edit TAs <span class="fa fa-edit"></span></a></li>
								<li><a href="#" id="viewStats">View Stats <span class="fa fa-eye"></span></a></li>
								<li><a href="#" id="extendedStatsButton">View Extended Stats <span class="fa fa-info"></span></a></li>
								<li><a href="#" id="clearButton">Clear the help queue <span class="fa fa-times"></span></a></li>
								<li><a href="getCSVstats.php" id="csvValues">Get student stats in CSV <span class="fa fa-table"></span></a></li>
								<li role="separator" class="divider"></li>
								<li><a href="#" id="settings">Settings <span class="fa fa-cog"></span></a></li>
								<li><a href="#" id="editRawDataButton"> Edit history <span class="fa fa-exclamation-triangle"></span></a></li>
							</ul>
						</li>
					</ul>
					<ul class="nav navbar-nav navbar-right">
						<li style="padding-right:20px;"><a href="?logout=">Logout</a></li>
					</ul>
				</div>

			<?php } //Student
			else {
				echo "<script> var pollTimer = '" . getStudentPollTime() . "'; </script>";
				echo "<script> Notification.requestPermission(function (permission) {}); </script>"; ?>
				<div id="navbarCollapse" class="collapse navbar-collapse">
					<ul class="nav navbar-nav">
						<li><a><input type="checkbox" id="queueActive" disabled="true" />
								<span class="checkboxtext"> Queue Active </span>
							</a></li>
					</ul>
					<ul class="nav navbar-nav navbar-right">
						<li style="padding-right:20px;"><a href="?logout=">Logout</a></li>
					</ul>
				</div>
			<?php } ?>

		</nav>

		<h1 style='text-align:center' id='message'></h1>

		<!-- Modal for entering student name -->
		<div class="modal fade" id="nameChangeModal" role="dialog">
			<div class="modal-dialog">

				<!-- Modal content-->
				<div class="modal-content">
					<div class="modal-header">
						<h4 class="modal-title">Your name please:</h4>
					</div>
					<div class="modal-body">
						<center>
							<p>We do not currently have your name in our database. Please provide us with your name.
							</p>
							<input type="text" id="nameInput" placeholder="Enter your name here" width="70%"></input>
						</center>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" id="nameSubmit">Submit</button>
					</div>
				</div>

			</div>
		</div>

		<!-- Modal for editing TA name -->
		<div class="modal fade" id="taNameEditModal" role="dialog">
			<div class="modal-dialog">

				<!-- Modal content-->
				<div class="modal-content">
					<div class="modal-header">
						<h4 class="modal-title">A name please:</h4>
					</div>
					<div class="modal-body">
						<center>
							<p>Please enter a name:
							</p>
							<input type="text" id="editTaNameInput" placeholder="Enter the name here" width="70%"></input>
							<div id="changeTaNameNetId" style="display: none;"></div>
						</center>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" id="editTaNameSubmit">Submit</button>
					</div>
				</div>

			</div>
		</div>


		<h4>
			<center>Please join the <a target="_blank" rel="noopener noreferrer" href="https://join.slack.com/t/cs240-fall2024/shared_invite/zt-2pxui8a4w-Iyvq5X8xoiTKo8P2YPN~qg"> course Slack</a>. See our TA schedule <a target="_blank" rel="noopener noreferrer" href="https://docs.google.com/document/d/12ZrcsQAfVirCuCwzI0TKX_tSPyBOjqB9vDE-sx1n_S0/edit">here</a></center>
		</h4>




		<?php
		//require_once "DBConnect.php";
		if ($isThisATA) {
		?>
			<!-- TA -->
			<div style="text-align:center;">
				<h2>Welcome TA to the Help Queue!</h2>
				<div class="container" id="queue">
					<!-- MAIN QUEUE PAGE -->
					<div class="row">
						<!--<div class="col-xs-3">
						<strong>Net Id</strong>
					</div>-->
						<div class="col-xs-1">
							<strong>Name</strong>
						</div>
						<div class="col-xs-4">
							<strong>Question</strong>
						</div>
						<div class="col-xs-2">
							<strong>Zoom Link</strong>
						</div>
						<div class="col-xs-2">
							<strong>Time</strong>
						</div>
						<div class="col-xs-1">
							<strong>Times Helped Today</strong>
						</div>
						<div class="col-xs-2">
							<strong>Action</strong>
						</div>
					</div>
					<hr>
					<div id="list"></div>
				</div>
				<div class="container" id="stats">
					<!-- STATS PAGE -->
					<!--<div class="row">
					  <input type="radio" name="statsOrder" value="help"> Help Count
					  <input type="radio" name="statsOrder" value="passOff"> Pass offs
				</div> I thought about doing this...seemed more work than it was worth.
					especially with the extended stats section-->
					<div class="row">
						<div class="col-xs-2">

						</div>
						<div class="col-xs-3">
							<strong>Net Id</strong>
						</div>
						<div class="col-xs-3">
							<strong>Name</strong>
						</div>
						<div class="col-xs-2">
							<strong>Help Count</strong>
						</div>
						<div class="col-xs-2">
							<strong>Pass Off Count</strong>
						</div>
					</div>
					<hr>
					<div id="statsList"></div>
				</div>
				<div class="container" id="editTAs">
					<!-- EDIT TAS -->
					<div class="row">
						<input type="text" id="taInput" placeholder="Enter TA net id to add" style="width:25%;"></input>
						<input type="text" id="taInputName" placeholder="Enter TA's name to add" style="width:25%;"></input>
						<button class="btn btn-success btn-lg fa fa-plus" id="addTaBtn"></button>
					</div>
					<div class="row">
						<div class="col-xs-3">
							<strong>Net Id</strong>
						</div>
						<div class="col-xs-3">
							<strong>Name</strong>
						</div>
						<div class="col-xs-2">
							<strong>Help Count</strong>
						</div>
						<div class="col-xs-2">
							<strong>Pass Off Count</strong>
						</div>
						<div class="col-xs-2">
							<strong>Action</strong>
						</div>
					</div>
					<hr>
					<div id="taList"></div>
				</div>
				<div class="container" id="viewSettings">
					<!-- Settings -->
					<hr>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Reset the Database. All settings will be set to default and all TA and Student data will be permanently lost.
						</div>
						<div class="col-xs-3">
							<button id="resetDBBtn" class="btn btn-danger fa fa-trash"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Course title: <span id="courseTitleField"></span>
						</div>
						<div class="col-xs-3">
							<button id="changeCourseTitleButton" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Polling time for students: <span id="studentPollTime"></span> miliseconds
						</div>
						<div class="col-xs-3">
							<button id="changeStudentPollTime" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Polling time for TAs: <span id="taPollTime"></span> miliseconds
						</div>
						<div class="col-xs-3">
							<button id="changeTAPollTime" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							At what spot in line should students be notified to come to the TA office?: <span id="notifyThreshold"> </span><span id=notifyThresholdPostFix></span>
						</div>
						<div class="col-xs-3">
							<button id="changeNotifySpotNumberBtn" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Show the number of enqueues and dequeues in the last: <span class="lastXMin"> </span> minutes
						</div>
						<div class="col-xs-3">
							<button id="changeLastXMinBtn" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Current pass off highlight color: <span id="currentPassOffHighlightColor" class="fa fa-square"></span>
						</div>
						<div class="col-xs-3">
							<button id="changePassOffHighlighColorBtn" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>
					<div class="row settingsRow">
						<div class="col-xs-9">
							Require Students to enter in a question:
						</div>
						<div class="col-xs-3">
							<input id="requireQuestion" type="checkbox" style="margin-left:15px;"></input>
						</div>
					</div>

					<div class="row settingsRow">
						<div class="col-xs-9">
							Current Message: "<span id='currentMessage'></span>"
						</div>
						<div class="col-xs-3">
							<button id="changeMessageBtn" class="btn btn-warning fa fa-edit"></button>
						</div>
					</div>

					<div class="row settingsRow">
						<div class="col-xs-9">
							Display Message:
						</div>
						<div class="col-xs-3">
							<input id="displayMessage" type="checkbox" style="margin-left:15px;"></input>
						</div>
					</div>

				</div>
				<div class="container" id="editRawData">
					<!-- Update Raw Data -->
					<h3>
						Be careful! This will update the actual data in the database. It could ruin the integrity
						of the database. There is no value checking or verifying and there is no undo button. Once you
						click save the update is put into the database.
						Be cautious what you do here. This should only be to fix anomalies in the data.
					</h3>
					<div id="editRawDataRange">
						<p id="editRawDataDateInput">
							Date: <input id="editRawDataStartDate" type="text" class="date start" />From
							<input id="editRawDataStartTime" type="text" class="time start" /> to
							<input id="editRawDataEndTime" type="text" class="time end" />
						</p>
						<button id="editRawDataGetDataBtn"> Submit </button>
					</div>
					<div id="editRawDataData"></div>
				</div>
				<div class="container" id="extendedStats">
					<!-- Extended Stats -->
					<!-- Extended Stats tabs -->
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation" class="active"><a id="graphsTab" role="tab" data-toggle="tab">Usage Graphs</a></li>
						<li role="presentation"><a id="tableTab" role="tab" data-toggle="tab">Ta to Student Help Table</a></li>
						<li role="presentation"><a id="questionsTabBtn" role="tab" data-toggle="tab">Questions</a></li>
						<li role="presentation"><a id="profileTabBtn" role="tab" data-toggle="tab">Student Profile</a></li>
					</ul>
					<!-- Tab panes -->
					<div class="tab-content">
						<!-- Wait time graphs -->
						<div role="tabpanel" class="tab-pane active" id="graphs">
							<div class="row">
								<br />
								<p id="extendedStatsDateInput">
									Date: <input id="extendedStatsStartDate" type="text" class="date start" /><span id="graphFromWord"> From</span>
									<input id="extendedStatsStartTime" type="text" class="time start" /> to
									<input id="extendedStatsEndDate" type="text" class="date end" />
									<input id="extendedStatsEndTime" type="text" class="time end" />
								</p>
								<p>
									<input type="radio" name="graphSpanning" value="oneDay">Span One Day</input>
									<input type="radio" name="graphSpanning" value="multipleDay">Span Multiple Days</input>
								</p>
								<button id="updateExtendedStatsViews" class="btn btn-success">Update to this date range</button>
							</div>
							<div id="graphsContent">
								<div class="row">
									<div style="text-align:center;"><strong> Average and median wait time per <span class="graphUnit"></span></strong></div>
									<canvas id="averageWaitTimeGraph" width="500" height="400"></canvas>
									<div style="text-align:center;"><span class="graphUnit"></div>
								</div>
								<br />
								<div class="row">
									<div style="text-align:center;"><strong> Dequeues Per <span class="graphUnit"></strong></div>
									<canvas id="dequeuesPerHourGraph" width="500" height="400"></canvas>
									<div style="text-align:center;"><span class="graphUnit"></div>
								</div>
								<br />			<h2>IF YOU ARE PASSING OFF, BE READY TO BE HELPED AT ANY TIME.</br</h2>
								<div class="row">
									<div style="text-align:center;"><strong> Average Time Spent with TA <span class="graphUnit"></strong></div>
									<canvas id="avgTimeWithTAGraph" width="500" height="400"></canvas>
									<div style="text-align:center;">Minutes</div>
								</div>
								<br />
								<div class="row">
									<div style="text-align:center;">
										<strong> Raw Data </strong>
										<center>
											<div id="rawGraphData"></div>
										</center>
									</div>
								</div>
							</div>
						</div>

						<div role="tabpanel" class="tab-pane" id="tables">
							<!-- TA to Student Help Table -->
							<div class="row">
								<br />
								<p id="extendedStatsDateInputTable">
									Date: <input id="extendedStatsStartDateTable" type="text" class="date start" />
									<input id="extendedStatsStartTimeTable" type="text" class="time start" /> to
									<input id="extendedStatsEndDateTable" type="text" class="date end" />
									<input id="extendedStatsEndTimeTable" type="text" class="time end" />
									OR <input type="checkbox" id="studentTabAllDataCheckbox" style="margin-left: 10px; margin-right:5px;"> All semester</input>
								</p>
								<p>
									<input type="radio" name="tableType" value="help"> Help Count
									<input type="radio" name="tableType" value="passOff"> Pass offs
									<input type="radio" name="tableType" value="all"> All
								</p>
								<button id="updateExtendedStatsViewsTable" class="btn btn-success">Update to this date range</button>
							</div>
							<!--<canvas id="studentDataTotalTableGraph" width="800" height="400"></canvas>-->
							<table id="studentDataTotalTable" class="compact">
								<thead></thead>
								<tbody></tbody>
								<tfoot id="studentDataTotalTableFooter">
									<tr>
										<th style="text-align:right">Total:</th>
										<?php
										//this is the easiest and fastest way to insert the <th> needed for the table footer
										//it wasn't my first choice but adding them via JS caused a load of headaches and finally
										//I had to move on and this would work so I went with it. The biggest weak point here is
										//if a new TA is added and then the user goes to this table, the table will look wrong untill
										//the page is refreshed.
										$tas = getAllTAs(null);
										for ($i = 0; $i < count($tas); $i++) {
											echo "<th></th>";
										}
										echo "<th></th>"; //Themselves column
										echo "<th></th>"; //Row totals column
										?>
								</tfoot>
							</table>
						</div>
						<div role="tabpanel" class="tab-pane" id="questionsTab">
							<!-- Qustions Table -->
							<div class="row">
								<br />
								<p id="extendedStatsDateInputQuestions">
									Date: <input id="extendedStatsStartDateQuestionsTab" type="text" class="date start" />
									to
									<input id="extendedStatsEndDateQuestionsTab" type="text" class="date end" /> OR
									<input type="checkbox" id="questionsTabAllDataCheckbox" style="margin-left: 5px; margin-right:5px;"> All semester</input>
								</p>
								<button id="updateExtendedStatsViewsQuestionsTable" class="btn btn-success">Update to this date range</button>
							</div>
							<table id="questionsTable" class="compact">
								<thead>
									<tr>
										<th>Student</th>
										<th>Removed By</th>
										<th>Question</th>
										<th>Removed at</th>
										<th>Time Spent With TA</th>
									</tr>
								</thead>
								<tbody></tbody>
							</table>
						</div>
						<div role="tabpanel" class="tab-pane" id="profileTab">
							<!-- Student Profile -->
							<div style="padding-bottom:15px;"></div>
							<div class="row">
								<div class="col-xs-5">
									<input placeholder="Student Name" class="typeahead" type="text" id="profileSearchInput"></input>
								</div>
								<div class="col-xs-7">
									<button id="profileSearch" class="btn btn-lg btn-success fa fa-search" style="float:left;"></button>
								</div>
							</div>
							<div style="padding-bottom:15px;"></div>
							<div class="row">
								<div class="col-xs-6" style="text-align:left; float:left">
									Name: <span id="profileName"></span><br />
									NetId: <span id="profileNetId"></span>
								</div>
								<div class="col-xs-6" style="text-align:left; float:left">
									Total Help Count: <span id="profileTotalHelpCount"></span><br />
									Total Pass Off Count: <span id="profileTotalPassOffCount"></span><br />
									This weeks Help Count: <span id="profileWeekHelpCount"></span><br />
									This weeks Pass off Count: <span id="profileWeekPassOffCount"></span><br />
									Todays Help Count: <span id="profileTodayHelpCount"></span><br />
									Todays Pass Off Count: <span id="profileTodayPassOffCount"></span><br />
									Average Time Spent With TA: <span id="profileAverageTimeSpentWithTA"></span><br />
								</div>
							</div>
							<br />
							<center>
								<h4>TA Help Counts</h4>
							</center><br />
							<div class="row">
								<div id="profileTAHelpCount"></div>
							</div>
							<br />
							<center>
								<h4>Questions asked</h4>
							</center><br />
							<div class="row">
								<div id="profileQuestions"></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal for extended stats end time wrongly formatted-->
			<div class="modal fade" id="startTimeAfterEndError" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">ERROR</h4>
						</div>
						<div class="modal-body">
							<center>
								<div class="alert alert-danger">The End Time must be after the Start Time</div>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for entering class name-->
			<div class="modal fade" id="courseNameChangeModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">Course Title</h4>
						</div>
						<div class="modal-body">
							<center>			<h2>IF YOU ARE PASSING OFF, BE READY TO BE HELPED AT ANY TIME.</br</h2>
								<p>What is the name of the course this help queue is for?
								</p>
								<input type="text" id="courseNameInput" placeholder="Enter name here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" id="courseSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for changing student polling times-->
			<div class="modal fade" id="studentChangePollTimeModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">Student Polling interval</h4>
						</div>
						<div class="modal-body">
							<center>
								<p>Enter the polling interval in miliseconds
								</p>
								<input type="text" id="studentPollTimeInput" placeholder="Enter value here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-success" id="studentPollTimeSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for changing TA polling times-->
			<div class="modal fade" id="taChangePollTimeModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">TA Polling interval</h4>
						</div>
						<div class="modal-body">
							<center>
								<p>Enter the polling interval in miliseconds
								</p>
								<input type="text" id="taPollTimeInput" placeholder="Enter value here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-success" id="taPollTimeSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for changing notify threshold-->
			<div class="modal fade" id="notifyThresholdChangeModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">Notify Threshold</h4>
						</div>
						<div class="modal-body">
							<center>
								<p>At what point should students be notified to come to the TA office?
								</p>
								<input type="text" id="notifyThresholdInput" placeholder="Enter value here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-success" id="notifyThresholdSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for changing last X min -->
			<div class="modal fade" id="changeLastXMinModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">How many minutes back to go?</h4>
						</div>
						<div class="modal-body">
							<center>
								<p>Show number of enqueues and dequeues from how many minutes ago?
								</p>
								<input type="text" id="changeLastXMinInput" placeholder="Enter value here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-success" id="changeLastXMinSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- Modal for changing passoff highlight color-->
			<div class="modal fade" id="changePassOffHighlighColorModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">Pick a highlight color</h4>
						</div>
						<div class="modal-body">
							<div class="row">
								<div class="col-xs-4">
									<span id="passOff_red" style="background-color:red;" class="aSquare passOffSelector"></span>
								</div>
								<div class="col-xs-4">
									<span id="passOff_blue" style="background-color:blue;" class="aSquare passOffSelector"></span>
								</div>
								<div class="col-xs-4">
									<span id="passOff_transparent" class="aSquare passOffSelector"></span>
								</div>
							</div>
							<div class="row">
								<div class="col-xs-4">
									<span id="passOff_yellow" style="background-color:yellow;" class="aSquare passOffSelector"></span>
								</div>
								<div class="col-xs-4">
									<span id="passOff_orange" style="background-color:orange;" class="aSquare passOffSelector"></span>
								</div>
								<div class="col-xs-4">
									<span id="passOff_green" style="background-color:green;" class="aSquare passOffSelector"></span>
								</div>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
						</div>
					</div>

				</div>
			</div>

			<!-- modal for message -->
			<div class="modal fade" id="changeMessageModal" role="dialog">
				<div class="modal-dialog">

					<!-- Modal content-->
					<div class="modal-content">
						<div class="modal-header">
							<h4 class="modal-title">Message</h4>
						</div>
						<div class="modal-body">
							<center>
								<p>What do you want the message to be?
								</p>
								<input type="text" id="changeMessageInput" placeholder="Enter value here" width="70%"></input>
							</center>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-success" id="changeMessageSubmit">Submit</button>
						</div>
					</div>

				</div>
			</div>

			<!-- END TA -->
		<?php } else { ?>
			<!-- STUDENT -->

			<center>

				<div class="container2">


					<div class="options">
						<div class="passOffOption">
							<label for="passOffCheckBox">Pass Off?</label>
							<br />
							<input type="checkbox" id="passOffCheckBox"  />
						</div>
					</div>
					<div class="virtuallink">
						<label for="zoomLinkInput">Zoom Link:</label>
						<input class="form-control" type="text" id="zoomLinkInput" placeholder="Paste your zoom link here (e.g. https://byu.zoom.us/my/cosmo)" maxlength="300" />
					</div>
					<div class="question">
						<label for="questionInput">Question:</label>
						<input class="form-control" type="text" id="questionInput" placeholder="Enter your question here" maxlength="300" />
					</div>
					<div class="submit">
						<button id="getHelpInPersonButton" class="helpButton enqueueButton btn btn-success" style="height:50px;">I'm in person</button>
						<button id="getHelpOnZoomButton" class="helpButton enqueueButton btn btn-success" style="height:50px;">I'm on Zoom</button>
						<button id="stopGettingHelped" class="helpButton btn btn-success" style="display: none"></button>
						<br />
						<span id="getHelpError" style="display: none">Enter a question or click Pass Off</span>
					</div>
					<!-- 
					<div id="questionsRequired">
						<!-- This is for when questions are required -- >
					<div class="questionTextContainer">

						<!-- <span style="float:left; font-size:75%;" id="questionInputLengthLeft"></span> -- >
					</div>
					<div class="col-xs-1">
						<!-- <strong>OR</strong> -- >
					</div>
					<div class="col-xs-2">

					</div><br />
					<div style="padding-top: 20px;"></div>
					<div class="row">
						<!-- wont initally be disabled -- >

					</div>
				</div> -->
					<!-- <div id="questionsNotRequired">
	<button id="getHelpButtonNoQuestion" class="btn btn-success noQuestionRequiredButtons" style="width:45%; height:50px;">Get Help</button>
	<button id="passOffButtonNoQuestion" class="btn btn-info noQuestionRequiredButtons" style="width:45%; height:50px;">Pass Off</button>
</div> -->
				</div>
				<!-- <div class="container">
			<div class="row" style="width:80%;">
				<div id="questionsRequired">	<!-- This is for when questions are required -- >
					<div class="col-xs-9">
						<input class="form-control" type="text" id="questionInput" placeholder="Enter your question here" maxlength="300">
						</input>
						<span style="float:left; font-size:75%;" id="questionInputLengthLeft"></span>
					</div>
					<div class="col-xs-1">
						<!-- <strong>OR</strong> -- >
					</div>
					<div class="col-xs-2">
						<!-- <input type="checkbox" id="passOffCheckBox"/>
							<span class="checkboxtext">  Pass Off </span> -- >
					</div><br/>
					<div style="padding-top: 20px;"></div>
					<div class="row"> <!-- wont initally be disabled -- >
						<button id="getHelpButton" class="btn btn-success" style="width:80%; height:50px;" disabled>Get in line for help</button>
					</div>
				</div>
				<div id="questionsNotRequired">
					<button id="getHelpButtonNoQuestion" class="btn btn-success noQuestionRequiredButtons" style="width:45%; height:50px;">Get Help</button>
					<button id="passOffButtonNoQuestion" class="btn btn-info noQuestionRequiredButtons" style="width:45%; height:50px;">Pass Off</button>
				</div>
			</div>
		</div> -->
				<br />
				<div class="container">
					<div class="row">
						<div class="col-xs-6">
							<span id="queueNum"></span>
						</div>
						<div class="col-xs-6">
							<span id="timeWaitingLabel"></span><strong><span id="timeWaiting"></span></strong>
						</div>
					</div>
				</div>
			</center>
			<!-- END STUDENT -->
		<?php
			//add to the DB
			//require_once 'DBConnect.php';
			addStudent(phpCAS::getUser());
		} ?>
		<p style="padding-left:10px; padding-top:30px;">
		<ul>
			<li>You are currently logged in as: <b><?php echo phpCAS::getUser(); ?></b>.</li>
			<li>The current average wait time for the top <span id="topCount"></span> people on the queue is <span id="topAvg"></span>.</li>
			<li>The current length of the queue is <span id="queueLen"></span>.</li>
			<li>The current number of people being helped is <span id="currentlyBeingHelped"></span>.</li>
			<li>Number of people who got in line in the last <span class="lastXMin"></span> min: <span id="enqueueInLastXMin"></span>.</li>
			<li>Number of people who finished receiving help in the last <span class="lastXMin"></span> min: <span id="dequeueInLastXMin"></span>.</li>
			<span id="refreshText"></span>
		</ul>
		</p>
	<?php
	} else { //go to login page!
	?>
		<script language="javascript">
			window.location.href = "?login="
		</script>
	<?php
	}

	?>
</body>

</html>

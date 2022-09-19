var i = 9;
var postfix = "th";
var ONE_DAY_IN_MILISECONDS = 8.64e7;
var ONE_HOUR_IN_MILISECONDS = 3600000;
var ONE_MIN_IN_MILISECONDS = 60000;

var poll = false;
var alertShown = false;
var enqueueTime = 0;
var currentSpotInLine = -1;
var spinner;
var activeView = "#queue";
var addressBase = "";
var pauseUpdate = false;
var refreshTime = new Date().getTime();
var extendedStatsData = [];
var globalTas = [];
var globalStudentNames = {};
var globalStudentNamesRaw = [];
var studentToTaHelpCountTable;
var questionsTable;
var averageWaitTimeGraph;
var dequeuesPerHourGraph;
var averageTimeWithTAGraph;
var studentHelpCountGraph;
var queueActive;
var currentPassOffHighlightColor;
var originalTitle;
var timeout;
var flashTitleBool = false;
var currentlyGettingHelp = false;
var firstStudent = true;

//count the time waiting
setInterval(function () {
	if (poll && enqueueTime > 10) {
		var label = currentlyGettingHelp ? "Time Spent With TA: " : "Time Waiting: ";
		var output = getTimeDifference(parseInt(enqueueTime));
		$("#timeWaitingLabel").html(label);
		$("#timeWaiting").html(output);
	}
	else {
		$("#timeWaiting").html("");
		$("#timeWaitingLabel").html("");
	}

	$("#refreshText").empty();

	if (!poll) {
		var timeSinceLastRefresh = getTimeDifference(parseInt(refreshTime));
		$("#refreshText").append("<li>Time since this page was last refreshed: " + timeSinceLastRefresh + "</li>");
	}
}, 1000);

var helpButtonHandle = "/queueUp.php";
function getCurrentHelpButtonAction() {
	return helpButtonHandle;
}

function getTimeDifference(enqueueTime) {
	var timeEnqueAdj = new Date(enqueueTime);

	var difference = (new Date().getTime() - timeEnqueAdj.getTime()) / 1000;
	var hours = parseInt(difference / 3600);
	var minutes = parseInt((difference % 3600) / 60);
	var seconds = parseInt((difference % 3600 % 60));

	var output = (hours) + "h:" +
		minutes + "m:" +
		seconds + "s";

	return output;
}

function toggleView(input) {
	if (activeView != input) {
		if (typeof (studentToTaHelpCountTable) != 'undefined') {
			$("#studentDataTotalTableFooter").hide();
			studentToTaHelpCountTable.clear();
			studentToTaHelpCountTable.destroy();
			studentToTaHelpCountTable = undefined;
		}
		if (typeof (questionsTable) != 'undefined') {
			questionsTable.clear();
			questionsTable.destroy();
			questionsTable = undefined;
		}
		$(activeView).fadeOut(500, function () {
			$(input).fadeIn(500);
			activeView = input;
		});
	}
}

function getPollTime() {
	return pollerTimer;
}


function sortFilterData(startTime, endTime, allDays) {
	startTime = startTime.getTime();
	endTime = endTime.getTime();

	currentView = [];
	for (index in extendedStatsData) {
		if (typeof (extendedStatsData[index]) !== 'function') {
			if ((parseInt(extendedStatsData[index].dequeueTime) >= startTime &&
				parseInt(extendedStatsData[index].dequeueTime) <= (endTime + ONE_HOUR_IN_MILISECONDS)) || allDays) {
				var enqueue = new Date(parseInt(extendedStatsData[index].enqueueTime));
				var dequeue = new Date(parseInt(extendedStatsData[index].dequeueTime));
				currentView.push(extendedStatsData[index]);
			}
		}
	}

	currentView = currentView.sort(function (a, b) {
		return a.enqueueTime - b.enqueueTime;
	});

	return currentView;
}


function updateExtendedViews(currentView, startTime, endTime) {
	//at this point currentView is only the selected range and in order
	//setUpHelpTable(currentView);
	var returnedData = createFilteredGraphs(currentView, startTime, endTime);
	updateRawData(returnedData['rawDataFilteredByHour'], returnedData['daySplitting']);

}

function verifyStudentInputToggleButton() {
	$(".helpButton").removeClass("btn-danger");
	$(".helpButton").removeClass("btn-warning");
	$(".helpButton").removeClass("btn-success");

	$(".noQuestionRequiredButtons").removeClass("btn-danger");
	$(".noQuestionRequiredButtons").removeClass("btn-warning");
	$(".noQuestionRequiredButtons").removeClass("btn-success");
	$(".noQuestionRequiredButtons").removeClass("btn-info");

	if (queueActive) {
		var theQuestion = $("#questionInput").val();
		var passOff = $("#passOffCheckBox").prop("checked");

		removeSpinner("helpButton");
		removeSpinner("getHelpButtonNoQuestion");
		removeSpinner("passOffButtonNoQuestion");

		if (theQuestion.length > 6 || passOff) {
			//enable the get in line button
			$(".helpButton").removeAttr('disabled');
			// $(".helpButton").html('Get in line for help');
			if ($("#zoomLinkInput").val().length < 10) {
				$("#getHelpOnZoomButton").attr('disabled', 'disabled')
				$("#getHelpError").html('Enter a valid Zoom link to request remote help');
			} else {
				$("#getHelpError").html('');
			}
		}
		else //not valid input
		{
			$(".helpButton").attr('disabled', 'disabled');
			$("#getHelpError").html('Enter a question or click Pass Off');
		}

		$("#getHelpButtonNoQuestion").addClass("btn-success");
		$("#passOffButtonNoQuestion").addClass("btn-info");

		$("#getHelpButtonNoQuestion").html("Get Help");
		$("#passOffButtonNoQuestion").html("Pass Off");

		$("#questionInput").removeAttr('disabled');
		$("#passOffCheckBox").removeAttr('disabled');
		$(".helpButton").addClass("btn-success");
		$("#queueNum").html('You are not currently in line');

		$("#questionInputLengthLeft").html(300 - theQuestion.length + " characters remaining");
	}
	else //queue is not active
	{
		$(".helpButton").addClass("btn-warning");
		// $("#getHelpError").html('The Help Queue is not currently active');
		$("#queueNum").html('Go the TA lab to get help');
		$(".helpButton").attr('disabled', 'disabled');
		$("#getHelpButtonNoQuestion").attr('disabled', 'disabled');
		$("#passOffButtonNoQuestion").attr('disabled', 'disabled');
		$("#getHelpButtonNoQuestion").addClass("btn-warning");
		$("#getHelpButtonNoQuestion").html('The Help Queue is not currently active');
		$("#passOffButtonNoQuestion").addClass("btn-warning");
		$("#passOffButtonNoQuestion").html('The Help Queue is not currently active');
		// $("#questionInput").add("#zoomLinkInput").attr('disabled', 'disabled');
		// $("#passOffCheckBox").attr('disabled', 'disabled');
	}

}

function updateRawData(data, splitOnDaysOnly) {
	$("#rawGraphData").empty();
	$("#rawGraphData").append("<table align='center'>");
	$("#rawGraphData").append("<tr>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Time</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Student</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Helped By</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Enqueue Time</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Dequeue Time</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Wait Time</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Type</th>");
	$("#rawGraphData").append("<th class='graphRawDataTh'>Time Spent With TA</th>");
	$("#rawGraphData").append("</tr>");

	for (hour in data) //go thru each hour
	{
		if (!isNaN(parseInt(hour))) {
			var firstTime = true;
			for (value in data[hour])//each entry in each hour
			{
				if (!isNaN(parseInt(value))) {
					$("#rawGraphData").append("<tr>");

					//-------------------- time column
					if (firstTime) {
						var valueToPrint
						if (splitOnDaysOnly) {
							//here hour really means days since epoch, but to prevent things breaking terrribly i left it for now.
							var miliSecSinceEpoch = (parseInt(hour) + 1) * ONE_DAY_IN_MILISECONDS;
							var date = new Date(miliSecSinceEpoch);
							valueToPrint = formatOutputDateAMPM(date, true, false);
						}
						else {
							var AMPM = parseInt(hour) >= 12 ? 'pm' : 'am';
							var valueToPrint = hour % 12;
							valueToPrint = valueToPrint == 0 ? 12 : valueToPrint; //mod 12 gives 0. thats not what we want for time of day

							valueToPrint += AMPM;
						}

						if (splitOnDaysOnly)
							$("#rawGraphData").append("<td style='cursor:pointer;' onclick='onGraphClickMethod(\"" + valueToPrint + "\")'><a>" + valueToPrint + "</a></td>");
						else
							$("#rawGraphData").append("<td>" + valueToPrint + "</td>");
						firstTime = false;
					}
					else {
						$("#rawGraphData").append("<td> </td>");
					}

					//------------------------ Student column
					$("#rawGraphData").append("<td data-toggle='tooltip' title='" + data[hour][value].netId + "'>" + convertNetIdToName(data[hour][value].netId) + "</td>");

					//----------------------- Removed by column
					if (data[hour][value].netId == data[hour][value].removedBy)
						$("#rawGraphData").append("<td>Themselves</td>");
					else
						$("#rawGraphData").append("<td data-toggle='tooltip' title='" + data[hour][value].removedBy + "'>" + convertNetIdToName(data[hour][value].removedBy) + "</td>");

					//------------ Enqueue and dequeue time columns
					var enqueueTimeDate = new Date(parseInt(data[hour][value].enqueueTime));
					var dequeueTimeDate = new Date(parseInt(data[hour][value].dequeueTime));

					$("#rawGraphData").append("<td>" + formatOutputDateAMPM(enqueueTimeDate, splitOnDaysOnly, true) + "</td>");
					$("#rawGraphData").append("<td>" + formatOutputDateAMPM(dequeueTimeDate, splitOnDaysOnly, true) + "</td>");

					//----------------- wait time column
					var waitTimeInRawSecs = (dequeueTimeDate.getTime() - enqueueTimeDate.getTime()) / (1000);
					var waitTimeMin = waitTimeInRawSecs / 60;
					var waitTimeSec = waitTimeInRawSecs % 60;

					$("#rawGraphData").append("<td>" + pad((+waitTimeMin.toFixed(0))) + ":" + pad((+waitTimeSec.toFixed(2))) + "</td>");

					//------------------ Type column
					$("#rawGraphData").append("<td>" + (data[hour][value].passOff == 'true' ? "Pass Off" : "Help") + "</td>");
					$("#rawGraphData").append("</tr>");

					//------------------ Time with TA column
					var timeWithTA;
					if (data[hour][value].doneGettingHelp == null) {
						timeWithTA = "None";
					}
					else {
						var timeDiff = (parseFloat(data[hour][value].doneGettingHelp) - parseFloat(data[hour][value].dequeueTime)) / 1000;
						var timeDiffMin = timeDiff / 60;
						var timeDiffSec = timeDiff % 60;
						timeWithTA = pad((+timeDiffMin.toFixed(0))) + ":" + pad((+timeDiffSec.toFixed(2)))
					}
					$("#rawGraphData").append("<td>" + timeWithTA + "</td>");
					$("#rawGraphData").append("</tr>");
				}
			}
		}
	}
	$("#rawGraphData").append("</table>");
}
function createFilteredGraphs(data, startTime, endTime) {
	// Get context with jQuery - using jQuery's .get() method.
	var averageWaitTimeGraphCtx = $("#averageWaitTimeGraph").get(0).getContext("2d");
	var dequeuesPerHourGraphCtx = $("#dequeuesPerHourGraph").get(0).getContext("2d");
	var averageTimeWithTAGraphCtx = $("#avgTimeWithTAGraph").get(0).getContext("2d");
	var labels = [];
	var sortedData = {};
	var daySplitting = startTime.getTime() + ONE_DAY_IN_MILISECONDS < endTime.getTime();

	//set up the start, end and counter dates for labeling
	var startDate = new Date(startTime);
	var endDate = new Date(endTime);
	var counter = startDate;

	$(".graphUnit").empty();
	if (daySplitting) {//the period is longer than one day. So make the scale in days
		$(".graphUnit").append("Day");

		while (endDate >= counter) {
			labels.push(formatOutputDateAMPM(counter, true, false));

			counter = new Date(counter.getTime() + ONE_DAY_IN_MILISECONDS);
		}
	}
	else {//the period is less than a day, scale to day
		$(".graphUnit").append("Hour");

		while (endDate >= counter) {
			//just get the hours for the labels
			labels.push(counter.getHours());

			//increment the counter by a day
			counter = new Date(counter.getTime() + ONE_HOUR_IN_MILISECONDS);
		}
	}

	//split the data into its day since the epoch
	for (var index = 0; index < data.length; index++) {
		var value = new Date(parseInt(data[index].dequeueTime));

		//offset for time zone and daylight savings time
		var key = Math.floor((value.getTime() - (counter.getTimezoneOffset() * ONE_MIN_IN_MILISECONDS)) / ONE_DAY_IN_MILISECONDS);

		if (!$.isArray(sortedData[key]))
			sortedData[key] = [];

		sortedData[key].push(data[index]);

	}

	if (daySplitting) {
		//add a key for days missing any info
		for (var i = 0; i < labels.length; i++) {
			var parts = labels[i].split("/");
			//					YYYY       MM			DD
			var value = new Date(parts[2], parts[0] - 1, parts[1]);

			var key = Math.floor((value.getTime() - (value.getTimezoneOffset() * ONE_MIN_IN_MILISECONDS)) / ONE_DAY_IN_MILISECONDS);

			if (!$.isArray(sortedData[key]))
				sortedData[key] = [];

		}
	}
	/*
		There is a lot of var in here that I say perHour, or Hour some where in the name. The reason is the first
		release only did one day and over several hours. I later upgraded this code to be able to handle multiple days
		but to avoid renaming the var and messing it up I left it as perHour.
	*/

	var averageWaitTimes = [];
	var medianGraphValues = [];
	var numberHelpCountPerHour = [];
	var numberPassOffCountPerHour = [];
	var averageTimeWithTA = [];
	var rawDataFilteredByHour;
	//sortedData is the data sorted into days since epoch

	for (var key in sortedData) {
		if (daySplitting) //keep things in terms of days
		{
			oneDaysHourStats = sortedData;


			rawDataFilteredByHour = $.extend(true, {}, oneDaysHourStats);

			returnedValues = averageAndMedianValues(key,
				oneDaysHourStats, averageWaitTimes, medianGraphValues, numberHelpCountPerHour, numberPassOffCountPerHour, averageTimeWithTA);

			averageWaitTimes = returnedValues["averageWaitTimes"];
			medianGraphValues = returnedValues["medianGraphValues"];
			numberHelpCountPerHour = returnedValues["numberHelpCountPerHour"];
			numberPassOffCountPerHour = returnedValues["numberPassOffCountPerHour"];
			averageTimeWithTA = returnedValues["avgTimeWithTA"];
		}
		else //split each day into hours
		{
			oneDaysHourStats = [];
			oneDaysStats = sortedData[key];
			//go thru each stat and file it to the correct hour
			for (var index = 0; index < oneDaysStats.length; index++) {
				var hour = (new Date(parseInt(oneDaysStats[index].dequeueTime))).getHours();

				if (!$.isArray(oneDaysHourStats[hour]))
					oneDaysHourStats[hour] = [];

				oneDaysHourStats[hour].push(oneDaysStats[index]);
			}

			rawDataFilteredByHour = $.extend(true, {}, oneDaysHourStats);
			//account for hours (and labels) that didn't have any activity)
			for (var lablesKey = 0; lablesKey < labels.length; lablesKey++) {
				//check if that hour is in the dict. if not make a fake object that will show a wait time of 0
				if (!oneDaysHourStats.hasOwnProperty(labels[lablesKey]))
					oneDaysHourStats[labels[lablesKey]] = [{ dequeueTime: 0, enqueueTime: 0 }];
			}

			//average up the hour unit
			for (var lablesKey = 0; lablesKey < labels.length; lablesKey++) {
				returnedValues = averageAndMedianValues(labels[lablesKey],
					oneDaysHourStats, averageWaitTimes, medianGraphValues, numberHelpCountPerHour, numberPassOffCountPerHour, averageTimeWithTA);

				averageWaitTimes = returnedValues["averageWaitTimes"];
				medianGraphValues = returnedValues["medianGraphValues"];
				numberHelpCountPerHour = returnedValues["numberHelpCountPerHour"];
				numberPassOffCountPerHour = returnedValues["numberPassOffCountPerHour"];
				averageTimeWithTA = returnedValues["avgTimeWithTA"];

			}//end for loop for oneDaysHourStats

			//now fix the labels for hour splitting to be out of 12 hours, not 24
			for (var lablesKey = 0; lablesKey < labels.length; lablesKey++) {
				var AMPM = labels[lablesKey] >= 12 ? 'pm' : 'am';
				var hour = labels[lablesKey] % 12;
				hour = hour == 0 ? 12 : hour; //mod 12 gives 0. thats not what we want for time of day
				labels[lablesKey] = hour + AMPM;

			}
		}
	}
	// this function is part of the function its in and can only be called here. no where else.
	// it is used to get all the values for one time unit (a day, or an hour)
	function averageAndMedianValues(index, oneTimeUnitStats, averageWaitTimes, medianGraphValues, numberHelpCountPerHour, numberPassOffCountPerHour, timeWithTAAvg) {
		var timeWithTATotal = 0;
		var timeWithTACounter = 0;
		var total = 0;
		var medianArray = [];
		for (var entry = 0; entry < oneTimeUnitStats[index].length; entry++) {
			var waitTime = parseInt(oneTimeUnitStats[index][entry].dequeueTime) - parseInt(oneTimeUnitStats[index][entry].enqueueTime);
			total += waitTime;
			medianArray.push(waitTime);
			if (oneTimeUnitStats[index][entry].doneGettingHelp != null) {
				var timeWithTA = parseFloat(oneTimeUnitStats[index][entry].doneGettingHelp) - parseFloat(oneTimeUnitStats[index][entry].dequeueTime);
				timeWithTATotal += timeWithTA;
				timeWithTACounter++;
			}
		}

		var average = (total / (oneTimeUnitStats[index].length == 0 ? 1 : oneTimeUnitStats[index].length) / ONE_MIN_IN_MILISECONDS);
		averageWaitTimes.push(+average.toFixed(2));

		var timeWithTAAvgOneUnit = (timeWithTATotal / (timeWithTACounter == 0 ? 1 : timeWithTACounter) / ONE_MIN_IN_MILISECONDS);
		timeWithTAAvg.push(+timeWithTAAvgOneUnit.toFixed(2));

		var dequeuesInThisHourArr = oneTimeUnitStats[index];
		//go thru and count pass off and help sepratly
		var helpCountThisHour = 0;
		var passOffCountThisHour = 0;

		//if its a dummy var, used only becuase of the graphs APIm then dont actually count it
		if (!(dequeuesInThisHourArr.length == 1 && dequeuesInThisHourArr[0].enqueueTime == 0)) {
			for (var countersIndex = 0; countersIndex < dequeuesInThisHourArr.length; countersIndex++) {
				dequeuesInThisHourArr[countersIndex].passOff == "true" ? passOffCountThisHour++ : helpCountThisHour++;
			}
		}

		numberHelpCountPerHour.push(helpCountThisHour);
		numberPassOffCountPerHour.push(passOffCountThisHour);

		//---------------------------- median ---------------------------------------------------------
		function median(values) {

			values.sort(function (a, b) { return a - b; });

			var half = Math.floor(values.length / 2);

			if (values.length % 2)
				return values[half];
			else
				return (values[half - 1] + values[half]) / 2.0;
		}

		var medianVal = median(medianArray) / ONE_MIN_IN_MILISECONDS;
		if (isNaN(medianVal)) //if there is no activty for a day this takes care of that
			medianVal = 0;
		medianGraphValues.push(+(medianVal).toFixed(2));
		//-------------------------- end median -----------------------------------------------------

		return {
			'averageWaitTimes': averageWaitTimes,
			'numberHelpCountPerHour': numberHelpCountPerHour,
			'numberPassOffCountPerHour': numberPassOffCountPerHour,
			'medianGraphValues': medianGraphValues,
			'avgTimeWithTA': timeWithTAAvg
		};
	}

	// This will get the first returned node in the jQuery collection.
	var chartData = {
		labels: labels,
		datasets: [
			{
				label: "Mean",
				fillColor: "rgba(220,220,220,0.2)",
				strokeColor: "rgba(220,220,220,1)",
				pointColor: "rgba(220,220,220,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(220,220,220,1)",
				data: averageWaitTimes
			},
			{
				label: "Median",
				fillColor: "rgba(151,187,205,0.5)",
				strokeColor: "rgba(151,187,205,0.8)",
				highlightFill: "rgba(151,187,205,0.75)",
				highlightStroke: "rgba(151,187,205,1)",
				//fillColor: "rgba(220,220,220,0.2)",
				//strokeColor: "rgba(220,220,220,1)",
				pointColor: "rgba(220,220,220,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(220,220,220,1)",
				data: medianGraphValues
			}
		]
	};

	var dequeueChartData = {
		labels: labels,
		datasets: [
			{
				label: "Help Count",
				fillColor: "rgba(220,220,220,0.2)",
				strokeColor: "rgba(220,220,220,1)",
				pointColor: "rgba(220,220,220,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(220,220,220,1)",
				data: numberHelpCountPerHour
			},
			{
				label: "Pass Off Count",
				fillColor: "rgba(151,187,205,0.5)",
				strokeColor: "rgba(151,187,205,0.8)",
				highlightFill: "rgba(151,187,205,0.75)",
				highlightStroke: "rgba(151,187,205,1)",
				//fillColor: "rgba(220,220,220,0.2)",
				//strokeColor: "rgba(220,220,220,1)",
				pointColor: "rgba(220,220,220,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(220,220,220,1)",
				data: numberPassOffCountPerHour
			}
		]
	};

	var averageTimeWithTAGraphData = {
		labels: labels,
		datasets: [
			{
				label: "Average Time With TA",
				fillColor: "rgba(220,220,220,0.2)",
				strokeColor: "rgba(220,220,220,1)",
				pointColor: "rgba(220,220,220,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(220,220,220,1)",
				data: averageTimeWithTA
			}
		]
	};
	averageWaitTimeGraph = new Chart(averageWaitTimeGraphCtx).BarYaxisMinutes(chartData, {
		// make enough space on the right side of the graph
		scaleLabel: "          <%=value%>"
	});
	dequeuesPerHourGraph = new Chart(dequeuesPerHourGraphCtx).Bar(dequeueChartData);

	averageTimeWithTAGraph = new Chart(averageTimeWithTAGraphCtx).Bar(averageTimeWithTAGraphData);

	return { 'rawDataFilteredByHour': rawDataFilteredByHour, 'daySplitting': daySplitting };
}

function onGraphClickMethod(label) {
	//if we get there it was daySplitting
	var spanDayRadio = $('input[name=graphSpanning]');
	spanDayRadio.filter('[value=oneDay]').prop('checked', true);

	var labelString = convertNumDateToName(label);
	var labelDate = new Date(labelString);

	$('#extendedStatsStartDate').val(labelString);
	$('#extendedStatsStartTime').val("7:00am");
	$('#extendedStatsStartDate').val(labelString);
	$('#extendedStatsEndTime').val("9:00pm");

	$('#extendedStatsStartDate').datepicker('setDate', labelDate);
	$('#extendedStatsStartDate').datepicker('setDate', labelDate);

	waitTimeRadioChanged();
	extendedStatsGraphsButton({ data: { crunchNumbers: true } });

}

function waitTimeRadioChanged() {
	var radioValue = $('input[name=graphSpanning]:checked').val();
	if (radioValue == 'oneDay') {
		$("#extendedStatsEndDate").hide();
		$("#graphFromWord").show();
		$("#extendedStatsStartTime").show();
		$("#extendedStatsEndTime").show();
	}
	else if (radioValue == 'multipleDay') {
		$("#extendedStatsEndDate").show();
		$("#graphFromWord").hide();
		$("#extendedStatsStartTime").hide();
		$("#extendedStatsEndTime").hide();

		//enter these in so the button is clickable (if left empty the button is disabled)
		startTime = $('#extendedStatsStartTime').val("7:00am");
		endTime = $('#extendedStatsEndTime').val("9:00pm");
	}
}

//----------------------------- Graph functionality ---------------------------
function extendedStatsGraphsButton(event) {
	var spanning = $('input[name=graphSpanning]:checked').val();

	var startDate;
	var startTime;
	var endDate;
	var endTime;

	if (spanning == "oneDay") {
		startDate = $('#extendedStatsStartDate').val();
		startTime = $('#extendedStatsStartTime').val();
		endDate = $('#extendedStatsStartDate').val();
		endTime = $('#extendedStatsEndTime').val();
	}
	else if (spanning == "multipleDay") {
		startDate = $('#extendedStatsStartDate').val();
		startTime = $('#extendedStatsStartTime').val("7:00am");
		endDate = $('#extendedStatsStartDate').val();
		endTime = $('#extendedStatsEndTime').val("9:00pm");
	}
	else
		return;


	if (startDate.length > 0 && startDate !== "" &&
		startTime.length > 0 && startTime !== "" &&
		endDate.length > 0 && endDate !== "" &&
		endTime.length > 0 && endTime !== "") {
		if (event.data.crunchNumbers) {
			if (spanning == "oneDay") {
				startDate = $('#extendedStatsStartDate').datepicker('getDate');
				startTime = $('#extendedStatsStartTime').timepicker('getTime', new Date(startDate.getTime()));
				endDate = $('#extendedStatsStartDate').datepicker('getDate');
				endTime = $('#extendedStatsEndTime').timepicker('getTime', new Date(endDate.getTime()));
			}
			else if (spanning == "multipleDay") {
				startTime = $('#extendedStatsStartTime').val("7:00am");
				endTime = $('#extendedStatsEndTime').val("10:00pm");

				startDate = $('#extendedStatsStartDate').datepicker('getDate');
				startTime = $('#extendedStatsStartTime').timepicker('getTime', new Date(startDate.getTime()));
				endDate = $('#extendedStatsEndDate').datepicker('getDate');
				endTime = $('#extendedStatsEndTime').timepicker('getTime', new Date(endDate.getTime()));
			}


			if (startTime.getTime() > endTime.getTime()) {
				//alert("End time must be after the start time");
				$("#startTimeAfterEndError").modal();
			}
			else {

				if (typeof averageWaitTimeGraph != 'undefined')
					averageWaitTimeGraph.destroy();

				if (typeof dequeuesPerHourGraph != 'undefined')
					dequeuesPerHourGraph.destroy();

				if (typeof averageTimeWithTAGraph != 'undefined')
					averageTimeWithTAGraph.destroy();


				$("#graphsContent").show();

				var success = function (data) {
					console.log(data);
					//extendedStatsData = data.studentData;
					globalTas = data.tas;

					globalStudentNamesRaw.length = 0;
					for (index in data.studentNames) {
						globalStudentNames[data.studentNames[index].netId] = data.studentNames[index].name;
						globalStudentNamesRaw.push(data.studentNames[index]);
					}
					if (data.hasOwnProperty("studentData") && typeof (data.studentData) != 'undefined')
						updateExtendedViews(data.studentData, startTime, endTime);
					else
						alert("The ajax didnt come back in the correct format");
				}

				var error = function (error) {
					console.log("Error getting extended content" + error);
				};
				getExtendedStats("?netId=&startTime=" + startTime.getTime() + "&endTime=" + endTime.getTime(), success, error);
			}
		}
		else {
			//check the boxes are filled and then enable the button.
			$("#updateExtendedStatsViews").prop("disabled", false);
			$("#updateExtendedStatsViews").removeClass("btn btn-warning");
			$("#updateExtendedStatsViews").addClass("btn btn-success", true);
			$("#updateExtendedStatsViews").html('Click to update the information below');
		}
	}
	else {
		$("#updateExtendedStatsViews").prop("disabled", true);
		$("#updateExtendedStatsViews").addClass("btn btn-warning", true);
		$("#updateExtendedStatsViews").html('Pick a date range to view');
	}
}

function countUpExtendedStatsForTables(sortedData, tallyPassOff) {
	//---------
	tallyPassOff = tallyPassOff == "all" ? 'all' : tallyPassOff == "passOff" ? 'true' : 'false';
	var taStudentData = {};
	var taTotals = {};
	var taNetIdToName = {};
	var tableColumns = [{ 'title': 'Student' }];
	for (var tas = 0; tas < globalTas.length; tas++) {
		taTotals[globalTas[tas].name] = 0;
		taNetIdToName[globalTas[tas].netId] = globalTas[tas].name;
		tableColumns.push({ 'title': globalTas[tas].name });
	}
	tableColumns.push({ 'title': "Themselves" });
	tableColumns.push({ 'title': "Totals" });
	taTotals['Themselves'] = 0;

	for (var index = 0; index < sortedData.length; index++)//globalStudentNames
	{
		//only go in here if this specific element is the same setting as the requested type (that is if the user wants
		//just pass off then this specific element needs to equal pass off)
		if (sortedData[index].passOff == tallyPassOff || sortedData[index].passOff == null || tallyPassOff == "all") {
			//if this student isn't in the taStudentData obj yet load it up!
			if (!taStudentData.hasOwnProperty([globalStudentNames[sortedData[index].netId]])) {
				var temp = {};
				for (var tas = 0; tas < globalTas.length; tas++) //temp is a json of ta netid's to numbers
				{
					temp[globalTas[tas].name] = 0;
				}
				temp['Themselves'] = 0;

				taStudentData[globalStudentNames[sortedData[index].netId]] = temp;// convert netId to student name
			}

			//incremenet the jank
			if (sortedData[index].removedBy == sortedData[index].netId) {
				taStudentData[globalStudentNames[sortedData[index].netId]]['Themselves']++; //convert netID to student name
				taTotals['Themselves']++;
			}
			else {
				taStudentData[globalStudentNames[sortedData[index].netId]][taNetIdToName[sortedData[index].removedBy]]++; //first one is student, second is TA
				taTotals[convertNetIdToName(sortedData[index].removedBy)]++; //convert to TA name
			}
		}
	}

	var tableFormatedData = [];
	var graphRawData = [];
	for (name in taStudentData) {
		var temp = [];
		temp.push(name);
		for (data in taStudentData[name]) {
			temp.push(taStudentData[name][data]);
		}
		temp.push(countUpStudentTotal(taStudentData[name]));
		tableFormatedData.push(temp);
	}

	return { 'tableFormatedData': tableFormatedData, 'tableColumns': tableColumns };
	//--------------
}

function printTheTaToStudentTable(sortedData, tallyPassOff) {
	var returnData = countUpExtendedStatsForTables(sortedData, tallyPassOff);

	var tableFormatedData = returnData['tableFormatedData'];
	var tableColumns = returnData['tableColumns'];
	//------------ SET UP THE TABLE --------------------------
	if (typeof (studentToTaHelpCountTable) != 'undefined') {
		$("#studentDataTotalTableFooter").hide();
		studentToTaHelpCountTable.clear();
		studentToTaHelpCountTable.destroy();
		studentToTaHelpCountTable = undefined;
	}


	$("#studentDataTotalTableFooter").show();
	studentToTaHelpCountTable = $('#studentDataTotalTable').DataTable({
		data: tableFormatedData,
		columns: tableColumns,
		//bFilter: false,
		bInfo: false,
		bPaginate: false,
		fixedHeader: true
	});

	for (var i = 1; i < tableColumns.length; i++) {
		var column = studentToTaHelpCountTable.column(i);
		$(column.footer()).html(
			column.data().reduce(function (a, b) {
				return a + b;
			}, 0)
		);
		//how to search on only select columns
		/*var total = api
				.column( i )
				.data()
				.reduce( function (a, b) {
						return intVal(a) + intVal(b);
				}, 0 );

	// Update footer
			$( api.column( i ).footer() ).html(total);*/
	}
}

function formatDataForQuestionsTable(data) {
	var returnedData = [];
	for (index in data) {
		if (!isNaN(index)) {
			var obj = data[index];
			if (obj.passOff != 'true') {
				var timeSpent = obj.doneGettingHelp == null ? "None" : parseFloat((obj.doneGettingHelp - obj.dequeueTime) / ONE_MIN_IN_MILISECONDS).toFixed(2) + " minutes";
				returnedData.push({
					'name': convertNetIdToName(obj.netId),
					'removedBy': convertNetIdToName(obj.removedBy),
					'question': obj.question,
					'dequeueTime': formatOutputDateAMPM(new Date(parseInt(obj.dequeueTime)), true, true),
					'timeSpentGettingHelpe': timeSpent
				});
			}
		}
	}
	return returnedData
}

function updateQuestionsTable(data) {

	//------------ SET UP THE Questions TABLE --------------------------
	if (typeof (questionsTable) != 'undefined') {
		questionsTable.clear();
		questionsTable.destroy();
		questionsTable = undefined;
	}

	data = formatDataForQuestionsTable(data);

	questionsTable = $('#questionsTable').DataTable({
		data: data,
		columns: [
			{ data: 'name', "width": "10%" },
			{ data: 'removedBy', "width": "10%" },
			{ data: 'question', "width": "50%" },
			{ data: 'dequeueTime', "width": "15%" },
			{ data: 'timeSpentGettingHelpe', "width": "15%" }
		],
		//bFilter: false,
		bInfo: false,
		bPaginate: false,
		fixedHeader: true,
		"order": [[3, "asc"]]
	});


}

function extendedStatsTableButton(event) {
	var allDays = $("#studentTabAllDataCheckbox").prop('checked');

	$('#extendedStatsDateInputTable .date').prop('disabled', allDays)
	$('#extendedStatsDateInputTable .time').prop('disabled', allDays);

	var startDate = $('#extendedStatsStartDateTable').val();
	var startTime = $('#extendedStatsStartTimeTable').val();
	var endDate = $('#extendedStatsStartDateTable').val();
	var endTime = $('#extendedStatsEndTimeTable').val();

	if ((startDate.length > 0 && startDate !== "" &&
		startTime.length > 0 && startTime !== "" &&
		endDate.length > 0 && endDate !== "" &&
		endTime.length > 0 && endTime !== "") || allDays) {
		if (event.data.crunchNumbers) {
			startDate = $('#extendedStatsStartDateTable').datepicker('getDate');
			startTime = $('#extendedStatsStartTimeTable').timepicker('getTime', new Date(startDate.getTime()));
			endDate = $('#extendedStatsEndDateTable').datepicker('getDate');
			endTime = $('#extendedStatsEndTimeTable').timepicker('getTime', new Date(endDate.getTime()));

			startTime = startTime == null ? new Date() : startTime; //in case we want all days we got to check for this
			endTime = endTime == null ? new Date() : endTime;

			var success = function (data) {
				console.log(data);
				//extendedStatsData = data.studentData;
				globalTas = data.tas;

				globalStudentNamesRaw.length = 0;
				for (index in data.studentNames) {
					globalStudentNames[data.studentNames[index].netId] = data.studentNames[index].name;
					globalStudentNamesRaw.push(data.studentNames[index]);
				}
				if (data.hasOwnProperty("studentData") && typeof (data.studentData) != 'undefined') {
					var tableType = $('input[name=tableType]:checked').val()
					printTheTaToStudentTable(data.studentData, tableType);
				}
				else
					alert("The ajax didnt come back in the correct format");
			}

			var error = function (error) {
				console.log("Error getting extended content" + error);
			};

			if (allDays)
				getExtendedStats("?netId=&startTime=&endTime=", success, error);
			else
				getExtendedStats("?netId=&startTime=" + startTime.getTime() + "&endTime=" + endTime.getTime(), success, error);

		}
		else {
			//check the boxes are filled and then enable the button.
			$("#updateExtendedStatsViewsTable").prop("disabled", false);
			$("#updateExtendedStatsViewsTable").removeClass("btn btn-warning");
			$("#updateExtendedStatsViewsTable").addClass("btn btn-success", true);
			$("#updateExtendedStatsViewsTable").html('Click to update the information below');
		}
	}
	else {
		$("#updateExtendedStatsViewsTable").prop("disabled", true);
		$("#updateExtendedStatsViewsTable").addClass("btn btn-warning", true);
		$("#updateExtendedStatsViewsTable").html('Pick a date range to view');
	}

}

function countUpStudentTotal(studentData) {
	var total = 0;
	for (key in studentData) {
		total += studentData[key];
	}

	return total;
}

function extendedStatsQuestionsButton(event) {
	var allDays = $("#questionsTabAllDataCheckbox").prop('checked');

	$('#extendedStatsDateInputQuestions .date').prop('disabled', allDays);

	var startDate = $('#extendedStatsStartDateQuestionsTab').val();
	var endDate = $('#extendedStatsEndDateQuestionsTab').val();

	if ((startDate.length > 0 && startDate !== "" &&
		endDate.length > 0 && endDate !== "") || allDays) {
		if (event.data.crunchNumbers) {
			startDate = $('#extendedStatsStartDateQuestionsTab').datepicker('getDate');
			endDate = $('#extendedStatsEndDateQuestionsTab').datepicker('getDate');
			//end date will be 11:59:59pm of the selected end date. That way its inclusive
			endDate = new Date(endDate.getTime() + ONE_DAY_IN_MILISECONDS - 100);


			var success = function (data) {
				console.log(data);
				//extendedStatsData = data.studentData;
				globalTas = data.tas;

				globalStudentNamesRaw.length = 0;
				for (index in data.studentNames) {
					globalStudentNames[data.studentNames[index].netId] = data.studentNames[index].name;
					globalStudentNamesRaw.push(data.studentNames[index]);
				}
				if (data.hasOwnProperty("studentData") && typeof (data.studentData) != 'undefined') {
					updateQuestionsTable(data.studentData);
				}
				else
					alert("The ajax didnt come back in the correct format");
			}

			var error = function (error) {
				console.log("Error getting extended content" + error);
			};

			if (allDays)
				getExtendedStats("?netId=&startTime=&endTime=", success, error);
			else
				getExtendedStats("?netId=&startTime=" + startDate.getTime() + "&endTime=" + endDate.getTime(), success, error);

		}
		else {
			//check the boxes are filled and then enable the button.
			$("#updateExtendedStatsViewsQuestionsTable").prop("disabled", false);
			$("#updateExtendedStatsViewsQuestionsTable").removeClass("btn btn-warning");
			$("#updateExtendedStatsViewsQuestionsTable").addClass("btn btn-success", true);
			$("#updateExtendedStatsViewsQuestionsTable").html('Click to update the information below');
		}
	}
	else {
		$("#updateExtendedStatsViewsQuestionsTable").prop("disabled", true);
		$("#updateExtendedStatsViewsQuestionsTable").addClass("btn btn-warning", true);
		$("#updateExtendedStatsViewsQuestionsTable").html('Pick a date range to view');
	}

}

function showNotification() {
	if (typeof Notification !== 'undefined') {

		Notification.requestPermission(function (permission) {
			if (permission === 'granted') {
				var notification = new Notification('It is almost your turn to get help!', {
					body: 'Go to the TA Lab to get help!',
					tag: "MyNotify"
				});

				notification.onclick = function () {
					window.focus();
				};
			}

			alert('It is almost your turn to get help!');

		});
	}
	else {
		alert('It is almost your turn to get help!');
	}
}


//------------------------------------------------------------------------------------------------------
$(function () {//set stuff up once jquery loads

	originalTitle = document.title;

	window.flashTitle = function (newMsg, howManyTimes) {
		function step() {
			document.title = (document.title == originalTitle) ? newMsg : originalTitle;

			if (flashTitleBool) {
				timeout = setTimeout(step, 1000);
			} else {
				document.title = originalTitle;
			};
		};

		howManyTimes = parseInt(howManyTimes);

		if (isNaN(howManyTimes)) {
			howManyTimes = 5;
		};

		cancelFlashTitle(timeout);
		step();
	};

	window.cancelFlashTitle = function () {
		clearTimeout(timeout);
		document.title = originalTitle;
	};

	//poll server for updates. The pollTimer comes from index.php and is different for students and TAs
	setInterval(function () {
		if (poll) {
			getStatus(user);
		}

	}, pollTimer);

	//sometimes students wait an hour or two between getting in line. This causes them to be logged out and
	//then when they do go to get in the queue it doesn't work. This checks the status every 10 min. If they have
	//been logged out the page shows it. I refactored the getStatus.php so that it called the CAS stuff. This should
	//mean that it should never log out automatically.
	setInterval(function () {
		getStatus(user);

	}, 600000);//600000 == 10 min in ms

	var x = window.location.pathname;
	var t = x.split("/");
	for (var i = 0; i < t.length - 1; i++) {
		addressBase += t[i];
		if (i < t.length - 2)
			addressBase += "/";
	}
	getExtendedStatsToStart(); //all this REALLY does will get names for the typeahead on the profile page.
	//all the actual starts are retrieved on the fly.

	//------------------ Extended Stats inputs set up ---------------------
	//set up the radio button for the TA to Student table
	var $radios = $('input:radio[name=tableType]');
	if ($radios.is(':checked') === false) {
		$radios.filter('[value=help]').prop('checked', true);
	}

	//set up the radio for wait graphs
	var spanDayRadio = $('input[name=graphSpanning]');
	spanDayRadio.filter('[value=oneDay]').prop('checked', true);
	$("#extendedStatsEndDate").hide();
	$("#graphFromWord").show();
	$("#extendedStatsStartTime").show();
	$("#extendedStatsEndTime").show();

	$('input[type=radio][name=graphSpanning]').on('change', waitTimeRadioChanged);

	//-------------------Graphs parts -----------------------------------------------
	// initialize input widgets first
	$('#extendedStatsDateInput .time').timepicker({
		'showDuration': true,
		'timeFormat': 'g:ia',
		'step': 60,
		'scrollDefault': '9:00',
		'maxTime': '11:00pm',
		'showDuration': true
	});

	$('#extendedStatsDateInput .date').datepicker({
		'format': 'MM-d-yyyy',
		'autoclose': true
	});

	// initialize datepair
	$('#extendedStatsDateInput').datepair();



	$("#graphsContent").hide();
	//endable and disable the button when data is input


	//set up the listeners for Graph inputs
	$('#extendedStatsDateInput .time').on('changeTime', { crunchNumbers: false }, extendedStatsGraphsButton);
	$('#extendedStatsDateInput .date').on('changeTime', { crunchNumbers: false }, extendedStatsGraphsButton);


	$('#extendedStatsStartDate').on('input', { crunchNumbers: false }, extendedStatsGraphsButton);
	$('#extendedStatsStartTime').on('input', { crunchNumbers: false }, extendedStatsGraphsButton);
	$('#extendedStatsEndDate').on('input', { crunchNumbers: false }, extendedStatsGraphsButton);
	$('#extendedStatsEndTime').on('input', { crunchNumbers: false }, extendedStatsGraphsButton);

	$("#updateExtendedStatsViews").prop("disabled", true);
	$("#updateExtendedStatsViews").addClass("btn btn-warning", true);
	$("#updateExtendedStatsViews").html('Pick a date range to view');


	//set up the toggleing between tabs
	$('#graphsTab').on('click', function () {
		tabsToggle('#graphs');
	})

	$('#tableTab').on('click', function () {
		tabsToggle('#tables');
	})

	$('#questionsTabBtn').on('click', function () {
		tabsToggle('#questionsTab');
	})

	$('#profileTabBtn').on('click', function () {
		tabsToggle('#profileTab');
	})


	function tabsToggle(toShow) {
		$("#graphs").hide();
		$("#tables").hide();
		$("#questionsTab").hide();
		$("#profileTab").hide();
		if (typeof (studentToTaHelpCountTable) != 'undefined') {
			$("#studentDataTotalTableFooter").hide();
			studentToTaHelpCountTable.clear();
			studentToTaHelpCountTable.destroy();
			studentToTaHelpCountTable = undefined;
		}
		if (typeof (questionsTable) != 'undefined') {
			questionsTable.clear();
			questionsTable.destroy();
			questionsTable = undefined;
		}

		$(toShow).show();
	}

	//onGraphClickListeners
	$("#averageWaitTimeGraph").click(function (e) {

		var activeBars = averageWaitTimeGraph.getBarsAtEvent(e);
		if (typeof (activeBars[0]) == 'undefined')
			return;
		var label = activeBars[0].label;
		if (label.indexOf("am") == -1 && label.indexOf("pm") == -1)
			onGraphClickMethod(label);
	});

	$("#dequeuesPerHourGraph").click(function (e) {

		var activeBars = dequeuesPerHourGraph.getBarsAtEvent(e);
		if (typeof (activeBars[0]) == 'undefined')
			return;
		var label = activeBars[0].label;
		if (label.indexOf("am") == -1 && label.indexOf("pm") == -1)
			onGraphClickMethod(label);
	});


	//----------------------- TA to student help Tables parts ----------------------------------------------

	$("#updateExtendedStatsViewsTable").on("click", { crunchNumbers: true }, extendedStatsTableButton);

	$('#extendedStatsDateInputTable .time').timepicker({
		'showDuration': true,
		'timeFormat': 'g:ia',
		'step': 60,
		'scrollDefault': '9:00',
		'maxTime': '11:00pm',
		'showDuration': true
	});

	$('#extendedStatsDateInputTable .date').datepicker({
		'format': 'MM-d-yyyy',
		'autoclose': true
	});

	// initialize datepair
	$('#extendedStatsDateInputTable').datepair();

	//set up the listeners
	$('#extendedStatsDateInputTable .time').on('changeTime', { crunchNumbers: false }, extendedStatsTableButton);
	$('#extendedStatsDateInputTable .date').on('changeDate', { crunchNumbers: false }, extendedStatsTableButton);


	$('#extendedStatsStartDateTable').on('input', { crunchNumbers: false }, extendedStatsTableButton);
	$('#extendedStatsStartTimeTable').on('input', { crunchNumbers: false }, extendedStatsTableButton);
	$('#extendedStatsEndDateTable').on('input', { crunchNumbers: false }, extendedStatsTableButton);
	$('#extendedStatsEndTimeTable').on('input', { crunchNumbers: false }, extendedStatsTableButton);

	$("#updateExtendedStatsViewsTable").prop("disabled", true);
	$("#updateExtendedStatsViewsTable").addClass("btn btn-warning", true);
	$("#updateExtendedStatsViewsTable").html('Pick a date range to view');

	$("#studentTabAllDataCheckbox").on("click", { crunchNumbers: false }, extendedStatsTableButton);

	//-------------------------------- Question tab ----------------------------------------------
	$("#updateExtendedStatsViewsQuestionsTable").on("click", { crunchNumbers: true }, extendedStatsQuestionsButton);

	$('#extendedStatsDateInputQuestions .date').datepicker({
		'format': 'MM-d-yyyy',
		'autoclose': true
	});

	// initialize datepair
	$('#extendedStatsDateInputQuestions').datepair();

	//set up the listeners
	$('#extendedStatsDateInputQuestions .date').on('changeDate', { crunchNumbers: false }, extendedStatsQuestionsButton);


	$('#extendedStatsStartDateQuestionsTab').on('input', { crunchNumbers: false }, extendedStatsQuestionsButton);
	$('#extendedStatsEndDateQuestionsTab').on('input', { crunchNumbers: false }, extendedStatsQuestionsButton);

	$("#updateExtendedStatsViewsQuestionsTable").prop("disabled", true);
	$("#updateExtendedStatsViewsQuestionsTable").addClass("btn btn-warning", true);
	$("#updateExtendedStatsViewsQuestionsTable").html('Pick a date range to view');

	$("#questionsTabAllDataCheckbox").on("click", { crunchNumbers: false }, extendedStatsQuestionsButton);

	//------------------------ Profile tab ---------------------------------------------------------
	//------------ typeahead for profile search

	var options = {


		data: globalStudentNamesRaw,

		getValue: 'name',

		template:
		{//right now the search uses a hacky way of parsing the string that is selected
			//if anything changes in here, double check that it doesn't mess up the profile search
			//on the extended stats page.
			type: "description",
			fields:
			{
				description: "netId"
			}
		},

		list:
		{
			match: {
				enabled: true
			},
			onKeyEnterEvent: profileSearchPrep,
			onClickEvent: profileSearchPrep
		}

	};

	$("#profileSearchInput").easyAutocomplete(options);

	$("#profileSearchInput").on('keypress', function (event) {
		if (event.which == 13)
			profileSearchPrep();
	});



	$("#profileSearch").on("click", profileSearchPrep);

	function profileSearchPrep() {
		var success = function (data) {
			console.log(data);
			//extendedStatsData = data.studentData;
			globalTas = data.tas;

			globalStudentNamesRaw.length = 0;
			for (index in data.studentNames) {
				globalStudentNames[data.studentNames[index].netId] = data.studentNames[index].name;
				globalStudentNamesRaw.push(data.studentNames[index]);
			}
			if (data.hasOwnProperty("studentData") && typeof (data.studentData) != 'undefined') {
				profileSearch(data.studentData);
			}
			else
				alert("The ajax didnt come back in the correct format");
		}

		var error = function (error) {
			console.log("Error getting extended content" + error);
		};

		//the value is a name, not a netId.
		var name = $("#profileSearchInput").val();
		//so we get the selected item, go into its guts and get out everything
		//then we parse looking for the '-' and everything after that is the netId
		//this is extremely hackish and I don't like it. If a better way is found
		//PLEASE fix it!
		var item = $(".easy-autocomplete").find("ul li.selected");
		var combinedInfo = item[0].textContent;
		var netId = combinedInfo.substring(combinedInfo.indexOf("-") + 2);

		getExtendedStats("?netId=" + netId + "&startTime=&endTime=", success, error);

	}

	function profileSearch(incomingData) {
		var input = $("#profileSearchInput").val();
		if (input.length < 1)
			return;

		var totalHelp = 0;
		var totalPass = 0;
		var weekHelp = 0;
		var weekPass = 0;
		var todayHelp = 0;
		var todayPass = 0;
		var averageTimeSpentWithTA = 0;

		var today = new Date();
		var daysSinceEpochToday = Math.floor((today.getTime() - (today.getTimezoneOffset() * ONE_MIN_IN_MILISECONDS)) / ONE_DAY_IN_MILISECONDS);
		//now worry about the same week stat
		var todayDayOfWeek = today.getDay();
		var weekBase = today - (todayDayOfWeek * ONE_DAY_IN_MILISECONDS);
		var weekBaseTime = (new Date(weekBase)).getTime();

		var taHelpCount = {};

		$("#profileQuestions").empty();
		var questionHTML = "<div class='row'>" +
			"<div class='col-xs-6'>" +
			"<strong>Question</strong>" +
			"</div>" +
			"<div class='col-xs-2'>" +
			"<strong>Removed By</strong>" +
			"</div>" +
			"<div class='col-xs-2'>" +
			"<strong>Removed At</strong>" +
			"</div>" +
			"<div class='col-xs-2'>" +
			"<strong>Time spent with TA</strong>" +
			"</div>" +
			"</div>";

		$("#profileQuestions").append(questionHTML);

		var netId = "";
		var totalTimeSpentWithTA = 0;
		var numberOfTimesWithTA = 0;
		//go find all the info for that user
		for (index in incomingData) {
			if (globalStudentNames[incomingData[index].netId] == input) {
				netId = incomingData[index].netId;

				if (!(incomingData[index].removedBy in taHelpCount)) {
					taHelpCount[incomingData[index].removedBy] = { 'passOff': 0, 'help': 0 };
				}

				//get number of days since epoch, see if they are the same
				var dequeueDate = new Date(parseInt(incomingData[index].dequeueTime));
				//offset for time zone and daylight savings time
				var daysSinceEpoch = Math.floor((dequeueDate.getTime() - (dequeueDate.getTimezoneOffset() * ONE_MIN_IN_MILISECONDS)) / ONE_DAY_IN_MILISECONDS);

				if (incomingData[index].passOff == 'true') {
					totalPass++;
					if (daysSinceEpochToday == daysSinceEpoch) {
						todayPass++;
					}
					if (dequeueDate.getTime() > weekBaseTime) {
						weekPass++;
					}

					taHelpCount[incomingData[index].removedBy].passOff++;
				}
				else {
					totalHelp++;
					if (daysSinceEpochToday == daysSinceEpoch) {
						todayHelp++;
					}
					if (dequeueDate.getTime() > weekBaseTime) {
						weekHelp++;
					}

					taHelpCount[incomingData[index].removedBy].help++;

					var timeSpentOutCol;
					if (incomingData[index].doneGettingHelp == null) {
						timeSpentOutCol = "None";
					}
					else {
						var timeSpent = parseFloat((incomingData[index].doneGettingHelp - incomingData[index].dequeueTime) / ONE_MIN_IN_MILISECONDS);
						timeSpentOutCol = timeSpent.toFixed(2) + " minutes";
						totalTimeSpentWithTA += timeSpent;
						numberOfTimesWithTA++;
					}

					var questionHTML = "<div class='row'>" +
						"<div class='col-xs-6'>" +
						incomingData[index].question +
						"</div>" +
						"<div class='col-xs-2'>" +
						(incomingData[index].removedBy == incomingData[index].netId ? 'Themselves' : convertNetIdToName(incomingData[index].removedBy)) +
						"</div>" +
						"<div class='col-xs-2'>" +
						formatOutputDateAMPM(new Date(parseInt(incomingData[index].dequeueTime)), true, true) +
						"</div>" +
						"<div class='col-xs-2'>" +
						timeSpentOutCol +
						"</div>" +
						"</div>";

					$("#profileQuestions").append(questionHTML);
				}
			}
		}

		$("#profileName").empty();
		$("#profileNetId").empty();
		$("#profileTotalHelpCount").empty();
		$("#profileTotalPassOffCount").empty();
		$("#profileWeekHelpCount").empty();
		$("#profileWeekPassOffCount").empty();
		$("#profileTodayHelpCount").empty();
		$("#profileTodayPassOffCount").empty();
		$("#profileAverageTimeSpentWithTA").empty();


		$("#profileName").html(input);
		$("#profileNetId").html(netId);
		$("#profileTotalHelpCount").html(totalHelp);
		$("#profileTotalPassOffCount").html(totalPass);
		$("#profileWeekHelpCount").html(weekHelp);
		$("#profileWeekPassOffCount").html(weekPass);
		$("#profileTodayHelpCount").html(todayHelp);
		$("#profileTodayPassOffCount").html(todayPass);
		$("#profileAverageTimeSpentWithTA").html(parseFloat(totalTimeSpentWithTA / (numberOfTimesWithTA == 0 ? 1 : numberOfTimesWithTA)).toFixed(2) + " minutes");

		$("#profileTAHelpCount").empty();
		var output = "<div class='row'>" +
			"<div class='col-xs-4'>" +
			"<strong>Name</strong>" +
			"</div>" +
			"<div class='col-xs-3'>" +
			"<strong>Help Count</strong>" +
			"</div>" +
			"<div class='col-xs-3'>" +
			"<strong>Pass Off</strong>" +
			"</div>" +
			"</div>";
		$("#profileTAHelpCount").append(output);

		//order taHelpCount
		var orderedTas = Object.keys(taHelpCount).sort(function (a, b) {
			var aName = convertNetIdToName(a);
			var bName = convertNetIdToName(b);

			//always press the student to the bottom of the list
			if (aName == input)
				return 1;
			if (bName == input)
				return -1;

			return taHelpCount[b].help - taHelpCount[a].help
		});

		for (var i = 0; i < orderedTas.length; i++) {
			var ta = orderedTas[i];
			var studentName = convertNetIdToName(ta);
			var output = "<div class='row'>" +
				"<div class='col-xs-4'>" +
				(studentName == input ? 'Themselves' : studentName) +
				"</div>" +
				"<div class='col-xs-3'>" +
				taHelpCount[ta].help +
				"</div>" +
				"<div class='col-xs-3'>" +
				taHelpCount[ta].passOff +
				"</div>" +
				"</div>";
			$("#profileTAHelpCount").append(output);
		}
	}
	//------------------------ End Extended Stats inputs -------------------------------------

	//------------------------ Edit Raw data stuff -----------------------------------------
	$('#editRawDataDateInput .time').timepicker({
		'showDuration': true,
		'timeFormat': 'g:ia',
		'step': 60,
		'scrollDefault': '9:00',
		'maxTime': '11:00pm',
		'showDuration': true
	});

	$('#editRawDataDateInput .date').datepicker({
		'format': 'MM-d-yyyy',
		'autoclose': true
	});

	// initialize datepair
	$('#editRawDataDateInput').datepair();

	//set up the listeners for Edit raw data inputs
	$('#editRawDataDateInput .time').on('changeTime', { crunchNumbers: false }, setUpEditRawData);
	$('#editRawDataDateInput .date').on('changeTime', { crunchNumbers: false }, setUpEditRawData);


	$('#editRawDataStartDate').on('input', { crunchNumbers: false }, setUpEditRawData);
	$('#editRawDataStartTime').on('input', { crunchNumbers: false }, setUpEditRawData);
	$('#editRawDataEndTime').on('input', { crunchNumbers: false }, setUpEditRawData);

	$("#editRawDataGetDataBtn").prop("disabled", true);
	$("#editRawDataGetDataBtn").addClass("btn btn-warning", true);
	$("#editRawDataGetDataBtn").html('Pick a date range to view');

	$("#editRawDataGetDataBtn").on("click", { crunchNumbers: true }, setUpEditRawData);

	$('[data-toggle="tooltip"]').tooltip();
	verifyStudentInputToggleButton(); //initialy disable the button
	$("#updateExtendedStatsViews").on("click", { crunchNumbers: true }, extendedStatsGraphsButton);

	//When you are in line disable the question input and the check box. when you get out of line reenable
	$("#questionInput").add("#zoomLinkInput").on('input', verifyStudentInputToggleButton);
	$("#passOffCheckBox").on('click', verifyStudentInputToggleButton);

	$(".helpButton").on('click', function () {
		var theQuestion = $("#questionInput").val();
		var passOff = $("#passOffCheckBox").is(":checked");
		const zoomLink = $("#zoomLinkInput").val()

		//validate input, but only already in line
		if ((theQuestion.length < 6 && passOff == false) && !poll) {
			//error. not enought input (shouldn't ever get here, but just in case)
			alert("Please enter a question of click pass off");
		}
		else {
			$("#questionInput").attr('disabled', 'disabled');
			$("#passOffCheckBox").attr('disabled', 'disabled');

			spin("helpButton");

			submitRequest(user, theQuestion, passOff, zoomLink);
		}
	});

	$(".noQuestionRequiredButtons").on('click', function (event) {

		console.log(event.target.id);

		var passOff = false;
		if (event.target.id == "passOffButtonNoQuestion")
			passOff = true;

		spin("passOffButtonNoQuestion");
		spin("getHelpButtonNoQuestion");

		submitRequest(user, "", passOff);

	});

	function submitRequest(user, theQuestion, passOff, zoomLink) {
		poll = true;
		pauseUpdate = true;
		var userInfo =
		{
			username: user,
			question: theQuestion,
			passOff: passOff,
			zoomLink
		};

		var success = function (data) {
			pauseUpdate = false;
			updateUI(data);
			getNameStatus();
		};
		var error = function (data) {
			pauseUpdate = false;
			console.log(data);
			$("#questionInput").removeAttr('disabled');
			$("#passOffCheckBox").removeAttr('disabled');
			$("#passOffButtonNoQuestion").removeAttr('disabled');
			$("#getHelpButtonNoQuestion").removeAttr('disabled');

			//there was an error hu? Well lets just go get our status
			getStatus(userName, false);
			alert("You must have been busy! You waited so long BYU automatically logged you out!");
		}

		postData(userInfo, getCurrentHelpButtonAction(), success, error);
	}

	$("#easterEggTrigger").on("click", function () {
		var output = '<div><center>' +
			'<object type="text/html" data="' + window.location.origin + addressBase + '/static/t-rex-runner-gh-pages/"' +
			' width="600px" height="200px" style="overflow:auto;"></object>' +
			' <br/>This help queue was designed and build by Blaine McGary during the Winter Semester 2016. It was ' +
			' first used during the Winter 2016 semester in the class CS 240.' +
			'</center></div>';

		$("#sexyRexy").empty();
		$("#sexyRexy").append(output);
	});

	$("#addTaBtn").on("click", function () {
		var taToAdd = $("#taInput").val();
		var taToAddName = $("#taInputName").val();
		if (taToAdd.length <= 0) {
			alert("Please enter a TA net id to add first");
		}
		else if (taToAddName.length <= 0) {
			alert("Please enter the TA's name you are trying to add");
		}
		else {
			var repeatFound = false;
			for (var i = 0; i < globalTas.length; i++) {
				if (globalTas[i].netId === taToAdd) {
					repeatFound = true;
					alert("That net id is already registered as a TA");
				}
			}
			if (!repeatFound) {
				spin("addTaBtn");
				var netId = taToAdd;
				var nameIn = taToAddName;
				var userInfo =
				{
					username: netId,
					name: nameIn,
					action: "addTA"
				};

				var scallBack = function (data) { removeSpinner("addTaBtn"); updateUI(data); };
				var ecallBack = function (error) { console.log(error) };
				postData(userInfo, "/editTAs.php", scallBack, ecallBack);
				$("#taInput").val("");
				$("#taInputName").val("");
			}
		}
	});

	$("#editTaNameSubmit").on("click", function () {
		var netId = $("#changeTaNameNetId").val();
		var nameIn = $("#editTaNameInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a name");
		}
		else if (nameIn.match(/[^A-Za-z ]+/)) {
			alert("Only alphabetic characters are allowed");
		}
		else {
			$('#taNameEditModal').modal('hide');
			var obj = { name: nameIn, netId: netId };

			var success = function (data) {
				if (data.status == 'noname')
					$("#taNameEditModal").modal();
				else
					updateUI(data);
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#editTaNameInput").val("");
			postData(obj, "/editNames.php", success, error);
		}
	});

	$("#queueActive").on('change', function () {
		var value = { key: "queueActive", value: $("#queueActive").prop('checked') };

		var success = function (data) {
			$.each(data, function (index, obj) {
				$.each(obj, function (key, value) {
					$('#' + key).prop('checked', value == 'true' ? true : false);
					removeSpinner(key);
				});
			});
		};
		var error = function (data) { console.log(data); };

		spin("queueActive");

		postData(value, "/changeSettings.php", success, error);
	});

	$("#nameSubmit").on('click', function () {
		var nameIn = $("#nameInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a name");
		}
		else if (nameIn.match(/[^A-Za-z ]+/)) {
			alert("Only alphabetic characters are allowed");
		}
		else {
			$('#nameChangeModal').modal('hide');
			var obj = { name: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#nameChangeModal").modal({ backdrop: 'static', keyboard: false });
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#nameInput").val("");
			postData(obj, "/editNames.php", success, error);
		}
	});


	$("#changeCourseTitleButton").on("click", function () {
		$("#courseNameChangeModal").modal({ backdrop: 'static', keyboard: false });
	});

	$("#courseSubmit").on("click", function () {
		var nameIn = $("#courseNameInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a name");
		}
		else {
			$('#courseNameChangeModal').modal('hide');
			var obj = { key: 'courseTitle', value: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#courseNameChangeModal").modal({ backdrop: 'static', keyboard: false });
				else {
					updateUI({ settings: data });
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#courseNameInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}
	});

	$("#changeStudentPollTime").on("click", function () {
		$("#studentChangePollTimeModal").modal();
	});

	$("#studentPollTimeSubmit").on("click", function () {
		var nameIn = $("#studentPollTimeInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a value in miliseconds");
		}
		else if (nameIn.match(/[^0-9 ]+/)) {
			alert("Only numeric characters are allowed");
		}
		else if (nameIn < 3000) {
			alert("Value must be greater than 3000");
		}
		else {
			$('#studentChangePollTimeModal').modal('hide');
			var obj = { key: 'studentPollTime', value: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#studentChangePollTimeModal").modal();
				else {
					updateUI({ settings: data });
					alert("Student page must be refreshed for settings to take effect");
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#studentPollTimeInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}
	});

	$("#changeTAPollTime").on("click", function () {
		$("#taChangePollTimeModal").modal();
	});

	$("#taPollTimeSubmit").on("click", function () {
		var nameIn = $("#taPollTimeInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a value in miliseconds");
		}
		else if (nameIn.match(/[^0-9 ]+/)) {
			alert("Only numeric characters are allowed");
		}
		else if (nameIn < 3000) {
			alert("Value must be greater than 3000");
		}
		else {
			$('#taChangePollTimeModal').modal('hide');
			var obj = { key: 'taPollTime', value: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#taChangePollTimeModal").modal();
				else {
					updateUI({ settings: data });
					alert("Page must be refreshed for settings to take effect");
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#taPollTimeInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}
	});

	$("#changeNotifySpotNumberBtn").on("click", function () {
		$("#notifyThresholdChangeModal").modal();
	});

	$("#notifyThresholdSubmit").on("click", function () {
		var nameIn = $("#notifyThresholdInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a value");
		}
		else if (nameIn.match(/[^0-9 ]+/)) {
			alert("Only numeric characters are allowed");
		}
		else if (nameIn < 1) {
			alert("Value must be greater than 1");
		}
		else {
			$('#notifyThresholdChangeModal').modal('hide');
			var obj = { key: 'notifyThreshold', value: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#notifyThresholdChangeModal").modal();
				else {
					updateUI({ settings: data });
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
				console.log("ERROR " + data);
			};

			$("#notifyThresholdInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}
	});

	$("#changeLastXMinBtn").on("click", function () {
		$("#changeLastXMinModal").modal();
	});

	$("#changeLastXMinSubmit").on("click", function () {
		var value = $("#changeLastXMinInput").val();
		if (value.length <= 0) {
			alert("Please enter a value");
		}
		else if (value.match(/[^0-9 ]+/)) {
			alert("Only numeric characters are allowed");
		}
		else if (value < 1) {
			alert("Value must be greater than 1");
		}
		else {
			$('#changeLastXMinModal').modal('hide');
			var obj = { key: 'lastXMin', value: value };

			var success = function (data) {
				if (data.status == 'noname')
					$("#changeLastXMinModal").modal();
				else {
					updateUI({ settings: data });
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
				console.log("ERROR " + data);
			};

			$("#changeLastXMinInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}

	});

	$("#changePassOffHighlighColorBtn").on("click", function () {
		$("#changePassOffHighlighColorModal").modal();
		$(".passOffSelector").on('click', function () {
			var colorSquare = this;
			var id = colorSquare.id;
			var color = id.split('_')[1];

			if (typeof (color) != 'undefined') {
				$("#changePassOffHighlighColorModal").modal('hide');
				var obj = { key: 'passOffHighlightColor', value: color };
				var success = function (data) {
					updateUI({ settings: data });

				};
				var error = function (data) {
					//alert("There was an error saving your name");
				};

				postData(obj, "/changeSettings.php", success, error);
			}
		});

	});

	$("#changeMessageBtn").on("click", function () //TODO
	{
		console.log("YOU CLICKED ME!");
		$("#changeMessageModal").modal();
	});

	$("#changeMessageSubmit").on("click", function () {
		var nameIn = $("#changeMessageInput").val();
		if (nameIn.length <= 0) {
			alert("Please enter a message");
		}
		else {
			$('#changeMessageModal').modal('hide');
			var obj = { key: 'message', value: nameIn };

			var success = function (data) {
				if (data.status == 'noname')
					$("#changeMessageModal").modal();
				else {
					updateUI({ settings: data });
				}
			};
			var error = function (data) {
				//alert("There was an error saving your name");
			};

			$("#changeMessageInput").val("");
			postData(obj, "/changeSettings.php", success, error);
		}
	});

	$("#requireQuestion").on("click", function () {
		var setting = $('#requireQuestion').prop('checked');
		var obj = { key: 'requireQuestion', value: setting };
		var success = function (data) {
			$.each(data, function (index, obj) {
				$.each(obj, function (key, value) {
					$('#' + key).prop('checked', value == 'true' ? true : false);
					removeSpinner(key);
				});
			});
		};
		var error = function (data) { console.log(data); };

		spin("requireQuestion");

		postData(obj, "/changeSettings.php", success, error);
	});

	$("#displayMessage").on("click", function () {
		var setting = $('#displayMessage').prop('checked');
		var obj = { key: 'displayMessage', value: setting };
		var success = function (data) {
			getStatus(user);
			$.each(data, function (index, obj) {
				$.each(obj, function (key, value) {
					$('#' + key).prop('checked', value == 'true' ? true : false);
					removeSpinner(key);
				});
			});
		};
		var error = function (data) { console.log(data); };

		spin("showMessage");


		postData(obj, "/changeSettings.php", success, error);
	});

	$("#clearButton").on("click", function () {
		if (confirm("This will remove everone off the queue, and not count them as being helped. Are you sure you want to do this?")) {
			//put spinner on clear button
			spin("clearButton");

			var success = function (data) {
				//remove spinner
				removeSpinner("clearButton");
				if (data.status == "success")
					updateUI(data);
				else {
					console.log("Error clearing queue");
					console.log(data);
				}
			};

			var error = function (data) {
				//remove spinner
				removeSpinner("clearButton");
				alert("Error clearing queue");
			};

			postData(null, "/clearQueue.php", success, error);
		}
	});

	$("#resetDBBtn").on("click", function () {
		if (confirm("Are you sure you want to reset the database? This will delete everything! This can not be un-done!")) {
			var success = function (data) {
				alert("Database was reset.");
				getStatus(user);
			};
			var error = function () { console.log("error reseting the DB"); };
			postData({ confirmed: true }, "/DBInit.php", success, error);
		}
	});

	$("#stats").hide();
	$("#editTAs").hide();
	$("#viewSettings").hide();
	$("#extendedStats").hide();
	$("#editRawData").hide();

	$("#viewQueue").on('click', function () {
		toggleView("#queue");
	});
	$("#viewStats").on('click', function () {
		toggleView("#stats");
	});
	$("#viewAddTa").on('click', function () {
		toggleView("#editTAs");
	});
	$("#settings").on('click', function () {
		toggleView("#viewSettings");
	});
	$("#extendedStatsButton").on('click', function () {
		toggleView("#extendedStats");
	});
	$("#editRawDataButton").on('click', function () {
		toggleView("#editRawData");
	});

	if (typeof user !== 'undefined') {
		getStatus(user);
		getNameStatus();
	}

	var _old_alert = window.alert;
	window.alert = function () {
		// run some code when the alert pops up
		alertShown = true;
		_old_alert.apply(window, arguments);
		alertShown = false;
	};

});

function setUpEditRawData(event) {
	var startDate = $("#editRawDataStartDate").val();
	var startTime = $("#editRawDataStartTime").val();;
	var endTime = $("#editRawDataEndTime").val();

	if (startDate.length > 0 && startDate !== "" &&
		startTime.length > 0 && startTime !== "" &&
		endTime.length > 0 && endTime !== "") {
		if (event.data.crunchNumbers) {
			startDate = $('#editRawDataStartDate').datepicker('getDate');
			startTime = $('#editRawDataStartTime').timepicker('getTime', new Date(startDate.getTime()));
			endTime = $('#editRawDataEndTime').timepicker('getTime', new Date(startDate.getTime()));



			if (startTime.getTime() > endTime.getTime()) {
				alert("The end time is before the start time");
			}
			else {
				var success = function (data) {
					console.log(data);

					$("#editRawDataData").empty();

					$("#editRawDataData").append("<div class='row'>" +
						"<div class='col-xs-1'><strong>ID</strong>" +
						"</div>" +
						"<div class='col-xs-1'>" +
						"<strong>Student net id</strong>" +
						"</div>" +
						"<div class='col-xs-1'>" +
						"<strong>Removed By</strong>" +
						"</div>" +
						"<div class='col-xs-2'>" +
						"<strong>Enqueue Time</strong>" +
						"</div>" +
						"<div class='col-xs-2'>" +
						"<strong>Dequeue Time</strong>" +
						"</div>" +
						"<div class='col-xs-1'>" +
						"<strong>Question</strong>" +
						"</div>" +
						"<div class='col-xs-1'>" +
						"<strong>Pass off flag</strong>" +
						"</div>" +
						"<div class='col-xs-2'>" +
						"<strong>Done Getting help time</strong>" +
						"</div>" +
						"<div class='col-xs-1'>" +
						"<strong>Action</strong>" +
						"</div>" +
						"</div>");

					$.each(data.studentData, function (index, element) {
						$("#editRawDataData").append("<div class='row' style='padding-bottom:5px;' id='" + element.id + "'>" +
							"<div class='col-xs-1'>" +
							element.id +
							"</div>" +
							"<div class='col-xs-1'>" +
							"<input type='text' id='editRawNetId' disabled='true' value='" + element.netId + "'/>" +
							"</div>" +
							"<div class='col-xs-1'>" +
							"<input type='text' id='editRawRemovedBy' disabled='true' value='" + element.removedBy + "'/>" +
							"</div>" +
							"<div class='col-xs-2'>" +
							"<input type='text' id='editRawEnqueueTime' disabled='true' value='" + element.enqueueTime + "'/>" +
							"</div>" +
							"<div class='col-xs-2'>" +
							"<input type='text' id='editRawDequeueTime' disabled='true' value='" + element.dequeueTime + "'/>" +
							"</div>" +
							"<div class='col-xs-1'>" +
							"<input type='text' id='editRawQuestion' disabled='true' value='" + element.question + "'/>" +
							"</div>" +
							"<div class='col-xs-1'>" +
							"<input type='text' id='editRawPassOff' disabled='true' value='" + element.passOff + "'/>" +
							"</div>" +
							"<div class='col-xs-2'>" +
							"<input type='text' id='editRawDoneGettingHelpTime' disabled='true' value='" + (element.doneGettingHelp == null ? "None" : element.doneGettingHelp) + "'/>" +
							"</div>" +
							"<div class='col-xs-1'>" +
							"<button class='btn btn-warning fa fa-edit' id='" + element.id + "Btn' onclick=editRawData('" + element.id + "')></button>" +
							/*"<button class='btn btn-danger fa fa-times' id='" + element.id + "Btn' onclick=editRawData('" + element.id + "', 'cancel')></button>" +*/
							"</div>" +
							"</div>");
					});
				}

				var error = function (error) {
					console.log("Error getting extended content" + error);
				};
				getExtendedStats("?netId=&startTime=" + startTime.getTime() + "&endTime=" + endTime.getTime(), success, error);
			}
		}
		else {
			//check the boxes are filled and then enable the button.
			$("#editRawDataGetDataBtn").prop("disabled", false);
			$("#editRawDataGetDataBtn").removeClass("btn btn-warning");
			$("#editRawDataGetDataBtn").addClass("btn btn-success", true);
			$("#editRawDataGetDataBtn").html('Click to update the information below');
		}
	}
	else {
		$("#editRawDataGetDataBtn").prop("disabled", true);
		$("#editRawDataGetDataBtn").addClass("btn btn-warning", true);
		$("#editRawDataGetDataBtn").html('Pick a date range to view');
	}

}

function editRawData(id, action) {
	var keys = ['id', 'netId', 'removedBy', 'enqueueTime', 'dequeueTime', 'question', 'passOff', 'doneGettingHelpTime'];
	var cancel = false
	if (typeof (action) != 'undefinded') {
		if (action == "cancel")
			cancel = true;
	}

	var fields = $("#" + id).find("input").not("button");
	var inputs = { id: id };
	fields.each(function (index, element) {
		var isDisabled = $(element).is(':disabled');
		if (isDisabled && element.id != id) {
			$(element).prop('disabled', false);
			inEditMode = true;

		} else {
			$(element).prop('disabled', true);
			inEditMode = false;
			//validate input
			inputs[keys[index + 1]] = $(element).val();
		}
	});

	if (!inEditMode) {
		if (cancel) {
			//i don't know if i like this....
		}
		else {
			//send num row off to server for saving
			serverUpdateRawData(inputs);
		}
	}

	var allFields = $("#editRawDataData").find("button");
	allFields.each(function (index, element) {
		var temp = id + "Btn";
		if (inEditMode) {
			if (element.id == temp) {
				$(element).prop('disabled', false);
				//$(element).html("SAVE");
				$(element).removeClass("fa fa-edit btn btn-warning")
				$(element).addClass("fa fa-save btn btn-success")
				//Save this rows data incase cancel is pressed
			}
			else {
				$(element).prop('disabled', true);
				$(element).removeClass("fa fa-save btn btn-success")
				$(element).addClass("fa fa-edit btn btn-warning")
			}
		}
		else {
			$(element).prop('disabled', false);
			//$(element).html("EDIT");
			$(element).removeClass("fa fa-save btn btn-success")
			$(element).addClass("fa fa-edit btn btn-warning")
			//clear out saved info that is used for cancel case

		}
	});
}

function getDayHelpCount(netId, fn) {

	getExtendedStats(
		"?netId=" + netId + "&startTime=&endTime=",
		data => {
			let timesHelped = 0
			const thisMorning = new Date(
				new Date().getFullYear(),
				new Date().getMonth(),
				new Date().getDate()
			)
			data.studentData.forEach(question => {
				if (question.passOff != "true" && question.enqueueTime > thisMorning) {
					timesHelped++
				}

			});
			fn(timesHelped)
		},
		data => { }
	)
}

function updateUI(data) {

	if (data.hasOwnProperty("settings")) {
		$.each(data.settings, function (index, obj) {
			$.each(obj, function (key, value) {
				//blankly check all check boxes
				$("#" + key).html(value);
				$('#' + key).prop('checked', value == 'true' ? true : false);

				if (key === "courseTitle") //check if the course title has been set
				{
					if (value == null || value == "") {
						$("#courseNameChangeModal").modal({ backdrop: 'static', keyboard: false });
					}
					else {
						$("#courseTitle").empty();
						$("#courseTitle").html(value);
						$("#courseTitleField").empty();
						$("#courseTitleField").html(value);

						originalTitle = value + " Help Queue";
						document.title = value + " Help Queue";
					}
				}
				if (key === "notifyThreshold") {
					notifyThresholdNum = value;
					$("#notifyThresholdPostFix").empty();
					$("#notifyThresholdPostFix").html(getNumberPostFix(value));
				}
				if (key === "queueActive") {
					queueActive = value == "true" ? true : false;
					if (value == "false") {
						//disable question and pass off check
						$("#questionInput").attr('disabled', 'disabled');
						$("#passOffCheckBox").attr('disabled', 'disabled');
					}
				}
				if (key == "passOffHighlightColor") {
					$("#currentPassOffHighlightColor").css("color", value);
					currentPassOffHighlightColor = value;
				}
				if (key == "lastXMin") {
					$(".lastXMin").empty();
					$(".lastXMin").html(value);
				}
				if (key == "requireQuestion") {
					if (value == "true") {
						$("#questionsRequired").show();
						$("#questionsNotRequired").hide();
					}
					else {
						$("#questionsRequired").hide();
						$("#questionsNotRequired").show();
					}
				}
				if (key == "message") {
					currentMessage = value;
					$("#currentMessage").html(value);
				}

				if (key == "displayMessage") {
					if (value == "true") {
						$("#message").show();
					}
					else {
						$("#message").hide();
					}
				}
			});
		});
	}

	if (data.hasOwnProperty("status") && data.status === "loggedOut") {
		window.location.href = "/?logout=";
	}
	else if (data.hasOwnProperty("status") && data.status === "error") {
		if (data.hasOwnProperty("message")) {
			alert("ERROR: " + data.message);
			//set up page for 'not in line' status
			helpButtonHandle = "/queueUp.php";
			poll = false;
			currentSpotInLine = -1;
			$("#questionInput").removeAttr('disabled');
			$("#passOffCheckBox").removeAttr('disabled');

			//$("#questionInput").val(""); dont delete their question. just have them trim it down
			$('#passOffCheckBox').prop('checked', false);
			verifyStudentInputToggleButton();
		}
		else
			alert("Error with the error");
	}
	else if (data.hasOwnProperty("spot") && data.hasOwnProperty("enqueueTime")) {

		if (pauseUpdate == false) {
			var spot = data.spot;
			enqueueTime = data.startedGettingHelpTime == null ? data.enqueueTime : data.startedGettingHelpTime;
			currentlyGettingHelp = data.startedGettingHelpTime != null;
			if (spot <= notifyThresholdNum && parseInt(spot) >= 0 && data.startedGettingHelpTime == null) {
				if (!alertShown && currentSpotInLine != spot) {
					//title flashing
					if (!flashTitleBool) {
						flashTitleBool = true;
						flashTitle("Its almost your turn to get help!");
						showNotification();
					}
				}
			}

			if (parseInt(spot) < 0) //not in line
			{
				helpButtonHandle = "/queueUp.php";
				poll = false;
				currentSpotInLine = -1;
				$("#questionInput").removeAttr('disabled');
				$("#passOffCheckBox").removeAttr('disabled');

				$('.enqueueButton').show()
				$("#stopGettingHelped").hide()

				$("#passOffButtonNoQuestion").removeAttr('disabled');
				$("#getHelpButtonNoQuestion").removeAttr('disabled');

				//if this is true the student JUST got out of line, so sure, clear
				//the question input. otherwise dont. they could be typing something in
				//as we refresh!
				if (flashTitleBool)
					$("#questionInput").val("");
				$('#passOffCheckBox').prop('checked', false);
				verifyStudentInputToggleButton();

				flashTitleBool = false;

			}
			else //in line
			{
				$(".helpButton").removeClass("btn-success");
				$(".enqueueButton").hide()
				$("#stopGettingHelped").show()
				$("#stopGettingHelped").removeAttr('disabled')
				$("#getHelpError").html('')
				$("#passOffButtonNoQuestion").removeClass("btn-warning");
				$("#getHelpButtonNoQuestion").removeClass("btn-warning");
				$(".helpButton").addClass("btn-danger");
				//set up the default colors/classes
				$("#passOffButtonNoQuestion").addClass("btn-info");
				$("#getHelpButtonNoQuestion").addClass("btn-success");

				removeSpinner("passOffButtonNoQuestion");
				removeSpinner("getHelpButtonNoQuestion");

				if (data.passOff == "true") {
					$("#getHelpButtonNoQuestion").attr('disabled', 'disabled');
					$("#passOffButtonNoQuestion").removeAttr('disabled');
					$("#passOffButtonNoQuestion").removeClass("btn-info");
					$("#getHelpButtonNoQuestion").removeClass("btn-success");
					$("#passOffButtonNoQuestion").addClass("btn-danger");

					if (data.startedGettingHelpTime == null) {
						$("#passOffButtonNoQuestion").html("Get out of line");
						$("#getHelpButtonNoQuestion").html("You are in line to pass off");
					}
					else {
						$("#passOffButtonNoQuestion").html("I'm done getting help");
						$("#getHelpButtonNoQuestion").html("You are currently being helped");
					}
				}
				else {
					$("#passOffButtonNoQuestion").attr('disabled', 'disabled');

					$("#getHelpButtonNoQuestion").removeAttr('disabled');

					$("#getHelpButtonNoQuestion").removeClass("btn-success");
					$("#passOffButtonNoQuestion").removeClass("btn-info");
					$("#getHelpButtonNoQuestion").addClass("btn-danger");

					if (data.startedGettingHelpTime == null) {
						$("#passOffButtonNoQuestion").html("You are in line to get help");
						$("#getHelpButtonNoQuestion").html("Get out of line");
					}
					else {
						$("#getHelpButtonNoQuestion").html("Be done getting help");
						$("#passOffButtonNoQuestion").html("You are currently being helped");
					}

				}

				if (data.startedGettingHelpTime == null) {
					var postfix = getNumberPostFix(spot);

					$("#stopGettingHelped").html("Get out of line");
					$("#queueNum").html('You are currently the <strong>' + spot + postfix + '</strong> in line to get help');
				}
				else {
					$("#stopGettingHelped").html("Done getting help");
					$("#queueNum").html('<strong>You are currently being helped</strong>');
				}
				helpButtonHandle = "/removeFromQueue.php";
				removeSpinner("getHelpButton");

				poll = true;
				currentSpotInLine = spot;
				$("#questionInput").attr('disabled', 'disabled');
				$("#passOffCheckBox").attr('disabled', 'disabled');

				if (data.hasOwnProperty('question'))
					$("#questionInput").val(data.question);
				if (data.hasOwnProperty('passOff'))
					$('#passOffCheckBox').prop('checked', data.passOff == 'true' ? true : false);
			}
		}
	}
	else if (data.hasOwnProperty("list")) {
		if (data.list.length > 0) {
			if (firstStudent) {
				var audio = new Audio("newSound.mp3");
				audio.play();
				firstStudent = false;
			}
			//notification
			//This will show the notification on the screen. Super nice because if a user is not in their browser, the notification
			//will still show up on the screen. Sadly, every time the client polls it removes the current notificaion and displays
			//the same notification again. Looks really ugly. If I could find a close trigger that gets fired when the notification
			//is closed (either by the user or by some JS) then a simple boolean could be toggled (to show the notification based on
			//if there is already a notification on the screen.) At the time of writting this the close or onclose method of the
			//notification interface were depricated and could not be relied on.

			//Another idea is to just show it once on the student side, then never again till they get back in line??? that could work
			//not helpful for a TA...but does it need to be? if there are loads of people on the queue the TA doenst need to know to
			//look at the queue, its full. They already know to look.

			/*if (typeof Notification !== 'undefined')
			{

				Notification.requestPermission(function (permission)
				{
					if (permission === 'granted')
					{
						var notification = new Notification('Someone needs your help!', {
							body: 'In fact, ' + data.list.length + " " + (data.list.length == 1 ? 'person' : "people") + " need your help",
							tag:"MyNotify"
						});

						notification.onclick = function ()
						{
							window.focus();
						};
					}
				});
			}*/

			var someonesStillInLine = false;
			for (var index = 0; index < data.list.length; index++) {
				if (data.list[index].startedGettingHelpTime == null) {
					someonesStillInLine = true;
					break;
				}
			}
			//title flashing
			if (someonesStillInLine) {
				if (!flashTitleBool) {
					flashTitleBool = true;
					flashTitle("Someone needs your help!");
					firstStudent = true;
				}
			}
			else {
				flashTitleBool = false;
			}
		}
		else //there is no one else in line. Dont flash the title
		{
			flashTitleBool = false;
			firstStudent = true;
		}
		//if we are here the person logged in is a TA. turn polling on
		poll = true;

		//remove the elements in the list so it doesn't repeat and get huge
		$('#list').empty();
		$.each(data.list, function (index, obj) {
			if (obj.question == null)
				obj.question = "NONE";

			//the default, non pass off view
			var questionColumn = '<div class="col-xs-4">' + obj.question + '</div>';

			if (obj.passOff == "true")//oh! its a pass off!
			{
				questionColumn = '<div class="col-xs-4" style="background-color:' + currentPassOffHighlightColor + '">' + obj.question + '</div>';
			}

			getDayHelpCount(obj.netId, timesHelped => {
				var output;
				if (obj.startedGettingHelpTime == null) //waiting in line
				{
					output = '<div class="row myRow" id="' + obj.netId + '">' +
						'<div class="col-xs-1">' + obj.name + '</div>' +
						questionColumn +
						'<div class="col-xs-2">' + obj.zoomLink + '</div>' +
						'<div class="col-xs-2">' + getTimeDifference(parseInt(obj.enqueueTime)) + '</div>' +
						'<div class="col-xs-1">' + timesHelped + '</div>' +
						'<div class="col-xs-2"><button id="removeButton' + obj.netId + '" onClick=removePerson(\'' + obj.netId + '\') class="btn btn-info btn-lg fa fa-ambulance"> Offer Assistance' +
						'</button></div></div>';
				}
				else // currently getting help
				{
					output = '<div class="row myRow gettingHelpRow" id="' + obj.netId + '">' +
						'<div class="col-xs-1">' + obj.name + '<br/>(Being helped by: ' + convertNetIdToName(obj.beingHelpedBy) + ')</div>' +
						questionColumn +
						'<div class="col-xs-2">' + obj.zoomLink + '</div>' +
						'<div class="col-xs-2">' + getTimeDifference(parseInt(obj.startedGettingHelpTime)) + '</div>' +
						'<div class="col-xs-1">' + timesHelped + '</div>' +
						'<div class="col-xs-2"><button id="removeButton' + obj.netId + '" onClick=removePerson(\'' + obj.netId + '\') class="btn btn-danger btn-lg fa fa-times"> Remove' +
						'</button></div></div>';
				}
				$('#list').append(output);
			})


		});

	}

	if (data.hasOwnProperty("stats")) {

		$("#statsList").empty();
		$("#taList").empty();
		$.each(data.stats.tas, function (index, obj) {
			//add each TA to the Stats page
			var output = '<div class="row myRow" id="' + obj.netId + '"><div class="col-xs-2">' + (obj.active == 1 ? "TA" : "TA (non-active)") + '</div><div class="col-xs-3">' +
				obj.netId + '</div><div class="col-xs-3">' + obj.name + '</div><div class="col-xs-2">' + obj.helpCounter + '</div>' +
				'<div class="col-xs-2">' + obj.passOffCounter + '</div></div>';

			$("#statsList").append(output);

			//add each TA to the Edit TA page
			var editTAOutput = '<div class="row myRow" id="' + obj.netId + '"><div class="col-xs-3">' +
				obj.netId + '</div><div class="col-xs-3">' + obj.name + '</div><div class="col-xs-2">' + obj.helpCounter + '</div>' +
				'<div class="col-xs-2">' + obj.passOffCounter + '</div>' +
				'<div class="col-xs-2">' +
				'  <input id="' + obj.netId + 'ActiveToggle" type="checkbox" onchange="toggleTAActive(\'' + obj.netId + "'," + obj.active + ')"' + (obj.active == 1 ? 'checked' : '') + '></input>' +
				'  <button onclick="editTAName(\'' + obj.netId + '\')" class="btn btn-sm btn-warning fa fa-edit" style="margin-left:5px; margin-top:-5px;"></button>' +
				'</div>';
			/*
							'<div class="col-xs-2"><button id="rmvBtn'+obj.netId+'" onClick="toggleTAActive(\'' + obj.netId + "'," + obj.active + ')" class="btn btn-danger btn-lg fa fa-times"></div></div>';
			*/
			$("#taList").append(editTAOutput);
		});
		$("#statsList").append("<hr>");
		$.each(data.stats.students, function (index, obj) {
			//add each student to the stats page
			var output = '<div class="row myRow" id="' + obj.netId + '"><div class="col-xs-2">Student</div><div class="col-xs-3">' +
				obj.netId + '</div><div class="col-xs-3">' + obj.name + '</div><div class="col-xs-2">' + obj.helpCounter + '</div>' +
				'<div class="col-xs-2">' + obj.passOffCounter + '</div></div>';

			$("#statsList").append(output);
		});
	}
	else {
		//alert("An error has occurred");
		console.log(data);
	}

	if (data.hasOwnProperty("avgs")) {
		$("#topCount").empty()
		$("#topAvg").empty();
		$("#queueLen").empty();
		$("#currentlyBeingHelped").empty();
		$("#enqueueInLastXMin").empty();
		$("#dequeueInLastXMin").empty();

		$("#topCount").append(data.avgs.avgLen);
		$("#queueLen").append(data.avgs.queueLen);
		if (data.avgs.avg > 10) //just a random number above 0 to no give wrong results when noones on the queue
			$("#topAvg").append(getTimeDifference(data.avgs.avg));
		else
			$("#topAvg").append("0");

		if (data.avgs.hasOwnProperty("currentlyBeingHelpedCount")) {
			$("#currentlyBeingHelped").append(data.avgs.currentlyBeingHelpedCount);
		}

		if (data.avgs.hasOwnProperty("enqueueInLastXMin")) {
			$("#enqueueInLastXMin").append(data.avgs.enqueueInLastXMin);
		}

		if (data.avgs.hasOwnProperty("dequeueInLastXMin")) {
			$("#dequeueInLastXMin").append(data.avgs.dequeueInLastXMin);
		}
	}
}

function editTAName(netId) {
	$("#taNameEditModal").modal();
	$("#changeTaNameNetId").val(netId);
}

function convertNetIdToName(netId) {
	//TODO when you can convert globalTas to be dict of netId to name
	//Just like globalStudentNames (this requires changes to other parts of code)
	//and should be done in all the on success functions that call getExtendedStats
	for (person in globalTas) {
		if (globalTas[person].netId == netId)
			return globalTas[person].name;
	}

	return globalStudentNames[netId];
}

function convertNumDateToName(inDate) {
	var monthNames = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];

	inDate = new Date(inDate);
	return monthNames[inDate.getMonth()] + "-" + inDate.getDate() + "-" + inDate.getFullYear();
}
function formatOutputDateAMPM(date, includeDay, includeTime) {
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var year = date.getFullYear();
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var seconds = date.getSeconds();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = pad(minutes);// < 10 ? '0'+minutes : minutes;
	seconds = pad(seconds);
	var strTime = "";
	if (includeDay)
		strTime += month + "/" + day + "/" + year + " ";

	if (includeTime)
		strTime += hours + ':' + minutes + ':' + seconds + ' ' + ampm;
	return strTime;
}
function pad(n) { return ("0" + n).slice(-2); }

var tempSpot = 5;
function removePerson(user) {
	var userInfo =
	{
		username: user
	};
	spin('removeButton' + user);

	var success = function (data) { removeSpinner('removeButton' + user); updateUI(data); };
	var error = function (data) { console.log(data); };

	postData(userInfo, "/removeFromQueue.php", success, error);
}

function toggleTAActive(netId, currentActiveStatus) {
	//undo the default check box action
	$('#' + netId + "ActiveToggle").prop('checked', currentActiveStatus == 1 ? true : false);
	if (netId === user) {
		alert("You can not deactivate yourself!");
		return;
	}
	spin(netId + "ActiveToggle");

	var message;
	if (currentActiveStatus == 1)
		message = "Are you sure you want to deactive the TA " + netId + "?";
	else
		message = "Are you sure you want to active the TA " + netId + "?";

	if (confirm(message)) {
		var userInfo =
		{
			username: netId,
			action: "toggleTAActive"
		};
		spin("rmvBtn" + netId);

		var scallBack = function (data) { removeSpinner(netId + "ActiveToggle"); updateUI(data); };
		var ecallBack = function (data) { removeSpinner(netId + "ActiveToggle"); console.log(data); };
		postData(userInfo, "/editTAs.php", scallBack, ecallBack);
	}
	else {
		//undo the default check box behavior
		//$('#' + netId + "ActiveToggle").prop('checked', currentActiveStatus == 1 ? true : false);
		removeSpinner(netId + "ActiveToggle");
	}
}

function getNumberPostFix(value) {
	var postfix = "th";
	switch (value % 10) {
		case 1:
			if (value != 11)
				postfix = "st";
			break;
		case 2:
			if (value != 12)
				postfix = "nd";
			break;
		case 3:
			if (value != 13)
				postfix = "rd";
			break;
		default:
			postfix = "th";
	}
	return postfix;
}

function spin(target) {
	$("#" + target).attr('disabled', 'disabled');
	var target = document.getElementById(target);
	spinner = new Spinner().spin(target);
}

function removeSpinner(target) {
	$("#" + target).removeAttr('disabled');
	if (typeof spinner !== 'undefined')
		spinner.stop();
}

function serverUpdateRawData(input) {

	$.ajax({
		url: addressBase + '/updateRawData.php',
		type: 'post',
		dataType: 'json',
		data: { data: input },
		success: function (data) {
			console.log(data);
		},
		error: function (data) {
			console.log(data);
		}
	});
}

function getNameStatus() {
	$.ajax({
		url: addressBase + '/editNames.php',
		type: 'get',
		dataType: 'json',
		success: function (data) {
			if (data.hasOwnProperty("name")) {
				if (data.name == null)
					$("#nameChangeModal").modal({ backdrop: 'static', keyboard: false });
			}
			console.log(data);
		},
		error: function (data) {
			//alert("An Error has occurred checking name status");
			console.log(data);
		}
	});
}

//to help with the issue of students being auto logged out for inactivity
//the try again is passed in by the recursive call in the error function.
//if there is an error, we double check. if there is an error again the
//page automatically logs out, and the student sees it.
function getStatus(userName, tryAgain) {
	$.ajax({
		url: addressBase + '/getStatus.php?id=' + userName,
		type: 'get',
		dataType: 'json',
		success: function (data) {
			console.log(data);
			refreshTime = new Date().getTime();
			updateUI(data);
		},
		error: function (data) {
			//	alert("An Error has occurred");
			console.log(data);
			//try again real quick
			if (tryAgain = typeof (tryAgain) == 'undefined' || tryAgain) {
				getStatus(userName, false);
			}
		}
	});
}

function getExtendedStatsToStart() {
	var success = function (data) {
		console.log(data);
		extendedStatsData = data.studentData;
		globalTas = data.tas;

		for (index in data.studentNames) {
			globalStudentNames[data.studentNames[index].netId] = data.studentNames[index].name;
			globalStudentNamesRaw.push(data.studentNames[index]);
		}
	};
	var error = function (data) {
		//	alert("An Error has occurred");
		console.log(data);
	};
	//all we really care about are the names and net ids for the typeahead.
	//for that reason the start and end times are set so no time is spent
	//getting extended stat data
	getExtendedStats("?netId=&startTime=0&endTime=1", success, error);
}

function getExtendedStats(paramsString, success, error) {
	$.ajax({
		url: addressBase + '/getExtendedStats.php' + paramsString,
		type: 'get',
		dataType: 'json',
		success: success,
		error: error
	});
}

function postData(userName, handle) {

	var success = function (data) {
		console.log("Post complete");
		console.log(data);
		updateUI(data);
	};

	var error = function (data) {
		console.log(data);
	};
	postData(userName, handle, success, error);
}

function postData(userName, handle, callBackSuccess, callBackError) {

	console.log(window.location.origin + addressBase + handle);
	$.ajax({
		url: window.location.origin + addressBase + handle,
		type: 'post',
		dataType: 'json',
		success: callBackSuccess,
		error: callBackError,
		data: userName
	});
}

Chart.types.Bar.extend({
	name: "BarYaxisMinutes",
	draw: function () {
		Chart.types.Bar.prototype.draw.apply(this, arguments);

		var ctx = this.chart.ctx;
		ctx.save();
		// text alignment and color
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = this.options.scaleFontColor;
		// position
		var x = this.scale.xScalePaddingLeft * 0.4;
		var y = this.chart.height / 2;
		// change origin
		ctx.translate(x, y)
		// rotate text 	−1.570796327 = -90 * Math.PI / 180 (something magic)
		ctx.rotate(-1.570796327);
		ctx.fillText("Minutes", 0, 0);
		ctx.restore();
	}
});

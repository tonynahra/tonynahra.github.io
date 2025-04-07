
function toggle(sec){
	eSec = sec.nextElementSibling ;
	secStatus = eSec.style.display == "none" ;
	eSec.style.display = secStatus ? "block" : "none" ;
	eSec.previousElementSibling.firstElementChild.src = secStatus ? "../img/opened.png" : "../img/closed.png" ;
}
function toggleOLD(secName){
	 if ( document.getElementById(secName).style.display==''){
		 document.getElementById(secName).style.display = 'none' ;
		 document.getElementById(secName+'Button').src = '../img/closed.png' ;
	 } else {
		 document.getElementById(secName).style.display = '' ;
		 document.getElementById(secName+'Button').src = '../img/opened.png' ;
	 }
	secName = "msg" ;
	document.getElementById(secName).style.visibility = 'hidden' ;
 }
 
 var Oper = false ;

 function showAll(hideShow) {
	Oper = hideShow ; 
    var SUBs = document.querySelectorAll(".SUB");
    [].forEach.call(SUBs, function(SUB) {
		SUB.style.display = Oper ? "none" : "block" ;
		SUB.previousElementSibling.firstElementChild.src = Oper ? "../img/closed.png" : "../img/opened.png" ;
    });
	document.getElementById("togAll").innerHTML = Oper ? "Expand All" : "Collapse All" ;
 }
 
 function toggleAll() {
	 showAll(!Oper);
 }
 
 function expandAll() {
	 Oper = '' ;
	 hide() ;
	 Oper = 'none' ;
	 secName = "msg" ;
	 document.getElementById(secName).style.visibility = 'hidden' ;
 }

function noMsg(){
	secName = "msg" ;
	document.getElementById(secName).style.visibility = 'hidden' ; 
}

function toggleSkills() {
	// toggle('Skills') ;
	document.getElementById('Skills').style.display = '' ;
	document.getElementById('SkillsButton').src = '../img/opened.png' ;
}

function START() {
	 setTimeout( toggleAll , 2000 ) ; 
	 setTimeout( toggleSkills , 2500 ) ; 
}

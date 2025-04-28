// https://api.github.com/repositories/643587168/git/trees/main?recursive=1

defaultFldr = "Kids" ;
const excluded = ["photos", "lib"];
const extAllowed =[".png",".jpg"];
var iCnt = 0 ;
var CurImg = 0 ;
function z(e){
  console.log(e.src);
  for ( i=0 ; i< iCnt ; i++ ) {
      if ( e.src == document.getElementsByTagName("img")[i].src ) {
	      CurImg = i ;
	      break;
      }	      
  }
  if ( CurImg == 0 ) { prevDis = " disabled " ; } else { prevDis = "" ; }	
  if ( CurImg == (iCnt-1) ) { nxtDis = " disabled " ; } else { nxtDis = "" ; }
  document.getElementById("FULL").style.display = "block" ;
  document.getElementById("FULL").style.width = "100%" ;
  document.getElementById("FULL").style.height = "100%" ;
  document.getElementById("FULL").style.top = "0px" ;
  document.getElementById("FULL").style.left = "0px" ;	
  document.getElementById("FULL").innerHTML = "<img src='" + e.src + "' style='width:90%; height: auto;' onclick='clsFull()' ><br><button onclick='prev()' " + prevDis + " ><<<</button> <button onclick='clsFull()'>Close</button> <button onclick='nxt()' " + nxtDis + " >>>></button>" ;

}
function prev(){
   ni = document.getElementsByTagName("img")[CurImg-1] ;
   z(ni);	
}
function nxt(){
   ni = document.getElementsByTagName("img")[CurImg+1] ;
   z(ni);	
}	
	
function clsFull(){
  document.getElementById("FULL").innerHTML = "" ;
  document.getElementById("FULL").style.display = "none" ;
  document.getElementById("FULL").style.width = "1px" ;
  document.getElementById("FULL").style.height = "1px" ;
}	
function CA(itm) {
  defaultFldr = document.getElementById("S").value ;	
  C( defaultFldr ) ;
}
function s() {
  C(defaultFldr);	
}
function C(dFldr) {
     imgStr = "" ;
     imgA = [] ;
     iCnt=0;	
     for ( i=1 ; i <= ( ghJSON.tree.length - 1 ) ; i++ ) {
         PTH = ghJSON.tree[i].path ;
         if ( !PTH.includes(".") && !PTH.startsWith("img") && !excluded.includes(PTH) ) {
               alb.push(PTH.replace("photos/" , "") ) ;
         } else {
            if ( PTH.startsWith("photos/"+dFldr+"/") ) {
		fEXT = PTH.slice(-4).toLowerCase();     
	  	if ( extAllowed.includes(fEXT) ) {
			iCnt++ ;
               		imgA.push( "<img src='/personal/" + PTH + "' onclick='z(this)' >" ) ;   
		}	
	    }
         }
           
      }
  shuffleArray(imgA);
  imgStr = imgA.join("");
        document.getElementById("photos").innerHTML = imgStr ;
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
  
alb = [] ;
function showSel(dFldr) {
	albLinks = "" ;
        for ( i=0 ; i <= alb.length -1 ; i++ ) {
            if ( defaultFldr == alb[i] ) { SEL = " selected " ; } else { SEL = "" ; }
	        albLinks += "<option value='" + alb[i] + "' " + SEL + " >" + alb[i] + "</option>" ;	
        }
	document.getElementById("albums").innerHTML = "<select id=S onchange='CA(this)' >" + albLinks + "</select>" ;
}
  
var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};

getJSON('https://api.github.com/repos/tonynahra/personal/git/trees/master?recursive=1',
function(err, data) {
  if (err !== null) {
    console.log('Something went wrong: ' + err);
  } else {
    ghJSON = data ;
    C( defaultFldr ) ;	  
    showSel( defaultFldr ) ;	  
  }  
});

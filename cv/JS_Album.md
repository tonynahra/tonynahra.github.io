```javascript
window.onload = function () 
{
	function openNext() {
		nextN = parseInt(document.getElementById('next').innerText) ;
		url = document.getElementsByTagName('img')[nextN].src ;
		loadImageModal(url);
	}
	
	$(".i").on({
		'click': function() {
		    url=$(this).attr("src");
		    imgTot = document.querySelectorAll('.i').length ;
	            for ( i=0 ; i < imgTot ; i++ ) {
	                tmp =   document.getElementsByTagName('img')[i].src ;    
	                if (tmp.indexOf(url) > 1 ) {
			   document.getElementById("next").innerText = i ;
			   break;
		        }
		    }
		    loadImageModal(url);
		}
	});
	

	$(".prv").on({
		'click': function(){
			curN = parseInt(document.getElementById('next').innerText) ;
			nextN = -1 ;
			noMore = true ;
			for ( let i= (curN-1) ; i >= 0 ; i-- ) {
				if ( document.querySelectorAll('.i')[i].parentNode.classList.value != 'hide' ) {
				   if ( nextN == -1 ) {
					   nextN = i ;
				   } else {
					   nextBeyond = false ;
					   break ;
				   }				   	
				}	
			}

			document.getElementsByClassName('nxt')[0].disabled = false ;
			document.getElementById('next').innerText = nextN ;
			if ( noMore ) document.getElementById('prv').disabled = true ;
			url = document.getElementsByTagName('img')[nextN].src ;
			loadImageModal(url);
		}
	});

	$(".nxt").on({
		'click': function(){
			nextN = -1 ;
			noMore = true ;
			curN = parseInt(document.getElementById('next').innerText) ;
			console.log( "current:[" + curN +"]" );
			for ( i=(curN+1) ; i < imgTot ; i++ ) {
				if ( document.querySelectorAll('.i')[i].parentNode.classList.value != 'hide' ) {
   				   if ( nextN == -1 ) {
					   nextN = i ;
				   } else {
					   noMore = false ;
					   break ;
				   }
				}	
			}				

			if ( noMore ) document.getElementById('nxt').disabled = true ;
			document.getElementsByClassName('prv')[0].disabled = false ;
			document.getElementById('next').innerText = nextN ;
			url = document.getElementsByTagName('img')[nextN].src ;
			loadImageModal(url);
		}
	});

	$(".cls").on({
		'click': function(){
			$("#image-modal-popup").hide();
			// closeImagePopup();
		}
	});

	$("#image-modal-popup, #image-modal-close-button").on({
		'click': function() {
			closeImagePopup();
		}
	});

	var waitForImageLoadedEventBeforeDisplaying=false;
	var fadeInImageEnabled=true;

	function onImageLoaded() 
	{		
		document.getElementsByClassName('prv')[0].disabled = false ; 
		document.getElementsByClassName('nxt')[0].disabled = false ;
		imageWidth	 = this.width;
		imageHeight	 = this.height;
		
		$("#image-modal-loader").hide();
		$("#image-modal-image").attr("src",this.src);
		if (fadeInImageEnabled)
		{		
			$("#image-modal-image").fadeIn();
		}
	}

	function loadImageModal(url) {	
		$("#image-modal-popup").fadeIn();
		if (fadeInImageEnabled)
		{
			//// $("#image-modal-image").hide();
		}
		
		if (waitForImageLoadedEventBeforeDisplaying)
		{
			$("#image-modal-loader").show();			
			$("#image-modal-image").attr("src",'');
			var tempImage=new Image();
			tempImage.onload = onImageLoaded;
			tempImage.src=url;
		}
		else
		{
			$("#image-modal-image").attr("src",url);
			$("#image-modal-image").show();
		}
		curN = parseInt(document.getElementById('next').innerText) ;
		noBefore = true ;
		noAfter  = true ;
		for ( i=0 ; i < imgTot ; i++ ) {
			if ( document.querySelectorAll('.i')[i].parentNode.classList.value != 'hide' ) {
			   if ( i < curN ) noBefore = false ;
			   if ( i > curN ) noAfter  = false ;
			}
		}

		document.getElementsByClassName('prv')[0].disabled = false ; 
		document.getElementsByClassName('nxt')[0].disabled = false ;
		if ( noBefore ) document.getElementsByClassName('prv')[0].disabled = true ; 
		if ( noAfter )  document.getElementsByClassName('nxt')[0].disabled = true ;
	}

	function closeImagePopup() 
	{
		////// $("#image-modal-popup").fadeOut();
	}
}

function show(Cat){
	const links = document.querySelectorAll('a');
	links.forEach(link => { link.style.fontWeight = 'normal'; link.style.backgroundColor = "white"; });
	document.getElementById(Cat).style.fontWeight = 'bold' ;
	document.getElementById(Cat).style.backgroundColor = "lightgray";
	   
	const allDivs = document.querySelectorAll('div');
	allDivs.forEach(div => {
		if (div.getAttribute('DoNotTouch') == 'true' ) {
		    // do nothing
		} else if (div.getAttribute('category')===undefined) {
		    // do nothing
		} else if (div.getAttribute('category')==null) {
		    // do nothing			
		} else if (div.getAttribute('category')?.includes(Cat) || (Cat == 'ALL') ) {
		    if (div.classList.contains('hide')) {
		      div.classList.replace('hide','show');	    
		    } else {	    
		      div.classList.add('show');	
		    }	    
		} else {	
		    if (div.classList.contains('show')) {	
		        div.classList.replace('show','hide');
		    } else {
			div.classList.add('hide');    
		    }		    
		}
	});
}
```

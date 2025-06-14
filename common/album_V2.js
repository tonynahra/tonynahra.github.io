window.onload = function () 
{

	function openNext() {
		nextN = parseInt(document.getElementById('next').innerText) ;
		url = document.getElementsByTagName('img')[nextN].src ;
		loadImageModal(url);
	}

	//******************************************************
	// Handle "click" event on image that contains "image-popup class.
	//******************************************************
	$(".image-popup").on({
		'click': function() {
			url=$(this).attr("src");
			imgTot = document.querySelectorAll('.image-popup').length ;
			console.log( "imgTot:[" + imgTot + "]" ) ;
            for ( i=0 ; i < imgTot ; i++ ) {
              tmp =   document.getElementsByTagName('img')[i].src ;
              if (tmp.indexOf(url) > 1 ) {
				document.getElementById("next").innerText = i ;
				
				if ( i > imgTot - 3 ) { 
					setTimeout(() => {
		//			document.getElementById('nxt').disabled = true ;
				}, 100);
				} else {
		//			document.getElementById('prv').disabled = false ;
				}
				if ( i < 1 ) { 
					setTimeout(() => {
		//			document.getElementById('prv').disabled = true ;
					}, 100);
				} else {
		//			document.getElementById('nxt').disabled = false ;
				}
			  }
            }
			loadImageModal(url);
		}
	});
	

	$(".prv").on({
		'click': function(){
			// nextN = parseInt(document.getElementById('next').innerText)-1 ;	
			curN = parseInt(document.getElementById('next').innerText) ;
			console.log( "current:[" + curN +"]" );
			nextN = -1 ;
			nextBeyond = false ;
			for ( let i= (curN-1) ; i >= 0 ; i-- ) {
				console.log( i + ">>>[" + document.querySelectorAll('.image-popup')[i].parentNode.classList.value + "]" ) ;
				if ( document.querySelectorAll('.image-popup')[i].parentNode.classList.value != 'hide' ) {
				   if ( nextN == -1 ) {
					   nextN = i ;
				   } else {
					   nextBeyond = true ;
					   break ;
				   }
				   	
				}	
			}
			console.log( "nextN prv:" + nextN );
			console.log( "nextBeyond prv:" + nextBeyond );
			document.getElementsByClassName('nxt')[0].disabled = false ;
			document.getElementById('next').innerText = nextN ;
			if ( nextBeyond == false ) { 
				setTimeout(() => {
					document.getElementById('prv').disabled = true ;
				}, 300);
			}
			url = document.getElementsByTagName('img')[nextN].src ;
			loadImageModal(url);
		}
	});

	$(".nxt").on({
		'click': function(){
			// nextN = parseInt(document.getElementById('next').innerText)+1 ;
			nextN = -1 ;
			nextBeyond = false ;
			curN = parseInt(document.getElementById('next').innerText) ;
			console.log( "current:[" + curN +"]" );
			for ( i=(curN+1) ; i < imgTot ; i++ ) {
				console.log( i + ">>>[" + document.querySelectorAll('.image-popup')[i].parentNode.classList.value + "]" ) ;
				if ( document.querySelectorAll('.image-popup')[i].parentNode.classList.value != 'hide' ) {
   				   if ( nextN == -1 ) {
					   nextN = i ;
				   } else {
					   nextBeyond = true ;
					   break ;
				   }

				}	
			}				
			console.log( "nextN nxt:" + nextN );
			console.log( "nextBeyond prv:" + nextBeyond );
			if ( !nextBeyond ) { 
				setTimeout(() => {
					document.getElementById('nxt').disabled = true ;
				}, 300);
			}
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

	//******************************************************
	// Load the image 
	//******************************************************
	function loadImageModal(url) {
		
		$("#image-modal-popup").fadeIn();

		if (fadeInImageEnabled)
		{
			//// $("#image-modal-image").hide();
		}
		
		// If enabled, show loading animation while the image is loading in the background
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
	}

	function closeImagePopup() 
	{
		// I use fade animation. If you don't want it, just call jQuery's hide() 
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
		console.log("category:[" + div.getAttribute('category') + "]" ) ;	
		if (div.getAttribute('DoNotTouch') == 'true' ) {
		    // do nothing
		} else if (div.getAttribute('category')===undefined) {
		    // div.style.display = '';		
		} else if (div.getAttribute('category')==null) {
		    // div.style.display = '';			
		} else if (div.getAttribute('category')?.includes(Cat) || (Cat == 'ALL') ) {
		    // div.style.display = '';
		    if (div.classList.contains('hide')) {
		      div.classList.replace('hide','show');	    
		    } else {	    
		      div.classList.add('show');	
		    }	    
		} else {	
		    // div.style.display = 'none';
		    if (div.classList.contains('show')) {	
		        div.classList.replace('show','hide');
		    } else {
			div.classList.add('hide');    
		    }		    
		}
	});
}

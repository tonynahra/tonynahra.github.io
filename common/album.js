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
			imgTot = document.getElementsByTagName('img').length ;
            for ( i=0 ; i < imgTot ; i++ ) {
              tmp =   document.getElementsByTagName('img')[i].src ;
              if (tmp.indexOf(url) > 1 ) {
				document.getElementById("next").innerText = i ;
				
				if ( i > imgTot - 3 ) { 
					setTimeout(() => {
					document.getElementById('nxt').disabled = true ;
				}, 100);
				} else {
					document.getElementById('prv').disabled = false ;
				}
				if ( i < 0 ) { 
					setTimeout(() => {
					document.getElementById('prv').disabled = true ;
					}, 100);
				} else {
					document.getElementById('nxt').disabled = false ;
				}
			  }
            }
			loadImageModal(url);
		}
	});
	

	$(".prv").on({
		'click': function(){
			nextN = parseInt(document.getElementById('next').innerText)-1 ;			
			document.getElementsByClassName('nxt')[0].disabled = false ;
			document.getElementById('next').innerText = nextN ;
			url = document.getElementsByTagName('img')[nextN].src ;
			loadImageModal(url);
			if ( nextN < 1 ) { 
				setTimeout(() => {
					document.getElementById('prv').disabled = true ;
				}, 300);
			}
		}
	});

	$(".nxt").on({
		'click': function(){
			nextN = parseInt(document.getElementById('next').innerText)+1 ;
			if ( nextN > ( document.getElementsByTagName('img').length - 3 ) ) { 
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
